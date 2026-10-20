'use strict';
// 0.16.54 boss pass (user, 2026-10-16: 「원래 무상의 바람 패턴이 피가 1이 되면 무적이 되고 주변에 날아다니면서 바람 원소 수집하는걸
// 미니게임으로 하려고 한건데」, 「다른 보스들 공략들도 이상한거 있으면 제대로 바꿔. 공략이랑 비슷한 느낌을 주되, 아이디어는 참신한 것으로」,
// 「미니게임은 난이도가 꽤 되어야하는거 알제?」). A fight opened from now carries bossPass 1 (무상의 바람 also anemoOrbs 1); a fight saved
// before keeps its rules. Every action copies the save, so the checks read the fight again after each action.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),H=require('../tools/audit_protagonist_v01618.cjs');
const ROOT=path.resolve(__dirname,'..'),env=H.load(ROOT),api=env.api,FB=api.fieldBosses,CTL=api.fieldBossControl,src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const S=r=>r.s.runtime,boss=r=>S(r)?.actors.find(a=>a.fb),me=r=>S(r)?.actors.find(a=>a.source==='PLAYER_CUSTOM'),plain=x=>JSON.parse(JSON.stringify(x));
const oldMax=(r,x)=>x.maxHp/(S(r).bossLength?.hp||1);
function field(id,team=['MOND_AMBER','MOND_NOELLE','MOND_BARBARA']){const r=H.setup(env,{level:FB.levels[id],route:'ROUTE_ISEKAI',team,seed:717,map:FB.bosses[id].map,enhance:3,talent:4});
 r.action('PLACE_ENTER',{place:'BOSS:'+FB.route(id),mode:'BOSS'});r.action('BOSS_ROUTE',{route:FB.route(id),entry:'DIRECT'});/* 0.16.57: the shut core of 무상의 뇌전·바위·얼음 is checked in tests/test_boss_core_v01657.cjs; these read the fight without it */delete S(r).fieldBoss.coreRevision;r.die=()=>50;r.random=()=>.5;if(S(r).opening?.state==='PENDING')r.action('COMBAT_BEGIN');return r;}
function daily(id){const spec={BOSS_ANDRIUS:{level:25,map:'MAP_WOLF_ARENA'},BOSS_DVALIN:{level:28,map:'MAP_STORMTERROR_LAIR'},BOSS_TARTAGLIA:{level:50,map:'MAP_LIYUE_GOLDEN_HOUSE',action:'LIYUE_ARTIFACT_CHALLENGE',args:{kind:'TARTAGLIA'}}}[id];
 const r=H.setup(env,{level:spec.level,route:'ROUTE_ISEKAI',team:['MOND_AMBER','MOND_NOELLE','MOND_BARBARA'],seed:717,map:spec.map,gear:'craft',enhance:8,talent:6});for(const f of ['FLAG_BOSS_ANDRIUS_CLEAR','FLAG_BOSS_DVALIN_CLEAR','FLAG_TRV_LY_TARTAGLIA_WON'])r.s.flags[f]=true;
 const action=spec.action||'MOND_MATERIAL_CHALLENGE',args=spec.args||{boss:id};assert.equal(r.actionReason(action,args),'');r.action(action,args);r.die=()=>50;r.random=()=>.5;if(S(r).opening?.state==='PENDING')r.action('COMBAT_BEGIN');return r;}
const card=(r,id)=>r.combatCards().find(c=>c.id===id);
const play=(r,id,mini,target)=>{const c=card(r,id);assert(c&&!c.reason,id+': '+(c?.reason||'no card'));r.action('COMBAT',{card:c.id,target:target||me(r).id,mini:{kind:c.mini.kind,id:c.mini.id,...mini}});};
const guardUntil=(r,cond,n=8)=>{for(let i=0;i<n&&S(r)&&!cond();i++)r.action('COMBAT',{card:'PLAYER_BASIC_GUARD',target:me(r).id});return cond();};

check('무상의 바람: no barrage dodge; at HP 1 it is invulnerable and 「바람 원소 모으기」 settles the revival in one try',()=>{
 const r=field('FB_ANEMO_HYPOSTASIS'),b=S(r),x=boss(r);assert.equal(b.bossPass,1);assert.equal(b.fieldBoss.anemoOrbs,1);
 x.fb.rot=1;x.fb.next=null;x.fb.endTurn=null;x.turns=(x.turns||0)+1;x.airborne=false;r.fieldBossTurn(x);assert.equal(x.fb.next,'BARRAGE');assert.equal(b.fieldBoss.dodge??null,null,'no dodge in a new fight');
 x.fb.coreOpen=true;r.applyDamage(me(r),x,x.hp+5,{element:'물리'});assert.equal(x.hp,1);const o=x.fb.revival.orbs;assert.deepEqual(plain({total:o.total,got:o.got}),{total:5,got:0});
 assert.equal(r.applyDamage(me(r),x,999,{element:'불'}),0);assert.equal(x.hp,1,'invulnerable');assert.match(r.fieldBossBarrierReason(me(r),x,'불'),/무적/);
 const c=card(r,CTL.cards.ORBS);assert.equal(c.mini.kind,'ANEMO_ORBS');assert.equal(c.mini.orbs,5);assert.equal(c.mini.seconds,10);
 play(r,CTL.cards.ORBS,{orbs:3,hits:1});const y=boss(r);assert.equal(y.fb.revival,null,'one try settles it');assert.equal(y.fb.revived,false,'two missed: it can gather again');assert.equal(S(r).fieldBoss.orbsTaken,3);
 assert(S(r).log.some(l=>/바람 원소 3개를 빼앗았다/.test(l.text||'')));
 // what it comes back with: 5% + 7% for each orb missed, of its own (old-size) max HP
 const r2=field('FB_ANEMO_HYPOSTASIS'),z=boss(r2);r2.fbStartRevival(z);z.fb.revival.orbs.got=2;r2.fbRevivalExpired(S(r2),z);assert.equal(z.hp,Math.round(Math.round(z.maxHp*(.05+.07*3))/(S(r2).bossLength?.hp||1)));
 // the orbs it lost do not come back: the next revival has only what is left
 const r3=field('FB_ANEMO_HYPOSTASIS'),w=boss(r3);S(r3).fieldBoss.orbsTaken=3;r3.fbStartRevival(w);assert.equal(w.fb.revival.orbs.total,2);
 // all taken: its last revival
 const r4=field('FB_ANEMO_HYPOSTASIS'),v=boss(r4);r4.fbStartRevival(v);v.fb.revival.orbs.got=5;r4.fbRevivalExpired(S(r4),v);assert.equal(v.fb.revived,true);assert(S(r4).log.some(l=>/모두 빼앗겨/.test(l.text||'')));
});

check('무상의 얼음: the revival is a thick ice shield — 「서리 열매 치기」 three times (two once fire melted it), nothing else gets through',()=>{
 const r=field('FB_CRYO_HYPOSTASIS'),x=boss(r);(x.shields||[]).length=0;r.applyDamage(me(r),x,x.hp+5,{element:'물리'});const rr=x.fb.revival;assert(rr.fruit);assert.equal(rr.need,3);
 assert.equal(r.applyDamage(me(r),x,500,{element:'물리'}),0);assert.equal(r.damage(me(r),x,1,'물리',{sureHit:true}),0);assert.equal(rr.hits,0);
 assert(!card(r,CTL.cards.CHASE),'no fleeing core');const c=card(r,CTL.cards.FRUIT);assert.equal(c.mini.kind,'FROST_FRUIT');assert.equal(c.mini.need,3);assert.equal(c.mini.shots,4);
 r.applyDamage(me(r),x,300,{element:'불'});assert.equal(x.fb.revival.need,2,'fire melts it once');assert.equal(x.fb.revival.fruit.melted,true);r.applyDamage(me(r),x,300,{element:'불'});assert.equal(x.fb.revival.need,2,'only once');
 play(r,CTL.cards.FRUIT,{hits:1},x.id);const y=boss(r);if(y?.fb.revival){assert.equal(y.fb.revival.hits,1);assert.match(card(r,CTL.cards.FRUIT)?.reason||'이번 라운드에 이미 쳤습니다',/이미 쳤습니다/);}
 // breaking it fells the boss; failing brings it back at 50% of the old max HP
 const r2=field('FB_CRYO_HYPOSTASIS'),z=boss(r2);r2.fbStartRevival(z);z.fb.revival.hits=2;r2.fbHitCryoCore(z);assert.equal(z.hp,0);
 const r3=field('FB_CRYO_HYPOSTASIS'),w=boss(r3);r3.fbStartRevival(w);r3.fbRevivalExpired(S(r3),w);assert.equal(w.hp,Math.round(Math.round(w.maxHp*.5)/(S(r3).bossLength?.hp||1)));
});

check('무상의 뇌전·바위: breaking every summon fells it; what is left heals it (15·35·50%); prisms take any element but 번개, pillars are chipped by anything',()=>{
 for(const [id,kind] of [['FB_ELECTRO_HYPOSTASIS','FB_SUMMON_PRISM'],['FB_GEO_HYPOSTASIS','FB_SUMMON_PILLAR']])for(const left of [1,2,3]){const r=field(id),x=boss(r);x.hp=1;r.fbStartRevival(x);
  const s=S(r).actors.filter(a=>a.fbSummon?.kind===kind&&a.hp>0);s.slice(left).forEach(p=>p.hp=0);r.fbRevivalExpired(S(r),x);assert.equal(x.hp,Math.round(Math.round(x.maxHp*[0,.15,.35,.5][left])/(S(r).bossLength?.hp||1)),id+' '+left);}
 const e=field('FB_ELECTRO_HYPOSTASIS'),p=e.fbSummon(S(e),boss(e),'FB_SUMMON_PRISM');assert.match(e.fieldBossBarrierReason(me(e),p,'물리'),/물리/);assert.equal(e.fieldBossBarrierReason(me(e),p,'물'),'');assert.match(e.fieldBossBarrierReason(me(e),p,'번개'),/흡수/);
 const g=field('FB_GEO_HYPOSTASIS'),q=g.fbSummon(S(g),boss(g),'FB_SUMMON_PILLAR');assert.equal(g.fieldBossBarrierReason(me(g),q,'물리'),'');const phys=g.combatDamageMultiplier(me(g),q,'물리',{}),geo=g.combatDamageMultiplier(me(g),q,'바위',{});assert(Math.abs(phys/geo-.2)<1e-9,'physical '+phys+' vs geo '+geo);
 // the pillar heal is a share of the boss's own (old-size) max HP
 assert.match(src('source/runtime_field_bosses.js'),/this\.heal\(boss,boss\.maxHp\/\(b\.bossLength\?\.hp\|\|1\)\*\.025,p\.name\)/);
});

check('얼음·폭염 나무: every blow wears the shell; it grows back on the corolla at half; a corolla left whole brings 얼음비',()=>{
 const r=field('FB_CRYO_REGISVINE'),x=boss(r),shell=()=>x.shields.filter(s=>s.source==='FB_SHELL').reduce((n,s)=>n+s.value,0),s0=shell();
 assert.equal(r.fieldBossBarrierReason(me(r),x,'물리'),'');r.damage(me(r),x,1,'물리',{sureHit:true});assert(shell()<s0,'physical chips it');
 r.applyDamage(me(r),x,shell()*2,{element:'불'});assert.equal(shell(),0);assert.equal(x.fb.shieldBreaks,1);
 for(let i=0;i<5;i++){S(r).round++;r.newRound();}assert.equal(x.fb.corolla,true);assert(Math.abs(shell()-s0/2)<=2,'half: '+shell()+' vs '+s0);
 const party=()=>S(r).actors.filter(a=>a.side==='ALLY').reduce((n,a)=>n+a.hp,0),hp0=party();S(r).round=x.fb.corollaDue;r.roundEnd();assert(party()<hp0,'the rain hits');assert(S(r).log.some(l=>l.card==='FB_COROLLA_RAIN'));
 assert(r.fieldBossView().state.some(s=>/꽃봉오리 결정막/.test(s)));
 const p=field('FB_PYRO_REGISVINE');assert.equal(p.fieldBossBarrierReason(me(p),boss(p),'불'),'');
});

check('고대 바위 용 도마뱀 and 유적의 뱀: no wall that stops every blow — scales take 30% off, the armour 70% (physical) / 40%; a reflected beam cuts 10% of its HP',()=>{
 const r=field('FB_PRIMO_GEOVISHAP'),x=boss(r);assert.equal(r.fieldBossBarrierReason(me(r),x,'물리'),'');const a=r.combatDamageMultiplier(me(r),x,'물리',{});x.fb.exposedUntil=S(r).round+1;const b=r.combatDamageMultiplier(me(r),x,'물리',{});assert(Math.abs(a/(b/1.5)-.7)<1e-9,a+' '+b);
 x.fb.exposedUntil=0;for(const y of S(r).actors.filter(y=>y.side==='ALLY'))r.shield(y,99999,'TEST',5);x.turns=(x.turns||0)+1;x.fb.next='BEAM';const hp=x.hp;r.aiTurn(x,[]);assert.equal(hp-x.hp,Math.round(oldMax(r,x)*.1));
 const s=field('FB_RUIN_SERPENT'),z=boss(s);z.fb.burrowed=false;assert.equal(s.fieldBossBarrierReason(me(s),z,'물리'),'');const ph=s.combatDamageMultiplier(me(s),z,'물리',{}),fi=s.combatDamageMultiplier(me(s),z,'불',{});z.fb.armorOpened=true;const ph2=s.combatDamageMultiplier(me(s),z,'물리',{}),fi2=s.combatDamageMultiplier(me(s),z,'불',{});
 assert(Math.abs(ph/ph2-.3)<1e-9&&Math.abs(fi/fi2-.6)<1e-9,[ph,ph2,fi,fi2].join(' '));
});

check('유적의 뱀 「약점 저격」: after each charge, once; two weak points open the armour, all four lay it down',()=>{
 const r=field('FB_RUIN_SERPENT'),x=boss(r);x.fb.burrowed=false;x.fb.exposedUntil=S(r).round;assert(!card(r,CTL.cards.SERPENT),'only after a charge');
 x.fb.chargeSeq=1;const c=card(r,CTL.cards.SERPENT);assert.deepEqual(plain({k:c.mini.kind,p:c.mini.points,s:c.mini.shots}),{k:'SERPENT_SNIPE',p:4,s:6});
 const go=(rt,t,h)=>{rt._fbMini={kind:'SERPENT_SNIPE',id:card(rt,CTL.cards.SERPENT).mini.id,hits:h};try{rt.executeCombatSystem(me(rt),CTL.cards.SERPENT,t.id);}finally{rt._fbMini=null;}};
 go(r,x,2);assert.equal(x.fb.armorOpened,true);assert.equal(x.fb.stunned,false);assert.match(card(r,CTL.cards.SERPENT).reason,/이미 노렸습니다/);
 const r2=field('FB_RUIN_SERPENT'),z=boss(r2);z.fb.burrowed=false;z.fb.exposedUntil=S(r2).round;z.fb.chargeSeq=1;const at=S(r2).log.length;go(r2,z,4);
 assert.equal(z.fb.stunned,true);assert(z.fb.exposedUntil>=S(r2).round+2);assert(S(r2).log.slice(at).some(l=>l.card==='FB_SNIPE_DOWN'));
 // laid down, it does not burrow (and close its armour) before the next round is out
 r2.fbMove(z,'BURROW');assert.equal(z.fb.burrowed,false);assert.equal(z.fb.armorOpened,true);S(r2).round+=2;r2.fbMove(z,'BURROW');assert.equal(z.fb.burrowed,true);
});

check('물의 정령: the flood wave comes once a round; a flying form does not claim to land',()=>{
 const r=field('FB_OCEANID'),x=boss(r),at=S(r).log.length;r.fbMove(x,'WAVE');r.fbMove(x,'WAVE');const names=S(r).log.slice(at).map(l=>l.cardName).filter(Boolean);assert.equal(names.filter(n=>n==='침수 파도').length,1,names.join(','));
 const crane=r.fbSummon(S(r),x,'FB_MIMIC_CRANE'),k=S(r).log.length;r.fieldSummonTurn(crane);assert(!S(r).log.slice(k).some(l=>/내려앉았다/.test(l.text||'')));assert.equal(crane.airborne,true);
});

check('daily bosses: 타르탈리아\'s dodge follows his phase; 안드리우스\'s mark only on single blows; 드발린 texts and a downed dive',()=>{
 const r=daily('BOSS_TARTAGLIA'),b=S(r),t=b.actors.find(a=>a.source==='BOSS_TARTAGLIA');assert.equal(b.bossPass,1);
 for(const [ph,name] of [[1,'물 화살비 피하기'],[2,'뇌전 창 피하기'],[3,'진멸 피하기']]){t.liyuePhase=ph;b.dailyDodge.dodge=null;b.round=ph*3-1;r.newRound();const c=r.combatCards().find(c=>c.mini?.kind==='TARTAGLIA_DODGE');assert.equal(c.name,name);assert.equal(c.mini.phase,ph);}
 const a=daily('BOSS_ANDRIUS'),ab=S(a),w=ab.actors.find(x=>x.source==='BOSS_ANDRIUS'),u=ab.actors.find(x=>x.side==='ALLY');ab.twinBoss.mark=u.id;
 a.combatDamageMultiplier(w,u,'얼음',{card:'ECARD_ANDRIUS_CLAW'});// (its first blow of the fight carries a one-off factor)
 const mul=(c,p)=>{if(p)ab.bossPass=1;else delete ab.bossPass;return a.combatDamageMultiplier(w,u,'얼음',{card:c});};{const n0=mul('ECARD_ANDRIUS_SWEEP',0),n1=mul('ECARD_ANDRIUS_SWEEP',1);assert(Math.abs(n0/n1-1.3)<1e-9,'no mark bonus on a sweep: '+n0+' vs '+n1+' target '+u.source);}assert.equal(mul('ECARD_ANDRIUS_CLAW',1),mul('ECARD_ANDRIUS_CLAW',0),'the claw keeps it');ab.bossPass=1;
 assert.match(a.mondBossReadiness('BOSS_ANDRIUS').tips.join('|'),/2라운드마다 공격력 10%.*HP 50% 이하에서 한 차례 2행동/);
 const d=daily('BOSS_DVALIN'),db=S(d),dv=db.actors.find(x=>x.source==='BOSS_DVALIN');assert.match(d.mondBossReadiness('BOSS_DVALIN').tips[0],/^6·12·18·24라운드 끝에 지형 파괴 · 24라운드 종료 전 제압$/);
 const clock=d.enemyIntel(dv.id).cards.find(c=>c.id==='ECARD_DVALIN_TERRAIN_CLOCK');assert.match(clock.coefficient,/^6라운드마다/);assert.match(clock.summary,/^24라운드/);
 db.twinBoss.downUntil=db.round+1;dv.airborne=false;d.executeCard(dv,d.actorCards(dv).find(c=>c.id==='ECARD_DVALIN_DIVE'),db.actors.find(x=>x.side==='ALLY').id);assert.equal(dv.airborne,false,'stays down');
 assert.match(src('source/runtime_mutations_v0152.js'),/BOSS_ANDRIUS:\{name:'안드리우스',kind:'DAILY',region:'몬드',body:'BODY',immune:\['얼음','바람'\]/);
});

check('a fight saved before 0.16.54 keeps its rules, and a broken record is refused',()=>{
 // 무상의 얼음 without bossPass: the fleeing core and its chase
 const r=field('FB_CRYO_HYPOSTASIS'),b=S(r);delete b.bossPass;const x=boss(r);r.fbStartRevival(x);assert(!x.fb.revival.fruit);assert(card(r,CTL.cards.CHASE));
 // 유적의 뱀 without bossPass: the closed armour stops a blow
 const s=field('FB_RUIN_SERPENT'),z=boss(s);delete S(s).bossPass;z.fb.burrowed=false;assert.match(s.fieldBossBarrierReason(me(s),z,'물리'),/갑주가 닫혀/);
 // tampered records
 const v=field('FB_CRYO_HYPOSTASIS'),save=JSON.parse(v.serialize());for(const bad of [s=>{s.runtime.bossPass=2;},s=>{s.runtime.fieldBoss.anemoOrbs=1;},s=>{const y=s.runtime.actors.find(a=>a.fb);y.fb.revival={rounds:2,need:3,hits:0,startedRound:1,fruit:{id:1,tries:-1,melted:false,round:0}};}]){const c=plain(save);bad(c);assert.throws(()=>new api.Runtime(env.db,c),/보스/);}
 const w=field('FB_ANEMO_HYPOSTASIS'),ws=JSON.parse(w.serialize());ws.runtime.fieldBoss.orbsTaken=9;assert.throws(()=>new api.Runtime(env.db,ws),/보스 조작 전투 기록/);
});

check('the page plays the new minigames (keys, pad, touch) and the screen check opens them',()=>{
 const js=src('source/app_bossgames_v01646.js');for(const id of ['SYS_FB_WIND_ORBS','SYS_FB_FROST_FRUIT','SYS_FB_SERPENT_SNIPE'])assert(js.includes("'"+id+"'"),id);
 for(const k of ['ANEMO_ORBS(m,r){','FROST_FRUIT(m,r){','SERPENT_SNIPE(m,r){','TARTAGLIA_BY_PHASE'])assert(js.includes(k),k);
 for(const k of ['FB_ANEMO_ORBS','FB_CRYO_SHIELD','FB_ARMOR_SHUT','FB_SCALES','FB_COROLLA'])assert(js.includes("'"+k+"'"),k);
 assert(!/<select|::after|::before/.test(js),'no drop-downs or pseudo-element text');
 const fit=src('tests/test_screen_fit_v01629.mjs');for(const k of ['fb-mini-anemo-orbs','fb-mini-frost','fb-mini-serpent'])assert(fit.includes("'"+k+"'"),k);
 assert(src('tools/verify_release.py').includes("'tests/test_boss_pass_v01654.cjs'"));
});

console.log(passed+' passed');
