'use strict';
const assert=require('node:assert/strict');
const {setup,observe}=require('../tools/audit_balance_v01522.cjs');
const {policy}=require('../tools/audit_balance_v0161.cjs');
const {R}=require('./helpers_v011.cjs');
const team=['MOND_FISCHL','LIYUE_XIANGLING','MOND_BARBARA'];
const cp=x=>JSON.parse(JSON.stringify(x));
let total=0;
for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI'])for(const seed of [717,4242,9031]){
 const r=setup({level:60,route,team,enhance:10,talent:8,map:'MAP_OSIAL_BATTLE'});
 const node=route==='ROUTE_TRAVELER'?'TRV_LY4_OSIAL_COMBAT':'ISK_L04_K1_040',group=route==='ROUTE_TRAVELER'?'EG_BOSS_OSIAL':'EG_ISK_L04_OSIAL';
 r.s.flags.FLAG_ISK_L01_LEAF='K1';r.storySetCursor(node);r.s.global.PRNG_STATE=seed;observe(r);
 const packets=[],damage=r.damage;r.damage=function(a,t,k,e,o){
  if(o?.card==='OSIAL_DELUGE'){
   const actual=this.s.runtime.actors.find(x=>x.id===a.id);
   assert.equal(a.atk,Math.round(actual.atk*.85));assert(a.atk>340);
   assert.equal(k,1.75);assert.equal(e,'HYDRO');assert.equal(o.range,'전장');assert.equal(o.noAura,false);
   packets.push({round:this.s.runtime.round,target:t.id,atk:a.atk});
  }
  return damage.call(this,a,t,k,e,o);
 };
 r.startBattle(group,'STORY:'+node,{confirmed:true,companions:team});
 const boss=r.s.runtime.actors.find(x=>x.source.startsWith('BOSS_'));
 assert.equal(boss.level,58);assert.equal(boss.atk,8453);assert.equal(r.s.runtime.liyueObjective.maxHp,70000);
 const result=policy(r);assert.equal(result.victory,true,route+' seed '+seed+' native four-star team');
 assert(packets.length>=8,'the actual boss attacks all four allies at least twice');
 assert(packets.every(x=>x.round%3===0));assert.equal(new Set(packets.map(x=>x.round+':'+x.target)).size,packets.length,'no duplicate deluge');
 const log=r._auditLast.log.filter(x=>x.card==='OSIAL_DELUGE'&&x.damage>0);
 assert(log.some(x=>x.damage/x.maxHp>.05),'body attack remains a real threat');
 assert.equal(r._auditLast.objective.charge,8);total++;console.log('PASS native Osial direct attacks and four-star victory '+route+' seed '+seed);
}
// This is a settlement regression, separate from the six unmodified native-stat fights above.
{
 const r=setup({level:60,route:'ROUTE_TRAVELER',team,enhance:10,talent:8,map:'MAP_OSIAL_BATTLE'});
 r.storySetCursor('TRV_LY4_OSIAL_COMBAT');r.startBattle('EG_BOSS_OSIAL','STORY:TRV_LY4_OSIAL_COMBAT',{confirmed:true,companions:team});
 r.action('COMBAT_BEGIN');const b=r.s.runtime;b.round=9;
 for(const a of b.actors){if(a.side==='ENEMY'&&a.source!=='BOSS_OSIAL'||a.source==='PLAYER_CUSTOM')a.hp=0;}
 Object.assign(b.liyueObjective,{charge:8,settled:[1,2,3,4,5,6,7,8]});
 // Includes the old stuck marker, so an already saved waiting battle can recover too.
 b.defenseAwaitingRecovery=true;b.phase='WAIT_PLAYER';
 const restored=new R(r.db,cp(r.s));restored.autoUntilPlayer();assert.equal(restored.s.runtime,null);
 const result=JSON.parse(restored.s.global.LAST_BATTLE_RESULT_JSON);assert.equal(result.victory,false);
 assert(restored.s.storyRecovery,'the ordinary story retry flow is available');total++;console.log('PASS KO after completed defense settles a retryable defeat, including a restored old hold');
}
console.log(JSON.stringify({total,passed:total}));
