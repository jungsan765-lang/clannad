"""기억 창: 다니카가 기억하는 것을 보고·고치고, 예전 일을 직접 찾아본다.

탭: 기억(늘 보는 것) · 보관된 기억 · 찾아보기(대화·화면·분석·일기 전부) · 일기
"""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtGui import QPixmap
from PySide6.QtWidgets import (QAbstractItemView, QComboBox, QDialog, QHBoxLayout, QInputDialog, QLabel, QLineEdit,
                               QListWidget, QListWidgetItem, QPushButton, QSplitter, QTableWidget, QTableWidgetItem,
                               QTabWidget, QTextBrowser, QVBoxLayout, QWidget)

from memory import CATEGORIES
from recall import KIND_LABEL, cues

STARS = {1: "☆", 2: "★", 3: "★★★"}


class MemoryDialog(QDialog):
    def __init__(self, memory, index=None, diary_dir: Path | None = None, parent=None):
        super().__init__(parent)
        self.memory = memory
        self.index = index
        self.diary_dir = diary_dir
        self.setWindowTitle("다니카의 기억")
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        self.resize(820, 600)
        self.tabs = QTabWidget()
        self.tabs.addTab(self._facts_tab(), "기억")
        self.tabs.addTab(self._pinned_tab(), "꼭 기억할 것·찾아본 것")
        self.tabs.addTab(self._archive_tab(), "보관된 기억")
        self.tabs.addTab(self._search_tab(), "찾아보기")
        self.tabs.addTab(self._diary_tab(), "일기")
        close = QPushButton("닫기")
        close.clicked.connect(self.accept)
        lay = QVBoxLayout(self)
        info = QLabel("★★★ = 절대 잊지 않음(늘 기억), ★ = 보통(최근 것부터 늘 기억), ☆ = 사소함(관련 있을 때만). "
                      "보관된 기억도 지워지지 않고, 관련 있으면 떠올려요." + (f"  · 정리 대기 중인 대화 {len(memory.pending)}개"
                                                                          if memory.pending else ""))
        info.setWordWrap(True)
        lay.addWidget(info)
        lay.addWidget(self.tabs, 1)
        lay.addWidget(close, 0, Qt.AlignmentFlag.AlignRight)
        self.refresh()

    # ------------------------------------------------------------ 기억 (늘 보는 것)

    def _facts_tab(self) -> QWidget:
        w = QWidget()
        self.table = QTableWidget(0, 5)
        self.table.setHorizontalHeaderLabels(["중요도", "분류", "내용", "날짜", "대상"])
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.horizontalHeader().setStretchLastSection(False)
        self.table.setColumnWidth(0, 60)
        self.table.setColumnWidth(1, 90)
        self.table.setColumnWidth(2, 430)
        self.table.setColumnWidth(3, 90)
        buttons = QHBoxLayout()
        for label, slot in (("중요도 ↑", lambda: self._bump(1)), ("중요도 ↓", lambda: self._bump(-1)),
                            ("고치기", self._edit), ("보관", self._archive), ("지우기", self._delete)):
            b = QPushButton(label)
            b.clicked.connect(slot)
            buttons.addWidget(b)
        buttons.addStretch(1)
        self.new_cat = QComboBox()
        self.new_cat.addItems(CATEGORIES)
        self.new_text = QLineEdit()
        self.new_text.setPlaceholderText("직접 적기 (예: 주인님은 오이를 싫어한다)")
        self.new_imp = QComboBox()
        for n in (3, 2, 1):
            self.new_imp.addItem(STARS[n], n)
        self.new_imp.setCurrentIndex(1)
        add = QPushButton("적기")
        add.clicked.connect(self._add)
        self.new_text.returnPressed.connect(self._add)
        row = QHBoxLayout()
        row.addWidget(self.new_cat)
        row.addWidget(self.new_text, 1)
        row.addWidget(self.new_imp)
        row.addWidget(add)
        lay = QVBoxLayout(w)
        lay.addWidget(self.table, 1)
        lay.addLayout(buttons)
        lay.addLayout(row)
        return w

    def _selected_id(self) -> str | None:
        rows = self.table.selectionModel().selectedRows() if self.table.selectionModel() else []
        if not rows:
            return None
        return self.table.item(rows[0].row(), 0).data(Qt.ItemDataRole.UserRole)

    def _bump(self, d: int) -> None:
        fid = self._selected_id()
        f = self.memory.fact(fid) if fid else None
        if f:
            self.memory.update_fact(fid, importance=max(1, min(3, f["importance"] + d)))
            self.refresh(select=fid)

    def _edit(self) -> None:
        fid = self._selected_id()
        f = self.memory.fact(fid) if fid else None
        if not f:
            return
        text, ok = QInputDialog.getText(self, "기억 고치기", "내용", text=f["text"])
        if ok and text.strip():
            self.memory.update_fact(fid, text=text.strip())
            self.refresh(select=fid)

    def _archive(self) -> None:
        fid = self._selected_id()
        if fid:
            self.memory.archive_fact(fid, force=True)
            self.refresh()

    def _delete(self) -> None:
        fid = self._selected_id()
        if fid:
            self.memory.delete_fact(fid)
            self.refresh()

    def _add(self) -> None:
        text = self.new_text.text().strip()
        if text and self.memory.add_fact(self.new_cat.currentText(), text, self.new_imp.currentData(), source="manual"):
            self.new_text.clear()
            self.refresh()

    # ------------------------------------------------------------ 꼭 기억할 것 (고정) · 찾아본 것

    def _pinned_tab(self) -> QWidget:
        w = QWidget()
        self.pinned = QListWidget()
        unpin = QPushButton("고정 풀기")
        unpin.clicked.connect(self._unpin)
        self.pin_text = QLineEdit()
        self.pin_text.setPlaceholderText("늘 기억할 것 직접 적기 (예: 주인님 생일은 3월 2일)")
        pin = QPushButton("고정")
        pin.clicked.connect(self._pin)
        self.pin_text.returnPressed.connect(self._pin)
        self.knowledge = QListWidget()
        forget = QPushButton("고른 찾아본 것 지우기")
        forget.clicked.connect(self._forget_knowledge)
        row = QHBoxLayout()
        row.addWidget(self.pin_text, 1)
        row.addWidget(pin)
        row.addWidget(unpin)
        lay = QVBoxLayout(w)
        lay.addWidget(QLabel("꼭 기억할 것 ('고정해'라고 한 것 — 정리해도 안 지워지고 늘 기억)"))
        lay.addWidget(self.pinned, 1)
        lay.addLayout(row)
        lay.addWidget(QLabel("찾아보고 알게 된 것 (검색 결과, 최근 것부터)"))
        lay.addWidget(self.knowledge, 1)
        lay.addWidget(forget, 0, Qt.AlignmentFlag.AlignLeft)
        return w

    def _pin(self) -> None:
        if self.memory.add_pinned(self.pin_text.text()):
            self.pin_text.clear()
            self.refresh()

    def _unpin(self) -> None:
        item = self.pinned.currentItem()
        if item:
            self.memory.remove_pinned(item.text())
            self.refresh()

    def _forget_knowledge(self) -> None:
        item = self.knowledge.currentItem()
        if item:
            self.memory.remove_knowledge(item.data(Qt.ItemDataRole.UserRole))
            self.refresh()

    # ------------------------------------------------------------ 보관된 기억

    def _archive_tab(self) -> QWidget:
        w = QWidget()
        self.archived = QListWidget()
        restore = QPushButton("다시 꺼내기 (늘 기억으로)")
        restore.clicked.connect(self._restore)
        delete = QPushButton("완전히 지우기")
        delete.clicked.connect(self._delete_archived)
        row = QHBoxLayout()
        row.addWidget(restore)
        row.addWidget(delete)
        row.addStretch(1)
        lay = QVBoxLayout(w)
        lay.addWidget(self.archived, 1)
        lay.addLayout(row)
        return w

    def _restore(self) -> None:
        item = self.archived.currentItem()
        if item:
            self.memory.update_fact(item.data(Qt.ItemDataRole.UserRole))
            self.refresh()

    def _delete_archived(self) -> None:
        item = self.archived.currentItem()
        if item:
            self.memory.delete_fact(item.data(Qt.ItemDataRole.UserRole))
            self.refresh()

    # ------------------------------------------------------------ 찾아보기

    def _search_tab(self) -> QWidget:
        w = QWidget()
        self.query = QLineEdit()
        self.query.setPlaceholderText("예: 민지, 카일록, 홍대, '그 퀘스트 이름' — 대화·화면·분석·일기·기억 전부에서 찾아요")
        go = QPushButton("찾기")
        go.clicked.connect(self.search)
        self.query.returnPressed.connect(self.search)
        top = QHBoxLayout()
        top.addWidget(self.query, 1)
        top.addWidget(go)
        self.results = QListWidget()
        self.results.currentItemChanged.connect(self._show_result)
        self.detail = QTextBrowser()
        self.preview = QLabel()
        self.preview.setAlignment(Qt.AlignmentFlag.AlignCenter)
        right = QWidget()
        rl = QVBoxLayout(right)
        rl.setContentsMargins(0, 0, 0, 0)
        rl.addWidget(self.detail, 1)
        rl.addWidget(self.preview)
        split = QSplitter()
        split.addWidget(self.results)
        split.addWidget(right)
        split.setSizes([360, 440])
        lay = QVBoxLayout(w)
        lay.addLayout(top)
        lay.addWidget(split, 1)
        return w

    def search(self) -> list:
        q = self.query.text().strip()
        self.results.clear()
        if not q:
            return []
        words = cues(q) or [q]
        found = []
        for f in self.memory.relevant_facts(words, limit=20, skip_core=False):
            found.append(("fact", f.get("date", ""), f"[기억·{f['category']}] {f['text']}", f["text"], ""))
        if self.index is not None:
            for e in self.index.search(words, limit=40):
                text = e.text + (f"\n\n{e.detail}" if e.detail else "")
                found.append((e.kind, e.time, f"[{KIND_LABEL.get(e.kind, e.kind)}] {e.when()} {e.text[:60]}", text, e.ref))
        for kind, when, label, text, ref in found:
            item = QListWidgetItem(label.replace("\n", " "))
            item.setData(Qt.ItemDataRole.UserRole, (text, ref, when))
            self.results.addItem(item)
        if not found:
            self.results.addItem("찾은 게 없어요.")
        return found

    def _show_result(self, item) -> None:
        data = item.data(Qt.ItemDataRole.UserRole) if item else None
        if not data:
            return
        text, ref, when = data
        self.detail.setPlainText(f"{when}\n\n{text}")
        if ref and Path(ref).is_file():
            pix = QPixmap(ref)
            self.preview.setPixmap(pix.scaledToWidth(420, Qt.TransformationMode.SmoothTransformation) if not pix.isNull()
                                   else QPixmap())
        else:
            self.preview.clear()

    # ------------------------------------------------------------ 일기

    def _diary_tab(self) -> QWidget:
        w = QWidget()
        self.days = QListWidget()
        self.days.currentItemChanged.connect(self._show_day)
        self.day_text = QTextBrowser()
        split = QSplitter()
        split.addWidget(self.days)
        split.addWidget(self.day_text)
        split.setSizes([160, 640])
        lay = QVBoxLayout(w)
        lay.addWidget(split, 1)
        return w

    def _show_day(self, item) -> None:
        path = item.data(Qt.ItemDataRole.UserRole) if item else None
        if path:
            try:
                self.day_text.setMarkdown(Path(path).read_text(encoding="utf-8"))
            except OSError:
                self.day_text.setPlainText("읽지 못했어요.")

    # ------------------------------------------------------------ 목록 새로고침

    def refresh(self, select: str | None = None) -> None:
        facts = sorted(self.memory.active_facts(),
                       key=lambda f: (CATEGORIES.index(f["category"]) if f["category"] in CATEGORIES else 99,
                                      -f["importance"], f.get("date", "")))
        self.table.setRowCount(len(facts))
        for r, f in enumerate(facts):
            cells = [STARS.get(f["importance"], "★"), f["category"], f["text"], f.get("date", ""), f.get("subject", "")]
            for c, value in enumerate(cells):
                item = QTableWidgetItem(value)
                if c == 0:
                    item.setData(Qt.ItemDataRole.UserRole, f["id"])
                self.table.setItem(r, c, item)
            if f["id"] == select:
                self.table.selectRow(r)
        self.pinned.clear()
        for text in self.memory.pinned:
            self.pinned.addItem(text)
        self.knowledge.clear()
        for k in reversed(self.memory.knowledge):
            item = QListWidgetItem(f"{k.get('date', '')} {k['query']}")
            item.setData(Qt.ItemDataRole.UserRole, k["query"])
            self.knowledge.addItem(item)
        self.archived.clear()
        for f in sorted(self.memory.archived_facts(), key=lambda f: f.get("archived", ""), reverse=True):
            item = QListWidgetItem(f"{f.get('date', '')} [{f['category']}] {f['text']}  (보관 {f.get('archived', '')})")
            item.setData(Qt.ItemDataRole.UserRole, f["id"])
            self.archived.addItem(item)
        self.days.clear()
        if self.diary_dir and self.diary_dir.is_dir():
            files = list(self.diary_dir.glob("????-??-??.md")) + list(self.diary_dir.glob("week-????-??-??.md"))
            for p in sorted(files, key=lambda p: p.stem.replace("week-", "") + ("~" if p.stem.startswith("week") else ""),
                            reverse=True):
                item = QListWidgetItem(("한 주 · " + p.stem[5:]) if p.stem.startswith("week-") else p.stem)
                item.setData(Qt.ItemDataRole.UserRole, str(p))
                self.days.addItem(item)
