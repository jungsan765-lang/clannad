// Local-only capacity evidence. Separate server/client processes avoid sharing their event loop.
// Measures response BODY bytes (not TLS/network headers), RSS and event-loop delay; these are not VPS benchmarks.
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {request as httpRequest} from 'node:http';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir,cpus} from 'node:os';
import {fileURLToPath} from 'node:url';

const script=fileURLToPath(import.meta.url),mode=process.argv[2];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
if(mode==='--lock'){
 const {DatabaseSync}=await import('node:sqlite'),db=new DatabaseSync(process.argv[3]);
 db.exec('BEGIN IMMEDIATE');process.send({ready:true});
 process.once('message',()=>{db.exec('ROLLBACK');db.close();process.disconnect();});
}else if(mode==='--server'){
 const {startLiveRegionStaging}=await import('../server/fixed-region-live.mjs');
 const {monitorEventLoopDelay}=await import('node:perf_hooks');
 const {pidOf}=await import('../server/social-v01415.mjs');
 const app=await startLiveRegionStaging({dbPath:process.argv[3],pepper:'local-load-boundary-only'.padEnd(64,'x'),features:['chat','trade','coop']});
 const histogram=monitorEventLoopDelay({resolution:10});histogram.enable();
 let measured={started:performance.now(),requests:0,responseBodyBytes:0,paths:{},maxQueuedBytes:0};
 const byteLength=(chunk,encoding)=>typeof chunk==='string'?Buffer.byteLength(chunk,typeof encoding==='string'?encoding:undefined):chunk?.byteLength||0;
 app.server.prependListener('request',(req,res)=>{
  measured.requests++;measured.paths[req.url]=(measured.paths[req.url]||0)+1;
  const write=res.write,end=res.end;
  res.write=function(chunk,encoding){measured.responseBodyBytes+=byteLength(chunk,encoding);return write.apply(this,arguments);};
  res.end=function(chunk,encoding){measured.responseBodyBytes+=byteLength(chunk,encoding);return end.apply(this,arguments);};
 });
 const memory=()=>({rssMiB:Math.round(process.memoryUsage().rss/104857.6)/10,heapMiB:Math.round(process.memoryUsage().heapUsed/104857.6)/10,processPeakRssMiB:Math.round(process.resourceUsage().maxRSS/102.4)/10});
 const methods={
  async seed(){
   const tokens=[];
   for(let i=0;i<101;i++){const id='load_account_'+i;app.store.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id,id,id,'salt','hash',Date.now());const a=app.store.account(id),issued=await app.store.issue(a);tokens.push(issued.token);}
   const created=await app.store.newGame(app.store.account('load_account_0'),{name:'격리된 검사 저장',route:'ROUTE_TRAVELER'});
   return {tokens,pids:Array.from({length:101},(_,i)=>pidOf('load_account_'+i)),engineVersion:created.engineVersion,version:created.version,revision:created.revision};
  },
  async moreJourneys(){for(let i=1;i<25;i++)await app.store.newGame(app.store.account('load_account_'+i),{name:'local-save-'+i,route:'ROUTE_TRAVELER'});return {};},
  reset(){histogram.reset();measured={started:performance.now(),requests:0,responseBodyBytes:0,paths:{},maxQueuedBytes:0};return {};},
  profilePurity(){const id='load_account_24',owner=app.store.account(id);app.store.me(owner);app.store.profileCache.delete(id);const entry=app.store.cache.get(id),before=JSON.stringify(entry.r.s),revision=app.store.meta(id).revision,out=app.store.profile(app.store.account('load_account_0'),pidOf(id));assert.equal(JSON.stringify(entry.r.s),before,'public profile must not mutate the authoritative warm runtime');assert.equal(app.store.meta(id).revision,revision);assert.equal(out.player.name,'local-save-24');for(const hidden of ['password_hash','salt','PRNG_STATE','SAVE_ID','PLAYER_NAME','username'])assert(!JSON.stringify(out).includes('\"'+hidden+'\"'));return {unchanged:true};},
  async profileContracts(){
   const store=app.store,id='load_account_24',owner=store.account(id),viewer=store.account('load_account_99'),buyer=store.account('load_account_23'),card=()=>store.profile(viewer,pidOf(id)),checks=[];
   const original=card();original.player.name='changed outside cache';original.party.length=0;assert.equal(card().player.name,'local-save-24');assert(card().party.some(x=>x.id==='PLAYER_CUSTOM'));checks.push('returned public DTOs do not share mutable objects with the cache');
   const warm=store.cache.get(id).r,before=JSON.stringify(warm.s),revision=store.meta(id).revision,seasonNow=store.seasonNow,S=globalThis.CRPGRuntime.abyssSeason,next=S.next(seasonNow.call(store)),future=S.start(next)+86400000;
   // Advance only this store's season view and one runtime clock, never global Date.now or HTTP timers.
   try{store.seasonNow=()=>next;warm.abyssNow=()=>future;assert.equal(card().abyss.season,next);assert.equal(store.profileCache.get(id).season,next);}finally{store.seasonNow=seasonNow;delete warm.abyssNow;store.profileCache.delete(id);}
   assert.equal(JSON.stringify(warm.s),before);assert.equal(store.meta(id).revision,revision);checks.push('month changes refresh the card without writing the warm save');
   const body={version:store.output(owner,store.meta(id),store.loadParts(id)).version,engineVersion:store.output(owner,store.meta(id),store.loadParts(id)).engineVersion,type:'MENU',params:{screen:'SYSTEM'},revision,requestId:'local-profile-revision',responseMode:'state-parts-v1'};
   card();await store.action(owner,body);assert.equal(store.meta(id).revision,revision+1);card();assert.equal(store.profileCache.get(id).revision,revision+1);checks.push('normal action revisions refresh cached public cards');
   await app.adminConsole.profile({id,displayName:'바뀐 모험가'},'local','local');
   const edit=(account,ops)=>app.adminConsole.editSave(account,r=>{const result=app.adminConsole.applyOps(r,ops);if(r.s.mail?.list.some(x=>x.kind==='GIFT'&&!x.claimed))r.mailClaim('ALL');return result;},'local isolated fixture');
   await edit(owner,[{op:'level',target:'PLAYER_CUSTOM',value:12},{op:'recruit',char:'MOND_AMBER'},{op:'teleport',map:'MAP_MOND_CITY'},{op:'item',id:'ING_APPLE',count:2}]);
   await edit(buyer,[{op:'level',target:'PLAYER_CUSTOM',value:10},{op:'teleport',map:'MAP_MOND_CITY'},{op:'currency',key:'MORA',mode:'set',value:10000}]);
   const changed=card();assert.equal(changed.name,'바뀐 모험가');assert.equal(changed.player.name,'바뀐 모험가');assert.equal(changed.player.level,12);assert(changed.companions.some(x=>x.id==='MOND_AMBER'&&x.name==='엠버'));checks.push('admin name, level and companion portrait IDs stay current');
   const listing=(await store.marketSell(owner,{entry:{item:'ING_APPLE',qty:1},price:1000})).listing;assert.equal(card().listings,1);const cachedSeller=store.profileCache.get(id),sellerRevision=store.meta(id).revision;
   await store.marketBuy(buyer,{id:listing.id,price:1000});assert.equal(store.meta(id).revision,sellerRevision);assert.equal(card().listings,0);assert.equal(store.profileCache.get(id),cachedSeller);checks.push('sold listings update even while seller revision and public card cache stay unchanged');
   assert.equal(card().you,false);assert.equal(store.profile(owner,pidOf(id)).you,true);assert.equal(card().online,true);store.closeStreams(s=>s.account===id);assert.equal(card().online,false);checks.push('viewer identity and online state stay live outside the public card cache');
   return {checks};
  },
  gc(){assert.equal(typeof global.gc,'function');global.gc();global.gc();return {};},
  stats(){return {...measured,elapsedMs:Math.round(performance.now()-measured.started),...memory(),eventLoopP95Ms:Math.round(histogram.percentile(95)/1e4)/100,eventLoopMaxMs:Math.round(histogram.max/1e4)/100,streams:app.store.subscribers.size,locks:app.store.locks.size,transaction:app.store.db.isTransaction,runtimeCache:app.store.cache.size,profileCache:app.store.profileCache?.size||0,profileCacheBytes:Buffer.byteLength(JSON.stringify([...app.store.profileCache?.values()||[]].map(x=>x.data||null))),profileRuntimeObjects:[...app.store.profileCache?.values()||[]].filter(x=>x.r).length,retainedRuntimeObjects:new Set([...app.store.cache.values(),...app.store.profileCache?.values()||[]].map(x=>x.r).filter(Boolean)).size};},
  broadcast({count=20,bytes=400}){for(let i=0;i<count;i++)app.store.broadcast({type:'local-load',seq:i,pad:'x'.repeat(bytes)});return {};},
  async slowBurst(){
   let sent=0;
   for(let i=0;i<512;i++){
    const before=[...app.store.subscribers].find(s=>s.account==='load_account_100');if(!before)break;
    app.store.broadcast({type:'local-slow',seq:i,pad:'x'.repeat(16384)},s=>s.account==='load_account_100');sent++;
    const current=[...app.store.subscribers].find(s=>s.account==='load_account_100');
    if(current)measured.maxQueuedBytes=Math.max(measured.maxQueuedBytes,current.queuedBytes+(current.res.writableLength||0));
    await new Promise(setImmediate);
   }
   app.store.broadcast({type:'local-load',seq:999});return {sent,slowPresent:[...app.store.subscribers].some(s=>s.account==='load_account_100')};
  },
  saved(){return {revision:app.store.meta('load_account_0').revision,locks:app.store.locks.size,transaction:app.store.db.isTransaction,receipts:app.store.db.prepare("SELECT request_id FROM receipts WHERE account_id='load_account_0' ORDER BY request_id").all()};},
  async shutdown(){histogram.disable();await app.store.coopSettled();await app.close();return {closed:true};}
 };
 process.on('message',async m=>{try{const result=await methods[m.op](m.body||{});process.send({id:m.id,result},()=>{if(m.op==='shutdown')process.disconnect();});}catch(e){process.send({id:m.id,error:{message:e.message,code:e.code}});}});
 process.send({ready:true,base:'http://127.0.0.1:'+app.address.port,...memory()});
}else{
 const dir=mkdtempSync(join(tmpdir(),'crpg-load-boundary-')),db=join(dir,'isolated.sqlite'),evidence=[],streams=[];
 let server=null,locker=null,sequence=0,requestId=0,settings=null;
 async function child(kind){
  const process=fork(script,[kind,db],{stdio:['ignore','ignore','pipe','ipc'],execArgv:['--expose-gc']}),pending=new Map();let errors='';process.stderr.on('data',x=>errors+=x);
  const ready=await new Promise((resolve,reject)=>{
   process.on('error',reject);process.on('message',m=>{if(m.ready)return resolve(m);const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(Object.assign(new Error(m.error.message),m.error)):p.resolve(m.result);});
   process.on('exit',(code,signal)=>{const error=new Error('isolated child exited '+code+'/'+signal+' '+errors);reject(error);for(const p of pending.values())p.reject(error);pending.clear();});
  });
  return {process,ready,call:(op,body)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});process.send({id,op,body});})};
 }
 const call=(...args)=>server.call(...args);
 async function until(test,message,timeout=10000){const end=performance.now()+timeout;while(performance.now()<end){if(await test())return;await delay(20);}throw Error(message);}
 async function openStream(index,{paused=false}={}){
  return new Promise((resolve,reject)=>{
   const events=[],record={events,bytes:0,pings:0,closed:false,req:null,res:null};let buffer='';
   const req=httpRequest(server.ready.base+'/chat/stream',{headers:{authorization:'Bearer '+settings.tokens[index]}},res=>{
    if(res.statusCode!==200){res.resume();return reject(Error('stream status '+res.statusCode));}
    record.res=res;
    res.on('data',chunk=>{record.bytes+=chunk.length;buffer+=chunk.toString();let end;while((end=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,end);buffer=buffer.slice(end+2);if(block===': ping')record.pings++;const data=block.split('\n').find(line=>line.startsWith('data: '));if(data)events.push(JSON.parse(data.slice(6)));}});
    res.on('error',()=>{});res.on('close',()=>record.closed=true);if(paused)res.pause();resolve(record);
   });
   record.req=req;req.on('error',error=>{if(!record.res)reject(error);});req.end();streams.push(record);
  });
 }
 function closeStreams(){for(const record of streams.splice(0)){record.res?.destroy();record.req.destroy();}}
 async function api(path,{body,token=settings?.tokens[0]}={}){
  const start=performance.now(),response=await fetch(server.ready.base+path,{method:body===undefined?'GET':'POST',headers:{...(token?{authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)}),text=await response.text();return {status:response.status,json:JSON.parse(text),bytes:Buffer.byteLength(text),elapsedMs:Math.round(performance.now()-start)};
 }
 const command=revision=>({version:settings.version,engineVersion:settings.engineVersion,type:'MENU',params:{screen:'SYSTEM'},revision,requestId:'local-load-boundary-'+(++requestId),responseMode:'state-parts-v1'});
 const record=async(name,extra={})=>{const data={name,...extra,...await call('stats')};delete data.started;evidence.push(data);console.log(JSON.stringify(data));};
 async function stopChild(item,hard=false){if(!item)return;const exited=once(item.process,'exit');if(hard)item.process.kill('SIGKILL');else item.process.send({release:true});await exited;}
 try{
  server=await child('--server');settings=await call('seed');
  if(mode!=='--cache-only'){
  for(const count of [5,25,100]){
   await call('reset');const group=await Promise.all(Array.from({length:count},(_,i)=>openStream(i)));
   assert.equal((await call('stats')).streams,count);await call('broadcast',{count:20,bytes:400});
   await until(()=>group.every(x=>x.events.length===20),'all healthy subscribers receive the bounded broadcast');
   for(const stream of group)assert.deepEqual(stream.events.map(x=>x.seq),Array.from({length:20},(_,i)=>i));
   const health=await api('/health');assert.equal(health.status,200);await record('healthy_sse_'+count,{connections:count,eventsPerConnection:20,receivedBodyBytes:group.reduce((n,x)=>n+x.bytes,0),healthMs:health.elapsedMs});
   if(count===100){
    await call('reset');const bytes=group.reduce((n,x)=>n+x.bytes,0),pings=group.reduce((n,x)=>n+x.pings,0);await delay(60000);
    const stats=await call('stats');assert.equal(stats.requests,0);assert.equal(stats.streams,100);
    const heartbeatCount=group.reduce((n,x)=>n+x.pings,0)-pings;assert(heartbeatCount>=200&&heartbeatCount<=300);
    await record('idle_60_seconds_100_sse',{connections:100,receivedBodyBytes:group.reduce((n,x)=>n+x.bytes,0)-bytes,heartbeatCount});
   }
   closeStreams();await until(async()=>(await call('stats')).streams===0,'closed streams release server slots');
  }
  await call('reset');const fast=await openStream(0),slow=await openStream(100,{paused:true}),burst=await call('slowBurst');
  assert.equal(burst.slowPresent,false,'a paused real TCP reader eventually reaches bounded backpressure');assert(burst.sent<=512);
  await until(()=>fast.events.some(x=>x.seq===999),'slow connection cannot block a healthy subscriber');
  const slowStats=await call('stats');assert(slowStats.maxQueuedBytes<=128*1024);assert.equal(slowStats.streams,1);
  await record('paused_tcp_reader',{burstEvents:burst.sent,healthyEventReceived:true,pausedClientReceivedBodyBytes:slow.bytes});
  closeStreams();await until(async()=>(await call('stats')).streams===0,'slow-reader teardown');

  // A burst of duplicate requests represents lost responses/reconnects, not a normal player's click rate.
  await call('reset');let saved=await call('saved');const duplicate=command(saved.revision),responses=await Promise.all(Array.from({length:100},()=>api('/game/action',{body:duplicate})));
  assert(responses.every(x=>x.status===200));assert.equal(responses.filter(x=>x.json.replayed).length,99);saved=await call('saved');assert.equal(saved.revision,duplicate.revision+1);assert.equal(saved.receipts.filter(x=>x.request_id===duplicate.requestId).length,1);assert.equal(saved.locks,0);assert.equal(saved.transaction,false);
  await record('100_duplicate_action_requests',{responses:100,applied:1,replays:99,totalReceivedBodyBytes:responses.reduce((n,x)=>n+x.bytes,0),maxResponseMs:Math.max(...responses.map(x=>x.elapsedMs))});

  // A separate SQLite writer holds a lock past busy_timeout. The failed request must leave no permanent lock or receipt.
  await call('reset');locker=await child('--lock');const blocked=command(saved.revision),blockedRequest=api('/game/action',{body:blocked});await delay(100);const healthRequest=api('/health');
  const rejected=await blockedRequest,health=await healthRequest;assert.equal(rejected.status,500);assert.equal(health.status,200);assert(rejected.elapsedMs>=4500);
  await stopChild(locker);locker=null;const afterFailure=await call('saved');assert.equal(afterFailure.revision,saved.revision);assert.equal(afterFailure.locks,0);assert.equal(afterFailure.transaction,false);assert(!afterFailure.receipts.some(x=>x.request_id===blocked.requestId));
  // Same request ID is intentionally retried only after proving the first transaction never began.
  const recovered=await api('/game/action',{body:blocked});assert.equal(recovered.status,200);const afterRecovery=await call('saved');assert.equal(afterRecovery.revision,saved.revision+1);assert.equal(afterRecovery.receipts.filter(x=>x.request_id===blocked.requestId).length,1);
  await record('external_sqlite_write_lock_recovery',{blockedResponseMs:rejected.elapsedMs,parallelHealthMs:health.elapsedMs,recoveryMs:recovered.elapsedMs,commitsAfterRecovery:1});

  }
  const mixed=await Promise.all(Array.from({length:100},(_,i)=>openStream(i)));await call('moreJourneys');await call('reset');
  const cold=[];for(let i=0;i<25;i++){const out=await api('/profile?pid='+settings.pids[i]);assert.equal(out.status,200);assert.equal(out.json.journey,true);cold.push(out);}
  const coldStats=await call('stats');assert(coldStats.runtimeCache<=16);assert(coldStats.profileCache<=24);assert.equal(coldStats.profileRuntimeObjects,0);assert(coldStats.retainedRuntimeObjects<=16);assert(coldStats.profileCacheBytes<1024*1024);
  await record('25_saved_journeys_profile_cache',{profiles:25,connections:mixed.length,maxResponseMs:Math.max(...cold.map(x=>x.elapsedMs)),totalReceivedBodyBytes:cold.reduce((n,x)=>n+x.bytes,0)});
  await call('reset');const warm=[];for(let i=0;i<10;i++)warm.push(await api('/profile?pid='+settings.pids[24]));assert(warm.every(x=>x.status===200));
  await record('10_repeated_cached_profiles',{profiles:10,maxResponseMs:Math.max(...warm.map(x=>x.elapsedMs)),totalReceivedBodyBytes:warm.reduce((n,x)=>n+x.bytes,0)});

  await call('profilePurity');await call('gc');await record('retained_caches_after_explicit_gc',{profileReadsPreserveWarmSave:true});
  const profileContracts=await call('profileContracts');console.log(JSON.stringify({name:'profile_cache_contracts',...profileContracts}));
  closeStreams();await until(async()=>(await call('stats')).streams===0,'mixed load streams release slots');
  const exit=once(server.process,'exit');await call('shutdown');await exit;server=null;rmSync(dir,{recursive:true,force:true});assert.equal(existsSync(dir),false);
  console.log(JSON.stringify({ok:true,scope:'local isolated Node processes only; not a VPS capacity claim',environment:{node:process.version,arch:process.arch,logicalCpus:cpus().length},childProcessesExited:true,tempDatabaseRemoved:true,evidence}));
 }finally{closeStreams();if(locker)await stopChild(locker,true);if(server)await stopChild(server,true);rmSync(dir,{recursive:true,force:true});}
}
