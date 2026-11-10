"""화면 보는 규칙 창: 주인님이 '그런 얘기 하지 마' / '이런 건 챙겨 봐' / '이 창은 아예 보지 마'라고 한 것들.

보고, 지우고, 직접 적는다. [전체]는 어디서나, [게임 이름]은 그 게임에서만. '아예 안 보기'는 항상 전체.
"""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (QComboBox, QDialog, QHBoxLayout, QLabel, QLineEdit, QListWidget, QPushButton,
                               QVBoxLayout)

KINDS = [("dont", "하지 말 것"), ("do", "챙겨 볼 것"), ("skip", "아예 안 볼 창")]
KIND_LABEL = dict(KINDS)
HINTS = {"dont": "예) 원정 귀환 알림은 말하지 않기", "do": "예) 레진이 180 넘으면 알려 주기",
         "skip": "프로그램 이름이나 창 제목에 들어가는 말. 예) 카카오톡, 국민은행"}


class RulesDialog(QDialog):
    def __init__(self, memory, scopes: list[str], parent=None):
        super().__init__(parent)
        self.memory = memory
        self.setWindowTitle("화면 보는 규칙")
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        self.resize(600, 440)
        info = QLabel("다니카에게 '앞으로 ~하지 마', '이런 건 챙겨 봐 줘', '○○은 아예 보지 마'라고 하면 여기에 적혀요. "
                      "[전체]는 어디서나, [게임 이름]은 그 게임에서만. '아예 안 볼 창'이 앞에 있으면 화면을 찍지도 않아요.")
        info.setWordWrap(True)
        self.list = QListWidget()
        remove = QPushButton("고른 것 지우기")
        remove.clicked.connect(self._remove)
        self.kind = QComboBox()
        for key, label in KINDS:
            self.kind.addItem(label, key)
        self.kind.currentIndexChanged.connect(self._kind_changed)
        self.scope = QComboBox()
        for s in scopes:
            self.scope.addItem(s)
        self.entry = QLineEdit()
        add = QPushButton("적기")
        add.clicked.connect(self._add)
        self.entry.returnPressed.connect(self._add)
        close = QPushButton("닫기")
        close.clicked.connect(self.accept)
        row = QHBoxLayout()
        row.addWidget(self.kind)
        row.addWidget(self.scope)
        row.addWidget(self.entry, 1)
        row.addWidget(add)
        bottom = QHBoxLayout()
        bottom.addWidget(remove)
        bottom.addStretch(1)
        bottom.addWidget(close)
        lay = QVBoxLayout(self)
        lay.addWidget(info)
        lay.addWidget(self.list, 1)
        lay.addLayout(row)
        lay.addLayout(bottom)
        self._kind_changed()
        self._show()

    def _kind_changed(self) -> None:
        key = self.kind.currentData()
        self.entry.setPlaceholderText("직접 적기: " + HINTS[key])
        self.scope.setEnabled(key != "skip")

    def _show(self) -> None:
        self.list.clear()
        for r in self.memory.rules:
            kind = r.get("kind", "dont")
            self.list.addItem(f"{KIND_LABEL.get(kind, kind)} · [{r['scope']}] {r['text']}  ({r['date']})")

    def _remove(self) -> None:
        row = self.list.currentRow()
        if row >= 0:
            self.memory.remove_rule(row)
            self._show()

    def _add(self) -> None:
        if self.memory.add_rule(self.scope.currentText(), self.entry.text(), kind=self.kind.currentData()):
            self.entry.clear()
            self._show()
