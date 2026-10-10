'use strict';
const assert=require('node:assert/strict');
const {setup,observe,play}=require('../tools/audit_balance_v01522.cjs');
const {R,db}=require('./helpers_v011.cjs');
for(const [level,team,map,group,seed]of [[48,'five','MAP_LY_DETAIL_TIANQIU','EG_FB_PRIMO_GEOVISHAP',717],[56,'heal','MAP_CHASM_DEEP','EG_FB_RUIN_SERPENT',717]]){
 const r=setup({level,team,enhance:6,talent:'mid',formation:'DOUBLE_LINE',map});r.s.global.PRNG_STATE=seed;observe(r);r.startBattle(group,'EXPLICIT');const out=play(r);assert.equal(out.victory,false);assert.equal(out.defeatReason,'STALEMATE');assert.equal(out.xp,0);assert(!r.s.runtime);assert.equal(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).defeatReason,'STALEMATE');new R(db,JSON.parse(r.serialize()));const saved=r.serialize();r.finishBattle(false);assert.equal(r.serialize(),saved);console.log('PASS native AI stalemate settles once without rolling back: '+group);
}
// Living players still receive their input turn; the change does not set a boss turn limit.
const r=setup({level:48,team:'basic',enhance:6,talent:'mid',map:'MAP_LY_DETAIL_TIANQIU'});r.startBattle('EG_FB_PRIMO_GEOVISHAP','EXPLICIT');r.action('COMBAT_BEGIN');assert.equal(r.s.runtime.phase,'WAIT_PLAYER');assert(r.combatCards().length);console.log('PASS living player retains manual control');
