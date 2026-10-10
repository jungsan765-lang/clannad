'use strict';
// Native price/reward observations. The weekly section is a payout model, not 60 fights.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {setup,api,G}=require('./audit_balance_v01522.cjs');
const {fs,path,root,fresh}=require('../tests/helpers_v011.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
const OWNERS=['MOND_AMBER','MOND_DILUC','LIYUE_XIANGLING','LIYUE_ZHONGLI'];
function fixture(owner){const r=setup({level:60,team:[owner,'MOND_KAEYA','MOND_LISA'],gear:'none'});r.s.inventory=[];r.s.talents[owner]={na:1,e:1,q:1};return r;}
function sumCost(a,b){a.mora+=b.mora||0;for(const[id,n]of Object.entries(b.items||{}))a.items[id]=(a.items[id]||0)+n;return a;}
function characterCosts(owner){
 const r=fixture(owner),phases=[],ascensionTotal={mora:0,items:{}};
 for(let phase=0;phase<6;phase++){r.s.chars[owner].level=G.caps[phase];r.s.ascensions[owner]=phase;const d=r.ascensionInfo(owner);phases.push({phase,level:d.level,nextCap:d.nextCap,cost:copy(d.cost)});sumCost(ascensionTotal,d.cost);}
 r.s.chars[owner].level=60;r.s.ascensions[owner]=6;const talents={};
 for(const target of [8,10]){const total={mora:0,items:{}};for(let level=1;level<target;level++){r.s.talents[owner]={na:level,e:level,q:level};for(const kind of ['na','e','q'])sumCost(total,r.talentUpgradeInfo(owner,kind).cost);}talents[target]=total;}
 return {owner,rarity:r.rarityOf(owner),region:owner.startsWith('LIYUE_')?'LIYUE':'MOND',ascensionPhases:phases,ascensionTotal,newLevel55LastAscension:copy(phases[5].cost),threeTalentCosts:talents};
}
function entryFor(kind,level,region){
 const found=Object.entries(G.domains).find(([,s])=>s.kind===kind&&s.levels.includes(level)&&(!region||s.region===region));
 if(!found)throw Error('Missing native domain '+kind+':'+level+':'+region);
 const[key,s]=found;return {...copy(s),key,id:key+':'+level,version:4,level,...(kind==='ASCENSION'?{ascensionRewardVersion:G.ascensionRewardVersion}:{}),...(kind==='TALENT'?{talentRewardVersion:G.talentRewardVersion}:{}),...(kind==='EXP'?{expRewardVersion:G.expRewardVersion}:{})};
}
function weeklySupply({talentLevel=60,ascensionLevel=60,extraOnExperienceDays=false}={}){
 const r=fixture('MOND_AMBER'),baseDay=20000,counts={TALENT:0,ASCENSION:0,EXP:0},bonus={TALENT:0,ASCENSION:0},totals={items:{},xp:0,mora:0},runs=[],days=[];
 let day=baseDay;
 function payout(kind,origin){
  const level=kind==='TALENT'?talentLevel:kind==='ASCENSION'?ascensionLevel:5;
  const d=entryFor(kind,level),before=r.s.domainDaily.wins,reward=r.growthDomainRewards(d,kind==='ASCENSION'?'PYRO':'NEUTRAL',day);
  counts[kind]++;for(const[id,n]of Object.entries(reward.items))totals.items[id]=(totals.items[id]||0)+n;totals.xp+=reward.xp;totals.mora+=reward.mora;
  // Mirror finishBattle's existing material counter; EXP never consumes it.
  if(kind!=='EXP'){r.s.domainDaily.wins++;if(reward.bonus)bonus[kind]++;}
  runs.push({day:day-baseDay+1,kind,level,origin,bonus:reward.bonus,materialCounterBefore:before,materialCounterAfter:r.s.domainDaily.wins,items:copy(reward.items),xp:reward.xp,mora:reward.mora});
 }
 for(let i=0;i<7;i++){
  day=baseDay+i;r.s.domainDaily={day,wins:0};const start=runs.length,kind=['TALENT','ASCENSION','EXP'][i%3];
  for(let n=0;n<3;n++)payout(kind,'daily');
  if(extraOnExperienceDays&&kind==='EXP')for(let n=0;n<3;n++)payout(i===2?'TALENT':'ASCENSION','bonus-on-exp-day');
  if(i===6)for(const remainder of ['TALENT','ASCENSION','EXP'])while(counts[remainder]<20)payout(remainder,'weekly-remainder');
  const list=runs.slice(start),items={};for(const v of list)for(const[id,n]of Object.entries(v.items))items[id]=(items[id]||0)+n;
  days.push({day:i+1,dailyKind:kind,runs:list.length,counts:Object.fromEntries(['TALENT','ASCENSION','EXP'].map(k=>[k,list.filter(x=>x.kind===k).length])),materialBonusWins:list.filter(x=>x.bonus).length,items});
 }
 assert.equal(runs.length,60);for(const k of Object.keys(counts))assert.equal(counts[k],20);for(const d of days)assert(d.materialBonusWins<=3);
 return {talentLevel,ascensionLevel,extraOnExperienceDays,weeklyWins:counts,materialBonusWins:bonus,totalMaterialBonusWins:bonus.TALENT+bonus.ASCENSION,totals,days,runs};
}
function enhancementExpectation(target){const cfg=api.enhancementConfig;function expected(price){const delta=[0];let sum=0;for(let t=1;t<=target;t++){delta[t]=(price(t)+(cfg.down[t]/10000)*delta[t-1])/(cfg.success[t]/10000);sum+=delta[t];}return sum;}return {target,mora:expected(t=>cfg.mora[t]),items:Object.fromEntries(['ORE_IRON','ORE_WHITE_IRON','ORE_CRYSTAL'].map(id=>[id,expected(t=>cfg.ores[t][id]||0)])),ascensionFeeExcluded:target>10?copy(cfg.ascensionCost):null};}
function recipeBenchmarks(){
 const r=fresh(),prices=new Map();for(const s of r.rows('19_SHOP_STOCK_DB'))if(s[2]==='ITEM'&&s[5]>0&&!/SYSTEM_DISABLED|레거시|사용 금지/.test(s[8]||''))prices.set(s[3],Math.min(prices.get(s[3])??Infinity,s[5]));
 const forge=['REC_SWORD_RANCOUR','REC_SWORD_IRON_STING','REC_CLAYMORE_WHITEBLIND','REC_CLAYMORE_ARCHAIC','REC_POLEARM_STARGITTER','REC_POLEARM_CRESCENT','REC_BOW_CRESCENT','REC_CATALYST_MAPPA','REC_CATALYST_AMBER','REC_ARMOR_IRON'];
 const cook=['REC_FOOD_STEAK','REC_FOOD_CHICKEN_SKEWER','REC_FOOD_MOND_GRILLED_FISH','REC_FOOD_RADISH_SOUP','REC_FOOD_MINT_JELLY','REC_FOOD_SWEET_MADAME','REC_FOOD_MORA_MEAT','REC_FOOD_STIR_FRIED_FILET','REC_FOOD_LOTUS_EGG_SOUP','REC_FOOD_ALMOND_TOFU'];
 return [...forge,...cook].map(id=>{const recipe=r.recipeDefinition(id),cost=r.recipeCost(recipe),priced=Object.entries(cost.items).map(([item,count])=>({item,count,npcCatalogMinPrice:prices.get(item)??null}));return {id,kind:forge.includes(id)?'forge':'cook',result:recipe[3],output:recipe[4],nativeCost:copy(cost),ingredients:priced,allIngredientsNpcCost:priced.some(x=>x.npcCatalogMinPrice===null)?null:cost.mora+priced.reduce((n,x)=>n+x.count*x.npcCatalogMinPrice,0),unlock:recipe[18],worldTime:recipe[19]};});
}
function audit(){
 const characters=OWNERS.map(characterCosts),gear=[3,6,10,12].map(enhancementExpectation),gear10=gear.find(x=>x.target===10).mora*3;
 for(const x of characters)x.moraBudget={fullAscensionTalent8Gear3At10:x.ascensionTotal.mora+x.threeTalentCosts[8].mora+gear10,new55AscensionTalent8Gear3At10:x.newLevel55LastAscension.mora+x.threeTalentCosts[8].mora+gear10,excludes:'crafting, item purchases/conversions, travel, recovery, story and opportunity costs'};
 const weekly=[];for(const[talentLevel,ascensionLevel]of [[5,5],[25,25],[25,60],[60,60]])for(const extraOnExperienceDays of [false,true]){const model=weeklySupply({talentLevel,ascensionLevel,extraOnExperienceDays});delete model.runs;weekly.push(model);}
 const r=fixture('MOND_AMBER'),nativeRewards=[];for(const[kind,levels]of Object.entries({TALENT:[5,10,15,20,25,30,35,40,45,50,55,60],ASCENSION:[5,10,15,20,25,30,35,40,45,50,55,60],EXP:[5,10,15,20,25,30,35,40,45,50,55,60]}))for(const level of levels){const d=entryFor(kind,level);r.s.domainDaily={day:20000,wins:0};const first=r.growthDomainRewards(d,kind==='ASCENSION'?'PYRO':'NEUTRAL',20000);r.s.domainDaily.wins=3;const normal=r.growthDomainRewards(d,kind==='ASCENSION'?'PYRO':'NEUTRAL',20000);nativeRewards.push({kind,level,region:d.region,first:copy(first),normal:copy(normal)});}
 return {schema:1,version:require('../package.json').version,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'source/runtime_growth_v01522.js'))).digest('hex'),scope:'Native costs and payout model for the three weekly 20-win domain subgoals. No actual 60-fight combat/timing simulation, no real account or server was changed. These 60 payouts are a subset of all weekly branches, whose minimum workload is 140 victories.',assumptions:['Daily 3 wins rotate TALENT -> ASCENSION -> EXP over seven Korean days.','The TALENT/ASCENSION/EXP 20-win subgoals include daily wins; this subset totals 60 payouts, not 81. It is not the entire weekly board: all weekly branches require at least 140 victories.','The first three material wins are shared per day. EXP does not consume them.','Leftover weekly wins settle on day seven. An alternate model adds three material wins on each EXP day.','MOND books and LIYUE books are separate. Current marker-two highest talent payouts are MOND level25 (32 base books) and LIYUE level60 (80).','Current own-element ASCENSION subset uses PYRO; all eight elements use the same stage quantities and phase costs, while enemy patterns and time differ. This is not a universal gem-rate or full-week forecast.','Books/gems are inventory supplies, not cloned separately for four participants.'],characters,enhancement:gear,weeklySupplyModels:weekly,nativeDomainRewards:nativeRewards,unchangedXpCurve:{pacingVersion:G.pacingVersion,curve:copy(G.pacingCurve),expDomainXp:copy(G.domainXp),materialDomainXp:copy(G.domainMaterialXp)},recipeBenchmarks:recipeBenchmarks(),recipeCostLimits:'Minimum listed NPC ingredient prices include other regions and locked stocks. Missing NPC ingredients stay null; no invented market price or replacement-cash total. Native recipe costs are fees/material quantities and not crafting sale-profit claims.'};
}
if(require.main===module){const report=audit(),dest=path.join(root,'docs/data/task_materials_v'+report.version.replace(/\./g,'')+'.json'),check=process.argv.includes('--check');if(check)assert.deepEqual(report,JSON.parse(fs.readFileSync(dest,'utf8')),'published audit must match the current native rules');else{fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify({file:dest,version:report.version,characters:report.characters.length,weeklyModels:report.weeklySupplyModels.length,nativeRewardRows:report.nativeDomainRewards.length,recipes:report.recipeBenchmarks.length,mode:check?'read-only-report-check':'payout-model-not-native-fights'}));}
module.exports={audit,fixture,characterCosts,entryFor,weeklySupply,enhancementExpectation};
