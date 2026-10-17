import os,tempfile
import subprocess, pathlib, concurrent.futures, time
script_dir=pathlib.Path(__file__).resolve().parent
p=pathlib.Path(os.environ.get('CRPG_AUDIT_DATA',os.environ.get('CRPG_AUDIT_OUT',pathlib.Path(tempfile.gettempdir())/'crpg-reaction-healer-review/chasm_gap')))
p.mkdir(parents=True,exist_ok=True)
jobs=[(m,g) for m in ['MAP_CHASM_DEEP','MAP_CHASM_SURFACE','MAP_LY_DETAIL_CHASM_GATE'] for g in [3,6]]
def run(j):
 m,g=j; s=time.time()
 with open(p/f'campaign_{m}_{g}.log','w') as f:
  c=subprocess.run(['node',str(script_dir/'campaign.cjs'),m,str(g)],stdout=f,stderr=subprocess.STDOUT,env={**os.environ,'CRPG_AUDIT_OUT':str(p)})
 return {'map':m,'enhance':g,'code':c.returncode,'seconds':round(time.time()-s,1)}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as e:
 for r in e.map(run,jobs): print(r,flush=True)
