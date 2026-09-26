'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../source/inventory_presenter.js');
const gameDir = path.resolve(__dirname,'..');
const db = JSON.parse(fs.readFileSync(path.join(gameDir,'content/db.json')));
const manifest = JSON.parse(fs.readFileSync(path.join(gameDir,'dist/asset-manifest.json')));
const presenter = api.create(db,manifest);
let checks = 0;
const test = (name,run) => { run(); checks++; console.log('PASS '+name); };
const freeze = o => { if (o && typeof o === 'object') { Object.values(o).forEach(freeze); Object.freeze(o); } return o; };
test('source text, numeric zero and unknown values remain exact', () => {
  const record = db['14_ITEM_DB'].find(r => r[0] === 'FOOD_HASH_BROWN');
  const detail = presenter.itemDetail({item:record[0],quantity:3});
  assert.equal(detail.description,record[5]); assert.equal(detail.effect,record[7]); assert.equal(detail.heal,Number(record[8]));
  assert.equal(detail.fields.find(f => f.label === '사용 제한').value,String(record[13]));
  assert.equal(detail.fields.find(f => f.label === '판매가').value,String(record[14]));
  const missing = presenter.itemDetail({item:'MISSING_ITEM',quantity:1});
  assert.equal(missing.actionHint,null); assert.deepEqual(missing.issues,['MISSING_DEFINITION']);
});
test('same equipment id remains separate by inventory instance', () => {
  const state = freeze({inventory:[{slot:'EQI_A',equip:'EQ_SWORD_COOL_STEEL',quantity:1,enhance:0},{slot:'EQI_B',equip:'EQ_SWORD_COOL_STEEL',quantity:1,enhance:3}]});
  const entries = presenter.inventoryEntries(state);
  assert.equal(entries.length,2); assert.deepEqual(entries.map(i=>i.key),['EQI_A','EQI_B']);
  assert.equal(entries[1].stats.find(s=>s.key==='ATK').value,14);
  assert.equal(entries[0].stats.find(s=>s.key==='ATK').value,12);
});
test('cumulative numeric milestones and replacing effect overrides', () => {
  const detail = presenter.itemDetail({slot:'EQI_A',equip:'EQ_SWORD_COOL_STEEL',quantity:1,enhance:9});
  assert.equal(detail.enhance,9); assert.equal(detail.enhancement.statsAdd.ATK,2);
  assert.equal(detail.enhancement.effectOverrides.wet_cryo_damage_bonus,0.11);
  assert.deepEqual(detail.enhancement.appliedMilestones,[3,6,9]);
});
test('normal and Barbara special food have separate quantities and keys', () => {
  const state = freeze({inventory:[{item:'FOOD_HASH_BROWN',quantity:3},{item:'FOOD_HASH_BROWN',quantity:2},{item:'CUR_MORA',quantity:99},{item:'MAT_IRON_CHUNK',quantity:0}],specialFoodLots:{FOOD_HASH_BROWN:{BARBARA_SPECIAL:2}}});
  const before = JSON.stringify(state), entries = presenter.inventoryEntries(state);
  assert.equal(entries.length,2); assert.equal(entries.reduce((n,e)=>n+e.quantity,0),5);
  assert.equal(entries.find(e=>e.variant==='NORMAL').quantity,3);
  const special=entries.find(e=>e.variant==='BARBARA_SPECIAL'); assert.equal(special.quantity,2); assert.equal(special.heal,242);
  assert.equal(special.name,'몬드 감자전 · 바바라 특제'); assert.equal(JSON.stringify(state),before);
});
test('invalid lot is surfaced and does not fabricate negative quantity', () => {
  const entries=presenter.inventoryEntries({inventory:[{item:'FOOD_HASH_BROWN',quantity:1}],specialFoodLots:{FOOD_HASH_BROWN:{BARBARA_SPECIAL:2}}});
  assert.equal(entries.length,1); assert.equal(entries[0].quantity,1); assert.ok(entries[0].issues.includes('INVALID_FOOD_LOT'));
});
test('individual icons override categories; missing legacy category remains undeployed', () => {
  const exact=presenter.itemDetail({equip:'EQ_SWORD_COOL_STEEL',quantity:1});assert.equal(exact.icon.id,'EQ_SWORD_COOL_STEEL');assert.equal(exact.icon.deployed,true);assert.equal(exact.icon.url,manifest.itemIcons.icons.EQ_SWORD_COOL_STEEL.path);assert.ok(fs.existsSync(path.join(gameDir,'dist',exact.icon.url)));const custom=presenter.itemDetail({equip:'EQ_ARMOR_TRAVEL_COAT',quantity:1});assert.equal(custom.icon.matchType,'official_base_visual');const fallback=presenter.itemDetail({equip:'EQ_STORY_PYRO_GNOSIS',quantity:1});assert.equal(fallback.icon.matchType,'category_fallback');
  const detail=api.create(db).itemDetail({slot:'EQI_X',equip:'EQ_SWORD_COOL_STEEL',quantity:1});
  assert.equal(detail.icon.id,'ASSET_ICON_WEAPON_SWORD'); assert.equal(detail.icon.registered,true);
  if (!manifest.assets[detail.icon.id]) { assert.equal(detail.icon.deployed,false); assert.equal(detail.icon.url,null); }
  const withIcon=api.create(db,{assets:{ASSET_ICON_WEAPON_SWORD:{url:'assets/verified-sword.png'}}});
  assert.equal(withIcon.itemDetail({equip:'EQ_SWORD_COOL_STEEL',quantity:1}).icon.url,'assets/verified-sword.png');
});
test('all current item and equipment definitions are readable without mutation', () => {
  const before=JSON.stringify(db); freeze(db);
  for (const r of db['14_ITEM_DB'].slice(1).filter(r=>r[0])) assert.equal(presenter.itemDetail({item:r[0],quantity:1}).id,r[0]);
  for (const r of db['16_EQUIP_DB'].slice(1).filter(r=>r[0])) assert.equal(presenter.itemDetail({equip:r[0],slot:'TEST_'+r[0],quantity:1,enhance:0}).id,r[0]);
  assert.equal(JSON.stringify(db),before);
});
test('equipment growth, medical formulas and enhanced effects read as Korean',()=>{
  const coat=presenter.itemDetail({equip:'EQ_ARMOR_TRAVEL_COAT',slot:'coat',quantity:1,enhance:9});assert.doesNotMatch(coat.enhancement.growthText,/[{}]|MAX_HP|DEF|EVA/);assert.match(coat.enhancement.growthText,/방어력|최대 HP/);
  const sword=presenter.itemDetail({equip:'EQ_SWORD_COOL_STEEL',slot:'sword',quantity:1,enhance:9});assert.match(sword.effect,/11%/);assert.doesNotMatch(sword.effect,/5%/);
  for(const row of db['14_ITEM_DB'].slice(1)){if(!row[0])continue;const d=presenter.itemDetail({item:row[0],quantity:1});assert.doesNotMatch(d.description+' '+d.effect,/ROUND\(MAX_HP|STATUS_[A-Z_]+/);}
});
console.log(checks+' groups passed');
