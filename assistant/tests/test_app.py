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
        '[ui]\nbubble_min_seconds = 1.0\n[update]\nauto = false\n', encoding="utf-8")
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
    s.data.setdefault("character", {})["talk_motion"] = False  # 예전 설정값도 동작 (= breathe)
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a.ask("안녕")
    _wait(qapp, a)
    assert a.bubble.text == "네." and not a.window.talking and not a.window.frozen  # 숨쉬기만 계속


def test_talk_still_pauses_breathing_until_bubble_closes(qapp, tmp_path, built):
    fake = FakeAnthropic([{"speak": True, "message": "네.", "emotion": "normal"}])
    s = _settings(tmp_path, built["out"].as_posix())
    s.data.setdefault("character", {})["talk_motion"] = "still"
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a.ask("안녕")
    _wait(qapp, a)
    assert a.window.frozen and not a.window.talking  # 말하는 동안 멈춤
    a.bubble._timeout()
    assert not a.window.frozen  # 말풍선이 사라지면 다시 숨쉼


def test_budget_in_usd_with_credit_notice(qapp, tmp_path, built, monkeypatch):
    fake = FakeAnthropic([{"speak": True, "message": "네.", "emotion": "normal"}] * 3)
    s = _settings(tmp_path, built["out"].as_posix())
    s.data["budget"] = {"monthly_usd": 150, "credit_usd": 100, "warn_ratio": 0.8, "krw_per_usd": 1400}
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    assert a.budget_usd() == 150 and "/ $150)" in a.cost_text()
    shown = []
    a.bubble.show_text = lambda text, *args, **kw: shown.append(text)  # 말풍선 대신 기록
    monkeypatch.setattr(app_main.QTimer, "singleShot", staticmethod(lambda ms, fn: fn()))  # 기다리지 않고 바로 (테스트 후 복구)
    a.ledger.month_usd = lambda today=None: 105.0  # 크레딧을 막 넘김
    a._budget_warning()
    assert any("크레딧 $100" in t for t in shown) and a._screen_allowed()
    a.ledger.month_usd = lambda today=None: 125.0  # 예산 80% 넘김
    a._budget_warning()
    assert any("83%" in t for t in shown)
    a.ledger.month_usd = lambda today=None: 151.0  # 예산 초과 → 화면 보기 멈춤
    a._budget_warning()
    assert any("예산을 넘었어요" in t for t in shown) and not a._screen_allowed()
    n = len(shown)
    a._budget_warning()
    assert len(shown) == n  # 같은 달에 같은 알림은 한 번만


def test_menu_has_settings_update_restart_and_screen_status(qapp, tmp_path, built):
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=FakeAnthropic()), tray=False)
    a.start()
    labels = [act.text() for act in a.menu.actions()]
    assert "설정 파일 열기" in labels and "업데이트 확인" in labels and any(t.startswith("다시 시작") for t in labels)
    a._refresh_cost()
    assert a.watch_status_action.text().startswith("화면 보기:")
    assert not a.update_timer.isActive()  # 자동 업데이트 끔 설정이면 확인 안 함
    a.quit()


def test_wait_for_exit_returns_for_missing_pid():
    app_main.wait_for_exit(999999, seconds=0.5)
