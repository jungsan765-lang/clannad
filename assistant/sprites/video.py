"""ffmpeg으로 영상 정보를 읽고 프레임을 numpy 배열로 꺼낸다."""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

import numpy as np


class VideoError(RuntimeError):
    pass


@dataclass(frozen=True)
class VideoInfo:
    width: int
    height: int
    fps: float
    duration: float
    has_alpha: bool


def _tool(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise VideoError(
            f"{name}을(를) 찾을 수 없어요. ffmpeg를 설치하고 PATH에 넣어주세요 "
            "(Windows: winget install Gyan.FFmpeg)."
        )
    return path


def parse_time(value: str | int | float) -> float:
    """'1:02.5', '62.5', 62.5 같은 값을 초로 바꾼다."""
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    parts = text.split(":")
    if not 1 <= len(parts) <= 3:
        raise ValueError(f"시간 형식을 읽을 수 없어요: {value!r} (예: 12.5, 0:12.5, 1:02:03)")
    try:
        seconds = 0.0
        for part in parts:
            seconds = seconds * 60 + float(part)
    except ValueError as exc:
        raise ValueError(f"시간 형식을 읽을 수 없어요: {value!r} (예: 12.5, 0:12.5)") from exc
    return seconds


def format_time(seconds: float) -> str:
    minutes, sec = divmod(max(seconds, 0.0), 60)
    return f"{int(minutes)}:{sec:05.2f}"


def probe(path: str | Path) -> VideoInfo:
    path = Path(path)
    if not path.is_file():
        raise VideoError(f"영상 파일이 없어요: {path}")
    out = subprocess.run(
        [
            _tool("ffprobe"), "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height,avg_frame_rate,r_frame_rate,pix_fmt,duration:format=duration",
            "-of", "json", str(path),
        ],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        raise VideoError(f"영상을 읽지 못했어요: {out.stderr.strip()}")
    data = json.loads(out.stdout)
    if not data.get("streams"):
        raise VideoError(f"영상 트랙이 없어요: {path}")
    stream = data["streams"][0]

    def rate(text: str | None) -> float:
        if not text or text == "0/0":
            return 0.0
        num, _, den = text.partition("/")
        return float(num) / float(den or 1)

    fps = rate(stream.get("avg_frame_rate")) or rate(stream.get("r_frame_rate")) or 30.0
    duration = float(stream.get("duration") or data.get("format", {}).get("duration") or 0.0)
    pix_fmt = stream.get("pix_fmt", "")
    has_alpha = any(tag in pix_fmt for tag in ("yuva", "rgba", "argb", "bgra", "abgr", "gbrap", "ya"))
    return VideoInfo(int(stream["width"]), int(stream["height"]), fps, duration, has_alpha)


def output_size(info: VideoInfo, crop: tuple[int, int, int, int] | None, max_side: int | None) -> tuple[int, int, float]:
    """crop과 축소를 적용한 뒤의 (너비, 높이, 축소 배율)."""
    w, h = (crop[2], crop[3]) if crop else (info.width, info.height)
    scale = 1.0
    if max_side and max(w, h) > max_side:
        scale = max_side / max(w, h)
    # yuv 계열 필터와 맞추려고 짝수로 맞춘다
    ow = max(2, int(round(w * scale / 2)) * 2)
    oh = max(2, int(round(h * scale / 2)) * 2)
    return ow, oh, scale


def iter_frames(
    path: str | Path,
    start: float,
    end: float | None,
    fps: float | None,
    crop: tuple[int, int, int, int] | None = None,
    rgba: bool = False,
    max_side: int | None = None,
) -> Iterator[np.ndarray]:
    """[start, end) 구간을 fps로 뽑아 RGB(또는 RGBA) uint8 배열로 하나씩 돌려준다."""
    info = probe(path)
    w, h, _ = output_size(info, crop, max_side)
    filters = []
    if fps:
        filters.append(f"fps={fps}")
    if crop:
        cw, ch, cx, cy = crop[2], crop[3], crop[0], crop[1]
        filters.append(f"crop={cw}:{ch}:{cx}:{cy}")
    filters.append(f"scale={w}:{h}:flags=area")
    cmd = [_tool("ffmpeg"), "-v", "error", "-nostdin"]
    if start > 0:
        cmd += ["-ss", f"{start:.3f}"]
    cmd += ["-i", str(path)]
    if end is not None:
        if end <= start:
            raise ValueError(f"끝 시간({end})이 시작 시간({start})보다 커야 해요.")
        cmd += ["-t", f"{end - start:.3f}"]
    channels = 4 if rgba else 3
    cmd += ["-vf", ",".join(filters), "-f", "rawvideo", "-pix_fmt", "rgba" if rgba else "rgb24", "-"]

    frame_bytes = w * h * channels
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    finished = False
    try:
        assert proc.stdout is not None
        while True:
            buf = proc.stdout.read(frame_bytes)
            if len(buf) < frame_bytes:
                break
            yield np.frombuffer(buf, np.uint8).reshape(h, w, channels).copy()
        finished = True
    finally:
        if not finished:  # 호출한 쪽이 중간에 멈춤
            proc.kill()
        if proc.stdout:
            proc.stdout.close()
        err = proc.stderr.read().decode(errors="replace") if proc.stderr else ""
        if proc.stderr:
            proc.stderr.close()
        code = proc.wait()
    if code != 0:
        raise VideoError(f"ffmpeg 오류: {err.strip() or code}")
