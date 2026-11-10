"""게임 진행 기억과 일일·주간 숙제 알림.

- 진행 기억(data/progress.json): 게임마다 '어디까지 했는지·지금 목표'. 한 판(세션)이 끝나면 화면으로 본 기록을 싼 모델이
  한 줄로 정리해 갱신한다. 주인님이 "나 지금 5장이야"라고 해도 갱신. 다시 켜면 이어하기 한마디, 스포일러 경계로도 쓴다.
- 숙제 알림: 모드 파일의 daily_reset·weekly_reset 을 보고, 최근에 하던 게임인데 오늘(리셋 뒤) 아직 안 켰으면 밤에 한 번 알린다.
"""

from __future__ import annotations

import json
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Callable

WEEKDAYS = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6,
            "월": 0, "화": 1, "수": 2, "목": 3, "금": 4, "토": 5, "일": 6}


class Progress:
    def __init__(self, folder: Path, clock: Callable[[], datetime] = datetime.now):
        self.path = folder / "progress.json"
        self.clock = clock
        self._lock = threading.Lock()
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            data = {}
        self.games: dict[str, dict] = data.get("games", {})
        self.told: dict[str, str] = data.get("told", {})  # 알림 종류 → 마지막으로 알린 날

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps({"games": self.games, "told": self.told}, ensure_ascii=False, indent=1),
                       encoding="utf-8")
        tmp.replace(self.path)

    # ------------------------------------------------------------ 진행 기억

    def played(self, game: str, when: datetime | None = None) -> None:
        with self._lock:
            g = self.games.setdefault(game, {})
            g["last_played"] = (when or self.clock()).isoformat(timespec="minutes")
            self._save()

    def set_progress(self, game: str, text: str, when: datetime | None = None) -> None:
        text = " ".join((text or "").split())[:400]
        if not game or not text:
            return
        with self._lock:
            g = self.games.setdefault(game, {})
            g["text"] = text
            g["updated"] = (when or self.clock()).isoformat(timespec="minutes")
            self._save()

    def text_for(self, game: str) -> str:
        return self.games.get(game, {}).get("text", "")

    def last_played(self, game: str) -> datetime | None:
        try:
            return datetime.fromisoformat(self.games[game]["last_played"])
        except (KeyError, ValueError):
            return None

    def prompt_text(self, game: str) -> str:
        g = self.games.get(game, {})
        if not g.get("text"):
            return ""
        return (f"[주인님 {game} 진행 ({g.get('updated', '')[:10]} 기준): {g['text']}. "
                "이보다 뒤의 스토리·전개는 스포일러로 보고, 묻지 않으면 먼저 말하지 않는다]")

    # ------------------------------------------------------------ 숙제 알림

    def _last_reset(self, now: datetime, at: str) -> datetime:
        h, m = (int(x) for x in at.split(":"))
        reset = now.replace(hour=h, minute=m, second=0, microsecond=0)
        return reset if reset <= now else reset - timedelta(days=1)

    def chores(self, modes, now: datetime | None = None, remind_at: str = "22:30") -> list[str]:
        """밤 remind_at 이후 한 번: 최근 3일 안에 하던 게임인데 오늘 리셋 뒤 아직 안 켰으면 일일 숙제,
        주간 리셋 전날이면 주간 숙제. 게임마다 하루 한 번."""
        now = now or self.clock()
        rh, rm = (int(x) for x in remind_at.split(":"))
        if (now.hour, now.minute) < (rh, rm) and now.hour >= 5:
            return []
        out = []
        for mode in modes:
            daily = getattr(mode, "daily_reset", "")
            if not daily:
                continue
            last = self.last_played(mode.name)
            if last is None or now - last > timedelta(days=3):
                continue  # 요즘 안 하는 게임은 조용히
            reset = self._last_reset(now, daily)
            today = reset.date().isoformat()  # 리셋 기준 '오늘'
            next_reset = reset + timedelta(days=1)
            if last < reset and self.told.get(f"daily:{mode.name}") != today:
                self.told[f"daily:{mode.name}"] = today
                out.append(f"{mode.name}: 오늘 아직 안 켰다. {mode.daily_note or '일일 숙제'}가 "
                           f"{next_reset:%H:%M}에 초기화된다.")
            weekly = getattr(mode, "weekly_reset", "")
            if weekly:
                day = WEEKDAYS.get(weekly.split()[0].lower()[:3], WEEKDAYS.get(weekly.split()[0][:1]))
                if day is not None and next_reset.weekday() == day and self.told.get(f"weekly:{mode.name}") != today:
                    self.told[f"weekly:{mode.name}"] = today
                    out.append(f"{mode.name}: {mode.weekly_note or '주간 숙제'}가 {next_reset:%m/%d %H:%M}에 초기화된다.")
        if out:
            with self._lock:
                self._save()
        return out
