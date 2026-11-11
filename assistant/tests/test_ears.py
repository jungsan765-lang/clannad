import os

import numpy as np

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from test_watch_voice import qapp  # noqa: E402,F401
from watch.ears import RATE, GameEars  # noqa: E402


def _speech_vad(audio):
    """시험용: 0.3 넘게 큰 구간을 '말'로 본다."""
    loud = np.abs(audio) > 0.3
    segs, start = [], None
    for i in range(0, audio.size, RATE // 10):
        on = loud[i:i + RATE // 10].any()
        if on and start is None:
            start = i / RATE
        if not on and start is not None:
            segs.append((start, i / RATE))
            start = None
    if start is not None:
        segs.append((start, audio.size / RATE))
    return segs


def _block(loud: bool):
    t = np.arange(RATE // 2) / RATE
    return (0.5 * np.sin(2 * np.pi * 220 * t) if loud else 0.01 * np.sin(2 * np.pi * 50 * t)).astype(np.float32)


def test_hears_finished_lines_once_and_skips_own_voice():
    t = {"now": 100.0}
    heard = []
    muted = {"on": False}
    ears = GameEars(clock=lambda: t["now"], muted=lambda: muted["on"], vad=_speech_vad,
                    transcribe=lambda audio: heard.append(audio.size / RATE) or f"대사 {len(heard)}")
    ears.sync = True
    pattern = [False] * 2 + [True] * 4 + [False] * 4 + [True] * 3 + [False] * 4  # 말 2초, 쉼, 말 1.5초, 쉼
    for loud in pattern:
        t["now"] += 0.5
        ears.feed(_block(loud), t["now"])
    assert len(heard) == 2 and 1.8 <= heard[0] <= 2.6  # 끝난 말만, 한 번씩
    texts = [x for _, _, x in ears.recent(100) if x.startswith("들린 대사")]
    assert texts == ["들린 대사: 대사 1", "들린 대사: 대사 2"] and ears.alert_at is not None
    assert "들린 대사: 대사 2" in ears.text() and ears.text().startswith("[들린 소리")
    muted["on"] = True  # 다니카가 소리 내서 말하는 동안은 안 들음
    for loud in [True] * 4 + [False] * 4:
        t["now"] += 0.5
        ears.feed(_block(loud), t["now"])
    assert len(heard) == 2


def test_long_speech_is_cut_and_loud_bang_is_noted():
    t = {"now": 0.0}
    heard = []
    ears = GameEars(clock=lambda: t["now"], vad=_speech_vad, transcribe=lambda a: heard.append(a.size) or "긴 대사")
    ears.sync = True
    for _ in range(12):  # 조용한 배경
        t["now"] += 0.5
        ears.feed(_block(False), t["now"])
    for _ in range(34):  # 17초 동안 계속 말함 → 15초에서 끊어서 받아씀
        t["now"] += 0.5
        ears.feed(_block(True), t["now"])
    assert heard
    texts = [x for _, _, x in ears.recent(100)]
    assert any(x.startswith("큰 소리") for x in texts)  # 조용하다가 갑자기 큰 소리


def test_ears_only_listen_during_games_and_feed_judging(qapp, tmp_path):
    from test_watch_voice import _img, _watcher

    from watch.modes import Mode
    from watch.windows import WindowInfo

    opened = []

    class Stream:
        def __call__(self, seconds):
            return _block(False)

    active = {"on": False}
    ears = GameEars(active=lambda: active["on"], opener=lambda: opened.append(1) or (Stream(), lambda: None),
                    vad=lambda a: [], transcribe=lambda a: "")
    import time as _t

    ears.start()
    _t.sleep(0.3)
    assert opened == [] and ears.state == "off"  # 게임 밖에선 안 들음
    active["on"] = True
    for _ in range(40):
        if ears.state == "listening":
            break
        _t.sleep(0.05)
    assert opened == [1] and ears.state == "listening"
    ears.stop()

    game = Mode("붉은사막", processes=["cd.exe"], interval_seconds=20, cooldown_seconds=60, knowledge="x", is_game=True)
    w, comp, said, t, _ = _watcher(tmp_path, images=[_img(40 + i * 9) for i in range(20)], modes=[game],
                                   window=WindowInfo("CD", "cd.exe", (0, 0, 1900, 1000)))
    heard = GameEars(clock=lambda: t["now"])
    heard._event(9.0, "들린 대사: 밑장 빼다 걸렸네", alert=True)
    w.ears = heard
    w.update_mode()
    w.last_judged = 8.0
    t["now"] = 10.5
    assert w._spiked()  # 새 대사가 들리면 바로
    assert "밑장 빼다 걸렸네" in w._context_text(game)


def test_ears_pause_while_a_call_app_is_making_sound():
    from watch.voice_apps import HOLD, CallWatch

    t = {"now": 0.0}
    peaks = {"apps": {}}
    watch = CallWatch(probe=lambda: dict(peaks["apps"]), clock=lambda: t["now"])
    assert watch.reason() == ""
    peaks["apps"] = {"디스코드": 0.2}  # 친구가 말하는 중
    t["now"] = 2.0
    assert watch.reason() == "디스코드 통화 중"
    peaks["apps"] = {"디스코드": 0.0}  # 말이 잠깐 끊겨도
    t["now"] = 2.0 + HOLD - 1
    assert watch.reason() == "디스코드 통화 중"
    t["now"] = 2.0 + HOLD + 2  # 한참 조용하면 다시 듣는다
    assert watch.reason() == ""
    broken = CallWatch(probe=lambda: (_ for _ in ()).throw(OSError("no com")), clock=lambda: t["now"])
    assert broken.reason() == ""  # 확인을 못 하면 그냥 계속 듣는다


def test_ears_loop_does_not_open_audio_while_blocked():
    import threading
    import time as _time

    from watch.ears import GameEars

    opened = []
    ears = GameEars(active=lambda: True, transcribe=lambda a: "", vad=lambda a: [],
                    opener=lambda: opened.append(1) or None)
    ears.blocked = lambda: "디스코드 통화 중"
    ears.start()
    deadline = _time.monotonic() + 3
    while ears.state != "paused" and _time.monotonic() < deadline:
        _time.sleep(0.05)
    ears.stop()
    assert ears.state == "paused" and opened == [] and ears.status_text() == "디스코드 통화 중이라 쉬는 중"
    assert threading.active_count() >= 1
