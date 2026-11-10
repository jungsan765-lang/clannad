"""바탕화면에 떠 있는 캐릭터 창. make_character.py 가 만든 프레임 묶음을 재생한다."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from PySide6.QtCore import QElapsedTimer, QPoint, QSize, Qt, QTimer, Signal
from PySide6.QtGui import QGuiApplication, QImage, QPainter, QPixmap
from PySide6.QtWidgets import QWidget

SUPPORTED_FORMAT = 1


@dataclass
class Motion:
    name: str
    folder: Path
    count: int
    fps: float
    loop: str  # loop | pingpong | once
    then: str | None
    ext: str
    pixmaps: list[QPixmap] = field(default_factory=list)

    def frame_at(self, seconds: float) -> tuple[int, bool]:
        """경과 시간에 맞는 프레임 번호와 '한 번 재생이 끝났는지'."""
        k = int(seconds * self.fps)
        n = self.count
        if self.loop == "loop":
            return k % n, False
        if self.loop == "pingpong":
            if n == 1:
                return 0, False
            period = 2 * n - 2
            k %= period
            return (k if k < n else period - k), False
        return min(k, n - 1), k >= n


class SpriteSet:
    """manifest.json 을 읽고 동작별 프레임을 처음 쓸 때 불러온다."""

    def __init__(self, folder: str | Path, scale: float = 1.0, device_ratio: float | None = None):
        self.folder = Path(folder)
        path = self.folder / "manifest.json"
        if not path.is_file():
            raise FileNotFoundError(f"manifest.json 이 없어요: {path}")
        data = json.loads(path.read_text(encoding="utf-8"))
        if data.get("format") != SUPPORTED_FORMAT:
            raise ValueError(f"지원하지 않는 manifest 형식이에요: {data.get('format')}")
        self.name: str = data["name"]
        self.scale = scale
        self.ratio = device_ratio or (QGuiApplication.primaryScreen().devicePixelRatio() if QGuiApplication.primaryScreen() else 1.0)
        w, h = data["size"]
        self.image_size = QSize(w, h)
        self.size = QSize(max(1, round(w * scale)), max(1, round(h * scale)))
        ext = data.get("image_format", "png")
        self.motions: dict[str, Motion] = {
            name: Motion(name, self.folder / m["dir"], int(m["frames"]), float(m["fps"]),
                         m.get("loop", "loop"), m.get("then"), ext)
            for name, m in data["motions"].items()
        }
        if not self.motions:
            raise ValueError("동작이 하나도 없어요.")
        self.default: str = data.get("default") or next(iter(self.motions))
        self.talk: str | None = data.get("talk")
        self.emotions: dict[str, str] = data.get("emotions", {})

    def motion(self, name: str) -> Motion:
        return self.motions[name]

    def frames(self, name: str) -> list[QPixmap]:
        m = self.motions[name]
        if not m.pixmaps:
            # 화면 배율(예: 150%)까지 고려한 실제 픽셀 크기로 미리 줄여 선명하게 그린다
            pw = max(1, round(self.size.width() * self.ratio))
            ph = max(1, round(self.size.height() * self.ratio))
            for i in range(m.count):
                img = QImage(str(m.folder / f"{i:04d}.{m.ext}"))
                if img.isNull():
                    raise FileNotFoundError(f"프레임을 읽지 못했어요: {m.folder / f'{i:04d}.{m.ext}'}")
                if img.width() != pw or img.height() != ph:
                    img = img.scaled(pw, ph, Qt.AspectRatioMode.IgnoreAspectRatio, Qt.TransformationMode.SmoothTransformation)
                pix = QPixmap.fromImage(img)
                pix.setDevicePixelRatio(self.ratio)
                m.pixmaps.append(pix)
        return m.pixmaps

    def motion_for_emotion(self, emotion: str) -> str:
        return self.emotions.get(emotion, self.default)


class CharacterWindow(QWidget):
    """투명·테두리 없음·항상 위 캐릭터 창.

    - 왼쪽 드래그: 이동 (끝나면 moved)
    - 왼쪽 클릭: clicked
    - 오른쪽 클릭: menu_requested(화면 좌표)
    """

    clicked = Signal()
    menu_requested = Signal(QPoint)
    moved = Signal(QPoint)
    motion_changed = Signal(str)

    DRAG_THRESHOLD = 4

    def __init__(self, sprites: SpriteSet, max_fps: float = 30, take_focus: bool = False, parent: QWidget | None = None):
        super().__init__(parent)
        self.sprites = sprites
        self.max_fps = max_fps
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint | Qt.WindowType.WindowStaysOnTopHint | Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        if not take_focus:
            self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating)
        self.setFixedSize(sprites.size)
        self.setWindowTitle(sprites.name)

        self._timer = QTimer(self)
        self._timer.setTimerType(Qt.TimerType.PreciseTimer)
        self._timer.timeout.connect(self._tick)
        self._clock = QElapsedTimer()
        self._talking = False
        self._mood: str | None = None  # 반복 재생되는 감정 동작(기본 동작 대신)
        self._current: Motion = sprites.motion(sprites.default)
        self._pixmaps: list[QPixmap] = []
        self._index = 0
        self._press_global: QPoint | None = None
        self._press_pos = QPoint()
        self._dragging = False
        self.play(sprites.default)

    # ------------------------------------------------------------ 상태

    @property
    def current_motion(self) -> str:
        return self._current.name

    @property
    def frame_index(self) -> int:
        return self._index

    @property
    def talking(self) -> bool:
        return self._talking

    def base_motion(self) -> str:
        if self._talking and self.sprites.talk:
            return self.sprites.talk
        return self._mood or self.sprites.default

    def play(self, name: str) -> None:
        motion = self.sprites.motion(name)
        self._current = motion
        self._pixmaps = self.sprites.frames(name)
        self._index = 0
        self._clock.restart()
        self._timer.start(max(1, round(1000 / min(motion.fps, self.max_fps))))
        self.update()
        self.motion_changed.emit(name)

    def set_emotion(self, emotion: str) -> None:
        name = self.sprites.motion_for_emotion(emotion)
        motion = self.sprites.motion(name)
        if motion.loop == "once":
            self.play(name)  # 끝나면 then 이나 기본 동작으로 돌아감
            return
        self._mood = None if name == self.sprites.default else name
        if self._current.loop != "once":
            self.play(self.base_motion())

    def set_talking(self, talking: bool) -> None:
        if talking == self._talking:
            return
        self._talking = talking
        if self._current.loop != "once" and self._current.name != self.base_motion():
            self.play(self.base_motion())

    def set_max_fps(self, fps: float) -> None:
        """게임 중엔 15 정도로 낮춘다."""
        self.max_fps = max(1.0, fps)
        self._timer.setInterval(max(1, round(1000 / min(self._current.fps, self.max_fps))))

    def set_click_through(self, enabled: bool) -> None:
        """켜면 마우스가 캐릭터를 통과해 뒤의 창(게임)으로 간다."""
        visible = self.isVisible()
        self.setWindowFlag(Qt.WindowType.WindowTransparentForInput, enabled)
        if visible:
            self.show()  # 플래그를 바꾸면 창이 숨겨져서 다시 띄움

    def advance(self, seconds: float) -> None:
        """테스트용: 시간을 직접 지정해 한 틱 진행."""
        self._step(seconds)

    # ------------------------------------------------------------ 재생

    def _tick(self) -> None:
        self._step(self._clock.elapsed() / 1000.0)

    def _step(self, seconds: float) -> None:
        index, finished = self._current.frame_at(seconds)
        if finished:
            nxt = self._current.then or self.base_motion()
            if nxt == self._current.name:  # 한 번 재생 동작이 기본이면 마지막 장면에서 멈춤
                self._timer.stop()
            else:
                self.play(nxt)
                return
        if index != self._index:
            self._index = index
            self.update()

    def paintEvent(self, event) -> None:  # noqa: N802 (Qt 이름 규칙)
        if not self._pixmaps:
            return
        painter = QPainter(self)
        painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_Source)
        painter.fillRect(self.rect(), Qt.GlobalColor.transparent)
        painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_SourceOver)
        painter.drawPixmap(0, 0, self._pixmaps[self._index])
        painter.end()

    # ------------------------------------------------------------ 마우스

    def mousePressEvent(self, event) -> None:  # noqa: N802
        if event.button() == Qt.MouseButton.LeftButton:
            self._press_global = event.globalPosition().toPoint()
            self._press_pos = self.pos()
            self._dragging = False
        elif event.button() == Qt.MouseButton.RightButton:
            self.menu_requested.emit(event.globalPosition().toPoint())

    def mouseMoveEvent(self, event) -> None:  # noqa: N802
        if self._press_global is None:
            return
        delta = event.globalPosition().toPoint() - self._press_global
        if not self._dragging and delta.manhattanLength() > self.DRAG_THRESHOLD:
            self._dragging = True
        if self._dragging:
            self.move(self._press_pos + delta)

    def mouseReleaseEvent(self, event) -> None:  # noqa: N802
        if event.button() != Qt.MouseButton.LeftButton or self._press_global is None:
            return
        self._press_global = None
        if self._dragging:
            self.moved.emit(self.pos())
        else:
            self.clicked.emit()
