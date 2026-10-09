'use strict';
// Native read-only QA. Run only after the numeric proposal has been selected.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../../..'),args=process.argv.slice(2),option=n=>args.includes(n)?args[args.indexOf(n)+1]:undefined;
if(args.includes('--help')){console.log('node verify_after_economy.cjs --source-root /path/to/genshin-crpg --out-dir /path/to/results');process.exit(0);}
const sourceRoot=path.resolve(option('--source-root')||root),outDir=path.resolve(option('--out-dir')||path.join(__dirname,'after'));
fs.mkdirSync(outDir,{recursive:true});
execFileSync(process.execPath,[path.join(__dirname,'audit_catalog.cjs'),'--source-root',sourceRoot,'--out',path.join(outDir,'catalog_after.json')],{stdio:'inherit'});
execFileSync(process.execPath,[path.join(root,'tools/audit_food_supply_v01617.cjs'),'--runtime-root',sourceRoot,'--samples','32','--no-campaigns','--out',path.join(outDir,'supply_after.json')],{stdio:'inherit'});
const before=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'catalog_baseline.json.gz')))),after=JSON.parse(fs.readFileSync(path.join(outDir,'catalog_after.json'))),supply=JSON.parse(fs.readFileSync(path.join(outDir,'supply_after.json'))),checks=[],comparisons=[];
function check(name,ok,detail){checks.push({name,passed:!!ok,detail});}
check('same existing recovery food IDs',JSON.stringify(before.foods.map(x=>x.food).sort())===JSON.stringify(after.foods.map(x=>x.food).sort()));
const oldFood=Object.fromEntries(before.foods.map(x=>[x.food,x]));
for(const f of after.foods){const old=oldFood[f.food],ingredients=x=>x.ingredients.map(i=>[i.id,i.n]);
 check(f.food+' ingredients and output retained',JSON.stringify(ingredients(f))===JSON.stringify(ingredients(old))&&f.output===old.output);
 check(f.food+' NPC resale retained',f.npcSaleMora===old.npcSaleMora,{before:old.npcSaleMora,after:f.npcSaleMora});
 check(f.food+' trade policy retained',JSON.stringify(f.trade)===JSON.stringify(old.trade));
 const material=x=>x.ingredients.reduce((n,i)=>n+i.saleOpportunity,0);
 comparisons.push({food:f.food,name:f.name,before:{heal:old.baseHealing,fee:old.fee,materialOpportunity:material(old),totalOpportunity:old.fee+material(old),npcSale:old.npcSaleMora},after:{heal:f.baseHealing,fee:f.fee,materialOpportunity:material(f),totalOpportunity:f.fee+material(f),npcSale:f.npcSaleMora},readyStocks:f.readyStocks.filter(s=>s.enabled).map(s=>{const oldStock=old.readyStocks.find(x=>x.stock===s.stock);return{stock:s.stock,beforePrice:oldStock.price,afterPrice:s.price,ratioPreservingMinimum:Math.ceil(oldStock.price*f.baseHealing/old.baseHealing),oldHealingMora:oldStock.price/old.baseHealing,newHealingMora:s.price/f.baseHealing};})});
 for(const s of f.readyStocks.filter(s=>s.enabled)){const oldStock=old.readyStocks.find(x=>x.stock===s.stock);check(s.stock+' preserves previous purchased-healing Mora per HP',s.price+1e-10>=oldStock.price*f.baseHealing/old.baseHealing);check(s.stock+' quantity/restock/condition retained',s.quantity===oldStock.quantity&&s.period===oldStock.period&&s.condition===oldStock.condition);}
}
for(const b of after.budgets){const old=before.budgets.find(x=>x.level===b.level&&x.loss===b.loss);check('Lv'+b.level+' loss'+b.loss+' inn target quote retained',JSON.stringify(b.inn)===JSON.stringify(old.inn));check('Lv'+b.level+' loss'+b.loss+' native HP retained',JSON.stringify(b.hp)===JSON.stringify(old.hp));}
check('trade rules retained',JSON.stringify(after.market)===JSON.stringify(before.market));
check('no NPC purchase/craft/resale arbitrage',supply.economy.violations.length===0,supply.economy.violations);
const a=require(path.join(root,'tools/audit_food_lodging_v01617.cjs')),env=a.loadEnvironment(sourceRoot),receipts=[];
for(const f of after.foods)for(const s of f.readyStocks.filter(x=>x.enabled)){
 const r=a.setup(env,{levels:60}),entry=r.placeCatalog().find(x=>x.merchant===s.merchant&&x.modes.includes('SHOP'));
 assert(entry,'Real food shop must exist: '+s.stock);r.s.global.CURRENT_MAP_ID=entry.maps[0];r.s.global.WORLD_TIME='12:00';r.s.placeVisit=null;
 r.action('PLACE_ENTER',{place:entry.id,mode:'SHOP'});const wallet=r.s.global.MORA,count=r.itemCount(f.food),buy=r.action('BUY',{stock:s.stock,quantity:1}).result;
 check(s.stock+' actual BUY matches quote',buy.cost===s.price&&wallet-r.s.global.MORA===s.price&&r.itemCount(f.food)===count+1,buy);
 const beforeSell=r.s.global.MORA,sell=r.action('SELL',{item:f.food,quantity:1,variant:'NORMAL'}).result;
 check(s.stock+' actual SELL keeps previous cash value',sell.mora===oldFood[f.food].npcSaleMora&&r.s.global.MORA-beforeSell===sell.mora,sell);
 receipts.push({stock:s.stock,syntheticAlreadyAtShop:true,entry:entry.id,buy,sell});
}
const fresh=new env.R(env.db);fresh.newGame({name:'경제 시작 지급 검사',route:'ROUTE_TRAVELER',seed:717,saveId:'FOOD-ECONOMY-STARTER-ONCE'});
const gift=Object.fromEntries(['FOOD_SWEET_MADAME','FOOD_HASH_BROWN'].map(id=>[id,fresh.itemCount(id)]));fresh.grantStarterKit();fresh.grantStarterKit();
check('starter meals retain two plus two once',gift.FOOD_SWEET_MADAME===2&&gift.FOOD_HASH_BROWN===2&&Object.entries(gift).every(([id,n])=>fresh.itemCount(id)===n),gift);
const result={schema:1,version:after.snapshot.packageVersion,sourceDigest:after.snapshot.loadedSourceDigest,dbSha256:after.snapshot.dbSha256,beforeVersion:before.snapshot.packageVersion,assumptions:{noProductWrites:true,nativeActions:'Existing BUY and SELL at actual food shop; initial ownership/wallet/level/map/time are stated synthetic setup. No real server or account.',noLiveMarketQuotes:true,priceCheck:'Only before-listed prepared recovery foods; no claim that every player should buy them. Market commission unchanged.',collection:'384 real LIFE scene samples; already-at-map perfect scene timing excludes travel/human latency and encounter settlement.'},comparisons,checks,counts:{checks:checks.length,passed:checks.filter(x=>x.passed).length,failed:checks.filter(x=>!x.passed).length,nativeReadyFoodBuys:receipts.length,nativeReadyFoodSales:receipts.length,resourceSamples:supply.counts.resourceSamples,npcArbitrageViolations:supply.economy.violations.length},receipts};
fs.writeFileSync(path.join(outDir,'economy_after_checks.json'),JSON.stringify(result,null,2)+'\n');
const raw=fs.readFileSync(path.join(outDir,'catalog_after.json'));fs.writeFileSync(path.join(outDir,'catalog_after.json.gz'),zlib.gzipSync(raw,{level:9}));
console.log(JSON.stringify(result.counts));assert.equal(result.counts.failed,0,'Economy coupling assertions must pass; inspect saved failures.');
