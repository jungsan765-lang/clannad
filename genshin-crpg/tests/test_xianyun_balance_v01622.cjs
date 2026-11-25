'use strict';
// Actual runtime load/serialize contracts for the adopted Xianyun amounts.
const assert=require('node:assert/strict'),fs=require('node:fs');
const H=require('../tools/audit_healing_helpers_v01619.cjs'),env=H.load(),copy=x=>JSON.parse(JSON.stringify(x)),results=[];
function test(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
function arena(){const r=H.setup(env,{level:60,team:['LIYUE_XIANGLING','MOND_FISCHL','LIYUE_XIANYUN'],route:'ROUTE_TRAVELER',seed:717,map:'MAP_MOND_PLAINS',enhance:6});r.startBattle('EG_MOND_HILI_PATROL','RANDOM');r.die=()=>1;r.random=()=>.5;for(const a of r.s.runtime.actors)if(a.side==='ENEMY')a.hp=a.maxHp=1000000;return r;}
function owner(r){return r.s.runtime.actors.find(a=>a.source==='LIYUE_XIANYUN');}
function card(r){return r.actorCards(owner(r)).find(c=>c.id==='LIYUE_XIANYUN_Q');}
function observe(r){const events=[],native=r.heal;r.heal=function(a,n,source,...rest){const before=a.hp,result=native.call(this,a,n,source,...rest);events.push({target:a.source,source,raw:n,applied:result,delta:a.hp-before});return result;};return events;}
function cast(r){for(const a of r.s.runtime.actors)if(a.side==='ALLY')a.hp=1;const c=card(r);assert.equal(r.cardSupport(c),'');r.executeCard(owner(r),c,r.s.runtime.actors.find(a=>a.side==='ENEMY').id);return c;}
test('new battles apply Q ATK3%+850 and store the focused field ATK8%+400',()=>{
 const r=arena();assert.equal(r.s.runtime.healingBalanceRevision,1);const events=observe(r),c=cast(r),a=owner(r),field=r.s.runtime.fields.find(f=>f.kind==='BAMBOO_STAR');
 assert.equal(events.length,4);assert(events.every(e=>e.raw===r.combatStat(a,'atk')*.03+850&&e.applied===e.delta));assert.equal(field.healTargetCount,1);assert.equal(field.healRatio,.08);assert.equal(field.healFlat,400);assert(c.script.includes('HEAL_ALL:ATK*0.03+850'));assert(c.script.includes('HEAL_LOWEST_HP_ALLY:ATK*0.08+400'));assert(c.row[14].includes('+850')&&c.row[14].includes('+400'));return{events,field:copy(field),description:c.row[14]};
});
test('serialized pre-policy battles keep Q ATK3%+1250 and create their promised +600 field',()=>{
 const original=arena();delete original.s.runtime.healingBalanceRevision;const r=new env.R(env.db,JSON.parse(original.serialize()));r.die=()=>1;r.random=()=>.5;const events=observe(r),c=cast(r),a=owner(r),field=r.s.runtime.fields.find(f=>f.kind==='BAMBOO_STAR');
 assert.equal(r.s.runtime.healingBalanceRevision,undefined);assert.equal(events.length,4);assert(events.every(e=>e.raw===r.combatStat(a,'atk')*.03+1250&&e.applied===e.delta));assert.equal(field.healFlat,600);assert(c.script.includes('HEAL_ALL:ATK*0.03+1250'));assert(c.script.includes('HEAL_LOWEST_HP_ALLY:ATK*0.08+600'));assert(c.row[14].includes('+1250')&&c.row[14].includes('+600'));return{events,field:copy(field),description:c.row[14]};
});
test('an already stored +600 Bamboo Star retains its amount and one-recipient limit after restore',()=>{
 const original=arena(),a=owner(original);const field=original.addField('BAMBOO_STAR',a,2,{sourceCardId:'LIYUE_XIANYUN_Q',liyue:true,healTargetCount:1,healRatio:.08,healFlat:600});
 const r=new env.R(env.db,JSON.parse(original.serialize()));r.die=()=>1;r.random=()=>.5;const b=r.s.runtime,star=b.fields.find(f=>f.kind==='BAMBOO_STAR');star.used={};for(const x of b.actors)if(x.side==='ALLY')x.hp=x.maxHp;const target=b.actors.find(x=>x.source==='PLAYER_CUSTOM');target.hp=1;const events=observe(r);r.basicHit(target,b.actors.find(x=>x.side==='ENEMY'));
 const heal=events.filter(e=>e.source===owner(r).name);assert.equal(heal.length,1);assert.equal(heal[0].raw,r.combatStat(owner(r),'atk')*.08+600);assert.equal(heal[0].applied,heal[0].delta);assert.equal(star.healFlat,field.healFlat);return{event:heal[0],field:copy(star)};
});
test('new policy marker survives serialization and unknown policy values are rejected',()=>{
 const r=arena(),restored=new env.R(env.db,JSON.parse(r.serialize()));assert.equal(restored.s.runtime.healingBalanceRevision,1);for(const value of [0,2,'1',null]){const s=JSON.parse(r.serialize());s.runtime.healingBalanceRevision=value;assert.throws(()=>new env.R(env.db,s),e=>e.code==='HEALING_BALANCE_SAVE');}return{marker:1,rejected:[0,2,'1',null]};
});
test('current and legacy Xianyun skill descriptions leave the authored DB untouched',()=>{
 const r=arena(),row=r.row('08_SKILL_CARD_DB','LIYUE_XIANYUN_Q'),original=copy(row);const current=r.cardDefinition(row);delete r.s.runtime.healingBalanceRevision;const legacy=r.cardDefinition(row);assert.notEqual(current.row,row);assert.notEqual(legacy.row,row);assert.deepEqual(copy(row),original);assert.equal(r.cardSupport(legacy),'');assert(current.row[7].includes('+850')&&legacy.row[7].includes('+1250'));return{current:current.row[7],legacy:legacy.row[7]};
});
if(process.env.XIANYUN_EVIDENCE_OUT)fs.writeFileSync(process.env.XIANYUN_EVIDENCE_OUT,JSON.stringify({fingerprint:env.fingerprint,results},null,2)+'\n');
