"""정해진 간격마다 모니터 하나를 보고, 말 걸 만하면 캐릭터가 한마디 하게 한다.

흐름: 캡처(내 PC) → 화면이 그대로면 건너뜀(비용 0) → 싼 모델(Haiku)이 말 걸지 판단
      → 말하기로 했을 때만 캐릭터 모델(Opus)이 화면을 보고 캐릭터 말투로 한마디.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Callable

from PIL import Image
from PySide6.QtCore import QObject, QTimer, Signal

from . import capture as cap
from .windows import foreground_window

log = logging.getLogger("assistant.watch")


@dataclass
class WatchConfig:
    interval_seconds: float = 30.0
    monitor: str = "left"
    judge_model: str = "claude-haiku-5-5"
    line_model: str = "claude-opus-5-5"
    cooldown_seconds: float = 120.0
    change_threshold: float = 0.015
    max_width: int = 1024
    jpeg_quality: int = 70


@dataclass
class Shot:
    jpeg: bytes
    thumb: object
    title: str


def default_grabber(cfg: WatchConfig) -> Callable[[], tuple[Image.Image, str]]:
    def grab() -> tuple[Image.Image, str]:
        monitor = cap.pick_monitor(cap.list_monitors(), cfg.monitor)
        if monitor is None:
            raise RuntimeError("모니터를 찾지 못했어요.")
        win = foreground_window()
        title = f"{win.title} [{win.process}]" if win else ""
        return cap.grab(monitor), title
    return grab


class ScreenWatcher(QObject):
    """run_job(fn, on_done, on_fail) 로 무거운 일을 뒤에서 돌린다 (앱의 작업 실행기를 받음)."""

    spoke = Signal(object)  # companion.Reply
    nothing = Signal()  # 확인했지만 할 말이 없었음
    status = Signal(str)

    def __init__(self, companion, cfg: WatchConfig, run_job: Callable, *,
                 can_run: Callable[[], bool] = lambda: True,
                 grabber: Callable[[], tuple[Image.Image, str]] | None = None,
                 clock: Callable[[], float] = time.monotonic):
        super().__init__()
        self.companion = companion
        self.cfg = cfg
        self.run_job = run_job
        self.can_run = can_run
        self.grabber = grabber or default_grabber(cfg)
        self.clock = clock
        self.last_thumb = None
        self.last_spoke: float | None = None
        self.running_job = False
        self.stats = {"ticks": 0, "skipped_same": 0, "judged": 0, "spoke": 0, "errors": 0}
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.tick)

    # ------------------------------------------------------------ 켜고 끄기

    @property
    def enabled(self) -> bool:
        return self.timer.isActive()

    def set_enabled(self, on: bool) -> None:
        if on and not self.timer.isActive():
            self.timer.start(round(self.cfg.interval_seconds * 1000))
            self.status.emit("화면 보기 켜짐")
        elif not on and self.timer.isActive():
            self.timer.stop()
            self.status.emit("화면 보기 꺼짐")

    # ------------------------------------------------------------ 주기 확인

    def in_cooldown(self) -> bool:
        return self.last_spoke is not None and self.clock() - self.last_spoke < self.cfg.cooldown_seconds

    def tick(self) -> None:
        self.stats["ticks"] += 1
        if self.running_job or not self.can_run() or self.in_cooldown():
            return
        self.running_job = True
        self.run_job(self._work, self._done, self._fail, None)

    def ask_now(self, question: str = "지금 화면 어때?") -> None:
        """단축키(F8): 판단·간격 무시하고 지금 화면을 보고 말하게 한다."""
        if self.running_job:
            return
        self.running_job = True
        self.run_job(self._work, self._done, self._fail, question)

    def _shot(self) -> Shot:
        img, title = self.grabber()
        small = cap.shrink(img, self.cfg.max_width)
        return Shot(cap.to_jpeg(small, self.cfg.jpeg_quality), cap.thumb(small), title)

    def _work(self, question: str | None):
        """뒤에서 실행: 캡처 → (변화 없으면 끝) → 판단 → 한마디."""
        shot = self._shot()
        if question is None:
            change = cap.change_amount(self.last_thumb, shot.thumb)
            if change < self.cfg.change_threshold:
                self.stats["skipped_same"] += 1
                return None
        self.last_thumb = shot.thumb
        note = None
        if question is None:
            minutes = None if self.last_spoke is None else (self.clock() - self.last_spoke) / 60
            note = self.companion.judge(shot.jpeg, shot.title, self.cfg.judge_model, minutes)
            self.stats["judged"] += 1
            if not note or not note.get("speak"):
                return None
        return self.companion.screen_line(shot.jpeg, shot.title, note, self.cfg.line_model, question=question)

    def _done(self, reply) -> None:
        self.running_job = False
        if reply is None or not reply.speak:
            self.nothing.emit()
            return
        self.last_spoke = self.clock()
        self.stats["spoke"] += 1
        self.companion.memory.add_spoken(reply.message)
        self.spoke.emit(reply)

    def _fail(self, message: str) -> None:
        self.running_job = False
        self.stats["errors"] += 1
        log.warning("화면 보기 실패: %s", message)
        self.status.emit(message)
