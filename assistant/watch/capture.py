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


def _mss(mss):
    """새 버전 이름(MSS)이 있으면 그걸, 없으면 예전 이름(mss)."""
    return (getattr(mss, "MSS", None) or mss.mss)()


def list_monitors() -> list[Monitor]:
    import mss

    with _mss(mss) as sct:
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

    with _mss(mss) as sct:
        shot = sct.grab({"left": monitor.left, "top": monitor.top, "width": monitor.width, "height": monitor.height})
        return Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")


def shrink(img: Image.Image, max_width: int = 1024) -> Image.Image:
    if img.width <= max_width:
        return img
    h = round(img.height * max_width / img.width)
    return img.resize((max_width, h), Image.Resampling.LANCZOS)


_COLS = {1: [""], 2: ["왼쪽", "오른쪽"], 3: ["왼쪽", "가운데", "오른쪽"]}
_ROWS = {1: [""], 2: ["위", "아래"], 3: ["위", "가운데", "아래"]}


def tiles(img: Image.Image, max_side: int = 1400, overlap: float = 0.06) -> list[tuple[str, Image.Image]]:
    """작은 글씨 읽기용: 화면을 줄이지 않고 원래 해상도 조각(최대 3x3)으로 나눈다. 경계 글자가 잘리지 않게 조금 겹친다."""
    cols = min(3, max(1, -(-img.width // max_side)))
    rows = min(3, max(1, -(-img.height // max_side)))
    if cols == 1 and rows == 1:
        return [("전체", img)]
    w, h = img.width / cols, img.height / rows
    pad_x, pad_y = int(w * overlap), int(h * overlap)
    out = []
    for r in range(rows):
        for c in range(cols):
            box = (max(0, int(c * w) - pad_x), max(0, int(r * h) - pad_y),
                   min(img.width, int((c + 1) * w) + pad_x), min(img.height, int((r + 1) * h) + pad_y))
            name = f"{_COLS[cols][c]} {_ROWS[rows][r]}".strip()
            out.append((name, img.crop(box)))
    return out


def to_jpeg(img: Image.Image, quality: int = 70) -> bytes:
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=quality, optimize=True)
    return buf.getvalue()


def thumb(img: Image.Image) -> np.ndarray:
    """화면 변화량 비교용 작은 흑백 사본."""
    return np.asarray(img.convert("L").resize((64, 36), Image.Resampling.BILINEAR), dtype=np.float32) / 255.0


def change_amount(a: np.ndarray | None, b: np.ndarray) -> float:
    return 1.0 if a is None else float(np.abs(a - b).mean())
