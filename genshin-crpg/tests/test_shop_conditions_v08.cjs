/* Read actual product source/DB; all state mutations stay inside isolated VM fixtures. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const gameRoot = path.resolve(process.env.CRPG_GAME || process.cwd());
const source = process.env.CRPG_SOURCE || path.join(gameRoot, 'source');
const dbPath = process.env.CRPG_DB || path.join(gameRoot, 'content/db.json');
const reportPath = process.env.CRPG_REPORT || path.join(gameRoot,'reports/shop-conditions-results.json');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const html = fs.readFileSync(path.join(source, 'index.html'), 'utf8');
const runtimeFiles = [...html.matchAll(/<script\s+src="(runtime[^/]*\.js)(?:\?[^\"]*)?"/g)].map(m => m[1]);
const ctx = vm.createContext({console});
const sourceHashes = {};
for (const filename of runtimeFiles) {
  const text = fs.readFileSync(path.join(source, filename), 'utf8');
  sourceHashes[filename] = hash(text);
  vm.runInContext(text, ctx, {filename});
}
const dbBytes = fs.readFileSync(dbPath);
const db = JSON.parse(dbBytes);
const Runtime = ctx.CRPGRuntime.Runtime;
ctx.CRPGRelationships.install(ctx.CRPGRuntime, {
  events:ctx.CRPGRelationships.catalogFromDB(db),
  activities:ctx.CRPGRelationships.activitiesFromDB(db),
  preferences:{adultModeEnabled:false}, eligibility:{profiles:{}, protagonists:{}}
});
const expected = [
  ['STK_ALCH_001','MRC_ALCHEMY_COMMON','LEVEL>=5 / 연금 시설 접근',5],
  ['STK_ALCH_002','MRC_ALCHEMY_COMMON','LEVEL>=5 / 연금 시설 접근',5],
  ['STK_ALCH_003','MRC_ALCHEMY_COMMON','LEVEL>=7 / 연금 시설 접근',7],
  ['STK_ALCH_MED_001','MRC_ALCHEMY_COMMON','연금 시설 접근',1],
  ['STK_ALCH_MED_002','MRC_ALCHEMY_COMMON','연금/의료 시설 접근',1],
  ['STK_ALCH_MED_003','MRC_ALCHEMY_COMMON','연금/의료 시설 접근',1],
  ...['001','002','003','004','005'].map(n => ['STK_SNEZ_KUZ_'+n,'MRC_SNEZ_EQUIP','스네즈나야성 진입',1]),
  ...['001','002','003'].map(n => ['STK_SNEZ_BUT_'+n,'MRC_SNEZ_FOOD_BUTURLINA','스네즈나야성 진입',1]),
  ...['001','002'].map(n => ['STK_SNEZ_TOL_'+n,'MRC_SNEZ_FOOD_TOLSTAYA','해당 NPC 접근',1])
];
const rows = new Map(db['19_SHOP_STOCK_DB'].slice(1).filter(r => r[0]).map(r => [r[0],r]));
const originalRows = JSON.stringify(db['19_SHOP_STOCK_DB']);
const results = [];
let sequence = 0;
function test(name, run) {
  try { results.push({name,ok:true,evidence:run() || null}); }
  catch (error) {
    results.push({name,ok:false,error:{code:error.code,message:error.message,stack:error.stack}});
    console.error('FAIL '+name+'\n'+error.stack);
  }
}
function fresh(map='MAP_MOND_CITY', level=1) {
  const r = new Runtime(db);
  r.newGame({name:'구매조건검증',route:'ROUTE_TRAVELER',seed:74219,saveId:'SHOP-CONDITION-'+(++sequence)});
  Object.assign(r.s.global, {
    CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',
    PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:map,WORLD_TIME:'08:00',STORY_MENU_POLICY:'',MORA:999999
  });
  // Explicit fixture location/region access: this suite checks shops, not travel unlocks.
  if (map==='MAP_SNEZ_CITY' && Object.hasOwn(r.s.flags,'FLAG_ACCESS_REGION_SNEZ')) r.s.flags.FLAG_ACCESS_REGION_SNEZ=true;
  r.prepareStory();
  while (r.s.global.PLAYER_LEVEL_STATE<level) r.addXp('PLAYER_CUSTOM', Number(r.row('26_LEVEL_RULES',r.s.global.PLAYER_LEVEL_STATE)[2]));
  assert.equal(r.s.global.PLAYER_LEVEL_STATE,level);
  assert.equal(r.playPhase(),'FREE');
  return r;
}
function enter(r, merchant, mode='SHOP') {
  const entry=r.placeEntries().find(e=>e.merchant===merchant);
  assert.ok(entry,'missing fixture merchant '+merchant);
  r.action('PLACE_ENTER',{place:entry.id,mode});
  assert.equal(r.currentPlace().valid,true);
  assert.equal(r.currentPlace().merchant,merchant);
  return entry;
}
function fixture(spec, level=spec[3]) {
  const r=fresh(spec[1]==='MRC_ALCHEMY_COMMON'?'MAP_MOND_CITY':'MAP_SNEZ_CITY',level);
  enter(r,spec[1]);
  return r;
}
function rejected(r,id, quantity=1, expectedReason) {
  // Raw state comparison also covers intentionally stale/tampered visit fixtures,
  // which correctly fail serialize() validation before a purchase is attempted.
  const before=JSON.stringify(r.s);
  let thrown;
  try {r.action('BUY',{stock:id,quantity});} catch (error) {thrown=error;}
  assert.ok(thrown,'BUY unexpectedly succeeded for '+id);
  if(expectedReason) assert.match(thrown.message,expectedReason);
  assert.equal(JSON.stringify(r.s),before,'rejected purchase changed saved state');
  return {code:thrown.code,reason:thrown.message};
}
function purchase(r,id) {
  const row=r.row('19_SHOP_STOCK_DB',id),money=r.s.global.MORA,quantity=r.itemCount(row[3]);
  const stock=r.stockRemaining(row),beforeInventory=JSON.stringify(r.s.inventory);
  const authored=JSON.stringify(row);
  assert.equal(r.stockReason(row),'');
  assert.equal(r.placeStocks().find(s=>s.row[0]===id)?.reason,'');
  const receipt=r.action('BUY',{stock:id,quantity:1});
  assert.equal(receipt.ok,true);
  assert.equal(r.s.global.MORA,money-Number(row[5]));
  assert.equal(r.stockRemaining(row),stock-1);
  if(row[2]==='ITEM') assert.equal(r.itemCount(row[3]),quantity+1);
  if(row[2]==='RECIPE') {
    assert.equal(JSON.stringify(r.s.inventory),beforeInventory,'recipe purchase created a fake recipe item');
    assert.equal(JSON.parse(r.s.global.SHOP_STOCK_USAGE_STATE)[id+'|'+r.period(row)],1);
  }
  assert.equal(JSON.stringify(row),authored,'normalization changed authored stock row');
  return {stock:id,type:row[2],level:r.s.global.PLAYER_LEVEL_STATE,cost:Number(row[5]),remaining:r.stockRemaining(row)};
}
test('all 16 natural-language rows are enumerated with exact authored conditions',()=>{
  const actual=[...rows.values()].filter(r=>/연금|의료|접근|진입/.test(String(r[8])));
  assert.deepEqual(actual.map(r=>r[0]).sort(),expected.map(s=>s[0]).sort());
  for(const [id,merchant,condition] of expected) {assert.equal(rows.get(id)[1],merchant);assert.equal(rows.get(id)[8],condition);}
  return {count:actual.length,stocks:actual.map(r=>r[0])};
});
for (const spec of expected) {
  const [id,merchant]=spec;
  test(id+' legitimate entered-shop purchase',()=>purchase(fixture(spec),id));
  test(id+' no entrance rejects purchase without mutation',()=>{
    const r=fresh(merchant==='MRC_ALCHEMY_COMMON'?'MAP_MOND_CITY':'MAP_SNEZ_CITY',spec[3]);
    assert.ok(r.stockReason(rows.get(id)));
    return rejected(r,id);
  });
  test(id+' different merchant rejects remote purchase without mutation',()=>{
    const r=fresh(merchant==='MRC_ALCHEMY_COMMON'?'MAP_MOND_CITY':'MAP_SNEZ_CITY',spec[3]);
    enter(r,merchant==='MRC_ALCHEMY_COMMON'?'MRC_MOND_GENERAL':'MRC_ALCHEMY_COMMON');
    assert.match(r.stockReason(rows.get(id)),/현재 들어온 상점/);
    return rejected(r,id,1,/현재 들어온 상점/);
  });
  test(id+' stale entrance after map change rejects without mutation',()=>{
    const r=fixture(spec);r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';
    assert.match(r.stockReason(rows.get(id)),/다시 들어가|현재 지도|이전/);
    return rejected(r,id);
  });
}
for(const spec of expected.filter(s=>s[3]>1)) {
  test(spec[0]+' lower level boundary gives exact needed/current levels',()=>{
    const r=fixture(spec,spec[3]-1),reason=r.stockReason(rows.get(spec[0]));
    assert.match(reason,new RegExp('레벨 '+spec[3]+' 이상'));
    assert.match(reason,new RegExp('현재 Lv\\. '+(spec[3]-1)));
    return rejected(r,spec[0],1,new RegExp('레벨 '+spec[3]+' 이상'));
  });
  test(spec[0]+' above level boundary can buy',()=>purchase(fixture(spec,spec[3]+1),spec[0]));
}
for(const condition of ['알 수 없는 시설 접근','LEVEL>=5 / 알 수 없는 시설 접근','연금 시설 접근 / 임의 조건','해당 NPC 접근 OR TRUE','스네즈나야성 진입 / 임의 조건','SYSTEM_DISABLED']) {
  test('unsupported condition fails closed: '+condition,()=>{
    const spec=expected[3],r=fixture(spec,20),row=[...rows.get(spec[0])];row[8]=condition;
    // Alter only this isolated Runtime table; the shared/authored DB remains untouched.
    r.tables['19_SHOP_STOCK_DB'].set(row[0],row);
    assert.match(r.stockReason(row),/구매 조건/);
    return rejected(r,row[0],1,/구매 조건/);
  });
}
test('recognized alchemy phrase cannot authorize an unrelated merchant',()=>{
  const r=fresh('MAP_MOND_CITY',20);enter(r,'MRC_MOND_GENERAL');
  const row=[...rows.get('STK_MOND_FOOD_001')];row[8]='연금 시설 접근';r.tables['19_SHOP_STOCK_DB'].set(row[0],row);
  assert.match(r.stockReason(row),/연금·의료 보급소/);return rejected(r,row[0],1,/연금·의료 보급소/);
});
test('recognized Snezhnaya-city phrase cannot authorize another city',()=>{
  const r=fixture(expected[3],20),row=[...rows.get(expected[3][0])];row[8]='스네즈나야성 진입';r.tables['19_SHOP_STOCK_DB'].set(row[0],row);
  assert.match(r.stockReason(row),/해당 도시/);return rejected(r,row[0],1,/해당 도시/);
});
test('entered merchant with mismatched NPC identity is rejected',()=>{
  const spec=expected.at(-1),r=fixture(spec);r.s.placeVisit.entity='NPC_MOND_SARA';
  assert.match(r.stockReason(rows.get(spec[0])),/직접 방문/);return rejected(r,spec[0],1,/직접 방문/);
});
test('craft mode does not authorize normalized alchemy purchases',()=>{
  const r=fresh();enter(r,'MRC_ALCHEMY_COMMON','CRAFT');
  assert.ok(r.stockReason(rows.get('STK_ALCH_MED_001')));return rejected(r,'STK_ALCH_MED_001');
});
test('leaving a normalized shop removes purchase authorization',()=>{
  const r=fixture(expected[3]);r.action('PLACE_LEAVE');assert.equal(r.currentPlace(),null);return rejected(r,expected[3][0]);
});
test('money, quantity and stock limits still apply after normalization',()=>{
  const spec=expected[3],r=fixture(spec),row=rows.get(spec[0]),checks=[];
  for(const q of [0,-1,1.5]) {assert.match(r.stockReason(row,q),/수량/);checks.push(rejected(r,row[0],q,/수량/));}
  r.s.global.MORA=Number(row[5])-1;assert.match(r.stockReason(row),/모라/);checks.push(rejected(r,row[0],1,/모라/));
  r.s.global.MORA=999999;
  while(r.stockRemaining(row)>0) purchase(r,row[0]);
  assert.match(r.stockReason(row),/재고/);checks.push(rejected(r,row[0],1,/재고/));
  return {rejections:checks};
});
test('authored DB stock conditions stayed unchanged',()=>assert.equal(JSON.stringify(db['19_SHOP_STOCK_DB']),originalRows));
const summary={source,dbPath,dbHash:hash(dbBytes),loaded:runtimeFiles,sourceHashes,total:results.length,passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,results};
fs.mkdirSync(path.dirname(reportPath),{recursive:true});
fs.writeFileSync(reportPath,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({total:summary.total,passed:summary.passed,failed:summary.failed,report:reportPath}));
process.exitCode=summary.failed?1:0;
