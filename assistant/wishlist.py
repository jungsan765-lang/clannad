"""개선 요청 메모: 주인님이 바라는 기능이나 다니카가 못 했던 일을 모아 둔다 (data/requests.json).

메뉴 '개선 요청 메모'에서 보고 복사해 개발 채팅에 붙여넣으면, 만들어서 업데이트로 보낸다.
"""

from __future__ import annotations

import json
import threading
from datetime import datetime
from pathlib import Path


class Wishlist:
    def __init__(self, path: Path):
        self.path = path
        self._lock = threading.Lock()
        try:
            self.items: list[dict] = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            self.items = []

    def add(self, text: str, when: datetime | None = None) -> bool:
        text = " ".join(str(text).split())[:200]
        if not text or any(i["text"] == text for i in self.items):
            return False
        with self._lock:
            self.items.append({"date": (when or datetime.now()).strftime("%Y-%m-%d"), "text": text})
            self._save()
        return True

    def clear(self) -> None:
        with self._lock:
            self.items = []
            self._save()

    def text(self) -> str:
        if not self.items:
            return "(아직 적어 둔 개선 요청이 없어요)"
        lines = [f"다니카 개선 요청 메모 ({len(self.items)}개)"]
        lines += [f"{n}. [{i['date']}] {i['text']}" for n, i in enumerate(self.items, 1)]
        return "\n".join(lines)

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_name(self.path.name + ".tmp")
        tmp.write_text(json.dumps(self.items, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(self.path)
