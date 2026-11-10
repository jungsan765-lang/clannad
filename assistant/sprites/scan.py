"""영상을 훑어 시간표시 썸네일 시트와 장면 전환(컷) 목록을 만든다.

동작 구간(start, end)을 고를 때 쓴다.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from .video import format_time, iter_frames, probe

SAMPLE_FPS = 10


@dataclass
class Shot:
    start: float
    end: float

    @property
    def length(self) -> float:
        return self.end - self.start


def _label(img: np.ndarray, text: str, cut: bool) -> np.ndarray:
    h, w = img.shape[:2]
    out = np.full((h + 22, w, 3), 24, np.uint8)
    out[22:] = img
    cv2.putText(out, text, (4, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
    if cut:
        cv2.rectangle(out, (0, 0), (w - 1, h + 21), (230, 40, 40), 3)
    return out


def scan(
    video: str | Path,
    out_dir: str | Path,
    every: float = 0.5,
    thumb: int = 240,
    cols: int = 6,
    rows: int = 8,
    cut_threshold: float = 0.18,
) -> tuple[list[Path], list[Shot]]:
    info = probe(video)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    step = max(1, round(every * SAMPLE_FPS))

    thumbs: list[np.ndarray] = []
    cuts: list[float] = []
    prev_small = None
    cut_since_thumb = False
    t = 0.0
    for i, frame in enumerate(iter_frames(video, 0.0, None, SAMPLE_FPS, max_side=thumb)):
        t = i / SAMPLE_FPS
        small = cv2.resize(cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY), (64, 36), interpolation=cv2.INTER_AREA)
        if prev_small is not None:
            diff = np.abs(small.astype(np.int16) - prev_small).mean() / 255.0
            if diff > cut_threshold:
                cuts.append(t)
                cut_since_thumb = True
        prev_small = small.astype(np.int16)
        if i % step == 0:
            thumbs.append(_label(frame, format_time(t), cut_since_thumb))
            cut_since_thumb = False
    end = info.duration or t

    pages: list[Path] = []
    per_page = cols * rows
    for p in range(0, len(thumbs), per_page):
        chunk = thumbs[p : p + per_page]
        th, tw = chunk[0].shape[:2]
        sheet = np.full((th * rows, tw * cols, 3), 12, np.uint8)
        for k, img in enumerate(chunk):
            r, c = divmod(k, cols)
            sheet[r * th : r * th + img.shape[0], c * tw : c * tw + img.shape[1]] = img
        used_rows = (len(chunk) + cols - 1) // cols
        path = out_dir / f"sheet_{p // per_page + 1:02d}.jpg"
        Image.fromarray(sheet[: used_rows * th]).save(path, quality=85)
        pages.append(path)

    bounds = [0.0, *cuts, end]
    shots = [Shot(a, b) for a, b in zip(bounds, bounds[1:]) if b - a > 0.05]
    lines = [f"{info.width}x{info.height}, {info.fps:.2f}fps, 길이 {format_time(end)}", ""]
    for n, s in enumerate(shots, 1):
        lines.append(f"장면 {n:3d}: {format_time(s.start)} ~ {format_time(s.end)}  ({s.length:.1f}초)")
    (out_dir / "shots.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return pages, shots
