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
  tile.querySelector('.place-entry-copy')?.append(mk('small','place-entry-short',kind||name));}
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
const WHOLE='.domain-gate,.task-mini,.region-event,.ley-line-item,.shell-place-tile,button,a,label,svg,img,canvas,video,input,textarea,p,h1,h2,h3,h4,h5,summary,li';
function breakable(k){
 if(k.matches(WHOLE)||!k.children.length||[...k.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return false;
 return [...k.children].every(c=>getComputedStyle(c).display!=='inline');
}
const isHead=h=>!!h&&(h.tagName==='SUMMARY'||/^H\d$/.test(h.tagName)||/(^|[\s_-])[a-z]*head\b/.test(h.className||''));
// Children side by side (a grid's row: a label and its value, tiles) stay together on one page.
function rowsOf(kids){const rows=[];let top=null;for(const c of kids){const t=Math.round(c.getBoundingClientRect().top);if(rows.length&&Math.abs(t-top)<=2)rows[rows.length-1].push(c);else{rows.push([c]);top=t;}}return rows;}
function pieces(node,room,out,wrap,lead){
 const kids=[...node.children].filter(k=>!k.classList.contains('pane-pager')&&!k.hidden&&getComputedStyle(k).display!=='none');
 for(const row of rowsOf(kids)){
  const k=row[0];
  if(row.length===1&&k.matches('.location-places')){const tiles=[...k.children].filter(t=>!t.hidden),cols=Math.max(1,getComputedStyle(k).gridTemplateColumns.split(' ').filter(Boolean).length);
   for(let i=0;i<tiles.length;i+=cols)out.push({nodes:tiles.slice(i,i+cols),wrap:[...wrap,k],lead});continue;}
  if(row.length===1&&k.getBoundingClientRect().height>room&&breakable(k)&&!(k.tagName==='DETAILS'&&!k.open)){
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
 pane.querySelector(':scope>.pane-pager')?.remove();pane.classList.remove('paged');
 for(const n of pane.querySelectorAll('[data-paged]')){n.hidden=false;delete n.dataset.paged;}
 const over=()=>pane.scrollHeight>pane.clientHeight+1;
 if(!pane.clientHeight||!over())return;
 const pager=mk('div','pane-pager'),prev=mk('button','pane-page','◀'),next=mk('button','pane-page','▶'),no=mk('span','pane-page-no');prev.type=next.type='button';prev.setAttribute('aria-label','이전');next.setAttribute('aria-label','다음');
 pager.append(prev,no,next);pane.append(pager);pane.classList.add('paged');
 const cs=getComputedStyle(pane),room=pane.clientHeight-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0)-pager.getBoundingClientRect().height-(parseFloat(cs.rowGap)||0);
 const list=pieces(pane,room,[],[],[]),own=new Set(),take=(on,p)=>{for(const x of [...p.nodes,...p.wrap,...p.lead])on.add(x);return on;};
 for(const p of list)take(own,p);
 // Shows exactly one page's pieces, with the cards around them and their headings.
 const put=on=>{for(const x of own){const v=on.has(x);if(x.hidden===v)x.hidden=!v;if(v)delete x.dataset.paged;else x.dataset.paged='1';}};
 const pages=[];let page=[],on=new Set();
 for(const p of list){const next=take(new Set(on),p);put(next);
  if(page.length&&over()){pages.push(on);page=[p];on=take(new Set(),p);}else{page.push(p);on=next;}}
 if(page.length)pages.push(on);
 if(pages.length<2){put(own);pager.remove();pane.classList.remove('paged');return;}
 let at=Math.min(pageOf[key]||0,pages.length-1);
 const draw=()=>{put(pages[at]);no.textContent=(at+1)+' / '+pages.length;prev.disabled=at<=0;next.disabled=at>=pages.length-1;pageOf[key]=at;};
 prev.onclick=()=>{at=Math.max(0,at-1);sfx('tab');draw();};next.onclick=()=>{at=Math.min(pages.length-1,at+1);sfx('tab');draw();};draw();
}
function paginate(left){
 const side=left.querySelector('.shell-loc-side'),pane=side?.querySelector('.shell-pane:not([hidden])');if(!pane)return;
 const tab=side.querySelector('.shell-tab.active,.shell-tab[aria-selected="true"]')?.textContent?.trim()||'';
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
window.CRPGMainScreen={arrange,paginate,pagePane};
})();
