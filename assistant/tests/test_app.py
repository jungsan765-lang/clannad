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
    assert calls == [a.overlay, a.window, a.bubble, a.status, a.input]  # 자막 → 캐릭터 → 말풍선 → 하는 일 → 입력창
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
    labels = [act.text() for act in a.menu.actions() if act.text()]
    assert len(labels) <= 12  # 위에는 자주 쓰는 것만
    assert labels[:2] == ["말 걸기", "대화 기록 보기"] and "설정…" in labels and labels[-1] == "종료"
    assert {"게임", "도구", "기억", "더 보기"} <= set(labels)
    more = next(act.menu() for act in a.menu.actions() if act.text() == "더 보기")
    more_labels = [act.text() for act in more.actions()]
    assert "업데이트 확인" in more_labels and any(t.startswith("다시 시작") for t in more_labels)
    assert "말할 때 움직임" in more_labels
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


def test_hang_watch_records_where_threads_were(qapp, tmp_path):
    import time as _t

    hw = app_main.HangWatch(tmp_path, limit=1.0)
    qapp.processEvents()
    _t.sleep(3.0)  # 화면 스레드를 일부러 멈춤
    text = (tmp_path / "hang.log").read_text(encoding="utf-8")
    assert "멈춤" in text and "test_hang_watch_records_where_threads_were" in text  # 멈춘 자리까지 남음
    hw._beat()
    assert not hw.reported
    hw.timer.stop()


def test_judge_does_not_wait_long(tmp_path):
    from companion import Companion
    from memory import Memory

    fake = FakeAnthropic([{"speak": False, "urgent": False, "scene": "other", "situation": "", "point": ""}])
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), Memory(tmp_path), None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    comp.judge(b"jpg", "x", "claude-haiku-5-5", None)
    assert fake.options[-1] == {"timeout": 20, "max_retries": 1}


def test_analysis_shows_panel_and_summary_and_chat_can_ask(qapp, tmp_path, built, monkeypatch):
    from companion import Analysis

    fake = FakeAnthropic([{"speak": True, "message": "살펴보겠습니다.", "emotion": "normal", "action": "analyze_screen",
                           "target": ""}])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a.set_analysis(True)
    assert a.watch_cfg.analysis and a.coach_actions["analysis"].isChecked() and a.pref("screen.coach") == "analysis"
    an = Analysis(True, "원충이 모자랍니다.", "비경 직후", [{"title": "원충", "detail": "110%"}], ["시계 바꾸기"], when="21:30")
    a._on_screen_line(an)
    html = a.analysis_panel.view.toHtml()
    assert a.analysis_panel.isVisible() and "원충" in html and "시계 바꾸기" in html and "21:30" in html
    assert a.bubble.text == "원충이 모자랍니다."
    asked = []
    monkeypatch.setattr(a.watcher, "ask_analysis", lambda q: asked.append(q))
    a.bubble.hide()
    a.ask("지금 파티 분석해 줘")
    _wait(qapp, a)
    from PySide6.QtTest import QTest

    QTest.qWait(400)
    assert asked == ["지금 파티 분석해 줘"] and "분석하는 중" in a.status.text
    a.quit()


def test_coach_modes_and_game_overlay(qapp, tmp_path, built, monkeypatch):
    from companion import Analysis, Reply
    from watch.modes import Mode

    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=FakeAnthropic()), tray=False)
    a.start()
    a.set_coach("review")
    assert a.watch_cfg.review and a.watch_cfg.analysis and a.coach == "review" and a.coach_actions["review"].isChecked()
    game = Mode("사이퍼즈", processes=["cyphers.exe"], interval_seconds=20, is_game=True)
    assert a.watcher.interval_for(game) == 5 and a.watcher.interval_for(a.watcher.normal) == 30  # 게임 중에만 5초
    # 자막: 게임 모니터를 쓰고 있을 때만
    monkeypatch.setattr(a.watcher, "foreground_on_watched", lambda: True)
    a.watcher.mode = game
    a._on_screen_line(Analysis(True, "방금 그 싸움, 아군을 기다렸으면 이겼습니다.", "교전 직후", [], [], when="21:00"))
    assert a.overlay.isVisible() and "아군을 기다렸으면" in a.overlay.text  # 복기 요약은 중요
    a.overlay.hide()
    a.bubble.hide()
    a._on_screen_line(Reply(True, "풍경이 예쁘네요.", "normal"))  # 가벼운 말은 게임 화면에 안 띄움
    assert not a.overlay.isVisible() and a.bubble.text == "풍경이 예쁘네요."
    a.bubble.hide()
    a._on_screen_line(Reply(True, "대파 상태입니다. 철수하세요!", "worried", important=True))
    assert a.overlay.isVisible()
    a.overlay.hide()
    monkeypatch.setattr(a.watcher, "foreground_on_watched", lambda: False)  # 다니카 쪽 모니터를 보는 중
    a.bubble.hide()
    a._on_screen_line(Reply(True, "다른 말", "normal"))
    assert not a.overlay.isVisible()
    monkeypatch.setattr(a.watcher, "foreground_on_watched", lambda: True)
    a.apply_settings({"screen.overlay": "off"})
    a.bubble.hide()
    a._on_screen_line(Reply(True, "또 다른 말", "normal"))
    assert not a.overlay.isVisible()
    a.set_pref("screen.coach", None)
    a.quit()


def test_old_analysis_pref_becomes_analysis_coach(qapp, tmp_path, built):
    import json

    s = _settings(tmp_path, built["out"].as_posix())
    (tmp_path / "data").mkdir(exist_ok=True)
    (tmp_path / "data" / "state.json").write_text(json.dumps({"prefs": {"screen.analysis": True}}), encoding="utf-8")
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=FakeAnthropic()), tray=False)
    a.start()
    assert a.coach == "analysis"
    a.quit()


def test_video_review_flow_from_menu(qapp, tmp_path, built, monkeypatch):
    from test_organize_status import _make_video
    from ui.video_dialog import VideoReviewDialog

    clip = tmp_path / "사이퍼즈 하이라이트.avi"
    _make_video(clip)
    data = {"speak": True, "summary": "초반 운영은 좋았습니다.", "overall": "흐름 요약",
            "moments": [{"time": "0:05", "title": "합류", "detail": "근거", "better": "좋았음"}],
            "next_steps": ["시야 확보"], "emotion": "normal"}
    fake = FakeAnthropic([data])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    from pathlib import Path

    from watch.modes import load_modes

    a.watcher.modes = load_modes(Path(app_main.__file__).resolve().parent / "modes")  # 실제 게임 모드들
    a.start()
    seen = {}

    def fake_exec(dlg):
        seen["game"] = dlg.game.currentData()
        seen["estimate"] = dlg.estimate.text()
        dlg.step.setCurrentIndex(dlg.step.findData("3"))
        return VideoReviewDialog.DialogCode.Accepted

    monkeypatch.setattr(VideoReviewDialog, "exec", fake_exec)
    a.review_video_file(str(clip))
    _wait(qapp, a)
    _wait(qapp, a)
    assert seen["game"] == "사이퍼즈" and "예상 비용" in seen["estimate"]  # 파일 이름으로 게임을 맞춤
    images = [c for c in fake.calls[-1]["messages"][-1]["content"] if c["type"] == "image"]
    assert len(images) == 5  # 0,3,6,9,12초
    assert a.analysis_panel.isVisible() and "0:05 · 합류" in a.analysis_panel.view.toHtml()
    saved = list((tmp_path / "data" / "reviews").glob("*.md"))
    assert saved and "초반 운영은 좋았습니다." in saved[0].read_text(encoding="utf-8")
    assert not a.status.active("video")
    a.quit()


def test_game_knowledge_folders_and_weekly_news(qapp, tmp_path, built, monkeypatch):
    import os
    import time as _t

    from watch.modes import Mode

    fake = FakeAnthropic(["- 가을 이벤트 진행 중 (11/1~11/30), 신규 함선 2척."])
    s = _settings(tmp_path, built["out"].as_posix())
    (tmp_path / "knowledge").mkdir()
    (tmp_path / "knowledge" / "kancolle.md").write_text("## 대파 진격\n키워드: 大破, 대파, 進撃\n- 대파면 철수.\n",
                                                        encoding="utf-8")
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    assert [e.title for e in a.companion.lorebook.find("大破 상태로 進撃 화면")] == ["대파 진격"]  # 일본어 화면 용어로도
    kc = Mode("칸코레", titles=["艦これ"], is_game=True)
    a.set_pref("assist.auto_dates", False)  # 일정 뽑기는 따로 시험
    a.refresh_game_news(kc)
    _wait(qapp, a)
    news = tmp_path / "data" / "knowledge" / "news_칸코레.md"
    text = news.read_text(encoding="utf-8")
    assert text.startswith("게임: 칸코레, 艦これ\n\n## 칸코레 최신 소식") and "키워드: 칸코레, 艦これ, 최신" in text
    assert "가을 이벤트" in text
    assert "칸코레 최신 소식" in [e.title.split(" (")[0] for e in a.companion.lorebook.find("칸코레 이벤트 뭐 해?")]
    assert a.companion.memory.knowledge == []  # 최신 소식은 '찾아본 것' 메모가 아니라 사전으로
    calls = len(fake.calls)
    a.refresh_game_news(kc)
    _wait(qapp, a)
    assert len(fake.calls) == calls  # 일주일 안에는 다시 안 찾음
    old = _t.time() - 8 * 86400
    os.utime(news, (old, old))
    a.refresh_game_news(kc)
    _wait(qapp, a)
    assert len(fake.calls) == calls + 1
    a.quit()


def test_history_window_shows_past_lines(qapp, tmp_path, built):
    import json as _json

    from ui.history_dialog import HistoryDialog, read_log

    logs = tmp_path / "data" / "logs"
    logs.mkdir(parents=True)
    rows = [{"time": "2026-11-10T21:30:00", "user": "레진 얼마나 남았어?", "reply": "레진은 152입니다."},
            {"time": "2026-11-10T21:31:00", "screen_line": "방금 그 한타, 합류가 늦었습니다."},
            {"time": "2026-11-10T21:32:00", "user": "(알림: 레진이 곧 넘친다)", "reply": "레진이 곧 넘칩니다."}]
    (logs / "2026-11-10.jsonl").write_text("\n".join(_json.dumps(r, ensure_ascii=False) for r in rows), encoding="utf-8")
    (logs / "2026-11-09.jsonl").write_text(_json.dumps(rows[0], ensure_ascii=False), encoding="utf-8")
    got = read_log(logs / "2026-11-10.jsonl")
    assert [(r["who"], r["text"]) for r in got] == [("주인님", "레진 얼마나 남았어?"), ("다니카", "레진은 152입니다."),
                                                   ("다니카(화면)", "방금 그 한타, 합류가 늦었습니다."),
                                                   ("다니카", "레진이 곧 넘칩니다.")]  # 내부 표시는 빼고
    dlg = HistoryDialog(logs)
    assert dlg.day.currentText() == "2026-11-10" and dlg.day.count() == 2  # 최근 날짜부터
    dlg.search.setText("한타")
    assert dlg.text() == "21:31 다니카(화면): 방금 그 한타, 합류가 늦었습니다."
    dlg.search.setText("")
    dlg.only_danika.setChecked(True)
    assert "주인님" not in dlg.text() and dlg.count.text() == "3개"


def test_bubble_time_setting(qapp, tmp_path, built):
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=FakeAnthropic()), tray=False)
    normal = a.bubble.duration_ms("가" * 40)
    a.apply_settings({"ui.bubble_time": "long"})
    long = a.bubble.duration_ms("가" * 40)
    a.apply_settings({"ui.bubble_time": "short"})
    assert a.bubble.duration_ms("가" * 40) < normal < long and a.pref("ui.bubble_time") == "short"


def test_rules_from_chat_apply_per_game(qapp, tmp_path, built):
    from watch.modes import Mode

    from ui.rules_dialog import RulesDialog

    fake = FakeAnthropic([
        {"speak": True, "message": "알겠습니다. 앞으로 그런 말은 하지 않겠습니다.", "emotion": "normal",
         "action": "add_rule", "target": "칸타이 컬렉션: 원정 귀환 알림은 말하지 않기"},
        {"speak": True, "message": "알겠습니다.", "emotion": "normal", "action": "add_rule",
         "target": "어디서든: 쉬라는 잔소리 하지 않기"},
        {"speak": False, "situation": "원정 귀환 화면", "point": ""},
    ])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    kc = Mode("칸코레", titles=["艦これ"], is_game=True)
    a.watcher.mode = kc
    a.ask("원정 얘기 좀 그만해")
    _wait(qapp, a)
    a.ask("어디서든 쉬라는 소리 하지 마")
    _wait(qapp, a)
    rules = a.companion.memory.rules
    assert [(r["scope"], r["text"]) for r in rules] == [("칸코레", "원정 귀환 알림은 말하지 않기"),
                                                       ("전체", "쉬라는 잔소리 하지 않기")]
    # 다음부터 대화할 때도 알고 있다
    assert "원정 귀환 알림은 말하지 않기" in a.companion.system_blocks()[1]["text"]
    # 화면 판단 담당에게: 칸코레에서는 둘 다, 다른 게임에서는 '전체' 것만
    a.companion.judge(b"jpeg", "艦これ", "claude-haiku-5-5", None, mode=kc)
    system = fake.calls[-1]["system"]
    text = system if isinstance(system, str) else " ".join(b["text"] for b in system)
    assert "원정 귀환 알림은 말하지 않기" in text and "쉬라는 잔소리" in text and "speak=false" in text
    assert a.companion.memory.rules_for("원신") == ["쉬라는 잔소리 하지 않기"]
    # 창에서 보고, 지우고, 직접 적기
    dlg = RulesDialog(a.companion.memory, ["전체", "칸코레"])
    assert dlg.list.count() == 2 and "[칸코레]" in dlg.list.item(0).text()
    dlg.list.setCurrentRow(0)
    dlg._remove()
    dlg.scope.setCurrentText("칸코레")
    dlg.entry.setText("  보급 얘기 하지 않기 ")
    dlg._add()
    dlg._add()  # 같은 건 두 번 안 적힘 (빈 칸이라 무시)
    assert [(r["scope"], r["text"]) for r in a.companion.memory.rules] == [("전체", "쉬라는 잔소리 하지 않기"),
                                                                          ("칸코레", "보급 얘기 하지 않기")]
    a.quit()
    b = app_main.build(_settings(tmp_path, built["out"].as_posix()),
                       ai=AIClient(UsageLedger(tmp_path / "x.json"), client=FakeAnthropic()), tray=False)
    assert len(b.companion.memory.rules) == 2  # 다시 켜도 남아 있다


def test_corrected_word_sticks_everywhere(qapp, tmp_path, built):
    from companion import Reply

    from ui.terms_dialog import TermsDialog

    fake = FakeAnthropic([
        {"speak": True, "message": "남과를 넣은 수프네요.", "emotion": "normal", "action": "none", "target": ""},
        {"speak": True, "message": "네, 호박이요.", "emotion": "normal", "action": "correct_term", "target": "남과 → 호박"},
        {"speak": False, "urgent": False, "scene": "playing", "situation": "南瓜(남과) 수프를 만드는 중", "point": ""},
        {"speak": True, "message": "남과가 다 익었어요. 남과 비교해도 맛있겠네요.", "emotion": "happy"},
    ])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a.ask("이거 뭐야?")
    _wait(qapp, a)
    a.ask("남과가 아니라 호박이야")
    _wait(qapp, a)
    mem = a.companion.memory
    assert mem.term_pairs() == [("남과", "호박")]
    blocks = a.companion.system_blocks()
    assert "'남과' 가 아니라 '호박'" in blocks[1]["text"]
    history = mem.api_messages(10)
    assert "호박을 넣은 수프" in history[1]["content"]  # 예전에 잘못 말한 것도 고친 말로 보내서 따라 하지 않게
    assert "남과가 아니라 호박이야" in history[2]["content"]  # 주인님 말은 그대로
    note = a.companion.judge(b"jpeg", "게임", "claude-haiku-5-5", None)
    assert "남과" not in note["situation"] and "호박" in note["situation"]
    system = fake.calls[-1]["system"][0]["text"]
    assert "'호박'" in system and "南瓜(호박)" in system
    r = a.companion.screen_line(b"jpeg", "게임", {"situation": "수프", "point": ""})
    assert r.message == "호박이 다 익었어요. 남과 비교해도 맛있겠네요."  # '남과 비교' 같은 보통 말은 그대로
    dlg = TermsDialog(mem)
    assert dlg.list.count() == 1
    dlg.wrong.setText("艦隊")
    dlg.right.setText("함대")
    dlg._add()
    dlg.list.setCurrentRow(0)
    dlg._remove()
    assert mem.term_pairs() == [("艦隊", "함대")]
    a.quit()


def test_zoom_reads_small_text_at_native_resolution(qapp, tmp_path, built):
    from PIL import Image

    fake = FakeAnthropic([
        {"speak": True, "message": "확대해서 볼게요.", "emotion": "normal", "action": "zoom_screen", "target": "외침"},
        {"speak": True, "message": "외침에 '파티 구함 2/4'라고 올라와 있어요.", "emotion": "normal", "action": "none",
         "target": ""},
    ])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a.watcher.grabber = lambda: Image.new("RGB", (2560, 1440), (30, 30, 30))
    a.ask("외침 뭐라고 하는지 읽어줘")
    for _ in range(3):
        _wait(qapp, a)
    call = fake.calls[-1]
    content = call["messages"][-1]["content"]
    images = [b for b in content if b.get("type") == "image"]
    labels = [b["text"] for b in content if b.get("type") == "text"]
    assert len(images) == 5 and any("원래 해상도 조각: 왼쪽 아래" in t for t in labels)  # 전체 1 + 조각 4
    assert a.bubble.text == "외침에 '파티 구함 2/4'라고 올라와 있어요." and not a.busy
    a.quit()


def test_second_start_closes_the_first(qapp, tmp_path):
    import time as _t

    name = app_main.instance_name(tmp_path)
    pid_file = tmp_path / "data" / "instance.pid"
    assert not app_main.take_over_instance(name, pid_file)  # 처음엔 켜져 있는 것 없음
    quit_calls = []
    server = app_main.serve_instance(name, pid_file, lambda: quit_calls.append(1))
    assert pid_file.read_text(encoding="utf-8") == str(os.getpid())
    assert app_main.take_over_instance(name, pid_file)  # 두 번째로 켜면 → 첫 번째에게 꺼 달라고
    end = _t.monotonic() + 3
    while not quit_calls and _t.monotonic() < end:
        qapp.processEvents()
        _t.sleep(0.02)
    assert quit_calls == [1]
    server.close()


def test_chat_can_add_focus_and_block_window(qapp, tmp_path, built):
    fake = FakeAnthropic([
        {"speak": True, "message": "네, 챙겨 볼게요.", "emotion": "normal", "action": "add_focus",
         "target": "전체: 레진이 넘칠 것 같으면 알려 주기"},
        {"speak": True, "message": "그 창은 안 볼게요.", "emotion": "normal", "action": "block_window", "target": "국민은행"},
    ])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a.ask("레진 넘칠 것 같으면 말해 줘")
    _wait(qapp, a)
    a.ask("은행 사이트는 아예 보지 마")
    _wait(qapp, a)
    kinds = [(r.get("kind"), r["scope"], r["text"]) for r in a.companion.memory.rules]
    assert kinds == [("do", "전체", "레진이 넘칠 것 같으면 알려 주기"), ("skip", "전체", "국민은행")]
    assert a.watcher.blocked_word("chrome.exe", "국민은행 - 개인뱅킹") == "국민은행"
    a.quit()


def test_lookups_pile_up_in_a_per_game_dictionary(qapp, tmp_path, built):
    from watch.modes import Mode

    fake = FakeAnthropic([
        {"speak": True, "message": "찾아볼게요.", "emotion": "normal", "action": "web_search",
         "target": "붉은사막 회색갈기 퀘스트"},
        "## 진행\n- 회색갈기 야영지에서 시작, 늑대 3마리 처치 후 보고.",
        {"speak": True, "message": "야영지에서 시작하는 퀘스트예요.", "emotion": "normal"},
    ])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a.watcher.mode = Mode("붉은사막", is_game=True)
    a.ask("회색갈기 퀘스트 어떻게 해?")
    for _ in range(3):
        _wait(qapp, a)
    path = tmp_path / "data" / "knowledge" / "찾아본것_붉은사막.md"
    text = path.read_text(encoding="utf-8")
    assert text.startswith("게임: 붉은사막\n\n## 붉은사막 회색갈기 퀘스트 (찾아본 것,") and "키워드: 회색갈기" in text
    assert "\n## 진행" not in text  # 찾은 글 속 제목 줄이 항목을 끊지 않음
    found = a.companion.lorebook.find("[지금 하고 있는 게임: 붉은사막] 회색갈기 야영지 화면")
    assert [e.title.split(" (")[0] for e in found] == ["붉은사막 회색갈기 퀘스트"]
    assert a.companion.lorebook.find("원신 회색갈기") == []  # 다른 게임 얘기 중엔 안 꺼냄
    a.quit()
    b = app_main.build(_settings(tmp_path, built["out"].as_posix()),
                       ai=AIClient(UsageLedger(tmp_path / "x.json"), client=FakeAnthropic()), tray=False)
    assert b.companion.lorebook.find("붉은사막 회색갈기")  # 다시 켜도 남아 있음


def test_spoiler_entries_come_with_a_warning():
    from lorebook import LoreBook

    book = LoreBook(LoreBook.parse("## 3장 결말 (스포일러)\n키워드: 검은곰\n- 누가 배신함\n\n## 검은곰 야영지\n키워드: 야영지\n- 위치\n"))
    assert "스포 주의" in book.notes_for("검은곰 이야기") and "스포 주의" not in book.notes_for("야영지 어디")


def test_reminder_and_todo_from_chat_and_firing(qapp, tmp_path, built):
    from datetime import datetime as _dt

    from ui.planner_dialog import PlannerDialog

    fake = FakeAnthropic([
        {"speak": True, "message": "11시에 알려 드릴게요.", "emotion": "normal", "action": "set_reminder",
         "target": "2026-11-10 23:00 | 자라고 말하기 | 없음"},
        {"speak": True, "message": "적어 둘게요.", "emotion": "normal", "action": "add_todo", "target": "E3 甲 깨기 | "},
        {"speak": True, "message": "주인님, 11시예요. 이제 주무실 시간입니다.", "emotion": "normal"},
    ])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a.ask("11시에 자라고 해줘")
    _wait(qapp, a)
    a.ask("할 일에 E3 甲 깨기 적어줘")
    _wait(qapp, a)
    assert [r["text"] for r in a.planner.reminders] == ["자라고 말하기"]
    assert "[알림] 2026-11-10 23:00 자라고 말하기" in a.companion.system_blocks()[1]["text"]
    assert "[할 일] E3 甲 깨기" in a.companion.system_blocks()[1]["text"]
    a.planner.clock = lambda: _dt(2026, 11, 10, 23, 0, 30)
    a.check_reminders()
    _wait(qapp, a)
    assert a.planner.reminders == [] and "11시예요" in a.bubble.text
    assert "알림 시각이 됐다: 자라고 말하기" in str(fake.calls[-1]["messages"])
    dlg = PlannerDialog(a.planner)
    assert dlg.todo_list.count() == 1 and dlg.rem_list.count() == 0
    dlg.rem_text.setText("물 마시기")
    dlg._add_reminder()
    assert [r["text"] for r in a.planner.reminders] == ["물 마시기"]
    a.quit()


def test_recap_and_daily_briefing(qapp, tmp_path, built):
    fake = FakeAnthropic([
        {"speak": True, "message": "정리해 볼게요.", "emotion": "normal", "action": "make_recap", "target": "today"},
        {"speak": True, "summary": "오늘은 사이퍼즈를 오래 하셨네요.", "situation": "저녁 내내 게임",
         "points": [], "next_steps": ["물 마시기"], "emotion": "happy"},
        {"speak": True, "message": "좋은 아침입니다. 오늘 할 일이 하나 있어요.", "emotion": "normal"},
    ])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a.ask("오늘 하루 정리해줘")
    _wait(qapp, a)
    a.make_recap("today")  # 대화 뒤 0.3초 뒤에 시작하는 것을 바로
    _wait(qapp, a)
    assert "오늘 11/" in str(fake.calls[1]["messages"]) or "오늘 " in str(fake.calls[1]["messages"])
    assert a.analysis_panel.isVisible()
    assert a.bubble.text == "오늘은 사이퍼즈를 오래 하셨네요."
    a.bubble.hide()
    a.planner.add_todo("E3 甲 깨기")
    a.briefing()
    _wait(qapp, a)
    assert "브리핑" in str(fake.calls[2]["messages"]) and "E3 甲 깨기" in str(fake.calls[2]["messages"])
    calls = len(fake.calls)
    a.briefing()  # 하루 한 번만
    assert len(fake.calls) == calls
    a.quit()


def test_petting_highlight_and_speaking(qapp, tmp_path, built):
    import time as _t

    from PySide6.QtCore import QPoint

    from tts import Speaker, clean_for_speech

    fake = FakeAnthropic([
        {"speak": True, "message": "저장해 둘게요.", "emotion": "normal", "action": "save_clip", "target": ""},
        {"speak": True, "message": "……갑자기 왜 그러십니까.", "emotion": "surprised"},
    ])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a.watcher.frames.extend([(1.0, b"jpg1"), (2.0, b"jpg2")])
    a.ask("방금 거 저장해줘")
    _wait(qapp, a)
    saved = list((tmp_path / "data" / "highlights").iterdir())
    assert len(saved) == 1 and (saved[0] / "02.jpg").read_bytes() == b"jpg2"
    assert "방금 거 저장해줘" in (saved[0] / "메모.txt").read_text(encoding="utf-8")
    # 쓰다듬기: 머리 쪽에서 좌우로 여러 번
    pets = []
    a.window.petted.connect(lambda: pets.append(1))
    a.bubble.hide()
    for x in (10, 40, 10, 40, 10, 40, 10):
        a.window._track_pet(QPoint(x, 5))
    assert pets == [1]
    _wait(qapp, a)
    assert "쓰다듬었다" in str(fake.calls[-1]["messages"]) and a.bubble.text == "……갑자기 왜 그러십니까."
    for x in (10, 40, 10, 40, 10, 40):
        a.window._track_pet(QPoint(x, a.window.height() - 2))  # 발 쪽은 쓰다듬기 아님
    assert pets == [1]
    # 소리 내서 말하기: 이모지·괄호는 빼고 읽음, Windows 가 아니면 조용히 꺼짐
    assert clean_for_speech("⏰ 레진 (180/200) 넘쳐요!") == "레진 넘쳐요!"
    sp = Speaker()
    sp.speak("안녕하세요")
    end = _t.monotonic() + 2
    while sp.available is None and _t.monotonic() < end:
        _t.sleep(0.05)
    assert sp.available is False and sp.problem
    a.quit()


def test_away_pauses_screen_and_briefs_on_return(qapp, tmp_path, built):
    fake = FakeAnthropic([{"speak": True, "message": "일어나셨군요. 오늘 할 일이 하나 있어요.", "emotion": "normal"}])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a.set_pref("assist.briefing_date", "2000-01-01")
    a.planner.add_todo("E3 甲 깨기")
    t = {"now": 0.0, "idle": 0.0}
    a.clock = lambda: t["now"]
    a.idle_seconds = lambda: t["idle"]
    a.bubble.hide()
    assert a._screen_allowed()
    t["now"], t["idle"] = 25 * 60, 25 * 60  # 25분째 입력 없음 → 자리 비움
    a.check_away()
    assert not a._screen_allowed() and fake.calls == []
    t["now"], t["idle"] = 8 * 3600, 5  # 8시간 뒤 마우스 움직임 → 돌아옴 → 브리핑
    a.check_away()
    _wait(qapp, a)
    assert a._screen_allowed() or a.bubble.isVisible()
    sent = str(fake.calls[-1]["messages"])
    assert "자리를 비웠다가" in sent and "E3 甲 깨기" in sent and "일어나셨군요" in a.bubble.text
    a.quit()



def test_resume_progress_chores_and_news_dates(qapp, tmp_path, built):
    from datetime import datetime as _dt

    from watch.modes import Mode

    fake = FakeAnthropic([
        {"progress": "3장 '금빛 탐욕' 진행 중, 쪼개진뿔 카일록을 쓰러뜨림"},
        {"speak": True, "message": "지난번엔 카일록까지 쓰러뜨리셨어요. 이어서 3장이에요.", "emotion": "normal"},
        {"speak": True, "message": "알겠어요, 5장으로 기억할게요.", "emotion": "normal", "action": "set_progress",
         "target": "붉은사막: 5장 진입, 다음 목표는 델레시아"},
    ])
    s = _settings(tmp_path, built["out"].as_posix())
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.start()
    a.watcher.session_ended.emit("붉은사막", 40.0, ["2장 진행", "카일록 보스전", "카일록 쓰러뜨림"])
    _wait(qapp, a)
    assert "카일록" in a.progress.text_for("붉은사막") and "progress" == fake.calls[0].get("output_config", {}) \
        .get("format", {}).get("schema", {}).get("required", [""])[0]
    assert "[주인님 붉은사막 진행" in a._game_context(Mode("붉은사막", is_game=True))
    a.progress.games["붉은사막"]["last_played"] = "2026-11-01T20:00"  # 오래간만에 켬 → 이어하기 한마디
    a.bubble.hide()
    a.watcher.session_started.emit("붉은사막")
    _wait(qapp, a)
    assert "다시 켰다" in str(fake.calls[1]["messages"]) and "카일록" in a.bubble.text
    a.ask("나 붉은사막 5장 들어왔어")
    _wait(qapp, a)
    assert a.progress.text_for("붉은사막") == "5장 진입, 다음 목표는 델레시아"
    # 숙제: 최근 3일 안에 하던 칸코레를 오늘 아직 안 켰으면 밤에 한 번
    kc = Mode("칸코레", is_game=True, daily_reset="05:00", weekly_reset="mon 05:00", daily_note="일일 임무")
    a.progress.games["칸코레"] = {"last_played": "2026-11-07T22:00"}
    night = _dt(2026, 11, 8, 23, 0)  # 일요일 밤
    chores = a.progress.chores([kc], night)
    assert len(chores) == 2 and "일일 임무" in chores[0] and "11/09 05:00" in chores[1]
    assert a.progress.chores([kc], night) == []  # 하루 한 번
    assert a.progress.chores([kc], _dt(2026, 11, 10, 15, 0)) == []  # 낮에는 안 함
    # 최신 소식 일정 → 알림 자동 등록
    future = _dt.now().replace(microsecond=0)
    end = (future.replace(hour=23, minute=59) + __import__("datetime").timedelta(days=5)).strftime("%Y-%m-%d %H:%M")
    start = (future + __import__("datetime").timedelta(days=2)).strftime("%Y-%m-%d %H:%M")
    items = [{"name": "가을 이벤트", "kind": "event", "start": "", "end": end},
             {"name": "정기 점검", "kind": "maintenance", "start": start, "end": ""},
             {"name": "이상한 날짜", "kind": "event", "start": "", "end": "언젠가"}]
    assert a.schedule_from_news("칸코레", items) == 3
    assert a.schedule_from_news("칸코레", items) == 0  # 같은 건 한 번만
    texts = [r["text"] for r in a.planner.reminders]
    assert any("끝나기 3일 전" in t for t in texts) and any("점검 1시간 전" in t for t in texts)
    a.quit()
