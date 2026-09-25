/* 3-1. Explicit Mond enemy patterns and read-only intelligence. No stat rebalance. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,C=root.CRPGEnemySkillContent;
if(!C)throw new Error('runtime_enemy_content.js must precede runtime_enemy_skills.js');
const old=Object.fromEntries(['installMarketContent','startBattle','newRound','actorCards','cardSupport','cardReason','cardTargets','executeCard','aiTurn','combatStat','combatDamageMultiplier','damage','applyDamage','addCombatStatus','applyCombatControl','hasElementImmunity','onCombatTurnStart','validateSave'].map(k=>[k,P[k]]));
const scope=new Set(C.scope),named=new Set(C.cards.map(r=>r[0])),sig=C.signatures,copy=x=>JSON.parse(JSON.stringify(x));
const E={PYRO:'불',HYDRO:'물',CRYO:'얼음',ELECTRO:'번개',ANEMO:'바람',GEO:'바위',DENDRO:'풀',PHYSICAL:'물리'},en=x=>E[x]||x||'물리';
const st=(a,id)=>a?.statuses?.find(s=>s.id===id&&(!Number.isFinite(s.rounds)||s.rounds>0));
const shields=a=>(a.shields||[]).reduce((n,s)=>n+Math.max(0,s.value||0),0);
const active=r=>!!r.s?.runtime?.enemySkillVersion;
const isLocal=(r,a)=>active(r)&&a?.side==='ENEMY'&&scope.has(a.source);
const fail=(code,message)=>{throw new api.RuleError(code,message);};
const label={STATUS_SLOW:'감속',STATUS_DEF_DOWN:'방어력 감소',ENEMY_CHARGE_EXPOSED:'차지 붕괴 · 받는 피해 증가',ENEMY_GRADER_CORE:'코어 노출',ENEMY_WOOD_OPEN:'나무 방패 무력화'};
P.installEnemySkillContent=function(){
 if(this._enemySkillContentInstalled)return;
 const rows=this.db['12_ENEMY_CARD_DB'].map(r=>r.slice()),ids=new Set(rows.map(r=>r[0]));
 for(const row of C.cards){if(ids.has(row[0]))fail('ENEMY_CARD_COLLISION','적 기술 ID가 기존 데이터와 충돌합니다: '+row[0]);rows.push(row.slice());ids.add(row[0]);}
 this.db={...this.db,'12_ENEMY_CARD_DB':rows};this.tables['12_ENEMY_CARD_DB']=new Map(rows.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));this._enemySkillContentInstalled=true;
};
P.installMarketContent=function(...args){const out=old.installMarketContent.apply(this,args);this.installEnemySkillContent();return out;};
P.cardSupport=function(c){
 if(c.enemy&&sig[c.id]!==undefined)return c.ready&&c.script===sig[c.id]?'':'기술 실행 정의가 3-1 실행기와 일치하지 않습니다.';
 return old.cardSupport.call(this,c);
};
P.startBattle=function(...args){
 const prior=this._enemySkillStarting;this._enemySkillStarting=true;
 try{return old.startBattle.apply(this,args);}finally{this._enemySkillStarting=prior;}
};
P.enemySkillLog=function(a,c,extra={}){const b=this.s.runtime;if(!b)return;const row=typeof c==='string'?this.tables['12_ENEMY_CARD_DB'].get(c):null;
 b.log.push({actor:a.name,actorId:a.id,card:row?row[0]:c?.id||c,cardName:row?row[2]:c?.name||'기본 공격',round:b.round,actionSequence:b.actionSequence||0,enemySkill:true,...extra});
};
P.newRound=function(...args){
 const b=this.s.runtime;
 if(b&&this._enemySkillStarting)b.enemySkillVersion=1;
 if(active(this))for(const a of b.actors.filter(a=>a.side==='ENEMY'&&scope.has(a.source))){
  if(a.enemySkillsInitialized)continue;a.enemySkillsInitialized=true;a.hasDedicatedCards=true;
  const passive=(id,pct,element,multipliers={})=>{this.shield(a,a.maxHp*pct,id,null,{element:en(element),damageMultipliers:multipliers});this.enemySkillLog(a,id,{text:a.name+' · '+this.row('12_ENEMY_CARD_DB',id)[2]+' 발동',passive:true});};
  if(a.source==='MON_MITACHURL_WOOD')a.enemyWoodOpenRound=0;
  if(a.source==='MON_LAWACHURL_FROST')passive('ECARD_LAWA_FROST_ARMOR',.4,'CRYO',{'불':1.5});
  if(a.source==='MON_ABYSS_MAGE_HYDRO')passive('ECARD_ABYSS_HYDRO_SHIELD',.35,'HYDRO',{'풀':2,'얼음':1.5,'번개':1.5});
  if(a.source==='MON_ABYSS_MAGE_CRYO')passive('ECARD_ABYSS_CRYO_SHIELD',.35,'CRYO',{'불':2});
 }
 return old.newRound.apply(this,args);
};
P.actorCards=function(a){
 let cards=old.actorCards.call(this,a);
 if(!active(this))return cards.filter(c=>!named.has(c.id)); // in-progress pre-patch fights retain their actions.
 if(a.side==='ENEMY'&&scope.has(a.source)&&this.s.runtime?.balanceProfile?.mondLocal){
  // Enemy innate patterns follow the regional encounter level, not the old Lv14 prototype gate.
  cards=cards.map(c=>({...c,level:1}));
 }
 return cards;
};
P.cardTargets=function(a,c){
 if(isLocal(this,a)&&c.id==='ECARD_SAMA_HYDRO_HEAL')return this.s.runtime.actors.filter(t=>t.side===a.side&&t.hp>0);
 if(isLocal(this,a)&&c.id==='ECARD_CICIN_CRYO_SHIELD')return [a];
 return old.cardTargets.call(this,a,c);
};
P.cardReason=function(a,c){
 const reason=old.cardReason.call(this,a,c);if(reason||!isLocal(this,a))return reason;
 if(a.enemyCharge&&!this._resolvingEnemyCharge)return'원소 폭발을 준비하고 있습니다.';
 if(a.enemyCore&&a.turns<=a.enemyCore.throughTurn&&/DMG_AOE|MULTIHIT_AOE/.test(c.script))return'코어 노출로 이번 자기 행동의 광역 기술을 사용할 수 없습니다.';
 const enemies=this.s.runtime.actors.filter(t=>t.side!==a.side&&t.hp>0),friends=this.s.runtime.actors.filter(t=>t.side===a.side&&t.hp>0);
 if(c.trigger==='ACTIVE_IF_ALLY_COUNT>=2'&&enemies.length<2)return'살아 있는 상대가 2명 이상일 때 사용합니다.';
 if(c.id==='ECARD_SAMA_HYDRO_HEAL'&&!friends.some(t=>t.hp/t.maxHp<=.7))return'같은 편의 체력이 70% 이하일 때 사용합니다.';
 if(c.id==='ECARD_CICIN_CRYO_SUMMON'&&(a.enemyCicinCryo||0)>1)return'얼음 치친이 이미 2체 유지 중입니다.';
 if(c.id==='ECARD_CICIN_CRYO_SHIELD'&&(shields(a)>0||!(a.enemyCicinCryo>0)))return'치친이 1체 이상 있고 보호막이 없을 때 사용합니다.';
 return'';
};
P.cancelEnemyCharge=function(a,reason){
 if(!a.enemyCharge)return false;
 const c=a.enemyCharge;delete a.enemyCharge;
 this.addCombatStatus(a,'ENEMY_CHARGE_EXPOSED',null,{untilTurn:(a.turns||0)+1,enemySkillStatus:true,damageTaken:1.2});
 this.enemySkillLog(a,c.card,{interrupted:true,text:a.name+' · '+c.name+' 중단! 다음 자기 차례까지 받는 피해 +20%. ('+reason+')'});return true;
};
P.addCombatStatus=function(a,id,rounds,extra={}){
 if(isLocal(this,a)&&a.source==='MON_LAWACHURL_FROST'&&id==='STATUS_SLOW'&&(a.shields||[]).some(s=>s.source==='ECARD_LAWA_FROST_ARMOR'&&s.value>0))return null;
 const result=old.addCombatStatus.call(this,a,id,rounds,extra);
 if(active(this)&&a.enemyCharge&&result&&['STATUS_FREEZE','LIFTED','STATUS_STUN'].includes(id))this.cancelEnemyCharge(a,label[id]||'행동 제어');
 return result;
};
P.applyCombatControl=function(a,t,kind,options={}){
 const result=old.applyCombatControl.call(this,a,t,kind,options);
 if(active(this)&&result&&t.enemyCharge&&['FREEZE','LIFT','PUSH'].includes(kind))this.cancelEnemyCharge(t,kind==='FREEZE'?'빙결':'강한 경직');
 return result;
};
P.onCombatTurnStart=function(a){
 const out=old.onCombatTurnStart?.call(this,a);
 if(active(this)&&a.enemyCharge&&this.combatActionLocked(a))this.cancelEnemyCharge(a,'행동 불가');
 return out;
};
P.executeCard=function(a,c,target,branch){
 if(!isLocal(this,a)||sig[c.id]===undefined)return old.executeCard.call(this,a,c,target,branch);
 const support=this.cardSupport(c);if(support)fail('ENEMY_CARD_IMPLEMENTATION',support);
 const b=this.s.runtime,legal=b.actors.filter(t=>t.side!==a.side&&t.hp>0&&this.hasAirAccess(a,t,c.range)),targets=this.combatOrderedTargets(a,legal,target);
 const hit=(t,k,e,o={})=>this.damage(a,t,k,e,{range:c.range,card:c.id,hitBonus:c.hit,...o});
 const slow=t=>{if(t.hp>0)this.addCombatStatus(t,'STATUS_SLOW',1,{value:-10,enemySkillStatus:true});};
 if(c.id==='ECARD_SAMA_HYDRO_HEAL'){
  const t=b.actors.filter(t=>t.side===a.side&&t.hp>0).sort((x,y)=>x.hp/x.maxHp-y.hp/y.maxHp||x.id.localeCompare(y.id))[0];
  if(!t)fail('TARGET','치유 대상을 찾을 수 없습니다.');this.heal(t,t.maxHp*.18,a.name);
 }else if(c.id==='ECARD_CICIN_CRYO_SUMMON'){a.enemyCicinCryo=2;
 }else if(c.id==='ECARD_CICIN_CRYO_SHIELD'){this.shield(a,a.maxHp*.22,c.id,null,{element:'얼음',damageMultipliers:{'불':1.5}});
 }else if(c.id.endsWith('_CHARGE')&&c.id.startsWith('ECARD_WHOPPER_')){
  if(!targets.length)fail('TARGET','공격 가능한 대상이 없습니다.');
  a.enemyCharge={card:c.id,name:c.name,resolveTurn:(a.turns||0)+1,target:targets[0].id,element:c.id.includes('_PYRO_')?'PYRO':'CRYO',coefficient:1.15};
  a.cooldowns[c.id]=c.cooldown;this.enemySkillLog(a,c,{charging:true,text:a.name+' · '+c.name+' 준비! 다음 자기 차례에 최대 3명 공격. 빙결·띄우기·밀치기로 중단 가능.'});return;
 }else{
  if(!targets.length)fail('TARGET','공격 가능한 대상이 없습니다.');
  if(c.id.endsWith('_BARRAGE')){
   const t=targets[0],e=c.id.includes('_PYRO_')?'PYRO':'CRYO';let attached=false;
   for(let n=0;n<3&&t.hp>0;n++)if(hit(t,.28,e,{noAura:attached}))attached=true;
  }else if(c.id==='ECARD_ABYSS_HYDRO_BUBBLE'){
   const t=targets[0],wasCryo=(t.auras||[]).some(x=>x.element==='얼음')||String(t.aura||'').includes('얼음');
   if(hit(t,.65,'HYDRO')&&!wasCryo)slow(t); // common reaction engine owns freeze, no duplicate application.
  }else{
   const spec={ECARD_SAMA_ANEMO_FIELD:[.45,'ANEMO',2],ECARD_SAMA_CRYO_FIELD:[.45,'CRYO',2],ECARD_LAWA_FROST_LEAP:[1.2,'CRYO',2],ECARD_LAWA_FROST_ROAR:[.65,'CRYO',4],ECARD_ABYSS_CRYO_RAIN:[.55,'CRYO',3]}[c.id];
   if(!spec)fail('ENEMY_PASSIVE_ACTION','자동/패시브 기술은 수동 행동으로 실행할 수 없습니다.');
   for(const t of targets.slice(0,spec[2])){const k=spec[0]*(c.id==='ECARD_LAWA_FROST_ROAR'&&st(t,'STATUS_SLOW')?1.2:1);if(hit(t,k,spec[1],{aoe:true}))slow(t);}
  }
 }
 a.cooldowns[c.id]=c.cooldown;this.enemySkillLog(a,c);
};
P.combatStat=function(a,key){
 let n=old.combatStat.call(this,a,key);
 if(active(this)&&a.enemyCore&&a.turns<=a.enemyCore.throughTurn&&key==='def')n*=.75;
 return n;
};
P.combatDamageMultiplier=function(a,t,e,o={}){
 let n=old.combatDamageMultiplier.call(this,a,t,e,o);
 if(!active(this))return n;
 if(st(t,'ENEMY_CHARGE_EXPOSED'))n*=1.2;
 if(isLocal(this,t)&&t.source==='MON_MITACHURL_WOOD'&&t.enemyWoodOpenRound!==this.s.runtime.round&&(en(e)==='물리'||['원거리','대공'].includes(o.range||a.range)))n*=.65;
 if(isLocal(this,a)&&a.enemyCicinCryo>0&&!o.sourceKind&&en(e)==='얼음')n*=1.1;
 return n;
};
P.damage=function(a,t,k,e,o={}){
 const b=this.s.runtime,start=b?.log.length||0,previous=this._enemyIncoming;this._enemyIncoming={source:a.id,range:o.range||a.range,options:o};
 let result;try{result=old.damage.call(this,a,t,k,e,o);}finally{this._enemyIncoming=previous;}
 if(!active(this)||!result)return result;
 const dealt=b.log.slice(start).find(v=>v.actor===a.name&&v.target===t.name&&((v.damage||0)>0||(v.absorbed||0)>0));
 if(!dealt)return result;
 const seq=b.round+':'+b.actionSequence+':'+(o.card||'BASIC');
 if(isLocal(this,a)&&a.enemyCicinCryo>0&&!o.sourceKind&&a.enemyCicinAssistSeq!==seq&&t.hp>0){
  a.enemyCicinAssistSeq=seq;this.damage(a,t,.2,'CRYO',{range:'원거리',card:'ECARD_CICIN_CRYO_SUMMON',sourceKind:'ENEMY_SUMMON'});
 }
 if(isLocal(this,t)&&(!o.sourceKind||o.sourceKind==='JOINT_ATTACK')&&a.side!==t.side){
  const row=o.card&&(this.tables['08_SKILL_CARD_DB'].get(o.card)||this.tables['12_ENEMY_CARD_DB'].get(o.card));
  const aoe=o.aoe||/DMG_AOE|MULTIHIT_AOE|ENEMY_(?:ALL|MAX[2-9])/.test(String(row?.[31])+';'+String(row?.[32]));
  const ranged=['원거리','대공'].includes(o.range||a.range);
  // Explicit CRPG response: a landed ranged/area attack on the caster disperses one familiar per card.
  if((ranged||aoe)&&t.enemyCicinDispersedSeq!==seq&&((t.enemyCicinCryo||0)>0||(t.cicinCount||0)>0)){
   t.enemyCicinDispersedSeq=seq;if(t.enemyCicinCryo>0)t.enemyCicinCryo--;else t.cicinCount--;
   b.log.push({actor:a.name,actorId:a.id,target:t.name,targetId:t.id,text:t.name+'의 치친 1체가 흩어졌다.',round:b.round,actionSequence:b.actionSequence||0});
  }
 }
 return result;
};
P.applyDamage=function(a,t,n,details={}){
 const b=this.s.runtime,hadHp=t.hp,start=b?.log.length||0,result=old.applyDamage.call(this,a,t,n,details);
 if(!isLocal(this,t))return result;
 const packet=b.log.slice(start).find(e=>e.actor===a.name&&e.target===t.name&&(Object.hasOwn(e,'damage')||e.immune)),actual=packet&&((packet.damage||0)>0||(packet.absorbed||0)>0);
 if(!actual)return result;
 if(t.source==='MON_MITACHURL_WOOD'&&en(details.element)==='불'){
  t.enemyWoodOpenRound=b.round;b.log.push({target:t.name,targetId:t.id,text:t.name+'의 나무 방패가 이번 라운드 동안 무력화됐다.',round:b.round});
 }
 if(t.source==='MON_RUIN_GRADER'&&t.hp>0&&!details.sourceKind){
  const range=this._enemyIncoming?.range||a.range,precision=details.critical||['원거리','대공'].includes(range)||this._enemyIncoming?.options?.weakpoint;
  if(precision&&!t.enemyCore){t.enemyWeakpointHits=(t.enemyWeakpointHits||0)+1;
   if(t.enemyWeakpointHits>=3){t.enemyWeakpointHits=0;t.enemyCore={throughTurn:(t.turns||0)+1};t.nextScorePenalty=Math.max(30,t.nextScorePenalty||0);this.enemySkillLog(t,'ECARD_RUIN_GRADER_CORE',{text:t.name+' · 다중 코어 노출! 방어력 -25%, 다음 행동 점수 -30, 다음 자기 행동의 광역 기술 봉쇄.',passive:true});}
  }
 }
 if(hadHp>0&&t.hp<=0)delete t.enemyCharge;
 return result;
};
P.aiTurn=function(a,targets){
 const b=this.s.runtime;
 if(isLocal(this,a)&&a.enemyCharge){
  const charge=a.enemyCharge;
  if(this.combatActionLocked(a)){this.cancelEnemyCharge(a,'행동 불가');return;}
  if(a.turns>=charge.resolveTurn){
   delete a.enemyCharge;const c=this.cardDefinition(this.row('12_ENEMY_CARD_DB',charge.card),true),legal=targets.filter(t=>t.hp>0&&this.hasAirAccess(a,t,c.range));
   for(const t of this.combatOrderedTargets(a,legal,charge.target).slice(0,3))this.damage(a,t,charge.coefficient,charge.element,{range:c.range,card:c.id,aoe:true});
   this.enemySkillLog(a,c,{released:true});return;
  }
  this.enemySkillLog(a,charge.card,{charging:true,text:a.name+' · 원소 폭발 준비 중'});return;
 }
 const start=b?.log.length||0;
 try{return old.aiTurn.call(this,a,targets);}finally{
  if(b&&active(this)&&a.side==='ENEMY'){
   const logs=b.log.slice(start);
   if(!logs.some(e=>e.card)&&logs.some(e=>e.actor===a.name&&(Object.hasOwn(e,'damage')||e.miss||e.guard)))this.enemySkillLog(a,{id:'ENEMY_BASIC',name:logs.some(e=>e.guard)?'방어':'기본 공격'});
   if(a.enemyCore&&a.turns>=a.enemyCore.throughTurn)delete a.enemyCore;
  }
 }
};
// All information is built from definitions and the current state, without rolling or saving.
const adviceFor=c=>{
 const id=c.id,s=c.script;
 if(/WHOPPER.*CHARGE/.test(id))return'다음 자기 차례 전에 빙결·띄우기·밀치기로 차지를 끊으세요. 중단되면 그 적이 받는 피해가 20% 늘어납니다. 끊기 어렵다면 방어로 대비하세요.';
 if(id==='ECARD_MITA_WOOD_SHIELD')return'불 피해를 실제로 입히면 이번 라운드 동안 방패 감소 효과가 꺼집니다. 그 뒤 물리·원거리 공격을 집중하세요.';
 if(id==='ECARD_RUIN_GRADER_CORE')return'원거리·대공 적중 또는 치명타를 3회 누적하세요. 코어가 열리면 방어력이 낮아지고 다음 자기 행동의 광역 기술을 쓰지 못합니다.';
 if(/RUIN.*CORE/.test(id))return'원거리·대공 적중 또는 치명타로 코어를 공략하세요. 노출된 동안 집중 공격하면 유리합니다.';
 if(/HEAL_TARGET/.test(s))return'회복 담당을 먼저 공격하거나 빙결 등으로 행동을 막으세요. 여러 적을 조금씩 때리기보다 한 적에게 피해를 집중하세요.';
 if(/CICIN.*SUMMON/.test(id))return'술사를 원거리 또는 광역 공격으로 적중시키면 기술당 치친 1체를 제거합니다. 치친이 없어지면 추가 공격 압박이 줄어듭니다.';
 if(/SHIELD/.test(s)){
  if(/CRYO/.test(s))return'불 공격으로 보호막을 빠르게 줄이세요. 보호막 잔량과 불 피해 배율을 위에서 확인할 수 있습니다.';
  if(/HYDRO/.test(s))return'풀·얼음·번개 공격의 보호막 추가 피해를 활용하세요. 면역이나 내성은 실제 보호막 수치와 별개입니다.';
  if(/PYRO/.test(s))return'물·얼음 공격으로 보호막을 공략하세요.';
  if(/ELECTRO/.test(s))return'얼음 공격으로 보호막을 공략하세요.';
  return'보호막이 있는 대상의 잔량과 속성별 추가 피해를 먼저 확인하세요.';
 }
 if(/SLOW|NEXT_ACTION_SCORE/.test(s))return'감속·행동 지연에 주의하세요. 해당 적을 먼저 제어하거나 공격받을 차례에 방어하세요.';
 if(/DMG_AOE|MULTIHIT_AOE/.test(s))return'여러 명을 동시에 공격합니다. 재사용이 돌아오는 차례에는 방어·보호막·행동 제어로 대비하세요.';
 if(/MULTIHIT/.test(s))return'한 대상을 여러 번 공격합니다. 남은 체력이 적은 동료를 미리 회복하고 보호막으로 대비하세요.';
 return'행동 순서와 사거리를 확인하고, 집중 공격하거나 방어로 받는 피해를 줄이세요.';
};
P.enemySkillInfo=function(c,a=null){
 const row=c.row,reason=this.cardSupport(c),passive=!c.trigger.startsWith('ACTIVE'),cd=a?.cooldowns?.[c.id]||0;
 const supported=!reason,targetLabel=/HEAL_TARGET/.test(c.script)?'적 진영 1명 · 자신 포함':/^(SUMMON|APPLY_SHIELD)/.test(c.script)?'자신':String(row[5]||c.target).replaceAll('아군','우리 파티');
 return {id:c.id,name:c.name,kind:passive?'패시브·기믹':c.kind,passive,element:row[12]||'물리',target:targetLabel,coefficient:row[6]||'',description:row[13]||row[17]||'세부 설명 없음',summary:row[17]||row[13]||'',condition:row[7]||row[16]||'조건 없음',cooldown:c.cooldown,remaining:cd,supported,reason,available:!passive&&supported&&a&&this.s.runtime?!this.cardReason(a,c):false,unavailableReason:!passive&&supported&&a&&this.s.runtime?this.cardReason(a,c):'',counter:supported?adviceFor(c):'실행 대기 중인 정의입니다. 현재 전투에서 사용 가능한 기술로 안내하지 않습니다.',authored:named.has(c.id),charging:a?.enemyCharge?.card===c.id,level:c.level};
};
P.enemyIntel=function(id){
 const b=this.s.runtime,a=b?.actors.find(x=>x.id===id&&x.side==='ENEMY');if(!a)return null;
 const row=this.row('09_MONSTER_DB',a.source),raw=this.combatRows('12_ENEMY_CARD_DB').filter(r=>r[1]===a.source&&r[30]!=='SAMPLE'),runtimeCards=new Map(this.actorCards(a).map(c=>[c.id,c]));
 const cards=raw.filter(r=>active(this)||!named.has(r[0])).map(r=>{const c=runtimeCards.get(r[0])||this.cardDefinition(r,true);return this.enemySkillInfo(c,a);});
 if(!cards.some(c=>!c.passive))cards.unshift({id:'ENEMY_BASIC',name:'기본 공격',kind:'일반',element:a.element||'물리',target:'상대 1명',coefficient:'기존 기본 공격',description:'공격 가능한 상대에게 기본 공격합니다.',counter:'행동 순서와 사거리를 확인하고 방어로 대비하세요.',cooldown:0,remaining:0,supported:true,passive:false});
 const names=b.actors.filter(t=>t.name===a.name&&t.side==='ENEMY'),statuses=(a.statuses||[]).filter(s=>!Number.isFinite(s.rounds)||s.rounds>0).map(s=>({name:label[s.id]||this.tables['13_STATUS_EFFECT_DB']?.get(s.id)?.[1]||s.id,rounds:s.rounds}));
 const cues=[];
 if(a.enemyCharge)cues.push({kind:'danger',text:a.enemyCharge.name+' 준비 중 · 다음 자기 차례 발동',detail:'빙결·띄우기·밀치기로 중단 가능'});
 if(a.enemyCore)cues.push({kind:'opportunity',text:'코어 노출 · 방어력 -25%',detail:'다음 자기 행동에서 광역 기술 사용 불가'});
 if(a.source==='MON_RUIN_GRADER')cues.push({kind:'info',text:'코어 적중 '+(a.enemyWeakpointHits||0)+' / 3',detail:'원거리·대공 적중 또는 치명타'});
 if(a.source==='MON_RUIN_GUARD_VARIANT')cues.push({kind:'info',text:'약점 적중 '+(a.weakpointHits||0)+' / 2',detail:'원거리·대공 적중 또는 치명타'});
 if(a.enemyCicinCryo||a.cicinCount)cues.push({kind:'warning',text:'치친 '+((a.enemyCicinCryo||0)+(a.cicinCount||0))+'체',detail:'술사에 원거리·광역 적중 → 기술당 1체 제거'});
 if(a.source==='MON_MITACHURL_WOOD')cues.push({kind:a.enemyWoodOpenRound===b.round?'opportunity':'warning',text:a.enemyWoodOpenRound===b.round?'나무 방패 무력화 · 이번 라운드':'나무 방패 · 물리/원거리 피해 35% 감소',detail:'불 피해 적중 뒤 집중 공격'});
 return {id:a.id,source:a.source,name:a.name+(names.length>1?' '+(names.indexOf(a)+1):''),grade:a.grade,level:a.level,family:row[2],hp:a.hp,maxHp:a.maxHp,atk:this.combatStat(a,'atk'),def:this.combatStat(a,'def'),spd:this.combatStat(a,'spd'),range:a.range,airborne:!!a.airborne,shield:shields(a),shields:(a.shields||[]).map(s=>({name:this.tables['12_ENEMY_CARD_DB']?.get(s.source)?.[2]||'보호막',value:Math.round(s.value),element:s.element||'',weakness:Object.entries(s.damageMultipliers||{}).filter(([,m])=>m>1).map(([e,m])=>e+' ×'+m)})),statuses,cues,cards,legacy:!active(this),round:b.round};
};
P.validateSave=function(s){
 if(s.runtime?.enemySkillVersion!==undefined){const b=s.runtime;if(b.enemySkillVersion!==1)fail('ENEMY_SKILL_VERSION','지원하지 않는 적 기술 저장 버전입니다.');
  for(const a of b.actors||[]){if(a.enemyCharge&&(!sig[a.enemyCharge.card]||!Number.isInteger(a.enemyCharge.resolveTurn)||a.enemyCharge.resolveTurn<0))fail('ENEMY_SKILL_SAVE','적 차지 정보가 손상되었습니다.');
   if(a.enemyCicinCryo!==undefined&&(!Number.isInteger(a.enemyCicinCryo)||a.enemyCicinCryo<0||a.enemyCicinCryo>2))fail('ENEMY_SKILL_SAVE','치친 수가 올바르지 않습니다.');
  }
 }
 return old.validateSave.call(this,s);
};
api.enemySkillConfig={scope:C.scope,restored:Object.keys(sig),named:C.cards.map(r=>r[0]),version:1};
})(globalThis);
