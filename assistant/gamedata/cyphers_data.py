"""사이퍼즈 전적: 네오플 공식 오픈 API (developers.neople.co.kr). 게임 프로그램은 건드리지 않는다.

- 주인님 API 키(설정 창, 이 PC 에 암호화 저장)와 닉네임으로 플레이어를 찾고 최근 공식전·일반전 기록을 받는다.
- 공식 기록은 1시간마다 갱신된다(방금 끝난 판은 결과 화면으로 총평).
- 응답 항목 이름을 짐작해서 쓰지 않으려고, 받은 JSON 에서 필요한 부분을 유연하게 찾아 줄이고 그대로 다니카에게 넘긴다.
  처음 받았을 때 구조(키 이름)를 기록(app.log)에 남긴다.
"""

from __future__ import annotations

import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Callable

log = logging.getLogger("assistant.cyphers")
API = "https://api.neople.co.kr/cy"
# 줄여서 넘길 때 남길 만한 항목 (이름에 이 글자가 들어간 키)
KEEP = ("result", "character", "kill", "death", "assist", "attack", "damage", "battle", "sight", "playtime", "level",
        "position", "date", "map", "party", "win", "lose", "stop", "rating", "grade", "tier", "nickname", "clan",
        "item", "name", "count", "point", "random")


def http_json(url: str, timeout: float = 20.0) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": "danika-assistant/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def find_list(obj: Any, key: str) -> list[dict]:
    """JSON 어디에 있든 key 를 가진 dict 들의 목록을 찾는다 (예: matchId 를 가진 경기 목록)."""
    if isinstance(obj, list):
        if obj and all(isinstance(x, dict) for x in obj) and any(key in x for x in obj):
            return obj
        for x in obj:
            found = find_list(x, key)
            if found:
                return found
    elif isinstance(obj, dict):
        for v in obj.values():
            found = find_list(v, key)
            if found:
                return found
    return []


def shrink(obj: Any, depth: int = 0) -> Any:
    """경기 하나를 다니카가 읽기 좋게 줄인다: 쓸모 있어 보이는 키만, 너무 깊은 건 버림."""
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            low = k.lower()
            wanted = any(w in low for w in KEEP) and not low.endswith("id")  # 아이디 값은 다니카에게 쓸모없음
            nested = isinstance(v, (dict, list)) and depth < 2
            if wanted or nested:
                s = shrink(v, depth + 1)
                if s not in (None, {}, [], ""):
                    out[k] = s
        return out
    if isinstance(obj, list):
        return [shrink(x, depth + 1) for x in obj[:8]]
    return obj


def describe_keys(obj: Any, depth: int = 0) -> str:
    """처음 받은 응답의 구조를 기록에 남기기 위한 키 이름 요약."""
    if isinstance(obj, dict) and depth < 6:
        return "{" + ", ".join(f"{k}:{describe_keys(v, depth + 1)}" for k, v in list(obj.items())[:20]) + "}"
    if isinstance(obj, list):
        return "[" + (describe_keys(obj[0], depth + 1) if obj else "") + "]"
    return type(obj).__name__


class CyphersData:
    def __init__(self, folder: Path, api_key: Callable[[], str | None], nickname: str = "",
                 fetch: Callable[[str], Any] = http_json, clock: Callable[[], float] = time.time):
        self.folder = folder
        self.api_key = api_key
        self.nickname = nickname.strip()
        self.fetch = fetch
        self.clock = clock
        self.player_id = ""
        self.player: dict = {}
        self.matches: dict[str, list[dict]] = {}
        self.fetched_at: float | None = None
        self.last_error = ""
        self._logged_shape = False

    @property
    def ready(self) -> bool:
        return bool(self.api_key() and self.nickname)

    def _get(self, path: str, **params) -> Any:
        params["apikey"] = self.api_key() or ""
        url = f"{API}{path}?{urllib.parse.urlencode(params)}"
        return self.fetch(url)

    def refresh(self) -> bool:
        if not self.ready:
            return False
        try:
            if not self.player_id:
                found = find_list(self._get("/players", nickname=self.nickname, wordType="match"), "playerId")
                exact = [p for p in found if str(p.get("nickname", "")) == self.nickname] or found
                if not exact:
                    self.last_error = f"사이퍼즈에서 '{self.nickname}' 닉네임을 찾지 못했어요."
                    return False
                self.player_id = str(exact[0]["playerId"])
            self.player = self._get(f"/players/{self.player_id}")
            for kind in ("rating", "normal"):
                raw = self._get(f"/players/{self.player_id}/matches", gameTypeId=kind, limit=10)
                if not self._logged_shape:
                    log.info("사이퍼즈 응답 구조(경기 기록): %s", describe_keys(raw))
                    self._logged_shape = True
                self.matches[kind] = find_list(raw, "matchId")
        except urllib.error.HTTPError as exc:
            self.last_error = _error(exc)
            log.warning("사이퍼즈 전적 받기 실패: %s", exc)
            return False
        except Exception as exc:  # noqa: BLE001
            self.last_error = f"사이퍼즈 전적을 받지 못했어요: {exc}"
            log.warning("사이퍼즈 전적 받기 실패: %r", exc)
            return False
        self.fetched_at = self.clock()
        self.last_error = ""
        return True

    def context_text(self, per_kind: int = 6) -> str:
        if self.fetched_at is None:
            return ""
        mins = int((self.clock() - self.fetched_at) // 60)
        lines = [f"[주인님 사이퍼즈 전적 (공식 API 실제 데이터, {mins}분 전에 받음, 공식 기록은 1시간마다 갱신. "
                 f"이 숫자를 근거로 말하고 없는 건 지어내지 않는다)]",
                 "플레이어: " + json.dumps(shrink(self.player), ensure_ascii=False)[:800]]
        for kind, label in (("rating", "공식전"), ("normal", "일반전")):
            rows = self.matches.get(kind) or []
            if rows:
                lines.append(f"{label} 최근 {min(len(rows), per_kind)}판 (최신부터):")
                lines += ["- " + json.dumps(shrink(m), ensure_ascii=False)[:700] for m in rows[:per_kind]]
        return "\n".join(lines)


def _error(exc: urllib.error.HTTPError) -> str:
    try:
        body = json.loads(exc.read().decode("utf-8"))
        code = str(body.get("error", {}).get("code", ""))
    except Exception:  # noqa: BLE001
        code = ""
    if exc.code in (401, 403) or code.startswith("API0"):
        return "사이퍼즈 API 키가 맞지 않아요. 설정 창에서 다시 확인해 주세요."
    if exc.code == 429:
        return "사이퍼즈 API 요청이 많아 잠시 뒤에 다시 받을게요."
    return f"사이퍼즈 API 오류({exc.code} {code})"
