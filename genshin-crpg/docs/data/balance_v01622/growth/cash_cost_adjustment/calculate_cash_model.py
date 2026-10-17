import pathlib,json,math,hashlib
P=pathlib.Path(__file__).resolve().parents[1]
ns={'__file__':str(P/'calculate_candidates.py')}
src=(P/'calculate_candidates.py').read_text();exec(src[:src.index('asc=[5,10')],ns)
load,normal,groups=ns['load'],ns['normal_native'],ns['groups'];raw={}
for x in load(ns['OLD']/'ascension_final_comparison.json')['rows']:
 c=x['condition'];key='old'+json.dumps({k:v for k,v in c.items()if k!='stage'},sort_keys=True);raw[(key,c['stage'])]={**c,**x['after']}
labels=['maximum_party_baseline','pressure_candidate_native','talent_pressure_native','representative_before_final_rules_native','release_final_native']
for label in labels:
 xs=load(P/label/'summary.json')['rows']
 for x in xs:
  n=normal({'rows':[x]},label)[0];raw[(n['key'],n['stage'])]=x
  if label in labels[-2:]:groups.setdefault(n['key'],{})[n['stage']]=n
selected={5:1,10:2,15:3,20:10,25:32,30:47,35:105,40:153,45:318,50:642,55:1932,60:5400}
base=ns['assess']('ASCENSION',selected);cashRows=[]
for key,rs in groups.items():
 for stage,row in rs.items():
  if row['kind']!='ASCENSION':continue
  x=raw[(key,stage)];mora=[m for lv,m in [(5,1800),(10,5000),(25,14000),(40,27000),(55,40000)] if lv<=x['level']][-1]
  known='finalWallet' in x;cash=max(0,x.get('startingMora',200000)-x['finalWallet']) if known else x.get('lodgingMora',0)
  added=cash/mora*120;row['originalSeconds']=row['seconds'];row['seconds']+=added
  cashRows.append(dict(key=key,stage=stage,level=x['level'],originalSeconds=row['originalSeconds'],adjustedSeconds=row['seconds'],cashCost=cash,legalWealthMora=mora,addedCashProxySeconds=added,basis='native wallet net, travel earnings credited' if known else 'old compact ledger lacks wallet: gross lodging is conservative upper bound'))
proxy=ns['assess']('ASCENSION',selected);derived=ns['profile']('ASCENSION',sorted(selected),1.005,{5:1,10:2,15:3,20:10,25:32});requiredTop=derived[60];derived[60]=5400;assert derived==selected
assert base['successful']==1876 and proxy['successful']==1876 and base['noInversion']==1876 and proxy['noInversion']==1876 and proxy['minFactor']>=1.005 and proxy['topMinimum']>=1.05
sources=[ns['OLD']/'ascension_final_comparison.json',*[P/n/'summary.json' for n in labels]]
out={'schema':1,'scope':'Projected current ascension quantities over frozen successful native timings, plus declared amortized cash-replenishment120-second proxy per legal highest wealth-blossom payout. This is arithmetic/sensitivity, NOT actual same-account wealth farming or full economy/time guarantee. Old compact255 data lack wallets: gross lodging upper bound retained. New actual wallets credit travel Mora. No entry limits, enemy weakening, or fabricated wins.','selected':selected,'costs4':[3,6,94,765,5136,135000],'total4':141004,'total5':282008,'requirementWinReference':[2,2,2,5,8,25],'highestFourWins':25,'highestFiveWins':50,'highestOldStockContribution':37500/135000,'countExplanation':'1866 earlier completed comparisons plus10 completed lower pairs from finalK35 native16 representatives=1876.42 earlier blocked+1 finalK35 blocked=43. Different snapshots remain separate group keys.','cashModel':{'secondsPerLegalWealthClaim':120,'moraByMinPlayerLevel':[[5,1800],[10,5000],[25,14000],[40,27000],[55,40000]],'sameAccountActualWealthMeasured':False,'excluded':['extra wealth travel/lodging/defeat cost','hourly calendar quota and available cash liquidity','full story unlock, ownership, ingredients and completed cultivation calendar']},'unadjusted':base,'cashAdjusted':proxy,'deriveMinimumTopAt005':requiredTop,'cashRows':cashRows,'sources':[{'path':str(f.relative_to(ns['ROOT'])),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in sources]}
pathlib.Path(__file__).with_name('cash_model.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'minProxyFactor':proxy['minFactor'],'highestProxyFactor':proxy['topMinimum'],'successful':proxy['successful'],'blocked':proxy['blocked'],'total4':141004}))
