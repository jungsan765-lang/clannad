/* Liyue Harbor districts: who to visit for what, and the requests each introduction place passes on. */
(function(){
 'use strict';if(!CRPGRuntime.liyuePlacesVersion)return;
 const FLAVOR={
  EVT_CRPG_LIYUE_WANMIN:'흘호암 골목의 이름난 식당. 요리를 주문하지 않아도 부탁 이야기를 들을 수 있다.',
  EVT_CRPG_LIYUE_BUBU:'약초 향이 밴 비운 언덕의 약방. 회복약과 연금 재료를 구하고, 약방에 얽힌 부탁을 듣는다.',
  EVT_CRPG_LIYUE_FEIYUN:'비운 언덕의 큰 상회. 상회에 드나드는 사람들의 부탁이 모인다.',
  EVT_CRPG_LIYUE_NORTHLAND:'비운 언덕 상점가의 은행. 먼 나라 손님들의 소식이 오간다.',
  EVT_CRPG_LIYUE_YUJING:'칠성의 업무가 오가는 높은 대. 관청과 선인에 얽힌 부탁이 모인다.',
  EVT_CRPG_LIYUE_HEYU:'연극과 차가 있는 흘호암의 다관.',
  EVT_CRPG_LIYUE_YANSHANG:'흘호암 골목 안쪽의 조용한 찻집.',
  EVT_CRPG_LIYUE_DOCKS:'배와 화물이 드나드는 부두. 선원과 장사꾼의 부탁이 모인다.',
  EVT_CRPG_LIYUE_WANGSHENG:'도시 외곽 길목의 장례 사무소.',
  EVT_CRPG_LIYUE_ARTISAN:'장인들이 도구와 공예품을 손보는 작업장.',
  EVT_CRPG_LIYUE_WANGSHU_INN:'벽수원 길목의 객잔. 하룻밤 묵어 가며 객잔에 얽힌 부탁을 들을 수 있다.'
 };
 // 0.16.2 (user: 「제작이 다 가린다」, 불복려): a shop or a workshop is sized to the screen, so the stories appended under it
 // squeezed its list to nothing. There they open in their own window from 「개인 이야기」; a place that only talks keeps
 // them on the page.
 function liyueIntroductions(parent,mode='inline'){
  const place=game.currentPlace?.();if(!place?.valid||!game.liyueIntroductionPlace?.(place.place))return;
  // 0.16.30: the owned companions' personal stories that begin at this place (nobody is recruited any more).
  const here=(typeof personalStoryEntries==='function'?personalStoryEntries():[]).filter(e=>!e.complete&&game.legendIntroductionPlaces(e.definition).some(p=>p.id===place.place));
  const section=el('section','contact-stories liyue-introductions');section.id='liyue-introductions';
  const windowed=mode==='window';if(!here.length)return;
  if(!windowed)section.append(el('h2','','이곳에서 시작하는 개인 이야기'));
  if(FLAVOR[place.place])section.append(el('p','story',FLAVOR[place.place]));
  const grid=el('div','personal-story-list');for(const e of here)personalStoryCard(grid,e);section.append(grid);
  const shortcut=el('div','contact-entry-link');
  if(windowed){
   // A press inside the window closes it first, so the page under it redraws with the result.
   section.addEventListener('click',e=>{if(e.target.closest?.('button'))document.getElementById('modal')?.close?.();},true);
   shortcut.append(button('개인 이야기 · '+here.length,()=>showModal('이곳에서 시작하는 개인 이야기',section),false,true));parent.insertBefore(shortcut,parent.firstChild);return;
  }
  parent.append(section);
 }
 const priorShop=shop,priorDialogue=dialogue,priorCrafting=crafting;
 shop=function(...args){priorShop.apply(this,args);liyueIntroductions(args[0],'window');};
 dialogue=function(...args){priorDialogue.apply(this,args);liyueIntroductions(args[0]);};
 crafting=function(...args){priorCrafting.apply(this,args);liyueIntroductions(args[0],'window');};
 const priorLocation=drawLocation;
 drawLocation=function(p,v){
  priorLocation(p,v);if(game.s.runtime||game.s.placeVisit||game.needsRecovery?.())return;
  const directory=game.liyueCityDirectory?.()||[];if(!directory.some(d=>d.here))return;
  const card=el('section','card liyue-city-directory');card.id='liyue-city-directory';
  card.append(el('small','eyebrow','누구를 찾아가 무엇을 할까'),el('h2','','리월항 구역 안내'),el('p','muted','시설을 모든 구역에 두지 않고 구역마다 역할을 나눴습니다. 「소개」 표시가 있는 곳에서 동료의 부탁을 듣습니다.'));
  for(const d of directory){
   const row=el('div','liyue-district'+(d.here?' here':''));row.dataset.districtMap=d.map;
   row.append(el('strong','',d.name+' · '+d.role),el('p','muted',d.text));
   const chips=el('div','liyue-district-places');
   for(const place of d.places){const label=[place.role,place.introduction?'소개':''].filter(Boolean).join(' · ');chips.append(el('span','liyue-place-chip'+(place.introduction?' intro':''),place.name+(label?' · '+label:'')));}
   row.append(chips);
   if(d.here)row.append(el('small','requirement-met','지금 있는 구역'));
   else{const edge=firstTravelEdge(d.map);if(edge)row.append(actionButton(mapName(edge[2])+' 방향으로 이동','MOVE',{edge:edge[0]}));}
   card.append(row);
  }
  const places=p.querySelector('.location-places');if(places)places.after(card);else p.append(card);
 };
})();
