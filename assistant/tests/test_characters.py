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


def test_screen_lines_rotate_reaction_angles_from_the_persona(tmp_path):
    from ai_client import AIClient
    from companion import DEFAULT_ANGLES, Companion, persona_angles
    from fake_anthropic import FakeAnthropic
    from usage import UsageLedger

    persona = ("# 산드로네\n## 4. 말투\n- 반말\n## 9. 반응의 결 (돌아가며)\n"
               "- 자랑: 네 솜씨를 자랑한다\n- 투덜: 짧게 투덜거린다\n- **놀리기**: 너를 놀린다\n")
    assert [a for a, _ in persona_angles(persona)] == ["자랑", "투덜", "놀리기"]
    assert persona_angles("# 다니카\n## 4. 말투\n- 존댓말\n") is DEFAULT_ANGLES  # 절이 없으면 기본
    line = {"speak": True, "message": "흥, 그 정도는 나도 하지.", "emotion": "normal"}
    fake = FakeAnthropic([dict(line) for _ in range(6)])
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), Memory(tmp_path / "d"), persona,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    picked = []
    for _ in range(5):
        comp.screen_line(b"jpeg", "방송", {"situation": "빼빼로 그리기", "point": ""})
        sent = json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False)
        picked.append(next(a for a in ("자랑", "투덜", "놀리기") if f"결: {a} —" in sent))
    assert all(picked[i] != picked[i + 1] for i in range(4))  # 연달아 같은 결은 안 나옴
    assert all(len(set(picked[i:i + 3])) == 3 for i in range(3))  # 최근 두 번과도 다름
    comp.screen_line(b"jpeg", "방송", {"situation": "빼빼로", "point": ""}, question="저거 뭐야?")
    assert "이번 한마디" not in json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False)  # 물어본 답엔 안 붙음


def test_screen_line_writes_three_drafts_then_picks_one(tmp_path):
    from ai_client import AIClient
    from companion import DRAFT_SCHEMA, REPLY_SCHEMA, Companion, partial_message
    from fake_anthropic import FakeAnthropic
    from usage import UsageLedger

    assert list(DRAFT_SCHEMA["properties"])[0] == "drafts"  # 후보를 다 쓴 뒤에 고른 말이 나온다
    assert "drafts" not in REPLY_SCHEMA["properties"]  # 대화 답에는 후보가 없다
    pick = {"drafts": ["이 정도 손글씨면 나도 눈 감고 쓰지.", "하, 몇 분째야.", "너 군침 흘리지?"],
            "speak": True, "message": "이 정도 손글씨면 나도 눈 감고 쓰지.", "emotion": "normal"}
    fake = FakeAnthropic([dict(pick), dict(pick), dict(pick)])
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), Memory(tmp_path / "d"), "# 산드로네",
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    r = comp.screen_line(b"jpeg", "방송", {"situation": "빼빼로", "point": ""})
    call = fake.calls[-1]
    assert r.message == "이 정도 손글씨면 나도 눈 감고 쓰지."
    assert "drafts" in call["output_config"]["format"]["schema"]["properties"]
    assert "drafts 에 서로 다른 결의 짧은 후보 3개" in json.dumps(call["messages"][-1], ensure_ascii=False)
    comp.screen_line(b"jpeg", "방송", {"situation": "빼빼로", "point": ""}, question="저거 뭐야?")
    assert "drafts" not in fake.calls[-1]["output_config"]["format"]["schema"]["properties"]  # 물어본 답은 바로
    comp.drafts = False  # 설정에서 끄면 바로
    comp.screen_line(b"jpeg", "방송", {"situation": "빼빼로", "point": ""})
    assert "drafts" not in fake.calls[-1]["output_config"]["format"]["schema"]["properties"]
    # 실시간 표시는 후보가 아니라 고른 말부터
    assert partial_message('{"drafts":["하, 몇 분째야."],"speak":true,"message":"이 정도 손') == "이 정도 손"
    assert partial_message('{"drafts":["하, 몇 분') is None


def test_mood_lasts_a_while_and_topics_and_forms_mix_in(tmp_path):
    from ai_client import AIClient
    from companion import Companion
    from fake_anthropic import FakeAnthropic
    from usage import UsageLedger

    persona = ("# 산드로네\n## 9. 반응의 결\n- 자랑: 자랑한다\n- 투덜: 투덜거린다\n"
               "## 10. 기분 (한동안)\n- 시큰둥: 말이 짧다\n- 장난기: 놀리고 싶다\n"
               "## 11. 화제\n- 티타임: 오늘 마실 차\n- 파지오: 새 조수\n- 콜롬비나\n"
               "## 12. 말 모양\n- 혼잣말: 중얼거린다\n- 되묻기: 질문으로 끝낸다\n")
    line = {"speak": True, "message": "흥.", "emotion": "normal"}
    fake = FakeAnthropic([dict(line) for _ in range(40)])
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), Memory(tmp_path / "d"), persona,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    t = {"now": 0.0}
    comp.clock = lambda: t["now"]
    sent = []
    for _ in range(20):
        comp.screen_line(b"jpeg", "방송", {"situation": "빼빼로", "point": ""})
        sent.append(json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False))
    moods = {m for m in ("시큰둥", "장난기") for x in sent if f"지금 기분: {m}" in x}
    assert len(moods) == 1  # 기분은 한동안 그대로
    assert any("떠올릴 거리: " in x for x in sent) and not all("떠올릴 거리: " in x for x in sent)  # 화제는 가끔
    assert any("모양: 혼잣말" in x for x in sent) and any("모양: 되묻기" in x for x in sent)
    before = comp.mood()
    t["now"] += 41 * 60  # 40분 넘게 지나면 다른 기분
    assert comp.mood() != before
    comp.reply("뭐 해?")  # 대화에도 같은 기분이 이어짐
    assert f"[지금 네 기분: {comp.mood()[0]}" in json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False)


def test_overused_words_are_named_so_the_next_line_avoids_them():
    from companion import overused_words

    lines = ["흥, 채팅은 또 빼빼로 얘기네.", "흥, 채팅이 시끄럽군.", "채팅은 만족한 눈치야.", "하, 몇 분째야."]
    worn = overused_words(lines)
    assert "흥(말 시작 2번)" in worn and "채팅(3번)" in worn  # '채팅은·채팅이'도 같은 말로 센다
    assert overused_words(["오늘은 맑네.", "디저트 먹고 싶다."]) == []


def test_reactions_file_next_to_persona_feeds_the_ingredients(tmp_path):
    from PySide6.QtWidgets import QApplication

    import main as app_main
    from ai_client import AIClient
    from fake_anthropic import FakeAnthropic
    from usage import UsageLedger

    app = QApplication.instance() or QApplication([])  # noqa: F841
    char = tmp_path / "char"
    char.mkdir()
    (char / "persona.md").write_text("# 다니카\n## 4. 말투 규칙\n- 존댓말\n", encoding="utf-8")
    (char / "reactions.md").write_text("## 1. 반응의 결\n- 보고: 담담하게 짚는다\n- 크흠: 웃음을 참는다\n"
                                       "## 2. 기분\n- 평온: 차분하다\n", encoding="utf-8")
    (tmp_path / "config.toml").write_text(
        f'[app]\ndata_dir = "{(tmp_path / "data").as_posix()}"\n'
        f'[character]\nfolder = "missing"\npersona = "{(char / "persona.md").as_posix()}"\nscale = 0.5\n'
        '[update]\nauto = false\n[memory]\ndiary = false\n[local]\nenabled = false\npaddle_ocr = false\n'
        '[ears]\nenabled = false\n', encoding="utf-8")
    a = app_main.build(Settings.load(tmp_path), ai=AIClient(UsageLedger(tmp_path / "x.json"), client=FakeAnthropic([])),
                       tray=False)
    text = a.companion.flavor()
    assert ("결: 보고" in text or "결: 크흠" in text) and "지금 기분: 평온" in text
    assert not any(e.title.startswith("1. 반응의 결") for e in a.companion.lorebook.entries)  # 사전에는 안 들어감
    assert "반응의 결" not in json.dumps(a.companion.system_blocks(), ensure_ascii=False)  # 성격 프롬프트에도 통째로는 안 들어감
    a.quit()
