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


# ---------------------------------------------------------------- 깨진 업데이트 막기·되돌리기

from updater import confirm_started, count_start, rollback  # noqa: E402


def test_broken_settings_or_code_in_new_version_is_not_installed(tmp_path):
    root = tmp_path / "app"
    _local(root, {"main.py": b"x = 1\n", "config.toml": b"a = 1\n"})
    gh = FakeGitHub({"main.py": b"x = 1\n", "config.toml": b"a = 1\n"}, "c1")
    up = Updater(root, tmp_path / "state.json", REPO, BRANCH, fetch=gh)
    up.run()
    gh.set({"main.py": b"x = 2\n", "config.toml": b"[v]\nd = 1\nd = 2\n"}, "c2")  # 같은 이름 두 번
    with pytest.raises(RuntimeError, match="config.toml"):
        up.run()
    gh.set({"main.py": b"def (:\n", "config.toml": b"a = 1\n"}, "c3")  # 파이썬 문법 오류
    with pytest.raises(RuntimeError, match="main.py"):
        up.run()
    assert (root / "main.py").read_bytes() == b"x = 1\n" and (root / "config.toml").read_bytes() == b"a = 1\n"
    gh.set({"main.py": b"x = 4\n", "config.toml": b"a = 1\n"}, "c4")  # 고친 버전은 받음
    assert up.run().updated == ["main.py"]


def test_rollback_restores_previous_version_and_skips_bad_commit(tmp_path):
    root, state = tmp_path / "app", tmp_path / "state.json"
    _local(root, {"main.py": b"good\n", "ui/a.py": b"a\n"})
    gh = FakeGitHub({"main.py": b"good\n", "ui/a.py": b"a\n"}, "c1")
    up = Updater(root, state, REPO, BRANCH, fetch=gh)
    up.run()
    assert count_start(state) == 0  # 업데이트 전엔 세지 않음
    gh.set({"main.py": b"bad = 1\n", "ui/a.py": b"a\n", "launcher.py": b"new\n"}, "c2")
    assert sorted(up.run().updated) == ["launcher.py", "main.py"]
    gh.set({"main.py": b"bad = 2\n", "ui/a.py": b"a\n", "launcher.py": b"new\n"}, "c3")  # 켜기 전에 또 업데이트
    up.run()
    assert count_start(state) == 1 and count_start(state) == 2
    assert rollback(root, state)
    assert (root / "main.py").read_bytes() == b"good\n"  # 마지막으로 잘 켜졌던 버전
    assert not (root / "launcher.py").exists()  # 새로 생긴 파일은 지움
    assert not rollback(root, state)  # 두 번 되돌리지 않음
    assert not up.run().changed  # 켜지지 않았던 버전은 다시 받지 않음
    assert (root / "main.py").read_bytes() == b"good\n"
    gh.set({"main.py": b"fixed\n", "ui/a.py": b"a\n"}, "c4")
    assert up.run().updated == ["main.py"]
    confirm_started(state)  # 잘 켜짐 → 백업 정리
    assert not (tmp_path / "update_backup").exists() and not rollback(root, state)
    assert count_start(state) == 0


def test_launcher_rolls_back_when_new_main_does_not_import(tmp_path):
    import shutil
    import subprocess
    import sys
    from pathlib import Path

    here = Path(__file__).resolve().parents[1]
    root, state = tmp_path / "app", tmp_path / "app" / "data" / "update_state.json"
    root.mkdir()
    for name in ("launcher.py", "updater.py"):
        shutil.copy(here / name, root / name)
    good = b"import sys\ndef main():\n    open(sys.argv[0] + '.ran', 'w').close()\n    return 0\n"
    (root / "main.py").write_bytes(good)
    gh = FakeGitHub({"main.py": good}, "c1")
    up = Updater(root, state, REPO, BRANCH, fetch=gh, subdir="assistant")
    up.run()
    gh.set({"main.py": b"import no_such_module_xyz\n"}, "c2")  # 문법은 맞지만 불러오다 오류
    up.run()
    r = subprocess.run([sys.executable, str(root / "launcher.py")], cwd=root, capture_output=True, text=True, timeout=60)
    assert r.returncode == 1 and "되돌렸어요" in r.stderr
    assert (root / "main.py").read_bytes() == good
    assert "no_such_module_xyz" in (root / "data" / "logs" / "start_error.log").read_text(encoding="utf-8")
