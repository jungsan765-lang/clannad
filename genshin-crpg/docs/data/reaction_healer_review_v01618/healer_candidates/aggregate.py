import os
from pathlib import Path
import json,gzip,hashlib,csv
out=Path(os.environ.get('CRPG_AUDIT_DATA', Path(__file__).resolve().parent));root=Path(os.environ.get('CRPG_AUDIT_ROOT', Path(__file__).resolve().parents[4]))
groups=[];rows=[];errors=[]
for file in sorted(out.glob('*.result.json')):
 data=json.loads(file.read_text()); groups.append({'file':file.name,'fingerprint':data['fingerprint'],'candidate':data['candidate'],'substitutions':data['substitutions'],'rows':len(data['rows']),'errors':data['errors']})
 for r in data['rows']: r['rawFile']=file.name;rows.append(r)
 errors+=data['errors']
compact=[]
for r in rows:
 ups=[d for b in r['battles'] for d in b['rewardHpDelta'] if d['levelAfter']>d['levelBefore']]
 nonups=[d for b in r['battles'] for d in b['rewardHpDelta'] if d['levelAfter']==d['levelBefore'] and d['delta'] and d['delta']>0]
 failures=r.get('finalRecoveryFailure')
 endpoint=r.get('endpoint') or {}
 inns=[e for rec in r['recoveries'] for e in rec.get('events',[]) if e['type']=='INN']
 road=[e for rec in r['recoveries'] for e in rec.get('events',[]) if e['type']=='TRAVEL_COMBAT']
 c={k:r.get(k) for k in ['candidate','level','kind','key','support','seed','enhance','talent','wins','losses','mainRounds','mainActions','mainSeconds','mainEffectiveHealing','mainAllyHpDamage','mainKoEvents','mainZeroHealCalls','afterMainHpRatio','lodgingMora','recoverySeconds','totalSeconds','stopReason','rawFile']}
 c.update({'battles':len(r['battles']),'effectiveEnhance':r['equipment'][0]['enhance'],'actualTalent':r['talents'][{'Jean':'MOND_JEAN','Barbara':'MOND_BARBARA','Sucrose':'MOND_SUCROSE'}[r['support']]],'allFourSurvivedEveryMainBattle':all(all(a['hp']>0 for a in b['beforeReward']) for b in r['battles']),'allFourFullEveryMainBattleAfterReward':all(all(a['hp']==a['maxHp'] for a in b['after']) for b in r['battles']),'fullMainEndCount':sum(all(a['hp']==a['maxHp'] for a in b['after']) for b in r['battles']),'levelUpEvents':len(ups),'levelUpHPGains':sum(max(0,d['delta']) for d in ups),'nonLevelRewardHPGains':sum(d['delta'] for d in nonups),'finalMainLevels':[a['level'] for a in r['afterMainHp']],'innBuyCount':len(inns),'recoveryFailure':failures,'finalFullHP':endpoint.get('allFullHp',False),'finalTravelFightCount':len(road),'finalTravelWins':sum(e['victory'] for e in road),'finalTravelLosses':sum(not e['victory'] for e in road),'innCostComparable':r['lodgingMora'] if not failures and endpoint.get('allFullHp') else None,'lastMainHp':r['afterMainHp']})
 compact.append(c)
prior=json.loads((Path(__file__).resolve().parent.parent/'baseline/source_before.json').read_text())
hashes={path:hashlib.sha256((root/path).read_bytes()).hexdigest() for path in prior}
differences={k:{'prior':prior[k],'now':v} for k,v in hashes.items() if v!=prior[k]}
vmSources={}
for g in groups:
 name=g['candidate']['name']
 if name in vmSources:continue
 vmSources[name]={'config':g['candidate'],'substitutions':g['substitutions'],'files':[]}
 for file in sorted({s['file'] for s in g['substitutions']}):
  original=(root/'source'/file).read_text();changed=original
  for sub in g['substitutions']:
   if sub['file']==file:
    assert changed.count(sub['from'])==1
    changed=changed.replace(sub['from'],sub['to'])
  dest=out/'vm_sources'/name/file;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(changed)
  vmSources[name]['files'].append({'path':str(dest.relative_to(out)),'originalProductSHA256':hashlib.sha256(original.encode()).hexdigest(),'VMSourceSHA256':hashlib.sha256(changed.encode()).hexdigest()})
assert not differences,differences
summary={'sourceCommit':'1e1b2442b53d42873d29556898f5f612d52d0c7a','auditOnly':True,'productOrServerChanged':False,'gameFilesVerified':len(hashes),'changedGameFiles':differences,'campaigns':len(rows),'nativeMainFights':sum(len(r['battles']) for r in rows),'mainWins':sum(r['wins'] for r in rows),'mainLosses':sum(r['losses'] for r in rows),'executionErrors':errors,'rows':compact,'candidateSources':vmSources,'limits':['Two seeds and one fixed party base: Traveler, Xiangling, Fischl, support. Not every possible party, artifact, constellation, stage-element or account.','Initial ownership/progression/gear are explicit diagnostic fixtures; native rewards, HP, XP, cooldowns, enemies, lodging, travel and time rules remain intact.','Inn cost zero is not proof of successful free recovery: normalize failed final recovery to innCostComparable null. Travel fights can heal missing HP before reaching inn.','Lv15 experience can cause levels and full-HP reward recovery. Separate post-reward gains and battle healing.','Formation adds combat-only HP to third actor, so effective healing can exceed same-battle HP damage; main healing metrics are actual Runtime.heal results, not assumed overheal.','Baseline fingerprint describes original loaded source and DB before VM substitutions; candidateSources records exact replacement source and modified VM source hashes.','All normal Q1.5 and talent healing multipliers, attack damage, AI, existing targets, fields duration, cooldown and XP/food/lodging rules preserved.','No desired lodging-saving percentage was forced. Safety, wins/KO, time and resources are separate outcomes.']}
(out/'candidate_summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
with gzip.open(out/'candidate_native.json.gz','wt',encoding='utf8') as f:json.dump({'groups':groups,'rows':rows},f,ensure_ascii=False,separators=(',',':'))
cols=[k for k,v in compact[0].items() if not isinstance(v,(dict,list))]
with (out/'candidate_conditions.csv').open('w',newline='') as f:
 writer=csv.DictWriter(f,fieldnames=cols,extrasaction='ignore');writer.writeheader();writer.writerows(compact)
manifest={'sourceCommit':summary['sourceCommit'],'gameFilesUnchanged':True,'gameFilesSHA256':hashes,'groups':groups,'candidateSources':vmSources,'sourceSnapshots':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in out.glob('*.cjs')},'artifacts':{name:hashlib.sha256((out/name).read_bytes()).hexdigest() for name in ['candidate_summary.json','candidate_native.json.gz','candidate_conditions.csv','isolated_jean.json']}}
(out/'candidate_manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:summary[k] for k in ['gameFilesVerified','changedGameFiles','campaigns','nativeMainFights','mainWins','mainLosses','executionErrors']},ensure_ascii=False))
