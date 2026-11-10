"""다니카 시작 파일 (run.bat 이 이걸 실행한다).

main.py 를 불러오다 오류가 나도(업데이트로 받은 파일 문제 등) 조용히 꺼지지 않게:
- 방금 업데이트한 버전이면 이전 버전으로 되돌리고 다시 켠다.
- 아니면 무엇이 문제인지 한국어 창으로 알려주고 data/logs/start_error.log 에 남긴다.
"""

from __future__ import annotations

import os
import subprocess
import sys
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))


def _message(text: str, error: bool = True) -> None:
    if sys.platform == "win32":
        import ctypes

        ctypes.windll.user32.MessageBoxW(None, text, "다니카", 0x10 if error else 0x40)
    else:
        print(text, file=sys.stderr)


def _write_error(text: str) -> Path:
    path = ROOT / "data" / "logs" / "start_error.log"
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    except OSError:
        pass
    return path


def run() -> int:
    try:
        import main
    except Exception as exc:  # noqa: BLE001
        path = _write_error(traceback.format_exc())
        try:
            from updater import rollback

            rolled = rollback(ROOT, ROOT / "data" / "update_state.json")
        except Exception:  # noqa: BLE001
            rolled = False
        if rolled:
            _message("방금 업데이트한 버전이 켜지지 않아서 이전 버전으로 되돌렸어요.\n확인을 누르면 다시 켤게요.", error=False)
            subprocess.Popen([sys.executable, str(ROOT / "launcher.py"), "--after", str(os.getpid())], cwd=str(ROOT),
                             creationflags=getattr(subprocess, "DETACHED_PROCESS", 0))
        else:
            _message(f"다니카를 켜지 못했어요.\n\n{exc}\n\n자세한 기록: {path}")
        return 1
    return main.main()


if __name__ == "__main__":
    sys.exit(run())
