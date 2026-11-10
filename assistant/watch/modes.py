"""게임 모드: 맨 앞 창의 프로그램 이름이나 창 제목으로 자동 전환. modes/*.toml 하나가 게임 하나.

모드가 정하는 것
- knowledge: 그 게임 설명과 코칭 기준 (판단·대사 둘 다에 들어감)
- interval_seconds / cooldown_seconds: 확인 간격, 먼저 말 거는 최소 간격
- quiet_during_play: 플레이 중엔 말하지 않음 (리듬 게임처럼 집중이 필요한 게임)
- review_on_result: 결과 화면이 뜨면 이번 판 기록으로 총평
- urgent: 대기 시간을 무시하고 바로 말해야 하는 상황 (예: 칸코레 대파 진격)
"""

from __future__ import annotations

import logging
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

NORMAL_KNOWLEDGE = """평소 모드. 주인님이 컴퓨터로 무엇을 하는지 가끔 보고, 꼭 필요할 때만 짧게 말을 건다.
게임 화면이면 일반적인 코칭(위치·타이밍·판단 중 하나를 구체적으로), 오류 창이면 원인과 할 일, 영상·글이면 짧은 감상."""


log = logging.getLogger("assistant.watch")


@dataclass
class Mode:
    name: str
    processes: list[str] = field(default_factory=list)  # 소문자 실행 파일 이름
    titles: list[str] = field(default_factory=list)  # 창 제목에 들어 있으면 이 모드
    interval_seconds: float = 30.0
    cooldown_seconds: float = 120.0
    knowledge: str = NORMAL_KNOWLEDGE
    quiet_during_play: bool = False
    review_on_result: bool = False
    urgent: str = ""
    is_game: bool = False

    def matches(self, process: str, title: str) -> bool:
        p = (process or "").lower()
        t = (title or "").lower()
        return (p and p in self.processes) or any(k.lower() in t for k in self.titles if k)


def load_modes(folder: Path) -> list[Mode]:
    modes = []
    if folder.is_dir():
        for path in sorted(folder.glob("*.toml")):
            try:
                from settings import parse_toml

                d = parse_toml(path.read_text(encoding="utf-8"), path.name)
            except (OSError, ValueError, UnicodeDecodeError) as exc:
                log.warning("게임 모드 파일을 읽지 못해 건너뜀: %s", exc)
                continue
            modes.append(Mode(
                name=d.get("name", path.stem),
                processes=[p.lower() for p in d.get("processes", [])],
                titles=list(d.get("titles", [])),
                interval_seconds=float(d.get("interval_seconds", 30)),
                cooldown_seconds=float(d.get("cooldown_seconds", 120)),
                knowledge=str(d.get("knowledge", "")).strip(),
                quiet_during_play=bool(d.get("quiet_during_play", False)),
                review_on_result=bool(d.get("review_on_result", False)),
                urgent=str(d.get("urgent", "")).strip(),
                is_game=True,
            ))
    return modes


def _toml_str(value: str) -> str:
    import json

    return json.dumps(str(value), ensure_ascii=False)  # JSON 문자열은 TOML 기본 문자열로도 그대로 읽힌다


def save_mode(folder: Path, process: str, data: dict) -> Path:
    """다니카가 만든 게임 모드를 파일로 저장한다 (data/modes/, 업데이트가 건드리지 않는 곳)."""
    import re

    titles = [t for t in data.get("titles", []) if str(t).strip()][:3]
    lines = [
        f"# {data.get('name', process)} — 다니카가 자동으로 만든 모드. 고쳐도 되고, 지우면 다시 만들지 않는다.",
        f"name = {_toml_str(data.get('name') or process)}",
        f"processes = [{_toml_str(process.lower())}]",
        "titles = [" + ", ".join(_toml_str(t) for t in titles) + "]",
        f"interval_seconds = {max(10, min(120, int(data.get('interval_seconds', 30))))}",
        f"cooldown_seconds = {max(30, min(600, int(data.get('cooldown_seconds', 120))))}",
        f"quiet_during_play = {'true' if data.get('quiet_during_play') else 'false'}",
        f"review_on_result = {'true' if data.get('review_on_result') else 'false'}",
        f"urgent = {_toml_str(data.get('urgent', ''))}",
        f"knowledge = {_toml_str(data.get('knowledge', ''))}",
    ]
    text = "\n".join(lines) + "\n"
    tomllib.loads(text)  # 깨진 파일은 만들지 않는다
    folder.mkdir(parents=True, exist_ok=True)
    stem = re.sub(r"[^a-z0-9_]+", "_", process.lower().removesuffix(".exe")).strip("_") or "game"
    path = folder / f"auto_{stem}.toml"
    path.write_text(text, encoding="utf-8")
    return path


def detect(process: str, title: str, modes: list[Mode]) -> Mode | None:
    for m in modes:
        if m.matches(process, title):
            return m
    return None
