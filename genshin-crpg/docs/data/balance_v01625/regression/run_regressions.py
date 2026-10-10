#!/usr/bin/env python3
"""Read-only product QA: retains each output, exit code, command, and input hashes."""
import argparse, concurrent.futures, datetime, hashlib, json, os, pathlib, subprocess, time
ROOT = pathlib.Path(__file__).resolve().parents[4]
OUT = pathlib.Path(__file__).resolve().parent
SOURCE_TESTS = [
 'tests/test_incoming_defense_v01622.cjs',
 'tests/test_healing_v01619.cjs',
 'tests/test_noelle_healing_v01621.cjs',
 'tests/test_shield_balance_v01619.cjs',
 'tests/test_food_balance_v01620.cjs',
 'tests/test_inn_recovery_pricing_v01615.cjs',
 'tests/test_reaction_fixes_v01619.cjs',
 'tools/test_admin_balance_runtime_v01623.cjs',
]
SERVER_TESTS = ['tests/test_admin_balance_v01623.mjs','tests/test_admin_balance_growth_v01623.mjs']
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def snapshot():
    paths = set()
    for d in ['source', 'server', 'tests', 'tools']:
        paths.update(p for p in (ROOT / d).rglob('*') if p.is_file() and p.suffix in ['.js','.cjs','.mjs','.html','.css','.py'])
    for p in ['content/db.json','package.json','package-lock.json','source/index.html']:
        if (ROOT/p).is_file(): paths.add(ROOT/p)
    return {str(p.relative_to(ROOT)):sha(p) for p in sorted(paths)}
def write(p, value): p.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def diff(a,b): return {k:{'before':a.get(k),'after':b.get(k)} for k in sorted(set(a)|set(b)) if a.get(k)!=b.get(k)}
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--label',default='provisional_source_8');ap.add_argument('--server',action='store_true');ap.add_argument('--test',action='append');ap.add_argument('--timeout',type=int,default=600);args=ap.parse_args()
    run=OUT/args.label
    if run.exists(): raise SystemExit('Output folder exists; select a fresh --label to preserve prior evidence.')
    run.mkdir(); tests=args.test or (SERVER_TESTS if args.server else SOURCE_TESTS)
    before=snapshot();write(run/'inputs_before.json',before)
    meta={'startedAt':now(),'cwd':str(ROOT),'node':subprocess.check_output(['node','--version'],text=True).strip(),'python':os.sys.version,'selectedTests':tests,'perTestTimeoutSeconds':args.timeout,'scope':'Read-only selected regressions; not complete battle balance or farming-time proof.','generatedEngineCaveat':'0.16.25 source CJS tests load source scripts directly; generated/server tests require the parent final build. Product/tests edits are excluded from this QA scope.'}
    write(run/'selection.json',meta)
    def execute(test):
        name=pathlib.Path(test).stem; cmd=['node',test]; start=now(); pre=snapshot(); t=time.monotonic()
        try:
            p=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True,timeout=args.timeout)
            stdout,stderr,code=p.stdout,p.stderr,p.returncode
        except subprocess.TimeoutExpired as e:
            stdout=e.stdout or '';stderr=(e.stderr or '')+'\nQA_TIMEOUT_'+str(args.timeout)+'_SECONDS\n';code=124
            if isinstance(stdout,bytes): stdout=stdout.decode(errors='replace')
            if isinstance(stderr,bytes): stderr=stderr.decode(errors='replace')
        elapsed=time.monotonic()-t;post=snapshot()
        (run/(name+'.stdout.log')).write_text(stdout);(run/(name+'.stderr.log')).write_text(stderr)
        r={'test':test,'command':cmd,'startedAt':start,'endedAt':now(),'seconds':round(elapsed,3),'exitCode':code,'passed':code==0,'inputDrift':diff(pre,post),'testSha256':pre[test],'generatedEngineSha256':pre.get('server/generated/engine.mjs'),'stdoutSha256':sha(run/(name+'.stdout.log')),'stderrSha256':sha(run/(name+'.stderr.log')),'stdoutLog':name+'.stdout.log','stderrLog':name+'.stderr.log'}
        write(run/(name+'.result.json'),r);print(json.dumps({k:r[k] for k in ['test','exitCode','seconds','inputDrift']},ensure_ascii=False),flush=True);return r
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: results=list(pool.map(execute,tests))
    after=snapshot();write(run/'inputs_after.json',after)
    summary={**meta,'endedAt':now(),'programs':len(results),'passed':sum(r['passed'] for r in results),'failed':sum(not r['passed'] for r in results),'inputDrift':diff(before,after),'results':results}
    write(run/'summary.json',summary);print(json.dumps({k:summary[k] for k in ['programs','passed','failed','inputDrift']},ensure_ascii=False),flush=True)
    raise SystemExit(1 if summary['failed'] else 0)
if __name__=='__main__': main()
