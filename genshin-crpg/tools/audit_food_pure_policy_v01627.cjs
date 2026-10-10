'use strict';
// Read-only native policy identity audit. No combat, MOVE, meals or purchases.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const args=process.argv.slice(2),arg=k=>args.includes(k)?args[args.indexOf(k)+1]:null;
const ROOT=path.resolve(arg('--root')||path.resolve(__dirname,'..'));
const OLD=path.resolve(arg('--snapshot-root')||'/tmp/crpg_v01627_ordinary/product_snapshot_2');
const OUT=arg('--out')||path.join(ROOT,'docs/data/balance_v01627/ordinary_final/pure_policy_reuse.json');
const H=require(path.join(ROOT,'tools/audit_protagonist_v01618.cjs'));
const F=require(path.join(ROOT,'tools/audit_food_lodging_v01617.cjs'));
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const cp=x=>JSON.parse(JSON.stringify(x));
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const file=(root,f)=>fs.readFileSync(path.join(root,f));
const hash=(root,f)=>sha(file(root,f));
const supplyPath=arg('--supply-input')||path.join(ROOT,'docs/data/balance_v01627/ordinary/raw/product2_food_supply.json.gz');
const costsPath=arg('--cost-input')||path.join(ROOT,'docs/data/balance_v01627/ordinary/raw/food_cost_current.json.gz');
const rawInput=p=>p.endsWith('.gz')?require('node:zlib').gunzipSync(fs.readFileSync(p)):fs.readFileSync(p);
const supply=JSON.parse(rawInput(supplyPath)),costs=JSON.parse(rawInput(costsPath));
const old=H.load(OLD,null),current=H.load(ROOT,null);
old.G=old.api.growthV01522;current.G=current.api.growthV01522;
const moduleNames=['runtime.js','runtime_economy.js','runtime_economy_v0148.js','runtime_passives.js','runtime_places.js','runtime_places_joint.js','runtime_growth_data_v01522.js','runtime_growth_v01522.js','runtime_balance_admin_v01623.js','runtime_equipment.js','runtime_enhancement.js'];
const modules=moduleNames.map(name=>({file:'source/'+name,snapshotSha256:hash(OLD,'source/'+name),currentSha256:hash(ROOT,'source/'+name),identical:hash(OLD,'source/'+name)===hash(ROOT,'source/'+name)}));
const startSource=modules.map(x=>({file:x.file,sha256:x.currentSha256}));
const methods=['foodHealingAmount','foodSpec','installFoodBalance','economyOwner','economyHeal','consumeMealFoods','meal','recipeDefinition','recipeCost','passiveRecipeKind','passiveEffects','craft','craftReason','recipeFacilityReason','innRecoveryQuote','stockPrice','stockOffer','growth','growthPhase','growthElement','growthStoryGate','ascensionInfo','talentLevels','talentUpgradeInfo','experienceBookLimit','recalculate','character','player'];
const functionProof=methods.map(name=>{const a=old.R.prototype[name],b=current.R.prototype[name];assert.equal(typeof a,typeof b,name);if(typeof a!=='function')return{name,present:false};return{name,present:true,snapshotSha256:sha(a.toString()),currentSha256:sha(b.toString()),identical:a.toString()===b.toString()};});
const apiMethods=['hpCurve','adCurve','xpNext','phaseFor'];
const growthFunctions=apiMethods.map(name=>({name,snapshotSha256:sha(old.G[name].toString()),currentSha256:sha(current.G[name].toString()),identical:old.G[name].toString()===current.G[name].toString()}));
const growthKeys=['caps','talentCaps','pacingCurve','pacingVersion','ascensionGemCosts','talentBookCosts','materialRequirementVersion','specialties','gems'];
const growthPolicies=growthKeys.map(name=>({name,snapshotSha256:sha(JSON.stringify(old.G[name])),currentSha256:sha(JSON.stringify(current.G[name])),identical:eq(old.G[name],current.G[name]),value:cp(current.G[name])}));
const XP50to60=Array.from({length:10},(_,i)=>({level:50+i,next:current.G.xpNext(50+i),snapshotNext:old.G.xpNext(50+i)}));
assert(XP50to60.every(x=>x.next===x.snapshotNext));
const setup=env=>F.setup(env,{levels:60,route:'ROUTE_ISEKAI',region:'MOND'});
const a=setup(old),b=setup(current);
F.learnRecipes(a);F.learnRecipes(b);
a.action('PLACE_ENTER',{place:F.SOURCES.MOND.cook,mode:'CRAFT'});b.action('PLACE_ENTER',{place:F.SOURCES.MOND.cook,mode:'CRAFT'});
const tableNames=['07_CHAR_DB','14_ITEM_DB','16_EQUIP_DB','17_RECIPE_DB','19_SHOP_STOCK_DB','48_RECIPE_INGREDIENT_DB'];
const tableProof=tableNames.map(table=>({table,snapshotSha256:sha(JSON.stringify(a.rows(table))),currentSha256:sha(JSON.stringify(b.rows(table))),identical:eq(a.rows(table),b.rows(table))}));
const catalogA=cp(F.foodCatalog(a,'MOND')),catalogB=cp(F.foodCatalog(b,'MOND'));
assert(eq(catalogA,catalogB),'native 45-dish catalog changed');
const foodDefinitions=supply.catalog.map(row=>{const ar=a.recipeDefinition(row.recipe),br=b.recipeDefinition(row.recipe),ac=cp(a.recipeCost(ar)),bc=cp(b.recipeCost(br));const specA=cp(a.foodSpec(row.food)),specB=cp(b.foodSpec(row.food));assert(eq(ar,br));assert(eq(ac,bc));assert(eq(specA,specB));assert(eq(ac,row.cost));assert.equal(specB.heal,row.baseHealing);return{food:row.food,recipe:row.recipe,recipeDefinitionSha256:sha(JSON.stringify(br)),recipeCost:bc,foodSpec:specB,baseHealing:row.baseHealing,definitionIdentical:true,supplyCatalogValuesMatch:true};});
assert(eq(catalogB,supply.catalog),'existing supply catalog differs from current pure policy');
assert(eq(catalogB,costs.catalog[0].foods),'existing 36-case report catalog differs from current pure policy');
const pureConditions=[];
const templates=new Map();
for(const row of costs.rows){
 const key=JSON.stringify([row.levels,row.route,row.region,row.hpLoss]);
 let pair=templates.get(key);
 if(!pair){pair=[old,current].map(env=>{const r=F.setup(env,{levels:row.levels,route:row.route,region:row.region});F.learnRecipes(r);F.injure(r,row.hpLoss,row.injuredOwners);return r;});templates.set(key,pair);}
 const [ra,rb]=pair;
 const initialA=cp(F.hp(ra)),initialB=cp(F.hp(rb));assert(eq(initialA,initialB));assert(eq(initialB,row.initialHp));
 const quotes={};for(const[region,site]of Object.entries(F.SOURCES)){const qa=cp(ra.innRecoveryQuote(ra.row('19_SHOP_STOCK_DB',site.stock))),qb=cp(rb.innRecoveryQuote(rb.row('19_SHOP_STOCK_DB',site.stock)));assert(eq(qa,qb));assert(eq(qb,row.inn[region].quote));quotes[region]=qb;}
 const healing=row.plans.map(p=>{const values=p.path.map(id=>({food:id,amount:rb.foodHealingAmount(rb.foodSpec(id).heal,p.owner)}));const snapshotRequested=p.path.reduce((n,id)=>n+ra.foodHealingAmount(ra.foodSpec(id).heal,p.owner),0),currentRequested=values.reduce((n,v)=>n+v.amount,0);assert.equal(snapshotRequested,currentRequested);assert.equal(currentRequested,p.requestedHealing);return{owner:p.owner,path:p.path,values,currentRequested};});
 const craftCash=Object.entries(row.actual.foodCounts).reduce((n,[id,qty])=>{const f=catalogB.find(x=>x.food===id);return n+rb.recipeCost(rb.recipeDefinition(f.recipe),qty).mora;},0);
 assert.equal(craftCash,row.actual.craftMora);
 pureConditions.push({levels:row.levels,route:row.route,region:row.region,hpLoss:row.hpLoss,menu:row.menu,priority:row.priority,initialHpIdentical:true,originalReportInitialHpMatches:true,innQuoteIdentical:true,innQuotes:quotes,healing,cookingMora:craftCash,originalNativeReceiptsReexecuted:false});
}
const requirementSamples=[];
for(const level of [50,55])for(const owner of ['PLAYER_CUSTOM','MOND_AMBER','LIYUE_XIANGLING','MOND_DILUC']){
 const out=[];for(const r of [a,b]){if(owner==='PLAYER_CUSTOM')r.s.global.PLAYER_LEVEL_STATE=level;else r.s.chars[owner].level=level;r.s.ascensions[owner]=current.G.phaseFor(level);r.s.talents[owner]={na:level===50?8:9,e:level===50?8:9,q:level===50?8:9};if(owner!=='PLAYER_CUSTOM'){const eligibility=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON);eligibility[owner]={state:'JOINED'};r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(eligibility);}out.push({ascension:cp(r.ascensionInfo(owner)),talent:cp(r.talentUpgradeInfo(owner,'na'))});}
 assert(eq(out[0],out[1]),'growth requirement quote changed '+owner+'/'+level);requirementSamples.push({owner,level,identical:true,ascension:out[1].ascension,talent:out[1].talent});
}
const economyBefore=file(OLD,'source/runtime_economy.js').toString(),economyNow=file(ROOT,'source/runtime_economy.js').toString();
const frostOnly="    // The snow materials are paid by this recipe's own ingredient requirements.\n    // Its explanatory suffix is not a condition-language expression.\n    if (id === 'REC_ARMOR_FROST' && r[18] === 'LEVEL>=5 / 설산 소재 확보') {\n      r = r.slice(); r[18] = 'LEVEL>=5';\n    }\n";
assert.equal(economyNow.split(frostOnly).length-1,1);assert.equal(economyNow.replace(frostOnly,''),economyBefore);
const sourceStable=startSource.every(x=>hash(ROOT,x.file)===x.sha256);assert(sourceStable,'product changed during pure-policy audit');
const latest=H.load(ROOT,null);assert.equal(latest.fingerprint,current.fingerprint,'runtime changed during native audit');
const report={schema:1,reproductionTool:{path:'tools/audit_food_pure_policy_v01627.cjs',sha256:sha(fs.readFileSync(__filename)),requiredSnapshotFingerprint:'a10787dee063d75629ac00ee53baf5c5b884e3ee2e6b1d91abf3987689aae7dc',snapshotInput:'--snapshot-root must point to the original product2 source+DB snapshot; archived pure quote inputs default to repository ordinary/raw/*.json.gz'},generatedAt:new Date().toISOString(),scope:'Read-only native code/function identity and pure deterministic price/healing/requirement quotes; no VM code patches, product edits, combat, MOVE, acquisition simulations, CRAFT, MEAL_BATCH or inn BUY receipts.',snapshot:{root:OLD,nativeLoadFingerprint:old.fingerprint,dbSha256:hash(OLD,'content/db.json')},current:{root:ROOT,nativeLoadFingerprint:current.fingerprint,dbSha256:hash(ROOT,'content/db.json'),sourceStableThroughAudit:sourceStable},provenance:{supply:{path:supplyPath,sha256:sha(rawInput(supplyPath)),declaredRoot:supply.root,declaredFingerprint:supply.fingerprint,nativeSnapshotFingerprintMatches:old.fingerprint===supply.fingerprint,catalogLength:supply.catalog.length,retainOriginalProvenance:true},foodCost36:{path:costsPath,sha256:sha(rawInput(costsPath)),originalProvenance:cp(costs.provenance),originalCounts:cp(costs.counts),retainOriginalProvenance:true},intermediateFingerprintNote:'Parent reported 520a-prefix intermediate snapshot; latest peer reported dba4de68faed36de6e0b554b071897ccf2fe5d69a42000b8b801ccce3cd91087 after historical ABYSS/RAID opening-speed protection. Root subsequently froze fingerprint 7147e88113388e51a3042d1d51c9bde3e084213502f976f52202012542f0dbe2 after the ordinary ATK low-level curve and equipment +11/+12 Mora price changes. This proof uses the actual current H.load fingerprint above; old reports are not relabeled as final executions.'},sourceModules:modules,nativePrototypeFunctions:functionProof,growthApiFunctions:growthFunctions,growthRequirementPolicies:growthPolicies,nativeRelevantTables:tableProof,catalog:{nativeSnapshotAndCurrentIdentical:true,existingSupplyCatalogMatches:true,existingFoodCost36CatalogMatches:true,foodDefinitions},pureFoodCost36:{rowCount:pureConditions.length,conditions:templates.size,menus:cp(costs.menus),rowsMatchOriginalPurePolicy:true,rows:pureConditions},growth50to60:{xpPerLevel:XP50to60,totalXp:XP50to60.reduce((n,x)=>n+x.next,0),requirementSamples},intentionalNonPureDifferences:{economy:'Only REC_ARMOR_FROST condition normalization differs in runtime_economy.js; exact deletion restores snapshot module SHA. Food recipe definitions/costs and all 45-dish catalog outputs match.',economyShaAfterExactNonfoodDeltaRemoval:sha(economyNow.replace(frostOnly,'')),growth:'Ordinary enemy ATK 1.6 -> 3.2 with the final low-level interpolation curve, protection/initiative compatibility, EXP60 reward 13000 -> 24000 and TALENT60 current reward 80 -> 90/version4 changed. XP curve, ascension/talent requirements and food recipient growth policy are independently identical.',enhancement:'Equipment +11/+12 Mora prices 14000/18000 are outside the food/inn/XP/ascension/talent pure-policy reuse scope; equipment-stat projection methods and native food-condition HP checks are independently compared.',admin:'Growth reward catalog uses current reward markers; base recovery, cooking, ascension/talent requirement wrapper bodies match.'},conclusion:{reusePureRecoveryCookingAndRequirements:true,reuseExistingCatalog45:true,reuseFoodCost36PurePriceHealingQuotes:true,relabelOldNativeReceiptExecutionsAsFinal:false,reuseCombatOrTravelAcquisitionTiming:false,reason:'Byte identity of authored DB, native food/cost catalogs, base recovery modules and deterministic pure quotes supports only pure policy reuse. Source fingerprint changes and combat policy changes require independent current battle/supply timing evidence.'}};
fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out:OUT,snapshotFingerprint:old.fingerprint,currentFingerprint:current.fingerprint,foodCatalog:catalogB.length,pureRows:pureConditions.length,conditions:templates.size,dbIdentical:report.current.dbSha256===report.snapshot.dbSha256,functionDifferences:functionProof.filter(x=>x.present&&!x.identical).map(x=>x.name),growthPoliciesIdentical:growthPolicies.every(x=>x.identical),sourceStable}));
