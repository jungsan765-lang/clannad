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
