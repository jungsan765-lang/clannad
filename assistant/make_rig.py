"""분리 파츠(PNG 레이어)로 움직이는 캐릭터를 만든다: 리깅 → 프레임 굽기 → 미리보기 영상.

    python make_rig.py character/이름_rig.toml

결과는 make_character.py 와 같은 형식(character/이름/manifest.json + 동작별 PNG)이라
preview_character.py 로 바로 띄울 수 있다.
"""

from __future__ import annotations

import argparse
import json
import sys
import tomllib
from pathlib import Path

import numpy as np
from PIL import Image

from rig.animate import MOTIONS, LayerRig, Rig, RigConfig
from rig.parts import load_parts
from sprites.build import FRAME_RE, _concat_previews, write_previews, write_sheet

HERE = Path(__file__).resolve().parent


def load_config(path: Path) -> tuple[dict, RigConfig]:
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    for key in ("name", "parts", "face"):
        if key not in data:
            raise ValueError(f"{path.name}: {key} 가 필요해요.")
    piv = data.get("pivots", {})
    br = data.get("breath", {})
    cfg = RigConfig(
        hip=tuple(piv.get("hip", (512, 1350))),
        neck=tuple(piv.get("neck", (512, 470))),
        breath_amount=float(br.get("amount", 3.5)),
        chest_top=float(br.get("chest_top", 560)),
        waist=float(br.get("waist", 1000)),
        layers={name: LayerRig(**{k: v for k, v in spec.items()}) for name, spec in data.get("layers", {}).items()},
    )
    return data, cfg


def bake(data: dict, cfg: RigConfig, base: Path, log=print) -> dict:
    parts_dir = Path(data["parts"]).expanduser()
    if not parts_dir.is_absolute():
        parts_dir = (base / parts_dir).resolve()
    scale = float(data.get("scale", 0.5))
    fps = float(data.get("fps", 30))
    eye_boxes = data.get("eye_boxes")
    log(f"파츠 불러오는 중: {parts_dir}")
    parts = load_parts(parts_dir, data["face"], scale, eye_boxes=eye_boxes)
    rig = Rig(parts, scale, cfg)

    wanted = data.get("motions", list(MOTIONS))
    frames_by_motion: dict[str, list[np.ndarray]] = {}
    for name in wanted:
        fn, length, _ = MOTIONS[name]
        n = round(length * fps)
        frames_by_motion[name] = [rig.render(fn(i / fps, rig, fps)) for i in range(n)]
        log(f"  {name}: {n}장 ({length:.1f}초)")

    # 모든 동작을 합친 범위로 여백 자르기 (위치는 동작끼리 그대로 맞음)
    union = np.zeros(frames_by_motion[wanted[0]][0].shape[:2], bool)
    for frames in frames_by_motion.values():
        for f in frames:
            union |= f[..., 3] > 8
    ys, xs = np.nonzero(union)
    pad = 6
    h, w = union.shape
    y0, y1 = max(0, ys.min() - pad), min(h, ys.max() + 1 + pad)
    x0, x1 = max(0, xs.min() - pad), min(w, xs.max() + 1 + pad)

    out = HERE / "character" / data["name"]
    out.mkdir(parents=True, exist_ok=True)
    motions_meta = {}
    rows = []
    for name, frames in frames_by_motion.items():
        _, length, loop = MOTIONS[name]
        frames = [f[y0:y1, x0:x1] for f in frames]
        folder = out / name
        folder.mkdir(exist_ok=True)
        for old in folder.iterdir():
            if FRAME_RE.match(old.name):
                old.unlink()
        for i, f in enumerate(frames):
            Image.fromarray(f, "RGBA").save(folder / f"{i:04d}.png", compress_level=6)
        then = None if loop == "loop" else data.get("default", "idle")
        motions_meta[name] = {"dir": name, "frames": len(frames), "fps": fps, "loop": loop, "then": then, "seam": None}
        write_previews(out, name, frames, fps, loop)
        rows.append((f"{name} ({len(frames)}f, {loop})", frames))
    write_sheet(out, rows)
    default = data.get("default", "idle")
    _concat_previews(out, [default] + [n for n in frames_by_motion if n != default])
    emotions = {e: default for e in ("normal", "happy", "worried", "surprised", "angry")}
    emotions.update(data.get("emotions", {}))
    manifest = {
        "format": 1,
        "name": data["name"],
        "size": [x1 - x0, y1 - y0],
        "image_format": "png",
        "default": default,
        "talk": data.get("talk"),
        "motions": motions_meta,
        "emotions": emotions,
        "fidgets": data.get("fidgets", []),
        "fidget_every": data.get("fidget_every", [180, 420]),
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"완료: {out}  (크기 {x1 - x0}x{y1 - y0})")
    return manifest


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="분리 파츠로 움직이는 캐릭터 만들기")
    ap.add_argument("config", help="리그 설정 파일 (.toml)")
    args = ap.parse_args(argv)
    path = Path(args.config).resolve()
    try:
        data, cfg = load_config(path)
        bake(data, cfg, path.parent)
    except (FileNotFoundError, ValueError, KeyError) as exc:
        print(f"오류: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
