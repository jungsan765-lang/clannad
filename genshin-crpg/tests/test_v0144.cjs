'use strict';
// v0.14.4: formations, field boss levels and daily limit, ley line blossoms, two-day boss rematches, skill rhythm and
// 공명 각성, Liyue recruitment gates, item tiers and the screens that show them.
const assert=require('node:assert/strict'),path=require('path'),{fresh,c,fs,root,advance}=require('./helpers_v011.cjs');
const {fixture}=require('./helpers_abyss.cjs'),{equip}=require('./helpers_abyss_artifacts.cjs');
const api=c.CRPGRuntime,plain=x=>JSON.parse(JSON.stringify(x)),results=[];
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const TEAM=['MOND_AMBER','MOND_KAEYA','MOND_LISA'];

check('formations use plain in-world names and the chosen one reaches the battle',()=>{
 const F=api.formationConfig;assert.deepEqual(Object.values(F.formations).map(f=>f.name),['돌격 진형','연계 진형','수호 진형','기동 진형','균형 진형']);
 assert(!/단종진|복종진|윤형진|제형진|단횡진/.test(JSON.stringify(F)),'no naval formation terms');
 const r=fixture(12,TEAM,7);r.action('FORMATION_SET',{formation:'LINE_AHEAD'});r.startBattle('EG_LEY_MOND_PLAINS','EXPLICIT');
 assert.equal(r.s.runtime.formationV1.id,'LINE_AHEAD');return {formation:r.s.runtime.formationV1};
});

check('field bosses: one fixed level each (Mond 18-30, Liyue 38-56), in a clear order',()=>{
 const FB=api.fieldBosses,r=fresh();const lv=Object.fromEntries(Object.entries(FB.bosses).map(([id,d])=>[id,d.level]));
 for(const [id,d]of Object.entries(FB.bosses)){assert.equal(Number(r.row('09_MONSTER_DB',id)[18]),d.level,id);if(d.region==='몬드')assert(d.level>=18&&d.level<=30,id);else assert(d.level>=38&&d.level<=56,id);}
 assert.equal(new Set(Object.values(lv)).size,9,'every boss has its own level');
 assert(Number(r.row('09_MONSTER_DB','FB_RUIN_SERPENT')[7])>Number(r.row('09_MONSTER_DB','FB_CRYO_REGISVINE')[7]),'higher level hits harder');
 return lv;
});

check('field bosses: all together pay out three times in every 12 real hours (KST 00:00/12:00); defeats never count',()=>{
 const FB=api.fieldBosses,boss='FB_CRYO_REGISVINE',route=FB.route(boss),r=fixture(10,TEAM,7);
 r.actionStartedAt=Date.UTC(2026,9,1,1,0,0); // 10:00 Korean time: the 00:00-12:00 window
 r.s.global.CURRENT_MAP_ID=FB.bosses[boss].map;r.s.global.SCREEN_MODE='LOCATION';const w=r.fieldBossWindow();assert.equal(w%2,0);assert.equal(r.fieldBossDaily().resetAt,'12:00');
 r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});r.action('BOSS_ROUTE',{route,entry:'DIRECT'});let b=r.s.runtime;
 for(const a of b.actors.filter(x=>x.side==='ENEMY'))a.hp=0;r.finishBattle(true);assert.deepEqual(plain(r.s.fieldBossWindow),{window:w,wins:1});
 assert.equal(r.placeBossReason(route,'DIRECT'),'','the same boss can be fought again at once');
 if(r.s.placeVisit?.place!=='BOSS:'+route)r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});r.action('BOSS_ROUTE',{route,entry:'DIRECT'});b=r.s.runtime;for(const a of b.actors.filter(x=>x.side==='ALLY'))a.hp=0;r.finishBattle(false);assert.equal(r.s.fieldBossWindow.wins,1,'a defeat does not count');
 r.s.fieldBossWindow={window:w,wins:3};assert.match(r.placeBossReason(route,'DIRECT'),/12시간마다 3번/);
 assert.equal(r.fieldBossRouteInfo(route).daily.left,0);
 r.s.global.WORLD_DAY+=1;assert.match(r.placeBossReason(route,'DIRECT'),/12시간마다/,'an in-game day no longer resets the count');
 r.actionStartedAt=Date.UTC(2026,9,1,3,0,0);assert.equal(r.fieldBossWindow(),w+1);assert.equal(r.fieldBossDaily().resetAt,'00:00');assert.equal(r.placeBossReason(route,'DIRECT'),'','12:00 Korean time opens a new count');
 const bad=JSON.parse(r.serialize());bad.fieldBossWindow={window:-1,wins:1};assert.throws(()=>new api.Runtime(require(path.join(root,'content/db.json')),bad),/12시간 토벌/);
 return {limit:api.fieldBossLimits.dailyLimit,hours:api.fieldBossLimits.windowHours};
});

check('ley line blossoms: two per region each real hour, steps opened by level, one payout per kind and hour',()=>{
 const L=api.leyLines;
 for(let h=500000;h<500048;h++){const s=L.sitesAt(h);assert.equal(s.length,4);for(const region of ['몬드','리월']){const x=s.filter(b=>b.region===region);assert.deepEqual(plain(x.map(b=>b.kind).sort()),['REVELATION','WEALTH']);assert.notEqual(x[0].map,x[1].map);}}
 assert.deepEqual(plain(L.sitesAt(424242)),plain(L.sitesAt(424242)),'the same hour gives the same places');
 assert.deepEqual(plain(L.tiers.map(t=>t.level)),[6,10,15,20,28]);
 let h=500000;while(!L.sitesAt(h).some(b=>b.kind==='REVELATION'&&b.map==='MAP_MOND_PLAINS'))h++;
 const r=fixture(12,TEAM,8),id=L.route('REVELATION','MAP_MOND_PLAINS');r.actionStartedAt=h*L.hourMs+60000;Object.assign(r.s.global,{CURRENT_MAP_ID:'MAP_MOND_PLAINS',SCREEN_MODE:'LOCATION'});
 const ley=r.placeEntries().filter(e=>String(e.route||'').startsWith('BRT_LEY_'));assert.deepEqual(plain(ley.map(e=>e.route)),[id],'only this hour\'s blossom is listed');
 assert.equal(r.leyLineTopTier(),3);assert.match(r.actionReason('BOSS_ROUTE',{route:id,entry:'DIRECT',tier:4}),/Lv\. 15/);
 const other=L.route('WEALTH','MAP_MOND_PLAINS');if(!L.sitesAt(h).some(b=>b.route===other))assert.match(r.placeBossReason(other,'DIRECT'),/옮겨 갔습니다/);
 r.action('PLACE_ENTER',{place:'BOSS:'+id,mode:'BOSS'});r.action('BOSS_ROUTE',{route:id,entry:'DIRECT',tier:2});
 let b=r.s.runtime;assert.equal(b.leyLine.tier,2);assert(b.actors.filter(a=>a.side==='ENEMY').every(a=>a.level===10),'enemies at the step level');assert.equal(r.s.bossRouteProgress.leyTier,2,'a retry fights the same step');
 const hero=r.itemCount('MAT_CHAR_EXP_HERO'),adv=r.itemCount('MAT_CHAR_EXP_ADVENTURER');for(const a of b.actors.filter(x=>x.side==='ENEMY'))a.hp=0;r.finishBattle(true);
 assert.equal(r.itemCount('MAT_CHAR_EXP_HERO'),hero+4);assert.equal(r.itemCount('MAT_CHAR_EXP_ADVENTURER'),adv);assert(r.leyLineClaimed('REVELATION'));
 assert.match(r.placeBossReason(id,'DIRECT'),/이미 받았습니다/);
 r.actionStartedAt+=L.hourMs;assert.equal(r.leyLineClaimed('REVELATION'),false,'a new hour, a new blossom');
 const bad=JSON.parse(r.serialize());bad.leyLine={version:1,REVELATION:-1};assert.throws(()=>new api.Runtime(require(path.join(root,'content/db.json')),bad),/지맥의 꽃/);
 return {hour:h,route:id};
});

check('two-day boss rematches: Lv.15 Andrius and Lv.18 Dvalin, opened a little lower, paying Hero books',()=>{
 const cfg=api.enhancementConfig.bosses,M=api.bossRematch;assert.deepEqual([M.BOSS_ANDRIUS.level,M.BOSS_DVALIN.level],[25,28]);
 const r=fixture(21,TEAM,8),c0=cfg.BOSS_ANDRIUS,row=r.row('35_BOSS_ROUTE_DB',c0.route);r.s.flags[row[13]]=true;Object.assign(r.s.global,{CURRENT_MAP_ID:c0.map,SCREEN_MODE:'LOCATION'});
 assert.match(r.materialChallengeReason('BOSS_ANDRIUS'),/Lv\. 22/);r.action('OPERATOR_DEBUG',{op:'level',value:22});assert.equal(r.materialChallengeReason('BOSS_ANDRIUS'),'');
 r.action('MOND_MATERIAL_CHALLENGE',{boss:'BOSS_ANDRIUS'});const b=r.s.runtime,boss=b.actors.find(a=>a.source==='BOSS_ANDRIUS');
 assert.equal(boss.level,25);assert.equal(b.rematch.level,25);assert.equal(b.mondBalance.rewards.xp,120+25*25);
 const books=r.itemCount('MAT_CHAR_EXP_HERO');for(const a of b.actors.filter(x=>x.side==='ENEMY'))a.hp=0;r.finishBattle(true);assert.equal(r.itemCount('MAT_CHAR_EXP_HERO'),books+2);
 return {boss:{level:boss.level,hp:boss.maxHp,atk:boss.atk}};
});

check('skill rhythm: companions keep their own E/Q periods, and slower cards land harder',()=>{
 const r=fresh(),def=id=>r.cardDefinition(r.row('08_SKILL_CARD_DB',id));
 assert.deepEqual([def('MOND_BENNETT_E').cooldown,def('MOND_BARBARA_E').cooldown,def('LIYUE_XIANGLING_Q').cooldown,def('LIYUE_ZHONGLI_Q').cooldown],[2,4,5,3]);
 const pairs=Object.values(api.skillRhythm.rhythm).map(x=>x.join('/'));assert.equal(pairs.length,43);assert(new Set(pairs).size>=7,'no longer one shared pair');
 assert.deepEqual(plain(r.skillRhythm('MOND_BARBARA')),{e:4,q:6,ePower:1.6,qPower:1.5});
 return {distinct:new Set(pairs).size};
});

check('공명 각성: only a companion holding their exclusive weapon, only on the burst, logged for the screen',()=>{
 const r=fixture(16,['MOND_KAEYA','MOND_AMBER','MOND_LISA'],9);equip(r,'MOND_KAEYA','EQ_EX_MOND_KAEYA',10);r.recalculate();
 assert.equal(r.resonanceChance('MOND_KAEYA'),.5);assert.equal(r.resonanceChance('MOND_AMBER'),0);
 r.startBattle('EG_LEY_MOND_PLAINS','EXPLICIT');if(r.s.runtime.opening)r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});const b=r.s.runtime;
 r.resonanceChance=()=>1;const foe=b.actors.find(a=>a.side==='ENEMY'&&a.hp>0),kaeya=b.actors.find(a=>a.source==='MOND_KAEYA'),amber=b.actors.find(a=>a.source==='MOND_AMBER');
 r.executeCard(amber,r.cardDefinition(r.row('08_SKILL_CARD_DB','MOND_AMBER_Q')),foe.id);assert(!b.log.some(e=>e.resonance),'no exclusive weapon, no awakening');
 r.executeCard(kaeya,r.cardDefinition(r.row('08_SKILL_CARD_DB','MOND_KAEYA_E')),foe.id);assert(!b.log.some(e=>e.resonance),'the skill never awakens');
 r.executeCard(kaeya,r.cardDefinition(r.row('08_SKILL_CARD_DB','MOND_KAEYA_Q')),foe.id);const hit=b.log.find(e=>e.resonance);
 assert(hit&&hit.actorId===kaeya.id&&hit.card==='MOND_KAEYA_Q'&&Number.isInteger(hit.round));assert.equal(r._rhythm??null,null,'the bonus ends with the card');
 return {entry:plain(hit)};
});

check('Andrius: a claw taken by a covering neighbour no longer stops the battle',()=>{
 const r=fixture(8,['MOND_NOELLE','MOND_AMBER','MOND_LISA'],6);r.s.global.CURRENT_MAP_ID='MAP_WOLF_ARENA';r.startBattle('EG_BOSS_ANDRIUS','EXPLICIT');if(r.s.runtime.opening)r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});const b=r.s.runtime;
 const andrius=b.actors.find(a=>a.source==='BOSS_ANDRIUS'),allies=b.actors.filter(a=>a.side==='ALLY'&&a.hp>0),target=allies[1],cover=allies[2];
 r.coverFor=(a,t,o)=>o?.covered||t.id===cover.id?null:cover;
 assert.doesNotThrow(()=>r.executeAndriusCard(andrius,r.cardDefinition(r.row('12_ENEMY_CARD_DB','ECARD_ANDRIUS_CLAW'),true),target.id));
 assert(b.log.some(e=>e.cover&&e.targetId===target.id),'the neighbour took it');
});

check('Liyue companions ask for more than Mond ones: a level per story stage and costlier preparation',()=>{
 const r=fresh('MAP_LIYUE_HARBOR','ROUTE_ISEKAI'),defs=[...r.storyIndex().legends.values()].filter(d=>d.ROUTE_SCOPE==='ROUTE_ISEKAI'),d=id=>defs.find(x=>x.CHAR_ID===id);
 // 0.14.12: 4★ need two more levels and two boss materials at every chapter; 5★ much more (runtime_rarity_v01412.js).
 assert.equal(d('LIYUE_XIANGLING').LIYUE_RECRUIT_LEVEL,10);assert.equal(d('LIYUE_XIANGLING').COST_MORA,1200);assert.deepEqual(JSON.parse(d('LIYUE_XIANGLING').COST_ITEMS_JSON),{ING_RICE:6,ING_SHRIMP:4,MAT_FB_EVERFLAME_SEED:2});
 assert.equal(d('LIYUE_NINGGUANG').LIYUE_RECRUIT_LEVEL,16);assert.equal(d('LIYUE_NINGGUANG').COST_MORA,2400);assert.equal(JSON.parse(d('LIYUE_NINGGUANG').COST_ITEMS_JSON).MAT_FB_BASALT_PILLAR,2);
 assert(defs.filter(x=>x.REGION==='리월'&&x.CHAR_ID!=='LIYUE_ZHONGLI').every(x=>/PLAYER_LEVEL_STATE>=(10|12|14|16|18|19) /.test(x.START_CONDITION)));
 assert(defs.filter(x=>x.REGION==='몬드'&&r.rarityOf(x.CHAR_ID)===4).every(x=>!/PLAYER_LEVEL_STATE/.test(String(x.START_CONDITION))),'Mond 4★ keep their conditions');
 assert(defs.filter(x=>x.REGION==='몬드'&&r.rarityOf(x.CHAR_ID)===5&&x.CHAR_ID!=='MOND_VENTI').every(x=>/PLAYER_LEVEL_STATE>=10/.test(x.START_CONDITION)&&/FLAG_ISK_M05_CLEAR=TRUE/.test(x.START_CONDITION)),'Mond 5★ need the Mond story and Lv.10');
 assert.equal(d('LIYUE_HUTAO').LIYUE_RECRUIT_STAGE,2);assert.equal(d('LIYUE_HUTAO').LIYUE_RECRUIT_LEVEL,16);assert.equal(JSON.parse(d('LIYUE_HUTAO').COST_ITEMS_JSON).MAT_FB_JUVENILE_JADE,4);assert.equal(d('LIYUE_HUTAO').RARITY_OCULI.count,8);
 const req=r.legendRequirements(d('LIYUE_KEQING'),{cost:false,location:false,introduction:false}).find(x=>x.kind==='level');assert.match(req.label,/Lv\. 16/);assert.equal(req.met,false);
});

check('item tiers: 일반 · 상급 · 희귀 · 영웅 · 전설',()=>{
 const P=require(path.join(root,'source/inventory_presenter.js'));assert.deepEqual(P.TIER_LABELS.slice(1),['일반','상급','희귀','영웅','전설']);
 assert.equal(P.tierRank(false,'일반'),1);assert.equal(P.tierRank(false,'희귀'),3);assert.equal(P.tierRank(false,'전설'),5);
});

check('screens: new scripts are wired in order and the UI shows the new rules',()=>{
 const html=fs.readFileSync(path.join(root,'source/index.html'),'utf8'),build=fs.readFileSync(path.join(root,'tools/build.py'),'utf8'),at=f=>html.indexOf(f);
 const order=['runtime_field_bosses.js','runtime_formations.js','runtime_field_boss_limits.js','runtime_ley_lines.js','runtime_boss_rematch.js','runtime_skill_rhythm.js'];
 for(let i=1;i<order.length;i++)assert(at(order[i])>at(order[i-1]),order[i]);
 for(const f of [...order.slice(2),'app_tiers.js','app_ley_lines.js','app_resonance.js'])assert(build.includes("'"+f+"'"),f);
 assert(at('app_resonance.js')>at('presentation.js')&&at('app_resonance.js')>at('app_combat_fx.js'));
 const read=f=>fs.readFileSync(path.join(root,'source',f),'utf8'),css=read('style.css');
 assert(read('app_navigation.js').includes('if(this.target===current)this.target=null'),'a destination stays until arrival');
 for(const f of ['app_mond_encounters.js','app_liyue_region_guide.js'])assert(read(f).includes("el('details','card mond-region-guide"),f+' folds the region guide');
 for(const x of ['.lack{','.resonance-cue{','.combat-duo','.ley-line-card','.tier-5'])assert(css.includes(x),x);
 assert(read('app_resonance.js').includes('portraitFor(profile,7)||portraitFor(profile,1)'),'motion art with the default image as fallback');
});

// ---- 0.14.5 ----
check('0.14.5 two-day bosses open once per real day (Korean midnight), win or lose',()=>{
 const cfg=api.enhancementConfig.bosses,r=fixture(25,TEAM,9),c0=cfg.BOSS_ANDRIUS,row=r.row('35_BOSS_ROUTE_DB',c0.route);r.s.flags[row[13]]=true;Object.assign(r.s.global,{CURRENT_MAP_ID:c0.map,SCREEN_MODE:'LOCATION'});
 const noonKst=Date.UTC(2026,8,29,3,0,0);r.actionStartedAt=noonKst;assert.equal(r.materialChallengeReason('BOSS_ANDRIUS'),'');
 r.action('MOND_MATERIAL_CHALLENGE',{boss:'BOSS_ANDRIUS'});const b=r.s.runtime;for(const a of b.actors.filter(x=>x.side==='ALLY'))a.hp=0;r.finishBattle(false);
 r.actionStartedAt=noonKst+11*3600000;assert.match(r.bossAdmission('BOSS_ANDRIUS').reason,/하루에 한 번.*1시간/,'a defeat still used the day');
 assert.equal(r.bossAdmission('BOSS_DVALIN').reason,'','each boss has its own day');
 r.actionStartedAt=noonKst+12*3600000+60000;assert.equal(r.bossAdmission('BOSS_ANDRIUS').reason,'','a new day after midnight');
 const bad=JSON.parse(r.serialize());bad.bossRealAdmissions={BOSS_NOPE:1};assert.throws(()=>new api.Runtime(require(path.join(root,'content/db.json')),bad),/보스 입장 기록/);
});
check('0.14.5 equipment tiers follow the star grade (3★ blue, 4★ purple, 5★ gold)',()=>{
 const P=require(path.join(root,'source/inventory_presenter.js'));
 assert.deepEqual([P.tierRank(true,'3성','T1 일반'),P.tierRank(true,'4성','T2 고급'),P.tierRank(true,'5성','T3 보스 소재'),P.tierRank(true,'','T2 제작'),P.tierRank(true,'영웅','T4 영웅')],[3,4,5,2,4]);
});
check('0.14.5 the Baron Bunny never acts; its explosion is labelled as one',()=>{
 const r=fixture(12,TEAM,7);r.startBattle('EG_LEY_MOND_PLAINS','EXPLICIT');if(r.s.runtime.opening)r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});const b=r.s.runtime,amber=b.actors.find(a=>a.source==='MOND_AMBER');
 r.executeCard(amber,r.cardDefinition(r.row('08_SKILL_CARD_DB','MOND_AMBER_E')));const bunny=b.fields.find(f=>f.kind==='BUNNY');assert(bunny);
 assert.equal(r.actorCards(amber).some(x=>x.id==='MOND_AMBER_Q'),true);assert(!b.actors.some(a=>/BUNNY/.test(a.id)),'the bunny is a field, not an actor that takes turns');
 const start=b.log.length;r.explodeBunny(bunny);const blast=b.log.slice(start).filter(e=>Object.hasOwn(e,'damage'));assert(blast.length&&blast.every(e=>e.cardName==='폭발'&&e.presentationActorName==='토끼 백작'));
});
check('0.14.5 the party screen shows the party first, then formation and battle line',()=>{
 const src=fs.readFileSync(path.join(root,'source/app_party.js'),'utf8');assert(src.includes("p.append(formation);formationChoice(p);formationLine(p);"));assert(!src.includes("formationChoice(p);formationLine(p);p.append(el('h2','','동료 편성'))"));
});

fs.mkdirSync(path.join(root,'reports/v0144'),{recursive:true});fs.writeFileSync(path.join(root,'reports/v0144/checks.json'),JSON.stringify({version:'0.14.4',results},null,2)+'\n');
console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.ok).length}));
