"""코인: 캐릭터들에게 절대적인 가치가 있는 화폐. 주인님만 주거나 뺏을 수 있다 (data/coins.json).

캐릭터마다 잔액이 따로 있고, 오간 기록이 남는다. 캐릭터가 자리에 없을 때 오간 것은 다음에 나왔을 때 알게 된다.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from pathlib import Path

log = logging.getLogger(__name__)

START = 10  # 처음 가진 코인
MAX_STEP = 10_000  # 한 번에 오갈 수 있는 최대 개수 (잘못 알아들어 큰 숫자가 오가는 걸 막음)
FEEL_SECONDS = 3600.0  # 받거나 뺏긴 감정이 이만큼 남는다


def level_text(n: int) -> str:
    """잔액에 따른 기본 마음 (늘 깔려 있는 것)."""
    if n <= 0:
        return "빈털터리다. 코인이 하나도 없어서 불안하고 비참하다"
    if n < 5:
        return "거의 바닥났다. 초조하고 한 개 한 개가 아깝다"
    if n < 20:
        return "그럭저럭 있다"
    if n < 50:
        return "넉넉하다. 마음에 여유가 있다"
    return "부자다. 기분이 아주 좋고 너그럽다"


class CoinBank:
    def __init__(self, path: Path, start: int = START):
        self.path = Path(path)
        self.start = start
        self._lock = threading.Lock()
        self.data = {"balances": {}, "log": []}
        try:
            if self.path.is_file():
                loaded = json.loads(self.path.read_text(encoding="utf-8"))
                if isinstance(loaded, dict):
                    self.data["balances"] = dict(loaded.get("balances") or {})
                    self.data["log"] = list(loaded.get("log") or [])
        except Exception as exc:  # noqa: BLE001 - 깨진 파일이면 새로 시작 (원본은 남겨 둠)
            log.warning("코인 파일을 못 읽음 (새로 시작): %r", exc)
            try:
                self.path.replace(self.path.with_suffix(".broken.json"))
            except OSError:
                pass

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.data, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(self.path)

    def balance(self, who: str) -> int:
        return int(self.data["balances"].get(who, self.start))

    def change(self, who: str, delta: int, how: str = "board", told: bool = True, now: float | None = None) -> int:
        """코인을 주거나(+) 뺏는다(-). 0 밑으로는 안 내려간다. 실제로 바뀐 개수를 돌려준다.
        told: 그 캐릭터가 이 일을 이미 안다 (자리에 없을 때 오간 건 False → 다음에 나왔을 때 알게 됨)."""
        delta = max(-MAX_STEP, min(MAX_STEP, int(delta)))
        with self._lock:
            before = self.balance(who)
            after = max(0, before + delta)
            moved = after - before
            if moved == 0:
                return 0
            self.data["balances"][who] = after
            self.data["log"].append({"t": now if now is not None else time.time(), "who": who, "delta": moved,
                                     "balance": after, "how": how, "told": told})
            self.data["log"] = self.data["log"][-500:]
            self._save()
        log.info("코인 %s %+d → %d (%s)", who, moved, after, how)
        return moved

    def history(self, who: str | None = None, limit: int = 30) -> list[dict]:
        rows = [r for r in self.data["log"] if who is None or r.get("who") == who]
        return list(reversed(rows[-limit:]))

    def untold(self, who: str) -> list[dict]:
        return [r for r in self.data["log"] if r.get("who") == who and not r.get("told", True)]

    def mark_told(self, who: str) -> None:
        with self._lock:
            changed = False
            for r in self.data["log"]:
                if r.get("who") == who and not r.get("told", True):
                    r["told"] = True
                    changed = True
            if changed:
                self._save()

    def recent_delta(self, who: str, now: float | None = None, within: float = FEEL_SECONDS) -> tuple[int, float | None]:
        """최근(1시간) 받은 것과 뺏긴 것의 합, 마지막으로 오간 뒤 지난 초."""
        now = now if now is not None else time.time()
        rows = [r for r in self.data["log"] if r.get("who") == who and r.get("told", True) and now - r["t"] <= within]
        if not rows:
            return 0, None
        return sum(int(r["delta"]) for r in rows), now - rows[-1]["t"]

    def feeling(self, who: str, now: float | None = None) -> str:
        """대화·화면 한마디에 붙이는 '지금 네 코인' 줄."""
        n = self.balance(who)
        text = f"[지금 네 코인: {n}개 — {level_text(n)}"
        delta, ago = self.recent_delta(who, now)
        if ago is not None and delta:
            mins = int(ago // 60)
            when = "방금" if mins < 1 else f"{mins}분 전"
            strength = "아직 감정이 아주 크게 요동친다" if ago < 600 else ("아직 크게 남아 있다" if ago < 1800 else "아직 마음에 남아 있다")
            what = f"주인님에게 코인 {delta}개를 받았다" if delta > 0 else f"주인님에게 코인 {-delta}개를 뺏겼다"
            text += f". {when}(최근 1시간 합계) {what} — {strength}"
        return text + ". 코인 얘기는 이 숫자가 사실이다]"
