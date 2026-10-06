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
P.addCombatStatus=function(a,id,rounds,extra={}){
 // C1 is represented by the field's conditional flat ATK bonus, not an unrelated +20% team multiplier.
 if(id==='CONS_BENNETT_1')extra={...extra,mods:{}};
 const result=old.addCombatStatus.call(this,a,id,rounds,extra),b=this.s.runtime,source=extra.actor||extra.caster||a?.id;
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
