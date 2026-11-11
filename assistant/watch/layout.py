"""게임 화면 배치: 그 게임의 UI(체력·미니맵·퀘스트 안내·자막·대화창 …)가 화면 어디에 있는지.

처음 그 게임을 볼 때 조용한 순간에 화면 한 장을 보고 한 번 익혀서 data/layout/<게임>.json 에 둔다
(평소 화면·컷신 화면 따로). 이렇게 해 두면
- 판단·대사에 '이 자리는 UI' 라고 알려 줘서, 덧그린 정보를 세상 속 물건으로 착각하거나 놓치지 않고
- 자막·대화창 자리를 원래 크기로 따로 잘라 읽을 수 있다 (작은 사진으로는 대사가 안 보인다).
주인님이 "UI 다시 익혀" 하면 지우고 다음 조용한 순간에 다시 본다.
"""

from __future__ import annotations

import json
import re
import threading
from datetime import datetime, timedelta
from pathlib import Path

KINDS = {
    "subtitle": "자막", "dialogue": "대화창", "hp": "체력·자원", "minimap": "미니맵·지도", "quest": "퀘스트·목표 안내",
    "skill": "기술·단축키", "chat": "채팅", "score": "점수·시간·킬", "notice": "알림·획득", "team": "아군·파티",
    "enemy": "적·보스 정보", "menu": "메뉴·버튼", "other": "기타",
}
TEXT_KINDS = ("subtitle", "dialogue")  # 원래 크기로 따로 잘라 읽을 자리
SCENES = {"playing": "평소 플레이", "cutscene": "컷신·대화"}
DEFAULT_TEXT_BOX = ("자막·대사 자리", (0.10, 0.72, 0.90, 0.97))  # 아직 모를 때: 대부분 게임의 자막·대화창 자리


def _safe(name: str) -> str:
    return re.sub(r'[\\/:*?"<>|\s]+', "_", name).strip("_") or "game"


def _where(box) -> str:
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    h = "왼쪽" if cx < 0.34 else "오른쪽" if cx > 0.66 else "가운데"
    v = "위" if cy < 0.34 else "아래" if cy > 0.66 else "가운데"
    if h == v == "가운데":
        return "한가운데"
    if h == "가운데":
        return f"{v} 가운데"
    return f"{h} {v}" if v != "가운데" else f"{h} 가운데"


def clean_regions(raw) -> list[dict]:
    """모델이 준 자리들을 다듬는다: 종류는 아는 것만, 상자는 0~1 안으로, 너무 작거나 화면 대부분인 건 버림."""
    out = []
    for r in raw or []:
        if not isinstance(r, dict):
            continue
        try:
            x0, y0, x1, y1 = (min(1.0, max(0.0, float(v))) for v in r.get("box", []))
        except (TypeError, ValueError):
            continue
        x0, x1 = min(x0, x1), max(x0, x1)
        y0, y1 = min(y0, y1), max(y0, y1)
        if x1 - x0 < 0.01 or y1 - y0 < 0.01 or (x1 - x0) * (y1 - y0) > 0.5:
            continue
        kind = str(r.get("kind", "other"))
        name = " ".join(str(r.get("name", "")).split())[:24] or KINDS.get(kind, "기타")
        out.append({"name": name, "kind": kind if kind in KINDS else "other",
                    "box": [round(x0, 3), round(y0, 3), round(x1, 3), round(y1, 3)],
                    "when": " ".join(str(r.get("when", "")).split())[:20]})
    return out[:16]


class Layouts:
    def __init__(self, folder: Path, clock=datetime.now):
        self.folder = folder
        self.clock = clock
        self._lock = threading.Lock()
        self._cache: dict[str, dict] = {}

    def _path(self, game: str) -> Path:
        return self.folder / f"{_safe(game)}.json"

    def get(self, game: str) -> dict:
        with self._lock:
            if game not in self._cache:
                try:
                    self._cache[game] = json.loads(self._path(game).read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    self._cache[game] = {}
            return self._cache[game]

    def _write(self, game: str, data: dict) -> None:
        self.folder.mkdir(parents=True, exist_ok=True)
        tmp = self._path(game).with_suffix(".tmp")
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        tmp.replace(self._path(game))
        with self._lock:
            self._cache[game] = data

    def learned(self, game: str, scene: str) -> bool:
        return scene in self.get(game).get("scenes", {})

    def tried_recently(self, game: str, scene: str, minutes: float = 20) -> bool:
        at = self.get(game).get("tries", {}).get(scene)
        try:
            return at is not None and self.clock() - datetime.fromisoformat(at) < timedelta(minutes=minutes)
        except ValueError:
            return False

    def mark_try(self, game: str, scene: str) -> None:
        data = dict(self.get(game))
        data["tries"] = dict(data.get("tries", {}), **{scene: self.clock().isoformat(timespec="seconds")})
        self._write(game, data)

    def save(self, game: str, scene: str, regions: list[dict]) -> None:
        data = dict(self.get(game))
        scenes = dict(data.get("scenes", {}))
        scenes[scene] = {"regions": clean_regions(regions), "at": self.clock().isoformat(timespec="minutes")}
        data["scenes"] = scenes
        self._write(game, data)

    def forget(self, game: str) -> None:
        self._write(game, {})

    def regions(self, game: str) -> list[dict]:
        out = []
        for scene, entry in self.get(game).get("scenes", {}).items():
            for r in entry.get("regions", []):
                out.append(dict(r, scene=scene))
        return out

    def text_boxes(self, game: str) -> list[tuple[str, tuple[float, float, float, float]]]:
        """따로 잘라 읽을 자리 (자막·대화창). 익힌 게 없으면 흔한 자리 하나."""
        boxes, seen = [], []
        for r in self.regions(game):
            if r["kind"] not in TEXT_KINDS:
                continue
            box = tuple(r["box"])
            if any(_overlap(box, b) > 0.6 for b in seen):
                continue  # 평소·컷신에서 같은 자리
            seen.append(box)
            boxes.append((r["name"], box))
        boxes = boxes[:3]
        if not any(_overlap(DEFAULT_TEXT_BOX[1], b) > 0.6 for b in seen):
            boxes.append(DEFAULT_TEXT_BOX)  # 익힌 자리가 엉뚱해도 흔한 자막 자리는 계속 본다
        return boxes

    def describe(self, game: str) -> str:
        regions = self.regions(game)
        if not regions:
            return ""
        lines = [f"## {game} 화면 배치 (게임 세상 위에 덧그린 UI 자리. [왼쪽, 위, 오른쪽, 아래] 는 화면을 0~1 로 본 비율)"]
        for r in regions:
            when = r.get("when") or SCENES.get(r.get("scene", ""), "")
            lines.append(f"- {r['name']}({KINDS.get(r['kind'], '기타')}): {_where(r['box'])} {r['box']}"
                         + (f" — {when}" if when else ""))
        lines.append("이 자리의 그림·글은 UI 다. 세상 속 사람·물건으로 착각하지 않는다. 체력 막대가 확 줄거나 알림이 뜨는 것처럼 "
                     "UI 가 바뀌면 사건 판단에 쓰고, 자막·대화창 글은 장면을 이해하는 데 쓴다 (그대로 읽어 주지는 않는다).")
        return "\n".join(lines)


def _overlap(a, b) -> float:
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    inter = ix * iy
    small = min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1]))
    return inter / small if small > 0 else 0.0
