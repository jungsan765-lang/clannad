/* Additive geography and transactional, timed exploration. */
(function(root){
'use strict';if(!root.CRPGWorldContent)return;
const api=root.CRPGRuntime,P=api.Runtime.prototype,C=root.CRPGWorldContent;
const old=Object.fromEntries(['newGame','validateSave','apply','actionReason','questChoice','claimQuest','finishBattle'].map(k=>[k,P[k]]));
const copy=x=>JSON.parse(JSON.stringify(x)),fail=(c,m)=>{throw new api.RuleError(c,m);};
const LETTER=C.letterCommission.quest,ITEM=api.explorationCatalog.item;
P.installWorldContent=function(){
 if(this._worldInstalled)return;this.installLifeContent();this.db={...this.db};
 const add=(key,rows)=>{
  const all=this.db[key].map(r=>r.slice());
  // A pool has multiple probability bands. Do not deduplicate them by POOL_ID.
  // Time/weather/flag variants of the same band also remain separate definitions.
  const identity=key==='34_MAP_ENCOUNTER_POOL'
   ?r=>JSON.stringify([r[0],r[1],r[2],r[3],r[4],r[6]||'',r[7]||'',r[8]||''])
   :r=>r[0];
  const seen=new Set(all.slice(1).filter(r=>r[0]).map(identity));
  for(const row of rows){const id=identity(row);if(!seen.has(id)){all.push(copy(row));seen.add(id);}}
  this.db[key]=all;this.tables[key]=new Map(all.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));
 };
 add('32_MAP_DB',C.mapRows);add('47_MAP_EDGE_DB',[...C.edgeRows,['EDGE_CRPG_FOREST_PLAINS','MAP_MOND_FOREST','MAP_MOND_PLAINS','WORLD_MOVE',1,10,'','','Y','숲 가장자리를 따라 외곽 초원으로','EDGE_CRPG_PLAINS_FOREST','ACTIVE','CRPG_LOCAL_V011',''],['EDGE_CRPG_PLAINS_FOREST','MAP_MOND_PLAINS','MAP_MOND_FOREST','WORLD_MOVE',1,10,'','','Y','숲 가장자리로 이동','EDGE_CRPG_FOREST_PLAINS','ACTIVE','CRPG_LOCAL_V011','']]);add('34_MAP_ENCOUNTER_POOL',C.encounterRows);add('19_SHOP_STOCK_DB',C.requiredNewStockRows);
 for(const m of C.mapRenames||[]){const r=this.tables['32_MAP_DB'].get(m.id);if(r)r[2]=m.name;}this._worldInstalled=true;
};
P.ensureWorldProgress=function(s=this.s){return s.worldProgress??={version:1,oculi:{},commissions:{},training:{day:0,count:0},mastery:0,milestones:{}};};
P.oculusPoint=function(id){return C.oculi.find(p=>p.id===id);};
P.oculusStep=function(id){const p=this.oculusPoint(id);return p?.steps[this.s.worldProgress?.oculi[id]||0];};
P.worldRequirement=function(p){
 const s=this.s,g=s.global,r=p.requirements||{};
 if(g.CURRENT_MAP_ID!==p.map)return '흔적이 있는 장소에 먼저 도착해 주세요.';
 if(g.PLAYER_LEVEL_STATE<p.level)return '권장 준비 단계 · Lv. '+p.level+'부터 조사할 수 있습니다.';
 if(p.place){if(s.placeVisit?.place!==p.place||!this.currentPlace()?.valid)return '몬드 잡화 상점 안에서 상인에게 물어보세요.';}else if(s.placeVisit)return '시설 밖에서 주변을 살펴보세요.';
 if(r.bond&&this.storyBond(r.profile)<r.bond)return '엠버와의 호감도 '+r.bond+'가 필요합니다. 개인 임무 후 2번 슬롯에서 함께 전투해 보세요.';
 const active=this.s.party.filter(p=>p.active).map(p=>p.source==='PLAYER_CUSTOM'?this.player():this.character(p.source)).filter(a=>a.hp>0);
 if(r.activeCharacter&&!active.some(a=>a.source===r.activeCharacter||a.id===r.activeCharacter))return '엠버를 살아 있는 파티원으로 편성해 주세요.';
 if(r.activeElement&&!active.some(a=>a.id!=='PLAYER_CUSTOM'&&String(this.row('07_CHAR_DB',a.id)[3]).includes('['+r.activeElement+']')))return '불 원소의 파티원과 함께 화로를 조사해 주세요.';
 if(r.timeWindow){const [h,mn]=String(g.WORLD_TIME).split(':').map(Number),m=h*60+mn;if(!(m>=r.timeWindow[0]||m<r.timeWindow[1]))return '밤 18:00~06:00에 빛을 확인할 수 있습니다.';}
 if(r.itemsOwned)for(const [id,n]of Object.entries(r.itemsOwned))if(this.itemCount(id)<n)return this.row('14_ITEM_DB',id)[1]+'이 필요합니다. 몬드 잡화 상점에서 준비할 수 있습니다.';
 if(r.visitedMaps?.some(id=>!s.exploration?.visitedMaps[id]))return '먼저 바람맞이 산, 천풍 신전, 맹세의 갑각을 직접 여행해 보세요.';
 return '';
};
P.oculusEntries=function(){return C.oculi.filter(p=>p.map===this.s.global.CURRENT_MAP_ID&&!this.s.exploration?.oculi[p.id]&&(!p.place||p.place===this.s.placeVisit?.place)).map(p=>({...p,step:this.oculusStep(p.id),progress:this.s.worldProgress?.oculi[p.id]||0,reason:this.worldRequirement(p)}));};
P.letterStage=function(){const q=this.s.quests[LETTER];return q?.claimed||q?.node==='READY_TO_CLAIM'?null:C.letterCommission.newStages[this.s.worldProgress?.commissions[LETTER]||0];};
P.worldWorkSpec=function(a){
 const g=this.s.global;
 if(a.kind==='OCULUS'){const p=this.oculusPoint(a.point),step=this.oculusStep(a.point);if(!p||!step||this.s.exploration?.oculi[a.point])fail('OCULUS','이미 회수했거나 조사할 수 없는 흔적입니다.');const reason=this.worldRequirement(p);if(reason)fail('OCULUS',reason);return {kind:a.kind,point:p.id,stage:step.id,label:step.label,duration:step.duration,step};}
 if(a.kind==='COMMISSION'){
  if(a.quest!==LETTER||!this.commissionAccepted(LETTER)||!this.letterStage())fail('QUEST','캐서린에게 이 의뢰를 먼저 받아 주세요.');
  const step=this.letterStage();if(g.CURRENT_MAP_ID!==C.letterCommission.map)fail('QUEST','몬드 성문 앞에서 편지를 정리해 주세요.');
  if(step.requiresPlace&&!this.atGuild())fail('QUEST','캐서린에게 찾아가 편지를 전달해 주세요.');
  if(!step.requiresPlace&&this.s.placeVisit)fail('QUEST','시설 밖의 성문 앞으로 나가 주세요.');
  return {kind:a.kind,quest:LETTER,stage:step.node,label:step.label,duration:step.duration,step};
 }
 if(a.kind==='TRAIN'){
  if(!this.atGuild())fail('TRAIN','모험가 길드에서 훈련을 신청해 주세요.');
  const t=this.ensureWorldProgress().training;if(t.day===g.WORLD_DAY&&t.count>=3)fail('TRAIN','오늘의 훈련 3회를 마쳤습니다. 다음 날 다시 신청하세요.');
  if(g.MORA<50)fail('COST','훈련비 50 모라가 필요합니다.');
  return {kind:a.kind,stage:'TRAIN',label:'길드 기초 전투 훈련',duration:10000,step:{cost:{mora:50}}};
 }
 fail('WORLD_WORK','진행할 작업을 확인해 주세요.');
};
P.completeWorldStep=function(spec,a={}){
 const w=this.ensureWorldProgress(),g=this.s.global,step=spec.step;
 if(spec.kind==='OCULUS'){
  if(step.options&&a.answer!==step.answer)fail('PUZZLE','바람의 흐름과 단서를 다시 살펴보세요.');
  if(step.sequence&&JSON.stringify(a.sequence)!==JSON.stringify(step.sequence))fail('PUZZLE','풍경에 새겨진 순서와 바람의 노래를 맞춰 보세요.');
  if(step.combatGroup){this.s.oculusBattle={point:spec.point,stage:step.id};return this.startBattle(step.combatGroup,'WORLD_OCULUS:'+spec.point);}
  if(step.cost)this.pay(step.cost);
  w.oculi[spec.point]=(w.oculi[spec.point]||0)+1;
  if(w.oculi[spec.point]===this.oculusPoint(spec.point).steps.length){const e=this.ensureExplorationState();e.oculi[spec.point]={map:g.CURRENT_MAP_ID,day:g.WORLD_DAY,action:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1)};this.giveItem(ITEM,1);return {point:spec.point,items:{[ITEM]:1}};}
  return {point:spec.point,progress:w.oculi[spec.point]};
 }
 if(spec.kind==='COMMISSION'){w.commissions[LETTER]=(w.commissions[LETTER]||0)+1;this.advanceTime(step.minutes);const q=this.questState(LETTER);q.attempts=(q.attempts||0)+1;q.node=step.next;q.state='진행중';return {quest:LETTER,stage:step.next};}
 this.pay(step.cost);const t=w.training;t.count=t.day===g.WORLD_DAY?t.count+1:1;t.day=g.WORLD_DAY;
 const owners=this.ownedActors().filter(a=>a.active).map(a=>a.id);for(const id of owners)this.addXp(id,250);this.advanceTime(30);return {training:true,xp:250,owners};
};
P.startWorldWork=function(a){const spec=this.worldWorkSpec(a);if(!spec.duration)return this.completeWorldStep(spec,a);if(spec.step.cost)this.checkWorldCost(spec.step.cost);this.s.worldJob={kind:spec.kind,point:spec.point,quest:spec.quest,stage:spec.stage,label:spec.label,duration:spec.duration,map:this.s.global.CURRENT_MAP_ID,startedAt:Date.now(),id:this.s.global.SAVE_ID+':W'+(this.s.global.LAST_COMMITTED_ACTION_SEQ+1)};return copy(this.s.worldJob);};
P.checkWorldCost=function(cost){if((cost.mora||0)>this.s.global.MORA)fail('COST','필요한 모라가 부족합니다.');for(const [id,n]of Object.entries(cost.items||{}))if(this.itemCount(id)<n)fail('COST',this.row('14_ITEM_DB',id)[1]+' '+n+'개가 필요합니다.');};
P.finishWorldWork=function(id){const job=this.s.worldJob;if(!job||job.id!==id||job.map!==this.s.global.CURRENT_MAP_ID)fail('WORLD_WORK','현재 진행 중인 작업이 아닙니다.');const spec=this.worldWorkSpec(job);if(spec.stage!==job.stage||spec.duration!==job.duration)fail('WORLD_WORK','작업 단계가 일치하지 않습니다.');if(Date.now()-job.startedAt<job.duration)fail('WORLD_WAIT','작업 게이지가 찰 때까지 기다려 주세요.');delete this.s.worldJob;return this.completeWorldStep(spec);};
P.questChoice=function(id,choice){if(id===LETTER){if(choice!=='careful')fail('QUEST','올바른 의뢰 진행을 선택해 주세요.');return this.startWorldWork({kind:'COMMISSION',quest:id});}return old.questChoice.call(this,id,choice);};
P.claimQuest=function(id,...rest){if(id===LETTER&&!this.atGuild())fail('QUEST','캐서린에게 결과를 보고하고 보상을 받아 주세요.');return old.claimQuest.call(this,id,...rest);};
P.finishBattle=function(win){const b=this.s.runtime,point=this.s.oculusBattle;const result=old.finishBattle.call(this,win);if(b?.origin==='WORLD_OCULUS:'+point?.point){if(win){const w=this.ensureWorldProgress(),step=this.oculusStep(point.point);if(step?.id===point.stage)w.oculi[point.point]=(w.oculi[point.point]||0)+1;}delete this.s.oculusBattle;}return result;};
P.actionReason=function(type,a={}){
 if(this.s.worldJob){if(type==='WORLD_WORK_CANCEL')return '';if(type==='WORLD_WORK_FINISH')return a.job===this.s.worldJob.id?'':'진행 중인 작업을 확인해 주세요.';if(type==='MENU'&&['SYSTEM','SAVE','LOAD','SETTINGS'].includes(a.screen))return '';return '작업을 마치거나 취소한 뒤 이동할 수 있습니다.';}
 if(['WORLD_WORK_FINISH','WORLD_WORK_CANCEL'].includes(type))return '진행 중인 작업이 없습니다.';
 if(type==='OCULUS_COLLECT')return '흔적의 단서를 조사하고 조건을 해결해 주세요.';
 const reason=old.actionReason.call(this,type,a);if(reason)return reason;
 if(type==='WORLD_WORK_START'){try{const spec=this.worldWorkSpec(a);if(spec.step.cost)this.checkWorldCost(spec.step.cost);}catch(e){return e.message;}}
 if(type==='MASTERY'){const rank=this.s.worldProgress?.mastery||0;if(!this.atGuild())return '모험가 길드에서 무술을 배울 수 있습니다.';if(rank>=2)return '기초 무술 훈련을 모두 마쳤습니다.';if(this.s.global.PLAYER_LEVEL_STATE<3+rank*2)return 'Lv. '+(3+rank*2)+'부터 배울 수 있습니다.';if(this.s.global.MORA<100*(rank+1)||this.itemCount('ORE_IRON')<3*(rank+1))return (100*(rank+1))+' 모라와 철광석 '+(3*(rank+1))+'개가 필요합니다.';}
 if(type==='CLAIM_QUEST'&&a.quest===LETTER&&!this.atGuild())return '캐서린에게 결과를 보고하고 보상을 받아 주세요.';
 return '';
};
P.apply=function(a){this.ensureWorldProgress();if(a.type==='WORLD_WORK_START')return this.startWorldWork(a);if(a.type==='WORLD_WORK_FINISH')return this.finishWorldWork(a.job);if(a.type==='WORLD_WORK_CANCEL'){delete this.s.worldJob;return {cancelled:true};}if(a.type==='MASTERY'){const w=this.ensureWorldProgress(),rank=w.mastery;this.pay({mora:100*(rank+1),items:{ORE_IRON:3*(rank+1)}});w.mastery++;return {mastery:w.mastery,basicAttackBonus:w.mastery*30};}return old.apply.call(this,a);};
P.newGame=function(o){this.installWorldContent();old.newGame.call(this,o);this.ensureWorldProgress();return copy(this.s);};
P.validateSave=function(s){
 this.installWorldContent();const w=this.ensureWorldProgress(s);if(w.version!==1||!w.oculi||!w.commissions||!w.milestones||!Number.isInteger(w.mastery)||w.mastery<0||w.mastery>2||!w.training||!Number.isInteger(w.training.count)||w.training.count<0||w.training.count>3||!Number.isInteger(w.training.day)||w.training.day<0||w.training.day>s.global.WORLD_DAY)fail('WORLD_SAVE','탐험·훈련 기록을 확인해 주세요.');
 for(const [id,n]of Object.entries(w.oculi)){const p=this.oculusPoint(id);if(!p||!Number.isInteger(n)||n<0||n>p.steps.length)fail('WORLD_SAVE','눈동자 조사 단계를 확인해 주세요.');}
 for(const [id,n]of Object.entries(w.commissions))if(id!==LETTER||!Number.isInteger(n)||n<0||n>3)fail('WORLD_SAVE','편지 의뢰 단계를 확인해 주세요.');
 old.validateSave.call(this,s);
 if(s.worldJob){const facade=Object.create(this);facade.s=s;const j=s.worldJob,spec=facade.worldWorkSpec(j),phaseView=Object.create(this);phaseView.s={...s,lifeJob:undefined,worldJob:undefined};if(phaseView.playPhase()!=='FREE'||s.lifeJob||s.runtime||j.stage!==spec.stage||j.duration!==spec.duration||j.map!==s.global.CURRENT_MAP_ID||!Number.isSafeInteger(j.startedAt)||j.startedAt<0||j.startedAt>Date.now()+1000||typeof j.id!=='string'||!j.id.startsWith(s.global.SAVE_ID+':W'))fail('WORLD_SAVE','진행 중인 작업 기록을 확인해 주세요.');}
 return s;
};
api.worldVersion=1;
})(globalThis);
