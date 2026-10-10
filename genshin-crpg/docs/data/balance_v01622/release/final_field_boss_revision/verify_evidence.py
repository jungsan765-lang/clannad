#!/usr/bin/env python3
"""Recheck final field-boss proof without changing sealed earlier candidates."""
from pathlib import Path
import ast,datetime,gzip,hashlib,json
ROOT=Path('/workspace/scratch/a62414469990/crpg-v01618-work/genshin-crpg')
OUT=ROOT/'docs/data/balance_v01622/release/final_field_boss_revision'
def read(p):return json.loads(p.read_text())
def sha(b):return hashlib.sha256(b).hexdigest()
def fingerprint(p):
 raw=(ROOT/p).read_bytes();return {'path':p,'bytes':len(raw),'sha256':sha(raw)}
def diff(a,b):
 a={r['path']:r for r in a};b={r['path']:r for r in b};return [{'path':k,'before':a.get(k),'after':b.get(k)} for k in sorted(a.keys()|b.keys()) if a.get(k)!=b.get(k)]
def logcheck(folder,row):
 raw=gzip.decompress((folder/row['log']).read_bytes());assert len(raw)==row['logBytes'] and sha(raw)==row['logSha256'];return True
def unchanged_manifest(name):
 before=read(OUT/name)['files'];after=[fingerprint(r['path']) for r in before];d=diff(before,after)
 if name=='supplemental_dependency_manifest.json':
  assert len(d)==1 and d[0]['path']==correction['test'] and d[0]['before']['sha256']==correction['beforeSha256'] and d[0]['after']['sha256']==correction['afterSha256']
 else:assert not d,(name,d)
 return {'manifest':name,'files':len(before),'drift':d}
plan=read(OUT/'finalized_plan.json');results=read(OUT/'results.json');summary=read(OUT/'summary.json');assert summary['complete'] and len(results)==len(plan['tests'])==11
per=[read(p) for p in sorted((OUT/'per_gate').glob('*.json'))];assert per==results
journal=[json.loads(x) for x in (OUT/'journal.jsonl').read_text().splitlines()];assert sorted(journal,key=lambda r:r['index'])==per
assert sum(r['ok'] for r in results)==10 and all(not r['timedOut'] for r in results)
failed=[r for r in results if not r['ok']];assert len(failed)==1 and failed[0]['test']=='tests/test_combat_boundaries_v0168.cjs'
assert failed[0]['logSha256']=='1ce1727e33f13fc50cd23b1fb2b0b11c7fdf89f981a0c68d5737f3bc3be9f22b'
correction=read(OUT/'qa_correction/approval_and_delta.json')
recheck=read(OUT/'qa_correction/recheck/run_result.json');assert recheck['ok'] and logcheck(OUT/'qa_correction/recheck',recheck)
original=read(OUT/'original_run_verification.json');assert original['passedPrograms']==10 and original['failedPrograms']==1 and not original['inputDrift']
assert all(logcheck(OUT,r) for r in results)
before=read(OUT/'input_manifest.json')['files'];after=[fingerprint(r['path']) for r in before];drift=diff(before,after);assert len(drift)==1 and drift[0]['path']==correction['test'] and drift[0]['before']['sha256']==correction['beforeSha256'] and drift[0]['after']['sha256']==correction['afterSha256']
(OUT/'input_manifest_after.json').write_text(json.dumps({'verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':after},ensure_ascii=False,indent=2)+'\n')
deps=[unchanged_manifest(n) for n in ('prebuild_product_manifest.json','supplemental_dependency_manifest.json')]
build=read(OUT/'build/results.json');assert len(build)==4 and all(r['ok'] for r in build);assert all(logcheck(OUT/'build',r) for r in build)
parity=read(OUT/'build/parity_raw.json');assert parity['passed'] and len(parity['checks'])==218 and all(r['passed'] for r in parity['checks']);assert parity['counts']['passed']==218 and parity['counts']['failed']==0
assert len(parity['provenance']['browserRuntimeFiles'])==119
strategy=read(OUT/'strategy_three_engines/summary.json');assert strategy['engines']==3 and strategy['programRuns']==3 and strategy['contracts']==strategy['passed']==54 and strategy['failed']==0
strategy_run=read(OUT/'strategy_three_engines/run_result.json');assert strategy_run['ok'] and logcheck(OUT/'strategy_three_engines',strategy_run)
strategy_before=read(OUT/'strategy_three_engines/input_before.json')['files'];strategy_after=read(OUT/'strategy_three_engines/input_after.json')['files'];assert not diff(strategy_before,strategy_after);strategy_current_diff=diff(strategy_after,[fingerprint(r['path']) for r in strategy_after]);assert len(strategy_current_diff)==1 and strategy_current_diff[0]['path']==correction['test'] and strategy_current_diff[0]['after']['sha256']==correction['afterSha256']
recheck_before=read(OUT/'qa_correction/recheck/input_before.json')['files'];recheck_after=read(OUT/'qa_correction/recheck/input_after.json')['files'];assert recheck_before==recheck_after==after
for row in strategy['rows']:
 raw=(OUT/'strategy_three_engines'/row['output']).read_bytes();gz=gzip.decompress((OUT/'strategy_three_engines'/(row['output']+'.gz')).read_bytes());assert raw==gz and len(raw)==row['outputBytes'] and sha(raw)==row['outputSha256'];assert row['contracts']==row['passed']==18 and row['failed']==0 and not row['dbObjectChanged'];assert len(row['newRepeatRevivalContracts'])==4 and all(c['passed'] and c['revived']==2 and c['successAfterThirdCore'] for c in row['newRepeatRevivalContracts'])
assert strategy['engineFingerprint']==parity['provenance']['engineFingerprint'];assert strategy['sourceProductSHA256']=='dab1e585bf696116d05affbcc1ceb58420d5fc23144ca0ad85d7742f1dd4b04b'
resources=[json.loads(x) for x in (OUT/'resource_journal.jsonl').read_text().splitlines()];maxactive=max(r['active'] for r in resources);assert maxactive<=2
prior=[]
for folder,expected in [('final_cash_margin','6b7af58bd166be5aac3029aa5769fc8f849c34c475c08fd181a831ddd2518f4a'),('final_protect_formation','d20aed3fa843a19c40a0ea96d8f772cbfe818c6c6c0a334bb9fcf4670834483a')]:
 p=OUT.parent/folder;assert sha((p/'MANIFEST.json').read_bytes())==expected;rows=read(p/'MANIFEST.json')['files'];assert all(len((p/r['path']).read_bytes())==r['bytes'] and sha((p/r['path']).read_bytes())==r['sha256'] for r in rows);prior.append({'folder':'../'+folder,'manifestSha256':expected,'verifiedFiles':len(rows),'unchanged':True})
product_before=read(OUT/'before_product_manifest.json')['files'];product_final=read(OUT/'prebuild_product_manifest.json')['files'];authorized=diff(product_before,product_final);assert {r['path'] for r in authorized}=={'source/runtime_field_bosses.js','content/release-notes.json'}
finalqas=plan['confirmedFinalQASha256'];assert all(sha((ROOT/k).read_bytes())==v for k,v in finalqas.items())
registered=None
for node in ast.parse((ROOT/'tools/verify_release.py').read_text()).body:
 if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='TESTS' for t in node.targets):
  assert not any(isinstance(n,(ast.Call,ast.Attribute,ast.Lambda)) for n in ast.walk(node.value))
  registered=eval(compile(ast.Expression(node.value),'verify_release.py','eval'),{'__builtins__':{}},{})
  break
assert len(registered)==182 and all(t in registered for t in plan['tests'])
seven=['source/runtime_growth_v01522.js','source/runtime_rules.js','source/runtime_liyue.js','source/runtime_liyue_artifacts.js','source/runtime_combat.js','source/runtime_liyue_cards.js','source/runtime_field_bosses.js']
result={'schemaVersion':1,'status':'effective_current11_pass_original10pass1legacy_scope_fail_plus_approved_recheck1pass','verifiedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'selectedPrograms':11,'originalRunPassedPrograms':10,'originalRunFailedPrograms':1,'effectiveCurrentPassedPrograms':11,'effectiveCurrentFailedPrograms':0,'fresh11AllPassedClaim':False,'registeredPrograms':182,'allRegistered182ProgramsRetested':False,'earlier36ProgramsRetestedInThisFolder':False,'timeouts':0,'signals':0,'inputFiles':len(before),'originalInputDrift':original['inputDrift'],'approvedPostRunQaDrift':drift,'unexpectedInputDrift':[],'dependencyChecks':deps,'originalDependencyChecks':original['dependencyChecks'],'approvedQaCorrection':correction,'recheckPrograms':1,'recheckPassed':1,'recheckFailed':0,'recheckContractsPassed':recheck['contractsPassed'],'recheckInputFiles':len(recheck_before),'recheckInputDrift':[],'rawLogsVerified':len(results),'perGateMatchesResults':True,'originalJournalLines':len(journal),'originalJournalMatchesPerGate':True,'buildProgramsPassed':4,'buildRawLogsVerified':4,'generalThreeEngineChecks':218,'generalThreeEnginePassed':218,'generalParityScope':'Actual built119 runtime scripts / authored-clean DB / existing food, recovery and engine contracts. The218 count does not itself cover the new repeat-revival mechanics.','strategyThreeEngineProgramRuns':3,'strategyThreeEngineContracts':54,'strategyThreeEnginePassed':54,'strategyThreeEngineFailed':0,'strategyInputFiles':len(strategy_before),'strategyInputDrift':[],'strategyApprovedPostRunQaDrift':strategy_current_diff,'strategyRawLogsVerified':1,'strategyOutputReportsVerified':3,'strategyScope':strategy['scope'],'nativeWorkersMaximumObserved':maxactive,'memoryPeakBytes':summary['peakMemoryCurrentBytesThisSession'],'approvedProductDeltaFromSealedCashmargin':authorized,'approvedQAChanges':'Three legacy once-revival QA fixtures explicitly target2, boundary new marker3, new exact18contract gate registered182, fieldboss report argument added. See exact before/final copies and diffs.','ownerPreparationFailuresPreserved':['docs/data/balance_v01622/field_boss_strategy/first_preparation_failures.json','docs/data/balance_v01622/field_boss_strategy/guoba_preparation_failure.json'],'priorSealedCandidatesPreserved':prior,'historicalInputGaps':plan['historicalInputGapsCarriedFromV01621'],'historicalInputGapsRetested':False,'engineProvenance':{k:parity['provenance'][k] for k in ['engineVersion','engineFingerprint','recomputedEngineFingerprint','serverBuild','serverEngine','browserRelease']},'finalSevenProductSha256':{k:sha((ROOT/k).read_bytes()) for k in seven},'finalNotesSha256':sha((ROOT/'content/release-notes.json').read_bytes()),'qaRawDbSha256':sha((ROOT/'content/db.json').read_bytes()),'actualServerSha256':sha((ROOT/'server/generated/engine.mjs').read_bytes()),'selectedQASha256':{t:sha((ROOT/t).read_bytes()) for t in plan['tests']},'unverifiedClaims':['No actual graphical/mobile UI test in this folder.','No live server account execution or remote CI workflow completion verified here.','Oversized mechanic packets are boundary probes, not complete combat difficulty, winrate, farming-time or acquisition proofs.','No new claim that every first Lv55 party wins highest ascension tier.']}
(OUT/'final_verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['status','selectedPrograms','effectiveCurrentPassedPrograms','inputFiles','generalThreeEnginePassed','strategyThreeEnginePassed','strategyInputFiles','nativeWorkersMaximumObserved']},ensure_ascii=False))
