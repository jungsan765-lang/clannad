"""이 PC 의 Windows 글자 인식 (공짜, 인터넷으로 아무것도 보내지 않음).

Windows 10·11 에 들어 있는 글자 인식(Windows.Media.Ocr)을 winocr 로 부른다. 한국어 Windows 면 한국어 인식이 이미 있다.
자막·대화창·이름표처럼 '글자만 읽으면 되는 것'은 AI 대신 이걸로 읽어서 돈을 아낀다.
처음 쓸 때 winocr 가 없으면 뒤에서 한 번 조용히 설치해 보고, 안 되면(다른 OS·설치 실패·한국어 인식 없음) 그냥 AI 로 읽는다.
"""

from __future__ import annotations

import logging
import subprocess
import sys
import threading
from pathlib import Path

log = logging.getLogger("assistant.ocr")

_lock = threading.Lock()  # Windows 글자 인식은 한 번에 하나씩
_state = {"ok": None, "fails": 0, "installing": False}


def _import():
    import winocr  # noqa: PLC0415 - Windows 에서만, 있을 때만

    return winocr


def available() -> bool:
    if sys.platform != "win32":
        return False
    if _state["ok"] is None:
        try:
            _import()
            _state["ok"] = True
        except Exception:  # noqa: BLE001 - 없으면 설치를 시도하고 그동안은 AI 로
            _state["ok"] = False
            _install_later()
    return bool(_state["ok"])


def _install_later() -> None:
    """뒤에서 한 번만 winocr 설치 (업데이트 설치 목록에 넣으면 실패할 때 업데이트 전체가 실패로 보여서 따로)."""
    if _state["installing"]:
        return
    _state["installing"] = True

    def run():
        exe = Path(sys.executable)
        python = exe.with_name("python.exe") if exe.name.lower() == "pythonw.exe" else exe
        try:
            subprocess.run([str(python), "-m", "pip", "install", "-q", "winocr"], check=True, capture_output=True,
                           timeout=300, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            _import()
            _state["ok"] = True
            log.info("이 PC 글자 인식(winocr)을 설치했어요")
        except Exception as exc:  # noqa: BLE001
            log.info("이 PC 글자 인식을 못 씀 (AI 로 읽음): %r", exc)

    threading.Thread(target=run, daemon=True, name="ocr-install").start()


def read_text(img, lang: str = "ko") -> str | None:
    """그림 속 글자. 못 쓰면 None (그때는 AI 가 읽는다), 글자가 없으면 빈 문자열."""
    if not available():
        return None
    try:
        winocr = _import()
        with _lock:
            result = winocr.recognize_pil_sync(img.convert("RGBA"), lang)
        text = result.get("text", "") if isinstance(result, dict) else getattr(result, "text", "")
        _state["fails"] = 0
        return " ".join(str(text or "").split())
    except Exception as exc:  # noqa: BLE001 - 한국어 인식이 없거나 실패: 몇 번 이어지면 끄고 AI 로
        _state["fails"] += 1
        if _state["fails"] in (1, 3):
            log.warning("이 PC 글자 인식 실패 (%d번째): %r", _state["fails"], exc)
        if _state["fails"] >= 3:
            _state["ok"] = False
        return None
