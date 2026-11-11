"""코인 현황판: 캐릭터마다 코인 잔액을 보고, 주거나 뺏는다 (오갈 때마다 그 캐릭터의 감정이 크게 움직인다)."""

from __future__ import annotations

import time

from PySide6.QtCore import Qt
from PySide6.QtGui import QFont
from PySide6.QtWidgets import (QDialog, QGridLayout, QHBoxLayout, QLabel, QListWidget, QPushButton, QSpinBox,
                               QVBoxLayout)


class CoinBoard(QDialog):
    def __init__(self, profiles: dict[str, str], active: str, bank, on_change, parent=None):
        """profiles: {캐릭터 키: 이름}. on_change(키, 개수): 준 건 +, 뺏은 건 -."""
        super().__init__(parent)
        self.setWindowTitle("코인 현황판")
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint, True)
        self.profiles, self.active, self.bank, self.on_change = profiles, active, bank, on_change
        self.setMinimumWidth(420)
        root = QVBoxLayout(self)

        top = QHBoxLayout()
        top.addWidget(QLabel("한 번에"))
        self.amount = QSpinBox()
        self.amount.setRange(1, 1000)
        self.amount.setValue(1)
        self.amount.setSuffix(" 개")
        top.addWidget(self.amount)
        top.addStretch(1)
        root.addLayout(top)

        grid = QGridLayout()
        big = QFont()
        big.setPointSize(18)
        big.setBold(True)
        self.counts: dict[str, QLabel] = {}
        for row, (key, name) in enumerate(profiles.items()):
            label = QLabel(name + ("  (지금)" if key == active else ""))
            if key == active:
                f = label.font()
                f.setBold(True)
                label.setFont(f)
            count = QLabel()
            count.setFont(big)
            count.setAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            self.counts[key] = count
            give = QPushButton("주기")
            take = QPushButton("뺏기")
            give.clicked.connect(lambda _=False, k=key: self._move(k, +1))
            take.clicked.connect(lambda _=False, k=key: self._move(k, -1))
            grid.addWidget(label, row, 0)
            grid.addWidget(count, row, 1)
            grid.addWidget(give, row, 2)
            grid.addWidget(take, row, 3)
        grid.setColumnStretch(1, 1)
        root.addLayout(grid)

        hint = QLabel("지금 나와 있는 캐릭터는 바로 반응해요. 자리에 없는 캐릭터는 다음에 나왔을 때 알게 돼요.")
        hint.setWordWrap(True)
        hint.setStyleSheet("color: gray;")
        root.addWidget(hint)
        root.addWidget(QLabel("최근에 오간 코인"))
        self.log = QListWidget()
        self.log.setMinimumHeight(160)
        root.addWidget(self.log)
        close = QPushButton("닫기")
        close.clicked.connect(self.close)
        root.addWidget(close, alignment=Qt.AlignmentFlag.AlignRight)
        self.refresh()

    def _move(self, key: str, sign: int) -> None:
        self.on_change(key, sign * self.amount.value())
        self.refresh()

    def refresh(self) -> None:
        for key, label in self.counts.items():
            label.setText(f"{self.bank.balance(key):,} 코인")
        self.log.clear()
        how_ko = {"board": "현황판", "chat": "대화"}
        for r in self.bank.history(limit=40):
            name = self.profiles.get(r.get("who", ""), r.get("who", ""))
            when = time.strftime("%m/%d %H:%M", time.localtime(r.get("t", 0)))
            d = int(r.get("delta", 0))
            self.log.addItem(f"{when}  {name}  {'+' if d > 0 else '−'}{abs(d):,}  ({how_ko.get(r.get('how'), r.get('how'))}) "
                             f"→ {int(r.get('balance', 0)):,}개")
