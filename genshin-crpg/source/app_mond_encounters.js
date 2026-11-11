/* Read-only region guide using the existing UI. No generated artwork. */
(function(){
 const previous=drawLocation;
 drawLocation=function(p,v){
  previous(p,v);
  if(game.s.runtime||game.s.placeVisit)return;
  const info=game.mondAreaThreat?.();if(!info)return;
  // v0.14.4: folded by default and placed at the end so phones reach the map and places first.
  // 0.16.32: in its own 「지역 정보」 tab, plain headings (folded, a phone showed one big line; open, the pages broke inside it).
  const box=el('section','card mond-region-guide'),sum=el('h3','region-guide-summary');
  sum.append(el('strong','','지역 위험도 · '+info.label),el('span',info.underLevel?'lack':'muted',info.underLevel?' · 파티보다 위험':' · 적 Lv. '+info.minLevel+'–'+info.maxLevel));box.append(sum);
  box.append(el('p','',info.biome+' · 적 Lv. '+info.minLevel+'–'+info.maxLevel+' · 현재 생존 파티 '+info.partySize+'명'));
  if(info.underLevel)box.append(el('p','region-warning','파티보다 위험한 지역 · 장비·회복·동료를 준비하세요.'));
  const details=el('section','region-encounters');details.append(el('h4','','이곳에서 만날 수 있는 적'));
  for(const e of info.entries){const line=el('p','region-encounter-line');line.append(el('strong','',e.name+' · '+e.weight+'%'),el('small','',e.monsters.map(m=>m.name+(m.min===m.max?' ×'+m.min:' ×'+m.min+'–'+m.max)).join(' / ')));details.append(line);}
  if(info.rewardGuide)box.append(el('p','muted mond-reward-guide',info.rewardGuide));box.append(details);p.append(box);
 };
})();
