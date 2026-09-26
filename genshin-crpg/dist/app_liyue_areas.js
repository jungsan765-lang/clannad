/* v0.13.15: local context, fixed raster coordinates and accessible destination browsing. */
(function(){
 'use strict';const catalog=CRPGRuntime.liyueAreaCatalog;if(!catalog)return;
 // Add anchors without changing one byte of the approved raster or existing Mondstadt anchors.
 for(const a of catalog.areas)CRPGTerrainMap.points[a.id]=['liyue',a.point[0],a.point[1],a.anchor];
 const kinds={GATHER:'채집',MINE:'채광',FISH:'낚시',HUNT:'사냥'};
 const focusMap=id=>{const pt=CRPGTerrainMap.points[id];if(pt){NavigationUI.atlas=pt[0];NavigationUI.camera={mode:'custom',zoom:2,cx:pt[1],cy:pt[2]};}NavigationUI.choose(id);document.querySelector('.terrain-travel-dock')?.scrollIntoView({block:'nearest',behavior:'instant'});};
 const priorCard=NavigationUI.card;
 NavigationUI.card=function(n){const b=priorCard.call(this,n),a=game.liyueArea?.(n.id);if(a)b.querySelector('.terrain-card-copy')?.append(el('small','liyue-card-feature',a.zone+' · '+a.feature));return b;};
 const priorDraw=NavigationUI.draw;
 NavigationUI.draw=function(){const section=priorDraw.call(this);if(game.view().map[1]!=='리월'&&this.atlas!=='liyue')return section;
  const shown=catalog.areas.find(a=>a.id===(this.target||game.s.global.CURRENT_MAP_ID));
  if(shown){const types={FEATURE:'구조물 기준점',SHORE:'기슭 기준점',PATH:'길 기준점',AREA:'지형 대표점'};
   const note=el('aside','liyue-coordinate-detail');note.dataset.coordinateId=shown.id;
   note.append(el('strong','',shown.name+' · '+(types[shown.anchorKind]||'지형 기준점')),
    el('span','liyue-coordinate-value','원본 좌표 X '+shown.point[0]+' / Y '+shown.point[1]),
    el('p','',shown.anchor),el('small','muted','880 × 786 원본의 왼쪽 위 기준 · 번호 버튼이 아닌 연결선 끝의 작은 점이 위치입니다.'));
   section.querySelector('.terrain-layout')?.after(note);
  }
  const browse=el('details','liyue-area-browser');browse.id='liyue-area-browser';browse.append(el('summary','','리월 세부 지역 찾아보기 · '+catalog.areas.length+'곳'));
  browse.append(el('p','muted','장소 선택은 지도 확인뿐입니다. 경유 경로를 확인한 뒤 이동 버튼으로 한 구역씩 출발하세요.'));
  for(const zone of [...new Set(catalog.areas.map(a=>a.zone))]){const group=el('details','liyue-area-group');group.append(el('summary','',zone));
   const grid=el('div','liyue-browse-grid');for(const a of catalog.areas.filter(a=>a.zone===zone)){
    const b=button('',()=>focusMap(a.id));b.dataset.areaId=a.id;b.className='liyue-browse-place';b.append(el('strong','',a.name),el('small','',a.feature+(a.kind?' · '+kinds[a.kind]:'')));grid.append(b);
   }group.append(grid);browse.append(group);
  }
  section.querySelector('.terrain-provenance')?.before(browse);
  return section;
 };
 const previous=drawLocation;
 drawLocation=function(parent,v){previous(parent,v);if(game.s.runtime||game.s.placeVisit||game.needsRecovery())return;
  const a=game.liyueAreaInfo?.();if(!a)return;
  const panel=el('section','card liyue-local-guide');panel.id='liyue-local-guide';panel.append(el('small','eyebrow',a.zone+' · 자유 탐방'),el('h2','',a.name),el('p','',a.description));
  const row=el('div','liyue-local-tags');row.append(el('span','',a.safe?'안전한 거점':a.encounter?'야외 · 이동 중 적과 조우 가능':'야외 탐방 구역'),el('span','',a.kind?kinds[a.kind]+' 가능':'풍경 감상·길 찾기'));panel.append(row);
  const look=button('주변을 살펴본다',()=>{const box=el('div','liyue-local-observation');box.append(el('p','story',a.observe),el('p','muted','둘러보기에는 시간과 재료가 들지 않습니다.'));showModal(a.name,box);});look.dataset.lyLook=a.id;panel.append(look);
   if(!a.kind&&a.parent==='MAP_LIYUE_HARBOR'){panel.append(el('p','muted','상점·제작·숙박·길드·본편 재개는 기존 리월항 중심 거점을 이용합니다.'),button('리월항 중심으로 가는 길 보기',()=>focusMap('MAP_LIYUE_HARBOR')));}
  const map=parent.querySelector('#journey-map');if(map)map.before(panel);else parent.prepend(panel);
 };
})();
