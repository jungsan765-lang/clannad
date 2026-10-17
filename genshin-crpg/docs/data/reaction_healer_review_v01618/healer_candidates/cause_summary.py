import os
from pathlib import Path
import json,math,collections,gzip,hashlib
out=Path(os.environ.get('CRPG_AUDIT_DATA', Path(__file__).resolve().parent));cause=[]
for name in ['cause_Jean.result.json','cause_Sucrose.result.json','zero_JEAN_ZERO_COUNTERFACTUAL.result.json','extra_JEAN_Q020_F003.result.json','last_JEAN_LATE_Q010_F002.result.json']:
 data=json.loads((out/name).read_text())
 for r in data['rows']:
  if r['level'] not in [50,60] or r['kind'] not in ['TALENT','ASCENSION']:continue
  allcasts=[c for b in r['battles'] for c in b.get('actualCasts',[]) if c['actor'] in ['MOND_JEAN','MOND_SUCROSE']]
  controls=[c for b in r['battles'] for c in b.get('controlCalls',[]) if c['actor'] in ['MOND_JEAN','MOND_SUCROSE']]
  vals=[h['requestedBeforeModifiers'] for b in r['battles'] for h in b['heals']]
  nominal=0;qcount=0;fieldcount=0
  if vals and max(vals)>0:
   threshold=(min(v for v in vals if v>0)+max(vals))/2
   q=[v for v in vals if v>threshold];f=[v for v in vals if v<=threshold]
   qfactor=(1.38 if r['level']==50 else 1.5)*1.5*1.1
   nominal=sum(math.floor(v*qfactor+.5) for v in q)+sum(math.floor(v*1.1+.5) for v in f);qcount=len(q);fieldcount=len(f)
  gains=[d for b in r['battles'] for d in b['rewardHpDelta']]
  c={k:r.get(k) for k in ['candidate','level','kind','support','seed','wins','losses','mainRounds','mainSeconds','mainEffectiveHealing','mainAllyHpDamage','mainKoEvents','afterMainHpRatio','lodgingMora','finalRecoveryFailure']}
  c.update({'file':name,'rawHealingRequestBeforeModifiers':sum(vals),'formulaReconstructedNominalHealingAfterModifiersBeforeHPCap':nominal,'nominalHealingAssumptions':'Lv50 talent5 =>1.38, Lv60 talent6 =>1.50. Long Q1.5 and recipient healer-brooch10%; field receives only recipient10%. C0; no food/artifact/team heal bonus. This is formula reconstruction, not new core-heal instrumentation. Q/field call classes distinct in these late fixtures; Q count32 when alive all four.','qHealCalls':qcount,'fieldHealCalls':fieldcount,'actualCastCounts':dict(collections.Counter(c['card'] for c in allcasts)) if allcasts else None,'controlCounts':dict(collections.Counter(c['kind']+(':native_true' if c['result'] else ':native_false') for c in controls)) if controls else None,'partyObservedDamageHPAndShield':sum(b['ownDamage']+b['allyDamage'] for b in r['battles']),'partyDamagePerModeledSecond':sum(b['ownDamage']+b['allyDamage'] for b in r['battles'])/r['mainSeconds'],'levelUpHPGain':sum(max(0,d['delta']) for d in gains if d['levelAfter']>d['levelBefore']),'postRewardHpClippedAtUnchangedLevel':sum(max(0,d['hpBefore']-d['hpAfter']) for d in gains if d['levelAfter']==d['levelBefore']),'postRewardPositiveHpGainAtUnchangedLevel':sum(max(0,d['delta']) for d in gains if d['levelAfter']==d['levelBefore'])})
  cause.append(c)
iso=json.loads((out/'isolated_jean.json').read_text());curve=[]
for r in iso:
 if r['candidate']=='BASELINE' and r['gearMode']=='STANDARD':
  hp=r['party'][0]['maxHp'];q=r['q'][0]['heal'];f=r['field'][0]['heal'];curve.append({'level':r['level'],'qTalent':r['talent']['q'],'jeanCombatAtkAfterQ':r['atk'],'travelerMaxHP':hp,'postQCombatAtkToTravelerHPRatio':r['atk']/hp,'measuredQHealingPerTarget':q,'measuredFieldHealingPerTargetPerTick':f,'measuredQPlusThreeFieldTicksToTravelerHPRatio':(q+3*f)/hp,'party':r['party']})
d={'rows':cause,'curve':curve,'limits':['Party modeled DPS is total actual HP+shield damage divided by 2x presentation+declared input budget, not Jean individual DPS or real-player timing.','Exact actualCastCounts are direct executeCard instrumentation; ordinary card logs include field damage and must not be counted as extra casts.','Native_true control means applyCombatControl returned true; different control types/targets are not interchangeable strength units.','ZERO is a role-separation counterfactual only, not a proposed playable nerf. LATE_Q010 is a late-level numeric pilot, not an all-level recommendation.','Formation third-slot maxHP+5% leaves an extra combat HP gap filled by actual healing; post-reward clipping is discarded HP, not free HP creation. Positive reward HP and level-up are separately reported.','Post-Q ATK includes weapon on-hit effects activated by Q damage; measured Q happens before those hits. Do not derive Q magnitude using the post-Q ATK ratio alone.','Cost includes native final travel encounters. Recovery failure is not successful zero-cost lodging.']}
(out/'cause_summary.json').write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'causeRows':len(cause),'curveRows':len(curve)}))
