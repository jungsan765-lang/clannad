'use strict';
// 0.16 다인 모드 · 함께 돌아다니기 in the game rules (runtime_coop_world_v0160.js). User: 「그냥 손님이 방장 맵에 아예 들어가는
// 원신처럼 맵 알아서 돌아다니다가 방장이나 손님이 쌈 나면 전투 시작 전에 끼고 그런거 안돼?」, 「그래야 상자도 대신 좀 퍼즐같은것도
// 풀어줄 수 있고」. A guest's step through the host's world (and the fight it may bring, in the guest's own save, which goes
// home afterwards and learns nothing), 「참가」 before 「전투 시작」, and a guest opening one of the host's chests.
const assert=require('node:assert/strict'),path=require('path');
const {fs,root,c,db,R}=require('./helpers_v011.cjs'),{fixture}=require('./helpers_abyss.cjs');
const api=c.CRPGRuntime,results=[],cp=x=>JSON.parse(JSON.stringify(x));
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const refused=(fn,pattern)=>{try{fn();}catch(e){if(pattern)assert.match(e.message,pattern);return true;}return false;};
const ROOM='Rabcdef1234',G1='aaaaaaaaaaaa',G2='bbbbbbbbbbbb',T0=c.Date.now(),PLAYER='PLAYER_CUSTOM';
const ctx=(extra={},members=[],caller=null)=>({version:1,room:ROOM,members,caller,...extra});
const reload=r=>{const x=new R(db,cp(r.s));x.actionStartedAt=r.actionStartedAt;x.coopContext=r.coopContext;return x;};
function guest(){const g=fixture(12,['MOND_AMBER','MOND_KAEYA'],6,'ROUTE_ISEKAI');Object.assign(g.s.global,{CURRENT_MAP_ID:'MAP_MOND_CITY',LOCATION:'몬드성',LAST_SAFE_MAP_ID:'MAP_MOND_CITY',SCREEN_MODE:'LOCATION'});g.actionStartedAt=T0;g.ensureExplorationState();return g;}
function host(){const h=fixture(12,['MOND_LISA','MOND_NOELLE'],6,'ROUTE_TRAVELER');Object.assign(h.s.global,{CURRENT_MAP_ID:'MAP_MOND_PLAINS',SCREEN_MODE:'LOCATION'});h.actionStartedAt=T0;return h;}
// A field with encounters the guest has never been to (their own journey must not learn it).
const g0=guest(),field=[...g0.tables['32_MAP_DB'].values()].find(m=>m[8]==='Y'&&m[12]!=='Y'&&m[1]==='몬드'&&!g0.s.exploration.visitedMaps[m[0]]&&g0.encounterPoolRows(m).length)[0];
const roam=(g,to,force=true)=>{g.coopContext=ctx({away:{room:ROOM,from:'MAP_MOND_PLAINS',to,host:'방장님'}});if(force){g.s.global.ENCOUNTER_COOLDOWN=0;g.die=n=>1;}try{return g.action('COOP_ROAM',{room:ROOM});}finally{delete g.die;}};
const weak=(b,side)=>{for(const a of b.actors.filter(x=>x.side===side)){a.hp=1;a.maxHp=Math.max(1,a.maxHp);a.def=0;}};
function play(g,max=200){for(let i=0;i<max&&g.s.runtime;i++){const cards=g.combatCards().filter(x=>!x.reason),card=cards.find(x=>x.id==='PLAYER_BASIC_ATTACK')||cards[0],foe=g.s.runtime.actors.find(a=>a.side==='ENEMY'&&a.hp>0);g.action('COMBAT',{card:card.id,target:card.targets?.[0]?.id||foe?.id});}return g;}

check('a step through the host\'s world with no fight leaves the guest\'s own journey where it was',()=>{
 const g=guest(),before=cp(g.s.global);g.s.global.ENCOUNTER_COOLDOWN=1;g.s.global.SCREEN_MODE='REWARD';
 const out=roam(g,field,false);assert.equal(out.result?.encounter??out.encounter??null,null);
 assert.equal(g.s.global.SCREEN_MODE,'LOCATION','the step is taken from the field: no old result screen comes back with the sync');
 assert.equal(g.s.global.CURRENT_MAP_ID,before.CURRENT_MAP_ID);assert.equal(g.s.global.LOCATION,before.LOCATION);assert(!g.s.coopAway);assert(!g.s.exploration.visitedMaps[field],'no visited place');
 assert.equal(g.s.global.ENCOUNTER_COOLDOWN,0,'the cooldown counts the step like a move');
});

check('a fight on the way is the guest\'s own, at that place in the host\'s world; won, it goes home and learns nothing',()=>{
 const g=guest(),home=g.s.global.CURRENT_MAP_ID,xp0=g.growth().xp+g.growth().level*1e6;
 roam(g,field);const b=g.s.runtime;assert(b&&b.origin==='RANDOM');assert.equal(g.s.global.CURRENT_MAP_ID,field);assert.equal(g.s.coopAway.home.map,home);
 assert.equal(b.coop?.room,ROOM,'a shared fight others can join');assert.match(b.encounter.text,/방장님 님의 세계/);assert.match(b.encounter.text,/이동 도중/);
 const again=reload(g);assert.equal(again.s.coopAway.map,field,'the save keeps both places');
 assert(refused(()=>roam(g,field),/전투/),'one fight at a time');
 g.coopContext=ctx();g.action('COMBAT_BEGIN');weak(g.s.runtime,'ENEMY');play(g);
 assert(!g.s.runtime);assert(JSON.parse(g.s.global.LAST_BATTLE_RESULT_JSON).victory);
 assert.equal(g.s.global.CURRENT_MAP_ID,home);assert(!g.s.coopAway);assert(!g.s.exploration.visitedMaps[field],'never visited in the own journey');
 assert(g.growth().xp+g.growth().level*1e6>xp0,'the fight\'s rewards are the guest\'s own');
 reload(g);
});

check('lost or left, the guest also goes home (no move to the last safe place)',()=>{
 for(const how of ['lose','forfeit']){
  const g=guest();g.s.global.LAST_SAFE_MAP_ID='MAP_MOND_SPRINGVALE';roam(g,field);g.coopContext=ctx();
  if(how==='forfeit')g.action('COMBAT_FORFEIT',{reason:'TEST'});
  else{g.action('COMBAT_BEGIN');for(const a of g.s.runtime.actors.filter(x=>x.side==='ENEMY')){a.atk*=60;a.maxHp*=60;a.hp=a.maxHp;}weak(g.s.runtime,'ALLY');play(g);}
  assert(!g.s.runtime,how);assert.equal(g.s.global.CURRENT_MAP_ID,'MAP_MOND_CITY',how);assert.equal(g.s.global.LAST_SAFE_MAP_ID,'MAP_MOND_SPRINGVALE',how);assert(!g.s.coopAway,how);
  reload(g);
 }
});

check('a step needs the server\'s way (coopContext), a free journey and the right room; it is never a client action',()=>{
 const g=guest();g.coopContext=null;assert(refused(()=>g.action('COOP_ROAM',{room:ROOM}),/방장의 세계/));
 g.coopContext=ctx({away:{room:ROOM,from:'MAP_MOND_PLAINS',to:field}});assert(refused(()=>g.action('COOP_ROAM',{room:'Rffffffffff'}),/방장의 세계/));
 const busy=guest();busy.s.lifeJob={kind:'GATHER'};busy.coopContext=ctx({away:{room:ROOM,from:'MAP_MOND_PLAINS',to:field}});assert.match(busy.actionReason('COOP_ROAM',{room:ROOM}),/하고 있는 일/);
 const core=fs.readFileSync(path.join(root,'server/game-core.mjs'),'utf8'),list=core.slice(core.indexOf('for(const type of ['),core.indexOf(']',core.indexOf('for(const type of [')));
 for(const t of ['COOP_ROAM','COOP_ADMIT','COOP_CHEST_UNSEAL'])assert(!list.includes('"'+t+'"'),t+' is server-only');
 const bad=cp(guest().s);bad.coopAway={version:1,room:ROOM,map:'NOPE',home:{map:'MAP_MOND_CITY',location:'',profile:'',safe:null}};assert.throws(()=>new R(db,bad));
});

check('「참가」 before 「전투 시작」: the newcomer is in the first round\'s order at once, and the save stays valid',()=>{
 const g0x=guest(),snap=g0x.coopSnapshot('MOND_AMBER');
 const h=host();h.coopContext=ctx();const pool=h.encounterPoolRows(h.row('32_MAP_DB',h.s.global.CURRENT_MAP_ID));h.startBattle(pool[0][5],'RANDOM');
 const b=h.s.runtime;assert.equal(b.opening?.state,'PENDING');assert(b.coop,'a host with a room open has a shared fight');assert(!b.actors.some(a=>a.coop),'nobody came along');
 h.coopContext=ctx({},[{pid:G1,name:'손님하나',snap}]);const out=h.action('COOP_ADMIT',{room:ROOM,pid:G1});
 const a=h.s.runtime.actors.find(x=>x.coop?.owner===G1);assert(a&&out.result?.admitted!==false);
 assert(h.s.runtime.order.some(t=>t.id===a.id));assert.deepEqual(cp(h.s.runtime.order),cp(h.s.runtime.opening.initialOrder));assert.equal(h.s.runtime.order[0].id,PLAYER,'the one who started still goes first');
 reload(h);
 assert.equal(h.action('COOP_ADMIT',{room:ROOM,pid:G1}).result?.already,true,'twice is once');
 h.coopContext=ctx({},[{pid:G1,name:'손님하나',snap}]);h.action('COMBAT_BEGIN');assert.equal(h.s.runtime.opening.state,'STARTED');
 assert.equal(h.action('COOP_ADMIT',{room:ROOM,pid:G1}).result?.already,true);
 h.coopContext=ctx({},[{pid:G1,name:'손님하나',snap},{pid:G2,name:'손님둘',snap:g0x.coopSnapshot(PLAYER)}]);assert.equal(h.action('COOP_ADMIT',{room:ROOM,pid:G2}).result?.nextRound,true,'after the start: the next round');
 return {order:h.s.runtime.order.map(t=>t.id)};
});

check('a guest unseals one of the host\'s chests where they stand; it stays there and the host opens it without the puzzle (user: 「클리어 따로, 상자 먹는거 따로」)',()=>{
 const chests=api.chestRules.chests,spot=chests.find(x=>x.game==='SPOT'&&x.region==='MOND'),menu=chests.find(x=>x.how==='MENU');
 const h=host(),prim=Number(h.s.global.PRIMOGEM)||0,p=h.chestPuzzle(spot.id),answer=[...Array(p.count).keys()];
 const at=map=>ctx({chest:{map,pid:G1,name:'손님하나'}});
 h.coopContext=at('MAP_MOND_PLAINS');assert(refused(()=>h.action('COOP_CHEST_UNSEAL',{room:ROOM,chest:spot.id,answer}),/있는 곳/),'only where the guest stands');
 h.coopContext=at(spot.map);assert(refused(()=>h.action('COOP_CHEST_UNSEAL',{room:ROOM,chest:spot.id,answer:[0]}),/퍼즐/),'the puzzle must be solved');
 const list=h.coopChestsAt(spot.map);assert(list.some(x=>x.id===spot.id&&x.puzzle?.game==='SPOT'),'the guest sees the host\'s puzzle (the host\'s seed)');
 const out=h.action('COOP_CHEST_UNSEAL',{room:ROOM,chest:spot.id,answer});assert.equal(out.result?.by,'손님하나');assert.equal(out.result?.unsealed,true);
 assert.equal(Number(h.s.global.PRIMOGEM)||0,prim,'solving takes nothing');assert(!h.chestOpened(spot.id),'the chest is still there');assert.equal(h.s.chests.unsealed[spot.id].by,'손님하나');
 assert(refused(()=>h.action('COOP_CHEST_UNSEAL',{room:ROOM,chest:spot.id,answer}),/이미 암호/),'once');assert(!h.coopChestsAt(spot.map).some(x=>x.id===spot.id),'no longer there for guests');
 const kept=reload(h);assert.equal(kept.s.chests.unsealed[spot.id].by,'손님하나','the save keeps it');
 // The host goes there and takes it with no puzzle; the record keeps who solved it.
 h.coopContext=null;assert.match(h.actionReason('CHEST_OPEN',{chest:spot.id}),/있는 곳/,'the host goes there');
 Object.assign(h.s.global,{CURRENT_MAP_ID:spot.map,WORLD_TIME:'12:00'});
 assert.equal(h.chestsHere('SCENERY').find(x=>x.id===spot.id)?.unsealed?.by,'손님하나','the host sees who unsealed it');
 const got=h.action('CHEST_OPEN',{chest:spot.id});assert.equal(got.result?.unsealedBy,'손님하나');
 assert.equal(Number(h.s.global.PRIMOGEM),prim+spot.reward.primogem,'into the host\'s journey');assert.equal(h.s.chests.opened[spot.id].by,'손님하나');assert(!h.s.chests.unsealed?.[spot.id]);
 assert.equal(api.chestRules.check.SPOT(p,[0]),false,'the puzzle rule itself is untouched');
 h.coopContext=at(menu.map);assert(refused(()=>h.action('COOP_CHEST_UNSEAL',{room:ROOM,chest:menu.id}),/방장만/),'the ones hidden in menus stay the host\'s own find');
 assert(!h.coopChestsAt(menu.map).some(x=>x.id===menu.id));
 reload(h);
 const bad=cp(kept.s);bad.chests.unsealed={[menu.id]:{day:1,by:'손님'}};assert.throws(()=>new R(db,bad),'only a place\'s own chests are unsealed');
 // While the host fights, a guest can still unseal one for them.
 const busy=host();busy.coopContext=ctx();busy.startBattle(busy.encounterPoolRows(busy.row('32_MAP_DB','MAP_MOND_PLAINS'))[0][5],'RANDOM');busy.coopContext=at(spot.map);
 const ok=busy.action('COOP_CHEST_UNSEAL',{room:ROOM,chest:spot.id,answer:[...Array(busy.chestPuzzle(spot.id).count).keys()]});assert(ok.result?.chest===spot.id&&busy.s.runtime,'the host\'s fight goes on');
 return {chest:spot.id,primogem:spot.reward.primogem};
});

check('the module is wired after every finishBattle wrapper, in the client and the server engine',()=>{
 const html=fs.readFileSync(path.join(root,'source/index.html'),'utf8'),at=f=>html.indexOf('<script src="'+f+'"');
 assert(at('runtime_coop_world_v0160.js')>at('runtime_story_companions_v01525.js')&&at('runtime_coop_world_v0160.js')>at('runtime_battle_capacity_v01522.js')&&at('runtime_coop_world_v0160.js')<at('runtime_reading.js'));
 assert(fs.readFileSync(path.join(root,'tools/build.py'),'utf8').includes("'runtime_coop_world_v0160.js'"));
});

const out=path.join(root,'reports/v0160');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'coop-world-rules.json'),JSON.stringify({version:'0.16.0',total:results.length,passed:results.filter(r=>r.ok).length,results},null,2)+'\n');
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length}));
