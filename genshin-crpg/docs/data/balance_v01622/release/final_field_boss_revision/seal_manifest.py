#!/usr/bin/env python3
"""Seal this candidate evidence only; never rewrite earlier manifests."""
from pathlib import Path
import datetime,hashlib,json
OUT=Path(__file__).resolve().parent
assert not (OUT/'MANIFEST.json').exists(), 'Already sealed; do not overwrite'
rows=[];excluded=[]
for p in sorted(OUT.rglob('*')):
 if not p.is_file():continue
 rel=p.relative_to(OUT).as_posix()
 if p.name=='MANIFEST.json' or '__pycache__' in p.parts or 'active' in p.parts or p.suffix in ('.pyc','.log'):
  excluded.append(rel);continue
 raw=p.read_bytes();rows.append({'path':rel,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
v=json.loads((OUT/'final_verification.json').read_text());assert v['effectiveCurrentPassedPrograms']==11 and v['generalThreeEnginePassed']==218 and v['strategyThreeEnginePassed']==54
out={'schemaVersion':1,'sealedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Final0.16.22 field-boss revision3 evidence. Original11=10PASS1legacy-policy-scopeFAIL; approved whole-programrecheck26PASS gives effective11PASS; actual3engine218and54. Priorsealed candidates unchanged.','files':rows,'excludedLocalFiles':excluded,'exclusionReason':'Self manifest, local interpreter caches, raw active/partial logs are not publishable sealed proof; authoritative gzip/per_gate/contract reports are included.'}
f=OUT/'MANIFEST.json';f.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
for r in rows:
 raw=(OUT/r['path']).read_bytes();assert len(raw)==r['bytes'] and hashlib.sha256(raw).hexdigest()==r['sha256']
print(json.dumps({'files':len(rows),'excluded':excluded,'manifestSha256':hashlib.sha256(f.read_bytes()).hexdigest(),'nativeProcessesActiveByThisAgent':0,'frozen':True}))
