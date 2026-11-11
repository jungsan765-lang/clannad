"""촘촘히 보기: 화면을 0.5초마다 이 PC 에서 찍어 최근 몇 초를 작은 사진으로 들고 있는다 (비용 없음).

판단할 때(5초마다) 그 사이 장면들을 한 장에 모아 같이 보내서, '방금 피했다·맞았다·죽었다' 같은 흐름을 놓치지 않게 한다.
전용 스레드에서 찍고, 꺼져 있을 때(active=False)는 쉬기만 한다.
"""

from __future__ import annotations

import logging
import threading
import time
from collections import deque
from dataclasses import dataclass
from typing import Callable

from PIL import Image

from . import capture as cap

log = logging.getLogger("assistant.watch")


@dataclass
class Frame:
    t: float
    jpeg: bytes  # 작은 사진 (모아 보기용)
    thumb: object  # 변화 비교용


class FrameSampler:
    def __init__(self, grab: Callable[[], Image.Image], interval: float = 0.5, keep_seconds: float = 15.0,
                 width: int = 480, clock: Callable[[], float] = time.monotonic, spike: float = 0.12):
        self.grab = grab
        self.interval = interval
        self.keep_seconds = keep_seconds
        self.width = width
        self.clock = clock
        self.active = False
        self._frames: deque[Frame] = deque()
        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self.errors = 0
        self.spike = spike  # 0.5초 사이에 이만큼 확 바뀌면 '무슨 일이 났다' (죽음·폭발·장면 전환)
        self.spike_at: float | None = None  # 마지막으로 확 바뀐 때

    # ------------------------------------------------------------ 켜고 끄기

    def set_active(self, on: bool) -> None:
        if on == self.active:
            return
        self.active = on
        if on and self._thread is None:
            self._thread = threading.Thread(target=self._loop, daemon=True, name="screen-sampler")
            self._thread.start()
        if not on:
            with self._lock:
                self._frames.clear()

    def stop(self) -> None:
        self.active = False
        self._stop.set()

    def _loop(self) -> None:
        while not self._stop.is_set():
            started = time.monotonic()
            if self.active:
                try:
                    self.capture_once()
                except Exception as exc:  # noqa: BLE001 - 한 번 못 찍어도 계속
                    self.errors += 1
                    if self.errors in (1, 10, 100):
                        log.warning("촘촘히 보기 캡처 실패 (%d번째): %r", self.errors, exc)
            self._stop.wait(max(0.05, self.interval - (time.monotonic() - started)))

    # ------------------------------------------------------------ 찍기·꺼내기

    def capture_once(self) -> Frame:
        img = self.grab()
        small = cap.shrink(img, self.width)
        frame = Frame(self.clock(), cap.to_jpeg(small, 70), cap.thumb(small))
        with self._lock:
            if self._frames and cap.change_amount(self._frames[-1].thumb, frame.thumb) >= self.spike:
                self.spike_at = frame.t
            self._frames.append(frame)
            while self._frames and frame.t - self._frames[0].t > self.keep_seconds:
                self._frames.popleft()
        return frame

    def recent(self, seconds: float) -> list[Frame]:
        now = self.clock()
        with self._lock:
            return [f for f in self._frames if now - f.t <= seconds]

    def motion(self, frames: list[Frame]) -> float:
        """그 사이 가장 크게 바뀐 정도 (장면 안 움직임)."""
        best = 0.0
        for a, b in zip(frames, frames[1:]):
            best = max(best, cap.change_amount(a.thumb, b.thumb))
        return best

    def ordered(self, frames: list[Frame], max_frames: int = 10) -> list[tuple[str, bytes]]:
        """AI 에게 보낼 순서 있는 장면들: '(1/10) 4.5초 전' … (오래된 것부터). 한 장에 붙이면 순서를 헷갈려서 따로 보낸다."""
        if len(frames) > max_frames:
            step = len(frames) / max_frames
            frames = [frames[int(i * step)] for i in range(max_frames - 1)] + [frames[-1]]
        now = self.clock()
        n = len(frames)
        return [(f"({i}/{n}) {now - f.t:.1f}초 전", f.jpeg) for i, f in enumerate(frames, 1)]

    def sheet(self, frames: list[Frame], cols: int = 4, cell_width: int = 480) -> bytes | None:
        """모아 보기 한 장 (왼쪽 위부터 시간 순, 칸 아래 '-4.5s')."""
        if len(frames) < 2:
            return None
        now = self.clock()
        return cap.contact_sheet([(f.jpeg, f"-{now - f.t:.1f}s") for f in frames], cols=cols, cell_width=cell_width)
