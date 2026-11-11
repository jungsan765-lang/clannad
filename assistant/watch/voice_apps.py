"""통화 프로그램(디스코드 등)이 지금 소리를 내고 있나 — Windows 오디오 세션의 소리 크기로 본다 (pycaw).

PC 소리 듣기(ears)가 친구들 통화 목소리까지 받아써서 AI 에게 보내지 않게, 통화 프로그램에서 소리가 나는 동안
(말이 끊겨도 잠깐은 이어서) 듣기를 쉬게 하는 데 쓴다. pycaw 가 없으면 뒤에서 한 번 설치하고, 안 되면 그냥 안 쉰다.
"""

from __future__ import annotations

import logging
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Callable

log = logging.getLogger("assistant.voice_apps")

VOICE_APPS = {"discord.exe": "디스코드", "discordptb.exe": "디스코드", "discordcanary.exe": "디스코드",
              "zoom.exe": "줌", "ms-teams.exe": "팀즈", "teams.exe": "팀즈", "slack.exe": "슬랙",
              "kakaotalk.exe": "카카오톡", "skype.exe": "스카이프"}
PEAK = 0.01  # 이보다 크면 '소리가 나는 중'
HOLD = 15.0  # 말이 잠깐 끊겨도 이만큼은 통화 중으로 본다

_state = {"installing": False, "ok": None}


def _install_later() -> None:
    if _state["installing"] or sys.platform != "win32":
        return
    _state["installing"] = True

    def run():
        exe = Path(sys.executable)
        python = exe.with_name("python.exe") if exe.name.lower() == "pythonw.exe" else exe
        try:
            subprocess.run([str(python), "-m", "pip", "install", "-q", "pycaw"], check=True, capture_output=True,
                           timeout=300, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            log.info("통화 프로그램 소리 확인(pycaw)을 설치했어요")
        except Exception as exc:  # noqa: BLE001
            log.info("pycaw 설치 실패 (통화 중에도 PC 소리를 계속 들음): %r", exc)
            _state["ok"] = False

    threading.Thread(target=run, daemon=True, name="pycaw-install").start()


def sounding_apps() -> dict[str, float] | None:
    """지금 소리를 내는 통화 프로그램 {이름: 소리 크기}. 확인할 수 없으면 None (Windows·pycaw 필요)."""
    if sys.platform != "win32" or _state["ok"] is False:
        return None
    try:
        from pycaw.pycaw import AudioUtilities  # noqa: PLC0415
    except ImportError:
        _install_later()
        return None
    try:
        from pycaw.pycaw import IAudioMeterInformation  # noqa: PLC0415
    except ImportError:
        IAudioMeterInformation = None  # noqa: N806
    out: dict[str, float] = {}
    for s in AudioUtilities.GetAllSessions():
        try:
            proc = s.Process
            name = VOICE_APPS.get(proc.name().lower()) if proc else None
            if not name:
                continue
            if IAudioMeterInformation is not None:
                peak = float(s._ctl.QueryInterface(IAudioMeterInformation).GetPeakValue())
            else:
                peak = 1.0 if getattr(s, "State", 0) == 1 else 0.0  # 소리 크기를 못 보면 '켜진 소리 줄'로
            out[name] = max(out.get(name, 0.0), peak)
        except Exception:  # noqa: BLE001 - 세션 하나가 이상해도 나머지는 본다
            continue
    return out


class CallWatch:
    """통화 중인지 (소리가 난 지 HOLD 초 안). 1초에 한 번만 실제로 확인한다."""

    def __init__(self, probe: Callable[[], dict[str, float] | None] = sounding_apps,
                 clock: Callable[[], float] = time.monotonic):
        self.probe, self.clock = probe, clock
        self._checked = -1e9
        self._last: dict[str, float] = {}  # 이름 → 마지막으로 소리가 난 시각
        self.failed = False

    def reason(self) -> str:
        """통화 중이면 '디스코드 통화 중' 같은 이유, 아니면 빈 글."""
        now = self.clock()
        if now - self._checked >= 1.0:
            self._checked = now
            try:
                apps = self.probe()
            except Exception as exc:  # noqa: BLE001
                if not self.failed:
                    log.info("통화 프로그램 소리 확인 실패: %r", exc)
                self.failed = True
                apps = None
            for name, peak in (apps or {}).items():
                if peak > PEAK:
                    self._last[name] = now
        live = [n for n, t in self._last.items() if now - t <= HOLD]
        return f"{live[0]} 통화 중" if live else ""
