'use strict';
// 0.15.15 (user: 「틀린그림찾기 기회 다 닳으면 30초 기다리는거도 추가하자. 해보니까 그게 없으니까 그냥 체력이 있나 없나 똑같은
// 것 같아」, and the screen pass PR #20 left open): the spot game rests 30 seconds when its chances run out (also when the
// window is closed and opened again), the co-op corner button stays on the field screen with room under its lists, and a
// full window keeps its header (a 320 px phone pushed the chest title above the window).
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
const results=[];
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}

// ---------- a small page (the same model as test_coop_world_ui_v0159.cjs) ----------
function parse(sel){
 const parts=[];let comb=' ';
 for(const t of sel.trim().replace(/\s*>\s*/g,' > ').split(/\s+/)){if(t==='>'){comb='>';continue;}
  if(t===':scope'){parts.push({comb,c:{scope:true}});comb=' ';continue;}
  const m=t.match(/^([a-zA-Z0-9]*)((?:\.[\w-]+)*)$/);if(!m)throw new Error('selector not modelled: '+t);
  parts.push({comb,c:{tag:m[1]?m[1].toUpperCase():null,classes:m[2]?m[2].slice(1).split('.'):[]}});comb=' ';}
 return parts;
}
const one=(el,c,scope)=>c.scope?el===scope:(!c.tag||el.tagName===c.tag)&&c.classes.every(k=>el.classList.contains(k));
function matches(el,parts,scope){
 let i=parts.length-1;if(!one(el,parts[i].c,scope))return false;let cur=el;
 while(i>0){const comb=parts[i].comb;i--;cur=cur.parentElement;
  if(comb==='>'){if(!cur||!one(cur,parts[i].c,scope))return false;}
  else{while(cur&&!one(cur,parts[i].c,scope))cur=cur.parentElement;if(!cur)return false;}}
 return true;
}
class N{
 constructor(doc){this.ownerDocument=doc;this.parentNode=null;this.childNodes=[];}
 get parentElement(){return this.parentNode&&this.parentNode.tagName?this.parentNode:null;}
 get isConnected(){let n=this;while(n.parentNode)n=n.parentNode;return n===this.ownerDocument.documentElement;}
 remove(){const p=this.parentNode;if(!p)return;p.childNodes.splice(p.childNodes.indexOf(this),1);this.parentNode=null;}
 before(...ns){const p=this.parentNode;if(!p)return;for(const n of ns.map(x=>this.ownerDocument.node(x))){n.remove();p.childNodes.splice(p.childNodes.indexOf(this),0,n);n.parentNode=p;}}
 after(...ns){const p=this.parentNode;if(!p)return;let ref=this;for(const n of ns.map(x=>this.ownerDocument.node(x))){n.remove();p.childNodes.splice(p.childNodes.indexOf(ref)+1,0,n);n.parentNode=p;ref=n;}}
 replaceWith(...ns){if(!this.parentNode)return;this.after(...ns);this.remove();}
 contains(n){for(;n;n=n.parentNode)if(n===this)return true;return false;}
}
class Text extends N{constructor(doc,t){super(doc);this.data=String(t);}get textContent(){return this.data;}set textContent(v){this.data=String(v);}}
class El extends N{
 constructor(doc,tag){super(doc);const props={};Object.assign(this,{tagName:tag.toUpperCase(),className:'',dataset:{},attrs:{},value:'',disabled:false,title:'',type:'',listeners:{},
  style:{setProperty:(k,v)=>{props[k]=String(v);},removeProperty:k=>{delete props[k];},getPropertyValue:k=>props[k]||''}});}
 get children(){return this.childNodes.filter(n=>n instanceof El);}
 get classList(){const el=this,list=()=>el.className.split(/\s+/).filter(Boolean);return {
  add:(...c)=>{el.className=[...new Set([...list(),...c])].join(' ');},remove:(...c)=>{el.className=list().filter(x=>!c.includes(x)).join(' ');},
  contains:c=>list().includes(c),replace:(a,b)=>{if(!list().includes(a))return false;el.className=list().map(x=>x===a?b:x).join(' ');return true;},
  toggle:(c,force)=>{const want=force===undefined?!list().includes(c):!!force;if(want)el.classList.add(c);else el.classList.remove(c);return want;}};}
 get textContent(){return this.childNodes.map(n=>n.textContent).join('');}
 set textContent(v){for(const n of [...this.childNodes])n.remove();if(v!==''&&v!==null&&v!==undefined)this.append(String(v));}
 get innerText(){return this.textContent;}
 append(...ns){for(const n of ns.map(x=>this.ownerDocument.node(x))){n.remove();this.childNodes.push(n);n.parentNode=this;}}
 prepend(...ns){for(const n of ns.map(x=>this.ownerDocument.node(x)).reverse()){n.remove();this.childNodes.unshift(n);n.parentNode=this;}}
 replaceChildren(...ns){const list=ns.map(x=>this.ownerDocument.node(x));for(const n of list)n.remove();for(const n of [...this.childNodes])n.remove();for(const n of list){this.childNodes.push(n);n.parentNode=this;}}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return k in this.attrs?this.attrs[k]:null;}removeAttribute(k){delete this.attrs[k];}hasAttribute(k){return k in this.attrs;}
 addEventListener(t,fn){(this.listeners[t]??=[]).push(fn);}
 getBoundingClientRect(){return {left:0,top:0,right:0,bottom:0,width:0,height:0};}
 get clientWidth(){return 0;}get clientHeight(){return 0;}
 querySelectorAll(sel){const parts=parse(sel),out=[],walk=n=>{for(const c of n.children){if(matches(c,parts,this))out.push(c);walk(c);}};walk(this);return out;}
 querySelector(sel){return this.querySelectorAll(sel)[0]||null;}
 closest(sel){const parts=parse(sel);for(let n=this;n&&n.tagName;n=n.parentNode)if(matches(n,parts,null))return n;return null;}
}
class Doc{
 constructor(){this.documentElement=new El(this,'html');this.body=new El(this,'body');this.documentElement.append(this.body);}
 createElement(t){return new El(this,t);}createElementNS(ns,t){return new El(this,t);}
 node(x){return typeof x==='string'?new Text(this,x):x;}
 querySelector(s){return this.documentElement.querySelector(s);}querySelectorAll(s){return this.documentElement.querySelectorAll(s);}
 addEventListener(){}
}

// ---------- the chest module with a clock that the test moves ----------
function chestPage(store=new Map()){
 const doc=new Doc(),timers=[],sounds=[];let clock=Date.UTC(2026,9,4,3,0,0),seq=0;
 const add=(fn,ms,every)=>{const t={id:++seq,fn,at:clock+ms,every};timers.push(t);return t.id;};
 const drop=id=>{const i=timers.findIndex(t=>t.id===id);if(i>=0)timers.splice(i,1);};
 const advance=ms=>{const end=clock+ms;for(;;){const due=timers.filter(t=>t.at<=end).sort((a,b)=>a.at-b.at)[0];if(!due)break;clock=due.at;if(due.every){due.at+=due.every;}else timers.splice(timers.indexOf(due),1);due.fn();}clock=end;};
 class FakeDate extends Date{static now(){return clock;}}
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const ctx={console,document:doc,JSON,Math,Object,Array,Map,Set,Number,String,Promise,Date:FakeDate,localStorage,
  setTimeout:(fn,ms=0)=>add(fn,ms,0),clearTimeout:drop,setInterval:(fn,ms)=>add(fn,ms,ms),clearInterval:drop,requestAnimationFrame:fn=>add(fn,16,0),
  ResizeObserver:class{observe(){}disconnect(){}},MutationObserver:class{observe(){}disconnect(){}},Image:class{},
  CRPGShell:{icon:()=>new El(doc,'svg'),toast(){},extraTiles:[],sceneryHooks:[],menuHooks:[]},CRPGSound:{play:n=>sounds.push(n)}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(src('app_chests_v01415.js'),ctx,{filename:'app_chests_v01415.js'});
 const open=p=>{const box=doc.createElement('div');box.className='ch-box';const body=doc.createElement('div');body.className='ch-body';box.append(body);doc.body.append(box);
  ctx.CRPGChests.games.SPOT(p,body,()=>{});return {box,body,wrap:body.querySelector('.ch-spot'),A:body.querySelector('.spot-pic'),hint:body.querySelectorAll('button').find(b=>b.textContent==='힌트'),
   lives:()=>body.querySelectorAll('.ch-lives b').map(b=>b.className).join(','),banner:()=>body.querySelector('.ch-rest')};};
 return {doc,ctx,store,sounds,open,advance,now:()=>clock};
}
const puzzle=(subtle=false)=>({count:3,radius:7,subtle,diffs:[{x:20,y:30,kind:'hue',turn:0,icon:0},{x:55,y:60,kind:'hue',turn:0,icon:1},{x:80,y:25,kind:'hue',turn:0,icon:2}]});
// A press that misses: the picture has no size in this model, so no change is near it.
const miss=(page,b)=>{b.A.onclick({clientX:1,clientY:1});page.advance(800);};

check('Mond spot game: five misses rest the board for 30 seconds (empty hearts, dimmed board, a countdown, no hint, presses ignored), then the chances come back',()=>{
 const page=chestPage(),b=page.open(puzzle(false));
 assert.equal(b.lives(),'on,on,on,on,on');assert.match(b.body.textContent,/기회를 다 쓰면 30초 쉰 뒤 처음부터 다시 찾습니다/);
 for(let i=0;i<4;i++)miss(page,b);assert.equal(b.lives(),'on,off,off,off,off');assert.equal(b.banner(),null,'one chance left: no rest yet');
 b.A.onclick({clientX:1,clientY:1});
 assert(b.wrap.classList.contains('resting'));assert.equal(b.lives(),'off,off,off,off,off');
 assert.match(b.banner().textContent,/기회를 다 써서 처음부터 다시 찾습니다/);assert.match(b.banner().textContent,/30초 뒤에 다시 찾을 수 있습니다/);
 assert.equal(b.hint.disabled,true);assert.equal(b.hint.dataset.reason,'기회를 다 써서 쉬는 동안에는 힌트를 쓸 수 없습니다.');
 const marks=b.body.querySelectorAll('.spot-mark').length;b.A.onclick({clientX:1,clientY:1});assert.equal(b.body.querySelectorAll('.spot-mark').length,marks,'a press during the rest does nothing');
 page.advance(10000);assert.match(b.banner().textContent,/20초 뒤에/);
 page.advance(20250);assert.equal(b.banner(),null);assert(!b.wrap.classList.contains('resting'));assert.equal(b.lives(),'on,on,on,on,on');assert.equal(b.hint.disabled,false);
 assert.equal(page.store.get('crpg-spot-rest'),'{}','nothing left to remember');
 miss(page,b);assert.equal(b.lives(),'on,on,on,on,off','the board plays again');
});

check('the rest belongs to the puzzle: closing the window and opening it again (or a reload) keeps counting down',()=>{
 const store=new Map(),page=chestPage(store),p=puzzle(false),b=page.open(p);
 for(let i=0;i<5;i++)miss(page,b);
 page.advance(10000);b.box.remove();
 const again=page.open(p);assert(again.wrap.classList.contains('resting'),'still resting when opened again');assert.match(again.banner().textContent,/(19|20)초 뒤에/);
 assert.equal(again.hint.disabled,true);
 // A reload: a new page with the same browser storage.
 const reloaded=chestPage(store),r=reloaded.open(p);assert(r.wrap.classList.contains('resting'),'still resting after a reload (stored)');
 const elsewhere={...puzzle(false),diffs:[{x:12,y:70,kind:'hue',turn:0,icon:3},{x:44,y:18,kind:'hue',turn:0,icon:4},{x:71,y:52,kind:'hue',turn:0,icon:5}]};
 const other=page.open(elsewhere);assert(!other.wrap.classList.contains('resting'),'another puzzle (another chest) is not resting');
});

check('Liyue spot game: three chances, then the same 30-second rest',()=>{
 const page=chestPage(),b=page.open(puzzle(true));assert.equal(b.lives(),'on,on,on');
 for(let i=0;i<3;i++)miss(page,b);assert(b.wrap.classList.contains('resting'));assert.equal(b.lives(),'off,off,off');
 page.advance(30500);assert.equal(b.lives(),'on,on,on');assert.equal(b.banner(),null);
});

check('the rest banner fits a phone (two lines, wraps between words) and a full window keeps its header',()=>{
 const css=src('shell.css');
 assert.match(css,/\.ch-reset\.ch-rest\{[^}]*white-space:normal[^}]*\}/);assert.match(css,/\.ch-reset\.ch-rest\{[^}]*max-width:min\(92%,380px\)/);
 assert.match(css,/:is\(\.pf-head,\.deal-head,\.ch-head,\.trade-head\)\{flex-shrink:0\}/);
});

check('the co-op corner button keeps to the field screen and leaves room under its lists',()=>{
 const coop=src('app_coop_v0153.js'),css=src('shell.css');
 assert.match(coop,/game\.s\.placeVisit\)return false;return String\(game\.s\.global\.SCREEN_MODE\|\|''\)==='LOCATION'/);
 assert.match(coop,/document\.body\.classList\.toggle\('cp-world-on',world\)/);
 assert.match(css,/body\.teyvat\.cp-world-on \.shell-loc-tabs>\.shell-panes\{padding-bottom:86px\}/);
});

const out=path.join(root,'reports','test_v01515.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(results,null,2));
console.log(JSON.stringify({ok:results.every(r=>r.ok),checks:results.length}));
