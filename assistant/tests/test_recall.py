import json
from datetime import datetime

from recall import EpisodeIndex, cues, recall_block, strip_particles


def test_cues_strip_particles_and_common_words():
    assert strip_particles("카일록을") == "카일록" and strip_particles("호박이라고") == "호박"
    assert strip_particles("그레이스한테서는") == "그레이스"
    c = cues("저번에 말했던 '회색갈기 야영지' 그거 기억나? 카일록한테 졌던 거")
    assert c[0] == "회색갈기 야영지" and "카일록" in c
    assert not {"저번에", "그거", "기억나", "말했던"} & set(c)


def _logs(tmp_path):
    logs = tmp_path / "logs"
    logs.mkdir(parents=True, exist_ok=True)
    rows = [
        {"time": "2026-11-03T21:40:00", "user": "나 다음 주 토요일에 민지랑 홍대에서 만나기로 했어", "reply": "기억해 두겠습니다."},
        {"time": "2026-11-03T21:41:00", "user": "민지는 고등학교 친구야", "reply": "그렇군요."},
        {"time": "2026-11-05T22:10:00", "user": "카일록 너무 어렵다", "reply": "붉은 표시가 뜨면 피하세요."},
        {"time": "2026-11-05T22:12:00", "screen_line": "방금 패링 타이밍이 빨랐습니다."},
    ]
    (logs / "2026-11-03.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows[:2]) + "\n",
                                           encoding="utf-8")
    (logs / "2026-11-05.jsonl").write_text("\n".join(json.dumps(r, ensure_ascii=False) for r in rows[2:]) + "\n",
                                           encoding="utf-8")
    screens = tmp_path / "screens" / "2026-11-05"
    screens.mkdir(parents=True)
    (screens / "221100_000.jpg").write_bytes(b"jpg")
    (screens / "index.jsonl").write_text(
        json.dumps({"time": "2026-11-05T22:11:00", "file": "221100_000.jpg", "mode": "붉은사막", "title": "Crimson",
                    "situation": "쪼개진뿔 카일록 보스전, 체력 30%"}, ensure_ascii=False) + "\n"
        + json.dumps({"note_for": "221100_000.jpg", "situation": "", "said": "붉은 표시를 보세요."}, ensure_ascii=False) + "\n",
        encoding="utf-8")


def test_index_sync_is_incremental_and_search_ranks_rare_words(tmp_path):
    _logs(tmp_path)
    idx = EpisodeIndex(tmp_path / "memory.db")
    assert idx.sync(tmp_path) == 5 and idx.sync(tmp_path) == 0  # 새 줄만 (대화 3, 화면 보고 한 말 1, 화면 1)
    with open(tmp_path / "logs" / "2026-11-05.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps({"time": "2026-11-05T23:00:00", "user": "민지 생일 선물 뭐가 좋을까", "reply": "향수요."},
                           ensure_ascii=False) + "\n")
    assert idx.sync(tmp_path) == 1
    hits = idx.search(["민지", "홍대"])
    assert "홍대" in hits[0].text and hits[0].time.startswith("2026-11-03")
    scr = idx.search(["카일록"], kinds=("screen",))
    assert scr and "붉은 표시를 보세요" in scr[0].text and scr[0].ref.endswith("221100_000.jpg") and scr[0].game == "붉은사막"
    idx.close()
    again = EpisodeIndex(tmp_path / "memory.db")  # 다시 켜도 그대로, 중복 없음
    assert again.sync(tmp_path) == 0 and again.count() == 6


def test_recall_block_on_intent_with_context(tmp_path):
    _logs(tmp_path)
    idx = EpisodeIndex(tmp_path / "memory.db")
    idx.sync(tmp_path)
    text, eps = recall_block(idx, "저번에 홍대에서 누구 만난다고 했지?", datetime(2026, 11, 10, 20, 0))
    assert "[떠오른 기억" in text and "11/03 21:40 대화" in text and "홍대" in text
    assert "그때 앞뒤 대화" in text and "고등학교 친구" in text
    # 떠올리라는 말이 아니면 아주 확실할 때만
    assert recall_block(idx, "오늘 날씨 좋다", datetime(2026, 11, 10))[0] == ""
    # 지금 대화 기록에 이미 있는 건 빼기
    assert recall_block(idx, "저번에 홍대 얘기", datetime(2026, 11, 10), recent_since="2026-11-01T00:00:00")[0] == ""


def test_screen_recall_only_strong_old_matches(tmp_path):
    _logs(tmp_path)
    idx = EpisodeIndex(tmp_path / "memory.db")
    idx.sync(tmp_path)
    text, eps = recall_block(idx, "붉은사막 쪼개진뿔 카일록 보스전 시작", datetime(2026, 11, 10), for_screen=True, min_score=2.0)
    assert text.startswith("[지금 화면과 이어지는 예전 일") and len(eps) <= 2 and "카일록" in text
    assert recall_block(idx, "바탕화면 탐색기", datetime(2026, 11, 10), for_screen=True)[0] == ""


def test_search_with_time_range_and_odd_cues(tmp_path):
    idx = EpisodeIndex(tmp_path / "memory.db")
    for i in range(50):
        idx.add(f"2026-11-0{1 + i % 9}T10:{i:02d}:00", "chat", f"주인님: 카일록 이야기 {i}번째")
    idx.add("2026-11-09T10:00:00", "chat", '주인님: "따옴표"와 %퍼센트_밑줄 이 들어간 말')
    hits = idx.search(["카일록"], since="2026-11-05T00:00:00", until="2026-11-06T00:00:00", limit=50)
    assert hits and all(h.time.startswith("2026-11-05") for h in hits)
    assert idx.search(['"따옴표"와', "%퍼센트", "*", "NEAR("]) is not None  # 이상한 글자도 오류 없이


def test_broken_index_is_rebuilt(tmp_path):
    (tmp_path / "memory.db").write_bytes(b"this is not a database" * 100)
    idx = EpisodeIndex(tmp_path / "memory.db")
    assert idx.add("2026-11-10T10:00:00", "chat", "주인님: 안녕") and idx.count() == 1
    assert (tmp_path / "memory.broken.db").exists()


def test_review_fixes_for_cues_and_recall_window(tmp_path):
    assert "민지" in cues("저번에 민지랑 뭐 했지?") and cues("민지 생일 언제였지?") == ["민지", "생일"]
    assert {"수지", "제니", "윤하", "모니카"} <= set(cues("수지랑 제니 윤하 모니카"))
    assert "타이가" in cues("타이가 어디 갔어") and cues("Valorant 했던 거 기억나?") == ["Valorant"]
    from recall import RECALL_INTENT

    assert not RECALL_INTENT.search("충전에 아까워") and RECALL_INTENT.search("아까 그거") and RECALL_INTENT.search("전에 말한 거")
    idx = EpisodeIndex(tmp_path / "memory.db")
    idx.add("2026-11-09T21:00:00", "screen", "쪼개진뿔 카일록 보스전", game="붉은사막")
    idx.add("2026-11-09T23:59:00", "diary", "2026-11-09 일기: 카일록을 잡으셨다.")
    idx.add("2026-11-09T21:05:00", "chat", "주인님: 카일록 어렵다")
    # 대화 기록이 11/07 부터라도 화면·일기는 빼지 않음 (대화만 뺌)
    eps = idx.search(["카일록"], before="2026-11-07T00:00:00")
    assert {e.kind for e in eps} == {"screen", "diary"}


def test_index_offset_saved_only_after_lines_are_added(tmp_path, monkeypatch):
    import json as _json

    logs = tmp_path / "logs"
    logs.mkdir()
    rows = [{"time": f"2026-11-10T10:{i:02d}:00", "user": f"말 {i}", "reply": "네"} for i in range(10)]
    (logs / "2026-11-10.jsonl").write_text("\n".join(_json.dumps(r, ensure_ascii=False) for r in rows) + "\n",
                                           encoding="utf-8")
    idx = EpisodeIndex(tmp_path / "memory.db")
    real = idx.add
    calls = {"n": 0}

    def flaky(*a, **kw):
        calls["n"] += 1
        if calls["n"] == 4:
            raise RuntimeError("꺼짐")
        return real(*a, **kw)

    monkeypatch.setattr(idx, "add", flaky)
    try:
        idx.sync(tmp_path)
    except RuntimeError:
        pass
    monkeypatch.setattr(idx, "add", real)
    idx.sync(tmp_path)  # 중간에 멈췄어도 다음엔 나머지까지 (같은 줄은 겹치지 않음)
    assert idx.count() == 10
