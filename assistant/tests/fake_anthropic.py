"""테스트용 가짜 Anthropic 클라이언트: 실제 네트워크·과금 없이 요청 모양만 확인한다."""

import json
from types import SimpleNamespace


class _Stream:
    def __init__(self, message):
        self.message = message
        text = next(b.text for b in message.content if b.type == "text")
        self.text_stream = [text[i:i + 5] for i in range(0, len(text), 5)]  # 다섯 글자씩 흘려보냄

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def get_final_message(self):
        return self.message


class _Messages:
    def __init__(self, owner, beta):
        self.owner, self.beta = owner, beta

    def stream(self, **kwargs):
        msg = self.create(**kwargs)
        self.owner.calls[-1]["streamed"] = True
        return _Stream(msg)

    def create(self, **kwargs):
        self.owner.calls.append({"beta": self.beta, **kwargs})
        reply = self.owner.replies.pop(0) if self.owner.replies else {"speak": True, "message": "네, 주인님.", "emotion": "normal"}
        stop = "end_turn"
        if reply == "REFUSAL":
            text, stop = "", "refusal"
        else:
            text = reply if isinstance(reply, str) else json.dumps(reply, ensure_ascii=False)
        return SimpleNamespace(
            content=[SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=text)],
            usage=SimpleNamespace(input_tokens=1000, output_tokens=100, cache_read_input_tokens=2000,
                                  cache_creation_input_tokens=0),
            model=kwargs["model"], stop_reason=stop, stop_details=None,
        )


class FakeAnthropic:
    def __init__(self, replies=None):
        self.calls = []
        self.replies = list(replies or [])
        self.messages = _Messages(self, False)
        self.beta = SimpleNamespace(messages=_Messages(self, True))
