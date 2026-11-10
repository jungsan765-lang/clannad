"""마이크 소리에서 '말하는 구간'만 잘라낸다 (소리 크기 기준, 주변 소음에 맞춰 자동 조절)."""

from __future__ import annotations

from collections import deque

import numpy as np

RATE = 16000


def level_db(frame: np.ndarray) -> float:
    rms = float(np.sqrt(np.mean(np.square(frame), dtype=np.float64))) if frame.size else 0.0
    return 20 * np.log10(max(rms, 1e-6))


class Segmenter:
    """30ms 단위로 소리를 넣으면, 말이 끝난 구간을 돌려준다.

    - auto(항상 듣기): 소리가 커지면 시작, 조용해지면 끝.
    - 수동(버튼): start() 로 시작, 말이 끝나고 조용해지거나 stop() 하면 끝.
    """

    def __init__(self, frame_ms: int = 30, start_ms: int = 150, end_silence_ms: int = 800,
                 max_seconds: float = 15.0, pre_roll_ms: int = 300, min_db: float = -45.0, margin_db: float = 12.0):
        self.frame_ms = frame_ms
        self.start_frames = max(1, start_ms // frame_ms)
        self.end_frames = max(1, end_silence_ms // frame_ms)
        self.max_frames = int(max_seconds * 1000 / frame_ms)
        self.pre = deque(maxlen=max(1, pre_roll_ms // frame_ms))
        self.min_db = min_db
        self.margin_db = margin_db
        self.noise_db = -60.0
        self.auto = True
        self.armed = False  # 수동 모드에서 버튼을 눌러 듣는 중
        self.active = False
        self.buf: list[np.ndarray] = []
        self.loud_run = 0
        self.quiet_run = 0
        self.heard_speech = False

    def is_speech(self, db: float) -> bool:
        return db > max(self.min_db, self.noise_db + self.margin_db)

    def start(self) -> None:
        """버튼 눌러 듣기 시작 (이미 하던 말이 있으면 바로 앞부분부터)."""
        self.armed = True
        self.active = True
        self.buf = list(self.pre)
        self.quiet_run = 0
        self.heard_speech = False

    def stop(self) -> np.ndarray | None:
        """버튼으로 끝내기. 말소리가 있었으면 그 구간을 돌려준다."""
        seg = self._finish() if self.active and self.heard_speech else None
        self.active = self.armed = False
        self.buf = []
        return seg

    def _finish(self) -> np.ndarray:
        seg = np.concatenate(self.buf) if self.buf else np.zeros(0, np.float32)
        self.buf = []
        self.active = False
        self.armed = False
        self.loud_run = self.quiet_run = 0
        self.heard_speech = False
        return seg

    def feed(self, frame: np.ndarray) -> list[np.ndarray]:
        out: list[np.ndarray] = []
        db = level_db(frame)
        speech = self.is_speech(db)
        if not speech:  # 조용할 때 주변 소음 수준을 천천히 따라감
            self.noise_db = 0.95 * self.noise_db + 0.05 * db if db > -90 else self.noise_db
        if not self.active:
            self.pre.append(frame)
            if self.auto:
                self.loud_run = self.loud_run + 1 if speech else 0
                if self.loud_run >= self.start_frames:
                    self.active = True
                    self.heard_speech = True
                    self.buf = list(self.pre)
                    self.quiet_run = 0
            return out
        self.buf.append(frame)
        if speech:
            self.heard_speech = True
            self.quiet_run = 0
        else:
            self.quiet_run += 1
        too_long = len(self.buf) >= self.max_frames
        ended = self.heard_speech and self.quiet_run >= self.end_frames
        # 버튼으로 시작했는데 한참 아무 말도 없으면 그냥 끝냄 (5초)
        gave_up = self.armed and not self.heard_speech and len(self.buf) * self.frame_ms >= 5000
        if too_long or ended:
            out.append(self._finish())
        elif gave_up:
            self._finish()
        return out
