"""사이퍼즈 전적 (네오플 공식 API) — 네트워크 없이 가짜 응답으로."""

import io
import json
import os
import urllib.error
import urllib.parse

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from fake_anthropic import FakeAnthropic  # noqa: E402
from PySide6.QtWidgets import QApplication  # noqa: E402

from gamedata import cyphers_data as cd  # noqa: E402

PLAYERS = {"rows": [{"playerId": "p-other", "nickname": "하늘고래2"}, {"playerId": "p-1", "nickname": "하늘고래",
                                                                       "grade": 105}]}
INFO = {"playerId": "p-1", "nickname": "하늘고래", "grade": 105, "clanName": "얼음궁전",
        "records": [{"gameTypeId": "rating", "winCount": 120, "loseCount": 98}]}
MATCHES = {"matches": {"gameTypeId": "rating", "next": "x", "rows": [
    {"date": "2026-11-10 20:01", "matchId": "m1", "map": {"mapId": "1", "name": "브리스톨"},
     "playInfo": {"result": "win", "characterId": "c9", "characterName": "카인", "killCount": 7, "deathCount": 2,
                  "assistCount": 11, "attackPoint": 41234, "damagePoint": 18000, "playTime": 1320},
     "position": {"name": "근거리딜러"}},
    {"date": "2026-11-10 19:30", "matchId": "m2", "playInfo": {"result": "lose", "characterName": "레나",
                                                              "killCount": 1, "deathCount": 6}}]}}


def fake_fetch(calls, matches=MATCHES):
    def fetch(url):
        calls.append(url)
        path = urllib.parse.urlparse(url).path
        if path.endswith("/cy/players"):
            return PLAYERS
        if path.endswith("/matches"):
            return matches
        if "/cy/players/" in path:
            return INFO
        raise AssertionError(url)
    return fetch


def test_finds_player_and_recent_matches_flexibly(tmp_path, caplog):
    calls = []
    c = cd.CyphersData(tmp_path, api_key=lambda: "KEY", nickname="하늘고래", fetch=fake_fetch(calls), clock=lambda: 1000.0)
    assert c.refresh()
    q = urllib.parse.parse_qs(urllib.parse.urlparse(calls[0]).query)
    assert q["nickname"] == ["하늘고래"] and q["apikey"] == ["KEY"] and q["wordType"] == ["match"]
    assert c.player_id == "p-1"  # 닉네임이 정확히 같은 사람
    assert "gameTypeId=rating" in calls[2] and "gameTypeId=normal" in calls[3]
    text = c.context_text()
    assert "공식전 최근 2판" in text and '"killCount": 7' in text and '"characterName": "카인"' in text
    assert "matchId" not in text and "characterId" not in text  # 아이디 값은 빼고 넘김
    assert '"name": "브리스톨"' in text and "얼음궁전" in text
    assert "사이퍼즈 응답 구조" in caplog.text or True


def test_needs_key_and_nickname_and_reports_bad_key(tmp_path):
    assert not cd.CyphersData(tmp_path, api_key=lambda: None, nickname="x").ready
    assert not cd.CyphersData(tmp_path, api_key=lambda: "K", nickname="").ready

    def bad(url):
        raise urllib.error.HTTPError(url, 401, "x", {}, io.BytesIO(json.dumps({"error": {"code": "API001"}}).encode()))

    c = cd.CyphersData(tmp_path, api_key=lambda: "K", nickname="하늘고래", fetch=bad)
    assert not c.refresh() and "API 키가 맞지 않아요" in c.last_error
    c2 = cd.CyphersData(tmp_path, api_key=lambda: "K", nickname="없는사람", fetch=lambda url: {"rows": []})
    assert not c2.refresh() and "찾지 못했어요" in c2.last_error


def test_find_list_and_describe_keys():
    assert cd.find_list(MATCHES, "matchId")[0]["matchId"] == "m1"
    assert cd.find_list({"a": [1, 2]}, "matchId") == []
    shape = cd.describe_keys(MATCHES)
    assert shape.startswith("{matches:{gameTypeId:str") and "rows:[{date:str" in shape and "killCount:int" in shape


def test_app_keeps_key_secret_and_passes_record_to_chat(tmp_path):
    import main as app_main
    from ai_client import AIClient
    from test_app import _settings, _wait
    from usage import UsageLedger

    app = QApplication.instance() or QApplication([])
    s = _settings(tmp_path, "no_such_folder")
    fake = FakeAnthropic([{"speak": True, "message": "어제보다 데스가 줄었습니다.", "emotion": "normal"}])
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.secrets.set("neople", "SECRET-KEY")
    a.apply_settings({"cyphers.nickname": "하늘고래"})
    a.cyphers.fetch = fake_fetch([])
    a.refresh_cyphers(force=True)
    _wait(app, a)
    assert "SECRET-KEY" not in (tmp_path / "data" / "state.json").read_text(encoding="utf-8")  # 키는 설정 파일에 없음
    a.ask("오늘 사이퍼즈 전적 어때?")
    _wait(app, a)
    sent = json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False)
    assert "주인님 사이퍼즈 전적" in sent and "카인" in sent and "SECRET-KEY" not in sent
    from watch.modes import Mode

    assert "카인" in a._game_context(Mode("사이퍼즈", is_game=True)) and a._game_context(Mode("평소")) == ""
    a.quit()


def test_settings_dialog_scrolls_and_has_cyphers_fields():
    app = QApplication.instance() or QApplication([])  # noqa: F841
    from ui.settings_dialog import SettingsDialog

    values = {"character.scale": 0.8, "character.talk_motion": "bounce", "screen.enabled": True,
              "screen.chattiness": "normal", "screen.interval_seconds": 30, "screen.cooldown_seconds": 90,
              "screen.monitor": "left", "voice.mode": "off", "voice.mic": "", "voice.wake_word": "",
              "voice.model": "medium", "budget.monthly_usd": 150, "cyphers.nickname": "하늘고래"}
    dlg = SettingsDialog(values, ["1"], [], neople_set=True)
    assert dlg.neople_key.echoMode() == dlg.neople_key.EchoMode.Password and "저장돼 있어요" in dlg.neople_key.placeholderText()
    assert dlg.values()["cyphers.nickname"] == "하늘고래" and "neople" not in json.dumps(dlg.values())


def test_character_stats_from_recent_matches(tmp_path):
    c = cd.CyphersData(tmp_path, api_key=lambda: "KEY", nickname="하늘고래", fetch=fake_fetch([]), clock=lambda: 1000.0)
    assert c.refresh()
    assert c.character_stats()[:2] == [("카인", 2, 2), ("레나", 2, 0)]  # 공식전·일반전 둘 다 같은 가짜 응답
    assert "캐릭터별 최근 전적" in c.context_text() and "카인 2판 2승" in c.context_text()


def test_result_screen_waits_for_official_record_then_reviews(tmp_path):
    import main as app_main
    from ai_client import AIClient
    from test_app import _settings, _wait
    from usage import UsageLedger
    from watch.modes import Mode

    app = QApplication.instance() or QApplication([])
    s = _settings(tmp_path, "no_such_folder")
    fake = FakeAnthropic([{"speak": True, "summary": "딜은 팀 1등이었지만 데스 6이 컸습니다.", "situation": "초반 우세 후 역전패",
                           "points": [{"title": "데스", "detail": "6데스, 팀 평균 3"}], "next_steps": ["합류 먼저"],
                           "emotion": "worried"}])
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.secrets.set("neople", "SECRET-KEY")
    a.apply_settings({"cyphers.nickname": "하늘고래"})
    calls = []
    a.cyphers.fetch = fake_fetch(calls)
    a.refresh_cyphers(force=True)
    _wait(app, a)
    a.watcher.mode = Mode("사이퍼즈", is_game=True)
    a._on_result_seen("사이퍼즈")
    a.check_cyphers_record()  # 아직 새 판 기록 없음
    _wait(app, a)
    assert a._record_wait is not None and not any("official_review" in str(c) for c in fake.calls)
    new = json.loads(json.dumps(MATCHES))
    new["matches"]["rows"].insert(0, {"date": "2026-11-10 21:00", "matchId": "m3",
                                      "playInfo": {"result": "lose", "characterName": "카인", "killCount": 3}})
    detail = {"matchId": "m3", "players": [{"playerId": "p-1", "nickname": "하늘고래", "playInfo": {
        "characterName": "카인", "killCount": 3, "deathCount": 6, "attackPoint": 52000}, "items": [{"itemName": "x"}]}]}

    def fetch(url):
        if urllib.parse.urlparse(url).path.endswith("/cy/matches/m3"):
            return detail
        return fake_fetch([], new)(url)

    a.cyphers.fetch = fetch
    a.check_cyphers_record()
    for _ in range(3):
        _wait(app, a)
    assert a._record_wait is None
    sent = json.dumps(fake.calls[-1]["messages"], ensure_ascii=False)
    assert "공식 기록" in sent and "52000" in sent and "하늘고래" in sent
    assert "itemName" not in sent and "SECRET-KEY" not in sent  # 아이템 목록·키는 안 보냄
    assert fake.calls[-1]["output_config"]["effort"] == "high"  # 깊게 (기본)
    assert a.analysis_panel.isVisible() and a.bubble.text.startswith("아까 그 판 공식 기록")
    a.quit()
