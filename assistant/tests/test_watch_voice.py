import os

import numpy as np
import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from fake_anthropic import FakeAnthropic  # noqa: E402
from PIL import Image  # noqa: E402
from PySide6.QtWidgets import QApplication  # noqa: E402

from ai_client import AIClient  # noqa: E402
from companion import Companion, Reply  # noqa: E402
from hotkeys import parse_key  # noqa: E402
from memory import Memory  # noqa: E402
from usage import UsageLedger  # noqa: E402
from voice.listener import VoiceListener  # noqa: E402
from voice.segmenter import RATE, Segmenter  # noqa: E402
from voice.stt import apply_wake_word, clean_text  # noqa: E402
from watch.capture import Monitor, pick_monitor  # noqa: E402
from watch.watcher import ScreenWatcher, WatchConfig  # noqa: E402


@pytest.fixture(scope="module")
def qapp():
    return QApplication.instance() or QApplication([])


# ---------------------------------------------------------------- 화면 보기


def test_pick_monitor_left_right():
    mons = [Monitor(1, 0, 0, 1920, 1080), Monitor(2, 1920, 0, 2560, 1440)]
    assert pick_monitor(mons, "left").index == 1 and pick_monitor(mons, "right").index == 2
    assert pick_monitor(mons, "2").index == 2 and pick_monitor(mons, "primary").index == 1
    mons_flipped = [Monitor(1, 0, 0, 1920, 1080), Monitor(2, -1920, 0, 1920, 1080)]
    assert pick_monitor(mons_flipped, "left").index == 2  # 왼쪽 모니터가 주 모니터가 아닐 때


class FakeCompanion:
    def __init__(self, tmp_path, speak=True):
        self.memory = Memory(tmp_path)
        self.speak = speak
        self.judged = []
        self.lines = []

    def judge(self, jpeg, title, model, minutes):
        self.judged.append((title, model, minutes))
        return {"speak": self.speak, "situation": "오류 창", "point": "경로 확인"}

    def screen_line(self, jpeg, title, note, model=None, question=None):
        self.lines.append((note, question))
        return Reply(True, "경로에 얼룩이 하나 있네요." if question is None else "지금은 코드 편집 중이시네요.", "normal")


def _watcher(tmp_path, images, speak=True, clock=None, can_run=lambda: True):
    comp = FakeCompanion(tmp_path, speak)
    t = {"now": 0.0}
    it = iter(images)

    def run_job(fn, done, fail, *args):  # 테스트에선 바로 실행
        try:
            done(fn(*args))
        except Exception as exc:  # noqa: BLE001
            fail(str(exc))

    w = ScreenWatcher(comp, WatchConfig(cooldown_seconds=120), run_job, can_run=can_run,
                      grabber=lambda: (next(it), "main.py - VS Code [code.exe]"), clock=lambda: t["now"])
    said = []
    w.spoke.connect(lambda r: said.append(r.message))
    return w, comp, said, t


def _img(v):
    return Image.new("RGB", (1920, 1080), (v, v, v))


def test_watcher_judges_then_speaks_and_respects_cooldown(qapp, tmp_path):
    w, comp, said, t = _watcher(tmp_path, [_img(10), _img(200), _img(90), _img(20)])
    w.tick()
    assert said == ["경로에 얼룩이 하나 있네요."] and comp.judged[0][1] == "claude-haiku-5-5"
    assert comp.memory.spoken_lines() == ["경로에 얼룩이 하나 있네요."]
    t["now"] = 60
    w.tick()  # 쿨다운 중: 캡처도 안 함
    assert len(comp.judged) == 1
    t["now"] = 200
    w.tick()
    assert len(said) == 2 and comp.judged[-1][2] == pytest.approx(200 / 60)


def test_watcher_skips_unchanged_screen_without_api(qapp, tmp_path):
    w, comp, said, t = _watcher(tmp_path, [_img(50), _img(50), _img(51)], speak=False)
    w.tick()
    w.tick()
    w.tick()
    assert len(comp.judged) == 1 and w.stats["skipped_same"] == 2 and said == []


def test_ask_now_skips_judge(qapp, tmp_path):
    w, comp, said, _ = _watcher(tmp_path, [_img(50)])
    w.ask_now("이거 뭐야?")
    assert comp.judged == [] and comp.lines[0] == (None, "이거 뭐야?") and said


def test_watcher_waits_when_not_allowed(qapp, tmp_path):
    w, comp, said, _ = _watcher(tmp_path, [_img(50)], can_run=lambda: False)
    w.tick()
    assert comp.judged == [] and said == []


def test_judge_request_uses_haiku_without_thinking_and_image(tmp_path):
    fake = FakeAnthropic([{"speak": False, "situation": "바탕화면", "point": ""}])
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), Memory(tmp_path / "d"), None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    note = comp.judge(b"\xff\xd8jpeg", "탐색기", "claude-haiku-5-5", None)
    call = fake.calls[0]
    assert note["speak"] is False
    assert call["thinking"] == {"type": "disabled"} and "fallbacks" not in call
    assert call["messages"][0]["content"][0]["type"] == "image"


def test_screen_line_quiet_and_history_alternates(tmp_path):
    fake = FakeAnthropic([{"speak": False, "message": "", "emotion": "normal"},
                          {"speak": True, "message": "네, 다시 볼게요.", "emotion": "normal"}])
    mem = Memory(tmp_path / "d")
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), mem, None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    r = comp.screen_line(b"jpeg", "게임", {"situation": "로딩", "point": ""})
    assert r.speak is False
    mem.add_spoken("혼자 너무 깊이 들어가셨습니다.")
    comp.reply("아 그랬어?")
    msgs = fake.calls[1]["messages"]
    roles = [m["role"] for m in msgs]
    assert roles == ["user", "assistant", "user"]  # 먼저 건넨 말 앞에 자리표시 user 가 들어감
    assert "먼저 건넨 말" in msgs[1]["content"]


# ---------------------------------------------------------------- 목소리


def _tone(seconds, amp=0.2):
    t = np.arange(int(RATE * seconds)) / RATE
    return (amp * np.sin(2 * np.pi * 220 * t)).astype(np.float32)


def _noise(seconds, amp=0.002):
    return (np.random.default_rng(0).standard_normal(int(RATE * seconds)) * amp).astype(np.float32)


def _frames(audio):
    n = RATE * 30 // 1000
    return [audio[i:i + n] for i in range(0, len(audio) - n + 1, n)]


def test_segmenter_always_cuts_one_utterance():
    seg = Segmenter()
    audio = np.concatenate([_noise(1.0), _tone(1.2), _noise(1.5)])
    out = [s for f in _frames(audio) for s in seg.feed(f)]
    assert len(out) == 1
    assert 1.2 <= len(out[0]) / RATE <= 2.4  # 말 + 앞부분 여유 + 끝 무음


def test_segmenter_push_mode_waits_for_button():
    seg = Segmenter()
    seg.auto = False
    out = [s for f in _frames(np.concatenate([_noise(0.5), _tone(0.8), _noise(1.2)])) for s in seg.feed(f)]
    assert out == []  # 버튼을 안 눌렀으면 아무것도 안 함
    seg.start()
    out = [s for f in _frames(np.concatenate([_tone(0.8), _noise(1.2)])) for s in seg.feed(f)]
    assert len(out) == 1 and not seg.armed


def test_clean_text_and_wake_word():
    assert clean_text("시청해 주셔서 감사합니다.") == ""
    assert clean_text("  다니카 오늘 일정 알려줘 ") == "다니카 오늘 일정 알려줘"
    assert clean_text("감사합니다.") == "감사합니다."
    assert apply_wake_word("다니카야, 물 좀 줘", "다니카") == "물 좀 줘"
    assert apply_wake_word("물 좀 줘", "다니카") is None
    assert apply_wake_word("물 좀 줘", "") == "물 좀 줘"


class FakeSTT:
    def __init__(self, text):
        self.text = text

    def transcribe(self, audio):
        return self.text


def test_listener_modes_and_heard(qapp):
    lst = VoiceListener(FakeSTT("다니카, 지금 몇 시야?"), wake_word="다니카")
    heard = []
    lst.heard.connect(heard.append)
    lst.handle_segment(_tone(1.0))
    assert heard == ["지금 몇 시야?"]
    lst.mode = "push"  # 마이크 없이 상태만
    lst.seg.auto = False
    lst.push()  # 마이크가 없는 환경 → 오류 신호만, 죽지 않음
    lst.set_mode("off")
    assert lst.mode == "off" and lst.stream is None


def test_parse_hotkeys():
    assert parse_key("F8") == (0, 0x77)
    assert parse_key("ctrl+alt+D") == (0x0002 | 0x0001, ord("D"))
    assert parse_key("") is None and parse_key("hyper+x") is None
