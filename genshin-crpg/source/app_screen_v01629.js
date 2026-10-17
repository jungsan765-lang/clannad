/* 0.16.29 고정 화면 (screen_v01629.css): the two fixed screens' layout helpers. Presentation only. Load after app_pages_v0167.js. */
(function(){
'use strict';
if(typeof render!=='function')return;
const stage=()=>document.documentElement.classList.contains('stage-phone')?'phone':'pc';
// The places one road away on the computer screen: a long list turns pages in its own column instead of scrolling.
function destinations(){const box=document.querySelector('.shell-loc-main .terrain-destinations');if(!box||stage()!=='pc')return;window.CRPGMainScreen?.pagePane?.(box,'dest|'+(game?.s?.global?.CURRENT_MAP_ID||''));}
// A card that must stay one card (the chosen item, …) steps everything in it down a little until it fits, never cut and
// never paged (user: 「<>버튼 너무 남발하는거같은데」).
// Below 81% the letters get too small to read: a card still too long then keeps its main lines and opens the rest in a
// window of its own (「자세히」), like KanColle's lists over a screen that never moves.
const ZOOMS=[1,.93,.87,.81];
const over=box=>box.scrollHeight>box.clientHeight+1;
function zoomDown(box){let i=0;box.style.setProperty('--fit','1');while(over(box)&&i<ZOOMS.length-1){i++;box.style.setProperty('--fit',String(ZOOMS[i]));}}
// 0.16.56: the shop's, forge's and kitchen's chosen card scrolls with the wheel instead (screen_v01629.css): whole letters, no 「자세히」.
const WHEEL='.market-layout>.market-detail,.shell-forge-scroll';
function fitBox(box){if(!box?.isConnected||!box.clientHeight)return;if(box.matches(WHEEL)){box.classList.remove('fit-box','fit-brief');box.style.removeProperty('--fit');for(const old of box.querySelectorAll(':scope>.fit-more,:scope>.shell-forge-hero>.fit-more'))old.remove();return;}box.classList.add('fit-box');box.classList.remove('fit-brief');for(const old of box.querySelectorAll(':scope>.fit-more,:scope>.shell-forge-hero>.fit-more'))old.remove();// 0.16.31: the one beside a forge card's name was left behind, so it showed twice.
 zoomDown(box);if(!over(box)||!box.matches('.bag-detail,.market-detail,.shell-forge-scroll'))return;
 const title=box.querySelector(':scope>h2,:scope h3')?.textContent||'자세히';
 const more=document.createElement('button');more.type='button';more.className='fit-more';more.textContent='자세히';
 more.onclick=()=>{const copy=document.createElement('div');copy.className='fit-more-card bag-detail-copy';
  for(const n of box.children){if(n===more||n.matches('button,.item-use-targets,.choice-note,.market-controls,.market-compare-label'))continue;copy.append(n.cloneNode(true));}
  if(typeof showModal==='function')showModal(title,copy);};
 // The button sits beside the name (a forge or kitchen card's picture row), never as a bar of its own.
 const hero=box.querySelector(':scope>.shell-forge-hero');if(hero){hero.append(more);}
 else{const anchor=box.querySelector(':scope>.item-effect')||box.querySelector(':scope>h2')?.nextElementSibling;anchor?anchor.after(more):box.prepend(more);}
 box.classList.add('fit-brief');zoomDown(box);}
// The bag: its items turn pages (the page stays while an item is chosen), its card fits.
function bag(){const grid=document.querySelector('.bag-cols .bag-grid');if(grid){const k=(typeof bagCategory!=='undefined'?bagCategory:'')+'|'+(typeof bagTrade!=='undefined'?bagTrade:'')+'|'+(typeof bagSort!=='undefined'?bagSort:'');window.CRPGMainScreen?.pagePane?.(grid,'bag|'+k);}
 fitBox(document.querySelector('.bag-cols .bag-detail'));}
// The shop: the chosen good's card fits.
// 0.16.56 (user: 「상점은... 이정도면 휠로 내릴 수 있어도 될 것 같은데?」): the shop's goods are one list scrolled with the wheel or a
// finger (screen_v01629.css), not pages; so are the forge's and the kitchen's recipes below.
function market(){
 fitBox(document.querySelector('.market-layout>.market-detail'));}
function forge(){
 // On the phone a recipe is a short row: its 「레시피」 mark moves out of the small picture to the row's end.
 if(stage()==='phone')for(const b of document.querySelectorAll('.shell-forge-list .shell-forge-tile-art>.shell-forge-tile-badge'))b.closest('.shell-forge-tile')?.append(b);
 for(const b of document.querySelectorAll('.shell-forge-scroll'))fitBox(b);}
if(typeof itemDetailView==='function'){const priorDetail=itemDetailView;itemDetailView=function(box,d){priorDetail(box,d);try{requestAnimationFrame(()=>fitBox(box));}catch{}};}
// ---------- 편성 (user: 「캐릭터 얼굴이 존나 안보이잖아」, 「좀 센스있게 안되나.. 보기 좋아보이진 않는데..」) ----------
// The four companions are four tall pictures across the whole screen with their name, element and level on the picture
// and one 역할 button under it; 진형 and 프리셋 are two buttons on the screen's bar that open their own windows. Nothing
// on the screen moves when something is chosen (the windows do the choosing). Presentation only: the same actions.
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const ELEMENT=/\[(불|물|얼음|번개|바람|바위|풀)\]/;
const roleOf=t=>window.CRPGRuntime?.formationConfig?.roles?.[t]||{};
let partyWindow=null;// 'presets' while the preset window is open (its contents follow the screen)
function windowOf(title,content,kind){partyWindow=kind||null;if(typeof showModal==='function')showModal(title,content);const m=document.getElementById('modal');m?.addEventListener('close',()=>{partyWindow=null;},{once:true});}
function roleWindow(n,id,current){
 const name=typeof ownerName==='function'?ownerName(id):id,box=mk('div','pick-window role-window'),rhythm=game.skillRhythm?.(id),ch=game.resonanceChance?.(id)||0;
 if(rhythm)box.append(mk('p','pick-window-note','원소전투 스킬 '+rhythm.e+'차례 · 원소폭발 '+rhythm.q+'차례마다'+(ch?' · 공명 각성 '+Math.round(ch*100)+'%':'')));
 const grid=mk('div','pick-window-grid');
 for(const t of game.partyTactics?.()||[]){const r=roleOf(t),b=mk('button','pick-window-option'+(t===current?' selected':''));b.type='button';b.setAttribute('aria-pressed',String(t===current));
  b.append(mk('strong','',(r.label||t)+(t===current?' ✓':'')),mk('span','',r.text||''));b.disabled=t===current||(typeof busy!=='undefined'&&busy);
  b.onclick=()=>{document.getElementById('modal')?.close();act('PARTY_TACTIC',{slot:n,tactic:t});};grid.append(b);}
 box.append(grid);windowOf('역할 · '+name,box);
}
function formationWindow(){
 const v=game.formationView?.();if(!v)return;const box=mk('div','pick-window formation-window'),grid=mk('div','pick-window-grid');
 box.append(mk('p','pick-window-note','파티의 역할이 진형의 조건에 맞으면 시너지가 붙습니다 (● 발동).'));
 for(const f of v.formations){const why=game.actionReason('FORMATION_SET',{formation:f.id}),b=mk('button','pick-window-option'+(f.selected?' selected':'')+(f.synergyActive?' synergy':''));b.type='button';b.setAttribute('aria-pressed',String(f.selected));
  b.append(mk('strong','',f.name+(f.selected?' ✓':'')),mk('span','',f.text),mk('small','',(f.synergyActive?'● 시너지 발동 · ':'시너지 · ')+f.synergy.text));
  b.disabled=f.selected||!!why||(typeof busy!=='undefined'&&busy);if(why)b.title=why;
  b.onclick=()=>{document.getElementById('modal')?.close();act('FORMATION_SET',{formation:f.id});};grid.append(b);}
 box.append(grid);windowOf('진형',box);
}
// The preset bar (app_party_v01411.js) is the screen's own, with its handlers: the window shows it, and after a press
// redraws the screen the window shows the new one.
function presetWindow(){const bar=document.querySelector('.party-cols .shell-presets');if(!bar)return;const box=mk('div','pick-window preset-window');box.append(bar);windowOf('편성 프리셋',box,'presets');}
function followPresets(){if(partyWindow!=='presets'||!document.getElementById('modal')?.open)return;const bar=document.querySelector('.party-cols .shell-presets'),box=document.querySelector('#modal-body .preset-window');if(bar&&box)box.replaceChildren(bar);}
// The computer screen keeps its own cards with the 프리셋 and 진형 beside them (user: 「편성은 컴퓨터쪽은 이전꺼가 확실히
// 좋았는데..」); the big pictures are the phone's.
// 0.16.39 (user: 「편성 담당부분 효과도 모르겠으니 그것도 좀 적어두면 좋겠고」): the computer's side column lists the five roles and what
// each does, the ones in the party lit with how many hold it (the same words as the cards' titles and the phone's window).
function roleLegend(){
 const side=document.querySelector('.party-cols .shell-col-side');if(!side||stage()!=='pc'||side.querySelector('.role-legend'))return;
 const used={};for(const p of game.s.party||[])if(p.active&&p.type==='CHAR')used[p.tactic||'균형']=(used[p.tactic||'균형']||0)+1;
 const box=mk('section','card role-legend');box.append(mk('h2','','담당'));const list=mk('ul','role-legend-list');
 for(const t of game.partyTactics?.()||[]){const r=roleOf(t),li=mk('li',used[t]?'on':'');li.append(mk('b','',String(r.label||t).replace(/\s*담당$/,'')),mk('span','',r.text||''));if(used[t])li.append(mk('small','role-legend-count',used[t]+'명'));list.append(li);}
 box.append(list);side.append(box);
}
function partyCards(){
 try{roleLegend();}catch(e){console.error('[role legend]',e);}
 const cols=document.querySelector('.party-cols');if(!cols||stage()!=='phone')return;cols.classList.add('party-styled');
 const tools=document.querySelector('.shell-page-head .shell-page-tools'),v=game.formationView?.();
 if(tools&&v&&!tools.querySelector('.party-formation-open')){const cur=v.formations.find(f=>f.selected);
  const f=mk('button','party-formation-open');f.type='button';f.append(mk('span','','진형 · '+(cur?String(cur.name).replace(/\s*진형$/,''):'—')));if(cur?.synergyActive){const d=mk('span','formation-dot on');d.setAttribute('aria-hidden','true');f.append(d);}f.title=cur?cur.name+' · '+cur.text:'진형';f.onclick=formationWindow;
  const p=mk('button','party-preset-open','프리셋');p.type='button';p.onclick=presetWindow;tools.prepend(f,p);}
 const owned=new Map((game.ownedActors?.()||[]).map(x=>[x.id,x]));
 for(const card of cols.querySelectorAll('.formation-slot'))try{if(card.classList.contains('slot-styled'))continue;card.classList.add('slot-styled');
  const who=card.querySelector('.member-select'),id=card.dataset.owner;if(!who||!id)continue;
  const n=Number(card.dataset.partySlot)||0,member=game.s.party.find(x=>x.slot==='PARTY_'+n&&x.active);
  let el='',icon=null;try{el=ELEMENT.exec(String(game.tables['07_CHAR_DB']?.get(id)?.[3]||''))?.[1]||'';icon=el&&typeof CRPGIcons!=='undefined'?CRPGIcons.element(el):null;}catch{}
  const plate=mk('span','slot-plate');
  const lv=id==='PLAYER_CUSTOM'?game.s.global.PLAYER_LEVEL_STATE:owned.get(id)?.level;
  if(icon){icon.classList?.add('slot-element');plate.append(icon);}plate.append(mk('strong','',typeof ownerName==='function'?ownerName(id):id));if(lv)plate.append(mk('small','','Lv.'+lv));
  who.querySelector(':scope>strong')?.remove();who.append(plate);
  const worn=who.querySelector(':scope>small');if(worn){worn.classList.add('slot-worn');}
  if(n>1&&member){const r=roleOf(member.tactic||'균형'),pill=mk('button','slot-role');pill.type='button';pill.append(mk('small','','역할'),mk('strong','',String(r.label||member.tactic||'균형').replace(/\s*담당$/,'')));pill.title=(r.label||'')+(r.text?' · '+r.text:'');
   const why=game.actionReason('PARTY_TACTIC',{slot:n,tactic:member.tactic})||game.actionReason('PARTY');if(why){pill.disabled=true;pill.title=why;}
   pill.onclick=()=>roleWindow(n,id,member.tactic||'균형');card.append(pill);}
 }catch(e){console.error('[party card]',e);}
}
// A box that pages itself is laid out again whenever what it holds grows after its pages were made (a card drawn a
// moment later, a picture that arrived): the page it shows never runs past its bottom. Each box is laid out again once
// per change of its contents, so a piece that cannot fit even alone never loops.
const BOXES=[
 ['.shell-loc-left .shell-loc-side .shell-pane:not([hidden])',()=>{const left=document.querySelector('.shell-loc-left');if(left)window.CRPGMainScreen?.paginate?.(left);}],
 ['.shell-loc-main .terrain-destinations',destinations],
 // A place's tab turns pages; one card too tall to be cut into pages fits by stepping its letters down instead.
 ['.shell-place-tabs .shell-pane:not([hidden])',()=>{window.CRPGGuildRows?.pagePlace?.();for(const p of document.querySelectorAll('.shell-place-tabs .shell-pane:not([hidden])'))if(p.scrollHeight>p.clientHeight+1&&!p.querySelector(':scope>.pane-pager'))fitBox(p);}],
 ['.shell-col-side.pageable',()=>window.CRPGPages?.pageAll?.()],
 // 0.16.37: 호감도's cards (every companion) turn pages; laid out again when the screen is drawn again.
 ['.relations-body',()=>window.CRPGPages?.pageAll?.()],
 ['.bag-cols .bag-grid',bag],
 ['.market-layout>.market-grid',market],
 // The kitchen's and the forge's lists of recipes and gear.
 ['.shell-forge-list',forge],
 ['.shell-forge-scroll',()=>{for(const b of document.querySelectorAll('.shell-forge-scroll'))fitBox(b);}],
 ['.market-layout>.market-detail',()=>fitBox(document.querySelector('.market-layout>.market-detail'))],
 ['.bag-cols .bag-detail',()=>fitBox(document.querySelector('.bag-cols .bag-detail'))],
 // The adventurer's handbook: each tab turns pages instead of scrolling.
 ['.hb-body',()=>{const b=document.querySelector('.hb-body');if(b)window.CRPGMainScreen?.pagePane?.(b,'hb|'+(window.CRPGHandbook?.tab||''));}],
 // A list in a window (the companions to pick …) turns pages in the window's own room.
 ['dialog#modal[open] .member-pick-grid',()=>{const g=document.querySelector('dialog#modal[open] .member-pick-grid');if(g)window.CRPGMainScreen?.pagePane?.(g,'pick|'+(document.querySelector('#modal-body>h1')?.textContent||''));}],
 // 0.16.31 (user: 장비 고르기 창이 「휠이 두 개」처럼 따로 스크롤): the gear to pick turns pages in the window's own room.
 ['dialog#modal[open] .gear-options',()=>{const g=document.querySelector('dialog#modal[open] .gear-options');if(g)window.CRPGMainScreen?.pagePane?.(g,'gear|'+(document.querySelector('#modal-body>h1')?.textContent||''));}],
 // 0.16.40 (user's picture: 「녹화 연못 · 물가」 cut at the window's bottom): Liyue's 27 areas turn pages in their window.
 ['dialog#modal[open] .liyue-area-browser',()=>{const b=document.querySelector('dialog#modal[open] .liyue-area-browser');if(b)window.CRPGMainScreen?.pagePane?.(b,'liyue-areas');}],
 ['dialog#modal[open]>#modal-body',()=>fitBox(document.getElementById('modal-body'))]
];
// Every window closes with one ✕ at its top right (the word 닫기 stays its name for the keyboard and screen readers).
try{const x=document.getElementById('modal-close');if(x){x.textContent='✕';x.classList.add('modal-x');x.setAttribute('aria-label','닫기 (Esc)');x.title='닫기';}}catch{}
const seen=new WeakMap();let queued=0;
// A paged box whose page left a row's worth of room empty (its pieces were measured before their pictures arrived) is
// laid out again too, so a page is always as full as it can be.
function roomLeft(box){const pager=box.querySelector(':scope>.pane-pager');if(!pager||!box.querySelector('[data-paged][hidden]'))return 0;
 const kids=[...box.children].filter(c=>c!==pager&&!c.hidden&&c.getClientRects().length);if(!kids.length)return 0;
 const bottom=Math.max(...kids.map(c=>c.getBoundingClientRect().bottom)),row=Math.min(...kids.map(c=>c.getBoundingClientRect().height));
 const free=pager.getBoundingClientRect().top-bottom;return free>row+8?Math.round(free):0;}
function guard(){queued=0;for(const [sel,fix] of BOXES)for(const box of document.querySelectorAll(sel)){if(!box.clientHeight)continue;
 const room=roomLeft(box),sign=box.scrollHeight+':'+box.clientHeight+':'+box.childElementCount+':'+room;if(box.scrollHeight<=box.clientHeight+1&&!room){seen.set(box,sign);continue;}
 if(seen.get(box)===sign)continue;seen.set(box,sign);try{fix();}catch(e){console.error('[screen]',e);}}}
// 0.16.40 (user: 「저렇게 되는것들은 도대체 언제 고칠거냐? 그냥 전체적으로 체크해야되는거 아니야?」): a safety net under every screen.
// Any fixed box still running past its bottom after the lists above — a card opened wider, a screen nobody listed — turns
// pages when it is a column of pieces, and otherwise steps its letters down until it fits, so nothing is ever cut on a
// player's screen. Each time the net is needed it is noted (CRPGScreenSafety) and the screen check fails on it, so the
// real cause still gets fixed.
const SAFE='#root :is(.shell-pane:not([hidden]),.shell-page-body,.shell-region,.shell-col-side,.shell-col-main,.relations-body),dialog#modal[open]>#modal-body';
function safety(){
 for(const box of document.querySelectorAll(SAFE)){
  if(!box.clientHeight||box.scrollHeight<=box.clientHeight+1)continue;
  if(box.closest('.combat-panel,.terrain-navigation,.cp-battle,.ch-overlay,.handbook'))continue;
  // 0.16.45: 읽은 이야기 is one list scrolled with the wheel (the user asked for it), never paged
  if(box.querySelector(':scope>.history-scroll'))continue;
  const cs=getComputedStyle(box);if(!/hidden|clip/.test(cs.overflowY))continue;
  // 0.16.41 (user's picture: 리월항 구역 안내's page ran past the bottom of 시설): a box that turns its own pages but whose
  // page still runs over (one piece taller than the page) steps its letters down until the page fits.
  if(box.querySelector(':scope>.pane-pager')){(window.CRPGScreenSafety??=[]).push((document.body.dataset.shellScreen||'')+' page of '+box.className.split(' ').slice(0,3).join('.')+' '+(box.scrollHeight-box.clientHeight)+'px');box.classList.add('fit-box');zoomDown(box);continue;}
  if(box.querySelector('.pane-pager,.roster-pager'))continue;
  const stacked=/^(block|flow-root)$/.test(cs.display)||/flex/.test(cs.display)&&cs.flexDirection.startsWith('column');
  (window.CRPGScreenSafety??=[]).push((document.body.dataset.shellScreen||'')+' '+box.className.split(' ').slice(0,3).join('.')+' '+(box.scrollHeight-box.clientHeight)+'px');
  if(stacked)try{window.CRPGMainScreen?.pagePane?.(box,'safety|'+(document.body.dataset.shellScreen||'')+'|'+box.className);}catch(e){console.error('[screen safety]',e);}
  if(box.scrollHeight>box.clientHeight+1&&!box.querySelector(':scope>.pane-pager'))fitBox(box);
 }
}
// The net runs after the screen's own pagers have had their turn (they run a frame or two after each change).
let safetyTimer=0;const guardAll=()=>{guard();clearTimeout(safetyTimer);safetyTimer=setTimeout(safety,450);};
const soon=()=>{if(!queued)queued=requestAnimationFrame(()=>requestAnimationFrame(guardAll));};
new MutationObserver(soon).observe(document.documentElement,{childList:true,subtree:true});
// A fold-out opened or closed (호감도's stages) changes a box's height without adding anything: lay it out again.
document.addEventListener('toggle',()=>{for(const b of document.querySelectorAll('.paged'))seen.delete(b);soon();},true);
document.addEventListener('load',e=>{if(e.target?.tagName==='IMG')soon();},true);
addEventListener('resize',soon);
const prior=render;
render=function(...args){const out=prior.apply(this,args);
 // The redrawn map shows its view at once (not its corner for a frame before the view is set).
 try{if(typeof NavigationUI!=='undefined'&&document.getElementById('journey-map'))NavigationUI.layoutNow?.();}catch{}
 try{partyCards();followPresets();}catch(e){console.error('[screen]',e);}
 try{requestAnimationFrame(()=>{destinations();bag();market();forge();});soon();}catch(e){console.error('[screen]',e);}return out;};
window.CRPGScreen={stage,destinations,guard,fitBox,bag};
})();

// 0.16.59 (user: 「업뎃할때 이 문구, 업뎃 해야된다거나 그런 말로 바꿀 수 없나?」): the notice for an action whose save was not confirmed
// (app_online.js 「이전 행동의 저장 확인이 필요합니다 …」) says what happened in plain words. When a new version is out — the usual cause
// while an update goes in — it says so and offers 「업데이트」; the old button stays, as 「다시 확인」. Nothing about the retry changes.
(function(){'use strict';
if(typeof render!=='function')return;let asked=false;
function plain(){
 const box=document.querySelector('#root>.pending-action-notice');if(!box||box.dataset.plain)return;box.dataset.plain='1';
 const p=box.querySelector(':scope>p'),retry=box.querySelector(':scope>button'),version=typeof GameVersion!=='undefined'?GameVersion:null;
 if(retry)retry.textContent='다시 확인';
 if(version?.changed?.()){if(p)p.textContent='새 버전이 나왔습니다 · 업데이트하면 마지막 행동을 이어서 확인합니다. 보상은 한 번만 받습니다.';
  const up=button('업데이트',()=>version.apply(),false,true);box.insertBefore(up,retry||null);return;}
 if(p)p.textContent='마지막 행동이 저장됐는지 아직 확인하지 못했습니다 · 다시 확인해도 보상은 한 번만 받습니다.';
 if(!asked&&version?.check){asked=true;Promise.resolve(version.check()).then(()=>{if(version.changed?.())render();}).catch(()=>{});}
}
const prior=render;render=function(...args){const out=prior.apply(this,args);try{plain();}catch(e){console.warn('[pending notice]',e);}return out;};
})();
