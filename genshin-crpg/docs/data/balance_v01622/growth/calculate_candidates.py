import json,pathlib,math,hashlib
P=pathlib.Path(__file__).resolve().parent
ROOT=P.parents[3]
OLD=ROOT/'docs/data/full_balance_v01621/growth'
def load(path):return json.loads(path.read_text())
def normal_native(data,label):
 out=[]
 for r in data['rows']:
  keys=['level','element','kind','team','teamName','constellations','seed','limit','restBelow','enhance','talent']
  out.append(dict(key=label+json.dumps({k:r[k]for k in keys if k in r},sort_keys=True),stage=r['stage'],kind=r['kind'],wins=r['wins'],losses=r['losses'],limit=r.get('limit',3),seconds=r['seconds'],condition={k:r[k]for k in keys if k in r}))
 return out
rows=[]
for r in load(OLD/'ascension_final_comparison.json')['rows']:
 c=r['condition'];v=r['after'];rows.append(dict(key='old'+json.dumps({k:v for k,v in c.items()if k!='stage'},sort_keys=True),stage=c['stage'],kind=c['kind'],wins=v['wins'],losses=v['losses'],limit=c.get('limit',3),seconds=v['seconds'],condition=c))
for fn in ['maximum_party_baseline','pressure_candidate_native','talent_pressure_native']:
 if (P/fn/'summary.json').exists():rows.extend(normal_native(load(P/fn/'summary.json'),fn))
# Add original talent observations as a frozen independent baseline.
for r in load(OLD/'talent_comparison.json')['rows']:
 c={k:r[k]for k in ['team','constellations','seed']};v=r['after'];rows.append(dict(key='oldtalent'+json.dumps(c,sort_keys=True),stage=r['stage'],kind='TALENT',wins=v['wins'],losses=v['losses'],limit=3,seconds=v['seconds'],condition=c))
groups={}
for r in rows:groups.setdefault(r['key'],{})[r['stage']]=r
def edges(kind,stages,adjacent=False):
 out=[]
 for key,rs in groups.items():
  ss=[s for s in stages if s in rs and rs[s]['kind']==kind]
  for hi in ss:
   for lo in ss:
    if lo>=hi or adjacent and hi!=lo+5:continue
    a,b=rs[lo],rs[hi];won=all(r['wins']==r['limit']and not r['losses'] for r in [a,b]);ratio=(b['seconds']/b['wins'])/(a['seconds']/a['wins'])if won else None
    out.append(dict(key=key,low=lo,high=hi,ratio=ratio,condition=b['condition'],lowWins=a['wins'],highWins=b['wins'],lowLosses=a['losses'],highLosses=b['losses']))
 return out
def profile(kind,stages,margin,anchor=None):
 es=edges(kind,stages);q={}
 for s in stages:
  applicable=[e for e in es if e['high']==s and e['ratio']is not None];q[s]=max([1,*([q[stages[stages.index(s)-1]]]if stages.index(s)else[]),*[math.ceil(q[e['low']]*e['ratio']*margin-1e-10)for e in applicable]])
  if anchor and s in anchor:q[s]=max(q[s],anchor[s])
 return q

def assess(kind,q):
 es=edges(kind,sorted(q));good=[{**e,'factor':q[e['high']]/q[e['low']]/e['ratio']}for e in es if e['ratio']is not None];adj=[e for e in good if e['high']==e['low']+5];return dict(comparisons=len(es),successful=len(good),blocked=len(es)-len(good),noInversion=sum(e['factor']>=1-1e-10 for e in good),minFactor=min((e['factor']for e in good),default=None),adjacentSuccessful=len(adj),adjacentMinimum=min((e['factor']for e in adj),default=None),worst=sorted(good,key=lambda e:e['factor'])[:12],topMinimum=min((e['factor']for e in good if e['high']==max(q)),default=None))
asc=[5,10,15,20,25,30,35,40,45,50,55,60]
profiles={}
for margin in [1,1.05,1.1]:
 q=profile('ASCENSION',asc,margin,{5:1,10:2,15:3});profiles[str(margin)]=dict(rewards=q,costs=[3,6,2*q[30],5*q[40],8*q[50],25*q[60]],assessment=assess('ASCENSION',q))
q=profiles['1.05']['rewards'].copy();q[60]=math.ceil(q[60]/100)*100
round5=dict(rewards=q,costs=[3,6,2*q[30],5*q[40],8*q[50],25*q[60]],assessment=assess('ASCENSION',q));round5['total4']=sum(round5['costs']);round5['total5']=2*round5['total4']
talents={}
for reg,stages in [('MOND',[5,10,15,20,25]),('LIYUE',[30,35,40,45,50,55,60])]:
 q=profile('TALENT',stages,1.05);talents[reg]=dict(minimum5pct=q,assessment=assess('TALENT',q))
result=dict(scope='Arithmetic projected payouts over actual native combat/recovery timing. No projected quantity is described as an actual settled reward.',sourcesRows=len(rows),profiles=profiles,rounded5pct=round5,talentProfiles=talents)
(P/'candidate_final_arithmetic.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('ASC rounded',round5)
print('TALENT',talents)
