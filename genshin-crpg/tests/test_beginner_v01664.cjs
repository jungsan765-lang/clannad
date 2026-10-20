'use strict';
// 0.16.64 (user, 2026-10-18, reading the 초보 구간 표): 「일단 권장레벨 표시만 하자」, 「경험치 책으로 돌려주고, 5레벨까지는 사냥 경험치로
// 충분하니까 최대한 케서린 임무를 유도하는 방향으로 하자」. runtime_reading.js 끝 (beginnerV01664), runtime_growth_v01522.js addXp,
// app.js / app_adventure.js (권장 레벨), app_tutorial.js (guildGo).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{R,db,fresh}=require('./helpers_v011.cjs');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.log('FAIL '+name);console.log(e);}};
const src=f=>fs.readFileSync(path.join(__dirname,'../source',f),'utf8');
const PLAYER='PLAYER_CUSTOM',BOOKS=['MAT_CHAR_EXP_HERO','MAT_CHAR_EXP_ADVENTURER','MAT_CHAR_EXP_WANDERER'];
function free(route='ROUTE_TRAVELER',map='MAP_MOND_PLAINS'){const r=fresh(route);Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:map,STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION',WORLD_TIME:'12:00'});delete r.s.storyJourney;delete r.s.storyBreak;r.prepareStory?.();return r;}
const books=r=>Object.fromEntries(BOOKS.map(id=>[id,r.itemCount(id)]));

check('넘친 경험치: what the level cap throws away comes back as books, largest first; under 50 waits',()=>{
 const r=free();r.s.global.PLAYER_LEVEL_STATE=10;r.recalculate();assert.equal(r.growth(PLAYER).max,true,'Lv10 is the first cap');
 r.addXp(PLAYER,2128);assert.deepEqual(books(r),{MAT_CHAR_EXP_HERO:2,MAT_CHAR_EXP_ADVENTURER:0,MAT_CHAR_EXP_WANDERER:2});assert.equal(r.s.xpSpill,28);
 r.addXp(PLAYER,30);assert.deepEqual(books(r),{MAT_CHAR_EXP_HERO:2,MAT_CHAR_EXP_ADVENTURER:0,MAT_CHAR_EXP_WANDERER:3});assert.equal(r.s.xpSpill,8);
 assert.equal(r.growth(PLAYER).level,10);assert.equal(r.growth(PLAYER).xp,0);
 // below the cap nothing is turned into books; reaching the cap turns only what is left over
 const q=free();q.s.global.PLAYER_LEVEL_STATE=9;q.s.global.PLAYER_XP_STATE=0;q.recalculate();const need=q.growth(PLAYER).next;q.addXp(PLAYER,need-1);assert.deepEqual(books(q),{MAT_CHAR_EXP_HERO:0,MAT_CHAR_EXP_ADVENTURER:0,MAT_CHAR_EXP_WANDERER:0});
 q.addXp(PLAYER,1+300);assert.equal(q.growth(PLAYER).level,10);assert.deepEqual(books(q),{MAT_CHAR_EXP_HERO:0,MAT_CHAR_EXP_ADVENTURER:1,MAT_CHAR_EXP_WANDERER:1});assert.equal(q.s.xpSpill,0);
 const s=JSON.parse(JSON.stringify(r.s));assert.equal(new R(db,s).s.xpSpill,8,'the purse reloads');
 // Lv60 is the last level: nothing comes back there, so fights and 비경 never become a book source (books come from 지맥)
 const top=free();top.adminApply({op:'level',target:PLAYER,value:60});top.s.ascensions={...(top.s.ascensions||{}),[PLAYER]:6};top.recalculate();assert.equal(top.growth(PLAYER).cap,60);top.addXp(PLAYER,5000);assert.deepEqual(books(top),{MAT_CHAR_EXP_HERO:0,MAT_CHAR_EXP_ADVENTURER:0,MAT_CHAR_EXP_WANDERER:0});
 const bad=JSON.parse(JSON.stringify(r.s));bad.xpSpill=50;assert.throws(()=>new R(db,bad),/넘친 경험치 기록이 올바르지 않습니다/);
});
check('넘친 경험치: a won fight at the cap lists the books with its loot',()=>{
 const r=free();r.s.global.PLAYER_LEVEL_STATE=10;r.recalculate();r.s.xpSpill=49;
 const group=r.rows('33_ENCOUNTER_GROUP_DB').find(x=>x[0]==='EG_MOND_SLIME_SMALL')||r.rows('33_ENCOUNTER_GROUP_DB')[0];r.startBattle(group[0],'EXPLICIT');
 for(const a of r.s.runtime.actors)if(a.side==='ENEMY')a.hp=0;const out=r.finishBattle(true);
 assert(out.xpBooks?.MAT_CHAR_EXP_WANDERER>=1,'a 방랑자의 경험 from the 49 waiting and this fight');assert.equal(out.loot.MAT_CHAR_EXP_WANDERER,out.xpBooks.MAT_CHAR_EXP_WANDERER);
 assert.equal(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).xpBooks.MAT_CHAR_EXP_WANDERER,out.xpBooks.MAT_CHAR_EXP_WANDERER,'the result window reads it');
});
check('권장 레벨: a chapter shows the fixed levels of its places, and the offer carries it',()=>{
 const r=free();assert.deepEqual(JSON.parse(JSON.stringify(r.storyRecommendedLevel('Q_TRV_LIYUE_01'))),{min:32,max:42,text:'권장 Lv. 32~42'});
 assert.equal(r.storyRecommendedLevel('Q_TRV_MOND_02').max,28,'바람 드래곤의 폐허');assert.equal(r.storyRecommendedLevel('Q_NOTHING'),null);
 for(const e of [...r.mainStoryEntries(),...(r.storyChapterEntries?.()||[])])if(e.recommended)assert.match(e.recommended.text,/^권장 Lv\. \d+(~\d+)?$/);
 const app=src('app.js'),adv=src('app_adventure.js'),css=src('screen_v01629.css');
 assert(/function storyLevelChip\(r\)\{const lv=Number\(game\.s\.global\.PLAYER_LEVEL_STATE\)\|\|1,chip=el\('span','story-level'\+\(lv<r\.min\?' low':''\),r\.text\)/.test(app));
 assert((adv.match(/storyLevelChip\(c\.recommended\)/g)||[]).length===2);assert(/body \.story-level\.low\{/.test(css));
});
check('캐서린에게: free play is never held for it; the 할 일 row has the button and Amber says it once a session, letting every tap through',()=>{
 const r=free();assert.equal(r.tutorialDirective(),null,'no forced trip (test_growth_v01522, test_tutorial_v01523)');assert.equal(r.taskView().bonus.lock,'의뢰 접수 연습을 보고한 뒤');
 const ui=src('app_tasks_v0167.js'),css=src('screen_v01629.css');
 assert(/b\.className='task-mini-go';li\.classList\.add\('task-go'\);guildHint\(b\);/.test(ui));assert(/let guildHintShown=false;/.test(ui));
 assert(/mk\('strong','','모험가 길드에 가 보자! 캐서린이 처음 의뢰를 알려 줄 거야\.'\)/.test(ui));assert(/setTimeout\(\(\)=>bubble\.remove\(\),7000\)/.test(ui));
 assert(/body \.guild-hint\{position:fixed;z-index:60;pointer-events:none;/.test(css),'the hint lets every tap through');
});
console.log(JSON.stringify({ok:!process.exitCode,total:4,passed}));
