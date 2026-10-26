'use strict';
// Compare the complete native runtime against the previous uncached constructor
// path. The reference only disables lookup sharing; no game numbers are copied.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),copy=v=>JSON.parse(JSON.stringify(v)),NOW=1791734400000;
class FixedDate extends Date{constructor(...a){super(...(a.length?a:[NOW]));}static now(){return NOW;}}
function load(reference=false){
 const c=vm.createContext({console,Date:FixedDate,setTimeout,clearTimeout,structuredClone});
 for(const[,file]of fs.readFileSync(path.join(ROOT,'source/index.html'),'utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)){
  let source=fs.readFileSync(path.join(ROOT,'source',file),'utf8');
  if(reference&&file==='runtime_balance_admin_v01623.js'){
   const optimized='new api.Runtime({...entry.db},state,takeOwnership,entry.db,entry)';
   assert(source.includes(optimized),'reference disables the single base-table reuse call');
   source=source.replace(optimized,'new api.Runtime({...entry.db},state,takeOwnership)');
  }
  vm.runInContext(source,c,{filename:file});
 }
 vm.runInContext(fs.readFileSync(path.join(ROOT,'source/readable_text.js'),'utf8'),c,{filename:'readable_text.js'});
 return {c,api:c.CRPGRuntime,db:JSON.parse(fs.readFileSync(path.join(ROOT,'content/db.json')))};
}
const current=load(),reference=load(true),rawBefore=JSON.stringify(current.db),checks=[];
const check=(name,fn)=>{fn();checks.push(name);};
const factory=(env,profile={revision:0,config:env.api.adminBalance.emptyConfig()},state=null)=>env.api.adminBalance.createRuntime(env.db,state,profile,true);
const fresh=(env,profile)=>{const r=factory(env,profile);r.newGame({name:'capacity-contract',route:'ROUTE_TRAVELER',seed:12345,saveId:'capacity-contract'});return r;};
const tables=r=>Object.fromEntries(Object.entries(r.tables).map(([name,rows])=>[name,[...rows]]));
const plain=v=>v instanceof Map||Object.prototype.toString.call(v)==='[object Map]'?[...v].map(([k,x])=>[k,plain(x)]):v instanceof Set||Object.prototype.toString.call(v)==='[object Set]'?[...v].map(plain):Array.isArray(v)?{row:v.map(plain),table:v.table,sourceRow:v.sourceRow}:v&&typeof v==='object'?Object.fromEntries(Object.getOwnPropertyNames(v).map(k=>[k,plain(v[k])])):v;
check('same complete installed tables and new-game state as original uncached construction',()=>{
 const a=fresh(current),b=fresh(reference);assert.deepEqual(copy(a.s),copy(b.s));assert.deepEqual(copy(tables(a)),copy(tables(b)));
 const reopened=factory(current,undefined,copy(a.s)),oldReopened=factory(reference,undefined,copy(b.s));
 assert.deepEqual(copy(reopened.s),copy(oldReopened.s));assert.deepEqual(copy(tables(reopened)),copy(tables(oldReopened)));
 assert.equal(reopened._baseRows,a._baseRows,'immutable authored lookup rows are shared before per-runtime content installation');
 assert.notEqual(reopened.tables,a.tables,'each runtime owns its mutable table registry');
 assert.notEqual(reopened.db,a.db,'each runtime owns its database wrapper');
});
check('complete compiled story graph, both routes and account-specific text match the original constructor after cache hits',()=>{
 for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){
  const build=env=>{const r=factory(env);r.newGame({name:route==='ROUTE_TRAVELER'?'story-TRV':'story-ISK',route,seed:12345,saveId:'story-capacity-'+route});return r;};
  const a=build(current),b=build(reference),ix=a.storyIndex(),original=b.storyIndex();
  // Complete the same content-only lazy lookup in both engines before comparing.
  for(const d of ix.legends.values())a.storyDone(d.id);for(const d of original.legends.values())b.storyDone(d.id);
  const actualGraph=plain(ix),originalGraph=plain(original);
  if(JSON.stringify(actualGraph)!==JSON.stringify(originalGraph)){const differences=[];const inspect=(a,b,path)=>{if(differences.length>=12||JSON.stringify(a)===JSON.stringify(b))return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))inspect(a[k],b[k],path+'.'+k);}else differences.push({path,actual:JSON.stringify(a)?.slice(0,240),original:JSON.stringify(b)?.slice(0,240)});};inspect(actualGraph,originalGraph,'index');console.error(JSON.stringify({graphDifferences:differences}));}
  assert(JSON.stringify(actualGraph)===JSON.stringify(originalGraph),'all nodes, edges, definitions, source attributes and compiler reports remain identical');
  const reopened=factory(current,undefined,copy(a.s));assert.equal(reopened.storyIndex(),ix,'one compiled graph per immutable profile entry');
  const another=build(current);a.s.global.PLAYER_NAME='첫 계정';another.s.global.PLAYER_NAME='다른 계정';b.s.global.PLAYER_NAME='첫 계정';
  const row=[...ix.nodes.values()].find(r=>r[0]===route&&String(r[9]).includes('{PLAYER_NAME}'));
  const display=(env,r,node)=>env.c.CRPGText.readable(r.storyDisplayText(node),{name:r.s.global.PLAYER_NAME});
  if(row){assert.equal(display(current,a,row),display(reference,b,original.nodes.get(row[0]+':'+row[4])));assert.notEqual(display(current,a,row),display(current,another,row));}
  assert(Object.isFrozen([...ix.nodes.values()][0]),'shared compiled rows cannot be changed by one account');
  assert.deepEqual(copy(reopened.s),copy(build(reference).s));
 }
});
check('all level curves, characters and growth requirements remain identical',()=>{
 const a=fresh(current),b=fresh(reference);
 for(let level=1;level<=60;level++){
  a.adminApply({op:'level',target:'PLAYER_CUSTOM',value:level});b.adminApply({op:'level',target:'PLAYER_CUSTOM',value:level});
  assert.deepEqual(copy(a.row('26_LEVEL_RULES',level)),copy(b.row('26_LEVEL_RULES',level)));
  assert.deepEqual(copy(a.player()),copy(b.player()));
 }
 for(const row of a.rows('07_CHAR_DB'))assert.deepEqual(copy(a.character(row[0])),copy(b.character(row[0])));
});
check('two saves and mutable installed encounter tables do not leak into each other',()=>{
 const a=fresh(current),b=fresh(current),before=copy(b.s),beforeTables=JSON.stringify(tables(b));
 a.s.global.MORA+=999;a.s.chars.MOND_AMBER.hp=1;
 a.tables['09_MONSTER_DB'].get('MON_ABYSS_WARDEN')[6]=987654321;
 assert.notEqual(a.tables['09_MONSTER_DB'],b.tables['09_MONSTER_DB']);
 assert.deepEqual(copy(b.s),before);assert.equal(JSON.stringify(tables(b)),beforeTables);
});
check('separate profile revisions and separate database owners remain isolated',()=>{
 const config=current.api.adminBalance.emptyConfig();config.characters.MOND_AMBER={hpMultiplier:2};config.economy.innMultiplier=2;
 const a=fresh(current,{revision:1,config}),base=fresh(current),secondDB={...current.db};
 const otherConfig=current.api.adminBalance.emptyConfig();otherConfig.characters.MOND_AMBER={hpMultiplier:3};
 const other=current.api.adminBalance.createRuntime(secondDB,null,{revision:1,config:otherConfig});other.newGame({name:'other-owner',route:'ROUTE_TRAVELER',seed:12345,saveId:'other-owner'});
 assert.equal(a.character('MOND_AMBER').maxHp,base.character('MOND_AMBER').maxHp*2);
 assert.equal(other.character('MOND_AMBER').maxHp,base.character('MOND_AMBER').maxHp*3);
 assert.equal(current.api.adminBalance.profileOf(base).revision,0);
 const again=factory(current,{revision:1,config},copy(a.s));assert.deepEqual(copy(again.s),copy(a.s));
});
check('real four-person field-boss actions and rewards match original path',()=>{
 const setup=env=>{const r=fresh(env);Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:'MAP_MOND_CITY',STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION'});delete r.s.storyJourney;delete r.s.storyBreak;r.s.storyContext=null;r.prepareStory();r.adminApply({op:'level',target:'PLAYER_CUSTOM',value:20});for(const[i,char]of ['MOND_AMBER','MOND_KAEYA','MOND_LISA'].entries()){r.adminApply({op:'recruit',char});r.adminApply({op:'level',target:char,value:20});r.setParty(char,i+2);}const group=r.rows('33_ENCOUNTER_GROUP_DB').find(x=>String(x[0]).includes('CRYO_REGISVINE'));assert(group);r.startBattle(group[0],'EXPLICIT');r.action('COMBAT_BEGIN',{});return r;};
 let a=setup(current),b=setup(reference);assert.deepEqual(copy(a.s),copy(b.s));
 for(let turn=0;turn<5&&a.s.runtime;turn++){
  const card=a.combatCards().find(x=>x.id==='PLAYER_BASIC_GUARD'&&!x.reason);assert(card);
  a.actionStartedAt=b.actionStartedAt=NOW;
  const params={card:card.id,target:card.targets[0]?.id};assert.deepEqual(copy(a.action('COMBAT',params)),copy(b.action('COMBAT',params)));
  assert.deepEqual(copy(a.s),copy(b.s));
  a=factory(current,undefined,copy(a.s));b=factory(reference,undefined,copy(b.s));
  assert.deepEqual(copy(a.s),copy(b.s),'cold re-open preserves the in-progress battle');
 }
});
check('authored database remains byte-identical after construction and actions',()=>assert.equal(JSON.stringify(current.db),rawBefore));
console.log(JSON.stringify({ok:true,checks:checks.length,names:checks,authoredDBSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'content/db.json'))).digest('hex')}));
