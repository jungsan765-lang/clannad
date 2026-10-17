#!/usr/bin/env python3
"""Portable, read-only selected combat contracts; captures original scripts/logs and input bytes."""
from pathlib import Path
import argparse,concurrent.futures,datetime,gzip,hashlib,json,subprocess,time
p=argparse.ArgumentParser();p.add_argument('--root',default=str(Path(__file__).resolve().parents[4]));p.add_argument('--out',default=str(Path(__file__).with_name('before_contracts')));p.add_argument('--workers',type=int,default=3);a=p.parse_args();root=Path(a.root).resolve();out=Path(a.out).resolve();out.mkdir(parents=True,exist_ok=True);sha=lambda b:hashlib.sha256(b).hexdigest()
tests=['tests/test_combat_boundaries_v0168.cjs','tests/test_combat_stalemate_v01523.cjs','tests/test_control_reactions_v0168.cjs','tests/test_control_grace_v01619.cjs','tests/test_monster_control_fixes_v01618.cjs','tests/test_element_immunity_v01618.cjs','tests/test_reaction_fixes_v01619.cjs','tests/test_healing_v01619.cjs','tests/test_shield_balance_v01619.cjs','tests/test_shield_meter_v01619.cjs','tests/test_v0142_combat_summons.cjs','tests/test_coop_v0153.cjs','tests/test_v0152.cjs','tests/test_noelle_healing_v01621.cjs','tools/test_boss_boundaries_v01619.cjs','tools/test_field_boss_immunity_v01618.cjs']
inputs=[f for f in (root/'source').rglob('*') if f.is_file()]+[root/'content/db.json',root/'package.json',root/'package-lock.json',root/'content/release-notes.json'];source=[{'path':str(f.relative_to(root)),'bytes':f.stat().st_size,'sha256':sha(f.read_bytes())} for f in sorted(inputs)];(out/'input_manifest.json').write_text(json.dumps(source,indent=2)+'\n')
def run(file):
 name=file.replace('/','__');f=root/file
 if not f.exists():return {'path':file,'status':'MISSING','exitCode':None}
 raw=f.read_bytes();(out/(name+'.original.gz')).write_bytes(gzip.compress(raw,compresslevel=9,mtime=0));cmd=['node',file]
 if file.startswith('tools/'):cmd.append(str(out/(name+'.native.json')))
 start=datetime.datetime.now(datetime.timezone.utc).isoformat();t=time.monotonic();r=subprocess.run(cmd,cwd=root,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=180);log=r.stdout.encode();(out/(name+'.log.gz')).write_bytes(gzip.compress(log,compresslevel=9,mtime=0))
 return {'path':file,'command':cmd,'startedUTC':start,'finishedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'seconds':time.monotonic()-t,'exitCode':r.returncode,'status':'PASS' if r.returncode==0 else 'FAIL','scriptSha256':sha(raw),'scriptBytes':len(raw),'logSha256':sha(log),'logBytes':len(log),'tail':r.stdout[-1600:]}
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as pool:
 for result in pool.map(run,tests):results.append(result);print(json.dumps({k:result[k] for k in ['path','status','exitCode']},ensure_ascii=False),flush=True)
after=[{'path':str(f.relative_to(root)),'bytes':f.stat().st_size,'sha256':sha(f.read_bytes())} for f in sorted(inputs)];data={'schema':1,'root':str(root),'scope':'Existing isolated native combat contracts on current product source; test fixtures may fix RNG or suppress unrelated AI, and are not full campaign counts. No product writes.','inputManifestSha256':sha((out/'input_manifest.json').read_bytes()),'inputFiles':len(source),'inputDrift':[x['path'] for x,y in zip(source,after) if x!=y],'results':results,'counts':{s:sum(r['status']==s for r in results) for s in ['PASS','FAIL','MISSING']}};(out/'results.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');print(json.dumps(data['counts']))
