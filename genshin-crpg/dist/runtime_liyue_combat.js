/* Explicit boss capabilities and a persistent eight-round defensive objective. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype;
const old=Object.fromEntries(['combatStoryConfig','startBattle','actorCards','cardSupport','cardReason','cardTargets','executeCard','combatStat','combatDamageMultiplier','newRound','roundEnd','aiTurn','applyDamage','damage','addCombatStatus','resolveEnemyPhases','checkBattleInterludes','actionReason','apply','validateSave'].map(k=>[k,P[k]]));
const copy=x=>JSON.parse(JSON.stringify(x)),json=x=>{try{return JSON.parse(x||'{}');}catch{return {};}};
const bossIds=new Set(['BOSS_TARTAGLIA','BOSS_ISK_L03_GOLDEN','BOSS_OSIAL','BOSS_ISK_L04_OSIAL']),isOsial=a=>['BOSS_OSIAL','BOSS_ISK_L04_OSIAL'].includes(a?.source),isGolden=a=>['BOSS_TARTAGLIA','BOSS_ISK_L03_GOLDEN'].includes(a?.source);
const waves={1:['MON_FATUI_CRYO','MON_FATUI_PYRO'],3:['MON_FATUI_ELECTRO','MON_FATUI_HYDRO'],5:['MON_FATUI_GEO','MON_FATUI_ANEMO'],7:['MON_FATUI_AGENT']};
P.supportsLiyueBoss=id=>bossIds.has(id);
P.combatStoryConfig=function(group){
 const node=this.storyNode(),e=node&&[...this.liyueDefinitions().values()].find(e=>e.SOURCE_ID_OR_FILTER===node[4]&&e.p.kind==='combat_gate'&&e.p.encounter_group_id===group);
 if(e){const p=e.p;return {node_id:node[4],map_id:node[8],route:'ROUTE_ISEKAI',party_max:4,guest_char_ids:[],branch:this.liyueLeaf(),eventId:e.EVENT_ID,noRewards:true,result:'VICTORY',liyue:true,objective:copy(p.objective||null)};}
 if(node?.[0]==='ROUTE_TRAVELER'&&String(node[1]).startsWith('Q_TRV_LIYUE_')&&String(node[12]).includes('START_FIXED_COMBAT:'+group))return {node_id:node[4],map_id:node[8],route:'ROUTE_TRAVELER',party_max:4,guest_char_ids:[],branch:this.s.flags.FLAG_TRV_LY_GOLDEN_ROUTE||null,liyue:true,objective:group==='EG_BOSS_OSIAL'?{kind:'PROTECT_FORMATION',formation_hp:3000,formation_def:120,charge_rounds:8,wave_hp_multiplier:.4}:null};
 return old.combatStoryConfig.call(this,group);
};
const fieldEnemyCards=new Set(['ECARD_MITA_ROCK_SHIELD','ECARD_MITA_ROCK_CHARGE','ECARD_RUIN_VARIANT_CORE','ECARD_FATUI_CRYO_SPRAY','ECARD_FATUI_CRYO_ARMOR','ECARD_FATUI_PYRO_AIM','ECARD_FATUI_ANEMO_GUARD','ECARD_FATUI_ELECTRO_ARMOR','ECARD_FATUI_HYDRO_HEAL','ECARD_FATUI_GEO_BARRIER','ECARD_FATUI_AGENT_STEALTH','ECARD_FATUI_AGENT_BLADE']);
P.isLiyueFieldEnemy=function(a){const b=this.s.runtime,map=this.tables['32_MAP_DB']?.get(this.s.global.CURRENT_MAP_ID);return a?.side==='ENEMY'&&map?.[1]==='리월'&&(b?.origin==='RANDOM'||b?.origin?.startsWith('QUEST:'));};
P.actorCards=function(a){
 let cards=old.actorCards.call(this,a);if(!this.isLiyueFieldEnemy(a))return cards;
 if(a.source==='MON_GEOVISHAP_HATCHLING'){
  const inherited=this.combatRows('12_ENEMY_CARD_DB').filter(r=>r[1]==='MON_VISHAP'&&r[3]!=='패시브'&&r[30]?.startsWith('ACTIVE')).map(r=>({...this.cardDefinition(r,true),owner:a.source,level:1,inheritedFrom:'MON_VISHAP'}));
  if(inherited.length){a.hasDedicatedCards=true;cards=[...cards,...inherited];}
 }
 if(a.source==='MON_RUIN_GUARD_VARIANT'&&cards.length){a.hasDedicatedCards=true;cards=cards.map(c=>({...c,level:1}));}
 return cards;
};
P.cardSupport=function(c){if(c.enemy&&fieldEnemyCards.has(c.id))return c.ready?'':'적 카드 정의가 준비되지 않았습니다.';return c.enemy&&bossIds.has(c.owner)&&c.ready?'':old.cardSupport.call(this,c);};
P.cardTargets=function(a,c){if(['ECARD_FATUI_ANEMO_GUARD','ECARD_FATUI_GEO_BARRIER','ECARD_FATUI_HYDRO_HEAL'].includes(c.id))return this.s.runtime.actors.filter(t=>t.side===a.side&&t.hp>0&&(c.id==='ECARD_FATUI_HYDRO_HEAL'?t.hp/t.maxHp<=.7:!t.shields.some(s=>s.value>0))).sort((x,y)=>x.hp/x.maxHp-y.hp/y.maxHp);return old.cardTargets.call(this,a,c);};
P.cardReason=function(a,c){if(c.id==='ECARD_FATUI_AGENT_STEALTH'&&a.statuses.some(s=>s.id==='AGENT_STEALTH'))return '이미 잠행 중입니다.';if(['ECARD_FATUI_ANEMO_GUARD','ECARD_FATUI_GEO_BARRIER','ECARD_FATUI_HYDRO_HEAL'].includes(c.id)&&!this.cardTargets(a,c).length)return '지원할 대상이 없습니다.';if(['ECARD_MITA_ROCK_SHIELD','ECARD_RUIN_VARIANT_CORE','ECARD_FATUI_CRYO_ARMOR','ECARD_FATUI_ELECTRO_ARMOR'].includes(c.id))return '조건에 따라 자동 발동합니다.';if(c.id==='ECARD_MITA_ROCK_CHARGE'&&!a.shields.some(s=>s.value>0))return '바위 방패가 필요합니다.';if(this.s.runtime?.liyueInterlude)return '전투 중 대화를 먼저 확인하세요.';if(c.enemy&&bossIds.has(c.owner)){if(isOsial(a)||c.trigger.startsWith('AUTO_'))return '전투 기믹으로 자동 처리됩니다.';const phase=Number(c.trigger.match(/ACTIVE_IF_PHASE=(\d)/)?.[1]);if(phase&&phase!==(a.liyuePhase||1))return '현재 단계에서 사용하지 않습니다.';if(a.cooldowns[c.id]>0)return '재사용 대기 중입니다.';return '';}return old.cardReason.call(this,a,c);};
P.executeCard=function(a,c,target,branch){
 if(c.id==='ECARD_FATUI_AGENT_STEALTH'){this.addCombatStatus(a,'AGENT_STEALTH',null);a.cooldowns[c.id]=c.cooldown;return;}
 if(['ECARD_FATUI_CRYO_SPRAY','ECARD_FATUI_PYRO_AIM','ECARD_FATUI_ANEMO_GUARD','ECARD_FATUI_HYDRO_HEAL','ECARD_FATUI_GEO_BARRIER','ECARD_FATUI_AGENT_BLADE'].includes(c.id)){
  const ts=this.cardTargets(a,c),t=ts.find(v=>v.id===target)||ts[0];if(!t)return;
  if(c.id==='ECARD_FATUI_CRYO_SPRAY'){let hits=0;for(let i=0;i<3&&t.hp>0;i++)if(this.damage(a,t,.3,'CRYO',{range:c.range,card:c.id,hitBonus:c.hit,noAura:hits>0}))hits++;if(hits===3&&t.hp>0)this.andriusStatusCheck(a,t,c,'STATUS_SLOW',1,55,5);}
  else if(c.id==='ECARD_FATUI_PYRO_AIM')this.damage(a,t,1.35,'PYRO',{range:c.range,card:c.id,hitBonus:15});
  else if(c.id==='ECARD_FATUI_HYDRO_HEAL')this.heal(t,t.maxHp*.2,a.name);
  else if(c.id==='ECARD_FATUI_GEO_BARRIER')this.shield(t,a.maxHp*.2,c.id,null,{element:'바위',actor:a.id});
  else if(c.id==='ECARD_FATUI_AGENT_BLADE')this.damage(a,t,1.2,'PYRO',{range:c.range,card:c.id,hitBonus:c.hit});
  else this.shield(t,a.maxHp*.18,c.id,1,{element:'바람',actor:a.id,counterBeforeTurn:(a.turns||0)+1});
  a.cooldowns[c.id]=c.cooldown;this.s.runtime.log.push({actor:a.name,card:c.id,cardName:c.name});return;
 }
 if(c.id==='ECARD_MITA_ROCK_CHARGE'){for(const t of this.s.runtime.actors.filter(t=>t.side!==a.side&&t.hp>0).slice(0,2))this.damage(a,t,1.05,'GEO',{range:c.range,card:c.id});a.cooldowns[c.id]=c.cooldown;return;}
 if(!c.enemy||!bossIds.has(c.owner))return old.executeCard.call(this,a,c,target,branch);
 if(isOsial(a))return;const enemies=this.s.runtime.actors.filter(t=>t.side==='ALLY'&&t.hp>0),t=enemies.find(t=>t.id===target)||enemies[0],script=c.script;let m;
 if((m=/^DMG:ATK\*([\d.]+):(\w+)/.exec(script)))this.damage(a,t,+m[1],m[2],{range:c.range,card:c.id});
 else if((m=/^DMG_AOE:ATK\*([\d.]+):(\w+):MAX(\d+)/.exec(script))){const hit=enemies.slice(0,+m[3]);for(const v of hit)this.damage(a,v,+m[1],m[2],{range:'전장',card:c.id});const follow=/;DMG:ATK\*([\d.]+):(\w+)/.exec(script);if(follow&&hit[0]?.hp>0)this.damage(a,hit[0],+follow[1],follow[2],{range:'전장',card:c.id,noAura:true});}
 else if((m=/^MULTIHIT:ATK\*([\d.]+):HITS=(\d+):ELEMENTS=([A-Z,]+)/.exec(script)))for(const [i,el]of m[3].split(',').entries())if(t?.hp>0)this.damage(a,t,+m[1],el,{range:c.range,card:c.id,noAura:i>0});
 a.cooldowns[c.id]=c.cooldown;
};
P.spawnLiyueWave=function(round){const b=this.s.runtime,o=b.liyueObjective;if(!o||o.spawned.includes(round)||!waves[round])return;o.spawned.push(round);for(const id of waves[round]){
 for(const row of this.combatRows('12_ENEMY_CARD_DB').filter(v=>v[1]===id&&v[35]==='READY')){const c=this.cardDefinition(row,true);if(this.cardSupport(c))throw new api.RuleError('UNSUPPORTED_ENEMY','증원 병력의 전용 기술을 확인하세요: '+c.name);}const r=this.row('09_MONSTER_DB',id),hp=Math.max(1,Math.round(Number(r[6])*o.waveHp));b.actors.push({id:id+'#W'+round,source:id,name:r[1],side:'ENEMY',control:'AI',hp,maxHp:hp,atk:+r[7],def:+r[8],crit:+r[9],critDmg:+r[10],level:+r[18],spd:+r[19],hit:+r[20],eva:+r[21],resist:+r[22],range:r[23],grade:r[3],tags:String(r[5]||'').match(/\[[^\]]+\]/g)||[],tactic:r[24],aura:null,statuses:[],shields:[],cooldowns:{},turns:0,element:'물리',hasDedicatedCards:true,siege:true});
 }b.log.push({objective:'REINFORCEMENTS',round,text:'진법을 노리는 증원 병력이 도착했다.'});};
P.newRound=function(){
 const b=this.s.runtime;if(!b)return;for(const a of b.actors)if(a.source==='MON_MITACHURL_ROCK'&&!a.rockShieldInitialized){a.rockShieldInitialized=true;this.shield(a,a.maxHp*.3,'ECARD_MITA_ROCK_SHIELD',null,{element:'바위',ignoreForcedMove:true});}if(b.opening?.state==='PENDING')return;
 if(b.storyConfig?.objective?.kind==='PROTECT_FORMATION'&&!b.liyueObjective){const c=b.storyConfig.objective;b.liyueObjective={hp:c.formation_hp||3000,maxHp:c.formation_hp||3000,def:c.formation_def||120,charge:0,target:8,spawned:[],settled:[],waveHp:c.wave_hp_multiplier||.4};}
 if(b.liyueObjective)this.spawnLiyueWave(b.round);if(b.storyConfig?.objective?.kind==='LOCAL_EVACUATION_DEFENSE')b.liyueEvacuation??={completedRounds:0,target:4};
 for(const a of b.actors)if(['MON_FATUI_CRYO','MON_FATUI_ELECTRO'].includes(a.source)&&!a.fatuiArmorInitialized){a.fatuiArmorInitialized=true;const cryo=a.source==='MON_FATUI_CRYO';this.shield(a,a.maxHp*.3,cryo?'ECARD_FATUI_CRYO_ARMOR':'ECARD_FATUI_ELECTRO_ARMOR',null,{element:cryo?'얼음':'번개',damageMultipliers:cryo?{불:2}:{얼음:2}});}
 return old.newRound.call(this);
};
P.liyueBattleOutcome=function(b){const evac=b.liyueEvacuation;if(evac){if(!b.actors.some(a=>a.side==='ALLY'&&a.hp>0))return false;if(evac.completedRounds>=4&&!b.actors.some(a=>a.side==='ENEMY'&&a.hp>0)){if(this.combatActor()?.hp<=0){b.defenseAwaitingRecovery=true;b.phase='WAIT_PLAYER';return 'HOLD';}return true;}return undefined;}const o=b.liyueObjective;if(!o)return undefined;if(o.hp<=0)return false;if(o.charge>=8&&!b.actors.some(a=>a.side==='ENEMY'&&!isOsial(a)&&a.hp>0)){if(this.combatActor()?.hp<=0){b.defenseAwaitingRecovery=true;b.phase='WAIT_PLAYER';this.s.global.COMBAT_ACTION_PHASE='WAIT_PLAYER';return 'HOLD';}return true;}return undefined;};
P.combatStat=function(a,key){const n=old.combatStat.call(this,a,key);return key==='eva'&&a.statuses?.some(s=>s.id==='AGENT_STEALTH')&&!this._fatuiAttack?.aoe?n+20:n;};
P.combatDamageMultiplier=function(a,t,e,o={}){const n=old.combatDamageMultiplier.call(this,a,t,e,o);return !o.sourceKind&&this._fatuiAttack?.actor===a.id&&this._fatuiAttack.stealth?n*1.25:n;};
P.damage=function(a,t,k,e,o={}){if(isOsial(t)){this.s.runtime.log.push({actor:a.name,target:t.name,damage:0,immune:'본체 무적 · 진법을 지키세요.'});return false;}
 const prior=this._fatuiAttack,stealth=!o.sourceKind&&a.statuses?.some(s=>s.id==='AGENT_STEALTH'),row=o.card&&(this.tables['08_SKILL_CARD_DB'].get(o.card)||this.tables['12_ENEMY_CARD_DB'].get(o.card)),aoe=o.aoe===true||/DMG_AOE|ENEMY_(?:ALL|MAX[2-9])|ALLY_ALL|(?:^|:)MAX[2-9]/.test(String(row?.[31])+';'+String(row?.[32]));this._fatuiAttack={actor:a.id,stealth,aoe};
 try{return old.damage.call(this,a,t,k,e,{...o,hitBonus:(o.hitBonus||0)+(stealth?10:0)});}finally{if(stealth)a.statuses=a.statuses.filter(s=>s.id!=='AGENT_STEALTH');this._fatuiAttack=prior;}
};
P.applyDamage=function(a,t,n,details={}){if(isOsial(t))return 0;const logStart=this.s.runtime.log.length,barriers=(t.shields||[]).filter(s=>s.source==='ECARD_FATUI_ANEMO_GUARD').map(s=>({...s})),result=old.applyDamage.call(this,a,t,n,details);
 const packet=this.s.runtime.log.slice(logStart).find(v=>v.actor===a.name&&v.target===t.name&&Object.hasOwn(v,'damage'));if(n>0&&!details.sourceKind&&a.side!==t.side)for(const shield of barriers.filter(s=>packet?.brokenShields?.includes(s.source))){const caster=this.s.runtime.actors.find(v=>v.id===shield.actor);if(caster?.hp>0&&a.hp>0&&(caster.turns||0)<shield.counterBeforeTurn)this.damage(caster,a,.55,'ANEMO',{range:'전장',card:'ECARD_FATUI_ANEMO_GUARD',sourceKind:'COUNTER'});}
 if(t.source==='MON_RUIN_GUARD_VARIANT'&&t.hp>0&&n>0&&!details.sourceKind&&(details.critical||['원거리','대공'].includes(this._liyueDamage?.options?.range||a.range))){t.weakpointHits=(t.weakpointHits||0)+1;if(t.weakpointHits>=2&&t.coreExposedRound!==this.s.runtime.round){t.weakpointHits=0;t.coreExposedRound=this.s.runtime.round;t.nextScorePenalty=Math.max(20,t.nextScorePenalty||0);this.addCombatStatus(t,'RUIN_VARIANT_CORE_EXPOSED',null,{untilTurn:(t.turns||0)+1,mods:{def:{pct:-25}}});this.s.runtime.log.push({target:t.name,text:'약점 코어가 노출되어 다음 행동까지 방어력이 낮아졌다.'});}}return result;};
P.addCombatStatus=function(a,...rest){if(isOsial(a))return null;return old.addCombatStatus.call(this,a,...rest);};
P.aiTurn=function(a,targets){
 const b=this.s.runtime,o=b?.liyueObjective;if(isOsial(a))return;
 if(o&&a.side==='ENEMY'&&a.siege){
  const forced=(a.statuses||[]).some(s=>/TAUNT/.test(s.id));if(forced&&targets.length)return old.aiTurn.call(this,a,targets);
  if(!targets.length||this.random()<.7){const stealth=a.statuses.some(s=>s.id==='AGENT_STEALTH'),chance=Math.min(100,this.combatStat(a,'hit')+15+(stealth?10:0));if(this.die(100)<=chance){const damage=Math.max(1,Math.round(this.combatStat(a,'atk')*.9*(100/(100+o.def))*1.25*(stealth?1.25:1)));o.hp=Math.max(0,o.hp-damage);b.log.push({actor:a.name,target:'선인 진법',damage,objective:'FORMATION_DAMAGE'});}else b.log.push({actor:a.name,target:'선인 진법',miss:true});if(stealth)a.statuses=a.statuses.filter(s=>s.id!=='AGENT_STEALTH');return;}
 }
 return old.aiTurn.call(this,a,targets);
};
P.roundEnd=function(){
 const b=this.s.runtime,o=b?.liyueObjective;if(b?.liyueEvacuation)b.liyueEvacuation.completedRounds=Math.max(b.liyueEvacuation.completedRounds,b.round);if(o&&!o.settled.includes(b.round)){
  o.settled.push(b.round);o.charge=Math.min(8,o.charge+1);b.log.push({objective:'FORMATION_CHARGE',charge:o.charge,target:8,round:b.round});
  if(b.round%3===0){const boss=b.actors.find(isOsial),proxy={...boss,atk:b.storyConfig?.route==='ROUTE_ISEKAI'?90:boss.atk};for(const a of b.actors.filter(a=>a.side==='ALLY'&&a.hp>0))if(this.damage(proxy,a,1.75,'HYDRO',{range:'전장',card:'OSIAL_DELUGE',noAura:false}))a.nextScorePenalty=(a.nextScorePenalty||0)+12;}
 }
 return old.roundEnd.call(this);
};
P.resolveEnemyPhases=function(){
 const result=old.resolveEnemyPhases?.call(this),b=this.s.runtime;if(!b||b.opening?.state==='PENDING')return result;
 for(const a of b.actors.filter(isGolden)){
  const ratio=a.hp/a.maxHp,next=ratio<=.35?3:ratio<=.7?2:1,previous=a.liyuePhase||1;
  if(next>previous){a.liyuePhase=next;if(next===3)a.spd+=8;b.log.push({phase:next,actor:a.name,text:next===2?'교전 방식이 바뀐다.':'상대가 마지막 전투 태세를 취한다.'});
   if(next===3&&a.source==='BOSS_TARTAGLIA'&&!b.liyueInterludeSeen){b.liyueInterludeSeen=true;const row=this.row('12_ENEMY_CARD_DB','ECARD_TARTAGLIA_PHASE3'),p=json(row[36]);b.liyueInterlude={id:'TRV_LY3_A_PHASE2_EMPTY',lines:p.story_interlude?.lines||[]};}
  }
 }
 return result;
};
P.checkBattleInterludes=function(){const b=this.s.runtime;if(b?.liyueInterlude){b.phase='WAIT_PLAYER';this.s.global.SCREEN_MODE='COMBAT';this.s.global.COMBAT_ACTION_PHASE='WAIT_PLAYER';return true;}return old.checkBattleInterludes.call(this);};
P.actionReason=function(type,a={}){if(type==='LIYUE_INTERLUDE_ACK')return this.s.runtime?.liyueInterlude?'':'확인할 전투 대화가 없습니다.';return old.actionReason.call(this,type,a);};
P.apply=function(a){if(a.type==='LIYUE_INTERLUDE_ACK'){delete this.s.runtime.liyueInterlude;this.s.runtime.phase='RESOLVING';this.autoUntilPlayer();return {continued:true};}return old.apply.call(this,a);};
P.validateSave=function(s){const b=s.runtime,o=b?.liyueObjective;if(o){if(!b.storyConfig?.liyue||!Number.isFinite(o.hp)||o.hp<0||o.hp>o.maxHp||!Number.isInteger(o.charge)||o.charge<0||o.charge>8||new Set(o.spawned).size!==o.spawned.length||o.spawned.some(n=>![1,3,5,7].includes(n))||Math.min(8,o.settled.length)!==o.charge)throw new api.RuleError('DEFENSE_SAVE','방어전의 진법·증원 기록을 확인하세요.');}return old.validateSave.call(this,s);};
})(globalThis);
