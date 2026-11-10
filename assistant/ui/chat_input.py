"""캐릭터를 클릭하면 뜨는 한 줄 대화 입력창."""

from __future__ import annotations

from PySide6.QtCore import QPoint, QRect, Qt, Signal
from PySide6.QtGui import QGuiApplication
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLineEdit, QPushButton, QWidget


class ChatInput(QWidget):
    """Enter 로 보내고 Esc 로 닫는다."""

    submitted = Signal(str)

    def __init__(self):
        super().__init__(None)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.Tool)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        frame = QFrame(self)
        frame.setObjectName("frame")
        frame.setStyleSheet(
            "#frame { background: rgba(252,252,255,245); border: 1px solid #46505f; border-radius: 10px; }"
            "QLineEdit { border: none; background: transparent; font-size: 11pt; padding: 4px; }"
            "QPushButton { border: none; color: #2f5d8a; font-weight: bold; padding: 4px 8px; }"
        )
        self.edit = QLineEdit(frame)
        self.edit.setPlaceholderText("말 걸기… (Enter 보내기, Esc 닫기)")
        self.edit.setMaxLength(1000)
        send = QPushButton("보내기", frame)
        lay = QHBoxLayout(frame)
        lay.setContentsMargins(8, 4, 4, 4)
        lay.addWidget(self.edit)
        lay.addWidget(send)
        outer = QHBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.addWidget(frame)
        self.setFixedSize(340, 44)
        self.edit.returnPressed.connect(self._submit)
        send.clicked.connect(self._submit)

    def open_near(self, anchor: QRect) -> None:
        x = anchor.center().x() - self.width() // 2
        y = anchor.bottom() + 6
        scr = QGuiApplication.screenAt(anchor.center()) or QGuiApplication.primaryScreen()
        screen = scr.availableGeometry() if scr else None
        if screen is not None:
            x = max(screen.left() + 4, min(x, screen.right() - self.width() - 4))
            if y + self.height() > screen.bottom():
                y = anchor.top() - self.height() - 6
        self.move(QPoint(x, y))
        self.show()
        self.raise_()
        self.activateWindow()
        self.edit.setFocus()

    def _submit(self) -> None:
        text = self.edit.text().strip()
        if not text:
            return
        self.edit.clear()
        self.hide()
        self.submitted.emit(text)

    def keyPressEvent(self, event) -> None:  # noqa: N802
        if event.key() == Qt.Key.Key_Escape:
            self.hide()
        else:
            super().keyPressEvent(event)
