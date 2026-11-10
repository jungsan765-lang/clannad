import os

import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PySide6.QtWidgets import QApplication  # noqa: E402

from ui.character import CharacterWindow, SpriteSet  # noqa: E402


@pytest.fixture(scope="module")
def app():
    return QApplication.instance() or QApplication([])


@pytest.fixture
def win(app, built):
    sprites = SpriteSet(built["out"], scale=0.5, device_ratio=1.0)
    w = CharacterWindow(sprites, max_fps=30)
    yield w
    w.close()


def test_sprite_set_loads(win):
    s = win.sprites
    assert s.size.width() == round(s.image_size.width() * 0.5)
    pix = s.frames("idle")
    assert len(pix) == s.motion("idle").count
    assert pix[0].width() == s.size.width()


def test_loop_and_pingpong(win):
    idle = win.sprites.motion("idle")
    win.advance(1.5 / idle.fps)
    assert win.current_motion == "idle" and win.frame_index == 1
    win.advance((idle.count + 2.5) / idle.fps)
    assert win.frame_index == 2  # 반복
    win.play("talk")
    talk = win.sprites.motion("talk")
    win.advance((talk.count + 1.5) / talk.fps)  # 끝(count-1)에 닿은 뒤 2장 되돌아옴
    assert win.frame_index == talk.count - 3


def test_once_returns_to_then(win):
    win.set_emotion("happy")
    assert win.current_motion == "happy"
    happy = win.sprites.motion("happy")
    win.advance((happy.count + 0.5) / happy.fps)
    assert win.current_motion == "idle"


def test_talking_and_mood(win):
    win.set_talking(True)
    assert win.current_motion == "talk"
    win.set_talking(False)
    assert win.current_motion == "idle"
    win.set_emotion("worried")  # worried → talk (반복 동작이라 기본 동작을 대신함)
    assert win.current_motion == "talk"
    win.set_emotion("normal")
    assert win.current_motion == "idle"


def test_once_motion_finishes_before_talking(win):
    win.set_emotion("happy")
    win.set_talking(True)
    assert win.current_motion == "happy"  # 한 번 재생은 끝까지
    happy = win.sprites.motion("happy")
    win.advance((happy.count + 0.5) / happy.fps)
    assert win.current_motion == "idle"  # then = idle 이 우선


def test_fidget_only_while_resting(win):
    assert win.sprites.fidgets == ["happy"]
    assert win.sprites.fidget_every == (5.0, 6.0)
    assert win.is_resting()
    assert win.play_fidget() and win.current_motion == "happy"
    happy = win.sprites.motion("happy")
    win.advance((happy.count + 0.5) / happy.fps)
    assert win.current_motion == "idle"
    win.set_talking(True)
    assert not win.play_fidget()  # 말하는 중엔 안 함
    win.set_talking(False)
    win.set_emotion("worried")
    assert not win.play_fidget()  # 감정 동작 중에도 안 함
