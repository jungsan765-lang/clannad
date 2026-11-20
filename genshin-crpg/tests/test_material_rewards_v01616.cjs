'use strict';
// Quantity/settlement/save tests. Directly finishing foes is a settlement fixture,
// never a claim about real combat duration, win rate or lodging frequency.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {R,db,c,fs,path,root}=require('./helpers_v011.cjs');
const {setup,PLAYER}=require('../tools/audit_balance_v01522.cjs');
const G=c.CRPGRuntime.growthV01522,copy=x=>JSON.parse(JSON.stringify(x));
const LEGACY_ASC={"NEUTRAL":{"5":1,"10":2,"15":3,"20":4,"25":5,"30":6,"35":8,"40":9,"45":18,"50":24,"55":29,"60":50},"PYRO":{"5":1,"10":2,"15":3,"20":16,"25":21,"30":18,"35":24,"40":57,"45":64,"50":134,"55":690,"60":1189},"HYDRO":{"5":1,"10":2,"15":3,"20":10,"25":18,"30":17,"35":27,"40":68,"45":123,"50":156,"55":332,"60":453},"ANEMO":{"5":1,"10":2,"15":3,"20":4,"25":5,"30":6,"35":10,"40":14,"45":15,"50":16,"55":47,"60":84},"ELECTRO":{"5":1,"10":2,"15":3,"20":4,"25":6,"30":6,"35":8,"40":10,"45":18,"50":31,"55":101,"60":176},"CRYO":{"5":1,"10":2,"15":3,"20":4,"25":7,"30":6,"35":8,"40":14,"45":26,"50":38,"55":75,"60":113},"GEO":{"5":1,"10":2,"15":3,"20":4,"25":5,"30":6,"35":8,"40":10,"45":15,"50":20,"55":48,"60":87},"DENDRO":{"5":1,"10":2,"15":3,"20":4,"25":6,"30":7,"35":10,"40":11,"45":13,"50":16,"55":50,"60":70}};
const V21_ASC=Object.fromEntries(Object.keys(LEGACY_ASC).map(element=>[element,{5:1,10:2,15:3,20:4,25:6,30:8,35:20,40:35,45:80,50:180,55:600,60:1500}]));
const ASC=Object.fromEntries(Object.keys(LEGACY_ASC).map(element=>[element,{5:1,10:2,15:3,20:10,25:32,30:47,35:105,40:153,45:318,50:642,55:1932,60:5400}]));
const LEGACY_TALENT={MOND:{5:1,10:2,15:10,20:20,25:32},LIYUE:{30:6,35:8,40:10,45:12,50:24,55:36,60:64}};
const V21_TALENT={...LEGACY_TALENT,LIYUE:{...LEGACY_TALENT.LIYUE,60:80}};
const V22_TALENT={...V21_TALENT,LIYUE:{30:3,35:4,40:7,45:9,50:19,55:28,60:80}};
// 0.16.51 (user: 「저레벨부터 고레벨까지 전체적으로 훑어보고 적당한 선을 지정하고 그게 이 보상에 맞는 수준이 맞는지까지」): the Lv35–55 Liyue talent stages pay more, within the 0.16.22 no-reversal records.
const TALENT={...V22_TALENT,LIYUE:{...V22_TALENT.LIYUE,35:5,40:9,45:12,50:25,55:38,60:90}};
const BOOK_COST={MOND:[2,4,12,32,60,96,126,160,180],LIYUE:[5,10,30,80,150,240,315,400,450]};
const PROFILE=[1,1,2,4,6,8,9,10,10];
const OLD_ASC={5:1,10:2,15:3,20:4,25:5,30:6,35:7,40:8,45:9,50:10,55:20,60:32};
const MATERIAL_XP={5:40,10:90,15:90,20:220,25:220,30:360,35:360,40:500,45:500,50:900,55:900,60:1600};
const LEGACY_EXP_XP={5:200,10:450,15:1000,20:1100,25:1250,30:1500,35:1800,40:2100,45:4500,50:5400,55:8000,60:10000};
// 0.16.51: the Lv35–55 EXP stages pay more.
const EXP_XP={...LEGACY_EXP_XP,35:7000,40:8500,45:10500,50:11000,55:14000,60:24000};
// 0.16.56 (user: 「재료 양이 너무 많으니까 정신 없어서 그.. 돌파재료같은거 있잖아? 그런건 원작 고증 살려서 추가하고 제작에 넣거나 비경 보상에 넣자」):
// new runs (reward version 5) pay the original's tiered gems (가루·조각·덩이·원석) and the picked book kind (가르침·인도·철학); costs are the
// original's [tier,count] (gems ×2, 5★ ×2 again). ASC/TALENT/BOOK_COST above are now the version-4 history that fights saved before still pay.
const GEM_COSTS=[[1,2],[2,6],[2,12],[3,6],[3,12],[4,12]],BOOK_COSTS=[[1,3],[2,2],[2,4],[2,6],[2,9],[3,4],[3,6],[3,12],[3,16]];
const GEM_DROPS={5:{1:1},10:{1:2},15:{1:3},20:{1:1,2:1},25:{1:2,2:1},30:{1:2,2:1},35:{1:1,2:2},40:{1:2,2:2},45:{3:1},50:{1:1,2:1,3:1},55:{1:1,2:1,3:2},60:{4:1}};
const BOOK_DROPS={MOND:{5:{1:1},10:{1:2},15:{1:3,2:1},20:{1:2,2:3},25:{1:1,2:3,3:1}},LIYUE:{30:{1:1},35:{1:2},40:{1:3},45:{1:1,2:1},50:{1:1,2:2},55:{1:2,2:3},60:{2:2,3:2}}};
const BOOKS={MOND:['FREEDOM','RESISTANCE','BALLAD'],LIYUE:['PROSPERITY','DILIGENCE','GOLD']},GEM_UNIT=[0,1,3,9,27],BOOK_UNIT=[0,1,3,9];
const gemPay=(element,level,m=1)=>Object.fromEntries(Object.entries(GEM_DROPS[level]).map(([t,n])=>['GROWTH_GEM_'+element+'_'+t,n*m]));
const bookPay=(book,region,level,m=1)=>Object.fromEntries(Object.entries(BOOK_DROPS[region][level]).map(([t,n])=>['GROWTH_BOOK_'+book+'_'+t,n*m]));
const OLD_ITEMS=[...['NEUTRAL','PYRO','HYDRO','ANEMO','ELECTRO','CRYO','GEO','DENDRO'].map(e=>'GROWTH_GEM_'+e),'GROWTH_TALENT_MOND','GROWTH_TALENT_LIYUE'];
const TEAM=['MOND_AMBER','MOND_KAEYA','MOND_LISA'],ELEMENTS=Object.keys(ASC),STAGES=Object.keys(ASC.NEUTRAL).map(Number),DAY=G.dayOf(c.Date.now());
const OWNERS=[['PLAYER_CUSTOM','NEUTRAL',4],['MOND_AMBER','PYRO',4],['MOND_DILUC','PYRO',5],['MOND_BARBARA','HYDRO',4],['LIYUE_YELAN','HYDRO',5],['MOND_SUCROSE','ANEMO',4],['MOND_JEAN','ANEMO',5],['MOND_LISA','ELECTRO',4],['LIYUE_KEQING','ELECTRO',5],['MOND_KAEYA','CRYO',4],['LIYUE_QIQI','CRYO',5],['MOND_NOELLE','GEO',4],['LIYUE_ZHONGLI','GEO',5],['LIYUE_YAOYAO','DENDRO',4],['LIYUE_BAIZHU','DENDRO',5]];
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
function fixture(owner=PLAYER){const team=owner===PLAYER?TEAM:[owner,...TEAM.filter(id=>id!==owner)].slice(0,3),r=setup({level:60,team,gear:'none',talent:1,route:'ROUTE_TRAVELER'});r.s.inventory=[];r.s.global.MORA=0;return r;}
function phase(r,owner,p){const level=[10,20,30,40,50,55,60][p];if(owner===PLAYER){r.s.global.PLAYER_LEVEL_STATE=level;r.s.global.PLAYER_XP_STATE=0;}else{r.s.chars[owner].level=level;r.s.chars[owner].xp=0;}r.s.ascensions[owner]=p;r.recalculate();if(owner===PLAYER)r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;else r.s.chars[owner].hp=r.character(owner).maxHp;}
function entry(r,kind,level,region){const [key,s]=Object.entries(G.domains).find(([,s])=>s.kind===kind&&s.levels.includes(level)&&(!region||s.region===region));r.s.global.CURRENT_MAP_ID=s.map;r.s.global.SCREEN_MODE='LOCATION';r.s.placeVisit=null;return r.growthDomainEntries().find(d=>d.key===key&&d.level===level);}
function start(kind='ASCENSION',level=60,element='PYRO',book){const r=fixture(),d=entry(r,kind,level);r.s.domainDaily={day:DAY,wins:3};r.action('DOMAIN_START',{domain:d.id,element,...(book?{book}:{})});return r;}
// A fight saved before 0.16.56 has no picked book.
function oldTalent(d,marker){delete d.book;if(marker===undefined)delete d.talentRewardVersion;else d.talentRewardVersion=marker;}
function settle(r){for(const a of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))a.hp=0;return r.finishBattle(true);}
function ready(r,cost){r.s.inventory=[];r.s.global.MORA=cost.mora+123;for(const [id,n]of Object.entries(cost.items))r.giveItem(id,n);}
function intent(r,type,args){return {id:r.s.global.SAVE_ID+':'+(r.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:r.s.global.SAVE_REVISION,type,...args};}
function once(r,a){const out=r.transact(a),saved=r.serialize();assert.deepEqual(copy(r.transact(a)),copy(out));assert.equal(r.serialize(),saved);const restored=new R(db,copy(r.s));assert.deepEqual(copy(restored.transact(a)),copy(out));assert.equal(restored.serialize(),saved);return out;}
function reject(r,a){const before=r.serialize();assert.throws(()=>r.transact(a));assert.equal(r.serialize(),before,'failed payment changes no wallet, item, phase, HP, talent or receipt');}

check('current hard-coded element quantities and historical tables are separate snapshots',()=>{
 assert.deepEqual(copy(G.domainAscensionGems),ASC);assert.deepEqual(copy(G.domainTalentBooks),TALENT);assert.deepEqual(copy(G.previousDomainTalentBooks),V22_TALENT);assert.deepEqual(copy(G.talentBookMultipliers),PROFILE);assert.equal(G.ascensionRewardVersion,5);assert.equal(G.talentRewardVersion,5);assert.equal(G.previousAscensionRewardVersion,4);assert.equal(G.previousTalentRewardVersion,4);assert.deepEqual(copy(G.talentBookCosts),BOOK_COST);assert.deepEqual(copy(G.legacyDomainTalentBooks[1]),LEGACY_TALENT);assert.deepEqual(copy(G.legacyDomainTalentBooks[2]),V21_TALENT);assert.deepEqual(copy(G.legacyDomainTalentBooks[3]),V22_TALENT);assert.deepEqual(copy(G.legacyDomainAscensionGems[3]),V21_ASC);assert.equal(G.materialRequirementVersion,3);assert.deepEqual(copy(G.legacyDomainAscensionGems[2]),LEGACY_ASC);assert.deepEqual(copy(G.legacyDomainAscensionGems[1]),OLD_ASC);
 for(const level of STAGES){assert.equal(G.legacyDomainAscensionGems[0][level],level/5);assert.equal(G.legacyDomainTalentBooks[0][level],level/5);}
 // 0.16.56: the current tables are the tiered ones; every gem/book stage has a drop and the old items are kept for old fights.
 assert.deepEqual(copy(G.gemCosts),GEM_COSTS);assert.deepEqual(copy(G.bookCosts),BOOK_COSTS);assert.deepEqual(copy(G.gemDrops),GEM_DROPS);assert.deepEqual(copy(G.bookDrops),BOOK_DROPS);assert.deepEqual(copy(G.oldGrowthItems),OLD_ITEMS);
 assert.deepEqual(Object.keys(G.gemDrops).map(Number),STAGES);assert.deepEqual([...Object.keys(G.bookDrops.MOND),...Object.keys(G.bookDrops.LIYUE)].map(Number),STAGES);assert.deepEqual(Object.keys(G.gemTiers),ELEMENTS);
 for(const [region,kinds]of Object.entries(BOOKS))assert.deepEqual(Object.keys(G.bookKinds).filter(k=>G.bookKinds[k][1]===region),kinds);assert.equal(G.gemItem('PYRO',4),'GROWTH_GEM_PYRO_4');assert.equal(G.bookItem('GOLD',3),'GROWTH_BOOK_GOLD_3');
});

check('all new entrance previews carry the same marker and quantity as their saved battle',()=>{
 // 0.16.56: marker 5; an ascension run pays the element's gem tiers, a talent run the picked book's tiers (the region's three kinds).
 const r=fixture();for(const kind of ['ASCENSION','TALENT'])for(const level of STAGES){const d=entry(r,kind,level),region=d.region==='몬드'?'MOND':'LIYUE',choices=kind==='ASCENSION'?ELEMENTS:BOOKS[region];assert.equal(d.reason,'');assert.equal(d[kind==='ASCENSION'?'ascensionRewardVersion':'talentRewardVersion'],5);if(kind==='TALENT')assert.deepEqual(copy(d.books),BOOKS[region]);else assert.equal(d.books,undefined);
  for(const choice of choices){const element=kind==='ASCENSION'?choice:'NEUTRAL',book=kind==='TALENT'?choice:undefined,pay=m=>kind==='ASCENSION'?gemPay(element,level,m):bookPay(book,region,level,m),preview=book?{...d,book}:d;
   for(const wins of [0,1,2,3]){r.s.domainDaily={day:DAY,wins};const rw=r.growthDomainRewards(preview,element,DAY);assert.deepEqual(copy(rw.items),pay(wins<3?2:1));assert.equal(rw.remaining,Math.max(0,3-wins));assert.equal(rw.bonus,wins<3);assert.equal(rw.mora,0);assert.equal(rw.xp,MATERIAL_XP[level]);}
   r.s.domainDaily.wins=3;r.action('DOMAIN_START',{domain:d.id,element,...(book?{book}:{})});const saved=copy(r.s),b=copy(saved.runtime);assert.equal(b.materialBudget,undefined);assert.equal(b.growthDomain.materialBudgetVersion,undefined);assert.equal(b.growthDomain.book,book);assert.deepEqual(copy(new R(db,saved).s.runtime),b);assert.deepEqual(copy(r.growthDomainRewards(b.growthDomain,element).items),pay(1));settle(r);
  }
  // No pick, or another region's book, trains the region's first kind.
  if(kind==='TALENT')for(const book of [undefined,BOOKS[region==='MOND'?'LIYUE':'MOND'][1]]){assert.deepEqual(copy(r.growthDomainRewards(book?{...d,book}:d,'NEUTRAL',DAY).items),bookPay(BOOKS[region][0],region,level));r.action('DOMAIN_START',{domain:d.id,...(book?{book}:{})});assert.equal(r.s.runtime.growthDomain.book,BOOKS[region][0]);assert.deepEqual(copy(settle(r).domain.items),bookPay(BOOKS[region][0],region,level));}
 }
});

// 0.16.56: Lv.60 pays one 원석 of the element (was 5,400 old gems) and two 인도 + two 철학 of the picked book (was 90 old books).
check('actual new settlements pay their tiered items exactly once without XP books or Mora',()=>{
 for(const element of ELEMENTS){const r=start('ASCENSION',60,element),item='GROWTH_GEM_'+element+'_4',before=r.itemCount(item),money=r.s.global.MORA,out=settle(r);assert.deepEqual(copy(out.domain.items),{[item]:1});assert.equal(r.itemCount(item)-before,1);assert.equal(r.itemCount('GROWTH_GEM_'+element),0);assert.equal(r.s.global.MORA,money);assert.equal(out.xp,1600);assert.equal(out.mora,0);assert(!Object.keys(out.domain.items).some(id=>/MAT_CHAR_EXP|^ORE_/.test(id)));const saved=r.serialize();assert.equal(r.finishBattle(true),undefined);assert.equal(r.serialize(),saved);assert.equal(new R(db,copy(r.s)).serialize(),saved);}
 for(const book of BOOKS.LIYUE){const r=start('TALENT',60,'NEUTRAL',book),money=r.s.global.MORA,out=settle(r);assert.deepEqual(copy(out.domain.items),{['GROWTH_BOOK_'+book+'_2']:2,['GROWTH_BOOK_'+book+'_3']:2});assert.equal(r.itemCount('GROWTH_BOOK_'+book+'_2'),2);assert.equal(r.itemCount('GROWTH_BOOK_'+book+'_3'),2);assert.equal(r.itemCount('GROWTH_TALENT_LIYUE'),0);assert.equal(r.s.lastGrowthDomain.book,book);assert.equal(r.s.global.MORA,money);assert.equal(out.xp,1600);assert.equal(out.mora,0);const saved=r.serialize();assert.equal(r.finishBattle(true),undefined);assert.equal(r.serialize(),saved);assert.equal(new R(db,copy(r.s)).serialize(),saved);}
});

check('old marked and unmarked version-four ascension promises settle with their old table',()=>{
 // 0.16.56: reward version 4 (the 0.16.22 table) is now an old promise too; none of them pays the new gem tiers.
 for(const level of [20,55,60])for(const marker of [undefined,0,1,2,3,4]){const r=start('ASCENSION',level,'PYRO');if(marker===undefined)delete r.s.runtime.growthDomain.ascensionRewardVersion;else r.s.runtime.growthDomain.ascensionRewardVersion=marker;const before=copy(r.s.runtime),loaded=new R(db,copy(r.s));assert.deepEqual(copy(loaded.s.runtime.actors),before.actors);assert.deepEqual(copy(loaded.s.runtime.order),before.order);assert.equal(loaded.s.runtime.growthDomain.ascensionRewardVersion,marker??0);const quantity=marker===4?ASC.PYRO[level]:marker===3?V21_ASC.PYRO[level]:marker===2?LEGACY_ASC.PYRO[level]:marker===1?OLD_ASC[level]:level/5;assert.deepEqual(copy(loaded.growthDomainRewards(loaded.s.runtime.growthDomain,'PYRO').items),{GROWTH_GEM_PYRO:quantity});assert.deepEqual(copy(settle(loaded).domain.items),{GROWTH_GEM_PYRO:quantity});const saved=loaded.serialize();loaded.finishBattle(true);assert.equal(loaded.serialize(),saved);}
});

check('old version-four talent fights retain old books and never receive new book rewards on reload',()=>{
 // 0.16.56: reward version 4 (the 0.16.51 table) joins the old promises; an old fight has no picked book and never pays the new books.
 for(const level of [20,25,30,40,55,60])for(const marker of [undefined,0,1,2,3,4]){const r=start('TALENT',level);oldTalent(r.s.runtime.growthDomain,marker);const before=copy(r.s.runtime),loaded=new R(db,copy(r.s));assert.equal(loaded.s.runtime.growthDomain.talentRewardVersion,marker??0);assert.deepEqual(copy(loaded.s.runtime.actors),before.actors);const item='GROWTH_TALENT_'+(level<=25?'MOND':'LIYUE');const quantity=marker===4?TALENT[level<=25?'MOND':'LIYUE'][level]:marker===3?V22_TALENT[level<=25?'MOND':'LIYUE'][level]:marker===2?V21_TALENT[level<=25?'MOND':'LIYUE'][level]:marker===1?LEGACY_TALENT[level<=25?'MOND':'LIYUE'][level]:level/5;assert.deepEqual(copy(loaded.growthDomainRewards(loaded.s.runtime.growthDomain).items),{[item]:quantity});assert.deepEqual(copy(settle(loaded).domain.items),{[item]:quantity});}
});

check('legacy versions one, two and three keep their original unmarked material payout',()=>{
 const plans=[{id:'TALENT:10',kind:'TALENT',level:10,region:'몬드',map:'MAP_MOND_CITY',element:'NEUTRAL',day:DAY},{version:2,id:'FORSAKEN_RIFT:2',key:'FORSAKEN_RIFT',stage:2,kind:'TALENT',level:10,region:'몬드',map:'MAP_MOND_SPRINGVALE',element:'NEUTRAL',day:DAY},{version:3,id:'FORSAKEN_RIFT:TALENT',key:'FORSAKEN_RIFT',name:'잊혀진 협곡',kind:'TALENT',level:5,region:'몬드',map:'MAP_MOND_SPRINGVALE',element:'NEUTRAL',day:DAY}];
 for(const d of plans){const r=fixture();r.s.global.CURRENT_MAP_ID=d.map;r.s.domainDaily={day:DAY,wins:3};r._growthDomain=d;try{r.startBattle(r.growthDomainGroup(d),'DOMAIN:'+d.id);}finally{delete r._growthDomain;}const before=copy(r.s.runtime),loaded=new R(db,copy(r.s));assert.deepEqual(copy(loaded.s.runtime),before);assert.equal(loaded.s.runtime.growthDomain.talentRewardVersion,undefined);assert.equal(loaded.growthDomainRewards(loaded.s.runtime.growthDomain).items.GROWTH_TALENT_MOND,d.level/5);}
});

check('unsupported, misplaced and impossible old-budget/new-reward marker combinations reject',()=>{
 const asc=start(),talent=start('TALENT'),exp=start('EXP'),invalid=(r,mutate,why=/보상|버전/)=>{const saved=copy(r.s);mutate(saved.runtime.growthDomain,saved.runtime);assert.throws(()=>new R(db,saved),why);};
 // 0.16.56: 5 is the current marker; 6 and strings stay unsupported.
 for(const marker of [-1,6,'4','5',null])invalid(asc,d=>d.ascensionRewardVersion=marker);
 for(const marker of [-1,6,'4','5',null])invalid(talent,d=>{delete d.book;d.talentRewardVersion=marker;});
 invalid(talent,(d,b)=>{delete b.enemyBalanceRevision;});
 // A picked book must be one of the fight's region (태산부: 번영·근면·황금) on a version-5 talent fight.
 for(const book of ['FREEDOM','NOPE',''])invalid(talent,d=>d.book=book,/책/);invalid(talent,d=>d.talentRewardVersion=4,/책/);invalid(asc,d=>d.book='PROSPERITY',/책/);invalid(exp,d=>d.book='PROSPERITY',/책/);
 invalid(asc,d=>d.talentRewardVersion=1);invalid(talent,d=>d.ascensionRewardVersion=2);invalid(exp,d=>d.ascensionRewardVersion=2);invalid(exp,d=>d.talentRewardVersion=1);
 for(const r of [asc,talent])invalid(r,(d,b)=>{d.materialBudgetVersion=1;b.materialBudget={version:1,durability:G.legacyMaterialBudgets[1].durability[d.level],pressure:G.legacyMaterialBudgets[1].pressure[d.level]};});
 for(const [r,marker]of [[asc,1],[talent,0]]){const s=copy(r.s),d=s.runtime.growthDomain;delete d.book;d[d.kind==='ASCENSION'?'ascensionRewardVersion':'talentRewardVersion']=marker;d.materialBudgetVersion=1;s.runtime.materialBudget={version:1,durability:G.legacyMaterialBudgets[1].durability[d.level],pressure:G.legacyMaterialBudgets[1].pressure[d.level]};assert.deepEqual(copy(new R(db,s).s.runtime),s.runtime);}
});

check('every own-element phase uses its fixed coupled gems with unchanged Mora and other costs',()=>{
 const specialties=[2,4,6,8,10,12],masks=[2,3,3,4,4,6],mora=[800,2400,6000,14000,28000,42000];
 // 0.16.56: a phase asks the owner's element gem of the phase's tier (the original's counts ×2; 5★ ×2 again); the 0.16.22 single-gem
 // costs stay exported as history only. All six phases: 2 가루 · 18 조각 · 18 덩이 · 12 원석 (5★ twice), 542 (1,084) in 가루.
 for(const [owner,element,rarity]of OWNERS){const r=fixture(owner),pay=ASC[element],expected=[3,2*pay[15],2*pay[30],5*pay[40],8*pay[50],25*pay[60]],mult=rarity===5?2:1,tiers={};assert.deepEqual(copy(G.ascensionGemCosts[element]),expected);for(let p=0;p<6;p++){phase(r,owner,p);const info=r.ascensionInfo(owner),cost=copy(info.cost),[tier,count]=GEM_COSTS[p],gem='GROWTH_GEM_'+element+'_'+tier;assert.equal(cost.items[gem],count*mult);assert.deepEqual(Object.keys(cost.items).filter(id=>id.startsWith('GROWTH_')),[gem]);tiers[tier]=(tiers[tier]||0)+cost.items[gem];assert.equal(cost.mora,Math.round(mora[p]*(rarity===5?1.8:1)));assert.equal(Object.entries(cost.items).filter(([id])=>!id.startsWith('GROWTH_GEM_')&&!id.startsWith('MAT_')&&id!=='TRPG_BOSS_ESSENCE').length<=1,true);const mask=['MAT_DAMAGED_MASK','MAT_STAINED_MASK','MAT_OMINOUS_MASK'][Math.min(2,Math.floor(p/2))];assert.equal(cost.items[mask],masks[p]*mult);const specialty=G.specialties[owner]||(owner.startsWith('LIYUE_')?'MAT_LIYUE_QINGXIN':'ING_CALLA_LILY');assert.equal(cost.items[specialty],specialties[p]*mult);if(p>=3)assert.equal(Object.entries(cost.items).find(([id])=>id.startsWith('MAT_FB_')||id==='TRPG_BOSS_ESSENCE')[1],(p-2)*mult);assert.equal(info.nextCap,[20,30,40,50,55,60][p]);}
  assert.deepEqual(tiers,{1:2*mult,2:18*mult,3:18*mult,4:12*mult});assert.equal(Object.entries(tiers).reduce((n,[t,c])=>n+c*GEM_UNIT[t],0),542*mult);
  phase(r,owner,6);assert.deepEqual(copy(r.ascensionInfo(owner).cost),{mora:0,items:{}});
 }
 // The last phase takes 12 (5★ 24) unboosted Lv.60 wins (one 원석 each), where the 0.16.22 table took 25 (50).
 assert.equal(GEM_COSTS[5][1]/GEM_DROPS[60][4],12);assert.equal(G.ascensionGemCosts.PYRO[5]/ASC.PYRO[60],25);
});

// 0.16.56: the last phase asks 12 (5★ 24) 「불타오르는 마노」 instead of 135,000/270,000 old gems. Old gems and lower tiers pay nothing
// (they are exchanged or synthesized at an alchemy bench first).
check('final 12/24 tier-four gem payments are atomic, valid on reload and paid once',()=>{
 for(const [owner,need]of [['MOND_AMBER',12],['MOND_DILUC',24]]){const r=fixture(owner);phase(r,owner,5);const d=r.ascensionInfo(owner),gem='GROWTH_GEM_PYRO_4';assert.equal(d.cost.items[gem],need);ready(r,d.cost);r.s.inventory.find(i=>i.item===gem).quantity=need-1;r.giveItem('GROWTH_GEM_PYRO',270000);r.giveItem('GROWTH_GEM_PYRO_3',300);assert.equal(r.ascensionInfo(owner).reason,'돌파 재료가 부족합니다.');const a=intent(r,'CHAR_ASCEND',{owner});reject(r,{...a,cost:{mora:0,items:{[gem]:1}},price:1});r.giveItem(gem,1);const loaded=new R(db,copy(r.s));assert.equal(loaded.itemCount(gem),need);once(loaded,a);assert.equal(loaded.itemCount(gem),0);assert.equal(loaded.itemCount('GROWTH_GEM_PYRO'),270000);assert.equal(loaded.itemCount('GROWTH_GEM_PYRO_3'),300);assert.equal(loaded.growth(owner).phase,6);assert.equal(loaded.growth(owner).cap,60);assert.equal(loaded.s.global.MORA,123);assert.equal(loaded.s.chars[owner].hp,loaded.character(owner).maxHp);}
});

// 0.16.56: a step asks the original's [tier,count] of the character's own book kind (타르탈리아 「자유」, a 몬드 book); the protagonist
// turns through its region's three kinds by target level (리월's as the Geo traveler). Same in both regions, no 5★ multiplier. Three
// talents to Lv.8 take 9 가르침 · 63 인도 · 30 철학 (468 in 가르침), to Lv.10 9 · 63 · 114 (1,224) — the original's 3 · 21 · 38 each.
// The 0.16.21 single-book profile stays exported as history.
check('book requirements follow the original nine steps in each character\'s own kind without changing Mora or slime costs',()=>{
 assert.deepEqual(copy(G.talentBookCosts),BOOK_COST);
 for(const [owner,geo]of [[PLAYER,false],[PLAYER,true],['MOND_AMBER'],['MOND_DILUC'],['LIYUE_XIANGLING'],['LIYUE_ZHONGLI'],['LIYUE_TARTAGLIA']]){const r=fixture(owner),five=owner!==PLAYER&&r.rarityOf(owner)===5,kindOf=target=>owner===PLAYER?BOOKS[geo?'LIYUE':'MOND'][(target-2)%3]:G.bookOf[owner],totals={8:{},10:{}};if(geo)r.s.global.PLAYER_SKILL_CARD_IDS='PLAYER_BASIC_ATTACK;PLAYER_BASIC_GUARD;PLAYER_TRAVELER_GEO_E;PLAYER_TRAVELER_GEO_Q';
  assert.equal(G.bookOf[owner],{[PLAYER]:undefined,MOND_AMBER:'FREEDOM',MOND_DILUC:'RESISTANCE',LIYUE_XIANGLING:'DILIGENCE',LIYUE_ZHONGLI:'GOLD',LIYUE_TARTAGLIA:'FREEDOM'}[owner]);
  for(let level=1;level<=9;level++){r.s.talents[owner]={na:level,e:level,q:level};const d=r.talentUpgradeInfo(owner,'na'),[tier,count]=BOOK_COSTS[level-1],item='GROWTH_BOOK_'+kindOf(level+1)+'_'+tier;assert.equal(r.talentBookKind(owner,level+1),kindOf(level+1));assert.equal(r.talentBookRegion(owner,level+1),G.bookKinds[kindOf(level+1)][1]);assert.equal(d.cost.items[item],count);assert.deepEqual(Object.keys(d.cost.items).filter(id=>id.startsWith('GROWTH_')),[item]);assert.equal(d.cost.mora,Math.round(250*level*level*(five?1.5:1)));if(level>=2)assert.equal(d.cost.items[level<5?'MAT_SLIME_SECRETIONS':'MAT_SLIME_CONCENTRATE'],Math.ceil(level/2));else assert.equal(Object.keys(d.cost.items).length,1);for(const top of [8,10])if(level<top)totals[top][tier]=(totals[top][tier]||0)+3*count;}
  assert.deepEqual(totals[8],{1:9,2:63,3:30});assert.deepEqual(totals[10],{1:9,2:63,3:114});for(const [top,units]of [[8,468],[10,1224]])assert.equal(Object.entries(totals[top]).reduce((n,[t,c])=>n+c*BOOK_UNIT[t],0),units);
  r.s.talents[owner]={na:10,e:10,q:10};const maxed=r.talentUpgradeInfo(owner,'na');assert(maxed.reason);assert(Number.isSafeInteger(maxed.cost.items['GROWTH_BOOK_'+kindOf(11)+'_3']));}
});

check('unpaid talent changes use the current book cost and trained levels stay unchanged',()=>{
 // 0.16.56: Lv.3→4 asks four 「인도」 of the character's kind (was 12/30 old books); a pile of old books pays nothing.
 for(const [owner,item,need,oldItem]of [['MOND_AMBER','GROWTH_BOOK_FREEDOM_2',4,'GROWTH_TALENT_MOND'],['LIYUE_XIANGLING','GROWTH_BOOK_DILIGENCE_2',4,'GROWTH_TALENT_LIYUE']]){const r=fixture(owner);r.s.talents[owner]={na:3,e:8,q:10};const cost=r.talentUpgradeInfo(owner,'na').cost;assert.equal(cost.items[item],need);ready(r,cost);r.s.inventory.find(i=>i.item===item).quantity--;r.giveItem(oldItem,5000);assert.equal(r.talentUpgradeInfo(owner,'na').reason,'특성 재료가 부족합니다.');const a=intent(r,'TALENT_UPGRADE',{owner,kind:'na'});reject(r,{...a,cost:{mora:0,items:{[item]:need/2}}});r.giveItem(item,1);once(r,a);assert.deepEqual(copy(r.talentLevels(owner).base),{na:4,e:8,q:10});assert.equal(r.itemCount(item),0);assert.equal(r.itemCount(oldItem),5000);assert.equal(r.s.global.MORA,123);const loaded=new R(db,copy(r.s));assert.deepEqual(copy(loaded.talentLevels(owner).base),{na:4,e:8,q:10});}
});

check('the shared three-win daily bonus still counts material wins once and excludes EXP',()=>{
 // 0.16.56: the doubling applies to every tier of the new pay (was 64 / 10,800 / 180 / 5,400 old items).
 const r=fixture();r.s.domainDaily={day:DAY,wins:0};const cases=[['TALENT',25,'NEUTRAL',undefined,{GROWTH_BOOK_FREEDOM_1:2,GROWTH_BOOK_FREEDOM_2:6,GROWTH_BOOK_FREEDOM_3:2},1],['EXP',25,'NEUTRAL',undefined,{},1],['ASCENSION',60,'PYRO',undefined,{GROWTH_GEM_PYRO_4:2},2],['TALENT',60,'NEUTRAL','GOLD',{GROWTH_BOOK_GOLD_2:4,GROWTH_BOOK_GOLD_3:4},3],['ASCENSION',60,'PYRO',undefined,{GROWTH_GEM_PYRO_4:1},4]];
 for(const [kind,level,element,book,items,wins]of cases){const d=entry(r,kind,level);r.action('DOMAIN_START',{domain:d.id,element,...(book?{book}:{})});const out=settle(r);assert.equal(r.s.domainDaily.wins,wins);assert.equal(out.xp,(kind==='EXP'?EXP_XP:MATERIAL_XP)[level]);assert.equal(out.mora,0);assert.deepEqual(copy(out.domain.items),items);}
 assert.deepEqual(copy(G.domainXp),EXP_XP);assert.deepEqual(copy(G.previousDomainXp),LEGACY_EXP_XP);assert.equal(G.expRewardVersion,1);assert.deepEqual(copy(G.domainMaterialXp),MATERIAL_XP);assert.equal(G.pacingVersion,3);
 const tomorrow=entry(r,'ASCENSION',60);assert.deepEqual(copy(r.growthDomainRewards(tomorrow,'PYRO',DAY+1).items),{GROWTH_GEM_PYRO_4:2});
});

check('extra growth materials remain bound, unsellable and absent from shops and synthesis',()=>{
 const r=fixture();for(const item of OLD_ITEMS){r.giveItem(item,50000);assert.equal(r.tradeRule(item).ok,false);assert.equal(r.saleUnitPrice({item}),0);assert(!r.rows('19_SHOP_STOCK_DB').some(row=>row[3]===item));assert(!r.rows('17_RECIPE_DB').some(row=>row[3]===item||row[5]===item));assert(r.row('14_ITEM_DB',item)[1].startsWith('옛 '));}const loaded=new R(db,copy(r.s));for(const item of ['GROWTH_GEM_PYRO','GROWTH_TALENT_MOND'])assert.equal(loaded.itemCount(item),50000);
});

// 0.16.56 (asked: 「합성대로 따로 빼기」): the new gems and books are bound like the old ones and never sold; three of a tier make one
// of the next at the alchemy bench only (Mora 50/150/450 by step), as in the original.
check('tiered gems and books are bound, unsellable, absent from shops and synthesized only at the alchemy bench',()=>{
 const r=fixture(),chains=[...ELEMENTS.map(e=>[1,2,3,4].map(t=>'GROWTH_GEM_'+e+'_'+t)),...Object.values(BOOKS).flat().map(k=>[1,2,3].map(t=>'GROWTH_BOOK_'+k+'_'+t))];assert.equal(chains.flat().length,50);
 for(const chain of chains)chain.forEach((item,i)=>{const row=r.row('14_ITEM_DB',item);assert(row,item);assert.equal(row[3],['고급','희귀','영웅','전설'][i]);r.giveItem(item,5000);assert.equal(r.tradeRule(item).ok,false);assert.equal(r.saleUnitPrice({item}),0);assert(!r.rows('19_SHOP_STOCK_DB').some(x=>x[3]===item));const made=r.rows('17_RECIPE_DB').filter(x=>x[3]===item);
  if(!i)assert.equal(made.length,0);else{assert.equal(made.length,1);const [x]=made;assert.equal(x[1],'재료 합성');assert.equal(x[4],1);assert.equal(x[5],chain[i-1]);assert.equal(x[6],3);assert.equal(x[15],[50,150,450][i-1]);assert.equal(x[16],'연금대');assert.equal(x[17],'연금대');}});
 const loaded=new R(db,copy(r.s));for(const item of ['GROWTH_GEM_PYRO_4','GROWTH_BOOK_GOLD_3'])assert.equal(loaded.itemCount(item),5000);
});
console.log(JSON.stringify({checks,ok:true,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'source/runtime_growth_v01522.js'))).digest('hex'),scope:'fixed quantity tables, native authority/settlement, save versions and receipts; no combat-duration or victory-rate claims'}));
