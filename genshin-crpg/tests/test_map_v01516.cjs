'use strict';
// 0.15.16 travel map (user: 「그냥 아예 맵에 동그라미를 다 치고 당장 못가는 곳은 투명하게 만들어. 그리고 이어지는 구간들에 줄을
// 만들어봐. 그 줄대로 가면 상식적으로 그게 돌아오는 구간이 맞는지 봐봐」, 「층암거연은 도대체 왜 청허포랑 성법관문 사이에 있는 길을
// 안따라가는지」, 「머스크 암초도 왜 그 위치가 있는데 거기로 안가고 맹세의 갑각 옆이 머스크 암초로 표기되는지」): every place has
// its own circle, every road is a straight line between two circles and runs both ways, no line runs through a circle it
// does not reach, and the map fades what the party cannot walk to now.
const assert=require('node:assert/strict'),path=require('path'),vm=require('vm');
const {fs,root,c,fresh}=require('./helpers_v011.cjs');
const src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
const results=[];
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
// The circles as the page has them: terrain_map.js plus the Liyue detail areas (app_liyue_areas.js copies their points).
const T=(()=>{const box={window:{}};vm.runInNewContext(src('terrain_map.js'),box);const t=box.window.CRPGTerrainMap;for(const a of c.CRPGRuntime.liyueAreaCatalog.areas)t.points[a.id]=['liyue',a.point[0],a.point[1]];return t;})();
const g=fresh('MAP_MOND_CITY'),places=g.rows('32_MAP_DB').filter(m=>m[0]&&['몬드','리월'].includes(m[1])),name=id=>g.tables['32_MAP_DB'].get(id)?.[2]||id;
const roads=g.rows('47_MAP_EDGE_DB').filter(r=>r[8]==='Y'&&r[11]==='ACTIVE'&&g.tables['32_MAP_DB'].has(r[1])&&g.tables['32_MAP_DB'].has(r[2]));
const pairs=new Set(roads.map(r=>[r[1],r[2]].sort().join('|')));
// Plain walking distance over the roads, ignoring story conditions (where the roads themselves lead).
function walk(from,to,list=roads){const cost=new Map([[from,0]]),prev=new Map(),todo=[from];
 while(todo.length){todo.sort((a,b)=>cost.get(a)-cost.get(b));const m=todo.shift();if(m===to)break;for(const r of list)if(r[1]===m){const d=cost.get(m)+Number(r[5]||0);if(d<(cost.get(r[2])??Infinity)){cost.set(r[2],d);prev.set(r[2],m);todo.push(r[2]);}}}
 if(!cost.has(to))return null;const out=[to];while(out[0]!==from)out.unshift(prev.get(out[0]));return out;}

check('circles: every place of 몬드 and 리월 has its own circle on its own picture',()=>{
 const atlas={'몬드':'mond','리월':'liyue'};let closest=[Infinity,''];
 for(const m of places){const p=T.points[m[0]];assert(p,'circle for '+m[0]);assert.equal(p[0],atlas[m[1]],m[0]+' on the '+m[1]+' picture');
  assert(p[1]>=0&&p[1]<=T.width&&p[2]>=0&&p[2]<=T.height,m[0]+' on the picture');}
 for(const a of places)for(const b of places){if(a[0]>=b[0])continue;const p=T.points[a[0]],q=T.points[b[0]];if(p[0]!==q[0])continue;const d=Math.hypot(p[1]-q[1],p[2]-q[2]);if(d<closest[0])closest=[d,a[0]+' / '+b[0]];}
 assert(closest[0]>=9,'two circles nearly on top of each other: '+closest[1]);
 assert(!('roads' in T)&&!('unmapped' in T),'no traced waypoints, no place left without a circle');
 return {places:places.length,closest:[+closest[0].toFixed(1),closest[1]]};
});

check('roads: the shortcuts that crossed the picture are closed, the neighbours that had no road have one',()=>{
 const api=c.CRPGRuntime.mapRoutesV01516;assert.equal(api.retired.length,28);
 for(const id of api.retired){const r=g.row('47_MAP_EDGE_DB',id);assert(r,id);assert.equal(r[11],'INACTIVE',id);assert(!roads.some(x=>x[0]===id),id+' not among the open roads');}
 // The side-boss road of runtime_andrius.js is added on read; it is closed the same way.
 assert(g.rows('47_MAP_EDGE_DB').filter(r=>r[0].startsWith('HR_EDGE_')).every(r=>r[11]==='INACTIVE'));
 for(const [key,a,b,minutes] of api.added)for(const [from,to,s,back] of [[a,b,'A','B'],[b,a,'B','A']]){const r=g.row('47_MAP_EDGE_DB','EDGE_V01516_'+key+'_'+s);
  assert(r,key+s);assert.deepEqual([r[1],r[2],r[3],Number(r[5]),r[8],r[11],r[10]],[from,to,'WORLD_MOVE',minutes,'Y','ACTIVE','EDGE_V01516_'+key+'_'+back]);assert(!r[6]&&!r[7],'open to everyone');}
 // A save loaded twice keeps one copy of each road.
 const again=fresh('MAP_MOND_CITY');again.validateSave(JSON.parse(JSON.stringify(again.s)));assert.equal(again.rows('47_MAP_EDGE_DB').filter(r=>r[0].startsWith('EDGE_V01516_')).length,api.added.length*2);
 return {retired:api.retired.length,added:api.added.length*2};
});

check('roads: every line runs both ways, and every place is reachable from 몬드성 and back',()=>{
 for(const r of roads)assert(roads.some(x=>x[1]===r[2]&&x[2]===r[1]),'the way back from '+name(r[2])+' to '+name(r[1])+' ('+r[0]+')');
 const out=new Set(['MAP_MOND_CITY']),back=new Set(['MAP_MOND_CITY']);
 for(let grew=true;grew;){grew=false;for(const r of roads){if(out.has(r[1])&&!out.has(r[2])){out.add(r[2]);grew=true;}if(back.has(r[2])&&!back.has(r[1])){back.add(r[1]);grew=true;}}}
 // Only the sea fight against Osial is a story scene with no road (0.15.17 opened 야타용왕 도전 구역 from 남천문).
 const apart=places.map(m=>m[0]).filter(id=>!out.has(id)||!back.has(id)).sort();
 assert.deepEqual(apart,['MAP_OSIAL_BATTLE']);
 for(const id of apart)assert(!g.rows('47_MAP_EDGE_DB').some(r=>r[8]==='Y'&&r[11]==='ACTIVE'&&(r[1]===id||r[2]===id)),id+' has no road');
 return {roads:roads.length,places:places.length-apart.length};
});

check('lines: no road runs through the circle of a place it does not reach',()=>{
 const seen=new Set(),bad=[];let tightest=[Infinity,''];
 for(const r of roads){const a=T.points[r[1]],b=T.points[r[2]];if(!a||!b||a[0]!==b[0])continue;const key=[r[1],r[2]].sort().join('|');if(seen.has(key))continue;seen.add(key);
  const dx=b[1]-a[1],dy=b[2]-a[2],L2=dx*dx+dy*dy;
  for(const m of places){const id=m[0],p=T.points[id];if(id===r[1]||id===r[2]||p[0]!==a[0])continue;const t=((p[1]-a[1])*dx+(p[2]-a[2])*dy)/L2;if(t<=.04||t>=.96)continue;
   const d=Math.abs((p[1]-a[1])*dy-(p[2]-a[2])*dx)/Math.sqrt(L2);
   // A line over a place that both ends reach anyway shows a true way (몬드 외곽 초원 — 서풍 매의 사당 — 바람이 시작되는 곳).
   if(pairs.has([r[1],id].sort().join('|'))&&pairs.has([id,r[2]].sort().join('|')))continue;
   if(d<tightest[0])tightest=[d,name(r[1])+' — '+name(r[2])+' / '+name(id)];if(d<8)bad.push(tightest[1]+' '+d.toFixed(1)+'px');}}
 assert.deepEqual(bad,[]);
 return {lines:seen.size,tightest:[+tightest[0].toFixed(1),tightest[1]]};
});

check('minutes: a direct road is never slower than going round through other places',()=>{
 const open=roads.filter(r=>!r[6]),minutes=list=>list.slice(1).reduce((s,m,i)=>s+Number(open.find(r=>r[1]===list[i]&&r[2]===m)[5]),0),slow=[];
 for(const r of open){const detour=walk(r[1],r[2],open.filter(x=>x!==r));if(!detour||minutes(detour)>=Number(r[5]))continue;
  // 서풍 매의 사당 stands on the road from the plains to Windrise, so passing it is the same road.
  if(detour.length===3&&detour[1]==='MAP_MOND_TEMPLE_FALCON')continue;
  slow.push(name(r[1])+' → '+name(r[2])+' '+r[5]+'분, '+detour.map(name).join(' → ')+' '+minutes(detour)+'분');}
 assert.deepEqual(slow,[]);
 const plains=walk('MAP_MOND_CITY','MAP_MOND_PLAINS',open);assert.deepEqual(plains,['MAP_MOND_CITY','MAP_MOND_PLAINS'],'몬드성 → 몬드 외곽 초원 takes the main road');
 return {roads:open.length};
});

check('the places the user named: 층암거연 is on the 청허포 – 성법 관문 road, 머스크 암초 is its own reef past 맹세의 갑각',()=>{
 const harborToChasm=walk('MAP_LIYUE_HARBOR','MAP_CHASM_SURFACE');assert(harborToChasm,'a way to the Chasm');
 assert(harborToChasm.includes('MAP_LY_DETAIL_LINGJU'),'the Lisha road through 성법 관문: '+harborToChasm.map(name).join(' → '));
 assert(!roads.some(r=>[r[1],r[2]].includes('MAP_CHASM_SURFACE')&&[r[1],r[2]].includes('MAP_LIYUE_PLAINS')),'no straight road from the plains');
 const lisha=walk('MAP_LY_DETAIL_QINGXU','MAP_LY_DETAIL_TIANHENG');assert.deepEqual(lisha,['MAP_LY_DETAIL_QINGXU','MAP_LY_DETAIL_LINGJU','MAP_LY_DETAIL_TIANHENG'],'청허포 → 성법 관문 → 천형산');
 const reef=T.points.MAP_V141_MUSK_REEF,cape=T.points.MAP_CRPG_CAPE_OATH;assert(reef[1]-cape[1]>100,'the reef lies out at sea, not beside the cape');
 assert(pairs.has(['MAP_CRPG_CAPE_OATH','MAP_V141_MUSK_REEF'].sort().join('|')),'the boat leaves from 맹세의 갑각');
 return {chasm:harborToChasm.map(name)};
});

check('fading: the map fades exactly the places no open road reaches from here',()=>{
 const r=fresh('MAP_MOND_CITY'),reach=r.navigationReach();
 assert(reach.maps.has('MAP_MOND_CITY')&&reach.maps.has('MAP_MOND_PLAINS'),'the first roads out of 몬드성 are open');
 assert(!reach.maps.has('MAP_LIYUE_HARBOR'),'리월항 waits for the story');
 for(const id of reach.open){const e=r.row('47_MAP_EDGE_DB',id);assert(reach.maps.has(e[1])&&reach.maps.has(e[2]),'an open road joins two reachable places: '+id);}
 // The same answer as the route finder, for every place.
 const differ=places.map(m=>m[0]).filter(id=>!!r.navigationRoute(id)!==reach.maps.has(id));assert.deepEqual(differ,[]);
 // Standing somewhere else changes what is reachable, and nothing is written to the save.
 const before=JSON.stringify(r.s);r.navigationReach();assert.equal(JSON.stringify(r.s),before);
 return {reachable:reach.maps.size,open:reach.open.size};
});

check('screen: circles for all places, faded when out of reach, no numbers, names hidden until seen, hover only with a pointer',()=>{
 const nav=src('app_navigation.js'),css=src('shell.css');
 assert(nav.includes("const places=game.rows('32_MAP_DB').map(m=>m[0]).filter(id=>id&&this.point(id)?.[0]===atlas);"),'every place on this picture');
 assert(nav.includes("(isHere?' current':!open?' faded':near.has(id)?' open near':' far')")&&/\.terrain-node\.far\{opacity:\.45/.test(css)&&/\.terrain-node\.faded\{background:rgba\(255,255,255,\.16\);border:2px solid/.test(css),'out of reach is a see-through ring (still visible on a bright picture)');
 assert(nav.includes("'terrain-link'+(l.open?'':' locked')")&&/\.terrain-link\.locked\{[^}]*stroke-dasharray/.test(css),'a road not usable yet is a faint dashed line');
 assert(!/terrain-number|String\(n\.number\)|terrain-route-tag|terrain-leader|cluster/.test(nav),'no numbers, tags, leader lines or clusters');
 assert(nav.includes("placeName(id){const known=this.known||new Set();return id===game.s.global.CURRENT_MAP_ID||known.has(id)?mapName(id):'';}"),'a place not seen yet keeps its name');
 assert(nav.includes("route.maps.map(id=>this.placeName(id)||'가 보지 않은 곳')")&&nav.includes("targetName=target&&(this.placeName(target)||'아직 가 보지 않은 곳')"),'nor does the trip bar spoil it');
 assert(nav.includes("const hoverable=!!window.matchMedia?.('(hover: hover)').matches;")&&nav.includes("if(window.matchMedia?.('(hover: hover)').matches){b.addEventListener('pointerenter',highlight);"),'hover only where a pointer hovers');
 assert(nav.includes("if(best&&shown)taken.push(best);else{t.classList.add('quiet');")&&css.includes('.terrain-label.quiet{display:none}'),'a name never covers another name');
 assert(nav.includes("['far','한 번에는 못 가는 곳'],['faded','아직 막힌 곳']")&&!/\.terrain-key\{[^}]*display:none/.test(css),'the key under the map says what faded means');
 assert(!/번호/.test(nav.match(/지도 보는 법[^\n]*/)[0]),'the help text no longer talks about numbers');
 return {};
});

const out=path.join(root,'reports','test_map_v01516.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(results,null,2));
console.log(JSON.stringify({ok:results.every(r=>r.ok),checks:results.length}));
