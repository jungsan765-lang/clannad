import json

import numpy as np
import pytest
from PIL import Image

from conftest import FPS, GREEN, draw_figure
from sprites import matte as mt
from sprites.build import blend_tail, build, find_loop, resize_rgba
from sprites.recipe import RecipeError, load_recipe
from sprites.video import iter_frames, parse_time, probe


def test_parse_time():
    assert parse_time("1:02.5") == 62.5
    assert parse_time("12") == 12.0
    assert parse_time(3) == 3.0
    assert parse_time("1:00:01") == 3601.0
    with pytest.raises(ValueError):
        parse_time("abc")


def test_iter_frames_count_and_crop(green_video):
    info = probe(green_video)
    assert (info.width, info.height) == (640, 360)
    frames = list(iter_frames(green_video, 1.0, 2.0, 12, crop=(100, 50, 300, 200)))
    assert len(frames) == 12
    assert frames[0].shape == (200, 300, 3)
    # 중간에 멈춰도 오류 없이 정리된다
    gen = iter_frames(green_video, 0, None, 24)
    next(gen)
    gen.close()


def test_chroma_alpha_and_despill():
    img = draw_figure(0.0)
    a = mt.chroma_alpha(img, mt.guess_key_color(img))
    assert a[5, 5] == 0.0  # 배경
    assert a[230, 320] == 1.0  # 몸통
    spill = img.copy()
    spill[230, 320] = (120, 200, 110)  # 초록이 번진 픽셀
    out = mt.despill(spill, np.full(a.shape, 0.5, np.float32), GREEN)
    r, g, b = out[230, 320]
    assert g <= max(r, b) + 15


def test_refine_removes_islands_keeps_body():
    a = np.zeros((200, 200), np.float32)
    a[50:150, 50:150] = 1.0
    a[5:8, 5:8] = 1.0  # 떨어진 작은 조각
    a[0:200, 190:200] = 0.05  # 희미한 안개
    r = mt.refine_alpha(a)
    assert r[100, 100] == 1.0
    assert r[6, 6] == 0.0
    assert r[100, 195] == 0.0


def test_decontaminate_recovers_foreground_color():
    rgb = np.zeros((20, 20, 3), np.uint8)
    alpha = np.zeros((20, 20), np.float32)
    alpha[:, 10:] = 1.0
    alpha[:, 9] = 0.5
    rgb[:, 10:] = (200, 50, 50)
    rgb[:, 9] = (100, 113, 57)  # 0.5*(200,50,50) + 0.5*(0,177,64)
    rgb[:, :9] = GREEN
    out = mt.decontaminate(rgb, alpha, GREEN)
    assert abs(int(out[5, 9, 0]) - 200) < 10 and out[5, 9, 1] < 70


def test_stabilize_only_touches_still_pixels():
    still = [np.full((4, 4), v, np.float32) for v in (0.50, 0.90, 0.52)]  # 가운데만 깜빡
    moving = [np.full((4, 4), v, np.float32) for v in (0.0, 0.5, 1.0)]  # 실제 움직임
    assert mt.stabilize(still)[1][0, 0] == pytest.approx(0.52)
    assert mt.stabilize(moving)[1][0, 0] == pytest.approx(0.5)


def test_resize_rgba_no_dark_fringe():
    rgba = np.zeros((40, 40, 4), np.uint8)
    rgba[10:30, 10:30] = (255, 255, 255, 255)
    small = resize_rgba(rgba, 15, 15)
    edge = small[small[..., 3] > 0]
    assert edge[..., :3].min() >= 250  # 반투명 가장자리도 흰색 유지


def _frames(period, n):
    out = []
    for i in range(n):
        f = np.zeros((32, 32, 4), np.uint8)
        y = int(12 + 8 * np.sin(2 * np.pi * i / period))
        f[y : y + 6, 10:20] = 255
        out.append(f)
    return out


def test_find_loop_cuts_on_period():
    cut, seam = find_loop(_frames(10, 27))
    assert cut == 20  # 같은 자세라도 방향이 반대인 15는 피한다
    assert seam <= 2.5  # 이음새가 평소 한 프레임 움직임과 비슷함


def test_blend_tail_keeps_length():
    frames = _frames(10, 20)
    assert len(blend_tail(frames, 3)) == 20


def test_recipe_errors(tmp_path):
    p = tmp_path / "x.toml"
    p.write_text('name = "x"\nsource = "a.mp4"\n', encoding="utf-8")
    with pytest.raises(RecipeError, match="motions"):
        load_recipe(p)
    p.write_text('source = "a.mp4"\n[motions.idle]\nstart = 1\nend = 0.5\n', encoding="utf-8")
    with pytest.raises(RecipeError, match="end"):
        load_recipe(p)
    p.write_text('source = "a.mp4"\n[motions.idle]\nstart = 0\nend = 1\nthen = "nope"\n', encoding="utf-8")
    with pytest.raises(RecipeError, match="nope"):
        load_recipe(p)
    p.write_text('source = "a.mp4"\n[motions.idle]\nsegments = [[0, 1]]\n', encoding="utf-8")
    with pytest.raises(RecipeError, match="두 개 이상"):
        load_recipe(p)
    p.write_text('source = "a.mp4"\nfidgets = ["idle"]\n[motions.idle]\nstart = 0\nend = 1\n', encoding="utf-8")
    with pytest.raises(RecipeError, match="once"):
        load_recipe(p)


def test_build_outputs(built):
    m = built["manifest"]
    out = built["out"]
    assert m["default"] == "idle" and m["talk"] == "talk"
    assert set(m["motions"]) == {"idle", "talk", "happy", "longidle"}
    assert m["motions"]["longidle"]["frames"] >= 60  # 3초 목표로 이어 붙임
    # 1초 주기로 흔들리므로 idle 루프는 24장 단위로 잘려야 한다
    assert m["motions"]["idle"]["frames"] % FPS == 0
    assert m["motions"]["happy"]["then"] == "idle"
    assert m["emotions"]["worried"] == "talk" and m["emotions"]["happy"] == "happy"
    assert m["fidgets"] == ["happy"] and m["fidget_every"] == [5.0, 6.0]
    w, h = m["size"]
    for name, info in m["motions"].items():
        files = sorted((out / name).glob("*.png"))
        assert len(files) == info["frames"]
        for f in files[:: max(1, len(files) // 4)]:
            img = Image.open(f)
            assert img.size == (w, h) and img.mode == "RGBA"
    first = np.asarray(Image.open(out / "idle" / "0000.png"))
    assert first[0, 0, 3] == 0  # 모서리는 투명
    assert first[..., 3].max() == 255
    # 초록 배경이 남지 않음
    solid = first[first[..., 3] > 200][:, :3].astype(int)
    assert not ((solid[:, 1] > solid[:, 0] + 40) & (solid[:, 1] > solid[:, 2] + 40)).any()
    # 모든 동작을 합친 범위(점프 포함)의 높이가 height 와 같다
    rows = np.zeros(h, bool)
    for name in m["motions"]:
        for f in (out / name).glob("*.png"):
            rows |= (np.asarray(Image.open(f))[..., 3] > 12).any(axis=1)
    ys = np.nonzero(rows)[0]
    assert 232 <= ys.max() - ys.min() + 1 <= 248
    assert (out / "previews" / "sheet.png").is_file()
    assert (out / "previews" / "idle.mp4").stat().st_size > 0
    assert (out / "previews" / "all.mp4").stat().st_size > 0
    assert json.loads((out / "manifest.json").read_text(encoding="utf-8")) == m


def test_build_reuses_cache(built):
    logs: list[str] = []
    build(load_recipe(built["recipe"]), built["out"], built["work"], built["out"].parent / "models", logs.append)
    assert sum("재사용" in line for line in logs) == 6  # 동작 3개 + 이어 붙인 동작의 구간 3개


def test_ai_matter_shapes():
    import pathlib

    model = pathlib.Path(__file__).resolve().parents[1] / "models" / mt.MODEL_NAME
    if not model.is_file():
        pytest.skip("AI 모델 파일이 없어서 건너뜀")
    ai = mt.AiMatter(model)
    a = ai(np.zeros((90, 160, 3), np.uint8))
    assert a.shape == (90, 160) and a.dtype == np.float32
    assert 0.0 <= a.min() and a.max() <= 1.0
