/* Statue of The Seven: the Traveler's element resonance. Presentation only; TRAVELER_RESONATE changes state. */
(function(){
 'use strict';if(!CRPGRuntime.travelerGeoVersion)return;
 const FLAVOR={GEO:'바위 신상이 손끝에 닿자 땅속 깊은 곳에서 묵직한 울림이 올라온다.',ANEMO:'바람 신상 앞에 서자 익숙한 바람이 몸을 한 바퀴 휘감는다.'};
 const QUIET={GEO:'손을 뻗어 바위 신상에 닿아 보지만, 차가운 돌의 감촉만 남는다. 땅속의 울림은 이 몸을 비껴간다.',ANEMO:'바람 신상 앞에 서 보지만, 바람은 옷자락만 스치고 지나간다. 이 세계의 원소는 아직 내게 응답하지 않는다.'};
 function resonance(parent){
  const v=game.travelerResonanceView?.();if(!v?.statue)return;
  const card=el('section','card traveler-resonance');card.id='traveler-resonance';
  card.append(el('small','eyebrow','일곱 신상'),el('h2','',v.traveler?'원소 공명':v.statue==='GEO'?'바위 신상':'바람 신상'));
  if(!v.traveler){card.append(el('p','story',QUIET[v.statue]||QUIET.ANEMO),el('p','muted','이세계인은 신상과 공명할 수 없습니다. 대신 적을 약화시키고, 동료와 합동 공격을 이어 가며 강해집니다.'));parent.append(card);return;}
  card.append(el('p','story',FLAVOR[v.statue]));
  if(!v.resonant){card.append(el('p','requirement-unmet','먼저 바람 신상과의 공명을 되찾아야 합니다.'));parent.append(card);return;}
  card.append(el('p','','지금 원소 · '+(v.elements.find(e=>e.active)?.name||'바람')+' · 공명한 원소 '+v.elements.filter(e=>e.unlocked).map(e=>e.name).join('·')));
  for(const e of v.elements){
   const box=el('div','resonance-element'+(e.active?' active':'')+' identity-'+e.id.toLowerCase());
   box.append(el('strong','',e.name+' 원소'+(e.active?' · 사용 중':e.unlocked?' · 공명함':' · 미공명')));
   for(const s of e.skills)box.append(el('p','muted',s.key+' '+s.name+' — '+s.text));
   if(e.statue===game.currentPlace()?.place&&!e.active)box.append(actionButton(e.unlocked?e.name+' 원소로 바꾸기':e.name+' 원소와 공명하기','TRAVELER_RESONATE',{element:e.id},true));
   else if(!e.active)box.append(el('small','muted',e.reason));
   card.append(box);
  }
  card.append(el('p','muted','원소를 바꾸면 E·Q 기술이 그 원소의 기술로 바뀝니다. 공명한 원소는 저장되며, 각 원소의 신상에서 언제든 다시 바꿀 수 있습니다.'));
  parent.append(card);
 }
 const priorDialogue=dialogue;
 dialogue=function(...args){priorDialogue.apply(this,args);resonance(args[0]);};
 const priorVisual=placeVisual;
 placeVisual=function(entry){const v=priorVisual(entry);return /^EVT_CRPG_STATUE_/.test(entry?.id||'')?{...v,kind:'일곱 신상 · 원소 공명'}:v;};
})();
