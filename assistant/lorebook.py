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
# 파일 맨 위(첫 '## ' 앞)에 '게임: 붉은사막, Crimson Desert' 가 있으면 그 파일 항목은 그 게임 얘기일 때만 꺼낸다
_GAME = re.compile(r"^\s*게임\s*[:：]\s*(.+)$", re.MULTILINE)


@dataclass
class Entry:
    title: str
    text: str
    keywords: list[str] = field(default_factory=list)
    games: list[str] = field(default_factory=list)  # 비어 있으면 언제나, 있으면 이 이름이 보일 때만


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
        head, *blocks = re.split(r"(?m)^## ", text)
        m = _GAME.search(head)
        games = [g.strip() for g in re.split(r"[,，、]", m.group(1)) if g.strip()] if m else []
        for block in blocks:
            title, _, body = block.partition("\n")
            title = title.strip()
            words = _clean_title_words(title)
            m = _KEYWORDS.search(body)
            if m:
                words += [w.strip() for w in re.split(r"[,，、]", m.group(1)) if w.strip()]
                body = _KEYWORDS.sub("", body, count=1)
            words = sorted({w for w in words if len(w) >= 2}, key=len, reverse=True)
            if words and body.strip():
                out.append(Entry(title, body.strip(), words, games))
        return out

    def find(self, text: str, max_chars: int = 3500, limit: int = 4) -> list[Entry]:
        """text 에 이름이 나온 항목들 (많이·길게 맞은 것부터)."""
        if not text or not self.entries:
            return []
        low = text.lower()
        scored = []
        for i, e in enumerate(self.entries):
            if e.games and not any(g.lower() in low for g in e.games):
                continue  # 다른 게임 얘기 중엔 이 게임 사전을 안 꺼냄 ('심연'이 원신에도 붉은사막에도 있으니)
            hits = [w for w in e.keywords if w.lower() in low]
            games = {g.lower() for g in e.games}
            topical = [w for w in hits if w.lower() not in games]  # 게임 이름은 '어느 게임인지'일 뿐 주제가 아님
            if topical:
                scored.append((len(topical), max(len(w) for w in topical), -i, e))
            elif hits:
                scored.append((0, 0, -i, e))  # 게임 이름만 맞음 → 다른 항목이 하나도 없을 때만
        if any(s[0] for s in scored):
            scored = [s for s in scored if s[0]]
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
        head = ("[관련 배경지식 — 네가 원래 아는 것이다. 지금 상황에 필요한 것만 골라 네 생각과 네 말로 쓴다. "
                "그대로 읽거나 나열하지 않고, 관련 없으면 쓰지 않는다]")
        if any(SPOILER in e.title for e in found):
            head += "\n" + SPOILER_RULE
        return head + "\n" + "\n\n".join(f"## {e.title}\n{e.text}" for e in found)


SPOILER = "(스포일러)"
SPOILER_RULE = ("[스포 주의: 제목에 (스포일러)가 붙은 항목은 스토리 전개·반전·결말이다. 주인님이 그 내용을 직접 묻지 않았으면 "
                "먼저 꺼내지 않는다(화면에 이미 나온 데까지는 괜찮다). 직접 물었으면 '스포일러인데요' 하고 짧게 알린 뒤 답한다]")

# 찾아본 것을 게임별 사전에 쌓을 때 키워드로 쓰지 않을 흔한 말
_GENERIC = {"퀘스트", "공략", "보스", "위치", "방법", "어디", "뭐야", "누구", "정보", "게임", "캐릭터", "아이템", "스킬", "이름",
            "설명", "최신", "소식", "패치", "무엇", "어떻게", "얻는", "얻는법", "얻는 법", "가는", "가는법", "잡는", "잡는법", "추천",
            "나무위키", "인벤", "후기", "뜻", "의미", "정리"}


def lookup_entry(game: str, query: str, notes: str, when) -> str:
    """찾아본 것 하나를 사전 항목 글로. 키워드는 검색어에서 게임 이름·흔한 말을 뺀 것."""
    words = [w.strip(" ?!.'\"") for w in re.split(r"[\s,·/]+", query)]
    words = [w for w in words if len(w) >= 2 and w not in _GENERIC and w != game]
    phrase = " ".join(words)
    keys = list(dict.fromkeys(([phrase] if len(words) > 1 else []) + words))
    body = re.sub(r"(?m)^#+\s*", "- ", notes.strip())[:1500]  # 찾은 글 속 제목 줄이 항목을 끊지 않게
    return f"## {query} (찾아본 것, {when:%Y-%m-%d})\n키워드: {', '.join(keys)}\n{body}\n"


def save_lookup(folder: Path, game: str, query: str, notes: str, when) -> list[Entry]:
    """data/knowledge/찾아본것_게임.md 에 쌓는다 (같은 검색어면 새 것으로). 새 항목을 돌려준다."""
    header = f"게임: {game}\n\n" if game and game != "일반" else ""
    text = lookup_entry(game, query, notes, when)
    found = LoreBook.parse(header + text)
    if not found:
        return []
    safe = re.sub(r'[\\/:*?"<>|\s]+', "_", game or "일반")
    path = folder / f"찾아본것_{safe}.md"
    try:
        folder.mkdir(parents=True, exist_ok=True)
        old = path.read_text(encoding="utf-8") if path.is_file() else ""
        blocks = [b for b in re.split(r"(?m)^(?=## )", old) if b.strip() and not b.startswith(f"## {query} (찾아본 것")]
        if header and not old.startswith("게임:"):
            blocks.insert(0, header)
        path.write_text("".join(blocks) + ("\n" if blocks and not blocks[-1].endswith("\n") else "") + text,
                        encoding="utf-8")
    except OSError as exc:
        log.warning("찾아본 것 저장 실패: %s", exc)
    return found
