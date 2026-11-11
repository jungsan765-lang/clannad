"""촘촘히 보기: 화면을 0.5초마다 이 PC 에서 찍어 최근 몇 초를 작은 사진으로 들고 있는다 (비용 없음).

판단할 때(5초마다) 그 사이 장면들을 순서대로 같이 보내서, '방금 피했다·맞았다·죽었다' 같은 흐름을 놓치지 않게 한다.
자막·대화창 자리는 작은 사진으로는 글자가 안 보이니, 그 부분만 원래 크기로 잘라 '새 글이 떴을 때'만 따로 모아 둔다
(컷신 대사를 읽어야 '도박판에서 밑장 빼다 걸린 장면'을 '난장판 싸움'으로 착각하지 않는다).
전용 스레드에서 찍고, 꺼져 있을 때(active=False)는 쉬기만 한다.
"""

from __future__ import annotations

import logging
import threading
import time
from collections import deque
from dataclasses import dataclass
from typing import Callable

import numpy as np
from PIL import Image

from . import capture as cap

log = logging.getLogger("assistant.watch")


@dataclass
class Frame:
    t: float
    jpeg: bytes  # 작은 사진 (모아 보기용)
    thumb: object  # 변화 비교용
    hist: object = None  # 색 분포 (64칸) — 카메라만 돌린 건 비슷하고, 죽음·암전·섬광·장면 전환은 확 달라진다
    light: float = 0.0  # 밝기 0~1


def color_stats(img: Image.Image) -> tuple[np.ndarray, float]:
    """색 분포(빨강·초록·파랑 각 4단계 → 64칸, 합 1)와 밝기."""
    arr = np.asarray(img.convert("RGB").resize((64, 36), Image.Resampling.BILINEAR), dtype=np.uint8)
    codes = (arr[..., 0] // 64).astype(np.int32) * 16 + (arr[..., 1] // 64) * 4 + (arr[..., 2] // 64)
    hist = np.bincount(codes.ravel(), minlength=64).astype(np.float32)
    hist /= max(1.0, hist.sum())
    light = float((0.2126 * arr[..., 0] + 0.7152 * arr[..., 1] + 0.0722 * arr[..., 2]).mean() / 255.0)
    return hist, light


@dataclass
class Caption:
    t: float
    name: str  # 어느 자리 (자막·대화창 …)
    jpeg: bytes  # 원래 크기로 자른 그 자리
    mask: object  # 글자 획 자리 (같은 줄인지 비교용)
    text: str = ""  # 이 PC 글자 인식으로 읽은 글 (읽었으면 AI 에게 사진 대신 글만)


SPIKE_LEVEL = {"color": 0.35, "pixel": 0.05}  # 게임 모드에 spike_level 이 없을 때 기준 (pixel: 화면 1/5 만한 창이 떠도 걸림)
_NEAR = ((0, 1), (0, -1), (1, 0), (-1, 0), (0, 2), (0, -2), (2, 0), (-2, 0))


def _shift(a: np.ndarray, dy: int, dy_x: int) -> np.ndarray:
    """가장자리를 넘어가면 비우고 민다 (np.roll 처럼 반대편이 넘어오지 않게)."""
    out = np.zeros_like(a)
    h, w = a.shape
    ys, yd = (slice(0, h - dy), slice(dy, h)) if dy >= 0 else (slice(-dy, h), slice(0, h + dy))
    xs, xd = (slice(0, w - dy_x), slice(dy_x, w)) if dy_x >= 0 else (slice(-dy_x, w), slice(0, w + dy_x))
    out[yd, xd] = a[ys, xs]
    return out


def text_mask(img: Image.Image) -> np.ndarray:
    """글자 획처럼 보이는 자리: 아주 밝은 점 바로 옆에 아주 어두운 점(테두리·그림자·대화창 바탕)이 있는 곳.
    줄이면 테두리가 뭉개지니 잘라 낸 크기 그대로 본다 (한 자리 7ms 쯤)."""
    g = np.asarray(img.convert("L"), dtype=np.int16)
    bright, dark = g >= 205, g <= 70
    near_dark = np.zeros_like(dark)
    near_bright = np.zeros_like(bright)
    for dy, dx in _NEAR:
        near_dark |= _shift(dark, dy, dx)
        near_bright |= _shift(bright, dy, dx)
    return (bright & near_dark) | (dark & near_bright)


def text_score(mask: np.ndarray) -> float:
    """글자가 있을 법한 정도: 획이 가장 많은 가로줄 몇 개의 평균 (글자는 가로로 줄지어 있다). 풍경은 0.005 아래, 자막은 0.1 넘게."""
    if mask.size == 0:
        return 0.0
    rows = mask.mean(axis=1)
    return float(np.sort(rows)[-6:].mean())


def _cells(m: np.ndarray, k: int = 3) -> np.ndarray:
    h, w = m.shape[0] // k * k, m.shape[1] // k * k
    return m[:h, :w].reshape(h // k, k, w // k, k).mean(axis=(1, 3)) > 0.2


def same_text(a: np.ndarray, b: np.ndarray) -> bool:
    """두 자리의 글자가 같은 줄인가 (뒤 배경이 움직여도 글자 획 자리는 그대로: 같은 줄 0.97+, 다른 줄 0.5~0.85)."""
    if a is None or b is None or a.shape != b.shape:
        return False
    pa, pb = _cells(a), _cells(b)
    union = (pa | pb).sum()
    return union == 0 or (pa & pb).sum() / union >= 0.88


def grew_from(old: np.ndarray, new: np.ndarray) -> bool:
    """한 글자씩 써지는 대사: 앞 것이 거의 다 들어 있고 글이 더 늘었다."""
    if old is None or new is None or old.shape != new.shape:
        return False
    po, pn = _cells(old), _cells(new)
    return po.sum() > 0 and pn.sum() > po.sum() and (po & pn).sum() / po.sum() >= 0.9


def event_change(a: Frame | None, b: Frame) -> float:
    """'무슨 일이 났다' 정도: 색 분포가 얼마나 달라졌나(0~1)와 밝기 차이 중 큰 쪽. 카메라 회전은 작게 나온다."""
    if a is None or a.hist is None or b.hist is None:
        return 0.0
    tv = float(np.abs(a.hist - b.hist).sum() / 2)
    return max(tv, abs(a.light - b.light) * 2)


class FrameSampler:
    def __init__(self, grab: Callable[[], Image.Image], interval: float = 0.5, keep_seconds: float = 90.0,
                 width: int = 480, clock: Callable[[], float] = time.monotonic, spike: float = 0.35):
        self.grab = grab
        self.interval = interval
        self.keep_seconds = keep_seconds
        self.width = width
        self.clock = clock
        self.active = False
        self._frames: deque[Frame] = deque()
        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()
        self.errors = 0
        self.spike = spike  # 0.5초 사이 색 분포·밝기가 이만큼 확 바뀌면 '무슨 일이 났다' (죽음·암전·섬광·장면 전환)
        self.spike_at: float | None = None  # 마지막으로 확 바뀐 때
        self._spikes: deque[float] = deque(maxlen=8)  # 최근 확 바뀐 때들 (너무 잦으면 그냥 정신없는 장면)
        self.spike_by = "color"  # color: 색·밝기 (1·3인칭 3D) / pixel: 그림 자체 (화면이 고정된 2D) / off: 안 봄 (리듬 게임)
        self.spike_busy = 3  # 3초 안에 이만큼 확 바뀌면 사건이 아니라 정신없는 장면 (0 이면 안 따짐)
        self.text_boxes: list[tuple[str, tuple[float, float, float, float]]] = []  # 자막·대화창 자리 (화면 비율)
        self.text_min = 0.012  # text_score 가 이보다 높아야 글자가 있다고 본다
        self._captions: deque[Caption] = deque()
        self.ocr: Callable | None = None  # 이 PC 글자 인식 (그림 → 글, 못 쓰면 None 을 돌려줌)
        self.hud = None  # 화면 정보 읽기 (watch.hud.HudReader) — 찍을 때마다 원래 크기 화면을 넘겨 준다

    def configure(self, by: str = "color", level: float = 0.0, busy: int = 3) -> None:
        """게임마다 '확 바뀜' 기준 (게임 모드의 spike·spike_level·spike_busy)."""
        by = by if by in ("color", "pixel", "off") else "color"
        with self._lock:  # 찍는 스레드가 보는 중에 바꾸므로
            self.spike_by = by
            self.spike = level if level and level > 0 else SPIKE_LEVEL.get(by, 0.35)
            self.spike_busy = max(0, int(busy))
            self._spikes.clear()

    def set_text_boxes(self, boxes: list[tuple[str, tuple[float, float, float, float]]]) -> None:
        self.text_boxes = list(boxes or [])
        with self._lock:
            self._captions.clear()

    # ------------------------------------------------------------ 켜고 끄기

    def set_active(self, on: bool) -> None:
        if on == self.active:
            return
        self.active = on
        if on and self._thread is None:
            self._thread = threading.Thread(target=self._loop, daemon=True, name="screen-sampler")
            self._thread.start()
        if not on:
            with self._lock:
                self._frames.clear()
                self._captions.clear()

    def stop(self) -> None:
        self.active = False
        self._stop.set()

    def _loop(self) -> None:
        while not self._stop.is_set():
            started = time.monotonic()
            if self.active:
                try:
                    self.capture_once()
                except Exception as exc:  # noqa: BLE001 - 한 번 못 찍어도 계속
                    self.errors += 1
                    if self.errors in (1, 10, 100):
                        log.warning("촘촘히 보기 캡처 실패 (%d번째): %r", self.errors, exc)
            self._stop.wait(max(0.05, self.interval - (time.monotonic() - started)))

    # ------------------------------------------------------------ 찍기·꺼내기

    def capture_once(self) -> Frame:
        img = self.grab()
        small = cap.shrink(img, self.width)
        hist, light = color_stats(small)
        frame = Frame(self.clock(), cap.to_jpeg(small, 70), cap.thumb(small), hist, light)
        with self._lock:
            if self._frames and self.spike_by != "off" and self._change(self._frames[-1], frame) >= self.spike:
                self._spikes.append(frame.t)
                # 3초 안에 여러 번 확 바뀌면 사건이 아니라 정신없는 장면(난전·연출)이라 바로 판단하지 않는다 (5초 박자대로)
                if not self.spike_busy or sum(1 for t in self._spikes if frame.t - t <= 3.0) < self.spike_busy:
                    self.spike_at = frame.t
            self._frames.append(frame)
            while self._frames and frame.t - self._frames[0].t > self.keep_seconds:
                self._frames.popleft()
        for name, box in self.text_boxes:
            self._read_box(img, name, box, frame.t)
        if self.hud is not None:
            try:
                self.hud.feed(img, frame.t)
            except Exception as exc:  # noqa: BLE001 - 화면 정보를 못 읽어도 찍기는 계속
                log.debug("화면 정보 읽기 실패: %r", exc)
        return frame

    def _change(self, a: Frame, b: Frame) -> float:
        if self.spike_by == "pixel":
            return cap.change_amount(a.thumb, b.thumb)
        return event_change(a, b)

    def _read_box(self, img: Image.Image, name: str, box, t: float) -> None:
        """자막·대화창 자리를 원래 크기로 잘라, 글자가 있고 바로 전 것과 다른 줄이면 모아 둔다."""
        x0, y0, x1, y1 = box
        crop = img.crop((int(x0 * img.width), int(y0 * img.height), int(x1 * img.width), int(y1 * img.height)))
        if crop.width < 40 or crop.height < 16:
            return
        if crop.width > 1100:  # 글자는 읽힐 만큼만 (자막 한 줄 ≈ 150~250 토큰)
            k = 1100 / crop.width
            crop = crop.resize((1100, max(1, round(crop.height * k))), Image.Resampling.BILINEAR)
        mask = text_mask(crop)
        if text_score(mask) < self.text_min:
            return
        with self._lock:
            last = next((c for c in reversed(self._captions) if c.name == name), None)
            if last is not None and same_text(last.mask, mask):
                return  # 같은 대사가 떠 있는 중
            grew = last is not None and last is self._captions[-1] and grew_from(last.mask, mask)
        text = ""
        if self.ocr is not None:
            try:
                got = self.ocr(crop)
            except Exception:  # noqa: BLE001 - 못 읽으면 사진으로
                got = None
            if got == "":
                return  # 글자 인식이 '글자 없음'이라고 하면 글자처럼 보였던 풍경
            text = got or ""
        caption = Caption(t, name, cap.to_jpeg(crop, 80), mask, text)
        with self._lock:
            if grew and self._captions and self._captions[-1] is last:
                self._captions.pop()  # 한 글자씩 써지는 중이면 다 써진 것만 남긴다
            self._captions.append(caption)
            while self._captions and t - self._captions[0].t > self.keep_seconds:
                self._captions.popleft()

    def captions(self, seconds: float, max_items: int = 4) -> list[tuple[str, bytes | str]]:
        """최근 새로 뜬 자막·대사 (오래된 것부터, 최대 max_items 개): [('(자막) 3.5초 전', jpeg 또는 읽은 글), …].
        이 PC 글자 인식으로 읽었으면 사진 대신 글 (AI 비용이 거의 안 듦)."""
        now = self.clock()
        with self._lock:
            items = [c for c in self._captions if now - c.t <= seconds][-max_items:]
        return [(f"({c.name}) {now - c.t:.1f}초 전", c.text or c.jpeg) for c in items]

    def latest_caption_at(self) -> float | None:
        with self._lock:
            return self._captions[-1].t if self._captions else None

    def recent(self, seconds: float) -> list[Frame]:
        now = self.clock()
        with self._lock:
            return [f for f in self._frames if now - f.t <= seconds]

    def motion(self, frames: list[Frame]) -> float:
        """그 사이 가장 크게 바뀐 정도 (장면 안 움직임)."""
        best = 0.0
        for a, b in zip(frames, frames[1:]):
            best = max(best, cap.change_amount(a.thumb, b.thumb))
        return best

    def ordered(self, frames: list[Frame], max_frames: int = 10) -> list[tuple[str, bytes]]:
        """AI 에게 보낼 순서 있는 장면들: '(1/10) 4.5초 전' … (오래된 것부터). 한 장에 붙이면 순서를 헷갈려서 따로 보낸다."""
        if len(frames) > max_frames:
            step = len(frames) / max_frames
            frames = [frames[int(i * step)] for i in range(max_frames - 1)] + [frames[-1]]
        now = self.clock()
        n = len(frames)
        return [(f"({i}/{n}) {now - f.t:.1f}초 전", f.jpeg) for i, f in enumerate(frames, 1)]

    def spread(self, back=(40.0, 30.0, 20.0, 10.0), recent_seconds: float = 5.0,
               max_frames: int = 10) -> list[tuple[str, bytes]]:
        """판단에 보낼 장면: 수십 초 전 몇 장(back 초 전 근처) + 최근 몇 초는 촘촘히. 합쳐서 max_frames 장이라 비용은 같다.
        5초만 봐서는 무슨 상황인지 모를 때가 있어서 (조금 전에 무슨 일이 있었는지)."""
        now = self.clock()
        with self._lock:
            frames = list(self._frames)
        if not frames:
            return []
        old: list[Frame] = []
        for b in sorted(back, reverse=True):
            if b <= recent_seconds:
                continue
            near = min(frames, key=lambda f: abs((now - f.t) - b))
            if abs((now - near.t) - b) <= min(4.0, b / 4) and now - near.t > recent_seconds + 0.6 \
                    and all(near is not f for f in old):
                old.append(near)
        recent = [f for f in frames if now - f.t <= recent_seconds + 0.6]
        keep = max(2, max_frames - len(old))
        if len(recent) > keep:
            step = len(recent) / keep
            recent = [recent[int(i * step)] for i in range(keep - 1)] + [recent[-1]]
        chosen = old + recent
        n = len(chosen)
        return [(f"({i}/{n}) {now - f.t:.1f}초 전", f.jpeg) for i, f in enumerate(chosen, 1)]

    def between(self, start: float, end: float | None = None, count: int = 4) -> list[Frame]:
        """start~end 사이 장면 count 장 (고르게, 마지막 포함). 맥락 담당이 지난 구간을 볼 때."""
        with self._lock:
            frames = [f for f in self._frames if f.t > start and (end is None or f.t <= end)]
        if len(frames) > count:
            step = len(frames) / count
            frames = [frames[int(i * step)] for i in range(count - 1)] + [frames[-1]]
        return frames

    def caption_texts(self, since: float) -> list[str]:
        """since 뒤로 이 PC 글자 인식으로 읽은 자막·대사."""
        with self._lock:
            return [c.text for c in self._captions if c.t > since and c.text]

    def sheet(self, frames: list[Frame], cols: int = 4, cell_width: int = 480) -> bytes | None:
        """모아 보기 한 장 (왼쪽 위부터 시간 순, 칸 아래 '-4.5s')."""
        if len(frames) < 2:
            return None
        now = self.clock()
        return cap.contact_sheet([(f.jpeg, f"-{now - f.t:.1f}s") for f in frames], cols=cols, cell_width=cell_width)
