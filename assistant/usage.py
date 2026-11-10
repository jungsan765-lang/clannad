"""API 사용량과 비용 기록 (data/usage.json)."""

from __future__ import annotations

import json
import threading
from datetime import date
from pathlib import Path

# 1M 토큰당 달러: (입력, 출력, 캐시 읽기, 5분 캐시 쓰기). 2026-11 기준 Anthropic 공개 가격.
PRICES: dict[str, tuple[float, float, float, float]] = {
    "claude-opus-5-5": (4.00, 20.00, 0.20, 5.00),
    "claude-opus-5": (5.00, 25.00, 0.50, 6.25),
    "claude-opus-4-8": (5.00, 25.00, 0.50, 6.25),
    "claude-sonnet-5-5": (2.00, 10.00, 0.10, 2.50),
    "claude-sonnet-5": (2.00, 10.00, 0.20, 2.50),
    "claude-haiku-5-5": (0.10, 0.50, 0.01, 0.125),
    "claude-fable-5-2": (8.00, 40.00, 0.20, 10.00),
}
UNKNOWN_PRICE = PRICES["claude-opus-5-5"]
WEB_SEARCH_USD = 0.01  # 웹 검색 1번 (1,000번에 10달러) + 결과 글은 입력 토큰으로 따로


def price_for(model: str) -> tuple[float, float, float, float]:
    for name, price in PRICES.items():
        if model == name or model.startswith(name + "-"):
            return price
    return UNKNOWN_PRICE


def cost_usd(model: str, usage: dict) -> float:
    pin, pout, pread, pwrite = price_for(model)
    return (
        usage.get("input_tokens", 0) * pin
        + usage.get("output_tokens", 0) * pout
        + usage.get("cache_read_input_tokens", 0) * pread
        + usage.get("cache_creation_input_tokens", 0) * pwrite
        + usage.get("cache_creation_1h_input_tokens", 0) * pin * 2  # 1시간 캐시 쓰기 = 입력 값의 2배
    ) / 1_000_000 + usage.get("web_search_requests", 0) * WEB_SEARCH_USD


class UsageLedger:
    """하루 단위로 비용을 모은다. 여러 스레드에서 불러도 안전."""

    def __init__(self, path: Path, krw_per_usd: float = 1400.0):
        self.path = path
        self.krw_per_usd = krw_per_usd
        self._lock = threading.Lock()
        try:
            self.data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            self.data = {"days": {}}

    def record(self, model: str, usage: dict, kind: str, today: date | None = None) -> float:
        usd = cost_usd(model, usage)
        key = (today or date.today()).isoformat()
        with self._lock:
            day = self.data["days"].setdefault(key, {"usd": 0.0, "calls": 0, "by_kind": {}, "tokens": {}})
            day["usd"] += usd
            day["calls"] += 1
            day["by_kind"][kind] = day["by_kind"].get(kind, 0.0) + usd
            for k, v in usage.items():
                day["tokens"][k] = day["tokens"].get(k, 0) + int(v or 0)
            self._save()
        return usd

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.data, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(self.path)

    def day_usd(self, today: date | None = None) -> float:
        return self.data["days"].get((today or date.today()).isoformat(), {}).get("usd", 0.0)

    def month_usd(self, today: date | None = None) -> float:
        prefix = (today or date.today()).isoformat()[:7]
        return sum(d["usd"] for k, d in self.data["days"].items() if k.startswith(prefix))

    def krw(self, usd: float) -> int:
        return round(usd * self.krw_per_usd)
