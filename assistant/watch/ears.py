"""게임 소리 듣기: 스피커로 나가는 소리를 이 PC 에서 받아(loopback) 대사를 글로 바꾼다 (돈 안 듦, 소리는 밖으로 안 나감).

- 게임 중(촘촘히 보는 동안)에만 듣는다. 다니카가 소리 내서 말하는 동안은 안 듣는다(제 목소리를 대사로 듣지 않게).
- 1초마다 최근 소리에서 사람 목소리 구간(Silero VAD)을 찾아, 끝난 구간만 faster-whisper 로 받아쓴다 (언어는 알아서).
  15초 넘게 이어지는 말은 끊어서 받아쓴다. 배경 음악·효과음만 있는 구간은 건너뛴다.
- 새 대사가 들리면 alert_at 을 찍어 판단을 바로 하게 하고, 판단·말하기·맥락 담당에게 '들린 대사'로 붙인다.
- 갑자기 큰 소리(폭발 등)는 '큰 소리'로만 적는다 (판단을 부르지는 않음).
- 스피커로 나오는 모든 소리라 디스코드 통화 소리도 같이 들린다. 설정에서 끌 수 있다.
"""

from __future__ import annotations

import logging
import queue
import subprocess
import sys
import threading
import time
from collections import deque
from pathlib import Path
from typing import Callable

import numpy as np

log = logging.getLogger("assistant.ears")

RATE = 16000


def _pip_install(package: str) -> bool:
    exe = Path(sys.executable)
    python = exe.with_name("python.exe") if exe.name.lower() == "pythonw.exe" else exe
    try:
        subprocess.run([str(python), "-m", "pip", "install", "-q", package], check=True, capture_output=True, timeout=300,
                       creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        return True
    except Exception as exc:  # noqa: BLE001
        log.info("%s 설치 실패: %r", package, exc)
        return False


def open_loopback():
    """기본 스피커로 나가는 소리를 받는다 → (읽기 함수(초) → 16kHz 모노, 닫기 함수). Windows 만, 못 하면 None."""
    if sys.platform != "win32":
        return None
    try:
        import soundcard as sc  # noqa: PLC0415
    except ImportError:
        if not _pip_install("soundcard"):
            return None
        import soundcard as sc  # noqa: PLC0415
    speaker = sc.default_speaker()
    mic = sc.get_microphone(id=str(speaker.name), include_loopback=True)
    rec = mic.recorder(samplerate=48000, channels=2, blocksize=4800)
    rec.__enter__()

    def read(seconds: float) -> np.ndarray:
        data = rec.record(numframes=int(48000 * seconds))
        mono = np.asarray(data, dtype=np.float32)
        mono = mono.mean(axis=1) if mono.ndim == 2 else mono
        n = len(mono) // 3 * 3
        return mono[:n].reshape(-1, 3).mean(axis=1).astype(np.float32)  # 48k → 16k

    def close() -> None:
        try:
            rec.__exit__(None, None, None)
        except Exception:  # noqa: BLE001
            pass

    log.info("게임 소리 듣기: %s", speaker.name)
    return read, close


def default_vad(audio: np.ndarray) -> list[tuple[float, float]]:
    from faster_whisper.vad import VadOptions, get_speech_timestamps  # noqa: PLC0415

    ts = get_speech_timestamps(audio.astype(np.float32), VadOptions(min_silence_duration_ms=500, speech_pad_ms=200))
    return [(d["start"] / RATE, d["end"] / RATE) for d in ts]


class Whisper:
    """게임 대사용 받아쓰기 (마이크와 따로, 언어는 알아서)."""

    def __init__(self, model: str = "medium", threads: int = 4):
        self.model_name, self.threads = model, threads
        self._model = None
        self._lock = threading.Lock()

    def __call__(self, audio: np.ndarray) -> str:
        from voice.stt import clean_text  # noqa: PLC0415

        with self._lock:
            if self._model is None:
                from faster_whisper import WhisperModel  # noqa: PLC0415

                log.info("게임 소리 받아쓰기 모델 불러오는 중: %s", self.model_name)
                self._model = WhisperModel(self.model_name, device="cpu", compute_type="int8", cpu_threads=self.threads)
            segments, _ = self._model.transcribe(audio.astype(np.float32), language=None, beam_size=1, vad_filter=False,
                                                 condition_on_previous_text=False)
            text = " ".join(s.text.strip() for s in segments if getattr(s, "no_speech_prob", 0) < 0.6)
        return clean_text(text)


class GameEars:
    def __init__(self, clock: Callable[[], float] = time.monotonic, active: Callable[[], bool] = lambda: False,
                 muted: Callable[[], bool] = lambda: False, transcribe: Callable[[np.ndarray], str] | None = None,
                 vad: Callable[[np.ndarray], list] | None = None, opener: Callable | None = None):
        self.clock = clock
        self.active = active  # 지금 들어야 하나 (게임을 촘촘히 보는 중)
        self.muted = muted  # 다니카가 소리 내서 말하는 중
        self.transcribe = transcribe or Whisper()
        self.vad = vad or default_vad
        self.opener = opener or open_loopback
        self.enabled = True
        self.state = "off"  # off · no_audio · listening
        self.events: deque[tuple[float, str, str]] = deque(maxlen=40)  # (시각, '소리', 글)
        self.alert_at: float | None = None
        self.heard = 0
        self._buf = np.zeros(0, dtype=np.float32)
        self._buf_t0 = 0.0  # 버퍼 첫 소리의 시각
        self._done_until: float | None = None  # 여기까지는 받아썼음
        self._last_scan: float | None = None
        self._loud: deque[float] = deque(maxlen=60)
        self._last_loud = -1e9
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.sync = False  # 시험용: 받아쓰기를 바로 (보통은 뒤 스레드에서 — 받아쓰는 동안에도 소리는 계속 받게)
        self._jobs: queue.Queue = queue.Queue(maxsize=6)
        self._worker: threading.Thread | None = None

    def status_text(self) -> str:
        if not self.enabled:
            return "꺼짐"
        return {"off": "게임 중에만 들어요", "no_audio": "스피커 소리를 못 받아요 (Windows 에서만 돼요)",
                "listening": f"듣는 중 — 지금까지 대사 {self.heard}번 받아씀"}.get(self.state, self.state)

    # ------------------------------------------------------------ 소리 넣기 (0.5초씩)

    def feed(self, block: np.ndarray, t_end: float) -> None:
        if self.muted():
            block = np.zeros_like(block)  # 다니카 목소리는 듣지 않는다 (시간은 그대로 흘러가게)
        elif block.size:
            self._loudness(block, t_end)
        if not self._buf.size:
            self._buf_t0 = t_end - block.size / RATE
        self._buf = np.concatenate([self._buf, block.astype(np.float32)])
        extra = self._buf.size - 30 * RATE
        if extra > 0:  # 30초까지만
            self._buf = self._buf[extra:]
            self._buf_t0 += extra / RATE
        if self._last_scan is None or t_end - self._last_scan >= 1.0:
            self._last_scan = t_end
            self._find_speech()

    def _loudness(self, block: np.ndarray, t: float) -> None:
        rms = float(np.sqrt(np.mean(block.astype(np.float64) ** 2)))
        if len(self._loud) >= 10:
            base = float(np.median(self._loud))
            if rms > max(0.08, base * 4) and t - self._last_loud > 5:
                self._last_loud = t
                self._event(t, "큰 소리 (폭발·충돌 등)", alert=False)
        self._loud.append(rms)

    def _find_speech(self) -> None:
        start = 0
        if self._done_until is not None:
            start = max(0, int((self._done_until - self._buf_t0) * RATE))
        audio = self._buf[start:]
        if audio.size < RATE:
            return
        base_t = self._buf_t0 + start / RATE
        dur = audio.size / RATE
        try:
            segments = self.vad(audio)
        except Exception as exc:  # noqa: BLE001
            log.debug("목소리 구간 찾기 실패: %r", exc)
            return
        for s, e in segments:
            if e > dur - 0.8 and e - s < 15:
                break  # 아직 말하는 중 (끝나면 받아씀)
            chunk = audio[int(max(0.0, s - 0.2) * RATE): int(min(dur, e + 0.2) * RATE)]
            self._done_until = base_t + e
            if chunk.size >= RATE * 0.4:
                self._submit(chunk.copy(), base_t + e)

    def _submit(self, chunk: np.ndarray, t: float) -> None:
        if self.sync:
            self._write(chunk, t)
            return
        if self._worker is None:
            self._worker = threading.Thread(target=self._work, daemon=True, name="game-ears-stt")
            self._worker.start()
        try:
            self._jobs.put_nowait((chunk, t))
        except queue.Full:
            log.debug("게임 대사가 밀려서 하나 건너뜀")

    def _work(self) -> None:
        while True:
            chunk, t = self._jobs.get()
            self._write(chunk, t)

    def _write(self, chunk: np.ndarray, t: float) -> None:
        try:
            text = self.transcribe(chunk)
        except Exception as exc:  # noqa: BLE001
            log.warning("게임 소리 받아쓰기 실패: %r", exc)
            text = ""
        if text:
            self.heard += 1
            self._event(t, f"들린 대사: {text[:200]}", alert=True)

    def _event(self, t: float, text: str, alert: bool) -> None:
        with self._lock:
            self.events.append((t, "소리", text))
            if alert:
                self.alert_at = t

    def reset(self) -> None:
        self._buf = np.zeros(0, dtype=np.float32)
        self._done_until = None
        self._last_scan = None
        self._loud.clear()

    # ------------------------------------------------------------ 꺼내기

    def recent(self, seconds: float = 60.0, since: float | None = None) -> list[tuple[float, str, str]]:
        now = self.clock()
        with self._lock:
            return [(t, n, x) for t, n, x in self.events if now - t <= seconds and (since is None or t > since)]

    def text(self, seconds: float = 60.0) -> str:
        now = self.clock()
        items = self.recent(seconds)[-6:]
        if not items:
            return ""
        return ("[들린 소리 (이 PC 가 게임 소리를 받아쓴 것, 틀릴 수 있음)] "
                + " / ".join(f"{now - t:.0f}초 전 {x}" for t, _, x in items))

    # ------------------------------------------------------------ 뒤에서 계속

    def start(self) -> None:
        if self._thread is None:
            self._thread = threading.Thread(target=self._loop, daemon=True, name="game-ears")
            self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def _loop(self) -> None:
        if sys.platform == "win32":
            try:
                import ctypes

                ctypes.windll.ole32.CoInitializeEx(None, 0)  # 이 스레드에서 Windows 소리 장치를 쓰려면
            except Exception:  # noqa: BLE001
                pass
        stream = None
        while not self._stop.is_set():
            if not (self.enabled and self.active()):
                if stream:
                    stream[1]()
                    stream = None
                    self.reset()
                self.state = "off"
                self._stop.wait(1.0)
                continue
            if stream is None:
                try:
                    stream = self.opener()
                except Exception as exc:  # noqa: BLE001
                    log.warning("게임 소리를 못 받음: %r", exc)
                    stream = None
                if stream is None:
                    self.state = "no_audio"
                    self._stop.wait(60.0)
                    continue
                self.state = "listening"
            try:
                block = stream[0](0.5)
                self.feed(block, self.clock())
            except Exception as exc:  # noqa: BLE001 - 스피커가 바뀌었거나(헤드셋) 끊김 → 다시 연다
                log.info("게임 소리 다시 연결: %r", exc)
                stream[1]()
                stream = None
                self.reset()
                self._stop.wait(2.0)
