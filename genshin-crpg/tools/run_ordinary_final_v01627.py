#!/usr/bin/env python3
"""Replay final ordinary economy sequentially; never write product inputs."""
import argparse, gzip, hashlib, json, subprocess, time
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--out-dir', required=True)
p.add_argument('--group', choices=['food', 'material'], required=True)
a = p.parse_args()
root = Path(__file__).resolve().parents[1]
folder = Path(a.out_dir).resolve()
folder.mkdir(parents=True, exist_ok=True)
fp = subprocess.check_output(['node', '-e', "console.log(require('./tools/audit_protagonist_v01618.cjs').load('.').fingerprint)"], cwd=root, text=True).strip()
expected = '7147e88113388e51a3042d1d51c9bde3e084213502f976f52202012542f0dbe2'
assert fp == expected, ('Frozen final source changed', fp)
catalog = root / 'docs/data/balance_v01627/ordinary/raw/product2_food_supply.json.gz'
(folder / 'food_catalog.json').write_bytes(gzip.decompress(catalog.read_bytes()))
commands = []
if a.group == 'food':
    for level, levels, routes in [(60, '55,60', 'ROUTE_ISEKAI,ROUTE_TRAVELER'), (50, '55', 'ROUTE_TRAVELER'), (55, '60', 'ROUTE_TRAVELER')]:
        cmd = ['node', 'tools/audit_food_campaign_v01627.cjs', '--root', '.', '--routes', routes, '--levels', levels, '--actor-level', str(level), '--talent', '6', '--enhance', '6', '--threshold', '0.7', '--food-policy', 'gathering']
        if level < 60:
            cmd += ['--ascend-entry']
        commands.append((f'food_actor{level}', cmd))
    for level, levels, retail in [(60, '55,60', True), (60, '55,60', False), (50, '55', True), (55, '60', True)]:
        mode = 'retail' if retail else 'gather'
        cmd = ['node', 'tools/audit_food_bundle_v01627.cjs', '--runtime-root', '.', '--input', str(folder / f'food_actor{level}.json'), '--levels', levels, '--supply-input', str(folder / 'food_catalog.json'), '--consolidate-gather']
        if retail:
            cmd += ['--retail-food']
        commands.append((f'food_bundle_actor{level}_{mode}', cmd))
    for level, levels in [(60, '55,60'), (50, '55'), (55, '60')]:
        cmd = ['node', 'tools/audit_food_campaign_v01627.cjs', '--root', '.', '--routes', 'ROUTE_TRAVELER', '--teams', 'heal5', '--levels', levels, '--actor-level', str(level), '--talent', '6', '--enhance', '6', '--threshold', '0.7', '--food-policy', 'gathering', '--finish-at-inn']
        if level < 60:
            cmd += ['--ascend-entry']
        commands.append((f'food_actor{level}_endpoint', cmd))
else:
    commands = [
        ('material_endpoint_campaigns', ['node', 'tools/audit_material_campaign_v01627.cjs', '--root', '.', '--finish-at-inn']),
        ('material_mora_endpoint', ['node', 'tools/audit_material_mora_v01627.cjs', '--root', '.', '--finish-at-inn']),
        ('leyline_native', ['node', 'tools/audit_leyline_economy_v01621.cjs', '--source-root', '.']),
        ('exp_inn_endpoint', ['node', 'tools/audit_exp_inn_endpoint_v01627.cjs', '--root', '.']),
    ]
results = []
for name, cmd in commands:
    output = folder / (name + '.json')
    cmd += ['--out', str(output)]
    started = time.monotonic()
    with (folder / (name + '.log')).open('w') as log:
        run = subprocess.run(cmd, cwd=root, stdout=log, stderr=subprocess.STDOUT)
    raw = output.read_bytes() if output.exists() else b''
    data = json.loads(raw) if raw else {}
    record = {'name': name, 'command': cmd, 'exitCode': run.returncode, 'wallSeconds': time.monotonic() - started, 'sourceFingerprint': data.get('fingerprint', data.get('sourceFingerprint')), 'rawSha256': hashlib.sha256(raw).hexdigest(), 'counts': data.get('counts')}
    results.append(record)
    (folder / (a.group + '_replay.json')).write_text(json.dumps({'schema': 1, 'expectedFingerprint': expected, 'results': results}, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(record, ensure_ascii=False), flush=True)
    assert run.returncode == 0, record
    assert record['sourceFingerprint'] == expected, record
    assert not data.get('errors'), data.get('errors')
