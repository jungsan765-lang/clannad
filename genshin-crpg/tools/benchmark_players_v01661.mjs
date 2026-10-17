// 0.16.61 (user: 「서버 최적화가 되면 계정을 몇명까지 수용이 가능해지는지도 좀 체크해보고」): how many players one server holds.
// Isolated real HTTP/SQLite server in a child process (never point this at an installed server). Each player keeps one live
// stream open and acts like a person: waits a few seconds (exponential, mean --think seconds), then sends one action — a
// battle move (--combat share) or a light screen action. Open loop: a slow server does not slow the players down, so the
// waiting shows up as latency. One run per --players count, --seconds long.
//   node tools/benchmark_players_v01661.mjs --players=50,100,200,400 --think=5 --seconds=60 [--cache=16] [--heap-mib=0]
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {request as httpRequest,Agent} from 'node:http';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir,cpus} from 'node:os';
import {fileURLToPath} from 'node:url';

const script=fileURLToPath(import.meta.url);
const arg=(name,fallback)=>process.argv.find(x=>x.startsWith('--'+name+'='))?.split('=').slice(1).join('=')??fallback;
const memory=()=>({rssMiB:Math.round(process.memoryUsage().rss/1048576),heapMiB:Math.round(process.memoryUsage().heapUsed/1048576),peakRssMiB:Math.round(process.resourceUsage().maxRSS/1024)});
if(process.argv[2]==='--server'){
 const {startLiveRegionStaging}=await import('../server/fixed-region-live.mjs');
 const {monitorEventLoopDelay}=await import('node:perf_hooks');
 const engine=await import('../server/generated/engine.mjs');
 const app=await startLiveRegionStaging({dbPath:process.argv[3],pepper:'isolated-players-v01661'.padEnd(64,'x'),features:['chat','trade','coop'],runtimeCacheMax:Number(process.argv[4]||16)});
 const histogram=monitorEventLoopDelay({resolution:10});histogram.enable();
 let builds=0,buildMs=0,started=0,cpu=null;const factory=app.store.runtimeFactory;
 app.store.runtimeFactory=function(...a){const t=performance.now();try{return factory.apply(this,a);}finally{builds++;buildMs+=performance.now()-t;}};
 const methods={
  async seed({count}){
   const r=app.store.runtimeFactory();r.newGame({name:'players',route:'ROUTE_TRAVELER',seed:12345,saveId:'players-fixture'});
   Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:'MAP_MOND_CITY',STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION'});
   delete r.s.storyJourney;delete r.s.storyBreak;r.s.storyContext=null;r.s.tutorial={version:2,completed:true,step:'DONE'};r.prepareStory?.();
   r.adminApply({op:'level',target:'PLAYER_CUSTOM',value:20});
   for(const char of ['MOND_AMBER','MOND_KAEYA','MOND_LISA']){r.adminApply({op:'recruit',char});r.adminApply({op:'level',target:char,value:20});}
   for(const[slot,char]of ['MOND_AMBER','MOND_KAEYA','MOND_LISA'].entries())r.setParty(char,slot+2);
   const group=r.rows('33_ENCOUNTER_GROUP_DB').find(x=>String(x[0]).includes('CRYO_REGISVINE'))||r.rows('33_ENCOUNTER_GROUP_DB').find(x=>String(x[0]).includes('REGISVINE'));
   r.startBattle(group[0],'EXPLICIT');if(r.combatOpening()?.pending)r.action('COMBAT_BEGIN',{});
   const card=r.combatCards().find(c=>c.id==='PLAYER_BASIC_GUARD'&&!c.reason);assert(card,'a battle waiting for the protagonist');
   const {splitState}=await import('../server/state-parts.mjs');const t=Date.now(),tokens=[];
   app.store.db.exec('BEGIN IMMEDIATE');
   try{const account=app.store.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)'),meta=app.store.db.prepare('INSERT INTO metadata VALUES(?,?,?,?,?)'),insert=app.store.db.prepare('INSERT INTO parts VALUES(?,?,?)');
    for(let i=0;i<count;i++){const id='players_'+i,state=structuredClone(r.s);state.global.SAVE_ID='players-save-'+i;state.global.PLAYER_NAME='players-'+i;
     account.run(id,id,state.global.PLAYER_NAME,'unused','unused',t);meta.run(id,0,1,'FIXTURE',t);for(const[p,v]of splitState(state))insert.run(id,p,v);}
    app.store.db.exec('COMMIT');}catch(e){app.store.db.exec('ROLLBACK');throw e;}
   for(let i=0;i<count;i++)tokens.push((await app.store.issue(app.store.account('players_'+i))).token);
   app.store.cache.clear();global.gc?.();
   return {tokens,version:engine.ENGINE_VERSION,engineVersion:engine.ENGINE_FINGERPRINT,combat:{type:'COMBAT',params:{card:card.id,target:card.targets[0]?.id}}};
  },
  reset(){histogram.reset();builds=0;buildMs=0;cpu=process.cpuUsage();started=performance.now();return {};},
  stats(){const c=process.cpuUsage(cpu),elapsed=performance.now()-started;global.gc?.();return {elapsedMs:elapsed,cpuMs:(c.user+c.system)/1000,cpuShare:(c.user+c.system)/1000/elapsed,builds,buildMs:Math.round(buildMs),cacheEntries:app.store.cache.size,...memory(),eventLoopP95Ms:histogram.percentile(95)/1e6,eventLoopP99Ms:histogram.percentile(99)/1e6,eventLoopMaxMs:histogram.max/1e6};},
  async shutdown(){histogram.disable();await app.store.coopSettled?.();await app.close();return {};}
 };
 process.on('message',async m=>{try{const result=await methods[m.op](m.body||{});process.send({id:m.id,result},()=>{if(m.op==='shutdown')process.disconnect();});}catch(e){process.send({id:m.id,error:e.stack});}});
 process.send({ready:true,base:'http://127.0.0.1:'+app.address.port,...memory()});
}else{
 const counts=arg('players','50,100,200').split(',').map(Number),think=Number(arg('think','5')),seconds=Number(arg('seconds','60')),share=Number(arg('combat','0.4')),cache=Number(arg('cache','16')),heap=Number(arg('heap-mib','0')),output=arg('output','');
 assert(counts.every(n=>Number.isInteger(n)&&n>0&&n<=490));assert(think>0&&seconds>=10);
 const results=[];
 for(const count of counts){
  const dir=mkdtempSync(join(tmpdir(),'crpg-players-')),child=fork(script,['--server',join(dir,'players.sqlite'),String(cache)],{stdio:['ignore','ignore','pipe','ipc'],execArgv:['--expose-gc',...(heap?['--max-old-space-size='+heap]:[])]});
  let seq=0,stderr='';const pending=new Map();child.stderr.on('data',x=>stderr+=x);
  const ready=await new Promise((ok,bad)=>{child.on('error',bad);child.on('message',m=>{if(m.ready)return ok(m);const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.bad(Error(m.error)):p.ok(m.result);});child.on('exit',code=>{const e=Error('server exited '+code+' '+stderr.slice(-2000));bad(e);for(const p of pending.values())p.bad(e);pending.clear();});});
  const call=(op,body)=>new Promise((ok,bad)=>{const id=++seq;pending.set(id,{ok,bad});child.send({id,op,body});});
  const agent=new Agent({keepAlive:true,maxSockets:Infinity}),streams=[];
  const post=(path,token,body)=>new Promise((ok,bad)=>{const data=JSON.stringify(body),req=httpRequest(ready.base+path,{method:'POST',agent,headers:{authorization:'Bearer '+token,'content-type':'application/json','content-length':Buffer.byteLength(data)}},res=>{let t='';res.setEncoding('utf8');res.on('data',x=>t+=x);res.on('end',()=>ok({status:res.statusCode,text:t}));});req.on('error',bad);req.end(data);});
  try{
   const s=await call('seed',{count});
   for(let i=0;i<count;i++)await new Promise((ok,bad)=>{const req=httpRequest(ready.base+'/chat/stream',{headers:{authorization:'Bearer '+s.tokens[i]}},res=>{res.on('data',()=>{});res.on('error',()=>{});streams.push({req,res});ok();});req.on('error',bad);req.end();});
   const revisions=Array(count).fill(0),inCombat=Array(count).fill(true),lat=[],errors={},kinds={combat:0,menu:0};let sent=0,done=0;
   await call('reset');const t0=performance.now(),end=t0+seconds*1000;
   const wait=ms=>new Promise(r=>setTimeout(r,ms));
   const player=async i=>{await wait(Math.random()*think*1000);
    while(performance.now()<end){
     const combat=inCombat[i]&&Math.random()<share,cmd=combat?s.combat:{type:'MENU',params:{screen:'SYSTEM'}},b={version:s.version,engineVersion:s.engineVersion,...cmd,revision:revisions[i],requestId:'player-'+i+'-'+revisions[i]+'-'+sent,responseMode:'state-parts-v1'};
     const t=performance.now();sent++;kinds[combat?'combat':'menu']++;
     try{const r=await post('/game/action',s.tokens[i],b);const ms=performance.now()-t;done++;
      if(r.status===200){const p=JSON.parse(r.text);revisions[i]=Number.isInteger(p.revision)?p.revision:revisions[i]+1;lat.push(ms);}
      else{let code=r.status;try{code+=' '+(JSON.parse(r.text).code||JSON.parse(r.text).error||'').slice(0,40);}catch{}errors[code]=(errors[code]||0)+1;if(r.status===400)inCombat[i]=false;}
     }catch(e){errors[e.code||'net']=(errors[e.code||'net']||0)+1;}
     // a person reads the result, then waits before the next move
     const pause=-Math.log(1-Math.random())*think*1000;await wait(Math.min(pause,think*4000));}};
   await Promise.all(Array.from({length:count},(_,i)=>player(i)));
   const wall=(performance.now()-t0)/1000,st=await call('stats');lat.sort((a,b)=>a-b);const q=p=>lat.length?Math.round(lat[Math.min(lat.length-1,Math.floor(lat.length*p))]):null;
   const row={players:count,thinkSeconds:think,seconds:Math.round(wall),cache,actions:lat.length,perSecond:+(lat.length/wall).toFixed(1),p50:q(.5),p95:q(.95),p99:q(.99),max:q(.9999),errors,kinds,server:{cpuShare:+st.cpuShare.toFixed(2),builds:st.builds,buildMs:st.buildMs,cacheEntries:st.cacheEntries,rssMiB:st.rssMiB,peakRssMiB:st.peakRssMiB,heapMiB:st.heapMiB,eventLoopP99Ms:Math.round(st.eventLoopP99Ms),eventLoopMaxMs:Math.round(st.eventLoopMaxMs)}};
   console.log(JSON.stringify(row));results.push(row);
  }finally{for(const x of streams){try{x.req.destroy();}catch{}}try{await call('shutdown');}catch{}agent.destroy();try{rmSync(dir,{recursive:true,force:true});}catch{}}
 }
 const report={tool:'benchmark_players_v01661',node:process.version,cpu:cpus()[0]?.model,logicalCpus:cpus().length,results,limits:'one isolated local server; a person = one action every --think seconds on average; not the VPS hardware'};
 if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
}
