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
    assert not a.input.isVisible() and a.status.active("chat") and "생각 중" in a.status.text  # 말풍선은 안 가림
    shown = []
    real_show = a.bubble.show_text
    a.bubble.show_text = lambda text, *args, **kw: (shown.append(text), real_show(text, *args, **kw))
    _wait(qapp, a)
    assert a.bubble.isVisible() and a.bubble.text == "부르셨어요, 주인님?"
    assert fake.calls[-1].get("streamed") and len(shown) >= 2 and shown[0] != shown[-1]  # 받는 대로 보여줌
    assert not a.status.active("chat")
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
    assert calls == [a.window, a.bubble, a.status, a.input]  # 캐릭터 → 말풍선 → 하는 일 → 입력창 (뒤가 더 앞)
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
    assert changed["voice.wake_word"] == "다니카" and changed["voice.mic"] == "USB 마이크"
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


def test_organize_from_chat_preview_move_and_undo(qapp, tmp_path, built, monkeypatch):
    from ui.organize_dialog import OrganizeDialog

    folder = tmp_path / "받은 파일"
    folder.mkdir()
    for n in ("a.jpg", "b.png", "c.pdf"):
        (folder / n).write_bytes(b"x")
    plan = {"summary": "사진은 사진끼리 모아 두겠습니다.", "moves": [
        {"file": "a.jpg", "folder": "사진", "reason": "사진"}, {"file": "b.png", "folder": "사진", "reason": "사진"},
        {"file": "c.pdf", "folder": "문서", "reason": "문서"}]}
    fake = FakeAnthropic([{"speak": True, "message": "정리안을 만들어 보여드릴게요.", "emotion": "normal",
                           "action": "organize_files", "target": str(folder)}, plan])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    seen = {}

    def fake_exec(dlg):
        seen["rows"] = dlg.table.rowCount()
        dlg.table.item(2, 0).setCheckState(app_main.Qt.CheckState.Unchecked)  # pdf 는 빼고
        dlg.table.item(0, 1).setText("사진 모음")  # 폴더 이름 고치기
        return OrganizeDialog.DialogCode.Accepted

    monkeypatch.setattr(OrganizeDialog, "exec", fake_exec)
    a.ask("이 폴더 정리해줘")
    _wait(qapp, a)
    from PySide6.QtTest import QTest

    for _ in range(100):  # 대답 → (0.4초 뒤) 정리안 → 옮기기
        QTest.qWait(50)
        _wait(qapp, a)
        if not a.organizing and (folder / "사진").exists():
            break
    assert seen["rows"] == 3
    assert (folder / "사진 모음" / "a.jpg").is_file() and (folder / "사진" / "b.png").is_file()
    assert (folder / "c.pdf").is_file()  # 체크 안 한 건 그대로
    assert "2개를 정리" in a.bubble.text and not a.status.active("organize")
    monkeypatch.setattr(app_main.QMessageBox, "exec", lambda box: box.setProperty("x", 1))
    monkeypatch.setattr(app_main.QMessageBox, "clickedButton", lambda box: box.buttons()[0])
    a.undo_organize()
    _wait(qapp, a)
    assert (folder / "a.jpg").is_file() and (folder / "b.png").is_file() and not (folder / "사진 모음").exists()
    assert "2개를 원래 자리로" in a.bubble.text
    a.quit()


def test_settings_fast_status_and_sharpness(qapp, tmp_path, built):
    from ui.settings_dialog import SettingsDialog

    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=FakeAnthropic()), tray=False)
    a.start()
    assert a.watch_cfg.max_width == 1920 and a.watch_cfg.jpeg_quality == 85
    dlg = SettingsDialog(a.settings_values(), ["1", "2"], [])
    dlg.fast.setChecked(True)
    dlg.show_status.setChecked(False)
    dlg.sharp.group.button(2).setChecked(True)
    changed = dlg.changed()
    assert {k: changed.get(k) for k in ("ai.fast", "ui.show_status", "screen.max_width")} == \
        {"ai.fast": True, "ui.show_status": False, "screen.max_width": 2560}
    a.apply_settings(changed)
    assert a.companion.fast and not a.status.enabled and a.watch_cfg.max_width == 2560
    a.status.begin("x", "테스트")
    assert not a.status.isVisible()
    a.quit()


def test_chat_search_flow_shows_status_and_answers(qapp, tmp_path, built):
    fake = FakeAnthropic([
        {"speak": True, "message": "잠시만요, 찾아보겠습니다.", "emotion": "normal", "action": "web_search",
         "target": "원신 로노바"},
        "- 로노바는 천리의 그림자 중 하나.",
        {"speak": True, "message": "로노바는 천리의 그림자 중 하나입니다.", "emotion": "normal"},
    ])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    statuses = []
    real_begin = a.status.begin
    a.status.begin = lambda key, text, elapsed=True: (statuses.append(text), real_begin(key, text, elapsed))
    a.ask("로노바 알아?")
    _wait(qapp, a)
    _wait(qapp, a)
    assert any("찾아보는 중" in t for t in statuses)
    assert a.bubble.text == "로노바는 천리의 그림자 중 하나입니다." and not a.busy
    assert fake.calls[1].get("tools") and not fake.calls[2].get("tools")
    assert a.companion.memory.knowledge[-1]["query"] == "원신 로노바"
    a.quit()


def test_make_game_mode_and_note_request_from_chat(qapp, tmp_path, built):
    from watch.windows import WindowInfo

    mode = {"name": "엘든 링", "titles": ["ELDEN RING"], "interval_seconds": 20, "cooldown_seconds": 120,
            "quiet_during_play": False, "review_on_result": False, "knowledge": "- 소울라이크 액션",
            "urgent": "", "intro": "엘든 링에 맞춰 준비해 두었습니다."}
    fake = FakeAnthropic([
        {"speak": True, "message": "이 게임에 맞춰 준비해 두겠습니다.", "emotion": "normal", "action": "make_game_mode",
         "target": ""},
        "- 오픈월드 액션 RPG.", mode,
        {"speak": True, "message": "그건 아직 못 합니다. 개선 요청 메모에 적어 두겠습니다.", "emotion": "normal",
         "action": "note_request", "target": "알람을 맞춰 주는 기능"},
    ])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.watcher.window_info = lambda: WindowInfo("ELDEN RING", "eldenring.exe", (0, 0, 100, 100))
    a.watcher.monitor_rect = lambda: None
    a.start()
    a.ask("이 게임 모드 만들어줘")
    for _ in range(3):
        _wait(qapp, a)
    assert (tmp_path / "data" / "modes" / "auto_eldenring.toml").is_file()
    assert a.watcher.mode.name == "엘든 링" and a.bubble.text == "엘든 링에 맞춰 준비해 두었습니다."
    assert "eldenring.exe" in a._load_state()["auto_mode_tried"]
    a.ask("알람 맞춰줘")
    _wait(qapp, a)
    assert a.wishlist.items[-1]["text"] == "알람을 맞춰 주는 기능"
    a.quit()


def test_screen_name_lookup_is_quiet_and_rate_limited(qapp, tmp_path, built):
    from companion import Reply

    fake = FakeAnthropic(["- 로노바: 천리의 그림자.",
                          {"speak": True, "message": "저 분이 로노바군요. 죽음의 그림자라 들었습니다.", "emotion": "normal"}])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a._on_screen_line(Reply(True, "", "normal", 0, "web_search", "원신 로노바"))
    assert a.busy and "찾아보는 중" in a.status.text and not a.bubble.isVisible()
    _wait(qapp, a)
    assert a.bubble.text.startswith("저 분이 로노바군요") and not a.busy
    a._screen_searches = [time_now() for _ in range(6)]
    a._on_screen_line(Reply(True, "", "normal", 0, "web_search", "원신 누군가"))
    assert not a.busy  # 한 시간에 6번 넘으면 찾지 않음
    a.quit()


def time_now():
    import time

    return time.monotonic()


def test_nickname_setting_and_pin_from_chat(qapp, tmp_path, built):
    from ui.settings_dialog import SettingsDialog

    fake = FakeAnthropic([{"speak": True, "message": "고정해 두겠습니다.", "emotion": "normal", "action": "pin_fact",
                           "target": "주인님은 밤에 게임을 한다."}])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    dlg = SettingsDialog(a.settings_values(), ["1"], [])
    dlg.nick.setText("하늘고래 ， SkyWhale")
    a.apply_settings(dlg.changed())
    assert a.companion.user_names == ["하늘고래", "SkyWhale"]
    a.ask("나 밤에 게임해. 고정해")
    _wait(qapp, a)
    assert a.companion.memory.pinned == ["주인님은 밤에 게임을 한다."]
    a.quit()
    b = app_main.build(_settings(tmp_path, built["out"].as_posix()),
                       ai=AIClient(UsageLedger(tmp_path / "x.json"), client=FakeAnthropic()), tray=False)
    assert b.companion.user_names == ["하늘고래", "SkyWhale"]  # 다시 켜도 그대로
    assert "하늘고래" in b.companion.pinned_text() and "밤에 게임" in b.companion.pinned_text()
