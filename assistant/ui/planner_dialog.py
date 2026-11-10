"""알림·할 일 창: 다니카에게 부탁한 알림과 할 일을 보고, 지우고, 직접 넣는다."""

from __future__ import annotations

from datetime import datetime, timedelta

from PySide6.QtCore import QDateTime, Qt
from PySide6.QtWidgets import (QCheckBox, QComboBox, QDateTimeEdit, QDialog, QHBoxLayout, QLabel, QLineEdit,
                               QListWidget, QListWidgetItem, QPushButton, QTabWidget, QVBoxLayout, QWidget)

from planner import REPEAT_LABEL


class PlannerDialog(QDialog):
    def __init__(self, planner, parent=None):
        super().__init__(parent)
        self.planner = planner
        self.setWindowTitle("알림·할 일")
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        self.resize(560, 460)
        tabs = QTabWidget()
        tabs.addTab(self._reminder_tab(), "알림")
        tabs.addTab(self._todo_tab(), "할 일")
        info = QLabel("다니카에게 '30분 뒤에 알려줘', '할 일에 ○○ 적어줘'라고 말해도 여기에 들어와요.")
        info.setWordWrap(True)
        close = QPushButton("닫기")
        close.clicked.connect(self.accept)
        lay = QVBoxLayout(self)
        lay.addWidget(info)
        lay.addWidget(tabs, 1)
        lay.addWidget(close, 0, Qt.AlignmentFlag.AlignRight)
        self._show()

    # ------------------------------------------------------------ 알림

    def _reminder_tab(self) -> QWidget:
        w = QWidget()
        self.rem_list = QListWidget()
        self.when = QDateTimeEdit(QDateTime.fromSecsSinceEpoch(int((datetime.now() + timedelta(minutes=30)).timestamp())))
        self.when.setDisplayFormat("MM-dd HH:mm")
        self.when.setCalendarPopup(True)
        self.rem_text = QLineEdit()
        self.rem_text.setPlaceholderText("알릴 내용 (예: 레진 쓰기)")
        self.repeat = QComboBox()
        for key, label in (("", "한 번"), ("daily", "매일"), ("weekly", "매주")):
            self.repeat.addItem(label, key)
        add = QPushButton("넣기")
        add.clicked.connect(self._add_reminder)
        remove = QPushButton("고른 것 지우기")
        remove.clicked.connect(self._remove_reminder)
        row = QHBoxLayout()
        row.addWidget(self.when)
        row.addWidget(self.rem_text, 1)
        row.addWidget(self.repeat)
        row.addWidget(add)
        lay = QVBoxLayout(w)
        lay.addWidget(self.rem_list, 1)
        lay.addLayout(row)
        lay.addWidget(remove, 0, Qt.AlignmentFlag.AlignLeft)
        return w

    def _add_reminder(self) -> None:
        text = self.rem_text.text().strip()
        if not text:
            return
        when = datetime.fromtimestamp(self.when.dateTime().toSecsSinceEpoch()).replace(second=0, microsecond=0)
        self.planner.add_reminder(when, text, self.repeat.currentData())
        self.rem_text.clear()
        self._show()

    def _remove_reminder(self) -> None:
        item = self.rem_list.currentItem()
        if item:
            self.planner.remove_reminder(item.data(Qt.ItemDataRole.UserRole))
            self._show()

    # ------------------------------------------------------------ 할 일

    def _todo_tab(self) -> QWidget:
        w = QWidget()
        self.todo_list = QListWidget()
        self.todo_list.itemChanged.connect(self._toggle)
        self.show_done = QCheckBox("끝낸 것도 보기")
        self.show_done.toggled.connect(self._show)
        self.todo_text = QLineEdit()
        self.todo_text.setPlaceholderText("할 일 (예: 이벤트 끝나기 전에 E3 甲 깨기)")
        self.todo_due = QLineEdit()
        self.todo_due.setPlaceholderText("기한 YYYY-MM-DD (선택)")
        self.todo_due.setMaximumWidth(150)
        add = QPushButton("넣기")
        add.clicked.connect(self._add_todo)
        self.todo_text.returnPressed.connect(self._add_todo)
        remove = QPushButton("고른 것 지우기")
        remove.clicked.connect(self._remove_todo)
        row = QHBoxLayout()
        row.addWidget(self.todo_text, 1)
        row.addWidget(self.todo_due)
        row.addWidget(add)
        bottom = QHBoxLayout()
        bottom.addWidget(remove)
        bottom.addStretch(1)
        bottom.addWidget(self.show_done)
        lay = QVBoxLayout(w)
        lay.addWidget(self.todo_list, 1)
        lay.addLayout(row)
        lay.addLayout(bottom)
        return w

    def _add_todo(self) -> None:
        if self.planner.add_todo(self.todo_text.text(), self.todo_due.text()):
            self.todo_text.clear()
            self.todo_due.clear()
            self._show()

    def _remove_todo(self) -> None:
        item = self.todo_list.currentItem()
        if item:
            self.planner.remove_todo(item.data(Qt.ItemDataRole.UserRole))
            self._show()

    def _toggle(self, item: QListWidgetItem) -> None:
        self.planner.set_done(item.data(Qt.ItemDataRole.UserRole), item.checkState() == Qt.CheckState.Checked)

    # ------------------------------------------------------------ 목록

    def _show(self) -> None:
        self.rem_list.clear()
        for r in self.planner.reminders:
            rep = REPEAT_LABEL.get(r.get("repeat", ""), "")
            item = QListWidgetItem(f"{r['when'][5:16].replace('T', ' ')}  {r['text']}" + (f"  ({rep})" if rep else ""))
            item.setData(Qt.ItemDataRole.UserRole, r["id"])
            self.rem_list.addItem(item)
        self.todo_list.blockSignals(True)
        self.todo_list.clear()
        for t in self.planner.todos:
            if t["done"] and not self.show_done.isChecked():
                continue
            item = QListWidgetItem(t["text"] + (f"  (기한 {t['due']})" if t["due"] else ""))
            item.setFlags(item.flags() | Qt.ItemFlag.ItemIsUserCheckable)
            item.setCheckState(Qt.CheckState.Checked if t["done"] else Qt.CheckState.Unchecked)
            item.setData(Qt.ItemDataRole.UserRole, t["id"])
            self.todo_list.addItem(item)
        self.todo_list.blockSignals(False)
