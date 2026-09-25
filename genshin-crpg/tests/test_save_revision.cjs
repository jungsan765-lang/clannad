'use strict';
// Independent regression runner; product files and real user saves are never changed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),http=require('node:http');
const root=path.resolve(__dirname,'..'),src=path.join(root,'source');
const db=JSON.parse(fs.readFileSync(path.join(root,'content/db.json')));
const oldVersion='2026-09-24-4d2a266ee290-d6279e592bc5',stableVersion='schema2-4d2a266ee290';
const files=[...fs.readFileSync(path.join(src,'index.html'),'utf8').matchAll(/<script\s+src="([^"]+)"/g)].map(x=>x[1]).filter(n=>/^runtime.*\.js$/.test(n));
const ctx=vm.createContext({console});for(const f of files)vm.runInContext(fs.readFileSync(path.join(src,f),'utf8'),ctx,{filename:f});
ctx.CRPGRelationships.install(ctx.CRPGRuntime,{events:ctx.CRPGRelationships.catalogFromDB(db),activities:ctx.CRPGRelationships.activitiesFromDB(db)});
const Runtime=ctx.CRPGRuntime.Runtime,{SaveAdapter}=require(path.join(src,'save_adapter.js'));
const copy=x=>JSON.parse(JSON.stringify(x));
let seq=0;const fresh=()=>{const r=new Runtime(db);r.newGame({name:'독립 저장 검증',route:'ROUTE_TRAVELER',seed:72831,saveId:'REGRESSION-'+(++seq)});return r;};
function free(r){Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'HUB',STORY_CURSOR_NODE_ID:'HUB',SCREEN_MODE:'LOCATION',CURRENT_MAP_ID:'MAP_MOND_CITY',STORY_WAITING:true,STORY_MENU_POLICY:'',PENDING_CHOICE_GROUP_ID:''});r.s.storyContext=null;r.s.storyMenuFrame=null;return r;}
const results=[];
async function test(name,fn){try{await fn();results.push({name,ok:true});console.log('PASS '+name);}catch(error){results.push({name,ok:false,error:error.code||error.message,detail:error.message});console.error('FAIL '+name+' :: '+error.message);}}
(async()=>{
 await test('prior released pack imports under stable compatibility and preserves progress',()=>{
  const r=fresh();r.addXp('PLAYER_CUSTOM',250);r.s.flags.REGRESSION_PRESERVE=true;r.s.processed.regression={claimed:true};
  const original=JSON.parse(r.serialize()),adapter=new SaveAdapter({indexedDB:null,contentVersion:stableVersion,compatibleContentVersions:[oldVersion],migrate:ctx.CRPGRelationships.migrateState,validate:s=>new Runtime(db,s).s});
  try{const parsed=adapter.parseImport(JSON.stringify({envelopeSchema:1,contentVersion:oldVersion,state:original}));assert.deepEqual(copy(parsed.state),original);assert.equal(parsed.state.global.PLAYER_XP_STATE,250);}finally{adapter.close();}
 });
 await test('future unknown content is rejected without mutating caller save',()=>{
  const original=JSON.parse(fresh().serialize()),before=JSON.stringify(original),adapter=new SaveAdapter({indexedDB:null,contentVersion:stableVersion,compatibleContentVersions:[oldVersion]});
  try{assert.throws(()=>adapter.parseImport(JSON.stringify({envelopeSchema:1,contentVersion:'future-unknown-pack',state:original})),e=>e.code==='SAVE_CONTENT_VERSION');assert.equal(JSON.stringify(original),before);}finally{adapter.close();}
 });
 await test('validator returned normalized state is actually used',()=>{
  const state=JSON.parse(fresh().serialize());state.global.PLAYER_XP_NEXT=999;
  const adapter=new SaveAdapter({indexedDB:null,contentVersion:stableVersion,migrate:ctx.CRPGRelationships.migrateState,validate:s=>new Runtime(db,s).s});
  try{assert.equal(adapter.prepare(state).global.PLAYER_XP_NEXT,300);assert.equal(state.global.PLAYER_XP_NEXT,999);}finally{adapter.close();}
 });
 await test('main story SYSTEM checkpoint restores exact cursor RNG and XP',()=>{
  const r=fresh();r.addXp('PLAYER_CUSTOM',250);const node=r.storyActiveNodeId(),rng=r.s.global.PRNG_STATE;r.action('MENU',{screen:'SYSTEM'});
  const loaded=new Runtime(db,JSON.parse(r.serialize()));assert.equal(loaded.s.global.SCREEN_MODE,'SYSTEM');loaded.action('MENU',{screen:'STORY'});
  assert.equal(loaded.storyActiveNodeId(),node);assert.equal(loaded.s.global.PRNG_STATE,rng);assert.equal(loaded.s.global.PLAYER_XP_STATE,250);
 });
 await test('experience carries across threshold and max level has no division target',()=>{
  const r=fresh();r.addXp('PLAYER_CUSTOM',350);assert.equal(r.growth().level,2);assert.equal(r.growth().xp,50);assert.equal(r.growth().next,600);
  r.addXp('PLAYER_CUSTOM',1000000);assert.equal(r.growth().level,20);assert.equal(r.growth().xp,0);assert.equal(r.growth().next,0);assert.equal(r.growth().max,true);
 });
 await test('invalid XP increments leave state unchanged',()=>{
  const r=fresh();for(const amount of [-1,'50',NaN,Infinity,0.5]){const before=r.serialize();assert.throws(()=>r.addXp('PLAYER_CUSTOM',amount),e=>e.code==='XP_VALUE');assert.equal(r.serialize(),before);}
 });
 await test('invalid protagonist XP checkpoints are rejected',()=>{
  for(const xp of [-1,'50',null,0.5,300]){const state=JSON.parse(fresh().serialize());state.global.PLAYER_XP_STATE=xp;assert.throws(()=>new Runtime(db,state),e=>e.code==='GROWTH_SAVE');}
 });
 await test('invalid companion fractional or overthreshold XP checkpoints are rejected',()=>{
  for(const [level,xp] of [[1,0.5],[1,300],[20,1]]){const state=JSON.parse(fresh().serialize());Object.assign(state.chars.MOND_AMBER,{level,xp});assert.throws(()=>new Runtime(db,state),e=>e.code==='GROWTH_SAVE');}
 });
 await test('only active companion can use XP book; inactive and unowned targets roll back',()=>{
  const r=free(fresh());r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify({MOND_AMBER:{state:'JOINED'}});r.giveItem('MAT_CHAR_EXP_WANDERER',2);
  assert.equal(r.s.party.some(p=>p.active&&p.source==='MOND_AMBER'),false);const unchanged=r.serialize();assert.throws(()=>r.action('USE_ITEM',{item:'MAT_CHAR_EXP_WANDERER',quantity:1,owner:'MOND_AMBER'}),e=>e.code==='OWNER');assert.equal(r.serialize(),unchanged);r.action('PARTY',{char:'MOND_AMBER',slot:2});
  r.action('USE_ITEM',{item:'MAT_CHAR_EXP_WANDERER',quantity:1,owner:'MOND_AMBER'});assert.equal(r.s.chars.MOND_AMBER.xp,50);assert.equal(r.itemCount('MAT_CHAR_EXP_WANDERER'),1);
  const before=r.serialize();assert.throws(()=>r.action('USE_ITEM',{item:'MAT_CHAR_EXP_WANDERER',quantity:1,owner:'MOND_LISA'}));assert.equal(r.serialize(),before);
 });
 await test('free NPC visit persists an exact dialogue target',()=>{
  const r=free(fresh());r.s.global.WORLD_TIME='10:00';const npc=r.schedules()[0];assert.ok(npc?.entity_id);r.action('NPC',{entity:npc.entity_id});
  const loaded=new Runtime(db,JSON.parse(r.serialize()));assert.equal(loaded.s.global.SCREEN_MODE,'DIALOGUE');assert.equal(loaded.s.global.CURRENT_NPC_ENTITY_ID,npc.entity_id);
 });
 await test('same action ID retry never reconsumes an experience item',()=>{
  const r=free(fresh());r.giveItem('MAT_CHAR_EXP_WANDERER',2);const g=r.s.global,action={id:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1),revision:g.SAVE_REVISION,type:'USE_ITEM',item:'MAT_CHAR_EXP_WANDERER',owner:'PLAYER_CUSTOM',quantity:1};
  const receipt=r.transact(action),state=r.serialize();assert.deepEqual(copy(r.transact(action)),copy(receipt));assert.equal(r.serialize(),state);assert.equal(r.itemCount('MAT_CHAR_EXP_WANDERER'),1);
 });
 await test('default mode remains OFF and importing mode or consent cannot enable it',()=>{
  const state=JSON.parse(fresh().serialize());state.adultModeEnabled=true;state.consent=true;state.global.ADULT_CONSENT_FLAG=true;
  const adapter=new SaveAdapter({indexedDB:null,contentVersion:stableVersion,migrate:ctx.CRPGRelationships.migrateState,validate:s=>new Runtime(db,s).s});
  try{const saved=adapter.parseImport(JSON.stringify(state)).state,loaded=new Runtime(db,saved);assert.equal(saved.consent,undefined);assert.equal(saved.adultModeEnabled,undefined);assert.equal(saved.global.ADULT_CONSENT_FLAG,undefined);assert.equal(loaded.adultModeEnabled(),false);}finally{adapter.close();}
 });
 const failed=results.filter(r=>!r.ok);console.log(JSON.stringify({passed:results.length-failed.length,failed:failed.length,results},null,2));if(failed.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
