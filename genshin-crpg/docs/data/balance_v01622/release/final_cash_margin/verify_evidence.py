#!/usr/bin/env python3
"""Read-only product/log recheck; writes new candidate verification and after-input receipt only."""
from pathlib import Path
import datetime, gzip, hashlib, json, sys
ROOT=Path('/workspace/scratch/a62414469990/crpg-v01618-work/genshin-crpg')
OUT=ROOT/'docs/data/balance_v01622/release/final_cash_margin'

def read(p): return json.loads(p.read_text())
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def fingerprint(p):
    raw=(ROOT/p).read_bytes()
    return {'path':p.as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
def capture():
    paths=[Path(p) for p in ['package.json','package-lock.json','content/release-notes.json','content/db.json','tools/verify_release.py']]
    paths.extend(Path(t) for t in read(OUT/'finalized_plan.json')['tests'])
    excluded={'tools/audit_build_parity_v01621.cjs','tools/verify_balance_evidence_v01621.py'}
    for folder in ('source','server','tools'):
        paths.extend(p.relative_to(ROOT) for p in (ROOT/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.pyc' and 'node_modules' not in p.parts and p.relative_to(ROOT).as_posix() not in excluded)
    return [fingerprint(p) for p in sorted(set(paths))]
def diff(a,b):
    a={r['path']:r for r in a};b={r['path']:r for r in b}
    return [{'path':p,'before':a.get(p),'after':b.get(p)} for p in sorted(set(a)|set(b)) if a.get(p)!=b.get(p)]
def logcheck(folder,row):
    raw=gzip.decompress((folder/row['log']).read_bytes())
    return len(raw)==row['logBytes'] and hashlib.sha256(raw).hexdigest()==row['logSha256']
mode=sys.argv[1] if len(sys.argv)>1 else 'original'
assert mode in ('original','final')
plan=read(OUT/'finalized_plan.json');results=read(OUT/'results.json');summary=read(OUT/'summary.json')
assert summary['complete'] and len(results)==len(plan['tests'])==36
pergate=[read(p) for p in sorted((OUT/'per_gate').glob('*.json'))]
assert pergate==results
rawerrors=[row['test'] for row in results if not logcheck(OUT,row)]
journal=[json.loads(line) for line in (OUT/'journal.jsonl').read_text().splitlines()]
assert sorted(journal,key=lambda x:x['index'])==pergate
before=read(OUT/'input_manifest.json')['files'];after=capture();drift=diff(before,after)
if mode=='original':
    (OUT/'input_manifest_after.json').write_text(json.dumps({'capturedAt':now(),'files':after},ensure_ascii=False,indent=2)+'\n')
else:
    (OUT/'current_input_manifest_after_correction.json').write_text(json.dumps({'capturedAt':now(),'files':after},ensure_ascii=False,indent=2)+'\n')
dependencies=[]
for name in ('prebuild_product_manifest.json','supplemental_dependency_manifest.json','end_dependency_manifest.json'):
    original=read(OUT/name)['files'];current=[fingerprint(Path(r['path'])) for r in original]
    dependencies.append({'manifest':name,'files':len(original),'drift':diff(original,current)})
build=read(OUT/'build/results.json');assert len(build)==4
assert all(logcheck(OUT/'build',r) for r in build)
parity=read(OUT/'build/parity_raw.json');checks=parity['checks'];assert len(checks)==218
resources=[json.loads(line) for line in (OUT/'resource_journal.jsonl').read_text().splitlines()]
maxactive=max(r['active'] for r in resources);assert maxactive<=2
prior=OUT.parent/'final_protect_formation'
assert hashlib.sha256((prior/'MANIFEST.json').read_bytes()).hexdigest()=='d20aed3fa843a19c40a0ea96d8f772cbfe818c6c6c0a334bb9fcf4670834483a'
prior_manifest=read(prior/'MANIFEST.json')
old_rows=prior_manifest.get('files',[])
assert all(fingerprint((prior/Path(r['path'])).relative_to(ROOT))['sha256']==r['sha256'] for r in old_rows)
products=read(OUT/'prebuild_product_manifest.json')['files']+[fingerprint(Path('server/generated/engine.mjs'))]
result={'schemaVersion':1,'status':'completed_all_targeted_programs_passed' if all(r['ok'] for r in results) else 'completed_with_failures','verifiedAt':now(),'selectedPrograms':len(results),'passedPrograms':sum(r['ok'] for r in results),'failedPrograms':sum(not r['ok'] for r in results),'timeouts':sum(r['timedOut'] for r in results),'signals':sum(r['returnCode'] is not None and r['returnCode']<0 for r in results),'allRegistered181ProgramsRetested':False,'initialInputFiles':len(before),'inputDrift':drift,'dependencyChecks':dependencies,'rawLogsVerified':len(results),'rawLogErrors':rawerrors,'perGateMatchesResults':pergate==results,'originalJournalLines':len(journal),'originalJournalMatchesPerGate':True,'buildProgramsPassed':sum(r['ok'] for r in build),'buildRawLogsVerified':len(build),'threeEngineChecks':len(checks),'threeEnginePassed':sum(c['passed'] for c in checks),'nativeWorkersMaximumObserved':maxactive,'memoryPeakBytes':summary['peakMemoryCurrentBytesThisSession'],'originalCandidatePreserved':{'folder':'..','programs':35,'passed':32,'failed':3,'notRewritten':True},'priorSealedCandidatePreserved':{'folder':'../final_protect_formation','programs':36,'passed':36,'failed':0,'manifestSha256':hashlib.sha256((prior/'MANIFEST.json').read_bytes()).hexdigest(),'allManifestRowsVerified':len(old_rows),'notRewritten':True},'historicalInputGaps':plan['historicalInputGapsCarriedFromV01621'],'engineProvenance':{k:parity['provenance'][k] for k in ['engineVersion','engineFingerprint','recomputedEngineFingerprint','serverBuild','serverEngine','browserRelease']},'productSha256':{r['path']:r['sha256'] for r in products}}
result['transientApprovedQaEvent']=read(OUT/'transient_approved_qa_event.json')
assert not rawerrors and all(r['ok'] for r in build) and all(c['passed'] for c in checks)
failed=[r for r in results if not r['ok']]
assert len(failed)==1 and failed[0]['test']=='tests/test_ascension_efficiency_v01613.cjs'
assert failed[0]['logSha256']=='cfddefb5b6b5bc57f7858ab1af97b991dc3ae421ec03e1b48f1fdeecc2c756c5'
assert result['passedPrograms']==35 and result['failedPrograms']==1
if mode=='original':
    assert not drift and all(not d['drift'] for d in dependencies)
    result['status']='original_frozen36_completed_35pass_1_stale_expectation_fail'
    result['failureReason']='Lv55 first-three shared bonus receipt is actual1932x2=3864; old1843x2=3686 QA literal remained. No product mutation.'
    target=OUT/'original_run_verification.json'
else:
    correction=read(OUT/'qa_correction/approval_and_delta.json')
    assert len(drift)==1 and drift[0]['path']==correction['test']
    assert drift[0]['before']['sha256']==correction['beforeSha256'] and drift[0]['after']['sha256']==correction['afterSha256']
    assert not dependencies[0]['drift'] and not dependencies[2]['drift']
    assert len(dependencies[1]['drift'])==1 and dependencies[1]['drift'][0]['path']==correction['test']
    recheck=read(OUT/'qa_correction/recheck/result.json')
    assert recheck['ok'] and logcheck(OUT/'qa_correction/recheck',recheck)
    recheck_before=read(OUT/'qa_correction/recheck/input_manifest.json')['files']
    recheck_after=read(OUT/'qa_correction/recheck/input_manifest_after.json')['files']
    assert recheck_before==after==recheck_after
    original=read(OUT/'original_run_verification.json')
    assert not original['inputDrift'] and original['passedPrograms']==35 and original['failedPrograms']==1
    result['status']='effective_current36_pass_original35pass1fail_plus_approved_qa_recheck1pass'
    result['originalFrozenRun']={'selectedPrograms':36,'passed':35,'failed':1,'inputDrift':original['inputDrift'],'notRewritten':True}
    result['correctedProgramRechecks']={'programs':1,'passed':1,'failed':0,'rawLogsVerified':1,'inputFiles':len(recheck_before),'inputDrift':[],'contractsPassed':recheck['contractsPassed'],'nativeBothRoutesIncluded':True,'test':correction['test'],'sha256':correction['afterSha256']}
    result['effectiveDistinctPrograms']=36;result['effectiveCurrentCoveragePassed']=36
    result['approvedQaDrift']=drift;result['unexpectedDrift']=[]
    result['originalInputDrift']=original['inputDrift']
    result['originalDependencyChecks']=original['dependencyChecks']
    result['fresh36AllPassedClaim']=False
    result['qaCorrection']=correction
    target=OUT/'final_verification.json'
target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['status','selectedPrograms','passedPrograms','failedPrograms','initialInputFiles','threeEngineChecks','threeEnginePassed','nativeWorkersMaximumObserved','memoryPeakBytes']},ensure_ascii=False))
