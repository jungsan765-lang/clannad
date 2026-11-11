"""스타레일 계정 정보 (HoYoLAB 실시간 메모·워프 기록) — genshin.py 는 가짜로 바꿔 끼운다."""

import sys
import types
from datetime import datetime, timedelta

from gamedata import starrail_data as sd


def install_fake_starrail(monkeypatch, notes=None, warps=None, authkey="KEY"):
    seen = {"clients": [], "notes_calls": []}
    mod = types.ModuleType("genshin")
    mod.Game = types.SimpleNamespace(GENSHIN="genshin", STARRAIL="hkrpg")

    class Client:
        def __init__(self, cookies=None, **kw):
            seen["clients"].append({"cookies": cookies, **kw})

        async def get_starrail_notes(self, uid, autoauth=True):
            seen["notes_calls"].append({"uid": uid, "autoauth": autoauth})
            return notes

        def warp_history(self, banner, authkey=None, lang=None):
            async def gen():
                for w in sorted((warps or {}).get(banner, []), key=lambda w: -w.id):  # 최신부터
                    yield w
            return gen()

    def get_authkey(game=None):
        seen["authkey_game"] = game
        if authkey is None:
            raise FileNotFoundError("no log")
        return authkey

    mod.Client = Client
    mod.utility = types.SimpleNamespace(get_authkey=get_authkey)
    monkeypatch.setitem(sys.modules, "genshin", mod)
    return seen


def _notes(stamina=285, train=300, rogue=8000, discounts=3, finished=4, reserve_full=False):
    exp = [types.SimpleNamespace(status="Finished" if i < finished else "Ongoing") for i in range(4)]
    return types.SimpleNamespace(current_stamina=stamina, max_stamina=300, stamina_recover_time=timedelta(minutes=90),
                                 current_reserve_stamina=1200, is_reserve_stamina_full=reserve_full,
                                 current_train_score=train, max_train_score=500, current_rogue_score=rogue,
                                 max_rogue_score=14000, remaining_weekly_discounts=discounts, max_weekly_discounts=3,
                                 expeditions=exp)


def _warp(i, name, rarity):
    return types.SimpleNamespace(id=i, name=name, rarity=rarity, type="캐릭터",
                                 time=datetime(2026, 10, 1, 12, 0) + timedelta(minutes=i))


def test_starrail_notes_use_the_same_login_and_alert_once(tmp_path, monkeypatch):
    seen = install_fake_starrail(monkeypatch, notes=_notes())
    cookies = {}
    t = {"now": 0.0}
    g = sd.StarRailData(tmp_path, uid="801234567", cookies=lambda: cookies, clock=lambda: t["now"])
    assert not g.refresh_notes()  # 로그인 전엔 묻지 않음
    cookies.update({"ltuid_v2": "1", "ltoken_v2": "x"})
    assert g.refresh_notes()
    assert seen["notes_calls"] == [{"uid": 801234567, "autoauth": False}]  # HoYoLAB 설정을 바꾸지 않음
    assert seen["clients"][0]["game"] == "hkrpg" and seen["clients"][0]["lang"] == "ko-kr"
    text = g.notes_text()
    assert "개척력 285/300 (가득 차기까지 1시간 30분), 예비 개척력 1200" in text and "일일 훈련 300/500" in text
    assert "전쟁의 여운 할인 남은 3/3번" in text and "의뢰 파견 4개 중 완료 4개" in text
    sunday_night = datetime(2026, 11, 15, 23, 0)  # 일요일 밤: 일일 훈련·주간 점수·전쟁의 여운까지
    alerts = g.alerts(sunday_night)
    assert "개척력이 285/300라 곧 가득 찬다." in alerts[0] and len(alerts) == 5
    assert any("일일 훈련이 300/500" in a for a in alerts) and any("전쟁의 여운 할인이 3번" in a for a in alerts)
    assert g.alerts(sunday_night) == []  # 같은 일은 다시 안 알림
    g.notes = _notes(stamina=120, train=500, rogue=14000, discounts=0, finished=1)
    t["now"] += 30 * 3600
    assert g.alerts(datetime(2026, 11, 16, 14, 0)) == []  # 할 게 없으면 조용히
    g.notes = _notes(stamina=299, reserve_full=True)
    assert "넘치면 낭비" in g.alerts(datetime(2026, 11, 16, 14, 0))[0]


def test_warps_accumulate_and_pity(tmp_path, monkeypatch):
    first = {11: [_warp(1, "아케론", 5), _warp(2, "펠라", 4), _warp(3, "광추", 3)], 12: [_warp(10, "광추", 3)]}
    seen = install_fake_starrail(monkeypatch, warps=first)
    g = sd.StarRailData(tmp_path, uid="801234567")
    assert g.refresh_wishes() == 4 and seen["authkey_game"] == "hkrpg"
    more = {11: first[11] + [_warp(4, "광추", 3)], 12: first[12]}
    install_fake_starrail(monkeypatch, warps=more)
    g2 = sd.StarRailData(tmp_path, uid="801234567")  # 껐다 켜도 쌓인 기록은 남음
    assert g2.refresh_wishes() == 1
    g2.cookies = lambda: {"ltuid_v2": "1", "ltoken_v2": "x"}
    text = g2.context_text()
    assert text.startswith("[주인님 스타레일 계정 정보")
    assert "워프: 캐릭터 이벤트 워프: 마지막 5성 뒤 3번, 4성 뒤 2번 (기록 4번)" in text and "아케론(2026-10-01" in text
    install_fake_starrail(monkeypatch, authkey=None)
    assert g2.refresh_wishes() == 0 and "워프 → 기록을 한 번 열어" in g2.last_error["wishes"]


def test_app_passes_starrail_info_to_chat(tmp_path, monkeypatch):
    import json

    from PySide6.QtWidgets import QApplication

    import main as app_main
    from ai_client import AIClient
    from test_app import FakeAnthropic, _settings, _wait
    from usage import UsageLedger

    install_fake_starrail(monkeypatch, notes=_notes())
    app = QApplication.instance() or QApplication([])
    s = _settings(tmp_path, "no_such_folder")
    fake = FakeAnthropic([{"speak": True, "message": "개척력은 285예요.", "emotion": "normal"},
                          {"speak": True, "message": "오늘은 짜장면 어떠세요?", "emotion": "normal"}])
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.secrets.set("hoyolab", {"ltuid_v2": "1", "ltoken_v2": "x"})
    a.starrail.uid = "801234567"
    assert a.starrail.refresh_notes()
    a.ask("개척력 얼마나 남았어?")
    _wait(app, a)
    sent = json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False)
    assert "주인님 스타레일 계정 정보" in sent and "개척력 285/300" in sent
    a.ask("점심 뭐 먹지")
    _wait(app, a)
    assert "스타레일 계정 정보" not in json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False)
    assert "스타레일 계정 정보" in a._game_context(type("M", (), {"name": "스타레일"})())  # 스타레일 중이면 화면 대사에도
    a.quit()
