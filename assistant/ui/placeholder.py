"""캐릭터 그림이 없을 때 쓰는 임시 원형 캐릭터 (숨쉬듯 통통 움직임)."""

from __future__ import annotations

import json
import math
from pathlib import Path

from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QColor, QImage, QPainter, QPen


def make_placeholder(folder: Path, size: int = 160, frames: int = 48) -> Path:
    if (folder / "manifest.json").is_file():
        return folder
    (folder / "idle").mkdir(parents=True, exist_ok=True)
    for i in range(frames):
        t = i / frames
        bob = math.sin(2 * math.pi * t) * 4
        squash = 1 + math.sin(2 * math.pi * t) * 0.02
        img = QImage(size, size, QImage.Format.Format_ARGB32_Premultiplied)
        img.fill(Qt.GlobalColor.transparent)
        p = QPainter(img)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        r = size * 0.36
        cx, cy = size / 2, size / 2 + 8 + bob
        p.setPen(QPen(QColor(40, 60, 70), 3))
        p.setBrush(QColor(110, 190, 200))
        p.drawEllipse(QRectF(cx - r, cy - r * squash, 2 * r, 2 * r * squash))
        p.setBrush(QColor(30, 40, 50))
        p.setPen(Qt.PenStyle.NoPen)
        blink = i in (30, 31)
        for ex in (-r * 0.35, r * 0.35):
            if blink:
                p.drawRect(QRectF(cx + ex - 6, cy - 6, 12, 2))
            else:
                p.drawEllipse(QPointF(cx + ex, cy - 6), 4, 6)
        p.end()
        img.save(str(folder / "idle" / f"{i:04d}.png"))
    manifest = {
        "format": 1, "name": "placeholder", "size": [size, size], "image_format": "png",
        "default": "idle", "talk": None,
        "motions": {"idle": {"dir": "idle", "frames": frames, "fps": 24, "loop": "loop", "then": None}},
        "emotions": {}, "fidgets": [],
    }
    (folder / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return folder
