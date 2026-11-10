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

from wording import apply_terms

CATEGORIES = ["주인님 정보", "취향", "약속·할 일", "최근 있었던 일", "관계·호칭"]
RECENT_KEEP = 60  # 디스크에 남겨두는 최근 대화 줄 수


def _stamp(iso: str | None) -> str:
    try:
        t = datetime.fromisoformat(iso or "")
    except ValueError:
        return ""
    return f"[{t.month}/{t.day} {t:%H:%M}] "


def gap_text(last: datetime | None, now: datetime) -> str:
    """마지막 대화 뒤로 얼마나 지났는지 (한 시간 넘었을 때만)."""
    if last is None:
        return ""
    minutes = int((now - last).total_seconds() // 60)
    if minutes < 60:
        return ""
    if minutes < 24 * 60:
        return f"(마지막 대화로부터 {minutes // 60}시간 {minutes % 60}분 만이다)"
    return f"(마지막 대화로부터 {minutes // (24 * 60)}일 만이다)"


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
        self.pinned: list[str] = self._read("pinned.json", [])  # 주인님이 고정해 둔 것 (정리해도 안 지움)
        self.terms: list[dict] = self._read("terms.json", [])  # 고쳐 준 말: {"wrong": "남과", "right": "호박", "date"}
        self.rules: list[dict] = self._read("rules.json", [])  # 금지 사항: {"scope": "전체"|게임 이름, "text", "date"}

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
        return [self.fix_words(m["text"]) for m in self.recent if m.get("kind") == "screen"][-n:]

    def api_messages(self, turns: int) -> list[dict]:
        """최근 대화를 API 형식으로. user/assistant 가 번갈아 나오고 user 로 시작하게 맞춘다.
        주인님 말 앞에는 그 말을 한 시각을 [11/10 21:30] 처럼 붙인다 (언제 한 말인지 기억하게)."""
        items = self.recent[-turns * 2:]
        out: list[dict] = []
        for m in items:
            role, text = m["role"], m["text"]
            if m.get("kind") == "screen":
                text = "(화면을 보고 먼저 건넨 말) " + text
            if role == "user":
                text = f"{_stamp(m.get('time'))}{text}"
            else:  # 예전에 잘못 부른 말이 대화 기록에 남아 있으면 그걸 따라 하므로, 다니카 말은 고친 말로 바꿔서 보낸다
                text = self.fix_words(text)
            if role == "assistant" and (not out or out[-1]["role"] == "assistant"):
                out.append({"role": "user", "content": f"{_stamp(m.get('time'))}(주인님은 말없이 화면을 보고 있었다)"})
            if out and out[-1]["role"] == role:
                out[-1]["content"] += "\n" + text
            else:
                out.append({"role": role, "content": text})
        return out

    def last_time(self) -> datetime | None:
        """마지막으로 대화(또는 먼저 건넨 말)가 있었던 시각."""
        for m in reversed(self.recent):
            try:
                return datetime.fromisoformat(m["time"])
            except (KeyError, ValueError):
                continue
        return None

    def clear_recent(self) -> None:
        with self._lock:
            self.recent = []
            self._save()

    # ------------------------------------------------------------ 고쳐 준 말 ('남과' 가 아니라 '호박')

    def add_term(self, wrong: str, right: str, when: datetime | None = None) -> bool:
        wrong, right = " ".join(str(wrong).split())[:40], " ".join(str(right).split())[:40]
        if not wrong or not right or wrong == right:
            return False
        with self._lock:
            self.terms = [t for t in self.terms if t["wrong"] != wrong]  # 같은 말을 다시 고치면 새 것으로
            self.terms.append({"wrong": wrong, "right": right, "date": (when or datetime.now()).date().isoformat()})
            self._write("terms.json", self.terms)
        return True

    def remove_term(self, index: int) -> None:
        with self._lock:
            if 0 <= index < len(self.terms):
                del self.terms[index]
                self._write("terms.json", self.terms)

    def term_pairs(self) -> list[tuple[str, str]]:
        return [(t["wrong"], t["right"]) for t in self.terms]

    def fix_words(self, text: str) -> str:
        return apply_terms(text, self.term_pairs()) if self.terms and text else text

    def terms_text(self) -> str:
        if not self.terms:
            return ""
        return ("# 주인님이 고쳐 준 말 (반드시 고친 말로만 쓴다. 화면에 원래 글자가 보여도 고친 말로 부른다)\n"
                + "\n".join(f"- '{t['wrong']}' 가 아니라 '{t['right']}'" for t in self.terms))

    # ------------------------------------------------------------ 금지 사항 (주인님이 하지 말라고 한 것)

    def add_rule(self, scope: str, text: str, when: datetime | None = None) -> bool:
        text = " ".join(str(text).split())[:200]
        scope = (scope or "전체").strip() or "전체"
        if not text or any(r["scope"] == scope and r["text"] == text for r in self.rules):
            return False
        with self._lock:
            self.rules.append({"scope": scope, "text": text, "date": (when or datetime.now()).date().isoformat()})
            self._write("rules.json", self.rules)
        return True

    def remove_rule(self, index: int) -> None:
        with self._lock:
            if 0 <= index < len(self.rules):
                del self.rules[index]
                self._write("rules.json", self.rules)

    def rules_for(self, mode_name: str | None) -> list[str]:
        """지금 상황에 적용되는 금지 사항 (전체 + 지금 게임)."""
        return [r["text"] for r in self.rules if r["scope"] in ("전체", mode_name or "")]

    # ------------------------------------------------------------ 고정해 둔 것

    def add_pinned(self, text: str) -> bool:
        text = " ".join(str(text).split())[:200]
        if not text or text in self.pinned:
            return False
        with self._lock:
            self.pinned.append(text)
            self._write("pinned.json", self.pinned)
        return True

    def remove_pinned(self, text: str) -> None:
        with self._lock:
            self.pinned = [p for p in self.pinned if p != text]
            self._write("pinned.json", self.pinned)

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
