"""소리 내서 말하기: Windows 에 들어 있는 음성(SAPI)으로 다니카 대사를 읽는다. 이 PC 에서만, 비용 없음.

- 한국어 음성(예: Microsoft Heami)이 있으면 그걸 쓴다. 없으면 켜지지 않고 이유를 알려 준다.
- 실제 캐릭터 목소리를 흉내 내지 않는다 (일반 음성).
- 새 대사가 오면 읽던 것을 끊고 새 것을 읽는다. 전용 스레드에서만 음성 엔진을 쓴다.
"""

from __future__ import annotations

import logging
import queue
import re
import sys
import threading
from typing import Callable

log = logging.getLogger("assistant.tts")

_STRIP = re.compile(r"[\U0001F000-\U0001FFFF☀-➿⏰]|\([^)]*\)|\[[^\]]*\]|[*_#>~]")


def clean_for_speech(text: str) -> str:
    """이모지·괄호 속 설명·마크다운 기호는 읽지 않는다."""
    return re.sub(r"\s+", " ", _STRIP.sub(" ", text or "")).strip()


class Speaker:
    def __init__(self, rate: int = 0, volume: int = 80, on_state: Callable[[bool], None] | None = None):
        self.rate = max(-10, min(10, rate))
        self.volume = max(0, min(100, volume))
        self.on_state = on_state  # 말하기 시작(True)/끝(False). 뒤 스레드에서 불린다
        self.available: bool | None = None  # None = 아직 모름
        self.problem = ""
        self.voice_name = ""
        self._q: queue.Queue = queue.Queue()
        self._thread: threading.Thread | None = None

    def speak(self, text: str) -> None:
        text = clean_for_speech(text)
        if not text or text in ("……", "...") or self.available is False:
            return
        if self._thread is None:
            self._thread = threading.Thread(target=self._loop, daemon=True, name="tts")
            self._thread.start()
        self._q.put(text)

    def stop(self) -> None:
        self._q.put(None)

    def _loop(self) -> None:
        if sys.platform != "win32":
            self.available, self.problem = False, "Windows 에서만 됩니다."
            return
        try:
            import comtypes
            import comtypes.client

            comtypes.CoInitialize()
            voice = comtypes.client.CreateObject("SAPI.SpVoice")
            for token in voice.GetVoices():
                desc = token.GetDescription()
                if any(k in desc for k in ("Korean", "한국어", "Heami", "SunHi", "InJoon")):
                    voice.Voice = token
                    self.voice_name = desc
                    break
            else:
                self.available, self.problem = False, ("한국어 음성이 없어요. Windows 설정 > 시간 및 언어 > 음성 에서 "
                                                       "한국어 음성을 추가해 주세요.")
                log.warning("TTS: %s", self.problem)
                return
        except Exception as exc:  # noqa: BLE001
            self.available, self.problem = False, f"음성 엔진을 켜지 못했어요: {exc}"
            log.warning("TTS 시작 실패: %r", exc)
            return
        self.available = True
        log.info("TTS 음성: %s", self.voice_name)
        while True:
            text = self._q.get()
            if text is None:
                return
            while not self._q.empty():  # 밀린 게 있으면 가장 최근 것만
                nxt = self._q.get()
                if nxt is None:
                    return
                text = nxt
            try:
                voice.Rate, voice.Volume = self.rate, self.volume
                if self.on_state:
                    self.on_state(True)
                voice.Speak(text, 1 | 2)  # 비동기 + 읽던 것 끊기
                while not voice.WaitUntilDone(200):
                    if not self._q.empty():
                        break
            except Exception as exc:  # noqa: BLE001
                log.warning("TTS 실패: %r", exc)
            finally:
                if self.on_state and self._q.empty():
                    self.on_state(False)
