"""config.toml 과 config.local.toml 을 읽어 합친다."""

from __future__ import annotations

import tomllib
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent


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
                try:
                    data = _merge(data, tomllib.loads(path.read_text(encoding="utf-8")))
                except tomllib.TOMLDecodeError as exc:
                    raise ValueError(f"{name} 문법 오류: {exc}") from exc
        return cls(data, root)

    def get(self, dotted: str, default: Any = None) -> Any:
        node: Any = self.data
        for part in dotted.split("."):
            if not isinstance(node, dict) or part not in node:
                return default
            node = node[part]
        return node

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
