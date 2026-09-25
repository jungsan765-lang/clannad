"""Local CRPG acquisition stories. No source Traveler memory is copied to Isekai."""
import json
from pathlib import Path

def extend_recruitment(db,root,report):
 headers=db['56_MOND_LEGEND_DB'][0];node_headers=db['57_MOND_STORY_SCENE_DB'][0]
 def addflag(id,label):
  if not any(r[0]==id for r in db['23_FLAG_DB'][1:] if r):db['23_FLAG_DB'].append([id,label,'FALSE','','공통','','CRPG_V013_ORIGINAL'])
 def node(route,q,arc,id,typ,text='',next='SCREEN:CRPG_MAIN',effect='',condition='',group='',label='',profile='',name='',map='MAP_MOND_CITY'):
  values={'ROUTE_ID':route,'QUEST_ID':q,'ARC_ID':arc,'SCENE_ID':arc+'_SCENE','NODE_ID':id,'NODE_TYPE':typ,'SPEAKER_REF':profile,'SPEAKER_NAME':name,'MAP_ID':map,'TEXT_KO':text,'CHOICE_LABEL':label,'PRECONDITION':condition,'EFFECT_ON_RESOLVE':effect,'NEXT_NODE_ID':next,'CHOICE_GROUP_ID':group,'CANON_SCOPE':'CRPG_ORIGINAL','ORDER_INDEX':1,'STATUS':'ACTIVE','NOTE':'v0.13 획득 경로 보완. 재화는 공동 임무 준비물. 동행은 별도 명시 선택.'}
  r=[values.get(h,'') for h in node_headers];db['57_MOND_STORY_SCENE_DB'].append(r);return r
 entries=json.loads((root/'content/mond-isekai-recruitment-plan.json').read_text())['entries']
 details={
 'ALBEDO':['채취 지점과 표본의 번호를 맞추고, 위험한 재료는 따로 봉인했다.','관찰 기록을 끝까지 남겨 주었군. 다음 조사도 함께하면 좋겠어.'],
 'BARBARA':['구호 물품을 정리하고 다음 진료에 필요한 붕대 수량을 함께 확인했다.','진료 일정도 조정했어요. 도움이 필요한 곳에 함께 가요.'],
 'BENNETT':['파손된 모험 장비를 점검하고 돌아오는 길의 표식을 함께 확인했다.','이번엔 귀환 준비까지 완벽해! 나도 같이 가도 되지?'],
 'DIONA':['술집에 맡길 물품을 정리한 뒤 보호자에게 목적지와 귀환 시간을 알렸다.','허락도 받았어. 위험한 데로 멋대로 데려가면 안 돼!'],
 'FISCHL':['순찰 기록의 서로 다른 지명을 대조하고 오즈와 귀환 경로를 확인했다.','그대의 기록을 인정하노라. 이 여정에 황녀의 눈을 빌려주겠노라.'],
 'KAEYA':['경비대에 전달할 보고서를 분류하고 확인된 내용과 추측을 나눠 적었다.','확인되지 않은 얘기를 덧붙이지 않는군. 다음 현장에서도 부탁하지.'],
 'KLEE':['기사단이 허락한 짧은 탐사 경로를 확인하고 위험한 물건은 맡겼다.','안전한 길로 가고 꼭 돌아오기로 약속했어. 클레도 같이 가도 돼?'],
 'LISA':['반납된 책을 분류하고 분실된 기록의 대조표를 함께 마무리했다.','꼼꼼하게 해 줬네. 다음 조사에는 내가 시간을 내 줄게.'],
 'MIKA':['원정에서 돌아온 측량 담당자와 인사를 나누고 지도 기록을 대조했다.','현장 기록을 함께 확인하니 든든하네요. 다음 탐사도 동행하고 싶어요.'],
 'MONA':['도시에 머무는 점성술사와 처음 인사를 나누고 관측 기록을 함께 정리했다.','이번 관측 준비는 쓸 만했어. 다음 현장에는 나도 동행하겠어.'],
 'NOELLE':['주민들에게 전할 물품을 분류한 뒤 남은 수량과 귀환 시간을 확인했다.','오늘 할 일은 모두 마쳤어요. 다음 길은 제가 도와드릴게요.'],
 'RAZOR':['먹을 것과 야영 준비물을 나누고 숲에서 돌아오는 길의 냄새를 확인했다.','준비, 끝났다. 같이 간다. 네가 원하면.'],
 'ROSARIA':['야간 순찰 기록을 대조하고 주민들이 다니는 안전한 길을 확인했다.','여기 일은 끝났어. 다음 순찰이라면 함께할 수 있어.'],
 'SUCROSE':['분류표와 재료를 비교하며 표본의 순서를 다시 맞췄다.','저, 다음 조사도 함께해도 될까요? 기록을 나누면 더 정확해질 것 같아요.'],
 'DAHLIA':['성당 봉사 일정을 정리하고 물품을 맡길 곳까지 확인했다.','서로 맡은 일을 잘 마쳤네요. 다음 도움도 함께 나누고 싶어요.']}
 for e in entries:
  ids=e['proposed_ids'];id=ids['legend_id'];q=ids['quest_id'];route='ROUTE_ISEKAI';key=e['char_id'].removeprefix('MOND_');d={h:'' for h in headers}
  d.update({'LEGEND_ID':id,'QUEST_ID':q,'REGION':'몬드','PROFILE_ID':e['profile_id'],'CHAR_ID':e['char_id'],'DISPLAY_NAME':e['display_name']+' · '+e['daily_activity'],'ROUTE_SCOPE':route,'MAP_ID':e['start_requirements']['map_id'],'STATUS':'ACTIVE','MAIN_FLAG_GATE':'FLAG_ISK_M05_CLEAR','START_CONDITION':f'ROUTE_ID=ROUTE_ISEKAI && FLAG_ISK_M05_CLEAR=TRUE && DONE(Q_ISK_MOND_03)=TRUE && {ids["complete_flag"]}=FALSE','ENTRY_NODE_ID':ids['entry_node'],'COST_COMMIT_NODE_ID':ids['cost_node'],'COMPLETE_FLAG_ID':ids['complete_flag'],'RECRUIT_FLAG_ID':ids['recruit_flag'],'RECRUIT_MODE':'LEGEND_OPT_IN','COST_MORA':e['cost']['mora'],'COST_ITEMS_JSON':json.dumps(e['cost']['items']),'DAILY_ACTIVITY':e['daily_activity'],'DAILY_DIALOGUE_KO':details[key][1],'AGE_CLASS':e['source']['age_class'],'AFFECTION_KIND':e['source']['affection_kind'],'REWARD_JSON':json.dumps({'bond_delta':10,'card_on_accept_only':True}),'NOTE':'v0.13 CRPG 신규 공동 의뢰. 여행자의 개인 기억을 이세계 루트로 복제하지 않음.'})
  db['56_MOND_LEGEND_DB'].append([d.get(h,'') for h in headers]);addflag(ids['complete_flag'],e['display_name']+' 공동 의뢰 완료');addflag(ids['recruit_flag'],e['display_name']+' 동행 수락')
  db['22_QUEST_DB'].append([q,d['DISPLAY_NAME'],'몬드',e['profile_id'],d['START_CONDITION'],e['daily_activity'],'공동 준비와 현장 확인 후 동행 선택','','','CRPG_ORIGINAL',json.dumps({'kind':'legend','entry_node':ids['entry_node'],'map_id':d['MAP_ID']}),d['REWARD_JSON'],'READY','CRPG_V013'])
  def n(suffix,typ,text='',nxt='SCREEN:CRPG_MAIN',effect='',condition='',group='',label=''):
   return node(route,q,id,id+'_'+suffix,typ,text,nxt,effect,condition,group,label,e['profile_id'],e['display_name'],d['MAP_ID'])
  n('START','DIALOGUE',e['daily_activity']+'을 함께 준비하자는 의뢰를 받았다. 준비물은 이번 공동 작업에 사용된다.','CHOICE_GROUP:'+id+'_PREP',condition=d['START_CONDITION'])
  n('PREP_ACCEPT','CHOICE',nxt=id+'_WORK',effect='LEGEND_ACCEPT_AND_PAY:'+q,group=id+'_PREP',label='준비물을 마련하고 의뢰 수락')
  n('PREP_LATER','CHOICE',group=id+'_PREP',label='다음에 준비하기')
  special=''
  if key=='MIKA':special='FLAG_MOND_MIKA_RETURNED=TRUE'
  if key=='MONA':special='FLAG_MOND_MONA_PRESENT=TRUE'
  n('WORK','NARRATION',details[key][0],'CHOICE_GROUP:'+id+'_CHECK_GROUP',special)
  n('CHECK','CHOICE',nxt=id+'_COMPLETE',group=id+'_CHECK_GROUP',label='정리한 내용과 귀환 계획을 함께 확인')
  # A narrative prompt precedes the final explicit task check.
  n('COMPLETE','DIALOGUE',details[key][1],'CHOICE_GROUP:'+id+'_JOIN','COMPLETE_LEGEND:'+q)
  n('JOIN_ACCEPT','CHOICE',effect='UNLOCK_CARD_ONCE:'+e['char_id']+':'+ids['recruit_flag'],group=id+'_JOIN',label='함께 동행하자')
  n('JOIN_LATER','CHOICE',group=id+'_JOIN',label='지금은 따로 움직이자 · 나중에 다시 제안')
  for level in range(1,6):
   aid='AFF_ISK_MOND_'+key+'_H0'+str(level);prev='AFF_ISK_MOND_'+key+'_H0'+str(level-1) if level>1 else '';ah=db['58_MOND_AFFECTION_DB'][0]
   title=['함께 남긴 기록','서로의 준비','각자의 일정','다음 길의 약속','믿고 맡기는 동행'][level-1]
   condition='ROUTE_ID=ROUTE_ISEKAI && DONE('+q+')=TRUE && BOND_SCORE('+e['profile_id']+')>='+str(level*20)+((' && DONE('+prev+')=TRUE') if prev else '')
   if level in [3,5]:condition+=' && AFTER_PRIOR_DAILY('+prev+')=TRUE'
   adef={'EVENT_ID':aid,'PROFILE_ID':e['profile_id'],'ROUTE_SCOPE':route,'DISPLAY_NAME':e['display_name']+' · '+title,'ENTRY_NODE_ID':aid+'_START','MAP_ID':d['MAP_ID'],'REQUIRED_QUEST_ID':q,'REQUIRED_FLAGS':'[]','PREV_EVENT_ID':prev,'HEART_MIN':level,'BOND_SCORE_MIN':level*20,'BOND_SCORE_CAP':100,'RELATION_KIND':next((dict(zip(ah,r)).get('RELATION_KIND') for r in db['58_MOND_AFFECTION_DB'][1:] if r and r[1]==e['profile_id'] and r[0].endswith('_H01')),'PERSONAL_BOND_NON_SEXUAL'),'STATUS':'ACTIVE','DAILY_ACTIVITY_KEY':title,'ADULT_SCENE_POLICY':'NONSEXUAL','CANON_SCOPE':'CRPG_ORIGINAL'}
   db['58_MOND_AFFECTION_DB'].append([adef.get(h,'') for h in ah])
   text=['지난 공동 의뢰의 기록을 펼쳐 서로 기억하는 부분을 확인했다.','다음 길에 필요한 준비물을 함께 점검했다. 물건을 더 사거나 넘길 필요는 없었다.','서로에게 먼저 해야 할 일이 있다는 걸 이야기했다. 각자의 일정을 존중하기로 했다.','돌아오는 길과 다음에 만날 시간을 함께 정했다. 무리한 약속은 하지 않았다.','지금까지 함께 쌓은 경험을 돌아보았다. 서로의 판단을 믿되, 도움이 필요하면 말하기로 약속했다.'][level-1]
   node(route,aid,aid,aid+'_START','DIALOGUE',text,'CHOICE_GROUP:'+aid+'_RESPONSE',condition=condition,profile=e['profile_id'],name=e['display_name'],map=d['MAP_ID'])
   node(route,aid,aid,aid+'_AGREE','CHOICE',next=aid+'_END',group=aid+'_RESPONSE',label='고개를 끄덕이며 이야기를 잇는다',profile=e['profile_id'],name=e['display_name'],map=d['MAP_ID'])
   node(route,aid,aid,aid+'_LISTEN','CHOICE',next=aid+'_END',group=aid+'_RESPONSE',label='상대의 이야기를 더 듣는다',profile=e['profile_id'],name=e['display_name'],map=d['MAP_ID'])
   node(route,aid,aid,aid+'_END','NARRATION','짧은 대화를 마치고 각자의 일로 돌아갔다. 다음 동행에서도 오늘 나눈 이야기를 기억할 것이다.',effect='COMPLETE_AFFECTION:'+aid,map=d['MAP_ID'])
 # Every completed non-archon legend has a separate, free rejoin entry.
 defs=[dict(zip(headers,r)) for r in db['56_MOND_LEGEND_DB'][1:] if r]
 for d in defs:
  char=d.get('CHAR_ID');id=d['LEGEND_ID'];route=d['ROUTE_SCOPE'];q=d['QUEST_ID'];profile=d['PROFILE_ID'];name=next((r[2] for r in db['04_CHAR_DB'][1:] if r and r[0]==profile),d['DISPLAY_NAME'])
  if char in ['MOND_VENTI','LIYUE_ZHONGLI']:continue
  start=id+'_REJOIN_START'
  if any(len(r)>4 and r[0]==route and r[4]==start for r in db['57_MOND_STORY_SCENE_DB'][1:]):continue
  flag=d.get('RECRUIT_FLAG_ID') or 'FLAG_CRPG_'+route.removeprefix('ROUTE_')+'_JOIN_'+char
  if flag!=d.get('RECRUIT_FLAG_ID'):
   row=next(r for r in db['56_MOND_LEGEND_DB'][1:] if r if r[0]==id);row[headers.index('RECRUIT_FLAG_ID')]=flag
  addflag(flag,name+' 동행 수락');map=d['MAP_ID'];group=id+'_REJOIN_PROPOSAL'
  node(route,q,id,start,'DIALOGUE','함께 마친 의뢰 이야기를 나눈 뒤, 서로의 일정을 다시 확인했다. 준비 비용을 다시 낼 필요는 없다.','CHOICE_GROUP:'+group,condition='DONE('+q+')=TRUE',profile=profile,name=name,map=map)
  node(route,q,id,id+'_REJOIN_ACCEPT','CHOICE',next='SCREEN:CRPG_MAIN',effect='UNLOCK_CARD_ONCE:'+char+':'+flag,group=group,label='동행 제안을 수락한다',profile=profile,name=name,map=map)
  node(route,q,id,id+'_REJOIN_LATER','CHOICE',next='SCREEN:CRPG_MAIN',group=group,label='이번에는 각자의 일을 하자',profile=profile,name=name,map=map)
 # Yaoyao: source future-tense permission is followed by an actual confirmation scene.
 for route,prefix in [('ROUTE_TRAVELER','LEG_LIYUE_YAOYAO'),('ROUTE_ISEKAI','LEG_ISK_LIYUE_YAOYAO')]:
  rows=[r for r in db['57_MOND_STORY_SCENE_DB'][1:] if len(r)>4 and r[0]==route]
  r=next(r for r in rows if r[4]==prefix+'_N036');nxt=r[13];r[13]=prefix+'_GUARDIAN_CONFIRM'
  node(route,r[1],prefix,prefix+'_GUARDIAN_CONFIRM','NARRATION','요요가 사부와 돌아와 여행 범위를 확인했다. 일행은 위험 지역을 피하고, 약속한 때에 돌아오기로 했다. 요요도 이 계획에 동의했다.',nxt,'FLAG_CRPG_YAOYAO_TRAVEL_APPROVED=TRUE',profile='PROFILE_LIYUE_YAOYAO',name='',map=r[8])
  for r in rows:
   if r[4]==prefix+'_REJOIN_N003':r[12]+=';FLAG_CRPG_YAOYAO_TRAVEL_APPROVED=TRUE'
   if 'UNLOCK_CARD_ONCE:LIYUE_YAOYAO' in str(r[12]):r[11]='FLAG_CRPG_YAOYAO_TRAVEL_APPROVED=TRUE'
 addflag('FLAG_CRPG_YAOYAO_TRAVEL_APPROVED','요요의 보호자·여행 범위 확인')
 for id,name in [('MAT_LIYUE_QINGXIN','청심'),('MAT_LIYUE_VIOLETGRASS','유리주머니')]:
  if not any(r and r[0]==id for r in db['14_ITEM_DB'][1:]):db['14_ITEM_DB'].append([id,name,'지역 특산물','일반','[식물]','리월의 높은 산길에서 채집하는 식물.','재료','',0,'','N','공용','','',20,0,999,'절운간 채집','Y','N','리월','CRPG 채집 배치 · 공식 명칭 확인',''])
 for r in db['32_MAP_DB'][1:]:
  if r and r[0]=='MAP_LIYUE_JUEYUN':r[25]='MAT_LIYUE_QINGXIN:3-5@45;MAT_LIYUE_VIOLETGRASS:3-5@45;ING_MINT:3-5@10'
 source=next(r for r in db['51_EVENT_DB'][1:] if r and r[0]=='EVT_SCHEDULE_NPC_MOND_KATHERYNE');row=source[:];data=json.loads(row[13]);data.update({'entity_id':'NPC_LIYUE_KATHERYNE','merchant_id':None,'label':'모험가 길드 · 캐서린','facility':'모험가 길드','map_ids':['MAP_LIYUE_HARBOR'],'from_minute':0,'to_minute':1440});row[0]='EVT_CRPG_LIYUE_GUILD';row[13]=json.dumps(data,ensure_ascii=False);db['51_EVENT_DB'].append(row)
 report['localRecruitment']={'newIsekaiLegends':len(entries),'newIsekaiGeneralAffections':len(entries)*5,'freeRejoinForAllNonArchons':True,'guardianConfirmationScenes':2,'authorship':'CRPG_ORIGINAL'}
