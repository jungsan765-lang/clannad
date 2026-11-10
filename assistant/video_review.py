"""영상 복기: 녹화한 게임 영상에서 장면을 골고루 뽑아 다니카가 시간대별로 되짚는다.

영상은 이 PC 에서 장면(사진)으로만 뽑아 보내고, 영상 파일 자체는 어디에도 올리지 않는다.
결과는 분석 창에 보여 주고 data/reviews/ 에 마크다운으로도 남긴다.
"""

from __future__ import annotations

import io
import math
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from PIL import Image

VIDEO_EXT = ("*.mp4", "*.mkv", "*.mov", "*.avi", "*.webm", "*.m4v", "*.wmv")
MAX_FRAMES = 30


@dataclass
class VideoInfo:
    path: Path
    seconds: float
    fps: float
    width: int
    height: int


def mmss(seconds: float) -> str:
    s = int(round(seconds))
    return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}" if s >= 3600 else f"{s // 60}:{s % 60:02d}"


def probe(path: Path) -> VideoInfo:
    import cv2

    cap = cv2.VideoCapture(str(path))
    try:
        if not cap.isOpened():
            raise ValueError("영상을 열 수 없어요. 다른 형식(mp4 등)으로 저장한 파일을 골라 주세요.")
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    finally:
        cap.release()
    if count <= 0 or fps <= 0:
        raise ValueError("영상 길이를 알 수 없어요.")
    return VideoInfo(path, count / fps, fps, w, h)


def auto_step(start: float, end: float, max_frames: int = MAX_FRAMES) -> float:
    """구간에서 장면을 최대 max_frames 장 뽑을 간격 (최소 1초)."""
    return max(1.0, math.ceil(max(0.0, end - start) / max_frames))


def plan_times(start: float, end: float, step: float, max_frames: int = MAX_FRAMES) -> list[float]:
    if end <= start:
        return [start]
    n = min(max_frames, int((end - start) // step) + 1)
    if n * step < end - start - step:  # 장면 수 제한에 걸리면 구간 전체에 고르게
        step = (end - start) / max(1, n - 1)
    return [round(start + i * step, 2) for i in range(n)]


def sample_frames(path: Path, times: list[float], max_width: int = 1280, quality: int = 80,
                  progress: Callable[[int, int], None] | None = None) -> list[tuple[float, bytes]]:
    """정해진 시각들의 장면을 JPEG 로. (시각, jpeg) 목록."""
    import cv2

    cap = cv2.VideoCapture(str(path))
    out = []
    try:
        for i, t in enumerate(times, 1):
            ok, frame = False, None
            for back in (0.0, 0.5, 1.0):  # 영상 맨 끝 시각은 안 읽힐 수 있어서 조금씩 앞에서 다시
                cap.set(cv2.CAP_PROP_POS_MSEC, max(0.0, t - back) * 1000)
                ok, frame = cap.read()
                if ok and frame is not None:
                    break
            if ok and frame is not None:
                img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                if img.width > max_width:
                    img = img.resize((max_width, round(img.height * max_width / img.width)), Image.Resampling.LANCZOS)
                buf = io.BytesIO()
                img.save(buf, "JPEG", quality=quality, optimize=True)
                out.append((t, buf.getvalue()))
            if progress:
                progress(i, len(times))
    finally:
        cap.release()
    if not out:
        raise ValueError("영상에서 장면을 뽑지 못했어요. 코덱이 특이한 영상일 수 있어요(mp4 H.264 권장).")
    return out


def estimate_krw(frames: int, krw_per_usd: float = 1400.0) -> int:
    """대략: 장면 하나 1,300토큰 입력 + 출력 4,000토큰, Opus 가격."""
    usd = frames * 1300 * 4 / 1_000_000 + 6000 * 4 / 1_000_000 + 4000 * 20 / 1_000_000
    return int(round(usd * krw_per_usd, -1))


def save_markdown(folder: Path, name: str, analysis) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r'[<>:"/\\|?*\s]+', "_", Path(name).stem)[:40] or "video"
    path = folder / f"{time.strftime('%Y%m%d_%H%M')}_{safe}.md"
    lines = [f"# 영상 복기 — {name}", "", f"**요약:** {analysis.summary}", "", f"**흐름:** {analysis.situation}", "",
             "## 장면별"]
    lines += [f"- **{p.get('title', '')}** — {p.get('detail', '')}" for p in analysis.points]
    lines += ["", "## 다음에 할 것"] + [f"{i}. {s}" for i, s in enumerate(analysis.next_steps, 1)]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path
