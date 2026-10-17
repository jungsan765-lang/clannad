"""Join only the persisted 30 cases and the 225-case recovery run.

This is evidence processing, not a battle simulator. It refuses duplicate,
missing, reordered or differently sourced native cases. Previous input files
remain untouched, including the interrupted run and prior candidate evidence.
"""
import argparse
import collections
import gzip
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--remaining-dir', type=Path, required=True)
args = parser.parse_args()
base = Path(__file__).resolve().parent


def read(p):
    raw = p.read_bytes()
    return json.loads(gzip.decompress(raw) if p.suffix == '.gz' else raw)


def key(row):
    fields = ('level', 'stage', 'element', 'kind', 'team', 'constellations',
              'seed', 'limit', 'restBelow', 'enhance', 'talent', 'recovery')
    return json.dumps({k: row.get(k) for k in fields}, sort_keys=True)


def measure(row):
    return {k: row[k] for k in ('wins', 'losses', 'seconds', 'materials',
                               'materialsPerMinute', 'lodgingMora')}


left = read(base / 'ascension_final_readable_partial/native.json.gz')
right = read(args.remaining_dir / 'native.json.gz')
cases = read(base / 'after_ascension_cases.json')
assert len(left['rows']) == 30 and len(right['rows']) == 225
assert left['provenance']['loadedSource'] == right['provenance']['loadedSource']
assert left['provenance']['dbSha256'] == right['provenance']['dbSha256']
assert left['catalog'] == right['catalog']
assert left['timing'] == right['timing']
joined = {**right, 'rows': left['rows'] + right['rows']}
assert len(joined['rows']) == len(cases) == 255
assert [key(r) for r in joined['rows']] == [key(r) for r in cases]
assert len({key(r) for r in joined['rows']}) == 255
joined['counts'] = {
    'conditions': len(joined['rows']),
    'nativeBattles': sum(len(r['battles']) for r in joined['rows']),
    'wins': sum(r['wins'] for r in joined['rows']),
    'losses': sum(r['losses'] for r in joined['rows']),
    'recoveries': sum(len(r['recoveries']) for r in joined['rows']),
}
joined['mergeProvenance'] = {
    'left': 'ascension_final_readable_partial/native.json.gz',
    'leftCases': 30,
    'rightCases': 225,
    'rightSHA256': hashlib.sha256((args.remaining_dir / 'native.json.gz').read_bytes()).hexdigest(),
    'policy': 'Each declared independent native fixture runs exactly once in this final combined set. First 30 were persisted before an environment SIGKILL; only the missing 225 were rerun. Source hashes, DB, timing, catalog, specification order and uniqueness are asserted. Counts include domain battles only; optional travel battles remain recorded in each recovery and are not relabeled as domain battles.',
}
out = base / 'ascension_final_readable'
out.mkdir(exist_ok=True)
(out / 'native.json.gz').write_bytes(gzip.compress((json.dumps(joined, ensure_ascii=False) + '\n').encode(), compresslevel=9, mtime=0))
summary = {**joined, 'rows': []}
for row in joined['rows']:
    battles = row['battles']
    short = {k: v for k, v in row.items() if k not in ('battles', 'fixture', 'recoveries')}
    short.update(battleCount=len(battles),
                 battleSeconds=sum(b['timing']['seconds'] for b in battles),
                 xpPerParticipant=sum(b['result'].get('xp', 0) for b in battles),
                 recoveries=[{k: v for k, v in r.items() if k != 'battles'} for r in row['recoveries']],
                 travelBattles=sum(len(r['battles']) for r in row['recoveries']))
    summary['rows'].append(short)
(out / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
(out / 'remaining_run.log').write_bytes((args.remaining_dir.parent / 'ascension_remaining.log').read_bytes())

before = {}
for folder in ('before_pilot', 'before_screening', 'before_all_stages', 'before_pyro_counter', 'before_pyro_policy50'):
    native = read(base / folder / 'native.json.gz')
    for row in native['rows']:
        assert key(row) not in before
        before[key(row)] = row
assert len(before) == 255
previous = {key(r): r for r in read(base / 'after_ascension_final200/native.json.gz')['rows']}
comparison = {'schema': 1, 'conditions': 255, 'finalCounts': joined['counts'],
              'finalGrowthSHA256': next(x['sha256'] for x in joined['provenance']['loadedSource'] if x['file'] == 'runtime_growth_v01522.js'),
              'scope': 'Native final payout verification and same-condition battle/HP comparison. This is a three-win screening set with failures retained; it is not a full material cultivation campaign. Before measurements come from the five preserved published-baseline native input groups. Prior-candidate measurements retain their actual source hashes.',
              'rows': []}
for case, row in zip(cases, joined['rows']):
    old = before[key(row)]
    prior = previous[key(row)]
    comparison['rows'].append({
        'condition': case, 'before': measure(old), 'priorCandidate': measure(prior), 'after': measure(row),
        'combatTimingSame': old['seconds'] == row['seconds'],
        'finalHpSame': old['final'] == row['final'],
        'priorCandidateCombatTimingSame': prior['seconds'] == row['seconds'],
        'priorCandidateFinalHpSame': prior['final'] == row['final'],
        'victorySequenceSame': [b['result'].get('victory') for b in old['battles']] == [b['result'].get('victory') for b in row['battles']],
        'nativePayoutsMatchPromise': all(b['materials'] == b['promised']['items'].get(row['item'], 0) for b in row['battles'] if b['result'].get('victory')),
    })
comparison['counts'] = {k: sum(bool(r[k]) for r in comparison['rows']) for k in (
    'combatTimingSame', 'finalHpSame', 'priorCandidateCombatTimingSame',
    'priorCandidateFinalHpSame', 'victorySequenceSame', 'nativePayoutsMatchPromise')}
(base / 'ascension_final_comparison.json').write_text(json.dumps(comparison, ensure_ascii=False, indent=2) + '\n')
assert all(v == 255 for v in comparison['counts'].values()), comparison['counts']
print(json.dumps({'native': joined['counts'], 'comparison': comparison['counts']}, ensure_ascii=False))
