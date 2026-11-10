"""모니터 하나를 캡처해서 보내기 좋게 줄인다. 스크린샷은 디스크에 저장하지 않는다."""

from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
from PIL import Image


@dataclass
class Monitor:
    index: int  # mss 번호 (1부터)
    left: int
    top: int
    width: int
    height: int

    @property
    def rect(self) -> tuple[int, int, int, int]:
        return self.left, self.top, self.left + self.width, self.top + self.height


def list_monitors() -> list[Monitor]:
    import mss

    with mss.mss() as sct:
        return [Monitor(i, m["left"], m["top"], m["width"], m["height"]) for i, m in enumerate(sct.monitors) if i > 0]


def pick_monitor(monitors: list[Monitor], choice: str | int) -> Monitor | None:
    """'left' | 'right' | 'primary' | 번호(1부터)"""
    if not monitors:
        return None
    if isinstance(choice, int) or str(choice).isdigit():
        n = int(choice)
        return next((m for m in monitors if m.index == n), None)
    choice = str(choice).lower()
    if choice == "left":
        return min(monitors, key=lambda m: m.left)
    if choice == "right":
        return max(monitors, key=lambda m: m.left)
    primary = [m for m in monitors if m.left == 0 and m.top == 0]
    return primary[0] if primary else monitors[0]


def grab(monitor: Monitor) -> Image.Image:
    import mss

    with mss.mss() as sct:
        shot = sct.grab({"left": monitor.left, "top": monitor.top, "width": monitor.width, "height": monitor.height})
        return Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")


def shrink(img: Image.Image, max_width: int = 1024) -> Image.Image:
    if img.width <= max_width:
        return img
    h = round(img.height * max_width / img.width)
    return img.resize((max_width, h), Image.Resampling.LANCZOS)


def to_jpeg(img: Image.Image, quality: int = 70) -> bytes:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def thumb(img: Image.Image) -> np.ndarray:
    """화면 변화량 비교용 작은 흑백 사본."""
    return np.asarray(img.convert("L").resize((64, 36), Image.Resampling.BILINEAR), dtype=np.float32) / 255.0


def change_amount(a: np.ndarray | None, b: np.ndarray) -> float:
    return 1.0 if a is None else float(np.abs(a - b).mean())
