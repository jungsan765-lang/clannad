"""개선 요청 메모 창: 보기, 직접 적기, 복사하기(개발 채팅에 붙여넣기용), 모두 지우기."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (QApplication, QDialog, QHBoxLayout, QLabel, QLineEdit, QMessageBox, QPlainTextEdit,
                               QPushButton, QVBoxLayout)

from wishlist import Wishlist


class WishlistDialog(QDialog):
    def __init__(self, wishlist: Wishlist, parent=None):
        super().__init__(parent)
        self.wishlist = wishlist
        self.setWindowTitle("개선 요청 메모")
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        self.resize(560, 420)
        info = QLabel("다니카가 못 했던 일이나 바라는 기능을 모아 둔 메모예요. "
                      "'복사하기'를 누르고 개발 채팅에 붙여넣으면, 만들어서 업데이트로 보내 드려요.")
        info.setWordWrap(True)
        self.view = QPlainTextEdit()
        self.view.setReadOnly(True)
        self.entry = QLineEdit()
        self.entry.setPlaceholderText("직접 적기: 예) 알람 맞춰 주는 기능")
        add = QPushButton("적기")
        add.clicked.connect(self._add)
        self.entry.returnPressed.connect(self._add)
        row1 = QHBoxLayout()
        row1.addWidget(self.entry, 1)
        row1.addWidget(add)
        copy = QPushButton("복사하기")
        copy.clicked.connect(self._copy)
        clear = QPushButton("모두 지우기")
        clear.clicked.connect(self._clear)
        close = QPushButton("닫기")
        close.clicked.connect(self.accept)
        self.note = QLabel("")
        row2 = QHBoxLayout()
        row2.addWidget(self.note, 1)
        for b in (copy, clear, close):
            row2.addWidget(b)
        lay = QVBoxLayout(self)
        lay.addWidget(info)
        lay.addWidget(self.view, 1)
        lay.addLayout(row1)
        lay.addLayout(row2)
        self._show()

    def _show(self) -> None:
        self.view.setPlainText(self.wishlist.text())

    def _add(self) -> None:
        if self.wishlist.add(self.entry.text()):
            self.entry.clear()
            self._show()

    def _copy(self) -> None:
        QApplication.clipboard().setText(self.wishlist.text())
        self.note.setText("복사했어요. 개발 채팅에 붙여넣어 주세요.")

    def _clear(self) -> None:
        if not self.wishlist.items:
            return
        box = QMessageBox(QMessageBox.Icon.Question, "모두 지우기", "적어 둔 개선 요청을 모두 지울까요?")
        yes = box.addButton("지우기", QMessageBox.ButtonRole.AcceptRole)
        box.addButton("취소", QMessageBox.ButtonRole.RejectRole)
        box.exec()
        if box.clickedButton() is yes:
            self.wishlist.clear()
            self._show()
