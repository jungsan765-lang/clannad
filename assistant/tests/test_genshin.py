"""원신 계정 정보 (진열장·실시간 메모·기원 기록) — 네트워크 없이 가짜 데이터로."""

import json
import os
import sys
import types
from datetime import datetime, timedelta

import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from fake_anthropic import FakeAnthropic  # noqa: E402
from PySide6.QtWidgets import QApplication  # noqa: E402

from gamedata import genshin_data as gd  # noqa: E402

AVATARS = {"10000143": {"Element": "Wind", "NameTextMapHash": 111, "WeaponType": "WEAPON_SWORD_ONE_HAND"}}
LOCS = {"ko": {"111": "베스나"}}
LOC = {"ko": {"222": "천공의 검", "333": "핏빛 증표"}}
SHOWCASE = {
    "playerInfo": {"nickname": "하늘고래", "level": 60, "worldLevel": 9, "towerFloorIndex": 12, "towerLevelIndex": 3},
    "ttl": 120,
    "avatarInfoList": [{
        "avatarId": 10000143, "propMap": {"4001": {"val": "90"}}, "talentIdList": [1, 2],
        "fightPropMap": {"2000": 18000, "2001": 2100, "2002": 800, "20": 0.621, "22": 1.85, "23": 1.4, "28": 80,
                         "44": 0.466, "30": 0.0},
        "equipList": [
            {"weapon": {"level": 90, "affixMap": {"1": 0}},
             "flat": {"itemType": "ITEM_WEAPON", "nameTextMapHash": "222"}},
            *[{"flat": {"itemType": "ITEM_RELIQUARY", "setNameTextMapHash": "333", "equipType": slot,
                        "reliquaryMainstat": {"mainPropId": prop}}}
              for slot, prop in [("EQUIP_BRACER", "FIGHT_PROP_HP"), ("EQUIP_NECKLACE", "FIGHT_PROP_ATTACK"),
                                 ("EQUIP_SHOES", "FIGHT_PROP_ATTACK_PERCENT"), ("EQUIP_RING", "FIGHT_PROP_WIND_ADD_HURT"),
                                 ("EQUIP_DRESS", "FIGHT_PROP_CRITICAL")]],
        ],
    }],
}


def fake_fetch(calls):
    def fetch(url):
        calls.append(url)
        if url.endswith("gi/avatars.json"):
            return AVATARS
        if url.endswith("gi/locs.json"):
            return LOCS
        if url.endswith("loc.json"):
            return LOC
        if "/api/uid/" in url:
            return SHOWCASE
        raise AssertionError(url)
    return fetch


def test_showcase_summary_in_korean_and_ttl_respected(tmp_path):
    calls, t = [], {"now": 1000.0}
    g = gd.GenshinData(tmp_path, uid="812345678", fetch=fake_fetch(calls), clock=lambda: t["now"])
    assert g.refresh_showcase()
    text = g.showcase_text
    assert "모험 등급 60" in text and "나선 비경 12-3" in text
    assert "베스나 Lv90 2돌 (바람·한손검)" in text and "천공의 검 Lv90 1재련" in text
    assert "치확 62.1%" in text and "치피 185.0%" in text and "원충 140.0%" in text and "바람 피해 46.6%" in text
    assert "성유물 핏빛 증표 5" in text and "성배 바람 원소 피해 보너스" in text and "왕관 치명타 확률" in text
    n = len(calls)
    assert not g.refresh_showcase() and len(calls) == n  # ttl(120초) 전엔 다시 안 물음
    t["now"] += 130
    assert g.refresh_showcase() and len(calls) == n + 1  # Enka 데이터 파일은 받아 둔 것을 씀
    assert (tmp_path / "enka" / "avatars.json").is_file()


def test_enka_errors_are_korean(tmp_path):
    def fetch(url):
        if "/api/uid/" in url:
            err = OSError("x")
            err.code = 404
            raise err
        return {}

    g = gd.GenshinData(tmp_path, uid="812345678", fetch=fetch)
    assert not g.refresh_showcase() and "찾지 못했어요" in g.last_error["showcase"]
    assert not gd.GenshinData(tmp_path, uid="12ab").has_uid


def _wish(i, name, rarity, banner=301):
    return types.SimpleNamespace(id=i, name=name, rarity=rarity, type="캐릭터",
                                 time=datetime(2026, 9, 1) + timedelta(minutes=i), banner_type=banner)


def install_fake_genshin(monkeypatch, notes=None, wishes=None, authkey="KEY"):
    seen = {"clients": [], "notes_calls": []}
    mod = types.ModuleType("genshin")
    mod.Game = types.SimpleNamespace(GENSHIN="genshin")

    class Client:
        def __init__(self, cookies=None, **kw):
            seen["clients"].append({"cookies": cookies, **kw})

        async def get_genshin_notes(self, uid, autoauth=True):
            seen["notes_calls"].append({"uid": uid, "autoauth": autoauth})
            return notes

        def wish_history(self, banner, authkey=None, lang=None):
            async def gen():
                for w in sorted((wishes or {}).get(banner, []), key=lambda w: -w.id):  # 최신부터
                    yield w
            return gen()

    def get_authkey(game=None):
        if authkey is None:
            raise FileNotFoundError("no log")
        return authkey

    mod.Client = Client
    mod.utility = types.SimpleNamespace(get_authkey=get_authkey)
    monkeypatch.setitem(sys.modules, "genshin", mod)
    return seen


def _notes(resin=192, done=2, coin=2400, finished=5):
    exp = [types.SimpleNamespace(status="Finished" if i < finished else "Ongoing") for i in range(5)]
    return types.SimpleNamespace(current_resin=resin, max_resin=200, remaining_resin_recovery_time=timedelta(minutes=64),
                                 completed_commissions=done, max_commissions=4, claimed_commission_reward=False,
                                 current_realm_currency=coin, max_realm_currency=2400, remaining_resin_discounts=3,
                                 expeditions=exp)


def test_notes_need_login_never_change_account_settings_and_alert_once(tmp_path, monkeypatch):
    seen = install_fake_genshin(monkeypatch, notes=_notes())
    cookies = {}
    t = {"now": 0.0}
    g = gd.GenshinData(tmp_path, uid="812345678", cookies=lambda: cookies, clock=lambda: t["now"])
    assert not g.refresh_notes()  # 로그인 전엔 묻지 않음
    cookies.update({"ltuid_v2": "1", "ltoken_v2": "x"})
    assert g.refresh_notes()
    assert seen["notes_calls"] == [{"uid": 812345678, "autoauth": False}]  # HoYoLAB 설정을 바꾸지 않음
    assert seen["clients"][0]["cookies"] == cookies and seen["clients"][0]["lang"] == "ko-kr"
    text = g.notes_text()
    assert "레진 192/200 (가득 차기까지 1시간 4분)" in text and "일일 의뢰 2/4 (보상 아직)" in text
    night = datetime(2026, 11, 10, 23, 0)
    alerts = g.alerts(night)
    assert len(alerts) == 4 and "레진이 192/200" in alerts[0]
    assert g.alerts(night) == []  # 같은 일은 다시 안 알림
    t["now"] += 5 * 3600
    assert [a for a in g.alerts(night) if "레진" in a]  # 4시간 지나면 레진은 다시


def test_wishes_accumulate_new_only_and_pity(tmp_path, monkeypatch):
    first = {301: [_wish(1, "베스나", 5), _wish(2, "미탸", 4), _wish(3, "검", 3), _wish(4, "검", 3)],
             302: [_wish(10, "검", 3)]}
    install_fake_genshin(monkeypatch, wishes=first)
    g = gd.GenshinData(tmp_path, uid="812345678")
    assert g.refresh_wishes() == 5
    more = {301: first[301] + [_wish(5, "검", 3), _wish(6, "오데트", 4)], 302: first[302]}
    install_fake_genshin(monkeypatch, wishes=more)
    g2 = gd.GenshinData(tmp_path, uid="812345678")  # 껐다 켜도 쌓인 기록은 남음
    assert g2.refresh_wishes() == 2 and len(g2.wishes["301"]) == 6
    text = gd.pity_summary(g2.wishes)
    assert "캐릭터 이벤트 기원: 마지막 5성 뒤 5번, 4성 뒤 0번 (기록 6번)" in text
    assert "무기 이벤트 기원: 마지막 5성 뒤 1번" in text and "베스나(2026-09-01, 캐릭터 이벤트 기원)" in text
    install_fake_genshin(monkeypatch, authkey=None)
    assert g2.refresh_wishes() == 0 and "기록을 한 번 열어" in g2.last_error["wishes"]


def test_context_text_combines_everything(tmp_path, monkeypatch):
    install_fake_genshin(monkeypatch, notes=_notes(resin=100), wishes={301: [_wish(1, "베스나", 5)]})
    g = gd.GenshinData(tmp_path, uid="812345678", cookies=lambda: {"ltuid_v2": "1", "ltoken_v2": "x"},
                       fetch=fake_fetch([]))
    assert g.context_text() == ""
    g.refresh_notes()
    g.refresh_wishes()
    g.refresh_showcase()
    text = g.context_text()
    assert text.startswith("[주인님 원신 계정 정보") and "레진 100/200" in text and "베스나" in text and "진열장" in text


def test_secret_store_roundtrip(tmp_path):
    from secret_store import SecretStore, protect, unprotect

    s = SecretStore(tmp_path / "secrets.bin")
    s.set("hoyolab", {"ltuid_v2": "1", "ltoken_v2": "비밀"})
    assert SecretStore(tmp_path / "secrets.bin").get("hoyolab")["ltoken_v2"] == "비밀"
    assert "비밀".encode() not in (tmp_path / "secrets.bin").read_bytes()  # 글자 그대로 저장하지 않음
    s.delete("hoyolab")
    assert s.get("hoyolab") is None
    assert unprotect(protect(b"abc")) == b"abc"


def test_hoyolab_cookie_parsing_and_capture():
    from ui import hoyolab_login as hl

    assert hl.parse_cookie_text("mi18nLang=ko-kr; ltuid_v2=123; ltoken_v2=v2_abc; other=1") == \
        {"ltuid_v2": "123", "ltoken_v2": "v2_abc"}
    app = QApplication.instance() or QApplication([])  # noqa: F841
    dlg = hl.HoyolabLogin(web=False)

    class Cookie:
        def __init__(self, name, value, domain=".hoyolab.com"):
            self.n, self.v, self.d = name, value, domain

        def name(self):
            return self.n.encode()

        def value(self):
            return self.v.encode()

        def domain(self):
            return self.d

    dlg._on_cookie(Cookie("ltuid_v2", "9", ".evil.com"))
    assert dlg.cookies == {}
    dlg._on_cookie(Cookie("ltuid_v2", "9"))
    dlg._on_cookie(Cookie("_ga", "x"))
    dlg._on_cookie(Cookie("ltoken_v2", "tok"))
    assert dlg.cookies == {"ltuid_v2": "9", "ltoken_v2": "tok"} and "확인됐어요" in dlg.info.text()
    dlg.paste.setPlainText("ltuid_v2=1")
    dlg._use_paste()
    assert "둘 다" in dlg.info.text()


def test_app_passes_genshin_info_to_chat_and_announces(tmp_path, monkeypatch):
    import main as app_main
    from ai_client import AIClient
    from settings import Settings
    from usage import UsageLedger

    from test_app import _settings, _wait

    install_fake_genshin(monkeypatch, notes=_notes(resin=195, finished=0, coin=10))
    app = QApplication.instance() or QApplication([])
    s = _settings(tmp_path, "no_such_folder")
    fake = FakeAnthropic([{"speak": True, "message": "레진이 거의 찼습니다, 주인님.", "emotion": "normal"},
                          {"speak": True, "message": "레진은 195입니다.", "emotion": "normal"}])
    a = app_main.build(s, ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.secrets.set("hoyolab", {"ltuid_v2": "1", "ltoken_v2": "x"})
    a.apply_settings({"genshin.uid": "812345678"})
    a.genshin.fetch = fake_fetch([])
    a.refresh_genshin(force=True)
    _wait(app, a)
    _wait(app, a)
    assert a.bubble.text == "레진이 거의 찼습니다, 주인님."  # 먼저 알려 줌
    assert "레진이 195/200" in json.dumps(fake.calls[0]["messages"][-1], ensure_ascii=False)
    a.bubble.hide()
    a.ask("오늘 레진 얼마나 남았어?")
    _wait(app, a)
    sent = json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False)
    assert "주인님 원신 계정 정보" in sent and "레진 195/200" in sent
    a.ask("점심 뭐 먹지")
    _wait(app, a)
    assert "원신 계정 정보" not in json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False)
    assert "연결됨" in a.hoyolab_status()
    a.hoyolab_logout()
    assert a.hoyolab_status() == "연결 안 됨"
    a.quit()
