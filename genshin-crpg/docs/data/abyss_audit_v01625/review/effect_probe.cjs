'use strict';
// Read-only product review. Ownership/level are diagnostic grants, combat and meal actions are public.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../../../..'),H=require(ROOT+'/tools/audit_protagonist_v01618.cjs'),env=H.load(ROOT),cp=x=>JSON.parse(JSON.stringify(x));
const r=H.setup(env,{level:60,team:['LIYUE_ZHONGLI','MOND_DILUC','MOND_JEAN'],route:'ROUTE_ISEKAI',seed:717,map:'MAP_V141_MUSK_REEF',gear:'craft',enhance:12,talent:10});
const buffs=['FOOD_ADEPTUS_TEMPTATION','FOOD_JADE_PARCELS','FOOD_SATISFYING_SALAD','FOOD_FISHERMANS_TOAST','FOOD_CREAM_STEW'];
const out={fingerprint:env.fingerprint,assumptions:'Diagnostic ownership/level only; no enemy/action/stat override. Public USE_ITEM then ABYSS_ENTER floor1; this probe verifies food status, not floor12 victory.',definitions:buffs.map(id=>r.foodSpec(id)),actions:[]};
for(const id of buffs)r.giveItem(id,3);
for(const id of buffs){const before=r.itemCount(id);r.action('USE_ITEM',{item:id,owner:'PLAYER_CUSTOM'});out.actions.push({id,consumed:before-r.itemCount(id),pending:cp(r.s.pendingCombatEffects.PLAYER_CUSTOM)});}
out.beforeRepeat=cp(r.s.pendingCombatEffects.PLAYER_CUSTOM);r.action('USE_ITEM',{item:'FOOD_JADE_PARCELS',owner:'PLAYER_CUSTOM'});out.afterRepeat=cp(r.s.pendingCombatEffects.PLAYER_CUSTOM);
assert.equal(out.beforeRepeat.length,5);assert.equal(out.afterRepeat.length,5);assert.equal(out.afterRepeat.filter(s=>s.id==='STATUS_FOOD_ATK').length,1);
r.action('ABYSS_ENTER',{floor:1});const a=r.s.runtime.actors.find(x=>x.source==='PLAYER_CUSTOM');
out.initialFoodStatuses=cp(a.statuses.filter(s=>s.id.startsWith('STATUS_FOOD')));out.pendingAfterEntry=cp(r.s.pendingCombatEffects);
const isolated=cp(a);isolated.statuses=isolated.statuses.filter(s=>s.id.startsWith('STATUS_FOOD'));
const bare=cp(isolated);bare.statuses=[];
out.effectiveFoodOnly=Object.fromEntries(['atk','def','crit','spd'].map(k=>[k,{rawActorStat:isolated[k],withoutFood:r.combatStat(bare,k),withFood:r.combatStat(isolated,k),ratio:r.combatStat(isolated,k)/r.combatStat(bare,k),delta:r.combatStat(isolated,k)-r.combatStat(bare,k)}]));
assert.equal(out.initialFoodStatuses.length,5);assert(!out.pendingAfterEntry.PLAYER_CUSTOM);
out.passed=true;fs.writeFileSync(path.join(__dirname,'effect_probe.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({fingerprint:out.fingerprint,passed:true,definitions:out.definitions,statuses:out.initialFoodStatuses,stats:out.effectiveFoodOnly}));
