"""비밀 값(HoYoLAB 로그인 정보 등)을 이 PC 의 이 윈도우 사용자만 풀 수 있게 저장한다 (Windows DPAPI).

data/secrets.bin 에 암호화해서 둔다. 파일을 다른 PC 로 복사해도 풀리지 않는다.
Windows 가 아니면(테스트·개발) 암호화 없이 base64 로만 저장한다.
"""

from __future__ import annotations

import base64
import ctypes
import json
import sys
import threading
from pathlib import Path

MARK_DPAPI, MARK_PLAIN = b"DPAPI1:", b"PLAIN1:"


class _Blob(ctypes.Structure):
    _fields_ = [("cbData", ctypes.c_uint32), ("pbData", ctypes.c_void_p)]


def _dpapi(data: bytes, protect: bool) -> bytes:
    from ctypes import wintypes

    crypt32, kernel32 = ctypes.windll.crypt32, ctypes.windll.kernel32
    fn = crypt32.CryptProtectData if protect else crypt32.CryptUnprotectData
    fn.argtypes = [ctypes.POINTER(_Blob), ctypes.c_void_p, ctypes.POINTER(_Blob), ctypes.c_void_p, ctypes.c_void_p,
                   wintypes.DWORD, ctypes.POINTER(_Blob)]
    fn.restype = wintypes.BOOL
    kernel32.LocalFree.argtypes = [ctypes.c_void_p]
    buf = ctypes.create_string_buffer(data, len(data))
    src = _Blob(len(data), ctypes.cast(buf, ctypes.c_void_p))
    out = _Blob()
    if not fn(ctypes.byref(src), None, None, None, None, 0x1, ctypes.byref(out)):  # CRYPTPROTECT_UI_FORBIDDEN
        raise OSError("윈도우 보안 저장(DPAPI) 실패")
    try:
        return ctypes.string_at(out.pbData, out.cbData)
    finally:
        kernel32.LocalFree(out.pbData)


def protect(data: bytes) -> bytes:
    if sys.platform == "win32":
        return MARK_DPAPI + base64.b64encode(_dpapi(data, True))
    return MARK_PLAIN + base64.b64encode(data)


def unprotect(blob: bytes) -> bytes:
    if blob.startswith(MARK_DPAPI):
        return _dpapi(base64.b64decode(blob[len(MARK_DPAPI):]), False)
    if blob.startswith(MARK_PLAIN):
        return base64.b64decode(blob[len(MARK_PLAIN):])
    raise ValueError("알 수 없는 형식")


class SecretStore:
    def __init__(self, path: Path):
        self.path = path
        self._lock = threading.Lock()

    def _load(self) -> dict:
        try:
            return json.loads(unprotect(self.path.read_bytes()).decode("utf-8"))
        except (OSError, ValueError):
            return {}

    def get(self, key: str, default=None):
        return self._load().get(key, default)

    def set(self, key: str, value) -> None:
        with self._lock:
            data = self._load()
            data[key] = value
            self._save(data)

    def delete(self, key: str) -> None:
        with self._lock:
            data = self._load()
            data.pop(key, None)
            self._save(data)

    def _save(self, data: dict) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_name(self.path.name + ".tmp")
        tmp.write_bytes(protect(json.dumps(data, ensure_ascii=False).encode("utf-8")))
        tmp.replace(self.path)
