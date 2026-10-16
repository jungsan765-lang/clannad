'use strict';
// 0.16.57 (user, 2026-10-17: 「무상의 뇌전같은 다른 무상 애들은 왜 핵 닫히는게 없노? 그리고 기본적으로 뇌광 프리즘을 유저가 '타겟'으로 두는
// 연습을 시키는거라서 평시에는 보스 공격하는 타겟으로 두게 해야지」, 「무상의 얼음은... 어케하는건지 잘 모르겟네.. … 컨트롤 하는 느낌이 잘
// 안든달까」, 「전초부터 도전은 근데 뭐야? 일부러 둔거야?」, 「안드리우스는 체력이 왜이렇게 낮지?」 → 「없애고 일일 보스만」, 「운영자도구에
// 필드보스 횟수 초기화 말고도 일일보스 초기화도 좀 넣어줘」). Every action copies the save, so the checks read the fight again after each.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),H=require('../tools/audit_protagonist_v01618.cjs');
const ROOT=path.resolve(__dirname,'..'),env=H.load(ROOT),api=env.api,FB=api.fieldBosses,src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const S=r=>r.s.runtime,boss=r=>S(r)?.actors.find(a=>a.fb),me=r=>S(r)?.actors.find(a=>a.source==='PLAYER_CUSTOM'),plain=x=>JSON.parse(JSON.stringify(x));
function field(id){const r=H.setup(env,{level:FB.levels[id],route:'ROUTE_ISEKAI',team:['MOND_AMBER','MOND_NOELLE','MOND_BARBARA'],seed:717,map:FB.bosses[id].map,enhance:3,talent:4});
 r.action('PLACE_ENTER',{place:'BOSS:'+FB.route(id),mode:'BOSS'});r.action('BOSS_ROUTE',{route:FB.route(id),entry:'DIRECT'});r.die=()=>50;r.random=()=>.5;if(S(r).opening?.state==='PENDING')r.action('COMBAT_BEGIN');return r;}
// one boss action in isolation: a new turn of its own
const bossActs=(r,x)=>{x.fb.endTurn=null;x.turns=(x.turns||0)+1;r.fieldBossTurn(x);};

check('무상의 뇌전·바위·얼음: a new fight keeps the core shut until the first attack; attacks open it, a wind-up shuts it',()=>{
 for(const id of ['FB_ELECTRO_HYPOSTASIS','FB_GEO_HYPOSTASIS','FB_CRYO_HYPOSTASIS']){const r=field(id),b=S(r),x=boss(r);assert.equal(b.fieldBoss.coreRevision,1,id);assert.equal(r.fbCoreShut(x),true,id+' shut at the start');
  assert.match(r.fieldBossBarrierReason(me(r),x,'불'),/핵이 닫혀 있다/);
  const rot={FB_ELECTRO_HYPOSTASIS:0,FB_GEO_HYPOSTASIS:0,FB_CRYO_HYPOSTASIS:0}[id];x.fb.rot=rot;x.fb.next=null;bossActs(r,x);assert.equal(x.fb.coreOpen,true,id+' opened by an attack');assert.equal(r.fbCoreShut(x),false);
  const wind={FB_ELECTRO_HYPOSTASIS:2,FB_GEO_HYPOSTASIS:1,FB_CRYO_HYPOSTASIS:1}[id];x.fb.rot=wind;bossActs(r,x);assert.ok(x.fb.next,id+' winds up');assert.equal(r.fbCoreShut(x),true,id+' shut while winding up');
  assert(b.log.some(l=>/핵이 닫혔다/.test(l.text||'')),id+' says so');
  // the protagonist's exposing skill or a stun opens it
  x.fb.exposedUntil=b.round;assert.equal(r.fbCoreShut(x),false);x.fb.exposedUntil=0;x.fb.stunned=true;assert.equal(r.fbCoreShut(x),false);x.fb.stunned=false;
  // a boss held back (not acting) does not keep it shut past the following round
  b.round=x.fb.coreShutRound+2;assert.equal(r.fbCoreShut(x),false,id+' opens by itself');}
 const anemo=field('FB_ANEMO_HYPOSTASIS');assert.equal(S(anemo).fieldBoss.coreRevision,undefined,'무상의 바람 keeps its own rule');
});
check('a fight saved before 0.16.57 has no shut core (its rules stay)',()=>{
 const r=field('FB_ELECTRO_HYPOSTASIS'),save=plain(JSON.parse(r.serialize()));delete save.runtime.fieldBoss.coreRevision;for(const a of save.runtime.actors)if(a.fb)delete a.fb.coreShutRound;
 const x=new api.Runtime(env.db,save);assert.equal(x.fbCoreShut(boss(x)),false);
 const bad=plain(JSON.parse(r.serialize()));bad.runtime.fieldBoss.coreRevision=2;assert.throws(()=>new api.Runtime(env.db,bad),e=>e.code==='FIELD_BOSS_SAVE');
});
check('무상의 얼음: in a core fight its 얼음 벽 is a shell over the core (no shield) until its next attack; a fight saved before keeps the wall',()=>{
 const r=field('FB_CRYO_HYPOSTASIS'),x=boss(r);x.fb.rot=3;x.fb.next=null;x.shields=[];bossActs(r,x);
 assert.equal((x.shields||[]).filter(s=>s.source==='FB_ICE_WALL').length,0,'no ice wall shield');assert.equal(x.fb.wallShut,true);assert.equal(r.fbCoreShut(x),true);assert(S(r).log.some(l=>l.label==='얼음 껍질'||/얼음 껍질/.test(l.text||'')));
 x.fb.rot=0;bossActs(r,x);assert.equal(r.fbCoreShut(x),false,'the next attack opens it');assert.equal(x.fb.wallShut,undefined);
 const old=plain(JSON.parse(r.serialize()));delete old.runtime.fieldBoss.coreRevision;for(const a of old.runtime.actors)if(a.fb){delete a.fb.coreShutRound;delete a.fb.wallShut;}const o=new api.Runtime(env.db,old),ox=boss(o);ox.fb.rot=3;ox.fb.next=null;ox.shields=[];bossActs(o,ox);
 assert.equal((ox.shields||[]).some(s=>s.source==='FB_ICE_WALL'),true,'the old wall');
 // the gimmick words follow the fight
 const v=r.fieldBossView();assert(v);assert(api.fieldBossCore.kinds.includes('CRYO_HYPO'));
});
check('HP ×2 for 무상의 뇌전·바위 (their shut core), ×3 for 무상의 얼음',()=>{const L=api.bossLengthV01653;assert.equal(L.byBoss.FB_ELECTRO_HYPOSTASIS.hp,2);assert.equal(L.byBoss.FB_ELECTRO_HYPOSTASIS.atk,.55);assert.equal(L.byBoss.FB_GEO_HYPOSTASIS.hp,2);assert.equal(L.byBoss.FB_CRYO_HYPOSTASIS,undefined);assert.equal(L.hp,3);});
check('the attack target is the boss until one is picked; a prism is picked by hand (solo and co-op)',()=>{
 const code=src('source/app_experience.js'),fn=code.match(/function defaultTarget\(card,actors\)\{[^\n]*\}/)[0],ctx={};vm.createContext(ctx);vm.runInContext(fn+';this.f=defaultTarget;',ctx);
 const actors=[{id:'P1',side:'ENEMY',fbSummon:{kind:'FB_SUMMON_PRISM'}},{id:'P2',side:'ENEMY',fbSummon:{kind:'FB_SUMMON_PRISM'}},{id:'B',side:'ENEMY',fb:{kind:'ELECTRO'}},{id:'M',side:'ENEMY'}];
 assert.equal(ctx.f({targets:[{id:'P1'},{id:'P2'},{id:'B'}]},actors),'B');assert.equal(ctx.f({targets:[{id:'P1'},{id:'M'}]},actors),'M');assert.equal(ctx.f({targets:[{id:'P1'},{id:'P2'}]},actors),'P1');assert.equal(ctx.f({targets:[]},actors),null);
 assert.match(code,/selectedTarget=defaultTarget\(chosen,b\?\.actors\)/);assert.match(src('source/app_coop_v0153.js'),/C\.target=window\.CRPGDefaultTarget\?\.\(chosen,v\.state\?\.runtime\?\.actors\)/);
});
check('안드리우스·야타용왕: the old route (보스에게 도전 / 전초전부터 도전) is gone; the daily boss opens with the story or a past route win',()=>{
 const r=H.setup(env,{level:30,route:'ROUTE_ISEKAI',team:['MOND_AMBER','MOND_NOELLE','MOND_BARBARA'],seed:717,map:'MAP_WOLF_ARENA'});
 assert.equal(r.placeCatalog().some(e=>['BRT_ANDRIUS','BRT_AZHDAHA'].includes(e.route)),false);assert.match(r.placeBossReason('BRT_ANDRIUS','DIRECT'),/일일 보스/);assert.match(r.placeBossReason('BRT_AZHDAHA','GAUNTLET'),/일일 보스/);
 assert.throws(()=>r.action('PLACE_ENTER',{place:'BOSS:BRT_ANDRIUS',mode:'BOSS'}));
 const gate=r.growthStoryGate(2).ready;assert.equal(r.materialChallengeReason('BOSS_ANDRIUS'),gate?'':'몬드 본편을 마치면 열립니다.');
 r.s.flags.FLAG_BOSS_ANDRIUS_CLEAR=true;assert.equal(r.materialChallengeReason('BOSS_ANDRIUS'),'','a past route win still opens it');delete r.s.flags.FLAG_BOSS_ANDRIUS_CLEAR;
 r.growthStoryGate=p=>({ready:p===2||p===5,label:''});assert.equal(r.materialChallengeReason('BOSS_ANDRIUS'),'','몬드 본편 완료');assert.equal(r.liyueArtifactUnlocked('AZHDAHA'),true,'리월 본편 3장');
 r.growthStoryGate=()=>({ready:false,label:''});assert.equal(r.liyueArtifactUnlocked('AZHDAHA'),false);r.s.global.CURRENT_MAP_ID='MAP_AZHDAHA_DOMAIN';assert.equal(r.liyueArtifactFarmReason('AZHDAHA'),'리월 본편 3장을 마치면 열립니다.');
 // a half-done route is put away on load; one going on finishes as it began
 const s=plain(JSON.parse(r.serialize()));s.bossRouteProgress={route:'BRT_ANDRIUS',step:1,phase:'AWAIT_NEXT',entry:'GAUNTLET',placeEntrySchema:1,mutation:false};s.global.ACTIVE_BOSS_ROUTE_ID='BRT_ANDRIUS';s.global.BOSS_ROUTE_STEP=1;
 const x=new api.Runtime(env.db,s);assert.equal(x.s.bossRouteProgress,undefined);assert.equal(x.s.global.ACTIVE_BOSS_ROUTE_ID,'');
});
check('운영자 도구: 일일 보스 초기화 opens today\'s daily boss again',()=>{
 assert.match(src('source/admin.js'),/일일 보스 초기화',\(\)=>change\(\[\{op:'daily_boss_reset'\}\]\)/);assert.match(src('source/runtime_admin_v01412.js'),/case 'daily_boss_reset':\{delete this\.s\.bossRealAdmissions;/);
 const r=H.setup(env,{level:30,route:'ROUTE_ISEKAI',team:['MOND_AMBER','MOND_NOELLE','MOND_BARBARA'],seed:717,map:'MAP_WOLF_ARENA'});r.s.bossRealAdmissions={BOSS_ANDRIUS:r.bossRealDay()};assert.match(r.bossAdmission('BOSS_ANDRIUS').reason,/하루에 한 번/);
 const out=r.adminApply?r.adminApply({op:'daily_boss_reset'}):null;if(out!==null){assert.equal(r.s.bossRealAdmissions,undefined);assert.equal(r.bossAdmission('BOSS_ANDRIUS').reason,'');}
});
check('서리 열매 치기 is walked, picked up and thrown; reading the aim line breaks the shield about half the time, throwing blindly rarely',()=>{
 let code=src('source/app_bossgames_v01646.js');code=code.replace('window.CRPGFieldBossMinigames={version:1,','window.__GAMES=GAMES;window.__KIND=KIND;window.CRPGFieldBossMinigames={version:1,');
 const hook='  return{\n   update(dt,t,inp){\n    lastT=t;frozen=';assert(code.includes(hook));code=code.replace(hook,'  return{state:()=>({P,ground,carry,shards,spikes,blocked,angTo,flight}),\n   update(dt,t,inp){\n    lastT=t;frozen=');
 const el=()=>({append(){},setAttribute(){},style:{setProperty(){}},dataset:{},addEventListener(){},classList:{add(){}}});
 const ctx={document:{createElement:el,head:{append(){}},body:{append(){}},hidden:false},matchMedia:()=>({matches:false}),navigator:{maxTouchPoints:0},act:()=>{},combat:()=>{},battleStatusList:()=>[],game:null,busy:false,performance:{now:()=>0},requestAnimationFrame:()=>0,cancelAnimationFrame(){},console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(code,ctx);
 const K=ctx.__KIND.FROST_FRUIT;assert.equal(K.move,true);assert.equal(K.fire,true);assert(K.chips({need:3,shots:4}).some(c=>/줍기/.test(c)));assert.equal(api.fieldBossControl.rules.FROST_FRUIT.seconds,14);
 const rng=seed=>{let a=(Number(seed)>>>0)||1;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
 const play=(seed,mode)=>{const g=ctx.__GAMES.FROST_FRUIT({need:3,fruits:6,shots:4,seconds:14,seed},rng(seed)),me=rng(seed+1),inp={keys:new Set(),pad:[0,0],point:null,down:false,taps:[],fire:0};let next=0;
  for(let t=0;t<14&&!g.over();t+=1/60){inp.taps=[];const q=g.state();if(t>=next){next=t+.18;inp.pad=[0,0];const danger=q.spikes.find(s=>!s.up&&s.life>.25&&Math.hypot(s.x-q.P.x,s.y-q.P.y)<44);
   if(danger){const dx=q.P.x-danger.x,dy=q.P.y-danger.y,n=Math.hypot(dx,dy)||1;inp.pad=[dx/n,dy/n];}
   else if(!q.carry){const f=q.ground.slice().sort((a,b)=>Math.hypot(a.x-q.P.x,a.y-q.P.y)-Math.hypot(b.x-q.P.x,b.y-q.P.y))[0];if(f){const dx=f.x-q.P.x,dy=f.y-q.P.y,n=Math.hypot(dx,dy)||1;inp.pad=[dx/n,dy/n];}}
   else if(mode==='blind'?me()<.5:!q.blocked(q.angTo(),q.flight()+.09))inp.fire=1;}g.update(1/60,t,inp);}return g.result().hits;};
 let aim=0,blind=0;for(let s=1;s<=60;s++){if(play(s*7919,'aim')>=3)aim++;if(play(s*7919,'blind')>=3)blind++;}
 console.log(JSON.stringify({frostFruitBreaks:{aim,blind,of:60}}));assert(aim>=18&&aim<=48,'aim '+aim);assert(blind<=15,'blind '+blind);assert(aim>blind*2);
});
console.log(JSON.stringify({passed,ok:!process.exitCode}));
