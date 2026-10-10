'use strict';
// Controlled rule contracts, not a natural-account clear-rate or farming-time simulation.
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),assert=require('node:assert/strict');
const H=require('./helpers_v011.cjs'),A=require('./helpers_abyss.cjs'),root=H.root,cp=x=>JSON.parse(JSON.stringify(x));
// Freeze the native current engine before any account or save is created. The
// actual production-engine harness already supplies this same reference clock;
// its helper has no advance(), so require that genuine realm clock explicitly.
// The legacy VM below inherits the pinned current realm Date. This keeps exact
// saved-state assertions meaningful when the CI run crosses the Seoul day.
const FIXTURE_NOW=Date.parse('2026-10-10T16:00:00+09:00');
if(typeof H.advance==='function')H.advance(FIXTURE_NOW-H.c.Date.now());
assert.equal(H.c.Date.now(),FIXTURE_NOW,'declared current and historical native fixture clock');
const scripts=[...fs.readFileSync(path.join(root,'source/index.html'),'utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)].map(x=>x[1]);
const beforeDir=path.join(root,'docs/data/abyss_fixes_v01626/baseline');
const sharedBeforeDir=path.join(root,'docs/data/abyss_fixes_v01626/engines/compatibility_before_v01624'),sharedBeforeHashes=JSON.parse(fs.readFileSync(path.join(sharedBeforeDir,'manifest.json'),'utf8'));
const legacyContext=vm.createContext({console,Date:H.c.Date,setTimeout,clearTimeout});
for(const file of scripts){
 // These modules were unchanged between 0.16.24 and the 0.16.25 baseline.
 // Keep their authenticated pre-retuning rules instead of borrowing fresh
 // field pressure and damage rules for a purported historical opening.
 const shared=['runtime_field_bosses.js','runtime_rules.js'].includes(file),source=fs.readFileSync(shared?path.join(sharedBeforeDir,'source',file):['runtime_abyss.js','runtime_formations.js','runtime_growth_v01522.js','runtime_balance_admin_v01623.js'].includes(file)?path.join(beforeDir,file):path.join(root,'source',file),'utf8');
 if(shared)assert.equal(crypto.createHash('sha256').update(source).digest('hex'),sharedBeforeHashes['source/'+file]);
 vm.runInContext(source,legacyContext,{filename:file});
}
const currentApi=H.c.CRPGRuntime,legacyApi=legacyContext.CRPGRuntime,checks=[];
// Match the existing production bootstrap when the engine-parity harness uses it.
if(H.R.prototype.__relationshipsInstalled){const rel=legacyContext.CRPGRelationships;assert(rel);rel.install(legacyApi,{events:rel.catalogFromDB(H.db),activities:rel.activitiesFromDB(H.db),preferences:{adultModeEnabled:false},eligibility:{profiles:{},protagonists:{}}});}
function check(id,fn){const detail=fn();checks.push({id,pass:true,...detail});}
function fixture(floor=12,chamber=1){
 const r=A.fixture(60,['MOND_DILUC','MOND_NOELLE','MOND_JEAN'],12);
 r.action('OPERATOR_DEBUG',{op:'abyss_unlock',value:floor});
 if(chamber>1){const s=r.ensureAbyss();s.attempts++;s.active={floor,chamber,phase:'BREAK',party:r.abyssParty(),attempt:s.attempts,run:s.run,rounds:Array(chamber-1).fill(1)};}
 return r;
}
function settle(r,{pcKo=false,win=true}={}){
 r.action('COMBAT_BEGIN');const b=r.s.runtime,pc=b.actors.find(a=>a.source==='PLAYER_CUSTOM');
 if(pcKo)pc.hp=0;
 if(win)for(const a of b.actors.filter(a=>a.side==='ENEMY'))a.hp=0;
 else for(const a of b.actors.filter(a=>a.side==='ALLY'))a.hp=0;
 const before={nativePcHp:pc.hp,aliveCompanions:b.actors.filter(a=>a.side==='ALLY'&&a.source!=='PLAYER_CUSTOM'&&a.hp>0).length};
 r.autoUntilPlayer();assert.equal(r.s.runtime,null);
 return {...before,result:JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON)};
}
function pair({floor=12,food=false,admin=false,priority=false,effectiveSpeed=false,formation=false,general=false,adminSpeed=90}={}){
 const original=fixture(floor);
 if(formation)original.action('FORMATION_SET',{formation:'ECHELON'});
 if(food){original.giveItem('FOOD_CREAM_STEW',1);original.action('USE_ITEM',{item:'FOOD_CREAM_STEW',owner:'MOND_DILUC'});}
 const adminEnemies=general?Object.fromEntries(original.rows('49_ENCOUNTER_MEMBER_DB').filter(m=>m[1]==='EG_MOND_HILI_PATROL').map(m=>[m[3],{spd:adminSpeed}])):{MON_ABYSS_WARDEN:{spd:adminSpeed}};
 const s=cp(original.s),profile={revision:(adminSpeed===90?3:5)+(general?1:0),config:{enemies:adminEnemies}};
 const current=admin?currentApi.adminBalance.createRuntime(H.db,cp(s),profile):new H.R(H.db,cp(s));
 const legacy=admin?legacyApi.adminBalance.createRuntime(H.db,cp(s),profile):new legacyApi.Runtime(H.db,cp(s));
 for(const r of [current,legacy]){
  if(effectiveSpeed){const native=r.combatStat;r.combatStat=function(a,key){const n=native.call(this,a,key);return key==='spd'&&a.source==='MON_ABYSS_WARDEN'?Math.round(n*1.25)+3:n;};}
  if(priority){const native=r.newRound;r.newRound=function(...args){const b=this.s.runtime;if(b?.phase==='START'){const enemies=b.actors.filter(a=>a.side==='ENEMY');enemies[1].firstNextRound=1;enemies[1].nextScorePenalty=7;}return native.apply(this,args);};}
 }
 const oldReceipt=general?{result:legacy.startBattle('EG_MOND_HILI_PATROL','EXPLICIT')}:legacy.action('ABYSS_ENTER',{floor}),newReceipt=general?{result:current.startBattle('EG_MOND_HILI_PATROL','EXPLICIT')}:current.action('ABYSS_ENTER',{floor});
 return {current,legacy,oldReceipt,newReceipt};
}
check('four_declared_runtime_changes_preserve_configuration_numbers',()=>{
 const hashes=JSON.parse(fs.readFileSync(path.join(beforeDir,'SHA256.json'),'utf8'));
 const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
 assert.equal(hash('source/runtime_play_fixes.js'),hashes['source/runtime_play_fixes.js']);
 assert.notEqual(hash('source/runtime_abyss.js'),hashes['source/runtime_abyss.js']);
 assert.notEqual(hash('source/runtime_formations.js'),hashes['source/runtime_formations.js']);
 assert.notEqual(hash('source/runtime_growth_v01522.js'),hashes['source/runtime_growth_v01522.js']);
 assert.notEqual(hash('source/runtime_balance_admin_v01623.js'),hashes['source/runtime_balance_admin_v01623.js']);
 assert.deepEqual(cp(currentApi.abyssConfig),cp(legacyApi.abyssConfig));
 assert.deepEqual(cp(currentApi.formationConfig),cp(legacyApi.formationConfig));
 const currentGrowth=cp(currentApi.growthV01522),legacyGrowth=cp(legacyApi.growthV01522);
 assert.deepEqual(currentGrowth.previousBossChallengeProfiles,legacyGrowth.bossChallengeProfiles);
 assert.deepEqual(currentGrowth.previousDomainXp,legacyGrowth.domainXp);
 assert.equal(legacyGrowth.domainXp[60],10000);assert.equal(currentGrowth.expRewardVersion,1);
 assert.deepEqual(currentGrowth.domainXp,{...legacyGrowth.domainXp,60:24000});
 assert.equal(currentGrowth.talentRewardVersion,4);assert.equal(legacyGrowth.talentRewardVersion,3);
 assert.deepEqual(currentGrowth.previousDomainTalentBooks,legacyGrowth.domainTalentBooks);
 assert.deepEqual(currentGrowth.domainTalentBooks,{...legacyGrowth.domainTalentBooks,LIYUE:{...legacyGrowth.domainTalentBooks.LIYUE,60:90}});
 assert.deepEqual(currentGrowth.legacyDomainTalentBooks[3],legacyGrowth.domainTalentBooks);
 assert.deepEqual(currentGrowth.ordinaryAttackMultipliers,[[20,1],[30,1.15],[40,2.21],[50,2.76],[60,3.2]]);
 delete currentGrowth.legacyDomainTalentBooks[3];
 // Only the separately tested 0.16.27 enemy policy and challenge anchors
 // replace their old exported values. All growth costs/gates/rewards stay exact.
 for(const key of ['bossChallengeProfiles','previousBossChallengeProfiles','enemyBalanceRevision','enemyBalance','enemyBalanceWeight','ordinaryAttackMultipliers','previousDomainXp','expRewardVersion','domainXp','domainTalentBooks','previousDomainTalentBooks','talentRewardVersion'])delete currentGrowth[key];
 delete legacyGrowth.bossChallengeProfiles;delete legacyGrowth.domainXp;delete legacyGrowth.domainTalentBooks;delete legacyGrowth.talentRewardVersion;assert.deepEqual(currentGrowth,legacyGrowth);
 return {floorNumbersGearAndCharacterRequirementsPreserved:true,unrelatedGrowthConfigurationPreserved:true,previousBossChallengeProfilesPreserved:true,playFixesUnchanged:true};
});
for(const chamber of [1,2])check('new_chamber_'+chamber+'_actual_pc_ko_stops_run',()=>{
 const r=fixture(12,chamber);r.action('ABYSS_ENTER',{floor:12});assert.equal(r.s.runtime.abyss.rulesRevision,1);
 const out=settle(r,{pcKo:true});assert.equal(out.aliveCompanions,3);assert.equal(out.result.victory,true);assert.equal(out.result.abyss.outcome,'DOWNED');assert.equal(out.result.abyss.cleared,false);
 assert.equal(r.s.abyss.active,null);assert.equal(r.s.abyss.clears[12],undefined);assert.deepEqual(cp(r.s.abyss.tags),{});assert.equal(r.actionReason('ABYSS_REWARD',{floor:12}),'받을 수 있는 첫 정복 보상이 없습니다.');
 assert.equal(r.s.global.PLAYER_HP_CURRENT,Math.max(1,Math.ceil(r.s.global.PLAYER_HP_MAX*.1)));assert.equal(out.result.protagonistRevived,r.s.global.PLAYER_HP_CURRENT);
 assert.equal(r.s.combatReceipts[out.result.id].abyss.outcome,'DOWNED');assert.equal(r.s.log.find(x=>x.id===out.result.id).abyss.outcome,'DOWNED');
 return {controlledSettlement:true,outcome:'DOWNED',nativePcHp:out.nativePcHp,aliveCompanions:out.aliveCompanions,exitHp:r.s.global.PLAYER_HP_CURRENT,nextRoom:false,marked:false};
});
check('living_protagonist_still_advances',()=>{
 const r=fixture(4);r.action('ABYSS_ENTER',{floor:4});const out=settle(r);assert.equal(out.result.abyss.outcome,'NEXT');assert.equal(r.s.abyss.active.chamber,2);assert.equal(r.s.abyss.active.phase,'BREAK');return {outcome:'NEXT',nextChamber:2};
});
check('last_chamber_companion_victory_keeps_clear_and_exit_recovery',()=>{
 const r=fixture(12,3);r.action('ABYSS_ENTER',{floor:12});const out=settle(r,{pcKo:true});assert.equal(out.result.abyss.outcome,'CLEARED');assert.equal(out.result.abyss.cleared,true);assert.equal(r.s.abyss.active,null);assert(r.s.abyss.clears[12]);assert.equal(Object.keys(r.s.abyss.tags).length,3);assert.equal(out.result.protagonistRevived,r.s.global.PLAYER_HP_CURRENT);return {controlledSettlement:true,outcome:'CLEARED',nativePcHp:0,exitRevivalPreserved:true};
});
check('ordinary_combat_pc_ko_victory_keeps_existing_revival',()=>{
 const r=fixture(1);r.startBattle('EG_MOND_HILI_PATROL','EXPLICIT');assert.equal(r.s.runtime.abyss,undefined);const out=settle(r,{pcKo:true});assert.equal(out.result.victory,true);assert.equal(out.result.abyss,undefined);assert.equal(out.result.protagonistRevived,r.s.global.PLAYER_HP_CURRENT);assert(r.s.global.PLAYER_HP_CURRENT>0);return {ordinaryVictoryRevivalPreserved:true};
});
check('wipe_is_defeat_not_next_or_cleared',()=>{
 const r=fixture(4);r.action('ABYSS_ENTER',{floor:4});const out=settle(r,{win:false});assert.equal(out.result.victory,false);assert.equal(out.result.abyss.outcome,'DEFEAT');assert.equal(r.s.abyss.active,null);assert.equal(r.s.abyss.clears[4],undefined);return {outcome:'DEFEAT'};
});
for(const floor of [1,4,10,12])check('opening_final_enemy_speed_floor_'+floor,()=>{
 const {current,legacy,newReceipt}=pair({floor}),b=current.s.runtime,old=legacy.s.runtime;
 assert.equal(current.s.global.PRNG_STATE,legacy.s.global.PRNG_STATE);assert.equal(b.round,1);assert.equal(b.cursor,0);assert.equal(b.turnStarted,null);assert.equal(b.actionSequence,0);assert(b.actors.every(a=>a.turns===0));assert.equal(b.opening.state,'PENDING');assert.equal(b.order[0].id,'PLAYER_CUSTOM');assert.deepEqual(cp(b.opening.initialOrder),cp(b.order));assert.deepEqual(cp(newReceipt.result.order),cp(current.combatOrderView()));
 const rows=b.actors.filter(a=>a.side==='ENEMY').map(a=>{const q=b.order.find(q=>q.id===a.id),oq=old.order.find(q=>q.id===a.id),roll=oq.score-28;assert(roll>=0&&roll<=9);assert.equal(q.score,current.combatStat(a,'spd')+roll);return {id:a.id,finalSpeed:current.combatStat(a,'spd'),openingScore:q.score,roll};});
 const originalOrder=cp(b.order),rng=current.s.global.PRNG_STATE;current.view();current.newRound();current.combatOpening();assert.equal(current.s.global.PRNG_STATE,rng);assert.deepEqual(cp(b.order),originalOrder);
 const begin=current.action('COMBAT_BEGIN');assert.deepEqual(cp(begin.result.initialOrder),originalOrder);assert.equal(current.s.global.PRNG_STATE,rng);assert.equal(current.s.runtime.turnStarted,'1:PLAYER_CUSTOM');return {rows,rngUnchanged:true,automaticActionsBeforeBegin:0,firstPlayableActor:'PLAYER_CUSTOM',receiptOrderCurrent:true};
});
check('opening_preserves_first_priority_and_score_penalty',()=>{
 const {current,legacy}=pair({priority:true}),b=current.s.runtime,old=legacy.s.runtime,foes=b.actors.filter(a=>a.side==='ENEMY'),prioritized=foes[1];
 assert.equal(b.order[0].id,'PLAYER_CUSTOM');assert.equal(b.order[1].id,prioritized.id);assert.equal(b.order[1].first,true);assert.equal(prioritized.nextScorePenalty,0);
 const prior=old.order.find(q=>q.id===prioritized.id),now=b.order.find(q=>q.id===prioritized.id);assert.equal(now.score-prior.score,22);assert.equal(current.s.global.PRNG_STATE,legacy.s.global.PRNG_STATE);return {firstPriorityPreserved:true,penaltyPreserved:7,rngUnchanged:true};
});
check('opening_uses_effective_combat_stat_not_raw_speed',()=>{
 const {current,legacy}=pair({effectiveSpeed:true}),b=current.s.runtime,old=legacy.s.runtime;const rows=b.actors.filter(a=>a.side==='ENEMY').map(a=>{const q=b.order.find(q=>q.id===a.id),oq=old.order.find(q=>q.id===a.id),roll=oq.score-(Math.round(28*1.25)+3);assert.equal(q.score,current.combatStat(a,'spd')+roll);assert.equal(q.score-oq.score,Math.round(50*1.25)-Math.round(28*1.25));return {speed:current.combatStat(a,'spd'),score:q.score,roll};});return {controlledEffectiveStatModifier:true,rows};
});
check('opening_food_speed_roll_and_next_round_stay_native',()=>{
 const {current,legacy}=pair({food:true}),b=current.s.runtime,old=legacy.s.runtime,ally=b.actors.find(a=>a.source==='MOND_DILUC');assert(ally.statuses.some(s=>s.sourceItem==='FOOD_CREAM_STEW'));assert.equal(b.order.find(q=>q.id===ally.id).score,old.order.find(q=>q.id===ally.id).score);assert.equal(current.s.global.PRNG_STATE,legacy.s.global.PRNG_STATE);
 b.round=2;b.opening.state='STARTED';current.newRound();const rows=b.actors.filter(a=>a.side==='ENEMY').map(a=>{const q=b.order.find(q=>q.id===a.id),roll=q.score-current.combatStat(a,'spd');assert(roll>=0&&roll<=9);return {speed:current.combatStat(a,'spd'),score:q.score,roll};});return {foodSpeedPreserved:true,secondRoundNative:true,rows};
});
check('operator_enemy_speed_is_final_in_order_and_receipt',()=>{
 const {current,legacy,newReceipt}=pair({admin:true}),b=current.s.runtime;assert.equal(b.adminBalanceRevision,3);assert.equal(b.order[0].id,'PLAYER_CUSTOM');assert.equal(current.s.global.PRNG_STATE,legacy.s.global.PRNG_STATE);assert.deepEqual(cp(b.order),cp(b.opening.initialOrder));assert.deepEqual(cp(newReceipt.result.order),cp(current.combatOrderView()));
 const rows=b.actors.filter(a=>a.side==='ENEMY').map(a=>{assert.equal(current.combatStat(a,'spd'),90);const q=b.order.find(q=>q.id===a.id),roll=q.score-90;assert(roll>=0&&roll<=9);return {speed:90,score:q.score,roll};});const saved=cp(current.s),loaded=currentApi.adminBalance.createRuntime(H.db,saved,{revision:3,config:{enemies:{MON_ABYSS_WARDEN:{spd:90}}}});assert.deepEqual(cp(loaded.s.runtime),cp(b));return {rows,receiptOrderCurrent:true,operatorSavePreserved:true};
});
for(const general of [false,true])check((general?'ordinary':'abyss')+'_echelon_food_and_operator_speed_compose_without_reroll',()=>{
 const {current,legacy,newReceipt}=pair({general,formation:true,food:true,admin:true}),b=current.s.runtime,old=legacy.s.runtime;
 assert.equal(current.s.global.PRNG_STATE,legacy.s.global.PRNG_STATE);assert.equal(b.formationV1.id,'ECHELON');assert.equal(b.cursor,0);assert.equal(b.turnStarted,null);assert(b.actors.every(a=>a.turns===0));assert.deepEqual(cp(b.opening.initialOrder),cp(b.order));
 const allies=b.actors.filter(a=>a.side==='ALLY').map(a=>{const q=b.order.find(q=>q.id===a.id),oq=old.order.find(q=>q.id===a.id);assert.equal(q.score-oq.score,6);const roll=q.score-current.combatStat(a,'spd');assert(roll>=0&&roll<=9);return {source:a.source,speed:current.combatStat(a,'spd'),score:q.score,roll};});
 const foodOwner=b.actors.find(a=>a.source==='MOND_DILUC');assert(foodOwner.statuses.some(s=>s.sourceItem==='FOOD_CREAM_STEW'));assert.equal(current.combatStat(foodOwner,'spd')-foodOwner.spd,10);
 const enemies=b.actors.filter(a=>a.side==='ENEMY').map(a=>{assert.equal(current.combatStat(a,'spd'),90);const q=b.order.find(q=>q.id===a.id),roll=q.score-90;assert(roll>=0&&roll<=9);return {source:a.source,speed:90,score:q.score,roll};});
 assert.equal(b.order[0].id,'PLAYER_CUSTOM');assert.deepEqual(cp(newReceipt.result.order),cp(current.combatOrderView()));
 const before=cp(b.order),begin=current.action('COMBAT_BEGIN');assert.equal(begin.result.initialOrder[0].id,'PLAYER_CUSTOM');assert.equal(current.s.global.PRNG_STATE,legacy.s.global.PRNG_STATE);assert.equal(current.s.runtime.turnStarted,'1:PLAYER_CUSTOM');assert.deepEqual(cp(begin.result.initialOrder).filter(q=>q.id!=='PLAYER_CUSTOM'),before.filter(q=>q.id!=='PLAYER_CUSTOM'));
 return {general,allies,enemies,foodAndFormationSpeed:10,rngUnchanged:true,playerFirstOnBegin:true};
});
check('ordinary_echelon_opening_snapshot_receipt_and_legacy_save_stay_consistent',()=>{
 const {current,legacy,newReceipt}=pair({general:true,formation:true,food:true}),b=current.s.runtime;assert.equal(b.order[0].id,'PLAYER_CUSTOM');assert.deepEqual(cp(newReceipt.result.order),cp(current.combatOrderView()));assert.deepEqual(cp(b.order),cp(b.opening.initialOrder));
 const newSave=JSON.parse(current.serialize()),oldSave=JSON.parse(legacy.serialize()),newLoaded=new H.R(H.db,newSave),oldLoaded=new H.R(H.db,oldSave);assert.deepEqual(cp(newLoaded.s),newSave);assert.deepEqual(cp(oldLoaded.s),oldSave);
 const allies=oldLoaded.s.runtime.actors.filter(a=>a.side==='ALLY');assert(allies.every(a=>{const q=oldLoaded.s.runtime.order.find(q=>q.id===a.id),roll=q.score-(oldLoaded.combatStat(a,'spd')-6);return roll>=0&&roll<=9;}));return {freshReceiptCurrent:true,oldQueuedSpeedPreserved:true,newSavePreserved:true};
});
for(const general of [false,true])check((general?'ordinary':'abyss')+'_operator_spd1000_keeps_preview_and_actual_protagonist_first',()=>{
 const {current,legacy,newReceipt}=pair({general,admin:true,adminSpeed:1000}),b=current.s.runtime;assert.equal(b.order[0].id,'PLAYER_CUSTOM');assert.equal(current.combatOpening().firstActorId,'PLAYER_CUSTOM');assert.deepEqual(cp(b.order),cp(b.opening.initialOrder));assert.deepEqual(cp(newReceipt.result.order),cp(current.combatOrderView()));assert.equal(current.s.global.PRNG_STATE,legacy.s.global.PRNG_STATE);
 const rows=b.actors.filter(a=>a.side==='ENEMY').map(a=>{const q=b.order.find(q=>q.id===a.id),roll=q.score-current.combatStat(a,'spd');assert.equal(current.combatStat(a,'spd'),1000);assert(roll>=0&&roll<=9);return {speed:1000,score:q.score,roll};});const out=current.action('COMBAT_BEGIN');assert.equal(out.result.initialOrder[0].id,'PLAYER_CUSTOM');assert.equal(current.s.runtime.turnStarted,'1:PLAYER_CUSTOM');assert.equal(current.s.global.PRNG_STATE,legacy.s.global.PRNG_STATE);return {rows,previewFirst:'PLAYER_CUSTOM',actualFirst:'PLAYER_CUSTOM',rngUnchanged:true};
});
check('new_pending_save_preserves_marker_order_rng_and_ko_policy',()=>{
 const r=fixture(4);r.action('ABYSS_ENTER',{floor:4});const save=JSON.parse(r.serialize()),loaded=new H.R(H.db,save);assert.deepEqual(cp(loaded.s),save);assert.equal(loaded.s.runtime.abyss.rulesRevision,1);const out=settle(loaded,{pcKo:true});assert.equal(out.result.abyss.outcome,'DOWNED');return {byteEquivalentState:true,marker:1,outcome:'DOWNED'};
});
check('new_started_save_preserves_ko_policy',()=>{
 const r=fixture(4);r.action('ABYSS_ENTER',{floor:4});r.action('COMBAT_BEGIN');const saved=JSON.parse(r.serialize()),loaded=new H.R(H.db,saved);assert.deepEqual(cp(loaded.s),saved);const b=loaded.s.runtime;b.actors.find(a=>a.source==='PLAYER_CUSTOM').hp=0;for(const a of b.actors.filter(a=>a.side==='ENEMY'))a.hp=0;loaded.autoUntilPlayer();assert.equal(JSON.parse(loaded.s.global.LAST_BATTLE_RESULT_JSON).abyss.outcome,'DOWNED');return {startedSavePreserved:true,outcome:'DOWNED'};
});
check('legacy_pending_save_keeps_stored_order_rng_and_old_advance_rule',()=>{
 const {legacy}=pair({floor:4}),save=JSON.parse(legacy.serialize()),loaded=new H.R(H.db,save);assert.equal(save.runtime.abyss.rulesRevision,undefined);assert.deepEqual(cp(loaded.s),save);const enemy=loaded.s.runtime.actors.find(a=>a.side==='ENEMY'),q=loaded.s.runtime.order.find(q=>q.id===enemy.id);assert(q.score-28>=0&&q.score-28<=9);
 const out=settle(loaded,{pcKo:true});assert.equal(out.result.abyss.outcome,'NEXT');assert.equal(loaded.s.abyss.active.phase,'BREAK');loaded.action('ABYSS_ENTER',{floor:4});assert.equal(loaded.s.runtime.abyss.rulesRevision,1);return {legacySavedOrderPreserved:true,legacyOutcome:'NEXT',newRoomAdoptsMarker:1};
});
check('legacy_started_save_keeps_old_advance_rule',()=>{
 const {legacy}=pair({floor:4});legacy.action('COMBAT_BEGIN');const saved=JSON.parse(legacy.serialize()),loaded=new H.R(H.db,saved);assert.deepEqual(cp(loaded.s),saved);const b=loaded.s.runtime;b.actors.find(a=>a.source==='PLAYER_CUSTOM').hp=0;for(const a of b.actors.filter(a=>a.side==='ENEMY'))a.hp=0;loaded.autoUntilPlayer();assert.equal(JSON.parse(loaded.s.global.LAST_BATTLE_RESULT_JSON).abyss.outcome,'NEXT');return {legacyStartedSavePreserved:true,outcome:'NEXT'};
});
check('unsupported_rules_revision_is_rejected_without_legacy_migration',()=>{
 const r=fixture(4);r.action('ABYSS_ENTER',{floor:4});const save=JSON.parse(r.serialize());for(const value of [0,2,-1,'1',null]){const bad=cp(save);bad.runtime.abyss.rulesRevision=value;assert.throws(()=>new H.R(H.db,bad),e=>e.code==='ABYSS_SAVE');assert.equal(bad.runtime.abyss.rulesRevision,value);}const old=cp(save);delete old.runtime.abyss.rulesRevision;assert.equal(new H.R(H.db,old).s.runtime.abyss.rulesRevision,undefined);return {unsupportedValues:[0,2,-1,'1',null],unmarkedSaveNotMigrated:true};
});
check('break_medicine_reasons_and_public_executor_agree_without_consumption',()=>{
 const r=fixture(4,2);r.giveItem('TRPG_BANDAGE',1);const n=r.itemCount('TRPG_BANDAGE'),why=r.abyssBreakReason('USE_ITEM',{item:'TRPG_BANDAGE',owner:'MOND_DILUC'});assert.match(why,/전투 치료품은 전투 중/);assert.equal(r.actionReason('USE_ITEM',{item:'TRPG_BANDAGE',owner:'MOND_DILUC'}),why);assert.throws(()=>r.action('USE_ITEM',{item:'TRPG_BANDAGE',owner:'MOND_DILUC'}),/전투 치료품은 전투 중/);assert.equal(r.itemCount('TRPG_BANDAGE'),n);return {reason:why,consumed:0};
});
check('break_food_still_heals_and_carries_native_effects_to_next_room',()=>{
 const r=fixture(4,2),id='MOND_DILUC',beforeHp=r.s.chars[id].hp;r.s.chars[id].hp=Math.max(1,beforeHp-3000);const hurt=r.s.chars[id].hp;r.giveItem('FOOD_SWEET_MADAME',1);const stock=r.itemCount('FOOD_SWEET_MADAME');assert.equal(r.abyssBreakReason('USE_ITEM',{item:'FOOD_SWEET_MADAME'}),null);r.action('USE_ITEM',{item:'FOOD_SWEET_MADAME',owner:id});assert(r.s.chars[id].hp>hurt);assert.equal(r.itemCount('FOOD_SWEET_MADAME'),stock-1);r.giveItem('FOOD_JADE_PARCELS',1);r.action('USE_ITEM',{item:'FOOD_JADE_PARCELS',owner:id});const hp=r.s.chars[id].hp,loaded=new H.R(H.db,JSON.parse(r.serialize()));loaded.action('ABYSS_ENTER',{floor:4});const actor=loaded.s.runtime.actors.find(a=>a.source===id);assert.equal(actor.hp,hp);assert(actor.statuses.some(s=>s.sourceItem==='FOOD_JADE_PARCELS'));assert.equal(loaded.s.pendingCombatEffects[id],undefined);return {healed:r.s.chars[id].hp-hurt,hpCarry:hp,buffInstalled:true};
});
check('break_other_actions_remain_blocked',()=>{
 const r=fixture(4,2);for(const type of ['MOVE','BUY','CRAFT','MEAL','PARTY_REPLACE','RECOVER'])assert.match(r.abyssBreakReason(type),/도전 중/);return {blocked:['MOVE','BUY','CRAFT','MEAL','PARTY_REPLACE','RECOVER']};
});
// Independent literals for the fresh numerical policies used by this initiative
// test. Do not derive them from the active runtime configuration or merely
// discard every differing actor field when comparing the historical opening.
const freshGrowthStats={
 field_boss_origin:{'FB_ANEMO_HYPOSTASIS#1':[18,19800,1760,198]},
 daily_boss_origin:{'BOSS_ANDRIUS#1':[25,20094,2466,248]},
 ley_line60:{'MON_MITACHURL_WOOD#1':[60,69259,25648,1753],'MON_HILI_FIGHTER#1':[60,23800,15680,1249],'MON_HILI_SHOOTER#1':[60,23800,15680,1249]}
};
const priorGrowthStats={
 field_boss_origin:{'FB_ANEMO_HYPOSTASIS#1':[18,18000,1600,180]},
 daily_boss_origin:{'BOSS_ANDRIUS#1':[25,20094,2055,236]},
 ley_line60:{'MON_MITACHURL_WOOD#1':[60,49471,8015,519],'MON_HILI_FIGHTER#1':[60,17000,4900,370],'MON_HILI_SHOOTER#1':[60,17000,4900,370]}
};
function startPair(spec,state){
 const s=state||cp(fixture(1).s);if(spec.map)s.global.CURRENT_MAP_ID=spec.map;
 const current=new H.R(H.db,cp(s)),legacy=new legacyApi.Runtime(H.db,cp(s)),rolledSpeeds=new Map();
 for(const r of [current,legacy]){const speeds=new Map(),native=r.combatStat;rolledSpeeds.set(r,speeds);r.combatStat=function(a,key){const n=native.call(this,a,key);if(key==='spd'&&this.s.runtime?.phase==='START'&&!speeds.has(a.id))speeds.set(a.id,n);return n;};}
 const oldOut=spec.start(legacy),out=spec.start(current),b=current.s.runtime,old=legacy.s.runtime;assert(b&&old);
 assert.equal(current.s.global.PRNG_STATE,legacy.s.global.PRNG_STATE);
 const expected=freshGrowthStats[spec.id],budgetChanges=[];
 if(expected){
  for(const [runtime,literals]of [[b,expected],[old,priorGrowthStats[spec.id]]]){
   const enemies=runtime.actors.filter(a=>a.side==='ENEMY');assert.deepEqual(cp(enemies.map(a=>a.id).sort()),Object.keys(literals).sort());
   for(const a of enemies){assert.equal(a.hp,a.maxHp);assert.deepEqual([a.level,a.maxHp,a.atk,a.def],literals[a.id]);}
  }
  const withoutBudgets=actors=>cp(actors).map(a=>{if(a.side==='ENEMY'){for(const key of ['hp','maxHp','atk','def'])delete a[key];}return a;});
  assert.deepEqual(withoutBudgets(b.actors),withoutBudgets(old.actors));
  for(const a of b.actors.filter(a=>a.side==='ENEMY'))budgetChanges.push({id:a.id,previous:priorGrowthStats[spec.id][a.id],current:expected[a.id]});
 }else assert.deepEqual(cp(b.actors),cp(old.actors));
 assert.equal(b.enemyBalanceRevision,1);assert.equal(old.enemyBalanceRevision,undefined);
 if(spec.id==='field_boss_origin'){assert.equal(b.fieldBoss.behaviorRevision,5);assert.equal(old.fieldBoss.behaviorRevision,5);assert.equal(b.fieldBoss.pressureRevision,1);assert.equal(old.fieldBoss.pressureRevision,undefined);}
 assert.deepEqual(cp(b.fields),cp(old.fields));assert.equal(b.order[0].id,'PLAYER_CUSTOM');assert.equal(b.cursor,0);assert.equal(b.turnStarted,null);assert(b.actors.every(a=>a.turns===0));assert.deepEqual(cp(b.order),cp(b.opening.initialOrder));assert.deepEqual(cp(out.result?.order||out.order),cp(current.combatOrderView()));
 const rows=b.actors.filter(a=>a.side==='ENEMY'&&!a.fbSummon).map(a=>{const before=rolledSpeeds.get(legacy).get(a.id),oldTurn=old.order.find(q=>q.id===a.id),q=b.order.find(q=>q.id===a.id),roll=oldTurn.score-before;assert(Number.isFinite(before));assert(roll>=0&&roll<=9);assert.equal(q.score-current.combatStat(a,'spd'),roll);return {source:a.source,initialRolledSpeed:before,finalSpeed:current.combatStat(a,'spd'),score:q.score,roll,swift:!!a.variant?.affixes.includes('SWIFT')};});
 return {current,legacy,rows,budgetChanges,rngUnchanged:true,actorsAndNumericStatsUnchanged:!expected,alliesAndNonBudgetActorStateUnchanged:true};
}
const growthSpecs=[
 {id:'talent_domain10',map:'MAP_D163_FORSAKEN_RIFT',start:r=>r.action('DOMAIN_START',{domain:'FORSAKEN_RIFT:10'})},
 {id:'ascension_domain10',map:'MAP_D163_VALLEY_OF_REMEMBRANCE',start:r=>r.action('DOMAIN_START',{domain:'VALLEY_OF_REMEMBRANCE:10',element:'PYRO'})},
 {id:'field_boss_origin',map:'MAP_V141_STORMBEARER_PASS',start:r=>r.startBattle(currentApi.fieldBosses.group('FB_ANEMO_HYPOSTASIS'),currentApi.growthV01522.bossChallengeOrigin('FB_ANEMO_HYPOSTASIS'))},
 {id:'daily_boss_origin',map:'MAP_WOLF_ARENA',start:r=>r.startBattle('EG_BOSS_ANDRIUS','MATERIAL_CHALLENGE:BOSS_ANDRIUS')},
 // Literal Mond-plains actors above belong to this declared native hourly
 // blossom reference. Device/CI start time must not select a different site.
 {id:'ley_line60',start:r=>{const reference=Date.parse('2026-10-10T14:00:00+09:00');r.actionStartedAt=reference;const site=r.leyLineStatus().blossoms.find(x=>x.region==='몬드'&&x.kind==='REVELATION');assert.equal(site.map,'MAP_MOND_PLAINS');r.s.global.CURRENT_MAP_ID=site.map;r.action('PLACE_ENTER',{place:'BOSS:'+site.route,mode:'BOSS'});r.actionStartedAt=reference;return r.action('BOSS_ROUTE',{route:site.route,tier:5});}}
];
for(const spec of growthSpecs)check('fresh_growth_enemy_final_speed_'+spec.id,()=>{
 const pair=startPair(spec),r=pair.current,save=JSON.parse(r.serialize()),loaded=new H.R(H.db,save);assert.deepEqual(cp(loaded.s),save);const oldSave=JSON.parse(pair.legacy.serialize()),oldLoaded=new H.R(H.db,oldSave);assert.deepEqual(cp(oldLoaded.s),oldSave);return {rows:pair.rows,budgetChanges:pair.budgetChanges,rngUnchanged:true,actorsAndNumericStatsUnchanged:pair.actorsAndNumericStatsUnchanged,alliesAndNonBudgetActorStateUnchanged:true,newAndLegacySavedQueuesPreserved:true};
});
check('random_swift_variant_actual_roll_includes_final_growth_speed',()=>{
 const state=cp(fixture(1).s);state.global.CURRENT_MAP_ID='MAP_MOND_FOREST';let found=null;
 // Variant rolls are SAVE_ID/battle-ID hashes, not shared PRNG rolls. Search actual
 // fresh battle IDs, keeping old/new identity and the shared PRNG identical.
 for(let i=1;i<=80;i++){const s=cp(state);s.global.SAVE_ID='V1626-SWIFT-'+i;s.global.LAST_COMMITTED_ACTION_ID=s.global.SAVE_ID+':'+s.global.LAST_COMMITTED_ACTION_SEQ;const candidate=startPair({start:r=>r.startBattle('EG_MOND_HILI_PATROL','RANDOM')},s);if(candidate.rows.some(x=>x.swift)){found={...candidate,attempts:i};break;}}
 assert(found,'actual native SWIFT variant sampled');return {rows:found.rows,actualVariant:true,battleIdsTried:found.attempts,rngUnchanged:true,actorsAndNumericStatsUnchanged:true};
});
check('pending_saved_growth_tune_probe_without_startup_record_does_not_rewrite_queue',()=>{
 const {legacy}=startPair({map:'MAP_MOND_FOREST',start:r=>r.startBattle('EG_MOND_HILI_PATROL','EXPLICIT')}),saved=JSON.parse(legacy.serialize()),loaded=new H.R(H.db,saved),b=loaded.s.runtime,a=b.actors.find(a=>a.side==='ENEMY');const before=cp(b.order),initial=cp(b.opening.initialOrder);a.growthScaled=false;loaded.tuneGrowthEnemy(a,b,a.level);assert.deepEqual(cp(b.order),before);assert.deepEqual(cp(b.opening.initialOrder),initial);return {legacyQueueNotCorrectedOnLoadOrStandaloneTune:true};
});
const result={scope:'Controlled rule contracts, not native player victories or population clear rates.',sourceSHA256:Object.fromEntries(['runtime_abyss.js','runtime_formations.js','runtime_growth_v01522.js','runtime_balance_admin_v01623.js'].map(file=>['source/'+file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'source',file))).digest('hex')])),summary:{checks:checks.length,passed:checks.length,errors:0},checks};
const outArg=process.argv.indexOf('--out');if(outArg>=0){const out=path.resolve(process.argv[outArg+1]);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'contracts.json'),JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify(result.summary));
