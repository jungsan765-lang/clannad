'use strict';
// Catalog/supply audit; no live account or server access. Run with --out <path>.
const {fresh,fs,path,root,c}=require('../tests/helpers_v011.cjs');
const crypto=require('node:crypto'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const copy=x=>JSON.parse(JSON.stringify(x));
const r=fresh(),regions=new Set(['몬드','리월']);
const active=s=>s[2]==='ITEM'&&!/SYSTEM_DISABLED|레거시|사용 금지/.test(String(s[8]||''));
const allStocks=r.rows('19_SHOP_STOCK_DB'),items=r.tables['14_ITEM_DB'];
const merchants=r.tables['18_MERCHANT_DB'];
const currentMerchants=new Set(r.placeCatalog().filter(p=>p.maps.some(m=>regions.has(r.row('32_MAP_DB',m)[1]))).flatMap(p=>r.placeStockMerchants(p)));
const fieldSources={};
for(const m of r.rows('32_MAP_DB'))for(const kind of ['GATHER','HUNT','FISH','MINE'])for(const p of r.lifePool(kind,m[0]))(fieldSources[p.item]??=[]).push({map:m[0],region:m[1],kind,...copy(p)});
const recipes=r.rows('17_RECIPE_DB').filter(q=>q[2]==='ITEM'&&!/사용 금지|레거시/.test(String(q[18]))).map(q=>({id:q[0],item:q[3],cost:copy(r.recipeCost(q)),output:Number(q[4]),kind:q[1]}));
function closure(seed){
 const result=new Set(seed);let progress=true;
 while(progress){progress=false;for(const q of recipes)if(!result.has(q.item)&&Object.keys(q.cost.items).every(id=>result.has(id))){result.add(q.item);progress=true;}}
 return result;
}
function coverage(stocks,{includeFields=false,currentOnly=false}={}){
 const base=stocks.filter(active).filter(s=>!currentOnly||currentMerchants.has(s[1])).map(s=>s[3]);
 if(includeFields)for(const [id,src]of Object.entries(fieldSources))if(!currentOnly||src.some(s=>regions.has(s.region)))base.push(id);
 return closure(base);
}
const purchased=coverage(allStocks),currentPurchased=coverage(allStocks,{currentOnly:true});
const fullSupply=coverage(allStocks,{includeFields:true,currentOnly:true});
const fieldIngredients=new Set(c.CRPGRuntime.economyV0148.fieldIngredientAssortment);
const foods=r.rows('17_RECIPE_DB').filter(q=>items.get(q[3])?.[2]==='음식').map(raw=>{
 const q=r.recipeDefinition(raw[0]),cost=copy(r.recipeCost(q));const legacy=/사용 금지|레거시/.test(String(q[18]));
 return {recipe:q[0],food:q[3],name:items.get(q[3])[1],legacy,recovery:Number(items.get(q[3])[8])>0,cost,
  fieldIngredients:Object.keys(cost.items).filter(id=>fieldIngredients.has(id)),
  noFieldPurchaseAndProcess:Object.keys(cost.items).every(id=>purchased.has(id)),
  noFieldCurrentPurchaseAndProcess:Object.keys(cost.items).every(id=>currentPurchased.has(id)),
  noCurrentSupply:Object.keys(cost.items).filter(id=>!fullSupply.has(id)),
  readyMealStocks:allStocks.filter(s=>active(s)&&s[3]===q[3]).map(s=>({id:s[0],merchant:s[1],price:s[5],stock:s[6],period:s[7]}))};
});
const removed=allStocks.filter(s=>s[2]==='ITEM'&&fieldIngredients.has(s[3])).map(s=>({id:s[0],merchant:s[1],merchantName:merchants.get(s[1])?.[1],item:s[3],name:s[4],oldUnitPrice:s[5],oldStock:s[6],period:s[7],condition:s[8],preservedNpcSale:r.saleUnitPrice({item:s[3]}),currentFieldSources:(fieldSources[s[3]]||[]).filter(p=>regions.has(p.region))}));
const imported=allStocks.filter(s=>s[0].startsWith('STK_MOND_IMPORT_')).map(s=>({id:s[0],item:s[3],name:s[4],price:s[5],stock:s[6],period:s[7],currentFieldSources:(fieldSources[s[3]]||[]).filter(p=>regions.has(p.region))}));
const growthStocks=allStocks.filter(active).filter(s=>/GROWTH_GEM_|MAT_FB_|TRPG_BOSS_ESSENCE/.test(s[3]));
const activeFoods=foods.filter(q=>!q.legacy),recoveryFoods=activeFoods.filter(q=>q.recovery);
function nativeImportBulk(){
 const runtime=fresh();runtime.s.global.MORA=10000;const before=runtime.s.global.MORA,initialDay=runtime.s.global.WORLD_DAY,actions=[];
 const stock='STK_MOND_IMPORT_JUEYUN_CHILI',act=(type,args={})=>{const result=copy(runtime.action(type,args).result);actions.push({type,...args,result,day:runtime.s.global.WORLD_DAY,time:runtime.s.global.WORLD_TIME});return result;};
 act('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_GENERAL',mode:'SHOP'});
 for(let n=0;n<6;n++){
  while(!runtime.stockRemaining(runtime.row('19_SHOP_STOCK_DB',stock)))act('WAIT',{minutes:1440});
  act('BUY',{stock,quantity:2});
 }
 return {quantity:runtime.itemCount('MAT_LIYUE_JUEYUN_CHILI'),mora:before-runtime.s.global.MORA,worldDaysWait:runtime.s.global.WORLD_DAY-initialDay,waitActions:actions.filter(a=>a.type==='WAIT').length,purchaseActions:actions.filter(a=>a.type==='BUY').length,actionCount:actions.length,inputSecondsAssumingThreeSecondsPerAction:actions.length*3,travelExcluded:true,syntheticFunding:10000,notClaimedSlowerThanHarvest:true,actions};
}
const data={schema:1,version:JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version,
 sourceFingerprint:{dbSha256:sha(fs.readFileSync(path.join(root,'content/db.json'))),economySha256:sha(fs.readFileSync(path.join(root,'source/runtime_economy_v0148.js'))),toolSha256:sha(fs.readFileSync(__filename)),loadedRuntimeDigest:sha(JSON.stringify(Array.from(fs.readFileSync(path.join(root,'source/index.html'),'utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g),m=>[m[1],sha(fs.readFileSync(path.join(root,'source',m[1])))])))},
 assumptions:['Names are stored CRPG labels, not a claim of official Korean naming.','All 108 food recipe rows are counted, including 2 disabled legacy examples.','Purchase-and-process closure includes future catalog shops as a conservative buying upper bound; current-only closure uses Mondstadt/Liyue merchant facilities.','Ingredient coverage does not imply recipes are already owned or story-unlocked.','Available ready meals remain convenience purchases; buying a finished meal does not become crafting/harvesting progress.','WORLD_DAY WAIT remains unchanged and can restock fallback specialties quickly.','All blocked ingredient IDs have a real current-region resource pool; resource mini-games are independently replayed by native food-supply audit.'],
 counts:{itemStockRows:allStocks.filter(s=>s[2]==='ITEM').length,removedStockRows:removed.length,actualRemovedIngredients:new Set(removed.map(s=>s.item)).size,blockedPolicyIngredients:fieldIngredients.size,foodRecipeRows:foods.length,legacyFoodRecipeRows:foods.filter(q=>q.legacy).length,activeFoodRecipes:activeFoods.length,requiresNonpurchaseIngredient:activeFoods.filter(q=>!q.noFieldPurchaseAndProcess).length,recoveryFoodRecipes:recoveryFoods.length,recoveryRequiresNonpurchaseIngredient:recoveryFoods.filter(q=>!q.noFieldPurchaseAndProcess).length,noCurrentSupply:activeFoods.filter(q=>q.noCurrentSupply.length).length,currentIngredientSupplied:activeFoods.filter(q=>!q.noCurrentSupply.length).length,currentRequiresNonpurchase:activeFoods.filter(q=>!q.noCurrentSupply.length&&!q.noFieldCurrentPurchaseAndProcess).length,currentRecoverySupplied:recoveryFoods.filter(q=>!q.noCurrentSupply.length).length,currentRecoveryRequiresNonpurchase:recoveryFoods.filter(q=>!q.noCurrentSupply.length&&!q.noFieldCurrentPurchaseAndProcess).length,importedSpecialtyRows:imported.length,gemOrFieldBossMaterialStocks:growthStocks.length},
 foods,removed,imported,localSpecialtyStocks:allStocks.filter(s=>['STK_LIYUE_FOOD_SILK_FLOWER','STK_LIYUE_FORGE_COR_LAPIS'].includes(s[0])).map(s=>copy(s)),
 stillSold:allStocks.filter(active).map(s=>({id:s[0],merchant:s[1],item:s[3],name:s[4],price:s[5],stock:s[6],period:s[7],condition:s[8]})),
 nativeImportBulk:nativeImportBulk()};
// Independent native mini-game samples start at the resource site. Travel and
// battle settlement are excluded, so these are resource rate samples, not a
// claim of complete farming trips or wall-clock human play time.
const {supplySamples}=require('./audit_food_supply_v01617.cjs');
data.specialtyHarvestSamples=supplySamples({count:16,maps:['MAP_LY_DETAIL_QINGYUN','MAP_LY_DETAIL_QINGCE_FIELDS','MAP_LY_DETAIL_HULAO']}).map(({samples,...s})=>({...s,samples:samples.map(({scene,inputs,...x})=>x)}));
const baselineArg=process.argv.indexOf('--baseline');
if(baselineArg>=0){const baseline=JSON.parse(fs.readFileSync(process.argv[baselineArg+1],'utf8')),oldStocks=baseline.stocks.map(s=>[s.id,s.merchant,'ITEM',s.item,s.name,s.price,s.quantity,s.period,s.condition]);
 const before=coverage(oldStocks),oldItems=new Map(baseline.items.map(x=>[x[0],x]));
 const beforeFull=coverage(oldStocks,{includeFields:true,currentOnly:true});
 data.before={foodPurchaseAndProcess:activeFoods.filter(q=>Object.keys(q.cost.items).every(id=>before.has(id))).length,recoveryFoodPurchaseAndProcess:recoveryFoods.filter(q=>Object.keys(q.cost.items).every(id=>before.has(id))).length,noCurrentSupply:activeFoods.filter(q=>Object.keys(q.cost.items).some(id=>!beforeFull.has(id))).map(q=>q.recipe)};
 data.resalePreservation=removed.map(s=>{const retail=oldStocks.filter(x=>active(x)&&x[3]===s.item&&Number(x[5])>0).map(x=>Number(x[5])),oldPrice=Math.min(Number(oldItems.get(s.item)?.[14]||0),retail.length?Math.floor(Math.min(...retail)/4):Infinity);return {item:s.item,before:oldPrice,after:s.preservedNpcSale,same:oldPrice===s.preservedNpcSale};});
}
const outArg=process.argv.indexOf('--out');if(outArg>=0){const out=process.argv[outArg+1];fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');}
console.log(JSON.stringify({counts:data.counts,before:data.before,resaleDifferences:data.resalePreservation?.filter(x=>!x.same)}));
module.exports={data};
