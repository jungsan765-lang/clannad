"""필요할 때 꺼내 보는 배경지식 사전.

character.lore_dir(기본: 성격 파일이 있는 폴더와 그 안의 lore/ 폴더)의 *.md 를 (persona.md·lore.md 는 빼고) '## 제목' 단위로 나눠 두고,
대화·화면에 그 항목의 이름(제목과 '키워드:' 줄)이 나오면 그 항목만 프롬프트에 넣는다.
늘 아는 핵심(lore.md)은 캐시되는 시스템 프롬프트에, 자세한 사전은 필요할 때만 → 많이 알아도 비용이 거의 안 는다.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

log = logging.getLogger("assistant.lore")
_KEYWORDS = re.compile(r"^\s*키워드\s*[:：]\s*(.+)$", re.MULTILINE)


@dataclass
class Entry:
    title: str
    text: str
    keywords: list[str] = field(default_factory=list)


def _clean_title_words(title: str) -> list[str]:
    """'라우마 (달의 륜 · 풀)' → ['라우마'] 처럼 제목의 이름 부분."""
    head = re.split(r"[(（—\-:·]", title)[0].strip()
    return [head] if len(head) >= 2 else []


class LoreBook:
    def __init__(self, entries: list[Entry] | None = None):
        self.entries = entries or []

    @classmethod
    def load(cls, *folders: Path | None, skip: tuple[str, ...] = ("persona.md", "lore.md")) -> "LoreBook":
        entries: list[Entry] = []
        files = 0
        for folder in folders:
            if not folder or not folder.is_dir():
                continue
            for path in sorted(folder.glob("*.md")):
                if path.name.lower() in skip:
                    continue
                try:
                    entries += cls.parse(path.read_text(encoding="utf-8"))
                    files += 1
                except (OSError, UnicodeDecodeError) as exc:
                    log.warning("사전 파일을 읽지 못함 %s: %s", path, exc)
        if entries:
            log.info("배경지식 사전: 파일 %d개, 항목 %d개", files, len(entries))
        return cls(entries)

    @staticmethod
    def parse(text: str) -> list[Entry]:
        out = []
        for block in re.split(r"(?m)^## ", text)[1:]:
            title, _, body = block.partition("\n")
            title = title.strip()
            words = _clean_title_words(title)
            m = _KEYWORDS.search(body)
            if m:
                words += [w.strip() for w in re.split(r"[,，、]", m.group(1)) if w.strip()]
                body = _KEYWORDS.sub("", body, count=1)
            words = sorted({w for w in words if len(w) >= 2}, key=len, reverse=True)
            if words and body.strip():
                out.append(Entry(title, body.strip(), words))
        return out

    def find(self, text: str, max_chars: int = 3500, limit: int = 4) -> list[Entry]:
        """text 에 이름이 나온 항목들 (많이·길게 맞은 것부터)."""
        if not text or not self.entries:
            return []
        low = text.lower()
        scored = []
        for i, e in enumerate(self.entries):
            hits = [w for w in e.keywords if w.lower() in low]
            if hits:
                scored.append((len(hits), max(len(w) for w in hits), -i, e))
        scored.sort(reverse=True, key=lambda s: s[:3])
        picked, size = [], 0
        for *_, e in scored[:limit]:
            if size + len(e.text) > max_chars and picked:
                continue
            picked.append(e)
            size += len(e.text)
        return picked

    def notes_for(self, text: str, max_chars: int = 3500, limit: int = 4) -> str:
        found = self.find(text, max_chars, limit)
        if not found:
            return ""
        return ("[관련 배경지식 — 네가 원래 아는 것이다. 지금 상황에 필요한 것만 골라 네 생각과 네 말로 쓴다. "
                "그대로 읽거나 나열하지 않고, 관련 없으면 쓰지 않는다]\n"
                + "\n\n".join(f"## {e.title}\n{e.text}" for e in found))
