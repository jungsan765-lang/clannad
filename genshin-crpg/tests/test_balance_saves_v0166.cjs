'use strict';
const assert=require('node:assert/strict');
const helpers=require('./helpers_v011.cjs'),{fresh,R,db,c}=helpers;
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const contract=require('./test_enemy_balance_v01627.cjs');
const {measure,policy}=require('../tools/audit_balance_v0161.cjs');
const currentFixture=require('../tools/audit_balance_v01522.cjs');
const G=c.CRPGRuntime.growthV01522,cp=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
check('0.16.5 XP migrates once for player, owned companion and bench without changing levels or belongings',()=>{
 const r=fresh();r.wishGrant({kind:'char',id:'MOND_AMBER',rarity:4});r.wishGrant({kind:'char',id:'MOND_BARBARA',rarity:4});r.adminApply({op:'level',target:'ALL',value:37});
 r.s.party=r.s.party.map(p=>p.source==='MOND_BARBARA'?{...p,active:false}:p);
 const old=G.previousPacingCurve[36],s=cp(r.s);s.growthPacingVersion=1;s.global.PLAYER_XP_STATE=Math.floor(old*.63);s.chars.MOND_AMBER.xp=Math.floor(old*.29);s.chars.MOND_BARBARA.xp=Math.floor(old*.71);
 const before=cp(s),x=new R(db,s);assert.equal(x.s.growthPacingVersion,3);assert.equal(x.s.global.PLAYER_LEVEL_STATE,37);
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
// The original three-win expectation describes genuine published 0.16.26,
// not the new 0.16.27 ordinary-enemy ATK budget. Keep the historical obligation
// and load those actual native pending/started battles into the current engine.
const LAWACHURL={level:27,map:'MAP_CRPG_ENTOMBED_PALACE',group:'EG_MOND_LOCAL_CRPG_ENTOMBED_PALACE_4',origin:'RANDOM',route:'ROUTE_TRAVELER',team:['MOND_FISCHL','LIYUE_XIANGLING','MOND_BARBARA'],gear:'craft',enhance:6,talent:'cap'};
const ORIGINAL_BEFORE={717:[37070,2297,215,9],4242:[37070,2297,215,15],9031:[27460,2297,215,8]};
const CURRENT_BUDGET={717:[39665,2538,234,11,true,2],4242:[39665,2538,234,17,false,4],9031:[29382,2538,234,14,true,2]};
const genuine=contract.loadBefore();contract.productionBootstrap(genuine);contract.productionBootstrap({c,R,db,api:c.CRPGRuntime});
c.Date=genuine.c.Date;
function genuineFixture(){
 let serial=0;
 const historicalFresh=(map='MAP_MOND_CITY',route='ROUTE_TRAVELER')=>{
  const r=new genuine.R(genuine.db);r.newGame({name:'클라나드',route,seed:71247,saveId:'V011-'+(++serial)});
  Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:map,STORY_MENU_POLICY:'',WORLD_TIME:'12:00',MORA:3000});
  delete r.s.storyJourney;delete r.s.storyBreak;r.prepareStory();return r;
 };
 const file=path.resolve(__dirname,'../tools/audit_balance_v01522.cjs'),m={exports:{}},actualRequire=createRequire(file);
 vm.runInNewContext(fs.readFileSync(file,'utf8'),{module:m,exports:m.exports,__dirname:path.dirname(file),console,process,require:id=>id==='../tests/helpers_v011.cjs'?{...helpers,...genuine,fresh:historicalFresh}:actualRequire(id)},{filename:'genuine-before-fixture-only'});
 return m.exports;
}
const historicalFixture=genuineFixture();
function prepareLawachurl(tool,engine,seed){
 const r=tool.setup({...LAWACHURL,saveId:'BALANCE-V0166-'+seed});
 Object.assign(r.tutorialState().done,{combatAttack:true,combatGuard:true,combatSkill:true,combatBurst:true});
 r.s.global.PRNG_STATE=seed;r.s.domainDaily={day:engine.growthV01522.dayOf(r.leyLineNow()),wins:3};
 r.startBattle(LAWACHURL.group,LAWACHURL.origin);
 assert.equal(r.s.runtime.id,'BALANCE-V0166-'+seed+':B13','same original fixture identity, EQUIP count and native affix draw');
 assert.equal(r.s.runtime.actors.filter(a=>a.side==='ALLY').length,4);
 const worn=r.s.inventory.filter(i=>i.equipped);assert.equal(worn.length,12);assert(worn.every(i=>i.enhance===6));
 for(const id of ['PLAYER_CUSTOM',...LAWACHURL.team]){assert.equal(r.constellationLevel(id),0);const t=r.talentLevels(id),cap=r.growth(id).talentCap;assert(t.base.na<=cap&&t.base.e<=cap&&t.base.q<=cap);}
 return r;
}
check('genuine 0.16.26 prepared Lv27 counter party retains three native wins and exact loaded-save continuation',()=>{
 for(const seed of [717,4242,9031]){
  const old=prepareLawachurl(historicalFixture,genuine.api,seed),a=old.s.runtime.actors.find(a=>a.side==='ENEMY'),anchor=ORIGINAL_BEFORE[seed];
  assert.equal(a.level,27);assert.deepEqual([a.maxHp,a.atk,a.def],anchor.slice(0,3));assert.equal(old.s.runtime.enemyBalanceRevision,undefined);
  const pending=JSON.parse(old.serialize()),loaded=new R(db,cp(pending));assert.deepEqual(JSON.parse(loaded.serialize()),pending);
  old.action('COMBAT_BEGIN');loaded.action('COMBAT_BEGIN');assert.deepEqual(JSON.parse(loaded.serialize()),JSON.parse(old.serialize()));
  const started=JSON.parse(old.serialize()),again=new R(db,cp(started));assert.deepEqual(JSON.parse(again.serialize()),started);
  historicalFixture.observe(old);currentFixture.observe(again);
  const before=policy(old),after=policy(again);assert.equal(before.victory,true);assert.equal(before.rounds,anchor[3]);assert(before.rounds<=30);assert.deepEqual(cp(after),cp(before));
  assert.deepEqual(JSON.parse(again.serialize()),JSON.parse(old.serialize()),'all actual final actors, receipt, PRNG and complete save retain genuine old rules');
 }
});
check('current gradual Lv27 budget has two native scripted wins and one loss, with exact saved continuation and payouts',()=>{
 for(const seed of [717,4242,9031]){
  const r=prepareLawachurl(currentFixture,c.CRPGRuntime,seed),a=r.s.runtime.actors.find(a=>a.side==='ENEMY'),anchor=CURRENT_BUDGET[seed],old=ORIGINAL_BEFORE[seed],weight=.175;
  // Reviewed Lv27 HP/DEF weight .175, gradual ATK multiplier1.105; K(27)=100.
  assert.deepEqual(anchor.slice(0,3),[Math.round(old[0]*(1+.4*weight)),Math.round(old[1]*1.105),Math.round(old[2]*(1+.5*weight))]);
  assert.deepEqual([a.maxHp,a.atk,a.def],anchor.slice(0,3));assert.equal(r.s.runtime.enemyBalanceRevision,1);
  const expectedReward=cp(r.mondRewardPlan(r.s.runtime)),save=JSON.parse(r.serialize()),loaded=new R(db,cp(save));assert.deepEqual(JSON.parse(loaded.serialize()),save);currentFixture.observe(r);currentFixture.observe(loaded);
  const direct=policy(r),restored=policy(loaded);assert.deepEqual(cp(restored),cp(direct));assert.equal(direct.victory,anchor[4]);assert.equal(direct.rounds,anchor[3]);assert.equal(direct.deaths,anchor[5]);if(anchor[4]){assert(direct.hpRatio>0&&direct.hpRatio<.3);assert.equal(direct.xp,expectedReward.xp);assert.equal(direct.mora,expectedReward.mora);}else{assert.equal(direct.hpRatio,0);assert.equal(direct.xp,0);}assert.equal(direct.stalled,undefined);
  assert.deepEqual(JSON.parse(loaded.serialize()),JSON.parse(r.serialize()));const settled=r.serialize();r.finishBattle(direct.victory);assert.equal(r.serialize(),settled,'already committed reward or defeat penalty never pays again');
 }
 // This fixed HOLD/Q/basic script with generic armor is not an optimal manual
 // counter-play claim. Current wins cannot substitute for actual old-save proof.
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
console.log(JSON.stringify({passed,nativeBalanceCases:3,saveMigrationCases:2,genuineBeforeSaveReplayCases:1,currentBudgetReplayCases:1,fixedLevelCase:1,isolatedSettlementCase:1}));
