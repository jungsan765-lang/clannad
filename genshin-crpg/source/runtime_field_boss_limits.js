/* v0.14.4 field boss limits. Field bosses keep one difficulty; they only get the same small offset that other
 * enemies get for the formation bonuses (runtime_formations.js), and farming is limited: each boss still returns
 * 24 in-game hours after a victory, and all field bosses together can be defeated three times per in-game day.
 * Defeats never count. Load after runtime_field_bosses.js and runtime_formations.js. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,FB=api.fieldBosses,copy=x=>JSON.parse(JSON.stringify(x)),fail=(c,m)=>{throw new api.RuleError(c,m);};
if(!FB)throw Error('runtime_field_bosses.js must be loaded first');
const old=Object.fromEntries(['placeBossReason','startBattle','finishBattle','validateSave','fieldBossRouteInfo','fbSummon'].map(k=>[k,P[k]]));
const OFFSET={hp:1.1,atk:1.08},DAILY=3;
api.fieldBossLimits={dailyLimit:DAILY,offset:copy(OFFSET)};
const bossOfRoute=route=>Object.keys(FB.bosses).find(b=>FB.route(b)===route)||null;
P.fieldBossDaily=function(){
 const day=Number(this.s.global.WORLD_DAY)||1,d=this.s.fieldBossDaily,wins=d?.day===day?d.wins:0;
 return {day,wins,limit:DAILY,left:Math.max(0,DAILY-wins),reason:wins>=DAILY?'필드 보스는 모두 합쳐 게임 내 하루에 '+DAILY+'번까지 토벌할 수 있습니다. 오늘 토벌 '+wins+'/'+DAILY+' · '+(day+1)+'일차 00:00부터 다시 도전할 수 있습니다.':''};
};
P.placeBossReason=function(id,entry,options={}){
 const base=old.placeBossReason.call(this,id,entry,options);if(base||options.continuing||!bossOfRoute(id))return base;
 return this.fieldBossDaily().reason;
};
const grow=a=>{a.maxHp=Math.max(1,Math.round(a.maxHp*OFFSET.hp));a.hp=a.maxHp;for(const s of a.shields||[])if(Number.isFinite(s.value)){s.value=Math.round(s.value*OFFSET.hp);if(Number.isFinite(s.initialValue))s.initialValue=Math.round(s.initialValue*OFFSET.hp);}};
P.startBattle=function(...args){
 const before=this.s.runtime,out=old.startBattle.apply(this,args),b=this.s.runtime;
 if(!b||b===before||!b.fieldBoss||b.fieldBoss.offset)return out;
 b.fieldBoss.offset=1;
 // The boss and the forms called while the battle was being set up (their attack was taken from the unscaled boss).
 for(const a of b.actors.filter(x=>x.fb||x.fbSummon)){grow(a);a.atk=Math.round(a.atk*OFFSET.atk);}
 return out;
};
// Later forms: fixed-HP forms get the offset; prisms and pillars take a share of the (already scaled) boss.
P.fbSummon=function(b,boss,id,extra={}){
 const a=old.fbSummon.call(this,b,boss,id,extra);
 if(b?.fieldBoss?.offset&&!(FB.summons[id]?.hp<=1))grow(a);
 return a;
};
P.finishBattle=function(victory){
 const b=this.s.runtime,f=b?.fieldBoss,noRewards=!!b?.storyConfig?.noRewards,result=old.finishBattle.call(this,victory);
 if(f&&victory&&!noRewards){const day=Number(this.s.global.WORLD_DAY)||1,d=this.s.fieldBossDaily;this.s.fieldBossDaily={day,wins:(d?.day===day?d.wins:0)+1};}
 return result;
};
P.fieldBossRouteInfo=function(route){const info=old.fieldBossRouteInfo.call(this,route);if(info)info.daily=this.fieldBossDaily();return info;};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,d=out.fieldBossDaily;
 if(d!==undefined&&(!d||typeof d!=='object'||!Number.isSafeInteger(d.day)||d.day<1||!Number.isInteger(d.wins)||d.wins<0))fail('FIELD_BOSS_SAVE','필드 보스 하루 토벌 기록이 올바르지 않습니다.');
 return out;
};
})(globalThis);
