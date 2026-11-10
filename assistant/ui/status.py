"""캐릭터 아래쪽에 뜨는 작은 '지금 하는 일' 표시 (예: 생각 중… 3초, 파일 옮기는 중 12/40).

말풍선과 따로라 대사를 가리지 않고, 마우스 클릭은 그대로 뒤로 통과한다.
여러 일이 겹치면 가장 최근에 시작한 일을 보여준다.
"""

from __future__ import annotations

import time
from typing import Callable

from PySide6.QtCore import QPoint, QRect, QRectF, Qt, QTimer
from PySide6.QtGui import QColor, QFont, QFontMetrics, QGuiApplication, QPainter
from PySide6.QtWidgets import QWidget

DOTS = ["·  ", "·· ", "···"]


class StatusPill(QWidget):
    PAD_X, PAD_Y = 10, 4

    def __init__(self, anchor: Callable[[], QRect], clock: Callable[[], float] = time.monotonic):
        super().__init__(None)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint
                            | Qt.WindowType.Tool | Qt.WindowType.WindowTransparentForInput)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        self.anchor = anchor
        self.clock = clock
        self.enabled = True
        self.tasks: dict[str, tuple[str, float, bool]] = {}  # 이름 → (글자, 시작 시각, 걸린 시간 표시)
        self.font_ = QFont()
        self.font_.setPointSize(10)
        self.text = ""
        self._tick = 0
        self.timer = QTimer(self)
        self.timer.setInterval(400)
        self.timer.timeout.connect(self._on_timer)
        self._flash = QTimer(self)
        self._flash.setSingleShot(True)
        self._flash.timeout.connect(lambda: self.end("_flash"))

    # ------------------------------------------------------------ 바깥에서 쓰는 것

    def begin(self, key: str, text: str, elapsed: bool = True) -> None:
        """일을 시작했다. elapsed: 몇 초째인지 함께 보여줄지."""
        self.tasks.pop(key, None)
        self.tasks[key] = (text, self.clock(), elapsed)  # 맨 뒤 = 가장 최근
        self.refresh()

    def set_text(self, key: str, text: str) -> None:
        """하던 일의 글자만 바꾼다 (시작 시각은 그대로)."""
        if key in self.tasks:
            _, started, elapsed = self.tasks[key]
            self.tasks[key] = (text, started, elapsed)
            self.refresh()
        else:
            self.begin(key, text)

    def end(self, key: str) -> None:
        if self.tasks.pop(key, None) is not None:
            self.refresh()

    def flash(self, text: str, seconds: float = 2.5) -> None:
        """잠깐만 보여주는 알림 (예: 잘 못 알아들었어요)."""
        self.begin("_flash", text, elapsed=False)
        self._flash.start(round(seconds * 1000))

    def active(self, key: str) -> bool:
        return key in self.tasks

    def set_enabled(self, on: bool) -> None:
        self.enabled = on
        self.refresh()

    def current_text(self) -> str:
        if not self.tasks:
            return ""
        key = next(reversed(self.tasks))
        text, started, elapsed = self.tasks[key]
        if not elapsed:
            return text
        secs = int(self.clock() - started)
        return f"{text} {DOTS[self._tick % 3]}" + (f" {secs}초" if secs >= 2 else "")

    # ------------------------------------------------------------ 그리기

    def refresh(self) -> None:
        if not self.enabled or not self.tasks:
            self.timer.stop()
            self.text = ""
            self.hide()
            return
        if not self.timer.isActive():
            self.timer.start()
        self.text = self.current_text()
        fm = QFontMetrics(self.font_)
        w = fm.horizontalAdvance(self.text + "  0초") + 2 * self.PAD_X
        h = fm.height() + 2 * self.PAD_Y
        self.setFixedSize(w, h)
        a = self.anchor()
        x, y = a.center().x() - w // 2, a.bottom() - h - 6
        scr = QGuiApplication.screenAt(a.center()) or QGuiApplication.primaryScreen()
        if scr is not None:
            g = scr.availableGeometry()
            x = max(g.left() + 4, min(x, g.right() - w - 4))
            y = max(g.top() + 4, min(y, g.bottom() - h - 4))
        self.move(QPoint(x, y))
        self.update()
        if not self.isVisible():
            self.show()

    def _on_timer(self) -> None:
        self._tick += 1
        self.refresh()

    def paintEvent(self, event) -> None:  # noqa: N802
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        r = QRectF(0.5, 0.5, self.width() - 1, self.height() - 1)
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(QColor(34, 38, 48, 210))
        p.drawRoundedRect(r, r.height() / 2, r.height() / 2)
        p.setFont(self.font_)
        p.setPen(QColor(240, 242, 248))
        p.drawText(r, Qt.AlignmentFlag.AlignCenter, self.text)
        p.end()
