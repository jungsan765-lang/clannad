'use strict';
// 0.16.69: daily/weekly Mora and 부의 꽃 sized together to what growth costs (docs/PATCH_0.16.69_KO.md), task Primogems ×2.
// A board or a blossom fight that started before keeps what it was given.
const assert=require('node:assert/strict');
const {fresh:baseFresh,R,db,c,advance}=require('./helpers_v011.cjs');
const {flags}=require('../tools/audit_balance_v01522.cjs');
const api=c.CRPGRuntime,cp=x=>JSON.parse(JSON.stringify(x)),DAY=86400000,T=api.tasksV01612,C=c.CRPGTaskCatalogV0168,L=api.leyLines;
let passed=0;function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
function leave(r){if(r.s.placeVisit)r.action('PLACE_LEAVE');}
function guild(r){leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});}
function board(level){const r=baseFresh(),map=r.s.global.CURRENT_MAP_ID;guild(r);r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_01'});r.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_01'});leave(r);r.s.global.CURRENT_MAP_ID=map;r.adminApply({op:'level',target:'ALL',value:level});delete r.s.tasks;r.tasksBox(true);return r;}
const LEVELS=[1,10,20,30,40,50,60],base=id=>[...T.daily,...T.weekly].find(t=>t.id===id);
const sum=(r,scope,key='mora')=>r.s.tasks[scope+'Ids'].reduce((n,id)=>n+(r.s.tasks[scope+'Definitions'][id].reward[key]||0),0);
// The top 부의 꽃 a level can enter (minLevel 5/10/25/40/55).
const blossom=level=>[...L.tiers].reverse().find(t=>level>=t.minLevel)?.mora||0;

check('부의 꽃: new fights are version 4 and pay 2,500/4,500/10,500/26,000/37,000',()=>{
 assert.equal(L.version,4);assert.deepEqual(cp(L.tiers.map(t=>t.mora)),[2500,4500,10500,26000,37000]);assert.deepEqual(cp(L.tiers.map(t=>t.level)),[6,15,30,45,60]);
 assert.deepEqual(cp(L.tiers.map(t=>t.books.MAT_CHAR_EXP_HERO)),[12,36,100,200,360],'계시의 꽃 books are unchanged');
});

function ready(map){const r=baseFresh(map);r.adminApply({op:'level',target:'ALL',value:60});flags(r);r.s.domainDaily={day:api.growthV01522.dayOf(r.leyLineNow()),wins:3};return r;}
function settle(r){for(const a of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))a.hp=0;return r.finishBattle(true);}
function ley(r,kind,tier){const map=r.s.global.CURRENT_MAP_ID;let hour=r.leyLineHour();while(!L.sitesAt(hour).some(s=>s.map===map&&s.kind===kind))hour++;
 const at=hour*3600000+60000;advance(Math.max(0,at-c.Date.now()));r.actionStartedAt=at;const route=L.route(kind,map);r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});r.action('BOSS_ROUTE',{route,entry:'DIRECT',tier});return {hour,route};}
check('부의 꽃: a version 3 fight already started still pays its 80,000; a new one pays 37,000 and reloads',()=>{
 let r=ready('MAP_MOND_PLAINS');const {hour}=ley(r,'WEALTH',5);assert.equal(r.s.runtime.leyLine.version,4);
 const old=cp(r.s);old.runtime.leyLine.version=3;
 const now=new R(db,cp(r.s));now.actionStartedAt=hour*3600000+60000;assert.equal(settle(now).mora,37000);new R(db,cp(now.s));
 const before=new R(db,old);before.actionStartedAt=hour*3600000+60000;assert.equal(settle(before).mora,80000,'the fight entered before 0.16.69');
 const bad=cp(r.s);bad.runtime.leyLine.version=5;assert.throws(()=>new R(db,bad),/지맥의 꽃 전투 기록/);
});

check('새 임무판: each definition carries rewardRevision 1 and the new Mora; Primogems ×2; bonuses 40 and 400',()=>{
 const r=board(60),box=r.s.tasks;assert.equal(box.dailyRewardRevision,1);assert.equal(box.weeklyRewardRevision,1);
 for(const scope of ['daily','weekly'])for(const id of box[scope+'Ids']){const d=box[scope+'Definitions'][id],b=base(id);if(!C.rewardV01669[id])continue;
  assert.equal(d.rewardRevision,1,id);assert.equal(d.reward.mora,C.rewardV01669[id].moraByLevel.at(-1).mora,id);
  assert.equal(d.reward.primogem||0,2*(b.reward.primogem||0),id+' Primogems ×2');
  assert.deepEqual(d.reward.items||{},b.reward.items||{},id+' keeps its books');}
 const v=r.taskView();assert.equal(v.bonus.reward.primogem,40);assert.equal(v.weeklyBonus.reward.primogem,400);
 assert.equal(C.notes.dailyPrimogems,40);assert.equal(C.notes.weeklyAllPrimogems,400);new R(db,cp(r.s));
});

check('이미 받은 임무판: a day/week assigned before keeps its rewards, also for goals that open later in it',()=>{
 const r=board(60),box=r.s.tasks;
 // As 0.16.68 assigned it: no reward revision, the catalog's own brackets.
 for(const scope of ['daily','weekly']){delete box[scope+'RewardRevision'];for(const id of box[scope+'Ids']){const d=box[scope+'Definitions'][id];delete d.rewardRevision;d.reward=T.rewardAt(base(id),d.assignedLevel);}}
 const s=cp(r.s),old=new R(db,s),v=old.taskView();
 for(const row of [...v.daily,...v.weekly])assert.equal(row.reward.mora||0,T.rewardAt(base(row.id),60).mora||0,row.id);
 assert.equal(old.s.tasks.weeklyDefinitions.W_V168_WEALTH.reward.mora,45000,'0.16.68 Lv60 「부의 꽃 10번」');
 // A board that opens later in that same day/week (the first report comes after) takes the period's own table.
 const q=baseFresh(),map=q.s.global.CURRENT_MAP_ID;q.adminApply({op:'level',target:'ALL',value:60});delete q.s.tasks;q.tasksBox(true);
 assert.deepEqual(cp(q.s.tasks.weeklyIds),[]);delete q.s.tasks.dailyRewardRevision;delete q.s.tasks.weeklyRewardRevision;
 const late=new R(db,cp(q.s));guild(late);late.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_01'});late.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_01'});leave(late);late.s.global.CURRENT_MAP_ID=map;late.tasksBox(true);
 assert(late.s.tasks.weeklyIds.length>0);for(const id of late.s.tasks.weeklyIds){const d=late.s.tasks.weeklyDefinitions[id];assert.equal(d.rewardRevision,undefined,id);assert.equal(d.reward.mora||0,T.rewardAt(base(id),60).mora||0,id);}
 new R(db,cp(late.s));
 // The next day is assigned from the new table.
 advance(DAY);const next=new R(db,cp(s));next.tasksBox(true);assert.equal(next.s.tasks.dailyRewardRevision,1);assert.equal(next.s.tasks.dailyDefinitions[next.s.tasks.dailyIds[0]].rewardRevision,1);
 if(next.s.tasks.week===s.tasks.week)assert.equal(next.s.tasks.weeklyRewardRevision,undefined,'the week is still the old one');
});

check('the save rejects a mixed or made-up reward table',()=>{
 const r=board(40),s=cp(r.s);
 const a=cp(s);a.tasks.dailyRewardRevision=2;assert.throws(()=>new R(db,a),/임무 기록/);
 const b=cp(s);delete b.tasks.weeklyRewardRevision;assert.throws(()=>new R(db,b),/임무 기록/,'new definitions in a period marked old');
 const d=cp(s),id=d.tasks.dailyIds[0];d.tasks.dailyDefinitions[id].reward.mora*=3;assert.throws(()=>new R(db,d),/임무 기록/);
});

check('부의 꽃 and the tasks fit together at every level',()=>{
 for(const level of LEVELS){const r=board(level),day=sum(r,'daily'),week=sum(r,'weekly'),flower=blossom(level),full=day+2*flower+week/7;
  if(flower){assert(flower<day,'Lv'+level+': one blossom pays less than the whole daily board');
   const share=2*flower/full;assert(share>=.2&&share<=.5,'Lv'+level+': two blossoms are '+Math.round(share*100)+'% of a day');}
  const w=r.s.tasks.weeklyDefinitions.W_V168_WEALTH;if(w&&flower)assert(w.reward.mora>=flower*.5&&w.reward.mora<=flower*1.5,'Lv'+level+': 「부의 꽃 10번」 is about one blossom ('+w.reward.mora+')');
  console.log('  Lv'+level+': daily '+day+' · weekly '+week+' · blossom '+flower+' · full day ≈ '+Math.round(full));}
 // The day grows with the level and stays near the growth cost (PATCH_0.16.69 table).
 const full=LEVELS.map(level=>{const r=board(level);return sum(r,'daily')+2*blossom(level)+sum(r,'weekly')/7;});
 for(let i=1;i<full.length;i++)assert(full[i]>full[i-1]);
 assert(full[6]>180000&&full[6]<260000,'Lv60 day '+full[6]);assert(full[3]>40000&&full[3]<70000,'Lv30 day '+full[3]);
});

console.log(passed+' checks');
