"""하루·주간 정리와 켤 때 브리핑에 쓸 사실 모으기 (이 PC 의 기록만, 비용 없음).

- 게임별 한 시간: 화면 기억 일지(data/screens)의 장면 시각으로 어림한다 (10분 넘게 비면 끊긴 것으로 본다).
- 대화 수: data/logs/날짜.jsonl
- 사이퍼즈: 받아 둔 공식 기록 중 그 기간 판들의 승패·캐릭터
- 할 일: 그 기간에 끝낸 것, 남은 것
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

GAP_MINUTES = 10


def period(kind: str, now: datetime) -> tuple[datetime, datetime, str]:
    if kind == "week":
        start = datetime.combine((now - timedelta(days=6)).date(), datetime.min.time())
        return start, now, f"{start:%m/%d}~{now:%m/%d} (최근 7일)"
    if kind == "yesterday":
        day = (now - timedelta(days=1)).date()
        start = datetime.combine(day, datetime.min.time())
        return start, start + timedelta(days=1), f"어제 {day:%m/%d}"
    start = datetime.combine(now.date(), datetime.min.time())
    return start, now, f"오늘 {now:%m/%d}"


def play_minutes(entries) -> dict[str, float]:
    """화면 기억 장면들 → 모드별 대략 시간(분). 같은 모드 장면이 10분 안에 이어지면 그 사이를 더한다."""
    out: dict[str, float] = {}
    last = None
    for e in sorted(entries, key=lambda e: e.time):
        if last is not None and e.mode == last.mode and e.mode:
            gap = (e.time - last.time).total_seconds() / 60
            if gap <= GAP_MINUTES:
                out[e.mode] = out.get(e.mode, 0.0) + gap
        last = e
    return out


def chat_count(logs_dir: Path, start: datetime, end: datetime) -> int:
    n = 0
    day = start.date()
    while day <= end.date():
        try:
            for line in (logs_dir / f"{day.isoformat()}.jsonl").read_text(encoding="utf-8").splitlines():
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if "user" in row and not str(row["user"]).startswith("("):
                    n += 1
        except OSError:
            pass
        day += timedelta(days=1)
    return n


def cyphers_lines(cyphers, start: datetime, end: datetime) -> list[str]:
    if cyphers is None or not getattr(cyphers, "matches", None):
        return []
    from gamedata.cyphers_data import find_value, is_win

    rows = []
    for m in cyphers.all_matches():
        try:
            when = datetime.fromisoformat(str(find_value(m, ("date",)) or "").replace(" ", "T"))
        except ValueError:
            continue
        if start <= when <= end:
            rows.append((str(find_value(m, ("charactername",)) or "?"), is_win(find_value(m, ("result",)))))
    if not rows:
        return []
    wins = sum(w for _, w in rows)
    chars: dict[str, list[int]] = {}
    for name, w in rows:
        c = chars.setdefault(name, [0, 0])
        c[0] += 1
        c[1] += w
    per = ", ".join(f"{n} {g}판 {w}승" for n, (g, w) in sorted(chars.items(), key=lambda x: -x[1][0]))
    return [f"사이퍼즈 공식 기록(받아 둔 최근 판 기준): {len(rows)}판 {wins}승 {len(rows) - wins}패 / {per}"]


def collect(kind: str, now: datetime, screen_log=None, logs_dir: Path | None = None, cyphers=None,
            planner=None) -> tuple[str, str]:
    """(기간 이름, 사실 글). 사실이 하나도 없으면 글은 빈 문자열."""
    start, end, label = period(kind, now)
    lines = []
    if screen_log is not None:
        entries = screen_log.entries(start, end)
        mins = play_minutes(entries)
        if mins:
            lines.append("화면으로 본 시간(대략): " + ", ".join(
                f"{mode} {m / 60:.1f}시간" if m >= 60 else f"{mode} {m:.0f}분"
                for mode, m in sorted(mins.items(), key=lambda x: -x[1])))
        said = [e for e in entries if e.said]
        if said:
            lines.append("그동안 화면 보고 한 말 몇 개: " + " / ".join(e.said[:60] for e in said[-6:]))
        diary = screen_log.diary(start, end, max_lines=25) if kind != "week" else ""
        if diary:
            lines.append("화면 일지:\n" + diary)
    if logs_dir is not None:
        n = chat_count(logs_dir, start, end)
        if n:
            lines.append(f"주인님이 말 건 횟수: {n}번")
    lines += cyphers_lines(cyphers, start, end)
    if planner is not None:
        done = [t["text"] for t in planner.todos if t.get("done") and start.date().isoformat() <= t.get("done_date", "")]
        if done:
            lines.append("끝낸 할 일: " + ", ".join(done))
        if planner.open_todos():
            lines.append("남은 할 일: " + ", ".join(t["text"] + (f"(기한 {t['due']})" if t["due"] else "")
                                               for t in planner.open_todos()[:8]))
    return label, "\n".join(lines)
