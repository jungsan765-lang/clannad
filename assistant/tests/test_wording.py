from wording import josa, parse_correction, replace_term


def test_josa_follows_new_word():
    assert josa("호박", "를") == "을" and josa("남과", "을") == "를"
    assert josa("호박", "로") == "으로" and josa("서울", "으로") == "로" and josa("바다", "으로") == "로"
    assert josa("호박", "예요") == "이에요" and josa("tree", "를") == "를"


def test_replace_term_keeps_plain_words():
    r = lambda t: replace_term(t, "남과", "호박")  # noqa: E731
    assert r("남과를 넣고 남과로 끓인 남과예요.") == "호박을 넣고 호박으로 끓인 호박이에요."
    assert r("남과 비교하지 마세요. 남과는 다르게") == "남과 비교하지 마세요. 남과는 다르게"
    assert replace_term("단호박을 샀다", "호박", "남과") == "단호박을 샀다"  # 다른 말의 일부는 안 건드림
    assert replace_term("南瓜 수프", "南瓜", "호박") == "호박 수프"
    assert parse_correction("남과 → 호박") == ("남과", "호박") and parse_correction("호박") is None
