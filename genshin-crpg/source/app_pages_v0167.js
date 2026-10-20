/* 0.16.7 쪽 넘기기 (user, 2026-10-07: 「그냥 아예 스크롤 자체가 모든 화면 전체에서 나오지 않는 깔끔한 화면이면 좋겠는데.. 어떻게 안되나?」).
 * The parts of a screen that still scrolled — 편성's side column (presets and formations) and the bag's item card — turn
 * pages (◀ 1/2 ▶) like the main screen's tabs, filled by the real layout so nothing on a page is cut.
 * Presentation only. Load after app_mainscreen_v0167.js. */
(function(){
'use strict';
if(typeof render!=='function')return;
// Where · what it is called for remembering its page.
const SPOTS=[
 ['.shell-col-side:has(>.formation-choice),.shell-col-side:has(>.shell-presets)',()=>'party-side'],
 // 0.16.29: every tab of 임무 (not only 일일·주간) turns pages instead of scrolling; each tab keeps its own page.
 ['.shell-page-quest .quest-list',el=>'quest|'+(document.querySelector('.journal-tabs [aria-pressed="true"]')?.textContent?.trim()||'')+'|'+(el.querySelector('.task-scope.active b')?.textContent||'')],
 // 0.16.37 (TODO 8): 호감도 lists every companion now (those from wishes too), so its cards turn pages.
 ['.relations-body',()=>'relations']
 // 0.16.29: the bag's item card is one card now (app_screen_v01629.js fits it); its list of items turns pages instead.
];
function pageAll(){const page=window.CRPGMainScreen?.pagePane;if(!page)return;
 for(const [sel,key] of SPOTS)for(const el of document.querySelectorAll(sel)){if(!el.offsetParent)continue;el.classList.add('pageable');page(el,key(el));}}
const prior=render;render=function(){prior();try{requestAnimationFrame(pageAll);}catch(e){console.error('[pages]',e);}};
document.addEventListener('click',e=>{if(e.target?.closest?.('.shell-col-side,.bag-layout')&&!e.target.closest('.pane-pager'))requestAnimationFrame(pageAll);});
let timer=0;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(pageAll,140);});
window.CRPGPages={pageAll};
})();
