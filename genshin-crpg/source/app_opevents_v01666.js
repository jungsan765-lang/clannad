/* 0.16.66 운영자 이벤트 화면 (runtime_reading.js 0.16.66, server/op-events-v01666.mjs; user: 「중반 재료 벽을 오히려 이벤트같은곳에서
 * 뿌려주면 되겠지. 한번 운영자 이벤트 아이디어좀 생각해서 만들어봐」). While the operator has an event open, the location screen's 할 일
 * tab shows a card: each event, how long it runs and what is left today; 축제 교환 also its 「축제 증표」. The card opens the window:
 * the rules in a line each and the 교환소 — each thing with its picture, cost and limit, the kind picked by pressing (no lists to
 * open), and 교환. A battle's reward screen says when an event doubled it and how many tokens came. Nothing shows without an
 * open event, and nothing shows offline. Load before app_pages_v0167.js (the 할 일 tab is paged after this card is in). */
(function(){'use strict';
const O=window.CRPGOnline,K=window.CRPGRuntime?.opEventsV01666;if(!K||typeof drawLocation!=='function')return;
const E=window.CRPGOpEvents={status:null,loading:false,probe:0,session:null,pick:{},open:false};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const btn=(label,fn,cls='')=>{const b=mk('button','oe-btn '+cls,label);b.type='button';b.onclick=fn;return b;};
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const MAN=()=>typeof MANIFEST!=='undefined'?MANIFEST:(window.CRPG_MANIFEST||{});
const ready=()=>typeof game!=='undefined'&&!!game&&typeof game.opEvents==='function';
const itemName=id=>{try{return game.tables['14_ITEM_DB'].get(id)?.[1]||id;}catch{return id;}};
const icon=id=>{const p=MAN().itemIcons?.icons?.[id]?.path;if(!p)return mk('span','oe-icon fallback','◆');const i=mk('img','oe-icon');i.src=p;i.alt='';i.draggable=false;return i;};
const left=ms=>{const h=Math.ceil(ms/3600000);return h>48?Math.ceil(h/24)+'일 남음':Math.max(1,h)+'시간 남음';};
const ELEMENT={PYRO:'불',HYDRO:'물',ANEMO:'바람',ELECTRO:'번개',CRYO:'얼음',GEO:'바위',DENDRO:'풀',NEUTRAL:'다이아몬드'};
const BOOK={FREEDOM:'자유',RESISTANCE:'투쟁',BALLAD:'시문',PROSPERITY:'번영',DILIGENCE:'근면',GOLD:'황금'};
const NAME={PRIMO:'원석 160',GEM_2:'돌파 보석 조각',GEM_3:'돌파 보석 덩이',BOOK_2:'특성 책 「인도」',BOOK_3:'특성 책 「철학」',BOSS:'필드 보스 재료',HERO:'영웅의 경험',MORA:'모라 5,000'};
const EARN=[['win','전투 승리'],['life','채집·채광·사냥·낚시'],['event','지역 사건'],['commission','의뢰 보고']];
// 0.16.67: the 축제 교환 that runs with a festival is shown in the festival's window (app_festival_v01667.js), not here
function events(){try{return ready()?game.opEvents().filter(e=>!String(e.id).startsWith('EVT_FES_')):[];}catch{return [];}}
function setList(list){window.CRPGOpEventsList=Array.isArray(list)?list:[];}
function reset(){E.status=null;E.session=null;E.probe=0;setList([]);}
async function load(){
 if(E.loading||!O?.token)return;E.loading=true;const session=O.sessionStamp?.();
 try{const out=await O.request('/events');if(session&&!O.sameSession?.(session))return;E.status=out;E.session=session;setList(out.events);}
 catch(e){if(e?.status===404){E.status={events:[]};setList([]);}}
 finally{E.loading=false;}
 try{if(typeof render==='function')render();if(E.open)openWindow();}catch{}
}
// a day's use: 「오늘 1 / 3」; 축제 교환: the tokens
function todayText(ev){
 if(ev.kind==='FESTIVAL'){const shop=game.festivalShop?.();return '축제 증표 '+fmt(shop?.tokens||0);}
 if(ev.kind==='DOMAIN_SUPPLY'){const d=game.s.domainDaily,day=Math.floor((Date.now()+9*3600000)/86400000),wins=d?.day===day?Number(d.wins)||0:0;return '오늘 재료 2배 '+Math.max(0,6-wins)+'판 남음';}
 return '오늘 '+game.opEventUsesLeft(ev.kind)+' / '+ev.daily+'번 남음';
}
function card(){
 const list=events();if(!list.length)return null;const c=mk('section','card op-events-card'),head=mk('div','oe-head');
 head.append(mk('strong','','이벤트'),mk('small','',list.length+'개 진행 중'),btn(list.some(e=>e.kind==='FESTIVAL')?'교환소':'자세히',()=>openWindow(),'oe-open'));c.append(head);
 const ul=mk('ul','oe-list');for(const ev of list){const li=mk('li','oe-row oe-'+ev.kind.toLowerCase());li.title=ev.text;li.append(mk('b','oe-name',ev.name),mk('span','oe-today',todayText(ev)),mk('small','oe-left',left(ev.endsAt-Date.now())));ul.append(li);}
 c.append(ul);return c;
}
// ---------- the window ----------
function shopBox(redraw=()=>openWindow()){
 const shop=game.festivalShop?.();if(!shop)return null;const box=mk('section','oe-shop');
 const top=mk('div','oe-shop-top');top.append(mk('strong','oe-tokens','축제 증표 '+fmt(shop.tokens)));const earn=mk('div','oe-earn');for(const [k,label] of EARN)earn.append(mk('span','oe-earn-chip',label+' +'+shop.earn[k]));top.append(earn);box.append(top);
 const grid=mk('div','oe-grid');
 for(const it of shop.items){
  const cell=mk('div','oe-item'+(it.bought>=it.limit?' done':'')),choices=it.choices||[];let pick=E.pick[it.key];if(it.pick&&!choices.includes(pick))pick=E.pick[it.key]=choices[0];
  const id=it.pick==='element'?'GROWTH_GEM_'+pick+'_'+it.key.slice(-1):it.pick==='book'?'GROWTH_BOOK_'+pick+'_'+it.key.slice(-1):it.pick==='boss'?pick:it.item;
  const pic=it.mora||it.primogem?(window.currencyIcon?.(it.mora?'MORA':'PRIMOGEM','oe-icon')||mk('span','oe-icon fallback','◆')):icon(id);
  const name=it.pick?itemName(id):NAME[it.key]||itemName(id);cell.append(pic,mk('b','oe-item-name',name),mk('small','oe-cost','증표 '+it.cost+' · '+it.bought+' / '+it.limit));
  if(it.pick){const row=mk('div','oe-choices');for(const ch of choices){const b=it.pick==='boss'?btn('',()=>{E.pick[it.key]=ch;redraw();},'oe-choice'+(ch===pick?' on':'')):btn(it.pick==='element'?ELEMENT[ch]||ch:BOOK[ch]||ch,()=>{E.pick[it.key]=ch;redraw();},'oe-choice'+(ch===pick?' on':''));if(it.pick==='boss'){b.append(icon(ch));b.title=itemName(ch);}b.setAttribute('aria-pressed',String(ch===pick));row.append(b);}cell.append(row);}
  const args={event:shop.event,item:it.key,...(it.pick?{choice:pick}:{})},why=game.actionReason('EVENT_EXCHANGE',args);
  const go=btn('교환',()=>{Promise.resolve(typeof act==='function'?act('EVENT_EXCHANGE',args):null).then(()=>{if(redraw!==openWindow||E.open)redraw();});},'oe-go');go.disabled=!!why;if(why)go.title=why;cell.append(go);grid.append(cell);
 }
 box.append(grid);return box;
}
function openWindow(){
 const list=events();E.open=true;const box=mk('div','oe-window');
 if(!list.length)box.append(mk('p','oe-empty','지금 열린 이벤트가 없습니다.'));
 const rules=mk('div','oe-rules');for(const ev of list){const r=mk('div','oe-rule');r.append(mk('b','',ev.name),mk('span','',ev.text),mk('small','',todayText(ev)+' · '+left(ev.endsAt-Date.now())));rules.append(r);}box.append(rules);
 const shop=shopBox();if(shop)box.append(shop);
 if(typeof showModal==='function')showModal('이벤트',box);
 const modal=document.getElementById('modal');if(modal&&!modal.oeTracked){modal.oeTracked=true;modal.addEventListener('close',()=>{E.open=false;});}
}
E.openWindow=openWindow;E.shopBox=shopBox;E.load=()=>{E.probe=0;return load();};
// ---------- the location screen's 할 일 ----------
{const prior=drawLocation;drawLocation=function(p,v){prior(p,v);try{if(game.needsRecovery?.())return;const c=card();if(!c)return;const at=p.querySelector(':scope>.task-mini')||p.querySelector(':scope>.main-objective');if(at)at.after(c);else p.append(c);}catch(e){console.error('[op-events]',e);}};}
// ---------- the reward screen ----------
if(typeof reward==='function'){const prior=reward;reward=function(p,...args){const out=prior(p,...args);try{
 const r=JSON.parse(game.s.global.LAST_BATTLE_RESULT_JSON||'{}'),tags=Array.isArray(r.opEvents)?r.opEvents:[],tokens=Number(r.festivalTokens)||0;if(!tags.length&&!tokens)return out;
 const c=mk('section','card op-events-result');c.append(mk('small','eyebrow','이벤트'));const ul=mk('ul','oe-list');
 for(const t of tags)ul.append(mk('li','oe-row',t.name+' · 보상 2배'+(t.limit?' ('+t.used+' / '+t.limit+')':'')));if(tokens)ul.append(mk('li','oe-row','축제 증표 +'+tokens));c.append(ul);p.append(c);}catch{}return out;};}
// ---------- the server's news, and once per login ----------
window.CRPGChat?.on?.(ev=>{if(ev?.type==='op-event'){E.probe=0;setTimeout(load,200);}});
if(typeof render==='function'){const prior=render;render=function(){prior();try{
 if(!O?.token){if(E.status||E.session)reset();return;}
 if(E.session&&O.sameSession&&!O.sameSession(E.session))reset();
 // 0.16.67: also when a festival opens (the server says when the next one does)
 const ended=(window.CRPGOpEventsList||[]).some(e=>Date.now()>=Number(e.endsAt)&&!(e.kind==='SEASON'&&Date.now()<Number(e.endsAt)+7*86400000))||(E.status?.nextAt&&Date.now()>=E.status.nextAt);
 if((!E.status||ended)&&!E.loading&&Date.now()>=E.probe){E.probe=Date.now()+60000;load();}
}catch{}};}
})();
