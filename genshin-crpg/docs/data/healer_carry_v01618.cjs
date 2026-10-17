'use strict';
// Read-only diagnostic: all changes are isolated fixture state in this VM.
const fs=require('node:fs'),path=require('node:path');
const root=(process.env.CRPG_AUDIT_ROOT || require('node:path').resolve(__dirname,'../..'));
const {load,setup,observe,play,hp}=require(root+'/tools/audit_protagonist_v01618.cjs');
const env=load(),PLAYER='PLAYER_CUSTOM',LOW='MOND_LISA',cp=x=>JSON.parse(JSON.stringify(x));
const out='/tmp/crpg_healer_audit/carry_root.json';
const data={version:'0.16.18',sourceCommit:'1e1b2442b53d42873d29556898f5f612d52d0c7a',fingerprint:env.fingerprint,assumptions:{party:'Traveler + Diluc + diagnostic fourth slot Barbara/Jean/Fischl + Lisa Lv1',fixtures:'Declared legal ownership, story access, main three level60 phase6/crafted weapon and armor +6, moderate capped talents; new LisaLv1 phase0 starter weapon +0 talent1. No constellations/artifacts. Initial full HP once.',native:'Actual DOMAIN_START/COMBAT and unchanged ally AI. No injected heal, enemy edits, reward edits, CD reset or PRNG reseeding between battles. Break on defeated/stalled result, otherwise attempt up to6 starts. Reward XP/level-up healing native.',time:'Native displayed2x presentation milliseconds/1000 +3sec combat input +6sec reentry. Excludes latency and acquisition/travel; no inn used.'},rows:[],errors:[]};
const cases=[
 {domain:'RIDGE_WATCH:30'},
 {domain:'TAISHAN_MANSION:60'},
 {domain:'LIANSHAN_FORMULA:60',element:'HYDRO'},
 {domain:'LOST_VALLEY:60'}
];
function run(spec,slot,seed){
 const domain=env.api.growthV01522.domains[spec.domain.split(':')[0]],r=setup(env,{level:60,route:'ROUTE_TRAVELER',team:['MOND_DILUC',slot,LOW],seed,map:domain.map,enhance:6});
 r.s.inventory=r.s.inventory.filter(x=>x.owner!==LOW);Object.assign(r.s.chars[LOW],{level:1,xp:0});r.s.ascensions[LOW]=0;r.s.talents[LOW]={na:1,e:1,q:1};
 const weapon=r.giveEquipment('EQ_CATALYST_MAGIC_GUIDE');r.action('EQUIP',{slot:weapon,owner:LOW});r.recalculate();r.s.chars[LOW].hp=r.character(LOW).maxHp;
 // Keep primary money/gear fixed. Reset seed once after fixture EQUIP.
 r.s.global.PRNG_STATE=seed;
 const meter=observe(env,r),incoming=[],heals=[];
 const oldDamage=r.applyDamage;r.applyDamage=function(a,t,n,o){const h=t.hp,v=oldDamage.call(this,a,t,n,o);if(t.side==='ALLY')incoming.push({round:this.s.runtime?.round,target:t.source,source:a?.source,hpDamage:Math.max(0,h-t.hp),ko:h>0&&t.hp<=0});return v;};
 const oldHeal=r.heal;r.heal=function(t,n,label){const prior=t.hp,v=oldHeal.call(this,t,n,label);heals.push({round:this.s.runtime?.round,target:t.source,label,requested:Number(n),effective:Math.max(0,t.hp-prior)});return v;};
 const row={...spec,slot,seed,initialHp:hp(r),battles:[],wins:0,losses:0};
 for(let i=0;i<6;i++){
  const before=hp(r),start={...meter},di=incoming.length,hi=heals.length;
  r.action('DOMAIN_START',{domain:spec.domain,element:spec.element||'NEUTRAL'});
  const initial=r.s.runtime.actors.map(a=>({source:a.source,side:a.side,level:a.level,hp:a.hp,maxHp:a.maxHp,atk:a.atk,def:a.def,cooldowns:cp(a.cooldowns)}));
  const result=play(r),last=r._auditLast;
  const h=heals.slice(hi),d=incoming.slice(di),seconds=(meter.ms-start.ms)/1000+3*(meter.inputs-start.inputs)+6;
  row.battles.push({index:i+1,before,after:hp(r),initial,result,seconds,inputs:meter.inputs-start.inputs,hpBeforeReward:last?.actors.filter(a=>a.side==='ALLY').map(a=>({source:a.source,level:a.level,hp:a.hp,maxHp:a.maxHp})),incomingHpDamage:d.reduce((s,x)=>s+x.hpDamage,0),deaths:d.filter(x=>x.ko).map(x=>x.target),healing:h.reduce((s,x)=>s+x.effective,0),healingEvents:h,healerCasts:last?.log.filter(x=>x.actorId?.startsWith(slot)&&x.card).map(x=>({round:x.round,card:x.card,kind:x.kind,heal:x.heal,damage:x.damage}))});
  row.wins+=result.victory?1:0;row.losses+=result.victory?0:1;
  if(!result.victory){row.stopReason=result.stalled?'STALLED':'DEFEAT';break;}
  if(r.s.log.length>30)r.s.log=r.s.log.slice(-30);
 }
 row.finalHp=hp(r);row.lisaGrowth=r.growth(LOW);row.rounds=row.battles.reduce((s,x)=>s+Number(x.result.rounds||0),0);row.seconds=row.battles.reduce((s,x)=>s+x.seconds,0);row.healing=row.battles.reduce((s,x)=>s+x.healing,0);row.incomingHpDamage=row.battles.reduce((s,x)=>s+x.incomingHpDamage,0);row.deaths=row.battles.flatMap(x=>x.deaths);row.stopReason??='SIX_COMPLETED';return row;
}
for(const spec of cases)for(const slot of ['MOND_FISCHL','MOND_BARBARA','MOND_JEAN'])for(const seed of [717,9031]){
 try{const row=run(spec,slot,seed);data.rows.push(row);console.log(JSON.stringify({domain:row.domain,element:row.element,slot,seed,wins:row.wins,rounds:row.rounds,seconds:Math.round(row.seconds),lisaLevel:row.lisaGrowth.level,lisaCap:row.lisaGrowth.cap,lisaHp:row.finalHp.find(x=>x.owner===LOW),deaths:row.deaths.length,healing:row.healing,incomingHpDamage:row.incomingHpDamage}));}
 catch(e){data.errors.push({spec,slot,seed,code:e.code||e.name,message:e.message});console.log(JSON.stringify(data.errors.at(-1)));}
 fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');
}
