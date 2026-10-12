/* 0.16.7 캐릭터 화면 (user, 2026-10-07: 「캐릭터 장비 화면에서는 그냥 캐릭터가 다 가려지는 문제, 아래로 쭉 내려야 되는것도 불편.」,
 * 「그냥 아예 스크롤 자체가 모든 화면 전체에서 나오지 않는 깔끔한 화면이면 좋겠는데」, 「돌파나 이런거 재료 어디서 구하는지 바로
 * 고정하는거 해도 되고」).
 * - The member panel keeps the name, level, health and the four gear slots in view and puts the rest in four tabs —
 *   능력치 (numbers, gear traits), 레벨 (this member's experience books, 돌파), 특성, 운명의 자리 — so the panel does not
 *   scroll and the character's art beside it stays in sight.
 * - A roster longer than its column turns pages (▲ ▼) instead of scrolling.
 * - 돌파 and 특성 강화 show where each material comes from (the domain, the field boss, the shop) with a 📌 that keeps it
 *   in view: the map shows the way there and the main screen's map head carries the pinned material with 보유/필요.
 * Presentation only: the same buttons and actions as before, rearranged once the screen is drawn. Load after
 * app_premium_v0148.js and app_growth_v01522.js. */
(function(){
'use strict';
if(typeof render!=='function')return;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const MAN=()=>typeof MANIFEST!=='undefined'?MANIFEST:(window.CRPG_MANIFEST||{});
const sfx=n=>window.CRPGSound?.play?.(n);
const toast=t=>window.CRPGShell?.toast?.(t);
const TABS=[['stats','능력치'],['level','레벨'],['talent','특성'],['cons','운명의 자리']];
let tab='stats',page=null;

// ---- the member panel in tabs -----------------------------------------------------------------------------------
function organize(card){
 if(card.querySelector(':scope>.gear-tabs'))return;
 const take=sel=>card.querySelector(':scope>'+sel);
 const stats=take('.gear-stats'),chips=take('.gear-trait-chips'),exp=take('.gear-exp'),growth=take('.growth-controls'),premium=take('.shell-premium-member');
 const cons=premium?.querySelector(':scope>.premium-cons');
 // 특성 강화 goes with the talents; 캐릭터 돌파 stays with the level.
 const talentUp=growth&&[...growth.querySelectorAll('button')].find(b=>/특성 강화/.test(b.textContent));
 if(talentUp&&premium){const row=mk('div','gear-talent-up');row.append(talentUp);premium.append(row);}
 // 운명의 자리: the button sits in the chart's heading row (its short word on a phone), so the chosen one's text has room.
 const open=cons?.querySelector(':scope>.premium-cons-open'),consHead=cons?.querySelector(':scope>.cons-head');
 if(open&&consHead){for(const n of [...open.childNodes])if(n.nodeType===3&&n.textContent.trim()){const t=n.textContent,stock=t.match(/·\s*보유\s*\d+/)?.[0]||'',long=mk('span','cons-open-long',t.replace(/\s*·\s*보유\s*\d+/,'')),short=mk('span','cons-open-short','활성화');n.replaceWith(long,short,...(stock?[mk('small','cons-open-stock',' '+stock)]:[]));}consHead.append(open);}
 const panes={stats:[stats,chips],level:[exp,growth],talent:[premium],cons:[cons]};
 const bar=mk('div','gear-tabs');bar.setAttribute('role','tablist');bar.setAttribute('aria-label','캐릭터 정보');const made=[];
 for(const [key,label]of TABS){const nodes=panes[key].filter(Boolean);if(!nodes.length)continue;
  const pane=mk('div','gear-pane gear-pane-'+key);pane.dataset.pane=key;pane.setAttribute('role','tabpanel');pane.append(...nodes);made.push(pane);
  // 운명의 자리 carries its count on the tab (the chart's own heading is folded away on a phone).
  const count=key==='cons'?cons?.querySelector('.cons-count')?.textContent?.replace(/\s+/g,''):'';
  const b=mk('button','gear-tab');b.append(mk('span','gear-tab-long',label));if(key==='cons')b.append(mk('span','gear-tab-short','운명'));if(count)b.append(mk('small','gear-tab-count',' '+count));b.type='button';b.setAttribute('aria-label',label);b.dataset.tab=key;b.setAttribute('role','tab');b.onclick=()=>{if(tab!==key){tab=key;sfx('tab');}show(card);};bar.append(b);}
 if(!made.length)return;
 card.append(bar,...made);watch(card);show(card);
}
function show(card){
 const panes=[...card.querySelectorAll(':scope>.gear-pane')],keys=panes.map(p=>p.dataset.pane),cur=keys.includes(tab)?tab:keys[0];
 for(const p of panes)p.hidden=p.dataset.pane!==cur;
 for(const b of card.querySelectorAll(':scope>.gear-tabs>.gear-tab')){const on=b.dataset.tab===cur;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));}
 const open=panes.find(p=>!p.hidden);if(open)requestAnimationFrame(()=>fit(open));
}
// A pane whose words run longer than its room (a long 운명의 자리 text on a small phone) steps its letters down — never cut.
function fit(pane){
 if(!pane?.isConnected||pane.hidden)return;pane.classList.remove('fit-1','fit-2','fit-3');
 for(const step of ['fit-1','fit-2','fit-3']){if(pane.scrollHeight<=pane.clientHeight+1)break;pane.classList.add(step);}
}
// The chart's text changes as a node is pointed at or pressed (app_premium_v0148.js); the pane fits itself again.
const watched=new WeakSet();
function watch(card){const d=card.querySelector('.gear-pane-cons .cons-detail');if(!d||watched.has(d))return;watched.add(d);new MutationObserver(()=>fit(d.closest('.gear-pane'))).observe(d,{childList:true,subtree:true,characterData:true});}
addEventListener('resize',()=>{const p=document.querySelector('.gear-cols .gear-member:not([hidden])>.gear-pane:not([hidden])');if(p)fit(p);});
// Another member picked in the roster (app_shell.js shows their card): the same tab opens on them, fitted.
document.addEventListener('click',e=>{if(!e.target?.closest?.('.gear-cols .shell-roster-item'))return;requestAnimationFrame(()=>{const c=document.querySelector('.gear-cols .gear-member:not([hidden])');if(c?.querySelector(':scope>.gear-tabs'))show(c);});});

// ---- a long roster turns pages ----------------------------------------------------------------------------------
function pageRoster(){
 const list=document.querySelector('.gear-cols .shell-col-roster>.shell-roster');if(!list)return;
 const col=list.parentElement,items=[...list.children].filter(n=>n.classList.contains('shell-roster-item'));
 col.querySelector(':scope>.roster-pager')?.remove();list.classList.remove('paged');for(const it of items)it.hidden=false;
 if(items.length<2)return;
 const gap=parseFloat(getComputedStyle(list).rowGap)||6,h=items[0].getBoundingClientRect().height+gap,room=col.clientHeight-12;
 if(!h||items.length*h<=room)return;
 const per=Math.max(2,Math.floor((room-40)/h)),pages=Math.ceil(items.length/per),active=Math.max(0,items.findIndex(i=>i.classList.contains('active')));
 if(page===null||page>=pages||Math.floor(active/per)!==page&&!pageRoster.keep)page=Math.floor(active/per);pageRoster.keep=false;
 const pager=mk('div','roster-pager'),up=mk('button','roster-page','▲'),down=mk('button','roster-page','▼'),label=mk('span','roster-page-no');
 up.type=down.type='button';up.setAttribute('aria-label','이전 캐릭터들');down.setAttribute('aria-label','다음 캐릭터들');
 const draw=()=>{items.forEach((it,k)=>{it.hidden=Math.floor(k/per)!==page;});label.textContent=(page+1)+' / '+pages;up.disabled=page<=0;down.disabled=page>=pages-1;};
 up.onclick=()=>{page=Math.max(0,page-1);pageRoster.keep=true;sfx('tab');draw();};down.onclick=()=>{page=Math.min(pages-1,page+1);pageRoster.keep=true;sfx('tab');draw();};
 pager.append(up,label,down);list.classList.add('paged');col.append(pager);draw();
}
addEventListener('resize',()=>{if(document.body.dataset.shellScreen==='STATUS')pageRoster();});

// ---- where a material comes from, and the pin ----------------------------------------------------------------------
const KEY='crpg-track-v1';
function pinned(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}}
function savePin(v){try{v?localStorage.setItem(KEY,JSON.stringify(v)):localStorage.removeItem(KEY);}catch{}}
function itemName(id){try{return safeName('14_ITEM_DB',id);}catch{return id;}}
function mapLabel(id){try{return mapName(id);}catch{return id;}}
// The best place for a material now: the domain of its kind the hero can enter (the highest one open), the field boss
// that drops it, else what the item list says.
function materialSource(id){
 if(!game||!id)return null;const lv=Number(game.s.global.PLAYER_LEVEL_STATE)||1;
 const sites=game.growthDomainSites?.()||[];
 const domain=kind=>{const list=sites.filter(kind).sort((a,b)=>a.levels[0]-b.levels[0]);const open=list.filter(s=>s.levels[0]-5<=lv);const s=open[open.length-1]||list[0];return s?{label:s.name+' · '+(s.kind==='ASCENSION'?'돌파':s.kind==='TALENT'?'특성':'경험치')+' 비경',map:s.map,kind:'domain'}:null;};
 if(/^GROWTH_GEM_/.test(id))return domain(s=>s.kind==='ASCENSION');
 if(id==='GROWTH_TALENT_MOND')return domain(s=>s.kind==='TALENT'&&s.region==='몬드');
 if(id==='GROWTH_TALENT_LIYUE')return domain(s=>s.kind==='TALENT'&&s.region==='리월');
 const boss=(game.fieldBossCatalog?.()||[]).find(b=>b.material===id);if(boss)return {label:'필드 보스 · '+boss.name,map:boss.map,kind:'boss'};
 if(/^MAT_CHAR_EXP_/.test(id))return {label:'계시의 꽃 (지맥)',map:null,kind:'ley'};
 if(id==='MORA')return {label:'부의 꽃 (지맥) · 전투',map:null,kind:'ley'};
 const text=game.tables?.['14_ITEM_DB']?.get(id)?.[17];return text?{label:String(text),map:null,kind:'text'}:null;
}
function guide(map){
 if(!map||!game)return;document.getElementById('modal')?.open&&document.getElementById('modal').close();
 if(game.s.global.CURRENT_MAP_ID===map){toast('이미 '+mapLabel(map)+'에 있습니다.');return;}
 if(game.s.runtime){toast('전투 중에는 길 안내를 바꿀 수 없습니다.');return;}
 const go=()=>{if(typeof NavigationUI!=='undefined')NavigationUI.choose(map);window.CRPGShell?.openMap?.();toast('길 안내 · '+mapLabel(map));};
 if(window.CRPGShell?.screen!=='LOCATION'){if(window.CRPGShell?.open?.('LOCATION')===false)return;setTimeout(go,60);}else go();
}
function pin(id,need){const src=materialSource(id);savePin({item:id,need:Number(need)||0,map:src?.map||null,label:src?.label||''});sfx('tab');if(src?.map)guide(src.map);else toast('📌 '+itemName(id)+' · '+(src?.label||'고정했습니다'));}
// The cost tiles of 돌파 and 특성 강화 (app_growth_v01522.js marks each with its item) get their source and a pin.
function annotate(box){
 for(const t of box.querySelectorAll('.growth-cost[data-item]')){if(t.querySelector('.growth-cost-src'))continue;const id=t.dataset.item,src=materialSource(id);if(!src)continue;
  const line=mk('div','growth-cost-src');line.append(mk('small','',src.label));
  const b=mk('button','growth-cost-pin','📌');b.type='button';b.title=src.map?'고정하고 길 안내':'고정';b.setAttribute('aria-label',itemName(id)+' 구하는 곳 고정');b.onclick=e=>{e.stopPropagation();pin(id,t.dataset.need);};line.append(b);t.append(line);}
}
for(const name of ['openCharacterAscension','openCharacterTalent']){const prior=window[name];if(typeof prior!=='function')continue;
 window[name]=function(...args){const out=prior.apply(this,args);try{const m=document.getElementById('modal');if(m)annotate(m);}catch(e){console.error('[character]',e);}return out;};}
// The pinned material rides on the main screen's map head: picture, 보유/필요, where; pressing it shows the way again.
function pinChip(){
 const head=document.querySelector('.shell-loc-main .terrain-shortcuts,.terrain-shortcuts');if(!head||head.querySelector('.track-chip'))return;
 const p=pinned();if(!p?.item||!game)return;const have=game.itemCount?.(p.item)||0,done=p.need>0&&have>=p.need;
 const chip=mk('div','track-chip'+(done?' done':'')),go=mk('button','track-go');go.type='button';
 const path=MAN().itemIcons?.icons?.[p.item]?.path;if(path){const i=mk('img','track-icon');i.src=path;i.alt='';i.draggable=false;go.append(i);}else go.append(mk('span','track-icon mark','📌'));
 go.append(mk('b','',p.need?fmt(have)+'/'+fmt(p.need):fmt(have)),mk('small','',done?'다 모았습니다':(p.label||itemName(p.item))));
 go.title=itemName(p.item)+(p.label?' · '+p.label:'')+(p.map?' · 눌러서 길 안내':'');go.onclick=()=>{if(p.map)guide(p.map);};go.disabled=!p.map&&!done;
 const x=mk('button','track-clear','✕');x.type='button';x.setAttribute('aria-label','고정 해제');x.onclick=()=>{savePin(null);chip.remove();};
 chip.append(go,x);head.prepend(chip);
}

const prior=render;
render=function(){
 prior();
 try{
  const screen=document.body.dataset.shellScreen;
  if(screen==='STATUS'){for(const c of document.querySelectorAll('.gear-cols .gear-member[data-owner]'))organize(c);requestAnimationFrame(pageRoster);}
  pinChip();
 }catch(e){console.error('[character]',e);}
};
window.CRPGTrack={materialSource,pin,pinned,clear:()=>savePin(null),guide};
window.CRPGCharacterTabs={organize,show,pageRoster,TABS};
})();
