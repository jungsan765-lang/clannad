'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../..');
const args=process.argv.slice(2), option=name=>args.includes(name)?args[args.indexOf(name)+1]:undefined;
const sourceRoot=path.resolve(option('--baseline')||option('--source-root')||root);
const outputPath=path.resolve(option('--out')||path.join(__dirname,'catalog_replay.json'));
if(args.includes('--help')){console.log('node audit_catalog.cjs --baseline /path/to/genshin-crpg --out /path/to/catalog.json');process.exit(0);}
const a=require(path.join(root,'tools/audit_food_lodging_v01617.cjs'));
const env=a.loadEnvironment(sourceRoot);
const r=a.setup(env,{levels:30});a.learnRecipes(r);
const stocks=r.rows('19_SHOP_STOCK_DB');
const active=s=>!/SYSTEM_DISABLED|레거시|사용 금지/.test(s[8]||'');
const prices=a.purchaseLowerBounds(r,'MOND');
const recipes=r.rows('17_RECIPE_DB').map(x=>r.recipeDefinition(x[0]));
const processingRecipes=new Map(recipes.filter(x=>x[1]==='식재료 가공').map(x=>[x[3],x]));
function sources(id){return r.rows('32_MAP_DB').flatMap(m=>{const kind=r.lifeKindAt(m[0]);if(!kind)return[];const p=r.lifePool(kind,m[0]),item=p.find(x=>x.item===id);return item?[{map:m[0],name:m[2],kind,weight:item.weight,totalWeight:p.reduce((n,x)=>n+x.weight,0),relativeChance:item.weight/p.reduce((n,x)=>n+x.weight,0)}]:[];});}
function ingredient(id,n,stack=[]){const q=processingRecipes.get(id),direct=stocks.filter(s=>s[2]==='ITEM'&&s[3]===id).map(s=>({stock:s[0],merchant:s[1],mora:Number(s[5]),quantity:s[6],period:s[7],condition:s[8],enabled:active(s)}));return {id,name:r.row('14_ITEM_DB',id)[1],n,saleUnit:r.saleUnitPrice({item:id}),saleOpportunity:r.saleUnitPrice({item:id})*n,stocks:direct,life:sources(id),process:q&&!stack.includes(id)?{recipe:q[0],fee:r.recipeCost(q).mora,output:q[4],gameTime:q[19],ingredients:Object.entries(r.recipeCost(q).items).map(([iid,nn])=>ingredient(iid,nn*n/Number(q[4]),[...stack,id]))}:null};}
const foods=recipes.filter(q=>q[1]==='요리'&&q[2]==='ITEM').flatMap(q=>{const row=r.row('14_ITEM_DB',q[3]);if(!(Number(row[8])>0))return[];const cost=r.recipeCost(q);return[{food:row[0],name:row[1],rarity:row[3],baseHealing:Number(row[8]),status:row[9],recipe:q[0],fee:cost.mora,output:q[4],gameTime:q[19],unlock:q[18],ingredients:Object.entries(cost.items).map(([id,n])=>ingredient(id,n)),npcSaleMora:r.saleUnitPrice({item:row[0]}),readyStocks:stocks.filter(s=>s[2]==='ITEM'&&s[3]===row[0]).map(s=>({stock:s[0],merchant:s[1],price:Number(s[5]),quantity:s[6],period:s[7],condition:s[8],enabled:active(s)})),trade:r.tradeRule(row[0])}];});
const levels=[1,10,20,30,40,50,60],budgets=[];
for(const level of levels){const t=a.setup(env,{levels:level});a.learnRecipes(t);for(const loss of [.25,.5,.75]){a.injure(t,loss);const inn=Object.fromEntries(['MOND','LIYUE'].map(reg=>[reg,t.innRecoveryQuote(t.row('19_SHOP_STOCK_DB',a.SOURCES[reg].stock))]));budgets.push({level,loss,hp:a.hp(t),inn,foods:foods.map(f=>({food:f.food,baseHealing:f.baseHealing,targets:a.PARTY.map(owner=>{const z=t.economyOwner(owner);return{owner,healing:t.foodHealingAmount(f.baseHealing,owner),percentMaxHp:t.foodHealingAmount(f.baseHealing,owner)/z.maxHp,oneMealInnVariableCostAvoided:Math.min(z.maxHp-z.hp,t.foodHealingAmount(f.baseHealing,owner))/z.maxHp*4*level};})}))});}}
const snapshot=env.provenance;
const out={schema:1,snapshot,assumptions:{legalEquipment:'+3 before Lv30/+6 afterwards; same audit_food_lodging_v01617.cjs fixed four Traveler/Amber/Kaeya/Lisa',noLiveMarketPrices:true,noProductWrites:true,relativeIngredientChance:'Life pool weight ratio only; not exact harvest yield or elapsed. Native sample output stored separately.',ingredientSaleOpportunity:'Real native NPC sale price, not replacement purchase price.',cookingFee:'Per recipe fixed; not crafter/recipient level.'},foods,budgets,market:{rules:env.c.CRPGRuntime.tradeRules,serverFee:.05,minFee:1,minListingBundle:10,maxListings:8}};
fs.mkdirSync(path.dirname(outputPath),{recursive:true});fs.writeFileSync(outputPath,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({foods:foods.length,levels,budgets:budgets.length,enabledReadyFoods:foods.filter(f=>f.readyStocks.some(s=>s.enabled)).map(f=>({food:f.food,name:f.name,baseHealing:f.baseHealing,stocks:f.readyStocks.filter(s=>s.enabled)}))}));
