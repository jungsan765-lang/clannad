"""설정 창 (전부 한국어, 끌어서 조절하는 막대·체크·동그라미 버튼).

바꾼 값은 data/state.json 에 저장되어 config.toml 보다 우선한다. 설정 파일을 직접 열 필요 없음.
"""

from __future__ import annotations

from typing import Callable

from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QGuiApplication
from PySide6.QtWidgets import (QButtonGroup, QCheckBox, QComboBox, QDialog, QDialogButtonBox, QGridLayout,
                               QGroupBox, QHBoxLayout, QLabel, QLineEdit, QProgressBar, QPushButton, QRadioButton,
                               QScrollArea, QSlider, QTabWidget, QVBoxLayout, QWidget)

TALK_STYLES = [("bounce", "살짝 움직임"), ("still", "멈춤"), ("breathe", "숨쉬기 계속")]
CHATTY = [("quiet", "조용히"), ("normal", "보통"), ("chatty", "자주")]
VOICE_MODES = [("off", "듣지 않기"), ("push", "단축키 누를 때만"), ("always", "항상 듣기")]
MODELS = [("small", "빠름"), ("medium", "보통 (추천)"), ("large-v3-turbo", "정확함 (느림)")]
BUBBLE_TIMES = [("short", "짧게"), ("normal", "보통"), ("long", "길게")]
MEMORY_DAYS = [("30", "30일"), ("90", "90일"), ("180", "180일"), ("365", "1년")]
MEMORY_GB = [("20", "20GB"), ("50", "50GB"), ("100", "100GB"), ("300", "300GB")]
# (값, 짧은 이름, 고르면 아래에 보이는 설명)
COACH = [("off", "끔", "평소처럼 말동무만 해요. F10 을 누르면 언제든 자세히 분석해요."),
         ("analysis", "분석", "결과·파티 화면처럼 중요한 순간에 자세히 봐요. 한 번에 50~150원."),
         ("review", "복기", "싸움이 끝날 때마다 '이랬으면 좋았을 것'을 짚어요. 게임 1시간에 2,000~4,000원쯤.")]
SPEAK_RATES = [("slow", "느리게"), ("normal", "보통"), ("fast", "빠르게")]
CLIP_TOOLS = [("gamebar", "Xbox Game Bar", "Windows 설정 > 게임 > 캡처 > '발생한 내용 녹화'를 켜 두어야 영상이 남아요."),
              ("nvidia", "NVIDIA", "NVIDIA 앱에서 즉석 리플레이를 켜 두어야 영상이 남아요."),
              ("off", "화면 몇 장만", "영상 없이 그 순간 화면 몇 장만 data/highlights 에 남겨요.")]
DAILY_LIMITS = [("1000", "1,000원"), ("3000", "3,000원"), ("5000", "5,000원"), ("10000", "10,000원"), ("0", "제한 없음")]
DENSE = [("game", "게임할 때만", "0.5초마다 찍어 두고 5초마다 그 흐름을 모아 판단해요. 판단만 시간당 400~600원."),
         ("always", "항상", "게임이 아닐 때도 촘촘히 봐요. 비용이 늘어요."),
         ("off", "끔", "확인 간격마다 한 장씩만 봐요. 가장 싸지만 흐름을 놓쳐요.")]
LINE_QUALITY = [("brain_lite", "나눠 보기 · 절약 (추천)",
                 "담당들이 먼저 보고 평소엔 Sonnet 이, 물어볼 때·중요한 걸 찾았을 때만 Opus 가 화면과 맞춰 본 뒤 말해요. "
                 "한마디 30~45원 (Opus 일 땐 60~80원), 10초쯤 늦어요."),
                ("brain", "나눠 보기 · Opus",
                 "담당들이 먼저 보고 늘 Opus 가 화면과 맞춰 본 뒤 말해요. 한마디 60~80원, 10초쯤 늦어요."),
                ("auto", "가볍게", "가장 싼 모델이 바로 한마디 해요. 한마디 몇 원. 잘못 볼 때가 있어요."),
                ("sonnet", "보통", "중간 모델이 혼자 보고 말해요. 한마디 수십 원."),
                ("best", "최고", "Opus 가 혼자 보고 말해요. 나눠 보기보다 빠르지만 덜 꼼꼼해요.")]
RESULT_DEPTH = [("deep", "깊게", "1~2분 생각하고 총평해요. 판마다 200~400원."), ("quick", "빠르게", "바로 짧게 총평해요.")]
OVERLAY = [("important", "중요한 것만"), ("game", "게임 중 모두"), ("always", "항상"), ("off", "끔")]
OVERLAY_POS = [("top", "위 가운데"), ("bottom", "아래 가운데")]
SHARPNESS = [(1280, "보통"), (1920, "선명 (추천)"), (2560, "아주 선명 (비용 2배쯤)")]

# 다시 시작해야 적용되는 설정
RESTART_KEYS = {"character.scale", "voice.model"}


def _hint(text: str = "") -> QLabel:
    label = QLabel(text)
    label.setWordWrap(True)
    label.setStyleSheet("color: #666; font-size: 11px;")
    return label


class Choice(QWidget):
    """동그라미 버튼 묶음 (하나만 고름). 항목에 설명이 있으면 고른 것의 설명만 아래에 짧게 보여 준다."""

    def __init__(self, items: list[tuple], current: str):
        super().__init__()
        self.group = QButtonGroup(self)
        self.values = []
        self.hints: list[str] = []
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(2)
        row = QHBoxLayout()
        row.setContentsMargins(0, 0, 0, 0)
        outer.addLayout(row)
        for i, item in enumerate(items):
            value, label = item[0], item[1]
            hint = item[2] if len(item) > 2 else ""
            b = QRadioButton(label)
            if hint:
                b.setToolTip(hint)
            self.group.addButton(b, i)
            self.values.append(value)
            self.hints.append(hint)
            row.addWidget(b)
            if value == current:
                b.setChecked(True)
        if self.group.checkedId() < 0 and self.group.buttons():
            self.group.buttons()[0].setChecked(True)
        row.addStretch(1)
        self.hint = _hint()
        self.hint.setVisible(any(self.hints))
        outer.addWidget(self.hint)
        self.group.idToggled.connect(lambda _i, on: on and self._show_hint())
        self._show_hint()

    def _show_hint(self) -> None:
        if any(self.hints):
            self.hint.setText(self.hints[max(0, self.group.checkedId())])

    def value(self) -> str:
        return self.values[max(0, self.group.checkedId())]


class Slider(QWidget):
    """끌어서 조절하는 막대 + 지금 값 글자."""

    def __init__(self, lo: int, hi: int, step: int, current: float, fmt: Callable[[int], str]):
        super().__init__()
        self.fmt = fmt
        self.slider = QSlider(Qt.Orientation.Horizontal)
        self.slider.setRange(lo, hi)
        self.slider.setSingleStep(step)
        self.slider.setPageStep(step * 5)
        self.slider.setValue(int(round(current)))
        self.label = QLabel()
        self.label.setMinimumWidth(110)
        self.slider.valueChanged.connect(self._show)
        lay = QHBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.addWidget(self.slider, 1)
        lay.addWidget(self.label)
        self._show(self.slider.value())

    def _show(self, v: int) -> None:
        self.label.setText(self.fmt(v))

    def value(self) -> int:
        return self.slider.value()


def _seconds(v: int) -> str:
    return f"{v}초" if v < 60 else (f"{v // 60}분" if v % 60 == 0 else f"{v // 60}분 {v % 60}초")


class SettingsDialog(QDialog):
    def __init__(self, values: dict, monitors: list[str], mics: list[str], voice_level: Callable[[], float] | None = None,
                 meter: tuple[Callable[[], bool], Callable[[], None]] | None = None,
                 hoyolab: tuple[Callable[[], str], Callable[[], str], Callable[[], str]] | None = None,
                 neople_set: bool = False, parent=None):
        super().__init__(parent)
        self.setWindowTitle("다니카 설정")
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        self.setMinimumWidth(520)
        self.initial = dict(values)
        self.voice_level = voice_level
        self.meter = meter
        v = values

        def group(title: str, rows: list[tuple[str, QWidget]]) -> QGroupBox:
            box = QGroupBox(title)
            grid = QGridLayout(box)
            for i, (label, widget) in enumerate(rows):
                if label:
                    grid.addWidget(QLabel(label), i, 0)
                    grid.addWidget(widget, i, 1)
                else:
                    grid.addWidget(widget, i, 0, 1, 2)
            grid.setColumnStretch(1, 1)
            return box

        def check(text: str, key: str, default: bool, tip: str = "") -> QCheckBox:
            box = QCheckBox(text)
            box.setChecked(bool(v.get(key, default)))
            if tip:
                box.setToolTip(tip)
            return box

        def page(*boxes: QWidget) -> QScrollArea:
            inner = QWidget()
            col = QVBoxLayout(inner)
            for b in boxes:
                col.addWidget(b)
            col.addStretch(1)
            area = QScrollArea()
            area.setWidgetResizable(True)
            area.setFrameShape(QScrollArea.Shape.NoFrame)
            area.setWidget(inner)
            return area

        # ---------------------------------------------------------------- 기본
        self.nick = QLineEdit(str(v.get("user.nickname", "")))
        self.nick.setPlaceholderText("예) 하늘고래, SkyWhale  (여러 개면 쉼표로)")
        self.scale = Slider(30, 200, 5, float(v["character.scale"]) * 100, lambda x: f"{x}%")
        self.talk = Choice(TALK_STYLES, str(v["character.talk_motion"]))
        self.bubble_time = Choice(BUBBLE_TIMES, str(v.get("ui.bubble_time", "normal")))
        self.web = check("모르는 건 인터넷에서 찾아보기", "ai.web_search", True, "한 번에 30~70원. 찾은 건 기억해 둬요.")
        self.fast = check("빠르게 대답 (요금 2배)", "ai.fast", False, "답이 2배쯤 빨리 오지만 요금도 2배예요.")
        self.show_status = check("하고 있는 일 표시", "ui.show_status", True, "캐릭터 아래 작은 글씨: 생각 중, 정리 중 …")
        basic = page(group("주인님 (이 컴퓨터에만 저장)", [("아이디·닉네임", self.nick)]),
                     group("캐릭터", [("크기 (다시 시작하면 적용)", self.scale), ("말할 때", self.talk),
                                      ("말풍선 보이는 시간", self.bubble_time)]),
                     group("대답", [("", self.web), ("", self.fast), ("", self.show_status)]))

        # ---------------------------------------------------------------- 화면 보기
        self.screen_on = QCheckBox("화면을 보고 먼저 말 걸기")
        self.screen_on.setChecked(bool(v["screen.enabled"]))
        self.chatty = Choice(CHATTY, str(v["screen.chattiness"]))
        self.line_quality = Choice(LINE_QUALITY, str(v.get("screen.line_quality", "brain_lite")))
        self.scan = check("둘러보기", "screen.scan", True,
                          "표시가 뜬 인물·이름표·빛나는 물건을 하나씩 확대해 알아보고, 보상이 좋은 것처럼 중요한 것만 알려요.")
        scan_hint = _hint("표시 뜬 인물·물건을 확대해 알아보고 중요한 것만 알려요. 하나에 1원도 안 들어요. 알아본 건 기억해 둬요.")
        self.dense = Choice(DENSE, str(v.get("screen.dense", "game")))
        self.coach = Choice(COACH, str(v.get("screen.coach", "off")))
        self.result_depth = Choice(RESULT_DEPTH, str(v.get("screen.result_depth", "deep")))
        mon_items = [("left", "왼쪽"), ("right", "오른쪽"), ("primary", "주 모니터")]
        if len(monitors) > 2:
            mon_items += [(m, f"{m}번") for m in monitors]
        self.monitor = Choice(mon_items, str(v["screen.monitor"]))
        width = int(v.get("screen.max_width", 1920))
        near = min(SHARPNESS, key=lambda s: abs(s[0] - width))[0]  # 예전 값(1024 등)은 가까운 칸으로
        self.sharp = Choice([(str(w), label) for w, label in SHARPNESS], str(near))
        self.interval = Slider(10, 300, 5, float(v["screen.interval_seconds"]), _seconds)
        self.cooldown = Slider(20, 1800, 10, float(v["screen.cooldown_seconds"]), _seconds)
        self.overlay = Choice(OVERLAY, str(v.get("screen.overlay", "important")))
        self.overlay_pos = Choice(OVERLAY_POS, str(v.get("screen.overlay_pos", "top")))
        screen = page(group("말 걸기", [("", self.screen_on), ("말 거는 정도", self.chatty),
                                        ("말하는 방식", self.line_quality), ("", self.scan), ("", scan_hint)]),
                      group("보는 방법", [("촘촘히 보기", self.dense), ("볼 모니터", self.monitor),
                                          ("선명도 (글자 읽기)", self.sharp), ("확인 간격", self.interval),
                                          ("말한 뒤 쉬는 시간", self.cooldown)]),
                      group("코칭", [("방식", self.coach), ("판 끝난 뒤 총평", self.result_depth)]),
                      group("게임 화면 위 자막", [("보일 때", self.overlay), ("위치", self.overlay_pos)]))

        # ---------------------------------------------------------------- 비용
        self.daily_limit = Choice(DAILY_LIMITS, str(v.get("screen.daily_krw", "3000")))
        self.limit_stop = check("한도를 넘으면 화면 보기 멈추기", "screen.limit_stop", False,
                                "끄면 알리기만 하고 계속 봐요.")
        self.budget = Slider(10, 500, 10, float(v["budget.monthly_usd"]), lambda x: f"한 달 {x}달러")
        cost = page(group("화면 보기 비용", [("하루 한도", self.daily_limit), ("", self.limit_stop),
                                             ("", _hint("한도를 넘으면 많이 쓴 곳 3개와 함께 알려 드려요. 우클릭 → 비용 내역에서 자세히."))]),
                    group("전체", [("월 예산", self.budget)]))

        # ---------------------------------------------------------------- 목소리
        self.voice_mode = Choice(VOICE_MODES, str(v["voice.mode"]))
        self.mic = QComboBox()
        self.mic.addItem("윈도우 기본 마이크", "")
        for name in mics:
            self.mic.addItem(name, name)
        i = self.mic.findData(str(v["voice.mic"]))
        self.mic.setCurrentIndex(i if i >= 0 else 0)
        self.level_bar = QProgressBar()
        self.level_bar.setRange(0, 60)
        self.level_bar.setTextVisible(False)
        self.meter_btn = QPushButton("마이크 확인")
        self.meter_btn.setCheckable(True)
        self.meter_btn.toggled.connect(self._toggle_meter)
        meter = QWidget()
        mr = QHBoxLayout(meter)
        mr.setContentsMargins(0, 0, 0, 0)
        mr.addWidget(self.level_bar, 1)
        mr.addWidget(self.meter_btn)
        self.wake_on = QCheckBox("이름을 불렀을 때만 반응")
        self.wake = QLineEdit(str(v["voice.wake_word"]) or "다니카")
        self.wake_on.setChecked(bool(v["voice.wake_word"]))
        self.wake.setEnabled(self.wake_on.isChecked())
        self.wake_on.toggled.connect(self.wake.setEnabled)
        wake = QWidget()
        wr = QHBoxLayout(wake)
        wr.setContentsMargins(0, 0, 0, 0)
        wr.addWidget(self.wake_on)
        wr.addWidget(self.wake, 1)
        self.model = Choice(MODELS, str(v["voice.model"]))
        self.speak = check("소리 내서 말하기", "voice.speak", False, "Windows 한국어 음성 (일반 목소리)")
        self.speak_rate = Choice(SPEAK_RATES, str(v.get("voice.speak_rate", "normal")))
        voice = page(group("목소리로 말 걸기", [("듣는 방식", self.voice_mode), ("마이크", self.mic), ("소리 크기", meter),
                                                ("부르는 이름", wake), ("알아듣는 수준 (다시 시작하면 적용)", self.model)]),
                     group("다니카 목소리", [("", self.speak), ("말 빠르기", self.speak_rate)]))

        # ---------------------------------------------------------------- 비서
        self.briefing = check("하루 브리핑", "assist.briefing", True,
                              "처음 켤 때나 3시간 넘게 자리 비웠다 돌아올 때: 오늘 알림·할 일, 원신 레진, 어제 한 것")
        self.resume = check("게임 다시 켜면 '지난번엔 어디까지' 한마디", "assist.resume", True)
        self.chores = check("게임 숙제 알림 (밤에 한 번)", "assist.chores", True, "원신 의뢰·주간 보스, 칸코레 일일·주간 임무")
        self.auto_dates = check("이벤트 끝·점검 알림 자동 등록", "assist.auto_dates", True, "매주 찾는 최신 소식에서")
        self.pc_monitor = check("PC 상태 감시", "pc.monitor", True, "그래픽카드 온도·메모리·저장 공간에 문제가 생기면 알려요.")
        self.pause_away = check("자리 비우면 화면 보기 쉬기", "assist.pause_when_away", True,
                                "20분 동안 키보드·마우스를 안 만지면 (게임 중엔 계속 봐요)")
        self.clip_tool = Choice(CLIP_TOOLS, str(v.get("pc.clip_tool", "gamebar")))
        self.auto_clip = check("게임 중 중요한 순간이면 알아서 저장 (3분에 한 번까지)", "pc.auto_clip", False)
        self.assist_rows = [("", self.briefing), ("", self.resume), ("", self.chores), ("", self.auto_dates),
                            ("", self.pc_monitor), ("", self.pause_away)]
        assist = page(group("알려 주기", self.assist_rows),
                      group("하이라이트 저장", [("녹화 프로그램", self.clip_tool), ("", self.auto_clip)]))

        # ---------------------------------------------------------------- 게임 연결
        self.uid = QLineEdit(str(v.get("genshin.uid", "")))
        self.uid.setPlaceholderText("원신 UID (게임 화면 오른쪽 아래 숫자 9~10자리)")
        self.uid.setMaxLength(10)
        self.hoyo_label = QLabel(hoyolab[0]() if hoyolab else "연결 안 됨")
        self.hoyo_label.setWordWrap(True)
        hoyo = QWidget()
        hr = QHBoxLayout(hoyo)
        hr.setContentsMargins(0, 0, 0, 0)
        hr.addWidget(self.hoyo_label, 1)
        if hoyolab:
            login, logout = QPushButton("로그인…"), QPushButton("로그아웃")
            login.clicked.connect(lambda: self.hoyo_label.setText(hoyolab[1]()))
            logout.clicked.connect(lambda: self.hoyo_label.setText(hoyolab[2]()))
            hr.addWidget(login)
            hr.addWidget(logout)
        self.neople_key = QLineEdit()
        self.neople_key.setEchoMode(QLineEdit.EchoMode.Password)
        self.neople_key.setPlaceholderText("저장돼 있어요 (바꿀 때만 새로 넣기)" if neople_set
                                           else "네오플 개발자센터 → 마이페이지 → 애플리케이션 등록 → API Key")
        self.cy_nick = QLineEdit(str(v.get("cyphers.nickname", "")))
        self.cy_nick.setPlaceholderText("사이퍼즈 닉네임")
        games = page(group("원신", [("UID (진열장)", self.uid), ("HoYoLAB (레진·의뢰)", hoyo),
                                    ("", _hint("기원 기록은 게임 안에서 기원 → 기록을 한 번 열어 두면 게임을 끌 때 알아서 받아요."))]),
                     group("사이퍼즈 (이 컴퓨터에만 저장)", [("API 키", self.neople_key), ("닉네임", self.cy_nick)]))

        # ---------------------------------------------------------------- 기억·창 읽기
        self.memory_on = check("바뀐 화면을 이 PC 에 저장해 두기", "screen.memory", True,
                               "'아까 3시쯤 뭐 했지?', 지난 10분 복기에 써요.")
        self.memory_days = Choice(MEMORY_DAYS, str(v.get("screen.memory_days", 180)))
        self.memory_gb = Choice(MEMORY_GB, str(v.get("screen.memory_gb", 100)))
        self.read_windows = check("부탁하면 다른 프로그램 창도 읽기", "screen.read_windows", True,
                                  "'카톡 읽어줘' 등. 그 창 내용이 AI 에게 보내져요.")
        self.auto_read = check("메신저를 쓰고 있으면 알아서 읽고 흐름 알기", "screen.auto_read", True,
                               "카톡·디스코드 등, 어느 모니터든")
        memory = page(group("화면 기억 (이 컴퓨터에만 저장)", [("", self.memory_on), ("보관 기간", self.memory_days),
                                                             ("최대 용량", self.memory_gb)]),
                      group("창 읽기", [("", self.read_windows), ("", self.auto_read)]))

        self.tabs = QTabWidget()
        for widget, title in ((screen, "화면 보기"), (basic, "기본"), (cost, "비용"), (voice, "목소리"), (assist, "비서"),
                              (games, "게임 연결"), (memory, "기억·창 읽기")):
            self.tabs.addTab(widget, title)

        self.note = QLabel("")
        self.note.setWordWrap(True)
        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Save | QDialogButtonBox.StandardButton.Cancel)
        buttons.button(QDialogButtonBox.StandardButton.Save).setText("저장")
        buttons.button(QDialogButtonBox.StandardButton.Cancel).setText("취소")
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        lay = QVBoxLayout(self)
        lay.addWidget(self.tabs, 1)
        lay.addWidget(self.note)
        lay.addWidget(buttons)
        avail = QGuiApplication.primaryScreen()
        height = avail.availableGeometry().height() if avail else 900
        self.resize(620, min(640, int(height * 0.85)))

        self.timer = QTimer(self)
        self.timer.timeout.connect(self._update_level)
        self.timer.start(80)
        self.finished.connect(lambda _: self._toggle_meter(False))

    def _toggle_meter(self, on: bool) -> None:
        if not self.meter:
            return
        start, stop = self.meter
        if on:
            if not start():
                self.note.setText("마이크를 열 수 없어요. 마이크를 다른 걸로 고르거나 윈도우 소리 설정을 확인하세요.")
                self.meter_btn.setChecked(False)
            else:
                self.note.setText("말해보세요. 막대가 절반 넘게 올라가면 충분히 들려요.")
        else:
            stop()

    def _update_level(self) -> None:
        if self.voice_level and self.meter_btn.isChecked():
            self.level_bar.setValue(int(max(0.0, min(60.0, self.voice_level() + 60))))
        else:
            self.level_bar.setValue(0)

    def values(self) -> dict:
        return {
            "character.scale": round(self.scale.value() / 100, 2),
            "character.talk_motion": self.talk.value(),
            "screen.enabled": self.screen_on.isChecked(),
            "screen.chattiness": self.chatty.value(),
            "screen.interval_seconds": self.interval.value(),
            "screen.cooldown_seconds": self.cooldown.value(),
            "screen.monitor": self.monitor.value(),
            "screen.coach": self.coach.value(),
            "screen.result_depth": self.result_depth.value(),
            "screen.daily_krw": self.daily_limit.value(),
            "screen.line_quality": self.line_quality.value(),
            "screen.dense": self.dense.value(),
            "screen.scan": self.scan.isChecked(),
            "screen.limit_stop": self.limit_stop.isChecked(),
            "ui.bubble_time": self.bubble_time.value(),
            "screen.memory": self.memory_on.isChecked(),
            "screen.read_windows": self.read_windows.isChecked(),
            "screen.auto_read": self.auto_read.isChecked(),
            "screen.memory_days": int(self.memory_days.value()),
            "screen.memory_gb": int(self.memory_gb.value()),
            "screen.overlay": self.overlay.value(),
            "screen.overlay_pos": self.overlay_pos.value(),
            "screen.max_width": int(self.sharp.value()),
            "voice.mode": self.voice_mode.value(),
            "voice.mic": self.mic.currentData(),
            "voice.wake_word": self.wake.text().strip() if self.wake_on.isChecked() else "",
            "voice.model": self.model.value(),
            "budget.monthly_usd": self.budget.value(),
            "ai.fast": self.fast.isChecked(),
            "ai.web_search": self.web.isChecked(),
            "genshin.uid": "".join(ch for ch in self.uid.text() if ch.isdigit()),
            "cyphers.nickname": self.cy_nick.text().strip(),
            "user.nickname": ", ".join(n.strip() for n in self.nick.text().replace("，", ",").split(",") if n.strip()),
            "ui.show_status": self.show_status.isChecked(),
            "pc.monitor": self.pc_monitor.isChecked(),
            "assist.briefing": self.briefing.isChecked(),
            "assist.pause_when_away": self.pause_away.isChecked(),
            "assist.resume": self.resume.isChecked(),
            "assist.chores": self.chores.isChecked(),
            "assist.auto_dates": self.auto_dates.isChecked(),
            "voice.speak": self.speak.isChecked(),
            "voice.speak_rate": self.speak_rate.value(),
            "pc.clip_tool": self.clip_tool.value(),
            "pc.auto_clip": self.auto_clip.isChecked(),
        }

    def changed(self) -> dict:
        return {k: v for k, v in self.values().items() if self.initial.get(k) != v}
