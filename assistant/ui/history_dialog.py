"""대화 기록 창: 다니카가 했던 말(대화·화면 보고 한 말·분석 요약)을 날짜별로 다시 본다. 찾기·복사 가능.

data/logs/날짜.jsonl (대화 원문 기록)을 읽는다. 이 PC 에만 있는 기록이다.
"""

from __future__ import annotations

import html
import json
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (QApplication, QComboBox, QDialog, QHBoxLayout, QLabel, QLineEdit, QPushButton,
                               QTextBrowser, QVBoxLayout)


def read_log(path: Path) -> list[dict]:
    """한 날짜의 기록 → [{"time": "21:30", "who": "주인님"|"다니카"|"다니카(화면)", "text": ...}]"""
    out = []
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return out
    for line in lines:
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        t = str(row.get("time", ""))[11:16]
        if "user" in row:
            user = str(row["user"])
            if not user.startswith("("):  # '(알림: …)' 같은 내부 표시는 주인님 말이 아님
                out.append({"time": t, "who": "주인님", "text": user})
            out.append({"time": t, "who": str(row.get("name") or "다니카"), "text": str(row.get("reply", ""))})
        elif "screen_line" in row:
            out.append({"time": t, "who": f"{row.get('name') or '다니카'}(화면)", "text": str(row["screen_line"])})
    return out


class HistoryDialog(QDialog):
    def __init__(self, logs_dir: Path, parent=None):
        super().__init__(parent)
        self.setWindowTitle("대화 기록")
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        self.resize(620, 680)
        self.logs_dir = logs_dir
        self.days = sorted((p for p in logs_dir.glob("*.jsonl") if len(p.stem) == 10), reverse=True)
        self.day = QComboBox()
        for p in self.days:
            self.day.addItem(p.stem, p)
        self.search = QLineEdit()
        self.search.setPlaceholderText("찾기 (예: 레진, 카톡, 약속)")
        self.only_danika = QPushButton("캐릭터 말만")
        self.only_danika.setCheckable(True)
        top = QHBoxLayout()
        top.addWidget(QLabel("날짜"))
        top.addWidget(self.day)
        top.addWidget(self.search, 1)
        top.addWidget(self.only_danika)
        self.view = QTextBrowser()
        self.count = QLabel("")
        copy, close = QPushButton("복사하기"), QPushButton("닫기")
        copy.clicked.connect(self._copy)
        close.clicked.connect(self.accept)
        bottom = QHBoxLayout()
        bottom.addWidget(self.count, 1)
        bottom.addWidget(copy)
        bottom.addWidget(close)
        lay = QVBoxLayout(self)
        lay.addLayout(top)
        lay.addWidget(self.view, 1)
        lay.addLayout(bottom)
        self.day.currentIndexChanged.connect(self._show)
        self.search.textChanged.connect(self._show)
        self.only_danika.toggled.connect(self._show)
        self._show()

    def entries(self) -> list[dict]:
        path = self.day.currentData()
        rows = read_log(path) if path else []
        q = self.search.text().strip()
        if q:
            rows = [r for r in rows if q in r["text"]]
        if self.only_danika.isChecked():
            rows = [r for r in rows if r["who"] != "주인님"]
        return rows

    def _show(self) -> None:
        rows = self.entries()
        e = html.escape
        def color(who: str) -> str:
            if who == "주인님":
                return "#2a6f97"
            return "#8a5a00" if who.endswith("(화면)") else "#7a3b8f"

        parts = [f"<p style='margin:6px 0'><span style='color:#888'>{e(r['time'])}</span> "
                 f"<b style='color:{color(r['who'])}'>{e(r['who'])}</b><br>{e(r['text'])}</p>" for r in rows]
        self.view.setHtml("".join(parts) or "<p style='color:#888'>기록이 없어요.</p>")
        self.view.verticalScrollBar().setValue(self.view.verticalScrollBar().maximum())  # 최근 것이 보이게
        self.count.setText(f"{len(rows)}개")

    def text(self) -> str:
        return "\n".join(f"{r['time']} {r['who']}: {r['text']}" for r in self.entries())

    def _copy(self) -> None:
        QApplication.clipboard().setText(self.text())
        self.count.setText("복사했어요")
