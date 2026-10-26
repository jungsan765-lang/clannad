'use strict';
// Full product load order, native encounter actors/cards and installed resistance gear.
// Own-turn boundaries and fixed RNG isolate lifecycle rules without replacing combat stats.
const assert=require('node:assert/strict');
const {fresh,R,db}=require('./helpers_v011.cjs');
const plain=x=>JSON.parse(JSON.stringify(x)),results=[];
const actor=(r,source)=>r.s.runtime.actors.find(a=>a.source===source);
const status=(a,id)=>a.statuses.find(s=>s.id===id);
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
function ready(r){r.autoUntilPlayer=()=>{};r.die=()=>1;r.random=()=>.01;return r;}
function start({map='MAP_MOND_PLAINS',group='EG_MOND_LOCAL_CRPG_STORMBEARER_POINT_2',gear}={}){
 const r=fresh(map,'ROUTE_ISEKAI');r.adminApply({op:'recruit',char:'MOND_KAEYA'});r.s.party[1]={slot:'PARTY_2',type:'CHAR',source:'MOND_KAEYA',active:true,control:'AI',tactic:'균형'};
 r.adminApply({op:'level',target:'ALL',value:30});if(gear)r.action('EQUIP',{slot:r.giveEquipment(gear),owner:'MOND_KAEYA'});
 ready(r);r.startBattle(group,'EXPLICIT');if(r.combatOpening())r.beginCombat();
 const ai=r.aiTurn;r.aiTurn=a=>{a.guard=true;};try{R.prototype.autoUntilPlayer.call(r);}finally{r.aiTurn=ai;}
 assert.equal(r.s.runtime.phase,'WAIT_PLAYER');return r;
}
function restore(r){return ready(new R(db,plain(JSON.parse(r.serialize()))));}
function ownTurn(r,a,{nativeAI=false}={}){
 const b=r.s.runtime,p=actor(r,'PLAYER_CUSTOM');b.round++;b.order=[{id:a.id},{id:p.id}];b.cursor=0;b.turnStarted=null;
 const ai=r.aiTurn;if(!nativeAI)r.aiTurn=x=>{x.guard=true;};try{R.prototype.autoUntilPlayer.call(r);}finally{r.aiTurn=ai;}
 assert.equal(b.order[b.cursor].id,p.id);return b;
}
function charge(r,e){const p=actor(r,'PLAYER_CUSTOM'),id='ECARD_WHOPPER_PYRO_CHARGE',c=r.actorCards(e).find(c=>c.id===id);assert(c,'native charge card installed');assert.equal(r.cardReason(e,c),'','native charge legal');assert(r.cardTargets(e,c).some(t=>t.id===p.id));r.executeCard(e,c,p.id);assert(e.enemyCharge);return plain(e.enemyCharge);}

for(const reloaded of [false,true])check('rejected freeze during grace keeps native charge and releases next own turn'+(reloaded?' after restore':''),()=>{
 let r=start(),e=actor(r,'MON_WHOPPER_PYRO'),k=actor(r,'MOND_KAEYA');assert.equal(r.applyCombatControl(k,e,'FREEZE',{element:'얼음'}),true);assert(status(e,'STATUS_FREEZE'));
 ownTurn(r,e);ownTurn(r,e);assert(!r.combatActionLocked(e));assert(e.turns<e.controlGuard,'two-free-turn grace still applies');
 const expected=charge(r,e),guard=e.controlGuard;if(reloaded){r=restore(r);e=actor(r,'MON_WHOPPER_PYRO');k=actor(r,'MOND_KAEYA');}
 const at=r.s.runtime.log.length;assert.equal(r.applyCombatControl(k,e,'FREEZE',{element:'얼음'}),false,'rejected status is rejected control');
 assert.deepEqual(plain(e.enemyCharge),expected);assert.equal(e.controlGuard,guard);assert(!status(e,'STATUS_FREEZE'));assert(!status(e,'ENEMY_CHARGE_EXPOSED'));
 assert(!r.s.runtime.log.slice(at).some(x=>x.interrupted));assert(r.s.runtime.log.slice(at).some(x=>x.resisted==='STATUS_FREEZE'));
 ownTurn(r,e,{nativeAI:true});assert.equal(e.enemyCharge,undefined);assert(r.s.runtime.log.slice(at).some(x=>x.actorId===e.id&&x.released),'uninterrupted native charge releases');
 return {reloaded,graceGuard:guard,chargeReleased:true};
});

for(const reloaded of [false,true])check('landed freeze immediately interrupts once and keeps existing expiry'+(reloaded?' after restore':''),()=>{
 let r=start(),e=actor(r,'MON_WHOPPER_PYRO'),k=actor(r,'MOND_KAEYA');charge(r,e);if(reloaded){r=restore(r);e=actor(r,'MON_WHOPPER_PYRO');k=actor(r,'MOND_KAEYA');}
 const at=r.s.runtime.log.length;assert.equal(r.applyCombatControl(k,e,'FREEZE',{element:'얼음'}),true);assert(status(e,'STATUS_FREEZE'));assert.equal(e.enemyCharge,undefined);
 const exposed=status(e,'ENEMY_CHARGE_EXPOSED');assert(exposed);assert.equal(exposed.untilTurn,e.turns+1);assert.equal(r.s.runtime.log.slice(at).filter(x=>x.interrupted).length,1);
 ownTurn(r,e);assert(!status(e,'ENEMY_CHARGE_EXPOSED'));assert(r.combatActionLocked(e));ownTurn(r,e);assert(!r.combatActionLocked(e));
 return {reloaded,immediateInterrupt:true,interruptedLogs:1};
});

for(const kind of ['FREEZE','LIFT'])check('native equipment resistance rejects '+kind+' without action delay',()=>{
 const r=start({gear:'EQ_ACC_STEADFAST'}),e=actor(r,'MON_WHOPPER_PYRO'),k=actor(r,'MOND_KAEYA');assert.equal(k.traits.CONTROL_RES,10);
 const penalty=k.nextScorePenalty,guard=k.controlGuard,at=r.s.runtime.log.length;assert.equal(r.applyCombatControl(e,k,kind,{element:kind==='FREEZE'?'얼음':'바람'}),false);
 assert(!status(k,kind==='FREEZE'?'STATUS_FREEZE':'LIFTED'));assert.equal(k.nextScorePenalty,penalty);assert.equal(k.controlGuard,guard);assert(r.s.runtime.log.slice(at).some(x=>x.resisted===(kind==='FREEZE'?'STATUS_FREEZE':'LIFTED')));
 r.random=()=>.99;assert.equal(r.applyCombatControl(e,k,kind,{element:kind==='FREEZE'?'얼음':'바람'}),true);assert(status(k,kind==='FREEZE'?'STATUS_FREEZE':'LIFTED'));
 if(kind==='LIFT')assert.equal(k.nextScorePenalty,10);return {kind,resistanceRejects:true,failedResistanceRollAdmits:true};
});

check('successful lift preserves delay and immediately interrupts native charge',()=>{
 const r=start(),e=actor(r,'MON_WHOPPER_PYRO'),k=actor(r,'MOND_KAEYA');charge(r,e);const at=r.s.runtime.log.length;
 assert.equal(r.applyCombatControl(k,e,'LIFT',{element:'바람'}),true);assert(status(e,'LIFTED'));assert.equal(e.nextScorePenalty,10);assert.equal(e.enemyCharge,undefined);assert.equal(r.s.runtime.log.slice(at).filter(x=>x.interrupted).length,1);
 return {delay:10,interrupted:true};
});

check('native large enemy retains soft freeze and displacement immunity',()=>{
 const r=start({map:'MAP_MOND_WOLVENDOM',group:'EG_MOND_LOCAL_MOND_WOLVENDOM_2'}),e=actor(r,'MON_MITACHURL_WOOD'),k=actor(r,'MOND_KAEYA');assert.equal(r.combatSize(e),'LARGE');
 assert.equal(r.applyCombatControl(k,e,'FREEZE',{element:'얼음'}),true);assert(status(e,'BOSS_CONTROL'));assert(!status(e,'STATUS_FREEZE'));assert(!r.combatActionLocked(e));
 const position=plain(e.position);for(const kind of ['PULL','PUSH','LIFT'])assert.equal(r.applyCombatControl(k,e,kind,{element:'바람'}),false);assert.deepEqual(plain(e.position),position);assert(!status(e,'LIFTED'));
 return {softFreeze:true,largeDisplacementImmune:true};
});

check('native boss soft control reports a real status while immune Osial rejects it',()=>{
 const r=start({map:'MAP_LIYUE_PLAINS',group:'EG_BOSS_AZHDAHA'}),e=actor(r,'BOSS_AZHDAHA'),k=actor(r,'MOND_KAEYA');assert.equal(r.combatSize(e),'BOSS');
 assert.equal(r.applyCombatControl(k,e,'FREEZE'),true);assert(status(e,'BOSS_CONTROL'));assert(!status(e,'STATUS_FREEZE'));assert(!r.combatActionLocked(e));
 assert.equal(r.applyCombatControl(k,e,'PUSH',{bossImmune:true}),false);
 const o=start({map:'MAP_LIYUE_PLAINS',group:'EG_BOSS_OSIAL'}),boss=actor(o,'BOSS_OSIAL');assert(boss);assert.equal(o.applyCombatControl(actor(o,'MOND_KAEYA'),boss,'FREEZE'),false);assert(!status(boss,'BOSS_CONTROL'));
 return {existingSoftBossControl:true,osialImmune:true};
});

check('native successful push interrupts but wall-blocked push keeps charge',()=>{
 const r=start(),e=actor(r,'MON_WHOPPER_PYRO'),p=actor(r,'PLAYER_CUSTOM');charge(r,e);const position=plain(e.position);assert.equal(r.applyCombatControl(p,e,'PUSH',{element:'바람'}),true);assert.notDeepEqual(plain(e.position),position);assert.equal(e.enemyCharge,undefined);
 const blocked=start(),be=actor(blocked,'MON_WHOPPER_PYRO'),bp=actor(blocked,'PLAYER_CUSTOM');assert(blocked.moveCombatActor(be,{x:5,y:bp.position.y},{forced:true}));const expected=charge(blocked,be),at=blocked.s.runtime.log.length;
 assert.equal(blocked.applyCombatControl(bp,be,'PUSH',{element:'바람'}),false);assert.deepEqual(plain(be.enemyCharge),expected);assert(!blocked.s.runtime.log.slice(at).some(x=>x.interrupted));
 return {successfulPushInterrupts:true,wallBlockedPushPreservesCharge:true};
});

console.log(JSON.stringify({ok:!process.exitCode,total:results.length,passed:results.filter(x=>x.ok).length,evidence:results}));
