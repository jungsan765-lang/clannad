import os
from pathlib import Path
import json, gzip, hashlib, collections, math, datetime

ROOT = Path(os.environ.get('CRPG_AUDIT_ROOT', Path(__file__).resolve().parents[3]))
OUT = Path(__file__).resolve().parent
def read(path):
    path=Path(path)
    with (gzip.open(path, 'rt') if path.suffix == '.gz' else path.open()) as file:
        return json.load(file)
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def describe(path):
    path=Path(path)
    return {'path':str(path),'mtime':path.stat().st_mtime,'bytes':path.stat().st_size,'sha256':sha(path)}
checks={}; notes=[]
prior=read(OUT/'baseline/source_before.json')
current={name:sha(ROOT/name) for name in prior}
changed={name:{'before':prior[name],'current':current[name]} for name in prior if current[name] != prior[name]}
checks['product233']={'count':len(current),'equal':not changed,'changes':changed}
paths=[OUT/'healer_candidates/candidate_summary.json',OUT/'healer_candidates/candidate_native.json.gz',OUT/'healer_candidates/candidate_manifest.json',OUT/'native_roles/native_roles.json.gz',OUT/'native_roles/summary.json',OUT/'native_roles/source_hashes.json',OUT/'dendro/campaign_summary.json',OUT/'dendro/campaign_native.json.gz']
inputsBefore={str(p):describe(p) for p in paths}
S=read(paths[0]); N=read(paths[1]); M=read(paths[2]); rows=N['rows']
counts={'campaigns':len(rows),'nativeMainFights':sum(len(r['battles']) for r in rows),'mainWins':sum(r['wins'] for r in rows),'mainLosses':sum(r['losses'] for r in rows),'executionErrors':[e for g in N['groups'] for e in g['errors']]}
checks['healerCounts']={'recomputed':counts,'summaryMatches':all(S[k]==v for k,v in counts.items()),'summaryRows':len(S['rows']),'nativeRows':len(rows),'groupRows':sum(g['rows'] for g in N['groups'])}
caps={r['level']:r['cap'] for r in read(OUT/'legal_caps_qa.json')}
owner={'Jean':'MOND_JEAN','Barbara':'MOND_BARBARA','Sucrose':'MOND_SUCROSE'}
conditions=collections.defaultdict(list); mismatch=[]; healingMismatch=[]; illegalTalents=[]
for r in rows:
    actual=r['talents'][owner[r['support']]]
    key=(r['candidate'],r['level'],r['kind'],r['key'],r['support'],r['seed'],r['equipment'][0]['enhance'],tuple(sorted(actual.items())),r['recoveryPolicy'])
    conditions[key].append(r['rawFile'])
    if any(t>caps[r['level']] for a in r['talents'].values() for t in a.values()): illegalTalents.append(key)
    for b in r['battles']:
        if b['effectiveHealing']!=b['healingBeforeReward']: healingMismatch.append({'key':str(key),'battle':b['number'],'hooks':b['effectiveHealing'],'log':b['healingBeforeReward']})
        if b['effectiveHealing'] != sum(e['effective'] for e in b['heals']): mismatch.append({'key':str(key),'battle':b['number'],'field':'healing sum'})
    if r['wins'] != sum(b['win'] for b in r['battles']) or r['losses'] != sum(not b['win'] for b in r['battles']): mismatch.append({'key':str(key),'field':'wins/losses'})
    if r['mainEffectiveHealing'] != sum(b['effectiveHealing'] for b in r['battles']): mismatch.append({'key':str(key),'field':'campaign healing'})
uniqueRows=[]
seen=set()
for r in rows:
    actual=r['talents'][owner[r['support']]]
    key=(r['candidate'],r['level'],r['kind'],r['key'],r['support'],r['seed'],r['equipment'][0]['enhance'],tuple(sorted(actual.items())),r['recoveryPolicy'])
    if key not in seen: uniqueRows.append(r); seen.add(key)
checks['healerConditions']={'rows':len(rows),'unique':len(conditions),'uniqueExecutionTotals':{'mainFights':sum(len(r['battles']) for r in uniqueRows),'wins':sum(r['wins'] for r in uniqueRows),'losses':sum(r['losses'] for r in uniqueRows)},'duplicates':[{'key':str(k),'files':v} for k,v in conditions.items() if len(v)>1],'battleOrCampaignAggregationMismatch':mismatch,'hookVsNativeHealingLogMismatch':healingMismatch,'illegalTalentConditions':list(map(str,illegalTalents)),'legalCapsIndependentlyLoaded':caps}
recovery=[]; exclusions=[]
for r in S['rows']:
    should=r['lodgingMora'] if not r['recoveryFailure'] and r['finalFullHP'] else None
    if r['innCostComparable'] != should: recovery.append({k:r[k] for k in ['rawFile','candidate','level','support','seed','wins','losses','innCostComparable','recoveryFailure']})
    if r['innCostComparable'] is None: exclusions.append({k:r[k] for k in ['rawFile','candidate','level','support','seed','wins','losses','lodgingMora','innCostComparable','recoveryFailure']})
checks['healerInnComparison']={'incorrectComparableValues':recovery,'excludedCount':len(exclusions),'excludedWithMainLoss':sum(r['losses']>0 for r in exclusions),'excludedWithoutMainLoss':[r for r in exclusions if r['losses']==0],'comparableZeroCount':sum(r['innCostComparable']==0 for r in S['rows']),'excludeFailedZeroAsFreeRecovery':not recovery}
subChecks=[]
for name, c in S['candidateSources'].items():
    for f in c['files']:
        original=(ROOT/'source'/Path(f['path']).name).read_text(); vm=original; exact=[]
        for replacement in c['substitutions']:
            if replacement['file']!=Path(f['path']).name: continue
            count=vm.count(replacement['from']); exact.append(count)
            vm=vm.replace(replacement['from'],replacement['to'])
        digest=hashlib.sha256(vm.encode()).hexdigest()
        snapshot=OUT/'healer_candidates'/f['path']
        subChecks.append({'candidate':name,'file':f['path'],'eachReplacementExactlyOne':all(n==1 for n in exact),'originalHashMatches':hashlib.sha256(original.encode()).hexdigest()==f['originalProductSHA256'],'reconstructedVMHashMatches':digest==f['VMSourceSHA256'],'snapshotHashMatches':sha(snapshot)==digest})
checks['healerCandidateSubstitutions']={'files':len(subChecks),'allPass':all(all(v for k,v in r.items() if k not in ['candidate','file']) for r in subChecks),'details':subChecks,'manifestGameHashesMatch233':M['gameFilesSHA256']==current}
R=read(OUT/'native_roles/native_roles.json.gz'); RS=read(OUT/'native_roles/summary.json'); RH=read(OUT/'native_roles/source_hashes.json')
rcount={'normalized_packet_rows':len(R['rows']),'superconduct_two_round_sequences':len(R['physicalComparisons']),'electrocharged_timelines':len(R['ecTimelines']),'crystal_absorption_sequences':len(R['crystal']),'freeze_melt_shatter_class_sequences':len(R['freeze'])}
checks['nativeRoleCounts']={'actual':rcount,'summaryMatches':rcount==RS['counts'],'sourceSubsetCount':len(R['sourcesBefore']),'sourceBeforeAfterEqual':R['sourcesBefore']==R['sourcesAfter']==RH['before']==RH['after'],'currentSubsetMatches':all(sha(ROOT/'source'/k)==v for k,v in R['sourcesBefore'].items())}
ec=[]
for level in [10,20,40,60]:
    for n in [1,4]:
        pair=[r for r in R['ecTimelines'] if r['level']==level and r['n']==n]
        root=pair[0]; tick=math.floor(root['base']*1.2+.5); expected=tick*(3+2*(n-1))
        ec.append({'level':level,'targets':n,'expectedRoundedTotal':expected,'baselineTotal':pair[0]['total'],'candidateTotal':pair[1]['total'],'match':all(r['total']==expected==sum(p['damage'] for p in r['phases']) for r in pair),'baselineImmediate':pair[0]['phases'][0]['damage'],'candidateImmediate':pair[1]['phases'][0]['damage']})
checks['nativeElectrochargedBudget']={'allPass':all(r['match'] for r in ec),'cases':ec,'scope':'single isolated application only; not repeat application, ownership replacement, player restore, revive, or campaign validation'}
requested=sorted({(r['level'],r['talent']) for r in R['rows']})
checks['nativeRoleTalentLabels']={'requestedVsStored':[{'level':level,'reportedRequestedTalent':talent,'actualStoredTalent':min(talent,caps[level])} for level,talent in requested],'mislabeledRowsCount':sum(r['talent']>caps[r['level']] for r in R['rows'])}
DN=read(OUT/'dendro/campaign_native.json.gz'); DS=read(OUT/'dendro/campaign_summary.json')
datasets=DN['datasets']; allrows=[]; baseRows=[]; dendroErrors=[]; dkeys=collections.Counter(); nativeBattles=0; badInns=[]; stats=[]
for d in datasets:
    stats.append({'mode':d['mode'],'level':d['level'],'variant':d.get('variant',False),'conditions':len(d['rows']),'errors':len(d['errors'])})
    dendroErrors+=d['errors']
    for r in d['rows']:
        allrows.append(r)
        if not d.get('variant',False):baseRows.append(r)
        dkeys[(d['mode'],d['level'],d.get('variant',False),r['name'],tuple(r['team']),r['seed'],r['domain'],r['enhance'],r['talent'])]+=1
        nativeBattles+=len(r['reactionBattles'])
        if r['stopReason']!='RUNS_COMPLETED' and r['lodgingMora']==0:badInns.append({'level':r['level'],'mode':d['mode'],'name':r['name'],'seed':r['seed'],'wins':r['wins'],'losses':r['losses'],'stopReason':r['stopReason'],'endpoint':r.get('endpoint'),'zeroNotComparable':True})
def total(rr):return {'conditions':len(rr),'mainBattles':sum(len(r['battles']) for r in rr),'wins':sum(r['wins'] for r in rr),'losses':sum(r['losses'] for r in rr)}
baseTotals=total(baseRows);allTotals=total(allrows);allTotals['allActualMainAndTravelBattles']=nativeBattles
checks['dendroCounts']={'datasets':stats,'baseRecomputed':baseTotals,'baseSummaryMatches':baseTotals=={'conditions':DS['totalConditions'],'mainBattles':DS['totalDomainBattles'],'wins':DS['wins'],'losses':DS['losses']},'allRecomputed':allTotals,'allSummaryMatches':allTotals==DS['totalIncludingVariants'],'executionErrors':dendroErrors,'uniqueConditions':len(dkeys),'duplicates':[str(k) for k,n in dkeys.items() if n>1],'failedZeroCostConditionsExcludedFromEconomy':badInns}
original=(ROOT/'source/runtime_rules.js').read_text()
dendroReplacements=[
 ("if(rx?.[17]==='ADDITIVE')raw+=this.reactionBase(a)*Number(rx[7]);", "if(rx?.[17]==='ADDITIVE'){const tk=a.side==='ALLY'&&this.premiumHitKind?.(a,o),tm=tk?this.premiumTalentMultiplier(a,tk):1;raw+=this.reactionBase(a)*Number(rx[7])/tm;}"),
 ("b.log.push({actor:a.name,target:t.name,reaction:rx[0],reactionName:rx[1],text:rx[1]+' 반응'});", "if(st(t,'STATUS_BURN')&&!this.auraList(t).some(x=>x.element==='불'))t.statuses=t.statuses.filter(x=>x.id!=='STATUS_BURN');b.log.push({actor:a.name,target:t.name,reaction:rx[0],reactionName:rx[1],text:rx[1]+' 반응'});"),
 ("b.fields.push(f);return f;};", "b.fields.push(f);if(kind==='DENDRO_CORE'){const live=b.fields.filter(x=>x.kind==='DENDRO_CORE'&&!x.done);if(live.length>5)this.detonateCombatObject(live[0]);}return f;};")
]
modified=original; replacementCounts=[]
for old,new in dendroReplacements:
    replacementCounts.append(modified.count(old));modified=modified.replace(old,new)
DP=read(OUT/'dendro/probe.json')
checks['dendroCandidateSubstitutions']={'exactOriginalMatchCounts':replacementCounts,'allExactlyOne':all(n==1 for n in replacementCounts),'originalSHA256':hashlib.sha256(original.encode()).hexdigest(),'independentlyReconstructedVMRuntimeRulesSHA256':hashlib.sha256(modified.encode()).hexdigest(),'reportedReplacements':DP['sourceFingerprints'],'probeNativeDifferenceConfirmed':all(r['sixCores']['live']==(6 if r['mode']=='baseline' else 5) and any(s['id']=='STATUS_BURN' for s in r['burningExtinguish']['after']['statuses'])==(r['mode']=='baseline') for r in DP['rows'])}
notes += [
 'native_roles rows.talent is a requested input, not actual stored talent. Lv20 craft input3 clamps to legal2; 22 Lv20 normalized rows are labeled with requested talent3. Healer actualTalent fields are actual stored values.',
 'native reaction packet fixtures inflate enemy HP to 10,000,000 and suppress variance; they verify mechanics and budget, not real win rate or lodging burden.',
 'Dendro mainCounts counts reactionName log entries, which may include sustained ticks and multiple targets; it is not a number of distinct reaction applications or skill casts.',
 'Dendro damage for amplifying/additive reactions is the full amplified/additive hit, not solely incremental reaction damage; do not compare it directly against separate transformative packets.',
 'Healer mainSeconds excludes travel. Compare successful same-length runs with totalSeconds and innCostComparable; no-intermediate-inn wipe campaigns are shorter and must not be advertised as fast/free.',
 'Native recovery road fights can heal, injure, kill, or level actors before the inn. Final inn cost need not equal HP loss immediately after the last domain fight.',
 'Lv15 reward level-ups and Player10% post-victory recovery are explicitly counted separately from skill healing. Formation third-slot combat-only HP is clipped after battle.',
 'Candidate coefficients are VM-only and product233 current hashes match previous source snapshot. No server deployment is independently asserted by file hashes.',
 'Canonical coefficients cannot be directly transplanted into CRPG without comparison because CRPG reactionBase uses the HP-growth curve and current transformative packets bypass enemy DEF differently from primary hits.'
]
inputsAfter={str(p):describe(p) for p in paths}
qa={'checkedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceCommit':'1e1b2442b53d42873d29556898f5f612d52d0c7a','readOnlyProduct':True,'inputsBefore':inputsBefore,'inputsStableDuringCheck':inputsBefore==inputsAfter,'inputsAfter':inputsAfter,'checks':checks,'interpretationWarnings':notes}
Path(os.environ.get('CRPG_AUDIT_QA_OUT', OUT/'recomputed_evidence_qa.json')).write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'inputsStable':qa['inputsStableDuringCheck'],'product233Equal':checks['product233']['equal'],'healerCounts':counts,'healerUnique':len(conditions),'nativeTalentMislabels':checks['nativeRoleTalentLabels']['mislabeledRowsCount'],'dendroCounts':allTotals,'output':str(Path(os.environ.get('CRPG_AUDIT_QA_OUT', OUT/'recomputed_evidence_qa.json')))},ensure_ascii=False))
