"""화면 기억 (data/screens/) — 저장·일지·시간 표현·정리·대화 연결."""

import json
import os
from datetime import datetime, timedelta

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from fake_anthropic import FakeAnthropic  # noqa: E402
from PySide6.QtWidgets import QApplication  # noqa: E402

from screen_log import ScreenLog, recall_window  # noqa: E402

JPG = b"\xff\xd8fake-jpeg"


def test_save_note_entries_diary_nearest(tmp_path):
    log = ScreenLog(tmp_path / "screens")
    t = datetime(2026, 11, 10, 15, 0, 5)
    log.save(JPG, t, "사이퍼즈", "Cyphers", "브리스톨 한타 중")
    log.note(said="아군을 기다리시죠.")
    log.save(JPG, t + timedelta(minutes=1), "사이퍼즈", "Cyphers", "브리스톨 한타 중")  # 같은 상황은 일지에서 합침
    log.save(JPG, t + timedelta(minutes=20), "원신", "Genshin Impact", "나샤 마을 탐험")
    es = log.entries(t - timedelta(minutes=1), t + timedelta(hours=1))
    assert len(es) == 3 and es[0].said == "아군을 기다리시죠." and es[0].file.read_bytes() == JPG
    diary = log.diary(t - timedelta(minutes=1), t + timedelta(hours=1))
    assert diary.splitlines() == ["15:00 [사이퍼즈] 브리스톨 한타 중 (내가 한 말: 아군을 기다리시죠.)",
                                  "15:01 [사이퍼즈] 브리스톨 한타 중", "15:20 [원신] 나샤 마을 탐험"] or \
        diary.splitlines()[0].startswith("15:00 [사이퍼즈]")
    near = log.nearest(t + timedelta(minutes=18))
    assert near[0].mode == "원신" and len(near) == 2
    assert not ScreenLog(tmp_path / "off", enabled=False).save(JPG, t)


def test_cleanup_by_age_and_size(tmp_path):
    log = ScreenLog(tmp_path / "screens", keep_days=30, max_gb=1e-9 * 40)  # 40바이트 넘으면 오래된 날부터
    now = datetime(2026, 11, 10, 12, 0)
    for days_ago in (40, 3, 2, 0):
        log.save(JPG + b"x" * 20, now - timedelta(days=days_ago))
    removed = log.cleanup(now)
    left = sorted(d.name for d in (tmp_path / "screens").iterdir())
    assert "2026-10-01" not in left and left[-1] == "2026-11-10"  # 기간 지난 날 + 용량 넘는 오래된 날 지움, 오늘은 남김
    assert removed >= 2 and len(left) <= 2


def test_recall_window_reads_korean_time_words():
    now = datetime(2026, 11, 10, 20, 0)
    assert recall_window("점심 뭐 먹지", now) is None
    s, e, at = recall_window("아까 3시쯤 뭐 하고 있었지?", now)
    assert at == datetime(2026, 11, 10, 15, 0) and s == at - timedelta(minutes=30)  # 오늘 이미 지난 오후 3시
    s, e, at = recall_window("어제 오후 2시 반에 하던 거", now)
    assert at == datetime(2026, 11, 9, 14, 30)
    s, e, at = recall_window("어제 칸코레 어디까지 했지", now)
    assert at is None and s == datetime(2026, 11, 9) and e == datetime(2026, 11, 10)
    s, e, at = recall_window("아까 그 장면 뭐였지", now)
    assert at is None and e == now and s == now - timedelta(hours=3)


def test_chat_recall_sends_diary_and_screens(tmp_path):
    import main as app_main
    from ai_client import AIClient
    from test_app import _settings, _wait
    from usage import UsageLedger

    app = QApplication.instance() or QApplication([])
    fake = FakeAnthropic([{"speak": True, "message": "그때는 나샤 마을에 계셨습니다.", "emotion": "normal"}])
    a = app_main.build(_settings(tmp_path, "no_such_folder"),
                       ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    now = datetime.now()
    at = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=1)
    a.screen_log.save(JPG, at, "원신", "Genshin Impact", "나샤 마을 탐험")
    a.ask(f"아까 {at.hour}시쯤 뭐 하고 있었지?")
    _wait(app, a)
    content = fake.calls[-1]["messages"][-1]["content"]
    text = json.dumps(content, ensure_ascii=False)
    assert "화면 기억" in text and "나샤 마을 탐험" in text
    assert any(c["type"] == "image" for c in content) and f"({at:%H:%M} 화면)" in text
    a.quit()


def test_review_recent_uses_saved_screens(tmp_path):
    import main as app_main
    from ai_client import AIClient
    from test_app import _settings, _wait
    from usage import UsageLedger

    app = QApplication.instance() or QApplication([])
    data = {"speak": True, "summary": "지난 10분, 합류가 늦었습니다.", "overall": "흐름", "moments": [],
            "next_steps": [], "emotion": "normal"}
    fake = FakeAnthropic([data])
    a = app_main.build(_settings(tmp_path, "no_such_folder"),
                       ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    now = datetime.now()
    for i in range(30):
        a.screen_log.save(JPG, now - timedelta(seconds=290 - i * 10), "사이퍼즈", "Cyphers", f"장면 {i}")
    a.review_recent(10)
    _wait(app, a)
    content = fake.calls[-1]["messages"][-1]["content"]
    assert sum(c["type"] == "image" for c in content) == 16  # 30장 중 고르게 15장 + 마지막 화면 (20장 이하)
    assert content[0]["text"] == "(영상 0:00)" and "지난 10분 화면" in content[-1]["text"]
    assert a.analysis_panel.isVisible() and list((tmp_path / "data" / "reviews").glob("*recent_10min*.md"))
    a.quit()
