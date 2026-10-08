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
check('native six-phase demands are 441/882 gems with unchanged Mora and other materials',()=>{
 for(const[owner,rarity]of [['MOND_AMBER',4],['MOND_DILUC',5],['LIYUE_XIANGLING',4],['LIYUE_ZHONGLI',5]]){const x=characterCosts(owner),mult=rarity===5?2:1;assert.equal(x.rarity,rarity);assert.deepEqual(x.ascensionPhases.map(p=>Object.entries(p.cost.items).find(([k])=>k.startsWith('GROWTH_GEM_'))[1]),[3,6,12,40,80,300].map(n=>n*mult));assert.equal(Object.entries(x.ascensionTotal.items).find(([k])=>k.startsWith('GROWTH_GEM_'))[1],441*mult);assert.equal(x.ascensionTotal.mora,rarity===5?167760:93200);assert.equal(x.newLevel55LastAscension.mora,rarity===5?75600:42000);}
});
check('native talent book totals preserve MOND 168/270 and increase LIYUE to 336/540',()=>{
 for(const owner of ['MOND_AMBER','MOND_DILUC','LIYUE_XIANGLING','LIYUE_ZHONGLI']){const x=characterCosts(owner),key=owner.startsWith('LIYUE_')?'GROWTH_TALENT_LIYUE':'GROWTH_TALENT_MOND',mult=owner.startsWith('LIYUE_')?2:1;assert.equal(x.threeTalentCosts[8].items[key],168*mult);assert.equal(x.threeTalentCosts[10].items[key],270*mult);assert.equal(x.threeTalentCosts[8].items.MAT_SLIME_SECRETIONS,15);assert.equal(x.threeTalentCosts[8].items.MAT_SLIME_CONCENTRATE,30);assert.equal(x.threeTalentCosts[10].items.MAT_SLIME_CONCENTRATE,57);assert.equal(x.threeTalentCosts[8].mora,x.rarity===5?157500:105000);}
});
check('299/599 final ascension gems reject atomically; 300/600 spend exactly once and survive reload',()=>{
 for(const[owner,need]of [['MOND_AMBER',300],['MOND_DILUC',600]]){let r=fixture(owner);r.s.chars[owner].level=55;r.s.chars[owner].xp=0;r.s.ascensions[owner]=5;const d=r.ascensionInfo(owner),gem=Object.keys(d.cost.items).find(k=>k.startsWith('GROWTH_GEM_'));assert.equal(d.cost.items[gem],need);ready(r,d.cost);r.s.inventory.find(v=>v.item===gem).quantity=need-1;reject(r,'CHAR_ASCEND',{owner});r.giveItem(gem,1);const money=r.s.global.MORA;once(r,'CHAR_ASCEND',{owner});assert.equal(r.s.global.MORA,money-d.cost.mora);for(const id of Object.keys(d.cost.items))assert.equal(r.itemCount(id),0,id);assert.equal(r.growth(owner).phase,6);assert.equal(r.growth(owner).cap,60);r=restore(r);assert.equal(r.growth(owner).phase,6);assert.equal(r.s.global.MORA,123);reject(r,'CHAR_ASCEND',{owner});}
});
check('first MOND talent consumes 2 books and LIYUE consumes 4; missing one book rejects atomically',()=>{
 for(const[owner,key,need]of [['MOND_AMBER','GROWTH_TALENT_MOND',2],['LIYUE_XIANGLING','GROWTH_TALENT_LIYUE',4]]){let r=fixture(owner),d=r.talentUpgradeInfo(owner,'na');assert.equal(d.cost.items[key],need);ready(r,d.cost);r.s.inventory.find(v=>v.item===key).quantity=need-1;reject(r,'TALENT_UPGRADE',{owner,kind:'na'});r.giveItem(key,1);once(r,'TALENT_UPGRADE',{owner,kind:'na'});assert.equal(r.itemCount(key),0);assert.equal(r.s.global.MORA,123);assert.equal(r.talentLevels(owner).base.na,2);r=restore(r);assert.equal(r.talentLevels(owner).base.na,2);}
});
check('native three-talent upgrades to 8 pay the exact regional totals and preserve trained saves',()=>{
 for(const owner of ['MOND_AMBER','LIYUE_XIANGLING']){let r=fixture(owner),cost=characterCosts(owner).threeTalentCosts[8];ready(r,cost);for(let target=2;target<=8;target++)for(const kind of ['na','e','q'])once(r,'TALENT_UPGRADE',{owner,kind});assert.deepEqual(copy(r.talentLevels(owner).base),{na:8,e:8,q:8});assert.equal(r.s.global.MORA,123);for(const id of Object.keys(cost.items))assert.equal(r.itemCount(id),0);const saved=r.serialize();r=restore(r);assert.equal(r.serialize(),saved,'price change does not retroactively charge existing talents/ascensions');assert.equal(r.growth(owner).phase,6);}
});
check('weekly daily overlap is 60 payouts; EXP never spends the shared material bonus',()=>{
 for(const extra of [false,true]){const m=weeklySupply({talentLevel:60,ascensionLevel:60,extraOnExperienceDays:extra});assert.equal(m.runs.length,60);assert.deepEqual(m.weeklyWins,{TALENT:20,ASCENSION:20,EXP:20});assert.deepEqual(m.materialBonusWins,extra?{TALENT:12,ASCENSION:9}:{TALENT:9,ASCENSION:6});assert.equal(m.totalMaterialBonusWins,extra?21:15);for(const day of m.days)assert(day.materialBonusWins<=3);for(const v of m.runs.filter(v=>v.kind==='EXP')){assert.equal(v.materialCounterAfter,v.materialCounterBefore);assert.equal(v.bonus,false);assert.deepEqual(v.items,{});}assert.equal(m.totals.items.GROWTH_TALENT_LIYUE,extra?384:348);assert.equal(m.totals.items.GROWTH_GEM_PYRO,extra?928:832);assert.equal(m.totals.mora,0);}
});
check('early gems and talent books stay unchanged while the highest ascension stage pays 32 gems without cloning books',()=>{
 for(const[t,a,plain,boosted]of [[5,5,[29,26],[32,29]],[25,25,[145,130],[160,145]],[25,60,[145,832],[160,928]]])for(const extra of [false,true]){const m=weeklySupply({talentLevel:t,ascensionLevel:a,extraOnExperienceDays:extra}),expected=extra?boosted:plain;assert.equal(m.totals.items.GROWTH_TALENT_MOND,expected[0]);assert.equal(m.totals.items.GROWTH_GEM_PYRO,expected[1]);assert(!m.totals.items.MAT_CHAR_EXP_HERO);}
});
check('material-domain XP, talent payouts and the entire XP curve remain the existing 0.16.8 tables',()=>{
 const expectedExp={5:200,10:450,15:1000,20:1100,25:1250,30:1500,35:1800,40:2100,45:4500,50:5400,55:8000,60:10000};assert.deepEqual(copy(G.domainXp),expectedExp);assert.deepEqual(copy(G.domainMaterialXp),{5:40,10:90,15:90,20:220,25:220,30:360,35:360,40:500,45:500,50:900,55:900,60:1600});assert.equal(G.pacingVersion,3);
 assert.deepEqual(copy(G.pacingCurve),[80,150,250,380,520,660,820,1000,1170,2080,2170,2250,2340,2410,2510,2580,2680,2750,2830,9300,9680,10050,10420,10800,11160,11550,11920,12290,12660,55530,57760,59970,62190,64420,66640,68860,71070,73300,75520,105650,105670,105690,105720,105740,105760,105780,105810,105830,105850,189000,189950,190890,191840,192780,193730,194670,195620,196560,197510,0]);
 const r=fixture('MOND_AMBER');for(const[level,amount]of [[5,1],[25,5],[60,12]]){const d=entryFor('TALENT',level),key=d.region==='몬드'?'GROWTH_TALENT_MOND':'GROWTH_TALENT_LIYUE';r.s.domainDaily={day:20000,wins:0};assert.equal(r.growthDomainRewards(d,'NEUTRAL',20000).items[key],2*amount);r.s.domainDaily.wins=3;assert.equal(r.growthDomainRewards(d,'NEUTRAL',20000).items[key],amount);}
 const report=audit();assert.equal(report.weeklySupplyModels.length,8);assert.equal(report.recipeBenchmarks.length,20);assert.equal(report.nativeDomainRewards.length,36);assert(report.scope.includes('No actual 60-fight'));
});
console.log(JSON.stringify({version:'0.16.9',checks,ok:true,model:'native-cost-and-payout-model-not-60-fights'}));
