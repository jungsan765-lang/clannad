import os

import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PIL import Image, ImageDraw, ImageFont  # noqa: E402

import local_ocr  # noqa: E402

FONT = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"


def _line(text, size=34, width=1100, height=60, dark=False):
    img = Image.new("RGB", (width, height), (225, 210, 180) if dark else (40, 60, 50))
    font = ImageFont.truetype(FONT, size) if os.path.exists(FONT) else ImageFont.load_default(size)
    d = ImageDraw.Draw(img)
    if dark:
        d.text((10, 10), text, font=font, fill=(30, 30, 30))
    else:
        d.text((10, 10), text, font=font, fill=(245, 245, 245), stroke_width=2, stroke_fill=(0, 0, 0))
    return img


def test_quality_prefers_whole_korean_over_broken_text():
    assert local_ocr.quality("퀘스트 완료: 잃어버린 짐을 찾아서") > 0.8
    assert local_ocr.quality("퀘ㅅㅡ :결궁 ㄹ#@ y어") < 0.4
    assert local_ocr.quality("") == 0.0


def test_windows_first_then_paddle_when_empty_or_broken(monkeypatch):
    img = Image.new("RGB", (100, 30))
    monkeypatch.setattr(local_ocr, "read_windows", lambda i, lang="ko": "퀘스트 완료: 잃어버린 짐")
    monkeypatch.setattr(local_ocr, "read_paddle", lambda i: pytest.fail("잘 읽혔으면 다시 안 읽음"))
    assert local_ocr.read_text(img) == "퀘스트 완료: 잃어버린 짐"
    monkeypatch.setattr(local_ocr, "read_windows", lambda i, lang="ko": "퀘ㅅㅡ :결궁 ㄹ#@")  # 깨져 보임
    monkeypatch.setattr(local_ocr, "read_paddle", lambda i: "퀘스트 완료: 잃어버린 짐")
    assert local_ocr.read_text(img) == "퀘스트 완료: 잃어버린 짐"
    monkeypatch.setattr(local_ocr, "read_windows", lambda i, lang="ko": "")  # 글자 없음이라는데
    assert local_ocr.read_text(img) == "퀘스트 완료: 잃어버린 짐"  # 정밀 글자 인식이 찾으면 그걸
    monkeypatch.setattr(local_ocr, "read_paddle", lambda i: "ㄱ#")
    assert local_ocr.read_text(img) == ""  # 둘 다 없음
    monkeypatch.setattr(local_ocr, "read_windows", lambda i, lang="ko": None)  # Windows 글자 인식을 못 쓰면
    monkeypatch.setattr(local_ocr, "read_paddle", lambda i: "획득: 희귀 말 안장")
    assert local_ocr.read_text(img) == "획득: 희귀 말 안장"
    monkeypatch.setattr(local_ocr, "read_paddle", lambda i: None)
    assert local_ocr.read_text(img) is None  # 둘 다 못 쓰면 AI 가 읽음


def test_multi_line_box_is_split_into_lines():
    img = Image.new("RGB", (900, 160), (20, 20, 30))
    font = ImageFont.truetype(FONT, 30) if os.path.exists(FONT) else ImageFont.load_default(30)
    d = ImageDraw.Draw(img)
    d.text((10, 15), "마리우스: 귀족에게 가는 길은", font=font, fill=(240, 240, 240))
    d.text((10, 95), "위험하오. 조심하시오.", font=font, fill=(240, 240, 240))
    lines = local_ocr.split_lines(img)
    assert len(lines) == 2 and all(line.height < 80 for line in lines)
    assert len(local_ocr.split_lines(_line("한 줄짜리"))) == 1


def test_real_korean_model_reads_game_lines():
    pytest.importorskip("rapidocr")
    if not os.path.exists(FONT):
        pytest.skip("한글 글꼴 없음")
    local_ocr.paddle_enabled = True
    if local_ocr._paddle_engine() is None:
        pytest.skip("정밀 글자 인식 모델을 못 받음")
    got = local_ocr.read_paddle(_line("마리우스: 귀족에게 가는 길은 위험하오", dark=True))
    assert got.replace(" ", "") == "마리우스:귀족에게가는길은위험하오"
    got = local_ocr.read_paddle(_line("획득: 희귀 말 안장 x1"))
    assert "희귀" in got and "안장" in got
