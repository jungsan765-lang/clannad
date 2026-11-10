"""말소리 → 글자 (faster-whisper, 내 PC에서 처리. 음성은 밖으로 나가지 않는다)."""

from __future__ import annotations

import logging
import re
import threading

import numpy as np

log = logging.getLogger("assistant.voice")

# 조용하거나 잡음뿐일 때 Whisper 가 흔히 지어내는 문장들
HALLUCINATIONS = [
    "시청해 주셔서 감사합니다", "시청해주셔서 감사합니다", "구독과 좋아요", "구독 좋아요", "다음 영상에서 만나요",
    "MBC 뉴스", "KBS 뉴스", "SBS 뉴스", "자막 제공", "자막 by",
]


def clean_text(text: str) -> str:
    t = re.sub(r"\s+", " ", text).strip()
    if not t:
        return ""
    for h in HALLUCINATIONS:
        if t.replace(" ", "") == h.replace(" ", "") or (len(t) < 30 and h.replace(" ", "") in t.replace(" ", "")):
            return ""
    if not re.search(r"[가-힣A-Za-z0-9]", t):
        return ""
    return t


def apply_wake_word(text: str, wake_word: str) -> str | None:
    """호출어가 정해져 있으면 그 말이 들어간 문장만 받는다. 앞에 붙은 호출어는 떼어낸다."""
    if not wake_word:
        return text
    if wake_word not in text:
        return None
    stripped = re.sub(rf"^\s*{re.escape(wake_word)}\s*(야|아|님)?[\s,.!?~]*", "", text).strip()
    return stripped or text


class Transcriber:
    def __init__(self, model: str = "small", device: str = "cpu", compute_type: str | None = None,
                 download_root: str | None = None):
        self.model_name = model
        self.device = device
        self.compute_type = compute_type or ("int8" if device == "cpu" else "float16")
        self.download_root = download_root
        self._model = None
        self._lock = threading.Lock()

    def _load(self):
        if self._model is None:
            from faster_whisper import WhisperModel

            log.info("Whisper 모델 불러오는 중: %s (%s) — 처음엔 다운로드로 시간이 걸려요", self.model_name, self.device)
            self._model = WhisperModel(self.model_name, device=self.device, compute_type=self.compute_type,
                                       download_root=self.download_root)
        return self._model

    def preload(self) -> None:
        with self._lock:
            self._load()

    def transcribe(self, audio: np.ndarray) -> str:
        if audio.size < 16000 * 0.3:
            return ""
        with self._lock:
            model = self._load()
            segments, _ = model.transcribe(audio.astype(np.float32), language="ko", beam_size=1,
                                           vad_filter=True, condition_on_previous_text=False)
            text = "".join(s.text for s in segments)
        return clean_text(text)
