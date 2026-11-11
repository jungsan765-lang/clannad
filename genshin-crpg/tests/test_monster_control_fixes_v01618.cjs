'use strict';
// Native encounter actors, legal installed cards and actual cover equipment.
// Prior applyDamage packets place an existing actor at a KO boundary; no combat stats are replaced.
const assert=require('node:assert/strict');
const {fresh,R,db}=require('./helpers_v011.cjs');
const plain=x=>JSON.parse(JSON.stringify(x)),results=[];
const actor=(r,id)=>r.s.runtime.actors.find(a=>a.source===id);
const status=(a,id)=>a.statuses.find(s=>s.id===id);
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
function recruit(r,ids){ids.forEach((id,i)=>{r.adminApply({op:'recruit',char:id});r.s.party[i+1]={slot:'PARTY_'+(i+2),type:'CHAR',source:id,active:true,control:'AI',tactic:'균형'};});}
function ready(r){r.autoUntilPlayer=()=>{};r.die=()=>1;r.random=()=>.01;return r;}
function start(map,group,ids,level=30,origin='EXPLICIT',equip){
 const r=fresh(map,'ROUTE_ISEKAI');recruit(r,ids);r.adminApply({op:'level',target:'ALL',value:level});
 if(equip)r.equip(r.giveEquipment(equip.id),equip.owner);
 ready(r);r.startBattle(group,origin);if(r.combatOpening())r.beginCombat();
 // Reach a real save boundary through the native turn walker; only opening AI actions are held for isolation.
 const ai=r.aiTurn;r.aiTurn=a=>{a.guard=true;};try{R.prototype.autoUntilPlayer.call(r);}finally{r.aiTurn=ai;}
 assert.equal(r.s.runtime.phase,'WAIT_PLAYER');return r;
}
function restore(r){return ready(new R(db,plain(JSON.parse(r.serialize()))));}
function cast(r,a,id,t){const c=r.actorCards(a).find(c=>c.id===id);assert(c,id+' installed');assert.equal(r.cardReason(a,c),'',id+' legal');assert(r.cardTargets(a,c).some(x=>x.id===t.id),id+' target legal');r.executeCard(a,c,t.id);}
function woundToOne(r,source,target){
 const shields=target.shields.reduce((n,s)=>n+s.value,0);r.applyDamage(source,target,target.hp+shields-1,{element:'물리',sourceKind:'TEST_PRIOR_DAMAGE'});assert.equal(target.hp,1);assert.equal(target.shields.length,0);
}
function ownTurn(r,a){const b=r.s.runtime,p=actor(r,'PLAYER_CUSTOM');b.round++;b.order=[{id:a.id},{id:p.id}];b.cursor=0;b.turnStarted=null;const ai=r.aiTurn;r.aiTurn=x=>{x.guard=true;};try{R.prototype.autoUntilPlayer.call(r);}finally{r.aiTurn=ai;}assert.equal(b.order[b.cursor].id,p.id);}

for(const reloaded of [false,true])check('enemy guardian KO sends remaining legal Diluc hits to original target'+(reloaded?' after restore':''),()=>{
 let r=start('MAP_MOND_WOLVENDOM','EG_MOND_LOCAL_MOND_WOLVENDOM_2',['MOND_DILUC'],30,'RANDOM');
 let g=actor(r,'MON_MITACHURL_WOOD'),t=actor(r,'MON_HILI_PYRO_SHOOTER'),a=actor(r,'MOND_DILUC');
 assert(r.enemyHasAffix(g,'GUARDIAN'),'existing encounter assigns guard');woundToOne(r,actor(r,'PLAYER_CUSTOM'),g);
 // An existing cached choice survives save/load, just as completed prior action state can.
 assert.equal(r.enemyGuardFor(a,t,{card:'MOND_DILUC_E'}),g);
 if(reloaded){r=restore(r);g=actor(r,'MON_MITACHURL_WOOD');t=actor(r,'MON_HILI_PYRO_SHOOTER');a=actor(r,'MOND_DILUC');}
 const hp=t.hp,startLog=r.s.runtime.log.length;cast(r,a,'MOND_DILUC_E',t);
 const logs=r.s.runtime.log.slice(startLog);assert.equal(g.hp,0);assert(t.hp<hp,'remaining hits reach chosen enemy');assert.equal(logs.filter(x=>x.guard&&x.cover).length,1,'only living guard redirects');
 assert.equal(logs.filter(x=>x.target===t.name&&x.damage>0).length,2,'two remaining skill hits land');
 return {reloaded,guardHp:g.hp,targetHpBefore:hp,targetHpAfter:t.hp,remainingHits:2};
});

for(const reloaded of [false,true])check('ally cover KO sends remaining legal enemy barrage hits to original target'+(reloaded?' after restore':''),()=>{
 let r=start('MAP_MOND_PLAINS','EG_MOND_LOCAL_CRPG_STORMBEARER_POINT_2',['MOND_AMBER'],30,'EXPLICIT',{id:'EQ_ACC_GUARDIAN_TOKEN',owner:'MOND_AMBER'});
 let e=actor(r,'MON_WHOPPER_PYRO'),g=actor(r,'MOND_AMBER'),p=actor(r,'PLAYER_CUSTOM');assert(g.traits.COVER>0);woundToOne(r,e,g);
 assert.equal(r.coverFor(e,p,{card:'ECARD_WHOPPER_PYRO_BARRAGE'}),g);
 if(reloaded){r=restore(r);e=actor(r,'MON_WHOPPER_PYRO');g=actor(r,'MOND_AMBER');p=actor(r,'PLAYER_CUSTOM');}
 const hp=p.hp,startLog=r.s.runtime.log.length;cast(r,e,'ECARD_WHOPPER_PYRO_BARRAGE',p);
 const logs=r.s.runtime.log.slice(startLog);assert.equal(g.hp,0);assert(p.hp<hp);assert.equal(logs.filter(x=>x.cover).length,1);assert.equal(logs.filter(x=>x.target===p.name&&x.damage>0).length,2);
 return {reloaded,coverHp:g.hp,targetHpBefore:hp,targetHpAfter:p.hp,remainingHits:2};
});

check('living cover choices keep one roll; disabled cached guards stop redirecting without re-roll',()=>{
 const r=start('MAP_MOND_WOLVENDOM','EG_MOND_LOCAL_MOND_WOLVENDOM_2',['MOND_DILUC'],30,'RANDOM'),g=actor(r,'MON_MITACHURL_WOOD'),t=actor(r,'MON_HILI_PYRO_SHOOTER'),a=actor(r,'MOND_DILUC');
 let rolls=0;r.random=()=>{rolls++;return .01;};for(let i=0;i<3;i++)assert.equal(r.enemyGuardFor(a,t,{card:'MOND_DILUC_E'}),g);assert.equal(rolls,1);
 assert(r.addCombatStatus(g,'STATUS_STUN',1));assert.equal(r.enemyGuardFor(a,t,{card:'MOND_DILUC_E'}),null);assert.equal(rolls,1);
 const ar=start('MAP_MOND_PLAINS','EG_MOND_LOCAL_CRPG_STORMBEARER_POINT_2',['MOND_AMBER'],30,'EXPLICIT',{id:'EQ_ACC_GUARDIAN_TOKEN',owner:'MOND_AMBER'}),e=actor(ar,'MON_WHOPPER_PYRO'),c=actor(ar,'MOND_AMBER'),p=actor(ar,'PLAYER_CUSTOM');
 let coverRolls=0;ar.random=()=>{coverRolls++;return .01;};for(let i=0;i<3;i++)assert.equal(ar.coverFor(e,p,{card:'ECARD_WHOPPER_PYRO_BARRAGE'}),c);assert.equal(coverRolls,1);
 assert(ar.addCombatStatus(c,'STATUS_STUN',1));assert.equal(ar.coverFor(e,p,{card:'ECARD_WHOPPER_PYRO_BARRAGE'}),null);assert.equal(coverRolls,1);
 return {guardRolls:rolls,coverRolls};
});

for(const reloaded of [false,true])check('native DRENCH creates finite Hydro aura through complete round boundary'+(reloaded?' after restore':''),()=>{
 let r=start('MAP_MOND_WOLVENDOM','EG_MOND_LOCAL_CRPG_DADAUPA_GORGE_3',['MOND_AMBER','MOND_KAEYA','MOND_LISA'],30,'RANDOM');
 const b=r.s.runtime,s=actor(r,'MON_SAMACHURL_HYDRO');for(const a of b.actors){delete a.variant;delete a.lineRole;if(a.side==='ALLY')r.auraList(a);}b.enemyTiers.promoted=[];b.enemyTiers.lineup=null;b.hazards=[];
 // Select the existing affix API to isolate its native hazard hook; this is not a spawn-rate simulation.
 r.promoteEnemy(b,s,4,['DRENCH']);r.aiTurn(s,b.actors.filter(a=>a.side==='ALLY'&&a.hp>0));assert(b.hazards.some(h=>h.kind==='FLOOD'));r.roundEnd();
 let amber=actor(r,'MOND_AMBER');assert(status(amber,'HAZARD_WET'));assert(r.auraList(amber).some(a=>a.element==='물'));assert.equal(r.reactionFor(amber,'얼음')[0],'RX_FROZEN');assert.equal(amber.nativeAura,undefined);
 if(reloaded){r=restore(r);amber=actor(r,'MOND_AMBER');assert(r.auraList(amber).some(a=>a.element==='물'));}
 let ticks=0;while(r.auraList(amber).some(a=>a.element==='물')&&ticks<5){r.roundEnd();ticks++;}
 assert.equal(r.s.runtime.hazards.length,0);assert(!r.auraList(amber).some(a=>a.element==='물'),'Hydro expires after flood stops');assert.equal(amber.aura,null);
 return {reloaded,expiryBoundaries:ticks,permanentAura:amber.nativeAura||null};
});

check('flood Hydro supports a legal cryo card and preserves waterproof mitigation',()=>{
 const r=start('MAP_CRPG_ENTOMBED_OUTSKIRTS','EG_MOND_LOCAL_CRPG_ENTOMBED_OUTSKIRTS_4',['MOND_AMBER'],30),e=actor(r,'MON_WHOPPER_CRYO'),a=actor(r,'MOND_AMBER');
 r.auraList(a);r.addHazard({id:'TEST_FLOOD',kind:'FLOOD',rounds:1,targets:'FRONT'});r.tickHazards();assert(r.auraList(a).some(x=>x.element==='물'));cast(r,e,'ECARD_WHOPPER_CRYO_BARRAGE',a);assert(status(a,'STATUS_FREEZE'),'legal cryo barrage freezes flooded target');
 const blocked=start('MAP_MOND_PLAINS','EG_MOND_LOCAL_CRPG_STORMBEARER_POINT_2',['MOND_AMBER'],30),dry=actor(blocked,'MOND_AMBER');dry.traits.WATERPROOF=50;
 blocked.addHazard({id:'TEST_FLOOD',kind:'FLOOD',rounds:1,targets:'FRONT'});blocked.tickHazards();assert(!status(dry,'HAZARD_WET'));assert(!blocked.auraList(dry).some(x=>x.element==='물'));
 return {freeze:true,waterproofThresholdPreserved:true};
});

for(const element of ['PYRO','CRYO'])for(const reloaded of [false,true])check('legal petrify immediately cancels '+element+' charge and expires exposed at own turn'+(reloaded?' after restore':''),()=>{
 const pyro=element==='PYRO';let r=start(pyro?'MAP_MOND_PLAINS':'MAP_CRPG_ENTOMBED_OUTSKIRTS',pyro?'EG_MOND_LOCAL_CRPG_STORMBEARER_POINT_2':'EG_MOND_LOCAL_CRPG_ENTOMBED_OUTSKIRTS_4',['LIYUE_ZHONGLI'],1);
 let e=actor(r,'MON_WHOPPER_'+element),z=actor(r,'LIYUE_ZHONGLI'),p=actor(r,'PLAYER_CUSTOM');r.random=()=>.5;
 cast(r,e,'ECARD_WHOPPER_'+element+'_CHARGE',p);assert(e.enemyCharge);cast(r,z,'LIYUE_ZHONGLI_Q',e);assert(e.hp>0,'enemy survives legal petrify');assert(status(e,'LIYUE_PETRIFY'));
 assert.equal(e.enemyCharge,undefined);const exposed=status(e,'ENEMY_CHARGE_EXPOSED');assert(exposed);assert.equal(exposed.untilTurn,e.turns+1);
 const base=plain(e);base.statuses=base.statuses.filter(s=>s.id!=='ENEMY_CHARGE_EXPOSED');assert.equal(r.combatDamageMultiplier(p,e,'물리')/r.combatDamageMultiplier(p,base,'물리'),1.2,'existing exposure applies immediately');
 if(reloaded){r=restore(r);e=actor(r,'MON_WHOPPER_'+element);z=actor(r,'LIYUE_ZHONGLI');assert.equal(e.enemyCharge,undefined);assert(status(e,'ENEMY_CHARGE_EXPOSED'));}
 ownTurn(r,e);assert(!status(e,'ENEMY_CHARGE_EXPOSED'));assert(!r.s.runtime.log.some(x=>x.actorId===e.id&&x.released),'interrupted charge does not release');
 assert(r.combatActionLocked(e));assert.equal(r.addCombatStatus(e,'LIYUE_PETRIFY',1),null,'repeat petrify respects grace');ownTurn(r,e);assert(!r.combatActionLocked(e));
 return {element,reloaded,immediateExposure:true,skippedFirstOwnTurn:true,nextTurnFree:true};
});

check('rejected petrify during control grace does not interrupt a valid new charge',()=>{
 const r=start('MAP_MOND_PLAINS','EG_MOND_LOCAL_CRPG_STORMBEARER_POINT_2',['LIYUE_ZHONGLI'],1),e=actor(r,'MON_WHOPPER_PYRO'),z=actor(r,'LIYUE_ZHONGLI'),p=actor(r,'PLAYER_CUSTOM');r.random=()=>.5;
 cast(r,z,'LIYUE_ZHONGLI_Q',e);ownTurn(r,e);ownTurn(r,e);assert(!r.combatActionLocked(e));cast(r,e,'ECARD_WHOPPER_PYRO_CHARGE',p);const charge=plain(e.enemyCharge);
 assert.equal(r.addCombatStatus(e,'LIYUE_PETRIFY',1,{actor:z.id}),null);assert.deepEqual(plain(e.enemyCharge),charge);assert(!status(e,'ENEMY_CHARGE_EXPOSED'));return {gracePreserved:true};
});

console.log(JSON.stringify({ok:!process.exitCode,total:results.length,passed:results.filter(x=>x.ok).length,evidence:results}));
