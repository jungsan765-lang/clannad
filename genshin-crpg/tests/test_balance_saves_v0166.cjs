'use strict';
const assert=require('node:assert/strict');
const {fresh,R,db,c}=require('./helpers_v011.cjs');
const {measure}=require('../tools/audit_balance_v0161.cjs');
const G=c.CRPGRuntime.growthV01522,cp=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
check('0.16.5 XP migrates once for player, owned companion and bench without changing levels or belongings',()=>{
 const r=fresh();r.wishGrant({kind:'char',id:'MOND_AMBER',rarity:4});r.wishGrant({kind:'char',id:'MOND_BARBARA',rarity:4});r.adminApply({op:'level',target:'ALL',value:37});
 r.s.party=r.s.party.map(p=>p.source==='MOND_BARBARA'?{...p,active:false}:p);
 const old=G.previousPacingCurve[36],s=cp(r.s);s.growthPacingVersion=1;s.global.PLAYER_XP_STATE=Math.floor(old*.63);s.chars.MOND_AMBER.xp=Math.floor(old*.29);s.chars.MOND_BARBARA.xp=Math.floor(old*.71);
 const before=cp(s),x=new R(db,s);assert.equal(x.s.growthPacingVersion,2);assert.equal(x.s.global.PLAYER_LEVEL_STATE,37);
 assert.equal(x.s.global.PLAYER_XP_STATE,Math.floor(before.global.PLAYER_XP_STATE*G.xpNext(37)/old));
 for(const id of ['MOND_AMBER','MOND_BARBARA']){assert.equal(x.s.chars[id].level,37);assert.equal(x.s.chars[id].xp,Math.floor(before.chars[id].xp*G.xpNext(37)/old));}
 assert.deepEqual(cp(x.s.ascensions),before.ascensions);assert.deepEqual(cp(x.s.inventory),before.inventory);assert.deepEqual(cp(x.s.wish),before.wish);
 assert.deepEqual(cp(new R(db,cp(x.s)).s),cp(x.s));
});
check('a prior-curve battle keeps its actors and initiative while only stored XP converts',()=>{
 const r=fresh('MAP_MOND_PLAINS');r.adminApply({op:'level',target:'ALL',value:37});r.startBattle('EG_MOND_HILI_PATROL','RANDOM');
 const s=cp(r.s);s.growthPacingVersion=1;s.global.PLAYER_XP_STATE=Math.floor(G.previousPacingCurve[36]/2);
 const actors=cp(s.runtime.actors),order=cp(s.runtime.order),x=new R(db,cp(s));assert.deepEqual(cp(x.s.runtime.actors),actors);assert.deepEqual(cp(x.s.runtime.order),order);
 assert.equal(x.s.global.PLAYER_XP_STATE,Math.floor(s.global.PLAYER_XP_STATE*G.xpNext(37)/G.previousPacingCurve[36]));
 const invalid=cp(s);invalid.global.PLAYER_XP_STATE=G.previousPacingCurve[36];assert.throws(()=>new R(db,invalid));
});
// Native balance fixtures: four C0 characters, declared owned equipment/talents
// and full entry HP. Enemy HP/stats are never edited and victories are never forced.
check('Lv3 loses fixed Lv10 and Lv12 fights; correctly levelled four-person starter-weapon parties can win',()=>{
 for(const [map,level]of [['MAP_MOND_TEMPLE_WOLF',10],['MAP_MOND_TEMPLE_LION',12]])for(const seed of [717,4242,9031]){
  const common={map,group:'EG_MOND_HILI_PATROL',origin:'EXPLICIT',route:'ROUTE_TRAVELER',team:['MOND_AMBER','MOND_KAEYA','MOND_LISA'],saveId:'BALANCE-V0166-'+seed,seed,gear:'starter',enhance:3,talent:'mid'};
  const low=measure({...common,level:3}),matched=measure({...common,level});
  assert.equal(low.initial.every(a=>a.level===level),true);assert.equal(low.result.victory,false,JSON.stringify({map,seed,result:low.result}));assert.equal(matched.result.victory,true,JSON.stringify({map,seed,result:matched.result}));
 }
});
check('a prepared four-star counter party can beat the fixed Lv27 Frostarm Lawachurl without changing its stats',()=>{
 for(const seed of [717,4242,9031]){const x=measure({level:27,map:'MAP_CRPG_ENTOMBED_PALACE',group:'EG_MOND_LOCAL_CRPG_ENTOMBED_PALACE_4',origin:'RANDOM',route:'ROUTE_TRAVELER',team:['MOND_FISCHL','LIYUE_XIANGLING','MOND_BARBARA'],gear:'craft',enhance:6,talent:'cap',saveId:'BALANCE-V0166-'+seed,seed});
  assert.equal(x.initial[0].level,27);assert.equal(x.result.victory,true,JSON.stringify({seed,result:x.result}));assert(x.result.rounds<=30);
 }
});
check('late story foes use fixed chapter levels while ordinary visits retain their regional levels',()=>{
 const levels={TRV_M02_N330:22,ISK_L04_AA1_058:52,ISK_L04_AA2_057:52,ISK_L04_AB1_066:54,ISK_L04_AB2_065:54,ISK_L04_B1_051:56,ISK_L04_B2_047:56},r=fresh('MAP_MOND_PLAINS');
 for(const [node,level]of Object.entries(levels))assert.equal(r.growthEncounterLevel('STORY:'+node),level);
 assert.equal(r.growthEncounterLevel('RANDOM'),2);r.adminApply({op:'level',target:'ALL',value:30});r.startBattle('EG_MOND_HILI_PATROL','STORY:TRV_M02_N330',{confirmed:true});
 assert(r.s.runtime.actors.filter(a=>a.side==='ENEMY').every(a=>a.level===22));
});
// The existing facility gate and RNG are mocked to isolate financial settlement.
// Native action validation, payment, equipment updates and stale retries remain active.
check('high-enhancement success, hold and downgrade all pay the quoted cost exactly once',()=>{
 for(const [outcome,roll,after]of [['SUCCESS',1,10],['HOLD',5000,9],['DOWN',10000,8]]){
  const r=fresh();r.adminApply({op:'level',target:'ALL',value:30});const slot=r.giveEquipment('EQ_SWORD_RANCOUR');r.s.inventory.find(i=>i.slot===slot).enhance=9;r.s.global.MORA=100000;r.s.global.SCREEN_MODE='CRAFT';
  r.enhancementFacilityReason=()=>'';r.die=()=>roll;const q=r.enhancementQuote(slot);
  assert.equal(q.cost.mora,12000);for(const [id,n]of Object.entries(q.cost.items))r.giveItem(id,n+7);
  const before={mora:r.s.global.MORA,items:Object.fromEntries(Object.keys(q.cost.items).map(id=>[id,r.itemCount(id)]))},args={slot,expectedLevel:q.level,instanceRevision:q.instanceRevision};
  r.action('ENHANCE',args);assert.equal(r.s.lastEnhancement.outcome,outcome);assert.equal(r.s.inventory.find(i=>i.slot===slot).enhance,after);assert.equal(r.s.global.MORA,before.mora-q.cost.mora);
  for(const [id,n]of Object.entries(q.cost.items))assert.equal(r.itemCount(id),before.items[id]-n);
  const current=r.serialize();assert.throws(()=>r.action('ENHANCE',args));assert.equal(r.serialize(),current);
 }
 const r=fresh(),slot=r.giveEquipment('EQ_SWORD_RANCOUR');for(const [level,cost]of [[0,80],[1,120],[2,180]]){r.s.inventory.find(i=>i.slot===slot).enhance=level;assert.equal(r.enhancementQuote(slot).cost.mora,cost);}
});
console.log(JSON.stringify({passed,nativeBalanceCases:2,saveMigrationCases:2,fixedLevelCase:1,isolatedSettlementCase:1}));
