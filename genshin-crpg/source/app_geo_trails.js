/* Geo oculus trail ledger on Liyue maps: how many are found and the zone milestones.
 * 0.16.30 (user: 「지역 정보로 눈동자 탐사 글자로 아주 머라머라 지껄이는거 보기도 힘들다. 이쁘게 정리를 하던가, 아니면 그냥 아예 없애버려도
 * 돼」, and hidden oculi stay hidden): one small card with the count, each zone as a chip with its count, and the
 * milestone reward button when a zone is complete. No list of where the clues are, no hints, no routes. */
(function(){
 'use strict';if(!CRPGRuntime.geoTrailsVersion)return;
 const previous=drawLocation;
 drawLocation=function(p,v){
  previous(p,v);if(game.s.runtime||game.s.placeVisit||game.needsRecovery?.()||v.map[1]!=='리월')return;
  const t=game.geoTrailView?.();if(!t)return;
  const box=el('section','card geo-trail');box.id='geo-trail';
  box.append(el('h3','','바위 눈동자 · '+t.collected+' / '+t.total));
  const zones=el('div','geo-trail-zones');
  for(const z of t.zones){
   const chip=el('span','geo-trail-chip'+(z.complete?' complete':''),z.name+' '+z.collected+'/'+z.total);chip.dataset.zone=z.id;zones.append(chip);
   if(z.complete&&!z.claimed)zones.append(actionButton(z.name+' 보상 받기','GEO_TRAIL_CLAIM',{zone:z.id},true));
  }
  box.append(zones);p.append(box);
 };
})();
