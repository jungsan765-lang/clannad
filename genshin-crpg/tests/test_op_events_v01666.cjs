'use strict';
// 0.16.66 운영자 이벤트 (user, 2026-10-18: 「중반 재료 벽을 오히려 이벤트같은곳에서 뿌려주면 되겠지. 한번 운영자 이벤트 아이디어좀 생각해서
// 만들어봐」): the four kinds in the engine (runtime_reading.js, the end). The server side is tests/test_op_events_server_v01666.mjs.
const assert=require('node:assert/strict');
const {fresh,c,R,db,advance}=require('./helpers_v011.cjs');
const {flags}=require('../tools/audit_balance_v01522.cjs');
const api=c.CRPGRuntime,cp=x=>JSON.parse(JSON.stringify(x));
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.log('FAIL '+name);console.log(e);}};
const open=(r,kind,id='EVT_1000001')=>{const t=r.actionStartedAt??c.Date.now();r.opServerEvents=[{id,kind,startsAt:t-1000,endsAt:t+7*86400000}];};
function ready(map){const r=fresh(map);r.adminApply({op:'level',target:'ALL',value:60});flags(r);r.s.domainDaily={day:api.growthV01522.dayOf(r.leyLineNow()),wins:3};return r;}
function settle(r){for(const a of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))a.hp=0;return r.finishBattle(true);}
function ley(r,kind,tier){const map=r.s.global.CURRENT_MAP_ID;let hour=r.leyLineHour();while(!api.leyLines.sitesAt(hour).some(s=>s.map===map&&s.kind===kind))hour++;
 const at=hour*3600000+60000;advance(Math.max(0,at-c.Date.now()));r.actionStartedAt=at;const route=api.leyLines.route(kind,map);r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});r.action('BOSS_ROUTE',{route,entry:'DIRECT',tier});return {hour,route};}

check('the kinds, their words and the exchange list are the engine\'s own',()=>{
 const k=api.opEventsV01666;assert.deepEqual(Object.keys(k.kinds),['LEY_DOUBLE','DOMAIN_SUPPLY','BOSS_DOUBLE','FESTIVAL']);
 for(const x of Object.values(k.kinds))assert(x.name&&x.text);assert.deepEqual(cp(k.tokens),{win:2,life:1,event:5,commission:5});
 const r=fresh();assert.deepEqual(cp(r.opEvents()),[],'nothing without the server');open(r,'LEY_DOUBLE');assert.equal(r.opEvent('LEY_DOUBLE').name,'지맥 보상 2배');
 r.opServerEvents=[{id:'EVT_1',kind:'LEY_DOUBLE',startsAt:0,endsAt:1}];assert.deepEqual(cp(r.opEvents()),[],'an ended event does nothing');
 r.opServerEvents=[{id:'EVT_1',kind:'constructor',startsAt:0,endsAt:Date.now()*2}];assert.deepEqual(cp(r.opEvents()),[],'only the four kinds');
});
check('지맥 보상 2배: a blossom pays twice, three times a day; the result says so',()=>{
 let r=ready('MAP_MOND_PLAINS');const {hour}=ley(r,'REVELATION',5);r=new R(db,cp(r.s));r.actionStartedAt=hour*3600000+60000;open(r,'LEY_DOUBLE');
 const x=settle(r);assert.equal(x.loot.MAT_CHAR_EXP_HERO,720,'360 twice');assert.deepEqual(cp(x.opEvents),[{kind:'LEY_DOUBLE',name:'지맥 보상 2배',used:1,limit:3}]);
 assert.equal(r.opEventUsesLeft('LEY_DOUBLE'),2);assert.equal(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).opEvents[0].used,1);
 r.s.opEvent.uses.LEY_DOUBLE=3;assert.equal(r.opEventUsesLeft('LEY_DOUBLE'),0);
 let q=ready('MAP_MOND_PLAINS');const w=ley(q,'WEALTH',5);q=new R(db,cp(q.s));q.actionStartedAt=w.hour*3600000+60000;open(q,'LEY_DOUBLE');assert.equal(settle(q).mora,74000,'37,000 twice');
});
check('비경 보급: the doubled material wins go from three to six',()=>{
 const r=ready('MAP_D163_TAISHAN_MANSION');const d={kind:'TALENT',key:'TAISHAN_MANSION',level:60,id:'TAISHAN_MANSION:60',version:4},day=api.growthV01522.dayOf(r.leyLineNow());
 r.s.domainDaily={day,wins:3};const plain=r.growthDomainRewards(d,'NEUTRAL',day);assert.equal(plain.bonus,false);
 open(r,'DOMAIN_SUPPLY');const ev=r.growthDomainRewards(d,'NEUTRAL',day);assert.equal(ev.bonus,true);for(const [id,n] of Object.entries(plain.items))assert.equal(ev.items[id],n*2);
 r.s.domainDaily={day,wins:6};assert.equal(r.growthDomainRewards(d,'NEUTRAL',day).bonus,false,'the seventh is plain again');
 r.s.domainDaily={day,wins:1};const first=r.growthDomainRewards(d,'NEUTRAL',day);assert.equal(first.opEvent,undefined,'the usual first three stay as they were (not four times)');
});
check('축제 교환: wins give tokens; the exchange pays the chosen item, keeps the limit and the cost',()=>{
 const r=fresh('MAP_MOND_CITY');r.adminApply({op:'level',target:'ALL',value:40});flags(r);open(r,'FESTIVAL','EVT_1000009');
 const group=r.rows('33_ENCOUNTER_GROUP_DB').find(x=>x[0]==='EG_MOND_SLIME_SMALL')||r.rows('33_ENCOUNTER_GROUP_DB')[0];r.startBattle(group[0],'EXPLICIT');
 const x=settle(r);assert.equal(x.festivalTokens,2);let shop=r.festivalShop();assert.equal(shop.tokens,2);assert.equal(shop.event,'EVT_1000009');
 assert(shop.items.find(i=>i.key==='GEM_2').choices.includes('PYRO'));assert(shop.items.find(i=>i.key==='BOSS').choices.length>=6);
 assert.equal(r.actionReason('EVENT_EXCHANGE',{event:'EVT_1000009',item:'HERO'}),'축제 증표가 모자랍니다.');
 r.s.opEvent.fest.tokens=r.s.opEvent.fest.earned=300;const before=r.itemCount('GROWTH_GEM_PYRO_2');
 const out=r.action('EVENT_EXCHANGE',{event:'EVT_1000009',item:'GEM_2',choice:'PYRO',n:2}).result;assert.equal(r.itemCount('GROWTH_GEM_PYRO_2')-before,2);assert.equal(out.tokens,260);
 assert.equal(r.actionReason('EVENT_EXCHANGE',{event:'EVT_1000009',item:'GEM_2',choice:'constructor'}),'받을 종류를 골라 주세요.');
 assert.equal(r.actionReason('EVENT_EXCHANGE',{event:'EVT_1000009',item:'GEM_3',choice:'PYRO',n:5}),'이번 이벤트에서 더 바꿀 수 없습니다.');
 assert.equal(r.actionReason('EVENT_EXCHANGE',{event:'EVT_OTHER',item:'HERO'}),'이벤트가 바뀌었습니다. 다시 열어 주세요.');
 const mora=r.s.global.MORA;r.action('EVENT_EXCHANGE',{event:'EVT_1000009',item:'MORA',n:3});assert.equal(r.s.global.MORA-mora,15000);
 const s=cp(r.s);assert.equal(new R(db,s).s.opEvent.fest.bought.GEM_2,2,'the record reloads');
 const bad=cp(r.s);bad.opEvent.fest.tokens=bad.opEvent.fest.earned+1;assert.throws(()=>new R(db,bad),/이벤트 기록이 올바르지 않습니다/);
 // a new event starts its own tokens; without the event the shop is gone
 open(r,'FESTIVAL','EVT_1000010');assert.equal(r.festivalShop().tokens,0);r.opServerEvents=[];assert.equal(r.festivalShop(),null);assert.equal(r.actionReason('EVENT_EXCHANGE',{event:'EVT_1000010',item:'HERO'}),'열린 축제 교환이 없습니다.');
});
check('강적 토벌 보상 2배: a boss win pays its items and Mora twice (not the level-cap books), three times a day',()=>{
 const r=fresh('MAP_MOND_CITY');r.adminApply({op:'level',target:'ALL',value:40});flags(r);open(r,'BOSS_DOUBLE');
 const group=r.rows('33_ENCOUNTER_GROUP_DB').find(x=>x[0]==='EG_MOND_SLIME_SMALL')||r.rows('33_ENCOUNTER_GROUP_DB')[0];r.startBattle(group[0],'EXPLICIT');r.s.runtime.origin='MATERIAL_CHALLENGE:TEST';
 // what the plain fight pays, from the same save without the event
 const twin=new R(db,cp(r.s));const plain=settle(twin);const before=r.s.global.MORA,x=settle(r);
 assert.equal(x.opEvents?.[0]?.kind,'BOSS_DOUBLE');assert.equal(x.opEvents[0].used,1);assert.equal(x.mora,(plain.mora||0)*2);
 for(const [id,n] of Object.entries(plain.loot||{}))if(!/^MAT_CHAR_EXP_/.test(id))assert.equal(x.loot[id],n*2,id);
 assert.equal(r.opEventUsesLeft('BOSS_DOUBLE'),2);
});
check('축제 교환: a finished gathering gives a token (counted from the save before and after the action)',()=>{
 const r=fresh('MAP_MOND_PLAINS');r.die=()=>100;r.s.global.ENCOUNTER_COOLDOWN=0;open(r,'FESTIVAL','EVT_1000011');r.action('LIFE_START',{kind:'GATHER'});
 const job=cp(r.s.lifeJob),scene=cp(r.lifeScene()),inputs=scene.nodes.map((n,i)=>({at:400+i*250,node:i})),elapsed=inputs.at(-1).at+200;advance(elapsed);
 const before=r.festivalShop().tokens,out=r.action('LIFE_FINISH',{job:job.id,inputs,elapsed}).result;assert.equal(r.festivalShop().tokens-before,1);assert.equal(out.festivalTokens,1);
});
console.log(JSON.stringify({ok:!process.exitCode,total:6,passed}));
