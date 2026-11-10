"""전역 단축키 (Windows RegisterHotKey).

키보드 입력을 엿보는 후킹이 아니라, Windows 에 정해진 키 몇 개만 등록해 눌렸다는 알림만 받는다.
등록한 키는 다른 프로그램(게임 포함)으로 전달되지 않으니, 게임에서 쓰는 키와 겹치지 않게 고른다.
Windows 가 아니면 아무것도 하지 않는다.
"""

from __future__ import annotations

import logging
import sys
from typing import Callable

from PySide6.QtCore import QAbstractNativeEventFilter, QTimer

log = logging.getLogger("assistant.hotkeys")

WM_HOTKEY = 0x0312
MOD_NOREPEAT = 0x4000
MODS = {"ctrl": 0x0002, "alt": 0x0001, "shift": 0x0004, "win": 0x0008}


def parse_key(text: str) -> tuple[int, int] | None:
    """'F8', 'ctrl+alt+D', 'pause' → (수정키, 가상키 코드)."""
    parts = [p.strip().lower() for p in text.split("+") if p.strip()]
    if not parts:
        return None
    mods = 0
    for p in parts[:-1]:
        if p not in MODS:
            return None
        mods |= MODS[p]
    key = parts[-1]
    if key.startswith("f") and key[1:].isdigit() and 1 <= int(key[1:]) <= 24:
        vk = 0x70 + int(key[1:]) - 1
    elif len(key) == 1 and key.isalnum():
        vk = ord(key.upper())
    else:
        vk = {"pause": 0x13, "scrolllock": 0x91, "insert": 0x2D, "home": 0x24, "end": 0x23,
              "pageup": 0x21, "pagedown": 0x22}.get(key, 0)
        if not vk:
            return None
    return mods, vk


class GlobalHotkeys(QAbstractNativeEventFilter):
    def __init__(self, hwnd: int):
        super().__init__()
        self.hwnd = hwnd
        self.callbacks: dict[int, Callable[[], None]] = {}
        self.next_id = 1

    def register(self, key: str, callback: Callable[[], None]) -> bool:
        parsed = parse_key(key) if key else None
        if not parsed:
            if key:
                log.warning("단축키를 읽을 수 없어요: %s", key)
            return False
        if sys.platform != "win32":
            return False
        import ctypes

        mods, vk = parsed
        hid = self.next_id
        if not ctypes.windll.user32.RegisterHotKey(self.hwnd, hid, mods | MOD_NOREPEAT, vk):
            log.warning("단축키 %s 를 등록하지 못했어요 (다른 프로그램이 쓰는 중일 수 있음)", key)
            return False
        self.callbacks[hid] = callback
        self.next_id += 1
        return True

    def unregister_all(self) -> None:
        if sys.platform == "win32":
            import ctypes

            for hid in self.callbacks:
                ctypes.windll.user32.UnregisterHotKey(self.hwnd, hid)
        self.callbacks.clear()

    def nativeEventFilter(self, event_type, message):  # noqa: N802 (Qt 이름 규칙)
        if sys.platform == "win32" and bytes(event_type) == b"windows_generic_MSG":
            import ctypes
            from ctypes import wintypes

            msg = wintypes.MSG.from_address(int(message))
            if msg.message == WM_HOTKEY and msg.wParam in self.callbacks:
                QTimer.singleShot(0, self.callbacks[msg.wParam])
                return True, 0
        return False, 0
