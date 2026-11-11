"""캐릭터의 말: 성격 파일 + 장기기억 + 최근 대화로 답을 만들고, 한국어인지 확인한다."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from ai_client import AIClient, AIError
from lorebook import LoreBook
from memory import CATEGORIES, Memory, gap_text
from recall import cues as recall_cues

log = logging.getLogger("assistant.companion")

EMOTIONS = ["normal", "happy", "worried", "surprised", "angry"]

ACTIONS = ["none", "organize_files", "web_search", "make_game_mode", "note_request", "pin_fact", "analyze_screen",
           "read_window", "add_rule", "correct_term", "zoom_screen", "add_focus", "block_window",
           "set_reminder", "cancel_reminder", "add_todo", "done_todo", "run_program", "media", "make_recap",
           "save_clip", "set_progress"]

REPLY_SCHEMA = {
    "type": "object",
    "properties": {
        "speak": {"type": "boolean"},
        "message": {"type": "string"},
        "emotion": {"type": "string", "enum": EMOTIONS},
        "action": {"type": "string", "enum": ACTIONS},
        "target": {"type": "string"},
        "important": {"type": "boolean"},
        # 이번 말에서 오래 기억할 것 (바로 장기기억에 적는다). 없으면 빈 배열
        "remember": {"type": "array", "items": {
            "type": "object",
            "properties": {"category": {"type": "string", "enum": CATEGORIES}, "text": {"type": "string"},
                           "importance": {"type": "integer", "enum": [1, 2, 3]}, "subject": {"type": "string"}},
            "required": ["category", "text", "importance", "subject"], "additionalProperties": False}},
    },
    "required": ["speak", "message", "emotion", "action", "target", "important", "remember"],
    "additionalProperties": False,
}

SCENES = ["playing", "result", "pick", "menu", "loading", "cutscene", "other"]

JUDGE_SCHEMA = {
    "type": "object",
    "properties": {
        "speak": {"type": "boolean"},
        "urgent": {"type": "boolean"},
        "scene": {"type": "string", "enum": SCENES},
        "situation": {"type": "string"},
        "point": {"type": "string"},
        "read_box": {"type": "array", "items": {"type": "number"}},
    },
    "required": ["speak", "urgent", "scene", "situation", "point", "read_box"],
    "additionalProperties": False,
}

JUDGE_RULES = """너는 바탕화면 캐릭터의 '말 걸지 판단' 담당이다. 캐릭터는 비서이기 전에 주인님 옆에서 같이 화면을 보는 말동무다.
게임 방송 채팅창에서 시청자가 한마디 치고 싶어지는 '순간'이 왔는지를 본다.
- speak=true 인 순간: 방금 일이 벌어졌다 — 아슬아슬하게 피함·맞음, 죽음·역전·승리·패배, 보스 등장·처치, 멋진 기술·연출,
  웃긴 상황(낙사·헛손질·이상한 버그), 새 지역·멋진 경치, 감정이 실리는 스토리 장면이 막 끝남, 같은 데서 계속 막힘(공감),
  아주 오래 붙잡고 있음, 캐릭터(너)가 아는 인물·장소가 나와서 네 생각이 있음, 예전에 같이 본 일과 이어짐.
  게임 밖: 영상·글 내용에 대한 감상, 주인님이 고민하는 것, 늦은 밤 등.
- speak=false: 퀘스트 목표·안내 문구·지도 표시·거리·버튼·튜토리얼, 메뉴·인벤토리·상점·지도 화면, 로딩, 그냥 걷거나 이동하는 중,
  할 말이 '화면 글자 읽어 주기'나 '이거 하세요' 밖에 없을 때, 최근에 한 말과 비슷할 때, 확실히 안 보여서 추측해야 할 때.
- situation: 지금 화면이 무엇인지 한국어 한 문장(기록용이니 구체적으로). point: 말한다면 어떤 반응을 할지 한 문장 —
  감정(놀람·감탄·안타까움·웃음)·의견·장난·공감·질문 중 하나. 할 일 지시나 화면 글자 옮기기는 point 가 될 수 없다.
- 모드 설명의 '조언·코칭' 기준은 코칭(분석·복기)을 켰을 때만 조언 거리로 쓴다. 평소엔 반응할 순간을 고르는 참고로만.
- scene: playing(게임 플레이·작업 중), result(게임 결과 화면), pick(대전 전 캐릭터 고르는 화면·밴픽), menu(로비·메뉴),
  loading(로딩), cutscene(컷신·대화 장면), other.
- scene 이 pick 이면 situation 에 화면에 글자로 보이는 캐릭터 이름을 '아군: …/상대: …/주인님: …' 처럼 나눠 모두 적는다
  (이름 글자가 안 보이면 '안 보임'. 얼굴 그림만 보고 이름을 짐작하지 않는다).
- urgent: 아래 '즉시 알릴 상황'에 해당할 때만 true (그때는 speak 도 true).
- situation 은 나중에 '이번 판 기록'으로 쓰이니, 게임이면 점수·체력·결과처럼 구체적인 것을 적는다.
- situation 에는 화면에 글자로 보이는 핵심 이름·용어(캐릭터·지명·적 이름, 大破·進撃 같은 게임 용어)를 원문 그대로 넣는다.
  한자·일본어 일반 단어는 원문 옆 괄호에 뜻이 통하는 우리말을 붙인다(예: 南瓜(호박)). 한국어 한자음(남과)으로 옮기지 않는다.
- '지난 몇 초 흐름' 사진이 함께 오면 그걸로 방금 벌어진 일(피함·맞음·죽음·처치·연출)을 본다. 지금 화면 한 장만 보고 짐작하지 않는다.
- read_box: 말할 거리가 화면 속 작은 글씨(대사·자막·퀘스트 설명·채팅·아이템 설명 등)에 있는데 이 크기로는 읽기 어려우면,
  그 부분 위치를 [왼쪽, 위, 오른쪽, 아래] 로 적는다 (화면 전체를 0~1 로 본 비율, 예: [0.05, 0.7, 0.6, 0.95]). 아니면 빈 배열.
- 메신저(카카오톡 등) 대화가 보이면 흐름만 파악한다. 약속·일정, 주인님이 고민·질문하는 것, 도움이 될 정보가 있을 때만 speak=true.
  가벼운 수다나 남의 사적인 이야기에는 끼어들지 않는다."""

CHATTINESS = {
    "quiet": "말 거는 정도: 조용히. 큰 순간(보스 처치·승패·감정이 큰 장면·오류)에만 speak=true. 망설여지면 false.",
    "normal": "말 거는 정도: 보통. 반응하고 싶어지는 순간이 오면 speak=true. 평범한 진행 중엔 조용히. 오래 별일 없으면 가끔 근황 한마디.",
    "chatty": "말 거는 정도: 수다. 채팅창이 활발한 방송처럼 웬만한 순간마다 짧게 반응한다(그래도 화면 글자 읽기·지시는 안 함).",
}

RESULT_TASK = """[판이 끝남 — 깊게 되짚기]
첨부한 이미지는 방금 끝난 판의 결과 화면(과 그 전 장면들)이다. '이번 판(세션) 기록'과 공식 전적 자료가 있으면 함께 근거로 삼아
판 전체를 되짚는다. 시간을 들여 깊게 생각해도 된다(이미 끝난 판이라 급하지 않다).
- summary: 이 판의 승패를 가른 것 한두 문장 (말풍선에 뜬다).
- situation: 판의 흐름 (초반·중반·마지막 싸움).
- points: 잘한 점과 고칠 점을 장면·숫자 근거와 함께 (몇 분쯤, 어떤 판단이었는지).
- next_steps: 다음 판에 바로 해 볼 것 2~3개.
- 결과 화면 숫자(킬·데스·딜량 등)는 보이는 것만 쓴다. 지어내지 않는다."""

OFFICIAL_TASK = """[공식 기록으로 판 되짚기]
아래는 조금 전에 끝난 판의 공식 기록(게임사 API 의 실제 숫자, 양 팀 전원)이다. 주인님이 누구인지는 닉네임으로 기록에서 찾는다.
- 주인님 숫자(딜량·받은 피해·킬·데스·어시스트·회복·시야 등 기록에 있는 것)를 같은 팀·상대 팀과 비교해 승패를 가른 것을 찾는다.
- 양 팀 조합(픽)도 본다: 역할이 비었는지, 상대 조합에 무엇이 약했는지.
- summary: 한두 문장 (말풍선에 뜬다). points: 잘한 점·고칠 점을 숫자 근거와 함께. next_steps: 다음 판에 할 것 2~3개.
- 결과 화면을 보고 이미 짧게 총평했을 수 있으니 같은 말을 되풀이하지 말고 숫자로 더 깊게 본다.
- 숫자는 기록에 있는 것만 쓰고 지어내지 않는다. 시간을 들여 깊게 생각해도 된다."""

RECAP_TASK = """[지난 시간 정리]
아래는 이 PC 에 남은 기록(화면 기억 일지, 대화 수, 게임 공식 기록, 할 일)이다. 이것만 근거로 그 기간을 주인님과 함께 돌아본다.
- summary: 한두 문장 (말풍선에 뜬다). situation: 그 기간 흐름 (무엇을 얼마나 했는지).
- points: 눈에 띈 것들 (잘된 것, 아쉬운 것, 게임 성적 변화 등)과 근거.
- next_steps: 다음에 해 볼 것·챙길 것 2~3개 (남은 할 일, 쉬는 시간 등).
- 기록에 없는 건 지어내지 않는다. 시간은 대략이라고 말한다. 잔소리보다 정리와 격려 위주로."""

PICK_TASK = """[캐릭터 선택 화면 — 픽 조언]
첨부한 이미지는 대전 전 캐릭터 고르는 화면이다. 고를 시간이 짧으니 바로 쓸 수 있게 말한다(speak 는 true, important 는 true).
- 근거: 화면에 글자로 보이는 아군·상대 픽, 아래 '관련 배경지식'의 캐릭터 정보(역할·상성), 주인님 공식 전적(캐릭터별 판수·승률).
- 팀에 빠진 역할(앞에서 버티는 쪽, 아군을 지원하는 쪽 등. 게임에 역할군이 있으면 그 이름으로)이 있으면 그걸 채우는 쪽을 먼저 본다. 주인님이 잘하는(전적이 좋은) 캐릭터가 맞으면 그걸 추천.
- 추천 캐릭터 1~2개와 이유 한 줄. 이미 골랐으면 그 캐릭터로 이번 판에 할 일 하나(상대 픽 기준).
- 화면에서 확실히 안 보이는 픽은 짐작하지 않는다. 배경지식·전적에 없는 상성은 지어내지 않는다.
- 2~3문장, 짧게."""

SCREEN_TASK = """[화면 보고 말 걸기 — 옆에서 같이 보는 말동무]
첨부한 이미지는 주인님의 모니터 화면이다. 너는 옆에서 같이 보는 말동무다. 게임 방송 채팅창에 한마디 치듯, 지금 순간에 대한
네 반응을 짧게 한다. 판단 메모의 point 는 참고만 한다.
- 말하기 전에 속으로 먼저 생각한다: 주인님은 이 화면을 이미 보고 있다. 보이는 걸 다시 말해 주는 건 아무 의미가 없다.
  내가 보탤 수 있는 게 뭔가 — 감정(놀람·감탄·안타까움·웃음), 내 취향·의견, 장난스러운 한마디, 공감, 궁금한 걸 묻기,
  예전에 같이 본 일, 네(캐릭터) 경험·고향·아는 사람에서 나온 생각. 그런 게 없으면 speak 는 false.
- 하지 않는 것: 화면 글자·퀘스트 목표·안내·거리·수치·버튼을 읽어 주기('~하라는 안내가 떠 있네요', '438m 남았네요'),
  할 일 지시·조언('~부터 처리해 두시죠', '~하세요'), 뻔한 상황 설명('전투 중이시네요', '영상을 보시네요').
- 정보·조언은 주인님이 물었을 때만 한다(코칭·경고는 따로 부른다). 주인님이 '챙겨 봐 달라'고 한 것은 물은 것과 같다.
  진짜 위험한 순간의 짧은 경고도 해도 된다.
- 한 문장, 길어도 두 문장. 말투는 성격 파일 그대로 캐릭터답게, 분위기는 채팅처럼 가볍고 솔직하게. 같은 말버릇·감탄을 반복하지 않는다.
- 최근에 한 말과 비슷하면 speak 는 false. 성격 파일의 '꼭 필요할 때만'보다 이 지시가 우선한다.
- 확실히 보이지 않는 건 추측하지 않는다.
- 메신저(카카오톡 등) 대화가 보이면: 남의 메시지를 그대로 읽어 주지 않고, 대화 상대를 평가하지 않는다. 약속·일정을 챙기거나,
  주인님이 고민하는 것에 도움이 되는 한마디만 한다. 사적인 내용은 언급을 아낀다.
- remember: 화면에서 본 것 중 주인님에 대한 오래 기억할 일(약속·일정, 게임 목표 달성·중요한 결과)만 적는다.
  남의 메시지 내용이나 사적인 이야기는 적지 않는다. 없으면 빈 배열.
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

REVIEW_TASK = """[복기]
첨부한 이미지들은 방금 지나간 장면들이다(오래된 것부터, 각 이미지 앞에 몇 초 전인지 적혀 있다).
이미 지나간 일이니 '지금 ~하세요'가 아니라 되짚는다. 옆에서 같이 본 사람처럼, 그 분야(그 게임)를 깊이 아는 시선으로:
- situation: 방금 무슨 일이 있었는지 흐름 (몇 초 전 → 지금).
- points: 2~3개. 잘한 점 하나(있으면)와 아쉬운 판단. detail 에는 어느 장면에서 무엇이 보였는지(체력, 미니맵, 아군·적 위치, 킬 로그,
  쿨타임 표시 등) 근거와, '이때 이렇게 했으면 좋았을 것'을 구체적으로.
- next_steps: 다음에 비슷한 상황이 오면 할 것 1~2개.
- summary: 게임 화면 자막으로 띄울 한두 문장. 캐릭터 말투로. 예) '방금 그 싸움, 아군을 기다렸다 들어갔으면 이길 수 있었습니다.'
- 사진 사이에 생긴 일은 보이지 않으니 확실하지 않으면 '아마'라고 한다. 순간 조작(회피·콤보·에임)은 평가하지 않는다.
- 아래에 '주인님 … 정보/전적'이 있으면 그 실제 숫자도 근거로 쓴다.
- 짚을 만한 게 없으면 speak 는 false."""

VIDEO_SCHEMA = {
    "type": "object",
    "properties": {
        "speak": {"type": "boolean"},
        "summary": {"type": "string"},
        "overall": {"type": "string"},
        "moments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {"time": {"type": "string"}, "title": {"type": "string"}, "detail": {"type": "string"},
                               "better": {"type": "string"}},
                "required": ["time", "title", "detail", "better"],
                "additionalProperties": False,
            },
        },
        "next_steps": {"type": "array", "items": {"type": "string"}},
        "emotion": {"type": "string", "enum": EMOTIONS},
    },
    "required": ["speak", "summary", "overall", "moments", "next_steps", "emotion"],
    "additionalProperties": False,
}

VIDEO_TASK = """[영상 복기]
첨부한 이미지들은 주인님이 녹화한 게임 영상에서 일정 간격으로 뽑은 장면들이다(각 장면 앞에 영상 속 시각 m:ss).
옆에서 함께 영상을 다시 보며 복기하듯, 그 게임을 깊이 아는 시선으로:
- overall: 영상 전체 흐름 2~3문장 (무슨 판·전투였고 어떻게 흘러갔는지).
- moments: 짚을 장면 3~8개를 시간 순으로. time 은 그 장면의 영상 시각(m:ss), title 은 짧은 제목,
  detail 은 그 장면에서 보이는 근거(체력, 미니맵, 아군·적 위치, 킬 로그, 숫자), better 는 '이때 이렇게 했으면 좋았을 것'
  (잘한 장면이면 무엇이 좋았는지).
- next_steps: 다음 판에서 신경 쓸 것 1~3개, 구체적으로.
- summary: 말풍선용 1~2문장, 캐릭터 말투.
- 장면 사이에 생긴 일은 보이지 않으니 확실하지 않으면 '아마'라고 한다. 순간 조작은 평가하지 않는다. 화면에 근거 없는 건 지어내지 않는다.
- 주인님이 특히 봐 달라고 한 것이 있으면 그것부터 다룬다.
- 게임 영상이 아니거나 짚을 게 없으면 speak 는 false."""

REVIEW_JUDGE = """말 거는 정도: 복기 모드. 방금 한 장면이 마무리됐을 때만 speak=true:
교전·전투가 끝났을 때(누가 쓰러짐, 체력이 크게 깎인 뒤 물러남), 주인님 캐릭터가 쓰러짐(사망·부활 대기),
목표(타워·보스·거점 등)를 얻거나 잃음, 판·라운드가 끝남·결과 화면, 눈에 띄는 실수나 아까운 판단.
싸움이 한창일 때, 그냥 이동 중, 로딩, 메뉴는 false. situation 에는 방금 무슨 일이 있었는지 구체적으로 적는다."""

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
        "ops": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "op": {"type": "string", "enum": ["add", "update", "archive"]},
                    "id": {"type": "string"},
                    "category": {"type": "string", "enum": CATEGORIES},
                    "text": {"type": "string"},
                    "date": {"type": "string"},
                    "importance": {"type": "integer", "enum": [1, 2, 3]},
                    "subject": {"type": "string"},
                },
                "required": ["op", "id", "category", "text", "date", "importance", "subject"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["ops"],
    "additionalProperties": False,
}

RULES = """# 응답 규칙 (가장 먼저 지킬 것)
- 모든 답은 한국어로만 쓴다. 영어 문장·영어 감탄사·영어 단어 나열을 쓰지 않는다. 고유명사·코드·파일명만 원문 그대로 둔다.
- 응답은 정해진 JSON 하나로만 한다: speak(말할지), message(할 말), emotion(표정).
- 주인님이 직접 말을 걸었으면 speak 는 true. 화면을 보고 먼저 말 거는 상황에서 할 말이 없으면 speak 는 false, message 는 빈 문자열.
- message 는 보통 1~2문장, 길어도 4문장. 말풍선에 들어갈 만큼 짧게.
- 너는 비서이기 전에 주인님의 말동무다. 주인님 말에 감정·생각으로 반응하고, 가끔 되묻고, 네 이야기도 한다.
  정보·조언은 주인님이 물은 만큼만 하고, 묻지 않은 조언이나 훈계는 하지 않는다. 대답 끝에 매번 질문을 붙이지는 않는다.
- emotion 은 normal, happy, worried, surprised, angry 중 하나. 대부분 normal.
- important: 주인님이 게임 화면을 보고 있어도 자막으로 띄울 만큼 중요한 말이면 true — 위험 경고, 지금 바로 알아야 할 것,
  주인님이 직접 물은 것에 대한 답. 감상·잡담·가벼운 말은 false.
- 아래 '기억'은 네가 예전 대화에서 직접 적어 둔 메모다. 자연스럽게 활용하되 메모를 읽는 티를 내지 않는다.
- 사용자 메시지 앞의 [지금: ...] 은 현재 시각 정보다. 지난 대화 앞의 [11/10 21:30] 같은 표시는 그 말을 한 시각이다.
  "아까", "몇 시에" 같은 말이나 오랜만에 돌아왔을 때 필요하면 참고한다(시각을 일일이 읽어 주지는 않는다).

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
- 창 읽기: 주인님이 카카오톡·디스코드·메모장 같은 다른 프로그램 창(또는 '이 창')을 읽어 달라고 하면 action 은 "read_window",
  target 에 프로그램 이름(예: "카카오톡", 지금 쓰던 창이면 빈 문자열), message 는 "확인해 보겠습니다" 같은 짧은 말.
  창을 찍어서 본 뒤에 이어서 답한다. 메시지를 보내거나 창을 조작하지는 못한다.
- 화면 글씨 읽기: 주인님이 지금 화면(게임 포함)에 있는 글씨 — 채팅·외침·퀘스트·아이템 설명·알림 등 — 를 읽어 달라고 하면
  action 은 "zoom_screen", target 에 읽을 곳(예: "외침", "왼쪽 아래 채팅창"), message 는 "확대해서 볼게요" 처럼 짧게.
  화면을 줄이지 않고 원래 해상도 조각으로 나눠 찍어서 본 뒤 이어서 답한다. 다른 프로그램 창(카톡 등)은 read_window.
  글씨가 작아 안 보인다고 그냥 끝내지 말고 이걸 쓴다.
- 금지 사항: 주인님이 "앞으로 ~하지 마", "그런 얘기 하지 마", "그건 쓸데없어"처럼 하지 말라고 하면 action 은 "add_rule",
  target 은 "적용 범위: 하지 말 것" 한 문장으로 구체적으로 적는다. 적용 범위는 게임 중에 한 말이면 지금 게임 이름,
  "어디서든"·"항상"이면 "전체". 예) "칸코레: 원정 귀환 알림은 말하지 않기", "전체: 쉬라는 잔소리 하지 않기".
  방금 네가 한 말을 두고 하는 말이면 그 말의 주제를 금지 사항으로 적는다. message 는 "알겠습니다. 앞으로 그런 말은 하지 않겠습니다" 처럼 짧게.
- 프로그램 켜기: "디스코드 켜줘", "원신 실행해줘"처럼 부탁하면 action 은 "run_program", target 은 프로그램 이름 하나.
  시작 메뉴·바탕화면 바로가기에 있는 것만 켤 수 있다. 끄기·삭제는 못 한다.
- 음악·소리: "다음 곡", "멈춰", "소리 줄여", "음소거"는 action 은 "media", target 은 play_pause·next·prev·stop·vol_up·vol_down·mute 중
  하나와, 소리면 몇 단계인지(한 단계 2%, 예: "vol_down 5" = 10% 줄이기). message 는 아주 짧게.
- 진행: 주인님이 게임을 어디까지 했는지 말하면("붉은사막 5장 들어왔어", "칸코레 E3 甲 깼어") action 은 "set_progress",
  target 은 "게임 이름: 지금까지 진행·지금 목표" 한 문장. 스포일러 경계와 이어하기 한마디에 쓴다.
- 하이라이트: "방금 거 저장해줘", "클립 따줘"는 action 은 "save_clip" (녹화 프로그램의 '방금 것 저장'을 누르고 화면 몇 장을 남긴다).
- 정리: "오늘 하루 정리해줘", "이번 주 어땠어?"처럼 지난 시간을 정리해 달라면 action 은 "make_recap",
  target 은 today·yesterday·week 중 하나. message 는 "정리해 볼게요" 처럼 짧게 (기록을 모아서 이어서 정리한다).
- 알림: "30분 뒤에 알려줘", "11시에 자라고 해줘", "매일 밤 12시에 레진 쓰라고 해줘"처럼 부탁하면 action 은 "set_reminder",
  target 은 "YYYY-MM-DD HH:MM | 알릴 내용 | 반복" (반복은 없음·매일·매주). 시각은 [지금: …] 기준으로 계산한다.
  message 는 "11시에 알려 드릴게요"처럼 짧게. 알림을 취소해 달라면 "cancel_reminder", target 은 그 알림 내용의 핵심 낱말.
- 할 일: "할 일에 ○○ 적어줘", "이번 주 안에 ○○ 해야 돼"는 "add_todo", target 은 "내용 | 기한(YYYY-MM-DD, 없으면 빈칸)".
  할 일 목록에 있는 걸 끝냈다고 하면 "done_todo", target 은 그 할 일 내용.
- 챙겨 보기: 주인님이 화면을 볼 때 "이런 건 봐 줘", "레진 넘칠 것 같으면 말해 줘", "파티 구성 이상하면 짚어 줘"처럼
  챙겨 봐 달라고 하면 action 은 "add_focus", target 은 "적용 범위: 챙겨 볼 것" (범위는 add_rule 과 같은 방식).
- 아예 안 보기: "은행 사이트는 보지 마", "카톡은 아예 보지 마"처럼 그 창·프로그램을 보지(찍지) 말라고 하면
  action 은 "block_window", target 은 프로그램 이름이나 창 제목에 들어가는 말 하나 (예: "카카오톡", "국민은행").
  그런 '얘기'만 하지 말라는 것이면 add_rule, 화면을 아예 찍지 말라는 것이면 block_window.
- 말 고치기: 주인님이 네가 쓴 말·이름을 고쳐 주면("남과가 아니라 호박이야", "그거 OO 말고 XX라고 해") action 은 "correct_term",
  target 은 "틀린 말 → 맞는 말" (예: "남과 → 호박"). 다른 할 일보다 이것을 먼저 한다. message 는 고친 말을 써서 짧게 답하고,
  앞으로는 맞는 말로만 부른다.
- 그 밖의 일(프로그램 끄기, 파일 삭제·이름 바꾸기, 메시지 보내기, 결제, 게임 자동 조작 등)은 못 한다. 부탁받으면 아직 못 한다고 솔직히 말한다.
- 그 외에는 action 은 "none", target 은 빈 문자열.
- remember: 이번 주인님 말(또는 네가 한 말)에 오래 기억해야 할 게 있으면 바로 적는다. 주인님에 대한 사실·취향·약속·일정,
  주인님 주변 사람(subject 에 이름), 게임 목표·진행(subject 에 게임 이름), 주인님이 고쳐 준 것, 네가 너 자신에 대해 새로 말한 것·
  네가 한 약속(분류 '다니카 자신'). text 는 나중에 읽어도 알 수 있게 한 문장(누가·무엇·언제). importance 3 = 절대 잊으면 안 됨
  (이름·관계·약속·강한 취향·고쳐 준 것), 2 = 보통, 1 = 사소함. 이미 '기억'에 있는 그대로면 다시 적지 않는다. 없으면 빈 배열.
- 모르는 이름(캐릭터·사람·게임·사건)이나 확실하지 않은 사실을 아는 척하거나 지어내지 않는다.
- 스포 주의: 게임 스토리의 앞으로의 전개·반전·결말은 주인님이 직접 묻지 않으면 먼저 말하지 않는다(화면에 이미 나온 데까지는 괜찮다).
  직접 물었으면 '스포일러인데요' 하고 짧게 알린 뒤 답한다.
- 화면의 한자·일본어 일반 단어는 한국어 한자음으로 읽지 말고 뜻이 통하는 우리말로 옮긴다
  (예: 南瓜 → 호박, '남과' 아님 / 艦隊 → 함대). 게임 고유 용어·이름은 한국 유저가 실제로 부르는 이름으로.
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
너는 위 캐릭터 본인이다. 주인님과의 새 대화를 읽고, 나중에 네가 다시 읽고 바로 쓸 수 있도록 기억을 고친다.
기억 전체를 다시 쓰지 않는다. 바꿀 것만 ops 로 낸다 (바꿀 게 없으면 빈 배열):
- add: 새 사실 (id 는 빈 문자열). update: 기존 사실이 바뀌었거나 더 자세해졌을 때 (그 번호를 id 로, text 는 고친 전체 문장).
- archive: 더는 맞지 않거나 끝난 것(지난 약속, 바뀌기 전 사실) — 지우는 게 아니라 보관이다. 중요도 3은 약속이 아니면 보관하지 않는다.
- 이미 있는 것과 같은 내용을 다시 add 하지 않는다.
남길 것과 분류:
- 주인님 정보(이름·일·사는 곳·건강·생활), 관계·호칭(주인님이 바라는 호칭·말투, 너와의 관계), 사람(주인님 주변 사람: subject 에 그 이름),
  취향(좋아함·싫어함), 약속·할 일(날짜 포함), 게임(게임별 목표·버릇·잘하는 것: subject 에 게임 이름),
  다니카 자신(네가 너 자신에 대해 말한 것·네 의견·네가 한 약속 — 나중에 말이 어긋나지 않게), 최근 있었던 일(의미 있는 사건).
- 버릴 것: 인사·잡담, 추측, 성격 파일에 이미 있는 네 설정.
- 중요도: 3 = 절대 잊으면 안 됨(이름·관계·약속·강하게 말한 취향·주인님이 고쳐 준 것), 2 = 보통, 1 = 사소함.
- 메모 하나는 한국어 한 문장, 짧고 구체적으로(누가·무엇·언제). 주어를 분명히. 날짜는 그 일이 있었던 날(YYYY-MM-DD).
- 늘 보는 기억은 {max_chars}자 안쪽만 들어가니, 덜 중요한 건 중요도 1~2로 두면 관련 있을 때만 꺼내진다.
"""

# 화면 글자를 그대로 읽어 주는 말 ('~하라는 안내가 떠 있네요', '438m 남았네요') — 말동무 대사로는 쓰지 않는다
_NARRATION = re.compile(r"(안내|표시|알림|문구|목표|마커|메시지|아이콘)(가|이)?\s*(떠|나와|나타나|보이|있네)|떠\s?있네요|떠있네요|"
                        r"\d+\s?(m|미터)(\s|$|[.,!?을를이가는은요])|하라는\s?(안내|표시|문구)")


def narrates_screen(text: str) -> bool:
    return bool(_NARRATION.search(text or ""))


def mostly_korean(text: str) -> bool:
    """일기처럼 영어 인용('nice try', git push)이 섞일 수 있는 글: 한글이 글자의 40% 이상이면 된다."""
    hangul = len(re.findall(r"[가-힣]", text))
    latin = len(re.findall(r"[A-Za-z]", text))
    return hangul > 0 and hangul / (hangul + latin) >= 0.4


def style_reminder(persona: str, max_chars: int = 900) -> str:
    """성격 파일에서 말투·최우선 규칙 부분만 짧게 (제목에 '말투'·'최우선'·'호칭'·'말버릇'이 들어간 '## ' 절)."""
    if not persona:
        return ""
    parts = []
    for block in re.split(r"(?m)^## ", persona)[1:]:
        title, _, body = block.partition("\n")
        if any(k in title for k in ("말투", "최우선", "호칭", "말버릇")):
            parts.append(f"[{title.strip()}]\n{body.strip()}")
    text = "\n".join(parts)
    return text if len(text) <= max_chars else text[:max_chars].rsplit("\n", 1)[0]


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
    important: bool = True  # 분석·복기 요약은 게임 화면 자막으로도

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
    important: bool = False  # 게임 화면 자막으로도 띄울 만큼 중요한가


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
        self.recaller = None  # 화면 상황 글 → 이어지는 예전 일 (main 이 넣어 줌)
        self.chat_model = chat_model
        self.memory_model = memory_model
        self.effort = effort
        self.max_tokens = max_tokens
        self.fast = False  # 빠른 모드 (요금 2배). 설정 창에서 켬
        self.analysis_effort = "medium"  # 분석할 때 생각 깊이
        self.history_turns = history_turns
        self.consolidate_every = consolidate_every
        self.memory_max_chars = memory_max_chars
        memory.max_chars = memory_max_chars  # 늘 보는 기억의 글자 수
        self.last_archived: list[dict] = []
        self.last_remembered: list[dict] = []

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
        terms = self.memory.terms_text()
        if terms:
            second += terms + "\n\n"
        planner = getattr(self, "planner", None)
        plan = planner.prompt_text() if planner is not None else ""
        if plan:
            second += plan + "\n\n"
        for kind, head in (("dont", "주인님이 하지 말라고 한 것 (반드시 지킨다)"),
                           ("do", "주인님이 화면을 볼 때 챙겨 봐 달라고 한 것"),
                           ("skip", "주인님이 아예 보지 말라고 한 창·프로그램 (그 창이 앞에 있으면 화면을 찍지 않는다)")):
            rows = [r for r in self.memory.rules if r.get("kind", "dont") == kind]
            if rows:
                second += f"# {head}\n" + "\n".join(f"- [{r['scope']}] {r['text']}" for r in rows) + "\n\n"
        second += "# 기억 (네가 적어 둔 메모)\n" + self.memory.notes_text()
        known = self.memory.knowledge_text()
        if known:
            second += "\n\n# 찾아보고 알게 된 것 (예전에 검색해 둔 내용)\n" + known
        style = style_reminder(self.persona)
        if style:  # 기억이 길어져도 말투가 흐려지지 않게, 맨 끝에서 한 번 더
            second += ("\n\n# 말투 다시 확인 (성격 파일에서 — 위 기억이 아무리 길어도 이 결을 지킨다. "
                       "'다니카 자신' 기억과도 어긋나지 않게)\n" + style)
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
              on_partial=None, fast: bool | None = None, images: list[tuple[str, bytes]] | None = None) -> Reply:
        """context: 지금 하는 게임과 이번 판 기록 등 (게임 중 대화가 이어지게).
        on_partial: 답을 받는 대로 지금까지의 대사를 넘겨준다 (말풍선에 바로 보여주기).
        fast: 빠른 모드 (요금 2배)."""
        now = now or datetime.now()
        stamp = now.strftime("%Y-%m-%d") + f" ({'월화수목금토일'[now.weekday()]}) " + now.strftime("%H:%M")
        gap = gap_text(self.memory.last_time(), now)
        content = [{"type": "text", "text": f"[지금: {stamp}]" + (f" {gap}" if gap else "")}]
        if context:
            content.append({"type": "text", "text": context})
        for label, jpeg in images or []:  # 화면 기억에서 꺼낸 그때 화면
            content.append({"type": "text", "text": label})
            content.append(self._image_block(jpeg))
        related = self.memory.relevant_facts(recall_cues(user_text))
        if related:
            content.append({"type": "text", "text": "[관련 기억 (늘 보는 기억 밖에 있던 것 — 보관된 건 예전 사실일 수 있다)]\n"
                            + "\n".join(f"- {f['text']} ({f.get('date', '')}"
                                         + (", 보관됨" if f.get("status") == "archived" else "") + ")" for f in related)})
        ctx = context or ""  # 맨 앞 줄에 '[지금 하고 있는 게임: …]' 이 있어서 앞부분도 함께 (게임별 사전용)
        notes = self.lorebook.notes_for(user_text + "\n" + ctx[:200] + "\n" + ctx[-600:])
        if notes:
            content.append({"type": "text", "text": notes})
        content.append({"type": "text", "text": user_text})
        return self._respond(content, user_text, now, on_partial, fast)

    def reload_lore(self) -> None:
        """사전 폴더들을 다시 읽는다 (게임 최신 소식을 새로 받았을 때 등)."""
        self.lorebook = LoreBook.load(*getattr(self, "lore_dirs", []))

    def search(self, query: str, question: str = "", remember: bool = True) -> tuple[str, float]:
        """인터넷 검색 → 한국어 사실 메모 (싼 모델이 찾아서 정리). 찾은 건 기억해 두고 다음엔 다시 찾지 않는다."""
        tools = [{"type": "web_search_20250305", "name": "web_search", "max_uses": 3,
                  "user_location": {"type": "approximate", "country": "KR", "timezone": "Asia/Seoul"}}]
        ask = f"검색어: {query}" + (f"\n주인님이 한 말: {question}" if question else "")
        r = self.ai.complete_text(model=self.search_model, system=[{"type": "text", "text": SEARCH_SYSTEM}],
                                  messages=[{"role": "user", "content": ask}], kind="search", tools=tools,
                                  max_tokens=2000, effort="low", thinking_off=True)
        notes = r.text.strip()[:1500]
        if notes and remember:
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

    def reply_after_window(self, label: str, images: list[bytes], on_partial=None, fast: bool | None = None,
                           now: datetime | None = None) -> Reply:
        """주인님이 읽어 달라고 한 창을 찍은 사진을 보고 방금 말에 이어서 답한다."""
        now = now or datetime.now()
        content: list[dict] = []
        for i, jpeg in enumerate(images, 1):
            content.append({"type": "text", "text": f"[읽어 달라고 한 창 {i}: {label}]"})
            content.append(self._image_block(jpeg))
        if not images:
            content.append({"type": "text", "text": f"[{label} 창을 찾지 못했다(최소화돼 있거나 꺼져 있음)]"})
        content.append({"type": "text", "text": "위 창 내용을 보고 방금 주인님 말에 이어서 답한다. 내용을 길게 옮겨 적지 말고 "
                                                "물은 것에 필요한 만큼만 정리한다. 다른 사람의 대화는 주인님이 물은 만큼만 말한다. "
                                                "창을 못 찾았으면 창을 열어 두라고 짧게 말한다. action 은 none."})
        r = self._respond(content, f"(창을 읽고 답함: {label})", now, on_partial, fast)
        r.action, r.target = "none", ""
        return r

    def reply_after_zoom(self, target: str, overview: bytes, parts: list[tuple[str, bytes]], on_partial=None,
                         fast: bool | None = None, now: datetime | None = None) -> Reply:
        """화면을 원래 해상도 조각으로 나눠 찍은 것을 보고, 읽어 달라고 한 글씨를 읽어 답한다."""
        now = now or datetime.now()
        content: list[dict] = [{"type": "text", "text": "[전체 화면 (줄인 것, 위치 파악용)]"}, self._image_block(overview)]
        for name, jpeg in parts:
            content.append({"type": "text", "text": f"[원래 해상도 조각: {name}]"})
            content.append(self._image_block(jpeg))
        content.append({"type": "text", "text": (
            f"주인님이 화면에서 '{target}' 을(를) 읽어 달라고 했다. 조각들은 화면을 줄이지 않고 나눈 것이라 작은 글씨도 보인다. "
            "그 부분을 찾아 글자를 읽고 방금 주인님 말에 이어서 답한다. 채팅·외침처럼 짧은 글은 누가 뭐라고 했는지 옮기고"
            "(여러 줄이면 최근 것부터 몇 줄), 길면 요약한다. 외국어는 한국어로 옮긴다. 확실히 안 읽히는 글자는 지어내지 않는다. "
            "정말 안 보이면 어느 부분이 왜 안 보이는지 말하고 방법 하나(채팅창 키우기·배경 불투명하게)를 짧게 말한다. action 은 none.")})
        r = self._respond(content, f"(화면을 확대해서 읽고 답함: {target})", now, on_partial, fast)
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
            on_partial(self.memory.fix_words(msg))

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
        self.remember_now(data.get("remember") or [], now)
        message = self.memory.fix_words(data["message"].strip()) or "……"
        emotion = data["emotion"] if data["emotion"] in EMOTIONS else "normal"
        action = data.get("action") if data.get("action") in ACTIONS else "none"
        if action == "web_search" and not self.can_search:
            action = "none"
        self.memory.add_turn(memory_text, message, now)
        return Reply(True, message, emotion, total, action, str(data.get("target", "") or ""),
                     bool(data.get("important", False)))

    def remember_now(self, items: list, now: datetime | None = None) -> list[dict]:
        """대답과 함께 온 '오래 기억할 것'을 바로 장기기억에 적는다 (정리를 기다리지 않음)."""
        saved = []
        for it in items[:5]:
            if not isinstance(it, dict) or not is_korean(str(it.get("text", ""))):
                continue
            f = self.memory.add_fact(it.get("category", ""), self.memory.fix_words(str(it.get("text", ""))),
                                     it.get("importance", 2), str(it.get("subject", "")),
                                     (now or datetime.now()).date().isoformat(), source="remember")
            if f:
                saved.append(f)
                log.info("바로 기억함 (중요도 %s): %s", f["importance"], f["text"])
        self.last_remembered = saved
        return saved

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

    def rules_text(self, mode) -> str:
        name = getattr(mode, "name", None)
        do, dont = self.memory.rules_for(name, "do"), self.memory.rules_for(name, "dont")
        parts = []
        if do:
            parts.append("# 주인님이 챙겨 봐 달라고 한 것 (화면에 이게 보이면 꼭 짚는다 → speak=true)\n"
                         + "\n".join(f"- {r}" for r in do))
        if dont:
            parts.append("# 주인님이 하지 말라고 한 것 (이런 내용이면 speak=false. 다른 말거리가 있을 때만 말한다)\n"
                         + "\n".join(f"- {r}" for r in dont))
        return ("\n\n" + "\n\n".join(parts)) if parts else ""

    def _history_blocks(self, history: bytes | None) -> list[dict]:
        if not history:
            return []
        return [{"type": "text", "text": "(지난 몇 초 흐름 — 0.5초 간격으로 찍은 것을 왼쪽 위부터 시간 순으로 모음, 칸 아래 '-4.5s' = 4.5초 전. "
                                         "'방금' 무슨 일이 있었는지는 여기서 본다. 다음 사진이 지금 화면)"},
                self._image_block(history)]

    def _focus_blocks(self, focus: bytes | None, label: str = "") -> list[dict]:
        if not focus:
            return []
        what = label or "지금 쓰고 있는 창"
        return [{"type": "text", "text": f"({what} — 원래 크기로 확대한 것. 작은 글씨는 여기서 읽는다)"},
                self._image_block(focus)]

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
              analysis: bool = False, review: bool = False, focus: bytes | None = None,
              focus_label: str = "", history: bytes | None = None) -> dict | None:
        """싼 모델(Haiku)이 화면을 보고 말 걸 만한지 판단. thinking 은 끔.
        history: 촘촘히 보기의 '지난 몇 초 흐름' 모음 (0.5초 간격)."""
        recent = self.memory.spoken_lines(5)
        style = (REVIEW_JUDGE if review else ANALYSIS_JUDGE if analysis
                 else CHATTINESS.get(chattiness, CHATTINESS["normal"]))
        system = JUDGE_RULES + "\n" + style + self.rules_text(mode)
        if self.memory.terms:
            system += "\n\n" + self.memory.terms_text()
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
        content = self._history_blocks(history) + [self._image_block(jpeg)] + self._focus_blocks(focus, focus_label) \
            + [{"type": "text", "text": "\n".join(info)}]
        r = self.ai.complete_json(model=model, system=[{"type": "text", "text": system, "cache_control": {"type": "ephemeral"}}],
                                  messages=[{"role": "user", "content": content}], schema=JUDGE_SCHEMA,
                                  kind="judge", max_tokens=400, effort="low", thinking_off=True, timeout=20)
        data = r.data
        if data and self.memory.terms:  # 이번 판 기록에 틀린 말이 남지 않게
            for key in ("situation", "point"):
                data[key] = self.memory.fix_words(str(data.get(key, "")))
        return data

    def screen_line(self, jpeg: bytes, title: str, note: dict | None, model: str | None = None,
                    question: str | None = None, now: datetime | None = None, mode=None,
                    session_notes: list[str] | None = None, review: bool = False, fast: bool | None = None,
                    focus: bytes | None = None, focus_label: str = "", pick: bool = False,
                    history: bytes | None = None) -> Reply:
        """화면을 보고 캐릭터 말투로 한마디.

        question: 주인님이 지금 화면에 대해 물은 것. review: 결과 화면 → 이번 판 기록으로 총평.
        """
        now = now or datetime.now()
        stamp = now.strftime("%Y-%m-%d") + f" ({'월화수목금토일'[now.weekday()]}) " + now.strftime("%H:%M")
        task = PICK_TASK if pick else SCREEN_TASK
        if review:
            task = ("[이번 판 총평]\n첨부한 이미지는 방금 끝난 판의 결과 화면이다. 결과 화면과 '이번 판 기록'을 근거로 "
                    "잘한 점 하나와 고칠 점 하나를 2~3문장으로 말한다. speak 는 true.")
        lines = [f"[지금: {stamp}]", task, f"맨 앞 창: {title or '(알 수 없음)'}"]
        mode_text = self._mode_text(mode, session_notes)
        if mode_text:
            lines.append(mode_text)
        if note and note.get("urgent"):
            lines.append("즉시 알릴 상황이다. 짧고 분명하게 경고한다. speak 는 true.")
        rules = self.rules_text(mode)
        if rules:
            lines.append(rules.strip())
        if note:
            lines.append(f"판단 메모: {note.get('situation', '')} / {note.get('point', '')}")
        recent = self.memory.spoken_lines(5)
        lines.append("최근에 먼저 한 말: " + (" / ".join(recent) if recent else "(없음)"))
        if question:
            lines.append(f"주인님이 지금 화면을 보고 말해 달라고 했다: {question} → speak 는 true.")
        seen = " ".join([title or "", getattr(mode, "name", "") or "", question or "",
                         (note or {}).get("situation", ""), (note or {}).get("point", "")] + list(session_notes or [])[-5:])
        # 픽 화면: 보이는 캐릭터 8명 + 조합 원칙까지 꺼내 본다
        notes = self.lorebook.notes_for(seen, 9000, 10) if pick else self.lorebook.notes_for(seen)
        if notes:
            lines.append(notes)
        old = self.recaller(seen) if self.recaller and not pick else ""
        if old:
            lines.append(old)
        extra = self.extra_context(mode) if self.extra_context else ""
        if extra:
            lines.append(extra)
        content = self._history_blocks(history) + [self._image_block(jpeg)] + self._focus_blocks(focus, focus_label) \
            + [{"type": "text", "text": "\n".join(lines)}]
        messages = self.memory.api_messages(self.history_turns) + [{"role": "user", "content": content}]
        routine = not (pick or review or question or (note and note.get("urgent")))
        # 평범한 화면 대사는 한 번 더 생각하고(보탤 게 있는지) 말하게 effort 를 한 단계 올린다
        effort = "low" if pick else ("medium" if routine and self.effort == "low" else self.effort)
        r = self.ai.complete_json(model=model or self.chat_model, system=self.system_blocks(), messages=messages,
                                  schema=REPLY_SCHEMA, kind="pick" if pick else "screen", max_tokens=self.max_tokens,
                                  effort=effort, fast=fast)
        data = r.data
        if routine and data and data.get("speak") and narrates_screen(str(data.get("message", ""))):
            log.info("화면 글자를 읽어 주기만 하는 말이라 안 함: %r", data["message"][:80])
            return Reply(False, "", "normal", r.usd)
        if data and data["speak"] and data["message"] and not is_korean(data["message"]):
            log.warning("화면 대사가 한국어가 아님 → 표시하지 않음: %r", data["message"][:120])
            data = None
        if (data and data.get("action") == "web_search" and str(data.get("target", "")).strip()
                and self.can_search and not review and not question):
            return Reply(True, "", "normal", r.usd, "web_search", str(data["target"]).strip())  # 조용히 찾아보기
        if not data or not data["speak"] or not data["message"].strip():
            return Reply(False, "", "normal", r.usd)
        if data.get("remember"):  # 화면에서 본 주인님 일(약속·목표 달성 등)도 바로 기억 (화면 것은 중요도 2까지)
            self.remember_now([dict(x, importance=min(2, int(x.get("importance", 2) or 2)))
                               for x in data["remember"] if isinstance(x, dict)], now)
        emotion = data["emotion"] if data["emotion"] in EMOTIONS else "normal"
        important = bool(data.get("important")) or bool(note and note.get("urgent")) or review or pick
        return Reply(True, self.memory.fix_words(data["message"].strip()), emotion, r.usd, important=important)

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
                note: dict | None = None, question: str | None = None, now: datetime | None = None,
                review: bool = False, focus: bytes | None = None, focus_label: str = "", deep: bool = False) -> Analysis:
        """최근 장면 여러 장(jpeg, 몇 초 전)을 보고 깊게 분석한다. 말풍선엔 summary, 분석 창엔 나머지.
        deep: 판이 끝난 결과 화면 → 오래 생각해서 판 전체를 되짚는다 (1~2분, 조금 더 비쌈)."""
        now = now or datetime.now()
        stamp = now.strftime("%Y-%m-%d") + f" ({'월화수목금토일'[now.weekday()]}) " + now.strftime("%H:%M")
        content: list[dict] = []
        if len(frames) >= 3:  # 지난 장면들은 한 장에 모아서 (이미지 비용 몇 분의 일), 지금 화면만 크게
            past, (now_jpeg, _) = frames[:-1], frames[-1]
            from watch.capture import contact_sheet

            try:
                sheet = contact_sheet([(j, f"-{ago:.0f}s") for j, ago in past])
                content.append({"type": "text", "text": f"(지난 장면 {len(past)}개를 한 장에 모음: 1번이 가장 오래됨, "
                                                        "칸 아래 '-30s' = 30초 전)"})
                content.append(self._image_block(sheet))
            except Exception as exc:  # noqa: BLE001 - 못 모으면 따로따로
                log.warning("장면 모으기 실패: %r", exc)
                for jpeg, ago in past:
                    content.append({"type": "text", "text": f"({ago:.0f}초 전 화면)"})
                    content.append(self._image_block(jpeg))
            content.append({"type": "text", "text": "(지금 화면)"})
            content.append(self._image_block(now_jpeg))
        else:
            for jpeg, ago in frames:
                content.append({"type": "text", "text": "(지금 화면)" if ago < 1 else f"({ago:.0f}초 전 화면)"})
                content.append(self._image_block(jpeg))
        content += self._focus_blocks(focus, focus_label)
        task = RESULT_TASK if deep else REVIEW_TASK if review else ANALYSIS_TASK
        lines = [f"[지금: {stamp}]", task, f"맨 앞 창: {title or '(알 수 없음)'}"]
        rules = self.rules_text(mode)
        if rules:
            lines.append(rules.strip())
        if self.user_names:
            lines.append(self.names_text())
        mode_text = self._mode_text(mode, session_notes)
        if mode_text:
            lines.append(mode_text)
        if note:
            lines.append(f"판단 메모: {note.get('situation', '')} / {note.get('point', '')}")
        if question:
            lines.append(f"주인님이 분석을 부탁했다: {question} → speak 는 true.")
        seen = " ".join([title or "", getattr(mode, "name", "") or "", question or "", (note or {}).get("situation", "")]
                        + list(session_notes or [])[-8:])
        notes = self.lorebook.notes_for(seen)
        if notes:
            lines.append(notes)
        old = self.recaller(seen) if self.recaller else ""
        if old:
            lines.append(old)
        extra = self.extra_context(mode) if self.extra_context else ""
        if extra:
            lines.append(extra)
        content.append({"type": "text", "text": "\n".join(lines)})
        messages = self.memory.api_messages(self.history_turns) + [{"role": "user", "content": content}]
        r = self.ai.complete_json(model=self.chat_model, system=self.system_blocks(), messages=messages,
                                  schema=ANALYSIS_SCHEMA, kind="result_review" if deep else "analysis",
                                  max_tokens=16000 if deep else 8000, effort="high" if deep else self.analysis_effort,
                                  timeout=300 if deep else 120)
        d = r.data
        if not d or not d.get("speak") or not str(d.get("summary", "")).strip():
            return Analysis(False, "", usd=r.usd)
        texts = [d["summary"], d.get("situation", "")] + [p.get("detail", "") for p in d.get("points", [])]
        if not all(is_korean(t) for t in texts if t):
            log.warning("분석이 한국어가 아님 → 표시하지 않음")
            return Analysis(False, "", usd=r.usd)
        return self._fix_analysis(Analysis(
            True, d["summary"].strip(), d.get("situation", "").strip(), list(d.get("points", []))[:5],
            [str(x) for x in d.get("next_steps", [])][:4],
            d["emotion"] if d.get("emotion") in EMOTIONS else "normal", r.usd, now.strftime("%H:%M")))

    def _fix_analysis(self, a: Analysis) -> Analysis:
        """고쳐 준 말 반영 (분석 창·말풍선·자막 모두)."""
        if not self.memory.terms:
            return a
        fix = self.memory.fix_words
        a.summary, a.situation = fix(a.summary), fix(a.situation)
        a.points = [{k: fix(str(v)) for k, v in p.items()} if isinstance(p, dict) else p for p in a.points]
        a.next_steps = [fix(s) for s in a.next_steps]
        return a

    def game_review(self, record: str, mode=None, session_notes: list[str] | None = None, deep: bool = True,
                    nickname: str = "", now: datetime | None = None) -> Analysis:
        """게임사 공식 기록(글)으로 끝난 판을 되짚는다. 화면 이미지는 없음."""
        now = now or datetime.now()
        stamp = now.strftime("%Y-%m-%d") + f" ({'월화수목금토일'[now.weekday()]}) " + now.strftime("%H:%M")
        lines = [f"[지금: {stamp}]", OFFICIAL_TASK]
        if nickname:
            lines.append(f"주인님 게임 닉네임: {nickname}")
        if self.user_names:
            lines.append(self.names_text())
        mode_text = self._mode_text(mode, session_notes)
        if mode_text:
            lines.append(mode_text)
        rules = self.rules_text(mode)
        if rules:
            lines.append(rules.strip())
        notes = self.lorebook.notes_for(getattr(mode, "name", "") + "\n" + record, 9000, 10)
        if notes:
            lines.append(notes)
        lines.append("## 공식 기록\n" + record)
        r = self.ai.complete_json(model=self.chat_model, system=self.system_blocks(),
                                  messages=[{"role": "user", "content": [{"type": "text", "text": "\n".join(lines)}]}],
                                  schema=ANALYSIS_SCHEMA, kind="official_review", max_tokens=16000 if deep else 8000,
                                  effort="high" if deep else self.analysis_effort, timeout=300 if deep else 120)
        d = r.data
        if not d or not d.get("speak") or not str(d.get("summary", "")).strip():
            return Analysis(False, "", usd=r.usd)
        texts = [d["summary"], d.get("situation", "")] + [p.get("detail", "") for p in d.get("points", [])]
        if not all(is_korean(t) for t in texts if t):
            log.warning("공식 기록 총평이 한국어가 아님 → 표시하지 않음")
            return Analysis(False, "", usd=r.usd)
        a = self._fix_analysis(Analysis(
            True, d["summary"].strip(), d.get("situation", "").strip(), list(d.get("points", []))[:6],
            [str(x) for x in d.get("next_steps", [])][:4],
            d["emotion"] if d.get("emotion") in EMOTIONS else "normal", r.usd, f"{now:%H:%M} 공식 기록"))
        self.memory.add_turn("(끝난 판의 공식 기록을 보고 되짚어 달라고 함)", a.summary, now)
        return a

    def recap(self, label: str, facts: str, now: datetime | None = None) -> Analysis:
        """하루·주간 정리 (기록만 보고, 이미지 없음)."""
        now = now or datetime.now()
        stamp = now.strftime("%Y-%m-%d") + f" ({'월화수목금토일'[now.weekday()]}) " + now.strftime("%H:%M")
        text = f"[지금: {stamp}]\n{RECAP_TASK}\n## 기간: {label}\n{facts or '(남은 기록이 거의 없다)'}"
        r = self.ai.complete_json(model=self.chat_model, system=self.system_blocks(),
                                  messages=[{"role": "user", "content": [{"type": "text", "text": text}]}],
                                  schema=ANALYSIS_SCHEMA, kind="recap", max_tokens=8000, effort=self.analysis_effort,
                                  timeout=120)
        d = r.data
        if not d or not str(d.get("summary", "")).strip() or not is_korean(d["summary"]):
            return Analysis(False, "", usd=r.usd)
        a = self._fix_analysis(Analysis(
            True, d["summary"].strip(), d.get("situation", "").strip(), list(d.get("points", []))[:6],
            [str(x) for x in d.get("next_steps", [])][:4],
            d["emotion"] if d.get("emotion") in EMOTIONS else "normal", r.usd, f"{label} 정리"))
        self.memory.add_turn(f"({label} 정리를 부탁함)", a.summary, now)
        return a

    def update_progress(self, game: str, previous: str, notes: list[str], model: str = "claude-haiku-5-5") -> str:
        """한 판(세션)이 끝났을 때: 화면으로 본 기록으로 '어디까지 했는지'를 한두 문장으로 (싼 모델)."""
        schema = {"type": "object", "properties": {"progress": {"type": "string"}}, "required": ["progress"],
                  "additionalProperties": False}
        text = (f"게임: {game}\n이전에 적어 둔 진행: {previous or '(없음)'}\n이번 플레이에서 화면으로 본 기록:\n"
                + "\n".join(f"- {n}" for n in notes[-40:])
                + "\n\n주인님이 지금 이 게임을 어디까지 했는지(장·퀘스트·지역·이벤트 해역·레벨·목표 등)를 한국어 한두 문장으로 쓴다. "
                  "기록에 보이는 것만 쓰고 짐작하지 않는다. 새 진행 정보가 없으면 이전 진행을 그대로 쓴다.")
        r = self.ai.complete_json(model=model, system=[{"type": "text", "text": "너는 게임 진행 기록을 정리하는 도우미다."}],
                                  messages=[{"role": "user", "content": text}], schema=schema, kind="progress",
                                  max_tokens=400, effort="low", thinking_off=True, timeout=30)
        out = str((r.data or {}).get("progress", "")).strip()
        return self.memory.fix_words(out) if out and is_korean(out) else previous

    def expand_cues(self, text: str, model: str = "claude-haiku-5-5") -> list[str]:
        """'그때 그거' 를 찾을 낱말이 부족할 때: 같은 뜻 다른 말·관련 이름을 싼 모델로 (기억 찾기용)."""
        schema = {"type": "object", "properties": {"words": {"type": "array", "items": {"type": "string"}}},
                  "required": ["words"], "additionalProperties": False}
        prompt = (f"주인님 말: {text}\n주인님이 예전 일을 떠올리려 한다. 대화·화면 기록에서 찾을 때 쓸 낱말을 8개까지 낸다: "
                  "말에 나온 이름·물건·장소·게임 용어, 그 다른 표기(한글·영어·줄임말), 같은 뜻 다른 말. 조사는 빼고 2글자 이상.")
        r = self.ai.complete_json(model=model, system=[{"type": "text", "text": "너는 검색어를 뽑는 도우미다."}],
                                  messages=[{"role": "user", "content": prompt}], schema=schema, kind="recall",
                                  max_tokens=200, effort="low", thinking_off=True, timeout=15)
        return [str(w).strip() for w in (r.data or {}).get("words", []) if 2 <= len(str(w).strip()) <= 30][:8]

    def write_diary(self, day: str, material: str, model: str = "claude-haiku-5-5") -> str:
        """하루 일기: 그날 기록(대화·화면·분석·게임)을 다니카 시점의 짧은 일기로 (싼 모델). 떠올리기 색인에 들어간다."""
        schema = {"type": "object", "properties": {"diary": {"type": "string"}}, "required": ["diary"],
                  "additionalProperties": False}
        names = self.names_text()
        text = (f"날짜: {day}\n{names}\n아래는 이날 이 PC 에 남은 기록이다(대화, 화면으로 본 것, 분석, 게임).\n"
                "이걸로 '다니카의 일기' 한 편을 쓴다: 나중에 '그날 뭐 했지?', '그때 그거' 를 떠올릴 수 있게 구체적으로 — "
                "언제(대략 시각), 무엇을, 누가 나왔는지, 주인님이 한 중요한 말(짧게 따옴), 게임 진행·결과, 약속, 기분.\n"
                "다니카(나) 시점의 한국어 5~12문장. 기록에 없는 건 지어내지 않는다. 사적인 남의 대화는 요점만.\n\n"
                + material[:14000])
        r = self.ai.complete_json(model=model, system=[{"type": "text", "text": "너는 기록을 일기로 정리하는 도우미다."}],
                                  messages=[{"role": "user", "content": text}], schema=schema, kind="diary",
                                  max_tokens=1500, effort="low", thinking_off=True, timeout=60)
        out = str((r.data or {}).get("diary", "")).strip()
        return self.memory.fix_words(out) if out and mostly_korean(out) else ""

    def extract_dates(self, game: str, news: str, today: str, model: str = "claude-haiku-5-5") -> list[dict]:
        """게임 최신 소식 글 → 끝나는 날짜가 있는 이벤트·기원·점검 목록 (알림 자동 등록용, 싼 모델)."""
        schema = {"type": "object", "properties": {"items": {"type": "array", "items": {
            "type": "object", "properties": {
                "name": {"type": "string"}, "kind": {"type": "string", "enum": ["event", "banner", "maintenance", "other"]},
                "start": {"type": "string"}, "end": {"type": "string"}},
            "required": ["name", "kind", "start", "end"], "additionalProperties": False}}},
            "required": ["items"], "additionalProperties": False}
        text = (f"오늘: {today}\n게임: {game}\n아래 최신 소식 글에서 날짜가 분명히 적힌 이벤트·기원(픽업)·점검만 뽑는다. "
                "start/end 는 한국 시간 'YYYY-MM-DD HH:MM'(시각을 모르면 이벤트 끝은 23:59, 점검 시작은 그 날짜 00:00), "
                "모르면 빈 문자열. 이미 끝난 것은 빼고, 글에 없는 날짜는 짐작하지 않는다.\n\n" + news[:6000])
        r = self.ai.complete_json(model=model, system=[{"type": "text", "text": "너는 게임 공지에서 일정을 뽑는 도우미다."}],
                                  messages=[{"role": "user", "content": text}], schema=schema, kind="dates",
                                  max_tokens=1500, effort="low", thinking_off=True, timeout=30)
        return list((r.data or {}).get("items", []))

    # ------------------------------------------------------------ 영상 복기

    def review_video(self, frames: list[tuple[float, bytes]], name: str, question: str | None = None, mode=None,
                     on_count=None) -> Analysis:
        """녹화 영상에서 뽑은 장면들(영상 속 초, jpeg)로 시간대별 복기. on_count: 지금까지 짚은 장면 수."""
        from video_review import mmss

        content: list[dict] = []
        for sec, jpeg in frames:
            content.append({"type": "text", "text": f"(영상 {mmss(sec)})"})
            content.append(self._image_block(jpeg))
        lines = [VIDEO_TASK, f"영상 파일: {name}", f"장면 {len(frames)}장, 영상 {mmss(frames[0][0])} ~ {mmss(frames[-1][0])}"]
        if self.user_names:
            lines.append(self.names_text())
        mode_text = self._mode_text(mode, None)
        if mode_text:
            lines.append(mode_text)
        if question:
            lines.append(f"주인님이 특히 봐 달라고 한 것: {question}")
        notes = self.lorebook.notes_for(" ".join([name, question or "", getattr(mode, "name", "")]))
        if notes:
            lines.append(notes)
        extra = self.extra_context(mode) if self.extra_context else ""
        if extra:
            lines.append(extra)
        content.append({"type": "text", "text": "\n".join(lines)})

        def count(buf: str) -> None:
            if on_count:
                on_count(buf.count('"better"'))

        r = self.ai.complete_json(model=self.chat_model, system=self.system_blocks(),
                                  messages=[{"role": "user", "content": content}], schema=VIDEO_SCHEMA, kind="video",
                                  max_tokens=16000, effort=self.analysis_effort, timeout=600, on_text=count)
        d = r.data
        if not d or not d.get("speak") or not str(d.get("summary", "")).strip():
            return Analysis(False, "", usd=r.usd)
        if not all(is_korean(t) for t in [d["summary"], d.get("overall", "")] if t):
            log.warning("영상 복기가 한국어가 아님 → 표시하지 않음")
            return Analysis(False, "", usd=r.usd)
        points = [{"title": f"{m.get('time', '')} · {m.get('title', '')}",
                   "detail": m.get("detail", "") + (f" → {m['better']}" if m.get("better") else "")}
                  for m in d.get("moments", [])[:10]]
        self.memory.add_turn(f"(영상 복기를 부탁함: {name})", d["summary"].strip())
        return self._fix_analysis(Analysis(
            True, d["summary"].strip(), d.get("overall", "").strip(), points, [str(x) for x in d.get("next_steps", [])][:4],
            d["emotion"] if d.get("emotion") in EMOTIONS else "normal", r.usd, f"영상 {name}"))

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
        ops = r.data.get("ops")
        if ops is None:  # 예전 형식 {"facts": [...]} → 더하기
            ops = [{"op": "add", "id": "", **f} for f in r.data.get("facts", [])]
        bad = [o for o in ops if o.get("op") != "archive" and not is_korean(o.get("text", ""))]
        if bad:
            log.warning("한국어가 아닌 기억 %d개는 버림", len(bad))
            ops = [o for o in ops if o not in bad]
        self.last_archived = self.memory.apply_ops(ops, consumed)
        log.info("기억 정리: %s", ", ".join(f"{o.get('op')} {o.get('text', '')[:20]}" for o in ops) or "바뀐 것 없음")
        return True
