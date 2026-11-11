"""'끝났다·받았다'는 말은 화면 글자로 확인될 때만 믿는다.

판단 담당(Haiku, 작은 사진)은 의뢰·일지 창에 적힌 '받을 보상'을 '보상 받음'으로, 의뢰 설명 화면을 '의뢰 끝'으로
잘못 읽을 때가 있다 (붉은사막 '금전의 대가': 세금을 내야 받는 보상인데 '의뢰 끝, 보상 받음'이라고 적음).
그 말이 판 기록에 남으면 대화 담당까지 사실로 믿는다. 그래서 의뢰를 끝냈다·보상을 받았다는 말은
화면 글자(이 PC 가 원래 크기로 읽은 화면·화면 정보·자막)에 '완료·획득' 같은 글이 실제로 있을 때만 그대로 두고,
없으면 '확인 안 됨'을 붙인다. 짐작이 사실처럼 쌓이지 않게.
"""

from __future__ import annotations

import re
from typing import Iterable

_QUEST = re.compile(r"의뢰|퀘스트|임무|미션|과제|업적|도전")
_DONE = re.compile(r"끝(?!까지|에서|으로|이 ?없)|완료|마쳤|마침|마무리|클리어|달성|해결|성공")
_REWARD = re.compile(r"보상|아이템|가방|상자|공헌도|경험치|재료|골드|은화|선물|장비")
_GOT = re.compile(r"받았|받음|받은|획득|얻었|얻음|얻은|챙겼|챙김|수령")
# 화면 글자에 '이미 됐다'는 글이 있나. '획득 보상'·'완료 조건'·'달성 시' 같은 앞으로의 일은 빼고
_SHOWN = re.compile(
    r"완료(?!\s*(?:조건|시|하면|후|보상|하기|할))|획득(?!\s*(?:가능|예정|할|하면|조건|보상|시))"
    r"|달성(?!\s*(?:조건|시|하면|보상|할))|클리어(?!\s*(?:조건|시|하면|보상))"
    r"|성공(?!\s*(?:조건|시|하면|보상|할))|받았습니다|수령했|수령 완료|COMPLETE|CLEARED|ACQUIRED|OBTAINED",
    re.I)

CAVEAT = " — 단, 끝났다·받았다는 글자는 화면에서 못 봄 (의뢰·일지에 적힌 보상은 앞으로 받을 것일 수 있다. 사실로 말하지 않는다)"


def claims_done(text: str) -> bool:
    """의뢰를 끝냈다·보상을 받았다는 말인가. '공격받음' 같은 건 아님."""
    t = text or ""
    return bool((_QUEST.search(t) and (_DONE.search(t) or _GOT.search(t))) or (_REWARD.search(t) and _GOT.search(t)))


def shown_done(texts: Iterable[str]) -> bool:
    """화면 글자에 완료·획득 같은 글이 실제로 있었나."""
    return any(_SHOWN.search(t or "") for t in texts)


def check(text: str, evidence: Iterable[str]) -> str:
    """끝냈다·받았다는 말인데 화면 글자로 확인이 안 되면 '확인 안 됨'을 붙인다."""
    if not text or CAVEAT in text or not claims_done(text) or shown_done(evidence):
        return text
    return text + CAVEAT
