'use strict';
// 0.16.47 (user, 2026-10-15): 「휴대폰 할때 시작부터 화면이 좀 확 줌인 된 채로 시작되는 버그」, 「게임 이름이 왜 몬드와 리월의 여정임?
// 나중에 이나즈마 안함?」 → 「테이바트가 한국 공식 이름이 아닐텐데..」 (공식: 티바트) → 부제 없이 「원신 CRPG」, 「임무 이쪽도 어떤 임무인지 정확히 나오질 않아서 모르겠다」, 「상자나 업적으로 얻는 원석 수치를 3배정도로 늘리자」,
// and the verify job's 20 minutes (run #336 passed every step and was cancelled at 20:09).
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,f.includes('/')?f:'source/'+f),'utf8');
const H=require('../tools/audit_protagonist_v01618.cjs'),env=H.load(root);
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};

check('a phone fits the game to what it shows: the visual viewport, a fixed frame, no pinch zoom, fitted again as the app settles',()=>{
 const h=src('index.html');
 assert(h.includes("var v=window.visualViewport;if(!desk&&v&&v.width>0&&v.height>0){W=Math.min(W,Math.round(v.width*(v.scale||1)));H=Math.min(H,Math.round(v.height*(v.scale||1)));}"));
 assert(h.includes("#crpg-frame{position:fixed!important}"));
 assert(h.includes("minimum-scale=1,maximum-scale=1,user-scalable=no"));
 assert(h.includes("[150,500,1200,2500].forEach(function(t){setTimeout(window.CRPGFrameFit,t);})"));
});

check('the game is 「원신 CRPG」 with no region in its name (user: 「테이바트의 여정이 뭔데」 → 부제 없이)',()=>{
 for(const f of ['index.html','manifest.webmanifest'])for(const old of ['몬드와 리월의 여정','테이바트의 여정'])assert(!src(f).includes(old),f+' '+old);
 assert(src('index.html').includes('<title>원신 CRPG</title>'));assert(!src('index.html').includes('class="chapter-label"'));
 assert.equal(JSON.parse(src('manifest.webmanifest')).name,'원신 CRPG');
});

check('the main screen\'s tasks say the whole task, and count the ones that open later',()=>{
 const t=src('app_tasks_v0167.js');
 assert(t.includes("mk('span','task-mini-name',x.name)"));assert(!t.includes('x.short||x.name'));
 assert(t.includes("'임무 '+later+'개 더 · 앞 임무 보상을 받으면 열림'"));assert(t.includes('function hiddenCount(v,scope)'));
 // the numbers behind it: after the guild lesson two of the day's tasks show and the rest open one after another
 const r=H.setup(env,{level:30,team:['MOND_AMBER','MOND_KAEYA','MOND_LISA'],route:'ROUTE_TRAVELER',seed:5,map:'MAP_MOND_CITY'});
 const k=r.placeCatalog().find(e=>e.entity==='NPC_MOND_KATHERYNE');r.action('PLACE_ENTER',{place:k.id,mode:'TALK'});r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_01'});r.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_01'});
 const v=r.taskView();assert(v.daily.length>0&&v.dailyTotal>v.daily.length);assert.equal(v.bonus.goal,v.dailyTotal);
 for(const x of v.daily)assert(x.name.length>x.short.length||x.name===x.short,x.id+' says the whole task');
});

check('chests and achievements pay three times the 원석',()=>{
 const c=env.api.chestRules||env.c.CRPGRuntime.chestRules,chests=(c?.chests)||[];
 if(chests.length){const sum=reg=>chests.filter(x=>x.region===reg).reduce((n,x)=>n+x.reward.primogem,0);assert.equal(sum('MOND'),3540);/* 0.16.65 */assert.equal(sum('LIYUE'),4305);}
 assert(src('runtime_chests_v01415.js').includes('const PRIMOGEM_X=3;for(const c of CHESTS)c.reward={...c.reward,primogem:c.reward.primogem*PRIMOGEM_X};'));
 assert.equal(JSON.stringify(env.api.achievementsV0152.reward),JSON.stringify({1:15,2:30,3:60}));
 assert(chests.length===96,'the 96 chests');
});

check('CI keeps the boss minigame screens to the computer page (the verify job\'s 20 minutes)',()=>{
 const fit=src('tests/test_screen_fit_v01629.mjs');
 assert(fit.includes("&&!(process.env.CI&&size.name!=='pc')"));assert(fit.includes("if(!process.env.CI)for(const [label,kind,extra] of [['fb-mini-anemo'"));
 assert(fit.includes("if(!(process.env.CI&&label==='fieldboss-battle-mutation'))await view(label+'-round2',"));assert(fit.includes("if(process.env.FIT_TIMES)console.log('FIT_TIME',size.name,label,Math.round(performance.now()));"));
});

console.log(JSON.stringify({ok:!process.exitCode,passed}));
