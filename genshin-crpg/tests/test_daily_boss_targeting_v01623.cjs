'use strict';
// Native card execution and save boundaries, not a full-fight difficulty claim.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),H=require('../tools/audit_protagonist_v01618.cjs');
const ROOT=path.resolve(__dirname,'..'),env=H.load(ROOT),{R,db}=env,cp=x=>JSON.parse(JSON.stringify(x)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const ORIGIN='MATERIAL_CHALLENGE:LIYUE_TARTAGLIA_FARM',TEAM=['LIYUE_ZHONGLI','MOND_DILUC','MOND_JEAN'];
const output=process.argv[2]||ROOT+'/../v01623-daily-targeting-contracts.json',rawDbBefore=sha(JSON.stringify(db));
const report={version:'0.16.23',scope:'Only fresh daily Tartaglia AoE respects its selected primary and existing nearest-neighbor order. Unmarked saves/story/other bosses retain old behavior; card coefficients, limits, guard and existing TAUNT AI branch remain native.',fixturePolicy:'Declared owned Lv60/phase6 four-person Traveler party, legal +10/cap10 crafted gear, max base talents and story access. Card phase/KO/TAUNT and deterministic dice are declared boundary fixtures. Native public daily entry and COMBAT_BEGIN; no forced victories, no balance/win-rate claim.',fingerprint:env.fingerprint,sourceSHA256:sha(fs.readFileSync(ROOT+'/source/runtime_liyue_combat.js')),checks:[]};
function check(id,fn){try{report.checks.push({id,passed:true,evidence:fn()});console.log('PASS '+id);}catch(e){report.checks.push({id,passed:false,error:e.stack});console.error('FAIL '+id+' '+e.message);}}
function start({origin=ORIGIN,group='EG_BOSS_TARTAGLIA',daily=true,begin=true}={}){
 const r=H.setup(env,{level:60,route:'ROUTE_TRAVELER',team:TEAM,seed:717,map:group==='EG_BOSS_AZHDAHA'?'MAP_AZHDAHA_DOMAIN':'MAP_LIYUE_GOLDEN_HOUSE',enhance:10,talent:10});
 for(const inv of r.s.inventory.filter(i=>i.equip)){inv.enhancementCap=10;if(!r.enhancementHasGain(inv))inv.enhance=0;}
 r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;for(const id of TEAM)r.s.chars[id].hp=r.character(id).maxHp;
 if(daily)r.action('LIYUE_ARTIFACT_CHALLENGE',{kind:'TARTAGLIA'});else r.startBattle(group,origin,{confirmed:true,companions:TEAM});
 if(begin)r.action('COMBAT_BEGIN');r.die=()=>50;r.random=()=>.5;
 // Public actions commit a cloned state: retain only the committed actor references.
 const b=r.s.runtime;assert(b,'Battle remains at the native opening/player boundary');
 return{r,b,boss:b.actors.find(a=>a.side==='ENEMY'),allies:b.actors.filter(a=>a.side==='ALLY'),me:b.actors.find(a=>a.source==='PLAYER_CUSTOM')};
}
function card(f,id){const c=f.r.actorCards(f.boss).find(c=>c.id===id);assert(c&&c.ready&&c.enemy,'Real ready enemy card');f.boss.liyuePhase=Number(c.trigger.match(/ACTIVE_IF_PHASE=(\d)/)?.[1]||1);f.boss.cooldowns[id]=0;assert.equal(f.r.cardReason(f.boss,c),'');return c;}
function execute(f,id,target){const c=card(f,id),calls=[],damage=f.r.damage;f.r.damage=function(a,t,k,e,o={}){if(a.id===f.boss.id&&o.card===id)calls.push({target:t.id,source:t.source,k,element:e,noAura:!!o.noAura,hpBefore:t.hp});return damage.call(this,a,t,k,e,o);};try{f.r.executeCard(f.boss,c,target);}finally{f.r.damage=damage;}return{c,calls};}
const aoe=['ECARD_TARTAGLIA_HYDRO_SWEEP','ECARD_TARTAGLIA_ELECTRO_ARC','ECARD_TARTAGLIA_FOUL_LEGACY_WAVE'];
check('new_daily_marker_precedes_enemy_execution_and_survives_pending_save',()=>{
 const f=start({begin:false});assert.equal(f.b.origin,ORIGIN);assert.equal(f.b.dailyTargetingRevision,1);assert.equal(f.b.opening.state,'PENDING');assert(f.b.actors.every(a=>a.turns===0));assert(!f.b.log.some(e=>String(e.card||'').startsWith('ECARD_TARTAGLIA_')));
 const loaded=new R(db,JSON.parse(f.r.serialize()));assert.equal(loaded.s.runtime.dailyTargetingRevision,1);assert.equal(loaded.s.runtime.opening.state,'PENDING');assert.deepEqual(cp(loaded.s.runtime),cp(f.b));
 const executions=[],native=loaded.executeCard;loaded.executeCard=function(a,c,...args){if(a.source==='BOSS_TARTAGLIA'){assert.equal(this.s.runtime.dailyTargetingRevision,1);executions.push(c.id);}return native.call(this,a,c,...args);};loaded.action('COMBAT_BEGIN');
 loaded.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});assert(executions.length>0);return{pendingMarker:1,noEnemyActionBeforeMarker:true,firstEnemyExecutions:executions};
});
for(const id of aoe)check('new_daily_selected_back_ally_first_max2:'+id,()=>{
 const f=start(),selected=f.allies.find(a=>a.source==='MOND_JEAN'),alive=f.allies.filter(a=>a.hp>0),expected=f.r.combatOrderedTargets(f.boss,alive,selected.id).slice(0,2).map(a=>a.id),{calls}=execute(f,id,selected.id),aoeCalls=calls.filter(c=>!c.noAura);
 assert.deepEqual(aoeCalls.map(c=>c.target),cp(expected));assert.equal(aoeCalls[0].target,selected.id);assert.equal(aoeCalls.length,2);assert(calls.every(c=>alive.some(a=>a.id===c.target)));assert.equal(new Set(aoeCalls.map(c=>c.target)).size,2);
 if(id==='ECARD_TARTAGLIA_FOUL_LEGACY_WAVE'){assert.equal(calls.length,3);assert.equal(calls[2].target,selected.id);assert.equal(calls[2].k,.25);assert.equal(calls[2].element,'ELECTRO');assert.equal(calls[2].noAura,true);}else assert.equal(calls.length,2);
 return{selected:selected.source,ordered:aoeCalls.map(c=>c.source),calls};
});
check('new_daily_dead_primary_and_unknown_primary_use_legal_alive_fallback',()=>{
 const rows=[];for(const mode of ['DEAD','UNKNOWN']){const f=start(),dead=f.allies.find(a=>a.source==='MOND_JEAN');dead.hp=0;const target=mode==='DEAD'?dead.id:'NO_SUCH_ACTOR',eligible=f.allies.filter(a=>a.hp>0),expected=f.r.combatOrderedTargets(f.boss,eligible,target).slice(0,2).map(a=>a.id),{calls}=execute(f,'ECARD_TARTAGLIA_HYDRO_SWEEP',target);assert.deepEqual(calls.map(c=>c.target),cp(expected));assert(calls.every(c=>c.target!==dead.id));assert.equal(calls.length,2);rows.push({mode,calls});}return rows;
});
check('new_daily_followup_does_not_retarget_after_primary_ko',()=>{const f=start(),selected=f.allies.find(a=>a.source==='MOND_JEAN');selected.hp=1;const{calls}=execute(f,'ECARD_TARTAGLIA_FOUL_LEGACY_WAVE',selected.id);assert.equal(selected.hp,0);assert.equal(calls.length,2);assert.equal(calls[0].target,selected.id);assert(calls.every(c=>!c.noAura));return{primaryKo:true,aoePackets:2,noFallbackFollowup:true,calls};});
check('new_daily_native_guard_still_halves_selected_primary_damage',()=>{
 function hit(guard){const f=start(),me=f.me;if(guard){const c=f.r.actorCards(me).find(c=>c.id==='PLAYER_BASIC_GUARD');assert(c);f.r.executeCard(me,c,me.id);assert.equal(me.guard,true);}const hp=me.hp,{calls}=execute(f,'ECARD_TARTAGLIA_HYDRO_SWEEP',me.id);assert.equal(calls[0].target,me.id);return hp-me.hp;}const normal=hit(false),guarded=hit(true);assert(normal>0);assert(Math.abs(guarded-normal*.5)<=1);return{normal,guarded,existingGuardFactor:.5};
});
check('new_daily_existing_taunt_ai_branch_retains_supplied_primary',()=>{
 const f=start(),selected=f.allies.find(a=>a.source==='MOND_JEAN'),id='ECARD_TARTAGLIA_HYDRO_SWEEP',wanted=card(f,id);for(const c of f.r.actorCards(f.boss))if(c.id!==id)f.boss.cooldowns[c.id]=99;
 // Existing TAUNT detection skips the weighted picker; this is a declared state probe.
 f.boss.statuses.push({id:'STATUS_TAUNT',rounds:1});const calls=[],native=f.r.damage;f.r.damage=function(a,t,k,e,o={}){if(a.id===f.boss.id&&o.card===id)calls.push(t.id);return native.call(this,a,t,k,e,o);};try{f.r.aiTurn(f.boss,[selected,...f.allies.filter(a=>a!==selected)]);}finally{f.r.damage=native;}
 assert.equal(calls.length,2);assert.equal(calls[0],selected.id);assert.equal(f.boss.cooldowns[wanted.id],wanted.cooldown);return{declaredTauntState:true,primary:selected.source,calls};
});
for(const id of ['ECARD_TARTAGLIA_HYDRO_SHOT','ECARD_TARTAGLIA_ELECTRO_THRUST','ECARD_TARTAGLIA_FOUL_LEGACY_STRIKE'])check('new_daily_existing_single_target_unchanged:'+id,()=>{const f=start(),selected=f.allies.find(a=>a.source==='MOND_JEAN'),{calls}=execute(f,id,selected.id);assert(calls.length>0);assert(calls.every(c=>c.target===selected.id));return{selected:selected.source,calls};});
for(const id of aoe)check('saved_unmarked_daily_keeps_front_slice:'+id,()=>{
 const f=start();delete f.b.dailyTargetingRevision;const loaded=new R(db,JSON.parse(f.r.serialize()));assert.equal(loaded.s.runtime.dailyTargetingRevision,undefined);loaded.die=()=>50;loaded.random=()=>.5;loaded.newRound();assert.equal(loaded.s.runtime.dailyTargetingRevision,undefined);const b=loaded.s.runtime,g={r:loaded,b,boss:b.actors.find(a=>a.source==='BOSS_TARTAGLIA'),allies:b.actors.filter(a=>a.side==='ALLY')},selected=g.allies.find(a=>a.source==='MOND_JEAN'),front=g.allies.filter(a=>a.hp>0).slice(0,2).map(a=>a.id),{calls}=execute(g,id,selected.id);assert.deepEqual(calls.filter(c=>!c.noAura).map(c=>c.target),cp(front));if(id==='ECARD_TARTAGLIA_FOUL_LEGACY_WAVE')assert.equal(calls[2].target,front[0]);return{unmarkedPreserved:true,selectedIgnoredAsBefore:true,calls};
});
check('story_tartaglia_retains_old_targets_and_has_no_marker',()=>{const f=start({daily:false,origin:'STORY:TRV_LY3_TARGETING_BOUNDARY'});assert.equal(f.b.dailyTargetingRevision,undefined);const selected=f.allies.find(a=>a.source==='MOND_JEAN'),front=f.allies.filter(a=>a.hp>0).slice(0,2).map(a=>a.id),{calls}=execute(f,'ECARD_TARTAGLIA_FOUL_LEGACY_WAVE',selected.id);assert.deepEqual(calls.slice(0,2).map(c=>c.target),cp(front));assert.equal(calls[2].target,front[0]);return{storyOriginBoundary:true,markerAbsent:true,calls};});
check('azhdaha_and_osial_do_not_receive_daily_tartaglia_marker',()=>{const rows=[];for(const group of ['EG_BOSS_AZHDAHA','EG_BOSS_OSIAL']){const f=start({daily:false,group,origin:ORIGIN,begin:false});assert.equal(f.b.dailyTargetingRevision,undefined);rows.push({group,enemy:f.boss.source,markerAbsent:true});}return rows;});
check('daily_targeting_save_values_and_scope_are_validated',()=>{
 const f=start();for(const value of [0,-1,2,'1',null,false,{}]){const s=JSON.parse(f.r.serialize());s.runtime.dailyTargetingRevision=value;assert.throws(()=>new R(db,s),/대상 선택/);}const s=JSON.parse(f.r.serialize());s.runtime.origin='STORY:TRV_LY3_TARGETING_BOUNDARY';assert.throws(()=>new R(db,s),/대상 선택/);const azh=start({daily:false,group:'EG_BOSS_AZHDAHA',origin:ORIGIN,begin:false}),wrongBoss=JSON.parse(azh.r.serialize());wrongBoss.runtime.dailyTargetingRevision=1;assert.throws(()=>new R(db,wrongBoss),/대상 선택/);return{accepted:['unmarked',1],rejected:[0,-1,2,'1',null,false,'object','wrong_origin','wrong_boss']};
});
const rawDbAfter=sha(JSON.stringify(db));assert.equal(rawDbAfter,rawDbBefore);report.rawDbBeforeSHA256=rawDbBefore;report.rawDbAfterSHA256=rawDbAfter;report.rawDbUnchanged=true;
report.total=report.checks.length;report.passed=report.checks.filter(c=>c.passed).length;report.failed=report.total-report.passed;fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,total:report.total,passed:report.passed,failed:report.failed,rawDbUnchanged:true}));if(report.failed)process.exitCode=1;
