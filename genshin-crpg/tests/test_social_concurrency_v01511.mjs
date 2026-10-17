// Exercise real SQLite saves while intentionally holding an account's action lock.
import assert from 'node:assert/strict';
import {LiveRegionStore} from '../server/fixed-region-live.mjs';
import {AdminConsole} from '../server/admin-api.mjs';
import {pidOf,MARKET} from '../server/social-v01415.mjs';

const store=new LiveRegionStore(':memory:',{pepper:'social-concurrency-test'.padEnd(64,'x'),features:['chat','trade']}),admin=new AdminConsole(store);
const count=(a)=>store.runtimeOf(a.id).itemCount('ORE_CRYSTAL');
const snapshot=(a)=>({count:count(a),revision:store.meta(a.id).revision});
async function player(id){
 store.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id,id,id,'0'.repeat(64),'0'.repeat(64),Date.now());
 const a=store.account(id);await store.newGame(a,{name:id,route:'ROUTE_TRAVELER'});
 await admin.editSave(a,r=>{admin.applyOps(r,[{op:'level',target:'PLAYER_CUSTOM',value:10},{op:'teleport',map:'MAP_MOND_CITY'},{op:'item',id:'ORE_CRYSTAL',count:50}]);r.mailClaim('ALL');return [];},'isolated concurrency fixture');return a;
}
async function hold(id){
 let release,entered;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
 const done=store.serial(id,()=>{entered();return gate;});await ready;
 return async()=>{release();await done;};
}
try{
 const A=await player('concurrent_a'),B=await player('concurrent_b'),C=await player('concurrent_c');
 store.isOnline=id=>[A.id,B.id].includes(id);
 async function deal(){
  const id=store.dealInvite(A,{toPid:pidOf(B.id)}).deal.id;
  store.dealRespond(B,{id,accept:true});store.dealUpdate(A,{id,items:[{item:'ORE_CRYSTAL',qty:2}]});
  for(const a of [A,B])store.dealLock(a,{id,locked:true});
  await store.dealConfirm(A,{id});return id;
 }
 for(const change of ['cancel','offer','unlock']){
  const id=await deal(),before=[snapshot(A),snapshot(B)],release=await hold(A.id);
  const pending=store.dealConfirm(B,{id}),refused=assert.rejects(pending,e=>e.code==='DEAL_CHANGED');
  if(change==='cancel')store.dealCancel(A,{id});
  if(change==='offer')store.dealUpdate(A,{id,items:[{item:'ORE_CRYSTAL',qty:3}]});
  if(change==='unlock')store.dealLock(A,{id,locked:false});
  await release();await refused;
  assert.deepEqual([snapshot(A),snapshot(B)],before,'waiting confirmation must not commit after '+change);
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM deal_log WHERE id=?').get(id).n,0);
  if(change!=='cancel')store.dealCancel(A,{id});
  else assert.equal(store.deals.get(id).status,'CANCELLED');
  console.log('PASS pending trade respects '+change);
 }
 {
  const id=await deal(),before=[snapshot(A),snapshot(B)],release=await hold(A.id),pending=store.dealConfirm(B,{id});
  await assert.rejects(store.dealConfirm(A,{id}),e=>e.code==='DEAL_PENDING');
  await assert.rejects(store.dealConfirm(B,{id}),e=>e.code==='DEAL_PENDING');
  await release();assert.equal((await pending).deal.status,'DONE');
  assert.equal(count(A),before[0].count-2);assert.equal(count(B),before[1].count+2);
  for(const [i,a] of [A,B].entries())assert.equal(store.meta(a.id).revision,before[i].revision+1);
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM deal_log WHERE id=?').get(id).n,1);
  console.log('PASS simultaneous confirmations transfer once and keep DONE state');
 }
 {
  for(let i=0;i<MARKET.maxListings-1;i++)await store.marketSell(C,{entry:{item:'ORE_CRYSTAL',qty:1},price:100});
  const before=snapshot(C),release=await hold(C.id);
  const results=Promise.allSettled([store.marketSell(C,{entry:{item:'ORE_CRYSTAL',qty:1},price:100}),store.marketSell(C,{entry:{item:'ORE_CRYSTAL',qty:1},price:100})]);
  await release();const out=await results;
  assert.equal(out.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(out.find(x=>x.status==='rejected').reason.status,409);
  assert.equal(store.marketList(C,{seller:pidOf(C.id)}).total,MARKET.maxListings);
  assert.deepEqual(snapshot(C),{count:before.count-1,revision:before.revision+1});
  console.log('PASS concurrent listings respect the eight-item limit without extra deductions');
 }
}finally{await store.coopSettled?.();store.close();}
