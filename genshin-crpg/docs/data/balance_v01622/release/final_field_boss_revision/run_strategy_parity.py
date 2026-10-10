#!/usr/bin/env python3
"""Save the exact strategy program's three-real-engine run and input receipts."""
from pathlib import Path
import datetime,gzip,hashlib,json,os,signal,subprocess,time
ROOT=Path('/workspace/scratch/a62414469990/crpg-v01618-work/genshin-crpg')
OUT=ROOT/'docs/data/balance_v01622/release/final_field_boss_revision'
DEST=OUT/'strategy_three_engines'
DEST.mkdir(parents=True,exist_ok=True)
assert not (DEST/'run_result.json').exists(), 'Preserve previous run; use a separate candidate directory'
def snap():
 paths={ROOT/x['path'] for x in json.loads((OUT/'input_manifest.json').read_text())['files']}
 paths.update(ROOT/x['path'] for x in json.loads((OUT/'supplemental_dependency_manifest.json').read_text())['files'])
 paths.update([ROOT/'tools/audit_build_parity_v01621.cjs',ROOT/'tools/verify_balance_evidence_v01621.py',OUT/'run_three_engine_strategy.cjs',Path(__file__),OUT/'finalized_plan.json'])
 browser=ROOT.parent/'v01622-field-boss-verification-work/browser'
 names=[x['file'] for x in json.loads((OUT/'build/parity_raw.json').read_text())['provenance']['browserRuntimeFiles']]
 paths.update(browser/x for x in names+['data.js','index.html','release.json'])
 rows=[]
 for p in sorted(paths):
  raw=p.read_bytes();rows.append({'path':os.path.relpath(p,ROOT),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
 return rows
before=snap();(DEST/'input_before.json').write_text(json.dumps({'files':before},ensure_ascii=False,indent=2)+'\n')
cmd=['node',str(OUT/'run_three_engine_strategy.cjs')];started=time.monotonic();at=datetime.datetime.now(datetime.timezone.utc).isoformat();code=None;err=None;timed=False
log=DEST/'run.log'
with log.open('wb') as fh:
 p=None
 try:
  p=subprocess.Popen(cmd,cwd=ROOT,stdout=fh,stderr=subprocess.STDOUT,start_new_session=True)
  try:code=p.wait(timeout=900)
  except subprocess.TimeoutExpired:
   timed=True;os.killpg(p.pid,signal.SIGTERM)
   try:code=p.wait(timeout=10)
   except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);code=p.wait()
 except Exception as e:
  err=f'{type(e).__name__}: {e}';fh.write((err+'\n').encode())
  if p and p.poll() is None:os.killpg(p.pid,signal.SIGKILL);p.wait()
raw=log.read_bytes();gz=DEST/'run.log.gz';gz.write_bytes(gzip.compress(raw,mtime=0));log.unlink();after=snap()
(DEST/'input_after.json').write_text(json.dumps({'files':after},ensure_ascii=False,indent=2)+'\n')
a={x['path']:x for x in before};b={x['path']:x for x in after};drift=[{'path':k,'before':a.get(k),'after':b.get(k)} for k in sorted(a.keys()|b.keys()) if a.get(k)!=b.get(k)]
result={'startedAt':at,'seconds':round(time.monotonic()-started,3),'command':cmd,'returnCode':code,'timedOut':timed,'exception':err,'ok':code==0 and not timed and err is None and not drift,'log':'run.log.gz','logBytes':len(raw),'logSha256':hashlib.sha256(raw).hexdigest(),'inputCount':len(before),'inputDrift':drift}
(DEST/'run_result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False),flush=True)
if not result['ok']:print(raw.decode(errors='replace')[-12000:],flush=True)
raise SystemExit(0 if result['ok'] else 1)
