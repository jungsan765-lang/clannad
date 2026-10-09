import collections,csv,gzip,hashlib,json,pathlib,statistics,os,tempfile
SCRIPT_DIR=pathlib.Path(__file__).resolve().parent
BASE=pathlib.Path(os.environ.get('CRPG_AUDIT_DATA',os.environ.get('CRPG_AUDIT_OUT',pathlib.Path(tempfile.gettempdir())/'crpg-reaction-healer-review/field_boss_repeat')))
BASE.mkdir(parents=True,exist_ok=True)
ROOT=pathlib.Path(os.environ.get('CRPG_AUDIT_ROOT',SCRIPT_DIR.parents[3]))
chunks=[json.loads((BASE/f'e{n}.json').read_text()) for n in [3,6]]
rows=[r for c in chunks for r in c['rows']]
# Rain-sword depletion can heal the same target before the native incoming packet.
# The outer before/after HP meter then measures a net change; pair each packet to
# the ordered native damage log and cap native HP damage at actual pre-hit HP.
packetPairs=0
for r in rows:
 r['mainObservedNetHpLoss']=r['mainHpDamage']
 for b in r['battles']:
  allies={a['source'] for a in b['initial'] if a['side']=='ALLY'}
  logs=[l for l in b['lastLog'] if 'damage' in l and l.get('targetId') in allies and (l.get('actorId','').startswith('FB_CRYO_HYPOSTASIS') or l.get('actorId','').startswith('HAZARD'))]
  assert len(logs)==len(b['incomingPackets'])
  b['observedOuterNetHpLoss']=b['allyHpDamage']
  for p,l in zip(b['incomingPackets'],logs):
   assert p['target']==l['targetId'] and p['details'].get('card')==l.get('card') and p['round']==l['round']
   before=next((a['hp'] for a in l.get('presentationActorsBefore',[]) if a['id']==p['target'] and 'hp' in a),p['beforeHp'])
   p['observedOuterNetHpLoss']=p['hpLoss']
   p['nativeDamageBeforeOverkillCap']=l['damage']
   p['actualPreHitHp']=before
   p['hpLoss']=min(l['damage'],before)
   packetPairs+=1
  b['allyHpDamage']=sum(p['hpLoss'] for p in b['incomingPackets'])
 r['mainHpDamage']=sum(b['allyHpDamage'] for b in r['battles'])
sumof=lambda x,k:sum(v[k] for v in x)
def minmax(values):
 v=list(values)
 return {'min':min(v),'max':max(v),'mean':statistics.mean(v)} if v else None
def packet_stats(packets):
 out={}
 for key,items in [('bossDirect',[p for p in packets if p['actor']=='FB_CRYO_HYPOSTASIS']),('bossHazard',[p for p in packets if p['actor']=='HAZARD']),('other',[p for p in packets if p['actor'] not in ['FB_CRYO_HYPOSTASIS','HAZARD']])]:
  out[key]={'packets':len(items),'hpDamage':sumof(items,'hpLoss'),'shieldAbsorbed':sumof(items,'shieldAbsorbed'),'preApplyRequests':sumof(items,'requestedAmount')}
 return out
conditions=[]
for r in rows:
 fights=[]
 for b in r['battles']:
  balance=[]
  for a in b['initial']:
   if a['side']!='ALLY':continue
   end=next(v for v in b['beforeReward'] if v['source']==a['source'])
   inc=sum(p['hpLoss'] for p in b['incomingPackets'] if p['target']==a['source'])
   heal=sum(h['effective'] for h in b['heals'] if h['target']==a['source'])
   residual=a['hp']-inc+heal-end['hp']
   balance.append({'actor':a['source'],'initialHp':a['hp'],'endBattleHp':end['hp'],'nativeIncomingHpDamage':inc,'actualHealing':heal,'directHpLossOutsideDamagePipeline':residual,'sourceExplanation':'Xiao BANE_OF_ALL_EVIL END tick deducts floor(maxHP*8%), minimum 1HP' if a['source']=='LIYUE_XIAO' else 'none expected'})
  corelog=[x for x in b['lastLog'] if x.get('card') in ['FB_REVIVE','FB_REVIVED','FB_CORE_BROKEN'] or '냉기 핵에 금' in x.get('text','')]
  core={'entered':sum(x.get('card')=='FB_REVIVE' for x in b['lastLog']),'hitSequence':[{'round':x['round'],'before':x['before'],'after':x['after'],'source':(x.get('request') or {}).get('actor'),'card':(x.get('request') or {}).get('card'),'hpAfter':x['bossHp']} for x in b['coreHits']],'completedFourHits':sum(x.get('card')=='FB_CORE_BROKEN' for x in b['lastLog']),'timedOutAndRevived50Percent':sum(x.get('card')=='FB_REVIVED' for x in b['lastLog']),'lastBossHp':b['bossBeforeReward']['hp'],'lastBossFb':b['bossBeforeReward']['fb'],'logs':corelog}
  # Include full logs only in compressed native data; summarized core evidence preserves ordering.
  fight={'number':b['number'],'win':b['win'],'rounds':b['rounds'],'secondsModel2x':b['seconds'],'playerInputs':b['playerActions'],'bossProcessedActions':sum(t['processed'] for t in b['bossTurns']),'bossOwnTurns':len(set((t['round'],t['actorTurn']) for t in b['bossTurns'])),'patterns':dict(collections.Counter(x['kind'] for x in b['moves'])),'windups':dict(collections.Counter(x['kind'] for x in b['windups'])),'bossAttackRequests':len(b['bossAttackRequests']),'incoming':packet_stats(b['incomingPackets']),'hpDamage':b['allyHpDamage'],'shieldAbsorbed':b['shieldAbsorbed'],'actualHeal':b['effectiveHealing'],'rawHealingRequestedBeforeModifiers':sumof(b['heals'],'rawRequestBeforeModifiers'),'koFromDamagePipeline':b['ko'],'directHpBalance':balance,'core':core,'rewardHpDelta':b['rewardHpDelta'],'reward':b['reward'],'actualCasts':dict(collections.Counter(x['card'] for x in b['actualCasts'])),'initialActorStats':b['initial'],'beforeRewardHp':[{k:a[k] for k in ['source','hp','maxHp','level']} for a in b['beforeReward']]}
  fights.append(fight)
 allpackets=[p for b in r['battles'] for p in b['incomingPackets']]
 normalizedCost=r['lodgingMora'] if not r.get('recoveryFailure') and r['wins']==3 and r.get('endpoint',{}).get('allFullHp') else None
 conditions.append({k:r[k] for k in ['team','teamIds','enhance','talentMode','talent','seed','boss','equipment','talents','initialHp','wins','losses','mainRounds','mainSeconds','mainHpDamage','mainObservedNetHpLoss','mainShieldAbsorbed','mainEffectiveHealing','mainKo','afterMainHp','afterMainHpRatio','mainBossAttackRequests','mainBossProcessedActions','mainBossTurnCount','mainCoreHits','lodgingMora','finalHp','stopReason','endpoint']}|{'incoming':packet_stats(allpackets),'directHpLossOutsideDamagePipeline':sum(x['directHpLossOutsideDamagePipeline'] for b in fights for x in b['directHpBalance']),'innMoraComparableAfterThreeWins':normalizedCost,'recoveryFailure':r.get('recoveryFailure'),'recoveries':r['recoveries'],'mainCoreCompletedFour':sum(b['core']['completedFourHits'] for b in fights),'mainCoreTimedOutRevived':sum(b['core']['timedOutAndRevived50Percent'] for b in fights),'battles':fights})
groups=[]
for team in ['FOUR_ATTACK','FOUR_HEAL','FIVE_HYBRID','FIVE_DEFENSIVE','FIVE_ATTACK']:
 for enhance in [3,6]:
  for talent in ['MODERATE','MAX']:
   rr=[r for r in conditions if r['team']==team and r['enhance']==enhance and r['talentMode']==talent]
   first=[r['battles'][0] for r in rr]
   good=[r for r in rr if r['wins']==3]
   groups.append({'team':team,'enhance':enhance,'talentMode':talent,'campaigns':len(rr),'allThreeWins':len(good),'firstBattleWins':sum(b['win'] for b in first),'wins':sumof(rr,'wins'),'losses':sumof(rr,'losses'),'firstRounds':minmax(b['rounds'] for b in first),'firstSecondsModel2x':minmax(b['secondsModel2x'] for b in first),'firstHpDamage':minmax(b['hpDamage'] for b in first),'firstShieldAbsorbed':minmax(b['shieldAbsorbed'] for b in first),'firstActualHeal':minmax(b['actualHeal'] for b in first),'threeWinsEndHpRatio':minmax(r['afterMainHpRatio'] for r in good),'threeWinsHpDamage':minmax(r['mainHpDamage'] for r in good),'threeWinsShieldAbsorbed':minmax(r['mainShieldAbsorbed'] for r in good),'threeWinsActualHeal':minmax(r['mainEffectiveHealing'] for r in good),'threeWinsDirectSelfHpLoss':minmax(r['directHpLossOutsideDamagePipeline'] for r in good),'threeWinsSecondsModel2x':minmax(r['mainSeconds'] for r in good),'threeWinsInnMora':minmax(r['innMoraComparableAfterThreeWins'] for r in good if r['innMoraComparableAfterThreeWins'] is not None),'firstCoreFourHitCompletions':sum(b['core']['completedFourHits'] for b in first),'firstCoreTimeoutsRevived':sum(b['core']['timedOutAndRevived50Percent'] for b in first),'firstDamageKo':sum(b['koFromDamagePipeline'] for b in first)})
productOriginal=json.loads((SCRIPT_DIR.parent/'healer_candidates/candidate_manifest.json').read_text())['gameFilesSHA256']
productCurrent={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in productOriginal}
allfights=[b for r in conditions for b in r['battles']]
counts={'campaigns':len(rows),'uniqueConditionKeys':len(set((r['team'],r['enhance'],r['talentMode'],r['seed']) for r in rows)),'nativeMainFights':len(allfights),'mainWins':sumof(rows,'wins'),'mainLosses':sumof(rows,'losses'),'firstFightWins':sum(r['battles'][0]['win'] for r in rows),'allThreeWinCampaigns':sum(r['wins']==3 for r in rows),'nativeRecoveryFailures':sum(bool(r.get('recoveryFailure')) for r in rows),'matchedNativeDamagePackets':packetPairs,'nonXiaoUnreconciledHpBalance':sum(a['directHpLossOutsideDamagePipeline']!=0 for b in allfights for a in b['directHpBalance'] if a['actor']!='LIYUE_XIAO'),'fourCoreHitCompletions':sum(b['core']['completedFourHits'] for b in allfights),'coreTimeout50PercentRevivals':sum(b['core']['timedOutAndRevived50Percent'] for b in allfights),'executionErrors':[e for c in chunks for e in c['errors']]}
summary={'sourceCommit':chunks[0]['sourceCommit'],'nativeFingerprint':chunks[0]['fingerprint'],'auditOnly':True,'productChanges':False,'assumptions':chunks[0]['assumptions'],'count':counts,'groups':groups,'conditions':conditions,'sourceFilesCount':len(productCurrent),'sourceFilesUnchanged':productCurrent==productOriginal,'metricsNotes':['HP damage pairs every observed applyDamage packet with ordered native damage logs and caps the returned HP damage at actual pre-hit HP. Rain-sword heal-before-hit means outer HP before/after is net HP change, which is retained separately. Every non-Xiao actor HP balance reconciles to zero residual. Xiao direct self HP costs bypass applyDamage and are separately reconciled.','KOFromDamagePipeline counts falls to zero in observed applyDamage, not post-battle defeat state.','0 lodging due to defeat ACTION_LOCK is NOT a comparable zero-cost successful campaign; innMoraComparableAfterThreeWins=null.','Boss raw ATK*k and DEF-only expectation omit native crit/miss/target/element/status multipliers; actual native request and applied HP/shield are retained in compressed raw.','Core count need4 remains native. Wins with fewer than4 core hits happen after core timeout, actual50%HP revival and a second kill.','2x time is modeled observed presentation time plus explicit fixed input budget, not user/measured browser elapsed.','Lv25 starts phase2 and remains Lv25 because bossXP is below next threshold after 3wins. Raw saved maxHP differs from combat +5%slot3 bonus; native settlement clips that bonus.']}
(BASE/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
with (BASE/'conditions.csv').open('w',newline='') as f:
 cols=['team','enhance','talentMode','seed','wins','losses','mainRounds','mainSeconds','mainHpDamage','mainShieldAbsorbed','mainEffectiveHealing','directHpLossOutsideDamagePipeline','mainKo','afterMainHpRatio','mainBossAttackRequests','mainBossProcessedActions','mainBossTurnCount','mainCoreHits','mainCoreCompletedFour','mainCoreTimedOutRevived','lodgingMora','innMoraComparableAfterThreeWins','recoveryFailure']
 w=csv.DictWriter(f,cols,extrasaction='ignore');w.writeheader();w.writerows(conditions)
with gzip.open(BASE/'native.json.gz','wt',encoding='utf8',compresslevel=9) as f:json.dump({'chunks':chunks},f,ensure_ascii=False,separators=(',',':'))
manifest={'sourceCommit':chunks[0]['sourceCommit'],'gameFilesUnchanged':productCurrent==productOriginal,'gameFilesSHA256':productCurrent,'finalCounts':counts,'noCandidateSourceSubstitution':True,'scriptSHA256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [SCRIPT_DIR/'audit.cjs',SCRIPT_DIR/'aggregate.py']},'artifacts':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [BASE/'summary.json',BASE/'conditions.csv',BASE/'native.json.gz',SCRIPT_DIR/'actual_fixture.json']}}
(BASE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'counts':counts,'unchanged':productCurrent==productOriginal,'productFiles':len(productCurrent),'groups':groups},ensure_ascii=False,indent=2))
