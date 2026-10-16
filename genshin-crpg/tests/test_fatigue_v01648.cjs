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
const kstAt=(day,hour)=>day*86400000-9*3600000+hour*3600000;

// 0.16.49 (user: 「방어력이나 공격력같은것에 비경들에만 영향을 미치게 하는게 낫지 않을까」 → 「비경 안 공격력·방어력」): 피로 lowers ATK and DEF
// in domain fights only, and leaves HP alone.
const statsOf=b=>Object.fromEntries(b.actors.filter(a=>a.side==='ALLY').map(a=>[a.source,[a.atk,a.def,a.maxHp]]));
check('a domain fight leaves every member who fought one 피로; each takes 15% off ATK and DEF in later domain fights, not HP',()=>{
 const r=domain();const fresh=statsOf(enter(r));assert.equal(S(r).fatigueRevision,2);const out=win(r);
 assert.deepEqual(plain(Object.keys(out.fatigue.stacks).sort()),plain(ids(r).sort()));assert.equal(out.fatigue.perStack,.15);assert.equal(out.fatigue.max,4);
 for(const id of ids(r))assert.equal(r.fatigueStacks(id),1,id);
 assert.equal(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).fatigue.stacks[PLAYER],1,'the result screen gets it');
 const hp=hpOf(r,PLAYER);r.s.global.PLAYER_HP_CURRENT=r.player().maxHp;r.action('MENU',{screen:'STATUS'});assert.equal(r.s.global.PLAYER_HP_CURRENT,r.player().maxHp,'HP outside a fight is not capped');void hp;
 const b=enter(r),tired=statsOf(b),me=b.actors.find(a=>a.source===PLAYER);assert.equal(me.fatigue,1);
 for(const id of ids(r)){assert.equal(tired[id][0],Math.max(1,Math.round(fresh[id][0]*.85)),id+' ATK');assert.equal(tired[id][1],Math.round(fresh[id][1]*.85),id+' DEF');assert.equal(tired[id][2],fresh[id][2],id+' max HP untouched');}
 win(r);for(let i=0;i<4;i++){enter(r);win(r);}for(const id of ids(r))assert.equal(r.fatigueStacks(id),4,'never past 4');
 const last=enter(r).actors.find(a=>a.source===PLAYER);assert.equal(last.fatigue,4);assert.equal(last.atk,Math.max(1,Math.round(fresh[PLAYER][0]*.4)),'it adds up: 4 → −60%');
});

check('피로 adds up: 1–4 take 15 · 30 · 45 · 60% off ATK and DEF',()=>{
 const r=domain();const fresh=statsOf(enter(r))[PLAYER];win(r);
 for(let n=1;n<=4;n++){const me=statsOf(enter(r))[PLAYER];assert.equal(me[0],Math.max(1,Math.round(fresh[0]*(1-.15*n))),'ATK 피로 '+n);assert.equal(me[1],Math.round(fresh[1]*(1-.15*n)),'DEF 피로 '+n);win(r);}
});

check('field fights, bosses, ley lines, the abyss, raids, co-op and the story are not touched by 피로 and leave none',()=>{
 const p=domain();p.startBattle('EG_LEY_MOND_PLAINS','EXPLICIT');const plainStats=statsOf(S(p));win(p);assert.equal(p.fatigueStacks(PLAYER),0,'a field fight leaves none');
 const r=domain();
 enter(r);win(r);enter(r);win(r);assert.equal(r.fatigueStacks(PLAYER),2);
 r.startBattle('EG_LEY_MOND_PLAINS','EXPLICIT');const b=S(r);assert.equal(b.fatigueRevision,undefined,'only a domain fight carries the marker');assert.deepEqual(statsOf(b),plainStats,'a tired party fights the field at full strength');assert(b.actors.every(a=>a.fatigue===undefined));win(r);
 const o=domain();enter(o);delete S(o).fatigueRevision;win(o);assert.equal(o.fatigueStacks(PLAYER),0,'a domain fight saved by 0.16.47');
 const t=src('source/runtime_reading.js');assert.match(t,/b\.coop&&!b\.storyConfig&&!b\.abyss&&!b\.raid/);
});

// 0.16.49 (user: 「쉬운 재료 갖다가 요리 두개 양산해서 쓰면 60레벨로 그냥 다 해먹을 수 있을거 아니야?」 → 「레벨에 맞는 요리만」): a dish clears
// 피로 only when its rare ingredients are enough for the eater's level.
const byName=(r,name)=>{for(const [id,row] of r.tables['14_ITEM_DB'])if(row[1]===name)return id;throw Error('no dish '+name);};
check('a recovery dish clears 피로 only when its ingredients are rare enough for the eater\'s level',()=>{
 const r=domain();const dishes=[...r.tables['14_ITEM_DB'].keys()].filter(id=>{try{return !!r.foodSpec(id,{}).heal;}catch{return false;}});assert(dishes.length>=40);
 // Easy ingredients add nothing: 34 dishes score 0; 사과·일몰 열매·죽순·연꽃받침·절운고추 score 1 a piece, 송이버섯·금어초·솔방울 2.
 assert.equal(r.foodRarity(byName(r,'티바트 달걀 프라이')),0);assert.equal(r.foodRarity(byName(r,'버섯피자')),0,'many easy ingredients still score 0');
 assert.equal(r.foodRarity(byName(r,'고기볶음')),1);assert.equal(r.foodRarity(byName(r,'몬드 감자전')),6);assert.equal(r.foodRarity(byName(r,'채식 전복')),8);
 assert(dishes.filter(id=>r.foodRarity(id)===0).length>=30);
 const at=(level,name)=>{const x=domain(level,level<=20?'CECILIA_GARDEN:20':level<=40?'LIANSHAN_FORMULA:40':'LIANSHAN_FORMULA:60');return x.foodFatigueClear(byName(x,name),PLAYER);};
 // Lv20 or lower: any recovery dish clears 1 (more for rarer); Lv21–40 needs 1; Lv41+ needs 2.
 assert.equal(at(20,'티바트 달걀 프라이'),1);assert.equal(at(40,'티바트 달걀 프라이'),0);assert.equal(at(60,'티바트 달걀 프라이'),0,'an easy dish does nothing at Lv60');
 assert.equal(at(40,'고기볶음'),1);assert.equal(at(60,'고기볶음'),0);assert.equal(at(60,'만족의 기쁨'),1);assert.equal(at(60,'몬드 감자전'),3);assert.equal(at(60,'채식 전복'),4);assert.equal(at(20,'몬드 감자전'),4);
 const hi=domain(60,'LIANSHAN_FORMULA:60');assert.equal(dishes.filter(id=>hi.foodFatigueClear(id,PLAYER)>0).length,7,'seven dishes are hard enough at Lv41+');
 // Eating: a hard-enough dish clears; an easy one heals HP and leaves 피로.
 const x=domain(60,'LIANSHAN_FORMULA:60');for(let i=0;i<3;i++){enter(x);win(x);}assert.equal(x.fatigueStacks(PLAYER),3);
 const egg=byName(x,'티바트 달걀 프라이'),cake=byName(x,'몬드 감자전');x.giveItem(egg,1);x.giveItem(cake,1);x.s.global.PLAYER_HP_CURRENT=1000;
 assert.deepEqual(plain(x.fatigueMealCap(PLAYER,egg)),{clear:0,left:3});const e=x.action('USE_ITEM',{item:egg,quantity:1,owner:PLAYER}).result;assert.equal(x.fatigueStacks(PLAYER),3);assert(x.s.global.PLAYER_HP_CURRENT>1000,'it still heals');assert.equal(e.meals[0].fatigueCleared,0);
 assert.deepEqual(plain(x.fatigueMealCap(PLAYER,cake)),{clear:3,left:0});const c=x.action('USE_ITEM',{item:cake,quantity:1,owner:PLAYER}).result;assert.equal(x.fatigueStacks(PLAYER),0);assert.equal(c.meals[0].fatigueCleared,3);
 // A tired member at full HP may eat a dish that eases 피로 (HP stays full); an easy dish is still refused at full HP.
 const y=domain(60,'LIANSHAN_FORMULA:60');enter(y);win(y);enter(y);win(y);y.s.global.PLAYER_HP_CURRENT=y.player().maxHp;y.giveItem(cake,1);y.giveItem(egg,1);const left=y.itemCount(cake);
 assert.throws(()=>y.action('USE_ITEM',{item:egg,quantity:1,owner:PLAYER}),/가득 찬/);y.action('USE_ITEM',{item:cake,quantity:1,owner:PLAYER});assert.equal(y.fatigueStacks(PLAYER),0);assert.equal(y.s.global.PLAYER_HP_CURRENT,y.player().maxHp);assert.equal(y.itemCount(cake),left-1);
});

// 0.16.48 (user: 「비경에 참가 캐릭터 말고도 다른 캐릭터들도 경험치를 받는 버그」): the 25% every owned character outside the fight got is gone.
check('only the characters who fought get battle experience',()=>{
 // Lv36 (under the Lv40 cap) so the fighters' experience shows.
 const r=domain(36,'ZHOU_FORMULA:35');r.serverAdmin=true;r.adminApply({op:'recruit',char:'MOND_KAEYA'});assert(!ids(r).includes('MOND_KAEYA'));
 const before=r.growth('MOND_KAEYA').xp,lv=r.growth('MOND_KAEYA').level,mine=r.growth(PLAYER).xp+r.growth(PLAYER).level*1e9;enter(r);const out=win(r);
 assert(out.xp>0);assert.equal(r.growth('MOND_KAEYA').xp,before);assert.equal(r.growth('MOND_KAEYA').level,lv);assert(r.growth(PLAYER).xp+r.growth(PLAYER).level*1e9>mine,'the fighters still get it');
 const field=domain();field.adminApply({op:'recruit',char:'MOND_KAEYA'});const k=field.growth('MOND_KAEYA').xp;field.startBattle('EG_LEY_MOND_PLAINS','EXPLICIT');win(field);assert.equal(field.growth('MOND_KAEYA').xp,k,'a field fight too');
 assert(!/경험치 25%/.test(src('source/app_tutorial.js')));
});

check('an inn stay clears all 피로 and heals to full',()=>{
 const r=domain();enter(r);win(r);enter(r);win(r);r.s.global.MORA+=100000;
 const inn=r.placeCatalog().find(p=>p.kind==='FACILITY'&&p.merchant==='MRC_LIYUE_INN');Object.assign(r.s.global,{CURRENT_MAP_ID:inn.maps[0],SCREEN_MODE:'LOCATION'});r.s.placeVisit=null;
 r.action('PLACE_ENTER',{place:inn.place||inn.id,mode:'SHOP'});const before=r.s.global.MORA;r.action('BUY',{stock:'STK_INN_LIYUE',quantity:1});assert(r.s.global.MORA<before);
 for(const id of ids(r)){assert.equal(r.fatigueStacks(id),0,id);assert.equal(hpOf(r,id),maxOf(r,id),id+' full');}
 assert.equal(r.s.fatigue?.stacks&&Object.keys(r.s.fatigue.stacks).length||0,0);
});

check('a defeat outside the story no longer heals for free: the party stands up at 30% HP in a safe town',()=>{
 const r=domain();enter(r);win(r);enter(r);for(const a of S(r).actors.filter(x=>x.side==='ALLY'))a.hp=0;r.finishBattle(false);
 if(r.defeatLockRemaining?.())r.s.defeatPenalty&&(r.s.defeatPenalty.until=0);
 assert(r.needsRecovery());r.action('RECOVER');
 for(const id of ids(r))assert.equal(hpOf(r,id),Math.max(1,Math.ceil(maxOf(r,id)*.3)),id);
 assert.equal(r.s.global.SCREEN_MODE,'LOCATION');assert(r.row('32_MAP_DB',r.s.global.CURRENT_MAP_ID)[12]==='Y','a safe town');
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
 assert(!/runtime_fatigue/.test(html));const engine=[...html.matchAll(/<script src="(runtime[^"]*\.js)"/g)].map(x=>x[1]);assert.equal(engine.at(-1),'runtime_reading.js');assert.match(src('source/runtime_reading.js'),/P\.fatigueVersion=REVISION/);
 assert(html.indexOf('app_fatigue_v01648.js')>html.indexOf('app_gear.js'));assert.match(src('tools/build.py'),/'app_fatigue_v01648\.js'/);
});

console.log(passed+' passed');
