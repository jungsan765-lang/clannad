// Isolated real HTTP/SQLite benchmark. Never point this tool at an installed server.
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {request as httpRequest} from 'node:http';
import {mkdtempSync,rmSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir,cpus} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {splitState,joinState,applyParts,publicParts} from '../server/state-parts.mjs';

const script=fileURLToPath(import.meta.url);
const arg=(name,fallback)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.split('=').slice(1).join('=')??fallback;
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const memory=()=>({rssMiB:process.memoryUsage().rss/1048576,heapMiB:process.memoryUsage().heapUsed/1048576,peakRssMiB:process.resourceUsage().maxRSS/1024});
if(process.argv[2]==='--server'){
 const {startLiveRegionStaging}=await import('../server/fixed-region-live.mjs');
 const {monitorEventLoopDelay}=await import('node:perf_hooks');
 const engine=await import('../server/generated/engine.mjs'),identity={version:engine.ENGINE_VERSION,engineVersion:engine.ENGINE_FINGERPRINT,serverBuild:engine.SERVER_BUILD};
 const app=await startLiveRegionStaging({dbPath:process.argv[3],pepper:'isolated-capacity-v01628'.padEnd(64,'x'),features:['chat','trade','coop']});
 const histogram=monitorEventLoopDelay({resolution:10});histogram.enable();
 let builds=0,buildMs=0,started=0,cpu=null;
 const factory=app.store.runtimeFactory;
 app.store.runtimeFactory=function(...args){const t=performance.now();try{return factory.apply(this,args);}finally{builds++;buildMs+=performance.now()-t;}};
 const methods={
  async seed({count,workload}){
   const r=app.store.runtimeFactory();r.newGame({name:'capacity-fixture',route:'ROUTE_TRAVELER',seed:12345,saveId:'capacity-fixture'});
   Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:'MAP_MOND_CITY',STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION'});
   delete r.s.storyJourney;delete r.s.storyBreak;r.s.storyContext=null;r.s.tutorial={version:2,completed:true,step:'DONE'};
   r.prepareStory?.();
   let command={type:'MENU',params:{screen:'SYSTEM'}};
   if(workload==='combat'){
    r.adminApply({op:'level',target:'PLAYER_CUSTOM',value:20});
    for(const char of ['MOND_AMBER','MOND_KAEYA','MOND_LISA']){r.adminApply({op:'recruit',char});r.adminApply({op:'level',target:char,value:20});}
    for(const[slot,char]of ['MOND_AMBER','MOND_KAEYA','MOND_LISA'].entries())r.setParty(char,slot+2);
    // A real repeatable field battle. Fixture preparation is excluded from timings.
    const group=r.rows('33_ENCOUNTER_GROUP_DB').find(x=>String(x[0]).includes('CRYO_REGISVINE'))||r.rows('33_ENCOUNTER_GROUP_DB').find(x=>String(x[0]).includes('REGISVINE'));
    assert(group,'current database has a field-boss encounter');r.startBattle(group[0],'EXPLICIT');
    if(r.combatOpening()?.pending)r.action('COMBAT_BEGIN',{});
    const card=r.combatCards().find(c=>c.id==='PLAYER_BASIC_GUARD'&&!c.reason);
    assert(card,'real battle is waiting for the protagonist');command={type:'COMBAT',params:{card:card.id,target:card.targets[0]?.id}};
   }
   const tokens=[],states=[],t=Date.now();
   app.store.db.exec('BEGIN IMMEDIATE');
   try{
    const account=app.store.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)'),meta=app.store.db.prepare('INSERT INTO metadata VALUES(?,?,?,?,?)'),insert=app.store.db.prepare('INSERT INTO parts VALUES(?,?,?)');
    for(let i=0;i<count;i++){
     const id='capacity_'+i,state=structuredClone(r.s);state.global.SAVE_ID='capacity-save-'+i;state.global.PLAYER_NAME='capacity-'+i;
     account.run(id,id,state.global.PLAYER_NAME,'unused-local-fixture','unused-local-fixture',t);meta.run(id,0,1,'FIXTURE',t);
     const parts=splitState(state);for(const[path,value]of parts)insert.run(id,path,value);states.push(joinState(publicParts(parts)));
    }
    app.store.db.exec('COMMIT');
   }catch(e){app.store.db.exec('ROLLBACK');throw e;}
   for(let i=0;i<count;i++)tokens.push((await app.store.issue(app.store.account('capacity_'+i))).token);
   app.store.cache.clear();global.gc?.();return {tokens,states,command,...identity};
  },
  reset(){histogram.reset();builds=0;buildMs=0;cpu=process.cpuUsage();started=performance.now();return {};},
  stats(){global.gc?.();const c=process.cpuUsage(cpu);return {elapsedMs:performance.now()-started,cpuMs:(c.user+c.system)/1000,builds,buildMs,cacheEntries:app.store.cache.size,...memory(),eventLoopP95Ms:histogram.percentile(95)/1e6,eventLoopMaxMs:histogram.max/1e6};},
  verify(){
   const rows=app.store.db.prepare('SELECT account_id,revision FROM metadata ORDER BY account_id').all();
   const states=rows.map(x=>({id:x.account_id,revision:x.revision,state:joinState(publicParts(app.store.loadParts(x.account_id)))}));
   const receipts=app.store.db.prepare('SELECT account_id,request_id,revision,base_revision,intent_hash,result FROM receipts ORDER BY account_id,request_id').all();
   assert.equal(app.store.locks.size,0);assert.equal(app.store.db.isTransaction,false);
   return {states,receipts,digest:digest({states,receipts})};
  },
  async shutdown(){histogram.disable();await app.store.coopSettled();await app.close();return {};}
 };
 process.on('message',async m=>{try{const result=await methods[m.op](m.body||{});process.send({id:m.id,result},()=>{if(m.op==='shutdown')process.disconnect();});}catch(e){process.send({id:m.id,error:e.stack});}});
 process.send({ready:true,base:'http://127.0.0.1:'+app.address.port,...memory()});
}else{
 const counts=arg('accounts','16,32,64').split(',').map(Number),rounds=Number(arg('rounds','4')),concurrency=Number(arg('concurrency','8')),workloads=arg('workloads','menu,combat').split(','),output=arg('output',''),heapMiB=Number(arg('heap-mib','0'));
 assert(counts.every(n=>Number.isInteger(n)&&n>0&&n<=256));assert(rounds>0&&rounds<=20);assert(concurrency>0&&concurrency<=64);
 assert(Number.isSafeInteger(heapMiB)&&(heapMiB===0||heapMiB>=64&&heapMiB<=4096));
 const evidence=[];
 for(const workload of workloads)for(const count of counts){
  const dir=mkdtempSync(join(tmpdir(),'crpg-capacity-')),child=fork(script,['--server',join(dir,'isolated.sqlite')],{stdio:['ignore','ignore','pipe','ipc'],execArgv:['--expose-gc',...(heapMiB?['--max-old-space-size='+heapMiB]:[])]});
  let seq=0,stderr='',healthy=0;const pending=new Map();child.stderr.on('data',x=>stderr+=x);
  const ready=await new Promise((ok,bad)=>{child.on('error',bad);child.on('message',m=>{if(m.ready)return ok(m);const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.bad(Error(m.error)):p.ok(m.result);});child.on('exit',code=>{const error=Error('server exited '+code+' '+stderr);bad(error);for(const p of pending.values())p.bad(error);pending.clear();});});
  const call=(op,body)=>new Promise((ok,bad)=>{const id=++seq;pending.set(id,{ok,bad});child.send({id,op,body});});
  const streams=[];
  try{
   const settings=await call('seed',{count,workload}),states=settings.states.map(splitState),revisions=Array(count).fill(0),latencies=[],timings=[],bodies=[];
   for(let i=0;i<count;i++)await new Promise((ok,bad)=>{const req=httpRequest(ready.base+'/chat/stream',{headers:{authorization:'Bearer '+settings.tokens[i]}},res=>{assert.equal(res.statusCode,200);res.on('data',()=>{});res.on('error',()=>{});streams.push({req,res});ok();});req.on('error',bad);req.end();});
   await call('reset');const t=performance.now();
   const action=async i=>{
    const state=joinState(states[i]);let command=settings.command;
    if(workload==='combat'&&!state.runtime?.actors?.length)command={type:'MENU',params:{screen:'SYSTEM'}};
    const b={version:settings.version,engineVersion:settings.engineVersion,...command,revision:revisions[i],requestId:'capacity-'+workload+'-'+i+'-'+revisions[i],responseMode:'state-parts-v1'},started=performance.now();
    const res=await fetch(ready.base+'/game/action',{method:'POST',headers:{authorization:'Bearer '+settings.tokens[i],'content-type':'application/json'},body:JSON.stringify(b)}),text=await res.text(),payload=JSON.parse(text);
    assert.equal(res.status,200,JSON.stringify(payload));assert.equal(payload.baseRevision,revisions[i]);assert.equal(payload.revision,++revisions[i]);
    states[i]=applyParts(states[i],payload.statePatch);latencies.push(performance.now()-started);timings.push(res.headers.get('server-timing'));bodies.push(Buffer.byteLength(text));
   };
   for(let round=0;round<rounds;round++)for(let start=0;start<count;start+=concurrency)await Promise.all(Array.from({length:Math.min(concurrency,count-start)},(_,j)=>action(start+j)));
   const elapsedMs=performance.now()-t,stats=await call('stats'),verified=await call('verify');
   for(const row of verified.states){const i=Number(row.id.slice('capacity_'.length));assert.deepEqual(row.state,joinState(states[i]),'delta reconstruction equals durable SQLite state');assert.equal(row.revision,rounds);}
   assert.equal(verified.receipts.length,count*rounds);
   latencies.sort((a,b)=>a-b);const percentile=p=>latencies[Math.min(latencies.length-1,Math.ceil(latencies.length*p)-1)];
   const entry={version:settings.version,engineVersion:settings.engineVersion,serverBuild:settings.serverBuild,workload,accounts:count,concurrency,rounds,actions:count*rounds,clientElapsedMs:elapsedMs,actionsPerSecond:count*rounds*1000/elapsedMs,p50Ms:percentile(.5),p95Ms:percentile(.95),maxMs:latencies.at(-1),bodyBytes:bodies.reduce((a,b)=>a+b,0),durableDigest:verified.digest,timings,...stats};
   evidence.push(entry);const {timings:omit,...summary}=entry;console.log(JSON.stringify(summary));healthy++;
   for(const{req,res}of streams){res.destroy();req.destroy();}
   const exit=once(child,'exit');await call('shutdown');await exit;
  }finally{for(const{req,res}of streams){res.destroy();req.destroy();}if(child.exitCode===null&&!child.killed)child.kill('SIGKILL');rmSync(dir,{recursive:true,force:true});}
 }
 const result={schema:1,scope:'isolated local real HTTP, native runtime, file SQLite WAL synchronous FULL; no VPS capacity guarantee',environment:{node:process.version,arch:process.arch,logicalCpus:cpus().length,heapLimitMiB:heapMiB||null},evidence};
 if(output){mkdirSync(dirname(resolve(output)),{recursive:true});writeFileSync(output,JSON.stringify(result,null,2)+'\n');}
 console.log(JSON.stringify({ok:true,cases:evidence.length,output}));
}
