'use strict';
// Behavioural probes of the shared modal and responsive view state; real pixels are checked in the test browser.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=n=>fs.readFileSync(path.join(__dirname,'../source',n),'utf8');
const shell=source('app_shell.js');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
function node({hidden=false,z=0,visible=true,tag='DIV',inert=false}={}){return {hidden,isConnected:true,z,visible,tagName:tag,inert,children:[],getClientRects(){return visible?[{}]:[];},contains(n){return n===this||this.children.some(c=>c.contains(n));},querySelectorAll(){return this.children;},closest(){return null;},focus(){this.focused=true;},classList:{toggle(){}}};}
const roots=[],background=node(),trigger=node({tag:'BUTTON'});let active=trigger,native=null;
const doc={body:{children:[background],classList:{toggle(){}}},get activeElement(){return active;},querySelector:()=>native,querySelectorAll:()=>roots,addEventListener(){}};
const ctx=vm.createContext({S:{},document:doc,getComputedStyle:n=>({zIndex:String(n.z),display:n.visible?'block':'none'}),MutationObserver:class{observe(){}},queueMicrotask,console});
vm.runInContext(shell.slice(shell.indexOf('function topOverlay(){'),shell.indexOf('// Keep the item being read')),ctx);
test('closed full-screen windows cannot become the active input surface',()=>{roots.push(node({hidden:true,z:999}));assert.equal(ctx.S.topOverlay(),null);});
test('topmost modal wins and a native dialog has top-layer priority',()=>{const trade=node({z:335}),coop=node({z:2150});roots.push(trade,coop);assert.equal(ctx.S.topOverlay(),coop);native=node({tag:'DIALOG'});assert.equal(ctx.S.topOverlay(),native);native=null;roots.length=0;});
test('opening a modal makes the background inert and closing restores its prior state',()=>{background.inert=true;const modal=node({z:300}),button=node({tag:'BUTTON'});button.focus=()=>{active=button;};modal.children=[button];roots.push(modal);doc.body.children=[background,modal];ctx.syncOverlay();assert.equal(active,button);assert.equal(background.inert,true);roots.length=0;ctx.syncOverlay();assert.equal(background.inert,true);background.inert=false;roots.push(modal);active=trigger;ctx.syncOverlay();assert.equal(background.inert,true);roots.length=0;ctx.syncOverlay();assert.equal(background.inert,false);});
test('redrawing an open modal restores focus to its new controls',()=>{const modal=node({z:300}),button=node({tag:'BUTTON'});button.focus=()=>{active=button;};modal.children=[button];roots.push(modal);doc.body.children=[background,modal];ctx.syncOverlay();active=background;ctx.syncOverlay();assert.equal(active,button);roots.length=0;ctx.syncOverlay();});
test('a background widget added while a modal is open is also inert',()=>{const modal=node({z:300}),widget=node();roots.push(modal);doc.body.children=[background,modal];ctx.syncOverlay();doc.body.children.push(widget);ctx.syncOverlay();assert.equal(widget.inert,true);roots.length=0;ctx.syncOverlay();assert.equal(widget.inert,false);});
const keyCode=shell.slice(shell.indexOf("document.addEventListener('keydown',e=>{",shell.indexOf('// ---------- hotkeys ----------')),shell.indexOf('// Keep the HUD sound icon'));
function press(key,overlay,screen='STORY'){
 let listener,clicks=0,menus=0;const b={disabled:false,click(){clicks++;}};
 const box={document:{addEventListener:(t,h)=>listener=h},game:{s:{}},S:{screen,menu:null,scenery:null},busy:false,topOverlay:()=>overlay,$:()=>null,$$:s=>s==='.content .choice'?[b]:[],window:{CRPGHandbook:{isOpen:()=>false}},HOTKEYS:{b:'INVENTORY'},WORLD_SCREENS:new Set(['LOCATION']),openScreen(){menus++;},openMap(){menus++;}};
 vm.runInNewContext(keyCode,box);listener({key,target:{tagName:'BUTTON',closest:()=>b},preventDefault(){}});return {clicks,menus};
}
test('a trade/modal window blocks hidden story choices and navigation shortcuts',()=>{assert.equal(press('1',{}).clicks,0);assert.equal(press('b',{},'LOCATION').menus,0);assert.equal(press('1',null).clicks,1);assert.equal(press('b',null,'LOCATION').menus,1);});
test('the scenario guide waits during story and requires actual successful movement',()=>{const {fresh}=require('./helpers_v011.cjs'),r=fresh();assert.equal(r.tutorialDirective().id,'move');r.action('MENU',{screen:'STATUS'});assert.equal(r.tutorialDirective().id,'move');assert(source('app_tutorial.js').includes("['STORY','CUTIN','STORY_LOCKED']"));});
// The actual scroll restoration selects the new layout's scroll container, not the detached old one.
test('breakpoint restore follows the same recruitment card into a different scroll container',()=>{
 const newHost={parentElement:null,scrollTop:0,scrollHeight:2000,clientHeight:500,getBoundingClientRect:()=>({top:100})};const card={dataset:{viewKey:'recruit:NPC_XIANGLING'},parentElement:newHost,getBoundingClientRect:()=>({top:600})};
 const box={S:{},screenKey:()=> 'QUEST',document:{body:{},querySelectorAll:()=>[card]},getComputedStyle:()=>({overflowY:'auto'})};
 const code=shell.slice(shell.indexOf('function scrollHost('),shell.indexOf('S.captureView=captureView;'));
 vm.runInNewContext(code,box);box.restoreView({screen:'QUEST',anchor:{key:'recruit:NPC_XIANGLING',offset:-20}});assert.equal(newHost.scrollTop,520);
});
test('hidden remains global and the mobile chat control has a reserved dock slot',()=>{const css=source('shell.css');assert.match(css,/(?:^|\n)\[hidden\]\{display:none!important\}/);assert(css.includes('body.teyvat:has(>.chat-fab) nav.hud-nav{padding-right:60px}'));assert(css.includes('word-break:keep-all;overflow-wrap:anywhere'));});

// Run the real shell document handler with the real window handler in DOM bubbling order.
function modalKey(key,{kind='trade',typing=false,localSource=null,stage=null,chat=false,handbookBehind=false}={}){
 const calls={trade:0,handbook:0,menu:0,scenery:0,chat:0,back:0,local:0,skip:0,advance:0};
 const overlay=kind==='none'?null:{matches:s=>s==='.'+({trade:'trade-overlay',handbook:'handbook',wish:'wish-screen'}[kind]||kind)};
 const S={screen:'STORY',menu:kind==='menu'?overlay:null,scenery:kind==='scenery'?overlay:null};
 const handbook={isOpen:()=>kind==='handbook'||handbookBehind,close:()=>calls.handbook++};
 const trade={isOpen:()=>kind==='trade',close:()=>calls.trade++};
 const chatApi={open:chat,toggle:()=>calls.chat++};
 let shellListener,localListener;const e={key,target:{tagName:typing?'INPUT':'BUTTON',closest:()=>null},preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;}};
 const box={document:{addEventListener:(t,h)=>shellListener=h},game:{s:{}},S,busy:false,topOverlay:()=>overlay,$:s=>s==='dialog[open]'&&kind==='native'?overlay:s==='.shell-back'?{click(){calls.back++;}}:null,$$:()=>[],window:{CRPGHandbook:handbook,CRPGTrade:trade,CRPGChat:chatApi},CRPGHandbook:handbook,CRPGTrade:trade,CRPGChat:chatApi,HOTKEYS:{b:'INVENTORY'},WORLD_SCREENS:new Set(),toggleMenu:()=>calls.menu++,toggleScenery:()=>calls.scenery++,openScreen(){throw Error('background navigation');},openMap(){throw Error('background map');}};
 vm.runInNewContext(keyCode,box);
 if(localSource){
  const line=source(localSource).split('\n').find(l=>l.includes("wrap.addEventListener('keydown'"));
  vm.runInNewContext(line,{wrap:{addEventListener:(t,h)=>{if(t==='keydown')localListener=h;}},close:()=>calls.local++,minimize:()=>calls.local++});
  localListener(e);
 }
 if(!e.stopped)shellListener(e);
 if(kind==='wish'){
  const wish=source('app_wish_v01411.js'),code=wish.slice(wish.indexOf('function onKey('),wish.indexOf('function wallet('));
  const wishBox={UI:{stage:stage?{skip:()=>calls.skip++,advance:()=>calls.advance++}:null},close:()=>calls.local++,draw(){}};
  vm.runInNewContext(code,wishBox);wishBox.onKey(e);
 }
 return {calls,e};
}
test('Escape closes the top trade, handbook, menu and scenery; V also exits scenery',()=>{
 for(const kind of ['trade','handbook','menu','scenery'])assert.equal(modalKey('Escape',{kind}).calls[kind],1,kind);
 assert.equal(modalKey('v',{kind:'scenery'}).calls.scenery,1);
 assert.equal(modalKey('Escape',{kind:'none',chat:true}).calls.chat,1);
});
test('native Escape remains a browser cancellation and an unknown modal cannot close a window behind it',()=>{
 const native=modalKey('Escape',{kind:'native'});assert.equal(native.e.defaultPrevented,undefined);assert.equal(native.calls.menu,0);
 const unknown=modalKey('Escape',{kind:'other',handbookBehind:true,chat:true});assert.equal(unknown.calls.handbook,0);assert.equal(unknown.calls.chat,0);assert.equal(unknown.calls.menu,0);assert.equal(unknown.calls.back,0);
});
test('trade, mail, profile, raid, coop and chest own Escape even from an input',()=>{
 for(const localSource of ['app_trade.js','app_mail_v0151.js','app_profile_v01415.js','app_raid_v0152.js','app_coop_v0153.js','app_chests_v01415.js']){
  const {calls,e}=modalKey('Escape',{kind:'other',typing:true,localSource});assert.equal(calls.local,1,localSource);assert.equal(e.stopped,true,localSource);assert.equal(calls.menu,0,localSource);
 }
});
test('wish keeps Escape close/skip and Enter advance without triggering the background',()=>{
 assert.equal(modalKey('Escape',{kind:'wish'}).calls.local,1);
 assert.equal(modalKey('Escape',{kind:'wish',stage:true}).calls.skip,1);
 assert.equal(modalKey('Enter',{kind:'wish',stage:true}).calls.advance,1);
 assert.equal(modalKey('Escape',{kind:'wish'}).calls.menu,0);
});
console.log(passed+' UI audit regression checks passed (including modal cancellation)');
