"""Seal growth evidence without counting interrupted or historical runs as final."""
import gzip
import hashlib
import json
from pathlib import Path

base = Path(__file__).resolve().parent
root = base.parents[3]
final_sha = hashlib.sha256((root / 'source/runtime_growth_v01522.js').read_bytes()).hexdigest()
assert final_sha == '84a4b734e58ae05f4f61b495a0eefd622bdf532911b79f0f57c1f072708e891a'
comparison = json.loads((base / 'ascension_final_comparison.json').read_text())
tests = json.loads((base / 'final_growth_test_results.json').read_text())
assert len(tests['rows']) == 7 and all(x['exitCode'] == 0 for x in tests['rows'])
assert all(x['growthSourceSHA256'] == final_sha for x in tests['rows'])
assert sum(x['passLines'] for x in tests['rows']) == 46
assert comparison['finalCounts'] == {'conditions': 255, 'nativeBattles': 749, 'wins': 739, 'losses': 10, 'recoveries': 97}
assert all(n == 255 for n in comparison['counts'].values())
native_runs = []
for p in sorted(base.glob('*/native.json.gz')):
    data = json.loads(gzip.decompress(p.read_bytes()))
    source = next(x['sha256'] for x in data['provenance']['loadedSource'] if x['file'] == 'runtime_growth_v01522.js')
    native_runs.append({'path': str(p.relative_to(base)), 'growthSourceSHA256': source,
                        'conditions': len(data['rows']), 'recordedCounts': data.get('counts'),
                        'complete': 'counts' in data,
                        'role': 'persisted partial already included in final, do not add counts' if 'partial' in str(p) else 'actual snapshot-specific native data; not every snapshot is final'})
files = []
for p in sorted(base.rglob('*')):
    if not p.is_file() or p.name == 'manifest.json':
        continue
    rel = str(p.relative_to(base))
    role = ('interrupted / stale QA expectation failure; preserved, not counted as PASS'
            if any(x in rel for x in ('oom_interrupted', 'stale_', '_attempt.json', 'pre_route_fix', 'wrong_'))
            else 'published-baseline / old-version observation'
            if rel.startswith('before_') or 'historical_' in rel or 'baseline_fail' in rel
            else 'prior candidate native data; preserve actual source hash'
            if rel.startswith(('after_ascension_final200/', 'full_final_gem_cost_', 'after_hp_policy_'))
            else 'snapshot-specific native observation / QA / arithmetic; read provenance and scope')
    files.append({'path': rel, 'bytes': p.stat().st_size,
                  'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'role': role})
manifest = {
    'schema': 2, 'release': '0.16.21', 'baselinePublishedCommit': 'df1d2c48b630bf8a152481bcc4bcc3e5b8b37785',
    'finalGrowthSourceSHA256': final_sha,
    'canonicalQaRawDbSHA256': '254c9294c7787b421f38c84b3ad8fed9f00c207a8ef74855868c0cda48dc0962',
    'policy': 'Evidence hashes only. Does not replace the published authored DB or imply live server deployment. Historical/partial/interrupted/candidate runs retain their identities. No inventory scaling, deletion, debt or receipt rewriting.',
    'finalAscensionNative': comparison['finalCounts'], 'finalAscensionComparison': comparison['counts'],
    'finalFocusedGrowthRegression': {'checks': 46, 'programs': 5, 'rows': tests['rows'][:5]},
    'additionalFinalQa': tests['rows'][5:],
    'seniorAccountNewCharacterConditionalLedger': json.loads((base / 'senior_account_new_character_projection.json').read_text())['summary'],
    'combatSnapshotNote': 'The first four focused programs honestly record a temporarily inspected runtime_combat.js snapshot 009c7c7a347f7eca9a301d41dfa75799d5cc67d70e5ff82da135274c33cec32e. Its sole edit was an unreachable legacy guestSnapshots HP branch and was reverted before release. Domain/owned-party fixtures do not enter that branch; final 177-program release regression is a separate gate. Growth itself is final 84a4 throughout. Final255 and HP10/book/early witness record the unchanged published combat file 544b8ffcdafcc55d686f757026a25fc940bc08bbdc235115ab71a29894ffcdaa. Do not rewrite the observed source hashes as if every execution had identical full product bytes.',
    'nativeRuns': native_runs,
    'measurementLimits': [
        'Growth runner old battle.log/finalActors can be stale due to public action cloning. They are not used as detailed hit/immune/final-actor evidence. Native result/current-save HP/current inventory/presentation delta measurements remain valid; separate early witness captures actual settlement logs.',
        'Three-fight conditions are not a full cultivation campaign or guaranteed victory for every team.',
        'Early15→25 stages retain disclosed efficiency reversals. Late35→60 success pairs and successful highest-stage comparisons are separately scoped.',
        'Final Lv60 Pyro3-seed campaign ran57 domain fights,56 wins and1 loss. Final low30 requirement4688 wins is only an arithmetic extrapolation from the actual625-win sample.',
        'Book projection is conditional supply plus native consumption/cost, not native blossom wins or real playtime.',
        'EXP native route fixtures exclude story/gear/material acquisition and real network/individual input delays.',
        'Inventory counts are preserved but new unexecuted cost changes can alter held material purchasing power.'
    ], 'fileCount': len(files), 'fileBytes': sum(x['bytes'] for x in files), 'files': files,
}
(base / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'files': len(files), 'bytes': manifest['fileBytes'], 'growthChecks': 46,
                  'nativeAscension': comparison['finalCounts']}, ensure_ascii=False))
