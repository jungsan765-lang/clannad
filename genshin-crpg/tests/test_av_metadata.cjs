'use strict';
// Read-only product regression: load its actual browser runtime order in isolated VMs.
// Compare all game state; only additional presentation fields on known combat log
// entries may differ. Existing log fields remain authoritative and are compared.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const base=path.resolve(process.env.CRPG_GAME||process.cwd());
const source=process.env.CRPG_SOURCE||path.join(base,'source');
const dbPath=process.env.CRPG_DB||path.join(base,'content/db.json');
const reportPath=process.env.CRPG_REPORT||path.join(base,'reports/av-metadata-regression.json');
const html=fs.readFileSync(path.join(source,'index.html'),'utf8');
const modules=[...html.matchAll(/<script\s+src="([^"?]+)(?:\?[^\"]*)?"/g)].map(m=>m[1]).filter(n=>/^runtime(?:_[a-z_]+)?\.js$/.test(n)||n==='save_adapter.js');
const code=modules.map(n=>[n,fs.readFileSync(path.join(source,n),'utf8')]);
const presentation=fs.readFileSync(path.join(source,'presentation.js'),'utf8');
const dbBytes=fs.readFileSync(dbPath),db=JSON.parse(dbBytes),copy=x=>JSON.parse(JSON.stringify(x));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const metadataKeys=['actorId','targetId','hpBefore','hpAfter','maxHp','round','actionSequence','cardName','presentationCardId','presentationSourceKind'];
function context(withAV){
  const c=vm.createContext({console});for(const[n,t]of code)vm.runInContext(t,c,{filename:n});
  c.CRPGRelationships.install(c.CRPGRuntime,{events:c.CRPGRelationships.catalogFromDB(db),activities:c.CRPGRelationships.activitiesFromDB(db),preferences:{adultModeEnabled:false},eligibility:{profiles:{},protagonists:{}}});
  if(withAV)vm.runInContext(presentation,c,{filename:'presentation.js'});return c;
}
const baseline=context(false),enhanced=context(true),results=[];
function stripAddedLogMetadata(reference,actual){
  if(!Array.isArray(reference)||!Array.isArray(actual))return actual;
  return actual.map((entry,i)=>{
    const out=copy(entry),prior=reference[i];
    if(prior&&typeof prior==='object')for(const key of metadataKeys)if(!Object.hasOwn(prior,key))delete out[key];
    return out;
  });
}
function comparableReceipt(reference,actual){
  const out=copy(actual);
  if(['COMBAT','COMBAT_BEGIN'].includes(reference?.type)&&Array.isArray(reference.result?.events)&&Array.isArray(out.result?.events))out.result.events=stripAddedLogMetadata(reference.result.events,out.result.events);
  return out;
}
function comparableState(reference,actual){
  const out=copy(actual);
  if(reference.runtime&&out.runtime)out.runtime.log=stripAddedLogMetadata(reference.runtime.log,out.runtime.log);
  if(Array.isArray(reference.lastCombatLog)&&Array.isArray(out.lastCombatLog))out.lastCombatLog=stripAddedLogMetadata(reference.lastCombatLog,out.lastCombatLog);
  const key='LAST_ACTION_RECEIPT_JSON';
  if(typeof reference.global?.[key]==='string'&&typeof out.global?.[key]==='string') {
    out.global[key]=JSON.stringify(comparableReceipt(JSON.parse(reference.global[key]),JSON.parse(out.global[key])));
  }
  return out;
}
function assertStateEqual(a,b){assert.deepEqual(comparableState(a,a),comparableState(a,b));}
function assertReceiptEqual(a,b){assert.deepEqual(copy(a),comparableReceipt(a,b));}
function same(a,b){
  assert.equal(a.s.global.PRNG_STATE,b.s.global.PRNG_STATE,'PRNG state changed');
  assert.equal(a.rngCalls(),b.rngCalls(),'number of RNG calls changed');
  assertStateEqual(a.s,b.s);
}
function test(name,fn){try{results.push({name,ok:true,evidence:fn()||null});}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);}}
function newRuntime(c,id){
  const r=new c.CRPGRuntime.Runtime(db);r.newGame({name:'메타데이터 검증',route:'ROUTE_TRAVELER',seed:21574,saveId:id});
  Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'HUB',STORY_CURSOR_NODE_ID:'HUB',SCREEN_MODE:'LOCATION',STORY_MENU_POLICY:'FULL',PENDING_CHOICE_GROUP_ID:'',CURRENT_MAP_ID:'MAP_WOLF_ARENA',PLAYER_BASE_HP:100000});
  r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;
  let calls=0;const random=r.random;r.random=function(){calls++;return random.call(this);};r.rngCalls=()=>calls;return r;
}
function fresh(c,id,entry='GAUNTLET'){
  const r=newRuntime(c,id);r.action('PLACE_ENTER',{place:'BOSS:BRT_ANDRIUS'});r.action('BOSS_ROUTE',{route:'BRT_ANDRIUS',entry});
  if(r.combatOpening?.())r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});return r;
}
function duplicates(c,id){
  const r=newRuntime(c,id);r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';
  // Fixed actual authored encounter; TEST origin avoids the random small-party reducer.
  r.startBattle('EG_MOND_HILI_PATROL','TEST_METADATA');
  if(r.combatOpening?.())r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});
  const b=r.s.runtime,foes=b.actors.filter(a=>a.source==='MON_HILI_FIGHTER');
  assert.ok(foes.length>=2,'authored encounter must contain duplicate enemy names');
  for(const t of foes)Object.assign(t,{hp:10000,maxHp:10000,statuses:[],shields:[],aura:null,auras:[]});
  b.log=[];return {r,b,p:b.actors.find(a=>a.control==='PLAYER'),foes};
}
function hpChain(logs,target,initial,final){
  let hp=initial;
  for(const e of logs.filter(e=>e.targetId===target&&Object.hasOwn(e,'damage'))){
    assert.equal(e.hpBefore,hp,'packet must start at prior packet HP');
    assert.equal(e.hpAfter,Math.max(0,hp-e.damage),'packet HP after must account for its own damage');
    assert.ok(e.hpAfter>=0&&e.hpAfter<=e.maxHp);hp=e.hpAfter;
  }
  assert.equal(hp,final,'last packet HP must equal authoritative target HP');
}
test('comparison excludes only newly added fields in exact combat-log locations',()=>{
  const state={global:{LAST_ACTION_RECEIPT_JSON:JSON.stringify({type:'COMBAT',result:{round:2,events:[{actor:'A',damage:7}]}})},runtime:{round:2,maxHp:888,actionSequence:4,actors:[{id:'A',hp:80,maxHp:100}],log:[{damage:7},{terrain:2,round:2},{actor:'A',cardName:'원본 기술'}]},lastCombatLog:[{damage:3}],log:[{round:2,maxHp:100}]};
  const decorated=copy(state);Object.assign(decorated.runtime.log[0],{actorId:'A',targetId:'B',hpBefore:87,hpAfter:80,maxHp:100,round:2,actionSequence:4,cardName:'추가 표시'});Object.assign(decorated.lastCombatLog[0],{hpBefore:3,hpAfter:0});
  const receipt=JSON.parse(decorated.global.LAST_ACTION_RECEIPT_JSON);receipt.result.events[0].hpAfter=80;decorated.global.LAST_ACTION_RECEIPT_JSON=JSON.stringify(receipt);assertStateEqual(state,decorated);
  const mutations=[s=>s.runtime.round++,s=>s.runtime.actors[0].maxHp++,s=>s.runtime.actionSequence++,s=>s.runtime.log[0].damage++,s=>s.runtime.log[1].round++,s=>s.runtime.log[2].cardName='틀린 기술',s=>s.log[0].maxHp++,s=>s.runtime.log[0].unrelated='new',s=>{const x=JSON.parse(s.global.LAST_ACTION_RECEIPT_JSON);x.result.round++;s.global.LAST_ACTION_RECEIPT_JSON=JSON.stringify(x);}];
  for(const mutate of mutations){const bad=copy(decorated);mutate(bad);assert.throws(()=>assertStateEqual(state,bad));}
  return {negativeControls:mutations.length,ignoredMetadata:metadataKeys};
});
test('five public combat actions preserve full state, receipts and RNG',()=>{
  const a=fresh(baseline,'AV-PUBLIC'),b=fresh(enhanced,'AV-PUBLIC');same(a,b);
  for(let i=0;i<5;i++){const card=i%2?'PLAYER_BASIC_GUARD':'PLAYER_BASIC_ATTACK',entry=a.combatCards().find(c=>c.id===card),params={card,target:entry.targets[0]?.id};assertReceiptEqual(a.action('COMBAT',params),b.action('COMBAT',params));same(a,b);}
  return {rngCalls:a.rngCalls(),prngState:a.s.global.PRNG_STATE,round:a.s.runtime.round};
});
test('Andrius threshold interrupts and phase-three multi-actions preserve full state and RNG',()=>{
  const a=fresh(baseline,'AV-BOSS','DIRECT'),b=fresh(enhanced,'AV-BOSS','DIRECT');
  for(const r of[a,b]){const boss=r.s.runtime.actors.find(x=>x.source==='BOSS_ANDRIUS');boss.hp=Math.round(boss.maxHp*.45);r.resolveEnemyPhases();}
  same(a,b);for(let i=0;i<3;i++){assertReceiptEqual(a.action('COMBAT',{card:'PLAYER_BASIC_GUARD'}),b.action('COMBAT',{card:'PLAYER_BASIC_GUARD'}));same(a,b);}
  return {rngCalls:a.rngCalls(),prngState:a.s.global.PRNG_STATE,phase:b.s.runtime.actors.find(x=>x.source==='BOSS_ANDRIUS').andrius.phase};
});
test('settlement preserves rewards, inventory, lastCombatLog and RNG',()=>{
  const a=fresh(baseline,'AV-SETTLE'),b=fresh(enhanced,'AV-SETTLE');
  a.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});b.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});
  a.finishBattle(true);b.finishBattle(true);same(a,b);
  assert.equal(a.s.runtime,null);assert.ok(a.s.lastCombatLog.length);
  return {result:JSON.parse(a.s.global.LAST_BATTLE_RESULT_JSON),rngCalls:a.rngCalls()};
});
test('nested Mona bubble uses primary then nested HP boundaries and correct packet attackers',()=>{
  const a=duplicates(baseline,'AV-BUBBLE'),b=duplicates(enhanced,'AV-BUBBLE');
  for(const f of[a,b]){const mona=copy(f.p);Object.assign(mona,{id:'MOND_MONA',source:'MOND_MONA',name:'모나',side:'ALLY',control:'AI'});f.b.actors.push(mona);f.r.addCombatStatus(f.foes[1],'ILLUSORY_BUBBLE',1,{actor:mona.id});f.r.applyDamage(f.p,f.foes[1],100,{element:'물리',sourceKind:'REACTION'});}
  same(a.r,b.r);const logs=b.b.log.filter(e=>Object.hasOwn(e,'damage')),primary=logs[0],nested=logs.find(e=>e.sourceKind==='BUBBLE');
  assert.ok(nested,'fixture must actually emit nested bubble damage');
  assert.equal(primary.actorId,b.p.id);assert.equal(nested.actorId,'MOND_MONA');
  assert.equal(primary.targetId,b.foes[1].id);assert.equal(nested.targetId,b.foes[1].id);
  assert.notEqual(primary.hpAfter,b.foes[1].hp,'primary packet must not show HP after nested packet');
  hpChain(logs,b.foes[1].id,10000,b.foes[1].hp);
  assert.equal(b.foes[0].hp,10000,'same-name sibling was not the target');
  return {packets:logs,rngCalls:b.r.rngCalls()};
});
test('duplicate authored monster IDs and lethal/clamped HP boundaries are exact',()=>{
  const a=duplicates(baseline,'AV-DUPLICATE'),b=duplicates(enhanced,'AV-DUPLICATE');
  for(const f of[a,b]){f.r.applyDamage(f.p,f.foes[1],40,{element:'물리'});f.r.applyDamage(f.p,f.foes[0],10050,{element:'물리'});f.r.heal(f.foes[1],20,f.p.name);}
  same(a.r,b.r);const logs=b.b.log,damage=logs.filter(e=>Object.hasOwn(e,'damage')),heal=logs.find(e=>Object.hasOwn(e,'heal'));
  assert.equal(damage[0].targetId,b.foes[1].id);assert.equal(damage[0].hpBefore,10000);assert.equal(damage[0].hpAfter,9960);
  assert.equal(damage[1].targetId,b.foes[0].id);assert.equal(damage[1].hpBefore,10000);assert.equal(damage[1].hpAfter,0);
  assert.equal(heal.targetId,b.foes[1].id);assert.equal(heal.hpBefore,9960);assert.equal(heal.hpAfter,9980);
  const before=enhanced.CRPGPresentation.snapshot({...b.r.s,runtime:{...b.b,log:[]}}),events=enhanced.CRPGPresentation.delta(before,b.r.s);
  assert.equal(events[0].target,b.foes[1].name+' 2');assert.equal(events[1].target,b.foes[0].name+' 1');
  return {ids:b.foes.map(t=>t.id),events:copy(events)};
});
test('full shield absorption preserves HP and logs exact absorbed packet',()=>{
  const a=duplicates(baseline,'AV-SHIELD'),b=duplicates(enhanced,'AV-SHIELD');
  for(const f of[a,b]){f.r.shield(f.foes[1],1000,'TEST_METADATA',2);f.r.applyDamage(f.p,f.foes[1],75,{element:'물리'});}
  same(a.r,b.r);const packet=b.b.log.find(e=>Object.hasOwn(e,'damage'));assert.equal(packet.absorbed,75);assert.equal(packet.damage,0);assert.equal(packet.hpBefore,10000);assert.equal(packet.hpAfter,10000);assert.equal(packet.targetId,b.foes[1].id);return packet;
});
test('duplicate-name miss is attached to actual target without RNG changes',()=>{
  const a=duplicates(baseline,'AV-MISS'),b=duplicates(enhanced,'AV-MISS');
  for(const f of[a,b]){f.foes[1].statuses.push({id:'LEVITATION',rounds:2});f.r.damage(f.p,f.foes[1],1,'물리',{range:'근접'});}
  same(a.r,b.r);const miss=b.b.log.find(e=>e.miss);assert.ok(miss);assert.equal(miss.targetId,b.foes[1].id);assert.equal(miss.actorId,b.p.id);return miss;
});
test('duplicate transaction and presentation planner consume no RNG or state changes',()=>{
  const r=fresh(enhanced,'AV-DEDUPE'),before=enhanced.CRPGPresentation.snapshot(r.s),g=r.s.global,request={id:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1),revision:g.SAVE_REVISION,type:'COMBAT',card:'PLAYER_BASIC_GUARD'};
  r.transact(request);const rng=r.rngCalls(),state=r.serialize(),events=enhanced.CRPGPresentation.delta(before,r.s);assert.equal(r.rngCalls(),rng);assert.equal(r.serialize(),state);
  const again=enhanced.CRPGPresentation.snapshot(r.s);r.transact(request);assert.equal(enhanced.CRPGPresentation.delta(again,r.s).length,0);assert.equal(r.rngCalls(),rng);assert.equal(r.serialize(),state);return {events:events.length,rngCalls:rng};
});
test('recursive swirl reactions retain actual duplicate target IDs',()=>{
  const a=duplicates(baseline,'AV-SWIRL'),b=duplicates(enhanced,'AV-SWIRL');
  for(const f of[a,b]){f.r.initCombatPositions();f.foes[0].position={x:3,y:1};f.foes[1].position={x:3,y:2};f.r.setAura(f.foes[0],'불');f.r.setAura(f.foes[1],'번개');f.r.damage(f.p,f.foes[0],.1,'바람',{sureHit:true,noCrit:true,range:'전장'});}
  same(a.r,b.r);const reactions=b.b.log.filter(e=>e.reaction&&!Object.hasOwn(e,'damage')),swirl=reactions.find(e=>e.reaction==='RX_SWIRL'),overload=reactions.find(e=>e.reaction==='RX_OVERLOADED');
  assert.ok(swirl&&overload,'fixture must generate a recursive second-target reaction');assert.equal(swirl.targetId,b.foes[0].id);assert.equal(overload.targetId,b.foes[1].id);
  return {ids:b.foes.map(t=>t.id),reactions};
});
test('nested bubble damage card name describes its own card',()=>{
  const a=duplicates(baseline,'AV-BUBBLE-CARD'),b=duplicates(enhanced,'AV-BUBBLE-CARD');
  for(const f of[a,b]){const mona=copy(f.p);Object.assign(mona,{id:'MOND_MONA',source:'MOND_MONA',name:'모나',side:'ALLY',control:'AI'});f.b.actors.push(mona);f.r.addCombatStatus(f.foes[1],'ILLUSORY_BUBBLE',1,{actor:mona.id});const card=f.r.cardDefinition(f.r.row('08_SKILL_CARD_DB','PLAYER_BASIC_ATTACK'));f.r.executeCard(f.p,card,f.foes[1].id);}
  same(a.r,b.r);const nested=b.b.log.find(e=>e.sourceKind==='BUBBLE');assert.ok(nested);assert.equal(nested.card,'MOND_MONA_Q');const own=b.r.cardDefinition(b.r.row('08_SKILL_CARD_DB',nested.card));assert.equal(nested.cardName,own.name);return nested;
});
const out={readOnlyProduct:true,source,dbPath,dbSHA256:hash(dbBytes),presentationSHA256:hash(presentation),runtimeSHA256:Object.fromEntries(code.map(([n,t])=>[n,hash(t)])),modules,total:results.length,passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,results};
fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({total:out.total,passed:out.passed,failed:out.failed,report:reportPath}));process.exitCode=out.failed?1:0;
