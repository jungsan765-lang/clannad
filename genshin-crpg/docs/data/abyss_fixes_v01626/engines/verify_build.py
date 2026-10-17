#!/usr/bin/env python3
"""Read actual isolated v0.16.26 build bytes; never rebuild or mutate inputs."""
import argparse
import gzip
import hashlib
import json
import re
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[4])
parser.add_argument('--snapshot-root', type=Path, required=True)
parser.add_argument('--out', type=Path)
args = parser.parse_args()
root, snap = args.root.resolve(), args.snapshot_root.resolve()
out = args.out or root / 'docs/data/abyss_fixes_v01626/engines/final4source'
out.mkdir(parents=True, exist_ok=True)
sha = lambda raw: hashlib.sha256(raw).hexdigest()
inputs = json.loads((root / 'docs/data/abyss_fixes_v01626/engines/final_build_input_snapshot.json').read_text())
drift = [f for f, h in inputs['inputSHA256'].items() if sha((root / f).read_bytes()) != h]
assert not drift, drift
pack = json.loads((snap / 'dist/offline-pack.json').read_text())
pack_drift = [f['path'] for f in pack['files']
              if sha((snap / 'dist' / f['path']).read_bytes()) != f['sha256']
              or (snap / 'dist' / f['path']).stat().st_size != f['bytes']]
assert not pack_drift, pack_drift
sys.path.insert(0, str(snap / 'tools'))
from runtime_data import clean_runtime_db
from engine_identity import runtime_files, engine_fingerprint
raw = (snap / 'content/db.json').read_bytes()
clean, removed = clean_runtime_db(json.loads(raw))
files = runtime_files(snap)
module_rows = [{'file': f, 'sourceSHA256': sha((snap / 'source' / f).read_bytes()),
                'browserSHA256': sha((snap / 'dist' / f).read_bytes())} for f in files]
assert len(files) == 120
assert all(r['sourceSHA256'] == r['browserSHA256'] for r in module_rows)
data = (snap / 'dist/data.js').read_text()
browser = json.loads(data[len('window.CRPG_DATA='):].strip().removesuffix(';'))
server_bytes = (snap / 'server/generated/engine.mjs').read_bytes()
text = server_bytes.decode()
server = json.loads(re.search(r'\nconst DB=([^\n]+);\nconst R=', text).group(1))
assert clean == browser == server
# Same declared static CommonJS rewrite performed by tools/build_server.py.
body = '\n'.join((snap / 'source' / f).read_text() for f in files)
body = re.sub(r'''require\(['"]\./runtime[^'"]*\.js['"]\)''', 'root.CRPGRuntime', body)
assert text.startswith('const module=undefined;\n' + body + '\nconst DB=')
fp = engine_fingerprint(snap, clean)
release = json.loads((snap / 'dist/release.json').read_text())
export_fp = json.loads(re.search(r'export const ENGINE_FINGERPRINT=("[^"\n]+");', text).group(1))
assert release['engineVersion'] == export_fp == fp
build_export = json.loads(re.search(r'export const SERVER_BUILD=("[^"\n]+");', text).group(1))
assert release['appVersion'] == '0.16.26'
canonical = lambda d: sha(json.dumps(d, ensure_ascii=False, separators=(',', ':'), sort_keys=True).encode())
result = {
    'status': 'PASS_ACTUAL_FINAL_FOUR_SOURCE_BUILD',
    'scope': 'Actual isolated static pack and generated server ESM bytes. All 120 runtime modules have exact source/browser and declared static-rewrite source/server code parity. The three-engine contract auditor executes these actual engines separately. No graphical UI or real server deployment claim.',
    'originalInputCount': len(inputs['inputSHA256']), 'originalInputDrift': drift,
    'packFilesChecked': len(pack['files']), 'packFileDrift': pack_drift,
    'rawAuthoredQADBSHA256': sha(raw), 'runtimeDbSanitizedTables': removed,
    'runtimeDbTableCount': len(clean), 'runtimeDbCanonicalSHA256': canonical(clean),
    'browserRuntimeDBEqualServer': True, 'browserRuntimeDBEqualSanitizedAuthoredQA': True,
    'serverRuntimeBodyMatchesExactSourceWithDeclaredCJSRewrite': True,
    'engineVersion': release['appVersion'], 'engineFingerprint': fp,
    'serverBuild': build_export, 'serverEngineSHA256': sha(server_bytes),
    'serverEngineBytes': len(server_bytes), 'serverEngineGzipBytes': len(gzip.compress(server_bytes)),
    'browserRelease': release, 'runtimeModuleCount': len(files),
    'runtimeModules': module_rows, 'productFrozenSHA256': inputs['productFrozenSHA256'],
    'verificationToolSHA256': sha(Path(__file__).read_bytes()),
}
(out / 'build_identity.json').write_text(json.dumps(result, indent=2) + '\n')
(out / 'browser_release.json').write_text(json.dumps(release, indent=2) + '\n')
(out / 'static_build_report.json').write_bytes((snap / 'reports/build.json').read_bytes())
(out / 'browser_offline_pack.json.gz').write_bytes(gzip.compress((snap / 'dist/offline-pack.json').read_bytes(), mtime=0))
print(json.dumps({k: result[k] for k in ['status', 'originalInputCount', 'packFilesChecked', 'engineFingerprint', 'serverEngineSHA256', 'runtimeDbTableCount', 'browserRuntimeDBEqualServer']}))
