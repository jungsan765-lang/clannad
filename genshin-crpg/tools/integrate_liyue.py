#!/usr/bin/env python3
"""Compile the pinned Liyue manuscript into the established execution tables.
Raw authoring archives remain immutable. No user SAVE or Google Sheet is written.
"""
import json,gzip,re,copy,subprocess,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
raw=json.load(gzip.open(ROOT/'content/archive/source-20260924-185000.json.gz','rt'))
# Re-run against the exact previously shipped database, never compound an overlay.
base=json.load(gzip.open(ROOT/'content/archive/base-v012-redacted.json.gz','rt'))
db=copy.deepcopy(base);report={'source':'source-20260924-185000.json.gz','tables':{},'normalizations':[],'staged':[]}
def objects(name):return [dict(zip(raw[name][0],r)) for r in raw[name][1:] if r and r[0]]
def append(name,rows):
 seen={r[0] for r in db[name] if r}
 added=[copy.deepcopy(r) for r in rows if r and r[0] and r[0] not in seen]
 db[name].extend(added);report['tables'][name]=len(added)
for n in ['22_QUEST_DB','23_FLAG_DB','32_MAP_DB','33_ENCOUNTER_GROUP_DB','49_ENCOUNTER_MEMBER_DB','09_MONSTER_DB','12_ENEMY_CARD_DB','47_MAP_EDGE_DB']:
 append(n,raw[n][1:])
# Events are static definitions; current operation receipts are deliberately not imported.
append('51_EVENT_DB',raw['51_EVENT_DB'][1:])
def addflag(id,label):
 if not any(r and r[0]==id for r in db['23_FLAG_DB']):db['23_FLAG_DB'].append([id,label,'FALSE','','리월','','V013_LOCAL_EXECUTION'])
legends={d['LEGEND_ID']:d for d in objects('59_LIYUE_LEGEND_DB')}
LIYUE_RECRUIT_STAGE={
 'LIYUE_XIANGLING':1,'LIYUE_XINGQIU':1,'LIYUE_CHONGYUN':1,'LIYUE_YAOYAO':1,'LIYUE_GAMING':1,'LIYUE_XINYAN':1,'LIYUE_YANFEI':1,'LIYUE_YUNJIN':1,'LIYUE_LANYAN':1,'LIYUE_XIAO':1,'LIYUE_BEIDOU':1,'LIYUE_HUTAO':1,
 'LIYUE_KEQING':2,'LIYUE_QIQI':2,'LIYUE_YELAN':2,'LIYUE_GANYU':2,
 'LIYUE_TARTAGLIA':3,
 'LIYUE_NINGGUANG':4,'LIYUE_BAIZHU':4,'LIYUE_SHENHE':4,'LIYUE_XIANYUN':4,'LIYUE_ZIBAI':4
}
affections={d['EVENT_ID']:d for d in objects('61_LIYUE_AFFECTION_DB') if re.search(r'_H0[1-5]$',d['EVENT_ID'])}
for d in legends.values():
 isk=d['ROUTE_SCOPE']=='ROUTE_ISEKAI';id=d['LEGEND_ID'];char=d['CHAR_ID']
 if isk:
  d['STATUS']='ACTIVE';d['MAIN_FLAG_GATE']='FLAG_ISK_L04_REGION_CLEAR'
  d['COMPLETE_FLAG_ID']='FLAG_'+id+'_CLEAR';d['RECRUIT_FLAG_ID']='FLAG_ISK_CARD_'+char.removeprefix('LIYUE_') if char!='LIYUE_ZHONGLI' else ''
  d['RECRUIT_MODE']='ARCHON_OCULUS_ONLY' if char=='LIYUE_ZHONGLI' else 'LEGEND_OPT_IN'
  d['START_CONDITION']='ROUTE_ID=ROUTE_ISEKAI && LIYUE_PERSONAL_READY=TRUE && '+d['COMPLETE_FLAG_ID']+'=FALSE'
  if char=='LIYUE_ZIBAI':d['START_CONDITION']+=' && FLAG_WORLD_ZIBAI_RETURNED=TRUE'
  if not d.get('MAP_ID'):d['MAP_ID']='MAP_LIYUE_HARBOR'
  d['START_CONDITION']+=' && CURRENT_MAP_ID='+d['MAP_ID']
  d['REWARD_JSON']=json.dumps({'card_on_accept_only':char!='LIYUE_ZHONGLI','recruit_flag_if_accepted':d['RECRUIT_FLAG_ID'],'duplicate_card_policy':'SKIP','bond_delta':10})
 # Non-Archon recruitment opens in chapter-sized waves instead of waiting for the region finale.
 # Zhongli keeps the separate Geo-oculus/final-offering rule.
 if char!='LIYUE_ZHONGLI':
  stage=LIYUE_RECRUIT_STAGE.get(char,4);prefix='Q_ISK_LIYUE_' if isk else 'Q_TRV_LIYUE_'
  d['MAIN_FLAG_GATE']='';d['START_CONDITION']='ROUTE_ID='+d['ROUTE_SCOPE']+' && DONE('+prefix+str(stage).zfill(2)+')=TRUE && '+d['COMPLETE_FLAG_ID']+'=FALSE'
  if char=='LIYUE_ZIBAI':d['START_CONDITION']+=' && FLAG_WORLD_ZIBAI_RETURNED=TRUE'
  d['START_CONDITION']+=' && CURRENT_MAP_ID='+d['MAP_ID']
 for key in ['COMPLETE_FLAG_ID','RECRUIT_FLAG_ID']:
  if d.get(key):addflag(d[key],d['DISPLAY_NAME']+(' 개인 임무 완료' if key=='COMPLETE_FLAG_ID' else ' 동행 수락'))
 if not any(r and r[0]==d['QUEST_ID'] for r in db['22_QUEST_DB']):
  db['22_QUEST_DB'].append([d['QUEST_ID'],d['DISPLAY_NAME']+' · 개인 임무','리월',d['PROFILE_ID'],d['START_CONDITION'],d.get('DAILY_ACTIVITY',''), '개인 임무 완료 후 동행 선택','','','V013_LIYUE_PERSONAL_HANDOFF',json.dumps({'kind':'legend','entry_node':d['ENTRY_NODE_ID'],'map_id':d['MAP_ID']}),d['REWARD_JSON'],'READY','59_LIYUE_LEGEND_DB'])
 db['56_MOND_LEGEND_DB'].append([d.get(h,'') for h in db['56_MOND_LEGEND_DB'][0]])
for d in affections.values():
 d['STATUS']='ACTIVE';d['BOND_SCORE_MIN']=int(d['EVENT_ID'][-1])*20
 # These are exclusively authored H01–H05 general scenes. Draft strings such
 # as CHILD_BLOCK_ALL_ADULT describe exclusion, not an adult scene category.
 d['ADULT_SCENE_POLICY']='NONSEXUAL'
 if d['PROFILE_ID']=='PROFILE_LIYUE_YAOYAO':d['RELATION_KIND']='FRIENDSHIP_CHILD_SAFE'
 elif d.get('RELATION_KIND') not in ['PERSONAL_BOND','PERSONAL_BOND_NON_SEXUAL','FRIENDSHIP_CHILD_SAFE']:d['RELATION_KIND']='PERSONAL_BOND_NON_SEXUAL'
 if not isinstance(d.get('REQUIRED_FLAGS'),str) or 'FUTURE' in str(d.get('REQUIRED_FLAGS')):d['REQUIRED_FLAGS']='[]'
 db['58_MOND_AFFECTION_DB'].append([d.get(h,'') for h in db['58_MOND_AFFECTION_DB'][0]])
flagchars={d['RECRUIT_FLAG_ID']:d['CHAR_ID'] for d in legends.values() if d.get('RECRUIT_FLAG_ID')}
allpersonal=copy.deepcopy(raw['60_LIYUE_STORY_SCENE_DB'][1:]);active=[]
# Basic personal arcs plus authored free rejoin. Upper scenes remain in immutable source,
# until their separate scene-asset verification has been completed.
for r in allpersonal:
 if any(re.search(r'_H(?:110|120)(?:_|$)',str(r[k] or '')) for k in [1,2,3,4]):report['staged'].append(r[4]);continue
 d=next((v for v in legends.values() if v['QUEST_ID']==r[1] and r[0]==v['ROUTE_SCOPE']),None)
 aff=next((v for id,v in affections.items() if str(r[4]).startswith(id+'_')),None)
 if not d and aff:d=legends.get(aff['REQUIRED_QUEST_ID'].removeprefix('Q_'))
 if not d:raise ValueError('Unscoped personal node '+str(r[4]))
 r[18]='ACTIVE'
 # Authored entry availability is replaced with the actual same-save handoff contract.
 if r[4]==d['ENTRY_NODE_ID']:r[11]=d['START_CONDITION']
 elif '_REJOIN_START' in str(r[4]):r[11]=d['COMPLETE_FLAG_ID']+'=TRUE && '+(d['RECRUIT_FLAG_ID']+'=FALSE' if d.get('RECRUIT_FLAG_ID') else 'FALSE')
 elif aff and r[4]==aff['ENTRY_NODE_ID']:
  prev=aff.get('PREV_EVENT_ID');r[11]='ROUTE_ID='+r[0]+' && LIYUE_PERSONAL_READY=TRUE && DONE('+d['QUEST_ID']+')=TRUE && BOND_SCORE('+d['PROFILE_ID']+')>='+str(aff['BOND_SCORE_MIN'])
  if prev:r[11]+=' && DONE('+prev+')=TRUE'
  if prev and any(t in str(next((v[11] for v in allpersonal if v[4]==r[4]),'')) for t in ['DAILY','WORLD_DAY']):r[11]+=' && AFTER_PRIOR_DAILY('+prev+')=TRUE'
 # Actual branch-dependent conditions below entry stay intact. Draft bookkeeping aliases
 # are translated into concrete completed/card receipts, never treated as unconditional.
 c=str(r[11] or '')
 c=re.sub(r'FUTURE_PERSONAL_WINDOW_VERIFIED_BY_MAIN_STORY_HANDOFF=TRUE(?: && FUTURE_MAIN_HANDOFF_BRANCH_RECEIPT_VERIFIED)?','LIYUE_PERSONAL_READY=TRUE',c)
 c=re.sub(r'FUTURE_RECEIPT_LEG_ISK_LIYUE_(\w+)_COMPLETED_UNREGISTERED','FLAG_LEG_ISK_LIYUE_\\1_CLEAR',c)
 c=re.sub(r'FUTURE_RECEIPT_ISK_CARD_(\w+)_ACCEPTED_UNREGISTERED','FLAG_ISK_CARD_\\1',c)
 c=re.sub(r'BOND_SCORE:(PROFILE_\w+)',r'BOND_SCORE(\1)',c);c=re.sub(r'ONCE:(\w+)',r'DONE(\1)',c)
 c=c.replace('AFFECTION_DONE(','DONE(').replace('PROPOSED_CHECK:','').replace('CUR_MORA','MORA')
 c=re.sub(r'ITEM:(\w+)',r'ITEM(\1)',c)
 if c=='DRAFT_ONLY|YAOYAO_GUARDIAN_TRAVEL_REVIEW_UNSPECIFIED':c='FLAG_CRPG_YAOYAO_TRAVEL_APPROVED=TRUE';addflag('FLAG_CRPG_YAOYAO_TRAVEL_APPROVED','보호자와 여행 범위 확인')
 r[11]=c
 out=[]
 for token in str(r[12] or '').split(';'):
  t=token.strip()
  if not t:continue
  if t in ['RETRY_ALLOWED','NO_HEART','NO_PROGRESS','NO_LEGEND_REWARD','NO_RECRUIT_NOW','NO_HEART_CHANGE','NO_REWARD','PRESERVE_REJOIN_ELIGIBILITY','PROPOSE_BOND_SCORE_PLUS_20','NO_COST','NO_AUTO_CARD','NO_MAIN_QUEST_CLEAR','NO_EXTRA_HEART','NO_CARD_NO_PENALTY','CHOICE_REACTION_ONLY','DRAFT_ONLY_NO_SAVE','NO_COST_NO_CARD','NO_COST_NO_PROGRESS']:out.append('NO_PENALTY');continue
  if t.startswith(('PROPOSED_ATOMIC_COST_ONCE:','DRAFT_ONLY_COST_COMMIT_ONCE:')):t='LEGEND_ACCEPT_AND_PAY:'+d['QUEST_ID'];d['COST_COMMIT_NODE_ID']=r[4]
  elif t.startswith(('PROPOSED_CARD_ON_EXPLICIT_ACCEPT:','DRAFT_RECRUIT_REQUEST:','DRAFT_ONLY_CARD_ONCE:','DRAFT_ONLY:RECRUIT_ON_EXPLICIT_ACCEPT_WHEN_ROUTE_FLAGS_EXIST:')):t='UNLOCK_CARD_ONCE:'+d['CHAR_ID']+':'+d['RECRUIT_FLAG_ID']
  elif t.startswith('UNLOCK_CARD:'):t='UNLOCK_CARD_ONCE:'+d['CHAR_ID']+':'+d['RECRUIT_FLAG_ID']
  elif t.startswith('ADD_CARD_IF_MISSING:'):
   flag=t.split(':')[1];t='UNLOCK_CARD_ONCE:'+flagchars[flag]+':'+flag
  elif t.startswith(('DRAFT_COMPLETE_LEGEND:','DRAFT_ONLY_COMPLETE_LEGEND:','DRAFT_ONLY:COMPLETE_LEGEND:')):t='COMPLETE_LEGEND:'+d['QUEST_ID']
  elif t.startswith(('DRAFT_COMPLETE_AFFECTION:','DRAFT_ONLY_COMPLETE_AFFECTION:','PROPOSED:COMPLETE_AFFECTION:')):t='COMPLETE_AFFECTION:'+t.split(':')[-1]
  elif t.startswith(('DRAFT_ADD_HEART:','DRAFT_ONLY_ADD_HEART:','DRAFT_ONLY_RECEIPT_UNREGISTERED:')):t='NO_PENALTY'
  elif t.startswith(('PROPOSED_FLAG_ON_ACTUAL_COMPLETION:','PROPOSED:FLAG_LEG_')):t='COMPLETE_LEGEND:'+d['QUEST_ID']
  elif t.startswith('SET_FLAG:'):
   t=t.removeprefix('SET_FLAG:');t=t if '=' in t else t+'=TRUE'
  if t.startswith('SCENE_MEMORY:') and t.count(':')>=2:
   parts=t.split(':',2);t='LOCAL_CHOICE:'+parts[1]+':'+parts[2]
  if t.startswith('LEGEND_ACCEPT_AND_PAY:'):d['COST_COMMIT_NODE_ID']=r[4]
  if t=='COMPLETE_QUEST:'+d['QUEST_ID']:t='COMPLETE_LEGEND:'+d['QUEST_ID']
  if t==d['COMPLETE_FLAG_ID']+'=TRUE':t='COMPLETE_LEGEND:'+d['QUEST_ID']
  out.append(t)
 r[12]=';'.join(dict.fromkeys(out));active.append(r)
# One compilation table, retaining original NODE_ID/route/quest and source archive.
db['57_MOND_STORY_SCENE_DB'].extend(active)
for d in legends.values():
 row=next(r for r in db['56_MOND_LEGEND_DB'] if r[0]==d['LEGEND_ID']);row[12]=d['COST_COMMIT_NODE_ID']
main=[copy.deepcopy(r) for r in raw['55_MAIN_STORY_DB'][1:] if r and re.match(r'Q_(?:TRV|ISK)_LIYUE_',str(r[1]))]
events={r[0]:json.loads(r[13] or '{}') for r in raw['51_EVENT_DB'][1:] if r and len(r)>13 and r[13]}
for r in main:
 r[11]=re.sub(r'QUEST_ACCEPTED:(\w+)',r'QUEST_ACCEPTED(\1)',str(r[11] or ''));r[11]=re.sub(r'ENCOUNTER_WON:(\w+)',r'ENCOUNTER_WON(\1)',r[11])
 r[12]=str(r[12] or '').replace('SET_FLAG:','')
 if r[5]=='COMBAT_GATE' and r[0]=='ROUTE_ISEKAI':
  id=re.search(r'EVENT:(\w+)',r[12])[1];p=events[id];r[12]='START_FIXED_COMBAT:'+p['encounter_group_id']+';ON_VICTORY:EVENT:'+id+';ON_DEFEAT:RETRY_SAME_NODE'
 db['55_MAIN_STORY_DB'].append(r)
# A missing DEFAULT=NONE must remain distinct from FALSE.
report['compiled']={'mainNodes':len(main),'personalNodes':len(active),'legends':len(legends),'basicAffections':len(affections)}
from recruitment_content import extend_recruitment
extend_recruitment(db,ROOT,report)
from patch_mond_recruitment_v0131 import patch as patch_mond_recruitment
report['mondRecruitmentV0131']=patch_mond_recruitment(db)
(ROOT/'content/db.json').write_text(json.dumps(db,ensure_ascii=False,separators=(',',':')))
# Retain the local protagonist update after regenerating the released content.
import runpy
runpy.run_path(str(ROOT/'tools/update_protagonist_content.py'),run_name='__main__')
manifest_path=ROOT/'content/source-manifest.json'
manifest=json.loads(manifest_path.read_text())
manifest['playableRollout']={
 'latestSourceArchived':'archive/source-20260924-185000.json.gz',
 'version':'0.13.0',
 'activeExpansion':'Liyue main chapters 1–4, 46 route-specific personal quests, 230 basic affection scenes and 57 card handlers. Adds 15 original Mond Isekai recruitment quests and 75 basic affection scenes.',
 'stagedExpansion':'New Liyue H110/H120 scenes remain in the immutable archive pending separate scene asset verification. Other future regions and unsupported boss routes remain unavailable.',
 'localPatchSpecification':'Reproducible tools/integrate_liyue.py against released v0.12 commit 193b9b906eb300200c4e8b210606d2735a463282 plus pinned source. Local Geo exploration, recruitment/rejoin, Zibai return and lunar adapter are documented in reports/REVISION_0_13_KO.md. Raw source and user saves are not modified.',
 'playableDbSha256':hashlib.sha256((ROOT/'content/db.json').read_bytes()).hexdigest()
}
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')))
(ROOT/'reports/liyue-content-compile.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report['compiled']))
