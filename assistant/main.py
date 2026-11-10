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
from pathlib import Path
from typing import Callable

from PySide6.QtCore import QObject, QPoint, QRunnable, QThreadPool, QTimer, Signal
from PySide6.QtGui import QAction, QActionGroup, QIcon, QPixmap
from PySide6.QtWidgets import QApplication, QMenu, QMessageBox, QSystemTrayIcon

from ai_client import AIClient, AIError
from companion import Companion
from hotkeys import GlobalHotkeys
from memory import Memory
from settings import Settings
from ui.bubble import SpeechBubble
from ui.character import CharacterWindow, SpriteSet
from ui.chat_input import ChatInput
from ui.placeholder import make_placeholder
from ui.topmost import TopmostKeeper
from updater import Updater
from usage import UsageLedger
from ui.settings_dialog import RESTART_KEYS, TALK_STYLES, SettingsDialog
from voice.listener import VoiceListener, list_input_devices
from voice.stt import Transcriber
from watch.modes import load_modes
from watch.watcher import ScreenWatcher, WatchConfig

log = logging.getLogger("assistant")


class _Signals(QObject):
    done = Signal(object)
    failed = Signal(str)


class Job(QRunnable):
    """오래 걸리는 일(API 호출)을 화면이 멈추지 않게 뒤에서 돌린다."""

    def __init__(self, fn: Callable, *args):
        super().__init__()
        self.fn, self.args = fn, args
        self.signals = _Signals()

    def run(self) -> None:
        try:
            result = self.fn(*self.args)
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

        # 화면 보기 (정해진 간격마다 모니터 하나를 보고 말 걸기)
        g = settings.get
        self.watch_cfg = WatchConfig(
            interval_seconds=float(g("screen.interval_seconds", 30)), monitor=str(g("screen.monitor", "left")),
            judge_model=g("screen.judge_model", "claude-haiku-5-5"), line_model=g("screen.line_model", "claude-opus-5-5"),
            cooldown_seconds=float(g("screen.cooldown_seconds", 90)),
            chattiness=str(g("screen.chattiness", "normal")),
            max_skip_minutes=float(g("screen.max_skip_minutes", 3)),
            change_threshold=float(g("screen.change_threshold", 0.015)),
            max_width=int(g("screen.max_width", 1024)), jpeg_quality=int(g("screen.jpeg_quality", 70)))
        modes = load_modes(settings.root / "modes")
        self.watcher = ScreenWatcher(companion, self.watch_cfg, self._run, modes=modes, can_run=self._screen_allowed)
        self.watcher.mode_changed.connect(lambda _: self._refresh_cost())
        self.watcher.spoke.connect(self._on_screen_line)
        self.watcher.status.connect(self._on_watch_status)
        self.watcher.nothing.connect(lambda: self.bubble.hide() if self.bubble.text == "……" else None)
        self._last_watch_error = ""

        # 목소리로 말 걸기 (항상 듣기 / 단축키로 듣기 / 듣지 않기)
        stt = Transcriber(g("voice.model", "small"), g("voice.device", "cpu"),
                          download_root=str(settings.data_dir / "whisper"))
        self.voice = VoiceListener(stt, wake_word=str(g("voice.wake_word", "") or ""),
                                   device=str(g("voice.device", "") or ""))
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
        # 캐릭터 → 말풍선 → 입력창 순서로 (뒤에 올린 것이 더 앞)
        self.topmost = TopmostKeeper([self.window, self.bubble, self.input],
                                     int(settings.get("character.topmost_interval_ms", 1500)), self)

        self.window.clicked.connect(self.open_input)
        self.window.menu_requested.connect(lambda pos: self.menu.exec(pos))
        self.window.moved.connect(self._save_position)
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
            self._run(self.companion.consolidate, lambda _: log.info("시작 시 기억 정리 완료"), lambda m: log.warning(m))

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
        self.bubble.show_text("……", self.anchor(), seconds=0)
        context = self.watcher.chat_context()  # 게임 중이면 이번 판 기록을 함께 넘긴다
        self._run(lambda t: self.companion.reply(t, context=context), self._on_reply, self._on_error, text)

    def _on_reply(self, reply) -> None:
        self.busy = False
        self.voice.paused = False
        self.bubble.show_text(reply.message, self.anchor())
        self.window.set_emotion(reply.emotion)
        self._start_talking()
        self._refresh_cost()
        self._budget_warning()
        if self.companion.should_consolidate():
            self._run(self.companion.consolidate, lambda _: log.info("기억 정리 완료"), lambda m: log.warning(m))

    def _on_error(self, message: str) -> None:
        self.busy = False
        self.voice.paused = False
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
        self.bubble.show_text("……", self.anchor(), seconds=0)
        self.watcher.ask_now()

    def _on_screen_line(self, reply) -> None:
        if self.busy:
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

    VOICE_BUBBLES = {
        "listening": ("(듣고 있어요…)", 0),
        "loading": ("(음성 인식 준비 중… 처음엔 모델을 내려받느라 몇 분 걸려요)", 0),
        "ready": ("(이제 말을 알아들을 수 있어요)", 3),
        "heard": ("(알아듣는 중…)", 0),
        "unclear": ("(잘 못 알아들었어요)", 2),
    }

    def _on_voice_state(self, state: str) -> None:
        if self.busy and state in ("heard", "unclear"):
            return  # 대답을 기다리는 중엔 "……" 말풍선을 그대로 둔다
        if state in self.VOICE_BUBBLES:
            text, seconds = self.VOICE_BUBBLES[state]
            self.bubble.show_text(text, self.anchor(), system=True, seconds=seconds)
        elif self.bubble.text in {t for t, _ in self.VOICE_BUBBLES.values()}:
            self.bubble.hide()

    def _on_heard(self, text: str) -> None:
        log.info("들은 말: %s", text)
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
        def done(result) -> None:
            if not result.changed:
                if manual:
                    self.bubble.show_text("최신 버전이에요.", self.anchor(), system=True, seconds=3)
                return
            note = " (직접 고친 설정은 그대로 뒀어요)" if result.kept else ""
            if result.requirements_changed:
                self.bubble.show_text("업데이트에 필요한 것을 설치하는 중이에요…", self.anchor(), system=True, seconds=0)
                self._run(self._pip_install, lambda _: self._after_update(startup, note), self._on_update_fail)
            else:
                self._after_update(startup, note)

        self._run(self.updater.run, done, self._on_update_fail if manual else lambda m: log.warning("업데이트 확인 실패: %s", m))

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
        main_py = self.settings.root / "main.py"
        subprocess.Popen([sys.executable, str(main_py), "--after", str(os.getpid())], cwd=str(self.settings.root),
                         creationflags=getattr(subprocess, "DETACHED_PROCESS", 0))
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
            "voice.mode": self.voice.mode,
            "voice.device": self.voice.device,
            "voice.wake_word": self.voice.wake_word,
            "voice.model": str(g("voice.model", "medium")),
            "budget.monthly_usd": self.budget_usd(),
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
                          ("screen.cooldown_seconds", "cooldown_seconds"), ("screen.monitor", "monitor")):
            if key in changed:
                setattr(cfg, attr, changed[key])
        self.watcher.apply_config()
        if "screen.enabled" in changed:
            self.set_screen_enabled(bool(changed["screen.enabled"]), save=False)
        if "voice.device" in changed:
            self.voice.set_device(str(changed["voice.device"]))
        if "voice.wake_word" in changed:
            self.voice.wake_word = str(changed["voice.wake_word"])
        if "voice.mode" in changed:
            self.set_voice_mode(str(changed["voice.mode"]), save=False)
        if "character.talk_motion" in changed:
            self._sync_talk_actions()
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

    def _run(self, fn: Callable, on_done: Callable, on_fail: Callable, *args) -> None:
        job = Job(fn, *args)
        job.setAutoDelete(False)
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
        QMessageBox.information(None, "장기기억", text)

    def consolidate_now(self) -> None:
        self._run(self.companion.consolidate,
                  lambda ok: self.bubble.show_text("기억을 정리했어요." if ok else "정리할 새 대화가 없어요.",
                                                   self.anchor(), system=True, seconds=4),
                  lambda m: self.bubble.show_text(m, self.anchor(), system=True, seconds=8))

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


def settings_flag(settings: Settings, key: str, default: bool) -> bool:
    value = settings.get(key, default)
    return value if isinstance(value, bool) else str(value).lower() in ("1", "true", "yes", "on")


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
        settings.set(key, value)


def build(settings: Settings, ai: AIClient | None = None, tray: bool = True) -> AssistantApp:
    apply_saved_prefs(settings)
    data = settings.data_dir
    ledger = UsageLedger(data / "usage.json", float(settings.get("budget.krw_per_usd", 1400)))
    ai = ai or AIClient(ledger, float(settings.get("ai.timeout_seconds", 60)))
    ai.ledger = ledger
    memory = Memory(data)
    persona = Companion.read_persona(settings.path("character.persona"))
    if persona is None:
        log.warning("성격 파일이 없어 기본 말투를 씁니다: %s", settings.get("character.persona"))
    companion = Companion(
        ai, memory, persona,
        chat_model=settings.get("ai.chat_model", "claude-opus-5-5"),
        memory_model=settings.get("ai.memory_model", "claude-opus-5-5"),
        effort=settings.get("ai.effort", "low"),
        max_tokens=int(settings.get("ai.max_tokens", 2000)),
        history_turns=int(settings.get("ai.history_turns", 10)),
        consolidate_every=int(settings.get("memory.consolidate_every", 20)),
        memory_max_chars=int(settings.get("memory.max_chars", 4000)),
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
    settings = Settings.load()
    setup_logging(settings.data_dir / "logs")
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    assistant = build(settings)
    assistant.start()
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
