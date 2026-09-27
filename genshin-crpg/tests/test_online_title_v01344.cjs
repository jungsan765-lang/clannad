'use strict';
const assert=require('node:assert/strict'),{fs,path,vm,root,fresh,R,db}=require('./helpers_v011.cjs');
class Element{
 constructor(tag,cls='',text=''){this.tag=tag;this.className=cls;this.textContent=text;this.children=[];this.dataset={};this.style={};this.attributes={};this.classList={add(){},toggle(){}};this.open=false;}
 append(...x){this.children.push(...x);}replaceChildren(...x){this.children=x;}setAttribute(k,v){this.attributes[k]=v;}querySelector(){return null;}close(){this.open=false;}showModal(){this.open=true;}
}
const walk=n=>n instanceof Element?[n,...n.children.flatMap(walk)]:[],labels=n=>walk(n).filter(n=>n.tag==='button').map(n=>n.textContent);
const account={id:'qa-account-a',username:'기록검증',admin:false},state=JSON.parse(fresh('MAP_MOND_CITY','ROUTE_ISEKAI').serialize()),version='test44';
function harness({session={account,token:'test-token'},pending={},handler}={}){
 const storage=new Map([['crpg-online-session-v1',JSON.stringify(session)],['crpg-online-pending-accounts-v2',JSON.stringify(pending)]]),doc=new Element('root'),modal=new Element('dialog'),requests=[];
 const c=vm.createContext({console,URLSearchParams,AbortController,setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto,Runtime:R,DB:db,MANIFEST:{appVersion:version},game:null,busy:false,activeSaveSlot:null,selectedNPC:null,lastSaveError:'',saveFailed:false,sceneHistory:[],saveStore:null,GameVersion:{check(){}},root:doc,location:{hostname:'clannad.shop',search:''},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  el:(...x)=>new Element(...x),button:(text,onclick,disabled=false)=>Object.assign(new Element('button','',text),{onclick,disabled}),assetPath:()=>'/assets/landscape.webp',showModal:(title,p)=>{modal.title=title;modal.children=[p];modal.showModal();},document:{getElementById:()=>modal,querySelectorAll:()=>[]},applySettings(){},restoreUIState(){},storeSave:async()=>{},storeStoryCheckpoint(){},manualSave(){},loadFile(){},begin(){},loadSlot(){},fresh(){},setup(){},system(){},updateQuick(){},sidebar:()=>new Element('aside'),render(){},say(s){c.message=s;},settingsControls(){},slotsUI(){},routeName:x=>x,safeName:()=>'',act(){},fetch:async(url,opts)=>{const p=new URL(url).pathname,body=opts.body?JSON.parse(opts.body):undefined;requests.push({path:p,body,authorization:opts.headers.Authorization});const result=await (handler||(()=>({status:200,data:{version,account,state,revision:2,ranked:true}})))(p,body,c);return {ok:result.status>=200&&result.status<300,status:result.status,json:async()=>result.data};}});
 c.window=c;c.render=()=>{doc.replaceChildren();if(!c.game)c.setup();};vm.runInContext(fs.readFileSync(path.join(root,'source/app_online.js'),'utf8'),c);
 return {c,storage,requests,doc,modal};
}
(async()=>{
 let h=harness();assert.equal(h.requests.length,0);assert.equal(h.c.game,null);assert(labels(h.doc).includes('게임 시작'));assert(!labels(h.doc).some(x=>/이어서|여정 이어/.test(x)));assert.equal(h.modal.open,false);
 await h.c.CRPGOnline.start();assert.equal(h.c.game.s.global.SAVE_ID,state.global.SAVE_ID);assert.equal(h.c.CRPGOnline.active,true);assert.equal(h.requests[0].path,'/me');
 const menuRequests=h.requests.length,menuRevision=h.c.CRPGOnline.revision;await h.c.CRPGOnline.execute('MENU',{screen:'SYSTEM'});assert.equal(h.requests.length,menuRequests,'screen navigation must not call the server');assert.equal(h.c.CRPGOnline.revision,menuRevision,'screen navigation must not advance save revision');assert.equal(h.c.game.s.global.SCREEN_MODE,'SYSTEM');
 await h.c.fresh();assert.equal(h.c.game,null);assert.equal(h.c.CRPGOnline.token,'test-token');assert(labels(h.doc).includes('게임 시작'));
 const reloaded=harness({session:JSON.parse(h.storage.get('crpg-online-session-v1'))});assert.equal(reloaded.c.game,null);assert.equal(reloaded.modal.open,false);assert.equal(reloaded.requests.length,0);
 h=harness({handler:()=>({status:401,data:{error:'로그인이 만료되었습니다.'}})});await h.c.CRPGOnline.start();assert.equal(h.modal.title,'로그인');assert.equal(h.c.CRPGOnline.token,'');assert.equal(h.c.game,null);
 const pending={account:account.id,requestId:'pending-action-a',revision:2,version:'old',type:'WAIT',params:{minutes:10}};
 h=harness({pending:{[account.id]:pending},handler:()=>({status:200,data:{version:'newer44',account,state,revision:2,ranked:true}})});await h.c.CRPGOnline.start();assert.equal(h.c.game,null);assert.equal(h.c.CRPGOnline.active,false);assert(h.c.CRPGOnline.pending);assert(h.c.message.includes('업데이트'));
 h=harness({pending:{[account.id]:pending},handler:()=>{throw Error('network gone');}});await h.c.CRPGOnline.logout();assert.equal(h.c.game,null);assert.equal(h.c.CRPGOnline.token,'');assert.equal(JSON.parse(h.storage.get('crpg-online-pending-accounts-v2'))[account.id].requestId,pending.requestId);
 h=harness({session:{account:{...account,id:'qa-account-b'},token:'token-b'},pending:{[account.id]:pending}});assert.equal(h.c.CRPGOnline.pending,null);
 let actionCalls=0;h=harness({pending:{[account.id]:pending},handler:(p,b)=>{if(p==='/game/action'){actionCalls++;assert.equal(b.requestId,pending.requestId);assert.equal(b.version,version);return {status:200,data:{version,account,state,revision:3,ranked:true,result:{ok:true}}};}return {status:200,data:{version,account,state,revision:2,ranked:true}};}});await h.c.CRPGOnline.start();assert.equal(actionCalls,1);assert.equal(h.c.CRPGOnline.pending,null);assert.equal(h.c.CRPGOnline.revision,3);
 h=harness({handler:()=>({status:200,data:{version,account,state:null,revision:0}})});await h.c.CRPGOnline.start();assert.equal(h.modal.title,'당신의 이야기');assert.equal(h.c.game,null);assert(labels(h.modal).includes('모험 시작'));
 // Constructor errors cannot partially replace a valid current game.
 h=harness();await h.c.CRPGOnline.start();const prior=h.c.game;h.c.fetch=async()=>({ok:true,status:200,json:async()=>({version,account,state:{schema:999},revision:999})});await assert.rejects(h.c.CRPGOnline.sync());assert.equal(h.c.game,prior);assert.equal(h.c.CRPGOnline.revision,2);
 console.log('PASS title/refresh, authenticated start, expired session, first journey, logout, account-scoped retry, version mismatch and atomic state installation');
})().catch(e=>{console.error(e);process.exitCode=1;});
