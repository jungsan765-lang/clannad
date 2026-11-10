import os
from datetime import datetime, timedelta

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from planner import Planner, parse_when  # noqa: E402

NOW = datetime(2026, 11, 10, 21, 30)


def test_parse_when_forms():
    assert parse_when("2026-11-10 23:00", NOW) == datetime(2026, 11, 10, 23, 0)
    assert parse_when("30분 뒤", NOW) == NOW + timedelta(minutes=30)
    assert parse_when("1시간 30분 후", NOW) == NOW + timedelta(minutes=90)
    assert parse_when("9:00", NOW) == datetime(2026, 11, 11, 9, 0)  # 이미 지났으면 내일
    assert parse_when("내일 23:00", NOW) == datetime(2026, 11, 11, 23, 0)
    assert parse_when("언젠가", NOW) is None


def test_reminders_fire_once_or_repeat(tmp_path):
    t = {"now": NOW}
    p = Planner(tmp_path, clock=lambda: t["now"])
    assert p.add_from_target("2026-11-10 23:00 | 자라고 말하기")
    assert p.add_from_target("2026-11-10 22:00 | 레진 쓰기 | 매일")["repeat"] == "daily"
    assert p.add_from_target("엉터리") is None
    assert p.due() == []
    t["now"] = datetime(2026, 11, 10, 23, 5)
    fired = p.due()
    assert [f["text"] for f in fired] == ["레진 쓰기", "자라고 말하기"] and fired[1]["late_minutes"] == 5
    assert [(r["text"], r["when"]) for r in p.reminders] == [("레진 쓰기", "2026-11-11T22:00")]  # 매일 → 내일로
    assert Planner(tmp_path).reminders[0]["text"] == "레진 쓰기"  # 저장됨
    assert [r["text"] for r in p.cancel("레진 알림 취소")] == ["레진 쓰기"] and p.reminders == []


def test_todos(tmp_path):
    p = Planner(tmp_path, clock=lambda: NOW)
    assert p.add_todo_from_target("E3 甲 깨기 | 2026-11-12")
    assert p.add_todo_from_target("E3 甲 깨기") is None  # 같은 건 한 번
    p.add_todo("방 청소")
    assert "기한 가까운 할 일: E3 甲 깨기(11-12)" in p.today_text()
    assert p.done_todo("E3 깨기") is None and p.done_todo("E3 甲 깨기")["done"]
    assert [t["text"] for t in p.open_todos()] == ["방 청소"]
    assert "[할 일] 방 청소" in p.prompt_text()


def test_find_program_and_media_parse(tmp_path):
    from pc_control import find_program, parse_media

    menu = tmp_path / "Start Menu" / "Programs"
    (menu / "Discord Inc").mkdir(parents=True)
    (menu / "Discord Inc" / "Discord.lnk").write_text("x")
    (menu / "Discord Inc" / "Uninstall Discord.lnk").write_text("x")
    (menu / "Genshin Impact.lnk").write_text("x")
    (menu / "카카오톡.lnk").write_text("x")
    (tmp_path / "notes.txt").write_text("x")
    assert find_program("디스코드", [menu]).name == "Discord.lnk"
    assert find_program("원신", [menu]).name == "Genshin Impact.lnk"
    assert find_program("카톡", [menu]).name == "카카오톡.lnk"
    assert find_program("notes", [tmp_path]) is None  # 바로가기만
    assert find_program("없는프로그램", [menu]) is None
    assert parse_media("vol_down 5") == ("vol_down", 5) and parse_media("next") == ("next", 1)
    assert parse_media("rm -rf") is None and parse_media("vol_up 999") == ("vol_up", 25)


def test_pc_monitor_alerts_once_per_half_hour():
    from pc_monitor import PcMonitor, PcStatus, read_status, status_text

    t = {"now": 0.0}
    m = PcMonitor(clock=lambda: t["now"])
    ok = PcStatus(cpu=20, ram_pct=50, ram_used_gb=16, ram_total_gb=32, disk_free_gb=300,
                  gpus=[{"name": "RTX", "temp": 70, "util": 90, "mem_used": 6000, "mem_total": 12000}])
    assert m.check(ok) == []
    hot = PcStatus(cpu=99, ram_pct=95, ram_used_gb=30, ram_total_gb=32, disk_free_gb=3, top_mem=[("chrome.exe", 6.2)],
                   top_cpu=[("game.exe", 80)], gpus=[{"name": "RTX", "temp": 88, "util": 99, "mem_used": 1, "mem_total": 2}])
    alerts = m.check(hot)
    assert len(alerts) == 3 and any("88도" in a for a in alerts) and any("chrome.exe" in a for a in alerts)
    t["now"] = 60
    assert m.check(hot) == []  # 같은 문제는 30분 동안 다시 안 알림
    t["now"] = 120
    assert any("CPU" in a for a in m.check(hot))  # CPU 는 3분 넘게 계속일 때만
    t["now"] = 31 * 60
    assert len(m.check(hot)) == 3
    text = status_text(hot)
    assert "그래픽카드 RTX: 88도" in text and "chrome.exe 6.2GB" in text
    real = read_status()  # 이 PC 에서 실제로 읽어 봄 (nvidia-smi 없으면 그래픽카드는 비어 있음)
    assert real.ram_total_gb > 0 and "메모리" in status_text(real)
