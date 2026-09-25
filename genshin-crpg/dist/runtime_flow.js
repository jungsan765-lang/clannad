/* Public action policy. Story scripts call internal methods; UI/API actions share this gate. */
(function (root) {
  'use strict';
  const api = root.CRPGRuntime, P = api.Runtime.prototype;
  const previous = {apply:P.apply, menu:P.menu, addXp:P.addXp, finishBattle:P.finishBattle, validateSave:P.validateSave, storyFrame:P.storyFrame, storyRestoreFrame:P.storyRestoreFrame, storyDisplayText:P.storyDisplayText, startBattle:P.startBattle, battlePreparation:P.battlePreparation, confirmBattlePreparation:P.confirmBattlePreparation};
  const copy = x => JSON.parse(JSON.stringify(x));
  const safe = new Set(['SYSTEM','SAVE','LOAD','SETTINGS','STATUS']);
  const inspect = new Set(['INVENTORY','QUEST','PARTY','RELATIONS']);
  const storyActions = new Set(['STORY_NEXT','STORY_CHOICE','STORY_NAME']);
  const preparation = new Set(['PARTY','PARTY_REMOVE','PARTY_REPLACE','PARTY_TACTIC','PARTY_SWAP','PREP_SELECT','EQUIP','UNEQUIP','TOOL_PREPARE','USE_ITEM','MEAL_BATCH']);
  P.isStoryWaiting = function() {
    const g=this.s.global,node=this.storyNode(),cursor=String(this.storyActiveNodeId()||'');
    if(!g.STORY_WAITING)return false;
    if(!node)return ['END','PAUSE','HUB',''].includes(cursor)||cursor.startsWith('SCREEN:');
    if(node[18]!=='ACTIVE')return true;
    let receipts={};try{receipts=JSON.parse(g.STORY_NODE_EFFECTS_JSON||'{}');}catch{}
    return !!(receipts[g.STORY_ROUTE_ID+':'+node[4]]||receipts[node[4]])&&(node[5]==='STORY_PAUSE'||node[13]==='SCREEN:CRPG_MAIN');
  };
  P.playPhase = function () {
    const s=this.s,g=s.global;
    if(s.runtime)return s.runtime.interlude?'CUTIN':'COMBAT';
    if(s.battlePreparation)return 'PREPARATION';
    if(s.storyRecovery)return 'RECOVERY';
    if(s.storyContext)return 'STORY';
    if(g.STORY_MENU_POLICY==='SAVE_LOAD_ONLY')return 'STORY_LOCKED';
    if(g.PENDING_CHOICE_GROUP_ID)return 'STORY';
    const node=this.storyNode();
    if(this.isStoryWaiting()||node?.[5]==='MENU_GATE')return 'FREE';
    if(node)return 'STORY';
    return 'FREE';
  };
  P.actionReason = function(type, params={}) {
    const phase=this.playPhase(),g=this.s.global;
    if(type==='TITLE')return phase==='FREE'?'':'현재 이야기와 전투를 마친 뒤 제목 화면으로 돌아갈 수 있습니다.';
    if(type==='MENU'){
      const screen=params.screen;
      if(phase==='STORY_LOCKED'&&!['SYSTEM','SAVE','LOAD','SETTINGS','STORY'].includes(screen))return '이 장면에서는 이야기 진행과 저장만 할 수 있습니다.';
      if(safe.has(screen))return '';
      if(screen==='STORY')return phase==='COMBAT'?'전투를 먼저 마쳐 주세요.':'';
      if(screen==='COMBAT')return this.s.runtime&&!this.s.runtime.interlude?'':'현재 전투 화면이 아닙니다.';
      if(screen==='COMBAT_PREP')return phase==='PREPARATION'?'':'현재 전투 준비 단계가 아닙니다.';
      if(phase==='FREE')return '';
      if(phase==='PREPARATION'&&['INVENTORY','PARTY'].includes(screen))return '';
      if(phase==='STORY_LOCKED')return '이 장면에서는 이야기 진행과 저장만 할 수 있습니다.';
      if(['STORY','CUTIN','RECOVERY'].includes(phase)&&inspect.has(screen))return '';
      return phase==='PREPARATION'?'전투 준비를 마치거나 저장해 주세요.':phase==='COMBAT'?'전투를 먼저 마쳐 주세요.':'현재 대화와 선택을 마치면 자유행동을 할 수 있습니다.';
    }
    if(type==='COMBAT')return phase==='COMBAT'?'':'현재 전투 행동을 선택할 수 없습니다.';
    if(type==='PREP_SELECT')return phase==='PREPARATION'?'':'현재 전투 준비 단계가 아닙니다.';
    if(type==='COMBAT_PREPARE')return phase==='PREPARATION'?'':'현재 전투 준비 단계가 아닙니다.';
    if(storyActions.has(type)){
      if(type==='STORY_NEXT'&&this.storyNode()?.[5]==='INPUT_TEXT')return '정한 이름을 알려주는 선택을 눌러 주세요.';
      if(type==='STORY_NEXT'&&g.PENDING_CHOICE_GROUP_ID)return '제시된 선택지에서 직접 골라 주세요.';
      if(phase==='COMBAT'||phase==='PREPARATION')return '진행 중인 전투를 먼저 해결해 주세요.';
      if(phase==='RECOVERY')return '회복과 편성을 마친 뒤 전투 재도전을 선택해 주세요.';
      return ['STORY','STORY_WAIT','MAIN_MENU','HUB'].includes(g.SCREEN_MODE)?'':'이야기 화면으로 돌아가서 계속해 주세요.';
    }
    if(type==='STORY_RESUME'&&this.isStoryWaiting()&&g.STORY_NEXT_PREPARED)return '';
    if(type==='STORY_RETRY')return phase==='RECOVERY'?'':'재도전할 이야기 전투가 없습니다.';
    if(type==='STORY_RETURN')return '현재 장면의 선택으로 이야기를 마쳐 주세요.';
    if(phase==='PREPARATION'&&preparation.has(type))return '';
    if(phase==='RECOVERY'&&['MAIN_STORY_ACCEPT','STORY_CHAPTER','STORY_RESUME','LEGEND_ENTER','AFFECTION_ENTER'].includes(type))return '진행 중인 이야기 전투를 먼저 마쳐 주세요.';
    if(phase==='FREE')return '';
    return ['COMBAT','CUTIN'].includes(phase)?'전투와 연결된 장면을 먼저 마쳐 주세요.':'현재 이야기의 대화와 선택을 마친 뒤 사용할 수 있습니다.';
  };
  P.assertActionAllowed = function(a) {const reason=this.actionReason(a.type,a);if(reason)throw new api.RuleError('ACTION_LOCK',reason);};
  P.apply = function(a) {
    if(a.type==='STORY_NAME'&&a.name!==this.s.global.PLAYER_NAME)throw new api.RuleError('NAME_FIXED','시작할 때 정한 이름으로 이야기합니다.');
    if(a.type==='STORY_RETRY'){
      if(!this.s.storyBattleCheckpoint)throw new api.RuleError('CHECKPOINT','전투 직전 저장을 불러와 주세요.');
      const current=this.s.global,snapshot=copy(this.s.storyBattleCheckpoint);
      for(const key of ['SAVE_REVISION','LAST_COMMITTED_ACTION_SEQ','LAST_COMMITTED_ACTION_ID','LAST_ACTION_RECEIPT_JSON','TURN'])snapshot.global[key]=current[key];
      this.s=snapshot;this.s.global.SCREEN_MODE='COMBAT_PREP';
      return {retryReady:true,restoredBeforeBattle:true};
    }
    if(storyActions.has(a.type)||['LEGEND_ENTER','AFFECTION_ENTER','MAIN_STORY_ACCEPT','STORY_CHAPTER','STORY_RESUME'].includes(a.type))this.s.storyMenuFrame=null;
    const result=previous.apply.call(this,a);
    if(a.type==='NPC')this.s.global.CURRENT_NPC_ENTITY_ID=a.entity;
    return result;
  };
  P.menu = function(screen) {
    const reason=this.actionReason('MENU',{screen});
    if(reason)throw new api.RuleError('ACTION_LOCK',reason);
    const aliases={SAVE:'SYSTEM',LOAD:'SYSTEM',SETTINGS:'SYSTEM'};
    screen=aliases[screen]||screen;
    if(!['STORY','STATUS','COMBAT_PREP','COMBAT','SYSTEM','MAIN_MENU','HUB','LOCATION','INVENTORY','PARTY','SHOP','CRAFT','QUEST','RELATIONS','DIALOGUE','BOSS_INTRO'].includes(screen))throw new api.RuleError('SCREEN','알 수 없는 화면입니다.');
    const phase=this.playPhase();
    if(screen==='STORY')screen=phase==='PREPARATION'?'COMBAT_PREP':phase==='RECOVERY'?'REWARD':this.isStoryWaiting()?'STORY_WAIT':'STORY';
    this.s.storyMenuFrame=null;
    this.s.global.SCREEN_MODE=screen;
  };
  P.storyFrame=function(){return {...previous.storyFrame.call(this),waiting:!!this.s.global.STORY_WAITING,nextPrepared:this.s.global.STORY_NEXT_PREPARED||'',waitReason:this.s.global.STORY_WAIT_REASON||''};};
  P.storyRestoreFrame=function(f){previous.storyRestoreFrame.call(this,f);Object.assign(this.s.global,{STORY_WAITING:!!f.waiting,STORY_NEXT_PREPARED:f.nextPrepared||'',STORY_WAIT_REASON:f.waitReason||''});};
  P.storyDisplayText=function(row){row=row||this.storyNode();return row?.[4]==='ISK_M01_NAME_INPUT'?'처음 정한 이름을 알려주자.':previous.storyDisplayText.call(this,row);};
  P.growth = function(owner='PLAYER_CUSTOM') {
    const player=owner==='PLAYER_CUSTOM',g=this.s.global,s=player?null:this.s.chars[owner];
    const level=Number(player?g.PLAYER_LEVEL_STATE:s?.level),xp=Number(player?g.PLAYER_XP_STATE:s?.xp)||0;
    const next=level>=20?0:Number(this.row('26_LEVEL_RULES',level)[2]);
    return {owner,name:player?g.PLAYER_NAME:this.row('07_CHAR_DB',owner)[1],level,xp,next,remaining:Math.max(0,next-xp),max:level>=20};
  };
  P.addXp = function(owner,xp) {
    if(!Number.isSafeInteger(xp)||xp<0)throw new api.RuleError('XP_VALUE','경험치는 0 이상의 정수여야 합니다.');
    if(owner!=='PLAYER_CUSTOM'&&!this.s.chars[owner])throw new api.RuleError('OWNER','성장할 캐릭터가 없습니다.');
    const before=this.growth(owner);previous.addXp.call(this,owner,xp);const after=this.growth(owner);
    if(after.level>before.level){if(owner==='PLAYER_CUSTOM')this.s.global.PLAYER_HP_CURRENT=this.s.global.PLAYER_HP_MAX;else this.s.chars[owner].hp=this.character(owner).maxHp;}
    this.s.lastGrowth=this.s.lastGrowth||{};
    this.s.lastGrowth[owner]={gained:before.max?0:xp,fromLevel:before.level,toLevel:after.level,turn:this.s.global.TURN};
    return after;
  };
  P.battlePreparation=function(group){
    const original=previous.battlePreparation.call(this,group);if(original)return original;
    const pending=this.s.battlePreparation;if(!pending||pending.group!==group)return null;
    return {group,node:pending.node,max:4,active:this.s.party.filter(p=>p.active).map(p=>p.source),guests:[]};
  };
  P.startBattle=function(group,origin='EXPLICIT',options={}){
    const story=origin.startsWith('STORY:'),cfg=this.combatStoryConfig(group);
    if(story&&!cfg&&!options.confirmed){this.s.battlePreparation={group,origin,node:this.storyNode()?.[4],general:true};this.s.global.SCREEN_MODE='COMBAT_PREP';return {pendingPreparation:true,...this.battlePreparation(group)};}
    if(story&&options.confirmed){const checkpoint=copy(this.s);delete checkpoint.storyBattleCheckpoint;delete checkpoint.storyRecovery;this.s.storyBattleCheckpoint=checkpoint;}
    return previous.startBattle.call(this,group,origin,options);
  };
  P.confirmBattlePreparation=function(group,companions){
    const pending=this.s.battlePreparation;
    if(!pending?.general)return previous.confirmBattlePreparation.call(this,group,companions);
    if(pending.group!==group||pending.node!==this.storyNode()?.[4]||!Array.isArray(companions)||companions.length>3||new Set(companions).size!==companions.length)throw new api.RuleError('PREPARATION','현재 전투 준비와 동료 선택을 확인해 주세요.');
    const owned=JSON.parse(this.s.global.COMPANION_ELIGIBILITY_JSON||'{}'),oldParty=this.s.party;
    for(const id of companions)if(!['JOINED'].includes(owned[id]?.state))throw new api.RuleError('OWNER','참가할 수 없는 동료입니다.');
    this.s.party=[oldParty[0],...Array.from({length:3},(_,i)=>companions[i]?{slot:'PARTY_'+(i+2),type:'CHAR',source:companions[i],control:'AI',active:true,tactic:oldParty.find(p=>p.source===companions[i])?.tactic||'균형'}:{slot:'PARTY_'+(i+2),active:false})];
    return this.startBattle(group,pending.origin,{confirmed:true,companions});
  };
  P.finishBattle = function(victory) {
    const battle=this.s.runtime,story=battle?.origin?.startsWith('STORY:'),node=story?this.storyNode():null;
    const map=this.s.global.CURRENT_MAP_ID,result=previous.finishBattle.call(this,victory);
    if(story&&!victory&&node)this.s.storyRecovery={node:node[4],map,group:battle.group};
    else if(story&&victory){delete this.s.storyRecovery;delete this.s.storyBattleCheckpoint;}
    return result;
  };
  P.validateSave = function(s) {
    previous.validateSave.call(this,s);
    const g=s.global,level=g.PLAYER_LEVEL_STATE,xp=g.PLAYER_XP_STATE;
    if(!Number.isInteger(level)||level<1||level>20||!Number.isSafeInteger(xp)||xp<0||level===20&&xp!==0||level<20&&xp>=Number(this.row('26_LEVEL_RULES',level)[2]))throw new api.RuleError('GROWTH_SAVE','주인공 성장 저장값이 잘못되었습니다.');
    g.PLAYER_XP_NEXT=level===20?0:Number(this.row('26_LEVEL_RULES',level)[2]);
    for(const [owner,st]of Object.entries(s.chars||{}))if(!Number.isInteger(st.level)||st.level<1||st.level>20||!Number.isSafeInteger(st.xp)||st.xp<0||st.level===20&&st.xp!==0||st.level<20&&st.xp>=Number(this.row('26_LEVEL_RULES',st.level)[2]))throw new api.RuleError('GROWTH_SAVE','캐릭터 성장 저장값이 잘못되었습니다.');
    return s;
  };
  api.flowVersion=1;
})(globalThis);
