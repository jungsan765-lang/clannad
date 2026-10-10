'use strict';
// Complete current catalogs, exact expected enhancement costs, and native
// gear/recovery/task boundaries. No economy or combat function is substituted.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {loadEnvironment,setup,cloneRuntime,learnRecipes,foodCatalog,SOURCES}=require('./audit_food_lodging_v01617.cjs');
const ROOT=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
const LEVELS=[1,5,10,20,30,40,50,60];
function solve(matrix,b){
 const a=matrix.map((row,i)=>[...row,b[i]]),n=a.length;
 for(let k=0;k<n;k++){
  let p=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[p][k]))p=i;
  assert(Math.abs(a[p][k])>1e-12,'finite enhancement Markov chain');[a[p],a[k]]=[a[k],a[p]];
  const d=a[k][k];for(let j=k;j<=n;j++)a[k][j]/=d;
  for(let i=0;i<n;i++)if(i!==k){const m=a[i][k];for(let j=k;j<=n;j++)a[i][j]-=m*a[k][j];}
 }return a.map(row=>row[n]);
}
function expectedEnhancement(config,target,key){
 const a=[],b=[];for(let current=0;current<target;current++){
  const next=current+1,p=config.success[next]/10000,q=config.down[next]/10000;
  const row=Array(target).fill(0);row[current]=p+q;
  if(current+1<target)row[current+1]-=p;if(current>0)row[current-1]-=q;
  a.push(row);b.push(key==='attempts'?1:key==='mora'?config.mora[next]:Number(config.ores[next]?.[key]||0));
 }return solve(a,b)[0];
}
function audit({sourceRoot=ROOT,out=null}={}){
 const env=loadEnvironment(sourceRoot),api=env.c.CRPGRuntime;
 const r=setup(env,{levels:30}),checks=[],check=(name,test,evidence)=>{assert(test,name);checks.push({name,pass:true,...(evidence?{evidence}:{})});};
 const recipes=r.rows('17_RECIPE_DB').map(raw=>{const q=r.recipeDefinition(raw[0]);return {id:q[0],kind:q[1],outputKind:q[2],output:q[3],quantity:Number(q[4]),cost:copy(r.recipeCost(q)),condition:q[18],gameTime:q[19],resale:r.saleUnitPrice(q[2]==='EQUIP'?{equip:q[3]}:{item:q[3]})};});
 const stocks=r.rows('19_SHOP_STOCK_DB').map(row=>({id:row[0],merchant:row[1],kind:row[2],product:row[3],price:Number(row[5])||null,stock:row[6],period:row[7],condition:row[8],disabled:/SYSTEM_DISABLED|레거시|사용 금지/.test(row[8]||'')}));
 const discount=cloneRuntime(r),ids=['MOND_ALBEDO','MOND_LISA','MOND_MONA'];
 discount.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(Object.fromEntries(ids.map(id=>[id,{state:'JOINED'}])));discount.s.party=[discount.s.party[0],...ids.map((source,i)=>({slot:'PARTY_'+(i+2),type:'CHAR',source,control:'AI',active:true,tactic:'균형'}))];
 const prices=new Map(),k=(kind,id)=>kind+':'+id;
 for(const s of stocks)if(!s.disabled&&['ITEM','EQUIP'].includes(s.kind)&&s.price>0)prices.set(k(s.kind,s.product),Math.min(prices.get(k(s.kind,s.product))??Infinity,s.price));
 const definitions=r.rows('17_RECIPE_DB').map(raw=>{const q=r.recipeDefinition(raw[0]);let cost;try{cost=discount.recipeCost(q);}catch(e){if(e.code!=='PASSIVE_RECIPE_CLASS')throw e;cost=r.recipeCost(q);}const extra=q[2]==='ITEM'&&r.passiveRecipeKind(q)==='COOK'&&['STATUS_FOOD_ATK','STATUS_FOOD_FEAST'].includes(r.tables['14_ITEM_DB'].get(q[3])?.[9])?1:0;return {q,cost,output:Number(q[4])+extra};});
 let changed=true,iteration=0;while(changed&&iteration++<=definitions.length){changed=false;for(const {q,cost,output}of definitions){const unit=(cost.mora+Object.entries(cost.items).reduce((s,[id,n])=>s+(prices.get(k('ITEM',id))??Infinity)*n,0))/output,key=k(q[2],q[3]);if(unit<(prices.get(key)??Infinity)){prices.set(key,unit);changed=true;}}}
 const arbitrage=[];for(const [key,buy]of prices){const [kind,id]=key.split(':'),sell=r.saleUnitPrice(kind==='EQUIP'?{equip:id}:{item:id});if(sell>buy+1e-8)arbitrage.push({kind,id,buy,sell});}check('All catalog NPC purchase/process/craft/resale routes, including best passive and future stock, have no positive-money loop',arbitrage.length===0);
 const gear=r.rows('16_EQUIP_DB').map(row=>({id:row[0],name:row[1],kind:row[2],rarity:row[13],minLevel:Number(row[19]),base:{atk:Number(row[4]),def:Number(row[5]),hp:Number(row[6]),crit:Number(row[7]),critDmg:Number(row[8]),spd:Number(row[20]),hit:Number(row[21]),eva:Number(row[22]),resist:Number(row[23])},enhanceable:[true,'Y','TRUE'].includes(row[33]),resale:r.saleUnitPrice({equip:row[0]}),recipe:row[15]}));
 const enhancement=Array.from({length:12},(_,i)=>i+1).map(target=>({target,statGain:api.enhancementConfig.primaryGrowth[target],expectedAttempts:expectedEnhancement(api.enhancementConfig,target,'attempts'),expectedMora:expectedEnhancement(api.enhancementConfig,target,'mora'),expectedOres:Object.fromEntries(['ORE_IRON','ORE_WHITE_IRON','ORE_CRYSTAL'].map(key=>[key,expectedEnhancement(api.enhancementConfig,target,key)])),oneTimeAscension:target>10?api.enhancementConfig.ascensionCost:null}));
 const bands=[];for(const level of LEVELS){const t=setup(env,{levels:level});learnRecipes(t);const p=t.equipmentContribution('PLAYER_CUSTOM'),hp0=p.total.hp;const stock=t.row('19_SHOP_STOCK_DB',SOURCES.MOND.stock);
  const lodging=[];for(const ratio of [.05,.25,.5,.75,1]){for(const member of t.s.party){if(!member.active)continue;const a=member.source==='PLAYER_CUSTOM'?t.player():t.character(member.source);if(member.source==='PLAYER_CUSTOM')t.s.global.PLAYER_HP_CURRENT=Math.round(a.maxHp*(1-ratio));else t.s.chars[member.source].hp=Math.round(a.maxHp*(1-ratio));}lodging.push({loss:ratio,quote:copy(t.innRecoveryQuote(stock))});}
  const catalog=api.tasksV0169,calc=list=>list.map(q=>({id:q.id,name:q.name,kind:q.kind,goal:q.goal,minLevel:q.minLevel||1,filter:copy(q.filter||{}),reward:copy(catalog.rewardAt(q,level))}));
  bands.push({level,player:copy(p),initialHp:hp0,lodging,daily:calc(catalog.daily),weekly:calc(catalog.weekly),foods:foodCatalog(t,'MOND').map(f=>({id:f.food,base:f.baseHealing,actualRequested:t.foodHealingAmount(f.baseHealing,'PLAYER_CUSTOM'),craftFee:f.cost?.mora,ingredients:f.cost?.items,readyFoodMora:f.readyFoodMoraLowerBound,opportunityMora:f.ingredientNpcOpportunityMora,resale:f.resaleMora}))});
 }
 const gearBoundary=[];for(const owner of ['PLAYER_CUSTOM','MOND_AMBER']){
  const t=setup(env,{levels:30}),a=owner==='PLAYER_CUSTOM'?t.player():t.character(owner),initial=Math.floor(a.maxHp*.45);
  if(owner==='PLAYER_CUSTOM')t.s.global.PLAYER_HP_CURRENT=initial;else t.s.chars[owner].hp=initial;
  const slot=t.giveEquipment('EQ_ARMOR_REINFORCED_LEATHER'),actions=[];
  for(let i=0;i<8;i++){actions.push(copy(t.action('EQUIP',{slot,owner}).result));actions.push(copy(t.action('UNEQUIP',{slot,owner}).result));}
  const hp=owner==='PLAYER_CUSTOM'?t.player().hp:t.character(owner).hp;check(owner+' repeated gear swaps do not grant free HP',hp<=initial,{initial,hp});gearBoundary.push({owner,initial,hp,actions});
 }
 check('Daily all-completion Primogems retained',api.tasksV0167.bonus.reward.primogem===20);
 check('Weekly all-completion Primogems retained',api.tasksV0169.weeklyBonus.reward.primogem===200);
 check('Finite commissions have unique stable IDs',new Set(api.tasksV0169.chains.map(q=>q.id)).size===api.tasksV0169.chains.length);
 check('Retired Mond and Liyue patrol tasks excluded from current weekly pool',!api.tasksV0169.weekly.some(q=>['W_V168_MOND_PATROL','W_V168_LIYUE_PATROL','W_V169_REPORT','W_V168_CRYO_VINE'].includes(q.id)));
 const bossToStella={weeklyMaterials:api.premiumV0148.offers.find(x=>x.id==='BOSS_GLITTER').weekly*4,weeklyStarlight:api.premiumV0148.offers.find(x=>x.id==='BOSS_GLITTER').weekly,fourStarCost:r.premiumStellaPrice('MOND_AMBER'),fiveStarCost:r.premiumStellaPrice('MOND_JEAN'),limitsClock:'Server action-start, Monday00:00 KST; WORLD_DAY/WAIT does not reset.'};
 const finite=api.tasksV0169.chains.map(q=>({id:q.id,family:q.family,tier:q.tier,kind:q.kind,goal:q.goal,minLevel:q.minLevel,filter:copy(q.filter),reward:copy(q.reward),rewardScale:q.rewardScale,prerequisites:q.prerequisites||[q.predecessor].filter(Boolean)}));
 const report={schema:1,version:'0.16.21',provenance:env.provenance,assumptions:['Full catalogs are enumerated. Native boundary cases execute public Runtime.action. Declared levels/ownership/gear/funding are synthetic starting conditions, not a user save.','Expected enhancement costs solve the native SUCCESS/HOLD/DOWN Markov chain exactly; variance and unlucky streaks remain.','NPC lower bounds include future or locked stocks and strongest eligible passives, with no travel, unlock, gathering or time valuation. This is conservative arbitrage screening, not a natural leveling campaign.','Actual public-market prices, population and sales history are unavailable. Market transfers remove the existing5% fee; finite quest injections and recurring rewards are separated.'],checks,catalog:{recipes,stocks,gear,finiteCommissions:finite,premium:copy(api.premiumV0148),leyLines:copy(api.leyLines)},bands,enhancement,gearBoundary,arbitrage:{pricedRoutes:prices.size,iterations:iteration,violations:arbitrage},bossToStella,counts:{checks:checks.length,recipes:recipes.length,stocks:stocks.length,gear:gear.length,finiteCommissions:finite.length,dailyCandidates:api.tasksV0169.daily.length,weeklyCandidates:api.tasksV0169.weekly.length},findings:{weeklyAbyss:api.tasksV0169.weekly.filter(q=>q.kind==='abyss'),finitePrimogems:finite.reduce((n,q)=>n+(q.reward.primogem||0),0),finiteMora:finite.reduce((n,q)=>n+(q.reward.mora||0),0)}};
 if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}return report;
}
if(require.main===module){const args=process.argv.slice(2),v=key=>args.includes(key)?args[args.indexOf(key)+1]:null;const report=audit({sourceRoot:v('--source-root')||ROOT,out:v('--out')||path.join(ROOT,'docs/data/full_balance_v01621/economy/catalog_before.json')});console.log(JSON.stringify({counts:report.counts,arbitrage:report.arbitrage,findings:report.findings,enhancement:report.enhancement.map(x=>({target:x.target,mora:Math.round(x.expectedMora),attempts:+x.expectedAttempts.toFixed(2)}))}));}
module.exports={audit,expectedEnhancement};
