/* Main-story pauses, arrival gates, permanent party and story encounter balance. */
(function(root){
'use strict';if(!root.CRPGWorldContent)return;const api=root.CRPGRuntime,P=api.Runtime.prototype,C=root.CRPGWorldContent.journey;
const copy=x=>JSON.parse(JSON.stringify(x)),json=x=>{try{return JSON.parse(x||'{}');}catch{return {};}};
const fail=(c,m)=>{throw new api.RuleError(c,m);};
const old=Object.fromEntries(['newGame','validateSave','apply','actionReason','playPhase','isStoryWaiting','storyFrame','storyRestoreFrame','enterStory','combatStoryConfig','startBattle','basicHit','finishBattle','personal'].map(k=>[k,P[k]]));
P.installJourneyContent=function(){
 if(this._journeyInstalled)return;this.installWorldContent();this.db={...this.db};
 const key='55_MAIN_STORY_DB',rows=this.db[key].map(r=>r.slice()),h=rows[0],col=h.indexOf('NODE_ID');
 for(const fix of C.choiceMapCorrections)for(const id of fix.nodes){const r=rows.find(r=>r[col]===id);if(r)r[h.indexOf('MAP_ID')]=fix.to;}
 for(const x of C.combatInsertions){const r=rows.find(r=>r[col]===x.afterNode);if(r&&r[h.indexOf('NEXT_NODE_ID')]===x.nextBefore)r[h.indexOf('NEXT_NODE_ID')]=x.node.NODE_ID;if(!rows.some(r=>r[col]===x.node.NODE_ID))rows.push(h.map(k=>x.node[k]??''));}
 this.db[key]=rows;this.tables[key]=new Map(rows.slice(1).map(r=>[r[0],r]));this._sharedStoryIndex=null;this._journeyInstalled=true;
};
P.storyTravelFor=function(r){const ids=[...String(r[12]).matchAll(/EVENT:(\w+)/g)].map(m=>m[1]);for(const id of ids){const e=this.storyEventDefinitions().find(e=>e.EVENT_ID===id),p=json(e?.EXEC_PAYLOAD_JSON);if(p.kind==='travel'||p.handler==='isk_story_travel')return {event:id,...p};}return null;};
P.storyArrivalGate=function(r){
 if(this.s.runtime||this.s.storyContext?.kind==='COMBAT_INTERLUDE'||['META','NOTE'].includes(r[5]))return false;
 const s=this.s,g=s.global,t=this.storyTravelFor(r),applied=json(g.STORY_NODE_EFFECTS_JSON),done=applied[g.STORY_ROUTE_ID+':'+r[4]]||applied[r[4]];
 if(done)return false;
 const target=t?.to_map||r[8];if(!target||!this.tables['32_MAP_DB'].has(target))return false;
 if(s.storyArrival?.node===r[4]&&s.storyArrival.target===g.CURRENT_MAP_ID)return false;
 if(!t&&target===g.CURRENT_MAP_ID)return false;
 // Travel rows need an explicit arrival acknowledgement even if a saved visit is already there.
 s.storyJourney={node:r[4],route:g.STORY_ROUTE_ID,from:g.CURRENT_MAP_ID,target,event:t?.event||null,special:t?.event==='EVT_ISK_M03_AA_LAIR_TRAVEL'?'DVALIN_RIDE':null,minutes:t?.minutes||0,policy:g.STORY_MENU_POLICY||''};
 g.STORY_MENU_POLICY='';g.STORY_WAITING=true;g.PENDING_CHOICE_GROUP_ID='';g.SCREEN_MODE='LOCATION';return true;
};
P.storyCommitJourney=function(id,p,n){const a=this.s.storyArrival,g=this.s.global;if(!a||a.event!==id||a.node!==n[4]||a.route!==g.STORY_ROUTE_ID||a.target!==p.to_map||g.CURRENT_MAP_ID!==p.to_map)fail('STORY_ARRIVAL','이야기 목적지에 직접 도착한 뒤 계속해 주세요.');const map=this.row('32_MAP_DB',p.to_map);g.LOCATION=p.location||map[2];g.LOCATION_PROFILE=map[5];delete this.s.storyArrival;return true;};
P.storyNaturalPause=function(r){
 delete this.s.storyArrival;
 if(this.s.storyContext)return false;
 const p=C.naturalPauses.find(p=>p.afterNode===r[4]);if(!p)return false;
 this.s.storyBreak={node:r[4],next:r[13],map:this.s.global.CURRENT_MAP_ID,title:p.title,prompt:p.prompt,policy:this.s.global.STORY_MENU_POLICY||''};
 Object.assign(this.s.global,{STORY_WAITING:true,STORY_NEXT_PREPARED:'',STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION'});return true;
};
P.isStoryWaiting=function(){return !!(this.s.storyJourney||this.s.storyBreak)||old.isStoryWaiting.call(this);};
P.playPhase=function(){const s=this.s;if(!this.needsRecovery()&&!s.lifeJob&&!s.worldJob&&!s.runtime&&!s.battlePreparation&&!s.storyRecovery&&(s.storyJourney||s.storyBreak))return 'FREE';return old.playPhase.call(this);};
P.storyFrame=function(){return {...old.storyFrame.call(this),journey:copy(this.s.storyJourney||null),break:copy(this.s.storyBreak||null),arrival:copy(this.s.storyArrival||null)};};
P.storyRestoreFrame=function(f){const map=this.s.global.CURRENT_MAP_ID;old.storyRestoreFrame.call(this,f);if(!this.s.runtime)this.s.global.CURRENT_MAP_ID=map;for(const [key,v]of [['storyJourney',f.journey],['storyBreak',f.break],['storyArrival',f.arrival]]){if(v)this.s[key]=copy(v);else delete this.s[key];}};
// A main-story travel goal waits in the return frame while a personal story runs and comes back when it ends.
P.enterStory=function(id){const frame=this.storyFrame(),result=old.enterStory.call(this,id);const stack=this.s.storyReturnStack;if(stack?.length)Object.assign(stack[stack.length-1],{journey:frame.journey,break:frame.break,arrival:frame.arrival});delete this.s.storyBreak;delete this.s.storyArrival;if(frame.journey&&!frame.context&&JSON.stringify(this.s.storyJourney||null)===JSON.stringify(frame.journey))delete this.s.storyJourney;return result;};
P.storyJourneyReason=function(j=this.s.storyJourney){
 const def=this.s.storyContext&&this.storyDefinition?.(this.s.storyContext.entry),title=def&&(this.tables['22_QUEST_DB']?.get(def.QUEST_ID)?.[1]||def.DISPLAY_NAME),place=this.tables['32_MAP_DB'].get(j?.target)?.[2]||'표시된 목적지';
 return (title?'진행 중인 「'+title+'」 이야기가 ':'진행 중인 이야기가 ')+place+'에서 이어집니다. 도착한 뒤 「도착 · 이야기 계속」을 눌러 주세요.';
};
P.combatStoryConfig=function(group){const cfg=old.combatStoryConfig.call(this,group);return cfg?{...cfg,guest_char_ids:[]}:null;};
P.startBattle=function(group,origin='EXPLICIT',options={}){
 const owned=json(this.s.global.COMPANION_ELIGIBILITY_JSON);
 const companions=options.companions??this.s.party.filter(p=>p.active&&p.type!=='PLAYER').map(p=>p.source);
 for(const id of companions)if(owned[id]?.state!=='JOINED')fail('OWNER','정식 합류한 파티원만 전투에 참가할 수 있습니다.');
 const result=old.startBattle.call(this,group,origin,options),b=this.s.runtime;
 if(!b||b.opening?.state!=='PENDING')return result;
 if(!b.balanceProfile&&(origin==='RANDOM'||origin.startsWith('QUEST:')||origin.startsWith('WORLD_OCULUS:'))&&!b.fieldPressure&&b.actors.filter(a=>a.side==='ENEMY').every(a=>a.grade==='일반')){const n=b.actors.filter(a=>a.side==='ALLY'&&a.hp>0).length;for(const a of b.actors.filter(a=>a.side==='ENEMY'))a.atk=Math.round(a.atk*([1.35,1.30,1.15,1.15][n-1]||1));b.fieldPressure={version:1,party:n};}
 if(b.balanceProfile)return result;
 const n=Math.min(4,b.actors.filter(a=>a.side==='ALLY'&&a.hp>0).length),enemies=b.actors.filter(a=>a.side==='ENEMY');
 if(origin.startsWith('STORY:')&&enemies.some(a=>a.source==='BOSS_DVALIN')){
  for(const a of enemies)if(a.source==='BOSS_DVALIN'){a.hp=a.maxHp=[200,650,1118,1690][n-1];a.atk=[59,88,132,165][n-1];a.def=72;a.level=4;}
  b.terrain=b.terrainMax=6;b.balanceProfile={version:3,kind:'STORY_DVALIN',party:n,recommendedLevel:4};
 }else if(origin.startsWith('STORY:')&&/^EG_TRV_(FALCON|WOLF|LION)_WAVE$/.test(group)){
  for(const a of enemies){const before=a.maxHp;a.hp=a.maxHp=Math.max(1,Math.round(before*[.2,.3,.425,1][n-1]));a.atk=Math.max(1,Math.round(a.atk*[.35,.60,.85,1][n-1]));for(const sh of a.shields||[])sh.value=Math.round(sh.value*a.maxHp/before);}
  b.balanceProfile={version:3,kind:'STORY_TEMPLE',party:n,recommendedLevel:2};
 }
 return result;
};
P.basicHit=function(a,t,k){if(a.id==='PLAYER_CUSTOM')k=(k??.65)*(1+.3*(this.s.worldProgress?.mastery||0));return old.basicHit.call(this,a,t,k);};
P.finishBattle=function(win){const b=this.s.runtime;const result=old.finishBattle.call(this,win);if(win&&b?.origin.startsWith('STORY:')&&/^EG_TRV_(FALCON|WOLF|LION)_WAVE$/.test(b.group)){const w=this.ensureWorldProgress();if(!w.milestones[b.origin]){w.milestones[b.origin]=true;for(const a of this.ownedActors().filter(a=>a.active))this.addXp(a.id,300);this.s.lastMilestone={title:'사당 조사',xp:300};}}return result;};
P.personal=function(id,choice){const e=json(this.row('51_EVENT_DB',id)[13]);if(e.choices?.find(c=>c.id===choice)?.companion==='TEMPORARY')fail('COMPANION','임시동행은 제공하지 않습니다. 개인 임무를 통해 정식 합류를 진행하세요.');return old.personal.call(this,id,choice);};
P.actionReason=function(type,a={}){
 if(this.s.worldJob||this.s.lifeJob||this.needsRecovery())return old.actionReason.call(this,type,a);
 const j=this.s.storyJourney,b=this.s.storyBreak;
 if(type==='PREP_LEAVE')return this.s.battlePreparation||this.s.storyRecovery?'':'현재 전투 준비 단계가 아닙니다.';
 if(type==='JOURNEY_RESUME'){if(this.s.runtime||this.s.battlePreparation||this.s.storyRecovery)return '진행 중인 전투를 마쳐 주세요.';if(!j&&!b)return '이어갈 여행 목표가 없습니다.';if(this.s.placeVisit)return '시설에서 나온 뒤 이야기를 계속해 주세요.';if((j&&j.target!==this.s.global.CURRENT_MAP_ID)||(b&&b.map!==this.s.global.CURRENT_MAP_ID))return '표시된 목적지에 먼저 도착해 주세요.';return '';}
 if(type==='STORY_RIDE')return j?.special==='DVALIN_RIDE'&&!this.s.runtime&&!this.s.placeVisit&&this.s.global.CURRENT_MAP_ID===j.from?'':'현재 탑승 이동을 사용할 수 없습니다.';
 if((j||b)&&['STORY_NEXT','STORY_CHOICE','STORY_NAME','STORY_RESUME','STORY_CHAPTER','MAIN_STORY_ACCEPT'].includes(type))return j&&this.s.storyContext?this.storyJourneyReason(j):'메인 임무의 여행 목표에서 이야기를 계속해 주세요.';
 // Only a personal story that is itself mid-travel, or a guided move, keeps other stories closed.
 if(j&&['LEGEND_ENTER','AFFECTION_ENTER'].includes(type)){if(this.s.storyContext)return this.storyJourneyReason(j);if(j.scripted||j.special)return '안내에 따른 이동을 마친 뒤 다른 이야기를 시작해 주세요.';}
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){
 if(a.type==='PREP_LEAVE'){
  const pending=this.s.battlePreparation||this.s.storyRecovery,node=pending.node,map=this.storyNode()?.[8]||this.s.global.CURRENT_MAP_ID;
  this.s.storyBreak={node,next:node,map,title:'결전 준비',prompt:'길드 훈련, 장비, 식사를 준비한 뒤 이 장소로 돌아오세요.',policy:this.s.global.STORY_MENU_POLICY||''};delete this.s.battlePreparation;delete this.s.storyRecovery;delete this.s.storyBattleCheckpoint;Object.assign(this.s.global,{STORY_WAITING:true,STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION'});return {preparationPaused:true};
 }
 if(a.type==='STORY_RIDE'){const j=this.s.storyJourney,map=this.row('32_MAP_DB',j.target);this.advanceTime(j.minutes);Object.assign(this.s.global,{CURRENT_MAP_ID:j.target,LOCATION:map[2],LOCATION_PROFILE:map[5],SCREEN_MODE:'LOCATION'});this.ensureExplorationState();return {travel:true,ride:true,map:j.target};}
 if(a.type==='JOURNEY_RESUME'){
  const g=this.s.global,j=this.s.storyJourney,b=this.s.storyBreak;
  if(j){this.s.storyArrival=copy(j);delete this.s.storyJourney;g.STORY_MENU_POLICY=j.policy||'';this.storySetCursor(j.choiceGroup||j.node);}else{delete this.s.storyBreak;g.STORY_MENU_POLICY=b.policy||'';this.storySetCursor(b.next);}
  g.STORY_WAITING=false;g.PENDING_CHOICE_GROUP_ID='';this.s.storyMenuFrame=null;this.prepareStory();return {resumed:true,node:this.storyActiveNodeId()};
 }
 return old.apply.call(this,a);
};
P.migratePermanentParty=function(s){
 if(s.permanentPartyVersion===1)return;
 if(s.runtime?.actors.some(a=>a.side==='ALLY'&&a.guest)){
  const checkpoint=s.storyBattleCheckpoint,meta={};for(const k of ['SAVE_REVISION','LAST_COMMITTED_ACTION_SEQ','LAST_COMMITTED_ACTION_ID','LAST_ACTION_RECEIPT_JSON','TURN'])meta[k]=s.global[k];
  if(checkpoint){const restored=copy(checkpoint);for(const k of Object.keys(s))delete s[k];Object.assign(s,restored);Object.assign(s.global,meta);}else{const b=s.runtime,node=b.origin?.slice(6);delete s.runtime;s.global.MODE='NORMAL';s.global.ACTIVE_BATTLE_ID='';s.global.COMBAT_ACTION_PHASE='NONE';s.global.PLAYER_HP_CURRENT=s.global.PLAYER_HP_MAX;if(node){s.storyContext=null;s.global.CURRENT_STORY_NODE_ID=s.global.STORY_CURSOR_NODE_ID=node;s.battlePreparation={group:b.group,origin:b.origin,node,general:!b.storyConfig};}}
  s.global.SCREEN_MODE='COMBAT_PREP';s.migrationNotice='임시동행 전투를 정식 파티의 전투 준비로 되돌렸습니다.';
 }
 const own=json(s.global.COMPANION_ELIGIBILITY_JSON);
 for(const [id,v]of Object.entries(own))if(v.state==='TEMPORARY'){v.state='ELIGIBLE';delete v.expires;for(const p of s.party)if(p.source===id)p.active=false;const profile=this.rows('04_CHAR_DB').find(r=>r[1]===id)?.[0];if(s.relations[profile])s.relations[profile].companion='ELIGIBLE';}
 // Restore only a proven recruit affected by the two buggy authored departure events.
 const amber=own.MOND_AMBER,receipts=json(s.global.STORY_NODE_EFFECTS_JSON);
 if(amber?.state==='DEPARTED'&&['EVT_ISK_M03_A_AMBER_SPLIT','EVT_ISK_M03_B_AMBER_DEPART'].includes(amber.event)&&this.storyIndex().byTable['55_MAIN_STORY_DB'].some(r=>r[0]===s.global.STORY_ROUTE_ID&&/JOIN_ACCEPTED:MOND_AMBER|EVENT:EVT_ISK_RECRUIT_AMBER/.test(r[12])&&(receipts[r[0]+':'+r[4]]||receipts[r[4]]))){amber.state='JOINED';if(s.relations.PROFILE_MOND_AMBER)s.relations.PROFILE_MOND_AMBER.companion='JOINED';}
 s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);
 if(s.battlePreparation?.selectedCompanions)s.battlePreparation.selectedCompanions=s.battlePreparation.selectedCompanions.filter(id=>id!=='PLAYER_CUSTOM'&&own[id]?.state==='JOINED');
 if(s.runtime?.storyConfig)s.runtime.storyConfig.guest_char_ids=[];
 if(s.storyBattleCheckpoint)this.migratePermanentParty(s.storyBattleCheckpoint);
 s.permanentPartyVersion=1;
};
P.newGame=function(o){this.installJourneyContent();old.newGame.call(this,o);this.s.permanentPartyVersion=1;this.s.journeyVersion=1;return copy(this.s);};
P.validateSave=function(s){
 this.installJourneyContent();const first=s.journeyVersion!==1;this.migratePermanentParty(s);if(first){const facade=Object.create(this);facade.s=s;const row=facade.storyNode();if(row&&!s.runtime&&!s.battlePreparation&&!s.storyRecovery&&!s.storyJourney&&!s.storyBreak)facade.storyArrivalGate(row);s.journeyVersion=1;}old.validateSave.call(this,s);
 for(const [key,v]of [['storyJourney',s.storyJourney],['storyArrival',s.storyArrival]])if(v){const row=this.storyIndex().nodes.get(s.global.STORY_ROUTE_ID+':'+v.node);if(!row||v.route!==s.global.STORY_ROUTE_ID||!this.tables['32_MAP_DB'].has(v.target)||!this.tables['32_MAP_DB'].has(v.from)||v.event&&this.storyTravelFor(row)?.event!==v.event)fail('JOURNEY_SAVE','이야기 이동 목표를 확인해 주세요.');}
 if(s.storyBreak){const b=s.storyBreak,row=this.storyIndex().nodes.get(s.global.STORY_ROUTE_ID+':'+b.node);if(!row||!this.tables['32_MAP_DB'].has(b.map)||b.next!==row[13]&&b.next!==b.node)fail('JOURNEY_SAVE','이야기 휴식 지점을 확인해 주세요.');}
 return s;
};
api.journeyVersion=1;
})(globalThis);
