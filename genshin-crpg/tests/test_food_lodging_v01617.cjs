'use strict';
// Native quotes, payment, saved receipts and the existing cooking renderer.
// Ownership/recipe purchases in these fixtures are synthetic. No live account,
// browser layout or device behavior is asserted by the small DOM renderer.
const assert=require('node:assert/strict');
const {fresh,R,db,c,fs,path,root,vm}=require('./helpers_v011.cjs');
const copy=x=>JSON.parse(JSON.stringify(x)),PLAYER='PLAYER_CUSTOM';
const FEES={
 TEA_BREAK_PANCAKE:4,SWEET_MADAME:4,HASH_BROWN:2,MATSUTAKE_ROLL:2,
 UNIVERSAL_PEACE:3,PIZZA:4,SAKURA_MOCHI:3,TAHCHIN:3,
 SNEZ_GLUPOV_RYE_BREAD:3,SNEZ_BERRY_ICE_CREAM:3,SNEZ_OLD_GARDEN_SAUSAGE:4,
 SNEZ_MEDOVIK:3,SNEZ_ZHARKOYE:3,STEAK:4,CHICKEN_SKEWER:3,
 MOND_GRILLED_FISH:3,RADISH_SOUP:4,MINT_JELLY:4,PANCAKE_TEA_BREAK:3,
 BOLOGNESE:4,APPLE_STEW:3,CHICKEN_BURGER:4,MORA_MEAT:4,
 STIR_FRIED_FILET:3,CRYSTAL_SHRIMP:4,VEGETARIAN_ABALONE:2,
 SQUIRREL_FISH:3,SHRIMP_BALLS:3,BAMBOO_SOUP:3,PERCH_STEW:2,
 CRAB_HAM_BAKE:3,POTATO_SHRIMP_PLATTER:4,GRILLED_TIGER_FISH:3,
 RICE_BUNS:3,FINE_TEA_FULL_MOON:3,JADEVEIN_TEA_EGGS:3,
 TEA_SMOKED_SQUAB:3,CHENYU_BREW:3,CRAB_ROE_TOFU:3,FULLMOON_EGG:3,
 FISH_NOODLES:3,HUMBLY_ENOUGH:3,HONEY_CHAR_SIU:3,
 LUCKY_SNOW_DELIGHT:2,GOLDEN_TEMPERED_JADE:4
};
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
function unlock(r,recipe){
 const used=JSON.parse(r.s.global.SHOP_STOCK_USAGE_STATE||'{}');
 for(const match of String(recipe[18]||'').matchAll(/STK_\w+/g))used[match[0]+'|PERMANENT']=1;
 r.s.global.SHOP_STOCK_USAGE_STATE=JSON.stringify(used);
}
function kitchen(recipe='REC_FOOD_SWEET_MADAME',quantity=1,level=1){
 const r=fresh();r.s.inventory=[];r.adminApply({op:'level',target:PLAYER,value:level});
 const row=r.recipeDefinition(recipe);unlock(r,row);
 for(const [id,n]of Object.entries(r.recipeCost(row,quantity).items))r.giveItem(id,n);
 r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_SERVICE_MOND_COOK',mode:'CRAFT'});
 r.s.global.MORA=10000;return r;
}
function intent(r,type,params){return {id:r.s.global.SAVE_ID+':'+(r.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:r.s.global.SAVE_REVISION,type,...params};}
function unchangedFailure(r,type,params,code){const before=r.serialize();assert.throws(()=>r.action(type,params),e=>!code||e.code===code);assert.equal(r.serialize(),before);}

test('all 45 recovery recipes charge the fixed quoted fee once per craft and leave raw DB rows intact',()=>{
 const sample=fresh(),healing=sample.rows('14_ITEM_DB').filter(x=>x[2]==='음식'&&Number(x[8])>0);
 assert.equal(healing.length,45);assert.equal(Object.keys(FEES).length,healing.length);
 for(const food of healing){
  const fee=FEES[food[0].slice(5)],recipe=sample.rows('17_RECIPE_DB').find(x=>x[2]==='ITEM'&&x[3]===food[0]);
  assert(Number.isSafeInteger(fee)&&fee>0,food[0]);assert(recipe,food[0]);
  const r=kitchen(recipe[0],2),raw=r.row('17_RECIPE_DB',recipe[0]),beforeRow=copy(raw),canonical=r.recipeDefinition(recipe[0]);
  assert.notEqual(canonical,raw);assert.equal(canonical[15],fee);
  const quote=copy(r.recipeCost(raw,2));assert.equal(quote.mora,fee*2);
  const before=r.s.global.MORA,out=r.action('CRAFT',{recipe:recipe[0],quantity:2}).result;
  assert.deepEqual(copy(out.cost),quote);assert.equal(out.quantity,2);assert.equal(out.crafts,2);
  assert.equal(before-r.s.global.MORA,fee*2);assert.equal(r.itemCount(food[0]),2);
  for(const id of Object.keys(quote.items))assert.equal(r.itemCount(id),0);
  assert.deepEqual(copy(raw),beforeRow);assert.equal(raw[15],0);
 }
});

test('raw or stale recipe input cannot bypass the canonical fee and low/high-level cooking pays equally',()=>{
 for(const level of [1,20,40,60]){
  const r=kitchen('REC_FOOD_HASH_BROWN',3,level),stale=r.row('17_RECIPE_DB','REC_FOOD_HASH_BROWN').slice();stale[15]=0;
  assert.equal(r.recipeCost(stale,3).mora,6);const before=r.s.global.MORA;
  assert.equal(r.action('CRAFT',{recipe:stale[0],quantity:3}).result.cost.mora,6);assert.equal(before-r.s.global.MORA,6);
 }
});

test('Mora shortage and ingredient shortage roll back the entire public crafting action',()=>{
 const r=kitchen('REC_FOOD_SWEET_MADAME',2);r.s.global.MORA=7;
 unchangedFailure(r,'CRAFT',{recipe:'REC_FOOD_SWEET_MADAME',quantity:2},'COST');
 r.s.global.MORA=8;r.pay({items:{ING_FOWL:1}});
 unchangedFailure(r,'CRAFT',{recipe:'REC_FOOD_SWEET_MADAME',quantity:2},'COST');
 assert.equal(r.itemCount('FOOD_SWEET_MADAME'),0);assert.equal(r.s.global.MORA,8);
});

test('new paid crafting receipts replay before and after reload without a second debit or output',()=>{
 let r=kitchen('REC_FOOD_SWEET_MADAME',2);r.s.global.MORA=8;
 const action=intent(r,'CRAFT',{recipe:'REC_FOOD_SWEET_MADAME',quantity:2}),receipt=r.transact(action),saved=r.serialize();
 assert.equal(receipt.result.cost.mora,8);assert.equal(r.s.global.MORA,0);
 assert.deepEqual(copy(r.transact(action)),copy(receipt));assert.equal(r.serialize(),saved);
 r=new R(db,JSON.parse(saved));const loaded=r.serialize();assert.deepEqual(copy(r.transact(action)),copy(receipt));assert.equal(r.serialize(),loaded);
});

test('a historical zero-fee crafting receipt retains its settled price when saved and retried',()=>{
 // Compatibility fixture: the old contract charged only ingredients. This is
 // an explicit legacy receipt fixture, not an archived historical playthrough.
 const r=kitchen('REC_FOOD_SWEET_MADAME',1),action=intent(r,'CRAFT',{recipe:'REC_FOOD_SWEET_MADAME',quantity:1});
 const settled=r.transact(action),legacy=JSON.parse(r.serialize());
 const old=copy(settled);old.result.cost.mora=0;legacy.global.MORA+=4;
 legacy.global.LAST_ACTION_RECEIPT_JSON=JSON.stringify(old);
 const restored=new R(db,legacy),before=restored.serialize();
 assert.deepEqual(copy(restored.transact(action)),old);assert.equal(restored.serialize(),before);
 assert.equal(restored.itemCount('FOOD_SWEET_MADAME'),1);assert.equal(restored.s.global.MORA,10000);
 assert.equal(restored.recipeCost(restored.row('17_RECIPE_DB',action.recipe)).mora,4);
});

test('recovery strength, alternating-meal restriction and inn quote retain their existing level behavior',()=>{
 const G=c.CRPGRuntime.growthV01522;
 for(const level of [1,10,20,40,60]){
  const r=fresh();r.s.inventory=[];r.adminApply({op:'level',target:PLAYER,value:level});const phase=G.phaseFor(level);
  assert.equal(r.foodHealingAmount(180),Math.round(180*G.hpCurve(level)*(1+.16*phase)));
  r.s.global.PLAYER_HP_CURRENT=1;r.giveItem('FOOD_SWEET_MADAME',2);r.giveItem('FOOD_HASH_BROWN',1);
  const beforeQuote=r.innRecoveryQuote(r.row('19_SHOP_STOCK_DB','STK_INN_MOND'));
  assert.equal(beforeQuote.cost,20+Math.ceil(4*level*(r.player().maxHp-1)/r.player().maxHp));
  const wallet=r.s.global.MORA,out=r.action('USE_ITEM',{item:'FOOD_SWEET_MADAME'}).result;
  assert.equal(out.meals[0].requestedHealing,r.foodHealingAmount(180));assert.equal(r.s.global.MORA,wallet);
  unchangedFailure(r,'USE_ITEM',{item:'FOOD_SWEET_MADAME'},'MEAL_REPEAT');
  r.action('USE_ITEM',{item:'FOOD_HASH_BROWN'});r.action('USE_ITEM',{item:'FOOD_SWEET_MADAME'});
  assert.equal(r.itemCount('FOOD_SWEET_MADAME'),0);assert.equal(r.s.global.MORA,wallet);
 }
});

test('unchanged buff and processing fees and shifted recipe adapters remain canonical',()=>{
 const r=fresh();
 for(const raw of r.rows('17_RECIPE_DB')){
  const row=r.recipeDefinition(raw[0]),food=row[2]==='ITEM'?r.tables['14_ITEM_DB'].get(row[3]):null;
  if(row[1]==='요리'&&food?.[2]==='음식'&&Number(food[8])>0)continue;
  const shifted=['REC_PROCESS_BUTTER','REC_PROCESS_CHEESE','REC_PROCESS_HAM','REC_PROCESS_SAUSAGE','REC_ALCH_HEALING_POTION','REC_MEDICAL_BANDAGE'].includes(raw[0])&&raw[15]==null&&Number.isFinite(raw[16])&&/^\d+(분|시간)$/.test(raw[20]||'')&&Number(raw[21])===100;
  assert.equal(row[15],shifted?raw[16]:raw[15],raw[0]);
 }
 for(const id of ['REC_FOOD_JADE_PARCELS','REC_FOOD_ADEPTUS_TEMPTATION','REC_PROCESS_BUTTER','REC_PROCESS_CHEESE']){
  const row=r.recipeDefinition(id);assert.equal(r.recipeCost(r.row('17_RECIPE_DB',id),3).mora,row[15]*3);
 }
});

test('Barbara cooking retains one 10 percent special lot and the same fixed fee',()=>{
 const r=kitchen('REC_FOOD_SWEET_MADAME',2,60);r.adminApply({op:'recruit',char:'MOND_BARBARA'});r.action('PARTY',{char:'MOND_BARBARA',slot:2});
 const out=r.action('CRAFT',{recipe:'REC_FOOD_SWEET_MADAME',quantity:2}).result;
 assert.equal(out.cost.mora,8);assert.equal(out.quantity,2);assert.equal(out.outputVariant,'BARBARA_SPECIAL');
 r.s.global.PLAYER_HP_CURRENT=1;const normal=r.foodHealingAmount(180),meal=r.action('USE_ITEM',{item:'FOOD_SWEET_MADAME',variant:'BARBARA_SPECIAL'}).result;
 assert.equal(meal.meals[0].requestedHealing,r.foodHealingAmount(180*1.1));assert(meal.meals[0].requestedHealing>normal);
 assert.equal(r.s.specialFoodLots.FOOD_SWEET_MADAME.BARBARA_SPECIAL,1);
});

function element(tag='div',cls='',text=''){
 const classes=new Set(cls.split(/\s+/).filter(Boolean));return {tagName:tag.toUpperCase(),className:cls,textContent:text,children:[],dataset:{},disabled:false,
 append(...nodes){this.children.push(...nodes);},setAttribute(){},
 classList:{contains:k=>classes.has(k),toggle(k,on){if(on)classes.add(k);else classes.delete(k);}}
 };
}
function descendants(n){return n.children.flatMap(x=>typeof x==='object'?[x,...descendants(x)]:[]);}
function renderCooking(r){
 const page=element(),ctx={game:r,el:element,crafting(){},placeHeader:()=>r.currentPlace().entry,presenterDB:r.db,MANIFEST:{},render(){},busy:false,
  safeName:(table,id)=>r.tables[table]?.get(id)?.[1]||id,tierMark:n=>n,
  itemPresenter:{itemDetail:x=>({id:x.item,name:r.row('14_ITEM_DB',x.item)[1],icon:null})},itemGlyph:()=>element('span'),
  currencyIcon:(_id,cls)=>element('img',cls),button:(text,fn)=>Object.assign(element('button','',text),{onclick:fn}),
  actionButton:(text,type,params,enabled=true)=>Object.assign(element('button','',text),{type,params,disabled:!enabled})};
 vm.runInNewContext(fs.readFileSync(path.join(root,'source/app_cooking.js'),'utf8'),ctx);ctx.crafting(page);return page;
}
function recipeCard(page,id){return descendants(page).find(x=>x.dataset.recipeId===id);}
function actionButtons(card){return descendants(card).filter(x=>x.tagName==='BUTTON'&&x.type==='CRAFT');}

test('the existing cooking card shows exact unit Mora and restricts batches to affordable crafts',()=>{
 for(const [mora,count]of [[0,0],[3,0],[4,1],[7,1],[8,2],[11,2],[20,5]]){
  const r=kitchen('REC_FOOD_SWEET_MADAME',10);r.s.global.MORA=mora;
  const card=recipeCard(renderCooking(r),'REC_FOOD_SWEET_MADAME'),buttons=actionButtons(card);
  assert(card);assert.equal(buttons[0].disabled,count===0);assert.equal(buttons.length,count>1?2:1);
  if(count>1)assert.equal(buttons[1].params.quantity,count);
  const label=descendants(card).find(x=>x.classList.contains('cook-chip-name')&&x.textContent==='모라');assert(label);
  const moraChip=descendants(card).find(x=>x.classList.contains('cook-chip')&&x.children.includes(label));
  assert.equal(moraChip.children.find(x=>x.classList.contains('cook-chip-count')).textContent,mora+'/4');
  assert.equal(moraChip.classList.contains('short'),mora<4);
  if(count){const before=r.s.global.MORA,out=r.action('CRAFT',buttons[buttons.length-1].params).result;assert.equal(before-r.s.global.MORA,out.cost.mora);assert.equal(out.crafts,count);}
 }
});

test('zero-fee cooking keeps its old material-limited batch and does not add a Mora chip',()=>{
 const r=kitchen('REC_FOOD_JADE_PARCELS',4);r.s.global.MORA=0;
 const card=recipeCard(renderCooking(r),'REC_FOOD_JADE_PARCELS'),buttons=actionButtons(card);
 assert.equal(buttons[0].disabled,false);assert.equal(buttons[1].params.quantity,4);
 assert(!descendants(card).some(x=>x.classList.contains('cook-chip-name')&&x.textContent==='모라'));
 assert.equal(r.action('CRAFT',buttons[1].params).result.cost.mora,0);
});
console.log('Food/lodging 0.16.17 regression:',passed,'passed');
