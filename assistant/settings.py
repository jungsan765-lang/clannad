"""config.toml 과 config.local.toml 을 읽어 합친다."""

from __future__ import annotations

import logging
import re
import tomllib
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
log = logging.getLogger("assistant.settings")
_TABLE = re.compile(r"^\s*\[+\s*([^\]]+?)\s*\]+")
_KEY = re.compile(r"^\s*([A-Za-z0-9_\-.\"']+)\s*=")


def repair_toml(text: str) -> str:
    """같은 표 안에서 같은 이름이 또 나오면 뒤의 줄을 지운다 (먼저 나온 값을 쓴다)."""
    table, seen, out = "", set(), []
    for line in text.splitlines(keepends=True):
        m = _TABLE.match(line)
        if m:
            table = m.group(1)
        else:
            k = _KEY.match(line)
            if k:
                name = (table, k.group(1).strip("\"'"))
                if name in seen:
                    out.append("# (같은 이름이 두 번 있어 무시함) " + line)
                    continue
                seen.add(name)
        out.append(line)
    return "".join(out)


def parse_toml(text: str, name: str) -> dict:
    try:
        return tomllib.loads(text)
    except tomllib.TOMLDecodeError as exc:
        try:
            data = tomllib.loads(repair_toml(text))
        except tomllib.TOMLDecodeError:
            raise ValueError(f"{name} 문법 오류: {exc}") from exc
        log.warning("%s 에 같은 이름이 두 번 있어 먼저 나온 값을 씁니다: %s", name, exc)
        return data


def _merge(base: dict, extra: dict) -> dict:
    out = dict(base)
    for key, value in extra.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _merge(out[key], value)
        else:
            out[key] = value
    return out


class Settings:
    """settings.get("ai.chat_model") 처럼 점으로 꺼내 쓴다."""

    def __init__(self, data: dict, root: Path):
        self.data = data
        self.root = root

    @classmethod
    def load(cls, root: Path = HERE) -> "Settings":
        data: dict = {}
        for name in ("config.toml", "config.local.toml"):
            path = root / name
            if path.is_file():
                data = _merge(data, parse_toml(path.read_text(encoding="utf-8"), name))
        return cls(data, root)

    def get(self, dotted: str, default: Any = None) -> Any:
        node: Any = self.data
        for part in dotted.split("."):
            if not isinstance(node, dict) or part not in node:
                return default
            node = node[part]
        return node

    def set(self, dotted: str, value: Any) -> None:
        node = self.data
        parts = dotted.split(".")
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = value

    def path(self, dotted: str, default: str | None = None) -> Path | None:
        value = self.get(dotted, default)
        if not value:
            return None
        p = Path(value).expanduser()
        return p if p.is_absolute() else (self.root / p)

    @property
    def data_dir(self) -> Path:
        d = self.path("app.data_dir", "data")
        assert d is not None
        d.mkdir(parents=True, exist_ok=True)
        return d
