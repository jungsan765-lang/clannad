'use strict';
const assert=require('node:assert/strict');
const {fresh,R,db,c}=require('./helpers_v011.cjs');
const G=c.CRPGRuntime.growthV01522,cp=x=>JSON.parse(JSON.stringify(x));
let total=0;function check(name,fn){fn();total++;console.log('PASS '+name);}
check('the new curve is strictly increasing below Lv60 and retains every ascension cap',()=>{
 assert.equal(G.pacingCurve.length,60);assert.equal(G.xpNext(60),0);
 for(let l=1;l<59;l++)assert(G.xpNext(l+1)>G.xpNext(l));
 assert.deepEqual(cp(G.caps),[10,20,30,40,50,55,60]);
});
check('0.16.0 saves preserve levels, phases and current XP-bar fractions for player and owned bench',()=>{
 const r=fresh();r.wishGrant({kind:'char',id:'MOND_AMBER',rarity:4});
 r.adminApply({op:'level',target:'ALL',value:37});
 const s=cp(r.s);delete s.growthPacingVersion;
 s.global.PLAYER_XP_STATE=Math.floor(G.legacyXpNext(37)*.63);
 s.chars.MOND_AMBER.xp=Math.floor(G.legacyXpNext(37)*.29);
 const expected=cp(s),x=new R(db,s);
 assert.equal(x.s.global.PLAYER_LEVEL_STATE,37);assert.equal(x.s.chars.MOND_AMBER.level,37);
 assert.deepEqual(cp(x.s.ascensions),expected.ascensions);
 assert.equal(x.s.global.PLAYER_XP_STATE,Math.floor(expected.global.PLAYER_XP_STATE*G.xpNext(37)/G.legacyXpNext(37)));
 assert.equal(x.s.chars.MOND_AMBER.xp,Math.floor(expected.chars.MOND_AMBER.xp*G.xpNext(37)/G.legacyXpNext(37)));
 assert.deepEqual(cp(x.s.inventory),expected.inventory);assert.equal(JSON.stringify(x.s.wish),JSON.stringify(expected.wish));
 const again=new R(db,cp(x.s));assert.equal(again.s.global.PLAYER_XP_STATE,x.s.global.PLAYER_XP_STATE);
 assert.equal(again.s.chars.MOND_AMBER.xp,x.s.chars.MOND_AMBER.xp);assert.equal(again.s.growthPacingVersion,2);
});
check('an in-flight old battle reloads without recalculating or healing its actors',()=>{
 const r=fresh('MAP_MOND_PLAINS');r.adminApply({op:'level',target:'ALL',value:37});r.startBattle('EG_MOND_HILI_PATROL','RANDOM');
 const s=cp(r.s);delete s.growthPacingVersion;s.global.PLAYER_XP_STATE=Math.floor(G.legacyXpNext(37)/2);
 const actors=cp(s.runtime.actors),expected=Math.floor(s.global.PLAYER_XP_STATE*G.xpNext(37)/G.legacyXpNext(37)),x=new R(db,s);assert.deepEqual(cp(x.s.runtime.actors),actors);
 assert.equal(x.s.global.PLAYER_XP_STATE,expected);
 assert.equal(x.s.growthPacingVersion,2);
});
check('capped old saves remain capped and malformed old XP or versions are rejected',()=>{
 for(const level of G.caps){const r=fresh();r.adminApply({op:'level',target:'ALL',value:level});const s=cp(r.s);delete s.growthPacingVersion;
  const x=new R(db,cp(s));assert.equal(x.growth().level,level);assert.equal(x.growth().xp,0);assert.equal(x.growth().next,0);
  const bad=cp(s);bad.global.PLAYER_XP_STATE=1;assert.throws(()=>new R(db,bad));
 }
 const r=fresh();r.adminApply({op:'level',target:'ALL',value:37});const s=cp(r.s);delete s.growthPacingVersion;
 for(const xp of [-1,.5,G.legacyXpNext(37),Number.MAX_SAFE_INTEGER]){const bad=cp(s);bad.global.PLAYER_XP_STATE=xp;assert.throws(()=>new R(db,bad));}
 const bad=cp(r.s);bad.growthPacingVersion=3;assert.throws(()=>new R(db,bad));
});
check('native XP carries through multiple levels and discards overflow only at ascension caps',()=>{
 const r=fresh();r.addXp('PLAYER_CUSTOM',G.xpNext(1)+G.xpNext(2)+17);
 assert.equal(r.growth().level,3);assert.equal(r.growth().xp,17);
 r.addXp('PLAYER_CUSTOM',10000000);assert.equal(r.growth().level,10);assert.equal(r.growth().xp,0);
 assert.equal(r.experienceBookLimit('MAT_CHAR_EXP_HERO'),0);
 const x=new R(db,cp(r.s));assert.equal(x.growth().level,10);assert.equal(x.growth().phase,0);
});
check('gacha catch-up still joins at Lv55 for a Lv60 account and duplicates preserve progress',()=>{
 const r=fresh();r.adminApply({op:'level',target:'ALL',value:60});
 for(const [id,rarity]of [['MOND_AMBER',4],['MOND_DILUC',5]]){
  r.wishGrant({kind:'char',id,rarity});assert.equal(r.growth(id).level,55);assert.equal(r.growth(id).phase,5);
  r.addXp(id,12345);const before=cp(r.growth(id));r.wishGrant({kind:'char',id,rarity});assert.deepEqual(cp(r.growth(id)),before);
 }
});
// Raw all-level timing samples were lost during workspace maintenance. This final
// smoke deliberately verifies current native fights and paid XP/cap boundaries;
// it does not claim to reproduce every historical timing band.
check('current native two-route battles and all four paid ascensions preserve XP and cost boundaries',()=>{
 const {smoke}=require('../tools/audit_growth_pacing_v0166.cjs'),x=smoke();
 assert.equal(x.rows.length,12);assert.equal(x.paidCaps.length,8);
 for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI'])for(const level of [1,20])for(const seed of [717,4242,9031]){
  const rows=x.rows.filter(r=>r.route===route&&r.level===level&&r.seed===seed);assert.equal(rows.length,1);
  assert.equal(rows[0].result.victory,true);assert(!rows[0].result.stalled);assert(rows[0].cycleSeconds>0);
 }
 for(const p of x.paidCaps){
  assert.equal(p.levelBefore,10);assert.equal(p.capBefore,10);assert.equal(p.phaseBefore,0);assert.equal(p.xpBefore,0);
  assert.deepEqual(cp(p.paid),cp(p.cost));assert.equal(p.phaseAfter,1);assert.equal(p.capAfter,20);
  assert.equal(p.levelAfter,12);assert.equal(p.xpAfter,17);
 }
 for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI'])assert.deepEqual(x.paidCaps.filter(p=>p.route===route).map(p=>p.owner).sort(),['MOND_AMBER','MOND_KAEYA','MOND_LISA','PLAYER_CUSTOM'].sort());
});
console.log(JSON.stringify({total,passed:total}));

