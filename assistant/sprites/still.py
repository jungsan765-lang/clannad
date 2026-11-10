"""그림 한 장으로 움직이는 캐릭터 만들기: 숨쉬기(평소)와 통통 튀기(말할 때).

그림 아래가 잘려 있어도 어색하지 않게, 맨 아래는 고정하고 위로 갈수록 더 움직인다(변형).
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from . import matte as mt
from .build import FRAME_RE, _concat_previews, write_previews, write_sheet

EMOTIONS = ("normal", "happy", "worried", "surprised", "angry")


def load_cutout(path: Path, models_dir: Path, log=print) -> np.ndarray:
    """투명 배경 그림이면 그대로(알파 보정만), 아니면 AI 누끼. 결과: RGBA uint8."""
    im = Image.open(path).convert("RGBA")
    rgba = np.asarray(im).copy()
    a = rgba[..., 3]
    if a.min() < 250:  # 이미 투명 배경이 있음
        solid = a[a > 128]
        top = float(np.percentile(solid, 99)) if solid.size else 255.0
        gain = 255.0 / max(top, 1.0)
        if gain > 1.0:  # 불투명이 253·254 라 뒤가 비치는 것 보정 (가장자리 부드러움은 유지)
            rgba[..., 3] = np.clip(a.astype(np.float32) * gain, 0, 255).astype(np.uint8)
            log(f"  불투명 부분 투명도 보정 ({top:.0f} → 255)")
    else:
        log("  배경이 있어 AI 로 누끼를 땁니다")
        rgb = rgba[..., :3]
        alpha = mt.refine_alpha(mt.AiMatter(mt.ensure_model(models_dir, log))(rgb))
        rgba = mt.to_rgba(mt.decontaminate(rgb, alpha), alpha)
    # 몸에서 멀리 떨어진 희미한 점 지우기
    body = (rgba[..., 3] > 128).astype(np.uint8)
    near = cv2.dilate(body, np.ones((15, 15), np.uint8)) > 0
    specks = (rgba[..., 3] > 0) & ~near
    if specks.any():
        log(f"  떨어진 점 {int(specks.sum())}개 정리")
        rgba[specks] = 0
    return rgba


def trim_and_scale(rgba: np.ndarray, height: int, pad: int, headroom: int) -> np.ndarray:
    ys, xs = np.nonzero(rgba[..., 3] > 8)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = rgba[y0:y1, x0:x1]
    s = height / crop.shape[0]
    w = max(1, round(crop.shape[1] * s))
    p = crop.astype(np.float32) / 255.0
    p[..., :3] *= p[..., 3:4]
    p = cv2.resize(p, (w, height), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    cut_bottom = y1 >= rgba.shape[0] - 1  # 그림 아래가 잘려 있으면 바닥에 여백을 두지 않는다
    out = np.zeros((height + pad + headroom + (0 if cut_bottom else pad), w + 2 * pad, 4), np.float32)
    out[pad + headroom : pad + headroom + height, pad : pad + w] = p
    return out  # premultiplied float


def _lift(p: np.ndarray, amount_px: float, chest: float) -> np.ndarray:
    """맨 아래는 그대로, chest(위에서부터 비율) 위쪽은 amount_px 만큼 위로. 그 사이는 부드럽게."""
    h, w = p.shape[:2]
    y = np.arange(h, dtype=np.float32)
    t = np.clip((h - 1 - y) / max((h - 1) * (1 - chest), 1), 0, 1)
    weight = t * t * (3 - 2 * t)
    src_y = y + amount_px * weight  # 출력 y 에 올 원본 위치 (위로 올리면 아래쪽 원본을 가져옴)
    map_y = np.repeat(src_y[:, None], w, axis=1).astype(np.float32)
    map_x = np.repeat(np.arange(w, dtype=np.float32)[None, :], h, axis=0)
    return cv2.remap(p, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def _to_u8(p: np.ndarray) -> np.ndarray:
    a = np.clip(p[..., 3:4], 0, 1)
    rgb = np.where(a > 1e-4, p[..., :3] / np.maximum(a, 1e-4), 0)
    return np.round(np.dstack([np.clip(rgb, 0, 1), a]) * 255).astype(np.uint8)


def make_still_character(image: Path, out_dir: Path, models_dir: Path, *, name: str, height: int = 768,
                         fps: float = 24, breath_px: float = 4.0, breath_seconds: float = 3.6,
                         bounce_px: float = 3.5, bounce_seconds: float = 0.45, chest: float = 0.42,
                         log=print) -> dict:
    log(f"그림 불러오는 중: {image}")
    rgba = load_cutout(image, models_dir, log)
    pad = 6
    base = trim_and_scale(rgba, height, pad, headroom=math.ceil(max(breath_px, 0) + max(bounce_px, 0)) + 2)

    # 숨쉬기: 들이쉬는 반 주기만 만들고 앞뒤 왕복(pingpong)으로 재생 → 프레임 절반
    n = max(2, round(breath_seconds / 2 * fps))
    idle = [_to_u8(_lift(base, breath_px * (0.5 - 0.5 * math.cos(math.pi * i / (n - 1))), chest)) for i in range(n)]
    # 말할 때: 숨 내쉰 자세(평소 첫 장면)에서 위로 통통
    m = max(2, round(bounce_seconds * fps))
    talk = [_to_u8(_lift(base, bounce_px * abs(math.sin(math.pi * i / m)), chest)) for i in range(m)]

    out_dir.mkdir(parents=True, exist_ok=True)
    motions = {"idle": (idle, "pingpong"), "talk": (talk, "loop")}
    meta, rows = {}, []
    for mname, (frames, loop) in motions.items():
        folder = out_dir / mname
        folder.mkdir(exist_ok=True)
        for old in folder.iterdir():
            if FRAME_RE.match(old.name):
                old.unlink()
        for i, f in enumerate(frames):
            Image.fromarray(f, "RGBA").save(folder / f"{i:04d}.png", compress_level=6)
        meta[mname] = {"dir": mname, "frames": len(frames), "fps": fps, "loop": loop, "then": None, "seam": None}
        write_previews(out_dir, mname, frames, fps, loop)
        rows.append((f"{mname} ({len(frames)}f, {loop})", frames))
        log(f"  {mname}: {len(frames)}장")
    write_sheet(out_dir, rows)
    _concat_previews(out_dir, ["idle", "talk"])
    manifest = {
        "format": 1, "name": name, "size": [idle[0].shape[1], idle[0].shape[0]], "image_format": "png",
        "default": "idle", "talk": "talk", "motions": meta,
        "emotions": {e: "idle" for e in EMOTIONS}, "fidgets": [], "fidget_every": [180, 420],
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"완료: {out_dir} ({manifest['size'][0]}x{manifest['size'][1]})")
    return manifest
