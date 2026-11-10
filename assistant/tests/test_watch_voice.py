import os
from pathlib import Path

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
from watch.modes import Mode, detect, load_modes  # noqa: E402
from watch.watcher import ScreenWatcher, WatchConfig  # noqa: E402
from watch.windows import WindowInfo  # noqa: E402


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
    def __init__(self, tmp_path, notes=None):
        self.memory = Memory(tmp_path)
        self.notes = list(notes or [])  # judge 가 차례로 돌려줄 판단
        self.judged = []
        self.lines = []

    def judge(self, jpeg, title, model, minutes, mode=None, session_notes=None):
        self.judged.append({"title": title, "model": model, "minutes": minutes, "mode": mode.name if mode else None,
                            "notes": list(session_notes or [])})
        if self.notes:
            return self.notes.pop(0)
        return {"speak": True, "urgent": False, "scene": "playing", "situation": "오류 창", "point": "경로 확인"}

    def screen_line(self, jpeg, title, note, model=None, question=None, mode=None, session_notes=None, review=False):
        self.lines.append({"note": note, "question": question, "mode": mode.name if mode else None,
                           "notes": list(session_notes or []), "review": review})
        text = "총평입니다." if review else ("지금은 코드 편집 중이시네요." if question else "경로에 얼룩이 하나 있네요.")
        return Reply(True, text, "normal")


MON = (0, 0, 1920, 1080)


def _watcher(tmp_path, images=None, notes=None, modes=None, can_run=lambda: True,
             window=WindowInfo("main.py - VS Code", "code.exe", (0, 0, 1900, 1000))):
    comp = FakeCompanion(tmp_path, notes)
    t = {"now": 0.0}
    state = {"window": window}
    imgs = iter(images or [_img(v) for v in range(0, 250, 7)])

    def run_job(fn, done, fail, *args):  # 테스트에선 바로 실행
        try:
            done(fn(*args))
        except Exception as exc:  # noqa: BLE001
            fail(str(exc))

    w = ScreenWatcher(comp, WatchConfig(interval_seconds=30, cooldown_seconds=120), run_job, modes=modes or [],
                      can_run=can_run, grabber=lambda: next(imgs), window_info=lambda: state["window"],
                      monitor_rect=lambda: MON, clock=lambda: t["now"])
    said = []
    w.spoke.connect(lambda r: said.append(r.message))
    return w, comp, said, t, state


def _img(v):
    return Image.new("RGB", (1920, 1080), (v, v, v))


def test_watcher_judges_then_speaks_and_respects_cooldown(qapp, tmp_path):
    w, comp, said, t, _ = _watcher(tmp_path)
    w.tick()
    assert said == ["경로에 얼룩이 하나 있네요."] and comp.judged[0]["model"] == "claude-haiku-5-5"
    assert comp.judged[0]["title"] == "main.py - VS Code [code.exe]"
    assert comp.memory.spoken_lines() == ["경로에 얼룩이 하나 있네요."]
    t["now"] = 60
    w.tick()  # 평소 모드 쉬는 시간: 캡처도 판단도 안 함
    assert len(comp.judged) == 1
    t["now"] = 200
    w.tick()
    assert len(said) == 2 and comp.judged[-1]["minutes"] == pytest.approx(200 / 60)


def test_watcher_skips_unchanged_screen_without_api(qapp, tmp_path):
    w, comp, said, t, _ = _watcher(tmp_path, [_img(50), _img(50), _img(51)],
                                   notes=[{"speak": False, "urgent": False, "scene": "other", "situation": "", "point": ""}])
    for i in range(3):
        t["now"] = i * 31
        w.tick()
    assert len(comp.judged) == 1 and w.stats["skipped_same"] == 2 and said == []


def test_ask_now_skips_judge(qapp, tmp_path):
    w, comp, said, _, _ = _watcher(tmp_path)
    w.ask_now("이거 뭐야?")
    assert comp.judged == [] and comp.lines[0]["question"] == "이거 뭐야?" and said


def test_watcher_waits_when_not_allowed(qapp, tmp_path):
    w, comp, said, _, _ = _watcher(tmp_path, can_run=lambda: False)
    w.tick()
    assert comp.judged == [] and said == []


def test_repo_modes_load_and_detect():
    modes = load_modes(Path(__file__).resolve().parents[1] / "modes")
    names = {m.name for m in modes}
    assert {"사이퍼즈", "붉은사막", "디맥", "칸코레"} <= names
    assert detect("chrome.exe", "艦隊これくしょん -艦これ- - オンラインゲーム - DMM GAMES - Chrome", modes).name == "칸코레"
    assert detect("CrimsonDesert.exe", "Crimson Desert", modes).name == "붉은사막"
    assert detect("Cyphers.exe", "", modes).name == "사이퍼즈"
    assert detect("notepad.exe", "메모장", modes) is None


def _game(name, **kw):
    return Mode(name, processes=[f"{name}.exe"], interval_seconds=10, cooldown_seconds=60, knowledge=f"{name} 설명",
                is_game=True, **kw)


def test_mode_switch_ignores_window_on_other_monitor(qapp, tmp_path):
    game = _game("game")
    w, comp, said, t, st = _watcher(tmp_path, modes=[game], window=WindowInfo("G", "game.exe", (0, 0, 1920, 1080)))
    w.update_mode()
    assert w.mode is game and w.session is not None
    st["window"] = WindowInfo("다니카", "pythonw.exe", (2000, 0, 2600, 900))  # 오른쪽 모니터의 다니카를 클릭
    w.update_mode()
    assert w.mode is game  # 그대로 게임 모드


def test_quiet_during_play_then_review_on_result(qapp, tmp_path):
    rhythm = _game("rhythm", quiet_during_play=True, review_on_result=True)
    notes = [{"speak": True, "urgent": False, "scene": "playing", "situation": "곡 플레이 중 콤보 300", "point": "좋아요"},
             {"speak": True, "urgent": False, "scene": "result", "situation": "결과 RATE 98.5%, BREAK 3", "point": ""}]
    w, comp, said, t, _ = _watcher(tmp_path, notes=notes, modes=[rhythm],
                                   window=WindowInfo("R", "rhythm.exe", (0, 0, 1920, 1080)))
    w.tick()
    assert said == []  # 플레이 중엔 말하지 않음
    t["now"] = 11
    w.tick()
    assert said == ["총평입니다."] and comp.lines[-1]["review"]
    assert any("RATE 98.5%" in n for n in comp.lines[-1]["notes"])  # 이번 판 기록으로 총평


def test_urgent_ignores_cooldown(qapp, tmp_path):
    kc = _game("kc", urgent="대파면 철수 경고")
    notes = [{"speak": True, "urgent": False, "scene": "playing", "situation": "출격 중", "point": "보급 확인"},
             {"speak": True, "urgent": True, "scene": "result", "situation": "2번함 大破", "point": "철수"}]
    w, comp, said, t, _ = _watcher(tmp_path, notes=notes, modes=[kc], window=WindowInfo("K", "kc.exe", (0, 0, 1920, 1080)))
    w.tick()
    t["now"] = 11  # 아직 쉬는 시간(60초)인데
    w.tick()
    assert len(said) == 2  # 긴급이라 바로 말함


def test_session_context_and_game_record(qapp, tmp_path):
    game = _game("game")
    w, comp, said, t, st = _watcher(tmp_path, modes=[game], window=WindowInfo("G", "game.exe", (0, 0, 1920, 1080)))
    for i in range(4):
        t["now"] = i * 100
        w.tick()
    ctx = w.chat_context()
    assert ctx.startswith("[지금 하고 있는 게임: game") and "오류 창" in ctx and "내가 한 말" in ctx
    st["window"] = WindowInfo("메모장", "notepad.exe", (0, 0, 1920, 1080))
    t["now"] = 400
    w.update_mode()
    assert w.mode.name == "평소" and w.session is not None  # 잠깐 다른 창을 봐도 세션은 유지
    t["now"] = 400 + 200
    w.update_mode()
    assert w.session is None and w.chat_context() is None
    assert any("game" in p["user"] for p in comp.memory.pending)  # 다음 기억 정리 때 '최근 있었던 일'로


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


def test_companion_prompts_carry_mode_session_and_context(tmp_path):
    modes = load_modes(Path(__file__).resolve().parents[1] / "modes")
    kc = next(m for m in modes if m.name == "칸코레")
    fake = FakeAnthropic([
        {"speak": True, "urgent": True, "scene": "result", "situation": "2번함 大破", "point": "철수"},
        {"speak": True, "message": "대파가 있어요. 진격하지 말고 철수하세요.", "emotion": "worried"},
        {"speak": True, "message": "아까 2번함이 대파였죠.", "emotion": "normal"},
    ])
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), Memory(tmp_path / "d"), None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    note = comp.judge(b"jpeg", "칸코레", "claude-haiku-5-5", None, kc, ["0분: 출격"])
    system = fake.calls[0]["system"][0]["text"]
    assert "즉시 알릴 상황" in system and "大破" in system and note["urgent"]
    r = comp.screen_line(b"jpeg", "칸코레", note, mode=kc, session_notes=["0분: 출격", "1분: 2번함 大破"])
    text = fake.calls[1]["messages"][-1]["content"][1]["text"]
    assert "이번 판(세션) 기록" in text and "즉시 알릴 상황이다" in text and r.speak
    comp.reply("방금 어땠어?", context="[지금 하고 있는 게임: 칸코레, 12분째]")
    blocks = [b["text"] for b in fake.calls[2]["messages"][-1]["content"]]
    assert blocks[1].startswith("[지금 하고 있는 게임: 칸코레") and blocks[2] == "방금 어땠어?"
