"""Export the explicit v0.16.26 publication allowlist, never the dirty checkout."""
from pathlib import Path
import argparse, hashlib, json

ROOT = Path(__file__).resolve().parents[1]
FIXED = [
    'AGENTS.md', 'package.json', 'package-lock.json', 'content/release-notes.json',
    'source/runtime_abyss.js', 'source/runtime_formations.js', 'source/runtime_growth_v01522.js', 'source/runtime_balance_admin_v01623.js',
    'tests/test_abyss_fixes_v01626.cjs', 'tools/audit_abyss_engines_v01626.cjs',
    'tools/prepare_abyss_publication_v01626.py', 'docs/AI_HANDOFF.md',
    'docs/NEXT_STEPS_KO.md', 'docs/ABYSS_AUDIT_0.16.25_KO.md',
    'docs/PATCH_0.16.26_KO.md', 'docs/APPLY_0.16.26_KO.md',
    'docs/data/publication_v01625_receipt.json',
]

def files():
    paths = {ROOT / x for x in FIXED}
    for directory in ['docs/data/abyss_audit_v01625', 'docs/data/abyss_fixes_v01626']:
        paths.update(p for p in (ROOT / directory).rglob('*') if p.is_file()
                     and '__pycache__' not in p.parts and p.suffix != '.pyc')
    assert all(p.is_file() and not p.is_symlink() for p in paths)
    return sorted(paths)

def manifest():
    entries = []
    for p in files():
        raw = p.read_bytes()
        entries.append({'path': 'genshin-crpg/' + p.relative_to(ROOT).as_posix(),
                        'mode': '100644', 'sha': hashlib.sha1(b'blob ' + str(len(raw)).encode() + b'\0' + raw).hexdigest(),
                        'sha256': hashlib.sha256(raw).hexdigest(), 'size': len(raw)})
    product = [p['path'] for p in entries if p['path'].startswith('genshin-crpg/source/')]
    assert product == ['genshin-crpg/source/runtime_abyss.js', 'genshin-crpg/source/runtime_balance_admin_v01623.js', 'genshin-crpg/source/runtime_formations.js', 'genshin-crpg/source/runtime_growth_v01522.js']
    return {'version': '0.16.26', 'parentCommit': '46190377b713e6218e66b26bc4292f18fb5a348d',
            'parentTree': '1fc8789f1cd63ce22b1cab9401429ea139f6cce3',
            'branch': 'test/crpg-v01414-story',
            'scope': 'Four runtime modules, version metadata, exact tests and reproducible audit evidence/documentation only.',
            'protected': {'genshin-crpg/content/db.json': 'cc3996929c885d41289038ff501640039a4cc71e',
                          'genshin-crpg/assets': 'c8e23881af963b1eea026ba8d0e559f9df0f2181',
                          'genshin-crpg/source/db_planned.json': '03d51f8a019f46dbb043f7b28d014548f448c68d'},
            'excluded': 'Local dirty tree, generated builds, original assets/authoredDB/UI; manifest itself and post-commit fixed-SHA receipt/commands are added separately.',
            'files': entries}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--out')
    args = parser.parse_args()
    result = manifest()
    raw = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.out:
        (ROOT / args.out).write_text(raw)
        print(json.dumps({'selected': len(result['files']), 'bytes': sum(p['size'] for p in result['files']), 'out': args.out}))
    else:
        print(raw, end='')
