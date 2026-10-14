'use strict';
// 0.16.46 조작하는 보스 (user, 2026-10-15): 「무상의 바람은 … wasd로 움직이는 언더테일 느낌으로 공격을 피하면서 바람원소 먹는 그런거.
// 맞을때마다 전체데미지」, 「무상의 바람은 핵 노출 때만 공격이 되는게 정석」, 「무상의 뇌전은 … 주인공쪽만 공격하도록」, 「핵 노출은 따로 해야지」,
// 「고증에 맞춰서 미니게임」, 「일일보스도 마찬가지」, 「고증만 살리고 스펙 난이도는 신경쓰지 말어봐」.
// Every action copies the save, so the checks read the battle through S(r) after an action, never an object held from before it.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),H=require('../tools/audit_protagonist_v01618.cjs');
const ROOT=path.resolve(__dirname,'..'),env=H.load(ROOT),FB=env.api.fieldBosses,CTL=env.api.fieldBossControl,src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const PLAYER='PLAYER_CUSTOM';
const S=r=>r.s.runtime,bossOf=(r,id)=>S(r).actors.find(a=>a.source===id),meOf=r=>S(r).actors.find(a=>a.source===PLAYER);
function field(id,team=['MOND_AMBER','MOND_NOELLE','MOND_BARBARA'],route='ROUTE_ISEKAI'){
 const r=H.setup(env,{level:FB.levels[id],route,team,seed:717,map:FB.bosses[id].map,enhance:3,talent:4});
 r.action('PLACE_ENTER',{place:'BOSS:'+FB.route(id),mode:'BOSS'});r.action('BOSS_ROUTE',{route:FB.route(id),entry:'DIRECT'});
 r.die=()=>50;r.random=()=>.5;if(S(r).opening?.state==='PENDING')r.action('COMBAT_BEGIN');
 return{r,b:S(r),boss:bossOf(r,id),me:meOf(r)};
}
function daily(id,team=['MOND_AMBER','MOND_NOELLE','MOND_BARBARA']){
 const spec={BOSS_ANDRIUS:{level:25,map:'MAP_WOLF_ARENA'},BOSS_DVALIN:{level:28,map:'MAP_STORMTERROR_LAIR'},BOSS_TARTAGLIA:{level:50,map:'MAP_LIYUE_GOLDEN_HOUSE',action:'LIYUE_ARTIFACT_CHALLENGE',args:{kind:'TARTAGLIA'}},BOSS_AZHDAHA:{level:60,map:'MAP_AZHDAHA_DOMAIN',action:'LIYUE_ARTIFACT_CHALLENGE',args:{kind:'AZHDAHA'}}}[id];
 const r=H.setup(env,{level:spec.level,route:'ROUTE_ISEKAI',team,seed:717,map:spec.map,gear:'craft',enhance:8,talent:6});for(const f of ['FLAG_BOSS_ANDRIUS_CLEAR','FLAG_BOSS_DVALIN_CLEAR'])r.s.flags[f]=true;
 const action=spec.action||'MOND_MATERIAL_CHALLENGE',args=spec.args||{boss:id};if(id==='BOSS_AZHDAHA'){const ar=r.tables['35_BOSS_ROUTE_DB'].get('BRT_AZHDAHA');if(ar?.[13])r.s.flags[ar[13]]=true;}
 assert.equal(r.actionReason(action,args),'');r.action(action,args);r.die=()=>50;r.random=()=>.5;if(S(r).opening?.state==='PENDING')r.action('COMBAT_BEGIN');
 return{r,b:S(r)};
}
const mini=(r,id)=>r.combatCards().find(c=>c.id===id);
const texts=(b,from=0)=>b.log.slice(from).map(l=>l.text||'').join('\n');
const guardUntil=(r,cond,limit=8)=>{for(let i=0;i<limit&&S(r)&&!cond();i++)r.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});return cond();};

check('only a newly opened route fight or daily challenge plays by the 조작 rules; a saved fight keeps its rules',()=>{
 const f=field('FB_ANEMO_HYPOSTASIS');assert.equal(f.b.fieldBoss.controlRevision,1);assert.equal(f.b.fieldBoss.behaviorRevision,5);assert.equal(f.b.fieldBoss.pressureRevision,1);
 const d=daily('BOSS_DVALIN');assert.equal(d.b.twinBoss.controlRevision,1);assert(String(d.b.origin).startsWith('MATERIAL_CHALLENGE:'));
 // A fight saved by 0.16.45 has no controlRevision: its core is never shut and no minigame is offered.
 const old=field('FB_ANEMO_HYPOSTASIS');delete old.b.fieldBoss.controlRevision;assert.equal(old.r.fbCoreShut(old.boss),false);old.b.fieldBoss.dodge={kind:'ANEMO',id:1,seed:1,round:1,result:null,playerActed:false};assert.equal(old.r.fbMiniCards(old.me).length,0);
 // Shared co-op fights carry only card/target/branch to the server, so no minigame there either.
 const co=field('FB_ANEMO_HYPOSTASIS');co.b.fieldBoss.dodge={kind:'ANEMO',id:1,seed:1,round:co.b.round,result:null,playerActed:false};assert.equal(co.r.fbMiniCards(co.me).length,1);co.b.coop={};assert.equal(co.r.fbMiniCards(co.me).length,0);
 assert.deepEqual(Object.keys(CTL.cards).sort(),['CHASE','DASH','DODGE','QUAKE','SNIPE','TIDE']);
});

check('무상의 바람: the core is shut while it gathers or floats and is the exposed core (+50%) once it has attacked',()=>{
 const {r,b,boss,me}=field('FB_ANEMO_HYPOSTASIS');boss.airborne=false;
 assert.equal(r.fbCoreShut(boss),true,'shut before its first attack');const hp=boss.hp,at=b.log.length;r.damage(me,boss,1,'물리',{sureHit:true,range:'원거리'});assert.equal(boss.hp,hp);assert.match(texts(b,at),/핵이 닫혀 있다/);
 boss.fb.rot=0;boss.fb.next=null;boss.fb.endTurn=null;boss.turns=(boss.turns||0)+1;r.fieldBossTurn(boss);assert(b.log.some(l=>l.card==='FB_GUST'));assert.equal(r.fbCoreShut(boss),false,'open after the gust');
 const open=r.combatDamageMultiplier(me,boss,'물리',{});boss.fb.coreOpen=false;const closed=r.combatDamageMultiplier(me,boss,'물리',{});boss.fb.coreOpen=true;assert(Math.abs(open/closed-1.5)<1e-9,'open core takes +50%');
 assert(r.fieldBossView().state.some(s=>s.startsWith('핵 노출 · 받는 피해 +50%')));
 // Rising shuts it again until the slam.
 boss.fb.rot=3;boss.fb.endTurn=null;boss.turns++;r.fieldBossTurn(boss);assert(boss.airborne);assert.equal(r.fbCoreShut(boss),true);assert.equal(boss.fb.next,'SLAM');
 boss.fb.endTurn=null;boss.turns++;r.fieldBossTurn(boss);assert.equal(boss.airborne,false);assert.equal(r.fbCoreShut(boss),false,'open after the slam');
 // Companions wait out a shut core (방어) instead of striking it.
 boss.fb.coreOpen=false;const amber=b.actors.find(a=>a.source==='MOND_AMBER'),n=b.log.length;r.aiTurn(amber,b.actors.filter(a=>a.side==='ENEMY'&&a.hp>0));assert.equal(amber.guard,true);assert.match(b.log.slice(n).map(l=>l.reason||'').join(),/핵이 닫혀 방어 태세/);
});

check('바람 탄막: the dodge lands the barrage at once — every hit is whole-party damage, every wind orb charges a burst, the core is not exposed by it',()=>{
 const {r}=field('FB_ANEMO_HYPOSTASIS');assert.equal(S(r).phase,'WAIT_PLAYER');
 const b=S(r),boss=bossOf(r,'FB_ANEMO_HYPOSTASIS'),me=meOf(r);boss.airborne=false;
 boss.fb.rot=1;boss.fb.next=null;boss.fb.endTurn=null;boss.turns=(boss.turns||0)+1;r.fieldBossTurn(boss);
 assert.equal(boss.fb.next,'BARRAGE');assert.equal(b.fieldBoss.telegraph.move,'BARRAGE');assert.equal(r.fbCoreShut(boss),true);const dodge=b.fieldBoss.dodge;assert(Number.isSafeInteger(dodge.id)&&Number.isSafeInteger(dodge.seed));
 const card=mini(r,CTL.cards.DODGE);assert(card&&!card.reason,'the protagonist gets 「바람 탄막 피하기」');assert.equal(card.mini.kind,'ANEMO_DODGE');assert.equal(card.mini.maxHits,CTL.rules.ANEMO.maxHits);assert.equal(card.mini.orbs,CTL.rules.ANEMO.orbs);assert.match(card.description,/WASD/);
 b.actors.find(a=>a.source==='MOND_AMBER').cooldowns.MOND_AMBER_Q=9;const exposedBefore=boss.fb.exposedUntil,at=b.log.length;
 r.action('COMBAT',{card:card.id,target:me.id,mini:{kind:'ANEMO_DODGE',id:card.mini.id,hits:2,orbs:3}});
 const log=S(r).log.slice(at),t=log.map(l=>l.text||'').join('\n');
 assert(log.filter(l=>l.card==='FB_BARRAGE'&&l.targetId).length>=3,'whole party hit');assert.match(t,/바람 탄막 · 2발 적중 · 바람 원소 3개/);assert.match(t,/바람 원소 3개 · 원소폭발 충전 · .*재사용 −3차례/);
 assert.equal(bossOf(r,'FB_ANEMO_HYPOSTASIS').fb.exposedUntil,exposedBefore,'the minigame never exposes the core');assert.equal(S(r).fieldBoss.dodge??null,null);
});

check('바람 탄막 without the dodge: it waits once for the protagonist, then four hits; results are clamped',()=>{
 const {r,b,boss}=field('FB_ANEMO_HYPOSTASIS');boss.airborne=false;
 b.fieldBoss.dodge={kind:'ANEMO',id:7,seed:3,round:b.round,result:null,playerActed:false};boss.fb.next='BARRAGE';boss.fb.endTurn=null;boss.turns=(boss.turns||0)+1;
 r.fieldBossTurn(boss);assert.equal(boss.fb.next,'BARRAGE','waits for the protagonist');assert.equal(b.fieldBoss.dodge.held,true);
 boss.fb.endTurn=null;boss.turns++;const at=b.log.length;r.fieldBossTurn(boss);assert.equal(boss.fb.next,null,'only once');assert.match(texts(b,at),/피하지 못해 4발 적중/);
 // Results are clamped to the rule's maximum, and a result for another barrage counts as not dodged.
 for(const [mid,hits,orbs,want] of [[4,99,99,'바람 탄막 · '+CTL.rules.ANEMO.maxHits+'발 적중 · 바람 원소 '+CTL.rules.ANEMO.orbs+'개'],[5,0,5,'바람 탄막 · 4발 적중 · 바람 원소 0개']]){
  const f=field('FB_ANEMO_HYPOSTASIS');f.b.fieldBoss.dodge={kind:'ANEMO',id:4,seed:3,round:f.b.round,result:null,playerActed:false};f.boss.fb.next='BARRAGE';
  f.r._fbMini={kind:'ANEMO_DODGE',id:mid,hits,orbs};try{f.r.executeCombatSystem(f.me,CTL.cards.DODGE,f.me.id);}finally{f.r._fbMini=null;}assert(texts(f.b).includes(want),want);}
 // A tampered save is refused.
 const v=field('FB_ANEMO_HYPOSTASIS');v.b.fieldBoss.dodge={kind:'ANEMO',id:1,seed:1,round:1,result:{hits:99,orbs:1},playerActed:true};assert.throws(()=>v.r.validateSave(v.r.s),/보스 조작 전투 기록/);
});

check('무상의 뇌전: only the protagonist breaks the revival prisms — one non-Electro blow each, 함께하는 일격 carries on to the next prism',()=>{
 const {r}=field('FB_ELECTRO_HYPOSTASIS');const boss=()=>bossOf(r,'FB_ELECTRO_HYPOSTASIS'),prisms=()=>S(r).actors.filter(a=>a.fbSummon?.kind==='FB_SUMMON_PRISM'&&a.hp>0);
 boss().hp=1;r.applyDamage(meOf(r),boss(),50,{element:'물리'});assert(boss().fb.revival?.guarded,'revival');assert.equal(prisms().length,3);
 // A companion's own blow is turned away, and the companion AI guards instead.
 const b=S(r),noelle=b.actors.find(a=>a.source==='MOND_NOELLE'),p0=prisms()[0],hp=p0.hp,at=b.log.length;r.applyDamage(noelle,p0,p0.hp,{element:'바위'});assert.equal(p0.hp,hp);assert.match(b.log.slice(at).map(l=>l.immune||'').join(),/주인공이 직접 노려야/);
 r.aiTurn(noelle,b.actors.filter(a=>a.side==='ENEMY'&&a.hp>0));assert.equal(noelle.guard,true);noelle.guard=false;
 // Electro is absorbed even from the protagonist.
 r._fbPlayerLed=true;try{r.applyDamage(meOf(r),p0,1,{element:'번개'});}finally{r._fbPlayerLed=false;}assert.equal(p0.hp,hp);
 // The protagonist's basic attack breaks one prism outright.
 const id0=p0.id;r.action('COMBAT',{card:'PLAYER_BASIC_ATTACK',target:id0});assert.equal(S(r).actors.find(a=>a.id===id0).hp,0);assert.match(texts(S(r)),/뇌광 프리즘 파괴 · 남은 프리즘 2/);
 // The joint attack breaks the rest, member by member.
 assert(boss().fb.revival&&prisms().length===2,'still reviving with two prisms');meOf(r).cooldowns.PLAYER_ISEKAI_Q=0;const q=r.combatCards().find(c=>c.id==='PLAYER_ISEKAI_Q');assert(q&&!q.reason,q?.reason);
 r.action('COMBAT',{card:'PLAYER_ISEKAI_Q',target:prisms()[0].id});
 // The revival is stopped, so the fight is won right there.
 if(S(r))assert(S(r).log.some(l=>l.card==='FB_REVIVE_FAILED'),'every prism broken by one joint attack');else{const res=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);assert.equal(res.victory,true);assert.equal(res.fieldBoss.boss,'FB_ELECTRO_HYPOSTASIS');}
});

check('무상의 얼음: the fleeing core can be chased by the protagonist (at most three hits per chase)',()=>{
 const {r}=field('FB_CRYO_HYPOSTASIS',['MOND_BARBARA','MOND_KAEYA','MOND_LISA']);const boss=()=>bossOf(r,'FB_CRYO_HYPOSTASIS');
 boss().hp=1;r.applyDamage(meOf(r),boss(),50,{element:'물리'});const rv=boss().fb.revival;assert(rv&&Number.isSafeInteger(rv.chaseId)&&Number.isSafeInteger(rv.chaseSeed));
 const card=mini(r,CTL.cards.CHASE);assert(card&&!card.reason);assert.equal(card.mini.kind,'CRYO_CHASE');assert.equal(card.mini.need,rv.need-(rv.hits||0));
 const at=S(r).log.length;r.action('COMBAT',{card:card.id,target:boss().id,mini:{kind:'CRYO_CHASE',id:card.mini.id,hits:9}});
 const t=S(r).log.slice(at).map(l=>l.text||'').join('\n');assert.match(t,/도망치는 냉기 핵을 3번 붙잡았다/);assert.match(t,/냉기 핵에 금이 갔다 · 3\/4/);assert.doesNotMatch(t,/도망치는 냉기 핵을 4번/);
 assert(S(r).fieldBoss.seen.includes('CHASE'));
});

check('드발린: every third round the corrupted crystals glow; breaking all three drops it for a turn',()=>{
 const {r}=daily('BOSS_DVALIN');assert(guardUntil(r,()=>!!S(r)?.twinBoss?.crystals),'crystals by round 3');assert.equal(S(r).round%3,0);
 const card=mini(r,CTL.cards.SNIPE);assert(card&&!card.reason);assert.equal(card.mini.crystals,3);assert.equal(card.mini.shots,6);
 const at=S(r).log.length;r.action('COMBAT',{card:card.id,target:card.targets[0].id,mini:{kind:'DVALIN_SNIPE',id:card.mini.id,hits:3}});
 const log=S(r).log.slice(at);assert.match(log.map(l=>l.text||'').join('\n'),/부식 결정 3개 명중/);assert(log.some(l=>l.card==='TWIN_DOWNED'&&/한 차례 행동 불능/.test(l.text)));
 assert(log.some(l=>l.card==='TWIN_DOWNED'&&/몸을 일으키는/.test(l.text))||S(r).twinBoss.stun===1,'its next action is lost');assert(S(r).twinBoss.seen.includes('CRYSTALS'));
});

check('안드리우스: the 얼음 발톱 질주 at the end of every third round — four hits undodged, an opening when nothing hits',()=>{
 const run=hits=>{const {r}=daily('BOSS_ANDRIUS');assert(guardUntil(r,()=>!!S(r)?.twinBoss?.dodge),'dash by round 2');assert.equal(S(r).round%3,2);const card=mini(r,CTL.cards.DASH);assert(card&&!card.reason);const at=S(r).log.length;
  if(hits===null)r.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});else r.action('COMBAT',{card:card.id,target:card.targets[0].id,mini:{kind:'ANDRIUS_DODGE',id:card.mini.id,hits}});
  guardUntil(r,()=>S(r).log.slice(at).some(l=>l.card==='TWIN_DASH'),3);return S(r).log.slice(at).map(l=>l.text||'').join('\n');};
 assert.match(run(null),/얼음 발톱 질주 · 4발 적중/);assert.match(run(0),/질주가 모두 빗나갔다/);
});

check('타르탈리아 · 야타용왕: their daily challenge brings 「극악기·진멸」 / 「지맥 충격파」 at the end of every third round',()=>{
 for(const id of ['BOSS_TARTAGLIA','BOSS_AZHDAHA']){const L=CTL.liyueDaily[id];
  const run=hits=>{const {r}=daily(id,['MOND_AMBER','MOND_NOELLE','MOND_BARBARA']);assert.equal(S(r).dailyDodge.controlRevision,1);assert(guardUntil(r,()=>!!S(r)?.dailyDodge?.dodge),L.label+' by round 2');assert.equal(S(r).round%3,2);
   const card=mini(r,L.card);assert(card&&!card.reason,L.name);assert.equal(card.mini.kind,L.kind);const at=S(r).log.length;
   if(hits===null)r.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});else r.action('COMBAT',{card:card.id,target:card.targets[0].id,mini:{kind:L.kind,id:card.mini.id,hits}});
   guardUntil(r,()=>!S(r)||S(r).log.slice(at).some(l=>l.card==='DAILY_DODGE'||/모두 피했다/.test(l.text||'')),3);return S(r)?S(r).log.slice(at).map(l=>l.text||'').join(' / '):'';};
  assert.match(run(null),new RegExp(L.label+' · 4발 적중'));assert.match(run(0),/모두 피했다 · .* 빈틈/);}
 // A saved Liyue daily fight without the marker keeps its rules.
 const {r}=daily('BOSS_TARTAGLIA');delete S(r).dailyDodge;assert(guardUntil(r,()=>S(r)?.round>=3,6));assert.equal(S(r).dailyDodge,undefined);assert(!r.combatCards().some(c=>c.mini));
});

check('the page plays the four minigames with keys, a phone pad and touch, and sends the result with the same COMBAT action',()=>{
 const js=src('source/app_bossgames_v01646.js');
 for(const id of Object.values(CTL.cards))assert(js.includes("'"+id+"'"),id);
 for(const k of ['ANEMO_DODGE','ANDRIUS_DODGE','CRYO_CHASE','DVALIN_SNIPE','TARTAGLIA_DODGE','AZHDAHA_DODGE'])assert(js.includes(k+':'),k);
 assert(js.includes('act=async function(type,params={})')&&js.includes('{...params,mini:result}'));assert(js.includes("KeyW:'U'")&&js.includes("ArrowUp:'U'"));assert(js.includes('fb-mini-pad'));assert(js.includes("addEventListener('keydown',keydown,true)"));
 assert(!/<select|::after|::before/.test(js),'no drop-downs or pseudo-element text');
 assert(src('source/index.html').includes('<script src="app_bossgames_v01646.js"></script>'));assert(src('tools/build.py').includes("'app_bossgames_v01646.js'"));
 assert(src('tools/verify_release.py').includes("'tests/test_fb_control_v01646.cjs'"));
 const fit=src('tests/test_screen_fit_v01629.mjs');for(const k of ['fb-mini-anemo','fb-mini-andrius','fb-mini-cryo','fb-mini-dvalin','fb-mini-tartaglia','fb-mini-azhdaha'])assert(fit.includes("['"+k+"',"),k);assert(fit.includes("view('fb-mini-anemo-play'"));
});

console.log(JSON.stringify({ok:!process.exitCode,passed}));
