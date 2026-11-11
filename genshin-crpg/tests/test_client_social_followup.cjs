'use strict';
// Execute client request coordination with delayed transport and timers. These are deterministic
// regression checks, not browser/layout or live player/server checks.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=name=>fs.readFileSync(path.resolve(__dirname,'../source',name),'utf8');
const noop=()=>{},flush=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
let checks=0;
async function test(name,fn){await fn();checks++;console.log('PASS '+name);}
function harness(extra={}){
 const requests=[],timers=new Map(),toasts=[];let timer=0,epoch=0;
 const O={token:'test-token',sessionStamp:()=>epoch,sameSession:e=>e===epoch,request:(url,data)=>new Promise((resolve,reject)=>requests.push({url,data:structuredClone(data),resolve,reject}))};
 const s={console,URLSearchParams,Map,Set,Promise,O,Date,JSON,draw:noop,redraw:noop,drawDeal:noop,SND:noop,say:t=>toasts.push(t),badge:noop,
  setTimeout:fn=>{timers.set(++timer,fn);return timer;},clearTimeout:id=>timers.delete(id),...extra};
 vm.createContext(s);
 return{s,O,requests,timers,toasts,eval:code=>vm.runInContext(code,s),retire:()=>{epoch++;},runTimers:()=>{for(const [id,fn] of [...timers]){timers.delete(id);fn();}}};
}
function trade(){
 const T={filter:{q:'',kind:'',sort:'',seller:''},tab:'market',deal:null,offer:null,busy:false},h=harness({T});
 const src=source('app_trade.js');
 h.eval(src.slice(src.indexOf('let pushTimer=0,'),src.indexOf('function drawDeal(){')));
 h.eval(src.slice(src.indexOf('let loadFlight=null,'),src.indexOf('T.load=load;')));
 return {...h,T};
}
function deal(items=[],updated=1){return {id:'deal-fixture',status:'OPEN',updated,me:{items,locked:false,confirmed:false},other:{items:[],locked:false,confirmed:false}};}
function put(h,item,qty){h.T.offer=new Map([[item,{item,qty}]]);h.s.pushOffer();}
function mail(){
 const M={draft:null,tab:'write',letters:null,enabled:null},h=harness({M}),src=source('app_mail_v0151.js');
 h.eval(src.slice(src.indexOf('let lettersFlight=null,'),src.indexOf('// ---------- the window ----------')));
 h.s.drawn=[];h.s.fillFind=(node,d)=>h.s.drawn.push({node,d,results:structuredClone(d.results)});
 h.eval(src.slice(src.indexOf('async function find(d){'),src.indexOf('function fillFind(')));
 return {...h,M};
}
(async()=>{
 await test('market duplicate query shares one request pair; newest filter wins even if old request finishes last',async()=>{
  const h=trade(),first=h.s.load(),same=h.s.load();assert.equal(first,same);assert.equal(h.requests.length,2);
  h.T.filter.q='사과';const next=h.s.load();assert.equal(h.requests.length,4);assert.equal(h.requests[2].url,'/market?q=%EC%82%AC%EA%B3%BC');
  h.requests[2].resolve({listings:['사과']});h.requests[3].resolve({deal:null});await next;
  h.requests[0].resolve({listings:['오래된 목록']});h.requests[1].resolve({deal:null});await first;
  assert.deepEqual(h.T.market.listings,['사과']);
 });
 await test('online-list errors do not disable the market or discard successful trade data',async()=>{
  for(const status of [404,503]){
   const h=trade();h.T.tab='direct';const loaded=h.s.load();assert.equal(h.requests.length,3);
   h.requests[2].reject(Object.assign(Error('접속 명단을 불러오지 못했습니다.'),{status}));
   h.requests[0].resolve({listings:['시장 물건']});h.requests[1].resolve({deal:null});await loaded;
   assert.equal(h.T.enabled,true);assert.deepEqual(h.T.market.listings,['시장 물건']);assert.equal(h.T.online,null);assert.equal(h.T.error,'접속 명단을 불러오지 못했습니다.');
  }
 });
 await test('post-mutation refresh bypasses older query and a slow market read cannot rewind a stream deal',async()=>{
  const h=trade(),first=h.s.load(),fresh=h.s.load(true);assert.equal(h.requests.length,4);
  const live=deal([],5);h.T.deal=live;
  h.requests[2].resolve({listings:['판매 후']});h.requests[3].resolve({deal:deal([],2)});await fresh;
  h.requests[0].resolve({listings:['판매 전']});h.requests[1].resolve({deal:null});await first;
  assert.deepEqual(h.T.market.listings,['판매 후']);assert.equal(h.T.deal,live);
 });
 await test('offer edits are serialized and lock waits for latest displayed quantity, including edits during an in-flight update',async()=>{
  const h=trade();h.T.deal=deal();put(h,'APPLE',1);h.runTimers();assert.equal(h.requests.length,1);
  put(h,'APPLE',3);const lock=h.s.toggleDealLock(h.T.deal);assert.equal(h.requests.length,1,'no lock while first update waits');
  h.requests[0].resolve({deal:deal([{item:'APPLE',qty:1}],2)});await flush();
  assert.equal(h.requests.length,2);assert.equal(h.requests[1].url,'/deal/update');assert.equal(h.requests[1].data.items[0].qty,3);
  await flush();assert.equal(h.requests.length,2,'still no lock until quantity 3 is acknowledged');
  h.requests[1].resolve({deal:deal([{item:'APPLE',qty:3}],3)});await flush();
  assert.equal(h.requests.length,3);assert.equal(h.requests[2].url,'/deal/lock');h.requests[2].resolve({deal:{...deal([{item:'APPLE',qty:3}],4),me:{items:[{item:'APPLE',qty:3}],locked:true}}});await lock;
  assert.equal(h.T.busy,false);assert.equal(h.T.deal.me.locked,true);assert.equal(h.eval('offerPending()'),false);
 });
 await test('failed offer update prevents locking and retry sends the same intended items before lock',async()=>{
  const h=trade();h.T.deal=deal();put(h,'APPLE',2);const first=h.s.toggleDealLock(h.T.deal);
  h.requests[0].reject(Error('connection lost'));await first;assert.equal(h.requests.length,1);assert.equal(h.T.busy,false);assert.equal(h.eval('offerPending()'),true);
  const retry=h.s.toggleDealLock(h.T.deal);assert.equal(h.requests.length,2);assert.deepEqual(h.requests[1].data,h.requests[0].data);
  h.requests[1].resolve({deal:deal([{item:'APPLE',qty:2}],2)});await flush();assert.equal(h.requests[2].url,'/deal/lock');h.requests[2].resolve({deal:deal([],3)});await retry;
 });
 await test('retired offer cannot update or lock a different account or newly opened deal',async()=>{
  const h=trade();h.T.deal=deal();put(h,'APPLE',2);const lock=h.s.toggleDealLock(h.T.deal);
  h.retire();h.s.resetOfferSync();const fresh={...deal([],1),id:'new-deal'};h.T.deal=fresh;
  h.requests[0].resolve({deal:deal([{item:'APPLE',qty:2}],2)});await lock;assert.equal(h.requests.length,1);assert.equal(h.T.deal,fresh);
 });
 await test('closing then reopening trade before fade ends does not hide the reopened window',async()=>{
  const h=trade(),src=source('app_trade.js'),node={hidden:false,classList:{add:noop,remove:noop}};h.T.node=node;
  Object.assign(h.s,{game:{},window:{CRPGProfile:{}},requestAnimationFrame:fn=>fn(),build:noop,load:noop});
  h.eval(src.slice(src.indexOf('function open(tab,'),src.indexOf('T.open=open;')));
  h.s.close();h.s.open();h.runTimers();assert.equal(node.hidden,false);
 });
 await test('mailbox concurrent readers share a request but explicit refresh ignores an obsolete read',async()=>{
  const h=mail(),first=h.s.loadLetters(),same=h.s.loadLetters();assert.equal(first,same);assert.equal(h.requests.length,1);
  const next=h.s.loadLetters(true);h.requests[1].resolve({inbox:['받음']});await next;
  h.requests[0].resolve({inbox:['받기 전']});await first;assert.deepEqual(h.M.letters.inbox,['받음']);
 });
 await test('mail recipient result cannot fill a replacement draft or overwrite newer search error state',async()=>{
  const h=mail(),a={q:'루미',results:[]},b={q:'하루',results:[]};h.M.draft=a;h.M.findList={isConnected:true};const first=h.s.find(a);
  h.M.draft=b;const second=h.s.find(b);h.requests[1].resolve({players:[{pid:'b',name:'하루'}]});await second;
  h.requests[0].reject(Error('old search failed'));await first;assert.equal(h.s.drawn.length,1);assert.equal(h.s.drawn[0].d,b);assert.equal(h.M.msg,undefined);
  await h.s.find(a);assert.equal(h.requests.length,2,'old scheduled searches never send');
 });
 await test('delayed mail read marker cannot be sent from the next login',async()=>{
  const h=mail();h.s.seen({id:'private-letter-a',box:'IN',read:false});h.retire();h.runTimers();await flush();assert.equal(h.requests.length,0);
 });
 await test('chat reset retires an in-flight probe and allows new account probe before the old one finishes',async()=>{
  const h=harness(),src=source('app_chat.js');
  Object.assign(h.s,{location:{hostname:'fixture.invalid'},localStorage:{getItem:()=>null},AbortController,TextDecoder,
   document:{body:{classList:{contains:()=>false}},querySelector:()=>null,querySelectorAll:()=>[],addEventListener:noop},setInterval:()=>0,clearInterval:noop,
   CRPGOnline:h.O,CRPG_ONLINE_CONFIG:{apiBase:'https://fixture.invalid'},CRPGShell:{extraTools:[],toast:noop},render:noop,fetch:()=>new Promise(()=>{})});
  h.O.account={id:'a'};h.s.window=h.s;
  h.eval(src.replace('C.reset=function()', 'C.test={probe,catchUp};C.reset=function()'));
  const C=h.s.CRPGChat,first=C.test.probe();assert.equal(C.probing,true);h.retire();h.O.token='';h.O.account=null;h.s.render();assert.equal(C.probing,false);h.O.token='second-token';h.O.account={id:'b'};
  const second=C.test.probe();assert.equal(h.requests.length,2);
  h.requests[0].reject(Object.assign(Error('old request'),{status:404}));await first;assert.equal(C.probing,true);assert.equal(C.enabled,null);
  h.requests[1].resolve({messages:[],me:'b'});await second;assert.equal(C.enabled,true);assert.equal(C.me,'b');assert.equal(C.probing,false);
 });
 await test('retired trade, mail and co-op mutations cannot release a new account busy flag or send follow-up requests',async()=>{
  for(const kind of ['trade','mail','coop']){
   const h=harness(),state={busy:false,msg:''};h.s.fmt=String;let pending;
   if(kind==='trade'){h.s.T=state;const src=source('app_trade.js');h.eval(src.slice(src.indexOf('async function buy(x){'),src.indexOf('// ---------- 내 상점')));h.s.load=()=>{throw Error('old follow-up read');};pending=h.s.buy({id:'old',price:20});}
   if(kind==='mail'){h.s.M=state;h.s.mailSession=h.O.sessionStamp;h.s.sameMailSession=h.O.sameSession;h.s.SHELL={toast:noop};const src=source('app_mail_v0151.js');h.eval(src.slice(src.indexOf('async function take(l){'),src.indexOf('async function takeAll(){')));h.s.loadLetters=()=>{throw Error('old follow-up read');};pending=h.s.take({id:'old'});}
   if(kind==='coop'){h.s.C=state;h.s.toast=noop;const src=source('app_coop_v0153.js');h.eval(src.slice(src.indexOf('async function call(path,'),src.indexOf('async function openRoom(')));pending=h.s.call('/coop/ready',{ready:true});}
   h.retire();state.busy=true;state.msg='new account operation';h.requests[0].reject(Object.assign(Error('old login ended'),{code:'SESSION_CHANGED'}));await pending;
   assert.equal(state.busy,true,kind);assert.equal(state.msg,'new account operation',kind);assert.equal(h.requests.length,1,kind);assert.equal(h.toasts.length,0,kind);
  }
 });
 await test('mail delete-all stops before the online letter mutation when the prior operator-mail action belongs to an old login',async()=>{
  const h=harness({M:{busy:false},SHELL:{toast:noop}}),src=source('app_mail_v0151.js');let finish;
  h.s.mailSession=h.O.sessionStamp;h.s.sameMailSession=h.O.sameSession;h.s.failed=()=>'';h.s.act=()=>new Promise(resolve=>finish=resolve);
  h.eval(src.slice(src.indexOf('async function remove(items){'),src.indexOf('async function block(')));
  const pending=h.s.remove([{src:'op',key:'a'},{src:'letter',id:'b'}]);h.retire();h.s.M.busy=true;finish({result:{deleted:1}});await pending;
  assert.equal(h.requests.length,0);assert.equal(h.s.M.busy,true);
 });
 await test('co-op concurrent polls share a request and a late room snapshot cannot reopen a room closed by the stream',async()=>{
  const C={busy:false,status:{room:{id:'r'}},invites:[]},h=harness({C,online:()=>true}),src=source('app_coop_v0153.js');let listener,synced=0;
  Object.assign(h.s,{drawBattle:noop,toast:noop,closeBattle:noop,schedule:noop,room:()=>C.status?.room,showRewards:list=>C.rewards=list,wantSync:()=>synced++,apply:out=>C.status=out,window:{CRPGChat:{on:fn=>listener=fn}}});
  h.eval(src.slice(src.indexOf('let roomFlight=null,'),src.indexOf('C.reload=load;')));
  h.eval(src.slice(src.indexOf('window.CRPGChat?.on?.(ev=>{'),src.indexOf('// ---------- where it is opened')));
  const first=h.s.load(),same=h.s.load();assert.equal(first,same);assert.equal(h.requests.length,1);
  listener({type:'coop',kind:'closed',reason:'방장이 닫았습니다'});assert.equal(C.status.room,null);
  h.requests[0].resolve({room:{id:'r'},rewards:[{xp:10}],me:{pid:'current'}});await first;
  assert.equal(C.status.room,null);assert.equal(C.status.me.pid,'current');assert.equal(C.loading,false);assert.equal(C.rewards[0].xp,10);assert.equal(synced,1,'paid rewards still request save sync');
 });
 console.log('PASS '+checks+' social client follow-up checks');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
