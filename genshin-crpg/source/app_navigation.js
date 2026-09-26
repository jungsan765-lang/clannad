/* Terrain navigation: approved pixels + read-only area anchors; all travel uses normal MOVE. */
const NavigationUI={target:null,saveId:null,mapId:null,atlas:null,camera:null,observer:null,
 point(id){return window.CRPGTerrainMap?.points[id]||null;},
 atlasFor(id){return this.point(id)?.[0]||({'몬드':'mond','리월':'liyue'})[game.tables['32_MAP_DB'].get(id)?.[1]]||null;},
 nearby(){return game.rows('47_MAP_EDGE_DB').filter(r=>r[1]===game.s.global.CURRENT_MAP_ID&&r[8]==='Y'&&r[11]==='ACTIVE'&&game.tables['32_MAP_DB'].has(r[2])).map((r,i)=>({row:r,id:r[2],number:i+1,reason:game.edgeReason(r),point:this.point(r[2])}));},
 risk(id){const m=game.tables['32_MAP_DB'].get(id);if(!m)return '';return m[12]==='Y'?'안전한 거점':m[4]==='BOSS'?'보스 도전 구역':Number(m[7])>0?'권장 Lv.'+m[6]+'–'+m[7]:'이동 구역';},
 direction(id){const a=this.point(game.s.global.CURRENT_MAP_ID),b=this.point(id);if(!a||!b||a[0]!==b[0])return '지역 간 이동';const dx=b[1]-a[1],dy=b[2]-a[2];if(Math.hypot(dx,dy)<38)return '같은 구역 주변';return ['동쪽','남동쪽','남쪽','남서쪽','서쪽','북서쪽','북쪽','북동쪽'][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];},
 choose(id){this.target=id;this.refresh();if(id&&window.innerWidth<=600){const dock=document.querySelector('.terrain-travel-dock'),b=dock?.getBoundingClientRect();if(b&&(b.top<0||b.bottom>window.innerHeight))dock.scrollIntoView({block:'nearest',behavior:'instant'});}},
 cameraMode(mode){this.camera={mode};this.refresh();},
 draw(){
  this.observer?.disconnect();const g=game.s.global,current=g.CURRENT_MAP_ID,T=window.CRPGTerrainMap;
  if(this.saveId!==g.SAVE_ID){this.saveId=g.SAVE_ID;this.target=null;this.mapId=null;}
  if(this.mapId!==current){this.mapId=current;this.target=null;this.atlas=this.atlasFor(current);this.camera={mode:'near'};}
  if(!this.atlas)this.atlas=this.atlasFor(current)||'mond';if(!this.camera)this.camera={mode:'near'};
  if(this.target&&!game.tables['32_MAP_DB'].has(this.target))this.target=null;
  const nearby=this.nearby(),goal=game.navigationGoal(),target=this.target,route=target?game.navigationRoute(target):null;
  const section=el('section','journey-map terrain-navigation');section.id='journey-map';section.setAttribute('aria-label','지형 지도와 이동 목적지');
  const header=el('header','terrain-header'),title=el('div','terrain-title');title.append(el('small','','여행 지도 · '+T.atlases[this.atlas].name),el('h2','','현재 위치 · '+mapName(current)));header.append(title);
  const shortcuts=el('div','terrain-shortcuts');if(goal)shortcuts.append(this.control('임무 목적지',()=>this.choose(goal),'goal'));
  shortcuts.append(this.control('내 위치로',()=>{this.atlas=this.atlasFor(current)||this.atlas;this.cameraMode('near');},'home'));header.append(shortcuts);section.append(header);
  const body=el('div','terrain-layout'),left=el('div','terrain-map-column'),right=el('div','terrain-destinations');
  left.append(this.drawMap(nearby));
  const controls=el('div','terrain-controls'),zoom=el('div','terrain-zoom');
  zoom.append(this.control('−',()=>this.zoom(.8),'zoom-out','지도 축소'),this.control('+',()=>this.zoom(1.25),'zoom-in','지도 확대'));
  controls.append(zoom,this.control('주변 보기',()=>this.cameraMode('near'),'near'),this.control('지역 전체',()=>this.cameraMode('full'),'full'));
  left.append(controls,el('p','terrain-legend','◆ 현재 구역   · 지형상 위치점   ① 선택 버튼(선으로 연결)'));
  const note=this.point(current)?.[3];if(note)left.append(el('p','terrain-location-note',note));
  left.append(el('small','terrain-help','점을 누르기 어려우면 같은 번호의 큰 카드를 선택하세요. 확대 후 지도를 밀어 볼 수 있습니다.'));
  right.append(el('h3','','어디로 갈까?'),el('p','terrain-select-help','목적지 카드를 누르면 바로 이동합니다. 지도 번호는 위치와 경로를 미리 확인할 때 사용하세요.'));
  const domestic=nearby.filter(n=>!n.reason&&n.point?.[0]===this.atlas),other=nearby.filter(n=>!domestic.includes(n));
  const cards=el('div','terrain-destination-list');for(const n of domestic)cards.append(this.card(n));if(!domestic.length)cards.append(el('p','muted','이 지도 안에서 바로 이어지는 길이 없습니다.'));right.append(cards);
  if(other.length){const details=el('details','terrain-other-routes');details.open=other.some(n=>n.id===target);details.append(el('summary','','다른 지역·잠긴 길 ('+other.length+')'));for(const n of other)details.append(this.card(n));right.append(details);}
  const find=el('details','terrain-search');find.open=!!target&&!nearby.some(n=>n.id===target);find.append(el('summary','','먼 목적지·귀환로 찾기'));
  const select=el('select');select.id='journey-map-target';select.setAttribute('aria-label','찾아갈 장소');const empty=el('option','','목적지를 선택하세요');empty.value='';select.append(empty);
  for(const m of game.rows('32_MAP_DB').filter(m=>m[0]&&['몬드','리월'].includes(m[1]))){const o=el('option','',m[2]);o.value=m[0];select.append(o);}select.value=target||'';select.onchange=()=>this.choose(select.value||null);find.append(select);
  if(current!=='MAP_MOND_CITY')find.append(this.control('몬드로 돌아가는 길 찾기',()=>this.choose('MAP_MOND_CITY'),'return'));right.append(find);body.append(left,right);section.append(body);
  const dock=el('div','terrain-travel-dock');dock.setAttribute('aria-live','polite');const detail=el('div','terrain-selection');
  if(target){detail.append(el('small','','선택한 목적지'),el('strong','',mapName(target)),el('span','',this.risk(target)));
   const direct=nearby.find(n=>n.id===target);
   if(direct?.reason){detail.append(el('p','terrain-lock-reason','이동 불가 · '+direct.reason));dock.append(detail,this.disabledTravel());}
   else if(route?.edges.length){const edge=route.edges[0];detail.append(el('span','',route.edges.length===1?'이동 시간 '+route.minutes+'분':route.edges.length+'구역 경유 · 총 '+route.minutes+'분'));
    const b=actionButton((route.edges.length===1?mapName(target)+'으로 이동':'다음 구역 · '+mapName(edge[2]))+' · '+edge[5]+'분','MOVE',{edge:edge[0]},true);b.classList.add('terrain-travel');b.dataset.navFocus='travel';dock.append(detail,b);
    if(route.edges.length>1){const chain=el('div','terrain-route-chain');chain.append(el('small','','경로 · '+route.maps.map(mapName).join(' → ')),el('small','','한 구역씩 이동하며, 조우와 통행 조건을 건너뛰지 않습니다.'));dock.append(chain);}
   }else if(target===current){detail.append(el('span','','이미 도착한 장소입니다.'));dock.append(detail,this.disabledTravel('현재 위치'));}
   else{detail.append(el('p','terrain-lock-reason','지금 연결된 길이 없습니다. 본편 안내 이동이나 출입 조건을 확인하세요.'));dock.append(detail,this.disabledTravel());}
   const destAtlas=this.atlasFor(target);if(destAtlas&&destAtlas!==this.atlas){const b=this.control(T.atlases[destAtlas].name+' 지도 미리보기',()=>{this.atlas=destAtlas;const p=this.point(target);this.camera=p?{mode:'custom',zoom:1.7,cx:p[1],cy:p[2]}:{mode:'full'};this.refresh();},'preview');dock.append(b);}
  }else{detail.append(el('strong','','지도 번호를 선택하면 이동 경로를 미리 볼 수 있습니다.'),el('span','','오른쪽 목적지 카드는 누르는 즉시 출발합니다.'));dock.append(detail,this.disabledTravel('지도에서 목적지를 선택하세요'));}
  section.append(dock);
  const footer=el('details','terrain-provenance');footer.append(el('summary','','지도 표시 기준'),el('p','','승인된 두 지도 이미지를 그대로 사용합니다. 작은 위치점은 지형 좌표에 고정됩니다. 번호는 누르기 쉽게 옮길 수 있으며 연결선 끝의 작은 점이 위치입니다. 넓은 구역·활동 장소와 실내·지하는 대표점으로 표시하며, 미검증 입구를 정확한 좌표로 보지 않습니다. 흐린 영역에는 임의의 지점을 만들지 않습니다. 지역 간 길은 카드에서 선택하고 실제 이동 규칙을 따릅니다.'));section.append(footer);
  return section;
 },
 control(text,fn,key,label){const b=button(text,fn);b.dataset.navFocus=key;if(label)b.setAttribute('aria-label',label);return b;},
 disabledTravel(text='이동할 수 없습니다'){const b=button(text,()=>{},true);b.className='terrain-travel';return b;},
 card(n){const b=n.reason?this.control('',()=>this.choose(n.id),'card-'+n.row[0]):actionButton('','MOVE',{edge:n.row[0]},true);b.dataset.navFocus='card-'+n.row[0];b.className='terrain-destination'+(this.target===n.id?' selected':'')+(n.reason?' locked':'');b.dataset.destination=n.id;b.setAttribute('aria-pressed',String(this.target===n.id));
  const num=el('span','terrain-number',String(n.number)),copy=el('span','terrain-card-copy');copy.append(el('strong','',mapName(n.id)),el('small','',this.direction(n.id)+' · '+n.row[5]+'분 · '+this.risk(n.id)));
  if(n.point?.[3])copy.append(el('small','terrain-point-note',n.point[3]));
  if(n.reason)copy.append(el('small','terrain-lock-reason','잠김 · '+n.reason));else if(!n.point)copy.append(el('small','','지도 범위 밖 · 경로로 이동'));
  b.append(num,copy,el('span','terrain-card-state',n.reason?'잠김':'이동'));
  const highlight=()=>{document.querySelectorAll('.terrain-pin').forEach(p=>p.classList.toggle('hovered',(p.dataset.destinations||'').split(',').includes(n.id)));};
  b.addEventListener('pointerenter',highlight);b.addEventListener('focus',highlight);b.addEventListener('pointerleave',()=>document.querySelectorAll('.terrain-pin.hovered').forEach(p=>p.classList.remove('hovered')));return b;
 },
 drawMap(nearby){
  const T=CRPGTerrainMap,atlas=this.atlas,viewport=el('div','terrain-viewport'),canvas=el('div','terrain-canvas'),sheet=el('div','terrain-sheet'),img=el('img','terrain-raster');
  viewport.setAttribute('aria-label',T.atlases[atlas].name+' 지형 지도');img.src=T.atlases[atlas].url;img.alt=T.atlases[atlas].name+' 원본 보존 지형 지도';img.width=T.width;img.height=T.height;img.draggable=false;
  sheet.append(img);canvas.append(sheet);viewport.append(canvas);
  const overlays=el('div','terrain-pins');sheet.append(overlays);const banner=el('div','terrain-map-status');banner.setAttribute('aria-live','polite');viewport.append(banner);
  const current=this.point(game.s.global.CURRENT_MAP_ID),local=nearby.filter(n=>n.point?.[0]===atlas),target=this.point(this.target);
  const addMarker=(point,kind,text,label,ids=[],fn)=>{const p=fn?this.control('',fn,'pin-'+ids.join('-'),label):el('div');p.className='terrain-pin '+kind;p.style.left=(point[1]/T.width*100)+'%';p.style.top=(point[2]/T.height*100)+'%';p.dataset.destinations=ids.join(',');p.append(el('span','terrain-pin-core',text));p.title=label;if(kind==='current')p.append(el('span','terrain-current-label','현재 위치'));if(this.target&&ids.includes(this.target))p.classList.add('selected');overlays.append(p);return p;};
  let initializing=false,drawnScale=0;
  const drawPins=scale=>{overlays.replaceChildren();
   // Geographic anchors NEVER move for touch accessibility. Only the numbered controls move.
   const seen=new Set(),anchor=(point,id)=>{if(seen.has(id))return;seen.add(id);
    const a=el('span','terrain-anchor');a.style.left=(point[1]/T.width*100)+'%';a.style.top=(point[2]/T.height*100)+'%';a.dataset.mapId=id;a.setAttribute('aria-hidden','true');overlays.append(a);};
   if(current?.[0]===atlas)anchor(current,game.s.global.CURRENT_MAP_ID);
   for(const n of local)anchor(n.point,n.id);
   if(target?.[0]===atlas)anchor(target,this.target);
   const line=(point,bx,by)=>{const ax=point[1]*scale,ay=point[2]*scale,dx=bx-ax,dy=by-ay;if(Math.hypot(dx,dy)<5)return;
    const stem=el('span','terrain-leader');stem.style.cssText=`left:${ax}px;top:${ay}px;width:${Math.hypot(dx,dy)}px;transform:rotate(${Math.atan2(dy,dx)}rad)`;stem.setAttribute('aria-hidden','true');overlays.prepend(stem);};
   // The cluster control uses the first member as its reference, not a fictitious mean coordinate.
   const pending=local.slice(),groups=[];while(pending.length){const first=pending.shift(),group=[first];for(let i=pending.length-1;i>=0;i--)if(Math.hypot((pending[i].point[1]-first.point[1])*scale,(pending[i].point[2]-first.point[2])*scale)<48){group.push(pending.splice(i,1)[0]);}groups.push(group);}
   const occupied=current?.[0]===atlas?[[current[1]*scale,current[2]*scale]]:[];
   for(const group of groups){const n=group[0],ids=group.map(x=>x.id),p=n.point;
    const origin=[p[1]*scale,p[2]*scale],offsets=[[0,0],[52,0],[0,52],[-52,0],[0,-52],[52,52],[-52,52],[52,-52],[-52,-52],[104,0],[0,104]];
    const valid=([dx,dy])=>{const x=origin[0]+dx,y=origin[1]+dy;return x>=23&&y>=23&&x<=T.width*scale-23&&y<=T.height*scale-23&&occupied.every(o=>Math.hypot(x-o[0],y-o[1])>=49);};
    const offset=offsets.find(valid)||[52,0],bx=origin[0]+offset[0],by=origin[1]+offset[1];occupied.push([bx,by]);
    const label=group.map(x=>x.number+' '+mapName(x.id)).join(' / ');
    const pin=addMarker(p,(group.every(x=>x.reason)?'locked ':'')+(group.length>1?'cluster ':''),group.length>1?group.length+'곳':String(n.number),label,ids,()=>{
     if(group.length===1){this.choose(n.id);return;}
     banner.replaceChildren(el('strong','','가까운 지점 · 아래 카드에서 선택'));for(const x of group)banner.append(this.control(x.number+' · '+mapName(x.id),()=>this.choose(x.id),'cluster-'+x.row[0]));banner.hidden=false;
    });
    pin.style.marginLeft=offset[0]+'px';pin.style.marginTop=offset[1]+'px';
    if(offset[0]||offset[1]){pin.classList.add('label-offset');pin.title+=' · 연결선 끝의 작은 점이 지형상 위치';}
    for(const member of group)line(member.point,bx,by);
   }
   if(target?.[0]===atlas&&this.target!==game.s.global.CURRENT_MAP_ID&&!local.some(n=>n.id===this.target))addMarker(target,'destination','◎','선택한 목적지 · '+mapName(this.target),[this.target],()=>{});
   if(current?.[0]===atlas)addMarker(current,'current','◆','현재 구역 · '+mapName(game.s.global.CURRENT_MAP_ID));
   else{banner.hidden=false;banner.replaceChildren(el('strong','','지도 미리보기 · 현재 위치 '+mapName(game.s.global.CURRENT_MAP_ID)));}
  };
  const layout=()=>{if(!viewport.isConnected)return;initializing=true;const w=viewport.clientWidth,h=viewport.clientHeight,fit=Math.min(w/T.width,h/T.height);if(!fit)return;
   if(this.camera.mode!=='custom'){
    const points=[...(current?.[0]===atlas?[current]:[]),...local.filter(n=>!n.reason).map(n=>n.point)];
    if(this.camera.mode==='full'||!points.length)this.camera={mode:'custom',zoom:1,cx:T.width/2,cy:T.height/2};
    else{const xs=points.map(p=>p[1]),ys=points.map(p=>p[2]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),desired=Math.min(w/Math.max(340,maxX-minX+190),h/Math.max(280,maxY-minY+170));this.camera={mode:'custom',zoom:Math.max(1,Math.min(3,desired/fit)),cx:(minX+maxX)/2,cy:(minY+maxY)/2};}
   }
   const c=this.camera,scale=fit*c.zoom,sw=T.width*scale,sh=T.height*scale,padX=Math.max(0,(w-sw)/2),padY=Math.max(0,(h-sh)/2);
   canvas.style.width=Math.max(w,sw)+'px';canvas.style.height=Math.max(h,sh)+'px';sheet.style.cssText=`width:${sw}px;height:${sh}px;left:${padX}px;top:${padY}px`;
   viewport.scrollLeft=padX+c.cx*scale-w/2;viewport.scrollTop=padY+c.cy*scale-h/2;
   this.mapMetrics={viewport,fit,scale,padX,padY};if(scale!==drawnScale){drawPins(scale);drawnScale=scale;}
   requestAnimationFrame(()=>{initializing=false;});
  };
  img.onerror=()=>{banner.hidden=false;banner.replaceChildren(el('strong','','지도를 불러오지 못했습니다. 목적지 카드는 계속 사용할 수 있습니다.'));};
  banner.hidden=true;
  viewport.addEventListener('scroll',()=>{if(initializing||!this.mapMetrics||this.mapMetrics.viewport!==viewport)return;const m=this.mapMetrics;this.camera={mode:'custom',zoom:this.camera.zoom,cx:(viewport.scrollLeft+viewport.clientWidth/2-m.padX)/m.scale,cy:(viewport.scrollTop+viewport.clientHeight/2-m.padY)/m.scale};},{passive:true});
  // Touch uses native overflow scrolling. Mouse drag only captures the background, never a marker.
  let drag=null,moved=false;viewport.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('button'))return;drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};moved=false;viewport.setPointerCapture(e.pointerId);});
  viewport.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>4)moved=true;if(moved){viewport.scrollLeft=drag.left-dx;viewport.scrollTop=drag.top-dy;}});
  const end=()=>{drag=null;};viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
  this.observer=new ResizeObserver(layout);this.observer.observe(viewport);requestAnimationFrame(layout);return viewport;
 },
 zoom(ratio){if(!this.camera)return;this.camera={...this.camera,mode:'custom',zoom:Math.max(1,Math.min(4,(this.camera.zoom||1)*ratio))};this.refresh();},
 refresh(){const old=document.getElementById('journey-map');if(!old)return;const key=document.activeElement?.dataset.navFocus,scroll=window.scrollY;old.replaceWith(this.draw());if(key){const next=[...document.querySelectorAll('[data-nav-focus]')].find(e=>e.dataset.navFocus===key);next?.focus({preventScroll:true});}window.scrollTo({top:scroll,behavior:'instant'});}
};
firstTravelEdge=function(target){return game.navigationRoute(target)?.edges[0]||null;};
const navigationLocation=drawLocation;drawLocation=function(p,v){navigationLocation(p,v);if(game.needsRecovery())return;const map=NavigationUI.draw(),objective=p.querySelector('.main-objective');if(objective)objective.after(map);else p.prepend(map);};
const navigationStory=story;story=function(p,v){navigationStory(p,v);if(!game.storyPauseReason()){const bar=el('section','story-intermission-bar');bar.append(el('small','','대화·선택 진행은 보존됩니다.'),actionButton('잠시 메인 화면으로','STORY_PAUSE_FREE'));p.append(bar);}};
