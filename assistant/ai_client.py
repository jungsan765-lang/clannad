"""모든 Claude API 호출이 지나가는 곳. 모델을 바꿔 끼우기 쉽게 여기 하나로 모은다."""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import Any

from usage import UsageLedger

log = logging.getLogger("assistant.ai")

# 거절됐을 때 서버가 다른 모델로 다시 돌려주는 기능(fallbacks)을 받는 모델
FALLBACK_MODELS = ("claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-2", "claude-fable-5-1")
FALLBACK_BETA = "server-side-fallback-2026-07-01"
KEYRING_SERVICE = "danika-assistant"


class AIError(RuntimeError):
    """사용자에게 그대로 보여줄 수 있는 한국어 오류."""


@dataclass
class AIResult:
    data: dict | None  # 형식에 맞게 받은 JSON (거절이면 None)
    text: str
    model: str  # 실제로 답한 모델
    stop_reason: str | None
    usd: float


def resolve_api_key() -> str | None:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key:
        return key
    try:  # Windows 자격 증명 관리자 (pip install keyring 했을 때만)
        import keyring

        return keyring.get_password(KEYRING_SERVICE, "anthropic")
    except Exception:  # noqa: BLE001 - keyring 이 없거나 백엔드가 없으면 그냥 넘어감
        return None


class AIClient:
    def __init__(self, ledger: UsageLedger, timeout: float = 60.0, client: Any = None):
        self.ledger = ledger
        self.timeout = timeout
        self._client = client

    @property
    def client(self):
        if self._client is None:
            import anthropic

            key = resolve_api_key()
            if not key:
                raise AIError(
                    "API 키가 없어요. 환경 변수 ANTHROPIC_API_KEY 를 설정하거나 "
                    f"keyring 에 '{KEYRING_SERVICE}' / 'anthropic' 으로 저장해주세요."
                )
            self._client = anthropic.Anthropic(api_key=key, timeout=self.timeout, max_retries=2)
        return self._client

    def complete_json(
        self,
        *,
        model: str,
        system: list[dict],
        messages: list[dict],
        schema: dict,
        kind: str,
        max_tokens: int = 2000,
        effort: str | None = "low",
        thinking_off: bool = False,
    ) -> AIResult:
        """정해진 JSON 형식으로만 답을 받는다 (structured outputs).

        thinking_off: 생각을 끈다. Haiku 5.5 처럼 끌 수 있는 모델에서만 쓴다
        (Opus 5.5 는 끌 수 없어서 effort 로만 조절).
        """
        output_config: dict = {"format": {"type": "json_schema", "schema": schema}}
        if effort:
            output_config["effort"] = effort
        request = dict(model=model, max_tokens=max_tokens, system=system, messages=messages, output_config=output_config)
        if thinking_off:
            request["thinking"] = {"type": "disabled"}
        try:
            if model.startswith(FALLBACK_MODELS):
                response = self.client.beta.messages.create(betas=[FALLBACK_BETA], fallbacks="default", **request)
            else:
                response = self.client.messages.create(**request)
        except AIError:
            raise
        except Exception as exc:  # noqa: BLE001 - 아래에서 종류별로 한국어 메시지로 바꾼다
            raise AIError(_friendly_error(exc)) from exc

        usage = _usage_dict(response.usage)
        served = getattr(response, "model", model) or model
        usd = self.ledger.record(served, usage, kind)
        text = next((b.text for b in response.content if getattr(b, "type", "") == "text"), "")
        stop = getattr(response, "stop_reason", None)
        if stop == "refusal":
            log.warning("거절됨 (%s): %s", kind, getattr(response, "stop_details", None))
            return AIResult(None, text, served, stop, usd)
        if stop == "max_tokens":
            log.warning("max_tokens 에 걸림 (%s). max_tokens 를 늘려야 할 수 있음", kind)
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            log.warning("JSON 읽기 실패 (%s): %r", kind, text[:200])
            data = None
        return AIResult(data, text, served, stop, usd)


def _usage_dict(usage: Any) -> dict:
    keys = ("input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens")
    return {k: int(getattr(usage, k, 0) or 0) for k in keys}


def _friendly_error(exc: Exception) -> str:
    try:
        import anthropic
    except ImportError:  # pragma: no cover
        return f"API 호출 실패: {exc}"
    if isinstance(exc, anthropic.AuthenticationError):
        return "API 키가 올바르지 않아요. 키를 다시 확인해주세요."
    if isinstance(exc, anthropic.PermissionDeniedError):
        return "이 API 키로는 이 모델을 쓸 수 없어요."
    if isinstance(exc, anthropic.NotFoundError):
        return "모델 이름이 잘못됐어요. config.toml 의 모델 이름을 확인해주세요."
    if isinstance(exc, anthropic.RateLimitError):
        return "요청이 너무 많아요. 잠시 뒤에 다시 해주세요."
    if isinstance(exc, anthropic.BadRequestError):
        return f"요청 형식 오류: {getattr(exc, 'message', exc)}"
    if isinstance(exc, anthropic.APITimeoutError):
        return "응답이 너무 늦어요. 인터넷 연결을 확인해주세요."
    if isinstance(exc, anthropic.APIConnectionError):
        return "인터넷 연결을 확인해주세요."
    if isinstance(exc, anthropic.APIStatusError):
        return f"API 서버 오류({exc.status_code}). 잠시 뒤에 다시 해주세요."
    return f"API 호출 실패: {exc}"
