"""대화 기억.

- 최근 대화: data/recent.json (프로그램을 껐다 켜도 이어짐)
- 장기기억: data/memory.json — 캐릭터가 스스로 읽기 편한 짧은 한국어 메모(사실)들.
  사실마다 번호(id)·중요도(1~3)·상태(active/archived)가 있다. 정리할 때 전체를 다시 쓰지 않고 '추가·고침·보관'만 하므로
  말없이 사라지는 기억이 없다. 중요도 3(★)은 정리로 보관되지 않는다(약속이 지난 경우만 예외). 보관된 것도 찾으면 나온다.
- 대화 원문: data/logs/날짜.jsonl (PC에만 보관)
"""

from __future__ import annotations

import json
import re
import threading
import uuid
from datetime import date, datetime
from pathlib import Path

from wording import apply_terms

CATEGORIES = ["주인님 정보", "관계·호칭", "사람", "취향", "약속·할 일", "게임", "다니카 자신", "최근 있었던 일"]
CORE_IMPORTANCE = {"주인님 정보": 3, "관계·호칭": 3}  # 예전 기억을 옮길 때 기본 중요도 (나머지는 2)


def _norm(text: str) -> str:
    return re.sub(r"[\s.,!?~'\"·…]+", "", text or "")
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
        self.facts: list[dict] = [self._upgrade(f) for f in mem.get("facts", [])]
        self.updated: str | None = mem.get("updated")
        self.pending: list[dict] = mem.get("pending", [])  # 아직 장기기억에 반영 안 된 대화
        self.knowledge: list[dict] = self._read("knowledge.json", [])  # 찾아보고 알게 된 것
        self.pinned: list[str] = self._read("pinned.json", [])  # 주인님이 고정해 둔 것 (정리해도 안 지움)
        self.terms: list[dict] = self._read("terms.json", [])  # 고쳐 준 말: {"wrong": "남과", "right": "호박", "date"}
        # 화면 보는 규칙: {"scope": "전체"|게임 이름, "text", "date", "kind"}
        # kind: dont(그런 말 하지 않기, 기본) | do(챙겨 봐 주기) | skip(이 창·프로그램은 아예 안 찍기)
        self.rules: list[dict] = self._read("rules.json", [])

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

    def add_rule(self, scope: str, text: str, when: datetime | None = None, kind: str = "dont") -> bool:
        text = " ".join(str(text).split())[:200]
        scope = "전체" if kind == "skip" else ((scope or "전체").strip() or "전체")
        if not text or any(r["scope"] == scope and r["text"] == text and r.get("kind", "dont") == kind
                           for r in self.rules):
            return False
        with self._lock:
            self.rules.append({"scope": scope, "text": text, "date": (when or datetime.now()).date().isoformat(),
                               "kind": kind})
            self._write("rules.json", self.rules)
        return True

    def remove_rule(self, index: int) -> None:
        with self._lock:
            if 0 <= index < len(self.rules):
                del self.rules[index]
                self._write("rules.json", self.rules)

    def rules_for(self, mode_name: str | None, kind: str = "dont") -> list[str]:
        """지금 상황에 적용되는 규칙 (전체 + 지금 게임). kind: dont | do | skip"""
        return [r["text"] for r in self.rules
                if r.get("kind", "dont") == kind and r["scope"] in ("전체", mode_name or "")]

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
        core = self.core_facts(getattr(self, "max_chars", 4000))
        if not core:
            return "(아직 기억해 둔 것이 없음)"
        lines = []
        for cat in CATEGORIES + sorted({f["category"] for f in core} - set(CATEGORIES)):
            items = [f for f in core if f["category"] == cat]
            if items:
                lines.append(f"[{cat}]" + (" (네가 예전에 한 말·약속. 어긋나지 않게)" if cat == "다니카 자신" else ""))
                lines += [f"- {'★ ' if f['importance'] >= 3 else ''}{f['text']} ({f['date']})" for f in items]
        hidden = len(self.active_facts()) - len(core)
        if hidden > 0:
            lines.append(f"(이 밖에 덜 중요한 기억 {hidden}개는 관련 있을 때 '관련 기억'으로 함께 온다)")
        return "\n".join(lines)

    # ------------------------------------------------------------ 사실 (장기기억 한 줄 한 줄)

    @staticmethod
    def _upgrade(f: dict) -> dict:
        """예전 형식(분류·글·날짜만)을 번호·중요도·상태가 있는 형식으로."""
        f = dict(f)
        f.setdefault("id", "f" + uuid.uuid4().hex[:7])
        f.setdefault("importance", CORE_IMPORTANCE.get(f.get("category", ""), 2))
        f.setdefault("status", "active")
        f.setdefault("subject", "")
        return f

    def active_facts(self) -> list[dict]:
        return [f for f in self.facts if f.get("status", "active") == "active"]

    def archived_facts(self) -> list[dict]:
        return [f for f in self.facts if f.get("status") == "archived"]

    def fact(self, fid: str) -> dict | None:
        return next((f for f in self.facts if f["id"] == fid), None)

    def _similar(self, category: str, text: str) -> dict | None:
        n = _norm(text)
        for f in self.active_facts():
            m = _norm(f["text"])
            if f["category"] == category and (m == n or (len(n) >= 8 and len(m) >= 8 and (n in m or m in n))):
                return f
        return None

    def add_fact(self, category: str, text: str, importance: int = 2, subject: str = "", when: str | None = None,
                 source: str = "chat", save: bool = True) -> dict | None:
        """사실 하나 더하기. 거의 같은 게 있으면 그걸 고친다(더 긴 글·더 높은 중요도로)."""
        text = " ".join(str(text or "").split())[:300]
        if not text:
            return None
        category = category if category in CATEGORIES else "최근 있었던 일"
        importance = max(1, min(3, int(importance or 2)))
        day = (when or datetime.now().date().isoformat())[:10]
        with self._lock:
            same = self._similar(category, text)
            if same:
                if len(text) > len(same["text"]):
                    same["text"] = text
                same["importance"] = max(same["importance"], importance)
                same["date"] = day
                same["subject"] = subject or same.get("subject", "")
                f = same
            else:
                f = {"id": "f" + uuid.uuid4().hex[:7], "category": category, "text": text, "date": day,
                     "importance": importance, "status": "active", "subject": subject.strip()[:40], "source": source}
                self.facts.append(f)
            if save:
                self._save()
        return f

    def update_fact(self, fid: str, text: str | None = None, importance: int | None = None,
                    category: str | None = None, when: str | None = None, subject: str | None = None) -> dict | None:
        """고치기 (예전 내용은 history 에 남김: '예전엔 ○○였다'까지 기억)."""
        with self._lock:
            f = self.fact(fid)
            if f is None:
                return None
            if text and _norm(text) != _norm(f["text"]):
                f.setdefault("history", []).append({"text": f["text"], "date": f.get("date", "")})
                del f["history"][:-5]
                f["text"] = " ".join(text.split())[:300]
            if importance:
                f["importance"] = max(1, min(3, int(importance)))
            if category in CATEGORIES:
                f["category"] = category
            if subject is not None:
                f["subject"] = subject.strip()[:40]
            f["date"] = (when or f.get("date") or datetime.now().date().isoformat())[:10]
            f["status"] = "active"
            self._save()
        return f

    def archive_fact(self, fid: str, force: bool = False) -> dict | None:
        """보관 (지우지 않음 — 떠올리기로 찾을 수 있다). 중요도 3은 약속이 아니면 force 일 때만."""
        with self._lock:
            f = self.fact(fid)
            if f is None or f.get("status") == "archived":
                return None
            if f["importance"] >= 3 and f["category"] != "약속·할 일" and not force:
                return None
            f["status"] = "archived"
            f["archived"] = datetime.now().date().isoformat()
            self._save()
        return f

    def delete_fact(self, fid: str) -> None:
        with self._lock:
            self.facts = [f for f in self.facts if f["id"] != fid]
            self._save()

    def relevant_facts(self, words: list[str], limit: int = 6, skip_core: bool = True) -> list[dict]:
        """단서에 맞는 사실 (시스템 프롬프트에 안 들어간 덜 중요한 것·보관된 것에서)."""
        if not words:
            return []
        core_ids = {f["id"] for f in self.core_facts(getattr(self, "max_chars", 4000))} if skip_core else set()
        scored = []
        for f in self.facts:
            if f["id"] in core_ids:
                continue
            hay = f"{f['text']} {f.get('subject', '')}"
            hits = [w for w in words if w and w in hay]
            if hits:
                scored.append((len(hits), max(len(w) for w in hits), f.get("date", ""), f))
        scored.sort(key=lambda s: s[:3], reverse=True)
        return [s[3] for s in scored[:limit]]

    def core_facts(self, max_chars: int = 4000) -> list[dict]:
        """시스템 프롬프트에 늘 넣는 것: 중요도 3 전부 + 중요도 2 (최근 것부터) 글자 수 안에서."""
        act = self.active_facts()
        core = [f for f in act if f["importance"] >= 3]
        size = sum(len(f["text"]) + 20 for f in core)
        for f in sorted((f for f in act if f["importance"] == 2), key=lambda f: f.get("date", ""), reverse=True):
            if size + len(f["text"]) + 20 > max_chars:
                continue
            core.append(f)
            size += len(f["text"]) + 20
        return core

    def apply_ops(self, ops: list[dict], consumed: int) -> list[dict]:
        """정리 결과(추가·고침·보관)를 반영. 반영한 대화(consumed 개)는 대기 목록에서 뺀다. 보관된 사실들을 돌려준다."""
        archived = []
        for op in ops:
            kind = op.get("op")
            fid = str(op.get("id", "") or "")
            imp = op.get("importance") or CORE_IMPORTANCE.get(op.get("category", ""), 2)
            if kind == "archive" and fid:
                f = self.archive_fact(fid)
                if f:
                    archived.append(f)
            elif kind == "update" and fid and self.fact(fid):
                self.update_fact(fid, op.get("text"), imp, op.get("category"), op.get("date"), op.get("subject"))
            elif op.get("text"):
                self.add_fact(op.get("category", ""), op["text"], imp, op.get("subject", ""), op.get("date"),
                              source="consolidate", save=False)
        with self._lock:
            self.pending = self.pending[consumed:]
            self.updated = datetime.now().isoformat(timespec="seconds")
            self._save()
        return archived

    def needs_consolidation(self, every: int) -> bool:
        return len(self.pending) >= every

    def consolidation_input(self) -> str:
        today = date.today().isoformat()
        convo = "\n".join(f"[{p['time']}] 주인님: {p['user']}\n[{p['time']}] 나: {p['reply']}" for p in self.pending)
        facts = "\n".join(f"[{f['id']}] 중요도{f['importance']} [{f['category']}] {f['text']} ({f.get('date', '')})"
                          + (f" {{{f['subject']}}}" if f.get("subject") else "") for f in self.active_facts())
        return (f"오늘 날짜: {today}\n\n## 지금까지의 기억 (번호·중요도·분류)\n{facts or '(없음)'}\n\n"
                f"## 기억에 아직 반영 안 된 대화\n{convo or '(없음)'}")

    def apply_consolidation(self, facts: list[dict], consumed: int, max_chars: int) -> None:
        """(예전 형식) 사실 목록 → 더하기로 반영. 시스템 프롬프트에는 max_chars 안에서만 들어가고 나머지는 남아 있다."""
        self.max_chars = max_chars
        self.apply_ops([{"op": "add", **f} for f in facts], consumed)
