"""고친 말 창: 다니카가 잘못 부르던 말을 맞는 말로 (예: 남과 → 호박). 보고, 지우고, 직접 적는다."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QDialog, QHBoxLayout, QLabel, QLineEdit, QListWidget, QPushButton, QVBoxLayout


class TermsDialog(QDialog):
    def __init__(self, memory, parent=None):
        super().__init__(parent)
        self.memory = memory
        self.setWindowTitle("고친 말")
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        self.resize(520, 380)
        info = QLabel("다니카에게 '남과가 아니라 호박이야'라고 하면 여기에 적혀요. 대화·화면 보고 하는 말·분석 모두 "
                      "고친 말로 바뀌어요.")
        info.setWordWrap(True)
        self.list = QListWidget()
        remove = QPushButton("고른 것 지우기")
        remove.clicked.connect(self._remove)
        self.wrong = QLineEdit()
        self.wrong.setPlaceholderText("틀린 말 (예: 남과)")
        self.right = QLineEdit()
        self.right.setPlaceholderText("맞는 말 (예: 호박)")
        add = QPushButton("적기")
        add.clicked.connect(self._add)
        self.right.returnPressed.connect(self._add)
        close = QPushButton("닫기")
        close.clicked.connect(self.accept)
        row = QHBoxLayout()
        row.addWidget(self.wrong, 1)
        row.addWidget(QLabel("→"))
        row.addWidget(self.right, 1)
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
        for t in self.memory.terms:
            self.list.addItem(f"{t['wrong']}  →  {t['right']}   ({t['date']})")

    def _remove(self) -> None:
        row = self.list.currentRow()
        if row >= 0:
            self.memory.remove_term(row)
            self._show()

    def _add(self) -> None:
        if self.memory.add_term(self.wrong.text(), self.right.text()):
            self.wrong.clear()
            self.right.clear()
            self._show()
