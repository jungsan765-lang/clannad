'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {loadEnvironment,setup}=require('../tools/audit_food_lodging_v01617.cjs');
const root=path.resolve(__dirname,'..'),e=loadEnvironment(root),copy=x=>JSON.parse(JSON.stringify(x));
function guild(r){if(r.s.placeVisit)r.action('PLACE_LEAVE');r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});}
const r=setup(e,{levels:60});guild(r);r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_01'});r.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_01'});delete r.s.tasks;r.taskView();
assert(!r.s.tasks.weeklyIds.includes('W_V168_ABYSS'),'new assignments exclude the recurring Abyss quota');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/weekly_assignment_v01620.json'),'utf8'));
r.s.tasks=copy(fixture.tasks);const old=copy(r.s.tasks),mora=r.s.global.MORA,primo=r.s.global.PRIMOGEM;
let loaded=new e.R(e.db,copy(r.s));loaded.taskView();assert.deepEqual(copy(loaded.s.tasks),old,'current-period quota/reward/progress/claims stay exact');assert.equal(loaded.s.global.MORA,mora);assert.equal(loaded.s.global.PRIMOGEM,primo);assert.equal(loaded.taskView().weeklyBonus.goal,old.weeklyIds.length-1,'old Abyss goal is optional for all-clear');
loaded.action('WAIT',{minutes:1440});loaded.taskView();assert(loaded.s.tasks.weeklyIds.includes('W_V168_ABYSS'),'world-day waiting cannot reroll the real weekly manifest');
e.advance(7*86400000);const v=loaded.taskView();assert(!loaded.s.tasks.weeklyIds.includes('W_V168_ABYSS'));assert.equal(v.bonus.reward.primogem,20);assert.equal(v.weeklyBonus.reward.primogem,200);
assert.equal(v.weeklyBonus.goal,loaded.s.tasks.weeklyIds.length,'all-clear denominator uses the new eligible manifest');
for(const id of ['W_WIN','W_BOSS','W_DOMAIN','W_V168_TALENT30','W_V168_ASCENSION','W_V168_WEALTH','W_V168_LIFE_SUPPLY'])assert(loaded.s.tasks.weeklyIds.includes(id),id+' remains assigned');
const saved=loaded.serialize();loaded=new e.R(e.db,JSON.parse(saved));assert.equal(loaded.serialize(),saved,'new plan reloads exactly');
assert(e.c.CRPGRuntime.tasksV0169.chains.some(x=>x.kind==='abyss'),'finite Abyss commissions remain');
console.log(JSON.stringify({ok:true,checks:10,oldGoals:old.weeklyIds.length,newGoals:loaded.s.tasks.weeklyIds.length}));
