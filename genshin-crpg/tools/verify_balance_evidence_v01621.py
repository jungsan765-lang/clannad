#!/usr/bin/env python3
"""Verify portable evidence, exact product inputs and an optional rebuilt pack.

The authored and canonical QA DB files differ before sanitation. Accept only
the two recorded inputs, and require the same native runtime DB from either.
"""
from pathlib import Path
import argparse
import gzip
import hashlib
import importlib.util
import json


DB_CONTRACT = {
    'path': 'content/db.json',
    'acceptedRaw': [
        {
            'mode': 'canonical_qa',
            'bytes': 23049439,
            'sha256': '254c9294c7787b421f38c84b3ad8fed9f00c207a8ef74855868c0cda48dc0962',
        },
        {
            'mode': 'published_authored',
            'bytes': 23098055,
            'gitBlob': 'cc3996929c885d41289038ff501640039a4cc71e',
        },
    ],
    'cleanRuntime': {
        'bytes': 23049438,
        'sha256': 'c3d5eef26ac21e19136131ba3ab24ab542c1dbe63d428f6e47ab7743d1e75aa1',
    },
}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha(raw):
    return hashlib.sha1(b'blob ' + str(len(raw)).encode('ascii') + b'\0' + raw).hexdigest()


def verify_database(root, contract, check):
    """Return actual input facts; a known blob alone never implies clean parity."""
    check('DB contract is the recorded v0.16.21 contract', contract == DB_CONTRACT)
    info = {'mode': 'unverified', 'path': DB_CONTRACT['path']}
    path = root / DB_CONTRACT['path']
    check('DB exists', path.is_file())
    if not path.is_file():
        return info
    raw = path.read_bytes()
    info.update({'bytes': len(raw), 'sha256': sha(raw), 'gitBlob': git_blob_sha(raw)})
    matched = [
        row for row in DB_CONTRACT['acceptedRaw']
        if len(raw) == row['bytes']
        and ('sha256' not in row or info['sha256'] == row['sha256'])
        and ('gitBlob' not in row or info['gitBlob'] == row['gitBlob'])
    ]
    info['mode'] = matched[0]['mode'] if len(matched) == 1 else 'unknown_raw'
    check('DB raw input is a recorded canonical or authored input', len(matched) == 1)
    try:
        spec = importlib.util.spec_from_file_location('balance_runtime_data', root / 'tools/runtime_data.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        cleaned, removed = module.clean_runtime_db(json.loads(raw))
        clean_raw = json.dumps(cleaned, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        info['cleanRuntime'] = {'bytes': len(clean_raw), 'sha256': sha(clean_raw)}
        info['sanitizedTables'] = removed
        info['cleanParityPassed'] = info['cleanRuntime'] == DB_CONTRACT['cleanRuntime']
        check('DB native clean runtime bytes/hash', info['cleanParityPassed'])
    except (OSError, ValueError, KeyError, TypeError, AttributeError, ImportError) as error:
        info['cleanParityPassed'] = False
        info['error'] = str(error)
        check('DB native clean runtime bytes/hash', False)
    return info


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', default=str(Path(__file__).resolve().parents[1]))
    parser.add_argument('--browser-root')
    parser.add_argument('--out')
    args = parser.parse_args()
    root = Path(args.source_root).resolve()
    data = root / 'docs/data/full_balance_v01621'
    checks = []

    def check(name, ok):
        checks.append({'name': name, 'passed': bool(ok)})

    manifest = json.loads((data / 'MANIFEST.json').read_text())
    for row in manifest['files']:
        path = data / row['path']
        check('evidence exists ' + row['path'], path.is_file())
        if not path.is_file():
            continue
        raw = path.read_bytes()
        check('evidence bytes/hash ' + row['path'], len(raw) == row['bytes'] and sha(raw) == row['sha256'])
        unpacked = row.get('decompressed')
        # The separately sealed combat manifest names its uncompressed hashes
        # originalBytes/originalSha256; both schemas are verified exactly.
        if unpacked is None and 'originalSha256' in row:
            unpacked = {'bytes': row['originalBytes'], 'sha256': row['originalSha256']}
        if unpacked is not None:
            try:
                original = gzip.decompress(raw)
                check('gzip bytes/hash ' + row['path'], len(original) == unpacked['bytes'] and sha(original) == unpacked['sha256'])
            except (OSError, EOFError):
                check('gzip bytes/hash ' + row['path'], False)

    product = json.loads((data / 'product_manifest.json').read_text())
    paths = [row['path'] for row in product['files']]
    check('product exact inputs are 235 distinct non-DB files', len(paths) == 235 and len(set(paths)) == 235 and DB_CONTRACT['path'] not in paths)
    for row in product['files']:
        path = root / row['path']
        check('product exists ' + row['path'], path.is_file())
        if path.is_file():
            raw = path.read_bytes()
            check('product bytes/hash ' + row['path'], len(raw) == row['bytes'] and sha(raw) == row['sha256'])
    database = verify_database(root, product.get('dbContract'), check)

    if args.browser_root:
        browser = Path(args.browser_root).resolve()
        pack = json.loads(gzip.decompress((data / 'build/browser_offline_pack.json.gz').read_bytes()))
        for row in pack['files']:
            path = browser / row['path']
            check('built pack exists ' + row['path'], path.is_file())
            if path.is_file():
                raw = path.read_bytes()
                check('built pack bytes/hash ' + row['path'], len(raw) == row['bytes'] and sha(raw) == row['sha256'])
        for filename, archive in [('offline-pack.json', 'browser_offline_pack.json.gz'), ('asset-manifest.json', 'browser_asset_manifest.json.gz'), ('release.json', 'browser_release.json.gz')]:
            path = browser / filename
            check('exact built index ' + filename, path.is_file() and path.read_bytes() == gzip.decompress((data / 'build' / archive).read_bytes()))

    result = {
        'schema': 2,
        'passed': all(check['passed'] for check in checks),
        'checks': len(checks),
        'failed': [check for check in checks if not check['passed']],
        'database': database,
        'assumption': 'The exact canonical QA or published authored DB must also produce the recorded native clean runtime DB. Authored raw blob preservation alone is not clean parity evidence.',
    }
    if args.out:
        Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
