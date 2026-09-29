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
  const box=el('details','card mond-region-guide liyue-region-guide'),sum=el('summary','region-guide-summary');box.id='liyue-region-guide';
  sum.append(el('strong','','지역 위험도 · '+g.label),el('span',g.underLevel?'lack':'muted',g.underLevel?' · 파티보다 위험':' · 적 Lv. '+g.minLevel+'–'+g.maxLevel));box.append(sum);
  box.append(el('p','',g.biome+' · 적 Lv. '+g.minLevel+'–'+g.maxLevel+' · 현재 생존 파티 '+g.party.alive+'명 · 평균 Lv. '+g.party.average));
  box.append(el('p',g.underLevel?'region-warning':'muted',g.underLevel?'현재 파티 레벨이 이 지역의 적보다 낮습니다. 장비·회복·동료를 준비하거나 더 안전한 지역에서 성장하세요.':g.overLevel?'파티가 이 지역보다 강합니다. 적 레벨은 최대 '+g.maxLevel+'까지만 오르지만, 강화 개체가 나올 확률이 조금 오릅니다.':'적은 파티 평균 레벨 ±1 안에서, 이 지역의 레벨 범위를 넘지 않게 등장합니다.'));
  box.append(el('p','muted','이동·대기 중 조우 확률 '+g.encounterChance+'% · 지금 파티로 만날 적 Lv. '+range(g.enemyLevels)+' · 전투당 적 수는 생존 파티 인원(최대 4명)까지 줄어듭니다.'));
  if(g.tiers)box.append(el('p','muted','강화 개체 출현 · 강화 일반 '+g.tiers.enhanced+'% · 강한 정예 '+g.tiers.strongElite+'% · 지역 위험 개체 '+g.tiers.danger+'%'));
  const details=el('details','region-encounters');details.append(el('summary','','이곳에서 만날 수 있는 적 · 편성 '+g.entries.length+'개'));
  details.append(el('p','muted','기본 출현 비중입니다. 직전 편성을 제외할 때는 남은 비중으로 다시 계산합니다.'));
  for(const e of g.entries){
   const line=el('p','region-encounter-line');
   line.append(el('strong','',e.name+' · '+e.weight+'%'),el('small','',e.members.map(m=>m.name+(m.grade!=='일반'?'('+m.grade+')':'')+(m.min===m.max?' ×'+m.min:' ×'+m.min+'–'+m.max)).join(' / ')),el('small','muted',e.role+' · 지금 파티 기준 적 '+range(e.bodies)+'체 · 경험치 '+range(e.xp)+' · 모라 '+range(e.mora)));
   details.append(line);
  }
  box.append(details);
  const r=g.rewards,reward=el('details','region-encounters liyue-region-rewards');
  reward.append(el('summary','','보상 안내 · 경험치 '+range(r.xp)+' · 모라 '+range(r.mora)));
  reward.append(el('p','muted','승리 보상: 참가자별 경험치 · 공용 모라 · 쓰러뜨린 적 종류별 소재. 수치는 지금 파티로 싸울 때의 예상치입니다.'));
  for(const d of r.drops){const line=el('p','region-encounter-line');line.append(el('strong','',d.name+' · '+d.chance+'%'+(d.min===d.max?' ×'+d.min:' ×'+d.min+'–'+d.max)),el('small','muted',d.from.join(' / ')));reward.append(line);}
  const t=r.tierBonus;reward.append(el('p','muted','강화 개체를 쓰러뜨리면 그 적의 가장 귀한 소재를 더 얻습니다: 강화 일반 '+t.enhanced+'% · 강한 정예 '+t.strongElite.join('% + ')+'% · 지역 위험 개체 '+t.danger.join('% + ')+'%와 강적의 잔향 '+t.essence+'%.'));
  box.append(reward);
  if(g.boss)box.append(el('p','muted','필드 보스 · '+g.boss.name+' (Lv. '+g.boss.level+') · 원작 재료 '+g.boss.material+(g.boss.cooldown?' · '+(g.boss.cooldownReason||'아직 다시 나타나지 않았습니다.'):' · 주변 시설의 「'+g.boss.name+' 토벌」에서 도전할 수 있습니다.')));
  p.append(box);
 };
})();
