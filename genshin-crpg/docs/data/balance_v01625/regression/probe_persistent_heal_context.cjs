'use strict';
// Isolated native wrappers; synthetic cast contexts expose forwarding of the
// real heal meta argument. This is not a scheduled combat or a victory claim.
const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../../../..'),H=require(path.join(ROOT,'tools/audit_protagonist_v01618.cjs'));
const env=H.load(ROOT),r=H.setup(env,{level:60,team:['LIYUE_QIQI','MOND_JEAN','MOND_AMBER'],route:'ROUTE_TRAVELER',seed:717,map:'MAP_MOND_PLAINS',gear:'none',talent:10});
r.startBattle('EG_BOSS_AZHDAHA','EXPLICIT',{confirmed:true});
const a=id=>r.s.runtime.actors.find(x=>x.source===id),owner=a('LIYUE_QIQI'),target=a('PLAYER_CUSTOM'),other=a('MOND_JEAN'),rows=[];
for(const sourceKind of ['FOLLOWUP','FIELD'])for(const context of ['NONE','OWN_E','OTHER_Q']){
 target.hp=1;delete r._consCast;delete r._rhythm;
 if(context==='OWN_E'){r._consCast={a:owner,kind:'e'};r._rhythm={actor:owner.id,dmg:1.6,support:1.6};}
 if(context==='OTHER_Q'){r._consCast={a:other,kind:'q'};r._rhythm={actor:other.id,dmg:1.5,support:1.5};}
 let nominal=null;r._auditHealNominal=(to,n)=>{nominal=n;};
 const out=r.heal(target,100,owner.name,owner.id,{sourceKind,sourceCardId:'LIYUE_QIQI_Q'});
 rows.push({sourceKind,context,raw:100,nominal,actual:out,targetDelta:target.hp-1,ownerETalent:r.premiumTalentMultiplier(owner,'e')});
}
const result={scope:'Isolated native wrapper forwarding witness with explicit synthetic cast context; not natural action timing or combat-balance proof.',revision:r.s.runtime.characterBalanceRevision,rows,persistentOwnCastDiffersFromControl:rows.filter(x=>x.context==='OWN_E').some(x=>x.actual!==rows.find(y=>y.sourceKind===x.sourceKind&&y.context==='NONE').actual),hashes:Object.fromEntries(['source/runtime_exclusive_weapons.js','source/runtime_constellations_v01411.js','source/runtime_skill_rhythm.js'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,f))).digest('hex')]))};
console.log(JSON.stringify(result,null,2));
