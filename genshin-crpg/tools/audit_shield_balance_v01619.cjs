'use strict';
// Native public fights with one declared initial party fixture; no forced recovery,
// enemy edits, target-group rerolls or presentation-time assumptions.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),zlib=require('node:zlib');
const H=require('./audit_protagonist_v01618.cjs'),cp=x=>JSON.parse(JSON.stringify(x));
function load(root,factor){
 const c=vm.createContext({console,Date,setTimeout,clearTimeout}),h=crypto.createHash('sha256'),substitutions=[];
 for(const[,file]of fs.readFileSync(path.join(root,'source/index.html'),'utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)){
  let source=fs.readFileSync(path.join(root,'source',file),'utf8');h.update(file);h.update(source);
  if(file==='runtime_combat.js'&&factor!==undefined){const old='const amount=round(value),old=a.shields.find';if(!source.includes(old))throw Error('Shield-only comparison requires the frozen 0.16.18 source.');source=source.replace(old,`const amount=round(value*(a.side==='ALLY'&&source==='LIYUE_ZHONGLI_E'?${factor}:1)),old=a.shields.find`);substitutions.push({file,source:'LIYUE_ZHONGLI_E',factor});}
  vm.runInContext(source,c,{filename:file});
 }
 vm.runInContext(fs.readFileSync(path.join(root,'source/presentation.js'),'utf8'),c,{filename:'presentation.js'});
 const raw=fs.readFileSync(path.join(root,'content/db.json'));h.update(raw);
 return{root,c,R:c.CRPGRuntime.Runtime,api:c.CRPGRuntime,db:JSON.parse(raw),fingerprint:h.digest('hex'),substitutions};
}
function campaign(E,spec){
 const domain=spec.domain&&E.api.growthV01522.domains[spec.domain.split(':')[0]],r=H.setup(E,{...spec,route:'ROUTE_TRAVELER',gear:'craft',map:spec.map||domain?.map});
 r.s.constellations=cp(spec.constellations||{});r.recalculate();const meter=H.observe(E,r),shieldEvents=[];
 const shield=r.shield;r.shield=function(a,value,source,rounds,extra){const before=cp(a.shields||[]),out=shield.call(this,a,value,source,rounds,extra);shieldEvents.push({round:this.s.runtime?.round,actor:a.id,source,input:value,rounds,before,after:cp(a.shields||[])});return out;};
 const row={...spec,fixtureHp:H.hp(r),equipment:cp(r.s.inventory.filter(x=>x.equipped)),growth:cp(Object.fromEntries(['PLAYER_CUSTOM',...spec.team].map(id=>[id,r.growth(id)]))),talents:cp(Object.fromEntries(['PLAYER_CUSTOM',...spec.team].map(id=>[id,r.talentLevels(id)]))),constellations:cp(r.s.constellations),battles:[],wins:0,losses:0,lodgingMora:0};
 for(let n=0;n<(spec.runs||3);n++){
  const before=H.hp(r),prior={...meter},eventAt=shieldEvents.length;let waits=0;
  if(spec.domain)r.action('DOMAIN_START',{domain:spec.domain,element:'NEUTRAL'});
  else while(!r.s.runtime&&waits<2000){r.action('WAIT',{minutes:60});waits++;}
  if(!r.s.runtime){row.stopReason='NO_NATURAL_ENCOUNTER';break;}
  const b=r.s.runtime,initial={group:b.group,origin:b.origin,growthBalance:cp(b.growthBalance),actors:cp(b.actors)},reward=H.play(r),last=r._auditLast,allies=new Set(initial.actors.filter(a=>a.side==='ALLY').map(a=>a.id)),foes=new Set(initial.actors.filter(a=>a.side==='ENEMY').map(a=>a.name));
  const logs=last?.log||[],battle={n,waits,before,after:H.hp(r),initial,result:cp(reward),win:!!reward.victory,rounds:last?.rounds,healing:meter.heal-prior.heal,ownDamage:meter.ownDamage-prior.ownDamage,allyDamage:meter.allyDamage-prior.allyDamage,shieldEvents:cp(shieldEvents.slice(eventAt)),shieldAbsorbed:logs.filter(e=>allies.has(e.targetId)).reduce((s,e)=>s+(Number(e.absorbed)||0),0),shieldPoolConsumed:logs.filter(e=>allies.has(e.targetId)&&Object.hasOwn(e,'damage')).reduce((s,e)=>s+Math.max(0,Number(e.shieldBefore||0)-Number(e.shieldAfter||0)),0),damageLogTotal:logs.filter(e=>allies.has(e.targetId)).reduce((s,e)=>s+(Number(e.damage)||0),0),enemySkipped:logs.filter(e=>e.skipped&&foes.has(e.actor)).length,last:cp(last)};
  row.battles.push(battle);row.wins+=battle.win?1:0;row.losses+=battle.win?0:1;
  if(!battle.win){row.stopReason='DEFEAT';break;}if(r.s.log.length>30)r.s.log=r.s.log.slice(-30);
 }
 row.stopReason??='RUNS_COMPLETED';row.finalHp=H.hp(r);row.hpRatio=row.finalHp.reduce((s,a)=>s+a.hp,0)/row.finalHp.reduce((s,a)=>s+a.maxHp,0);return row;
}
function main(){
 const arg=k=>{const n=process.argv.indexOf(k);return n<0?undefined:process.argv[n+1];},root=arg('--root')||path.resolve(__dirname,'..'),E=load(root,arg('--factor')===undefined?undefined:Number(arg('--factor'))),cases=JSON.parse(fs.readFileSync(arg('--cases'),'utf8')),out=arg('--out');
 const data={fingerprint:E.fingerprint,substitutions:E.substitutions,assumptions:{nativeActions:true,declaredOwnershipLevelGearTalents:true,noForcedHeal:true,nativeRewardAndLevelUpCarry:true,publicField:'WAIT 60min native regional pools; selected initial seeds are not unconditional win-rate estimates.',combat:'COMBAT_BEGIN/COMBAT, Traveler Q then HOLD E then basics, native companion AI',limits:'Equal companion levels are representative fixtures, not reconstruction of the user save. WAIT is a path witness, not farming-time measurement. Damage logs can include overkill; HP and healing/revival/level-up snapshots are preserved.'},rows:[],errors:[]};
 for(const spec of cases){try{const row=campaign(E,spec);data.rows.push(row);console.log(JSON.stringify({name:row.name,level:row.level,map:row.map,domain:row.domain,seed:row.seed,wins:row.wins,losses:row.losses,rounds:row.battles.map(x=>x.rounds),hp:+row.hpRatio.toFixed(3),heal:row.battles.map(x=>x.healing),shield:row.battles.map(x=>x.shieldAbsorbed)}));}catch(e){data.errors.push({spec,code:e.code||e.name,message:e.message});console.log('ERROR '+JSON.stringify(data.errors.at(-1)));}fs.writeFileSync(out,zlib.gzipSync(JSON.stringify(data),{level:6}));}
 return data;
}
if(require.main===module)main();module.exports={load,campaign};
