/* v0.14.4 field boss limits. Field bosses keep one difficulty; they only get the same small offset that other
 * enemies get for the formation bonuses (runtime_formations.js), and farming is limited.
 * v0.14.8: one real-time rule replaces the in-game ones. All field bosses together can be defeated three times in
 * every 12 real hours (Korean time 00:00-12:00 and 12:00-24:00; the server's action clock decides online), and a
 * boss no longer waits an in-game day before it returns. Defeats never count.
 * Load after runtime_field_bosses.js and runtime_formations.js. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,FB=api.fieldBosses,copy=x=>JSON.parse(JSON.stringify(x)),fail=(c,m)=>{throw new api.RuleError(c,m);};
if(!FB)throw Error('runtime_field_bosses.js must be loaded first');
const old=Object.fromEntries(['placeBossReason','startBattle','finishBattle','validateSave','fieldBossRouteInfo','fbSummon'].map(k=>[k,P[k]]));
const OFFSET={hp:1.1,atk:1.08},DAILY=3,HALF=12*3600000,KST=9*3600000;
api.fieldBossLimits={dailyLimit:DAILY,windowHours:12,offset:copy(OFFSET)};
const bossOfRoute=route=>Object.keys(FB.bosses).find(b=>FB.route(b)===route)||null;
P.fieldBossRealNow=function(){return Number(this.actionStartedAt??Date.now());};
P.fieldBossWindow=function(now=this.fieldBossRealNow()){return Math.floor((now+KST)/HALF);};
P.fieldBossDaily=function(){
 const now=this.fieldBossRealNow(),w=this.fieldBossWindow(now),d=this.s.fieldBossWindow,wins=d?.window===w?d.wins:0;
 const resetAt=w%2===0?'12:00':'00:00',left=Math.max(1,Math.ceil(((w+1)*HALF-KST-now)/60000));
 return {window:w,wins,limit:DAILY,left:Math.max(0,DAILY-wins),resetAt,minutesLeft:left,
  reason:wins>=DAILY?'필드 보스는 모두 합쳐 12시간마다 '+DAILY+'번까지 토벌할 수 있습니다(현실 시간, 한국 시간 0시·12시 초기화). 이번 토벌 '+wins+'/'+DAILY+' · '+Math.floor(left/60)+'시간 '+(left%60)+'분 뒤('+resetAt+') 다시 도전할 수 있습니다.':''};
};
// A boss no longer has its own in-game return time; the 12-hour count is the only limit.
P.fieldBossCooldown=function(){return {left:0,reason:''};};
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
 if(f&&victory&&!noRewards){const w=this.fieldBossWindow(),d=this.s.fieldBossWindow;this.s.fieldBossWindow={window:w,wins:(d?.window===w?d.wins:0)+1};}
 return result;
};
P.fieldBossRouteInfo=function(route){const info=old.fieldBossRouteInfo.call(this,route);if(info)info.daily=this.fieldBossDaily();return info;};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,d=out.fieldBossDaily,w=out.fieldBossWindow;
 // fieldBossDaily is the record of the old in-game rule; it is kept as it was and no longer read.
 if(d!==undefined&&(!d||typeof d!=='object'||!Number.isSafeInteger(d.day)||d.day<1||!Number.isInteger(d.wins)||d.wins<0))fail('FIELD_BOSS_SAVE','필드 보스 하루 토벌 기록이 올바르지 않습니다.');
 if(w!==undefined&&(!w||typeof w!=='object'||!Number.isSafeInteger(w.window)||w.window<0||!Number.isInteger(w.wins)||w.wins<0))fail('FIELD_BOSS_SAVE','필드 보스 12시간 토벌 기록이 올바르지 않습니다.');
 return out;
};
})(globalThis);
