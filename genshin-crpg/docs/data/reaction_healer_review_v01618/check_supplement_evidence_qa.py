import os
from pathlib import Path
import json,gzip,hashlib,collections,datetime,math
ROOT=Path(os.environ.get('CRPG_AUDIT_ROOT', Path(__file__).resolve().parents[3]))
OUT=Path(__file__).resolve().parent
paths=[OUT/'barbara_late'/name for name in ['native.json.gz','native_lower.json.gz','native_middle.json.gz']]
def read(p):
 with (gzip.open(p,'rt') if str(p).endswith('.gz') else open(p)) as f:return json.load(f)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def state(p):
 p=Path(p);return {'mtime':p.stat().st_mtime,'bytes':p.stat().st_size,'sha256':sha(p)}
before={str(p):state(p) for p in paths}
preservedPaths=[OUT/'healer_candidates/candidate_summary.json',OUT/'healer_candidates/candidate_native.json.gz',OUT/'healer_candidates/candidate_manifest.json',OUT/'evidence_qa.json']
preservedBefore={str(p):state(p) for p in preservedPaths}
base=read(preservedPaths[1]); previous=read(OUT/'evidence_qa.json')
prior=read(OUT/'baseline/source_before.json')
current={p:sha(ROOT/p) for p in prior}
changed={p:{'previous':prior[p],'current':current[p]} for p in prior if prior[p]!=current[p]}
caps={r['level']:r['cap'] for r in read(OUT/'legal_caps_qa.json')}
owner={'Jean':'MOND_JEAN','Barbara':'MOND_BARBARA','Sucrose':'MOND_SUCROSE'}
def key(r):return (r['candidate'],r['level'],r['kind'],r['key'],r['support'],r['seed'],r['equipment'][0]['enhance'],tuple(sorted(r['talents'][owner[r['support']]].items())),r['recoveryPolicy'])
counts=[];rows=[];mismatch=[];sourceChecks=[];healingLogMismatch=[];illegal=[];healRequestMismatch=[];endpoints=[]
for p in paths:
 d=read(p); c=d['candidate']; errors=d['errors']; rr=d['rows'];rows+=rr
 stats={'file':p.name,'candidate':c,'conditions':len(rr),'mainFights':sum(len(r['battles']) for r in rr),'wins':sum(r['wins'] for r in rr),'losses':sum(r['losses'] for r in rr),'koEvents':sum(r['mainKoEvents'] for r in rr),'executionErrors':errors,'fingerprint':d['fingerprint'],'actualSupportTalents':sorted({(r['level'],tuple(sorted(r['talents'][owner[r['support']]].items()))) for r in rr})}
 counts.append(stats)
 for file in sorted({s['file'] for s in d['substitutions']}):
  orig=(ROOT/'source'/file).read_text(); altered=orig; exact=[]
  for sub in d['substitutions']:
   if sub['file']==file:exact.append(altered.count(sub['from']));altered=altered.replace(sub['from'],sub['to'])
  sourceChecks.append({'candidate':c['name'],'file':file,'replacementMatchCounts':exact,'allExactlyOne':all(n==1 for n in exact),'originalSHA256':hashlib.sha256(orig.encode()).hexdigest(),'independentlyReconstructedVMSourceSHA256':hashlib.sha256(altered.encode()).hexdigest(),'jeanNumericFormulasPreserved':c['jeanQ']==1.2 and c['jeanField']==.35})
 for r in rr:
  ident={'candidate':r['candidate'],'level':r['level'],'kind':r['kind'],'seed':r['seed']}
  if any(t>caps[r['level']] for a in r['talents'].values() for t in a.values()):illegal.append(ident)
  if r['wins']!=sum(b['win'] for b in r['battles']) or r['losses']!=sum(not b['win'] for b in r['battles']):mismatch.append({**ident,'field':'wins/losses'})
  if r['mainKoEvents']!=sum(b['koEvents'] for b in r['battles']):mismatch.append({**ident,'field':'KO'})
  if r['mainEffectiveHealing']!=sum(b['effectiveHealing'] for b in r['battles']):mismatch.append({**ident,'field':'mainEffectiveHealing'})
  for b in r['battles']:
   if b['effectiveHealing']!=sum(h['effective'] for h in b['heals']):mismatch.append({**ident,'battle':b['number'],'field':'heal request sum'})
   if b['effectiveHealing']!=b['healingBeforeReward']:healingLogMismatch.append({**ident,'battle':b['number'],'hook':b['effectiveHealing'],'log':b['healingBeforeReward']})
   caster=next(a for a in b['initial'] if a['source']=='MOND_BARBARA')
   expected=[caster['maxHp']*c['barbaraQ'],caster['maxHp']*c['barbaraE']]
   for h in b['heals']:
    if h['source']=='바바라' and not any(math.isclose(h['requestedBeforeModifiers'],x,rel_tol=1e-10,abs_tol=1e-8) for x in expected):healRequestMismatch.append({**ident,'battle':b['number'],'request':h['requestedBeforeModifiers'],'expectedQorE':expected})
  comparable=r['lodgingMora'] if not r.get('finalRecoveryFailure') and r.get('endpoint',{}).get('allFullHp') else None
  endpoints.append({**ident,'mainWins':r['wins'],'mainLosses':r['losses'],'mainKoEvents':r['mainKoEvents'],'lodgingMora':r['lodgingMora'],'innCostComparable':comparable,'recoveryFailure':r.get('finalRecoveryFailure'),'fullEndpoint':r.get('endpoint',{}).get('allFullHp',False),'afterMainHpRatio':r['afterMainHpRatio'],'mainSeconds':r['mainSeconds'],'totalSeconds':r['totalSeconds']})
ct=collections.Counter(key(r) for r in rows)
allct=collections.Counter(key(r) for r in base['rows']+rows)
totals={'executions':len(rows),'uniqueConditions':len(ct),'mainFights':sum(len(r['battles']) for r in rows),'wins':sum(r['wins'] for r in rows),'losses':sum(r['losses'] for r in rows),'koEvents':sum(r['mainKoEvents'] for r in rows),'executionErrors':sum(len(c['executionErrors']) for c in counts),'failedEndpoints':sum(r['innCostComparable'] is None for r in endpoints)}
after={str(p):state(p) for p in paths};preservedAfter={str(p):state(p) for p in preservedPaths}
qa={'checkedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceCommit':'1e1b2442b53d42873d29556898f5f612d52d0c7a','reviewOnly':True,'inputsBefore':before,'inputsAfter':after,'inputsStableDuringCheck':before==after,'base438FilesAndQAPreserved':preservedBefore==preservedAfter,'productSourceAndDB233':{'count':len(current),'allUnchanged':not changed,'changed':changed},'datasets':counts,'supplementTotals':totals,'wholeHealerExecutionTotals':{'executions':len(base['rows'])+len(rows),'uniqueConditions':len(allct),'mainFights':sum(len(r['battles']) for r in base['rows']+rows),'wins':sum(r['wins'] for r in base['rows']+rows),'losses':sum(r['losses'] for r in base['rows']+rows)},'supplementDuplicates':[str(k) for k,n in ct.items() if n>1],'overlapWithBaseConditions':[str(k) for k in ct if k in {key(r) for r in base['rows']}],'sourceSubstitutions':sourceChecks,'aggregationMismatches':mismatch,'healingHookVsNativeLogMismatches':healingLogMismatch,'illegalTalentConditions':illegal,'rawRequestMatchesCandidateCoefficients':not healRequestMismatch,'rawRequestCoefficientMismatches':healRequestMismatch,'endpoints':endpoints,'interpretation':['Supplement native heal request values are unmodified-input quantities; they are checked only against candidate caster HP coefficients, not compared with final nominal/healed totals.','All24 conditions are late-level material domains, support Barbara, +6 gear, actual talents5 at50 and6 at60, two seeds. They do not validate these lower coefficients at levels10–40 or all equipment/compositions.','Jean formulas preserve numeric coefficients1.2 and0.35; formatting0.35 instead of.35 is semantically equivalent.','KO events are separate from campaign victory. Q0.03/E0.01 can still record8wins while party members were knocked out.']}
Path(os.environ.get('CRPG_AUDIT_QA_OUT', OUT/'recomputed_supplement_evidence_qa.json')).write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'inputsStable':qa['inputsStableDuringCheck'],'base438AndQAPreserved':qa['base438FilesAndQAPreserved'],'product233Unchanged':not changed,'supplement':totals,'wholeHealer':qa['wholeHealerExecutionTotals'],'aggregateMismatchCount':len(mismatch),'nativeHealingMismatchCount':len(healingLogMismatch),'rawRequestMismatchCount':len(healRequestMismatch),'output':str(Path(os.environ.get('CRPG_AUDIT_QA_OUT', OUT/'recomputed_supplement_evidence_qa.json')))},ensure_ascii=False))
