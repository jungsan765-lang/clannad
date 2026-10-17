/* 0.15.2 지역 사건 화면 (runtime_events_v0152.js; user: 「지역 사건 … 좀 늘리고. 종류를 좀 나눠서 추가하자. 원석도 좀
 * 뿌려주고」). The location screen's 할 일 tab shows today's event here: first only that something catches the eye, then
 * (살펴보기) what it is and the choices. Fights start a battle; locks and devices open their puzzle in the chest window
 * (CRPGChests.play); a gift picks food or medicine from the bag; a merchant lays out the stock. A lost traveller follows
 * the party to the town they asked for. A short note on arrival and the reward screen of an event fight say the rest.
 * Load after app_chests_v01415.js and app_puzzles_v0152.js. */
(function(){'use strict';
const SHELL=window.CRPGShell,RULES=window.CRPGRuntime?.regionEventsV0152;if(!SHELL||!RULES||typeof drawLocation!=='function')return;
const E=window.CRPGEvents={seen:new Set(),lastMap:null,giftOpen:false};
const SND=n=>{try{window.CRPGSound?.play(n);}catch{}};
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const ready=()=>typeof game!=='undefined'&&!!game&&typeof game.regionEventHere==='function';
const itemName=id=>safeName('14_ITEM_DB',id);
function rewardText(r,{primo=true}={}){const parts=[];if(primo&&r?.primogem)parts.push('원석 '+r.primogem);if(r?.mora)parts.push(fmt(r.mora)+' 모라');for(const [id,n] of Object.entries(r?.items||{}))parts.push(itemName(id)+' '+n+'개');return parts.join(' · ');}
const KIND_ICON={AMBUSH:'SWORDS',ELITE:'SWORDS',INJURED:'RELATIONS',CHEST:'STARS',PUZZLE:'PUZZLE',LOST:'MAP',MERCHANT:'SHOP',CACHE:'INVENTORY',REQUEST:'QUEST'};
const failed=r=>r?.ok===false?(typeof r.error==='string'?r.error:r.error?.message||'처리하지 못했습니다.'):'';
// One action; the result (or why not) comes back. act() answers nothing while another action runs.
async function send(params){let r;try{r=await act('REGION_EVENT',params);}catch(e){r={ok:false,error:e.message};}if(!r)return {ok:false,error:'다른 행동을 처리하는 중입니다. 잠시 뒤 다시 눌러 주세요.'};return r;}
function settled(out){
 if(!out)return;const text=rewardText(out);
 SHELL.toast?.((out.outcome==='LEFT'?'사건을 지나쳤습니다':out.outcome==='ESCORT'?out.toName+'까지 데려다주세요 · 지도에서 길 안내를 받을 수 있습니다':out.outcome==='BOUGHT'?itemName(out.item)+' '+out.qty+'개를 샀습니다':'해결 · '+(text||'보상 없음'))+(out.capped?' · 오늘 지역 사건 원석은 다 받았습니다':''));
 if(out.outcome==='DONE')SND(out.primogem?'chest_reward':'commission_accept');
}
// ---------- the card ----------
function card(here){
 const ev=here.event,box=el('section','card region-event kind-'+ev.kind.toLowerCase()+(here.done?' done':''));box.setAttribute('aria-label','지역 사건');
 const head=el('div','re-head'),ic=SHELL.icon(KIND_ICON[ev.kind]||'STAR','shell-icon re-icon');head.append(ic);
 const words=el('div','re-words');words.append(el('small','re-eyebrow','지역 사건 · 한국 시간 자정에 바뀝니다'),el('h2','',ev.name));head.append(words);box.append(head);
 if(here.done){
  const d=here.done;box.append(el('p','re-done',d.outcome==='LEFT'?'오늘은 이 사건을 지나쳤습니다. 내일 이곳에서 다른 일이 생길 수도 있습니다.':'오늘 이곳의 사건을 마무리했습니다. 내일 다시 둘러보세요.'));
  box.append(primoLine(here));return box;
 }
 box.append(el('p','re-text',ev.text));
 if(here.busy)box.append(el('p','choice-note',here.busy));
 const list=el('div','re-choices');
 for(const c of ev.choices){
  if(c.buy){list.append(shop(ev,here));continue;}
  const row=el('div','re-choice'),b=button(c.label,()=>choose(ev,c,here,b),!!c.reason||busy,c.id!=='LEAVE');
  if(c.reason)withReason(b,c.reason);row.append(b);
  const hint=c.reward?rewardText(c.reward):'';const extra=[c.battle?(c.elite?'강해진 마물과 전투':'전투'):'',c.puzzle&&ev.puzzle?'퍼즐 · '+ev.puzzle.name:'',c.minutes?c.minutes+'분 걸림':'',c.escort?'목적지에 함께 가면 보상':''].filter(Boolean);
  if(hint||extra.length)row.append(el('small','re-reward',[...extra,hint&&'보상 '+hint].filter(Boolean).join(' · ')));
  if(c.reason)row.append(el('small','choice-note',c.reason));
  if(c.gift&&E.giftOpen===ev.key)row.append(giftPicker(ev,c));
  list.append(row);
 }
 box.append(list,primoLine(here));return box;
}
function primoLine(here){const full=here.primogems>=here.cap;return el('p','re-primo'+(full?' full':''),'오늘 지역 사건 원석 '+here.primogems+' / '+here.cap+(full?' · 모라와 재료는 계속 받습니다':''));}
// Something catches the eye; 살펴보기 shows what (kept for the session).
function teaser(here){
 const box=el('section','card region-event teaser');box.setAttribute('aria-label','지역 사건');
 const head=el('div','re-head');head.append(SHELL.icon('EYE','shell-icon re-icon'));const words=el('div','re-words');words.append(el('small','re-eyebrow','지역 사건'),el('h2','','무언가 눈에 띕니다'));head.append(words);
 box.append(head,el('p','muted','이 근처에서 무슨 일이 벌어지고 있는 것 같습니다.'));
 box.append(button('살펴보기',()=>{E.seen.add(here.event.key);SND('chest_appear');box.replaceWith(card(game.regionEventHere()));},false,true));
 return box;
}
function escortCard(here){
 const e=here.escort,box=el('section','card region-event escort');box.setAttribute('aria-label','동행 중');
 const head=el('div','re-head');head.append(SHELL.icon('MAP','shell-icon re-icon'));const words=el('div','re-words');words.append(el('small','re-eyebrow','지역 사건 · 동행 중'),el('h2','','길 잃은 사람과 동행 중'));head.append(words);box.append(head);
 box.append(el('p','',e.from+'에서 만난 사람을 '+e.toName+'까지 데려다주는 중입니다.'+(e.here?' 목적지에 도착했습니다.':'')));
 if(e.here){const b=actionButton('도착 · 데려다주기','REGION_EVENT',{choice:'ARRIVE'},true);b.onclick=async()=>{const r=await send({choice:'ARRIVE'});const why=failed(r);if(why){say?.(why);return;}settled(r.result);};box.append(b);}
 else{box.append(button('길 안내 · '+e.toName,()=>{if(typeof NavigationUI!=='undefined')NavigationUI.choose(e.to);SHELL.openMap?.();SHELL.toast?.('길 안내 · '+e.toName);},false,false));
  box.append(el('small','muted','자정(한국 시간)이 지나면 그 사람은 스스로 길을 찾아 떠납니다.'));}
 return box;
}
// ---------- choices ----------
async function choose(ev,c,here,b){
 if(c.puzzle){play(ev,here);return;}
 if(c.gift){E.giftOpen=E.giftOpen===ev.key?false:ev.key;render();return;}
 b.disabled=true;const r=await send({choice:c.id});const why=failed(r);if(why){say?.(why);render();return;}
 if(c.battle)return;// the battle screen takes over; the reward screen tells the rest
 settled(r.result);
}
function giftPicker(ev,c){
 const wrap=el('div','re-gift');const foods=game.s.inventory.filter(i=>i.item&&i.quantity>0&&['음식','전투 치료품'].includes(game.tables['14_ITEM_DB'].get(i.item)?.[2]));
 const seen=new Set();
 for(const i of foods){if(seen.has(i.item))continue;seen.add(i.item);
  let d;try{d=itemPresenter.itemDetail({item:i.item,quantity:game.itemCount(i.item)});}catch{d={name:itemName(i.item)};}
  const b=button('',async()=>{const r=await send({choice:c.id,item:i.item});const why=failed(r);if(why){say?.(why);return;}E.giftOpen=false;settled(r.result);},busy,false);b.className='re-gift-item';
  let g;try{g=itemGlyph(d);}catch{g=el('span','item-glyph','◆');}g.classList.add('re-gift-icon');b.append(g,el('span','',d.name||itemName(i.item)),el('small','','×'+game.itemCount(i.item)));wrap.append(b);}
 if(!seen.size)wrap.append(el('p','muted','건넬 음식이나 치료품이 없습니다.'));
 return wrap;
}
function shop(ev,here){
 const wrap=el('div','re-shop');const bought=new Set(here.bought||[]);
 ev.stock.forEach((s,i)=>{
  const row=el('div','re-shop-row'+(bought.has(i)?' sold':''));let d;try{d=itemPresenter.itemDetail({item:s.item,quantity:s.qty});}catch{d={name:s.name};}
  let g;try{g=itemGlyph(d);}catch{g=el('span','item-glyph','◆');}g.classList.add('re-gift-icon');
  const copy=el('span','re-shop-copy');copy.append(el('strong','',(d.name||s.name)+' ×'+s.qty),el('small','',fmt(s.price)+' 모라'));row.append(g,copy);
  if(bought.has(i))row.append(el('span','re-sold','산 물건'));
  else{const why=game.actionReason('REGION_EVENT',{choice:'BUY',index:i});const b=button('사기',async()=>{const r=await send({choice:'BUY',index:i});const w=failed(r);if(w){say?.(w);return;}settled(r.result);},!!why||busy,true);if(why)withReason(b,why);row.append(b);}
  wrap.append(row);
 });
 return wrap;
}
// Locks and devices: the puzzle in the chest window, then what it paid in the same window.
function play(ev,here){
 const C=window.CRPGChests;if(!C?.play||!here.puzzle){SHELL.toast?.('퍼즐을 불러오지 못했습니다.');return;}
 C.play({title:ev.name,sub:ev.mapName+' · 지역 사건',region:ev.region,glyph:ev.kind==='CHEST'?null:'PUZZLE',icon:'common',puzzle:here.puzzle,solvedText:ev.kind==='CHEST'?'자물쇠가 풀렸다!':'장치가 풀렸다!',
  done:async(answer,body)=>{
   const r=await send({choice:'SOLVE',answer}),why=failed(r);
   body.replaceChildren();body.className='ch-body ch-reveal re-reveal';body.closest('.ch-box')?.classList.remove('wide');
   if(why){C.note(body,why,'warn');const again=document.createElement('button');again.type='button';again.className='ch-btn primary';again.textContent='닫기';again.onclick=()=>C.close();body.append(again);SND('error');return;}
   const out=r.result||{},stage=document.createElement('div');stage.className='ch-stage re-stage';
   const rays=document.createElement('div');rays.className='ch-rays';const glow=document.createElement('div');glow.className='ch-glow';stage.append(rays,glow);
   if(ev.kind==='CHEST'){const img=document.createElement('img');img.className='ch-chest';img.src='assets/icons/chests/chest_common.webp';img.alt='';stage.append(img);}else{const g=SHELL.icon('PUZZLE','shell-icon re-stage-glyph');stage.append(g);}
   body.append(stage,C.rewardRow({primogem:out.primogem,mora:out.mora,items:out.items}));
   if(out.capped)C.note(body,'오늘 지역 사건 원석은 다 받았습니다 (모라와 재료는 계속 받습니다).');
   const p=document.createElement('p');p.className='ch-progress';p.textContent=ev.name+' 해결 · 오늘 지역 사건 원석 '+(game.regionToday?.()?.primogems??0)+' / '+RULES.primogemsPerDay;body.append(p);
   const ok=document.createElement('button');ok.type='button';ok.className='ch-btn primary ch-done';ok.textContent='확인';ok.onclick=()=>C.close();body.append(ok);
   SND(out.primogem?'chest_reward':'commission_accept');
  }});
}
// ---------- the location screen ----------
const priorLocation=drawLocation;
drawLocation=function(p,v){
 priorLocation(p,v);
 try{
  if(!ready()||game.s.runtime||game.s.placeVisit||game.needsRecovery?.())return;
  const here=game.regionEventHere(),out=[];
  if(here.escort)out.push(escortCard(here));
  if(here.event)out.push(here.done||E.seen.has(here.event.key)?card(here):teaser(here));
  if(!out.length)return;
  const anchor=p.querySelector('.main-objective,.pinned-objective,.next-chapter,.field-objective');
  if(anchor)anchor.after(...out);else{const h=p.querySelector('.area-level')||p.querySelector('h1');if(h)h.after(...out);else p.append(...out);}
 }catch(e){console.warn('region event card',e);}
};
// A note on arrival: something happens here, or the lost traveller's town is reached.
if(typeof render==='function'){const prior=render;render=function(){prior();try{
 if(!ready()){E.lastMap=null;return;}const map=game.s.global.CURRENT_MAP_ID;if(map===E.lastMap)return;const first=E.lastMap===null;E.lastMap=map;if(first||game.s.runtime)return;
 const here=game.regionEventHere();
 if(here.escort?.here)SHELL.toast?.(here.escort.toName+'에 도착했습니다 · 할 일 탭에서 「도착 · 데려다주기」를 눌러 주세요.');
 else if(here.event&&!here.done)SHELL.toast?.('이 근처에서 무언가 눈에 띕니다 · 할 일 탭을 살펴보세요.');
}catch{}};}
// ---------- the reward screen of an event fight ----------
if(typeof reward==='function'){const priorReward=reward;reward=function(p,...args){
 const out=priorReward(p,...args);
 try{
  const r=JSON.parse(game.s.global.LAST_BATTLE_RESULT_JSON||'{}'),e=r.regionEvent;if(!e)return out;
  const c=el('section','card region-event-result');c.append(el('small','eyebrow','지역 사건'),el('h2','',e.name+(e.settled?' · 해결':e.victory?'':' · 실패')));
  if(e.settled)c.append(el('p','','사건 보상 · '+(rewardText(e)||'없음')+(e.capped?' · 오늘 지역 사건 원석은 다 받았습니다':'')));
  else if(e.victory)c.append(el('p','muted','이미 마무리했거나 날짜가 바뀐 사건이라 사건 보상은 없습니다.'));
  else c.append(el('p','muted','오늘 안에 이곳으로 돌아오면 다시 도전할 수 있습니다.'));
  p.append(c);
 }catch{}
 return out;
};}
})();
