"""대화 기억.

- 최근 대화: data/recent.json (프로그램을 껐다 켜도 이어짐)
- 장기기억: data/memory.json — 캐릭터가 스스로 읽기 편한 짧은 한국어 메모들
- 대화 원문: data/logs/날짜.jsonl (PC에만 보관)
"""

from __future__ import annotations

import json
import threading
from datetime import date, datetime
from pathlib import Path

CATEGORIES = ["주인님 정보", "취향", "약속·할 일", "최근 있었던 일", "관계·호칭"]
RECENT_KEEP = 60  # 디스크에 남겨두는 최근 대화 줄 수


class Memory:
    def __init__(self, folder: Path):
        self.folder = folder
        self.folder.mkdir(parents=True, exist_ok=True)
        (self.folder / "logs").mkdir(exist_ok=True)
        self._lock = threading.Lock()
        self.recent: list[dict] = self._read("recent.json", [])
        mem = self._read("memory.json", {})
        self.facts: list[dict] = mem.get("facts", [])
        self.updated: str | None = mem.get("updated")
        self.pending: list[dict] = mem.get("pending", [])  # 아직 장기기억에 반영 안 된 대화

    # ------------------------------------------------------------ 저장

    def _read(self, name: str, default):
        try:
            return json.loads((self.folder / name).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return default

    def _write(self, name: str, value) -> None:
        tmp = self.folder / (name + ".tmp")
        tmp.write_text(json.dumps(value, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(self.folder / name)

    def _save(self) -> None:
        self._write("recent.json", self.recent[-RECENT_KEEP:])
        self._write("memory.json", {"facts": self.facts, "updated": self.updated, "pending": self.pending})

    # ------------------------------------------------------------ 대화

    def add_turn(self, user_text: str, reply_text: str, when: datetime | None = None) -> None:
        when = when or datetime.now()
        stamp = when.isoformat(timespec="seconds")
        with self._lock:
            self.recent += [{"role": "user", "text": user_text, "time": stamp},
                            {"role": "assistant", "text": reply_text, "time": stamp}]
            self.pending.append({"time": stamp, "user": user_text, "reply": reply_text})
            self._save()
            with open(self.folder / "logs" / f"{when.date().isoformat()}.jsonl", "a", encoding="utf-8") as f:
                f.write(json.dumps({"time": stamp, "user": user_text, "reply": reply_text}, ensure_ascii=False) + "\n")

    def api_messages(self, turns: int) -> list[dict]:
        """최근 turns 번의 주고받기를 API 형식으로 (항상 user 로 시작)."""
        items = self.recent[-turns * 2:]
        while items and items[0]["role"] != "user":
            items = items[1:]
        return [{"role": m["role"], "content": m["text"]} for m in items]

    def clear_recent(self) -> None:
        with self._lock:
            self.recent = []
            self._save()

    # ------------------------------------------------------------ 장기기억

    def notes_text(self) -> str:
        """시스템 프롬프트에 넣을 장기기억 (분류별, 항상 같은 순서 → 캐시가 깨지지 않음)."""
        if not self.facts:
            return "(아직 기억해 둔 것이 없음)"
        lines = []
        for cat in CATEGORIES + sorted({f["category"] for f in self.facts} - set(CATEGORIES)):
            items = [f for f in self.facts if f["category"] == cat]
            if items:
                lines.append(f"[{cat}]")
                lines += [f"- {f['text']} ({f['date']})" for f in items]
        return "\n".join(lines)

    def needs_consolidation(self, every: int) -> bool:
        return len(self.pending) >= every

    def consolidation_input(self) -> str:
        today = date.today().isoformat()
        convo = "\n".join(f"[{p['time']}] 주인님: {p['user']}\n[{p['time']}] 나: {p['reply']}" for p in self.pending)
        return (f"오늘 날짜: {today}\n\n## 지금까지의 기억\n{self.notes_text()}\n\n"
                f"## 기억에 아직 반영 안 된 대화\n{convo or '(없음)'}")

    def apply_consolidation(self, facts: list[dict], consumed: int, max_chars: int) -> None:
        """정리된 기억으로 바꾸고, 반영한 대화(consumed 개)는 대기 목록에서 뺀다."""
        clean = []
        for f in facts:
            text = str(f.get("text", "")).strip()
            if not text:
                continue
            cat = f.get("category") if f.get("category") in CATEGORIES else "최근 있었던 일"
            clean.append({"category": cat, "text": text, "date": str(f.get("date", ""))[:10]})
        # 너무 길면 오래된 '최근 있었던 일'부터 뺀다
        def size(items):
            return sum(len(i["text"]) + 20 for i in items)
        while size(clean) > max_chars:
            olds = [i for i in clean if i["category"] == "최근 있었던 일"] or clean
            clean.remove(min(olds, key=lambda i: i["date"]))
        with self._lock:
            self.facts = clean
            self.pending = self.pending[consumed:]
            self.updated = datetime.now().isoformat(timespec="seconds")
            self._save()
