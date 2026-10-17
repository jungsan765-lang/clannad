import json,pathlib,math,collections
p=pathlib.Path('docs/data/full_balance_v01621/growth'); data=json.loads((p/'ascension_comparison.json').read_text())['rows']; stages=list(range(5,61,5));old={5:1,10:2,15:3,20:4,25:6,30:8,35:10,40:12,45:18,50:24,55:60,60:200}; groups={}
for r in data:
 c=r['condition'];key=json.dumps({k:v for k,v in c.items()if k!='stage'},sort_keys=True);groups.setdefault(key,{})[c['stage']]=r

def won(r):return r['after']['losses']==0 and r['after']['wins']==r['condition']['limit']
def unit(r):return r['after']['seconds']/r['after']['wins']
edges=[]
for key,rs in groups.items():
 for low in stages[:-1]:
  if low not in rs or low+5 not in rs:continue
  a,b=rs[low],rs[low+5]
  edges.append({'key':json.loads(key),'low':low,'high':low+5,'lowWon':won(a),'highWon':won(b),'timeRatio':unit(b)/unit(a)if won(a)and won(b)else None})
def quantile(vals,q):return sorted(vals)[max(0,math.ceil(q*len(vals))-1)]
def profile(q):
 v=old.copy()
 for high in stages[6:]:
  ratios=[e['timeRatio']for e in edges if e['high']==high and e['timeRatio']is not None]
  v[high]=max(v[high-5]+1,math.ceil(v[high-5]*1.1*quantile(ratios,q)))
 return v

def assess(v):
 scored=[]
 for e in edges:
  factor=v[e['high']]/v[e['low']]/e['timeRatio']if e['timeRatio']is not None else None
  scored.append({**e,'efficiencyFactor':factor,'passed10pct':factor is not None and factor>=1.1-1e-10})
 table=[]
 for high in stages[1:]:
  subset=[e for e in scored if e['high']==high];w=[e for e in subset if e['efficiencyFactor']is not None]
  table.append({'high':high,'wonPairs':len(w),'blockedByLoss':len(subset)-len(w),'pass10pct':sum(e['passed10pct']for e in w),'minFactor':min([e['efficiencyFactor']for e in w],default=None)})
 top=[]
 for key,rs in groups.items():
  if 60 not in rs:continue
  if not won(rs[60]):top.append({'key':json.loads(key),'highestWon':False,'factor':0});continue
  lower=[(s,r)for s,r in rs.items()if s<60 and won(r)]
  if not lower:continue
  low,r=max(lower,key=lambda z:v[z[0]]/unit(z[1]));factor=v[60]/unit(rs[60])/(v[low]/unit(r));top.append({'key':json.loads(key),'highestWon':True,'bestLower':low,'factor':factor})
 return {'rewards':[v[s]for s in stages],'coupledDemands':[3,6,16,5*v[40],8*v[50],25*v[60]],'adjacent':table,'highestPairs':len(top),'highestWins':sum(e['highestWon']for e in top),'highestWinsMoreEfficient':sum(e['highestWon']and e['factor']>1 for e in top),'highestWins10pctBetter':sum(e['highestWon']and e['factor']>=1.1 for e in top),'minimumHighestFactor':min([e['factor']for e in top if e['highestWon']],default=None),'pairs':scored,'highest':top}
profiles={'final_readable':dict(zip(stages,[1,2,3,4,6,8,20,35,80,180,600,1500])),'current':old,'q80':profile(.8),'q90':profile(.9),'q100':profile(1),'small_integer':dict(zip(stages,[1,2,3,4,6,8,16,24,48,96,256,600])),'rounded_90':dict(zip(stages,[1,2,3,4,6,8,20,32,64,128,360,800])),'rounded_100':dict(zip(stages,[1,2,3,4,6,8,20,32,72,160,460,1100]))}
result={'scope':'Screening arithmetic only, no native future payout claims. Each adjacent pair retains identical element/team/level/seed/gear/rest policy. Only both fully WON rows enter ratio statistics; LOSS separately retained. Rows 3 fights; highest compares best observed lower.', 'stages':stages,'groupCount':len(groups),'conditionCount':len(data),'edges':len(edges),'profiles':{name:assess(v)for name,v in profiles.items()}}
(p/'common_stage_reward_proposals.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
for name,v in result['profiles'].items():
 print(name,'rewards',v['rewards'],'demands',v['coupledDemands'],'highest',v['highestWins10pctBetter'],v['highestWins'],'minfactor',v['minimumHighestFactor'])
 print('lateadj',[(x['high'],x['pass10pct'],x['wonPairs'],round(x['minFactor'],2))for x in v['adjacent']if x['high']>=35])
