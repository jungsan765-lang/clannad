'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const base = path.resolve(__dirname, '..'), ctx = vm.createContext({ console });
for (const file of ['source/runtime.js', 'source/runtime_extensions.js', 'source/runtime_story.js', 'source/runtime_combat.js', 'source/runtime_mond_cards.js', 'source/runtime_economy.js']) vm.runInContext(fs.readFileSync(path.join(base, file), 'utf8'), ctx, { filename: file });
const db = JSON.parse(fs.readFileSync(path.join(base, 'content/db.json'))), R = ctx.CRPGRuntime.Runtime;
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
function battle(source = 'MOND_EULA', time = '12:00') {
  const r = new R(db); r.newGame({ name: '테스트', route: 'ROUTE_TRAVELER', seed: 12345, saveId: 'MOND_CARD_TEST' }); r.s.global.WORLD_TIME = time;
  const actor = r.initCombatActor(r.character(source), 1); Object.assign(actor, { atk: 100, def: 100, crit: 0, hit: 95, eva: 0, hp: 1000, maxHp: 1000, level: 20, control: 'AI', turns: 1 });
  const player = r.initCombatActor(r.player(), 1); Object.assign(player, { hp: 1000, maxHp: 1000, crit: 0 });
  const enemies = Array.from({ length: 4 }, (_, i) => ({ id: 'ENEMY_' + i, source: 'MON_HILI_FIGHTER', name: '표적' + i, side: 'ENEMY', control: 'AI', hp: 10000, maxHp: 10000, atk: 1, def: 0, crit: 0, critDmg: 0, hit: 95, eva: 0, resist: 0, spd: 1, level: 1, aura: null, range: '근접', statuses: [], shields: [], cooldowns: {}, turns: 0 }));
  r.s.runtime = { combatVersion: 1, id: 'MOND_CARD_TEST:B1', origin: 'TEST', group: 'EG_MOND_HILI_PATROL', round: 1, actors: [player, actor, ...enemies], fields: [], log: [], order: [{ id: 'PLAYER_CUSTOM', score: 1 }], cursor: 0, phase: 'WAIT_PLAYER', terrain: null, actionSequence: 0 };
  Object.assign(r.s.global, { MODE: 'COMBAT', ACTIVE_BATTLE_ID: 'MOND_CARD_TEST:B1', COMBAT_ACTION_PHASE: 'WAIT_PLAYER' });
  r.die = () => 50; r.random = () => .5;
  const cast = id => r.executeCard(actor, r.cardDefinition(r.row('08_SKILL_CARD_DB', id)), enemies[0].id);
  return { r, actor, player, enemies, cast };
}
test('Eula and Rosaria supported scripts match latest source exactly; Rosaria E remains blocked', () => {
  const { r } = battle(); for (const id of ctx.CRPGRuntime.mondCardCapabilities.supported) assert.equal(r.cardSupport(r.cardDefinition(r.row('08_SKILL_CARD_DB', id))), '');
  assert.notEqual(r.cardSupport(r.cardDefinition(r.row('08_SKILL_CARD_DB', 'MOND_ROSARIA_E'))), '');
});
test('Eula taps build capped DEF stacks; AI holds at two and consumes exact coefficients', () => {
  const { r, actor, enemies, cast } = battle();
  cast('MOND_EULA_E'); assert.equal(10000 - enemies[0].hp, 90); assert.equal(r.combatStat(actor, 'def'), 110.00000000000001);
  cast('MOND_EULA_E'); assert.equal(Math.round(r.combatStat(actor, 'def')), 120);
  const before = enemies.map(x => x.hp); cast('MOND_EULA_E');
  for (let i = 0; i < 3; i++) assert.equal(before[i] - enemies[i].hp, 210); assert.equal(before[3] - enemies[3].hp, 0);
  assert.equal(r.combatStat(actor, 'def'), 100); assert.ok(enemies[0].statuses.some(s => s.id === 'EULA_CRYO_PHYSICAL_VULN'));
  const hp = enemies[0].hp; r.damage(actor, enemies[0], 1, 'PHYSICAL', { range: '근접' }); assert.equal(hp - enemies[0].hp, 115);
});
test('Eula sword caps direct-hit stacks and follows CE049 creation remainder plus two full rounds', () => {
  const { r, actor, enemies, cast } = battle(); cast('MOND_EULA_Q'); let f = r.s.runtime.fields.find(f => f.kind === 'LIGHTFALL_SWORD'); assert.equal(f.stacks, 0);
  for (let n = 0; n < 5; n++) r.basicHit(actor, enemies[0]); assert.equal(f.stacks, 3);
  r.damage(actor, enemies[0], .2, 'PHYSICAL', { sourceKind: 'FIELD' }); assert.equal(f.stacks, 3);
  r.roundEnd(); assert.equal(r.s.runtime.fields.filter(f => f.kind === 'LIGHTFALL_SWORD').length, 1);
  for (let n = 0; n < 5; n++) r.basicHit(actor, enemies[0]); assert.equal(f.stacks, 6);
  r.roundEnd(); assert.equal(r.s.runtime.fields.filter(f => f.kind === 'LIGHTFALL_SWORD').length, 1);
  const hp = enemies.map(x => x.hp); r.roundEnd(); for (let i = 0; i < 4; i++) assert.equal(hp[i] - enemies[i].hp, 390);
  assert.equal(r.s.runtime.fields.filter(f => f.kind === 'LIGHTFALL_SWORD').length, 0); assert.equal(r.s.runtime.log.filter(x => x.card === 'MOND_EULA_Q_EXPLOSION').length, 1);
  r.roundEnd(); assert.equal(r.s.runtime.log.filter(x => x.card === 'MOND_EULA_Q_EXPLOSION').length, 1);
});
test('Eula misses and reaction/followup damage do not add sword stacks', () => {
  const { r, actor, enemies, cast } = battle(); cast('MOND_EULA_Q'); const f = r.s.runtime.fields.find(f => f.kind === 'LIGHTFALL_SWORD');
  r.die = () => 100; r.basicHit(actor, enemies[0]); assert.equal(f.stacks, 0);
  r.die = () => 50; r.damage(actor, enemies[0], .2, 'CRYO', { card: 'MOND_EULA_Q', sourceKind: 'FIELD' }); assert.equal(f.stacks, 0);
  r.applyDamage(actor, enemies[0], 100, { element: '얼음', sourceKind: 'REACTION' });
  r.applyDamage(actor, enemies[0], 100, { element: '물리', sourceKind: 'FOLLOWUP' }); assert.equal(f.stacks, 0);
});
test('Eula death detonates immediately; an explicit leave detonates without recursion', () => {
  const a = battle(); a.cast('MOND_EULA_Q'); const hp = a.enemies[0].hp;
  a.r.applyDamage(a.enemies[0], a.actor, 2000, { element: '물리' }); assert.equal(a.actor.hp, 0); assert.equal(hp - a.enemies[0].hp, 120);
  assert.equal(a.r.s.runtime.log.filter(x => x.card === 'MOND_EULA_Q_EXPLOSION').length, 1);
  const b = battle(); b.cast('MOND_EULA_Q'); assert.equal(b.r.detonateEulaSword(b.actor.id), true); assert.equal(b.r.detonateEulaSword(b.actor.id), false);
});
test('Rosaria Q follows CE049: creation END plus two subsequent END ticks and matching critical share', () => {
  const { r, actor, player, enemies, cast } = battle('MOND_ROSARIA'); actor.crit = 40;
  cast('MOND_ROSARIA_Q'); assert.equal(10000 - enemies[0].hp, 100); assert.equal(r.combatStat(player, 'crit'), 6); assert.equal(r.combatStat(actor, 'crit'), 40);
  const hp = enemies[0].hp; r.roundEnd(); r.roundEnd(); assert.equal(hp - enemies[0].hp, 110); assert.equal(r.s.runtime.fields.filter(f => f.kind === 'ICE_LANCE').length, 1); assert.equal(r.combatStat(player, 'crit'), 6);
  r.roundEnd(); assert.equal(hp - enemies[0].hp, 165); assert.equal(r.s.runtime.fields.filter(f => f.kind === 'ICE_LANCE').length, 0); assert.equal(r.combatStat(player, 'crit'), 0);
  r.roundEnd(); assert.equal(hp - enemies[0].hp, 165);
});
test('Rosaria night is [20:00,06:00), boosts one damage, expires at dawn, and is save-stable', () => {
  for (const [time, expected] of [['19:59', 0], ['20:00', 10], ['05:59', 10], ['06:00', 0]]) {
    const { r, actor } = battle('MOND_ROSARIA', time); assert.equal(r.combatStat(actor, 'crit'), expected);
  }
  const { r, actor, enemies } = battle('MOND_ROSARIA', '23:00');
  const hp = enemies[0].hp; r.damage(actor, enemies[0], 1, 'PHYSICAL', { range: '근접' }); r.damage(actor, enemies[0], 1, 'PHYSICAL', { range: '근접' }); assert.equal(hp - enemies[0].hp, 210);
  const restored = new R(db, JSON.parse(r.serialize())); assert.equal(restored.combatStat(restored.combatActor(actor.id), 'crit'), 10);
  restored.s.global.WORLD_DAY++; restored.s.global.WORLD_TIME = '06:00'; assert.equal(restored.combatStat(restored.combatActor(actor.id), 'crit'), 0);
});
test('night and Eula vulnerability multipliers occur before the single final damage rounding', () => {
  const n = battle('MOND_ROSARIA', '23:00'); n.actor.atk = 14;
  const nhp = n.enemies[0].hp; n.r.damage(n.actor, n.enemies[0], .1, 'PHYSICAL', { range: '근접' }); assert.equal(nhp - n.enemies[0].hp, 2);
  const e = battle(); e.actor.atk = 14; e.r.addCombatStatus(e.enemies[0], 'EULA_CRYO_PHYSICAL_VULN', 2);
  const ehp = e.enemies[0].hp; e.r.damage(e.actor, e.enemies[0], .1, 'PHYSICAL', { range: '근접' }); assert.equal(ehp - e.enemies[0].hp, 2);
});
console.log(JSON.stringify({ passed, data: 'content/db.json' }));
