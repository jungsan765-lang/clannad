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

    def judge(self, jpeg, title, model, minutes, mode=None, session_notes=None, chattiness="normal", analysis=False,
              review=False, focus=None, focus_label=""):
        self.focus_seen = focus
        self.focus_label_seen = focus_label
        self.judged.append({"title": title, "model": model, "minutes": minutes, "mode": mode.name if mode else None,
                            "notes": list(session_notes or [])})
        if self.notes:
            return self.notes.pop(0)
        return {"speak": True, "urgent": False, "scene": "playing", "situation": "오류 창", "point": "경로 확인"}

    def analyze(self, frames, title, mode=None, session_notes=None, note=None, question=None, review=False, focus=None,
                focus_label="", deep=False):
        from companion import Analysis

        self.analyses = getattr(self, "analyses", []) + [{"frames": frames, "note": note, "question": question,
                                                          "review": review, "deep": deep}]
        return Analysis(True, "흐름을 보니 왼쪽이 비었습니다.", "교전 직후", [{"title": "위치", "detail": "근거"}], ["보급"])

    def screen_line(self, jpeg, title, note, model=None, question=None, mode=None, session_notes=None, review=False,
                    focus=None, focus_label="", pick=False, fast=None):
        self.lines.append({"note": note, "question": question, "mode": mode.name if mode else None,
                           "notes": list(session_notes or []), "review": review, "pick": pick, "fast": fast})
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

    w = ScreenWatcher(comp, WatchConfig(interval_seconds=30, cooldown_seconds=120, deep_result=False), run_job,
                      modes=modes or [],
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
    assert {"사이퍼즈", "붉은사막", "디맥", "칸코레", "원신"} <= names
    assert detect("GenshinImpact.exe", "Genshin Impact", modes).name == "원신"
    assert detect("chrome.exe", "원신 공략 - 나무위키", modes) is None  # 브라우저로 공략 보는 건 게임 아님
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


def test_watcher_reports_what_it_is_doing(qapp, tmp_path):
    w, comp, said, t, _ = _watcher(tmp_path)
    seen = []
    w.activity.connect(seen.append)
    w.tick()
    assert seen == ["judge", "line", ""]  # 화면 확인 → 할 말 고르기 → 끝
    seen.clear()
    w.ask_now()
    assert seen == ["line", ""]


def test_unknown_game_seen_often_asks_for_a_mode(qapp, tmp_path):
    quiet = {"speak": False, "urgent": False, "scene": "playing", "situation": "보스전", "point": ""}
    w, comp, said, t, state = _watcher(tmp_path, notes=[dict(quiet) for _ in range(20)],
                                       window=WindowInfo("Elden Ring", "eldenring.exe", (0, 0, 1900, 1000)))
    asked = []
    w.new_game.connect(lambda p, title, seen: asked.append((p, title, seen)))
    for i in range(10):
        t["now"] = i * 31
        w.tick()
    assert len(asked) == 1 and asked[0][0] == "eldenring.exe" and asked[0][1] == "Elden Ring"
    assert asked[0][2][0] == "보스전" and "eldenring.exe" in w.known_games
    w2, _, _, t2, _ = _watcher(tmp_path / "b", notes=[dict(quiet) for _ in range(20)])  # code.exe 는 게임 아님
    seen2 = []
    w2.new_game.connect(lambda *a: seen2.append(a))
    for i in range(10):
        t2["now"] = i * 31
        w2.tick()
    assert seen2 == []


def test_saved_mode_is_valid_and_loads(tmp_path):
    from watch.modes import save_mode

    data = {"name": "엘든 링", "titles": ["ELDEN RING", "엘든"], "interval_seconds": 5, "cooldown_seconds": 9999,
            "quiet_during_play": True, "review_on_result": False,
            "knowledge": '- 보스 "말레니아" 패턴\n- 체력 낮으면 회복\\주의', "urgent": "", "intro": "준비했습니다."}
    path = save_mode(tmp_path / "modes", "EldenRing.exe", data)
    assert path.name == "auto_eldenring.toml"
    m = load_modes(tmp_path / "modes")[0]
    assert m.name == "엘든 링" and m.processes == ["eldenring.exe"] and m.titles == ["ELDEN RING", "엘든"]
    assert m.interval_seconds == 10 and m.cooldown_seconds == 600 and m.quiet_during_play  # 범위 안으로
    assert '"말레니아"' in m.knowledge and "\\주의" in m.knowledge
    assert detect("eldenring.exe", "", [m]) is m


# ---------------------------------------------------------------- DXGI 화면 찍기

def test_dxgi_picks_the_overlapping_monitor_and_waits_for_first_frame(monkeypatch):
    import sys
    import types

    from watch import dxgi

    made = []

    class Cam:
        def __init__(self, d, o):
            self.d, self.o, self.calls = d, o, 0

        def grab(self, new_frame_only=True):
            self.calls += 1
            if self.calls < 3:
                return None  # 막 만든 카메라는 첫 화면이 조금 늦게 옴
            return np.full((1080, 1920, 3), 200 if self.o == 1 else 10, dtype=np.uint8)

        def release(self):
            pass

    def output(left, top, w, h):
        c = types.SimpleNamespace(left=left, top=top, right=left + w, bottom=top + h)
        return types.SimpleNamespace(desc=types.SimpleNamespace(DesktopCoordinates=c), update_desc=lambda: None)

    fake = types.ModuleType("dxcam")
    vars(fake)["__factory"] = types.SimpleNamespace(outputs=[[output(1920, 0, 2560, 1440), output(0, 0, 1920, 1080)]])
    fake.create = lambda device_idx, output_idx, output_color: made.append(Cam(device_idx, output_idx)) or made[-1]
    comtypes = types.ModuleType("comtypes")
    comtypes.COINIT_APARTMENTTHREADED = 2
    comtypes.CoInitializeEx = lambda flags: None
    monkeypatch.setitem(sys.modules, "dxcam", fake)
    monkeypatch.setitem(sys.modules, "comtypes", comtypes)
    g = dxgi.DxgiGrabber()
    g.failed = False
    img = g.grab((0, 0, 1920, 1080))  # 왼쪽(주) 모니터 = 두 번째 출력
    assert img.size == (1920, 1080) and img.getpixel((5, 5)) == (200, 200, 200)
    assert (made[0].d, made[0].o) == (0, 1)
    g.grab((0, 0, 1920, 1080))
    assert len(made) == 1  # 카메라는 다시 만들지 않음


def test_dxgi_unavailable_falls_back(monkeypatch):
    import sys

    from watch import dxgi

    monkeypatch.setitem(sys.modules, "dxcam", None)  # 설치 안 됨
    g = dxgi.DxgiGrabber()
    g.failed = False
    assert g.grab((0, 0, 10, 10)) is None and g.failed
    assert g.grab((0, 0, 10, 10)) is None  # 그 뒤로는 바로 포기 (mss 로)


def test_watcher_uses_dxgi_then_mss(qapp, tmp_path, monkeypatch):
    from watch import capture

    w, *_ = _watcher(tmp_path)
    mon = capture.Monitor(1, 0, 0, 1920, 1080)
    monkeypatch.setattr(capture, "list_monitors", lambda: [mon])
    monkeypatch.setattr(capture, "grab", lambda m: Image.new("RGB", (1920, 1080), (1, 2, 3)))
    w.dxgi.failed = False
    w.dxgi.grab = lambda rect: Image.new("RGB", (1920, 1080), (90, 90, 90))
    assert w._default_grab().getpixel((0, 0)) == (90, 90, 90)
    w.dxgi.grab = lambda rect: None
    assert w._default_grab().getpixel((0, 0)) == (1, 2, 3)  # DXGI 가 안 되면 기존 방식


def test_users_shorter_interval_wins_over_game_mode(qapp, tmp_path):
    slow = Mode("느긋한 게임", processes=["slow.exe"], interval_seconds=25, cooldown_seconds=150, knowledge="x",
                is_game=True)
    w, comp, said, t, state = _watcher(tmp_path, modes=[slow],
                                       window=WindowInfo("slow", "slow.exe", (0, 0, 100, 100)))
    w.cfg.interval_seconds, w.cfg.cooldown_seconds = 10, 90
    assert w.interval_for(slow) == 10 and w.cooldown_for(slow) == 90
    w.cfg.interval_seconds = 60
    assert w.interval_for(slow) == 25  # 모드가 더 짧으면 모드 값


def test_requirements_file_parses_for_pip():
    from pathlib import Path

    from packaging.requirements import Requirement

    lines = Path(__file__).resolve().parents[1].joinpath("requirements.txt").read_text(encoding="utf-8").splitlines()
    reqs = [Requirement(line.split(" #")[0].strip()) for line in lines if line.strip() and not line.startswith("#")]
    dx = next(r for r in reqs if r.name == "dxcam")
    assert str(dx.specifier) == "==0.3.0" and dx.marker.evaluate({"sys_platform": "win32"})
    assert not dx.marker.evaluate({"sys_platform": "linux"})


def test_analysis_mode_uses_recent_frames_instead_of_one_liner(qapp, tmp_path):
    w, comp, said, t, _ = _watcher(tmp_path)
    w.cfg.analysis = True
    seen = []
    w.activity.connect(seen.append)
    for i, now in enumerate([0, 30, 60]):  # 확인 간격(30초)마다, 쉬는 시간 없이 판단만 쌓이게
        t["now"] = now
        w.last_spoke = None
        w.last_check = None
        w.tick()
    a = comp.analyses[-1]
    assert [round(ago) for _, ago in a["frames"]] == [60, 30, 0]  # 오래된 것부터, 지금 화면이 마지막
    assert a["note"]["scene"] == "playing" and said[-1] == "흐름을 보니 왼쪽이 비었습니다."
    assert "analyze" in seen and comp.lines == []  # 한 줄 대사는 안 씀
    assert comp.memory.spoken_lines()[-1] == "흐름을 보니 왼쪽이 비었습니다."


def test_frames_for_analysis_spacing(qapp, tmp_path):
    w, comp, said, t, _ = _watcher(tmp_path)
    t["now"] = 100
    for at in (0, 50, 80, 90, 95):
        w.frames.append((at, f"f{at}".encode()))
    picked = w.frames_for_analysis(b"now")
    assert [(j, round(a)) for j, a in picked] == [(b"f50", 50), (b"f80", 20), (b"now", 0)]


def test_ask_analysis_skips_judge(qapp, tmp_path):
    w, comp, said, t, _ = _watcher(tmp_path)
    w.ask_analysis("파티 어때?")
    assert comp.judged == [] and comp.analyses[-1]["question"] == "파티 어때?" and len(comp.analyses[-1]["frames"]) == 1


def test_review_mode_keeps_watching_and_recaps_after_a_scene_ends(qapp, tmp_path):
    game = Mode("사이퍼즈", processes=["cyphers.exe"], interval_seconds=20, cooldown_seconds=120, knowledge="x",
                is_game=True)
    fight = {"speak": False, "urgent": False, "scene": "playing", "situation": "교전 중", "point": ""}
    ended = {"speak": True, "urgent": False, "scene": "playing", "situation": "아군 둘이 쓰러지고 후퇴", "point": "합류"}
    notes = [dict(fight) for _ in range(5)] + [dict(ended), dict(ended), dict(ended)]
    w, comp, said, t, _ = _watcher(tmp_path, notes=notes, modes=[game],
                                   window=WindowInfo("사이퍼즈", "cyphers.exe", (0, 0, 1900, 1000)))
    w.cfg.analysis = w.cfg.review = True
    for i in range(7):
        t["now"] = i * 5.0  # 5초마다
        w.tick()
    rec = comp.analyses[-1]
    assert rec["review"] and len(rec["frames"]) == 6  # 지난 25초 장면 6장
    assert [round(a) for _, a in rec["frames"]] == [25, 20, 15, 10, 5, 0]
    assert said == ["흐름을 보니 왼쪽이 비었습니다."]
    t["now"] = 75.0
    w.tick()  # 복기 사이 90초가 안 지나서 또 복기하지 않음 (판단은 계속)
    assert len(comp.analyses) == 1 and len(comp.judged) == 8
    t["now"] = 125.0
    w.tick()
    assert len(comp.analyses) == 2


def test_rules_reach_screen_line_and_analysis(tmp_path):
    from watch.modes import Mode

    fake = FakeAnthropic([{"speak": False, "message": "", "emotion": "normal"},
                          {"summary": "요약", "situation": "상황", "points": [], "next_steps": []}])
    mem = Memory(tmp_path / "d")
    mem.add_rule("디맥", "판정 얘기 하지 않기")
    mem.add_rule("디맥", "판정 얘기 하지 않기")  # 같은 건 한 번만
    mem.add_rule("원신", "레진 얘기 하지 않기")
    assert len(mem.rules) == 2
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), mem, None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    dj = Mode("디맥", is_game=True)

    def prompt(call):
        return " ".join(b.get("text", "") for m in call["messages"] for b in (m["content"] if isinstance(m["content"], list) else [{"text": m["content"]}]))

    comp.screen_line(b"jpeg", "DJMAX", {"situation": "곡 선택", "point": ""}, mode=dj)
    assert "판정 얘기 하지 않기" in prompt(fake.calls[-1]) and "레진" not in prompt(fake.calls[-1])
    try:
        comp.analyze([(b"jpeg", 0.0)], "DJMAX", mode=dj)
    except Exception:  # noqa: BLE001 - 가짜 응답 모양과 상관없이 보낸 내용만 본다
        pass
    assert "판정 얘기 하지 않기" in prompt(fake.calls[-1])
    mem.remove_rule(0)
    assert mem.rules_for("디맥") == [] and Memory(tmp_path / "d").rules_for("원신") == ["레진 얘기 하지 않기"]


def test_slow_screen_check_is_skipped_and_late_result_ignored(qapp, tmp_path):
    w, comp, said, t, _ = _watcher(tmp_path)
    jobs = []
    w.run_job = lambda fn, done, fail, *args: jobs.append((fn, done, fail, args))  # 끝나지 않는 확인 흉내
    statuses, acts = [], []
    w.status.connect(statuses.append)
    w.activity.connect(acts.append)
    w.timer.start(1000)
    t["now"] = 100.0
    w.tick()
    assert w.running_job and len(jobs) == 1
    fn, done, fail, args = jobs[0]
    t["now"] = 120.0
    w.tick()
    assert w.running_job and len(jobs) == 1  # 아직 기다리는 중
    t["now"] = 100.0 + 41
    w.tick()  # 너무 오래 걸림 → 버리고 다음 확인을 시작할 수 있게
    assert any("너무 오래" in s for s in statuses) and acts[-1] in ("", "start")
    assert len(jobs) == 2  # 바로 다음 확인이 시작됨
    # 버린 확인이 뒤늦게 돌아오면: 다음 단계(비싼 호출)로 안 넘어가고, 결과도 무시
    try:
        result = fn(*args)
    except Exception as exc:  # noqa: BLE001
        fail(str(exc))
    else:
        done(result)
    assert said == [] and comp.lines == [] and w.running_job  # 새 확인은 그대로 진행 중
    fn2, done2, fail2, args2 = jobs[1]
    done2(fn2(*args2))
    assert not w.running_job and said == ["경로에 얼룩이 하나 있네요."]
    w.timer.stop()


def test_pick_screen_gets_quick_advice_once(qapp, tmp_path):
    cy = _game("cy", review_on_result=True, pick_advice=True)
    pick = {"speak": False, "urgent": False, "scene": "pick", "situation": "아군: 카인, 레나 / 상대: 안 보임", "point": ""}
    notes = [dict(pick), dict(pick), {"speak": False, "urgent": False, "scene": "playing", "situation": "교전", "point": ""}]
    w, comp, said, t, _ = _watcher(tmp_path, notes=notes, modes=[cy], window=WindowInfo("C", "cy.exe", (0, 0, 1920, 1080)))
    w.tick()
    assert len(comp.lines) == 1 and comp.lines[0]["pick"] and comp.lines[0]["fast"] is True
    t["now"] = 11
    w.tick()  # 같은 픽 화면이 계속 보여도 또 말하지 않음
    assert len(comp.lines) == 1


def test_result_screen_gets_deep_review_and_signal(qapp, tmp_path):
    cy = _game("cy", review_on_result=True)
    notes = [{"speak": True, "urgent": False, "scene": "result", "situation": "패배 2킬 5데스", "point": ""}]
    w, comp, said, t, _ = _watcher(tmp_path, notes=notes, modes=[cy], window=WindowInfo("C", "cy.exe", (0, 0, 1920, 1080)))
    w.cfg.deep_result = True
    seen = []
    w.result_seen.connect(seen.append)
    acts = []
    w.activity.connect(acts.append)
    w.tick()
    assert comp.analyses[-1]["deep"] and seen == ["cy"] and "analyze_deep" in acts
    assert said == ["흐름을 보니 왼쪽이 비었습니다."]


def test_tiles_keep_native_resolution():
    from watch.capture import tiles

    parts = tiles(Image.new("RGB", (2560, 1440)))
    assert [n for n, _ in parts] == ["왼쪽 위", "오른쪽 위", "왼쪽 아래", "오른쪽 아래"]
    assert all(t.width >= 1280 and t.height >= 720 for _, t in parts)  # 줄이지 않음 (조금 겹침)
    assert [n for n, _ in tiles(Image.new("RGB", (1280, 720)))] == ["전체"]
    assert len(tiles(Image.new("RGB", (3840, 2160)))) == 6


def test_requested_analysis_waits_instead_of_dropping(qapp, tmp_path):
    w, comp, said, t, _ = _watcher(tmp_path, notes=[{"speak": False, "urgent": False, "scene": "playing",
                                                      "situation": "x", "point": ""}])
    jobs = []
    w.run_job = lambda fn, done, fail, *args: jobs.append((fn, done, fail, args))
    missed = []
    w.missed.connect(lambda: missed.append(1))
    w.tick()  # 정기 확인이 도는 중
    w.ask_analysis("외침 읽어줘")  # 그 사이 부탁 → 버리지 않고 기다림
    assert len(jobs) == 1
    fn, done, fail, args = jobs[0]
    done(fn(*args))  # 정기 확인 끝 (할 말 없음) → 기다리던 분석 시작
    assert len(jobs) == 2 and missed == []
    fn, done, fail, args = jobs[1]
    done(fn(*args))
    assert comp.analyses[-1]["question"] == "외침 읽어줘" and said == ["흐름을 보니 왼쪽이 비었습니다."]
    w.ask_now("이거 뭐야?")
    fn, done, fail, args = jobs[2]
    done(None)  # 부탁받은 게 말없이 끝나면 알림
    assert missed == [1]


def test_blocked_window_is_never_captured(qapp, tmp_path):
    w, comp, said, t, state = _watcher(tmp_path, window=WindowInfo("국민은행 - Chrome", "chrome.exe", (0, 0, 1900, 1000)))
    comp.memory.add_rule("칸코레", "국민은행", kind="skip")  # 아예 안 보기는 항상 전체
    assert comp.memory.rules[-1]["scope"] == "전체"
    w.tick()
    assert comp.judged == [] and not w.running_job  # 찍지도, 보내지도 않음
    state["window"] = WindowInfo("main.py - VS Code", "code.exe", (0, 0, 1900, 1000))
    t["now"] = 31
    w.tick()
    assert len(comp.judged) == 1
    comp.memory.add_rule("전체", "카톡", kind="skip")  # 부르는 이름으로 적어도 실행 파일로 알아봄
    assert w.blocked_word("kakaotalk.exe", "단톡방") == "카톡" and w.blocked_word("code.exe", "x") is None


def test_focus_and_dont_rules_reach_the_judge(tmp_path):
    from watch.modes import Mode

    fake = FakeAnthropic([{"speak": False, "urgent": False, "scene": "playing", "situation": "x", "point": ""}])
    mem = Memory(tmp_path / "d")
    mem.add_rule("원신", "레진이 180 넘으면 알려 주기", kind="do")
    mem.add_rule("원신", "풍경 얘기 하지 않기")
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), mem, None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    comp.judge(b"jpeg", "원신", "claude-haiku-5-5", None, mode=Mode("원신", is_game=True))
    system = fake.calls[-1]["system"][0]["text"]
    assert "챙겨 봐 달라고 한 것" in system and "레진이 180" in system and "풍경 얘기 하지 않기" in system
    blocks = comp.system_blocks()[1]["text"]
    assert "챙겨 봐 달라고 한 것" in blocks and "[원신] 레진이 180" in blocks


def test_local_sampling_judges_on_interval_or_settled_scene_change(qapp, tmp_path):
    # 회색 밝기: 0 → 10(작은 변화) → 200(장면 전환) → 200(멈춤)
    imgs = [_img(0), _img(10), _img(200), _img(200), _img(200)]
    w, comp, said, t, _ = _watcher(tmp_path, images=imgs)
    w.tick()  # 처음은 판단
    assert len(comp.judged) == 1
    t["now"] = 10
    w.tick()  # 조금 바뀜, 확인 간격(30초) 전 → 판단 안 함 (이 PC 에서만 살펴봄)
    assert len(comp.judged) == 1
    t["now"] = 20
    w.tick()  # 크게 바뀌었지만 아직 움직이는 중(멈췄는지 모름) → 기다림
    assert len(comp.judged) == 1
    t["now"] = 30
    w.last_spoke = None
    w.tick()  # 장면 전환 뒤 멈춤 → 판단
    assert len(comp.judged) == 2
    assert comp.lines[-1]["mode"] == "평소"


def test_routine_lines_use_economy_model_and_review_uses_contact_sheet(tmp_path):
    from PIL import Image as _Image

    from watch import capture as cap

    w_cfg = WatchConfig()
    assert w_cfg.economy_line_model.startswith("claude-sonnet") and w_cfg.line_quality == "auto"
    frames = [(cap.to_jpeg(_Image.new("RGB", (1920, 1080), (i * 40, 0, 0))), f"-{30 - i * 10}s") for i in range(3)]
    sheet = _Image.open(__import__("io").BytesIO(cap.contact_sheet(frames)))
    assert sheet.width == 3 * 640 and sheet.height < 1080 // 2
    fake = FakeAnthropic([{"speak": True, "summary": "요약", "situation": "", "points": [], "next_steps": [],
                           "emotion": "normal"}])
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), Memory(tmp_path / "d"), None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    jpeg = cap.to_jpeg(_Image.new("RGB", (800, 450)))
    comp.analyze([(jpeg, 25.0), (jpeg, 20.0), (jpeg, 15.0), (jpeg, 10.0), (jpeg, 5.0), (jpeg, 0.0)], "게임", review=True)
    content = fake.calls[-1]["messages"][-1]["content"]
    assert sum(1 for b in content if b.get("type") == "image") == 2  # 지난 5장은 한 장으로 + 지금 화면
