"""Read-only input audit; a historical remote comparison is not a new download."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent


def read(rel):
    return json.loads((ROOT / rel).read_text())


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


db_path = ROOT / 'content/db.json'
db = read('content/db.json')
prior_path = 'docs/data/qa_v01619/db_runtime_semantic_parity_v01619.json'
prior = read(prior_path)
publication = read('docs/data/publication_v01625_manifest.json')
receipt = read('docs/data/publication_v01625_receipt.json')
blob = publication['protected']['genshin-crpg/content/db.json']
assert prior['currentRemoteDbBlob'] == blob
assert prior['all64TablesSemanticallyEqual'] is True
assert sha256(db_path) == prior['localCurrentDbSha256']
assert receipt['commitSHA'] == '46190377b713e6218e66b26bc4292f18fb5a348d'
assert receipt['treeChecks']['errors'] == 0
assert set(db) == {r['table'] for r in prior['tables']}
tables = []
for expected in prior['tables']:
    name = expected['table']
    encoded = json.dumps(db[name], ensure_ascii=False, separators=(',', ':'), sort_keys=True).encode()
    digest = hashlib.sha256(encoded).hexdigest()
    assert digest == expected['semanticSha256'], name
    tables.append({'table': name, 'semanticSHA256': digest, 'matchesPriorRemoteComparison': True})

frozen_path = 'docs/data/balance_v01625/PRODUCT_FROZEN_SHA256.json'
frozen = read(frozen_path)
for rel, expected in frozen.items():
    assert sha256(ROOT / rel) == expected, rel

result = {
    'publishedCommit': receipt['commitSHA'],
    'remoteAuthoredDbGitBlob': blob,
    'qaRawDbSHA256': sha256(db_path),
    'priorPublishedExtractedDbSHA256': prior['publishedExtractedDbSha256'],
    'priorComparison': {'path': prior_path, 'fileSHA256': sha256(ROOT / prior_path),
                        'checkedAt': prior['checkedAt'], 'allTablesEqual': True},
    'currentSemanticRecheck': {'tables': len(tables), 'matches': len(tables), 'tablesDetail': tables},
    'publishedReceipt': {'path': 'docs/data/publication_v01625_receipt.json',
                         'fileSHA256': sha256(ROOT / 'docs/data/publication_v01625_receipt.json'),
                         'unselectedPreserved': receipt['treeChecks']['unselectedPreserved']},
    'productFrozenFiles': {'path': frozen_path, 'checked': len(frozen), 'drift': 0},
    'scope': 'Fresh local semantic verification against the existing comparison of the same remote Git blob. No fresh remote download or live server account replay. Different raw JSON serialization is not different game-table content.',
}
HERE.mkdir(parents=True, exist_ok=True)
(HERE / 'input_provenance.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'tables': len(tables), 'matches': len(tables), 'productFiles': len(frozen),
                  'drift': 0, 'remoteDbBlob': blob}))
