"""자리 비움: 키보드·마우스(GetLastInputInfo)와 게임패드(XInput)를 마지막으로 만진 지 몇 초 지났는지. 다른 OS 는 0."""

from __future__ import annotations

import sys
import time


def idle_seconds() -> float:
    if sys.platform != "win32":
        return 0.0
    import ctypes

    class LASTINPUTINFO(ctypes.Structure):
        _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]

    info = LASTINPUTINFO()
    info.cbSize = ctypes.sizeof(LASTINPUTINFO)
    if not ctypes.windll.user32.GetLastInputInfo(ctypes.byref(info)):
        return 0.0
    now = ctypes.windll.kernel32.GetTickCount()
    return ((now - info.dwTime) & 0xFFFFFFFF) / 1000.0


class PadWatch:
    """게임패드(XInput, 엑스박스 패드·대부분의 PC 패드)를 마지막으로 만진 뒤 지난 초.
    poll() 을 자주(30초마다) 부르면 그 사이에 버튼·스틱이 바뀌었는지(패킷 번호) 본다. 패드가 없으면 None."""

    def __init__(self, read=None, clock=time.monotonic):
        self.clock = clock
        self._read = read if read is not None else _xinput_packets
        self._last: dict[int, int] = {}
        self._touched: float | None = None

    def poll(self) -> float | None:
        """패드가 하나도 없으면 None, 있으면 마지막으로 만진 뒤 지난 초 (처음 본 패드는 지금 만진 것으로 침)."""
        try:
            packets = self._read()
        except Exception:  # noqa: BLE001 - XInput 이 없거나 막혀도 키보드·마우스로만 판단
            packets = {}
        now = self.clock()
        if not packets:
            self._last = {}
            return None
        for pad, num in packets.items():
            if self._last.get(pad) != num:
                self._touched = now
        self._last = dict(packets)
        if self._touched is None:
            self._touched = now
        return now - self._touched


def _xinput_packets() -> dict[int, int]:
    """연결된 XInput 패드마다 상태 패킷 번호 (버튼·스틱이 바뀔 때마다 늘어남)."""
    if sys.platform != "win32":
        return {}
    import ctypes

    class XINPUT_GAMEPAD(ctypes.Structure):
        _fields_ = [("wButtons", ctypes.c_ushort), ("bLeftTrigger", ctypes.c_ubyte), ("bRightTrigger", ctypes.c_ubyte),
                    ("sThumbLX", ctypes.c_short), ("sThumbLY", ctypes.c_short), ("sThumbRX", ctypes.c_short),
                    ("sThumbRY", ctypes.c_short)]

    class XINPUT_STATE(ctypes.Structure):
        _fields_ = [("dwPacketNumber", ctypes.c_uint), ("Gamepad", XINPUT_GAMEPAD)]

    dll = None
    for name in ("xinput1_4", "xinput1_3", "xinput9_1_0"):
        try:
            dll = getattr(ctypes.windll, name)
            break
        except OSError:
            continue
    if dll is None:
        return {}
    out = {}
    for pad in range(4):
        state = XINPUT_STATE()
        if dll.XInputGetState(pad, ctypes.byref(state)) == 0:  # ERROR_SUCCESS = 연결됨
            out[pad] = int(state.dwPacketNumber)
    return out
