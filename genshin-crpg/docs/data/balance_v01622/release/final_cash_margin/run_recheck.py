#!/usr/bin/env python3
from pathlib import Path
import datetime,difflib,gzip,hashlib,json,os,signal,subprocess,sys,time
ROOT=Path('/workspace/scratch/a62414469990/crpg-v01618-work/genshin-crpg')
OUT=ROOT/'docs/data/balance_v01622/release/final_cash_margin'
QA=OUT/'qa_correction';CHECK=QA/'recheck'
TEST='tests/test_ascension_efficiency_v01613.cjs'
BEFORE='593a18f606ae5c7456cce3bf729d70d0dfc8b4f80613650d666af9008f06ad57'
AFTER='855a2afdef130e5eb7e65a620152f3751299e7048b77aefdf128f94fbd0f9a80'
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def dump(p,obj):p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def digest(raw):return hashlib.sha256(raw).hexdigest()
def capture():
 paths=[Path(p) for p in ['package.json','package-lock.json','content/release-notes.json','content/db.json','tools/verify_release.py']]
 paths.extend(Path(p) for p in json.loads((OUT/'finalized_plan.json').read_text())['tests'])
 excluded={'tools/audit_build_parity_v01621.cjs','tools/verify_balance_evidence_v01621.py'}
 for folder in ('source','server','tools'):
  paths.extend(p.relative_to(ROOT) for p in (ROOT/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.pyc' and 'node_modules' not in p.parts and p.relative_to(ROOT).as_posix() not in excluded)
 rows=[]
 for p in sorted(set(paths)):
  raw=(ROOT/p).read_bytes();rows.append({'path':p.as_posix(),'bytes':len(raw),'sha256':digest(raw)})
 return rows
assert not (CHECK/'result.json').exists(),'Do not overwrite prior recheck authority'
old=(ROOT/'docs/data/balance_v01622/growth/qa_final_bonus_correction/before_test_ascension_efficiency_v01613.cjs').read_bytes()
new=(ROOT/TEST).read_bytes()
assert digest(old)==BEFORE and digest(new)==AFTER
assert old.count(b'3686')==1 and old.replace(b'3686',b'3864')==new
(QA/'before_test_ascension_efficiency_v01613.cjs').write_bytes(old)
(QA/'after_test_ascension_efficiency_v01613.cjs').write_bytes(new)
(QA/'expectation.diff').write_text(''.join(difflib.unified_diff(old.decode().splitlines(True),new.decode().splitlines(True),fromfile='before/'+TEST,tofile='after/'+TEST)))
original=json.loads((OUT/'input_manifest_after.json').read_text())['files'];initial=capture()
changed=[{'path':a['path'],'before':a,'after':b} for a,b in zip(original,initial) if a!=b]
assert len(initial)==len(original) and len(changed)==1 and changed[0]['path']==TEST
approval={'test':TEST,'beforeSha256':BEFORE,'afterSha256':AFTER,'authorizedBy':'root approved one-literal3686to3864 QA expectation correction after first36; product unchanged','reason':'Approved Lv55 payment1932 with existing first-three2x bonus gives3864; prior1843x2=3686 expectation was stale. Victory asserts, enemy/party/native fixture, all other cases unchanged.','approvedDelta':changed,'originalFailureRawSha256':'cfddefb5b6b5bc57f7858ab1af97b991dc3ae421ec03e1b48f1fdeecc2c756c5','originalFailureProgramResult':'../per_gate/020.json','first36OriginalResultsNotRewritten':True,'transientCorrectionAndRestoreEvent':'../transient_approved_qa_event.json','recordedAt':now()}
dump(QA/'approval_and_delta.json',approval);dump(CHECK/'input_manifest.json',{'capturedAt':now(),'files':initial})
started=time.monotonic();at=now();rawpath=CHECK/'test.log';cmd=['node',TEST];code=None;error=None;timeout=False
with rawpath.open('wb') as fh:
 process=None
 try:
  process=subprocess.Popen(cmd,cwd=ROOT,stdout=fh,stderr=subprocess.STDOUT,start_new_session=True)
  try:code=process.wait(timeout=900)
  except subprocess.TimeoutExpired:
   timeout=True;os.killpg(process.pid,signal.SIGTERM)
   try:code=process.wait(timeout=10)
   except subprocess.TimeoutExpired:os.killpg(process.pid,signal.SIGKILL);code=process.wait()
 except Exception as e:
  error=f'{type(e).__name__}: {e}';fh.write((error+'\n').encode())
  if process is not None and process.poll() is None:os.killpg(process.pid,signal.SIGKILL);process.wait()
raw=rawpath.read_bytes();(CHECK/'test.log.gz').write_bytes(gzip.compress(raw,mtime=0));rawpath.unlink()
final=capture();dump(CHECK/'input_manifest_after.json',{'capturedAt':now(),'files':final})
contracts=sum(line.startswith('PASS ') for line in raw.decode(errors='replace').splitlines())
row={'test':TEST,'command':cmd,'returnCode':code,'timedOut':timeout,'exception':error,'ok':code==0 and not timeout and error is None and initial==final and contracts==6,'startedAt':at,'endedAt':now(),'seconds':round(time.monotonic()-started,3),'testSha256':AFTER,'contractsPassed':contracts,'nativeBothRoutesIncluded':True,'log':'test.log.gz','logBytes':len(raw),'logSha256':digest(raw),'inputDrift':[] if initial==final else [{'before':a,'after':b} for a,b in zip(initial,final) if a!=b],'sourceProductChanges':[]}
dump(CHECK/'result.json',row)
print(json.dumps(row,ensure_ascii=False),flush=True)
if not row['ok']:print(raw.decode(errors='replace')[-12000:],flush=True)
raise SystemExit(0 if row['ok'] else 1)
