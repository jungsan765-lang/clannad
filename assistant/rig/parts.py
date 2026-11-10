"""파츠 묶음(layers.json + PNG)을 읽고, 깜빡임용 감은 눈 얼굴을 만든다."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


@dataclass
class Layer:
    name: str
    z: int
    rgba: np.ndarray  # float32 0~1, 알파를 곱한 상태 (premultiplied), 렌더 배율 적용됨


def _load_rgba(path: Path, canvas: tuple[int, int], offset: tuple[int, int], clip: list[int] | None,
               alpha_gain: float) -> np.ndarray:
    """원래 캔버스 좌표 그대로 불러온다. (투명 여백을 자르지 않음)"""
    w, h = canvas
    src = np.asarray(Image.open(path).convert("RGBA")).astype(np.float32) / 255.0
    out = np.zeros((h, w, 4), np.float32)
    ox, oy = offset
    sx0, sy0 = max(0, -ox), max(0, -oy)
    dx0, dy0 = max(0, ox), max(0, oy)
    dx1, dy1 = min(w, ox + src.shape[1]), min(h, oy + src.shape[0])
    out[dy0:dy1, dx0:dx1] = src[sy0 : sy0 + dy1 - dy0, sx0 : sx0 + dx1 - dx0]
    if clip:
        x0, y0, x1, y1 = clip
        keep = np.zeros((h, w), bool)
        keep[y0:y1, x0:x1] = True
        out[~keep, 3] = 0.0
    # 대부분의 불투명 픽셀이 253이라 뒤 레이어가 비친다 → 비율만 키워 가장자리 부드러움은 유지
    out[..., 3] = np.clip(out[..., 3] * alpha_gain, 0.0, 1.0)
    out[out[..., 3] <= 0.0, :3] = 0.0
    return out


def premultiply(rgba: np.ndarray) -> np.ndarray:
    p = rgba.copy()
    p[..., :3] *= p[..., 3:4]
    return p


def resize_premul(p: np.ndarray, scale: float) -> np.ndarray:
    if scale == 1.0:
        return p
    h, w = p.shape[:2]
    size = (max(1, round(w * scale)), max(1, round(h * scale)))
    return cv2.resize(p, size, interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_CUBIC)


def make_closed_face(open_face: np.ndarray, closed_face: np.ndarray, eye_boxes: list[list[int]],
                     feather: float = 3.5) -> np.ndarray:
    """눈 뜬 얼굴의 눈 부분만 감은 눈으로 바꾼다 (얼굴형·피부색은 눈 뜬 얼굴 그대로).

    감은 얼굴 파일은 눈 밖의 얼굴형·피부색도 조금 달라서 통째로 바꾸면 깜빡일 때 얼굴이 바뀌어 보인다.
    그래서 (1) 눈 뜬 얼굴의 눈을 주변 피부로 메우고, (2) 감은 얼굴에서 '피부 대비 어두운 정도'
    (속눈썹 선, 쌍꺼풀 음영)만 비율로 가져와 그 위에 입힌다.
    두 입력은 알파를 곱하지 않은 RGBA(0~1)이다.
    """
    out = open_face.copy()
    h, w = out.shape[:2]
    rgb_open = np.round(open_face[..., :3] * 255).astype(np.uint8)
    rgb_closed = closed_face[..., :3]
    mask_total = np.zeros((h, w), np.float32)
    patch_total = out[..., :3].copy()
    lum_open = rgb_open.astype(np.float32).mean(-1) / 255.0
    for x0, y0, x1, y1 in eye_boxes:
        pad = 16
        bx0, by0, bx1, by1 = max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)
        # (1) 지울 곳: 눈 상자를 조금 넓힌 타원 + 그 주변의 어두운 속눈썹 끝(눈썹은 상자 위라 제외)
        hole = np.zeros((h, w), np.uint8)
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        cv2.ellipse(hole, (cx, cy), ((x1 - x0) // 2 + 5, (y1 - y0) // 2 + 3), 0, 0, 360, 255, -1)
        near = np.zeros((h, w), bool)
        near[y0 - 2 : y1 + 4, x0 - 10 : x1 + 10] = True
        hole[(lum_open < 0.55) & near] = 255
        hole = cv2.dilate(hole, np.ones((5, 5), np.uint8))
        # 메우기: 구멍 밖의 밝은 피부색을 가까운 곳부터 넓혀가며 퍼뜨린 매끈한 피부
        hole_r = hole[by0:by1, bx0:bx1] > 0
        r_open = open_face[by0:by1, bx0:bx1, :3]
        good = ((~hole_r) & (lum_open[by0:by1, bx0:bx1] > 0.6)).astype(np.float32)
        skin = np.zeros_like(r_open)
        done = np.zeros(hole_r.shape, bool)
        for radius in (6, 12, 24, 48, 96):
            k = radius * 2 + 1
            num = cv2.blur(r_open * good[..., None], (k, k))
            den = cv2.blur(good, (k, k))
            ok = (den > 0.05) & ~done
            skin[ok] = num[ok] / den[ok][:, None]
            done |= ok
        skin = cv2.GaussianBlur(skin, (0, 0), 2.5)
        base = np.where(hole_r[..., None], skin, r_open)
        # (2) 감은 눈의 선: 감은 얼굴에서 '주변 피부보다 어두운 정도'를 비율로 가져와, 원래 눈 자리 안에만 입힌다
        region = rgb_closed[by0:by1, bx0:bx1]
        lum = region.mean(-1)
        bright = (lum > np.percentile(lum, 35)).astype(np.float32)
        tone = cv2.blur(region * bright[..., None], (15, 15)) / np.maximum(cv2.blur(bright, (15, 15))[..., None], 1e-3)
        ratio = np.clip(region / np.maximum(tone, 1e-3), 0.0, 1.0)
        dark = 1.0 - ratio.mean(-1)
        inside = cv2.dilate(hole_r.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        use = (dark > 0.06) & inside
        patch_total[by0:by1, bx0:bx1] = np.where(use[..., None], base * ratio, base)
        m = np.zeros((h, w), np.float32)
        m[by0:by1, bx0:bx1] = cv2.GaussianBlur((hole_r | use).astype(np.float32), (0, 0), 1.5)
        m[by0:by1, bx0:bx1] = np.maximum(m[by0:by1, bx0:bx1], hole_r.astype(np.float32))
        mask_total = np.maximum(mask_total, m)
    out[..., :3] = out[..., :3] * (1 - mask_total[..., None]) + patch_total * mask_total[..., None]
    return out


@dataclass
class PartSet:
    canvas: tuple[int, int]
    layers: dict[str, Layer]
    face_open: np.ndarray  # premultiplied, scaled
    face_closed: np.ndarray
    face_z: int


def load_parts(folder: str | Path, face_file: str, scale: float, alpha_gain: float = 255 / 253,
               eye_boxes: list[list[int]] | None = None, skip: tuple[str, ...] = ()) -> PartSet:
    folder = Path(folder)
    spec = json.loads((folder / "layers.json").read_text(encoding="utf-8"))
    canvas = (int(spec["canvas"]["width"]), int(spec["canvas"]["height"]))
    layers: dict[str, Layer] = {}
    face_z = None
    face_clip = None
    for item in spec["layers"]:
        name = Path(item["file"]).stem
        if "face" in name:
            face_z, face_clip = int(item["z"]), item.get("clip_xyxy")
            continue
        if name in skip or not item.get("visible", True):
            continue
        rgba = _load_rgba(folder / item["file"], canvas, (int(item["x"]), int(item["y"])), item.get("clip_xyxy"), alpha_gain)
        layers[name] = Layer(name, int(item["z"]), resize_premul(premultiply(rgba), scale))
    if face_z is None:
        raise ValueError("layers.json 에 얼굴 레이어가 없어요.")
    blink = spec.get("variants", {}).get("blink", {})
    closed_file = blink.get("with", "parts/21_face_closed.png")
    boxes = eye_boxes or blink.get("optional_eye_region_xyxy")
    if not boxes:
        raise ValueError("눈 위치(optional_eye_region_xyxy)가 없어요.")
    face_open = _load_rgba(folder / face_file, canvas, (0, 0), face_clip, alpha_gain)
    face_closed_src = _load_rgba(folder / closed_file, canvas, (0, 0), face_clip, alpha_gain)
    face_closed = make_closed_face(face_open, face_closed_src, boxes)
    return PartSet(
        canvas=canvas,
        layers=layers,
        face_open=resize_premul(premultiply(face_open), scale),
        face_closed=resize_premul(premultiply(face_closed), scale),
        face_z=face_z,
    )
