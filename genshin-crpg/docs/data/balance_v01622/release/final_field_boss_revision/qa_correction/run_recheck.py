#!/usr/bin/env python3
from pathlib import Path
import datetime,gzip,hashlib,json,os,signal,subprocess,time
ROOT=Path('/workspace/scratch/a62414469990/crpg-v01618-work/genshin-crpg');BASE=ROOT/'docs/data/balance_v01622/release/final_field_boss_revision';OUT=BASE/'qa_correction/recheck';OUT.mkdir(exist_ok=True)
assert not (OUT/'run_result.json').exists()
def snap():
 return [{'path':r['path'],'bytes':len((ROOT/r['path']).read_bytes()),'sha256':hashlib.sha256((ROOT/r['path']).read_bytes()).hexdigest()} for r in json.loads((BASE/'input_manifest.json').read_text())['files']]
before=snap();(OUT/'input_before.json').write_text(json.dumps({'files':before},ensure_ascii=False,indent=2)+'\n');cmd=['node','tests/test_combat_boundaries_v0168.cjs'];log=OUT/'run.log';at=datetime.datetime.now(datetime.timezone.utc).isoformat();started=time.monotonic();code=None;error=None;timed=False
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
  error=f'{type(e).__name__}: {e}';fh.write((error+'\n').encode())
  if p and p.poll() is None:os.killpg(p.pid,signal.SIGKILL);p.wait()
raw=log.read_bytes();(OUT/'run.log.gz').write_bytes(gzip.compress(raw,mtime=0));log.unlink();after=snap();(OUT/'input_after.json').write_text(json.dumps({'files':after},ensure_ascii=False,indent=2)+'\n');lines=raw.decode(errors='replace').splitlines();passes=[x for x in lines if x.startswith('PASS ')];last=None
for x in lines:
 if x.startswith('{'):
  try:last=json.loads(x)
  except ValueError:pass
assert last is not None, 'completion receipt missing'
row={'command':cmd,'startedAt':at,'seconds':round(time.monotonic()-started,3),'returnCode':code,'timedOut':timed,'exception':error,'ok':code==0 and not timed and error is None and before==after,'contractsPassed':last.get('passed'),'passLines':len(passes),'nativeBoundaryRegression':last.get('nativeBoundaryRegression'),'inputFiles':len(before),'inputDrift':[] if before==after else 'changed','log':'run.log.gz','logBytes':len(raw),'logSha256':hashlib.sha256(raw).hexdigest(),'finalQaSha256':hashlib.sha256((ROOT/cmd[1]).read_bytes()).hexdigest()}
(OUT/'run_result.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n');print(json.dumps(row),flush=True)
raise SystemExit(0 if row['ok'] else 1)
