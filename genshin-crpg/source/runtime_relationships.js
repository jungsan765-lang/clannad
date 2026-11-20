(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const cap=(n,min,max)=>Math.max(min,Math.min(max,n));
// 0.16.69: 호감도는 0~100(하트 5개)이 전부다. 100을 넘는 단계와 성인 관련 경로는 모두 지웠다.
const BOND_MAX=100;
const HEART_THRESHOLDS=[20,40,60,80,100];
const STATE_COLUMNS={HEART:'HEART_STATE'};
// The fields a relationship record holds. Anything else an earlier version wrote is dropped on load.
const RECORD_FIELDS=new Set(['saveId','routeId','profileId','relationSchemaVersion','BOND_SCORE','heart','HEART_STATE','firstContact','unlocked','events','companion','activityReceipts','eventCompletedAt']);
class RelationshipError extends Error {constructor(code,message){super(message);this.name='RelationshipError';this.code=code;}}
const fail=(code,message)=>{throw new RelationshipError(code,message)};
const numeric=(v,fallback=0)=>v===null||v===''||v===undefined?fallback:(Number.isFinite(Number(v))?Number(v):fail('RELATION_SCORE','관계 점수가 올바르지 않습니다.'));
const heart=score=>Math.min(5,Math.floor(Math.max(0,numeric(score))/20));
function catalogFromDB(db){
 const rows=db['58_MOND_AFFECTION_DB']||[],header=rows[0]||[],out={};
 for(const row of rows.slice(1)){
  const r=Object.fromEntries(header.map((k,i)=>[k,row[i]]));if(r.STATUS!=='ACTIVE')continue;
  const general=['PERSONAL_BOND','FRIENDSHIP_CHILD_SAFE'].includes(r.RELATION_KIND);
  out[r.EVENT_ID]={id:r.EVENT_ID,profileId:r.PROFILE_ID,route:r.ROUTE_SCOPE,category:general?'GENERAL':'UNVERIFIED',verifiedClassification:general,stage:r.EVENT_ID.match(/_(H0[1-5])$/)?.[1],entryNode:r.ENTRY_NODE_ID,generalScore:Number(r.BOND_SCORE_MIN)||Math.min(5,Number(r.HEART_MIN)||0)*20,heartMin:Math.min(5,Number(r.HEART_MIN)||0),requires:r.PREV_EVENT_ID?[r.PREV_EVENT_ID]:[],requiredQuest:r.REQUIRED_QUEST_ID,requiredFlags:r.REQUIRED_FLAGS,condition:r.REQUIRED_FLAGS||null,source:{table:'58_MOND_AFFECTION_DB',id:r.EVENT_ID},assetsPolicy:'DEFAULT_PORTRAIT'};
 }
 return out;
}
function activitiesFromDB(db){
 const objects=name=>{const rows=db[name]||[],h=rows[0]||[];return rows.slice(1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));};
 const definitions=objects('51_EVENT_DB'),aff=objects('58_MOND_AFFECTION_DB'),out={};
 const baseForRoute={ROUTE_TRAVELER:'EVT_MOND_DAILY_BOND',ROUTE_ISEKAI:'EVT_ISK_DAILY_BOND'};
 const decode=id=>{const row=definitions.find(e=>e.EVENT_ID===id&&e.ACTIVE==='Y');if(!row)return null;try{return {row,payload:JSON.parse(row.EXEC_PAYLOAD_JSON)}}catch{return null}};
 for(const legend of objects('56_MOND_LEGEND_DB')){
  const base=decode(baseForRoute[legend.ROUTE_SCOPE]);if(!base||legend.STATUS!=='ACTIVE'||!legend.DAILY_ACTIVITY)continue;
  const payload=base.payload;if(payload.minutes!==30||!Number.isFinite(payload.bond_score_delta)||!Array.isArray(payload.allowed_transitions))continue;
  const related=aff.filter(a=>a.PROFILE_ID===legend.PROFILE_ID&&a.ROUTE_SCOPE===legend.ROUTE_SCOPE&&a.STATUS==='ACTIVE');
  const transitions=payload.allowed_transitions.map(t=>({...t,requiredDone:related.find(a=>a.EVENT_ID.endsWith('_'+t.required_done_suffix))?.EVENT_ID,requiredNotDone:related.find(a=>a.EVENT_ID.endsWith('_'+t.required_not_done_suffix))?.EVENT_ID})).filter(t=>t.requiredDone&&t.requiredNotDone);
  if(!transitions.length)continue;
  const h05=related.find(a=>a.EVENT_ID.endsWith('_H05'))?.EVENT_ID;
  const id='DAILY:'+legend.LEGEND_ID;
  out[id]={id,profileId:legend.PROFILE_ID,route:legend.ROUTE_SCOPE,title:legend.DAILY_ACTIVITY,dialogue:legend.DAILY_DIALOGUE_KO||'',name:legend.DISPLAY_NAME,completeFlag:legend.COMPLETE_FLAG_ID,legendQuest:legend.QUEST_ID,bondDelta:payload.bond_score_delta,minutes:payload.minutes,transitions,h05,sourceId:base.row.EVENT_ID};
 }
 return out;
}
function normalizeRecord(record,identity){
 const r=record||{};
 if(r.saveId&&r.saveId!==identity.saveId||r.routeId&&r.routeId!==identity.routeId||r.profileId&&r.profileId!==identity.profileId)fail('RELATION_IDENTITY','다른 저장 또는 루트의 관계 기록입니다.');
 if(!own(r,'BOND_SCORE'))r.BOND_SCORE=own(r,'bondScore')?numeric(r.bondScore):20*Math.max(0,numeric(r.HEART_STATE??r.heart));
 r.BOND_SCORE=cap(numeric(r.BOND_SCORE),0,BOND_MAX);
 // These aliases are compatibility projections, never independent currencies.
 r.heart=heart(r.BOND_SCORE);r.HEART_STATE=r.heart;delete r.bondScore;
 r.relationSchemaVersion=1;Object.assign(r,identity);
 r.events=r.events||{};r.unlocked=r.unlocked||[];
 if(!own(r,'firstContact'))r.firstContact=null;
 r.companion=r.companion||'LOCKED';
 r.activityReceipts=r.activityReceipts||{};r.eventCompletedAt=r.eventCompletedAt||{};
 for(const k of Object.keys(r))if(!RECORD_FIELDS.has(k))delete r[k];
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
function install(api,options={}){
 const Runtime=api.Runtime||api, P=Runtime.prototype;
 if(P.__relationshipsInstalled)return api;
 Object.defineProperty(P,'__relationshipsInstalled',{value:true});
 const eventCatalog=options.events||{}, activities=options.activities||{};
 const oldValidate=P.validateSave, oldNew=P.newGame, oldContact=P.markContact, oldPersonal=P.personal, oldApply=P.apply, oldReason=P.actionReason;
 P.validateSave=function(s){const m=migrateState(s);Object.assign(s,m);return oldValidate.call(this,s);};
 P.newGame=function(o){oldNew.call(this,o);this.s=migrateState(this.s);return copy(this.s);};
 P.relation=function(profileId){
  if(!this.s)fail('NO_SAVE','새 게임을 시작해 주세요.');
  this.row('04_CHAR_DB',profileId);
  this.s.relations=this.s.relations||{};
  return this.s.relations[profileId]=normalizeRecord(this.s.relations[profileId],{saveId:this.s.global.SAVE_ID,routeId:this.s.global.STORY_ROUTE_ID,profileId});
 };
 P.markContact=function(id){const r=oldContact.call(this,id);return this.relation(id);};
 P.changeBond=function(profileId,delta,meta={}){
  if(!Number.isFinite(delta))fail('RELATION_DELTA','호감도 변화량이 올바르지 않습니다.');
  const r=this.relation(profileId),before=r.BOND_SCORE;r.BOND_SCORE=cap(before+delta,0,BOND_MAX);r.heart=heart(r.BOND_SCORE);r.HEART_STATE=r.heart;
  return {profileId,previous:before,score:r.BOND_SCORE,heart:r.heart,change:r.BOND_SCORE-before,source:meta.source||null};
 };
 // v0.14.0: every companion in the battle party whose personal mission is done gains 1 per victory (formerly slot 2 only).
 // Besides the one-time 10 for finishing the personal mission, this is the only way bond grows.
 P.relationshipBattleTargets=function(battle){
  const route=this.s.global.STORY_ROUTE_ID,chars=this.rows('04_CHAR_DB'),legends=[...this.storyIndex().legends.values()],out=[];
  for(const actor of battle?.actors||[]){
   if(actor.side!=='ALLY'||actor.source==='PLAYER_CUSTOM'||out.some(t=>t.charId===actor.source))continue;
   const profile=chars.find(row=>row[1]===actor.source)?.[0];
   const legend=profile&&legends.find(d=>d.ROUTE_SCOPE===route&&d.PROFILE_ID===profile&&this.storyDone(d.id));
   if(legend)out.push({profileId:profile,charId:actor.source,slot:Number(actor.slot)||null,legend:legend.id});
  }
  return out;
 };
 P.relationshipBattleTarget=function(battle){const targets=this.relationshipBattleTargets(battle);return targets.length?targets:null;};
 P.awardBattleBond=function(battle){
  const existing=this.s.relationshipBattleReceipts?.[battle.id];if(existing)return copy(existing);
  // A battle saved before v0.14.0 holds a single slot-2 target (or null); settle it with the current party rule.
  const stored=own(battle,'relationshipTarget')&&Array.isArray(battle.relationshipTarget)?battle.relationshipTarget:this.relationshipBattleTargets(battle);
  // source identifies characters; actor.id may identify a temporary story actor.
  const targets=stored.filter(t=>battle.actors.some(a=>a.side==='ALLY'&&a.source===t.charId)&&this.row('04_CHAR_DB',t.profileId)[1]===t.charId);
  if(!targets.length)return null;
  const gains=targets.map(t=>({...t,...this.changeBond(t.profileId,1,{source:'BATTLE:'+battle.id})}));
  const receipt={battleId:battle.id,...gains[0],gains};this.s.relationshipBattleReceipts||={};this.s.relationshipBattleReceipts[battle.id]=copy(receipt);return receipt;
 };
 P.relationshipHeart=function(id){return this.relation(id).heart;};
 P.relationshipEventComplete=function(eventId){return Object.values(this.s.relations||{}).some(r=>r.events?.[eventId]==='COMPLETE');};
 P.completeAffection=function(eventId,context={}){
  const event=eventCatalog[eventId]||context;
  const profileId=context.profileId||event.profileId;
  if(!profileId)fail('AFFECTION_PROFILE','사건의 인물 연결이 없습니다.');
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
 P.dailyRelationshipActivity=function(profileId,{bondDelta=0,sourceId,minutes=30}={}){
  if(!sourceId||!Number.isFinite(bondDelta)||minutes!==30)fail('ACTIVITY_DEFINITION','확인된 일상 활동 정의가 필요합니다.');
  if(this.s.runtime)fail('COMBAT','전투 중에는 교류할 수 없습니다.');
  const r=this.relation(profileId);if(r.firstContact===null)fail('FIRST_CONTACT','먼저 만난 인물과 교류할 수 있습니다.');
  const g=this.s.global,key=[g.SAVE_ID,g.STORY_ROUTE_ID,profileId,g.WORLD_DAY].join('|');
  if(r.activityReceipts[key])return {...copy(r.activityReceipts[key]),duplicate:true};
  const general=this.changeBond(profileId,0,{source:sourceId});
  // Daily activities keep the score; only their narrative/time receipt advances.
  this.advanceTime(30);
  const receipt={key,sourceId,minutes:30,day:Number(key.split('|').at(-1)),turn:g.TURN,general};r.activityReceipts[key]=receipt;return copy(receipt);
 };
 P.lastRelationshipActivity=function(profileId){return Object.values(this.relation(profileId).activityReceipts).sort((a,b)=>(b.day-a.day)||(b.turn-a.turn))[0]||null;};
 P.relationshipActivityReason=function(def){
  const g=this.s.global;if(!def||def.route!==g.STORY_ROUTE_ID)return '현재 여정의 활동이 아닙니다.';
  if(g.STORY_MENU_POLICY==='SAVE_LOAD_ONLY')return '현재 장면에서는 이야기를 계속하거나 저장할 수 있습니다.';
  if(this.s.runtime)return '전투를 먼저 마쳐 주세요.';
  const r=this.s.relations[def.profileId];if(!r||r.firstContact===null)return '먼저 실제로 만난 인물과 교류할 수 있습니다.';
  if(!(this.storyDone?.(def.legendQuest)||this.s.quests[def.legendQuest]?.claimed||this.s.flags[def.completeFlag]===true))return '개인임무를 먼저 마쳐 주세요.';
  const key=[g.SAVE_ID,g.STORY_ROUTE_ID,def.profileId,g.WORLD_DAY].join('|');if(r.activityReceipts?.[key])return '오늘은 이미 함께 활동했습니다.';
  // Daily narrative and stage prerequisites remain usable between arbitrary battle scores.
  return '';
 };
 // v0.14.0: daily "교류 활동" chores were removed; relationships grow through personal missions and affection scenes.
 P.relationshipActivityEntries=function(){return [];};
 // Legacy dialogue may still author heart changes; preserve narrative without adding bond.
 if(oldPersonal)P.personal=function(id,choice){
  const raw=this.row('51_EVENT_DB',id),def=JSON.parse(raw[13]||'{}'),r=this.relation(def.profile_id),before=r.BOND_SCORE;
  const result=oldPersonal.call(this,id,choice);r.BOND_SCORE=before;this.changeBond(def.profile_id,0,{source:id});result.heart=r.heart;result.score=r.BOND_SCORE;return result;
 };
 P.actionReason=function(type,params={}){if(type==='RELATION_ACTIVITY')return '일상 교류 활동은 더 이상 없습니다. 관계는 함께한 이야기로 깊어집니다.';return oldReason?.call(this,type,params)||'';};
 P.apply=function(a){
  if(a.type==='RELATION_ACTIVITY')fail('ACTIVITY_REMOVED','일상 교류 활동은 더 이상 없습니다. 관계는 함께한 이야기로 깊어집니다.');
  return oldApply.call(this,a);
 };
 return api;
}
const api={install,heart,migrateState,normalizeRecord,catalogFromDB,activitiesFromDB,RelationshipError,HEART_THRESHOLDS,STATE_COLUMNS,BOND_MAX};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CRPGRelationships=api;
})(typeof globalThis!=='undefined'?globalThis:this);
