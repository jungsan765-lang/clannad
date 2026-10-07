/* 0.16.7 일일 · 주간 임무 (user, 2026-10-07: 「캐서린 임무들도 슬슬 바꿀 때가 됐어. 일퀘 주간퀘를 나눠서 할 일을 만드는게 좋아보여.
 * 게임을 들어가면 뭘 해야될지 고민하게 되는게 문제라서.」).
 * A board of small aims that renews itself: four for the day (Korean midnight) and four for the week (Monday midnight),
 * each counted from what the player does anyway — battles won, a ley line, a domain, gathering, field bosses — and paid
 * when taken with TASK_CLAIM {task: id | 'ALL'}. The day's four together pay a bonus; five such bonuses in a week pay
 * the week's last aim. Catherine's one-time commissions stay as they were.
 * The counters live in s.tasks {version:1, day, week, daily:{kind:n}, weekly:{kind:n}, claimed:{id:1}}; a new day or
 * week starts them from zero. Load after the other runtime modules (it wraps finishBattle and apply). */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.tasksV0167)return;P.tasksV0167=true;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x)),num=x=>Number(x)||0;
const KST=9*3600000,DAY=86400000,WEEK=7*DAY,dayOf=t=>Math.floor((t+KST)/DAY),weekOf=t=>Math.floor((t+KST+3*DAY)/WEEK);
const BOOK2='MAT_CHAR_EXP_ADVENTURER',BOOK3='MAT_CHAR_EXP_HERO';
// kind: what is counted · goal · reward {mora, primogem, items}
const DAILY=[
 {id:'D_WIN',kind:'win',goal:3,name:'전투 3번 이기기',short:'3번 이기기',icon:'battle',reward:{items:{[BOOK2]:2}}},
 {id:'D_LEY',kind:'ley',goal:1,name:'지맥의 꽃 1번',short:'꽃 1번',icon:'ley',reward:{mora:800}},
 {id:'D_DOMAIN',kind:'domain',goal:1,name:'비경 1번 이기기',short:'1번 이기기',icon:'domain',reward:{items:{[BOOK2]:2}}},
 {id:'D_LIFE',kind:'life',goal:2,name:'채집·채광·사냥·낚시 2번',short:'2번',icon:'life',reward:{mora:600}}
];
// (user: 「모두 달성란은 캐서린한테 보고할 수 있게 하는게 좋을 것 같네.」) The day's bonus is taken at Catherine's desk.
const DAILY_BONUS={id:'D_BONUS',name:'오늘의 임무 모두 달성',short:'모두 달성',icon:'bonus',reward:{primogem:20},report:true};
const WEEKLY=[
 {id:'W_WIN',kind:'win',goal:25,name:'전투 25번 이기기',icon:'battle',reward:{items:{[BOOK3]:2}}},
 {id:'W_BOSS',kind:'boss',goal:3,name:'필드 보스 3번 토벌',icon:'boss',reward:{primogem:30},minLevel:15},
 {id:'W_DOMAIN',kind:'domain',goal:8,name:'비경 8번 이기기',icon:'domain',reward:{items:{[BOOK3]:3}}},
 {id:'W_BONUS',kind:'bonus',goal:5,name:'오늘의 임무 보너스 5번',icon:'bonus',reward:{primogem:40,mora:3000}}
];
const ALL=[...DAILY,DAILY_BONUS,...WEEKLY],BY=Object.fromEntries(ALL.map(t=>[t.id,t]));
const old=Object.fromEntries(['apply','actionReason','validateSave','finishBattle'].map(k=>[k,P[k]]));
P.tasksNow=function(){return num(this.actionStartedAt??Date.now())||Date.now();};
// The board as of now: a new day or week starts its counters (and its claims) from zero.
P.tasksBox=function(write=false){
 const t=this.tasksNow(),day=dayOf(t),week=weekOf(t),b=this.s.tasks;
 let box=b&&b.version===1?b:{version:1,day,week,daily:{},weekly:{},claimed:{}};
 if(box.day!==day||box.week!==week){box=copy(box);if(box.day!==day){box.day=day;box.daily={};for(const id of Object.keys(box.claimed))if(id.startsWith('D_'))delete box.claimed[id];}
  if(box.week!==week){box.week=week;box.weekly={};for(const id of Object.keys(box.claimed))if(id.startsWith('W_'))delete box.claimed[id];}}
 if(write)this.s.tasks=box;return box;
};
P.tasksCount=function(kind,n=1){if(!kind||n<=0)return;const box=this.tasksBox(true);box.daily[kind]=num(box.daily[kind])+n;box.weekly[kind]=num(box.weekly[kind])+n;};
function lockOf(rt,t){
 const lv=num(rt.s.global.PLAYER_LEVEL_STATE)||1;
 if(t.kind==='ley'){let st=null;try{st=rt.leyLineStatus?.();}catch{}if(st&&!st.unlocked)return '주인공 Lv.'+st.minLevel+'부터';}
 if(t.minLevel&&lv<t.minLevel)return '주인공 Lv.'+t.minLevel+'부터';
 return '';
}
P.taskView=function(){
 const box=this.tasksBox(false),guild=!!this.atGuild?.(),row=(t,have,scope)=>{const lock=lockOf(this,t),goal=t.goal||1,progress=Math.min(goal,num(have)),done=!lock&&progress>=goal,claimed=!!box.claimed[t.id];
  return {id:t.id,scope,name:t.name,short:t.short||t.name,icon:t.icon,goal,progress,done,claimed,lock,report:!!t.report,here:done&&!claimed&&(!t.report||guild),reward:copy(t.reward)};};
 const daily=DAILY.map(t=>row(t,box.daily[t.kind],'daily')),open=daily.filter(x=>!x.lock);
 const bonus=row({...DAILY_BONUS,goal:open.length||1},open.filter(x=>x.done).length,'daily');
 const weekly=WEEKLY.map(t=>row(t,t.kind==='bonus'?box.weekly.bonus:box.weekly[t.kind],'weekly'));
 const all=[...daily,bonus,...weekly],ready=all.filter(x=>x.done&&!x.claimed);
 // ready: finished and not taken (the badges); here: what can be taken where the player stands (「모두 받기」).
 const t=this.tasksNow();return {daily,bonus,weekly,ready:ready.length,here:all.filter(x=>x.here).length,atGuild:guild,dayEndsAt:(dayOf(t)+1)*DAY-KST,weekEndsAt:(weekOf(t)+1)*WEEK-KST-3*DAY};
};
const REPORT='캐서린에게 보고해야 받을 수 있습니다.';
P.taskReason=function(id){
 if(this.s.runtime)return '전투가 끝난 뒤 받을 수 있습니다.';
 const v=this.taskView(),list=[...v.daily,v.bonus,...v.weekly];
 if(id==='ALL')return list.some(x=>x.here)?'':list.some(x=>x.done&&!x.claimed)?REPORT:'받을 임무 보상이 없습니다.';
 const x=list.find(x=>x.id===id);if(!x)return '임무를 찾을 수 없습니다.';if(x.claimed)return '이미 받은 보상입니다.';if(x.lock)return x.lock+' 할 수 있습니다.';if(!x.done)return '아직 달성하지 않았습니다 ('+x.progress+'/'+x.goal+').';if(!x.here)return REPORT;return '';
};
P.taskClaim=function(id){
 const why=this.taskReason(id);if(why)fail('TASK',why);
 const v=this.taskView(),list=[...v.daily,v.bonus,...v.weekly],targets=id==='ALL'?list.filter(x=>x.here):list.filter(x=>x.id===id);
 const box=this.tasksBox(true),g=this.s.global,got={mora:0,primogem:0,items:{}};
 for(const x of targets){box.claimed[x.id]=1;const r=BY[x.id].reward||{};
  if(r.mora){g.MORA=num(g.MORA)+r.mora;got.mora+=r.mora;}if(r.primogem){g.PRIMOGEM=num(g.PRIMOGEM)+r.primogem;got.primogem+=r.primogem;}
  for(const [item,n] of Object.entries(r.items||{})){this.giveItem(item,n);got.items[item]=(got.items[item]||0)+n;}
  // The day's bonus counts toward the week's last aim.
  if(x.id==='D_BONUS')box.weekly.bonus=num(box.weekly.bonus)+1;}
 return {claimed:targets.map(x=>x.id),names:targets.map(x=>x.name),...got};
};
P.actionReason=function(type,a={}){if(type==='TASK_CLAIM')return this.taskReason(String(a.task||''));return old.actionReason.call(this,type,a);};
// What is counted, from the battle that just ended and from the actions that do it.
P.finishBattle=function(victory){
 const b=this.s.runtime,kind=b?{ley:!!b.leyLine,domain:!!b.growthDomain,boss:!!b.fieldBoss,coop:!!b.coop}:null,out=old.finishBattle.call(this,victory);
 try{if(victory&&kind){this.tasksCount('win');if(kind.ley)this.tasksCount('ley');if(kind.domain)this.tasksCount('domain');if(kind.boss)this.tasksCount('boss');}}catch{}
 return out;
};
P.apply=function(a){
 if(a?.type==='TASK_CLAIM')return this.taskClaim(String(a.task||''));
 const out=old.apply.call(this,a);
 try{if(a?.type==='LIFE_FINISH'&&out&&!out.empty&&['GATHER','MINE','FISH','HUNT'].includes(out.kind))this.tasksCount('life');}catch{}
 return out;
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,t=out.tasks;
 if(t!==undefined){const ok=n=>Number.isInteger(n)&&n>=0,bad=()=>fail('TASK_SAVE','임무 기록이 올바르지 않습니다.');
  if(!t||t.version!==1||!ok(t.day)||!ok(t.week)||!t.daily||!t.weekly||!t.claimed||typeof t.daily!=='object'||typeof t.weekly!=='object'||typeof t.claimed!=='object')bad();
  for(const n of [...Object.values(t.daily),...Object.values(t.weekly)])if(!ok(n))bad();for(const [k,v] of Object.entries(t.claimed))if(!BY[k]||v!==1)bad();}
 return out;
};
api.tasksV0167={daily:copy(DAILY),bonus:copy(DAILY_BONUS),weekly:copy(WEEKLY),dayOf,weekOf};
})(globalThis);
