import json
import os
import re
from datetime import date, datetime

import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from fake_anthropic import FakeAnthropic  # noqa: E402

from ai_client import AIClient, AIError  # noqa: E402
from companion import Companion, is_korean  # noqa: E402
from memory import Memory  # noqa: E402
from usage import UsageLedger, cost_usd  # noqa: E402


# ---------------------------------------------------------------- 비용


def test_cost_and_ledger(tmp_path):
    assert cost_usd("claude-opus-5-5", {"input_tokens": 1_000_000}) == pytest.approx(4.0)
    assert cost_usd("claude-haiku-5-5", {"output_tokens": 1_000_000}) == pytest.approx(0.5)
    led = UsageLedger(tmp_path / "usage.json", krw_per_usd=1400)
    d1, d2 = date(2026, 11, 9), date(2026, 11, 10)
    led.record("claude-opus-5-5", {"input_tokens": 1000, "output_tokens": 100}, "chat", d1)
    led.record("claude-opus-5-5", {"input_tokens": 1000, "output_tokens": 100}, "chat", d2)
    assert led.day_usd(d2) == pytest.approx(0.006)
    assert led.month_usd(d2) == pytest.approx(0.012)
    assert UsageLedger(tmp_path / "usage.json").month_usd(d2) == pytest.approx(0.012)  # 파일에 저장됨
    assert led.krw(0.012) == 17


# ---------------------------------------------------------------- API 호출 모양


def _ai(tmp_path, replies=None):
    fake = FakeAnthropic(replies)
    return AIClient(UsageLedger(tmp_path / "usage.json"), client=fake), fake


def test_request_shape_opus_uses_fallback_and_schema(tmp_path):
    ai, fake = _ai(tmp_path)
    r = ai.complete_json(model="claude-opus-5-5", system=[{"type": "text", "text": "s"}],
                         messages=[{"role": "user", "content": "안녕"}], schema={"type": "object"}, kind="chat")
    call = fake.calls[0]
    assert call["beta"] and call["betas"] == ["server-side-fallback-2026-07-01"] and call["fallbacks"] == "default"
    assert call["output_config"]["format"]["type"] == "json_schema"
    assert call["output_config"]["effort"] == "low"
    assert "thinking" not in call  # Opus 5.5 는 thinking 을 끌 수 없어 보내지 않는다
    assert r.data["message"] == "네, 주인님." and r.usd > 0


def test_haiku_has_no_server_fallback(tmp_path):
    ai, fake = _ai(tmp_path)
    ai.complete_json(model="claude-haiku-5-5", system=[], messages=[{"role": "user", "content": "x"}],
                     schema={"type": "object"}, kind="judge")
    assert fake.calls[0]["beta"] is False and "fallbacks" not in fake.calls[0]


def test_refusal_returns_no_data(tmp_path):
    ai, _ = _ai(tmp_path, ["REFUSAL"])
    r = ai.complete_json(model="claude-opus-5-5", system=[], messages=[{"role": "user", "content": "x"}],
                         schema={"type": "object"}, kind="chat")
    assert r.data is None and r.stop_reason == "refusal"


def test_missing_key_is_friendly(tmp_path, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    ai = AIClient(UsageLedger(tmp_path / "usage.json"))
    with pytest.raises(AIError, match="API 키"):
        ai.complete_json(model="claude-opus-5-5", system=[], messages=[], schema={}, kind="chat")


# ---------------------------------------------------------------- 한국어 강제


def test_is_korean():
    assert is_korean("차 준비됐습니다, 주인님.")
    assert is_korean("Python 파일 경로를 확인해 보시죠.")
    assert not is_korean("Of course, Master. Your tea is ready.")
    assert is_korean("……")
    assert is_korean("Visual Studio Code 를 다시 켜 보세요.")
    assert not is_korean("Of course, 주인님. 차 준비할게요.")
    assert not is_korean("Yes, Master. Right away.")
    assert is_korean("main.py 파일을 열어 보세요.")


def _companion(tmp_path, replies):
    ai, fake = _ai(tmp_path, replies)
    mem = Memory(tmp_path / "data")
    comp = Companion(ai, mem, "# 다니카\n- 주인님이라고 부른다", chat_model="claude-opus-5-5",
                     memory_model="claude-opus-5-5", consolidate_every=2)
    return comp, fake, mem


def test_reply_uses_persona_memory_cache_and_time(tmp_path):
    comp, fake, mem = _companion(tmp_path, [{"speak": True, "message": "알겠습니다, 주인님.", "emotion": "happy"}])
    r = comp.reply("안녕 다니카", now=datetime(2026, 11, 10, 21, 30))
    assert (r.message, r.emotion) == ("알겠습니다, 주인님.", "happy")
    call = fake.calls[0]
    assert [b.get("cache_control") for b in call["system"]] == [{"type": "ephemeral", "ttl": "1h"}, {"type": "ephemeral"}]
    assert "한국어로만" in call["system"][0]["text"] and "다니카" in call["system"][0]["text"]
    assert call["messages"][-1]["content"][0]["text"] == "[지금: 2026-11-10 (화) 21:30]"
    assert mem.recent[-1]["text"] == "알겠습니다, 주인님." and len(mem.pending) == 1


def test_english_reply_is_retried_in_korean(tmp_path):
    comp, fake, _ = _companion(tmp_path, [
        {"speak": True, "message": "Of course, Master. I'll prepare tea.", "emotion": "normal"},
        {"speak": True, "message": "알겠습니다. 차를 준비할게요.", "emotion": "normal"},
    ])
    r = comp.reply("차 줘")
    assert r.message == "알겠습니다. 차를 준비할게요."
    assert len(fake.calls) == 2 and "한국어로만" in fake.calls[1]["messages"][-1]["content"][-1]["text"]


def test_english_twice_is_not_shown(tmp_path):
    comp, _, _ = _companion(tmp_path, [{"speak": True, "message": "Yes, Master. Right away.", "emotion": "normal"}] * 2)
    assert comp.reply("차 줘").message == "……"


def test_history_is_sent_and_consolidation_updates_memory(tmp_path):
    comp, fake, mem = _companion(tmp_path, [
        {"speak": True, "message": "기억해 둘게요.", "emotion": "normal"},
        {"speak": True, "message": "내일 아침 9시군요.", "emotion": "normal"},
        {"facts": [{"category": "취향", "text": "주인님은 꿀 넣은 따뜻한 우유를 좋아한다.", "date": "2026-11-10"},
                   {"category": "약속·할 일", "text": "주인님은 내일 아침 9시에 면접이 있다.", "date": "2026-11-11"},
                   {"category": "취향", "text": "Master likes milk.", "date": "2026-11-10"}]},
    ])
    comp.reply("난 꿀 넣은 우유가 좋아")
    comp.reply("내일 9시에 면접 있어")
    second = fake.calls[1]["messages"]
    assert second[0]["role"] == "user" and second[1]["role"] == "assistant"
    assert re.fullmatch(r"\[\d+/\d+ \d\d:\d\d\] 난 꿀 넣은 우유가 좋아", second[0]["content"])  # 언제 한 말인지
    assert comp.should_consolidate()
    assert comp.consolidate()
    assert mem.pending == [] and len(mem.facts) == 2  # 영어 메모는 버림
    notes = mem.notes_text()
    assert notes.index("[취향]") < notes.index("[약속·할 일]") and "면접" in notes
    assert "면접" in comp.system_blocks()[1]["text"]
    again = Memory(tmp_path / "data")  # 껐다 켜도 남아 있음
    assert again.facts == mem.facts and len(again.recent) == 4
    logs = list((tmp_path / "data" / "logs").glob("*.jsonl"))
    assert logs and len(logs[0].read_text(encoding="utf-8").splitlines()) == 2


def test_memory_trims_to_max_chars(tmp_path):
    mem = Memory(tmp_path)
    facts = [{"category": "최근 있었던 일", "text": "가" * 50, "date": f"2026-10-{d:02d}"} for d in range(1, 21)]
    facts.append({"category": "주인님 정보", "text": "주인님은 서울에 산다.", "date": "2026-09-01"})
    mem.apply_consolidation(facts, 0, max_chars=400)
    assert sum(len(f["text"]) + 20 for f in mem.facts) <= 400
    assert any(f["category"] == "주인님 정보" for f in mem.facts)  # 오래된 '최근 있었던 일'부터 뺌
    assert min(f["date"] for f in mem.facts if f["category"] == "최근 있었던 일") > "2026-10-01"


# ---------------------------------------------------------------- 설정 파일

def test_shipped_config_files_parse_strictly():
    """함께 나가는 설정 파일은 고쳐 읽기 없이 그대로 읽혀야 한다 (깨지면 프로그램이 안 켜짐)."""
    import tomllib
    from pathlib import Path

    here = Path(__file__).resolve().parents[1]
    for path in [here / "config.toml", *sorted((here / "modes").glob("*.toml"))]:
        tomllib.loads(path.read_text(encoding="utf-8"))
    cfg = tomllib.loads((here / "config.toml").read_text(encoding="utf-8"))
    assert cfg["voice"]["device"] in ("cpu", "cuda") and "mic" in cfg["voice"]


def test_settings_survive_duplicate_names(tmp_path):
    from settings import Settings

    (tmp_path / "config.toml").write_text('[voice]\ndevice = "cpu"\nmode = "off"\ndevice = ""\n', encoding="utf-8")
    s = Settings.load(tmp_path)
    assert s.get("voice.device") == "cpu" and s.get("voice.mode") == "off"


def test_old_saved_mic_name_moves_to_mic_setting(tmp_path):
    import json

    from main import apply_saved_prefs
    from settings import Settings

    (tmp_path / "config.toml").write_text('[voice]\ndevice = "cpu"\nmic = ""\n', encoding="utf-8")
    (tmp_path / "data").mkdir()
    (tmp_path / "data" / "state.json").write_text(json.dumps({"prefs": {"voice.device": "USB 마이크"}}), encoding="utf-8")
    s = Settings.load(tmp_path)
    apply_saved_prefs(s)
    assert s.get("voice.device") == "cpu" and s.get("voice.mic") == "USB 마이크"


def test_history_carries_times_and_gap_after_a_while(tmp_path):
    comp, fake, mem = _companion(tmp_path, [])
    comp.reply("세 시에 산책 갈 거야", now=datetime(2026, 11, 10, 15, 0))
    comp.reply("다녀왔어", now=datetime(2026, 11, 10, 18, 25))
    sent = fake.calls[-1]["messages"]
    assert sent[0]["content"] == "[11/10 15:00] 세 시에 산책 갈 거야"
    assert sent[-1]["content"][0]["text"] == "[지금: 2026-11-10 (화) 18:25] (마지막 대화로부터 3시간 25분 만이다)"
    comp.reply("또 왔어", now=datetime(2026, 11, 10, 18, 40))
    assert fake.calls[-1]["messages"][-1]["content"][0]["text"] == "[지금: 2026-11-10 (화) 18:40]"  # 한 시간 안이면 생략
    mem.add_spoken("화면 보고 한 말", datetime(2026, 11, 12, 9, 0))
    comp.reply("안녕", now=datetime(2026, 11, 14, 9, 0))
    msgs = fake.calls[-1]["messages"]
    assert "(마지막 대화로부터 2일 만이다)" in msgs[-1]["content"][0]["text"]
    assert any(m["content"] == "[11/12 09:00] (주인님은 말없이 화면을 보고 있었다)" for m in msgs if m["role"] == "user")
