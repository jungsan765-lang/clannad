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
from .sampler import FrameSampler
from .modes import NORMAL_KNOWLEDGE, Mode, detect
from .windows import MESSENGERS, PROGRAMS, WindowInfo, capture_window, foreground_window

# 단계마다 이 시간(초)이 넘도록 안 끝나면 그 확인은 버리고 다음으로 넘어간다 (서버·인터넷이 느릴 때 '화면 확인 중 87초' 방지)
STAGE_LIMITS = {"start": 40.0, "judge": 45.0, "layout": 90.0, "scan": 45.0, "perceive": 60.0, "line": 120.0, "analyze": 200.0,
                "analyze_deep": 330.0}


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
    review_gap: float = 90.0  # 복기 사이 최소 간격(초). 짧으면 비싸진다 (복기 한 번 = 비싼 모델 1회)
    focus_crop: bool = True  # 맨 앞 창이 화면의 70%보다 작으면 그 창을 원래 크기로 한 장 더 보냄
    auto_read: bool = True  # 메신저(카톡 등)를 쓰고 있으면 어느 모니터에 있든 그 창을 직접 찍어 함께 본다
    deep_result: bool = True  # 판이 끝난 결과 화면 총평은 오래 생각해서 (1~2분, 조금 더 비쌈)
    pick_gap: float = 150.0  # 픽 조언 사이 최소 간격(초): 한 번의 픽 화면에선 한 번만
    # 아끼기: 화면은 이 PC 에서 자주(무료) 살펴보고, AI 판단은 '확인 간격'마다 또는 장면이 크게 바뀌어 멈췄을 때만
    sample_seconds: float = 10.0  # 이 PC 에서 화면이 바뀌었는지 살피는 간격 (비용 없음)
    scene_change: float = 0.08  # 이만큼 크게 바뀌고(장면 전환) 멈춰 있으면 확인 간격 전이라도 판단
    event_gap: float = 8.0  # 장면 전환 판단 사이 최소 간격(초)
    economy_line_model: str = "claude-haiku-5-5"  # 평범한 화면 대사(한두 마디 반응)는 이 모델 — 한 마디 몇 원
    mid_line_model: str = "claude-sonnet-5-5"
    # brain: 여럿이 나눠 보고(눈 담당 Sonnet·대사 담당 Haiku·기억·지식) 마지막에 line_model(Opus)이 화면과 맞춰 보고 말함
    # auto: 가장 싼 모델 / sonnet: 중간 모델 / best: 항상 line_model (경고·픽·총평·대화는 늘 line_model)
    line_quality: str = "brain"
    # 촘촘히 보기: 0.5초마다 이 PC 에서 찍어 두고, 5초마다 그 흐름을 한 장에 모아 판단 (game: 게임할 때만 / always / off)
    dense: str = "game"
    dense_interval: float = 0.5
    dense_batch: float = 5.0
    spike_gap: float = 2.0  # 화면이 확 바뀌면 5초를 기다리지 않고 바로 판단 (판단 사이 최소 간격)
    # 둘러보기: 판단 담당이 짚은 '자세히 볼 것'(표시 뜬 인물·물건 …)을 확대 담당들이 알아보고 중요한 것만 알림
    scan: bool = True
    scan_gap: float = 15.0  # 둘러보기 사이 최소 간격
    scan_model: str = "claude-haiku-5-5"  # 확대 담당·판정 담당 (조각·글만 보니 싼 모델로 충분)


@dataclass
class Shot:
    jpeg: bytes
    thumb: object
    title: str
    focus: bytes | None = None  # 맨 앞 창이 화면보다 작으면 그 창만 원래 크기로 (작은 글씨 읽기)
    focus_label: str = ""  # 확대한 창이 무엇인지 (예: 카카오톡 — 단톡방)
    focus_thumb: object = None
    native: object = None  # 줄이기 전 원래 화면 (작은 글씨 확대용, 이번 확인 동안만)
    history: bytes | None = None  # 촘촘히 보기: 지난 몇 초 흐름 모음


@dataclass
class GameSession:
    mode: Mode
    started: float
    last_seen: float
    notes: list[str] = field(default_factory=list)
    last_review: float | None = None
    last_pick: float | None = None

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
    missed = Signal()  # 주인님이 부탁한 화면 보기·분석이 할 말 없이 끝남 (말없이 끝나지 않게 알려 준다)
    result_seen = Signal(str)
    session_started = Signal(str)  # 게임을 켬 (모드 이름)
    session_ended = Signal(str, float, list)  # 게임을 끔: (모드 이름, 분, 화면으로 본 기록)  # 게임 결과 화면을 봤음 (모드 이름) → 공식 기록이 있으면 나중에 기록으로 다시 본다

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
        self._pending: tuple[Callable, object] | None = None  # 하던 확인이 끝나면 바로 할 부탁 (F8·F10·대화)
        self._requested_gen: int | None = None
        self._blocked_logged = ""
        self._job_local = threading.local()
        self._stage_name, self._stage_at, self._stage_limit = "", None, STAGE_LIMITS["start"]
        self.dxgi = DxgiGrabber()
        self.sampler = FrameSampler(lambda: self.grabber(), interval=cfg.dense_interval, clock=clock)
        self._current_history: bytes | None = None  # 이번 확인의 '지난 몇 초 흐름' 모음 (대사에도 같이)
        self._current_captions: list = []  # 이번 확인 때 새로 뜬 자막·대사 (원래 크기)
        self.layouts = None  # 게임 화면 배치 (watch.layout.Layouts, main 이 넣어 줌)
        self.layout_model = "claude-sonnet-5-5"  # 화면 배치 익히기 (게임·장면마다 한 번)
        self.seen = None  # 둘러보기로 알아본 것 (watch.scan.SeenThings, main 이 넣어 줌)
        self._last_scan: float | None = None
        self._scanned: deque = deque(maxlen=30)  # (시각, 상자, 작은 그림) — 방금 본 이름 모를 것은 다시 안 봄
        self._finds: list[tuple[float, dict]] = []  # 알릴 만하다고 판정됐는데 아직 못 알린 것 (쉬는 시간 중이었음)
        self.frames: deque = deque(maxlen=20)  # 최근 장면 (시각, jpeg) — 분석·복기할 때 흐름을 보려고
        self.flow: deque = deque(maxlen=12)  # 게임이 아닐 때도 최근 화면 흐름 ("14:02 유튜브 요리 영상") — 긴 흐름을 글로 싸게
        self.screen_log = None  # 화면 기억 (main 이 넣어 줌). 바뀐 화면을 날짜별로 저장
        self.window_capture = capture_window  # 창 하나만 찍기 (테스트에서 바꿔 끼움)
        self.last_focus_thumb = None
        self._prev_sample = None  # 바로 전 살펴보기 때 화면 (장면이 멈췄는지 보려고)
        self._quiet_streak = 0  # 게임 밖에서 '말할 것 없음' 판단이 이어진 수 (간격 늘리기)
        self._black_warned = -1e9
        self.stats = {"ticks": 0, "skipped_same": 0, "judged": 0, "spoke": 0, "reviews": 0, "errors": 0}
        self.timer = QTimer(self)
        self.timer.timeout.connect(self.tick)
        self.fast_timer = QTimer(self)  # 촘촘히 보기: 0.5초마다 '확 바뀌었나'만 보고 바로 판단 (비용 없음)
        self.fast_timer.timeout.connect(self._check_spike)

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
            self.fast_timer.start(500)
            self.status.emit("화면 보기 켜짐")
        elif not on and self.timer.isActive():
            self.timer.stop()
            self.fast_timer.stop()
            self.sampler.set_active(False)
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
                self.tune_sampler(new)
                self.mode_changed.emit(new.name)
        if self.mode.is_game:
            if self.session is None or self.session.mode is not self.mode:
                self._end_session(now)
                self.session = GameSession(self.mode, now, now)
                self.session_started.emit(self.mode.name)
            self.session.last_seen = now
        elif self.session and now - self.session.last_seen > self.cfg.session_end_minutes * 60:
            self._end_session(now)

    def tune_sampler(self, mode: Mode | None = None) -> None:
        """게임마다: '확 바뀜' 기준(모드의 spike)과 따로 잘라 읽을 자막·대화창 자리(화면 배치)."""
        mode = mode or self.mode
        self.sampler.configure(mode.spike, mode.spike_level, mode.spike_busy)
        if not mode.is_game:
            self.sampler.set_text_boxes([])
            return
        from .layout import DEFAULT_TEXT_BOX

        boxes = self.layouts.text_boxes(mode.name) if self.layouts is not None else [DEFAULT_TEXT_BOX]
        self.sampler.set_text_boxes(boxes)

    def relearn_layout(self) -> str | None:
        """주인님이 'UI 다시 익혀' 하면: 지금 게임의 화면 배치를 지우고 다음 조용한 순간에 다시 본다."""
        if self.layouts is None or not self.mode.is_game:
            return None
        self.layouts.forget(self.mode.name)
        self.tune_sampler(self.mode)
        return self.mode.name

    def _layout_due(self, mode: Mode, note: dict, shot) -> str | None:
        scene = note.get("scene")
        if (self.layouts is None or not mode.is_game or scene not in ("playing", "cutscene") or shot.native is None
                or note.get("speak") or note.get("urgent") or not hasattr(self.companion, "learn_layout")):
            return None  # 말할 순간엔 말부터 (배치는 조용할 때)
        if self.layouts.learned(mode.name, scene) or self.layouts.tried_recently(mode.name, scene):
            return None
        return scene

    def _learn_layout(self, shot, mode: Mode, scene: str) -> None:
        self._stage("layout")
        self.layouts.mark_try(mode.name, scene)
        try:
            regions, _usd = self.companion.learn_layout(cap.to_jpeg(cap.shrink(shot.native, 1568), 88), mode.name, scene,
                                                        self.layout_model)
        except _Abandoned:
            raise
        except Exception as exc:  # noqa: BLE001 - 배치를 못 익혀도 화면 보기는 계속 (20분 뒤 다시)
            log.warning("화면 배치 익히기 실패 (%s): %r", mode.name, exc)
            return
        if regions:
            self.layouts.save(mode.name, scene, regions)
            self.tune_sampler(mode)
            log.info("화면 배치 익힘 [%s/%s]: %s", mode.name, scene,
                     ", ".join(r.get("name", "") for r in self.layouts.regions(mode.name)))

    def _scan_due(self, mode: Mode, note: dict, shot) -> bool:
        if (not self.cfg.scan or self.seen is None or not mode.is_game or note.get("scene") != "playing"
                or not note.get("look") or shot.native is None or not hasattr(self.companion, "inspect_spot")):
            return False
        return self._last_scan is None or self.clock() - self._last_scan >= self.cfg.scan_gap

    def _scan(self, shot, mode: Mode, note: dict, session) -> None:
        """둘러보기: 짚은 것들을 원래 크기로 잘라 확대 담당들이 동시에 알아보고 → 판정 담당이 중요도 → 기억·알릴 것."""
        from concurrent.futures import ThreadPoolExecutor

        from .scan import box_overlap, crop_spot

        self._stage("scan")
        now = self._last_scan = self.clock()
        while self._scanned and now - self._scanned[0][0] > 120:
            self._scanned.popleft()
        spots = []
        for item in (note.get("look") or [])[:3]:
            if not isinstance(item, dict):
                continue
            crop = crop_spot(shot.native, item.get("box") or [])
            if crop is None:
                continue
            box = [float(v) for v in item["box"]]
            th = cap.thumb(crop)
            if any(box_overlap(box, b) > 0.4 and cap.change_amount(t, th) < 0.08 for _, b, t in self._scanned):
                continue  # 2분 안에 같은 자리 같은 모습을 이미 봄
            self._scanned.append((now, box, th))
            spots.append((str(item.get("what", ""))[:80], cap.to_jpeg(crop, 88)))
        if not spots:
            return

        def look(spot):
            try:
                return self.companion.inspect_spot(spot[1], spot[0], mode, self.cfg.scan_model)[0]
            except Exception as exc:  # noqa: BLE001 - 하나 못 알아봐도 나머지는 계속
                log.warning("확대 담당 실패: %r", exc)
                return None

        with ThreadPoolExecutor(max_workers=3, thread_name_prefix="scan") as pool:
            results = list(pool.map(look, spots))
        found, new = [], []
        for (what, _), r in zip(spots, results):
            if not r:
                continue
            r = dict(r, what=what)
            known = self.seen.known(mode.name, r.get("name", ""))
            if known:  # 예전에 알아본 것: 다시 판정하지 않음
                self.seen.seen_again(mode.name, known["name"])
                continue
            new.append(r)
        if not new:
            return
        verdict = None
        try:
            verdict = self.companion.weigh_spots(new, mode, self.cfg.scan_model)[0]
        except _Abandoned:
            raise
        except Exception as exc:  # noqa: BLE001
            log.warning("판정 담당 실패: %r", exc)
        if not verdict:
            return  # 판정을 못 했으면 기억하지 않는다 (별것 아닌 걸로 굳지 않게, 다음에 다시)
        weights = {(v.get("name") or ""): v for v in (verdict or {}).get("items", []) if isinstance(v, dict)}
        for r in new:
            v = weights.get(r.get("name", "")) or {}
            importance = max(1, min(3, int(v.get("importance", 1) or 1)))
            if not r.get("clear"):
                importance = min(importance, 2)  # 잘 안 보인 건 알리지 않음
            found.append(dict(r, importance=importance, why=v.get("why", ""), say=v.get("say", "")))
        self.seen.add(mode.name, found)
        for f in found:
            if f["importance"] >= 2 and session is not None:
                session.add(now, f"알아봄: {f.get('name', '')} — {f.get('info', '')} ({f.get('why', '')})"[:300])
            if f["importance"] >= 3 and f.get("say"):
                self._finds.append((now, f))
        log.info("둘러보기 [%s]: %s", mode.name, ", ".join(f"{f.get('name')}={f['importance']}" for f in found))

    def _pop_finds(self) -> list[dict]:
        now = self.clock()
        finds = [f for t, f in self._finds if now - t <= 180]  # 3분 넘게 지난 건 이미 지나간 장면
        self._finds = []
        return finds[:3]

    def _end_session(self, now: float) -> None:
        s = self.session
        self.session = None
        if s and len(s.notes) >= 3 and s.minutes(now) >= 5:
            self.companion.memory.add_game_record(s.mode.name, s.minutes(now), s.notes)
            self.session_ended.emit(s.mode.name, s.minutes(now), list(s.notes))

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
        """설정 창의 '화면 확인 간격'이 게임 모드 값보다 짧으면 그걸 따른다. 복기 모드 게임 중엔 더 자주.
        게임이 아닐 때 별일 없는 판단이 이어지면(영상 오래 보기 등) 간격을 2배씩 늘린다 (최대 5분, 장면 전환이면 바로 봄)."""
        base = min(mode.interval_seconds, self.cfg.interval_seconds)
        if self.reviewing(mode):
            return min(base, self.cfg.review_interval)
        if self.dense_active(mode):  # 촘촘히 보기: 흐름을 모아서 5초마다
            base = min(base, self.cfg.dense_batch)
        if not mode.is_game and self._quiet_streak >= 3:
            return min(max(base, 300.0), base * 2 ** min(5, self._quiet_streak // 3))
        return base

    def _spiked(self) -> bool:
        """판단한 뒤로 화면이 확 바뀐 적이 있고, 판단 사이 최소 간격이 지났는가."""
        at = self.sampler.spike_at
        if at is None or (self.last_judged is not None and at <= self.last_judged):
            return False
        return self.last_judged is None or self.clock() - self.last_judged >= self.cfg.spike_gap

    def _check_spike(self) -> None:
        """0.5초마다: 확 바뀌었으면 다음 박자(5초)를 기다리지 않고 바로 확인한다."""
        if self.sampler.active and not self.running_job and self._spiked():
            self.last_check = None
            self.tick()

    def dense_active(self, mode: Mode) -> bool:
        return self.cfg.dense == "always" or (self.cfg.dense == "game" and mode.is_game)

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

    def _launch(self, fn: Callable, arg, requested: bool = False) -> None:
        self._job_gen += 1
        gen = self._job_gen
        self._requested_gen = gen if requested else None
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
            if requested and (handler != self._done or value is None or not getattr(value, "speak", False)):
                self.missed.emit()
            self._run_pending()

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
        was_requested = self._requested_gen == self._job_gen
        self._job_gen += 1
        self.running_job = False
        self._stage_at = None
        self.stats["errors"] += 1
        if was_requested:
            self.missed.emit()
        self.activity.emit("")
        self.status.emit("화면 확인이 너무 오래 걸려서 이번 건 건너뛰었어요. 인터넷이나 서버가 잠깐 느린 것 같아요.")
        self._run_pending()
        return True

    def _run_pending(self) -> None:
        if self._pending is not None and not self.running_job:
            fn, arg = self._pending
            self._pending = None
            self.update_mode()
            self._launch(fn, arg, requested=True)

    def blocked_word(self, process: str, title: str) -> str | None:
        """주인님이 '아예 보지 마'라고 한 창·프로그램이면 그 말."""
        memory = getattr(self.companion, "memory", None)
        words = memory.rules_for(None, "skip") if memory is not None and hasattr(memory, "rules_for") else []
        p, t = (process or "").lower(), (title or "").lower()
        for w in words:
            lw = w.lower()
            exe = PROGRAMS.get(w) or PROGRAMS.get(lw) or next((e for e, n in MESSENGERS.items() if n == w), None)
            if (lw and (lw in t or lw in p)) or (exe and exe == p):
                return w
        return None

    def tick(self) -> None:
        self.stats["ticks"] += 1
        self.check_stuck()
        self.update_mode()
        # 0.5초 찍기는 공짜라 화면 보기가 켜져 있는 동안 늘 한다 (말하는 중·말풍선·게임 밖이어도).
        # 멈추는 건 화면 보기를 껐을 때와 '아예 보지 마' 한 창이 앞에 있을 때뿐. AI 판단에 흐름을 붙이는 건 촘촘히 보기 모드일 때
        if self.cfg.dense != "off":
            self.sampler.set_active(self.enabled and not self.blocked_word(self.process, self.window_title))
        else:
            self.sampler.set_active(False)
        if self.running_job or not self.can_run():
            return
        word = self.blocked_word(self.process, self.window_title)
        if word:  # 보지 말라고 한 창이 앞에 있음 → 찍지도, 보내지도, 저장하지도 않는다
            if self._blocked_logged != word:
                log.info("보지 않기로 한 창이 앞에 있어서 화면을 안 봄: %s", word)
            self._blocked_logged = word
            return
        self._blocked_logged = ""
        now = self.clock()
        mode = self.mode
        sample = min(self.cfg.sample_seconds, self.interval_for(mode))  # 살펴보기는 자주(무료), 판단은 _work 에서 가림
        if self.last_check is not None and now - self.last_check < sample:
            return
        # 긴급 경고·총평이 없는 모드는 쉬는 시간 동안 아예 보지 않는다 (판단 비용도 0). 복기 모드는 장면을 계속 모은다
        # 촘촘히 보기 중엔 말을 쉬는 동안에도 흐름은 계속 본다 (판 기록·위험 경고용, 말은 쉬는 시간이 지나야)
        if self.in_cooldown(mode) and not (mode.urgent or mode.review_on_result or self.reviewing(mode)
                                           or self.dense_active(mode)):
            return
        self.last_check = now
        self._launch(self._work, None)

    def ask_analysis(self, question: str = "지금 화면을 자세히 분석해 줘") -> None:
        """단축키(F10)·대화: 판단 없이 지금 화면을 최근 장면들과 함께 자세히 분석한다."""
        if self.running_job:  # 하던 확인이 끝나면 바로 (버리지 않는다)
            self._pending = (self._work_analysis, question)
            return
        self.update_mode()
        self._launch(self._work_analysis, question, requested=True)

    def _remember(self, shot, mode, note=None) -> None:
        if self.screen_log is None:
            return
        try:
            from datetime import datetime

            self.screen_log.save(shot.jpeg, datetime.now(), getattr(mode, "name", ""), shot.title,
                                 (note or {}).get("situation", ""), seq=getattr(shot, "history", None))
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

    def _analyze(self, shot, note, mode, notes, question=None, review: bool = False, deep: bool = False):
        self._stage("analyze_deep" if deep else "analyze")
        frames = (self.frames_for_analysis(shot.jpeg, count=6, min_gap=4.0) if review
                  else self.frames_for_analysis(shot.jpeg))
        kw = {"deep": True} if deep else {}
        return self.companion.analyze(frames, shot.title, mode=mode, session_notes=notes, note=note, question=question,
                                      review=review, focus=shot.focus, focus_label=shot.focus_label, **kw)

    def ask_now(self, question: str = "지금 화면 어때?") -> None:
        """단축키(F8): 판단·간격 무시하고 지금 화면을 보고 말하게 한다."""
        if self.running_job:
            self._pending = (self._work, question)
            return
        self.update_mode()
        self._launch(self._work, question, requested=True)

    def _shot(self) -> Shot:
        img = self.grabber()
        small = cap.shrink(img, self.cfg.max_width)
        shot = Shot(cap.to_jpeg(small, self.cfg.jpeg_quality), cap.thumb(small), self.title)
        shot.native = img
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
        if self.blocked_word(info.process, info.title):  # 보지 말라고 한 메신저
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

    def _zoom_text(self, shot: Shot, note: dict | None) -> None:
        """판단 담당이 '이 부분 글씨가 작다'(read_box)고 하면 그 부분을 원래 해상도로 잘라 대사·분석에 함께 보낸다."""
        box = (note or {}).get("read_box") or []
        if shot.focus is not None or shot.native is None or len(box) != 4:
            return
        try:
            x0, y0, x1, y1 = (min(1.0, max(0.0, float(v))) for v in box)
        except (TypeError, ValueError):
            return
        if x1 - x0 < 0.02 or y1 - y0 < 0.02 or (x1 - x0) * (y1 - y0) > 0.6:
            return  # 너무 작거나(잘못 짚음) 화면 대부분이면 확대할 필요 없음
        img = shot.native
        pad_x, pad_y = 0.03 * img.width, 0.03 * img.height
        crop = img.crop((max(0, int(x0 * img.width - pad_x)), max(0, int(y0 * img.height - pad_y)),
                         min(img.width, int(x1 * img.width + pad_x)), min(img.height, int(y1 * img.height + pad_y))))
        if crop.width < 700:  # 작으면 키워서 (글자가 또렷하게)
            k = min(2.0, 1400 / max(1, crop.width))
            crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.Resampling.LANCZOS)
        if max(crop.size) > 1568:
            k = 1568 / max(crop.size)
            crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.Resampling.LANCZOS)
        shot.focus = cap.to_jpeg(crop, 92)
        shot.focus_label = "판단 담당이 짚은 작은 글씨 부분"
        self._current_focus = (shot.focus, shot.focus_label)

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
        self._current_history = None
        self._current_captions = self.sampler.captions(self.cfg.dense_batch + 3) if self.dense_active(mode) else []
        notes = list(session.notes) if session else (list(self.flow) or None)
        shot = self._shot()
        if question is not None:
            self.last_thumb = shot.thumb
            self._remember(shot, mode)
            if self.cfg.line_quality == "brain":  # 물어본 것도 여럿이 나눠 본 뒤 대답
                return self._brain_say(shot, None, mode, notes, session, question=question)
            return self._say(shot.jpeg, shot.title, None, self.cfg.line_model, question=question,
                                              mode=mode, session_notes=notes)
        now = self.clock()
        since = None if self.last_judged is None else now - self.last_judged
        stale = since is not None and since >= self.cfg.max_skip_minutes * 60
        changed_main = cap.change_amount(self.last_thumb, shot.thumb)
        changed = changed_main
        if shot.focus_thumb is not None:  # 메신저 창에 새 메시지가 오면 큰 화면이 그대로여도 다시 본다 (확인 간격마다)
            changed = max(changed, cap.change_amount(self.last_focus_thumb, shot.focus_thumb))
        settled = cap.change_amount(self._prev_sample, shot.thumb) < self.cfg.change_threshold * 2
        self._prev_sample = shot.thumb
        recent = self.sampler.recent(self.cfg.dense_batch + 0.6) if self.dense_active(mode) else []
        if len(recent) >= 2:  # 그 사이 움직임도 변화로 친다 (지금 화면이 처음과 같아도 중간에 일이 있었을 수 있음)
            changed = max(changed, self.sampler.motion(recent))
        due = since is None or since >= self.interval_for(mode) or (bool(recent) and self._spiked())  # 확인 간격이 지남·확 바뀜
        # 장면 전환은 큰 화면이 크게 바뀌고 멈췄을 때만 (작은 창 속 영상·채팅이 계속 바뀌는 건 확인 간격대로)
        scene = changed_main >= self.cfg.scene_change and settled and (since is None or since >= self.cfg.event_gap)
        if not stale and not (changed >= self.cfg.change_threshold and (due or scene)):
            self.stats["skipped_same"] += 1  # 그대로이거나, 바뀌었지만 아직 확인 간격 전 (다음 살펴보기 때 다시)
            return None
        self._stage("judge")  # 이미 버린 확인이면 여기서 멈춤 (아래 상태를 바꾸지 않게)
        # AI 에겐 순서가 분명하게 '(1/10) 4.5초 전'… 따로따로, 화면 기억엔 한 장으로 모아 저장
        history = self.sampler.ordered(recent) if len(recent) >= 3 else None
        self._current_history = history
        shot.history = self.sampler.sheet(recent, cell_width=360) if history else None
        self.last_thumb = shot.thumb
        self.last_focus_thumb = shot.focus_thumb
        self.frames.append((self.clock(), shot.jpeg))
        self.last_judged = self.clock()
        minutes = None if self.last_spoke is None else (self.clock() - self.last_spoke) / 60
        extra = {"history": history} if history else {}
        if self._current_captions:
            extra["captions"] = self._current_captions
        note = self.companion.judge(shot.jpeg, shot.title, self.cfg.judge_model, minutes, mode, notes, focus=shot.focus,
                                    focus_label=shot.focus_label,
                                    chattiness=self.cfg.chattiness, analysis=self.cfg.analysis,
                                    review=self.reviewing(mode), **extra)
        self.stats["judged"] += 1
        self._remember(shot, mode, note)
        self._zoom_text(shot, note)
        if not note:
            return None
        learn = self._layout_due(mode, note, shot)
        if learn:  # 처음 보는 게임 화면: 조용한 순간에 UI 자리를 한 번 익힌다
            self._learn_layout(shot, mode, learn)
        if self._scan_due(mode, note, shot):  # 짚은 것들을 하나씩 확대해 알아보기
            self._scan(shot, mode, note, session)
        log.info("화면 판단 [%s] %s / %s → %s", mode.name, note.get("scene"), note.get("situation"),
                 "말함" if note.get("speak") or note.get("urgent") else "조용")
        calm = not (note.get("speak") or note.get("urgent") or mode.is_game) and note.get("scene") in ("other", "menu", "loading")
        self._quiet_streak = self._quiet_streak + 1 if calm else 0  # 게임 같은 장면이면 늘리지 않음 (모르는 게임 알아보기)
        now = self.clock()
        scene, urgent = note.get("scene", "other"), bool(note.get("urgent"))
        if not mode.is_game:
            self._count_game(scene, note.get("situation", ""))
        if session:
            session.add(now, note.get("situation", ""))
        elif note.get("situation"):
            import time as _time

            stamp = _time.strftime("%H:%M")
            if not self.flow or not self.flow[-1].endswith(note["situation"]):
                self.flow.append(f"{stamp} {note['situation']}")
        if (mode.review_on_result and scene == "result" and session
                and (session.last_review is None or now - session.last_review > self.cfg.review_gap_seconds)):
            session.last_review = now
            self.stats["reviews"] += 1
            self.result_seen.emit(mode.name)  # 공식 기록이 있는 게임이면 나중에 기록으로 한 번 더 본다
            if self.cfg.deep_result:
                return self._analyze(shot, note, mode, session.notes, deep=True)
            if self.cfg.analysis:
                return self._analyze(shot, note, mode, session.notes)
            return self._say(shot.jpeg, shot.title, note, self.cfg.line_model, mode=mode,
                                              session_notes=session.notes, review=True)
        if (mode.pick_advice and scene == "pick" and session
                and (session.last_pick is None or now - session.last_pick > self.cfg.pick_gap)):
            session.last_pick = now  # 픽 시간은 짧으니 빠른 모드로 바로
            return self._say(shot.jpeg, shot.title, note, self.cfg.line_model, mode=mode, session_notes=notes,
                             pick=True, fast=True)
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
        finds = [] if self.in_cooldown(mode) else self._pop_finds()
        if finds:  # 둘러보기에서 알릴 만한 걸 찾았으면 (판단 담당이 조용히 있으라 해도) 알려 드린다
            note = dict(note, speak=True, point="알아본 것 알려 드리기: " + " / ".join(f.get("say", "") for f in finds))
        if self.in_cooldown(mode) or not note.get("speak"):
            return None
        if self.cfg.analysis and not finds:
            return self._analyze(shot, note, mode, notes)
        if self.cfg.line_quality == "brain":
            return self._brain_say(shot, note, mode, notes, session, finds=finds)
        model = {"auto": self.cfg.economy_line_model, "sonnet": self.cfg.mid_line_model}.get(self.cfg.line_quality,
                                                                                              self.cfg.line_model)
        return self._say(shot.jpeg, shot.title, note, model, mode=mode, session_notes=notes)

    def _brain_say(self, shot, note, mode, notes, session, question: str | None = None, finds: list | None = None):
        """뇌처럼 나눠 보기: 눈 담당(장면 자세히)·대사 담당(자막 받아 적기)을 동시에 돌리고, 기억·지식 담당(이 PC 안)이
        찾은 것과 함께 말하기 담당(Opus)에게 넘긴다. Opus 는 그 기록을 지금 화면과 맞춰 본 뒤 말한다 (틀리면 화면을 믿음)."""
        self._stage("perceive")
        from concurrent.futures import ThreadPoolExecutor

        flow = list(self._current_history or [])[1::2][-5:]  # 흐름 사진은 절반만 (5장)
        caps = list(self._current_captions or [])

        def safely(fn, *args, **kw):
            try:
                return fn(*args, **kw)
            except Exception as exc:  # noqa: BLE001 - 한 담당이 실패해도 나머지로 말한다
                log.warning("나눠 보기 담당 실패: %r", exc)
                return None, 0.0

        with ThreadPoolExecutor(max_workers=2, thread_name_prefix="brain") as pool:
            eye = pool.submit(safely, self.companion.perceive, shot.jpeg, mode, self.cfg.mid_line_model,
                              flow=flow, captions=caps)
            ear = pool.submit(safely, self.companion.read_captions, caps, self.cfg.economy_line_model) if caps else None
            scene = eye.result()[0]
            dialogue = ear.result()[0] if ear else None
        brain = {"scene": scene, "dialogue": dialogue, "found": list(finds or [])}
        if scene and scene.get("happened") and session is not None:  # 판 기록엔 자세히 본 것도 (작은 사진 판단보다 정확)
            session.add(self.clock(), "자세히 본 장면: " + " / ".join(
                str(scene[k]) for k in ("me", "happened") if scene.get(k))[:300])
        # 말하기 담당은 흐름 사진·자막 사진 대신 담당들이 정리한 글 + 지금 화면 원본으로 확인한다 (비용 절약)
        return self._say(shot.jpeg, shot.title, note, self.cfg.line_model, mode=mode, session_notes=notes,
                         question=question, brain=brain, history=None, captions=None)

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
        if self._current_history and kwargs.get("question") is None:
            kwargs.setdefault("history", self._current_history)
        if self._current_captions:
            kwargs.setdefault("captions", self._current_captions)
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
