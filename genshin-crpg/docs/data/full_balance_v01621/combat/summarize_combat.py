#!/usr/bin/env python3
"""Derive exhaustive audit tables from the preserved native outputs; no product writes."""
from pathlib import Path
import collections,gzip,hashlib,json
p=Path(__file__).resolve().parent
read=lambda n:json.loads(gzip.decompress((p/n).read_bytes()) if n.endswith('.gz') else (p/n).read_bytes())
write=lambda n,d:(p/n).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
catalog=read('enemy_catalog_before.json');phases=read('enemy_phases_after.json');major=read('major_bosses_after.json');special=read('special_owners_after.json');bosses=read('boss_conditions_after.json');definitions=read('runtime_group_definitions_after.json')
refs=read('active_card_refs_after.json');cardmeta={c['id']:c for c in refs['cards']};monstermeta={m['id']:m for m in refs['monsterRefs']}
direct=collections.defaultdict(list);logs=collections.defaultdict(list);owners=collections.defaultdict(list)
for w in catalog['cardWitnesses']:
 if w['status']=='EXECUTED':direct[w['card']].append({'file':'enemy_catalog_before.json','group':w['group'],'scope':'isolated native executeCard'});owners[w['owner']].append({'file':'enemy_catalog_before.json','kind':'native card execution','card':w['card']})
for w in phases['cards']:direct[w['card']].append({'file':'enemy_phases_after.json','group':w['group'],'round':w['round'],'scope':'native combat executeCard'})
for row in phases['encounters']:
 for e in row['enemyEvents']:owners[e['source']].append({'file':'enemy_phases_after.json','group':row['group'],'kind':'native combat action','card':e['card']})
for row in major['conditions']:
 for e in row['events']:direct[e['card']].append({'file':'major_bosses_after.json','boss':row['spec']['boss'],'team':row['team']['name'],'round':e['round'],'scope':'native combat executeCard'});owners[e['owner']].append({'file':'major_bosses_after.json','kind':'native major-boss executeCard','card':e['card']})
 for e in (row.get('last') or {}).get('log',[]):
  if e.get('card'):logs[e['card']].append({'file':'major_bosses_after.json','boss':row['spec']['boss'],'team':row['team']['name'],'scope':'native log only; may be phase/passive, not executeCard'})
for row in special['cases']:
 for e in row['events']:owners[e['owner']].append({'file':'special_owners_after.json','case':row['spec']['name'],'kind':'isolated native basic hit' if row['spec'].get('isolated') else 'native story/boss damage','card':e.get('options',{}).get('card') if e.get('options') else None})
for row in bosses['rows']:
 for b in row['battles']:
  fb=b['receipt'].get('fieldBoss')
  if fb and fb.get('seen'):owners[fb['boss']].append({'file':'boss_conditions_after.json','kind':'public native field-boss mechanism','team':row['team'],'seen':fb['seen']})
blocked=collections.defaultdict(list)
for c in catalog['cardWitnesses']:
 if c['status']=='BLOCKED':blocked[c['card']].append({'group':c['group'],'reason':c['reason']})
cards=[]
for c in catalog['enemyCardRegistry']:
 d={**c,'executed':bool(direct[c['id']]),'directWitnesses':direct[c['id']],'logWitnesses':logs[c['id']],'initialBlocks':blocked[c['id']]}
 meta=cardmeta[c['id']];d.update({k:meta[k] for k in ['name','kind','trigger','execState','rawRuntimeRef','active','ready','risk','nativeDeckRefs','ownerName','ownerRegionLiteral','groupRefs']})
 d['status']='EXECUTED' if d['executed'] else 'REGISTERED_UNSUPPORTED' if not c['supported'] else 'SUPPORTED_LOG_ONLY' if d['logWitnesses'] else 'SUPPORTED_NOT_EXECUTED'
 if not d['executed']:d['limit']='정적 등록/지원 판단이며 이 감사에서 해당 카드의 executeCard 분기는 실행하지 않았다. 로그 증거가 있더라도 직접 실행과 합치지 않는다.'
 cards.append(d)
write('card_registry_414.json',{'schema':1,'total':len(cards),'counts':dict(collections.Counter(c['status'] for c in cards)),'supported':sum(c['supported'] for c in cards),'cards':cards})
bygroup={r[0]:r for r in definitions['rows']};monsters=[]
for m in catalog['monsters']:
 initial=[g['id'] for g in catalog['groups'] if any(a['source']==m[0] for a in g.get('actors',[]))]
 rejected=[{'id':g['id'],'code':g.get('code'),'reason':g.get('reason')} for g in catalog['groups'] if g['status']=='REJECTED' and m[0] in [bygroup.get(g['id'],[])[i] for i in [7,10,13,16,19] if len(bygroup.get(g['id'],[]))>i]]
 status='DYNAMIC_WITNESS' if owners[m[0]] else 'REJECTED_GROUP_OWNER' if rejected else 'INITIALIZED_NO_ACTION' if initial else 'REGISTERED_WITHOUT_INITIAL_ENCOUNTER'
 meta=monstermeta[m[0]];monsters.append({'id':m[0],'name':m[1],'regionLiteral':meta['regionLiteral'],'status':status,'nativeWitnesses':owners[m[0]],'initializedGroups':initial,'rejectedGroups':rejected,'groupOrMemberRefs':meta['groupRefs'],'referenceClassification':'HAS_DYNAMIC_WITNESS' if owners[m[0]] else 'NO_GROUP_OR_MEMBER_REFERENCE' if not meta['groupRefs'] else 'ENTRY_GUARD_REJECTED','cards':[{'id':c['id'],'name':c['name'],'status':c['status'],'supported':c['supported'],'reason':c['reason']} for c in cards if c['owner']==m[0]],'limit':None if owners[m[0]] else '동적 통과로 세지 않는다. 거절 그룹의 구성원 전체가 미구현이라는 뜻은 아니다. 그룹/멤버 참조 없는 등록 행을 미출시라고 추측하지 않고 현재 표 전용·미실행으로 남긴다.'})
write('monster_registry_228.json',{'schema':1,'total':len(monsters),'counts':dict(collections.Counter(m['status'] for m in monsters)),'monsters':monsters})
B=read('repeated_before.json.gz');A=read('repeated_after.json.gz');before={(r['name'],r['level'],r['seed']):r for r in B['conditions']};comparison=[]
for a in A['conditions']:
 b=before[(a['name'],a['level'],a['seed'])];fields=['wins','losses','hpRatio','healApplied','healNominal','overCap','allFull','koBattles'];comparison.append({'name':a['name'],'level':a['level'],'seed':a['seed'],'changed':any(a[f]!=b[f] for f in fields),'before':{f:b[f] for f in fields},'after':{f:a[f] for f in fields}})
write('repeat_comparison.json',{'schema':1,'beforeCounts':B['counts'],'afterCounts':A['counts'],'limits':'Same initial seed and native RNG; removing redundant C1/base RNG consumption changes later rolls. This is not a monotonic healing/win guarantee. No inn/food/HP reset is imposed. Inn cost20 at fullHP is an unbought service quote, not mandatory payment.','conditions':comparison})
Rb=read('recovery_settlement_before.json');Ra=read('recovery_settlement_after.json');rec=[]
for b,a in zip(Rb['battles'],Ra['battles']):
 key=lambda x:{k:v for k,v in x['result'].items() if k not in ['id','battleId','saveId']}
 rec.append({'boundary':b['boundary'],'sameBattleResultExceptIds':key(a)==key(b),'before':b['after'][0],'after':a['after'][0],'hpBeforeSettlement':a['hpBeforeSettlement'],'xp':a['result'].get('xp'),'victory':a['result'].get('victory')})
write('settlement_comparison.json',{'schema':1,'beforeCounts':Rb['counts'],'afterCounts':Ra['counts'],'battles':rec,'scope':'addXp change belongs to growth agent; combat XP recipients and payout unchanged. Public KO protagonist books are ACTION_LOCK, companion book cost is real. Explicit 10% protagonist victory revival/defeat recovery are separate existing paths.'})
summary={'schema':1,'baselineCommit':'df1d2c48b630bf8a152481bcc4bcc3e5b8b37785','baselineArchive':'../baseline_v01620.tar.gz','registeredMonsters':len(monsters),'monsterStatus':dict(collections.Counter(m['status'] for m in monsters)),'initialGroups':catalog['counts'],'boundedNativePhaseGroups':phases['counts'],'registeredCards':len(cards),'cardStatus':dict(collections.Counter(c['status'] for c in cards)),'majorBosses':major['counts'],'specialOwners':special['counts'],'fieldBosses':bosses['summary'],'observedGapCounts':dict(collections.Counter(str(row['battles'][0]['initial']['level']-row['level']) for row in bosses['rows'])),'repeatBefore':B['counts'],'repeatAfter':A['counts'],'changedRepeatConditions':sum(r['changed'] for r in comparison),'repeatUnaffectedConditions':sum(not r['changed'] for r in comparison),'noelleLifecycleBefore':{str(ok):sum(r['ok']==ok for r in read('noelle_lifecycle_before.json')['results']) for ok in [False,True]},'noelleLifecycleAfter':{str(ok):sum(r['ok']==ok for r in read('noelle_lifecycle_after.json')['results']) for ok in [False,True]},'rawDbSha256':catalog['provenance']['dbSha256'],'fingerprints':{name:read(name).get('fingerprint') for name in ['enemy_catalog_before.json','enemy_phases_after.json','major_bosses_after.json','special_owners_after.json','boss_conditions_after.json','repeated_before.json.gz','repeated_after.json.gz','recovery_settlement_before.json','recovery_settlement_after.json']}}
if (p/'after_contracts/results.json').exists():summary['afterContracts']=read('after_contracts/results.json')['counts'];summary['afterContractsInputDrift']=read('after_contracts/results.json')['inputDrift']
summary['activeAiRefInspection']=refs['counts'];summary['monsterReferenceClassification']=dict(collections.Counter(m['referenceClassification'] for m in monsters))
if (p/'frozen_contracts/results.json').exists():summary['frozenContracts']=read('frozen_contracts/results.json')['counts'];summary['frozenContractsInputDrift']=read('frozen_contracts/results.json')['inputDrift']
if (p/'frozen_contracts_final.json').exists():summary['frozenContractsFinal']=read('frozen_contracts_final.json')['counts'];summary['frozenContractsFinalInputDrift']=read('frozen_contracts_final.json')['inputDrift']
if (p/'capacity_native.json').exists():summary['capacityNative']=read('capacity_native.json')['counts']
if (p/'boss_underlevel_extra_after.json').exists():
 extra=read('boss_underlevel_extra_after.json');sourceDifferences=[{'path':key,'initial48Sha256':value,'extra24Sha256':extra['sourceHashes'].get(key)} for key,value in bosses['sourceHashes'].items() if value!=extra['sourceHashes'].get(key)];assert {d['path'] for d in sourceDifferences}=={'source/runtime_growth_v01522.js','source/runtime_tasks_v0167.js'};breakdown=collections.defaultdict(lambda:{'conditions':0,'wins':0,'losses':0})
 for row in [*bosses['rows'],*extra['rows']]:
  actual=row['battles'][0]['initial']['level']-row['level'];assert actual==row['requestedGap'];key=f"enemy_plus_{actual}:{row['team']}";breakdown[key]['conditions']+=1;breakdown[key]['wins']+=row['wins'];breakdown[key]['losses']+=row['losses']
 summary['additionalUnderlevelFieldBosses']=extra['summary'];summary['combinedFieldBosses']={key:bosses['summary'][key]+extra['summary'][key] for key in ['conditions','fights','wins','losses','errors']};summary['fieldBossTeamAndGapBreakdown']=dict(breakdown);summary['bossSnapshotDifferences']=sourceDifferences
 summary['additionalBossScope']='Initial48 and additional24 are separate preserved input fingerprints; only growth/tasks hashes differ, all other source hashes match. Initial48 growth hash is linked to after_growth_hp.json native HP-policy-after evidence; extra24 uses ef07 frozen source. Prepared gear/public BOSS_ROUTE/fixed seed717. Different elemental/support teams, not a rarity-only causal comparison. Some five-star survival clears remain at enemy +20/+30 and take up to95 rounds.'
write('COMBAT_SUMMARY.json',summary);print(json.dumps({k:v for k,v in summary.items() if k not in ['fingerprints','rawDbSha256']},ensure_ascii=False))
