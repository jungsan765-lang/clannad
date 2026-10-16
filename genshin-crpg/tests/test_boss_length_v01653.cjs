'use strict';
// 0.16.53 (user, 2026-10-16: 「이제 필드보스랑 일일보스 다인모드 미니게임 가능하게 하고, 필드보스 일일보스는 좀 라운드를 길게 끌게 하자. HP같은걸
// 10배로 늘리거나 해서. 드발린은... 땅 무너지는 속도를 늦추거나」, 「핵 닫힘, 핵 노출 디버프가 갑자기 사라지는건 버그야?」).
// Every action copies the save, so the checks read the fight again after each action.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),H=require('../tools/audit_protagonist_v01618.cjs');
const ROOT=path.resolve(__dirname,'..'),env=H.load(ROOT),api=env.api,FB=api.fieldBosses,L=api.bossLengthV01653,src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const plain=x=>JSON.parse(JSON.stringify(x)),S=r=>r.s.runtime,PLAYER='PLAYER_CUSTOM',ROOM='Rabcdef1234',G1='aaaaaaaaaaaa';
// The same engine without the 0.16.53 block, to compare the very same fight.
function strip(){const c=vm.createContext({console,Date,setTimeout,clearTimeout}),index=src('source/index.html');
 for(const [,f] of index.matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)){let t=src('source/'+f);if(f==='runtime_reading.js'){const at=t.indexOf('/* 0.16.53 보스 장기전');assert(at>0);t=t.slice(0,at);}vm.runInContext(t,c,{filename:f});}
 vm.runInContext(src('source/presentation.js'),c);return {...env,c,R:c.CRPGRuntime.Runtime,api:c.CRPGRuntime};}
const before=strip();
function field(e,id,team=['MOND_AMBER','MOND_NOELLE','MOND_BARBARA'],coop=null){
 const r=H.setup(e,{level:FB.levels[id],route:'ROUTE_ISEKAI',team,seed:717,map:FB.bosses[id].map,enhance:3,talent:4});if(coop)r.coopContext=coop;
 r.action('PLACE_ENTER',{place:'BOSS:'+FB.route(id),mode:'BOSS'});r.action('BOSS_ROUTE',{route:FB.route(id),entry:'DIRECT'});r.die=()=>50;r.random=()=>.5;if(S(r).opening?.state==='PENDING')r.action('COMBAT_BEGIN');return r;}
function daily(e,id){const spec={BOSS_DVALIN:{level:28,map:'MAP_STORMTERROR_LAIR'},BOSS_ANDRIUS:{level:25,map:'MAP_WOLF_ARENA'}}[id];
 const r=H.setup(e,{level:spec.level,route:'ROUTE_ISEKAI',team:['MOND_AMBER','MOND_NOELLE','MOND_BARBARA'],seed:717,map:spec.map,gear:'craft',enhance:8,talent:6});for(const f of ['FLAG_BOSS_ANDRIUS_CLEAR','FLAG_BOSS_DVALIN_CLEAR'])r.s.flags[f]=true;
 r.action('MOND_MATERIAL_CHALLENGE',{boss:id});r.die=()=>50;r.random=()=>.5;if(S(r).opening?.state==='PENDING')r.action('COMBAT_BEGIN');return r;}
const boss=r=>S(r).actors.find(a=>a.side==='ENEMY'&&(a.fb||a.grade==='보스')&&!a.fbSummon);

check('a new field boss fight: boss HP ×3 and ATK ×0.45 (유적 뱀 HP ×2, 물의 정령 20 forms); summons, defence and draws as before',()=>{
 assert.deepEqual(plain({hp:L.hp,atk:L.atk,terrainEvery:L.terrainEvery}),{hp:3,atk:.45,terrainEvery:6});
 for(const id of ['FB_ANEMO_HYPOSTASIS','FB_CRYO_HYPOSTASIS','FB_RUIN_SERPENT','FB_OCEANID']){const a=field(env,id),b=field(before,id),x=boss(a),y=boss(b),k=id==='FB_RUIN_SERPENT'?2:id==='FB_OCEANID'?1:3;
  assert.deepEqual(plain(S(a).bossLength),id==='FB_OCEANID'?{version:1,hp:1,atk:.45,forms:20}:{version:1,hp:k,atk:.45},id);
  assert.equal(x.maxHp,Math.max(1,Math.round(y.maxHp*k)),id+' HP');assert.equal(x.atk,Math.max(1,Math.round(y.atk*.45)),id+' ATK');assert.equal(x.def,y.def,id+' DEF');
  assert.equal(a.s.global.PRNG_STATE,b.s.global.PRNG_STATE,id);}
 assert.equal(S(field(env,'FB_OCEANID')).fieldBoss.target,20);assert.equal(S(field(before,'FB_OCEANID')).fieldBoss.target,8);
});

check('what is measured against the boss\'s max HP keeps its old size: its own shields, the floating core, boss-sized summons, a failed revival',()=>{
 // 얼음 장벽 (20% of max HP)
 const a=field(env,'FB_CRYO_HYPOSTASIS'),x=boss(a);a.shield(x,x.maxHp*.2,'FB_ICE_WALL',null,{element:'얼음'});assert.equal(x.shields.find(s=>s.source==='FB_ICE_WALL').value,Math.round(x.maxHp*.2/3));
 // 무상의 바람's core: 18% of the old max HP
 const w=field(env,'FB_ANEMO_HYPOSTASIS'),y=boss(w);w.fbStartRevival(y);assert.equal(y.fb.revival.core,Math.round(Math.round(y.maxHp*.18)/3));
 // 현암 기둥 (a tenth of the boss)
 const g=field(env,'FB_GEO_HYPOSTASIS'),z=boss(g),p=g.fbSummon(S(g),z,'FB_SUMMON_PILLAR'),gb=field(before,'FB_GEO_HYPOSTASIS'),pb=gb.fbSummon(S(gb),boss(gb),'FB_SUMMON_PILLAR');assert.equal(p.maxHp,Math.max(1,Math.round(pb.maxHp*Math.round(boss(gb).maxHp*3)/(boss(gb).maxHp*3))));assert(Math.abs(p.maxHp-pb.maxHp)<=1,'pillar '+p.maxHp+' vs '+pb.maxHp);
 // a failed revival: 40% of the old max HP
 w.fbRevivalExpired(S(w),y);assert.equal(y.hp,Math.round(Math.round(y.maxHp*.4)/3));
 // the ground the boss spoils hits 0.45 as hard
 a.addHazard({id:'T',kind:'FLOOD',power:.06,rounds:2,targets:'ALL',source:x.id});assert(Math.abs(S(a).hazards.find(h=>h.id==='T').power-.027)<1e-9);
});

check('daily bosses: HP ×3, ATK ×0.45 (안드리우스 ×0.35, 타르탈리아 ×0.34, 야타용왕 ×0.75), 드발린\'s ground falls every 6 rounds, 안드리우스\'s rage every 2',()=>{
 assert.deepEqual(plain({a:L.byBoss.BOSS_ANDRIUS,t:L.byBoss.LIYUE_TARTAGLIA_FARM,z:L.byBoss.LIYUE_AZHDAHA_FARM,rage:L.rageEvery}),{a:{atk:.35},t:{atk:.34},z:{atk:.75},rage:2});
 const d=daily(env,'BOSS_DVALIN'),db=daily(before,'BOSS_DVALIN');assert.equal(S(d).terrainEvery,6);assert.equal(S(db).terrainEvery,undefined);assert.equal(boss(d).maxHp,Math.round(boss(db).maxHp*3));assert.equal(boss(d).atk,Math.max(1,Math.round(boss(db).atk*.45)));
 const b=S(d);b.round=6;d.roundEnd();assert.equal(S(d)?.terrain??b.terrain,3,'falls at round 6');const t=S(d).terrain;S(d).round=8;d.roundEnd();assert.equal(S(d).terrain,t,'not at round 8');
 assert.match(src('source/runtime_mond_boss_balance.js'),/라운드마다 1씩 무너짐/);
 const a=daily(env,'BOSS_ANDRIUS'),ab=daily(before,'BOSS_ANDRIUS'),x=boss(a);assert.equal(x.maxHp,Math.round(boss(ab).maxHp*3));assert.equal(x.atk,Math.max(1,Math.round(boss(ab).atk*.35)));assert.equal(S(a).rageEvery,2);assert.equal(S(ab).rageEvery,undefined);
 // rage: ×1.10 on rounds 2, 4, 6 … (the old fight: every round from 2)
 const atk0=x.atk;for(const n of [2,3,4,5])S(a).round=n,a.prepareAndriusRound();assert(Math.abs(boss(a).atk-atk0*1.1*1.1)<1e-6,'two rages by round 5: '+boss(a).atk);assert.equal(boss(a).andrius.rageStacks,2);
 const y=boss(ab),atk1=y.atk;for(const n of [2,3,4,5])S(ab).round=n,ab.prepareAndriusRound();assert(Math.abs(boss(ab).atk-atk1*1.1**4)<1e-6,'the old fight: four rages');
 const intel=a.enemyIntel(x.id),p=intel.cards.find(c=>c.id==='ECARD_ANDRIUS_PASSIVE');assert.match(p.coefficient,/2라운드마다 ATK/);assert.match(p.description,/2라운드마다 현재 ATK/);assert(intel.cues.some(c=>c.text==='분노 2 · 2라운드마다 공격력 ×1.10'));
 assert.match(ab.enemyIntel(y.id).cards.find(c=>c.id==='ECARD_ANDRIUS_PASSIVE').coefficient,/매 라운드/);
});

check('a saved boss fight keeps its numbers, and a broken record is refused',()=>{
 const r=field(env,'FB_ELECTRO_HYPOSTASIS'),save=JSON.parse(r.serialize()),loaded=new api.Runtime(env.db,plain(save));assert.deepEqual(plain(loaded.s.runtime),plain(save.runtime));
 for(const bad of [{version:1,hp:0,atk:.45},{version:1,hp:3,atk:2},{version:2,hp:3,atk:.45}]){const s=plain(save);s.runtime.bossLength=bad;assert.throws(()=>new api.Runtime(env.db,s),/보스 전투 기록/);}
 const d=daily(env,'BOSS_DVALIN'),ds=JSON.parse(d.serialize());ds.runtime.terrainEvery=1;assert.throws(()=>new api.Runtime(env.db,ds),/드발린 지형 기록/);
 const w=daily(env,'BOSS_ANDRIUS'),ws=JSON.parse(w.serialize());ws.runtime.rageEvery=0;assert.throws(()=>new api.Runtime(env.db,ws),/안드리우스 분노 기록/);
 // A field fight that is not a boss fight is untouched.
 const f=H.setup(env,{level:20,team:['MOND_AMBER']});f.startBattle('EG_LEY_MOND_PLAINS','EXPLICIT');assert.equal(S(f).bossLength,undefined);
});

check('only the boss\'s own repeat fight is long; a number the operator set exactly stays; the opening order shows the long HP',()=>{
 // the same boss started another way (an explicit start, another boss's challenge) is as it was
 const id='FB_ANEMO_HYPOSTASIS';for(const origin of ['EXPLICIT','MATERIAL_CHALLENGE:BOSS_ANDRIUS']){const f=H.setup(env,{level:FB.levels[id],team:['MOND_AMBER'],map:FB.bosses[id].map});f.startBattle('EG_FB_ANEMO_HYPOSTASIS',origin);assert.equal(S(f).bossLength,undefined,origin);}
 const w=H.setup(env,{level:25,team:['MOND_AMBER'],map:'MAP_WOLF_ARENA'});w.startBattle('EG_BOSS_ANDRIUS','MATERIAL_CHALLENGE:BOSS_DVALIN');assert.equal(S(w).bossLength,undefined,'another boss\'s challenge');assert.equal(S(w).rageEvery,undefined);
 // the operator's exact HP/ATK (admin.html 밸런스) is the fight's; a level-only edit is still lengthened
 let rev=7;const enter=config=>{const base=H.setup(env,{level:FB.levels[id],route:'ROUTE_ISEKAI',team:['MOND_AMBER'],seed:717,map:FB.bosses[id].map}),r=api.adminBalance.createRuntime(env.db,JSON.parse(base.serialize()),{revision:rev++,config});r.action('PLACE_ENTER',{place:'BOSS:'+FB.route(id),mode:'BOSS'});const out=r.action('BOSS_ROUTE',{route:FB.route(id),entry:'DIRECT'});return {r,out};};
 const exact=api.adminBalance.emptyConfig();exact.enemies[id]={hp:50000,atk:3000};const e=enter(exact),x=boss(e.r);assert.deepEqual([x.maxHp,x.atk],[50000,3000]);assert.deepEqual(plain(S(e.r).bossLength),{version:1,hp:1,atk:1});
 const lvl=api.adminBalance.emptyConfig();lvl.enemies[id]={level:FB.levels[id]};const l=enter(lvl),n=enter(api.adminBalance.emptyConfig());assert.deepEqual([boss(l.r).maxHp,boss(l.r).atk],[boss(n.r).maxHp,boss(n.r).atk]);assert.equal(S(l.r).bossLength.hp,3);
 // the order the opening answers with is drawn after the HP is raised
 const q=n.out.result.order.find(o=>o.id===boss(n.r).id);assert.deepEqual([q.hp,q.maxHp],[boss(n.r).maxHp,boss(n.r).maxHp]);
 // the operator's list says what a new repeat fight multiplies
 const r=new api.Runtime(env.db);r.installGrowthContent?.();const cat=api.adminBalance.catalog(r);assert.match(cat.enemies.find(c=>c.id===id).baselineHint,/장기전이라 여기에 HP ×3 · 공격력 ×0\.45/);assert.match(cat.enemies.find(c=>c.id==='BOSS_AZHDAHA').baselineHint,/HP ×3 · 공격력 ×0\.75/);assert(!/장기전/.test(cat.enemies.find(c=>c.id==='MON_SLIME_PYRO')?.baselineHint||''));
});

check('shared fights: the host\'s protagonist and a guest\'s own fighter on its turn get the minigame cards, and the guest\'s result settles',()=>{
 const g=H.setup(env,{level:18,team:['MOND_AMBER'],route:'ROUTE_TRAVELER'}),snap=g.coopSnapshot(PLAYER),ctx=(caller=null)=>({version:1,room:ROOM,members:[{pid:G1,name:'손님',snap}],caller});
 const r=field(env,'FB_ANEMO_HYPOSTASIS',['MOND_AMBER','MOND_NOELLE','MOND_BARBARA'],ctx());const b=S(r);assert(b.coop,'a shared fight');
 const guest=b.actors.find(a=>a.coop&&a.control==='GUEST');assert(guest,'the guest fights');
 b.fieldBoss.dodge={kind:'ANEMO',id:7,seed:3,round:b.round,result:null,playerActed:false};
 // the host
 const id='SYS_FB_WIND_DODGE';assert(r.combatCards().some(c=>c.id===id&&c.mini),'the host gets it');
 // the guest, on its turn
 b.coop.turn={actor:guest.id,deadline:Date.now()+20000};b.phase='WAIT_PLAYER';
 const cards=r.combatCards(guest.id);assert(cards.some(c=>c.id===id&&c.mini&&!c.reason),'the guest gets it: '+cards.map(c=>c.id).join(','));
 const view=r.coopBattleView(G1);assert(view.cards.some(c=>c.id===id&&c.mini&&c.mini.kind==='ANEMO_DODGE'),'the guest\'s screen gets the minigame');
 r.coopContext=ctx(G1);const out=r.coopCombat({room:ROOM,card:id,target:guest.id,mini:{kind:'ANEMO_DODGE',id:7,hits:1,orbs:2}});assert.equal(out.card,id);
 const after=S(r);assert.deepEqual(plain(after.fieldBoss.dodge?.result||after.log.find(l=>l.fbMini==='ANEMO_DODGE')&&{hits:1,orbs:2}),{hits:1,orbs:2});assert(after.log.some(l=>l.fbMini==='ANEMO_DODGE'&&/1발/.test(l.text)));
 // not on its turn: none
 const r2=field(env,'FB_ANEMO_HYPOSTASIS',['MOND_AMBER','MOND_NOELLE','MOND_BARBARA'],ctx()),b2=S(r2),g2=b2.actors.find(a=>a.coop);b2.fieldBoss.dodge={kind:'ANEMO',id:8,seed:3,round:b2.round,result:null,playerActed:false};b2.coop.turn=null;assert(!r2.combatCards(g2.id).some(c=>c.mini));
 // the server lets the result through, trimmed
 assert.match(src('server/coop-v0153.mjs'),/params\.mini=\{kind:String\(b\.mini\.kind\|\|''\)\.slice\(0,24\)/);
 assert.match(src('source/app_coop_v0153.js'),/mini:C\.mini\|\|undefined/);assert.match(src('source/app_bossgames_v01646.js'),/CRPGCoopWorld/);
});

check('the core chips read the boss record from the fight while a turn plays (the playback copy has no fb)',()=>{
 const t=src('source/app_bossgames_v01646.js');assert.match(t,/const real=a\.fb\?a:\(b\.actors\|\|\[\]\)\.find\(x=>x\.id===a\.id\)\|\|a,f=real\.fb/);
});

console.log(passed+' passed');
