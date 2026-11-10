import os

import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from fake_anthropic import FakeAnthropic  # noqa: E402
from PySide6.QtCore import QThreadPool  # noqa: E402
from PySide6.QtWidgets import QApplication  # noqa: E402

import main as app_main  # noqa: E402
from ai_client import AIClient  # noqa: E402
from settings import Settings  # noqa: E402
from usage import UsageLedger  # noqa: E402


@pytest.fixture(scope="module")
def qapp():
    return QApplication.instance() or QApplication([])


def _settings(tmp_path, character):
    (tmp_path / "config.toml").write_text(
        f'[app]\ndata_dir = "{(tmp_path / "data").as_posix()}"\n'
        f'[character]\nfolder = "{character}"\npersona = "none.md"\nscale = 0.5\n'
        '[ui]\nbubble_min_seconds = 1.0\n', encoding="utf-8")
    return Settings.load(tmp_path)


def _wait(qapp, assistant):
    for _ in range(50):
        QThreadPool.globalInstance().waitForDone(2000)
        qapp.processEvents()
        if not assistant.jobs:
            return


def test_click_talk_bubble_and_cost(qapp, tmp_path, built):
    fake = FakeAnthropic([{"speak": True, "message": "부르셨어요, 주인님?", "emotion": "happy"}])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    assert "오늘 사용 0원" in a.cost_text()
    a.window.clicked.emit()  # 캐릭터 클릭
    assert a.input.isVisible()
    a.input.edit.setText("다니카")
    a.input.edit.returnPressed.emit()  # Enter
    assert not a.input.isVisible() and a.bubble.text == "……"
    _wait(qapp, a)
    assert a.bubble.isVisible() and a.bubble.text == "부르셨어요, 주인님?"
    assert a.window.talking and a.window.current_motion == "happy"
    assert "오늘 사용 " in a.cost_action.text() and "오늘 사용 0원" not in a.cost_action.text()
    a.bubble._timeout()  # 말풍선이 사라지면 말하기도 끝
    assert not a.window.talking
    assert (tmp_path / "data" / "usage.json").is_file() and (tmp_path / "data" / "memory.json").is_file()


def test_missing_character_uses_placeholder_and_errors_show(qapp, tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    s = _settings(tmp_path, "no_such_folder")
    a = app_main.build(s, tray=False)
    a.start()
    assert a.window.sprites.name == "placeholder"
    a.ask("안녕")
    _wait(qapp, a)
    assert a.bubble.system and "API 키" in a.bubble.text and not a.busy


def test_topmost_keeper_reasserts_visible_windows(qapp, tmp_path, built, monkeypatch):
    import ui.topmost as tm

    calls = []
    monkeypatch.setattr(tm, "bring_to_top", lambda w: calls.append(w))
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=FakeAnthropic()), tray=False)
    a.start()
    assert a.topmost.timer.isActive()
    calls.clear()
    a.topmost.tick()
    assert calls == [a.window, a.bubble, a.input]  # 캐릭터 → 말풍선 → 입력창 순서 (뒤가 더 앞)
    a.quit()
    assert not a.topmost.timer.isActive()


def test_talk_motion_can_be_turned_off(qapp, tmp_path, built):
    fake = FakeAnthropic([{"speak": True, "message": "네.", "emotion": "normal"}])
    s = _settings(tmp_path, built["out"].as_posix())
    s.data.setdefault("character", {})["talk_motion"] = False
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a.ask("안녕")
    _wait(qapp, a)
    assert a.bubble.text == "네." and not a.window.talking  # 말풍선은 뜨지만 말하기 동작은 없음
