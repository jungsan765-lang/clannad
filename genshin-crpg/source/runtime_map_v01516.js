/* 0.15.16 travel routes that follow the map (user: 「이어지는 구간들에 줄을 만들어봐. 그 줄대로 가면 상식적으로 그게 돌아오는
 * 구간이 맞는지 봐봐」, 「층암거연은 도대체 왜 청허포랑 성법관문 사이에 있는 길을 안따라가는지」). The travel map now draws every
 * route as a straight line between two places, so a route that jumps across the picture over other places (리월 평야 →
 * 층암거연 across all of Liyue, 속삭임의 숲 → 울프 영지 across the lake …) is retired, and the few neighbours that had no
 * road of their own get one. Retired rows stay in the table as INACTIVE (nothing that names them breaks); the route finder
 * already skips them, so trips follow the roads place by place. Shared by the browser and the account server. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;
// Both directions of each pair. Every place stays reachable (tests/test_map_v01516.cjs walks the whole graph).
const RETIRED=[
 // Liyue: the Chasm is reached by the Lisha road (성법 관문 → 층암거연 · 동쪽 진입로), not straight from the plains.
 'EDGE_CRPG_LIYUE_PLAINS_TO_CHASM_SURFACE','EDGE_CRPG_CHASM_SURFACE_TO_LIYUE_PLAINS',
 // 리월항 ↔ 리월 산악지대 crossed the whole west; the mountains are reached through 녹화 연못 · 절운간 or 천주 골짜기 · 남천문.
 'EDGE_LIYUE_HARBOR_TO_MOUNTAINS','EDGE_LIYUE_MOUNTAINS_TO_HARBOR',
 // 리월 평야 ↔ 경책 산장 jumped over 망서 객잔 and 적화주; the north road goes 망서 객잔 → 적화주 → 석문 → 경책 산장.
 'EDGE_LIYUE_PLAINS_TO_QINGCE','EDGE_LIYUE_QINGCE_TO_PLAINS',
 // 리월항 ↔ 리월 평야 ran over 북쪽 진입로 and 귀리 평원, which lie on that road.
 'EDGE_LIYUE_HARBOR_TO_PLAINS','EDGE_LIYUE_PLAINS_TO_HARBOR',
 // 적화주 ↔ 경책 산장 · 남쪽 밭길 passed the village itself.
 'EDGE_LY_DETAIL_016_A','EDGE_LY_DETAIL_016_B',
 // 청허포 ↔ 천형산 skipped 성법 관문; the Lisha road runs 청허포 → 성법 관문 → 천형산.
 'EDGE_LY_DETAIL_035_A','EDGE_LY_DETAIL_035_B',
 // Mond: across Cider Lake and Mondstadt itself.
 'EDGE_CRPG_V011_MOND_FOREST_TO_CRPG_BRIGHTCROWN_CANYON','EDGE_CRPG_V011_CRPG_BRIGHTCROWN_CANYON_TO_MOND_FOREST',
 'EDGE_MOND_FOREST_TO_WOLVENDOM','EDGE_MOND_WOLVENDOM_TO_FOREST',
 // 몬드 외곽 초원 ↔ 북풍의 왕랑 도전 구역 · 다운 와이너리 jumped over 샘물 마을; the west road leaves from 샘물 마을.
 'HR_EDGE_PLAINS_TO_WOLF','HR_EDGE_WOLF_TO_PLAINS',
 'EDGE_MOND_PLAINS_TO_DAWN_WINERY','EDGE_MOND_DAWN_WINERY_TO_PLAINS',
 // 속삭임의 숲 ↔ 남풍 사자의 사당 crossed the plains; 바람이 시작되는 곳 ↔ 타타우파 협곡 passed the lion temple.
 'EDGE_CRPG_V011_MOND_FOREST_TO_MOND_TEMPLE_LION','EDGE_CRPG_V011_MOND_TEMPLE_LION_TO_MOND_FOREST',
 'EDGE_CRPG_V011_MOND_WINDRISE_TO_CRPG_DADAUPA_GORGE','EDGE_CRPG_V011_CRPG_DADAUPA_GORGE_TO_MOND_WINDRISE',
 // 몬드 외곽 초원 ↔ 우인단 보관고 passed 서풍 매의 사당 and 바람이 시작되는 곳; 매의 해안 ↔ 맹세의 갑각 crossed the bay.
 'EDGE_CRPG_V011_MOND_PLAINS_TO_MOND_FATUI_CACHE','EDGE_CRPG_V011_MOND_FATUI_CACHE_TO_MOND_PLAINS',
 'EDGE_CRPG_V011_CRPG_FALCON_COAST_TO_CRPG_CAPE_OATH','EDGE_CRPG_V011_CRPG_CAPE_OATH_TO_CRPG_FALCON_COAST'
];
// New neighbour roads: [key, a, b, minutes].
const ADDED=[
 ['SPRINGVALE_WOLVENDOM','MAP_MOND_SPRINGVALE','MAP_MOND_WOLVENDOM',20],
 ['SPRINGVALE_WINERY','MAP_MOND_SPRINGVALE','MAP_MOND_DAWN_WINERY',20],
 ['LINGJU_TIANHENG','MAP_LY_DETAIL_LINGJU','MAP_LY_DETAIL_TIANHENG',25],
 // 옥경대 was reached only from 비운 언덕, and that line ran through the 리월항 circle between them.
 ['HARBOR_YUJING','MAP_LIYUE_HARBOR','MAP_LY_DETAIL_YUJING',5]
];
// A side road that made a detour faster than the main road it bends around: 몬드성 → 시드르 호수 낚시터 → 몬드 외곽 초원 took 20
// minutes against 30 on the main road, so every trip to the plains was routed past the fishing spot. [a, b, minutes].
const MINUTES=[['MAP_CRPG_CIDER_BANK','MAP_MOND_PLAINS',25]];
api.mapRoutesV01516={retired:RETIRED.slice(),added:ADDED.map(a=>a.slice()),minutes:MINUTES.map(a=>a.slice())};
const prior=P.installLocalRevision;
P.installLocalRevision=function(){
 prior.call(this);if(this._mapRoutesV01516)return;
 const key='47_MAP_EDGE_DB',rows=this.db[key].map(r=>r.slice()),maps=this.tables['32_MAP_DB'];
 const retired=new Set(RETIRED);for(const r of rows)if(retired.has(r[0]))r[11]='INACTIVE';
 for(const [a,b,minutes] of MINUTES)for(const r of rows)if(r[1]===a&&r[2]===b||r[1]===b&&r[2]===a)r[5]=minutes;
 for(const [name,a,b,minutes] of ADDED){if(!maps.has(a)||!maps.has(b))continue;
  for(const [from,to,suffix,back] of [[a,b,'A','B'],[b,a,'B','A']]){const id='EDGE_V01516_'+name+'_'+suffix;if(rows.some(r=>r[0]===id))continue;
   rows.push([id,from,to,'WORLD_MOVE',1,minutes,'','','Y',(maps.get(to)?.[2]||to)+' 이동','EDGE_V01516_'+name+'_'+back,'ACTIVE','CRPG_V01516','지도에 그려진 길을 따라 이웃 장소를 잇는 양방향 길']);}}
 this.db={...this.db,[key]:rows};this.tables[key]=new Map(rows.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));this._mapRoutesV01516=true;
};
// Where the party can walk from here right now: every place reached over roads whose conditions are met, by the same rule
// the route finder uses. The travel map fades the rest (「당장 못가는 곳은 투명하게」). `open` holds the usable roads.
P.navigationReach=function(){
 const start=this.s.global.CURRENT_MAP_ID,maps=new Set([start]),open=new Set(),queue=[start],from=new Map();
 for(const r of this.rows('47_MAP_EDGE_DB')){if(!from.has(r[1]))from.set(r[1],[]);from.get(r[1]).push(r);}
 while(queue.length){const map=queue.shift(),view=Object.create(this);view.s={...this.s,global:{...this.s.global,CURRENT_MAP_ID:map}};
  for(const r of from.get(map)||[]){if(view.edgeReason(r))continue;open.add(r[0]);if(!maps.has(r[2])&&this.tables['32_MAP_DB'].has(r[2])){maps.add(r[2]);queue.push(r[2]);}}}
 return {maps,open};
};
// Some routes are added on read rather than stored (runtime_andrius.js's side-boss road); they are retired the same way.
const retiredSet=new Set(RETIRED),retire=r=>r&&retiredSet.has(r[0])&&r[11]==='ACTIVE'?Object.assign(r.slice(),{11:'INACTIVE'}):r;
const priorRows=P.rows,priorRow=P.row;
P.rows=function(name){const rows=priorRows.call(this,name);return name==='47_MAP_EDGE_DB'?rows.map(retire):rows;};
P.row=function(name,id){const r=priorRow.call(this,name,id);return name==='47_MAP_EDGE_DB'?retire(r):r;};
})(globalThis);
