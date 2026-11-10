"""파츠를 휘어서 움직이게 하는 2D 리그와, 그 결과를 프레임으로 굽는 도구.

움직이는 방식
- 몸: 엉덩이를 축으로 아주 조금 흔들리고, 숨 쉴 때 가슴 위쪽이 살짝 오르내린다(아래로 갈수록 덜 움직임).
- 머리: 목 아래(몸이 숨 쉬며 올라간 위치)를 축으로 기울어진다. 얼굴·앞머리·머리 장식·목 장식이 함께 움직인다.
- 머리카락: 뿌리는 머리를 따라가고, 끝으로 갈수록 몸 쪽에 얹혀 시간차를 두고 흔들린다.
- 깜빡임: 얼굴 이미지만 감은 눈 얼굴로 바꾼다.

모든 변형은 '각 픽셀을 얼마나 옮길지'(변위 필드)로 계산해 cv2.remap 으로 그린다.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable

import cv2
import numpy as np

from .parts import PartSet

Vec = tuple[float, float]


@dataclass
class Pose:
    breath: float = 0.0  # -1~1
    body_rot: float = 0.0  # 도
    head_rot: float = 0.0  # 도 (+ 는 화면 기준 시계 방향)
    head_dx: float = 0.0  # 원본 픽셀
    head_dy: float = 0.0
    head_squash: float = 0.0  # 끄덕일 때 머리가 살짝 짧아 보이게 (0~0.03)
    hair: dict[str, Vec] = field(default_factory=dict)  # 레이어별 머리카락 끝 흔들림 (원본 픽셀)
    blink: float = 0.0  # 0 뜸 ~ 1 감음


@dataclass
class LayerRig:
    follow: str = "body"  # body | head | hair | bangs
    root: float = 0.0  # 머리카락 뿌리 y (원본 좌표)
    tip: float = 0.0  # 머리카락 끝 y
    sway: float = 0.0  # 바람에 흔들리는 폭 (원본 픽셀)
    lag: float = 0.3  # 머리 움직임을 따라오는 시간차 (초)
    period: float = 2.0  # 흔들림 주기 (초)
    phase: float = 0.0


@dataclass
class RigConfig:
    hip: Vec = (512.0, 1350.0)
    neck: Vec = (512.0, 470.0)
    breath_amount: float = 3.5  # 가슴 위쪽이 오르내리는 폭 (원본 픽셀)
    chest_top: float = 560.0  # 이 위로는 숨쉬기 움직임 100%
    waist: float = 1000.0  # 이 아래로는 0%
    layers: dict[str, LayerRig] = field(default_factory=dict)


def _smooth(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


class Rig:
    def __init__(self, parts: PartSet, scale: float, cfg: RigConfig):
        self.parts = parts
        self.scale = scale
        self.cfg = cfg
        h, w = parts.face_open.shape[:2]
        self.size = (w, h)
        gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
        self.gx, self.gy = gx, gy
        order = sorted(parts.layers.values(), key=lambda L: L.z)
        self.order: list[tuple[int, str]] = sorted([(L.z, L.name) for L in order] + [(parts.face_z, "__face__")])

    # ------------------------------------------------------------ 변위 계산 (렌더 좌표)

    def _rotate(self, x, y, pivot: Vec, deg: float):
        a = math.radians(deg)
        c, s_ = math.cos(a), math.sin(a)
        px, py = pivot
        dx, dy = x - px, y - py
        return px + c * dx - s_ * dy, py + s_ * dx + c * dy

    def body_disp(self, x, y, pose: Pose):
        s = self.scale
        hip = (self.cfg.hip[0] * s, self.cfg.hip[1] * s)
        rx, ry = self._rotate(x, y, hip, pose.body_rot)
        lift = self.cfg.breath_amount * s * pose.breath
        w = _smooth(np.asarray((self.cfg.waist * s - y) / ((self.cfg.waist - self.cfg.chest_top) * s), np.float32))
        return rx - x, ry - y - lift * w

    def head_disp(self, x, y, pose: Pose):
        s = self.scale
        nx, ny = self.cfg.neck[0] * s, self.cfg.neck[1] * s
        bdx, bdy = self.body_disp(nx, ny, pose)  # 목이 몸을 따라 움직인 만큼
        rx, ry = self._rotate(x, y, (nx, ny), pose.head_rot)
        ry = ny + (ry - ny) * (1.0 - pose.head_squash)
        return rx - x + bdx + pose.head_dx * s, ry - y + bdy + pose.head_dy * s

    def layer_disp(self, name: str, x, y, pose: Pose):
        lr = self.cfg.layers.get(name, LayerRig())
        if name == "__face__" or lr.follow == "head":
            return self.head_disp(x, y, pose)
        if lr.follow == "body":
            return self.body_disp(x, y, pose)
        hx, hy = self.head_disp(x, y, pose)
        tx, ty = pose.hair.get(name, (0.0, 0.0))
        w = np.clip((y - lr.root * self.scale) / max((lr.tip - lr.root) * self.scale, 1.0), 0.0, 1.0) ** 1.5
        if lr.follow == "bangs":  # 앞머리는 머리에 붙어 있고 끝만 살짝
            return hx + w * tx * self.scale, hy + w * ty * self.scale
        bx, by = self.body_disp(x, y, pose)
        return (1 - w) * hx + w * (bx + tx * self.scale), (1 - w) * hy + w * (by + ty * self.scale)

    # ------------------------------------------------------------ 그리기

    def render(self, pose: Pose) -> np.ndarray:
        h, w = self.size[1], self.size[0]
        out = np.zeros((h, w, 4), np.float32)
        gx, gy = self.gx, self.gy
        for _, name in self.order:
            if name == "__face__":
                img = self.parts.face_closed if pose.blink >= 0.5 else self.parts.face_open
            else:
                img = self.parts.layers[name].rgba
            # 출력 픽셀 q 에 올 원본 위치 p: p + D(p) = q  →  p ≈ q - D(q - D(q))
            dx, dy = self.layer_disp(name, gx, gy, pose)
            dx2, dy2 = self.layer_disp(name, gx - dx, gy - dy, pose)
            warped = cv2.remap(img, (gx - dx2).astype(np.float32), (gy - dy2).astype(np.float32),
                               cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
            out = warped + out * (1.0 - warped[..., 3:4])
        a = np.clip(out[..., 3:4], 0.0, 1.0)
        rgb = np.where(a > 1e-4, out[..., :3] / np.maximum(a, 1e-4), 0.0)
        return np.round(np.dstack([np.clip(rgb, 0, 1), a]) * 255).astype(np.uint8)


# ---------------------------------------------------------------- 움직임 (시간 → 자세)


def _blink_curve(t: float, at: float, fps: float) -> float:
    """at 초부터 약 0.1초 동안 감는다. 반쯤 겹친 중간 장면은 눈이 두 겹으로 보여서 쓰지 않는다."""
    return 1.0 if 0 <= (t - at) < 0.1 else 0.0


def idle_pose(t: float, rig: Rig, fps: float, blinks: tuple[float, ...] = (2.3,), period: float = 6.0) -> Pose:
    """6초마다 정확히 반복되는 대기 동작 (숨 두 번, 고개·머리카락이 천천히 흔들림)."""
    tau = 2 * math.pi
    p = Pose()
    p.breath = math.sin(tau * t / (period / 2))
    p.body_rot = 0.35 * math.sin(tau * t / period)
    p.head_rot = 0.9 * math.sin(tau * t / period + 0.8) + 0.25 * math.sin(tau * t / (period / 2) + 2.0)

    def head_x(tt: float) -> float:
        q = Pose(breath=math.sin(tau * tt / (period / 2)), body_rot=0.35 * math.sin(tau * tt / period),
                 head_rot=0.9 * math.sin(tau * tt / period + 0.8) + 0.25 * math.sin(tau * tt / (period / 2) + 2.0))
        s = rig.scale
        dx, _ = rig.head_disp(rig.cfg.neck[0] * s, (rig.cfg.neck[1] - 250) * s, q)
        return dx / s

    for name, lr in rig.cfg.layers.items():
        if lr.follow not in ("hair", "bangs"):
            continue
        follow = 1.3 * (head_x(t - lr.lag) - head_x(t))  # 머리가 움직이면 끝은 늦게 따라옴
        wind = lr.sway * math.sin(tau * t / lr.period + lr.phase)
        p.hair[name] = (follow + wind, 0.25 * abs(wind))
    p.blink = max((_blink_curve(t, b, fps) for b in blinks), default=0.0)
    return p


def bump(t: float, length: float) -> float:
    """0 → 1 → 0 으로 부드럽게 (길이 length 초)"""
    if not 0 <= t <= length:
        return 0.0
    return math.sin(math.pi * t / length) ** 2


def nod_pose(t: float, rig: Rig, fps: float) -> Pose:
    """대기 자세 0초에서 시작해 고개를 한 번 끄덕이고 돌아온다 (1.2초)."""
    p = idle_pose(0.0, rig, fps, blinks=())
    b = bump(t, 1.2)
    p.head_dy += 7.0 * b
    p.head_squash = 0.012 * b
    p.head_rot += 0.6 * b
    p.blink = 1.0 if 0.38 <= t < 0.5 else 0.0  # 고개 숙일 때 짧게 감음
    return p


def tilt_pose(t: float, rig: Rig, fps: float) -> Pose:
    """고개를 갸웃했다가 돌아온다 (2.4초). 머리카락은 반대로 늦게 따라온다."""
    p = idle_pose(0.0, rig, fps, blinks=())
    b = bump(t, 2.4)
    lag = bump(t - 0.25, 2.4)
    p.head_rot += 4.5 * b
    p.head_dx += 3.0 * b
    for name in list(p.hair):
        hx, hy = p.hair[name]
        p.hair[name] = (hx + 6.0 * (lag - b), hy)
    p.blink = _blink_curve(t, 1.5, fps)
    return p


MOTIONS: dict[str, tuple[Callable[[float, Rig, float], Pose], float, str]] = {
    "idle": (lambda t, r, f: idle_pose(t, r, f), 6.0, "loop"),
    "nod": (nod_pose, 1.2, "once"),
    "tilt": (tilt_pose, 2.4, "once"),
}
