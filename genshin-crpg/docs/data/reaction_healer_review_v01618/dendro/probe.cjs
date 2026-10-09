'use strict';
const reviewOutputDir=process.env.CRPG_AUDIT_OUT||require('node:path').join(require('node:os').tmpdir(),'crpg-reaction-healer-review','dendro');require('node:fs').mkdirSync(reviewOutputDir,{recursive:true});

const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=process.env.CRPG_AUDIT_ROOT||require('node:path').resolve(__dirname,'../../../..');
const H=require('../helpers/audit_protagonist_v01618.cjs');
const cp=x=>JSON.parse(JSON.stringify(x));
function env(mode='baseline'){
 const c=vm.createContext({console,Date,setTimeout,clearTimeout}),hash=crypto.createHash('sha256'),replacements=[];
 for(const [,f] of fs.readFileSync(root+'/source/index.html','utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)){
  let s=fs.readFileSync(root+'/source/'+f,'utf8');hash.update(f);hash.update(s);
  function replace(a,b,label){assert.equal(s.split(a).length-1,1,label+' replacement matches once');s=s.replace(a,b);replacements.push(label);}
  if(f==='runtime_rules.js'&&mode==='rule_candidate'){
   replace("if(rx?.[17]==='ADDITIVE')raw+=this.reactionBase(a)*Number(rx[7]);", "if(rx?.[17]==='ADDITIVE'){const tk=a.side==='ALLY'&&this.premiumHitKind?.(a,o),tm=tk?this.premiumTalentMultiplier(a,tk):1;raw+=this.reactionBase(a)*Number(rx[7])/tm;}",'additive talent separation');
   replace("b.log.push({actor:a.name,target:t.name,reaction:rx[0],reactionName:rx[1],text:rx[1]+' 반응'});", "if(st(t,'STATUS_BURN')&&!this.auraList(t).some(x=>x.element==='불'))t.statuses=t.statuses.filter(x=>x.id!=='STATUS_BURN');b.log.push({actor:a.name,target:t.name,reaction:rx[0],reactionName:rx[1],text:rx[1]+' 반응'});",'burn extinguish when Pyro aura consumed');
   replace("b.fields.push(f);return f;};", "b.fields.push(f);if(kind==='DENDRO_CORE'){const live=b.fields.filter(x=>x.kind==='DENDRO_CORE'&&!x.done);if(live.length>5)this.detonateCombatObject(live[0]);}return f;};",'core cap five oldest detonation');
  }
  vm.runInContext(s,c,{filename:f});
 }
 vm.runInContext(fs.readFileSync(root+'/source/presentation.js','utf8'),c,{filename:'presentation.js'});
 const raw=fs.readFileSync(root+'/content/db.json');hash.update(raw);
 return {c,db:JSON.parse(raw),R:c.CRPGRuntime.Runtime,api:c.CRPGRuntime,root,fingerprint:hash.digest('hex'),mode,replacements};
}
function arena(E,level,talent=1,team=['LIYUE_YAOYAO','MOND_LISA','MOND_BARBARA']){
 const r=H.setup(E,{route:'ROUTE_TRAVELER',map:'MAP_MOND_PLAINS',level,gear:'none',talent,team,seed:717});r.startBattle('EG_MOND_HILI_PATROL','RANDOM');
 const b=r.s.runtime;for(const t of b.actors.filter(a=>a.side==='ENEMY')){t.hp=t.maxHp=10000000;t.statuses=[];t.shields=[];t.auras=[];t.aura=null;}
 r.die=()=>100;r.random=()=>.5;const actor=s=>b.actors.find(a=>a.source===s);
 return {r,b,p:actor('PLAYER_CUSTOM'),y:actor('LIYUE_YAOYAO'),l:actor('MOND_LISA'),bar:actor('MOND_BARBARA'),target:b.actors.find(a=>a.side==='ENEMY'),actor};
}
function packet(r,f){const at=r.s.runtime.log.length;f();return cp(r.s.runtime.log.slice(at).filter(x=>Object.hasOwn(x,'damage')));}
function main(){const modes=['baseline','rule_candidate'],out={root,assumptions:{readOnly:true,fixture:'Full product load order; owned companions, native phase/stats, unarmed, no constellations. Level20/40/60 talent1 plus legalCap. Fixed no-crit/miss/RNG removes variance; enemies retain native DEF but have 10M HP solely to isolate repeated packets. Controlled aura/status/object setup is diagnostic, not natural fight/win or reward evidence.',candidate:'In-memory substitutions only: additive talent normalization, remove burning status when its Pyro aura is consumed, five-core cap with native oldest detonation. No coefficients buffed. Independent targeting/core coexistence and self damage remain review options, not candidates evaluated here.'},rows:[],sourceFingerprints:[]};
for(const mode of modes){const E=env(mode);out.sourceFingerprints.push({mode,fingerprint:E.fingerprint,replacements:E.replacements});
 for(const level of [20,40,60]){
  const cap=E.api.growthV01522.talentCaps[E.api.growthV01522.phaseFor(level)],A=arena(E,level),{r,b,p,y,l,bar,target:t}=A,R=r.reactionBase(p);
  const row={mode,level,legalTalentCap:cap,base:R,nativeParty:b.actors.filter(a=>a.side==='ALLY').map(a=>({source:a.source,maxHp:a.maxHp,atk:a.atk,def:a.def})),rawCoefficients:{burnTick:R*.25,burnThreeTicks:R*.75,bloom:R*2,hyper:R*3,burgeon:R*3,aggravate:R*1.15,spread:R*1.25}};
  r.setAura(t,'풀');r.applyCombatAura(p,t,'불');row.burning={before:cp({auras:t.auras,statuses:t.statuses}),ticks:packet(r,()=>{for(let i=0;i<3;i++){r.tickFields('END');b.round++;}})};
  const BB=arena(E,level);BB.r.setAura(BB.target,'풀');BB.r.applyCombatAura(BB.p,BB.target,'불');BB.r.applyCombatAura(BB.bar,BB.target,'물');row.burningExtinguish={after:cp({auras:BB.target.auras,statuses:BB.target.statuses}),nextEnd:packet(BB.r,()=>BB.r.tickFields('END'))};
  const C=arena(E,level);for(let n=0;n<6;n++){C.r.setAura(C.target,'풀');C.r.applyCombatAura(C.bar,C.target,'물');}row.sixCores={live:C.b.fields.filter(f=>f.kind==='DENDRO_CORE'&&!f.done).length,all:C.b.fields.map(f=>({kind:f.kind,done:f.done,position:f.position,base:f.reactionBase})),packets:cp(C.b.log.filter(x=>x.reaction==='RX_BLOOM'&&Object.hasOwn(x,'damage')))};
  const D=arena(E,level);D.r.setAura(D.target,'풀');D.r.applyCombatAura(D.bar,D.target,'물');const core=D.b.fields.find(f=>f.kind==='DENDRO_CORE');D.target.position={x:core.position.x+1,y:core.position.y};row.coreMoved={distance:D.r.combatDistance(D.target,core),electro:D.r.reactionFor(D.target,'번개')?.[0]||null,pyro:D.r.reactionFor(D.target,'불')?.[0]||null};
  const E2=arena(E,level);E2.r.setAura(E2.target,'풀');E2.r.applyCombatAura(E2.bar,E2.target,'물');E2.r.setAura(E2.target,'얼음');row.coreCryoPyro={selected:E2.r.reactionFor(E2.target,'불')?.[0],packets:packet(E2.r,()=>E2.r.damage(E2.p,E2.target,.65,'불',{sureHit:true,noCrit:true,card:'PLAYER_BASIC_ATTACK'})),coreLeft:E2.b.fields.filter(f=>f.kind==='DENDRO_CORE'&&!f.done).length};
  const F=arena(E,level);F.r.setAura(F.target,'풀');F.r.applyCombatAura(F.bar,F.target,'물');F.r.addCombatStatus(F.target,'QUICKEN',2);row.coreQuickenElectro={selected:F.r.reactionFor(F.target,'번개')?.[0],packets:packet(F.r,()=>F.r.damage(F.p,F.target,.65,'번개',{sureHit:true,noCrit:true,card:'PLAYER_BASIC_ATTACK'})),coreLeft:F.b.fields.filter(f=>f.kind==='DENDRO_CORE'&&!f.done).length};
  row.additive=[];for(const talent of [1,cap])for(const [element,source]of [['번개','MOND_LISA'],['풀','LIYUE_YAOYAO']])for(const quicken of [false,true]){
   const Z=arena(E,level,talent),a=Z.actor(source);if(quicken)Z.r.addCombatStatus(Z.target,'QUICKEN',2);
   const packets=packet(Z.r,()=>Z.r.damage(a,Z.target,.65,element,{sureHit:true,noCrit:true,card:'PLAYER_BASIC_ATTACK'}));row.additive.push({talent,element,source,quicken,talentMultiplier:Z.r.premiumTalentMultiplier(a,'na'),packets});
  }
  row.nativeCards=[];
  for(const spec of [{source:'LIYUE_YAOYAO',team:['LIYUE_YAOYAO','MOND_LISA','MOND_BARBARA'],card:'LIYUE_YAOYAO_Q'}, {source:'LIYUE_BAIZHU',team:['LIYUE_BAIZHU','MOND_LISA','MOND_BARBARA'],card:'LIYUE_BAIZHU_E'}]){
   const Z=arena(E,level,cap,spec.team),a=Z.actor(spec.source),c=Z.r.actorCards(a).find(x=>x.id===spec.card);Z.r.setAura(Z.target,'번개');const reason=Z.r.cardReason(a,c),legal=Z.r.cardTargets(a,c).some(x=>x.id===Z.target.id);const pk=packet(Z.r,()=>Z.r.executeCard(a,c,Z.target.id));row.nativeCards.push({source:spec.source,card:spec.card,reason,legal,packets:pk,quicken:cp(Z.target.statuses.find(x=>x.id==='QUICKEN')||null),fields:Z.b.fields.map(f=>({kind:f.kind,rounds:f.rounds}))});
  }
  out.rows.push(row);
 }
}
const E=env();out.acquisition={yaoyao4:E.api.wishV01411.pools.FOUR.includes('LIYUE_YAOYAO'),baizhuLimited5:E.api.wishV01411.pools.LIMITED5.includes('LIYUE_BAIZHU'),zibaiAnyPool:Object.values(E.api.wishV01411.pools).some(p=>p.includes('LIYUE_ZIBAI')),zibaiEventOnly:arena(E,20).r.recruitEventOnly('LIYUE_ZIBAI')};
fs.writeFileSync(require('node:path').join(reviewOutputDir,'probe.json'),JSON.stringify(out,null,2));
console.log(JSON.stringify(out.rows.map(x=>({mode:x.mode,level:x.level,base:x.base,coreLive:x.sixCores.live,extinguished:!x.burningExtinguish.after.statuses.some(s=>s.id==='STATUS_BURN'),moved:x.coreMoved,quickenPriority:x.coreQuickenElectro.selected,additive:x.additive.map(z=>({talent:z.talent,el:z.element,on:z.quicken,damage:z.packets[0]?.damage}))})),null,2));

}
if(require.main===module)main();module.exports={env,arena,packet,cp};
