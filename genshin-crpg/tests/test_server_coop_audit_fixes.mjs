// COOP-01 / COOP-02: actual game engine + file-backed SQLite, no remote server or production accounts.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LiveRegionStore} from '../server/fixed-region-live.mjs';
import {AdminConsole} from '../server/admin-api.mjs';
import {ENGINE_VERSION,ENGINE_FINGERPRINT} from '../server/generated/engine.mjs';
import {pidOf} from '../server/social-v01415.mjs';

const dir=mkdtempSync(join(tmpdir(),'crpg-coop-fixes-')),dbPath=join(dir,'test.sqlite');
const opts={pepper:'local-coop-audit-regression'.padEnd(64,'x'),features:['chat','trade','coop']};
let store=new LiveRegionStore(dbPath,opts),admin=new AdminConsole(store),seq=0;
const checks=[];
const rt=a=>store.runtimeOf(a.id),battle=a=>rt(a).s.runtime,revision=a=>store.meta(a.id).revision;
const state=a=>JSON.stringify(rt(a).s);
const act=(a,type,params={})=>store.action(a,{version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,revision:revision(a),requestId:'coop-fix-host-'+(++seq),type,params});
const edit=(a,fn)=>admin.editSave(a,fn,'local test fixture');
async function check(name,fn){store.rates.clear();await fn();checks.push(name);console.log('PASS '+name);}
async function player(id){
 store.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id,id,id,'0'.repeat(64),'0'.repeat(64),Date.now());
 const a=store.account(id);await store.newGame(a,{name:id,route:'ROUTE_TRAVELER'});
 await edit(a,r=>admin.applyOps(r,[{op:'level',target:'PLAYER_CUSTOM',value:10},{op:'teleport',map:'MAP_MOND_CITY'}]));return a;
}
async function begin(h){
 await edit(h,r=>{r.coopContext=store.coopContextFor(h.id);try{
  r.startBattle('EG_MOND_HILI_PATROL','RANDOM');
  for(const foe of r.s.runtime.actors.filter(a=>a.side==='ENEMY')){foe.hp=foe.maxHp=100000;foe.atk=1;}
  return [];
 }finally{r.coopContext=null;}});
 if(battle(h).opening?.state==='PENDING')await act(h,'COMBAT_BEGIN',{battle:battle(h).id});
}
async function guestTurn(h,g){
 for(let i=0;i<40;i++){
  const b=battle(h);assert(b,'battle remains in progress');
  if(b.coop?.turn?.owner===pidOf(g.id))return;
  assert(!b.coop?.turn,'only the tested guest is present');
  await act(h,'COMBAT',{card:'PLAYER_BASIC_GUARD'});
 }
 throw new Error('guest turn not reached');
}
function command(h,g,requestId,{bound=false,card='PLAYER_BASIC_ATTACK'}={}){
 const v=store.coopBattleFor(store.coopRoomOf(g.id),rt(h),g.id),c=v.cards.find(x=>x.id===card&&!x.reason);assert(c,'requested card is usable');
 return {requestId,card:c.id,...(c.targets[0]?{target:c.targets[0].id}:{}),...(bound?{battle:v.battle,turn:{actor:v.turn.actor,deadline:v.turn.deadline,round:v.round}}:{})};
}
async function restart(){await store.coopSettled();store.close();store=new LiveRegionStore(dbPath,opts);admin=new AdminConsole(store);}
const unchanged=async(h,fn)=>{const rev=revision(h),saved=state(h);await fn();assert.equal(revision(h),rev);assert.equal(state(h),saved);};

try{
 const H=await player('coop_fix_host'),G=await player('coop_fix_guest');
 const roomId=store.coopOpen(H,{}).room.id;store.coopJoin(G,{room:roomId});await begin(H);
 let first,second,battleId;
 await check('old legacy request remains a replay after intervening commands and turns; battle view is current',async()=>{
  await guestTurn(H,G);first=command(H,G,'coop-first-0001');await store.coopAct(G,first);
  await unchanged(H,async()=>assert.equal((await store.coopAct(G,first)).replayed,true));
  await guestTurn(H,G);second=command(H,G,'coop-second-0002',{bound:true});await store.coopAct(G,second);
  await guestTurn(H,G);const currentRound=battle(H).round;
  await unchanged(H,async()=>{const replay=await store.coopAct(G,first);assert.equal(replay.replayed,true);assert.equal(replay.battle.round,currentRound);assert.equal(replay.battle.turn.mine,true);});
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM coop_commands').get().n,2);
 });
 await check('same request ID with changed card, target, branch or turn is rejected without any save change',async()=>{
  for(const altered of [{...first,card:'PLAYER_BASIC_GUARD'},{...first,target:'ENEMY_OTHER'},{...first,branch:'OTHER'},{...second,turn:{...second.turn,deadline:second.turn.deadline+1}}]){
   await unchanged(H,()=>assert.rejects(store.coopAct(G,altered),e=>e.status===409&&e.code==='REQUEST_ID_REUSED'));
  }
 });
 await check('concurrent duplicate commands commit one action; concurrent changed intent conflicts',async()=>{
  const body=command(H,G,'coop-concurrent-0003',{bound:true}),rev=revision(H);
  const out=await Promise.all([store.coopAct(G,body),store.coopAct(G,body)]);
  assert.equal(out.filter(x=>x.replayed).length,1);assert.equal(revision(H),rev+1);
  await guestTurn(H,G);const next=command(H,G,'coop-concurrent-0004'),before=revision(H);
  const results=await Promise.allSettled([store.coopAct(G,next),store.coopAct(G,{...next,card:'PLAYER_BASIC_GUARD'})]);
  assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');assert.equal(results[1].reason.code,'REQUEST_ID_REUSED');assert.equal(revision(H),before+1);
 });
 await check('a delayed first delivery bound to an old turn is rejected; malformed request IDs are not silently accepted',async()=>{
  await guestTurn(H,G);
  await unchanged(H,()=>assert.rejects(store.coopAct(G,{...second,requestId:'coop-delayed-0005'}),e=>e.code==='COOP_STALE_TURN'));
  const wrongRound=command(H,G,'coop-wrong-round-0005',{bound:true});wrongRound.turn.round++;
  await unchanged(H,()=>assert.rejects(store.coopAct(G,wrongRound),e=>e.code==='COOP_STALE_TURN'));
  await unchanged(H,()=>assert.rejects(store.coopAct(G,{...first,requestId:'!bad'}),e=>e.code==='REQUEST_ID'));
  await unchanged(H,()=>assert.rejects(store.coopAct(G,{...first,requestId:'coop-invalid-turn-0005',turn:{actor:'COOP_1'}}),e=>e.code==='COOP_TURN'));
 });
 await check('a failed command-receipt insert rolls the host save back atomically and can be safely retried',async()=>{
  const body=command(H,G,'coop-atomic-0006',{bound:true});
  store.db.exec("CREATE TRIGGER test_coop_command_abort BEFORE INSERT ON coop_commands WHEN NEW.request_id='coop-atomic-0006' BEGIN SELECT RAISE(ABORT,'test receipt failure'); END;");
  await unchanged(H,()=>assert.rejects(store.coopAct(G,body),/test receipt failure/));
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM coop_commands WHERE request_id=?').get(body.requestId).n,0);
  store.db.exec('DROP TRIGGER test_coop_command_abort');const before=revision(H);await store.coopAct(G,body);assert.equal(revision(H),before+1);
 });
 await guestTurn(H,G);battleId=battle(H).id;
 const pendingId='coop-fix-pending-before-restart',pendingMora=rt(G).s.global.MORA;
 store.db.prepare("INSERT INTO coop_rewards(battle_id,account_id,host_id,room,payload,status,created_at) VALUES(?,?,?,?,?,'PENDING',?)").run(pendingId,G.id,H.id,roomId,JSON.stringify({battle:pendingId,room:roomId,host:H.display_name,hostPid:pidOf(H.id),char:'PLAYER_CUSTOM',name:G.display_name,xp:0,mora:123,loot:{},origin:'RANDOM'}),Date.now());
 const savedBeforeRestart=state(H);
 await check('restart and reopen restore the saved room ID, the guest view and the unchanged fight',async()=>{
  await restart();assert.equal(store.coopRooms().size,0);assert.equal(state(H),savedBeforeRestart);
  assert.equal(store.coopOpen(H,{visibility:'INVITE'}).room.id,roomId);assert.equal(state(H),savedBeforeRestart);
  // Room privacy still applies on recovery. Switching to public is an explicit host choice.
  assert.throws(()=>store.coopJoin(G,{room:roomId}),e=>e.status===403);
  store.coopOpen(H,{visibility:'PUBLIC'});store.coopJoin(G,{room:roomId});
  const status=await store.coopStatus(G);assert.equal(status.room.battle.shared,true);assert.equal(status.battle.battle,battleId);assert.equal(status.battle.turn.mine,true);assert.equal(state(H),savedBeforeRestart);
  assert.equal(rt(G).s.global.MORA-pendingMora,123);assert.equal(store.db.prepare('SELECT status FROM coop_rewards WHERE battle_id=?').get(pendingId).status,'PAID');
  await unchanged(H,async()=>assert.equal((await store.coopAct(G,first)).replayed,true));
  await unchanged(H,()=>assert.rejects(store.coopAct(G,{...first,card:'PLAYER_BASIC_GUARD'}),e=>e.code==='REQUEST_ID_REUSED'));
  const rev=revision(H);await store.coopAct(G,command(H,G,'coop-resume-0007',{bound:true}));assert.equal(revision(H),rev+1);
 });
 await check('a resumed guest remains eligible for the real battle reward and each reward is paid only once',async()=>{
  // Let the guest hand over a turn if needed, then resolve the real battle on the host's turn.
  for(let i=0;i<10&&battle(H).coop.turn;i++)await store.coopAutoTurn(G);
  assert(!battle(H).coop.turn);const before=rt(G).s.global.MORA;
  await edit(H,r=>{for(const foe of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))foe.hp=0;return [];});
  await act(H,'COMBAT',{card:'PLAYER_BASIC_GUARD'});await store.coopSettled();assert.equal(battle(H),null);
  const result=JSON.parse(rt(H).s.global.LAST_BATTLE_RESULT_JSON);assert.equal(result.battleId,battleId);assert.equal(result.coop.victory,true);assert.equal(result.coop.guests[0].left,false);
  assert.equal(rt(G).s.global.MORA-before,result.coop.mora);assert.equal(store.db.prepare('SELECT status FROM coop_rewards WHERE battle_id=? AND account_id=?').get(battleId,G.id).status,'PAID');
  const mora=rt(G).s.global.MORA;assert.deepEqual(await store.coopPay(G.id),[]);
  await unchanged(H,async()=>{const replay=await store.coopAct(G,first);assert.equal(replay.replayed,true);assert.equal(replay.battle,null);});
  await restart();assert.deepEqual(await store.coopPay(G.id),[]);assert.equal(rt(G).s.global.MORA,mora);assert.equal(store.db.prepare('SELECT count(*) AS n FROM coop_rewards WHERE status=\'PAID\'').get().n,2);
 });
 const H2=await player('coop_fix_host2');
 await check('old guest request IDs stay consumed after switching hosts and deleting the old host',async()=>{
  const other=store.coopOpen(H2,{}).room.id;store.coopJoin(G,{room:other});await begin(H2);await guestTurn(H2,G);
  await unchanged(H2,()=>assert.rejects(store.coopAct(G,first),e=>e.code==='REQUEST_ID_REUSED'));
  store.db.prepare('DELETE FROM accounts WHERE id=?').run(H.id);store.invalidate(H.id);
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM coop_commands WHERE account_id=? AND request_id=?').get(G.id,first.requestId).n,1);
  await unchanged(H2,()=>assert.rejects(store.coopAct(G,first),e=>e.code==='REQUEST_ID_REUSED'));
  // A legacy client without requestId can still act; it does not claim idempotent replay guarantees.
  const body=command(H2,G,'temporary-legacy');delete body.requestId;const before=revision(H2);await store.coopAct(G,body);assert.equal(revision(H2),before+1);
 });
 await check('a queued command is refused if the guest leaves before the host save lock becomes available',async()=>{
  await guestTurn(H2,G);const body=command(H2,G,'coop-left-while-queued',{bound:true});
  let release;const gate=new Promise(resolve=>{release=resolve;}),locked=store.serial(H2.id,()=>gate);
  const rejected=assert.rejects(store.coopAct(G,body),e=>e.code==='NO_ROOM');
  store.coopLeave(G);release();await locked;await rejected;await store.coopSettled();
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM coop_commands WHERE request_id=?').get(body.requestId).n,0);
  assert.equal(battle(H2).actors.find(a=>a.coop?.owner===pidOf(G.id)).coop.left,true,'the existing departure fallback continues safely');
 });
 console.log(JSON.stringify({ok:true,checks}));
}finally{await store.coopSettled();store.close();rmSync(dir,{recursive:true,force:true});}
