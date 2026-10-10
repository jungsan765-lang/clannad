#!/usr/bin/env python3
"""Checkpoint the final release gates, preserving original failures."""
from pathlib import Path
import ast
import concurrent.futures
import datetime
import gzip
import hashlib
import json
import os
import signal
import subprocess
import sys
import time

ROOT = Path('/workspace/scratch/a62414469990/crpg-v01618-work/genshin-crpg')
OUT = ROOT / 'docs/data/full_balance_v01621/release_verified_guest_final_20261010'
VERIFIER = ROOT / 'tools/verify_release.py'

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()

def atomic_json(path, value):
    temporary = path.with_suffix(path.suffix + '.new')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)

def declaration(name):
    for node in ast.parse(VERIFIER.read_text()).body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            if any(isinstance(n, (ast.Call, ast.Attribute, ast.Lambda)) for n in ast.walk(node.value)):
                raise ValueError(f'unexpected executable expression in {name}')
            return eval(compile(ast.Expression(node.value), str(VERIFIER), 'eval'), {'__builtins__': {}}, {})
    raise ValueError(f'{name} declaration not found')

TESTS = declaration('TESTS')
assert len(TESTS) == 177, len(TESTS)
assert len(set(TESTS)) == len(TESTS)

def input_manifest():
    paths = [Path('package.json'), Path('package-lock.json'), Path('content/release-notes.json'),
             Path('content/db.json'), Path('tools/verify_release.py')]
    unrelated_evidence_tools = {'tools/audit_build_parity_v01621.cjs',
                                'tools/verify_balance_evidence_v01621.py'}
    paths.extend(Path(test) for test in TESTS)
    for folder in ('source', 'server', 'tools'):
        paths.extend(p.relative_to(ROOT) for p in (ROOT / folder).rglob('*')
                     if p.is_file() and '__pycache__' not in p.parts and p.suffix != '.pyc'
                     and 'node_modules' not in p.parts
                     and p.relative_to(ROOT).as_posix() not in unrelated_evidence_tools)
    rows = []
    for path in sorted(set(paths)):
        full = ROOT / path
        raw = full.read_bytes()
        rows.append({'path': path.as_posix(), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()})
    return rows

def worker_limit():
    value = json.loads((OUT / 'workers.json').read_text()).get('maxWorkers', 1)
    if value not in (1, 2):
        raise ValueError('maxWorkers must be 1 or 2')
    return value

def run(index):
    test = TESTS[index]
    command = [sys.executable if test.endswith('.py') else 'node', test]
    log_path = OUT / 'logs' / (f'{index + 1:03d}_' + Path(test).name + '.log')
    # Preserve a partial interrupted run separately before retrying an unfinished gate.
    if log_path.exists():
        partial = log_path.read_bytes()
        saved = log_path.with_name(log_path.name + '.interrupted-' + str(time.time_ns()) + '.gz')
        saved.write_bytes(gzip.compress(partial, mtime=0))
    started = time.monotonic()
    started_at = now()
    atomic_json(OUT / 'active' / f'{index + 1:03d}.json',
                {'index': index + 1, 'test': test, 'startedAt': started_at, 'command': command})
    print(json.dumps({'kind': 'gate_start', 'index': index + 1, 'total': len(TESTS), 'test': test}), flush=True)
    timed_out = False
    exception = None
    return_code = None
    with log_path.open('wb') as output:
        process = None
        try:
            process = subprocess.Popen(command, cwd=ROOT, stdout=output,
                                       stderr=subprocess.STDOUT, start_new_session=True)
            try:
                return_code = process.wait(timeout=900)
            except subprocess.TimeoutExpired:
                timed_out = True
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    return_code = process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    return_code = process.wait()
        except Exception as error:
            exception = f'{type(error).__name__}: {error}'
            output.write((exception + '\n').encode())
            if process is not None and process.poll() is None:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()
    raw = log_path.read_bytes()
    text = raw.decode('utf-8', errors='replace')
    classification = None
    if return_code != 0 or timed_out or exception:
        if test == 'tests/test_save_v01344.cjs' and ('invalid object name' in text or 'Missing historical DB snapshot' in text or 'ENOENT' in text):
            classification = 'historical_input_unavailable'
        elif test == 'tests/test_release_isolation_v01513.py' and 'not greater than 1' in text:
            classification = 'editorial_raw_input_gap_requires_authored_db'
        elif timed_out:
            classification = 'timeout'
        elif return_code == -9:
            classification = 'sigkill_requires_resource_investigation'
        else:
            classification = 'unclassified_failure_requires_investigation'
    gzip_path = log_path.with_suffix(log_path.suffix + '.gz')
    gzip_path.write_bytes(gzip.compress(raw, mtime=0))
    row = {'index': index + 1, 'test': test,
           'ok': return_code == 0 and not timed_out and exception is None,
           'returnCode': return_code, 'timedOut': timed_out, 'exception': exception,
           'seconds': round(time.monotonic() - started, 3),
           'startedAt': started_at, 'endedAt': now(),
           'log': gzip_path.relative_to(OUT).as_posix(), 'logBytes': len(raw),
           'logSha256': hashlib.sha256(raw).hexdigest(),
           'failureClassification': classification}
    atomic_json(OUT / 'per_gate' / f'{index + 1:03d}.json', row)
    log_path.unlink()
    (OUT / 'active' / f'{index + 1:03d}.json').unlink()
    return row

OUT.mkdir(parents=True, exist_ok=True)
for folder in ('logs', 'active', 'per_gate'):
    (OUT / folder).mkdir(exist_ok=True)
snapshot_path = OUT / 'input_manifest.json'
current_manifest = input_manifest()
if snapshot_path.exists():
    initial_manifest = json.loads(snapshot_path.read_text())['files']
    if initial_manifest != current_manifest:
        raise SystemExit('inputs changed since checkpoint; start a separate evidence run')
else:
    initial_manifest = current_manifest
    atomic_json(snapshot_path, {'startedAt': now(), 'snapshotRole': 'final_original_four_source_changes',
                                'excludedNonGateEvidenceTools': ['tools/audit_build_parity_v01621.cjs', 'tools/verify_balance_evidence_v01621.py'],
                                'testSnapshotScope': '177 TESTS-listed programs only; unused temporary guest test excluded',
                                'runnerSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                                'files': initial_manifest})
if not (OUT / 'workers.json').exists():
    atomic_json(OUT / 'workers.json', {'maxWorkers': 1})
atomic_json(OUT / 'plan.json', {'schemaVersion': 2, 'tests': TESTS, 'gateCount': len(TESTS),
                              'timeoutSeconds': 900, 'maxWorkerCeiling': 2,
                              'workerControl': 'workers.json; starts at 1, root can enable 2 after other native work finishes',
                              'pauseControl': 'create PAUSE_REQUESTED; finish active gates then exit before starting another',
                              'buildStep': 'root completed final browser/server builds before this snapshot; temporary guest change was reverted as unreachable'})
results = {}
for path in sorted((OUT / 'per_gate').glob('*.json')):
    row = json.loads(path.read_text())
    index = row['index'] - 1
    assert TESTS[index] == row['test']
    results[index] = row
pending = [i for i in range(len(TESTS)) if i not in results]
active = {}
wall_started = time.monotonic()
paused = False
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    while pending or active:
        limit = worker_limit()
        paused = (OUT / 'PAUSE_REQUESTED').exists()
        while pending and len(active) < limit and not paused:
            index = pending.pop(0)
            active[pool.submit(run, index)] = index
        atomic_json(OUT / 'checkpoint.json', {'status': 'pausing' if paused else 'running',
                                             'completed': len(results), 'total': len(TESTS),
                                             'passed': sum(r['ok'] for r in results.values()),
                                             'failed': sum(not r['ok'] for r in results.values()),
                                             'active': [TESTS[i] for i in active.values()],
                                             'maxWorkers': limit, 'updatedAt': now()})
        if not active:
            break
        done, _ = concurrent.futures.wait(active, timeout=2,
                                          return_when=concurrent.futures.FIRST_COMPLETED)
        for future in done:
            index = active.pop(future)
            row = future.result()
            results[index] = row
            with (OUT / 'journal.jsonl').open('a') as journal:
                journal.write(json.dumps(row, ensure_ascii=False) + '\n')
                journal.flush()
                os.fsync(journal.fileno())
            ordered = [results[i] for i in sorted(results)]
            atomic_json(OUT / 'results.json', ordered)
            print(json.dumps({'kind': 'gate_result', **row}, ensure_ascii=False), flush=True)

final_manifest = input_manifest()
initial_by_path = {r['path']: r for r in initial_manifest}
final_by_path = {r['path']: r for r in final_manifest}
drift = [{'path': p, 'before': initial_by_path.get(p), 'after': final_by_path.get(p)}
         for p in sorted(set(initial_by_path) | set(final_by_path))
         if initial_by_path.get(p) != final_by_path.get(p)]
ordered = [results[i] for i in sorted(results)]
summary = {'schemaVersion': 2, 'snapshotRole': 'final_original_four_source_changes',
           'complete': len(results) == len(TESTS), 'paused': paused,
           'gateCount': len(TESTS), 'completed': len(results),
           'passed': sum(r['ok'] for r in ordered), 'failed': sum(not r['ok'] for r in ordered),
           'inputDrift': drift, 'totalGateSeconds': round(sum(r['seconds'] for r in ordered), 3),
           'runnerWallSecondsThisSession': round(time.monotonic() - wall_started, 3),
           'finishedAt': now(), 'failures': [r for r in ordered if not r['ok']]}
atomic_json(OUT / 'results.json', ordered)
atomic_json(OUT / 'summary.json', summary)
atomic_json(OUT / 'checkpoint.json', {'status': 'complete' if summary['complete'] else 'paused', **summary})
print(json.dumps({'kind': 'release_complete', **summary}, ensure_ascii=False), flush=True)
raise SystemExit(0 if not summary['failed'] and not drift else 1)
