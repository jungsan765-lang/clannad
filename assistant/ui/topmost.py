"""캐릭터 창들을 모든 창보다 앞에 두기.

Qt 의 '항상 위' 만으로는 Windows 작업 표시줄, 게임(창모드 전체화면), 다른 '항상 위' 창이
그 위로 올라올 수 있다. 그래서 일정 간격으로 Windows API(SetWindowPos, HWND_TOPMOST)를 다시 불러
맨 앞으로 올린다. 포커스는 빼앗지 않는다(SWP_NOACTIVATE).
전용 전체화면(Exclusive Fullscreen) 게임 위에는 어떤 일반 창도 못 뜬다 → 게임은 '창모드 전체화면' 권장.
"""

from __future__ import annotations

import sys
from typing import Iterable

from PySide6.QtCore import QObject, QTimer
from PySide6.QtWidgets import QWidget

HWND_TOPMOST = -1
SWP_NOSIZE, SWP_NOMOVE, SWP_NOACTIVATE = 0x0001, 0x0002, 0x0010


def bring_to_top(widget: QWidget) -> None:
    if not widget.isVisible():
        return
    if sys.platform == "win32":
        import ctypes

        ctypes.windll.user32.SetWindowPos(int(widget.winId()), HWND_TOPMOST, 0, 0, 0, 0,
                                          SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE)
    else:
        widget.raise_()


class TopmostKeeper(QObject):
    """widgets 를 순서대로(뒤에 있는 것이 더 앞) 주기적으로 맨 앞에 올린다."""

    def __init__(self, widgets: Iterable[QWidget], interval_ms: int = 1500, parent: QObject | None = None):
        super().__init__(parent)
        self.widgets = list(widgets)
        self.timer = QTimer(self)
        self.timer.setInterval(max(200, interval_ms))
        self.timer.timeout.connect(self.tick)

    def start(self) -> None:
        self.tick()
        self.timer.start()

    def stop(self) -> None:
        self.timer.stop()

    def tick(self) -> None:
        for w in self.widgets:
            bring_to_top(w)
