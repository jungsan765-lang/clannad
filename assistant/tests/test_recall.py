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
