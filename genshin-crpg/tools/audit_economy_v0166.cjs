'use strict';
// Read-only economy audit. Prices and costs come from the checked-out runtime;
// no resource clock, save, market rule or reward is changed by this script.
const {fresh,c,fs,path,root}=require('../tests/helpers_v011.cjs');
const {setup,G}=require('./audit_balance_v01522.cjs');
const api=c.CRPGRuntime,copy=x=>JSON.parse(JSON.stringify(x));
function add(a,b,n=1){for(const [k,v]of Object.entries(b))a[k]=(a[k]||0)+v*n;return a;}
function expected(quotes,target,ascension){
 let stepMora=0,stepItems={},mora=0,items={};
 for(let n=1;n<=target;n++){
  const q=quotes[n],success=q.success/10000,down=q.down/10000;
  // A down result requires the previous upgrade again; holds repeat this attempt.
  stepMora=(q.cost.mora+down*stepMora)/success;
  const next=add(copy(q.cost.items),stepItems,down);for(const k of Object.keys(next))next[k]/=success;
  stepItems=next;mora+=stepMora;add(items,stepItems);
 }
 if(target>10){mora+=ascension.mora;add(items,ascension.items);}
 return {mora,items};
}
function enhancement(){
 const r=fresh(),slot=r.giveEquipment('EQ_SWORD_RANCOUR'),inv=r.s.inventory.find(x=>x.slot===slot),quotes={};
 inv.enhancementCap=12;
 for(let n=1;n<=12;n++){inv.enhance=n-1;quotes[n]=r.enhancementQuote(slot);}
 inv.enhance=10;const ascension=r.enhancementQuote(slot,'ASCEND').cost;
 const oldMora=[0,80,120,180,260,380,550,800,1100,1500,2000,2800,4000];
 const old=Object.fromEntries(Object.entries(quotes).map(([n,q])=>[n,{...q,cost:{...q.cost,mora:oldMora[n]}}]));
 return {quotes,ascension,expectations:[3,6,10,12].map(target=>({target,oldMora:expected(old,target,ascension).mora,...expected(quotes,target,ascension),newMora:expected(quotes,target,ascension).mora}))};
}
function investment(enh){
 const r=setup({level:55,team:['MOND_AMBER','MOND_DILUC','MOND_KAEYA'],gear:'none'}),out=[];
 const wealth=api.leyLines.tiers.at(-1),bookXp=Object.entries(wealth.books).reduce((n,[id,count])=>n+api.leyLines.bookXp[id]*count,0);
 const xp55to60=Array.from({length:5},(_,i)=>G.xpNext(i+55)).reduce((a,b)=>a+b,0),xp1to60=G.pacingCurve.reduce((a,b)=>a+b,0);
 r.s.domainDaily={day:G.dayOf(Date.now()),wins:3};
 for(const character of ['MOND_AMBER','MOND_DILUC'])for(const [target,talentTarget]of [[10,8],[12,10]]){
  r.s.chars[character].level=55;r.s.ascensions[character]=5;
  const finalAscCost=copy(r.ascensionInfo(character).cost),talentCost={mora:0,items:{}};
  r.s.chars[character].level=60;r.s.ascensions[character]=6;
  for(const kind of ['na','e','q'])for(let level=1;level<talentTarget;level++){
   (r.s.talents[character]??={})[kind]=level;const cost=r.talentUpgradeInfo(character,kind).cost;
   talentCost.mora+=cost.mora;add(talentCost.items,cost.items);
  }
  const gear=expected(enh.quotes,target,enh.ascension),expectedMora=3*gear.mora+talentCost.mora+finalAscCost.mora;
  const ascSite=r.growthDomainSites().find(x=>x.kind==='ASCENSION'&&x.levels.includes(60)),talSite=r.growthDomainSites().find(x=>x.kind==='TALENT'&&x.region==='몬드');
  const material=(site,item,need)=>{const level=Math.max(...site.levels),d=r.growthDomainEntries(site.map).find(x=>x.level===level&&x.key===site.key),reward=r.growthDomainRewards(d,'PYRO');return {id:d.id,perClear:reward.items[item],clears:Math.ceil(need/reward.items[item])};};
  out.push({character,rarity:r.rarityOf(character),startingLevel:55,startingPhase:5,gearItems:3,enhancement:target,talentTarget,expectedMora,expectedEnhancementOres:add({},gear.items,3),talentBooks:talentCost.items.GROWTH_TALENT_MOND,talentCost,finalAscMora:finalAscCost.mora,finalAscCost,xp55to60,xp1to60,revelationTier5Claims:Math.ceil(xp55to60/bookXp),wealthTier5Claims:Math.ceil(expectedMora/wealth.mora),materialDomainsWithoutDailyBonus:{ascension:material(ascSite,'GROWTH_GEM_PYRO',finalAscCost.items.GROWTH_GEM_PYRO),talent:material(talSite,'GROWTH_TALENT_MOND',talentCost.items.GROWTH_TALENT_MOND)},assumptions:'Lv60-account catch-up starts at Lv55 phase5; prior ascensions are not charged. Three new +0 pieces, no stocks, gifts, discounts or trade; forging/artifact costs and travel are extra. Shared first-three material bonuses are excluded.'});
 }
 return out;
}
function mining(r){
 const maps=r.rows('32_MAP_DB').filter(x=>['몬드','리월'].includes(x[1])&&r.lifePool('MINE',x[0]).length),limit=api.lifeCatalog.kinds.MINE.limit,items={};
 for(const map of maps){const pool=r.lifePool('MINE',map[0]),weight=pool.reduce((n,x)=>n+x.weight,0);for(const x of pool){const perVein=x.item==='ORE_IRON'?2.5:x.item==='ORE_CRYSTAL'?1:1.5;items[x.item]=(items[x.item]||0)+limit*2.5*x.weight/weight*perVein;}}
 return {mines:maps.length,mapIds:maps.map(x=>x[0]),circuit:{tries:maps.length*limit,maxSceneSeconds:maps.length*limit*api.lifeScene.limits.MINE/1000,expectedItems:items},note:'Analytic full-vein collection expectation. Six existing attempts per map per WORLD_DAY; early completion is allowed. Maximum scene duration is not mandatory playtime. Excludes companion bonuses and travel.'};
}
function catalog(r){
 const stocks=r.rows('19_SHOP_STOCK_DB').filter(x=>!/SYSTEM_DISABLED|레거시|사용 금지/.test(x[8]||'')),recipes=r.rows('17_RECIPE_DB'),prices=new Map(),violations=[];
 const key=(kind,id)=>kind+':'+id;
 for(const row of stocks)if(['ITEM','EQUIP'].includes(row[2])&&Number(row[5])>0){const k=key(row[2],row[3]);prices.set(k,Math.min(prices.get(k)??Infinity,Number(row[5])));}
 const definitions=recipes.map(row=>({row,cost:r.recipeCost(row)}));
 let iterations=0,changed=true;while(changed&&iterations++<=recipes.length){changed=false;for(const {row,cost}of definitions){const value=cost.mora+Object.entries(cost.items).reduce((n,[id,count])=>n+(prices.get(key('ITEM',id))??Infinity)*count,0),unit=value/Number(row[4]),k=key(row[2],row[3]);if(unit<(prices.get(k)??Infinity)){prices.set(k,unit);changed=true;}}}
 for(const [k,buy]of prices){const [kind,id]=k.split(':'),sell=r.saleUnitPrice(kind==='EQUIP'?{equip:id}:{item:id});if(sell>buy+1e-8)violations.push({kind,id,buy,sell});}
 const rewards=r.rows('22_QUEST_DB').flatMap(row=>{try{if(typeof row[11]!=='string'||!row[11].trim().startsWith('{'))return [];return [{id:row[0],commission:r.isCommission(row[0]),reward:JSON.parse(row[11])}];}catch{return [];}}),commissions=rewards.filter(x=>x.commission);
 return {enabledStockRows:stocks.length,recipeRows:recipes.length,pricedAcquisitionRoutes:prices.size,relaxationIterations:iterations,npcBuyCraftResaleArbitrage:violations,questRewardDefinitions:rewards.length,commissionDefinitions:commissions.length,commissionBaseMora:commissions.reduce((n,x)=>n+(Number(x.reward.mora)||0),0),tradeRules:copy(api.tradeRules),limitations:'Static catalog includes future regions and conditional recipes; unavailable routes are a conservative price lower bound. No live player prices, stockpiles, population or continuous field farming assumptions.'};
}
function audit(){const r=fresh(),enh=enhancement();return {schema:1,version:'0.16.6',method:'Native cost quotes and analytic expectation; observational only',enhancement:enh.expectations,investment:investment(enh),...mining(r),catalog:catalog(r),leyLines:{tiers:copy(api.leyLines.tiers),hourMs:api.leyLines.hourMs,bookXp:copy(api.leyLines.bookXp)},policy:'Existing WORLD_DAY resource/shop refills and repeat travel/combat/rest remain unchanged. No new real-calendar resource limits or quest admission locks.'};}
if(require.main===module){const report=audit(),dest=path.join(root,'evidence/balance-audit-v0166/economy_v0166.json');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
module.exports={audit,expected,enhancement,investment,mining,catalog};
