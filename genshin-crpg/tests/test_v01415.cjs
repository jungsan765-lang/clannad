'use strict';
// v0.14.15: treasure chests (minigames, hidden chests, rewards), Primogems from oculus offerings, monthly Spiral Abyss
// seasons with the 나선 문장, and an official picture for every Mond and Liyue place.
const assert=require('node:assert/strict'),path=require('path');
const {fs,root,c,fresh,advance}=require('./helpers_v011.cjs');
const results=[],src=f=>fs.readFileSync(path.join(root,'source',f),'utf8'),file=f=>fs.readFileSync(path.join(root,f),'utf8');
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const api=c.CRPGRuntime,rules=api.chestRules;
const world=(map='MAP_MOND_CITY')=>{const g=fresh(map);g.installMarketContent();return g;};
// Reference solvers, written apart from the game code (0.15.2: every chest game, tests/puzzle_solvers.cjs).
const {solve}=require('./puzzle_solvers.cjs');
const refused=(fn,pattern)=>{try{fn();}catch(e){if(pattern)assert.match(e.message,pattern);return true;}return false;};
const plain=x=>JSON.parse(JSON.stringify(x)); // values made inside the game's VM context have other prototypes

check('chests: 24 in each region (18 puzzles, 6 hidden) and 1,270 Primogems in all — Mond 580, Liyue 690',()=>{
 const by=r=>rules.chests.filter(x=>x.region===r);
 for(const r of ['MOND','LIYUE']){assert.equal(by(r).length,24,r);assert.equal(by(r).filter(x=>x.game).length,18,r+' puzzles');assert.equal(by(r).filter(x=>!x.game).length,6,r+' hidden');}
 const sum=r=>by(r).reduce((n,x)=>n+x.reward.primogem,0);
 assert.equal(sum('MOND'),580);assert.equal(sum('LIYUE'),690);
 assert(rules.chests.every(x=>x.reward.primogem<=40),'no chest pays more than 40 (Primogems are paced for the 2.0 raid)');
 assert.equal(new Set(rules.chests.map(x=>x.id)).size,48);
 return {mond:sum('MOND'),liyue:sum('LIYUE')};
});

check('chests: each opens once with the right answer, at its place; wrong answers, other places and daytime night chests are refused',()=>{
 let opened=0,primogems=0;const games={};
 for(const x of rules.chests){
  const elsewhere=world(x.map==='MAP_MOND_CITY'?'MAP_MOND_PLAINS':'MAP_MOND_CITY');
  assert(refused(()=>elsewhere.action('CHEST_OPEN',{chest:x.id,answer:[]}),/있는 곳에 가야/),x.id+' only at its place');
  const g=world(x.map);
  if(x.how==='SCENERY_NIGHT'||x.night){assert(refused(()=>g.action('CHEST_OPEN',{chest:x.id}),/밤/),x.id+' only at night');g.s.global.WORLD_TIME='21:00';}
  let answer;
  if(x.game){const p=plain(g.chestPuzzle(x.id));answer=solve[x.game](p,api);games[x.game]=(games[x.game]||0)+1;
   assert(refused(()=>g.action('CHEST_OPEN',{chest:x.id,answer:x.game==='SPOT'?[0]:[]}),/퍼즐/),x.id+' wrong answer refused');}
  const before=Number(g.s.global.PRIMOGEM)||0,mora=Number(g.s.global.MORA)||0;g.action('CHEST_OPEN',{chest:x.id,answer});
  assert.equal((Number(g.s.global.PRIMOGEM)||0)-before,x.reward.primogem,x.id+' primogems');assert.equal(g.s.global.MORA-mora,x.reward.mora,x.id+' mora');
  assert(g.chestOpened(x.id));assert(refused(()=>g.action('CHEST_OPEN',{chest:x.id,answer}),/이미 연/),x.id+' only once');
  opened++;primogems+=x.reward.primogem;
 }
 assert.equal(opened,48);assert.equal(primogems,1270);
 return {opened,games};
});

check('chests: a puzzle stays the same for one journey and differs between journeys; Mond is gentle, Liyue harder',()=>{
 const a=world('MAP_MOND_FOREST'),b=world('MAP_MOND_FOREST');
 assert.equal(JSON.stringify(a.chestPuzzle('CHEST_M03')),JSON.stringify(a.chestPuzzle('CHEST_M03')));
 assert.notEqual(JSON.stringify(a.chestPuzzle('CHEST_M03')),JSON.stringify(b.chestPuzzle('CHEST_M03')));
 const p=id=>world().chestPuzzle(id),mondSpot=p('CHEST_M01'),liyueSpot=p('CHEST_L01');
 assert.equal(mondSpot.count,3);assert(!mondSpot.subtle);assert.equal(mondSpot.radius,7);
 assert.equal(liyueSpot.count,5);assert(liyueSpot.subtle,'Liyue differences are subtle');assert(liyueSpot.radius<mondSpot.radius);
 for(const id of rules.chests.filter(x=>x.game==='SPOT').map(x=>x.id))for(const d of p(id).diffs){
  assert(['icon','flip','hue'].includes(d.kind),'no stains or blurs: '+d.kind);assert(d.y>=40&&d.y<=90,'in the lower part of the picture, not the sky: '+id+' y'+d.y);}
 assert.equal(p('CHEST_M07').n,4);assert.equal(p('CHEST_L03').n,6,'sudoku 4×4 in Mond, 6×6 in Liyue');
 assert.equal(p('CHEST_M04').n,3);assert.equal(p('CHEST_L04').n,4,'slates 3×3 in Mond, 4×4 in Liyue');
 return {mondSpot:mondSpot.count,liyueSpot:liyueSpot.count};
});

check('chests: the handbook says how many there are and how many are found, never where',()=>{
 const g=world();const j=g.chestJournal();
 assert.deepEqual(plain(j.map(r=>[r.name,r.total,r.puzzles.total,r.hidden.total])),[['몬드',24,18,6],['리월',24,18,6]]);
 const text=JSON.stringify(j);
 for(const x of rules.chests){const name=g.tables['32_MAP_DB'].get(x.map)?.[2];assert(!text.includes(x.map),'no map ids');if(name)assert(!text.includes(name),'no place names: '+name);}
 assert(!/rumou?r|소문/.test(text),'no rumours');
 const ui=src('app_chests_v01415.js');const journal=ui.slice(ui.indexOf('C.journal=function'));
 assert(!/mapName|gameName|소문/.test(journal),'the treasure page draws counts only');
 assert(!/rumou?r/i.test(src('runtime_chests_v01415.js')),'no rumour texts left in the game data');
 return j.map(r=>r.name+' '+r.found+'/'+r.total);
});

check('chests: hidden chests only show at their place (and the night ones only at night); saves keep what was opened',()=>{
 const g=world('MAP_MOND_WINDRISE');
 assert.deepEqual(plain(g.chestsHere('MENU').map(x=>x.id)),['CHEST_M22']);assert.deepEqual(plain(world('MAP_MOND_CITY').chestsHere('MENU')),[]);
 const h=world('MAP_LIYUE_HARBOR');assert.deepEqual(plain(h.chestsHere('WISH')),[],'the harbour wish chest waits for the night');h.s.global.WORLD_TIME='22:00';assert.deepEqual(plain(h.chestsHere('WISH').map(x=>x.id)),['CHEST_L19']);
 g.action('CHEST_OPEN',{chest:'CHEST_M22'});assert.deepEqual(plain(g.chestsHere('MENU')),[],'gone once opened');
 const R=g.constructor,saved=JSON.parse(g.serialize()),again=new R(g.db,saved,true);assert(again.chestOpened('CHEST_M22'));
 for(const bad of [{version:1,opened:{CHEST_X:{day:1}}},{version:1,opened:{CHEST_M01:{day:0}}},{version:2,opened:{}}])
  assert(refused(()=>new R(g.db,{...saved,chests:bad},true),/보물상자 기록/),JSON.stringify(bad));
 assert(file('server/game-core.mjs').includes('"CHEST_OPEN"'),'the account server accepts the action');
});

check('offerings: each oculus tier pays a few Primogems (150 in all), and earlier offerings are paid once when the save loads',()=>{
 assert.deepEqual({...api.offeringPrimogems},{TIER_1:10,TIER_2:20,TIER_FINAL:30,GEO_TIER_1:20,GEO_TIER_2:30,GEO_TIER_FINAL:40});
 assert.equal(Object.values(api.offeringPrimogems).reduce((a,b)=>a+b,0),150);
 const g=world('MAP_MOND_WINDRISE');g.s.global.LAST_COMMITTED_ACTION_SEQ=Math.max(1,g.s.global.LAST_COMMITTED_ACTION_SEQ);
 const e=g.ensureExplorationState();for(const p of c.CRPGWorldContent.oculi.slice(0,4)){e.visitedMaps[p.map]=true;e.oculi[p.id]={map:p.map,day:1,action:g.s.global.SAVE_ID+':1'};g.giveItem('KEY_CRPG_ANEMOCULUS',1);}
 assert.equal(g.oculusExchangeEntry().reward.primogem,10,'the offering card shows it');
 const before=Number(g.s.global.PRIMOGEM)||0,out=g.action('OCULUS_OFFER',{tier:'TIER_1'});
 assert.equal((Number(g.s.global.PRIMOGEM)||0)-before,10);assert.equal(out.result.primogem,10);
 const R=g.constructor,s=JSON.parse(g.serialize());delete s.offeringPrimogems;s.global.PRIMOGEM=5;
 const loaded=new R(g.db,s,true);assert.equal(loaded.s.global.PRIMOGEM,15,'paid once for the offering made before this version');
 assert.equal(new R(g.db,JSON.parse(loaded.serialize()),true).s.global.PRIMOGEM,15,'and never twice');
});

check('abyss seasons: a season is a calendar month in Korea; a finished season goes to the history and the floors start over',()=>{
 const S=api.abyssSeason;
 assert.equal(S.of(Date.UTC(2026,8,30,14,59,59)),'ABYSS_2026_09');assert.equal(S.of(Date.UTC(2026,8,30,15,0,0)),'ABYSS_2026_10','midnight 1 October in Korea');
 assert.equal(S.previous('ABYSS_2026_01'),'ABYSS_2025_12');assert.equal(S.next('ABYSS_2026_12'),'ABYSS_2027_01');assert.equal(S.label('ABYSS_2026_10'),'2026년 10월 시즌');
 assert.equal(S.end('ABYSS_2026_09'),Date.UTC(2026,8,30,15,0,0));
 const now=advance(0),season=S.of(now),prev=S.previous(season);
 const g=world();g.ensureAbyss();Object.assign(g.s.abyss,{season:prev,clears:{9:{rounds:20},10:{rounds:24}},claimed:{9:true},tags:{MOND_AMBER:10},attempts:3});
 const v=g.abyssView();assert.equal(v.season,season);assert.equal(v.floors.find(f=>f.floor===10).cleared,false,'floors start over');
 assert.equal(v.floors.find(f=>f.floor===10).owed,true,'a first-clear reward not yet taken stays claimable');
 assert.deepEqual(plain(v.history.map(h=>[h.season,h.floor])),[[prev,10]]);assert.deepEqual(plain(v.medals.map(m=>[m.season,m.floor])),[[prev,10]],'one 나선 문장 for that season');
 assert.equal(g.s.abyss.season,prev,'looking does not change the save');
 g.abyssRoll();assert.equal(g.s.abyss.season,season);assert.deepEqual(plain(g.s.abyss.tags),{},'marks start over');assert.deepEqual(plain(g.s.abyss.owed),[10]);
 const legacy=world();legacy.ensureAbyss();Object.assign(legacy.s.abyss,{season:'ABYSS_01',clears:{3:{rounds:9}}});
 assert.equal(legacy.abyssView().floors.find(f=>f.floor===3).cleared,true,'progress from before seasons carries into the first real season');
 return {season,prev};
});

check('나선 문장: the Spiral Abyss crest in three metals, and no 훈장 left on screen',()=>{
 for(const f of [10,11,12])assert(fs.statSync(path.join(root,'assets/icons/abyss/crest_'+f+'.webp')).size>1000,'crest '+f);
 for(const f of ['app_profile_v01415.js','app_chat.js','app_abyss.js','app_trade.js','app_handbook.js','runtime_abyss.js'])
  assert(!/['"`][^'"`\n]*훈장[^'"`\n]*['"`]/.test(src(f)),f+' shows no 훈장');
 assert(src('app_profile_v01415.js').includes("'assets/icons/abyss/crest_'+f+'.webp'"));
 assert(src('app_chat.js').includes("'나선 문장 '+m.medals+'개"),'the chat names it');
 const css=src('shell.css');
 assert(css.includes('.pf-head,.deal-head,.ch-head,.trade-head{height:auto;min-height:0}'),'panel headers are not the 66px page bar on phones');
 assert(css.includes('.ch-stage,.ch-rays,.ch-glow,.ch-mote,.ch-flash,.ch-spark{pointer-events:none}'),'the chest light never takes the press meant for 「상자 열기」');
 assert(css.includes('.ch-overlay :is(.ch-btn,.sd-cell,.sd-num,.slate,.tile){display:inline-flex;align-items:center;justify-content:center'),'sudoku digits sit in the middle of their cells');
});

check('place pictures: every Mond and Liyue place has its own official picture, and new areas no longer borrow a parent\'s',()=>{
 const man=JSON.parse(file('content/asset-manifest.json')),g=world(),missing=[];
 for(const r of g.rows('32_MAP_DB')){if(!r||!/^MAP_/.test(r[0])||!['몬드','리월'].includes(r[1]))continue;const m=man.maps[r[0]];if(!m?.asset_id||!man.assets[m.asset_id])missing.push(r[0]);}
 assert.deepEqual(missing,[]);
 const placed=Object.entries(man.assets).filter(([id])=>id.startsWith('ASSET_BG_PLACE_'));assert.equal(placed.length,60);
 for(const [id,a] of placed){assert(fs.existsSync(path.join(root,'assets',a.file_name.replace(/\.png$/,'.webp'))),id);assert.match(a.source_metadata.source_page,/^https:\/\/genshin-impact\.fandom\.com\/wiki\//);assert.match(a.sha256,/^[0-9a-f]{64}$/);}
 assert.equal(man.maps.MAP_MOND_PLAINS.asset_id,'ASSET_BG_PLACE_STARFELL_VALLEY','the plains no longer show the lake');
 assert.equal(man.maps.MAP_CRPG_STARFELL_LAKE.asset_id,'ASSET_BG_MONDSTADT_STARFELL_LAKE_01','the lake picture is on the lake');
 assert.equal(man.maps.MAP_MOND_EAGLES_GATE.asset_id,'ASSET_BG_PLACE_EAGLES_GATE');assert.equal(man.maps.MAP_LY_DETAIL_CHASM_RIM.asset_id,'ASSET_BG_PLACE_CHASM_MAW','the surface mine road shows the surface');
 assert(file('tools/build.py').includes("if maps.get(area['id'],{}).get('url'):continue"),'a new area keeps its own picture');
 assert(fs.existsSync(path.join(root,'assets/PLACE_PHOTOS_KO.md')));
 return {pictures:placed.length};
});

const out=path.join(root,'reports/v01415');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'runtime-tests.json'),JSON.stringify({version:'0.14.15',total:results.length,passed:results.filter(r=>r.ok).length,results},null,1));
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length}));
