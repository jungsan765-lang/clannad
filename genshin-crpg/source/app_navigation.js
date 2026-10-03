/* Terrain navigation: approved pixels + read-only area anchors; all travel uses normal MOVE. */
const NavigationUI={target:null,saveId:null,mapId:null,atlas:null,camera:null,observer:null,
 point(id){return window.CRPGTerrainMap?.points[id]||null;},
 atlasFor(id){return this.point(id)?.[0]||({'몬드':'mond','리월':'liyue'})[game.tables['32_MAP_DB'].get(id)?.[1]]||null;},
 nearby(){return game.rows('47_MAP_EDGE_DB').filter(r=>r[1]===game.s.global.CURRENT_MAP_ID&&r[8]==='Y'&&r[11]==='ACTIVE'&&game.tables['32_MAP_DB'].has(r[2])).map((r,i)=>({row:r,id:r[2],number:i+1,reason:game.edgeReason(r),point:this.point(r[2])}));},
 risk(id){const m=game.tables['32_MAP_DB'].get(id);if(!m)return '';return m[12]==='Y'?'안전한 거점':m[4]==='BOSS'?'보스 도전 구역':Number(m[7])>0?'권장 Lv.'+m[6]+'–'+m[7]:'이동 구역';},
 direction(id){const a=this.point(game.s.global.CURRENT_MAP_ID),b=this.point(id);if(!a||!b||a[0]!==b[0])return '지역 간 이동';const dx=b[1]-a[1],dy=b[2]-a[2];if(Math.hypot(dx,dy)<38)return '같은 구역 주변';return ['동쪽','남동쪽','남쪽','남서쪽','서쪽','북서쪽','북쪽','북동쪽'][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];},
 choose(id){this.target=id;this.refresh();if(id&&window.innerWidth<=600){const dock=document.querySelector('.terrain-travel-dock'),b=dock?.getBoundingClientRect();if(b&&(b.top<0||b.bottom>window.innerHeight))dock.scrollIntoView({block:'nearest',behavior:'instant'});}},
 cameraMode(mode){this.camera={mode};this.view=mode;this.refresh();},
 draw(){
  this.observer?.disconnect();const g=game.s.global,current=g.CURRENT_MAP_ID,T=window.CRPGTerrainMap;
  if(this.saveId!==g.SAVE_ID){this.saveId=g.SAVE_ID;this.target=null;this.mapId=null;}
  // A chosen destination stays until the party arrives, so a long trip can be followed one area at a time.
  if(this.mapId!==current){this.mapId=current;if(this.target===current)this.target=null;this.atlas=this.atlasFor(current);this.camera={mode:'near'};this.view='near';}
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
  // The zoom buttons grey out at their limits and the chosen view stays lit, so no press ever looks ignored.
  this.zoomButtons={out:this.control('−',()=>this.zoom(.8),'zoom-out','지도 축소'),in:this.control('+',()=>this.zoom(1.25),'zoom-in','지도 확대')};
  zoom.append(this.zoomButtons.out,this.zoomButtons.in);
  const view=(text,mode)=>{const b=this.control(text,()=>this.cameraMode(mode),mode);b.classList.add('terrain-view');b.setAttribute('aria-pressed',String((this.view||'near')===mode));return b;};
  controls.append(zoom,view('주변 보기','near'),view('지역 전체','full'));
  left.append(controls,el('p','terrain-legend','◆ 현재 위치 · 번호나 길을 누르면 그곳까지 가는 길을 미리 봅니다'));
  const note=this.point(current)?.[3];if(note)left.append(el('p','terrain-location-note',note));
  left.append(el('small','terrain-help','지도는 끌어서 움직이고 + / −로 확대합니다. 오른쪽 목적지 카드는 누르는 즉시 출발합니다.'));
  right.append(el('h3','','어디로 갈까?'),el('p','terrain-select-help','목적지 카드를 누르면 바로 이동합니다. 먼 곳은 아래 「목적지 찾기」로 고르면 도착할 때까지 길을 안내합니다.'));
  const findSlot=el('div','terrain-find-slot');right.append(findSlot);
  const domestic=nearby.filter(n=>!n.reason&&n.point?.[0]===this.atlas),other=nearby.filter(n=>!domestic.includes(n));
  // Long lists fold after five cards (the selected destination always stays visible).
  const cards=el('div','terrain-destination-list'),shown=domestic.length>6?domestic.filter((n,i)=>i<5||n.id===target):domestic,folded=domestic.filter(n=>!shown.includes(n));for(const n of shown)cards.append(this.card(n));if(!domestic.length)cards.append(el('p','muted','이어지는 길은 아래 다른 지역 목록에서도 확인할 수 있습니다.'));right.append(cards);
  if(folded.length){const more=el('details','terrain-more-routes');more.append(el('summary','','주변 목적지 '+folded.length+'곳 더 보기'));const list=el('div','terrain-destination-list');for(const n of folded)list.append(this.card(n));more.append(list);right.append(more);}
  if(other.length){const details=el('details','terrain-other-routes');details.open=other.some(n=>!n.reason||n.id===target);details.append(el('summary','','다른 지역·잠긴 길 ('+other.length+')'));for(const n of other)details.append(this.card(n));right.append(details);}
  const find=el('details','terrain-search');find.open=!!target&&!nearby.some(n=>n.id===target);find.append(el('summary','',target&&!nearby.some(n=>n.id===target)?'목적지 찾기 · '+mapName(target):'목적지 찾기 · 먼 곳·귀환로'));
  const discovered=new Set(game.travelDiscoveries?.().known||game.rows('32_MAP_DB').map(m=>m[0]));
  const select=el('select');select.id='journey-map-target';select.setAttribute('aria-label','찾아갈 장소');const empty=el('option','','목적지를 선택하세요');empty.value='';select.append(empty);
  for(const m of game.rows('32_MAP_DB').filter(m=>m[0]&&discovered.has(m[0])&&['몬드','리월'].includes(m[1]))){const o=el('option','',m[2]);o.value=m[0];select.append(o);}select.value=target||'';select.onchange=()=>this.choose(select.value||null);find.append(select);
  if(current!=='MAP_MOND_CITY')find.append(this.control('몬드로 돌아가는 길 찾기',()=>this.choose('MAP_MOND_CITY'),'return'));findSlot.append(find);body.append(left,right);section.append(body);
  const dock=el('div','terrain-travel-dock');dock.setAttribute('aria-live','polite');const detail=el('div','terrain-selection');
  if(target){detail.append(el('small','','선택한 목적지'),el('strong','',mapName(target)),el('span','',this.risk(target)));
   const direct=nearby.find(n=>n.id===target);
   if(direct?.reason){detail.append(el('p','terrain-lock-reason','이동 불가 · '+direct.reason));dock.append(detail,this.disabledTravel());}
   else if(route?.edges.length){const edge=route.edges[0];detail.append(el('span','',route.edges.length===1?'이동 시간 '+route.minutes+'분':route.edges.length+'구역 경유 · 총 '+route.minutes+'분'));
    const b=actionButton((route.edges.length===1?mapName(target)+'(으)로 이동':'다음 구역 · '+mapName(edge[2]))+' · '+edge[5]+'분','MOVE',{edge:edge[0]},true);b.classList.add('terrain-travel');b.dataset.navFocus='travel';dock.append(detail,b);
    if(route.edges.length>1){const chain=el('div','terrain-route-chain');chain.append(el('small','','경로 · '+route.maps.map(mapName).join(' → ')),el('small','','한 구역씩 이동하며, 조우와 통행 조건을 건너뛰지 않습니다.'));dock.append(chain);}
   }else if(target===current){detail.append(el('span','','이미 도착한 장소입니다.'));dock.append(detail,this.disabledTravel('현재 위치'));}
   else{detail.append(el('p','terrain-lock-reason','지금 연결된 길이 없습니다. 본편 안내 이동이나 출입 조건을 확인하세요.'));dock.append(detail,this.disabledTravel());}
   dock.append(this.control('목적지 해제',()=>this.choose(null),'clear-target'));
   const destAtlas=this.atlasFor(target);if(destAtlas&&destAtlas!==this.atlas){const b=this.control(T.atlases[destAtlas].name+' 지도 미리보기',()=>{this.atlas=destAtlas;const p=this.point(target);this.camera=p?{mode:'custom',zoom:1.7,cx:p[1],cy:p[2]}:{mode:'full'};this.refresh();},'preview');dock.append(b);}
  }else{detail.append(el('strong','','지도 번호를 선택하면 이동 경로를 미리 볼 수 있습니다.'),el('span','','오른쪽 목적지 카드는 누르는 즉시 출발합니다.'));dock.append(detail,this.disabledTravel('지도에서 목적지를 선택하세요'));}
  section.append(dock);
  const footer=el('details','terrain-provenance');footer.append(el('summary','','지도 보는 법'),el('p','','번호는 누르기 쉽게 옆으로 옮겨 그렸고, 연결선 끝의 작은 점이 실제 위치입니다. 점선은 지도에 그려진 길을 따라간 경로입니다. 넓은 지역과 실내·지하는 대표 위치 한 곳으로 표시하고, 아직 그려지지 않은 곳에는 점을 찍지 않습니다. 다른 지역으로 가는 길은 오른쪽 카드에서 고릅니다.'));section.append(footer);
  return section;
 },
 control(text,fn,key,label){const b=button(text,fn);b.dataset.navFocus=key;if(label)b.setAttribute('aria-label',label);return b;},
 disabledTravel(text='이동할 수 없습니다'){const b=button(text,()=>{},true);b.className='terrain-travel';return b;},
 card(n){const b=n.reason?this.control('',()=>this.choose(n.id),'card-'+n.row[0]):actionButton('','MOVE',{edge:n.row[0]},true);b.dataset.navFocus='card-'+n.row[0];b.className='terrain-destination'+(this.target===n.id?' selected':'')+(n.reason?' locked':'');b.dataset.destination=n.id;b.setAttribute('aria-pressed',String(this.target===n.id));
  const num=el('span','terrain-number',String(n.number)),copy=el('span','terrain-card-copy');copy.append(el('strong','',mapName(n.id)),el('small','',this.direction(n.id)+' · '+n.row[5]+'분 · '+this.risk(n.id)));
  const boss=game.rows('35_BOSS_ROUTE_DB').find(r=>r[2]===n.id&&String(r[0]).startsWith('BRT_FB_'));if(boss)copy.append(el('small','terrain-boss-note','필드보스 · '+boss[1]+' · 권장 Lv.'+(CRPGRuntime.fieldBosses?.bosses?.[String(boss[0]).slice(4)]?.level||10)));
  if(n.point?.[3])copy.append(el('small','terrain-point-note',n.point[3]));
  if(n.reason)copy.append(el('small','terrain-lock-reason','잠김 · '+n.reason));else if(!n.point)copy.append(el('small','','주변 세부 지역 · 경로로 이동'));
  b.append(num,copy,el('span','terrain-card-state',n.reason?'잠김':'이동'));
  const highlight=()=>this.hover(n.id);
  b.addEventListener('pointerenter',highlight);b.addEventListener('focus',highlight);b.addEventListener('pointerleave',()=>this.hover(null));return b;
 },
 // One destination lit everywhere at once: its pin, its road and number on the map, and its card.
 hover(id){
  document.querySelectorAll('.terrain-pin,.terrain-route-tag').forEach(p=>p.classList.toggle('hovered',!!id&&(p.dataset.destinations||'').split(',').includes(id)));
  document.querySelectorAll('.terrain-route[data-destination]').forEach(p=>p.classList.toggle('hovered',!!id&&p.dataset.destination===id&&!p.classList.contains('trip')));
  document.querySelectorAll('.terrain-destination[data-destination]').forEach(c=>c.classList.toggle('route-hovered',!!id&&c.dataset.destination===id));
 },
 drawMap(nearby){
  const T=CRPGTerrainMap,atlas=this.atlas,viewport=el('div','terrain-viewport'),canvas=el('div','terrain-canvas'),sheet=el('div','terrain-sheet'),img=el('img','terrain-raster');
  viewport.setAttribute('aria-label',T.atlases[atlas].name+' 지형 지도');img.src=T.atlases[atlas].url;img.alt=T.atlases[atlas].name+' 원본 보존 지형 지도';img.width=T.width;img.height=T.height;img.draggable=false;
  sheet.append(img);canvas.append(sheet);viewport.append(canvas);
  const overlays=el('div','terrain-pins');sheet.append(overlays);const banner=el('div','terrain-map-status');banner.setAttribute('aria-live','polite');viewport.append(banner);
  const current=this.point(game.s.global.CURRENT_MAP_ID),local=nearby.filter(n=>n.point?.[0]===atlas),target=this.point(this.target);
  const addMarker=(point,kind,text,label,ids=[],fn)=>{const p=fn?this.control('',fn,'pin-'+ids.join('-'),label):el('div');p.className='terrain-pin '+kind;p.style.left=(point[1]/T.width*100)+'%';p.style.top=(point[2]/T.height*100)+'%';p.dataset.destinations=ids.join(',');p.append(el('span','terrain-pin-core',text));p.title=label;if(kind==='current')p.append(el('span','terrain-current-label','현재 위치'));if(this.target&&ids.includes(this.target))p.classList.add('selected');overlays.append(p);return p;};
  let initializing=false,drawnScale=0;
  // 0.14.8: every way out of here is drawn along the roads of the picture (CRPGTerrainMap.roads), with its number
  // on the road itself, so the map shows which road reaches which place. The chosen trip is drawn in full.
  const route=this.target?game.navigationRoute(this.target):null;
  const routes=document.createElementNS('http://www.w3.org/2000/svg','svg');routes.setAttribute('class','terrain-routes');routes.setAttribute('viewBox','0 0 '+T.width+' '+T.height);routes.setAttribute('preserveAspectRatio','none');routes.setAttribute('aria-hidden','true');img.after(routes);
  const roadPoints=(a,b)=>{const pa=this.point(a),pb=this.point(b);if(!pa||!pb||pa[0]!==atlas||pb[0]!==atlas)return null;const key=[a,b].sort().join('>'),mid=(T.roads?.[key]||[]).slice();if([a,b].sort()[0]!==a)mid.reverse();return [[pa[1],pa[2]],...mid,[pb[1],pb[2]]];};
  const along=(pts,f)=>{let total=0;const seg=[];for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(d);total+=d;}let goal=total*f;for(let i=1;i<pts.length;i++){if(goal<=seg[i-1]){const k=seg[i-1]?goal/seg[i-1]:0;return [pts[i-1][0]+(pts[i][0]-pts[i-1][0])*k,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*k];}goal-=seg[i-1];}return pts.at(-1);};
  const drawRoutes=(scale,pins=[])=>{routes.replaceChildren();const here=game.s.global.CURRENT_MAP_ID;
   const line=(pts,cls,id)=>{const p=document.createElementNS('http://www.w3.org/2000/svg','polyline');p.setAttribute('points',pts.map(q=>q.join(',')).join(' '));p.setAttribute('class','terrain-route '+cls);if(id)p.dataset.destination=id;routes.append(p);return p;};
   // The chosen trip, area by area, under the ways out.
   if(route?.maps?.length>2)for(let i=1;i<route.maps.length-1;i++){const pts=roadPoints(route.maps[i],route.maps[i+1]);if(pts)line(pts,'trip',this.target);}
   const ways=local.map(n=>({n,pts:roadPoints(here,n.id)})).filter(w=>w.pts);
   // Ways out often share the first stretch of road; each number goes where its road has left the others.
   const segDist=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
   const away=(p,pts)=>{let d=Infinity;for(let i=1;i<pts.length;i++)d=Math.min(d,segDist(p,pts[i-1],pts[i]));return d;};
   // The part of a road from fraction f to its end.
   const tail=(pts,f)=>{let total=0;const seg=[];for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);seg.push(d);total+=d;}let goal=total*f;
    for(let i=1;i<pts.length;i++){if(goal<=seg[i-1]){const k=seg[i-1]?goal/seg[i-1]:0;return [[pts[i-1][0]+(pts[i][0]-pts[i-1][0])*k,pts[i-1][1]+(pts[i][1]-pts[i-1][1])*k],...pts.slice(i)];}goal-=seg[i-1];}return [pts.at(-1)];};
   // Distances are measured on screen (numbers and strokes do not grow with the zoom).
   const px=1/(scale||1),placed=[],hits=[];
   for(const w of ways){const {n,pts}=w,on=this.target===n.id||route?.maps?.[1]===n.id;line(pts,(n.reason?'locked ':'')+(on?'selected':''),n.id);
    // Only the stretch where this road has left the others for good takes presses and carries the number, so a
    // shared stretch never chooses the wrong place (its pin and card still do).
    const others=ways.filter(o=>o!==w);let f0=null;
    for(let f=0;f<=1.0001;f+=.02){if(others.every(o=>away(along(pts,Math.min(1,f)),o.pts)>=10*px)){if(f0===null)f0=f;}else f0=null;}
    if(f0===null||f0>.94)continue;
    // A wide invisible stroke over that stretch: pressing anywhere on it chooses the destination, like its number.
    const hit=document.createElementNS('http://www.w3.org/2000/svg','polyline');hit.setAttribute('points',tail(pts,f0).map(q=>q.join(',')).join(' '));hit.setAttribute('class','terrain-route-hit');hit.dataset.destinationHit=n.id;
    hit.addEventListener('click',()=>this.choose(n.id));hit.addEventListener('pointerenter',()=>this.hover(n.id));hit.addEventListener('pointerleave',()=>this.hover(null));hits.push(hit);
    // The number: at least 28px from another number and 30px from any pin (a pin over a number takes its press).
    let spot=null,best=-1;
    for(let f=Math.max(f0,.2);f<=.92;f+=.02){const p=along(pts,f),dTag=Math.min(Infinity,...placed.map(q=>Math.hypot(q[0]-p[0],q[1]-p[1]))),dPin=Math.min(Infinity,...pins.map(o=>Math.hypot(o[0]*px-p[0],o[1]*px-p[1])));
     const score=Math.min(dTag/(28*px),dPin/(30*px),1)+(f>=.3&&f<=.86?.001:0);if(score>best){best=score;spot=p;}if(score>=1&&f>=.3)break;}
    if(!spot||best<.75)continue; // no clear place on its own stretch: the pin carries the number
    placed.push(spot);
    // The number on the road is a button too (it looks like one): it chooses the destination like the pin.
    const tag=this.control(String(n.number),()=>this.choose(n.id),'tag-'+n.row[0]);tag.className='terrain-route-tag'+(n.reason?' locked':'')+(on?' selected':'');tag.title=n.number+' '+mapName(n.id)+(n.reason?' · 잠김':'');
    tag.style.left=(spot[0]/T.width*100)+'%';tag.style.top=(spot[1]/T.height*100)+'%';tag.dataset.destinations=n.id;tag.tabIndex=-1;tag.setAttribute('aria-hidden','true');
    tag.addEventListener('pointerenter',()=>this.hover(n.id));tag.addEventListener('pointerleave',()=>this.hover(null));overlays.append(tag);}
   routes.append(...hits);
  };
  const drawPins=scale=>{overlays.replaceChildren();
   // Geographic anchors NEVER move for touch accessibility. Only the numbered controls move.
   // The dot of a destination can be pressed as well (players press the real place, not only its number).
   const seen=new Set(),anchor=(point,id)=>{if(seen.has(id))return;seen.add(id);
    const a=id===game.s.global.CURRENT_MAP_ID?el('span','terrain-anchor'):this.control('',()=>this.choose(id),'anchor-'+id);a.className='terrain-anchor';if(a.tagName==='BUTTON'){a.tabIndex=-1;a.title=mapName(id);a.addEventListener('pointerenter',()=>this.hover(id));a.addEventListener('pointerleave',()=>this.hover(null));}
    a.style.left=(point[1]/T.width*100)+'%';a.style.top=(point[2]/T.height*100)+'%';a.dataset.mapId=id;a.setAttribute('aria-hidden','true');overlays.append(a);};
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
   // The roads and their numbers come after the pins, so a number never lands under one.
   drawRoutes(scale,occupied);
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
   if(this.zoomButtons){this.zoomButtons.out.disabled=c.zoom<=1.001;this.zoomButtons.in.disabled=c.zoom>=3.999;}
   requestAnimationFrame(()=>{initializing=false;});
  };
  img.onerror=()=>{banner.hidden=false;banner.replaceChildren(el('strong','','지도를 불러오지 못했습니다. 목적지 카드는 계속 사용할 수 있습니다.'));};
  banner.hidden=true;
  viewport.addEventListener('scroll',()=>{if(initializing||!this.mapMetrics||this.mapMetrics.viewport!==viewport)return;const m=this.mapMetrics;this.camera={mode:'custom',zoom:this.camera.zoom,cx:(viewport.scrollLeft+viewport.clientWidth/2-m.padX)/m.scale,cy:(viewport.scrollTop+viewport.clientHeight/2-m.padY)/m.scale};},{passive:true});
  // Touch uses native overflow scrolling. Mouse drag only grabs the background, never a marker, and only once the
  // pointer has really moved: a plain press reaches what is under it (a road, a dot), and a drag never ends in a press.
  let drag=null,moved=false;viewport.addEventListener('pointerdown',e=>{moved=false;if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('button'))return;drag={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop,id:e.pointerId};moved=false;});
  viewport.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!moved&&Math.hypot(dx,dy)>4){moved=true;try{viewport.setPointerCapture(drag.id);}catch{}}if(moved){viewport.scrollLeft=drag.left-dx;viewport.scrollTop=drag.top-dy;}});
  const end=()=>{drag=null;};viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
  viewport.addEventListener('click',e=>{if(moved){moved=false;e.stopPropagation();e.preventDefault();}},true);
  this.observer=new ResizeObserver(layout);this.observer.observe(viewport);requestAnimationFrame(layout);return viewport;
 },
 zoom(ratio){if(!this.camera)return;this.camera={...this.camera,mode:'custom',zoom:Math.max(1,Math.min(4,(this.camera.zoom||1)*ratio))};this.view='custom';this.refresh();},
 refresh(){const old=document.getElementById('journey-map');if(!old)return;const key=document.activeElement?.dataset.navFocus,scroll=window.scrollY;old.replaceWith(this.draw());if(key){const next=[...document.querySelectorAll('[data-nav-focus]')].find(e=>e.dataset.navFocus===key);next?.focus({preventScroll:true});}window.scrollTo({top:scroll,behavior:'instant'});}
};
firstTravelEdge=function(target){return game.navigationRoute(target)?.edges[0]||null;};
// v0.14.4: the places of this area come before the (tall) travel map, so a phone reaches them without scrolling past it.
const navigationLocation=drawLocation;drawLocation=function(p,v){navigationLocation(p,v);if(game.needsRecovery())return;const map=NavigationUI.draw(),objective=p.querySelector('.main-objective'),facilities=p.querySelector('.location-places');if(facilities&&(game.placeEntries?.()||[]).length)facilities.after(map);else if(objective)objective.after(map);else p.prepend(map);};
const navigationStory=story;story=function(p,v){navigationStory(p,v);if(!game.storyPauseReason()){const bar=el('section','story-intermission-bar');bar.append(el('small','','대화·선택 진행은 보존됩니다.'),actionButton('잠시 메인 화면으로','STORY_PAUSE_FREE'));p.append(bar);}};
