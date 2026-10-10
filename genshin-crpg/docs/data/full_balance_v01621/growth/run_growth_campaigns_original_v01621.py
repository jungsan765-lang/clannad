#!/usr/bin/env python3
"""Pin product bytes, then reuse native continuous growth/recovery helpers."""
from pathlib import Path
import argparse, hashlib, json, shutil, subprocess

root = Path(__file__).resolve().parents[4]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-root', type=Path, required=True)
parser.add_argument('--runner-root', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--to', default='60')
parser.add_argument('--routes', default='ROUTE_TRAVELER,ROUTE_ISEKAI')
parser.add_argument('--seeds', default='717')
args = parser.parse_args()
source = args.source_root.resolve()
runner = args.runner_root.resolve()
if runner.exists():
    raise SystemExit('runner-root must be new; never overwrite a product checkout')
runner.mkdir(parents=True)
for directory in ['source', 'content']:
    shutil.copytree(source / directory, runner / directory)
for name in ['package.json', 'package-lock.json']:
    shutil.copyfile(source / name, runner / name)
helpers = ['tools/audit_growth_bands_v01615.cjs', 'tools/audit_growth_pacing_v0166.cjs',
           'tools/audit_balance_v01522.cjs', 'tools/audit_balance_v0161.cjs', 'tests/helpers_v011.cjs']
for name in helpers:
    target = runner / name
    target.parent.mkdir(exist_ok=True)
    shutil.copyfile(root / name, target)
helper = runner / 'tests/helpers_v011.cjs'
text = helper.read_text()
assert 'let clock=Date.now();' in text
helper.write_text(text.replace('let clock=Date.now();', 'let clock=1791529200000;'))
# The old helper ascended before checking recovery, relying on its former KO
# level-up revival. Retain native operations and recover first only if the
# protagonist is KO, because that existing public action lock must be respected.
helper = runner / 'tools/audit_growth_bands_v01615.cjs'
text = helper.read_text()
needle = 'const g=r.growth(owner);if(g.max&&!g.final){'
assert text.count(needle) == 1
replacement = '''const g=r.growth(owner);if(g.max&&!g.final&&r.s.global.PLAYER_HP_CURRENT<=0){const recovery=recover(r);row.recoveries.push(recovery);row.seconds+=recovery.seconds;row.lodgingMora+=recovery.lodgingCost||0;if(recovery.failed){row.stopReason=recovery.reason;row.losses++;break;}}if(g.max&&!g.final){'''
helper.write_text(text.replace(needle, replacement))
files = []
for directory in ['source', 'content', 'tools', 'tests']:
    for file in sorted((runner / directory).rglob('*')):
        if file.is_file():
            raw = file.read_bytes()
            files.append({'file':str(file.relative_to(runner)), 'bytes':len(raw), 'sha256':hashlib.sha256(raw).hexdigest()})
provenance = {'sourceRoot':str(source), 'runnerRoot':str(runner), 'fixedClockMs':1791529200000,
              'helperChanges':['Fixed clock only', 'Native recovery before ascension only when protagonist HP0'],
              'fixtureLimit':'Ownership/story gates/legal gear/talents and quoted ascension ingredients/funding are synthetic; their acquisition time is excluded. Full HP is granted only at campaign start. Native wounds and PRNG persist.', 'files':files}
args.out.parent.mkdir(parents=True, exist_ok=True)
args.out.with_suffix('.provenance.json').write_text(json.dumps(provenance, indent=2)+'\n')
command=['node', str(helper), '--out', str(args.out.resolve()), '--routes', args.routes, '--seeds', args.seeds,
         '--from', '1', '--to', args.to, '--probe-runs', '3']
raise SystemExit(subprocess.call(command, cwd=runner))
