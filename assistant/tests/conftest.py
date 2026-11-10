import math
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

GREEN = (0, 177, 64)
FPS = 24


def draw_figure(t: float, w: int = 640, h: int = 360) -> np.ndarray:
    """가짜 캐릭터: 1초 주기로 위아래로 흔들리고, 3~5초엔 입을 벌렸다 닫고, 5~6초엔 점프."""
    img = np.zeros((h, w, 3), np.uint8)
    img[:] = GREEN
    bob = 10 * math.sin(2 * math.pi * t)
    jump = -60 * math.sin(math.pi * (t - 5)) if 5 <= t < 6 else 0
    cy = int(230 + bob + jump)
    cv2.ellipse(img, (320, cy), (55, 80), 0, 0, 360, (200, 80, 120), -1, cv2.LINE_AA)
    cv2.circle(img, (320, cy - 115), 42, (240, 200, 170), -1, cv2.LINE_AA)
    cv2.ellipse(img, (320, cy - 135), (46, 26), 0, 180, 360, (40, 40, 110), -1, cv2.LINE_AA)
    mouth_open = 3 <= t < 5 and int(t * 8) % 2 == 0
    cv2.rectangle(img, (308, cy - 100), (332, cy - (88 if mouth_open else 97)), (120, 30, 30), -1)
    return img


@pytest.fixture(scope="session")
def green_video(tmp_path_factory) -> Path:
    path = tmp_path_factory.mktemp("video") / "fake.mp4"
    w, h, seconds = 640, 360, 7
    proc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
         "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", str(path)],
        stdin=subprocess.PIPE,
    )
    for i in range(seconds * FPS):
        proc.stdin.write(draw_figure(i / FPS).tobytes())
    proc.stdin.close()
    assert proc.wait() == 0
    return path


RECIPE = """
name = "fake"
source = "{src}"
height = 240
fps = 24
matte = "chroma"
fidgets = ["happy"]
fidget_every = [5, 6]

[motions.idle]
start = 0.0
end = 2.6
loop = "loop"

[motions.talk]
start = "0:03"
end = "0:04.5"
loop = "pingpong"

[motions.happy]
start = 5.0
end = 6.0
loop = "once"
then = "idle"

[emotions]
worried = "talk"
"""


@pytest.fixture(scope="session")
def built(tmp_path_factory, green_video):
    from sprites.build import build
    from sprites.recipe import load_recipe

    base = tmp_path_factory.mktemp("build")
    recipe_path = base / "fake.toml"
    recipe_path.write_text(RECIPE.format(src=green_video.as_posix()), encoding="utf-8")
    logs: list[str] = []
    manifest = build(load_recipe(recipe_path), base / "out", base / "work", base / "models", logs.append)
    return {"manifest": manifest, "out": base / "out", "work": base / "work", "recipe": recipe_path, "logs": logs}
