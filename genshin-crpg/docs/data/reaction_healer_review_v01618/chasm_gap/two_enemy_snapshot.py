import os,tempfile
import pathlib,gzip,json,collections
script_dir=pathlib.Path(__file__).resolve().parent
p=pathlib.Path(os.environ.get('CRPG_AUDIT_DATA',os.environ.get('CRPG_AUDIT_OUT',pathlib.Path(tempfile.gettempdir())/'crpg-reaction-healer-review/chasm_gap')))
p.mkdir(parents=True,exist_ok=True);out={'readOnly':True,'selection':'native seed3=2 ordinary husks; seed318012461=2 husks, standard rare FEROCIOUS+CORROSIVE, matching HP but not user SWIFT+CORROSIVE. All companions Lv25 representative only.','metricsNote':'Cast counts deduplicate direct skill log packets by actor/round/actionSequence/card, exclude triggered sourceKind/presentationSourceKind; not number of hits. Ice lotus records a completely redirected enemy AI turn and explosion, no numeric decoy HP damage exists in this path; report taunt interceptions as count only.','rows':[]}
for tier in [6,10]:
 x=json.load(gzip.open(p/f'campaign_MAP_CHASM_DEEP_{tier}_native_extra.json.gz','rt'))
 for r in x['rows']:
  if r['seed'] not in [3,318012461]:continue
  b=r['battles'][0];logs=b['last']['log'];actors=b['initial']['actors'];own={a['id'] for a in actors if a['side']=='ALLY'};foenames={a['name'] for a in actors if a['side']=='ENEMY'};casts=collections.defaultdict(set)
  for e in logs:
   card=e.get('card');aid=e.get('actorId');
   if card and aid in own and not e.get('sourceKind') and not e.get('presentationSourceKind'):
    if card.startswith('PLAYER_') and aid!='PLAYER_CUSTOM':continue
    if not card.startswith('PLAYER_') and not card.startswith(aid+'_'):continue
    casts[card].add((e.get('round'),e.get('actionSequence')))
  healBy=collections.Counter()
  for e in logs:
   if e.get('heal'):healBy[e.get('actor')]+=e['heal']
  row={'name':r['name'],'enhance':tier,'talent':r['talent'],'seed':r['seed'],'victory':b['victory'],'rounds':b['rounds'],'initialEnemies':[{'source':a['source'],'level':a['level'],'hp':a['maxHp'],'atk':a['atk'],'variant':a.get('variant')} for a in actors if a['side']=='ENEMY'],'actualHeals':b['heal'],'actualHealsByActor':dict(healBy),'damageLogTotalToAllies':sum(e.get('damage',0) for e in logs if e.get('targetId') in own),'actualHpLossInDamageLogs':sum(max(0,e.get('hpBefore',0)-e.get('hpAfter',0)) for e in logs if e.get('targetId') in own and 'damage' in e),'shieldAbsorption':sum(e.get('absorbed',0) for e in logs if e.get('targetId') in own),'netHpLossAfterReward':sum(a['hp'] for a in b['before'])-sum(a['hp'] for a in b['after']),'finalHp':b['after'],'beforeRewardHp':[{'source':a['source'],'hp':a['hp'],'maxHp':a['maxHp']} for a in b['last']['actors'] if a['side']=='ALLY'],'nativeProtagonistRevivedHp':b['result'].get('protagonistRevived'),'tauntInterceptions':sum(bool(e.get('taunted')) and e.get('target')=='얼음 연꽃' for e in logs),'enemyActionSkipped':sum(bool(e.get('skipped')) and e.get('actor') in foenames for e in logs),'directSkillActionGroups':{k:len(v) for k,v in casts.items()},'reactionCounts':b['reactionCounts'],'campaignWins':r['wins'],'campaignLosses':r['losses']}
  out['rows'].append(row)
(p/'two_enemy_snapshot.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
for r in out['rows']:print(json.dumps({k:r[k] for k in ['name','enhance','seed','rounds','actualHeals','damageLogTotalToAllies','actualHpLossInDamageLogs','shieldAbsorption','netHpLossAfterReward','tauntInterceptions','enemyActionSkipped','directSkillActionGroups']},ensure_ascii=False))
