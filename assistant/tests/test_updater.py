import json

import pytest

from updater import Updater, blob_sha

REPO, BRANCH = "me/repo", "work"


class FakeGitHub:
    def __init__(self, files: dict[str, bytes], commit="c1"):
        self.set(files, commit)
        self.calls = []

    def set(self, files, commit):
        self.files, self.commit = files, commit

    def __call__(self, url: str) -> bytes:
        self.calls.append(url)
        if url.endswith(f"/commits/{BRANCH}"):
            return json.dumps({"sha": self.commit, "commit": {"tree": {"sha": "root"}}}).encode()
        if url.endswith("/git/trees/root"):
            return json.dumps({"tree": [{"path": "assistant", "type": "tree", "sha": "sub"}, {"path": "big", "type": "tree", "sha": "x"}]}).encode()
        if "/git/trees/sub" in url:
            return json.dumps({"tree": [{"path": p, "type": "blob", "sha": blob_sha(d)} for p, d in self.files.items()]}).encode()
        path = url.split(f"/{self.commit}/assistant/", 1)[1]
        return self.files[path]


def _local(root, files):
    for p, d in files.items():
        f = root / p
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_bytes(d)


def test_updates_changed_code_keeps_edited_settings(tmp_path):
    root = tmp_path / "app"
    _local(root, {"main.py": b"v1", "config.toml": b"mine = 1", "modes/a.toml": b"a1", "requirements.txt": b"x",
                  "data/usage.json": b"{}"})
    gh = FakeGitHub({"main.py": b"v2", "config.toml": b"default = 2", "modes/a.toml": b"a1",
                     "requirements.txt": b"x\ny", "watch/new.py": b"new", "tests/t.py": b"skip"})
    up = Updater(root, tmp_path / "state.json", REPO, BRANCH, fetch=gh)
    r = up.run()
    assert sorted(r.updated) == ["main.py", "requirements.txt", "watch/new.py"]
    assert r.requirements_changed and r.kept == ["config.toml"]
    assert (root / "main.py").read_bytes() == b"v2" and (root / "watch/new.py").read_bytes() == b"new"
    assert (root / "config.toml").read_bytes() == b"mine = 1"  # 직접 고친 설정은 그대로
    assert (root / "config.toml.new").read_bytes() == b"default = 2"  # 새 기본값은 옆에
    assert not (root / "tests").exists() and (root / "data/usage.json").read_bytes() == b"{}"
    assert not any("/big" in c for c in gh.calls)  # 저장소 전체를 받지 않음
    assert up.run().changed is False  # 같은 커밋이면 아무것도 안 함


def test_unedited_settings_are_updated_after_first_install(tmp_path):
    root = tmp_path / "app"
    _local(root, {"main.py": b"v1", "config.toml": b"default = 1"})
    gh = FakeGitHub({"main.py": b"v1", "config.toml": b"default = 1"}, "c1")
    up = Updater(root, tmp_path / "state.json", REPO, BRANCH, fetch=gh)
    assert not up.run().changed
    gh.set({"main.py": b"v1", "config.toml": b"default = 2"}, "c2")
    r = up.run()
    assert r.updated == ["config.toml"] and (root / "config.toml").read_bytes() == b"default = 2"


def test_corrupted_download_is_rejected(tmp_path):
    root = tmp_path / "app"
    _local(root, {"main.py": b"v1"})
    gh = FakeGitHub({"main.py": b"v2"})
    good = gh.__call__

    def bad(url):
        data = good(url)
        return b"tampered" if url.endswith("main.py") else data

    up = Updater(root, tmp_path / "state.json", REPO, BRANCH, fetch=bad)
    with pytest.raises(RuntimeError, match="손상"):
        up.run()
    assert (root / "main.py").read_bytes() == b"v1"
