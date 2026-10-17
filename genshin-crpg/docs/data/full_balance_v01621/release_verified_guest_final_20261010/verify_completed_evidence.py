#!/usr/bin/env python3
"""Verify every saved original gate result and hash without changing test outcomes."""
from pathlib import Path
import datetime
import gzip
import hashlib
import json

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

def write_json(path, value):
    temporary = path.with_suffix(path.suffix + '.new')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)

plan = json.loads((OUT / 'plan.json').read_text())
summary = json.loads((OUT / 'summary.json').read_text())
results = json.loads((OUT / 'results.json').read_text())
inputs = json.loads((OUT / 'input_manifest.json').read_text())
tests = plan['tests']
errors = []
if len(tests) != 177 or len(set(tests)) != 177:
    errors.append('plan must contain177 distinct gate programs')
if not summary['complete'] or summary['completed'] != 177:
    errors.append('run is not complete')
if len(results) != 177 or [row['test'] for row in results] != tests:
    errors.append('results must match177 original gate programs in plan order')
gate_files = sorted((OUT / 'per_gate').glob('*.json'))
saved_gates = [json.loads(path.read_text()) for path in gate_files]
if len(saved_gates) != 177 or saved_gates != results:
    errors.append('per_gate originals and results differ')
verified_logs = []
for row in results:
    path = OUT / row['log']
    try:
        compressed = path.read_bytes()
        raw = gzip.decompress(compressed)
        ok = len(raw) == row['logBytes'] and digest(raw) == row['logSha256']
        if not ok:
            errors.append('log hash/length mismatch: ' + row['test'])
        verified_logs.append({'test': row['test'], 'log': row['log'], 'ok': ok,
                              'rawBytes': len(raw), 'rawSha256': digest(raw),
                              'gzipBytes': len(compressed), 'gzipSha256': digest(compressed)})
    except (OSError, ValueError, gzip.BadGzipFile) as error:
        errors.append('log unavailable: ' + row['test'] + ': ' + str(error))
input_drift = []
for before in inputs['files']:
    path = ROOT / before['path']
    if not path.is_file():
        input_drift.append({'path': before['path'], 'before': before, 'after': None})
        continue
    raw = path.read_bytes()
    after = {'path': before['path'], 'bytes': len(raw), 'sha256': digest(raw)}
    if after != before:
        input_drift.append({'path': before['path'], 'before': before, 'after': after})
if input_drift or summary['inputDrift']:
    errors.append('frozen source/test/server/data inputs changed')
expected_source = {
    'source/runtime_combat.js': '544b8ffcdafcc55d686f757026a25fc940bc08bbdc235115ab71a29894ffcdaa',
    'source/runtime_growth_v01522.js': '84a4b734e58ae05f4f61b495a0eefd622bdf532911b79f0f57c1f072708e891a',
    'source/runtime_constellations_v01411.js': '02bd074ba57da0d877f6ac6cd1c0f5b0f8b80420a9604963aa8d4e4d71d6dc7b',
    'source/runtime_tasks_v0167.js': 'cc21ab26ac16a7b6265e04a6cf38543170e9a0bdbff01489174006f99e232bb9',
    'source/app_adventure.js': '36f88b105761d82c499943e839939f19d3e0d563e31132883bbf9cad8c08cd34',
    'content/db.json': '254c9294c7787b421f38c84b3ad8fed9f00c207a8ef74855868c0cda48dc0962',
    'content/release-notes.json': '78158264466232b6efef488375282907ea4d3c641920acabb22d3b768bbdc161',
    'server/generated/engine.mjs': 'a9d95018599abb1bda91da83a5bfb49e748d40ce6f69d27673332fde244cf3e6',
}
source_checks = []
for path, expected in expected_source.items():
    actual = digest((ROOT / path).read_bytes())
    source_checks.append({'path': path, 'expectedSha256': expected, 'actualSha256': actual, 'ok': actual == expected})
    if actual != expected:
        errors.append('final source identity mismatch: ' + path)
known_gap_classes = {'tests/test_save_v01344.cjs': 'historical_input_unavailable',
                    'tests/test_release_isolation_v01513.py': 'editorial_raw_input_gap_requires_authored_db'}
failures = [row for row in results if not row['ok']]
input_gaps = [row for row in failures if known_gap_classes.get(row['test']) == row['failureClassification']]
product_failures = [row for row in failures if row not in input_gaps]
if product_failures:
    errors.append('unclassified or product gate failures require investigation')
journal_path = OUT / 'journal.jsonl'
journal_rows = [json.loads(line) for line in journal_path.read_text().splitlines() if line.strip()]
journal_by_test = {row['test']: row for row in journal_rows}
journal_missing = [row['test'] for row in results if row['test'] not in journal_by_test]
journal_conflicts = [row['test'] for row in results if row['test'] in journal_by_test and journal_by_test[row['test']] != row]
journal_extra = [row['test'] for row in journal_rows if row['test'] not in set(tests)]
if journal_conflicts or journal_extra or len(journal_rows) != len(journal_by_test):
    errors.append('journal has conflicting, extra or duplicate gate records')
reconstructed_path = OUT / 'journal_reconstructed_from_per_gate.jsonl'
ordered_completion = sorted(results, key=lambda row: (row['endedAt'], row['index']))
reconstructed_path.write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in ordered_completion))
verification = {
    'schemaVersion': 2, 'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'evidenceValid': not errors, 'allOriginalGatesPassed': not failures,
    'status': 'completed_with_input_gaps' if input_gaps and not product_failures else ('passed' if not failures else 'requires_investigation'),
    'gatePrograms': len(tests), 'originalCompleted': len(results),
    'passed': sum(row['ok'] for row in results), 'failed': len(failures),
    'knownInputGapCount': len(input_gaps), 'unclassifiedOrProductFailureCount': len(product_failures),
    'originalResultsChanged': False, 'inputGapsCountedAsPass': False,
    'verifiedLogCount': len(verified_logs), 'verifiedLogs': verified_logs,
    'inputDrift': input_drift, 'sourceIdentity': source_checks,
    'inputGaps': input_gaps, 'unclassifiedOrProductFailures': product_failures,
    'originalJournal': {'path': 'journal.jsonl', 'rows': len(journal_rows),
                        'missingOriginalGateRecords': journal_missing,
                        'conflicts': journal_conflicts, 'extras': journal_extra,
                        'preservedWithoutReplacement': True},
    'reconstructedJournal': {'path': reconstructed_path.name, 'rows': len(ordered_completion),
                             'basis': '177 independently saved per_gate originals; completion timestamp order',
                             'isOriginalStream': False},
    'errors': errors,
}
write_json(OUT / 'final_verification.json', verification)
print(json.dumps({key: value for key, value in verification.items()
                  if key not in ('verifiedLogs', 'inputGaps', 'unclassifiedOrProductFailures')}, ensure_ascii=False))
raise SystemExit(0 if verification['evidenceValid'] else 1)
