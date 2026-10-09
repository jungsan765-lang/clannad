#!/usr/bin/env python3
"""Compare same native preparation conditions without treating requested as actual HP."""
import argparse,gzip,json,hashlib
from pathlib import Path

def read(p):
 b=p.read_bytes();return json.loads(gzip.decompress(b) if p.suffix=='.gz' else b)
def key(r):return (r['region'],r['level'],r['route'],r['seed'],r['recipe'],r['quantity'],r.get('loss',.5))
def money(r):
 tools=sum(x['mora']for x in r['purchases']if x.get('item')=='TRPG_FISHING_ROD')
 bait=sum(x['mora']for x in r['purchases']if x.get('item')=='CRPG_FRUIT_BAIT')
 return {'recurringCash':r['purchasedMora']+r['processCraftMora']+r['foodCraftMora']-r['firstUnlockMora']-tools,'firstRecipe':r['firstUnlockMora'],'firstTools':tools,'baitIncludedInRecurring':bait}
def actual(r):
 meals=r.get('meal',{}).get('meals',[])
 return {'requested':sum(m['requestedHealing']for m in meals),'healed':sum(m['healed']for m in meals),'absorbed':sum(m['absorbed']for m in meals),'recipients':len(meals),'perRecipient':meals,'missingAtMeal':sum(x['maxHp']-x['hp']for x in r.get('hpBeforeMeal',[])),'missingAfterMeal':sum(x['maxHp']-x['hp']for x in r.get('finalHp',[])),'koAtMeal':[x['owner']for x in r.get('hpBeforeMeal',[])if x['hp']<=0],'persistentAfterMeal':r.get('finalHp'),'persistentAfterReturn':r.get('finalHpAfterReturn')}
def harvests(r):return [{k:h.get(k)for k in ('map','kind','seed','items','elapsedMs','upperBoundMs','encounter')}for h in r['harvests']]
def main():
 p=argparse.ArgumentParser();p.add_argument('--before',type=Path,required=True);p.add_argument('--after',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
 before=read(a.before);after=read(a.after);bm={key(r):r for r in before['rows']};am={key(r):r for r in after['rows']};assert len(bm)==len(before['rows']);assert len(am)==len(after['rows']);assert bm.keys()==am.keys()
 rows=[]
 for k,b in bm.items():
  n=am[k]
  parity={f:b.get(f)==n.get(f)for f in ('initialHp','rawRequirements','hpBeforeCook','hpBeforeMeal','purchases','crafts')}
  parity['harvests']=harvests(b)==harvests(n)
  parity['rawSupplyCash']=money(b)==money(n)
  # Only pre-meal parity is required. Better meal HP can legitimately change
  # native return-trip fight choices, duration or eventual casualties.
  assert all(parity.values()),(k,parity)
  old=actual(b);new=actual(n)
  if old['recipients']==new['recipients']:
   for om,nm in zip(old['perRecipient'],new['perRecipient']):
    assert om['owner']==nm['owner'] and om['item']==nm['item']
    assert nm['requestedHealing']>=om['requestedHealing']
    assert nm['healed']>=om['healed']
  rows.append({'condition':dict(zip(('region','level','route','seed','recipe','quantity','loss'),k)),'beforeFailed':b['failed'],'afterFailed':n['failed'],'beforeReason':b.get('reason'),'afterReason':n.get('reason'),'preMealNativeParity':parity,'moneyBefore':money(b),'moneyAfter':money(n),'secondsBefore':b['seconds'],'secondsAfter':n['seconds'],'oneMealBefore':old,'oneMealAfter':new,'nativeOverhealBefore':old['requested']-old['healed']-old['absorbed'],'nativeOverhealAfter':new['requested']-new['healed']-new['absorbed'],'requestedImprovement':new['requested']-old['requested'],'actualImprovement':new['healed']-old['healed']})
 result={'schema':1,'beforeVersion':before['version'],'afterVersion':after['version'],'baselinePublishedSHA':'da29f36312af19ca11dd2c0ac29b54d6b31ee8f4','beforeInput':{'file':a.before.name,'sha256':hashlib.sha256(a.before.read_bytes()).hexdigest()},'afterInput':{'file':a.after.name,'sha256':hashlib.sha256(a.after.read_bytes()).hexdigest()},'nativeConditions':len(rows),'preMealSupplyParity':all(all(r['preMealNativeParity'].values())for r in rows),'notFullRecoveryComparison':True,'limits':['Four servings and one meal each do not imply the same HP endpoint as full inn recovery.','Preparation deaths retain KO targets; ordinary food never revives them.','First native source run broad story unlocks are explicit synthetic setup; natural story completion is not simulated.','Native return trips may legitimately differ after food because HP is higher.','RequestedHealing can grow while actual healed stays the same when the missing HP clamp is met.','Same crafted ingredients/costs and pre-food native HP are asserted, without replacing enemy stats/drops/food grants.'],'counts':{'beforeFailed':sum(r['beforeFailed']for r in rows),'afterFailed':sum(r['afterFailed']for r in rows),'requestedIncreased':sum(r['requestedImprovement']>0 for r in rows),'actualIncreased':sum(r['actualImprovement']>0 for r in rows),'actualEqualWithBiggerRequest':sum(r['requestedImprovement']>0 and r['actualImprovement']==0 for r in rows),'foodActualHealingBefore':sum(r['oneMealBefore']['healed']for r in rows),'foodActualHealingAfter':sum(r['oneMealAfter']['healed']for r in rows)},'rows':rows}
 a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:result[k]for k in ('nativeConditions','preMealSupplyParity','counts')},ensure_ascii=False))
if __name__=='__main__':main()
