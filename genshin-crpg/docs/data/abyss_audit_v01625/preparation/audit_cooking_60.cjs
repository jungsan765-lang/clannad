'use strict';
// Public recipe purchase and actual crafting, starting with declared material gifts.
// This is not a natural gathering, market, stock purchase or campaign-time simulation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),{fresh}=require(path.join(root,'tests/helpers_v011.cjs'));
const r=fresh('MAP_MOND_CITY');r.s.global.MORA=100000;
const foods=['FOOD_ADEPTUS_TEMPTATION','FOOD_JADE_PARCELS','FOOD_SATISFYING_SALAD','FOOD_FISHERMANS_TOAST','FOOD_CREAM_STEW'];
const count=12,immediate={},raw={},recipes=foods.map(id=>r.rows('17_RECIPE_DB').find(x=>x[3]===id)),timeline=[],initialMora=r.s.global.MORA;
const products=['ING_HAM','ING_CREAM'];
for(const rec of recipes)for(const [id,n] of Object.entries(r.recipeCost(rec,count).items))immediate[id]=(immediate[id]||0)+n;
for(const [id,n]of Object.entries(immediate)){
 const process=products.includes(id)&&r.rows('17_RECIPE_DB').find(x=>x[3]===id);
 if(process)for(const [sub,num]of Object.entries(r.recipeCost(process,n).items))raw[sub]=(raw[sub]||0)+num;
 else raw[id]=(raw[id]||0)+n;
}
for(const [id,n]of Object.entries(raw))r.giveItem(id,n);
r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_SARA',mode:'SHOP'});
for(const stock of ['STK_V014_MOND_REC_01','STK_V014_MOND_REC_03','STK_V014_MOND_REC_04'])timeline.push({action:'BUY_RECIPE',stock,...r.action('BUY',{stock,quantity:1}).result});
r.action('PLACE_LEAVE');r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_SERVICE_MOND_COOK',mode:'CRAFT'});
for(const [recipe,quantity]of [['REC_PROCESS_HAM',24],['REC_PROCESS_HAM',12],['REC_PROCESS_CREAM',24],...recipes.map(x=>[x[0],count])]){
 const before={day:r.s.global.WORLD_DAY,time:r.s.global.WORLD_TIME,mora:r.s.global.MORA};
 const response=r.action('CRAFT',{recipe,quantity}).result;
 timeline.push({action:'CRAFT',before,response,after:{day:r.s.global.WORLD_DAY,time:r.s.global.WORLD_TIME,mora:r.s.global.MORA}});
}
for(const id of foods)assert.equal(r.itemCount(id),count,id+' cooked quantity');
for(const id of Object.keys(raw))assert.equal(r.itemCount(id),0,id+' fully consumed');
const query=JSON.parse(fs.readFileSync(path.join(__dirname,'native_preparation_query.json'))),item=id=>query.items.find(i=>i.id===id);
const retail=Object.entries(raw).map(([id,quantity])=>{const row=item(id),stock=(row?.stock||[]).filter(s=>s.active&&Number(s.price)>0&&['MRC_MOND_GENERAL','MRC_LIYUE_GENERAL'].includes(s.merchant)).sort((a,b)=>Number(a.price)-Number(b.price))[0];return {id,name:r.row('14_ITEM_DB',id)[1],quantity,npc:stock?{unitPrice:Number(stock.price),minimumTotal:Number(stock.price)*quantity,stock:stock.id,merchant:stock.merchant,restock:stock.restock,quantityPerRestock:stock.quantity}:null,fieldSources:(row?.lifePools||[]).slice(0,3)};});
const costBuyingAllNpcAvailable=retail.reduce((sum,x)=>sum+(x.npc?.minimumTotal||0),0),npcCostIfGatheringJueyun=retail.filter(x=>x.id!=='MAT_LIYUE_JUEYUN_CHILI').reduce((sum,x)=>sum+(x.npc?.minimumTotal||0),0);
const report={scope:'Native public BUY_RECIPE + CRAFT60 buffs and processing from granted raw materials. No natural material acquisition or elapsed real playtime claim. All five buff recipes quote0 direct cooking Mora. NPC arithmetic assumes repeated restocks and visits, never one simultaneous buy.',foods:Object.fromEntries(foods.map(id=>[id,count])),immediateIngredients:immediate,processedFromRaw:raw,retail,recipePurchaseMora:initialMora-r.s.global.MORA,retailQuotes:{buyingEveryNpcAvailableIngredient:{mora:costBuyingAllNpcAvailable,fieldCount:retail.filter(x=>!x.npc).reduce((sum,x)=>sum+x.quantity,0),jueyunImportWarning:'12pieces, 2per3WORLD_DAY, costly optional import; actual stock availability/restocks not simulated'},gatheringJueyunInsteadOfImport:{mora:npcCostIfGatheringJueyun,fieldCount:retail.filter(x=>!x.npc||x.id==='MAT_LIYUE_JUEYUN_CHILI').reduce((sum,x)=>sum+x.quantity,0)}},craftingWorldMinutes:timeline.filter(x=>x.action==='CRAFT').reduce((sum,x)=>sum+x.response.minutes,0),foodIngestionWorldMinutesIf60UseItem:600,worldDay:r.s.global.WORLD_DAY,worldTime:r.s.global.WORLD_TIME,timeline,remaining:Object.fromEntries([...Object.keys(raw),...products].map(id=>[id,r.itemCount(id)]))};
fs.writeFileSync(path.join(__dirname,'cooking_60_native.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({foodCount:60,recipePurchaseMora:report.recipePurchaseMora,retailQuotes:report.retailQuotes,craftingWorldMinutes:report.craftingWorldMinutes,errors:0}));
