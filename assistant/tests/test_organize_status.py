"""파일 정리, '지금 하는 일' 표시, 실시간 대답, 빠른 모드."""

import json
import os
from pathlib import Path

import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from fake_anthropic import FakeAnthropic  # noqa: E402
from PySide6.QtCore import QRect  # noqa: E402
from PySide6.QtWidgets import QApplication  # noqa: E402

import ai_client  # noqa: E402
import organizer as org  # noqa: E402
from ai_client import AIClient  # noqa: E402
from companion import Companion, partial_message  # noqa: E402
from memory import Memory  # noqa: E402
from usage import UsageLedger  # noqa: E402


@pytest.fixture(scope="module")
def qapp():
    return QApplication.instance() or QApplication([])


def _files(folder: Path, names):
    folder.mkdir(parents=True, exist_ok=True)
    for n in names:
        (folder / n).write_bytes(b"x" * 10)


# ---------------------------------------------------------------- 파일 정리

def test_scan_skips_shortcuts_partial_downloads_and_folders(tmp_path):
    _files(tmp_path, ["a.jpg", "b.pdf", "desktop.ini", "c.crdownload", "d.lnk", "~$e.docx", ".hidden"])
    (tmp_path / "sub").mkdir()
    files, total = org.scan(tmp_path)
    assert sorted(f["name"] for f in files) == ["a.jpg", "b.pdf"] and total == 2
    assert files[0]["size_kb"] >= 1 and len(files[0]["modified"]) == 10


def test_sanitize_keeps_only_listed_files_and_safe_folder_names(tmp_path):
    files = [{"name": n} for n in ("a.jpg", "b.pdf", "c.zip")]
    plan = {"moves": [
        {"file": "a.jpg", "folder": "사진", "reason": "사진"},
        {"file": "a.jpg", "folder": "다른곳", "reason": "중복"},
        {"file": "없는파일.txt", "folder": "문서", "reason": ""},
        {"file": "b.pdf", "folder": "../../윈도우", "reason": "경로 탈출 시도"},
        {"file": "c.zip", "folder": "CON", "reason": "예약된 이름"},
    ]}
    moves = org.sanitize(plan, files)
    assert [(m.file, m.folder) for m in moves] == [("a.jpg", "사진"), ("b.pdf", "윈도우")]


def test_apply_never_overwrites_and_undo_restores(tmp_path):
    _files(tmp_path, ["a.jpg", "b.jpg", "c.pdf"])
    _files(tmp_path / "사진", ["a.jpg"])  # 같은 이름이 이미 있음
    o = org.Organizer(tmp_path / "log.jsonl")
    steps = []
    r = o.apply(tmp_path, [org.Move("a.jpg", "사진"), org.Move("b.jpg", "사진"), org.Move("c.pdf", "문서"),
                           org.Move("gone.txt", "문서")], progress=lambda i, n: steps.append((i, n)))
    assert (tmp_path / "사진" / "a (2).jpg").is_file() and (tmp_path / "사진" / "a.jpg").is_file()
    assert (tmp_path / "문서" / "c.pdf").is_file() and r.failed == ["gone.txt"] and len(r.moved) == 3
    assert steps[-1] == (4, 4)
    assert o.undo_last() == (3, 0)
    assert sorted(p.name for p in tmp_path.iterdir() if p.is_file()) == ["a.jpg", "b.jpg", "c.pdf", "log.jsonl"]
    assert not (tmp_path / "문서").exists()  # 새로 만든 빈 폴더는 지움
    assert (tmp_path / "사진" / "a.jpg").is_file()  # 원래 있던 건 그대로
    assert o.last_batch() is None and o.undo_last() == (0, 0)


def test_blocked_folders_and_known_names(tmp_path, monkeypatch):
    assert "드라이브" in org.blocked_reason(Path(Path.cwd().anchor))
    assert "사용자 폴더" in org.blocked_reason(Path.home())
    assert "프로그램 폴더" in org.blocked_reason(org.ROOT)
    assert org.blocked_reason(tmp_path) is None
    assert org.blocked_reason(tmp_path / "없음") is not None
    assert org.resolve_target("다운로드 폴더")[1] == "다운로드"
    assert org.resolve_target("바탕 화면")[1] == "바탕화면"
    assert org.resolve_target(str(tmp_path)) == (tmp_path, str(tmp_path))
    assert org.resolve_target("") is None and org.resolve_target("어딘가") is None


# ---------------------------------------------------------------- 하는 일 표시

def test_status_pill_shows_latest_task_with_seconds(qapp):
    from ui.status import StatusPill

    t = {"now": 0.0}
    pill = StatusPill(lambda: QRect(100, 100, 300, 500), clock=lambda: t["now"])
    assert not pill.isVisible()
    pill.begin("chat", "생각 중")
    assert pill.isVisible() and pill.text.startswith("생각 중")
    pill.begin("memory", "기억 정리 중")
    t["now"] = 5
    pill.refresh()
    assert pill.text.startswith("기억 정리 중") and pill.text.endswith("5초")
    pill.end("memory")
    assert pill.text.startswith("생각 중")
    pill.set_text("chat", "말하는 중")
    assert pill.text.startswith("말하는 중") and pill.text.endswith("5초")  # 시작 시각은 그대로
    pill.set_enabled(False)
    assert not pill.isVisible()
    pill.set_enabled(True)
    pill.end("chat")
    assert not pill.isVisible() and pill.text == ""
    assert pill.geometry().bottom() <= 600  # 캐릭터 아래쪽 안에


# ---------------------------------------------------------------- 실시간 대답·빠른 모드

def test_partial_message_reads_unfinished_json():
    assert partial_message('{"speak": true, "message": "차 준비됐') == "차 준비됐"
    assert partial_message('{"speak":true,"message":"a\\"b\\nc", "e') == 'a"b\nc'
    assert partial_message('{"speak": tr') is None
    assert partial_message('{"message": "\\uc548\\ub155') == "안녕"


def _comp(tmp_path, replies):
    fake = FakeAnthropic(replies)
    ai = AIClient(UsageLedger(tmp_path / "u.json"), client=fake)
    return Companion(ai, Memory(tmp_path), None, chat_model="claude-opus-5-5", memory_model="claude-opus-5-5"), fake


def test_reply_streams_korean_and_hides_english(tmp_path):
    comp, fake = _comp(tmp_path, [
        {"speak": True, "message": "Sure, I can help you with that right now.", "emotion": "normal"},
        {"speak": True, "message": "네, 바로 도와드릴게요.", "emotion": "normal"},
    ])
    shown = []
    r = comp.reply("도와줘", on_partial=shown.append)
    assert r.message == "네, 바로 도와드릴게요."
    assert shown == [] and fake.calls[0].get("streamed")  # 영어는 한 글자도 보여주지 않음
    comp2, _ = _comp(tmp_path / "b", [{"speak": True, "message": "다운로드 폴더를 정리해 볼게요.", "emotion": "normal",
                                      "action": "organize_files", "target": "다운로드"}])
    shown = []
    r = comp2.reply("다운로드 정리해줘", on_partial=shown.append)
    assert shown and shown[-1] == "다운로드 폴더를 정리해 볼게요." and all(s for s in shown)
    assert r.action == "organize_files" and r.target == "다운로드"


def test_reply_schema_requires_action_and_rules_list_abilities(tmp_path):
    comp, fake = _comp(tmp_path, [])
    comp.reply("안녕")
    req = fake.calls[-1]
    schema = req["output_config"]["format"]["schema"]
    assert {"action", "target"} <= set(schema["required"])
    assert "organize_files" in schema["properties"]["action"]["enum"]
    assert "아직 못 한다" in req["system"][0]["text"]


def test_fast_mode_only_on_opus_and_falls_back(tmp_path, monkeypatch):
    comp, fake = _comp(tmp_path, [])
    comp.fast = True
    comp.reply("안녕")
    assert fake.calls[-1]["speed"] == "fast"
    ai = comp.ai
    ai.complete_json(model="claude-haiku-5-5", system=[], messages=[{"role": "user", "content": "x"}],
                     schema={"type": "object"}, kind="judge", fast=True)
    assert "speed" not in fake.calls[-1]  # Haiku 는 빠른 모드 없음

    class Busy(Exception):
        pass

    real = fake.messages.create
    fake.beta.messages.create = lambda **kw: (_ for _ in ()).throw(Busy()) if kw.get("speed") else real(**kw)
    monkeypatch.setattr(ai_client, "_is_fast_problem", lambda exc: isinstance(exc, Busy))
    r = comp.reply("또 안녕", on_partial=None)
    assert r.speak and "speed" not in fake.calls[-1]  # 막히면 보통 속도로 다시


def test_plan_organize_counts_progress(tmp_path):
    plan = {"summary": "사진 2개를 모아 두겠습니다.", "moves": [
        {"file": "a.jpg", "folder": "사진", "reason": "사진"}, {"file": "b.png", "folder": "사진", "reason": "사진"}]}
    comp, fake = _comp(tmp_path, [plan])
    counts = []
    data = comp.plan_organize("다운로드", [{"name": "a.jpg", "size_kb": 3, "modified": "2026-11-01"},
                                         {"name": "b.png", "size_kb": 3, "modified": "2026-11-02"}], on_count=counts.append)
    assert data == plan and counts[-1] == 2 and fake.calls[-1].get("streamed")
    assert "a.jpg\t3KB\t2026-11-01" in fake.calls[-1]["messages"][0]["content"]


# ---------------------------------------------------------------- 인터넷 검색·배경지식

def test_search_then_answer_and_remember(tmp_path):
    from types import SimpleNamespace

    comp, fake = _comp(tmp_path, ["- 로노바는 천리의 네 그림자 중 '죽음의 그림자'다.\n- 나타 마신 임무에 나온다.",
                                  {"speak": True, "message": "로노바 말씀이시군요. 죽음의 그림자입니다.",
                                   "emotion": "normal"}])
    real_create = fake.messages.create

    def create_with_search(**kw):  # 검색 전 말 + 검색 블록 + 결과 글을 흉내
        r = real_create(**kw)
        if kw.get("tools"):
            r.content = [SimpleNamespace(type="text", text="검색해 볼게요."),
                         SimpleNamespace(type="server_tool_use", name="web_search"),
                         SimpleNamespace(type="web_search_tool_result", content=[])] + r.content
            r.usage.server_tool_use = SimpleNamespace(web_search_requests=2)
        return r

    fake.messages.create = create_with_search
    notes, usd = comp.search("원신 로노바", "로노바 알아?")
    req = fake.calls[0]
    assert req["model"] == "claude-haiku-5-5" and req["tools"][0]["type"] == "web_search_20250305"
    assert req["thinking"] == {"type": "disabled"} and "output_config" not in req or "format" not in req["output_config"]
    assert notes.startswith("- 로노바는") and "검색해 볼게요" not in notes
    assert usd >= 0.02  # 검색 2번 = 0.02달러 + 토큰
    assert "원신 로노바" in comp.memory.knowledge_text() and comp.memory.knowledge[-1]["text"] == notes
    r = comp.reply_after_search("원신 로노바", notes)
    assert r.message.startswith("로노바 말씀") and r.action == "none"
    sent = fake.calls[-1]
    assert "죽음의 그림자" in json.dumps(sent["messages"][-1], ensure_ascii=False)
    assert "찾아보고 알게 된 것" in sent["system"][1]["text"]  # 다음부터는 검색 없이 앎
    from memory import Memory
    assert Memory(tmp_path).knowledge[-1]["query"] == "원신 로노바"  # 껐다 켜도 남음


def test_search_rule_and_lore_in_system_prompt(tmp_path):
    comp, fake = _comp(tmp_path, [])
    comp.lore = "## 스네즈나야\n- 얼음의 여황이 다스리는 나라."
    comp.reply("안녕")
    first = fake.calls[-1]["system"][0]["text"]
    assert "web_search" in first and "배경지식" in first and "얼음의 여황" in first
    comp.can_search = False
    comp.reply("안녕")
    assert "검색은 지금 꺼져 있다" in fake.calls[-1]["system"][0]["text"]


# ---------------------------------------------------------------- 게임 모드 만들기·개선 요청 메모

def test_make_mode_searches_then_writes_mode(tmp_path):
    mode = {"name": "엘든 링", "titles": ["ELDEN RING"], "interval_seconds": 20, "cooldown_seconds": 120,
            "quiet_during_play": False, "review_on_result": False, "knowledge": "- 소울라이크 액션",
            "urgent": "", "intro": "엘든 링에 맞춰 준비해 두었습니다."}
    comp, fake = _comp(tmp_path, ["- 프롬 소프트웨어의 오픈월드 액션 RPG.", mode])
    data, usd = comp.make_mode("eldenring.exe", "ELDEN RING", ["보스전", "필드 탐색"])
    assert data == mode and fake.calls[0].get("tools") and fake.calls[1]["output_config"]["format"]
    sent = fake.calls[1]["messages"][0]["content"]
    assert "eldenring.exe" in sent and "보스전" in sent and "오픈월드" in sent


def test_wishlist_add_dedupe_and_text(tmp_path):
    from wishlist import Wishlist

    w = Wishlist(tmp_path / "requests.json")
    assert "없어요" in w.text()
    assert w.add("알람 맞춰 주는 기능") and not w.add("알람  맞춰 주는 기능")
    w.add("유튜브 영상 요약")
    text = Wishlist(tmp_path / "requests.json").text()  # 껐다 켜도 남음
    assert "(2개)" in text and "1. [" in text and "유튜브 영상 요약" in text
    w.clear()
    assert w.items == []


def test_screen_line_can_ask_to_look_up_a_name(tmp_path):
    comp, fake = _comp(tmp_path, [{"speak": True, "message": "", "emotion": "normal", "action": "web_search",
                                   "target": "원신 로노바"}])
    r = comp.screen_line(b"jpg", "원신", None)
    assert r.speak and r.message == "" and r.action == "web_search" and r.target == "원신 로노바"
    assert "이름표" not in fake.calls[-1]["system"][0]["text"]  # 규칙은 화면 지시 쪽에
    sent = json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False)
    assert "글자로 보이는 이름" in sent and "생김새로 아는" in sent and "단정하지는 않는다" in sent


def test_user_names_and_pinned_facts_reach_prompts(tmp_path):
    comp, fake = _comp(tmp_path, [])
    comp.user_names = ["하늘고래", "SkyWhale"]
    comp.memory.add_pinned("주인님은 민트초코를 싫어한다.")
    assert not comp.memory.add_pinned("주인님은 민트초코를 싫어한다.")  # 같은 건 한 번만
    comp.reply("안녕")
    second = fake.calls[-1]["system"][1]["text"]
    assert second.startswith("# 꼭 기억할 것") and "'하늘고래', 'SkyWhale'" in second and "민트초코" in second
    comp.judge(b"jpg", "원신", "claude-haiku-5-5", None)
    assert "'하늘고래'" in json.dumps(fake.calls[-1]["messages"][0]["content"][1], ensure_ascii=False)
    from memory import Memory
    assert Memory(tmp_path).pinned == ["주인님은 민트초코를 싫어한다."]  # 껐다 켜도 남음


def test_stable_prompt_part_is_cached_for_an_hour_and_priced(tmp_path):
    from types import SimpleNamespace

    from ai_client import _usage_dict
    from usage import cost_usd

    comp, fake = _comp(tmp_path, [])
    comp.reply("안녕")
    sys_blocks = fake.calls[-1]["system"]
    assert sys_blocks[0]["cache_control"] == {"type": "ephemeral", "ttl": "1h"}
    assert sys_blocks[1]["cache_control"] == {"type": "ephemeral", "ttl": "1h"}  # 기억 부분도 (게임 중 띄엄띄엄 말해도)
    u = SimpleNamespace(input_tokens=0, output_tokens=0, cache_read_input_tokens=0, cache_creation_input_tokens=1_000_000,
                        cache_creation=SimpleNamespace(ephemeral_1h_input_tokens=600_000, ephemeral_5m_input_tokens=400_000))
    d = _usage_dict(u)
    assert d["cache_creation_1h_input_tokens"] == 600_000 and d["cache_creation_input_tokens"] == 400_000
    assert cost_usd("claude-opus-5-5", d) == pytest.approx(0.6 * 8 + 0.4 * 5)


# ---------------------------------------------------------------- 필요할 때 꺼내 보는 사전

LORE = """# 노드크라이 사전

## 나샤 마을
키워드: 나샤, Nasha
- 노드크라이의 중심 마을.

## 라우마 (달의 륜 · 풀)
키워드: 라우마, Lauma
- 노드크라이의 성녀.

## 키워드 없는 항목
- 제목만으로 찾는다.
"""


def test_lorebook_finds_entries_by_name(tmp_path):
    from lorebook import LoreBook

    (tmp_path / "lore").mkdir()
    (tmp_path / "lore" / "nodkrai.md").write_text(LORE, encoding="utf-8")
    book = LoreBook.load(tmp_path / "lore")
    assert [e.title for e in book.entries][:2] == ["나샤 마을", "라우마 (달의 륜 · 풀)"]
    assert "라우마" in book.entries[1].keywords and "키워드:" not in book.entries[1].text
    assert [e.title for e in book.find("라우마랑 나샤 마을 갔어")] == ["나샤 마을", "라우마 (달의 륜 · 풀)"] or \
        {e.title for e in book.find("라우마랑 나샤 마을 갔어")} == {"나샤 마을", "라우마 (달의 륜 · 풀)"}
    assert book.find("오늘 날씨 좋다") == []
    assert book.find("키워드 없는 항목 알아?")[0].title == "키워드 없는 항목"
    assert book.find("lauma")[0].title.startswith("라우마")  # 영어 이름도 (대소문자 무시)
    assert LoreBook.load(tmp_path / "없음").entries == []


def test_lorebook_notes_go_into_chat_and_screen_prompts(tmp_path):
    from lorebook import LoreBook

    comp, fake = _comp(tmp_path, [{"speak": True, "message": "라우마 님 말씀이군요.", "emotion": "normal"},
                                  {"speak": True, "message": "나샤 마을이군요.", "emotion": "normal"}])
    comp.lorebook = LoreBook(LoreBook.parse(LORE))
    comp.reply("라우마 알아?")
    sent = json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False)
    assert "관련 배경지식" in sent and "노드크라이의 성녀" in sent and "중심 마을" not in sent
    comp.screen_line(b"jpg", "Genshin Impact [genshinimpact.exe]", {"situation": "나샤 마을 광장 탐험 중", "point": ""})
    sent = json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False)
    assert "중심 마을" in sent


def test_lorebook_reads_files_next_to_persona_but_not_core_files(tmp_path):
    from lorebook import LoreBook

    (tmp_path / "persona.md").write_text("## 성격\n키워드: 성격\n- x", encoding="utf-8")
    (tmp_path / "lore.md").write_text("## 스네즈나야\n키워드: 스네즈나야\n- 늘 아는 것", encoding="utf-8")
    (tmp_path / "nodkrai.md").write_text(LORE, encoding="utf-8")
    book = LoreBook.load(tmp_path, tmp_path / "lore")
    titles = [e.title for e in book.entries]
    assert "나샤 마을" in titles and "성격" not in titles and "스네즈나야" not in titles


# ---------------------------------------------------------------- 분석 모드

def test_analyze_sends_frames_in_order_with_context_and_parses(tmp_path):
    from lorebook import LoreBook

    data = {"speak": True, "summary": "파티의 원충이 모자랍니다.", "situation": "나선 비경 12층 전반 직후",
            "points": [{"title": "원소 충전", "detail": "베스나 원충 110%라 원소폭발이 늦게 돎."}],
            "next_steps": ["시계를 원충 시계로 바꾸기"], "emotion": "normal"}
    comp, fake = _comp(tmp_path, [data, dict(data, summary="The party lacks energy recharge.")])
    comp.lorebook = LoreBook(LoreBook.parse(LORE))
    comp.extra_context = lambda mode: "[주인님 원신 계정 정보] 베스나 원충 110%"
    a = comp.analyze([(b"old", 40.0), (b"now", 0.0)], "Genshin Impact", note={"situation": "라우마와 대화", "point": ""})
    assert a.speak and a.summary == "파티의 원충이 모자랍니다." and a.points[0]["title"] == "원소 충전"
    req = fake.calls[-1]
    assert req["output_config"]["effort"] == "medium" and req["max_tokens"] == 8000
    assert set(req["output_config"]["format"]["schema"]["required"]) >= {"summary", "points", "next_steps"}
    content = req["messages"][-1]["content"]
    assert [c["type"] for c in content] == ["text", "image", "text", "image", "text"]
    assert content[0]["text"] == "(40초 전 화면)" and content[2]["text"] == "(지금 화면)"
    tail = content[-1]["text"]
    assert "[분석]" in tail and "원충 110%" in tail and "노드크라이의 성녀" in tail
    assert not comp.analyze([(b"now", 0.0)], "x").speak  # 영어 분석은 보여 주지 않음


def test_screen_rules_ask_for_substance_and_judge_switches_in_analysis(tmp_path):
    comp, fake = _comp(tmp_path, [])
    comp.judge(b"jpg", "x", "claude-haiku-5-5", None, analysis=True)
    sys_text = fake.calls[-1]["system"][0]["text"]
    assert "분석 모드" in sys_text and "결과·정산 화면" in sys_text and "화면 글자 읽어 주기" in sys_text
    assert "말동무" in sys_text
    comp.screen_line(b"jpg", "x", None)
    sent = json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False)
    assert "보이는 걸 다시 말해 주는 건 아무 의미가 없다" in sent and "방송 채팅창" in sent
    assert fake.calls[-1]["output_config"]["effort"] == "medium"  # 평범한 화면 대사는 한 번 더 생각


def test_screen_line_that_only_reads_the_screen_is_dropped(tmp_path):
    comp, fake = _comp(tmp_path, [
        {"speak": True, "message": "바로 곁에 마리우스와 대화하라는 안내가 떠 있네요. 438m 길에 나서기 전에 처리해 두시죠.",
         "emotion": "normal"},
        {"speak": True, "message": "와, 방금 그 회피 소름 돋았습니다.", "emotion": "surprised"},
    ])
    assert not comp.screen_line(b"jpg", "붉은사막", {"situation": "퀘스트 안내", "point": ""}).speak
    assert comp.screen_line(b"jpg", "붉은사막", {"situation": "보스전", "point": "감탄"}).message.startswith("와,")


def test_review_prompts(tmp_path):
    comp, fake = _comp(tmp_path, [{"speak": True, "summary": "방금 그 싸움, 아깝습니다.", "situation": "교전 직후",
                                   "points": [], "next_steps": [], "emotion": "normal"}])
    comp.analyze([(b"a", 10.0), (b"b", 0.0)], "사이퍼즈", review=True)
    tail = fake.calls[-1]["messages"][-1]["content"][-1]["text"]
    assert "[복기]" in tail and "이렇게 했으면 좋았을 것" in tail and "순간 조작" in tail
    comp.judge(b"jpg", "x", "claude-haiku-5-5", None, analysis=True, review=True)
    assert "복기 모드" in fake.calls[-1]["system"][0]["text"]


# ---------------------------------------------------------------- 영상 복기

def _make_video(path, seconds=12, fps=10):
    import cv2
    import numpy as np

    writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"MJPG"), fps, (320, 180))
    for i in range(seconds * fps):
        frame = np.full((180, 320, 3), (i * 2) % 255, dtype=np.uint8)  # 시간이 갈수록 밝아짐
        writer.write(frame)
    writer.release()


def test_video_sampling_plan_and_frames(tmp_path):
    import video_review as vr

    path = tmp_path / "clip.avi"
    _make_video(path)
    info = vr.probe(path)
    assert 11.5 < info.seconds < 12.5 and info.width == 320
    assert vr.auto_step(0, 12) == 1 and vr.auto_step(0, 600) == 20
    assert vr.plan_times(0, 10, 2) == [0, 2, 4, 6, 8, 10]
    long = vr.plan_times(0, 600, 1)
    assert len(long) == vr.MAX_FRAMES and long[0] == 0 and long[-1] == 600  # 장면 수 제한이면 구간 전체에 고르게
    frames = vr.sample_frames(path, [0, 5, 10])
    assert [t for t, _ in frames] == [0, 5, 10] and all(j[:2] == b"\xff\xd8" for _, j in frames)
    assert vr.mmss(75) == "1:15" and vr.mmss(3725) == "1:02:05"
    assert vr.estimate_krw(30) > vr.estimate_krw(5) > 0


def test_review_video_request_and_result(tmp_path):
    data = {"speak": True, "summary": "1분 10초 한타가 아까웠습니다.", "overall": "초반은 좋았으나 중반 한타에서 밀림.",
            "moments": [{"time": "1:10", "title": "혼자 진입", "detail": "아군이 미니맵 반대편", "better": "합류 후 진입"}],
            "next_steps": ["합류 확인"], "emotion": "normal"}
    comp, fake = _comp(tmp_path, [data])
    counts = []
    a = comp.review_video([(0.0, b"a"), (70.0, b"b")], "cyphers_0110.mp4", "한타 봐 줘", on_count=counts.append)
    assert a.speak and a.points[0]["title"] == "1:10 · 혼자 진입" and "→ 합류 후 진입" in a.points[0]["detail"]
    req = fake.calls[-1]
    content = req["messages"][-1]["content"]
    assert content[0]["text"] == "(영상 0:00)" and content[2]["text"] == "(영상 1:10)"
    assert "[영상 복기]" in content[-1]["text"] and "한타 봐 줘" in content[-1]["text"]
    assert req.get("streamed") and req["max_tokens"] == 16000 and counts[-1] == 1
    assert comp.memory.recent[-1]["text"] == "1분 10초 한타가 아까웠습니다."  # 나중에 대화로 이어서 물을 수 있게


def test_dictionary_notes_tell_not_to_recite_and_judge_keeps_screen_terms(tmp_path):
    from lorebook import LoreBook

    book = LoreBook(LoreBook.parse(LORE))
    notes = book.notes_for("라우마")
    assert "그대로 읽거나 나열하지 않고" in notes and "필요한 것만 골라" in notes
    comp, fake = _comp(tmp_path, [])
    comp.judge(b"jpg", "x", "claude-haiku-5-5", None)
    assert "원문 그대로" in fake.calls[-1]["system"][0]["text"]


def test_focus_image_goes_with_judge_and_line(tmp_path):
    comp, fake = _comp(tmp_path, [{"speak": False, "urgent": False, "scene": "other", "situation": "", "point": ""},
                                  {"speak": True, "message": "단톡방에 새 공지가 있네요.", "emotion": "normal"}])
    comp.judge(b"main", "x", "claude-haiku-5-5", None, focus=b"crop")
    kinds = [c["type"] for c in fake.calls[-1]["messages"][0]["content"]]
    assert kinds == ["image", "text", "image", "text"] and "원래 크기로 확대" in fake.calls[-1]["messages"][0]["content"][1]["text"]
    comp.screen_line(b"main", "x", None, focus=b"crop")
    assert sum(c["type"] == "image" for c in fake.calls[-1]["messages"][-1]["content"]) == 2
