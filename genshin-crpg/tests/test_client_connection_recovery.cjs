'use strict';
// Deterministic execution of real browser-side transport and worker code, without a browser/live account.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const source=n=>fs.readFileSync(path.resolve(__dirname,'../source',n),'utf8'),noop=()=>{},flush=async()=>{for(let n=0;n<8;n++)await new Promise(r=>setImmediate(r));};
let checks=0;async function test(name,fn){await fn();checks++;console.log('PASS '+name);}
function chat(){
 let clock=100000,id=0,requestError=null;const timers=new Map(),intervals=new Map(),streams=[],recent=[],listeners={};
 const ctx={console,AbortController,TextDecoder,Date:{now:()=>clock},location:{hostname:'test.invalid'},localStorage:{getItem:()=>null},
  setTimeout:(fn,ms=0)=>{timers.set(++id,{fn,at:clock+ms});return id;},clearTimeout:id=>timers.delete(id),
  setInterval:(fn,ms)=>{intervals.set(++id,{fn,ms});return id;},clearInterval:id=>intervals.delete(id),
  document:{hidden:false,body:{classList:{contains:()=>false}},querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners[type]=fn},addEventListener:(type,fn)=>listeners[type]=fn,
  CRPG_ONLINE_CONFIG:{apiBase:'https://test.invalid'},CRPGShell:{extraTools:[],toast:noop},
  CRPGOnline:{token:'token',account:{id:'test'},sessionStamp:()=>0,sameSession:()=>true,request:async url=>{recent.push(url);if(requestError)throw requestError;return {messages:[],me:'test'};}},
  fetch:(url,options)=>new Promise((resolve,reject)=>{const stream={url,options,resolve,reject,reads:[]};options.signal.addEventListener('abort',()=>{reject(Error('aborted'));if(!stream.ignoreReadAbort)for(const read of stream.reads)read.reject(Error('aborted'));});streams.push(stream);})};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source('app_chat.js').replace('C.reset=function()', 'C.test={probe,connect,resume};C.reset=function()'),ctx);
 function respond(s,{eof=false}={}){s.resolve({ok:true,status:200,body:{getReader:()=>({read:()=>eof?Promise.resolve({done:true}):new Promise((resolve,reject)=>s.reads.push({resolve,reject}))})}});}
 async function advance(ms){clock+=ms;for(const [key,t] of [...timers])if(t.at<=clock){timers.delete(key);t.fn();}await flush();}
 return {ctx,C:ctx.CRPGChat,timers,intervals,streams,recent,listeners,respond,advance,failRequests:error=>requestError=error};
}
function worker(){
 const calls=[],handlers={},cachesData=new Map(),bytes=Buffer.from('verified asset');let manifestResolve,bad=false;
 const pack={version:'fixture-pack',files:[{path:'asset.webp',sha256:crypto.createHash('sha256').update(bytes).digest('hex')}]};
 const caches={open:async name=>{if(!cachesData.has(name))cachesData.set(name,new Map());const cache=cachesData.get(name);return {put:async(key,response)=>cache.set(key,response),match:async key=>cache.get(key)};}};
 const ctx={URL,Request,Response,Headers,Uint8Array,Date,JSON,Promise,Set,crypto:crypto.webcrypto,caches,
  self:{location:{href:'https://test.invalid/game/sw.js',origin:'https://test.invalid'},addEventListener:(type,fn)=>handlers[type]=fn},
  fetch:(url,options)=>{calls.push({url,options});if(url.endsWith('offline-pack.json'))return new Promise(resolve=>manifestResolve=()=>resolve(new Response(JSON.stringify(pack))));assert.equal(options?.cache,'reload','asset request bypasses an old HTTP-cache copy');return Promise.resolve(new Response(bad?'damaged asset':bytes));}};
 vm.runInNewContext(source('sw.js').replaceAll('__CONTENT_VERSION__','fixture-pack'),ctx);
 const fire=port=>{let promise;handlers.message({data:{type:'DOWNLOAD_PACK'},ports:port?[port]:[],waitUntil:p=>promise=p});return promise;};
 return {calls,cachesData,fire,manifest:()=>manifestResolve(),bad:value=>bad=value};
}
(async()=>{
 await test('HTTP 200 followed by EOF backs off and activates polling after three short streams',async()=>{
  const h=chat();h.C.enabled=true;h.C.test.connect();
  for(let attempt=1;attempt<=3;attempt++){
   assert.equal(h.streams.length,attempt);h.respond(h.streams.at(-1),{eof:true});await flush();assert.equal(h.C.fails,attempt);
   const retry=[...h.timers.values()].find(t=>t.at<160000);assert(retry);
   if(attempt<3){await h.advance(1500*Math.pow(2,attempt)-1);assert.equal(h.streams.length,attempt);await h.advance(1);}
  }
  assert.equal(h.intervals.size,1);assert.equal([...h.intervals.values()][0].ms,15000);
 });
 await test('a stream stalled beyond two heartbeat intervals is aborted and reconnected',async()=>{
  const h=chat();h.C.enabled=true;h.C.test.connect();h.respond(h.streams[0]);await flush();await h.advance(59999);assert.equal(h.streams[0].options.signal.aborted,false);
  await h.advance(1);assert.equal(h.streams[0].options.signal.aborted,true);assert.equal(h.C.fails,1);await h.advance(3000);assert.equal(h.streams.length,2);
 });
 await test('a live heartbeat resets failure backoff and stops fallback polling',async()=>{
  const h=chat();h.C.enabled=true;h.C.fails=3;h.C.open=false;h.C.toggle(false);assert.equal(h.intervals.size,1);
  h.C.test.connect();h.respond(h.streams[0]);await flush();assert.equal(h.C.fails,3,'headers alone do not prove recovery');
  await h.advance(25000);h.streams[0].reads[0].resolve({done:false,value:new TextEncoder().encode(': ping\n\n')});await flush();assert.equal(h.C.fails,0);assert.equal(h.intervals.size,0);
 });
 await test('late bytes from a retired reader cannot reset the new connection failure count or stop its fallback poll',async()=>{
  const h=chat();h.C.enabled=true;h.C.test.connect();const old=h.streams[0];old.ignoreReadAbort=true;h.respond(old);await flush();const pendingRead=old.reads[0];
  h.C.reset();await h.advance(25000);h.C.enabled=true;h.C.fails=3;h.C.toggle(false);h.C.test.connect();const current=h.C.ctrl;
  assert.equal(h.intervals.size,1);pendingRead.resolve({done:false,value:new TextEncoder().encode(': delayed old heartbeat\n\n')});await flush();
  assert.equal(h.C.fails,3);assert.equal(h.intervals.size,1);assert.equal(h.C.ctrl,current);assert.equal(current.signal.aborted,false);assert.equal(h.timers.size,1,'only the new stream watchdog remains');
 });
 await test('hidden tabs postpone broken-stream retries and resume once without duplicate streams',async()=>{
  const h=chat();h.C.enabled=true;h.C.test.connect();h.respond(h.streams[0],{eof:true});await flush();h.ctx.document.hidden=true;await h.advance(3000);assert.equal(h.streams.length,1);
  h.ctx.document.hidden=false;h.listeners.visibilitychange();h.listeners.visibilitychange();await flush();assert.equal(h.streams.length,2);assert.equal(h.recent.length,1);
 });
 await test('initial chat failure waits thirty seconds despite repeated render-style probes',async()=>{
  const h=chat();h.failRequests(Object.assign(Error('offline'),{status:503}));await h.C.test.probe();for(let n=0;n<25;n++)await h.C.test.probe();assert.equal(h.recent.length,1);
  await h.advance(29999);assert.equal(h.recent.length,1);await h.advance(1);assert.equal(h.recent.length,2);
  h.C.reset();assert.equal(h.timers.size,0,'logout retires the scheduled probe');
 });
 await test('two tabs download one verified offline pack and both receive its completion',async()=>{
  const h=worker(),a=[],b=[],p=h.fire({postMessage:m=>a.push(m)}),q=h.fire({postMessage:m=>b.push(m)});assert.equal(p,q);assert.equal(h.calls.length,1);
  h.manifest();await p;assert.equal(h.calls.length,2);assert.equal(a.at(-1).ok,true);assert.equal(b.at(-1).ok,true);assert.equal(a.filter(x=>x.done).length,1);assert.equal(b.filter(x=>x.done).length,1);
 });
 await test('a disconnected progress port cannot fail another tab download; a corrupt asset stays unready and permits retry',async()=>{
  const h=worker(),messages=[];h.bad(true);const p=h.fire({postMessage:()=>{throw Error('tab closed');}}),q=h.fire({postMessage:m=>messages.push(m)});h.manifest();await p;await q;assert(messages.at(-1).error);assert.equal([...h.cachesData.values()][0].has('https://test.invalid/game/__ready__'),false);
  h.bad(false);const r=h.fire({postMessage:m=>messages.push(m)});h.manifest();await r;assert.equal(messages.at(-1).ok,true);assert.equal(h.calls.length,4);
 });
 await test('offline pack requests without a reply port do not start an unobservable download',async()=>{const h=worker();assert.equal(h.fire(null),undefined);assert.equal(h.calls.length,0);});
 console.log('PASS '+checks+' connection recovery checks');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
