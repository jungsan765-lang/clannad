"""Read-only current formula arithmetic; never campaign or native fight proof."""
import json, math, random
from collections import Counter
from pathlib import Path
P=Path(__file__).parent
D=json.loads((P/'native_preparation_query.json').read_text())
C=D['config']['enhancement']; A=D['config']['artifact']; G=D['config']['growth']
def solve(mat,rhs):
 a=[r[:]+[float(v)] for r,v in zip(mat,rhs)]; n=len(a)
 for i in range(n):
  k=max(range(i,n),key=lambda k:abs(a[k][i]));a[i],a[k]=a[k],a[i]
  div=a[i][i];a[i]=[v/div for v in a[i]]
  for j in range(n):
   if j!=i:
    div=a[j][i];a[j]=[v-div*u for v,u in zip(a[j],a[i])]
 return [row[-1] for row in a]
def expected(cap,res):
 mat=[[0.]*cap for _ in range(cap)]
 for lv in range(cap):
  up=C['success'][lv+1]/10000;down=C['down'][lv+1]/10000
  mat[lv][lv]=up+down
  if lv+1<cap:mat[lv][lv+1]=-up
  if lv:mat[lv][lv-1]=-down
 return solve(mat,res[1:cap+1])[0]
resources={'mora':C['mora'],'attempts':[1]*13}
for item in ('ORE_IRON','ORE_WHITE_IRON','ORE_CRYSTAL'):
 resources[item]=[x.get(item,0) for x in C['ores']]
gear={str(cap):{k:expected(cap,v) for k,v in resources.items()} for cap in (10,12)}
art={k:sum(v[t]/(A['success'][t]/10000) for t in range(1,6)) for k,v in {'mora':A['moraCost'],'crystals':A['materialCost']}.items()}
art['attempts']=sum(10000/A['success'][t] for t in range(1,6));art['expectedSuccessfulAzhdahaWins']=art['crystals']/3
# This histogram mirrors rollArtifact's actual rounding; condition checked at native +5 scale2.5.
rng=random.Random(46190377); counts=Counter(); sample=1_000_000
statsKeys=['ATK','DEF','MAX_HP','SPD','CRIT','CRIT_DMG','HIT','EVA','STATUS_RESIST']
decimals={'CRIT','CRIT_DMG','SPD','HIT','EVA','STATUS_RESIST'}
secondary={'ATK':7,'DEF':7,'MAX_HP':45,'SPD':1.6,'CRIT':.7,'CRIT_DMG':4.5,'HIT':1.4,'EVA':1.4,'STATUS_RESIST':1.4}
weights=list(A['archetypes'].values())
def jsround(x):return math.floor(x+0.5)
def rounded(key,value):return jsround(value*10)/10 if key in decimals else max(1,jsround(value))
for _ in range(sample):
 spec=weights[int(rng.random()*len(weights))];q=1+math.floor(rng.random()**2.2*999)
 scale=.22+2.78*(q/1000)**1.8
 s={k:rounded(k,w*scale*(.72+rng.random()*.56)) for k,w in spec['weights'].items()}
 pool=[k for k in statsKeys if k not in s]
 for _ in range(2):
  k=pool.pop(int(rng.random()*len(pool)));s[k]=rounded(k,secondary[k]*scale*(.55+rng.random()*.9))
 s={k:jsround(v*2.5*10)/10 for k,v in s.items()}
 z=q>=900 and s.get('MAX_HP',0)>=200 and s.get('DEF',0)>=20
 j=q>=900 and s.get('ATK',0)>=25 and s.get('MAX_HP',0)>=100
 atk=q>=900 and s.get('ATK',0)>=35 and s.get('CRIT',0)>=2
 mask=(1 if z else 0)|(2 if j else 0)|(12 if atk else 0)
 counts[mask]+=1
good=[(k,n) for k,n in sorted(counts.items()) if k];goodN=sum(n for k,n in good)
# Event-skipping simulation: each acceptable artifact assigned to one person; keep every feasible assignment subset.
campaign=[];campaignSamples=20000
for _ in range(campaignSamples):
 subsets={0};rolls=0
 while 15 not in subsets:
  rolls+=math.floor(math.log(1-rng.random())/math.log(1-goodN/sample))+1
  draw=int(rng.random()*goodN);mask=0
  for k,n in good:
   if draw<n:mask=k;break
   draw-=n
  new=set(subsets)
  for m in subsets:
   for bit in (1,2,4,8):
    if mask&bit and not m&bit:new.add(m|bit)
  subsets=new
 campaign.append(rolls)
campaign.sort()
growth={'allTalents1to10Mora':{'fourStarOrProtagonist':sum(250*l*l for l in range(1,10))*3,'fiveStar':sum(375*l*l for l in range(1,10))*3},'allSixAscensionsMora':{'fourStarOrProtagonist':sum([800,2400,6000,14000,28000,42000]),'fiveStar':sum(round(v*1.8) for v in [800,2400,6000,14000,28000,42000])},'fullParty60C0Reference':{'composition':['PLAYER_CUSTOM','MOND_DILUC','MOND_JEAN','LIYUE_ZHONGLI'],'talentBaseMax':10,'naturalLevelXp':'not simulated','equipmentPiecesAt12':12,'artifactPiecesAt5':4}}
party=growth['fullParty60C0Reference'];party['talentMora']=growth['allTalents1to10Mora']['fourStarOrProtagonist']+growth['allTalents1to10Mora']['fiveStar']*3
party['ascensionMora']=growth['allSixAscensionsMora']['fourStarOrProtagonist']+growth['allSixAscensionsMora']['fiveStar']*3
party['gearMoraExpected']=(gear['12']['mora']+C['ascensionCost']['mora'])*12
party['artifactMoraExpected']=art['mora']*4
party['subtotalMoraExpected']=sum(party[k] for k in ('talentMora','ascensionMora','gearMoraExpected','artifactMoraExpected'))
result={'scope':'Read-only exact Markov gear expected costs and mathematical RNG artifact approximation; no fights, legal acquisition campaign, exchange prices or elapsed real campaign proof. Drop schedule under runtime_boss_rematch is real KST daily, not early48 in-game hours.','inputsNativeQuery':D['basis'],'gearFirstPassageExpected':gear,'artifact0to5Expected':art,'artifactRoleAcquisition':{'sampleRolls':sample,'seed':46190377,'quality90plusExactProbability':1-(899/999)**(1/2.2),'countsByEligibleActorBitmask':dict(counts),'bitmaskLegend':{'1':'Zhongli','2':'Jean','4':'Attacker1','8':'Attacker2'},'expectedRollsToFirstRole':{'Zhongli':sample/sum(n for m,n in counts.items() if m&1),'Jean':sample/sum(n for m,n in counts.items() if m&2),'Attacker':sample/sum(n for m,n in counts.items() if m&4)},'fourSuitablePiecesAssignmentSimulation':{'samples':campaignSamples,'meanRolls':sum(campaign)/campaignSamples,'medianRolls':campaign[len(campaign)//2],'p90Rolls':campaign[int(len(campaign)*.9)],'scheduleAssumption':'one successful Tartaglia artifact per real KST day; all wins, no market, no inventory, initial story artifact not subtracted'}},'growthBudget':growth}
(P/'preparation_arithmetic.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps({'gear':gear,'artifact':art,'party':party,'artifactAcquisition':result['artifactRoleAcquisition']},ensure_ascii=False,indent=2))
