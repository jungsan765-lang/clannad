'use strict';
// Actual presentation/runtime methods and the established virtual DOM/clock harness.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),vm=require('node:vm'),assert=require('node:assert/strict');
const reference=path.join(__dirname,'test_playback_v08.cjs'),source=fs.readFileSync(reference,'utf8'),boundary=source.indexOf('(async()=>{');
const helper=new Module(reference,module);helper.filename=reference;helper.paths=Module._nodeModulePaths(__dirname);
helper._compile(source.slice(0,boundary).replace('return {fx:ctx.playback,','return {api:ctx.window.ActorPlayback,fx:ctx.playback,')+'\nmodule.exports={harness,event,root};',reference);
const {harness,event,root}=helper.exports;
const clone=x=>JSON.parse(JSON.stringify(x));
const actor=(id='PLAYER_CUSTOM')=>({id,source:id,name:id,side:id==='ENEMY'?'ENEMY':'ALLY',level:1,hp:100,maxHp:100,statuses:[],shields:[],aura:null});
const checks=[];
async function check(name,run){await run();checks.push(name);console.log('PASS '+name);}
function stateFrame(key,before,after){return {key,kind:'state',label:'효과 변화',round:1,element:'guard',presentationActorsBefore:[before],presentationActorsAfter:[after]};}
function shield(h){return h.root.querySelector('[data-actor-id]').querySelector('.shield-meter');}
function stateCard(h){const node=h.root.querySelector('[data-actor-id]'),copy=new node.constructor('div','combatant-copy');for(const child of [...node.children])copy.append(child);node.replaceChildren(copy);return node;}
(async()=>{
 await check('first shield creation creates its meter at the current frame, with no future state leaked',async()=>{
  const h=harness(),before=actor(),after={...clone(before),shields:[{source:'TEST_SHIELD',value:50,initialValue:50,rounds:2}]};stateCard(h);
  const job=h.fx.play([event('first'),stateFrame('shield',before,after)],{actors:[before]});
  assert.equal(shield(h),null);assert.deepEqual(clone(h.api.currentActor(before.id).shields),[]);await h.tick(1399);assert.equal(shield(h),null);
  await h.tick(1);assert.equal(shield(h).querySelector('.stat').textContent,'보호막  50 / 50');assert.equal(h.api.currentActor(before.id).shields[0].value,50);
  h.fx.cancel();await job;
 });
 await check('shield creation, hit loss and silent expiry update the visible snapshot and remove the meter',async()=>{
  const h=harness(),before=actor(),raised={...clone(before),shields:[{source:'S',value:50,initialValue:50,rounds:1}]},lost={...clone(raised),shields:[{source:'S',value:30,initialValue:50,rounds:1}]},expired={...clone(before)};stateCard(h);
  const job=h.fx.play([stateFrame('up',before,raised),stateFrame('hit',raised,lost),stateFrame('expiry',lost,expired)],{actors:[before]});
  assert.equal(shield(h).querySelector('.stat').textContent,'보호막  50 / 50');await h.tick(1400);assert.equal(shield(h).querySelector('.stat').textContent,'보호막  30 / 50');await h.tick(1400);assert.equal(shield(h),null);assert.deepEqual(clone(h.api.currentActor(before.id).shields),[]);h.fx.cancel();await job;
 });
 await check('read-only inspections return defensive copies and live notifications while the fight keeps playing',async()=>{
  const h=harness(),before=actor(),buffed={...clone(before),statuses:[{id:'STATUS_DEF_DOWN',rounds:2,value:15}],aura:'번개'};let notifications=0;const unsubscribe=h.api.subscribe(()=>notifications++);
  const job=h.fx.play([stateFrame('initial',before,before),stateFrame('buff',before,buffed),stateFrame('gone',buffed,before)],{actors:[before]});
  const copy=h.api.currentActor(before.id);copy.statuses.push({id:'FAKE'});assert.equal(h.api.currentActor(before.id).statuses.length,0);assert.equal(h.fx.paused,false);await h.tick(1400);
  assert.equal(h.api.currentActor(before.id).statuses[0].rounds,2);assert.equal(h.api.currentActor(before.id).aura,'번개');assert.equal(h.fx.paused,false);await h.tick(1400);assert.equal(h.api.currentActor(before.id).statuses.length,0);assert(notifications>=3);unsubscribe();h.fx.cancel();await job;assert.equal(h.api.currentActor(before.id),null);assert.equal(h.stats().forbidden,0);
 });
 await check('hidden and pagehide preserve pending frames, and returning never jumps to the result',async()=>{
  for(const via of ['hidden','pagehide']){const h=harness(),before=actor(),buffed={...clone(before),statuses:[{id:'STATUS_DEF_DOWN',rounds:2}]};const job=h.fx.play([stateFrame('before-'+via,before,before),stateFrame('after-'+via,before,buffed)],{actors:[before]});await h.tick(100);await h[via]();await h.tick(100000);
   assert.equal(h.api.currentActor(before.id).statuses.length,0);assert(h.fx.active);h.visible();await h.tick(1399);assert.equal(h.api.currentActor(before.id).statuses.length,0);await h.tick(1);assert.equal(h.api.currentActor(before.id).statuses.length,1);h.fx.cancel();await job;}
 });
 await check('manual pause survives backgrounding and shield/status snapshots do not advance until resume',async()=>{
  const h=harness(),before=actor(),raised={...clone(before),shields:[{value:70,initialValue:70}]};const job=h.fx.play([stateFrame('p1',before,before),stateFrame('p2',before,raised)],{actors:[before]});await h.click('일시정지');await h.hidden();await h.tick(10000);h.visible();await h.tick(10000);assert(h.fx.paused);assert.equal(shield(h),null);await h.click('계속 재생');await h.tick(1400);assert.equal(shield(h).querySelector('.stat').textContent,'보호막  70 / 70');h.fx.cancel();await job;
 });
 await check('a shield gained after a burst stays hidden until the final impact and follows its paused clock',async()=>{
  const p=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'source/presentation.js'),'utf8'),p);
  const h=harness(),caster=actor('ENEMY'),after={...clone(caster),shields:[{value:80,initialValue:80}]},hits=Array.from({length:5},(_,i)=>({...event('burst-'+i,i),action:1,cardId:'BURST'})),tail={key:'tail',kind:'state',silent:true,actorId:'ENEMY',round:1,action:1,cardId:'BURST',presentationActorsBefore:[caster],presentationActorsAfter:[after]},frames=p.CRPGPresentation.actionFrames([...hits,tail]);
  assert.equal(frames.length,1);const job=h.fx.play(frames,{actors:[actor(),caster]});await h.tick(470);assert.equal(h.api.currentActor('ENEMY').shields.length,0);await h.click('일시정지');await h.tick(5000);assert.equal(h.api.currentActor('ENEMY').shields.length,0);await h.click('계속 재생');await h.tick(117);assert.equal(h.api.currentActor('ENEMY').shields.length,0);await h.tick(1);assert.equal(h.api.currentActor('ENEMY').shields[0].value,80);h.fx.cancel();await job;
 });
 await check('an action completed while backgrounded starts its first visible frame only after returning',async()=>{
  const h=harness();h.document.hidden=true;const job=h.fx.play([event('background-first'),event('background-next',1)],{actors:[actor()]});await h.tick(100000);assert.equal(h.shown.length,0);assert(h.fx.active);h.visible();await h.tick(1);assert.equal(h.shown.length,1);assert.equal(h.api.currentActor('PLAYER_CUSTOM').hp,90);h.fx.cancel();await job;
 });
 await check('silent expiry metadata updates the view without adding a new message or delaying the next action',async()=>{
  const h=harness(),before={...actor(),statuses:[{id:'STATUS_DEF_DOWN',rounds:1}]},after=actor(),expiry={...stateFrame('silent-expiry',before,after),silent:true};
  const job=h.fx.play([event('silent-first'),expiry,event('silent-next',1)],{actors:[before]});await h.tick(1399);assert.equal(h.api.currentActor('PLAYER_CUSTOM').statuses.length,1);await h.tick(1);assert.equal(h.api.currentActor('PLAYER_CUSTOM').statuses.length,0);assert.deepEqual(h.shown.map(s=>s.time),[0,1400]);h.fx.cancel();await job;
 });
 await check('a status-only effect on an enemy never presents that recipient as the current turn',async()=>{
  const h=harness(),node=h.root.querySelector('[data-actor-id]'),order=new node.constructor('ol','battle-order'),player=new node.constructor('li','current'),enemy=new node.constructor('li');player.dataset.actorId='PLAYER_CUSTOM';enemy.dataset.actorId='ENEMY';order.append(player,enemy);h.root.append(order);
  const p=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'source/presentation.js'),'utf8'),p);
  const status={key:'only-status',kind:'status',actorId:'ENEMY',targetId:'ENEMY',actor:'적',target:'적',round:1,action:1,sourceKind:'STATUS_APPLY',statusApplied:{id:'STATUS_DEF_DOWN',rounds:2}};
  h.fx.showAction(p.CRPGPresentation.actionFrames([status])[0]);assert(player.classList.contains('current'));assert(!enemy.classList.contains('current'));
  h.fx.showAction(p.CRPGPresentation.actionFrames([{...event('actual-turn'),round:1,action:2}])[0]);assert(!player.classList.contains('current'));assert(enemy.classList.contains('current'));
 });
 const {c,R,fresh}=require('./helpers_v011.cjs');vm.runInContext(fs.readFileSync(path.join(root,'source/presentation.js'),'utf8'),c,{filename:'presentation.js'});const PR=c.CRPGPresentation;
 const fixture=sourceId=>{const r=fresh(),a=r.initCombatActor(r.character(sourceId),1),t={...actor('ENEMY'),source:'MON_HILI_FIGHTER',name:'표적',atk:1,def:0,spd:1,hit:100,eva:0,resist:0,range:'근접',grade:'일반',control:'AI',turns:0,cooldowns:{},tags:[],hp:100000,maxHp:100000};Object.assign(a,{hp:1000,maxHp:1000,atk:100,def:100,crit:0,hit:100,eva:0,turns:1,range:'근접'});r.s.runtime={id:'LIVE-'+sourceId,group:'EG_MOND_HILI_PATROL',origin:'TEST',round:1,actors:[a,t],order:[{id:a.id}],cursor:0,phase:'WAIT_PLAYER',actionSequence:1,fields:[],log:[],terrain:null};r.die=()=>50;r.random=()=>.5;return {r,a,t};};
 await check('final boss initialization is captured before return; every opening preview preserves saved bytes',async()=>{
  const r=fresh('MAP_WOLF_ARENA');r.action('PLACE_ENTER',{place:'BOSS:BRT_ANDRIUS'});r.action('BOSS_ROUTE',{route:'BRT_ANDRIUS',entry:'DIRECT'});assert.equal(r.s.runtime.opening.state,'PENDING');
  const boss=r.s.runtime.actors.find(a=>a.side==='ENEMY'),shown=new Map();for(const event of r.s.runtime.log){for(const actor of event.presentationActorsBefore||[])if(!shown.has(actor.id))shown.set(actor.id,clone(actor));for(const actor of event.presentationActorsAfter||[])shown.set(actor.id,{...(shown.get(actor.id)||{}),...clone(actor)});}
  assert.equal(shown.get(boss.id).hp,boss.hp);assert.equal(shown.get(boss.id).atk,boss.atk);assert.equal(shown.get(boss.id).def,boss.def);assert.equal(shown.get(boss.id).spd,boss.spd);
  for(const runtime of [r,new R(r.db,JSON.parse(r.serialize()))]){const saved=runtime.serialize();for(let i=0;i<4;i++)for(const method of ['combatOpening','combatOrderView','view','autoUntilPlayer','newRound','resolveEnemyPhases']){runtime[method]();assert.equal(runtime.serialize(),saved,method+' must not update metadata or any saved field');}}
 });
 await check('native shield skill and round-end expiry serialize display metadata without adding combat log rows',async()=>{
  const {r,a,t}=fixture('MOND_NOELLE'),before=PR.snapshot(r.s);r.executeCard(a,r.cardDefinition(r.row('08_SKILL_CARD_DB','MOND_NOELLE_E')),t.id);const count=r.s.runtime.log.length,events=PR.delta(before,r.s),snapshot=events.flatMap(e=>e.presentationActorsAfter||[]).find(a=>a.id==='MOND_NOELLE'&&a.shields.length);
  assert(snapshot);assert.equal(snapshot.shields[0].value,a.shields[0].value);assert.equal(r.s.runtime.log.filter(e=>e.presentationOnly).length,0);assert.equal(PR.actionFrames(events).filter(f=>f.kind==='action').length,1);assert.equal(r.s.runtime.log.length,count);
  for(const shield of a.shields){shield.createdRound=0;shield.rounds=1;}r.roundEnd();assert.equal(a.shields.length,0);const last=r.s.runtime.log.at(-1);assert(last.presentationActorsAfter.some(x=>x.id===a.id&&!x.shields.length));const copied=JSON.parse(JSON.stringify(r.s.runtime));assert(Array.isArray(copied.log));assert.equal(Object.hasOwn(copied.log,'push'),false);
 });
 await check('native status application keeps the actual caster, recipient and source card distinct',async()=>{
  const {r,a,t}=fixture('MOND_LISA'),before=PR.snapshot(r.s);r.executeCard(a,r.cardDefinition(r.row('08_SKILL_CARD_DB','MOND_LISA_Q')),t.id);const statuses=PR.delta(before,r.s).filter(e=>e.statusApplied);
  assert(statuses.length);for(const status of statuses){assert.equal(status.actorId,a.id);assert.equal(status.actorSide,'ALLY');assert.equal(status.targetId,t.id);assert.equal(status.cardId,'MOND_LISA_Q');assert.equal(status.sourceKind,'STATUS_APPLY');assert(status.presentationActorsAfter.some(x=>x.id===t.id&&x.statuses.some(s=>s.id===status.statusApplied.id)));}
  const fx=r.coopFx(r.s.runtime.log);assert(fx.entries.some(e=>e.presentationActorsAfter?.length));
 });
 console.log(JSON.stringify({ok:true,checks}));
})().catch(e=>{console.error(e);process.exitCode=1;});
