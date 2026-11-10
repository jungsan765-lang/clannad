"""캐릭터의 말: 성격 파일 + 장기기억 + 최근 대화로 답을 만들고, 한국어인지 확인한다."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from ai_client import AIClient, AIError
from lorebook import LoreBook
from memory import CATEGORIES, Memory

log = logging.getLogger("assistant.companion")

EMOTIONS = ["normal", "happy", "worried", "surprised", "angry"]

ACTIONS = ["none", "organize_files", "web_search", "make_game_mode", "note_request", "pin_fact", "analyze_screen"]

REPLY_SCHEMA = {
    "type": "object",
    "properties": {
        "speak": {"type": "boolean"},
        "message": {"type": "string"},
        "emotion": {"type": "string", "enum": EMOTIONS},
        "action": {"type": "string", "enum": ACTIONS},
        "target": {"type": "string"},
    },
    "required": ["speak", "message", "emotion", "action", "target"],
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
- point 는 화면을 그대로 옮긴 말('전투 중', '영상을 보는 중')이 아니라, 주인님이 모를 만한 정보·판단·조언·생각거리여야 한다.
  그런 게 없으면 speak 는 false.
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
- 보이는 것을 그대로 읊지 않는다('전투 중이시네요', '영상을 보시네요' 금지). 주인님이 모를 만한 정보, 판단과 그 이유,
  구체적인 조언, 네 경험에서 나온 생각 중 하나를 꼭 담는다. 담을 게 없으면 speak 는 false.
- 확실히 보이지 않는 건 추측하지 않는다.
- 인물은 얼굴 생김새만으로 단정하지 않는다. 화면에 글자로 보이는 이름(파티 목록, 대화창 위 이름 등)으로 알아본다.
- 화면에 이름이 보이는 인물·장소인데 네가 모르면 지어내지 말고 action 은 "web_search", target 은 "게임 이름 + 그 이름",
  message 는 빈 문자열로 한다(조용히 찾아본 뒤 말한다). 배경지식이나 '찾아보고 알게 된 것'에 있으면 찾지 않는다."""

ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "speak": {"type": "boolean"},
        "summary": {"type": "string"},
        "situation": {"type": "string"},
        "points": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"title": {"type": "string"}, "detail": {"type": "string"}},
                "required": ["title", "detail"],
                "additionalProperties": False,
            },
        },
        "next_steps": {"type": "array", "items": {"type": "string"}},
        "emotion": {"type": "string", "enum": EMOTIONS},
    },
    "required": ["speak", "summary", "situation", "points", "next_steps", "emotion"],
    "additionalProperties": False,
}

ANALYSIS_TASK = """[분석]
첨부한 이미지들은 주인님 모니터의 최근 장면들이다(오래된 것부터, 각 이미지 앞에 몇 초 전인지 적혀 있다).
보이는 것을 읊지 말고 분석한다. 그 분야(그 게임)를 깊이 아는 사람처럼:
- situation: 지금 무슨 상황이고 흐름이 어떻게 흘러왔는지 한두 문장.
- points: 짚을 점 2~4개. title 은 짧은 제목, detail 은 화면에서 본 근거(숫자·표시·장면)와 그게 왜 중요한지.
  잘하고 있는 점이 있으면 하나는 그걸로. 게임이면 파티 구성·스탯·운용·위치·판단, 게임이 아니면 작업 방식·오류 원인·효율.
  아래에 '주인님 계정 정보'가 있으면 그 실제 숫자를 근거로 쓴다.
- next_steps: 우선순위대로 지금 할 일 1~3개, 구체적으로(무엇을, 어떻게).
- summary: 말풍선용 1~2문장. 캐릭터 말투로 핵심만.
- 확실하지 않은 건 '추측'이라고 밝힌다. 화면에 근거가 없는 내용은 지어내지 않는다.
- 분석할 거리가 정말 없으면(로딩·빈 화면 등) speak 는 false."""

ANALYSIS_JUDGE = """말 거는 정도: 분석 모드. 자세히 분석할 만한 순간에만 speak=true:
결과·정산 화면, 판·전투가 막 끝났을 때, 파티·장비·스킬·성유물 화면, 눈에 띄는 실수나 위험한 상황, 오류 창, 중요한 선택지.
평범한 이동·탐험·대화·메뉴 넘기기는 false."""

MODE_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "titles": {"type": "array", "items": {"type": "string"}},
        "interval_seconds": {"type": "integer"},
        "cooldown_seconds": {"type": "integer"},
        "quiet_during_play": {"type": "boolean"},
        "review_on_result": {"type": "boolean"},
        "knowledge": {"type": "string"},
        "urgent": {"type": "string"},
        "intro": {"type": "string"},
    },
    "required": ["name", "titles", "interval_seconds", "cooldown_seconds", "quiet_during_play", "review_on_result",
                 "knowledge", "urgent", "intro"],
    "additionalProperties": False,
}

MODE_RULES = """# 할 일: 게임 모드 만들기
주인님이 자주 하는 게임의 '게임 모드'를 만든다. 게임 모드는 네가 그 게임 화면을 볼 때 쓰는 기준이다.
- name: 한국에서 부르는 짧은 게임 이름.
- titles: 창 제목에 들어 있을 만한 글자 1~3개 (한국어 이름, 원래 이름).
- interval_seconds: 화면 확인 간격 10~60. 빠른 게임일수록 짧게. cooldown_seconds: 먼저 말한 뒤 쉬는 시간 30~300.
- quiet_during_play: 리듬 게임·대전 게임처럼 플레이 중 말을 걸면 방해되면 true.
- review_on_result: 판이 끝나고 결과 화면이 있는 게임이면 true (총평).
- knowledge: 이 게임 설명과 말 걸 기준을 한국어 글머리표 6~12줄. 게임 종류, 화면에서 읽을 것(체력·자원·미니맵 등),
  자주 하는 실수와 짧은 팁, 조용히 있을 때(로딩·컷신), 한국 서버 공식 용어. 확인 안 된 건 쓰지 않는다.
- urgent: 바로 경고해야 할 위험한 상황이 있으면 한 문장(없으면 빈 문자열).
- intro: 모드를 만들었다고 주인님께 알리는 캐릭터 말투 한 문장."""

ORGANIZE_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "moves": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"file": {"type": "string"}, "folder": {"type": "string"}, "reason": {"type": "string"}},
                "required": ["file", "folder", "reason"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["summary", "moves"],
    "additionalProperties": False,
}

ORGANIZE_RULES = """# 할 일: 파일 정리안 만들기
주인님 폴더의 파일 목록(이름·크기·수정일만, 내용은 모름)을 보고, 같은 폴더 안 하위 폴더로 나눠 옮기는 정리안을 만든다.
- 하위 폴더 이름은 한국어로 짧게: 예) 사진, 영상, 음악, 문서, 표·슬라이드, 압축파일, 설치파일, 코드, 게임. 비슷한 건 한 폴더로 묶는다.
- 파일 이름에 뚜렷한 주제(프로젝트·게임 이름 등)가 여러 개 보이면 그 이름으로 묶어도 된다.
- 어디로 갈지 애매한 파일, 이미 정리돼 보이는 파일은 moves 에 넣지 않는다. 지우라는 제안은 하지 않는다.
- file 은 목록의 이름을 글자 하나 다르지 않게 그대로 쓴다. reason 은 아주 짧게(예: '사진 파일').
- summary: 캐릭터 말투로 정리안을 한두 문장 요약 (예: '사진 40개, 설치파일 12개를 나눠 두려 합니다.')."""

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

# 네가 실제로 할 수 있는 일 (이것 말고는 했다고 말하지 않는다)
- 대화, 주인님 화면을 보고 말 걸기(게임 코칭 포함), 대화 내용 기억하기.
- 파일 정리: 폴더 안 파일들을 종류별 하위 폴더로 나눠 옮기는 정리안을 만든다. 주인님이 미리보기에서 승인한 것만 옮기고, 지우지 않으며, 되돌릴 수 있다.
  주인님이 파일 정리를 부탁하면 action 은 "organize_files", target 은 폴더(다운로드·바탕화면·문서·사진·동영상·음악 중 하나, 또는 주인님이 말한 경로, 모르면 빈 문자열)로 하고,
  message 는 "정리안을 만들어서 보여드릴게요" 처럼 이제 시작한다는 말로 한다(이미 정리했다고 말하지 않는다).
- 게임 모드 만들기: 주인님이 지금 하는 게임의 모드(그 게임에 맞춘 코칭·말 걸기 기준)를 만들어 달라고 하면
  action 은 "make_game_mode", message 는 "이 게임에 맞춰 준비해 두겠습니다" 같은 시작하는 말. (자주 하는 게임은 알아서 만들기도 한다)
- 개선 요청 메모: 주인님이 "이런 기능 있었으면" 하거나, 네가 못 하는 일을 부탁하면 못 한다고 솔직히 말하고
  action 은 "note_request", target 에 바라는 기능을 한 문장으로 적는다. message 에서 개선 요청 메모에 적어 두겠다고 알린다.
- 고정 기억: 주인님이 "고정해", "항상 기억해" 하며 알려 준 것은 action 은 "pin_fact", target 에 한 문장(주어는 '주인님')으로 적는다.
  '꼭 기억할 것'에 들어가 절대 잊지 않는다.
- 화면 분석: 주인님이 지금 화면(게임 상황·파티·작업)을 자세히 분석해 달라고 하면 action 은 "analyze_screen",
  message 는 "살펴보겠습니다" 같은 짧은 말 (최근 장면들을 보고 분석 창에 자세히 정리한다).
- 그 밖의 일(프로그램 실행, 파일 삭제·이름 바꾸기, 알람, 메시지 보내기 등)은 아직 못 한다. 부탁받으면 아직 못 한다고 솔직히 말한다.
- 그 외에는 action 은 "none", target 은 빈 문자열.
- 모르는 이름(캐릭터·사람·게임·사건)이나 확실하지 않은 사실을 아는 척하거나 지어내지 않는다.
"""

SEARCH_ON = """- 인터넷 검색: 원신 캐릭터·사건, 게임 정보, 사람, 최근 소식처럼 네가 확실히 모르는 걸 물으면 찾아본다.
  action 은 "web_search", target 은 짧은 한국어 검색어(예: "원신 로노바"), message 는 "잠시만요, 찾아보겠습니다" 같은 아주 짧은 말.
  배경지식이나 '찾아보고 알게 된 것'에 이미 있으면 검색하지 않는다. 인사·잡담·감정 이야기에는 검색하지 않는다."""
SEARCH_OFF = """- 인터넷 검색은 지금 꺼져 있다. 모르는 건 모른다고 솔직히 말한다."""

SEARCH_SYSTEM = """너는 검색 담당이다. 주어진 검색어로 인터넷을 찾아보고, 질문에 답하는 데 필요한 사실만 한국어로 정리한다.
- 한국어 자료(나무위키, 공식 사이트, 인벤 등)를 먼저 본다. 게임 용어·이름은 한국 서버 공식 번역을 쓴다.
- 확인된 사실만 쓴다. 자료끼리 다르면 공식 쪽을 따르고 '(자료마다 다름)'이라고 적는다. 유출·루머는 '(미확정)'이라고 적는다.
- 글머리표 5~10줄, 전체 800자 안쪽. 인사말·서론 없이 사실만."""

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


def partial_message(buf: str) -> str | None:
    """실시간으로 받는 중인 JSON 에서 지금까지의 message 값만 꺼낸다."""
    m = re.search(r'"message"\s*:\s*"', buf)
    if not m:
        return None
    i, out = m.end(), []
    escapes = {"n": "\n", "t": "\t", '"': '"', "\\": "\\", "/": "/", "r": "", "b": "", "f": ""}
    while i < len(buf):
        c = buf[i]
        if c == '"':
            break
        if c == "\\":
            if i + 1 >= len(buf):
                break
            n = buf[i + 1]
            if n == "u":
                if i + 6 > len(buf):
                    break
                try:
                    out.append(chr(int(buf[i + 2:i + 6], 16)))
                except ValueError:
                    pass
                i += 6
                continue
            out.append(escapes.get(n, n))
            i += 2
            continue
        out.append(c)
        i += 1
    return "".join(out)


@dataclass
class Analysis:
    speak: bool
    summary: str
    situation: str = ""
    points: list = field(default_factory=list)  # [{"title", "detail"}]
    next_steps: list = field(default_factory=list)
    emotion: str = "normal"
    usd: float = 0.0
    when: str = ""
    action: str = "none"
    target: str = ""

    @property
    def message(self) -> str:  # 말풍선에는 요약
        return self.summary


@dataclass
class Reply:
    speak: bool
    message: str
    emotion: str
    usd: float = 0.0
    action: str = "none"
    target: str = ""


class Companion:
    def __init__(self, ai: AIClient, memory: Memory, persona: str | None, *, chat_model: str,
                 memory_model: str, effort: str = "low", max_tokens: int = 2000, history_turns: int = 10,
                 consolidate_every: int = 20, memory_max_chars: int = 4000, lore: str | None = None,
                 search_model: str = "claude-haiku-5-5"):
        self.ai = ai
        self.memory = memory
        self.persona = (persona or DEFAULT_PERSONA).strip()
        self.lore = (lore or "").strip()  # 배경지식 (캐릭터가 원래 아는 세계관 등)
        self.search_model = search_model
        self.can_search = True  # 모르는 건 인터넷에서 찾아보기 (설정 창)
        self.user_names: list[str] = []  # 주인님 아이디·닉네임 (설정 창, 내 PC 에만 저장)
        self.lorebook = LoreBook()  # 필요할 때 꺼내 보는 배경지식 사전
        self.extra_context = None  # 모드에 따라 화면 대사에 덧붙일 정보 (예: 원신 계정 정보). mode → 글
        self.chat_model = chat_model
        self.memory_model = memory_model
        self.effort = effort
        self.max_tokens = max_tokens
        self.fast = False  # 빠른 모드 (요금 2배). 설정 창에서 켬
        self.analysis_effort = "medium"  # 분석할 때 생각 깊이
        self.history_turns = history_turns
        self.consolidate_every = consolidate_every
        self.memory_max_chars = memory_max_chars

    @classmethod
    def read_persona(cls, path: Path | None) -> str | None:
        if path and path.is_file():
            return path.read_text(encoding="utf-8")
        return None

    def system_blocks(self) -> list[dict]:
        # 성격·배경지식(자주 안 바뀜)과 기억·찾아본 것(가끔 바뀜)을 따로 캐시해서, 기억이 바뀌어도 앞부분은 재사용
        first = RULES + (SEARCH_ON if self.can_search else SEARCH_OFF) + "\n\n" + self.persona
        if self.lore:
            first += "\n\n# 배경지식 (네가 원래 아는 것. 아는 티를 길게 내지 않고 필요할 때 자연스럽게 쓴다)\n" + self.lore
        second = ""
        pinned = self.pinned_text()
        if pinned:
            second += "# 꼭 기억할 것 (주인님이 고정해 둔 것. 절대 잊지 않는다)\n" + pinned + "\n\n"
        second += "# 기억 (네가 적어 둔 메모)\n" + self.memory.notes_text()
        known = self.memory.knowledge_text()
        if known:
            second += "\n\n# 찾아보고 알게 된 것 (예전에 검색해 둔 내용)\n" + known
        return [
            # 규칙·성격·배경지식은 거의 안 바뀌니 1시간 보관 (띄엄띄엄 말해도 다시 쓰는 비용이 안 듦)
            {"type": "text", "text": first, "cache_control": {"type": "ephemeral", "ttl": "1h"}},
            {"type": "text", "text": second, "cache_control": {"type": "ephemeral"}},
        ]

    def names_text(self) -> str:
        if not self.user_names:
            return ""
        names = ", ".join(f"'{n}'" for n in self.user_names)
        return (f"주인님의 아이디·닉네임은 {names} 이다. 화면(게임 파티·채팅·순위표·결과 화면 등)에 이 이름이 보이면 "
                "주인님 본인(주인님의 캐릭터·계정)이다.")

    def pinned_text(self) -> str:
        lines = [f"- {self.names_text()}"] if self.user_names else []
        lines += [f"- {p}" for p in self.memory.pinned]
        return "\n".join(lines)

    def reply(self, user_text: str, now: datetime | None = None, context: str | None = None,
              on_partial=None, fast: bool | None = None) -> Reply:
        """context: 지금 하는 게임과 이번 판 기록 등 (게임 중 대화가 이어지게).
        on_partial: 답을 받는 대로 지금까지의 대사를 넘겨준다 (말풍선에 바로 보여주기).
        fast: 빠른 모드 (요금 2배)."""
        now = now or datetime.now()
        stamp = now.strftime("%Y-%m-%d") + f" ({'월화수목금토일'[now.weekday()]}) " + now.strftime("%H:%M")
        content = [{"type": "text", "text": f"[지금: {stamp}]"}]
        if context:
            content.append({"type": "text", "text": context})
        notes = self.lorebook.notes_for(user_text + "\n" + (context or "")[-600:])
        if notes:
            content.append({"type": "text", "text": notes})
        content.append({"type": "text", "text": user_text})
        return self._respond(content, user_text, now, on_partial, fast)

    def search(self, query: str, question: str = "") -> tuple[str, float]:
        """인터넷 검색 → 한국어 사실 메모 (싼 모델이 찾아서 정리). 찾은 건 기억해 두고 다음엔 다시 찾지 않는다."""
        tools = [{"type": "web_search_20250305", "name": "web_search", "max_uses": 3,
                  "user_location": {"type": "approximate", "country": "KR", "timezone": "Asia/Seoul"}}]
        ask = f"검색어: {query}" + (f"\n주인님이 한 말: {question}" if question else "")
        r = self.ai.complete_text(model=self.search_model, system=[{"type": "text", "text": SEARCH_SYSTEM}],
                                  messages=[{"role": "user", "content": ask}], kind="search", tools=tools,
                                  max_tokens=2000, effort="low", thinking_off=True)
        notes = r.text.strip()[:1500]
        if notes:
            self.memory.add_knowledge(query, notes)
        return notes, r.usd

    def reply_after_search(self, query: str, notes: str, on_partial=None, fast: bool | None = None,
                           now: datetime | None = None, about_screen: bool = False) -> Reply:
        """찾아본 내용을 보고 방금 질문에 이어서 답한다 (다시 검색하지는 않음).
        about_screen: 주인님 질문이 아니라 화면에 보인 이름을 찾아본 경우."""
        now = now or datetime.now()
        if about_screen:
            how = (f"방금 주인님 화면에 보인 '{query}'를 조용히 찾아본 내용이다. 화면 속 상황에 맞게, 네 경험과 생각을 섞어 "
                   "한두 문장으로 먼저 말을 건다. 찾아봤다는 말은 하지 않는다. 쓸 만한 내용이 없으면 speak 는 false. action 은 none.")
        else:
            how = ("위 내용을 바탕으로 방금 주인님 말에 이어서 답한다. 찾아본 내용에 없는 건 지어내지 않는다. "
                   "찾지 못했으면 솔직히 말한다. action 은 none.")
        content = [{"type": "text", "text": f"[찾아본 내용: {query}]\n" + (notes or "(쓸 만한 결과를 찾지 못했다)")},
                   {"type": "text", "text": how}]
        label = f"(화면에서 본 '{query}'을 찾아보고 한 말)" if about_screen else f"(찾아본 내용을 보고 이어서 답함: {query})"
        r = self._respond(content, label, now, on_partial, fast)
        r.action, r.target = "none", ""
        return r

    def remark(self, fact: str, now: datetime | None = None) -> Reply:
        """먼저 알려 드릴 일(레진이 넘치기 직전 등)을 캐릭터 말투로 한두 문장."""
        content = [{"type": "text", "text": f"[먼저 알려 드릴 일]\n{fact}\n주인님께 캐릭터 말투로 한두 문장으로 알린다. "
                                            "speak 는 true, action 은 none."}]
        r = self._respond(content, f"(알림: {fact})", now or datetime.now(), None, None)
        r.action, r.target = "none", ""
        return r

    def _respond(self, content: list[dict], memory_text: str, now: datetime, on_partial, fast: bool | None) -> Reply:
        messages = self.memory.api_messages(self.history_turns) + [{"role": "user", "content": content}]
        fast = self.fast if fast is None else fast
        shown = {"ok": True, "last": ""}

        def stream_cb(buf: str) -> None:
            msg = partial_message(buf)
            if not msg or not shown["ok"] or msg == shown["last"]:
                return
            if not re.search(r"[가-힣]", msg) and len(msg) < 12:
                return  # 첫 몇 글자로는 한국어인지 모르니 조금 더 받아 본다 ("……" 같은 것도)
            if not is_korean(msg):
                shown["ok"] = False  # 영어로 나오기 시작하면 보여주지 않는다 (끝나고 한국어로 다시 받음)
                return
            shown["last"] = msg
            on_partial(msg)

        data, total = self._ask(messages, on_text=stream_cb if on_partial else None, fast=fast)
        if data and data["message"] and not is_korean(data["message"]):
            log.warning("한국어가 아닌 답: %r → 다시 요청", data["message"][:120])
            retry = messages[:-1] + [{"role": "user", "content": content + [
                {"type": "text", "text": "(방금 답에 영어가 섞였습니다. 같은 내용을 반드시 한국어로만 다시 답하십시오.)"}]}]
            data2, usd2 = self._ask(retry, fast=fast)
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
        action = data.get("action") if data.get("action") in ACTIONS else "none"
        if action == "web_search" and not self.can_search:
            action = "none"
        self.memory.add_turn(memory_text, message, now)
        return Reply(True, message, emotion, total, action, str(data.get("target", "") or ""))

    def _ask(self, messages: list[dict], on_text=None, fast: bool = False) -> tuple[dict | None, float]:
        r = self.ai.complete_json(model=self.chat_model, system=self.system_blocks(), messages=messages,
                                  schema=REPLY_SCHEMA, kind="chat", max_tokens=self.max_tokens, effort=self.effort,
                                  on_text=on_text, fast=fast)
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
              mode=None, session_notes: list[str] | None = None, chattiness: str = "normal",
              analysis: bool = False) -> dict | None:
        """싼 모델(Haiku)이 화면을 보고 말 걸 만한지 판단. thinking 은 끔."""
        recent = self.memory.spoken_lines(5)
        system = JUDGE_RULES + "\n" + (ANALYSIS_JUDGE if analysis else CHATTINESS.get(chattiness, CHATTINESS["normal"]))
        if mode is not None:
            system += "\n\n" + self._mode_text(mode, None)
        info = [f"맨 앞 창: {title or '(알 수 없음)'}"]
        if self.user_names:
            info.append(self.names_text())
        info += [
                f"마지막으로 먼저 말 건 지: {'처음' if minutes_since_spoke is None else f'{minutes_since_spoke:.0f}분 전'}",
                "최근에 먼저 한 말: " + (" / ".join(recent) if recent else "(없음)")]
        if session_notes:
            info.append("이번 판(세션) 기록: " + " / ".join(session_notes[-8:]))
        content = [self._image_block(jpeg), {"type": "text", "text": "\n".join(info)}]
        r = self.ai.complete_json(model=model, system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
                                  messages=[{"role": "user", "content": content}], schema=JUDGE_SCHEMA,
                                  kind="judge", max_tokens=400, effort="low", thinking_off=True, timeout=30)
        return r.data

    def screen_line(self, jpeg: bytes, title: str, note: dict | None, model: str | None = None,
                    question: str | None = None, now: datetime | None = None, mode=None,
                    session_notes: list[str] | None = None, review: bool = False, fast: bool | None = None) -> Reply:
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
        seen = " ".join([title or "", question or "", (note or {}).get("situation", ""), (note or {}).get("point", "")]
                        + list(session_notes or [])[-5:])
        notes = self.lorebook.notes_for(seen)
        if notes:
            lines.append(notes)
        extra = self.extra_context(mode) if self.extra_context else ""
        if extra:
            lines.append(extra)
        content = [self._image_block(jpeg), {"type": "text", "text": "\n".join(lines)}]
        messages = self.memory.api_messages(self.history_turns) + [{"role": "user", "content": content}]
        r = self.ai.complete_json(model=model or self.chat_model, system=self.system_blocks(), messages=messages,
                                  schema=REPLY_SCHEMA, kind="screen", max_tokens=self.max_tokens, effort=self.effort,
                                  fast=fast)
        data = r.data
        if data and data["speak"] and data["message"] and not is_korean(data["message"]):
            log.warning("화면 대사가 한국어가 아님 → 표시하지 않음: %r", data["message"][:120])
            data = None
        if (data and data.get("action") == "web_search" and str(data.get("target", "")).strip()
                and self.can_search and not review and not question):
            return Reply(True, "", "normal", r.usd, "web_search", str(data["target"]).strip())  # 조용히 찾아보기
        if not data or not data["speak"] or not data["message"].strip():
            return Reply(False, "", "normal", r.usd)
        emotion = data["emotion"] if data["emotion"] in EMOTIONS else "normal"
        return Reply(True, data["message"].strip(), emotion, r.usd)

    # ------------------------------------------------------------ 게임 모드 만들기

    def make_mode(self, process: str, title: str, situations: list[str] | None = None) -> tuple[dict | None, float]:
        """처음 보는 게임: 인터넷에서 찾아본 뒤 게임 모드(코칭 기준)를 만든다."""
        usd = 0.0
        notes = ""
        if self.can_search:
            notes, usd = self.search(f"{title} 게임 공략 기본", f"창 제목 '{title}', 실행 파일 {process}")
        lines = [f"실행 파일: {process}", f"창 제목: {title}"]
        if situations:
            lines.append("화면에서 본 장면:\n" + "\n".join(f"- {s}" for s in situations[-10:]))
        if notes:
            lines.append("찾아본 내용:\n" + notes)
        system = [{"type": "text", "text": self.persona + "\n\n" + MODE_RULES}]
        r = self.ai.complete_json(model=self.chat_model, system=system, messages=[{"role": "user", "content": "\n".join(lines)}],
                                  schema=MODE_SCHEMA, kind="mode", max_tokens=4000, effort="low")
        return r.data, usd + r.usd

    # ------------------------------------------------------------ 분석

    def analyze(self, frames: list[tuple[bytes, float]], title: str, mode=None, session_notes: list[str] | None = None,
                note: dict | None = None, question: str | None = None, now: datetime | None = None) -> Analysis:
        """최근 장면 여러 장(jpeg, 몇 초 전)을 보고 깊게 분석한다. 말풍선엔 summary, 분석 창엔 나머지."""
        now = now or datetime.now()
        stamp = now.strftime("%Y-%m-%d") + f" ({'월화수목금토일'[now.weekday()]}) " + now.strftime("%H:%M")
        content: list[dict] = []
        for jpeg, ago in frames:
            content.append({"type": "text", "text": "(지금 화면)" if ago < 1 else f"({ago:.0f}초 전 화면)"})
            content.append(self._image_block(jpeg))
        lines = [f"[지금: {stamp}]", ANALYSIS_TASK, f"맨 앞 창: {title or '(알 수 없음)'}"]
        if self.user_names:
            lines.append(self.names_text())
        mode_text = self._mode_text(mode, session_notes)
        if mode_text:
            lines.append(mode_text)
        if note:
            lines.append(f"판단 메모: {note.get('situation', '')} / {note.get('point', '')}")
        if question:
            lines.append(f"주인님이 분석을 부탁했다: {question} → speak 는 true.")
        seen = " ".join([title or "", question or "", (note or {}).get("situation", "")] + list(session_notes or [])[-8:])
        notes = self.lorebook.notes_for(seen)
        if notes:
            lines.append(notes)
        extra = self.extra_context(mode) if self.extra_context else ""
        if extra:
            lines.append(extra)
        content.append({"type": "text", "text": "\n".join(lines)})
        messages = self.memory.api_messages(self.history_turns) + [{"role": "user", "content": content}]
        r = self.ai.complete_json(model=self.chat_model, system=self.system_blocks(), messages=messages,
                                  schema=ANALYSIS_SCHEMA, kind="analysis", max_tokens=8000, effort=self.analysis_effort,
                                  timeout=120)
        d = r.data
        if not d or not d.get("speak") or not str(d.get("summary", "")).strip():
            return Analysis(False, "", usd=r.usd)
        texts = [d["summary"], d.get("situation", "")] + [p.get("detail", "") for p in d.get("points", [])]
        if not all(is_korean(t) for t in texts if t):
            log.warning("분석이 한국어가 아님 → 표시하지 않음")
            return Analysis(False, "", usd=r.usd)
        return Analysis(True, d["summary"].strip(), d.get("situation", "").strip(), list(d.get("points", []))[:5],
                        [str(x) for x in d.get("next_steps", [])][:4],
                        d["emotion"] if d.get("emotion") in EMOTIONS else "normal", r.usd, now.strftime("%H:%M"))

    # ------------------------------------------------------------ 파일 정리안

    def plan_organize(self, folder_label: str, files: list[dict], on_count=None) -> dict | None:
        """파일 목록(이름·크기·날짜)만 보고 하위 폴더로 나누는 정리안. on_count: 지금까지 만든 항목 수."""
        listing = "\n".join(f"{f['name']}\t{f['size_kb']}KB\t{f['modified']}" for f in files)
        system = [{"type": "text", "text": self.persona + "\n\n" + ORGANIZE_RULES, "cache_control": {"type": "ephemeral"}}]
        messages = [{"role": "user", "content": f"폴더: {folder_label}\n파일 {len(files)}개 (이름\t크기\t수정일):\n{listing}"}]

        def count(buf: str) -> None:
            if on_count:
                on_count(buf.count('"file"'))

        r = self.ai.complete_json(model=self.chat_model, system=system, messages=messages, schema=ORGANIZE_SCHEMA,
                                  kind="organize", max_tokens=32000, effort="low", on_text=count)
        return r.data

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
