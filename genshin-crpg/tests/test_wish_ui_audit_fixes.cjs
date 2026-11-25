'use strict';
// Execute the complete wish UI against deferred actions and a small DOM double.
// These are lifecycle/input regressions, not claims about rendered pixels or real devices.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../source/app_wish_v01411.js'),'utf8');
function harness(){
 const requests=[],videos=[],listeners=new Map(),timers=new Map();let timerId=0,top=null;
 const doc={activeElement:null,createElement:tag=>{const node=new Element(tag);if(tag==='video')videos.push(node);return node;},addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);}};
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.className='';this.attributes={};this.dataset={};this.style={setProperty(){}};this.inert=false;this.disabled=false;this.scrollTop=0;this._text='';const names=()=>this.className.split(/\s+/).filter(Boolean);this.classList={add:(...xs)=>this.className=[...new Set([...names(),...xs])].join(' '),remove:(...xs)=>this.className=names().filter(x=>!xs.includes(x)).join(' '),contains:x=>names().includes(x),toggle:(x,on)=>{on??=!names().includes(x);if(on)this.classList.add(x);else this.classList.remove(x);}};}
  set textContent(value){this._text=String(value);for(const child of this.children)child.parentElement=null;this.children=[];}
  get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
  append(...children){for(let child of children){if(typeof child==='string'){const t=new Element('text');t.textContent=child;child=t;}child.remove();child.parentElement=this;this.children.push(child);}}
  replaceChildren(...children){for(const child of this.children)child.parentElement=null;this.children=[];this._text='';this.append(...children);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(child=>child!==this);this.parentElement=null;}
  contains(node){return node===this||this.children.some(child=>child.contains(node));}
  matches(selector){if(selector.startsWith('.'))return this.classList.contains(selector.slice(1));return this.tagName===selector.replace(/:not\(:disabled\)/g,'').toUpperCase()&&(!selector.includes(':not(:disabled)')||!this.disabled);}
  querySelectorAll(selector){const selectors=selector.split(',');return this.children.flatMap(child=>[...(selectors.some(s=>child.matches(s))?[child]:[]),...child.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  setAttribute(key,value){this.attributes[key]=String(value);}
  removeAttribute(key){delete this.attributes[key];}
  addEventListener(type,fn){(this.events??={})[type]=fn;}
  focus(){doc.activeElement=this;}
  getBoundingClientRect(){return{width:360,height:760};}
  play(){this.playCalls=(this.playCalls||0)+1;return Promise.resolve();}pause(){}load(){}
 }
 doc.body=new Element('body');const wish={seq:0,history:[],EVENT:{pity5:0,pity4:0},STANDARD:{pity5:0,pity4:0}},balance={PRIMOGEM:16000,INTERTWINED_FATE:10,ACQUAINT_FATE:10};
 const game={s:{wish},tables:{'07_CHAR_DB':new Map(),'16_EQUIP_DB':new Map()},rows:()=>[],actionReason:()=>'',premiumOfferReason:()=>'',premiumBalance:()=>balance,premiumCharName:id=>id,wishState:()=>wish,wishView:()=>({state:wish,featured:{five:'FIVE',four:[]},nextFeatured:{five:'NEXT'},standard5:[],hoursLeft:48,banners:{EVENT:{name:'이벤트',fate:'INTERTWINED_FATE'},STANDARD:{name:'상시',fate:'ACQUAINT_FATE'}}})};
 const s={console,document:doc,game,render(){},setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id),act:(type,params)=>new Promise((resolve,reject)=>requests.push({type,params,resolve,reject}))};
 s.window=s;s.CRPGShell={topOverlay:()=>top,extraTiles:[]};vm.createContext(s);vm.runInContext(source,s);
 const root=()=>doc.body.querySelector('.wish-screen'),find=cls=>root()?.querySelector('.'+cls),all=cls=>root()?.querySelectorAll('.'+cls)||[];
 const key=key=>{const e={key,preventDefault(){this.defaultPrevented=true;}};for(const fn of listeners.get('keydown')||[])fn(e);return e;};
 const answer=(request,result={ok:true})=>{if(request.type==='WISH'&&result.ok){wish.seq++;wish.history.push({seq:wish.seq,rarity:3,kind:'weapon',id:'TEST_WEAPON',dust:15,at:0,banner:'EVENT'});}request.resolve(result);};
 return{s,requests,videos,balance,root,find,all,key,answer,top:value=>top=value,doc,timers};
}
let passed=0;async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
(async()=>{
 await test('double wish click sends one action; closing before its reply neither crashes nor reopens the screen',async()=>{
  const h=harness();h.s.CRPGWish.open();const button=h.find('wish-pull'),first=button.onclick(),second=button.onclick();assert.equal(h.requests.length,1);assert(h.all('wish-pull').every(b=>b.disabled));h.s.CRPGWish.close();h.answer(h.requests[0]);await Promise.all([first,second]);assert.equal(h.root(),null);
 });
 await test('a reply for a closed wish screen cannot animate inside a reopened screen',async()=>{
  const h=harness();h.s.CRPGWish.open();const first=h.find('wish-pull').onclick();h.s.CRPGWish.close();h.s.CRPGWish.open();const reopened=h.root();h.answer(h.requests[0]);await first;assert.equal(h.root(),reopened);assert.equal(h.find('wish-stage'),null);assert(h.all('wish-pull').every(b=>!b.disabled));
 });
 await test('exchange duplicate click is ignored and closing cancels only the follow-up wish, not the submitted exchange',async()=>{
  const h=harness();h.balance.INTERTWINED_FATE=0;h.s.CRPGWish.open();await h.find('wish-pull').onclick();const button=h.find('wish-primary'),first=button.onclick(),second=button.onclick();assert.equal(h.requests.length,1);assert.equal(h.requests[0].type,'PREMIUM_BUY');h.s.CRPGWish.close();h.balance.INTERTWINED_FATE=1;h.answer(h.requests[0]);await Promise.all([first,second]);assert.equal(h.requests.length,1);assert.equal(h.root(),null);
 });
 await test('an action ignored by a busy base UI cannot be mistaken for a successful exchange',async()=>{
  const h=harness();h.balance.INTERTWINED_FATE=0;h.s.CRPGWish.open();await h.find('wish-pull').onclick();h.s.act=async()=>undefined;await h.find('wish-primary').onclick();assert(h.find('wish-panel'));assert.match(h.find('wish-panel').textContent,/다른 행동을 처리/);assert.equal(h.requests.length,0);
 });
 await test('a thrown wish action is reported and leaves the controls usable',async()=>{
  const h=harness();h.s.CRPGWish.open();const first=h.find('wish-pull').onclick();h.requests[0].reject(Error('lost response'));await first;assert.match(h.root().textContent,/기원 기록을 확인/);assert.equal(h.find('wish-stage'),null);assert(h.all('wish-pull').every(b=>!b.disabled));
 });
 await test('side panels make underlying controls inert and receive focus; closing restores them',async()=>{
  const h=harness();h.s.CRPGWish.open();h.all('wish-ghost').find(b=>b.textContent==='상세 정보').onclick();const layer=h.find('wish-panel-wrap');assert(layer.contains(h.doc.activeElement));assert(h.root().children.filter(child=>child!==layer).every(child=>child.inert));h.key('Escape');assert.equal(h.find('wish-panel-wrap'),null);assert(h.root().children.every(child=>!child.inert));
 });
 await test('a pending exchange whose panel was dismissed cannot replace a subsequently opened panel',async()=>{
  const h=harness();h.s.CRPGWish.open();h.all('wish-plus')[0].onclick();const first=h.find('wish-primary').onclick();h.key('Escape');h.all('wish-ghost').find(b=>b.textContent==='기록').onclick();const panel=h.find('wish-panel');panel.scrollTop=75;h.answer(h.requests[0]);await first;assert.equal(h.find('wish-panel'),panel);assert.equal(panel.scrollTop,75);assert.match(panel.textContent,/기원 기록/);
 });
 await test('animation hides its background controls, stays intact on reopen, and summary Enter confirms the result',async()=>{
  const h=harness();h.s.CRPGWish.open();const first=h.find('wish-pull').onclick();h.answer(h.requests[0]);await first;const stage=h.find('wish-stage');assert(stage);assert(h.root().children.filter(child=>child!==stage).every(child=>child.inert));assert(stage.contains(h.doc.activeElement));h.s.CRPGWish.open();assert.equal(h.find('wish-stage'),stage);h.key('Escape');assert(h.find('wish-summary'));assert.equal(h.doc.activeElement.textContent,'확인');h.key('Enter');assert.equal(h.find('wish-stage'),null);assert(h.root());assert(h.root().children.every(child=>!child.inert));
 });
 await test('Escape is left to a native dialog above the wish screen',async()=>{
  const h=harness();h.s.CRPGWish.open();const root=h.root();h.top({});h.key('Escape');assert.equal(h.root(),root);h.top(null);h.key('Escape');assert.equal(h.root(),null);
 });
 await test('opening the wish menu downloads no videos; a completed pull loads and plays only its chosen recording',async()=>{
  const h=harness();h.s.CRPGWish.open();assert.equal(h.videos.length,0);const first=h.find('wish-pull').onclick();assert.equal(h.videos.length,0);h.answer(h.requests[0]);await first;assert.equal(h.videos.length,1);assert.equal(h.videos[0].src,'assets/video/wish/3star-single.mp4');assert.equal(h.videos[0].playCalls,1);assert([...h.timers.values()].some(timer=>timer.ms===14000));
 });
 console.log(`PASS ${passed} wish UI lifecycle/input regressions`);
})().catch(e=>{console.error(e);process.exitCode=1;});
