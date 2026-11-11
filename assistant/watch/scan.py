"""둘러보기: 화면 속 '자세히 볼 만한 것'(표시가 뜬 인물·이름표·빛나는 물건·알림 …)을 하나씩 확대해 알아보고,
중요한 것만 알린다.

1. 판단 담당(5초마다)이 그런 것을 상자(look)로 짚는다 — 평범한 행인·풍경·늘 있는 UI·이미 알아본 것은 빼고.
2. 그 자리를 원래 크기로 잘라 확대 담당(싼 모델)들이 동시에 '무엇인지' 알아본다 (작은 조각이라 한 번에 1원도 안 됨).
3. 이 PC 의 게임 지식에서 그 이름을 찾고, 판정 담당이 중요도를 매긴다 (1 별것 아님 · 2 기억만 · 3 알려 드림).
4. 알아본 것은 게임마다 기억해서(data/scan/<게임>.json) 같은 인물·물건을 다시 알아보느라 돈을 쓰지 않는다.
"""

from __future__ import annotations

import json
import re
import threading
from datetime import datetime
from pathlib import Path

from PIL import Image

KINDS = {"npc": "인물", "quest": "퀘스트", "item": "물건", "enemy": "적", "sign": "간판·글", "notice": "알림",
         "other": "기타"}
IMPORTANCE = {1: "별것 아님", 2: "기억해 둠", 3: "알려 드림"}


def norm(name: str) -> str:
    return re.sub(r"[\s\W_]+", "", (name or "").lower())


def crop_spot(img: Image.Image, box, pad: float = 0.02) -> Image.Image | None:
    """화면 비율 상자를 원래 화면에서 잘라 낸다. 작으면 키워서(글자·표시가 또렷하게), 크면 줄여서."""
    try:
        x0, y0, x1, y1 = (min(1.0, max(0.0, float(v))) for v in box)
    except (TypeError, ValueError):
        return None
    x0, x1 = min(x0, x1), max(x0, x1)
    y0, y1 = min(y0, y1), max(y0, y1)
    if x1 - x0 < 0.01 or y1 - y0 < 0.01 or (x1 - x0) * (y1 - y0) > 0.4:
        return None  # 잘못 짚었거나 화면 대부분 (그건 눈 담당 몫)
    w, h = img.size
    crop = img.crop((max(0, int((x0 - pad) * w)), max(0, int((y0 - pad) * h)),
                     min(w, int((x1 + pad) * w)), min(h, int((y1 + pad) * h))))
    if max(crop.size) < 400:
        k = min(3.0, 400 / max(1, max(crop.size)))
        crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.Resampling.LANCZOS)
    if max(crop.size) > 900:
        k = 900 / max(crop.size)
        crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.Resampling.LANCZOS)
    return crop


def box_overlap(a, b) -> float:
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    union = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - ix * iy
    return ix * iy / union if union > 0 else 0.0


class SeenThings:
    """게임마다 알아본 것: 이름 → 종류·보인 정보·중요도·이유."""

    def __init__(self, folder: Path, clock=datetime.now):
        self.folder = folder
        self.clock = clock
        self._lock = threading.Lock()
        self._cache: dict[str, list[dict]] = {}

    def _path(self, game: str) -> Path:
        return self.folder / (re.sub(r'[\\/:*?"<>|\s]+', "_", game).strip("_") + ".json")

    def items(self, game: str) -> list[dict]:
        with self._lock:
            if game not in self._cache:
                try:
                    self._cache[game] = json.loads(self._path(game).read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    self._cache[game] = []
            return list(self._cache[game])

    def known(self, game: str, name: str) -> dict | None:
        key = norm(name)
        if not key or key in ("이름모름", "모름"):
            return None
        return next((x for x in self.items(game) if norm(x.get("name", "")) == key), None)

    def add(self, game: str, found: list[dict]) -> None:
        items = self.items(game)
        stamp = self.clock().isoformat(timespec="minutes")
        for f in found:
            name = " ".join(str(f.get("name", "")).split())[:40]
            if not norm(name) or norm(name) in ("이름모름", "모름"):
                continue  # 이름 모를 것은 이름으로 기억하지 않는다 (자리·모습으로만 잠깐)
            old = next((x for x in items if norm(x.get("name", "")) == norm(name)), None)
            entry = {"name": name, "kind": f.get("kind", "other"), "info": " ".join(str(f.get("info", "")).split())[:200],
                     "importance": max(1, min(3, int(f.get("importance", 1) or 1))),
                     "why": " ".join(str(f.get("why", "")).split())[:160], "at": stamp,
                     "count": (old or {}).get("count", 0) + 1}
            if old:
                items.remove(old)
            items.append(entry)
        items = items[-300:]
        self.folder.mkdir(parents=True, exist_ok=True)
        tmp = self._path(game).with_suffix(".tmp")
        tmp.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(self._path(game))
        with self._lock:
            self._cache[game] = items

    def seen_again(self, game: str, name: str) -> None:
        items = self.items(game)
        for x in items:
            if norm(x.get("name", "")) == norm(name):
                x["count"] = x.get("count", 0) + 1
        with self._lock:
            self._cache[game] = items

    def brief(self, game: str, limit: int = 15) -> str:
        """판단 담당에게: 이미 알아본 것 (다시 짚지 않게)."""
        items = self.items(game)[-limit:]
        if not items:
            return ""
        return "이미 알아본 것(다시 짚지 않음): " + " / ".join(
            f"{x['name']}({KINDS.get(x.get('kind'), '기타')}, {IMPORTANCE.get(x.get('importance'), '')})" for x in items)
