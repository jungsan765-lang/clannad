"""캐릭터 레시피(.toml)를 읽고 검사한다."""

from __future__ import annotations

import re
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

from .matte import parse_color
from .video import parse_time

LOOP_MODES = ("loop", "pingpong", "once")
MATTE_MODES = ("ai", "chroma", "alpha")
EMOTIONS = ("normal", "happy", "worried", "surprised", "angry")
NAME_RE = re.compile(r"^[A-Za-z0-9_\-]+$")


class RecipeError(ValueError):
    pass


@dataclass
class MotionSpec:
    name: str
    source: Path
    start: float
    end: float
    fps: float
    loop: str = "loop"
    then: str | None = None
    crop: tuple[int, int, int, int] | None = None
    scale: float = 1.0
    offset: tuple[int, int] = (0, 0)
    blend: int = 0
    loop_search: bool = True
    # 여러 구간을 이어 붙이는 동작: [(시작, 끝), ...]. 하나뿐이면 [(start, end)]
    segments: list[tuple[float, float]] = field(default_factory=list)
    length: float = 12.0  # 이어 붙인 동작의 목표 길이(초)
    join: int = 6  # 이음새에 그려 넣는 중간 장면 최대 수


@dataclass
class Recipe:
    path: Path
    name: str
    height: int
    fps: float
    matte: str
    key_color: tuple[int, int, int] | None
    chroma_tol: float
    chroma_soft: float
    alpha_lo: float
    alpha_hi: float
    min_island: float
    stabilize: bool
    padding: int
    image_format: str
    motions: dict[str, MotionSpec] = field(default_factory=dict)
    emotions: dict[str, str] = field(default_factory=dict)
    default_motion: str = "idle"
    talk_motion: str | None = None
    fidgets: list[str] = field(default_factory=list)  # 가만히 있을 때 가끔 하는 동작
    fidget_every: tuple[float, float] = (180.0, 420.0)  # 초 단위 최소~최대 간격


def _crop(value, where: str) -> tuple[int, int, int, int] | None:
    if value is None:
        return None
    if not (isinstance(value, list) and len(value) == 4 and all(isinstance(v, int) for v in value)):
        raise RecipeError(f"{where}: crop 은 [x, y, 너비, 높이] 정수 4개여야 해요.")
    x, y, w, h = value
    if w <= 0 or h <= 0 or x < 0 or y < 0:
        raise RecipeError(f"{where}: crop 너비·높이는 0보다 크고 x, y는 0 이상이어야 해요.")
    return (x, y, w, h)


def _loop(value, where: str) -> str:
    if value is True:
        return "loop"
    if value is False:
        return "once"
    if value not in LOOP_MODES:
        raise RecipeError(f"{where}: loop 은 {', '.join(LOOP_MODES)} 중 하나여야 해요.")
    return value


def load_recipe(path: str | Path) -> Recipe:
    path = Path(path).resolve()
    try:
        data = tomllib.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise RecipeError(f"레시피 파일이 없어요: {path}") from exc
    except tomllib.TOMLDecodeError as exc:
        raise RecipeError(f"레시피 문법 오류: {exc}") from exc

    base = path.parent

    def source_path(value, where: str) -> Path:
        if not value:
            raise RecipeError(f"{where}: source(영상 경로)가 필요해요.")
        p = Path(value).expanduser()
        return (p if p.is_absolute() else base / p).resolve()

    name = data.get("name") or path.stem
    if not NAME_RE.match(name):
        raise RecipeError("name 은 영문, 숫자, _, - 만 쓸 수 있어요.")

    matte = data.get("matte", "ai")
    if matte not in MATTE_MODES:
        raise RecipeError(f"matte 는 {', '.join(MATTE_MODES)} 중 하나여야 해요.")
    key = data.get("key_color")
    try:
        key_color = parse_color(key) if key else None
    except ValueError as exc:
        raise RecipeError(str(exc)) from exc

    image_format = data.get("image_format", "png")
    if image_format not in ("png", "webp"):
        raise RecipeError("image_format 은 png 또는 webp 여야 해요.")

    height = int(data.get("height", 480))
    fps = float(data.get("fps", 24))
    if not 64 <= height <= 2160:
        raise RecipeError("height 는 64~2160 사이로 해주세요.")
    if not 1 <= fps <= 60:
        raise RecipeError("fps 는 1~60 사이로 해주세요.")

    recipe = Recipe(
        path=path,
        name=name,
        height=height,
        fps=fps,
        matte=matte,
        key_color=key_color,
        chroma_tol=float(data.get("chroma_tolerance", 18)),
        chroma_soft=float(data.get("chroma_softness", 22)),
        alpha_lo=float(data.get("alpha_low", 0.12)),
        alpha_hi=float(data.get("alpha_high", 0.88)),
        min_island=float(data.get("min_island", 0.02)),
        stabilize=bool(data.get("stabilize", True)),
        padding=int(data.get("padding", 8)),
        image_format=image_format,
    )

    motions = data.get("motions") or {}
    if not motions:
        raise RecipeError("[motions.이름] 을 하나 이상 적어주세요 (예: [motions.idle]).")
    default_source = data.get("source")
    default_crop = _crop(data.get("crop"), "crop")
    for mname, m in motions.items():
        where = f"[motions.{mname}]"
        if not NAME_RE.match(mname):
            raise RecipeError(f"{where}: 동작 이름은 영문, 숫자, _, - 만 쓸 수 있어요.")
        if "segments" in m:
            raw = m["segments"]
            if not (isinstance(raw, list) and len(raw) >= 2 and all(isinstance(s, list) and len(s) == 2 for s in raw)):
                raise RecipeError(f'{where}: segments 는 [["시작", "끝"], ["시작", "끝"], ...] 처럼 두 개 이상이어야 해요.')
            if m.get("loop", "loop") not in ("loop", True):
                raise RecipeError(f'{where}: segments 로 이어 붙인 동작은 loop = "loop" 만 돼요.')
            pairs = raw
        elif "start" in m and "end" in m:
            pairs = [[m["start"], m["end"]]]
        else:
            raise RecipeError(f"{where}: start 와 end (또는 segments) 가 필요해요.")
        try:
            segments = [(parse_time(a), parse_time(b)) for a, b in pairs]
        except ValueError as exc:
            raise RecipeError(f"{where}: {exc}") from exc
        if any(b <= a for a, b in segments):
            raise RecipeError(f"{where}: end 가 start 보다 커야 해요.")
        start, end = segments[0]
        offset = m.get("offset", [0, 0])
        if not (isinstance(offset, list) and len(offset) == 2):
            raise RecipeError(f"{where}: offset 은 [가로, 세로] 두 숫자여야 해요.")
        recipe.motions[mname] = MotionSpec(
            name=mname,
            source=source_path(m.get("source", default_source), where),
            start=start,
            end=end,
            fps=float(m.get("fps", fps)),
            loop=_loop(m.get("loop", "loop"), where),
            then=m.get("then"),
            crop=_crop(m["crop"], where) if "crop" in m else default_crop,
            scale=float(m.get("scale", 1.0)),
            offset=(int(offset[0]), int(offset[1])),
            blend=int(m.get("blend", 0)),
            loop_search=bool(m.get("loop_search", True)),
            segments=segments,
            length=float(m.get("length", 12.0)),
            join=int(m.get("join", 6)),
        )

    for spec in recipe.motions.values():
        if spec.then and spec.then not in recipe.motions:
            raise RecipeError(f"[motions.{spec.name}]: then = {spec.then!r} 라는 동작이 없어요.")

    recipe.default_motion = data.get("default", "idle" if "idle" in recipe.motions else next(iter(recipe.motions)))
    if recipe.default_motion not in recipe.motions:
        raise RecipeError(f"default = {recipe.default_motion!r} 라는 동작이 없어요.")
    talk = data.get("talk", "talk" if "talk" in recipe.motions else None)
    if talk and talk not in recipe.motions:
        raise RecipeError(f"talk = {talk!r} 라는 동작이 없어요.")
    recipe.talk_motion = talk

    fidgets = data.get("fidgets", [])
    if not isinstance(fidgets, list):
        raise RecipeError('fidgets 는 ["동작", ...] 목록이어야 해요.')
    for f in fidgets:
        if f not in recipe.motions:
            raise RecipeError(f"fidgets 의 {f!r} 라는 동작이 없어요.")
        if recipe.motions[f].loop != "once":
            raise RecipeError(f'fidgets 의 {f!r} 는 loop = "once" 여야 해요 (끝나야 원래대로 돌아오니까).')
    recipe.fidgets = list(fidgets)
    every = data.get("fidget_every", [180, 420])
    if not (isinstance(every, list) and len(every) == 2 and 5 <= every[0] <= every[1]):
        raise RecipeError("fidget_every 는 [최소초, 최대초] 이고 최소는 5초 이상이어야 해요.")
    recipe.fidget_every = (float(every[0]), float(every[1]))

    emotions = {e: recipe.default_motion for e in EMOTIONS}
    emotions.update({e: e for e in EMOTIONS if e in recipe.motions})
    for emotion, target in (data.get("emotions") or {}).items():
        if target not in recipe.motions:
            raise RecipeError(f"[emotions] {emotion} = {target!r} 라는 동작이 없어요.")
        emotions[emotion] = target
    recipe.emotions = emotions
    return recipe
