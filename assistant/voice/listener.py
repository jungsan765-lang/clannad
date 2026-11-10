"""마이크 듣기. 모드: always(항상 듣기) | push(단축키·메뉴로 그때만 듣기) | off(듣지 않기)."""

from __future__ import annotations

import logging
import queue
import threading

import numpy as np
from PySide6.QtCore import QObject, Signal

from .segmenter import RATE, Segmenter
from .stt import Transcriber, apply_wake_word

log = logging.getLogger("assistant.voice")
MODES = ("always", "push", "off")
FRAME = RATE * 30 // 1000  # 30ms


class VoiceListener(QObject):
    heard = Signal(str)  # 글자로 바뀐 말 (호출어 처리 후)
    state = Signal(str)  # "listening" | "idle" | "off"
    error = Signal(str)

    def __init__(self, transcriber: Transcriber, wake_word: str = "", segmenter: Segmenter | None = None):
        super().__init__()
        self.transcriber = transcriber
        self.wake_word = wake_word
        self.seg = segmenter or Segmenter()
        self.mode = "off"
        self.stream = None
        self.frames: queue.Queue = queue.Queue(maxsize=500)
        self.segments: queue.Queue = queue.Queue(maxsize=10)
        self._stop = threading.Event()
        self._threads: list[threading.Thread] = []
        self.paused = False  # 답을 기다리는 중 등 잠시 무시

    # ------------------------------------------------------------ 모드

    def set_mode(self, mode: str) -> None:
        if mode not in MODES:
            mode = "off"
        if mode == self.mode:
            return
        self.mode = mode
        self.seg.auto = mode == "always"
        if mode == "off":
            self._close_stream()
            self.state.emit("off")
        elif mode == "always":
            self._open_stream()
            self.state.emit("idle")
        else:  # push: 버튼을 누를 때만 마이크를 연다
            self._close_stream()
            self.state.emit("idle")

    def push(self) -> None:
        """단축키·메뉴: 듣기 시작 / 듣는 중이면 끝내기."""
        if self.mode != "push":
            return
        if self.seg.armed:
            seg = self.seg.stop()
            self._close_stream()
            self.state.emit("idle")
            if seg is not None:
                self._queue_segment(seg)
            return
        if self._open_stream():
            self.seg.start()
            self.state.emit("listening")

    # ------------------------------------------------------------ 마이크

    def _open_stream(self) -> bool:
        if self.stream is not None:
            return True
        try:
            import sounddevice as sd

            self.stream = sd.InputStream(samplerate=RATE, channels=1, dtype="float32", blocksize=FRAME,
                                         callback=self._on_audio)
            self.stream.start()
        except Exception as exc:  # noqa: BLE001 - 마이크가 없거나 라이브러리가 없을 때
            self.stream = None
            self.error.emit(f"마이크를 열 수 없어요: {exc}")
            return False
        self._ensure_threads()
        return True

    def _close_stream(self) -> None:
        if self.stream is not None:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception:  # noqa: BLE001
                pass
            self.stream = None

    def _on_audio(self, indata, frames, time_info, status) -> None:  # 오디오 스레드
        try:
            self.frames.put_nowait(indata[:, 0].copy())
        except queue.Full:
            pass

    # ------------------------------------------------------------ 처리 스레드

    def _ensure_threads(self) -> None:
        if self._threads:
            return
        for target in (self._segment_loop, self._transcribe_loop):
            t = threading.Thread(target=target, daemon=True)
            t.start()
            self._threads.append(t)

    def feed(self, frame: np.ndarray) -> None:
        """소리 한 조각 처리 (테스트에서도 직접 부른다)."""
        was_armed = self.seg.armed
        for seg in self.seg.feed(frame):
            self._queue_segment(seg)
        if was_armed and not self.seg.armed and self.mode == "push":
            self._close_stream()
            self.state.emit("idle")

    def _segment_loop(self) -> None:
        while not self._stop.is_set():
            try:
                frame = self.frames.get(timeout=0.2)
            except queue.Empty:
                continue
            self.feed(frame)

    def _queue_segment(self, seg: np.ndarray) -> None:
        if self.paused:
            return
        try:
            self.segments.put_nowait(seg)
        except queue.Full:
            log.warning("말이 너무 빨리 쌓여서 하나 버림")

    def handle_segment(self, seg: np.ndarray) -> None:
        text = self.transcriber.transcribe(seg)
        if not text:
            return
        text = apply_wake_word(text, self.wake_word)
        if text:
            self.heard.emit(text)

    def _transcribe_loop(self) -> None:
        while not self._stop.is_set():
            try:
                seg = self.segments.get(timeout=0.2)
            except queue.Empty:
                continue
            try:
                self.handle_segment(seg)
            except Exception as exc:  # noqa: BLE001
                log.exception("음성 인식 실패")
                self.error.emit(f"음성 인식 실패: {exc}")

    def shutdown(self) -> None:
        self._stop.set()
        self._close_stream()
