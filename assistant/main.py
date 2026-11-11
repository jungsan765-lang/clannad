"""캐릭터 비서 실행 진입점.

    python main.py        (Windows에서 콘솔 창 없이: pythonw main.py)

캐릭터를 클릭하면 입력창이 뜨고, 답은 말풍선으로 나온다.
오른쪽 클릭이나 트레이 아이콘 메뉴에서 오늘 사용 금액을 볼 수 있다.
"""

from __future__ import annotations

import json
import logging
import logging.handlers
import os
import subprocess
import sys
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Callable

from PySide6.QtCore import QObject, QPoint, QRunnable, Qt, QThreadPool, QTimer, Signal
from PySide6.QtGui import QAction, QActionGroup, QIcon, QPixmap
from PySide6.QtWidgets import QApplication, QFileDialog, QMenu, QMessageBox, QSystemTrayIcon

import organizer as org
import re
from gamedata.cyphers_data import CyphersData, compact
from gamedata.genshin_data import GenshinData
from gamedata.starrail_data import StarRailData
from screen_log import ScreenLog, recall_window
from secret_store import SecretStore
from ai_client import AIClient, AIError
from companion import Analysis, Companion
from lorebook import LoreBook
from hotkeys import GlobalHotkeys
import charname
from memory import DEFAULT_WHO, Memory
from settings import Settings
from ui.bubble import SpeechBubble
from ui.character import CharacterWindow, SpriteSet
from ui.chat_input import ChatInput
from ui.history_dialog import HistoryDialog
from ui.hoyolab_login import HoyolabLogin, complete as cookies_complete
from ui.analysis_panel import AnalysisPanel
from ui.overlay import GameOverlay, screen_for
from ui.video_dialog import VideoReviewDialog
from ui.organize_dialog import OrganizeDialog
from ui.wishlist_dialog import WishlistDialog
from ui.placeholder import make_placeholder
from ui.status import StatusPill
from ui.topmost import TopmostKeeper
from updater import Updater, confirm_started, count_start, rollback
from usage import UsageLedger
from ui.settings_dialog import RESTART_KEYS, TALK_STYLES, SettingsDialog
from voice.listener import VoiceListener, list_input_devices
from voice.stt import Transcriber
from watch.modes import load_modes, save_mode
from pc_monitor import PC_WORDS, PcMonitor
from pc_monitor import read_status as read_pc_status
from pc_monitor import status_text as pc_status_text
from idle import idle_seconds
from planner import Planner
from progress import Progress
from recall import RECALL_INTENT, EpisodeIndex, recall_block
from tts import Speaker
from wishlist import Wishlist
from watch.watcher import ScreenWatcher, WatchConfig

log = logging.getLogger("assistant")
# 대화에 이런 말이 나오면 원신 계정 정보를 함께 넘긴다
CYPHERS_WORDS = re.compile(r"사이퍼즈|전적|공식전|일반전|킬뎃|딜량|승률|판수|티어|랭크")
GENSHIN_WORDS = re.compile(r"원신|레진|기원|뽑기|천장|픽업|성유물|진열장|파티|일퀘|일일 ?의뢰|파견|주전자|나선|비경|환상극|돌파|특성")
STARRAIL_WORDS = re.compile(r"스타레일|붕스|개척력|워프|광추|유물|차원 ?장신구|일일 ?훈련|시뮬레이션 ?우주|차분화|망각의 ?정원|"
                            r"허구 ?이야기|종말의 ?환영|전쟁의 ?여운|성옥|성혼|행적|뽑기|천장|픽업")


class _Signals(QObject):
    done = Signal(object)
    failed = Signal(str)
    progress = Signal(object)  # 하는 중간중간 소식 (받는 중인 대사, 옮긴 파일 수 등)


TTS_RATES = {"slow": -2, "normal": 0, "fast": 3}
MOMENT_WORDS = re.compile(r"기억해|기억 ?해 ?둬|잊지 ?마|잊으면 안|중요한 거|중요해|메모해|적어 ?둬")
# 화면 보기에 드는 호출 종류 (하루 화면 한도에 들어감). 주인님이 직접 부탁한 대화·분석은 한도와 상관없이 된다
SCREEN_KINDS = ("judge", "screen", "pick", "analysis", "result_review", "official_review", "layout", "perceive",
                "captions", "spot", "weigh")
KIND_KO = {"chat": "대화", "judge": "화면 판단", "screen": "화면 대사", "pick": "픽 조언", "analysis": "분석·복기",
           "result_review": "판 끝난 총평", "official_review": "공식 기록 총평", "memory": "기억 정리", "search": "검색",
           "progress": "진행 정리", "dates": "일정 뽑기", "diary": "일기", "recap": "하루·주간 정리",
           "mode": "게임 모드 만들기", "organize": "파일 정리", "video": "영상 복기", "recall": "기억 찾기 낱말",
           "layout": "화면 배치 익히기", "perceive": "눈 담당 (장면 자세히)", "captions": "대사 담당 (자막 받아 적기)",
           "spot": "확대 담당 (짚은 것 알아보기)", "weigh": "판정 담당 (알릴 만한지)"}


class _TtsSignals(QObject):
    state = Signal(bool)


class Job(QRunnable):
    """오래 걸리는 일(API 호출)을 화면이 멈추지 않게 뒤에서 돌린다."""

    def __init__(self, fn: Callable, *args):
        super().__init__()
        self.fn, self.args, self.kwargs = fn, args, {}
        self.signals = _Signals()

    def run(self) -> None:
        try:
            result = self.fn(*self.args, **self.kwargs)
        except AIError as exc:
            self.signals.failed.emit(str(exc))
        except Exception as exc:  # noqa: BLE001 - 예상 못 한 오류도 말풍선으로 알려주고 기록
            log.exception("작업 실패")
            self.signals.failed.emit(f"문제가 생겼어요: {exc}")
        else:
            self.signals.done.emit(result)


class AssistantApp(QObject):
    def __init__(self, settings: Settings, companion: Companion, ledger: UsageLedger, sprites: SpriteSet,
                 pool: QThreadPool | None = None, tray: bool = True):
        super().__init__()
        self.settings = settings
        self.companion = companion
        # 지금 나와 있는 캐릭터 (메뉴 '캐릭터'에서 바꾸면 저장하고 다시 켠다)
        self.char_key = str(settings.get("character.key", DEFAULT_WHO) or DEFAULT_WHO)
        self.char_name = companion.name
        charname.NAME = self.char_name  # 창·자막에 보이는 이름
        self.ledger = ledger
        self.pool = pool or QThreadPool.globalInstance()
        self.busy = False
        self._voice_state = ""  # 목소리 입력 상태 (listening·heard = 주인님이 말하는 중)
        self.jobs: set[Job] = set()
        self.state_path = settings.data_dir / "state.json"
        if self.char_key != DEFAULT_WHO and not self.pref(f"character.since.{self.char_key}", ""):
            self.set_pref(f"character.since.{self.char_key}", datetime.now().date().isoformat())  # 일기는 처음 나온 날부터

        self.window = CharacterWindow(sprites, max_fps=float(settings.get("character.max_fps", 30)))
        self.bubble = SpeechBubble(int(settings.get("ui.bubble_max_width", 320)),
                                   float(settings.get("ui.bubble_min_seconds", 4.0)),
                                   float(settings.get("ui.bubble_seconds_per_char", 0.12)))
        self.input = ChatInput()
        self.status = StatusPill(self.anchor)  # 캐릭터 아래 '지금 하는 일' 표시
        self._apply_bubble_time(str(self.pref("ui.bubble_time", "normal")))  # 말풍선이 떠 있는 시간
        self.analysis_panel = AnalysisPanel(self.anchor)  # 분석 모드의 자세한 내용
        self.overlay = GameOverlay()  # 게임 모니터 위 자막 (입력은 그대로 게임으로)
        companion.analysis_effort = str(settings.get("ai.analysis_effort", "medium"))
        self.status.set_enabled(bool(self.pref("ui.show_status", True)))
        self.pc_monitor = PcMonitor()
        self.pc_timer = QTimer(self)  # PC 상태 (내 PC, 비용 없음)
        self.pc_timer.timeout.connect(self.check_pc)
        self._last_clip = -1e9
        self._last_pet = -1e9
        self.idle_seconds = idle_seconds  # 테스트에서 바꿔 끼움
        self.clock = time.monotonic
        self._away_since: float | None = None  # 자리 비운 때 (자는 중 등)
        self.away_timer = QTimer(self)
        self.away_timer.timeout.connect(self.check_away)
        self._tts_signals = _TtsSignals()
        self._tts_signals.state.connect(self._on_tts_state)
        self.speaker = Speaker(rate=TTS_RATES.get(str(self.pref("voice.speak_rate", "normal")), 0),
                               on_state=self._tts_signals.state.emit)
        self._pc_busy = False
        self._streamed = False
        companion.fast = bool(self.pref("ai.fast", False))
        companion.can_search = bool(self.pref("ai.web_search", True))
        companion.user_names = split_names(self.pref("user.nickname", ""))
        self._last_question = ""
        self.organizer = org.Organizer(settings.data_dir / "organize_log.jsonl")
        self.organizing = False

        # 화면 보기 (정해진 간격마다 모니터 하나를 보고 말 걸기)
        g = settings.get
        self.watch_cfg = WatchConfig(
            interval_seconds=float(g("screen.interval_seconds", 30)), monitor=str(g("screen.monitor", "left")),
            judge_model=g("screen.judge_model", "claude-haiku-5-5"), line_model=g("screen.line_model", "claude-opus-5-5"),
            cooldown_seconds=float(g("screen.cooldown_seconds", 90)),
            chattiness=str(g("screen.chattiness", "normal")),
            max_skip_minutes=max(10.0, float(g("screen.max_skip_minutes", 15))),  # 그대로인 화면은 10분+에 한 번만
            change_threshold=float(g("screen.change_threshold", 0.015)),
            max_width=int(g("screen.max_width", 1920)), jpeg_quality=int(g("screen.jpeg_quality", 85)))
        modes = self._load_modes()
        self.watcher = ScreenWatcher(companion, self.watch_cfg, self._run, modes=modes, can_run=self._screen_allowed)
        self.watcher.mode_changed.connect(lambda _: self._refresh_cost())
        self.watcher.spoke.connect(self._on_screen_line)
        self.watcher.status.connect(self._on_watch_status)
        self.watcher.activity.connect(self._on_watch_activity)
        self.watcher.new_game.connect(lambda p, t, seen: self.make_game_mode(p, t, seen, auto=True))
        self.watcher.result_seen.connect(self._on_result_seen)
        self.watcher.session_started.connect(self._on_game_started)
        self.watcher.session_ended.connect(self._on_game_ended)
        self._record_wait: dict | None = None  # 결과 화면 뒤 공식 기록이 올라오길 기다리는 중
        # 화면 기억: 바뀐 화면을 날짜별로 이 PC 에 (보관 기간·최대 용량을 넘으면 오래된 날부터 지움)
        self.screen_log = ScreenLog(settings.data_dir / "screens", int(self.pref("screen.memory_days", 180)),
                                    float(self.pref("screen.memory_gb", 100)), bool(self.pref("screen.memory", True)))
        self.watcher.screen_log = self.screen_log
        from watch.layout import Layouts

        self.layouts = Layouts(settings.data_dir / "layout")  # 게임마다 UI 자리 (처음 볼 때 한 번 익힘)
        self.watcher.layouts = companion.layouts = self.layouts
        self.watcher.layout_model = self.watch_cfg.mid_line_model
        self.watcher.tune_sampler()
        from watch.scan import SeenThings

        self.seen = SeenThings(settings.data_dir / "scan")  # 둘러보기로 알아본 것 (게임마다)
        self.watcher.seen = companion.seen = self.seen
        self.watch_cfg.scan = bool(self.pref("screen.scan", True))
        from local_ai import DEFAULT_MODEL, LocalAI

        # 내 PC AI: 남는 CPU 로 눈 담당·둘러보기 확대·판정 (Ollama, 그래픽카드 안 씀). 켤 때와 10분마다 연결 확인
        self.local_ai = LocalAI(model=str(self.pref("local.model", DEFAULT_MODEL)), cpu=str(self.pref("local.cpu", "half")))
        self.local_ai.enabled = bool(self.pref("local.enabled", True))
        ctx_model = str(self.pref("local.context_model", ""))
        self.local_ai.context_model = "" if ctx_model in ("gemma3:12b",) else ctx_model  # 예전 기본값(12b)은 메모리 때문에 접음
        companion.local = self.local_ai
        self._local_timer = QTimer(self)
        self._local_timer.timeout.connect(self.check_local_ai)
        self._local_timer.start(10 * 60 * 1000)
        QTimer.singleShot(5000, self.check_local_ai)
        # 맥락 담당: 게임 중 내 PC AI 가 계속 지켜보며 '지금까지 흐름'을 적는다 (판단·말하기에 붙임)
        from companion import _shrink_jpeg
        from watch.context import ContextKeeper

        # 게임 소리 듣기: 스피커로 나가는 소리에서 대사를 받아씀 (이 PC, 게임 중에만, 다니카가 말할 땐 안 들음)
        from watch.ears import GameEars, Whisper

        w = self.watcher
        self._tts_speaking = False
        self.ears = GameEars(active=lambda: w.sampler.active and w.mode.is_game, muted=lambda: self._tts_speaking,
                             transcribe=Whisper(str(self.pref("ears.model", "medium")), threads=4))
        self.ears.enabled = bool(self.pref("ears.enabled", True))
        self.watcher.ears = self.ears
        self.ears.start()
        hud, ears = self.watcher.hud, self.ears
        self.context_keeper = ContextKeeper(
            self.local_ai, self.watcher.sampler, shrink=_shrink_jpeg,
            notes_since=lambda start: [f"{n}: {x}" for _, n, x in hud.recent(180, since=start) + ears.recent(180, since=start)])
        self.context_keeper.enabled = bool(self.pref("local.context", True))
        self.watcher.context = self.context_keeper
        w = self.watcher
        self.context_keeper.start(lambda: w.mode.name if (w.sampler.active and w.mode.is_game) else None)
        self.watch_cfg.auto_read = bool(self.pref("screen.auto_read", True))
        self.watch_cfg.deep_result = self.pref("screen.result_depth", "deep") == "deep"
        saved = self._load_state().get("prefs", {})
        if not saved.get("screen.lite_offered"):
            if saved.get("screen.line_quality") in ("auto", "brain"):  # 예전 기본값: 한 번만 '나눠 보기 · 절약'으로 (주인님 요청)
                self.set_pref("screen.line_quality", "brain_lite")
            self.set_pref("screen.lite_offered", True)  # 그 뒤에 다시 고르면 그대로 둔다
        self.watch_cfg.line_quality = str(self.pref("screen.line_quality", "brain_lite"))
        import local_ocr

        self.watcher.sampler.ocr = local_ocr.read_text  # 자막·대사는 이 PC 글자 인식으로 먼저 (공짜)
        self.watcher.hud.ocr = local_ocr.read_text  # 퀘스트 안내·알림·킬 로그도 계속 읽기
        self.watcher.page_ocr = local_ocr.read_windows  # 의뢰·일지·메뉴 창은 화면 전체 글자를 원래 크기로
        self.watcher.can_show = self._screen_can_show  # 주인님이 대화·입력·말하는 중엔 화면 얘기를 띄우지도 기억하지도 않음
        local_ocr.paddle_enabled = bool(self.pref("local.paddle_ocr", True))  # 정밀 글자 인식 (Windows 글자 인식이 틀릴 때)
        local_ocr.warm_up()
        self.watch_cfg.dense = str(self.pref("screen.dense", "game"))
        self.watch_cfg.eye = str(self.pref("screen.eye", "fast"))
        self.watch_cfg.rush = bool(self.pref("screen.rush", True))
        if not self.pref("screen.fast_off_done", False):  # 주인님 결정: 빠른 모드는 효과가 작아 끔 (한 번만, 다시 켜면 그대로)
            self.set_pref("screen.fast_opus", False)
            self.set_pref("screen.fast_off_done", True)
        self.watch_cfg.fast_opus = bool(self.pref("screen.fast_opus", False))
        self.companion.quick_lines = bool(self.pref("screen.sonnet_quick", False))  # 평소 한마디(Sonnet)를 생각 없이 바로 (기본 끔)
        self.companion.drafts = bool(self.pref("screen.drafts", True))  # 화면 한마디: 후보 3개 중 성격에 맞는 걸 골라서
        self.cleanup_timer = QTimer(self)
        self.cleanup_timer.timeout.connect(lambda: self._run(self.screen_log.cleanup, lambda _: None, log.warning))
        self.watcher.known_games |= {p for m in modes for p in m.processes}
        self.watcher.known_games |= set(self._load_state().get("auto_mode_tried", []))
        self.wishlist = Wishlist(settings.data_dir / "requests.json")
        self.planner = Planner(settings.data_dir)
        companion.planner = self.planner
        self.progress = Progress(settings.data_dir)
        self._last_chores = -1e9
        # 떠올리기: 모든 대화·화면 일지·분석을 이 PC 의 색인(data/memory.db)에 넣어 두고 "그때 그거"를 찾는다
        self.recall_index = EpisodeIndex(settings.data_dir / "memory.db")
        self.recall_timer = QTimer(self)
        self.recall_timer.timeout.connect(self.sync_recall)
        self._recall_busy = False
        self._diary_busy = False
        self.planner_timer = QTimer(self)  # 알림 시각 확인 (내 PC, 비용 없음)
        self.planner_timer.timeout.connect(self.check_reminders)
        # 원신 계정 정보 (진열장·실시간 메모·기원 기록). 로그인 정보는 이 PC 사용자만 풀 수 있게 암호화
        self.secrets = SecretStore(settings.data_dir / "secrets.bin")
        self.genshin = GenshinData(settings.data_dir / "genshin", uid=str(self.pref("genshin.uid", "") or ""),
                                   cookies=lambda: self.secrets.get("hoyolab"))
        # 스타레일도 같은 HoYoLAB 로그인으로 (개척력·일일 훈련·워프 기록)
        self.starrail = StarRailData(settings.data_dir / "starrail", uid=str(self.pref("starrail.uid", "") or ""),
                                     cookies=lambda: self.secrets.get("hoyolab"))
        self._starrail_busy = False
        # 사이퍼즈 전적 (네오플 공식 API). API 키도 이 PC 사용자만 풀 수 있게 암호화
        self.cyphers = CyphersData(settings.data_dir / "cyphers", api_key=lambda: self.secrets.get("neople"),
                                   nickname=str(self.pref("cyphers.nickname", "") or ""))
        self._cyphers_busy = False
        companion.extra_context = self._game_context
        companion.recaller = self.recall_for_screen
        companion.on_game_knowledge = self._save_game_knowledge  # 주인님이 알려 준 게임 지식 → 게임 사전
        self.genshin_timer = QTimer(self)
        self.genshin_timer.timeout.connect(lambda: self.refresh_genshin())
        self.genshin_timer.timeout.connect(lambda: self.refresh_starrail())
        self.genshin_timer.timeout.connect(lambda: self.refresh_cyphers() if self.watcher.mode.name == "사이퍼즈" else None)
        self._genshin_busy = False
        self._last_mode = "평소"
        self.watcher.mode_changed.connect(self._on_mode_changed)
        self.watcher.mode_changed.connect(lambda _: self.check_away() if self._away_since is not None else None)
        self._screen_searches: list[float] = []
        self.watcher.nothing.connect(lambda: self.bubble.hide() if self.bubble.text == "……" else None)
        self.watcher.partial.connect(self._on_screen_partial)  # 화면 대사가 나오는 대로 말풍선에 (1초라도 빨리)
        self.watcher.moment.connect(self._on_moment)  # 확 바뀐 순간: 말보다 먼저 표정으로
        self._moment_seq = 0
        self.watcher.partial_cancel.connect(self._on_screen_partial_cancel)
        self._screen_partial = ""
        self.watcher.missed.connect(self._on_screen_missed)
        self._last_watch_error = ""

        # 목소리로 말 걸기 (항상 듣기 / 단축키로 듣기 / 듣지 않기)
        stt = Transcriber(g("voice.model", "small"), g("voice.device", "cpu"),
                          download_root=str(settings.data_dir / "whisper"))
        wake = str(g("voice.wake_word", "") or "")
        if wake == "다니카" and self.char_key != DEFAULT_WHO:  # 부르는 말을 '다니카'로 해 뒀으면 지금 캐릭터 이름으로
            wake = self.char_name
        self.voice = VoiceListener(stt, wake_word=wake,
                                   device=str(g("voice.mic", "") or ""))
        self.voice.heard.connect(self._on_heard)
        self.voice.state.connect(self._on_voice_state)
        self.voice.error.connect(lambda m: self.bubble.show_text(m, self.anchor(), system=True, seconds=8))
        self.hotkeys: GlobalHotkeys | None = None

        # 자동 업데이트 (GitHub 작업 브랜치에서 바뀐 파일만)
        self.updater = Updater(settings.root, settings.data_dir / "update_state.json",
                               str(g("update.repo", "jungsan765-lang/clannad")),
                               str(g("update.branch", "ccr-49bbcf3c-9rks61")))
        self.update_timer = QTimer(self)
        self.update_timer.timeout.connect(lambda: self.check_update())
        self.update_pending = False

        self.menu = self._build_menu()
        # 캐릭터 → 말풍선 → 하는 일 표시 → 입력창 순서로 (뒤에 올린 것이 더 앞)
        self.topmost = TopmostKeeper([self.overlay, self.window, self.bubble, self.status, self.input],
                                     int(settings.get("character.topmost_interval_ms", 1500)), self)

        self.window.clicked.connect(self.open_input)
        self.window.petted.connect(self._on_petted)
        self.window.menu_requested.connect(lambda pos: self.menu.exec(pos))
        self.window.moved.connect(self._save_position)
        self.window.moved.connect(lambda _: self.status.refresh())
        self.input.submitted.connect(self.ask)
        self.bubble.hidden_by_timeout.connect(self._bubble_done)

        self.tray = None
        if tray and QSystemTrayIcon.isSystemTrayAvailable():
            first = sprites.frames(sprites.default)[0]
            self.tray = QSystemTrayIcon(QIcon(first.scaled(64, 64)), self)
            self.tray.setContextMenu(self.menu)
            self.tray.activated.connect(lambda reason: self.open_input() if reason == QSystemTrayIcon.ActivationReason.Trigger else None)
            self.tray.show()
        self._refresh_cost()

    # ------------------------------------------------------------ 시작·종료

    def start(self) -> None:
        pos = self._load_state().get("window_pos")
        if pos:
            self.window.move(*pos)
        else:
            screen = QApplication.primaryScreen().availableGeometry()
            self.window.move(screen.right() - self.window.width() - 40, screen.bottom() - self.window.height() - 20)
        self.window.show()
        if settings_flag(self.settings, "character.always_on_top", True):
            self.topmost.start()
        if "appear" in self.window.sprites.motions:
            self.window.play("appear")
        self.set_screen_enabled(bool(self.pref("screen.enabled", True)), save=False)
        self.set_voice_mode(str(self.pref("voice.mode", "off")), save=False)
        if not self.pref("screen.overlay_v2", False):  # 자막 기본값이 '중요한 것만'으로 바뀜 (예전 기본 game → important)
            if self.pref("screen.overlay", "important") == "game":
                self.set_pref("screen.overlay", "important")
            self.set_pref("screen.overlay_v2", True)
        coach = self.pref("screen.coach", None)
        if coach is None:  # 예전 설정(분석 모드 켜기/끄기)
            coach = "analysis" if self.pref("screen.analysis", False) else "off"
        self.set_coach(str(coach), save=False)
        self._register_hotkeys()
        if settings_flag(self.settings, "update.auto", True):
            QTimer.singleShot(3000, lambda: self.check_update(startup=True))
            self.update_timer.start(round(float(self.settings.get("update.check_hours", 6)) * 3600 * 1000))
        if self.companion.memory.my_pending:  # 지난번에 정리 못 한 대화가 있으면 지금 정리
            self._consolidate()
        self.genshin_timer.start(10 * 60 * 1000)  # 원신 실시간 메모는 10분마다
        self.cleanup_timer.start(6 * 3600 * 1000)
        self.planner_timer.start(20_000)
        self.recall_timer.start(120_000)
        QTimer.singleShot(3000, self.sync_recall)  # 예전 기록도 처음 한 번 색인
        self.away_timer.start(30_000)
        self.set_pc_monitor(bool(self.pref("pc.monitor", True)))
        QTimer.singleShot(5000, self.check_reminders)  # 꺼져 있던 동안 지난 알림
        QTimer.singleShot(25_000, self.briefing)  # 하루 첫 실행이면 브리핑 (원신 정보를 받아 온 뒤)
        QTimer.singleShot(20_000, lambda: self._run(self.screen_log.cleanup, lambda _: None, log.warning))
        QTimer.singleShot(8000, lambda: self.refresh_genshin())
        QTimer.singleShot(12000, lambda: self.refresh_starrail())

    def quit(self) -> None:
        self.update_timer.stop()
        self.planner_timer.stop()
        self.pc_timer.stop()
        self.recall_timer.stop()
        self.watcher.sampler.stop()
        self.context_keeper.stop()
        self.ears.stop()
        self.away_timer.stop()
        self.genshin_timer.stop()
        self.cleanup_timer.stop()
        self.watcher.set_enabled(False)
        self.voice.shutdown()
        if self.hotkeys:
            self.hotkeys.unregister_all()
        self.topmost.stop()
        self._save_position(self.window.pos())
        if self.tray:
            self.tray.hide()
        QApplication.quit()

    # ------------------------------------------------------------ 대화

    def anchor(self):
        return self.window.frameGeometry()

    def open_input(self) -> None:
        if self.busy:
            self.bubble.show_text("……", self.anchor(), seconds=2)
            return
        self.input.open_near(self.anchor())

    def ask(self, text: str) -> None:
        if self.busy:
            return
        self.busy = True
        self.voice.paused = True  # 답을 기다리는 동안 들은 말은 무시
        if self.bubble.isVisible():  # 지난 대사는 치운다 (말풍선 대신 아래 작은 표시로 '생각 중')
            self.bubble.hide()
            self._bubble_done()
        self.status.begin("chat", "생각 중")
        self._streamed = False
        self._last_question = text
        self._moment_request = text if MOMENT_WORDS.search(text) else None
        context = self.watcher.chat_context()  # 게임 중이면 이번 판 기록을 함께 넘긴다
        mode = self.watcher.mode.name
        infos = []
        if self.genshin.has_uid and (mode == "원신" or GENSHIN_WORDS.search(text)):
            infos.append(self.genshin.context_text())
        if self.starrail.has_uid and (mode == "스타레일" or STARRAIL_WORDS.search(text)):
            infos.append(self.starrail.context_text())
        if self.cyphers.ready and (mode == "사이퍼즈" or CYPHERS_WORDS.search(text)):
            infos.append(self.cyphers.context_text())
        for game in self.progress.games:  # 하는 중이거나 말에 나온 게임의 진행 (스포일러 경계)
            if (mode == game or game in text) and self.progress.text_for(game):
                infos.append(self.progress.prompt_text(game))
        if "화면" in text:
            reason = self.screen_pause_reason()
            state = ("꺼져 있음" if not self.watcher.enabled else f"쉬는 중 — {reason}" if reason
                     else f"켜져 있음 ({self.watcher.status_text()})")
            infos.append(f"[지금 네 화면 보기 상태: {state}. 주인님이 화면을 왜 안 보냐고 하면 이걸로 설명한다]")
        if PC_WORDS.search(text) and self.pc_monitor.last is not None:  # "컴퓨터 왜 이렇게 느려?"
            infos.append(pc_status_text(self.pc_monitor.last))
        for info in infos:
            if info:
                context = (context + "\n" if context else "") + info
        images = []
        window = recall_window(text, datetime.now()) if self.screen_log.enabled else None
        if window:  # "아까 3시쯤 뭐 했지?" → 그 시간대 화면 일지(와 콕 집은 시각이면 그때 화면)
            start, end, at = window
            diary = self.screen_log.diary(start, end)
            if diary:
                context = ((context + "\n") if context else "") + (
                    f"[화면 기억 — {start:%m/%d %H:%M}~{end:%H:%M} 에 저장해 둔 화면 일지 (시각 [모드] 상황). "
                    "주인님이 지난 일을 물으면 이걸 근거로 답한다]\n" + diary)
            if at is not None:
                images = [(f"({e.time:%H:%M} 화면)", e.file.read_bytes()) for e in self.screen_log.nearest(at)]
        live = self._live_game_view_allowed()

        def work(t, progress):
            # 떠올리기는 뒤에서 (색인 찾기·필요하면 낱말 넓히기 — 화면이 멈추지 않게)
            ctx, imgs = context, images
            if live and not imgs:  # 게임 중엔 지금 화면도 같이 (판 기록의 짐작만 믿고 틀리지 않게, 1280 한 장 ≈ 7원)
                shot, raw = self._live_game_view()
                if shot:
                    imgs = [("(지금 게임 화면 — 판 기록·네 기억보다 이 화면을 먼저 믿는다)", shot)]
                page = self.watcher.page_text(5.0) or (self.watcher.read_page_now(raw) if raw is not None else "")
                if page:  # 의뢰·일지 창이면 이 PC 가 원래 크기로 읽은 글도 (작은 글씨를 잘못 읽지 않게)
                    ctx = ((ctx + "\n") if ctx else "") + ("[지금 화면 글자 — 이 PC 가 원래 크기로 읽음. '보상'은 '완료·획득'이 "
                                                            "적혀 있지 않으면 앞으로 받을 것] " + page)
            memory_text, recalled = self.recall_for(t, window)
            if memory_text:
                ctx = ((ctx + "\n") if ctx else "") + memory_text
                if not imgs:  # 떠올린 일이 화면 장면이면 그때 화면 한 장 (자세히 기억나게)
                    imgs = self._recall_images(recalled)
            return self.companion.reply(t, context=ctx, on_partial=progress, images=imgs)

        self._run(work, self._on_reply, self._on_error, text, on_progress=self._on_partial)

    def _live_game_view_allowed(self) -> bool:
        """게임 중이고 화면 보기가 켜져 있고, 보지 말라고 한 창이 아닐 때만."""
        w = self.watcher
        if not (w.enabled and w.session is not None and w.mode.is_game and self.pref("chat.live_view", True)):
            return False
        return not w.blocked_word(w.process, w.window_title)

    def _live_game_view(self) -> tuple[bytes | None, object]:
        """대화에 붙일 지금 게임 화면 (1280 jpeg, 원래 크기 그림 — 글자 읽기용)."""
        try:
            from watch import capture as cap

            img = self.watcher.grabber()
            return cap.to_jpeg(cap.shrink(img, 1280), 85), img
        except Exception as exc:  # noqa: BLE001 - 못 찍어도 대화는 됨
            log.debug("대화용 지금 화면 못 찍음: %r", exc)
            return None, None

    # ------------------------------------------------------------ 떠올리기

    def sync_recall(self) -> None:
        """원본 기록(대화·화면 일지)의 새 줄을 색인에 넣는다 (뒤에서, 비용 없음). 날이 바뀌었으면 일기도."""
        if self._recall_busy:
            return
        self._recall_busy = True

        def done(_n) -> None:
            self._recall_busy = False
            self.backup_memory()
            self.write_diaries()

        def fail(message: str) -> None:
            self._recall_busy = False
            log.warning("기억 색인 실패: %s", message)

        def work():
            n = self.recall_index.sync(self.settings.data_dir)
            # 새 기억 조각의 뜻 좌표 (내 PC 기억 검색 모델, 다른 일이 기다리면 다음에)
            self.recall_index.embed_pending(lambda texts: self.local_ai.embed(texts, background=True, timeout=120))
            return n

        self._run(work, done, fail)

    def recall_for(self, text: str, window=None):
        """주인님 말에 맞는 예전 일 (지금 대화 기록에 이미 있는 건 빼고)."""
        try:
            turns = self.companion.memory.recent[-self.companion.history_turns * 2:]
            recent_since = turns[0]["time"] if turns else None
            # 시간을 콕 집은 말(어제·오늘·3시·아까)일 때만 그 시간대로 좁힌다. '그때·전에'는 언제든
            pinpoint = re.search(r"어제|그저께|그제|오늘|아까|방금|\d{1,2}\s*시", text)
            span = (window[0], window[1]) if window and pinpoint else None
            block, eps = recall_block(self.recall_index, text, datetime.now(), recent_since, span, embed=self._embed)
            meant = any(e.sim >= 0.6 for e in eps)  # 뜻으로 찾은 게 있으면 돈 드는 '비슷한 말 찾기'는 안 함
            if RECALL_INTENT.search(text) and not meant and (not eps or eps[0].score < 4.0):  # 약하게 나오면 낱말을 넓혀 한 번 더
                try:
                    extra = self.companion.expand_cues(text, self.watch_cfg.judge_model)
                except Exception as exc:  # noqa: BLE001
                    log.warning("낱말 넓히기 실패: %s", exc)
                    extra = []
                if extra:
                    block2, eps2 = recall_block(self.recall_index, text, datetime.now(), recent_since, span,
                                                extra_words=extra, embed=self._embed)
                    if eps2 and (not eps or eps2[0].score > eps[0].score):
                        return block2, eps2
            return block, eps
        except Exception:  # noqa: BLE001 - 떠올리기가 안 돼도 대화는 된다
            log.exception("떠올리기 실패")
            return "", []

    def _save_game_knowledge(self, game: str, text: str, when) -> None:
        from lorebook import save_taught

        game = game or (self.watcher.mode.name if self.watcher.mode.is_game else "일반")
        new = save_taught(self.settings.data_dir / "knowledge", game, text, when)
        self.companion.lorebook.entries[:0] = new  # 앞에 넣어 같은 점수면 먼저 꺼내지게 (주인님 말이 우선)

    def _embed(self, texts: list[str], timeout: float = 6.0):
        """기억을 뜻으로 찾을 때 쓰는 뜻 좌표 (내 PC 기억 검색 모델, 없으면 None → 낱말로만 찾음)."""
        ai = getattr(self, "local_ai", None)
        return ai.embed(texts, timeout=timeout) if ai is not None else None

    def recall_for_screen(self, seen: str) -> str:
        """화면 대사용: 지금 상황과 이어지는 예전 일 (6시간보다 오래된 것, 아주 확실한 것 2개까지, 사진 없음)."""
        try:
            since = (datetime.now() - timedelta(hours=6)).isoformat(timespec="seconds")
            # 화면 대사는 1초라도 빨리: 뜻으로 찾기는 0.8초 안에 못 하면 낱말로만
            text, _ = recall_block(self.recall_index, seen, datetime.now(), since, max_chars=700, for_screen=True,
                                   min_score=8.0, embed=lambda t: self._embed(t, timeout=0.8))
            return text
        except Exception:  # noqa: BLE001
            log.exception("화면용 떠올리기 실패")
            return ""

    def _recall_images(self, episodes) -> list:
        for e in episodes[:3]:
            if e.kind in ("screen", "moment") and e.ref and Path(e.ref).is_file():
                try:
                    return [(f"(그때 화면: {e.when()} {e.game})", Path(e.ref).read_bytes())]
                except OSError:
                    return []
        return []

    BACKUP_FILES = ("memory.json", "pinned.json", "terms.json", "rules.json", "planner.json", "progress.json",
                    "knowledge.json", "recent.json")

    def backup_memory(self, keep: int = 14) -> Path | None:
        """하루 한 번 기억 파일들을 data/backup/날짜/ 에 복사 (최근 keep 일치만). 잘못 지우거나 망가져도 되돌릴 수 있게."""
        import shutil

        data = self.settings.data_dir
        folder = data / "backup" / datetime.now().date().isoformat()
        if folder.exists():
            return None
        try:
            folder.mkdir(parents=True)
            for name in self.BACKUP_FILES:
                if (data / name).is_file():
                    shutil.copy2(data / name, folder / name)
            days = sorted(p for p in (data / "backup").iterdir() if p.is_dir())
            for old in days[:-keep]:
                shutil.rmtree(old, ignore_errors=True)
        except OSError as exc:
            log.warning("기억 백업 실패: %s", exc)
            return None
        log.info("기억 백업: %s", folder)
        return folder

    def write_diaries(self) -> None:
        """새벽 5시가 지나면 지난 날(최대 7일 전까지)의 일기를 쓴다 (싼 모델, 하루 한 편). data/diary/날짜.md + 떠올리기 색인.
        캐릭터마다 따로(다니카 diary/, 다른 캐릭터 diary_이름/), 그 캐릭터가 처음 나온 날부터."""
        if self._diary_busy or not self.pref("memory.diary", True):
            return
        now = datetime.now()
        if now.hour < 5:
            return
        folder = self.diary_dir
        since = str(self.pref(f"character.since.{self.char_key}", "") or "")
        days = [d for d in ((now.date() - timedelta(days=i)).isoformat() for i in range(1, 8)) if d >= since]
        todo = [d for d in days if not (folder / f"{d}.md").exists()]
        last_monday = now.date() - timedelta(days=now.weekday() + 7)
        week_file = folder / f"week-{last_monday.isoformat()}.md"
        if not todo and (week_file.exists() or not any(folder.glob("????-??-??.md"))):
            return
        self._diary_busy = True
        from recall import diary_material

        def work():
            self.recall_index.sync(self.settings.data_dir)  # 다른 sync 가 돌고 있으면 건너뜀 (색인 잠금)
            written = []
            self._write_weekly(folder, now)
            tries_path = folder / ".tries.json"
            try:
                tries = json.loads(tries_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                tries = {}
            for day in sorted(todo):
                material = diary_material(self.recall_index, day)
                folder.mkdir(parents=True, exist_ok=True)
                if len(material) < 80:  # 그날 기록이 거의 없음
                    (folder / f"{day}.md").write_text(f"# {day}\n\n(기록이 거의 없는 날)\n", encoding="utf-8")
                    continue
                if tries.get(day, 0) >= 2:  # 두 번 실패하면 더 부르지 않음 (2분마다 비용이 나가지 않게)
                    (folder / f"{day}.md").write_text(f"# {day}\n\n(일기를 쓰지 못한 날 — 그날 기록은 기억 창 '찾아보기'에서)\n",
                                                      encoding="utf-8")
                    continue
                tries[day] = tries.get(day, 0) + 1
                tries_path.write_text(json.dumps(tries), encoding="utf-8")
                diary = self.companion.write_diary(day, material, self.watch_cfg.judge_model)
                if diary:
                    (folder / f"{day}.md").write_text(f"# {day}\n\n{diary}\n", encoding="utf-8")
                    who = "" if self.char_key == DEFAULT_WHO else f"{self.char_key}:"
                    label = "일기" if not who else f"{self.char_name}의 일기"
                    self.recall_index.add(f"{day}T23:59:00", "diary", f"{day} {label}: {diary}", source=f"diary:{who}{day}")
                    written.append(day)
            return written

        def done(written) -> None:
            self._diary_busy = False
            if written:
                log.info("일기 씀: %s", ", ".join(written))
            today = datetime.now().date().isoformat()  # 일기를 쓴 날 하루 한 번만, 대화가 적어도 장기기억 정리
            if written and self.companion.memory.my_pending and self.pref("memory.consolidated_day", "") != today:
                self.set_pref("memory.consolidated_day", today)
                self._consolidate()

        def fail(message: str) -> None:
            self._diary_busy = False
            log.warning("일기 쓰기 실패: %s", message)

        self._run(work, done, fail)

    def save_moment(self, user_text: str, reply_text: str) -> None:
        """주인님이 '기억해'라고 한 순간: 그때 화면 한 장 + 대화 + 최근 화면 흐름을 일화로 (떠올릴 때 더 잘 나옴)."""
        ref = ""
        if self.watcher.frames:
            t, jpeg = self.watcher.frames[-1]
            if self.watcher.clock() - t < 180:  # 3분 안의 화면이면
                folder = self.settings.data_dir / "moments"
                try:
                    folder.mkdir(parents=True, exist_ok=True)
                    path = folder / f"{time.strftime('%Y%m%d_%H%M%S')}.jpg"
                    path.write_bytes(jpeg)
                    ref = str(path)
                except OSError as exc:
                    log.warning("순간 화면 저장 실패: %s", exc)
        mode = self.watcher.mode
        flow = " / ".join(list(self.watcher.flow)[-5:]) if not mode.is_game else ""
        try:
            self.recall_index.add(datetime.now().isoformat(timespec="seconds"), "moment",
                                  f"주인님: {user_text}\n{self.char_name}: {reply_text}", detail=flow,
                                  game=mode.name if mode.is_game else "", ref=ref)
        except Exception:  # noqa: BLE001
            log.exception("순간 저장 실패")

    def _write_weekly(self, folder: Path, now: datetime) -> None:
        """(뒤에서) 지난주(월~일) 일기들 → 주간 요약 한 편 (기억의 선: 원본 → 일화 → 하루 일기 → 주간 요약 → 사실)."""
        monday = now.date() - timedelta(days=now.weekday() + 7)
        path = folder / f"week-{monday.isoformat()}.md"
        if path.exists():
            return
        days = [(monday + timedelta(days=i)).isoformat() for i in range(7)]
        texts = []
        for d in days:
            try:
                body = (folder / f"{d}.md").read_text(encoding="utf-8").split("\n", 2)[-1].strip()
            except OSError:
                continue
            if body and not body.startswith("(기록이 거의 없는 날)"):
                texts.append(f"[{d}] {body}")
        if len(texts) < 2:
            return
        summary = self.companion.write_diary(f"{days[0]} ~ {days[-1]} (한 주)", "\n".join(texts), self.watch_cfg.judge_model)
        if summary:
            folder.mkdir(parents=True, exist_ok=True)
            path.write_text(f"# {days[0]} ~ {days[-1]} 한 주\n\n{summary}\n", encoding="utf-8")
            who = "" if self.char_key == DEFAULT_WHO else f"{self.char_key}:"
            self.recall_index.add(f"{days[-1]}T23:59:30", "diary",
                                  f"{days[0]}~{days[-1]} {'' if not who else self.char_name + '의 '}주간 요약: {summary}",
                                  source=f"week:{who}{days[0]}")
            log.info("주간 요약 씀: %s", path.name)

    def remember_episode(self, kind: str, text: str, game: str = "", detail: str = "") -> None:
        """분석·찾아본 것·게임 기록처럼 원본 기록 파일이 없는 일을 색인에 바로 넣는다."""
        try:
            self.recall_index.add(datetime.now().isoformat(timespec="seconds"), kind, text, detail, game)
        except Exception:  # noqa: BLE001
            log.exception("기억 색인 넣기 실패")

    def _on_partial(self, message: str) -> None:
        """답을 받는 대로 말풍선에 바로 보여준다 (다 받을 때까지 기다리지 않음)."""
        if not self.busy:
            return
        if not self._streamed:
            self._streamed = True
            self.status.end("chat")
            self._start_talking()
        self.bubble.show_text(message, self.anchor(), seconds=0)

    def _on_reply(self, reply) -> None:
        self.busy = False
        self.voice.paused = False
        self.status.end("chat")
        if getattr(self, "_moment_request", None):  # "이거 기억해" → 그 순간을 화면째 남김
            self.save_moment(self._moment_request, reply.message)
            self._moment_request = None
        remembered = getattr(self.companion, "last_remembered", []) or []
        if remembered:  # 대답과 함께 바로 적은 기억
            self.companion.last_remembered = []
            star = "★ " if any(f["importance"] >= 3 for f in remembered) else ""
            QTimer.singleShot(1500, lambda: self.status.flash(f"{star}기억했어요: {remembered[0]['text'][:24]}", 3))
        self.bubble.show_text(reply.message, self.anchor())
        self.show_overlay(reply.message, important=True)  # 주인님이 직접 말을 건 것의 대답
        self._say_aloud(reply.message)
        self.window.set_emotion(reply.emotion)
        self._start_talking()
        self._refresh_cost()
        self._budget_warning()
        if self.companion.should_consolidate():
            self._consolidate()
        if reply.action == "organize_files":
            QTimer.singleShot(400, lambda: self.organize_from_chat(reply.target))
        elif reply.action == "web_search" and reply.target.strip():
            self.search_and_answer(reply.target.strip())
        elif reply.action == "analyze_screen":
            question = self._last_question
            QTimer.singleShot(300, lambda: self.analyze_now(question))
        elif reply.action == "read_window":
            self.read_window_and_answer(reply.target.strip())
        elif reply.action == "zoom_screen":
            self.zoom_and_answer(reply.target.strip())
        elif reply.action == "make_game_mode":
            self.make_game_mode_now()
        elif reply.action == "correct_term":
            from wording import parse_correction

            pair = parse_correction(reply.target)
            if pair and self.companion.memory.add_term(*pair):
                self.status.flash(f"고친 말을 적었어요 ({pair[0]} → {pair[1]})")
        elif reply.action == "run_program" and reply.target.strip():
            self.run_program(reply.target.strip())
        elif reply.action == "media":
            from pc_control import MEDIA_LABEL, parse_media, press_media

            cmd = parse_media(reply.target)
            if cmd and press_media(*cmd):
                self.status.flash(MEDIA_LABEL[cmd[0]] + (f" ×{cmd[1]}" if cmd[1] > 1 else ""))
        elif reply.action == "make_recap":
            QTimer.singleShot(300, lambda: self.make_recap(reply.target.strip() or "today"))
        elif reply.action == "set_progress" and ":" in reply.target:
            game, text = (x.strip() for x in reply.target.split(":", 1))
            names = {m.name for m in self.watcher.modes}
            game = game if game in names else (self.watcher.mode.name if self.watcher.mode.is_game else game)
            self.progress.set_progress(game, text)
            self.status.flash(f"{game} 진행을 기억했어요")
        elif reply.action == "save_clip":
            self.save_highlight(self._last_question)
        elif reply.action == "set_reminder":
            r = self.planner.add_from_target(reply.target)
            if r:
                self.status.flash(f"알림 {r['when'][5:16].replace('T', ' ')} 에 맞췄어요")
            else:
                self.status.flash("알림 시각을 못 알아들었어요. 우클릭 → 도구 ▸ 알림·할 일에서 직접 넣을 수 있어요", 5)
        elif reply.action == "cancel_reminder":
            gone = self.planner.cancel(reply.target)
            self.status.flash(f"알림 {len(gone)}개를 지웠어요" if gone else "그런 알림을 못 찾았어요")
        elif reply.action == "add_todo":
            if self.planner.add_todo_from_target(reply.target):
                self.status.flash("할 일에 적었어요")
        elif reply.action == "done_todo":
            if self.planner.done_todo(reply.target):
                self.status.flash("할 일을 끝냈다고 표시했어요")
        elif reply.action == "add_rule" and reply.target.strip():
            scope, text = self._rule_scope(reply.target)
            if self.companion.memory.add_rule(scope, text):
                self.status.flash(f"금지 사항에 적었어요 ({scope})")
        elif reply.action == "add_focus" and reply.target.strip():
            scope, text = self._rule_scope(reply.target)
            if self.companion.memory.add_rule(scope, text, kind="do"):
                self.status.flash(f"챙겨 볼 것에 적었어요 ({scope})")
        elif reply.action == "learn_layout":
            game = self.watcher.relearn_layout()
            self.status.flash(f"{game} 화면 배치를 다음에 조용할 때 다시 볼게요" if game
                              else "게임 화면일 때 말해 주시면 다시 볼게요")
        elif reply.action == "block_window" and reply.target.strip():
            word = reply.target.strip().split(":")[-1].strip()
            if self.companion.memory.add_rule("전체", word, kind="skip"):
                self.status.flash(f"'{word}' 창은 이제 안 봐요")
        elif reply.action == "pin_fact" and reply.target.strip():
            if self.companion.memory.add_pinned(reply.target):
                self.status.flash("꼭 기억할 것에 적었어요")
        elif reply.action == "note_request" and reply.target.strip():
            if self.wishlist.add(reply.target):
                self.status.flash("개선 요청 메모에 적었어요")

    def read_window_and_answer(self, target: str) -> None:
        """'카톡 읽어줘' 등: 그 프로그램 창만 원래 크기로 찍어서(가려져 있어도) 보고 이어서 답한다."""
        from watch import windows as win

        if not bool(self.pref("screen.read_windows", True)):
            self.bubble.show_text("설정에서 '부탁하면 다른 프로그램 창 읽기'가 꺼져 있어요.", self.anchor(), system=True,
                                  seconds=5)
            return
        label = target or "지금 쓰던 창"
        self.busy = True
        self.voice.paused = True
        self._streamed = False
        self.status.begin("chat", f"{label[:16]} 창 읽는 중")
        own = win._process_name(os.getpid()) if sys.platform == "win32" else ""

        def work(progress):
            images = []
            for hwnd, info in win.find_windows(target, own_pid_process=own):
                img = win.capture_window(hwnd)
                if img is None:
                    continue
                if max(img.size) > 1568:
                    k = 1568 / max(img.size)
                    img = img.resize((round(img.width * k), round(img.height * k)))
                import io

                buf = io.BytesIO()
                img.convert("RGB").save(buf, "JPEG", quality=90)
                images.append(buf.getvalue())
            progress(None)
            return self.companion.reply_after_window(label, images, on_partial=progress)

        def on_progress(msg) -> None:
            if msg is None:
                self.status.set_text("chat", "창 내용 읽는 중")
            else:
                self._on_partial(msg)

        self._run(work, self._on_reply, self._on_error, on_progress=on_progress)

    def zoom_and_answer(self, target: str) -> None:
        """'외침 읽어줘' 등: 보는 모니터를 줄이지 않고 원래 해상도 조각으로 나눠 찍어서 작은 글씨까지 읽고 답한다."""
        from watch import capture as cap

        label = target or "화면 글씨"
        self.busy = True
        self.voice.paused = True
        self._streamed = False
        self.status.begin("chat", "화면 확대해서 보는 중")

        def work(progress):
            img = self.watcher.grabber()
            overview = cap.to_jpeg(cap.shrink(img, 1280), 80)
            parts = [(name, cap.to_jpeg(t, 92)) for name, t in cap.tiles(img)]
            progress(None)
            return self.companion.reply_after_zoom(label, overview, parts, on_partial=progress)

        def on_progress(msg) -> None:
            if msg is None:
                self.status.set_text("chat", "글씨 읽는 중")
            else:
                self._on_partial(msg)

        self._run(work, self._on_reply, self._on_error, on_progress=on_progress)

    def search_and_answer(self, query: str, about_screen: bool = False) -> None:
        """다니카가 '찾아보겠습니다' 라고 한 뒤(또는 화면에서 모르는 이름을 봤을 때): 검색 → 찾은 내용으로 말하기."""
        self.busy = True
        self.voice.paused = True
        self._streamed = False
        self.status.begin("chat", f"'{query[:20]}' 찾아보는 중")
        question = "" if about_screen else self._last_question

        mode = self.watcher.mode
        game = mode.name if mode.is_game else "일반"

        def work(progress):
            notes, _ = self.companion.search(query, question)
            if notes:  # 게임별 사전에 쌓아 두고, 다음부터 그 이름이 나오면 바로 꺼내 쓴다
                from lorebook import save_lookup

                self.companion.lorebook.entries.extend(
                    save_lookup(self.settings.data_dir / "knowledge", game, query, notes, datetime.now()))
                self.remember_episode("lookup", f"찾아봄: {query}", "" if game == "일반" else game, notes[:1500])
            progress(None)  # 다 찾았다
            return self.companion.reply_after_search(query, notes, on_partial=None if about_screen else progress,
                                                     about_screen=about_screen)

        def on_progress(msg) -> None:
            if msg is None:
                self.status.set_text("chat", "찾은 내용 읽는 중")
            else:
                self._on_partial(msg)

        def done(reply) -> None:
            if about_screen and reply.message in ("", "……"):  # 쓸 만한 게 없으면 조용히
                self.busy = False
                self.voice.paused = False
                self.status.end("chat")
                return
            self._on_reply(reply)

        self._run(work, done, self._on_error, on_progress=on_progress)

    def _on_error(self, message: str) -> None:
        self.busy = False
        self.voice.paused = False
        self.status.end("chat")
        self.bubble.show_text(message, self.anchor(), system=True, seconds=8)

    # ------------------------------------------------------------ 화면 보기

    def screen_pause_reason(self) -> str:
        """화면 보기를 켜 놨는데 지금 쉬는 이유 (없으면 빈 문자열). 캐릭터 아래 표시·대화에 쓴다."""
        if not self.watcher.enabled:
            return ""
        if self._away_since is not None:
            return "자리 비움 — 마우스나 키보드를 만지면 다시 봐요"
        stop = bool(self.pref("screen.limit_stop", False))
        limit = int(self.pref("screen.daily_krw", 3000) or 0)
        used = self.ledger.krw(self.ledger.day_kinds_usd(SCREEN_KINDS))
        if stop and limit and used >= limit:
            return f"오늘 화면 한도({limit:,}원)를 다 씀 ({used:,}원) — 설정 '화면 보기'에서 올리면 바로 다시 봐요"
        if stop and settings_flag(self.settings, "screen.stop_when_over_budget", True):
            budget = self.budget_usd()
            if budget and self.ledger.month_usd() >= budget:
                return f"이번 달 예산(${budget:,.0f})을 넘음 — 설정 '비용'에서 올리면 다시 봐요"
        word = self.watcher.blocked_word(self.watcher.process, self.watcher.window_title)
        if word:
            return f"보지 않기로 한 창('{word}')이 앞에 있음"
        return ""

    def _update_pause_status(self) -> None:
        reason = self.screen_pause_reason()
        if reason:
            self.status.begin("screen_pause", "화면 쉼: " + reason.split(" — ")[0], elapsed=False)
        else:
            self.status.end("screen_pause")

    def _screen_allowed(self) -> bool:
        if self.busy or self.bubble.isVisible() or self._user_talking():  # 대화·입력·말하는 중이거나 말풍선이 떠 있으면 다음에
            return False
        if self._away_since is not None:  # 자리 비움(자는 중 등) → 화면 보기 쉼 (밤새 비용 안 나가게)
            return False
        stop = bool(self.pref("screen.limit_stop", False))  # 기본: 한도를 넘어도 알리기만 하고 계속 본다
        limit = int(self.pref("screen.daily_krw", 3000) or 0)
        used = self.ledger.krw(self.ledger.day_kinds_usd(SCREEN_KINDS))
        if limit and used >= limit:  # 오늘 화면 한도
            self._limit_notice(limit, used, stop)
            if stop:
                return False
        if stop and settings_flag(self.settings, "screen.stop_when_over_budget", True):
            budget = self.budget_usd()
            if budget and self.ledger.month_usd() >= budget:
                return False
        return True

    def _limit_notice(self, limit: int, used: int, stop: bool) -> None:
        """하루 화면 한도를 넘었을 때, 그리고 그 뒤로 한도만큼 더 쓸 때마다 한 번씩 알린다 (멈추지는 않음이 기본)."""
        level = used // limit
        key = f"{datetime.now().date().isoformat()}:{level}"
        if self.pref("screen.daily_limit_told", "") == key:
            return
        self.set_pref("screen.daily_limit_told", key)
        self._update_pause_status()
        top = sorted(((k, v) for k, v in self.ledger.by_kind().items() if k in SCREEN_KINDS), key=lambda x: -x[1])
        where = ", ".join(f"{KIND_KO.get(k, k)} {self.ledger.krw(v):,}원" for k, v in top[:3])
        what = ("내일까지 화면 보기는 쉴게요" if stop
                else "화면 보기는 계속할게요 (멈추게 하려면 설정 '화면 보기'에서 '한도를 넘으면 멈추기')")
        self.bubble.show_text(f"오늘 화면 보기에 {used:,}원 썼어요 — 한도 {limit:,}원을 넘었어요 (많이 쓴 곳: {where}). {what}.",
                              self.anchor(), system=True, seconds=15)

    def set_screen_enabled(self, on: bool, save: bool = True) -> None:
        self.watcher.set_enabled(on)
        if hasattr(self, "screen_action"):
            self.screen_action.setChecked(on)
        if save:
            self.set_pref("screen.enabled", on)

    COACH = (("off", "끔"), ("analysis", "분석: 중요한 순간마다 자세히"), ("review", "복기: 5초마다 보고 끝난 장면 되짚기"))

    def set_coach(self, coach: str, save: bool = True) -> None:
        """코칭 방식: off | analysis(중요한 순간 분석) | review(게임 중 5초마다 보고 끝난 장면 복기)."""
        coach = coach if coach in dict(self.COACH) else "off"
        self.watch_cfg.analysis = coach in ("analysis", "review")
        self.watch_cfg.review = coach == "review"
        for key, act in getattr(self, "coach_actions", {}).items():
            act.setChecked(key == coach)
        if save:
            self.set_pref("screen.coach", coach)

    def set_analysis(self, on: bool, save: bool = True) -> None:  # 예전 이름
        self.set_coach("analysis" if on else "off", save)

    @property
    def coach(self) -> str:
        return "review" if self.watch_cfg.review else "analysis" if self.watch_cfg.analysis else "off"

    def analyze_now(self, question: str = "지금 화면을 자세히 분석해 줘") -> None:
        """F10·메뉴·대화: 지금 화면을 최근 장면들과 함께 자세히 분석 (복기 모드 게임 중이면 지난 장면 복기).
        하던 화면 확인이 있으면 버리지 않고, 끝나는 대로 바로 한다."""
        if self.busy:
            self.status.flash("하던 대답이 끝나면 다시 눌러 주세요")
            return
        if self.watcher.running_job:
            self.status.begin("screen", "하던 확인 끝나면 바로 볼게요")
        else:
            self.status.begin("screen", "복기하는 중" if self.watcher.reviewing(self.watcher.mode) else "분석하는 중")
        self.watcher.ask_analysis(question)

    def show_overlay(self, text: str, important: bool = True) -> None:
        """게임 모니터 위에 자막으로도. 설정: important=게임 중 중요한 말만(기본), game=게임 중 모두,
        always=그 모니터를 쓸 때 항상, off."""
        how = str(self.pref("screen.overlay", "important"))
        if how == "off" or not text or text == "……" or (how == "important" and not important):
            return
        if not self.watcher.foreground_on_watched() or (how in ("game", "important") and not self.watcher.mode.is_game):
            return
        ranks = None
        if str(self.watch_cfg.monitor).isdigit():
            try:
                from watch import capture

                mons = sorted(capture.list_monitors(), key=lambda m: m.left)
                ranks = [next(i for i, m in enumerate(mons) if m.index == int(self.watch_cfg.monitor))]
            except Exception:  # noqa: BLE001
                ranks = None
        seconds = self.bubble.duration_ms(text) / 1000 + 2
        self.overlay.show_on(screen_for(str(self.watch_cfg.monitor), ranks), text, seconds,
                             str(self.pref("screen.overlay_pos", "top")))

    def toggle_screen(self) -> None:
        on = not self.watcher.enabled
        self.set_screen_enabled(on)
        self.bubble.show_text("화면 보기를 켰어요." if on else "화면 보기를 껐어요.", self.anchor(), system=True, seconds=2.5)

    def ask_screen_now(self) -> None:
        if self.busy:
            return
        self.status.begin("screen", "화면 보는 중")
        self.watcher.ask_now()

    def _on_watch_activity(self, what: str) -> None:
        if what == "judge":
            self.status.begin("screen", "화면 확인 중")
        elif what == "line":
            self.status.begin("screen", "할 말 고르는 중")
        elif what == "analyze":
            self.status.begin("screen", "분석하는 중")
        elif what == "analyze_deep":
            self.status.begin("screen", "이번 판 깊게 되짚는 중")
        else:
            self.status.end("screen")

    def _on_screen_missed(self) -> None:
        """부탁받은 화면 보기가 말없이 끝나면 '그냥 끊긴' 것처럼 보이지 않게 알린다."""
        self.status.end("screen")
        if not self.busy:
            self.bubble.show_text("화면을 봤는데 제대로 못 읽었어요. 글씨를 읽어 달라는 거면 '외침 읽어줘'처럼 말씀해 주세요. "
                                  "확대해서 다시 볼게요.", self.anchor(), system=True, seconds=8)

    def _index_analysis(self, a, kind: str = "analysis") -> None:
        points = "; ".join(f"{p.get('title', '')}: {p.get('detail', '')}" for p in a.points if isinstance(p, dict))
        self.remember_episode(kind, f"{a.when} {a.summary}", self.watcher.mode.name if self.watcher.mode.is_game else "",
                              f"{a.situation} / {points} / 다음: {', '.join(a.next_steps)}")

    def _on_moment(self, kind: str) -> None:
        """확 바뀐 순간 다니카가 먼저 놀란 표정 (말은 몇 초 뒤). 말이 안 오면 4초 뒤 원래대로."""
        if self.busy or not self.pref("screen.moment_face", True):
            return
        self._moment_seq += 1
        seq = self._moment_seq
        self.window.set_emotion("surprised")
        QTimer.singleShot(4000, lambda: self.window.set_emotion("normal") if seq == self._moment_seq else None)

    def _user_talking(self) -> bool:
        """주인님이 지금 입력창에 쓰는 중이거나 목소리로 말하는 중인가."""
        return self.input.isVisible() or self._voice_state in ("listening", "heard")

    def _screen_can_show(self, started: bool = False) -> bool:
        """화면 얘기를 지금 띄워도 되나: 대화 중·입력 중·말하는 중이면 아님 (끼어들지 않고, 안 한 말을 했다고 기억하지 않게).
        started: 이미 말풍선에 쓰기 시작한 말 — 대화(답 기다리기)가 시작된 게 아니면 끝까지 쓴다 (중간에 끊겨 사라지지 않게)."""
        if self.busy:
            return False
        return started or not self._user_talking()

    def _on_screen_partial(self, message: str) -> None:
        started = bool(self._screen_partial) and self.bubble.isVisible() and self.bubble.text == self._screen_partial
        if not self._screen_can_show(started) or not message:  # 대화·입력·말하는 중이면 대화가 먼저 (쓰던 말은 끝까지)
            return
        self._screen_partial = message
        self.bubble.show_text(message, self.anchor(), seconds=0)

    def _on_screen_partial_cancel(self) -> None:
        if self._screen_partial and self.bubble.text == self._screen_partial:
            self.bubble.hide()
        self._screen_partial = ""

    def _on_screen_line(self, reply) -> None:
        started = bool(self._screen_partial) and self.bubble.isVisible() and self.bubble.text == self._screen_partial
        self._screen_partial = ""
        self._moment_seq += 1  # 말이 왔으니 표정 되돌리기는 취소 (말의 표정으로)
        if isinstance(reply, Analysis) and reply.speak:  # 분석은 창에 남겨 두니 대화 중이어도 보여 준다
            self.analysis_panel.show_analysis(reply)
            self._index_analysis(reply)
            if not self._screen_can_show(started):
                return
        if not self._screen_can_show(started):
            if started:  # 쓰다 만 말이 멈춘 채 남지 않게
                self.bubble.hide()
            return
        if reply.action == "web_search":  # 화면에 모르는 이름 → 조용히 찾아보고 말하기 (한 시간에 6번까지)
            now = time.monotonic()
            self._screen_searches = [t for t in self._screen_searches if now - t < 3600]
            if len(self._screen_searches) < int(self.settings.get("screen.searches_per_hour", 6)):
                self._screen_searches.append(now)
                self.search_and_answer(reply.target, about_screen=True)
            return
        self.bubble.show_text(reply.message, self.anchor())
        self.show_overlay(reply.message, important=bool(getattr(reply, "important", False)))
        self._say_aloud(reply.message)
        if (getattr(reply, "important", False) and self.watcher.mode.is_game and self.pref("pc.auto_clip", False)
                and time.monotonic() - self._last_clip > 180):  # 중요한 순간 자동 저장 (3분에 한 번)
            self.save_highlight(reply.message, auto=True)
        self.window.set_emotion(reply.emotion)
        self._start_talking()
        self._refresh_cost()
        self._budget_warning()

    def _on_watch_status(self, message: str) -> None:
        if message.startswith("화면 보기"):
            return
        if self.bubble.text == "……":
            self.bubble.hide()
        if message != self._last_watch_error:  # 같은 오류를 30초마다 띄우지 않게
            self._last_watch_error = message
            self.bubble.show_text(message, self.anchor(), system=True, seconds=8)

    # ------------------------------------------------------------ 목소리

    def set_voice_mode(self, mode: str, save: bool = True) -> None:
        self.voice.set_mode(mode)
        for m, act in getattr(self, "voice_actions", {}).items():
            act.setChecked(m == self.voice.mode)
        if save:
            self.set_pref("voice.mode", self.voice.mode)

    def push_to_talk(self) -> None:
        if self.voice.mode != "push":
            self.bubble.show_text("목소리 설정이 '단축키로 듣기'가 아니에요. 메뉴에서 바꿀 수 있어요.",
                                  self.anchor(), system=True, seconds=4)
            return
        self.voice.push()

    def _on_voice_state(self, state: str) -> None:
        """목소리 상태는 말풍선이 아니라 캐릭터 아래 작은 표시로 알린다."""
        self._voice_state = state
        key = self.settings.get("hotkeys.voice", "F7")
        if state == "loading":
            self.status.begin("voice_load", "음성 인식 준비 중 (처음엔 내려받느라 몇 분)")
        elif state == "ready":
            self.status.end("voice_load")
            self.status.flash("이제 목소리를 알아들을 수 있어요", 3)
        elif state == "listening":
            self.status.begin("voice", f"듣는 중 · 다 말하면 {key}")
        elif state == "heard":
            self.status.begin("voice", "알아듣는 중")
        elif state == "unclear":
            self.status.end("voice")
            if self.voice.mode == "push":  # 항상 듣기에선 잡음마다 띄우지 않는다
                self.status.flash("잘 못 알아들었어요", 2.5)
        elif state in ("idle", "off") and self.status.tasks.get("voice", ("",))[0].startswith("듣는 중"):
            self.status.end("voice")

    def _on_heard(self, text: str) -> None:
        log.info("들은 말: %s", text)
        self.status.end("voice")
        self.ask(text)

    # ------------------------------------------------------------ 단축키

    def _register_hotkeys(self) -> None:
        app = QApplication.instance()
        if app is None or sys.platform != "win32":
            return
        self.hotkeys = GlobalHotkeys(int(self.window.winId()))
        app.installNativeEventFilter(self.hotkeys)
        g = self.settings.get
        self.hotkeys.register(str(g("hotkeys.ask_screen", "F8") or ""), self.ask_screen_now)
        self.hotkeys.register(str(g("hotkeys.toggle_screen", "F9") or ""), self.toggle_screen)
        self.hotkeys.register(str(g("hotkeys.voice", "F7") or ""), self.push_to_talk)
        self.hotkeys.register(str(g("hotkeys.analyze", "F10") or ""), lambda: self.analyze_now())

    # ------------------------------------------------------------ 업데이트·다시 시작·설정 파일

    def check_update(self, startup: bool = False, manual: bool = False) -> None:
        self.status.begin("update", "업데이트 확인 중")

        def failed(message: str) -> None:
            self.status.end("update")
            if manual:
                self._on_update_fail(message)
            else:
                log.warning("업데이트 확인 실패: %s", message)

        def done(result) -> None:
            self.status.end("update")
            if not result.changed:
                if manual:
                    self.bubble.show_text("최신 버전이에요.", self.anchor(), system=True, seconds=3)
                return
            note = " (직접 고친 설정은 그대로 뒀어요)" if result.kept else ""
            if result.requirements_changed:
                self.status.begin("update", "업데이트에 필요한 것 설치 중")

                def installed(_) -> None:
                    self.status.end("update")
                    self._after_update(startup, note)

                self._run(self._pip_install, installed, lambda m: (self.status.end("update"), self._on_update_fail(m)))
            else:
                self._after_update(startup, note)

        self._run(self.updater.run, done, failed)

    def _pip_install(self) -> None:
        exe = Path(sys.executable)
        python = exe.with_name("python.exe") if exe.name.lower() == "pythonw.exe" else exe
        subprocess.run([str(python), "-m", "pip", "install", "-q", "-r", str(self.settings.root / "requirements.txt")],
                       check=True, capture_output=True,
                       creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))

    def _after_update(self, startup: bool, note: str) -> None:
        self.update_pending = True
        if startup:
            self.bubble.show_text("업데이트를 받았어요. 다시 시작할게요." + note, self.anchor(), system=True, seconds=3)
            QTimer.singleShot(3000, self.restart)
        else:
            self.bubble.show_text("업데이트를 받았어요. 메뉴의 '다시 시작'을 누르면 적용돼요." + note,
                                  self.anchor(), system=True, seconds=8)

    def _on_update_fail(self, message: str) -> None:
        self.bubble.show_text(f"업데이트 실패: {message}", self.anchor(), system=True, seconds=8)

    @property
    def diary_dir(self) -> Path:
        """지금 캐릭터의 일기 폴더 (다니카는 diary/, 다른 캐릭터는 diary_이름/)."""
        name = "diary" if self.char_key == DEFAULT_WHO else f"diary_{self.char_key}"
        return self.settings.data_dir / name

    def switch_character(self, key: str) -> None:
        """다른 캐릭터로: 저장하고 다시 켠다 (그림·성격·배경지식·대화를 새로 읽음). 주인님 기억은 같이."""
        profiles = character_profiles(self.settings)
        if key == self.char_key or key not in profiles:
            return
        folder = self.settings.path(f"characters.{key}.folder") or self.settings.path("character.folder")
        name = str(profiles[key].get("name") or key)
        if folder is None or not (folder / "manifest.json").is_file():
            self.bubble.show_text(f"{name} 그림 폴더가 없어요: {folder}. 받은 캐릭터 파일을 프로그램 폴더에 풀어 주세요.",
                                  self.anchor(), system=True, seconds=10)
            for k, act in getattr(self, "char_actions", {}).items():
                act.setChecked(k == self.char_key)
            return
        self.set_pref("character.active", key)
        self.bubble.show_text(f"{name}(으)로 바꿀게요. 잠깐 껐다 켤게요.", self.anchor(), system=True, seconds=3)
        QTimer.singleShot(1500, self.restart)

    def restart(self) -> None:
        """새 프로그램을 띄우고 지금 것은 끈다 (새 쪽은 지금 것이 완전히 꺼질 때까지 기다렸다 시작)."""
        relaunch(self.settings.root)
        self.quit()

    def check_local_ai(self) -> None:
        """내 PC AI 연결 확인 (뒤에서). 없으면 그냥 클라우드로 하고, 모델이 없으면 받기 시작."""
        ai = self.local_ai
        if not ai.enabled or ai.state == "pulling":
            return
        threading.Thread(target=ai.check, daemon=True, name="local-ai-check").start()

    def settings_values(self) -> dict:
        g = self.settings.get
        return {
            "character.scale": float(g("character.scale", 1.0)),
            "character.talk_motion": self.talk_style(),
            "screen.enabled": self.watcher.enabled,
            "screen.chattiness": self.watch_cfg.chattiness,
            "screen.interval_seconds": int(self.watch_cfg.interval_seconds),
            "screen.cooldown_seconds": int(self.watch_cfg.cooldown_seconds),
            "screen.monitor": str(self.watch_cfg.monitor),
            "screen.coach": self.coach,
            "ui.bubble_time": str(self.pref("ui.bubble_time", "normal")),
            "screen.memory": self.screen_log.enabled,
            "screen.read_windows": bool(self.pref("screen.read_windows", True)),
            "screen.auto_read": bool(self.watch_cfg.auto_read),
            "screen.result_depth": "deep" if self.watch_cfg.deep_result else "quick",
            "screen.line_quality": self.watch_cfg.line_quality,
            "screen.dense": self.watch_cfg.dense,
            "screen.scan": self.watch_cfg.scan,
            "screen.eye": self.watch_cfg.eye,
            "screen.rush": self.watch_cfg.rush,
            "screen.moment_face": bool(self.pref("screen.moment_face", True)),
            "screen.fast_opus": self.watch_cfg.fast_opus,
            "screen.sonnet_quick": self.companion.quick_lines,
            "screen.drafts": self.companion.drafts,
            "local.enabled": self.local_ai.enabled,
            "local.cpu": self.local_ai.cpu,
            "local.model": self.local_ai.model,
            "local.context_model": self.local_ai.context_model,
            "local.context": self.context_keeper.enabled,
            "local.paddle_ocr": bool(self.pref("local.paddle_ocr", True)),
            "ears.enabled": self.ears.enabled,
            "screen.limit_stop": bool(self.pref("screen.limit_stop", False)),
            "screen.daily_krw": str(int(self.pref("screen.daily_krw", 3000) or 0)),
            "screen.memory_days": self.screen_log.keep_days,
            "screen.memory_gb": int(self.screen_log.max_gb),
            "screen.overlay": str(self.pref("screen.overlay", "important")),
            "screen.overlay_pos": str(self.pref("screen.overlay_pos", "top")),
            "screen.max_width": int(self.watch_cfg.max_width),
            "voice.mode": self.voice.mode,
            "voice.mic": self.voice.device,
            "voice.wake_word": self.voice.wake_word,
            "voice.model": str(g("voice.model", "medium")),
            "budget.monthly_usd": self.budget_usd(),
            "ai.fast": bool(self.companion.fast),
            "ai.web_search": bool(self.companion.can_search),
            "genshin.uid": self.genshin.uid,
            "starrail.uid": self.starrail.uid,
            "cyphers.nickname": self.cyphers.nickname,
            "user.nickname": ", ".join(self.companion.user_names),
            "ui.show_status": self.status.enabled,
            "pc.monitor": self.pc_timer.isActive(),
            "assist.briefing": bool(self.pref("assist.briefing", True)),
            "assist.pause_when_away": bool(self.pref("assist.pause_when_away", True)),
            "assist.resume": bool(self.pref("assist.resume", True)),
            "assist.chores": bool(self.pref("assist.chores", True)),
            "assist.auto_dates": bool(self.pref("assist.auto_dates", True)),
            "voice.speak": bool(self.pref("voice.speak", False)),
            "voice.speak_rate": str(self.pref("voice.speak_rate", "normal")),
            "pc.clip_tool": str(self.pref("pc.clip_tool", "gamebar")),
            "pc.auto_clip": bool(self.pref("pc.auto_clip", False)),
        }

    def open_settings_dialog(self) -> None:
        try:
            from watch.capture import list_monitors

            monitors = [str(m.index) for m in list_monitors()]
        except Exception:  # noqa: BLE001
            monitors = []
        dlg = SettingsDialog(self.settings_values(), monitors, list_input_devices(), voice_level=lambda: self.voice.level,
                             meter=(self.voice.start_meter, self.voice.stop_meter),
                             hoyolab=(self.hoyolab_status, self.hoyolab_login, self.hoyolab_logout),
                             neople_set=bool(self.secrets.get("neople")),
                             local=(lambda: f"{self.local_ai.status_text()}\n게임 소리: {self.ears.status_text()}",
                                    self.check_local_ai))
        if dlg.exec() == SettingsDialog.DialogCode.Accepted:
            key = dlg.neople_key.text().strip()
            if key:  # API 키는 설정 값(state.json)이 아니라 암호화 저장소에만
                self.secrets.set("neople", key)
                self.cyphers.fetched_at = None
                QTimer.singleShot(800, lambda: self.refresh_cyphers(force=True))
            self.apply_settings(dlg.changed())

    def apply_settings(self, changed: dict) -> None:
        """설정 창에서 바꾼 값을 저장하고, 바로 적용할 수 있는 건 바로 적용한다."""
        for key, value in changed.items():
            self.set_pref(key, value)
            self.settings.set(key, value)
        cfg = self.watch_cfg
        for key, attr in (("screen.chattiness", "chattiness"), ("screen.interval_seconds", "interval_seconds"),
                          ("screen.cooldown_seconds", "cooldown_seconds"), ("screen.monitor", "monitor"),
                          ("screen.max_width", "max_width")):
            if key in changed:
                setattr(cfg, attr, changed[key])
        self.watcher.apply_config()
        if "ui.bubble_time" in changed:
            self._apply_bubble_time(str(changed["ui.bubble_time"]))
        if "screen.auto_read" in changed:
            self.watch_cfg.auto_read = bool(changed["screen.auto_read"])
        if "screen.result_depth" in changed:
            self.watch_cfg.deep_result = changed["screen.result_depth"] == "deep"
        if "screen.line_quality" in changed:
            self.watch_cfg.line_quality = str(changed["screen.line_quality"])
        if "screen.dense" in changed:
            self.watch_cfg.dense = str(changed["screen.dense"])
        if "screen.scan" in changed:
            self.watch_cfg.scan = bool(changed["screen.scan"])
        if "screen.eye" in changed:
            self.watch_cfg.eye = str(changed["screen.eye"])
        for key, attr in (("screen.rush", "rush"), ("screen.fast_opus", "fast_opus")):
            if key in changed:
                setattr(self.watch_cfg, attr, bool(changed[key]))
        if "screen.sonnet_quick" in changed:
            self.companion.quick_lines = bool(changed["screen.sonnet_quick"])
        if "screen.drafts" in changed:
            self.companion.drafts = bool(changed["screen.drafts"])
        if "ears.enabled" in changed:
            self.ears.enabled = bool(changed["ears.enabled"])
        if "local.paddle_ocr" in changed:
            import local_ocr

            local_ocr.paddle_enabled = bool(changed["local.paddle_ocr"])
        if any(k.startswith("local.") for k in changed):
            self.context_keeper.enabled = bool(changed.get("local.context", self.context_keeper.enabled))
            self.local_ai.enabled = bool(changed.get("local.enabled", self.local_ai.enabled))
            self.local_ai.cpu = str(changed.get("local.cpu", self.local_ai.cpu))
            if str(changed.get("local.model", self.local_ai.model)).strip() != self.local_ai.model:
                self.local_ai.model = str(changed["local.model"]).strip() or self.local_ai.model
                self.local_ai.state = "unknown"
            if "local.context_model" in changed:  # 없으면 확인할 때 뒤에서 받는다
                self.local_ai.context_model = str(changed["local.context_model"]).strip()
            self.check_local_ai()
        if "screen.limit_stop" in changed:
            self._update_pause_status()
        if "screen.daily_krw" in changed:
            self.set_pref("screen.daily_krw", int(changed["screen.daily_krw"]))
            self.set_pref("screen.daily_limit_told", "")
            self._update_pause_status()
        if "screen.memory" in changed:
            self.screen_log.enabled = bool(changed["screen.memory"])
        if "screen.memory_days" in changed or "screen.memory_gb" in changed:
            self.screen_log.keep_days = int(changed.get("screen.memory_days", self.screen_log.keep_days))
            self.screen_log.max_gb = float(changed.get("screen.memory_gb", self.screen_log.max_gb))
            self._run(self.screen_log.cleanup, lambda _: None, log.warning)
        if "screen.coach" in changed:
            self.set_coach(str(changed["screen.coach"]), save=False)
        if "screen.enabled" in changed:
            self.set_screen_enabled(bool(changed["screen.enabled"]), save=False)
        if "voice.mic" in changed:
            self.voice.set_device(str(changed["voice.mic"]))
        if "voice.wake_word" in changed:
            self.voice.wake_word = str(changed["voice.wake_word"])
        if "voice.mode" in changed:
            self.set_voice_mode(str(changed["voice.mode"]), save=False)
        if "character.talk_motion" in changed:
            self._sync_talk_actions()
        if "ai.fast" in changed:
            self.companion.fast = bool(changed["ai.fast"])
        if "ai.web_search" in changed:
            self.companion.can_search = bool(changed["ai.web_search"])
        if "cyphers.nickname" in changed:
            self.cyphers.nickname = str(changed["cyphers.nickname"]).strip()
            self.cyphers.player_id = ""
            self.cyphers.fetched_at = None
        if "genshin.uid" in changed:
            self.genshin.uid = str(changed["genshin.uid"])
            self.genshin.showcase_next = 0
            QTimer.singleShot(500, lambda: self.refresh_genshin(force=True))
        if "starrail.uid" in changed:
            self.starrail.uid = str(changed["starrail.uid"])
            self.starrail.notes = None
            if self.starrail.has_uid:
                QTimer.singleShot(1500, lambda: self.refresh_starrail(force=True))
        if "user.nickname" in changed:
            self.companion.user_names = split_names(changed["user.nickname"])
        if "ui.show_status" in changed:
            self.status.set_enabled(bool(changed["ui.show_status"]))
        if "pc.monitor" in changed:
            self.set_pc_monitor(bool(changed["pc.monitor"]))
        if "voice.speak_rate" in changed:
            self.speaker.rate = TTS_RATES.get(str(changed["voice.speak_rate"]), 0)
        if changed.get("voice.speak"):
            self.set_speak(True)
        self._refresh_cost()
        if RESTART_KEYS & set(changed):
            self.bubble.show_text("저장했어요. 크기·인식 모델은 메뉴의 '다시 시작' 후 적용돼요.", self.anchor(),
                                  system=True, seconds=5)
        elif changed:
            self.bubble.show_text("설정을 저장했어요.", self.anchor(), system=True, seconds=2.5)

    def set_talk_style(self, style: str) -> None:
        self.apply_settings({"character.talk_motion": style})

    def _sync_talk_actions(self) -> None:
        for style, act in getattr(self, "talk_actions", {}).items():
            act.setChecked(style == self.talk_style())

    def open_settings(self) -> None:
        path = self.settings.root / "config.toml"
        try:
            if sys.platform == "win32":
                subprocess.Popen(["notepad.exe", str(path)])
            else:
                subprocess.Popen(["xdg-open", str(path)])
        except OSError as exc:
            self.bubble.show_text(f"설정 파일을 못 열었어요: {exc}", self.anchor(), system=True, seconds=6)
            return
        self.bubble.show_text("설정을 고치고 저장한 뒤 메뉴의 '다시 시작'을 누르면 적용돼요.", self.anchor(),
                              system=True, seconds=6)

    # ------------------------------------------------------------ 설정 기억 (메뉴에서 바꾼 값)

    def pref(self, key: str, default=None):
        prefs = self._load_state().get("prefs", {})
        return prefs[key] if key in prefs else self.settings.get(key, default)

    def set_pref(self, key: str, value) -> None:
        state = self._load_state()
        state.setdefault("prefs", {})[key] = value
        self._write_state(state)

    def talk_style(self) -> str:
        """말할 때: bounce(살짝 튐) | still(숨쉬기 멈춤) | breathe(숨쉬기 계속)."""
        value = self.settings.get("character.talk_motion", "bounce")
        if isinstance(value, bool):  # 예전 설정 true/false
            return "bounce" if value else "breathe"
        value = str(value).lower()
        return value if value in ("bounce", "still", "breathe") else "bounce"

    def _start_talking(self) -> None:
        style = self.talk_style()
        if style == "bounce":
            self.window.set_talking(True)
        elif style == "still":
            self.window.set_frozen(True)

    def _bubble_done(self) -> None:
        self.window.set_frozen(False)
        self.window.set_talking(False)
        self.window.set_emotion("normal")

    def _run(self, fn: Callable, on_done: Callable, on_fail: Callable, *args, on_progress: Callable | None = None) -> None:
        """on_progress 를 주면 fn 에 progress=함수 를 넘겨, 뒤에서 일하는 중에도 화면에 소식을 보낼 수 있다."""
        job = Job(fn, *args)
        job.setAutoDelete(False)
        if on_progress is not None:
            job.kwargs["progress"] = job.signals.progress.emit
            job.signals.progress.connect(on_progress)
        self.jobs.add(job)

        def finish(handler, value):
            self.jobs.discard(job)
            handler(value)

        job.signals.done.connect(lambda v: finish(on_done, v))
        job.signals.failed.connect(lambda m: finish(on_fail, m))
        self.pool.start(job)

    # ------------------------------------------------------------ 메뉴·비용

    def _build_menu(self) -> QMenu:
        """자주 쓰는 것만 위에, 나머지는 게임·도구·기억·더 보기 묶음으로."""
        g = self.settings.get
        menu = QMenu()

        def add(parent: QMenu, label: str, slot, checkable: bool = False) -> QAction:
            act = QAction(label, parent)
            act.setCheckable(checkable)
            act.triggered.connect(slot)
            parent.addAction(act)
            return act

        def info(parent: QMenu) -> QAction:
            act = QAction("", parent)
            act.setEnabled(False)
            parent.addAction(act)
            return act

        add(menu, "말 걸기", self.open_input)
        add(menu, "대화 기록 보기", self.show_history)
        profiles = character_profiles(self.settings)
        if len(profiles) > 1:  # 캐릭터 바꾸기 (한 번에 한 명, 주인님 기억은 같이)
            who = menu.addMenu(f"캐릭터: {self.char_name}")
            self.char_actions = {}
            for key, prof in profiles.items():
                act = add(who, str(prof.get("name") or key), lambda _=False, k=key: self.switch_character(k),
                          checkable=True)
                act.setChecked(key == self.char_key)
                self.char_actions[key] = act
        menu.addSeparator()
        self.cost_action = info(menu)
        self.screen_action = add(menu, f"화면 보기 ({g('hotkeys.toggle_screen', 'F9')})",
                                 lambda on: self.set_screen_enabled(on), checkable=True)
        add(menu, f"지금 화면 보고 말하기 ({g('hotkeys.ask_screen', 'F8')})", self.ask_screen_now)

        # 게임: 코칭·복기·게임 정보
        game = menu.addMenu("게임")
        self.mode_action = info(game)
        self.watch_status_action = info(game)
        game.addSeparator()
        cmenu = game.addMenu("코칭 (분석·복기)")
        cgroup = QActionGroup(cmenu)
        self.coach_actions = {}
        for key, label in self.COACH:
            act = add(cmenu, label, lambda _=False, k=key: self.set_coach(k), checkable=True)
            cgroup.addAction(act)
            self.coach_actions[key] = act
        add(game, f"지금 자세히 분석·복기 ({g('hotkeys.analyze', 'F10')})", lambda: self.analyze_now())
        add(game, "지난 10분 복기 (저장된 화면으로)", lambda: self.review_recent(10))
        add(game, "영상으로 복기…", lambda: self.review_video_file())
        add(game, "방금 장면 저장 (하이라이트)", lambda: self.save_highlight("메뉴에서 저장"))
        add(game, "분석 창 보기", lambda: (self.analysis_panel.show(), self.analysis_panel.raise_()))
        game.addSeparator()
        add(game, "지금 하는 게임 최신 소식 확인", lambda: self.refresh_game_news(force=True))
        add(game, "지금 하는 게임 모드 만들기", self.make_game_mode_now)
        game.addSeparator()
        add(game, "원신 정보 새로고침 (진열장·레진·기원)", lambda: self.refresh_genshin(force=True, wishes=True))
        add(game, "받은 원신 정보 보기", self.show_genshin)
        add(game, "스타레일 정보 새로고침 (개척력·워프)", lambda: self.refresh_starrail(force=True, warps=True))
        add(game, "받은 스타레일 정보 보기", self.show_starrail)
        add(game, "사이퍼즈 전적 새로고침", lambda: self.refresh_cyphers(force=True))

        # 도구: 파일 정리·목소리·메모
        tools = menu.addMenu("도구")
        omenu = tools.addMenu("파일 정리")
        for label in org.KNOWN:
            add(omenu, f"{label} 정리하기…", lambda _=False, lb=label: self.organize(org.known_folder(lb), lb))
        add(omenu, "다른 폴더 고르기…", self.organize_pick)
        omenu.addSeparator()
        add(omenu, "마지막 정리 되돌리기", self.undo_organize)
        vmenu = tools.addMenu("목소리로 말 걸기")
        group = QActionGroup(vmenu)
        self.voice_actions = {}
        for mode, label in (("always", "항상 듣기"), ("push", f"단축키로 듣기 ({g('hotkeys.voice', 'F7')})"), ("off", "듣지 않기")):
            act = add(vmenu, label, lambda _=False, m=mode: self.set_voice_mode(m), checkable=True)
            group.addAction(act)
            self.voice_actions[mode] = act
        vmenu.addSeparator()
        add(vmenu, f"지금 듣기 ({g('hotkeys.voice', 'F7')})", self.push_to_talk)
        add(tools, "알림·할 일…", self.open_planner)
        add(tools, "오늘 정리", lambda: self.make_recap("today"))
        add(tools, "이번 주 정리", lambda: self.make_recap("week"))
        add(tools, "개선 요청 메모…", self.open_wishlist)
        add(tools, "화면 기억 폴더 열기", self.open_screens_folder)

        # 기억
        mem = menu.addMenu("기억")
        add(mem, "기억 보기·찾아보기·일기…", self.show_memory)
        add(mem, "화면 보는 규칙 (하지 마·챙겨 봐·보지 마)…", self.open_rules)
        add(mem, "고친 말 (남과 → 호박 같은 것)…", self.open_terms)
        add(mem, "기억 지금 정리하기", self.consolidate_now)
        add(mem, "최근 대화 잊기 (장기기억은 유지)", self.companion.memory.clear_recent)

        menu.addSeparator()
        add(menu, "설정…", self.open_settings_dialog)
        more = menu.addMenu("더 보기")
        tmenu = more.addMenu("말할 때 움직임")
        tgroup = QActionGroup(tmenu)
        self.talk_actions = {}
        for style, label in TALK_STYLES:
            act = add(tmenu, label, lambda _=False, st=style: self.set_talk_style(st), checkable=True)
            tgroup.addAction(act)
            self.talk_actions[style] = act
        self._sync_talk_actions()
        add(more, "비용 자세히 보기", self.show_cost_details)
        add(more, "설정 파일 열기 (고급)", self.open_settings)
        add(more, "업데이트 확인", lambda: self.check_update(manual=True))
        add(more, "다시 시작 (설정·업데이트 적용)", self.restart)
        menu.addSeparator()
        add(menu, "종료", self.quit)
        menu.aboutToShow.connect(self._refresh_cost)
        return menu

    def budget_usd(self) -> float:
        """월 예산(달러). monthly_usd 가 있으면 그것, 없으면 monthly_krw 를 환율로 바꾼 값."""
        usd = self.settings.get("budget.monthly_usd")
        if usd is not None:
            return float(usd)
        return float(self.settings.get("budget.monthly_krw", 50000)) / max(self.ledger.krw_per_usd, 1)

    def cost_text(self) -> str:
        day, month = self.ledger.day_usd(), self.ledger.month_usd()
        screen = self.ledger.krw(self.ledger.day_kinds_usd(SCREEN_KINDS))
        limit = int(self.pref("screen.daily_krw", 3000) or 0)
        return (f"오늘 사용 {self.ledger.krw(day):,}원 (화면 {screen:,}원" + (f"/{limit:,}원" if limit else "") + ") · "
                f"이번 달 {self.ledger.krw(month):,}원 (${month:,.2f} / ${self.budget_usd():,.0f})")

    def cost_details(self) -> str:
        """어디에 얼마 썼는지 (오늘·이번 달, 많이 쓴 것부터)."""
        lines = []
        for title, data in (("오늘", self.ledger.by_kind()), ("이번 달", self.ledger.by_kind(month=True))):
            total = sum(data.values())
            lines.append(f"[{title}] 합계 {self.ledger.krw(total):,}원")
            for kind, usd in sorted(data.items(), key=lambda x: -x[1]):
                if usd > 0:
                    lines.append(f"  {KIND_KO.get(kind, kind)}: {self.ledger.krw(usd):,}원 ({usd / max(total, 1e-9):.0%})")
            lines.append("")
        st = self.ledger.day_stats()
        if st["calls"]:
            lines.append(f"[오늘 자세히] 호출 {st['calls']:,}번 · 보낸 사진 {st['images']:,}장")
            lines.append(f"  캐시 적중 {st['cache_hit']:.0%} (캐시에서 읽음 {st['cache_read']:,} · 새로 씀 {st['cache_write']:,} · "
                         f"그냥 읽음 {st['fresh']:,} 토큰, 출력 {st['output']:,} 토큰)")
            for model, m in sorted(st["models"].items(), key=lambda x: -x[1].get("usd", 0)):
                lines.append(f"  {model}: {self.ledger.krw(m.get('usd', 0)):,}원 · {m.get('calls', 0):,}번 · 사진 "
                             f"{m.get('images', 0):,}장")
            if st["fails"]:
                lines.append("  실패: " + ", ".join(f"{KIND_KO.get(k, k)} {v}번" for k, v in st["fails"].items()))
        return "\n".join(lines).strip()

    def show_cost_details(self) -> None:
        QMessageBox.information(None, "비용 자세히", self.cost_details() + "\n\n화면 판단·화면 대사·분석·복기·총평은 "
                                "'하루 화면 비용 한도' 안에서만 써요 (설정 창 '화면 보기').")

    def _refresh_cost(self) -> None:
        text = self.cost_text()
        self.cost_action.setText(text)
        mode = f"지금 모드: {self.watcher.mode.name}" + (f" · 맨 앞: {self.watcher.title[:60]}" if self.watcher.title else "")
        if hasattr(self, "mode_action"):
            self.mode_action.setText(mode)
            self.watch_status_action.setText(self.watcher.status_text())
        if self.tray:
            self.tray.setToolTip(f"{self.window.sprites.name}\n{text}\n{mode}"[:120])

    def _budget_warning(self) -> None:
        """크레딧 소진·예산 80%·예산 초과를 달마다 한 번씩만 알린다."""
        budget = self.budget_usd()
        used = self.ledger.month_usd()
        credit = float(self.settings.get("budget.credit_usd", 0) or 0)
        month = self.ledger_month()
        state = self._load_state()
        warned = set(state.get("budget_warned_list", []))
        checks = [
            ("over", budget and used >= budget,
             f"이번 달 예산을 넘었어요 (${used:,.2f} / ${budget:,.0f})."
             + (" 화면 보기는 멈추고 대화만 할게요." if self.pref("screen.limit_stop", False) else " 화면 보기는 계속해요.")),
            ("warn", budget and used >= budget * float(self.settings.get("budget.warn_ratio", 0.8)),
             f"이번 달 예산의 {used / budget:.0%}를 썼어요 (${used:,.2f} / ${budget:,.0f})." if budget else ""),
            ("credit", credit and used >= credit,
             f"이번 달 크레딧 ${credit:,.0f}를 다 썼어요. 지금부터는 카드로 결제돼요 (예산 ${budget:,.0f})."),
        ]
        for level, hit, msg in checks:
            key = f"{level}:{month}"
            if hit and key not in warned:
                # 더 큰 단계를 알렸으면 작은 단계는 생략 (예: 초과를 알렸으면 80% 경고는 안 함)
                warned.update(f"{lv}:{month}" for lv, _, _ in checks[checks.index((level, hit, msg)):])
                state["budget_warned_list"] = sorted(warned)
                self._write_state(state)
                QTimer.singleShot(4000, lambda m=msg: self.bubble.show_text(m, self.anchor(), system=True, seconds=8))
                break

    @staticmethod
    def ledger_month() -> str:
        from datetime import date

        return date.today().isoformat()[:7]

    def show_memory(self) -> None:
        """기억 창: 늘 기억하는 것·보관된 것·찾아보기·일기."""
        from ui.memory_dialog import MemoryDialog

        self.sync_recall()
        MemoryDialog(self.companion.memory, self.recall_index, self.diary_dir).exec()

    def consolidate_now(self) -> None:
        self._consolidate(lambda ok: self.bubble.show_text("기억을 정리했어요." if ok else "정리할 새 대화가 없어요.",
                                                           self.anchor(), system=True, seconds=4),
                          lambda m: self.bubble.show_text(m, self.anchor(), system=True, seconds=8))

    def _consolidate(self, on_done: Callable | None = None, on_fail: Callable | None = None) -> None:
        if self.status.active("memory"):
            return
        self.status.begin("memory", "기억 정리 중")

        def done(ok) -> None:
            self.status.end("memory")
            log.info("기억 정리 %s", "완료" if ok else "할 것 없음")
            for f in getattr(self.companion, "last_archived", []) or []:  # 보관된 기억도 떠올리기로 찾을 수 있게
                self.remember_episode("fact", f"(예전 기억, {f.get('date', '')}) {f['text']}", f.get("subject", ""),
                                      f"{f['category']} · 보관 {f.get('archived', '')}")
            self.companion.last_archived = []
            if on_done:
                on_done(ok)

        def fail(message: str) -> None:
            self.status.end("memory")
            log.warning(message)
            if on_fail:
                on_fail(message)

        self._run(self.companion.consolidate, done, fail)

    # ------------------------------------------------------------ 원신 계정 정보

    def refresh_genshin(self, force: bool = False, wishes: bool = False) -> None:
        """실시간 메모(로그인했을 때), 진열장(원신 중이거나 직접 눌렀을 때), 기원 기록(게임을 껐을 때·직접)."""
        g = self.genshin
        if self._genshin_busy or not g.has_uid:
            if force and not g.has_uid:
                self.bubble.show_text("설정 창에 원신 UID 를 먼저 적어 주세요.", self.anchor(), system=True, seconds=5)
            return
        in_game = self.watcher.mode.name == "원신"
        self._genshin_busy = True
        if force:
            self.status.begin("genshin", "원신 정보 받는 중")

        def work():
            g.refresh_notes()
            if in_game or force:
                g.refresh_showcase(force=force)
            if wishes or force:
                g.refresh_wishes()
            return g.alerts()

        def done(alerts) -> None:
            self._genshin_busy = False
            self.status.end("genshin")
            errors = " ".join(dict.fromkeys(g.last_error.values()))
            if force and errors:
                self.bubble.show_text(errors, self.anchor(), system=True, seconds=8)
            if alerts:  # 알릴 일이 있으면 '받아 왔어요' 대신 다니카가 바로 말한다
                self._announce(alerts[0])
            elif force and not errors:
                self.bubble.show_text("원신 정보를 받아 왔어요.", self.anchor(), system=True, seconds=5)

        def fail(message: str) -> None:
            self._genshin_busy = False
            self.status.end("genshin")
            log.warning("원신 정보 받기 실패: %s", message)

        self._run(work, done, fail)

    def refresh_starrail(self, force: bool = False, warps: bool = False) -> None:
        """스타레일 실시간 메모(로그인했을 때), 워프 기록(게임을 껐을 때·직접). 원신과 같은 HoYoLAB 로그인."""
        g = self.starrail
        if self._starrail_busy or not g.has_uid:
            if force and not g.has_uid:
                self.bubble.show_text("설정 창 '게임 연결'에 스타레일 UID 를 먼저 적어 주세요.", self.anchor(), system=True,
                                      seconds=5)
            return
        self._starrail_busy = True
        if force:
            self.status.begin("starrail", "스타레일 정보 받는 중")

        def work():
            g.refresh_notes()
            if warps or force:
                g.refresh_wishes()
            return g.alerts()

        def done(alerts) -> None:
            self._starrail_busy = False
            self.status.end("starrail")
            errors = " ".join(dict.fromkeys(g.last_error.values()))
            if force and errors:
                self.bubble.show_text(errors, self.anchor(), system=True, seconds=8)
            if alerts:  # 알릴 일이 있으면 다니카가 바로 말한다
                self._announce("스타레일: " + alerts[0])
            elif force and not errors:
                self.bubble.show_text("스타레일 정보를 받아 왔어요.", self.anchor(), system=True, seconds=5)

        def fail(message: str) -> None:
            self._starrail_busy = False
            self.status.end("starrail")
            log.warning("스타레일 정보 받기 실패: %s", message)

        self._run(work, done, fail)

    def show_starrail(self) -> None:
        g = self.starrail
        text = g.context_text() or ("아직 받은 스타레일 정보가 없어요." if g.has_uid
                                    else "설정 창 '게임 연결'에 스타레일 UID 를 적어 주세요.")
        if g.last_error:
            text += "\n\n[문제]\n" + "\n".join(dict.fromkeys(g.last_error.values()))
        QMessageBox.information(None, "스타레일 정보", text)

    def check_reminders(self) -> None:
        self.check_chores()
        for r in self.planner.due():
            late = r.get("late_minutes", 0)
            text = r["text"]
            log.info("알림: %s (%d분 늦음)", text, late)
            self.show_overlay(f"알림: {text}", important=True)  # 게임 중이어도 보이게
            QApplication.beep()
            if self.busy:
                self.bubble.show_text(f"⏰ {text}", self.anchor(), system=True, seconds=12)
                continue
            fact = f"주인님이 부탁한 알림 시각이 됐다: {text}" + (f" (꺼져 있던 동안 {late}분 지났다)" if late > 2 else "")
            self.bubble.show_text(f"⏰ {text}", self.anchor(), system=True, seconds=6)  # 말이 나오기 전에도 바로 보이게
            self._run(lambda f=fact: self.companion.remark(f), self._on_screen_line,
                      lambda m: log.warning("알림 말하기 실패: %s", m))

    def run_program(self, name: str) -> None:
        """시작 메뉴·바탕화면 바로가기에서 찾아 켠다 (찾기는 뒤에서)."""
        import pc_control

        def work():
            path = pc_control.find_program(name)
            return path, (pc_control.launch(path) if path else False)

        def done(result) -> None:
            path, ok = result
            if ok:
                self.status.flash(f"'{path.stem}' 켰어요")
            else:
                self.bubble.show_text(f"'{name}' 바로가기를 시작 메뉴·바탕화면에서 못 찾았어요." if path is None
                                      else f"'{path.stem}'을(를) 켜지 못했어요.", self.anchor(), system=True, seconds=6)

        self._run(work, done, lambda m: log.warning("프로그램 켜기 실패: %s", m))

    def set_pc_monitor(self, on: bool) -> None:
        if on and not self.pc_timer.isActive():
            self.pc_timer.start(60_000)
            QTimer.singleShot(15_000, self.check_pc)
        elif not on:
            self.pc_timer.stop()

    def check_pc(self) -> None:
        """1분마다: PC 상태를 읽고 문제가 있으면 다니카가 알린다 (같은 문제는 30분에 한 번)."""
        if self._pc_busy:
            return
        self._pc_busy = True

        def done(status) -> None:
            self._pc_busy = False
            for problem in self.pc_monitor.check(status):
                log.info("PC 상태 알림: %s", problem)
                self._announce(f"PC 상태 문제: {problem} 주인님께 짧게 알리고 할 수 있는 일 하나를 말한다.")

        def fail(message: str) -> None:
            self._pc_busy = False
            log.warning("PC 상태를 읽지 못함 → 감시 끔: %s", message)
            self.pc_timer.stop()

        self._run(read_pc_status, done, fail)

    def make_recap(self, kind: str = "today") -> None:
        """오늘·어제·이번 주 정리: 이 PC 기록을 모아 다니카가 정리 → 분석 창 + 말풍선."""
        import recap

        kind = kind if kind in ("today", "yesterday", "week") else "today"
        self.status.begin("recap", "정리하는 중")

        def work():
            label, facts = recap.collect(kind, datetime.now(), self.screen_log, self.settings.data_dir / "logs",
                                         self.cyphers, self.planner)
            return self.companion.recap(label, facts)

        def done(a) -> None:
            self.status.end("recap")
            self._refresh_cost()
            if not a.speak:
                self.bubble.show_text("정리할 기록이 부족했어요.", self.anchor(), system=True, seconds=5)
                return
            self.analysis_panel.show_analysis(a)
            self._index_analysis(a, "diary")
            if not self.busy:
                self.bubble.show_text(a.summary, self.anchor(), seconds=10)
                self.window.set_emotion(a.emotion)
                self._start_talking()

        def fail(message: str) -> None:
            self.status.end("recap")
            self._on_error(message)

        self._run(work, done, fail)

    AWAY_MINUTES = 20  # 키보드·마우스를 이만큼 안 만지면 자리 비움 (게임 중엔 패드일 수 있어 빼고)
    LONG_AWAY_HOURS = 3  # 이만큼 비웠다 돌아오면 (자고 일어남) 오늘 브리핑

    def check_away(self) -> None:
        """30초마다: 자리 비움이면 화면 보기를 쉬고, 오래 비웠다 돌아오면 그때 브리핑한다. 쉬는 이유 표시도 갱신."""
        self._update_pause_status()
        idle = self.idle_seconds()
        now = self.clock()
        if self._away_since is not None and self.watcher.mode.is_game:  # 패드로만 게임해도 자리 비움 아님
            log.info("게임 중이라 자리 비움을 풂")
            self._away_since = None
            self._update_pause_status()
            return
        if self._away_since is None:
            if (idle >= self.AWAY_MINUTES * 60 and not self.watcher.mode.is_game
                    and self.pref("assist.pause_when_away", True)):
                self._away_since = now - idle
                log.info("자리 비움 (%.0f분째 입력 없음) → 화면 보기 쉼", idle / 60)
                self._update_pause_status()
            return
        if idle < 60:  # 돌아옴
            hours = (now - self._away_since) / 3600
            self._away_since = None
            log.info("돌아옴 (%.1f시간 비움)", hours)
            self._update_pause_status()
            if hours >= self.LONG_AWAY_HOURS:
                self.briefing(away_hours=hours)

    def briefing(self, force: bool = False, away_hours: float | None = None) -> None:
        """하루 첫 실행 때, 또는 오래 자리를 비웠다 돌아왔을 때(자고 일어남) 한마디:
        오늘 알림·할 일, 원신 레진, 어제 한 것 (이 PC 기록과 받아 둔 정보만). 하루 한 번."""
        import recap

        today = datetime.now().date().isoformat()
        if not force and (not self.pref("assist.briefing", True) or self.pref("assist.briefing_date", "") == today):
            return
        self.set_pref("assist.briefing_date", today)
        facts = []
        plan = self.planner.today_text()
        if plan:
            facts.append(plan)
        if self.genshin.has_login:
            notes = self.genshin.notes_text()
            if notes:
                facts.append("원신: " + notes)
            notes = self.starrail.notes_text()
            if notes:
                facts.append("스타레일: " + notes)
        _, yesterday = recap.collect("yesterday", datetime.now(), self.screen_log, None, None, None)
        if yesterday:
            facts.append("어제 화면으로 본 것: " + yesterday.split("\n")[0])
        if away_hours is not None:  # 자고 일어남: 브리핑할 게 없어도 돌아온 인사는
            self._announce(f"주인님이 {away_hours:.0f}시간쯤 자리를 비웠다가(자고 일어난 듯) 방금 돌아왔다. 돌아온 인사와 함께 "
                           + ("아래를 짧게 브리핑한다(두세 문장): " + " / ".join(facts) if facts else "짧게 한마디 한다."))
            return
        if not facts:
            return
        self._announce("오늘 처음 켰다. 하루 시작 인사와 함께 아래를 짧게 브리핑한다(두세 문장): " + " / ".join(facts))

    # ------------------------------------------------------------ 소리 내서 말하기·하이라이트·쓰다듬기

    def _say_aloud(self, text: str) -> None:
        if self.pref("voice.speak", False) and text and text != "……":
            self.speaker.speak(text)

    def _on_tts_state(self, speaking: bool) -> None:
        """읽는 동안엔 마이크가 다니카 목소리를 주인님 말로 듣지 않게 (게임 소리 듣기도 쉼)."""
        self._tts_speaking = speaking
        if speaking:
            self.voice.paused = True
        elif not self.busy:
            self.voice.paused = False

    def set_speak(self, on: bool) -> None:
        self.set_pref("voice.speak", on)
        if on:
            self.speaker.speak("이제 소리 내서 말할게요.")
            QTimer.singleShot(4000, lambda: (self.speaker.available is False) and self.bubble.show_text(
                self.speaker.problem, self.anchor(), system=True, seconds=10))

    def save_highlight(self, note: str = "", auto: bool = False) -> None:
        """방금 장면: 녹화 프로그램에 '방금 것 저장'을 누르고, 최근 화면 몇 장과 메모를 data/highlights/ 에 남긴다."""
        import pc_control

        self._last_clip = time.monotonic()
        tool = str(self.pref("pc.clip_tool", "gamebar"))
        pressed = pc_control.save_clip(tool)
        folder = self.settings.data_dir / "highlights" / time.strftime("%Y%m%d_%H%M%S")
        try:
            folder.mkdir(parents=True, exist_ok=True)
            for i, (_, jpeg) in enumerate(list(self.watcher.frames)[-6:], 1):
                (folder / f"{i:02d}.jpg").write_bytes(jpeg)
            for i, f in enumerate(self.watcher.sampler.recent(12.0), 1):  # 촘촘히 보기 중이면 지난 12초를 0.5초 간격으로
                (folder / f"seq_{i:02d}.jpg").write_bytes(f.jpeg)
            (folder / "메모.txt").write_text(f"{time.strftime('%Y-%m-%d %H:%M:%S')} [{self.watcher.mode.name}]\n{note}\n",
                                            encoding="utf-8")
        except OSError as exc:
            log.warning("하이라이트 저장 실패: %s", exc)
        log.info("하이라이트 저장 (%s, 녹화 단축키 %s)", "자동" if auto else "부탁", "누름" if pressed else "안 누름")
        if not auto:
            how = pc_control.CLIP_TOOLS.get(tool, ("", []))[0]
            self.status.flash(f"방금 장면 저장했어요{f' ({how})' if pressed else ' (화면 몇 장만)'}", 4)

    def _on_petted(self) -> None:
        self.window.set_emotion("happy")
        if time.monotonic() - self._last_pet < 120 or self.busy:
            return
        self._last_pet = time.monotonic()
        self._announce("주인님이 마우스로 네 머리를 쓰다듬었다. 캐릭터답게 아주 짧게(한 문장) 반응한다.")

    def open_planner(self) -> None:
        from ui.planner_dialog import PlannerDialog

        PlannerDialog(self.planner).exec()

    def _announce(self, fact: str, tries: int = 0) -> None:
        """레진이 넘치기 직전 같은 일을 다니카가 먼저 말한다 (바쁘면 조금 뒤에)."""
        if self.busy or (self.bubble.isVisible() and not self.bubble.system):  # 안내 말풍선은 덮어써도 됨
            if tries < 10:
                QTimer.singleShot(60_000, lambda: self._announce(fact, tries + 1))
            return
        self._run(lambda: self.companion.remark(fact), self._on_screen_line, lambda m: log.warning("알림 실패: %s", m))

    def refresh_game_news(self, mode=None, force: bool = False) -> None:
        """게임 최신 소식: 그 게임을 하는 날, 일주일에 한 번 검색해서 data/knowledge/ 에 넣는다 (사전에서 꺼내 씀)."""
        mode = mode or self.watcher.mode
        if not getattr(mode, "is_game", False) or not self.companion.can_search:
            if force:
                self.bubble.show_text("게임 모드일 때 확인할 수 있어요.", self.anchor(), system=True, seconds=4)
            return
        safe = re.sub(r'[\\/:*?"<>|\s]+', "_", mode.name)
        path = self.settings.data_dir / "knowledge" / f"news_{safe}.md"
        if not force and path.is_file() and time.time() - path.stat().st_mtime < 7 * 86400:
            return
        if self.status.active("news"):
            return
        self.status.begin("news", f"'{mode.name}' 최신 소식 확인 중")
        today = time.strftime("%Y-%m-%d")
        query = f"{mode.name} 최신 업데이트 이벤트 {time.strftime('%Y년 %m월')}"

        def work():
            notes, _ = self.companion.search(query, f"{mode.name}의 지금 진행 중인 이벤트·최근 업데이트·바뀐 점과 각각의 기간",
                                             remember=False)
            items = []
            if notes and self.pref("assist.auto_dates", True):
                try:
                    items = self.companion.extract_dates(mode.name, notes, today, self.watch_cfg.judge_model)
                except Exception as exc:  # noqa: BLE001 - 일정 뽑기가 안 돼도 소식은 저장
                    log.warning("일정 뽑기 실패: %s", exc)
            return notes, items

        def done(result) -> None:
            self.status.end("news")
            notes, items = result
            if not notes:
                return
            words = ", ".join(dict.fromkeys([mode.name, *mode.titles, "최신", "이벤트", "업데이트", "패치", "신규"]))
            path.parent.mkdir(parents=True, exist_ok=True)
            games = ", ".join(dict.fromkeys([mode.name, *mode.titles]))
            path.write_text(f"게임: {games}\n\n## {mode.name} 최신 소식 ({today} 확인)\n키워드: {words}\n{notes}\n",
                            encoding="utf-8")
            added = self.schedule_from_news(mode.name, items)
            if added:
                log.info("최신 소식에서 알림 %d개 자동 등록", added)
            self.companion.reload_lore()
            log.info("게임 최신 소식 저장: %s", path)
            if force:
                self.bubble.show_text(f"{mode.name} 최신 소식을 확인해 두었어요.", self.anchor(), system=True, seconds=4)

        def fail(message: str) -> None:
            self.status.end("news")
            log.warning("게임 최신 소식 실패: %s", message)

        self._run(work, done, fail)

    def _on_mode_changed(self, name: str) -> None:
        if self._last_mode == "원신" and name != "원신":  # 게임을 끄면 기원 기록 파일을 읽을 수 있다
            QTimer.singleShot(5000, lambda: self.refresh_genshin(wishes=True))
        elif name == "원신":
            QTimer.singleShot(3000, lambda: self.refresh_genshin())
        if self._last_mode == "스타레일" and name != "스타레일":  # 게임을 끄면 워프 기록 파일을 읽을 수 있다
            QTimer.singleShot(5000, lambda: self.refresh_starrail(warps=True))
        elif name == "스타레일":
            QTimer.singleShot(3000, lambda: self.refresh_starrail())
        elif name == "사이퍼즈":
            QTimer.singleShot(3000, lambda: self.refresh_cyphers())
        if self.watcher.mode.is_game:
            QTimer.singleShot(15_000, lambda: self.refresh_game_news())
        self._last_mode = name

    def _game_context(self, mode) -> str:
        """화면 대사·분석에 덧붙일 실제 게임 데이터 (지금 모드에 맞는 것만)."""
        name = getattr(mode, "name", "")
        parts = [self.progress.prompt_text(name)] if name else []
        if name == "원신":
            parts.append(self.genshin.context_text())
        if name == "스타레일":
            parts.append(self.starrail.context_text())
        if name == "사이퍼즈":
            parts.append(self.cyphers.context_text())
        return "\n".join(p for p in parts if p)

    # ------------------------------------------------------------ 이어하기·진행 기억·숙제·일정

    def _on_game_started(self, game: str) -> None:
        """게임을 켬: 오래간만이면(1시간+) 지난번 어디까지 했는지 한마디."""
        before = self.progress.last_played(game)
        self.progress.played(game)
        text = self.progress.text_for(game)
        if not text or not self.pref("assist.resume", True):
            return
        if before is not None and datetime.now() - before < timedelta(hours=1):
            return
        when = f"{before:%m/%d %H:%M}" if before else "지난번"
        self._announce(f"주인님이 {game}을(를) 다시 켰다. 지난번({when})까지의 진행: {text}. 이어하기 한마디로 어디까지 했는지와 "
                       "다음 목표를 짧게(한두 문장) 상기시킨다. 그보다 뒤의 스토리는 말하지 않는다.")

    def _on_game_ended(self, game: str, minutes: float, notes: list) -> None:
        """게임을 끔: 화면으로 본 기록으로 진행을 갱신 (싼 모델)."""
        self.progress.played(game)
        prev = self.progress.text_for(game)
        keeper = getattr(self, "context_keeper", None)  # 맥락 담당이 적은 '지금까지 흐름'도 오래 기억에 (다음에 '저번 판에서…')
        story = keeper.story if keeper is not None and keeper.game == game and keeper.story else ""
        detail = (f"흐름(추측): {story} / " if story else "") + " / ".join(notes[-30:])
        self.remember_episode("game", f"{game} 약 {minutes:.0f}분 플레이", game, detail)

        def done(text: str) -> None:
            if text and text != prev:
                self.progress.set_progress(game, text)
                log.info("진행 기억 갱신 [%s] %s", game, text)

        self._run(lambda: self.companion.update_progress(game, prev, notes, self.watch_cfg.judge_model), done,
                  lambda m: log.warning("진행 정리 실패: %s", m))

    def check_chores(self) -> None:
        """5분마다: 밤에 오늘 아직 안 켠 게임의 일일·주간 숙제 (원신은 HoYoLAB 이 있으면 그쪽 알림을 씀)."""
        if not self.pref("assist.chores", True) or time.monotonic() - self._last_chores < 300:
            return
        self._last_chores = time.monotonic()
        modes = [m for m in self.watcher.modes if not (m.name == "원신" and self.genshin.has_login)
                 and not (m.name == "스타레일" and self.starrail.has_login and self.starrail.has_uid)]
        for chore in self.progress.chores(modes):
            log.info("숙제 알림: %s", chore)
            self._announce(f"게임 숙제 알림: {chore} 주인님께 짧게 알린다.")

    def schedule_from_news(self, game: str, items: list[dict]) -> int:
        """최신 소식에서 뽑은 일정 → 알림 (이벤트·기원: 3일 전·하루 전 저녁 8시 / 점검: 1시간 전). 같은 건 한 번만."""
        now = datetime.now()
        existing = {r["text"] for r in self.planner.reminders}
        added = 0

        def add(when: datetime, text: str) -> None:
            nonlocal added
            if when > now and text not in existing:
                self.planner.add_reminder(when, text)
                existing.add(text)
                added += 1

        for it in items:
            name = str(it.get("name", "")).strip()[:60]
            try:
                end = datetime.strptime(it.get("end", ""), "%Y-%m-%d %H:%M") if it.get("end") else None
                start = datetime.strptime(it.get("start", ""), "%Y-%m-%d %H:%M") if it.get("start") else None
            except ValueError:
                continue
            if not name:
                continue
            if it.get("kind") == "maintenance" and start:
                add(start - timedelta(hours=1), f"[자동] {game} 점검 1시간 전: {name} ({start:%m/%d %H:%M} 시작)")
            elif it.get("kind") in ("event", "banner") and end:
                for days, label in ((3, "3일"), (1, "하루")):
                    at = datetime.combine((end - timedelta(days=days)).date(), datetime.min.time()).replace(hour=20)
                    if end - now > timedelta(days=days):
                        add(at, f"[자동] {game} {name} 끝나기 {label} 전 ({end:%m/%d %H:%M} 종료)")
        return added

    # 결과 화면을 본 뒤 공식 기록을 확인하는 때(분). 공식 기록은 늦으면 1시간쯤 뒤에 올라온다
    RECORD_CHECKS = (2, 8, 20, 40, 65)

    def _on_result_seen(self, mode_name: str) -> None:
        """사이퍼즈 결과 화면 → 이 판 공식 기록이 올라오면 그 숫자로 한 번 더 깊게 되짚는다."""
        if mode_name != "사이퍼즈" or not self.cyphers.ready:
            return
        s = self.watcher.session
        self._record_wait = {"known": self.cyphers.match_ids(), "notes": list(s.notes) if s else [],
                             "mode": self.watcher.mode, "checks": 0}
        if self.cyphers.fetched_at is None:  # 아직 한 번도 안 받았으면 '이미 있던 판'을 모름 → 지금 받아 둔다
            self._record_wait["known"] = None
            QTimer.singleShot(1000, self.check_cyphers_record)
        for minutes in self.RECORD_CHECKS:
            QTimer.singleShot(minutes * 60_000, self.check_cyphers_record)

    def check_cyphers_record(self) -> None:
        wait, c = self._record_wait, self.cyphers
        if not wait or self._cyphers_busy:
            return
        wait["checks"] += 1
        self._cyphers_busy = True

        def work():
            if not c.refresh():
                return None
            if wait["known"] is None:  # 기준이 될 '이미 있던 판' 목록만 받아 둠
                wait["known"] = c.match_ids()
                return None
            new = [m for m in c.all_matches() if str(m.get("matchId", "")) not in wait["known"]]
            if not new:
                return None
            match = new[0]
            try:
                detail = c.match_detail(str(match["matchId"]))
            except Exception as exc:  # noqa: BLE001 - 상세를 못 받으면 목록에 있는 내 기록만으로
                log.warning("사이퍼즈 경기 상세 실패: %r", exc)
                detail = match
            return json.dumps(compact(detail), ensure_ascii=False)[:9000]

        def done(record) -> None:
            self._cyphers_busy = False
            if record and self._record_wait is wait:
                self._record_wait = None
                self.review_official_record(record, wait["mode"], wait["notes"])
            elif wait["checks"] >= len(self.RECORD_CHECKS) + 1 and self._record_wait is wait:
                self._record_wait = None  # 끝내 안 올라옴

        def fail(message: str) -> None:
            self._cyphers_busy = False
            log.warning("사이퍼즈 공식 기록 확인 실패: %s", message)

        self._run(work, done, fail)

    def review_official_record(self, record: str, mode=None, notes: list[str] | None = None) -> None:
        self.status.begin("record", "공식 기록으로 되짚는 중")

        def done(a) -> None:
            self.status.end("record")
            self._refresh_cost()
            if not a.speak:
                return
            self.analysis_panel.show_analysis(a)
            self._index_analysis(a)
            if not self.busy:
                self.bubble.show_text("아까 그 판 공식 기록이 올라와서 다시 봤어요. " + a.summary, self.anchor(), seconds=12)
                self.window.set_emotion(a.emotion)
                self._start_talking()

        def fail(message: str) -> None:
            self.status.end("record")
            log.warning("공식 기록 총평 실패: %s", message)

        self._run(lambda: self.companion.game_review(record, mode, notes, deep=self.watch_cfg.deep_result,
                                                     nickname=self.cyphers.nickname), done, fail)

    def refresh_cyphers(self, force: bool = False) -> None:
        c = self.cyphers
        if self._cyphers_busy or not c.ready:
            if force and not c.ready:
                self.bubble.show_text("설정 창 '사이퍼즈 연결'에 API 키와 닉네임을 먼저 넣어 주세요.", self.anchor(),
                                      system=True, seconds=6)
            return
        if not force and c.fetched_at and c.clock() - c.fetched_at < 30 * 60:  # 공식 기록은 1시간마다 갱신
            return
        self._cyphers_busy = True
        if force:
            self.status.begin("cyphers", "사이퍼즈 전적 받는 중")

        def done(ok) -> None:
            self._cyphers_busy = False
            self.status.end("cyphers")
            if force:
                self.bubble.show_text("사이퍼즈 전적을 받아 왔어요." if ok else c.last_error, self.anchor(), system=True,
                                      seconds=6)

        def fail(message: str) -> None:
            self._cyphers_busy = False
            self.status.end("cyphers")
            log.warning("사이퍼즈 전적 실패: %s", message)

        self._run(c.refresh, done, fail)

    def hoyolab_status(self) -> str:
        if not self.genshin.has_login:
            return "연결 안 됨"
        err = self.genshin.last_error.get("notes") or self.starrail.last_error.get("notes")
        return "연결됨" + (f" (문제: {err})" if err else "")

    def hoyolab_login(self) -> str:
        dlg = HoyolabLogin()
        if dlg.exec() == HoyolabLogin.DialogCode.Accepted and cookies_complete(dlg.cookies):
            self.secrets.set("hoyolab", dlg.cookies)
            QTimer.singleShot(500, lambda: self.refresh_genshin(force=True))
            QTimer.singleShot(2500, lambda: self.refresh_starrail(force=self.starrail.has_uid))
        return self.hoyolab_status()

    def hoyolab_logout(self) -> str:
        self.secrets.delete("hoyolab")
        self.genshin.notes = None
        self.starrail.notes = None
        return self.hoyolab_status()

    def show_genshin(self) -> None:
        g = self.genshin
        text = g.context_text() or "아직 받은 원신 정보가 없어요."
        if g.last_error:
            text += "\n\n[문제]\n" + "\n".join(dict.fromkeys(g.last_error.values()))
        QMessageBox.information(None, "원신 정보", text)

    # ------------------------------------------------------------ 게임 모드 만들기

    def _load_modes(self) -> list:
        """함께 온 모드(modes/) + 다니카가 만든 모드(data/modes/)."""
        return load_modes(self.settings.root / "modes") + load_modes(self.settings.data_dir / "modes")

    def make_game_mode_now(self) -> None:
        """대화나 메뉴로: 지금 보는 모니터 맨 앞 프로그램으로 게임 모드를 만든다."""
        self.watcher.update_mode()
        if self.watcher.mode.is_game:
            self.bubble.show_text(f"이미 '{self.watcher.mode.name}' 모드로 보고 있어요.", self.anchor(), system=True,
                                  seconds=4)
            return
        if not self.watcher.process:
            self.bubble.show_text("어떤 게임인지 찾지 못했어요. 게임 창을 보는 모니터 맨 앞에 두고 다시 말해 주세요.",
                                  self.anchor(), system=True, seconds=6)
            return
        self.make_game_mode(self.watcher.process, self.watcher.window_title,
                            self.watcher.game_hits.get(self.watcher.process, []), auto=False)

    def make_game_mode(self, process: str, title: str, seen: list, auto: bool) -> None:
        if self.status.active("mode"):
            return
        state = self._load_state()
        tried = set(state.get("auto_mode_tried", [])) | {process}
        state["auto_mode_tried"] = sorted(tried)  # 지워도 다시 자동으로 만들지 않게
        self._write_state(state)
        self.watcher.known_games.add(process)
        self.status.begin("mode", f"'{(title or process)[:16]}' 게임 모드 만드는 중")

        def done(result) -> None:
            self.status.end("mode")
            data, _ = result
            if not data or not str(data.get("knowledge", "")).strip():
                if not auto:
                    self.bubble.show_text("게임 모드를 만들지 못했어요.", self.anchor(), system=True, seconds=5)
                return
            try:
                path = save_mode(self.settings.data_dir / "modes", process, data)
            except Exception as exc:  # noqa: BLE001
                log.warning("게임 모드 저장 실패: %s", exc)
                return
            log.info("게임 모드를 만들었어요: %s", path)
            self.watcher.modes = self._load_modes()
            self.watcher.update_mode()
            self._refresh_cost()
            intro = str(data.get("intro", "")).strip() or f"'{data.get('name', process)}' 모드를 준비해 두었습니다."
            if not self.busy:
                self.bubble.show_text(intro, self.anchor())
                self._start_talking()
            self.companion.memory.add_spoken(intro)

        def fail(message: str) -> None:
            self.status.end("mode")
            log.warning("게임 모드 만들기 실패: %s", message)
            if not auto:
                self.bubble.show_text(f"게임 모드를 만들지 못했어요: {message}", self.anchor(), system=True, seconds=6)

        self._run(lambda: self.companion.make_mode(process, title, seen), done, fail)

    # ------------------------------------------------------------ 영상 복기

    def review_recent(self, minutes: int = 10) -> None:
        """녹화 없이: 화면 기억에 저장된 지난 N분 화면으로 영상 복기처럼 되짚는다."""
        if self.status.active("video"):
            self.status.flash("복기가 이미 진행 중이에요")
            return
        now = datetime.now()
        shots = [e for e in self.screen_log.entries(now - timedelta(minutes=minutes), now) if e.file]
        if len(shots) < 2:
            self.bubble.show_text("지난 화면이 충분히 저장돼 있지 않아요. 화면 기억이 켜져 있는지 확인해 주세요.",
                                  self.anchor(), system=True, seconds=6)
            return
        step = max(1, -(-len(shots) // 20))  # 10분 전체에 고르게 (최대 20장), 마지막 화면은 꼭 넣는다
        picked = shots[::step]
        if picked[-1] is not shots[-1]:
            picked = picked[-19:] + [shots[-1]]
        t0 = picked[0].time
        mode = self.watcher.mode if self.watcher.mode.is_game else None
        self.status.begin("video", f"지난 {minutes}분 복기 중")

        def work():
            frames = [((e.time - t0).total_seconds(), e.file.read_bytes()) for e in picked]
            name = f"지난 {minutes}분 화면 ({t0:%H:%M}~{picked[-1].time:%H:%M})"
            return self.companion.review_video(frames, name, None, mode)

        def done(result) -> None:
            self.status.end("video")
            if not result.speak:
                self.bubble.show_text("지난 화면에서는 짚을 만한 걸 찾지 못했어요.", self.anchor(), system=True, seconds=5)
                return
            import video_review as vr

            vr.save_markdown(self.settings.data_dir / "reviews", f"recent_{minutes}min", result)
            self.analysis_panel.show_analysis(result)
            if not self.busy:
                self.bubble.show_text(result.summary, self.anchor())
                self.show_overlay(result.summary)
                self._start_talking()

        def fail(message: str) -> None:
            self.status.end("video")
            self.bubble.show_text(f"복기 실패: {message}", self.anchor(), system=True, seconds=8)

        self._run(work, done, fail)

    def open_screens_folder(self) -> None:
        folder = self.screen_log.folder
        folder.mkdir(parents=True, exist_ok=True)
        if sys.platform == "win32":
            os.startfile(str(folder))  # noqa: S606 - 탐색기로 열기
        else:
            self.bubble.show_text(str(folder), self.anchor(), system=True, seconds=6)

    def review_video_file(self, path: str | None = None) -> None:
        """녹화한 게임 영상 → 구간·간격 고르기 → 장면 뽑기 → 시간대별 복기 (분석 창 + data/reviews/)."""
        import video_review as vr

        if self.status.active("video"):
            self.status.flash("영상 복기가 이미 진행 중이에요")
            return
        if path is None:
            path, _ = QFileDialog.getOpenFileName(None, "복기할 영상 고르기", str(Path.home() / "Videos"),
                                                  "영상 (" + " ".join(vr.VIDEO_EXT) + ")")
        if not path:
            return
        try:
            info = vr.probe(Path(path))
        except Exception as exc:  # noqa: BLE001
            self.bubble.show_text(str(exc), self.anchor(), system=True, seconds=6)
            return
        games = [m.name for m in self.watcher.modes]
        guess = next((m.name for m in self.watcher.modes
                      if any(t.lower() in info.path.name.lower() for t in [m.name, *m.titles] if t)), "")
        dlg = VideoReviewDialog(info, games, guess or (self.watcher.mode.name if self.watcher.mode.is_game else ""),
                                self.ledger.krw_per_usd)
        if dlg.exec() != VideoReviewDialog.DialogCode.Accepted:
            return
        c = dlg.choices()
        mode = next((m for m in self.watcher.modes if m.name == c["game"]), None)
        self.status.begin("video", "영상 장면 뽑는 중")

        def work(progress):
            frames = vr.sample_frames(info.path, c["times"], progress=lambda i, n: progress(("frames", i, n)))
            progress(("review", 0, 0))
            last = [-1]

            def count(n: int) -> None:
                if n != last[0]:
                    last[0] = n
                    progress(("review", n, 0))

            return self.companion.review_video(frames, info.path.name, c["question"] or None, mode, on_count=count)

        def on_progress(p) -> None:
            kind, i, n = p
            if kind == "frames":
                self.status.set_text("video", f"영상 장면 뽑는 중 {i}/{n}")
            else:
                self.status.set_text("video", "영상 복기 중" + (f" (짚은 장면 {i}개)" if i else ""))

        def done(result) -> None:
            self.status.end("video")
            if not result.speak:
                self.bubble.show_text("이 영상에서는 짚을 만한 걸 찾지 못했어요.", self.anchor(), system=True, seconds=5)
                return
            saved = vr.save_markdown(self.settings.data_dir / "reviews", info.path.name, result)
            log.info("영상 복기 저장: %s", saved)
            self.analysis_panel.show_analysis(result)
            if not self.busy:
                self.bubble.show_text(result.summary, self.anchor())
                self._start_talking()
            self._refresh_cost()

        def fail(message: str) -> None:
            self.status.end("video")
            self.bubble.show_text(f"영상 복기 실패: {message}", self.anchor(), system=True, seconds=8)

        self._run(work, done, fail, on_progress=on_progress)

    BUBBLE_TIMES = {"short": (4.0, 0.12), "normal": (6.0, 0.18), "long": (9.0, 0.26)}  # (최소 초, 글자당 초)

    def _apply_bubble_time(self, key: str) -> None:
        self.bubble.min_seconds, self.bubble.seconds_per_char = self.BUBBLE_TIMES.get(key, self.BUBBLE_TIMES["normal"])

    def _rule_scope(self, target: str) -> tuple[str, str]:
        """'칸코레: 원정 얘기 하지 않기' → ('칸코레', '원정 얘기 하지 않기'). 범위가 없으면 지금 게임, 아니면 전체."""
        names = {m.name for m in self.watcher.modes}
        here = self.watcher.mode.name if self.watcher.mode.is_game else "전체"
        head, sep, rest = target.partition(":")
        head = head.strip()
        if sep and rest.strip():
            if head in ("전체", "어디서든", "항상", "모든 곳"):
                return "전체", rest.strip()
            if head in names:
                return head, rest.strip()
            if len(head) <= 15:  # 게임 이름을 조금 다르게 적었으면 (예: '칸타이 컬렉션') 지금 게임으로
                return here, rest.strip()
        return here, target.strip()

    def open_terms(self) -> None:
        from ui.terms_dialog import TermsDialog

        TermsDialog(self.companion.memory).exec()

    def open_rules(self) -> None:
        from ui.rules_dialog import RulesDialog

        RulesDialog(self.companion.memory, ["전체"] + [m.name for m in self.watcher.modes]).exec()

    def show_history(self) -> None:
        HistoryDialog(self.settings.data_dir / "logs").exec()

    def open_wishlist(self) -> None:
        WishlistDialog(self.wishlist).exec()

    # ------------------------------------------------------------ 파일 정리

    def organize_from_chat(self, target: str) -> None:
        found = org.resolve_target(target)
        if found:
            self.organize(*found)
        else:
            self.organize_pick()

    def organize_pick(self) -> None:
        path = QFileDialog.getExistingDirectory(None, "정리할 폴더를 골라주세요", str(org.known_folder("다운로드")))
        if path:
            self.organize(Path(path), Path(path).name or path)

    def organize(self, folder: Path, label: str) -> None:
        """폴더 목록 읽기 → 다니카가 정리안 만들기 → 미리보기에서 고르기 → 옮기기."""
        if self.organizing:
            self.status.flash("이미 파일 정리 중이에요")
            return
        reason = org.blocked_reason(folder)
        if reason:
            self.bubble.show_text(reason, self.anchor(), system=True, seconds=6)
            return
        self.organizing = True
        self.status.begin("organize", f"{label} 파일 목록 읽는 중")

        def work(progress):
            files, total = org.scan(folder)
            if not files:
                return files, total, None
            progress(("plan", 0))
            last = [0]

            def count(n: int) -> None:
                if n != last[0]:
                    last[0] = n
                    progress(("plan", n))

            return files, total, self.companion.plan_organize(label, files, on_count=count)

        self._run(work, lambda r: self._organize_planned(folder, label, *r), self._organize_failed,
                  on_progress=self._organize_progress)

    def _organize_progress(self, info) -> None:
        kind, n = info
        if kind == "plan":
            self.status.set_text("organize", "정리안 만드는 중" + (f" ({n}개째)" if n else ""))
        elif kind == "move":
            self.status.set_text("organize", f"파일 옮기는 중 {n[0]}/{n[1]}")
        elif kind == "undo":
            self.status.set_text("organize", f"되돌리는 중 {n[0]}/{n[1]}")

    def _organize_planned(self, folder: Path, label: str, files: list, total: int, plan: dict | None) -> None:
        self.status.end("organize")
        if not files:
            self.organizing = False
            self.bubble.show_text(f"{label} 폴더엔 정리할 파일이 없네요. 이미 말끔합니다.", self.anchor())
            return
        moves = org.sanitize(plan, files)
        if not moves:
            self.organizing = False
            self.bubble.show_text((plan or {}).get("summary") or "옮길 만한 파일이 없어요. 지금 그대로가 좋겠습니다.",
                                  self.anchor())
            return
        dlg = OrganizeDialog(label, str((plan or {}).get("summary", "")), moves, total)
        if dlg.exec() != OrganizeDialog.DialogCode.Accepted:
            self.organizing = False
            self.status.flash("정리를 취소했어요")
            return
        chosen = dlg.selected_moves()
        self.status.begin("organize", f"파일 옮기는 중 0/{len(chosen)}")
        self._run(lambda progress: self.organizer.apply(folder, chosen, lambda i, n: progress(("move", (i, n)))),
                  lambda res: self._organized(label, res), self._organize_failed, on_progress=self._organize_progress)

    def _organized(self, label: str, res) -> None:
        self.organizing = False
        self.status.end("organize")
        n = len(res.moved)
        msg = f"{label} 폴더 파일 {n}개를 정리해 두었습니다."
        if res.failed:
            msg += f" {len(res.failed)}개는 쓰는 중이거나 없어서 그대로 뒀어요."
        self.bubble.show_text(msg, self.anchor())
        self._start_talking()
        if n:
            self.companion.memory.add_spoken(f"(파일 정리) {label} 폴더 파일 {n}개를 종류별 하위 폴더로 옮겨 두었다.")

    def _organize_failed(self, message: str) -> None:
        self.organizing = False
        self.status.end("organize")
        self.bubble.show_text(f"파일 정리 실패: {message}", self.anchor(), system=True, seconds=8)

    def undo_organize(self) -> None:
        if self.organizing:
            self.status.flash("이미 파일 정리 중이에요")
            return
        batch = self.organizer.last_batch()
        if not batch:
            self.bubble.show_text("되돌릴 파일 정리가 없어요.", self.anchor(), system=True, seconds=4)
            return
        box = QMessageBox(QMessageBox.Icon.Question, "마지막 정리 되돌리기",
                          f"{batch['time']} 에 {batch['folder']} 에서 옮긴 파일 {len(batch['moves'])}개를 원래 자리로 돌릴까요?")
        yes = box.addButton("되돌리기", QMessageBox.ButtonRole.AcceptRole)
        box.addButton("취소", QMessageBox.ButtonRole.RejectRole)
        box.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        box.exec()
        if box.clickedButton() is not yes:
            return
        self.organizing = True
        self.status.begin("organize", "되돌리는 중")

        def done(result) -> None:
            self.organizing = False
            self.status.end("organize")
            ok, bad = result
            msg = f"{ok}개를 원래 자리로 돌려놓았습니다."
            if bad:
                msg += f" {bad}개는 이미 옮겨졌거나 같은 이름이 있어서 그대로 뒀어요."
            self.bubble.show_text(msg, self.anchor())

        self._run(lambda progress: self.organizer.undo_last(lambda i, n: progress(("undo", (i, n)))), done,
                  self._organize_failed, on_progress=self._organize_progress)

    # ------------------------------------------------------------ 상태 저장

    def _load_state(self) -> dict:
        try:
            return json.loads(self.state_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}

    def _write_state(self, state: dict) -> None:
        self.state_path.write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding="utf-8")

    def _save_position(self, pos: QPoint) -> None:
        state = self._load_state()
        state["window_pos"] = [pos.x(), pos.y()]
        self._write_state(state)


def split_names(value) -> list[str]:
    """'하늘고래, SkyWhale' → ['하늘고래', 'SkyWhale']"""
    return [n.strip() for n in str(value or "").replace("，", ",").split(",") if n.strip()][:5]


def relaunch(root: Path) -> None:
    start = root / "launcher.py" if (root / "launcher.py").is_file() else root / "main.py"
    subprocess.Popen([sys.executable, str(start), "--after", str(os.getpid())], cwd=str(root),
                     creationflags=getattr(subprocess, "DETACHED_PROCESS", 0))


def settings_flag(settings: Settings, key: str, default: bool) -> bool:
    value = settings.get(key, default)
    return value if isinstance(value, bool) else str(value).lower() in ("1", "true", "yes", "on")


_crash_file = None


def install_crash_logging(folder: Path) -> None:
    """갑자기 꺼지면 crash.log, 처리 못 한 오류는 app.log 에 남긴다."""
    global _crash_file
    import faulthandler
    import threading

    folder.mkdir(parents=True, exist_ok=True)
    _crash_file = open(folder / "crash.log", "a", encoding="utf-8")  # noqa: SIM115 - 프로그램이 끝날 때까지 열어 둠
    faulthandler.enable(file=_crash_file, all_threads=True)
    sys.excepthook = lambda t, v, tb: log.critical("처리 못 한 오류", exc_info=(t, v, tb))
    threading.excepthook = lambda a: log.critical("스레드 오류 (%s)", a.thread, exc_info=(a.exc_type, a.exc_value,
                                                                                         a.exc_traceback))


class HangWatch(QObject):
    """화면(메인 스레드)이 limit 초 넘게 멈추면, 그때 모든 스레드가 어디에 있었는지 hang.log 에 남긴다."""

    def __init__(self, folder: Path, limit: float = 8.0):
        super().__init__()
        import threading

        self.path, self.limit = folder / "hang.log", limit
        self.beat = time.monotonic()
        self.reported = False
        self.timer = QTimer(self)
        self.timer.timeout.connect(self._beat)
        self.timer.start(1000)
        threading.Thread(target=self._watch, daemon=True, name="hang-watch").start()

    def _beat(self) -> None:
        if self.reported:
            log.warning("화면이 다시 움직임 (%.0f초 멈췄음)", time.monotonic() - self.stuck_since)
        self.beat = time.monotonic()
        self.reported = False

    def _watch(self) -> None:
        import faulthandler
        from datetime import datetime

        while True:
            time.sleep(min(2.0, self.limit / 2))
            stuck = time.monotonic() - self.beat
            if stuck > self.limit and not self.reported:
                self.reported, self.stuck_since = True, self.beat
                try:
                    with open(self.path, "a", encoding="utf-8") as f:
                        f.write(f"\n=== {datetime.now():%Y-%m-%d %H:%M:%S} 화면이 {stuck:.0f}초째 멈춤 ===\n")
                        f.flush()
                        faulthandler.dump_traceback(file=f, all_threads=True)
                except OSError:
                    pass
                log.error("화면이 %.0f초째 멈춤 → %s 에 기록", stuck, self.path)


def setup_logging(folder: Path) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    handler = logging.handlers.RotatingFileHandler(folder / "app.log", maxBytes=1_000_000, backupCount=3, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    root.addHandler(handler)
    if sys.stderr:
        root.addHandler(logging.StreamHandler())


def apply_saved_prefs(settings: Settings) -> None:
    """설정 창·메뉴에서 바꿔 저장한 값(data/state.json)을 config.toml 위에 덮는다."""
    try:
        prefs = json.loads((settings.data_dir / "state.json").read_text(encoding="utf-8")).get("prefs", {})
    except (OSError, json.JSONDecodeError):
        prefs = {}
    for key, value in prefs.items():
        if key == "voice.device" and str(value) not in ("cpu", "cuda", "auto"):
            key = "voice.mic"  # 예전 버전은 마이크 이름을 voice.device 에 저장했음 (음성 인식 장치와 이름이 겹침)
        settings.set(key, value)


def character_profiles(settings: Settings) -> dict[str, dict]:
    """[characters.*] 프로필 (없으면 다니카 하나)."""
    profiles = settings.get("characters", {}) or {}
    profiles = {str(k): v for k, v in profiles.items() if isinstance(v, dict)}
    return profiles or {DEFAULT_WHO: {"name": "다니카"}}


def apply_character_profile(settings: Settings) -> tuple[str, str]:
    """지금 캐릭터(character.active) 프로필의 값(folder·persona·lore·lore_dirs·scale …)을 character.* 위에 덮는다.
    프로필에 없는 값은 [character] 값 그대로 (다니카는 예전 설정 그대로 쓰게). (키, 보이는 이름)"""
    profiles = character_profiles(settings)
    key = str(settings.get("character.active", "") or DEFAULT_WHO)
    if key not in profiles:
        key = DEFAULT_WHO if DEFAULT_WHO in profiles else next(iter(profiles))
    prof = profiles[key]
    for k, v in prof.items():
        if k != "name":
            settings.set(f"character.{k}", v)
    name = str(prof.get("name") or "다니카")
    settings.set("character.key", key)
    settings.set("character.name", name)
    return key, name


def build(settings: Settings, ai: AIClient | None = None, tray: bool = True) -> AssistantApp:
    apply_saved_prefs(settings)
    char_key, char_name = apply_character_profile(settings)
    data = settings.data_dir
    ledger = UsageLedger(data / "usage.json", float(settings.get("budget.krw_per_usd", 1400)))
    ai = ai or AIClient(ledger, float(settings.get("ai.timeout_seconds", 60)))
    ai.ledger = ledger
    memory = Memory(data, who=char_key, name=char_name)  # 주인님 기억은 같이, 캐릭터 자기 대화·기억은 따로
    persona_path = settings.path("character.persona")
    persona = Companion.read_persona(persona_path)
    if persona is None:
        log.warning("성격 파일이 없어 기본 말투를 씁니다: %s", settings.get("character.persona"))
    # 배경지식: character.lore, 없으면 성격 파일 옆의 lore.md
    lore_path = settings.path("character.lore") or (persona_path.with_name("lore.md") if persona_path else None)
    lore = Companion.read_persona(lore_path)
    if lore:
        log.info("배경지식 %d자: %s", len(lore), lore_path)
    companion = Companion(
        ai, memory, persona,
        chat_model=settings.get("ai.chat_model", "claude-opus-5-5"),
        memory_model=settings.get("ai.memory_model", "claude-opus-5-5"),
        effort=settings.get("ai.effort", "low"),
        max_tokens=int(settings.get("ai.max_tokens", 2000)),
        history_turns=int(settings.get("ai.history_turns", 10)),
        consolidate_every=int(settings.get("memory.consolidate_every", 20)),
        memory_max_chars=int(settings.get("memory.max_chars", 4000)),
        lore=lore,
        search_model=settings.get("ai.search_model", "claude-haiku-5-5"),
    )
    # 사전(필요할 때 꺼내 보는 지식): 캐릭터 사전(성격 파일 옆, git 제외) + 게임 지식(knowledge/, 업데이트로 옴)
    # + 다니카가 받아 둔 게임 최신 소식(data/knowledge/). persona.md·lore.md 는 늘 아는 것이라 빼고 읽는다
    lore_dir = settings.path("character.lore_dir")
    extra = [settings.root / Path(p) if not Path(p).is_absolute() else Path(p)
             for p in (settings.get("character.lore_dirs") or [])]  # 캐릭터 프로필: 사전 폴더 여러 개
    char_dirs = extra or ([lore_dir] if lore_dir else ([persona_path.parent, persona_path.parent / "lore"] if persona_path else []))
    if persona_path:  # 반응 재료(결·기분·화제·말 모양·꽂힐 곳)는 성격 파일 옆 reactions.md 에 따로 둘 수 있다
        companion.reactions = Companion.read_persona(persona_path.with_name("reactions.md")) or ""
    companion.lore_dirs = [*char_dirs, settings.root / "knowledge", data / "knowledge"]
    companion.reload_lore()
    folder = settings.path("character.folder")
    if not folder or not (folder / "manifest.json").is_file():
        log.warning("캐릭터 폴더가 없어 임시 캐릭터를 씁니다: %s", folder)
        folder = make_placeholder(data / "placeholder")
    sprites = SpriteSet(folder, scale=float(settings.get("character.scale", 1.0)))
    return AssistantApp(settings, companion, ledger, sprites, tray=tray)


def wait_for_exit(pid: int, seconds: float = 15.0) -> None:
    """다시 시작할 때 이전 프로그램이 완전히 꺼지길 기다린다 (단축키 등록이 겹치지 않게)."""
    if sys.platform == "win32":
        import ctypes

        handle = ctypes.windll.kernel32.OpenProcess(0x00100000, False, pid)  # SYNCHRONIZE
        if handle:
            ctypes.windll.kernel32.WaitForSingleObject(handle, int(seconds * 1000))
            ctypes.windll.kernel32.CloseHandle(handle)
        return
    import time

    end = time.monotonic() + seconds
    while time.monotonic() < end:
        try:
            os.kill(pid, 0)
        except OSError:
            return
        time.sleep(0.2)


# ---------------------------------------------------------------- 한 마리만

def instance_name(root: Path) -> str:
    import hashlib

    return "danika-" + hashlib.sha1(str(root).lower().encode("utf-8")).hexdigest()[:12]


def _pid_alive(pid: int) -> bool:
    if sys.platform == "win32":
        import ctypes

        handle = ctypes.windll.kernel32.OpenProcess(0x00100000, False, pid)  # SYNCHRONIZE
        if not handle:
            return False
        try:
            return ctypes.windll.kernel32.WaitForSingleObject(handle, 0) == 0x102  # WAIT_TIMEOUT = 아직 살아 있음
        finally:
            ctypes.windll.kernel32.CloseHandle(handle)
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def _kill(pid: int) -> None:
    if sys.platform == "win32":
        import ctypes

        handle = ctypes.windll.kernel32.OpenProcess(0x0001, False, pid)  # PROCESS_TERMINATE
        if handle:
            ctypes.windll.kernel32.TerminateProcess(handle, 1)
            ctypes.windll.kernel32.CloseHandle(handle)
        return
    import signal

    try:
        os.kill(pid, signal.SIGTERM)
    except OSError:
        pass


def take_over_instance(name: str, pid_file: Path, wait: float = 8.0) -> bool:
    """이미 켜져 있는 다니카가 있으면 꺼 달라고 하고, 안 꺼지면(멈춰 있으면) 강제로 끈다. 있었으면 True.
    run 을 다시 누르면 '다시 켜기'가 되고, 두 마리가 동시에 뜨지 않는다."""
    from PySide6.QtNetwork import QLocalSocket

    sock = QLocalSocket()
    sock.connectToServer(name)
    if not sock.waitForConnected(700):
        return False  # 켜져 있는 다니카 없음
    try:
        old = int(pid_file.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        old = 0
    sock.write(b"quit\n")
    sock.flush()
    sock.waitForBytesWritten(1000)
    sock.disconnectFromServer()
    log.info("이미 켜져 있던 다니카(pid %s)를 끄고 새로 켬", old or "?")
    if old and old != os.getpid():
        wait_for_exit(old, wait)
        if _pid_alive(old):  # 응답 없음 상태 → 강제로
            log.warning("이전 다니카가 %.0f초 안에 안 꺼져서 강제로 끔 (pid %s)", wait, old)
            _kill(old)
            wait_for_exit(old, 3.0)
    return True


def serve_instance(name: str, pid_file: Path, on_quit: Callable[[], None]):
    """나중에 켜지는 다니카가 '꺼 줘'라고 하면 끈다."""
    from PySide6.QtNetwork import QLocalServer

    QLocalServer.removeServer(name)  # 비정상 종료로 남은 것 정리
    server = QLocalServer()
    if not server.listen(name):
        log.warning("한 마리만 켜기 장치를 못 켬: %s", server.errorString())

    def on_connection() -> None:
        while server.hasPendingConnections():
            conn = server.nextPendingConnection()

            def read(c=conn) -> None:
                if b"quit" in bytes(c.readAll().data()):
                    log.info("새로 켜진 다니카가 있어서 이쪽은 끔")
                    on_quit()

            conn.readyRead.connect(read)
            if conn.bytesAvailable():
                read()

    server.newConnection.connect(on_connection)
    try:
        pid_file.parent.mkdir(parents=True, exist_ok=True)
        pid_file.write_text(str(os.getpid()), encoding="utf-8")
    except OSError:
        pass
    return server


def main() -> int:
    if "--after" in sys.argv:
        i = sys.argv.index("--after")
        if i + 1 < len(sys.argv) and sys.argv[i + 1].isdigit():
            wait_for_exit(int(sys.argv[i + 1]))
    root = Path(__file__).resolve().parent
    logs = root / "data" / "logs"
    setup_logging(logs)  # 설정 파일이 깨져도 이유가 기록에 남게 맨 먼저
    install_crash_logging(logs)
    try:
        version = json.loads((root / "data" / "update_state.json").read_text(encoding="utf-8")).get("commit", "")[:8]
    except (OSError, json.JSONDecodeError):
        version = "?"
    log.info("다니카 시작 · 버전 %s", version or "?")
    state_path = root / "data" / "update_state.json"
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    name, pid_file = instance_name(root), root / "data" / "instance.pid"
    try:
        take_over_instance(name, pid_file)
    except Exception:  # noqa: BLE001 - 이것 때문에 못 켜지면 안 됨
        log.exception("이전 다니카 확인 실패")
    if count_start(state_path) > 3 and rollback(root, state_path):  # 업데이트 뒤로 계속 꺼지기만 함
        relaunch(root)
        return 1
    try:
        settings = Settings.load(root)
        state_path = settings.data_dir / "update_state.json"
        assistant = build(settings)
        assistant.start()
    except Exception as exc:  # noqa: BLE001 - 창이 없으니 그냥 꺼지면 이유를 알 수 없음 → 알려준다
        log.exception("다니카를 켜지 못함")
        if rollback(root, state_path):
            QMessageBox.information(None, "다니카", "방금 업데이트한 버전이 켜지지 않아서 이전 버전으로 되돌렸어요.\n"
                                    "확인을 누르면 다시 켤게요.")
            relaunch(root)
            return 1
        QMessageBox.critical(None, "다니카", f"다니카를 켜지 못했어요.\n\n{exc}\n\n자세한 기록: {logs / 'app.log'}")
        return 1
    QTimer.singleShot(10_000, lambda: confirm_started(state_path))  # 잘 켜졌으면 업데이트 백업 정리
    hang_watch = HangWatch(logs)  # noqa: F841 - 프로그램이 도는 동안 살아 있어야 함
    server = serve_instance(name, pid_file, assistant.quit)  # noqa: F841 - 프로그램이 도는 동안 살아 있어야 함
    code = app.exec()
    # 뒤에서 기다리던 일(느린 응답 등)이 남아 있어도 프로세스가 남지 않게 바로 끝낸다 (보이지 않는 다니카가 남는 것 방지)
    log.info("다니카 종료")
    logging.shutdown()
    os._exit(code)


if __name__ == "__main__":
    sys.exit(main())
