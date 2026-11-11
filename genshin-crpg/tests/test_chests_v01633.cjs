'use strict';
// 0.16.33 보물상자 (TODO 4-7): the 진귀한 보물상자 and three new kinds (도전, 원소 비석, 때를 맞춘 상자), 24 more in each region.
const assert=require('node:assert/strict');
const {c,fresh,advance}=require('./helpers_v011.cjs');
// 0.16.36: the clock starts on a Wednesday noon (Korean time), whatever hour or weekday the run begins (a run near midnight
// or on a Sunday night changed the day under the checks — see docs/WORKFLOW_309_CALENDAR_FIX_KO.md).
advance(Date.parse('2026-10-07T12:00:00+09:00')-c.Date.now());
const {fixture}=require('./helpers_abyss.cjs');
const api=c.CRPGRuntime,rules=api.chestRules,plain=x=>JSON.parse(JSON.stringify(x));
const results=[];
function check(name,fn){try{fn();results.push(name);console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const refused=(fn,pattern)=>{try{fn();}catch(e){if(pattern)assert.match(e.message,pattern);return true;}return false;};
const fight=r=>{for(let n=0;n<900&&r.s.runtime;n++){const b=r.s.runtime;if(b.opening?.state==='PENDING'){r.action('COMBAT_BEGIN');continue;}for(const a of b.actors)if(a.side==='ALLY')a.control='AI';r.autoUntilPlayer();}return JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON||'{}');};
const fresh4=map=>{const g=fresh(map);g.serverAdmin=true;g.action('OPERATOR_DEBUG',{op:'recruit',char:'ALL'});return g;};
const party=(g,ids)=>ids.forEach((char,i)=>g.action('PARTY',{slot:i+2,char}));

check('96 chests, 48 in each region; 7,845 원석 (Mond 3,540, Liyue 4,305; ×3 since 0.16.47, two plain hidden chests 0.16.65); 8 of each new kind per region',()=>{
 assert.equal(rules.chests.length,96);assert.equal(new Set(rules.chests.map(x=>x.id)).size,96);
 const by=r=>rules.chests.filter(x=>x.region===r),sum=r=>by(r).reduce((n,x)=>n+x.reward.primogem,0);
 assert.equal(sum('MOND'),3540);/* 0.16.65: the two hidden chests only pressed in the scenery are 평범한 (90 → 45 each) */assert.equal(sum('LIYUE'),4305);// 0.16.47: three times the 원석 (1,210 / 1,435 before)
 for(const r of ['MOND','LIYUE']){assert.equal(by(r).length,48);for(const k of ['CHALLENGE','TOTEM','TIME'])assert.equal(by(r).filter(x=>x.kind===k).length,8,r+' '+k);}
 assert.equal(rules.tiers.PRECIOUS.name,'진귀한 보물상자');assert.deepEqual(Object.keys(rules.tiers),['COMMON','EXQUISITE','PRECIOUS','LUXURIOUS']);
 assert(rules.chests.every(x=>x.reward.primogem<=120));
 const g=fresh();
 for(const x of rules.chests.filter(x=>x.kind)){assert(g.tables['32_MAP_DB'].has(x.map),x.id+' '+x.map);
  if(x.kind==='CHALLENGE')assert((g.encounterPoolRows(g.tables['32_MAP_DB'].get(x.map))||[]).length>0,x.id+' has monsters to fight');}
});

check('도전: the fight starts at its place; won within the rounds the chest stays there to open, once',()=>{
 const x=rules.chests.find(x=>x.kind==='CHALLENGE'&&x.map==='MAP_MOND_FOREST'),g=fresh4('MAP_MOND_CITY');g.action('OPERATOR_DEBUG',{op:'level',value:5});party(g,['MOND_AMBER','MOND_LISA','MOND_KAEYA']);
 assert(refused(()=>g.action('CHEST_OPEN',{chest:x.id}),/있는 곳에 가야/));
 g.action('OPERATOR_DEBUG',{op:'travel',map:x.map});
 assert.equal(plain(g.chestsHere('SCENERY')).find(v=>v.id===x.id)?.won,false,'a device in the scenery before the fight');
 const out=g.action('CHEST_OPEN',{chest:x.id});assert.equal(out.result.outcome,'BATTLE');assert.equal(g.s.runtime.chestChallenge.chest,x.id);assert.equal(g.s.runtime.chestChallenge.rounds,x.rounds);
 assert(refused(()=>g.action('CHEST_OPEN',{chest:x.id}),/전투를 마친 뒤/));
 g.validateSave(plain(g.s));
 const before=Number(g.s.global.PRIMOGEM)||0,res=fight(g);
 assert(res.victory,'a level-matched party wins');assert(res.chestChallenge.won,'within '+x.rounds+' rounds ('+res.chestChallenge.rounds+')');assert(g.chestWon(x.id));
 assert.equal(Number(g.s.global.PRIMOGEM)||0,before,'nothing is paid until the chest is opened');
 g.validateSave(plain(g.s));
 g.action('CHEST_OPEN',{chest:x.id});assert(g.chestOpened(x.id));assert(!g.chestWon(x.id));assert.equal((Number(g.s.global.PRIMOGEM)||0)-before,x.reward.primogem);
 assert(refused(()=>g.action('CHEST_OPEN',{chest:x.id}),/이미 연/));g.validateSave(plain(g.s));
});

check('도전: too slow or lost, no chest; it can be tried again',()=>{
 const x=rules.chests.find(x=>x.kind==='CHALLENGE'&&x.map==='MAP_MOND_PLAINS'),g=fresh4(x.map);
 g.action('CHEST_OPEN',{chest:x.id});g.s.runtime.round=x.rounds+1;g.action('OPERATOR_DEBUG',{op:'battle_end',win:true});
 const late=JSON.parse(g.s.global.LAST_BATTLE_RESULT_JSON);assert.equal(late.chestChallenge.won,false);assert.equal(late.chestChallenge.limit,x.rounds);assert(!g.chestWon(x.id));
 g.action('CHEST_OPEN',{chest:x.id});g.action('OPERATOR_DEBUG',{op:'battle_end',win:false});assert.equal(JSON.parse(g.s.global.LAST_BATTLE_RESULT_JSON).chestChallenge.won,false);
 g.action('OPERATOR_DEBUG',{op:'heal'});g.action('CHEST_OPEN',{chest:x.id});g.action('OPERATOR_DEBUG',{op:'battle_end',win:true});assert(g.chestWon(x.id),'won in time on the third try');
});

check('도전: a geared level-matched party (a 4★ or a 5★ team) clears every challenge in time',()=>{
 const enh=L=>L<=10?4:L<=20?6:L<=30?7:L<=45?9:10,out={};
 for(const x of rules.chests.filter(x=>x.kind==='CHALLENGE')){
  const L=Number(fresh().tables['32_MAP_DB'].get(x.map)[6]),team=x.region==='MOND'?['MOND_AMBER','MOND_LISA','MOND_KAEYA']:['LIYUE_XIANGLING','LIYUE_XINGQIU','LIYUE_BEIDOU'];
  const best=[team,x.region==='MOND'?['MOND_DILUC','MOND_NOELLE','MOND_JEAN']:['LIYUE_KEQING','LIYUE_GANYU','LIYUE_ZHONGLI']].map(t=>{const r=fixture(L,t,enh(L));r.action('OPERATOR_DEBUG',{op:'travel',map:x.map});r.action('CHEST_OPEN',{chest:x.id});return fight(r).chestChallenge;});
  out[x.id]=best.map(e=>e.rounds);assert(best.some(e=>e.won),x.id+' '+x.map+' limit '+x.rounds+': '+best.map(e=>e.rounds).join('/'));
 }
 console.log(JSON.stringify(out));
});

check('원소 비석: lit by party members of each stone\'s element; a party without them is told which',()=>{
 const x=rules.chests.find(x=>x.kind==='TOTEM'&&x.map==='MAP_CRPG_WHISPER_HUNT'),g=fresh4(x.map);
 assert.deepEqual(plain(x.totem),['PYRO','CRYO']);
 const v=plain(g.chestsHere('SCENERY')).find(v=>v.id===x.id);assert.match(v.totemReason,/불·얼음 원소 동료/);
 assert(refused(()=>g.action('CHEST_OPEN',{chest:x.id,answer:['PLAYER_CUSTOM','PLAYER_CUSTOM']}),/불·얼음/));
 party(g,['MOND_AMBER','MOND_LISA','MOND_KAEYA']);assert.equal(plain(g.chestsHere('SCENERY')).find(v=>v.id===x.id).totemReason,'');
 assert(refused(()=>g.action('CHEST_OPEN',{chest:x.id,answer:['MOND_KAEYA','MOND_AMBER']})),'each stone by its own element, in order');
 assert(refused(()=>g.action('CHEST_OPEN',{chest:x.id,answer:['MOND_DILUC','MOND_KAEYA']})),'only someone in the party');
 const before=Number(g.s.global.PRIMOGEM)||0;g.action('CHEST_OPEN',{chest:x.id,answer:['MOND_AMBER','MOND_KAEYA']});
 assert(g.chestOpened(x.id));assert.equal((Number(g.s.global.PRIMOGEM)||0)-before,x.reward.primogem);
 const t=fresh4('MAP_MOND_CITY');assert.equal(plain(t.chestPartyElements())[0].element,'ANEMO','the traveller lights with their element');
 const i=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');assert.equal(plain(i.chestPartyElements())[0].element,null,'the 이세계인 has none');
});

check('때를 맞춘 상자: shows and opens only in its hours',()=>{
 for(const x of rules.chests.filter(x=>x.kind==='TIME')){
  const g=fresh(x.map),[from,to]={SCENERY_DAWN:[5,8],SCENERY_NOON:[11,14],SCENERY_DUSK:[17,19]}[x.how];
  g.s.global.WORLD_TIME=String((to+3)%24).padStart(2,'0')+':00';assert(refused(()=>g.action('CHEST_OPEN',{chest:x.id}),/에만 보이는/),x.id);
  assert(!g.chestsHere('SCENERY').some(v=>v.id===x.id),x.id+' hidden out of its hours');
  g.s.global.WORLD_TIME=String(from).padStart(2,'0')+':30';assert(g.chestsHere('SCENERY').some(v=>v.id===x.id),x.id+' in the scenery in its hours');
  g.action('CHEST_OPEN',{chest:x.id});assert(g.chestOpened(x.id));
 }
});

check('the handbook counts each kind (never where); achievements count 96 and each kind',()=>{
 const g=fresh();const j=plain(g.chestJournal());
 assert.deepEqual(j.map(r=>[r.total,r.puzzles.total,r.hidden.total,r.challenge.total,r.totem.total,r.time.total]),[[48,18,6,8,8,8],[48,18,6,8,8,8]]);
 assert(j[0].tiers.some(t=>t.tier==='PRECIOUS'));
 const text=JSON.stringify(j);for(const x of rules.chests){const name=g.tables['32_MAP_DB'].get(x.map)?.[2];assert(!text.includes(x.map));if(name)assert(!text.includes(name));}
 const defs=g.achievementDefs(),ids=defs.map(d=>d.id);
 for(const id of ['CHEST_5','MOND_CHEST_5','LIYUE_CHEST_5','CHEST_CHALLENGE_3','CHEST_TOTEM_3','CHEST_TIME_3'])assert(ids.includes(id),id);
 assert.equal(defs.find(d=>d.id==='CHEST_5').target,96);assert.equal(defs.find(d=>d.id==='MOND_CHEST_5').target,48);
 // a time chest opened counts as its kind, not as a hidden one
 const x=rules.chests.find(x=>x.kind==='TIME'&&x.region==='MOND'),h=fresh(x.map);h.s.global.WORLD_TIME={SCENERY_DAWN:'06:00',SCENERY_NOON:'12:00',SCENERY_DUSK:'18:00'}[x.how];h.action('CHEST_OPEN',{chest:x.id});
 const f=h.achievementFacts();assert.equal(f.chestKinds.TIME,1);assert.equal(f.hidden,0);
});

check('saves: a won challenge and a challenge fight are checked',()=>{
 const g=fresh(),R=g.constructor,saved=JSON.parse(g.serialize());
 for(const bad of [{version:1,opened:{},won:{CHEST_M01:{day:1,rounds:2}}},{version:1,opened:{CHEST_M25:{day:1}},won:{CHEST_M25:{day:1,rounds:2}}},{version:1,opened:{},won:{CHEST_M25:{day:0,rounds:2}}},{version:1,opened:{},won:[]}])
  assert(refused(()=>new R(g.db,{...saved,chests:bad},true),/보물상자 기록/),JSON.stringify(bad));
 new R(g.db,{...saved,chests:{version:1,opened:{},won:{CHEST_M25:{day:1,rounds:3}}}},true);
});

console.log(JSON.stringify({ok:!process.exitCode,passed:results.length}));
