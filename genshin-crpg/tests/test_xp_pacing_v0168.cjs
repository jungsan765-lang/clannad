'use strict';
const assert=require('node:assert/strict');
const {R,db,c,fresh}=require('./helpers_v011.cjs');
const {setup,observe,G,api,PLAYER}=require('../tools/audit_balance_v01522.cjs');
const {policy,REFERENCE_TEAM}=require('../tools/audit_balance_v0161.cjs');
const pacing=require('../tools/audit_growth_pacing_v0168.cjs');
const cp=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const OLD_EXP={5:200,10:450,15:450,20:1100,25:1100,30:1800,35:1800,40:2500,45:2500,50:4500,55:4500,60:8000};
const OLD_MATERIAL={5:40,10:90,15:90,20:220,25:220,30:360,35:360,40:500,45:500,50:900,55:900,60:1600};
let passed=0,nativeBattles=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
function ready(map){const r=setup({level:58,map,route:'ROUTE_TRAVELER',team:REFERENCE_TEAM,gear:'craft',enhance:10,talent:'mid',saveId:'XP-V0168-RECEIPT'});r.s.global.PRNG_STATE=717;r.wishGrant({kind:'char',id:'MOND_BARBARA',rarity:4});r.s.domainDaily={day:G.dayOf(r.leyLineNow()),wins:3};observe(r);return r;}
function complete(r,expected){const b=r.s.runtime,id=b.id,x=policy(r);nativeBattles++;assert.equal(x.victory,true,JSON.stringify(x));assert.equal(x.xp,expected);assert.equal(r.s.combatReceipts[id].xp,expected);assert.equal(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).xp,expected);assert.equal(r.s.log.find(x=>x.id===id).xp,expected);return x;}
check('all 12 current EXP payouts strictly increase while legacy EXP and material tables remain exact',()=>{
 const levels=Object.keys(G.domainXp).map(Number);assert.equal(levels.length,12);
 for(let i=1;i<levels.length;i++)assert(G.domainXp[levels[i]]>G.domainXp[levels[i-1]]);
 assert.deepEqual(cp(G.domainMaterialXp),OLD_MATERIAL);assert.deepEqual(cp(G.legacyTrialXp),OLD_EXP);
 assert.deepEqual(cp(G.legacyDomainXp),{5:200,10:450,20:1100,30:1800,40:2500,50:4500,60:8000});
 assert.deepEqual(cp(api.leyLines.bookXp),{MAT_CHAR_EXP_WANDERER:50,MAT_CHAR_EXP_ADVENTURER:250,MAT_CHAR_EXP_HERO:1000});
 assert.equal(api.leyLines.tiers[4].books.MAT_CHAR_EXP_HERO,180);assert.equal(api.leyLines.tiers[4].directXp,400);
 assert.deepEqual(cp(G.caps),[10,20,30,40,50,55,60]);assert.equal(G.xpNext(60),0);
 for(let l=1;l<59;l++)assert(G.xpNext(l+1)>G.xpNext(l));
});
check('all 12 EXP stages use identical preview, native plan, payout, bench share, receipts and reload XP',()=>{
 for(const [key,spec]of Object.entries(G.domains).filter(([,d])=>d.kind==='EXP'))for(const level of spec.levels){
  const r=ready(spec.map),entry=r.growthDomainEntries().find(x=>x.id===key+':'+level),expected=G.domainXp[level],benchBefore=r.growth('MOND_BARBARA').xp;
  const preview=r.growthDomainRewards(entry),daily=cp(r.s.domainDaily),mora=r.s.global.MORA;
  assert.equal(preview.xp,expected);assert.equal(preview.mora,0);assert.deepEqual(cp(preview.items),{});assert.equal(preview.bonus,false);
  r.action('DOMAIN_START',{domain:entry.id});assert.equal(r.mondRewardPlan(r.s.runtime).xp,expected);
  const x=complete(r,expected);assert.equal(x.mora,0);assert.deepEqual(cp(x.domain.items),{});assert.deepEqual(cp(r.s.domainDaily),daily);assert.equal(r.s.global.MORA,mora);
  for(const owner of [PLAYER,...REFERENCE_TEAM])assert.equal(r.growth(owner).xp,expected);
  assert.equal(r.growth('MOND_BARBARA').xp,benchBefore+Math.floor(expected*.25));
  const restored=new R(db,cp(r.s));for(const owner of [PLAYER,...REFERENCE_TEAM,'MOND_BARBARA'])assert.deepEqual(cp(restored.growth(owner)),cp(r.growth(owner)));
  const before=cp(r.s);assert.equal(r.finishBattle(true),undefined);assert.deepEqual(cp(r.s),before);
 }
});
check('version-4 in-flight saves use the current payout without changing actors or initiative',()=>{
 const r=ready(G.domains.MIDSUMMER_COURTYARD.map);r.action('DOMAIN_START',{domain:'MIDSUMMER_COURTYARD:15'});
 const saved=cp(r.s),actors=cp(saved.runtime.actors),order=cp(saved.runtime.order),restored=new R(db,saved);
 assert.deepEqual(cp(restored.s.runtime.actors),actors);assert.deepEqual(cp(restored.s.runtime.order),order);
 assert.equal(restored.mondRewardPlan(restored.s.runtime).xp,G.domainXp[15]);complete(restored,G.domainXp[15]);
});
check('native saved domain versions 1/2/3 retain original EXP and material payout rules',()=>{
 const legacy=[
  {id:'EXP:60',kind:'EXP',region:'리월',level:60,map:'MAP_LIYUE_HARBOR',version:1,expected:8000},
  {id:'FORSAKEN_RIFT:4',key:'FORSAKEN_RIFT',stage:4,kind:'TALENT',name:G.legacyDomains.FORSAKEN_RIFT.name,region:'몬드',level:30,map:'MAP_MOND_SPRINGVALE',version:2,expected:1800},
  {id:'MIDSUMMER_COURTYARD:EXP',key:'MIDSUMMER_COURTYARD',kind:'EXP',name:G.legacyTrialSites.MIDSUMMER_COURTYARD.name,region:'몬드',level:15,map:'MAP_MOND_STARSNATCH_CLIFF',version:3,expected:450}
 ];
 for(const spec of legacy){const {expected,...d}=spec,r=ready(d.map);d.day=G.dayOf(r.leyLineNow());d.element='NEUTRAL';r._growthDomain=d;r.startBattle(r.growthDomainGroup(d),'DOMAIN:'+d.id);delete r._growthDomain;
  assert.equal(r.mondRewardPlan(r.s.runtime).xp,expected);assert.equal(r.growthDomainRewards(d).xp,expected);
  const restored=new R(db,cp(r.s));assert.equal(restored.mondRewardPlan(restored.s.runtime).xp,expected);complete(restored,expected);
 }
 for(const [key,s]of Object.entries(G.legacyTrialSites))for(const kind of G.legacyTrials){const r=ready(s.map),d={id:key+':'+kind,key,kind,level:s.level,region:s.region};assert.equal(r.growthDomainRewards(d).xp,kind==='EXP'?OLD_EXP[s.level]:OLD_MATERIAL[s.level]);}
});
check('curve versions migrate each XP fraction once and preserve levels, caps, owned bench and in-flight combat',()=>{
 assert.equal(G.pacingVersion,3);
 for(const version of [undefined,1,2])for(const level of [7,17,37,56]){
  const r=setup({level,team:REFERENCE_TEAM,gear:'none'});r.wishGrant({kind:'char',id:'MOND_BARBARA',rarity:4});r.s.chars.MOND_BARBARA.level=level;r.s.ascensions.MOND_BARBARA=G.phaseFor(level);
  if(level===37)r.startBattle('EG_MOND_HILI_PATROL','RANDOM');const s=cp(r.s);
  if(version===undefined)delete s.growthPacingVersion;else s.growthPacingVersion=version;
  const oldNext=version===2?G.previousPacingCurveVersion2[level-1]:version===1?G.previousPacingCurve[level-1]:G.legacyXpNext(level);
  s.global.PLAYER_XP_STATE=Math.floor(oldNext*.63);for(const id of [...REFERENCE_TEAM,'MOND_BARBARA'])s.chars[id].xp=Math.floor(oldNext*.29);
  const before=cp(s),x=new R(db,s);assert.equal(x.s.growthPacingVersion,3);assert.equal(x.growth(PLAYER).level,level);
  assert.equal(x.growth(PLAYER).xp,Math.floor(before.global.PLAYER_XP_STATE*G.xpNext(level)/oldNext));
  for(const id of [...REFERENCE_TEAM,'MOND_BARBARA'])assert.equal(x.growth(id).xp,Math.floor(before.chars[id].xp*G.xpNext(level)/oldNext));
  assert.deepEqual(cp(x.s.ascensions),before.ascensions);assert.deepEqual(cp(x.s.inventory),before.inventory);assert.deepEqual(cp(x.s.wish),before.wish);
  if(before.runtime){assert.deepEqual(cp(x.s.runtime.actors),before.runtime.actors);assert.deepEqual(cp(x.s.runtime.order),before.runtime.order);}
  assert.deepEqual(cp(new R(db,cp(x.s)).s),cp(x.s));
  const malformed=cp(before);malformed.global.PLAYER_XP_STATE=oldNext;assert.throws(()=>new R(db,malformed));
 }
 for(const level of G.caps){const r=setup({level,team:REFERENCE_TEAM,gear:'none'}),s=cp(r.s);s.growthPacingVersion=2;const x=new R(db,cp(s));assert.equal(x.growth().xp,0);assert.equal(x.growth().level,level);assert.equal(x.growth().next,0);
  const malformed=cp(s);malformed.global.PLAYER_XP_STATE=1;assert.throws(()=>new R(db,malformed));
 }
 const bench=setup({level:37,team:REFERENCE_TEAM,gear:'none'}).s;bench.growthPacingVersion=2;bench.chars.MOND_AMBER.xp=G.previousPacingCurveVersion2[36];assert.throws(()=>new R(db,cp(bench)));
 const bad=cp(fresh().s);bad.growthPacingVersion=4;assert.throws(()=>new R(db,bad));
});
check('XP/time stage selection considers every unlocked stage and can choose below the highest winner',()=>{
 assert.deepEqual(pacing.candidates(1).map(x=>x.id),['MIDSUMMER_COURTYARD:5']);assert.equal(pacing.candidates(59).length,12);
 const attempts=[{domain:'lower',stageLevel:10,wins:3,cycleSeconds:30},{domain:'higher',stageLevel:15,wins:3,cycleSeconds:100},{domain:'losing',stageLevel:20,wins:2,cycleSeconds:1}];
 assert.equal(pacing.selectAttempt(attempts,{10:450,15:1000,20:1400}).domain,'lower');
});
check('Lv60 catches up a new character to Lv55/phase5 and native paid final ascension reaches Lv60',()=>{
 const r=setup({level:60,team:REFERENCE_TEAM,gear:'none'});r.wishGrant({kind:'char',id:'MOND_BARBARA',rarity:4});const before=r.growth('MOND_BARBARA');assert.equal(before.level,55);assert.equal(before.phase,5);assert.equal(before.xp,0);
 const paid=pacing.payAscension(r,'MOND_BARBARA');assert.deepEqual(cp(paid.paid),cp(paid.quote));
 const xp=G.pacingCurve.slice(54,59).reduce((n,x)=>n+x,0),claims=Math.ceil(xp/180000);assert(claims<=6,'catch-up book budget must remain within six highest Revelation claims');
 let used=0;for(let claim=0;r.growth('MOND_BARBARA').level<60&&claim<6;claim++){r.giveItem('MAT_CHAR_EXP_HERO',180);const n=r.experienceBookLimit('MAT_CHAR_EXP_HERO','MOND_BARBARA');assert(n>0&&n<=180);r.action('USE_ITEM',{item:'MAT_CHAR_EXP_HERO',quantity:n,owner:'MOND_BARBARA'});used+=n;}
 assert.equal(used,Math.ceil(xp/1000));assert.equal(r.growth('MOND_BARBARA').level,60);assert.equal(r.growth('MOND_BARBARA').xp,0);assert.equal(r.experienceBookLimit('MAT_CHAR_EXP_HERO','MOND_BARBARA'),0);
});
console.log(JSON.stringify({passed,nativeBattles}));
