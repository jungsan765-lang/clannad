'use strict';
// Executes production UI functions with a small DOM model. This does not verify browser layout or real-device input.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const read=n=>fs.readFileSync(path.join(__dirname,'../source',n),'utf8');
const shell=read('app_shell.js'),experience=read('app_experience.js');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
function element(tag='div',cls='',text=''){
 const attrs=new Map(),classes=new Set(cls.split(/\s+/).filter(Boolean)),events={};
 const n={tagName:tag.toUpperCase(),textContent:text,children:[],parentElement:null,dataset:{},hidden:false,disabled:false,inert:false,visible:true,visibility:'visible',isConnected:true,events,
  classList:{contains:k=>classes.has(k),add:k=>classes.add(k),remove:k=>classes.delete(k),toggle(k,on){on=on===undefined?!classes.has(k):on;if(on)classes.add(k);else classes.delete(k);return on;}},
  append(...nodes){for(const c of nodes){c.remove();c.parentElement=this;c.isConnected=this.isConnected;this.children.push(c);}},
  prepend(c){c.remove();c.parentElement=this;c.isConnected=this.isConnected;this.children.unshift(c);},
  replaceChildren(...nodes){for(const c of [...this.children])c.remove();this.append(...nodes);},
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=null;this.isConnected=false;},
  setAttribute(k,v){attrs.set(k,String(v));},getAttribute:k=>attrs.get(k)??null,hasAttribute:k=>attrs.has(k),
  addEventListener(k,fn){events[k]=fn;},contains(c){return c===this||this.children.some(x=>x.contains(c));},
  matches(s){if(s===':disabled')return this.disabled||!!this.disabledByFieldset;if(s==='[hidden],[inert]')return this.hidden||this.inert;if(s==='[data-view-key]')return !!this.dataset.viewKey;if(s[0]==='.')return this.classList.contains(s.slice(1));return this.tagName===s.toUpperCase();},
  closest(s){for(let p=this;p;p=p.parentElement)if(p.matches(s))return p;return null;},
  querySelectorAll(s){return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);},querySelector(s){return this.querySelectorAll(s)[0]||null;},
  getClientRects(){return this.visible?[{}]:[];},getBoundingClientRect(){return this.rect||{top:0,bottom:48,height:48};},
  focus(){this.onFocus?.();},click(){this.onclick?.();}
 };return n;
}
function guideHarness(){
 const body=element('body','teyvat'),notice=element(),slot=element('div','hud-guide-slot'),guide=element('section','learning-guide'),properties=new Map();
 guide.append(element('h2','','처음 만난 동료'),element('small','eyebrow','직접 해 보기 · 2 / 5'));body.append(notice,slot,guide);
 body.style={getPropertyValue:k=>properties.get(k)||'',setProperty:(k,v)=>properties.set(k,v)};
 const state={slot,notice,guide,pending:null,toast:null,overlay:null},listeners={};let resize;
 const $=(s,root)=>root?root.querySelector(s):s==='#notice'?notice:s==='#tutorial-tour'?state.guide:s==='main > aside .hud-guide-slot'?state.slot:s==='#root > .pending-action-notice'?state.pending:s==='#shell-toast.show'?state.toast:body.querySelector(s);
 const ctx={S:{guideOpen:true,guideMin:false},document:{body},window:{addEventListener:(type,fn)=>listeners[type]=fn},$: $, $$:s=>body.querySelectorAll(s),mk:element,icon:()=>element('svg'),topOverlay:()=>state.overlay,ResizeObserver:class{constructor(fn){resize=fn;}observe(n){assert.equal(n,notice);}}};
 vm.runInNewContext(shell.slice(shell.indexOf('function syncGuideBoundary(){'),shell.indexOf("if(typeof renderTutorial==='function')")),ctx);
 ctx.placeGuide();
 return {ctx,state,body,notice,slot,properties,listeners,resize,pop:()=>body.querySelector('.hud-guide-pop'),pill:()=>slot.querySelector('.hud-guide')};
}
test('ordinary notices move an open guide below their measured height and clearing restores it',()=>{
 const h=guideHarness();assert.equal(h.pop().hidden,false);h.notice.textContent='일상 교류 활동은 더 이상 없습니다.';h.notice.rect={height:48};h.ctx.syncGuideBoundary();
 assert.equal(h.properties.get('--shell-notice-offset'),'60px');assert.equal(h.pop().hidden,false);assert.equal(h.pill().getAttribute('aria-expanded'),'true');
 h.notice.rect={height:108.5};h.resize();assert.equal(h.properties.get('--shell-notice-offset'),'121px');
 h.notice.textContent='';h.ctx.syncGuideBoundary();assert.equal(h.properties.get('--shell-notice-offset'),'0px');assert.equal(h.pop().hidden,false);
});
test('temporary toast, modal and pending-save surfaces restore the requested guide after closing',()=>{
 for(const key of ['toast','overlay','pending']){const h=guideHarness();h.state[key]={};h.ctx.syncGuideBoundary();assert.equal(h.pop().hidden,true,key);assert.equal(h.pill().getAttribute('aria-expanded'),'false');assert.equal(h.ctx.S.guideOpen,true);h.state[key]=null;h.ctx.syncGuideBoundary();assert.equal(h.pop().hidden,false,key);assert.equal(h.pill().getAttribute('aria-expanded'),'true');}
});
test('guide minimize persists through a toast and can be reopened from its HUD control',()=>{
 const h=guideHarness();h.pop().querySelector('.hud-guide-min').click();assert.equal(h.ctx.S.guideMin,true);assert.equal(h.pop().hidden,true);
 h.state.toast={};h.ctx.syncGuideBoundary();h.state.toast=null;h.ctx.syncGuideBoundary();assert.equal(h.pop().hidden,true);assert.equal(h.ctx.S.guideOpen,false);
 h.pill().click();assert.equal(h.pop().hidden,false);assert.equal(h.ctx.S.guideMin,false);h.pill().click();assert.equal(h.pop().hidden,true);
});
test('requesting the guide during a toast survives the toast rather than inverting its intent',()=>{
 const h=guideHarness();h.state.toast={};h.ctx.syncGuideBoundary();h.pill().click();assert.equal(h.ctx.S.guideOpen,true);assert.equal(h.pop().hidden,true);
 h.state.toast=null;h.ctx.syncGuideBoundary();assert.equal(h.pop().hidden,false);
});
test('missing HUD slot hides the guide safely and restoring the slot makes it usable again',()=>{
 const h=guideHarness();h.state.slot=null;h.ctx.placeGuide();assert.equal(h.pop().hidden,true);h.state.slot=h.slot;h.ctx.placeGuide();assert.equal(h.pop().hidden,false);
 h.notice.textContent='알림';h.notice.rect={height:72};h.listeners.resize();assert.equal(h.properties.get('--shell-notice-offset'),'84px');
});
function modalHarness(){
 const body=element('body'),modal=element(),background=element('button'),state={active:background,top:modal},callbacks=[],listeners={},queue=[];
 body.append(background,modal);modal.setAttribute('aria-modal','true');
 const doc={body,get activeElement(){return state.active;},querySelector:()=>null,querySelectorAll:()=>state.top?[state.top]:[],addEventListener:(type,fn)=>listeners[type]=fn};
 const ctx={document:doc,S:{},getComputedStyle:n=>({zIndex:'100',display:n.visible?'block':'none',visibility:n.visibility}),queueMicrotask:fn=>queue.push(fn),MutationObserver:class{constructor(fn){callbacks.push(fn);}observe(n,options){state.observed=options;}}};
 modal.querySelectorAll=()=>modal.children.flatMap(c=>[c,...c.children]);
 vm.runInNewContext(shell.slice(shell.indexOf('function topOverlay(){'),shell.indexOf('// Keep the item being read')),ctx);
 const add=(n=element('button'))=>{n.onFocus=()=>state.active=n;modal.append(n);return n;};
 return {ctx,state,modal,add,callbacks,listeners,flush(){while(queue.length)queue.shift()();}};
}
test('modal keyboard controls exclude negative tabindex, disabled fieldsets and invisible or inert content',()=>{
 const h=modalHarness(),ordinary=h.add(),zero=h.add();zero.setAttribute('tabindex','0');
 const negative=h.add();negative.setAttribute('tabindex','-1');const disabled=h.add();disabled.disabled=true;disabled.setAttribute('tabindex','0');
 const fieldset=h.add();fieldset.disabledByFieldset=true;const invisible=h.add();invisible.visibility='hidden';const collapsed=h.add();collapsed.visibility='collapse';
 const inert=h.add();inert.inert=true;const hidden=h.add();hidden.hidden=true;const unrendered=h.add();unrendered.visible=false;
 assert.deepEqual(Array.from(h.ctx.modalControls(h.modal)),[ordinary,zero]);
});
test('Tab wraps between actual modal controls without landing on excluded puzzle board cells',()=>{
 const h=modalHarness(),first=h.add(),cell=h.add(),last=h.add();cell.setAttribute('tabindex','-1');h.state.active=last;
 const press=shift=>{let prevented=false;h.listeners.keydown({key:'Tab',shiftKey:shift,target:h.state.active,preventDefault(){prevented=true;},stopImmediatePropagation(){}});assert.equal(prevented,true);};
 press(false);assert.equal(h.state.active,first);press(true);assert.equal(h.state.active,last);
});
test('disabling or hiding the focused control restores focus to a remaining modal control',()=>{
 for(const [kind,value] of [['disabled',true],['disabledByFieldset',true],['inert',true],['visibility','hidden'],['visible',false]]){const h=modalHarness(),active=h.add(),next=h.add();h.state.active=active;active[kind]=value;h.ctx.syncOverlay();assert.equal(h.state.active,next,kind);}
});
test('shared mutation observer coalesces updates and refreshes both modal and tutorial boundaries',()=>{
 const h=modalHarness();h.add();let guideUpdates=0;h.ctx.S.syncGuideBoundary=()=>guideUpdates++;h.callbacks[0]();h.callbacks[0]();h.flush();assert.equal(guideUpdates,1);assert(h.state.observed.attributeFilter.includes('disabled'));assert(h.state.observed.attributeFilter.includes('inert'));
});
function relationsHarness(){
 const page=element(),openRelationMissions=new Set(['NPC_AMBER']),people=['NPC_AMBER','NPC_KAEYA'].map(profile=>({profile,name:profile,hearts:0,score:0,done:0,track:[{id:profile+'_1',status:'locked',short:'첫 만남',need:20}],activities:[]}));let renders=0;
 const ctx={game:{storyEntries:()=>[]},CRPGJournalPresenter:{relations:()=>people},el:element,button:(text,onclick)=>Object.assign(element('button','',text),{onclick}),portraitFor:()=>null,characterMeetingPlace:()=>null,relationNextLabel:()=>'',openRelationMissions,busy:false,render(){renders++;},returnToJourney(){}};
 vm.runInNewContext(experience.slice(experience.indexOf('function relationsScreen(p){'),experience.indexOf('let autoSavePaused=false;')),ctx);ctx.relationsScreen(page);
 return {ctx,page,openRelationMissions,renders:()=>renders};
}
test('a queued toggle from a replaced relation card cannot undo the subsequent collapse-all action',()=>{
 const h=relationsHarness(),box=h.page.querySelector('details'),collapse=h.page.querySelectorAll('button').find(n=>n.textContent==='모두 접기');assert.equal(box.open,true);collapse.click();assert.equal(h.openRelationMissions.size,0);assert.equal(h.renders(),1);
 box.isConnected=false;box.events.toggle();assert.equal(h.openRelationMissions.size,0);
 box.isConnected=true;box.open=true;box.events.toggle();assert.equal(h.openRelationMissions.has('NPC_AMBER'),true);box.open=false;box.events.toggle();assert.equal(h.openRelationMissions.has('NPC_AMBER'),false);
});
test('relationship card identity keeps the same person anchored when the scroll host changes at a breakpoint',()=>{
 const h=relationsHarness(),cards=h.page.querySelectorAll('.relationship-card');assert.deepEqual(cards.map(c=>c.dataset.viewKey),['relation:NPC_AMBER','relation:NPC_KAEYA']);
 const body=element('body'),oldHost=element(),newHost=element();Object.assign(oldHost,{scrollTop:250,scrollHeight:1200,clientHeight:400,rect:{top:80,bottom:480}});Object.assign(newHost,{scrollTop:0,scrollHeight:2000,clientHeight:600,rect:{top:64,bottom:664}});
 oldHost.append(...cards);cards[0].rect={top:-300,bottom:60};cards[1].rect={top:70,bottom:450};
 const ctx={S:{},screenKey:()=> 'RELATIONS',document:{body,querySelector:()=>({querySelectorAll:()=>cards}),querySelectorAll:()=>cards},getComputedStyle:()=>({overflowY:'auto'})};
 vm.runInNewContext(shell.slice(shell.indexOf('function scrollHost('),shell.indexOf('S.captureView=captureView;')),ctx);const captured=ctx.captureView();assert.equal(captured.anchor.key,'relation:NPC_KAEYA');assert.equal(captured.anchor.offset,-10);
 newHost.append(...cards);cards[1].rect={top:700,bottom:1100};ctx.restoreView(captured);assert.equal(newHost.scrollTop,646);assert.equal(oldHost.scrollTop,250);
});
console.log(passed+' UI boundary checks passed (synthetic DOM; no visual or device assertions)');
