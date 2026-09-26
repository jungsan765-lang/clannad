'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const base = path.resolve(__dirname, '..'), ctx = vm.createContext({ console });
for (const file of ['source/runtime.js', 'source/runtime_extensions.js', 'source/runtime_story.js', 'source/runtime_combat.js', 'source/runtime_mond_cards.js', 'source/runtime_economy.js', 'source/runtime_passives.js']) vm.runInContext(fs.readFileSync(path.join(base, file), 'utf8'), ctx, { filename: file });
const db = JSON.parse(fs.readFileSync(path.join(base, 'content/db.json'))), R = ctx.CRPGRuntime.Runtime;
const clone = x => JSON.parse(JSON.stringify(x));
const fresh = (data = db) => { const r = new R(data); r.newGame({ name: '시험', route: 'ROUTE_TRAVELER', seed: 99, saveId: 'PASSIVES_TEST' }); r.s.global.CURRENT_MAP_ID = 'MAP_MOND_CITY'; r.s.global.WORLD_TIME = '12:00'; r.s.global.SCREEN_MODE = 'HUB'; r.s.global.MORA = 10000; return r; };
const join = (r, id, slot = 2) => { r.unlockCharacter(id); r.action('PARTY', { char: id, slot }); };
const rejectAtomic = (r, type, data, code) => { const before = r.serialize(); assert.throws(() => r.action(type, data), e => e.code === code); assert.equal(r.serialize(), before); };
const egg = 'FOOD_TEA_BREAK_PANCAKE', cookEgg = (r, n = 1) => { r.giveItem('ING_BIRD_EGG', n); return r.action('CRAFT', { recipe: 'REC_FOOD_EGG_FRY', quantity: n }).result; };
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };

test('Barbara creates exactly the produced quantity as special lots, never heals while cooking', () => {
  const r = fresh(); join(r, 'MOND_BARBARA'); r.giveItem(egg, 2); const hp = r.s.global.PLAYER_HP_CURRENT, out = cookEgg(r, 3);
  assert.equal(r.itemCount(egg), 5); assert.equal(r.s.specialFoodLots[egg].BARBARA_SPECIAL, 3); assert.equal(r.s.global.PLAYER_HP_CURRENT, hp);
  assert.equal(out.quantity, 3); assert.equal(out.outputName, '티바트 달걀 프라이 · 바바라 특제');
  assert.deepEqual(clone(r.foodLots(egg).map(x => [x.variant, x.quantity, x.heal])), [['NORMAL', 2, 90], ['BARBARA_SPECIAL', 3, 99]]);
  assert.equal(r.s.inventory.filter(i => i.item === egg).length, 1);
});
test('isolated shop fixture: purchased food remains normal alongside crafted special food', () => {
  // The source currently sells ingredients, not cooked food. Exercise the real BUY path using a fixture-only food stock.
  const fixture = clone(db), stock = clone(fixture['19_SHOP_STOCK_DB'].find(s => s[0] === 'STK_MOND_MAT_001'));
  stock[0] = 'TEST_FOOD_STOCK'; stock[3] = egg; fixture['19_SHOP_STOCK_DB'].push(stock);
  const r = fresh(fixture); join(r, 'MOND_BARBARA'); cookEgg(r); r.action('BUY', { stock: stock[0], quantity: 1 });
  assert.equal(r.itemCount(egg), 2); assert.equal(r.s.specialFoodLots[egg].BARBARA_SPECIAL, 1); assert.equal(r.foodLots(egg).find(l => l.variant === 'NORMAL').quantity, 1);
});
test('AUTO selects normal first, explicit special heals ×1.1 and keeps ordinary servings', () => {
  const r = fresh(); join(r, 'MOND_BARBARA'); cookEgg(r, 2); r.giveItem(egg, 2); r.s.global.PLAYER_HP_CURRENT = 1;
  let out = r.action('USE_ITEM', { item: egg }).result; assert.equal(out.meals[0].variant, 'NORMAL'); assert.equal(r.s.global.PLAYER_HP_CURRENT, 91); assert.equal(r.s.specialFoodLots[egg].BARBARA_SPECIAL, 2);
  r.s.global.PLAYER_HP_CURRENT = 1; r.s.global.LAST_RECOVERY_MEAL_ITEM_ID = 'NONE';
  out = r.action('USE_ITEM', { item: egg, variant: 'BARBARA_SPECIAL' }).result;
  assert.equal(out.meals[0].requestedHealing, 99); assert.equal(out.meals[0].name, '티바트 달걀 프라이 · 바바라 특제'); assert.equal(r.s.global.PLAYER_HP_CURRENT, 100); assert.equal(r.s.specialFoodLots[egg].BARBARA_SPECIAL, 1);
  assert.equal(r.foodLots(egg).find(l => l.variant === 'NORMAL').quantity, 1);
  rejectAtomic(r, 'USE_ITEM', { item: egg, variant: 'BARBARA_SPECIAL' }, 'MEAL_REPEAT');
});
test('batch meals reserve lots independently and consume normal then special per recipient', () => {
  const r = fresh(); join(r, 'MOND_BARBARA'); cookEgg(r); r.giveItem(egg, 1); r.s.global.PLAYER_HP_CURRENT = 1; r.s.chars.MOND_BARBARA.hp = 1;
  const out = r.action('MEAL_BATCH', { meals: [{ item: egg }, { item: egg, owner: 'MOND_BARBARA' }] }).result;
  assert.deepEqual(clone(out.meals.map(m => m.variant)), ['NORMAL', 'BARBARA_SPECIAL']); assert.equal(r.s.global.PLAYER_HP_CURRENT, 91); assert.equal(r.s.chars.MOND_BARBARA.hp, 100);
  assert.equal(r.itemCount(egg), 0); assert.equal(r.s.specialFoodLots[egg], undefined); assert.equal(out.minutes, 10);
});
test('explicit unavailable lots and late healing restrictions roll back all recipients, food and time', () => {
  const r = fresh(); join(r, 'MOND_BARBARA'); cookEgg(r, 2); r.giveItem(egg, 1); r.s.global.PLAYER_HP_CURRENT = 1; r.s.chars.MOND_BARBARA.hp = 1;
  rejectAtomic(r, 'MEAL_BATCH', { meals: [{ item: egg, variant: 'NORMAL' }, { item: egg, owner: 'MOND_BARBARA', variant: 'NORMAL' }] }, 'QUANTITY');
  r.s.chars.MOND_BARBARA.statuses = [{ id: 'STATUS_BOND_OF_LIFE', value: -1 }];
  rejectAtomic(r, 'MEAL_BATCH', { meals: [{ item: egg }, { item: egg, owner: 'MOND_BARBARA', variant: 'BARBARA_SPECIAL' }] }, 'HEAL_STATE');
  assert.equal(r._mealLotReservations, undefined); assert.equal(r._foodSpendLots, undefined);
});
test('special lot benefit survives owner leaving party and round-trip save, without boosting purchases', () => {
  const r = fresh(); join(r, 'MOND_BARBARA'); cookEgg(r); r.action('PARTY_REMOVE', { slot: 2 });
  const loaded = new R(db, JSON.parse(r.serialize())); loaded.giveItem(egg, 1); loaded.s.global.PLAYER_HP_CURRENT = 1;
  const out = loaded.action('USE_ITEM', { item: egg, variant: 'BARBARA_SPECIAL' }).result;
  assert.equal(out.meals[0].requestedHealing, 99); assert.equal(loaded.foodLots(egg)[0].variant, 'NORMAL'); assert.equal(loaded.itemCount(egg), 1);
});
test('generic ingredient/spend path drains normal lots first and cannot leave ghost special counts', () => {
  const r = fresh(); join(r, 'MOND_BARBARA'); cookEgg(r, 3); r.giveItem(egg, 2);
  r.pay({ items: { [egg]: 3 } }); assert.equal(r.itemCount(egg), 2); assert.equal(r.s.specialFoodLots[egg].BARBARA_SPECIAL, 2);
  r.pay({ items: { [egg]: 2 } }); assert.equal(r.itemCount(egg), 0); assert.equal(r.s.specialFoodLots[egg], undefined); r.serialize();
});
test('special lot save validation rejects forged unknown variants and impossible quantities', () => {
  const r = fresh(); r.giveItem(egg, 1);
  for (const lots of [{ [egg]: { BARBARA_SPECIAL: 2 } }, { [egg]: { BARBARA_SPECIAL: 0 } }, { [egg]: { BARBARA_SPECIAL: 0.5 } }, { [egg]: { OTHER: 1 } }, { ING_MILK: { BARBARA_SPECIAL: 1 } }]) {
    const save = JSON.parse(r.serialize()); save.specialFoodLots = lots; assert.throws(() => new R(db, save), e => e.code === 'FOOD_LOT_SAVE');
  }
});
test('Albedo reduces common material once per craft, preserving minimum one for batched processing', () => {
  const r = fresh(); join(r, 'MOND_ALBEDO'); r.giveItem('ING_MILK', 3);
  const out = r.action('CRAFT', { recipe: 'REC_PROCESS_BUTTER', quantity: 3 }).result;
  assert.equal(out.cost.items.ING_MILK, 3); assert.equal(out.cost.passives[0].saved, 3); assert.equal(r.itemCount('ING_BUTTER'), 3); assert.equal(r.itemCount('ING_MILK'), 0);
  assert.equal(out.minutes, 60); assert.equal(r.s.global.WORLD_TIME, '13:00');
});
test('Albedo equipment crafting saves one common material type and cannot reduce rare/quest/boss material', () => {
  const r = fresh(); join(r, 'MOND_ALBEDO'); r.giveItem('TRPG_STURDY_CLOTH', 1); r.giveItem('TRPG_REFINED_LEATHER', 1);
  const out = r.action('CRAFT', { recipe: 'REC_ARMOR_TRAVEL' }).result;
  assert.equal(out.cost.items.TRPG_STURDY_CLOTH, 1); assert.equal(out.cost.items.TRPG_REFINED_LEATHER, 1); assert.equal(out.cost.mora, 60); assert.equal(r.s.inventory.filter(i => i.equip === 'EQ_ARMOR_TRAVEL_COAT').length, 1);
  assert.equal(r.commonMaterialReason('ORE_CRYSTAL'), 'NOT_COMMON_GRADE'); assert.equal(r.commonMaterialReason('TRPG_BOSS_CORE'), 'BOSS_MATERIAL');
  const row = r.rows('14_ITEM_DB').find(i => i[18] === 'Y' && i[19] !== 'N'); if (row) assert.equal(r.commonMaterialReason(row[0]), 'QUEST_OR_UNCLASSIFIED');
});
test('region and active-party requirements prevent discounts, and failed discounted craft is atomic', () => {
  const r = fresh(); join(r, 'MOND_ALBEDO'); const recipe = r.recipeDefinition('REC_PROCESS_BUTTER');
  r.s.global.CURRENT_MAP_ID = 'MAP_INAZUMA_CITY'; assert.equal(r.recipeCost(recipe, 2).items.ING_MILK, 4);
  r.s.global.CURRENT_MAP_ID = 'MAP_MOND_CITY'; r.action('PARTY_REMOVE', { slot: 2 }); assert.equal(r.recipeCost(recipe, 2).items.ING_MILK, 4);
  r.action('PARTY', { char: 'MOND_ALBEDO', slot: 2 }); rejectAtomic(r, 'CRAFT', { recipe: recipe[0] }, 'COST');
});
test('Lisa potion discount and Mona exclusions do not stack; mundane medical recipe stays unchanged', () => {
  const r = fresh(); join(r, 'MOND_LISA'); join(r, 'MOND_MONA', 3); join(r, 'MOND_ALBEDO', 4);
  r.giveItem('ING_MINT', 2); r.giveItem('MAT_SLIME_CONDENSATE', 2);
  const out = r.action('CRAFT', { recipe: 'REC_ALCH_HEALING_POTION', quantity: 2 }).result;
  assert.equal(out.cost.items.ING_MINT, 2); assert.equal(out.cost.items.MAT_SLIME_CONDENSATE, 2); assert.equal(out.cost.passives.length, 1); assert.equal(out.cost.passives[0].passive, 'MOND_LISA_PASSIVE_BREW');
  assert.equal(r.itemCount('TRPG_HEALING_POTION'), 2); assert.equal(r.recipeCost(r.recipeDefinition('REC_MEDICAL_BANDAGE'), 1).passives, undefined);
  r.action('PARTY_REMOVE', { slot: 2 }); assert.equal(r.recipeCost(r.recipeDefinition('REC_ALCH_HEALING_POTION'), 1).items.ING_MINT, 2);
});
test('live source reports no material conversion recipe and absent gather/scout lifecycles', () => {
  const r = fresh(), report = r.noncombatPassiveReport();
  assert.equal(report.find(x => x.id === 'MOND_MONA_PASSIVE_ALCHEMY').supported, true);
  assert.equal(report.find(x => x.id === 'MOND_MONA_PASSIVE_ALCHEMY').matchingRecipes.length, 0);
  assert.equal(report.find(x => x.id === 'MOND_KLEE_PASSIVE_SPECIALTY').supported, false);
  assert.equal(report.find(x => x.id === 'MOND_MIKA_PASSIVE_SCOUT_GATHER').supported, false);
});
test('isolated conversion fixture verifies Mona highest-quantity common choice, rare exclusion and minimum', () => {
  // Fixture-only definition: no source file or production DB mutation or invented real recipe.
  const fixture = clone(db), recipe = clone(fixture['17_RECIPE_DB'].find(r => r[0] === 'REC_ARMOR_TRAVEL'));
  recipe[0] = 'TEST_MATERIAL_CONVERT'; recipe[1] = '연금 소재 변환'; recipe[2] = 'ITEM'; recipe[3] = 'MAT_SLIME_SECRETIONS';
  recipe[16] = '연금 시설'; recipe[17] = '연금 시설'; fixture['17_RECIPE_DB'].push(recipe);
  fixture['48_RECIPE_INGREDIENT_DB'].push(['TEST_A', recipe[0], 1, 'MAT_DAMAGED_MASK', 2], ['TEST_B', recipe[0], 2, 'MAT_SLIME_CONDENSATE', 4], ['TEST_C', recipe[0], 3, 'ORE_CRYSTAL', 8]);
  const r = fresh(fixture); join(r, 'MOND_MONA'); r.giveItem('MAT_DAMAGED_MASK', 4); r.giveItem('MAT_SLIME_CONDENSATE', 6); r.giveItem('ORE_CRYSTAL', 16);
  const out = r.action('CRAFT', { recipe: recipe[0], quantity: 2 }).result;
  assert.equal(out.cost.items.MAT_DAMAGED_MASK, 4); assert.equal(out.cost.items.MAT_SLIME_CONDENSATE, 6); assert.equal(out.cost.items.ORE_CRYSTAL, 16); assert.equal(out.cost.passives[0].passive, 'MOND_MONA_PASSIVE_ALCHEMY');
  fixture['48_RECIPE_INGREDIENT_DB'].filter(i => i[1] === recipe[0]).forEach(i => { i[4] = 1; });
  const single = fresh(fixture); join(single, 'MOND_MONA'); const cost = single.recipeCost(single.recipeDefinition(recipe[0]), 3);
  assert.equal(cost.items.MAT_DAMAGED_MASK, 3); assert.equal(cost.items.MAT_SLIME_CONDENSATE, 3); assert.equal(cost.passives, undefined);
});
test('source drift fails closed before spending and special effect never appears without owner', () => {
  const fixture = clone(db); fixture['08_SKILL_CARD_DB'].find(r => r[0] === 'MOND_BARBARA_PASSIVE_DISH')[32] = 'CHANGED_BY_SOURCE';
  const r = fresh(fixture); join(r, 'MOND_BARBARA'); r.giveItem('ING_BIRD_EGG', 1); rejectAtomic(r, 'CRAFT', { recipe: 'REC_FOOD_EGG_FRY' }, 'PASSIVE_DEFINITION');
  const plain = fresh(); cookEgg(plain); assert.equal(plain.s.specialFoodLots, undefined);
});
fs.writeFileSync(path.join(__dirname, 'passive-test-results.json'), JSON.stringify({ passed, source: 'content/db.json', fixtureTests: 3, report: fresh().noncombatPassiveReport() }, null, 2) + '\n');
console.log(JSON.stringify({ passed }));
