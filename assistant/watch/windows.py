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
    hwnd: int = 0  # 창 번호 (그 창만 찍을 때)


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
    return WindowInfo(buf.value, _process_name(pid.value), (rect.left, rect.top, rect.right, rect.bottom), int(hwnd or 0))


def foreground_window() -> WindowInfo | None:
    if sys.platform != "win32":
        return None
    import ctypes

    hwnd = ctypes.windll.user32.GetForegroundWindow()
    return _info(hwnd) if hwnd else None


# ---------------------------------------------------------------- 다른 프로그램 창 읽기 (부탁받았을 때)

# 쓰고 있으면 어느 모니터에 있든 알아서 함께 보는 메신저 (설정에서 끔)
MESSENGERS = {"kakaotalk.exe": "카카오톡", "discord.exe": "디스코드", "telegram.exe": "텔레그램", "slack.exe": "슬랙",
              "line.exe": "라인", "whatsapp.exe": "왓츠앱"}

# 대화에서 부르는 이름 → 실행 파일
PROGRAMS = {
    "카카오톡": "kakaotalk.exe", "카톡": "kakaotalk.exe", "디스코드": "discord.exe", "메모장": "notepad.exe",
    "크롬": "chrome.exe", "엣지": "msedge.exe", "웨일": "whale.exe", "파이어폭스": "firefox.exe", "탐색기": "explorer.exe",
    "엑셀": "excel.exe", "워드": "winword.exe", "파워포인트": "powerpnt.exe", "한글": "hwp.exe", "텔레그램": "telegram.exe",
    "슬랙": "slack.exe", "브이에스코드": "code.exe", "vs code": "code.exe", "스팀": "steamwebhelper.exe",
}


def list_windows() -> list[tuple[int, WindowInfo]]:
    """보이는(최소화 안 된) 창들을 위에 있는 것부터. Windows 가 아니면 빈 목록."""
    if sys.platform != "win32":
        return []
    import ctypes
    from ctypes import wintypes

    u32 = ctypes.windll.user32
    out: list[tuple[int, WindowInfo]] = []

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def each(hwnd, _):
        if u32.IsWindowVisible(hwnd) and not u32.IsIconic(hwnd) and u32.GetWindowTextLengthW(hwnd) > 0:
            info = _info(hwnd)
            if info and info.rect[2] - info.rect[0] > 120 and info.rect[3] - info.rect[1] > 80:
                out.append((int(hwnd), info))
        return True

    u32.EnumWindows(each, 0)
    return out


def find_windows(target: str, own_pid_process: str = "", limit: int = 2,
                 windows: list[tuple[int, WindowInfo]] | None = None) -> list[tuple[int, WindowInfo]]:
    """'카카오톡' 같은 이름(또는 창 제목 일부)으로 창 찾기. 비우면 다니카 창을 뺀 가장 최근 창."""
    wins = [w for w in (windows if windows is not None else list_windows()) if w[1].process != own_pid_process]
    t = (target or "").strip().lower()
    if not t:
        return wins[:1]
    exe = next((v for k, v in PROGRAMS.items() if k in t), "")
    if exe:
        hits = [w for w in wins if w[1].process == exe]
    else:
        hits = [w for w in wins if t in w[1].title.lower() or t.replace(" ", "") in w[1].process]
    return hits[:limit]


def capture_window(hwnd: int):
    """그 창만 원래 크기로 찍는다 (다른 창에 가려져 있어도). 못 찍으면 None. 최소화된 창은 못 찍는다."""
    if sys.platform != "win32":
        return None
    import ctypes
    from ctypes import wintypes

    from PIL import Image

    u32, g32 = ctypes.windll.user32, ctypes.windll.gdi32
    vp = ctypes.c_void_p
    u32.GetWindowDC.restype, u32.GetWindowDC.argtypes = vp, [wintypes.HWND]
    u32.ReleaseDC.argtypes = [wintypes.HWND, vp]
    u32.PrintWindow.argtypes = [wintypes.HWND, vp, wintypes.UINT]
    g32.CreateCompatibleDC.restype, g32.CreateCompatibleDC.argtypes = vp, [vp]
    g32.CreateCompatibleBitmap.restype, g32.CreateCompatibleBitmap.argtypes = vp, [vp, ctypes.c_int, ctypes.c_int]
    g32.SelectObject.restype, g32.SelectObject.argtypes = vp, [vp, vp]
    g32.DeleteObject.argtypes = [vp]
    g32.DeleteDC.argtypes = [vp]
    g32.GetDIBits.argtypes = [vp, vp, wintypes.UINT, wintypes.UINT, vp, vp, wintypes.UINT]

    class BITMAPINFOHEADER(ctypes.Structure):
        _fields_ = [("biSize", wintypes.DWORD), ("biWidth", wintypes.LONG), ("biHeight", wintypes.LONG),
                    ("biPlanes", wintypes.WORD), ("biBitCount", wintypes.WORD), ("biCompression", wintypes.DWORD),
                    ("biSizeImage", wintypes.DWORD), ("biXPelsPerMeter", wintypes.LONG),
                    ("biYPelsPerMeter", wintypes.LONG), ("biClrUsed", wintypes.DWORD), ("biClrImportant", wintypes.DWORD)]

    if u32.IsIconic(hwnd):
        return None
    rect = wintypes.RECT()
    u32.GetWindowRect(hwnd, ctypes.byref(rect))
    w, h = rect.right - rect.left, rect.bottom - rect.top
    if w <= 0 or h <= 0:
        return None
    hdc = u32.GetWindowDC(hwnd)
    mem = g32.CreateCompatibleDC(hdc)
    bmp = g32.CreateCompatibleBitmap(hdc, w, h)
    old = g32.SelectObject(mem, bmp)
    try:
        ok = u32.PrintWindow(hwnd, mem, 2)  # PW_RENDERFULLCONTENT: 가려진 부분까지
        bi = BITMAPINFOHEADER(ctypes.sizeof(BITMAPINFOHEADER), w, -h, 1, 32, 0, 0, 0, 0, 0, 0)
        buf = ctypes.create_string_buffer(w * h * 4)
        g32.GetDIBits(mem, bmp, 0, h, buf, ctypes.byref(bi), 0)
    finally:
        g32.SelectObject(mem, old)
        g32.DeleteObject(bmp)
        g32.DeleteDC(mem)
        u32.ReleaseDC(hwnd, hdc)
    img = Image.frombuffer("RGB", (w, h), buf.raw, "raw", "BGRX", 0, 1)
    if not ok or max(hi for _, hi in img.getextrema()) < 8:  # 실패하거나 새까마면 보이는 화면에서 그 부분만
        try:
            import mss

            with (getattr(mss, "MSS", None) or mss.mss)() as sct:
                shot = sct.grab({"left": rect.left, "top": rect.top, "width": w, "height": h})
                img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
        except Exception:  # noqa: BLE001
            return None
    return img
