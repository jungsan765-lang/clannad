#!/usr/bin/env python3
"""Run only the authored21 affected gates; preserve raw stdout and return codes."""
import argparse,concurrent.futures,hashlib,json,subprocess,time
from pathlib import Path
from datetime import datetime,timezone

def main():
    a=argparse.ArgumentParser(description=__doc__)
    a.add_argument('--source-root',type=Path,required=True)
    a.add_argument('--selection',type=Path,default=Path(__file__).with_name('selection.json'))
    a.add_argument('--out-dir',type=Path,required=True)
    a.add_argument('--workers',type=int,default=4)
    args=a.parse_args();selection=json.loads(args.selection.read_text())
    args.out_dir.mkdir(parents=True,exist_ok=True)
    def run(row):
        began=time.time();start=datetime.now(timezone.utc).isoformat()
        try:
            completed=subprocess.run(row['command'],cwd=args.source_root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=900)
            raw=completed.stdout;code=completed.returncode;timeout=False
        except subprocess.TimeoutExpired as ex:
            raw=(ex.stdout or b'')+b'\nTIMEOUT900SECONDS\n';code=124;timeout=True
        filename=row['test'].replace('/','__')+'.log';(args.out_dir/filename).write_bytes(raw)
        result={**row,'cwd':str(args.source_root),'startedUTC':start,'elapsedSeconds':round(time.time()-began,3),'exitCode':code,'passed':code==0,'timeout':timeout,'rawLog':filename,'rawLogSHA256':hashlib.sha256(raw).hexdigest()}
        print(json.dumps({k:result[k]for k in ['test','exitCode','elapsedSeconds']},ensure_ascii=False),flush=True)
        return result
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers)as pool:rows=list(pool.map(run,selection['selected']))
    summary={'schema':1,'version':'0.16.20','notWhole174ReleaseSuite':True,'selectedPrograms':len(rows),'passed':sum(x['passed']for x in rows),'failed':sum(not x['passed']for x in rows),'workers':args.workers,'newFood14GateNotDuplicated':True,'historicalInputGapsNotRunOrCountedPass':selection['historicalInputGapsNotRunOrCountedPass'],'rows':rows}
    (args.out_dir/'results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({k:v for k,v in summary.items()if k!='rows'},ensure_ascii=False),flush=True)
    if summary['failed']:raise SystemExit(1)
if __name__=='__main__':main()
