"""Windows 맨 앞 창 정보(제목, 프로그램 이름). 화면 판단에 참고로 넘긴다. 내 PC에서만 처리.

Windows 가 아니면 빈 값을 돌려준다(테스트·개발용).
"""

from __future__ import annotations

import sys
from dataclasses import dataclass


@dataclass
class WindowInfo:
    title: str
    process: str  # 실행 파일 이름 (예: chrome.exe), 소문자
    rect: tuple[int, int, int, int]  # left, top, right, bottom


def _process_name(pid: int) -> str:
    import ctypes
    from ctypes import wintypes

    k32 = ctypes.windll.kernel32
    handle = k32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
    if not handle:
        return ""
    try:
        buf = ctypes.create_unicode_buffer(1024)
        size = wintypes.DWORD(len(buf))
        if k32.QueryFullProcessImageNameW(handle, 0, buf, ctypes.byref(size)):
            return buf.value.replace("/", "\\").split("\\")[-1].lower()
        return ""
    finally:
        k32.CloseHandle(handle)


def _info(hwnd) -> WindowInfo | None:
    import ctypes
    from ctypes import wintypes

    u32 = ctypes.windll.user32
    length = u32.GetWindowTextLengthW(hwnd)
    buf = ctypes.create_unicode_buffer(length + 1)
    u32.GetWindowTextW(hwnd, buf, length + 1)
    pid = wintypes.DWORD()
    u32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
    rect = wintypes.RECT()
    u32.GetWindowRect(hwnd, ctypes.byref(rect))
    return WindowInfo(buf.value, _process_name(pid.value), (rect.left, rect.top, rect.right, rect.bottom))


def foreground_window() -> WindowInfo | None:
    if sys.platform != "win32":
        return None
    import ctypes

    hwnd = ctypes.windll.user32.GetForegroundWindow()
    return _info(hwnd) if hwnd else None
