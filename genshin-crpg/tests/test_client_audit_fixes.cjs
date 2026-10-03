'use strict';
// Execute the shipped client code with deterministic transport/timer doubles.
// No browser, external server, player account, or persistent player save is used.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto').webcrypto;
const src=name=>fs.readFileSync(path.resolve(__dirname,'../source',name),'utf8'),noop=()=>{},tick=()=>new Promise(r=>setImmediate(r));
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
const state=(revision,id='fixture-save')=>({global:{SAVE_ID:id,SCREEN_MODE:'STORY',MORA:revision*10}});
function online(){
 const storage=new Map([['crpg-online-session-v1',JSON.stringify({account:{id:'fixture-account'},token:'fixture-token'})]]),requests=[],calls={construct:0,validate:0,restore:0};
 const element=()=>({append:noop,prepend:noop,setAttribute:noop,classList:{add:noop},close:noop});
 const s={console,URLSearchParams,AbortController,crypto,setTimeout,clearTimeout,JSON,Date,location:{hostname:'fixture.invalid',search:''},
  document:{hidden:false,addEventListener:noop,querySelectorAll:()=>[],getElementById:element},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  MANIFEST:{appVersion:'fixture-version',engineVersion:'fixture-engine'},DB:{},game:null,busy:false,root:element(),el:element,button:element,
  storeSave:noop,storeStoryCheckpoint:noop,manualSave:noop,loadFile:noop,loadSlot:noop,begin:noop,fresh:noop,setup:noop,render:noop,updateQuick:noop,system:noop,drawLocation:noop,sidebar:noop,
  applySettings:noop,restoreUIState:()=>calls.restore++,activeSaveSlot:null,say:noop,sceneHistory:[],selectedNPC:null,
  Runtime:class{constructor(db,s){calls.construct++;this.s=this.validateSave(s);}validateSave(s){calls.validate++;if(s.invalid)throw Error('invalid fixture save');return s;}actionReason(){return '';}menu(screen){this.s.global.SCREEN_MODE=screen;}serialize(){return JSON.stringify(this.s);}},
  fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject}))};
 s.window=s;s.addEventListener=noop;s.CRPG_ONLINE_CONFIG={apiBase:'https://fixture.invalid'};vm.createContext(s);vm.runInContext(src('app_online.js'),s);
 const answer=(r,revision,extra={},headers={})=>r.resolve({ok:true,status:200,headers:{get:k=>headers[k]||null},json:async()=>({account:{id:'fixture-account'},engineVersion:'fixture-engine',revision,state:state(revision),result:{ok:true},...extra})});
 const start=async()=>{const p=s.CRPGOnline.sync();answer(requests.at(-1),10);await p;return s.CRPGOnline;};
 return{s,requests,storage,calls,answer,start};
}
function chat(){
 const intervals=[],clears=[],requests=[],listeners={};let seq=0;
 const s={console,AbortController,TextDecoder,Date,location:{hostname:'fixture.invalid'},localStorage:{getItem:()=>null},setTimeout:()=>1,clearTimeout:noop,
  setInterval:(fn,ms)=>{intervals.push({id:++seq,ms,fn});return seq;},clearInterval:id=>clears.push(id),
  document:{hidden:false,body:{classList:{contains:()=>false}},querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners[type]=fn},
  CRPGOnline:{token:'fixture-token',account:{id:'fixture-account'},request:url=>new Promise(resolve=>requests.push({url,resolve}))},
  CRPGShell:{extraTools:[],toast:noop,topOverlay:()=>null},CRPG_ONLINE_CONFIG:{apiBase:'https://fixture.invalid'}};
 s.window=s;vm.createContext(s);
 // Only expose existing private functions; their bodies and public toggle remain unchanged.
 vm.runInContext(src('app_chat.js').replace('C.reset=function()','C.test={startPoll,catchUp};C.reset=function()'),s);
 return{s,intervals,clears,requests,listeners,C:s.CRPGChat};
}
function worker(){
 const stores=new Map(),deleted=[],handlers={};let claims=0;
 const caches={keys:async()=>[...stores.keys()],open:async name=>{if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return{match:async url=>map.get(url),keys:async()=>[...map.keys()].map(url=>({url}))};},delete:async name=>{deleted.push(name);return stores.delete(name);}};
 const s={URL,Request,Response,Headers,crypto,caches,self:{location:{href:'https://fixture.invalid/game/sw.js',origin:'https://fixture.invalid'},addEventListener:(type,fn)=>handlers[type]=fn,clients:{claim:async()=>claims++}},indexedDB:new Proxy({},{get(){throw Error('save storage accessed');}})};
 vm.createContext(s);vm.runInContext(src('sw.js').replaceAll('__CONTENT_VERSION__','current'),s);
 const seed=(name,urls)=>stores.set(name,new Map(urls.map(url=>[url,{}])));
 return{stores,deleted,seed,caches,get claims(){return claims;},activate:async()=>{let p;handlers.activate({waitUntil:x=>p=x});await p;}};
}
function mail(){
 const source=src('app_mail_v0151.js'),requests=[],M={busy:false};let balance=1000;
 const s={M,crypto,JSON,String,draw:noop,SND:noop,SHELL:{toast:noop},fmt:String,loadLetters:async()=>{},game:{tradeLevelReason:()=>''},postage:()=>100,mora:()=>balance,busyReason:()=>'',
  O:{sync:async()=>{},request:async(url,payload)=>{requests.push({url,payload:structuredClone(payload)});throw Object.assign(Error('response lost'),{retryable:true});}}};
 vm.createContext(s);
 // Keep the real validation/payload/send flow; omit unrelated mailbox rendering.
 vm.runInContext(source.slice(source.indexOf('function sendWhy(d)'),source.indexOf('function sendButtons(d)'))+source.slice(source.indexOf('function sendPayload(d)'),source.indexOf('// ---------- the envelope')),s);
 return{s,M,requests,balance:n=>balance=n,draft:()=>({to:{pid:'target',name:'친구'},title:'선물',body:'잘 지내?',items:new Map(),mora:0,replyTo:null})};
}
function coop(){
 const source=src('app_coop_v0153.js'),requests=[],C={busy:false,card:'CARD_A',target:'enemy',branch:'',battle:{battle:'battle-1',round:4,turn:{actor:'guest',deadline:123456,mine:true}}};
 const s={C,JSON,crypto,drawBattle:noop,SND:noop,load:noop,setBattle:view=>C.battle=view,O:{request:async(url,payload)=>{requests.push({url,payload:structuredClone(payload)});throw Error('response lost');}}};
 vm.createContext(s);vm.runInContext(source.slice(source.indexOf('let pendingCommand=null;'),source.indexOf('// After the 20 seconds')),s);return{s,C,requests};
}
(async()=>{
 await test('simultaneous /me callers share one request and install once',async()=>{
  const h=online(),first=h.s.CRPGOnline.sync(),second=h.s.CRPGOnline.sync();assert.equal(first,second);assert.equal(h.requests.length,1);h.answer(h.requests[0],10);await first;assert.equal(h.calls.construct,1);assert.equal(h.calls.restore,1);
 });
 await test('same-journey /me with a lower revision is ignored even without a pending action',async()=>{
  const h=online(),O=await h.start(),read=O.sync(),visible=h.s.game.s;h.answer(h.requests.at(-1),9);assert.equal((await read).ignored,true);assert.equal(O.revision,10);assert.equal(h.s.game.s,visible);
 });
 await test('late /me cannot overwrite an action committed after its request started',async()=>{
  const h=online(),O=await h.start(),old=O.sync(),action=O.execute('WAIT',{minutes:1});assert.equal(h.requests.length,3);h.answer(h.requests[2],12);await action;h.answer(h.requests[1],11);const result=await old;assert.equal(result.ignored,true);assert.equal(O.revision,12);assert.equal(h.s.game.s.global.MORA,120);assert.equal(O.pending,null);
 });
 await test('sync begun during an action cannot roll back its later acknowledgement',async()=>{
  const h=online(),O=await h.start(),action=O.execute('WAIT',{minutes:1}),read=O.sync();h.answer(h.requests[1],12);await action;h.answer(h.requests[2],11);assert.equal((await read).ignored,true);assert.equal(O.revision,12);
 });
 await test('sync cannot replace unacknowledged local presentation while an active action is pending',async()=>{
  const h=online(),O=await h.start(),action=O.execute('WAIT',{minutes:1}),read=O.sync(),visible=h.s.game.s;visible.global.MORA=999;h.answer(h.requests[2],10);assert.equal((await read).ignored,true);assert.equal(h.s.game.s,visible);assert.equal(h.s.game.s.global.MORA,999);h.answer(h.requests[1],11);await action;assert.equal(O.revision,11);
 });
 await test('new action generation receives a fresh /me instead of an obsolete flight',async()=>{
  const h=online(),O=await h.start(),old=O.sync(),action=O.execute('WAIT',{minutes:1}),newer=O.sync();assert.notEqual(newer,old);assert.equal(h.requests.length,4);h.answer(h.requests[2],12);await action;h.answer(h.requests[3],12);await newer;h.answer(h.requests[1],11);assert.equal((await old).ignored,true);assert.equal(O.revision,12);
 });
 await test('admin reset and replacement journey may restart revision without weakening same-save order checks',async()=>{
  const h=online(),O=await h.start(),reset=O.sync();h.answer(h.requests.at(-1),0,{state:null});await reset;assert.equal(O.active,false);assert.equal(h.s.game,null);const other=online(),otherO=await other.start(),replacement=otherO.sync();other.answer(other.requests.at(-1),0,{state:state(0,'replacement-save')});await replacement;assert.equal(otherO.revision,0);assert.equal(other.s.game.s.global.SAVE_ID,'replacement-save');
 });
 await test('a /me requested before new journey creation cannot erase its completed response',async()=>{
  const h=online(),O=h.s.CRPGOnline,old=O.sync(),created=h.s.begin('모험가','ROUTE_ISEKAI');h.answer(h.requests[1],0,{state:state(0,'new-save')});await created;h.answer(h.requests[0],0,{state:null});assert.equal((await old).ignored,true);assert.equal(O.active,true);assert.equal(h.s.game.s.global.SAVE_ID,'new-save');
 });
 await test('late /me cannot reopen a journey after returning to title; explicit start still works',async()=>{
  const h=online(),O=await h.start(),late=O.sync();h.s.saveFailed=false;h.s.lastSaveError='';await h.s.fresh();assert.equal(h.s.game,null);assert.equal(O.active,false);h.answer(h.requests.at(-1),10);assert.equal((await late).ignored,true);assert.equal(h.s.game,null);assert.equal(O.active,false);assert.equal(O.token,'fixture-token');const started=O.start();h.answer(h.requests.at(-1),10);await started;assert.equal(O.active,true);assert.equal(h.s.game.s.global.SAVE_ID,'fixture-save');
 });
 await test('logout rejects a late /me and cannot restore token/account/game',async()=>{
  const h=online(),O=await h.start(),late=O.sync(),rejected=assert.rejects(late,{code:'SESSION_CHANGED'}),logout=O.logout();await tick();assert.ok(h.requests.at(-1).url.endsWith('/logout'));h.answer(h.requests.at(-1),10,{state:null});await logout;h.answer(h.requests[1],15,{}, {'X-CRPG-Session':'expired-token'});await rejected;assert.equal(O.token,'');assert.equal(O.account,null);assert.equal(O.active,false);assert.equal(h.s.game,null);
 });
 await test('late action after logout preserves its original account retry journal',async()=>{
  const h=online(),O=await h.start(),action=O.execute('WAIT',{minutes:1}),rejected=assert.rejects(action,{code:'SESSION_CHANGED'}),logout=O.logout();await tick();assert.ok(h.requests[2].url.endsWith('/game/action'));assert.equal(JSON.parse(h.requests[1].options.body).requestId,JSON.parse(h.requests[2].options.body).requestId);h.answer(h.requests[2],11);await tick();assert.ok(h.requests[3].url.endsWith('/logout'));h.answer(h.requests[3],11,{state:null});await logout;const journal=h.storage.get('crpg-online-pending-accounts-v2');h.answer(h.requests[1],11);await rejected;assert.equal(h.storage.get('crpg-online-pending-accounts-v2'),journal);assert.equal(O.pending,null);assert.equal(h.s.game,null);
 });
 await test('routed session token from a slower concurrent response cannot replace a newer token',async()=>{
  const h=online(),O=await h.start(),old=O.request('/mail'),newer=O.request('/raid');h.answer(h.requests[2],10,{}, {'X-CRPG-Session':'new-token'});await newer;h.answer(h.requests[1],10,{}, {'X-CRPG-Session':'old-token'});await old;assert.equal(O.token,'new-token');
 });
 await test('same-save sync reuses Runtime indexes, validates and restores UI; invalid save rolls back atomically',async()=>{
  const h=online(),O=await h.start(),runtime=h.s.game,p=O.sync();h.answer(h.requests.at(-1),11);await p;assert.equal(h.s.game,runtime);assert.equal(h.calls.construct,1);assert.equal(h.calls.validate,2);assert.equal(h.calls.restore,2);const previous=h.s.game.s,invalid=O.sync();h.answer(h.requests.at(-1),12,{state:{...state(12),invalid:true}});await assert.rejects(invalid,/invalid fixture save/);assert.equal(h.s.game.s,previous);assert.equal(O.revision,11);const other=O.sync();h.answer(h.requests.at(-1),12,{state:state(12,'other-save')});await other;assert.notEqual(h.s.game,runtime);assert.equal(h.calls.construct,2);
 });
 await test('closing fallback chat replaces 3-second timer with 15-second timer',async()=>{
  const h=chat();h.C.enabled=true;h.C.open=true;h.C.fails=3;h.C.node={classList:{remove:noop}};h.C.test.startPoll();h.C.toggle(false);assert.equal(h.intervals[0].ms,3000);assert.equal(h.intervals.at(-1).ms,15000);assert.ok(h.clears.includes(h.intervals[0].id));
 });
 await test('chat catch-up calls share the in-flight request and can retry when finished',async()=>{
  const h=chat();h.C.enabled=true;const first=h.C.test.catchUp(),second=h.C.test.catchUp();assert.equal(first,second);assert.equal(h.requests.length,1);h.requests[0].resolve({messages:[]});await first;const third=h.C.test.catchUp();assert.equal(h.requests.length,2);h.requests[1].resolve({messages:[]});await third;
 });
 await test('chat slash shortcut is blocked by an existing custom overlay',async()=>{
  const h=chat();h.C.enabled=true;h.s.document.body.classList.contains=()=>true;h.s.CRPGShell.topOverlay=()=>({});let prevented=false;h.listeners.keydown({key:'/',target:{tagName:'BODY'},preventDefault:()=>prevented=true});assert.equal(h.C.open,false);assert.equal(prevented,false);
 });
 await test('worker retains current/previous release and foreign scopes, deletes older own full and partial packs',async()=>{
  const h=worker(),url='https://fixture.invalid/game/';h.seed('crpg-core-old',[url+'index.html']);h.seed('crpg-pack-old',[url+'asset.png']);h.seed('crpg-core-older',[url+'index.html']);h.seed('crpg-pack-older',[url+'index.html',url+'asset.png']);h.seed('crpg-core-previous',[url+'index.html']);h.seed('crpg-pack-previous',[url+'index.html']);h.seed('crpg-core-current',[url+'index.html']);h.seed('crpg-pack-current',[url+'index.html']);h.seed('crpg-core-foreign',['https://fixture.invalid/other/index.html']);h.seed('crpg-pack-foreign',['https://fixture.invalid/other/image.png']);h.seed('unrelated-cache',[url+'other']);await h.activate();assert.equal(h.claims,1);assert.deepEqual(h.deleted,['crpg-core-old','crpg-pack-old','crpg-core-older','crpg-pack-older']);assert.ok(h.stores.has('crpg-core-current'));assert.ok(h.stores.has('crpg-core-previous'));assert.ok(h.stores.has('crpg-core-foreign'));assert.ok(h.stores.has('unrelated-cache'));
 });
 await test('worker cleanup failure does not prevent client claim',async()=>{
  const h=worker();h.caches.keys=async()=>{throw Error('storage unavailable');};await h.activate();assert.equal(h.claims,1);
 });
 await test('lost letter response retries the same request ID even after fee reduced the balance',async()=>{
  const h=mail(),d=h.draft();h.M.draft=d;await h.s.send(d);assert.equal(d.sendAttempt.uncertain,true);h.balance(0);assert.equal(h.s.sendWhy(d),'');h.s.O.request=async(url,payload)=>{h.requests.push({url,payload});return{letter:{id:7},fee:100,replayed:true};};await h.s.send(d);assert.equal(h.requests.length,2);assert.equal(h.requests[0].payload.requestId,h.requests[1].payload.requestId);assert.match(h.requests[0].payload.requestId,/^[A-Za-z0-9_-]{10,80}$/);assert.equal(h.M.draft,null);assert.equal(h.M.sentPick,'S7');
 });
 await test('editing a failed letter creates a new intent and restores normal affordability checks',async()=>{
  const h=mail(),d=h.draft();await h.s.send(d);const first=h.requests[0].payload.requestId;d.title='다른 편지';h.balance(0);assert.equal(h.s.uncertainSend(d),false);assert.match(h.s.sendWhy(d),/모라/);h.balance(1000);await h.s.send(d);assert.notEqual(h.requests[1].payload.requestId,first);
 });
 await test('co-op lost response retains ID and exact battle/actor/deadline/round identity',async()=>{
  const h=coop();await h.s.command();await h.s.command();assert.equal(h.requests[0].payload.requestId,h.requests[1].payload.requestId);assert.equal(h.requests[0].payload.battle,'battle-1');assert.deepEqual(h.requests[0].payload.turn,{actor:'guest',deadline:123456,round:4});h.C.battle.round=5;await h.s.command();assert.notEqual(h.requests[2].payload.requestId,h.requests[0].payload.requestId);
 });
 await test('co-op replay reporting ended battle clears obsolete combat view',async()=>{
  const h=coop();h.s.O.request=async()=>({ok:true,battle:null,replayed:true});await h.s.command();assert.equal(h.C.battle,null);
 });
 await test('raid claim visibility includes older ended events and retains legacy fallback',async()=>{
  const source=src('app_raid_v0152.js'),s={R:{status:{previous:{stages:[]},previousEvents:[{stages:[]},{stages:[{canClaim:true}]}]}}};vm.createContext(s);vm.runInContext(source.slice(source.indexOf('const claimable='),source.indexOf('async function load('))+';this.previousClaimable=previousClaimable;this.previousEvents=previousEvents;',s);assert.equal(s.previousClaimable(),true);assert.equal(s.previousEvents().length,2);s.R.status={previous:{tiers:[{canClaim:true}]}};assert.equal(s.previousClaimable(),true);s.R.status={previousEvents:[],previous:{tiers:[{canClaim:true}]}};assert.equal(s.previousClaimable(),false);
 });
 console.log(`PASS ${passed} client audit regression checks`);
})().catch(e=>{console.error(e);process.exitCode=1;});
