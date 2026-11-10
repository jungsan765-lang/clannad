"""게임 화면 자막: 다니카가 있는 모니터 말고, 주인님이 보고 있는 (게임) 모니터 위에 다니카 말을 자막처럼 띄운다.

- 마우스·키보드 입력은 그대로 아래 창(게임)으로 간다. 포커스도 빼앗지 않는다 → 게임에 영향 없음.
- '창 모드 전체화면(테두리 없음)'·창 모드 게임 위에 뜬다. '전용 전체화면' 게임 위에는 윈도우가 어떤 창도 띄우지 못한다.
- 색은 뒤 배경을 보고 스스로 바꾼다: 밝은 배경엔 어두운 상자, 어두운 배경엔 밝은 상자, 이름표는 배경과 반대 색.
  떠 있는 동안에도 1.5초마다 자막 바로 위·아래 배경을 다시 보고 맞춘다.
"""

from __future__ import annotations

import colorsys
from dataclasses import dataclass
from typing import Callable

from PySide6.QtCore import QRect, QRectF, Qt, QTimer
from PySide6.QtGui import QColor, QFont, QFontMetrics, QGuiApplication, QImage, QPainter
from PySide6.QtWidgets import QWidget


@dataclass
class Palette:
    box: QColor
    text: QColor
    shadow: QColor
    name: QColor
    border: QColor


def background_stats(img: QImage | None) -> tuple[float, tuple[int, int, int]] | None:
    """배경의 밝기(0~1)와 평균 색."""
    if img is None or img.isNull() or img.width() == 0:
        return None
    small = img.scaled(32, 8, Qt.AspectRatioMode.IgnoreAspectRatio, Qt.TransformationMode.SmoothTransformation)
    n, r, g, b, lum = 0, 0, 0, 0, 0.0
    for y in range(small.height()):
        for x in range(small.width()):
            c = small.pixelColor(x, y)
            r, g, b, n = r + c.red(), g + c.green(), b + c.blue(), n + 1
            lum += (0.2126 * c.red() + 0.7152 * c.green() + 0.0722 * c.blue()) / 255
    return lum / n, (r // n, g // n, b // n)


def pick_palette(stats: tuple[float, tuple[int, int, int]] | None) -> Palette:
    """배경이 밝으면 어두운 상자·흰 글씨, 어두우면 밝은 상자·검은 글씨. 이름표는 배경 색의 반대 색."""
    lum, (r, g, b) = stats if stats else (0.5, (128, 128, 128))
    h, _, sat = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    opposite = (h + 0.5) % 1.0
    if lum < 0.38:  # 어두운 배경 → 밝은 상자
        name = QColor.fromHslF(opposite, 0.75 if sat > 0.15 else 0.6, 0.35)
        return Palette(QColor(248, 248, 252, 228), QColor(22, 24, 32), QColor(255, 255, 255, 160), name,
                       QColor(255, 255, 255, 90))
    name = QColor.fromHslF(opposite, 0.8 if sat > 0.15 else 0.65, 0.72)
    alpha = 215 if lum > 0.62 else 235  # 중간 밝기는 상자를 더 진하게
    return Palette(QColor(14, 17, 26, alpha), QColor(248, 249, 252), QColor(0, 0, 0, 200), name, QColor(0, 0, 0, 120))


def grab_screen_area(rect: QRect) -> QImage | None:
    """화면의 그 부분 (전역 좌표). 자막이 떠 있는 자리는 피해서 부른다."""
    scr = QGuiApplication.screenAt(rect.center())
    if scr is None or rect.isEmpty():
        return None
    g = scr.geometry()
    pix = scr.grabWindow(0, rect.x() - g.x(), rect.y() - g.y(), rect.width(), rect.height())
    return None if pix.isNull() else pix.toImage()


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

    def __init__(self, sampler: Callable[[QRect], QImage | None] = grab_screen_area):
        super().__init__(None)
        self.sampler = sampler
        self.palette_ = pick_palette(None)
        self.recolor = QTimer(self)
        self.recolor.setInterval(1500)
        self.recolor.timeout.connect(self._adapt_while_visible)
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
        self.timer.timeout.connect(self._finish)

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
        if not self.isVisible():  # 뜨기 전에 그 자리 배경을 보고 색을 고른다
            self.palette_ = pick_palette(background_stats(self._sample(QRect(x, y, w, h))))
        self.move(x, y)
        self.update()
        self.show()
        self.raise_()
        self.timer.start(max(1000, round(seconds * 1000)))
        self.recolor.start()

    def _sample(self, rect: QRect) -> QImage | None:
        try:
            return self.sampler(rect)
        except Exception:  # noqa: BLE001 - 배경을 못 보면 기본 색
            return None

    def _adapt_while_visible(self) -> None:
        """떠 있는 동안: 자막 바로 위·아래 띠의 배경으로 색을 다시 맞춘다 (자막 자신은 피해서)."""
        if not self.isVisible():
            self.recolor.stop()
            return
        g = self.geometry()
        above = self._sample(QRect(g.x(), g.y() - 24, g.width(), 20))
        below = self._sample(QRect(g.x(), g.bottom() + 4, g.width(), 20))
        stats = [s for s in (background_stats(above), background_stats(below)) if s]
        if not stats:
            return
        lum = sum(s[0] for s in stats) / len(stats)
        rgb = tuple(sum(s[1][i] for s in stats) // len(stats) for i in range(3))
        new = pick_palette((lum, rgb))
        if new.text != self.palette_.text or new.box.alpha() != self.palette_.box.alpha():
            self.palette_ = new
            self.update()

    def _finish(self) -> None:
        self.recolor.stop()
        self.hide()

    def paintEvent(self, event) -> None:  # noqa: N802
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        r = QRectF(0.5, 0.5, self.width() - 1, self.height() - 1)
        pal = self.palette_
        p.setPen(pal.border)
        p.setBrush(pal.box)
        p.drawRoundedRect(r, 14, 14)
        p.setFont(self.name_font)
        p.setPen(pal.name)
        p.drawText(QRect(self.PAD_X, self.PAD_Y, self.width(), 30), Qt.AlignmentFlag.AlignLeft, "다니카")
        p.setFont(self.font_)
        p.setPen(pal.shadow)  # 그림자 테두리: 어떤 배경에서도 글자가 묻히지 않게
        for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            p.drawText(self._text_rect.translated(dx, dy), Qt.TextFlag.TextWordWrap, self.text)
        p.setPen(pal.text)
        p.drawText(self._text_rect, Qt.TextFlag.TextWordWrap, self.text)
        p.end()
