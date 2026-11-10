"""알림(타이머·알람·리마인더)과 할 일 목록. 이 PC 의 data/planner.json 에만 저장.

- 알림: 정한 시각이 되면 다니카가 말해 준다. 반복(매일·매주) 가능. 꺼져 있던 동안 지난 알림은 켜질 때 알려 준다.
- 할 일: 적어 두면 대화·브리핑에서 챙겨 준다. 끝냈다고 하면 지운다(완료 표시).
"""

from __future__ import annotations

import json
import re
import threading
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Callable

REPEATS = {"": "", "없음": "", "매일": "daily", "daily": "daily", "매주": "weekly", "weekly": "weekly"}
REPEAT_LABEL = {"": "", "daily": "매일", "weekly": "매주"}


def parse_when(text: str, now: datetime) -> datetime | None:
    """'2026-11-10 23:00' / '23:00' / '30분 뒤' / '1시간 30분 후' / '내일 9:00' → 시각."""
    t = (text or "").strip()
    m = re.search(r"(\d{4})[-./](\d{1,2})[-./](\d{1,2})\D+(\d{1,2}):(\d{2})", t)
    if m:
        y, mo, d, h, mi = map(int, m.groups())
        try:
            return datetime(y, mo, d, h, mi)
        except ValueError:
            return None
    rel = re.findall(r"(\d+)\s*(시간|분|초)", t)
    if rel and re.search(r"뒤|후|있다가|이따", t):
        secs = sum(int(n) * {"시간": 3600, "분": 60, "초": 1}[u] for n, u in rel)
        return now + timedelta(seconds=secs)
    m = re.search(r"(\d{1,2}):(\d{2})", t)
    if m:
        h, mi = int(m.group(1)), int(m.group(2))
        if h > 23 or mi > 59:
            return None
        day = now.date() + timedelta(days=1 if "내일" in t else 2 if "모레" in t else 0)
        at = datetime.combine(day, datetime.min.time()).replace(hour=h, minute=mi)
        if at <= now and "내일" not in t and "모레" not in t:
            at += timedelta(days=1)  # 이미 지난 시각이면 내일
        return at
    return None


class Planner:
    def __init__(self, folder: Path, clock: Callable[[], datetime] = datetime.now):
        self.path = folder / "planner.json"
        self.clock = clock
        self._lock = threading.Lock()
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            data = {}
        self.reminders: list[dict] = list(data.get("reminders", []))
        self.todos: list[dict] = list(data.get("todos", []))

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps({"reminders": self.reminders, "todos": self.todos}, ensure_ascii=False, indent=1),
                       encoding="utf-8")
        tmp.replace(self.path)

    # ------------------------------------------------------------ 알림

    def add_reminder(self, when: datetime, text: str, repeat: str = "") -> dict:
        r = {"id": uuid.uuid4().hex[:8], "when": when.isoformat(timespec="minutes"), "text": " ".join(text.split())[:200],
             "repeat": REPEATS.get(repeat.strip(), "")}
        with self._lock:
            self.reminders.append(r)
            self.reminders.sort(key=lambda x: x["when"])
            self._save()
        return r

    def add_from_target(self, target: str) -> dict | None:
        """대화 action 의 target: '2026-11-10 23:00 | 자라고 말하기 | 매일'."""
        parts = [p.strip() for p in (target or "").split("|")]
        if len(parts) < 2 or not parts[1]:
            return None
        when = parse_when(parts[0], self.clock())
        if when is None:
            return None
        return self.add_reminder(when, parts[1], parts[2] if len(parts) > 2 else "")

    def remove_reminder(self, rid: str) -> None:
        with self._lock:
            self.reminders = [r for r in self.reminders if r["id"] != rid]
            self._save()

    def cancel(self, text: str) -> list[dict]:
        """'레진 알림 취소' → 내용에 그 말이 들어간 알림을 지운다."""
        words = [w for w in re.split(r"\s+", text or "") if len(w) >= 2 and w not in ("알림", "취소", "알람")]
        hit = [r for r in self.reminders if words and all(w in r["text"] for w in words)]
        for r in hit:
            self.remove_reminder(r["id"])
        return hit

    def due(self) -> list[dict]:
        """지금 알릴 것들. 한 번짜리는 지우고, 반복은 다음 시각으로 넘긴다."""
        now = self.clock()
        fired = []
        with self._lock:
            keep = []
            for r in self.reminders:
                when = datetime.fromisoformat(r["when"])
                if when > now:
                    keep.append(r)
                    continue
                fired.append(dict(r, late_minutes=int((now - when).total_seconds() // 60)))
                if r.get("repeat"):
                    step = timedelta(days=1 if r["repeat"] == "daily" else 7)
                    while when <= now:
                        when += step
                    keep.append(dict(r, when=when.isoformat(timespec="minutes")))
            if fired:
                self.reminders = sorted(keep, key=lambda x: x["when"])
                self._save()
        return fired

    # ------------------------------------------------------------ 할 일

    def add_todo(self, text: str, due: str = "") -> dict | None:
        text = " ".join((text or "").split())[:200]
        if not text or any(t["text"] == text and not t["done"] for t in self.todos):
            return None
        due = due.strip()
        if due and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", due):
            when = parse_when(due + " 00:00", self.clock()) if re.search(r"\d", due) else None
            due = when.date().isoformat() if when else ""
        t = {"id": uuid.uuid4().hex[:8], "text": text, "due": due, "done": False,
             "created": self.clock().date().isoformat()}
        with self._lock:
            self.todos.append(t)
            self._save()
        return t

    def add_todo_from_target(self, target: str) -> dict | None:
        parts = [p.strip() for p in (target or "").split("|")]
        return self.add_todo(parts[0], parts[1] if len(parts) > 1 else "")

    def done_todo(self, text: str) -> dict | None:
        """끝낸 할 일 (내용이 정확히 같거나, 말에 들어간 것)."""
        text = (text or "").strip()
        open_ = [t for t in self.todos if not t["done"]]
        hit = next((t for t in open_ if t["text"] == text), None) or next(
            (t for t in open_ if text and (text in t["text"] or t["text"] in text)), None)
        if hit:
            with self._lock:
                hit["done"] = True
                hit["done_date"] = self.clock().date().isoformat()
                self._save()
        return hit

    def set_done(self, tid: str, done: bool) -> None:
        with self._lock:
            for t in self.todos:
                if t["id"] == tid:
                    t["done"] = done
            self._save()

    def remove_todo(self, tid: str) -> None:
        with self._lock:
            self.todos = [t for t in self.todos if t["id"] != tid]
            self._save()

    def open_todos(self) -> list[dict]:
        return [t for t in self.todos if not t["done"]]

    # ------------------------------------------------------------ 다니카에게

    def prompt_text(self) -> str:
        """대화 프롬프트용 (바뀔 때만 달라져서 캐시가 유지된다)."""
        lines = []
        for r in self.reminders[:15]:
            rep = REPEAT_LABEL.get(r.get("repeat", ""), "")
            lines.append(f"- [알림] {r['when'].replace('T', ' ')} {r['text']}" + (f" ({rep})" if rep else ""))
        for t in self.open_todos()[:20]:
            lines.append(f"- [할 일] {t['text']}" + (f" (기한 {t['due']})" if t["due"] else ""))
        return ("# 주인님 알림·할 일 (네가 챙겨 준다)\n" + "\n".join(lines)) if lines else ""

    def today_text(self, today: date | None = None) -> str:
        """브리핑용: 오늘 남은 알림, 기한이 가까운 할 일."""
        today = today or self.clock().date()
        rem = [r for r in self.reminders if r["when"][:10] == today.isoformat()]
        soon = [t for t in self.open_todos() if t["due"] and t["due"] <= (today + timedelta(days=2)).isoformat()]
        parts = []
        if rem:
            parts.append("오늘 알림: " + ", ".join(f"{r['when'][11:16]} {r['text']}" for r in rem))
        if soon:
            parts.append("기한 가까운 할 일: " + ", ".join(f"{t['text']}({t['due'][5:]})" for t in soon))
        elif self.open_todos():
            parts.append(f"할 일 {len(self.open_todos())}개 남음")
        return " / ".join(parts)
