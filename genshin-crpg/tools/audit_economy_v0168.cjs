'use strict';
// Conservative purchase -> any sequence of crafts -> NPC resale scan.
// Each recipe may use its best eligible passive; future/locked stock is retained
// as a lower bound, so this is not a simulation of a natural account or market.
const assert=require('node:assert/strict');
const {fresh,c,fs,path,root}=require('../tests/helpers_v011.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
function audit(){
 const r=fresh(),discount=fresh(),ids=['MOND_ALBEDO','MOND_LISA','MOND_MONA'];
 discount.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(Object.fromEntries(ids.map(id=>[id,{state:'JOINED'}])));
 ids.forEach((id,i)=>discount.action('PARTY',{char:id,slot:i+2}));
 const stocks=r.rows('19_SHOP_STOCK_DB').filter(x=>!/SYSTEM_DISABLED|레거시|사용 금지/.test(x[8]||''));
 const recipes=r.rows('17_RECIPE_DB'),prices=new Map(),key=(kind,id)=>kind+':'+id;
 for(const row of stocks)if(['ITEM','EQUIP'].includes(row[2])&&Number(row[5])>0){const k=key(row[2],row[3]);prices.set(k,Math.min(prices.get(k)??Infinity,Number(row[5])));}
 const definitions=recipes.map(row=>{
  const base=r.recipeCost(row);let cost=base;
  try{cost=discount.recipeCost(row);}catch(e){if(e.code!=='PASSIVE_RECIPE_CLASS')throw e;}
  const extra=row[2]==='ITEM'&&r.passiveRecipeKind(row)==='COOK'&&['STATUS_FOOD_ATK','STATUS_FOOD_FEAST'].includes(r.tables['14_ITEM_DB'].get(row[3])?.[9])?1:0;
  return {row,cost,output:Number(row[4])+extra};
 });
 let iterations=0,changed=true;
 while(changed&&iterations++<=recipes.length){
  changed=false;
  for(const {row,cost,output}of definitions){
   const spent=cost.mora+Object.entries(cost.items).reduce((n,[id,count])=>n+(prices.get(key('ITEM',id))??Infinity)*count,0);
   const unit=spent/output,k=key(row[2],row[3]);
   if(unit<(prices.get(k)??Infinity)){prices.set(k,unit);changed=true;}
  }
 }
 const violations=[];
 for(const [k,buy]of prices){const [kind,id]=k.split(':'),sell=r.saleUnitPrice(kind==='EQUIP'?{equip:id}:{item:id});if(sell>buy+1e-8)violations.push({kind,id,buy,sell});}
 return {schema:1,version:'0.16.8',stockRows:stocks.length,recipeRows:recipes.length,pricedRoutes:prices.size,relaxationIterations:iterations,violations,
  includedPassives:['MOND_ALBEDO','MOND_LISA','MOND_MONA','LIYUE_XIANGLING (ATK and FEAST, single-craft extra output)'],
  tradeRules:copy(c.CRPGRuntime.tradeRules),limits:'Includes locked/future catalog routes as conservative lower bounds. No live player market prices, trade history, inventories, travel cost or population data. Zero catalog resale arbitrage does not prove zero market inflation.'};
}
if(require.main===module){const report=audit(),dest=path.join(root,'evidence/balance-audit-v0168/economy.json');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.equal(report.violations.length,0,'NPC buy/craft/resale arbitrage');}
module.exports={audit};
