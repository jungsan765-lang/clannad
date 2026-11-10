"""캐릭터 옆에 뜨는 말풍선."""

from __future__ import annotations

from PySide6.QtCore import QPoint, QRect, QRectF, Qt, QTimer, Signal
from PySide6.QtGui import QColor, QFont, QFontMetrics, QPainter, QPainterPath, QPen
from PySide6.QtWidgets import QWidget


class SpeechBubble(QWidget):
    """둥근 사각형 + 꼬리. 클릭하면 닫힌다. 일정 시간이 지나면 저절로 사라진다."""

    hidden_by_timeout = Signal()
    PAD = 12
    TAIL = 12

    def __init__(self, max_width: int = 320, min_seconds: float = 4.0, seconds_per_char: float = 0.12):
        super().__init__(None)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating)
        self.max_width = max_width
        self.min_seconds = min_seconds
        self.seconds_per_char = seconds_per_char
        self.text = ""
        self.system = False  # 캐릭터 대사가 아닌 안내(오류 등)는 다른 색
        self.font_ = QFont()
        self.font_.setPointSize(11)
        self._timer = QTimer(self)
        self._timer.setSingleShot(True)
        self._timer.timeout.connect(self._timeout)
        self._text_rect = QRect()

    def duration_ms(self, text: str) -> int:
        return round(max(self.min_seconds, self.seconds_per_char * len(text) + 1.5) * 1000)

    def show_text(self, text: str, anchor: QRect, *, system: bool = False, seconds: float | None = None) -> None:
        """anchor(캐릭터 창 영역) 위쪽에 말풍선을 띄운다. seconds=0 이면 저절로 사라지지 않음."""
        self.text, self.system = text, system
        fm = QFontMetrics(self.font_)
        inner_w = self.max_width - 2 * self.PAD
        bound = fm.boundingRect(QRect(0, 0, inner_w, 2000), Qt.TextFlag.TextWordWrap, text)
        w = min(self.max_width, max(bound.width(), fm.horizontalAdvance("……")) + 2 * self.PAD)
        h = bound.height() + 2 * self.PAD + self.TAIL
        self._text_rect = QRect(self.PAD, self.PAD, w - 2 * self.PAD, bound.height())
        self.setFixedSize(w, h)
        x = anchor.center().x() - w // 2
        y = anchor.top() - h + 10
        screen = self.screen().availableGeometry() if self.screen() else None
        if screen is not None:
            x = max(screen.left() + 4, min(x, screen.right() - w - 4))
            if y < screen.top() + 4:  # 위가 모자라면 캐릭터 옆에
                y = screen.top() + 4
        self.move(QPoint(x, y))
        self.update()
        self.show()
        self.raise_()
        ms = self.duration_ms(text) if seconds is None else round(seconds * 1000)
        if ms > 0:
            self._timer.start(ms)
        else:
            self._timer.stop()

    def _timeout(self) -> None:
        self.hide()
        self.hidden_by_timeout.emit()

    def mousePressEvent(self, event) -> None:  # noqa: N802
        self._timer.stop()
        self._timeout()

    def paintEvent(self, event) -> None:  # noqa: N802
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        body = QRectF(1, 1, self.width() - 2, self.height() - self.TAIL - 2)
        path = QPainterPath()
        path.addRoundedRect(body, 12, 12)
        cx = self.width() / 2
        tail = QPainterPath()
        tail.moveTo(cx - 9, body.bottom() - 1)
        tail.lineTo(cx, self.height() - 2)
        tail.lineTo(cx + 9, body.bottom() - 1)
        path = path.united(tail)
        fill = QColor(255, 244, 236, 240) if self.system else QColor(252, 252, 255, 240)
        p.setPen(QPen(QColor(70, 80, 95), 1.4))
        p.setBrush(fill)
        p.drawPath(path)
        p.setFont(self.font_)
        p.setPen(QColor(30, 34, 42))
        p.drawText(self._text_rect, Qt.TextFlag.TextWordWrap, self.text)
        p.end()
