#!/usr/bin/env python3
"""Restore a verified source-only native-audit input; no synthetic database."""
import argparse, hashlib, json, re, shutil
from pathlib import Path

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

parser = argparse.ArgumentParser()
parser.add_argument('--snapshot', required=True, choices=['baseline_v01626', 'product_snapshot_1', 'product_snapshot_2', 'before_talent90'])
parser.add_argument('--dest', required=True, type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
folder = root / 'docs/data/balance_v01627/ordinary/snapshots' / args.snapshot
manifest = json.loads((folder / 'manifest.json').read_text())
assert digest(root / 'content/db.json') == manifest['dbSha256'], 'Authored DB fingerprint mismatch'
args.dest.mkdir(parents=True, exist_ok=True)
(args.dest / 'source').mkdir(exist_ok=True)
(args.dest / 'content').mkdir(exist_ok=True)
for row in manifest['files']:
    paths = [folder / 'source' / row['file'], root / 'docs/data/balance_v01627/before/source' / row['file'], root / 'source' / row['file']]
    source = next((p for p in paths if p.is_file() and digest(p) == row['sha256']), None)
    assert source is not None, 'No exact source for ' + row['file']
    shutil.copyfile(source, args.dest / 'source' / row['file'])
shutil.copyfile(root / 'content/db.json', args.dest / 'content/db.json')
(args.dest / 'package.json').write_text(json.dumps({'version': manifest['packageVersion']}))
(args.dest / 'input_manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'snapshot': args.snapshot, 'root': str(args.dest.resolve()), 'sourceFiles': len(manifest['files']), 'dbSha256': manifest['dbSha256']}))
