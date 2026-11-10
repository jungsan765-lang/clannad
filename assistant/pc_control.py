"""프로그램 켜기·음악/소리 조절.

- 프로그램은 시작 메뉴·바탕화면에 있는 바로가기만 켠다 (주인님이 설치한 것). 임의의 명령이나 경로는 실행하지 않는다.
- 음악·소리는 키보드의 미디어 키를 누른 것처럼 보낸다 (재생/일시정지, 다음 곡, 이전 곡, 소리 크게/작게, 음소거).
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

log = logging.getLogger("assistant.pc")

SHORTCUT_EXT = (".lnk", ".url", ".appref-ms")
# 부르는 이름 → 바로가기 이름에 들어 있을 말 (한국어로 불러도 영어 이름 바로가기를 찾게)
ALIASES = {
    "카톡": ["카카오톡", "kakaotalk"], "카카오톡": ["카카오톡", "kakaotalk"], "디코": ["discord"], "디스코드": ["discord"],
    "크롬": ["chrome"], "엣지": ["edge"], "웨일": ["whale"], "스팀": ["steam"], "메모장": ["notepad", "메모장"],
    "원신": ["원신", "genshin"], "사이퍼즈": ["사이퍼즈", "cyphers"], "칸코레": ["kancolle", "艦これ", "poi", "칸코레"],
    "디맥": ["djmax"], "붉은사막": ["붉은사막", "crimson desert"], "유튜브": ["youtube"], "스포티파이": ["spotify"],
    "멜론": ["melon", "멜론"], "탐색기": ["explorer", "파일 탐색기"], "계산기": ["calculator", "계산기"],
    "넥슨": ["nexon"], "배틀넷": ["battle.net"], "에픽": ["epic games"], "obs": ["obs"],
}
MEDIA_KEYS = {"play_pause": 0xB3, "next": 0xB0, "prev": 0xB1, "stop": 0xB2, "vol_up": 0xAF, "vol_down": 0xAE,
              "mute": 0xAD}
MEDIA_LABEL = {"play_pause": "재생/일시정지", "next": "다음 곡", "prev": "이전 곡", "stop": "정지", "vol_up": "소리 크게",
               "vol_down": "소리 작게", "mute": "음소거"}


def shortcut_folders() -> list[Path]:
    env = os.environ
    out = []
    for base, sub in ((env.get("APPDATA"), r"Microsoft\Windows\Start Menu\Programs"),
                      (env.get("PROGRAMDATA"), r"Microsoft\Windows\Start Menu\Programs"),
                      (env.get("USERPROFILE"), "Desktop"), (env.get("PUBLIC"), "Desktop"),
                      (env.get("USERPROFILE"), "OneDrive\\바탕 화면"), (env.get("USERPROFILE"), "OneDrive\\Desktop")):
        if base:
            p = Path(base) / sub
            if p.is_dir():
                out.append(p)
    return out


def find_program(name: str, folders: list[Path] | None = None) -> Path | None:
    """이름에 맞는 바로가기. 정확히 같은 이름 > 이름으로 시작 > 이름이 들어 있음, 같으면 짧은 이름."""
    name = (name or "").strip().lower()
    if not name:
        return None
    words = [w.lower() for w in ALIASES.get(name, [])] + [name]
    best: tuple[int, int, Path] | None = None
    for folder in folders if folders is not None else shortcut_folders():
        try:
            files = [p for p in folder.rglob("*") if p.suffix.lower() in SHORTCUT_EXT]
        except OSError:
            continue
        for p in files:
            stem = p.stem.lower()
            if any(bad in stem for bad in ("uninstall", "제거", "삭제", "readme", "help", "도움말")):
                continue
            for w in words:
                rank = 0 if stem == w else 1 if stem.startswith(w) else 2 if w in stem else None
                if rank is None:
                    continue
                cand = (rank, len(stem), p)
                if best is None or cand[:2] < best[:2]:
                    best = cand
    return best[2] if best else None


def launch(path: Path) -> bool:
    if sys.platform != "win32":
        log.info("프로그램 켜기는 Windows 에서만: %s", path)
        return False
    os.startfile(str(path))  # noqa: S606 - 시작 메뉴·바탕화면 바로가기만 넘어온다
    return True


def parse_media(target: str) -> tuple[str, int] | None:
    """'vol_down 5' → ('vol_down', 5). 소리는 한 번에 2%씩."""
    parts = (target or "").strip().split()
    if not parts or parts[0] not in MEDIA_KEYS:
        return None
    times = 1
    if len(parts) > 1 and parts[1].isdigit():
        times = max(1, min(25, int(parts[1])))
    return parts[0], times


def press_media(key: str, times: int = 1) -> bool:
    if sys.platform != "win32" or key not in MEDIA_KEYS:
        return False
    import ctypes

    vk = MEDIA_KEYS[key]
    for _ in range(times):
        ctypes.windll.user32.keybd_event(vk, 0, 0x1, 0)  # KEYEVENTF_EXTENDEDKEY
        ctypes.windll.user32.keybd_event(vk, 0, 0x1 | 0x2, 0)  # + KEYEVENTF_KEYUP
    return True
