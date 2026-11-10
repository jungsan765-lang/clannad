"""PC 상태 감시: CPU·메모리·저장 공간, (NVIDIA 면) 그래픽카드 온도·사용률.

1분마다 이 PC 에서만 읽는다(비용 없음). 문제가 생기면 다니카가 알려 준다(같은 문제는 30분에 한 번).
대화에서 "컴퓨터 왜 이렇게 느려?" 하면 마지막으로 읽은 상태를 함께 넘긴다.
게임 프레임(FPS)은 따로 측정 도구가 있어야 해서 읽지 않는다.
"""

from __future__ import annotations

import logging
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass, field
from typing import Callable

log = logging.getLogger("assistant.pc")

PC_WORDS = re.compile(r"컴퓨터|컴터|PC|피씨|피시|온도|발열|메모리|램|RAM|그래픽카드|그래픽 카드|GPU|CPU|씨피유|렉|버벅|느려|끊겨|용량|저장 공간",
                      re.IGNORECASE)


@dataclass
class PcStatus:
    cpu: float = 0.0
    ram_pct: float = 0.0
    ram_used_gb: float = 0.0
    ram_total_gb: float = 0.0
    disk_free_gb: float | None = None
    top_mem: list[tuple[str, float]] = field(default_factory=list)  # (프로그램, GB)
    top_cpu: list[tuple[str, float]] = field(default_factory=list)  # (프로그램, %)
    gpus: list[dict] = field(default_factory=list)  # name, temp, util, mem_used, mem_total (MB)


def _nvidia() -> list[dict]:
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total",
             "--format=csv,noheader,nounits"], capture_output=True, text=True, timeout=4,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)).stdout
    except (OSError, subprocess.SubprocessError):
        return []
    gpus = []
    for line in out.strip().splitlines():
        parts = [p.strip() for p in line.split(",")]
        if len(parts) == 5:
            try:
                gpus.append({"name": parts[0], "temp": float(parts[1]), "util": float(parts[2]),
                             "mem_used": float(parts[3]), "mem_total": float(parts[4])})
            except ValueError:
                continue
    return gpus


def read_status() -> PcStatus:
    import psutil

    vm = psutil.virtual_memory()
    s = PcStatus(cpu=psutil.cpu_percent(interval=0.5), ram_pct=vm.percent, ram_used_gb=vm.used / 1024 ** 3,
                 ram_total_gb=vm.total / 1024 ** 3)
    try:
        s.disk_free_gb = psutil.disk_usage(os.environ.get("SystemDrive", "C:") + "\\" if sys.platform == "win32"
                                           else "/").free / 1024 ** 3
    except OSError:
        pass
    procs = []
    for p in psutil.process_iter(["name", "memory_info", "cpu_percent"]):
        try:
            procs.append((p.info["name"] or "?", (p.info["memory_info"].rss if p.info["memory_info"] else 0) / 1024 ** 3,
                          p.info["cpu_percent"] or 0.0))
        except (psutil.Error, AttributeError):
            continue
    mem: dict[str, float] = {}
    cpu: dict[str, float] = {}
    for name, gb, c in procs:  # 같은 프로그램(크롬 등)은 합친다
        mem[name] = mem.get(name, 0) + gb
        cpu[name] = cpu.get(name, 0) + c
    s.top_mem = sorted(mem.items(), key=lambda x: -x[1])[:3]
    s.top_cpu = sorted(((n, c / max(1, psutil.cpu_count() or 1)) for n, c in cpu.items() if n != "System Idle Process"),
                       key=lambda x: -x[1])[:3]
    s.gpus = _nvidia()
    return s


def status_text(s: PcStatus) -> str:
    lines = [f"CPU {s.cpu:.0f}%", f"메모리 {s.ram_pct:.0f}% ({s.ram_used_gb:.1f}/{s.ram_total_gb:.0f}GB)"]
    if s.disk_free_gb is not None:
        lines.append(f"시스템 드라이브 남은 공간 {s.disk_free_gb:.0f}GB")
    for g in s.gpus:
        lines.append(f"그래픽카드 {g['name']}: {g['temp']:.0f}도, 사용률 {g['util']:.0f}%, "
                     f"그래픽 메모리 {g['mem_used'] / 1024:.1f}/{g['mem_total'] / 1024:.0f}GB")
    if not s.gpus:
        lines.append("그래픽카드 온도: 못 읽음(NVIDIA 가 아니거나 nvidia-smi 없음)")
    if s.top_mem:
        lines.append("메모리 많이 쓰는 프로그램: " + ", ".join(f"{n} {gb:.1f}GB" for n, gb in s.top_mem))
    if s.top_cpu:
        lines.append("CPU 많이 쓰는 프로그램: " + ", ".join(f"{n} {c:.0f}%" for n, c in s.top_cpu))
    return "[주인님 PC 상태 (방금 이 PC 에서 읽은 실제 값. 게임 프레임은 모름)]\n- " + "\n- ".join(lines)


class PcMonitor:
    def __init__(self, clock: Callable[[], float] = time.monotonic, gpu_hot: float = 85.0, ram_full: float = 92.0,
                 disk_low_gb: float = 5.0, cpu_busy: float = 95.0, quiet_minutes: float = 30.0):
        self.clock = clock
        self.gpu_hot, self.ram_full, self.disk_low_gb, self.cpu_busy = gpu_hot, ram_full, disk_low_gb, cpu_busy
        self.quiet = quiet_minutes * 60
        self.last: PcStatus | None = None
        self._told: dict[str, float] = {}
        self._busy_count = 0

    def check(self, s: PcStatus) -> list[str]:
        """새 상태 → 알릴 일들 (같은 종류는 quiet_minutes 에 한 번)."""
        self.last = s
        found: dict[str, str] = {}
        for g in s.gpus:
            if g["temp"] >= self.gpu_hot:
                found["gpu"] = f"그래픽카드 온도가 {g['temp']:.0f}도까지 올라갔다(사용률 {g['util']:.0f}%)."
        if s.ram_pct >= self.ram_full:
            top = f" 가장 많이 쓰는 건 {s.top_mem[0][0]}({s.top_mem[0][1]:.1f}GB)." if s.top_mem else ""
            found["ram"] = f"메모리를 {s.ram_pct:.0f}% 쓰고 있어서 게임이 버벅일 수 있다.{top}"
        if s.disk_free_gb is not None and s.disk_free_gb < self.disk_low_gb:
            found["disk"] = f"시스템 드라이브 남은 공간이 {s.disk_free_gb:.1f}GB 밖에 없다."
        self._busy_count = self._busy_count + 1 if s.cpu >= self.cpu_busy else 0
        if self._busy_count >= 3:  # 3분 넘게 계속
            top = f" 가장 많이 쓰는 건 {s.top_cpu[0][0]}." if s.top_cpu else ""
            found["cpu"] = f"CPU 를 몇 분째 {s.cpu:.0f}% 쓰고 있다.{top}"
        now = self.clock()
        out = []
        for kind, text in found.items():
            if now - self._told.get(kind, -1e9) >= self.quiet:
                self._told[kind] = now
                out.append(text)
        return out
