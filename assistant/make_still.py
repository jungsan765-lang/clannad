"""그림 한 장으로 바탕화면 캐릭터 만들기 (숨쉬기 + 말할 때 통통 튀기).

    python make_still.py 그림.png --name danika_still

투명 배경 PNG/WebP 면 그대로 쓰고, 배경이 있으면 AI 로 누끼를 딴다.
결과는 character/이름/ 에 생기고, config.toml 의 character.folder 를 그 폴더로 하면 된다.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sprites.still import make_still_character

HERE = Path(__file__).resolve().parent


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="그림 한 장으로 캐릭터 만들기")
    ap.add_argument("image", help="캐릭터 그림 (투명 배경 권장)")
    ap.add_argument("--name", default="danika_still", help="캐릭터 폴더 이름 (기본 danika_still)")
    ap.add_argument("--height", type=int, default=768, help="캐릭터 키(px), 기본 768")
    ap.add_argument("--breath", type=float, default=4.0, help="숨쉴 때 위로 올라가는 폭(px), 기본 4")
    ap.add_argument("--bounce", type=float, default=1.5, help="말할 때 가슴 위쪽이 튀는 폭(px), 기본 1.5. 0 이면 안 튐")
    args = ap.parse_args(argv)
    image = Path(args.image)
    if not image.is_file():
        print(f"그림 파일이 없어요: {image}")
        return 1
    make_still_character(image, HERE / "character" / args.name, HERE / "models", name=args.name,
                         height=args.height, breath_px=args.breath, bounce_px=args.bounce)
    print(f"\n바탕화면 확인: python preview_character.py character/{args.name}")
    print(f"비서에 적용: config.toml 의 [character] folder = \"character/{args.name}\"")
    return 0


if __name__ == "__main__":
    sys.exit(main())
