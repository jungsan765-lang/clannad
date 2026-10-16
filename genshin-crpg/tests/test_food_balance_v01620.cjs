'use strict';
// Synthetic ownership, legal levels/phase and imposed injury; every consumption,
// purchase, debit and receipt below uses the shipped Runtime. Small DOM checks
// execute existing numeric renderers, not a device/layout test.
const assert=require('node:assert/strict');
const {fresh,R,db,c,fs,path,root,vm}=require('./helpers_v011.cjs');
const Presenter=require('../source/inventory_presenter.js');
const copy=x=>JSON.parse(JSON.stringify(x)),G=c.CRPGRuntime.growthV01522;
const owners=['PLAYER_CUSTOM','MOND_AMBER','MOND_JEAN','LIYUE_ZHONGLI'];
const EXPECTED={
 TEA_BREAK_PANCAKE:90,SWEET_MADAME:180,HASH_BROWN:340,MATSUTAKE_ROLL:300,UNIVERSAL_PEACE:280,PIZZA:260,
 SAKURA_MOCHI:190,TAHCHIN:240,SNEZ_GLUPOV_RYE_BREAD:200,SNEZ_BERRY_ICE_CREAM:200,SNEZ_OLD_GARDEN_SAUSAGE:250,
 SNEZ_MEDOVIK:280,SNEZ_ZHARKOYE:320,STEAK:110,CHICKEN_SKEWER:120,MOND_GRILLED_FISH:120,RADISH_SOUP:110,
 MINT_JELLY:110,PANCAKE_TEA_BREAK:240,BOLOGNESE:210,APPLE_STEW:380,CHICKEN_BURGER:320,MORA_MEAT:120,
 STIR_FRIED_FILET:180,CRYSTAL_SHRIMP:220,VEGETARIAN_ABALONE:360,SQUIRREL_FISH:380,SHRIMP_BALLS:340,
 BAMBOO_SOUP:400,PERCH_STEW:440,CRAB_HAM_BAKE:400,POTATO_SHRIMP_PLATTER:340,GRILLED_TIGER_FISH:120,
 RICE_BUNS:110,FINE_TEA_FULL_MOON:280,JADEVEIN_TEA_EGGS:100,TEA_SMOKED_SQUAB:210,CHENYU_BREW:90,
 CRAB_ROE_TOFU:280,FULLMOON_EGG:420,FISH_NOODLES:360,HUMBLY_ENOUGH:340,HONEY_CHAR_SIU:120,
 LUCKY_SNOW_DELIGHT:440,GOLDEN_TEMPERED_JADE:180
};
const READY=[
 ['STK_MOND_SARA_EGG','FOOD_TEA_BREAK_PANCAKE',35,8],['STK_MOND_SARA_CHICKEN','FOOD_SWEET_MADAME',80,20],
 ['STK_MOND_SARA_POTATO','FOOD_HASH_BROWN',163,26],['STK_LY_WANMIN_MATSUTAKE','FOOD_MATSUTAKE_ROLL',150,30],
 ['STK_LY_WANMIN_PEACE','FOOD_UNIVERSAL_PEACE',315,45],['STK_CRPG_V011_MOND_RESTAURANT_FOOD_PIZZA','FOOD_PIZZA',130,16]
];
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
function setup(level=20){const r=fresh('MAP_MOND_CITY','ROUTE_TRAVELER');r.s.inventory=[];r.s.party=[r.s.party[0],...owners.slice(1).map((source,i)=>({slot:'PARTY_'+(i+2),type:'CHAR',source,active:true,control:'AI',tactic:'균형'}))];r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(Object.fromEntries(owners.slice(1).map(id=>[id,{state:'JOINED'}])));r.s.flags.FLAG_ACCESS_REGION_LIYUE=true;r.s.flags.FLAG_TRV_MON_CH1_CLEAR=true;r.s.flags.FLAG_TRV_MON_CH2_CLEAR=true;r.s.global.MORA=100000;for(const id of owners){if(id==='PLAYER_CUSTOM')r.s.global.PLAYER_LEVEL_STATE=level;else r.s.chars[id].level=level;r.s.ascensions[id]=G.phaseFor(level);}r.recalculate();for(const id of owners)setHp(r,id,r.economyOwner(id).maxHp);return r;}
function setHp(r,id,hp){if(id==='PLAYER_CUSTOM')r.s.global.PLAYER_HP_CURRENT=hp;else r.s.chars[id].hp=hp;}
function failed(r,type,args,code){const before=r.serialize();assert.throws(()=>r.action(type,args),e=>!code||e.code===code);assert.equal(r.serialize(),before);}
function shop(r,stock){const row=r.row('19_SHOP_STOCK_DB',stock),place=r.placeCatalog().find(p=>p.merchant===row[1]);assert(place,stock);r.s.global.CURRENT_MAP_ID=place.maps[0];r.s.global.SCREEN_MODE='LOCATION';r.action('PLACE_ENTER',{place:place.id,mode:'SHOP'});return place;}
function intent(r,type,args){return{id:r.s.global.SAVE_ID+':'+(r.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:r.s.global.SAVE_REVISION,type,...args};}

test('all 45 existing healing foods use the approved numeric strengths and native single-serving effects',()=>{
 const r=setup(),food=r.rows('14_ITEM_DB').filter(x=>x[2]==='음식'&&Number(x[8])>0);assert.equal(food.length,45);assert.equal(Object.keys(EXPECTED).length,45);
 for(const row of food){const value=EXPECTED[row[0].slice(5)];assert.equal(row[8],value,row[0]);assert.equal(r.foodSpec(row[0]).heal,value);assert.equal(row[10],'N');assert(!row[9]);r.s.global.LAST_RECOVERY_MEAL_ITEM_ID='NONE';setHp(r,'PLAYER_CUSTOM',1);r.giveItem(row[0],1);const out=r.action('USE_ITEM',{item:row[0],variant:'NORMAL'}).result;assert.equal(out.meals[0].requestedHealing,r.foodHealingAmount(value));assert.equal(out.meals[0].healed,r.foodHealingAmount(value));assert.equal(out.minutes,10);assert.equal(r.itemCount(row[0]),0);}
});

test('rare additions reward the same two fish more than two plain grilled-fish servings',()=>{
 const r=setup(60),a=r.recipeCost(r.recipeDefinition('REC_FOOD_FISH_NOODLES')),b=r.recipeCost(r.recipeDefinition('REC_FOOD_MOND_GRILLED_FISH'),2);
 assert.equal(a.items.ING_FISH,b.items.ING_FISH);assert.equal(a.items.ING_FISH,2);assert.equal(a.items.ING_SNAPDRAGON,2);assert.equal(a.items.ING_RICE,2);
 const advanced=r.foodHealingAmount(r.foodSpec('FOOD_FISH_NOODLES').heal),simple=r.foodHealingAmount(r.foodSpec('FOOD_MOND_GRILLED_FISH').heal)*2;
 assert(advanced>simple*1.49);assert(r.foodSpec('FOOD_PERCH_STEW').heal>r.foodSpec('FOOD_PANCAKE_TEA_BREAK').heal);assert(r.foodSpec('FOOD_VEGETARIAN_ABALONE').heal>r.foodSpec('FOOD_PANCAKE_TEA_BREAK').heal);
});

test('current ingredient closure supplies 43 recipes while both future ingredients retain unchanged food strengths',()=>{
 const r=setup(),regions=new Set(['몬드','리월']),merchants=new Set(r.placeCatalog().filter(p=>p.maps.some(id=>regions.has(r.row('32_MAP_DB',id)[1]))).flatMap(p=>r.placeStockMerchants(p))),available=new Set(r.rows('19_SHOP_STOCK_DB').filter(s=>s[2]==='ITEM'&&merchants.has(s[1])&&!/SYSTEM_DISABLED|레거시|사용 금지/.test(s[8]||'')).map(s=>s[3]));
 for(const m of r.rows('32_MAP_DB'))if(regions.has(m[1]))for(const kind of ['GATHER','HUNT','FISH','MINE'])for(const x of r.lifePool(kind,m[0]))available.add(x.item);
 const recipes=r.rows('17_RECIPE_DB').filter(q=>q[2]==='ITEM'&&!/사용 금지|레거시/.test(q[18]||''));let changed=true;while(changed){changed=false;for(const q of recipes)if(!available.has(q[3])&&Object.keys(r.recipeCost(q).items).every(id=>available.has(id))){available.add(q[3]);changed=true;}}
 const healing=recipes.filter(q=>Number(r.row('14_ITEM_DB',q[3])[8])>0&&r.row('14_ITEM_DB',q[3])[2]==='음식'),missing=healing.filter(q=>Object.keys(r.recipeCost(q).items).some(id=>!available.has(id))).map(q=>q[3]).sort();assert.equal(healing.length-missing.length,43);assert.deepEqual(missing,['FOOD_SNEZ_BERRY_ICE_CREAM','FOOD_SNEZ_GLUPOV_RYE_BREAD']);for(const id of missing)assert.equal(r.foodSpec(id).heal,200);
});

test('runtime table clones preserve shared authored DB, table/row parity and independent runtimes',()=>{
 const original=JSON.stringify(db),r=setup(),other=setup();assert.notEqual(r.db,db);assert.notEqual(r.db['14_ITEM_DB'],db['14_ITEM_DB']);assert.equal(JSON.stringify(db),original);
 for(const key of ['14_ITEM_DB','19_SHOP_STOCK_DB'])for(const row of r.rows(key))assert.strictEqual(r.tables[key].get(row[0]),row);
 const row=r.row('14_ITEM_DB','FOOD_HASH_BROWN'),independent=other.row('14_ITEM_DB','FOOD_HASH_BROWN');assert.notStrictEqual(row,independent);row[8]=1;assert.equal(independent[8],340);assert.equal(db['14_ITEM_DB'].find(x=>x[0]==='FOOD_HASH_BROWN')[8],220);
});

test('install is idempotent and a new Runtime from a normalized runtime DB never reprices twice',()=>{
 const r=setup(),before=JSON.stringify(r.db);r.installFoodBalance();r.installGrowthContent();assert.equal(JSON.stringify(r.db),before);
 const loaded=new R(r.db,JSON.parse(r.serialize()));for(const [stock,food,price,cap]of READY){assert.equal(loaded.row('19_SHOP_STOCK_DB',stock)[5],price);assert.equal(loaded.saleUnitPrice({item:food}),cap);}assert.equal(loaded.foodSpec('FOOD_PERCH_STEW').heal,440);
});

test('each prepared-food BUY charges the new SKU price and sale preserves the old effective cap',()=>{
 for(const [stock,food,price,cap]of READY){const r=setup();shop(r,stock);const start=r.s.global.MORA,remaining=r.stockRemaining(r.row('19_SHOP_STOCK_DB',stock));const receipt=r.action('BUY',{stock,quantity:1}).result;assert.equal(receipt.cost,price);assert.equal(start-r.s.global.MORA,price);assert.equal(r.itemCount(food),1);assert.equal(r.stockRemaining(r.row('19_SHOP_STOCK_DB',stock)),remaining-1);assert.equal(r.row('14_ITEM_DB',food)[15],price);assert.equal(r.saleUnitPrice({item:food}),cap);const sold=r.action('SELL',{item:food,quantity:1,variant:'NORMAL'}).result;assert.equal(sold.mora,cap);assert.equal(r.s.global.MORA,start-price+cap);assert.equal(r.itemCount(food),0);}
});

test('changed prepared-price replay preserves an explicitly historical settled receipt',()=>{
 const r=setup();shop(r,'STK_MOND_SARA_POTATO');const action=intent(r,'BUY',{stock:'STK_MOND_SARA_POTATO',quantity:1}),settled=r.transact(action),legacy=JSON.parse(r.serialize()),old=copy(settled);
 // Historical contract fixture: settled before the price adjustment, not an
 // archived playthrough and never a request to recompute existing receipts.
 old.result.cost=105;legacy.global.MORA+=163-105;legacy.global.LAST_ACTION_RECEIPT_JSON=JSON.stringify(old);const loaded=new R(db,legacy),before=loaded.serialize();assert.deepEqual(copy(loaded.transact(action)),old);assert.equal(loaded.serialize(),before);assert.equal(loaded.itemCount('FOOD_HASH_BROWN'),1);assert.equal(loaded.row('19_SHOP_STOCK_DB',action.stock)[5],163);
});

test('new and explicit old healing receipts replay without another serving or HP change',()=>{
 const r=setup(60);setHp(r,'PLAYER_CUSTOM',1);r.giveItem('FOOD_HASH_BROWN',2);const action=intent(r,'USE_ITEM',{item:'FOOD_HASH_BROWN',variant:'NORMAL'}),settled=r.transact(action),newSave=r.serialize();assert.deepEqual(copy(r.transact(action)),copy(settled));assert.equal(r.serialize(),newSave);
 const legacy=JSON.parse(newSave),old=copy(settled),oldHeal=r.foodHealingAmount(220);old.result.meals[0].requestedHealing=oldHeal;old.result.meals[0].healed=oldHeal;legacy.global.PLAYER_HP_CURRENT=1+oldHeal;legacy.global.LAST_ACTION_RECEIPT_JSON=JSON.stringify(old);const loaded=new R(db,legacy),before=loaded.serialize();assert.deepEqual(copy(loaded.transact(action)),old);assert.equal(loaded.serialize(),before);assert.equal(loaded.itemCount('FOOD_HASH_BROWN'),1);assert.equal(loaded.foodSpec('FOOD_HASH_BROWN').heal,340);
});

test('Barbara special lots scale the new base once and persist exact consumption',()=>{
 const r=setup(60);r.giveItem('FOOD_VEGETARIAN_ABALONE',2);r.s.specialFoodLots={FOOD_VEGETARIAN_ABALONE:{BARBARA_SPECIAL:1}};setHp(r,'MOND_JEAN',1);const lots=copy(r.foodLots('FOOD_VEGETARIAN_ABALONE'));assert.equal(lots.find(x=>x.variant==='NORMAL').heal,360);assert.equal(lots.find(x=>x.variant==='BARBARA_SPECIAL').heal,396);
 const out=r.action('USE_ITEM',{item:'FOOD_VEGETARIAN_ABALONE',owner:'MOND_JEAN',variant:'BARBARA_SPECIAL'}).result;assert.equal(out.meals[0].requestedHealing,r.foodHealingAmount(396,'MOND_JEAN'));assert.equal(r.itemCount('FOOD_VEGETARIAN_ABALONE'),1);assert(!r.s.specialFoodLots.FOOD_VEGETARIAN_ABALONE);const loaded=new R(db,JSON.parse(r.serialize()));assert.equal(loaded.foodLots('FOOD_VEGETARIAN_ABALONE')[0].variant,'NORMAL');assert.equal(loaded.foodLots('FOOD_VEGETARIAN_ABALONE')[0].heal,360);
});

test('per-recipient level and phase scaling, HP caps and life-bond absorption remain exact',()=>{
 const r=setup(),levels=[5,10,30,60];owners.forEach((id,i)=>{if(id==='PLAYER_CUSTOM')r.s.global.PLAYER_LEVEL_STATE=levels[i];else r.s.chars[id].level=levels[i];r.s.ascensions[id]=G.phaseFor(levels[i]);});r.recalculate();owners.forEach(id=>setHp(r,id,1));r.giveItem('FOOD_PERCH_STEW',4);const expected=owners.map(id=>r.foodHealingAmount(440,id)),out=r.action('MEAL_BATCH',{meals:owners.map(owner=>({owner,item:'FOOD_PERCH_STEW'}))}).result;assert.deepEqual(Array.from(out.meals,x=>x.requestedHealing),expected);assert.equal(out.minutes,10);
 const q=setup(60);setHp(q,'MOND_AMBER',q.economyOwner('MOND_AMBER').maxHp-7);q.s.chars.MOND_AMBER.statuses=[{id:'STATUS_BOND_OF_LIFE',value:100}];q.giveItem('FOOD_PERCH_STEW',1);const result=q.action('USE_ITEM',{item:'FOOD_PERCH_STEW',owner:'MOND_AMBER'}).result.meals[0];assert.equal(result.absorbed,100);assert.equal(result.healed,7);assert.equal(q.itemCount('FOOD_PERCH_STEW'),0);
});

test('KO, combat, repeat and invalid-target failures remain atomic with stronger foods',()=>{
 const r=setup(60);r.giveItem('FOOD_PERCH_STEW',4);setHp(r,'PLAYER_CUSTOM',1);setHp(r,'MOND_AMBER',0);failed(r,'MEAL_BATCH',{meals:[{owner:'PLAYER_CUSTOM',item:'FOOD_PERCH_STEW'},{owner:'MOND_AMBER',item:'FOOD_PERCH_STEW'}]},'TARGET_DOWN');r.action('USE_ITEM',{item:'FOOD_PERCH_STEW'});failed(r,'USE_ITEM',{item:'FOOD_PERCH_STEW'},'MEAL_REPEAT');failed(r,'USE_ITEM',{item:'FOOD_PERCH_STEW',owner:'NOT_OWNED'},'OWNER');r.giveItem('FOOD_HASH_BROWN',1);r.action('USE_ITEM',{item:'FOOD_HASH_BROWN'});setHp(r,'PLAYER_CUSTOM',1);r.action('USE_ITEM',{item:'FOOD_PERCH_STEW'});
 const b=setup();b.giveItem('FOOD_PERCH_STEW',1);b.startBattle('EG_MOND_SLIME_SMALL','EXPLICIT');failed(b,'USE_ITEM',{item:'FOOD_PERCH_STEW'},'ACTION_LOCK');
});

test('recovery crafting retains its fixed charges, material quantities and one-serving output',()=>{
 for(const [recipe,mora,items]of [['REC_FOOD_FISH_NOODLES',3,{ING_SNAPDRAGON:2,ING_FISH:2,ING_RICE:2}],['REC_FOOD_PERCH_STEW',2,{ING_FISH:3,MAT_LIYUE_JUEYUN_CHILI:1,ING_SALT:1,MAT_LIYUE_VIOLETGRASS:1}],['REC_FOOD_SWEET_MADAME',4,{ING_FOWL:2,ING_SWEET_FLOWER:2}]]){const r=setup(),q=r.recipeDefinition(recipe),usage=JSON.parse(r.s.global.SHOP_STOCK_USAGE_STATE||'{}');for(const m of String(q[18]).matchAll(/STK_\w+/g))usage[m[0]+'|PERMANENT']=1;r.s.global.SHOP_STOCK_USAGE_STATE=JSON.stringify(usage);assert.deepEqual(copy(r.recipeCost(q)),{mora,items});for(const [id,n]of Object.entries(items))r.giveItem(id,n);r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_SERVICE_MOND_COOK',mode:'CRAFT'});const before=r.s.global.MORA,out=r.action('CRAFT',{recipe,quantity:1}).result;assert.equal(out.quantity,1);assert.equal(before-r.s.global.MORA,mora);assert.equal(r.itemCount(q[3]),1);assert.equal(r.foodSpec(q[3]).heal,EXPECTED[q[3].slice(5)]);}
});

function element(tag='div',className='',text=''){const e={tagName:tag.toUpperCase(),className,textContent:String(text),children:[],dataset:{},style:{setProperty(){}},append(...nodes){for(const n of nodes)if(n&&typeof n==='object')n.parentNode=this;this.children.push(...nodes);},replaceChildren(...nodes){this.children=[];this.append(...nodes);},setAttribute(){},querySelectorAll(selector){return descendants(this).filter(x=>selector[0]==='.'?x.className.split(/\s+/).includes(selector.slice(1)):x.tagName===selector.toUpperCase());},querySelector(selector){return this.querySelectorAll(selector)[0]||null;},classList:{toggle(){},add(){},contains(){return false;}}};Object.defineProperty(e,'nextElementSibling',{get(){const siblings=this.parentNode?.children||[];return siblings[siblings.indexOf(this)+1];}});return e;}
function descendants(e){return e.children.flatMap(x=>x&&typeof x==='object'?[x,...descendants(x)]:[]);}
function extract(file,start,end){const s=fs.readFileSync(path.join(root,'source',file),'utf8');return s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)));}

test('inventory numeric renderer follows new normal/special base and each selected recipient',()=>{
 const r=setup(60);r.giveItem('FOOD_PERCH_STEW',2);r.s.specialFoodLots={FOOD_PERCH_STEW:{BARBARA_SPECIAL:1}};for(const id of owners)setHp(r,id,1);const presenter=Presenter.create(r.db),normal=presenter.itemDetail({item:'FOOD_PERCH_STEW',quantity:1}),special=presenter.itemDetail({item:'FOOD_PERCH_STEW',quantity:1},{variant:'BARBARA_SPECIAL'});assert.equal(normal.heal,440);assert.equal(special.heal,484);assert.equal(special.fields.find(x=>x.label==='회복량').value,'484');
 const ctx={game:r,el:element,tierMark:x=>x,ownerName:id=>id,busy:false,showArt:false,button:(text,onclick)=>Object.assign(element('button','',text),{onclick}),act(){}};vm.runInNewContext(extract('app_experience.js','function itemDetailView(box,d){','\ninventory=function(p)'),ctx);const box=element();ctx.itemDetailView(box,special);const reading=()=>{const dt=box.querySelectorAll('dt').find(x=>x.textContent==='회복량');return Number(dt.nextElementSibling.textContent);};assert.equal(reading(),r.foodHealingAmount(484));const targets=box.querySelector('.item-use-targets');for(const id of owners){const button=targets.children.find(x=>x.children.some(y=>y.textContent===id));assert(button,id);button.onclick();assert.equal(reading(),r.foodHealingAmount(484,id));}
});

test('existing cooking and Abyss numeric labels use canonical base and the actual recipient',()=>{
 const r=setup(60),q=r.recipeDefinition('REC_FOOD_PERCH_STEW');r.giveItem('FOOD_PERCH_STEW',1);const ctx={game:r,STATUS_KIND:{},STARS:{일반:1,고급:2,희귀:3,전설:4}};vm.runInNewContext(extract('app_cooking.js','function dishInfo(x){','\nfunction chip(id,need)'),ctx);const info=ctx.dishInfo({row:q,reason:''});assert.equal(info.heal,440);assert.equal(ctx.effectLine(info),'HP '+r.foodHealingAmount(440)+' 회복 · 주인공 기준');vm.runInNewContext(extract('app_abyss.js','function foodLabel(row,owner){','\nfunction foods()'),ctx);for(const id of owners)assert(ctx.foodLabel(r.row('14_ITEM_DB','FOOD_PERCH_STEW'),id).includes('HP '+r.foodHealingAmount(440,id)+' 회복'));
 r.giveItem('FOOD_PERCH_STEW',1);r.s.specialFoodLots={FOOD_PERCH_STEW:{BARBARA_SPECIAL:1}};for(const id of owners)assert(ctx.foodLabel(r.row('14_ITEM_DB','FOOD_PERCH_STEW'),id).includes('HP '+r.foodHealingAmount(440,id)+' 회복'));setHp(r,'PLAYER_CUSTOM',1);const normal=r.action('USE_ITEM',{item:'FOOD_PERCH_STEW'}).result.meals[0];assert.equal(normal.variant,'NORMAL');assert.equal(normal.requestedHealing,r.foodHealingAmount(440));assert.equal(r.itemCount('FOOD_PERCH_STEW'),1);
 for(const id of owners)assert(ctx.foodLabel(r.row('14_ITEM_DB','FOOD_PERCH_STEW'),id).includes('HP '+r.foodHealingAmount(484,id)+' 회복'));setHp(r,'MOND_AMBER',1);const special=r.action('USE_ITEM',{item:'FOOD_PERCH_STEW',owner:'MOND_AMBER'}).result.meals[0];assert.equal(special.variant,'BARBARA_SPECIAL');assert.equal(special.requestedHealing,r.foodHealingAmount(484,'MOND_AMBER'));
});
console.log('Food balance v0.16.20 regression:',passed,'passed');
