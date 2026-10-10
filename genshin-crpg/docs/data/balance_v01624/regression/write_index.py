#!/usr/bin/env python3
"""Index retained QA attempts without erasing original failures."""
import datetime,hashlib,json,pathlib
OUT=pathlib.Path(__file__).resolve().parent
RUNS=['initial_source_15','historical_hash_corrected','canonical_admin_boss_origin_corrected','final_frozen_native_6','final_historical_provenance']
latest={};attempts=[]
for run in RUNS:
    p=OUT/run/'summary.json'
    if not p.exists():raise SystemExit('Missing completed run: '+run)
    s=json.loads(p.read_text())
    for r in s['results']:
        row={**r,'run':run,'resultFile':run+'/'+pathlib.Path(r['test']).stem+'.result.json'}
        latest[r['test']]=row;attempts.append(row)
def product_changes(changes):return {k:v for k,v in changes.items() if k.startswith(('source/','server/','content/')) or k in ['package.json','package-lock.json']}
f=json.loads((OUT/'final_frozen_native_6/summary.json').read_text())
h=json.loads((OUT/'final_historical_provenance/summary.json').read_text())
value={'schema':1,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'uniqueSelectedPrograms':len(latest),'latestSelectedPassed':sum(r['passed'] for r in latest.values()),'latestSelectedFailed':sum(not r['passed'] for r in latest.values()),'retainedExecutions':len(attempts),'retainedInitialFailures':sum(not r['passed'] for r in attempts),'finalFrozenPrograms':len(f['results'])+len(h['results']),'finalFrozenPassed':sum(r['passed'] for r in f['results']+h['results']),'finalFrozenProductDrift':product_changes(f['inputDrift'])|product_changes(h['inputDrift']),'latestResults':list(latest.values()),'allAttempts':attempts,'scope':'Selected peripheral regressions; 7 rerun on final frozen source/build. Initial historical-source and canonical-boss-origin test failures retained and corrected with parent authorization. Historical recorded fights are not fresh 0.16.24 fights. Native growth settlement test injects victory to isolate payment; no difficulty claim.'}
(OUT/'REGRESSION_INDEX.json').write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:value[k] for k in ['uniqueSelectedPrograms','latestSelectedPassed','latestSelectedFailed','retainedExecutions','retainedInitialFailures','finalFrozenPrograms','finalFrozenPassed','finalFrozenProductDrift']},ensure_ascii=False))
