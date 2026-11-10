"""설정 창 (전부 한국어, 끌어서 조절하는 막대·체크·동그라미 버튼).

바꾼 값은 data/state.json 에 저장되어 config.toml 보다 우선한다. 설정 파일을 직접 열 필요 없음.
"""

from __future__ import annotations

from typing import Callable

from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QGuiApplication
from PySide6.QtWidgets import (QButtonGroup, QCheckBox, QComboBox, QDialog, QDialogButtonBox, QGridLayout,
                               QGroupBox, QHBoxLayout, QLabel, QLineEdit, QProgressBar, QPushButton, QRadioButton,
                               QScrollArea, QSlider, QVBoxLayout, QWidget)

TALK_STYLES = [("bounce", "살짝 움직임"), ("still", "멈춤"), ("breathe", "숨쉬기 계속")]
CHATTY = [("quiet", "조용히"), ("normal", "보통"), ("chatty", "자주")]
VOICE_MODES = [("off", "듣지 않기"), ("push", "단축키 누를 때만"), ("always", "항상 듣기")]
MODELS = [("small", "빠름"), ("medium", "보통 (추천)"), ("large-v3-turbo", "정확함 (느림)")]
BUBBLE_TIMES = [("short", "짧게"), ("normal", "보통"), ("long", "길게")]
MEMORY_DAYS = [("30", "30일"), ("90", "90일"), ("180", "180일"), ("365", "1년")]
MEMORY_GB = [("20", "20GB"), ("50", "50GB"), ("100", "100GB"), ("300", "300GB")]
COACH = [("off", "끔"), ("analysis", "분석"), ("review", "복기")]
RESULT_DEPTH = [("deep", "깊게 생각 (1~2분, 판마다 약 200~400원)"), ("quick", "빠르게")]
OVERLAY = [("important", "중요한 것만"), ("game", "게임 중 모두"), ("always", "항상"), ("off", "끔")]
OVERLAY_POS = [("top", "위 가운데"), ("bottom", "아래 가운데")]
SHARPNESS = [(1280, "보통"), (1920, "선명 (추천)"), (2560, "아주 선명 (비용 약 2배)")]

# 다시 시작해야 적용되는 설정
RESTART_KEYS = {"character.scale", "voice.model"}


class Choice(QWidget):
    """동그라미 버튼 묶음 (하나만 고름)."""

    def __init__(self, items: list[tuple[str, str]], current: str):
        super().__init__()
        self.group = QButtonGroup(self)
        self.values = []
        lay = QHBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        for i, (value, label) in enumerate(items):
            b = QRadioButton(label)
            self.group.addButton(b, i)
            self.values.append(value)
            lay.addWidget(b)
            if value == current:
                b.setChecked(True)
        if self.group.checkedId() < 0 and self.group.buttons():
            self.group.buttons()[0].setChecked(True)
        lay.addStretch(1)

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

        # 캐릭터
        self.scale = Slider(30, 200, 5, float(v["character.scale"]) * 100, lambda x: f"{x}%")
        self.talk = Choice(TALK_STYLES, str(v["character.talk_motion"]))
        self.bubble_time = Choice(BUBBLE_TIMES, str(v.get("ui.bubble_time", "normal")))
        g1 = group("캐릭터", [("크기 (다시 시작하면 적용)", self.scale), ("말할 때", self.talk),
                               ("말풍선 보이는 시간", self.bubble_time)])

        # 화면 보기
        self.screen_on = QCheckBox("화면을 보고 먼저 말 걸기")
        self.screen_on.setChecked(bool(v["screen.enabled"]))
        self.chatty = Choice(CHATTY, str(v["screen.chattiness"]))
        self.interval = Slider(10, 300, 5, float(v["screen.interval_seconds"]), _seconds)
        self.cooldown = Slider(20, 1800, 10, float(v["screen.cooldown_seconds"]), _seconds)
        mon_items = [("left", "왼쪽"), ("right", "오른쪽"), ("primary", "주 모니터")]
        if len(monitors) > 2:
            mon_items += [(m, f"{m}번") for m in monitors]
        self.monitor = Choice(mon_items, str(v["screen.monitor"]))
        width = int(v.get("screen.max_width", 1920))
        near = min(SHARPNESS, key=lambda s: abs(s[0] - width))[0]  # 예전 값(1024 등)은 가까운 칸으로
        self.sharp = Choice([(str(w), label) for w, label in SHARPNESS], str(near))
        self.coach = Choice(COACH, str(v.get("screen.coach", "off")))
        coach_note = QLabel("분석: 결과·파티 화면처럼 중요한 순간에 자세히 (한 번에 약 50~150원).  복기: 게임 중 5초마다 보고, "
                            "싸움·판이 끝나면 '이랬으면 좋았을 것'을 짚음 (게임 1시간에 약 1,000~3,000원).  F10 은 언제든.")
        coach_note.setWordWrap(True)
        coach_note.setStyleSheet("color: #555;")
        self.result_depth = Choice(RESULT_DEPTH, str(v.get("screen.result_depth", "deep")))
        self.overlay = Choice(OVERLAY, str(v.get("screen.overlay", "important")))
        self.overlay_pos = Choice(OVERLAY_POS, str(v.get("screen.overlay_pos", "top")))
        g2 = group("화면 보기", [("", self.screen_on), ("코칭", self.coach), ("", coach_note),
                                 ("판 끝난 뒤 총평", self.result_depth),
                                 ("게임 화면 자막", self.overlay), ("자막 위치", self.overlay_pos), ("말 거는 정도", self.chatty),
                                 ("화면 확인 간격", self.interval),
                                 ("한 번 말한 뒤 쉬는 시간", self.cooldown), ("볼 모니터", self.monitor),
                                 ("화면 선명도 (글자 읽기)", self.sharp)])

        # 목소리
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
        g3 = group("목소리로 말 걸기", [("듣는 방식", self.voice_mode), ("마이크", self.mic), ("소리 크기", meter),
                                        ("부르는 이름", wake), ("알아듣는 수준 (다시 시작하면 적용)", self.model)])

        # 대답·표시
        self.fast = QCheckBox("빠르게 대답 (답이 2배쯤 빨리 오지만 요금도 2배)")
        self.fast.setChecked(bool(v.get("ai.fast", False)))
        self.show_status = QCheckBox("하고 있는 일 표시 (캐릭터 아래 작은 글씨: 생각 중, 정리 중 …)")
        self.show_status.setChecked(bool(v.get("ui.show_status", True)))
        self.web = QCheckBox("모르는 건 인터넷에서 찾아보기 (한 번에 약 30~70원, 찾은 건 기억해 둠)")
        self.web.setChecked(bool(v.get("ai.web_search", True)))
        self.nick = QLineEdit(str(v.get("user.nickname", "")))
        self.nick.setPlaceholderText("예) 하늘고래, SkyWhale  (여러 개면 쉼표로)")
        g6 = group("주인님 (이 컴퓨터에만 저장)", [("아이디·닉네임", self.nick)])

        # 원신 연결 (게임 프로그램은 건드리지 않음)
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
        wish_note = QLabel("기원 기록은 게임 안에서 기원 → 기록을 한 번 열어 두면, 게임을 끌 때 알아서 받아요.")
        wish_note.setWordWrap(True)
        g7 = group("원신 연결", [("UID (진열장)", self.uid), ("HoYoLAB (레진·의뢰)", hoyo), ("", wish_note)])

        # 사이퍼즈 연결 (네오플 공식 API)
        self.neople_key = QLineEdit()
        self.neople_key.setEchoMode(QLineEdit.EchoMode.Password)
        self.neople_key.setPlaceholderText("저장돼 있어요 (바꿀 때만 새로 넣기)" if neople_set
                                           else "네오플 개발자센터 → 마이페이지 → 애플리케이션 등록 → API Key")
        self.cy_nick = QLineEdit(str(v.get("cyphers.nickname", "")))
        self.cy_nick.setPlaceholderText("사이퍼즈 닉네임")
        g8 = group("사이퍼즈 연결 (이 컴퓨터에만 저장)", [("API 키", self.neople_key), ("닉네임", self.cy_nick)])

        # 화면 기억 (이 PC 에만)
        self.memory_on = QCheckBox("바뀐 화면을 이 PC 에 저장해 두기 ('아까 3시쯤 뭐 했지?', 지난 10분 복기에 씀)")
        self.memory_on.setChecked(bool(v.get("screen.memory", True)))
        self.memory_days = Choice(MEMORY_DAYS, str(v.get("screen.memory_days", 180)))
        self.memory_gb = Choice(MEMORY_GB, str(v.get("screen.memory_gb", 100)))
        self.read_windows = QCheckBox("부탁하면 다른 프로그램 창도 읽기 ('카톡 읽어줘' 등. 그 창 내용이 AI 에게 보내져요)")
        self.read_windows.setChecked(bool(v.get("screen.read_windows", True)))
        self.auto_read = QCheckBox("메신저(카톡·디스코드 등)를 쓰고 있으면 알아서 읽고 대화 흐름 알기 (어느 모니터든)")
        self.auto_read.setChecked(bool(v.get("screen.auto_read", True)))
        g9 = group("화면 기억·창 읽기 (이 컴퓨터에만 저장)", [("", self.memory_on), ("보관 기간", self.memory_days),
                                                          ("최대 용량", self.memory_gb), ("", self.read_windows),
                                                          ("", self.auto_read)])
        g5 = group("대답·표시", [("", self.web), ("", self.fast), ("", self.show_status)])

        # 비서 기능
        self.pc_monitor = QCheckBox("PC 상태 감시 (그래픽카드 온도·메모리·저장 공간에 문제가 생기면 알려 주기)")
        self.pc_monitor.setChecked(bool(v.get("pc.monitor", True)))
        self.assist_rows = [("", self.pc_monitor)]
        g10 = group("비서 기능", self.assist_rows)

        # 비용
        self.budget = Slider(10, 500, 10, float(v["budget.monthly_usd"]), lambda x: f"한 달 {x}달러")
        g4 = group("비용", [("월 예산", self.budget)])

        self.note = QLabel("")
        self.note.setWordWrap(True)
        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Save | QDialogButtonBox.StandardButton.Cancel)
        buttons.button(QDialogButtonBox.StandardButton.Save).setText("저장")
        buttons.button(QDialogButtonBox.StandardButton.Cancel).setText("취소")
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        # 칸이 많아 화면보다 길어질 수 있으니 안쪽만 스크롤 (저장·취소 버튼은 늘 보이게)
        content = QWidget()
        inner = QVBoxLayout(content)
        for g in (g6, g7, g8, g1, g5, g10, g2, g9, g3, g4):
            inner.addWidget(g)
        inner.addStretch(1)
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QScrollArea.Shape.NoFrame)
        scroll.setWidget(content)
        lay = QVBoxLayout(self)
        lay.addWidget(scroll, 1)
        lay.addWidget(self.note)
        lay.addWidget(buttons)
        screen = QGuiApplication.primaryScreen()
        height = screen.availableGeometry().height() if screen else 900
        self.resize(max(560, content.sizeHint().width() + 40), min(content.sizeHint().height() + 120, int(height * 0.85)))

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
        }

    def changed(self) -> dict:
        return {k: v for k, v in self.values().items() if self.initial.get(k) != v}
