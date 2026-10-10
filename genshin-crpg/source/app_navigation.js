/* Terrain navigation: approved pixels + read-only area anchors; all travel uses normal MOVE. */
const NavigationUI={target:null,saveId:null,mapId:null,atlas:null,camera:null,observer:null,
 point(id){return window.CRPGTerrainMap?.points[id]||null;},
 atlasFor(id){return this.point(id)?.[0]||({'몬드':'mond','리월':'liyue'})[game.tables['32_MAP_DB'].get(id)?.[1]]||null;},
 nearby(){return game.rows('47_MAP_EDGE_DB').filter(r=>r[1]===game.s.global.CURRENT_MAP_ID&&r[8]==='Y'&&r[11]==='ACTIVE'&&game.tables['32_MAP_DB'].has(r[2])).map((r,i)=>({row:r,id:r[2],number:i+1,reason:game.edgeReason(r),point:this.point(r[2])}));},
 risk(id){const m=game.tables['32_MAP_DB'].get(id);if(!m)return '';return m[12]==='Y'?'안전한 거점':m[4]==='BOSS'?'보스 도전 구역':Number(m[7])>0?(m[6]===m[7]?'고정 Lv.'+m[6]:'권장 Lv.'+m[6]+'–'+m[7]):'이동 구역';},
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
  this.known=new Set(game.travelDiscoveries?.().known||game.rows('32_MAP_DB').map(m=>m[0]));
  const nearby=this.nearby(),goal=game.navigationGoal(),target=this.target,route=target?game.navigationRoute(target):null,targetName=target&&(this.placeName(target)||'아직 가 보지 않은 곳');
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
  // What the circles and lines mean, under the map on every screen size.
  const key=el('div','terrain-key');key.setAttribute('aria-hidden','true');
  for(const [k,text] of [['here','현재 위치'],['open','바로 갈 수 있는 곳'],['far','한 번에는 못 가는 곳'],['faded','아직 막힌 곳'],['route','고른 목적지까지'],['domain','비경'],['boss','필드 보스']])key.append(el('span','terrain-key-item '+k,text));
  left.append(controls,key);
  const note=this.point(current)?.[3];if(note)left.append(el('p','terrain-location-note',note));
  left.append(el('small','terrain-help','지도는 끌어서 움직이고 + / −로 확대합니다. 오른쪽 목적지 카드는 누르는 즉시 출발합니다.'));
  right.append(el('h3','','어디로 갈까?'),el('p','terrain-select-help','목적지 카드를 누르면 바로 이동합니다. 먼 곳은 지도에서 동그라미를 누르면 길이 이어집니다.'));
  const findSlot=el('div','terrain-find-slot');right.append(findSlot);
  const domestic=nearby.filter(n=>!n.reason&&n.point?.[0]===this.atlas),other=nearby.filter(n=>!domestic.includes(n));
  // Long lists fold after five cards (the selected destination always stays visible).
  const cards=el('div','terrain-destination-list'),shown=domestic.length>6?domestic.filter((n,i)=>i<5||n.id===target):domestic,folded=domestic.filter(n=>!shown.includes(n));for(const n of shown)cards.append(this.card(n));if(!domestic.length)cards.append(el('p','muted','이어지는 길은 아래 다른 지역 목록에서도 확인할 수 있습니다.'));right.append(cards);
  if(folded.length){const more=el('details','terrain-more-routes');more.append(el('summary','','주변 목적지 '+folded.length+'곳 더 보기'));const list=el('div','terrain-destination-list');for(const n of folded)list.append(this.card(n));more.append(list);right.append(more);}
  if(other.length){const details=el('details','terrain-other-routes');details.open=other.some(n=>!n.reason||n.id===target);details.append(el('summary','','다른 지역·잠긴 길 ('+other.length+')'));for(const n of other)details.append(this.card(n));right.append(details);}
  // 0.15.25 (user: 「찾아서 누르는 형식의 저거 v 눌러서 고르는거 그거 아예 쓰지 말라」): a far place is chosen by pressing its circle on
  // the map (the route is drawn and the move button follows it), so the list of every place is gone; the way home stays.
  if(current!=='MAP_MOND_CITY')findSlot.append(this.control('몬드성으로 가는 길',()=>this.choose('MAP_MOND_CITY'),'return'));body.append(left,right);section.append(body);
  const dock=el('div','terrain-travel-dock');dock.setAttribute('aria-live','polite');const detail=el('div','terrain-selection');
  if(target){detail.append(el('small','','선택한 목적지'),el('strong','',targetName),el('span','',this.placeName(target)?this.risk(target):'가 보면 이름을 알 수 있습니다'));for(const [kind,text] of this.marks(target))detail.append(el('span','terrain-detail-'+kind,text));
   const direct=nearby.find(n=>n.id===target);
   if(direct?.reason){detail.append(el('p','terrain-lock-reason','이동 불가 · '+direct.reason));dock.append(detail,this.disabledTravel());}
   else if(route?.edges.length){const edge=route.edges[0];detail.append(el('span','',route.edges.length===1?'이동 시간 '+route.minutes+'분':route.edges.length+'구역 경유 · 총 '+route.minutes+'분'));
    const b=actionButton((route.edges.length===1?mapName(target)+'(으)로 이동':'다음 구역 · '+mapName(edge[2]))+' · '+edge[5]+'분','MOVE',{edge:edge[0]},true);b.classList.add('terrain-travel');b.dataset.navFocus='travel';dock.append(detail,b);
    if(route.edges.length>1){const chain=el('div','terrain-route-chain');chain.append(el('small','','경로 · '+route.maps.map(id=>this.placeName(id)||'가 보지 않은 곳').join(' → ')),el('small','','한 구역씩 이동하며, 조우와 통행 조건을 건너뛰지 않습니다.'));dock.append(chain);}
   }else if(target===current){detail.append(el('span','','이미 도착한 장소입니다.'));dock.append(detail,this.disabledTravel('현재 위치'));}
   else{detail.append(el('p','terrain-lock-reason','지금 연결된 길이 없습니다. 본편 안내 이동이나 출입 조건을 확인하세요.'));dock.append(detail,this.disabledTravel());}
   dock.append(this.control('목적지 해제',()=>this.choose(null),'clear-target'));
   const destAtlas=this.atlasFor(target);if(destAtlas&&destAtlas!==this.atlas){const b=this.control(T.atlases[destAtlas].name+' 지도 미리보기',()=>{this.atlas=destAtlas;const p=this.point(target);this.camera=p?{mode:'custom',zoom:1.7,cx:p[1],cy:p[2]}:{mode:'full'};this.refresh();},'preview');dock.append(b);}
  }else{detail.append(el('strong','','지도에서 동그라미를 누르면 그곳까지 가는 길을 미리 봅니다.'),el('span','','목적지 카드는 누르는 즉시 출발합니다.'));dock.append(detail,this.disabledTravel('지도에서 목적지를 선택하세요'));dock.classList.add('idle');}
  section.append(dock);
  const footer=el('details','terrain-provenance');footer.append(el('summary','','지도 보는 법'),el('p','','동그라미 하나가 장소 하나이고, 선은 두 장소를 바로 잇는 길입니다. 또렷한 동그라미는 바로 갈 수 있는 곳, 속이 비치는 동그라미는 한 번에는 못 가는 곳(누르면 가는 길이 나옵니다), 빈 고리와 흐린 점선은 아직 막힌 곳과 길입니다. 동그라미를 누르면 그곳까지 가는 길이 금색으로 바뀝니다. 아직 가 보지 않은 곳은 이름을 숨기고, 넓은 지역과 실내·지하는 대표 위치 한 곳으로 표시합니다. 다른 지역으로 가는 길은 목적지 카드에서 고릅니다.'));section.append(footer);
  return section;
 },
 control(text,fn,key,label){const b=button(text,fn);b.dataset.navFocus=key;if(label)b.setAttribute('aria-label',label);return b;},
 disabledTravel(text='이동할 수 없습니다'){const b=button(text,()=>{},true);b.className='terrain-travel';return b;},
 card(n){const b=n.reason?this.control('',()=>this.choose(n.id),'card-'+n.row[0]):actionButton('','MOVE',{edge:n.row[0]},true);b.dataset.navFocus='card-'+n.row[0];b.className='terrain-destination'+(this.target===n.id?' selected':'')+(n.reason?' locked':'');b.dataset.destination=n.id;b.setAttribute('aria-pressed',String(this.target===n.id));
  // The card's dot matches the place's circle on the map (no number: 0.15.16).
  const dot=el('span','terrain-dot'+(n.reason?' locked':'')),copy=el('span','terrain-card-copy');dot.setAttribute('aria-hidden','true');copy.append(el('strong','',mapName(n.id)),el('small','',this.direction(n.id)+' · '+n.row[5]+'분 · '+this.risk(n.id)));
  const boss=game.rows('35_BOSS_ROUTE_DB').find(r=>r[2]===n.id&&String(r[0]).startsWith('BRT_FB_'));if(boss)copy.append(el('small','terrain-boss-note','필드보스 · '+boss[1]+' · 권장 Lv.'+(CRPGRuntime.fieldBosses?.bosses?.[String(boss[0]).slice(4)]?.level||10)));
  const domain=this.domainAt(n.id);if(domain)copy.append(el('small','terrain-domain-note',this.domainLabel(domain,mapName(n.id))));
  if(n.point?.[3])copy.append(el('small','terrain-point-note',n.point[3]));
  if(n.reason)copy.append(el('small','terrain-lock-reason','잠김 · '+n.reason));else if(!n.point)copy.append(el('small','','주변 세부 지역 · 경로로 이동'));
  b.append(dot,copy,el('span','terrain-card-state',n.reason?'잠김':'이동'));
  const highlight=()=>this.hover(n.id);b.addEventListener('focus',highlight);b.addEventListener('blur',()=>this.hover(null));
  if(window.matchMedia?.('(hover: hover)').matches){b.addEventListener('pointerenter',highlight);b.addEventListener('pointerleave',()=>this.hover(null));}return b;
 },
 // One place lit everywhere at once: its circle, its name, its roads and its card.
 hover(id){
  document.querySelectorAll('#journey-map :is(.terrain-node,.terrain-label)[data-map-id]').forEach(p=>p.classList.toggle('hovered',!!id&&p.dataset.mapId===id));
  document.querySelectorAll('#journey-map .terrain-link[data-ends]').forEach(p=>p.classList.toggle('hovered',!!id&&p.dataset.ends.split(',').includes(id)));
  document.querySelectorAll('.terrain-destination[data-destination]').forEach(c=>c.classList.toggle('route-hovered',!!id&&c.dataset.destination===id));
 },
 // A place the party has not seen yet keeps its name to itself (the map does not spoil where the story goes).
 placeName(id){const known=this.known||new Set();return id===game.s.global.CURRENT_MAP_ID||known.has(id)?mapName(id):'';},
 // 0.16.2 (user: 「그게 비경 표시인지 어떻게 아는데...? 그리고 어떤 비경인지도 어떻게 아는데?」, 「고운각에는 왜 무상의 바위 있는 장소가
 // 안찍혀있고」): the domain and the field boss standing at a place, shown on the map whether or not the place is known yet.
 domainAt(id){return Object.values(globalThis.CRPGRuntime?.growthV01522?.domains||{}).find(d=>d.map===id)||null;},
 bossAt(id){const hit=Object.entries(globalThis.CRPGRuntime?.fieldBosses?.bosses||{}).find(([,b])=>b.map===id);return hit?{key:hit[0],...hit[1]}:null;},
 // 0.16.3: which kind of domain it is, and its levels; the domain's name only where the place's own name does not say it.
 domainLabel(d,shown){const L=d.levels||[d.level],kind=globalThis.CRPGRuntime?.growthV01522?.domainKinds?.[d.kind];return (kind?kind+' 비경':'비경')+' · '+(shown===d.name?'':d.name+' ')+'Lv.'+(L.length>1?L[0]+'–'+L[L.length-1]:L[0]);},
 marks(id){const d=this.domainAt(id),b=this.bossAt(id),out=[];if(d)out.push(['domain',this.domainLabel(d,this.placeName(id))]);if(b)out.push(['boss','필드 보스 · '+b.name+' Lv.'+b.level]);return out;},
 drawMap(nearby){
  const T=CRPGTerrainMap,atlas=this.atlas,viewport=el('div','terrain-viewport'),canvas=el('div','terrain-canvas'),sheet=el('div','terrain-sheet'),img=el('img','terrain-raster');
  viewport.setAttribute('aria-label',T.atlases[atlas].name+' 지형 지도');img.src=T.atlases[atlas].url;img.alt=T.atlases[atlas].name+' 원본 보존 지형 지도';img.width=T.width;img.height=T.height;img.draggable=false;
  sheet.append(img);canvas.append(sheet);viewport.append(canvas);
  // 0.16.2: mist over the parts of the picture that belong to another region, and the names of areas the picture predates.
  for(const [x,y,w,h] of T.atlases[atlas].mists||[]){const m=el('span','terrain-mist');Object.assign(m.style,{left:x/T.width*100+'%',top:y/T.height*100+'%',width:w/T.width*100+'%',height:h/T.height*100+'%'});m.setAttribute('aria-hidden','true');sheet.append(m);}
  for(const [text,x,y] of T.atlases[atlas].captions||[]){const c=el('span','terrain-caption',text);c.style.left=x/T.width*100+'%';c.style.top=y/T.height*100+'%';c.setAttribute('aria-hidden','true');sheet.append(c);}
  const overlays=el('div','terrain-pins');sheet.append(overlays);const banner=el('div','terrain-map-status');banner.setAttribute('aria-live','polite');viewport.append(banner);
  const here=game.s.global.CURRENT_MAP_ID,current=this.point(here),local=nearby.filter(n=>n.point?.[0]===atlas);
  // 0.15.16: every place on this map is a circle and every road a straight line between two circles (user: 「그냥 아예 맵에
  // 동그라미를 다 치고 당장 못가는 곳은 투명하게 만들어. 그리고 이어지는 구간들에 줄을 만들어봐」). Places the party cannot walk
  // to now are faded, and so are the roads it cannot use yet. The numbers are gone (「1번 동그라미가 두개 있는건 뭔지도
  // 모르겠고」): a circle and its card share the place's name instead.
  const reach=game.navigationReach?.()||{maps:new Set([here]),open:new Set()};
  const route=this.target?game.navigationRoute(this.target):null,stops=route?.maps||[],trip=new Set(stops.slice(1).map((m,i)=>[stops[i],m].sort().join(',')));
  const places=game.rows('32_MAP_DB').map(m=>m[0]).filter(id=>id&&this.point(id)?.[0]===atlas);
  const links=new Map();
  for(const r of game.rows('47_MAP_EDGE_DB')){if(r[8]!=='Y'||r[11]!=='ACTIVE'||r[1]===r[2])continue;const a=this.point(r[1]),b=this.point(r[2]);if(!a||!b||a[0]!==atlas||b[0]!==atlas)continue;
   const key=[r[1],r[2]].sort().join(','),l=links.get(key)||{key,a,b,open:false};if(reach.open.has(r[0]))l.open=true;links.set(key,l);}
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','terrain-links');svg.setAttribute('viewBox','0 0 '+T.width+' '+T.height);svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');img.after(svg);
  // The chosen trip is drawn last, over the other roads.
  for(const l of [...links.values()].sort((x,y)=>trip.has(x.key)-trip.has(y.key))){const line=document.createElementNS('http://www.w3.org/2000/svg','line');
   line.setAttribute('x1',l.a[1]);line.setAttribute('y1',l.a[2]);line.setAttribute('x2',l.b[1]);line.setAttribute('y2',l.b[2]);
   line.setAttribute('class','terrain-link'+(l.open?'':' locked')+(trip.has(l.key)?' route':'')+(l.key.split(',').includes(here)?' here':''));line.dataset.ends=l.key;svg.append(line);}
  // Hover lights a place only where there is a pointer that hovers (a tap on a phone just chooses).
  const hoverable=!!window.matchMedia?.('(hover: hover)').matches;
  let initializing=false,drawnScale=0;
  const drawPins=scale=>{overlays.replaceChildren();
   const near=new Set(local.map(n=>n.id)),dots=new Map();
   for(const id of places){const p=this.point(id),name=this.placeName(id),isHere=id===here,open=reach.maps.has(id);
    const node=isHere?el('span'):this.control('',()=>this.choose(id),'node-'+id);
    // 0.15.20 (user: 「지도에 나머지 동그라미들은 투명화를 좀 넣어줘. 지금 당장은 못 가는 곳이니까」): only here and the places
    // one road away are solid; a place several roads away is see-through, and one no open road reaches is a hollow ring.
    // 0.15.25: a place where a domain stands carries a small mark (the domains are no longer entered from anywhere).
    // 0.16.2: shown before the place is known too, and a field boss's place carries the boss's face.
    const domain=this.domainAt(id),boss=this.bossAt(id);
    node.className='terrain-node'+(isHere?' current':!open?' faded':near.has(id)?' open near':' far')+(stops.includes(id)&&!isHere?' on-route':'')+(this.target===id?' selected':'')+(name?'':' unknown')+(domain?' domain-host':'')+(boss?' boss-host':'');
    node.dataset.mapId=id;node.style.left=(p[1]/T.width*100)+'%';node.style.top=(p[2]/T.height*100)+'%';
    node.title=(name||'아직 가 보지 않은 곳')+this.marks(id).map(([,t])=>' · '+t).join('')+(isHere?' · 현재 위치':!open?' · 아직 막힌 곳':near.has(id)?'':' · 한 번에는 못 가는 곳');
    if(boss){const src=typeof enemyPortraitFor==='function'?enemyPortraitFor('FB_'+boss.key):null;if(src){const face=el('img','terrain-boss-face');face.src=src;face.alt='';face.draggable=false;face.decoding='async';node.append(face);}else node.classList.add('boss-plain');}
    if(isHere)node.append(el('span','terrain-node-core','◆'));
    else{node.tabIndex=-1;node.setAttribute('aria-hidden','true');if(hoverable){node.addEventListener('pointerenter',()=>this.hover(id));node.addEventListener('pointerleave',()=>this.hover(null));}}
    overlays.append(node);dots.set(id,[p[1]*scale,p[2]*scale,isHere?13:this.target===id?11:near.has(id)?9:7]);}
   // Names: here, the chosen place, the trip's stops and the places one road away always (only the first two on the whole
   // region at a glance, where names would cover the circles); every other known place once the map is zoomed in far
   // enough. A name never covers another name; one with no room shows only under the pointer.
   // 0.16.2 (user: 「주요 지점들은 안찍혀있고」): domains and field bosses are always named, and the towns once the map is closer.
   const marked=places.filter(id=>this.marks(id).length||scale>=.6&&this.placeName(id)&&game.row('32_MAP_DB',id)?.[12]==='Y');
   const first=[here,this.target,...marked,...(scale<.6?[]:[...stops,...local.map(n=>n.id)])].filter((id,i,a)=>id&&a.indexOf(id)===i&&dots.has(id));
   const tags=[];
   for(const id of [...first,...places.filter(id=>!first.includes(id))]){const name=this.placeName(id),marks=this.marks(id);if(!name&&!marks.length)continue;
    const t=el('span','terrain-label'+(id===here?' current':'')+(id===this.target?' selected':'')+(first.includes(id)?'':' extra')+(marks.length?' marked':''),marks.length?'':name);t.dataset.mapId=id;t.setAttribute('aria-hidden','true');
    if(marks.length){if(name)t.append(el('span','terrain-label-name',name));for(const [kind,text] of marks)t.append(el('small','terrain-label-'+kind,text));}
    overlays.append(t);tags.push({id,t,shown:first.includes(id)||scale>=1.5});}
   const W=T.width*scale,H=T.height*scale,taken=[],hits=r=>taken.some(o=>r[0]<o[2]+3&&r[2]+3>o[0]&&r[1]<o[3]+3&&r[3]+3>o[1]);
   for(const {id,t,shown} of tags){const [x,y,rad]=dots.get(id),w=t.offsetWidth,h=t.offsetHeight;let best=null,score=Infinity;
    // Beside, above and below the circle first, then a little further out.
    for(const [dx,dy] of [[rad+4,-h/2],[-rad-4-w,-h/2],[-w/2,-rad-3-h],[-w/2,rad+3],[rad,-rad-h+2],[rad,rad-2],[-rad-w,-rad-h+2],[-rad-w,rad-2],
     [rad+4,-h*1.5-2],[rad+4,h/2+2],[-rad-4-w,-h*1.5-2],[-rad-4-w,h/2+2],[-w/2,-rad-5-h*2],[-w/2,rad+5+h]]){
     const r=[x+dx,y+dy,x+dx+w,y+dy+h];if(r[0]<2||r[1]<2||r[2]>W-2||r[3]>H-2||hits(r))continue;
     // Prefer a spot that covers no other circle.
     let s=0;for(const [other,[ox,oy,orad]] of dots)if(other!==id&&ox+orad>r[0]&&ox-orad<r[2]&&oy+orad>r[1]&&oy-orad<r[3])s++;
     if(s<score){score=s;best=r;}if(!s)break;}
    if(best&&shown)taken.push(best);else{t.classList.add('quiet');best=best||[x+rad+4,y-h/2];}
    t.style.left=best[0]+'px';t.style.top=best[1]+'px';}
   if(current?.[0]!==atlas){banner.hidden=false;banner.replaceChildren(el('strong','','지도 미리보기 · 현재 위치 '+mapName(here)));}
  };
  // 0.16.4: the same size and view as the last layout are not laid out (and every circle redrawn) again.
  let laidOut='';
  const layout=()=>{if(!viewport.isConnected)return;const w=viewport.clientWidth,h=viewport.clientHeight,fit=Math.min(w/T.width,h/T.height);if(!fit)return;const size=w+'x'+h+':'+JSON.stringify(this.camera);if(size===laidOut)return;laidOut=size;initializing=true;
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
  // pointer has really moved: a plain press reaches what is under it (a circle), and a drag never ends in a press.
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
