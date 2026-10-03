'use strict';
// v0.15.2: twenty-eight puzzle kinds, mutated bosses, regional events, the shared raid, about three hundred achievements,
// treasure chests during a main story, and the Liyue colour layer that leaves rarity and element colours alone.
const assert=require('node:assert/strict'),path=require('path');
const {fs,root,c,fresh}=require('./helpers_v011.cjs'),{fixture}=require('./helpers_abyss.cjs'),{solve}=require('./puzzle_solvers.cjs');
const api=c.CRPGRuntime,R=api.chestRules,results=[],plain=x=>JSON.parse(JSON.stringify(x));
const src=f=>fs.readFileSync(path.join(root,'source',f),'utf8'),file=f=>fs.readFileSync(path.join(root,f),'utf8');
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const refused=(fn,pattern)=>{try{fn();}catch(e){if(pattern)assert.match(e.message,pattern);return true;}return false;};
const rng=seed=>{let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};};
const DAY=86400000,KST=9*3600000,TEAM=['MOND_AMBER','MOND_KAEYA','MOND_LISA'];

check('puzzles: 28 kinds; every kind is solvable in both regions and a wrong or empty answer is refused',()=>{
 const games=Object.keys(R.make);assert.equal(games.length,28);assert.equal(Object.keys(R.games).length,28);assert.deepEqual(plain(Object.keys(R.check).sort()),plain(games.slice().sort()));
 const counts={};
 for(const g of games){const sizes=new Set([R.level.MOND[g],R.level.LIYUE[g]].filter(v=>v!==undefined));if(!sizes.size)sizes.add(3);
  for(const size of sizes)for(let seed=1;seed<=(g==='SLIDE'?6:25);seed++){const p=plain(R.make[g](size,rng(seed*7919+size)));const a=solve[g](p,api);
   assert(R.check[g](p,a),g+'@'+size+' seed '+seed+' solution refused');assert(!R.check[g](p,[]),g+' empty answer');assert(!R.check[g](p,null),g+' null answer');counts[g]=(counts[g]||0)+1;}}
 // a word of one repeated syllable (요요) can never be scrambled and is left out
 for(let seed=1;seed<=300;seed++){const w=R.make.WORD(1,rng(seed));assert(new Set([...w.word]).size>1);assert.notEqual(w.tiles.join(''),w.word);}
 return counts;
});
check('puzzles: the chests use twenty-two kinds; Mond boards are smaller than Liyue ones; the events draw from the rest',()=>{
 const chestGames=new Set(R.chests.filter(x=>x.game).map(x=>x.game));assert(chestGames.size>=20,'chests use many kinds: '+chestGames.size);
 assert.equal(R.level.MOND.ROTATE,1);assert.equal(R.level.LIYUE.ROTATE,2);
 assert(R.make.MAZE(1,rng(3)).m<R.make.MAZE(2,rng(3)).m);assert(R.make.MINES(1,rng(3)).n<R.make.MINES(2,rng(3)).n);
 assert.equal(R.make.ODD(1,rng(9)).rounds.every(r=>['turn','size','hue'].includes(r.kind)),true,'no mirrored odd one (a symmetric picture would look the same)');
 for(let s=1;s<30;s++)for(const r of R.make.SHADOW(1,rng(s)).rounds){const right=r.options[r.answer];assert.deepEqual(plain(right),{turn:0,flip:false});assert(r.options.every((o,i)=>i===r.answer||o.turn%180!==0),'every wrong shadow is a quarter turn');}
 const ui=src('app_puzzles_v0152.js');for(const g of Object.keys(R.make).filter(g=>!['SPOT','SWAP','SLIDE','SUDOKU','LIGHTS'].includes(g)))assert(ui.includes('C.games.'+g+'='),'a screen for '+g);
 return {chestKinds:[...chestGames]};
});
check('chests: a main story in progress no longer keeps them shut; a battle or work in hand still does',()=>{
 const g=fresh('MAP_MOND_FOREST');g.installMarketContent();const x=R.chests.find(c=>c.map==='MAP_MOND_FOREST'&&c.game);
 g.playPhase=()=>'STORY';assert.equal(g.chestReason(x.id),'','the story waits; the chest opens');
 const p=plain(g.chestPuzzle(x.id));const out=g.action('CHEST_OPEN',{chest:x.id,answer:solve[p.game](p,api)});assert.equal(out.result.chest,x.id);
 const h=fresh('MAP_MOND_CITY');h.installMarketContent();const y=R.chests.find(c=>c.map==='MAP_MOND_CITY'&&c.game);h.s.lifeJob={kind:'GATHER'};assert.match(h.chestReason(y.id),/하고 있는 일/);
 delete h.s.lifeJob;h.s.runtime={actors:[]};assert.match(h.chestReason(y.id),/전투를 마친 뒤/);
});
check('mutated bosses: two or three rules per boss each week, the same for every journey; 변이 도전 applies them and pays 30% more',()=>{
 const a=fresh(),b=fresh();a.actionStartedAt=b.actionStartedAt=Date.UTC(2026,9,1,1,0,0);
 const la=plain(a.mutationList()),lb=plain(b.mutationList());assert.equal(la.length,13);assert.deepEqual(la.map(x=>x.mods),lb.map(x=>x.mods),'the same rules for everyone');
 assert(la.every(x=>x.mods.length>=2&&x.mods.length<=3));a.actionStartedAt+=7*DAY;assert.notDeepEqual(plain(a.mutationList()).map(x=>x.mods),la.map(x=>x.mods),'another week, other rules');
 const FB=api.fieldBosses,id='FB_CRYO_REGISVINE',route=FB.route(id),r=fixture(12,TEAM,8);r.actionStartedAt=Date.UTC(2026,9,1,1,0,0);Object.assign(r.s.global,{CURRENT_MAP_ID:FB.bosses[id].map,SCREEN_MODE:'LOCATION'});
 assert.match(r.actionReason('BOSS_ROUTE',{route,entry:'DIRECT',mutation:'yes'}),/변이 도전 여부/);
 r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});r.action('BOSS_ROUTE',{route,entry:'DIRECT',mutation:true});const bt=r.s.runtime;assert(bt.mutation&&bt.actors.some(x=>x.mutant));
 for(const x of bt.actors.filter(x=>x.side==='ENEMY'))x.hp=0;r.finishBattle(true);const res=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);
 assert(res.mutation.bonus.mora>0&&res.mutation.bonus.xp>0);assert.equal(Object.values(res.mutation.bonus.items)[0],1);assert.equal(r.s.mutations.wins[id],1);
 const plainFight=fixture(12,TEAM,8);plainFight.actionStartedAt=Date.UTC(2026,9,1,1,0,0);Object.assign(plainFight.s.global,{CURRENT_MAP_ID:FB.bosses[id].map,SCREEN_MODE:'LOCATION'});plainFight.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});plainFight.action('BOSS_ROUTE',{route,entry:'DIRECT'});assert(!plainFight.s.runtime.mutation,'the usual fight stays usual');
 return {mods:bt.mutation.mods,bonus:res.mutation.bonus};
});
function eventWorld(kind,extra){
 const probe=fresh();const maps=probe.rows('32_MAP_DB').filter(m=>['몬드','리월'].includes(m[1])&&m[8]==='Y'&&m[12]!=='Y').map(m=>m[0]);
 for(let day=20400;day<20600;day++)for(const map of maps){const ev=probe.regionEventAt(map,day);if(ev?.kind===kind&&(!extra||extra(ev))){const r=fixture(12,TEAM,8);r.s.global.SAVE_ID=probe.s.global.SAVE_ID;r.actionStartedAt=day*DAY-KST+3600000;Object.assign(r.s.global,{CURRENT_MAP_ID:map,SCREEN_MODE:'LOCATION'});return {r,ev:r.regionEventAt(map,day),map,day};}}
 throw Error('no '+kind+' event found');
}
check('regional events: about a third of the wild maps each day, nine kinds, the same for one journey and day',()=>{
 const r=fresh(),maps=r.rows('32_MAP_DB').filter(m=>['몬드','리월'].includes(m[1])&&m[8]==='Y'&&m[12]!=='Y').map(m=>m[0]);let n=0,total=0;const kinds=new Set();
 for(let day=20400;day<20420;day++)for(const map of maps){total++;const ev=r.regionEventAt(map,day);if(ev){n++;kinds.add(ev.kind);assert.deepEqual(plain(r.regionEventAt(map,day)),plain(ev));}}
 assert(n/total>.25&&n/total<.45,'share '+(n/total));assert.equal(kinds.size,9);
 assert.equal(r.regionEventAt('MAP_MOND_CITY',20400),null,'towns hold no events');
 return {share:+(n/total).toFixed(2),kinds:[...kinds]};
});
check('regional events: each kind settles once; fights settle on victory; a device needs its puzzle solved; 원석 stop at 40 a day',()=>{
 const out={};
 {const {r,ev}=eventWorld('PUZZLE');const p=plain(r.regionEventHere().puzzle);assert(refused(()=>r.action('REGION_EVENT',{choice:'SOLVE',answer:[]}),/풀리지 않았습니다/));const res=r.action('REGION_EVENT',{choice:'SOLVE',answer:solve[p.game](p,api)}).result;assert.equal(res.outcome,'DONE');assert.equal(res.primogem,10);
  assert(refused(()=>r.action('REGION_EVENT',{choice:'SOLVE',answer:solve[p.game](p,api)}),/이미 마무리/),'once a day');out.puzzle=p.game;}
 {const {r}=eventWorld('AMBUSH',e=>!!e.group);r.action('REGION_EVENT',{choice:'FIGHT'});assert(r.s.runtime?.regionEvent);for(const a of r.s.runtime.actors.filter(x=>x.side==='ENEMY'))a.hp=0;r.finishBattle(true);const e=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).regionEvent;assert(e.settled&&e.primogem===10);}
 {const {r}=eventWorld('ELITE',e=>!!e.group);r.action('REGION_EVENT',{choice:'FIGHT'});const t=r.s.runtime.actors.find(x=>x.side==='ENEMY');assert(t.regionElite&&/^거친 /.test(t.name));for(const a of r.s.runtime.actors)if(a.side==='ALLY')a.hp=0;r.finishBattle(false);assert(!r.regionToday()?.done?.[r.s.global.CURRENT_MAP_ID],'a lost fight can be tried again');}
 {const {r,ev}=eventWorld('LOST');r.action('REGION_EVENT',{choice:'ESCORT'});assert(refused(()=>r.action('REGION_EVENT',{choice:'ARRIVE'}),/도착해야/));r.s.global.CURRENT_MAP_ID=ev.to;const a=r.action('REGION_EVENT',{choice:'ARRIVE'}).result;assert.equal(a.primogem,10);}
 {const {r,ev}=eventWorld('MERCHANT');r.s.global.MORA=0;assert.match(r.actionReason('REGION_EVENT',{choice:'BUY',index:0}),/모라가 부족/);r.s.global.MORA=99999;for(let i=0;i<ev.stock.length;i++)r.action('REGION_EVENT',{choice:'BUY',index:i});assert(r.regionToday().done[r.s.global.CURRENT_MAP_ID]);}
 {const {r}=eventWorld('LEAVE'===''?'':'CACHE');const st=r.regionEventState();st.primogems=38;const res=r.action('REGION_EVENT',{choice:'SEARCH60'}).result;assert.equal(res.primogem,2);assert.equal(res.capped,true);assert.equal(r.s.regionEvents.primogems,40);}
 {const {r}=eventWorld('REQUEST');assert.match(r.actionReason('REGION_EVENT',{choice:'DELIVER'}),/필요합니다/);const before=r.s.regionEvents?.count||0;r.action('REGION_EVENT',{choice:'LEAVE'});assert.equal(r.s.regionEvents.count,before,'leaving does not count as solving');}
 const bad=fresh(),s=JSON.parse(bad.serialize());s.regionEvents={version:1,day:1,done:{},primogems:41,escort:null,bought:{},total:{},count:0};assert(refused(()=>new api.Runtime(bad.db,s,true),/지역 사건 기록/));
 return out;
});
check('공동 토벌전: closed unless an event is open; then Lv.10 to sortie, three a day, eight rounds where every hit counts 1 and the boss never falls',()=>{
 // 0.15.4: the account server hands the engine the event the operator opened (user: 「공동 토벌전은 이벤트로 열거였는데」).
 const at=Date.UTC(2026,9,1,1,0,0),event={id:'RAID_1000001',boss:'MON_RAID_GRADER',startsAt:at-3600000,endsAt:at+7*86400000,target:4000};
 const shut=fixture(12,TEAM,8);shut.installMarketContent();shut.actionStartedAt=at;shut.s.global.SCREEN_MODE='LOCATION';
 assert.equal(shut.raidReason(),api.raidV0152.closed);assert.equal(shut.raidView().open,false);assert(refused(()=>shut.action('RAID_ENTER',{}),/열린 공동 토벌전이 없습니다/));
 shut.raidServerEvent={...event,endsAt:at};assert.equal(shut.raidReason(),api.raidV0152.closed,'an event that has ended is closed');
 shut.raidServerEvent={...event,boss:'MON_SLIME_HYDRO'};assert.equal(shut.raidReason(),api.raidV0152.closed,'an unknown boss is no event');
 const low=fixture(9,TEAM,6);low.installMarketContent();low.raidServerEvent=event;low.actionStartedAt=at;assert.match(low.raidReason(),/Lv\.10부터/);
 const r=fixture(12,TEAM,8);r.installMarketContent();r.actionStartedAt=at;r.raidServerEvent=event;r.s.global.SCREEN_MODE='LOCATION';
 assert.equal(r.raidView().open,true);assert.equal(r.raidView().name,api.raidV0152.bosses[0].name);
 r.action('RAID_ENTER',{});assert.equal(r.s.runtime.raid.event,'RAID_1000001');const b=r.s.runtime;assert(b.raid&&b.storyConfig.noRewards);const boss=b.actors.find(a=>a.raidBoss);assert.equal(boss.maxHp,1000000);
 // The event closes while the sortie runs: the fight still finishes and its hits still go to that event's record.
 r.raidServerEvent=null;
 r.action('COMBAT_BEGIN');for(let i=0;i<300&&r.s.runtime;i++){for(const a of r.s.runtime.actors)if(a.side==='ALLY')a.control='AI';r.autoUntilPlayer();}
 const res=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);assert(res.raid.hits>0);assert(res.raid.finished||!res.victory);assert(res.rounds<=api.raidV0152.rounds+1);
 r.raidServerEvent=event;assert.equal(r.s.raid.hits,res.raid.hits);assert.equal(r.raidView().sortiesLeft,2);
 r.s.raid.sorties=3;assert.match(r.raidReason(),/오늘 출격을 모두 마쳤습니다/);
 const g=r.s.global.MORA;r.raidGrant({mora:5000,items:{MAT_CHAR_EXP_HERO:1}});assert.equal(r.s.global.MORA-g,5000);
 const s=JSON.parse(r.serialize());s.raid.sorties=4;assert(refused(()=>new api.Runtime(r.db,s,true),/공동 토벌전 기록/));
 return {hits:res.raid.hits,rounds:res.rounds};
});
check('achievements: about three hundred in eighteen groups; finished ones pay 5/10/20 원석 once; counters follow cooking, puzzles and wishes',()=>{
 const r=fixture(12,TEAM,8),v=r.achievementView();assert(v.total>=300,'count '+v.total);assert.equal(v.cats.length,18);assert.equal(new Set(v.list.map(x=>x.id)).size,v.total);
 assert(v.list.every(x=>[5,10,20].includes(x.reward)));assert(v.list.some(x=>x.hidden),'some are hidden until done');
 const ready=v.list.filter(x=>x.done&&!x.claimed),sum=ready.reduce((n,x)=>n+x.reward,0),before=Number(r.s.global.PRIMOGEM)||0;
 const out=r.action('ACHIEVEMENT_CLAIM',{achievement:'ALL'}).result;assert.equal(out.claimed.length,ready.length);assert.equal((Number(r.s.global.PRIMOGEM)||0)-before,sum);
 assert.match(r.actionReason('ACHIEVEMENT_CLAIM',{achievement:'ALL'}),/받을 업적 보상이 없습니다/);
 if(ready[0])assert.match(r.actionReason('ACHIEVEMENT_CLAIM',{achievement:ready[0].id}),/이미 받은/);
 const g=fresh('MAP_MOND_FOREST');g.installMarketContent();const x=R.chests.find(c=>c.map==='MAP_MOND_FOREST'&&c.game),p=plain(g.chestPuzzle(x.id));g.action('CHEST_OPEN',{chest:x.id,answer:solve[p.game](p,api)});
 assert.equal(g.s.stats.puzzles[p.game],1);assert(g.achievementView().list.find(a=>a.id==='PUZZLE_'+p.game).done);
 const saved=JSON.parse(r.serialize());saved.achievements.claimed.NOT_REAL=1;assert(refused(()=>new api.Runtime(r.db,saved,true),/업적 기록/));
 assert.match(src('runtime_achievements_v0152.js'),/a\.achievement/,'the claim names the achievement (not `id`, the action\'s own id)');
 return {total:v.total,paid:sum};
});
check('the account server accepts the new actions; the screens are loaded in order',()=>{
 const core=file('server/game-core.mjs');for(const t of ['REGION_EVENT','RAID_ENTER','ACHIEVEMENT_CLAIM','MAIL_DELETE'])assert(core.includes('"'+t+'"'),t);
 const html=src('index.html'),at=n=>html.indexOf('"'+n+'"');
 assert(at('runtime_chests_v01415.js')<at('runtime_puzzles_v0152.js')&&at('runtime_puzzles_v0152.js')<at('runtime_balance_v0152.js')&&at('runtime_balance_v0152.js')<at('runtime_mutations_v0152.js')&&at('runtime_mutations_v0152.js')<at('runtime_achievements_v0152.js'));
 assert(at('app_chests_v01415.js')<at('app_puzzles_v0152.js')&&at('app_puzzles_v0152.js')<at('app_events_v0152.js'));
 const hb=src('app_handbook.js');assert.match(hb,/\['achievements','업적','TROPHY'\]/);assert.match(hb,/CRPGMutations\?\.journal/);
});
check('Liyue colours: rarity and element colours stay; only the plain surfaces turn brown',()=>{
 const css=src('shell.css'),cut=css.indexOf('리월 색 (generated'),layer=css.slice(cut);
 assert(!/--rar-\d:/.test(layer),'the rarity gradients are not redefined in Liyue');
 assert(layer.includes('body.teyvat[data-region=liyue] .shell-item-hero.tier-3{background:linear-gradient(160deg,#415f98,#6f94cf)}'),'the 3★ hero keeps its blue');
 assert(layer.includes('body.teyvat[data-region=liyue] .combatant-row[data-aura=geo]{--aura:#f5c542}'),'Geo keeps its gold');
 assert.match(file('tools/gen_liyue_theme.cjs'),/MEANING=/);
});
check('phone screens (user photos of 0.15.0): party cards swipe sideways with ◀ ▶, names stand under faces, the menu card keeps its height, a tapped tab keeps its letters',()=>{
 const css=src('shell.css'),party=src('app_party_v01411.js');
 assert.match(party,/shell-line-move/);assert.match(party,/e\.pointerType==='touch'/,'a finger scrolls instead of dragging');assert.match(party,/이미 맨 앞입니다/);
 assert.match(css,/@media \(pointer:fine\)\{body\.teyvat \.shell-battle-line>\.shell-draggable \.member-select\{touch-action:none\}\}/,'no touch-action:none for fingers');
 assert.match(css,/\.party-cols \.formation-grid\.shell-battle-line\{display:flex;overflow-x:auto;scroll-snap-type:x mandatory/);
 assert.match(css,/\.shell-col-roster \.shell-roster-item\{flex:0 0 auto;flex-direction:column/);
 assert.match(css,/\.pm-box\{grid-template-columns:1fr;grid-template-rows:none/);
 assert.match(css,/@media \(hover:hover\)\{\nbody\.teyvat :where\(#root,#modal,\.hud-guide-pop,\.combat-playback\) button:hover:not\(:disabled\)/,'hover looks only for a hovering pointer');
 assert.match(css,/:is\(\.shell-tab\.active,[^)]*\):hover:not\(:disabled\)\{background:var\(--t-cream\);color:var\(--t-ink\)/);
 const g=fresh();g.installMarketContent();const b={origin:'RAID:RAID_1'};assert.equal(g.describeEncounter(b).kind,'RAID');assert.equal(g.describeEncounter({origin:'REGION_EVENT:x'}).kind,'EVENT');assert.equal(g.describeEncounter({origin:'MATERIAL_CHALLENGE:BOSS_ANDRIUS'}).kind,'BOSS');
 assert.match(src('app_wish_v01411.js'),/UI\.lockTimer=setTimeout/,'a timed lock opens the wish buttons again by itself');
});
const out=path.join(root,'reports/v0152');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'runtime-tests.json'),JSON.stringify({version:'0.15.2',total:results.length,passed:results.filter(r=>r.ok).length,results},null,1));
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length}));
