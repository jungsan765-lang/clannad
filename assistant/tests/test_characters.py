"""캐릭터 여럿 (메뉴에서 바꿔 씀): 주인님 기억은 같이, 캐릭터 자기 대화·약속·일기는 따로."""

import json
import os

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from memory import SELF, Memory  # noqa: E402
from settings import Settings  # noqa: E402


def test_user_memory_is_shared_but_self_memory_and_recent_talk_are_not(tmp_path):
    danika = Memory(tmp_path)  # 예전처럼 이름 없이 만들면 다니카
    danika.add_fact("주인님 정보", "주인님은 오이를 싫어한다", 3)
    danika.add_fact(SELF, "나는 주인님 책상을 매일 정리하겠다고 약속했다", 3)
    danika.add_turn("안녕", "어서 오세요, 주인님.")
    assert danika.facts[-1]["category"] == "다니카 자신"

    sandrone = Memory(tmp_path, who="sandrone", name="산드로네")
    assert [f["text"] for f in sandrone.active_facts()] == ["주인님은 오이를 싫어한다"]  # 주인님 기억은 같이
    assert "다니카 자신" not in sandrone.notes_text() and "오이" in sandrone.notes_text()
    assert sandrone.recent == [] and sandrone.api_messages(5) == []  # 다니카와 한 대화는 산드로네 대화가 아님
    sandrone.add_fact(SELF, "나는 기계 손질을 좋아한다고 말했다", 2)
    sandrone.add_turn("뭐 해?", "너 신경 쓸 일 아니야.")
    assert sandrone.facts[-1]["category"] == "산드로네 자신"
    assert sandrone.categories()[6] == "산드로네 자신"
    assert "[산드로네 자신] (네가 예전에 한 말·약속" in sandrone.notes_text()
    assert (tmp_path / "recent_sandrone.json").is_file()

    # 정리할 대화도 캐릭터마다: 산드로네가 정리해도 다니카 대화는 남아서 다니카가 나올 때 정리
    assert len(sandrone.my_pending) == 1 and len(sandrone.pending) == 2
    assert "뭐 해?" in sandrone.consolidation_input() and "안녕" not in sandrone.consolidation_input()
    assert "[자기 자신] 나는 기계 손질" in sandrone.consolidation_input()  # AI 에겐 늘 '자기 자신'으로
    sandrone.apply_ops([{"op": "add", "category": SELF, "text": "나는 차를 즐겨 마신다고 했다", "importance": 2}], 1)
    assert sandrone.my_pending == [] and sandrone.facts[-1]["category"] == "산드로네 자신"

    danika2 = Memory(tmp_path)
    assert len(danika2.my_pending) == 1 and danika2.my_pending[0]["user"] == "안녕"
    assert [m["text"] for m in danika2.recent] == ["안녕", "어서 오세요, 주인님."]
    assert not any("산드로네 자신" == f["category"] for f in danika2.active_facts())  # 산드로네 약속은 다니카에겐 안 보임
    log = (tmp_path / "logs").glob("*.jsonl")
    rows = [json.loads(line) for p in log for line in p.read_text(encoding="utf-8").splitlines()]
    assert {r.get("name") for r in rows} == {"다니카", "산드로네"}  # 누가 한 말인지 원본 기록에 남김


def test_recall_index_says_who_talked(tmp_path):
    from recall import EpisodeIndex

    Memory(tmp_path, who="sandrone", name="산드로네").add_turn("오늘 뭐 했어?", "네가 알 바 아니야.")
    idx = EpisodeIndex(tmp_path / "recall.db")
    idx.sync(tmp_path)
    hits = idx.search(["오늘"], limit=5)
    assert any("산드로네: 네가 알 바 아니야." in h.text for h in hits)


def test_character_profile_overrides_only_what_it_sets(tmp_path):
    import main as app_main

    data = {"character": {"folder": "character/danika_still", "persona": "character/danika/persona.md", "scale": 0.8},
            "characters": {"danika": {"name": "다니카"},
                           "sandrone": {"name": "산드로네", "folder": "character/sandrone_still",
                                        "persona": "character/sandrone/persona.md",
                                        "lore_dirs": ["character/sandrone", "character/danika"]}}}
    s = Settings(json.loads(json.dumps(data)), tmp_path)
    assert app_main.apply_character_profile(s) == ("danika", "다니카")
    assert s.get("character.folder") == "character/danika_still"  # 다니카는 예전 설정 그대로
    s = Settings(json.loads(json.dumps(data)), tmp_path)
    s.set("character.active", "sandrone")
    assert app_main.apply_character_profile(s) == ("sandrone", "산드로네")
    assert s.get("character.folder") == "character/sandrone_still" and s.get("character.scale") == 0.8
    s = Settings(json.loads(json.dumps(data)), tmp_path)
    s.set("character.active", "nobody")  # 없는 캐릭터면 다니카
    assert app_main.apply_character_profile(s)[0] == "danika"
    assert app_main.character_profiles(Settings({}, tmp_path)) == {"danika": {"name": "다니카"}}


def test_menu_switches_character_by_saving_and_restarting(tmp_path):
    from PySide6.QtWidgets import QApplication

    import main as app_main
    from ai_client import AIClient
    from fake_anthropic import FakeAnthropic
    from ui.placeholder import make_placeholder
    from usage import UsageLedger

    app = QApplication.instance() or QApplication([])
    make_placeholder(tmp_path / "sandrone_still")
    (tmp_path / "config.toml").write_text(
        f'[app]\ndata_dir = "{(tmp_path / "data").as_posix()}"\n'
        '[character]\nfolder = "missing"\npersona = "none.md"\nscale = 0.5\n'
        '[characters.danika]\nname = "다니카"\n'
        f'[characters.sandrone]\nname = "산드로네"\nfolder = "{(tmp_path / "nowhere").as_posix()}"\n'
        '[update]\nauto = false\n[memory]\ndiary = false\n[local]\nenabled = false\npaddle_ocr = false\n'
        '[ears]\nenabled = false\n', encoding="utf-8")
    a = app_main.build(Settings.load(tmp_path), ai=AIClient(UsageLedger(tmp_path / "x.json"), client=FakeAnthropic([])),
                       tray=False)
    assert a.char_key == "danika" and set(a.char_actions) == {"danika", "sandrone"}
    assert a.char_actions["danika"].isChecked()
    restarts = []
    a.restart = lambda: restarts.append(1)
    a.switch_character("sandrone")  # 그림 폴더가 아직 없으면 안 바꾸고 알려 줌
    assert "산드로네 그림 폴더가 없어요" in a.bubble.text and a.pref("character.active", "danika") == "danika"
    a.settings.set("characters.sandrone.folder", (tmp_path / "sandrone_still").as_posix())
    a.switch_character("sandrone")
    assert a.pref("character.active") == "sandrone" and "산드로네(으)로 바꿀게요" in a.bubble.text
    a.quit()
    # 다시 켜면 산드로네: 이름·대화·일기 폴더가 산드로네 것
    (tmp_path / "config.toml").write_text((tmp_path / "config.toml").read_text(encoding="utf-8").replace(
        (tmp_path / "nowhere").as_posix(), (tmp_path / "sandrone_still").as_posix()), encoding="utf-8")
    b = app_main.build(Settings.load(tmp_path), ai=AIClient(UsageLedger(tmp_path / "y.json"), client=FakeAnthropic([])),
                       tray=False)
    assert b.char_key == "sandrone" and b.char_name == "산드로네" and b.companion.memory.self_category == "산드로네 자신"
    assert b.diary_dir.name == "diary_sandrone" and b.pref("character.since.sandrone")  # 일기는 처음 나온 날부터
    b.quit()
