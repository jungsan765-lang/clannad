'use strict';
// 0.16.3 (the user, 2026-10-07): 「비경 네가 잘못이해했어. 특성비경 따로 돌파 비경 따로 경험치 비경 따로 하고, 세실리아의 모밭은 크라운
// 협곡에 있어」, 「아니 무상의 바위 위치랑 하늘을 찌르는 땅 비경 위치를 아직도 모르겠어?」, 「물의 정령 위치도 여기야」, 「교영마을을 왜 굳이
// 침옥협곡쪽을 만들어서 넣는건데;; 거긴 빼도 된다고」, 「아예 새로운 위치를 만들어도 돼 비경 전용 위치같은걸로」, 「비경 두배 표시 조금
// 이해가 잘 안가는 느낌이라 … 글로 써도 될듯」, 「휴대폰으로 했을 때 저런식으로 몬스터 체력도 가리고 좀 불편해」.
const assert=require('node:assert/strict'),path=require('path'),vm=require('vm');
const {fs,root,c,fresh,R,db}=require('./helpers_v011.cjs');
const src=f=>fs.readFileSync(path.join(root,'source',f),'utf8'),cp=x=>JSON.parse(JSON.stringify(x)),results=[];
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
// The circles as the page has them: terrain_map.js plus the Liyue detail areas (app_liyue_areas.js copies their points).
const T=(()=>{const box={window:{}};vm.runInNewContext(src('terrain_map.js'),box);const t=box.window.CRPGTerrainMap;for(const a of c.CRPGRuntime.liyueAreaCatalog.areas)t.points[a.id]=['liyue',a.point[0],a.point[1]];return t;})();
const api=c.CRPGRuntime,L=api.landmarksV0163,G=api.growthV01522,g=fresh('MAP_MOND_CITY');
const near=(id,x,y,d=12)=>{const p=T.points[id];assert(p,'circle for '+id);assert(Math.hypot(p[1]-x,p[2]-y)<=d,id+' at '+p.slice(1,3)+' should be near '+[x,y]);return p;};

check('every domain has a place of its own at the original spot, named after it, with no random fights and nothing to gather',()=>{
 for(const [key,d]of Object.entries(G.domains)){if(d.map==='MAP_CHASM_DEEP')continue;const m=g.row('32_MAP_DB',d.map);assert(m,key);assert.equal(m[2],d.name);assert.equal(m[4],'비경 입구');assert.equal(m[8],'N');assert.equal(Number(m[9]),0);assert.equal(m[25],'NONE');assert(T.points[d.map],'circle for '+d.map);}
 // HoYoLAB map points (x/4 + offset): the spots the user pointed at.
 const at={MAP_D163_CECILIA_GARDEN:['mond',225,290],MAP_D163_FORSAKEN_RIFT:['mond',388,439],MAP_D163_VALLEY_OF_REMEMBRANCE:['mond',332,429],MAP_D163_MIDSUMMER_COURTYARD:['mond',556,231],MAP_D163_PEAK_OF_VINDAGNYR:['mond',371,596],MAP_D163_RIDGE_WATCH:['mond',244,489],
  MAP_D163_ZHOU_FORMULA:['liyue',492,65],MAP_D163_LIANSHAN_FORMULA:['liyue',692,307],MAP_D163_TAISHAN_MANSION:['liyue',298,324],MAP_D163_CLEAR_POOL:['liyue',235,165],MAP_D163_DOMAIN_OF_GUYUN:['liyue',830,559]};
 for(const [id,[atlas,x,y]]of Object.entries(at)){const p=near(id,x,y);assert.equal(p[0],atlas,id);}
 assert(Math.hypot(T.points.MAP_D163_CECILIA_GARDEN[1]-T.points.MAP_CRPG_BRIGHTCROWN_CANYON[1],T.points.MAP_D163_CECILIA_GARDEN[2]-T.points.MAP_CRPG_BRIGHTCROWN_CANYON[2])<40,'세실리아의 모밭 is by 크라운 협곡');
 assert(g.rows('47_MAP_EDGE_DB').some(e=>e[11]==='ACTIVE'&&e[1]==='MAP_CRPG_BRIGHTCROWN_CANYON'&&e[2]==='MAP_D163_CECILIA_GARDEN'),'its road leaves from 크라운 협곡');
 // 하늘을 찌르는 땅 is the big island, not the waypoint island of 고운각.
 assert(Math.hypot(T.points.MAP_D163_DOMAIN_OF_GUYUN[1]-T.points.MAP_LY_DETAIL_GUYUN[1],T.points.MAP_D163_DOMAIN_OF_GUYUN[2]-T.points.MAP_LY_DETAIL_GUYUN[2])>60);
 for(const [id]of L.places)for(const e of g.rows('47_MAP_EDGE_DB').filter(e=>e[1]===id&&e[11]==='ACTIVE'))assert(g.rows('47_MAP_EDGE_DB').some(b=>b[1]===e[2]&&b[2]===id&&b[11]==='ACTIVE'),'the way back from '+id);
 return {places:L.places.length};
});

check('the field bosses stand at their arenas from the HoYoLAB map (무상의 바위 on the north island, 물의 정령 in the lake north of 무망의 언덕)',()=>{
 const B=api.fieldBosses.bosses,spot={FB_GEO_HYPOSTASIS:['liyue',802,476],FB_OCEANID:['liyue',521,42],FB_PYRO_REGISVINE:['liyue',353,450],FB_PRIMO_GEOVISHAP:['liyue',220,436,26],FB_ANEMO_HYPOSTASIS:['mond',488,128],FB_ELECTRO_HYPOSTASIS:['mond',651,526],FB_CRYO_REGISVINE:['mond',583,331],FB_CRYO_HYPOSTASIS:['mond',302,561]};
 for(const [id,[atlas,x,y,d]]of Object.entries(spot)){const map=B[id].map;assert(g.row('32_MAP_DB',map),id);const p=near(map,x,y,d||12);assert.equal(p[0],atlas,id);assert(g.rows('35_BOSS_ROUTE_DB').some(r=>r[0]==='BRT_'+id&&r[2]===map),'its route starts there');}
 assert.equal(B.FB_RUIN_SERPENT.map,'MAP_CHASM_DEEP');
 // The old hosts no longer carry them.
 for(const [id,old]of [['FB_GEO_HYPOSTASIS','MAP_LY_DETAIL_GUYUN'],['FB_OCEANID','MAP_LY_DETAIL_DIHUA'],['FB_PYRO_REGISVINE','MAP_LY_DETAIL_LUHUA'],['FB_CRYO_HYPOSTASIS','MAP_CRPG_WYRMREST_VALLEY'],['FB_ELECTRO_HYPOSTASIS','MAP_CRPG_CAPE_OATH']])assert.notEqual(B[id].map,old);
 // A boss fight can be started at its arena.
 const r=fresh(B.FB_GEO_HYPOSTASIS.map);r.adminApply({op:'level',target:'ALL',value:50});assert(r.placeEntries?.().some?.(e=>String(e.route||e.id||'').includes('FB_GEO_HYPOSTASIS'))||r.rows('35_BOSS_ROUTE_DB').some(x=>x[2]===r.s.global.CURRENT_MAP_ID&&x[0]==='BRT_FB_GEO_HYPOSTASIS'));
 return {bosses:Object.keys(spot).length};
});

check('the Chenyu Vale places left the map: no circle, no caption, no open road; a journey saved there wakes on the Liyue mountain road; their commission is not offered',()=>{
 for(const id of L.retired){assert(!T.points[id],id);assert(!g.rows('47_MAP_EDGE_DB').some(e=>e[11]==='ACTIVE'&&(e[1]===id||e[2]===id)),id+' roads');}
 assert(!(T.atlases.liyue.captions||[]).length,'no 침옥 협곡 caption');assert(!/침옥 협곡',/.test(src('terrain_map.js')));
 assert(!src('runtime_liyue_places.js').includes('MAP_CHENYU_QIAOYING')&&!src('runtime_recruitment.js').includes('MAP_CHENYU_QIAOYING'),'the artisans are not sent there');
 const r=fresh('MAP_MOND_CITY'),s=cp(r.s);s.global.CURRENT_MAP_ID='MAP_CHENYU_QIAOYING';const back=new R(db,s);assert.equal(back.s.global.CURRENT_MAP_ID,L.returnTo);assert.equal(back.s.global.LOCATION,back.row('32_MAP_DB',L.returnTo)[2]);
 const h=fresh('MAP_LIYUE_HARBOR');assert(!h.commissionEntries().some(q=>/YILONG/.test(q.row[0])),'the tea-box commission is not offered');
 return {retired:L.retired};
});

check('domain gate: the kind by the name, levels as stage buttons with their lock, and the daily double in words (no ×2 badge)',()=>{
 const growth=src('app_growth_v01522.js'),css=src('shell.css'),nav=src('app_navigation.js');
 assert(growth.includes("b.className='domain-stage'")&&growth.includes("if(x.lock)b.append(el('small','',x.lock))"),'stage buttons say why they are closed');
 assert(growth.includes("'오늘 첫 3번 승리는 재료 2배 · 남은 '+rw.remaining+'번'")&&growth.includes("'오늘 재료 2배는 다 썼습니다 · 0시에 다시 3번'"),'the double in words');
 assert(!growth.includes("el('span','domain-gate-bonus','×2')"),'no ×2 badge');assert(/\.domain-gate-double\{/.test(css));
 assert(nav.includes("domainLabel(d,shown)")&&nav.includes("kind+' 비경'"),'the map says which kind of domain');
 const r=fresh('MAP_D163_VALLEY_OF_REMEMBRANCE');const e=r.growthDomainEntries();assert.deepEqual([...e.map(x=>x.id)],['VALLEY_OF_REMEMBRANCE:5','VALLEY_OF_REMEMBRANCE:10','VALLEY_OF_REMEMBRANCE:15']);assert.equal(e[0].lock,'');assert.equal(e[1].lock,'주인공 Lv.5');
 const rw=r.growthDomainRewards(e[0],'PYRO');assert.equal(rw.doubles,true);assert.equal(rw.remaining,3);
 const x=fresh('MAP_D163_MIDSUMMER_COURTYARD');assert.equal(x.growthDomainRewards(x.growthDomainEntries()[0]).doubles,false,'no double on an experience domain');
 return {};
});

check('sideways phone battle: enemy pictures shrink to the room above the commands, a full party tightens, the version button stays out of the way',()=>{
 const layout=src('app_battle_layout_v01522.js'),land=src('landscape_v01524.css');
 assert(layout.includes('function fitFighters(){')&&layout.includes(" fitFighters();\n}")&&layout.includes("addEventListener('resize',()=>{try{fitFighters();fitPlayback();}catch{}});"),'fitted after every draw and on resize');
 assert(layout.indexOf("for(const k of ['tight','tighter'])")<layout.indexOf("enemies.style.setProperty('--enemy-h'"),'the party first, then the pictures');
 assert(/\.shell-allies\.tight\{/.test(land)&&/\.shell-allies\.tighter \.combatant-copy \.stat\{display:none\}/.test(land));
 assert(land.includes('body.teyvat.battle-screen #game-version{display:none}'));
 return {};
});

check('version 0.16.3 with its notes in the full chain (later versions sit on top)',()=>{
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')),top=JSON.parse(fs.readFileSync(path.join(root,'content/release-notes.json'),'utf8'));
 const [maj,min,pat]=pkg.version.split('.').map(Number);assert(maj>0||min>16||(min===16&&pat>=3),pkg.version);
 let notes=top;while(notes&&notes.version!=='0.16.3')notes=notes.previous;assert(notes,'0.16.3 is in the chain');
 assert.equal(notes.previous.version,'0.16.2');assert.equal(notes.previous.previous.version,'0.16.1');
 assert(notes.changes.some(x=>x.includes('특성 비경'))&&notes.changes.some(x=>x.includes('교영 마을'))&&notes.changes.some(x=>x.includes('무상의 바위')));
 return {changes:notes.changes.length};
});

const out=path.join(root,'reports','test_landmarks_v0163.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(results,null,2));
console.log(JSON.stringify({ok:results.every(r=>r.ok),checks:results.length}));
