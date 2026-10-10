"""Verify published-runtime inputs and derive counts from native audit records."""
import gzip
import hashlib
import json
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BUNDLES = ['floor12_preparation', 'counter_preparation', 'roles_preparation',
           'fixed_preparation', 'release_floor10_11', 'last_pyro']
COMMIT = '46190377b713e6218e66b26bc4292f18fb5a348d'
FINGERPRINT = 'aeb110f1cb71c11b2d515e71c1a8f24189463d09eb26fd9959afe10b576aadd1'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def no_ko(row):
    return not any(room.get('ko') for room in row['rooms'])


def normalized_gear(row):
    keys = ['owner', 'equip', 'enhance', 'enhancementCap', 'artifact']
    return sorted(json.dumps({key: gear.get(key) for key in keys}, sort_keys=True)
                  for gear in row['equipment'])


verified = []
all_rows = []
for name in BUNDLES:
    folder = HERE / 'native' / name
    manifest = json.loads((folder / 'input_manifest.json').read_text())
    raw = json.loads(gzip.decompress((folder / 'native.json.gz').read_bytes()))
    summary = json.loads((folder / 'summary.json').read_text())
    assert raw['publishedCommit'] == summary['publishedCommit'] == COMMIT
    assert raw['fingerprint'] == manifest['fingerprint'] == FINGERPRINT
    assert sha(ROOT / 'content/db.json') == manifest['rawDbSHA256'] == raw['rawDbSHA256']
    assert len(manifest['sourceHashes']) == 120
    for rel, expected in manifest['sourceHashes'].items():
        assert sha(ROOT / rel) == expected == raw['sourceHashes'][rel], (name, rel)
    assert sha(folder / 'runner.cjs') == manifest['runner'], name
    cases = [p.relative_to(HERE).as_posix() for p in (HERE / 'native').glob('*.json')
             if sha(p) == manifest['cases']]
    assert cases, ('Missing case input', name)
    assert len(raw['rows']) == summary['conditions'] == len(summary['rows'])
    assert not any(row['errors'] or row['state'] in ['ERROR', 'INPUT_LIMIT'] for row in raw['rows'])
    for row, published in zip(raw['rows'], summary['rows']):
        assert row['spec']['id'] == published['id'] and row['seed'] == published['seed']
        assert row['state'] == published['state']
        assert row['rounds'] == sum(room['rounds'] for room in row['rooms'])
        assert all(room['ko'] == [a['source'] for a in room['native']['actors']
                                 if a['side'] == 'ALLY' and a['hp'] <= 0]
                   for room in row['rooms'])
        all_rows.append((name, row))
    verified.append({'bundle': name, 'conditions': len(raw['rows']),
                     'states': dict(Counter(row['state'] for row in raw['rows'])),
                     'noNativeKOClears': sum(row['state'] == 'CLEARED' and no_ko(row) for row in raw['rows']),
                     'cases': cases, 'runnerSHA256': manifest['runner'],
                     'nativeSHA256': sha(folder / 'native.json.gz')})

# The investment comparison must use identical actual equipment and artifact stats.
paired = []
investment_rows = [row for bundle, row in all_rows if bundle == 'floor12_preparation']
for seed in [717, 4242, 9031]:
    low = next(row for row in investment_rows if row['seed'] == seed and row['spec']['id'] == 'f12_c0_guard_feast_healing')
    high = next(row for row in investment_rows if row['seed'] == seed and row['spec']['id'] == 'f12_c6_guard_feast')
    assert normalized_gear(low) == normalized_gear(high)
    assert [a['stats'] for a in low['artifactRolls']] == [a['stats'] for a in high['artifactRolls']]
    paired.append({'seed': seed, 'equipmentIdentical': True, 'artifactStatsIdentical': True,
                   'C0': low['state'], 'allThreeCompanionsC6': high['state']})

fixed = [row for bundle, row in all_rows if bundle == 'fixed_preparation']
assert len({json.dumps(normalized_gear(row), sort_keys=True) for row in fixed}) == 1
grouped = []
for case_id in dict.fromkeys(row['spec']['id'] for row in fixed):
    rows = [row for row in fixed if row['spec']['id'] == case_id]
    grouped.append({'id': case_id, 'conditions': len(rows),
                    'clears': sum(row['state'] == 'CLEARED' for row in rows),
                    'noNativeKOClears': sum(row['state'] == 'CLEARED' and no_ko(row) for row in rows),
                    'rounds': [row['rounds'] for row in rows]})

middle_revived_clears = 0
for _, row in all_rows:
    if row['state'] != 'CLEARED':
        continue
    relied = False
    for room in row['rooms']:
        if room['chamber'] >= 3 or room['state'] != 'NEXT':
            continue
        me = next(a for a in room['native']['actors'] if a['source'] == 'PLAYER_CUSTOM')
        saved = next(a for a in room['after'] if a['source'] == 'PLAYER_CUSTOM')
        relied |= me['hp'] <= 0 < saved['hp']
    middle_revived_clears += relied

result = {'publishedCommit': COMMIT, 'fingerprint': FINGERPRINT,
          'officialConditions': len(all_rows), 'runtimeInputsPerBundle': 120,
          'chambersFought': sum(len(row['rooms']) for _, row in all_rows),
          'productInputDrift': 0, 'executionErrors': 0, 'inputLimit': 0,
          'states': dict(Counter(row['state'] for _, row in all_rows)),
          'noNativeKOClears': sum(row['state'] == 'CLEARED' and no_ko(row) for _, row in all_rows),
          'clearsWithProtagonistRevivalBetweenRooms': middle_revived_clears,
          'bundles': verified, 'sameEquipmentInvestmentPairs': paired,
          'fixedEquipmentPreparation': grouped,
          'scope': 'Conditional public-action diagnostic combat, not natural account acquisition, server account replay, or population win rate. Intermediate probes and the superseded floors10_11 run are excluded.'}
(HERE / 'VERIFIED_SUMMARY.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: result[k] for k in ['officialConditions', 'chambersFought', 'states', 'noNativeKOClears',
                                       'clearsWithProtagonistRevivalBetweenRooms',
                                       'productInputDrift', 'executionErrors', 'inputLimit']}))
