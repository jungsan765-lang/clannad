"""분석 창: 다니카의 자세한 분석(상황 · 짚을 점 · 할 일)을 보여 준다. 말풍선에는 요약만 뜬다.

캐릭터 옆에 뜨고, 옮기거나 닫을 수 있다. 최근 분석 몇 개를 아래에 남겨 둔다.
"""

from __future__ import annotations

import html
from typing import Callable

from PySide6.QtCore import QRect, Qt
from PySide6.QtGui import QGuiApplication
from PySide6.QtWidgets import QHBoxLayout, QPushButton, QTextBrowser, QVBoxLayout, QWidget


def analysis_html(a) -> str:
    e = html.escape
    parts = [f"<h3 style='margin:4px 0'>{e(a.when)} 분석</h3>"]
    if a.situation:
        parts.append(f"<p><b>상황</b> — {e(a.situation)}</p>")
    if a.points:
        parts.append("<p><b>짚을 점</b></p><ul>")
        parts += [f"<li><b>{e(p.get('title', ''))}</b><br>{e(p.get('detail', ''))}</li>" for p in a.points]
        parts.append("</ul>")
    if a.next_steps:
        parts.append("<p><b>지금 할 일</b></p><ol>")
        parts += [f"<li>{e(s)}</li>" for s in a.next_steps]
        parts.append("</ol>")
    parts.append(f"<p style='color:#666'>다니카: {e(a.summary)}</p>")
    return "".join(parts)


class AnalysisPanel(QWidget):
    def __init__(self, anchor: Callable[[], QRect], keep: int = 5):
        super().__init__(None)
        self.setWindowFlags(Qt.WindowType.Window | Qt.WindowType.Tool | Qt.WindowType.WindowStaysOnTopHint)
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating)
        self.setWindowTitle("다니카의 분석")
        self.anchor = anchor
        self.keep = keep
        self.history: list = []
        self.placed = False
        self.view = QTextBrowser()
        self.view.setOpenExternalLinks(False)
        close = QPushButton("닫기")
        close.clicked.connect(self.hide)
        row = QHBoxLayout()
        row.addStretch(1)
        row.addWidget(close)
        lay = QVBoxLayout(self)
        lay.addWidget(self.view, 1)
        lay.addLayout(row)
        self.resize(440, 560)

    def show_analysis(self, a) -> None:
        self.history.insert(0, a)
        del self.history[self.keep:]
        self.view.setHtml("<hr>".join(analysis_html(x) for x in self.history))
        self.view.verticalScrollBar().setValue(0)
        if not self.placed:  # 처음엔 캐릭터 왼쪽에 (옮기면 그 자리 유지)
            self._place()
            self.placed = True
        self.show()
        self.raise_()

    def _place(self) -> None:
        a = self.anchor()
        x, y = a.left() - self.width() - 12, a.top()
        scr = QGuiApplication.screenAt(a.center()) or QGuiApplication.primaryScreen()
        if scr is not None:
            g = scr.availableGeometry()
            if x < g.left() + 4:  # 왼쪽에 자리가 없으면 오른쪽에
                x = min(a.right() + 12, g.right() - self.width() - 4)
            y = max(g.top() + 4, min(y, g.bottom() - self.height() - 4))
        self.move(x, y)
