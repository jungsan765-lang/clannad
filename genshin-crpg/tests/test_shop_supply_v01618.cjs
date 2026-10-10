'use strict';
const assert=require('node:assert/strict');
const {fresh,R,db,c,advance}=require('./helpers_v011.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
function sceneInputs(scene){
 const L=c.CRPGRuntime.lifeScene;
 if(scene.kind==='GATHER')return scene.nodes.map((n,i)=>({at:600+i*450,node:n.i}));
 return scene.nodes.map(n=>{const at=n.start+Math.round(n.duration/2),p=L.animalAt(n,at);return {at,node:n.i,x:Math.round(p.x*10)/10,y:Math.round(p.y*10)/10};}).sort((a,b)=>a.at-b.at);
}
function harvest(r,kind){
 const job=r.action('LIFE_START',{kind}).result,scene=r.lifeScene();let args;
 if(scene){const inputs=sceneInputs(scene);args={inputs,elapsed:Math.min(job.duration,(inputs.at(-1)?.at||0)+400)};}
 else{const controls=[];let held=false;for(let t=2000;t<=job.duration;t+=100){const s=c.CRPGFishing.simulate(job,controls,t);if(s.caught){args={controls,elapsed:t};break;}const hold=s.cursor<s.target;if(held!==hold){controls.push({at:t,hold});held=hold;}}args??={controls,elapsed:job.duration};}
 advance(args.elapsed);return r.action('LIFE_FINISH',{job:job.id,...args}).result;
}
test('all merchants stop selling field ingredients and processed meat, including direct BUY attempts',()=>{
 const r=fresh(),blocked=new Set(c.CRPGRuntime.economyV0148.fieldIngredientAssortment);
 const stocks=r.rows('19_SHOP_STOCK_DB').filter(s=>s[2]==='ITEM'&&blocked.has(s[3]));assert(stocks.length>=30);
 for(const s of stocks){assert.equal(s[8],'SYSTEM_DISABLED',s[0]);assert(r.stockReason(s),s[0]);}
 r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_GENERAL',mode:'SHOP'});
 const before=r.serialize();assert.throws(()=>r.action('BUY',{stock:'STK_CRPG_V011_MOND_GENERAL_ING_FISH',quantity:1}),e=>e.code==='BUY');assert.equal(r.serialize(),before);
});
test('basic groceries, fishing supplies, and existing restaurant meals still use native purchase paths',()=>{
 const r=fresh();r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_GENERAL',mode:'SHOP'});
 for(const stock of ['STK_MOND_FOOD_001','STK_MOND_FOOD_002','STK_MOND_FOOD_003','STK_CRPG_FRUIT_BAIT','STK_MOND_TOOL_001'])assert(r.action('BUY',{stock,quantity:1}).ok);
 assert.equal(r.itemCount('CRPG_FRUIT_BAIT'),1);assert.equal(r.itemCount('TRPG_FISHING_ROD'),1);
 const loaded=new R(db,JSON.parse(r.serialize()));assert.equal(loaded.itemCount('CRPG_FRUIT_BAIT'),1);
 assert.equal(loaded.row('19_SHOP_STOCK_DB','STK_MOND_IMPORT_QINGXIN')[6],2);
 assert.equal(loaded.row('19_SHOP_STOCK_DB','STK_MOND_IMPORT_QINGXIN')[7],'3일');
});
test('legacy meat purchase receipt retries after the product is removed without charging or granting again',()=>{
 // Explicit compatibility fixture: only the pre-change stock condition is
 // restored to obtain a native receipt. This is not an archived live save.
 const r=fresh();r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_GENERAL',mode:'SHOP'});
 const stock='STK_CRPG_V011_MOND_GENERAL_ING_RAW_MEAT';r.row('19_SHOP_STOCK_DB',stock)[8]='없음';
 const g=r.s.global,action={id:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1),revision:g.SAVE_REVISION,type:'BUY',stock,quantity:2};
 const receipt=copy(r.transact(action));assert.equal(receipt.result.cost,72);
 const loaded=new R(db,JSON.parse(r.serialize())),before=loaded.serialize();
 assert.equal(loaded.row('19_SHOP_STOCK_DB',stock)[8],'SYSTEM_DISABLED');
 assert.deepEqual(copy(loaded.transact(action)),receipt);assert.equal(loaded.serialize(),before);assert.equal(loaded.itemCount('ING_RAW_MEAT'),2);
 const sold=loaded.action('SELL',{item:'ING_RAW_MEAT',quantity:1}).result;assert.equal(sold.mora,9);assert.equal(loaded.itemCount('ING_RAW_MEAT'),1);
});
test('early gathering produces an egg for the unchanged recovery recipe; hunting and fishing still pay real mini-games',()=>{
 let cooked=false;
 for(let seed=1;seed<=12&&!cooked;seed++){
  const r=fresh('MAP_MOND_PLAINS');r.s.global.PRNG_STATE=seed;r.s.inventory=[];const out=harvest(r,'GATHER');
  if(out.encounter||!r.itemCount('ING_BIRD_EGG'))continue;
  assert(out.items.ING_BIRD_EGG>0);r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';
  r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_SERVICE_MOND_COOK',mode:'CRAFT'});const cost=r.recipeCost(r.recipeDefinition('REC_FOOD_EGG_FRY'));
  assert.deepEqual(copy(cost),{mora:4,items:{ING_BIRD_EGG:1}});r.action('CRAFT',{recipe:'REC_FOOD_EGG_FRY'});
  const healing=r.foodHealingAmount(Number(r.row('14_ITEM_DB','FOOD_TEA_BREAK_PANCAKE')[8]));
  r.s.global.PLAYER_HP_CURRENT=r.player().maxHp-100;const hp=r.player().hp;r.action('USE_ITEM',{item:'FOOD_TEA_BREAK_PANCAKE'});assert.equal(r.player().hp,hp+Math.min(100,healing));cooked=true;
 }
 assert(cooked,'an actual early gathering sample must cook and heal');
 for(const [kind,map,allowed] of [['HUNT','MAP_CRPG_WHISPER_HUNT',['ING_RAW_MEAT','ING_FOWL']],['FISH','MAP_CRPG_CIDER_BANK',['ING_FISH']]]){
  const r=fresh(map);r.s.inventory=[];r.s.global.PRNG_STATE=719;
  if(kind==='FISH'){r.giveItem('TRPG_FISHING_ROD',1);r.giveItem('CRPG_FRUIT_BAIT',1);}
  const out=harvest(r,kind);assert(Object.entries(out.items).some(([id,n])=>allowed.includes(id)&&n>0));
 }
});
test('imported specialties remain a costly small pre-Liyue fallback and follow existing three-day restocking',()=>{
 const r=fresh();r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_GENERAL',mode:'SHOP'});
 const stock='STK_MOND_IMPORT_JUEYUN_CHILI';assert.equal(r.row('19_SHOP_STOCK_DB',stock)[5],240);
 assert.equal(r.action('BUY',{stock,quantity:2}).result.cost,480);assert.equal(r.stockRemaining(r.row('19_SHOP_STOCK_DB',stock)),0);
 const before=r.serialize();assert.throws(()=>r.action('BUY',{stock,quantity:1}),e=>e.code==='BUY');assert.equal(r.serialize(),before);
 r.action('WAIT',{minutes:1440});r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_GENERAL',mode:'SHOP'});assert.equal(r.stockRemaining(r.row('19_SHOP_STOCK_DB',stock)),0);
 r.action('WAIT',{minutes:1440});r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_GENERAL',mode:'SHOP'});assert.equal(r.stockRemaining(r.row('19_SHOP_STOCK_DB',stock)),0);
 r.action('WAIT',{minutes:1440});r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_GENERAL',mode:'SHOP'});assert.equal(r.stockRemaining(r.row('19_SHOP_STOCK_DB',stock)),2);
});
console.log('Shop supply 0.16.18 regression: '+passed+' passed');
