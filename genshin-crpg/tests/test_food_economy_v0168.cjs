'use strict';
const assert=require('node:assert/strict');
const {fresh,c}=require('./helpers_v011.cjs');
const G=c.CRPGRuntime.growthV01522,copy=x=>JSON.parse(JSON.stringify(x));
const owners=['PLAYER_CUSTOM','MOND_AMBER','LIYUE_ZHONGLI'];
function setup(level){
 const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');r.s.inventory=[];
 r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify({MOND_AMBER:{state:'JOINED'},LIYUE_ZHONGLI:{state:'JOINED'}});
 r.s.party=[{slot:'PARTY_1',type:'PLAYER',source:'PLAYER_CUSTOM',active:true,control:'PLAYER',tactic:'균형'},...owners.slice(1).map((source,i)=>({slot:'PARTY_'+(i+2),type:'CHAR',source,active:true,control:'AI',tactic:'균형'})),{slot:'PARTY_4',active:false}];
 r.s.global.PLAYER_LEVEL_STATE=level;r.s.global.PLAYER_XP_STATE=0;
 for(const owner of owners){r.s.ascensions[owner]=G.phaseFor(level);if(owner!=='PLAYER_CUSTOM')Object.assign(r.s.chars[owner],{level,xp:0});}
 r.recalculate();r.s.global.PLAYER_HP_CURRENT=1;for(const owner of owners.slice(1))r.s.chars[owner].hp=1;return r;
}
const actor=(r,id)=>id==='PLAYER_CUSTOM'?r.player():r.character(id);
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS',name);}
test('native food preserves low-level strength and restores comparable fractions at high level',()=>{
 const expected={1:[180,180,180],10:[420,420,420],20:[875,875,936],40:[2427,2427,2821],60:[5515,5515,6866]};
 for(const [lv,heals]of Object.entries(expected))for(let i=0;i<owners.length;i++){
  const r=setup(Number(lv)),owner=owners[i];r.giveItem('FOOD_SWEET_MADAME',1);
  const out=r.action('USE_ITEM',{item:'FOOD_SWEET_MADAME',owner}).result;
  assert.equal(actor(r,owner).hp-1,heals[i]);assert.equal(out.meals[0].requestedHealing,heals[i]);assert.equal(r.itemCount('FOOD_SWEET_MADAME'),0);
 }
 const a=setup(1),b=setup(60);
 for(const owner of owners){const fraction=r=>r.foodHealingAmount(180,owner)/actor(r,owner).maxHp;assert(Math.abs(fraction(a)-fraction(b))<.001);}
});
test('special food applies once, final healing rounds once, and save preserves consumed lot',()=>{
 const r=setup(60);r.giveItem('FOOD_SWEET_MADAME',1);r.s.specialFoodLots={FOOD_SWEET_MADAME:{BARBARA_SPECIAL:1}};
 const out=r.action('USE_ITEM',{item:'FOOD_SWEET_MADAME',variant:'BARBARA_SPECIAL'}).result;
 assert.equal(out.meals[0].requestedHealing,6066);assert.equal(r.player().hp,6067);assert.equal(r.itemCount('FOOD_SWEET_MADAME'),0);
 const loaded=new c.CRPGRuntime.Runtime(r.db,JSON.parse(r.serialize()));assert.equal(loaded.player().hp,6067);
});
test('HP cap, life bond absorption, KO and repeat locks still work atomically',()=>{
 const r=setup(60);r.giveItem('FOOD_SWEET_MADAME',3);r.s.playerStatuses=[{id:'STATUS_BOND_OF_LIFE',value:100}];
 const out=r.action('USE_ITEM',{item:'FOOD_SWEET_MADAME'}).result;assert.equal(out.meals[0].absorbed,100);assert.equal(r.player().hp,5416);
 const before=copy(r.s);assert.throws(()=>r.action('USE_ITEM',{item:'FOOD_SWEET_MADAME'}),e=>e.code==='MEAL_REPEAT');assert.deepEqual(copy(r.s),before);
 r.s.global.LAST_RECOVERY_MEAL_ITEM_ID='NONE';r.s.global.PLAYER_HP_CURRENT=r.player().maxHp-5;
 const capped=r.action('USE_ITEM',{item:'FOOD_SWEET_MADAME'}).result;assert.equal(capped.meals[0].healed,5);
 r.s.global.PLAYER_HP_CURRENT=0;const down=copy(r.s);assert.throws(()=>r.action('USE_ITEM',{item:'FOOD_SWEET_MADAME'}));assert.deepEqual(copy(r.s),down);
});
test('multi-recipient meal invalid target spends nothing; legal meal scales each owner separately',()=>{
 const r=setup(60);r.giveItem('FOOD_SWEET_MADAME',3);const before=copy(r.s);
 assert.throws(()=>r.action('MEAL_BATCH',{meals:[{owner:owners[0],item:'FOOD_SWEET_MADAME'},{owner:'NOT_OWNED',item:'FOOD_SWEET_MADAME'}]}));assert.deepEqual(copy(r.s),before);
 const out=r.action('MEAL_BATCH',{meals:owners.map(owner=>({owner,item:'FOOD_SWEET_MADAME'}))}).result;
 assert.equal(out.minutes,10);assert.deepEqual(Array.from(out.meals,x=>x.requestedHealing),[5515,5515,6866]);assert.equal(r.itemCount('FOOD_SWEET_MADAME'),0);
});
test('percentage medicine and buff foods retain their own effects',()=>{
 const r=setup(60),a=r.initCombatActor(copy(r.player()),1);a.hp=1;r.s.runtime={actors:[a],fields:[],round:1,log:[]};r.giveItem('TRPG_HEALING_POTION',1);
 r.executeCombatSystem(a,'ITEM:TRPG_HEALING_POTION',a.id);assert.equal(a.hp-1,Math.round(a.maxHp*.2));
 const x=setup(60);x.giveItem('FOOD_JADE_PARCELS',1);x.action('USE_ITEM',{item:'FOOD_JADE_PARCELS'});const ally=x.initCombatActor(copy(x.player()),1);x.s.runtime={actors:[ally],fields:[],round:1,log:[]};
 assert(Math.abs(x.combatStat(ally,'atk')/ally.atk-1.08)<1e-9);
});
test('attack and feast cooking both grant one extra dish per action, not per batch',()=>{
 for(const recipe of ['REC_FOOD_JADE_PARCELS','REC_FOOD_ADEPTUS_TEMPTATION']){
  const r=fresh();r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify({LIYUE_XIANGLING:{state:'JOINED'}});r.action('PARTY',{char:'LIYUE_XIANGLING',slot:2});
  const rec=r.recipeDefinition(recipe);for(const [id,n]of Object.entries(r.recipeCost(rec,2).items))r.giveItem(id,n);
  r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_SERVICE_MOND_COOK',mode:'CRAFT'});const out=r.action('CRAFT',{recipe,quantity:2}).result;assert.equal(out.quantity,3);
 }
});
test('buy, cook with bonus, and NPC resale no longer generates profit',()=>{
 for(const recipe of ['REC_FOOD_NATLAN_STEW','REC_FOOD_SNEZ_SLICED_SASHIMI'])for(const passive of [false,true]){
  const r=fresh();if(passive){r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify({LIYUE_XIANGLING:{state:'JOINED'}});r.action('PARTY',{char:'LIYUE_XIANGLING',slot:2});}
  const rec=r.recipeDefinition(recipe),cost=r.recipeCost(rec),cash=r.s.global.MORA;
  for(const [id,n]of Object.entries(cost.items)){
   const stocks=r.rows('19_SHOP_STOCK_DB').filter(x=>x[2]==='ITEM'&&x[3]===id&&Number(x[5])>0&&r.merchantOpen(x[1])&&!/SYSTEM_DISABLED/.test(x[8]||'')).sort((a,b)=>a[5]-b[5]);
   const stock=stocks[0],place=r.placeCatalog().find(x=>x.modes.includes('SHOP')&&r.placeStockMerchants(x).includes(stock[1])&&!r.placeAvailability(x));
   if(r.s.placeVisit)r.action('PLACE_LEAVE');r.action('PLACE_ENTER',{place:place.id,mode:'SHOP'});r.action('BUY',{stock:stock[0],quantity:n});
  }
  r.action('PLACE_LEAVE');r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_SERVICE_MOND_COOK',mode:'CRAFT'});const out=r.action('CRAFT',{recipe,quantity:1}).result;
  r.action('PLACE_LEAVE');r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_GENERAL',mode:'SHOP'});r.action('SELL',{item:rec[3],quantity:out.quantity});
  assert(r.s.global.MORA<=cash);if(passive)assert.equal(r.s.global.MORA,cash);
 }
});
test('Xiangling cooking bonus leaves a non-food fishing bait recipe usable',()=>{
 const r=fresh();r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify({LIYUE_XIANGLING:{state:'JOINED'}});r.action('PARTY',{char:'LIYUE_XIANGLING',slot:2});
 const rec=r.recipeDefinition('REC_CRPG_FRUIT_BAIT');for(const [id,n]of Object.entries(r.recipeCost(rec).items))r.giveItem(id,n);
 r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_SERVICE_MOND_COOK',mode:'CRAFT'});const out=r.action('CRAFT',{recipe:rec[0],quantity:1}).result;
 assert.equal(out.quantity,10);assert.equal(r.itemCount('CRPG_FRUIT_BAIT'),10);assert.equal(out.liyuePassive,undefined);
});
console.log('Food/economy regression:',passed,'passed');
