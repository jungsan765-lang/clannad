/* Read-only region guide using the existing UI. No generated artwork. */
(function(){
 const previous=drawLocation;
 drawLocation=function(p,v){
  previous(p,v);
  if(game.s.runtime||game.s.placeVisit)return;
  const info=game.mondAreaThreat?.();if(!info)return;
  const box=el('section','card mond-region-guide');
  box.append(el('h2','','지역 위험도 · '+info.label));
  box.append(el('p','',info.biome+' · 적 Lv. '+info.minLevel+'–'+info.maxLevel+' · 현재 생존 파티 '+info.partySize+'명'));
  box.append(el('p',info.underLevel?'region-warning':'muted',info.underLevel?'현재 파티 레벨보다 위험한 지역입니다. 장비·회복·동료를 준비하거나 안전한 지역에서 성장하세요.':'이 지역의 적은 표시된 레벨 범위 안에서 등장합니다. 레벨이 올라도 초반 지역의 적이 끝없이 강해지지는 않습니다.'));
  const details=el('details','region-encounters');details.append(el('summary','','이곳에서 만날 수 있는 적'));
  details.append(el('p','muted','기본 출현 비중입니다. 직전 편성을 제외할 때는 남은 비중으로 재계산하며, 전투당 적 수는 생존 파티 인원(최대 4명)에 맞춰 줄어듭니다.'));
  for(const e of info.entries){const line=el('p','region-encounter-line');line.append(el('strong','',e.name+' · '+e.weight+'%'),el('small','',e.monsters.map(m=>m.name+(m.min===m.max?' ×'+m.min:' ×'+m.min+'–'+m.max)).join(' / ')));details.append(line);}
  if(info.rewardGuide)box.append(el('p','muted mond-reward-guide',info.rewardGuide));box.append(details);p.insertBefore(box,p.children[2]||null);
 };
})();
