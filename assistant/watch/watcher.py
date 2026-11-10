"""모니터 하나를 주기적으로 보고, 말 걸 만하면 캐릭터가 한마디 하게 한다.

흐름: 맨 앞 창으로 모드 고르기(평소/게임) → 모드 간격마다 캡처(내 PC)
      → 화면이 그대로면 건너뜀(비용 0) → Haiku 가 판단(장면·긴급·말할지)
      → 말할 때만 Opus 가 캐릭터 말투로 한마디. 게임이면 이번 판 기록을 모아 대화·총평에 쓴다.
"""

from __future__ import annotations

import logging
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Callable

from PIL import Image
from PySide6.QtCore import QObject, QTimer, Signal

from . import capture as cap
from .dxgi import DxgiGrabber
from .modes import NORMAL_KNOWLEDGE, Mode, detect
from .windows import WindowInfo, foreground_window

log = logging.getLogger("assistant.watch")
# 게임 화면처럼 보여도 게임이 아닌 프로그램 (브라우저 게임은 모드 파일의 창 제목으로 따로 잡는다)
NOT_GAMES = {"chrome.exe", "msedge.exe", "firefox.exe", "whale.exe", "opera.exe", "brave.exe", "explorer.exe",
             "code.exe", "discord.exe", "kakaotalk.exe", "obs64.exe", "vlc.exe", "potplayermini64.exe",
             "steam.exe", "steamwebhelper.exe", "epicgameslauncher.exe", "battle.net.exe", "python.exe",
             "pythonw.exe", "notepad.exe", "windowsterminal.exe", "cmd.exe", "powershell.exe"}


@dataclass
class WatchConfig:
    interval_seconds: float = 30.0  # 평소 모드 확인 간격
    monitor: str = "left"
    judge_model: str = "claude-haiku-5-5"
    line_model: str = "claude-opus-5-5"
    cooldown_seconds: float = 120.0  # 평소 모드 말 거는 최소 간격
    change_threshold: float = 0.015
    max_width: int = 1920
    jpeg_quality: int = 85
    tick_seconds: float = 5.0  # 모드 확인 주기 (내 PC, 비용 없음)
    session_end_minutes: float = 3.0  # 게임 창이 이만큼 안 보이면 그 게임 세션 끝
    review_gap_seconds: float = 120.0  # 총평 사이 최소 간격
    chattiness: str = "normal"  # quiet | normal | chatty
    max_skip_minutes: float = 3.0  # 화면이 그대로여도 이 시간마다 한 번은 판단
    new_game_hits: int = 8  # 평소 모드에서 같은 프로그램이 게임 화면으로 이만큼 보이면 게임 모드를 만든다
    analysis: bool = False  # 분석 모드: 짚을 만한 순간에 최근 장면 여러 장으로 자세히 분석


@dataclass
class Shot:
    jpeg: bytes
    thumb: object
    title: str


@dataclass
class GameSession:
    mode: Mode
    started: float
    last_seen: float
    notes: list[str] = field(default_factory=list)
    last_review: float | None = None

    def add(self, now: float, text: str) -> None:
        if not text:
            return
        m = int((now - self.started) // 60)
        self.notes.append(f"{m}분: {text}")
        del self.notes[:-60]

    def minutes(self, now: float) -> float:
        return (now - self.started) / 60


def _overlaps(a: tuple[int, int, int, int], b: tuple[int, int, int, int], min_px: int = 40) -> bool:
    return min(a[2], b[2]) - max(a[0], b[0]) >= min_px and min(a[3], b[3]) - max(a[1], b[1]) >= min_px


class ScreenWatcher(QObject):
    """run_job(fn, on_done, on_fail, *args) 로 무거운 일을 뒤에서 돌린다 (앱의 작업 실행기를 받음)."""

    spoke = Signal(object)  # companion.Reply
    nothing = Signal()  # 확인했지만 할 말이 없었음
    status = Signal(str)
    mode_changed = Signal(str)
    activity = Signal(str)  # "judge"(화면 확인 중) | "line"(할 말 고르는 중) | "analyze"(분석 중) | ""(끝)
    new_game = Signal(str, str, list)  # 처음 보는 게임을 자주 함: (실행 파일, 창 제목, 본 장면들)

    def __init__(self, companion, cfg: WatchConfig, run_job: Callable, *, modes: list[Mode] | None = None,
                 can_run: Callable[[], bool] = lambda: True,
                 grabber: Callable[[], Image.Image] | None = None,
                 window_info: Callable[[], WindowInfo | None] = foreground_window,
                 monitor_rect: Callable[[], tuple[int, int, int, int] | None] | None = None,
                 clock: Callable[[], float] = time.monotonic):
        super().__init__()
        self.companion = companion
        self.cfg = cfg
        self.run_job = run_job
        self.modes = modes or []
        self.normal = Mode("평소", interval_seconds=cfg.interval_seconds, cooldown_seconds=cfg.cooldown_seconds,
                           knowledge=NORMAL_KNOWLEDGE)
        self.mode = self.normal
        self.title = ""
        self.process = ""  # 맨 앞 창의 실행 파일 (보는 모니터에 있을 때)
        self.window_title = ""
        self.game_hits: dict[str, list[str]] = {}  # 모드 없는 프로그램에서 본 게임 장면
        self.known_games: set[str] = set()  # 이미 모드를 만들었거나 만들지 않기로 한 프로그램
        self.session: GameSession | None = None
        self.can_run = can_run
        self.grabber = grabber or self._default_grab
        self.window_info = window_info
        self.monitor_rect = monitor_rect or self._default_monitor_rect
        self._monitor_cache: tuple[float, tuple | None] = (-1e9, None)
        self.clock = clock
        self.last_thumb = None
        self.last_judged: float | None = None
        self.last_spoke: float | None = None
        self.last_check: float | None = None
        self.running_job = False
        self.dxgi = DxgiGrabber()
        self.frames: deque = deque(maxlen=8)  # 최근 장면 (시각, jpeg) — 분석할 때 흐름을 보려고
        self._black_warned = -1e9
        self.stats = {"ticks": 0, "skipped_same": 0, "judged": 0, "spoke": 0, "reviews": 0, "errors": 0}
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.tick)

    # ------------------------------------------------------------ 캡처 대상

    def _default_monitor_rect(self):
        now = self.clock()
        if now - self._monitor_cache[0] > 60:
            try:
                m = cap.pick_monitor(cap.list_monitors(), self.cfg.monitor)
                self._monitor_cache = (now, m.rect if m else None)
            except Exception:  # noqa: BLE001 - 화면 정보를 못 읽으면 모드 판단만 느슨하게
                self._monitor_cache = (now, None)
        return self._monitor_cache[1]

    def _default_grab(self) -> Image.Image:
        monitor = cap.pick_monitor(cap.list_monitors(), self.cfg.monitor)
        if monitor is None:
            raise RuntimeError("모니터를 찾지 못했어요.")
        # 게임이 포커스를 가져도 실제 화면이 찍히는 DXGI 먼저, 안 되면 기존 방식
        img = self.dxgi.grab((monitor.left, monitor.top, monitor.width, monitor.height))
        if img is None:
            img = cap.grab(monitor)
        if img.getextrema() and max(hi for _, hi in img.getextrema()) < 12 and self.clock() - self._black_warned > 600:
            self._black_warned = self.clock()
            log.warning("화면이 새까맣게 찍힘 (전용 전체화면 게임이면 '테두리 없는 창 모드'로 바꾸면 보일 수 있음)")
        return img

    # ------------------------------------------------------------ 켜고 끄기

    @property
    def enabled(self) -> bool:
        return self.timer.isActive()

    def set_enabled(self, on: bool) -> None:
        if on and not self.timer.isActive():
            self.timer.start(round(self.cfg.tick_seconds * 1000))
            self.status.emit("화면 보기 켜짐")
        elif not on and self.timer.isActive():
            self.timer.stop()
            self.status.emit("화면 보기 꺼짐")

    # ------------------------------------------------------------ 모드·세션

    def apply_config(self) -> None:
        """설정 창에서 바꾼 값(간격·쉬는 시간 등)을 바로 반영."""
        self.normal.interval_seconds = self.cfg.interval_seconds
        self.normal.cooldown_seconds = self.cfg.cooldown_seconds
        self._monitor_cache = (-1e9, None)
        self.last_thumb = None

    def update_mode(self) -> None:
        now = self.clock()
        info = self.window_info()
        area = self.monitor_rect()
        # 맨 앞 창이 보는 모니터에 있을 때만 모드를 바꾼다 (다니카를 클릭해도 게임 모드 유지)
        if info and (area is None or _overlaps(info.rect, area)):
            self.title = f"{info.title} [{info.process}]"
            self.process, self.window_title = (info.process or "").lower(), info.title or ""
            new = detect(info.process, info.title, self.modes) or self.normal
            if new is not self.mode:
                self.mode = new
                self.mode_changed.emit(new.name)
        if self.mode.is_game:
            if self.session is None or self.session.mode is not self.mode:
                self._end_session(now)
                self.session = GameSession(self.mode, now, now)
            self.session.last_seen = now
        elif self.session and now - self.session.last_seen > self.cfg.session_end_minutes * 60:
            self._end_session(now)

    def _end_session(self, now: float) -> None:
        s = self.session
        self.session = None
        if s and len(s.notes) >= 3 and s.minutes(now) >= 5:
            self.companion.memory.add_game_record(s.mode.name, s.minutes(now), s.notes)

    def chat_context(self) -> str | None:
        """게임 중 주인님이 말을 걸면 대사에 함께 넣는 상황 정보."""
        s = self.session
        if not s:
            return None
        lines = [f"[지금 하고 있는 게임: {s.mode.name}, {s.minutes(self.clock()):.0f}분째]"]
        if s.notes:
            lines.append("이번 판(세션)에서 본 것:\n" + "\n".join(f"- {n}" for n in s.notes[-15:]))
        return "\n".join(lines)

    # ------------------------------------------------------------ 주기 확인

    def status_text(self) -> str:
        """메뉴에 보여줄 화면 보기 상태."""
        if not self.enabled:
            return "화면 보기: 꺼져 있음"
        age = "아직 안 봄" if self.last_check is None else f"마지막 확인 {self.clock() - self.last_check:.0f}초 전"
        s = self.stats
        return f"화면 보기: {age} · 판단 {s['judged']}번 · 먼저 말 건 {s['spoke']}번 · 변화 없어 건너뜀 {s['skipped_same']}번"

    def interval_for(self, mode: Mode) -> float:
        """설정 창의 '화면 확인 간격'이 게임 모드 값보다 짧으면 그걸 따른다."""
        return min(mode.interval_seconds, self.cfg.interval_seconds)

    def cooldown_for(self, mode: Mode) -> float:
        return min(mode.cooldown_seconds, self.cfg.cooldown_seconds)

    def in_cooldown(self, mode: Mode) -> bool:
        return self.last_spoke is not None and self.clock() - self.last_spoke < self.cooldown_for(mode)

    def tick(self) -> None:
        self.stats["ticks"] += 1
        self.update_mode()
        if self.running_job or not self.can_run():
            return
        now = self.clock()
        mode = self.mode
        if self.last_check is not None and now - self.last_check < self.interval_for(mode):
            return
        # 긴급 경고·총평이 없는 모드는 쉬는 시간 동안 아예 보지 않는다 (판단 비용도 0)
        if self.in_cooldown(mode) and not (mode.urgent or mode.review_on_result):
            return
        self.last_check = now
        self.running_job = True
        self.run_job(self._work, self._done, self._fail, None)

    def ask_analysis(self, question: str = "지금 화면을 자세히 분석해 줘") -> None:
        """단축키(F10)·대화: 판단 없이 지금 화면을 최근 장면들과 함께 자세히 분석한다."""
        if self.running_job:
            return
        self.update_mode()
        self.running_job = True
        self.run_job(self._work_analysis, self._done, self._fail, question)

    def _work_analysis(self, question: str):
        mode, session = self.mode, self.session
        shot = self._shot()
        self.last_thumb = shot.thumb
        self.frames.append((self.clock(), shot.jpeg))
        return self._analyze(shot, None, mode, list(session.notes) if session else None, question)

    def frames_for_analysis(self, current: bytes, count: int = 3, min_gap: float = 15.0) -> list[tuple[bytes, float]]:
        """지금 장면 + 그 전 장면들(서로 min_gap 초 넘게 떨어진 것)을 오래된 것부터."""
        now = self.clock()
        picked = [(current, 0.0)]
        last_t = now
        for t, jpeg in reversed(self.frames):
            if len(picked) >= count:
                break
            if jpeg is current or last_t - t < min_gap or now - t > 600:
                continue
            picked.append((jpeg, now - t))
            last_t = t
        return list(reversed(picked))

    def _analyze(self, shot, note, mode, notes, question=None):
        self.activity.emit("analyze")
        return self.companion.analyze(self.frames_for_analysis(shot.jpeg), shot.title, mode=mode, session_notes=notes,
                                      note=note, question=question)

    def ask_now(self, question: str = "지금 화면 어때?") -> None:
        """단축키(F8): 판단·간격 무시하고 지금 화면을 보고 말하게 한다."""
        if self.running_job:
            return
        self.update_mode()
        self.running_job = True
        self.run_job(self._work, self._done, self._fail, question)

    def _shot(self) -> Shot:
        img = self.grabber()
        small = cap.shrink(img, self.cfg.max_width)
        return Shot(cap.to_jpeg(small, self.cfg.jpeg_quality), cap.thumb(small), self.title)

    def _work(self, question: str | None):
        """뒤에서 실행: 캡처 → (변화 없으면 끝) → 판단 → 한마디/총평."""
        mode, session = self.mode, self.session
        notes = list(session.notes) if session else None
        shot = self._shot()
        if question is not None:
            self.last_thumb = shot.thumb
            return self._say(shot.jpeg, shot.title, None, self.cfg.line_model, question=question,
                                              mode=mode, session_notes=notes)
        stale = self.last_judged is not None and self.clock() - self.last_judged >= self.cfg.max_skip_minutes * 60
        if cap.change_amount(self.last_thumb, shot.thumb) < self.cfg.change_threshold and not stale:
            self.stats["skipped_same"] += 1
            return None
        self.last_thumb = shot.thumb
        self.frames.append((self.clock(), shot.jpeg))
        self.last_judged = self.clock()
        minutes = None if self.last_spoke is None else (self.clock() - self.last_spoke) / 60
        self.activity.emit("judge")
        note = self.companion.judge(shot.jpeg, shot.title, self.cfg.judge_model, minutes, mode, notes,
                                    chattiness=self.cfg.chattiness, analysis=self.cfg.analysis)
        self.stats["judged"] += 1
        if not note:
            return None
        log.info("화면 판단 [%s] %s / %s → %s", mode.name, note.get("scene"), note.get("situation"),
                 "말함" if note.get("speak") or note.get("urgent") else "조용")
        now = self.clock()
        scene, urgent = note.get("scene", "other"), bool(note.get("urgent"))
        if not mode.is_game:
            self._count_game(scene, note.get("situation", ""))
        if session:
            session.add(now, note.get("situation", ""))
        if (mode.review_on_result and scene == "result" and session
                and (session.last_review is None or now - session.last_review > self.cfg.review_gap_seconds)):
            session.last_review = now
            self.stats["reviews"] += 1
            if self.cfg.analysis:
                return self._analyze(shot, note, mode, session.notes)
            return self._say(shot.jpeg, shot.title, note, self.cfg.line_model, mode=mode,
                                              session_notes=session.notes, review=True)
        if urgent and mode.urgent:
            return self._say(shot.jpeg, shot.title, note, self.cfg.line_model, mode=mode,
                                              session_notes=notes)
        if scene in ("loading", "cutscene") or (mode.quiet_during_play and scene == "playing"):
            return None
        if self.in_cooldown(mode) or not note.get("speak"):
            return None
        if self.cfg.analysis:
            return self._analyze(shot, note, mode, notes)
        return self._say(shot.jpeg, shot.title, note, self.cfg.line_model, mode=mode,
                                          session_notes=notes)

    def _count_game(self, scene: str, situation: str) -> None:
        """평소 모드인데 게임 화면이 자주 보이면 그 게임 모드를 만들자고 알린다."""
        p = self.process
        if scene not in ("playing", "result", "cutscene") or not p or p in self.known_games or p in NOT_GAMES:
            return
        hits = self.game_hits.setdefault(p, [])
        hits.append(situation)
        if len(hits) >= self.cfg.new_game_hits:
            self.known_games.add(p)
            self.new_game.emit(p, self.window_title, hits[-10:])

    def _say(self, *args, **kwargs):
        self.activity.emit("line")
        return self.companion.screen_line(*args, **kwargs)

    def _done(self, reply) -> None:
        self.running_job = False
        self.activity.emit("")
        if reply is None or not reply.speak:
            self.nothing.emit()
            return
        self.last_spoke = self.clock()
        self.stats["spoke"] += 1
        if reply.message:  # 비어 있으면 '조용히 찾아보기' (찾아본 뒤 말한다)
            self.companion.memory.add_spoken(reply.message)
            if self.session:
                self.session.add(self.last_spoke, "내가 한 말: " + reply.message)
        self.spoke.emit(reply)

    def _fail(self, message: str) -> None:
        self.running_job = False
        self.activity.emit("")
        self.stats["errors"] += 1
        log.warning("화면 보기 실패: %s", message)
        self.status.emit(message)
