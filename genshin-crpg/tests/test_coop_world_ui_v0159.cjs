'use strict';
// 0.15.9 다인 모드 · 함께 다니기, the window and the corner button (app_coop_v0153.js), on a small page model:
// what is typed in the room's talk survives every redraw (a line from the room, the slow poll, the host moving), the
// corner button shows where the party is, folds after five seconds, opens again when something changes and stays away
// from the title and stories, and 「지도에서 보기」 opens the host's travel map on the suggested place.
// Also the phone's 「지도 열기」 landing on 「이동」, the quiet offline-pack failure and the operator's note in 「정보」.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
const results=[];
function check(name,fn){return Promise.resolve().then(fn).then(evidence=>{results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);},e=>{results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;});}

// ---------- a small page: nodes, selectors, focus that is lost when the focused node leaves the page ----------
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
 remove(){const p=this.parentNode;if(!p)return;const was=this.isConnected;p.childNodes.splice(p.childNodes.indexOf(this),1);this.parentNode=null;if(was)this.ownerDocument.gone(this);}
 before(...ns){const p=this.parentNode;if(!p)return;for(const n of ns.map(x=>this.ownerDocument.node(x))){n.remove();p.childNodes.splice(p.childNodes.indexOf(this),0,n);n.parentNode=p;}}
 after(...ns){const p=this.parentNode;if(!p)return;let ref=this;for(const n of ns.map(x=>this.ownerDocument.node(x))){n.remove();p.childNodes.splice(p.childNodes.indexOf(ref)+1,0,n);n.parentNode=p;ref=n;}}
 replaceWith(...ns){if(!this.parentNode)return;this.after(...ns);this.remove();}
 contains(n){for(;n;n=n.parentNode)if(n===this)return true;return false;}
}
class Text extends N{constructor(doc,t){super(doc);this.data=String(t);}get textContent(){return this.data;}set textContent(v){this.data=String(v);}}
class El extends N{
 constructor(doc,tag){super(doc);Object.assign(this,{tagName:tag.toUpperCase(),className:'',dataset:{},style:{},attrs:{},value:'',disabled:false,title:'',type:'',scrollTop:0,scrollHeight:0,clientHeight:0,listeners:{}});}
 get children(){return this.childNodes.filter(n=>n instanceof El);}
 get classList(){const el=this,list=()=>el.className.split(/\s+/).filter(Boolean);return {
  add:(...c)=>{el.className=[...new Set([...list(),...c])].join(' ');},remove:(...c)=>{el.className=list().filter(x=>!c.includes(x)).join(' ');},
  contains:c=>list().includes(c),toggle:(c,force)=>{const want=force===undefined?!list().includes(c):!!force;if(want)el.classList.add(c);else el.classList.remove(c);return want;}};}
 get textContent(){return this.childNodes.map(n=>n.textContent).join('');}
 set textContent(v){for(const n of [...this.childNodes])n.remove();if(v!==''&&v!==null&&v!==undefined)this.append(String(v));}
 get innerText(){return this.textContent;}
 append(...ns){for(const n of ns.map(x=>this.ownerDocument.node(x))){n.remove();this.childNodes.push(n);n.parentNode=this;}}
 prepend(...ns){for(const n of ns.map(x=>this.ownerDocument.node(x)).reverse()){n.remove();this.childNodes.unshift(n);n.parentNode=this;}}
 replaceChildren(...ns){const list=ns.map(x=>this.ownerDocument.node(x));for(const n of list)n.remove();for(const n of [...this.childNodes])n.remove();for(const n of list){this.childNodes.push(n);n.parentNode=this;}}
 insertBefore(n,ref){if(ref)ref.before(n);else this.append(n);return n;}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return k in this.attrs?this.attrs[k]:null;}removeAttribute(k){delete this.attrs[k];}hasAttribute(k){return k in this.attrs;}
 addEventListener(t,fn){(this.listeners[t]??=[]).push(fn);}
 focus(){if(this.isConnected)this.ownerDocument.activeElement=this;}
 setSelectionRange(){}
 getBoundingClientRect(){return {left:0,top:0,right:0,bottom:0,width:0,height:0};}
 querySelectorAll(sel){const parts=parse(sel),out=[],walk=n=>{for(const c of n.children){if(matches(c,parts,this))out.push(c);walk(c);}};walk(this);return out;}
 querySelector(sel){return this.querySelectorAll(sel)[0]||null;}
 closest(sel){const parts=parse(sel);for(let n=this;n&&n.tagName;n=n.parentNode)if(matches(n,parts,null))return n;return null;}
}
class Doc{
 constructor(){this.documentElement=new El(this,'html');this.body=new El(this,'body');this.documentElement.append(this.body);this.activeElement=this.body;this.focusLost=0;}
 createElement(t){return new El(this,t);}
 node(x){return typeof x==='string'?new Text(this,x):x;}
 // A focused node that leaves the page takes the focus with it (a phone's keyboard closes).
 gone(n){if(n.contains(this.activeElement)){this.activeElement=this.body;this.focusLost++;}}
 querySelector(s){return this.documentElement.querySelector(s);}querySelectorAll(s){return this.documentElement.querySelectorAll(s);}
 addEventListener(){}
}

// ---------- the game around the window ----------
const W0={map:'MAP_MOND_CITY',name:'몬드성',region:'몬드',safe:true,levels:[1,20],doing:'FIELD',place:null,day:1,time:'08:00'};
const PLAINS={...W0,map:'MAP_MOND_PLAINS',name:'몬드 외곽 초원',safe:false,levels:[1,2],time:'08:30'};
const hero=(name,level)=>({name,level,player:true,rarity:5,hp:800,atk:90,def:40,talents:{na:1,e:1,q:1},gear:[]});
function roomView(you,over={}){
 return {id:'R1',visibility:'PUBLIC',you,max:3,count:1,created:0,host:{name:'루미',pid:'h1',char:hero('루미',12),online:true},
  members:[{pid:'g1',name:'하루',char:hero('하루',10),ready:true,present:true,here:true,me:you==='GUEST',joined:0}],
  invites:[],battle:null,world:{...W0},suggest:null,log:[],now:0,...over};
}
function page(you='GUEST'){
 const doc=new Doc(),timers=[],toasts=[],sent=[],calls={openMap:0,choose:[]};let clock=0,listen=null,serverRoom=roomView(you);
 const advance=ms=>{clock+=ms;for(;;){const due=timers.filter(t=>t.at<=clock).sort((a,b)=>a.at-b.at)[0];if(!due)break;timers.splice(timers.indexOf(due),1);due.fn();}};
 const edges=[['E1','MAP_MOND_CITY','MAP_MOND_PLAINS','WORLD_MOVE','','','','','Y','','','ACTIVE'],['E2','MAP_MOND_CITY','MAP_MOND_FOREST','WORLD_MOVE','','','','','Y','','','ACTIVE']];
 const maps=new Map([['MAP_MOND_CITY',['MAP_MOND_CITY','몬드','몬드성']],['MAP_MOND_PLAINS',['MAP_MOND_PLAINS','몬드','몬드 외곽 초원']],['MAP_MOND_FOREST',['MAP_MOND_FOREST','몬드','속삭임의 숲']],['MAP_MOND_WINERY',['MAP_MOND_WINERY','몬드','다운 와이너리']]]);
 const game={s:{global:{SCREEN_MODE:'LOCATION',CURRENT_MAP_ID:'MAP_MOND_CITY'},runtime:null},playPhase:()=>'FREE',coopCharChoices:()=>[],coopLevelReason:()=>'',tables:{'32_MAP_DB':maps},rows:t=>t==='47_MAP_EDGE_DB'?edges:[]};
 const O={sessionStamp:()=>0,sameSession:()=>true,token:'token',account:{username:'tester'},active:true,pending:false,request:async(p,body)=>{
  sent.push([p,body]);
  if(p==='/coop/room')return {room:serverRoom,invites:[],me:{pid:you==='HOST'?'h1':'g1'}};
  if(p==='/coop/say'){const line={from:{name:you==='HOST'?'루미':'하루',pid:you==='HOST'?'h1':'g1',host:you==='HOST'},text:body.text,at:++clock};return {line};}
  if(p==='/coop/list')return {rooms:[]};
  return {};
 }};
 const ctx={console,document:doc,Date,Promise,JSON,Math,Object,Array,Map,Set,Number,String,
  setTimeout:(fn,ms=0)=>{const t={fn,at:clock+ms};timers.push(t);return t;},clearTimeout:t=>{const i=timers.indexOf(t);if(i>=0)timers.splice(i,1);},
  setInterval:()=>0,clearInterval:()=>{},requestAnimationFrame:fn=>{fn();return 0;},crypto:{randomUUID:()=>'x'},
  game,CRPGOnline:O,CRPGRuntime:{coopV0153:{turnMs:20000,text:{shared:'함께',solo:'혼자'}}},
  CRPGChat:{on:fn=>{listen=fn;},muted:new Set()},
  CRPGShell:{icon:()=>new El(doc,'svg'),toast:t=>toasts.push(t),extraTiles:[],openMap:()=>{calls.openMap++;}},
  NavigationUI:{choose:id=>calls.choose.push(id)},render(){}};
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(src('app_coop_v0153.js'),ctx,{filename:'app_coop_v0153.js'});
 const flush=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
 return {doc,ctx,C:ctx.CRPGCoop,game,O,toasts,sent,calls,advance,flush,emit:ev=>listen(ev),setRoom:r=>{serverRoom=r;},$:s=>doc.querySelector(s)};
}
const text=n=>n?n.textContent.replace(/\s+/g,' ').trim():'';

(async()=>{
await check('typing in the room’s talk survives a line from the room, the host moving and the slow poll: the same box keeps the words and the caret',async()=>{
 const P=page('GUEST');P.C.open();await P.flush();
 const input=P.$('.cp-talk-form input');assert(input,'the talk box');const state=P.$('.cp-state');
 input.focus();input.value='잠깐 기다려';input.oninput();assert.equal(P.doc.activeElement,input);
 P.emit({type:'coop',kind:'say',room:'R1',line:{from:{name:'루미',pid:'h1',host:true},text:'고마워요',at:1}});
 assert.equal(P.$('.cp-talk-form input'),input,'the same box');assert.equal(P.doc.activeElement,input,'still typing');assert.equal(input.value,'잠깐 기다려');
 assert.match(text(P.$('.cp-talk-log')),/루미 · 방장\s*고마워요/);assert.notEqual(P.$('.cp-state'),state,'the rest was drawn again');
 P.emit({type:'coop',kind:'moved',room:roomView('GUEST',{world:{...PLAINS},log:[{from:{name:'루미',pid:'h1',host:true},text:'고마워요',at:1}]}),battle:null});
 assert.match(text(P.$('.cp-where')),/몬드 외곽 초원/);assert.equal(P.$('.cp-talk-form input'),input);assert.equal(P.doc.activeElement,input);
 P.setRoom(roomView('GUEST',{world:{...PLAINS}}));await P.C.reload();await P.flush();
 assert.equal(P.$('.cp-talk-form input'),input,'after the slow poll too');assert.equal(P.doc.activeElement,input);assert.equal(P.doc.focusLost,0,'the focus never left');
 input.value='장비 바꿀게요';input.oninput();input.closest('.cp-talk-form').onsubmit({preventDefault(){}});await P.flush();
 assert.deepEqual(JSON.parse(JSON.stringify(P.sent.at(-1))),['/coop/say',{text:'장비 바꿀게요'}]);assert.equal(input.value,'');assert.equal(P.doc.activeElement,input,'ready for the next line');
 assert.match(text(P.$('.cp-talk-log')),/장비 바꿀게요/);
 return {focusLost:P.doc.focusLost};
});

await check('the corner button: the party’s place in two lines, folded to a round button after five seconds, open again when the place changes; never on the title or in a story',async()=>{
 const P=page('GUEST');P.C.open();await P.flush();assert.equal(P.$('body > .cp-pill'),null,'not while the window is open');
 P.C.close();P.advance(200);
 let pill=P.$('body > .cp-pill.world');assert(pill,'shown on the field');assert(!pill.classList.contains('compact'));
 assert.equal(text(pill.querySelector('strong')),'루미 님과 함께');assert.equal(text(pill.querySelector('small')),'몬드성');assert.match(pill.getAttribute('aria-label'),/루미 님과 함께 · 몬드성/);
 P.advance(5000);assert(pill.classList.contains('compact'),'folded');
 P.emit({type:'coop',kind:'moved',room:roomView('GUEST',{world:{...PLAINS}}),battle:null});
 pill=P.$('body > .cp-pill.world');assert(!pill.classList.contains('compact'),'opens on news');assert.equal(text(pill.querySelector('small')),'몬드 외곽 초원');
 assert(P.toasts.some(t=>/방장이 「몬드 외곽 초원」\(으\)로 이동했습니다/.test(t)),'and says so');
 P.advance(5000);assert(pill.classList.contains('compact'));
 P.game.s.global.SCREEN_MODE='STORY';P.ctx.render();assert.equal(P.$('body > .cp-pill'),null,'not in a story');
 P.game.s.global.SCREEN_MODE='LOCATION';P.ctx.render();assert(P.$('body > .cp-pill.world'),'back on the field');
 // 0.15.15: only the field screen (PR #20's screen pass: it could cover the last row of 관계 or 생활); room under its lists.
 assert(P.doc.body.classList.contains('cp-world-on'),'the field list keeps room under the button');
 P.game.s.global.SCREEN_MODE='RELATIONS';P.ctx.render();assert.equal(P.$('body > .cp-pill'),null,'not on menu screens such as 관계');assert(!P.doc.body.classList.contains('cp-world-on'));
 P.game.s.global.SCREEN_MODE='LOCATION';P.game.s.placeVisit={place:'PLACE_TEST'};P.ctx.render();assert.equal(P.$('body > .cp-pill'),null,'not inside a facility');
 P.game.s.placeVisit=null;P.ctx.render();assert(P.$('body > .cp-pill.world'),'back again on the field');
 P.O.active=false;P.ctx.render();assert.equal(P.$('body > .cp-pill'),null,'not on the title');assert(!P.doc.body.classList.contains('cp-world-on'));
});

await check('the host: a guest’s suggestion shows on the button (a dot) and in the room; 「지도에서 보기」 opens the travel map on that place',async()=>{
 const P=page('HOST');P.C.open();await P.flush();P.C.close();P.advance(200);
 const sug={from:{name:'하루',pid:'g1'},map:'MAP_MOND_WINERY',name:'다운 와이너리',region:'몬드',at:1};
 P.emit({type:'coop',kind:'suggest',room:roomView('HOST',{suggest:sug}),battle:null});
 assert(P.toasts.includes('하루 님이 「다운 와이너리」(으)로 가자고 합니다.'));
 const pill=P.$('body > .cp-pill.world');assert(pill.classList.contains('news'));assert.equal(text(pill.querySelector('strong')),'함께 다니는 중 · 손님 1명');assert.equal(text(pill.querySelector('small')),'제안 · 다운 와이너리 (하루)');
 P.setRoom(roomView('HOST',{suggest:sug}));pill.onclick();await P.flush();assert(P.C.node,'the button opens the room');
 assert.match(text(P.$('.cp-suggested')),/하루 님 · 「다운 와이너리」\(으\)로 가요/);
 P.$('.cp-suggested button').onclick();
 assert.deepEqual(P.calls.choose,['MAP_MOND_WINERY']);assert.equal(P.calls.openMap,1,'the shell’s 「지도 열기」 (the 이동 tab on a phone)');assert.equal(P.C.node,null,'the window closes');
 P.emit({type:'coop',kind:'moved',room:roomView('HOST',{world:{...W0,map:'MAP_MOND_WINERY',name:'다운 와이너리'}}),battle:null});
 assert(!P.$('body > .cp-pill.world').classList.contains('news'),'no dot once the party is there');
});

await check('a stat line on a narrow phone breaks between stats, never inside 「특성 1/1/1」',async()=>{
 const P=page('GUEST');P.C.open();await P.flush();
 const stats=P.$('.cp-char-stats');assert(stats);assert.deepEqual(stats.children.map(s=>s.textContent),['HP 800','공격 90','방어 40','특성 1/1/1']);
 assert.match(src('shell.css'),/\.cp-char-stats span\{white-space:nowrap\}/);
});

await check('the phone’s 「지도 열기」 always lands on 「이동」; a browser without the offline pack says nothing; 「정보」 has the operator’s note',async()=>{
 const shell=src('app_shell.js');
 assert(shell.includes('mobile-main-map')&&shell.includes('mobile-map-toggle'),'the map is always visible and can expand');
 assert(!src('app_revision.js').includes('오프라인 기능을 시작하지 못했습니다'),'no English browser error over the title');
 assert(shell.includes('원신(HoYoverse) 고객센터에 미리 문의했고, 공식 가이드라인과 비영리 범위 안에서 판단해 활동하라는 안내를 받았습니다. 공식 허가나 제휴를 뜻하지 않으며'));
 assert.match(shell,/p\.append\(head,note,guide,link\)/);
 assert(shell.includes('본 게임은 비영리 비공식 팬 프로젝트이며 HoYoverse의 공식 게임이 아닙니다.'),'the fan-project notice stays');
 assert(fs.readFileSync(path.join(root,'docs','FAN_PROJECT_KO.md'),'utf8').includes('공식 가이드라인과 비영리 범위 안에서 판단해 활동하라'));
});

const out=path.join(root,'reports','test_coop_world_ui_v0159.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(results,null,2));
console.log(JSON.stringify({ok:results.every(r=>r.ok),checks:results.length}));
if(!results.every(r=>r.ok))process.exitCode=1;
})();
