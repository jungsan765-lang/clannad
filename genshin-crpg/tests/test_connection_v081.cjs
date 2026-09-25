'use strict';
// Scratch regression: executes the actual service worker in a deterministic VM.
// Response metadata models a followed redirect; this is not a live browser test.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=process.argv[2]||require('path').resolve(__dirname,'../source/sw.js');
const VERSION='regression-hotfix-001';
const ORIGIN='https://crpg.test/',INDEX=ORIGIN+'index.html';
const HTML='<!doctype html><meta name="crpg-app" content="mond-crpg-adventure"><title>Game</title><script src="app.js?v='+VERSION+'"></script>';
const LOGIN='<!doctype html><title>Sign in</title><form>Authentication required</form>';
function decorate(response,{redirected=false,url=INDEX}={}){
  const nativeClone=response.clone.bind(response);
  Object.defineProperties(response,{redirected:{value:redirected},url:{value:url},clone:{value:()=>decorate(nativeClone(),{redirected,url})}});
  return response;
}
function htmlResponse(body=HTML,redirected=false,url=INDEX){return decorate(new Response(body,{headers:{'Content-Type':'text/html; charset=utf-8'}}),{redirected,url});}
function navigation(path=''){
  const request=new Request(new URL(path,ORIGIN),{redirect:'manual'});
  Object.defineProperty(request,'mode',{value:'navigate'});
  return request;
}
function fixture({loginInstall=false}={}){
  const stores=new Map(),handlers={},trace=[],networkCalls=[];
  let skipped=0;
  const key=input=>typeof input==='string'?new URL(input,ORIGIN).href:input.url;
  const caches={
    async open(name){
      if(!stores.has(name))stores.set(name,new Map());
      const map=stores.get(name);
      return {
        async match(input){return map.get(key(input))?.clone();},
        async put(input,response){map.set(key(input),response.clone());trace.push(['put',name,key(input)]);},
        async delete(input){return map.delete(key(input));},
        async keys(){return [...map.keys()].map(url=>new Request(url));},
        async addAll(inputs){
          const responses=await Promise.all(inputs.map(input=>fetcher(input)));
          if(responses.some(r=>!r.ok))throw Error('Cache addAll failed');
          for(let i=0;i<inputs.length;i++)await this.put(inputs[i],responses[i]);
        }
      };
    },
    async keys(){return [...stores.keys()];},
    async delete(name){return stores.delete(name);},
    async match(input){for(const name of stores.keys()){const hit=await (await this.open(name)).match(input);if(hit)return hit;}}
  };
  async function fetcher(input){
    const url=key(input);networkCalls.push(url);trace.push(['fetch',url]);
    const pathname=new URL(url).pathname;
    if(pathname==='/'||pathname==='/index.html')return htmlResponse(loginInstall?LOGIN:HTML,false,url);
    if(pathname==='/offline-pack.json')return new Response(JSON.stringify({version:VERSION,files:[]}));
    return new Response('/* fixture static asset */',{headers:{'Content-Type':pathname.endsWith('.css')?'text/css':'application/javascript'}});
  }
  vm.runInNewContext(fs.readFileSync(source,'utf8').replaceAll('__CONTENT_VERSION__',VERSION),{
    self:{location:{href:ORIGIN+'sw.js',origin:ORIGIN.slice(0,-1)},registration:{scope:ORIGIN},clients:{async claim(){trace.push(['claim']);}},async skipWaiting(){skipped++;trace.push(['skipWaiting']);},addEventListener(type,handler){handlers[type]=handler;}},
    caches,fetch:fetcher,URL,Request,Response,Headers,crypto:require('node:crypto').webcrypto,Uint8Array,Date,JSON,Error,Promise,console
  },{filename:source});
  return {stores,caches,trace,networkCalls,get skipped(){return skipped;},
    async seed(body=HTML,redirected=false,cache='core'){
      await (await caches.open('crpg-'+cache+'-'+VERSION)).put(INDEX,htmlResponse(body,redirected,ORIGIN));
      trace.length=0;
    },
    async navigate(path=''){
      let response,handled=false;
      const request=navigation(path);
      handlers.fetch({request,respondWith(value){handled=true;response=Promise.resolve(value);}});
      return {handled,response:handled?await response:undefined,request};
    },
    async install(){let pending;handlers.install({waitUntil(promise){pending=promise;}});await pending;}
  };
}
const tests=[
  ['redirected cached application HTML becomes a nonredirected navigation response',async()=>{
    const f=fixture();await f.seed(HTML,true);
    const result=await f.navigate();assert.equal(result.request.redirect,'manual');assert.equal(result.handled,true);
    assert.equal(result.response.redirected,false,'manual navigation cannot receive a followed-redirect cached Response');
    assert.equal(await result.response.text(),HTML);assert.equal(f.networkCalls.length,0);
  }],
  ['authentication paths are left to the browser network navigation',async()=>{
    const f=fixture();await f.seed();
    for(const path of ['auth/callback?code=fixture','login','_auth/login'])assert.equal((await f.navigate(path)).handled,false,path+' must not be intercepted');
    assert.equal(f.networkCalls.length,0);
  }],
  ['valid root and index application navigations use the current cached pack',async()=>{
    const f=fixture();await f.seed();
    for(const path of ['', 'index.html','?release=latest']){const r=await f.navigate(path);assert.equal(r.handled,true);assert.equal(await r.response.text(),HTML);}
    assert.equal(f.networkCalls.length,0);
  }],
  ['cached login HTML is rejected and falls back to network',async()=>{
    const f=fixture();await f.seed(LOGIN,true);const r=await f.navigate();
    assert.equal(await r.response.text(),HTML);assert.equal(f.networkCalls.length,1);
  }],
  ['cached application HTML with the wrong pack version is rejected',async()=>{
    const f=fixture();await f.seed(HTML.replace(VERSION,'older-version'),true);const r=await f.navigate();
    assert.equal(await r.response.text(),HTML);assert.equal(f.networkCalls.length,1);
  }],
  ['empty caches fall back to the original navigation request',async()=>{
    const f=fixture();const r=await f.navigate('?release=latest');
    assert.equal(await r.response.text(),HTML);assert.deepEqual(f.networkCalls,[ORIGIN+'?release=latest']);
  }],
  ['install rejects authentication HTML and never activates that worker',async()=>{
    const f=fixture({loginInstall:true});await assert.rejects(f.install());assert.equal(f.skipped,0);
  }],
  ['valid core install activates the recovery worker after all cache writes',async()=>{
    const f=fixture();await f.install();assert.equal(f.skipped,1,'recovery worker must call skipWaiting');
    const skip=f.trace.findIndex(e=>e[0]==='skipWaiting');const lastPut=f.trace.map(e=>e[0]).lastIndexOf('put');
    assert(lastPut>=0&&skip>lastPut,'skipWaiting must happen only after cache preparation succeeds');
    const index=await (await f.caches.open('crpg-core-'+VERSION)).match(INDEX);assert(index);assert.equal(await index.text(),HTML);
  }]
];
(async()=>{
  let failed=0;
  for(const [name,run] of tests){try{await run();console.log('PASS '+name);}catch(error){failed++;console.log('FAIL '+name+'\n  '+error.message);}}
  console.log(JSON.stringify({source,passed:tests.length-failed,failed,total:tests.length,kind:'VM regression with native Request/Response and simulated redirect metadata; not a real browser test'}));
  process.exitCode=failed?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});
