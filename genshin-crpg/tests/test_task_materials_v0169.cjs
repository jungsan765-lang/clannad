'use strict';
const assert=require('node:assert/strict');
const {R,db,c}=require('./helpers_v011.cjs');
const {audit,fixture,characterCosts,entryFor,weeklySupply}=require('../tools/audit_task_materials_v0169.cjs');
const copy=x=>JSON.parse(JSON.stringify(x)),api=c.CRPGRuntime,G=api.growthV01522;
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
function restore(r){return new R(db,copy(r.s));}
function ready(r,cost){r.s.inventory=[];r.s.global.MORA=cost.mora+123;for(const[id,n]of Object.entries(cost.items))r.giveItem(id,n);}
function reject(r,type,args){const before=r.serialize();assert.throws(()=>r.action(type,args));assert.equal(r.serialize(),before,'rejection changes neither wallet, inventory, growth nor receipt');}
function once(r,type,args){const g=r.s.global,a={id:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1),revision:g.SAVE_REVISION,type,...args},out=r.transact(a),save=r.serialize();assert.deepEqual(copy(r.transact(a)),copy(out));assert.equal(r.serialize(),save,'same action receipt spends only once');return out;}
// 0.16.56 (user: 「재료 양이 너무 많으니까 정신 없어서 … 돌파재료같은거 … 원작 고증 살려서 추가하고 제작에 넣거나 비경 보상에 넣자」): the
// single region/element items became the original's tiered gems (가루/조각/덩이/원석, counted 1/3/9/27 in the lowest tier) and books
// (가르침/인도/철학, 1/3/9). The 0.16.22 tables stay exported for fights saved before; the checks below count the new tables.
const GEM_UNITS=[0,1,3,9,27],BOOK_UNITS=[0,1,3,9],units=(items,prefix,value)=>Object.entries(items).filter(([k])=>k.startsWith(prefix)).reduce((a,[k,n])=>a+n*value[+k.slice(-1)],0);
check('native six-phase demands use the original tiered gems (original count x2) with unchanged Mora and other materials',()=>{
 for(const element of ['NEUTRAL','PYRO','HYDRO','ANEMO','ELECTRO','CRYO','GEO','DENDRO'])assert.deepEqual(copy(G.ascensionGemCosts[element]),[3,6,94,765,5136,135000]);
 const phases=[[1,2],[2,6],[2,12],[3,6],[3,12],[4,12]];assert.deepEqual(copy(G.gemCosts),phases);
 for(const[owner,rarity,element]of [['MOND_AMBER',4,'PYRO'],['MOND_DILUC',5,'PYRO'],['LIYUE_XIANGLING',4,'PYRO'],['LIYUE_ZHONGLI',5,'GEO']]){const x=characterCosts(owner),mult=rarity===5?2:1;assert.equal(x.rarity,rarity);assert.deepEqual(x.ascensionPhases.map(p=>Object.entries(p.cost.items).filter(([k])=>k.startsWith('GROWTH_GEM_'))),phases.map(([t,n])=>[[G.gemItem(element,t),n*mult]]));
  // Full ascension: 2/18/18/12 of tiers 1–4 = 542 lowest-tier units for a 4★, twice that (1084) for a 5★ (was 141004/282008 old gems).
  assert.deepEqual(Object.fromEntries(Object.entries(x.ascensionTotal.items).filter(([k])=>k.startsWith('GROWTH_GEM_'))),{[G.gemItem(element,1)]:2*mult,[G.gemItem(element,2)]:18*mult,[G.gemItem(element,3)]:18*mult,[G.gemItem(element,4)]:12*mult});assert.equal(units(x.ascensionTotal.items,'GROWTH_GEM_',GEM_UNITS),542*mult);
  assert(!Object.keys(x.ascensionTotal.items).includes('GROWTH_GEM_'+element),'new phases never ask for the old gem');assert.equal(x.ascensionTotal.mora,rarity===5?167760:93200);assert.equal(x.newLevel55LastAscension.mora,rarity===5?75600:42000);}
});
check('native talent book totals use each character\'s original book kind: 468/1224 lowest-tier units for three talents in both regions',()=>{
 // 0.16.56: was MOND 996/2016 and LIYUE 2490/5040 region books; now the original's counts (no regional or 5★ multiplier) of the
 // character's own kind: three talents to 8 = 9/63/30 (3×156 units), to 10 = 9/63/114 (3×408 units).
 assert.deepEqual(copy(G.bookCosts),[[1,3],[2,2],[2,4],[2,6],[2,9],[3,4],[3,6],[3,12],[3,16]]);
 for(const[owner,kind]of [['MOND_AMBER','FREEDOM'],['MOND_DILUC','RESISTANCE'],['LIYUE_XIANGLING','DILIGENCE'],['LIYUE_ZHONGLI','GOLD']]){const x=characterCosts(owner),books=n=>Object.fromEntries(Object.entries(x.threeTalentCosts[n].items).filter(([k])=>k.startsWith('GROWTH_BOOK_')));assert.equal(G.bookOf[owner],kind);
  assert.deepEqual(books(8),{[G.bookItem(kind,1)]:9,[G.bookItem(kind,2)]:63,[G.bookItem(kind,3)]:30});assert.deepEqual(books(10),{[G.bookItem(kind,1)]:9,[G.bookItem(kind,2)]:63,[G.bookItem(kind,3)]:114});assert.equal(units(x.threeTalentCosts[8].items,'GROWTH_BOOK_',BOOK_UNITS),468);assert.equal(units(x.threeTalentCosts[10].items,'GROWTH_BOOK_',BOOK_UNITS),1224);
  for(const n of [8,10])assert(!x.threeTalentCosts[n].items.GROWTH_TALENT_MOND&&!x.threeTalentCosts[n].items.GROWTH_TALENT_LIYUE,'new steps never ask for the old region books');
  assert.equal(x.threeTalentCosts[8].items.MAT_SLIME_SECRETIONS,15);assert.equal(x.threeTalentCosts[8].items.MAT_SLIME_CONCENTRATE,30);assert.equal(x.threeTalentCosts[10].items.MAT_SLIME_CONCENTRATE,57);assert.equal(x.threeTalentCosts[8].mora,x.rarity===5?157500:105000);}
});
check('one fewer than 12/24 final PYRO gemstones rejects atomically; exact costs spend once and survive reload',()=>{
 // 0.16.56: the last phase asks 12 (5★ 24) 불타오르는 마노 (tier 4); was 135000/270000 old gems.
 for(const[owner,need]of [['MOND_AMBER',12],['MOND_DILUC',24]]){let r=fixture(owner);r.s.chars[owner].level=55;r.s.chars[owner].xp=0;r.s.ascensions[owner]=5;const d=r.ascensionInfo(owner),gem=Object.keys(d.cost.items).find(k=>k.startsWith('GROWTH_GEM_'));assert.equal(gem,'GROWTH_GEM_PYRO_4');assert.equal(d.cost.items[gem],need);ready(r,d.cost);r.s.inventory.find(v=>v.item===gem).quantity=need-1;reject(r,'CHAR_ASCEND',{owner});r.giveItem(gem,1);const money=r.s.global.MORA;once(r,'CHAR_ASCEND',{owner});assert.equal(r.s.global.MORA,money-d.cost.mora);for(const id of Object.keys(d.cost.items))assert.equal(r.itemCount(id),0,id);assert.equal(r.growth(owner).phase,6);assert.equal(r.growth(owner).cap,60);r=restore(r);assert.equal(r.growth(owner).phase,6);assert.equal(r.s.global.MORA,123);reject(r,'CHAR_ASCEND',{owner});}
});
check('first talent consumes 3 teachings of the character\'s own kind (Amber 자유, Xiangling 근면); missing one book rejects atomically',()=>{
 // 0.16.56: was 2 MOND / 5 LIYUE region books.
 for(const[owner,key,need]of [['MOND_AMBER','GROWTH_BOOK_FREEDOM_1',3],['LIYUE_XIANGLING','GROWTH_BOOK_DILIGENCE_1',3]]){let r=fixture(owner),d=r.talentUpgradeInfo(owner,'na');assert.equal(d.cost.items[key],need);ready(r,d.cost);r.s.inventory.find(v=>v.item===key).quantity=need-1;reject(r,'TALENT_UPGRADE',{owner,kind:'na'});r.giveItem(key,1);once(r,'TALENT_UPGRADE',{owner,kind:'na'});assert.equal(r.itemCount(key),0);assert.equal(r.s.global.MORA,123);assert.equal(r.talentLevels(owner).base.na,2);r=restore(r);assert.equal(r.talentLevels(owner).base.na,2);}
});
check('native three-talent upgrades to 8 pay the exact own-kind totals and preserve trained saves',()=>{
 for(const owner of ['MOND_AMBER','LIYUE_XIANGLING']){let r=fixture(owner),cost=characterCosts(owner).threeTalentCosts[8];ready(r,cost);for(let target=2;target<=8;target++)for(const kind of ['na','e','q'])once(r,'TALENT_UPGRADE',{owner,kind});assert.deepEqual(copy(r.talentLevels(owner).base),{na:8,e:8,q:8});assert.equal(r.s.global.MORA,123);for(const id of Object.keys(cost.items))assert.equal(r.itemCount(id),0);const saved=r.serialize();r=restore(r);assert.equal(r.serialize(),saved,'price change does not retroactively charge existing talents/ascensions');assert.equal(r.growth(owner).phase,6);}
});
check('the three 20-win weekly domain subgoals overlap daily wins for 60 payouts; EXP never spends the shared material bonus',()=>{
 for(const extra of [false,true]){const m=weeklySupply({talentLevel:60,ascensionLevel:60,extraOnExperienceDays:extra});assert.equal(m.runs.length,60);assert.deepEqual(m.weeklyWins,{TALENT:20,ASCENSION:20,EXP:20});assert.deepEqual(m.materialBonusWins,extra?{TALENT:12,ASCENSION:9}:{TALENT:9,ASCENSION:6});assert.equal(m.totalMaterialBonusWins,extra?21:15);for(const day of m.days)assert(day.materialBonusWins<=3);for(const v of m.runs.filter(v=>v.kind==='EXP')){assert.equal(v.materialCounterAfter,v.materialCounterBefore);assert.equal(v.bonus,false);assert.deepEqual(v.items,{});}
  // 0.16.56: 29 (32) TALENT60 payouts of 2 인도 + 2 철학 of the default first 리월 kind (번영; the model's entry picks no book) and
  // 26 (29) ASCENSION60 payouts of one 원석 = 696 (768) book units and 702 (783) gem units; was 2610 (2880) books and 140400 (156600) gems.
  assert.deepEqual(copy(m.totals.items),extra?{GROWTH_BOOK_PROSPERITY_2:64,GROWTH_BOOK_PROSPERITY_3:64,GROWTH_GEM_PYRO_4:29}:{GROWTH_BOOK_PROSPERITY_2:58,GROWTH_BOOK_PROSPERITY_3:58,GROWTH_GEM_PYRO_4:26});assert.equal(units(m.totals.items,'GROWTH_BOOK_',BOOK_UNITS),extra?768:696);assert.equal(units(m.totals.items,'GROWTH_GEM_',GEM_UNITS),extra?783:702);assert.equal(m.totals.mora,0);}
});
check('fixed current stage payouts match the weekly domain-subgoal subset without cloning books',()=>{
 // 0.16.56: the same 29/26 (boosted 32/29) payout counts now carry the tiered drops (MOND TALENT5 {1:1}, TALENT25 {1:1,2:3,3:1};
 // ASCENSION5 {1:1}, 25 {1:2,2:1}, 60 {4:1}); was MOND books 29/928 (32/1024) and PYRO gems 26/832/140400 (29/928/156600).
 const F=n=>'GROWTH_BOOK_FREEDOM_'+n,P=n=>'GROWTH_GEM_PYRO_'+n;
 for(const[t,a,plain,boosted]of [[5,5,{[F(1)]:29,[P(1)]:26},{[F(1)]:32,[P(1)]:29}],[25,25,{[F(1)]:29,[F(2)]:87,[F(3)]:29,[P(1)]:52,[P(2)]:26},{[F(1)]:32,[F(2)]:96,[F(3)]:32,[P(1)]:58,[P(2)]:29}],[25,60,{[F(1)]:29,[F(2)]:87,[F(3)]:29,[P(4)]:26},{[F(1)]:32,[F(2)]:96,[F(3)]:32,[P(4)]:29}]])for(const extra of [false,true]){const m=weeklySupply({talentLevel:t,ascensionLevel:a,extraOnExperienceDays:extra}),expected=extra?boosted:plain;assert.deepEqual(copy(m.totals.items),expected);assert(!m.totals.items.MAT_CHAR_EXP_HERO);}
});
check('material XP and pacing stay exact; fresh EXP60 and TALENT60 use explicit new rewards with old tables retained',()=>{
 // 0.16.51 (user: 「저레벨부터 고레벨까지 전체적으로 훑어보고 적당한 선을 지정하고 그게 이 보상에 맞는 수준이 맞는지까지」): the Lv35–55 EXP stages pay more; the previous table is the 0.16.26 one.
 const previousExp={5:200,10:450,15:1000,20:1100,25:1250,30:1500,35:1800,40:2100,45:4500,50:5400,55:8000,60:10000},expectedExp={...previousExp,35:7000,40:8500,45:10500,50:11000,55:14000,60:24000};assert.deepEqual(copy(G.domainXp),expectedExp);assert.deepEqual(copy(G.previousDomainXp),previousExp);assert.equal(G.expRewardVersion,1);assert.deepEqual(copy(G.domainMaterialXp),{5:40,10:90,15:90,20:220,25:220,30:360,35:360,40:500,45:500,50:900,55:900,60:1600});assert.equal(G.pacingVersion,3);
 assert.deepEqual(copy(G.pacingCurve),[80,150,250,380,520,660,820,1000,1170,2080,2170,2250,2340,2410,2510,2580,2680,2750,2830,9300,9680,10050,10420,10800,11160,11550,11920,12290,12660,55530,57760,59970,62190,64420,66640,68860,71070,73300,75520,105650,105670,105690,105720,105740,105760,105780,105810,105830,105850,189000,189950,190890,191840,192780,193730,194670,195620,196560,197510,0]);
 // 0.16.56: fresh TALENT runs are reward version 5 (tiered books); the version-4 table stays for fights saved before.
 assert.equal(G.talentRewardVersion,5);assert.equal(G.previousTalentRewardVersion,4);assert.deepEqual(copy(G.domainTalentBooks),{MOND:{5:1,10:2,15:10,20:20,25:32},LIYUE:{30:3,35:5,40:9,45:12,50:25,55:38,60:90}});assert.deepEqual(copy(G.talentBookMultipliers),[1,1,2,4,6,8,9,10,10]);
 assert.deepEqual(copy(G.bookDrops),{MOND:{5:{1:1},10:{1:2},15:{1:3,2:1},20:{1:2,2:3},25:{1:1,2:3,3:1}},LIYUE:{30:{1:1},35:{1:2},40:{1:3},45:{1:1,2:1},50:{1:1,2:2},55:{1:2,2:3},60:{2:2,3:2}}});
 const r=fixture('MOND_AMBER'),pay=(d,wins)=>{r.s.domainDaily={day:20000,wins};return copy(r.growthDomainRewards(d,'NEUTRAL',20000).items);},twice=x=>Object.fromEntries(Object.entries(x).map(([k,n])=>[k,2*n]));
 for(const[level,amount,fresh]of [[5,1,{GROWTH_BOOK_FREEDOM_1:1}],[25,32,{GROWTH_BOOK_FREEDOM_1:1,GROWTH_BOOK_FREEDOM_2:3,GROWTH_BOOK_FREEDOM_3:1}],[60,90,{GROWTH_BOOK_PROSPERITY_2:2,GROWTH_BOOK_PROSPERITY_3:2}]]){const d=entryFor('TALENT',level),key=d.region==='몬드'?'GROWTH_TALENT_MOND':'GROWTH_TALENT_LIYUE',region=d.region==='몬드'?'MOND':'LIYUE',saved={...d,talentRewardVersion:G.previousTalentRewardVersion};
  assert.equal(d.talentRewardVersion,5);assert.deepEqual(pay(d,0),twice(fresh));assert.deepEqual(pay(d,3),fresh);
  // A run's picked kind of its own region is paid (no weekday rule); another region's kind falls back to the region's first.
  const picked=Object.keys(G.bookKinds).filter(k=>G.bookKinds[k][1]===region)[2],foreign=Object.keys(G.bookKinds).find(k=>G.bookKinds[k][1]!==region),as=k=>Object.fromEntries(Object.entries(fresh).map(([id,n])=>[G.bookItem(k,+id.slice(-1)),n]));
  assert.deepEqual(pay({...d,book:picked},3),as(picked));assert.deepEqual(pay({...d,book:foreign},3),fresh);
  // A fight saved with version 4 still pays the old region books.
  assert.deepEqual(pay(saved,0),{[key]:2*amount});assert.deepEqual(pay(saved,3),{[key]:amount});}
 const report=audit();assert.equal(report.weeklySupplyModels.length,8);assert.equal(report.recipeBenchmarks.length,20);assert.equal(report.nativeDomainRewards.length,36);assert(report.scope.includes('No actual 60-fight'));
});
console.log(JSON.stringify({version:require('../package.json').version,checks,ok:true,model:'native-cost-and-payout-model-not-60-fights'}));
