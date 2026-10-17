/* Geo oculus trail ledger on Liyue maps: where each clue is, the suggested route and zone milestones. */
(function(){
 'use strict';if(!CRPGRuntime.geoTrailsVersion)return;
 const MARK={DONE:'✓',PROGRESS:'…',OPEN:'○'};
 const rewardText=r=>[r.mora?r.mora+' 모라':'',...Object.entries(r.items||{}).map(([id,n])=>safeName('14_ITEM_DB',id)+' ×'+n)].filter(Boolean).join(' · ');
 const previous=drawLocation;
 drawLocation=function(p,v){
  previous(p,v);if(game.s.runtime||game.s.placeVisit||game.needsRecovery?.()||v.map[1]!=='리월')return;
  const t=game.geoTrailView?.();if(!t)return;
  const cluesHere=t.zones.some(z=>z.stops.some(s=>s.here&&s.points.some(x=>x.status!=='DONE')));
  const box=el('details','card geo-trail');box.id='geo-trail';box.open=cluesHere;
  box.append(el('summary','','바위 눈동자 탐사 · 발견 '+t.collected+' / '+t.total+(cluesHere?' · 이곳에 단서가 있습니다':'')));
  box.append(el('p','muted','16개를 모두 찾아 절운간에서 순서대로 공양하면 종려와 동행을 약속합니다. 한 구역의 눈동자를 모두 찾으면 중간 목표 보상을 받을 수 있습니다.'));
  for(const z of t.zones){
   const zone=el('section','geo-trail-zone'+(z.complete?' complete':''));zone.dataset.zone=z.id;
   zone.append(el('h3','',z.name+' · '+z.collected+' / '+z.total));
   const goal=el('p','muted','중간 목표 · 구역의 눈동자 전부 · 보상 '+rewardText(z.reward));zone.append(goal);
   if(z.claimed)zone.append(el('small','requirement-met','중간 목표 보상을 받았습니다.'));
   else if(z.complete)zone.append(actionButton('중간 목표 보상 받기','GEO_TRAIL_CLAIM',{zone:z.id},true));
   const route=el('ol','geo-trail-route');
   for(const stop of z.stops){
    const item=el('li','geo-trail-stop'+(stop.here?' here':''));item.append(el('strong','',stop.name+(stop.here?' · 지금 있는 곳':'')));
    for(const x of stop.points){
     const line=el('div','geo-trail-point '+x.status.toLowerCase());
     line.append(el('span','',MARK[x.status]+' '+x.title+(x.status==='PROGRESS'?' · 조사 '+x.progress+' / '+x.steps:'')+(x.status==='DONE'?' · 회수함':' · Lv. '+x.level)));
     if(x.status!=='DONE'){line.append(el('small','muted',x.hint));const unmet=x.requirements.filter(r=>!r.met);if(unmet.length)line.append(el('small','requirement-unmet','필요 · '+unmet.map(r=>r.label).join(' · ')));}
     item.append(line);
    }
    if(!stop.here&&stop.points.some(x=>x.status!=='DONE')){const edge=firstTravelEdge(stop.map);if(edge)item.append(actionButton(mapName(edge[2])+' 방향으로 이동','MOVE',{edge:edge[0]}));}
    route.append(item);
   }
   zone.append(route);box.append(zone);
  }
  p.append(box);
 };
})();
