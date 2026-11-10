"""여러 구간을 이어 붙여 긴 동작을 만든다.

이음새에서는 두 장면 사이의 움직임(옵티컬 플로우)을 추정해 중간 장면을 새로 그린다.
단순히 겹쳐 섞으면 팔·머리카락이 두 겹으로 보이는데, 이 방식은 실제로 움직여 이어진다.
"""

from __future__ import annotations

import random
from typing import Callable

import cv2
import numpy as np

Frames = list[np.ndarray]


def small_rep(frame: np.ndarray, width: int = 96) -> np.ndarray:
    """비교용 작은 사본 (알파를 곱한 RGBA, 0~1)."""
    h, w = frame.shape[:2]
    sh = max(1, round(h * width / w))
    f = cv2.resize(frame, (width, sh), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    f[..., :3] *= f[..., 3:4]
    return f


def frame_diff(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.abs(a - b).mean())


def _premul(f: np.ndarray) -> np.ndarray:
    p = f.astype(np.float32) / 255.0
    p[..., :3] *= p[..., 3:4]
    return p


def _unpremul(p: np.ndarray) -> np.ndarray:
    a = np.clip(p[..., 3:4], 0.0, 1.0)
    rgb = np.where(a > 1e-4, p[..., :3] / np.maximum(a, 1e-4), 0.0)
    return np.round(np.dstack([np.clip(rgb, 0, 1), a]) * 255).astype(np.uint8)


def _flow_gray(f: np.ndarray) -> np.ndarray:
    """흐름 계산용 회색 이미지. 투명한 곳은 중간 회색으로 두어 윤곽도 따라가게 한다."""
    a = f[..., 3:4].astype(np.float32) / 255.0
    rgb = f[..., :3].astype(np.float32) * a + 128.0 * (1 - a)
    return cv2.cvtColor(rgb.astype(np.uint8), cv2.COLOR_RGB2GRAY)


def morph(a: np.ndarray, b: np.ndarray, n: int) -> Frames:
    """a 와 b 사이에 n 장의 중간 장면을 만든다 (a, b 자신은 포함하지 않음)."""
    if n <= 0:
        return []
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    flow = dis.calc(_flow_gray(a), _flow_gray(b), None)  # a 의 각 점이 b 에서 어디로 갔는지
    h, w = a.shape[:2]
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    pa, pb = _premul(a), _premul(b)
    out = []
    for i in range(1, n + 1):
        t = i / (n + 1)
        wa = cv2.remap(pa, gx - t * flow[..., 0], gy - t * flow[..., 1], cv2.INTER_LINEAR,
                       borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        wb = cv2.remap(pb, gx + (1 - t) * flow[..., 0], gy + (1 - t) * flow[..., 1], cv2.INTER_LINEAR,
                       borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        out.append(_unpremul((1 - t) * wa + t * wb))
    return out


def compose_sequence(
    parts: list[Frames],
    target_frames: int,
    max_join: int = 6,
    reverse: bool = True,
    seed: int = 7,
    log: Callable[[str], None] = lambda _: None,
) -> tuple[Frames, list[float]]:
    """짧은 구간들을 자연스럽게 이어 target_frames 이상인 반복 동작을 만든다.

    - 각 구간은 정방향과 역방향(숨쉬기는 거꾸로 돌려도 자연스러움) 두 조각으로 쓴다.
    - 조각이 끝나면, 다른 구간 조각들의 앞부분 중 지금 장면과 가장 닮은 곳으로 넘어간다.
    - 넘어가는 곳은 차이에 비례해 2~max_join 장의 중간 장면을 그려 넣는다.
    - 마지막엔 처음 장면과 가장 닮은 곳에서 끊고 처음으로 이어 붙인다.

    돌려주는 값: (프레임들, 이음새마다 '평소 한 프레임 움직임 대비 차이' 목록)
    """
    if not parts or any(len(p) == 0 for p in parts):
        raise ValueError("빈 구간이 있어요.")
    smalls = [[small_rep(f) for f in p] for p in parts]
    steps = [frame_diff(s[i], s[i + 1]) for s in smalls for i in range(len(s) - 1)]
    typical = max(float(np.median(steps)) if steps else 1e-3, 1e-4)
    pieces = [(i, False) for i in range(len(parts))]
    if reverse:
        pieces += [(i, True) for i in range(len(parts))]

    def seq_of(piece) -> tuple[Frames, list[np.ndarray]]:
        i, rev = piece
        return (parts[i][::-1], smalls[i][::-1]) if rev else (parts[i], smalls[i])

    def join_count(d: float) -> int:
        return int(np.clip(round(d / typical), 2, max_join))

    def min_play(n: int) -> int:
        return min(n - 1, max(6, n // 3))  # 한 조각에서 최소 이만큼은 재생

    rng = random.Random(seed)
    frames: Frames = []
    joins: list[float] = []
    current, start = pieces[0], 0
    first_small = smalls[0][0]
    while True:
        f, s = seq_of(current)
        exits = range(min(start + min_play(len(f)), len(f) - 1), len(f))
        if len(frames) + len(f) - start >= target_frames:
            # 처음으로 돌아가는 이음새: 이 조각 뒷부분에서 첫 장면과 가장 닮은 곳에서 끊는다
            d, e = min((frame_diff(s[k], first_small), k) for k in exits)
            frames += f[start : e + 1]
            frames += morph(f[e], parts[0][0], join_count(d))
            joins.append(d / typical)
            break
        # 지금 조각의 뒷부분(나가는 곳) × 다른 구간 조각의 앞 60%(들어가는 곳) 중 가장 닮은 쌍
        best_per_piece = []
        for p in pieces:
            if len(parts) > 1 and p[0] == current[0]:
                continue  # 같은 구간이 바로 이어지지 않게
            _, sp = seq_of(p)
            entries = range(0, max(1, len(sp) - min_play(len(sp))))
            entries = range(0, max(1, min(len(entries), int(len(sp) * 0.6))))
            best_per_piece.append(min((frame_diff(s[e], sp[b]), p, e, b) for e in exits for b in entries))
        best_per_piece.sort(key=lambda x: x[0])
        d, piece, e, b = rng.choice(best_per_piece[:2])  # 가장 닮은 두 곳 중 하나 (단조로움 방지)
        frames += f[start : e + 1]
        frames += morph(f[e], seq_of(piece)[0][b], join_count(d))
        joins.append(d / typical)
        current, start = piece, b
    log(f"  이어 붙인 곳 {len(joins)}개, 평균 차이 {np.mean(joins):.1f} (1에 가까울수록 자연스러움)")
    return frames, joins
