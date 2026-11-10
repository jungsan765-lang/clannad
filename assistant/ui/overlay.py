"""게임 화면 자막: 다니카가 있는 모니터 말고, 주인님이 보고 있는 (게임) 모니터 위에 다니카 말을 자막처럼 띄운다.

- 마우스·키보드 입력은 그대로 아래 창(게임)으로 간다. 포커스도 빼앗지 않는다 → 게임에 영향 없음.
- '창 모드 전체화면(테두리 없음)'·창 모드 게임 위에 뜬다. '전용 전체화면' 게임 위에는 윈도우가 어떤 창도 띄우지 못한다.
"""

from __future__ import annotations

from PySide6.QtCore import QRect, QRectF, Qt, QTimer
from PySide6.QtGui import QColor, QFont, QFontMetrics, QGuiApplication, QPainter
from PySide6.QtWidgets import QWidget


def screen_for(choice: str, ranks: list[int] | None = None) -> QRect:
    """보는 모니터(left/right/primary/번호)에 해당하는 Qt 화면 영역.
    ranks: 번호로 고른 경우, 그 모니터가 왼쪽에서 몇 번째인지 (화면 찍기 쪽 번호와 Qt 순서가 달라서 위치로 맞춘다)."""
    screens = sorted(QGuiApplication.screens(), key=lambda s: s.geometry().x())
    primary = QGuiApplication.primaryScreen()
    if not screens:
        return primary.geometry() if primary else QRect(0, 0, 1920, 1080)
    c = str(choice).lower()
    if c == "left":
        return screens[0].geometry()
    if c == "right":
        return screens[-1].geometry()
    if c.isdigit() and ranks:
        return screens[min(ranks[0], len(screens) - 1)].geometry()
    return (primary or screens[0]).geometry()


class GameOverlay(QWidget):
    PAD_X, PAD_Y = 22, 14

    def __init__(self):
        super().__init__(None)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint
                            | Qt.WindowType.Tool | Qt.WindowType.WindowTransparentForInput)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        self.text = ""
        self.font_ = QFont()
        self.font_.setPointSize(15)
        self.name_font = QFont()
        self.name_font.setPointSize(10)
        self.name_font.setBold(True)
        self._text_rect = QRect()
        self.timer = QTimer(self)
        self.timer.setSingleShot(True)
        self.timer.timeout.connect(self.hide)

    def show_on(self, area: QRect, text: str, seconds: float, position: str = "top") -> None:
        self.text = text
        fm, nm = QFontMetrics(self.font_), QFontMetrics(self.name_font)
        max_w = int(area.width() * 0.6)
        bound = fm.boundingRect(QRect(0, 0, max_w - 2 * self.PAD_X, 2000), Qt.TextFlag.TextWordWrap, text)
        w = max(bound.width() + 2 * self.PAD_X, 220)
        h = nm.height() + 4 + bound.height() + 2 * self.PAD_Y
        self._text_rect = QRect(self.PAD_X, self.PAD_Y + nm.height() + 4, w - 2 * self.PAD_X, bound.height())
        self.setFixedSize(w, h)
        x = area.center().x() - w // 2
        y = area.top() + int(area.height() * 0.09) if position == "top" else area.bottom() - h - int(area.height() * 0.2)
        self.move(x, y)
        self.update()
        self.show()
        self.raise_()
        self.timer.start(max(1000, round(seconds * 1000)))

    def paintEvent(self, event) -> None:  # noqa: N802
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        r = QRectF(0.5, 0.5, self.width() - 1, self.height() - 1)
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(QColor(18, 22, 32, 205))
        p.drawRoundedRect(r, 14, 14)
        p.setFont(self.name_font)
        p.setPen(QColor(140, 205, 235))
        p.drawText(QRect(self.PAD_X, self.PAD_Y, self.width(), 30), Qt.AlignmentFlag.AlignLeft, "다니카")
        p.setFont(self.font_)
        p.setPen(QColor(245, 247, 252))
        p.drawText(self._text_rect, Qt.TextFlag.TextWordWrap, self.text)
        p.end()
