"""맥락 담당: 게임 중 내 PC AI 가 화면을 계속 지켜보며 '지금까지 흐름'을 이어 적는다 (공짜).

판단 담당은 5초마다 최근 몇 초만 보니, 조금 전에 무슨 일이 있었는지(누구와 무슨 이야기를 했는지, 왜 싸우는지)를 놓친다.
맥락 담당은 10초쯤마다(한 번에 그보다 오래 걸리면 쉬지 않고 이어서) 지난 구간 사진 몇 장과 그 사이 자막·대사 글, 이전 흐름을 받아 흐름을 고쳐 쓴다.
그 글을 판단·말하기 담당에게 붙여 준다. 작은 AI 라 틀릴 수 있다고 함께 적는다.
급한 일(눈 담당 등)이 돌거나 기다리면 이번 차례는 건너뛴다. 게임이 바뀌면 처음부터.
"""

from __future__ import annotations

import logging
import threading
import time
from collections import deque
from typing import Callable

log = logging.getLogger("assistant.context")

CONTEXT_SCHEMA = {
    "type": "object",
    "properties": {"now": {"type": "string"}, "story": {"type": "string"}},
    "required": ["now", "story"],
    "additionalProperties": False,
}

CONTEXT_TASK = """# 할 일: 맥락 담당 — 게임 흐름 이어 적기
너는 주인님 게임 화면을 계속 지켜보며 '지금까지 무슨 일이 이어지고 있는지' 적는 담당이다. 직접 말하지 않는다.
- 사진들은 지난 몇십 초를 시간 순서대로 찍은 것이다 (마지막이 지금). 그 사이 자막·대사 글도 함께 온다.
- story: '지금까지 흐름'을 이어서 고쳐 쓴다. 이전 흐름에 이번 일을 덧붙이고, 오래되고 덜 중요한 건 줄인다. 3~5문장.
  어디서 무엇을 하는 중인지, 누구와 무슨 이야기가 오갔는지, 목표·싸움이 어떻게 되어 가는지.
- now: 이번 구간에 일어난 일 한 줄 (별일 없으면 '이동 중' 처럼 짧게).
- 보이는 것과 자막만 근거로. 확실하지 않으면 '~인 듯'. 등에 멘 무기를 '들었다'고 하지 않는다. 한국어로."""


class ContextKeeper:
    def __init__(self, local, sampler, clock: Callable[[], float] = time.monotonic, every: float = 10.0,
                 shrink: Callable[[bytes, int], bytes] | None = None):
        self.local = local  # local_ai.LocalAI
        self.sampler = sampler
        self.clock = clock
        self.every = every
        self.shrink = shrink or (lambda jpeg, width: jpeg)
        self.enabled = True
        self.game = ""
        self.story = ""
        self.timeline: deque[tuple[float, str]] = deque(maxlen=30)
        self.last_at: float | None = None  # 마지막으로 본 구간 끝
        self.updated_at: float | None = None
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def reset(self, game: str = "") -> None:
        self.game, self.story, self.last_at, self.updated_at = game, "", None, None
        self.timeline.clear()

    def due(self) -> bool:
        return self.last_at is None or self.clock() - self.last_at >= self.every

    def step(self, game: str) -> bool:
        """지난 구간을 보고 흐름을 고쳐 쓴다. 했으면 True."""
        if not self.enabled or not game or self.local is None or not self.local.ready():
            return False
        if game != self.game:
            self.reset(game)
        now = self.clock()
        start = self.last_at if self.last_at is not None else now - 40
        frames = self.sampler.between(start, now, 4)
        if not frames:
            return False
        said = self.sampler.caption_texts(start)
        labels = ", ".join(f"{now - f.t:.0f}초 전" for f in frames)
        prompt = (f"게임: {game}\n이전 흐름: {self.story or '(처음 보는 중)'}\n"
                  + (f"그 사이 자막·대사: {' / '.join(said[-8:])}\n" if said else "")
                  + f"사진 {len(frames)}장 (시간 순): {labels}\n흐름을 이어 적어 줘.")
        data = self.local.chat_json(CONTEXT_TASK, prompt, CONTEXT_SCHEMA, [self.shrink(f.jpeg, 448) for f in frames],
                                    timeout=90, max_tokens=300, background=True)
        if data is None:
            return False  # 급한 일이 먼저거나 실패 → 다음 차례에 (구간은 그대로 이어서)
        self.last_at = now
        story, line = " ".join(str(data.get("story", "")).split()), " ".join(str(data.get("now", "")).split())
        if story:
            self.story = story[:700]
        if line:
            self.timeline.append((now, line[:160]))
        self.updated_at = self.clock()
        return True

    def text(self, max_age: float = 180.0) -> str:
        """판단·말하기 담당에게 붙이는 글. 오래된 흐름(3분+)은 안 붙인다."""
        if not self.story or self.updated_at is None or self.clock() - self.updated_at > max_age:
            return ""
        now = self.clock()
        recent = [f"{(now - t) / 60:.0f}분 전: {line}" if now - t >= 90 else f"{now - t:.0f}초 전: {line}"
                  for t, line in list(self.timeline)[-6:]]
        return ("[맥락 담당(내 PC 작은 AI, 틀릴 수 있음 — 사진과 맞을 때만 참고)이 지켜본 지금까지 흐름] " + self.story
                + ("\n최근 일지: " + " / ".join(recent) if recent else ""))

    # ------------------------------------------------------------ 뒤에서 계속

    def start(self, current_game: Callable[[], str | None]) -> None:
        """current_game: 지금 촘촘히 보고 있는 게임 이름 (아니면 None) — 그때만 지켜본다."""
        if self._thread is not None:
            return

        def loop():
            while not self._stop.wait(2.0):
                try:
                    game = current_game()
                    if not game:
                        continue
                    if game != self.game:
                        self.reset(game)
                    if self.due():
                        self.step(game)
                except Exception as exc:  # noqa: BLE001 - 맥락을 못 적어도 화면 보기는 계속
                    log.warning("맥락 담당 오류: %r", exc)

        self._thread = threading.Thread(target=loop, daemon=True, name="context-keeper")
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
