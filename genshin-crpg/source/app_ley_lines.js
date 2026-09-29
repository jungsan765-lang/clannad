/* v0.14.4 지맥의 꽃: this hour's blossoms on the location screen (with travel guidance), the blossom's challenge
 * screen, and the rematch notes of the two-day bosses. View-only; every action is the normal MOVE/PLACE_ENTER/BOSS_ROUTE.
 * Load after app_field_bosses.js and app_navigation.js. */
(function(){'use strict';
const L=globalThis.CRPGRuntime?.leyLines;if(!L)return;
const itemsText=items=>Object.entries(items||{}).map(([id,n])=>safeName('14_ITEM_DB',id)+' '+n+'개').join(' · ');
const guide=map=>{if(typeof NavigationUI==='undefined')return;NavigationUI.choose(map);document.getElementById('journey-map')?.scrollIntoView({block:'start',behavior:'instant'});};
const priorLocation=drawLocation;
drawLocation=function(p,v){
 priorLocation(p,v);if(game.s.runtime||game.s.placeVisit||game.needsRecovery?.())return;
 const st=game.leyLineStatus?.();if(!st)return;
 const box=el('section','card ley-line-card');box.setAttribute('aria-label','지맥의 꽃');
 const head=el('div','ley-line-head');head.append(el('h2','','지맥의 꽃'),el('span','ley-line-timer','정각까지 '+st.minutesLeft+'분'));box.append(head);
 if(!st.unlocked){box.append(el('p','muted','주인공 Lv. '+st.minLevel+'부터 매시 정각마다 몬드·리월에 핍니다.'));}
 else{
  box.append(el('p','muted ley-line-help','매시 정각에 자리를 옮기며, 계시의 꽃(경험치 책)과 부의 꽃(모라)은 한 시간에 한 번씩 받을 수 있습니다. 적은 파티 레벨에 맞춰 강해집니다.'));
  const item=b=>{const li=el('li','ley-line-item '+b.kind.toLowerCase()+(b.claimed?' claimed':'')+(b.here?' here':''));
   const copy=el('span','ley-line-copy');copy.append(el('strong','',b.name),el('small','',b.region+' · '+b.mapName+(b.claimed?' · 이번 시간 받음':'')));li.append(copy);
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
 for(const x of p.querySelectorAll('p'))if(/48시간|하루에 한 번\(현실 시간/.test(x.textContent)){x.textContent='지맥의 꽃을 지키는 적과 싸웁니다. 단계를 고를 수 있고, 높은 단계일수록 적이 강한 대신 보상이 큽니다. 매시 정각에 꽃이 자리를 옮기며, '+info.name+' 보상은 단계와 관계없이 한 시간에 한 번 받습니다. 지면 이번 시간 안에 다시 도전할 수 있습니다.';break;}
 // The single challenge button becomes one button per difficulty step.
 const single=[...p.querySelectorAll('button')].find(b=>b.textContent==='보스에게 도전'),note=single?.nextElementSibling?.classList.contains('choice-note')?single.nextElementSibling:null;
 const box=el('section','ley-line-info');box.setAttribute('aria-label','지맥의 꽃 단계');
 box.append(el('h2','',info.name+' · 단계 선택'));
 box.append(el('p',info.claimed?'ley-line-claimed':'muted',info.claimed?'이번 시간의 보상은 이미 받았습니다 · 정각까지 '+info.minutesLeft+'분':'이번 시간 남은 '+info.minutesLeft+'분 안에 한 번 받을 수 있습니다 · 전투 경험치·모라는 별도'));
 const list=el('div','ley-line-tiers');
 for(const t of info.tiers){
  const row=el('div','ley-line-tier'+(t.recommended?' recommended':'')+(t.reason?' locked':'')),copy=el('span','ley-line-copy');
  copy.append(el('strong','',t.tier+'단계 · 적 Lv. '+t.level+(t.recommended?' · 추천':'')),el('small',t.reason?'lack':'',t.reason||('보상 · '+(t.books?itemsText(t.books):t.mora.toLocaleString()+' 모라'))));
  row.append(copy,actionButton('도전','BOSS_ROUTE',{route:id,entry:'DIRECT',tier:t.tier},t.recommended));list.append(row);
 }
 box.append(list);if(note)box.append(note);
 if(single)single.replaceWith(box);else{const h=p.querySelector('h1');if(h)h.after(box);else p.prepend(box);}
};})();
