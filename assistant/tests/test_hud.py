import os

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PIL import Image, ImageDraw  # noqa: E402

from test_watch_voice import qapp  # noqa: E402,F401
from watch.hud import HudReader, bar_fill  # noqa: E402

HP_BOX = [0.02, 0.90, 0.27, 0.94]
QUEST_BOX = [0.75, 0.20, 0.98, 0.30]


def _screen(hp: float, quest_shade: int = 40):
    img = Image.new("RGB", (1920, 1080), (60, 70, 60))
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = (int(HP_BOX[0] * 1920), int(HP_BOX[1] * 1080), int(HP_BOX[2] * 1920), int(HP_BOX[3] * 1080))
    d.rectangle((x0, y0, x1, y1), fill=(20, 20, 20))  # 빈 칸 (어두움)
    if hp > 0:
        d.rectangle((x0, y0, x0 + int((x1 - x0) * hp), y1), fill=(200, 30, 30))  # 빨간 체력
    qx0, qy0 = int(QUEST_BOX[0] * 1920), int(QUEST_BOX[1] * 1080)
    d.rectangle((qx0, qy0, qx0 + 300, qy0 + 60), fill=(quest_shade, quest_shade, quest_shade))
    return img


def test_bar_fill_measures_colored_length():
    for hp in (1.0, 0.5, 0.2):
        img = _screen(hp).crop((38, 972, 518, 1015))
        assert abs(bar_fill(img) - hp) < 0.08


def test_hp_drop_and_danger_trigger_right_away():
    t = {"now": 0.0}
    hud = HudReader(None, clock=lambda: t["now"])
    hud.set_regions([{"name": "체력바", "kind": "hp", "box": HP_BOX}, {"name": "미니맵", "kind": "minimap", "box": [0.8, 0, 1, 0.2]}])
    assert list(hud.bars) == ["체력바"]  # 미니맵은 안 봄
    for i, hp in enumerate([1.0] * 6 + [0.95, 0.6, 0.6, 0.6, 0.6, 0.15, 0.15, 0.15]):
        t["now"] = i * 0.5
        hud.feed(_screen(hp), t["now"])
    texts = [x for _, _, x in hud.recent(100)]
    assert any("확 깎임" in x for x in texts)  # 2초 안에 25% 넘게
    assert any("위험" in x for x in texts) and hud.alert_at is not None
    import re

    assert 12 <= int(re.search(r"체력바 지금 약 (\d+)%", hud.text()).group(1)) <= 18


def test_quest_and_notice_text_is_read_when_it_changes():
    t = {"now": 0.0}
    reads = []
    answers = {40: "목표: 마리우스와 대화", 90: "퀘스트 완료: 잃어버린 짐"}

    def ocr(img):
        shade = img.convert("L").getpixel((10, 10))
        reads.append(shade)
        return answers.get(shade, "")

    hud = HudReader(ocr, clock=lambda: t["now"])
    hud.set_regions([{"name": "퀘스트 안내", "kind": "quest", "box": QUEST_BOX}])
    hud._submit = lambda name, crop, tt: hud.read_now(name, crop, tt)  # 시험에선 바로 읽기
    for i in range(8):  # 같은 글이 떠 있는 동안은 다시 안 읽음
        t["now"] = i * 0.5
        hud.feed(_screen(1.0, 40), t["now"])
    assert len(reads) == 1 and hud.alert_at is None
    assert [x for _, _, x in hud.recent()] == ["목표: 마리우스와 대화"]
    t["now"] = 5.0
    hud.feed(_screen(1.0, 90), t["now"])
    assert hud.recent()[-1][2] == "퀘스트 완료: 잃어버린 짐" and hud.alert_at == 5.0  # '완료' → 바로 판단
    assert "퀘스트 안내 0초 전: 퀘스트 완료: 잃어버린 짐" in hud.text()
    assert [x for _, _, x in hud.recent(100, since=1.0)] == ["퀘스트 완료: 잃어버린 짐"]


def test_watcher_feeds_layout_regions_and_uses_hud_alerts(qapp, tmp_path):
    from test_watch_voice import _img, _watcher

    from watch.layout import Layouts
    from watch.modes import Mode
    from watch.windows import WindowInfo

    game = Mode("붉은사막", processes=["cd.exe"], interval_seconds=20, cooldown_seconds=60, knowledge="x", is_game=True)
    w, comp, said, t, _ = _watcher(tmp_path, images=[_img(40 + i * 9) for i in range(20)], modes=[game],
                                   window=WindowInfo("CD", "cd.exe", (0, 0, 1900, 1000)))
    w.layouts = Layouts(tmp_path / "layout")
    w.layouts.save("붉은사막", "playing", [{"name": "체력바", "kind": "hp", "box": HP_BOX, "when": "항상"},
                                          {"name": "퀘스트 안내", "kind": "quest", "box": QUEST_BOX, "when": ""}])
    w.update_mode()
    assert [r["name"] for r in w.hud.regions] == ["체력바", "퀘스트 안내"] and w.sampler.hud is w.hud
    w.last_judged = 10.0
    t["now"] = 13.0
    assert not w._spiked()
    w.hud._event(12.0, "퀘스트 안내", "퀘스트 완료", alert=True)
    assert w._spiked()  # 5초를 기다리지 않고 바로
    assert "[화면 정보" in w._context_text(game) and "퀘스트 완료" in w._context_text(game)
    w.last_judged = None
    w.tick()
    assert "퀘스트 완료" in comp.context_seen  # 판단 담당에게도
