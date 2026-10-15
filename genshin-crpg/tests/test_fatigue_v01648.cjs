'use strict';
// 0.16.48 비경 피로 and the half-day 지맥의 꽃 (user, 2026-10-16: 「어떤 비경을 가더라도, 효율적 측면에서 반드시 돌아가거나 요리를 이용해서
// 회복을 해야한다」 → 「비경 피로」; 「지맥도 효율 좀 늘리고 하루에 두번만 할 수 있게 하자」 → 「0시에 계시의 꽃 부의 꽃 1번씩 돌 수 있고, 12시에
// 계시의 꽃 부의 꽃 1번씩 돌 수 있고」). Every action copies the save, so the checks read the save again after each action.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),H=require('../tools/audit_protagonist_v01618.cjs');
const ROOT=path.resolve(__dirname,'..'),env=H.load(ROOT),api=env.api,F=api.fatigueV01648,L=api.leyLines,src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const PLAYER='PLAYER_CUSTOM',TEAM=['MOND_AMBER','MOND_NOELLE','MOND_BARBARA'];
const plain=x=>JSON.parse(JSON.stringify(x)),S=r=>r.s.runtime,ids=r=>r.s.party.filter(p=>p.active).map(p=>p.source);
const hpOf=(r,id)=>id===PLAYER?r.s.global.PLAYER_HP_CURRENT:r.s.chars[id].hp,maxOf=(r,id)=>id===PLAYER?r.player().maxHp:r.character(id).maxHp;
const win=r=>{for(const a of S(r).actors.filter(x=>x.side==='ENEMY'))a.hp=0;return r.finishBattle(true);};
function domain(level=40,id='LIANSHAN_FORMULA:40'){const d=api.growthV01522.domains[id.split(':')[0]],r=H.setup(env,{level,team:TEAM,seed:717,map:d.map,route:'ROUTE_TRAVELER'});r.die=()=>50;r.random=()=>.5;r.domainId=id;return r;}
const enter=r=>{r.action('DOMAIN_START',{domain:r.domainId,element:'NEUTRAL'});if(S(r)?.opening?.state==='PENDING')r.action('COMBAT_BEGIN');return S(r);};
const dish=(r,grade)=>{for(const [id,row] of r.tables['14_ITEM_DB']){if(row[3]!==grade)continue;let spec=null;try{spec=r.foodSpec(id,{});}catch{}if(spec?.heal)return id;}throw Error('no '+grade+' dish');};
const kstAt=(day,hour)=>day*86400000-9*3600000+hour*3600000;

check('a domain fight leaves every party member who fought one 피로; each takes 20% off max HP and the HP outside stays under it',()=>{
 const r=domain();enter(r);assert.equal(S(r).fatigueRevision,1);const out=win(r);
 assert.deepEqual(plain(Object.keys(out.fatigue.stacks).sort()),plain(ids(r).sort()));assert.equal(out.fatigue.perStack,.2);assert.equal(out.fatigue.max,4);
 for(const id of ids(r)){assert.equal(r.fatigueStacks(id),1,id);assert(hpOf(r,id)<=Math.round(maxOf(r,id)*.8),id+' HP under 80%');}
 assert.equal(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).fatigue.stacks[PLAYER],1,'the result screen gets it');
 // The next domain fight starts with 80% max HP, and each one more takes another 20% until 4.
 const b=enter(r),me=b.actors.find(a=>a.source===PLAYER);assert.equal(me.fatigue,1);assert.equal(me.maxHp,Math.round(r.player().maxHp*.8)||me.maxHp);assert(me.hp<=me.maxHp);
 win(r);for(let i=0;i<4;i++){enter(r);win(r);}for(const id of ids(r))assert.equal(r.fatigueStacks(id),4,'never past 4');
 const last=enter(r).actors.find(a=>a.source===PLAYER);assert.equal(last.fatigue,4);
});

check('a recovery dish clears 피로 by its grade (일반 1 · 고급 2 · 희귀 3 · 전설 4) as it heals, and heals only up to the max that is left',()=>{
 assert.deepEqual(plain(F.clear),{'일반':1,'고급':2,'희귀':3,'전설':4});
 const r=domain();for(let i=0;i<3;i++){enter(r);win(r);}assert.equal(r.fatigueStacks(PLAYER),3);
 const item=dish(r,'고급');r.giveItem(item,2);const cap=r.fatigueMealCap(PLAYER,item);assert.deepEqual([cap.clear,cap.left],[2,1]);assert.equal(cap.cap,Math.round(r.player().maxHp*.8));
 const res=r.action('USE_ITEM',{item,quantity:1,owner:PLAYER}).result;assert.equal(r.fatigueStacks(PLAYER),1);assert(hpOf(r,PLAYER)<=cap.cap,'HP stays under the max the dish leaves');
 assert.equal(res.meals[0].fatigueCleared,2);assert.equal(res.meals[0].fatigueLeft,1);
 assert.equal(r.foodFatigueClear(dish(r,'일반')),1);
});

check('an inn stay clears all 피로 and heals to the full max; its price counts the HP that 피로 holds back',()=>{
 const r=domain();enter(r);win(r);enter(r);win(r);const row=r.tables['19_SHOP_STOCK_DB'].get('STK_INN_LIYUE');
 const quote=r.innRecoveryQuote(row);assert(quote.cost>quote.roomCost,'tired HP is lost HP for the inn');
 r.s.global.MORA+=100000;
 const inn=r.placeCatalog().find(p=>p.kind==='FACILITY'&&p.merchant==='MRC_LIYUE_INN');Object.assign(r.s.global,{CURRENT_MAP_ID:inn.maps[0],SCREEN_MODE:'LOCATION'});r.s.placeVisit=null;
 r.action('PLACE_ENTER',{place:inn.place||inn.id,mode:'SHOP'});const before=r.s.global.MORA;r.action('BUY',{stock:'STK_INN_LIYUE',quantity:1});assert(r.s.global.MORA<before);
 for(const id of ids(r)){assert.equal(r.fatigueStacks(id),0,id);assert.equal(hpOf(r,id),maxOf(r,id),id+' full');}
 assert.equal(r.s.fatigue?.stacks&&Object.keys(r.s.fatigue.stacks).length||0,0);
});

check('a defeat outside the story no longer heals for free: the party stands up at 30% of its tired max HP in a safe town',()=>{
 const r=domain();enter(r);win(r);enter(r);for(const a of S(r).actors.filter(x=>x.side==='ALLY'))a.hp=0;r.finishBattle(false);
 if(r.defeatLockRemaining?.())r.s.defeatPenalty&&(r.s.defeatPenalty.until=0);
 assert(r.needsRecovery());r.action('RECOVER');
 for(const id of ids(r)){const cap=Math.round(maxOf(r,id)*(1-.2*r.fatigueStacks(id)));assert.equal(hpOf(r,id),Math.max(1,Math.ceil(cap*.3)),id);}
 assert.equal(r.s.global.SCREEN_MODE,'LOCATION');assert(r.row('32_MAP_DB',r.s.global.CURRENT_MAP_ID)[12]==='Y','a safe town');
});

check('a level-up or any other heal outside a fight keeps a tired member under the lowered max',()=>{
 const r=domain();enter(r);win(r);const cap=r.fatigueMax(PLAYER);r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;
 r.action('MENU',{screen:'STATUS'});assert.equal(r.s.global.PLAYER_HP_CURRENT,cap);
});

check('field fights, ley lines, the abyss, raids, co-op and the story leave no 피로; fights saved before 0.16.48 neither',()=>{
 const r=domain();r.startBattle('EG_LEY_MOND_PLAINS','EXPLICIT');assert.equal(S(r).fatigueRevision,undefined,'only a domain fight carries the marker');win(r);assert.equal(r.fatigueStacks(PLAYER),0,'a field fight');
 const o=domain();enter(o);delete S(o).fatigueRevision;win(o);assert.equal(o.fatigueStacks(PLAYER),0,'a domain fight saved by 0.16.47');
 // A tired member still has the lowered max HP in a field fight (no marker needed: it is set once, at the start).
 const t2=domain();enter(t2);win(t2);t2.startBattle('EG_LEY_MOND_PLAINS','EXPLICIT');const me=S(t2).actors.find(a=>a.source===PLAYER);assert.equal(me.fatigue,1);assert.equal(S(t2).fatigueRevision,undefined);
 const t=src('source/runtime_reading.js');assert.match(t,/ABYSS:\|RAID\|STORY:/);assert.match(t,/b\?\.coop/);
});

check('the save rejects a broken 피로 record',()=>{
 const r=domain();enter(r);win(r);const bad=JSON.parse(r.serialize());bad.fatigue={version:1,stacks:{[PLAYER]:5}};
 assert.throws(()=>new api.Runtime(env.db,bad),/비경 피로/);const bad2=JSON.parse(r.serialize());bad2.fatigue={version:1,stacks:{NOBODY:1}};assert.throws(()=>new api.Runtime(env.db,bad2),/비경 피로/);
 const ok=JSON.parse(r.serialize());assert.equal(new api.Runtime(env.db,ok).fatigueStacks(PLAYER),1);
});

check('지맥의 꽃: two windows a day (Korean 0:00 and 12:00); each kind pays once in each, at twice the old payout',()=>{
 assert.equal(L.halfDayMs,12*3600000);const day=20500;assert.equal(L.windowOf(kstAt(day,0)),L.windowOf(kstAt(day,11)+3599999));assert.equal(L.windowOf(kstAt(day,12)),L.windowOf(kstAt(day,0))+1);
 const r=H.setup(env,{level:30,team:TEAM,seed:8,map:'MAP_MOND_PLAINS'});r.die=()=>50;r.random=()=>.5;
 // Find a morning on which the 계시의 꽃 is on the plains.
 let d=day;for(;d<day+400;d++){r.actionStartedAt=kstAt(d,1);if(r.leyLineStatus().blossoms.some(b=>b.kind==='REVELATION'&&b.map==='MAP_MOND_PLAINS'))break;}
 const st=r.leyLineStatus();assert.equal(st.nextAt,'12시');assert(st.minutesLeft>600&&st.minutesLeft<=660,'about 11 hours to 12시');
 Object.assign(r.s.global,{CURRENT_MAP_ID:'MAP_MOND_PLAINS',SCREEN_MODE:'LOCATION'});const id=L.route('REVELATION','MAP_MOND_PLAINS');
 assert.equal(r.placeBossReason(id,'DIRECT'),'');r.action('PLACE_ENTER',{place:'BOSS:'+id,mode:'BOSS'});r.action('BOSS_ROUTE',{route:id,entry:'DIRECT',tier:2});
 assert.equal(S(r).leyLine.version,3);assert.equal(S(r).leyLine.window,L.windowOf(kstAt(d,1)));if(S(r).opening?.state==='PENDING')r.action('COMBAT_BEGIN');
 const hero=r.itemCount('MAT_CHAR_EXP_HERO');const out=win(r);assert.equal(r.itemCount('MAT_CHAR_EXP_HERO')-hero,36,'18 → 36 books at step 2');assert.equal(out.leyLine.claimed,true);
 assert(r.leyLineClaimed('REVELATION'));
 r.actionStartedAt=kstAt(d,11);assert(r.leyLineClaimed('REVELATION'),'still this morning');assert.match(r.placeBossReason(id,'DIRECT')||'',/12시에 새 꽃/);
 r.actionStartedAt=kstAt(d,13);assert.equal(r.leyLineClaimed('REVELATION'),false,'the afternoon blossom pays again');assert.equal(r.leyLineStatus().nextAt,'0시');
 assert.deepEqual(plain(L.tiers.map(t=>t.books.MAT_CHAR_EXP_HERO)),[12,36,100,200,360]);assert.deepEqual(plain(L.tiers.map(t=>t.mora)),[3600,10000,28000,54000,80000]);
});

check('지맥의 꽃: a fight entered under the hourly rule keeps its payout; the screens say 0시·12시',()=>{
 const r=H.setup(env,{level:30,team:TEAM,seed:8,map:'MAP_MOND_PLAINS'});r.die=()=>50;r.random=()=>.5;Object.assign(r.s.global,{CURRENT_MAP_ID:'MAP_MOND_PLAINS',SCREEN_MODE:'LOCATION'});
 let d=20500;for(;d<20900;d++){r.actionStartedAt=kstAt(d,3);if(r.leyLineStatus().blossoms.some(b=>b.kind==='WEALTH'&&b.map==='MAP_MOND_PLAINS'))break;}
 const id=L.route('WEALTH','MAP_MOND_PLAINS');r.action('PLACE_ENTER',{place:'BOSS:'+id,mode:'BOSS'});r.action('BOSS_ROUTE',{route:id,entry:'DIRECT',tier:2});if(S(r).opening?.state==='PENDING')r.action('COMBAT_BEGIN');
 // As a 0.16.47 save would hold it: version 2, the hour only.
 const b=S(r);b.leyLine={version:2,kind:'WEALTH',route:id,map:'MAP_MOND_PLAINS',hour:Math.floor(r.actionStartedAt/3600000),tier:2,level:15};
 const mora=r.s.global.MORA,out=win(r);assert.equal(out.leyLine.mora,5000,'the old step-2 payout');assert(r.s.global.MORA-mora>=5000);assert.equal(r.s.leyLine.version,2);assert(r.leyLineClaimed('WEALTH'),'it uses up this half day');
 for(const f of ['source/app_ley_lines.js','source/app_handbook.js','source/runtime_ley_lines.js']){const t=src(f).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');assert(!/매시 정각|정각까지|이번 시간/.test(t),f+' still says hourly');}
 assert.match(src('source/app_ley_lines.js'),/0시·12시/);
 const bad=JSON.parse(r.serialize());bad.leyLine={version:3,REVELATION:1};assert.throws(()=>new api.Runtime(env.db,bad),/지맥의 꽃/);
});

check('the screens show 피로: a battle chip, a domain result strip, badges on the quick meal and the KO/inn rows',()=>{
 const ui=src('source/app_fatigue_v01648.js'),gear=src('source/app_gear.js'),html=src('source/index.html');
 assert.match(ui,/battleStatusList=function/);assert.match(ui,/fatigue-strip/);assert.match(gear,/CRPGFatigueBadge\?\.\(id,why\?0:clear\)/);assert.match(gear,/fatigueMealCap/);assert.match(gear,/HP 30%로 일어나고/);
 // The rules sit at the end of the last engine file (runtime_reading.js), so the engine file list stays the same.
 assert(!/runtime_fatigue/.test(html));const engine=[...html.matchAll(/<script src="(runtime[^"]*\.js)"/g)].map(x=>x[1]);assert.equal(engine.at(-1),'runtime_reading.js');assert.match(src('source/runtime_reading.js'),/P\.fatigueVersion=1/);
 assert(html.indexOf('app_fatigue_v01648.js')>html.indexOf('app_gear.js'));assert.match(src('tools/build.py'),/'app_fatigue_v01648\.js'/);
});

console.log(passed+' passed');
