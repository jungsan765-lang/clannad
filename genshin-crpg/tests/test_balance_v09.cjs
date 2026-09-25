'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ctx=vm.createContext({console}),db=JSON.parse(fs.readFileSync(path.join(root,'content/db.json'))),copy=x=>JSON.parse(JSON.stringify(x));
const files=[...fs.readFileSync(path.join(root,'source/index.html'),'utf8').matchAll(/<script src="(runtime[^"]*\.js)"/g)].map(x=>x[1]);
for(const f of files)vm.runInContext(fs.readFileSync(path.join(root,'source',f),'utf8'),ctx,{filename:f});
function fresh(size){const r=new ctx.CRPGRuntime.Runtime(db);r.newGame({name:'균형 검증',route:'ROUTE_TRAVELER',seed:331,saveId:'BALANCE-09'});Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'HUB',STORY_CURSOR_NODE_ID:'HUB',CURRENT_MAP_ID:'MAP_MOND_PLAINS',STORY_WAITING:true,STORY_MENU_POLICY:'',PENDING_CHOICE_GROUP_ID:'',SCREEN_MODE:'LOCATION'});for(const [i,id]of ['MOND_AMBER','MOND_KAEYA','MOND_LISA'].slice(0,size-1).entries()){r.unlockCharacter(id);r.action('PARTY',{char:id,slot:i+2});}return r;}
let passed=0;
for(const group of ['EG_MOND_SLIME_SMALL','EG_MOND_HILI_PATROL','EG_MOND_HILI_ELITE','EG_MOND_ABYSS_MAGE','EG_TREASURE_PATROL']){
 const raw=fresh(3),scaled=fresh(3);raw.startBattle(group,'EXPLICIT');scaled.startBattle(group,'RANDOM');
 assert.equal(raw.s.global.PRNG_STATE,scaled.s.global.PRNG_STATE,'scaling must not roll more random values');
 assert.equal(scaled.s.runtime.balanceProfile.party,3);const enemies=scaled.s.runtime.actors.filter(a=>a.side==='ENEMY');assert(enemies.length<=3);
 for(const enemy of enemies){const source=raw.s.runtime.actors.find(a=>a.id===enemy.id),tier=({일반:2,정예:2.8,강적:4}[enemy.grade]||1);assert.equal(enemy.maxHp,Math.round(source.maxHp/tier*.75));assert.equal(enemy.atk,Math.round(source.atk*.85));assert.equal(enemy.def,source.def);}
 const ids=new Set(scaled.s.runtime.actors.map(a=>a.id));assert.deepEqual(copy(scaled.s.runtime.order),copy(raw.s.runtime.order.filter(a=>ids.has(a.id))));
 const saved=scaled.serialize(),loaded=new ctx.CRPGRuntime.Runtime(db,JSON.parse(saved));assert.equal(loaded.serialize(),saved,'load must not scale enemies a second time');
 const action={type:'COMBAT_BEGIN',battle:loaded.s.runtime.id,id:loaded.s.global.SAVE_ID+':'+(loaded.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:loaded.s.global.SAVE_REVISION};loaded.transact(action);const once=loaded.serialize();loaded.transact(action);assert.equal(loaded.serialize(),once,'duplicate start must not produce extra turns');passed++;
}
for(const size of [1,2,3,4])for(const group of ['EG_CRPG_MOND_FIRST_FIELD','EG_BOSS_DVALIN','EG_BOSS_ANDRIUS']){const r=fresh(size);r.startBattle(group,'RANDOM');assert(!r.s.runtime.balanceProfile,'fixed and boss encounters keep their own rules');passed++;}
console.log(JSON.stringify({passed,coverage:'three-person field balance, unchanged RNG and initiative, fixed/boss exclusions, save and start idempotence'}));
