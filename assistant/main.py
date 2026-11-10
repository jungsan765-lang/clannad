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
import time
from pathlib import Path
from typing import Callable

from PySide6.QtCore import QObject, QPoint, QRunnable, Qt, QThreadPool, QTimer, Signal
from PySide6.QtGui import QAction, QActionGroup, QIcon, QPixmap
from PySide6.QtWidgets import QApplication, QFileDialog, QMenu, QMessageBox, QSystemTrayIcon

import organizer as org
from ai_client import AIClient, AIError
from companion import Companion
from hotkeys import GlobalHotkeys
from memory import Memory
from settings import Settings
from ui.bubble import SpeechBubble
from ui.character import CharacterWindow, SpriteSet
from ui.chat_input import ChatInput
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
from wishlist import Wishlist
from watch.watcher import ScreenWatcher, WatchConfig

log = logging.getLogger("assistant")


class _Signals(QObject):
    done = Signal(object)
    failed = Signal(str)
    progress = Signal(object)  # 하는 중간중간 소식 (받는 중인 대사, 옮긴 파일 수 등)


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
        self.ledger = ledger
        self.pool = pool or QThreadPool.globalInstance()
        self.busy = False
        self.jobs: set[Job] = set()
        self.state_path = settings.data_dir / "state.json"

        self.window = CharacterWindow(sprites, max_fps=float(settings.get("character.max_fps", 30)))
        self.bubble = SpeechBubble(int(settings.get("ui.bubble_max_width", 320)),
                                   float(settings.get("ui.bubble_min_seconds", 4.0)),
                                   float(settings.get("ui.bubble_seconds_per_char", 0.12)))
        self.input = ChatInput()
        self.status = StatusPill(self.anchor)  # 캐릭터 아래 '지금 하는 일' 표시
        self.status.set_enabled(bool(self.pref("ui.show_status", True)))
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
            max_skip_minutes=float(g("screen.max_skip_minutes", 3)),
            change_threshold=float(g("screen.change_threshold", 0.015)),
            max_width=int(g("screen.max_width", 1920)), jpeg_quality=int(g("screen.jpeg_quality", 85)))
        modes = self._load_modes()
        self.watcher = ScreenWatcher(companion, self.watch_cfg, self._run, modes=modes, can_run=self._screen_allowed)
        self.watcher.mode_changed.connect(lambda _: self._refresh_cost())
        self.watcher.spoke.connect(self._on_screen_line)
        self.watcher.status.connect(self._on_watch_status)
        self.watcher.activity.connect(self._on_watch_activity)
        self.watcher.new_game.connect(lambda p, t, seen: self.make_game_mode(p, t, seen, auto=True))
        self.watcher.known_games |= {p for m in modes for p in m.processes}
        self.watcher.known_games |= set(self._load_state().get("auto_mode_tried", []))
        self.wishlist = Wishlist(settings.data_dir / "requests.json")
        self._screen_searches: list[float] = []
        self.watcher.nothing.connect(lambda: self.bubble.hide() if self.bubble.text == "……" else None)
        self._last_watch_error = ""

        # 목소리로 말 걸기 (항상 듣기 / 단축키로 듣기 / 듣지 않기)
        stt = Transcriber(g("voice.model", "small"), g("voice.device", "cpu"),
                          download_root=str(settings.data_dir / "whisper"))
        self.voice = VoiceListener(stt, wake_word=str(g("voice.wake_word", "") or ""),
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
        self.topmost = TopmostKeeper([self.window, self.bubble, self.status, self.input],
                                     int(settings.get("character.topmost_interval_ms", 1500)), self)

        self.window.clicked.connect(self.open_input)
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
        self._register_hotkeys()
        if settings_flag(self.settings, "update.auto", True):
            QTimer.singleShot(3000, lambda: self.check_update(startup=True))
            self.update_timer.start(round(float(self.settings.get("update.check_hours", 6)) * 3600 * 1000))
        if self.companion.memory.pending:  # 지난번에 정리 못 한 대화가 있으면 지금 정리
            self._consolidate()

    def quit(self) -> None:
        self.update_timer.stop()
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
        context = self.watcher.chat_context()  # 게임 중이면 이번 판 기록을 함께 넘긴다
        self._run(lambda t, progress: self.companion.reply(t, context=context, on_partial=progress),
                  self._on_reply, self._on_error, text, on_progress=self._on_partial)

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
        self.bubble.show_text(reply.message, self.anchor())
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
        elif reply.action == "make_game_mode":
            self.make_game_mode_now()
        elif reply.action == "pin_fact" and reply.target.strip():
            if self.companion.memory.add_pinned(reply.target):
                self.status.flash("꼭 기억할 것에 적었어요")
        elif reply.action == "note_request" and reply.target.strip():
            if self.wishlist.add(reply.target):
                self.status.flash("개선 요청 메모에 적었어요")

    def search_and_answer(self, query: str, about_screen: bool = False) -> None:
        """다니카가 '찾아보겠습니다' 라고 한 뒤(또는 화면에서 모르는 이름을 봤을 때): 검색 → 찾은 내용으로 말하기."""
        self.busy = True
        self.voice.paused = True
        self._streamed = False
        self.status.begin("chat", f"'{query[:20]}' 찾아보는 중")
        question = "" if about_screen else self._last_question

        def work(progress):
            notes, _ = self.companion.search(query, question)
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

    def _screen_allowed(self) -> bool:
        if self.busy or self.bubble.isVisible():  # 대화 중이거나 말풍선이 떠 있으면 다음 기회에
            return False
        if settings_flag(self.settings, "screen.stop_when_over_budget", True):
            budget = self.budget_usd()
            if budget and self.ledger.month_usd() >= budget:
                return False
        return True

    def set_screen_enabled(self, on: bool, save: bool = True) -> None:
        self.watcher.set_enabled(on)
        if hasattr(self, "screen_action"):
            self.screen_action.setChecked(on)
        if save:
            self.set_pref("screen.enabled", on)

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
        else:
            self.status.end("screen")

    def _on_screen_line(self, reply) -> None:
        if self.busy:
            return
        if reply.action == "web_search":  # 화면에 모르는 이름 → 조용히 찾아보고 말하기 (한 시간에 6번까지)
            now = time.monotonic()
            self._screen_searches = [t for t in self._screen_searches if now - t < 3600]
            if len(self._screen_searches) < int(self.settings.get("screen.searches_per_hour", 6)):
                self._screen_searches.append(now)
                self.search_and_answer(reply.target, about_screen=True)
            return
        self.bubble.show_text(reply.message, self.anchor())
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

    def restart(self) -> None:
        """새 프로그램을 띄우고 지금 것은 끈다 (새 쪽은 지금 것이 완전히 꺼질 때까지 기다렸다 시작)."""
        relaunch(self.settings.root)
        self.quit()

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
            "screen.max_width": int(self.watch_cfg.max_width),
            "voice.mode": self.voice.mode,
            "voice.mic": self.voice.device,
            "voice.wake_word": self.voice.wake_word,
            "voice.model": str(g("voice.model", "medium")),
            "budget.monthly_usd": self.budget_usd(),
            "ai.fast": bool(self.companion.fast),
            "ai.web_search": bool(self.companion.can_search),
            "user.nickname": ", ".join(self.companion.user_names),
            "ui.show_status": self.status.enabled,
        }

    def open_settings_dialog(self) -> None:
        try:
            from watch.capture import list_monitors

            monitors = [str(m.index) for m in list_monitors()]
        except Exception:  # noqa: BLE001
            monitors = []
        dlg = SettingsDialog(self.settings_values(), monitors, list_input_devices(), voice_level=lambda: self.voice.level,
                             meter=(self.voice.start_meter, self.voice.stop_meter))
        if dlg.exec() == SettingsDialog.DialogCode.Accepted:
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
        if "user.nickname" in changed:
            self.companion.user_names = split_names(changed["user.nickname"])
        if "ui.show_status" in changed:
            self.status.set_enabled(bool(changed["ui.show_status"]))
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
        menu = QMenu()
        talk = QAction("말 걸기", menu)
        talk.triggered.connect(self.open_input)
        menu.addAction(talk)
        menu.addSeparator()
        self.cost_action = QAction("", menu)
        self.cost_action.setEnabled(False)
        menu.addAction(self.cost_action)
        menu.addSeparator()
        g = self.settings.get
        self.mode_action = QAction("", menu)
        self.mode_action.setEnabled(False)
        menu.addAction(self.mode_action)
        self.watch_status_action = QAction("", menu)
        self.watch_status_action.setEnabled(False)
        menu.addAction(self.watch_status_action)
        self.screen_action = QAction(f"화면 보기 (평소 {int(self.watch_cfg.interval_seconds)}초마다, {g('hotkeys.toggle_screen', 'F9')})", menu)
        self.screen_action.setCheckable(True)
        self.screen_action.triggered.connect(lambda on: self.set_screen_enabled(on))
        menu.addAction(self.screen_action)
        now = QAction(f"지금 화면 보고 말하기 ({g('hotkeys.ask_screen', 'F8')})", menu)
        now.triggered.connect(self.ask_screen_now)
        menu.addAction(now)
        vmenu = menu.addMenu("목소리로 말 걸기")
        group = QActionGroup(vmenu)
        self.voice_actions = {}
        for mode, label in (("always", "항상 듣기"), ("push", f"단축키로 듣기 ({g('hotkeys.voice', 'F7')})"), ("off", "듣지 않기")):
            act = QAction(label, vmenu)
            act.setCheckable(True)
            act.triggered.connect(lambda _=False, m=mode: self.set_voice_mode(m))
            group.addAction(act)
            vmenu.addAction(act)
            self.voice_actions[mode] = act
        listen = QAction(f"지금 듣기 ({g('hotkeys.voice', 'F7')})", vmenu)
        listen.triggered.connect(self.push_to_talk)
        vmenu.addSeparator()
        vmenu.addAction(listen)
        omenu = menu.addMenu("파일 정리")
        for label in org.KNOWN:
            act = QAction(f"{label} 정리하기…", omenu)
            act.triggered.connect(lambda _=False, lb=label: self.organize(org.known_folder(lb), lb))
            omenu.addAction(act)
        pick = QAction("다른 폴더 고르기…", omenu)
        pick.triggered.connect(self.organize_pick)
        omenu.addAction(pick)
        omenu.addSeparator()
        undo = QAction("마지막 정리 되돌리기", omenu)
        undo.triggered.connect(self.undo_organize)
        omenu.addAction(undo)
        make_mode = QAction("지금 하는 게임 모드 만들기", menu)
        make_mode.triggered.connect(self.make_game_mode_now)
        menu.addAction(make_mode)
        wishes = QAction("개선 요청 메모…", menu)
        wishes.triggered.connect(self.open_wishlist)
        menu.addAction(wishes)
        menu.addSeparator()
        show_mem = QAction("기억 보기", menu)
        show_mem.triggered.connect(self.show_memory)
        menu.addAction(show_mem)
        consolidate = QAction("기억 지금 정리하기", menu)
        consolidate.triggered.connect(self.consolidate_now)
        menu.addAction(consolidate)
        forget = QAction("최근 대화 잊기 (장기기억은 유지)", menu)
        forget.triggered.connect(self.companion.memory.clear_recent)
        menu.addAction(forget)
        tmenu = menu.addMenu("말할 때 움직임")
        tgroup = QActionGroup(tmenu)
        self.talk_actions = {}
        for style, label in TALK_STYLES:
            act = QAction(label, tmenu)
            act.setCheckable(True)
            act.triggered.connect(lambda _=False, st=style: self.set_talk_style(st))
            tgroup.addAction(act)
            tmenu.addAction(act)
            self.talk_actions[style] = act
        self._sync_talk_actions()
        menu.addSeparator()
        settings_dialog = QAction("설정…", menu)
        settings_dialog.triggered.connect(self.open_settings_dialog)
        menu.addAction(settings_dialog)
        settings_file = QAction("설정 파일 열기 (고급)", menu)
        settings_file.triggered.connect(self.open_settings)
        menu.addAction(settings_file)
        update = QAction("업데이트 확인", menu)
        update.triggered.connect(lambda: self.check_update(manual=True))
        menu.addAction(update)
        restart = QAction("다시 시작 (설정·업데이트 적용)", menu)
        restart.triggered.connect(self.restart)
        menu.addAction(restart)
        menu.addSeparator()
        quit_ = QAction("종료", menu)
        quit_.triggered.connect(self.quit)
        menu.addAction(quit_)
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
        return (f"오늘 사용 {self.ledger.krw(day):,}원 · 이번 달 {self.ledger.krw(month):,}원 "
                f"(${month:,.2f} / ${self.budget_usd():,.0f})")

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
             f"이번 달 예산을 넘었어요 (${used:,.2f} / ${budget:,.0f}). 화면 보기는 멈추고 대화만 할게요."),
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
        mem = self.companion.memory
        text = mem.notes_text() + (f"\n\n(정리 대기 중인 대화 {len(mem.pending)}개)" if mem.pending else "")
        pinned = self.companion.pinned_text()
        if pinned:
            text = "[꼭 기억할 것]\n" + pinned + "\n\n" + text
        if mem.knowledge:
            text += "\n\n[찾아보고 알게 된 것] " + ", ".join(k["query"] for k in mem.knowledge[-30:])
        QMessageBox.information(None, "장기기억", text)

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
            if on_done:
                on_done(ok)

        def fail(message: str) -> None:
            self.status.end("memory")
            log.warning(message)
            if on_fail:
                on_fail(message)

        self._run(self.companion.consolidate, done, fail)

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


def build(settings: Settings, ai: AIClient | None = None, tray: bool = True) -> AssistantApp:
    apply_saved_prefs(settings)
    data = settings.data_dir
    ledger = UsageLedger(data / "usage.json", float(settings.get("budget.krw_per_usd", 1400)))
    ai = ai or AIClient(ledger, float(settings.get("ai.timeout_seconds", 60)))
    ai.ledger = ledger
    memory = Memory(data)
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
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
