"""GitHub 의 작업 브랜치에서 프로그램 파일 중 바뀐 것만 받아 업데이트한다.

- 저장소 전체(수 GB)가 아니라 assistant/ 폴더 파일만, 그중 내용이 다른 것만 받는다.
- 직접 고친 설정 파일(config.toml, modes/*.toml)은 덮어쓰지 않고, 새 기본값을 '이름.new' 로 옆에 둔다.
- data/, character/ 처럼 저장소에 없는 개인 파일은 건드리지 않는다. 지워진 파일도 지우지 않는다.
"""

from __future__ import annotations

import hashlib
import json
import logging
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
        try:
            return json.loads(self.state_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}

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
        if state.get("commit") == commit:
            self._save({"commit": commit, "files": installed})
            return result
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
            if path.startswith(PROTECTED) and user_edited:
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
        self._save({"commit": commit, "files": installed})
        if result.updated:
            log.info("업데이트 %s: %s", commit[:8], ", ".join(result.updated))
        if result.kept:
            log.info("직접 고친 설정은 그대로 둠 (새 기본값은 .new): %s", ", ".join(result.kept))
        return result
