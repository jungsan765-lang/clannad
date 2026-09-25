(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const cap=(n,min,max)=>Math.max(min,Math.min(max,n));
const HEART_THRESHOLDS=[20,40,60,80,100];
const STATE_COLUMNS={FIRST_ADULT_EVENT_DONE:'FIRST_ADULT_EVENT_DONE_STATE',ADULT_REPEAT_COUNT:'ADULT_REPEAT_COUNT_STATE',ADULT_ROUTE_LOCKED:'ADULT_ROUTE_LOCKED_STATE',POST_ADULT_MOOD:'POST_ADULT_MOOD_STATE',HEART:'HEART_STATE'};
class RelationshipError extends Error {constructor(code,message){super(message);this.name='RelationshipError';this.code=code;}}
const fail=(code,message)=>{throw new RelationshipError(code,message)};
const numeric=(v,fallback=0)=>v===null||v===''||v===undefined?fallback:(Number.isFinite(Number(v))?Number(v):fail('RELATION_SCORE','관계 점수가 올바르지 않습니다.'));
const heart=score=>Math.min(5,Math.floor(Math.max(0,numeric(score))/20));
function catalogFromDB(db){
 const rows=db['58_MOND_AFFECTION_DB']||[],header=rows[0]||[],out={};
 for(const row of rows.slice(1)){
  const r=Object.fromEntries(header.map((k,i)=>[k,row[i]]));if(r.STATUS!=='ACTIVE')continue;
  const mature=['PERSONAL_BOND_ADULT_FIRST','PERSONAL_BOND_ADULT_OPTIONAL'].includes(r.RELATION_KIND);
  const general=['PERSONAL_BOND','PERSONAL_BOND_NON_SEXUAL','FRIENDSHIP_CHILD_SAFE'].includes(r.RELATION_KIND);
  out[r.EVENT_ID]={id:r.EVENT_ID,profileId:r.PROFILE_ID,route:r.ROUTE_SCOPE,category:mature?'MATURE_ROMANCE':general?'GENERAL':'UNVERIFIED',verifiedClassification:mature||general,stage:r.EVENT_ID.match(/_(H0[1-5])$/)?.[1],entryNode:r.ENTRY_NODE_ID,generalScore:Number(r.BOND_SCORE_MIN)||Math.min(5,Number(r.HEART_MIN)||0)*20,heartMin:Math.min(5,Number(r.HEART_MIN)||0),requires:r.PREV_EVENT_ID?[r.PREV_EVENT_ID]:[],requiredQuest:r.REQUIRED_QUEST_ID,requiredFlags:r.REQUIRED_FLAGS,condition:r.REQUIRED_FLAGS||null,source:{table:'58_MOND_AFFECTION_DB',id:r.EVENT_ID},assetsPolicy:r.ADULT_SCENE_POLICY||'DEFAULT_PORTRAIT'};
 }
 return out;
}
function activitiesFromDB(db){
 const objects=name=>{const rows=db[name]||[],h=rows[0]||[];return rows.slice(1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));};
 const definitions=objects('51_EVENT_DB'),aff=objects('58_MOND_AFFECTION_DB'),out={};
 const baseForRoute={ROUTE_TRAVELER:'EVT_MOND_DAILY_BOND',ROUTE_ISEKAI:'EVT_ISK_DAILY_BOND'};
 const decode=id=>{const row=definitions.find(e=>e.EVENT_ID===id&&e.ACTIVE==='Y');if(!row)return null;try{return {row,payload:JSON.parse(row.EXEC_PAYLOAD_JSON)}}catch{return null}};
 const upper=decode('EVT_MOND_BOND_SCORE_DAILY');
 for(const legend of objects('56_MOND_LEGEND_DB')){
  const base=decode(baseForRoute[legend.ROUTE_SCOPE]);if(!base||legend.STATUS!=='ACTIVE'||!legend.DAILY_ACTIVITY)continue;
  const payload=base.payload;if(payload.minutes!==30||!Number.isFinite(payload.bond_score_delta)||!Array.isArray(payload.allowed_transitions))continue;
  const related=aff.filter(a=>a.PROFILE_ID===legend.PROFILE_ID&&a.ROUTE_SCOPE===legend.ROUTE_SCOPE&&a.STATUS==='ACTIVE');
  const transitions=payload.allowed_transitions.map(t=>({...t,requiredDone:related.find(a=>a.EVENT_ID.endsWith('_'+t.required_done_suffix))?.EVENT_ID,requiredNotDone:related.find(a=>a.EVENT_ID.endsWith('_'+t.required_not_done_suffix))?.EVENT_ID})).filter(t=>t.requiredDone&&t.requiredNotDone);
  if(!transitions.length)continue;
  const h05=related.find(a=>a.EVENT_ID.endsWith('_H05'))?.EVENT_ID;
  const id='DAILY:'+legend.LEGEND_ID;
  out[id]={id,profileId:legend.PROFILE_ID,route:legend.ROUTE_SCOPE,title:legend.DAILY_ACTIVITY,dialogue:legend.DAILY_DIALOGUE_KO||'',name:legend.DISPLAY_NAME,completeFlag:legend.COMPLETE_FLAG_ID,legendQuest:legend.QUEST_ID,bondDelta:payload.bond_score_delta,minutes:payload.minutes,transitions,h05,upper:upper&&h05&&related.some(a=>Number(a.BOND_SCORE_CAP)===120)?{delta:upper.payload.delta,minutes:upper.payload.minutes,minimum:100,cap:120}:null,sourceId:base.row.EVENT_ID};
 }
 return out;
}
function normalizeRecord(record,identity){
 const r=record||{};
 if(r.saveId&&r.saveId!==identity.saveId||r.routeId&&r.routeId!==identity.routeId||r.profileId&&r.profileId!==identity.profileId)fail('RELATION_IDENTITY','다른 저장 또는 루트의 관계 기록입니다.');
 if(!own(r,'BOND_SCORE'))r.BOND_SCORE=own(r,'bondScore')?numeric(r.bondScore):20*Math.max(0,numeric(r.HEART_STATE??r.heart));
 r.BOND_SCORE=cap(numeric(r.BOND_SCORE),0,120);
 // These aliases are compatibility projections, never independent currencies.
 r.heart=heart(r.BOND_SCORE);r.HEART_STATE=r.heart;delete r.bondScore;
 r.relationSchemaVersion=1;Object.assign(r,identity);
 r.events=r.events||{};r.unlocked=r.unlocked||[];
 if(!own(r,'firstContact'))r.firstContact=null;
 r.companion=r.companion||'LOCKED';
 r.activityReceipts=r.activityReceipts||{};r.matureReceipts=r.matureReceipts||{};r.eventCompletedAt=r.eventCompletedAt||{};
 if(own(r,'matureBondScore'))r.matureBondScore=cap(numeric(r.matureBondScore),100,120);
 else if(r.explicitMatureProgress?.validated===true&&Number.isFinite(Number(r.explicitMatureProgress.score)))r.matureBondScore=cap(Number(r.explicitMatureProgress.score),100,120);
 // Neither general B110/B120 nor image numbers establish mature progress.
 r.ADULT_REPEAT_COUNT_STATE=Math.max(0,Math.floor(numeric(r.ADULT_REPEAT_COUNT_STATE??r.adultRepeatCount)));
 r.FIRST_ADULT_EVENT_DONE_STATE=r.FIRST_ADULT_EVENT_DONE_STATE===true||r.firstAdultEventDone===true;
 return r;
}
function migrateState(input){
 const state=copy(input);if(!state?.global?.SAVE_ID)fail('RELATION_SAVE','저장 식별자가 없습니다.');
 const before=copy(state.relations||{}), changes=[];state.relations=state.relations||{};
 for(const [profileId,r] of Object.entries(state.relations)){
  if(!own(r,'BOND_SCORE'))changes.push({profileId,kind:own(r,'bondScore')?'SCORE_ALIAS':'HEARTS_X20',oldHeart:r.HEART_STATE??r.heart??0});
  state.relations[profileId]=normalizeRecord(r,{saveId:state.global.SAVE_ID,routeId:state.global.STORY_ROUTE_ID,profileId});
 }
 state.relationshipSchemaVersion=1;
 if(changes.length){state.relationshipMigration=state.relationshipMigration||{from:'LEGACY_HEARTS',to:1,originalRelations:before,changes};}
 return state;
}
function verified(entry){return entry?.verifiedAdult===true&&entry?.appearanceVerifiedAdult===true&&typeof entry.evidence==='string'&&entry.evidence.trim().length>0;}
function install(api,options={}){
 const Runtime=api.Runtime||api, P=Runtime.prototype;
 if(P.__relationshipsInstalled)return api;
 Object.defineProperty(P,'__relationshipsInstalled',{value:true});
 const sessions=new WeakMap(), modes=new WeakMap();
 const defaults={adultModeEnabled:false,...options.preferences};
 const policy=options.eligibility||{profiles:{},protagonists:{}};
 const eventCatalog=options.events||{}, activities=options.activities||{};
 const getSession=rt=>sessions.get(rt)||null;
 const oldValidate=P.validateSave, oldNew=P.newGame, oldContact=P.markContact, oldPersonal=P.personal, oldApply=P.apply;
 P.validateSave=function(s){const m=migrateState(s);Object.assign(s,m);return oldValidate.call(this,s);};
 P.newGame=function(o){sessions.delete(this);modes.set(this,defaults.adultModeEnabled===true);oldNew.call(this,o);this.s=migrateState(this.s);return copy(this.s);};
 P.relation=function(profileId){
  if(!this.s)fail('NO_SAVE','새 게임을 시작해 주세요.');
  this.row('04_CHAR_DB',profileId);
  this.s.relations=this.s.relations||{};
  return this.s.relations[profileId]=normalizeRecord(this.s.relations[profileId],{saveId:this.s.global.SAVE_ID,routeId:this.s.global.STORY_ROUTE_ID,profileId});
 };
 P.markContact=function(id){const r=oldContact.call(this,id);return this.relation(id);};
 P.changeBond=function(profileId,delta,meta={}){
  if(!Number.isFinite(delta))fail('RELATION_DELTA','호감도 변화량이 올바르지 않습니다.');
  const r=this.relation(profileId),before=r.BOND_SCORE;r.BOND_SCORE=cap(before+delta,0,120);r.heart=heart(r.BOND_SCORE);r.HEART_STATE=r.heart;
  return {profileId,previous:before,score:r.BOND_SCORE,heart:r.heart,change:r.BOND_SCORE-before,source:meta.source||null};
 };
 P.relationshipBattleTarget=function(battle){
  const actor=battle?.actors?.find(a=>a.side==='ALLY'&&Number(a.slot)===2&&a.source!=='PLAYER_CUSTOM');
  if(!actor)return null;
  const profile=this.rows('04_CHAR_DB').find(row=>row[1]===actor.source)?.[0];
  const legend=profile&&[...this.storyIndex().legends.values()].find(d=>d.ROUTE_SCOPE===this.s.global.STORY_ROUTE_ID&&d.PROFILE_ID===profile&&this.storyDone(d.id));
  return legend?{profileId:profile,charId:actor.source,slot:2,legend:legend.id}:null;
 };
 P.awardBattleBond=function(battle){
  const existing=this.s.relationshipBattleReceipts?.[battle.id];if(existing)return copy(existing);
  const target=own(battle,'relationshipTarget')?battle.relationshipTarget:this.relationshipBattleTarget(battle);
  if(!target)return null;
  // source identifies characters; actor.id may identify a temporary story actor.
  if(!battle.actors.some(a=>a.side==='ALLY'&&Number(a.slot)===2&&a.source===target.charId)||this.row('04_CHAR_DB',target.profileId)[1]!==target.charId)return null;
  const bond=this.changeBond(target.profileId,1,{source:'BATTLE:'+battle.id});
  const receipt={battleId:battle.id,...target,...bond};this.s.relationshipBattleReceipts||={};this.s.relationshipBattleReceipts[battle.id]=copy(receipt);return receipt;
 };
 P.relationshipHeart=function(id){return this.relation(id).heart;};
 P.relationshipEventComplete=function(eventId){return Object.values(this.s.relations||{}).some(r=>r.events?.[eventId]==='COMPLETE');};
 P.completeAffection=function(eventId,context={}){
  const event=eventCatalog[eventId]||context;
  const profileId=context.profileId||event.profileId;
  if(!profileId)fail('AFFECTION_PROFILE','사건의 인물 연결이 없습니다.');
  if(event.category==='MATURE_ROMANCE')fail('MATURE_COMMIT','전용 사건은 현재 장면의 동의와 커밋을 거쳐야 합니다.');
  const r=this.relation(profileId);r.events[eventId]='COMPLETE';if(!r.eventCompletedAt[eventId])r.eventCompletedAt[eventId]={day:this.s.global.WORLD_DAY,turn:this.s.global.TURN};
  // No intermediate stage is synthesized from completing a higher stage.
  if(event.stage&&/^H0[1-5]$/.test(event.stage))r.events[event.stage]='COMPLETE';
  return {eventId,profileId,complete:true};
 };
 P.relationshipStageOffers=function(profileId,definitions){
  const r=this.relation(profileId),rows=definitions||Object.values(eventCatalog).filter(e=>e.profileId===profileId&&(!e.route||e.route===this.s.global.STORY_ROUTE_ID)),out=[];
  for(let i=0;i<5;i++){
   const stage='H0'+(i+1),def=rows.find(e=>e.stage===stage&&e.category==='GENERAL');
   if(r.events[stage]==='COMPLETE'||def&&r.events[def.id]==='COMPLETE')continue;
   if(r.BOND_SCORE<HEART_THRESHOLDS[i])break;
   if(!def||!def.id||!def.entryNode){out.push({stage,available:false,reason:'CONTENT_MISSING'});break;}
   const done=prior=>r.events[prior]==='COMPLETE'||this.relationshipEventComplete(prior);
   const quests=!def.requiredQuest||this.s.quests?.[def.requiredQuest]?.claimed===true||this.s.quests?.[def.requiredQuest]?.state==='완료';
   let flags=[];try{flags=JSON.parse(def.requiredFlags||'[]')}catch{flags=['INVALID_FLAG_DEFINITION']}
   const prerequisites=(def.requires||[]).every(done)&&quests&&flags.every(f=>this.s.flags[f]===true)&&(!def.condition||def.condition===def.requiredFlags||options.testCondition?.(this,def.condition)===true);
   out.push({stage,eventId:def.id,available:prerequisites,reason:prerequisites?'READY':'PREREQUISITE'});break;
  }
  return out;
 };
 P.adultModeEnabled=function(){return modes.has(this)?modes.get(this):defaults.adultModeEnabled===true;};
 P.matureEligibility=function(profileId){
  const r=this.relation(profileId),route=this.s.global.STORY_ROUTE_ID;
  if(!verified(policy.protagonists?.[route])||!verified(policy.profiles?.[profileId]))return {allowed:false,reason:'ELIGIBILITY_UNVERIFIED'};
  if(policy.allowedRoutes?.[profileId]?.includes(route)!==true)return {allowed:false,reason:'RELATION_PATH_LOCKED'};
  const h05=Object.values(eventCatalog).find(e=>e.profileId===profileId&&e.stage==='H05'&&e.category==='GENERAL'&&(!e.route||e.route===route));
  if(r.BOND_SCORE<100||!(r.events.H05==='COMPLETE'||h05&&r.events[h05.id]==='COMPLETE'))return {allowed:false,reason:'GENERAL_RELATION_REQUIRED'};
  if(r.ADULT_ROUTE_LOCKED_STATE===true)return {allowed:false,reason:'RELATION_PATH_LOCKED'};
  return {allowed:true,reason:'VERIFIED'};
 };
 P.effectiveMatureBond=function(profileId){const r=this.relation(profileId);return this.adultModeEnabled()&&this.matureEligibility(profileId).allowed?(r.matureBondScore??100):100;};
 P.invalidateRelationshipConsent=function(reason='SCENE_CHANGED'){
  const s=getSession(this);sessions.delete(this);return s?{interrupted:true,committed:!!s.committed,eventId:s.eventId,returnNode:s.returnNode||null,reason}:null;
 };
 P.setAdultMode=function(enabled){
  if(typeof enabled!=='boolean')fail('PREFERENCE','설정 값이 올바르지 않습니다.');modes.set(this,enabled);
  const interruption=this.invalidateRelationshipConsent(enabled?'MODE_CHANGED':'MODE_OFF');
  if(interruption&&!enabled){
   if(interruption.returnNode){this.s.global.CURRENT_STORY_NODE_ID=interruption.returnNode;this.s.global.STORY_CURSOR_NODE_ID=interruption.returnNode;this.s.global.SCREEN_MODE='STORY';}
   else {this.s.global.SCREEN_MODE='SYSTEM';this.s.relationshipInterrupted={eventId:interruption.eventId,committed:interruption.committed,reason:'MODE_OFF'};}
  }
  if(options.onExposureChanged)options.onExposureChanged(this,{enabled,interruption});
  return {enabled,interruption};
 };
 P.canExposeRelationshipContent=function(item,profileId){
  if(item?.category==='GENERAL')return true;
  if(item?.category!=='MATURE_ROMANCE'||item.verifiedClassification!==true||!profileId)return false;
  return this.adultModeEnabled()&&this.matureEligibility(profileId).allowed;
 };
 P.dailyRelationshipActivity=function(profileId,{bondDelta=0,sourceId,minutes=30}={}){
  if(!sourceId||!Number.isFinite(bondDelta)||minutes!==30)fail('ACTIVITY_DEFINITION','확인된 일상 활동 정의가 필요합니다.');
  if(this.s.runtime)fail('COMBAT','전투 중에는 교류할 수 없습니다.');
  const r=this.relation(profileId);if(r.firstContact===null)fail('FIRST_CONTACT','먼저 만난 인물과 교류할 수 있습니다.');
  const g=this.s.global,key=[g.SAVE_ID,g.STORY_ROUTE_ID,profileId,g.WORLD_DAY].join('|');
  if(r.activityReceipts[key])return {...copy(r.activityReceipts[key]),duplicate:true};
  const previousMature=r.matureBondScore??null;
  const general=this.changeBond(profileId,0,{source:sourceId});
  // Daily activities preserve both score currencies; only their narrative/time receipt advances.
  this.advanceTime(30);
  const receipt={key,sourceId,minutes:30,day:Number(key.split('|').at(-1)),turn:g.TURN,general,matureBefore:previousMature,matureAfter:r.matureBondScore??null};r.activityReceipts[key]=receipt;return copy(receipt);
 };
 P.lastRelationshipActivity=function(profileId){return Object.values(this.relation(profileId).activityReceipts).sort((a,b)=>(b.day-a.day)||(b.turn-a.turn))[0]||null;};
 P.relationshipActivityReason=function(def){
  const g=this.s.global;if(!def||def.route!==g.STORY_ROUTE_ID)return '현재 여정의 활동이 아닙니다.';
  if(g.STORY_MENU_POLICY==='SAVE_LOAD_ONLY')return '현재 장면에서는 이야기를 계속하거나 저장할 수 있습니다.';
  if(this.s.runtime)return '전투를 먼저 마쳐 주세요.';
  const r=this.s.relations[def.profileId];if(!r||r.firstContact===null)return '먼저 실제로 만난 인물과 교류할 수 있습니다.';
  if(!(this.storyDone?.(def.legendQuest)||this.s.quests[def.legendQuest]?.claimed||this.s.flags[def.completeFlag]===true))return '개인 이야기를 먼저 마쳐 주세요.';
  const key=[g.SAVE_ID,g.STORY_ROUTE_ID,def.profileId,g.WORLD_DAY].join('|');if(r.activityReceipts?.[key])return '오늘은 이미 함께 활동했습니다.';
  // Daily narrative and stage prerequisites remain usable between arbitrary battle scores.
  return '';
 };
 P.relationshipActivityEntries=function(){return Object.values(activities).filter(d=>d.route===this.s.global.STORY_ROUTE_ID&&this.s.relations[d.profileId]?.firstContact!==undefined&&this.s.relations[d.profileId]?.firstContact!==null).map(d=>({...d,reason:this.relationshipActivityReason(d)}));};
 P.beginMatureRelationshipEvent=function(eventId,{replay=false}={}){
  this.invalidateRelationshipConsent('SCENE_CHANGED');
  const def=eventCatalog[eventId];if(!def||def.category!=='MATURE_ROMANCE'||def.verifiedClassification!==true)fail('MATURE_DEFINITION','확인되지 않은 전용 사건입니다.');
  if(!this.canExposeRelationshipContent(def,def.profileId))fail('MATURE_LOCKED','관계 확장 조건이 충족되지 않았습니다.');
  const r=this.relation(def.profileId);
  if(r.BOND_SCORE<(def.generalScore??100)||this.effectiveMatureBond(def.profileId)<(def.matureScore??100)||(def.requires||[]).some(id=>!this.relationshipEventComplete(id))||!def.condition||options.testCondition?.(this,def.condition)!==true)fail('MATURE_PREREQUISITE','이 사건의 선행 조건과 현재 상황을 확인해야 합니다.');
  sessions.set(this,{eventId,profileId:def.profileId,consent:false,committed:false,replay,returnNode:def.safeReturnNode||null,sceneId:def.entryNode});
  return {eventId,requiresConsent:true,replay};
 };
 P.confirmRelationshipConsent=function(eventId,accepted){const s=getSession(this);if(!s||s.eventId!==eventId)fail('CONSENT_SCENE','현재 사건을 다시 확인해 주세요.');if(accepted!==true)return this.invalidateRelationshipConsent('DECLINED');s.consent=true;return {accepted:true};};
 P.commitMatureRelationshipEvent=function(eventId,commitId){
  const s=getSession(this),def=eventCatalog[eventId];
  if(!s||s.eventId!==eventId||!s.consent||!this.canExposeRelationshipContent(def,def.profileId))fail('CONSENT_REQUIRED','현재 장면에서 명시적으로 동의해야 합니다.');
  if(s.replay)fail('REPLAY_READONLY','회상에서는 진행과 보상을 변경하지 않습니다.');
  if(typeof commitId!=='string'||!commitId.startsWith(this.s.global.SAVE_ID+':'))fail('COMMIT_ID','유효한 사건 커밋 식별자가 필요합니다.');
  const r=this.relation(s.profileId);if(r.matureReceipts[commitId])return {...copy(r.matureReceipts[commitId]),duplicate:true};
  if(s.committed)fail('EVENT_COMMITTED','이 장면은 이미 확정됐습니다.');
  const receipt={eventId,commitId,turn:this.s.global.TURN};r.matureReceipts[commitId]=receipt;r.events[eventId]='COMPLETE';r.FIRST_ADULT_EVENT_DONE_STATE=true;r.ADULT_REPEAT_COUNT_STATE++;s.committed=true;
  return copy(receipt);
 };
 // Legacy dialogue may still author heart changes; preserve narrative without adding bond.
 if(oldPersonal)P.personal=function(id,choice){
  const raw=this.row('51_EVENT_DB',id),def=JSON.parse(raw[13]||'{}'),r=this.relation(def.profile_id),before=r.BOND_SCORE;
  const result=oldPersonal.call(this,id,choice);r.BOND_SCORE=before;this.changeBond(def.profile_id,0,{source:id});result.heart=r.heart;result.score=r.BOND_SCORE;return result;
 };
 P.apply=function(a){
  if(a.type==='RELATION_ACTIVITY'){const def=activities[a.activityId];if(!def)fail('ACTIVITY_DEFINITION','준비된 교류 활동이 아닙니다.');const reason=this.relationshipActivityReason(def);if(reason)fail('ACTIVITY_LOCKED',reason);const receipt=this.dailyRelationshipActivity(def.profileId,{bondDelta:0,sourceId:a.activityId});return {...receipt,dialogue:def.dialogue,profileId:def.profileId,title:def.title};}
  return oldApply.call(this,a);
 };
 return api;
}
const api={install,heart,migrateState,normalizeRecord,catalogFromDB,activitiesFromDB,RelationshipError,HEART_THRESHOLDS,STATE_COLUMNS};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CRPGRelationships=api;
})(typeof globalThis!=='undefined'?globalThis:this);
