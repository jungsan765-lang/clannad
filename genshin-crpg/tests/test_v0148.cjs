'use strict';
// v0.14.8: the PC frame follows the window (화면 크기 setting), hidden oculi only glint inside 풍경 보기, town
// facilities as tiles, field bosses counted per 12 real hours, 일일 보스 and the 나선 각인 explanation.
// v0.14.9: sure-hit E/Q, the 이세계인 class, one Liyue smith and forge-only 4★+ weapons, Amber's personal mission,
// 원석·특성·운명의 자리, and travel routes along the drawn roads.
const assert=require('node:assert/strict'),path=require('path'),{fresh,c,fs,root}=require('./helpers_v011.cjs');
const {fixture}=require('./helpers_abyss.cjs');
const api=c.CRPGRuntime,plain=x=>JSON.parse(JSON.stringify(x)),results=[];
const src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}

check('field bosses: three wins per 12 real hours in total, reset at 00:00 and 12:00 Korean time, no in-game wait',()=>{
 const FB=api.fieldBosses,r=fixture(12,['MOND_AMBER','MOND_KAEYA','MOND_LISA'],7);
 const at=(y,m,d,h,min=0)=>Date.UTC(y,m-1,d,h-9,min); // Korean wall-clock time
 r.actionStartedAt=at(2026,10,1,11,59);const w=r.fieldBossWindow();
 r.actionStartedAt=at(2026,10,1,12,0);assert.equal(r.fieldBossWindow(),w+1,'12:00 starts a new count');
 r.actionStartedAt=at(2026,10,2,0,0);assert.equal(r.fieldBossWindow(),w+2,'00:00 starts a new count');
 r.actionStartedAt=at(2026,10,1,9,30);
 const boss='FB_ANEMO_HYPOSTASIS',route=FB.route(boss);r.s.global.CURRENT_MAP_ID=FB.bosses[boss].map;r.s.global.SCREEN_MODE='LOCATION';
 r.s.fieldBossClock={[boss]:999999};assert.equal(r.fieldBossCooldown(boss).reason,'','an old in-game return time no longer blocks');
 assert.equal(r.placeBossReason(route,'DIRECT'),'');
 r.s.fieldBossWindow={window:r.fieldBossWindow(),wins:3};const d=r.fieldBossDaily();
 assert.equal(d.left,0);assert.equal(d.resetAt,'12:00');assert.equal(d.minutesLeft,150);assert.match(d.reason,/12시간마다 3번/);
 assert.equal(api.fieldBossLimits.windowHours,12);
 return plain(d);
});

check('hidden oculi: no banner or card gives them away; they glint only inside 풍경 보기',()=>{
 const r=fresh('MAP_MOND_PLAINS');const hidden=r.oculusEntries().filter(p=>p.method==='HIDDEN');
 assert.equal(hidden.length,1,'the Mond plains has one hidden oculus');assert.equal(hidden[0].hotspot?.zone,'scene-bottom-right');
 const shell=src('app_shell.js'),css=src('shell.css');
 assert(shell.includes("$(':scope > .discovery-scene',content);if(discovery)discovery.classList.add('shell-offscreen')"),'the old scrolling banner is hidden');
 assert(shell.includes("p.method==='HIDDEN'")&&shell.includes("'scenery-glint'"),'the glint is drawn only for hidden oculi');
 assert(shell.includes("toolButton('EYE','풍경 보기 (V)'"),'every field and town has the 풍경 보기 button');
 assert(!/주변 풍경|주변 살펴보기/.test(shell),'no card or button points at the hidden spot');
 assert(css.includes('.shell-scenery .scenery-glint')&&!css.includes('.shell-discovery'),'styles');
 assert(!src('runtime_geo_trails.js').includes('메인 화면의 풍경을 좌우로'),'the Geo ledger hint no longer explains the trick');
 return {hidden:hidden.map(p=>p.id)};
});

check('PC frame: the page follows the window at the chosen 화면 크기, within 1280x720 to 1600/size high and about 2:1',()=>{
 const html=src('index.html'),shell=src('app_shell.js');
 assert(html.includes("SIZES[JSON.parse(localStorage.getItem('crpg-preferences-v3')||'{}').uiScale]||1")&&html.includes('SIZES={small:.85,large:1.2}'),'reads the setting');
 // 0.14.10: the height limit moves with the chosen size (it was a fixed 1200, so 작게 did nothing on large monitors).
 assert(html.includes('Math.max(720,Math.min(1600/k,H/k))')&&html.includes('Math.max(1280,Math.min(W/k,mh*1.92))'),'limits');
 assert(html.includes('window.CRPGFrameFit='),'the setting refits at once');
 assert(shell.includes("document.documentElement.classList.contains('crpg-framed')")&&shell.includes("mk('p','','화면 크기')"),'the 화면 크기 row only inside the frame');
 assert(shell.includes('/성인 모드|글자 크기|화면 크기|인물 일러스트/'),'it sits under 표시 설정');
 return {};
});

check('screens: facility tiles, centred choice numbers, big boxes never lean, no page scrollbar',()=>{
 const shell=src('app_shell.js'),css=src('shell.css'),motion=src('app_motion.js');
 assert(shell.includes("entry.classList.add('shell-place-tile')")&&css.includes('.location-places:has(>.shell-place-tile){display:grid;grid-template-columns:repeat(2,minmax(0,1fr))'));
 assert(/\.choice \.choice-index\{[^}]*margin:0;padding:0/.test(css),'the number sits in the middle of its circle');
 assert(!motion.includes("'.journal-section'")&&!motion.includes("'.main-objective'")&&motion.includes('const big=r=>r.width>520||r.height>320'),'large boxes keep still');
 assert(css.includes('html:has(>body.teyvat){overflow:hidden}')&&css.includes('.pm-box{scrollbar-width:none'),'no page or menu scrollbar');
 return {};
});

check('names: 일일 보스 instead of 이틀 주기 보스, and 나선 각인 is explained where it appears',()=>{
 for(const f of ['app_handbook.js','app_motion.js','app_mond_boss_balance.js'])assert(!/이틀 주기|게임 내 이틀/.test(src(f)),f);
 const hb=src('app_handbook.js');assert(hb.includes("section('일일 보스'")&&hb.includes("stat('일일 보스'"));
 assert(hb.includes("section('나선비경 기록'")&&hb.includes('각인된 동료는 도전을 전부 초기화하기 전까지 다른 층에 나설 수 없습니다'));
 assert(src('app_abyss.js').includes("v.markName+' · 다른 층에 나설 수 없는 동료'"));
 return {};
});

const {db,R}=require('./helpers_v011.cjs');
const battle=(route,team=['MOND_AMBER','MOND_KAEYA','MOND_LISA'])=>{const r=fixture(12,team,7,route);r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';r.s.global.SCREEN_MODE='LOCATION';r.startBattle('EG_LEY_MOND_PLAINS','EXPLICIT');return r;};

check('skills and bursts always land: an ally E or Q skips the accuracy roll, normal and enemy attacks keep it',()=>{
 const r=battle('ROUTE_TRAVELER'),b=r.s.runtime,amber=b.actors.find(a=>a.source==='MOND_AMBER'),enemy=b.actors.find(a=>a.side==='ENEMY'&&a.hp>0);
 r.die=()=>100; // the worst roll there is
 const hp=enemy.hp;
 assert.equal(r.damage(amber,enemy,.65,'PHYSICAL',{card:'PLAYER_BASIC_ATTACK'}),false,'a normal attack can still miss');
 assert.equal(r.damage(amber,enemy,1.2,'불',{card:'MOND_AMBER_E'}),true,'the elemental skill lands');
 assert(enemy.hp<hp);assert(r.auraList(enemy).some(x=>x.element==='불'),'and leaves its element');
 const foe=b.actors.find(a=>a.side==='ENEMY'&&a.hp>0),ally=b.actors.find(a=>a.side==='ALLY'&&a.hp>0);
 assert.equal(r.damage(foe,ally,1,'PHYSICAL',{card:'ENEMY_TEST_E'}),false,'enemy attacks keep the roll');
 return {};
});

check('이세계인: new base stats for new and older saves (once), 약점 간파 marks a target, 함께하는 일격 carries each element',()=>{
 const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI'),g=r.s.global,stats=s=>[s.PLAYER_BASE_HP,s.PLAYER_BASE_ATK,s.PLAYER_BASE_DEF,s.PLAYER_BASE_SPD];
 assert.deepEqual(stats(g),[560,62,30,63]);assert.equal(g.PROTAGONIST_ISEKAI_V2,1);
 const before=JSON.parse(r.serialize());Object.assign(before.global,{PLAYER_BASE_HP:480,PLAYER_BASE_ATK:45,PLAYER_BASE_DEF:30,PLAYER_BASE_SPD:55});delete before.global.PROTAGONIST_ISEKAI_V2;
 const r2=new R(db,before);assert.deepEqual(stats(r2.s.global),[560,67,30,63],'an earned +5 attack is kept');
 assert.deepEqual(stats(new R(db,JSON.parse(r2.serialize())).s.global),[560,67,30,63],'raised only once');
 const trv=fresh('MAP_MOND_CITY','ROUTE_TRAVELER');assert.deepEqual(stats(trv.s.global),[600,75,45,60],'the Traveler is unchanged');assert.equal(trv.s.global.PROTAGONIST_ISEKAI_V2,undefined);
 const f=battle('ROUTE_ISEKAI'),b=f.s.runtime,me=b.actors.find(a=>a.source==='PLAYER_CUSTOM'),amber=b.actors.find(a=>a.source==='MOND_AMBER');
 const enemy=b.actors.find(a=>a.side==='ENEMY'&&a.hp>0),cards=f.actorCards(me),E=cards.find(c=>c.id==='PLAYER_ISEKAI_E'),Q=cards.find(c=>c.id==='PLAYER_ISEKAI_Q');
 assert.equal(E.name,'약점 간파');assert.equal(Number(E.cooldown),2);assert.equal(Number(Q.cooldown),3);
 const m0=f.combatDamageMultiplier(amber,enemy,'불',{});
 b.order=[me.id,...b.order.filter(x=>x!==me.id)];b.cursor=0;
 const hp=enemy.hp;f.executeCard(me,E,enemy.id);assert(enemy.hp<hp,'the strike lands');
 const mark=enemy.statuses.find(s=>s.id==='STATUS_ISEKAI_EXPOSED');assert(mark&&mark.rounds===2&&mark.pct===20);
 assert.equal(Math.round(f.combatDamageMultiplier(amber,enemy,'불',{})/m0*100),120,'the party deals 20% more to it');
 assert.equal(me.cooldowns.PLAYER_ISEKAI_E,2);
 const start=b.log.length;me.cooldowns.PLAYER_ISEKAI_Q=0;f.executeCard(me,Q,enemy.id);
 const hits=b.log.slice(start).filter(e=>e.jointAttack&&Object.hasOwn(e,'damage'));
 const amberHit=hits.find(e=>e.actorId===amber.id);assert(amberHit,'Amber joins the strike');assert.equal(amberHit.element,'불','with her own element');
 assert.equal(me.cooldowns.PLAYER_ISEKAI_Q,3);
 return {bonus:f.protagonistJointBonus(me),hits:hits.map(e=>[e.actorId,e.element,e.damage])};
});

check('Liyue: one smith in the harbour, fuller shops, and 4★+ weapons only from the forge',()=>{
 const r=fresh('MAP_LIYUE_HARBOR');r.s.global.PLAYER_LEVEL_STATE=Math.max(5,Number(r.s.global.PLAYER_LEVEL_STATE)||1);
 const places=r.placeEntries().map(e=>e.id);
 assert(!places.includes('EVT_SCHEDULE_MRC_BLACKSMITH_COMMON'),'the common smith is folded into the equipment shop');assert(places.includes('EVT_SCHEDULE_MRC_LIYUE_EQUIP'));
 assert.deepEqual(plain(r.placeStockMerchants(r.placeCatalog().find(e=>e.id==='EVT_SCHEDULE_MRC_LIYUE_EQUIP'))),['MRC_LIYUE_EQUIP','MRC_BLACKSMITH_COMMON']);
 assert(!fresh('MAP_MOND_CITY').placeEntries().some(e=>e.id==='EVT_SCHEDULE_MRC_BLACKSMITH_COMMON'),'Mondstadt keeps its one smith');
 const stock=m=>r.rows('19_SHOP_STOCK_DB').filter(s=>s[1]===m&&!String(s[8]).includes('SYSTEM_DISABLED')).map(s=>s[3]);
 for(const id of ['ING_FISH','ING_RAW_MEAT','ING_CHEESE','TRPG_BANDAGE','ING_LOTUS_HEAD','ING_BAMBOO_SHOOT'])assert(stock('MRC_LIYUE_GENERAL').includes(id),id);
 const weapons3=[...new Set(stock('MRC_LIYUE_EQUIP').filter(id=>r.tables['16_EQUIP_DB'].get(id)?.[13]==='3성'))];assert.equal(weapons3.length,12,'every 3★ weapon');
 assert.equal(r.rows('19_SHOP_STOCK_DB').filter(s=>s[2]==='EQUIP'&&r.isForgeOnlyWeapon(s[3])&&!String(s[8]).includes('SYSTEM_DISABLED')).length,0,'no shop sells a 4★ or 5★ weapon');
 assert(r.rows('16_EQUIP_DB').filter(e=>r.isForgeOnlyWeapon(e[0])).every(e=>e[16]==='N'));
 // 기사단 장비 보급 hands over the blueprint; the Mondstadt smith turns it into the weapon.
 const m=fresh('MAP_MOND_CITY');m.s.global.PLAYER_LEVEL_STATE=6;
 const q=m.questState('Q_MOND_FAVONIUS_SUPPLY');q.node='READY_TO_CLAIM';q.accepted=true;
 const guild=m.placeCatalog().find(e=>e.entity==='NPC_MOND_KATHERYNE');m.s.global.SCREEN_MODE='LOCATION';m.action('PLACE_ENTER',{place:guild.id});
 m.claimQuest('Q_MOND_FAVONIUS_SUPPLY','EQ_SWORD_FAVONIUS');m.s.placeVisit=null;
 assert.equal(m.itemCount('BP_EQ_SWORD_FAVONIUS'),1,'the blueprint arrives');assert(!m.s.inventory.some(i=>i.equip==='EQ_SWORD_FAVONIUS'),'not the weapon');
 m.giveItem('ORE_CRYSTAL',4);m.giveItem('TRPG_ENCHANTED_WOOD',2);m.s.global.MORA+=1000;m.s.global.SCREEN_MODE='LOCATION';
 m.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_EQUIP',mode:'CRAFT'});m.action('CRAFT',{recipe:'REC_BP_EQ_SWORD_FAVONIUS'});
 assert(m.s.inventory.some(i=>i.equip==='EQ_SWORD_FAVONIUS'),'forged at Wagner');assert.equal(m.itemCount('BP_EQ_SWORD_FAVONIUS'),0,'the blueprint is used up');
 // The same blueprint recipe works at the Liyue equipment shop.
 r.giveItem('BP_EQ_SWORD_AMENOMA',1);r.giveItem('ORE_CRYSTAL',4);r.giveItem('TRPG_ENCHANTED_WOOD',2);r.s.global.MORA+=1000;r.s.global.SCREEN_MODE='LOCATION';
 r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_LIYUE_EQUIP',mode:'CRAFT'});r.action('CRAFT',{recipe:'REC_BP_EQ_SWORD_AMENOMA'});
 assert(r.s.inventory.some(i=>i.equip==='EQ_SWORD_AMENOMA'),'forged in Liyue');
 return {liyueGeneral:stock('MRC_LIYUE_GENERAL').length,liyueEquip:stock('MRC_LIYUE_EQUIP').length,blueprints:api.economyV0148.blueprints.length};
});

check("Amber's personal mission opens by itself once she has joined and the prologue is done",()=>{
 const out={};
 for(const [route,id,flags]of [['ROUTE_TRAVELER','LEG_MOND_AMBER',['FLAG_TRV_CARD_AMBER','FLAG_TRV_MON_PROLOGUE_CLEAR']],['ROUTE_ISEKAI','LEG_ISK_MOND_AMBER',['FLAG_ISK_RECRUIT_AMBER','FLAG_ISK_MON_PROLOGUE_CLEAR']]]){
  const r=fresh('MAP_MOND_CITY',route);for(const f of flags)r.s.flags[f]=false;delete r.s.guildLegends?.[id];
  r.action('MENU',{screen:'QUEST'});assert(!r.s.guildLegends?.[id],'not before Amber joins');
  for(const f of flags)r.s.flags[f]=true;
  r.action('MENU',{screen:'LOCATION'});assert.equal(r.s.guildLegends?.[id]?.auto,true,route+': registered');assert(r.legendRegistered(id));
  assert.deepEqual(plain(r.openedPersonalMissions()),[id]);
  assert(c.CRPGJournalPresenter?c.CRPGJournalPresenter.inProgress(r).legends.some(e=>e.id===id||e.definition?.id===id):true,'listed in 임무 → 진행 중');
  const again=new R(db,JSON.parse(r.serialize()));assert(again.legendRegistered(id),'the record survives a save');
  out[route]=plain(r.s.guildLegends[id]);
 }
 const tut=src('app_tutorial.js');assert(tut.includes("{id:'personal',title:'동료의 개인 임무'")&&tut.includes('personalNotice()'));
 return out;
});

check('원석·스타라이트·스타더스트, 특성, 운명의 자리: present, nothing earned yet, unchanged combat at the start',()=>{
 const r=fresh('MAP_MOND_CITY','ROUTE_TRAVELER'),g=r.s.global;
 // 0.14.11 adds the two fates; a chosen 운명의 별 is for a companion who has joined (4★ 25, 5★ and the protagonist 40).
 assert.deepEqual(plain(r.premiumBalance()),{PRIMOGEM:0,STARGLITTER:0,STARDUST:0,INTERTWINED_FATE:0,ACQUAINT_FATE:0});
 r.unlockCharacter('MOND_AMBER');
 assert.equal(r.actionReason('PREMIUM_BUY',{offer:'GLITTER_STELLA',char:'MOND_AMBER'}),'스타라이트가 부족합니다.');
 assert.equal(r.constellationLevel('MOND_AMBER'),0);assert.deepEqual(plain(r.talentLevels('MOND_AMBER')),{na:1,e:1,q:1,base:{na:1,e:1,q:1},kinds:{c3:'q',c5:'e'}});
 assert.match(r.constellationReason('MOND_AMBER'),/운명의 별/);
 // With currency (none can be earned yet, set directly here), the exchange and the unlock work.
 r.s.global.STARGLITTER=25;r.action('PREMIUM_BUY',{offer:'GLITTER_STELLA',char:'MOND_AMBER'});assert.equal(r.s.global.STARGLITTER,0);assert.equal(r.itemCount('STELLA_MOND_AMBER'),1);
 r.action('CONSTELLATION_UNLOCK',{char:'MOND_AMBER'});assert.equal(r.constellationLevel('MOND_AMBER'),1);assert.equal(r.itemCount('STELLA_MOND_AMBER'),0);
 r.s.global.STARDUST=20;r.action('PREMIUM_BUY',{offer:'DUST_HERO_EXP'});assert.equal(r.s.global.STARDUST,0);
 const bad=JSON.parse(r.serialize());bad.global.PRIMOGEM=-5;assert.throws(()=>new R(db,bad),/원석/);
 const bad2=JSON.parse(r.serialize());bad2.constellations={MOND_AMBER:7};assert.throws(()=>new R(db,bad2),/운명의 자리/);
 // Effects (0.14.11: each fighter's own): Amber C2 makes 토끼 백작's explosion three times as strong, C3 raises
 // 화살비 by three talent levels (Lv.4 = 127%), her skill and attack stay; nothing at 0.
 const f=battle('ROUTE_TRAVELER'),b=f.s.runtime,amber=b.actors.find(a=>a.source==='MOND_AMBER'),enemy=b.actors.find(a=>a.side==='ENEMY'&&a.hp>0);
 const m=card=>f.combatDamageMultiplier(amber,enemy,'불',{card});const e0=m('MOND_AMBER_E'),q0=m('MOND_AMBER_Q'),atk0=f.combatStat(amber,'atk'),o0=f.combatDamageMultiplier(amber,enemy,'불',{sourceKind:'OBJECT'});
 f.s.constellations={MOND_AMBER:4};
 assert.equal(Math.round(m('MOND_AMBER_E')/e0*1000),1000,'skill unchanged');assert.equal(Math.round(m('MOND_AMBER_Q')/q0*1000),1270,'C3: 화살비 Lv.4');
 assert.equal(Math.round(f.combatDamageMultiplier(amber,enemy,'불',{sourceKind:'OBJECT'})/o0*100),300,'C2: 토끼 백작');
 assert.equal(Math.round(f.combatStat(amber,'atk')/atk0*100),100,'attack unchanged');
 return {offers:api.premiumV0148.offers.length,stella:f.tables['14_ITEM_DB'].has('STELLA_MOND_AMBER')};
});

check('travel map: every connection drawn on an atlas follows its traced road, numbered on the way out',()=>{
 const sandbox={window:{}};require('node:vm').runInNewContext(src('terrain_map.js'),sandbox);const T=sandbox.window.CRPGTerrainMap;
 const r=fresh('MAP_MOND_CITY');r.installMarketContent();const missing=[];let drawn=0;
 for(const row of r.rows('47_MAP_EDGE_DB')){
  if(row[8]!=='Y'||row[11]!=='ACTIVE')continue;const a=T.points[row[1]],b=T.points[row[2]];
  if(!a||!b||a[0]!==b[0]||(a[1]===b[1]&&a[2]===b[2]))continue;
  const road=T.roads[[row[1],row[2]].sort().join('>')];if(!road){missing.push(row[1]+'>'+row[2]);continue;}drawn++;
  assert(road.every(([x,y])=>x>=0&&x<=T.width&&y>=0&&y<=T.height),'waypoints stay on the picture');
 }
 assert.deepEqual(missing,[],'run tools/trace_terrain_roads.py after changing anchors or connections');
 const nav=src('app_navigation.js'),css=src('shell.css');
 assert(nav.includes("routes.setAttribute('class','terrain-routes')")&&nav.includes("if([a,b].sort()[0]!==a)mid.reverse()"),'the road is drawn from where you stand');
 assert(nav.includes("tag.className='terrain-route-tag'")&&nav.includes(".terrain-route[data-destination]"),'number tags (buttons since 0.14.10), hover highlight');
 assert(css.includes('.terrain-route')&&css.includes('.terrain-route-tag'));
 return {roads:Object.keys(T.roads).length,drawn};
});

fs.mkdirSync(path.join(root,'reports/v0148'),{recursive:true});fs.writeFileSync(path.join(root,'reports/v0148/checks.json'),JSON.stringify({version:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,results},null,2)+'\n');
console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.ok).length}));
