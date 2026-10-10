'use strict';
const reviewOutputDir=process.env.CRPG_AUDIT_OUT||require('node:path').join(require('node:os').tmpdir(),'crpg-reaction-healer-review','chasm_gap');require('node:fs').mkdirSync(reviewOutputDir,{recursive:true});

const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const {env,cp}=require('../dendro/probe.cjs'),E=env(),H=require('../helpers/audit_protagonist_v01618.cjs');
const arg=k=>{const n=process.argv.indexOf(k);return n<0?null:process.argv[n+1];};
const map=process.argv[2]||'MAP_CHASM_DEEP',tier=Number(process.argv[3]||3),pilot=process.argv.includes('--pilot'),suffix=arg('--label')||'';
const constScreenshot={PLAYER_CUSTOM:3,MOND_DILUC:2,LIYUE_GANYU:0,MOND_JEAN:2};
const allTeams=[
 {name:'FOUR_ATTACK',team:['LIYUE_XIANGLING','LIYUE_XINGQIU','MOND_FISCHL']},
 {name:'FOUR_HEAL',team:['LIYUE_XIANGLING','LIYUE_XINGQIU','MOND_BARBARA']},
 {name:'FIVE_HYBRID',team:['MOND_DILUC','MOND_JEAN','LIYUE_KEQING']},
 {name:'FIVE_DEFENSIVE',team:['LIYUE_ZHONGLI','MOND_DILUC','MOND_JEAN']},
 {name:'FIVE_ATTACK',team:['MOND_DILUC','LIYUE_KEQING','LIYUE_XIAO']},
 {name:'SCREENSHOT_C0',team:['MOND_DILUC','LIYUE_GANYU','MOND_JEAN']},
 {name:'SCREENSHOT_C232',team:['MOND_DILUC','LIYUE_GANYU','MOND_JEAN'],constellations:constScreenshot}
];
let teams=map==='MAP_CHASM_DEEP'?allTeams:allTeams.filter(x=>['FOUR_ATTACK','SCREENSHOT_C232'].includes(x.name));
if(process.argv.includes('--fourc6'))teams=teams.filter(x=>x.name.startsWith('FOUR_')).map(x=>({...x,name:x.name+'_C6',constellations:Object.fromEntries(x.team.map(id=>[id,6]))}));
if(process.argv.includes('--screenshot'))teams=teams.filter(x=>x.name.startsWith('SCREENSHOT'));
if(pilot)teams=teams.filter(x=>['FOUR_ATTACK','SCREENSHOT_C232'].includes(x.name));
const out={map,enhance:tier,fingerprint:E.fingerprint,assumptions:{readOnly:true,allInitialLevel:25,allLevelsAssumption:'Companion levels are absent from user screenshot; equal initial Lv25 is a declared representative assumption, not user save reconstruction.',equipment:'same craft weapons/reinforced leather/healer brooch, enhancement +3 or +6, no artifacts',talents:'legal phase2 base2 or4, effective constellation levels derived natively (Traveler C3 adds Q+3)',actions:'public WAIT 60min natural authored encounter pools followed by COMBAT_BEGIN/public COMBAT, Traveler Q then HOLD E then basics; native companion AI and healing; no forced encounter, no enemy edits or RNG edits after seed',carry:'3 consecutive field fights from one full-HP start, native XP/level-up/rewards/HP/PRNG carry; no inn, food, REST, RECOVER, or forced heal between fights; actual defeat stops immediately',sampleLimit:'not a human strategy optimum or promise, WAIT is encounter witness not measured farming route/time; do not identify Lost Valley domain as screenshot'},rows:[],errors:[]};
const stem=path.join(reviewOutputDir,`campaign_${map}_${tier}${pilot?'_pilot':''}${suffix?'_'+suffix:''}`);
function party(r){return cp(H.hp(r));}
function snapshot(r){const b=r.s.runtime;return b?{group:b.group,origin:b.origin,round:b.round,balance:cp(b.growthBalance),actors:cp(b.actors.map(a=>({...a,combatDef:r.combatStat(a,'def'),consLevel:a.side==='ALLY'?r.constellationLevel(a.source):undefined,immunities:a.side==='ENEMY'?['불','물','얼음','번개','바람','바위','풀','물리'].filter(el=>r.hasElementImmunity(a,el)):undefined})))}:null;}
for(const spec of teams)for(const talent of (arg('--talent')?[Number(arg('--talent'))]:(pilot?[2]:[2,4])))for(const seed of (arg('--seeds')?arg('--seeds').split(',').map(Number):(pilot?[717]:[717,925,4242]))){
 let row;
 try{
 const r=H.setup(E,{level:25,map,team:spec.team,route:'ROUTE_TRAVELER',gear:'craft',enhance:tier,talent,seed});
 // Declared ownership constellation fixture, persisted legal 0..6 values; no bonus/talent override.
 r.s.constellations=cp(spec.constellations||{});r.recalculate();
 const meter=H.observe(E,r);
 row={name:spec.name,map,enhance:tier,talent,seed,constellations:cp(r.s.constellations),fixtureHp:party(r),talents:cp(r.s.talents),growth:cp(Object.fromEntries(['PLAYER_CUSTOM',...spec.team].map(id=>[id,r.growth(id)]))),equipment:cp(r.s.inventory.filter(x=>x.equipped)),battles:[],wins:0,losses:0,lodgingMora:0,worldStart:{day:r.s.global.WORLD_DAY,time:r.s.global.WORLD_TIME,prng:r.s.global.PRNG_STATE}};
 for(let i=0;i<3;i++){
  const before=party(r),prior={...meter};let waits=0,lastWait;
  while(!r.s.runtime&&waits<2000){lastWait=r.action('WAIT',{minutes:60});waits++;}
  if(!r.s.runtime){row.stopReason='NO_NATURAL_ENCOUNTER';break;}
  const initial=snapshot(r),reward=H.play(r),last=r._auditLast;
  const reactionCounts={},castCounts={},statusCounts={};for(const x of last?.log||[]){if(x.reaction)reactionCounts[x.reaction]=(reactionCounts[x.reaction]||0)+1;if(x.card&&x.actor)castCounts[x.actor+'|'+x.card]=(castCounts[x.actor+'|'+x.card]||0)+1;if(x.status)statusCounts[x.status]=(statusCounts[x.status]||0)+1;}
  const battle={i,waits,before,initial,result:cp(reward),victory:!!reward.victory,after:party(r),rounds:last?.rounds,heal:meter.heal-prior.heal,ownDamage:meter.ownDamage-prior.ownDamage,allyDamage:meter.allyDamage-prior.allyDamage,playerInputs:meter.inputs-prior.inputs,presentationSeconds:(meter.ms-prior.ms)/1000,last:cp(last),reactionCounts,castCounts,statusCounts};row.battles.push(battle);row.wins+=battle.victory?1:0;row.losses+=battle.victory?0:1;
  if(!battle.victory){row.stopReason='DEFEAT';break;}
  if(r.s.log.length>30)r.s.log=r.s.log.slice(-30);
 }
 row.stopReason??='THREE_NO_INN_COMPLETED';row.finalHp=party(r);row.hpRatio=row.finalHp.reduce((s,a)=>s+a.hp,0)/row.finalHp.reduce((s,a)=>s+a.maxHp,0);row.worldEnd={day:r.s.global.WORLD_DAY,time:r.s.global.WORLD_TIME,prng:r.s.global.PRNG_STATE};out.rows.push(row);
 console.log(JSON.stringify({name:row.name,map,tier,talent,seed,wins:row.wins,losses:row.losses,hp:+row.hpRatio.toFixed(3),rounds:row.battles.map(x=>x.rounds),groups:row.battles.map(x=>x.initial.group)}));
 }catch(e){out.errors.push({name:spec.name,map,tier,talent,seed,code:e.code||e.name,message:e.message,partial:row||null});console.log('ERROR '+JSON.stringify({name:spec.name,map,tier,talent,seed,code:e.code||e.name,message:e.message}));}
 fs.writeFileSync(stem+'.json.gz',zlib.gzipSync(JSON.stringify(out),{level:6}));
 fs.writeFileSync(stem+'_summary.json',JSON.stringify({...out,rows:out.rows.map(({battles,...x})=>({...x,battles:battles.map(({last,initial,result,...b})=>({...b,result,initial:{...initial,actors:initial.actors.map(a=>({source:a.source,side:a.side,level:a.level,hp:a.hp,maxHp:a.maxHp,atk:a.atk,def:a.def,combatDef:a.combatDef,growthScaled:a.growthScaled,grade:a.grade,variant:a.variant,statuses:a.statuses,consLevel:a.consLevel,talents:a.talents,premiumTalents:a.premiumTalents,consSnapshot:a.consSnapshot,immunities:a.immunities}))}}))}))},null,2));
}
