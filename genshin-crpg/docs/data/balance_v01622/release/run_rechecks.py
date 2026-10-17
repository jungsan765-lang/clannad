#!/usr/bin/env python3
"""Final approved-QA rechecks; never replace original gate receipts."""
from pathlib import Path
import datetime,gzip,hashlib,json,subprocess,time
ROOT=Path('/workspace/scratch/a62414469990/crpg-v01618-work/genshin-crpg')
OUT=ROOT/'docs/data/balance_v01622/release'
RERUN=OUT/'qa_corrections/rechecks';RERUN.mkdir(exist_ok=True)
summary=json.loads((OUT/'summary.json').read_text());assert summary['complete']
tests=['tools/test_other_healers_v01619.cjs','tests/test_material_efficiency_v01622.cjs']
initial=json.loads((OUT/'input_manifest.json').read_text())['files']
def current(rows):
 return [{'path':r['path'],'bytes':len((ROOT/r['path']).read_bytes()),'sha256':hashlib.sha256((ROOT/r['path']).read_bytes()).hexdigest()} for r in rows]
start=current(initial);(RERUN/'input_manifest_before.json').write_text(json.dumps({'files':start},indent=2)+'\n')
results=[]
for index,test in enumerate(tests,1):
 raw=RERUN/(str(index)+'_'+Path(test).name+'.log');at=datetime.datetime.now(datetime.timezone.utc).isoformat();started=time.monotonic();test_sha=hashlib.sha256((ROOT/test).read_bytes()).hexdigest()
 print(json.dumps({'kind':'rerun_start','test':test,'testSha256':test_sha}),flush=True)
 with raw.open('wb') as log:
  try:
   p=subprocess.run(['node',test],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,timeout=900);code=p.returncode;error=None
  except Exception as e:
   code=None;error=f'{type(e).__name__}: {e}';log.write((error+'\n').encode())
 data=raw.read_bytes();gz=raw.with_suffix('.log.gz');gz.write_bytes(gzip.compress(data,mtime=0));raw.unlink()
 result={'test':test,'testSha256':test_sha,'startedAt':at,'seconds':round(time.monotonic()-started,3),'returnCode':code,'exception':error,'ok':code==0 and error is None,'log':gz.relative_to(OUT).as_posix(),'logBytes':len(data),'logSha256':hashlib.sha256(data).hexdigest(),'testSha256After':hashlib.sha256((ROOT/test).read_bytes()).hexdigest()}
 assert result['testSha256After']==test_sha
 results.append(result);(RERUN/'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'kind':'rerun_result',**result}),flush=True)
end=current(initial);(RERUN/'input_manifest_after.json').write_text(json.dumps({'files':end},indent=2)+'\n')
assert start==end,'input drift during approvedQA finalrerun'
raise SystemExit(0 if all(r['ok'] for r in results) else 1)
