from pathlib import Path
import json,gzip,sys,collections
out=Path(sys.argv[1]).resolve()
base=Path(__file__).resolve().parent/'daily_first_access_baseline'
new=json.loads(gzip.decompress((out/'native.json.gz').read_bytes()))
old=json.loads(gzip.decompress((base/'native.json.gz').read_bytes()))
rows=[]
for nr in new['rows']:
    br=next(r for r in old['rows'] if (r['boss'],r['investment'])==(nr['boss'],nr['investment']))
    boss=nr['boss']
    ne=next(a for a in nr['initial']['actors'] if a['source']==boss)
    be=next(a for a in br['initial']['actors'] if a['source']==boss)
    initialEnemyDrift={k:{'baseline':be.get(k),'final':ne.get(k)} for k in ['level','hp','maxHp','atk','def','spd','element','grade','airborne'] if be.get(k)!=ne.get(k)}
    allyKeys=['hp','maxHp','atk','def','level','spd','range','traits']
    initialAllyDrift=[]
    for na in [a for a in nr['initial']['actors'] if a['side']=='ALLY']:
        ba=next(a for a in br['initial']['actors'] if a['source']==na['source'])
        delta={k:{'baseline':ba.get(k),'final':na.get(k)} for k in allyKeys if ba.get(k)!=na.get(k)}
        if delta:initialAllyDrift.append({'source':na['source'],'delta':delta})
    def counters(r):
        actors={a['id']:a for a in r['last']['actors'] if a['side']=='ALLY'}
        packets=[]
        for i,v in enumerate(r['last']['log']):
            if str(v.get('actorId','')).startswith(boss) and 'damage' in v and v.get('targetId') in actors:
                packets.append({'index':i,**{k:v[k] for k in ['round','actionSequence','card','cardName','sourceKind','targetId','target','damage','absorbed','hpBefore','hpAfter'] if k in v},'source':actors[v['targetId']]['source'],'actualHpLost':max(0,v.get('hpBefore',0)-v.get('hpAfter',0))})
        byCard={}
        for p in packets:
            c=p.get('card') or 'NONE'
            byCard.setdefault(c,{})
            target=p['source'];d=byCard[c].setdefault(target,{'packets':0,'hpLost':0,'absorbed':0})
            d['packets']+=1;d['hpLost']+=p['actualHpLost'];d['absorbed']+=p.get('absorbed',0)
        return {'byCard':byCard,'byTarget':dict(collections.Counter(p['source'] for p in packets)),'packets':packets}
    def result(r):
        return {'state':r['state'],'rounds':r['last']['rounds'],'inputs':r['meter']['inputs'],'seconds':r['seconds'],'hp':r['finalHpRatio'],'ko':r['ko'],'healingActual':r['meter']['heal'],'cpuSeconds':r['cpuSeconds'],'enemy':next(a for a in r['initial']['actors'] if a['source']==boss)}
    rows.append({'boss':boss,'investment':nr['investment'],'level':nr['level'],'team':nr['team'],'baseline':result(br),'final':result(nr),'operatorProfile':nr.get('operatorProfile'),'adminBalanceRevision':nr['initial'].get('adminBalanceRevision'),'dailyTargetingRevision':nr['initial'].get('dailyTargetingRevision'),'initialEnemyDrift':initialEnemyDrift,'initialAllyDrift':initialAllyDrift,'baselineTargets':counters(br),'finalTargets':counters(nr)})
report={'scope':'Frozen final source. HP candidate A excluded. Equal legal-phase/gear/talent/seed fixtures and public entry/actions. Operator official createRuntime identity profile revision0. New battle admission only, prior first-clear fixture preserved; not natural fresh-account boss unlock acquisition.','oldBaseline':str(base),'finalNative':str(out),'rows':rows}
(out/'targeting_comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
for r in rows:
    print(json.dumps({'boss':r['boss'],'investment':r['investment'],'baselineRounds':r['baseline']['rounds'],'finalRounds':r['final']['rounds'],'baselineHP':r['baseline']['hp'],'finalHP':r['final']['hp'],'finalKO':r['final']['ko'],'initialEnemyDrift':r['initialEnemyDrift'],'initialAllyDrift':r['initialAllyDrift'],'targetingRevision':r['dailyTargetingRevision'],'adminRevision':r['adminBalanceRevision'],'baselineTargets':r['baselineTargets']['byTarget'],'finalTargets':r['finalTargets']['byTarget']},ensure_ascii=False))
