"""만든 캐릭터를 바탕화면에 띄워 확인한다.

    python preview_character.py character/이름 [--scale 0.8] [--fps 30]

캐릭터 창을 한 번 클릭한 뒤 키보드:
    1~9  동작 바꾸기     T  말하기 켜기/끄기     E  감정 바꾸기     Esc  종료
오른쪽 클릭하면 메뉴가 나온다. 창 위치는 state.json 에 기억한다.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PySide6.QtCore import QPoint
from PySide6.QtGui import QAction, QKeyEvent
from PySide6.QtWidgets import QApplication, QMenu

from ui.character import CharacterWindow, SpriteSet

HERE = Path(__file__).resolve().parent
STATE = HERE / "state.json"
EMOTIONS = ["normal", "happy", "worried", "surprised", "angry"]


def load_state() -> dict:
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def save_state(data: dict) -> None:
    STATE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


class PreviewWindow(CharacterWindow):
    def __init__(self, sprites: SpriteSet, max_fps: float):
        super().__init__(sprites, max_fps=max_fps, take_focus=True)
        self.order = list(sprites.motions)
        self.emotion_i = 0
        self.menu_requested.connect(self.show_menu)
        self.moved.connect(self.remember_pos)
        self.motion_changed.connect(lambda name: self.setToolTip(name))

    def keyPressEvent(self, event: QKeyEvent) -> None:  # noqa: N802
        text = event.text().lower()
        if text.isdigit() and 1 <= int(text) <= len(self.order):
            self.play(self.order[int(text) - 1])
        elif text == "t":
            self.set_talking(not self.talking)
        elif text == "e":
            self.emotion_i = (self.emotion_i + 1) % len(EMOTIONS)
            self.set_emotion(EMOTIONS[self.emotion_i])
            print("감정:", EMOTIONS[self.emotion_i])
        elif event.key() == 0x01000000:  # Esc
            QApplication.quit()

    def show_menu(self, pos: QPoint) -> None:
        menu = QMenu(self)
        for i, name in enumerate(self.order, 1):
            act = QAction(f"{i}. {name}", menu)
            act.triggered.connect(lambda _=False, n=name: self.play(n))
            menu.addAction(act)
        menu.addSeparator()
        emo = menu.addMenu("감정")
        for e in EMOTIONS:
            act = QAction(e, emo)
            act.triggered.connect(lambda _=False, x=e: self.set_emotion(x))
            emo.addAction(act)
        talk = QAction("말하기 끄기" if self.talking else "말하기 켜기", menu)
        talk.triggered.connect(lambda: self.set_talking(not self.talking))
        menu.addAction(talk)
        menu.addSeparator()
        menu.addAction("종료", QApplication.quit)
        menu.exec(pos)

    def remember_pos(self, pos: QPoint) -> None:
        state = load_state()
        state.setdefault("preview_pos", {})[self.sprites.name] = [pos.x(), pos.y()]
        save_state(state)


def main() -> int:
    ap = argparse.ArgumentParser(description="캐릭터 미리보기")
    ap.add_argument("folder", help="manifest.json 이 있는 폴더 (예: character/danika)")
    ap.add_argument("--scale", type=float, default=1.0, help="크기 배율 (기본 1.0)")
    ap.add_argument("--fps", type=float, default=30, help="최대 fps (기본 30)")
    args = ap.parse_args()

    app = QApplication(sys.argv)
    sprites = SpriteSet(args.folder, scale=args.scale)
    win = PreviewWindow(sprites, args.fps)
    pos = load_state().get("preview_pos", {}).get(sprites.name)
    if pos:
        win.move(*pos)
    else:
        geo = app.primaryScreen().availableGeometry()
        win.move(geo.right() - win.width() - 40, geo.bottom() - win.height() - 40)
    win.show()
    win.activateWindow()
    if "appear" in sprites.motions:  # 등장 동작이 있으면 처음에 한 번
        win.play("appear")
    print(f"{sprites.name}: 동작 {', '.join(f'{i}={n}' for i, n in enumerate(win.order, 1))}")
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
