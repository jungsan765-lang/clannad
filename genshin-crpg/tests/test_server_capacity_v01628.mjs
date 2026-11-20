import assert from 'node:assert/strict';
import {LiveRegionStore} from '../server/fixed-region-live.mjs';
import {pidOf} from '../server/social-v01415.mjs';
import {splitState,publicParts,diffParts,wirePatch,publicWirePatch,applyParts,joinState} from '../server/state-parts.mjs';
const checks=[];
const check=async(name,fn)=>{await fn();checks.push(name);};
await check('optimized public delta matches original transport on 512 changes including private data, splices, Unicode and prototype-shaped keys',()=>{
 for(let i=0;i<512;i++){
  const before={global:{PRNG_STATE:i+1,MORA:i},processed:{privateReceipt:{secret:i}},log:Array.from({length:i%40},(_,j)=>({text:'전투 '+j,damage:j*2})),inventory:[{slot:1,item:'ING_APPLE',quantity:3}],other:{'이름😀':i,removed:i},removeMe:i};
  Object.defineProperty(before,'__proto__',{value:{constructor:'safe-'+i},enumerable:true,writable:true,configurable:true});
  const after=structuredClone(before);after.global.PRNG_STATE=i+123;after.global.MORA++;after.processed.privateReceipt.secret++;after.processed.newReceipt={secret:'never on wire'};
  after.log.push({text:'다음 공격',damage:i});if(i%3===0)after.log.shift();after.inventory[0].quantity--;delete after.other.removed;after.other['따옴표"와\\줄']=i;after.__proto__.constructor='next-'+i;
  if(i%2===0)delete after.removeMe;else after.newTop={a:i};
  const a=splitState(before),b=splitState(after),d=diffParts(a,b),patch=publicWirePatch(a,b,d),legacy=wirePatch(publicParts(a),publicParts(b));
  assert.deepEqual(patch,legacy);assert.deepEqual(applyParts(publicParts(a),patch),publicParts(b));
  assert.deepEqual(applyParts(b,d.undo),a);assert.equal(joinState(applyParts(publicParts(a),patch)).global.PRNG_STATE,1);
  assert.deepEqual(joinState(applyParts(publicParts(a),patch)).processed,{});
 }
});
await check('cache options are validated before opening SQLite',()=>{
 const pepper='capacity-new-contracts'.padEnd(64,'x');
 for(const runtimeCacheMax of [0,-1,129,1.5,NaN])assert.throws(()=>new LiveRegionStore(':memory:',{pepper,runtimeCacheMax}));
 for(const runtimeCacheIdleMs of [0,59999,3600001,NaN])assert.throws(()=>new LiveRegionStore(':memory:',{pepper,runtimeCacheIdleMs}));
});
const store=new LiveRegionStore(':memory:',{pepper:'capacity-new-contracts'.padEnd(64,'x'),runtimeCacheMax:2,runtimeCacheIdleMs:60000,features:['chat','trade','coop']});
try{
 await check('prepared SQL is reused, bounded, and reads current values rather than cached result rows',()=>{
  const one=store.prepare('SELECT ? AS value');assert.equal(store.prepare('SELECT ? AS value'),one);assert.equal(one.get(10).value,10);assert.equal(one.get(20).value,20);
  for(let i=0;i<256;i++)assert.equal(store.prepare('SELECT '+i+' AS value').get().value,i);
  assert.equal(store.statements.size,128);
  const before=store.statements.size;assert.throws(()=>store.prepare('not SQL'));assert.equal(store.statements.size,before);
 });
 let account,token,created;
 await check('a new signup appears immediately even while the PID index rebuild is throttled',async()=>{
  store.pidCache=new Map();store.pidBuilt=Date.now();
  const issued=await store.register({username:'capacity_pid_new',password:'local-only-capacity-password'},'local');
  const registered=store.account('capacity_pid_new');assert.equal(store.accountByPid(pidOf(registered.id)).id,registered.id);
  assert.equal(issued.account.id,registered.id);assert.equal(store.profile(registered,pidOf(registered.id)).name,'capacity_pid_new');
 });
 await check('authorization still rechecks session revocation while SQL statements are warm',async()=>{
  for(const id of ['capacity_owner','capacity_other'])store.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id,id,id,'unused','unused',Date.now());
  account=store.account('capacity_owner');const issued=await store.issue(account);token=issued.token;
  const auth=await store.auth(token);assert.equal((await store.auth(token)).a.id,account.id);store.logout(auth.th);
  await assert.rejects(store.auth(token),e=>e.status===401);token=(await store.issue(account)).token;
 });
 await check('one-time commit, encoded response bytes, replay and rejected-action rollback survive caching',async()=>{
  created=await store.newGame(account,{name:'capacity-owner',route:'ROUTE_TRAVELER'});
  const body={engineVersion:created.engineVersion,type:'MENU',params:{screen:'SYSTEM'},revision:0,requestId:'capacity-new-contract-action',responseMode:'state-parts-v1'};
  const out=await store.action(account,body);assert.equal(out.encoded,JSON.stringify(out.payload));assert.equal(out.timing.responseBytes,Buffer.byteLength(out.encoded));
  assert.deepEqual(joinState(applyParts(splitState(created.state),out.payload.statePatch)),store.me(account).state);
  const before=JSON.stringify(store.cache.get(account.id).r.s);
  await assert.rejects(store.action(account,{...body,revision:1,requestId:'capacity-new-contract-bad',params:{screen:'INVALID'}}),e=>e.outcome==='REJECTED');
  assert.equal(JSON.stringify(store.cache.get(account.id).r.s),before);assert.equal(store.meta(account.id).revision,1);
  const replay=await store.action(account,body);assert.equal(replay.payload.replayed,true);assert.equal(replay.payload.revision,1);
  assert.equal(store.prepare('SELECT COUNT(*) n FROM receipts').get().n,1);assert.equal(store.locks.size,0);assert.equal(store.db.isTransaction,false);
 });
 await check('LRU and idle cleanup release runtime references while durable saves, receipts, audits and active entries remain',async()=>{
  await store.newGame(store.account('capacity_other'),{name:'capacity-other',route:'ROUTE_TRAVELER'});
  const t=Date.now(),first=store.cache.get(account.id),other=store.cache.get('capacity_other');first.lastUsed=t-60000;other.lastUsed=t;
  store.honourCache=new Map([['old',{at:t-60000,value:{}}],['new',{at:t,value:{}}]]);
  const rows=store.prepare('SELECT COUNT(*) n FROM parts').get().n;store.pruneEphemeral(t);
  assert(!store.cache.has(account.id));assert(store.cache.has('capacity_other'));assert(!store.honourCache.has('old'));assert(store.honourCache.has('new'));
  assert.equal(store.prepare('SELECT COUNT(*) n FROM parts').get().n,rows);assert.equal(store.prepare('SELECT COUNT(*) n FROM receipts').get().n,1);
  const restored=store.me(account);assert.equal(restored.revision,1);assert.equal(restored.state.global.PLAYER_NAME,'capacity-owner');
  store.touch('third-local-entry',{revision:0,parts:new Map()});assert.equal(store.cache.size,2);assert(!store.cache.has('capacity_other'));
  assert.equal((await store.auth(token)).a.id,account.id);
 });
 console.log(JSON.stringify({ok:true,checks:checks.length,names:checks}));
}finally{store.close();assert.equal(store.cache.size,0);assert.equal(store.statements.size,0);}
