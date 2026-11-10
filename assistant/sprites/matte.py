"""배경 제거(누끼): AI 애니 캐릭터 분할 모델, 단색 크로마키, 가장자리 정리."""

from __future__ import annotations

import hashlib
import sys
import urllib.request
from pathlib import Path

import cv2
import numpy as np

# skytnt/anime-seg (Apache-2.0) 의 ISNet 모델. 애니 그림체 캐릭터 분할용.
MODEL_URL = "https://huggingface.co/skytnt/anime-seg/resolve/main/isnetis.onnx"
MODEL_NAME = "isnetis.onnx"
MODEL_SHA256 = "f15622d853e8260172812b657053460e20806f04b9e05147d49af7bed31a6e99"
MODEL_INPUT = 1024


def ensure_model(models_dir: str | Path, log=print) -> Path:
    """모델 파일이 없으면 Hugging Face에서 받는다(약 170MB, 한 번만)."""
    models_dir = Path(models_dir)
    path = models_dir / MODEL_NAME
    if path.is_file():
        return path
    models_dir.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".part")
    log(f"AI 누끼 모델 다운로드 중 (약 170MB, 처음 한 번만): {MODEL_URL}")
    digest = hashlib.sha256()
    with urllib.request.urlopen(MODEL_URL, timeout=60) as resp, open(tmp, "wb") as f:
        total = int(resp.headers.get("Content-Length") or 0)
        done = 0
        while chunk := resp.read(1 << 20):
            f.write(chunk)
            digest.update(chunk)
            done += len(chunk)
            if total:
                sys.stdout.write(f"\r  {done * 100 // total}%")
                sys.stdout.flush()
    sys.stdout.write("\n")
    if digest.hexdigest() != MODEL_SHA256:
        tmp.unlink(missing_ok=True)
        raise RuntimeError("받은 모델 파일의 체크섬이 달라요. 다시 시도해주세요.")
    tmp.replace(path)
    return path


class AiMatter:
    """애니 캐릭터 분할 모델로 알파(0~1)를 만든다."""

    def __init__(self, model_path: str | Path):
        import onnxruntime as ort

        preferred = ["CUDAExecutionProvider", "DmlExecutionProvider", "CPUExecutionProvider"]
        available = ort.get_available_providers()
        providers = [p for p in preferred if p in available] or available
        self.session = ort.InferenceSession(str(model_path), providers=providers)
        self.input_name = self.session.get_inputs()[0].name
        self.provider = self.session.get_providers()[0]

    def __call__(self, rgb: np.ndarray) -> np.ndarray:
        h0, w0 = rgb.shape[:2]
        size = MODEL_INPUT
        if h0 > w0:
            h, w = size, max(1, int(size * w0 / h0))
        else:
            h, w = max(1, int(size * h0 / w0)), size
        ph, pw = size - h, size - w
        x = np.zeros((size, size, 3), np.float32)
        x[ph // 2 : ph // 2 + h, pw // 2 : pw // 2 + w] = (
            cv2.resize(rgb, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
        )
        mask = self.session.run(None, {self.input_name: x.transpose(2, 0, 1)[None]})[0][0, 0]
        mask = mask[ph // 2 : ph // 2 + h, pw // 2 : pw // 2 + w]
        mask = cv2.resize(mask, (w0, h0), interpolation=cv2.INTER_LINEAR)
        return np.clip(mask, 0.0, 1.0).astype(np.float32)


def parse_color(text: str) -> tuple[int, int, int]:
    text = text.strip().lstrip("#")
    if len(text) != 6:
        raise ValueError(f"색은 #RRGGBB 형식이어야 해요: {text!r}")
    return tuple(int(text[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def guess_key_color(rgb: np.ndarray) -> tuple[int, int, int]:
    """테두리 픽셀의 중앙값을 배경색으로 본다."""
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    return tuple(int(v) for v in np.median(border, axis=0))  # type: ignore[return-value]


def _chroma(rgb: np.ndarray) -> np.ndarray:
    ycrcb = cv2.cvtColor(rgb, cv2.COLOR_RGB2YCrCb).astype(np.float32)
    return ycrcb[..., 1:]


def chroma_alpha(rgb: np.ndarray, key: tuple[int, int, int], tol: float = 18.0, soft: float = 22.0) -> np.ndarray:
    """키 색과의 색상 거리로 알파를 만든다.

    색상(Cr, Cb)은 RGB의 일차식이라, 캐릭터 색과 배경색이 a:(1-a)로 섞인 픽셀의
    거리는 정확히 a × (캐릭터 색의 거리)가 된다. 그래서 가장자리 픽셀은
    가까운 '확실한 캐릭터' 픽셀들의 거리로 나눠 실제 섞인 비율을 구한다.
    """
    key_px = np.array([[key]], np.uint8)
    diff = _chroma(rgb) - _chroma(key_px)[0, 0]
    dist = np.sqrt((diff**2).sum(-1)).astype(np.float32)
    solid_at = tol + soft
    core = (dist > solid_at).astype(np.float32)
    k = 9
    local = cv2.blur(dist * core, (k, k)) / np.maximum(cv2.blur(core, (k, k)), 1e-4)
    ref = np.where(cv2.blur(core, (k, k)) > 0.01, np.maximum(local, solid_at), solid_at)
    alpha = (dist - tol) / np.maximum(ref - tol, 1e-3)
    return np.clip(alpha, 0.0, 1.0).astype(np.float32)


def despill(rgb: np.ndarray, alpha: np.ndarray, key: tuple[int, int, int]) -> np.ndarray:
    """초록/파랑 화면이 캐릭터 가장자리에 번진 색을 눌러준다."""
    out = rgb.astype(np.float32)
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    kr, kg, kb = key
    if kg >= max(kr, kb):  # 초록 배경
        limit = np.maximum(r, b)
        out[..., 1] = np.where(g > limit, limit + (g - limit) * 0.15, g)
    elif kb >= max(kr, kg):  # 파랑 배경
        limit = np.maximum(r, g)
        out[..., 2] = np.where(b > limit, limit + (b - limit) * 0.15, b)
    # 가장자리 근처(몇 픽셀 안쪽까지)만 고친다. 캐릭터 안쪽의 진짜 초록색은 건드리지 않음
    band = cv2.dilate((alpha < 0.999).astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    return np.where(band[..., None], out, rgb.astype(np.float32)).clip(0, 255).astype(np.uint8)


def refine_alpha(alpha: np.ndarray, lo: float = 0.12, hi: float = 0.88, min_island: float = 0.02) -> np.ndarray:
    """희미한 안개는 지우고 속은 꽉 채운 뒤, 떨어져 나간 작은 조각을 지운다."""
    a = np.clip((alpha - lo) / max(hi - lo, 1e-3), 0.0, 1.0)
    if min_island > 0:
        solid = (a > 0.5).astype(np.uint8)
        count, labels, stats, _ = cv2.connectedComponentsWithStats(solid, connectivity=8)
        if count > 2:
            areas = stats[1:, cv2.CC_STAT_AREA]
            keep = np.zeros(count, bool)
            keep[1:] = areas >= areas.max() * min_island
            # 남길 조각 주변의 반투명 픽셀(머리카락 끝 등)은 살리고, 버릴 조각은 통째로 지운다
            drop = (~keep[labels]) & (labels > 0)
            drop = cv2.dilate(drop.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
            kept = cv2.dilate((keep[labels] & (labels > 0)).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
            a = np.where(drop & ~kept, 0.0, a)
    return a.astype(np.float32)


def _extend(color: np.ndarray, weight: np.ndarray, radius: int) -> np.ndarray:
    """weight>0 인 곳의 색을 주변으로 번지게 해서 평균 색을 추정한다."""
    k = radius * 2 + 1
    num = cv2.blur(color * weight[..., None], (k, k))
    den = cv2.blur(weight, (k, k))[..., None]
    return num / np.maximum(den, 1e-4)


def decontaminate(rgb: np.ndarray, alpha: np.ndarray, bg: tuple[int, int, int] | None = None) -> np.ndarray:
    """반투명 가장자리 픽셀에서 배경색을 빼 캐릭터 본래 색을 추정한다.

    관측색 = a*전경 + (1-a)*배경 이므로 전경 = (관측 - (1-a)*배경) / a.
    배경색을 모르면 주변의 완전 투명 픽셀 색으로 추정한다.
    """
    edge = (alpha > 0.002) & (alpha < 0.98)
    if not edge.any():
        return rgb
    c = rgb.astype(np.float32)
    if bg is not None:
        bg_est = np.broadcast_to(np.array(bg, np.float32), c.shape)
    else:
        bg_est = _extend(c, (alpha < 0.02).astype(np.float32), 6)
    fg_solid = _extend(c, (alpha > 0.98).astype(np.float32), 6)
    a = alpha[..., None]
    fg = (c - (1.0 - a) * bg_est) / np.maximum(a, 1e-3)
    # 알파가 아주 작으면 계산이 불안정하니 안쪽 색 쪽으로 기운다
    w = np.clip(a * 2.5, 0.0, 1.0)
    fg = fg * w + fg_solid * (1.0 - w)
    out = np.where(edge[..., None], fg, c)
    return out.clip(0, 255).astype(np.uint8)


def stabilize(alphas: list[np.ndarray], agree: float = 0.08) -> list[np.ndarray]:
    """프레임마다 가장자리가 깜빡이는 걸 줄인다.

    앞뒤 프레임 값이 서로 비슷한(=움직이지 않는) 픽셀만 세 프레임 중앙값으로 바꾼다.
    움직이는 부분은 그대로 둬서 잔상이 생기지 않는다.
    """
    if len(alphas) < 3:
        return alphas
    out = [alphas[0]]
    for i in range(1, len(alphas) - 1):
        prev, cur, nxt = alphas[i - 1], alphas[i], alphas[i + 1]
        still = np.abs(prev - nxt) < agree
        med = np.median(np.stack([prev, cur, nxt]), axis=0)
        out.append(np.where(still, med, cur).astype(np.float32))
    out.append(alphas[-1])
    return out


def glow_weight(rgba: np.ndarray, hue: tuple[int, int] = (122, 168), s_min: int = 50, v_min: int = 60) -> np.ndarray:
    """픽셀이 얼마나 '보라·자홍 빛'인지 0~1. (OpenCV 색상값 0~180 기준, 빨강은 제외)"""
    hsv = cv2.cvtColor(np.ascontiguousarray(rgba[..., :3]), cv2.COLOR_RGB2HSV).astype(np.float32)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    lo, hi = hue
    hue_w = np.clip(1.0 - np.maximum(lo - h, h - hi) / 8.0, 0.0, 1.0)  # 범위 밖 8 까지 서서히
    sat_w = np.clip((s - s_min) / 50.0, 0.0, 1.0)
    val_w = np.clip((v - v_min) / 40.0, 0.0, 1.0)
    return (hue_w * sat_w * val_w * (rgba[..., 3] > 0)).astype(np.float32)


def remove_glow(rgba: np.ndarray, hue: tuple[int, int] = (122, 168), s_min: int = 50, v_min: int = 60,
                solid: float = 0.85, min_island: float = 0.02) -> np.ndarray:
    """보라색 빛(번개 이펙트)과 덜 지워진 보라 배경을 정리한다.

    - 반투명한 보라 픽셀(배경 잔여물, 가장자리 테두리)은 지운다.
    - 불투명한 보라 픽셀(옷 위에 덮인 빛)은 주변의 원래 옷 색으로 다시 칠한다.
    """
    w = glow_weight(rgba, hue, s_min, v_min)
    if not (w > 0.05).any():
        return rgba
    # 빛의 한가운데는 하얗게 타서 채도가 낮다. 흰 옷과 헷갈리지 않게,
    # 확실한 보라 빛 바로 주변에서만 기준을 낮춰 함께 잡는다.
    zone = cv2.dilate((w > 0.5).astype(np.uint8), np.ones((13, 13), np.uint8)) > 0
    relaxed = glow_weight(rgba, (hue[0] - 8, hue[1] + 10), 15, 110)
    w = np.maximum(w, np.where(zone, relaxed, 0.0)).astype(np.float32)
    rgb = rgba[..., :3].astype(np.float32)
    a = rgba[..., 3].astype(np.float32) / 255.0

    # 반투명 보라: 보라 정도만큼 투명하게
    semi = a < solid
    a = np.where(semi, a * (1.0 - w), a)

    # 불투명 보라: 보라가 아닌 단단한 주변 색으로 다시 칠함 (넓은 빛도 메우도록 반경을 넓혀가며)
    good = ((a >= solid) & (w < 0.05)).astype(np.float32)
    fill = np.zeros_like(rgb)
    filled = np.zeros(a.shape, bool)
    for radius in (4, 10, 24, 60):
        k = radius * 2 + 1
        num = cv2.blur(rgb * good[..., None], (k, k))
        den = cv2.blur(good, (k, k))
        ok = (den > 0.02) & ~filled
        fill[ok] = num[ok] / den[ok][:, None]
        filled |= ok
    target = (~semi) & filled
    strength = np.clip(w * 1.6, 0.0, 1.0)[..., None]  # 반쯤 보라여도 거의 다 원래 색으로
    rgb = np.where(target[..., None], rgb * (1 - strength) + fill * strength, rgb)

    # 남은 반투명 보라 테두리는 채도를 빼서 회색 쪽으로
    if semi.any():
        gray = rgb.mean(-1, keepdims=True)
        rgb = np.where(semi[..., None], rgb * (1 - w[..., None]) + gray * w[..., None], rgb)

    a = refine_alpha(a, 0.0, 1.0, min_island)  # 지우고 남은 작은 조각 정리
    return to_rgba(np.clip(rgb, 0, 255).astype(np.uint8), a)


def to_rgba(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    a8 = np.round(alpha * 255).astype(np.uint8)
    rgba = np.dstack([rgb, a8])
    rgba[a8 == 0, :3] = 0
    return rgba
