"""GitHub 의 작업 브랜치에서 프로그램 파일 중 바뀐 것만 받아 업데이트한다.

- 저장소 전체(수 GB)가 아니라 assistant/ 폴더 파일만, 그중 내용이 다른 것만 받는다.
- 직접 고친 설정 파일(config.toml, modes/*.toml)은 덮어쓰지 않고, 새 기본값을 '이름.new' 로 옆에 둔다.
- data/, character/ 처럼 저장소에 없는 개인 파일은 건드리지 않는다. 지워진 파일도 지우지 않는다.
- 받은 파일을 먼저 전부 검사(설정 파일 문법, 파이썬 문법)하고, 문제가 있으면 아무것도 바꾸지 않는다.
- 바꾸기 전 파일은 data/update_backup/ 에 둔다. 새 버전이 켜지지 않으면 rollback() 으로 되돌리고
  그 버전은 다시 받지 않는다 (고친 다음 버전이 올라오면 그때 받음).
"""

from __future__ import annotations

import hashlib
import json
import logging
import shutil
import tomllib
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

log = logging.getLogger("assistant.update")

API = "https://api.github.com/repos/{repo}"
RAW = "https://raw.githubusercontent.com/{repo}/{sha}/{subdir}/{path}"
SKIP_PREFIXES = ("tests/", "data/", "character/", "work/", "models/")
PROTECTED = ("config.toml", "modes/")  # 사용자가 직접 고치는 파일


def blob_sha(data: bytes) -> str:
    """git 이 파일 내용을 구분하는 값과 같은 방식."""
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()


def http_get(url: str, timeout: float = 20.0) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "assistant-updater",
                                               "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


@dataclass
class UpdateResult:
    commit: str
    updated: list[str] = field(default_factory=list)
    kept: list[str] = field(default_factory=list)  # 직접 고쳐서 덮어쓰지 않은 설정 파일
    requirements_changed: bool = False

    @property
    def changed(self) -> bool:
        return bool(self.updated)


def check_file(path: str, data: bytes) -> str | None:
    """받은 파일이 깨지지 않았는지 본다. 문제가 있으면 이유를 돌려준다."""
    try:
        if path.endswith(".toml"):
            tomllib.loads(data.decode("utf-8"))
        elif path.endswith(".py"):
            compile(data, path, "exec", dont_inherit=True)
        elif path.endswith(".json"):
            json.loads(data.decode("utf-8"))
    except (SyntaxError, ValueError, UnicodeDecodeError) as exc:
        return str(exc)
    return None


def _load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def backup_dir(state_path: Path) -> Path:
    return state_path.parent / "update_backup"


def count_start(state_path: Path) -> int:
    """업데이트한 뒤 아직 잘 켜진 적이 없으면 켜려고 한 횟수를 센다."""
    state = _load(state_path)
    if not state.get("pending"):
        return 0
    state["start_tries"] = int(state.get("start_tries", 0)) + 1
    state_path.write_text(json.dumps(state, indent=1), encoding="utf-8")
    return state["start_tries"]


def confirm_started(state_path: Path) -> None:
    """새 버전이 잘 켜졌다 → 백업을 지운다."""
    state = _load(state_path)
    state.pop("start_tries", None)
    if state.pop("pending", None):
        state_path.write_text(json.dumps(state, indent=1), encoding="utf-8")
        shutil.rmtree(backup_dir(state_path), ignore_errors=True)
        log.info("업데이트한 버전이 잘 켜졌어요 (%s)", str(state.get("commit", ""))[:8])


def rollback(root: Path, state_path: Path) -> bool:
    """방금 업데이트한 버전이 켜지지 않을 때 이전 파일로 되돌린다. 되돌렸으면 True."""
    state = _load(state_path)
    bdir = backup_dir(state_path)
    info = _load(bdir / "manifest.json")
    if not state.get("pending") or not info:
        return False
    for rel in info.get("replaced", []):
        src = bdir / "files" / rel
        if src.is_file():
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, root / rel)
    for rel in info.get("created", []):
        try:
            (root / rel).unlink()
        except OSError:
            pass
    bad = state.get("commit")
    new_state = {"commit": info.get("commit"), "files": info.get("files", {}), "skip_commit": bad}
    state_path.write_text(json.dumps(new_state, indent=1), encoding="utf-8")
    shutil.rmtree(bdir, ignore_errors=True)
    log.error("업데이트한 버전(%s)이 켜지지 않아 이전 버전으로 되돌렸어요", str(bad)[:8])
    return True


class Updater:
    def __init__(self, root: Path, state_path: Path, repo: str, branch: str, subdir: str = "assistant",
                 fetch: Callable[[str], bytes] = http_get):
        self.root = root
        self.state_path = state_path
        self.repo = repo
        self.branch = branch
        self.subdir = subdir
        self.fetch = fetch

    def _state(self) -> dict:
        return _load(self.state_path)

    def _save(self, state: dict) -> None:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        self.state_path.write_text(json.dumps(state, indent=1), encoding="utf-8")

    def _json(self, url: str):
        return json.loads(self.fetch(url).decode("utf-8"))

    def remote_files(self) -> tuple[str, dict[str, str]]:
        """(커밋, {경로: 내용 해시}) — assistant/ 폴더만."""
        base = API.format(repo=self.repo)
        commit = self._json(f"{base}/commits/{self.branch}")
        sha, root_tree = commit["sha"], commit["commit"]["tree"]["sha"]
        top = self._json(f"{base}/git/trees/{root_tree}")
        sub = next((t for t in top["tree"] if t["path"] == self.subdir and t["type"] == "tree"), None)
        if sub is None:
            raise RuntimeError(f"저장소에 {self.subdir}/ 폴더가 없어요.")
        tree = self._json(f"{base}/git/trees/{sub['sha']}?recursive=1")
        files = {t["path"]: t["sha"] for t in tree["tree"]
                 if t["type"] == "blob" and not t["path"].startswith(SKIP_PREFIXES)}
        return sha, files

    def run(self) -> UpdateResult:
        state = self._state()
        installed: dict[str, str] = state.get("files", {})
        if not installed:  # 처음: 지금 있는 파일들을 '설치된 상태'로 기록 (이후 직접 고친 것을 알아보려고)
            # 설정 파일은 이미 고쳤을 수 있으니 기록하지 않는다 → 원격과 다르면 덮어쓰지 않고 .new 로 둔다
            installed = {p.relative_to(self.root).as_posix(): blob_sha(p.read_bytes())
                         for p in self.root.rglob("*") if p.is_file()
                         and not p.relative_to(self.root).as_posix().startswith(SKIP_PREFIXES + PROTECTED)
                         and "__pycache__" not in p.parts}
        commit, files = self.remote_files()
        result = UpdateResult(commit)
        if state.get("commit") == commit or state.get("skip_commit") == commit:
            if state.get("skip_commit") == commit:
                log.info("전에 켜지지 않았던 버전(%s)이라 받지 않아요", commit[:8])
            self._save(dict(state, files=installed))
            return result
        before = dict(installed)
        # 1) 바뀐 파일을 전부 받아서 검사부터 (하나라도 이상하면 아무것도 바꾸지 않음)
        incoming: list[tuple[str, str, bytes, bool]] = []
        for path, remote in sorted(files.items()):
            local = self.root / path
            local_sha = blob_sha(local.read_bytes()) if local.is_file() else None
            if local_sha == remote:
                installed[path] = remote
                continue
            user_edited = local_sha is not None and local_sha != installed.get(path)
            data = self.fetch(RAW.format(repo=self.repo, sha=commit, subdir=self.subdir, path=path))
            if blob_sha(data) != remote:
                raise RuntimeError(f"받은 파일이 손상됐어요: {path}")
            problem = check_file(path, data)
            if problem:
                raise RuntimeError(f"새 버전의 {path} 에 문제가 있어서 업데이트하지 않았어요 ({problem})")
            incoming.append((path, remote, data, user_edited))
        # 2) 바꿀 파일을 백업해 두고
        writes = [(p, r, d) for p, r, d, edited in incoming if not (p.startswith(PROTECTED) and edited)]
        bdir = backup_dir(self.state_path)
        if writes:
            # 아직 켜 보지 않은 업데이트가 또 오면, 백업은 마지막으로 잘 켜졌던 버전 것을 그대로 둔다
            info = _load(bdir / "manifest.json") if state.get("pending") else {}
            if not info:
                shutil.rmtree(bdir, ignore_errors=True)
                info = {"commit": state.get("commit"), "files": before, "replaced": [], "created": []}
            done = set(info["replaced"]) | set(info["created"])
            for path, _, _ in writes:
                if path in done:
                    continue
                local = self.root / path
                if local.is_file():
                    (bdir / "files" / path).parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(local, bdir / "files" / path)
                    info["replaced"].append(path)
                else:
                    info["created"].append(path)
            bdir.mkdir(parents=True, exist_ok=True)
            (bdir / "manifest.json").write_text(json.dumps(info, indent=1), encoding="utf-8")
        # 3) 바꾼다
        for path, remote, data, edited in incoming:
            local = self.root / path
            if path.startswith(PROTECTED) and edited:
                local.with_name(local.name + ".new").write_bytes(data)
                result.kept.append(path)
                continue
            local.parent.mkdir(parents=True, exist_ok=True)
            tmp = local.with_name(local.name + ".tmp")
            tmp.write_bytes(data)
            tmp.replace(local)
            installed[path] = remote
            result.updated.append(path)
            if path == "requirements.txt":
                result.requirements_changed = True
        new_state = {"commit": commit, "files": installed}
        if result.updated or state.get("pending"):
            new_state["pending"] = True  # 다음에 잘 켜지면 confirm_started() 가 지움
        self._save(new_state)
        if result.updated:
            log.info("업데이트 %s: %s", commit[:8], ", ".join(result.updated))
        if result.kept:
            log.info("직접 고친 설정은 그대로 둠 (새 기본값은 .new): %s", ", ".join(result.kept))
        return result
