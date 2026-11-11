// Real process restarts and queued room changes against an isolated file-backed SQLite database.
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

if(process.argv[2]==='--worker'){
 const {LiveRegionStore}=await import('../server/fixed-region-live.mjs'),{AdminConsole}=await import('../server/admin-api.mjs');
 const {ENGINE_VERSION,ENGINE_FINGERPRINT}=await import('../server/generated/engine.mjs'),{pidOf}=await import('../server/social-v01415.mjs');
 const store=new LiveRegionStore(process.argv[3],{pepper:'coop-recovery-isolated-test'.padEnd(64,'x'),features:['chat','trade','coop']}),admin=new AdminConsole(store);
 const a=id=>store.account(id),rt=id=>store.runtimeOf(id),edit=(id,fn)=>admin.editSave(a(id),fn,'isolated process recovery fixture');let seq=0,releaseHold=null,holdDone=null;
 const action=(id,type,params={})=>store.action(a(id),{version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,revision:store.meta(id).revision,requestId:'recovery-host-'+process.pid+'-'+(++seq),type,params});
 const methods={
  async seed(){for(const id of ['recovery_host','recovery_guest']){store.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id,id,id,'salt','hash',Date.now());await store.newGame(a(id),{name:id,route:'ROUTE_TRAVELER'});await edit(id,r=>admin.applyOps(r,[{op:'level',target:'PLAYER_CUSTOM',value:10},{op:'teleport',map:'MAP_MOND_CITY'}]));}return {};},
  open:()=>store.coopOpen(a('recovery_host'),{}),join:({room})=>store.coopJoin(a('recovery_guest'),{room}),leave:()=>store.coopLeave(a('recovery_guest')),
  async begin(){await edit('recovery_host',r=>{r.coopContext=store.coopContextFor('recovery_host');try{if(r.s.runtime)r.finishBattle(true);r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';const group=r.rows('34_MAP_ENCOUNTER_POOL').find(x=>x[1]==='MAP_MOND_PLAINS')?.[5];assert(group);r.startBattle(group,'RANDOM');for(const foe of r.s.runtime.actors.filter(x=>x.side==='ENEMY')){foe.hp=foe.maxHp=100000;foe.atk=1;}}finally{r.coopContext=null;}});const b=rt('recovery_host').s.runtime;if(b.opening?.state==='PENDING')await action('recovery_host','COMBAT_BEGIN',{battle:b.id});return {};},
  async turn(){for(let n=0;n<40;n++){const b=rt('recovery_host').s.runtime;assert(b);if(b.coop?.turn?.owner===pidOf('recovery_guest'))return b.coop.turn;assert(!b.coop?.turn);await action('recovery_host','COMBAT',{card:'PLAYER_BASIC_GUARD'});}throw Error('guest turn not reached');},
  command:({requestId})=>{const view=store.coopBattleFor(store.coopRoomOf('recovery_guest'),rt('recovery_host'),'recovery_guest'),card=view.cards.find(x=>x.id==='PLAYER_BASIC_ATTACK'&&!x.reason);assert(card);return {requestId,card:card.id,target:card.targets[0]?.id,battle:view.battle,turn:{actor:view.turn.actor,deadline:view.turn.deadline,round:view.round}};},
  act:body=>store.coopAct(a('recovery_guest'),body),auto:()=>store.coopAutoTurn(a('recovery_guest')),autoHost:()=>store.coopAutoTurn(a('recovery_host')),close:()=>store.coopClose(a('recovery_host')),
  async hold(){let entered;const ready=new Promise(r=>entered=r),gate=new Promise(r=>releaseHold=r);holdDone=store.serial('recovery_host',()=>{entered();return gate;});await ready;return {};},
  async release(){releaseHold();await holdDone;await store.coopSettled();return {};},
  status:()=>store.coopStatus(a('recovery_guest')),
  snapshot:()=>{const host=rt('recovery_host'),guest=rt('recovery_guest');return {host:JSON.stringify(host.s),revision:store.meta('recovery_host').revision,battle:host.s.runtime?.id||null,mora:guest.s.global.MORA,guest:JSON.stringify(guest.s),roomCount:store.coopRooms().size,commands:store.db.prepare('SELECT request_id FROM coop_commands ORDER BY request_id').all(),rewards:store.db.prepare('SELECT battle_id,status FROM coop_rewards ORDER BY battle_id').all(),rewardReceipts:store.db.prepare("SELECT COUNT(*) n FROM receipts WHERE account_id='recovery_guest' AND request_id LIKE 'coop-reward-%'").get().n};},
  async winWithoutPayout(){for(let n=0;n<10&&rt('recovery_host').s.runtime?.coop?.turn;n++)await store.coopAutoTurn(a('recovery_guest'));assert(!rt('recovery_host').s.runtime.coop.turn);await edit('recovery_host',r=>{for(const foe of r.s.runtime.actors.filter(x=>x.side==='ENEMY'))foe.hp=0;});const after=store.coopAfter;store.coopAfter=()=>{};try{await action('recovery_host','COMBAT',{card:'PLAYER_BASIC_GUARD'});}finally{store.coopAfter=after;}return JSON.parse(rt('recovery_host').s.global.LAST_BATTLE_RESULT_JSON);},
  pay:()=>store.coopPay('recovery_guest'),
  failPayout:()=>{store.db.exec("CREATE TRIGGER recovery_payout_abort BEFORE INSERT ON receipts WHEN NEW.account_id='recovery_guest' AND NEW.request_id LIKE 'coop-reward-%' BEGIN SELECT RAISE(ABORT,'isolated payout interruption'); END;");return {};},
  allowPayout:()=>{store.db.exec('DROP TRIGGER recovery_payout_abort');return {};}
 };
 process.on('message',async message=>{try{if(!Object.hasOwn(methods,message.op))throw Error('unknown fixture operation');const result=await methods[message.op](message.body||{});process.send({id:message.id,result});}catch(error){process.send({id:message.id,error:{message:error.message,code:error.code,status:error.status}});}});
 process.send({ready:true});
}else{
 const dir=mkdtempSync(join(tmpdir(),'crpg-coop-process-')),db=join(dir,'save.sqlite');let worker=null,request=0;const checks=[];
 async function start(){const child=fork(fileURLToPath(import.meta.url),['--worker',db],{stdio:['ignore','pipe','pipe','ipc']}),pending=new Map();let output='';child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);const ready=new Promise((resolve,reject)=>{child.on('message',m=>{if(m.ready)return resolve();const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(Object.assign(new Error(m.error.message),m.error)):p.resolve(m.result);});child.on('exit',(code,signal)=>{const error=new Error('fixture process exited '+code+'/'+signal+' '+output);reject(error);for(const p of pending.values())p.reject(error);pending.clear();});});await ready;worker={child,call:(op,body)=>new Promise((resolve,reject)=>{const id=++request;pending.set(id,{resolve,reject});child.send({id,op,body});})};}
 const call=(...args)=>worker.call(...args);
 async function crash(){const child=worker.child,exit=once(child,'exit');child.kill('SIGKILL');await exit;worker=null;}
 async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
 try{
  await start();await call('seed');const room=(await call('open')).room.id;await call('join',{room});await call('begin');await call('turn');
  await check('a queued guest action is cancelled by leave/rejoin, even when the room and battle IDs match',async()=>{const command=await call('command',{requestId:'recovery-old-membership'});await call('hold');const attempt=call('act',command).then(result=>({result}),error=>({error}));await call('leave');await call('join',{room});await call('release');assert.equal((await attempt).error?.code,'NO_ROOM');assert(!(await call('snapshot')).commands.some(x=>x.request_id===command.requestId));});
  await call('turn');
  await check('a queued user auto-turn cannot act after the user leaves; internal departure fallback still proceeds',async()=>{await call('hold');const attempt=call('auto').then(result=>({result}),error=>({error}));await call('leave');await call('release');assert.equal((await attempt).error?.code,'NO_ROOM');const state=JSON.parse((await call('snapshot')).host);assert(state.runtime.actors.find(x=>x.coop)?.coop.left);});
  // A new battle gives the returning guest an eligible fighter after the deliberate departure above.
  await call('join',{room});await call('begin');await call('turn');
  await check('a queued host auto-turn cannot act in a closed and reopened room with the same persisted ID',async()=>{await call('hold');const attempt=call('autoHost').then(result=>({result}),error=>({error}));await call('close');assert.equal((await call('open')).room.id,room);await call('join',{room});await call('release');assert.equal((await attempt).error?.code,'NO_ROOM');});
  const oldCommand=await call('command',{requestId:'recovery-before-hard-restart'});await call('act',oldCommand);await call('turn');const before=await call('snapshot');
  await check('SIGKILL and a fresh process preserve the shared fight and old command receipt; host reopen restores its room ID',async()=>{await crash();await start();assert.equal((await call('snapshot')).roomCount,0);assert.equal((await call('snapshot')).host,before.host);assert.equal((await call('open')).room.id,room);await call('join',{room});const status=await call('status');assert.equal(status.battle.battle,before.battle);assert(status.battle.turn.mine);assert.equal((await call('act',oldCommand)).replayed,true);assert.equal((await call('snapshot')).host,before.host);});
  const beforeReward=await call('snapshot'),result=await call('winWithoutPayout');assert(result.coop.victory);assert(result.coop.mora>0);
  await check('a crash between battle commit and payout keeps a pending reward; failed payout commits neither save nor status',async()=>{const pending=await call('snapshot');assert.equal(pending.rewards.find(x=>x.battle_id===result.battleId).status,'PENDING');assert.equal(pending.mora,beforeReward.mora);await crash();await start();await call('failPayout');await assert.rejects(call('pay'),/isolated payout interruption/);const failed=await call('snapshot');assert.equal(failed.guest,beforeReward.guest);assert.equal(failed.rewards.find(x=>x.battle_id===result.battleId).status,'PENDING');await call('allowPayout');});
  await check('concurrent payout attempts and a second hard restart pay the durable battle reward exactly once',async()=>{const out=await Promise.all([call('pay'),call('pay'),call('pay')]);assert.equal(out.flat().length,1);const paid=await call('snapshot');assert.equal(paid.mora-beforeReward.mora,result.coop.mora);assert.equal(paid.rewardReceipts,beforeReward.rewardReceipts+1);assert.equal(paid.rewards.find(x=>x.battle_id===result.battleId).status,'PAID');await crash();await start();assert.deepEqual(await call('pay'),[]);assert.equal((await call('snapshot')).guest,paid.guest);});
  console.log(JSON.stringify({ok:true,checks}));
 }finally{if(worker)await crash();rmSync(dir,{recursive:true,force:true});}
}
