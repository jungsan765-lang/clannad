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
 // 0.16.2 (user: 「제작이 다 가린다」, 불복려): a shop or a workshop is sized to the screen, so the introductions appended under it
 // squeezed its list to nothing. There they open in their own window from 「동료 영입 임무 소개」; a place that only talks
 // keeps them on the page.
 function liyueIntroductions(parent,mode='inline'){
  const place=game.currentPlace?.();if(!place?.valid||!game.liyueIntroductionPlace?.(place.place))return;
  const offers=game.legendContactEntries?.()||[],section=el('section','contact-stories liyue-introductions');section.id='liyue-introductions';
  const windowed=mode==='window';if(windowed&&!offers.length)return;
  if(!windowed)section.append(el('h2','','이곳에서 들을 수 있는 부탁'));
  if(FLAVOR[place.place])section.append(el('p','story',FLAVOR[place.place]));
  section.append(el('p','muted','소개만 받을 때는 재화를 쓰지 않습니다. 준비 비용은 개인 임무를 시작할 때 사용합니다.'));
  for(const entry of offers){
   const d=entry.definition,q=game.tables['22_QUEST_DB'].get(d.QUEST_ID),c=el('section','card');
   c.append(el('h3','',q?.[1]||entry.title),el('p','',q?.[5]||'당사자를 만나 이야기를 듣습니다.'));
   if(!game.legendRegistered(entry.id)){
    if(typeof requirementList==='function')requirementList(c,game.legendRequirements(d,{cost:false,location:false}));
    const reason=game.legendIntroductionReason?.(d);if(reason)c.append(el('p','requirement-unmet',reason));
    c.append(actionButton('이야기를 듣고 개인 임무 소개받기','LEGEND_REGISTER',{quest:entry.id},true));
   }else{c.append(el('p','muted','소개받은 개인 임무 · 임무 현장으로 이동한 뒤 시작할 수 있습니다.'));travelGuide(c,d.MAP_ID);}
   section.append(c);
  }
  if(!offers.length)section.append(el('p','muted','이곳에서 소개하는 개인 임무를 모두 마쳤습니다. 임무의 동료 획득 화면에서 다른 소개처를 확인할 수 있습니다.'));
  const shortcut=el('div','contact-entry-link');
  if(windowed){
   // A press inside the window closes it first, so the page under it redraws with the result.
   section.addEventListener('click',e=>{if(e.target.closest?.('button'))document.getElementById('modal')?.close?.();},true);
   shortcut.append(button('동료 영입 임무 소개 · '+offers.length+'개',()=>showModal('이곳에서 들을 수 있는 부탁',section),false,true));parent.insertBefore(shortcut,parent.firstChild);return;
  }
  parent.append(section);
  if(offers.length){shortcut.append(button('동료 영입 임무 소개 · '+offers.length+'개',()=>section.scrollIntoView({block:'start',behavior:'smooth'}),false,true));parent.insertBefore(shortcut,parent.firstChild);}
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
