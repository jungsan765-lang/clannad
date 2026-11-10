"""영상 복기 창: 볼 구간·장면 간격·게임·특히 봐 줄 것을 고른다 (장면 수와 예상 비용을 미리 보여 줌)."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (QComboBox, QDialog, QGridLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton, QSlider,
                               QVBoxLayout, QWidget)

from video_review import MAX_FRAMES, VideoInfo, auto_step, estimate_krw, mmss, plan_times

STEPS = [("auto", "자동"), ("1", "1초"), ("2", "2초"), ("3", "3초"), ("5", "5초"), ("10", "10초")]


class VideoReviewDialog(QDialog):
    def __init__(self, info: VideoInfo, games: list[str], current_game: str = "", krw_per_usd: float = 1400.0,
                 parent=None):
        super().__init__(parent)
        self.setWindowTitle("영상으로 복기")
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        self.setMinimumWidth(560)
        self.info = info
        self.krw_per_usd = krw_per_usd
        total = max(1, int(info.seconds))
        head = QLabel(f"<b>{info.path.name}</b> · 길이 {mmss(info.seconds)} · {info.width}×{info.height}")
        head.setWordWrap(True)
        self.start = QSlider(Qt.Orientation.Horizontal)
        self.end = QSlider(Qt.Orientation.Horizontal)
        for s in (self.start, self.end):
            s.setRange(0, total)
        self.start.setValue(0)
        self.end.setValue(total)
        self.start_label, self.end_label = QLabel(), QLabel()
        self.step = QComboBox()
        for value, label in STEPS:
            self.step.addItem(label, value)
        self.game = QComboBox()
        self.game.addItem("모름 / 게임 아님", "")
        for g in games:
            self.game.addItem(g, g)
        i = self.game.findData(current_game)
        self.game.setCurrentIndex(i if i >= 0 else 0)
        self.question = QLineEdit()
        self.question.setPlaceholderText("특히 봐 줬으면 하는 것 (예: 2분쯤 한타에서 뭘 잘못했는지)")
        self.estimate = QLabel()
        self.estimate.setWordWrap(True)

        grid = QGridLayout()
        rows = [("시작", self._row(self.start, self.start_label)), ("끝", self._row(self.end, self.end_label)),
                ("장면 간격", self.step), ("게임", self.game), ("봐 줄 것", self.question)]
        for r, (label, w) in enumerate(rows):
            grid.addWidget(QLabel(label), r, 0)
            grid.addWidget(w, r, 1)
        note = QLabel(f"영상에서 장면을 최대 {MAX_FRAMES}장 뽑아 보내요(영상 파일 자체는 보내지 않아요). "
                      "길면 구간을 짧게(2~3분) 잡을수록 촘촘하게 봐요.")
        note.setWordWrap(True)
        note.setStyleSheet("color: #555;")
        go, cancel = QPushButton("복기 시작"), QPushButton("취소")
        go.setDefault(True)
        go.clicked.connect(self.accept)
        cancel.clicked.connect(self.reject)
        buttons = QHBoxLayout()
        buttons.addStretch(1)
        buttons.addWidget(go)
        buttons.addWidget(cancel)
        lay = QVBoxLayout(self)
        lay.addWidget(head)
        lay.addLayout(grid)
        lay.addWidget(note)
        lay.addWidget(self.estimate)
        lay.addLayout(buttons)
        for sig in (self.start.valueChanged, self.end.valueChanged):
            sig.connect(self._update)
        self.step.currentIndexChanged.connect(self._update)
        self._update()

    @staticmethod
    def _row(slider: QSlider, label: QLabel) -> QWidget:
        w = QWidget()
        lay = QHBoxLayout(w)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.addWidget(slider, 1)
        label.setMinimumWidth(60)
        lay.addWidget(label)
        return w

    def _update(self) -> None:
        if self.end.value() <= self.start.value():
            self.end.blockSignals(True)
            self.end.setValue(min(self.end.maximum(), self.start.value() + 1))
            self.end.blockSignals(False)
        self.start_label.setText(mmss(self.start.value()))
        self.end_label.setText(mmss(self.end.value()))
        times = self.times()
        gap = (times[-1] - times[0]) / max(1, len(times) - 1) if len(times) > 1 else 0
        self.estimate.setText(f"장면 {len(times)}장 (약 {gap:.0f}초마다) · 예상 비용 약 {estimate_krw(len(times), self.krw_per_usd):,}원")

    def times(self) -> list[float]:
        start, end = float(self.start.value()), float(self.end.value())
        value = self.step.currentData()
        step = auto_step(start, end) if value == "auto" else float(value)
        return plan_times(start, end, step)

    def choices(self) -> dict:
        return {"times": self.times(), "game": self.game.currentData(), "question": self.question.text().strip()}
