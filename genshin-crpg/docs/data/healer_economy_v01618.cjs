'use strict';
const fs=require('node:fs');
const root=(process.env.CRPG_AUDIT_ROOT || require('node:path').resolve(__dirname,'../..'));
const A=require(root+'/tools/audit_protagonist_v01618.cjs'),env=A.load(root),cp=x=>JSON.parse(JSON.stringify(x)),P='PLAYER_CUSTOM';
const data={fingerprint:env.fingerprint,changes:'None; synthetic ownership/levels/gates followed by native runtime actions.',rows:[]};
{
 const r=A.setup(env,{level:60,team:['MOND_AMBER','MOND_FISCHL','MOND_BARBARA'],route:'ROUTE_TRAVELER',map:'MAP_D163_MIDSUMMER_COURTYARD',gear:'craft',enhance:6,talent:6,seed:717});
 Object.assign(r.s.chars.MOND_AMBER,{level:1,xp:0,hp:0});r.s.ascensions.MOND_AMBER=0;r.s.talents.MOND_AMBER={na:1,e:1,q:1};
 const owned=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON);owned.MOND_KAEYA={state:'JOINED'};r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(owned);Object.assign(r.s.chars.MOND_KAEYA,{level:1,xp:0,hp:0});r.s.ascensions.MOND_KAEYA=0;r.s.talents.MOND_KAEYA={na:1,e:1,q:1};
 // Remove items whose minimum level exceeds the new level; no dead learner takes an action.
 for(const i of r.s.inventory.filter(i=>i.owner==='MOND_AMBER'))i.equipped=false;
 const before={party:A.hp(r),reserve:{...r.s.chars.MOND_KAEYA},entry:cp(r.growthDomainEntries().find(x=>x.id==='MIDSUMMER_COURTYARD:15'))};
 A.observe(env,r);r.action('DOMAIN_START',{domain:'MIDSUMMER_COURTYARD:15'});const initial=cp(r.s.runtime.actors.map(x=>({id:x.id,level:x.level,hp:x.hp,maxHp:x.maxHp,side:x.side})));const out=A.play(r),last=cp(r._auditLast);
 data.rows.push({name:'Dead Lv.1 active learner and dead Lv.1 reserve receive full and quarter XP, native victory',before,initial,out,after:{party:A.hp(r),reserve:{...r.s.chars.MOND_KAEYA},growth:cp(r.s.lastGrowth)},learnerActions:last.log.filter(x=>x.actor==='엠버'||x.actorId==='MOND_AMBER'),combatBeforeReward:last.actors.filter(x=>x.side==='ALLY').map(x=>({id:x.id,hp:x.hp,maxHp:x.maxHp,level:x.level}))});
}
{
 const r=A.setup(env,{level:60,team:['MOND_AMBER','MOND_KAEYA','MOND_BARBARA'],route:'ROUTE_TRAVELER',map:'MAP_D163_FORSAKEN_RIFT',gear:'craft',enhance:6,talent:6,seed:9031});A.observe(env,r);
 for(const owner of [P,'MOND_AMBER','MOND_KAEYA','MOND_BARBARA'])if(owner===P)r.s.global.PLAYER_HP_CURRENT=Math.floor(r.player().maxHp*.6);else r.s.chars[owner].hp=Math.floor(r.character(owner).maxHp*.6);
 const runs=[];for(let n=0;n<2;n++){const before=A.hp(r);r.action('DOMAIN_START',{domain:'FORSAKEN_RIFT:25'});const entry=cp(r.s.runtime.actors.filter(x=>x.side==='ALLY').map(x=>({id:x.id,hp:x.hp,maxHp:x.maxHp,cooldowns:x.cooldowns}))),out=A.play(r),b=r._auditLast;const log=b.log;const cards=log.filter(x=>x.card&&/^MOND_BARBARA_/.test(x.card)).map(x=>({card:x.card,round:x.round,actor:x.actor,actorId:x.actorId}));runs.push({before,entry,out,after:A.hp(r),exit:cp(b.actors.filter(x=>x.side==='ALLY').map(x=>({id:x.id,hp:x.hp,maxHp:x.maxHp,cooldowns:x.cooldowns}))),barbaraCards:cards,healing:b.log.filter(x=>x.heal!=null)});}data.rows.push({name:'Native HP carry-over but Barbara E/Q cooldowns fresh next battle, capped levels',runs});
}
fs.writeFileSync('/tmp/crpg_healer_audit/economy/native.json',JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(data));
