'use strict';
const assert=require('node:assert/strict');
const {R,db}=require('./helpers_v011.cjs');
const {setup,TEAMS,api}=require('../tools/audit_balance_v01522.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
function begin(r){if(r.combatOpening?.())r.action('COMBAT_BEGIN');assert(r.s.runtime,'native fixture must remain in combat');return r.s.runtime;}
function receipt(r){assert.equal(r.s.runtime,null,'battle must settle');return JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);}
function ready(r){Object.assign(r.tutorialState().done,{combatAttack:true,combatGuard:true,combatSkill:true,combatBurst:true});return r;}
function captureSettlement(r){const finish=r.finishBattle;r.finishBattle=function(win){this._boundaryBattle=plain(this.s.runtime);return finish.call(this,win);};}

// Native actors, authored encounters, skills, auras and settlement run unchanged.
// Only HP, the completed-initiative cursor and objective/round boundaries are
// injected to reproduce the audited edge cases; these are not balance tests.
const evacuationNodes=[
 ['ISK_L04_AA1_058','EG_ISK_L04_AA1_EVAC','AA1'],
 ['ISK_L04_AA2_057','EG_ISK_L04_AA2_CART','AA2'],
 ['ISK_L04_AB1_066','EG_ISK_L04_AB1_STREET','AB1'],
 ['ISK_L04_AB2_065','EG_ISK_L04_AB2_STORE','AB2'],
 ['ISK_L04_B1_051','EG_ISK_L04_B1_ROAD','B1'],
 ['ISK_L04_B2_047','EG_ISK_L04_B2_BOAT','B2']
];
function evacuation([node,group,leaf]){
 const r=ready(setup({level:60,team:'heal',enhance:10,talent:8,map:'MAP_LIYUE_HARBOR',saveId:'BOUNDARY-EVAC-'+leaf}));
 r.s.flags.FLAG_ISK_L01_LEAF=leaf;r.s.flags.FLAG_ISK_L03_LEAF=leaf;r.storySetCursor(node);
 assert.equal(r.combatStoryConfig(group).objective.kind,'LOCAL_EVACUATION_DEFENSE');
 r.s.global.CURRENT_MAP_ID=r.storyNode()[8];r.startBattle(group,'STORY:'+node,{confirmed:true,companions:TEAMS.heal});
 const b=begin(r);assert(b.liyueEvacuation);return {r,b};
}
for(const fixture of evacuationNodes)check('completed authored evacuation settles with a KO protagonist: '+fixture[0],()=>{
 const {r,b}=evacuation(fixture);r.combatActor().hp=0;
 for(const a of b.actors.filter(a=>a.side==='ENEMY'))a.hp=0;
 b.round=5;b.liyueEvacuation.completedRounds=4;const start=b.log.length;
 r.autoUntilPlayer();const out=receipt(r);assert.equal(out.victory,true);assert.equal(out.result,'VICTORY');
 assert.equal(out.rounds,5);assert.equal(b.actors.find(a=>a.source==='PLAYER_CUSTOM').hp,0,'objective resolution must not invent an in-combat revival');
 assert.equal(b.log.length,start,'completed defense must not run another combat action');
 const saved=plain(out);r.autoUntilPlayer();assert.deepEqual(receipt(r),saved,'receipt must remain stable');
});
check('an old saved evacuation HOLD resumes to victory with living allies',()=>{
 const {r,b}=evacuation(evacuationNodes[0]);r.combatActor().hp=0;
 for(const a of b.actors.filter(a=>a.side==='ENEMY'))a.hp=0;
 b.round=5;b.liyueEvacuation.completedRounds=4;b.defenseAwaitingRecovery=true;b.phase='WAIT_PLAYER';
 const loaded=new R(db,JSON.parse(r.serialize()));loaded.autoUntilPlayer();assert.equal(receipt(loaded).victory,true);
});
check('completed evacuation remains a defeat when the whole party is KO',()=>{
 const {r,b}=evacuation(evacuationNodes[0]);for(const a of b.actors)a.hp=0;
 b.liyueEvacuation.completedRounds=4;r.autoUntilPlayer();assert.equal(receipt(r).victory,false);
});
check('evacuation still requires four completed rounds and no living enemy',()=>{
 const {r,b}=evacuation(evacuationNodes[0]);const foes=b.actors.filter(a=>a.side==='ENEMY');
 b.liyueEvacuation.completedRounds=4;assert.equal(r.liyueBattleOutcome(b),undefined);
 for(const a of foes)a.hp=0;b.liyueEvacuation.completedRounds=3;assert.equal(r.liyueBattleOutcome(b),undefined);
});

function azhdaha(){
 const r=ready(setup({level:60,team:'heal',enhance:10,talent:8,map:'MAP_AZHDAHA_DOMAIN'}));
 r.startBattle('EG_BOSS_AZHDAHA','EXPLICIT');const b=begin(r),boss=b.actors.find(a=>a.source==='BOSS_AZHDAHA');
 assert(boss.azhdaha);r.die=()=>50;r.random=()=>.5;return {r,b,boss};
}
for(const phase of [1,2])check('a native lethal basic attack cannot trigger a dead Azhdaha phase '+phase,()=>{
 const {r,b,boss}=azhdaha();if(phase===2){boss.hp=Math.ceil(boss.maxHp*.6);r.resolveEnemyPhases();}
 assert.equal(boss.azhdaha.phase,phase);
 for(const a of b.actors.filter(a=>a.side==='ALLY')){a.hp=1;a.shields=[];a.statuses=[];a.aura=null;a.auras=[];}
 boss.hp=1;const start=b.log.length;captureSettlement(r);
 r.action('COMBAT',{card:'PLAYER_BASIC_ATTACK',target:boss.id});const out=receipt(r);
 const settled=r._boundaryBattle,dead=settled.actors.find(a=>a.id===boss.id);
 assert.equal(dead.hp,0);assert.equal(dead.azhdaha.phase,phase);assert.equal(out.victory,true);
 assert(!settled.log.slice(start).some(x=>x.card==='ECARD_AZHDAHA_PHASE_SHIFT'),'no postmortem phase attack');
 assert(settled.actors.filter(a=>a.side==='ALLY').every(a=>a.hp===1),'last hit must not harm the surviving party');
});
check('living Azhdaha still resolves both crossed phase boundaries',()=>{
 const {r,b,boss}=azhdaha();boss.hp=Math.ceil(boss.maxHp*.35);const start=b.log.length;
 r.resolveEnemyPhases();assert.equal(boss.azhdaha.phase,3);assert.equal(boss.azhdaha.current,boss.azhdaha.element2);
 assert.equal(b.log.slice(start).filter(x=>x.card==='ECARD_AZHDAHA_PHASE_SHIFT'&&x.phase).length,2);
 assert(b.log.slice(start).some(x=>x.sourceKind==='AZHDAHA_PHASE'&&x.damage>0),'living phase attacks remain active');
});

function abyss(team='heal',profile={}){
 const r=ready(setup({level:60,team,enhance:10,talent:8,map:'MAP_V141_MUSK_REEF',...profile}));
 r.action('ABYSS_ENTER',{floor:1});const b=begin(r);b.fields=[];
 for(const a of b.actors){a.statuses=[];a.auras=[];a.aura=null;}
 const foes=b.actors.filter(a=>a.side==='ENEMY');foes[0].hp=0;const last=foes[1];last.hp=1;
 r.die=()=>50;r.random=()=>.5;return {r,b,last};
}
for(const offset of [-1,0])check('native Oz END kill wins on permitted Abyss round '+offset,()=>{
 const {r,b,last}=abyss();b.round=b.abyss.limit+offset;
 const f=b.actors.find(a=>a.source==='MOND_FISCHL');r.executeCard(f,r.actorCards(f).find(c=>c.id==='MOND_FISCHL_E'),last.id);
 assert(b.fields.some(x=>x.kind==='OZ'&&x.createdRound===b.round));b.cursor=b.order.length;
 r.autoUntilPlayer();const out=receipt(r);assert.equal(out.victory,true);assert.equal(out.abyss.outcome,'NEXT');
 assert.equal(out.rounds,b.abyss.limit+offset);assert.equal(b.abyss.expired,undefined);assert.equal(last.hp,0);
});
check('native burning END kill wins on the last allowed Abyss round',()=>{
 const {r,b,last}=abyss(['LIYUE_YAOYAO','LIYUE_XIANGLING','MOND_BARBARA']);b.round=b.abyss.limit;
 r.applyCombatAura(b.actors.find(a=>a.source==='LIYUE_YAOYAO'),last,'DENDRO');
 r.applyCombatAura(b.actors.find(a=>a.source==='LIYUE_XIANGLING'),last,'PYRO');
 assert(last.statuses.some(s=>s.reactionTick>0));last.hp=1;b.cursor=b.order.length;
 r.autoUntilPlayer();const out=receipt(r);assert.equal(out.victory,true);assert.equal(out.abyss.outcome,'NEXT');assert.equal(out.rounds,b.abyss.limit);
});
check('native Klee C4 field-expiry END explosion can win on the last allowed Abyss round',()=>{
 const {r,b,last}=abyss(['MOND_KLEE','LIYUE_XIANGLING','MOND_BARBARA'],{level:15,enhance:3,talent:1}),k=b.actors.find(a=>a.source==='MOND_KLEE');
 (r.s.constellations??={}).MOND_KLEE=4;b.round=b.abyss.limit-1;
 r.executeCard(k,r.actorCards(k).find(c=>c.id==='MOND_KLEE_Q'),last.id);
 const field=b.fields.find(x=>x.kind==='BOMBARD');assert(field);field.rounds=1;b.round=b.abyss.limit;
 // Measure one native, non-reacting bombard hit at fixed PRNG, then leave enough
 // HP to survive its four END hits so the expiry explosion decides the result.
 last.hp=last.maxHp;const before=last.hp;
 r.damage(k,last,.35,'PYRO',{range:'중거리',sourceKind:'FIELD',card:'MOND_KLEE_Q',noAura:true});
 const one=before-last.hp;assert(one>0&&one*4+1<=last.maxHp);last.hp=one*4+1;last.statuses=[];last.auras=[];last.aura=null;
 const start=b.log.length;b.cursor=b.order.length;r.autoUntilPlayer();const out=receipt(r);
 assert.equal(out.victory,true);assert.equal(out.abyss.outcome,'NEXT');assert.equal(out.rounds,b.abyss.limit);
 assert(b.log.slice(start).some(x=>x.sourceKind==='CONSTELLATION'&&x.damage>0),'native expiry explosion must fire');
 assert(!b.log.slice(start).some(x=>x.text==='나선의 문이 닫혔다.'),'a legal final END win must not log timeout');
});
check('native direct attack wins on the last allowed Abyss round',()=>{
 const {r,b,last}=abyss();b.round=b.abyss.limit;
 r.action('COMBAT',{card:'PLAYER_BASIC_ATTACK',target:last.id});const out=receipt(r);
 assert.equal(out.victory,true);assert.equal(out.abyss.outcome,'NEXT');assert.equal(out.rounds,b.abyss.limit);
});
check('Abyss timeout excludes a native Ice START kill from the next round',()=>{
 const {r,b,last}=abyss(['MOND_KAEYA','LIYUE_XIANGLING','MOND_BARBARA']);b.round=b.abyss.limit;
 const k=b.actors.find(a=>a.source==='MOND_KAEYA');last.position=plain(k.position);
 r.executeCard(k,r.actorCards(k).find(c=>c.id==='MOND_KAEYA_Q'),last.id);
 assert(b.fields.some(x=>x.kind==='ICE'&&x.createdRound===b.round));b.cursor=b.order.length;
 r.autoUntilPlayer();const out=receipt(r);assert.equal(out.victory,false);assert.equal(out.abyss.outcome,'TIMEOUT');
 assert.equal(out.rounds,b.abyss.limit);assert.equal(last.hp,1,'no extra next-round START damage');
 assert.equal(b.log.filter(x=>x.text==='나선의 문이 닫혔다.').length,1);
});
check('ordinary living enemies still cause timeout at the last allowed Abyss END',()=>{
 const {r,b,last}=abyss();b.round=b.abyss.limit;b.cursor=b.order.length;
 r.autoUntilPlayer();const out=receipt(r);assert.equal(out.victory,false);assert.equal(out.abyss.outcome,'TIMEOUT');assert.equal(out.rounds,b.abyss.limit);assert.equal(last.hp,1);
});
check('Abyss all-party KO remains defeat rather than victory or timeout',()=>{
 const {r,b}=abyss();b.round=b.abyss.limit;for(const a of b.actors)a.hp=0;
 r.autoUntilPlayer();const out=receipt(r);assert.equal(out.victory,false);assert.equal(out.abyss.outcome,'DEFEAT');
});

function guardedBoss(source){
 const r=ready(setup({level:60,team:['LIYUE_YAOYAO','LIYUE_XIANGLING','MOND_BARBARA'],enhance:10,talent:8,map:api.fieldBosses.bosses[source].map}));
 r.startBattle('EG_'+source,'EXPLICIT');const b=begin(r),boss=b.actors.find(a=>a.source===source),me=r.combatActor();
 if(source==='FB_GEO_HYPOSTASIS'){
  r.applyCombatAura(b.actors.find(a=>a.source==='LIYUE_YAOYAO'),boss,'DENDRO');
  r.applyCombatAura(b.actors.find(a=>a.source==='LIYUE_XIANGLING'),boss,'PYRO');assert(boss.statuses.some(s=>s.reactionTick>0));
 }
 r.applyDamage(me,boss,boss.hp+1,{element:'물리'});assert.equal(boss.hp,1);assert.equal(boss.fb.revival.guarded,true);
 assert.equal(b.actors.filter(a=>a.fbSummon?.owner===boss.id&&a.hp>0).length,3);return {r,b,boss,me};
}
for(const source of ['FB_GEO_HYPOSTASIS','FB_ELECTRO_HYPOSTASIS']){
 // Geo uses the native burning tick from the audit. Electro shares the same
 // guard and is additionally checked with an injected indirect damage packet;
 // its permanent Electro aura does not naturally create this burning state.
 check('guarded revival rejects indirect DOT damage: '+source,()=>{
  const {r,b,boss,me}=guardedBoss(source),start=b.log.length;r.tickFields('END');
  assert.equal(boss.hp,1);assert.equal(boss.fb.revival.guarded,true);assert.equal(boss.fb.revival.rounds,3);
  assert.equal(r.applyDamage(me,boss,999999,{element:'불',sourceKind:'REACTION_DOT'}),0);assert.equal(boss.hp,1);
  assert(b.log.slice(start).some(x=>x.targetId===boss.id&&x.damage===0&&x.immune),'protected DOT must be rejected');
  assert.equal(r.damage(me,boss,999,'PHYSICAL',{sureHit:true}),false);assert.equal(boss.hp,1,'direct attack remains protected');
  const guardians=b.actors.filter(a=>a.fbSummon?.owner===boss.id&&a.hp>0),element=source==='FB_GEO_HYPOSTASIS'?'바위':'불';
  for(const guardian of guardians)r.applyDamage(me,guardian,guardian.hp+1,{element});
  assert.equal(boss.hp,0);assert.equal(boss.fb.revival,null);r.autoUntilPlayer();assert.equal(receipt(r).victory,true,'destroying all guardians still wins');
 });
 check('saved guarded revival retains DOT protection: '+source,()=>{
  const {r,boss}=guardedBoss(source),loaded=new R(db,JSON.parse(r.serialize())),saved=loaded.s.runtime.actors.find(a=>a.id===boss.id);
  loaded.tickFields('END');assert.equal(loaded.applyDamage(loaded.combatActor(),saved,999999,{element:'불',sourceKind:'REACTION_DOT'}),0);
  assert.equal(saved.hp,1);assert.equal(saved.fb.revival.guarded,true);
 });
 check('legacy2 guarded revival countdown and one-time revival remain intact: '+source,()=>{
  const {r,b,boss,me}=guardedBoss(source);b.fieldBoss.behaviorRevision=2;boss.statuses=[];b.fields=[];
  r.roundEnd();assert.equal(boss.hp,1);assert.equal(boss.fb.revival.rounds,2);
  r.roundEnd();assert.equal(boss.hp,1);assert.equal(boss.fb.revival.rounds,1);
  r.roundEnd();assert.equal(boss.hp,Math.round(boss.maxHp*.4));assert.equal(boss.fb.revival,null);
  assert(b.actors.filter(a=>a.fbSummon?.owner===boss.id).every(a=>a.hp===0));
  const hp=boss.hp;assert.equal(r.applyDamage(me,boss,10,{element:'물리',sourceKind:'REACTION_DOT'}),10);assert.equal(boss.hp,hp-10);
  r.applyDamage(me,boss,boss.hp+1,{element:'물리'});assert.equal(boss.hp,0);assert.equal(boss.fb.revival,null,'revival remains once per fight');
 });
}
console.log(JSON.stringify({passed,nativeBoundaryRegression:true}));
