'use strict';
const assert=require('node:assert/strict'),h=require('./helpers_v011.cjs'),{fresh,R,db}=h,fs=h.fs,path=h.path,results=[];
function test(name,fn){try{fn();results.push({name,ok:true});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
function guild(r){r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});}

test('forge weapons, white iron and crystal chunks are absent from every shop',()=>{
 const r=fresh(),forge=new Set(r.rows('17_RECIPE_DB').filter(x=>x[1]==='무기 제작'&&x[2]==='EQUIP').map(x=>x[3]));
 assert(forge.size>=5);const sold=r.rows('19_SHOP_STOCK_DB');
 assert.equal(sold.some(x=>forge.has(x[3])),false);
 assert.equal(sold.some(x=>['ORE_WHITE_IRON','ORE_CRYSTAL'].includes(x[3])),false);
});

test('mystery orb player text contains no branch or CE implementation codes',()=>{
 const r=fresh(),x=r.row('14_ITEM_DB','KEY_ISK_MYSTERY_ORB'),text=[x[5],x[6],x[7],x[22]].join(' ');
 assert(!/\bCE_\d+|AB\/B|AA\b|K는/.test(text),text);assert.match(text,/퀘스트 아이템/);
});

test('accepted commission can be pinned and becomes navigation goal',()=>{
 const r=fresh();guild(r);r.action('COMMISSION_ACCEPT',{quest:'Q_MOND_EXP_PLAINS_CART'});r.action('PLACE_LEAVE');
 r.action('OBJECTIVE_PIN',{kind:'COMMISSION',objective:'Q_MOND_EXP_PLAINS_CART'});
 assert.deepEqual(r.s.pinnedObjective,{kind:'COMMISSION',id:'Q_MOND_EXP_PLAINS_CART'});
 assert.equal(r.navigationGoal(),'MAP_MOND_PLAINS');
 r.action('OBJECTIVE_CLEAR');assert.equal(r.s.pinnedObjective,undefined);
});

test('affection objective kind can be pinned without changing its story state',()=>{
 const r=fresh(),entry=r.storyEntries().find(e=>e.kind==='AFFECTION');assert(entry);
 const before=r.storyDone(entry.id);r.action('OBJECTIVE_PIN',{kind:'AFFECTION',objective:entry.id});
 assert.equal(r.s.pinnedObjective.kind,'AFFECTION');assert.equal(r.s.pinnedObjective.id,entry.id);assert.equal(r.storyDone(entry.id),before);
});

test('Barbara catalyst basic attack deals Hydro instead of physical',()=>{
 const r=fresh();r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify({MOND_BARBARA:{state:'JOINED'}});r.markContact('PROFILE_MOND_BARBARA');r.action('PARTY',{char:'MOND_BARBARA',slot:2});
 r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';r.startBattle('EG_MOND_HILI_PATROL','RANDOM');const a=r.s.runtime.actors.find(x=>x.source==='MOND_BARBARA'),t=r.s.runtime.actors.find(x=>x.side==='ENEMY');assert(a&&t);
 r.die=()=>1;const start=r.s.runtime.log.length;r.basicHit(a,t,.1);const event=r.s.runtime.log.slice(start).find(e=>e.actor===a.name&&Object.hasOwn(e,'damage'));assert(event,event&&JSON.stringify(event));assert.equal(event.element,'물');
});

test('free Mondstadt-Liyue direct transit is once per in-game day and marked for 30 second UI wait',()=>{
 const r=fresh();r.s.flags.FLAG_ACCESS_REGION_LIYUE=true;r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';
 const out=r.action('MOVE',{edge:'EDGE_CRPG_MOND_CITY_TO_LIYUE_HARBOR'}).result;assert.equal(out.regionTransit,true);assert.equal(out.realWaitMs,30000);assert.equal(r.s.regionTransitDaily.day,r.s.global.WORLD_DAY);
 assert.match(r.edgeReason(r.row('47_MAP_EDGE_DB','EDGE_CRPG_LIYUE_HARBOR_TO_MOND_CITY')),/하루에 한 번/);
 r.advanceTime(1440);assert.equal(r.edgeReason(r.row('47_MAP_EDGE_DB','EDGE_CRPG_LIYUE_HARBOR_TO_MOND_CITY')),'');
});

test('Stone Gate and Dawn Winery have a normal unrestricted overland return road',()=>{
 const r=fresh();r.s.flags.FLAG_ACCESS_REGION_LIYUE=true;r.s.global.CURRENT_MAP_ID='MAP_LY_DETAIL_SHIMEN';
 const edge=r.row('47_MAP_EDGE_DB','EDGE_QUALITY_SHIMEN_TO_DAWN');assert.equal(edge[2],'MAP_MOND_DAWN_WINERY');assert.equal(edge[3],'WORLD_MOVE');assert.equal(r.edgeReason(edge),'');
 const out=r.action('MOVE',{edge:edge[0]}).result;assert.equal(out.map,'MAP_MOND_DAWN_WINERY');assert.equal(out.regionTransit,undefined);
});

test('Razor introduction is in Wolvendom and no longer assigned to a Mondstadt city contact',()=>{
 const r=fresh(),d=r.storyDefinition('LEG_MOND_RAZOR'),places=r.legendIntroductionPlaces(d);assert(places.length);
 assert(places.some(p=>p.id==='EVT_QUALITY_RAZOR_WOLVENDOM'&&p.maps.includes('MAP_MOND_WOLVENDOM')));
 assert.equal(places.some(p=>p.maps.includes('MAP_MOND_CITY')),false);
});

test('joined characters are treated as known and future joins mark first contact',()=>{
 const r=fresh();r.storySetCompanion('MOND_BARBARA','JOINED');assert.notEqual(r.s.relations.PROFILE_MOND_BARBARA?.firstContact,null);assert.equal(r.storyCharacterKnown('PROFILE_MOND_BARBARA'),true);
 const x=fresh();x.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify({MOND_DAHLIA:{state:'JOINED'}});const row=x.storyIndex().nodes.get('ROUTE_ISEKAI:ISK_M05_AA_164');assert(row);assert.match(x.storyDisplayText(row),/^다시 뵈니 반갑네요/);
});

test('Venti identity reveals visibly surprise Jean and Diluc before they refocus',()=>{
 const r=fresh();
 const ids=['TRV_M02_N300','TRV_M02_N302','ISK_M05_AB_117','ISK_M05_B_122'];
 for(const id of ids){const row=r.storyIndex().nodes.get((id.startsWith('TRV_')?'ROUTE_TRAVELER':'ROUTE_ISEKAI')+':'+id);assert(row,id);const t=r.storyDisplayText(row);assert(/바르바토스/.test(t),id);assert(/잠|놀|말을 잇지|대답하지|몇 초/.test(t),t);}
});

test('UI exposes pin controls for commission legend and affection and a 30 second region transit overlay',()=>{
 const src=fs.readFileSync(path.join(h.root,'source/app_quality_fixes.js'),'utf8');
 for(const token of ['이 임무 고정','고정 임무','AFFECTION','LEGEND','COMMISSION','duration=30000','지역 직행 이동 중','EVT_QUALITY_RAZOR_WOLVENDOM'])assert(src.includes(token),token);
});

fs.writeFileSync(path.join(h.root,'reports/quality-fixes-v01336.json'),JSON.stringify({total:results.length,passed:results.filter(x=>x.ok).length,results},null,2));if(results.some(x=>!x.ok))process.exitCode=1;
