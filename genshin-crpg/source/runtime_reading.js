/* Conversation journals contain commands, never client-authored saves or rewards. */
(function(root){
'use strict';
const P=root.CRPGRuntime.Runtime.prototype;
P.previewStoryRead=function(node,type='STORY_NEXT',params={node}){
 const before=this.s,n=type==='STORY_CHOICE'?this.storyChoices().find(x=>x[4]===node):this.storyNode();
 if(!['STORY_NEXT','STORY_CHOICE','STORY_NAME'].includes(type)||before.global.SCREEN_MODE!=='STORY'||before.runtime&&!before.runtime.interlude||before.lifeJob||before.worldJob||before.battlePreparation||before.storyJourney||before.storyBreak||!n||n[4]!==node||!['DIALOGUE','NARRATION','CHOICE','INPUT_TEXT'].includes(n[5]))return null;
 if(type==='STORY_NAME'&&(n[5]!=='INPUT_TEXT'||params.name!==before.global.PLAYER_NAME))return null;
 try{
  const result=this.action(type,type==='STORY_NAME'?{name:params.name}:{node}),state=this.s;
  // Server randomness is private. Battle resolution and random rewards remain boundaries.
  // Deterministic dialogue flags, costs and choices are replayed and validated atomically.
  if(state.global.PRNG_STATE!==before.global.PRNG_STATE||!!state.runtime!==!!before.runtime||state.battlePreparation||state.lifeJob||state.worldJob)return null;
  if(before.runtime&&JSON.stringify(before.runtime)!==JSON.stringify(state.runtime))return null;
  const boundary=state.global.SCREEN_MODE!=='STORY'||!!state.storyJourney||!!state.storyBreak||state.storyContext?.entry!==before.storyContext?.entry;
  return {state,result,boundary};
 }catch{return null;}finally{this.s=before;}
};
})(globalThis);
/* 0.16.48 비경 피로 (user, 2026-10-16: 「제일 중요한건? 어떤 비경을 가더라도, 효율적 측면에서 반드시 돌아가거나 요리를 이용해서 회복을
 * 해야한다는거야. 그게 있어야 어떤것이든 수요가 존재할 수 있으니까」, choosing 「비경 피로」).
 * Healers have their burst ready at the start of every fight and nothing caps healing below max HP, so a healing or
 * shielding party never had to rest (0–8% lost a run in most domains). Now every domain fight leaves each party member who
 * fought in it one 피로 (max 4): each 피로 takes 20% off that member's max HP in later fights, and their HP outside a fight
 * stays at or under the lowered max. An inn stay clears all 피로; a recovery dish clears 피로 by its grade (일반 1 · 고급 2 ·
 * 희귀 3 · 전설 4) as it heals. The inn's price already counts the HP that 피로 holds back (it is lost HP).
 * A defeat outside the story no longer heals for free: the party stands up at 30% of its (tired) max HP in the safe town
 * and rests at the inn there or eats. Abyss, raid, co-op and story fights are left as they were. Fights and saves from
 * before this have no 피로. It sits at the end of runtime_reading.js, the last engine file, so it wraps the battle and shop
 * rules outermost and the engine file list stays the one the older engine comparisons check. Only a domain fight carries
 * the marker (fatigueRevision); other fights look exactly as before unless a member is tired. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.fatigueVersion)return;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const PLAYER='PLAYER_CUSTOM',PER=.2,MAX=4,RECOVER_HP=.3;
const CLEAR={'일반':1,'고급':2,'희귀':3,'전설':4};
const old=Object.fromEntries(['apply','startBattle','finishBattle','meal','buy','recoverParty','validateSave'].map(k=>[k,P[k]]));
const getHp=(r,id)=>id===PLAYER?Number(r.s.global.PLAYER_HP_CURRENT):Number(r.s.chars?.[id]?.hp);
const setHp=(r,id,hp)=>{if(id===PLAYER)r.s.global.PLAYER_HP_CURRENT=hp;else if(r.s.chars?.[id])r.s.chars[id].hp=hp;};
const own=(r,a)=>a?.side==='ALLY'&&!a.coop&&a.control!=='GUEST'&&(a.source===PLAYER||!!r.s.chars?.[a.source]);
const excluded=(b,origin)=>/^(ABYSS:|RAID|STORY:)/.test(String(origin||''))||!!(b?.abyss||b?.raid||b?.coop||b?.storyConfig)||/^STORY:/.test(String(b?.origin||''));
P.fatigueStacks=function(id){return Math.max(0,Math.min(MAX,Math.floor(Number(this.s.fatigue?.stacks?.[id])||0)));};
P.setFatigue=function(id,n){n=Math.max(0,Math.min(MAX,Math.floor(n)));if(!n&&!this.s.fatigue)return;const f=this.s.fatigue??={version:1,stacks:{}};if(n)f.stacks[id]=n;else delete f.stacks[id];};
P.fatigueTrueMax=function(id){const a=id===PLAYER?this.player():this.character(id);return Number(a?.maxHp)||1;};
P.fatigueMax=function(id){return Math.max(1,Math.round(this.fatigueTrueMax(id)*(1-PER*this.fatigueStacks(id))));};
P.fatigueClamp=function(id){const hp=getHp(this,id),cap=this.fatigueMax(id);if(Number.isFinite(hp)&&hp>cap)setHp(this,id,cap);};
P.fatigueView=function(){const party=(this.s.party||[]).filter(p=>p.active).map(p=>p.source).filter(Boolean);return {perStack:PER,max:MAX,clear:copy(CLEAR),members:party.map(id=>({id,stacks:this.fatigueStacks(id),maxHpRatio:1-PER*this.fatigueStacks(id)})).filter(x=>x.stacks)};};
// What a dish would leave: the 피로 it clears and the max HP the eater can be healed to (the quick meal shows the real gain).
P.fatigueMealCap=function(id,item){const n=this.fatigueStacks(id),clear=n?Math.min(n,this.foodFatigueClear(item)):0,left=n-clear;return {clear,left,cap:Math.max(1,Math.round(this.fatigueTrueMax(id)*(1-PER*left)))};};
// Whatever heals outside a fight (a level-up, a story scene) keeps a tired member's HP under the lowered max.
P.apply=function(a,...rest){const out=old.apply.call(this,a,...rest);if(!this.s.runtime&&this.s.fatigue)for(const id of Object.keys(this.s.fatigue.stacks||{}))this.fatigueClamp(id);return out;};
// A tired member starts every fight with the lowered max HP.
P.startBattle=function(group,origin,...rest){
 const before=this.s.runtime,out=old.startBattle.call(this,group,origin,...rest),b=this.s.runtime;
 if(!b||b===before||excluded(b,origin))return out;
 if(b.growthDomain)b.fatigueRevision=1;
 for(const a of b.actors||[]){if(!own(this,a))continue;const n=this.fatigueStacks(a.source);if(!n)continue;const max=Math.max(1,Math.round(a.maxHp*(1-PER*n)));a.fatigue=n;a.maxHp=max;if(a.hp>max)a.hp=max;}
 return out;
};
// Each member who fought in a domain comes out one 피로 more tired.
P.finishBattle=function(victory,...rest){
 const b=this.s.runtime,domain=!!(b&&b.fatigueRevision===1&&b.growthDomain),ids=domain?[...new Set(b.actors.filter(a=>own(this,a)).map(a=>a.source))]:[];
 const out=old.finishBattle.call(this,victory,...rest);
 if(!domain||!ids.length)return out;
 const added=[];for(const id of ids){const n=this.fatigueStacks(id);if(n<MAX){this.setFatigue(id,n+1);added.push(id);}this.fatigueClamp(id);}
 const info={added,stacks:Object.fromEntries(ids.map(id=>[id,this.fatigueStacks(id)])),perStack:PER,max:MAX};
 if(out&&typeof out==='object'){out.fatigue=info;const key=out.battleId||out.id;if(key&&this.s.combatReceipts?.[key])this.s.combatReceipts[key].fatigue=copy(info);try{const last=JSON.parse(this.s.global.LAST_BATTLE_RESULT_JSON||'null');if(last&&(last.battleId||last.id)===key){last.fatigue=copy(info);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(last);}}catch{}}
 return out;
};
// A recovery dish eases 피로 by its grade, then the eater's HP keeps under the new max.
P.foodFatigueClear=function(item){let spec=null;try{spec=this.foodSpec(item,{});}catch{}if(!spec?.heal)return 0;return CLEAR[this.tables['14_ITEM_DB']?.get(item)?.[3]]||1;};
P.meal=function(meals,...rest){
 const out=old.meal.call(this,meals,...rest);
 for(const m of out?.meals||[]){const n=this.foodFatigueClear(m.item);if(!n)continue;const before=this.fatigueStacks(m.owner);if(before){this.setFatigue(m.owner,before-n);m.fatigueCleared=before-this.fatigueStacks(m.owner);}m.fatigueLeft=this.fatigueStacks(m.owner);this.fatigueClamp(m.owner);}
 return out;
};
// An inn stay clears every 피로 of the party it heals.
P.buy=function(id,qty,...rest){
 const row=this.tables['19_SHOP_STOCK_DB']?.get(id),inn=!!row&&row[2]==='SERVICE'&&row[3]==='SERVICE_INN_REST_8H',party=inn?(this.s.party||[]).filter(p=>p.active).map(p=>p.source):[];
 const out=old.buy.call(this,id,qty,...rest);
 if(inn)for(const pid of party){this.setFatigue(pid,0);setHp(this,pid,this.fatigueTrueMax(pid));}
 return out;
};
// A defeat outside the story: back on your feet at 30% of the tired max HP, in the safe town — rest or eat there.
P.recoverParty=function(retreat=false,...rest){
 const out=old.recoverParty.call(this,retreat,...rest);
 if(retreat&&this.s.global.SCREEN_MODE==='LOCATION'&&!this.s.runtime){for(const p of (this.s.party||[]).filter(x=>x.active))setHp(this,p.source,Math.max(1,Math.ceil(this.fatigueMax(p.source)*RECOVER_HP)));if(out&&typeof out==='object')out.hpRatio=RECOVER_HP;}
 return out;
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,f=out.fatigue;
 if(f!==undefined&&(!f||typeof f!=='object'||f.version!==1||!f.stacks||typeof f.stacks!=='object'||Array.isArray(f.stacks)||Object.entries(f.stacks).some(([id,n])=>!(id===PLAYER||out.chars?.[id])||!Number.isInteger(n)||n<1||n>MAX)))fail('FATIGUE_SAVE','비경 피로 기록이 올바르지 않습니다.');
 const b=out.runtime;if(b?.fatigueRevision!==undefined&&b.fatigueRevision!==1)fail('FATIGUE_SAVE','비경 피로 전투 기록이 올바르지 않습니다.');
 for(const a of b?.actors||[])if(a.fatigue!==undefined&&!(Number.isInteger(a.fatigue)&&a.fatigue>=1&&a.fatigue<=MAX))fail('FATIGUE_SAVE','비경 피로 전투 기록이 올바르지 않습니다.');
 return out;
};
P.fatigueVersion=1;
api.fatigueV01648={version:1,perStack:PER,max:MAX,clear:copy(CLEAR),recoverHp:RECOVER_HP};
})(globalThis);
