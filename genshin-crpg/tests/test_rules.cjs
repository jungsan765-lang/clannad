'use strict';
// Independent outcome checks for HOUSE_RULE_V1. Product files are never modified.
// Engine scripts follow the actual index.html order; DOM application scripts are excluded.
// Turn-start / action-lock integration and Andrius are intentionally out of this suite.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const base=path.resolve(__dirname,'..'),ctx=vm.createContext({console});
const scripts=[...fs.readFileSync(path.join(base,'source/index.html'),'utf8').matchAll(/<script\s+src="([^"]+)"/g)].map(m=>m[1]).filter(n=>/^runtime(?:_[a-z_]+)?\.js$/.test(n));
for(const name of scripts)vm.runInContext(fs.readFileSync(path.join(base,'source',name),'utf8'),ctx,{filename:name});
const db=JSON.parse(fs.readFileSync(path.join(base,'content/db.json'),'utf8')),R=ctx.CRPGRuntime.Runtime;
if(ctx.CRPGRelationships)ctx.CRPGRelationships.install(ctx.CRPGRuntime,{events:ctx.CRPGRelationships.catalogFromDB(db),activities:ctx.CRPGRelationships.activitiesFromDB(db),preferences:{adultModeEnabled:false},eligibility:{profiles:{},protagonists:{}}});
const results=[];
function test(name,fn){try{fn();results.push({name,ok:true});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.message});console.log('FAIL '+name+'\n  '+e.message.replaceAll('\n','\n  '));}}
const plain=x=>JSON.parse(JSON.stringify(x));
const status=(a,id)=>a.statuses.find(s=>s.id===id&&(s.rounds==null||s.rounds>0));
function arena(source='MOND_KAEYA',count=4){
 const r=new R(db);r.newGame({name:'규칙 검증',route:'ROUTE_TRAVELER',seed:12345,saveId:'RULE_REGRESSION'});r.s.global.WORLD_TIME='12:00';
 const actor=r.initCombatActor(r.character(source),2),player=r.initCombatActor(r.player(),1);
 for(const a of [actor,player])Object.assign(a,{atk:100,def:100,spd:10,crit:0,critDmg:50,hit:100,eva:0,resist:0,hp:10000,maxHp:10000,level:20,turns:1,range:'원거리',statuses:[],shields:[],cooldowns:{}});
 const enemies=Array.from({length:count},(_,i)=>({id:'TARGET_'+i,source:'MON_HILI_FIGHTER',name:'표적 '+i,side:'ENEMY',control:'AI',grade:'일반',hp:100000,maxHp:100000,atk:100,def:0,spd:1,crit:0,critDmg:0,hit:100,eva:0,resist:0,level:1,aura:null,range:'근접',statuses:[],shields:[],cooldowns:{},turns:0}));
 const b=r.s.runtime={combatVersion:1,id:'RULE_REGRESSION:B1',origin:'TEST',group:'EG_MOND_HILI_PATROL',round:1,actors:[player,actor,...enemies],fields:[],log:[],order:[{id:player.id,score:10}],cursor:0,phase:'WAIT_PLAYER',terrain:null,actionSequence:0};
 Object.assign(r.s.global,{MODE:'COMBAT',SCREEN_MODE:'COMBAT',ACTIVE_BATTLE_ID:b.id,COMBAT_ACTION_PHASE:'WAIT_PLAYER'});
 r.die=()=>50;r.random=()=>.5;r.initCombatPositions();
 const card=id=>r.cardDefinition(r.row('08_SKILL_CARD_DB',id));
 const cast=(id,target=enemies[0]?.id,branch)=>r.executeCard(actor,card(id),target,branch);
 return {r,b,actor,player,enemies,card,cast};
}
const hp=a=>a.map(t=>t.hp),loss=(before,a)=>a.map((t,i)=>before[i]-t.hp);
const packets=(b,sourceKind)=>b.log.filter(x=>x.damage!==undefined&&(!sourceKind||x.sourceKind===sourceKind));
const setPositions=(actors,points)=>actors.forEach((a,i)=>a.position={x:points[i][0],y:points[i][1]});

test('actual index order loads rules after existing cards and before flow',()=>{
 assert(scripts.indexOf('runtime_mond_cards.js')<scripts.indexOf('runtime_rules.js'));
 assert(scripts.indexOf('runtime_rules.js')<scripts.indexOf('runtime_flow.js'));
 assert.equal(ctx.CRPGRuntime.houseRulesVersion,'HOUSE_RULE_V1');
});
test('all eight formerly missing cards are supported and legal at level 20',()=>{
 for(const owner of ['BENNETT','VENTI','DAHLIA','KLEE','MONA','ROSARIA','SUCROSE']){
  const a=arena('MOND_'+owner);for(const suffix of owner==='SUCROSE'?['E','Q']:['E']){
   const c=a.card('MOND_'+owner+'_'+suffix);assert.equal(a.r.cardSupport(c),'',c.id);assert.equal(a.r.cardReason(a.actor,c),'',c.id);
  }
 }
});
test('geometry initializes ally slots and enemy formation, with Manhattan adjacency',()=>{
 const {r,actor,player,enemies}=arena();assert.deepEqual(plain(player.position),{x:2,y:0});assert.deepEqual(plain(actor.position),{x:2,y:1});
 assert.deepEqual(plain(enemies.map(a=>a.position)),[{x:3,y:0},{x:3,y:1},{x:3,y:2},{x:3,y:3}]);
 assert.equal(r.combatDistance(player,enemies[1]),2);assert.deepEqual(plain(r.nearbyTargets(enemies[1],'ENEMY').map(a=>a.id)),['TARGET_1','TARGET_0','TARGET_2']);
});
test('pull at its center is a no-op and never moves the center target',()=>{
 const {r,actor,enemies}=arena();actor.position={x:3,y:1};enemies[0].position={x:3,y:1};
 assert.equal(r.displaceCombatActor(actor,enemies[0],true),false);assert.deepEqual(plain(enemies[0].position),{x:3,y:1});
});
test('push respects border and large enemies resist forced displacement',()=>{
 const {r,actor,enemies}=arena();actor.position={x:4,y:0};enemies[0].position={x:5,y:0};assert.equal(r.displaceCombatActor(actor,enemies[0]),false);
 enemies[0].source='MON_MITACHURL_ICE';delete enemies[0].size;assert.equal(r.applyCombatControl(actor,enemies[0],'PULL'),false);assert.equal(enemies[0].position.x,5);
});
test('existing MAX4 attacks use selected target then nearest targets, not array order',()=>{
 const {enemies,cast}=arena('MOND_ALBEDO',5);setPositions(enemies,[[3,0],[5,3],[3,1],[4,0],[3,0]]);const before=hp(enemies);cast('MOND_ALBEDO_Q');
 assert.deepEqual(loss(before,enemies),[140,0,140,140,140]);
});
test('Bennett E deals 50 then recoils one region, without damage or stun from movement',()=>{
 const {actor,enemies,cast,b}=arena('MOND_BENNETT');actor.position={x:2,y:0};const before=hp(enemies);cast('MOND_BENNETT_E');
 assert.deepEqual(loss(before,enemies),[50,0,0,0]);assert.deepEqual(plain(actor.position),{x:1,y:0});assert.equal(actor.hp,10000);assert.equal(actor.statuses.length,0);assert.equal(actor.cooldowns.MOND_BENNETT_E,2);assert.equal(b.log.filter(x=>x.movement).length,1);
});
test('Venti E applies 90 damage before the 5% vulnerability and gives one-round levitation',()=>{
 const {r,actor,player,enemies,cast}=arena('MOND_VENTI');const before=enemies[0].hp;cast('MOND_VENTI_E');assert.equal(before-enemies[0].hp,90);
 assert.equal(status(enemies[0],'ANEMO_VULN').rounds,1);assert.equal(status(actor,'LEVITATION').rounds,1);assert.equal(status(player,'LEVITATION').rounds,1);
 const next=enemies[0].hp;r.damage(actor,enemies[0],1,'ANEMO',{sureHit:true,noCrit:true});assert.equal(next-enemies[0].hp,105);
});
test('Dahlia placement waits for contact; enemy contact hits nearby three exactly once',()=>{
 const {r,enemies,cast,b}=arena('MOND_DAHLIA');setPositions(enemies,[[3,1],[3,0],[4,1],[5,3]]);const before=hp(enemies);cast('MOND_DAHLIA_E');assert.deepEqual(loss(before,enemies),[0,0,0,0]);
 r.resolveCombatContact(enemies[0]);assert.deepEqual(loss(before,enemies),[100,100,100,0]);assert.equal(b.fields.filter(f=>f.kind==='MIST_TRACE'&&!f.done).length,0);
 r.resolveCombatContact(enemies[0]);assert.deepEqual(loss(before,enemies),[100,100,100,0]);
});
test('Dahlia ally contact consumes one trace for levitation, and recast leaves one trace',()=>{
 const {r,player,cast,b}=arena('MOND_DAHLIA');cast('MOND_DAHLIA_E',player.id);cast('MOND_DAHLIA_E',player.id);assert.equal(b.fields.filter(f=>f.kind==='MIST_TRACE'&&!f.done).length,1);
 r.resolveCombatContact(player);assert.equal(status(player,'LEVITATION').rounds,1);assert.equal(player.hp,10000);
});
test('Klee E hits three targets and creates exactly three mines',()=>{
 const {enemies,cast,b}=arena('MOND_KLEE');const before=hp(enemies);cast('MOND_KLEE_E');assert.deepEqual(loss(before,enemies),[90,90,90,0]);assert.equal(b.fields.filter(f=>f.kind==='KLEE_MINE').length,3);
});
test('three Klee mines on one target explode once each on contact',()=>{
 const {r,enemies,cast,b}=arena('MOND_KLEE',1);cast('MOND_KLEE_E');const before=enemies[0].hp;r.resolveCombatContact(enemies[0]);assert.equal(before-enemies[0].hp,90);
 r.resolveCombatContact(enemies[0]);assert.equal(before-enemies[0].hp,90);assert.equal(b.fields.filter(f=>f.kind==='KLEE_MINE'&&!f.done).length,0);
});
test('Klee mine lifetime preserves creation round and explodes only at final expiry',()=>{
 const {r,enemies,cast,b}=arena('MOND_KLEE',1);cast('MOND_KLEE_E');const before=enemies[0].hp;r.roundEnd();r.roundEnd();assert.equal(before-enemies[0].hp,0);assert.equal(b.fields.filter(f=>f.kind==='KLEE_MINE').length,3);
 r.roundEnd();assert.equal(before-enemies[0].hp,90);assert.equal(b.fields.filter(f=>f.kind==='KLEE_MINE').length,0);r.roundEnd();assert.equal(before-enemies[0].hp,90);
});
test('Mona phantom has authored house-rule durability and creation plus two END ticks',()=>{
 const {r,actor,enemies,cast,b}=arena('MOND_MONA',1);cast('MOND_MONA_E');const f=b.fields.find(f=>f.kind==='PHANTOM');assert.equal(f.hp,2500);assert.equal(f.def,100);const before=enemies[0].hp;
 r.roundEnd();assert.equal(before-enemies[0].hp,35);r.roundEnd();assert.equal(before-enemies[0].hp,70);r.roundEnd();assert.equal(before-enemies[0].hp,195);assert.equal(b.fields.filter(f=>f.kind==='PHANTOM').length,0);
 r.roundEnd();assert.equal(before-enemies[0].hp,195);assert.equal(actor.cooldowns.MOND_MONA_E,2);
});
test('Mona phantom recast detonates the old object once and retains only the new object',()=>{
 const {enemies,cast,b}=arena('MOND_MONA',1);cast('MOND_MONA_E');const before=enemies[0].hp;cast('MOND_MONA_E');assert.equal(before-enemies[0].hp,90);assert.equal(b.fields.filter(f=>f.kind==='PHANTOM'&&!f.done).length,1);
});
test('Mona phantom intercepts a single-target AI hit and explodes once when destroyed',()=>{
 const {r,actor,player,enemies,cast,b}=arena('MOND_MONA',1);cast('MOND_MONA_E');const field=b.fields.find(f=>f.kind==='PHANTOM');field.hp=1;const before=enemies[0].hp;r.aiTurn(enemies[0],[player,actor]);
 assert.equal(player.hp,10000);assert.equal(actor.hp,10000);assert.equal(before-enemies[0].hp,90);assert.equal(field.done,true);r.detonateCombatObject(field);assert.equal(before-enemies[0].hp,90);
});
test('Rosaria E reacts once across both hits, moves behind, and grants 12 critical points',()=>{
 const {r,actor,enemies,cast,b}=arena('MOND_ROSARIA',1);r.setAura(enemies[0],'PYRO');const before=enemies[0].hp;cast('MOND_ROSARIA_E');assert.equal(before-enemies[0].hp,168);
 assert.equal(b.log.filter(x=>x.reactionName==='융해').length,1);assert.equal(enemies[0].aura,null);assert.deepEqual(plain(actor.position),{x:4,y:0});assert.equal(r.combatStat(actor,'crit'),12);
});
test('Rosaria cannot gain behind bonus by attempting to move behind a large enemy',()=>{
 const {actor,enemies,cast}=arena('MOND_ROSARIA',1);enemies[0].source='MON_MITACHURL_ICE';delete enemies[0].size;const before=plain(actor.position);cast('MOND_ROSARIA_E');assert.deepEqual(plain(actor.position),before);assert.equal(status(actor,'ROSARIA_BEHIND'),undefined);
});
test('Sucrose E grants reaction boost after its triggering swirl, never retroactively',()=>{
 const {r,actor,player,enemies,cast,b}=arena('MOND_SUCROSE',1);r.setAura(enemies[0],'HYDRO');cast('MOND_SUCROSE_E');
 const rx=packets(b,'REACTION');assert.equal(rx.length,1);assert.equal(rx[0].damage,159);assert.equal(status(actor,'REACTION_BOOST').rounds,2);assert.equal(status(player,'REACTION_BOOST').rounds,2);assert.equal(r.reactionBase(actor),304.75);
});
test('Sucrose Q absorbs once and delays its 20% added element until the next pulse',()=>{
 const {r,enemies,cast,b}=arena('MOND_SUCROSE',1);r.setAura(enemies[0],'PYRO');cast('MOND_SUCROSE_Q');r.roundEnd();const field=b.fields.find(f=>f.kind==='WIND_SPIRIT');assert.equal(field.absorbed,'불');
 assert.deepEqual(plain(packets(b,'FIELD').map(x=>x.element)),['바람']);const index=b.log.length;r.roundEnd();assert.deepEqual(plain(packets({log:b.log.slice(index)},'FIELD').map(x=>[x.element,x.damage])),[['바람',55],['불',20]]);
 r.roundEnd();assert.equal(b.fields.filter(f=>f.kind==='WIND_SPIRIT').length,0);
});
test('ordinary aura lasts creation remainder plus two rounds and never retains Anemo or Geo',()=>{
 const {r,enemies}=arena();const t=enemies[0];r.setAura(t,'PYRO');r.roundEnd();assert.equal(t.aura,'불');r.roundEnd();assert.equal(t.aura,'불');r.roundEnd();assert.equal(t.aura,null);
 r.setAura(t,'ANEMO');r.setAura(t,'GEO');assert.equal(t.aura,null);
});
test('a reacting aura is consumed without reattaching the triggering element',()=>{
 const {r,actor,enemies,b}=arena();const t=enemies[0];r.setAura(t,'CRYO');const before=t.hp;r.damage(actor,t,1,'PYRO',{sureHit:true,noCrit:true});assert.equal(before-t.hp,200);assert.equal(t.aura,null);assert.equal(b.log.filter(x=>x.reactionName==='융해').length,1);
});
test('Amber multi-hit burst attaches and reacts once per target per cast',()=>{
 const {r,enemies,cast,b}=arena('MOND_AMBER',1);r.setAura(enemies[0],'CRYO');cast('MOND_AMBER_Q');assert.equal(b.log.filter(x=>x.reactionName==='융해').length,1);assert.equal(enemies[0].aura,null);
});
test('swirl propagation can trigger one downstream overload without recursive propagation',()=>{
 const {r,actor,enemies,b}=arena('MOND_KAEYA',3);setPositions(enemies,[[3,0],[3,1],[4,1]]);r.setAura(enemies[0],'PYRO');r.setAura(enemies[1],'ELECTRO');r.setAura(enemies[2],'HYDRO');
 r.applyCombatAura(actor,enemies[0],'ANEMO');assert.equal(b.log.filter(x=>x.reactionName==='확산').length,1);assert.equal(b.log.filter(x=>x.reactionName==='과부하').length,1);assert.equal(b.log.filter(x=>x.reactionName).length,2);assert.equal(enemies[2].aura,'물');assert.equal(r._reactionChain,null);
});
test('electrocharged coexistence and propagation use a snapshot, without same-END reticking',()=>{
 const {r,actor,enemies,b}=arena('MOND_KAEYA',2);setPositions(enemies,[[3,0],[3,1]]);r.setAura(enemies[0],'HYDRO');r.setAura(enemies[1],'HYDRO');r.applyCombatAura(actor,enemies[0],'ELECTRO');
 assert.deepEqual(plain(r.auraList(enemies[0]).map(x=>x.element).sort()),['물','번개']);const before=hp(enemies);r.roundEnd();assert.deepEqual(loss(before,enemies),[318,0]);assert(status(enemies[1],'STATUS_ELECTROCHARGED'));r.roundEnd();assert.deepEqual(loss(before,enemies),[636,318]);assert.equal(packets(b,'REACTION_DOT').length,3);
});
test('Dendro core creation and hyperbloom consume exactly one core for 3x base damage',()=>{
 const {r,actor,enemies,b}=arena('MOND_KAEYA',1);r.setAura(enemies[0],'DENDRO');r.applyCombatAura(actor,enemies[0],'HYDRO');assert.equal(b.fields.filter(f=>f.kind==='DENDRO_CORE'&&!f.done).length,1);assert.equal(enemies[0].aura,null);
 const before=enemies[0].hp;r.applyCombatAura(actor,enemies[0],'ELECTRO');assert.equal(before-enemies[0].hp,795);assert.equal(b.fields.filter(f=>f.kind==='DENDRO_CORE'&&!f.done).length,0);r.roundEnd();assert.equal(before-enemies[0].hp,795);
});
test('Mona bubble handles an independent positive reaction packet, then burst and omen',()=>{
 const {r,actor,enemies,cast,b}=arena('MOND_MONA',1);cast('MOND_MONA_Q');const t=enemies[0],before=t.hp;r.applyDamage(actor,t,100,{element:'PHYSICAL',sourceKind:'REACTION'});
 assert.equal(before-t.hp,220);assert.equal(status(t,'ILLUSORY_BUBBLE'),undefined);assert.equal(status(t,'OMEN').rounds,2);assert.equal(packets(b,'BUBBLE').length,1);
 r.applyDamage(actor,t,100,{element:'PHYSICAL',sourceKind:'REACTION'});assert.equal(before-t.hp,335);assert.equal(packets(b,'BUBBLE').length,1);
});
test('Mona bubble does not pop on zero damage but does pop on positive shield damage',()=>{
 const {r,actor,enemies,cast,b}=arena('MOND_MONA',1);cast('MOND_MONA_Q');const t=enemies[0];r.applyDamage(actor,t,0,{element:'물리'});assert(status(t,'ILLUSORY_BUBBLE'));r.shield(t,1000,'TEST',2);r.applyDamage(actor,t,100,{element:'물리',sourceKind:'REACTION'});
 assert.equal(t.hp,100000);assert.equal(t.shields[0].value,780);assert.equal(status(t,'ILLUSORY_BUBBLE'),undefined);assert.equal(packets(b,'BUBBLE').length,1);
});
test('SKILL_COEFF excludes basic attacks and buffs an explicitly identified skill',()=>{
 const {r,actor,enemies}=arena('MOND_KAEYA',1);const t=enemies[0];r.addCombatStatus(actor,'SKILL_COEFF',1);let before=t.hp;r.basicHit(actor,t);assert.equal(before-t.hp,65);before=t.hp;r.damage(actor,t,1,'PHYSICAL',{card:'PLAYER_BASIC_ATTACK',sureHit:true,noCrit:true});assert.equal(before-t.hp,100);before=t.hp;r.damage(actor,t,1,'CRYO',{card:'MOND_KAEYA_E',sureHit:true,noCrit:true});assert.equal(before-t.hp,130);
});
test('rule geometry, active fields and coexistence survive a full save reload',()=>{
 const {r,actor,enemies,cast}=arena('MOND_SUCROSE',1);cast('MOND_SUCROSE_Q');r.setAura(enemies[0],'HYDRO');r.applyCombatAura(actor,enemies[0],'ELECTRO');const state=JSON.parse(r.serialize()),restored=new R(db,state);
 assert.deepEqual(plain(restored.s.runtime.fields),plain(r.s.runtime.fields));assert.deepEqual(plain(restored.s.runtime.actors.map(x=>[x.position,x.auras,x.statuses])),plain(r.s.runtime.actors.map(x=>[x.position,x.auras,x.statuses])));
});

const failed=results.filter(x=>!x.ok);console.log(JSON.stringify({suite:'HOUSE_RULE_V1 independent regressions',engineScripts:scripts,passed:results.length-failed.length,failed:failed.length,failures:failed},null,2));process.exitCode=failed.length?1:0;
