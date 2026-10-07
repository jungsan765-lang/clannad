'use strict';
// Native public actions exercise acceptance/reporting and successful work. Enemy HP is settled by these
// fixtures to isolate task bookkeeping; combat balance remains covered by its separate native-play tests.
const assert=require('node:assert/strict');
const {fresh,R,db,c,advance}=require('./helpers_v011.cjs');
const copy=x=>JSON.parse(JSON.stringify(x)),C=c.CRPGTaskCatalogV0168,T=c.CRPGRuntime.tasksV0168,DAY=86400000;
let passed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
function leave(r){if(r.s.placeVisit)r.action('PLACE_LEAVE',{});}
function guild(r){leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});}
function level(r,n=30){r.adminApply({op:'level',target:'ALL',value:n});}
function roster(r,ids){const own=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON||'{}');for(const id of ids)own[id]={state:'JOINED'};r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);r.s.party=[{slot:'PARTY_1',type:'PLAYER',source:'PLAYER_CUSTOM',control:'PLAYER',active:true,tactic:'균형'},...Array.from({length:3},(_,i)=>ids[i]?{slot:'PARTY_'+(i+2),type:'CHAR',source:ids[i],control:'AI',active:true,tactic:'균형'}:{slot:'PARTY_'+(i+2),active:false})];r.s.formation=r.s.party.filter(p=>p.active).map(p=>p.source);for(const id of ids)r.s.chars[id].hp=r.character(id).maxHp;}
function battle(r,map='MAP_MOND_PLAINS',settle=true){leave(r);r.s.global.CURRENT_MAP_ID=map;r.action('MENU',{screen:'LOCATION'});r.startBattle('EG_MOND_HILI_PATROL','RANDOM');const b=r.s.runtime;assert(b,'native battle started');if(settle){for(const a of b.actors)if(a.side==='ENEMY')a.hp=0;r.finishBattle(true);}return b;}
function gather(r,inputs=true){leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';r.action('LIFE_START',{kind:'GATHER'});const j=r.s.lifeJob,scene=r.lifeScene(j);advance(j.duration+100);const picks=inputs?scene.nodes.map((n,i)=>({at:600+i*300,node:i})):[];return r.action('LIFE_FINISH',{job:j.id,elapsed:j.duration,inputs:picks}).result;}
function accept(r,id){guild(r);return r.action('COMMISSION_ACCEPT',{quest:id});}
function report(r,id){guild(r);return r.action('CLAIM_QUEST',{quest:id});}
function legacyDaily(r,ids){const old=c.CRPGRuntime.tasksV0167,box=r.tasksBox(true);r.s.tasks={version:1,day:old.dayOf(r.tasksNow()),week:old.weekOf(r.tasksNow()),daily:{},weekly:copy(box.weekly),claimed:{},dailyIds:ids};r.tasksBox(true);}
function currentDaily(r,ids){const box=r.tasksBox(true),lv=Number(r.s.global.PLAYER_LEVEL_STATE)||1;box.dailyIds=ids;box.dailyProgress={};box.dailyDefinitions=Object.fromEntries(ids.map(id=>{const t=T.daily.find(t=>t.id===id);assert(t);return[id,{...copy(t),reward:c.CRPGRuntime.tasksV0169.rewardAt(t,lv),assignedLevel:lv,revision:169,individual:true}];}));r.validateSave(copy(r.s));}

check('일일 후보12·주간 후보24 이상: 최대20개 주간 목표와 240개 기본 연속 의뢰',()=>{
 assert(C&&C.legacyChains.length===240&&C.chains.length===288&&C.daily.length===8&&C.weekly.length===27&&T.daily.length===12&&T.weekly.length===31);
 const ids=[...C.chains,...C.daily,...C.weekly].map(t=>t.id);assert.equal(new Set(ids).size,ids.length);
 assert(C.chains.some(t=>t.reward.primogem>=300),'finite chain finales have substantial one-time rewards');assert(C.daily.every(t=>!t.reward.primogem));assert(C.weekly.some(t=>t.reward.primogem>0),'weekly targets have distinct Primogem priorities');
 const r=fresh();const offered=r.commissionEntries().filter(q=>q.row[0].startsWith('Q_TASK_'));
 assert(offered.length>0&&offered.length<=C.families.length,'hundreds are not offered together');
 for(const q of offered){const def=C.chains.find(t=>t.id===q.row[0]);assert.equal(def.predecessor,'');assert(r.isCommission(def.id));assert.equal(q.definition.authorship,'CRPG_TASK_V0168');assert.deepEqual(copy(q.definition.choices),[]);}
 assert.equal(r.taskView().daily.length,4);assert(r.taskView().weekly.length>4&&r.taskView().weekly.length<=20);assert.equal(r.taskView().bonus.id,'D_BONUS');assert.equal(r.taskView().weeklyBonus.reward.primogem,200);
});

check('accepted objective starts at zero; real qualifying victory and report reveal its successor once',()=>{
 const r=fresh();level(r);const id='Q_TASK_MOND_PATROL_01',next='Q_TASK_MOND_PATROL_02';battle(r);assert(!r.s.quests[id],'past wins are not credited');
 accept(r,id);assert.equal(r.s.quests[id].taskObjective.progress,0);assert.throws(()=>r.action('QUEST_CHOICE',{quest:id,choice:'careful'}),/실제|수락|승리/);
 assert.throws(()=>r.action('CLAIM_QUEST',{quest:id}),/목표 활동/);assert(!r.questVisible(next));
 leave(r);r.action('WAIT',{minutes:1});assert.equal(r.s.quests[id].taskObjective.progress,0,'waiting is not a victory');
 battle(r,'MAP_MOND_FOREST');assert.equal(r.s.quests[id].taskObjective.progress,0,'wrong map is not credited');battle(r);assert.equal(r.s.quests[id].node,'READY_TO_CLAIM');
 const before=copy(r.s.tasks.daily);r.finishBattle(true);assert.deepEqual(copy(r.s.tasks.daily),before,'settlement replay without a battle counts nothing');
 assert(!r.questVisible(next),'completion alone does not reveal the successor');const primo=r.s.global.PRIMOGEM,mora=r.s.global.MORA;report(r,id);
 assert(r.s.quests[id].claimed&&r.questVisible(next));assert(r.s.global.MORA>mora);assert.equal(r.s.global.PRIMOGEM,primo);
 assert.throws(()=>r.action('CLAIM_QUEST',{quest:id}),/이미/);accept(r,next);assert.equal(r.s.quests[next].taskObjective.progress,0,'new objective gets its own fresh counter');
 const restored=new R(db,copy(r.s));assert(restored.s.quests[id].claimed);assert.equal(restored.s.quests[next].taskObjective.progress,0);assert.equal(restored.taskView().daily.length,4);
});

check('named four-star companions use the actual four-person party captured at battle start',()=>{
 const r=fresh();level(r);const names=['MOND_AMBER','MOND_KAEYA','MOND_LISA'],wrong=['MOND_BARBARA','MOND_KAEYA','MOND_LISA'],id='Q_TASK_MOND_SQUADS_01';roster(r,names);accept(r,id);
 roster(r,wrong);battle(r);assert.equal(r.s.quests[id].taskObjective.progress,0,'a substituted named companion does not qualify');
 roster(r,names);const b=battle(r,'MAP_MOND_PLAINS',false);assert.equal(b.taskSnapshot.party[0].id,'PLAYER_CUSTOM');assert.equal(b.taskSnapshot.party.length,4);
 roster(r,wrong);for(const a of b.actors)if(a.side==='ENEMY')a.hp=0;r.finishBattle(true);assert.equal(r.s.quests[id].taskObjective.progress,1,'finish-time party changes cannot alter the start roster');
 roster(r,names);battle(r);assert.equal(r.s.quests[id].node,'READY_TO_CLAIM');r.validateSave(copy(r.s));
 const bad=copy(r.s);bad.quests[id].taskObjective.progress=1;assert.throws(()=>r.validateSave(bad),/임무 기록/);
});

check('element composition respects the fixed hero, rarity, all four members, and actual resonance',()=>{
 const r=fresh();level(r,40);roster(r,['MOND_SUCROSE','MOND_JEAN','MOND_VENTI']);assert(T.partyAchievable(r,{full:true,mono:'ANEMO'}));assert(!T.partyAchievable(r,{full:true,mono:'PYRO'}));
 assert(!T.partyAchievable(r,{full:true,mono:'GEO'}),'Geo must actually be unlocked');
 const p=[{id:'PLAYER_CUSTOM',element:'ANEMO',rarity:0},{id:'MOND_SUCROSE',element:'ANEMO',rarity:4},{id:'MOND_AMBER',element:'PYRO',rarity:4},{id:'MOND_BENNETT',element:'PYRO',rarity:4}];
 assert(T.partyMatch(p,{full:true,elementCounts:{ANEMO:2,PYRO:2},companionRarity:4}));assert(!T.partyMatch(p.slice(1),{full:true}));assert(!T.partyMatch(p.slice(0,3),{full:true}));
 assert(!T.partyMatch(p.map((m,i)=>i===3?{...m,rarity:5}:m),{full:true,companionRarity:4}));assert(!T.partyMatch(p.map((m,i)=>i===2?{...m,alive:false}:m),{full:true}));
 roster(r,['MOND_NOELLE','LIYUE_NINGGUANG','LIYUE_YUNJIN']);r.s.travelerElements={version:1,active:'GEO',unlocked:['ANEMO','GEO'],receipts:{GEO:{place:'EVT_CRPG_STATUE_GEO',day:r.s.global.WORLD_DAY,time:'12:00',turn:r.s.global.TURN}}};
 assert(T.partyAchievable(r,{full:true,mono:'GEO'}));const b=battle(r,'MAP_MOND_PLAINS',false);assert.equal(b.taskSnapshot.party.find(m=>m.id==='PLAYER_CUSTOM').element,'GEO');for(const a of b.actors)if(a.side==='ENEMY')a.hp=0;r.finishBattle(true);
 const isekai=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');roster(isekai,['MOND_SUCROSE','MOND_JEAN','MOND_VENTI']);assert(!T.partyAchievable(isekai,{full:true,mono:'ANEMO'}));
});

check('gathering counts newly acquired matching resources; inventory and empty work do not advance it',()=>{
 const r=fresh();level(r);const id='Q_TASK_MOND_GATHER_01';r.giveItem('ING_APPLE',99);accept(r,id);assert.equal(r.s.quests[id].taskObjective.progress,0);
 const empty=gather(r,false);assert(empty.empty);assert.equal(r.s.quests[id].taskObjective.progress,0);
 const out=gather(r,true),expected=Math.min(3,out.items.ING_APPLE||0);assert.equal(r.s.quests[id].taskObjective.progress,expected);assert(out.items&&Object.keys(out.items).length);
 const altered=copy(r.s);altered.quests[id].taskObjective.progress=4;assert.throws(()=>r.validateSave(altered),/임무 기록/);
});

check('cooking counts only successful paid CRAFT batches and blocks menu-choice completion',()=>{
 const r=fresh();level(r);const id='Q_TASK_COOKING_01';accept(r,id);leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';
 const kitchen=r.placeEntries().find(p=>p.entity==='SERVICE_MOND_COOK'&&p.modes.includes('CRAFT'));assert(kitchen);r.action('PLACE_ENTER',{place:kitchen.id,mode:'CRAFT'});
 assert.throws(()=>r.action('CRAFT',{recipe:'REC_FOOD_STEAK'}));assert.equal(r.s.quests[id].taskObjective.progress,0);r.giveItem('ING_RAW_MEAT',20);r.action('CRAFT',{recipe:'REC_FOOD_STEAK'});assert.equal(r.s.quests[id].node,'READY_TO_CLAIM');report(r,id);
 const next='Q_TASK_COOKING_02';accept(r,next);leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:kitchen.id,mode:'CRAFT'});r.giveItem('ING_FOWL',20);r.giveItem('ING_MUSHROOM',20);r.action('CRAFT',{recipe:'REC_FOOD_CHICKEN_SKEWER',quantity:2});assert.equal(r.s.quests[next].taskObjective.progress,2);assert.equal(r.s.quests[next].node,'READY_TO_CLAIM');
});

check('native DOMAIN_START preserves selected difficulty and type for filtered objectives',()=>{
 const r=fresh();level(r,20);r.s.flags.FLAG_TRV_MON_CH1_CLEAR=true;accept(r,'Q_TASK_TALENT_01');leave(r);
 legacyDaily(r,['D_WIN','D_LEY','D_V168_TALENT15','D_LIFE']);
 function win(map,kind,lv){r.s.global.CURRENT_MAP_ID=map;const d=r.growthDomainEntries().find(d=>d.kind===kind&&d.level===lv&&!d.reason);assert(d,'selected native domain is unlocked');r.action('DOMAIN_START',{domain:d.id,element:'NEUTRAL'});assert.equal(r.s.runtime.growthDomain.level,lv);for(const a of r.s.runtime.actors)if(a.side==='ENEMY')a.hp=0;r.finishBattle(true);}
 win('MAP_D163_VALLEY_OF_REMEMBRANCE','ASCENSION',15);assert.equal(r.s.quests.Q_TASK_TALENT_01.taskObjective.progress,0);assert.equal(r.taskView().daily.find(t=>t.id==='D_V168_TALENT15').progress,0);
 win('MAP_D163_FORSAKEN_RIFT','TALENT',10);assert.equal(r.s.quests.Q_TASK_TALENT_01.taskObjective.progress,1);assert.equal(r.taskView().daily.find(t=>t.id==='D_V168_TALENT15').progress,0,'below selected difficulty counts nothing');
 win('MAP_D163_FORSAKEN_RIFT','TALENT',15);assert.equal(r.taskView().daily.find(t=>t.id==='D_V168_TALENT15').progress,1);
});

check('native ley routes distinguish blossom type and chosen tier, and field bosses match their real ID',()=>{
 const r=fresh();level(r,30);accept(r,'Q_TASK_REVELATION_01');leave(r);legacyDaily(r,['D_WIN','D_V168_REVELATION15','D_DOMAIN','D_LIFE']);
 function blossom(kind,tier){leave(r);const site=r.leyLineStatus().blossoms.find(x=>x.region==='몬드'&&x.kind===kind);assert(site);r.s.global.CURRENT_MAP_ID=site.map;r.action('PLACE_ENTER',{place:'BOSS:'+site.route,mode:'BOSS'});r.action('BOSS_ROUTE',{route:site.route,entry:'DIRECT',tier});assert.equal(r.s.runtime.leyLine.kind,kind);for(const a of r.s.runtime.actors)if(a.side==='ENEMY')a.hp=0;r.finishBattle(true);}
 blossom('WEALTH',2);assert.equal(r.s.quests.Q_TASK_REVELATION_01.taskObjective.progress,0);assert.equal(r.taskView().daily.find(t=>t.id==='D_V168_REVELATION15').progress,0);
 blossom('REVELATION',1);assert.equal(r.s.quests.Q_TASK_REVELATION_01.taskObjective.progress,1);assert.equal(r.taskView().daily.find(t=>t.id==='D_V168_REVELATION15').progress,0);
 advance(3600000);blossom('REVELATION',2);assert.equal(r.taskView().daily.find(t=>t.id==='D_V168_REVELATION15').progress,1);
 accept(r,'Q_TASK_MOND_BOSSES_01');leave(r);const api=c.CRPGRuntime,route=api.fieldBosses.route('FB_ANEMO_HYPOSTASIS');r.s.global.CURRENT_MAP_ID=api.fieldBosses.bosses.FB_ANEMO_HYPOSTASIS.map;r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});r.action('BOSS_ROUTE',{route,entry:'DIRECT'});assert.equal(r.s.runtime.fieldBoss.boss,'FB_ANEMO_HYPOSTASIS');for(const a of r.s.runtime.actors)if(a.side==='ENEMY')a.hp=0;r.finishBattle(true);assert.equal(r.s.quests.Q_TASK_MOND_BOSSES_01.taskObjective.progress,1);
});

check('native Abyss room victories count their actual floor and all three rooms precede reporting',()=>{
 const r=fresh();level(r,20);roster(r,['MOND_AMBER','MOND_KAEYA','MOND_LISA']);accept(r,'Q_TASK_ABYSS_01');leave(r);r.s.global.CURRENT_MAP_ID='MAP_V141_MUSK_REEF';
 for(let room=1;room<=3;room++){r.action('ABYSS_ENTER',{floor:1});assert.equal(r.s.runtime.abyss.floor,1);assert.equal(r.s.runtime.abyss.chamber,room);for(const a of r.s.runtime.actors)if(a.side==='ENEMY')a.hp=0;r.finishBattle(true);assert.equal(r.s.quests.Q_TASK_ABYSS_01.taskObjective.progress,room);if(room<3)assert.equal(r.s.quests.Q_TASK_ABYSS_01.node,'INVESTIGATE');}
 assert.equal(r.s.quests.Q_TASK_ABYSS_01.node,'READY_TO_CLAIM');assert(r.s.abyss.clears[1]);report(r,'Q_TASK_ABYSS_01');assert(r.s.quests.Q_TASK_ABYSS_01.claimed);
});

check('saved rotations are deterministic, eligible, four rows, retain budgets, and ignore WORLD_DAY changes',()=>{
 const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');r.taskView();const old=copy(r.s.tasks);r.advanceTime(1440);assert.deepEqual(copy(r.taskView().daily.map(t=>t.id)),old.dailyIds,'game-day waiting cannot refresh real daily rewards');
 advance(DAY);const view=r.taskView(),ids=copy(view.daily.map(t=>t.id)),saved=copy(r.s);assert.equal(ids.length,4);assert.equal(new Set(ids).size,4);assert(view.daily.every(t=>!t.lock),'a beginner rotation has four achievable assignments');
 assert(!ids.some(id=>C.daily.find(t=>t.id===id)?.filter?.party?.mono),'isekai receives no impossible mono-element assignment');
 assert.deepEqual(copy(r.taskView().daily.map(t=>t.id)),ids);level(r,60);assert.deepEqual(copy(r.taskView().daily.map(t=>t.id)),ids,'level/roster changes cannot reroll the saved day');
 const restored=new R(db,saved);assert.deepEqual(copy(restored.taskView().daily.map(t=>t.id)),ids);
 assert.equal(view.daily.reduce((n,t)=>n+(t.reward.primogem||0),0)+(view.bonus.reward.primogem||0),20);
 assert(view.weekly.length>4&&view.weekly.length<=20);assert.equal(view.weeklyBonus.reward.primogem,200);const budget=copy(view.daily.map(t=>t.reward));assert.deepEqual(copy(restored.taskView().daily.map(t=>t.reward)),budget,'the saved assignment keeps its original reward bracket after level changes');
 const bad=copy(saved);bad.tasks.dailyIds=['D_V168_MONO','D_V168_MONO','D_DOMAIN','D_LIFE'];assert.throws(()=>r.validateSave(bad),/임무 기록/);
 const badFuture=copy(saved);badFuture.tasks.day+=20;assert.throws(()=>r.validateSave(badFuture),/임무 기록/);
});

check('새 일일 비경은 열린 단계 모두 집계하고 일반 채집은 획득 개수가 아닌 성공 행동 3번을 요구한다',()=>{
 const r=fresh();level(r,20);currentDaily(r,['D_WIN','D_LEY','D_V168_TALENT15','D_V168_APPLE']);
 leave(r);r.s.global.CURRENT_MAP_ID='MAP_D163_FORSAKEN_RIFT';
 for(const lv of [5,10]){const d=r.growthDomainEntries().find(d=>d.kind==='TALENT'&&d.level===lv&&!d.reason);assert(d);r.action('DOMAIN_START',{domain:d.id,element:'NEUTRAL'});for(const a of r.s.runtime.actors)if(a.side==='ENEMY')a.hp=0;r.finishBattle(true);}
 assert.equal(r.taskView().daily.find(t=>t.id==='D_V168_TALENT15').progress,2,'both lower open stages count');
 const empty=gather(r,false);assert(empty.empty);assert.equal(r.taskView().daily.find(t=>t.id==='D_V168_APPLE').progress,0);
 for(let n=1;n<=3;n++){const out=gather(r,true);assert(Object.values(out.items).reduce((a,b)=>a+b,0)>0);assert.equal(r.taskView().daily.find(t=>t.id==='D_V168_APPLE').progress,n);}
 assert(r.taskView().daily.find(t=>t.id==='D_V168_APPLE').done);r.validateSave(copy(r.s));
});

check('보유 원소 목표는 하루 동안 고정하고 다음 날 다른 보유 원소 조합으로 바뀐다',()=>{
 const r=fresh();level(r,20);roster(r,['MOND_AMBER','MOND_KAEYA','MOND_LISA']);advance(DAY);const first=r.taskView();
 const id='D_V168_PYRO_HYDRO',def=copy(r.s.tasks.dailyDefinitions[id]);assert(def?.selectedElements?.length);
 const options=copy(c.CRPGRuntime.tasksV0169.elementalChoices(r));assert(options.some(x=>JSON.stringify(x)===JSON.stringify(def.selectedElements)));
 assert.deepEqual(copy(r.taskView().daily.find(t=>t.id===id)),copy(first.daily.find(t=>t.id===id)));
 const saved=copy(r.s),loaded=new R(db,saved);assert.deepEqual(copy(loaded.s.tasks.dailyDefinitions[id]),def);
 advance(DAY);loaded.taskView();assert.notDeepEqual(copy(loaded.s.tasks.dailyDefinitions[id].selectedElements),def.selectedElements);r.validateSave(copy(r.s));
});

check('an action started before reset cannot finish a newly assigned objective retroactively',()=>{
 const r=fresh();level(r);r.taskView();const b=battle(r,'MAP_MOND_PLAINS',false),before=b.taskSnapshot.day;advance(DAY);r.taskView();assert.notEqual(r.s.tasks.day,before);for(const a of b.actors)if(a.side==='ENEMY')a.hp=0;r.finishBattle(true);
 assert(!r.s.tasks.daily.win);assert(Object.values(r.s.tasks.dailyProgress||{}).every(n=>n===0));
 advance(7*DAY);const v=r.taskView();assert(v.daily.every(t=>t.progress===0&&!t.claimed));assert(v.weekly.every(t=>t.progress===0&&!t.claimed));
 const legacy=fresh(),sv=copy(legacy.s),now=c.CRPGRuntime.tasksV0167;sv.tasks={version:1,day:now.dayOf(legacy.tasksNow()),week:now.weekOf(legacy.tasksNow()),daily:{win:2},weekly:{win:7},claimed:{D_LIFE:1}};const loaded=new R(db,sv);
 assert.equal(loaded.taskView().daily.find(t=>t.id==='D_WIN').progress,2);assert(loaded.taskView().daily.find(t=>t.id==='D_LIFE').claimed);
});
console.log(JSON.stringify({ok:!process.exitCode,checks:passed,catalog:C?.stats}));
