import concurrent.futures
import json
import os
import pathlib
import subprocess
import time

root = pathlib.Path('/workspace/scratch/a62414469990')
out = root / 'ci309-inspection'
project = root / 'workflow-authoritative-final'
dates = ['2026-10-10T23:59:59+09:00', '2026-10-11T00:00:00+09:00', '2026-10-11T23:59:59+09:00', '2026-10-12T00:00:00+09:00']
tests = ['tests/test_v0167.cjs', 'tests/test_task_branches_v01611.cjs']

def run(job):
    index, date, test = job
    env = {**os.environ, 'TZ': 'UTC', 'CRPG_CALENDAR_START': date}
    start = time.monotonic()
    result = subprocess.run(['node', '--require', str(out / 'start-date.cjs'), test], cwd=project, env=env, capture_output=True, text=True, timeout=180)
    name = f'{pathlib.Path(test).stem}-date-{index}.log'
    (out / name).write_text(result.stdout + result.stderr)
    record = {'test': test, 'startup_kst': date, 'TZ': 'UTC', 'exit': result.returncode, 'seconds': round(time.monotonic() - start, 2), 'log': name}
    summary = next((json.loads(line) for line in reversed(result.stdout.splitlines()) if line.startswith('{') and 'checks' in line), {})
    record['summary'] = summary
    print(json.dumps(record, ensure_ascii=False), flush=True)
    return record

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(run, [(i, date, test) for i, date in enumerate(dates) for test in tests]))
(out / 'calendar-matrix-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
raise SystemExit(0 if all(item['exit'] == 0 and item['summary'].get('ok') is True for item in results) else 1)
