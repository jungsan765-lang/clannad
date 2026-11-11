"""코인: 캐릭터마다 잔액, 주인님만 주고 뺏음, 오갈 때마다 감정이 크게 움직인다."""

import os
from datetime import datetime

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from fake_anthropic import FakeAnthropic  # noqa: E402
from PySide6.QtCore import QThreadPool  # noqa: E402
from PySide6.QtWidgets import QApplication  # noqa: E402

from ai_client import AIClient  # noqa: E402
from coins import START, CoinBank  # noqa: E402
from companion import Companion  # noqa: E402
from memory import Memory  # noqa: E402
from usage import UsageLedger  # noqa: E402


def test_bank_keeps_balance_per_character_never_below_zero(tmp_path):
    bank = CoinBank(tmp_path / "coins.json")
    assert bank.balance("ronova") == START
    assert bank.change("ronova", 5, now=1000.0) == 5 and bank.balance("ronova") == START + 5
    assert bank.change("ronova", -100, now=1100.0) == -(START + 5) and bank.balance("ronova") == 0  # 0 밑으로는 안 감
    assert bank.change("ronova", -1) == 0  # 이미 빈털터리
    assert bank.balance("danika") == START  # 캐릭터마다 따로
    again = CoinBank(tmp_path / "coins.json")  # 파일에 남는다
    assert again.balance("ronova") == 0 and [r["delta"] for r in again.history("ronova")] == [-(START + 5), 5]
    assert "빈털터리" in again.feeling("ronova", now=1200.0)
    assert "뺏겼다" in again.feeling("ronova", now=1200.0) and "아주 크게" in again.feeling("ronova", now=1200.0)
    assert "뺏겼다" not in again.feeling("ronova", now=1100.0 + 7200)  # 한 시간이 지나면 잔액 마음만


def test_changes_while_away_are_learned_later(tmp_path):
    bank = CoinBank(tmp_path / "coins.json")
    bank.change("sandrone", -3, told=False)
    assert [r["delta"] for r in bank.untold("sandrone")] == [-3]
    assert "뺏겼다" not in bank.feeling("sandrone")  # 아직 모름
    bank.mark_told("sandrone")
    assert bank.untold("sandrone") == [] and "뺏겼다" in bank.feeling("sandrone")


def _companion(tmp_path, replies):
    fake = FakeAnthropic(replies)
    comp = Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=fake), Memory(tmp_path / "data"), "# 다니카",
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")
    bank = CoinBank(tmp_path / "coins.json")
    comp.coin_feeling = lambda: bank.feeling("danika")
    return comp, fake, bank


def test_chat_reports_coins_actually_given_and_feeling_is_sent(tmp_path):
    comp, fake, _ = _companion(tmp_path, [{"coins": 3, "speak": True, "message": "……감사히 받겠습니다.", "emotion": "happy"}])
    r = comp.reply("코인 세 개 줄게", now=datetime(2026, 11, 11, 20, 0))
    assert r.coins == 3
    call = fake.calls[-1]
    assert "coins" in call["output_config"]["format"]["schema"]["properties"]
    texts = [b["text"] for b in call["messages"][-1]["content"] if b.get("type") == "text"]
    assert any(t.startswith("[지금 네 코인: 10개") for t in texts)
    assert "「코인」" in call["system"][0]["text"]  # 코인 규칙 (모든 캐릭터 공통)


def test_coin_reaction_is_remembered_but_never_moves_coins(tmp_path):
    comp, fake, _ = _companion(tmp_path, [{"coins": -5, "speak": True, "message": "…주인님, 그건 제 코인입니다.",
                                           "emotion": "angry"}])
    r = comp.coin_reaction(-5, 5)
    assert r.coins == 0 and r.message.startswith("…주인님")  # 현황판에서 이미 오간 걸 또 세지 않는다
    assert "코인 5개를 뺏어 갔다" in fake.calls[-1]["messages"][-1]["content"][0]["text"]
    assert comp.memory.recent[-2]["text"] == "(현황판: 코인 5개를 뺏음)"


def _wait(qapp, a):
    for _ in range(50):
        QThreadPool.globalInstance().waitForDone(2000)
        qapp.processEvents()
        if not a.jobs:
            return


def test_app_applies_chat_coins_and_reacts_to_board(tmp_path):
    import main as app_main
    from settings import Settings

    qapp = QApplication.instance() or QApplication([])
    (tmp_path / "config.toml").write_text(
        f'[app]\ndata_dir = "{(tmp_path / "data").as_posix()}"\n'
        '[character]\nfolder = "missing"\npersona = "none.md"\nscale = 0.5\n'
        '[characters.danika]\nname = "다니카"\n[characters.ronova]\nname = "로노바"\nfolder = "missing"\n'
        '[update]\nauto = false\n[memory]\ndiary = false\n[local]\nenabled = false\npaddle_ocr = false\n'
        '[ears]\nenabled = false\n', encoding="utf-8")
    fake = FakeAnthropic([{"coins": -2, "speak": True, "message": "…주인님, 그건 제 코인입니다.", "emotion": "angry"},
                          {"speak": True, "message": "……감사히 받겠습니다.", "emotion": "happy"}])
    a = app_main.build(Settings.load(tmp_path), ai=AIClient(UsageLedger(tmp_path / "x.json"), client=fake), tray=False)
    a.ask("코인 두 개 뺏는다")
    _wait(qapp, a)
    assert a.coins.balance("danika") == START - 2 and a.coins.history("danika")[0]["how"] == "chat"
    a.coin_change("danika", 4)  # 현황판에서 주면 잠깐 모았다가 바로 반응
    assert a._coin_pending == 4 and a._coin_timer.isActive()
    a._coin_timer.stop()
    a._coin_react()
    _wait(qapp, a)
    assert a.bubble.text == "……감사히 받겠습니다." and a.coins.balance("danika") == START + 2
    assert "코인 4개를 줬다" in fake.calls[-1]["messages"][-1]["content"][0]["text"]
    a.coin_change("ronova", -1)  # 자리에 없는 캐릭터 → 다음에 나왔을 때 안다
    assert a.coins.untold("ronova") and not a._coin_timer.isActive()
    a.show_coin_board()
    assert a.coin_board.counts["danika"].text() == f"{START + 2:,} 코인" and a.coin_board.counts["ronova"].text() == "9 코인"
    a.coin_board.amount.setValue(3)
    a.coin_board._move("ronova", -1)
    assert a.coins.balance("ronova") == START - 4 and a.coin_board.counts["ronova"].text() == "6 코인"
    a.coin_board.close()
    a.quit()
