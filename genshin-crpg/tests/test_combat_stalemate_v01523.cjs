'use strict';
const assert=require('node:assert/strict');
const {setup,observe,play}=require('../tools/audit_balance_v01522.cjs');
const {R,db}=require('./helpers_v011.cjs');
function assertSettledDefeat(r,out){
 assert.equal(out.victory,false);assert.equal(out.xp,0);assert(!r.s.runtime);
 const result=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON),last=r._auditLast;
 assert.equal(result.victory,false);assert.equal(result.xp,0);assert.equal(result.defeatReason,out.defeatReason);
 assert.equal(Object.keys(r.s.combatReceipts).length,1);assert.equal(r.s.combatReceipts[result.id].id,result.id);
 assert(last);assert(last.actors.some(a=>a.side==='ENEMY'&&a.hp>0));
 new R(db,JSON.parse(r.serialize()));const saved=r.serialize();r.finishBattle(false);assert.equal(r.serialize(),saved);
 return last;
}
function assertStalemateActors(last){
 const allies=last.actors.filter(a=>a.side==='ALLY');assert.equal(allies.find(a=>a.source==='PLAYER_CUSTOM').hp,0);
 assert(allies.some(a=>a.source!=='PLAYER_CUSTOM'&&a.hp>0));assert(last.actors.some(a=>a.side==='ENEMY'&&a.hp>0));
}
for(const [level,team,map,group,seed]of [[48,'five','MAP_LY_DETAIL_TIANQIU','EG_FB_PRIMO_GEOVISHAP',717],[56,'heal','MAP_CHASM_DEEP','EG_FB_RUIN_SERPENT',717]]){
 const r=setup({level,team,enhance:6,talent:'mid',formation:'DOUBLE_LINE',map});r.s.global.PRNG_STATE=seed;observe(r);r.startBattle(group,'EXPLICIT');const out=play(r),last=assertSettledDefeat(r,out);
 // These historical healer rosters can now die before reaching the auto limit.
 // Keep their native terminal settlement checks without requiring the old healing balance.
 if(out.defeatReason==='STALEMATE')assertStalemateActors(last);
 else{assert.equal(out.defeatReason,undefined);const allies=last.actors.filter(a=>a.side==='ALLY');assert.equal(allies.length,4);assert(allies.every(a=>a.hp===0));}
 console.log('PASS native boss defeat settles once without rolling back: '+group);
}
// A declared input boundary makes the limit independent of healer coefficients:
// Hydro-immune slimes cannot be damaged by Barbara, and their fixture ATK is zero.
// All damage, immunity, AI, round and settlement functions remain native.
{
 const r=setup({level:10,team:['MOND_BARBARA'],enhance:0,talent:1,map:'MAP_MOND_PLAINS'});r.s.global.PRNG_STATE=717;observe(r);r.startBattle('EG_ISK_L04_AA2_CART','EXPLICIT');
 const b=r.s.runtime,initialRound=b.round,player=b.actors.find(a=>a.source==='PLAYER_CUSTOM'),npcs=b.actors.filter(a=>a.source!=='PLAYER_CUSTOM');
 assert.equal(npcs.filter(a=>a.side==='ENEMY').length,2);assert(npcs.filter(a=>a.side==='ENEMY').every(a=>a.source==='MON_SLIME_HYDRO'));
 const npcHp=new Map(npcs.map(a=>[a.id,a.hp]));player.hp=0;for(const a of npcs)if(a.side==='ENEMY')a.atk=0;
 const out=play(r),last=assertSettledDefeat(r,out);assert.equal(out.defeatReason,'STALEMATE');assertStalemateActors(last);assert(last.rounds>initialRound);
 for(const a of last.actors.filter(a=>a.source!=='PLAYER_CUSTOM')){assert(a.hp>0);assert.equal(a.hp,npcHp.get(a.id));}
 console.log('PASS native immune AI stalemate reaches the limit and settles once');
}
// Living players still receive their input turn; the change does not set a boss turn limit.
const r=setup({level:48,team:'basic',enhance:6,talent:'mid',map:'MAP_LY_DETAIL_TIANQIU'});r.startBattle('EG_FB_PRIMO_GEOVISHAP','EXPLICIT');r.action('COMBAT_BEGIN');assert.equal(r.s.runtime.phase,'WAIT_PLAYER');assert(r.combatCards().length);console.log('PASS living player retains manual control');
