"""화면 기억: 바뀐 화면을 날짜별로 이 PC 에 쌓아 둔다 (data/screens/YYYY-MM-DD/).

- 장면(jpg)과 함께 일지(index.jsonl)에 시각·모드·창 제목·판단 담당이 본 상황·그때 다니카가 한 말을 적는다.
- "아까 3시쯤 뭐 했지?" 같은 질문에 그 시간대 일지(와 가까운 화면)를 꺼내 주고, '지난 10분 복기'에 쓴다.
- 보관 기간·최대 용량을 넘으면 오래된 날짜부터 지운다. 사진은 다시 볼 때만 AI 에게 보내진다.
"""

from __future__ import annotations

import json
import logging
import re
import shutil
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

log = logging.getLogger("assistant.screens")


@dataclass
class Entry:
    time: datetime
    file: Path | None
    mode: str = ""
    title: str = ""
    situation: str = ""
    said: str = ""

    def line(self) -> str:
        text = f"{self.time:%H:%M} [{self.mode}] {self.situation or self.title}"
        return text + (f" (내가 한 말: {self.said})" if self.said else "")


class ScreenLog:
    def __init__(self, folder: Path, keep_days: int = 180, max_gb: float = 100.0, enabled: bool = True):
        self.folder = folder
        self.keep_days = keep_days
        self.max_gb = max_gb
        self.enabled = enabled
        self._lock = threading.Lock()
        self._last: tuple[Path, str] | None = None  # (일지 파일, 마지막 장면 이름)

    # ------------------------------------------------------------ 쌓기

    def save(self, jpeg: bytes, when: datetime, mode: str = "", title: str = "", situation: str = "",
             seq: bytes | None = None) -> Path | None:
        """seq: 촘촘히 보기의 '지난 몇 초 흐름' 모음 사진 (있으면 같은 이름 _seq.jpg 로 함께)."""
        if not self.enabled:
            return None
        day = self.folder / f"{when:%Y-%m-%d}"
        name = f"{when:%H%M%S}_{when.microsecond // 1000:03d}.jpg"
        with self._lock:
            day.mkdir(parents=True, exist_ok=True)
            (day / name).write_bytes(jpeg)
            row = {"time": when.isoformat(timespec="seconds"), "file": name, "mode": mode,
                   "title": title[:120], "situation": situation[:300]}
            if seq:
                (day / name.replace(".jpg", "_seq.jpg")).write_bytes(seq)
                row["seq"] = name.replace(".jpg", "_seq.jpg")
            self._append(day, row)
            self._last = (day, name)
        return day / name

    def note(self, situation: str = "", said: str = "") -> None:
        """방금 저장한 장면에 판단 내용이나 다니카가 한 말을 덧붙인다."""
        if not self.enabled or not self._last:
            return
        day, name = self._last
        with self._lock:
            self._append(day, {"note_for": name, "situation": situation[:300], "said": said[:300]})

    @staticmethod
    def _append(day: Path, row: dict) -> None:
        with open(day / "index.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    # ------------------------------------------------------------ 꺼내기

    def entries(self, start: datetime, end: datetime) -> list[Entry]:
        out: list[Entry] = []
        day = start.date()
        while day <= end.date():
            out += [e for e in self._read_day(self.folder / day.isoformat()) if start <= e.time <= end]
            day += timedelta(days=1)
        return out

    def _read_day(self, day: Path) -> list[Entry]:
        try:
            lines = (day / "index.jsonl").read_text(encoding="utf-8").splitlines()
        except OSError:
            return []
        by_name: dict[str, Entry] = {}
        for line in lines:
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if "note_for" in row:
                e = by_name.get(row["note_for"])
                if e:
                    e.situation = row.get("situation") or e.situation
                    e.said = row.get("said") or e.said
                continue
            try:
                t = datetime.fromisoformat(row["time"])
            except (KeyError, ValueError):
                continue
            f = day / row["file"] if row.get("file") else None
            by_name[row.get("file", str(t))] = Entry(t, f if f and f.is_file() else None, row.get("mode", ""),
                                                    row.get("title", ""), row.get("situation", ""), row.get("said", ""))
        return sorted(by_name.values(), key=lambda e: e.time)

    def diary(self, start: datetime, end: datetime, max_lines: int = 40) -> str:
        """그 시간대 일지를 글로 (같은 상황이 이어지면 하나로)."""
        lines, last = [], None
        for e in self.entries(start, end):
            key = (e.mode, e.situation or e.title)
            if key == last and not e.said:
                continue
            last = key
            lines.append(e.line())
        if len(lines) > max_lines:  # 너무 많으면 고르게 줄임 (다니카가 한 말은 남김)
            keep = [l for l in lines if "내가 한 말" in l]
            step = max(1, len(lines) // max(1, max_lines - len(keep)))
            lines = sorted(set(lines[::step] + keep), key=lines.index)[:max_lines]
        return "\n".join(lines)

    def nearest(self, when: datetime, count: int = 2, within_minutes: int = 20) -> list[Entry]:
        near = [e for e in self.entries(when - timedelta(minutes=within_minutes), when + timedelta(minutes=within_minutes))
                if e.file]
        return sorted(near, key=lambda e: abs((e.time - when).total_seconds()))[:count]

    # ------------------------------------------------------------ 정리

    def cleanup(self, now: datetime | None = None) -> int:
        """보관 기간이 지난 날짜, 그리고 최대 용량을 넘는 만큼 오래된 날짜부터 지운다. 지운 날짜 수."""
        now = now or datetime.now()
        if not self.folder.is_dir():
            return 0
        days = sorted(d for d in self.folder.iterdir() if d.is_dir() and re.fullmatch(r"\d{4}-\d{2}-\d{2}", d.name))
        removed = 0
        cutoff = (now - timedelta(days=self.keep_days)).date().isoformat()
        for d in list(days):
            if d.name < cutoff:
                shutil.rmtree(d, ignore_errors=True)
                days.remove(d)
                removed += 1
        sizes = {d: sum(f.stat().st_size for f in d.iterdir() if f.is_file()) for d in days}
        total = sum(sizes.values())
        limit = self.max_gb * 1024 ** 3
        for d in days[:-1]:  # 오늘 것은 남긴다
            if total <= limit:
                break
            shutil.rmtree(d, ignore_errors=True)
            total -= sizes[d]
            removed += 1
        if removed:
            log.info("화면 기억 정리: 날짜 %d개 지움", removed)
        return removed

    def size_gb(self) -> float:
        if not self.folder.is_dir():
            return 0.0
        return sum(f.stat().st_size for f in self.folder.rglob("*") if f.is_file()) / 1024 ** 3


# ---------------------------------------------------------------- 대화 속 시간 표현

TIME_WORDS = re.compile(r"아까|방금|어제|그저께|그제|오늘|그때|그 화면|그 장면|전에|몇 시|\d{1,2}\s*시")


def recall_window(text: str, now: datetime) -> tuple[datetime, datetime, datetime | None] | None:
    """대화에서 '언제 화면'을 묻는지 읽는다. (시작, 끝, 콕 집은 시각) 또는 None."""
    if not TIME_WORDS.search(text):
        return None
    day = now.date()
    if "그저께" in text or "그제" in text:
        day = day - timedelta(days=2)
    elif "어제" in text:
        day = day - timedelta(days=1)
    m = re.search(r"(오전|오후|아침|낮|저녁|밤|새벽)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분|\s*반)?", text)
    if m:
        hour = int(m.group(2)) % 24
        if m.group(1) in ("오후", "저녁", "밤") and hour < 12:
            hour += 12
        elif m.group(1) is None and day == now.date() and hour < 12 and hour + 12 <= now.hour:
            hour += 12  # '3시' 라고만 하면 오늘 이미 지난 오후 3시로
        minute = int(m.group(3)) if m.group(3) else (30 if "반" in m.group(0) else 0)
        at = datetime.combine(day, datetime.min.time()).replace(hour=hour, minute=minute)
        return at - timedelta(minutes=30), at + timedelta(minutes=30), at
    if day != now.date():
        start = datetime.combine(day, datetime.min.time())
        return start, start + timedelta(days=1), None
    return now - timedelta(hours=3), now, None
