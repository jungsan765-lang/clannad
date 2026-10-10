'use strict';
// Quantity/settlement/save tests. Directly finishing foes is a settlement fixture,
// never a claim about real combat duration, win rate or lodging frequency.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {R,db,c,fs,path,root}=require('./helpers_v011.cjs');
const {setup,PLAYER}=require('../tools/audit_balance_v01522.cjs');
const G=c.CRPGRuntime.growthV01522,copy=x=>JSON.parse(JSON.stringify(x));
const LEGACY_ASC={"NEUTRAL":{"5":1,"10":2,"15":3,"20":4,"25":5,"30":6,"35":8,"40":9,"45":18,"50":24,"55":29,"60":50},"PYRO":{"5":1,"10":2,"15":3,"20":16,"25":21,"30":18,"35":24,"40":57,"45":64,"50":134,"55":690,"60":1189},"HYDRO":{"5":1,"10":2,"15":3,"20":10,"25":18,"30":17,"35":27,"40":68,"45":123,"50":156,"55":332,"60":453},"ANEMO":{"5":1,"10":2,"15":3,"20":4,"25":5,"30":6,"35":10,"40":14,"45":15,"50":16,"55":47,"60":84},"ELECTRO":{"5":1,"10":2,"15":3,"20":4,"25":6,"30":6,"35":8,"40":10,"45":18,"50":31,"55":101,"60":176},"CRYO":{"5":1,"10":2,"15":3,"20":4,"25":7,"30":6,"35":8,"40":14,"45":26,"50":38,"55":75,"60":113},"GEO":{"5":1,"10":2,"15":3,"20":4,"25":5,"30":6,"35":8,"40":10,"45":15,"50":20,"55":48,"60":87},"DENDRO":{"5":1,"10":2,"15":3,"20":4,"25":6,"30":7,"35":10,"40":11,"45":13,"50":16,"55":50,"60":70}};
const ASC=Object.fromEntries(Object.keys(LEGACY_ASC).map(element=>[element,{5:1,10:2,15:3,20:4,25:6,30:8,35:20,40:35,45:80,50:180,55:600,60:1500}]));
const LEGACY_TALENT={MOND:{5:1,10:2,15:10,20:20,25:32},LIYUE:{30:6,35:8,40:10,45:12,50:24,55:36,60:64}};
const TALENT={...LEGACY_TALENT,LIYUE:{...LEGACY_TALENT.LIYUE,60:80}};
const BOOK_COST={MOND:[2,4,12,32,60,96,126,160,180],LIYUE:[5,10,30,80,150,240,315,400,450]};
const PROFILE=[1,1,2,4,6,8,9,10,10];
const OLD_ASC={5:1,10:2,15:3,20:4,25:5,30:6,35:7,40:8,45:9,50:10,55:20,60:32};
const MATERIAL_XP={5:40,10:90,15:90,20:220,25:220,30:360,35:360,40:500,45:500,50:900,55:900,60:1600};
const EXP_XP={5:200,10:450,15:1000,20:1100,25:1250,30:1500,35:1800,40:2100,45:4500,50:5400,55:8000,60:10000};
const TEAM=['MOND_AMBER','MOND_KAEYA','MOND_LISA'],ELEMENTS=Object.keys(ASC),STAGES=Object.keys(ASC.NEUTRAL).map(Number),DAY=G.dayOf(c.Date.now());
const OWNERS=[['PLAYER_CUSTOM','NEUTRAL',4],['MOND_AMBER','PYRO',4],['MOND_DILUC','PYRO',5],['MOND_BARBARA','HYDRO',4],['LIYUE_YELAN','HYDRO',5],['MOND_SUCROSE','ANEMO',4],['MOND_JEAN','ANEMO',5],['MOND_LISA','ELECTRO',4],['LIYUE_KEQING','ELECTRO',5],['MOND_KAEYA','CRYO',4],['LIYUE_QIQI','CRYO',5],['MOND_NOELLE','GEO',4],['LIYUE_ZHONGLI','GEO',5],['LIYUE_YAOYAO','DENDRO',4],['LIYUE_BAIZHU','DENDRO',5]];
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
function fixture(owner=PLAYER){const team=owner===PLAYER?TEAM:[owner,...TEAM.filter(id=>id!==owner)].slice(0,3),r=setup({level:60,team,gear:'none',talent:1,route:'ROUTE_TRAVELER'});r.s.inventory=[];r.s.global.MORA=0;return r;}
function phase(r,owner,p){const level=[10,20,30,40,50,55,60][p];if(owner===PLAYER){r.s.global.PLAYER_LEVEL_STATE=level;r.s.global.PLAYER_XP_STATE=0;}else{r.s.chars[owner].level=level;r.s.chars[owner].xp=0;}r.s.ascensions[owner]=p;r.recalculate();if(owner===PLAYER)r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;else r.s.chars[owner].hp=r.character(owner).maxHp;}
function entry(r,kind,level,region){const [key,s]=Object.entries(G.domains).find(([,s])=>s.kind===kind&&s.levels.includes(level)&&(!region||s.region===region));r.s.global.CURRENT_MAP_ID=s.map;r.s.global.SCREEN_MODE='LOCATION';r.s.placeVisit=null;return r.growthDomainEntries().find(d=>d.key===key&&d.level===level);}
function start(kind='ASCENSION',level=60,element='PYRO'){const r=fixture(),d=entry(r,kind,level);r.s.domainDaily={day:DAY,wins:3};r.action('DOMAIN_START',{domain:d.id,element});return r;}
function settle(r){for(const a of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))a.hp=0;return r.finishBattle(true);}
function ready(r,cost){r.s.inventory=[];r.s.global.MORA=cost.mora+123;for(const [id,n]of Object.entries(cost.items))r.giveItem(id,n);}
function intent(r,type,args){return {id:r.s.global.SAVE_ID+':'+(r.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:r.s.global.SAVE_REVISION,type,...args};}
function once(r,a){const out=r.transact(a),saved=r.serialize();assert.deepEqual(copy(r.transact(a)),copy(out));assert.equal(r.serialize(),saved);const restored=new R(db,copy(r.s));assert.deepEqual(copy(restored.transact(a)),copy(out));assert.equal(restored.serialize(),saved);return out;}
function reject(r,a){const before=r.serialize();assert.throws(()=>r.transact(a));assert.equal(r.serialize(),before,'failed payment changes no wallet, item, phase, HP, talent or receipt');}

check('current hard-coded element quantities and historical tables are separate snapshots',()=>{
 assert.deepEqual(copy(G.domainAscensionGems),ASC);assert.deepEqual(copy(G.domainTalentBooks),TALENT);assert.deepEqual(copy(G.talentBookMultipliers),PROFILE);assert.equal(G.ascensionRewardVersion,3);assert.equal(G.talentRewardVersion,2);assert.deepEqual(copy(G.talentBookCosts),BOOK_COST);assert.deepEqual(copy(G.legacyDomainTalentBooks[1]),LEGACY_TALENT);assert.equal(G.materialRequirementVersion,2);assert.deepEqual(copy(G.legacyDomainAscensionGems[2]),LEGACY_ASC);assert.deepEqual(copy(G.legacyDomainAscensionGems[1]),OLD_ASC);
 for(const level of STAGES){assert.equal(G.legacyDomainAscensionGems[0][level],level/5);assert.equal(G.legacyDomainTalentBooks[0][level],level/5);}
});

check('all new entrance previews carry the same marker and quantity as their saved battle',()=>{
 const r=fixture();for(const kind of ['ASCENSION','TALENT'])for(const level of STAGES){const d=entry(r,kind,level),elements=kind==='ASCENSION'?ELEMENTS:['NEUTRAL'];assert.equal(d.reason,'');assert.equal(d[kind==='ASCENSION'?'ascensionRewardVersion':'talentRewardVersion'],kind==='ASCENSION'?3:2);
  for(const element of elements){const item=kind==='ASCENSION'?'GROWTH_GEM_'+element:'GROWTH_TALENT_'+(d.region==='몬드'?'MOND':'LIYUE'),amount=kind==='ASCENSION'?ASC[element][level]:TALENT[d.region==='몬드'?'MOND':'LIYUE'][level];
   for(const wins of [0,1,2,3]){r.s.domainDaily={day:DAY,wins};const rw=r.growthDomainRewards(d,element,DAY);assert.equal(rw.items[item],amount*(wins<3?2:1));assert.equal(rw.remaining,Math.max(0,3-wins));assert.equal(rw.bonus,wins<3);assert.equal(rw.mora,0);assert.equal(rw.xp,MATERIAL_XP[level]);assert.equal(Object.keys(rw.items).length,1);}
   r.s.domainDaily.wins=3;r.action('DOMAIN_START',{domain:d.id,element});const saved=copy(r.s),b=copy(saved.runtime);assert.equal(b.materialBudget,undefined);assert.equal(b.growthDomain.materialBudgetVersion,undefined);assert.deepEqual(copy(new R(db,saved).s.runtime),b);assert.deepEqual(copy(r.growthDomainRewards(b.growthDomain,element).items),{[item]:amount});settle(r);
  }
 }
});

check('actual new settlements pay large quantities exactly once without XP books or Mora',()=>{
 for(const element of ELEMENTS){const r=start('ASCENSION',60,element),item='GROWTH_GEM_'+element,before=r.itemCount(item),money=r.s.global.MORA,out=settle(r);assert.equal(out.domain.items[item],ASC[element][60]);assert.equal(r.itemCount(item)-before,ASC[element][60]);assert.equal(r.s.global.MORA,money);assert.equal(out.xp,1600);assert.equal(out.mora,0);assert(!Object.keys(out.domain.items).some(id=>/MAT_CHAR_EXP|^ORE_/.test(id)));const saved=r.serialize();assert.equal(r.finishBattle(true),undefined);assert.equal(r.serialize(),saved);assert.equal(new R(db,copy(r.s)).serialize(),saved);}
});

check('old marked and unmarked version-four ascension promises settle with their old table',()=>{
 for(const level of [20,55,60])for(const marker of [undefined,0,1,2]){const r=start('ASCENSION',level,'PYRO');if(marker===undefined)delete r.s.runtime.growthDomain.ascensionRewardVersion;else r.s.runtime.growthDomain.ascensionRewardVersion=marker;const before=copy(r.s.runtime),loaded=new R(db,copy(r.s));assert.deepEqual(copy(loaded.s.runtime.actors),before.actors);assert.deepEqual(copy(loaded.s.runtime.order),before.order);assert.equal(loaded.s.runtime.growthDomain.ascensionRewardVersion,marker??0);const quantity=marker===2?LEGACY_ASC.PYRO[level]:marker===1?OLD_ASC[level]:level/5;assert.equal(loaded.growthDomainRewards(loaded.s.runtime.growthDomain,'PYRO').items.GROWTH_GEM_PYRO,quantity);assert.equal(settle(loaded).domain.items.GROWTH_GEM_PYRO,quantity);const saved=loaded.serialize();loaded.finishBattle(true);assert.equal(loaded.serialize(),saved);}
});

check('old version-four talent fights retain old books and never receive new book rewards on reload',()=>{
 for(const level of [20,25,55,60])for(const marker of [undefined,0,1]){const r=start('TALENT',level);if(marker===undefined)delete r.s.runtime.growthDomain.talentRewardVersion;else r.s.runtime.growthDomain.talentRewardVersion=marker;const before=copy(r.s.runtime),loaded=new R(db,copy(r.s));assert.equal(loaded.s.runtime.growthDomain.talentRewardVersion,marker??0);assert.deepEqual(copy(loaded.s.runtime.actors),before.actors);const item='GROWTH_TALENT_'+(level<=25?'MOND':'LIYUE');const quantity=marker===1?LEGACY_TALENT[level<=25?'MOND':'LIYUE'][level]:level/5;assert.equal(loaded.growthDomainRewards(loaded.s.runtime.growthDomain).items[item],quantity);assert.equal(settle(loaded).domain.items[item],quantity);}
});

check('legacy versions one, two and three keep their original unmarked material payout',()=>{
 const plans=[{id:'TALENT:10',kind:'TALENT',level:10,region:'몬드',map:'MAP_MOND_CITY',element:'NEUTRAL',day:DAY},{version:2,id:'FORSAKEN_RIFT:2',key:'FORSAKEN_RIFT',stage:2,kind:'TALENT',level:10,region:'몬드',map:'MAP_MOND_SPRINGVALE',element:'NEUTRAL',day:DAY},{version:3,id:'FORSAKEN_RIFT:TALENT',key:'FORSAKEN_RIFT',name:'잊혀진 협곡',kind:'TALENT',level:5,region:'몬드',map:'MAP_MOND_SPRINGVALE',element:'NEUTRAL',day:DAY}];
 for(const d of plans){const r=fixture();r.s.global.CURRENT_MAP_ID=d.map;r.s.domainDaily={day:DAY,wins:3};r._growthDomain=d;try{r.startBattle(r.growthDomainGroup(d),'DOMAIN:'+d.id);}finally{delete r._growthDomain;}const before=copy(r.s.runtime),loaded=new R(db,copy(r.s));assert.deepEqual(copy(loaded.s.runtime),before);assert.equal(loaded.s.runtime.growthDomain.talentRewardVersion,undefined);assert.equal(loaded.growthDomainRewards(loaded.s.runtime.growthDomain).items.GROWTH_TALENT_MOND,d.level/5);}
});

check('unsupported, misplaced and impossible old-budget/new-reward marker combinations reject',()=>{
 const asc=start(),talent=start('TALENT'),exp=start('EXP'),invalid=(r,mutate)=>{const saved=copy(r.s);mutate(saved.runtime.growthDomain,saved.runtime);assert.throws(()=>new R(db,saved),/보상|버전/);};
 for(const marker of [-1,4,'3',null])invalid(asc,d=>d.ascensionRewardVersion=marker);
 for(const marker of [-1,3,'2',null])invalid(talent,d=>d.talentRewardVersion=marker);
 invalid(asc,d=>d.talentRewardVersion=1);invalid(talent,d=>d.ascensionRewardVersion=2);invalid(exp,d=>d.ascensionRewardVersion=2);invalid(exp,d=>d.talentRewardVersion=1);
 for(const r of [asc,talent])invalid(r,(d,b)=>{d.materialBudgetVersion=1;b.materialBudget={version:1,durability:G.legacyMaterialBudgets[1].durability[d.level],pressure:G.legacyMaterialBudgets[1].pressure[d.level]};});
 for(const [r,marker]of [[asc,1],[talent,0]]){const s=copy(r.s),d=s.runtime.growthDomain;d[d.kind==='ASCENSION'?'ascensionRewardVersion':'talentRewardVersion']=marker;d.materialBudgetVersion=1;s.runtime.materialBudget={version:1,durability:G.legacyMaterialBudgets[1].durability[d.level],pressure:G.legacyMaterialBudgets[1].pressure[d.level]};assert.deepEqual(copy(new R(db,s).s.runtime),s.runtime);}
});

check('every own-element phase uses its fixed coupled gems with unchanged Mora and other costs',()=>{
 const specialties=[2,4,6,8,10,12],masks=[2,3,3,4,4,6],mora=[800,2400,6000,14000,28000,42000];
 for(const [owner,element,rarity]of OWNERS){const r=fixture(owner),pay=ASC[element],expected=[3,2*pay[15],2*pay[30],5*pay[40],8*pay[50],25*pay[60]],mult=rarity===5?2:1;assert.deepEqual(copy(G.ascensionGemCosts[element]),expected);for(let p=0;p<6;p++){phase(r,owner,p);const info=r.ascensionInfo(owner),cost=copy(info.cost),gem='GROWTH_GEM_'+element;assert.equal(cost.items[gem],expected[p]*mult);assert.equal(cost.mora,Math.round(mora[p]*(rarity===5?1.8:1)));assert.equal(Object.entries(cost.items).filter(([id])=>!id.startsWith('GROWTH_GEM_')&&!id.startsWith('MAT_')&&id!=='TRPG_BOSS_ESSENCE').length<=1,true);const mask=['MAT_DAMAGED_MASK','MAT_STAINED_MASK','MAT_OMINOUS_MASK'][Math.min(2,Math.floor(p/2))];assert.equal(cost.items[mask],masks[p]*mult);const specialty=G.specialties[owner]||(owner.startsWith('LIYUE_')?'MAT_LIYUE_QINGXIN':'ING_CALLA_LILY');assert.equal(cost.items[specialty],specialties[p]*mult);if(p>=3)assert.equal(Object.entries(cost.items).find(([id])=>id.startsWith('MAT_FB_')||id==='TRPG_BOSS_ESSENCE')[1],(p-2)*mult);assert.equal(info.nextCap,[20,30,40,50,55,60][p]);}
  phase(r,owner,6);assert.deepEqual(copy(r.ascensionInfo(owner).cost),{mora:0,items:{}});
 }
});

check('37500/75000 future gem payments are atomic, valid on reload and paid once',()=>{
 for(const [owner,need]of [['MOND_AMBER',37500],['MOND_DILUC',75000]]){const r=fixture(owner);phase(r,owner,5);const d=r.ascensionInfo(owner),gem='GROWTH_GEM_PYRO';assert.equal(d.cost.items[gem],need);ready(r,d.cost);r.s.inventory.find(i=>i.item===gem).quantity=need-1;const a=intent(r,'CHAR_ASCEND',{owner});reject(r,{...a,cost:{mora:0,items:{[gem]:800}},price:800});r.giveItem(gem,1);const loaded=new R(db,copy(r.s));assert.equal(loaded.itemCount(gem),need);once(loaded,a);assert.equal(loaded.itemCount(gem),0);assert.equal(loaded.growth(owner).phase,6);assert.equal(loaded.growth(owner).cap,60);assert.equal(loaded.s.global.MORA,123);assert.equal(loaded.s.chars[owner].hp,loaded.character(owner).maxHp);}
});

check('book requirements follow the nine-step profile without changing Mora or slime costs',()=>{
 for(const owner of ['MOND_AMBER','MOND_DILUC','LIYUE_XIANGLING','LIYUE_ZHONGLI']){const r=fixture(owner),liyue=owner.startsWith('LIYUE_'),item='GROWTH_TALENT_'+(liyue?'LIYUE':'MOND'),five=r.rarityOf(owner)===5,totals={8:0,10:0};for(let level=1;level<=9;level++){r.s.talents[owner]={na:level,e:level,q:level};const d=r.talentUpgradeInfo(owner,'na');assert.equal(d.cost.items[item],BOOK_COST[liyue?'LIYUE':'MOND'][level-1]);assert.equal(d.cost.mora,Math.round(250*level*level*(five?1.5:1)));if(level>=2)assert.equal(d.cost.items[level<5?'MAT_SLIME_SECRETIONS':'MAT_SLIME_CONCENTRATE'],Math.ceil(level/2));else assert.equal(Object.keys(d.cost.items).length,1);totals[10]+=3*d.cost.items[item];if(level<8)totals[8]+=3*d.cost.items[item];}assert.equal(totals[8],liyue?2490:996);assert.equal(totals[10],liyue?5040:2016);r.s.talents[owner]={na:10,e:10,q:10};const maxed=r.talentUpgradeInfo(owner,'na');assert(maxed.reason);assert(Number.isSafeInteger(maxed.cost.items[item]));}
});

check('unpaid talent changes use the current book cost and trained levels stay unchanged',()=>{
 for(const [owner,item,need]of [['MOND_AMBER','GROWTH_TALENT_MOND',12],['LIYUE_XIANGLING','GROWTH_TALENT_LIYUE',30]]){const r=fixture(owner);r.s.talents[owner]={na:3,e:8,q:10};const cost=r.talentUpgradeInfo(owner,'na').cost;assert.equal(cost.items[item],need);ready(r,cost);r.s.inventory.find(i=>i.item===item).quantity--;const a=intent(r,'TALENT_UPGRADE',{owner,kind:'na'});reject(r,{...a,cost:{mora:0,items:{[item]:need/2}}});r.giveItem(item,1);once(r,a);assert.deepEqual(copy(r.talentLevels(owner).base),{na:4,e:8,q:10});assert.equal(r.itemCount(item),0);assert.equal(r.s.global.MORA,123);const loaded=new R(db,copy(r.s));assert.deepEqual(copy(loaded.talentLevels(owner).base),{na:4,e:8,q:10});}
});

check('the shared three-win daily bonus still counts material wins once and excludes EXP',()=>{
 const r=fixture();r.s.domainDaily={day:DAY,wins:0};const cases=[['TALENT',25,'NEUTRAL','GROWTH_TALENT_MOND',64,1],['EXP',25,'NEUTRAL',null,0,1],['ASCENSION',60,'PYRO','GROWTH_GEM_PYRO',3000,2],['TALENT',60,'NEUTRAL','GROWTH_TALENT_LIYUE',160,3],['ASCENSION',60,'PYRO','GROWTH_GEM_PYRO',1500,4]];
 for(const [kind,level,element,item,amount,wins]of cases){const d=entry(r,kind,level);r.action('DOMAIN_START',{domain:d.id,element});const out=settle(r);assert.equal(r.s.domainDaily.wins,wins);assert.equal(out.xp,(kind==='EXP'?EXP_XP:MATERIAL_XP)[level]);assert.equal(out.mora,0);if(item)assert.equal(out.domain.items[item],amount);else assert.deepEqual(copy(out.domain.items),{});}
 assert.deepEqual(copy(G.domainXp),EXP_XP);assert.deepEqual(copy(G.domainMaterialXp),MATERIAL_XP);assert.equal(G.pacingVersion,3);
 const tomorrow=entry(r,'ASCENSION',60);assert.equal(r.growthDomainRewards(tomorrow,'PYRO',DAY+1).items.GROWTH_GEM_PYRO,3000);
});

check('extra growth materials remain bound, unsellable and absent from shops and synthesis',()=>{
 const r=fixture();for(const item of [...ELEMENTS.map(e=>'GROWTH_GEM_'+e),'GROWTH_TALENT_MOND','GROWTH_TALENT_LIYUE']){r.giveItem(item,50000);assert.equal(r.tradeRule(item).ok,false);assert.equal(r.saleUnitPrice({item}),0);assert(!r.rows('19_SHOP_STOCK_DB').some(row=>row[3]===item));assert(!r.rows('17_RECIPE_DB').some(row=>row[3]===item));}const loaded=new R(db,copy(r.s));for(const item of ['GROWTH_GEM_PYRO','GROWTH_TALENT_MOND'])assert.equal(loaded.itemCount(item),50000);
});
console.log(JSON.stringify({checks,ok:true,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'source/runtime_growth_v01522.js'))).digest('hex'),scope:'fixed quantity tables, native authority/settlement, save versions and receipts; no combat-duration or victory-rate claims'}));
