'use strict';
// 0.16.7 (the user's notes of 2026-10-07): 「경험치책, 캐릭터 많으면 너무 복잡해지니까 캐릭터마다 경험치 책 사용을 만들어두는게 좋아보인다.
// … 기술명만 탁 나오고 어떤 기술인지 확인하는건 정보창에서 보게 하자. … 일퀘 주간퀘를 나눠서 할 일을 만드는게 좋아보여. … 의뢰 버튼이
// 너무 쓸데없이 커. … 칸코레랑 비슷한 느낌으로 … 그냥 아예 스크롤 자체가 모든 화면 전체에서 나오지 않는 깔끔한 화면이면 좋겠는데」, then
// 「짤렸어.」, 「임무 완수하면 보상이 들어왔다는게 보여야되는데 그게 없어.」 and 「추가적인 효과 … 적 쪽에서 공격을 하는것으로 착각」.
const assert=require('node:assert/strict');
const {fresh,fs,path,root,advance}=require('./helpers_v011.cjs');
const src=f=>fs.readFileSync(path.join(root,f.includes('/')?f:'source/'+f),'utf8'),json=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const plain=x=>JSON.parse(JSON.stringify(x));
let passed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
const DAY=86400000;
// Preserve the real pre-0.16.8 definitions; only explicit earned-quota fixtures
// skip unrelated predecessor work. Root acceptance and every reward claim stay native.
function legacyBoard(r){const t=require('./helpers_v011.cjs').c.CRPGRuntime.tasksV0167,map=r.s.global.CURRENT_MAP_ID;r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_01'});r.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_01'});r.action('PLACE_LEAVE');r.s.global.CURRENT_MAP_ID=map;r.s.tasks={version:1,day:t.dayOf(r.tasksNow()),week:t.weekOf(r.tasksNow()),daily:{},weekly:{},claimed:{},dailyIds:['D_WIN','D_LEY','D_DOMAIN','D_LIFE'],weeklyIds:['W_WIN','W_BOSS','W_DOMAIN','W_BONUS']};r.tasksBox(true);return r;}
function unlockDaily(r,id){const c=require('./helpers_v011.cjs').c.CRPGTaskCatalogV0168;function visit(key){for(const parent of c.dailyBranches[key]||[]){visit(parent);if(!r.s.tasks.claimed[parent]){const box=r.tasksBox(true);box.dailyProgress[parent]=box.dailyDefinitions[parent].goal;r.action('TASK_CLAIM',{task:parent});}}}visit(id);}
function completeDaily(r){const ids=r.tasksBox(true).dailyIds;for(let n=0;n<=ids.length;n++){const frontier=r.taskView().daily;for(const row of frontier){const box=r.tasksBox(true);box.dailyProgress[row.id]=box.dailyDefinitions[row.id].goal;}if(ids.every(id=>r.s.tasks.claimed[id]||r.s.tasks.dailyProgress[id]>=r.s.tasks.dailyDefinitions[id].goal))break;for(const row of frontier)r.action('TASK_CLAIM',{task:row.id});}}
function leyWin(r){if(r.s.placeVisit)r.action('PLACE_LEAVE',{});const x=r.leyLineStatus().blossoms.find(x=>x.region==='몬드'&&x.kind==='REVELATION');r.s.global.CURRENT_MAP_ID=x.map;r.action('PLACE_ENTER',{place:'BOSS:'+x.route,mode:'BOSS'});r.action('BOSS_ROUTE',{route:x.route,entry:'DIRECT',tier:1});r.finishBattle(true);r.action('PLACE_LEAVE',{});}
function domainWin(r){const open=r.growthDomainEntries().find(x=>!x.reason);r.action('DOMAIN_START',{domain:open.id,element:'NEUTRAL'});assert(r.s.runtime?.growthDomain,'a domain fight');r.finishBattle(true);}
function gather(r){r.action('LIFE_START',{kind:'GATHER'});const job=r.s.lifeJob,scene=r.lifeScene(job),picks=scene.nodes.map((n,i)=>({at:600+i*300,node:i}));advance((job.duration||10000)+100);return r.action('LIFE_FINISH',{job:job.id,elapsed:job.duration,inputs:picks});}

check('이전 저장의 목표·보상 보존과 갈래 집계: 성공한 실제 행동만 집계',()=>{
 const r=legacyBoard(fresh('MAP_D163_VALLEY_OF_REMEMBRANCE'));let v=r.taskView(),box=r.s.tasks;
 assert.deepEqual(plain(v.daily.map(x=>x.id)),['D_WIN','D_LIFE']);assert.equal(v.bonus.id,'D_BONUS');
 for(const [id,goal]of [['D_WIN',3],['D_LEY',1],['D_DOMAIN',1],['D_LIFE',2]]){assert.equal(box.dailyDefinitions[id].goal,goal);assert.equal(box.dailyDefinitions[id].revision,168);}
 assert.equal(box.weeklyDefinitions.W_BOSS.goal,3);assert.equal(box.weeklyDefinitions.W_BOSS.minLevel,15);assert(box.weeklyIds.length>4&&box.weeklyIds.length<=28);assert.equal(v.ready,0);assert.equal(v.bonus.goal,box.dailyIds.length);assert(!v.bonus.done);
 // The earned predecessor is reported natively; a still-locked blossom remains unfinished.
 unlockDaily(r,'D_LEY');v=r.taskView();assert.equal(v.daily.find(x=>x.id==='D_LEY').lock,'주인공 Lv.5부터');assert(!v.bonus.done);
 r.adminApply({op:'level',target:'ALL',value:20});r.s.global.PLAYER_LEVEL_STATE=20;v=r.taskView();assert.equal(v.daily.find(x=>x.id==='D_LEY').lock,'');assert.equal(v.bonus.goal,box.dailyIds.length);
 domainWin(r);
 // A lost fight counts nothing.
 const open=r.growthDomainEntries().find(x=>!x.reason);r.action('DOMAIN_START',{domain:open.id,element:'NEUTRAL'});r.finishBattle(false);advance(61000);
 assert.deepEqual(plain(r.s.tasks.daily),{win:1,domain:1});assert.deepEqual(plain(r.s.tasks.weekly),{win:1,domain:1});
 r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';gather(r);gather(r);assert.equal(r.s.tasks.daily.life,2,'gathering that brings something home counts');
 v=r.taskView();assert(v.daily.find(x=>x.id==='D_DOMAIN').done&&v.daily.find(x=>x.id==='D_LIFE').done);assert.equal(r.s.tasks.claimed.D_WIN,1);assert.equal(v.ready,2);
 const src0=src('runtime_tasks_v0167.js');
 assert(src0.includes("if(kind.ley)this.tasksCount('ley',1,event);if(kind.domain)this.tasksCount('domain',1,event);if(kind.boss)this.tasksCount('boss',1,event);"),'ley lines, domains and field bosses count from the battle that ended');
 assert(src0.includes("['GATHER','MINE','FISH','HUNT'].includes(out.kind)")&&src0.includes('!out.empty'),'an empty trip counts nothing');
});

check('받기 pays frozen rewards once; 모두 받기 claims the frontier; the day bonus counts toward the week',()=>{
 const r=legacyBoard(fresh('MAP_D163_VALLEY_OF_REMEMBRANCE'));domainWin(r);
 assert.throws(()=>r.action('TASK_CLAIM',{task:'D_WIN'}),/아직 달성하지 않았습니다 \(1\/3\)/);
 unlockDaily(r,'D_DOMAIN');const book=()=>r.itemCount('MAT_CHAR_EXP_ADVENTURER'),before=book();domainWin(r);const out=r.action('TASK_CLAIM',{task:'D_DOMAIN'});
 assert.deepEqual(plain(out.result),{claimed:['D_DOMAIN'],names:['비경 1번 이기기'],mora:0,primogem:0,items:{MAT_CHAR_EXP_ADVENTURER:2}});assert.equal(book(),before+2);
 assert.throws(()=>r.action('TASK_CLAIM',{task:'D_DOMAIN'}),/이미 받은 보상/);assert.throws(()=>r.action('TASK_CLAIM',{task:'NOPE'}),/임무를 찾을 수 없습니다/);
 assert.equal(r.s.tasks.dailyDefinitions.D_LEY.reward.mora,800);assert.equal(r.s.tasks.dailyDefinitions.D_LIFE.reward.mora,600);
 r.adminApply({op:'level',target:'ALL',value:20});leyWin(r);assert.equal(r.s.tasks.daily.ley,1);assert.equal(r.s.tasks.dailyProgress.D_LEY,1,'the real blossom victory fulfils its retained original goal');
 // Explicit completed-activity quotas let the complete finite manifest be reported
 // without replaying unrelated farming loops. Required predecessor claims remain native.
 completeDaily(r);let v=r.taskView();assert(v.bonus.done,'all assigned goals, including hidden branches');assert.equal(v.ready,v.daily.length+1);assert.equal(v.here,v.daily.length,'the bonus waits for Catherine');
 const mora=r.s.global.MORA,primo=Number(r.s.global.PRIMOGEM)||0,expectedIds=v.daily.filter(x=>x.here).map(x=>x.id),expectedMora=v.daily.filter(x=>x.here).reduce((n,x)=>n+(x.reward.mora||0),0);
 assert.throws(()=>r.action('TASK_CLAIM',{task:'D_BONUS'}),/캐서린에게 보고해야 받을 수 있습니다/);
 const all=r.action('TASK_CLAIM',{task:'ALL'}).result;assert.deepEqual(new Set(all.claimed),new Set(expectedIds));assert.equal(all.mora,expectedMora);assert.equal(all.primogem,0);
 assert.throws(()=>r.action('TASK_CLAIM',{task:'ALL'}),/캐서린에게 보고해야/);
 r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});assert(r.taskView().bonus.here);
 const rep=r.action('TASK_CLAIM',{task:'ALL'}).result;assert.deepEqual(plain(rep.claimed),['D_BONUS']);assert.equal(rep.primogem,20);assert.equal(r.s.global.MORA,mora+expectedMora);assert.equal(r.s.global.PRIMOGEM,primo+20);assert.equal(r.s.tasks.weekly.bonus,1,'one day toward the week');assert.throws(()=>r.action('TASK_CLAIM',{task:'ALL'}),/받을 임무 보상이 없습니다/);
 r.action('PLACE_LEAVE',{});r.s.global.CURRENT_MAP_ID='MAP_D163_VALLEY_OF_REMEMBRANCE';const weeklyProgress=r.s.tasks.weeklyProgress.W_DOMAIN;
 advance(DAY);v=r.taskView();assert.equal(v.ready,0);assert(v.daily.every(x=>!x.claimed&&x.progress===0));assert.equal(v.weekly.find(x=>x.id==='W_DOMAIN').progress,weeklyProgress);
 domainWin(r);assert.equal(r.s.tasks.daily.domain,1);assert(!r.s.tasks.claimed.D_DOMAIN);
 advance(7*DAY);v=r.taskView();assert(v.weekly.every(x=>x.progress===0&&!x.claimed));
 const open=r.growthDomainEntries().find(x=>!x.reason);r.action('DOMAIN_START',{domain:open.id,element:'NEUTRAL'});assert.equal(r.taskReason('ALL'),'전투가 끝난 뒤 받을 수 있습니다.');
});

check('the day turns at Korean midnight and the week on Monday',()=>{
 const {dayOf,weekOf}=require('./helpers_v011.cjs').c.CRPGRuntime.tasksV0167;
 const kst=s=>Date.parse(s+'+09:00');
 assert.equal(dayOf(kst('2026-10-07T23:59:59')),dayOf(kst('2026-10-07T00:00:00')));assert.equal(dayOf(kst('2026-10-08T00:00:00')),dayOf(kst('2026-10-07T12:00:00'))+1);
 // 2026-10-05 is a Monday.
 assert.equal(weekOf(kst('2026-10-05T00:00:00')),weekOf(kst('2026-10-11T23:59:59')));assert.equal(weekOf(kst('2026-10-12T00:00:00')),weekOf(kst('2026-10-11T23:59:59'))+1);
 assert.notEqual(weekOf(kst('2026-10-04T23:59:59')),weekOf(kst('2026-10-05T00:00:00')));
});

check('a save with a broken board is refused; the server lets 「받기」 through',()=>{
 const r=legacyBoard(fresh('MAP_D163_VALLEY_OF_REMEMBRANCE'));domainWin(r);const good=plain(r.s);r.validateSave(plain(good));
 for(const bad of [{...good.tasks,version:2},{...good.tasks,daily:{win:-1}},{...good.tasks,claimed:{D_FAKE:1}},{...good.tasks,claimed:{D_WIN:true}},null])
  assert.throws(()=>r.validateSave({...plain(good),tasks:bad}),/임무 기록이 올바르지 않습니다/);
 const core=src('server/game-core.mjs');assert(core.includes('"ACHIEVEMENT_CLAIM", "TASK_CLAIM"')||/"TASK_CLAIM"/.test(core),'TASK_CLAIM is an allowed action');
 const html=src('index.html');assert(html.indexOf('runtime_tasks_v0167.js')>html.indexOf('runtime_landmarks_v0163.js'),'after the other runtime modules');
});

check('임무 보상 획득: what a claim paid shows itself; a finished task says so once',()=>{
 const t=src('app_tasks_v0167.js'),css=src('shell.css');
 assert(t.includes("mk('strong','task-gain-title','임무 보상 획득')")&&t.includes("window.CRPGSound?.play('item_receive')"),'the 획득 window with the original sound');
 assert(/act=async function\(type,params=\{\}\)\{const out=await priorAct\(type,params\);[\s\S]{0,120}type==='TASK_CLAIM'&&out&&out\.ok!==false/.test(t),'after a claim the server accepted');
 assert(t.includes("'임무 달성 · '+fresh[0].name"),'a note when one is done');
 assert(t.includes("const GRADE={일반:'green',고급:'blue',희귀:'purple',영웅:'gold',전설:'gold'}"),'tiles in the item’s grade');
 for(const rule of ['.task-gain{position:fixed;inset:0;z-index:2400','.task-gain-pic.g-gold','@keyframes task-gain-pop'])assert(css.includes(rule),rule);
 assert(t.includes("['일일·주간','진행 중','동료 획득','완료']"),'임무 opens on the board');
});

check('의뢰 한 줄: state, name, place, reward pictures, one small button; the row opens the whole card',()=>{
 const g=src('app_guild_v0167.js'),css=src('shell.css'),html=src('index.html'),build=src('tools/build.py');
 assert(g.includes("const STATE={open:['미수락','s-open'],going:['진행 중','s-going'],ready:['보고','s-ready'],done:['완료','s-done']}"),'the states');
 assert(g.includes("card.replaceWith(row(card,q,guild))")&&g.includes('showModal(title,card)'),'the card itself opens in the information window');
 assert(g.includes("b.onclick=e=>{e.stopPropagation();main.click();}"),'the small button presses the card’s own');
 assert(g.includes("{id:'tasks',label:'일일·주간',icon:'STAR'"),'Catherine opens on the board');
 assert(css.includes('.cm-row{display:grid;grid-template-columns:54px minmax(0,1fr) auto auto'),'a row');
 assert(css.includes('.shell-place-tabs .shell-pane:not([hidden]){height:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;overflow:hidden}'),'the place lists turn pages');
 const order=['app_character_v0167.js','app_mainscreen_v0167.js','app_tasks_v0167.js','app_guild_v0167.js'].map(f=>html.indexOf('<script src="'+f+'"'));
 assert(order.every((x,i)=>x>0&&(i===0||x>order[i-1])),'loaded in order at the end');assert(build.includes("'app_guild_v0167.js'"),'and built');
});

check('메인 화면: no scrolling — pages filled by the real layout, tall cards paged by their rows, nothing cut',()=>{
 const m=src('app_mainscreen_v0167.js'),land=src('landscape_v01524.css'),css=src('shell.css'),growth=src('app_growth_v01522.js'),nav=src('app_navigation.js');
 assert(m.includes("const WHOLE='.domain-gate,.task-mini,.region-event,.ley-line-item,.shell-place-tile,button"),'a domain gate, a button or a line is never split');
 assert(m.includes('const over=()=>pane.scrollHeight>pane.clientHeight+1;')&&m.includes('if(page.length&&over()){pages.push(on);'),'measured, not guessed');
 assert(m.includes("document.addEventListener('toggle'"),'a folded list opened is paged again');
 assert(css.includes('body.teyvat .shell-loc-side .shell-pane>*{margin:0;flex-shrink:0}'),'cards keep their height');
 assert(land.includes('grid-template-areas:"head head go" "double double double" "stages stages stages" "elements elements elements" "foes rewards rewards"'),'the gate fits the narrow column');
 assert(land.includes('.shell-loc-side .domain-gate-body{display:contents}')&&land.includes('.shell-loc-side .domain-gate-double .dg-short{display:inline}'),'its parts side by side, the double in a few words');
 assert(growth.includes("'오늘 첫 3번 승리는 재료 2배 · 남은 '+rw.remaining+'번'")&&growth.includes("el('span','dg-short',"),'the long line stays for wide screens');
 assert(growth.includes("el('p','domain-gate-lock','Lv.'+d.level+' · '+(d.lock||d.reason))"),'why a level is shut, in one line');
 assert(!/white-space:nowrap;overflow:hidden;text-overflow:ellipsis/.test(land.slice(land.indexOf('메인 화면 왼쪽 칸'))),'no 「…」 in the column');
 assert(nav.includes("dock.classList.add('idle')")&&land.includes('.terrain-travel-dock.idle{display:none}'),'the map’s how-to line waits out of sight on phones');
});

check('전투: only a fighter’s own skill is named, over its own side; the dock box is gone',()=>{
 const b=src('app_mond_boss_balance.js');
 assert(!b.includes("el('section','combat-skill-banner"),'no box in the playback dock');
 assert(b.includes("['FOLLOWUP','FIELD','OBJECT','SUMMON','HAZARD','SHIELD_BREAK','REACTION','TRAIT','STATUS'].includes(frame.sourceKind)"),'extra effects say nothing');
 assert(b.includes("field=panel?.querySelector(d.side==='ENEMY'?'.shell-enemies':'.shell-allies')"),'over the side that uses it');
 assert(b.includes("if(d.effect||!d.actor||!['ALLY','ENEMY'].includes(d.side)||this.extra(frame)"),'only a fighter’s own action');
});

check('캐릭터: books in one line per character, four tabs, where materials come from, nothing scrolls',()=>{
 const gear=src('app_gear.js'),ch=src('app_character_v0167.js'),party=src('app_party.js');
 assert(!/function bookDialog\(|function books\(/.test(gear),'the right-hand book window is gone');
 assert(gear.includes('function bookRow(owner)')&&gear.includes('if(game.experienceBookLimit)card.append(bookRow(id));'),'each character uses its own books');
 assert(ch.includes("const TABS=[['stats','능력치'],['level','레벨'],['talent','특성'],['cons','운명의 자리']]"),'four tabs');
 assert(ch.includes('function materialSource(id)')&&ch.includes('window.CRPGTrack'),'where a material comes from, and a pin for it');
 assert(party.includes("'prep-board'")||party.includes('prep-board'),'the battle preparation is one board');
 for(const f of ['app_gear.js','app_character_v0167.js','app_mainscreen_v0167.js','app_tasks_v0167.js','app_guild_v0167.js','app_party.js'])assert(!/<select|el\('select'|createElement\('select'\)/.test(src(f)),f+' has no drop-down');
});

check('version 0.16.7 with its notes on top of the full chain',()=>{
 const pkg=json('package.json'),lock=json('package-lock.json'),notes=json('content/release-notes.json');
 const [maj,min,pat]=pkg.version.split('.').map(Number);assert(maj>0||min>16||(min===16&&pat>=7),pkg.version);assert.equal(lock.version,pkg.version);
 let n=notes;while(n&&n.version!=='0.16.7')n=n.previous;assert(n,'0.16.7 is in the chain');
 assert.equal(n.previous.version,'0.16.6');assert.equal(n.previous.previous.version,'0.16.5');
 for(const word of ['경험치 책','일일','주간','칸코레','스크롤','기술 이름','보상'])assert(n.changes.some(x=>x.includes(word)),word);
 assert(fs.existsSync(path.join(root,'docs/PATCH_0.16.7_KO.md')),'the patch notes');
});

console.log(JSON.stringify({ok:!process.exitCode,checks:passed}));

