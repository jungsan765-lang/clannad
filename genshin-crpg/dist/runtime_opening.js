/* Candidate: explicit opening boundary. Load after runtime_flow/runtime_party,
 * before presentation.js and UI scripts. No source DB or stat changes.
 * Keep phase=WAIT_PLAYER for existing runtime + SaveAdapter save boundaries;
 * opening.state and COMBAT_ACTION_PHASE distinguish this from a playable turn.
 */
(function(root){
  'use strict';
  const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x));
  if(api.openingVersion===1)return;
  const old=Object.fromEntries(['startBattle','newRound','autoUntilPlayer','resolveEnemyPhases','playPhase','actionReason','apply','combatAction','combatCards','view','validateSave'].map(k=>[k,P[k]]));
  const fail=(code,message)=>{throw new api.RuleError(code,message);};
  const pending=r=>r.s?.runtime?.opening?.state==='PENDING';
  const safeMenus=new Set(['SYSTEM','SAVE','LOAD','SETTINGS','STATUS','COMBAT']);
  const nextAction=r=>r.s.global.SAVE_ID+':'+(r.s.global.LAST_COMMITTED_ACTION_SEQ+1);

  P.startBattle=function(...args){
    const prior=this._buildingCombatOpening;
    this._buildingCombatOpening=true;
    try{
      const result=old.startBattle.apply(this,args);
      return pending(this)?{...result,opening:true,phase:'COMBAT_OPENING',order:this.combatOrderView()}:result;
    }finally{this._buildingCombatOpening=prior;}
  };
  P.newRound=function(...args){
    const b=this.s.runtime;
    if(pending(this))return; // Opening initiative is immutable and never rerolled by preview.
    const create=this._buildingCombatOpening&&b?.phase==='START'&&!b.opening;
    if(create)b.opening={version:1,state:'PENDING',round:b.round,createdActionId:nextAction(this),initialOrder:[]};
    const result=old.newRound.apply(this,args);
    if(create){
      b.opening.initialOrder=copy(b.order);
      b.phase='WAIT_PLAYER';
      this.s.global.COMBAT_ACTION_PHASE='OPENING';
    }
    return result;
  };
  P.autoUntilPlayer=function(...args){if(pending(this))return;return old.autoUntilPlayer.apply(this,args);};
  if(old.resolveEnemyPhases)P.resolveEnemyPhases=function(...args){if(pending(this))return false;return old.resolveEnemyPhases.apply(this,args);};

  // These methods read saved initiative; neither consumes random numbers.
  P.combatOrderView=function(){
    const b=this.s.runtime;if(!b)return [];
    const opening=pending(this);
    return b.order.map((turn,index)=>{const a=b.actors.find(x=>x.id===turn.id);return{
      index,id:turn.id,source:a?.source||null,name:a?.name||turn.id,side:a?.side||null,
      control:a?.control||null,score:turn.score,first:!!turn.first,
      alive:!!a&&a.hp>0,hp:a?.hp??0,maxHp:a?.maxHp??0,
      current:!opening&&!b.interlude&&index===b.cursor,
      acted:!opening&&index<b.cursor
    };});
  };
  P.combatOpening=function(){
    const b=this.s.runtime;if(!pending(this))return null;
    return{pending:true,canBegin:true,battle:b.id,group:b.group,origin:b.origin,round:b.round,
      action:'COMBAT_BEGIN',firstActorId:b.order[0]?.id||null,
      playerOrderIndex:b.order.findIndex(x=>x.id==='PLAYER_CUSTOM'),
      order:this.combatOrderView()};
  };
  P.beginCombat=function(battle){
    const b=this.s.runtime;
    if(!pending(this))fail('COMBAT_OPENING','시작을 기다리는 전투가 없습니다.');
    if(battle&&battle!==b.id)fail('BATTLE_ID','현재 전투와 시작할 전투가 일치하지 않습니다.');
    const logStart=b.log.length,initialOrder=copy(b.opening.initialOrder);
    b.opening.state='STARTED';b.opening.startedActionId=nextAction(this);
    b.phase='RESOLVING';this.s.global.COMBAT_ACTION_PHASE='RESOLVING';this.s.global.SCREEN_MODE='COMBAT';
    // Reuse the rolled first-round order; do not call newRound here.
    this.autoUntilPlayer();
    return{battle:b.id,group:b.group,started:true,initialOrder,round:b.round,
      events:b.log.slice(logStart),finished:!this.s.runtime};
  };
  P.playPhase=function(){return pending(this)?'COMBAT_OPENING':old.playPhase.call(this);};
  P.actionReason=function(type,params={}){
    if(type==='COMBAT_BEGIN')return pending(this)?(params.battle&&params.battle!==this.s.runtime.id?'현재 전투와 시작할 전투가 일치하지 않습니다.':''):'시작을 기다리는 전투가 없습니다.';
    if(pending(this)){
      if(type==='MENU'&&safeMenus.has(params.screen))return '';
      return '행동 순서를 확인한 뒤 전투 시작을 눌러 주세요.';
    }
    return old.actionReason.call(this,type,params);
  };
  P.apply=function(a){if(a.type==='COMBAT_BEGIN')return this.beginCombat(a.battle);return old.apply.call(this,a);};
  P.combatAction=function(...args){if(pending(this))fail('COMBAT_OPENING','먼저 전투 시작을 눌러 주세요.');return old.combatAction.apply(this,args);};
  P.combatCards=function(...args){const cards=old.combatCards.apply(this,args);return pending(this)?cards.map(c=>({...c,reason:'먼저 전투 시작을 눌러 주세요.'})):cards;};
  P.view=function(){const v=old.view.call(this);v.combatOpening=this.combatOpening();v.combatOrder=this.combatOrderView();return v;};
  P.validateSave=function(s){
    old.validateSave.call(this,s);
    const b=s.runtime,o=b?.opening;if(!o)return s; // Old WAIT_PLAYER saves continue normally.
    if(o.version!==1||!['PENDING','STARTED'].includes(o.state)||o.round!==1||!Array.isArray(o.initialOrder)||!o.initialOrder.length||new Set(o.initialOrder.map(x=>x.id)).size!==o.initialOrder.length||o.initialOrder.some(x=>!b.actors.some(a=>a.id===x.id)||!Number.isFinite(x.score)))fail('OPENING_SAVE','전투 시작 순서 저장값이 잘못되었습니다.');
    if(o.state==='PENDING'&&(b.round!==1||b.cursor!==0||b.turnStarted!==null||b.actionSequence!==0||b.phase!=='WAIT_PLAYER'||s.global.COMBAT_ACTION_PHASE!=='OPENING'||b.interlude||b.pendingInterludes?.length||b.actors.some(a=>a.turns!==0)||JSON.stringify(b.order)!==JSON.stringify(o.initialOrder)))fail('OPENING_SAVE','전투 시작 대기 상태가 손상되었습니다.');
    return s;
  };
  api.openingVersion=1;
})(globalThis);
