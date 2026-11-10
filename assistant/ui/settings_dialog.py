"""설정 창 (전부 한국어, 끌어서 조절하는 막대·체크·동그라미 버튼).

바꾼 값은 data/state.json 에 저장되어 config.toml 보다 우선한다. 설정 파일을 직접 열 필요 없음.
"""

from __future__ import annotations

from typing import Callable

from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import (QButtonGroup, QCheckBox, QComboBox, QDialog, QDialogButtonBox, QGridLayout,
                               QGroupBox, QHBoxLayout, QLabel, QLineEdit, QProgressBar, QPushButton, QRadioButton,
                               QSlider, QVBoxLayout, QWidget)

TALK_STYLES = [("bounce", "살짝 움직임"), ("still", "멈춤"), ("breathe", "숨쉬기 계속")]
CHATTY = [("quiet", "조용히"), ("normal", "보통"), ("chatty", "자주")]
VOICE_MODES = [("off", "듣지 않기"), ("push", "단축키 누를 때만"), ("always", "항상 듣기")]
MODELS = [("small", "빠름"), ("medium", "보통 (추천)"), ("large-v3-turbo", "정확함 (느림)")]
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
                 meter: tuple[Callable[[], bool], Callable[[], None]] | None = None, parent=None):
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
        g1 = group("캐릭터", [("크기 (다시 시작하면 적용)", self.scale), ("말할 때", self.talk)])

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
        g2 = group("화면 보기", [("", self.screen_on), ("말 거는 정도", self.chatty), ("화면 확인 간격", self.interval),
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
        g5 = group("대답·표시", [("", self.web), ("", self.fast), ("", self.show_status)])

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
        lay = QVBoxLayout(self)
        for g in (g1, g5, g2, g3, g4):
            lay.addWidget(g)
        lay.addWidget(self.note)
        lay.addWidget(buttons)

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
            "screen.max_width": int(self.sharp.value()),
            "voice.mode": self.voice_mode.value(),
            "voice.mic": self.mic.currentData(),
            "voice.wake_word": self.wake.text().strip() if self.wake_on.isChecked() else "",
            "voice.model": self.model.value(),
            "budget.monthly_usd": self.budget.value(),
            "ai.fast": self.fast.isChecked(),
            "ai.web_search": self.web.isChecked(),
            "ui.show_status": self.show_status.isChecked(),
        }

    def changed(self) -> dict:
        return {k: v for k, v in self.values().items() if self.initial.get(k) != v}
