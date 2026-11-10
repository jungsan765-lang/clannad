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
    assert "설정…" in labels and "업데이트 확인" in labels and any(t.startswith("다시 시작") for t in labels)
    assert "말할 때 움직임" in labels
    a._refresh_cost()
    assert a.watch_status_action.text().startswith("화면 보기:")
    assert not a.update_timer.isActive()  # 자동 업데이트 끔 설정이면 확인 안 함
    a.quit()


def test_wait_for_exit_returns_for_missing_pid():
    app_main.wait_for_exit(999999, seconds=0.5)


def test_settings_dialog_applies_live_and_persists(qapp, tmp_path, built):
    from ui.settings_dialog import SettingsDialog

    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=FakeAnthropic()), tray=False)
    a.start()
    dlg = SettingsDialog(a.settings_values(), ["1", "2"], ["USB 마이크"])
    dlg.talk.group.button(1).setChecked(True)  # 말할 때: 멈춤
    dlg.chatty.group.button(2).setChecked(True)  # 자주
    dlg.interval.slider.setValue(60)
    dlg.screen_on.setChecked(False)
    dlg.mic.setCurrentIndex(1)
    dlg.wake_on.setChecked(True)
    dlg.scale.slider.setValue(100)
    changed = dlg.changed()
    assert changed["character.talk_motion"] == "still" and changed["screen.interval_seconds"] == 60
    assert changed["voice.wake_word"] == "다니카" and changed["voice.device"] == "USB 마이크"
    assert dlg.interval.label.text() == "1분"
    a.apply_settings(changed)
    assert a.talk_style() == "still" and a.talk_actions["still"].isChecked()
    assert a.watch_cfg.chattiness == "chatty" and a.watcher.normal.interval_seconds == 60
    assert not a.watcher.enabled and a.voice.device == "USB 마이크" and a.voice.wake_word == "다니카"
    assert "다시 시작" in a.bubble.text  # 크기는 다시 시작 후 적용
    a.quit()
    s2 = _settings(tmp_path, built["out"].as_posix())  # 다시 켜도 그대로
    b = app_main.build(s2, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=FakeAnthropic()), tray=False)
    assert b.talk_style() == "still" and b.watch_cfg.interval_seconds == 60 and b.settings.get("character.scale") == 1.0
