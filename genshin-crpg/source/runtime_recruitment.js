/* Acquisition catalogue; explicit local introductions, independent of the later quest destination. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype;
const json=x=>{try{return JSON.parse(x||'{}');}catch{return {};}};
const yes=x=>x===true||x==='TRUE'||x==='Y';
const oldReason=P.actionReason;
const flagNames={FLAG_TRV_MON_PROLOGUE_CLEAR:'몬드 도입부 완료',FLAG_ISK_MON_PROLOGUE_CLEAR:'몬드 도입부 완료',FLAG_ISK_MAIN_UNLOCKED:'도입부 마무리 및 메인 화면 개방',FLAG_TRV_MON_CH2_CLEAR:'몬드 본편 완료',FLAG_ISK_M05_CLEAR:'몬드 본편 완료',FLAG_TRV_LIYUE_CLEAR:'리월 본편 완료',FLAG_ISK_L04_REGION_CLEAR:'리월 본편 완료',FLAG_MOND_MIKA_RETURNED:'첫 만남 임무에서 귀환 확인',FLAG_MOND_MONA_PRESENT:'첫 만남 임무에서 만남 확인',FLAG_WORLD_ZIBAI_RETURNED:'귀환 임무 완료'};
P.legendRequirements=function(d,{cost=true,location=true,introduction=true}={}){
 if(!d)return [];
 const out=[],g=this.s.global,add=(label,met,kind)=>out.push({label,met:!!met,kind});
 if(d.STATUS!=='ACTIVE')add('이 루트의 개인 임무 연결 준비 중',false,'content');
 const flags=new Set([d.MAIN_FLAG_GATE,...[...String(d.START_CONDITION||'').matchAll(/(FLAG_[A-Z0-9_]+)\s*=\s*TRUE/g)].map(m=>m[1])].filter(Boolean));
 for(const flag of flags){if(flag===d.COMPLETE_FLAG_ID)continue;const name=flagNames[flag]||this.tables['23_FLAG_DB'].get(flag)?.[1]||'선행 이야기 진행';add(name,yes(this.s.flags[flag]),'story');}
 if(location&&d.MAP_ID)add((this.tables['32_MAP_DB'].get(d.MAP_ID)?.[2]||'지정 장소')+'에서 만나기',g.CURRENT_MAP_ID===d.MAP_ID,'map');
 if(introduction)add(this.legendIntroductionLabel(d)+'에서 개인 임무 소개받기',this.legendRegistered(d.id),'introduction');
 if(cost&&!this.s.storyCostReceipts?.[d.QUEST_ID]&&!this.storyDone(d.id)){
  const mora=Number(d.COST_MORA)||0;if(mora)add('준비 비용 '+mora+' 모라 · 보유 '+g.MORA,g.MORA>=mora,'cost');
  for(const [id,n]of Object.entries(json(d.COST_ITEMS_JSON)))add((this.tables['14_ITEM_DB'].get(id)?.[1]||'준비물')+' '+this.itemCount(id)+' / '+n+'개',this.itemCount(id)>=n,'cost');
 }
 return out;
};
P.legendIntroductionReason=function(d){
 if(!d||d.kind!=='LEGEND'||d.ROUTE_SCOPE!==this.s.global.STORY_ROUTE_ID||d.STATUS!=='ACTIVE')return '현재 루트에서 소개받을 수 없는 임무입니다.';
 if(this.playPhase()!=='FREE'||this.s.worldJob||this.s.lifeJob)return '현재 장면이나 진행 중인 작업을 먼저 마쳐 주세요.';
 if(!this.legendContactAllowed(d))return this.legendIntroductionLabel(d)+'에서 개인 임무를 소개받아 주세요.';
 if(this.legendRegistered(d.id))return '이미 소개받았거나 마친 개인 임무입니다.';
 const facade=Object.create(this);facade.s={...this.s,global:{...this.s.global,CURRENT_MAP_ID:d.MAP_ID||this.s.global.CURRENT_MAP_ID}};
 try{if(!facade.storyCondition(d.START_CONDITION,d))return this.legendRequirements(d,{cost:false,location:false,introduction:false}).find(r=>!r.met)?.label||'개인 임무의 선행 이야기를 먼저 진행해 주세요.';}catch{return '이 개인 임무의 연결을 준비하고 있습니다.';}
 return '';
};
P.actionReason=function(type,a={}){
 if(type==='LEGEND_REGISTER')return this.legendIntroductionReason(this.storyDefinition(a.quest));
 if(type==='LEGEND_ENTER'&&!this.legendRegistered(a.quest||a.id)){
  const d=this.storyDefinition(a.quest||a.id);
  if(d?.REGION==='몬드')return this.legendIntroductionLabel(d)+'에서 개인 임무를 먼저 소개받아 주세요.';
 }
 return oldReason.call(this,type,a);
};
P.recruitmentEntries=function(){
 const route=this.s.global.STORY_ROUTE_ID,owned=json(this.s.global.COMPANION_ELIGIBILITY_JSON),defs=[...this.storyIndex().legends.values()].filter(d=>d.ROUTE_SCOPE===route);
 return this.rows('04_CHAR_DB').filter(r=>['몬드','리월'].includes(r[3])&&this.tables['07_CHAR_DB'].has(r[1])).map(r=>{
  const d=defs.find(d=>d.PROFILE_ID===r[0]),joined=owned[r[1]]?.state==='JOINED',archon=['MOND_VENTI','LIYUE_ZHONGLI'].includes(r[1]);
  let method=archon?'지역의 신의 눈동자 전량 수집 → 순서대로 공양 → 동행 수락':d?'개인 임무 완료 → 동행 제안 수락':'이 루트의 획득 임무 연결 준비 중';
  let requirements=d?this.legendRequirements(d):[{label:'획득 임무 연결 준비 중',met:false,kind:'content'}];
  if(archon){const summary=r[3]==='몬드'?this.oculusSummary():this.geoOculusSummary?.();requirements=[{label:'지역 눈동자 수집 '+(summary?.collected||0)+' / '+(summary?.total||16),met:!!summary&&summary.collected===summary.total,kind:'oculi'},{label:'본편 완료 후 최종 공양에서 동행 약속',met:joined,kind:'story'}];}
  return {profile:r[0],character:r[1],name:r[2],region:r[3],owned:joined,definition:d,method,requirements,complete:!!d&&this.storyDone(d.id),archon};
 });
};
})(globalThis);
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype,old=Object.fromEntries(['apply','actionReason','storyCompleteLegend','placeCatalog','atGuild','assetFor','validateSave'].map(k=>[k,P[k]])),json=x=>JSON.parse(x||'{}');
P.assetFor=function(id,variant){return old.assetFor.call(this,id==='NPC_LIYUE_KATHERYNE'?'NPC_MOND_KATHERYNE':id,variant);};
P.atGuild=function(){const p=this.currentPlace();return old.atGuild.call(this)||(p?.valid&&p.entity==='NPC_LIYUE_KATHERYNE'&&p.mode==='TALK');};
P.placeCatalog=function(){const list=old.placeCatalog.call(this);if(!list.some(p=>p.id==='EVT_CRPG_LIYUE_GUILD'))list.push({id:'EVT_CRPG_LIYUE_GUILD',kind:'FACILITY',entity:'NPC_LIYUE_KATHERYNE',merchant:null,name:'모험가 길드 · 캐서린',facility:'모험가 길드',maps:['MAP_LIYUE_HARBOR'],from:0,to:1440,merchantMaps:null,merchantFrom:null,merchantTo:null,merchantType:'',merchantName:'',modes:['TALK']});return list;};
P.recruitmentRejoinEntry=function(d){
 if(!d||['MOND_VENTI','LIYUE_ZHONGLI'].includes(d.CHAR_ID))return null;
 const row=this.storyIndex().nodes.get(this.s.global.STORY_ROUTE_ID+':'+d.id+'_REJOIN_START');if(!row)return null;
 let reason='';const owned=json(this.s.global.COMPANION_ELIGIBILITY_JSON);
 if(d.ROUTE_SCOPE!==this.s.global.STORY_ROUTE_ID)reason='현재 이야기 루트에서 만날 수 없습니다.';
 else if(!this.storyDone(d.id))reason='개인 임무를 먼저 마쳐 주세요.';
 else if(owned[d.CHAR_ID]?.state==='JOINED')reason='이미 동행하는 인물입니다.';
 else if(this.playPhase()!=='FREE'||this.s.storyContext||this.s.worldJob||this.s.lifeJob)reason='현재 진행 중인 장면을 먼저 마쳐 주세요.';
 else if(d.REGION==='리월'&&!this.liyuePersonalReady())reason='리월 본편을 먼저 마쳐 주세요.';
 else if(this.s.global.CURRENT_MAP_ID!==row[8])reason=(this.tables['32_MAP_DB'].get(row[8])?.[2]||'지정 장소')+'에서 다시 만날 수 있습니다.';
 else {try{if(!this.storyCondition(row[11],d))reason='재회 조건을 먼저 확인해 주세요.';}catch{reason='재회 조건을 확인할 수 없습니다.';}}
 return {id:row[4],map:row[8],reason};
};
P.storyCompleteLegend=function(id){const out=old.storyCompleteLegend.call(this,id),d=this.storyDefinition(id);if(d&&this.s.storyContext?.entry===d.id&&!['MOND_VENTI','LIYUE_ZHONGLI'].includes(d.CHAR_ID))this.s.storyContext.kind='RECRUIT';return out;};
P.actionReason=function(type,a={}){
 if(type==='RECRUIT_REJOIN')return this.recruitmentRejoinEntry(this.storyDefinition(a.quest))?.reason??'다시 제안할 개인 임무가 없습니다.';
 if(type==='ZIBAI_RETURN_CHECK')return this.playPhase()!=='FREE'?'현재 장면을 먼저 마쳐 주세요.':!this.liyuePersonalReady()?'리월 본편을 먼저 마쳐 주세요.':this.s.flags.FLAG_WORLD_ZIBAI_RETURNED?'이미 귀환을 확인했습니다.':this.s.global.CURRENT_MAP_ID!=='MAP_LIYUE_MOUNTAINS'?'리월 산지의 귀환 흔적을 찾아가세요.':'';
 if(type==='LEGEND_REGISTER'&&this.s.global.STORY_ROUTE_ID==='ROUTE_ISEKAI'&&this.s.liyue?.activeQuest&&!this.s.liyue.regionReceipt)return '리월 본편을 끝낸 뒤 개인 임무를 소개받을 수 있습니다.';
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){
 if(a.type==='RECRUIT_REJOIN'){const d=this.storyDefinition(a.quest),e=this.recruitmentRejoinEntry(d);if(!e||e.reason)throw new api.RuleError('RECRUIT_REJOIN',e?.reason||'재회할 인물이 없습니다.');this.s.storyReturnStack||=[];this.s.storyReturnStack.push(this.storyFrame());this.s.storyContext={kind:'RECRUIT',entry:d.id,node:e.id,table:'57_MOND_STORY_SCENE_DB'};Object.assign(this.s.global,{PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',SCREEN_MODE:'STORY'});this.prepareStory();return {entry:e.id};}
 if(a.type==='ZIBAI_RETURN_CHECK'){
  const g=this.s.global;this.s.liyueSideStories??={};const progress=this.s.liyueSideStories.zibai??={step:0,route:g.STORY_ROUTE_ID,saveId:g.SAVE_ID,visited:[]};
  if(progress.step!==Number(a.step))throw new api.RuleError('SIDE_STORY_STEP','현재 귀환 확인 단계를 선택하세요.');
  progress.visited.push({step:progress.step,day:g.WORLD_DAY,turn:g.TURN,map:g.CURRENT_MAP_ID});progress.step++;
  if(progress.step===3){this.s.flags.FLAG_WORLD_ZIBAI_RETURNED=true;progress.completed={saveId:g.SAVE_ID,route:g.STORY_ROUTE_ID,day:g.WORLD_DAY,turn:g.TURN};this.markContact('PROFILE_LIYUE_ZIBAI');}
  return {step:progress.step,complete:progress.step===3};
 }
 return old.apply.call(this,a);
};
P.validateSave=function(s){
 const p=s.liyueSideStories?.zibai,g=s.global;
 if(p){
  const valid=p.saveId===g.SAVE_ID&&p.route===g.STORY_ROUTE_ID&&Number.isInteger(p.step)&&p.step>=0&&p.step<=3&&Array.isArray(p.visited)&&p.visited.length===p.step&&p.visited.every((v,i)=>v&&typeof v==='object'&&v.step===i&&v.map==='MAP_LIYUE_MOUNTAINS'&&Number.isInteger(v.day)&&v.day>=1&&v.day<=g.WORLD_DAY&&Number.isInteger(v.turn)&&v.turn>=0&&v.turn<=g.TURN);
  const complete=p.step===3?p.completed?.saveId===g.SAVE_ID&&p.completed?.route===g.STORY_ROUTE_ID&&s.flags.FLAG_WORLD_ZIBAI_RETURNED===true:!p.completed&&!s.flags.FLAG_WORLD_ZIBAI_RETURNED;
  if(!valid||!complete)throw new api.RuleError('SIDE_STORY_SAVE','귀환 확인의 단계와 저장 출처가 일치하지 않습니다.');
 }
 return old.validateSave.call(this,s);
};
})(globalThis);

/* First-contact prerequisites use the existing authored meeting, never a synthetic true flag. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype;
const old={actionReason:P.actionReason,apply:P.apply,validateSave:P.validateSave,storyReturn:P.storyReturn};
const contacts={LEG_MOND_MIKA:{event:'EVT_MOND_MIKA_INTRO',flag:'FLAG_MOND_MIKA_RETURNED'},LEG_MOND_MONA:{event:'EVT_MOND_MONA_INTRO',flag:'FLAG_MOND_MONA_PRESENT'}};
P.mondFirstContact=function(d){
 const c=d&&contacts[d.id];if(!c||d.ROUTE_SCOPE!==this.s.global.STORY_ROUTE_ID)return null;
 return {...c,complete:this.s.flags[c.flag]===true,profile:d.PROFILE_ID};
};
P.mondFirstContactReason=function(d){
 const c=this.mondFirstContact(d);
 if(!c||d.STATUS!=='ACTIVE')return '현재 루트의 첫 만남이 아닙니다.';
 if(c.complete)return '이미 첫 만남을 마쳤습니다.';
 if(this.playPhase()!=='FREE'||this.s.storyContext||this.s.storyJourney||this.s.worldJob||this.s.lifeJob||this.s.global.STORY_MENU_POLICY==='SAVE_LOAD_ONLY')return '현재 장면이나 이동을 먼저 마쳐 주세요.';
 if(this.s.flags.FLAG_TRV_MON_PROLOGUE_CLEAR!==true)return '몬드 도입부를 먼저 마쳐 주세요.';
 if(!this.legendContactAllowed(d))return this.legendIntroductionLabel(d)+'에게 먼저 이야기를 들어 주세요.';
 return '';
};
P.actionReason=function(type,a={}){return type==='MOND_FIRST_CONTACT'?this.mondFirstContactReason(this.storyDefinition(a.quest)):old.actionReason.call(this,type,a);};
P.apply=function(a){
 if(a.type!=='MOND_FIRST_CONTACT')return old.apply.call(this,a);
 const d=this.storyDefinition(a.quest),reason=this.mondFirstContactReason(d);
 if(reason)throw new api.RuleError('MOND_FIRST_CONTACT',reason);
 const c=this.mondFirstContact(d);this.s.storyReturnStack||=[];this.s.storyReturnStack.push({...this.storyFrame(),introductionPlace:JSON.parse(JSON.stringify(this.s.placeVisit))});
 this.s.storyContext={kind:'INTRODUCTION',entry:c.event,node:c.event+'_START',table:'57_MOND_STORY_SCENE_DB'};
 delete this.s.storyBreak;delete this.s.storyArrival;this.s.storyMenuFrame=null;
 Object.assign(this.s.global,{PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',SCREEN_MODE:'STORY'});
 this.prepareStory();return {event:c.event};
};
P.storyReturn=function(){
 const contact=this.s.storyContext?.kind==='INTRODUCTION',visit=this.s.storyReturnStack?.at(-1)?.introductionPlace;
 const result=old.storyReturn.call(this);
 if(contact&&visit&&this.playPhase()==='FREE'){
  this.s.placeVisit=JSON.parse(JSON.stringify(visit));
  if(this.placeVisitReason()){this.s.placeVisit=null;this.s.global.SCREEN_MODE='LOCATION';}
  else {this.s.global.SCREEN_MODE=visit.mode==='TALK'?'DIALOGUE':visit.mode;this.s.global.CURRENT_NPC_ENTITY_ID=visit.entity;}
 }
 return result;
};
P.validateSave=function(s){
 const ctx=s.storyContext;
 if(ctx?.kind==='INTRODUCTION'){
  const def=Object.values(contacts).find(c=>c.event===ctx.entry),prefix=ctx.entry+'_';
  const valid=def&&s.global.STORY_ROUTE_ID==='ROUTE_TRAVELER'&&ctx.table==='57_MOND_STORY_SCENE_DB'&&(String(ctx.node).startsWith(prefix)||ctx.node==='CHOICE_GROUP:'+ctx.entry+'_CHOICE')&&Array.isArray(s.storyReturnStack)&&s.storyReturnStack.length>0;
  if(!valid)throw new api.RuleError('CONTACT_SAVE','첫 만남 장면의 루트와 복귀 기록을 확인할 수 없습니다.');
 }
 return old.validateSave.call(this,s);
};
})(globalThis);
