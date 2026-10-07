/* 0.16.7 일일 · 주간 임무판 (runtime_tasks_v0167.js; user: 「일퀘 주간퀘를 나눠서 할 일을 만드는게 좋아보여. 게임을 들어가면 뭘 해야될지
 * 고민하게 되는게 문제라서. 그리고 의뢰 버튼이 너무 쓸데없이 커. 보기 불편해. 그냥 가능한 칸코레랑 비슷한 느낌으로 해주면 좋긴 한데」).
 * Like a 칸코레 임무 board: short rows, each with its colored kind label, what to do, a bar of how far, the reward's
 * pictures and a small 「받기」 when done. 일일 renews at Korean midnight, 주간 on Monday. The board is the first tab of
 * 임무 and of Catherine's desk, and the day's four ride on the main screen's 「할 일」 so the next thing to do is in
 * sight when the game opens. Load after app_adventure.js and app_shell.js. */
(function(){
'use strict';
if(typeof render!=='function')return;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const MAN=()=>typeof MANIFEST!=='undefined'?MANIFEST:(window.CRPG_MANIFEST||{});
const KIND={battle:['전투','k-battle'],ley:['지맥','k-ley'],domain:['비경','k-domain'],life:['생활','k-life'],boss:['토벌','k-boss'],bonus:['보너스','k-bonus']};
let scope='daily',showBoard=true;
function view(){try{return game?.taskView?.()||null;}catch{return null;}}
function left(ms){const m=Math.max(0,Math.round((ms-Date.now())/60000));if(m>=1440)return Math.floor(m/1440)+'일 '+Math.floor(m%1440/60)+'시간';if(m>=60)return Math.floor(m/60)+'시간 '+m%60+'분';return m+'분';}
function rewardChips(r){
 const box=mk('span','task-reward');
 const chip=(icon,text,title)=>{const c=mk('span','task-reward-chip');c.title=title;if(icon)c.append(icon);c.append(mk('b','',text));box.append(c);};
 const cur=k=>typeof currencyIcon==='function'?currencyIcon(k,'task-reward-icon'):null;
 if(r.primogem)chip(cur('PRIMOGEM'),fmt(r.primogem),'원석 '+fmt(r.primogem));
 if(r.mora)chip(cur('MORA'),fmt(r.mora),'모라 '+fmt(r.mora));
 for(const [id,n] of Object.entries(r.items||{})){const p=MAN().itemIcons?.icons?.[id]?.path;let i=null;if(p){i=mk('img','task-reward-icon');i.src=p;i.alt='';i.draggable=false;}let name=id;try{name=safeName('14_ITEM_DB',id);}catch{}chip(i,'×'+n,name+' ×'+n);}
 return box;
}
function row(x){
 const li=mk('li','task-row '+(x.claimed?'claimed':x.lock?'locked':x.done?'ready':'progress'));li.dataset.task=x.id;
 const [label,cls]=KIND[x.icon]||['임무',''];li.append(mk('span','task-kind '+cls,label));
 const copy=mk('span','task-copy');copy.append(mk('strong','',x.name));
 const bar=mk('span','task-bar');const fill=mk('i');fill.style.width=Math.round(x.progress/x.goal*100)+'%';bar.append(fill);copy.append(bar);
 li.append(copy,mk('span','task-count',x.progress+'/'+x.goal),rewardChips(x.reward));
 if(x.claimed)li.append(mk('span','task-state','받음'));
 else if(x.lock)li.append(mk('span','task-state lock',x.lock));
 else if(x.done)li.append(claimButton(x));
 else li.append(mk('span','task-state','진행 중'));
 return li;
}
// 「받기」, or for the day's bonus 「보고」 at Catherine's desk; away from her, a way to her when she is here.
function claimButton(x){
 if(x.here){const b=actionButton(x.report?'보고':'받기','TASK_CLAIM',{task:x.id},true);b.classList.add('task-claim');return b;}
 const desk=game.placeEntries?.().find(e=>['NPC_MOND_KATHERYNE','NPC_LIYUE_KATHERYNE'].includes(e.entity)&&!e.reason);
 if(desk){const b=actionButton('캐서린에게','PLACE_ENTER',{place:desk.id},true);b.classList.add('task-claim');b.title='캐서린에게 보고해야 받을 수 있습니다.';return b;}
 const s=mk('span','task-state report','캐서린에게 보고');s.title='모험가 길드의 캐서린에게 보고하면 받습니다.';return s;
}
// The whole board (임무, Catherine).
function board(parent){
 const v=view();if(!v)return null;const sec=mk('section','task-board');
 const head=mk('div','task-head'),tabs=mk('div','task-scopes');
 for(const [key,label,ends] of [['daily','일일',v.dayEndsAt],['weekly','주간',v.weekEndsAt]]){const list=key==='daily'?[...v.daily,v.bonus]:v.weekly,ready=list.filter(x=>x.done&&!x.claimed).length;
  const b=button('',()=>{scope=key;render();});b.className='task-scope'+(scope===key?' active':'');b.setAttribute('aria-pressed',String(scope===key));b.append(mk('b','',label),mk('small','','새로 · '+left(ends)));if(ready)b.append(mk('span','task-dot',String(ready)));tabs.append(b);}
 head.append(tabs);if(v.here>1)head.append(actionButton('모두 받기 · '+v.here,'TASK_CLAIM',{task:'ALL'},true));sec.append(head);
 const list=mk('ul','task-list'),items=scope==='daily'?[...v.daily,v.bonus]:v.weekly;for(const x of items)list.append(row(x));sec.append(list);
 parent.append(sec);return sec;
}
// The day's four on the main screen's 「할 일」: one line each.
function mini(parent){
 const v=view();if(!v)return;const sec=mk('section','card task-mini'),head=mk('div','task-mini-head');
 head.append(mk('strong','','오늘의 임무'),mk('small','',[...v.daily,v.bonus].filter(x=>x.claimed||x.done).length+' / '+(v.daily.length+1)));
 const more=button('임무판',()=>{showBoard=true;scope='daily';act('MENU',{screen:'QUEST'});});more.className='task-mini-open';head.append(more);sec.append(head);
 const list=mk('ul','task-mini-list');for(const x of [...v.daily,v.bonus]){const li=mk('li','task-mini-row '+(x.claimed?'claimed':x.lock?'locked':x.done?'ready':'progress'));const [label,cls]=KIND[x.icon]||['',''];li.title=x.name;li.append(mk('span','task-kind '+cls,label),mk('span','task-mini-name',x.short||x.name),mk('b','task-count',x.claimed?'받음':x.lock?x.lock:x.progress+'/'+x.goal));
  if(x.done&&!x.claimed){const b=claimButton(x);if(!x.here)b.textContent='보고';li.append(b);}list.append(li);}
 sec.append(list);parent.append(sec);
}
// 임무: the board is the first tab.
if(typeof quests==='function'){const prior=quests;quests=function(p){
 if(showBoard&&view()){
  p.append(mk('div','eyebrow','모험 기록'),mk('h1','','임무'));if(typeof mainObjective==='function')mainObjective(p);
  const tabs=mk('div','bag-tabs journal-tabs');for(const label of ['일일·주간','진행 중','동료 획득','완료']){const b=button(label,()=>{if(label==='일일·주간')showBoard=true;else{showBoard=false;try{missionTab=label;}catch{}}render();});const on=label==='일일·주간';b.setAttribute('aria-pressed',String(on));b.classList.toggle('selected',on);tabs.append(b);}p.append(tabs);
  board(p);if(typeof returnToJourney==='function')returnToJourney(p);return;}
 prior(p);
 const tabs=p.querySelector('.journal-tabs');if(tabs){const b=button('일일·주간',()=>{showBoard=true;render();});const v=view();if(v?.ready)b.append(mk('span','task-dot',String(v.ready)));tabs.prepend(b);}
};}
// The main screen: the day's four first in 「할 일」.
if(typeof drawLocation==='function'){const prior=drawLocation;drawLocation=function(p,v){prior(p,v);try{if(game.needsRecovery?.())return;const at=p.querySelector(':scope>.main-objective');const box=mk('div');mini(box);const card=box.firstChild;if(!card)return;if(at)at.after(card);else p.append(card);}catch(e){console.error('[tasks]',e);}};}
// (user: 「임무 완수하면 보상이 들어왔다는게 보여야되는데 그게 없어.」) What a claim paid shows itself, like the original's
// 「획득」: the pictures and counts in a band across the screen that closes by itself or with a press.
function gained(r){
 const cur=k=>typeof currencyIcon==='function'?currencyIcon(k,'task-gain-icon'):null,list=[];
 // The tile's color is the item's grade, as in the original (원석 gold, 모라 blue, 모험가의 경험 blue, 영웅의 경험 purple).
 const GRADE={일반:'green',고급:'blue',희귀:'purple',영웅:'gold',전설:'gold'};
 if(r.primogem)list.push({icon:cur('PRIMOGEM'),n:r.primogem,name:'원석',grade:'gold'});
 if(r.mora)list.push({icon:cur('MORA'),n:r.mora,name:'모라',grade:'blue'});
 for(const [id,n] of Object.entries(r.items||{})){const p=MAN().itemIcons?.icons?.[id]?.path;let i=null;if(p){i=mk('img','task-gain-icon');i.src=p;i.alt='';i.draggable=false;}let name=id,grade='';try{name=safeName('14_ITEM_DB',id);grade=GRADE[game.tables['14_ITEM_DB']?.get(id)?.[3]]||'';}catch{}list.push({icon:i,n,name,grade});}
 if(!list.length)return;
 document.querySelector('.task-gain')?.remove();
 const wrap=mk('div','task-gain'),box=mk('div','task-gain-box'),items=mk('div','task-gain-items'),names=r.names||[];wrap.setAttribute('role','status');wrap.setAttribute('aria-live','polite');
 box.append(mk('strong','task-gain-title','임무 보상 획득'));if(names.length)box.append(mk('small','task-gain-from',names[0]+(names.length>1?' 외 '+(names.length-1)+'개':'')));
 for(const x of list){const c=mk('span','task-gain-item');c.title=x.name+' ×'+fmt(x.n);const pic=mk('span','task-gain-pic'+(x.grade?' g-'+x.grade:''));if(x.icon)pic.append(x.icon);c.append(pic,mk('b','task-gain-count','×'+fmt(x.n)),mk('small','task-gain-name',x.name));items.append(c);}
 box.append(items);wrap.append(box);document.body.append(wrap);
 let gone=false;const close=()=>{if(gone)return;gone=true;wrap.classList.add('out');setTimeout(()=>wrap.remove(),240);};wrap.onclick=close;setTimeout(close,3200);
 try{window.CRPGSound?.play('item_receive');}catch{}
}
if(typeof act==='function'){const priorAct=act;act=async function(type,params={}){const out=await priorAct(type,params);
 try{if(type==='TASK_CLAIM'&&out&&out.ok!==false){const r=[out.result,out.result?.result,out].find(x=>x&&Array.isArray(x.claimed));if(r)gained(r);}}catch(e){console.error('[tasks]',e);}
 return out;};}
// A task that has just been done says so once, so the reward is not missed.
let doneBefore=null,doneSave=null,doneTimer=0;
function noticeDone(){doneTimer=0;const v=view();if(!v){doneBefore=null;return;}const all=[...v.daily,v.bonus,...v.weekly],now=new Set(all.filter(x=>x.done).map(x=>x.id)),save=game?.s?.global?.SAVE_ID;
 if(doneBefore&&doneSave===save&&!game.s.runtime){const fresh=all.filter(x=>x.done&&!x.claimed&&!doneBefore.has(x.id));if(fresh.length)window.CRPGShell?.toast?.('임무 달성 · '+fresh[0].name+(fresh.length>1?' 외 '+(fresh.length-1)+'개':'')+(fresh.every(x=>x.report)?' · 캐서린에게 보고':' · 임무에서 보상 받기'));}
 if(!game?.s?.runtime){doneBefore=now;doneSave=save;}}
{const prior=render;render=function(){prior();try{if(!doneTimer)doneTimer=setTimeout(noticeDone,700);}catch{}};}
window.CRPGTaskBoard={board,mini,view,gained};
})();
