"""모니터 하나를 주기적으로 보고, 말 걸 만하면 캐릭터가 한마디 하게 한다.

흐름: 맨 앞 창으로 모드 고르기(평소/게임) → 모드 간격마다 캡처(내 PC)
      → 화면이 그대로면 건너뜀(비용 0) → Haiku 가 판단(장면·긴급·말할지)
      → 말할 때만 Opus 가 캐릭터 말투로 한마디. 게임이면 이번 판 기록을 모아 대화·총평에 쓴다.
"""

from __future__ import annotations

import logging
import sys
import threading
import time
import traceback
from collections import deque
from dataclasses import dataclass, field
from typing import Callable

from PIL import Image
from PySide6.QtCore import QObject, QTimer, Signal

from . import capture as cap
from .dxgi import DxgiGrabber
from .modes import NORMAL_KNOWLEDGE, Mode, detect
from .windows import MESSENGERS, WindowInfo, capture_window, foreground_window

# 단계마다 이 시간(초)이 넘도록 안 끝나면 그 확인은 버리고 다음으로 넘어간다 (서버·인터넷이 느릴 때 '화면 확인 중 87초' 방지)
STAGE_LIMITS = {"start": 40.0, "judge": 45.0, "line": 120.0, "analyze": 200.0}


class _Abandoned(Exception):
    """너무 오래 걸려서 버린 확인. 뒤늦게 다음 단계(비싼 호출)로 넘어가지 않게 멈춘다."""


def _thread_stacks(limit: int = 8000) -> str:
    """지금 어디서 막혀 있는지 (로그용)."""
    names = {t.ident: t.name for t in threading.enumerate()}
    out = []
    for ident, frame in sys._current_frames().items():  # noqa: SLF001
        stack = "".join(traceback.format_stack(frame, limit=14))
        if any(k in stack for k in ("watcher", "anthropic", "httpx", "dxcam", "dxgi", "companion")):
            out.append(f"--- {names.get(ident, ident)}\n{stack}")
    return "\n".join(out)[:limit]


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
    review: bool = False  # 복기 모드(게임 중): 자주 보고, 한 장면이 끝나면 지난 30초쯤을 되짚는다
    review_interval: float = 5.0  # 복기 모드에서 화면을 보는 간격(초)
    review_gap: float = 40.0  # 복기 사이 최소 간격(초)
    focus_crop: bool = True  # 맨 앞 창이 화면의 70%보다 작으면 그 창을 원래 크기로 한 장 더 보냄
    auto_read: bool = True  # 메신저(카톡 등)를 쓰고 있으면 어느 모니터에 있든 그 창을 직접 찍어 함께 본다


@dataclass
class Shot:
    jpeg: bytes
    thumb: object
    title: str
    focus: bytes | None = None  # 맨 앞 창이 화면보다 작으면 그 창만 원래 크기로 (작은 글씨 읽기)
    focus_label: str = ""  # 확대한 창이 무엇인지 (예: 카카오톡 — 단톡방)
    focus_thumb: object = None


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
        self._job_gen = 0  # 버린 확인의 결과가 뒤늦게 오면 무시하려고 매번 번호를 붙인다
        self._job_local = threading.local()
        self._stage_name, self._stage_at, self._stage_limit = "", None, STAGE_LIMITS["start"]
        self.dxgi = DxgiGrabber()
        self.frames: deque = deque(maxlen=20)  # 최근 장면 (시각, jpeg) — 분석·복기할 때 흐름을 보려고
        self.screen_log = None  # 화면 기억 (main 이 넣어 줌). 바뀐 화면을 날짜별로 저장
        self.window_capture = capture_window  # 창 하나만 찍기 (테스트에서 바꿔 끼움)
        self.last_focus_thumb = None
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
        """설정 창의 '화면 확인 간격'이 게임 모드 값보다 짧으면 그걸 따른다. 복기 모드 게임 중엔 더 자주."""
        base = min(mode.interval_seconds, self.cfg.interval_seconds)
        return min(base, self.cfg.review_interval) if self.reviewing(mode) else base

    def reviewing(self, mode: Mode) -> bool:
        return self.cfg.review and mode.is_game

    def foreground_on_watched(self) -> bool:
        """주인님이 지금 보는 모니터(화면 보기 대상)의 창을 쓰고 있는지 (게임 화면 자막을 띄울지)."""
        info, area = self.window_info(), self.monitor_rect()
        return bool(info and area and _overlaps(info.rect, area))

    def cooldown_for(self, mode: Mode) -> float:
        return min(mode.cooldown_seconds, self.cfg.cooldown_seconds)

    def in_cooldown(self, mode: Mode) -> bool:
        return self.last_spoke is not None and self.clock() - self.last_spoke < self.cooldown_for(mode)

    # ------------------------------------------------------------ 뒤에서 하는 일 (너무 오래 걸리면 버림)

    def _launch(self, fn: Callable, arg) -> None:
        self._job_gen += 1
        gen = self._job_gen
        self.running_job = True
        self._stage_name, self._stage_at, self._stage_limit = "start", self.clock(), STAGE_LIMITS["start"]

        def work(a):
            self._job_local.gen = gen
            return fn(a)

        def finish(handler, value):
            if gen != self._job_gen:  # 이미 버린 확인
                log.info("너무 늦게 끝난 화면 확인 결과는 버림")
                return
            self._stage_at = None
            handler(value)

        self.run_job(work, lambda r: finish(self._done, r), lambda m: finish(self._fail, m), arg)

    def _stage(self, what: str) -> None:
        """뒤에서: 다음 단계로 넘어간다. 이미 버린 확인이면 여기서 멈춘다 (돈 드는 다음 호출을 안 하게)."""
        if getattr(self._job_local, "gen", self._job_gen) != self._job_gen:
            raise _Abandoned(what)
        self._stage_name, self._stage_at, self._stage_limit = what, self.clock(), STAGE_LIMITS.get(what, 60.0)
        self.activity.emit(what)

    def check_stuck(self) -> bool:
        """확인 하나가 너무 오래 걸리면 버리고 다음 확인을 할 수 있게 한다."""
        if not self.running_job or self._stage_at is None:
            return False
        waited = self.clock() - self._stage_at
        if waited <= self._stage_limit:
            return False
        log.warning("화면 확인이 %.0f초째 안 끝나서 건너뜀 (단계: %s)\n%s", waited, self._stage_name, _thread_stacks())
        self._job_gen += 1
        self.running_job = False
        self._stage_at = None
        self.stats["errors"] += 1
        self.activity.emit("")
        self.status.emit("화면 확인이 너무 오래 걸려서 이번 건 건너뛰었어요. 인터넷이나 서버가 잠깐 느린 것 같아요.")
        return True

    def tick(self) -> None:
        self.stats["ticks"] += 1
        self.check_stuck()
        self.update_mode()
        if self.running_job or not self.can_run():
            return
        now = self.clock()
        mode = self.mode
        if self.last_check is not None and now - self.last_check < self.interval_for(mode):
            return
        # 긴급 경고·총평이 없는 모드는 쉬는 시간 동안 아예 보지 않는다 (판단 비용도 0). 복기 모드는 장면을 계속 모은다
        if self.in_cooldown(mode) and not (mode.urgent or mode.review_on_result or self.reviewing(mode)):
            return
        self.last_check = now
        self._launch(self._work, None)

    def ask_analysis(self, question: str = "지금 화면을 자세히 분석해 줘") -> None:
        """단축키(F10)·대화: 판단 없이 지금 화면을 최근 장면들과 함께 자세히 분석한다."""
        if self.running_job:
            return
        self.update_mode()
        self._launch(self._work_analysis, question)

    def _remember(self, shot, mode, note=None) -> None:
        if self.screen_log is None:
            return
        try:
            from datetime import datetime

            self.screen_log.save(shot.jpeg, datetime.now(), getattr(mode, "name", ""), shot.title,
                                 (note or {}).get("situation", ""))
        except OSError as exc:
            log.warning("화면 기억 저장 실패: %s", exc)

    def _work_analysis(self, question: str):
        mode, session = self.mode, self.session
        shot = self._shot()
        self.last_thumb = shot.thumb
        self.frames.append((self.clock(), shot.jpeg))
        self._remember(shot, mode)
        return self._analyze(shot, None, mode, list(session.notes) if session else None, question,
                             review=self.reviewing(mode))

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

    def _analyze(self, shot, note, mode, notes, question=None, review: bool = False):
        self._stage("analyze")
        frames = (self.frames_for_analysis(shot.jpeg, count=6, min_gap=4.0) if review
                  else self.frames_for_analysis(shot.jpeg))
        return self.companion.analyze(frames, shot.title, mode=mode, session_notes=notes, note=note, question=question,
                                      review=review, focus=shot.focus, focus_label=shot.focus_label)

    def ask_now(self, question: str = "지금 화면 어때?") -> None:
        """단축키(F8): 판단·간격 무시하고 지금 화면을 보고 말하게 한다."""
        if self.running_job:
            return
        self.update_mode()
        self._launch(self._work, question)

    def _shot(self) -> Shot:
        img = self.grabber()
        small = cap.shrink(img, self.cfg.max_width)
        shot = Shot(cap.to_jpeg(small, self.cfg.jpeg_quality), cap.thumb(small), self.title)
        if self.cfg.focus_crop:
            shot.focus = self._focus_crop(img)
            if shot.focus:
                shot.focus_label = "지금 쓰고 있는 창"
        if shot.focus is None and self.cfg.auto_read:
            self._messenger_shot(shot)
        if shot.focus:
            from io import BytesIO

            shot.focus_thumb = cap.thumb(Image.open(BytesIO(shot.focus)))
        self._current_focus = (shot.focus, shot.focus_label)
        return shot

    def _messenger_shot(self, shot: Shot) -> None:
        """메신저(카톡 등)를 쓰고 있으면, 다니카 쪽 모니터에 있어도 그 창을 직접 찍어 함께 본다."""
        try:
            info = self.window_info()
        except Exception:  # noqa: BLE001
            return
        if not info or info.process not in MESSENGERS or not info.hwnd:
            return
        try:
            img = self.window_capture(info.hwnd)
        except Exception as exc:  # noqa: BLE001
            log.warning("메신저 창을 찍지 못함: %s", exc)
            return
        if img is None:
            return
        if max(img.size) > 1568:
            k = 1568 / max(img.size)
            img = img.resize((round(img.width * k), round(img.height * k)), Image.Resampling.LANCZOS)
        shot.focus = cap.to_jpeg(img, 90)
        shot.focus_label = f"{MESSENGERS[info.process]} — {info.title}"[:80]

    def _focus_crop(self, img: Image.Image) -> bytes | None:
        """맨 앞 창(보는 모니터 위)이 화면의 70%보다 작으면 그 부분만 원래 크기로 잘라 낸다 (카톡 같은 작은 글씨)."""
        try:
            info, area = self.window_info(), self.monitor_rect()
        except Exception:  # noqa: BLE001
            return None
        if not info or not area or not _overlaps(info.rect, area):
            return None
        ml, mt, mr, mb = area
        l, t, r, b = max(info.rect[0], ml), max(info.rect[1], mt), min(info.rect[2], mr), min(info.rect[3], mb)
        if (r - l) * (b - t) > 0.7 * (mr - ml) * (mb - mt) or r - l < 120 or b - t < 80:
            return None
        sx, sy = img.width / max(1, mr - ml), img.height / max(1, mb - mt)  # 찍은 크기가 다를 때(배율) 맞춤
        crop = img.crop((int((l - ml) * sx), int((t - mt) * sy), int((r - ml) * sx), int((b - mt) * sy)))
        if max(crop.size) > 1568:
            k = 1568 / max(crop.size)
            crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.Resampling.LANCZOS)
        return cap.to_jpeg(crop, 90)

    def _work(self, question: str | None):
        """뒤에서 실행: 캡처 → (변화 없으면 끝) → 판단 → 한마디/총평."""
        mode, session = self.mode, self.session
        notes = list(session.notes) if session else None
        shot = self._shot()
        if question is not None:
            self.last_thumb = shot.thumb
            self._remember(shot, mode)
            return self._say(shot.jpeg, shot.title, None, self.cfg.line_model, question=question,
                                              mode=mode, session_notes=notes)
        stale = self.last_judged is not None and self.clock() - self.last_judged >= self.cfg.max_skip_minutes * 60
        changed = cap.change_amount(self.last_thumb, shot.thumb)
        if shot.focus_thumb is not None:  # 메신저 창에 새 메시지가 오면 큰 화면이 그대로여도 다시 본다
            changed = max(changed, cap.change_amount(self.last_focus_thumb, shot.focus_thumb))
        if changed < self.cfg.change_threshold and not stale:
            self.stats["skipped_same"] += 1
            return None
        self.last_thumb = shot.thumb
        self.last_focus_thumb = shot.focus_thumb
        self.frames.append((self.clock(), shot.jpeg))
        self.last_judged = self.clock()
        minutes = None if self.last_spoke is None else (self.clock() - self.last_spoke) / 60
        self._stage("judge")
        note = self.companion.judge(shot.jpeg, shot.title, self.cfg.judge_model, minutes, mode, notes, focus=shot.focus,
                                    focus_label=shot.focus_label,
                                    chattiness=self.cfg.chattiness, analysis=self.cfg.analysis,
                                    review=self.reviewing(mode))
        self.stats["judged"] += 1
        self._remember(shot, mode, note)
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
        if self.reviewing(mode):  # 복기: 장면이 끝났다고 판단되면 지난 장면들을 되짚는다 (복기 사이는 review_gap)
            if not note.get("speak") or scene in ("loading", "cutscene"):
                return None
            if self.last_spoke is not None and now - self.last_spoke < self.cfg.review_gap:
                return None
            return self._analyze(shot, note, mode, notes, review=True)
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
        self._stage("line")
        focus, label = getattr(self, "_current_focus", (None, ""))
        if focus:
            kwargs.setdefault("focus", focus)
            kwargs.setdefault("focus_label", label)
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
            if self.screen_log is not None:
                self.screen_log.note(said=reply.message)
            if self.session:
                self.session.add(self.last_spoke, "내가 한 말: " + reply.message)
        self.spoke.emit(reply)

    def _fail(self, message: str) -> None:
        self.running_job = False
        self.activity.emit("")
        self.stats["errors"] += 1
        log.warning("화면 보기 실패: %s", message)
        self.status.emit(message)
