/* Liyue region board: the Mond board's questions, answered from live Liyue encounter data.
 * The shared enemy detail window and skill names stay as they are. */
(function(){
 'use strict';if(!CRPGRuntime.liyueRegionGuideVersion)return;
 const range=x=>x[0]===x[1]?String(x[0]):x[0]+'–'+x[1];
 const previous=drawLocation;
 drawLocation=function(p,v){
  previous(p,v);if(game.s.runtime||game.s.placeVisit||game.needsRecovery?.())return;
  const g=game.liyueRegionGuide?.();if(!g)return;
  // v0.14.4: folded by default and placed at the end so phones reach the map and places first.
  // 0.16.32: in its own 「지역 정보」 tab, plain headings (folded, a phone showed one big line; open, the pages broke inside it).
  const box=el('section','card mond-region-guide liyue-region-guide'),sum=el('h3','region-guide-summary');box.id='liyue-region-guide';
  sum.append(el('strong','','지역 위험도 · '+g.label),el('span',g.underLevel?'lack':'muted',g.underLevel?' · 파티보다 위험':' · 적 Lv. '+g.minLevel+'–'+g.maxLevel));box.append(sum);
  box.append(el('p','',g.biome+' · 적 Lv. '+g.minLevel+'–'+g.maxLevel+' · 현재 생존 파티 '+g.party.alive+'명 · 평균 Lv. '+g.party.average));
  if(g.underLevel)box.append(el('p','region-warning','파티보다 위험한 지역 · 장비·회복·동료를 준비하세요.'));
  box.append(el('p','muted','조우 확률 '+g.encounterChance+'% · 만날 적 Lv. '+range(g.enemyLevels)));
  if(g.tiers)box.append(el('p','muted','강화 개체 출현 · 강화 일반 '+g.tiers.enhanced+'% · 강한 정예 '+g.tiers.strongElite+'% · 지역 위험 개체 '+g.tiers.danger+'%'));
  const details=el('section','region-encounters');details.append(el('h4','','이곳에서 만날 수 있는 적 · 편성 '+g.entries.length+'개'));
  for(const e of g.entries){
   const line=el('p','region-encounter-line');
   line.append(el('strong','',e.name+' · '+e.weight+'%'),el('small','',e.members.map(m=>m.name+(m.grade!=='일반'?'('+m.grade+')':'')+(m.min===m.max?' ×'+m.min:' ×'+m.min+'–'+m.max)).join(' / ')),el('small','muted',e.role+' · 지금 파티 기준 적 '+range(e.bodies)+'체 · 경험치 '+range(e.xp)+' · 모라 '+range(e.mora)));
   details.append(line);
  }
  box.append(details);
  const r=g.rewards,reward=el('section','region-encounters liyue-region-rewards');
  reward.append(el('h4','','보상 안내 · 경험치 '+range(r.xp)+' · 모라 '+range(r.mora)));
  for(const d of r.drops){const line=el('p','region-encounter-line');line.append(el('strong','',d.name+' · '+d.chance+'%'+(d.min===d.max?' ×'+d.min:' ×'+d.min+'–'+d.max)),el('small','muted',d.from.join(' / ')));reward.append(line);}
  const t=r.tierBonus;reward.append(el('p','muted','강화 개체를 쓰러뜨리면 그 적의 가장 귀한 소재를 더 얻습니다: 강화 일반 '+t.enhanced+'% · 강한 정예 '+t.strongElite.join('% + ')+'% · 지역 위험 개체 '+t.danger.join('% + ')+'%'+(t.essence?'와 강적의 잔향 '+t.essence+'%':'')+'.'));
  box.append(reward);
  if(g.boss)box.append(el('p','muted','필드 보스 · '+g.boss.name+' (Lv. '+g.boss.level+') · 원작 재료 '+g.boss.material+(g.boss.cooldown?' · '+(g.boss.cooldownReason||'아직 다시 나타나지 않았습니다.'):' · 주변 시설의 「'+g.boss.name+' 토벌」에서 도전할 수 있습니다.')));
  p.append(box);
 };
})();
