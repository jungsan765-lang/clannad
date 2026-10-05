'use strict';
// 0.15.17 (the user's 2026-10-05 list): Tartaglia can be met again after the story on either route (an otherworlder could
// never walk back into the Golden House), 야타용왕 도전 구역 has a road at last, every puzzle with chances rests 30 seconds
// like 틀린 그림 찾기 (「지뢰찾기 이런 기회 있는것들은 전부 기다리는 시간을 가지게 하자 30초같은거」), the character screen opens
// on the member it was opened for, a companion's 운명의 별 shows its star, 메인스토리 leaves the top menu, and the battle
// playback has no skip (「결과 바로 보기가 전투스킵이잖아」).
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
const {fresh}=require('./helpers_v011.cjs');
const results=[];
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}

check('Tartaglia after the story: the Golden House opens both ways on either route once he is beaten, never during a story scene',()=>{
 const out={};
 for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){
  const g=fresh('MAP_LIYUE_HARBOR',route),into=g.row('47_MAP_EDGE_DB','EDGE_TRV_LIYUE_HARBOR_TO_GOLDEN_HOUSE'),back=g.row('47_MAP_EDGE_DB','EDGE_TRV_LIYUE_GOLDEN_HOUSE_TO_HARBOR');
  Object.assign(g.s.flags,{FLAG_ACCESS_REGION_LIYUE:true,FLAG_TRV_LY_GOLDEN_ACCESS:route==='ROUTE_TRAVELER',FLAG_TRV_LY_OSIAL_RELEASED:route==='ROUTE_TRAVELER'});
  const before=g.edgeReason(into);
  g.s.flags.FLAG_TRV_LY_TARTAGLIA_WON=true;assert.equal(g.liyueArtifactUnlocked('TARTAGLIA'),true);
  assert.equal(g.edgeReason(into),'',route+': the door opens after Tartaglia');assert(g.navigationRoute('MAP_LIYUE_GOLDEN_HOUSE'),route+': the route finder goes there');
  g.s.storyJourney={target:'MAP_LIYUE_GOLDEN_HOUSE',from:'MAP_LIYUE_HARBOR'};const story=g.edgeReason(into);delete g.s.storyJourney;
  g.s.global.CURRENT_MAP_ID='MAP_LIYUE_GOLDEN_HOUSE';assert.equal(g.edgeReason(back),'',route+': and lets the party out again');
  out[route]={before,story};
 }
 assert.notEqual(out.ROUTE_ISEKAI.before,'','an otherworlder still waits for the battle first');
 assert.notEqual(out.ROUTE_ISEKAI.story,'','a running story scene keeps its own door');
 assert.equal(out.ROUTE_TRAVELER.before,'','the traveller\'s chapter flag opens it as before');
 return out;
});

check('야타용왕 도전 구역: a road from 남천문 both ways, the boss route can be started there',()=>{
 const g=fresh('MAP_LY_DETAIL_NANTIANMEN','ROUTE_ISEKAI');g.s.flags.FLAG_ACCESS_REGION_LIYUE=true;
 const go=g.navigationRoute('MAP_AZHDAHA_DOMAIN');assert(go,'reachable');assert.deepEqual(JSON.parse(JSON.stringify(go.maps)),['MAP_LY_DETAIL_NANTIANMEN','MAP_AZHDAHA_DOMAIN']);
 g.move(go.edges[0][0]);assert.equal(g.s.global.CURRENT_MAP_ID,'MAP_AZHDAHA_DOMAIN');
 assert((g.placeEntries?.()||[]).some(p=>p.route==='BRT_AZHDAHA'),'the boss challenge is listed at the domain');
 assert.equal(g.placeBossReason('BRT_AZHDAHA','DIRECT'),'','and can be started');
 const home=g.navigationRoute('MAP_LY_DETAIL_NANTIANMEN');assert(home&&home.edges.length===1,'and the way back');
 assert.match(g.liyueArtifactFarmReason('AZHDAHA'),/야타용왕을 먼저 클리어해야 합니다/,'the crystal rematch still waits for the first win');
 return {minutes:Number(go.edges[0][5])};
});

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

// ---------- the chest and puzzle modules with a clock that the test moves ----------
function puzzlePage(store=new Map()){
 const doc=new Doc(),timers=[];let clock=Date.UTC(2026,9,5,3,0,0),seq=0;
 const add=(fn,ms,every)=>{const t={id:++seq,fn,at:clock+ms,every};timers.push(t);return t.id;};
 const drop=id=>{const i=timers.findIndex(t=>t.id===id);if(i>=0)timers.splice(i,1);};
 const advance=ms=>{const end=clock+ms;for(;;){const due=timers.filter(t=>t.at<=end).sort((a,b)=>a.at-b.at)[0];if(!due)break;clock=due.at;if(due.every){due.at+=due.every;}else timers.splice(timers.indexOf(due),1);due.fn();}clock=end;};
 class FakeDate extends Date{static now(){return clock;}}
 const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
 const ctx={console,document:doc,JSON,Math,Object,Array,Map,Set,Number,String,Promise,Date:FakeDate,localStorage,
  setTimeout:(fn,ms=0)=>add(fn,ms,0),clearTimeout:drop,setInterval:(fn,ms)=>add(fn,ms,ms),clearInterval:drop,requestAnimationFrame:fn=>add(fn,16,0),
  ResizeObserver:class{observe(){}disconnect(){}},MutationObserver:class{observe(){}disconnect(){}},Image:class{},
  CRPGShell:{icon:()=>new El(doc,'svg'),toast(){},extraTiles:[],sceneryHooks:[],menuHooks:[]},CRPGSound:{play(){}},
  CRPGRuntime:{chestRules:{puzzleV0152:{elements:['불','물','얼음','번개','바람','바위','풀']}}}};
 ctx.window=ctx;vm.createContext(ctx);
 for(const f of ['app_chests_v01415.js','app_puzzles_v0152.js'])vm.runInContext(src(f),ctx,{filename:f});
 // An open chest window (a puzzle acts only while its window is the open one).
 const open=(kind,p)=>{const box=doc.createElement('div');box.className='ch-box';const body=doc.createElement('div');body.className='ch-body';box.append(body);doc.body.append(box);ctx.CRPGChests.node=box;
  ctx.CRPGChests.games[kind](p,body,()=>{});return {box,body,banner:()=>body.querySelector('.ch-rest'),lives:()=>body.querySelectorAll('.ch-lives b').map(b=>b.className).join(','),
   button:text=>body.querySelectorAll('button').find(b=>b.textContent===text)};};
 return {store,open,advance};
}

check('폭발 꽃 찾기: with the chances gone the board rests 30 seconds (closed, dimmed, a countdown, presses ignored), then starts over',()=>{
 const store=new Map(),page=puzzlePage(store),p={n:4,bombs:[0,5],start:15,region:'LIYUE'},b=page.open('MINES',p);
 const cells=()=>b.body.querySelectorAll('.pz-mine'),opened=()=>cells().filter(c=>c.classList.contains('open')).length,grid=()=>b.body.querySelector('.pz-mines');
 assert.equal(b.lives(),'on,on');assert.match(b.body.textContent,/기회를 다 쓰면 30초 쉰 뒤 처음부터 다시 엽니다/);assert(opened()>0,'the start opens');
 cells()[0].onclick();page.advance(600);assert.equal(b.lives(),'on,off');assert.equal(b.banner(),null,'one chance left: no rest');
 cells()[5].onclick();page.advance(800);
 assert(grid().classList.contains('resting'));assert.equal(b.lives(),'off,off');assert.equal(opened(),0,'the board closes');
 assert.match(b.banner().textContent,/기회를 다 써서 처음부터 다시 엽니다/);assert.match(b.banner().textContent,/30초 뒤에 다시 할 수 있습니다/);
 cells()[15].onclick();assert.equal(opened(),0,'a press during the rest does nothing');
 page.advance(10000);assert.match(b.banner().textContent,/(19|20)초 뒤에/);
 // Closing the window and opening it again (or a reload) keeps counting down.
 b.box.remove();const again=page.open('MINES',p);assert(again.body.querySelector('.pz-mines').classList.contains('resting'),'still resting when opened again');
 const reloaded=puzzlePage(store).open('MINES',p);assert(reloaded.banner(),'still resting after a reload');
 assert(!page.open('MINES',{...p,bombs:[3,12]}).banner(),'another board is not resting');
 page.advance(20500);assert.equal(again.banner(),null);assert.equal(again.lives(),'on,on');assert(again.body.querySelectorAll('.pz-mine').some(c=>c.classList.contains('open')),'it starts over');
 assert.equal(store.get('crpg-spot-rest'),'{}','nothing left to remember');
 return {};
});

check('원소 암호: with every try used the board rests 30 seconds, the earlier tries stay readable, then the tries come back',()=>{
 const page=puzzlePage(),p={k:5,len:4,code:[0,1,2,3],max:2,region:'MOND'},b=page.open('MASTERMIND',p);
 const keys=()=>b.body.querySelectorAll('.pz-mm-key'),filled=()=>b.body.querySelectorAll('.pz-mm-slot').filter(s=>!s.classList.contains('empty')).length;
 const guess=()=>{for(let i=0;i<4;i++)keys()[4].onclick();b.button('확인').onclick();};
 assert.match(b.body.textContent,/다 쓰면 30초 쉰 뒤 같은 암호에 다시 도전합니다/);
 guess();assert.equal(b.banner(),null);guess();
 assert(b.banner(),'resting');assert.match(b.banner().textContent,/기회를 모두 썼습니다/);assert.match(b.banner().textContent,/30초 뒤에/);
 assert.equal(b.body.querySelectorAll('.pz-mm-row.old').length,2,'the two tries stay on the board');
 keys()[0].onclick();assert.equal(filled(),0,'no input while resting');
 page.advance(30500);assert.equal(b.banner(),null);assert.match(b.body.textContent,/시도 0 \/ 2/);
 keys()[0].onclick();assert.equal(filled(),1,'the board plays again');
 return {};
});

check('screens: the character screen opens on its member, 장비 변경 sits above 편성 해제, a companion\'s 운명의 별 shows its star',()=>{
 const shell=src('app_shell.js'),party=src('app_party.js'),gear=src('app_gear.js'),exp=src('app_experience.js');
 assert(shell.includes("S.focusGear=id=>{S.gearOwner=id||null;};")&&shell.includes("const wanted=S.gearOwner?cards.findIndex(c=>c.dataset.owner===S.gearOwner):-1;S.gearOwner=null;"),'the shell picks the asked member');
 assert(shell.includes('let cur=wanted>=0?wanted:Math.min(S.gearIndex||0,cards.length-1);'));
 assert(party.includes("who=button('',()=>{window.CRPGShell?.focusGear?.(id);act('MENU',{screen:'STATUS'});});"),'편성\'s member picture');
 assert(gear.includes('window.CRPGShell?.focusGear?.(pendingPick.owner);'),'가방\'s 「캐릭터 화면에서 장착하기」');
 const i=party.indexOf("button('장비 변경'"),j=party.indexOf("button('편성 해제'");assert(i>0&&j>i,'장비 변경 comes first');
 assert(exp.includes("const stella=/^STELLA_(?!FORTUNA_)(.+)$/.exec(d.id||'')")&&exp.includes("'STELLA_FORTUNA_'+((game?.premiumRarity?.(stella[1])||4)>=5?5:4)"),'4★ or 5★ star by the companion');
 const icons=JSON.parse(fs.readFileSync(path.join(root,'content/item-icons.json'),'utf8'));const all=JSON.stringify(icons);assert(all.includes('STELLA_FORTUNA_4')&&all.includes('STELLA_FORTUNA_5'),'both pictures exist');
 return {};
});

check('menus and battle: 메인스토리 leaves the top menu, the playback keeps 일시정지 and loses its skip buttons',()=>{
 const shell=src('app_shell.js'),av=src('app_av.js'),css=src('shell.css');
 assert(shell.includes("if(scr==='STORY'){b.classList.add('hud-story');b.hidden=true;continue;}"),'the story button is hidden from the bar');
 assert(/(?:^|\n)\[hidden\]\{display:none!important\}/.test(css),'and hidden means hidden');
 assert(shell.includes("if(['다음 표시','결과 바로 보기'].includes(b.textContent.trim()))b.remove();"),'skip buttons removed from the dock');
 assert(av.includes("controls.append(pause,button('다음 표시',()=>this.advance()),button('결과 바로 보기',()=>this.cancel()));"),'(app_av.js still builds them; it is not ours to edit)');
 assert(av.includes("pause=button('일시정지'"),'pause stays');
 const browser=fs.readFileSync(path.join(root,'tests/test_online_browser.mjs'),'utf8');
 assert(browser.includes("getByRole('button',{name:'결과 바로 보기',exact:true}).count(),0")&&!browser.includes("getByRole('button',{name:'결과 바로 보기',exact:true}).click()"),'the browser test no longer skips');
 assert(/\.pz-mines\.resting \.pz-mine\{/.test(css)&&css.includes('.pz-mm>.ch-rest{top:auto;bottom:6px;translate:-50% 0}'));
 return {};
});

const out=path.join(root,'reports','test_v01517.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(results,null,2));
console.log(JSON.stringify({ok:results.every(r=>r.ok),checks:results.length}));
