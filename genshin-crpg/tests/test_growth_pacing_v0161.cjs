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
 assert.equal(again.s.chars.MOND_AMBER.xp,x.s.chars.MOND_AMBER.xp);assert.equal(again.s.growthPacingVersion,1);
});
check('an in-flight old battle reloads without recalculating or healing its actors',()=>{
 const r=fresh('MAP_MOND_PLAINS');r.adminApply({op:'level',target:'ALL',value:37});r.startBattle('EG_MOND_HILI_PATROL','RANDOM');
 const s=cp(r.s);delete s.growthPacingVersion;s.global.PLAYER_XP_STATE=Math.floor(G.legacyXpNext(37)/2);
 const actors=cp(s.runtime.actors),expected=Math.floor(s.global.PLAYER_XP_STATE*G.xpNext(37)/G.legacyXpNext(37)),x=new R(db,s);assert.deepEqual(cp(x.s.runtime.actors),actors);
 assert.equal(x.s.global.PLAYER_XP_STATE,expected);
 assert.equal(x.s.growthPacingVersion,1);
});
check('capped old saves remain capped and malformed old XP or versions are rejected',()=>{
 for(const level of G.caps){const r=fresh();r.adminApply({op:'level',target:'ALL',value:level});const s=cp(r.s);delete s.growthPacingVersion;
  const x=new R(db,cp(s));assert.equal(x.growth().level,level);assert.equal(x.growth().xp,0);assert.equal(x.growth().next,0);
  const bad=cp(s);bad.global.PLAYER_XP_STATE=1;assert.throws(()=>new R(db,bad));
 }
 const r=fresh();r.adminApply({op:'level',target:'ALL',value:37});const s=cp(r.s);delete s.growthPacingVersion;
 for(const xp of [-1,.5,G.legacyXpNext(37),Number.MAX_SAFE_INTEGER]){const bad=cp(s);bad.global.PLAYER_XP_STATE=xp;assert.throws(()=>new R(db,bad));}
 const bad=cp(r.s);bad.growthPacingVersion=2;assert.throws(()=>new R(db,bad));
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
check('native four-owner XP carry and paid ascensions reproduce every band of the declared timing model',()=>{
 const fs=require('node:fs'),path=require('node:path'),{audit,BANDS}=require('../tools/audit_growth_pacing_v0161.cjs');
 const x=audit(JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/data/balance_v0161_timings.json'),'utf8')));
 assert.deepEqual(x.routes.REFERENCE_MEAN.map(r=>r.clears),[32,81,125,561,612,539]);
 for(const [i,r]of x.routes.REFERENCE_MEAN.entries())assert(Math.abs(r.seconds-BANDS[i][2])/BANDS[i][2]<.02);
});
console.log(JSON.stringify({total,passed:total}));
