/* Recovery, timed local resources and guild-accepted commissions. */
(function(root){
 'use strict';
 const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x));
 const old=Object.fromEntries(['apply','actionReason','playPhase','finishBattle','questConditions','questChoice','claimQuest','validateSave'].map(k=>[k,P[k]]));
 const json=x=>{try{return JSON.parse(x||'{}');}catch{return {};}};
 const yes=x=>x===true||x==='Y'||x==='TRUE',fail=(c,m)=>{throw new api.RuleError(c,m);};
 const lifeKinds={MINE:{label:'채광',column:26,limit:6},GATHER:{label:'채집',column:25,limit:4},FISH:{label:'낚시',column:27,limit:4},HUNT:{label:'사냥',column:28,limit:4}};
 const resourcePattern=/^([A-Z0-9_]+):(\d+)(?:-(\d+))?@(\d+)$/;
 P.needsRecovery=function(){return !this.s.runtime&&!this.s.storyRecovery&&this.s.global.PLAYER_HP_CURRENT<=0;};
 P.playPhase=function(){return this.needsRecovery()?'DOWNED':this.s.lifeJob?'LIFE':old.playPhase.call(this);};
 P.recoverParty=function(retreat=false){
  const g=this.s.global,wasStory=old.playPhase.call(this)!=='FREE';
  if(retreat&&!wasStory){const safe=this.tables['32_MAP_DB'].get(g.LAST_SAFE_MAP_ID);g.CURRENT_MAP_ID=safe&&yes(safe[12])?safe[0]:'MAP_MOND_CITY';this.s.placeVisit=null;}
  g.PLAYER_HP_CURRENT=g.PLAYER_HP_MAX;this.s.playerStatuses=[];
  for(const member of this.s.party.filter(x=>x.active&&x.source!=='PLAYER_CUSTOM')){const st=this.s.chars[member.source];if(st){st.hp=this.character(member.source).maxHp;st.statuses=[];}}
  this.advanceTime(60);const map=this.row('32_MAP_DB',g.CURRENT_MAP_ID);g.LOCATION=map[2];g.LOCATION_PROFILE=map[5];g.ENCOUNTER_COOLDOWN=1;
  g.SCREEN_MODE=wasStory?'STORY':'LOCATION';delete this.s.fieldDefeat;return {recovered:true,map:map[0],minutes:60};
 };
 P.finishBattle=function(victory){
  const battle=this.s.runtime,origin=battle?.origin,result=old.finishBattle.call(this,victory);
  if(!battle)return result;
  if(!victory&&!origin.startsWith('STORY:')){this.s.fieldDefeat={battle:battle.id,map:this.s.global.CURRENT_MAP_ID};this.s.placeVisit=null;}
  return result;
 };
 // Field-party scaling is owned by runtime_combat.js; do not stack a second pass here.
 P.lifePool=function(kind,map=this.s.global.CURRENT_MAP_ID){
  const spec=lifeKinds[kind],row=this.tables['32_MAP_DB'].get(map);if(!spec||!row||!row[spec.column]||row[spec.column]==='NONE')return [];
  if(kind==='MINE')return [{item:'ORE_IRON',min:1,max:1,weight:65},{item:'ORE_WHITE_IRON',min:1,max:1,weight:30},{item:'ORE_CRYSTAL',min:1,max:1,weight:5}];
  return String(row[spec.column]).split(';').map(x=>resourcePattern.exec(x.trim())).filter(Boolean).map(m=>({item:m[1],min:Number(m[2]),max:Number(m[3]||m[2]),weight:Number(m[4])})).filter(x=>this.tables['14_ITEM_DB'].has(x.item)&&x.weight>0);
 };
 P.lifeEntries=function(){
  const g=this.s.global;
  return Object.entries(lifeKinds).filter(([k])=>this.lifePool(k).length).map(([kind,spec])=>{const record=this.s.lifeResources?.[g.CURRENT_MAP_ID+':'+kind],used=record?.day===g.WORLD_DAY?record.used:0;return {kind,label:spec.label,limit:spec.limit,remaining:Math.max(0,spec.limit-used),seconds:10,minutes:10,pool:this.lifePool(kind)};});
 };
 P.startLife=function(kind){
  const reason=this.actionReason('LIFE_START',{kind});if(reason)fail('LIFE',reason);
  const g=this.s.global;this.s.lifeJob={id:g.SAVE_ID+':L'+(g.LAST_COMMITTED_ACTION_SEQ+1),kind,map:g.CURRENT_MAP_ID,day:g.WORLD_DAY,startedAt:Date.now(),duration:10000};g.SCREEN_MODE='LOCATION';return copy(this.s.lifeJob);
 };
 P.finishLife=function(id){
  const job=this.s.lifeJob,reason=this.actionReason('LIFE_FINISH',{job:id});if(reason)fail('LIFE',reason);
  if(Date.now()<job.startedAt+job.duration)fail('LIFE_WAIT','작업 게이지가 찰 때까지 기다려 주세요.');
  const pool=this.lifePool(job.kind,job.map),total=pool.reduce((n,x)=>n+x.weight,0);let roll=this.random()*total,drop=pool[pool.length-1];for(const x of pool){roll-=x.weight;if(roll<0){drop=x;break;}}
  const quantity=drop.min+Math.floor(this.random()*(drop.max-drop.min+1));this.giveItem(drop.item,quantity);
  this.s.lifeResources??={};const key=job.map+':'+job.kind,prior=this.s.lifeResources[key];this.s.lifeResources[key]={day:job.day,used:(prior?.day===job.day?prior.used:0)+1};
  delete this.s.lifeJob;this.advanceTime(10);this.s.global.SCREEN_MODE='LOCATION';return {job:job.id,kind:job.kind,items:{[drop.item]:quantity},minutes:10};
 };
 P.isCommission=function(id){const r=this.tables['22_QUEST_DB'].get(id);return !!r&&r[12]==='READY'&&['exploration','supply'].includes(json(r[10]).kind);};
 P.commissionAccepted=function(id){const q=this.s.quests[id];return !!q&&(q.guildAccepted||q.claimed||q.attempts>0||q.state==='진행중'||q.node==='READY_TO_CLAIM');};
 P.atGuild=function(){const place=this.currentPlace();return place?.valid&&place.entity==='NPC_MOND_KATHERYNE'&&place.mode==='TALK';};
 P.legendRegistered=function(id){const d=this.storyDefinition(id);return !!d&&(this.storyDone(d.id)||!!this.s.guildLegends?.[d.id]||!!this.s.storyCostReceipts?.[d.QUEST_ID]||!!this.s.quests[d.QUEST_ID]?.claimed||this.s.storyContext?.entry===d.id);};
 P.acceptCommission=function(id){
  const reason=this.actionReason('COMMISSION_ACCEPT',{quest:id});if(reason)fail('COMMISSION',reason);
  const q=this.questState(id);Object.assign(q,{guildAccepted:true,state:'진행중',acceptedTurn:this.s.global.TURN,node:'INVESTIGATE'});return {accepted:true,quest:id};
 };
 P.questConditions=function(id){
  if(this.isCommission(id)&&!this.commissionAccepted(id))return '안내원에게 의뢰를 먼저 받아 주세요.';
  return old.questConditions.call(this,id);
 };
 P.questChoice=function(id,choice){if(this.isCommission(id)&&!this.commissionAccepted(id))fail('COMMISSION','안내원에게 의뢰를 먼저 받아 주세요.');return old.questChoice.call(this,id,choice);};
 P.claimQuest=function(id,equipment){if(equipment&&!json(this.row('22_QUEST_DB',id)[11]).equipment_choice?.includes(equipment))fail('QUEST_REWARD','이 의뢰에서 받을 수 있는 장비를 선택해 주세요.');const result=old.claimQuest.call(this,id,equipment);this.s.global.SCREEN_MODE='LOCATION';return {...result,equipment};};
 P.commissionEntries=function(){return this.rows('22_QUEST_DB').filter(r=>this.isCommission(r[0])).map(row=>({row,definition:json(row[10]),reward:json(row[11]),state:this.s.quests[row[0]],accepted:this.commissionAccepted(row[0]),reason:this.questConditions(row[0])}));};
 P.actionReason=function(type,a={}){
  if(this.s.global.STORY_MENU_POLICY==='SAVE_LOAD_ONLY'&&type==='MENU'&&!['SYSTEM','SAVE','LOAD','SETTINGS','STORY'].includes(a.screen))return '이 장면에서는 이야기 진행과 저장만 할 수 있습니다.';
  if(this.needsRecovery()){
   if(type==='RECOVER')return '';
   if(type==='MENU'&&['SYSTEM','STATUS','INVENTORY','QUEST','RELATIONS','STORY'].includes(a.screen))return '';
   return '전투불능 상태입니다. 먼저 회복해 주세요.';
  }
  if(type==='RECOVER')return '회복이 필요한 전투불능 상태가 아닙니다.';
  if(this.s.lifeJob){
   if(type==='LIFE_CANCEL')return '';
   if(type==='LIFE_FINISH')return a.job===this.s.lifeJob.id&&this.s.global.CURRENT_MAP_ID===this.s.lifeJob.map?'':'현재 진행 중인 작업을 확인해 주세요.';
   if(type==='MENU'&&['LOCATION','SYSTEM','INVENTORY','QUEST','STATUS'].includes(a.screen))return '';
   return '진행 중인 생활 작업을 끝내거나 취소해 주세요.';
  }
  if(['LIFE_FINISH','LIFE_CANCEL'].includes(type))return '진행 중인 생활 작업이 없습니다.';
  const reason=old.actionReason.call(this,type,a);if(reason)return reason;
  if(type==='REST')return '숙박시설에 들어가 숙박하기를 선택해 주세요.';
  if(type==='LIFE_START'){
   if(this.s.placeVisit)return '시설 밖의 채집 구역에서 작업해 주세요.';
   const entry=this.lifeEntries().find(x=>x.kind===a.kind);return !entry?'이 구역에는 해당 자원이 없습니다.':entry.remaining<=0?'오늘 이 구역의 자원을 모두 채취했습니다. 다음 날 다시 이용할 수 있습니다.':'';
  }
  if(type==='COMMISSION_ACCEPT'){
   if(!this.atGuild())return '안내원에게 찾아가 의뢰를 받아 주세요.';
   if(!this.isCommission(a.quest))return '접수할 수 있는 의뢰가 아닙니다.';
   if(this.commissionAccepted(a.quest))return '이미 받았거나 완료한 의뢰입니다.';
   const r=this.row('22_QUEST_DB',a.quest),p=json(r[10]);
   if(p.conditions?.flags_false?.some(f=>yes(this.s.flags[f])))return '이미 완료한 의뢰입니다.';
   return '';
  }
  if(type==='LEGEND_REGISTER'){
   const d=this.storyDefinition(a.quest);
   if(!this.atGuild())return '안내원에게 개인 임무를 소개받아 주세요.';
   if(!d||d.kind!=='LEGEND'||d.ROUTE_SCOPE!==this.s.global.STORY_ROUTE_ID||d.STATUS!=='ACTIVE')return '소개받을 수 있는 개인 임무가 아닙니다.';
   if(this.storyDone(d.id))return '이미 마친 개인 임무입니다.';
   if(this.legendRegistered(d.id))return '이미 소개받은 개인 임무입니다.';
   return this.storyCondition(d.START_CONDITION,d)?'':'개인 임무의 선행 이야기를 먼저 진행해 주세요.';
  }
  if(type==='LEGEND_ENTER'&&!this.legendRegistered(a.quest||a.id))return '안내원에게 개인 임무를 먼저 소개받아 주세요.';
  return '';
 };
 P.apply=function(a){
  if(a.type==='RECOVER')return this.recoverParty(true);
  if(a.type==='REST')return this.recoverParty(false);
  if(a.type==='LIFE_START')return this.startLife(a.kind);
  if(a.type==='LIFE_FINISH')return this.finishLife(a.job);
  if(a.type==='LIFE_CANCEL'){delete this.s.lifeJob;return {cancelled:true};}
  if(a.type==='COMMISSION_ACCEPT')return this.acceptCommission(a.quest);
  if(a.type==='LEGEND_REGISTER'){const d=this.storyDefinition(a.quest);this.s.guildLegends??={};this.s.guildLegends[d.id]={day:this.s.global.WORLD_DAY};return {registered:true,quest:d.QUEST_ID};}
  const result=old.apply.call(this,a);
  if(a.type==='WAIT'&&a.minutes>=60&&!this.s.runtime){const encounter=this.rollEncounter(this.row('32_MAP_DB',this.s.global.CURRENT_MAP_ID));return {...result,encounter};}
  return result;
 };
 P.validateSave=function(s){
  old.validateSave.call(this,s);
  if(s.lifeResources!==undefined){if(!s.lifeResources||typeof s.lifeResources!=='object'||Array.isArray(s.lifeResources))fail('LIFE_SAVE','생활 자원 기록을 확인할 수 없습니다.');for(const [key,v]of Object.entries(s.lifeResources)){const split=key.lastIndexOf(':'),map=key.slice(0,split),kind=key.slice(split+1);if(!this.tables['32_MAP_DB'].has(map)||!lifeKinds[kind]||!Number.isInteger(v.day)||v.day<1||v.day>s.global.WORLD_DAY||!Number.isInteger(v.used)||v.used<0||v.used>lifeKinds[kind].limit)fail('LIFE_SAVE','생활 자원의 남은 수량이 잘못되었습니다.');}}
  const j=s.lifeJob;if(j){const phaseView=Object.create(this);phaseView.s={...s,lifeJob:undefined,worldJob:undefined};const phase=phaseView.playPhase();if(phase!=='FREE'||s.worldJob||s.placeVisit||!this.lifePool(j.kind,j.map).length||j.map!==s.global.CURRENT_MAP_ID||j.day!==s.global.WORLD_DAY||!Number.isSafeInteger(j.startedAt)||j.startedAt<0||j.duration!==(this.lifeJobDuration?.(j.kind)||10000)||typeof j.id!=='string'||!j.id.startsWith(s.global.SAVE_ID+':L')||s.global.PLAYER_HP_CURRENT<=0)fail('LIFE_SAVE','진행 중인 생활 작업을 확인할 수 없습니다.');}
  if(s.guildLegends!==undefined){if(!s.guildLegends||typeof s.guildLegends!=='object'||Array.isArray(s.guildLegends))fail('GUILD_SAVE','개인 임무 접수 기록을 확인할 수 없습니다.');for(const [id,v]of Object.entries(s.guildLegends)){const d=this.storyDefinition(id);if(!d||d.kind!=='LEGEND'||d.ROUTE_SCOPE!==s.global.STORY_ROUTE_ID||!Number.isInteger(v.day)||v.day<1||v.day>s.global.WORLD_DAY)fail('GUILD_SAVE','개인 임무 접수 기록이 올바르지 않습니다.');}}
  return s;
 };
 api.adventureVersion=1;
})(globalThis);
