"""영상으로 바탕화면 캐릭터를 만든다.

1) 영상 훑어보기 — 시간표시 썸네일 시트와 장면 목록을 만든다
    python make_character.py scan 영상.mp4

2) 레시피 만들기 — character/이름.toml 을 만들고, 동작별 시간 구간을 채운다
    python make_character.py new 이름 영상.mp4

3) 만들기 — 누끼, 크기 맞추기, 루프 다듬기, 미리보기 GIF까지
    python make_character.py build character/이름.toml

4) 바탕화면에서 확인
    python preview_character.py character/이름
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

TEMPLATE = """\
# {name} 캐릭터 레시피. 시간은 "분:초.소수" 또는 초(예: 12.5).
name = "{name}"
source = "{source}"   # 이 파일 기준 상대 경로도 됨
height = 480           # 캐릭터 키(픽셀)
fps = 24
matte = "ai"           # ai(애니 캐릭터 AI 누끼) | chroma(단색 배경) | alpha(투명 영상)
# key_color = "#00ff00"   # matte = "chroma" 일 때 배경색. 비우면 자동 추정
# crop = [x, y, 너비, 높이] # 영상에서 캐릭터가 있는 영역만 쓰기 (다른 사람·UI 제외)
# fidgets = ["happy"]       # 가만히 있을 때 가끔 하는 동작 (loop = "once" 인 동작)
# fidget_every = [180, 420] # 그 간격(초)
# 동작 이름이 appear 면 미리보기를 켤 때 처음 한 번 재생한다.

# 동작마다 구간을 적는다. loop = "loop"(반복) | "pingpong"(앞뒤 왕복) | "once"(한 번)
[motions.idle]
start = "0:00.0"
end = "0:03.0"
loop = "loop"

# [motions.talk]
# start = "0:10.0"
# end = "0:12.0"
# loop = "loop"

# [motions.happy]
# start = "0:20.0"
# end = "0:21.5"
# loop = "once"
# then = "idle"        # 끝나면 이어서 재생할 동작

# 다른 영상이나 다른 크기로 찍힌 구간은 source, crop, scale, offset = [가로, 세로] 로 맞춘다.

# 감정(normal, happy, worried, surprised, angry) → 동작. 이름이 같으면 자동 연결.
[emotions]
# worried = "idle"
"""


def cmd_scan(args) -> int:
    from sprites.scan import scan

    video = Path(args.video)
    out = Path(args.out) if args.out else HERE / "work" / "scan" / video.stem
    pages, shots = scan(video, out, every=args.every)
    print(f"썸네일 시트 {len(pages)}장, 장면 {len(shots)}개 → {out}")
    print(f"장면 목록: {out / 'shots.txt'}  (빨간 테두리 = 장면이 바뀐 곳)")
    return 0


def cmd_new(args) -> int:
    from sprites.recipe import NAME_RE

    if not NAME_RE.match(args.name):
        print("이름은 영문, 숫자, _, - 만 쓸 수 있어요.")
        return 1
    path = HERE / "character" / f"{args.name}.toml"
    if path.exists() and not args.force:
        print(f"이미 있어요: {path}  (덮어쓰려면 --force)")
        return 1
    path.parent.mkdir(parents=True, exist_ok=True)
    source = Path(args.video).resolve().as_posix()
    path.write_text(TEMPLATE.format(name=args.name, source=source), encoding="utf-8")
    print(f"레시피를 만들었어요: {path}")
    return 0


def cmd_build(args) -> int:
    from sprites.build import build
    from sprites.recipe import RecipeError, load_recipe

    try:
        recipe = load_recipe(args.recipe)
    except RecipeError as exc:
        print(f"레시피 오류: {exc}")
        return 1
    out = Path(args.out) if args.out else HERE / "character" / recipe.name
    work = HERE / "work" / recipe.name
    build(recipe, out, work, HERE / "models")
    print(f"\n완료: {out}")
    print(f"미리보기: {out / 'previews'}  (sheet.png, 동작별 GIF)")
    print(f"바탕화면 확인: python preview_character.py {out}")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="영상으로 바탕화면 캐릭터 만들기")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("scan", help="영상 훑어보기 (썸네일 시트 + 장면 목록)")
    p.add_argument("video")
    p.add_argument("--every", type=float, default=0.5, help="썸네일 간격(초), 기본 0.5")
    p.add_argument("--out", help="결과 폴더 (기본 work/scan/영상이름)")
    p.set_defaults(func=cmd_scan)

    p = sub.add_parser("new", help="레시피 파일 만들기")
    p.add_argument("name")
    p.add_argument("video")
    p.add_argument("--force", action="store_true")
    p.set_defaults(func=cmd_new)

    p = sub.add_parser("build", help="레시피대로 캐릭터 만들기")
    p.add_argument("recipe")
    p.add_argument("--out", help="결과 폴더 (기본 character/이름)")
    p.set_defaults(func=cmd_build)

    args = ap.parse_args(argv)
    try:
        return args.func(args)
    except (FileNotFoundError, ValueError, RuntimeError) as exc:
        print(f"오류: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
