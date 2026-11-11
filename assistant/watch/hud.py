"""화면 정보 상시 읽기: 익혀 둔 UI 자리(퀘스트 안내·알림·킬 로그·적 이름)를 이 PC 글자 인식으로 계속 읽고,
체력 막대는 길이를 재서 '크게 깎임·위험'을 바로 알아챈다 (돈 안 듦).

- 0.5초마다 찍을 때 같이 불린다. 글자 자리는 1.5초마다 바뀌었는지만 보고, 바뀌었으면 글자 인식을 뒤 스레드에서.
- 새 글에 '완료·획득·처치·레벨…' 같은 말이 있거나 체력이 확 깎이면 alert_at 을 찍어 5초를 기다리지 않고 바로 판단하게 한다.
- 막대는 채도 높은 색이 칠해진 칸의 비율을 재고, 그 게임에서 본 가장 긴 길이를 100% 로 본다 (틀릴 수 있다고 함께 적는다).
"""

from __future__ import annotations

import logging
import queue
import re
import threading
from collections import deque
from typing import Callable

import numpy as np
from PIL import Image

from . import capture as cap

log = logging.getLogger("assistant.hud")

TEXT_KINDS = ("quest", "notice", "score", "enemy")  # 글자를 읽을 자리
BAR_KINDS = ("hp", "enemy")  # 길이를 잴 막대 (적 정보 자리는 보스 체력 막대인 경우가 많음)
ALERT = re.compile(r"완료|달성|획득|처치|격파|처형|레벨|승급|사망|쓰러|전사|실패|발견|해금|보상|전설|희귀|영웅|신화|보스|"
                   r"complete|acquired|obtained|defeat|slain|level ?up|unlock|legendary|epic|rare|victory|new", re.I)


def bar_fill(img: Image.Image) -> float:
    """막대처럼 보이는 자리에서 색이 칠해진 칸의 비율 (0~1). 가운데 줄들만 본다."""
    small = img.convert("RGB").resize((200, max(4, round(img.height * 200 / max(1, img.width)))),
                                      Image.Resampling.BILINEAR)
    hsv = np.asarray(small.convert("HSV"), dtype=np.int16)
    h = hsv.shape[0]
    band = hsv[int(h * 0.3): max(int(h * 0.3) + 1, int(h * 0.7))]
    colored = (band[..., 1] > 90) & (band[..., 2] > 80)
    return float((colored.mean(axis=0) >= 0.5).mean())


class _Bar:
    def __init__(self):
        self.max_raw = 0.0
        self.raws: deque[float] = deque(maxlen=3)
        self.history: deque[tuple[float, float]] = deque(maxlen=40)  # (시각, 0~1)

    def update(self, raw: float, t: float) -> float | None:
        self.raws.append(raw)
        smooth = sorted(self.raws)[len(self.raws) // 2]
        self.max_raw = max(self.max_raw, smooth)
        if self.max_raw < 0.1:
            return None  # 아직 막대를 못 봄
        level = min(1.0, smooth / self.max_raw)
        self.history.append((t, level))
        return level

    def level(self) -> float | None:
        return self.history[-1][1] if self.history else None

    def before(self, t: float, seconds: float) -> float | None:
        old = [lv for tt, lv in self.history if t - seconds - 0.6 <= tt <= t - seconds + 0.6]
        return max(old) if old else None


class HudReader:
    def __init__(self, ocr: Callable | None, clock: Callable[[], float], every: float = 1.5):
        self.ocr = ocr  # 그림 → 글 (못 쓰면 None 을 돌려줌)
        self.clock = clock
        self.every = every
        self.regions: list[dict] = []
        self.events: deque[tuple[float, str, str]] = deque(maxlen=40)  # (시각, 자리 이름, 글)
        self.alert_at: float | None = None
        self.bars: dict[str, _Bar] = {}
        self._last_text: dict[str, str] = {}
        self._last_thumb: dict[str, object] = {}
        self._last_look: float | None = None
        self._lock = threading.Lock()
        self._jobs: queue.Queue = queue.Queue(maxsize=8)
        self._worker: threading.Thread | None = None

    def set_regions(self, regions: list[dict]) -> None:
        """게임이 바뀌거나 화면 배치를 새로 익히면."""
        self.regions = [r for r in regions or [] if r.get("kind") in TEXT_KINDS + BAR_KINDS]
        with self._lock:
            self.bars = {r["name"]: _Bar() for r in self.regions if r["kind"] in BAR_KINDS}
            self._last_text.clear()
            self._last_thumb.clear()
            self.events.clear()
            self.alert_at = None

    # ------------------------------------------------------------ 0.5초마다

    def feed(self, img: Image.Image, t: float) -> None:
        if not self.regions:
            return
        look = self._last_look is None or t - self._last_look >= self.every
        if look:
            self._last_look = t
        for r in self.regions:
            crop = _crop(img, r["box"])
            if crop is None:
                continue
            if r["kind"] in BAR_KINDS:
                self._bar(r["name"], crop, t)
            if look and r["kind"] in TEXT_KINDS and self.ocr is not None:
                th = cap.thumb(crop)
                old = self._last_thumb.get(r["name"])
                if old is not None and cap.change_amount(old, th) < 0.03:
                    continue  # 그대로
                self._last_thumb[r["name"]] = th
                self._submit(r["name"], crop, t)

    def _bar(self, name: str, crop: Image.Image, t: float) -> None:
        bar = self.bars.get(name)
        if bar is None:
            return
        before = bar.level()
        level = bar.update(bar_fill(crop), t)
        if level is None or before is None:
            return
        two_ago = bar.before(t, 2.0)
        who = "보스·적 체력" if "적" in name or "보스" in name else name
        if two_ago is not None and two_ago - level >= 0.25 and not self._recent(name, "확 깎임", t, 3):
            self._event(t, name, f"{who} 확 깎임 (약 {two_ago * 100:.0f}% → {level * 100:.0f}%)", alert=True)
        elif before > 0.2 >= level and not self._recent(name, "위험", t, 10):
            self._event(t, name, f"{who} 위험 (약 {level * 100:.0f}%)", alert=True)
        elif before > 0.03 >= level and not self._recent(name, "바닥", t, 10):
            self._event(t, name, f"{who} 바닥남 (쓰러짐·처치일 수 있음)", alert=True)

    def _recent(self, name: str, word: str, t: float, seconds: float) -> bool:
        with self._lock:
            return any(n == name and word in text and t - tt <= seconds for tt, n, text in self.events)

    def _event(self, t: float, name: str, text: str, alert: bool = False) -> None:
        with self._lock:
            self.events.append((t, name, text))
            if alert:
                self.alert_at = t

    # ------------------------------------------------------------ 글자 인식 (뒤 스레드)

    def _submit(self, name: str, crop: Image.Image, t: float) -> None:
        if self._worker is None:
            self._worker = threading.Thread(target=self._work, daemon=True, name="hud-ocr")
            self._worker.start()
        try:
            self._jobs.put_nowait((name, crop, t))
        except queue.Full:
            pass  # 밀리면 이번 건 건너뜀 (다음에 다시 바뀌었으면 읽음)

    def _work(self) -> None:
        while True:
            name, crop, t = self._jobs.get()
            self.read_now(name, crop, t)

    def read_now(self, name: str, crop: Image.Image, t: float) -> None:
        try:
            text = self.ocr(crop) if self.ocr else None
        except Exception:  # noqa: BLE001
            text = None
        text = " ".join((text or "").split())[:160]
        if not text or text == self._last_text.get(name):
            return
        self._last_text[name] = text
        self._event(t, name, text, alert=bool(ALERT.search(text)))

    # ------------------------------------------------------------ 꺼내기

    def recent(self, seconds: float = 60.0, since: float | None = None) -> list[tuple[float, str, str]]:
        now = self.clock()
        with self._lock:
            return [(t, n, x) for t, n, x in self.events if now - t <= seconds and (since is None or t > since)]

    def text(self, seconds: float = 60.0) -> str:
        now = self.clock()
        parts = [f"{n} {now - t:.0f}초 전: {x}" for t, n, x in self.recent(seconds)[-8:]]
        for name, bar in self.bars.items():
            lv = bar.level()
            if lv is not None:
                parts.append(f"{name} 지금 약 {lv * 100:.0f}%")
        if not parts:
            return ""
        return "[화면 정보 (이 PC 가 글자 인식·막대 길이로 읽은 것, 틀릴 수 있음)] " + " / ".join(parts)


def _crop(img: Image.Image, box) -> Image.Image | None:
    try:
        x0, y0, x1, y1 = (float(v) for v in box)
    except (TypeError, ValueError):
        return None
    w, h = img.size
    c = img.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
    return c if c.width >= 8 and c.height >= 4 else None
