'use strict';
const reviewOutputDir=process.env.CRPG_AUDIT_OUT||require('node:path').join(require('node:os').tmpdir(),'crpg-reaction-healer-review','rarity_growth');require('node:fs').mkdirSync(reviewOutputDir,{recursive:true});

const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=(process.env.CRPG_AUDIT_ROOT||require('node:path').resolve(__dirname,'../../../..')),OUT=reviewOutputDir;
const {load,setup}=require('../helpers/audit_protagonist_v01618.cjs');
const clone=x=>JSON.parse(JSON.stringify(x)),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,f))).digest('hex');
const files=['content/db.json','source/index.html','source/runtime.js','source/runtime_rarity_v01412.js','source/runtime_growth_v01522.js','source/runtime_premium_v0148.js','source/runtime_constellations_v01411.js','source/runtime_combat.js','source/runtime_status_v01522.js','source/runtime_status_catalog_v01522.js','source/runtime_coop_v0153.js','tools/audit_protagonist_v01618.cjs'];
const before=Object.fromEntries(files.map(f=>[f,hash(f)])),env=load(ROOT),names=env.api.constellationsV01411.names,effects=env.api.constellationsV01411.effects;
const r=setup(env,{level:25,gear:'none',talent:4}),rawRows=new Map(env.db['07_CHAR_DB'].slice(1).map(x=>[x[0],x]));
const namedIds=Object.keys(names).filter(id=>r.tables['07_CHAR_DB'].has(id));
const cardOwners=[...new Set(r.rows('08_SKILL_CARD_DB').filter(x=>x[35]==='READY').map(x=>x[2]))].filter(id=>r.tables['07_CHAR_DB'].has(id));
const roster=namedIds.map(id=>({id,name:r.premiumCharName(id),rarity:r.rarityOf(id),rawBase:{hp:rawRows.get(id)[7],atk:rawRows.get(id)[8],def:rawRows.get(id)[9]},installedBase:{hp:r.row('07_CHAR_DB',id)[7],atk:r.row('07_CHAR_DB',id)[8],def:r.row('07_CHAR_DB',id)[9]},cards:r.talentCards(id),nodes:r.constellationInfo(id).nodes,effects:effects[id]}));
const coverage={nameCount:Object.keys(names).length,effectCount:Object.keys(effects).length,namedCompanionCount:namedIds.length,readyCardOwnerCount:cardOwners.length,readyOwnersMissingNames:cardOwners.filter(id=>id!=='PLAYER_CUSTOM'&&!names[id]),readyOwnersMissingEffects:cardOwners.filter(id=>id!=='PLAYER_CUSTOM'&&!effects[id]),namedMissingNodeData:[],effectTypes:{},baseRowsWithoutKnownRarity:[...rawRows.keys()].filter(id=>id!=='PLAYER_CUSTOM'&&!names[id])};
for(const [id,N] of Object.entries(names)){
 if(N[6].length!==6||!['eq','qe'].includes(N[5]))coverage.namedMissingNodeData.push({id,reason:'Names/talent kinds'});
 for(const n of [1,2,4,6]){const node=effects[id]?.[n];if(!node?.text||!node?.fx?.length)coverage.namedMissingNodeData.push({id,n,reason:'Missing text/effects'});for(const fx of node?.fx||[])coverage.effectTypes[fx.t]=(coverage.effectTypes[fx.t]||0)+1;}
}
const stats=[];
for(const level of [1,10,20,25,30,40,50,60]){
 const phase=env.api.growthV01522.phaseFor(level);r.s.global.PLAYER_LEVEL_STATE=level;r.s.ascensions.PLAYER_CUSTOM=phase;
 for(const id of namedIds){r.s.chars[id].level=level;r.s.ascensions[id]=phase;r.s.talents[id]={na:1,e:1,q:1};}
 r.recalculate();
 for(const id of namedIds){const a=r.character(id);stats.push({id,name:a.name,rarity:r.rarityOf(id),level,phase,maxHp:a.maxHp,atk:a.atk,def:a.def,effectiveDef:r.combatStat(a,'def'),spd:a.spd,baseAttack:a.baseAttack,reactionBase:r.reactionBase(a)});}
}
function grantAndUnlock(runtime,id,n){
 runtime.giveItem('STELLA_'+id,n);const receipts=[];
 for(let step=0;step<n;step++)receipts.push(runtime.action('CONSTELLATION_UNLOCK',{char:id}));
 runtime.validateSave(clone(runtime.s));return receipts;
}
const fixtureTests=[];
for(const id of namedIds){
 const q=setup(env,{level:25,team:[id],gear:'craft',enhance:3,talent:4}),initial={actor:q.character(id),talents:q.talentLevels(id)};
 const receipts=grantAndUnlock(q,id,6),unlocked={actor:q.character(id),talents:q.talentLevels(id)};
 q.startBattle('EG_MOND_HILI_PATROL');const actor=q.s.runtime.actors.find(x=>x.source===id);
 fixtureTests.push({id,name:q.premiumCharName(id),rarity:q.rarityOf(id),before:initial,after:unlocked,publicUnlocks:receipts.map(x=>({ok:x.ok,level:x.result.level})),itemRemaining:q.itemCount('STELLA_'+id),activeEffects:clone(q.consFx(actor)),hpUnchanged:initial.actor.maxHp===unlocked.actor.maxHp,atkUnchanged:initial.actor.atk===unlocked.actor.atk,defUnchanged:initial.actor.def===unlocked.actor.def});
}
const jean=setup(env,{level:25,team:['MOND_DILUC','LIYUE_GANYU','MOND_JEAN'],gear:'none',talent:4});
grantAndUnlock(jean,'MOND_DILUC',2);grantAndUnlock(jean,'MOND_JEAN',2);jean.startBattle('EG_MOND_HILI_PATROL');
const jb=jean.s.runtime,J=jb.actors.find(x=>x.source==='MOND_JEAN'),D=jb.actors.find(x=>x.source==='MOND_DILUC'),E=jb.actors.find(x=>x.side==='ENEMY');
const snap=label=>({label,round:jb.round,party:jb.actors.filter(x=>x.side==='ALLY').map(a=>({id:a.source,hp:a.hp,maxHp:a.maxHp,rawAtk:a.atk,atk:jean.combatStat(a,'atk'),rawDef:a.def,def:jean.combatStat(a,'def'),spd:jean.combatStat(a,'spd'),shields:clone(a.shields),statuses:clone(a.statuses)}))});
const jeanProbe=[snap('before')];
// Interpret the native after-cast hook without changing opponents or autoplaying them.
jean.consAfterCast(J,'MOND_JEAN_E','e',{targetActor:E});jeanProbe.push(snap('native Jean E after-cast hook'));
jean.consAfterCast(J,'MOND_JEAN_E','e',{targetActor:E});jeanProbe.push(snap('same-round second hook: refresh, no duplicate stack'));
for(let n=0;n<3;n++){jean.roundEnd();jeanProbe.push(snap('native roundEnd '+(n+1)));}
const dilucProbe=[];
for(let n=1;n<=4;n++){const hp=D.hp;jean.applyDamage(E,D,1,{element:'물리',sourceKind:'OBSERVATION'});dilucProbe.push({hit:n,hpLost:hp-D.hp,rawAtk:D.atk,atk:jean.combatStat(D,'atk'),status:clone(D.statuses.find(x=>x.id==='CONS_DILUC_2'))});}
const persistedSnapshot={sourceStatuses:clone(jean.s.chars.MOND_JEAN.statuses||null),sourceDilucStatuses:clone(jean.s.chars.MOND_DILUC.statuses||null)};
// Native initCombatActor on fresh character re-establishes a clean battle actor; no statuses live in source chars.
const freshActor=jean.initCombatActor(jean.character('MOND_JEAN'),4);
const formulaByPhase=Array.from({length:7},(_,phase)=>({phase,hpRatioForIdenticalAuthoredBaseNoEquipment:1.1*(1+.24*phase)/(1+.16*phase),atkDefRatioForIdenticalAuthoredBaseNoEquipment:1.1*(1+.28*phase)/(1+.20*phase)}));
const talentCurve=env.api.premiumV0148?.talent||null;
const after=Object.fromEntries(files.map(f=>[f,hash(f)]));
const output={checkedAt:new Date().toISOString(),runtimeRoot:ROOT,fingerprint:env.fingerprint,sourceHashes:before,unchanged:Object.keys(before).every(f=>before[f]===after[f]),method:{readonly:true,rarityStats:'Installed runtime rows plus final character/combatStat wrappers; no artifact, food, bond, or constellation in baseline.',c6:'Diagnostic ownership/levels/legal minimum phases/crafted +3 gear/base talents 4 granted; six STELLA items granted and six native public CONSTELLATION_UNLOCK actions validated per companion. Acquisition grind is excluded.',jeanHook:'Native consAfterCast and roundEnd interpreter probes, not a sampled full public combat campaign; native enemies are untouched.',certainty:'Definition/handler coverage is not proof every condition triggers as intended in a full combat.'},dbCharacterSchema:env.db['07_CHAR_DB'][0],coverage,formulaByPhase,roster,stats,fixtureTests,jeanC2Probe:jeanProbe,dilucC2Probe:dilucProbe,battlePersistenceProbe:{...persistedSnapshot,freshActorStatuses:clone(freshActor.statuses),freshActorShields:clone(freshActor.shields)},talentCurve};
fs.writeFileSync(path.join(OUT,'observation.json'),JSON.stringify(output,null,2)+'\n');
fs.writeFileSync(path.join(OUT,'sourcehash.json'),JSON.stringify({fingerprint:env.fingerprint,sourceHashes:before,afterHashes:after,unchanged:output.unchanged},null,2)+'\n');
console.log(JSON.stringify({out:path.join(OUT,'observation.json'),coverage,fixtureCount:fixtureTests.length,unchanged:output.unchanged,jeanSteps:jeanProbe.map(x=>({label:x.label,round:x.round,consStatusCount:x.party[0].statuses.filter(s=>s.id==='CONS_JEAN_2').length,atk:x.party[0].atk}))},null,2));
module.exports={grantAndUnlock};
