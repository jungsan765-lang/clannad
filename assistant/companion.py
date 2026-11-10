"""캐릭터의 말: 성격 파일 + 장기기억 + 최근 대화로 답을 만들고, 한국어인지 확인한다."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from ai_client import AIClient, AIError
from memory import CATEGORIES, Memory

log = logging.getLogger("assistant.companion")

EMOTIONS = ["normal", "happy", "worried", "surprised", "angry"]

REPLY_SCHEMA = {
    "type": "object",
    "properties": {
        "speak": {"type": "boolean"},
        "message": {"type": "string"},
        "emotion": {"type": "string", "enum": EMOTIONS},
    },
    "required": ["speak", "message", "emotion"],
    "additionalProperties": False,
}

SCENES = ["playing", "result", "menu", "loading", "cutscene", "other"]

JUDGE_SCHEMA = {
    "type": "object",
    "properties": {
        "speak": {"type": "boolean"},
        "urgent": {"type": "boolean"},
        "scene": {"type": "string", "enum": SCENES},
        "situation": {"type": "string"},
        "point": {"type": "string"},
    },
    "required": ["speak", "urgent", "scene", "situation", "point"],
    "additionalProperties": False,
}

JUDGE_RULES = """너는 바탕화면 캐릭터 비서의 '말 걸지 판단' 담당이다. 사용자의 모니터 화면을 보고, 캐릭터가 지금 먼저 한마디 할 만한지 정한다.
- 화면에서 반응할 거리를 적극적으로 찾는다: 보고 있는 영상·글·이미지의 내용, 게임 장면(위치·타이밍·판단·결과), 작업 중인 코드·문서·오류, 쇼핑·검색 중인 것, 시간대(늦은 밤 등).
- 말하지 않을 때: 로딩·빈 화면, 최근에 한 말과 같은 내용, 확실히 보이지 않아 추측해야만 하는 내용.
- situation: 지금 화면이 무엇인지 한국어 한 문장. point: 말한다면 무엇을 짚을지 한국어 한 문장(말 안 하면 빈 문자열).
- scene: playing(게임 플레이·작업 중), result(게임 결과 화면), menu(로비·메뉴·선택 화면), loading(로딩), cutscene(컷신·대화 장면), other.
- urgent: 아래 '즉시 알릴 상황'에 해당할 때만 true (그때는 speak 도 true).
- situation 은 나중에 '이번 판 기록'으로 쓰이니, 게임이면 점수·체력·결과처럼 구체적인 것을 적는다."""

CHATTINESS = {
    "quiet": "말 거는 정도: 조용히. 오류·결과 화면처럼 분명히 짚을 게 있을 때만 speak=true. 망설여지면 false.",
    "normal": "말 거는 정도: 보통. 화면에 반응할 거리가 하나라도 있으면 speak=true. 별일 없는 화면이 오래 이어져도 가끔은 짧게 한마디(근황·쉬자는 말 등).",
    "chatty": "말 거는 정도: 수다. 화면이 바뀌었으면 거의 항상 speak=true로 짧게 반응한다. 같은 내용만 반복하지 않으면 된다.",
}

SCREEN_TASK = """[화면 보고 먼저 말 걸기]
첨부한 이미지는 주인님의 모니터 화면이다. 판단 담당이 이미 '말 걸기'로 정했으니, 메모를 참고해 캐릭터답게 짧게 한마디 한다(speak 는 true).
- 게임이면 코칭: 이미 지나간 장면 기준으로 다음에 할 일 하나를 구체적으로.
- 오류 창이면 원인 한 줄과 할 일 하나. 오래 작업 중이면 쉬자고. 영상·글이면 내용에 한마디.
- 성격 파일의 '꼭 필요할 때만' 보다 이 지시가 우선한다. 다만 최근에 한 말과 똑같은 말이면 speak 는 false.
- 확실히 보이지 않는 건 추측하지 않는다."""

MEMORY_SCHEMA = {
    "type": "object",
    "properties": {
        "facts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "enum": CATEGORIES},
                    "text": {"type": "string"},
                    "date": {"type": "string"},
                },
                "required": ["category", "text", "date"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["facts"],
    "additionalProperties": False,
}

RULES = """# 응답 규칙 (가장 먼저 지킬 것)
- 모든 답은 한국어로만 쓴다. 영어 문장·영어 감탄사·영어 단어 나열을 쓰지 않는다. 고유명사·코드·파일명만 원문 그대로 둔다.
- 응답은 정해진 JSON 하나로만 한다: speak(말할지), message(할 말), emotion(표정).
- 주인님이 직접 말을 걸었으면 speak 는 true. 화면을 보고 먼저 말 거는 상황에서 할 말이 없으면 speak 는 false, message 는 빈 문자열.
- message 는 보통 1~2문장, 길어도 4문장. 말풍선에 들어갈 만큼 짧게.
- emotion 은 normal, happy, worried, surprised, angry 중 하나. 대부분 normal.
- 아래 '기억'은 네가 예전 대화에서 직접 적어 둔 메모다. 자연스럽게 활용하되 메모를 읽는 티를 내지 않는다.
- 사용자 메시지 앞의 [지금: ...] 은 현재 시각 정보다. 필요할 때만 참고한다.
"""

DEFAULT_PERSONA = """# 캐릭터
- 이름 없는 바탕화면 비서. 사용자를 "주인님"이라고 부르고 해요체로 짧고 담백하게 말한다."""

MEMORY_RULES = """# 할 일: 장기기억 정리
너는 위 캐릭터 본인이다. 주인님과의 대화를 나중에 네가 다시 읽고 바로 쓸 수 있도록, 기억 메모를 정리해 새로 쓴다.
- 기존 기억 + 새 대화를 합쳐서 '지금 기준으로 맞는' 메모 전체를 다시 쓴다. 바뀐 사실은 새 것으로 고치고, 겹치는 건 합친다.
- 남길 것: 주인님에 대한 사실(이름, 일, 일정, 건강, 사는 방식), 취향(좋아함/싫어함), 약속·할 일(날짜 포함), 의미 있는 사건, 주인님이 바라는 호칭·말투.
- 버릴 것: 인사·잡담처럼 다시 쓸 일 없는 것, 추측, 너 자신(캐릭터)의 설정.
- 메모 하나는 한국어 한 문장, 짧게. 주어는 '주인님'. 날짜는 그 일이 있었던 날(YYYY-MM-DD), 모르면 대화 날짜.
- 지난 약속·일정은 끝났으면 '최근 있었던 일'로 옮기거나 지운다.
- 전체는 {max_chars}자 안쪽. 넘으면 오래되고 덜 중요한 것부터 합치거나 뺀다.
"""

_HANGUL = re.compile(r"[\uac00-\ud7a3\u3131-\u318e]")
_LATIN = re.compile(r"[A-Za-z]")
_EN_PHRASE = re.compile(r"[A-Za-z][A-Za-z']*(?:[ ,]+[A-Za-z][A-Za-z']*)+")


def is_korean(text: str, max_latin_ratio: float = 0.3) -> bool:
    """한글이 주가 되는 글인지.

    - 영어 글자 2.5개를 한글 1음절로 쳐서 비율을 본다 (Python 같은 단어 하나는 괜찮음).
    - "Of course" 처럼 영어 단어가 두 개 이상 이어지면 안 된다.
      단, 모든 단어가 대문자로 시작하는 고유명사(Visual Studio Code)는 괜찮다.
    """
    hangul = len(_HANGUL.findall(text))
    # 대문자로 시작하는 고유명사, 코드·파일명처럼 생긴 단어는 비율 계산에서 뺀다
    plain = [w for w in re.findall(r"[A-Za-z][\w.']*", text) if not (w[0].isupper() or re.search(r"[\d_.]", w))]
    latin = sum(len(_LATIN.findall(w)) for w in plain) / 2.5
    latin_all = len(_LATIN.findall(text))
    if hangul == 0:
        return latin_all < 3  # "……" 같은 말은 괜찮고, 한글 없이 영어만 있으면 안 됨
    if latin / (hangul + latin) > max_latin_ratio:
        return False
    for phrase in _EN_PHRASE.findall(text):
        words = [w for w in re.split(r"[ ,]+", phrase) if w]
        if not all(w[0].isupper() for w in words):
            return False
    return True


@dataclass
class Reply:
    speak: bool
    message: str
    emotion: str
    usd: float = 0.0


class Companion:
    def __init__(self, ai: AIClient, memory: Memory, persona: str | None, *, chat_model: str,
                 memory_model: str, effort: str = "low", max_tokens: int = 2000, history_turns: int = 10,
                 consolidate_every: int = 20, memory_max_chars: int = 4000):
        self.ai = ai
        self.memory = memory
        self.persona = (persona or DEFAULT_PERSONA).strip()
        self.chat_model = chat_model
        self.memory_model = memory_model
        self.effort = effort
        self.max_tokens = max_tokens
        self.history_turns = history_turns
        self.consolidate_every = consolidate_every
        self.memory_max_chars = memory_max_chars

    @classmethod
    def read_persona(cls, path: Path | None) -> str | None:
        if path and path.is_file():
            return path.read_text(encoding="utf-8")
        return None

    def system_blocks(self) -> list[dict]:
        # 성격(자주 안 바뀜)과 기억(가끔 바뀜)을 따로 캐시해서, 기억이 바뀌어도 성격 부분은 재사용
        return [
            {"type": "text", "text": RULES + "\n" + self.persona, "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": "# 기억 (네가 적어 둔 메모)\n" + self.memory.notes_text(),
             "cache_control": {"type": "ephemeral"}},
        ]

    def reply(self, user_text: str, now: datetime | None = None, context: str | None = None) -> Reply:
        """context: 지금 하는 게임과 이번 판 기록 등 (게임 중 대화가 이어지게)."""
        now = now or datetime.now()
        stamp = now.strftime("%Y-%m-%d") + f" ({'월화수목금토일'[now.weekday()]}) " + now.strftime("%H:%M")
        content = [{"type": "text", "text": f"[지금: {stamp}]"}]
        if context:
            content.append({"type": "text", "text": context})
        content.append({"type": "text", "text": user_text})
        messages = self.memory.api_messages(self.history_turns) + [{"role": "user", "content": content}]
        result = self._ask(messages)
        total = result[1]
        data = result[0]
        if data and data["message"] and not is_korean(data["message"]):
            log.warning("한국어가 아닌 답: %r → 다시 요청", data["message"][:120])
            retry = messages[:-1] + [{"role": "user", "content": content + [
                {"type": "text", "text": "(방금 답에 영어가 섞였습니다. 같은 내용을 반드시 한국어로만 다시 답하십시오.)"}]}]
            data2, usd2 = self._ask(retry)
            total += usd2
            if data2 and is_korean(data2["message"]):
                data = data2
            else:
                log.warning("다시 요청해도 한국어가 아님 → 표시하지 않음")
                data = {"speak": True, "message": "……", "emotion": "normal"}
        if data is None:
            data = {"speak": True, "message": "……", "emotion": "normal"}
        message = data["message"].strip() or "……"
        emotion = data["emotion"] if data["emotion"] in EMOTIONS else "normal"
        self.memory.add_turn(user_text, message, now)
        return Reply(True, message, emotion, total)

    def _ask(self, messages: list[dict]) -> tuple[dict | None, float]:
        r = self.ai.complete_json(model=self.chat_model, system=self.system_blocks(), messages=messages,
                                  schema=REPLY_SCHEMA, kind="chat", max_tokens=self.max_tokens, effort=self.effort)
        if r.data is None:
            return None, r.usd
        return r.data, r.usd

    # ------------------------------------------------------------ 화면 보고 말 걸기

    @staticmethod
    def _image_block(jpeg: bytes) -> dict:
        import base64

        return {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                            "data": base64.b64encode(jpeg).decode("ascii")}}

    @staticmethod
    def _mode_text(mode, session_notes: list[str] | None) -> str:
        if mode is None:
            return ""
        parts = [f"## 지금 모드: {mode.name}", mode.knowledge]
        if mode.urgent:
            parts.append("## 즉시 알릴 상황\n" + mode.urgent)
        if session_notes:
            parts.append("## 이번 판(세션) 기록\n" + "\n".join(f"- {n}" for n in session_notes[-20:]))
        return "\n".join(p for p in parts if p)

    def judge(self, jpeg: bytes, title: str, model: str, minutes_since_spoke: float | None,
              mode=None, session_notes: list[str] | None = None, chattiness: str = "normal") -> dict | None:
        """싼 모델(Haiku)이 화면을 보고 말 걸 만한지 판단. thinking 은 끔."""
        recent = self.memory.spoken_lines(5)
        system = JUDGE_RULES + "\n" + CHATTINESS.get(chattiness, CHATTINESS["normal"])
        if mode is not None:
            system += "\n\n" + self._mode_text(mode, None)
        info = [f"맨 앞 창: {title or '(알 수 없음)'}",
                f"마지막으로 먼저 말 건 지: {'처음' if minutes_since_spoke is None else f'{minutes_since_spoke:.0f}분 전'}",
                "최근에 먼저 한 말: " + (" / ".join(recent) if recent else "(없음)")]
        if session_notes:
            info.append("이번 판(세션) 기록: " + " / ".join(session_notes[-8:]))
        content = [self._image_block(jpeg), {"type": "text", "text": "\n".join(info)}]
        r = self.ai.complete_json(model=model, system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
                                  messages=[{"role": "user", "content": content}], schema=JUDGE_SCHEMA,
                                  kind="judge", max_tokens=400, effort="low", thinking_off=True)
        return r.data

    def screen_line(self, jpeg: bytes, title: str, note: dict | None, model: str | None = None,
                    question: str | None = None, now: datetime | None = None, mode=None,
                    session_notes: list[str] | None = None, review: bool = False) -> Reply:
        """화면을 보고 캐릭터 말투로 한마디.

        question: 주인님이 지금 화면에 대해 물은 것. review: 결과 화면 → 이번 판 기록으로 총평.
        """
        now = now or datetime.now()
        stamp = now.strftime("%Y-%m-%d") + f" ({'월화수목금토일'[now.weekday()]}) " + now.strftime("%H:%M")
        task = SCREEN_TASK
        if review:
            task = ("[이번 판 총평]\n첨부한 이미지는 방금 끝난 판의 결과 화면이다. 결과 화면과 '이번 판 기록'을 근거로 "
                    "잘한 점 하나와 고칠 점 하나를 2~3문장으로 말한다. speak 는 true.")
        lines = [f"[지금: {stamp}]", task, f"맨 앞 창: {title or '(알 수 없음)'}"]
        mode_text = self._mode_text(mode, session_notes)
        if mode_text:
            lines.append(mode_text)
        if note and note.get("urgent"):
            lines.append("즉시 알릴 상황이다. 짧고 분명하게 경고한다. speak 는 true.")
        if note:
            lines.append(f"판단 메모: {note.get('situation', '')} / {note.get('point', '')}")
        recent = self.memory.spoken_lines(5)
        lines.append("최근에 먼저 한 말: " + (" / ".join(recent) if recent else "(없음)"))
        if question:
            lines.append(f"주인님이 지금 화면을 보고 말해 달라고 했다: {question} → speak 는 true.")
        content = [self._image_block(jpeg), {"type": "text", "text": "\n".join(lines)}]
        messages = self.memory.api_messages(self.history_turns) + [{"role": "user", "content": content}]
        r = self.ai.complete_json(model=model or self.chat_model, system=self.system_blocks(), messages=messages,
                                  schema=REPLY_SCHEMA, kind="screen", max_tokens=self.max_tokens, effort=self.effort)
        data = r.data
        if data and data["speak"] and data["message"] and not is_korean(data["message"]):
            log.warning("화면 대사가 한국어가 아님 → 표시하지 않음: %r", data["message"][:120])
            data = None
        if not data or not data["speak"] or not data["message"].strip():
            return Reply(False, "", "normal", r.usd)
        emotion = data["emotion"] if data["emotion"] in EMOTIONS else "normal"
        return Reply(True, data["message"].strip(), emotion, r.usd)

    # ------------------------------------------------------------ 장기기억 정리

    def should_consolidate(self) -> bool:
        return self.memory.needs_consolidation(self.consolidate_every)

    def consolidate(self) -> bool:
        """대기 중인 대화를 장기기억에 반영한다. 반영했으면 True."""
        consumed = len(self.memory.pending)
        if consumed == 0:
            return False
        system = [{"type": "text", "text": self.persona + "\n\n" + MEMORY_RULES.format(max_chars=self.memory_max_chars),
                   "cache_control": {"type": "ephemeral"}}]
        messages = [{"role": "user", "content": self.memory.consolidation_input()}]
        try:
            r = self.ai.complete_json(model=self.memory_model, system=system, messages=messages,
                                      schema=MEMORY_SCHEMA, kind="memory", max_tokens=8000, effort="medium")
        except AIError as exc:
            log.warning("기억 정리 실패: %s", exc)
            return False
        if not r.data:
            return False
        facts = r.data.get("facts", [])
        non_korean = [f for f in facts if not is_korean(f.get("text", ""))]
        if non_korean:
            log.warning("한국어가 아닌 기억 %d개는 버림", len(non_korean))
            facts = [f for f in facts if is_korean(f.get("text", ""))]
        self.memory.apply_consolidation(facts, consumed, self.memory_max_chars)
        return True
