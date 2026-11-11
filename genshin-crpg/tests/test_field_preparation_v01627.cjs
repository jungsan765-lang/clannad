'use strict';
// Native public preparation contracts. Materials, money, levels and region/story
// access are granted fixtures; collection time and natural account progression
// are outside these tests. No combat actor, boss or outcome is edited.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const H=require('../tools/audit_protagonist_v01618.cjs'),ROOT=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const RECIPE='REC_ARMOR_FROST',EQUIPMENT='EQ_ARMOR_FROSTWARD',AUTHORED_CONDITION='LEVEL>=5 / 설산 소재 확보';
// Independent authored material and price requirements; never read expected
// costs from the same recipe executor whose payment is being checked.
const COST={mora:180,items:{TRPG_COLD_IRON:3,TRPG_STURDY_CLOTH:2,TRPG_ELEMENTAL_DUST:2}},PLACE='EVT_SCHEDULE_MRC_MOND_EQUIP';
function run({env}={}){
 assert(env&&env.R&&env.db,'a native source, browser or server engine is required');
 const originalDB=sha(JSON.stringify(env.db)),checks=[],runtimes=[];
 const check=(id,fn)=>{try{checks.push({id,passed:true,evidence:fn()});}catch(e){checks.push({id,passed:false,error:e.stack});}};
 function fixture(level=5,map='MAP_MOND_CITY'){
  const r=H.setup(env,{level,team:[],gear:'none',talent:1,route:'ROUTE_ISEKAI',seed:717,map});runtimes.push(r);return r;
 }
 function fund(r,{snow=true}={}){for(const[id,n]of Object.entries(COST.items))if(snow||id!=='TRPG_COLD_IRON')r.giveItem(id,n);}
 function enter(r){const receipt=r.action('PLACE_ENTER',{place:PLACE,mode:'CRAFT'});assert.equal(receipt.ok,true);return receipt.result;}
 function rejectUnchanged(r,args,pattern){const before=r.serialize();assert.throws(()=>r.action('CRAFT',args),e=>typeof e.code==='string'&&pattern.test(e.message));assert.equal(r.serialize(),before,'rejected public craft is atomic, including money/items/time/PRNG');return {unchanged:true,reason:r.actionReason('CRAFT',args)};}
 check('frost_explanatory_suffix_normalizes_only_its_exact_authored_row',()=>{
  const r=fixture(),raw=r.row('17_RECIPE_DB',RECIPE),before=copy(raw),normalized=r.recipeDefinition(RECIPE);
  assert.equal(raw[18],AUTHORED_CONDITION);assert.equal(normalized[18],'LEVEL>=5');assert.notEqual(normalized,raw);
  const expected=copy(before);expected[18]='LEVEL>=5';assert.deepEqual(copy(normalized),expected);assert.deepEqual(copy(raw),before);
  const other=r.rows('17_RECIPE_DB').filter(row=>row[0]!==RECIPE&&String(row[18]||'').includes('/'));
  assert(other.length>0,'other authored explanatory conditions exist');for(const row of other)assert.equal(r.recipeDefinition(row[0])[18],row[18],'other recipe condition is not stripped: '+row[0]);
  assert.equal(r.recipeDefinition('REC_ARMOR_FLAME')[18],'LEVEL>=11 / 나타 지역 제작법 해금');
  return {authoredCondition:AUTHORED_CONDITION,executableCondition:'LEVEL>=5',otherConditionsPreserved:other.map(row=>row[0]),rawRowUnchanged:true};
 });
 check('level5_public_frost_craft_pays_actual_snow_materials_and_mora',()=>{
  const r=fixture();fund(r);const entry=enter(r),before={mora:r.s.global.MORA,time:r.s.global.WORLD_TIME,items:Object.fromEntries(Object.keys(COST.items).map(id=>[id,r.itemCount(id)])),equipment:r.s.inventory.filter(i=>i.equip===EQUIPMENT).length},raw=copy(r.row('17_RECIPE_DB',RECIPE));
  assert.equal(r.actionReason('CRAFT',{recipe:RECIPE}),'');const receipt=r.action('CRAFT',{recipe:RECIPE});assert.equal(receipt.ok,true);
  assert.deepEqual(copy(receipt.result.cost),COST);assert.equal(receipt.result.result,EQUIPMENT);assert.equal(receipt.result.quantity,1);assert.equal(receipt.result.minutes,120);
  assert.equal(before.mora-r.s.global.MORA,180);for(const[id,n]of Object.entries(COST.items)){assert.equal(before.items[id],n);assert.equal(r.itemCount(id),0);}
  assert.equal(r.s.inventory.filter(i=>i.equip===EQUIPMENT).length-before.equipment,1);assert.equal(before.time,'12:00');assert.equal(r.s.global.WORLD_TIME,'14:00');assert.deepEqual(copy(r.row('17_RECIPE_DB',RECIPE)),raw);
  return {entry,receipt:copy(receipt.result),before,after:{mora:r.s.global.MORA,time:r.s.global.WORLD_TIME,items:Object.fromEntries(Object.keys(COST.items).map(id=>[id,r.itemCount(id)]))},rawRowUnchanged:true};
 });
 check('level4_public_frost_craft_rejects_even_with_all_materials',()=>{
  const r=fixture(4);fund(r);enter(r);assert.match(r.craftReason(r.recipeDefinition(RECIPE)),/5레벨.*현재 4레벨/);return rejectUnchanged(r,{recipe:RECIPE},/5레벨.*현재 4레벨/);
 });
 check('snow_material_requirement_is_paid_not_bypassed_by_suffix_normalization',()=>{
  const r=fixture();fund(r,{snow:false});enter(r);assert.equal(r.itemCount('TRPG_COLD_IRON'),0);const evidence=rejectUnchanged(r,{recipe:RECIPE},/재료|아이템|부족|보유/);assert.equal(r.s.inventory.filter(i=>i.equip===EQUIPMENT).length,0);return {...evidence,missing:'TRPG_COLD_IRON',required:3};
 });
 check('frost_recipe_keeps_public_place_and_city_restrictions',()=>{
  const outside=fixture();fund(outside);const noVisit=rejectUnchanged(outside,{recipe:RECIPE},/장소|시설|제작|서비스/);
  const liyue=fixture(5,'MAP_LIYUE_HARBOR');fund(liyue);liyue.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_LIYUE_EQUIP',mode:'CRAFT'});const wrongCity=rejectUnchanged(liyue,{recipe:RECIPE},/장소|시설|제작|서비스/);
  return {outsideVisit:noVisit,wrongCity,allowedCity:'MAP_MOND_CITY',allowedPlace:PLACE};
 });
 check('recipe_queries_and_public_crafting_do_not_mutate_shared_db',()=>{
  for(const r of runtimes)assert.equal(r.row('17_RECIPE_DB',RECIPE)[18],AUTHORED_CONDITION);
  assert.equal(sha(JSON.stringify(env.db)),originalDB);return {sharedDBSHA256:originalDB,authoredCondition:AUTHORED_CONDITION,unchanged:true};
 });
 return {version:'0.16.27',fingerprint:env.fingerprint,scope:'Native frost armor public preparation; granted materials/funds/levels/region access, no acquisition-time or combat-difficulty claim.',total:checks.length,passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,checks};
}
module.exports={run,COST,RECIPE,EQUIPMENT};
if(require.main===module){const arg=k=>{const i=process.argv.indexOf(k);return i<0?undefined:process.argv[i+1];},root=path.resolve(arg('--root')||ROOT),env=H.load(root),result=run({env});if(arg('--out')){const file=path.resolve(arg('--out'));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');}for(const c of result.checks)if(!c.passed)console.error('FAIL '+c.id+' '+c.error);console.log(JSON.stringify({total:result.total,passed:result.passed,failed:result.failed}));if(result.failed)process.exitCode=1;}
