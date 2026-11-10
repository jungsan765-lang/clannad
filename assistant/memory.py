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
        self.knowledge: list[dict] = self._read("knowledge.json", [])  # 찾아보고 알게 된 것

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

    def add_spoken(self, line: str, when: datetime | None = None) -> None:
        """화면을 보고 캐릭터가 먼저 한 말. 장기기억 정리 대상은 아니다."""
        when = when or datetime.now()
        stamp = when.isoformat(timespec="seconds")
        with self._lock:
            self.recent.append({"role": "assistant", "text": line, "time": stamp, "kind": "screen"})
            self._save()
            with open(self.folder / "logs" / f"{when.date().isoformat()}.jsonl", "a", encoding="utf-8") as f:
                f.write(json.dumps({"time": stamp, "screen_line": line}, ensure_ascii=False) + "\n")

    def add_game_record(self, game: str, minutes: float, notes: list[str], when: datetime | None = None) -> None:
        """게임을 끝냈을 때 기록 요약. 다음 장기기억 정리 때 '최근 있었던 일'이 된다."""
        when = when or datetime.now()
        stamp = when.isoformat(timespec="seconds")
        with self._lock:
            self.pending.append({"time": stamp, "user": f"({game}을(를) 약 {minutes:.0f}분 플레이함)",
                                 "reply": "(이번 플레이에서 본 것) " + " / ".join(notes[-12:])})
            self._save()

    def spoken_lines(self, n: int = 5) -> list[str]:
        return [m["text"] for m in self.recent if m.get("kind") == "screen"][-n:]

    def api_messages(self, turns: int) -> list[dict]:
        """최근 대화를 API 형식으로. user/assistant 가 번갈아 나오고 user 로 시작하게 맞춘다."""
        items = self.recent[-turns * 2:]
        out: list[dict] = []
        for m in items:
            role, text = m["role"], m["text"]
            if m.get("kind") == "screen":
                text = "(화면을 보고 먼저 건넨 말) " + text
            if role == "assistant" and (not out or out[-1]["role"] == "assistant"):
                out.append({"role": "user", "content": "(주인님은 말없이 화면을 보고 있었다)"})
            if out and out[-1]["role"] == role:
                out[-1]["content"] += "\n" + text
            else:
                out.append({"role": role, "content": text})
        return out

    def clear_recent(self) -> None:
        with self._lock:
            self.recent = []
            self._save()

    # ------------------------------------------------------------ 찾아보고 알게 된 것

    def add_knowledge(self, query: str, text: str, when: datetime | None = None, keep: int = 80) -> None:
        """검색해서 알게 된 것을 남긴다. 같은 검색어면 새 것으로 바꾼다."""
        text = text.strip()
        if not text:
            return
        with self._lock:
            self.knowledge = [k for k in self.knowledge if k["query"] != query]
            self.knowledge.append({"query": query, "text": text,
                                   "date": (when or datetime.now()).date().isoformat()})
            self.knowledge = self.knowledge[-keep:]
            self._write("knowledge.json", self.knowledge)

    def knowledge_text(self, max_chars: int = 8000) -> str:
        """최근에 찾아본 것부터 max_chars 까지. 순서가 일정해서 새로 찾기 전엔 캐시가 유지된다."""
        out, size = [], 0
        for k in reversed(self.knowledge):
            block = f"## {k['query']} ({k['date']})\n{k['text']}"
            if size + len(block) > max_chars:
                break
            out.append(block)
            size += len(block)
        return "\n\n".join(reversed(out))

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
