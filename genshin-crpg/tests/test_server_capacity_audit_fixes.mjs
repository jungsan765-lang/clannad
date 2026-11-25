// Capacity regressions use real Node writable streams and an isolated SQLite database, never player accounts.
import assert from 'node:assert/strict';
import {PassThrough,Writable} from 'node:stream';
import {mock} from 'node:test';
import {LiveRegionStore} from '../server/fixed-region-live.mjs';
import {hash} from '../server/game-core.mjs';

const store=new LiveRegionStore(':memory:',{pepper:'capacity-audit-test'.padEnd(64,'x'),features:['chat']}),checks=[];
class SlowResponse extends Writable{
 constructor(){super({highWaterMark:64});this.chunks=[];this.pending=[];}
 _write(chunk,encoding,done){this.chunks.push(chunk.toString());this.pending.push(done);}
 release(){this.pending.shift()?.();}
}
const reading=()=>{const stream=new PassThrough(),chunks=[];stream.on('data',chunk=>chunks.push(chunk.toString()));stream.chunks=chunks;return stream;};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
try{
 const open=[];for(let i=0;i<8;i++){const res=reading();open.push({res,leave:store.subscribe({id:'one-account'},res)});}
 assert.throws(()=>store.subscribe({id:'one-account'},reading()),e=>e.status===429&&e.code==='STREAM_ACCOUNT_LIMIT');
 const other=reading(),leaveOther=store.subscribe({id:'another-account'},other);store.broadcast({type:'probe'});assert(other.chunks.some(x=>x.includes('probe')));
 open[0].res.destroy();await turn();const replacement=reading();store.subscribe({id:'one-account'},replacement);
 assert.equal(store.subscribers.size,9);store.closeStreams();assert.equal(store.subscribers.size,0);assert(replacement.destroyed);leaveOther();
 checks.push('one account cannot exhaust all 500 streams; another account remains live and closed slots are reusable');

 for(let i=0;i<500;i++)store.subscribe({id:'capacity-'+i},reading());
 assert.throws(()=>store.subscribe({id:'capacity-501'},reading()),e=>e.status===503);assert.equal(store.subscribers.size,500);store.closeStreams();
 checks.push('existing global connection ceiling remains enforced');

 const slow=new SlowResponse(),fast=reading();store.subscribe({id:'slow-reader'},slow);store.subscribe({id:'fast-reader'},fast);
 const messages=['첫'.repeat(30),'둘'.repeat(30),'셋'.repeat(30)];for(const text of messages)store.push(text);
 assert.deepEqual(slow.chunks,[messages[0]]);assert.deepEqual(fast.chunks,messages);assert.equal(slow.writableLength,90);
 slow.release();await turn();assert.deepEqual(slow.chunks,messages.slice(0,2));slow.release();await turn();assert.deepEqual(slow.chunks,messages);
 slow.release();await turn();assert.equal(slow.writableLength,0);assert.equal([...store.subscribers].find(s=>s.res===slow).queuedBytes,0);
 checks.push('backpressure queues ordered events outside the socket until drain without delaying other readers');

 store.push('가'.repeat(1000));for(let i=0;i<200;i++)store.push('나'.repeat(1000),s=>s.res===slow);
 assert(slow.destroyed);assert(![...store.subscribers].some(s=>s.res===slow));assert.equal(slow.listenerCount('drain'),0);assert.equal(slow.pending.length,1);
 store.broadcast({type:'still-live'},s=>s.res===fast);assert(fast.chunks.at(-1).includes('still-live'));store.closeStreams();
 checks.push('UTF-8 byte budget disconnects a stalled receiver before unbounded writes; listeners and queues are released');

 mock.timers.enable({apis:['setTimeout']});const stalled=new SlowResponse();store.subscribe({id:'stalled'},stalled);store.push('x'.repeat(100));
 mock.timers.tick(29999);assert(!stalled.destroyed);mock.timers.tick(1);assert(stalled.destroyed);assert.equal(store.subscribers.size,0);mock.timers.reset();
 const broken=reading();store.subscribe({id:'broken'},broken);broken.destroy(new Error('test socket failure'));await turn();assert.equal(store.subscribers.size,0);
 checks.push('a never-draining stream expires after 30 seconds and socket errors free their slots');

 const t=Date.now(),insertAccount=store.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)');
 for(const id of ['expired-account','active-account'])insertAccount.run(id,id,id,'salt','hash',t);
 const insertSession=store.db.prepare('INSERT INTO sessions VALUES(?,?,?)'),expiredToken='a'.repeat(64),activeToken='b'.repeat(64);
 insertSession.run(await hash(expiredToken),'expired-account',t-1);
 for(let i=0;i<1500;i++)insertSession.run('old-session-'+i,'expired-account',t-100-i);
 insertSession.run(await hash(activeToken),'active-account',t+60000);insertSession.run('older-active-account','active-account',t-10);
 // These durable rows must not participate in ephemeral retention.
 store.db.prepare('INSERT INTO metadata VALUES(?,?,?,?,?)').run('expired-account',1,1,'receipt-test',t-100000);
 store.db.prepare('INSERT INTO parts VALUES(?,?,?)').run('expired-account','["global","PLAYER_NAME"]','"지켜야 할 이름"');
 store.db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?,?,?)').run('expired-account','receipt-test',1,0,'digest','{}',t-100000);
 store.db.prepare('INSERT INTO admin_audit(actor,ip,op,detail,created_at) VALUES(?,?,?,?,?)').run('test','local','retention-test','{}',t-100000);
 store.rates.set('expired-key',{count:999,until:t});store.rates.set('live-key',{count:2,until:t+60000});
 store.pruneEphemeral(t);assert.equal(store.db.prepare('SELECT COUNT(*) n FROM sessions').get().n,503);assert(!store.rates.has('expired-key'));assert.equal(store.rates.get('live-key').count,2);
 store.pruneEphemeral(t);assert.equal(store.db.prepare('SELECT COUNT(*) n FROM sessions').get().n,2);assert.equal(store.db.prepare('SELECT MAX(expires_at) n FROM sessions WHERE account_id=?').get('expired-account').n,t-1);
 await assert.rejects(store.auth(expiredToken),e=>e.status===401);assert.equal((await store.auth(activeToken)).a.id,'active-account');
 assert.equal(store.db.prepare('SELECT COUNT(*) n FROM receipts').get().n,1);assert.equal(store.db.prepare('SELECT COUNT(*) n FROM parts').get().n,1);assert.equal(store.db.prepare('SELECT COUNT(*) n FROM admin_audit').get().n,1);
 checks.push('bounded expiry sweeps preserve live sessions, last-login dates, active rate limits and all durable save/audit receipts');

 mock.timers.enable({apis:['setInterval','Date'],now:Date.now()});
 const life=new LiveRegionStore(':memory:',{pepper:'stream-session-lifetime'.padEnd(64,'x'),features:['chat']});
 try{
  for(const id of ['stream-owner','deleted-owner'])life.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id,id,id,'salt','hash',Date.now());
  const owner=life.account('stream-owner');
  const connect=async(a)=>{const issued=await life.issue(a),session=await life.auth(issued.token),res=reading();life.subscribe(a,res,session);return {res,session,token:issued.token};};
  const tabA=await connect(owner),sameSessionTab=reading();life.subscribe(owner,sameSessionTab,tabA.session);const deviceB=await connect(owner);
  life.logout(tabA.session.th);assert(tabA.res.destroyed);assert(sameSessionTab.destroyed);assert(!deviceB.res.destroyed);
  await assert.rejects(life.auth(tabA.token),e=>e.status===401);assert.equal((await life.auth(deviceB.token)).a.id,owner.id);
  const revoked=await connect(owner),deleted=await connect(life.account('deleted-owner'));
  life.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(revoked.session.th);life.db.prepare('DELETE FROM accounts WHERE id=?').run('deleted-owner');
  mock.timers.tick(24999);assert(!revoked.res.destroyed);assert(!deleted.res.destroyed);mock.timers.tick(1);assert(revoked.res.destroyed);assert(deleted.res.destroyed);assert(!deviceB.res.destroyed);
  const expires=Date.now()+25000;life.db.prepare('UPDATE sessions SET expires_at=? WHERE token_hash=?').run(expires,deviceB.session.th);
  mock.timers.tick(24999);assert(!deviceB.res.destroyed);mock.timers.tick(1);assert(deviceB.res.destroyed);
  const renewed=await connect(owner);mock.timers.tick(25000);assert(!renewed.res.destroyed);assert.equal((await life.auth(renewed.token)).a.id,owner.id);
  assert(!JSON.stringify([...life.subscribers].map(s=>({account:s.account,sessionHash:s.sessionHash,expiresAt:s.expiresAt}))).includes(renewed.token));
 }finally{life.close();mock.timers.reset();}
 checks.push('logout closes only its session tabs immediately; heartbeat closes revoked/deleted/expired sessions within 25 seconds, leaving renewed sessions valid');
 console.log(JSON.stringify({ok:true,checks}));
}finally{mock.timers.reset();store.close();}
