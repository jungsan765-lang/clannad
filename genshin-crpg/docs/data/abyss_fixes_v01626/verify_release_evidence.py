"""Verify final evidence and exactly which runtime modules changed from 0.16.25."""
from pathlib import Path
import hashlib, json

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
PRODUCT = {'source/runtime_abyss.js', 'source/runtime_formations.js',
           'source/runtime_growth_v01522.js', 'source/runtime_balance_admin_v01623.js'}
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
read = lambda p: json.loads(p.read_text())

baseline = read(HERE / 'input_baseline.json')
assert not baseline['remoteRuntimeMismatches']
changed = {p for p, row in baseline['sourceFiles'].items() if sha(ROOT / p) != row['sha256']}
assert changed == PRODUCT, changed
assert len(baseline['sourceFiles']) == 118
before = read(HERE / 'baseline/SHA256.json')
for p in PRODUCT:
    assert sha(HERE / 'baseline' / Path(p).name) == before[p]
    assert before[p] == baseline['sourceFiles'][p]['sha256']

historical = read(ROOT / 'docs/data/abyss_audit_v01625/AUDIT_MANIFEST.json')
archived_headers = 0
for row in historical['files']:
    p = ROOT / row['path']
    if sha(p) != row['sha256']:
        p = HERE / 'baseline/read_only_audit_headers' / row['path']
        archived_headers += 1
    assert sha(p) == row['sha256']
assert archived_headers == 4

db = read(ROOT / 'content/db.json')
qa = read(ROOT / 'docs/data/qa_v01619/db_runtime_semantic_parity_v01619.json')
assert sha(ROOT / 'content/db.json') == qa['localCurrentDbSha256']
assert set(db) == {r['table'] for r in qa['tables']}
for row in qa['tables']:
    raw = json.dumps(db[row['table']], ensure_ascii=False, separators=(',', ':'), sort_keys=True).encode()
    assert hashlib.sha256(raw).hexdigest() == row['semanticSha256']

contracts = read(HERE / 'contracts/contracts.json')
assert len(contracts['checks']) == 35 and all(r['pass'] for r in contracts['checks'])
for p in PRODUCT:
    assert contracts['sourceSHA256'][p] == sha(ROOT / p)
review = read(HERE / 'review/INDEPENDENT_REVIEW.json')
origins = read(HERE / 'review/STARTUP_ORIGINS.json')
assert review['checks'] == review['passed'] == 13 and review['errors'] == 0
assert origins['cases'] == origins['passed'] == 39 and origins['failed'] == 0
for family in ['review', 'native']:
    seal = read(HERE / family / 'MANIFEST.json')
    for row in seal['files']:
        assert sha(ROOT / row['path']) == row['sha256'], row['path']
native = read(HERE / 'native/comparison.json')
assert native['pairs'] == 21 and native['nativeRuns'] == 42
assert native['baselineEarlyPcKoAdvanced'] == 13 and native['finalEarlyPcKoAdvanced'] == 0
assert native['errors'] == native['inputLimits'] == native['entryBlocked'] == 0

engine_root = HERE / 'engines/final4source'
engine = read(engine_root / 'summary.json')
for p, row in read(HERE / 'engines/MANIFEST.json')['files'].items():
    assert sha(ROOT / p) == row['sha256'], p
assert engine['failed'] == 0 and engine['passed'] == engine['total']
assert engine['total'] == 381
assert {row['engine'] for row in engine['rows']} == {'source', 'browser', 'server'}
for row in engine['rows']:
    assert row['passed'] == row['checks'] and row['rawDbObjectUnchanged']
    assert sha(engine_root / row['output']) == row['outputSHA256']
    assert sha(ROOT / 'tests' / row['test']) == row['toolSHA256']

assert read(ROOT / 'package.json')['version'] == '0.16.26'
assert read(ROOT / 'package-lock.json')['packages']['']['version'] == '0.16.26'
assert read(ROOT / 'content/release-notes.json')['version'] == '0.16.26'
result = {'version': '0.16.26', 'parentCommit': baseline['parentCommit'],
          'runtimeFiles': 118, 'changedProduct': sorted(PRODUCT),
          'unchangedRuntimeFiles': 114, 'sameQaTables': len(db),
          'historicalAuditFilesPreserved': len(historical['files']),
          'historicalHeadersArchived': archived_headers,
          'qaRawDbSHA256': sha(ROOT / 'content/db.json'),
          'controlledContracts': 35, 'independentContractFamilies': 13,
          'independentOpeningPairs': 39,
          'nativeBeforeAfter': {'runs': 42, 'rooms': 87, 'earlyKoAdvancedBefore': 13, 'earlyKoAdvancedAfter': 0},
          'threeEngineContracts': {'checks': engine['total'], 'passed': engine['passed'], 'failed': 0},
          'engineFingerprint': engine['engineFingerprint'],
          'currentProductSHA256': {p: sha(ROOT / p) for p in sorted(PRODUCT)},
          'scope': 'Fresh final source and evidence verification. Native verifier and independent review have separate raw records; historical preliminary stages are excluded from final totals.'}
(HERE / 'VERIFIED_RELEASE.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(result, ensure_ascii=False))
