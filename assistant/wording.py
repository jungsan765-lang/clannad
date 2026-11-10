"""주인님이 고쳐 준 말 바꾸기: 다니카가 '남과'라고 잘못 부르던 걸 '호박'으로.

뒤에 붙은 조사(을/를, 이/가, 으로/로 …)도 새 말의 받침에 맞게 고친다.
짧은 한글 말(두 글자 이하)은 평범한 말과 겹칠 수 있어서(예: '남과 비교하다' 의 '남과')
분명히 이름으로 쓰인 경우(뒤에 을·를·이·가·로·예요·라고 … 가 붙은 경우)에만 바꾼다.
"""

from __future__ import annotations

import re

# (받침 있을 때, 받침 없을 때)
_PAIRS = [("이라니까", "라니까"), ("이라고", "라고"), ("이라는", "라는"), ("이에요", "예요"), ("이랑", "랑"),
          ("으로", "로"), ("이야", "야"), ("이나", "나"), ("이라", "라"), ("을", "를"), ("은", "는"), ("이", "가"),
          ("과", "와")]
_FORMS = sorted({f for pair in _PAIRS for f in pair}, key=len, reverse=True)
# 짧은 말이 이름(명사)으로 쓰였다고 확실히 볼 수 있는 조사
_NOUN_ONLY = {"을", "를", "이", "가", "으로", "로", "이에요", "예요", "이야", "야", "이라고", "라고", "이라는", "라는",
              "이랑", "랑", "이라니까", "라니까"}
_END = set(").]}!?\"'”’…~")  # 바로 뒤에 이런 게 오면 이름으로 본다 ('南瓜(남과)', '남과?')


def _final(word: str) -> int | None:
    """마지막 글자의 받침 번호 (0 = 받침 없음, 8 = ㄹ). 한글이 아니면 None."""
    if not word:
        return None
    code = ord(word[-1]) - 0xAC00
    if 0 <= code < 11172:
        return code % 28
    return None


def josa(word: str, particle: str) -> str:
    """새 말에 맞는 조사. '호박' + '를' → '을', '남과' + '을' → '를'."""
    fin = _final(word)
    if fin is None:
        return particle
    for with_b, without_b in _PAIRS:
        if particle in (with_b, without_b):
            if with_b == "으로":
                return "로" if fin in (0, 8) else "으로"
            return without_b if fin == 0 else with_b
    return particle


def _is_short_hangul(word: str) -> bool:
    return len(word) <= 2 and all("가" <= ch <= "힣" for ch in word)


def replace_term(text: str, wrong: str, right: str) -> str:
    if not text or not wrong or wrong not in text or wrong == right:
        return text
    short = _is_short_hangul(wrong)
    left = r"(?<![가-힣])" if short else ""
    pattern = re.compile(left + re.escape(wrong) + "(" + "|".join(map(re.escape, _FORMS)) + ")?")

    def sub(m: re.Match) -> str:
        particle = m.group(1) or ""
        after = text[m.end():m.end() + 1]
        if short and particle not in _NOUN_ONLY and not (not particle and (not after or after in _END)):
            return m.group(0)  # '남과 비교하다' 같은 평범한 말일 수 있음 (조사·문장부호 없이 이어지면 그대로)
        if particle in ("이", "가") and after and "가" <= after <= "힣":
            return right + particle  # '호박이다' 처럼 조사가 아닐 수 있으면 그대로 둔다
        return right + (josa(right, particle) if particle else "")

    return pattern.sub(sub, text)


def apply_terms(text: str, pairs: list[tuple[str, str]]) -> str:
    for wrong, right in pairs:
        text = replace_term(text, wrong, right)
    return text


def parse_correction(target: str) -> tuple[str, str] | None:
    """'남과 → 호박' / '남과->호박' / '남과 => 호박' → ('남과', '호박')."""
    parts = re.split(r"\s*(?:→|->|=>|⇒|➡)\s*", (target or "").strip(), maxsplit=1)
    if len(parts) != 2:
        return None
    wrong, right = (p.strip(" '\"“”‘’") for p in parts)
    if not wrong or not right or wrong == right or len(wrong) > 40 or len(right) > 40:
        return None
    return wrong, right
