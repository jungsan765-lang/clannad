"""설정 창 (전부 한국어, 끌어서 조절하는 막대·체크·동그라미 버튼).

바꾼 값은 data/state.json 에 저장되어 config.toml 보다 우선한다. 설정 파일을 직접 열 필요 없음.
"""

from __future__ import annotations

from typing import Callable

from PySide6.QtCore import Qt, QTimer, QUrl
from PySide6.QtGui import QDesktopServices, QGuiApplication
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
                 "뒤에서 모아 둔 맥락·화면 정보·소리와 함께 평소엔 Sonnet 이, 물어볼 때·중요한 걸 찾았을 때만 Opus 가 화면과 "
                 "맞춰 본 뒤 말해요. 한마디 30~45원 (Opus 일 땐 60~80원)."),
                ("brain", "나눠 보기 · Opus", "늘 Opus 가 화면과 맞춰 본 뒤 말해요. 한마디 60~80원, 조금 더 느려요."),
                ("auto", "가볍게", "가장 싼 모델이 바로 한마디 해요. 한마디 몇 원. 잘못 볼 때가 있어요."),
                ("sonnet", "보통", "중간 모델이 혼자 보고 말해요. 한마디 수십 원."),
                ("best", "최고", "Opus 가 혼자 보고 말해요. 나눠 보기보다 빠르지만 덜 꼼꼼해요.")]
EYE = [("fast", "바로 (추천)", "판단하면 바로 말하기 담당이 흐름 사진·화면을 직접 보고 말해요. 맥락·화면 정보·소리는 뒤에서 "
                                       "계속 모아 둔 걸 같이 줘요. 글자는 나오는 대로 말풍선에."),
       ("careful", "꼼꼼히", "눈 담당이 먼저 장면을 자세히 보고 말하기 담당에게 넘겨요. 더 정확하지만 5~20초 늦어요.")]
RESULT_DEPTH = [("deep", "깊게", "1~2분 생각하고 총평해요. 판마다 200~400원."), ("quick", "빠르게", "바로 짧게 총평해요.")]
OVERLAY = [("important", "중요한 것만"), ("game", "게임 중 모두"), ("always", "항상"), ("off", "끔")]
OVERLAY_POS = [("top", "위 가운데"), ("bottom", "아래 가운데")]
SHARPNESS = [(1280, "보통"), (1920, "선명 (추천)"), (2560, "아주 선명 (비용 2배쯤)")]
LOCAL_CPU = [("little", "조금", "CPU 스레드 4개까지만. 한 장에 15~25초."),
             ("half", "절반 (추천)", "CPU 스레드 절반 (9800X3D 면 16개 중 8개 = 실제 코어 수). 이보다 늘려도 거의 안 빨라져요. "
                                    "낮은 우선순위라 게임이 먼저."),
             ("most", "많이", "CPU 거의 전부. 가장 빠르지만 게임 중엔 비추천.")]

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
                 neople_set: bool = False, local: tuple[Callable[[], str], Callable[[], None]] | None = None,
                 parent=None):
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
        self.eye = Choice(EYE, str(v.get("screen.eye", "fast")))
        self.rush = check("확 바뀐 순간엔 판단 결과를 기다리지 않고 바로 말하기 시작", "screen.rush", True,
                          "죽음·암전·퀘스트 완료처럼 확 바뀐 순간엔 판단과 말하기를 동시에 시작해 2초쯤 빨라요. 45초에 한 번까지, "
                          "판단이 컷신·결과·픽이면 버려요. 시간당 수백 원 더 들 수 있어요.")
        self.moment_face = check("확 바뀐 순간엔 말보다 먼저 표정으로 반응", "screen.moment_face", True,
                                 "죽음·암전 같은 순간 다니카가 바로 놀란 표정을 지어요 (돈 안 듦). 말은 몇 초 뒤에 와요.")
        self.fast_opus = check("Opus 가 말할 땐 빠른 모드 (요금 2배)", "screen.fast_opus", False,
                               "글자 쓰는 속도가 2배쯤 빨라지지만, 한두 문장 말은 시작까지 기다리는 시간이 대부분이라 효과가 작아요.")
        self.sonnet_think = check("평소 한마디도 생각하고 말하기 (조금 느려짐)", "screen.sonnet_think", False,
                                  "끄면(기본) 평소 한마디(Sonnet)를 생각 없이 바로 써서 첫 글자가 빨라요. 판 기록을 화면과 "
                                  "잘못 맞춰 보는 일이 늘었다 싶으면 켜 보세요. 물어볼 때(Opus)는 늘 생각해요.")
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
                                        ("말하는 방식", self.line_quality), ("눈 담당", self.eye), ("", self.rush),
                                        ("", self.moment_face), ("", self.fast_opus), ("", self.sonnet_think),
                                        ("", self.scan), ("", scan_hint)]),
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

        # ---------------------------------------------------------------- 내 PC AI
        self.local_on = check("남는 CPU 로 일부 담당 맡기기 (공짜)", "local.enabled", True)
        local_hint = _hint("눈 담당(장면 자세히 보기)·둘러보기 확대·판정을 이 PC 에서 해요. 그래픽카드는 게임 몫이라 안 쓰고, "
                           "CPU 만 정한 만큼 낮은 우선순위로 써요. 사진·글이 PC 밖으로 안 나가요. 대신 한마디가 10~20초 더 늦고, "
                           "작은 AI 라 클라우드보다 눈이 나빠요 (마지막에 말하기 담당이 화면과 다시 맞춰 봐요). "
                           "안 되거나 오래 걸리면 그 일은 클라우드가 해요.")
        self.local_context = check("맥락 담당: 게임 중 계속 지켜보며 흐름 적기", "local.context", True,
                                   "10초쯤마다 지난 구간 사진·자막을 보고 '지금까지 흐름'을 이어 적어요. 판단·말하기 담당이 같이 봐요. "
                                   "CPU 를 계속 쓰지만 급한 일이 먼저예요.")
        self.ears_on = check("게임 소리 듣기 (대사 받아쓰기)", "ears.enabled", True,
                             "스피커로 나오는 소리에서 대사를 이 PC 에서 글로 바꿔요 (게임 중에만, 다니카가 말할 땐 안 들어요). "
                             "디스코드 통화 소리도 같이 들려요. 받아쓴 글은 판단·말하기 AI 에게 보내져요.")
        self.paddle_ocr = check("정밀 글자 인식 (PaddleOCR 한국어 모델)", "local.paddle_ocr", True,
                                "Windows 글자 인식이 비었거나 깨져 보이면 PaddleOCR 한국어 모델로 줄마다 다시 읽어 더 나은 쪽을 써요. "
                                "처음 쓸 때 뒤에서 설치해요 (약 80MB, 메모리 약 200MB).")
        self.local_cpu = Choice(LOCAL_CPU, str(v.get("local.cpu", "half")))
        self.local_model = QLineEdit(str(v.get("local.model", "gemma3:4b")))
        self.local_model.setToolTip("Ollama 모델 이름. 그림을 볼 수 있는 모델이어야 해요 (gemma3:4b 약 3.3GB, 한국어 됨).")
        self.local_context_model = QLineEdit(str(v.get("local.context_model", "")))
        self.local_context_model.setPlaceholderText("비우면 위 모델을 같이 써요 (메모리 절약, 추천)")
        self.local_context_model.setToolTip("맥락 담당만 따로 쓸 모델. 더 큰 모델(gemma3:12b)은 더 정확하지만 메모리를 9GB 넘게 써서 "
                                            "게임과 같이 쓰면 메모리가 꽉 차요.")
        self.local_status = QLabel(local[0]() if local else "")
        self.local_status.setWordWrap(True)
        status_row = QWidget()
        sr = QHBoxLayout(status_row)
        sr.setContentsMargins(0, 0, 0, 0)
        sr.addWidget(self.local_status, 1)
        get_btn, again_btn = QPushButton("Ollama 받기…"), QPushButton("다시 확인")
        get_btn.clicked.connect(lambda: QDesktopServices.openUrl(QUrl("https://ollama.com/download/windows")))
        if local:
            again_btn.clicked.connect(lambda: (local[1](), self.local_status.setText("확인 중…")))
        sr.addWidget(get_btn)
        sr.addWidget(again_btn)
        setup = _hint("처음 한 번: 'Ollama 받기'로 설치 → 켜 두면(작업 표시줄 오른쪽 아래 라마 아이콘) 다니카가 알아서 연결하고 "
                      "모델을 차례로 받아요 (눈 담당·맥락 담당용 약 3GB → 기억 검색용 약 1.2GB, 한 번만). "
                      "메모리를 93% 넘게 쓰면 새로 모델을 올리지 않고 쉬어요(게임이 먼저), 10분 안 쓰면 메모리에서 내려요. "
                      "맥락 담당이 생각하는 중에 급한 일(눈 담당)이 오면 끊고 먼저 해요.")
        local_page = page(group("내 PC AI", [("", self.local_on), ("", local_hint), ("", self.local_context), ("", self.ears_on),
                                             ("", self.paddle_ocr),
                                             ("CPU 쓰는 정도", self.local_cpu),
                                             ("모델", self.local_model), ("맥락 담당 모델", self.local_context_model),
                                             ("상태", status_row), ("", setup)]))
        if local:
            self._local_timer = QTimer(self)
            self._local_timer.timeout.connect(lambda: self.local_status.setText(local[0]()))
            self._local_timer.start(1000)

        self.tabs = QTabWidget()
        for widget, title in ((screen, "화면 보기"), (basic, "기본"), (cost, "비용"), (local_page, "내 PC AI"),
                              (voice, "목소리"), (assist, "비서"), (games, "게임 연결"), (memory, "기억·창 읽기")):
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
            "screen.eye": self.eye.value(),
            "screen.rush": self.rush.isChecked(),
            "screen.moment_face": self.moment_face.isChecked(),
            "screen.fast_opus": self.fast_opus.isChecked(),
            "screen.sonnet_think": self.sonnet_think.isChecked(),
            "local.enabled": self.local_on.isChecked(),
            "local.cpu": self.local_cpu.value(),
            "local.model": self.local_model.text().strip() or "gemma3:4b",
            "local.context": self.local_context.isChecked(),
            "local.context_model": self.local_context_model.text().strip(),
            "ears.enabled": self.ears_on.isChecked(),
            "local.paddle_ocr": self.paddle_ocr.isChecked(),
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
