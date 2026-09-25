'use strict';
// Read-only source audit. Narrow VM doubles; no browser/player storage is opened.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {MessageChannel}=require('node:worker_threads');
const source=process.env.CRPG_SOURCE||path.resolve(__dirname,'../source');
const appSource=fs.readFileSync(path.join(source,'app_version.js'),'utf8'),swSource=fs.readFileSync(path.join(source,'sw.js'),'utf8');
const results=[];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject};};
class Events{
 constructor(){this.listeners=new Map();}
 addEventListener(type,fn,options={}){const list=this.listeners.get(type)||[];list.push({fn,once:!!options.once});this.listeners.set(type,list);}
 removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(x=>x.fn!==fn));}
 dispatch(type,event={}){for(const l of [...(this.listeners.get(type)||[])]){l.fn(event);if(l.once)this.removeEventListener(type,l.fn);}}
}
class Element extends Events{
 constructor(tag='div',className='',text=''){super();this.tagName=tag;this.className=className;this.textContent=String(text);this.children=[];this.attributes={};this.classList={toggle:()=>{},add:()=>{}};}
 append(...children){this.children.push(...children);}
 setAttribute(k,v){this.attributes[k]=String(v);}
}
async function harness(options={}){
 const calls={save:0,reload:0,updates:0,messages:[],posts:[],fetch:[],renders:0,storage:0,workerVersions:[]},timers=new Map();let nextTimer=0;
 const serviceWorker=new Events(),worker=(version,state='installed')=>Object.assign(new Events(),{testVersion:version,state,postMessage(message){calls.posts.push(message);if(message.type==='ACTIVATE_UPDATE'&&options.activate!==false){reg.active=this;reg.waiting=null;serviceWorker.controller=this;this.state='activated';queueMicrotask(()=>serviceWorker.dispatch('controllerchange'));}}});
 const active=worker(options.activeVersion||'pack-old','activated'),waiting=options.waiting===false?null:worker(options.waitingVersion||'pack-new');
 const installing=options.installing?worker('pack-new',options.installing):null;
 const reg={active,waiting,installing,async update(){calls.updates++;if(options.updateError)throw Error(options.updateError);}};
 serviceWorker.controller=options.controlled===false?null:active;serviceWorker.getRegistration=async()=>reg;
 const body=new Element('body'),doc=new Events();doc.body=body;doc.hidden=false;doc.getElementById=id=>body.children.find(x=>x.id===id)||null;
 const saves={manual:{id:'manual:original',revision:4,state:{name:'historical'}},auto:{id:'auto:current',revision:7,state:{name:'current'}}},original=JSON.stringify(saves);
 const tripwire=new Proxy({}, {get(){calls.storage++;throw Error('version module accessed persistent storage directly');}});
 const ctx=vm.createContext({console,Promise,Map,Set,URL,JSON,Date,Number,String,Array,Math,MessageChannel,MANIFEST:{appVersion:'0.7.0',contentVersion:'pack-old'},document:doc,navigator:options.noServiceWorker?{}:{serviceWorker},location:{href:'https://example.test/game/?old=1',replace(url){calls.reload++;calls.target=url;}},game:options.game===false?null:{s:{global:{SAVE_ID:'current',SAVE_REVISION:7}}},autoSavePaused:!!options.paused,busy:false,saveQueue:options.queue||Promise.resolve(),
  indexedDB:tripwire,localStorage:tripwire,saveStore:tripwire,
  setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);},
  fetch:async(url,options)=>{calls.fetch.push({url,options});return{ok:true,json:async()=>({appVersion:'0.8.0',packVersion:'pack-new'})}},
  render:()=>{calls.renders++;},say:message=>calls.messages.push(message),showModal:()=>{},el:(...args)=>new Element(...args),button:(text,fn,disabled=false)=>Object.assign(new Element('button','',text),{onclick:fn,disabled}),
  storeSave:async()=>{calls.save++;if(options.saveError)throw Error(options.saveError);if(options.saveWait)await options.saveWait;return{slotRevision:8};}
 });
 vm.runInContext(appSource,ctx,{filename:'app_version.js'});await tick();
 const api=vm.runInContext('GameVersion',ctx);
 // This isolates update policy from MessageChannel scheduling. The service worker
 // GET_VERSION responder is tested with the actual message handler below.
 if(typeof api.workerVersion==='function'&&!options.nativeChannel)api.workerVersion=async w=>{calls.workerVersions.push(w?.testVersion);return w?.testVersion||null;};
 return{ctx,api,calls,reg,serviceWorker,document:doc,timers,saves,original,flushTimers:async()=>{const work=[...timers.values()];timers.clear();work.forEach(t=>t.fn());await tick();}};
}
async function test(name,fn){try{await fn();results.push({name,ok:true});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+' :: '+e.message);}}
function swHarness(){
 const handlers={},calls={skipWaiting:0,claim:0,fetch:[],opened:[],added:[],put:[],deleted:0},store=new Map();
 const self={location:{href:'https://example.test/game/sw.js',origin:'https://example.test'},addEventListener:(type,fn)=>{handlers[type]=fn},skipWaiting:async()=>{calls.skipWaiting++;},clients:{claim:async()=>{calls.claim++;}}};
 const caches={open:async name=>{calls.opened.push(name);return{addAll:async requests=>calls.added.push(...requests),match:async key=>store.get(typeof key==='string'?key:key.url),put:async(key,value)=>{calls.put.push(key);store.set(key,value);}};},delete:()=>{calls.deleted++;throw Error('cache delete');}};
 const ctx=vm.createContext({self,caches,URL,Request,Response,Headers,Promise,Uint8Array,Date,JSON,crypto:crypto.webcrypto,indexedDB:new Proxy({}, {get(){throw Error('worker touched saves');}}),fetch:async(request,options)=>{calls.fetch.push({url:typeof request==='string'?request:request.url,options});return new Response(new URL(typeof request==='string'?request:request.url).pathname==='/game/'?'<meta name="crpg-app" content="mond-crpg-adventure"><script src="app.js?v=pack-test"></script>':JSON.stringify({version:'pack-test',files:[]}),{status:200})}});
 vm.runInContext(swSource.replaceAll('__CONTENT_VERSION__','pack-test'),ctx,{filename:'sw.js'});
 async function fire(type,extra={}){let promise;const event={waitUntil:p=>{promise=p},respondWith:p=>{promise=p},...extra};handlers[type](event);return await promise;}
 return{calls,fire,handlers,store};
}
(async()=>{
 await test('loaded badge comes from MANIFEST, independently of newer release metadata',async()=>{const h=await harness();assert.equal(h.api.label(),'v0.7.0');assert.equal(h.api.latest.appVersion,'0.8.0');assert.equal(h.document.getElementById('game-version').textContent,'v0.7.0 · 업데이트 있음');});
 await test('release check uses no-store and does not activate/reload automatically',async()=>{const h=await harness();assert.equal(h.calls.fetch[0].url,'release.json');assert.equal(h.calls.fetch[0].options.cache,'no-store');assert.equal(h.calls.posts.length,0);assert.equal(h.calls.reload,0);assert.equal(h.calls.save,0);});
 await test('without a service worker update navigates to the requested release URL after saving',async()=>{const h=await harness({noServiceWorker:true});await h.api.apply();assert.equal(h.calls.save,1);assert.equal(h.calls.reload,1);assert.equal(new URL(h.calls.target).searchParams.get('release'),'pack-new');assert.equal(new URL(h.calls.target).searchParams.get('old'),'1');});
 await test('paused autosave blocks update before any save, activation or reload',async()=>{const h=await harness({paused:true});await h.api.apply();assert.equal(h.calls.save,0);assert.equal(h.calls.posts.length,0);assert.equal(h.calls.reload,0);assert.match(h.calls.messages.at(-1),/일시중지/);});
 await test('save failure blocks update and preserves current game and save records',async()=>{const h=await harness({saveError:'simulated save failure'}),before=JSON.stringify(h.ctx.game),updates=h.calls.updates;await h.api.apply();assert.equal(h.calls.save,1);assert.equal(h.calls.updates,updates);assert.equal(h.calls.posts.length,0);assert.equal(h.calls.reload,0);assert.equal(JSON.stringify(h.ctx.game),before);assert.equal(JSON.stringify(h.saves),h.original);assert.equal(h.calls.storage,0);assert.equal(h.ctx.busy,false);assert.equal(h.api.updating,false);assert.match(h.calls.messages.at(-1),/simulated save failure/);});
 await test('apply drains queued writes and saves current progress before activating',async()=>{const queue=deferred(),save=deferred(),h=await harness({queue:queue.promise,saveWait:save.promise});const applied=h.api.apply();await tick();assert.equal(h.calls.save,0);assert.equal(h.calls.posts.length,0);queue.resolve();await tick();assert.equal(h.calls.save,1);assert.equal(h.calls.posts.length,0);save.resolve();await applied;assert.equal(h.calls.posts.length,1);assert.equal(h.calls.posts[0].type,'ACTIVATE_UPDATE');assert.equal(h.calls.reload,1);});
 await test('duplicate apply clicks perform one save, one activation and one reload',async()=>{const save=deferred(),h=await harness({saveWait:save.promise}),first=h.api.apply();await tick();await h.api.apply();assert.equal(h.calls.save,1);save.resolve();await first;assert.equal(h.calls.posts.length,1);assert.equal(h.calls.reload,1);assert.equal(h.calls.storage,0);assert.equal(JSON.stringify(h.saves),h.original);});
 await test('activation timeout blocks reload and releases busy state',async()=>{const h=await harness({activate:false}),applied=h.api.apply();await tick();await h.flushTimers();await applied;assert.equal(h.calls.reload,0);assert.equal(h.ctx.busy,false);assert.equal(h.api.updating,false);assert.ok(h.calls.messages.length);});
 await test('redundant installing worker blocks reload',async()=>{const h=await harness({waiting:false,installing:'redundant'});await h.api.apply();assert.equal(h.calls.reload,0,'installation failed but page reloaded');assert.ok(h.calls.messages.length);});
 await test('installation timeout without waiting worker blocks reload',async()=>{const h=await harness({waiting:false,installing:'installing'}),applied=h.api.apply();await tick();await h.flushTimers();await applied;assert.equal(h.calls.reload,0,'installation timed out but page reloaded');assert.ok(h.calls.messages.length);});
 await test('old active worker without update blocks a misleading same-version reload',async()=>{const h=await harness({waiting:false,activeVersion:'pack-old'});await h.api.apply();assert.equal(h.calls.reload,0,'old active worker silently reloaded old pack');assert.ok(h.calls.messages.length);});
 await test('already active matching pack allows saved reload without skipWaiting',async()=>{const h=await harness({waiting:false,activeVersion:'pack-new'});await h.api.apply();assert.equal(h.calls.save,1);assert.equal(h.calls.posts.length,0);assert.equal(h.calls.reload,1);});
 await test('controllerchange alone cannot approve a worker from a different pack',async()=>{const h=await harness({waitingVersion:'pack-other'});await h.api.apply();assert.equal(h.calls.posts.length,1);assert.equal(h.calls.reload,0);assert.match(h.calls.messages.at(-1),/최신 버전/);});
 await test('actual workerVersion helper uses a request port and returns its version',async()=>{const h=await harness({nativeChannel:true}),messages=[];const version=await h.api.workerVersion({postMessage(message,ports){messages.push(message);ports[0].postMessage({version:'pack-native'});ports[0].close();}});assert.equal(version,'pack-native');assert.equal(messages.length,1);assert.equal(messages[0].type,'GET_VERSION');assert.equal(h.timers.size,0);});
 await test('actual workerVersion helper times out cleanly for older workers without GET_VERSION',async()=>{const h=await harness({nativeChannel:true});let port;const pending=h.api.workerVersion({postMessage(_message,ports){port=ports[0];}});await h.flushTimers();assert.equal(await pending,null);port.close();});
 await test('recovery worker activates after validated core; pack/status messages never activate it',async()=>{const h=swHarness();await h.fire('install');assert.ok(h.calls.added.length>20);assert.ok(h.calls.added.every(r=>r.cache==='reload'));assert.ok(h.calls.added.filter(r=>/\.(js|css)$/.test(new URL(r.url).pathname)).every(r=>new URL(r.url).searchParams.get('v')==='pack-test'));await h.fire('message',{data:{type:'PACK_STATUS'},source:{postMessage:()=>{}}});await h.fire('message',{data:{type:'DOWNLOAD_PACK'},ports:[{postMessage:()=>{}}]});assert.equal(h.calls.skipWaiting,1);await h.fire('message',{data:{type:'ACTIVATE_UPDATE'}});assert.equal(h.calls.skipWaiting,2);});
 await test('worker release fetch bypasses caches and uses no-store',async()=>{const h=swHarness();await h.fire('fetch',{request:new Request('https://example.test/game/release.json')});assert.equal(h.calls.opened.length,0);assert.equal(h.calls.fetch.length,1);assert.equal(h.calls.fetch[0].options.cache,'no-store');});
 await test('worker activation claims clients without deleting cached packs or user saves',async()=>{const h=swHarness();await h.fire('activate');assert.equal(h.calls.claim,1);assert.equal(h.calls.deleted,0);assert.equal(h.calls.skipWaiting,0);});
 await test('worker GET_VERSION reports the loaded pack through the requesting port',async()=>{const h=swHarness(),messages=[];await h.fire('message',{data:{type:'GET_VERSION'},ports:[{postMessage:message=>messages.push(message)}],source:{postMessage:message=>messages.push(message)}});assert.equal(messages.length,1);assert.ok(messages[0].version==='pack-test'||messages[0].packVersion==='pack-test',JSON.stringify(messages[0]));assert.equal(h.calls.skipWaiting,0);});
 const report={source,sourceHashes:{'app_version.js':crypto.createHash('sha256').update(appSource).digest('hex'),'sw.js':crypto.createHash('sha256').update(swSource).digest('hex')},total:results.length,passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,results};
 fs.writeFileSync(path.resolve(__dirname,'../reports/version-tests.json'),JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
