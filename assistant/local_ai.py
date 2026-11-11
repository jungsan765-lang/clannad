"""내 PC AI: 남는 CPU 로 작은 AI 를 돌려 일부 담당(눈 담당·둘러보기 확대·판정)을 공짜로 한다.

- Ollama(https://ollama.com, Windows 프로그램)를 이 PC 에서 부른다. 사진·글은 이 PC 밖으로 나가지 않는다.
- 그래픽카드는 게임 몫이라 쓰지 않는다 (num_gpu=0). CPU 도 정한 만큼만(스레드 수) 쓰고, Ollama 프로세스 우선순위를
  '보통 이하'로 낮춰 게임이 늘 먼저 돌게 한다.
- 모델이 없으면 뒤에서 한 번 받는다 (gemma3:4b 약 3.3GB). 한 번에 하나씩만 돌린다.
- 느리고(사진 한 장 10~20초) 클라우드보다 눈이 나쁘니, 늦어도 되고 뒤에서 다시 확인하는 일에만 쓴다.
  실패하거나 너무 오래 걸리면 그 일은 클라우드가 한다.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import threading
import time
import urllib.error
import urllib.request
from typing import Callable

log = logging.getLogger("assistant.local")

DEFAULT_MODEL = "gemma3:4b"
EMBED_MODEL = "bge-m3"  # 기억을 뜻으로 찾기 (여러 나라 말, 한국어 됨, 약 1.2GB)
CONTEXT_MODEL = "gemma3:12b"  # 맥락 담당 (뒤에서 천천히 해도 되니 더 큰 모델, 약 8GB)
CPU_LEVELS = {"little": 4, "half": 2, "most": 1}  # 논리 코어 ÷ 이 값 (little 은 최대 4개)


def threads_for(level: str, cores: int | None = None) -> int:
    cores = cores or os.cpu_count() or 8
    if level == "most":
        return max(2, cores - 2)
    if level == "half":
        return max(2, cores // 2)
    return max(2, min(4, cores // 4))


class LocalAI:
    def __init__(self, model: str = DEFAULT_MODEL, cpu: str = "half", base_url: str = "http://127.0.0.1:11434",
                 http: Callable | None = None, clock: Callable[[], float] = time.monotonic):
        self.model = model or DEFAULT_MODEL
        self.embed_model = EMBED_MODEL
        self.context_model = CONTEXT_MODEL
        self.have: set[str] = set()  # Ollama 에 있는 모델
        self.pulling = ""  # 지금 받는 모델
        self.cpu = cpu
        self.base_url = base_url.rstrip("/")
        self.http = http or self._http
        self.clock = clock
        self.enabled = True
        self.state = "unknown"  # unknown · no_server · no_model · pulling · ready · error
        self.progress = 0.0  # 모델 받는 중 (0~1)
        self.calls = 0  # 내 PC 로 처리한 횟수 (돈 아낀 횟수)
        self.fails = 0
        self.last_seconds = 0.0
        self._lock = threading.Lock()  # 한 번에 하나씩 (CPU 를 조금만)
        self._checking = False
        self._waiting = 0  # 급한 일(눈 담당 등)이 기다리는 수
        self._embed_lock = threading.Lock()  # 기억 검색은 따로 (작은 모델이라 그림 보는 일을 기다리지 않게)
        self._opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))  # 이 PC 안이라 프록시 안 거침

    # ------------------------------------------------------------ 상태

    def embed(self, texts: list[str], background: bool = False, timeout: float = 8.0):
        """기억 검색용 뜻 좌표 (texts 하나마다 숫자 묶음). 못 하면 None.
        background: 쌓인 기억을 뒤에서 색인할 때 — 다른 일이 기다리면 건너뜀."""
        if not self.ready() or not self.has(self.embed_model) or not texts:
            return None
        lock = self._embed_lock
        if not lock.acquire(blocking=not background, timeout=timeout if not background else -1):
            return None
        try:
            body = {"model": self.embed_model, "input": list(texts), "keep_alive": "30m",
                    "options": {"num_thread": self.threads}}
            r = self.http("POST", "/api/embed", body, timeout=max(timeout, 60.0) if background else timeout)
            vecs = (r or {}).get("embeddings") or []
            return vecs if len(vecs) == len(texts) else None
        except Exception as exc:  # noqa: BLE001 - 못 하면 낱말로만 찾음
            log.debug("뜻 좌표 실패: %r", exc)
            return None
        finally:
            lock.release()

    @property
    def threads(self) -> int:
        return threads_for(self.cpu)

    def ready(self) -> bool:
        return self.enabled and self.state == "ready"

    def status_text(self) -> str:
        if not self.enabled:
            return "꺼짐"
        return {
            "unknown": "확인 중…",
            "no_server": "Ollama 가 없거나 꺼져 있어요. 설치하고 켜 두면 알아서 연결해요.",
            "no_model": f"{self.model} 을 받아야 해요.",
            "pulling": f"{self.model} 받는 중… {self.progress * 100:.0f}%",
            # 준비됨 뒤에 다른 모델(기억 검색·맥락 담당)을 받는 중이면 함께 보여 준다
            "ready": f"준비됨 — {self.model}, CPU 스레드 {self.threads}개, 지금까지 {self.calls}번 처리"
                     + (f" (마지막 {self.last_seconds:.0f}초)" if self.last_seconds else "")
                     + (f". {self.pulling} 받는 중 {self.progress * 100:.0f}%" if self.pulling and self.pulling != self.model
                        else ""),
            "error": "문제가 있어서 잠시 클라우드로 해요.",
        }.get(self.state, self.state)

    # ------------------------------------------------------------ 통신

    def _http(self, method: str, path: str, body: dict | None = None, timeout: float = 5.0, stream: bool = False):
        data = json.dumps(body).encode("utf-8") if body is not None else None
        req = urllib.request.Request(self.base_url + path, data=data, method=method,
                                     headers={"Content-Type": "application/json"})
        resp = self._opener.open(req, timeout=timeout)
        if stream:
            return (json.loads(line) for line in resp if line.strip())
        with resp:
            return json.loads(resp.read().decode("utf-8") or "{}")

    def models(self) -> list[str]:
        """받아 둘 모델: 눈 담당 등 · 기억 검색(뜻으로 찾기) · 맥락 담당."""
        out = []
        for m in (self.model, self.embed_model, self.context_model):
            if m and m not in out:
                out.append(m)
        return out

    def has(self, model: str) -> bool:
        return bool(model) and (model in self.have or (":" not in model and model + ":latest" in self.have))

    def check(self, pull: bool = True) -> str:
        """Ollama 가 켜져 있는지, 모델이 있는지. 없는 모델은 뒤에서 차례로 받는다."""
        if not self.enabled or self._checking or self.state == "pulling" or self.pulling:
            return self.state
        self._checking = True
        try:
            self.http("GET", "/api/version")
        except Exception:  # noqa: BLE001 - 안 깔렸거나 꺼져 있음
            self.state = "no_server"
            return self.state
        finally:
            self._checking = False
        try:
            tags = self.http("GET", "/api/tags") or {}
            self.have = {m.get("name", "") for m in tags.get("models", [])} | {m.get("model", "") for m in tags.get("models", [])}
        except Exception as exc:  # noqa: BLE001
            log.warning("내 PC AI 모델 목록 실패: %r", exc)
            self.state = "error"
            return self.state
        self.state = "ready" if self.has(self.model) else "no_model"
        if self.state == "ready":
            self.lower_priority()
        missing = [m for m in self.models() if not self.has(m)]
        if missing and pull:
            threading.Thread(target=self.pull_all, args=(missing,), daemon=True, name="local-ai-pull").start()
        return self.state

    def pull_all(self, models: list[str]) -> None:
        for m in models:
            self.pull(m)

    def pull(self, model: str | None = None) -> bool:
        """모델 받기 (처음 한 번, 몇 GB). 진행률은 status_text 에. 눈 담당 모델을 받는 동안만 '받는 중' 상태."""
        model = model or self.model
        main = model == self.model
        self.pulling, self.progress = model, 0.0
        if main:
            self.state = "pulling"
        try:
            for line in self.http("POST", "/api/pull", {"model": model, "stream": True}, timeout=3600, stream=True):
                if line.get("error"):
                    raise RuntimeError(line["error"])
                if line.get("total"):
                    self.progress = min(1.0, line.get("completed", 0) / max(1, line["total"]))
                if line.get("status") == "success":
                    break
            self.have.add(model)
            if main:
                self.state = "ready"
            log.info("내 PC AI 모델을 받았어요: %s", model)
            self.lower_priority()
            return True
        except Exception as exc:  # noqa: BLE001
            log.warning("내 PC AI 모델 받기 실패 (%s): %r", model, exc)
            if main:
                self.state = "error"
            return False
        finally:
            self.pulling = ""

    def lower_priority(self) -> None:
        """Ollama 프로세스를 '보통 이하' 우선순위로 (게임이 먼저)."""
        try:
            import psutil

            level = getattr(psutil, "BELOW_NORMAL_PRIORITY_CLASS", 10)
            for p in psutil.process_iter(["name"]):
                name = (p.info.get("name") or "").lower()
                if name.startswith("ollama"):
                    try:
                        if p.nice() != level:
                            p.nice(level)
                    except (psutil.Error, OSError):
                        pass
        except Exception:  # noqa: BLE001 - 못 낮춰도 동작은 함
            pass

    def chat_json(self, system: str, text: str, schema: dict, images: list[bytes] | None = None,
                  timeout: float = 45.0, max_tokens: int = 600, background: bool = False) -> dict | None:
        """작은 AI 에게 묻고 JSON 으로 받는다. 못 하면 None (그 일은 클라우드가).
        background: 뒤에서 늘 하는 일(맥락 담당) — 다른 일이 돌거나 기다리고 있으면 이번엔 건너뛴다 (급한 일이 먼저)."""
        if not self.ready():
            return None
        if background:
            if self._waiting or not self._lock.acquire(blocking=False):
                return None
        else:
            self._waiting += 1
            try:
                got = self._lock.acquire(timeout=timeout)
            finally:
                self._waiting -= 1
            if not got:
                return None  # 앞 일이 아직 안 끝남 → 이번 건 클라우드로
        started = self.clock()
        try:
            msg = {"role": "user", "content": text}
            if images:
                msg["images"] = [base64.b64encode(b).decode("ascii") for b in images]
            body = {"model": self.model, "stream": False, "format": schema, "keep_alive": "30m",
                    "messages": [{"role": "system", "content": system}, msg],
                    "options": {"num_gpu": 0, "num_thread": self.threads, "temperature": 0.2, "num_ctx": 4096,
                                "num_predict": max_tokens}}
            r = self.http("POST", "/api/chat", body, timeout=timeout)
            content = ((r or {}).get("message") or {}).get("content", "")
            data = json.loads(content)
            self.calls += 1
            self.fails = 0
            return data if isinstance(data, dict) else None
        except Exception as exc:  # noqa: BLE001 - 느리거나 꺼졌거나 이상한 답: 이번 건 클라우드로
            self.fails += 1
            if self.fails in (1, 5):
                log.warning("내 PC AI 실패 (%d번째): %r", self.fails, exc)
            if isinstance(getattr(exc, "reason", exc), ConnectionRefusedError):
                self.state = "no_server"  # Ollama 가 꺼짐 (느려서 시간이 넘은 건 그대로 둠)
            return None
        finally:
            self.last_seconds = self.clock() - started
            self._lock.release()
            if self.calls % 20 == 1:
                self.lower_priority()
