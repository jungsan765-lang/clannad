"""떠올리기: 예전 일(대화·화면 일지·분석·찾아본 것·일기·게임 기록)을 이 PC 의 색인(data/memory.db)에서 찾아 꺼낸다.

기억의 '선(라인)':
  1) 일어난 일은 전부 원래 기록으로 남는다 (data/logs/날짜.jsonl, data/screens/날짜/index.jsonl …) — 지워지지 않는 원본
  2) 그 기록을 일화(episode) 하나하나로 색인한다 (이 모듈, SQLite + 글자 3개 단위 검색) — 비용 0
  3) 주인님 말에서 단서(이름·낱말·따옴표 속 말·시간 표현)를 뽑아 일화를 찾고, 앞뒤 대화까지 붙여 '떠오른 기억'으로 넘긴다
  4) 하루가 끝나면 일기(요약)도 일화로 들어가고, 중요한 사실은 장기기억(memory.py)에 따로 정리된다

"그때 그거 기억나?"처럼 떠올리라는 말이면 더 많이·자세히(그때 화면 사진까지), 아니면 아주 확실히 맞는 것만 조금.
"""

from __future__ import annotations

import json
import logging
import math
import re
import sqlite3
import threading
import zlib
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

log = logging.getLogger("assistant.recall")

# ---------------------------------------------------------------- 한국어 단서 뽑기

_PARTICLES = sorted(
    ["이라니까", "이라고요", "이었는데", "였는데", "이었던", "였던", "이라고", "라고", "이라는", "라는", "이었지", "였지", "이랑",
     "에서는", "에서도", "에서", "으로는", "으로", "로는", "로", "한테서", "한테", "에게서", "에게", "께서", "께", "까지", "부터",
     "처럼", "보다", "같은", "같이", "이나", "나", "이랑", "랑", "하고", "과", "와", "은", "는", "이", "가", "을", "를", "의",
     "에", "도", "만", "야", "아", "이야", "이에요", "예요", "이요", "요", "이지", "지", "인데", "인가", "이던", "던"],
    key=len, reverse=True)
_STOP = {
    "그거", "그것", "그게", "그건", "그때", "그날", "저번", "지난번", "예전", "예전에", "아까", "방금", "전에", "이거", "이것", "이게",
    "저거", "저게", "뭐였", "뭐였지", "뭐더라", "뭐야", "뭐지", "무슨", "어떤", "어떻게", "왜", "언제", "어디", "누구", "기억", "기억나",
    "기억해", "말했", "말했던", "말한", "했던", "했지", "했어", "했잖아", "있잖아", "있었", "있었지", "얘기", "이야기", "오늘", "어제",
    "그저께", "내일", "진짜", "정말", "그냥", "다시", "우리", "내가", "네가", "니가", "너가", "다니카", "주인님", "나랑", "너랑", "좀",
    "그래", "그러니까", "근데", "그런데", "그리고", "하는", "하던", "해줘", "알려줘", "말해줘", "있어", "없어", "같은데", "같아",
    "보면", "보니까", "그러면", "그럼", "이번", "다음", "처음", "마지막", "하나", "둘", "정도", "때문", "생각", "생각나", "맞아",
    "아니", "아냐", "있던", "봤던", "봤어", "봤지", "했나", "였나", "이었나", "몇시", "몇", "시쯤", "쯤"}
RECALL_INTENT = re.compile(r"기억|저번|지난번|그때|그 때|예전에|전에|아까|말했|했던|봤던|있잖아|뭐였|뭐더라|얘기했|이야기했|떠올")


def strip_particles(word: str) -> str:
    for _ in range(2):  # '카일록한테서는' 처럼 겹친 것도
        for p in _PARTICLES:
            if len(word) > len(p) + 1 and word.endswith(p):
                word = word[: -len(p)]
                break
        else:
            break
    return word


def cues(text: str, limit: int = 8) -> list[str]:
    """말에서 찾을 단서: 따옴표 속 말은 통째로, 나머지는 조사를 뗀 낱말 (흔한 말은 뺌)."""
    out: list[str] = []
    for q in re.findall(r"['\"“‘「『]([^'\"”’」』]{2,30})['\"”’」』]", text or ""):
        out.append(q.strip())
    for tok in re.findall(r"[0-9A-Za-z가-힣ぁ-んァ-ヶ一-龥ー]+", text or ""):
        w = strip_particles(tok)
        if len(w) < 2 or w in _STOP or tok in _STOP or w.isdigit():
            continue
        if re.fullmatch(r"[가-힣]+(했|하|해|됐|되|돼|었|았|겠|니|냐|까|지|요|죠)[가-힣]{0,2}", w) and len(w) <= 4:
            continue  # '했었지', '되냐' 같은 말끝
        out.append(w)
    seen: dict[str, None] = {}
    for w in out:
        if w.lower() not in seen:
            seen[w.lower()] = None
    return [w for w in seen][:limit]


# ---------------------------------------------------------------- 색인

@dataclass
class Episode:
    id: int
    time: str
    kind: str
    game: str
    text: str
    detail: str = ""
    ref: str = ""
    score: float = 0.0

    def when(self) -> str:
        try:
            return datetime.fromisoformat(self.time).strftime("%m/%d %H:%M")
        except ValueError:
            return self.time[:16]


KIND_BOOST = {"moment": 1.6, "diary": 1.2, "fact": 1.2}  # 주인님이 '기억해' 한 순간은 더 잘 떠오르게
KIND_LABEL = {"moment": "기억해 달라고 한 순간", "chat": "대화", "screen": "화면", "said": "화면 보고 한 말", "analysis": "분석", "lookup": "찾아본 것",
              "diary": "일기", "game": "게임 기록", "fact": "예전 기억"}


class EpisodeIndex:
    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self.db = sqlite3.connect(str(path), check_same_thread=False)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.executescript("""
            CREATE TABLE IF NOT EXISTS episodes (
                id INTEGER PRIMARY KEY, time TEXT, kind TEXT, game TEXT, text TEXT, detail TEXT, ref TEXT,
                source TEXT UNIQUE);
            CREATE INDEX IF NOT EXISTS episodes_time ON episodes(time);
            CREATE TABLE IF NOT EXISTS offsets (file TEXT PRIMARY KEY, pos INTEGER);
        """)
        try:
            self.db.execute("CREATE VIRTUAL TABLE IF NOT EXISTS ep_fts USING fts5(body, tokenize='trigram')")
            self.fts = True
        except sqlite3.OperationalError:  # 오래된 SQLite → 글자 검색(LIKE)만
            self.fts = False
        self.db.commit()

    def close(self) -> None:
        with self._lock:
            self.db.close()

    # ------------------------------------------------------------ 넣기

    def add(self, time: str, kind: str, text: str, detail: str = "", game: str = "", ref: str = "",
            source: str | None = None) -> int | None:
        """source 가 같으면 바꿔 넣는다 (화면 일지에 나중에 붙는 '한 말' 등)."""
        text = (text or "").strip()
        if not text:
            return None
        with self._lock:
            cur = self.db.cursor()
            row = cur.execute("SELECT id FROM episodes WHERE source = ?", (source,)).fetchone() if source else None
            if row:
                cur.execute("UPDATE episodes SET time=?, kind=?, game=?, text=?, detail=?, ref=? WHERE id=?",
                            (time, kind, game, text, detail, ref, row[0]))
                eid = row[0]
                if self.fts:
                    cur.execute("DELETE FROM ep_fts WHERE rowid = ?", (eid,))
            else:
                cur.execute("INSERT INTO episodes(time, kind, game, text, detail, ref, source) VALUES (?,?,?,?,?,?,?)",
                            (time, kind, game, text, detail, ref, source))
                eid = cur.lastrowid
            if self.fts:
                cur.execute("INSERT INTO ep_fts(rowid, body) VALUES (?, ?)", (eid, f"{text}\n{detail}\n{game}"))
            self.db.commit()
        return eid

    def count(self) -> int:
        with self._lock:
            return self.db.execute("SELECT COUNT(*) FROM episodes").fetchone()[0]

    # ------------------------------------------------------------ 원본 기록에서 새 줄만 읽어 넣기

    def _new_lines(self, path: Path) -> list[str]:
        key = str(path)
        with self._lock:
            row = self.db.execute("SELECT pos FROM offsets WHERE file = ?", (key,)).fetchone()
        pos = row[0] if row else 0
        try:
            size = path.stat().st_size
            if size < pos:
                pos = 0  # 파일이 새로 만들어짐
            if size == pos:
                return []
            with open(path, "rb") as f:
                f.seek(pos)
                data = f.read()
        except OSError:
            return []
        end = data.rfind(b"\n") + 1  # 다 써진 줄까지만
        if end <= 0:
            return []
        with self._lock:
            self.db.execute("INSERT OR REPLACE INTO offsets(file, pos) VALUES (?, ?)", (key, pos + end))
            self.db.commit()
        return data[:end].decode("utf-8", "replace").splitlines()

    def sync(self, data_dir: Path) -> int:
        """data/logs 와 data/screens 의 새 줄을 색인에 넣는다. 넣은 수."""
        added = 0
        for path in sorted((data_dir / "logs").glob("????-??-??.jsonl")):
            for i, line in enumerate(self._new_lines(path)):
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                t = str(row.get("time", ""))
                if "user" in row:
                    user, reply = str(row["user"]), str(row.get("reply", ""))
                    if user.startswith("(") and user.endswith(")"):
                        text = f"{user[1:-1]} → 다니카: {reply}"  # 알림·분석 부탁 같은 것
                    else:
                        text = f"주인님: {user}\n다니카: {reply}"
                    added += bool(self.add(t, "chat", text, source=f"log:{path.stem}:{t}:{zlib.crc32(user.encode()):08x}"))
                elif "screen_line" in row:
                    added += bool(self.add(t, "said", f"다니카(화면 보고): {row['screen_line']}",
                                           source=f"said:{path.stem}:{t}"))
        for index in sorted((data_dir / "screens").glob("????-??-??/index.jsonl")):
            day = index.parent
            for line in self._new_lines(index):
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if "note_for" in row:  # 같은 장면에 판단·한 말 덧붙이기
                    src = f"screen:{day.name}:{row['note_for']}"
                    with self._lock:
                        old = self.db.execute("SELECT time, game, text, detail, ref FROM episodes WHERE source=?",
                                              (src,)).fetchone()
                    if old:
                        text = old[2]
                        if row.get("situation") and row["situation"] not in text:
                            text += f" / {row['situation']}"
                        if row.get("said"):
                            text += f" (내가 한 말: {row['said']})"
                        self.add(old[0], "screen", text, old[3], old[1], old[4], source=src)
                    continue
                text = row.get("situation") or row.get("title") or ""
                if not text:
                    continue
                added += bool(self.add(str(row.get("time", "")), "screen", text, detail=str(row.get("title", "")),
                                       game=str(row.get("mode", "")), ref=str(day / row.get("file", "")),
                                       source=f"screen:{day.name}:{row.get('file', '')}"))
        if added:
            log.info("기억 색인: %d개 더함 (전체 %d)", added, self.count())
        return added

    # ------------------------------------------------------------ 찾기

    def _ids_for(self, cue: str, since: str | None, until: str | None) -> set[int]:
        sql, args = "", []
        if self.fts and len(cue) >= 3:
            sql = "SELECT rowid FROM ep_fts WHERE ep_fts MATCH ?"
            args = ['"' + cue.replace('"', '""') + '"']
        else:
            like = "%" + cue.replace("%", "").replace("_", "") + "%"
            sql, args = "SELECT id FROM episodes WHERE (text LIKE ? OR detail LIKE ? OR game LIKE ?)", [like, like, like]
        with self._lock:
            ids = {r[0] for r in self.db.execute(sql, args).fetchall()}
            if ids and (since or until):
                q = "SELECT id FROM episodes WHERE id IN (%s)" % ",".join("?" * len(ids))
                extra = []
                if since:
                    q += " AND time >= ?"
                    extra.append(since)
                if until:
                    q += " AND time <= ?"
                    extra.append(until)
                ids = {r[0] for r in self.db.execute(q, [*ids, *extra]).fetchall()}
        return ids

    def search(self, words: list[str], limit: int = 6, since: str | None = None, until: str | None = None,
               before: str | None = None, kinds: tuple[str, ...] | None = None) -> list[Episode]:
        """단서들로 일화를 찾는다. 드문 단서에 맞을수록, 여러 단서에 맞을수록 위. before: 이 시각 이후 것은 뺌(지금 대화)."""
        total = max(1, self.count())
        scores: dict[int, float] = {}
        for w in words:
            ids = self._ids_for(w, since, until or before)
            if not ids or len(ids) > total * 0.5 and total > 20:
                continue  # 너무 흔한 말
            idf = math.log(1 + total / len(ids)) * (1.0 + min(len(w), 6) / 6)
            for i in ids:
                scores[i] = scores.get(i, 0.0) + idf
        if not scores:
            return []
        top = sorted(scores.items(), key=lambda x: -x[1])[: limit * 4]
        with self._lock:
            rows = self.db.execute(
                "SELECT id, time, kind, game, text, detail, ref FROM episodes WHERE id IN (%s)" % ",".join("?" * len(top)),
                [i for i, _ in top]).fetchall()
        eps = [Episode(*r, score=scores[r[0]] * KIND_BOOST.get(r[2], 1.0)) for r in rows if not kinds or r[2] in kinds]
        if before:
            eps = [e for e in eps if e.time < before]
        eps.sort(key=lambda e: (-e.score, e.time), reverse=False)
        return eps[:limit]

    def around(self, ep: Episode, n: int = 1) -> list[Episode]:
        """같은 종류의 바로 앞뒤 일화 (그때 대화 흐름). '기억해' 한 순간이면 그 앞뒤 대화."""
        kind = "chat" if ep.kind == "moment" else ep.kind
        with self._lock:
            before = self.db.execute("SELECT id, time, kind, game, text, detail, ref FROM episodes "
                                     "WHERE kind=? AND time < ? ORDER BY time DESC LIMIT ?", (kind, ep.time, n)).fetchall()
            after = self.db.execute("SELECT id, time, kind, game, text, detail, ref FROM episodes "
                                    "WHERE kind=? AND time > ? ORDER BY time ASC LIMIT ?", (kind, ep.time, n)).fetchall()
        return [Episode(*r) for r in reversed(before)] + [Episode(*r) for r in after]

    def recent(self, kinds: tuple[str, ...], since: str, until: str, limit: int = 400) -> list[Episode]:
        with self._lock:
            rows = self.db.execute(
                "SELECT id, time, kind, game, text, detail, ref FROM episodes WHERE time >= ? AND time < ? AND kind IN (%s) "
                "ORDER BY time LIMIT ?" % ",".join("?" * len(kinds)), [since, until, *kinds, limit]).fetchall()
        return [Episode(*r) for r in rows]


# ---------------------------------------------------------------- 하루 일기 재료

def diary_material(index: EpisodeIndex, day: str, max_chars: int = 14000) -> str:
    """그날 일화들 → 일기 재료 글 (화면 일지는 같은 상황이 이어지면 하나로)."""
    start, end = f"{day}T00:00:00", f"{day}T23:59:59"
    rows = index.recent(("chat", "said", "screen", "analysis", "game", "lookup"), start, end, limit=3000)
    lines, last = [], ""
    for e in rows:
        body = e.text.replace("\n", " / ")
        if e.kind == "screen":
            key = (e.game, body[:40])
            if str(key) == last:
                continue
            last = str(key)
            line = f"{e.time[11:16]} [화면 {e.game}] {body[:160]}"
        else:
            line = f"{e.time[11:16]} [{KIND_LABEL.get(e.kind, e.kind)}] {body[:400]}"
        lines.append(line)
    text = "\n".join(lines)
    if len(text) > max_chars:  # 너무 길면 화면 일지를 솎아 냄 (대화·분석은 남김)
        keep = [ln for ln in lines if "[화면 " not in ln]
        screens = [ln for ln in lines if "[화면 " in ln]
        step = max(1, len(screens) // max(1, (max_chars - sum(len(k) for k in keep)) // 120))
        text = "\n".join(sorted(keep + screens[::step]))[:max_chars]
    return text


# ---------------------------------------------------------------- 떠올리기 (대화에 붙일 글)

SCREEN_HEAD = ("[지금 화면과 이어지는 예전 일 — 실제로 있었던 일(이 PC 기록). 정말 관련 있을 때만 '저번에도 …' 처럼 짧게 "
               "이어서 말해도 된다. 억지로 꺼내지 않는다]")


def recall_block(index: EpisodeIndex, text: str, now: datetime, recent_since: str | None = None,
                 window: tuple[datetime, datetime] | None = None, max_chars: int = 2600, for_screen: bool = False,
                 min_score: float = 6.0) -> tuple[str, list[Episode]]:
    """주인님 말 → (대화에 붙일 '떠오른 기억' 글, 찾은 일화들). 떠올리라는 말이 아니면 아주 확실한 것만.
    for_screen: 화면 대사용 (떠올리라는 말은 없음, 더 확실한 것 2개까지만)."""
    intent = bool(RECALL_INTENT.search(text or "")) and not for_screen
    words = cues(text)
    if not words:
        return "", []
    since = window[0].isoformat(timespec="seconds") if window else None
    until = window[1].isoformat(timespec="seconds") if window else None
    eps = index.search(words, limit=6 if intent else 2 if for_screen else 3, since=since, until=until,
                       before=recent_since)
    if not intent:  # 묻지 않았는데 끼워 넣는 건 드문 이름이 2개 넘게 맞거나 아주 드문 것 하나일 때만
        eps = [e for e in eps if e.score >= min_score]
    if not eps:
        return "", []
    lines = []
    size = 0
    for e in eps:
        label = KIND_LABEL.get(e.kind, e.kind)
        game = f"({e.game})" if e.game and e.kind in ("screen", "game") else ""
        body = e.text.replace("\n", " / ")
        if intent and e.kind in ("chat", "moment"):  # 그때 대화의 앞뒤도
            ctx = " … ".join(x.text.replace("\n", " / ")[:160] for x in index.around(e, 1))
            if ctx:
                body += f"\n    (그때 앞뒤 대화: {ctx})"
        line = f"- {e.when()} {label}{game}: {body}"
        if size + len(line) > max_chars and lines:
            break
        lines.append(line[:900])
        size += len(line)
    head = SCREEN_HEAD if for_screen else (
        "[떠오른 기억 — 예전에 실제로 있었던 일이다(이 PC 기록). 시각을 보고 '그때' 일로 자연스럽게 떠올리듯 말한다. "
        "주인님이 묻는 그 일이 맞는지 시각·내용으로 확인하고, 아니면 아니라고 한다. 기록을 그대로 읽지 않는다]")
    return head + "\n" + "\n".join(lines), eps
