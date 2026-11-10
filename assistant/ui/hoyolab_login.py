"""HoYoLAB 로그인 창: 안에 작은 브라우저를 띄워 주인님이 평소처럼 로그인하면, 필요한 로그인 정보(쿠키)만 받는다.

브라우저는 '기록 남기지 않는' 모드라 창을 닫으면 아무것도 남지 않는다. 받은 정보는 호출한 쪽이 암호화해서 저장한다.
구글 로그인은 이런 창에서 막힐 수 있어서, 직접 붙여넣는 칸도 둔다.
"""

from __future__ import annotations

import re

from PySide6.QtCore import Qt, QTimer, QUrl
from PySide6.QtWidgets import QDialog, QHBoxLayout, QLabel, QPlainTextEdit, QPushButton, QVBoxLayout

WANTED = ("ltuid_v2", "ltoken_v2", "ltmid_v2", "account_id_v2", "account_mid_v2", "cookie_token_v2")
LOGIN_URL = "https://www.hoyolab.com/home"


def parse_cookie_text(text: str) -> dict[str, str]:
    """'ltuid_v2=123; ltoken_v2=abc' 같은 글에서 필요한 값만."""
    out = {}
    for name, value in re.findall(r"([A-Za-z0-9_]+)\s*=\s*([^;\s]+)", text or ""):
        if name in WANTED:
            out[name] = value
    return out


def complete(cookies: dict) -> bool:
    return bool(cookies.get("ltuid_v2") and cookies.get("ltoken_v2"))


class HoyolabLogin(QDialog):
    def __init__(self, parent=None, web: bool = True):
        super().__init__(parent)
        self.setWindowTitle("HoYoLAB 로그인")
        self.setWindowFlag(Qt.WindowType.WindowStaysOnTopHint)
        self.resize(980, 760)
        self.cookies: dict[str, str] = {}
        self.info = QLabel("HoYoLAB 에 평소처럼 로그인해 주세요(오른쪽 위 로그인). 로그인이 확인되면 이 창은 저절로 닫혀요.\n"
                           "구글 로그인이 이 창에서 안 되면 이메일 로그인을 쓰거나, 아래 '직접 붙여넣기'를 써 주세요.")
        self.info.setWordWrap(True)
        lay = QVBoxLayout(self)
        lay.addWidget(self.info)
        self.view = None
        if web:
            try:
                from PySide6.QtWebEngineCore import QWebEngineProfile, QWebEnginePage
                from PySide6.QtWebEngineWidgets import QWebEngineView

                self.profile = QWebEngineProfile(self)  # 이름 없는 프로필 = 기록을 남기지 않음
                self.profile.cookieStore().cookieAdded.connect(self._on_cookie)
                self.page = QWebEnginePage(self.profile, self)
                self.view = QWebEngineView(self)
                self.view.setPage(self.page)
                self.view.load(QUrl(LOGIN_URL))
                lay.addWidget(self.view, 1)
            except Exception as exc:  # noqa: BLE001 - 웹 엔진이 없으면 붙여넣기만
                self.info.setText(f"이 PC 에서는 로그인 창을 열 수 없어요({exc}). 아래 '직접 붙여넣기'를 써 주세요.")
        self.paste = QPlainTextEdit()
        self.paste.setPlaceholderText("직접 붙여넣기: HoYoLAB 쿠키에서 ltuid_v2=…; ltoken_v2=… 부분 (다른 사람에게 보여 주지 마세요)")
        self.paste.setMaximumHeight(70)
        use = QPushButton("붙여넣은 걸로 저장")
        use.clicked.connect(self._use_paste)
        cancel = QPushButton("취소")
        cancel.clicked.connect(self.reject)
        row = QHBoxLayout()
        row.addWidget(self.paste, 1)
        row.addWidget(use)
        row.addWidget(cancel)
        lay.addLayout(row)

    def _on_cookie(self, cookie) -> None:
        domain = cookie.domain()
        if "hoyolab" not in domain and "hoyoverse" not in domain:
            return
        name = bytes(cookie.name()).decode("utf-8", "replace")
        if name in WANTED:
            self.cookies[name] = bytes(cookie.value()).decode("utf-8", "replace")
        if complete(self.cookies) and self.result() == 0:
            self.info.setText("로그인 확인됐어요. 저장하고 닫을게요.")
            QTimer.singleShot(1200, self.accept)

    def _use_paste(self) -> None:
        got = parse_cookie_text(self.paste.toPlainText())
        if not complete(got):
            self.info.setText("ltuid_v2 와 ltoken_v2 가 둘 다 있어야 해요. 다시 확인해 주세요.")
            return
        self.cookies = got
        self.accept()
