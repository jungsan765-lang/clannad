import json

import numpy as np
from PIL import Image

from rig.animate import MOTIONS, LayerRig, Pose, Rig, RigConfig
from rig.parts import load_parts


def _png(path, w, h, box, color):
    a = np.zeros((h, w, 4), np.uint8)
    x0, y0, x1, y1 = box
    a[y0:y1, x0:x1] = (*color, 253)  # 받은 파츠처럼 불투명이 253
    Image.fromarray(a).save(path)


def _parts(tmp_path):
    w, h = 200, 300
    (tmp_path / "parts").mkdir()
    _png(tmp_path / "parts/00_back_hair.png", w, h, (60, 40, 140, 280), (20, 80, 90))
    _png(tmp_path / "parts/10_body.png", w, h, (50, 110, 150, 300), (230, 230, 235))
    _png(tmp_path / "parts/30_hair.png", w, h, (55, 40, 75, 160), (20, 90, 100))
    face = np.zeros((h, w, 4), np.uint8)
    face[40:110, 70:130] = (240, 210, 200, 253)
    closed = face.copy()
    face[70:78, 80:92] = (40, 160, 200, 253)  # 뜬 눈
    face[70:78, 108:120] = (40, 160, 200, 253)
    closed[76:78, 80:92] = (60, 30, 30, 253)  # 감은 눈 선
    closed[76:78, 108:120] = (60, 30, 30, 253)
    Image.fromarray(face).save(tmp_path / "parts/20_face_open.png")
    Image.fromarray(closed).save(tmp_path / "parts/21_face_closed.png")
    spec = {
        "canvas": {"width": w, "height": h},
        "layers": [
            {"file": "parts/00_back_hair.png", "z": 0, "x": 0, "y": 0},
            {"file": "parts/10_body.png", "z": 10, "x": 0, "y": 0},
            {"file": "parts/20_face_open.png", "z": 20, "x": 0, "y": 0},
            {"file": "parts/30_hair.png", "z": 30, "x": 0, "y": 0},
        ],
        "variants": {"blink": {"with": "parts/21_face_closed.png", "optional_eye_region_xyxy": [[78, 66, 94, 82], [106, 66, 122, 82]]}},
    }
    (tmp_path / "layers.json").write_text(json.dumps(spec), encoding="utf-8")
    return tmp_path


def _rig(tmp_path):
    ps = load_parts(_parts(tmp_path), "parts/20_face_open.png", 1.0)
    cfg = RigConfig(hip=(100, 280), neck=(100, 110), chest_top=120, waist=220, layers={
        "00_back_hair": LayerRig(follow="hair", root=50, tip=280, sway=3, lag=0.4, period=3),
        "30_hair": LayerRig(follow="hair", root=50, tip=160, sway=2, lag=0.25, period=2),
    })
    return Rig(ps, 1.0, cfg)


def test_alpha_gain_makes_solid_parts_opaque(tmp_path):
    ps = load_parts(_parts(tmp_path), "parts/20_face_open.png", 1.0)
    assert ps.layers["10_body"].rgba[200, 100, 3] == 1.0


def test_closed_face_changes_only_eyes(tmp_path):
    ps = load_parts(_parts(tmp_path), "parts/20_face_open.png", 1.0)
    diff = np.abs(ps.face_open - ps.face_closed).max(-1)
    ys, xs = np.nonzero(diff > 0.02)
    assert ys.min() >= 60 and ys.max() <= 88  # 눈 근처만 바뀜
    assert ps.face_closed[74, 86, 2] > 0.6  # 뜬 눈(파랑)은 피부로 메워짐


def test_rest_pose_matches_static_assembly(tmp_path):
    rig = _rig(tmp_path)
    still = rig.render(Pose())
    assert still.shape == (300, 200, 4)
    assert still[200, 100, 3] == 255 and still[5, 5, 3] == 0


def test_motions_loop_and_move(tmp_path):
    rig = _rig(tmp_path)
    fn, length, loop = MOTIONS["idle"]
    a, b = rig.render(fn(0.0, rig, 30)), rig.render(fn(length, rig, 30))
    assert np.abs(a.astype(int) - b.astype(int)).max() <= 2  # 끝과 처음이 같은 자세 → 끊김 없이 반복
    mid = rig.render(fn(length / 4, rig, 30))
    assert np.abs(a.astype(int) - mid.astype(int)).max() > 20  # 실제로 움직임
    tilt, tl, _ = MOTIONS["tilt"]
    assert np.abs(rig.render(tilt(0.0, rig, 30)).astype(int) - a.astype(int)).max() <= 2  # 대기 0초 자세에서 시작
