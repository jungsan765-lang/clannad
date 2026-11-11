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
              review=False, focus=None, focus_label="", history=None, captions=None):
        self.history_seen = history
        self.captions_seen = captions
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

    def perceive(self, jpeg, mode, model, flow=None, captions=None):
        self.perceived = getattr(self, "perceived", []) + [{"model": model, "flow": flow, "captions": captions}]
        return {"me": "방패를 등에 멘 채 걷는 중", "others": "없음", "place": "숲길", "ui": "체력 가득",
                "happened": "특별한 일 없음", "unsure": ""}, 0.01

    def read_captions(self, captions, model):
        self.heard = getattr(self, "heard", []) + [{"model": model, "captions": captions}]
        return {"lines": ["도박사: 밑장 빼다 걸렸네"], "summary": "속임수가 들통남"}, 0.001

    def screen_line(self, jpeg, title, note, model=None, question=None, mode=None, session_notes=None, review=False,
                    focus=None, focus_label="", pick=False, fast=None, history=None, captions=None, brain=None):
        self.line_history = history
        self.line_captions = captions
        self.line_brain = brain
        self.line_model = model
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

    w = ScreenWatcher(comp, WatchConfig(interval_seconds=30, cooldown_seconds=120, deep_result=False, dense="off",
                                        line_quality="auto"), run_job,
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
    assert m.spike == "color"  # 모델이 안 정했으면 기본 (1·3인칭 기준)
    save_mode(tmp_path / "modes", "Balatro.exe", dict(data, name="발라트로", spike="pixel"))
    assert {x.name: x.spike for x in load_modes(tmp_path / "modes")}["발라트로"] == "pixel"


def test_each_game_mode_sets_its_own_spike_rule(tmp_path):
    folder = tmp_path / "modes"
    folder.mkdir()
    (folder / "a.toml").write_text('name = "리듬"\nprocesses = ["r.exe"]\nspike = "off"\n', encoding="utf-8")
    (folder / "b.toml").write_text('name = "카드"\nprocesses = ["c.exe"]\nspike = "그림"\nspike_level = 0.2\n'
                                   'spike_busy = 0\n', encoding="utf-8")
    (folder / "c.toml").write_text('name = "필드"\nprocesses = ["f.exe"]\nspike = "이상한값"\n', encoding="utf-8")
    got = {m.name: (m.spike, m.spike_level, m.spike_busy) for m in load_modes(folder)}
    assert got == {"리듬": ("off", 0.0, 3), "카드": ("pixel", 0.2, 0), "필드": ("color", 0.0, 3)}
    shipped = {m.name: m.spike for m in load_modes(Path(__file__).resolve().parents[1] / "modes")}
    assert shipped["디맥"] == "off" and shipped["칸코레"] == "pixel" and shipped["붉은사막"] == "color"


def test_sampler_follows_the_game_spike_rule(tmp_path):
    from watch.sampler import FrameSampler

    t = {"now": 0.0}
    shade = {"v": 10}
    s = FrameSampler(lambda: _img(shade["v"]), clock=lambda: t["now"])
    s.configure("off")
    s.capture_once()
    shade["v"] = 240
    t["now"] = 0.5
    s.capture_once()
    assert s.spike_at is None  # 리듬 게임: 번쩍여도 바로 보지 않음
    s.configure("pixel", 0.3)
    assert s.spike == 0.3
    from PIL import ImageDraw

    world = Image.fromarray(_world()[:, :1920].copy())
    popup = world.copy()
    ImageDraw.Draw(popup).rectangle((560, 300, 1360, 780), fill=(60, 50, 40))  # 가운데에 창이 뜸 (진격/철수 같은)
    for by, expect in (("color", None), ("pixel", 1.5)):
        s.configure(by)
        s.spike_at = None
        s.grab = lambda: world
        t["now"] = 1.0
        s.capture_once()
        s.spike_at = None
        s.grab = lambda: popup
        t["now"] = 1.5
        s.capture_once()
        assert s.spike_at == expect, by  # 3D 기준으론 작은 변화, 고정 화면 2D 기준으론 사건
    assert s.spike == 0.05


def _subtitle(base, text):
    from PIL import ImageDraw, ImageFont

    img = base.copy()
    font = ImageFont.truetype("DejaVuSans.ttf", 40) if _has_font() else ImageFont.load_default(40)
    ImageDraw.Draw(img).text((500, 900), text, font=font, fill=(245, 245, 245), stroke_width=2, stroke_fill=(0, 0, 0))
    return img


def _has_font():
    from PIL import ImageFont

    try:
        ImageFont.truetype("DejaVuSans.ttf", 10)
        return True
    except OSError:
        return False


def test_subtitles_are_kept_once_per_new_line_at_full_size(tmp_path):
    from watch.layout import DEFAULT_TEXT_BOX
    from watch.sampler import FrameSampler

    world = _world()
    t = {"now": 0.0}
    state = {"img": None}
    s = FrameSampler(lambda: state["img"], clock=lambda: t["now"])
    s.set_text_boxes([DEFAULT_TEXT_BOX])
    script = ([Image.fromarray(world[:, x:x + 1920].copy()) for x in (0, 100, 200)]  # 자막 없음 (풍경만)
              + [_subtitle(Image.fromarray(world[:, x:x + 1920].copy()), "You were dealing from the bottom.")
                 for x in (300, 400, 500, 600)]  # 같은 대사가 떠 있는 동안 배경은 움직임
              + [_subtitle(Image.fromarray(world[:, 700:2620].copy()), "Then I'll take that hand of yours.")])
    for i, img in enumerate(script):
        t["now"] = i * 0.5
        state["img"] = img
        s.capture_once()
    caps = s.captions(10)
    assert [label.split(")")[0] for label, _ in caps] == ["(자막·대사 자리", "(자막·대사 자리"]  # 새 대사 두 줄만
    assert caps[0][0].endswith("2.0초 전") and caps[1][0].endswith("0.0초 전")
    w = Image.open(__import__("io").BytesIO(caps[0][1])).width
    assert w == 1100  # 작은 사진(480)이 아니라 글자가 읽히는 크기
    s.set_text_boxes([])
    assert s.captions(10) == []
    s.set_text_boxes([DEFAULT_TEXT_BOX])  # 한 글자씩 써지는 대사는 다 써진 것만
    line = "Then I'll take that hand of yours."
    for i, n in enumerate((8, 16, 24, len(line)), 20):
        t["now"] = i * 0.5
        state["img"] = _subtitle(Image.fromarray(world[:, 300:2220].copy()), line[:n])
        s.capture_once()
    assert len(s.captions(10)) == 1


def test_layouts_clean_describe_and_pick_text_boxes(tmp_path):
    from datetime import datetime, timedelta

    from watch.layout import DEFAULT_TEXT_BOX, Layouts, clean_regions

    now = {"t": datetime(2026, 11, 11, 20, 0)}
    lay = Layouts(tmp_path / "layout", clock=lambda: now["t"])
    assert lay.text_boxes("붉은사막") == [DEFAULT_TEXT_BOX] and lay.describe("붉은사막") == ""
    raw = [{"name": "체력바", "kind": "hp", "box": [0.02, 0.9, 0.25, 0.96], "when": "항상"},
           {"name": "미니맵", "kind": "minimap", "box": [0.97, 0.03, 0.82, 0.25], "when": ""},  # 뒤집힌 상자도 바로잡음
           {"name": "x", "kind": "이상함", "box": [0.1, 0.1], "when": ""},  # 상자가 깨짐 → 버림
           {"name": "화면 전체", "kind": "other", "box": [0, 0, 1, 1], "when": ""}]  # 화면 대부분 → 버림
    assert [r["name"] for r in clean_regions(raw)] == ["체력바", "미니맵"]
    lay.mark_try("붉은사막", "playing")
    assert lay.tried_recently("붉은사막", "playing")
    now["t"] += timedelta(minutes=30)
    assert not lay.tried_recently("붉은사막", "playing")
    lay.save("붉은사막", "playing", raw)
    lay.save("붉은사막", "cutscene", [{"name": "자막", "kind": "subtitle", "box": [0.2, 0.82, 0.8, 0.93], "when": "대화 중"}])
    again = Layouts(tmp_path / "layout")  # 파일에서 다시 읽어도 그대로
    assert again.learned("붉은사막", "playing") and again.learned("붉은사막", "cutscene")
    assert again.text_boxes("붉은사막") == [("자막", (0.2, 0.82, 0.8, 0.93))]  # 흔한 자리 안이라 그것만
    again.save("칸코레", "playing", [{"name": "대화창", "kind": "dialogue", "box": [0.02, 0.05, 0.4, 0.25], "when": ""}])
    assert again.text_boxes("칸코레") == [("대화창", (0.02, 0.05, 0.4, 0.25)), DEFAULT_TEXT_BOX]  # 위쪽 대화창 + 아래 자막 자리
    text = again.describe("붉은사막")
    assert "체력바(체력·자원): 왼쪽 아래" in text and "미니맵(미니맵·지도): 오른쪽 위 [0.82, 0.03, 0.97, 0.25]" in text
    assert "자막(자막): 아래 가운데" in text and "UI 다" in text
    again.forget("붉은사막")
    assert not again.learned("붉은사막", "playing") and again.text_boxes("붉은사막") == [DEFAULT_TEXT_BOX]


def test_watcher_learns_layout_once_in_a_quiet_moment_and_reads_subtitles(qapp, tmp_path):
    from watch.layout import Layouts
    from watch.modes import Mode as _Mode

    game = _Mode("붉은사막", processes=["cd.exe"], interval_seconds=20, cooldown_seconds=60, knowledge="x", is_game=True)
    notes = [{"speak": True, "urgent": False, "scene": "playing", "situation": "보스전", "point": "감탄", "read_box": []}] \
        + [{"speak": False, "urgent": False, "scene": "playing", "situation": "이동", "point": "", "read_box": []}] * 3
    w, comp, said, t, _ = _watcher(tmp_path, images=[_img(40 + i * 9) for i in range(20)], modes=[game], notes=notes,
                                   window=WindowInfo("CD", "cd.exe", (0, 0, 1900, 1000)))
    learned = []

    def learn_layout(jpeg, name, scene, model):
        learned.append((name, scene, model))
        return [{"name": "대화창", "kind": "dialogue", "box": [0.15, 0.75, 0.85, 0.95], "when": "대화 중"},
                {"name": "체력바", "kind": "hp", "box": [0.02, 0.9, 0.25, 0.96], "when": "항상"}], 0.01

    comp.learn_layout = learn_layout
    w.layouts = Layouts(tmp_path / "layout")
    w.cfg.dense = "game"
    w.sampler.set_active = lambda on: None
    w.update_mode()
    assert w.sampler.text_boxes and w.sampler.text_boxes[0][0] == "자막·대사 자리"  # 아직 모를 땐 흔한 자리
    w.tick()  # 말할 순간 → 배치는 미룸
    assert learned == [] and len(said) == 1
    for i in range(1, 4):
        t["now"] = i * 40
        w.tick()
    assert learned == [("붉은사막", "playing", "claude-sonnet-5-5")]  # 조용한 순간에 한 번만
    assert w.sampler.text_boxes == [("대화창", (0.15, 0.75, 0.85, 0.95))]  # 익힌 자리로
    w.sampler._captions.append(__import__("watch.sampler", fromlist=["Caption"]).Caption(t["now"] + 39, "대화창", b"jpg", None))
    t["now"] = 160
    comp.notes = [{"speak": True, "urgent": False, "scene": "cutscene", "situation": "대화", "point": "", "read_box": []}]
    w.tick()
    assert comp.captions_seen == [("(대화창) 1.0초 전", b"jpg")]
    assert w.relearn_layout() == "붉은사막" and not w.layouts.learned("붉은사막", "playing")


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
    assert w_cfg.economy_line_model == "claude-haiku-5-5"  # '가볍게'의 반응 한마디는 가장 싼 모델
    assert w_cfg.line_quality == "brain_lite" and w_cfg.calm_backoff  # 기본은 나눠 보기 · 절약
    assert w_cfg.mid_line_model.startswith("claude-sonnet")
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


def test_judge_read_box_zooms_small_text_for_the_line(qapp, tmp_path):
    note = {"speak": True, "urgent": False, "scene": "cutscene", "situation": "대사 장면", "point": "대사 내용",
            "read_box": [0.1, 0.8, 0.5, 0.95]}
    w, comp, said, t, _ = _watcher(tmp_path, notes=[dict(note, scene="playing")])
    seen = {}
    real = comp.screen_line

    def capture(*args, **kw):
        seen["focus"], seen["label"] = kw.get("focus"), kw.get("focus_label")
        return real(*args, **kw)

    comp.screen_line = capture
    w.tick()
    assert seen["focus"] and "작은 글씨" in seen["label"]
    from io import BytesIO

    crop = Image.open(BytesIO(seen["focus"]))
    assert crop.width >= 700  # 원래 해상도(1920)에서 잘라 키움
    # 엉뚱한 상자는 무시
    w2, comp2, _, _, _ = _watcher(tmp_path / "b", notes=[dict(note, scene="playing", read_box=[0, 0, 1, 1])])
    w2.tick()
    assert getattr(w2, "_current_focus", (None, ""))[0] is None


def test_screen_line_can_remember_but_caps_importance(tmp_path):
    fake = FakeAnthropic([{"speak": True, "message": "토요일 약속 잡으셨네요.", "emotion": "happy", "action": "none",
                           "target": "", "important": False,
                           "remember": [{"category": "약속·할 일", "text": "주인님은 토요일 7시에 강남에서 약속이 있다.",
                                         "importance": 3, "subject": ""}]}])
    mem = Memory(tmp_path / "d")
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), mem, None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    r = comp.screen_line(b"jpeg", "카카오톡", {"situation": "약속 잡는 대화", "point": ""})
    assert r.speak and [(f["importance"], f["category"]) for f in mem.active_facts()] == [(2, "약속·할 일")]


def test_quiet_screens_stretch_the_interval_outside_games(qapp, tmp_path):
    quiet = {"speak": False, "urgent": False, "scene": "other", "situation": "영상 시청", "point": ""}
    w, comp, said, t, _ = _watcher(tmp_path, notes=[dict(quiet) for _ in range(10)])
    base = w.interval_for(w.mode)
    for i in range(6):
        t["now"] = i * 301.0  # 간격이 늘어나도 매번 확인 시점이 지나게
        w.tick()
    assert w._quiet_streak == 6 and w.interval_for(w.mode) == base * 4
    w._quiet_streak = 0
    assert w.interval_for(w.mode) == base
    w._quiet_streak = 99
    assert w.interval_for(w.mode) == 300.0  # 최대 5분


def test_small_changing_window_does_not_trigger_scene_checks(qapp, tmp_path):
    from watch import capture as cap

    imgs = [_img(50)] * 20
    w, comp, said, t, state = _watcher(tmp_path, images=imgs, window=WindowInfo("player", "vlc.exe", (100, 100, 420, 300)))
    n = {"v": 0}

    def changing_window(_img_):  # 작은 창 속 영상: 매번 다름
        n["v"] = (n["v"] + 60) % 250
        return cap.to_jpeg(Image.new("RGB", (320, 200), (n["v"], 0, 0)), 80)

    w._focus_crop = changing_window
    for i in range(7):  # 10초마다 70초
        t["now"] = i * 10.0
        w.last_spoke = None
        w.tick()
    assert 2 <= len(comp.judged) <= 3 and comp.focus_seen  # 확인 간격(30초)대로만 (예전엔 10초마다)



def test_dense_watching_sends_the_last_seconds_in_order(qapp, tmp_path):
    from watch.modes import Mode as _Mode

    game = _Mode("붉은사막", processes=["cd.exe"], interval_seconds=20, cooldown_seconds=60, knowledge="x", is_game=True)
    imgs = [_img(v) for v in range(0, 250, 5)]
    w, comp, said, t, _ = _watcher(tmp_path, images=imgs, modes=[game],
                                   window=WindowInfo("Crimson", "cd.exe", (0, 0, 1900, 1000)))
    w.cfg.dense = "game"
    w.update_mode()
    assert w.dense_active(w.mode) and w.interval_for(w.mode) == 5.0
    for i in range(10):  # 0.5초마다 이 PC 에서 찍음 (테스트에선 직접)
        t["now"] = i * 0.5
        w.sampler.capture_once()
    w.sampler.set_active = lambda on: None  # 테스트에선 뒤 스레드를 켜지 않음
    t["now"] = 5.0
    w.tick()
    hist = comp.history_seen
    assert [label.split(")")[0] for label, _ in hist] == [f"({i}/10" for i in range(1, 11)]  # 순서대로 번호
    assert hist[0][0].endswith("5.0초 전") and hist[-1][0].endswith("0.5초 전")
    assert comp.line_history == hist  # 대사에도 같이
    w.cfg.dense = "off"
    assert not w.dense_active(w.mode) and w.interval_for(w.mode) == 20


def test_sudden_change_is_judged_without_waiting(qapp, tmp_path):
    from watch.modes import Mode as _Mode

    game = _Mode("사이퍼즈", processes=["cy.exe"], interval_seconds=20, cooldown_seconds=60, knowledge="x", is_game=True)
    w, comp, said, t, _ = _watcher(tmp_path, images=[_img(40)] * 30, modes=[game],
                                   window=WindowInfo("C", "cy.exe", (0, 0, 1900, 1000)))
    w.cfg.dense = "game"
    w.sampler.set_active = lambda on: None
    w.sampler.active = True
    vals = iter([40, 40, 40, 200, 200, 200])
    w.sampler.grab = lambda: _img(next(vals))
    w.update_mode()
    w.tick()  # 처음 판단 (t=0)
    assert len(comp.judged) == 1
    for i in range(1, 4):  # 0.5초마다, 1.5초째에 확 바뀜
        t["now"] = i * 0.5
        w.sampler.capture_once()
    w._check_spike()  # 아직 판단 뒤 2초가 안 됨
    assert len(comp.judged) == 1
    t["now"] = 2.5
    w.sampler.capture_once()
    w._check_spike()  # 5초를 기다리지 않고 바로 (말을 쉬는 중이어도 흐름은 봄)
    assert len(comp.judged) == 2



def test_sampler_keeps_recent_seconds_and_measures_motion(tmp_path):
    from watch.sampler import FrameSampler

    t = {"now": 0.0}
    vals = iter(range(0, 250, 10))
    s = FrameSampler(lambda: _img(next(vals)), clock=lambda: t["now"], keep_seconds=3.0)
    for i in range(10):
        t["now"] = i * 0.5
        s.capture_once()
    assert len(s.recent(10)) == 7  # 3초치만 들고 있음
    frames = s.recent(2.0)
    assert len(frames) == 5 and s.motion(frames) > 0.03
    assert s.sheet(frames[:1]) is None and s.sheet(frames)


def _world():
    """게임 같은 넓은 장면 (하늘·땅·여러 색 덩어리). 카메라가 이 위를 훑는다."""
    import numpy as np

    rng = np.random.default_rng(7)
    blocks = rng.integers(0, 255, size=(9, 40, 3)).astype(np.uint8)
    blocks[:3] = (90, 150, 220)  # 위쪽은 하늘
    return np.asarray(Image.fromarray(blocks).resize((4000, 1080), Image.Resampling.BILINEAR))


def test_camera_turn_is_not_a_spike_but_blackout_is(tmp_path):
    from watch.sampler import FrameSampler

    world = _world()
    t = {"now": 0.0}
    views = iter([Image.fromarray(world[:, x:x + 1920].copy()) for x in range(0, 2000, 150)])
    s = FrameSampler(lambda: next(views), clock=lambda: t["now"])
    for i in range(13):  # 0.5초마다 150px씩 (꽤 빠르게) 화면을 돌림
        t["now"] = i * 0.5
        s.capture_once()
    assert s.spike_at is None  # 그림은 많이 바뀌어도 색 구성·밝기는 그대로 → 사건 아님
    s.grab = lambda: Image.new("RGB", (1920, 1080), (5, 5, 5))  # 암전 (죽음·장면 전환)
    t["now"] = 7.0
    s.capture_once()
    assert s.spike_at == 7.0
    red = world[:, :1920].astype(float)
    red[..., 1:] *= 0.25  # 화면이 빨갛게 (피격·죽음 연출)
    s.grab = lambda: Image.fromarray(red.astype("uint8"))
    t["now"] = 7.5
    s.capture_once()
    assert s.spike_at == 7.5


def test_too_frequent_spikes_are_treated_as_busy_scene(tmp_path):
    from watch.sampler import FrameSampler

    t = {"now": 0.0}
    shade = {"v": 10}
    s = FrameSampler(lambda: _img(shade["v"]), clock=lambda: t["now"])
    seen = []
    for i in range(8):  # 0.5초마다 번쩍번쩍 (난전·연출)
        t["now"] = i * 0.5
        shade["v"] = 240 if i % 2 else 10
        s.capture_once()
        seen.append(s.spike_at)
    assert seen[1] == 0.5 and seen[2] == 1.0  # 처음 두 번은 바로 판단 거리
    assert all(v == 1.0 for v in seen[3:])  # 3초 안에 계속 바뀌면 그냥 5초 박자대로
    shade["v"] = 10
    for i in range(8, 14):  # 잠잠해졌다가
        t["now"] = i * 0.5
        s.capture_once()
    shade["v"] = 240
    t["now"] = 7.5
    s.capture_once()  # 다시 한 번 확 바뀌면 바로
    assert s.spike_at == 7.5


def test_routine_screen_line_is_lightweight(tmp_path):
    from PIL import Image as _Image

    from watch import capture as cap

    fake = FakeAnthropic([{"speak": True, "message": "와, 방금 그 회피 소름 돋았습니다.", "emotion": "surprised"}])
    mem = Memory(tmp_path / "d")
    for i in range(12):
        mem.add_turn(f"말 {i}", f"대답 {i}")
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), mem, None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    big = cap.to_jpeg(_Image.new("RGB", (1920, 1080), (20, 40, 60)), 85)
    comp.screen_line(big, "붉은사막", {"situation": "보스전", "point": "감탄"}, model="claude-haiku-5-5")
    call = fake.calls[-1]
    assert call["model"] == "claude-haiku-5-5" and len(call["messages"]) <= 9  # 최근 대화 4번만 (+ 지금)
    import base64
    import io

    img = next(b for b in call["messages"][-1]["content"] if b.get("type") == "image")
    assert _Image.open(io.BytesIO(base64.b64decode(img["source"]["data"]))).width == 1280


def test_capturing_keeps_running_while_talking_or_outside_games(qapp, tmp_path):
    w, comp, said, t, state = _watcher(tmp_path)
    w.cfg.dense = "game"
    calls = []
    w.sampler.set_active = lambda on: calls.append(on)
    w.timer.start(1000)
    w.can_run = lambda: False  # 말하는 중·말풍선이 떠 있음
    w.tick()
    assert calls[-1] is True  # 평소 모드·말하는 중이어도 계속 찍음
    w.companion.memory.add_rule("전체", "VS Code", kind="skip")  # 보지 말라고 한 창이 앞에 → 멈춤
    w.tick()
    assert calls[-1] is False
    w.timer.stop()


def test_judge_and_line_get_layout_and_subtitles(tmp_path):
    from watch.layout import Layouts
    from watch.modes import Mode as _Mode

    from watch import capture as cap

    fake = FakeAnthropic([
        {"regions": [{"name": "자막", "kind": "subtitle", "box": [0.2, 0.82, 0.8, 0.93], "when": "대화 중"},
                     {"name": "체력바", "kind": "hp", "box": [0.02, 0.9, 0.25, 0.96], "when": "항상"}]},
        {"speak": True, "urgent": False, "scene": "cutscene", "situation": "도박판에서 밑장 빼다 걸려 손을 자르겠다고 협박",
         "point": "긴장", "read_box": []},
        {"speak": True, "message": "와, 판이 완전히 뒤집혔네요.", "emotion": "surprised"},
    ])
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), Memory(tmp_path / "d"), None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    comp.layouts = Layouts(tmp_path / "layout")
    game = _Mode("붉은사막", knowledge="x", is_game=True)
    shot = cap.to_jpeg(Image.new("RGB", (1920, 1080), (30, 30, 30)), 80)
    regions, _ = comp.learn_layout(shot, "붉은사막", "cutscene", "claude-sonnet-5-5")
    call = fake.calls[-1]
    assert call["model"] == "claude-sonnet-5-5" and "화면 배치 익히기" in call["system"][0]["text"]
    comp.layouts.save("붉은사막", "cutscene", regions)
    caps = [("(자막) 2.5초 전", shot), ("(자막) 0.5초 전", shot)]
    comp.judge(shot, "CD", "claude-haiku-5-5", None, mode=game, captions=caps)
    call = fake.calls[-1]
    system = call["system"][0]["text"]
    assert "붉은사막 화면 배치" in system and "체력바(체력·자원): 왼쪽 아래" in system and "난전·싸움" in system
    texts = [b.get("text", "") for b in call["messages"][-1]["content"] if b.get("type") == "text"]
    assert any(t.startswith("[자막·대사: 최근 몇 초") for t in texts) and "(자막) 2.5초 전" in texts
    images = [b for b in call["messages"][-1]["content"] if b.get("type") == "image"]
    assert len(images) == 3  # 지금 화면 + 자막 두 줄
    comp.screen_line(shot, "CD", {"situation": "협박", "point": "긴장"}, model="claude-haiku-5-5", mode=game, captions=caps)
    content = fake.calls[-1]["messages"][-1]["content"]
    assert any("(자막) 0.5초 전" == b.get("text") for b in content)
    assert "붉은사막 화면 배치" in content[-1]["text"]


def test_brain_mode_lets_helpers_look_first_and_opus_speak_last(qapp, tmp_path):
    from watch.modes import Mode as _Mode
    from watch.sampler import Caption

    game = _Mode("붉은사막", processes=["cd.exe"], interval_seconds=20, cooldown_seconds=60, knowledge="x", is_game=True)
    w, comp, said, t, _ = _watcher(tmp_path, images=[_img(40 + i * 9) for i in range(20)], modes=[game],
                                   window=WindowInfo("CD", "cd.exe", (0, 0, 1900, 1000)))
    w.cfg.line_quality = "brain"
    w.cfg.dense = "game"
    w.sampler.set_active = lambda on: None
    w.update_mode()
    for i in range(11):
        t["now"] = i * 0.5
        w.sampler.capture_once()
    w.sampler._captions.append(Caption(4.0, "자막", b"cap", None))
    w.tick()
    assert said == ["경로에 얼룩이 하나 있네요."]
    assert comp.perceived[0]["model"] == "claude-sonnet-5-5" and len(comp.perceived[0]["flow"]) == 5  # 눈 담당: 흐름 절반
    assert comp.perceived[0]["captions"] == [("(자막) 1.0초 전", b"cap")]
    assert comp.heard[0]["model"] == "claude-haiku-5-5"  # 대사 담당은 싼 모델
    assert comp.line_model == "claude-opus-5-5"  # 마지막 말은 Opus 가
    assert comp.line_brain["scene"]["me"] == "방패를 등에 멘 채 걷는 중"
    assert comp.line_brain["dialogue"]["summary"] == "속임수가 들통남"
    assert comp.line_history is None and comp.line_captions is None  # Opus 엔 정리한 글 + 지금 화면만 (비용)
    assert any("자세히 본 장면: 방패를 등에 멘" in n for n in w.session.notes)
    comp.perceive = lambda *a, **k: (_ for _ in ()).throw(RuntimeError("서버 오류"))  # 눈 담당이 실패해도
    t["now"] = 100
    w.tick()
    assert len(said) == 2 and comp.line_brain["scene"] is None  # 나머지로 말한다


def test_opus_gets_helper_notes_and_checks_against_the_screen(tmp_path):
    from watch import capture as cap
    from watch.modes import Mode as _Mode

    fake = FakeAnthropic([
        {"me": "방패를 등에 멘 채 걷는 중", "others": "없음", "place": "숲길", "ui": "체력 가득", "happened": "특별한 일 없음",
         "unsure": "오른손에 든 것"},
        {"lines": ["도박사: 밑장 빼다 걸렸네"], "summary": "속임수가 들통남"},
        {"speak": True, "message": "숲길 바람 좋네요.", "emotion": "happy"},
    ])
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), Memory(tmp_path / "d"), None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    game = _Mode("붉은사막", knowledge="x", is_game=True)
    big = cap.to_jpeg(Image.new("RGB", (1920, 1080), (20, 60, 30)), 85)
    scene, _ = comp.perceive(big, game, "claude-sonnet-5-5", flow=[("(1/2) 1.0초 전", big), ("(2/2) 0.5초 전", big)])
    call = fake.calls[-1]
    assert call["model"] == "claude-sonnet-5-5" and "눈 담당" in call["system"][0]["text"]
    assert "등에 멘 방패" in call["system"][0]["text"]
    heard, _ = comp.read_captions([("(자막) 1.0초 전", big)], "claude-haiku-5-5")
    assert fake.calls[-1]["model"] == "claude-haiku-5-5" and heard["summary"] == "속임수가 들통남"
    assert comp.read_captions([], "claude-haiku-5-5") == (None, 0.0)  # 자막이 없으면 부르지 않음
    reply = comp.screen_line(big, "CD", {"situation": "방패를 들고 걷는 중", "point": "감탄"}, model="claude-opus-5-5",
                             mode=game, brain={"scene": scene, "dialogue": heard})
    assert reply.speak
    call = fake.calls[-1]
    text = call["messages"][-1]["content"][-1]["text"]
    assert "여럿이 나눠 본 것" in text and "다르면 화면을 믿는다" in text
    assert "눈 담당(장면): 주인님 캐릭터: 방패를 등에 멘 채 걷는 중" in text and "확실하지 않음: 오른손에 든 것" in text
    assert "대사 담당(자막): 도박사: 밑장 빼다 걸렸네 → 속임수가 들통남" in text
    assert "판단 담당(작은 사진으로 대충 본 것): 방패를 들고 걷는 중" in text
    import base64
    import io

    img = next(b for b in call["messages"][-1]["content"] if b.get("type") == "image")
    assert Image.open(io.BytesIO(base64.b64decode(img["source"]["data"]))).width == 1280  # 자세한 건 눈 담당이 원본으로


def test_scan_zooms_into_marked_things_and_tells_only_good_ones(qapp, tmp_path):
    from watch.modes import Mode as _Mode
    from watch.scan import SeenThings

    game = _Mode("붉은사막", processes=["cd.exe"], interval_seconds=20, cooldown_seconds=60, knowledge="x", is_game=True)
    look = [{"what": "머리 위 느낌표가 뜬 상인", "box": [0.40, 0.30, 0.48, 0.60]},
            {"what": "평범한 경비병", "box": [0.60, 0.30, 0.66, 0.60]},
            {"what": "화면 전체", "box": [0, 0, 1, 1]}]  # 잘못 짚은 것은 버림
    quiet = {"speak": False, "urgent": False, "scene": "playing", "situation": "마을", "point": "", "read_box": [],
             "look": look}
    w, comp, said, t, _ = _watcher(tmp_path, images=[_img(40 + i * 11) for i in range(20)], modes=[game],
                                   notes=[dict(quiet), dict(quiet), dict(quiet, look=[])],
                                   window=WindowInfo("CD", "cd.exe", (0, 0, 1900, 1000)))
    w.seen = SeenThings(tmp_path / "scan")
    inspected, weighed = [], []

    def inspect_spot(jpeg, what, mode, model):
        inspected.append((what, model, Image.open(__import__("io").BytesIO(jpeg)).size))
        if "상인" in what:
            return {"kind": "npc", "name": "떠돌이 상인 로안", "info": "머리 위 느낌표, 퀘스트: 잃어버린 짐", "clear": True}, 0.0
        return {"kind": "npc", "name": "경비병", "info": "표시 없음", "clear": True}, 0.0

    def weigh_spots(found, mode, model):
        weighed.append([f["name"] for f in found])
        return {"items": [{"name": "떠돌이 상인 로안", "importance": 3, "why": "보상으로 희귀 말 안장",
                           "say": "로안 퀘스트 보상이 희귀 말 안장이다"},
                          {"name": "경비병", "importance": 1, "why": "평범", "say": ""}]}, 0.0

    comp.inspect_spot, comp.weigh_spots = inspect_spot, weigh_spots
    w.update_mode()
    w.tick()
    assert [x[0] for x in inspected] == ["머리 위 느낌표가 뜬 상인", "평범한 경비병"]  # 상자 하나는 버림
    assert all(m == "claude-haiku-5-5" for _, m, _ in inspected) and max(inspected[0][2]) >= 400  # 작은 조각은 키워서
    assert weighed == [["떠돌이 상인 로안", "경비병"]]
    assert said == ["경로에 얼룩이 하나 있네요."]  # 판단 담당은 조용히였지만 좋은 걸 찾아서 알림
    assert "알아본 것 알려 드리기: 로안 퀘스트 보상이 희귀 말 안장이다" in comp.lines[-1]["note"]["point"]
    assert any("알아봄: 떠돌이 상인 로안" in n for n in w.session.notes)
    assert not any("경비병" in n for n in w.session.notes)  # 별것 아닌 건 판 기록에도 안 남김
    assert [x["name"] for x in w.seen.items("붉은사막")] == ["떠돌이 상인 로안", "경비병"]
    t["now"] = 30  # 같은 자리를 또 짚어도 (2분 안) 다시 안 봄
    w.tick()
    assert len(inspected) == 2 and len(said) == 1
    w._scanned.clear()
    t["now"] = 200  # 2분이 지나 다시 봐도, 이름으로 아는 것은 판정하지 않음
    comp.notes = [dict(quiet)]
    w.tick()
    assert len(inspected) == 4 and weighed == [["떠돌이 상인 로안", "경비병"]]
    assert "떠돌이 상인 로안(인물, 알려 드림)" in w.seen.brief("붉은사막")
    comp.weigh_spots = lambda *a: (None, 0.0)  # 판정 담당이 실패하면
    comp.inspect_spot = lambda *a: ({"kind": "item", "name": "빛나는 상자", "info": "금색", "clear": True}, 0.0)
    w._scanned.clear()
    t["now"] = 400
    comp.notes = [dict(quiet)]
    w.tick()
    assert w.seen.known("붉은사막", "빛나는 상자") is None  # 별것 아닌 걸로 굳히지 않고 다음에 다시
    w.seen.add("붉은사막", [{"name": "이름 모름", "kind": "npc", "importance": 1}])
    assert all(x["name"] != "이름 모름" for x in w.seen.items("붉은사막"))


def test_inspect_and_weigh_use_cheap_model_with_knowledge(tmp_path):
    from watch import capture as cap
    from watch.modes import Mode as _Mode

    fake = FakeAnthropic([
        {"kind": "npc", "name": "로안", "info": "머리 위 느낌표", "clear": True},
        {"items": [{"name": "로안", "importance": 3, "why": "보상 좋음", "say": "로안 보상 좋음"}]},
    ])
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), Memory(tmp_path / "d"), None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    game = _Mode("붉은사막", knowledge="x", is_game=True)
    piece = cap.to_jpeg(Image.new("RGB", (400, 400), (90, 80, 70)), 85)
    spot, _ = comp.inspect_spot(piece, "느낌표 뜬 상인", game, "claude-haiku-5-5")
    call = fake.calls[-1]
    assert spot["name"] == "로안" and call["model"] == "claude-haiku-5-5" and "확대 담당" in call["system"][0]["text"]
    assert "짚은 이유: 느낌표 뜬 상인" in call["messages"][-1]["content"][-1]["text"]
    verdict, _ = comp.weigh_spots([dict(spot, what="느낌표 뜬 상인")], game, "claude-haiku-5-5")
    call = fake.calls[-1]
    assert verdict["items"][0]["importance"] == 3 and "판정 담당" in call["system"][0]["text"]
    assert "로안 (npc, 잘 보임): 머리 위 느낌표" in call["messages"][-1]["content"]
    assert comp.weigh_spots([], game, "claude-haiku-5-5") == (None, 0.0)
    text = Companion.brain_text({"found": [{"name": "로안", "info": "느낌표", "say": "보상 좋음"}]})
    assert "둘러보기 담당(확대해서 알아본 것, 알릴 만하다고 판정): 로안: 느낌표 → 보상 좋음" in text


def test_local_ocr_reads_subtitles_so_ai_gets_text_not_pictures(tmp_path):
    import local_ocr
    from watch.layout import DEFAULT_TEXT_BOX
    from watch.sampler import FrameSampler

    assert local_ocr.read_text(Image.new("RGB", (10, 10))) is None or __import__("sys").platform == "win32"
    world = _world()
    t = {"now": 0.0}
    state = {"img": None, "ocr": "도박사: 밑장 빼다 걸렸네"}
    s = FrameSampler(lambda: state["img"], clock=lambda: t["now"])
    s.set_text_boxes([DEFAULT_TEXT_BOX])
    s.ocr = lambda img: state["ocr"]
    state["img"] = _subtitle(Image.fromarray(world[:, :1920].copy()), "You were dealing from the bottom.")
    s.capture_once()
    assert s.captions(5) == [("(자막·대사 자리) 0.0초 전", "도박사: 밑장 빼다 걸렸네")]  # 사진 대신 글
    state["ocr"] = ""  # 글자 인식이 '글자 없음' → 글자처럼 보였던 풍경이라 버림
    t["now"] = 0.5
    state["img"] = _subtitle(Image.fromarray(world[:, 300:2220].copy()), "Then I'll take that hand of yours.")
    s.capture_once()
    assert len(s.captions(5)) == 1
    state["ocr"] = None  # 글자 인식을 못 쓰면 사진으로
    t["now"] = 1.0
    s.capture_once()
    assert isinstance(s.captions(5)[-1][1], bytes) and s.latest_caption_at() == 1.0


def test_caption_text_skips_the_dialogue_ai(tmp_path):
    from watch import capture as cap

    fake = FakeAnthropic([{"lines": ["로안: 짐을 찾아 주게"], "summary": "부탁"}])
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), Memory(tmp_path / "d"), None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    heard, usd = comp.read_captions([("(자막) 1.0초 전", "도박사: 밑장 빼다 걸렸네")], "claude-haiku-5-5")
    assert heard == {"lines": ["(자막) 1.0초 전: 도박사: 밑장 빼다 걸렸네"], "summary": ""} and usd == 0 and not fake.calls
    pic = cap.to_jpeg(Image.new("RGB", (600, 80)), 80)
    heard, _ = comp.read_captions([("(자막) 2.0초 전", "도박사: 밑장"), ("(자막) 1.0초 전", pic)], "claude-haiku-5-5")
    content = fake.calls[-1]["messages"][-1]["content"]
    assert sum(1 for b in content if b.get("type") == "image") == 1  # 못 읽은 것만 사진으로
    assert heard["lines"] == ["(자막) 2.0초 전: 도박사: 밑장", "로안: 짐을 찾아 주게"]
    blocks = comp._caption_blocks([("(자막) 1.0초 전", "도박사: 밑장"), ("(자막) 0.5초 전", pic)])
    assert {"type": "text", "text": "(자막) 1.0초 전: 도박사: 밑장"} in blocks and blocks[-1]["type"] == "image"


def test_calm_walking_slows_judging_but_new_lines_and_spikes_do_not_wait(qapp, tmp_path):
    from watch.modes import Mode as _Mode
    from watch.sampler import Caption

    game = _Mode("붉은사막", processes=["cd.exe"], interval_seconds=20, cooldown_seconds=60, knowledge="x", is_game=True)
    calm = {"speak": False, "urgent": False, "scene": "playing", "situation": "이동", "point": "", "read_box": [], "look": []}
    w, comp, said, t, _ = _watcher(tmp_path, images=[_img(40 + i * 7) for i in range(30)], modes=[game],
                                   notes=[dict(calm) for _ in range(8)],
                                   window=WindowInfo("CD", "cd.exe", (0, 0, 1900, 1000)))
    w.cfg.dense = "game"
    w.sampler.set_active = lambda on: None
    w.update_mode()
    assert w.interval_for(game) == 5
    for i in range(3):
        t["now"] = i * 5
        w.tick()
    assert w._calm == 3 and w.interval_for(game) == 10  # 그냥 돌아다니는 중이면 10초
    w._calm = 6
    assert w.interval_for(game) == 15  # 오래가면 15초
    w.last_judged = 100.0
    t["now"] = 101.0
    assert not w._spiked()
    w.sampler._captions.append(Caption(100.5, "자막", b"x", None))  # 새 대사가 뜨면
    t["now"] = 102.5
    assert w._spiked()  # 15초를 기다리지 않고 바로
    w._calm = 0
    w.cfg.calm_backoff = False
    w._calm = 9
    assert w.interval_for(game) == 5


def test_lite_brain_uses_sonnet_for_routine_and_opus_when_it_matters(qapp, tmp_path):
    from watch.modes import Mode as _Mode

    game = _Mode("붉은사막", processes=["cd.exe"], interval_seconds=20, cooldown_seconds=60, knowledge="x", is_game=True)
    w, comp, said, t, _ = _watcher(tmp_path, images=[_img(40 + i * 9) for i in range(20)], modes=[game],
                                   window=WindowInfo("CD", "cd.exe", (0, 0, 1900, 1000)))
    w.cfg.line_quality = "brain_lite"
    w.update_mode()
    w.tick()
    assert comp.line_model == "claude-sonnet-5-5" and comp.perceived  # 평소 한마디: 나눠 보고 Sonnet 마무리
    w._finds = [(t["now"], {"name": "로안", "info": "느낌표", "say": "보상 좋음", "importance": 3})]
    t["now"] = 100
    w.tick()
    assert comp.line_model == "claude-opus-5-5" and comp.line_brain["found"][0]["name"] == "로안"  # 중요한 걸 찾으면 Opus
    w.ask_now("저 사람 뭐야?")
    assert comp.line_model == "claude-opus-5-5"  # 물어볼 때도 Opus
    w.cfg.line_quality = "brain"
    t["now"] = 200
    w.tick()
    assert comp.line_model == "claude-opus-5-5"  # 'Opus' 를 고르면 늘 Opus
