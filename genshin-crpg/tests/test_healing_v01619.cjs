'use strict';
// Native load order and existing legal party/gear. Direct lifecycle calls isolate
// healing amount, recipient count and restored in-flight effects from victory RNG.
const assert=require('node:assert/strict');
const H=require('../tools/audit_healing_helpers_v01619.cjs'),env=H.load(),plain=x=>JSON.parse(JSON.stringify(x));
const levels=[10,15,20,25,30,40,50,60],results=[];
function test(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
function arena(level,healer){const r=H.setup(env,{level,team:['LIYUE_XIANGLING','MOND_FISCHL',healer],route:'ROUTE_TRAVELER',seed:717,enhance:level<30?3:6,map:'MAP_MOND_PLAINS'});r.startBattle('EG_MOND_HILI_PATROL','RANDOM');r.die=()=>1;r.random=()=>.5;for(const a of r.s.runtime.actors)if(a.side==='ENEMY')a.hp=a.maxHp=1000000;return r;}
function actors(r){return r.s.runtime.actors.filter(a=>a.side==='ALLY');}
function actor(r,id){return r.s.runtime.actors.find(a=>a.source===id);}
function cast(r,id,skill){const a=actor(r,id),c=r.actorCards(a).find(x=>x.id===skill);assert(c);return r.executeCard(a,c,r.s.runtime.actors.find(x=>x.side==='ENEMY').id);}
function capture(r){const events=[];let nominal=null;r._auditHealNominal=(a,n,source)=>{nominal={target:a.source,amount:n,source};};const old=r.heal;r.heal=function(a,n,source,...args){nominal=null;const before=a.hp,out=old.call(this,a,n,source,...args);events.push({target:a.source,source,raw:n,nominal:nominal?.amount??null,actual:out,hpDelta:a.hp-before,round:this.s.runtime.round});return out;};return events;}

test('new Jean/Barbara Q keep all living recipients, native talent/rhythm/gear and cooldown',()=>{
 const evidence=[];
 for(const level of levels)for(const id of ['MOND_JEAN','MOND_BARBARA']){
  const r=arena(level,id),a=actor(r,id),all=actors(r),events=capture(r);for(const x of all)x.hp=1;
  const raw=id==='MOND_JEAN'?r.combatStat(a,'atk')*r.combatHealingBudget().jeanQRatio+r.combatHealingBudget().jeanQFlat:r.combatStat(a,'maxHp')*.04+250;
  cast(r,id,id+'_Q');const heals=events.filter(x=>x.source===a.name);
  assert.equal(heals.length,4);assert.equal(new Set(heals.map(x=>x.target)).size,4);
  for(const e of heals){assert.equal(e.raw,raw);assert.equal(e.actual,e.hpDelta);assert(e.actual>0);const target=actor(r,e.target),nominal=raw*1.5*r.premiumTalentMultiplier(a,'q')*(1+Number(target.traits?.HEAL_BOOST||0)/100);assert(Math.abs(e.nominal-nominal)<.001,'existing multipliers are preserved');}
  assert.equal(a.cooldowns[id+'_Q'],r.skillRhythm(id).q);
  evidence.push({level,id,raw,nominal:heals[0].nominal,actual:heals.map(x=>x.actual),talents:r.talentLevels(id),cooldown:a.cooldowns[id+'_Q']});
 }
 return evidence;
});

test('new Jean field heals one lowest-HP living ally, once per END and two times total, after restore',()=>{
 const r0=arena(25,'MOND_JEAN');cast(r0,'MOND_JEAN','MOND_JEAN_Q');let r=new env.R(env.db,JSON.parse(r0.serialize()));
 const events=capture(r),all=actors(r);all.forEach((a,i)=>a.hp=Math.floor(a.maxHp*[.1,.5,.6,.7][i]));
 const field=r.s.runtime.fields.find(f=>f.kind==='DANDELION');assert.equal(field.healTargetCount,1);assert.equal(field.healMaxTicks,2);assert.equal(field.healRatio,r.combatHealingBudget().jeanFieldRatio);assert.equal(field.healFlat,r.combatHealingBudget().jeanFieldFlat);
 r.tickFields('END');assert.equal(events.length,1);assert.equal(events[0].target,'PLAYER_CUSTOM');assert.equal(field.healTicks,1);
 r.tickFields('END');assert.equal(events.length,1,'same END cannot heal twice');
 r.s.runtime.round++;all.forEach((a,i)=>a.hp=Math.floor(a.maxHp*[.7,.5,.1,.6][i]));r.tickFields('END');assert.equal(events.length,2);assert.equal(events[1].target,'MOND_FISCHL');
 r.s.runtime.round++;r.tickFields('END');assert.equal(events.length,2,'no third creation-round pulse');
 assert(events.every(e=>e.actual===e.hpDelta));return events;
});

test('new Barbara E keeps party healing on successful normal attacks, misses and dead allies excluded',()=>{
 const r=arena(25,'MOND_BARBARA'),a=actor(r,'MOND_BARBARA'),all=actors(r),foe=r.s.runtime.actors.find(x=>x.side==='ENEMY');cast(r,a.source,a.source+'_E');
 const melody=a.statuses.find(s=>s.id==='STATUS_BARBARA_MELODY_LOOP');assert.equal(melody.healRatio,.012);assert.equal(melody.healFlat,60);
 all.forEach(x=>x.hp=1);all[1].hp=0;const events=capture(r);r.basicHit(a,foe);const raw=a.maxHp*.012+60;
 assert.equal(events.length,4,'normal healing still visits party; base heal rejects downed target');for(const e of events){assert.equal(e.raw,raw);assert.equal(e.actual,e.hpDelta);}assert.equal(events.find(x=>x.target===all[1].source).actual,0);assert.equal(all[1].hp,0);
 const prior=events.length;r.die=()=>100;r.basicHit(a,foe);assert.equal(events.length,prior,'miss does not heal');return events;
});

test('serialized pre-patch Barbara E and Jean field retain old amounts and scope until they expire',()=>{
 const records=[];
 for(const id of ['MOND_BARBARA','MOND_JEAN']){
  const original=arena(25,id),a=actor(original,id),b=original.s.runtime;
  if(id==='MOND_BARBARA')original.addCombatStatus(a,'STATUS_BARBARA_MELODY_LOOP',2);
  else original.addField('DANDELION',a,2,{sourceCardId:'MOND_JEAN_Q'});
  const r=new env.R(env.db,JSON.parse(original.serialize()));r.die=()=>1;r.random=()=>.5;actors(r).forEach(x=>x.hp=1);const events=capture(r),owner=actor(r,id);
  if(id==='MOND_BARBARA'){r.basicHit(owner,r.s.runtime.actors.find(x=>x.side==='ENEMY'));assert.equal(events.length,4);assert(events.every(x=>x.raw===owner.maxHp*.06));}
  else{r.tickFields('END');assert.equal(events.length,4);assert(events.every(x=>x.raw===r.combatStat(owner,'atk')*.35));}
  records.push({id,events,round:b.round});
 }
 return records;
});

test('Jean field stores its own healing amount and older focused saves retain their promised 3% plus 60',()=>{
 const records=[];
 for(const legacy of [false,true]){
  const original=arena(25,'MOND_JEAN');cast(original,'MOND_JEAN','MOND_JEAN_Q');const field=original.s.runtime.fields.find(f=>f.kind==='DANDELION');
  if(legacy){delete field.healRatio;delete field.healFlat;}else{field.healRatio=.04;field.healFlat=90;}
  const r=new env.R(env.db,JSON.parse(original.serialize()));actors(r).forEach(x=>x.hp=1);const events=capture(r),owner=actor(r,'MOND_JEAN');r.tickFields('END');
  assert.equal(events.length,1);const expected=r.combatStat(owner,'atk')*(legacy?.03:.04)+(legacy?60:90);assert.equal(events[0].raw,expected);assert.equal(events[0].actual,events[0].hpDelta);
  records.push({legacy,expected,event:events[0]});
 }
 return records;
});

test('native skill rows and effect text show the same healing budget without rewriting the DB',()=>{
 const r=arena(25,'MOND_JEAN'),budget=r.combatHealingBudget(),records=[];
 for(const id of ['MOND_JEAN_Q','MOND_BARBARA_E','MOND_BARBARA_Q']){
  const original=r.row('08_SKILL_CARD_DB',id),snapshot=plain(original),c=r.cardDefinition(original);
  assert.notEqual(c.row,original);assert.deepEqual(plain(original),snapshot,'canonical DB row remains unchanged');
  if(id==='MOND_JEAN_Q'){assert(c.script.includes(`HEAL_ALL:ATK*${budget.jeanQRatio}+${budget.jeanQFlat}`));assert(c.script.includes('ROUND_END_HEAL_LOWEST_HP'));assert(c.row[14].includes('아군 1명'));assert(c.row[14].includes('최대 2회'));}
  if(id==='MOND_BARBARA_E')assert(c.script.includes(`ON_NORMAL_HIT:HEAL_ALL:MAX_HP*${budget.barbaraERatio}+${budget.barbaraEFlat}`));
  if(id==='MOND_BARBARA_Q')assert(c.script.includes(`HEAL_ALL:MAX_HP*${budget.barbaraQRatio}+${budget.barbaraQFlat}`));
  assert.equal(r.cardSupport(c),'');records.push({id,power:c.row[7],text:c.row[14],script:c.script});
 }
 const modern=r.combatHealingStatusText({id:'STATUS_BARBARA_MELODY_LOOP',healRatio:budget.barbaraERatio,healFlat:budget.barbaraEFlat}),legacy=r.combatHealingStatusText({id:'STATUS_BARBARA_MELODY_LOOP'});
 assert(modern.includes('1.2% + 60'));assert(legacy.includes('6%'));assert(!legacy.includes('+ 60'));assert.equal(r.combatHealingStatusText({id:'STATUS_FREEZE'}),'');
 return{records,modern,legacy};
});

if(process.env.HEALING_EVIDENCE_OUT)require('node:fs').writeFileSync(process.env.HEALING_EVIDENCE_OUT,JSON.stringify({fingerprint:env.fingerprint,results},null,2)+'\n');
