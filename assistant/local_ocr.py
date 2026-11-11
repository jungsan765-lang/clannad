"""이 PC 의 Windows 글자 인식 (공짜, 인터넷으로 아무것도 보내지 않음).

Windows 10·11 에 들어 있는 글자 인식(Windows.Media.Ocr)을 winocr 로 부른다. 한국어 Windows 면 한국어 인식이 이미 있다.
자막·대화창·이름표처럼 '글자만 읽으면 되는 것'은 AI 대신 이걸로 읽어서 돈을 아낀다.
처음 쓸 때 winocr 가 없으면 뒤에서 한 번 조용히 설치해 보고, 안 되면(다른 OS·설치 실패·한국어 인식 없음) 그냥 AI 로 읽는다.
"""

from __future__ import annotations

import logging
import re
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


def read_windows(img, lang: str = "ko") -> str | None:
    """Windows 글자 인식. 못 쓰면 None, 글자가 없으면 빈 문자열."""
    if not available():
        return None
    try:
        winocr = _import()
        with _lock:
            result = winocr.recognize_pil_sync(img.convert("RGBA"), lang)
        text = result.get("text", "") if isinstance(result, dict) else getattr(result, "text", "")
        _state["fails"] = 0
        return " ".join(str(text or "").split())
    except Exception as exc:  # noqa: BLE001 - 한국어 인식이 없거나 실패: 몇 번 이어지면 끄고 다른 걸로
        _state["fails"] += 1
        if _state["fails"] in (1, 3):
            log.warning("이 PC 글자 인식 실패 (%d번째): %r", _state["fails"], exc)
        if _state["fails"] >= 3:
            _state["ok"] = False
        return None


# ---------------------------------------------------------------- 정밀 글자 인식 (PaddleOCR 한국어 모델, RapidOCR 로 가볍게)

_paddle = {"engine": None, "ok": None, "installing": False, "lock": threading.Lock()}
paddle_enabled = True  # 설정 '정밀 글자 인식'


def _paddle_engine():
    """PaddleOCR 의 한국어 모델(PP-OCRv5 korean mobile, 약 13MB)을 onnxruntime 으로 (paddlepaddle 없이, 메모리 약 200MB).
    글자 줄은 이미 잘라서 주니 '글자 찾기'는 안 쓰고 '읽기'만 한다 (한 줄에 수십 ms)."""
    if not paddle_enabled or _paddle["ok"] is False:
        return None
    if _paddle["engine"] is None:
        try:
            from rapidocr import LangRec, ModelType, OCRVersion, RapidOCR  # noqa: PLC0415
        except ImportError:
            if sys.platform == "win32":  # 주인님 PC 에서만 알아서 설치 (다른 곳에선 그냥 안 씀)
                _install_paddle_later()
            else:
                _paddle["ok"] = False
            return None
        try:
            _paddle["engine"] = RapidOCR(params={"Rec.lang_type": LangRec.KOREAN, "Rec.ocr_version": OCRVersion.PPOCRV5,
                                                 "Rec.model_type": ModelType.MOBILE, "Global.log_level": "error"})
            _paddle["ok"] = True
        except Exception as exc:  # noqa: BLE001
            log.info("정밀 글자 인식을 못 씀: %r", exc)
            _paddle["ok"] = False
            return None
    return _paddle["engine"]


def _install_paddle_later() -> None:
    if _paddle["installing"]:
        return
    _paddle["installing"] = True

    def run():
        exe = Path(sys.executable)
        python = exe.with_name("python.exe") if exe.name.lower() == "pythonw.exe" else exe
        try:
            subprocess.run([str(python), "-m", "pip", "install", "-q", "rapidocr"], check=True, capture_output=True,
                           timeout=600, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            log.info("정밀 글자 인식(rapidocr)을 설치했어요")
        except Exception as exc:  # noqa: BLE001
            log.info("정밀 글자 인식 설치 실패: %r", exc)
            _paddle["ok"] = False

    threading.Thread(target=run, daemon=True, name="paddle-install").start()


def warm_up() -> None:
    """프로그램을 켤 때 뒤에서 미리 준비 (처음 쓸 때 설치·모델 받기로 화면 찍기가 멈추지 않게)."""
    if paddle_enabled:
        threading.Thread(target=_paddle_engine, daemon=True, name="paddle-warm").start()


def split_lines(img) -> list:
    """여러 줄짜리 자리(대화창·퀘스트 안내)를 글자 줄마다 잘라 낸다 (획이 있는 가로줄 띠)."""
    import numpy as np  # noqa: PLC0415

    from watch.sampler import text_mask  # noqa: PLC0415

    mask = text_mask(img)
    rows = mask.mean(axis=1) > 0.004
    bands, start = [], None
    for y, on in enumerate(list(rows) + [False]):
        if on and start is None:
            start = y
        elif not on and start is not None:
            if y - start >= 6:
                if bands and start - bands[-1][1] <= 3:
                    bands[-1] = (bands[-1][0], y)
                else:
                    bands.append((start, y))
            start = None
    if len(bands) <= 1:
        return [img]
    h = img.height
    return [img.crop((0, max(0, a - 5), img.width, min(h, b + 5))) for a, b in bands if np.any(rows[a:b])]


def read_paddle(img) -> str | None:
    """정밀 글자 인식. 못 쓰면 None."""
    engine = _paddle_engine()
    if engine is None:
        return None
    import numpy as np  # noqa: PLC0415

    out = []
    try:
        with _paddle["lock"]:
            for line in split_lines(img.convert("RGB")):
                res = engine(np.asarray(line), use_det=False, use_cls=False, use_rec=True)
                txts = getattr(res, "txts", None) or ()
                out.append(" ".join(str(t) for t in txts))
    except Exception as exc:  # noqa: BLE001
        log.debug("정밀 글자 인식 실패: %r", exc)
        return None
    return " ".join(" ".join(out).split())


def quality(text: str) -> float:
    """글자가 제대로 읽혔을 법한 정도 (0~1): 완성된 한글·영숫자는 +, 낱자모(ㄱ·ㅏ)·이상한 기호는 −."""
    t = re.sub(r"\s", "", text or "")
    if not t:
        return 0.0
    syll = len(re.findall(r"[가-힣]", t))
    alnum = len(re.findall(r"[A-Za-z0-9]", t))
    jamo = len(re.findall(r"[ㄱ-ㅎㅏ-ㅣ]", t))
    odd = len(re.findall(r"[^가-힣A-Za-z0-9.,:;!?'\"()\[\]\-~/%+·…<>]", t))
    return max(0.0, min(1.0, (syll + 0.6 * alnum - 2 * jamo - odd) / len(t)))


def read_text(img, lang: str = "ko") -> str | None:
    """그림 속 글자. 못 쓰면 None (그때는 AI 가 읽는다), 글자가 없으면 빈 문자열.
    Windows 글자 인식을 먼저 쓰고, 비었거나 깨져 보이면 정밀 글자 인식(PaddleOCR 한국어 모델)으로 다시 읽어 더 나은 쪽을 쓴다."""
    win = read_windows(img, lang)
    if win and quality(win) >= 0.6:
        return win
    pad = read_paddle(img)
    if pad is None:
        return win
    if not win:
        return pad if quality(pad) >= 0.3 else ("" if win == "" else None)
    return pad if quality(pad) > quality(win) else win
