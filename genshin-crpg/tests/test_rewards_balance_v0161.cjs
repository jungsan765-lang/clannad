'use strict';
const assert=require('node:assert/strict');
const {fresh,c,R,db,advance}=require('./helpers_v011.cjs');
const {flags}=require('../tools/audit_balance_v01522.cjs');
const api=c.CRPGRuntime,cp=x=>JSON.parse(JSON.stringify(x));
let count=0;function check(name,fn){fn();count++;console.log('PASS '+name);}
function ready(map){const r=fresh(map);r.adminApply({op:'level',target:'ALL',value:60});flags(r);r.s.domainDaily={day:api.growthV01522.dayOf(r.leyLineNow()),wins:3};return r;}
// Only settlement tests force enemies to zero HP; difficulty tests use native combat in audit_balance_v0161.
function settle(r){for(const a of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))a.hp=0;return r.finishBattle(true);}
// Current EXP has its own increasing table; the earlier material XP table is retained independently. No Mora.
// 0.16.3: the three kinds stand at different places (태산부 · 천둥 연산 밀궁 · 암중협곡 at Lv60).
check('Lv60 material domains retain their XP and EXP domains pay their current XP, no Mora or books',()=>{
 for(const [map,id,element,xp]of [['MAP_D163_TAISHAN_MANSION','TAISHAN_MANSION:60','NEUTRAL',1600],['MAP_D163_LIANSHAN_FORMULA','LIANSHAN_FORMULA:60','NEUTRAL',1600],['MAP_D163_LIANSHAN_FORMULA','LIANSHAN_FORMULA:60','PYRO',1600],['MAP_CHASM_DEEP','LOST_VALLEY:60','NEUTRAL',10000]]){
  const r=ready(map);r.action('DOMAIN_START',{domain:id,element});const x=settle(r);
  assert.equal(x.xp,xp,id);assert.equal(x.mora,0,id);for(const book of Object.keys(api.leyLines.bookXp))assert.equal(x.loot[book]||0,0);
  if(id.startsWith('LOST_VALLEY'))assert.equal(Object.keys(x.domain.items).length,0);
  const state=r.serialize();r.finishBattle(true);assert.equal(r.serialize(),state,'duplicate settlement cannot pay');
 }
});
check('daily first-three bonus doubles materials only; the experience domain neither doubles nor uses one of the three',()=>{
 const r=ready('MAP_D163_FORSAKEN_RIFT');delete r.s.domainDaily;r.action('DOMAIN_START',{domain:'FORSAKEN_RIFT:5'});const x=settle(r);
 assert.equal(x.xp,40);assert.equal(x.mora,0);assert.equal(x.domain.items.GROWTH_TALENT_MOND,2);assert.equal(r.s.domainDaily.wins,1);
 r.s.global.SCREEN_MODE='LOCATION';r.s.global.CURRENT_MAP_ID='MAP_D163_MIDSUMMER_COURTYARD';r.action('DOMAIN_START',{domain:'MIDSUMMER_COURTYARD:5'});const y=settle(r);
 assert.equal(y.xp,200);assert.equal(y.mora,0);assert.equal(Object.keys(y.domain.items).length,0);assert.equal(y.domain.bonus,false);assert.equal(r.s.domainDaily.wins,1);
});
check('upper masks drop in domains at their authored probability and unknown conditions stay denied',()=>{
 for(const [roll,stained,ominous]of [[1,true,true],[50,true,false],[51,false,false]]){
  const r=ready('MAP_D163_FORSAKEN_RIFT');r.action('DOMAIN_START',{domain:'FORSAKEN_RIFT:15'});r.die=()=>roll;const x=settle(r);
  assert.equal((x.loot.MAT_STAINED_MASK||0)>0,stained);assert.equal((x.loot.MAT_OMINOUS_MASK||0)>0,ominous);
 }
 const r=ready('MAP_D163_FORSAKEN_RIFT');r.action('DOMAIN_START',{domain:'FORSAKEN_RIFT:15'});const b=r.s.runtime,a=b.actors.find(x=>x.source==='MON_HILI_FIGHTER');
 assert(!r.mondLootConditionAllowed(b,a,['LT_HILICHURL',null,'MAT_OMINOUS_MASK',1,1,100,'unrecognised condition']));
 assert(!r.mondLootConditionAllowed({...b,storyConfig:{noRewards:true}},a,['LT_HILICHURL',null,'MAT_OMINOUS_MASK',1,1,100,'일반 츄츄족 매우 희귀']));
});
check('elemental small and large slimes supply their own matched material rows in a domain',()=>{
 const r=ready('MAP_D163_CECILIA_GARDEN');r.action('DOMAIN_START',{domain:'CECILIA_GARDEN:25',element:'HYDRO'});r.die=()=>1;const x=settle(r);
 for(const id of ['MAT_SLIME_CONDENSATE','MAT_SLIME_SECRETIONS','MAT_SLIME_CONCENTRATE'])assert(x.loot[id]>0,id);
});
check('the same level-selected ley difficulties and payouts exist in both regions',()=>{
 assert.deepEqual(cp(api.leyLines.regionalTiers('몬드')),cp(api.leyLines.regionalTiers('리월')));
 assert.deepEqual(cp(api.leyLines.tiers.map(x=>x.level)),[6,15,30,45,60]);
});
function ley(r,kind,tier){const map=r.s.global.CURRENT_MAP_ID;let hour=r.leyLineHour();while(!api.leyLines.sitesAt(hour).some(s=>s.map===map&&s.kind===kind))hour++;
 const at=hour*3600000+60000;advance(Math.max(0,at-c.Date.now()));r.actionStartedAt=at;const route=api.leyLines.route(kind,map);r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});r.action('BOSS_ROUTE',{route,entry:'DIRECT',tier});return {hour,route};}
check('ley settlement uses its low direct-XP plan, books/Mora dominate, and claims cannot be repeated',()=>{
 for(const kind of ['REVELATION','WEALTH']){
  let r=ready('MAP_MOND_PLAINS');const {hour,route}=ley(r,kind,5),expected=cp(r.s.runtime.mondBalance.rewards);
  assert.equal(r.s.runtime.leyLine.level,60);assert.deepEqual(cp(r.mondRewardPlan(r.s.runtime)),expected);r=new R(db,cp(r.s));r.actionStartedAt=hour*3600000+60000;
  const x=settle(r);assert.equal(x.xp,expected.xp);assert.equal(r.s.leyLine[kind],hour);
  assert.equal(x.xp,400);assert.equal(expected.mora,0);
  if(kind==='REVELATION'){assert.equal(x.loot.MAT_CHAR_EXP_HERO,180);assert(180000>4*10000);assert.equal(x.mora,0);}
  else {assert.equal(x.mora,40000);assert.equal(x.loot.MAT_CHAR_EXP_HERO||0,0);}
  assert(r.placeBossReason(route,r.placeEntries().find(e=>e.route===route)));const state=r.serialize();r.finishBattle(true);assert.equal(r.serialize(),state);
 }
});
check('old in-flight ley battles retain old regional level and book reward, then new entries use v2',()=>{
 let r=ready('MAP_MOND_PLAINS');const {hour}=ley(r,'REVELATION',5),s=cp(r.s);s.runtime.leyLine.version=1;s.runtime.leyLine.level=28;
 for(const a of s.runtime.actors.filter(a=>a.side==='ENEMY'))a.level=28;
 r=new R(db,s);r.actionStartedAt=hour*3600000+60000;assert.equal(settle(r).loot.MAT_CHAR_EXP_HERO,10);
 const bad=cp(s);bad.runtime.leyLine.level=60;assert.throws(()=>new R(db,bad),/지맥의 꽃 전투 기록/);
});
check('enemy level, bodies and stats stay fixed for one, two and four characters of different levels',()=>{
 const all=[];for(const level of [1,30,60])for(const n of [1,2,4]){
  const r=ready('MAP_MOND_PLAINS');r.adminApply({op:'level',target:'ALL',value:level});
  for(const [i,id]of ['MOND_AMBER','MOND_KAEYA','MOND_NOELLE'].slice(0,n-1).entries()){r.adminApply({op:'recruit',char:id});r.action('PARTY',{char:id,slot:i+2});}
  Object.assign(r.s.global,{SAVE_ID:'V0161_FIXED_FOUR',LAST_COMMITTED_ACTION_SEQ:0,PRNG_STATE:714});r.startBattle('EG_MOND_HILI_PATROL','RANDOM');
  all.push(cp(r.s.runtime.actors.filter(a=>a.side==='ENEMY').map(a=>[a.source,a.level,a.maxHp,a.atk,a.def])));
 }
 for(const row of all)assert.deepEqual(row,all[0]);assert.equal(api.growthV01522.partyBaseline,4);
});
check('enemies waiting behind the eight slots already carry the same regional level and stats',()=>{
 const r=ready('MAP_LIYUE_MOUNTAINS'),group='EG_V0161_RESERVE';
 const row=r.row('33_ENCOUNTER_GROUP_DB','EG_LIYUE_VISHAP').slice();row[0]=group;
 r.db={...r.db,'33_ENCOUNTER_GROUP_DB':[...r.db['33_ENCOUNTER_GROUP_DB'],row],
  '49_ENCOUNTER_MEMBER_DB':[...r.db['49_ENCOUNTER_MEMBER_DB'],['EM_'+group,group,1,'MON_HILI_FIGHTER',12,12,'MON1','TEST','synthetic reserve encounter']]};
 for(const key of ['33_ENCOUNTER_GROUP_DB','49_ENCOUNTER_MEMBER_DB'])r.tables[key]=new Map(r.db[key].slice(1).map(x=>[x[0],x]));
 r.startBattle(group,'EXPLICIT');const b=r.s.runtime,active=b.actors.filter(a=>a.side==='ENEMY');
 assert.equal(active.length,8);assert.equal(b.enemyReserve.length,4);
 const stats=a=>[a.source,a.level,a.maxHp,a.atk,a.def];
 for(const a of [...active,...b.enemyReserve])assert.deepEqual(stats(a),stats(active[0]));
 assert.equal(active[0].level,42);const saved=new R(r.db,cp(r.s));assert.equal(saved.s.runtime.enemyReserve.length,4);
});
console.log(JSON.stringify({total:count,passed:count}));
