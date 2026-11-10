"""금지 사항 창: 주인님이 '하지 마'라고 한 것들을 보고, 지우고, 직접 적는다."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (QComboBox, QDialog, QHBoxLayout, QLabel, QLineEdit, QListWidget, QPushButton,
                               QVBoxLayout)


class RulesDialog(QDialog):
    def __init__(self, memory, scopes: list[str], parent=None):
        super().__init__(parent)
        self.memory = memory
        self.setWindowTitle("금지 사항 (하지 말라고 한 것)")
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        self.resize(560, 420)
        info = QLabel("다니카에게 '앞으로 ~하지 마'라고 하면 여기에 적혀요. 화면을 보고 말할지 정할 때도 이걸 지켜요. "
                      "[전체]는 어디서나, [게임 이름]은 그 게임에서만.")
        info.setWordWrap(True)
        self.list = QListWidget()
        remove = QPushButton("고른 것 지우기")
        remove.clicked.connect(self._remove)
        self.scope = QComboBox()
        for s in scopes:
            self.scope.addItem(s)
        self.entry = QLineEdit()
        self.entry.setPlaceholderText("직접 적기: 예) 원정 귀환 알림은 말하지 않기")
        add = QPushButton("적기")
        add.clicked.connect(self._add)
        self.entry.returnPressed.connect(self._add)
        close = QPushButton("닫기")
        close.clicked.connect(self.accept)
        row = QHBoxLayout()
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
        self._show()

    def _show(self) -> None:
        self.list.clear()
        for r in self.memory.rules:
            self.list.addItem(f"[{r['scope']}] {r['text']}  ({r['date']})")

    def _remove(self) -> None:
        row = self.list.currentRow()
        if row >= 0:
            self.memory.remove_rule(row)
            self._show()

    def _add(self) -> None:
        if self.memory.add_rule(self.scope.currentText(), self.entry.text()):
            self.entry.clear()
            self._show()
