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


# ---------------------------------------------------------------- 다른 프로그램 창 읽기·맨 앞 창 확대

def test_find_windows_by_korean_name_and_skip_own():
    from watch.windows import WindowInfo, find_windows

    wins = [(1, WindowInfo("다니카", "pythonw.exe", (0, 0, 500, 500))),
            (2, WindowInfo("친구들 단톡방", "kakaotalk.exe", (0, 0, 400, 700))),
            (3, WindowInfo("메모 - 메모장", "notepad.exe", (0, 0, 800, 600))),
            (4, WindowInfo("카카오톡", "kakaotalk.exe", (0, 0, 400, 700)))]
    assert [h for h, _ in find_windows("카톡", "pythonw.exe", windows=wins)] == [2, 4]  # 위에 있는 것부터
    assert [h for h, _ in find_windows("", "pythonw.exe", windows=wins)] == [2]  # 다니카 창을 뺀 가장 최근 창
    assert [h for h, _ in find_windows("메모", "pythonw.exe", windows=wins)] == [3]  # 창 제목으로도
    assert find_windows("없는프로그램", "pythonw.exe", windows=wins) == []


def test_focus_crop_of_small_active_window(tmp_path):
    from PIL import Image

    from test_watch_voice import WindowInfo, _watcher

    img = Image.new("RGB", (1920, 1080), (30, 30, 30))
    img.paste((250, 250, 250), (100, 100, 500, 800))  # 카톡 창 자리
    w, comp, said, t, state = _watcher(tmp_path, images=[img, img],
                                       window=WindowInfo("단톡방", "kakaotalk.exe", (100, 100, 500, 800)))
    w.tick()
    crop = Image.open(__import__("io").BytesIO(comp.focus_seen))
    assert crop.size == (400, 700) and crop.getpixel((10, 10))[0] > 240  # 원래 크기 그대로 그 창만
    state["window"] = WindowInfo("게임", "game.exe", (0, 0, 1920, 1080))  # 화면을 꽉 채운 창은 확대 안 함
    t["now"] = 300
    w.last_thumb = None
    w.tick()
    assert comp.focus_seen is None


def test_window_reading_flow(tmp_path, monkeypatch):
    import main as app_main
    from ai_client import AIClient
    from PIL import Image
    from test_app import _settings, _wait
    from usage import UsageLedger
    from watch import windows as win

    app = QApplication.instance() or QApplication([])
    fake = FakeAnthropic([
        {"speak": True, "message": "확인해 보겠습니다.", "emotion": "normal", "action": "read_window", "target": "카카오톡"},
        {"speak": True, "message": "민수 님이 내일 7시에 보자고 하십니다.", "emotion": "normal"}])
    a = app_main.build(_settings(tmp_path, "no_such_folder"),
                       ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    monkeypatch.setattr(win, "find_windows", lambda target, own_pid_process="", limit=2: [
        (7, win.WindowInfo("민수", "kakaotalk.exe", (0, 0, 400, 700)))] if target == "카카오톡" else [])
    monkeypatch.setattr(win, "capture_window", lambda hwnd: Image.new("RGB", (400, 700), (255, 255, 255)))
    a.ask("카톡 뭐 왔는지 봐 줘")
    _wait(app, a)
    _wait(app, a)
    content = fake.calls[-1]["messages"][-1]["content"]
    assert content[0]["text"] == "[읽어 달라고 한 창 1: 카카오톡]" and content[1]["type"] == "image"
    assert a.bubble.text == "민수 님이 내일 7시에 보자고 하십니다." and not a.busy
    a.apply_settings({"screen.read_windows": False})
    a.read_window_and_answer("카카오톡")
    assert "꺼져 있어요" in a.bubble.text and not a.busy
    a.quit()


def test_overlay_picks_readable_colors_for_any_background():
    from PySide6.QtCore import QRect
    from PySide6.QtGui import QColor, QImage

    from ui.overlay import GameOverlay, background_stats, pick_palette

    app = QApplication.instance() or QApplication([])  # noqa: F841

    def solid(rgb):
        img = QImage(64, 16, QImage.Format.Format_RGB32)
        img.fill(QColor(*rgb))
        return img

    bright = pick_palette(background_stats(solid((240, 240, 230))))  # 눈 덮인 배경
    dark = pick_palette(background_stats(solid((10, 12, 20))))  # 밤·동굴
    assert bright.box.lightness() < 60 and bright.text.lightness() > 200  # 어두운 상자 + 흰 글씨
    assert dark.box.lightness() > 200 and dark.text.lightness() < 60  # 밝은 상자 + 검은 글씨
    red = pick_palette(background_stats(solid((200, 30, 30))))
    assert abs(red.name.hueF() - 0.5) < 0.1  # 빨간 배경이면 이름표는 반대색(청록 계열)
    backs = {"now": solid((10, 10, 10))}
    ov = GameOverlay(sampler=lambda rect: backs["now"])
    ov.show_on(QRect(0, 0, 1920, 1080), "대파 진격 금지!", 3)
    assert ov.palette_.text.lightness() < 60  # 뜨기 전 배경(어두움)에 맞춤
    backs["now"] = solid((245, 245, 245))  # 장면이 바뀌어 밝아짐
    ov._adapt_while_visible()
    assert ov.palette_.text.lightness() > 200 and ov.recolor.isActive()
    ov._finish()
    assert not ov.isVisible() and not ov.recolor.isActive()


def test_messenger_on_other_monitor_is_read_automatically(tmp_path):
    from PIL import Image

    from test_watch_voice import WindowInfo, _img, _watcher

    same = _img(100)
    quiet = {"speak": False, "urgent": False, "scene": "other", "situation": "단톡방 대화", "point": ""}
    w, comp, said, t, state = _watcher(tmp_path, images=[same] * 6, notes=[dict(quiet) for _ in range(6)],
                                       window=WindowInfo("친구들 단톡방", "kakaotalk.exe", (2000, 100, 2400, 800), hwnd=77))
    grabbed = []
    chats = iter([Image.new("RGB", (400, 700), (255, 255, 255)), Image.new("RGB", (400, 700), (255, 255, 255)),
                  Image.new("RGB", (400, 700), (40, 40, 40))])
    w.window_capture = lambda hwnd: grabbed.append(hwnd) or next(chats)
    w.tick()  # 다니카 쪽 모니터의 카톡 → 그 창을 직접 찍어 함께
    assert grabbed == [77] and comp.focus_seen and comp.focus_label_seen == "카카오톡 — 친구들 단톡방"
    judged = len(comp.judged)
    t["now"] = 31
    w.tick()  # 큰 화면도 카톡도 그대로 → 건너뜀
    assert len(comp.judged) == judged
    t["now"] = 62
    w.tick()  # 카톡에 새 메시지 → 큰 화면이 그대로여도 다시 본다
    assert len(comp.judged) == judged + 1
    w.cfg.auto_read = False
    t["now"] = 93
    w.tick()
    assert grabbed == [77, 77, 77]  # 끄면 더 찍지 않음


def test_messenger_rules_in_prompts(tmp_path):
    from test_organize_status import _comp

    comp, fake = _comp(tmp_path, [{"speak": False, "urgent": False, "scene": "other", "situation": "", "point": ""}])
    comp.judge(b"main", "x", "claude-haiku-5-5", None, focus=b"chat", focus_label="카카오톡 — 단톡방")
    msg = fake.calls[-1]["messages"][0]["content"]
    assert "카카오톡 — 단톡방" in msg[1]["text"] and "메신저" in fake.calls[-1]["system"][0]["text"]
    comp.screen_line(b"main", "x", None)
    assert "남의 메시지를 그대로 읽어 주지 않고" in json.dumps(fake.calls[-1]["messages"][-1], ensure_ascii=False)
