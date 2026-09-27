#!/usr/bin/env python3
"""Generate a static ESM engine for Workers; never evaluate uploaded JS or saves."""
from pathlib import Path
import json,re,hashlib,gzip
root=Path(__file__).resolve().parents[1]
html=(root/'source/index.html').read_text()
files=[x for x in re.findall(r'<script src="([^"?]+)',html) if x in ('world_content.js','presentation.js') or x.startswith('runtime')]
body='\n'.join((root/'source'/x).read_text() for x in files)
# Resolve the four legacy CommonJS fallback imports statically for the Worker bundler.
body=re.sub(r'''require\(['"]\./runtime[^'"]*\.js['"]\)''','root.CRPGRuntime',body)
from apply_liyue_rework import apply as apply_liyue_rework
from runtime_data import clean_runtime_db
apply_liyue_rework()
data,_=clean_runtime_db(json.loads((root/'content/db.json').read_text()))
version=json.loads((root/'package.json').read_text())['version']
out=root/'server/generated';out.mkdir(exist_ok=True)
# Module scope wrappers keep the existing runtime free of eval/new Function.
source='const module=undefined;\n'+body+'\nconst DB='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n'
source+='const R=globalThis.CRPGRuntime.Runtime;\nif(globalThis.CRPGRelationships)globalThis.CRPGRelationships.install(globalThis.CRPGRuntime,{events:globalThis.CRPGRelationships.catalogFromDB(DB),activities:globalThis.CRPGRelationships.activitiesFromDB(DB),preferences:{adultModeEnabled:false},eligibility:{profiles:{},protagonists:{}}});\nnew R(DB); // Warm immutable lookup maps once per Worker isolate, outside request handling.\n'
source+='export {R,DB};\nexport const ENGINE_VERSION='+json.dumps(version)+';\n'
(out/'engine.mjs').write_text(source)
print(json.dumps({'version':version,'runtime_files':len(files),'bytes':len(source.encode()),'gzip_bytes':len(gzip.compress(source.encode()))}))
