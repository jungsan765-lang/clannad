'use strict';
// Native isolated lifecycle witnesses. HP-only enemy durability keeps the fixture
// alive; these calls verify proc eligibility, rather than campaign balance.
const assert=require('node:assert/strict'),fs=require('node:fs');
const H=require('../tools/audit_healing_helpers_v01619.cjs'),env=H.load(process.env.COMBAT_SOURCE_ROOT),results=[];
function test(name,fn){try{results.push({name,ok:true,evidence:fn()});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
function fixture(c){const r=H.setup(env,{level:25,team:['MOND_NOELLE','MOND_AMBER','LIYUE_XIANGLING'],route:'ROUTE_TRAVELER',seed:717,enhance:3,talent:4,map:'MAP_MOND_PLAINS'});r.s.constellations={MOND_NOELLE:c};r.startBattle('EG_MOND_HILI_PATROL','RANDOM');r.die=()=>1;r.random=()=>.5;for(const a of r.s.runtime.actors)if(a.side==='ENEMY')a.hp=a.maxHp=1000000;return r;}
const owner=r=>r.s.runtime.actors.find(a=>a.source==='MOND_NOELLE'),foe=r=>r.s.runtime.actors.find(a=>a.side==='ENEMY'&&a.hp>0),allies=r=>r.s.runtime.actors.filter(a=>a.side==='ALLY');
function cast(r,id){const a=owner(r),card=r.actorCards(a).find(c=>c.id===id);assert(card);r.executeCard(a,card,foe(r).id);}
function capture(r){const events=[],old=r.heal;r.heal=function(a,n,s,...rest){const before=a.hp,out=old.call(this,a,n,s,...rest);events.push({target:a.source,raw:n,applied:out,before,after:a.hp,round:this.s.runtime.round});return out;};return events;}
function wound(r){for(const a of allies(r))if(a.hp>0)a.hp=1;}
function strike(r,events){const at=events.length,hit=r.basicHit(owner(r),foe(r));return{hit,events:events.slice(at)};}
function assertSingle(r,row,n=4){assert.equal(row.hit,true);assert.equal(row.events.length,n);assert.equal(new Set(row.events.map(x=>x.target)).size,n);for(const e of row.events){assert.equal(e.raw,r.combatStat(owner(r),'def')*.25);assert(e.applied>0);assert.equal(e.applied,e.after-e.before);}}

test('C0 50% proc and C1/C6 certainty share one Breastplate heal per round',()=>{
 const rows=[];for(const c of [0,1,6])for(const roll of [1,60]){const r=fixture(c);cast(r,'MOND_NOELLE_E');cast(r,'MOND_NOELLE_Q');wound(r);const events=capture(r);r.die=()=>roll;const first=strike(r,events);if(c||roll===1)assertSingle(r,first);else assert.equal(first.events.length,0);const second=strike(r,events);assert.equal(second.events.length,0);rows.push({c,roll,first,second});}return rows;
});
test('C1/C6 require Breastplate: absent/other/broken shield does not consume eligibility',()=>{
 const rows=[];for(const c of [1,6]){const r=fixture(c);cast(r,'MOND_NOELLE_Q');wound(r);const events=capture(r);r.die=()=>60;const none=strike(r,events);assert.equal(none.events.length,0);r.shield(owner(r),100,'MOND_DIONA_E',2);const other=strike(r,events);assert.equal(other.events.length,0);cast(r,'MOND_NOELLE_E');const eligible=strike(r,events);assertSingle(r,eligible);r.roundEnd();const a=owner(r),damage=a.shields.reduce((n,s)=>n+s.value,0)+1;r.applyDamage(foe(r),a,damage,{element:'物理'});assert(!a.shields.some(s=>s.source==='MOND_NOELLE_E'));r.shield(a,100,'MOND_DIONA_E',2);wound(r);const broken=strike(r,events);assert.equal(broken.events.length,0);rows.push({c,none,other,eligible,broken});}return rows;
});
test('native round end resets shared gate; E/Q recasts in the same round do not',()=>{
 const rows=[];for(const c of [0,1,6]){const r=fixture(c);cast(r,'MOND_NOELLE_E');cast(r,'MOND_NOELLE_Q');wound(r);const events=capture(r),first=strike(r,events);assertSingle(r,first);cast(r,'MOND_NOELLE_E');cast(r,'MOND_NOELLE_Q');const recast=strike(r,events);assert.equal(recast.events.length,0);r.roundEnd();wound(r);const next=strike(r,events);assertSingle(r,next);rows.push({c,first,recast,next});}return rows;
});
test('Q expiry returns C1/C6 to native 50% Breastplate proc',()=>{
 const rows=[];for(const c of [1,6]){const r=fixture(c);cast(r,'MOND_NOELLE_E');cast(r,'MOND_NOELLE_Q');for(let i=0;i<6&&owner(r).statuses.some(s=>s.id==='NOELLE_SWEEP');i++)r.roundEnd();assert(!owner(r).statuses.some(s=>s.id==='NOELLE_SWEEP'));cast(r,'MOND_NOELLE_E');wound(r);const events=capture(r);r.die=()=>60;const failed=strike(r,events);assert.equal(failed.events.length,0);r.die=()=>1;const base=strike(r,events);assertSingle(r,base);rows.push({c,failed,base});}return rows;
});
test('misses and E/Q damage cannot proc; living allies heal while KO stays zero',()=>{
 const rows=[];for(const c of [0,1,6]){const r=fixture(c),events=capture(r);cast(r,'MOND_NOELLE_E');cast(r,'MOND_NOELLE_Q');assert.equal(events.length,0);wound(r);const ko=allies(r).find(a=>a.source==='MOND_AMBER');ko.hp=0;r.die=()=>100;const miss=strike(r,events);assert.equal(miss.hit,false);assert.equal(miss.events.length,0);r.die=()=>1;const hit=strike(r,events);assert.equal(ko.hp,0);assert.equal(hit.events.filter(e=>e.applied>0).length,3);assert(hit.events.every(e=>e.applied===e.after-e.before));rows.push({c,miss,hit});}return rows;
});
test('killing normal hit, successive hits and restored in-flight state keep one proc',()=>{
 const rows=[];for(const c of [0,1,6]){let r=fixture(c);cast(r,'MOND_NOELLE_E');cast(r,'MOND_NOELLE_Q');wound(r);foe(r).hp=1;const events=capture(r),kill=strike(r,events);assertSingle(r,kill);const second=strike(r,events);assert.equal(second.events.length,0);r=new env.R(env.db,JSON.parse(r.serialize()));r.die=()=>1;r.random=()=>.5;const restoredEvents=capture(r),same=strike(r,restoredEvents);assert.equal(same.events.length,0);r.roundEnd();cast(r,'MOND_NOELLE_E');cast(r,'MOND_NOELLE_Q');wound(r);const next=strike(r,restoredEvents);assertSingle(r,next);rows.push({c,kill,second,same,next});}return rows;
});
test('same-round normal damage hits share one proc and summon/follow-up damage cannot use it',()=>{
 const rows=[];for(const c of [1,6]){const r=fixture(c);cast(r,'MOND_NOELLE_E');cast(r,'MOND_NOELLE_Q');wound(r);r.die=()=>60;const events=capture(r),a=owner(r),targets=r.s.runtime.actors.filter(a=>a.side==='ENEMY');r.damage(a,targets[0],.05,'GEO',{sourceKind:'FOLLOWUP'});assert.equal(events.length,0);for(let i=0;i<3;i++)r.damage(a,targets[i%targets.length],.1,'GEO',{card:'PLAYER_BASIC_ATTACK'});assert.equal(events.length,4);assert.equal(new Set(events.map(e=>e.target)).size,4);const next=strike(r,events);assert.equal(next.events.length,0);rows.push({c,events,next});}return rows;
});
if(process.env.COMBAT_EVIDENCE_OUT)fs.writeFileSync(process.env.COMBAT_EVIDENCE_OUT,JSON.stringify({fingerprint:env.fingerprint,fixture:{partySize:4,level:25,seed:717,sourceRoot:env.root,scope:'isolated native lifecycle; enemy HP durability only'},results},null,2)+'\n');
