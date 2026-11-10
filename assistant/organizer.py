"""파일 정리: 폴더 안(맨 위 칸) 파일들을 종류별 하위 폴더로 옮긴다.

- 다니카가 정리안을 만들고, 주인님이 미리보기에서 체크한 것만 옮긴다.
- 지우지 않는다. 같은 이름이 있으면 '이름 (2).확장자' 로 옮긴다 (덮어쓰지 않음).
- 옮긴 기록은 data/organize_log.jsonl 에 남고, 마지막 정리는 되돌릴 수 있다.
- 윈도우·프로그램 폴더, 드라이브 맨 위, 사용자 폴더 자체는 정리하지 않는다.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parent
MAX_FILES = 500

# 이름 → (윈도우 폴더 ID, 영어 이름)
KNOWN = {
    "다운로드": ("{374DE290-123F-4565-9164-39C4925E467B}", "Downloads"),
    "바탕화면": ("{B4BFCC3A-DB2C-424C-B029-7FE99A87C641}", "Desktop"),
    "문서": ("{FDD39AD0-238F-46AF-ADB4-6C85480369C7}", "Documents"),
    "사진": ("{33E28130-4E1E-4676-835A-98395C3BC3BB}", "Pictures"),
    "동영상": ("{18989B1D-99B5-455B-841C-AB7C74E4DDFC}", "Videos"),
    "음악": ("{4BD8D571-6D19-48D3-BE97-422220080E43}", "Music"),
}
ALIASES = {"바탕 화면": "바탕화면", "데스크탑": "바탕화면", "내 문서": "문서", "그림": "사진", "비디오": "동영상",
           "영상": "동영상", "download": "다운로드", "desktop": "바탕화면", "document": "문서", "picture": "사진",
           "video": "동영상", "music": "음악"}
SKIP_NAMES = {"desktop.ini", "thumbs.db", ".ds_store"}
SKIP_EXT = {".crdownload", ".part", ".partial", ".download", ".tmp", ".lnk", ".url"}  # 받는 중인 파일·바로가기
BAD_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
RESERVED = {"con", "prn", "aux", "nul", *(f"com{i}" for i in range(1, 10)), *(f"lpt{i}" for i in range(1, 10))}


def known_folder(label: str) -> Path:
    guid, english = KNOWN[label]
    if sys.platform == "win32":
        try:  # 원드라이브로 옮겨진 경우까지 정확히
            import ctypes
            import uuid
            from ctypes import wintypes

            class GUID(ctypes.Structure):
                _fields_ = [("d1", wintypes.DWORD), ("d2", wintypes.WORD), ("d3", wintypes.WORD),
                            ("d4", ctypes.c_ubyte * 8)]

            u = uuid.UUID(guid)
            g = GUID(u.fields[0], u.fields[1], u.fields[2], (ctypes.c_ubyte * 8).from_buffer_copy(u.bytes[8:]))
            out = ctypes.c_wchar_p()
            if ctypes.windll.shell32.SHGetKnownFolderPath(ctypes.byref(g), 0, None, ctypes.byref(out)) == 0:
                path = Path(out.value)
                ctypes.windll.ole32.CoTaskMemFree(out)
                return path
        except Exception:  # noqa: BLE001
            pass
    return Path.home() / english


def resolve_target(target: str) -> tuple[Path, str] | None:
    """'다운로드', '바탕화면 정리해줘', 'D:\\자료' 같은 말 → (폴더, 보여줄 이름). 모르면 None."""
    t = (target or "").strip().strip('"').strip()
    if not t:
        return None
    p = Path(t).expanduser()
    if p.is_absolute() and p.is_dir():
        return p, str(p)
    low = t.lower()
    for word, label in ALIASES.items():
        if word in low:
            return known_folder(label), label
    for label in KNOWN:
        if label in t:
            return known_folder(label), label
    return None


def blocked_reason(folder: Path) -> str | None:
    """정리하면 안 되는 폴더면 이유를 돌려준다."""
    try:
        f = folder.resolve()
    except OSError:
        return "폴더를 찾을 수 없어요."
    if not f.is_dir():
        return "폴더를 찾을 수 없어요."
    if f.parent == f:
        return "드라이브 맨 위 폴더는 정리하지 않아요."
    if f == Path.home().resolve():
        return "사용자 폴더 자체는 정리하지 않아요. 안의 다운로드·문서 같은 폴더를 골라주세요."
    if f == ROOT or ROOT in f.parents:
        return "다니카 프로그램 폴더는 정리하지 않아요."
    for var in ("SystemRoot", "ProgramFiles", "ProgramFiles(x86)", "ProgramData", "APPDATA", "LOCALAPPDATA"):
        v = os.environ.get(var)
        if v:
            sys_dir = Path(v).resolve()
            if f == sys_dir or sys_dir in f.parents:
                return "윈도우나 프로그램이 쓰는 폴더라 정리하지 않아요."
    return None


def scan(folder: Path, limit: int = MAX_FILES) -> tuple[list[dict], int]:
    """맨 위 칸 파일 목록 (최근 것부터 limit 개). (목록, 전체 개수)."""
    items = []
    for p in folder.iterdir():
        try:
            if not p.is_file() or p.is_symlink():
                continue
            name = p.name
            if name.lower() in SKIP_NAMES or name.startswith((".", "~$")) or p.suffix.lower() in SKIP_EXT:
                continue
            st = p.stat()
        except OSError:
            continue
        items.append((st.st_mtime, {"name": name, "size_kb": max(1, round(st.st_size / 1024)),
                                    "modified": datetime.fromtimestamp(st.st_mtime).strftime("%Y-%m-%d")}))
    items.sort(key=lambda x: -x[0])
    return [d for _, d in items[:limit]], len(items)


def clean_folder_name(name: str) -> str | None:
    n = BAD_CHARS.sub("", str(name or "")).strip().strip(".").strip()
    n = re.sub(r"\s+", " ", n)[:40].strip()
    if not n or n.lower() in RESERVED or n in (".", ".."):
        return None
    return n


@dataclass
class Move:
    file: str
    folder: str
    reason: str = ""


def sanitize(plan: dict | None, files: list[dict]) -> list[Move]:
    """AI 정리안에서 목록에 실제로 있는 파일과 안전한 폴더 이름만 남긴다."""
    names = {f["name"] for f in files}
    seen, out = set(), []
    for m in (plan or {}).get("moves", []) or []:
        name = str(m.get("file", ""))
        folder = clean_folder_name(m.get("folder", ""))
        if name not in names or name in seen or not folder or folder == name:
            continue
        seen.add(name)
        out.append(Move(name, folder, str(m.get("reason", ""))[:60]))
    return out


def unique_dest(folder: Path, name: str) -> Path:
    dest = folder / name
    if not dest.exists():
        return dest
    stem, suffix = Path(name).stem, Path(name).suffix
    i = 2
    while (folder / f"{stem} ({i}){suffix}").exists():
        i += 1
    return folder / f"{stem} ({i}){suffix}"


@dataclass
class ApplyResult:
    moved: list[tuple[str, str]] = field(default_factory=list)  # (원래 경로, 옮긴 경로)
    failed: list[str] = field(default_factory=list)


class Organizer:
    def __init__(self, log_path: Path):
        self.log_path = log_path

    def apply(self, folder: Path, moves: list[Move], progress: Callable[[int, int], None] | None = None) -> ApplyResult:
        result = ApplyResult()
        created: list[str] = []
        for i, m in enumerate(moves, 1):
            src = folder / m.file
            try:
                if not src.is_file():
                    result.failed.append(m.file)
                    continue
                target_dir = folder / m.folder
                if not target_dir.exists():
                    target_dir.mkdir()
                    created.append(str(target_dir))
                dest = unique_dest(target_dir, m.file)
                src.rename(dest)
                result.moved.append((str(src), str(dest)))
            except OSError:
                result.failed.append(m.file)  # 쓰는 중인 파일 등
            finally:
                if progress:
                    progress(i, len(moves))
        if result.moved:
            self._append({"time": time.strftime("%Y-%m-%d %H:%M:%S"), "folder": str(folder),
                          "moves": result.moved, "created": created, "undone": False})
        return result

    def batches(self) -> list[dict]:
        try:
            lines = self.log_path.read_text(encoding="utf-8").splitlines()
        except OSError:
            return []
        out = []
        for line in lines:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        return out

    def last_batch(self) -> dict | None:
        return next((b for b in reversed(self.batches()) if not b.get("undone")), None)

    def undo_last(self, progress: Callable[[int, int], None] | None = None) -> tuple[int, int]:
        """마지막 정리를 되돌린다. (되돌린 개수, 못 되돌린 개수)."""
        batches = self.batches()
        idx = next((i for i in range(len(batches) - 1, -1, -1) if not batches[i].get("undone")), None)
        if idx is None:
            return 0, 0
        batch = batches[idx]
        ok = bad = 0
        moves = list(reversed(batch["moves"]))
        for i, (src, dest) in enumerate(moves, 1):
            s, d = Path(src), Path(dest)
            try:
                if d.is_file() and not s.exists():
                    d.rename(s)
                    ok += 1
                else:
                    bad += 1
            except OSError:
                bad += 1
            if progress:
                progress(i, len(moves))
        for folder in batch.get("created", []):
            try:
                Path(folder).rmdir()  # 비어 있을 때만 지워진다
            except OSError:
                pass
        batch["undone"] = True
        self._write(batches)
        return ok, bad

    def _append(self, entry: dict) -> None:
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        with self.log_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    def _write(self, batches: list[dict]) -> None:
        tmp = self.log_path.with_name(self.log_path.name + ".tmp")
        tmp.write_text("".join(json.dumps(b, ensure_ascii=False) + "\n" for b in batches), encoding="utf-8")
        tmp.replace(self.log_path)
