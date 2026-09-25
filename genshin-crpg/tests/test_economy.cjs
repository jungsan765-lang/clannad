'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const base = path.resolve(__dirname, '..');
const ctx = vm.createContext({ console });
for (const file of ['source/runtime.js', 'source/runtime_extensions.js', 'source/runtime_story.js', ...(process.env.ECONOMY_NO_COMBAT ? [] : ['source/runtime_combat.js']), 'source/runtime_economy.js']) vm.runInContext(fs.readFileSync(path.join(base, file), 'utf8'), ctx, { filename: file });
const db = JSON.parse(fs.readFileSync(path.join(base, 'content/db.json')));
const R = ctx.CRPGRuntime.Runtime;
let count = 0;
const test = (name, fn) => { fn(); count++; console.log('PASS', name); };
const fresh = () => { const r = new R(db); r.newGame({ name: '테스트', route: 'ROUTE_TRAVELER', seed: 12345, saveId: 'ECONOMY_TEST' }); r.s.global.CURRENT_MAP_ID = 'MAP_MOND_CITY'; r.s.global.SCREEN_MODE = 'MAIN_MENU'; return r; };
const rejectAtomic = (r, type, data, code) => { const before = r.serialize(); assert.throws(() => r.action(type, data), e => !code || e.code === code); assert.equal(r.serialize(), before); };
const join = (r, char, slot) => { r.unlockCharacter(char); r.action('PARTY', { char, slot }); };

test('single meal consumes one serving, heals capped HP, and costs exactly ten minutes', () => {
  const r = fresh(); r.s.global.PLAYER_HP_CURRENT = 5; r.s.global.WORLD_TIME = '08:55'; r.giveItem('FOOD_TEA_BREAK_PANCAKE', 2);
  const out = r.action('USE_ITEM', { item: 'FOOD_TEA_BREAK_PANCAKE' }).result;
  assert.equal(r.s.global.PLAYER_HP_CURRENT, Math.min(95, r.s.global.PLAYER_HP_MAX));
  assert.equal(r.itemCount('FOOD_TEA_BREAK_PANCAKE'), 1); assert.equal(r.s.global.WORLD_TIME, '09:05'); assert.equal(out.minutes, 10);
  r.s.global.PLAYER_HP_CURRENT = 5; rejectAtomic(r, 'USE_ITEM', { item: 'FOOD_TEA_BREAK_PANCAKE' }, 'MEAL_REPEAT');
  r.giveItem('FOOD_SWEET_MADAME', 1); r.action('USE_ITEM', { item: 'FOOD_SWEET_MADAME' });
  r.s.global.PLAYER_HP_CURRENT = 5; r.action('USE_ITEM', { item: 'FOOD_TEA_BREAK_PANCAKE' });
});
test('multi-person meal has independent last-food locks and one shared time cost', () => {
  const r = fresh(); join(r, 'MOND_AMBER', 2); r.s.global.PLAYER_HP_CURRENT = 1; r.s.chars.MOND_AMBER.hp = 1;
  r.giveItem('FOOD_HASH_BROWN', 3); r.s.global.WORLD_TIME = '10:00';
  r.action('MEAL_BATCH', { meals: [{ owner: 'PLAYER_CUSTOM', item: 'FOOD_HASH_BROWN' }, { owner: 'MOND_AMBER', item: 'FOOD_HASH_BROWN' }] });
  assert.equal(r.s.global.WORLD_TIME, '10:10'); assert.equal(r.itemCount('FOOD_HASH_BROWN'), 1);
  assert.equal(r.s.chars.MOND_AMBER.lastRecoveryMeal, 'FOOD_HASH_BROWN');
  const loaded = new R(db, JSON.parse(r.serialize())); assert.equal(loaded.s.chars.MOND_AMBER.lastRecoveryMeal, 'FOOD_HASH_BROWN');
});
test('invalid, repeated, locked and unavailable meal attempts spend no inventory or time', () => {
  const r = fresh(); r.s.global.PLAYER_HP_CURRENT = 1; r.giveItem('FOOD_HASH_BROWN', 3);
  rejectAtomic(r, 'USE_ITEM', { item: 'FOOD_HASH_BROWN', quantity: 2 }, 'MEAL_QUANTITY');
  rejectAtomic(r, 'MEAL_BATCH', { meals: [{ item: 'FOOD_HASH_BROWN' }, { item: 'FOOD_HASH_BROWN' }] }, 'MEAL_QUANTITY');
  rejectAtomic(r, 'USE_ITEM', { item: 'FOOD_HASH_BROWN', owner: 'MOND_LISA' }, 'OWNER');
  rejectAtomic(r, 'USE_ITEM', { item: 'FOOD_SNEZ_SLICED_SASHIMI' }, 'FOOD_EFFECT');
  rejectAtomic(r, 'USE_ITEM', { item: 'ITEM_FOOD_PARTY' }, 'FOOD');
  r.s.global.PLAYER_HP_CURRENT = 0; rejectAtomic(r, 'USE_ITEM', { item: 'FOOD_HASH_BROWN' }, 'TARGET_DOWN');
});
test('life bond absorbs healing before HP and survives partial removal', () => {
  const r = fresh(); r.s.global.PLAYER_HP_CURRENT = 1; r.s.playerStatuses = [{ id: 'STATUS_BOND_OF_LIFE', value: 120 }];
  r.giveItem('FOOD_TEA_BREAK_PANCAKE', 1); r.giveItem('FOOD_SWEET_MADAME', 1);
  r.action('USE_ITEM', { item: 'FOOD_TEA_BREAK_PANCAKE' }); assert.equal(r.s.global.PLAYER_HP_CURRENT, 1); assert.equal(r.s.playerStatuses[0].value, 30);
  r.action('USE_ITEM', { item: 'FOOD_SWEET_MADAME' }); assert.equal(r.s.global.PLAYER_HP_CURRENT, Math.min(151, r.s.global.PLAYER_HP_MAX)); assert.equal(r.s.playerStatuses.length, 0);
});
test('buff food refreshes a per-owner pending status without stacking the same ID', () => {
  const r = fresh(); r.giveItem('FOOD_JADE_PARCELS', 2); r.action('USE_ITEM', { item: 'FOOD_JADE_PARCELS' }); r.action('USE_ITEM', { item: 'FOOD_JADE_PARCELS' });
  assert.equal(r.s.pendingCombatEffects.PLAYER_CUSTOM.length, 1); assert.equal(r.s.pendingCombatEffects.PLAYER_CUSTOM[0].id, 'STATUS_FOOD_ATK');
  assert.equal(r.s.global.LAST_RECOVERY_MEAL_ITEM_ID, 'NONE');
});
test('party removal preserves ownership, HP and equipment and replacement is atomic', () => {
  const r = fresh(); join(r, 'MOND_AMBER', 2); r.s.chars.MOND_AMBER.hp = 17;
  rejectAtomic(r, 'PARTY_REMOVE', { slot: 1 }, 'SLOT'); rejectAtomic(r, 'PARTY_REPLACE', { slot: 2, char: 'MOND_LISA' }, 'COMPANION');
  r.action('PARTY_TACTIC', { slot: 2, tactic: '지원우선' }); assert.equal(r.s.party[1].tactic, '지원우선');
  rejectAtomic(r, 'PARTY_TACTIC', { slot: 2, tactic: '사용자지정' }, 'TACTIC');
  r.action('PARTY_REMOVE', { slot: 2 }); assert.equal(r.s.chars.MOND_AMBER.hp, 17); assert.equal(r.s.party[1].active, false);
  r.action('PARTY', { char: 'MOND_AMBER', slot: 3 }); assert.equal(r.s.chars.MOND_AMBER.hp, 17);
});
test('tool preparation enforces possession, no duplicates and field-pack capacity', () => {
  const r = fresh(), tools = ['TRPG_TACTICAL_LEVITATOR', 'TRPG_TACTICAL_ELEMENT_CONVERTER', 'TRPG_TACTICAL_ARKHE_CONVERTER'];
  rejectAtomic(r, 'TOOL_PREPARE', { items: [tools[0]] }, 'TOOL_OWNERSHIP'); for (const id of tools) r.giveItem(id, 1);
  rejectAtomic(r, 'TOOL_PREPARE', { items: tools }, 'TOOL_SLOTS'); rejectAtomic(r, 'TOOL_PREPARE', { items: [tools[0], tools[0]] }, 'TOOL_SLOTS');
  const slot = r.giveEquipment('EQ_SPECIAL_FIELD_PACK'); r.action('EQUIP', { slot }); r.action('TOOL_PREPARE', { items: tools, element: 'PYRO' });
  assert.equal(r.s.preparedTools.length, 3); assert.equal(r.itemCount(tools[0]), 1);
});
test('six audited column-shift recipes are adapted without mutating the DB', () => {
  const r = fresh(); const snapshot = JSON.stringify(db['17_RECIPE_DB']);
  for (const id of ctx.CRPGRuntime.economyCapabilities.recipeColumnAdapters) { const row = r.recipeDefinition(id); assert.equal(typeof row[15], 'number'); assert.match(row[19], /^\d+(분|시간)$/); assert.equal(row[20], 100); }
  assert.equal(JSON.stringify(db['17_RECIPE_DB']), snapshot);
  r.s.global.MORA = 100; r.giveItem('ING_MINT', 2); r.giveItem('MAT_SLIME_CONDENSATE', 1); r.s.global.WORLD_TIME = '11:00';
  r.action('CRAFT', { recipe: 'REC_ALCH_HEALING_POTION' }); assert.equal(r.s.global.MORA, 80); assert.equal(r.s.global.WORLD_TIME, '11:30'); assert.equal(r.itemCount('TRPG_HEALING_POTION'), 1);
  rejectAtomic(r, 'USE_ITEM', { item: 'TRPG_HEALING_POTION' }, 'COMBAT_MEDICINE');
});
test('batch crafting multiplies ingredient quantity and time, without auto eating', () => {
  const r = fresh(); const recipe = r.recipeDefinition('REC_PROCESS_BUTTER'); r.giveItem('ING_MILK', 4); r.s.global.WORLD_TIME = '12:00'; const hp = r.s.global.PLAYER_HP_CURRENT;
  r.action('CRAFT', { recipe: recipe[0], quantity: 2 }); assert.equal(r.itemCount('ING_BUTTER'), 2); assert.equal(r.itemCount('ING_MILK'), 0); assert.equal(r.s.global.WORLD_TIME, '12:40'); assert.equal(r.s.global.PLAYER_HP_CURRENT, hp);
});
test('recipe facility and location requirements are enforced before costs', () => {
  const r = fresh(); r.s.global.CURRENT_MAP_ID = 'MAP_MOND_FOREST'; r.s.global.MORA = 10000; r.giveItem('ING_MINT', 2); r.giveItem('MAT_SLIME_CONDENSATE', 1);
  rejectAtomic(r, 'CRAFT', { recipe: 'REC_ALCH_HEALING_POTION' }, 'CRAFT');
  r.s.global.CURRENT_MAP_ID = 'MAP_INAZUMA_CITY'; r.s.global.PLAYER_LEVEL_STATE = 20; rejectAtomic(r, 'CRAFT', { recipe: 'REC_SWORD_RANCOUR' }, 'CRAFT');
});
if (!process.env.ECONOMY_NO_COMBAT) test('boss route next stage persists, blocks recovery when forbidden, and supports explicit leave', () => {
  const r = fresh(); r.s.global.CURRENT_MAP_ID = 'MAP_STORMTERROR_LAIR'; r.s.global.PLAYER_HP_CURRENT = 100000; r.s.global.PLAYER_HP_MAX = 100000;
  r.action('BOSS_ROUTE', { route: 'BRT_DVALIN', entry: 'GAUNTLET' }); const b = r.s.runtime;
  assert.equal(r.s.bossRouteProgress.step, 1); assert.equal(b.group, 'EG_MOND_HILI_ELITE');
  // Resolve the real battle wrapper with deterministic pre-set final enemy HP.
  for (const a of b.actors.filter(a => a.side === 'ENEMY')) a.hp = 0;
  r.autoUntilPlayer(); assert.equal(r.s.bossRouteProgress.phase, 'AWAIT_NEXT'); assert.equal(r.s.bossRouteProgress.step, 2);
  r.giveItem('FOOD_TEA_BREAK_PANCAKE', 1); rejectAtomic(r, 'USE_ITEM', { item: 'FOOD_TEA_BREAK_PANCAKE' }, 'BOSS_RECOVERY');
  rejectAtomic(r, 'BOSS_ROUTE', { route: 'BRT_DVALIN', entry: 'DIRECT' }, 'BOSS_ACTIVE');
  const loaded = new R(db, JSON.parse(r.serialize())); assert.equal(loaded.s.bossRouteProgress.step, 2);
  loaded.action('BOSS_CONTINUE'); assert.equal(loaded.s.runtime.group, 'EG_MOND_ABYSS_MAGE');
});
console.log(JSON.stringify({ passed: count, data: 'content/db.json' }));
