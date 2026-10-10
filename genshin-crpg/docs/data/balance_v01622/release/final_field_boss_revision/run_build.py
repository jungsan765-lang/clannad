#!/usr/bin/env python3
from pathlib import Path
import datetime,gzip,hashlib,json,os,subprocess,sys,time
ROOT=Path('/workspace/scratch/a62414469990/crpg-v01618-work/genshin-crpg')
OUT=ROOT/'docs/data/balance_v01622/release/final_field_boss_revision/build'
OUT.mkdir(parents=True,exist_ok=True)
assert json.loads((ROOT/'package.json').read_text())['version']=='0.16.22'
commands=[
 ('server',[sys.executable,'tools/build_server.py'],{}),
 ('browser',[sys.executable,'tools/build.py'],{'CRPG_BUILD_DIR':'../v01622-field-boss-verification-work/browser','CRPG_BUILD_REPORT':'docs/data/balance_v01622/release/final_field_boss_revision/build/browser_report.json'}),
 ('engine_identity',[sys.executable,'tests/test_engine_identity.py'],{}),
 ('three_engine_parity',['node','tools/audit_build_parity_v01621.cjs','--source-root','.','--browser-root','../v01622-field-boss-verification-work/browser','--server-file','server/generated/engine.mjs','--out','docs/data/balance_v01622/release/final_field_boss_revision/build/parity_raw.json'],{})]
mode=sys.argv[1] if len(sys.argv)>1 else 'all'
assert mode in ('light','parity','all')
selected=commands[:3] if mode=='light' else commands[3:] if mode=='parity' else commands
existing=OUT/'results.json'
rows=json.loads(existing.read_text()) if existing.exists() else []
assert not any(r['step']==name for r in rows for name,_,_ in selected), 'build step already recorded; use new folder for new candidate'
for name,cmd,extra in selected:
 started=time.monotonic();at=datetime.datetime.now(datetime.timezone.utc).isoformat()
 print(json.dumps({'kind':'build_start','step':name,'command':cmd}),flush=True)
 raw_path=OUT/(name+'.log')
 with raw_path.open('wb') as fh:
  try:
   p=subprocess.run(cmd,cwd=ROOT,env={**os.environ,**extra},stdout=fh,stderr=subprocess.STDOUT,timeout=900)
   code=p.returncode;error=None
  except Exception as e:
   code=None;error=f'{type(e).__name__}: {e}';fh.write((error+'\n').encode())
 raw=raw_path.read_bytes();gz_path=raw_path.with_suffix('.log.gz');gz_path.write_bytes(gzip.compress(raw,mtime=0));raw_path.unlink()
 row={'step':name,'command':cmd,'environment':extra,'returnCode':code,'error':error,'ok':code==0 and error is None,'startedAt':at,'seconds':round(time.monotonic()-started,3),'log':gz_path.name,'logBytes':len(raw),'logSha256':hashlib.sha256(raw).hexdigest()}
 rows.append(row);(OUT/'results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'kind':'build_result',**row}),flush=True)
 if not row['ok']:
  print(raw.decode('utf-8',errors='replace')[-12000:],flush=True);raise SystemExit(1)
print('BUILDS_IDENTITY_PARITY_COMPLETE',flush=True)
