/* 0.16.7 의뢰 목록 (user, 2026-10-07: 「캐서린 임무들도 슬슬 바꿀 때가 됐어. 일퀘 주간퀘를 나눠서 할 일을 만드는게 좋아보여. … 그리고
 * 의뢰 버튼이 너무 쓸데없이 커. 보기 불편해. 그냥 가능한 칸코레랑 비슷한 느낌으로 해주면 좋긴 한데, 그렇다고 완전 칸코레랑 똑같은
 * 느낌으로는 안해도 돼.」).
 * A commission is one short row, like a 칸코레 임무: its state in a colored label, its name with the level and the place,
 * the reward's pictures and one small button for what comes next (수락 · 받기 · 보고 · 이동). Pressing the row opens the
 * whole card — what it asks, the way there, the pin, every choice — in the information window. Catherine's desk opens
 * on the day's and the week's tasks (app_tasks_v0167.js) and her lists turn pages instead of scrolling.
 * Presentation only: the card's own buttons do the work. Load after app_tasks_v0167.js and app_mainscreen_v0167.js. */
(function(){
'use strict';
if(typeof commissionCard!=='function'||typeof render!=='function')return;
const S=window.CRPGShell;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const MAN=()=>typeof MANIFEST!=='undefined'?MANIFEST:(window.CRPG_MANIFEST||{});
const STATE={open:['미수락','s-open'],going:['진행 중','s-going'],ready:['보고','s-ready'],done:['완료','s-done']};
// What a row's small button says for the card's own (longer) button.
const SHORT=[[/^의뢰 수락$/,'수락'],[/보상 수령$/,'받기'],[/^임무 보고/,'보고'],[/보고하러 가기$/,'보고하러'],[/방향으로 이동$/,'이동'],[/현장 진행$/,'현장으로'],[/^정리한 편지 전달$/,'전달']];
const FIRST=['CLAIM_QUEST','COMMISSION_ACCEPT','WORLD_WORK_START','PLACE_ENTER','QUEST_CHOICE','COMMISSION_PUZZLE','JOURNEY_RESUME','MENU','PLACE_LEAVE','MOVE'];
function stateOf(q){if(q.state?.claimed)return 'done';if(q.state?.node==='READY_TO_CLAIM'||q.readyToReport)return 'ready';return q.accepted?'going':'open';}
function picture(path,cls){if(!path)return null;const i=mk('img',cls);i.src=path;i.alt='';i.draggable=false;i.loading='lazy';return i;}
function rewards(rw={}){
 const box=mk('span','cm-rewards'),chip=(pic,text,title)=>{const c=mk('span','cm-reward');c.title=title;if(pic)c.append(pic);c.append(mk('b','',text));box.append(c);};
 const cur=k=>typeof currencyIcon==='function'?currencyIcon(k,'cm-reward-icon'):null;
 if(rw.primogem)chip(cur('PRIMOGEM'),fmt(rw.primogem),'원석 '+fmt(rw.primogem));
 if(rw.mora)chip(cur('MORA'),fmt(rw.mora),'모라 '+fmt(rw.mora));
 if(rw.xp)chip(mk('span','cm-reward-icon cm-exp','EXP'),fmt(rw.xp),'편성 중인 파티원 각각 경험치 +'+fmt(rw.xp));
 for(const [id,n] of Object.entries(rw.items||{})){let name=id;try{name=safeName('14_ITEM_DB',id);}catch{}chip(picture(MAN().itemIcons?.icons?.[id]?.path,'cm-reward-icon'),'×'+n,name+' ×'+n);}
 if(rw.equipment_choice?.length){const forge=rw.equipment_choice.every(id=>game?.weaponBlueprintId?.(id));chip(picture('assets/icons/facility/UI_Icon_Intee_Blacksmith.png','cm-reward-icon'),'선택',(forge?'단조 도면':'장비')+' 1개 선택');}
 return box;
}
// The whole card in the information window; whatever it does closes the window first.
function openCard(card,title){
 if(typeof showModal!=='function')return;
 if(!card.dataset.cmWired){card.dataset.cmWired='1';card.addEventListener('click',e=>{if(e.target?.closest?.('button[data-action]'))document.getElementById('modal')?.close?.();},true);}
 window.CRPGSound?.play?.('page');showModal(title,card);
}
function row(card,q,guild){
 const st=stateOf(q),[label,cls]=STATE[st],li=mk('article','cm-row '+cls);li.dataset.quest=q.row[0];li.tabIndex=0;li.setAttribute('role','button');
 const title=q.row[1]||'',level=(card.querySelector('.quest-level')?.textContent||'').match(/\d+/)?.[0],where=q.definition?.map_id&&typeof mapName==='function'?mapName(q.definition.map_id):'';
 li.setAttribute('aria-label',label+' · '+title+' · 자세히');
 const copy=mk('span','cm-copy');copy.append(mk('strong','',title),mk('small','',[level?'Lv.'+level:'',where].filter(Boolean).join(' · ')));
 li.append(mk('span','cm-state',label),copy,rewards(q.reward));
 // One small button for what comes next; several choices open the card.
 const acts=[...card.querySelectorAll('button[data-action]')].filter(b=>!/^OBJECTIVE_/.test(b.dataset.action));let main=null,many=false;
 for(const t of FIRST){const list=acts.filter(b=>b.dataset.action===t);if(list.length===1){main=list[0];break;}if(list.length>1){many=true;break;}}
 if(main){const text=main.textContent.trim(),b=mk('button','cm-go'+(['CLAIM_QUEST','COMMISSION_ACCEPT','PLACE_ENTER','WORLD_WORK_START'].includes(main.dataset.action)?' main':''),(SHORT.find(([re])=>re.test(text))||[0,text])[1]);
  b.type='button';b.dataset.action=main.dataset.action;b.disabled=main.disabled;b.title=main.title?text+' · '+main.title:text;b.setAttribute('aria-label',text);b.onclick=e=>{e.stopPropagation();main.click();};li.append(b);}
 else if(many){const b=mk('button','cm-go main','선택');b.type='button';b.onclick=e=>{e.stopPropagation();openCard(card,title);};li.append(b);}
 else li.append(mk('span','cm-go-none'));
 li.onclick=()=>openCard(card,title);li.onkeydown=e=>{if(e.target===li&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openCard(card,title);}};
 return li;
}
const prior=commissionCard;
commissionCard=function(parent,q,guild=false){
 prior(parent,q,guild);const card=parent.lastElementChild;if(!card?.classList?.contains('commission-card'))return;
 try{card.replaceWith(row(card,q,guild));parent.classList.add('cm-list');}catch(e){console.error('[commission row]',e);}
};
// Catherine's desk: the day's and the week's tasks are its first tab.
if(S?.tabset&&S?.placeLayout){
 let building=false;const tabset=S.tabset,layout=S.placeLayout;
 S.tabset=function(key,defs,cls){
  if(building&&cls==='shell-place-tabs'&&game?.atGuild?.()&&window.CRPGTaskBoard){const box=mk('div','task-desk'),v=window.CRPGTaskBoard.view();if(window.CRPGTaskBoard.board(box))defs=[{id:'tasks',label:'일일·주간',icon:'STAR',badge:v?.ready?String(v.ready):'',nodes:[box]},...defs];}
  return tabset.call(this,key,defs,cls);
 };
 S.placeLayout=function(...a){building=true;try{return layout.apply(this,a);}finally{building=false;}};
}
// Catherine's lists turn pages (◀ 1/3 ▶) in the room the screen gives them.
function pagePlace(){const pane=document.querySelector('.shell-place-tabs .shell-pane:not([hidden])'),page=window.CRPGMainScreen?.pagePane;if(!pane||!page)return;
 const tab=document.querySelector('.shell-place-tabs .shell-tab.active')?.dataset.tab||'';page(pane,'place|'+(game?.s?.placeVisit?.place||'')+'|'+tab);}
const priorRender=render;render=function(){priorRender();try{if(document.querySelector('.shell-place-tabs'))requestAnimationFrame(pagePlace);}catch(e){console.error('[guild pages]',e);}};
document.addEventListener('click',e=>{if(e.target?.closest?.('.shell-place-tabs .shell-tab'))requestAnimationFrame(pagePlace);});
let resizeTimer=0;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(pagePlace,140);});
window.CRPGGuildRows={row,rewards,pagePlace};
})();
