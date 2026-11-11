import json
import os

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from fake_anthropic import FakeAnthropic  # noqa: E402
from PIL import Image  # noqa: E402

from ai_client import AIClient  # noqa: E402
from companion import SCENE_SCHEMA, Companion  # noqa: E402
from local_ai import LocalAI, threads_for  # noqa: E402
from memory import Memory  # noqa: E402
from usage import UsageLedger  # noqa: E402
from watch import capture as cap  # noqa: E402


class FakeOllama:
    def __init__(self, models=("gemma3:4b", "bge-m3", "gemma3:12b"), replies=None, up=True):
        self.models = list(models)
        self.replies = list(replies or [])
        self.up = up
        self.calls = []

    @staticmethod
    def vector(text):
        """시험용 뜻 좌표: 같은 주제 낱말이 있으면 가까움."""
        topics = [("도박", "카드", "밑장", "속임수"), ("말", "안장", "승마"), ("밥", "볶음밥", "요리")]
        return [float(sum(w in text for w in words)) + 0.01 for words in topics]

    def __call__(self, method, path, body=None, timeout=5.0, stream=False):
        self.calls.append((method, path, body))
        if not self.up:
            raise ConnectionRefusedError("꺼짐")
        if path == "/api/version":
            return {"version": "0.12.0"}
        if path == "/api/tags":
            return {"models": [{"name": m, "model": m} for m in self.models]}
        if path == "/api/pull":
            self.models.append(body["model"])
            return iter([{"status": "pulling manifest"}, {"status": "downloading", "total": 100, "completed": 40},
                         {"status": "downloading", "total": 100, "completed": 100}, {"status": "success"}])
        if path == "/api/embed":
            return {"embeddings": [self.vector(x) for x in body["input"]]}
        if path == "/api/chat":
            reply = self.replies.pop(0) if self.replies else {}
            if isinstance(reply, Exception):
                raise reply
            return {"message": {"role": "assistant", "content": json.dumps(reply, ensure_ascii=False)}}
        raise AssertionError(path)


def test_threads_default_to_half():
    assert LocalAI().cpu == "half" and threads_for("half", 16) == 8  # 9800X3D: 16개 중 8개
    assert threads_for("little", 16) == 4 and threads_for("little", 8) == 2
    assert threads_for("half", 16) == 8 and threads_for("most", 16) == 14


def test_check_pull_and_status():
    off = LocalAI(http=FakeOllama(up=False))
    assert off.check() == "no_server" and not off.ready() and "Ollama" in off.status_text()
    fake = FakeOllama(models=[])
    ai = LocalAI(http=fake)
    assert ai.check(pull=False) == "no_model"
    assert ai.pull() and ai.ready() and ai.progress == 1.0
    assert ("POST", "/api/pull", {"model": "gemma3:4b", "stream": True}) in fake.calls
    assert "준비됨" in ai.status_text()
    ai.enabled = False
    assert not ai.ready() and ai.status_text() == "꺼짐"


def test_chat_uses_cpu_only_and_falls_back_on_trouble():
    fake = FakeOllama(replies=[{"me": "걷는 중"}, TimeoutError("느림")])
    ai = LocalAI(http=fake, cpu="little")
    ai.check()
    img = cap.to_jpeg(Image.new("RGB", (64, 36)), 70)
    assert ai.chat_json("규칙", "적어 줘", {"type": "object"}, [img]) == {"me": "걷는 중"}
    body = fake.calls[-1][2]
    assert body["options"]["num_gpu"] == 0  # 그래픽카드는 게임 몫
    assert body["options"]["num_thread"] == ai.threads and body["stream"] is False and body["format"] == {"type": "object"}
    assert body["messages"][0] == {"role": "system", "content": "규칙"} and len(body["messages"][1]["images"]) == 1
    assert ai.chat_json("규칙", "또", {"type": "object"}) is None and ai.fails == 1  # 느리면 이번 건 클라우드로
    assert ai.ready()  # 느린 건 꺼진 게 아님
    fake.up = False
    assert ai.chat_json("규칙", "또", {"type": "object"}) is None and ai.state == "no_server"
    assert ai.calls == 1


def _comp(tmp_path, cloud):
    return Companion(AIClient(UsageLedger(tmp_path / "u.json"), client=FakeAnthropic(cloud)), Memory(tmp_path / "d"), None,
                     chat_model="claude-opus-5-5", memory_model="claude-opus-5-5")


def test_helpers_use_my_pc_first_and_cloud_when_it_fails(tmp_path):
    from watch.modes import Mode

    scene = {"me": "방패를 등에 멘 채 걷는 중", "others": "없음", "place": "숲", "ui": "체력 가득", "happened": "이동",
             "unsure": ""}
    fake = FakeOllama(replies=[scene, {"kind": "npc", "name": "로안", "info": "느낌표", "clear": True},
                               {"items": [{"name": "로안", "importance": 2, "why": "모름", "say": ""}]},
                               {"me": "빠진 칸"}])
    comp = _comp(tmp_path, [dict(scene, me="클라우드가 본 것")])
    comp.local = LocalAI(http=fake)
    comp.local.check()
    game = Mode("붉은사막", knowledge="x", is_game=True)
    big = cap.to_jpeg(Image.new("RGB", (1920, 1080), (20, 60, 30)), 85)
    flow = [(f"({i}/10)", cap.to_jpeg(Image.new("RGB", (480, 270)), 70)) for i in range(1, 11)]
    got, usd = comp.perceive(big, game, "claude-sonnet-5-5", flow=flow, captions=[("(자막) 1.0초 전", "로안: 짐을")])
    assert got == scene and usd == 0 and not comp.ai.client.calls  # 공짜로
    body = fake.calls[-1][2]
    assert len(body["messages"][1]["images"]) == 3 and "로안: 짐을" in body["messages"][1]["content"]  # 지난 2장 + 지금
    spot, _ = comp.inspect_spot(big, "느낌표 뜬 상인", game, "claude-haiku-5-5")
    verdict, _ = comp.weigh_spots([dict(spot, what="느낌표 뜬 상인")], game, "claude-haiku-5-5")
    assert spot["name"] == "로안" and verdict["items"][0]["importance"] == 2 and not comp.ai.client.calls
    got, _ = comp.perceive(big, game, "claude-sonnet-5-5")  # 내 PC 답이 칸이 빠지면 클라우드로
    assert got["me"] == "클라우드가 본 것" and comp.ai.client.calls[-1]["model"] == "claude-sonnet-5-5"
    comp.local_roles = {"spot"}  # 맡길 일을 고를 수 있음
    assert not comp._use_local("eye") and comp._use_local("spot")
    assert set(SCENE_SCHEMA["required"]) == set(scene)


def test_pulls_every_needed_model_one_after_another():
    fake = FakeOllama(models=["gemma3:4b"])
    ai = LocalAI(http=fake)
    assert ai.models() == ["gemma3:4b", "bge-m3", "gemma3:12b"]
    assert ai.check(pull=False) == "ready" and not ai.has("bge-m3")
    ai.pull_all(["bge-m3", "gemma3:12b"])
    assert ai.has("bge-m3") and ai.has("gemma3:12b") and ai.ready()  # 다른 모델을 받는 동안에도 눈 담당은 계속
    assert [c[2]["model"] for c in fake.calls if c[1] == "/api/pull"] == ["bge-m3", "gemma3:12b"]
    vecs = ai.embed(["밑장 빼기", "말 안장"])
    assert len(vecs) == 2 and vecs[0][0] > vecs[0][1]
    assert fake.calls[-1][2]["model"] == "bge-m3"


def test_memories_are_found_by_meaning_not_only_words(tmp_path):
    from datetime import datetime

    from recall import EpisodeIndex, recall_block

    fake = FakeOllama()
    ai = LocalAI(http=fake)
    ai.check(pull=False)
    idx = EpisodeIndex(tmp_path / "recall.db")
    idx.add("2026-11-01T21:00:00", "chat", "주인님: 아까 그 카드 게임에서 상대가 속임수 쓰다 걸렸어", source="a")
    idx.add("2026-11-02T21:00:00", "chat", "주인님: 오늘 볶음밥 해 먹었어", source="b")
    idx.add("2026-11-03T21:00:00", "screen", "도박판 장면", source="c")  # 화면 일지는 뜻 좌표를 안 만듦
    assert idx.embed_pending(lambda texts: ai.embed(texts, background=True)) == 2
    assert idx.embed_pending(lambda texts: ai.embed(texts, background=True)) == 0  # 한 번만
    # 낱말이 하나도 안 겹쳐도 (밑장·도박 ↔ 카드·속임수) 뜻이 비슷하면 떠오른다
    text, eps = recall_block(idx, "그때 밑장 빼던 도박 기억나?", datetime(2026, 11, 11, 22, 0), embed=lambda t: ai.embed(t))
    assert eps and eps[0].text.startswith("주인님: 아까 그 카드 게임") and eps[0].sim > 0.9
    assert not any("볶음밥" in e.text for e in eps)  # 상관없는 기억은 안 떠오름 (앞뒤 대화로 붙는 건 괜찮음)
    text2, eps2 = recall_block(idx, "그때 밑장 빼던 도박 기억나?", datetime(2026, 11, 11, 22, 0))
    assert not any("카드 게임" in e.text for e in eps2)  # 낱말로만 찾으면 못 찾음
    idx.add("2026-11-01T21:00:00", "chat", "주인님: 말 안장 샀어", source="a")  # 내용이 바뀌면 뜻 좌표도 다시
    assert idx.embed_pending(lambda texts: ai.embed(texts, background=True)) == 1
    ai.state = "no_server"
    assert recall_block(idx, "볶음밥 기억나?", datetime(2026, 11, 11, 22, 0), embed=lambda t: ai.embed(t))[1]  # 낱말로는 여전히
