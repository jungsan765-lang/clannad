"""파일 정리 미리보기: 다니카가 만든 정리안을 보고, 체크한 것만 옮긴다 (전부 한국어)."""

from __future__ import annotations

from collections import Counter

import charname
from PySide6.QtCore import Qt
from PySide6.QtWidgets import (QAbstractItemView, QDialog, QHBoxLayout, QHeaderView, QLabel, QPushButton,
                               QTableWidget, QTableWidgetItem, QVBoxLayout)

from organizer import Move, clean_folder_name


class OrganizeDialog(QDialog):
    def __init__(self, folder_label: str, summary: str, moves: list[Move], total_files: int, parent=None):
        super().__init__(parent)
        self.setWindowTitle("파일 정리 미리보기")
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        self.resize(760, 560)
        self.moves = moves

        head = QLabel(f"<b>{folder_label}</b> 폴더 · 파일 {total_files}개 중 {len(moves)}개를 옮기려고 해요.")
        say = QLabel(f"{charname.name()}: {summary}" if summary else "")
        say.setWordWrap(True)
        groups = Counter(m.folder for m in moves)
        sums = QLabel("  ·  ".join(f"{name} {n}개" for name, n in groups.most_common()))
        sums.setWordWrap(True)
        note = QLabel("지우는 건 없어요. 같은 이름이 있으면 덮어쓰지 않고 번호를 붙여요. "
                      "새 폴더 이름은 칸을 두 번 눌러 바꿀 수 있고, 메뉴의 '마지막 정리 되돌리기'로 원래대로 돌릴 수 있어요.")
        note.setWordWrap(True)
        note.setStyleSheet("color: #555;")

        self.table = QTableWidget(len(moves), 3)
        self.table.setHorizontalHeaderLabels(["파일", "옮길 폴더", "이유"])
        self.table.verticalHeader().setVisible(False)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.NoSelection)
        h = self.table.horizontalHeader()
        h.setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        h.setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        h.setSectionResizeMode(2, QHeaderView.ResizeMode.ResizeToContents)
        for row, m in enumerate(moves):
            name = QTableWidgetItem(m.file)
            name.setFlags(Qt.ItemFlag.ItemIsEnabled | Qt.ItemFlag.ItemIsUserCheckable)
            name.setCheckState(Qt.CheckState.Checked)
            folder = QTableWidgetItem(m.folder)
            folder.setFlags(Qt.ItemFlag.ItemIsEnabled | Qt.ItemFlag.ItemIsEditable)
            reason = QTableWidgetItem(m.reason)
            reason.setFlags(Qt.ItemFlag.ItemIsEnabled)
            self.table.setItem(row, 0, name)
            self.table.setItem(row, 1, folder)
            self.table.setItem(row, 2, reason)
        self.table.itemChanged.connect(lambda _: self._count())

        all_on = QPushButton("모두 체크")
        all_off = QPushButton("모두 해제")
        all_on.clicked.connect(lambda: self._check_all(True))
        all_off.clicked.connect(lambda: self._check_all(False))
        self.go = QPushButton()
        self.go.setDefault(True)
        cancel = QPushButton("취소")
        self.go.clicked.connect(self.accept)
        cancel.clicked.connect(self.reject)
        row = QHBoxLayout()
        row.addWidget(all_on)
        row.addWidget(all_off)
        row.addStretch(1)
        row.addWidget(self.go)
        row.addWidget(cancel)

        lay = QVBoxLayout(self)
        for w in (head, say, sums, note):
            lay.addWidget(w)
        lay.addWidget(self.table, 1)
        lay.addLayout(row)
        self._count()

    def _check_all(self, on: bool) -> None:
        state = Qt.CheckState.Checked if on else Qt.CheckState.Unchecked
        for r in range(self.table.rowCount()):
            self.table.item(r, 0).setCheckState(state)

    def _count(self) -> None:
        n = len(self.selected_moves())
        self.go.setText(f"체크한 {n}개 옮기기")
        self.go.setEnabled(n > 0)

    def selected_moves(self) -> list[Move]:
        out = []
        for r, m in enumerate(self.moves):
            if self.table.item(r, 0).checkState() != Qt.CheckState.Checked:
                continue
            folder = clean_folder_name(self.table.item(r, 1).text()) or m.folder
            out.append(Move(m.file, folder, m.reason))
        return out
