"""레시피대로 영상 → 누끼 → 크기·위치 맞추기 → 루프 다듬기 → 내보내기."""

from __future__ import annotations

import hashlib
import json
import math
import re
import subprocess
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import cv2
import numpy as np
from PIL import Image

from . import matte as mt
from .recipe import MotionSpec, Recipe
from .video import iter_frames, probe

CACHE_VERSION = 1
WORK_MAX_SIDE = 1920  # 누끼 작업 해상도 상한(긴 변)
MANIFEST_FORMAT = 1
FRAME_RE = re.compile(r"^\d{4}\.(png|webp)$")

Log = Callable[[str], None]
BBox = tuple[int, int, int, int]  # x0, y0, x1, y1 (x1, y1 미포함)


@dataclass
class MattedClip:
    spec: MotionSpec
    dir: Path
    count: int
    bboxes: list[BBox | None]


# ---------------------------------------------------------------- 누끼 단계


def _cache_key(recipe: Recipe, spec: MotionSpec) -> str:
    src = spec.source
    stat = src.stat()
    payload = {
        "v": CACHE_VERSION,
        "src": str(src), "size": stat.st_size, "mtime": int(stat.st_mtime),
        "start": spec.start, "end": spec.end, "fps": spec.fps, "crop": spec.crop,
        "matte": recipe.matte, "key": recipe.key_color,
        "tol": recipe.chroma_tol, "soft": recipe.chroma_soft,
        "lo": recipe.alpha_lo, "hi": recipe.alpha_hi, "island": recipe.min_island,
        "stab": recipe.stabilize, "max": WORK_MAX_SIDE,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:12]


def _bbox(alpha8: np.ndarray, threshold: int = 12) -> BBox | None:
    ys, xs = np.nonzero(alpha8 > threshold)
    if len(xs) == 0:
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def matte_clip(recipe: Recipe, spec: MotionSpec, work_dir: Path, get_ai: Callable[[], mt.AiMatter], log: Log) -> MattedClip:
    if not spec.source.is_file():
        raise FileNotFoundError(f"[motions.{spec.name}] 영상 파일이 없어요: {spec.source}")
    clip_dir = work_dir / f"{spec.name}-{_cache_key(recipe, spec)}"
    meta_path = clip_dir / "meta.json"
    if meta_path.is_file():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        log(f"  {spec.name}: 이전 누끼 결과 재사용 ({meta['count']}장)")
        return MattedClip(spec, clip_dir, meta["count"], [tuple(b) if b else None for b in meta["bboxes"]])

    clip_dir.mkdir(parents=True, exist_ok=True)
    for old in clip_dir.glob("*.png"):
        old.unlink()
    expected = max(1, math.ceil((spec.end - spec.start) * spec.fps))
    ai = get_ai() if recipe.matte == "ai" else None
    key = recipe.key_color
    bboxes: list[BBox | None] = []

    def finalize(rgb: np.ndarray, alpha: np.ndarray) -> None:
        a = mt.refine_alpha(alpha, recipe.alpha_lo, recipe.alpha_hi, recipe.min_island)
        bg = None
        if recipe.matte == "chroma":
            rgb = mt.despill(rgb, a, key)
            bg = key
        rgb = mt.decontaminate(rgb, a, bg)
        rgba = mt.to_rgba(rgb, a)
        idx = len(bboxes)
        Image.fromarray(rgba).save(clip_dir / f"{idx:04d}.png", compress_level=3)
        bboxes.append(_bbox(rgba[..., 3]))
        if idx % 10 == 0 or idx + 1 == expected:
            log(f"  {spec.name}: 누끼 {idx + 1}/{expected}")

    window: deque[tuple[np.ndarray, np.ndarray]] = deque()
    stab = recipe.stabilize

    def push(rgb: np.ndarray, alpha: np.ndarray) -> None:
        window.append((rgb, alpha))
        if not stab:
            finalize(*window.popleft())
            return
        if len(window) == 2 and not bboxes:  # 첫 프레임
            finalize(*window[0])
        if len(window) == 3:
            (_, a0), (rgb1, a1), (_, a2) = window
            finalize(rgb1, mt.stabilize([a0, a1, a2])[1])
            window.popleft()

    for frame in iter_frames(spec.source, spec.start, spec.end, spec.fps, spec.crop,
                             rgba=recipe.matte == "alpha", max_side=WORK_MAX_SIDE):
        if recipe.matte == "alpha":
            push(frame[..., :3].copy(), frame[..., 3].astype(np.float32) / 255.0)
            continue
        if recipe.matte == "chroma":
            if key is None:
                key = mt.guess_key_color(frame)
                log(f"  {spec.name}: 배경색 추정 #{key[0]:02x}{key[1]:02x}{key[2]:02x}")
            push(frame, mt.chroma_alpha(frame, key, recipe.chroma_tol, recipe.chroma_soft))
        else:
            push(frame, ai(frame))
    if stab and window:
        if not bboxes:
            finalize(*window[0])
            if len(window) == 2:
                finalize(*window[1])
        else:
            finalize(*window[-1])

    if not bboxes:
        raise RuntimeError(f"[motions.{spec.name}] 프레임을 하나도 못 뽑았어요. 시간 구간을 확인해주세요.")
    meta_path.write_text(json.dumps({"count": len(bboxes), "bboxes": bboxes}), encoding="utf-8")
    return MattedClip(spec, clip_dir, len(bboxes), bboxes)


# ---------------------------------------------------------------- 배치 단계


def resize_rgba(rgba: np.ndarray, w: int, h: int) -> np.ndarray:
    """알파를 곱한 상태로 크기를 바꿔 가장자리에 검은 테두리가 생기지 않게 한다."""
    f = rgba.astype(np.float32) / 255.0
    f[..., :3] *= f[..., 3:4]
    shrink = w < rgba.shape[1]
    r = cv2.resize(f, (w, h), interpolation=cv2.INTER_AREA if shrink else cv2.INTER_CUBIC)
    a = np.clip(r[..., 3], 0.0, 1.0)
    rgb = np.where(a[..., None] > 1e-4, r[..., :3] / np.maximum(a[..., None], 1e-4), 0.0)
    out = np.dstack([np.clip(rgb, 0, 1), a])
    return np.round(out * 255).astype(np.uint8)


@dataclass
class Placement:
    group_bbox: BBox
    size: tuple[int, int]  # 축소 후 너비, 높이
    pos: tuple[int, int]  # 캔버스 안 왼쪽 위


def plan_layout(recipe: Recipe, clips: dict[str, MattedClip]) -> tuple[tuple[int, int], dict[str, Placement]]:
    groups: dict[tuple, BBox] = {}
    for clip in clips.values():
        boxes = [b for b in clip.bboxes if b]
        if not boxes:
            raise RuntimeError(f"[motions.{clip.spec.name}] 캐릭터를 하나도 못 찾았어요. 구간이나 누끼 방식을 확인해주세요.")
        gk = (str(clip.spec.source), clip.spec.crop)
        x0, y0 = min(b[0] for b in boxes), min(b[1] for b in boxes)
        x1, y1 = max(b[2] for b in boxes), max(b[3] for b in boxes)
        if gk in groups:
            g = groups[gk]
            x0, y0, x1, y1 = min(x0, g[0]), min(y0, g[1]), max(x1, g[2]), max(y1, g[3])
        groups[gk] = (x0, y0, x1, y1)

    # 발밑 가운데를 (0, 0)으로 두고 각 동작의 사각형을 계산
    rects: dict[str, tuple[float, float, int, int, BBox]] = {}
    for name, clip in clips.items():
        g = groups[(str(clip.spec.source), clip.spec.crop)]
        gw, gh = g[2] - g[0], g[3] - g[1]
        s = recipe.height / gh * clip.spec.scale
        w, h = max(1, round(gw * s)), max(1, round(gh * s))
        dx, dy = clip.spec.offset
        rects[name] = (-w / 2 + dx, -h + dy, w, h, g)

    pad = recipe.padding
    left = math.floor(min(r[0] for r in rects.values())) - pad
    top = math.floor(min(r[1] for r in rects.values())) - pad
    right = math.ceil(max(r[0] + r[2] for r in rects.values())) + pad
    bottom = math.ceil(max(r[1] + r[3] for r in rects.values())) + pad
    canvas = (right - left, bottom - top)
    places = {
        name: Placement(g, (w, h), (round(x - left), round(y - top)))
        for name, (x, y, w, h, g) in rects.items()
    }
    return canvas, places


def render_frames(clip: MattedClip, place: Placement, canvas: tuple[int, int]) -> list[np.ndarray]:
    cw, ch = canvas
    x0, y0, x1, y1 = place.group_bbox
    w, h = place.size
    px, py = place.pos
    frames = []
    for i in range(clip.count):
        src = np.asarray(Image.open(clip.dir / f"{i:04d}.png").convert("RGBA"))
        patch = resize_rgba(src[y0:y1, x0:x1], w, h)
        out = np.zeros((ch, cw, 4), np.uint8)
        # 캔버스 밖으로 나가는 부분은 잘라서 붙인다
        sx0, sy0 = max(0, -px), max(0, -py)
        dx0, dy0 = max(0, px), max(0, py)
        dx1, dy1 = min(cw, px + w), min(ch, py + h)
        if dx1 > dx0 and dy1 > dy0:
            out[dy0:dy1, dx0:dx1] = patch[sy0 : sy0 + dy1 - dy0, sx0 : sx0 + dx1 - dx0]
        frames.append(out)
    return frames


# ---------------------------------------------------------------- 루프 단계


def _small(frame: np.ndarray) -> np.ndarray:
    h, w = frame.shape[:2]
    sw = 96
    sh = max(1, round(h * sw / w))
    f = cv2.resize(frame, (sw, sh), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    f[..., :3] *= f[..., 3:4]
    return f


def _diff(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.abs(a - b).mean())


def find_loop(frames: list[np.ndarray], min_fraction: float = 0.5) -> tuple[int, float]:
    """가장 자연스럽게 처음으로 돌아가는 지점을 찾는다.

    돌려주는 값: (남길 프레임 수, 이음새 점수). 점수는 이음새에서 움직이는 양을
    평소 한 프레임 움직임으로 나눈 값으로, 1에 가까울수록 티가 안 난다.
    """
    n = len(frames)
    if n < 6:
        return n, 0.0
    small = [_small(f) for f in frames]
    steps = [_diff(small[i], small[i + 1]) for i in range(n - 1)]
    typical = max(float(np.median(steps)), 1e-4)
    best_cut, best = n, math.inf
    for j in range(max(3, int(n * min_fraction)), n - 1):
        # frames[j], [j+1]이 frames[0], [1]과 닮았으면 j-1 → 0 이 j-1 → j 처럼 자연스럽다.
        # 다음 장면까지 비교해서 같은 자세라도 움직이는 방향이 반대인 곳은 피한다.
        pairs = [(j + k, k) for k in range(3) if j + k < n]
        score = sum(_diff(small[a], small[b]) for a, b in pairs) / len(pairs) / typical
        if score < best:
            best_cut, best = j, score
    if best < 1.0:  # 한 프레임 움직임보다 작게 어긋나면 그 지점에서 자른다
        return best_cut, _diff(small[best_cut - 1], small[0]) / typical
    return n, _diff(small[-1], small[0]) / typical


def blend_tail(frames: list[np.ndarray], k: int) -> list[np.ndarray]:
    """마지막 k장을 첫 장 쪽으로 서서히 섞어 이음새를 숨긴다."""
    if k <= 0 or len(frames) <= k + 1:
        return frames
    out = list(frames)
    first = frames[0].astype(np.float32)
    n = len(frames)
    for i in range(k):
        t = (i + 1) / (k + 1)
        idx = n - k + i
        out[idx] = np.round(frames[idx].astype(np.float32) * (1 - t) + first * t).astype(np.uint8)
    return out


# ---------------------------------------------------------------- 내보내기


def _checker(w: int, h: int, cell: int = 12) -> np.ndarray:
    yy, xx = np.indices((h, w))
    v = np.where(((yy // cell + xx // cell) % 2) == 0, 58, 72).astype(np.uint8)
    return np.dstack([v, v, v])


def composite(rgba: np.ndarray, bg: np.ndarray) -> np.ndarray:
    a = rgba[..., 3:4].astype(np.float32) / 255.0
    return (rgba[..., :3] * a + bg * (1 - a)).astype(np.uint8)


PREVIEW_BG = (172, 176, 186)  # 흰 옷과 검은 옷이 둘 다 잘 보이는 중간 회색


def preview_sequence(frames: list[np.ndarray], loop: str, min_seconds: float, fps: float) -> list[np.ndarray]:
    """미리보기용으로 반복 동작은 몇 바퀴 돌려 min_seconds 이상이 되게 한다."""
    one = frames + frames[-2:0:-1] if loop == "pingpong" else list(frames)
    if loop == "once":
        return one
    reps = max(1, math.ceil(min_seconds * fps / max(1, len(one))))
    return one * reps


def write_video(path: Path, frames: list[np.ndarray], fps: float, bg: tuple[int, int, int] = PREVIEW_BG) -> Path:
    """폰에서도 바로 재생되는 원본 크기 MP4(H.264)로 저장한다."""
    h, w = frames[0].shape[:2]
    w2, h2 = w + (w % 2), h + (h % 2)  # H.264 는 짝수 크기만
    back = np.zeros((h2, w2, 3), np.uint8)
    back[:] = bg
    proc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w2}x{h2}",
         "-r", f"{fps}", "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(path)],
        stdin=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    assert proc.stdin is not None
    try:
        for f in frames:
            canvas = back.copy()
            canvas[:h, :w] = composite(f, back[:h, :w])
            proc.stdin.write(canvas.tobytes())
    finally:
        proc.stdin.close()
    if proc.wait() != 0:
        raise RuntimeError(f"미리보기 영상 저장 실패: {proc.stderr.read().decode(errors='replace') if proc.stderr else ''}")
    return path


def write_previews(out_dir: Path, name: str, frames: list[np.ndarray], fps: float, loop: str) -> Path:
    prev = out_dir / "previews"
    prev.mkdir(exist_ok=True)
    for old in prev.glob(f"{name}.gif"):
        old.unlink()
    return write_video(prev / f"{name}.mp4", preview_sequence(frames, loop, 4.0, fps), fps)


def write_sheet(out_dir: Path, rows: list[tuple[str, list[np.ndarray]]], per_row: int = 8, cell_h: int = 200) -> Path:
    tiles = []
    for label, frames in rows:
        picks = [frames[round(i * (len(frames) - 1) / max(1, per_row - 1))] for i in range(min(per_row, len(frames)))]
        h, w = frames[0].shape[:2]
        s = cell_h / h
        cw = max(1, round(w * s))
        bg = _checker(cw, cell_h)
        row = np.full((cell_h + 26, cw * per_row, 3), 24, np.uint8)
        for k, f in enumerate(picks):
            row[26:, k * cw : (k + 1) * cw] = composite(resize_rgba(f, cw, cell_h), bg)
        cv2.putText(row, label, (6, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
        tiles.append(row)
    width = max(t.shape[1] for t in tiles)
    sheet = np.full((sum(t.shape[0] for t in tiles), width, 3), 24, np.uint8)
    y = 0
    for t in tiles:
        sheet[y : y + t.shape[0], : t.shape[1]] = t
        y += t.shape[0]
    path = out_dir / "previews" / "sheet.png"
    path.parent.mkdir(exist_ok=True)
    Image.fromarray(sheet).save(path)
    return path


def _concat_previews(out_dir: Path, order: list[str]) -> None:
    """동작별 미리보기를 이어 붙여 all.mp4 하나로 만든다 (폰에서 한 번에 보기용)."""
    prev = out_dir / "previews"
    parts = [prev / f"{n}.mp4" for n in order if (prev / f"{n}.mp4").is_file()]
    if not parts:
        return
    sizes = {(p.stat().st_size > 0) for p in parts}
    if sizes != {True}:
        return
    lst = prev / "_concat.txt"
    lst.write_text("".join(f"file '{p.name}'\n" for p in parts), encoding="utf-8")
    try:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
                        "-c", "copy", "-movflags", "+faststart", str(prev / "all.mp4")], check=True)
    finally:
        lst.unlink(missing_ok=True)


def _clear_frames(folder: Path) -> None:
    if folder.is_dir():
        for f in folder.iterdir():
            if FRAME_RE.match(f.name):
                f.unlink()


def build(recipe: Recipe, out_dir: Path, work_dir: Path, models_dir: Path, log: Log = print) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    work_dir.mkdir(parents=True, exist_ok=True)
    ai_holder: list[mt.AiMatter] = []

    def get_ai() -> mt.AiMatter:
        if not ai_holder:
            ai_holder.append(mt.AiMatter(mt.ensure_model(models_dir, log)))
            log(f"  AI 누끼 실행 장치: {ai_holder[0].provider}")
        return ai_holder[0]

    for spec in recipe.motions.values():
        info = probe(spec.source)
        if info.duration and spec.start >= info.duration:
            raise ValueError(f"[motions.{spec.name}] start({spec.start:.2f}초)가 영상 길이({info.duration:.2f}초)보다 길어요.")
        if recipe.matte == "alpha" and not info.has_alpha:
            raise ValueError(f"{spec.source.name} 에는 투명 채널이 없어요. matte = \"ai\" 나 \"chroma\" 를 써주세요.")

    log("1/3 배경 제거")
    clips = {name: matte_clip(recipe, spec, work_dir, get_ai, log) for name, spec in recipe.motions.items()}

    log("2/3 크기·위치 맞추기")
    canvas, places = plan_layout(recipe, clips)
    log(f"  캔버스 {canvas[0]}x{canvas[1]}")

    log("3/3 루프 다듬기·내보내기")
    old_manifest = out_dir / "manifest.json"
    if old_manifest.is_file():
        try:
            for name in json.loads(old_manifest.read_text(encoding="utf-8")).get("motions", {}):
                if name not in clips:
                    _clear_frames(out_dir / name)
        except (json.JSONDecodeError, OSError):
            pass

    motions_meta: dict[str, dict] = {}
    sheet_rows = []
    warnings = []
    ext = recipe.image_format
    for name, clip in clips.items():
        spec = clip.spec
        frames = render_frames(clip, places[name], canvas)
        seam = None
        if spec.loop == "loop" and spec.loop_search:
            cut, seam = find_loop(frames)
            if cut < len(frames):
                log(f"  {name}: 루프 지점 {cut}/{len(frames)}장에서 자름")
            frames = frames[:cut]
        if spec.loop == "loop":
            frames = blend_tail(frames, spec.blend)
            if seam is not None and seam > 3.0:
                warnings.append(f"{name}: 끝→처음 이음새가 튈 수 있어요(점수 {seam:.1f}). loop = \"pingpong\" 이나 blend = 3 을 써보세요.")

        folder = out_dir / name
        folder.mkdir(exist_ok=True)
        _clear_frames(folder)
        for i, f in enumerate(frames):
            img = Image.fromarray(f, "RGBA")
            if ext == "webp":
                img.save(folder / f"{i:04d}.webp", lossless=True, quality=80, method=4)
            else:
                img.save(folder / f"{i:04d}.png", compress_level=6)
        write_previews(out_dir, name, frames, spec.fps, spec.loop)
        sheet_rows.append((f"{name} ({len(frames)}f, {spec.loop})", frames))
        motions_meta[name] = {
            "dir": name, "frames": len(frames), "fps": spec.fps,
            "loop": spec.loop, "then": spec.then,
            "seam": None if seam is None else round(seam, 2),
        }
        log(f"  {name}: {len(frames)}장 저장")

    write_sheet(out_dir, sheet_rows)
    _concat_previews(out_dir, [recipe.default_motion] + [n for n in clips if n != recipe.default_motion])
    manifest = {
        "format": MANIFEST_FORMAT,
        "name": recipe.name,
        "size": list(canvas),
        "image_format": ext,
        "default": recipe.default_motion,
        "talk": recipe.talk_motion,
        "motions": motions_meta,
        "emotions": recipe.emotions,
        "fidgets": recipe.fidgets,
        "fidget_every": list(recipe.fidget_every),
    }
    old_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    for w in warnings:
        log("주의: " + w)
    return manifest
