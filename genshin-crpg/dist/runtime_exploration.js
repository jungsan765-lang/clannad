/* Build-local v0.9 commissions and exploration. Load after runtime_adventure.js.
 * The pinned content snapshot and existing story/edge definitions stay intact.
 */
(function(root){
 'use strict';
 const api=root.CRPGRuntime,P=api.Runtime.prototype;
 if(P.explorationVersion)return;
 const old=Object.fromEntries(['newGame','validateSave','apply','actionReason','questConditions','questChoice','claimQuest','commissionEntries','view'].map(k=>[k,P[k]]));
 const copy=x=>JSON.parse(JSON.stringify(x)),json=x=>{try{return JSON.parse(x||'{}');}catch{return {};}};
 const yes=x=>x===true||x==='Y'||x==='TRUE',fail=(code,message)=>{throw new api.RuleError(code,message);};
 const ITEM='KEY_CRPG_ANEMOCULUS',OWNED='FLAG_CRPG_VENTI_OCULUS_OWNED';
 const levels={Q_CRPG_MOND_FIRST_FIELD:1,Q_MOND_EXP_PLAINS_CART:1,Q_MOND_XP_SUPPLY:2,Q_MOND_EXP_FOREST_CACHE:2,Q_MOND_EXP_PLAINS_CAMP:3,Q_MOND_FAVONIUS_SUPPLY:3,Q_MOND_EXP_DRAGONSPINE_CACHE:5,Q_MOND_EXP_STORMTERROR_CACHE:6,Q_LIYUE_XP_SUPPLY:4,Q_LIYUE_EXP_PLAINS_CARAVAN:3,Q_LIYUE_EXP_MOUNTAIN_CACHE:4,Q_LIYUE_EXP_CHASM_SURFACE_DEPOT:7,Q_LIYUE_EXP_CHASM_DEEP_CACHE:9};
 // IDs are independent of authored main/legend quests. W/A = existing XP books.
 const quests=[
  ['BRIDGE_PARCEL','성문 앞 흩어진 우편물','MAP_MOND_CITY',1,'exploration','성문을 오가는 사람들의 발에 밟히기 전에 흩어진 편지를 모으자.','편지의 주소를 맞추고 배달 꾸러미를 정리한다.',15,60,50,{MAT_CHAR_EXP_WANDERER:1}],
  ['WINDRISE_RIBBONS','거목 아래의 길잡이 리본','MAP_MOND_WINDRISE',2,'exploration','강풍에 끊어진 길잡이 리본이 거목 뿌리와 강가에 흩어졌다.','강둑을 따라 리본을 모아 안전한 길에 다시 묶는다.',25,90,75,{ORE_IRON:2}],
  ['SPRINGVALE_BASKET','샘가에 남겨진 식량 바구니','MAP_MOND_SPRINGVALE',2,'exploration','장터로 향하던 바구니가 샘가에 넘어졌다. 젖지 않은 식량을 골라 주민에게 돌려주자.','바구니를 수선하고 온전한 식량을 나누어 담는다.',20,90,75,{ING_APPLE:3,MAT_CHAR_EXP_WANDERER:1}],
  ['FOREST_SIGNPOSTS','숲길의 기울어진 표지판','MAP_MOND_FOREST',3,'exploration','숲길의 갈림길 표지판 두 개가 쓰러져 행인들이 길을 잘못 들고 있다.','발자국과 지형을 대조해 표지판의 방향을 바로잡는다.',30,110,100,{ORE_WHITE_IRON:2}],
  ['PLAINS_ROAD_PATROL','수송로의 순찰 방해','MAP_MOND_PLAINS',3,'exploration','수송로를 지나는 수레가 작은 츄츄족 무리 때문에 발이 묶였다.','길가에 진형을 잡고 순찰대를 물리친다.',10,130,90,{MAT_CHAR_EXP_ADVENTURER:1},'EG_MOND_HILI_PATROL'],
  ['DAWN_VINEYARD','포도밭의 불청객','MAP_MOND_DAWN_WINERY',3,'exploration','와이너리의 물길에 슬라임이 모여 일꾼들이 포도밭에 들어가지 못한다.','일꾼들을 안전하게 물린 뒤 물길의 슬라임을 정리한다.',10,130,90,{ING_RAW_MEAT:2,MAT_CHAR_EXP_WANDERER:2},'EG_MOND_SLIME_SMALL'],
  ['WOLVENDOM_TRAPS','울프 영지의 낡은 덫','MAP_MOND_WOLVENDOM',4,'exploration','낡은 사냥 덫이 숲 가장자리에 남아 있다. 짐승과 행인 모두에게 위험하다.','안전한 쪽에서 덫의 장력을 풀고 흔적을 표시한다.',30,160,120,{ORE_IRON:3,MAT_CHAR_EXP_ADVENTURER:1}],
  ['FIELD_STIPEND','길드의 현장 활동 정산','MAP_MOND_CITY',4,'supply','현장 사건을 해결한 모험가에게 길드가 다음 여정의 물자를 지급한다.','완료한 현장 기록을 확인받는다.',10,140,80,{MAT_CHAR_EXP_ADVENTURER:1},null,'REGION_EXPLORATION_1'],
  ['WOLVENDOM_PATROL','숲을 가르는 철제 발자국','MAP_MOND_WOLVENDOM',5,'exploration','중무장한 츄츄족 무리가 숲 안쪽의 통로를 막았다. 행인들이 다치기 전에 길을 되찾자.','넓은 공터로 유인해 중무장대를 상대한다.',15,200,140,{MAT_CHAR_EXP_ADVENTURER:1,ORE_WHITE_IRON:2},'EG_MOND_HILI_ELITE'],
  ['DRAGONSPINE_MARKERS','설원 귀환로의 표식','MAP_DRAGONSPINE',6,'exploration','눈보라에 탐사대의 귀환 표식이 묻혔다. 바람을 피할 수 있는 구간을 확인해야 한다.','바위 그늘을 따라 귀환 표식을 복구한다.',35,220,160,{MAT_CHAR_EXP_ADVENTURER:2}]
 ];
 // Twelve fixed points, distributed over seven reachable areas; never a daily drop.
 const legacyPoints=[
  ['ANEMO_PLAINS_CART','MAP_MOND_PLAINS',1,'풍차 그늘의 빛','들풀 위에 오래 머무는 바람이 있다. 풍차의 그늘을 살펴보자.'],
  ['ANEMO_PLAINS_RIDGE','MAP_MOND_PLAINS',3,'낮은 능선의 휘파람','언덕을 돌아 올라가면 바람이 돌 틈에서 가늘게 울린다.'],
  ['ANEMO_FOREST_ROOTS','MAP_MOND_FOREST',2,'속이 빈 나무뿌리','속이 빈 뿌리 안쪽에서 잎사귀가 둥글게 맴돈다.'],
  ['ANEMO_FOREST_CANOPY','MAP_MOND_FOREST',4,'나뭇가지 사이의 반짝임','높은 가지 사이에 반짝이는 빛이 걸려 있다. 옆 비탈에서 접근하자.'],
  ['ANEMO_WINDRISE_ROOT','MAP_MOND_WINDRISE',1,'거목 뿌리의 바람','거목의 굵은 뿌리 사이로 작은 바람이 모여든다.'],
  ['ANEMO_WINDRISE_BANK','MAP_MOND_WINDRISE',3,'강 건너 돌기둥','얕은 여울 건너 돌기둥에서 푸른 빛이 물결친다.'],
  ['ANEMO_SPRINGVALE_ROOF','MAP_MOND_SPRINGVALE',2,'샘가 지붕의 빛','샘 가까운 낮은 지붕 위에서 가벼운 빛이 춤춘다.'],
  ['ANEMO_DAWN_TERRACE','MAP_MOND_DAWN_WINERY',3,'포도밭 돌담의 바람','포도밭 끝 돌담을 따라 작은 잎사귀가 공중에 떠 있다.'],
  ['ANEMO_WOLVENDOM_HOLLOW','MAP_MOND_WOLVENDOM',4,'빈 바위굴의 울림','이끼 낀 바위굴 입구에서 차갑지 않은 바람이 분다.'],
  ['ANEMO_WOLVENDOM_RIDGE','MAP_MOND_WOLVENDOM',5,'숲 능선의 푸른 궤적','늑대의 발자국이 끊긴 능선 너머로 푸른 궤적이 흐른다.'],
  ['ANEMO_DRAGONSPINE_LEDGE','MAP_DRAGONSPINE',5,'설원 입구의 바람','눈 덮인 바위 선반에 녹지 않는 푸른 빛이 떠 있다.'],
  ['ANEMO_DRAGONSPINE_SHELTER','MAP_DRAGONSPINE',6,'바람막이 뒤의 잔향','탐사대 바람막이 뒤, 눈이 닿지 않는 틈에서 따뜻한 바람이 샌다.']
 ].map(([id,map,level,title,clue])=>({id,map,level,title,clue}));
 const points=root.CRPGWorldContent?.oculi||legacyPoints;
 const tiers=[{id:'TIER_1',cost:2,reward:{mora:100,items:{MAT_CHAR_EXP_WANDERER:2}}},{id:'TIER_2',cost:4,reward:{mora:180,items:{MAT_CHAR_EXP_ADVENTURER:1}}},{id:'TIER_FINAL',cost:6,reward:{character:'MOND_VENTI'}}];
 const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 P.installExplorationContent=function(){
  if(this._explorationInstalled)return;
  this.db={...this.db};
  const setTable=(key,rows)=>{this.db[key]=rows;this.tables[key]=new Map(rows.slice(1).filter(r=>r&&r[0]).map(r=>[r[0],r]));};
  const rows=this.db['22_QUEST_DB'].map(r=>r.slice());
  for(const r of rows.slice(1))if(r[12]==='READY'&&['supply','exploration'].includes(json(r[10]).kind)){
   const d=json(r[10]),map=this.tables['32_MAP_DB'].get(d.map_id),defaultLevel=map&&map[4]!=='도시'?Number(map[6])||1:1;
   d.conditions??={};d.conditions.min_level=levels[r[0]]||d.conditions.min_level||defaultLevel;r[10]=JSON.stringify(d);
  }
  for(const [suffix,title,map,level,kind,text,label,minutes,mora,xp,items,group,activity]of quests){
   const id='Q_CRPG_MOND_EXP_'+suffix,conditions={map_id:map,min_level:level,unclaimed:true};if(activity)conditions.activity_requirement=activity;
   const choice={id:'careful',label,minutes,next:group?'AWAIT_VICTORY':'READY_TO_CLAIM',success_rate:100};if(group)choice.combat_group=group;
   const d={schema:1,kind,map_id:map,conditions,start:'INVESTIGATE',text,choices:[choice],claim_node:'READY_TO_CLAIM',revisit:'현장 활동과 보상 수령을 모두 마쳤다.',authorship:'CRPG_LOCAL_V09'};
   if(!rows.some(r=>r[0]===id))rows.push([id,title,'몬드','NPC_MOND_KATHERYNE','LEVEL>='+level,text,'현장 보상','미시작','','로컬 추가 의뢰',JSON.stringify(d),JSON.stringify({mora,xp,items,flags:{}}),'READY','CRPG_LOCAL_V09']);
  }
  setTable('22_QUEST_DB',rows);
  const items=this.db['14_ITEM_DB'].map(r=>r.slice());if(!items.some(r=>r[0]===ITEM))items.push([ITEM,'바람 신의 눈동자','퀘스트 아이템','희귀','[바람]','몬드 곳곳의 바람에 남은 작은 결정. 거목 아래에서 바람에 돌려줄 수 있다.','탐험','거목 아래 공양','','','N','공용','','일회성 수집',0,0,12,'몬드 탐험','N','Y','몬드','CRPG_LOCAL_V09']);setTable('14_ITEM_DB',items);
  const flags=this.db['23_FLAG_DB'].map(r=>r.slice());if(!flags.some(r=>r[0]===OWNED))flags.push([OWNED,'눈동자 공양으로 벤티와 동행 약속을 맺음',false,'PROFILE_MOND_VENTI','몬드','','CRPG_LOCAL_V09']);setTable('23_FLAG_DB',flags);
  this._explorationInstalled=true;
 };
 P.explorationVisitedEvidence=function(state=this.s){
  const maps=new Set(Object.keys(state.exploration?.visitedMaps||{})),add=id=>{if(this.tables['32_MAP_DB'].has(id))maps.add(id);};
  add(state.global.CURRENT_MAP_ID);
  for(const [id,n]of Object.entries(json(state.global.WORLD_VISIT_COUNTS_JSON)))if(Number.isFinite(n)&&n>0)add(id);
  for(const [id,q]of Object.entries(state.quests||{}))if(q?.claimed||q?.attempts>0||q?.node==='READY_TO_CLAIM')add(json(this.tables['22_QUEST_DB'].get(id)?.[10]).map_id);
  // A route-access flag or an accepted quest is never evidence of a visit.
  const progress=json(state.global.EVENT_PROGRESS_JSON);
  this._explorationTravelDefinitions??=(this.storyEventDefinitions?.()||[]).flatMap(e=>{const p=json(e.EXEC_PAYLOAD_JSON);return p.kind==='travel'||p.handler==='isk_story_travel'?[{event:e.EVENT_ID,node:e.SOURCE_ID_OR_FILTER,map:p.to_map}]:[];});
  for(const e of this._explorationTravelDefinitions){const r=progress[e.event];if(r?.saveId===state.global.SAVE_ID&&r.route===state.global.STORY_ROUTE_ID&&r.resolvedNode===e.node)add(e.map);}
  return maps;
 };
 P.ensureExplorationState=function(state=this.s){
  const migrating=state.exploration===undefined;
  if(migrating)state.exploration={schema:1,visitedMaps:{},oculi:{},tiers:[]};
  if(!plain(state.exploration)||state.exploration.schema!==1||!plain(state.exploration.visitedMaps)||!plain(state.exploration.oculi)||!Array.isArray(state.exploration.tiers))fail('EXPLORATION_SAVE','탐험 기록의 형식을 확인해 주세요.');
  if(migrating)for(const id of this.explorationVisitedEvidence(state))state.exploration.visitedMaps[id]=true;
  if(this.tables['32_MAP_DB'].has(state.global.CURRENT_MAP_ID))state.exploration.visitedMaps[state.global.CURRENT_MAP_ID]=true;
  return state.exploration;
 };
 P.regionVisited=function(region,state=this.s){const maps=state.exploration?.visitedMaps;return this.tables['32_MAP_DB'].get(state.global.CURRENT_MAP_ID)?.[1]===region||(maps?Object.keys(maps):[...this.explorationVisitedEvidence(state)]).some(id=>this.tables['32_MAP_DB'].get(id)?.[1]===region);};
 P.questUnlockReason=function(id){
  const row=this.tables['22_QUEST_DB'].get(id);if(!row)return '등록된 의뢰가 아닙니다.';
  if(row[2]&&row[2]!=='몬드'&&!this.regionVisited(row[2]))return '해당 지역에 처음 도착한 뒤 의뢰를 확인할 수 있습니다.';
  if(!this.isCommission(id))return '';
  const level=json(row[10]).conditions?.min_level||1;return this.s.global.PLAYER_LEVEL_STATE<level?'Lv. '+level+'부터 받을 수 있는 의뢰입니다.':'';
 };
 P.questVisible=function(id){const r=this.tables['22_QUEST_DB'].get(id);return !!r&&(!r[2]||r[2]==='몬드'||this.regionVisited(r[2]))&&(!this.isCommission(id)||this.commissionAccepted(id)||!this.questUnlockReason(id));};
 P.commissionEntries=function(){return old.commissionEntries.call(this).filter(q=>this.questVisible(q.row[0]));};
 P.view=function(){const v=old.view.call(this);v.quests=v.quests.filter(q=>this.questVisible(q.row[0]));return v;};
 P.questConditions=function(id){return this.questUnlockReason(id)||old.questConditions.call(this,id);};
 P.questChoice=function(id,choice){const reason=this.questUnlockReason(id);if(reason)fail('QUEST_UNLOCK',reason);return old.questChoice.call(this,id,choice);};
 P.claimQuest=function(id,equipment){const reason=this.questUnlockReason(id);if(reason)fail('QUEST_UNLOCK',reason);const result=old.claimQuest.call(this,id,equipment),reward=json(this.row('22_QUEST_DB',id)[11]);if(json(this.row('22_QUEST_DB',id)[10]).authorship==='CRPG_LOCAL_V09'&&reward.xp)this.addXp('PLAYER_CUSTOM',reward.xp);return result;};
 P.oculusEntries=function(){const s=this.s,g=s.global;return points.filter(p=>p.map===g.CURRENT_MAP_ID&&p.level<=g.PLAYER_LEVEL_STATE&&!s.exploration?.oculi[p.id]).map(p=>({...p,reason:this.actionReason('OCULUS_COLLECT',{point:p.id})}));};
 P.oculusSummary=function(){return {collected:Object.keys(this.s.exploration?.oculi||{}).length,total:points.length,balance:this.itemCount(ITEM),offerings:this.s.exploration?.tiers.length||0};};
 P.oculusFinalStoryReady=function(){const g=this.s.global,f=this.s.flags,id=g.STORY_ROUTE_ID==='ROUTE_TRAVELER'?'Q_TRV_MOND_02':'Q_ISK_MOND_03',flag=g.STORY_ROUTE_ID==='ROUTE_TRAVELER'?'FLAG_TRV_MON_CH2_CLEAR':'FLAG_ISK_M05_CLEAR';return this.s.quests[id]?.claimed===true&&yes(f[flag])&&this.s.relations.PROFILE_MOND_VENTI?.firstContact!=null;};
 P.oculusExchangeEntry=function(){
  const summary=this.oculusSummary(),tier=tiers[summary.offerings];
  if(!tier||this.s.global.CURRENT_MAP_ID!=='MAP_MOND_WINDRISE'||summary.collected<2)return null;
  if(tier.id==='TIER_FINAL'&&(summary.collected<12||!this.oculusFinalStoryReady()))return null;
  return {...copy(tier),title:tier.id==='TIER_FINAL'?'바람에 돌아온 노래':'거목 아래에 눈동자 공양',text:tier.id==='TIER_FINAL'?'모아 온 바람을 따라 익숙한 노랫소리가 들린다. 벤티와 다음 여정의 동행을 약속할 수 있다.':'눈동자에 깃든 바람을 거목 아래로 돌려보낸다.',reason:this.actionReason('OCULUS_OFFER',{tier:tier.id})};
 };
 P.oculusCollect=function(id){
  const reason=this.actionReason('OCULUS_COLLECT',{point:id});if(reason)fail('OCULUS',reason);
  const p=points.find(x=>x.id===id),g=this.s.global,e=this.ensureExplorationState();
  e.oculi[id]={map:p.map,day:g.WORLD_DAY,action:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1)};this.giveItem(ITEM,1);this.advanceTime(10);return {point:id,item:ITEM,quantity:1};
 };
 P.oculusOffer=function(id){
  const reason=this.actionReason('OCULUS_OFFER',{tier:id});if(reason)fail('OCULUS',reason);
  const e=this.ensureExplorationState(),tier=tiers[e.tiers.length],g=this.s.global;
  this.pay({items:{[ITEM]:tier.cost}});for(const [item,n]of Object.entries(tier.reward.items||{}))this.giveItem(item,n);g.MORA+=tier.reward.mora||0;
  if(tier.reward.character){this.unlockCharacter(tier.reward.character);this.s.flags[OWNED]=true;}
  e.tiers.push({id:tier.id,day:g.WORLD_DAY,action:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1)});this.advanceTime(10);return {tier:id,reward:copy(tier.reward),character:tier.reward.character||null};
 };
 P.actionReason=function(type,a={}){
  const reason=old.actionReason.call(this,type,a);if(reason)return reason;
  if(['COMMISSION_ACCEPT','QUEST_CHOICE','CLAIM_QUEST'].includes(type))return this.questUnlockReason(a.quest);
  if(type==='OCULUS_COLLECT'){
   const p=points.find(x=>x.id===a.point);if(!p||p.map!==this.s.global.CURRENT_MAP_ID)return '현재 구역에서 발견한 바람의 흔적을 선택해 주세요.';
   if(this.s.placeVisit)return '시설 밖에서 바람의 흔적을 살펴봐 주세요.';
   if(this.s.global.PLAYER_LEVEL_STATE<p.level)return '아직 이 흔적에 접근할 준비가 되지 않았습니다.';
   if(this.s.exploration?.oculi[p.id])return '이미 회수한 눈동자입니다.';
  }
  if(type==='OCULUS_OFFER'){
   const e=this.s.exploration,tier=tiers[e?.tiers.length||0];if(!tier||a.tier!==tier.id)return '현재 공양할 수 있는 단계를 확인해 주세요.';
   if(this.s.global.CURRENT_MAP_ID!=='MAP_MOND_WINDRISE'||this.s.placeVisit)return '거목 아래에서 바람을 돌려보내 주세요.';
   if(this.itemCount(ITEM)<tier.cost)return '공양할 눈동자가 부족합니다.';
   if(tier.id==='TIER_FINAL'&&(Object.keys(e?.oculi||{}).length<12||!this.oculusFinalStoryReady()))return '아직 바람의 노래가 응답하지 않습니다.';
   if(tier.id==='TIER_FINAL'&&json(this.s.global.COMPANION_ELIGIBILITY_JSON).MOND_VENTI?.state==='JOINED')return '이미 벤티와 동행을 약속했습니다.';
  }
  return '';
 };
 P.apply=function(a){
  this.ensureExplorationState();let result;
  if(a.type==='OCULUS_COLLECT')result=this.oculusCollect(a.point);else if(a.type==='OCULUS_OFFER')result=this.oculusOffer(a.tier);else result=old.apply.call(this,a);
  this.ensureExplorationState();return result;
 };
 P.newGame=function(o){this.installExplorationContent();old.newGame.call(this,o);this.ensureExplorationState();return copy(this.s);};
 P.validateSave=function(s){
  this.installExplorationContent();old.validateSave.call(this,s);const e=this.ensureExplorationState(s),g=s.global;
  const validReceipt=r=>plain(r)&&Number.isSafeInteger(r.day)&&r.day>=1&&r.day<=g.WORLD_DAY&&typeof r.action==='string'&&r.action.startsWith(g.SAVE_ID+':')&&Number.isSafeInteger(Number(r.action.slice(g.SAVE_ID.length+1)))&&Number(r.action.slice(g.SAVE_ID.length+1))>=1&&Number(r.action.slice(g.SAVE_ID.length+1))<=g.LAST_COMMITTED_ACTION_SEQ;
  for(const [map,v]of Object.entries(e.visitedMaps))if(v!==true||!this.tables['32_MAP_DB'].has(map))fail('EXPLORATION_SAVE','방문한 구역 기록이 올바르지 않습니다.');
  for(const [id,r]of Object.entries(e.oculi)){const p=points.find(x=>x.id===id);if(!p||![p.map,...(p.legacyMaps||[])].includes(r.map)||!validReceipt(r)||!e.visitedMaps[r.map])fail('EXPLORATION_SAVE','회수한 눈동자 기록이 올바르지 않습니다.');}
  if(e.tiers.length>tiers.length||e.tiers.some((r,i)=>r.id!==tiers[i].id||!validReceipt(r)))fail('EXPLORATION_SAVE','눈동자 공양 순서를 확인해 주세요.');
  const spent=tiers.slice(0,e.tiers.length).reduce((n,t)=>n+t.cost,0),balance=s.inventory.filter(x=>x.item===ITEM).reduce((n,x)=>n+x.quantity,0);
  if(balance!==Object.keys(e.oculi).length-spent||balance<0)fail('EXPLORATION_SAVE','눈동자 수집·공양·소지 수량이 일치하지 않습니다.');
  if(e.tiers.length===3&&(!yes(s.flags[OWNED])||json(g.COMPANION_ELIGIBILITY_JSON).MOND_VENTI?.state!=='JOINED'))fail('EXPLORATION_SAVE','바람의 동행 약속 기록이 일치하지 않습니다.');
  return s;
 };
 P.explorationVersion=1;api.explorationVersion=1;
 api.explorationCatalog={quests:quests.map(q=>({id:'Q_CRPG_MOND_EXP_'+q[0],title:q[1],map:q[2],level:q[3]})),points:copy(points),item:ITEM,tiers:copy(tiers)};
})(globalThis);
