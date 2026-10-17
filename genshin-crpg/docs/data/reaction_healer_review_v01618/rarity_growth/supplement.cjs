'use strict';
const reviewOutputDir=process.env.CRPG_AUDIT_OUT||require('node:path').join(require('node:os').tmpdir(),'crpg-reaction-healer-review','rarity_growth');require('node:fs').mkdirSync(reviewOutputDir,{recursive:true});

const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=(process.env.CRPG_AUDIT_ROOT||require('node:path').resolve(__dirname,'../../../..')),OUT=reviewOutputDir;
const {load,setup}=require('../helpers/audit_protagonist_v01618.cjs');
const clone=x=>JSON.parse(JSON.stringify(x)),o=JSON.parse(fs.readFileSync(path.join(OUT,'observation.json'))),env=load(ROOT);
const r=setup(env,{level:25,team:['MOND_DILUC','LIYUE_GANYU','MOND_JEAN'],gear:'craft',enhance:3,talent:4});
for(const id of ['MOND_DILUC','MOND_JEAN']){r.giveItem('STELLA_'+id,2);for(let i=0;i<2;i++)r.action('CONSTELLATION_UNLOCK',{char:id});}
const support=r.combatSupportReport(),owners=[...new Set(support.filter(x=>x.supported&&!x.reason).map(x=>x.owner))].filter(id=>r.tables['07_CHAR_DB'].has(id));
o.coverage.currentSupportedCompanionOwners=owners;
o.coverage.currentSupportedCompanionCount=owners.length;
o.coverage.currentSupportedMissingNames=owners.filter(id=>!env.api.constellationsV01411.names[id]);
o.coverage.currentSupportedMissingEffects=owners.filter(id=>!env.api.constellationsV01411.effects[id]);
const src=fs.readFileSync(path.join(ROOT,'source/runtime_constellations_v01411.js'),'utf8'),handlers=[...new Set([...src.matchAll(/fx\.t==='([^']+)'/g)].map(m=>m[1]))];
o.coverage.effectTypesMissingLiteralHandler=Object.keys(o.coverage.effectTypes).filter(t=>!handlers.includes(t));
o.method.coverage='DB READY markers include future non-executable cards. Current live-supported owners are obtained from final combatSupportReport() supported=true/reason empty, not READY alone.';
o.wishPools=clone(env.api.wishV01411.pools);
r.startBattle('EG_MOND_HILI_PATROL');const b=r.s.runtime,j=b.actors.find(a=>a.source==='MOND_JEAN'),d=b.actors.find(a=>a.source==='MOND_DILUC'),enemy=b.actors.find(a=>a.side==='ENEMY');
r.consAfterCast(j,'MOND_JEAN_E','e',{targetActor:enemy});r.applyDamage(enemy,d,1,{element:'물리',sourceKind:'OBSERVATION'});
const hadBeforeSettlement=b.actors.filter(a=>a.side==='ALLY').map(a=>({id:a.source,consStatuses:clone(a.statuses.filter(s=>s.cons))}));
const receipt=r.finishBattle(false),settled={receipt:clone(receipt),playerStatuses:clone(r.s.playerStatuses),jeanStatuses:clone(r.s.chars.MOND_JEAN.statuses),dilucStatuses:clone(r.s.chars.MOND_DILUC.statuses)};
r.startBattle('EG_MOND_HILI_PATROL');const cleanNewBattle=r.s.runtime.actors.filter(a=>a.side==='ALLY').map(a=>({id:a.source,consStatuses:clone(a.statuses.filter(s=>s.cons)),shields:clone(a.shields)}));
o.actualNativeSettlementProbe={method:'One virtual fixture native cons hook / damage followed by native finishBattle(false), then startBattle; not a legitimate campaign victory or public action test.',hadBeforeSettlement,settled,cleanNewBattle,consStatusesCleared:cleanNewBattle.every(a=>!a.consStatuses.length)};
o.fingerprintAfterSupplement=env.fingerprint;
o.supplementSameSourceFingerprint=o.fingerprint===env.fingerprint;
fs.writeFileSync(path.join(OUT,'observation.json'),JSON.stringify(o,null,2)+'\n');
console.log(JSON.stringify({supported:owners.length,missing:o.coverage.currentSupportedMissingNames,unhandledType:o.coverage.effectTypesMissingLiteralHandler,consStatusesCleared:o.actualNativeSettlementProbe.consStatusesCleared,sameFingerprint:o.supplementSameSourceFingerprint},null,2));
