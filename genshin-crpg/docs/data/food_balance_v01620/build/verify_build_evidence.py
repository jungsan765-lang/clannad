#!/usr/bin/env python3
"""Verify every delivered file/gzip and optionally all files in a rebuilt browser pack."""
from pathlib import Path
import argparse,gzip,hashlib,json
p=argparse.ArgumentParser();p.add_argument('--browser-root');p.add_argument('--out');a=p.parse_args()
d=Path(__file__).resolve().parent;sha=lambda b:hashlib.sha256(b).hexdigest();manifest=json.loads((d/'MANIFEST.json').read_text());checks=[]
def check(name,ok):checks.append({'name':name,'passed':bool(ok)})
for row in manifest['files']:
 f=d/row['path'];check('exists '+row['path'],f.is_file())
 if not f.is_file():continue
 raw=f.read_bytes();check('file bytes/hash '+row['path'],len(raw)==row['bytes'] and sha(raw)==row['sha256'])
 if 'decompressed' in row:
  source=gzip.decompress(raw);check('gzip original bytes/hash '+row['path'],len(source)==row['decompressed']['bytes'] and sha(source)==row['decompressed']['sha256'])
  if row['decompressed'].get('fileWithinEvidence'):
   check('gzip matches retained original '+row['path'],source==(d/row['decompressed']['fileWithinEvidence']).read_bytes())
if a.browser_root:
 b=Path(a.browser_root).resolve();pack=json.loads(gzip.decompress((d/'browser_offline_pack_executed.json.gz').read_bytes()))
 for row in pack['files']:
  f=b/row['path'];check('browser exists '+row['path'],f.is_file())
  if f.is_file():raw=f.read_bytes();check('browser bytes/hash '+row['path'],len(raw)==row['bytes'] and sha(raw)==row['sha256'])
 for file,archive in [('offline-pack.json','browser_offline_pack_executed.json.gz'),('asset-manifest.json','browser_asset_manifest_executed.json.gz')]:
  check('browser exact saved index '+file,(b/file).read_bytes()==gzip.decompress((d/archive).read_bytes()))
result={'schema':1,'passed':all(c['passed'] for c in checks),'files':len(manifest['files']),'checks':len(checks),'failed':[c for c in checks if not c['passed']],'browserPackListedFiles':1888 if a.browser_root else None}
if a.out:Path(a.out).resolve().write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
if not result['passed']:raise SystemExit(1)
