/* Liyue field episodes: ordinary movement, real combat, route-bound persisted objectives. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,C=root.CRPGLiyueRework;
const copy=x=>JSON.parse(JSON.stringify(x)),fail=(m)=>{throw new api.RuleError('LIYUE_FIELD',m);};
const old=Object.fromEntries(['prepareStory','playPhase','isStoryWaiting','actionReason','apply','finishBattle','aiTurn','liyueBattleOutcome','character','navigationGoal','validateSave','damage','storyEntryReason','storyNext'].map(k=>[k,P[k]]));
const placements=new Map(C.placements.map(p=>['R39_FIELD_'+p.anchor,p]));
P.liyueFieldView=function(){
 const f=this.s?.liyueField;if(!f||this.s.storyContext)return null;
 const mission=C.missions[f.mission],step=mission.steps[f.stage];
 return {state:f,mission,step,target:step?.map||f.returnMap,returning:!step};
};
P.prepareStory=function(...args){
 if(this.s?.liyueField&&!this.s.storyContext){this.s.global.STORY_WAITING=true;return;}
 const result=old.prepareStory.apply(this,args),s=this.s,n=this.storyNode();
 if(!s||s.runtime||s.storyContext||n?.[5]!=='FIELD_GATE')return result;
 const place=placements.get(n[4]);if(!place)fail('현장 임무 정의가 없습니다.');
 s.liyueFieldReceipts||={};
 if(s.liyueFieldReceipts[n[4]]){this.storySetCursor(n[13]);return this.prepareStory();}
 s.liyueField={version:1,node:n[4],mission:place.mission,saveId:s.global.SAVE_ID,route:s.global.STORY_ROUTE_ID,leaf:s.flags.FLAG_ISK_L01_LEAF||null,returnMap:s.global.CURRENT_MAP_ID,stage:0,clues:[],sequence:[],done:false,feedback:'',steps:[]};
 s.global.STORY_WAITING=true;s.global.STORY_MENU_POLICY='';s.global.PENDING_CHOICE_GROUP_ID='';s.global.SCREEN_MODE='LOCATION';
 return result;
};
P.playPhase=function(){if(this.s?.liyueField&&!this.s.runtime&&!this.s.battlePreparation&&!this.s.storyContext&&!this.s.lifeJob&&!this.s.worldJob)return 'FREE';return old.playPhase.call(this);};
P.isStoryWaiting=function(){return !!(this.s?.liyueField&&!this.s.storyContext)||old.isStoryWaiting.call(this);};
P.navigationGoal=function(){if(this.s?.liyueField&&!this.s.storyContext&&!this.s.pinnedObjective)return this.liyueFieldView().target;return old.navigationGoal.call(this);};
P.actionReason=function(type,a={}){
 const f=this.s?.liyueField;
 if(f?.mission.startsWith('rescue_')&&!this.s.storyContext&&['MOVE','PLACE_ENTER','NPC','WAIT','LEGEND_ENTER','AFFECTION_ENTER','WORLD_WORK_START','LIFE_START'].includes(type))return '현재 위기 장면의 현장 목표를 먼저 해결해 주세요.';
 if(type.startsWith('LIYUE_FIELD_')){
  if(!f)return '진행 중인 현장 임무가 없습니다.';
  if(this.s.runtime||this.s.lifeJob||this.s.worldJob||this.s.placeVisit||this.s.storyContext)return '진행 중인 전투나 시설 이용을 마치고 현장으로 돌아오세요.';
  if(this.s.global.CURRENT_MAP_ID!==this.liyueFieldView().target)return '지도에 표시된 현장으로 이동해 주세요.';
  return '';
 }
 if(f&&!this.s.storyContext&&!this.s.runtime&&['STORY_NEXT','STORY_CHOICE','STORY_RESUME','STORY_CHAPTER','MAIN_STORY_ACCEPT','JOURNEY_RESUME'].includes(type))return '현장 목표를 마친 뒤 본편을 이어갑니다.';
 return old.actionReason.call(this,type,a);
};
P.liyueFieldResolve=function(text,extra={}){
 const f=this.s.liyueField;f.done=true;f.feedback=text;f.steps.push({stage:f.stage,kind:this.liyueFieldView().step.kind,map:this.s.global.CURRENT_MAP_ID,turn:this.s.global.TURN,...extra});
 const speaker=this.liyueFieldView().step.speaker,id=speaker&&'PROFILE_LIYUE_'+speaker;
 if(id&&this.tables['04_CHAR_DB'].has(id))this.markContact(id);
};
P.apply=function(a){
 if(!a.type.startsWith('LIYUE_FIELD_'))return old.apply.call(this,a);
 const {state:f,mission,step}=this.liyueFieldView();
 if(a.type==='LIYUE_FIELD_FINISH'){
  if(step||f.steps.length!==mission.steps.length)fail('아직 마치지 않은 현장 목표가 있습니다.');
  this.s.liyueFieldReceipts||={};this.s.liyueFieldReceipts[f.node]=copy(f);
  const n=this.storyNode();delete this.s.liyueField;this.s.global.STORY_WAITING=false;this.storySetCursor(n[13]);this.prepareStory();return {completed:true};
 }
 if(!step)fail('다음 사건이 이어질 장소로 돌아가 주세요.');
 if(a.type==='LIYUE_FIELD_CONTINUE'){
  if(!f.done)fail('현장 목표를 먼저 마쳐 주세요.');
  f.stage++;f.clues=[];f.sequence=[];f.done=false;f.feedback='';return {stage:f.stage};
 }
 if(f.done)fail('이미 마친 단계입니다. 다음 목표를 확인하세요.');
 if(a.type==='LIYUE_FIELD_INSPECT'){
  const clue=step.clues?.find(c=>c.id===a.clue);if(!clue)fail('조사할 흔적을 선택해 주세요.');
  if(!f.clues.includes(clue.id))f.clues.push(clue.id);f.feedback=clue.text;return {clue:clue.id,text:clue.text};
 }
 if(a.type==='LIYUE_FIELD_ANSWER'){
  if(!['INVESTIGATE','CHOICE','SEQUENCE'].includes(step.kind)||!Number.isInteger(a.answer)||!step.options[a.answer])fail('현재 목표의 행동을 선택해 주세요.');
  if(step.kind==='INVESTIGATE'){
   if(f.clues.length!==step.clues.length)fail('현장의 흔적을 모두 살펴본 뒤 판단하세요.');
   if(a.answer!==step.answer){f.feedback='흔적과 맞지 않는 판단이다. 확인한 단서를 다시 비교하자.';return {correct:false};}
  }
  if(step.kind==='SEQUENCE'){
   f.sequence.push(a.answer);
   if(step.sequence[f.sequence.length-1]!==a.answer){f.sequence=[];f.feedback='순서가 맞지 않아 멈췄다. 현장의 설명을 확인하고 처음부터 다시 시도하자.';return {correct:false};}
   f.feedback='완료한 순서: '+f.sequence.map(n=>step.options[n]).join(' → ');
   if(f.sequence.length<step.sequence.length)return {partial:true};
  }
  this.liyueFieldResolve(step.results?.[a.answer]||step.result,{answer:a.answer});return {correct:true};
 }
 if(a.type==='LIYUE_FIELD_BATTLE'){
  if(!['BATTLE','DESTROY','ESCORT','DEFEND'].includes(step.kind))fail('현재 단계는 전투 목표가 아닙니다.');
  if(this.s.global.PLAYER_HP_CURRENT<=0)fail('치료와 편성을 마친 뒤 다시 도전하세요.');
  const result=this.startBattle('EG_LY_R39_'+step.kind,'LIYUE_FIELD:'+f.node+':'+f.stage),b=this.s.runtime;
  b.fieldObjective={node:f.node,stage:f.stage,kind:step.kind,integrity:100,maxIntegrity:100,saveId:f.saveId};
  // Balanced for a post-Dvalin party. Bringing fewer allies never weakens the encounter.
  const level=Math.max(6,Math.min(12,this.s.global.PLAYER_LEVEL_STATE));
  for(const e of b.actors.filter(x=>x.side==='ENEMY')){
   const structure=step.kind==='DESTROY',defense=step.kind==='DEFEND';
   e.level=level;e.hp=e.maxHp=structure?450+level*35:(defense?330:410)+level*20;
   e.atk=structure?0:85+level*9;e.def=structure?0:35+level*5;
   if(structure){e.fieldStructure=true;e.aura=null;e.nativeAura=null;e.eva=0;e.atk=0;}
  }
  b.storyConfig={noRewards:true,field:true}; // One-time objectives are not XP/loot farms.
  if(['ESCORT','DEFEND'].includes(step.kind))b.liyueEvacuation={completedRounds:0,target:3,field:true};
  return result;
 }
 fail('알 수 없는 현장 행동입니다.');
};
P.aiTurn=function(a,targets){
 if(a.fieldStructure)return;
 const b=this.s.runtime,o=b?.fieldObjective;
 if(o&&['ESCORT','DEFEND'].includes(o.kind)&&a.side==='ENEMY'&&(a.turns||0)%2===1){
  const guarding=b.actors.some(x=>x.side==='ALLY'&&x.hp>0&&x.guard),damage=guarding?5:13;
  o.integrity=Math.max(0,o.integrity-damage);b.log.push({actor:a.name,target:o.kind==='ESCORT'?'보급 수레':'신호 거점',damage,objective:'FIELD_DAMAGE',text:guarding?'방어 태세가 목표의 피해를 줄였다.':'목표가 공격받았다.'});return;
 }
 return old.aiTurn.call(this,a,targets);
};
P.damage=function(a,t,k,e,o={}){return old.damage.call(this,a,t,k,e,t?.fieldStructure?{...o,noAura:true,hitBonus:100}:o);};
P.liyueBattleOutcome=function(b){
 if(!b.fieldObjective)return old.liyueBattleOutcome.call(this,b);
 if(b.fieldObjective.integrity<=0||!b.actors.some(a=>a.side==='ALLY'&&a.hp>0))return false;
 if(b.liyueEvacuation)return b.liyueEvacuation.completedRounds>=3&&!b.actors.some(a=>a.side==='ENEMY'&&a.hp>0)?true:undefined;
 return undefined;
};
P.finishBattle=function(win){
 const o=this.s.runtime?.fieldObjective,id=this.s.runtime?.id,result=old.finishBattle.call(this,win);
 if(o){const f=this.s.liyueField;if(!f||f.node!==o.node||f.stage!==o.stage||f.saveId!==o.saveId)fail('전투와 현장 임무의 기록이 일치하지 않습니다.');
  if(win)this.liyueFieldResolve(this.liyueFieldView().step.result,{battleId:id,integrity:o.integrity});
  else f.feedback='목표를 지키지 못했다. 시설에서 회복하고 편성을 조정한 뒤 같은 단계에 다시 도전할 수 있다.';
 }
 return result;
};
P.character=function(id){const a=old.character.call(this,id),profile=this.rows('04_CHAR_DB').find(r=>r[1]===id)?.[0],r=this.s?.relations?.[profile];const score=Number(r?.BOND_SCORE??r?.bondScore??(20*(r?.HEART_STATE??r?.heart??0)));const hearts=Math.min(5,Math.max(0,Math.floor(score/20)));a.bondHearts=hearts;a.bondBonusPercent=hearts;a.atk=Math.round(a.atk*(1+hearts/100)*100)/100;a.def=Math.round(a.def*(1+hearts/100)*100)/100;return a;};
P.storyEntryReason=function(def){
 if(def?.id==='LEG_ISK_MOND_VENTI'){
  const eligibility=JSON.parse(this.s.global.COMPANION_ELIGIBILITY_JSON||'{}');
  if(eligibility.MOND_VENTI?.state!=='JOINED')return '벤티를 동료로 맞이한 뒤 몬드 광장에서 만날 수 있습니다.';
 }
 return old.storyEntryReason.call(this,def);
};
P.storyNext=function(...args){const n=this.storyNode(),archive=C.archive[n?.[4]],result=old.storyNext.apply(this,args);if(archive)for(const row of archive)if(row.profile?.startsWith('PROFILE_')&&this.tables['04_CHAR_DB'].has(row.profile))this.markContact(row.profile);return result;};
P.validateSave=function(s){
 this.installGeography();
 // Existing saves retain their current line; only pending geographic metadata is refreshed.
 const route=s.global.STORY_ROUTE_ID,lookup=id=>this.storyIndex().nodes.get(route+':'+id);
 const normalize=frame=>{
  if(!frame)return;
  const b=frame.break;if(b){const row=lookup(b.node);if(row&&b.next!==row[13]&&b.next!==row[4]&&lookup(b.next)){b.node=b.next;b.map=lookup(b.next)[8]||b.map;}}
  const j=frame.journey;if(j){const row=lookup(j.node),t=row&&this.storyTravelFor(row);if(t&&j.scripted){j.from=t.from_map;j.target=t.to_map;}else if(row?.[8])j.target=row[8];}
 };
 normalize({break:s.storyBreak,journey:s.storyJourney});for(const f of s.storyReturnStack||[])normalize(f);normalize(s.storyMenuFrame);normalize(s.storyBattleFrame);

 const f=s.liyueField;
 if(f){
  const spec=C.missions[f.mission],place=placements.get(f.node);
  if(f.version!==1||!this.tables['32_MAP_DB'].has(f.returnMap)||typeof f.done!=='boolean'||f.node!==s.global.STORY_CURSOR_NODE_ID||!spec||place?.mission!==f.mission||f.saveId!==s.global.SAVE_ID||f.route!==s.global.STORY_ROUTE_ID||f.route!=='ROUTE_ISEKAI'||f.leaf!==(s.flags.FLAG_ISK_L01_LEAF||null)||!Number.isInteger(f.stage)||f.stage<0||f.stage>spec.steps.length||!Array.isArray(f.steps)||f.steps.length!==f.stage+(f.done?1:0)||!Array.isArray(f.clues)||!Array.isArray(f.sequence))fail('현장 임무 저장의 단계·루트·기록을 확인하세요.');
  const step=spec.steps[f.stage];if(step&&(f.clues.some(id=>!step.clues?.some(c=>c.id===id))||new Set(f.clues).size!==f.clues.length||f.sequence.some((n,i)=>step.sequence?.[i]!==n)))fail('현장 조사 저장이 손상되었습니다.');
  const o=s.runtime?.fieldObjective;if(o&&(o.node!==f.node||o.stage!==f.stage||o.saveId!==f.saveId||o.kind!==step?.kind||!Number.isFinite(o.integrity)||o.integrity<0||o.integrity>100))fail('현장 전투 저장이 손상되었습니다.');
 }
 return old.validateSave.call(this,s);
};
api.liyueReworkVersion=1;
})(globalThis);
