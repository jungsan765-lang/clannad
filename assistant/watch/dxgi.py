"""DXGI 화면 복제(Desktop Duplication)로 모니터 찍기 — Windows 전용.

GDI 방식(mss)은 전체화면·테두리 없는 창 게임이 포커스를 가지면(윈도우가 합성을 건너뜀)
멈춘 화면이나 검은 화면이 찍힌다. DXGI 는 모니터에 실제로 나가는 화면을 받아서 게임도 제대로 찍힌다.
(OBS '디스플레이 캡처'와 같은 방식)

DXGI 객체(COM)는 한 스레드에서만 다루는 게 안전해서, 전용 스레드 하나가 카메라를 갖고
다른 스레드의 요청을 받아 찍어 준다. 쓸 수 없으면(dxcam 없음, 오류) None → 호출한 쪽이 mss 로 찍는다.
"""

from __future__ import annotations

import logging
import queue
import sys
import threading
import time

from PIL import Image

log = logging.getLogger("assistant.watch")
Rect = tuple[int, int, int, int]  # left, top, width, height (실제 픽셀)


def _overlap(a: Rect, b: Rect) -> int:
    w = min(a[0] + a[2], b[0] + b[2]) - max(a[0], b[0])
    h = min(a[1] + a[3], b[1] + b[3]) - max(a[1], b[1])
    return max(0, w) * max(0, h)


class DxgiGrabber:
    def __init__(self, timeout: float = 5.0):
        self.timeout = timeout
        self.failed = sys.platform != "win32"  # 쓸 수 없으면 True (그 뒤로는 mss 만)
        self._requests: queue.Queue = queue.Queue()
        self._thread: threading.Thread | None = None
        self._lock = threading.Lock()

    def grab(self, rect: Rect) -> Image.Image | None:
        """rect 모니터를 찍는다. 못 찍으면 None."""
        if self.failed:
            return None
        with self._lock:
            if self._thread is None:
                self._thread = threading.Thread(target=self._loop, daemon=True, name="dxgi-capture")
                self._thread.start()
        answer: queue.Queue = queue.Queue(maxsize=1)
        self._requests.put((tuple(rect), answer))
        try:
            return answer.get(timeout=self.timeout)
        except queue.Empty:
            log.warning("DXGI 화면 찍기가 %.0f초 안에 끝나지 않음 → 이번엔 다른 방식으로", self.timeout)
            return None

    # ------------------------------------------------------------ 전용 스레드

    def _loop(self) -> None:
        try:
            import comtypes

            try:
                comtypes.CoInitializeEx(comtypes.COINIT_APARTMENTTHREADED)
            except OSError:
                pass  # 이미 초기화됨
            import dxcam
        except Exception as exc:  # noqa: BLE001 - 설치 안 됨 등 → mss 로
            log.warning("DXGI 화면 찍기를 쓸 수 없어 기존 방식(mss)을 씁니다: %r", exc)
            self._give_up()
            return
        log.info("화면 찍기: DXGI (게임 화면도 찍힘)")
        cameras: dict[Rect, object] = {}
        while True:
            rect, answer = self._requests.get()
            try:
                img = self._grab(dxcam, cameras, rect)
            except Exception as exc:  # noqa: BLE001 - 해상도 변경 등 → 카메라를 새로 만들게
                log.warning("DXGI 화면 찍기 실패: %r", exc)
                cam = cameras.pop(rect, None)
                try:
                    if cam is not None:
                        cam.release()
                except Exception:  # noqa: BLE001
                    pass
                img = None
            answer.put(img)

    def _give_up(self) -> None:
        self.failed = True
        while True:  # 기다리던 요청에 '못 찍음'을 돌려준다
            try:
                _, answer = self._requests.get_nowait()
            except queue.Empty:
                return
            answer.put(None)

    def _grab(self, dxcam, cameras: dict, rect: Rect) -> Image.Image | None:
        cam = cameras.get(rect)
        if cam is None:
            cam = self._camera_for(dxcam, rect)
            if cam is None:
                log.warning("DXGI 에서 이 모니터를 찾지 못함: %s", rect)
                return None
            cameras[rect] = cam
        # 화면이 그대로면 새 프레임이 없어서 마지막으로 받은 프레임을 쓴다 (그게 지금 화면)
        frame = cam.grab(new_frame_only=False)
        tries = 0
        while frame is None and tries < 20:  # 카메라를 막 만들었으면 첫 화면이 올 때까지 잠깐
            time.sleep(0.05)
            frame = cam.grab(new_frame_only=False)
            tries += 1
        if frame is None:
            return None
        return Image.fromarray(frame)

    @staticmethod
    def _camera_for(dxcam, rect: Rect):
        factory = vars(dxcam).get("__factory")
        if factory is None:
            return None
        best, best_area = None, 0
        for d, outputs in enumerate(factory.outputs):
            for o, output in enumerate(outputs):
                output.update_desc()
                c = output.desc.DesktopCoordinates
                area = _overlap(rect, (c.left, c.top, c.right - c.left, c.bottom - c.top))
                if area > best_area:
                    best, best_area = (d, o), area
        if best is None:
            return None
        return dxcam.create(device_idx=best[0], output_idx=best[1], output_color="RGB")
