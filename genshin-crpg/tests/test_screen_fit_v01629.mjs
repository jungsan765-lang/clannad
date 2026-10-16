// 0.16.29 고정 화면 (user: 「그냥 화면을 완전히 고정시켜버려 … 휴대폰도 동일」, 「휴대폰에 여전히 짤리는 구간이 있다, 전부 찾아내서
// … 앞으로 더 추가시켜도 짤리지 않게 구조를 확실히 지정하자」). The game page has exactly two sizes (index.html): 1600x900 on a
// computer and 1280x720 on a tablet or an installed phone (0.16.41), so this test opens every screen at those sizes and fails on
// anything a player could not read whole: text or a control cut off by its box or the screen, a box that scrolls, a
// sideways-scrolling page, text ended with "…". Anything added later that does not fit fails here (npm run
// test:browser; in CI it reports, see the end). Screenshots go to evidence/screen-fit. FIT_SIZE=pc|phone and
// FIT_ONLY=main,bag narrow a run.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {onlineFixture,R,DB} from './helpers_online.mjs';
import {ENGINE_FINGERPRINT} from '../server/generated/engine.mjs';
if(process.env.CRPG_TEST_BACKEND==='do'){console.log(JSON.stringify({ok:true,skipped:'screens do not depend on the backend; checked in the D1 run'}));process.exit(0);}
// In CI the screens are looked at once, on the built pack (the source job has the shorter time limit).
if(process.env.CI&&!process.env.CRPG_TEST_DIST){console.log(JSON.stringify({ok:true,skipped:'checked on the built pack in CI'}));process.exit(0);}
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=resolve(import.meta.dirname,'..'),version=JSON.parse(readFileSync(resolve(root,'package.json'))).version,evidence=resolve(root,'evidence/screen-fit');mkdirSync(evidence,{recursive:true});
const TYPES={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.mp3':'audio/mpeg','.ogg':'audio/ogg','.woff2':'font/woff2'};
// Pictures not yet copied into a local dist come from the repository's own assets folder (the build copies them).
const server=createServer((req,res)=>{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1))||'index.html';if(path.includes('..')){res.writeHead(403).end();return;}const source=resolve(root,'source',path),built=resolve(root,'dist',path),file=!process.env.CRPG_TEST_DIST&&/\.(js|css|html)$/.test(path)&&existsSync(source)?source:!existsSync(built)&&existsSync(resolve(root,path))?resolve(root,path):built;try{res.setHeader('Content-Type',TYPES[extname(file)]||'application/octet-stream');let data=readFileSync(file);if(!process.env.CRPG_TEST_DIST&&path==='assets.js')data=data.toString().replace(/"appVersion":\s*"[^"]*"/,'"appVersion":'+JSON.stringify(version))+'\nwindow.CRPG_MANIFEST.engineVersion='+JSON.stringify(ENGINE_FINGERPRINT)+';';res.end(data);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
// 0.16.36 (user: 「진행하다가 12시 지나면 또 실패할 수 있으니, 생각 하고 다음 워크플로우 커밋해」): the run's clock starts on a
// Wednesday noon, Korean time — the server's here and every page's alike (time still flows) — so a run that starts late on
// a Sunday or crosses midnight sees one ordinary day throughout (the daily boss, region events, tasks, ley lines).
const CLOCK_SHIFT=Date.parse('2026-10-07T12:00:00+09:00')-Date.now();
{const RealDate=Date;class ShiftedDate extends RealDate{constructor(...a){if(a.length)super(...a);else super(RealDate.now()+CLOCK_SHIFT);}static now(){return RealDate.now()+CLOCK_SHIFT;}}globalThis.Date=ShiftedDate;}
const fixture=onlineFixture();await fixture.start();const INITIAL=fixture.read().state;// the new account as it starts (0.16.32 early views)
const ONLY=(process.env.FIT_ONLY||'').split(',').filter(Boolean),SIZES=[// 0.16.40: a computer's page is 1600×900
 // 0.16.41: a phone or a tablet shows the 1280×720 page (a phone reduces it to fit), looked at with touch.
 {name:'pc',width:1600,height:900},{name:'phone',width:1280,height:720},
 // On demand (FIT_EXTRA=1): the 1280×720 page with a mouse, and the old small phone page (the install guide still uses it).
 ...(process.env.FIT_EXTRA?[{name:'tablet',width:1280,height:720},{name:'phone760',width:760,height:352}]:[])].filter(s=>!process.env.FIT_SIZE||process.env.FIT_SIZE===s.name);
// A player well into the game: every companion, a full party, Mora, in Mondstadt.
function playerState(){
 const r=new R(DB,JSON.parse(fixture.read().state));if(r.s.runtime)r.action('COMBAT_FORFEIT',{reason:'TEST'});r.serverAdmin=true;
 r.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_CITY'});
 r.action('OPERATOR_DEBUG',{op:'recruit',char:'ALL'});r.action('OPERATOR_DEBUG',{op:'level',value:40});r.action('OPERATOR_DEBUG',{op:'mora',value:250000});
 for(const [slot,char] of [[2,'LIYUE_GANYU'],[3,'MOND_MONA'],[4,'LIYUE_BAIZHU']])try{r.action('PARTY',{slot,char});}catch(e){if(process.env.FIT_DEBUG)console.error('party',slot,char,e.message);}
 // 0.16.31: ore for the forge's enhance window (it opens only when an attempt can be paid).
 for(const [id,n] of [['ORE_IRON',60],['ORE_WHITE_IRON',40],['ORE_CRYSTAL',30]]){const i=r.s.inventory.find(x=>x.item===id&&!x.equip);if(i)i.quantity+=n;else r.s.inventory.push({slot:'ITEM_'+id,item:id,quantity:n,owner:'공용'});}
 const done=r.tutorialState?.().done;if(done)for(const k of ['combatAttack','combatGuard','combatSkill','combatBurst'])done[k]=true;
 r.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_CITY'});
 delete r.s.fieldBossWindow;// 0.16.43: every view may fight a field boss (three wins in 12 hours were used up by earlier views)
 return r;
}
// Runs in the page: everything on screen that a player could not read whole.
const SCAN=()=>{
 const W=innerWidth,H=innerHeight,out=[];
 // 0.16.40: the game's safety net (app_screen_v01629.js) kept a box from being cut — the screen still needs its own fix.
 for(const u of window.CRPGScreenSafety||[])out.push('safety net used · '+u);window.CRPGScreenSafety=[];
 const name=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(typeof e.className==='string'&&e.className.trim()?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'');
 const text=e=>(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,22);
 // Moving pictures and the travel map (dragged around on purpose) are not reading matter.
 const SKIP='.terrain-viewport,[aria-hidden="true"],.sfx-card,.sfx-zone,.sfx-look,.combat-light,.world-backdrop,.vfx-layer,.shell-splash,.toast,#toast,.sr-only,.task-gain,canvas';
 const shown=e=>{if(!e.isConnected||e.closest(SKIP))return false;const fold=e.closest('details:not([open])');if(fold&&fold!==e&&!e.closest('summary'))return false;const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<0.05)return false;const r=e.getBoundingClientRect();return r.width>1&&r.height>1;};
 const clips=e=>{const s=getComputedStyle(e);return s.overflowX!=='visible'||s.overflowY!=='visible';};
 const all=[...document.querySelectorAll('body *')].filter(shown),scrollers=new Set();
 // 0.16.41: a style that shows what the game hid (an empty dark bar stayed over the bottom of every map).
 for(const e of all)if(e.hidden&&!e.matches('dialog,details'))out.push('hidden but shown '+name(e));
 const se=document.scrollingElement;if(se.scrollWidth>W+1||se.scrollHeight>H+1)out.push('page scrolls '+se.scrollWidth+'x'+se.scrollHeight);
 for(const e of all){const s=getComputedStyle(e);
  const sy=/auto|scroll/.test(s.overflowY)&&e.scrollHeight>e.clientHeight+2,sx=/auto|scroll/.test(s.overflowX)&&e.scrollWidth>e.clientWidth+2;
  // A box that scrolls is one fault; what it hides below or beside it is not counted again.
  // the scenery (V) is a panorama panned sideways on purpose
  if(sx&&!sy&&e.matches('.scenery-pan'))continue;
  // 0.16.45: 읽은 이야기 scrolls on purpose (user: 「거긴 그냥 휠로 올리고 내려도 돼」)
  if(sy&&!sx&&e.matches('.history-scroll')){scrollers.add(e);continue;}
  if((sy||sx)&&![...scrollers].some(x=>x.contains(e))){scrollers.add(e);out.push('scrolls '+name(e)+' '+(sy?e.clientHeight+'/'+e.scrollHeight:e.clientWidth+'/'+e.scrollWidth+' wide'));}
  if(s.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1)out.push('… '+name(e)+' «'+text(e)+'»');
  const clamp=s.webkitLineClamp||s.getPropertyValue('-webkit-line-clamp');if(clamp&&clamp!=='none'&&e.scrollHeight>e.clientHeight+1)out.push('… lines '+name(e)+' «'+text(e)+'»');}
 // Words and controls cut by a box that hides what is outside it, or by the screen.
 const reading=all.filter(e=>![...scrollers].some(x=>x.contains(e))&&(e.matches('button,a,input,textarea,img,label')||[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())));
 // Only the outermost piece that is cut counts (a cut button, not also its words).
 const cutOnes=[];
 for(const e of reading){if(cutOnes.some(x=>x.contains(e)))continue;const r=e.getBoundingClientRect();const before=out.length;
  if((r.right>W+1||r.left<-1)&&e.closest('.scenery-pan'))continue;// panned into view
  if(r.right>W+1||r.bottom>H+1||r.left<-1||r.top<-1){out.push('off screen '+name(e)+' «'+text(e)+'»');cutOnes.push(e);continue;}
  // A popover (a hover note) is drawn on the top layer: the boxes around it in the page do not cut it.
  for(let a=e.parentElement;a&&a!==document.body;a=a.parentElement){if(a.matches(':popover-open'))break;if(!clips(a))continue;const b=a.getBoundingClientRect();
   const over=Math.max(r.bottom-b.bottom,r.right-b.right,b.top-r.top,b.left-r.left);
   if(over>1.5){out.push('cut '+name(e)+' «'+text(e)+'» by '+name(a)+' '+Math.round(over)+'px');break;}}
  if(out.length>before)cutOnes.push(e);}
 // 0.16.32 (user: 「개판인데? UI좀 잘 좀 보라고」 — a title squeezed to one letter a line, pages of two rows over empty room):
 // words squeezed into a column a letter or two wide, and a paged box whose page leaves more than a third of its room empty.
 for(const e of reading){if(cutOnes.includes(e))continue;const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();if(t.length<4)continue;
  const s=getComputedStyle(e),fs=parseFloat(s.fontSize)||12,r=e.getBoundingClientRect();if(r.width<fs*2.6&&r.height>fs*3.2)out.push('squeezed '+name(e)+' «'+text(e)+'»');}
 // 0.16.42 (user: 「글도 밀리고」 — 💬 drawn over the first letters of a choice): a mark drawn beside a control's words
 // (::before / ::after placed on it) that reaches into the words.
 for(const b of document.querySelectorAll('button,a,label,summary')){if(!shown(b)||!b.textContent.trim())continue;const bs=getComputedStyle(b);
  for(const [pseudo,side] of [['::before','Left'],['::after','Right']]){const s=getComputedStyle(b,pseudo);if(s.display==='none'||s.position!=='absolute'||/^(none|normal|""|'')$/.test(s.content))continue;
   const at=parseFloat(side==='Left'?s.left:s.right),w=parseFloat(s.width);if(!Number.isFinite(at)||!Number.isFinite(w)||w>=b.clientWidth*.5)continue;
   if(at+w>parseFloat(bs['padding'+side])+1)out.push('mark over words '+name(b)+' «'+text(b)+'» '+pseudo);}}
 // 0.16.42 (user: 「이어져있지도 않고」): a card split across pages that shows a part without its own title.
 for(const card of document.querySelectorAll('.paged .card,.paged article')){if(!shown(card))continue;const h=[...card.children].find(c=>/^H[2-4]$/.test(c.tagName));if(h&&h.hidden&&[...card.children].some(c=>c!==h&&!c.hidden&&c.getClientRects().length))out.push('card part without its title '+name(card)+' «'+text(h)+'»');}
 // 0.16.41: a short 「15,234 / 15,234」 broken over two lines (빠른 식사 after a fight).
 for(const e of reading){if(cutOnes.includes(e))continue;const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();if(t.length>26||!/^\D{0,8}[\d,.]+\s*\/\s*[\d,.]+\D{0,4}$/.test(t))continue;
  const rg=document.createRange();rg.selectNodeContents(e);const ys=[...rg.getClientRects()].filter(r=>r.width>0).map(r=>r.top);if(ys.length>1&&Math.max(...ys)-Math.min(...ys)>6)out.push('number broken '+name(e)+' «'+text(e)+'»');}
 // 0.16.37 (TODO 8): a value wider than its cell that runs under the next label (the 능력치 tab showed 「1,219.2력」).
 for(const e of document.querySelectorAll('dd,td')){if(!shown(e)||getComputedStyle(e).overflowX!=='visible')continue;if(e.scrollWidth>e.clientWidth+2)out.push('spills '+name(e)+' «'+text(e)+'» '+(e.scrollWidth-e.clientWidth)+'px');}
 const top=document.querySelector('.ch-overlay')||document.querySelector('.shell-scenery')||document.querySelector('dialog[open]')||document.querySelector('.handbook');// what a window covers is not looked at
 for(const pager of document.querySelectorAll('.pane-pager')){if(!shown(pager)||top&&!top.contains(pager))continue;const box=pager.parentElement;if(!box?.querySelector('[data-paged][hidden]'))continue;const nums=[...pager.querySelectorAll('button.pane-page')];if(nums.at(-1)?.classList.contains('on'))continue;// the last page may end early
  const kids=[...box.children].filter(c=>c!==pager&&!c.hidden&&c.getClientRects().length);if(!kids.length)continue;const b=box.getBoundingClientRect(),bottom=Math.max(...kids.map(c=>c.getBoundingClientRect().bottom)),free=pager.getBoundingClientRect().top-bottom;
  // 0.16.36: a page that ends early because a whole card (never cut) comes next keeps its room (app_mainscreen_v0167.js marks it).
  if(free>b.height*.34&&free>60&&box.dataset.gap!=='card')out.push('half-empty page '+name(box)+' '+Math.round(free)+'px free');}
 // 0.16.35 (user: 「화면 저렇게 빈공간 있는거 보기 좀 별론데 … 아니면 창을 줄이던가」): a window much wider than what it shows.
 // What it shows is its words, pictures and controls — not the boxes around them, which span the window anyway.
 for(const dlg of document.querySelectorAll('dialog#modal[open]')){const body=dlg.querySelector('#modal-body')||dlg,br=body.getBoundingClientRect();if(br.width<420)continue;
  let left=Infinity,right=-Infinity;const take=r=>{if(r.width>0&&r.height>0){left=Math.min(left,r.left);right=Math.max(right,r.right);}};
  const walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);for(let n=walker.nextNode();n;n=walker.nextNode()){if(!n.textContent.trim()||!shown(n.parentElement))continue;const rg=document.createRange();rg.selectNodeContents(n);for(const r of rg.getClientRects())take(r);}
  for(const e of body.querySelectorAll('img,svg,canvas,input,button,.tile,.cm-chip'))if(shown(e))take(e.getBoundingClientRect());
  if(right>left){const empty=br.width-(right-left);if(empty>br.width*.35&&empty>180)out.push('window wider than it shows '+Math.round(empty)+'px empty');}}
 return [...new Set(out)];
};
const browser=await chromium.launch({headless:true,executablePath:process.env.CRPG_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const report={},errors=[];
try{
 for(const size of SIZES){
  const phone=size.name.startsWith('phone');
  const ctx=await browser.newContext({viewport:{width:size.width,height:size.height},isMobile:phone,hasTouch:phone,deviceScaleFactor:1,userAgent:phone?'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36':undefined});
  await ctx.addInitScript(shift=>{const RealDate=Date;class ShiftedDate extends RealDate{constructor(...a){if(a.length)super(...a);else super(RealDate.now()+shift);}static now(){return RealDate.now()+shift;}}window.Date=ShiftedDate;},CLOCK_SHIFT);
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(size.name+': '+e.message));
  await page.route('https://genshin-crpg-online.jungsan765.workers.dev/**',async route=>{const req=route.request(),body=req.postDataJSON(),path=new URL(req.url()).pathname;const o=await fixture.call(path,req.method()==='GET'?undefined:body),serverTime=Date.now();const status=o.status;delete o.status;await route.fulfill({status,headers:{'Content-Type':'application/json','X-Server-Time':String(serverTime),'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'X-Server-Time'},body:JSON.stringify(o)});});
  await page.addInitScript(({account,token})=>{localStorage.setItem('crpg-online-session-v1',JSON.stringify({account,token}));},{account:fixture.account,token:fixture.token});
  const idle=()=>page.waitForFunction(()=>typeof busy!=='undefined'&&!busy&&!(window.GameEffects&&GameEffects.active),{},{timeout:60000});
  fixture.seed(playerState().s);
  await page.goto(origin+(phone?'/?display=app':'/'));await page.locator('.title-start').click();await idle();
  await page.evaluate(()=>{window.__go=async s=>{if(document.body.dataset.shellScreen!==s||game.s.placeVisit)await act('MENU',{screen:s});await new Promise(r=>setTimeout(r,150));};
   window.__tap=(sel,label)=>{const b=[...document.querySelectorAll(sel)].find(x=>!label||(x.dataset.tab||x.textContent.trim())===label);b?.click();return !!b;};});
  const found={};report[size.name]=found;
  // One view: every page of each paged box, then the whole screen once more.
  const look=async(label)=>{await page.waitForTimeout(220);const add=list=>{if(list.length)found[label]=[...new Set([...(found[label]||[]),...list])].slice(0,16);};
   if(process.env.FIT_EVAL)console.log(label,JSON.stringify(await page.evaluate(process.env.FIT_EVAL).catch(e=>String(e))));
   add(await page.evaluate(SCAN));await page.screenshot({path:resolve(evidence,size.name+'-'+label.replace(/[^\w가-힣·-]+/g,'_')+'.png')});
   // A window or the handbook covers the screen: only its own page buttons are pressed.
   const pagers=page.locator((await page.locator('.ch-overlay').count())?'.ch-overlay .pane-pager':(await page.locator('.shell-scenery').count())?'.shell-scenery .pane-pager':(await page.locator('dialog[open]').count())?'dialog[open] .pane-pager':(await page.locator('.handbook').count())?'.handbook .pane-pager':'.pane-pager');
   // Pages are numbered buttons: every page is pressed and looked at, then the first is shown again.
   for(let k=0;k<await pagers.count();k++){const pager=pagers.nth(k);if(!(await pager.isVisible()))continue;const nums=pager.locator('button'),n=Math.min(12,await nums.count());
    for(let i=1;i<n;i++){await nums.nth(i).click();await page.waitForTimeout(80);add((await page.evaluate(SCAN)).map(x=>'page '+(i+1)+': '+x));if(process.env.FIT_PAGES)await page.screenshot({path:resolve(evidence,size.name+'-'+label.replace(/[^\w가-힣·-]+/g,'_')+'-p'+(i+1)+'.png')});}
    if(n>1&&await nums.nth(0).isVisible())await nums.nth(0).click();}};
  const view=async(label,code)=>{if(ONLY.length&&!ONLY.some(o=>label.startsWith(o)))return;if(process.env.FIT_TIMES)console.log('FIT_TIME',size.name,label,Math.round(performance.now()));try{await page.evaluate(code);await idle();await look(label);}catch(e){found[label]=['ERROR '+String(e.message).slice(0,160)];}
   // Close whatever the view opened: windows, the handbook, the menu.
   await page.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();try{window.CRPGHandbook?.close?.();window.CRPGChests?.close?.();window.CRPGShell?.toggleScenery?.(false);}catch{}if(window.CRPGShell?.menu)document.querySelector('.pm-close,.shell-menu-close')?.click();});await page.waitForTimeout(200);};
  const labels=sel=>page.evaluate(sel=>[...document.querySelectorAll(sel)].filter(x=>x.offsetParent).map(t=>t.dataset.tab||t.textContent.trim()),sel);
  await view('main',`__go('LOCATION')`);
  for(const tab of await labels('.shell-loc-side .shell-tab'))await view('main-'+tab,`(async()=>{await __go('LOCATION');__tap('.shell-loc-side .shell-tab',${JSON.stringify(tab)});})()`);
  // (user: 「그냥 어떤걸 눌러도 지도가 움직이지 않게 해 … 뭘 눌러도 화면이 찌그러지지는 않아야지」): choosing a place on the map
  // and taking it back leave the map exactly where and as big as it was.
  if(!ONLY.length||ONLY.some(o=>'map-still'.startsWith(o))){
   const still=await page.evaluate(async()=>{await __go('LOCATION');await new Promise(r=>setTimeout(r,300));
    const snap=()=>{const v=document.querySelector('.terrain-viewport'),r=v?.getBoundingClientRect(),m=document.querySelector('.shell-loc-main')?.getBoundingClientRect();return v?[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height),Math.round(v.scrollLeft),Math.round(v.scrollTop),Math.round(m.height)].join(','):'none';};
    const before=snap(),out=[];
    for(const sel of ['.terrain-node.open:not(.current)','.terrain-label.pressable']){const n=document.querySelector(sel);if(!n){out.push('nothing to press: '+sel);continue;}n.click();await new Promise(r=>setTimeout(r,250));
     const after=snap();if(after!==before)out.push('map moved after pressing '+sel+': '+before+' → '+after);
     if(!document.querySelector('.terrain-travel-dock:not([hidden])'))out.push('no travel bar after pressing '+sel);
     document.querySelector('[data-nav-focus="clear-target"]')?.click();await new Promise(r=>setTimeout(r,250));
     const back=snap();if(back!==before)out.push('map moved after clearing: '+before+' → '+back);}
    return out;});
   if(still.length)found['map-still']=still;}
  await view('party',`__go('PARTY')`);
  await view('party-formation',`(async()=>{await __go('PARTY');document.querySelector('.party-formation-open')?.click();})()`);
  await view('party-role',`(async()=>{await __go('PARTY');document.querySelector('.slot-role')?.click();})()`);
  await view('party-presets',`(async()=>{await __go('PARTY');document.querySelector('.party-preset-open')?.click();await new Promise(r=>setTimeout(r,150));document.querySelector('#modal .shell-preset-chip')?.click();})()`);
  await view('party-picker',`(async()=>{await __go('PARTY');document.querySelectorAll('.formation-slot .member-select')[1]?.click();})()`);
  await view('bag',`__go('INVENTORY')`);
  for(const i of [0,1,2,3,4])await view('bag-item'+i,`(async()=>{await __go('INVENTORY');const it=[...document.querySelectorAll('.bag-grid > *')][${i}];(it?.matches('button')?it:it?.querySelector('button')||it)?.click();})()`);
  await view('bag-more',`(async()=>{await __go('INVENTORY');const it=[...document.querySelectorAll('.bag-grid .bag-item')].find(b=>/\\+\\d/.test(b.textContent));it?.click();await new Promise(r=>setTimeout(r,200));document.querySelector('.bag-detail .fit-more')?.click();})()`);
  await view('character',`__go('STATUS')`);
  await page.evaluate(`__go('STATUS')`);
  for(const tab of await labels('.gear-member:not([hidden]) .gear-tab'))await view('character-'+tab,`(async()=>{await __go('STATUS');__tap('.gear-member:not([hidden]) .gear-tab',${JSON.stringify(tab)});})()`);
  // 0.16.31: the forge's enhance tab (who wears each piece in red) and its window with the one 「강화」 button.
  const forgeAt='(async()=>{if(game.s.placeVisit)await act(\'PLACE_LEAVE\',{});await __go(\'LOCATION\');const w=game.placeEntries().find(e=>/대장간/.test((e.name||\'\')+(e.facility||\'\')));if(w)await act(\'PLACE_ENTER\',{place:w.id});await new Promise(r=>setTimeout(r,250));[...document.querySelectorAll(\'.shell-worktabs button\')].find(b=>/강화/.test(b.textContent))?.click();await new Promise(r=>setTimeout(r,250));';
  await view('forge-enhance',forgeAt+'})()');
  await view('forge-confirm',forgeAt+'for(let i=0;i<20&&!document.getElementById(\'modal\')?.open;i++){[...document.querySelectorAll(\'.shell-forge-foot button\')].find(x=>/강화|돌파/.test(x.textContent)&&!x.disabled)?.click();await new Promise(r=>setTimeout(r,150));}})()');
  await view('forge-result',forgeAt+'for(let i=0;i<20&&!document.getElementById(\'modal\')?.open;i++){[...document.querySelectorAll(\'.shell-forge-foot button\')].find(x=>/강화|돌파/.test(x.textContent)&&!x.disabled)?.click();await new Promise(r=>setTimeout(r,150));}document.querySelector(\'#modal .enhance-go\')?.click();for(let i=0;i<80&&!document.querySelector(\'#modal[open] .enhance-banner\');i++)await new Promise(r=>setTimeout(r,150));})()');
  // 0.16.39 (user: 「특성은 왜 안고쳐? … 세로로 길어서 아래로 내리지도 못하겠고」): the talent and ascension windows, never opened before.
  for(const [label,fn] of [['growth-talent','openCharacterTalent'],['growth-ascend','openCharacterAscension']])await view(label,`(async()=>{await __go('STATUS');const owner=game.s.party.filter(p=>p.active&&p.source&&p.source!=='PLAYER_CUSTOM')[0]?.source||'PLAYER_CUSTOM';window.${fn}(owner);await new Promise(r=>setTimeout(r,250));})()`);
  // 0.16.31: the gear picker window (one screen, no inner scroll).
  await view('gear-picker',`(async()=>{await __go('STATUS');const b=[...document.querySelectorAll('.gear-slot')].find(x=>x.offsetParent);b?.click();})()`);
  await view('quest',`__go('QUEST')`);
  await page.evaluate(`__go('QUEST')`);
  for(const tab of await labels('.journal-tabs button'))await view('quest-'+tab,`(async()=>{await __go('QUEST');__tap('.journal-tabs button',${JSON.stringify(tab)});})()`);
  await view('relations',`__go('RELATIONS')`);
  await view('settings',`__go('SYSTEM')`);
  await view('guild',`(async()=>{await __go('LOCATION');const k=game.placeEntries().find(e=>['NPC_MOND_KATHERYNE','NPC_LIYUE_KATHERYNE'].includes(e.entity));if(k)await act('PLACE_ENTER',{place:k.id});})()`);
  for(const tab of await labels('.shell-place-tabs .shell-tab'))await view('guild-'+tab,`__tap('.shell-place-tabs .shell-tab',${JSON.stringify(tab)})`);
  // 0.16.34: the desk after the practice commission is reported — commissions taken, their rows with chips, one open card.
  {const r=new R(DB,JSON.parse(fixture.read().state));if(r.s.runtime)r.action('COMBAT_FORFEIT',{reason:'TEST'});const root='Q_TASK_LEARN_01';
   const k=r.placeCatalog().find(e=>e.entity==='NPC_MOND_KATHERYNE');try{if(!r.s.placeVisit)r.action('PLACE_ENTER',{place:k.id,mode:'TALK'});if(!r.s.quests[root]?.claimed){if(!r.s.quests[root]?.guildAccepted)r.action('COMMISSION_ACCEPT',{quest:root});r.action('CLAIM_QUEST',{quest:root});}}catch(e){console.error('guild root',e.message);}
   r.tutorialState().done.guildTasks=true;
   const took=[];for(const q of r.commissionEntries().filter(q=>!q.accepted&&q.row[0]!==root&&/^Q_TASK_/.test(q.row[0])&&!r.questUnlockReason(q.row[0])).slice(0,4))try{r.action('COMMISSION_ACCEPT',{quest:q.row[0]});took.push(q.row[0]);}catch(e){console.error('guild accept',e.message);}
   // 0.16.36: two of them done (the 「모두 보고」 bar), the others still going (the open card below)
   for(const id of took.slice(0,2)){const s=r.s.quests[id],d=JSON.parse(r.tables['22_QUEST_DB'].get(id)[10]);s.node=d.claim_node||'READY_TO_CLAIM';if(s.taskObjective)s.taskObjective.progress=s.taskObjective.definition.goal;}
   fixture.seed(r.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
   for(const tab of await labels('.shell-place-tabs .shell-tab'))await view('guild-open-'+tab,`__tap('.shell-place-tabs .shell-tab',${JSON.stringify(tab)})`);
   await view('guild-card',`(async()=>{const t=[...document.querySelectorAll('.shell-place-tabs .shell-tab')].find(b=>/의뢰/.test(b.textContent));t?.click();await new Promise(r=>setTimeout(r,200));document.querySelector('.cm-row.s-going')?.click();await new Promise(r=>setTimeout(r,200));document.querySelector('#modal[open] .commission-abandon-ask')?.click();})()`);}
  await page.evaluate(async()=>{if(game.s.placeVisit&&!game.actionReason('PLACE_LEAVE',{}))await act('PLACE_LEAVE',{});});await idle();
  // Every facility of the town, with each of its tabs (shop, forge, kitchen, inn, …).
  for(const place of await page.evaluate(()=>game.placeEntries().map(e=>({id:e.id,name:String(e.name||e.id)})))){
   const tag='place-'+place.name.replace(/\s+/g,'');
   await view(tag,`(async()=>{await __go('LOCATION');if(game.s.placeVisit)await act('PLACE_LEAVE',{});if(!game.actionReason('PLACE_ENTER',{place:${JSON.stringify(place.id)}}))await act('PLACE_ENTER',{place:${JSON.stringify(place.id)}});})()`);
   for(const tab of await labels('.shell-place-tabs .shell-tab'))await view(tag+'-'+tab,`__tap('.shell-place-tabs .shell-tab',${JSON.stringify(tab)})`);
   await page.evaluate(async()=>{if(game.s.placeVisit&&!game.actionReason('PLACE_LEAVE',{}))await act('PLACE_LEAVE',{});});await idle();}
  // The handbook's tabs, the map, the menu and the letters.
  for(const tab of ['journey','bosses','ley','abyss','companions','treasure','achievements'])await view('handbook-'+tab,`(async()=>{await __go('LOCATION');window.CRPGHandbook?.open?.(${JSON.stringify(tab)});})()`);
  // 0.16.47 고유명사 사전: the old spellings left in code and rules (「나선비경」 …) never reach the screen (app_glossary_v01647.js).
  await view('glossary-abyss',`(async()=>{await __go('LOCATION');window.CRPGHandbook?.open?.('abyss');await new Promise(r=>setTimeout(r,300));const t=document.body.innerText+' '+[...document.querySelectorAll('[title],[aria-label]')].map(e=>(e.title||'')+' '+(e.getAttribute('aria-label')||'')).join(' ');for(const w of Object.keys(window.CRPGGlossary?.display||{}))if(t.includes(w))throw Error('old spelling on screen: '+w);if(!t.includes('나선 비경'))throw Error('no 나선 비경');})()`);
  await view('map-window',`(async()=>{await __go('LOCATION');[...document.querySelectorAll('.hud-tools button')].find(b=>/^지도/.test(b.title||b.getAttribute('aria-label')||''))?.click();})()`);
  await view('menu',`(async()=>{await __go('LOCATION');document.querySelector('.hud-menu-button')?.click();})()`);
  await view('mail',`(async()=>{await __go('LOCATION');[...document.querySelectorAll('.hud-tools button')].find(b=>/우편/.test(b.title||b.getAttribute('aria-label')||''))?.click();})()`);
  // 0.16.36 (TODO 7): a pinned material — its chip on the map's head and a gold ring on every place it is found.
  await view('map-tracked',`(async()=>{await __go('LOCATION');for(const id of game.tables['14_ITEM_DB'].keys()){localStorage.setItem('crpg-track-v1',JSON.stringify({item:id,need:99}));if((window.CRPGTrack?.places?.()||[]).length>=2)break;}render();await new Promise(r=>setTimeout(r,300));})()`);
  await page.evaluate(()=>{try{localStorage.removeItem('crpg-track-v1');render();}catch{}});
  await page.keyboard.press('Escape').catch(()=>{});
  // A fight: before it starts, while choosing, and its result.
  if(!ONLY.length||ONLY.some(o=>'battle'.startsWith(o)||o.startsWith('battle')||o==='reward')){
   const r=playerState();r.startBattle('EG_MOND_HILI_PATROL','RANDOM');fixture.seed(r.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
   await view('battle-start',`Promise.resolve()`);
   await view('battle',`(async()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='전투 시작');b?.click();})()`);
   // 0.16.41 (user: 「전투하면서 버프량이 많아지거나 버프 이름이 길어지면 파티가 위아래로 너무 길어져서 상태도 안보이고」): every fighter
   // carrying nine effects, the longest names first.
   // … and four everyday ones with short names (「버프가 한개만 있으면 그건 좀」: more than one shows).
   {const base=fixture.read().state;const T=new R(DB,JSON.parse(base)).tables['13_STATUS_EFFECT_DB'],all=[...T.keys()].filter(id=>!/FORMATION|ROLE/.test(id)),len=id=>String(T.get(id)?.[1]||'').length;
    for(const [label,ids] of [['battle-buffs',[...all].sort((a,b)=>len(b)-len(a)).slice(0,9)],['battle-buffs-short',[...all].sort((a,b)=>len(a)-len(b)).slice(0,4)]]){
     const x=new R(DB,JSON.parse(base));if(!x.s.runtime)break;for(const a of x.s.runtime.actors)a.statuses=[...(a.statuses||[]),...ids.map(id=>({id,rounds:2}))];fixture.seed(x.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
     await view(label,`Promise.resolve()`);}
    {const x=new R(DB,JSON.parse(base));fixture.seed(x.s);await page.evaluate(()=>CRPGOnline.sync());await idle();}}
   const end=new R(DB,JSON.parse(fixture.read().state));end.serverAdmin=true;try{end.action('OPERATOR_DEBUG',{op:'battle_end',win:true});}catch{}fixture.seed(end.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
   await view('reward',`Promise.resolve()`);
  }
  // 0.16.35: a daily boss fight (the board glows in the boss's element; the keys beside the buttons) and the shop's multi-buy.
  if(!ONLY.length||ONLY.some(o=>o.startsWith('daily-boss')||o.startsWith('shop-bulk')||o.startsWith('cooking')||o.startsWith('story-page')||o.startsWith('domain')||o.startsWith('fieldboss'))){
   const r=playerState();r.serverAdmin=true;const api=globalThis.CRPGRuntime,c0=api?.enhancementConfig?.bosses?.BOSS_ANDRIUS;
   if(c0){try{const row=r.row('35_BOSS_ROUTE_DB',c0.route);r.s.flags[row[13]]=true;Object.assign(r.s.global,{CURRENT_MAP_ID:c0.map,SCREEN_MODE:'LOCATION'});r.s.bossRealAdmissions={};r.action('MOND_MATERIAL_CHALLENGE',{boss:'BOSS_ANDRIUS'});}catch(e){console.error('daily boss',e.message);}
    if(r.s.runtime){fixture.seed(r.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
     await view('daily-boss',`(async()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='전투 시작');b?.click();})()`);
     // ended with a win, so no defeat's recovery carries into the later views
     const won=new R(DB,JSON.parse(fixture.read().state));won.serverAdmin=true;try{won.action('OPERATOR_DEBUG',{op:'battle_end',win:true});}catch{}fixture.seed(won.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
     // 0.16.36 (TODO 7): the result of a daily boss — 다시 도전 · 빠른 식사 · 메인으로 in the same window.
     await view('daily-boss-result',`Promise.resolve()`);}
   // … and of a domain and of a field boss, won (다시 도전 open).
   const fight=(setup,label)=>{const x=playerState();x.serverAdmin=true;try{setup(x);}catch(e){console.error(label,e.message);}if(!x.s.runtime)return null;try{x.action('OPERATOR_DEBUG',{op:'battle_end',win:true});}catch(e){console.error(label,e.message);}return x;};
   const domain=fight(x=>{for(const m of x.tables['32_MAP_DB'].keys()){if(!/^MAP_D163_/.test(m))continue;try{x.action('OPERATOR_DEBUG',{op:'travel',map:m});}catch{continue;}const d=x.growthDomainEntries?.().find(e=>!e.reason);if(d){x.action('DOMAIN_START',{domain:d.id,element:d.elements?.[0]||d.element||undefined});break;}}},'domain result');
   if(domain){fixture.seed(domain.s);await page.evaluate(()=>CRPGOnline.sync());await idle();await view('domain-result',`Promise.resolve()`);}
   // 0.16.48 비경 피로: a tired party in a domain fight (the 「피로 N」 chip, on the computer only in CI) and its result (the 피로 strip,
   // the quick meal with a 피로 badge on each face and 「피로 3→1」 for the picked dish).
   {const x=playerState();x.serverAdmin=true;let started=false;
    try{const ids=x.s.party.filter(p=>p.active).map(p=>p.source);x.s.fatigue={version:1,stacks:Object.fromEntries(ids.map((id,i)=>[id,[3,1,2,4][i%4]]))};
     for(const [id,row] of x.tables['14_ITEM_DB'])if(['몬드 감자전','채식 전복','버섯고기말이','티바트 달걀 프라이'].includes(row[1]))x.giveItem(id,2);
     for(const m of x.tables['32_MAP_DB'].keys()){if(!/^MAP_D163_/.test(m))continue;try{x.action('OPERATOR_DEBUG',{op:'travel',map:m});}catch{continue;}const d=x.growthDomainEntries?.().find(e=>!e.reason);if(d){x.action('DOMAIN_START',{domain:d.id,element:d.elements?.[0]||d.element||undefined});started=!!x.s.runtime;break;}}}catch(e){console.error('fatigue',e.message);}
    if(started){fixture.seed(x.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
     if(!(process.env.CI&&size.name!=='pc'))await view('domain-fatigue-battle',`(async()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='전투 시작');b?.click();})()`);
     const won=new R(DB,JSON.parse(fixture.read().state));won.serverAdmin=true;try{won.action('OPERATOR_DEBUG',{op:'battle_end',win:true});}catch(e){console.error('fatigue end',e.message);}fixture.seed(won.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
     await view('domain-fatigue-result',`Promise.resolve()`);}}
   // 0.16.39 (user: 「비경도 지금 버튼 아래 없어서 지맥이 가려져」): the map of a domain, with each tab of the left column.
   {const x=playerState();x.serverAdmin=true;try{x.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_D163_VALLEY_OF_REMEMBRANCE'});}catch(e){console.error('domain map',e.message);}fixture.seed(x.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
    await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelector('.pm-close,.shell-menu-close')?.click();}).catch(()=>{});
    await view('domain-map',`__go('LOCATION')`);for(const tab of await labels('.shell-loc-side .shell-tab'))await view('domain-map-'+tab,`(async()=>{await __go('LOCATION');__tap('.shell-loc-side .shell-tab',${JSON.stringify(tab)});})()`);}
   const FB=globalThis.CRPGRuntime?.fieldBosses,boss='FB_ANEMO_HYPOSTASIS';
   const field=FB&&fight(x=>{x.action('OPERATOR_DEBUG',{op:'travel',map:FB.bosses[boss].map});const route=FB.route(boss);x.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});x.action('BOSS_ROUTE',{route,entry:'DIRECT'});},'field boss result');
   if(field){fixture.seed(field.s);await page.evaluate(()=>CRPGOnline.sync());await idle();await view('fieldboss-result',`Promise.resolve()`);}
   // 0.16.43 (user: 「전투 할때도 위에 뭔가 생기고 그러면 … 핸드폰쪽에서 자꾸 몬스터가 찌그러지거나」): a field boss fight going on (its
   // gimmick bar over the board), started and after a round; and this week's 변이 of the same boss.
   for(const [label,mutation] of [['fieldboss-battle',false],['fieldboss-battle-mutation',true]]){if(!FB)break;const x=playerState();x.serverAdmin=true;
    try{x.action('OPERATOR_DEBUG',{op:'travel',map:FB.bosses[boss].map});const route=FB.route(boss);x.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});x.action('BOSS_ROUTE',{route,entry:'DIRECT',...(mutation?{mutation:true}:{})});}catch(e){console.error(label,e.message);continue;}
    if(!x.s.runtime)continue;fixture.seed(x.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
    await view(label,`(async()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='전투 시작');b?.click();})()`);
    // CI: the 변이 fight's second round is left to local runs (~22 s a size of playback; the verify job's 20 minutes, 0.16.47).
    if(!(process.env.CI&&label==='fieldboss-battle-mutation'))await view(label+'-round2',`(async()=>{const b=document.querySelector('.battle-cards button[data-card-id]:not([disabled])');b?.click();await new Promise(r=>setTimeout(r,200));[...document.querySelectorAll('.battle-command button')].find(x=>/실행/.test(x.textContent)&&!x.disabled)?.click();})()`);
    const done=new R(DB,JSON.parse(fixture.read().state));done.serverAdmin=true;try{done.action('OPERATOR_DEBUG',{op:'battle_end',win:true});}catch{}fixture.seed(done.s);await page.evaluate(()=>CRPGOnline.sync());await idle();}
   // a lost field boss: its retry is this 「다시 도전」, and 메인 화면으로 leaves the route
   const lost=FB&&(()=>{const x=playerState();x.serverAdmin=true;try{x.action('OPERATOR_DEBUG',{op:'travel',map:FB.bosses[boss].map});const route=FB.route(boss);x.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});x.action('BOSS_ROUTE',{route,entry:'DIRECT'});x.action('COMBAT_FORFEIT',{reason:'TEST'});}catch(e){console.error('field boss lost',e.message);}return x.s.bossRouteProgress?.phase==='RETRY'?x:null;})();
   if(lost){for(const id of ['PLAYER_CUSTOM',...Object.keys(lost.s.chars||{})])try{if(id==='PLAYER_CUSTOM')lost.s.global.PLAYER_HP_CURRENT=lost.s.global.PLAYER_HP_MAX;else if(lost.s.chars[id])lost.s.chars[id].hp=lost.character(id).maxHp;}catch{}delete lost.s.defeatPenalty;fixture.seed(lost.s);await page.evaluate(()=>CRPGOnline.sync());await idle();await view('fieldboss-lost',`Promise.resolve()`);}}
   const s=playerState();fixture.seed(s.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
   await view('story-page',`(async()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());await __go('STORY');})()`);
   // 0.16.45: 읽은 이야기 with fifty lines — one list that scrolls, never pages
   await view('story-history',`(async()=>{await __go('STORY');for(let i=0;i<50;i++)sceneHistory.push({category:'GENERAL',speaker:i%2?'엠버':'이야기',text:'읽은 이야기 '+(i+1)+'번째 줄. 성문 앞에서 바람이 불었다.'});displayHistory();await new Promise(r=>setTimeout(r,300));if(!document.querySelector('#modal-body>.history-scroll'))throw Error('no scroll list');if(document.querySelector('#modal-body .pane-pager'))throw Error('paged');})()`);
   await view('shop-bulk',`(async()=>{await __go('LOCATION');const k=game.placeCatalog().find(e=>e.merchant==='MRC_MOND_RESTAURANT');if(k&&!game.s.placeVisit)await act('PLACE_ENTER',{place:k.id,mode:'SHOP'});await new Promise(r=>setTimeout(r,300));if(typeof showPurchaseQuantity==='function')showPurchaseQuantity('STK_MOND_SARA_EGG');})()`);
   // 0.16.48/49: the cooking hall's 회복 dishes show what they clear of 비경 피로 in each level band.
   await view('cooking',`(async()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(game.s.placeVisit)await act('PLACE_LEAVE',{});await __go('LOCATION');const k=game.placeCatalog().find(e=>e.id==='EVT_SCHEDULE_SERVICE_MOND_COOK');if(!k)throw Error('no cooking hall');await act('PLACE_ENTER',{place:k.id,mode:'CRAFT'});await new Promise(r=>setTimeout(r,300));const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='회복');b?.click();await new Promise(r=>setTimeout(r,250));if(!document.querySelector('.cook-fatigue-band'))throw Error('no 비경 피로 row on the cooking card');})()`);
  }
  // 0.16.46: the boss minigames' windows (조작 보스) — the four games before they start, and the wind dodge while it plays.
  // CI (run #336 was cancelled at 20:09 of the verify job's 20 minutes; these views were ~94 s of it locally): the computer page
  // only, the real fight and the running core; the six windows and the phone page are checked in local runs.
  if((!ONLY.length||ONLY.some(o=>o.startsWith('fb-mini')))&&!(process.env.CI&&size.name!=='pc')){
   const s=playerState();fixture.seed(s.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
   if(!process.env.CI)for(const [label,kind,extra] of [['fb-mini-anemo','ANEMO_DODGE',{orbs:5,maxHits:6}],['fb-mini-andrius','ANDRIUS_DODGE',{maxHits:6,orbs:0}],['fb-mini-cryo','CRYO_CHASE',{need:4}],['fb-mini-dvalin','DVALIN_SNIPE',{crystals:3,shots:6}],['fb-mini-tartaglia','TARTAGLIA_DODGE',{maxHits:6,orbs:0}],['fb-mini-azhdaha','AZHDAHA_DODGE',{maxHits:6,orbs:0}]])
    await view(label,`(async()=>{CRPGFieldBossMinigames.open({mini:{kind:'${kind}',id:1,seed:42,seconds:9,...${JSON.stringify(extra)}}});await new Promise(r=>setTimeout(r,200));if(!document.querySelector('.fb-mini canvas'))throw Error('no minigame');})()`);
   // CI: the two games in play are left to local runs (the verify job's 20 minutes); the real fight below still plays one.
   if(!process.env.CI)await view('fb-mini-azhdaha-play',`(async()=>{CRPGFieldBossMinigames.open({mini:{kind:'AZHDAHA_DODGE',id:1,seed:42,seconds:9,orbs:0,maxHits:6}});await new Promise(r=>setTimeout(r,150));[...document.querySelectorAll('.fb-mini button')].find(b=>b.textContent==='시작').click();await new Promise(r=>setTimeout(r,4600));})()`);
   if(!process.env.CI)await view('fb-mini-anemo-play',`(async()=>{CRPGFieldBossMinigames.open({mini:{kind:'ANEMO_DODGE',id:1,seed:42,seconds:9,orbs:5,maxHits:6}});await new Promise(r=>setTimeout(r,150));[...document.querySelectorAll('.fb-mini button')].find(b=>b.textContent==='시작').click();await new Promise(r=>setTimeout(r,4200));})()`);
   await page.evaluate(()=>CRPGFieldBossMinigames.close()).catch(()=>{});
   // and played from a real 무상의 바람 fight: its card, the start button, the window, the keys, the barrage landing in the fight
   const FBX=globalThis.CRPGRuntime?.fieldBosses;if(FBX){const x=playerState();x.serverAdmin=true;delete x.s.defeatPenalty;
    try{x.action('OPERATOR_DEBUG',{op:'travel',map:FBX.bosses.FB_ANEMO_HYPOSTASIS.map});const route=FBX.route('FB_ANEMO_HYPOSTASIS');x.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});x.action('BOSS_ROUTE',{route,entry:'DIRECT'});if(x.s.runtime?.opening?.state==='PENDING')x.action('COMBAT_BEGIN');
     const b=x.s.runtime,boss=b.actors.find(a=>a.source==='FB_ANEMO_HYPOSTASIS');boss.fb.next='BARRAGE';boss.airborne=false;b.fieldBoss.dodge={kind:'ANEMO',id:99,seed:7,round:b.round,result:null,playerActed:false};b.fieldBoss.telegraph={move:'BARRAGE',label:'바람 탄막',text:'',counter:''};
     fixture.seed(x.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
     await view('fb-mini-battle',`(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));const card=document.querySelector('button[data-card-id="SYS_FB_WIND_DODGE"]');if(!card)throw Error('no dodge card');if(!card.classList.contains('fb-mini-card'))throw Error('card not marked');if(![...document.querySelectorAll('.shell-enemies .st-chip')].some(c=>/핵 닫힘/.test(c.textContent)))throw Error('no shut-core chip');card.click();await w(300);
      const run=[...document.querySelectorAll('.battle-execute button')].find(b=>/시작/.test(b.textContent));if(!run)throw Error('no start button');run.click();await w(300);if(!document.querySelector('.fb-mini'))throw Error('no window');
      [...document.querySelectorAll('.fb-mini button')].find(b=>b.textContent==='시작').click();const key=(c,type)=>window.dispatchEvent(new KeyboardEvent(type,{code:c,bubbles:true}));
      for(let i=0;i<26;i++){const c=['KeyA','KeyW','KeyD','KeyS'][i%4];key(c,'keydown');await w(480);key(c,'keyup');}
      for(let i=0;i<40&&document.querySelector('.fb-mini');i++)await w(250);if(document.querySelector('.fb-mini'))throw Error('window stayed');for(let i=0;i<40&&!/바람 탄막 ·/.test(JSON.stringify(game.s.runtime?.log||game.s.global.LAST_BATTLE_RESULT_JSON));i++)await w(250);
      const landed=(game.s.runtime?.log||[]).filter(l=>l.card==='FB_BARRAGE'&&/발 적중 · 바람 원소 [0-9]개/.test(l.text||''));if(!landed.length)throw Error('barrage not in the fight log · '+(game.s.runtime?.log||[]).filter(l=>/탄막/.test(l.cardName||'')).map(l=>l.text).join(' / '));})()`);
    }catch(e){console.error('fb-mini-battle',e.message);}
    // (user: 「무상의 얼음은 일단 진행하면서 버그가 없나 한번 체크해줘. 전에는 UI가 밀리는 현상이 있었던거같은데」): its fight as it starts,
    // after its ice wall, and while its core runs (the chase card in the row).
    // CI: the core stage only (the verify job's 20 minutes).
    for(const stage of (process.env.CI?['core']:['start','wall','core']).filter(st=>!ONLY.length||ONLY.some(o=>('fb-mini-cryo-'+st).startsWith(o)||o.startsWith('fb-mini-cryo-'+st)))){const y=playerState();y.serverAdmin=true;delete y.s.defeatPenalty;
     try{y.action('OPERATOR_DEBUG',{op:'travel',map:FBX.bosses.FB_CRYO_HYPOSTASIS.map});const route=FBX.route('FB_CRYO_HYPOSTASIS');y.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});y.action('BOSS_ROUTE',{route,entry:'DIRECT'});if(y.s.runtime?.opening?.state==='PENDING')y.action('COMBAT_BEGIN');
      const b=y.s.runtime,boss=b.actors.find(a=>a.source==='FB_CRYO_HYPOSTASIS'),me=b.actors.find(a=>a.source==='PLAYER_CUSTOM');
      if(stage==='wall'){boss.fb.rot=3;boss.fb.endTurn=null;boss.turns=(boss.turns||0)+1;y.fieldBossTurn(boss);boss.fb.rot=1;boss.fb.endTurn=null;boss.turns++;y.fieldBossTurn(boss);}
      if(stage==='core'){boss.hp=1;y.applyDamage(me,boss,50,{element:'물리'});}
      fixture.seed(y.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
      await view('fb-mini-cryo-'+stage,stage==='core'?`(async()=>{if(!document.querySelector('button[data-card-id="SYS_FB_CRYO_CHASE"]'))throw Error('no chase card');if(![...document.querySelectorAll('.shell-enemies .st-chip')].some(c=>c.textContent.includes('냉기 핵 0/4')))throw Error('no core chip');})()`:`Promise.resolve()`);
     }catch(e){console.error('fb-mini-cryo-'+stage,e.message);}}}
  }
  // 0.16.40 (user: 「저렇게 되는것들은 도대체 언제 고칠거냐? 그냥 전체적으로 체크해야되는거 아니야?」 with pictures of screens this
  // check never opened): a commission being done where the party stands, 호감도 with every card opened, and a Liyue field map
  // with a pinned material, a far destination chosen and the window of Liyue's areas.
  if(!ONLY.length||ONLY.some(o=>/^(field-|relations-open|liyue)/.test(o))){
   await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelector('.pm-close,.shell-menu-close')?.click();}).catch(()=>{});
   {const x=playerState();const k=x.placeCatalog().find(e=>e.entity==='NPC_MOND_KATHERYNE');try{x.action('PLACE_ENTER',{place:k.id,mode:'TALK'});}catch{}
    try{x.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_01'});x.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_01'});}catch{}
    const field=q=>{const d=q.definition||{};return d.map_id&&(d.choices||[]).some(c=>!['leave','requirements'].includes(c.id));};let target=x.commissionEntries().find(q=>q.accepted&&!q.state?.claimed&&field(q))?.definition.map_id||null;
    if(!target)for(const q of x.commissionEntries().filter(q=>!q.accepted&&field(q)&&!x.questUnlockReason?.(q.row[0]))){try{x.action('COMMISSION_ACCEPT',{quest:q.row[0]});target=q.definition.map_id;break;}catch{}}
    try{if(x.s.placeVisit)x.action('PLACE_LEAVE',{});}catch{}
    if(target){try{x.action('OPERATOR_DEBUG',{op:'travel',map:target});}catch(e){console.error('field commission',e.message);}fixture.seed(x.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
     await view('field-commission',`(async()=>{await __go('LOCATION');__tap('.shell-loc-side .shell-tab','todo');})()`);}else console.error('field commission: none to take');}
   // 0.16.42 (user's pictures: a field commission's scene stood alone on page 3, its choices' first letters under 💬): a
   // commission with a scene, one wrong answer made, its card, the scene's window and the record's window.
   {const x=playerState();const k=x.placeCatalog().find(e=>e.entity==='NPC_MOND_KATHERYNE');try{x.action('PLACE_ENTER',{place:k.id,mode:'TALK'});}catch{}
    try{x.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_01'});x.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_01'});}catch{}
    // the cart on the plains (tests/test_quality_fixes_v01335.cjs): its first step's second answer is a mistake
    // the fixture account holds five commissions already (the most at once): give them up first
    for(const q of x.commissionEntries().filter(q=>q.accepted&&!q.state?.claimed&&q.row[0]!=='Q_MOND_EXP_PLAINS_CART'))try{x.action('COMMISSION_ABANDON',{quest:q.row[0]});}catch{}
    let id='Q_MOND_EXP_PLAINS_CART',map='MAP_MOND_PLAINS';try{if(!x.s.quests[id])x.action('COMMISSION_ACCEPT',{quest:id});}catch(e){console.error('field scene',e.message);id=null;}
    try{if(x.s.placeVisit)x.action('PLACE_LEAVE',{});}catch{}
    if(id){try{x.action('OPERATOR_DEBUG',{op:'travel',map});x.action('COMMISSION_PUZZLE',{quest:id,answer:1,step:0});}catch(e){console.error('field scene',e.message);}
     fixture.seed(x.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
     const todo=`await __go('LOCATION');__tap('.shell-loc-side .shell-tab','todo');await new Promise(r=>setTimeout(r,300));`;
     await view('field-scene',`(async()=>{${todo}})()`);
     await view('field-scene-window',`(async()=>{${todo}const b=[...document.querySelectorAll('.scene-open')].find(b=>b.offsetParent)||document.querySelector('.scene-open');if(!b)throw Error('no scene button');b.click();})()`);
     await view('field-scene-log',`(async()=>{${todo}document.querySelector('.scene-log-open')?.click();})()`);}else console.error('field scene: none to take');}
   {const x=playerState();fixture.seed(x.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
    await view('relations-open',`(async()=>{await __go('RELATIONS');[...document.querySelectorAll('.relationship-toggles button')].find(b=>/펼치기/.test(b.textContent))?.click();await new Promise(r=>setTimeout(r,400));})()`);}
   {const x=playerState();try{x.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_LY_DETAIL_DIHUA'});}catch(e){console.error('liyue map',e.message);}fixture.seed(x.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
    const liyueMap=`(async()=>{await __go('LOCATION');for(const id of game.tables['14_ITEM_DB'].keys()){localStorage.setItem('crpg-track-v1',JSON.stringify({item:id,need:765}));if((window.CRPGTrack?.places?.()||[]).some(m=>/^MAP_(LY|LIYUE)/.test(m)))break;}render();await new Promise(r=>setTimeout(r,200));const far=[...game.tables['32_MAP_DB'].keys()].find(m=>/^MAP_LIYUE_HARBOR$/.test(m));if(far&&typeof NavigationUI!=='undefined')NavigationUI.choose(far);await new Promise(r=>setTimeout(r,300));})()`;
    await view('liyue-map',liyueMap);
    await view('liyue-areas',`(async()=>{await __go('LOCATION');document.querySelector('.liyue-area-open')?.click();await new Promise(r=>setTimeout(r,300));})()`);
    await page.evaluate(()=>{try{localStorage.removeItem('crpg-track-v1');if(typeof NavigationUI!=='undefined')NavigationUI.choose(null);render();}catch{}});}
   // 0.16.41 (user's picture: 리월항 구역 안내 cut at the bottom of 시설, no page to turn to): Liyue Harbor with each tab.
   {const x=playerState();try{x.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_LIYUE_HARBOR'});}catch(e){console.error('liyue harbor',e.message);}fixture.seed(x.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
    for(const tab of await labels('.shell-loc-side .shell-tab'))await view('liyue-harbor-'+tab,`(async()=>{await __go('LOCATION');__tap('.shell-loc-side .shell-tab',${JSON.stringify(tab)});})()`);
    // 0.16.41 (user: 「이야기 소개라고 적혀있는거 건물 이름으로」): every other district of the harbour, its 시설 tab
    const districts=(x.liyueCityDirectory?.()||[]).map(d=>d.map).filter(m=>m&&m!=='MAP_LIYUE_HARBOR').slice(0,process.env.CI?2:99);// CI: two (the verify job's 20 minutes)
    for(const [i,map] of districts.entries()){const y=playerState();try{y.action('OPERATOR_DEBUG',{op:'travel',map});}catch(e){console.error('liyue district',map,e.message);continue;}fixture.seed(y.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
     await view('liyue-district'+(i+1)+'-places',`(async()=>{await __go('LOCATION');__tap('.shell-loc-side .shell-tab','places')||__tap('.shell-loc-side .shell-tab');})()`);}}
  }
  // 0.16.43 (user: 「이거도 왜 도전 버튼은 뒤에 있노...」 — 타르탈리아's card at 황금옥): every boss's place, each tab of the column:
  // the two Liyue farms, the daily bosses and the field bosses.
  if(!ONLY.length||ONLY.some(o=>o.startsWith('boss-place'))){
   await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.querySelector('.pm-close,.shell-menu-close')?.click();}).catch(()=>{});
   const api=globalThis.CRPGRuntime||{},maps=[...new Set(['MAP_LIYUE_GOLDEN_HOUSE','MAP_AZHDAHA_DOMAIN',...Object.values(api.enhancementConfig?.bosses||{}).map(b=>b.map),...Object.values(api.fieldBosses?.bosses||{}).map(b=>b.map)].filter(Boolean))].slice(0,process.env.CI?4:99);
   // 0.16.44: in CI (the verify job has 20 minutes, run #332 ran over) the two Liyue farms and two more places, their boss tab only
   for(const map of maps){const x=playerState();try{x.action('OPERATOR_DEBUG',{op:'travel',map});}catch(e){console.error('boss place',map,e.message);continue;}fixture.seed(x.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
    const short=map.replace(/^MAP_/,'').toLowerCase();
    for(const tab of (await labels('.shell-loc-side .shell-tab')).filter(t=>!process.env.CI||t==='activity'))await view('boss-place-'+short+'-'+tab,`(async()=>{await __go('LOCATION');__tap('.shell-loc-side .shell-tab',${JSON.stringify(tab)});})()`);}
   const back=playerState();fixture.seed(back.s);await page.evaluate(()=>CRPGOnline.sync());await idle();}
  // 0.16.32: an early journey as players see it (the 검증 account as it starts: a forest road, the story's next place,
  // a region event, level-ups after a fight), not only the finished town.
  if(!ONLY.length||ONLY.some(o=>o.startsWith('early'))){
   await page.evaluate(()=>document.querySelector('.pm-close,.shell-menu-close')?.click()).catch(()=>{});// the Escape above may have opened Paimon's menu
   // Lv. 5 with three Mond companions, a story break whose next scene is far away (the 임무 목적지 button and the
   // 「준비를 마치고 이야기 계속」 card), on the first Mond road that has today's region event.
   const early=()=>{const r=new R(DB,JSON.parse(INITIAL));if(r.s.runtime)r.action('COMBAT_FORFEIT',{reason:'TEST'});r.serverAdmin=true;
    // Each run is a new account, so today's events land on other maps: try the first roads, then every Mond map.
    const roads=['MAP_MOND_FOREST','MAP_MOND_PLAINS','MAP_MOND_WINDRISE','MAP_MOND_STARFELL','MAP_MOND_EAST_MINE'];
    for(const map of [...roads,...[...r.tables['32_MAP_DB'].keys()].filter(m=>/^MAP_MOND_/.test(m)&&!roads.includes(m))]){if(!r.regionEventAt(map))continue;try{r.action('OPERATOR_DEBUG',{op:'travel',map});}catch{continue;}if(r.regionEventHere?.().event)break;}
    r.action('OPERATOR_DEBUG',{op:'recruit',char:'ALL'});r.action('OPERATOR_DEBUG',{op:'level',value:5});
    /* the story in hand keeps the PARTY action shut; the party is set as the rules would */for(const [slot,char] of [[2,'MOND_AMBER'],[3,'MOND_LISA'],[4,'MOND_KAEYA']])try{r.setParty(char,slot);}catch(e){console.error('early party',char,e.message);}r.recalculate?.();
    const route=r.s.global.STORY_ROUTE_ID,row=r.storyIndex().byTable['55_MAIN_STORY_DB'].find(x=>x[0]===route&&x[4]);
    if(row){r.s.storyBreak={node:row[4],next:row[4],map:'MAP_STORMTERROR_LAIR',title:'결전 준비',prompt:'장비, 식사, 편성을 준비한 뒤 이 장소로 돌아오세요.',policy:''};r.s.global.STORY_WAITING=true;try{r.validateSave(JSON.parse(JSON.stringify(r.s)));}catch(e){console.error('early break',e.message);delete r.s.storyBreak;}}
    return r;};
   fixture.seed(early().s);await page.evaluate(()=>CRPGOnline.sync());await idle();
   await view('early-main',`__go('LOCATION')`);
   for(const tab of await labels('.shell-loc-side .shell-tab'))await view('early-main-'+tab,`(async()=>{await __go('LOCATION');__tap('.shell-loc-side .shell-tab',${JSON.stringify(tab)});})()`);
   // 0.16.35: the same road while the hero is knocked out (a lost fight): the column waits for the recovery.
   {const r=early();r.s.global.PLAYER_HP_CURRENT=0;r.s.global.SCREEN_MODE='LOCATION';fixture.seed(r.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
    await view('early-recover',`__go('LOCATION')`);
    await view('early-recover-story',`(async()=>{try{await act('MENU',{screen:'STORY'});}catch{}})()`);
    await view('early-recover-bag',`(async()=>{try{await act('MENU',{screen:'INVENTORY'});}catch{}})()`);
    const back=early();fixture.seed(back.s);await page.evaluate(()=>CRPGOnline.sync());await idle();}
   for(const tab of ['journey','bosses','ley','companions','treasure','achievements'])await view('early-handbook-'+tab,`(async()=>{await __go('LOCATION');window.CRPGHandbook?.open?.(${JSON.stringify(tab)});})()`);
   const r=early();r.startBattle('EG_MOND_SLIME_SMALL','RANDOM');fixture.seed(r.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
   const end=new R(DB,JSON.parse(fixture.read().state));end.serverAdmin=true;try{end.action('OPERATOR_DEBUG',{op:'battle_end',win:true});}catch{}fixture.seed(end.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
   await view('early-reward',`Promise.resolve()`);
   // The window of what a fight brought, with every member's level-up (it was a column of big headings, each with the same sentence).
   await view('early-levelup',`(()=>{const P=CRPGInventoryPresenter.create(game.db,MANIFEST),d=P.itemDetail({item:'MAT_STAINED_MASK',quantity:1});showReceivedLoot({entries:[d],mora:16,joins:[],levelUps:[{name:'검증',from:4,to:5},{name:'리사',from:4,to:5},{name:'엠버',from:4,to:5},{name:'케이아',from:4,to:5}]});})()`);
   // 0.16.32 「공명」: on the map of a resonant oculus (one with today's region event when there is one, the fuller page), the corner mark, then its catch game.
   {const r=early(),left=r.resonanceLeft?.()||[],pt=left.find(p=>r.regionEventAt(p.map))||left[0];if(pt){r.action('OPERATOR_DEBUG',{op:'travel',map:pt.map});fixture.seed(r.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
    await view('early-resonance',`__go('LOCATION')`);
    await view('early-catch',`(async()=>{await __go('LOCATION');await new Promise(r=>setTimeout(r,300));document.querySelector('button.resonance-mark')?.click();})()`);}}
   // A road with fishing but no rod yet: the card shows where a rod is sold (two shops split it into one-line pages).
   {const r=early();try{r.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_WINDRISE'});}catch(e){console.error('early fish',e.message);}fixture.seed(r.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
    for(const tab of await labels('.shell-loc-side .shell-tab'))await view('early-fish-'+tab,`(async()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());await __go('LOCATION');__tap('.shell-loc-side .shell-tab',${JSON.stringify(tab)});})()`);}
   // 0.16.33 보물상자: the stones and a chest in the scenery, the stone puzzle, the challenge window, a won challenge's result.
   {const r=early();r.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_CRPG_WHISPER_HUNT'});fixture.seed(r.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
    await view('early-chest-scenery',`(async()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());await __go('LOCATION');CRPGShell.toggleScenery(true);})()`);
    await view('early-chest-totem',`(async()=>{CRPGShell.toggleScenery(false);await __go('LOCATION');CRPGChests.start(game.chestsHere('SCENERY').find(x=>x.kind==='TOTEM'));})()`);}
   {const r=early();r.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_FOREST'});fixture.seed(r.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
    await view('early-chest-challenge',`(async()=>{CRPGChests.close();await __go('LOCATION');CRPGChests.start(game.chestsHere('SCENERY').find(x=>x.kind==='CHALLENGE'));})()`);
    const w=early();w.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_FOREST'});w.action('CHEST_OPEN',{chest:'CHEST_M26'});fixture.seed(w.s);await page.evaluate(()=>{CRPGChests.close();return CRPGOnline.sync();});await idle();
    const won=new R(DB,JSON.parse(fixture.read().state));won.serverAdmin=true;won.action('OPERATOR_DEBUG',{op:'battle_end',win:true});fixture.seed(won.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
    await view('early-chest-result',`Promise.resolve()`);}
  }
  await ctx.close();
 }
}finally{await browser.close();server.close();}
writeFileSync(resolve(evidence,'report.json'),JSON.stringify({report,errors},null,1));
const total=Object.values(report).reduce((n,f)=>n+Object.values(f).reduce((m,x)=>m+x.length,0),0);
// The console gets each view once with its first faults; the whole list is in evidence/screen-fit/report.json.
const brief=Object.fromEntries(Object.entries(report).map(([k,f])=>[k,Object.fromEntries(Object.entries(f).map(([v,x])=>[v,x.slice(0,Number(process.env.FIT_SHOW||5))]))]));
console.log(JSON.stringify({ok:total===0&&!errors.length,total,report:brief,errors:errors.slice(0,8)},null,1));
assert.equal(errors.length,0,'page errors: '+errors.slice(0,3).join(' | '));
// The Linux browser of CI draws Korean with other fonts (other widths) than the players' devices and this project's
// checks, so there a cut word is reported but does not stop a release; set FIT_STRICT=1 to make it stop there too.
if(process.env.CI&&!process.env.FIT_STRICT){if(total)console.warn('screen fit: '+total+' findings with CI fonts (report only; see evidence/screen-fit)');}
else assert.equal(total,0,'screens with text or controls a player cannot read whole (see evidence/screen-fit)');
