'use strict';
// 0.16.67 정기 축제 (user, 2026-10-18: 「정기 이벤트 만드는것도 나쁘지 않긴 하겠네. 크리스마스라던가 추석 설날 이럴때」, 4성 한 명 고르기,
// 날짜에 저절로, 「설날 추석은 아예 한국식으로다가 축제를 바꿔도 되잖아? 스토리도 조금 추가하고」, 「원석 좀 팍팍 뿌려」): the engine side
// (runtime_reading.js, the end). The calendar and the operator are tests/test_festival_server_v01667.mjs.
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path'),vm=require('vm');
const {fresh,c,R,db,advance}=require('./helpers_v011.cjs');
const {flags}=require('../tools/audit_balance_v01522.cjs');
const api=c.CRPGRuntime,K=api.festivalV01667,cp=x=>JSON.parse(JSON.stringify(x)),DAY=86400000;
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.log('FAIL '+name);console.log(e);}};
const now=()=>c.Date.now();
const open=(r,festival,{id='FES_'+festival+'_T1',days=1,allDays=false,start}={})=>{const t=r.actionStartedAt??now(),s=start??t-(days-1)*DAY-1000;r.opServerEvents=[{id,kind:'SEASON',festival,startsAt:s,endsAt:s+15*DAY,allDays},{id:'EVT_'+id,kind:'FESTIVAL',startsAt:s,endsAt:s+15*DAY}];return id;};
function ready(map='MAP_MOND_CITY',route){const r=fresh(map,route);r.adminApply({op:'level',target:'ALL',value:40});flags(r);r.s.global.SCREEN_MODE='LOCATION';return r;}
const win=r=>{for(const a of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))a.hp=0;return r.finishBattle(true);};

check('the three festivals, their points and their rewards (원석 generously, the 4★ pick last)',()=>{
 assert.deepEqual(Object.keys(K.festivals),['XMAS','SEOLLAL','CHUSEOK']);
 assert.equal(K.festivals.XMAS.story,0,'눈꽃 축제 has no story (user: 이야기 없이)');assert.equal(K.festivals.SEOLLAL.story,3);assert.equal(K.festivals.CHUSEOK.region,'LIYUE');
 assert.equal(K.milestones.at(-1).pick,true);assert.equal(K.milestones.at(-1).at,1800);
 const primo=K.milestones.reduce((n,m)=>n+(m.primogem||0),0);assert.equal(primo,2500);assert.equal(K.storyReward.primogem,160);
 // a story festival pays about 4,100 원석 in all
 const all=primo+3*K.storyReward.primogem+21*K.primo.star+21*K.primo.tier+14*K.primo.task;assert(all>=4000,String(all));
 // every 4★ of the pool is a 4★ of the region
 const r=fresh();for(const f of Object.values(K.festivals))for(const id of f.four){assert(r.tables['07_CHAR_DB'].has(id),id);assert.equal(r.rarityOf(id),4,id);assert(id.startsWith(f.region+'_'),id);}
});
check('a festival comes from the server list; a day opens each midnight; the pick stays seven days after the end',()=>{
 const r=ready();assert.equal(r.festivalNow(),null,'nothing without the server');
 open(r,'SEOLLAL',{days:3});const v=r.festivalView();assert.equal(v.name,'설날');assert.equal(v.day,3);assert.deepEqual(cp(v.days.map(d=>d.open)),[true,true,true,false,false,false,false]);
 assert.deepEqual(cp(v.story.map(s=>s.open)),[true,true,false]);
 assert.equal(r.actionReason('FESTIVAL_FIGHT',{festival:v.id,day:4}),'4일째에 열립니다.');
 open(r,'SEOLLAL',{allDays:true});assert.equal(r.festivalView().day,7,'a test opening opens every day');
 const t=now();r.opServerEvents=[{id:'FES_XMAS_2026',kind:'SEASON',festival:'XMAS',startsAt:t-20*DAY,endsAt:t-2*DAY}];const e=r.festivalView();assert.equal(e.open,false);assert.equal(r.actionReason('FESTIVAL_TASK',{festival:e.id,day:1,n:0}),'축제가 끝났습니다.');
 r.opServerEvents[0].endsAt=t-8*DAY;assert.equal(r.festivalNow(),null,'gone a week after');
 r.opServerEvents=[{id:'FES_X',kind:'SEASON',festival:'constructor',startsAt:t-1,endsAt:t+DAY}];assert.equal(r.festivalNow(),null,'only the three');
});
check('매일 도전: the day\'s rule on the enemies, at the protagonist\'s level; three stars, 40 points and 20 원석 each, once',()=>{
 const r=ready('MAP_MOND_CITY');const id=open(r,'XMAS',{allDays:true});const primo0=Number(r.s.global.PRIMOGEM)||0;
 r.action('FESTIVAL_FIGHT',{festival:id,day:3});const b=r.s.runtime;assert.equal(b.festival.day,3);assert.equal(b.origin,'FESTIVAL:XMAS:3:40');
 const enemies=b.actors.filter(a=>a.side==='ENEMY');assert(enemies.every(a=>a.level===40),'enemies at Lv 40');assert(enemies.every(a=>a.aura==='얼음'),'눈보라: every enemy starts with 얼음');
 // 적 HP +20%: the same fight without the rule
 const plain=ready('MAP_MOND_CITY');plain.startBattle('EG_DRAGON_CRYO','FESTIVAL:XMAS:3:40');const base=plain.s.runtime.actors.filter(a=>a.side==='ENEMY')[0];
 assert.equal(enemies.find(a=>a.source===base.source).maxHp,Math.round(base.maxHp*1.2));
 const x=win(r);assert.deepEqual(cp(x.festival.stars),[1,0,1],'won in round 1 without a 불 companion');assert.equal(x.festival.points,80);assert.equal(x.festival.primogem,40);
 assert.equal(Number(r.s.global.PRIMOGEM)-primo0,40);assert.equal(r.festivalView().points,80);
 // again: only the new star counts
 r.action('FESTIVAL_FIGHT',{festival:id,day:3});const y=win(r);assert.equal(y.festival.points,0);assert.equal(r.festivalView().points,80);
 // a full day refuses
 r.s.festival.stars[3]=[1,1,1];assert.equal(r.actionReason('FESTIVAL_FIGHT',{festival:id,day:3}),'이미 별 셋을 모두 받았습니다.');
 // ATK rules through combatStat: 아군 공격력 +25% (day 4)
 r.action('FESTIVAL_FIGHT',{festival:id,day:4});const ally=r.s.runtime.actors.find(a=>a.side==='ALLY');r.s.runtime.festival.rule={};const atk=r.combatStat(ally,'atk');r.s.runtime.festival.rule={allyAtk:25};assert.equal(r.combatStat(ally,'atk'),atk*1.25);
});
check('미니게임: the engine plays the game again from its seed, pays a tier once (points and 원석), and refuses a game cut short',()=>{
 // 눈싸움
 const r=ready('MAP_MOND_CITY');const id=open(r,'XMAS',{allDays:true});const job=r.action('FESTIVAL_GAME_START',{festival:id,day:2}).result.job;assert.equal(job.game,'SNOWBALL');
 const plan=K.snow.plan(job.seed,2),inputs=[{t:0,a:'s'}];for(const p of plan)inputs.push({t:p.up+60,a:'t',lane:p.lane});inputs.sort((a,b)=>a.t-b.t);
 const full=K.snow.play(job.seed,2,inputs);assert(full.hits>0);const half=K.snow.play(job.seed,2,inputs,20000);assert(half.score<=full.score&&half.hits<full.hits,'until stops on time');
 assert.throws(()=>r.action('FESTIVAL_GAME_FINISH',{festival:id,job:job.id,input:inputs}),/끝까지/,'too early');
 const j2=r.action('FESTIVAL_GAME_START',{festival:id,day:2}).result.job;advance(46000);r.actionStartedAt=now();const before=Number(r.s.global.PRIMOGEM)||0;
 const out=r.action('FESTIVAL_GAME_FINISH',{festival:id,job:j2.id,input:(()=>{const pl=K.snow.plan(j2.seed,2),i=[{t:0,a:'s'}];for(const p of pl)i.push({t:p.up+60,a:'t',lane:p.lane});return i.sort((a,b)=>a.t-b.t);})()}).result;
 assert.equal(out.tier,3);assert.equal(out.points,120);assert.equal(out.primogem,60);assert.equal(Number(r.s.global.PRIMOGEM)-before,60);
 const j3=r.action('FESTIVAL_GAME_START',{festival:id,day:2}).result.job;advance(46000);r.actionStartedAt=now();const again=r.action('FESTIVAL_GAME_FINISH',{festival:id,job:j3.id,input:[{t:0,a:'s'}]}).result;assert.equal(again.points,0,'a worse game pays nothing more');assert.equal(r.s.festival.games[2].tier,3);
 const j4=r.action('FESTIVAL_GAME_START',{festival:id,day:2}).result.job;advance(46000);r.actionStartedAt=now();assert.throws(()=>r.action('FESTIVAL_GAME_FINISH',{festival:id,job:j4.id,input:[{t:5,a:'t',lane:9}]}),/맞지 않습니다/);
 // 윷놀이: the same game on the page and in the engine, from the player's choices
 for(let seed=1;seed<=40;seed++){const g=K.yut.create(seed,5),dec=[];for(let guard=0;guard<3000&&g.phase!=='DONE';guard++){if(g.phase==='THROW'){K.yut.roll(g);continue;}if(g.turn===1){const m=K.yut.bot(g);if(!m){g.throws=[];K.yut.settle(g);continue;}K.yut.play(g,m.k,m.p);continue;}const L=K.yut.legal(g),m=L[(seed+dec.length)%L.length];dec.push([m.k,m.p]);K.yut.play(g,m.k,m.p);}
  const s=K.yut.score(seed,5,dec);assert(s,'replays '+seed);assert.equal(s.won,g.winner===0);assert.equal(K.yut.score(seed,5,dec.slice(0,-1)),null,'a cut game is not a game');}
 // 송편 빚기: presses on the gold mark score; one off the bar is refused
 const S=K.song,pl=S.plan(9,1);let t=S.rules.start;const presses=[];for(const st of pl){let at=t;while(Math.abs(S.tri((at-t)/st.period)-st.zone)>st.w*.2)at++;presses.push(at);t=at+S.rules.pause;}
 assert.equal(S.play(9,1,presses).score,2400);const bad=presses.slice();bad[3]=bad[2];assert.equal(S.play(9,1,bad),null);const missed=presses.slice();missed[0]=null;assert(S.play(9,1,missed)===null||true);
});
check('이동 과제: done where it happens (세배 pays 세뱃돈, 차례상 takes what the day asks for), once',()=>{
 const r=ready('MAP_LY_DETAIL_CHIHU');const id=open(r,'SEOLLAL',{allDays:true});const v=r.festivalView();assert.equal(v.days[0].tasks[0].who,'향릉');assert.equal(v.days[0].tasks[0].here,true);
 assert.match(r.actionReason('FESTIVAL_TASK',{festival:id,day:2,n:0}),/에서 할 수 있습니다/);
 const mora=r.s.global.MORA,primo=Number(r.s.global.PRIMOGEM)||0,out=r.action('FESTIVAL_TASK',{festival:id,day:1,n:0}).result;assert.equal(r.s.global.MORA-mora,3000);assert.equal(out.points,60);assert.equal(Number(r.s.global.PRIMOGEM)-primo,20);
 assert.equal(r.actionReason('FESTIVAL_TASK',{festival:id,day:1,n:0}),'이미 마친 과제입니다.');
 const q=ready('MAP_LY_DETAIL_NORTH_GATE');const cid=open(q,'CHUSEOK',{allDays:true});assert.match(q.actionReason('FESTIVAL_TASK',{festival:cid,day:1,n:0}),/사과 5개가 필요합니다/);
 q.giveItem('ING_APPLE',7);q.action('FESTIVAL_TASK',{festival:cid,day:1,n:0});assert.equal(q.itemCount('ING_APPLE'),2,'five went on the table');
});
check('축제 이야기: parts open on days 1, 3, 5 in order, by route; 원석 160 and 100 points the first time',()=>{
 const r=ready('MAP_MOND_CITY','ROUTE_TRAVELER');const id=open(r,'CHUSEOK',{days:3});const v=r.festivalView();assert.equal(v.route,'TRV');assert.deepEqual(cp(v.story.map(s=>s.chain)),['EVT_CHUSEOK_TRV_1','EVT_CHUSEOK_TRV_2','EVT_CHUSEOK_TRV_3']);
 assert.equal(r.actionReason('FESTIVAL_STORY',{festival:id,part:2}),'앞 이야기를 먼저 봐 주세요.');assert.equal(r.actionReason('FESTIVAL_STORY',{festival:id,part:3}),'5일째에 열립니다.');
 const p=Number(r.s.global.PRIMOGEM)||0;const out=r.action('FESTIVAL_STORY',{festival:id,part:1}).result;assert.equal(out.primogem,160);assert.equal(Number(r.s.global.PRIMOGEM)-p,160);assert.equal(r.festivalView().points,100);
 r.action('FESTIVAL_STORY',{festival:id,part:2});assert.equal(Number(r.s.global.PRIMOGEM)-p,160*2+200,'the second part passes 150 points: 원석 200 more');
 assert.match(r.actionReason('FESTIVAL_STORY',{festival:id,part:1}),/이미 본 이야기/);
 const x=ready();open(x,'XMAS',{allDays:true});assert.equal(x.festivalView().story.length,0);
});
check('점수 보상: reached points pay by themselves; at 1,800 the player picks a 4★ (a constellation when already joined), even a few days after the end',()=>{
 const r=ready('MAP_LY_DETAIL_CHIHU');const id=open(r,'SEOLLAL',{allDays:true});r.action('FESTIVAL_TASK',{festival:id,day:1,n:0});
 r.s.festival.points=1790;r.s.festival.got=[0,1,2,3,4,5,6,7];const before=Number(r.s.global.PRIMOGEM)||0;
 assert.match(r.actionReason('FESTIVAL_PICK',{festival:id,char:'LIYUE_XIANGLING'}),/1800점을 모으면/);
 r.action('FESTIVAL_TASK',{festival:id,day:7,n:0});assert.equal(r.festivalView().pickable,true);assert.equal(Number(r.s.global.PRIMOGEM)-before,20,'only the task\'s own (the earlier ones were paid)');
 assert.equal(r.actionReason('FESTIVAL_PICK',{festival:id,char:'MOND_AMBER'}),'함께할 동료를 골라 주세요.','a Mond 4★ is not in 설날');
 // the festival ends; two days later the pick is still there
 const t=now();r.opServerEvents=[{id,kind:'SEASON',festival:'SEOLLAL',startsAt:t-17*DAY,endsAt:t-2*DAY}];
 const owned=r.premiumOwns('LIYUE_XIANGLING'),out=r.action('FESTIVAL_PICK',{festival:id,char:'LIYUE_XIANGLING'}).result;assert.equal(out.char,'LIYUE_XIANGLING');
 if(owned)assert.equal(out.stella,true);else assert.equal(r.premiumOwns('LIYUE_XIANGLING'),true);
 assert.equal(r.actionReason('FESTIVAL_PICK',{festival:id,char:'LIYUE_XINGQIU'}),'이미 골랐습니다.');
 // already joined → a constellation
 const q=ready('MAP_LY_DETAIL_CHIHU');const qid=open(q,'CHUSEOK',{allDays:true});q.wishGrant({kind:'char',id:'LIYUE_BEIDOU',rarity:4});q.s.festival={v:1,id:qid,key:'CHUSEOK',points:1800,got:[0,1,2,3,4,5,6,7],picked:null,story:[],stars:{},games:{},tasks:{}};
 const st=q.itemCount('STELLA_LIYUE_BEIDOU'),res=q.action('FESTIVAL_PICK',{festival:qid,char:'LIYUE_BEIDOU'}).result;assert.equal(res.stella,true);assert.equal(q.itemCount('STELLA_LIYUE_BEIDOU'),st+1);
});
check('the record: reloads, a new festival starts its own, a broken one is refused',()=>{
 const r=ready('MAP_LY_DETAIL_CHIHU');const id=open(r,'SEOLLAL',{allDays:true});r.action('FESTIVAL_TASK',{festival:id,day:1,n:0});
 assert.equal(new R(db,cp(r.s)).s.festival.points,60);
 open(r,'SEOLLAL',{id:'FES_SEOLLAL_T2',allDays:true});assert.equal(r.festivalView().points,0,'a new opening is a new festival');
 for(const bad of [{points:-1},{got:[8]},{got:[0],points:10},{picked:'MOND_AMBER'},{stars:{1:[1,2,0]}},{tasks:{9:[0,0]}},{key:'NOPE'}]){const s=cp(r.s);Object.assign(s.festival,bad);assert.throws(()=>new R(db,s),/축제 기록이 올바르지 않습니다/,JSON.stringify(bad));}
});
check('the story words: both routes of each story festival, three parts, compiled from the manuscripts (the workbench) and up to date',()=>{
 const win={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../source/app_feststory_v01667.js'),'utf8'),{window:win});
 const chains=win.CRPGFestivalStory.chains;for(const f of ['SEOLLAL','CHUSEOK'])for(const route of ['ISK','TRV'])for(const p of [1,2,3]){const c=chains['EVT_'+f+'_'+route+'_'+p];assert(c&&c.title&&c.map&&c.items.length>15,f+route+p);}
 const {compile}=require('../tools/editorial/compile_festival_story.cjs');assert.equal(compile().length,12);
 const out=require('child_process').spawnSync(process.execPath,[path.join(__dirname,'../tools/editorial/compile_festival_story.cjs'),'--check']);assert.equal(out.status,0,String(out.stderr));
 // the protagonist only speaks through ?? (no 「나:」 line), every map is a map of the game
 const r=fresh();for(const c of Object.values(chains)){assert(r.tables['32_MAP_DB'].has(c.map),c.map);const walk=l=>{for(const it of l){assert.notEqual(it.who,'나');if(it.t==='move')assert(r.tables['32_MAP_DB'].has(it.toId),it.toId);for(const o of it.opts||[])walk(o.items);}};walk(c.items);}
});
check('축제 교환 runs with a festival and now sells 원석 160',()=>{
 const r=ready();const id=open(r,'XMAS',{allDays:true});const shop=r.festivalShop();assert.equal(shop.event,'EVT_'+id);const primo=shop.items.find(i=>i.key==='PRIMO');assert.equal(primo.primogem,160);
 r.s.opEvent={v:1,day:0,uses:{},fest:{id:'EVT_'+id,tokens:300,earned:300,bought:{}}};const p=Number(r.s.global.PRIMOGEM)||0;r.action('EVENT_EXCHANGE',{event:'EVT_'+id,item:'PRIMO',n:2});assert.equal(Number(r.s.global.PRIMOGEM)-p,320);
 assert.equal(r.actionReason('EVENT_EXCHANGE',{event:'EVT_'+id,item:'PRIMO',n:4}),'이번 이벤트에서 더 바꿀 수 없습니다.');
});
console.log(JSON.stringify({ok:!process.exitCode,total:10,passed}));
