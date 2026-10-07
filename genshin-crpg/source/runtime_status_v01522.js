/* v0.15.22: apply effects before recording them; native elemental bodies and Bennett's field.
 * Korean names and original mechanics: docs/STATUS_EFFECTS_V01522_KO.md.
 * Durations and coefficients are this turn-based CRPG's rules. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;
const old=Object.fromEntries(['addCombatStatus','combatActionLocked','cardReason','combatStat','tickFields','auraList','setAura','syncAura','reactionFor','applyCombatAura','newRound','damage'].map(k=>[k,P[k]]));
const EL={PYRO:'불',HYDRO:'물',CRYO:'얼음',ELECTRO:'번개',ANEMO:'바람',GEO:'바위',DENDRO:'풀',PHYSICAL:'물리'};
const elem=e=>EL[e]||e,live=s=>!Number.isFinite(s.rounds)||s.rounds>0;
const NATIVE={FB_ANEMO_HYPOSTASIS:'바람',FB_ELECTRO_HYPOSTASIS:'번개',FB_CRYO_HYPOSTASIS:'얼음',FB_GEO_HYPOSTASIS:'바위',FB_OCEANID:'물'};
function native(a){return NATIVE[a?.source]||(/^FB_MIMIC_/.test(a?.source)?'물':a?.nativeAura)||null;}
// 0.16.0 (user: 「빙결 뭐냐 원래 이렇게 오래 얼어붙어? 장난없이 쳐맞다가 죽네」): on our side 빙결 takes one turn, the next one
// the character would take, and after it two turns of their own come before it can freeze them again. It used to last to
// the end of the next round (two turns when it came before their turn) and each new freeze refreshed it, so a water slime
// and an ice slime froze a party round after round to the end. (0.16.4 extends the rule to every turn-taking status and
// to the enemies' side, below.)
const FREEZE='STATUS_FREEZE';
// 0.16.4 (user: 「종려의 무한 석화 버그.(이건 좀 전체적으로 바꿀 필요가 있어보인다)」): with 4돌 (석화 one round longer) and 천성's
// three-round cooldown an enemy stayed stone to the end, and freezing, stunning and 물방울 could chain the same way. Every
// status that takes a whole turn away now follows the freeze rule above, on both sides: it takes the next turn only, and two
// turns of the fighter's own come before any of them can take one again.
const HARD={STATUS_FREEZE:'다시 얼지 않는다',LIYUE_PETRIFY:'다시 굳지 않는다',STATUS_STUN:'다시 기절하지 않는다',ILLUSORY_BUBBLE:'다시 갇히지 않는다'};
P.addCombatStatus=function(a,id,rounds,extra={}){
 // C1 is represented by the field's conditional flat ATK bonus, not an unrelated +20% team multiplier.
 if(id==='CONS_BENNETT_1')extra={...extra,mods:{}};
 const b=this.s.runtime;let guard=0;
 if(HARD[id]&&b&&a&&(a.side==='ALLY'||a.side==='ENEMY')&&!(id==='ILLUSORY_BUBBLE'&&a.side==='ENEMY'&&a.grade!=='일반')){
  const turns=Number(a.turns)||0,held=a.statuses?.some(s=>HARD[s.id]&&live(s));
  if(turns<(Number(a.controlGuard??a.freezeGuard)||0)){
   if(!held)b.log.push({target:a.name,targetId:a.id,resisted:id,text:a.name+' · 막 풀려나 '+HARD[id],round:b.round});
   return null;
  }
  // untilTurn: gone when their turn after the next one begins (runtime_combat.js), whichever round that falls in.
  rounds=1;extra={...extra,untilTurn:turns+2};guard=turns+3;
 }
 const result=old.addCombatStatus.call(this,a,id,rounds,extra),source=extra.actor||extra.caster||a?.id;
 if(guard&&result&&a.statuses?.includes(result)){a.controlGuard=guard;delete a.freezeGuard;}
 if(result&&b&&a?.statuses?.includes(result)&&id!=='FORMATION'&&id!=='ROLE')b.log.push({target:a.name,targetId:a.id,actorId:source,actor:b.actors.find(x=>x.id===source)?.name||a.name,round:b.round,actionSequence:b.actionSequence||0,statusApplied:JSON.parse(JSON.stringify(result))});
 return result;
};
P.combatActionLocked=function(a){return !!a?.statuses?.some(s=>s.id==='STATUS_STUN'&&live(s))||old.combatActionLocked.call(this,a);};
P.cardReason=function(a,c){if(a?.statuses?.some(s=>s.id==='STATUS_STUN'&&live(s)))return '기절해 행동할 수 없습니다.';return old.cardReason.call(this,a,c);};
P.combatStat=function(a,key){
 let n=old.combatStat.call(this,a,key);
 if(key==='atk'&&a?.hp>0){const fields=(this.s.runtime?.fields||[]).filter(f=>f.kind==='ENCOURAGEMENT'&&!f.done&&f.rounds>0&&f.side===a.side&&(f.c1||a.hp/a.maxHp>.7));
  // Recasting refreshes a field. If multiple fields coexist, the strongest bonus wins.
  n+=Math.max(0,...fields.map(f=>Number(f.attack||0)*(f.c1 ? .6 : .4)));
 }
 return n;
};
P.tickFields=function(timing){
 const b=this.s.runtime;if(b&&timing==='END')for(const f of b.fields||[])if(f.kind==='ENCOURAGEMENT'&&!f.done&&f.rounds>0){const owner=b.actors.find(a=>a.id===f.actor);for(const a of b.actors.filter(a=>a.side===f.side&&a.hp>0)){if(a.hp/a.maxHp<=.7)this.heal(a,(f.sourceMaxHp||owner?.maxHp||0)*.06,owner?.name||'격려의 영역');this.setAura(a,'불');}}
 return old.tickFields.call(this,timing);
};
P.auraList=function(a){
 const fixed=native(a);if(!fixed)return old.auraList.call(this,a);
 a.nativeAura=fixed;const existing=fixed==='바위'?(a.auras||[]).filter(x=>x.element!==fixed):[];
 a.auras=[{element:fixed,rounds:99,createdRound:this.s.runtime?.round||0,native:true},...existing];return a.auras;
};
P.syncAura=function(a){if(native(a)){a.aura=this.auraList(a).map(x=>x.element).join(' · ');return;}return old.syncAura.call(this,a);};
P.setAura=function(a,e){const fixed=native(a);if(fixed&&fixed!=='바위'){this.syncAura(a);return;}const out=old.setAura.call(this,a,e);if(fixed)this.syncAura(a);return out;};
P.reactionFor=function(a,e,o={}){
 e=elem(e);const fixed=native(a);
 if(fixed==='바람'&&['불','물','얼음','번개'].includes(e)){const row=this.tables['37_ELEMENTAL_REACTION_DB'].get('RX_SWIRL');if(row)return Object.assign([...row],{previousAura:e,nativeAnemo:true});}
 // A proxy excludes inert Geo without consuming or rewriting the real target's applied aura.
 if(fixed==='바위'){const proxy={...a,source:'',nativeAura:null,auras:this.auraList(a).filter(x=>x.element!=='바위')};proxy.aura=proxy.auras.map(x=>x.element).join(' · ');return old.reactionFor.call(this,proxy,e,o);}
 return old.reactionFor.call(this,a,e,o);
};
P.applyCombatAura=function(a,t,e,o={}){const out=old.applyCombatAura.call(this,a,t,e,o);if(native(t))this.syncAura(t);return out;};
P.damage=function(a,t,...args){const out=old.damage.call(this,a,t,...args);if(t&&native(t))this.syncAura(t);return out;};
P.newRound=function(...args){for(const a of this.s.runtime?.actors||[])if(native(a))this.syncAura(a);return old.newRound.apply(this,args);};
api.statusV01522=true;
})(globalThis);
