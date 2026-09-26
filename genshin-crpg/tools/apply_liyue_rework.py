#!/usr/bin/env python3
"""Apply the pinned v0.13.39 data revision atomically; safe on an already updated checkout."""
from pathlib import Path
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
def apply():
 path=ROOT/'content/db.json';raw=path.read_bytes();db=json.loads(raw)
 # Original IDs are retained, so these new IDs uniquely identify the applied revision.
 nodes={r[4] for r in db['55_MAIN_STORY_DB'][1:] if len(r)>4}
 if 'R39_FIELD_ISK_L02_B2_062' in nodes and any(r and r[0]=='LEG_ISK_MOND_VENTI' for r in db['56_MOND_LEGEND_DB'][1:]):return False
 patch=json.loads((ROOT/'content/story-revisions/rev03-db-patch.json').read_text())
 if hashlib.sha256(raw).hexdigest()!=patch['baseSha256']:raise SystemExit('Liyue revision base mismatch: review this content version before applying.')
 for table,change in patch['tables'].items():
  for update in change['updates']:
   row=db[table][update['row']]
   for column,value in update['cells'].items():
    i=int(column)
    while len(row)<=i:row.append(None)
    row[i]=value
  db[table].extend(change['append'])
 out=(json.dumps(db,ensure_ascii=False,separators=(',',':'))+'\n').encode()
 if hashlib.sha256(out).hexdigest()!=patch['targetSha256']:raise SystemExit('Liyue revision output checksum mismatch.')
 temp=path.with_suffix('.revision-tmp');temp.write_bytes(out);temp.replace(path);return True
if __name__=='__main__':print('Liyue data revision applied' if apply() else 'Liyue data revision already present')
