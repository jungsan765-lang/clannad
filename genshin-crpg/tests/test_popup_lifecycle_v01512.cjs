'use strict';
// Deferred requests and DOM doubles execute the shipped functions. No pixel/device validation is implied.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=name=>fs.readFileSync(path.join(__dirname,'../source',name),'utf8'),tick=()=>new Promise(resolve=>setImmediate(resolve));
function element(tag='div',cls='',text=''){
 const n={tagName:tag.toUpperCase(),className:cls,children:[],parentElement:null,dataset:{},style:{setProperty(){}},_text:String(text),attributes:{},events:{}};
 Object.defineProperty(n,'textContent',{get(){return this._text+this.children.map(c=>c.textContent).join('');},set(value){this._text=String(value);this.children=[];}});
 n.classList={add(...xs){n.className=[...new Set([...n.className.split(/\s+/),...xs])].join(' ');},remove(...xs){n.className=n.className.split(/\s+/).filter(x=>!xs.includes(x)).join(' ');},contains(x){return n.className.split(/\s+/).includes(x);},toggle(x,on){if(on??!this.contains(x))this.add(x);else this.remove(x);}};
 n.remove=function(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=null;};
 n.append=function(...children){for(const c of children){c.remove?.();c.parentElement=this;this.children.push(c);}};
 n.replaceChildren=function(...children){for(const c of this.children)c.parentElement=null;this.children=[];this._text='';this.append(...children);};
 n.setAttribute=function(k,v){this.attributes[k]=String(v);};n.removeAttribute=function(k){delete this.attributes[k];};n.addEventListener=function(k,v){this.events[k]=v;};
 n.matches=function(s){return s[0]==='.'?this.classList.contains(s.slice(1)):this.tagName===s.toUpperCase();};
 n.querySelectorAll=function(s){const selectors=s.split(',');return this.children.flatMap(c=>[...(selectors.some(x=>c.matches(x))?[c]:[]),...c.querySelectorAll(s)]);};n.querySelector=function(s){return this.querySelectorAll(s)[0]||null;};n.focus=()=>{};return n;
}
function raid(){
 const requests=[],sounds=[],toasts=[],timers=new Map();let epoch=0,id=0;
 const O={token:'session-A',account:{id:'account-A'},sessionStamp:()=>epoch,sameSession:s=>s===epoch,request:(url,params)=>new Promise((resolve,reject)=>requests.push({url,params,resolve,reject})),sync:async()=>{}};
 const game={s:{global:{}},raidReason:()=>'',raidView:()=>({open:!!game.raidServerEvent,endsAt:9999999999999,hoursLeft:1,sortiesLeft:3,sorties:3,hits:0,runs:0,best:0})};
 const s={console,document:{body:element('body'),createElement:element},game,render(){},act:async()=>({ok:true}),requestAnimationFrame:fn=>fn(),setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:i=>timers.delete(i),CRPGOnline:O,CRPGShell:{extraTiles:[],icon:()=>element('svg'),toast:t=>toasts.push(t)},CRPGSound:{play:n=>sounds.push(n)},CRPGRuntime:{raidV0152:{closed:'닫힘',rounds:8,minLevel:10,sorties:3,stages:[]}}};s.window=s;vm.createContext(s);
 vm.runInContext(source('app_raid_v0152.js').replace('R.reload=load;','R.reload=load;R.test={claim,sortie};'),s);
 const status=(label,claimable=false)=>({open:false,current:null,previousEvents:[{id:label,name:label,stages:[{key:'S1',canClaim:claimable,claimed:!claimable,reward:{}}],tiers:[]}]});
 return{s,O,R:s.CRPGRaid,requests,sounds,toasts,timers,status,session(account){epoch++;O.account=account?{id:account}:null;O.token=account?'token-'+account:'';}};
}
function journey({objective=null,goal=null,offers=[]}={}){
 const s={game:{s:{global:{PLAYER_LEVEL_STATE:1},party:[]},growth:()=>({next:100,xp:0}),objectiveInfo:()=>objective,navigationGoal:()=>goal,mainStoryEntries:()=>offers},mk:element,fmt:String,mapLabel:id=>id,guideButton:()=>element('button'),row:(cls,title)=>element('article',cls,title),section:title=>{const n=element('section');n.append(element('h3','',title));return n;},chip:()=>element('span'),stat:()=>element('div'),CRPGRuntime:{},console};
 const raw=source('app_handbook.js');vm.createContext(s);vm.runInContext(raw.slice(raw.indexOf('function journey('),raw.indexOf('function stat(')),s);const box=element();s.journey(box);return box.textContent;
}
function profile(){
 let finish,closed=0;const P={node:{id:'A'},busy:false};const s={P,mk:element,btn:(label,fn)=>Object.assign(element('button','',label),{onclick:fn}),close:()=>{closed++;P.node=null;},game:{tradeLevelReason:()=>''},window:{CRPGTrade:{invite:()=>new Promise(resolve=>finish=resolve)}}};
 const raw=source('app_profile_v01415.js');vm.createContext(s);vm.runInContext(raw.slice(raw.indexOf('function actions('),raw.indexOf('/* The ranking window')),s);const card=element();s.actions(card,{pid:'A',name:'A',online:true});
 return{P,button:card.querySelector('button'),answer:()=>finish(),get closed(){return closed;}};
}
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
 await test('a single current handbook objective does not also claim that no objective exists',()=>{
  for(const input of [{objective:{title:'현재 목표'}},{goal:'MAP_TARGET'},{offers:[{title:'새 이야기',available:true,state:'미시작'}]}])assert.doesNotMatch(journey(input),/지금 이어지는 본편 목표가 없습니다/);
  assert.match(journey(),/지금 이어지는 본편 목표가 없습니다/);
 });
 await test('trade invite completion cannot close a different profile opened while waiting',async()=>{
  const h=profile(),pending=h.button.onclick(),next={id:'B'};h.P.node=next;h.answer();await pending;assert.equal(h.P.node,next);assert.equal(h.closed,0);assert.equal(h.P.busy,false);
 });
 await test('trade invite still closes its own unchanged profile',async()=>{const h=profile(),pending=h.button.onclick();h.answer();await pending;assert.equal(h.closed,1);assert.equal(h.P.busy,false);});
 await test('simultaneous raid readers share a single GET',async()=>{
  const h=raid(),first=h.R.reload(),second=h.R.reload();assert.equal(h.requests.length,1);h.requests[0].resolve(h.status('same'));await Promise.all([first,second]);assert.equal(h.R.status.previousEvents[0].id,'same');assert.equal(h.R.loading,false);
 });
 await test('claim invalidates an in-flight pre-claim read and fetches the committed reward state once',async()=>{
  const h=raid(),read=h.R.reload(),claim=h.R.test.claim('event','S1');assert.equal(h.requests.length,2);h.requests[1].resolve({granted:{primogem:10}});await tick();const refresh=h.R.reload(true);assert.equal(h.requests.length,2);h.requests[0].resolve(h.status('stale',true));await tick();assert.equal(h.R.status,null);assert.equal(h.requests.length,3);assert.equal(h.requests[2].url,'/raid');h.requests[2].resolve(h.status('committed',false));await Promise.all([read,claim,refresh]);assert.equal(h.R.status.previousEvents[0].id,'committed');assert.equal(h.R.status.previousEvents[0].stages[0].claimed,true);assert.equal(h.requests.length,3);
 });
 await test('successful raid refresh retains a failed claim message instead of erasing it',async()=>{
  const h=raid(),pending=h.R.test.claim('event','S1');h.requests[0].reject(Error('아직 보상 조건을 채우지 못했습니다.'));await tick();assert.equal(h.requests[1].url,'/raid');h.requests[1].resolve(h.status('after-error'));await pending;assert.match(h.R.msg,/보상 조건/);assert.equal(h.R.busy,false);
 });
 await test('logout during initial raid loading closes the window and a new session can load immediately',async()=>{
  const h=raid();h.R.open();assert(h.R.node);assert.equal(h.requests.length,1);h.R.probe=Date.now()+30000;h.session(null);h.s.render();assert.equal(h.R.node,null);assert.equal(h.R.loading,false);assert.equal(h.R.probe,0);h.session('account-B');h.s.render();assert.equal(h.requests.length,2);h.requests[0].reject(Object.assign(Error('old session'),{code:'SESSION_CHANGED'}));await tick();assert.equal(h.R.loading,true);assert.equal(h.R.loadError,'');h.requests[1].resolve(h.status('account-B'));await tick();assert.equal(h.R.status.previousEvents[0].id,'account-B');assert.equal(h.R.loading,false);
 });
 await test('old claim completion cannot post a reward notice or reset the next session',async()=>{
  const h=raid(),pending=h.R.test.claim('event','S1');h.session(null);h.s.render();h.session('account-B');h.s.render();h.requests[0].resolve({granted:{primogem:10}});await pending;assert.equal(h.toasts.length,0);assert.equal(h.R.msg,'');assert.equal(h.R.loading,true);h.requests[1].resolve(h.status('account-B'));await tick();
 });
 await test('ignored sortie reports busy state and a completed old sortie does not close a newer raid window',async()=>{
  const h=raid();h.s.act=async()=>undefined;await h.R.test.sortie();assert.match(h.R.msg,/다른 행동/);assert.equal(h.R.busy,false);
  let finish;h.s.act=()=>new Promise(resolve=>finish=resolve);h.R.open();const pending=h.R.test.sortie();h.R.close();h.R.open();const next=h.R.node;finish({ok:true});await pending;assert.equal(h.R.node,next);assert.equal(h.R.busy,false);
 });
 console.log(`PASS ${passed} popup lifecycle regressions`);
})().catch(error=>{console.error(error);process.exitCode=1;});
