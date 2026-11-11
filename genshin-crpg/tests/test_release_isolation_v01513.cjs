'use strict';
// Actual runtime and Service Worker code; no browser, remote account, or persistent player save.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {R,db}=require('./helpers_v011.cjs'),root=path.resolve(__dirname,'..');
const editorial=new Set(['28_CANON_AUDIT','40_CRPG_MIGRATION_PLAN']);
const cleaned=JSON.parse(JSON.stringify(db));for(const name of editorial)cleaned[name]=cleaned[name].slice(0,1);
function guarded(data,save){
 const r=new R(data,save),rows=r.rows,row=r.row;
 r.rows=function(name){assert(!editorial.has(name),'gameplay cannot read editorial rows');return rows.call(this,name);};
 r.row=function(name,id){assert(!editorial.has(name),'gameplay cannot resolve editorial IDs');return row.call(this,name,id);};
 r.tables=new Proxy(r.tables,{get(target,name){assert(!editorial.has(name),'gameplay cannot resolve editorial tables');return target[name];}});
 return r;
}
for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){
 const before=guarded(db),after=guarded(cleaned),options={name:'모험가',route,seed:39173,saveId:'ISOLATION-'+route};
 before.newGame(options);after.newGame(options);assert.equal(after.serialize(),before.serialize());
 for(let step=0;step<12;step++){
  const choices=before.storyChoices(),node=choices[0]||before.storyNode();assert(node,'opening remains playable');
  const type=choices.length?'STORY_CHOICE':'STORY_NEXT',params={node:node[4]};
  assert.equal(JSON.stringify(after.action(type,params)),JSON.stringify(before.action(type,params)));
  assert.equal(after.serialize(),before.serialize());
 }
 const restored=guarded(cleaned,JSON.parse(before.serialize()));assert.equal(restored.serialize(),before.serialize());
 console.log('PASS editorial removal preserves seeded opening/actions/save '+route);
}

function worker(){
 const handlers={},data=new Map(),requests=[];let claimed=0;
 const key=value=>typeof value==='string'?value:value.url;
 const caches={keys:async()=>[...data.keys()],delete:async name=>data.delete(name),open:async name=>{
  if(!data.has(name))data.set(name,new Map());const entries=data.get(name);
  return {keys:async()=>[...entries.keys()].map(url=>new Request(url)),match:async req=>entries.get(key(req)),put:async(req,res)=>entries.set(key(req),res),delete:async req=>entries.delete(key(req))};
 }};
 const context={URL,Request,Response,Headers,Date,Set,caches,fetch:async request=>{requests.push(key(request));throw Error('offline');},
  self:{location:{href:'https://test.invalid/game/sw.js',origin:'https://test.invalid'},clients:{claim:async()=>claimed++},addEventListener:(type,fn)=>handlers[type]=fn}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'source/sw.js'),'utf8').replaceAll('__CONTENT_VERSION__','new-pack'),context);
 return {data,caches,requests,claimed:()=>claimed,activate:async()=>{let pending;handlers.activate({waitUntil:p=>pending=p});await pending;},
  response:async(url,mode='navigate')=>{let response;handlers.fetch({request:{url,mode,method:'GET'},respondWith:r=>response=r});return response&&await response;}};
}
(async()=>{
 const h=worker(),base='https://test.invalid/game/',html='<meta name="crpg-app" content="mond-crpg-adventure"><script src="app.js?v=new-pack"></script>';
 const current=await h.caches.open('crpg-core-new-pack'),oldCore=await h.caches.open('crpg-core-old-pack'),old=await h.caches.open('crpg-pack-old-pack');
 await current.put(base+'index.html',new Response(html));await oldCore.put(base+'index.html',new Response('old game'));
 await old.put(base+'mobile-preview.html',new Response('QA wrapper'));await old.put(base+'mobile-preview.html?phone=small',new Response('QA wrapper'));
 await old.put(base+'portrait.webp',new Response('normal offline asset'));await old.put('https://test.invalid/other/mobile-preview.html',new Response('another app'));
 const unrelated=await h.caches.open('user-save-backup');await unrelated.put(base+'save.json',new Response('player save'));
 await h.activate();assert.equal(h.claimed(),1);
 assert.equal(await old.match(base+'mobile-preview.html'),undefined);assert.equal(await old.match(base+'mobile-preview.html?phone=small'),undefined);
 assert.equal(await (await old.match(base+'portrait.webp')).text(),'normal offline asset');
 assert.equal(await (await oldCore.match(base+'index.html')).text(),'old game');
 assert.equal(await (await old.match('https://test.invalid/other/mobile-preview.html')).text(),'another app');
 assert.equal(await (await unrelated.match(base+'save.json')).text(),'player save');
 console.log('PASS activation removes only retired QA route keys and preserves predecessor assets/other app/player cache');
 for(const suffix of ['mobile-preview.html','mobile-preview.html?phone=small']){
  const response=await h.response(base+suffix);assert.equal(response.status,404);assert.equal(response.headers.get('Cache-Control'),'no-store');
 }
 assert.equal(h.requests.length,0,'retired route never falls through to an old network or HTTP-cache document');
 assert.equal(await (await h.response(base)).text(),html,'offline main app still works');
 assert.equal(await h.response(base+'missing-page.html'),undefined,'unknown routes do not become the game or a QA page');
 assert.equal(await h.response('https://test.invalid/other/mobile-preview.html'),undefined,'retirement is registration-scoped');
 console.log('PASS retired navigation is 404 online/offline while app and other paths retain their handling');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
