/* v0.14.4 지맥의 꽃: this hour's blossoms on the location screen (with travel guidance), the blossom's challenge
 * screen, and the rematch notes of the two-day bosses. View-only; every action is the normal MOVE/PLACE_ENTER/BOSS_ROUTE.
 * Load after app_field_bosses.js and app_navigation.js. */
(function(){'use strict';
const L=globalThis.CRPGRuntime?.leyLines;if(!L)return;
function rewardIcon(id,cls){const p=typeof MANIFEST!=='undefined'&&MANIFEST.itemIcons?.icons?.[id]?.path;if(!p)return el('span',cls+' mark','✦');const i=el('img',cls);i.src=p;i.alt='';i.draggable=false;return i;}
// A step's reward as pictures with counts (the names stay in the tooltip).
function rewardChips(t){const row=el('span','ley-line-rewards'),add=(id,n,label)=>{const c=el('span','ley-line-chip');c.title=label;c.append(rewardIcon(id,'ley-line-icon'),el('b','',n));row.append(c);};
 if(t.books)for(const [id,n]of Object.entries(t.books))add(id,'×'+n,safeName('14_ITEM_DB',id)+' '+n+'개');else if(t.mora)add('CUR_MORA',t.mora.toLocaleString(),'모라 '+t.mora.toLocaleString());return row;}
const guide=map=>{if(typeof NavigationUI==='undefined')return;NavigationUI.choose(map);document.getElementById('journey-map')?.scrollIntoView({block:'start',behavior:'instant'});};
const priorLocation=drawLocation;
drawLocation=function(p,v){
 priorLocation(p,v);if(game.s.runtime||game.s.placeVisit||game.needsRecovery?.())return;
 const st=game.leyLineStatus?.();if(!st)return;
 const box=el('section','card ley-line-card');box.setAttribute('aria-label','지맥의 꽃');
 const head=el('div','ley-line-head');head.append(el('h2','','지맥의 꽃'),el('span','ley-line-timer','정각까지 '+st.minutesLeft+'분'));box.append(head);
 // 0.14.13: below the level the card says so plainly, with the level now, instead of a grey line.
 if(!st.unlocked){box.append(el('p','ley-line-locked','⚠ 아직 도전할 수 없습니다 · 주인공 Lv. '+st.minLevel+'부터 (지금 Lv. '+(Number(game.s.global.PLAYER_LEVEL_STATE)||1)+')'),el('p','muted','매시 정각마다 몬드·리월 곳곳에 핍니다. 레벨을 올린 뒤 다시 찾아오세요.'));}
 else{
  // 0.15.25: no paragraph (the old one also said the enemies follow the party's level; they are fixed by region and step).
  box.append(el('small','muted ley-line-help','꽃마다 한 시간에 한 번 · 정각에 자리를 옮김'));
  const item=b=>{const li=el('li','ley-line-item '+b.kind.toLowerCase()+(b.claimed?' claimed':'')+(b.here?' here':''));
   const copy=el('span','ley-line-copy');copy.append(el('strong','',b.name),el('small','',b.region+' · '+b.mapName+(b.claimed?' · 이번 시간 받음':'')));li.append(rewardIcon(b.kind==='REVELATION'?'MAT_CHAR_EXP_HERO':'CUR_MORA','ley-line-icon'),copy);
   if(b.here)li.append(el('span','ley-line-here',b.claimed?'받음':'이 구역'));
   else if(!b.claimed)li.append(button('길 안내',()=>guide(b.map)));
   return li;};
  // The blossoms of the region the party is in come first; the other region folds away.
  const region=game.tables['32_MAP_DB'].get(game.s.global.CURRENT_MAP_ID)?.[1],near=st.blossoms.filter(b=>b.region===region),far=st.blossoms.filter(b=>b.region!==region);
  const list=el('ul','ley-line-list');for(const b of near.length?near:st.blossoms)list.append(item(b));box.append(list);
  if(near.length&&far.length){const more=el('details','ley-line-more'),rest=el('ul','ley-line-list');more.append(el('summary','',[...new Set(far.map(b=>b.region))].join('·')+'의 지맥의 꽃 '+far.length+'곳'));for(const b of far)rest.append(item(b));more.append(rest);box.append(more);}
 }
 const anchor=p.querySelector('.location-places')||p.querySelector('#journey-map')||p.querySelector('.main-objective');if(anchor)anchor.after(box);else p.append(box);
};
// Destination cards on the travel map name this hour's blossom too.
if(typeof NavigationUI!=='undefined'){const priorCard=NavigationUI.card;NavigationUI.card=function(n){const b=priorCard.call(this,n),st=game.leyLineStatus?.();if(st?.unlocked)for(const x of st.blossoms.filter(x=>x.map===n.id&&!x.claimed))b.querySelector('.terrain-card-copy')?.append(el('small','terrain-boss-note ley-line-note','지맥의 꽃 · '+x.name));return b;};}
function leyRoute(){const v=game.currentPlace?.();const id=v?.valid&&v.entry?.kind==='BOSS'?v.entry.route:null;return id&&String(id).startsWith('BRT_LEY_')?id:null;}
const priorBoss=boss;
boss=function(p,...args){
 priorBoss(p,...args);const id=leyRoute(),info=id&&game.leyLineRouteInfo?.(id);if(!info)return;
 for(const x of p.querySelectorAll('p'))if(/48시간|하루에 한 번\(현실 시간/.test(x.textContent)){x.textContent='높은 단계일수록 적이 강하고 보상이 큽니다 · 보상은 한 시간에 한 번 · 지면 다시 도전 가능';break;}
 // The single challenge button becomes one button per difficulty step.
 const single=[...p.querySelectorAll('button')].find(b=>b.textContent==='보스에게 도전'),note=single?.nextElementSibling?.classList.contains('choice-note')?single.nextElementSibling:null;
 const box=el('section','ley-line-info');box.setAttribute('aria-label','지맥의 꽃 단계');
 box.append(el('h2','',info.name+' · 단계 선택'));
 box.append(el('p',info.claimed?'ley-line-claimed':'muted',info.claimed?'이번 시간의 보상은 이미 받았습니다 · 정각까지 '+info.minutesLeft+'분':'이번 시간 남은 '+info.minutesLeft+'분 안에 한 번 받을 수 있습니다 · 전투 경험치·모라는 별도'));
 const list=el('div','ley-line-tiers');
 for(const t of info.tiers){
  const row=el('div','ley-line-tier'+(t.recommended?' recommended':'')+(t.reason?' locked':'')),copy=el('span','ley-line-copy');
  copy.append(el('strong','',t.tier+'단계 · 적 Lv. '+t.level+(t.recommended?' · 추천':'')));if(t.reason)copy.append(el('small','lack',t.reason));
  row.append(copy,rewardChips(t),actionButton('도전','BOSS_ROUTE',{route:id,entry:'DIRECT',tier:t.tier},t.recommended));list.append(row);
 }
 box.append(list);if(note)box.append(note);
 if(single)single.replaceWith(box);else{const h=p.querySelector('h1');if(h)h.after(box);else p.prepend(box);}
};})();
