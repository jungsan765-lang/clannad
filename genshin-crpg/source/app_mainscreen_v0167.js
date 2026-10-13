/* 0.16.7 메인 화면 (user, 2026-10-07: 「메인 화면에서도 시설 보려고 아래로 쭉 내리는거도 사실 좀 불편한 점도 있어...」, 「그냥 아예
 * 스크롤 자체가 모든 화면 전체에서 나오지 않는 깔끔한 화면이면 좋겠는데.. 어떻게 안되나?」).
 * The left column of the main screen never scrolls: the main quest is one line, the four tabs one row, facilities are
 * their pictures with what they are (잡화·보급, 대장간 …) in a grid, waiting is one small button, and a tab holding more
 * than its room turns pages (◀ 1/2 ▶) instead of scrolling. Presentation only: the same buttons, rearranged after the
 * screen is drawn. Load after app_shell.js. */
(function(){
'use strict';
if(typeof render!=='function')return;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const sfx=n=>window.CRPGSound?.play?.(n);
const REGION=/^(몬드|리월|이나즈마|수메르|폰타인|나타|스네즈나야|노드크라이)\s*·\s*/;
const pageOf={};// 'map|tab' → page shown

function compact(left){
 // Facilities: what each is, without the region, under its picture (the full name stays on the tile and its button).
 for(const tile of left.querySelectorAll('.shell-place-tile')){if(tile.querySelector('.place-entry-short'))continue;
  const kind=(tile.querySelector('.place-entry-kind')?.textContent||'').replace(REGION,'').trim(),name=tile.querySelector('h3')?.textContent?.trim()||'';
  tile.querySelector('.place-entry-copy')?.append(mk('small','place-entry-short',tile.classList.contains('place-entry-guild')?'캐서린':kind||name));}
 // Waiting: one small button on the place's name row; how likely a fight is rides on its title.
 const wait=left.querySelector(':scope>.wait-controls'),head=left.querySelector(':scope>.shell-loc-head');
 if(wait&&!wait.classList.contains('compact')){wait.classList.add('compact');const note=wait.querySelector(':scope>small'),b=wait.querySelector('button');if(note&&b){b.title=note.textContent.trim();note.hidden=true;}
  // 「1시간 기다리기」 says the same in fewer letters beside the place's name.
  if(b&&/^1시간 기다리기$/.test(b.textContent.trim())){b.setAttribute('aria-label',b.textContent.trim());b.textContent='1시간 대기';}
  if(head){head.classList.add('with-wait');head.append(wait);}}
 // The main quest: what it is rides on its button's title (the narrow column shows the button alone).
 const quest=left.querySelector('.main-objective button');if(quest&&!quest.title)quest.title='메인 임무 · '+quest.textContent.trim();
}
// A pane with more than its room shows one page at a time (user: 「짤렸어.」 — nothing on a page may be cut). Pages are
// filled by the real layout, piece by piece: the pane's cards in order; a card taller than the room broken into its own
// rows (its heading riding along on each of its pages); a grid of facilities broken into rows of tiles. A domain's gate,
// a button or a line of words is one piece and is never split (the stylesheet makes the gate fit).
const WHOLE='.domain-gate,.task-mini,.region-event,.ley-line-item,.shell-place-tile,button,a,label,svg,img,canvas,video,input,textarea,p,h1,h2,h3,h4,h5,summary,li,.ch-journal-fact,.ch-journal-tier';
// 0.16.41: a piece taller than a whole page is broken into its rows even when some of its parts are inline (a small
// heading line): rowsOf keeps the parts of one line together, and left whole it ran past the page's bottom.
function breakable(k,tall=false){
 if(k.matches(WHOLE)||!k.children.length||[...k.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return false;
 return tall||[...k.children].every(c=>getComputedStyle(c).display!=='inline');
}
const CARD='.card,article,.journal-card,.region-event,.discovery-card,.task-mini,.domain-gate,.ch-journal-fact,.ch-journal-tier,.ch-journal';let eager=false;// the handbook's lists fill each page row by row
const isHead=h=>!!h&&(h.tagName==='SUMMARY'||/^H\d$/.test(h.tagName)||/(^|[\s_-])[a-z]*head\b/.test(h.className||''));
// Children side by side (a grid's row: a label and its value, tiles) stay together on one page.
// 0.16.35: a child that overlaps the row above (a card's head spanning two lines beside its items) joins that row; a phone's
// fishing card was cut into nine pages of single lines because its side-by-side parts started a few pixels apart.
function rowsOf(kids){const rows=[];let bottom=-Infinity;for(const c of kids){const b=c.getBoundingClientRect(),t=Math.round(b.top),end=Math.round(b.bottom);if(rows.length&&t<bottom-2){rows[rows.length-1].push(c);bottom=Math.max(bottom,end);}else{rows.push([c]);bottom=end;}}return rows;}
function pieces(node,room,out,wrap,lead){
 const kids=[...node.children].filter(k=>!k.classList.contains('pane-pager')&&!k.hidden&&getComputedStyle(k).display!=='none');
 for(const row of rowsOf(kids)){
  const k=row[0];
  if(row.length===1&&k.matches('.location-places')){const tiles=[...k.children].filter(t=>!t.hidden),cols=Math.max(1,getComputedStyle(k).gridTemplateColumns.split(' ').filter(Boolean).length);
   for(let i=0;i<tiles.length;i+=cols)out.push({nodes:tiles.slice(i,i+cols),wrap:[...wrap,k],lead});continue;}
  // 0.16.32 (user: 「자리는 많은데 굳이 … 버튼으로 두개씩만 보여주는건데?」): a list (not a card) is cut into its rows even when it is shorter
  // than a page, so the rows that fit fill the room left on this page instead of the whole list moving to the next.
  const tall=k.getBoundingClientRect().height>room;
  if(row.length===1&&(tall||eager&&k.children.length>1&&!k.matches(CARD))&&breakable(k,tall)&&!(k.tagName==='DETAILS'&&!k.open)){
   const head=isHead(k.firstElementChild)?k.firstElementChild:null;
   for(const p of pieces(k,room-(head?head.getBoundingClientRect().height:0),[],[...wrap,k],head?[...lead,head]:lead))if(!(p.nodes.length===1&&p.nodes[0]===head))out.push(p);
   continue;}
  out.push({nodes:row,wrap,lead});
 }
 return out;
}
// Any pane of fixed height (a flex column that hides what overflows) pages itself this way; `key` remembers its page.
function pagePane(pane,key){
 if(!pane)return;
 pane.querySelector(':scope>.pane-pager')?.remove();pane.classList.remove('paged');delete pane.dataset.gap;
 for(const n of pane.querySelectorAll('[data-paged]')){n.hidden=false;delete n.dataset.paged;}
 const over=()=>pane.scrollHeight>pane.clientHeight+1;
 if(!pane.clientHeight||!over())return;
 // 0.16.29 (user: 「◀▶이거 다 없애버려. 차라리 다른 버튼으로 두던가 … 센스있는거 없어?」): the pages are numbered buttons, one
 // press to any page (like KanColle's lists); the wheel and a sideways swipe over the box turn them too.
 const pager=mk('div','pane-pager');pager.setAttribute('role','tablist');pager.setAttribute('aria-label','쪽');
 {const probe=mk('button','pane-page','1');probe.type='button';pager.append(probe);}// the row's height, for the room left above it
 pane.append(pager);pane.classList.add('paged');eager=!!(pane.matches?.('.hb-body')||document.documentElement?.classList?.contains('stage-phone')&&pane.matches?.('.shell-loc-side .shell-pane,.quest-list'));
 const cs=getComputedStyle(pane),room=pane.clientHeight-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0)-pager.getBoundingClientRect().height-(parseFloat(cs.rowGap)||0);
 const list=pieces(pane,room,[],[],[]),own=new Set(),take=(on,p)=>{for(const x of [...p.nodes,...p.wrap,...p.lead])on.add(x);return on;};
 for(const p of list)take(own,p);
 // Shows exactly one page's pieces, with the cards around them and their headings.
 const put=on=>{for(const x of own){const v=on.has(x);if(x.hidden===v)x.hidden=!v;if(v)delete x.dataset.paged;else x.dataset.paged='1';}};
 // 0.16.33: a whole card that does not fit the room left waits for the next page, and a later whole card that fits fills
 // the room instead (a page stood a third empty over a tall event card). Rows of a card split across pages keep their order.
 // Only in a column of stacked cards: in a grid or a row the pieces are places in one flow, and moving one moves the rest.
 const stacked=/^(block|flow-root)$/.test(cs.display)||/flex/.test(cs.display)&&cs.flexDirection.startsWith('column');
 const queue=list.slice(),pages=[],wholeNext=[];
 while(queue.length){
  let on=new Set(),placed=0,missed=false,miss=null;
  for(let i=0;i<queue.length;){
   const p=queue[i];if(missed&&p.wrap.length){i++;continue;}
   const next=take(new Set(on),p);put(next);
   if(placed&&over()){put(on);miss??=p;if(p.wrap.length||!stacked)break;missed=true;i++;continue;}
   on=next;placed++;queue.splice(i,1);
  }
  pages.push(on);
  // 0.16.36 (user: 「억지로 지울 필요 없어 그게 괜찮은것 같으면 센스있게 남겨도 돼」): a page that ends early because the next piece is a
  // whole card (a domain's gate, an event, a ley card) that is never cut keeps its room; the screen check reads this mark.
  wholeNext.push(!!miss&&miss.nodes.length===1&&!!miss.nodes[0].matches?.(CARD));
 }
 if(pages.length<2){put(own);pager.remove();pane.classList.remove('paged');return;}
 let at=Math.min(pageOf[key]||0,pages.length-1);
 const draw=()=>{put(pages[at]);pageButtons(pager,pages.length,at,go);pageOf[key]=at;if(wholeNext[at])pane.dataset.gap='card';else delete pane.dataset.gap;};
 const go=i=>{i=Math.max(0,Math.min(pages.length-1,i));if(i===at)return;at=i;sfx('tab');draw();};
 pane._turn=d=>go(at+d);draw();
}
// The numbered buttons of `count` pages with `at` shown: every number while they fit one short row, else the first, the
// last and the three around the shown page with 「…」 between (like KanColle's lists).
function pageButtons(pager,count,at,go){
 const show=count<=7?[...Array(count).keys()]:[...new Set([0,at-1,at,at+1,count-1].filter(i=>i>=0&&i<count))].sort((a,b)=>a-b);
 const out=[];let last=-1;
 for(const i of show){if(i-last>1)out.push(mk('span','pane-page-gap','…'));const b=mk('button','pane-page'+(i===at?' on':''),String(i+1));b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-label',(i+1)+'쪽');b.setAttribute('aria-selected',String(i===at));b.onclick=()=>go(i);out.push(b);last=i;}
 pager.replaceChildren(...out);
}
// The wheel over a paged box, or a sideways swipe on it, turns its pages (the box itself never scrolls).
document.addEventListener('wheel',e=>{const box=e.target?.closest?.('.paged');if(!box?._turn||e.target.closest('.terrain-viewport,dialog .terrain-viewport'))return;if(Math.abs(e.deltaY)<8&&Math.abs(e.deltaX)<8)return;const now=Date.now();if(now-(box._wheelAt||0)<260)return;box._wheelAt=now;box._turn((e.deltaY||e.deltaX)>0?1:-1);},{passive:true});
document.addEventListener('pointerdown',e=>{const box=e.target?.closest?.('.paged');if(!box?._turn||e.pointerType==='mouse')return;const x=e.clientX,y=e.clientY;
 const up=ev=>{removeEventListener('pointerup',up);const dx=ev.clientX-x,dy=ev.clientY-y;if(Math.abs(dx)>44&&Math.abs(dx)>Math.abs(dy)*1.5)box._turn(dx<0?1:-1);};addEventListener('pointerup',up);},{passive:true});
function paginate(left){
 const side=left.querySelector('.shell-loc-side'),pane=side?.querySelector('.shell-pane:not([hidden])');if(!pane)return;
 // 0.16.29 (user: 「뭘 누를 때마다 맨 위로 올라가는것도 개불편해」): the page is remembered under the tab itself, not its words
 // (the words carry a count and 비경·지맥 / 지맥·보스 swap, so a new key went back to page 1 after every press).
 const t=side.querySelector('.shell-tab.active,.shell-tab[aria-selected="true"]'),tab=t?.dataset.tab||t?.textContent?.trim()||'';
 pagePane(pane,(game?.s?.global?.CURRENT_MAP_ID||'')+'|'+tab);
}
function arrange(){const left=document.querySelector('.shell-loc-left');if(!left)return;compact(left);requestAnimationFrame(()=>paginate(left));}
const prior=render;
render=function(){prior();try{if(document.body.dataset.shellScreen==='LOCATION'||document.querySelector('.shell-loc-left'))arrange();}catch(e){console.error('[main screen]',e);}};
// Another tab of the column, or a new size: lay the pages out again.
document.addEventListener('click',e=>{if(e.target?.closest?.('.shell-loc-side .shell-tab'))requestAnimationFrame(()=>{const left=document.querySelector('.shell-loc-left');if(left){compact(left);paginate(left);}});});
// A folded list opened or closed in the column (리월의 지맥의 꽃 …): the same, so what it shows is paged too.
document.addEventListener('toggle',e=>{if(e.target?.closest?.('.shell-loc-side .shell-pane')){const left=document.querySelector('.shell-loc-left');if(left)paginate(left);}},true);
let resizeTimer=0;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{const left=document.querySelector('.shell-loc-left');if(left)paginate(left);},120);});
window.CRPGMainScreen={arrange,paginate,pagePane,pageButtons};
})();

