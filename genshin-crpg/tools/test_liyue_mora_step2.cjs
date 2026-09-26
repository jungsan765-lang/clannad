'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),DB=JSON.parse(fs.readFileSync(root+'/content/db.json'));
const report={version:'0.13.19',scope:'gameplay priority 2 only: Liyue random-field Mora settlement',fixture:'actual full runtime stack; synthetic battle starts, no story or loot fix',checks:[],samples:[]};
const clone=x=>JSON.parse(JSON.stringify(x));
function stack(dir){
 const c=vm.createContext({console,Date:class extends Date{static now(){return 1790355600000;}},setTimeout,clearTimeout,TextEncoder,TextDecoder});
 const html=fs.readFileSync(dir+'/index.html','utf8');
 for(const [,f] of html.matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ?]*)\.js)(?:\?[^" ]*)?"/g))vm.runInContext(fs.readFileSync(dir+'/'+f,'utf8'),c,{filename:f});
 vm.runInContext(fs.readFileSync(dir+'/save_adapter.js','utf8'),c,{filename:'save_adapter.js'});return c;
}
const runtimeDir=process.env.CRPG_RUNTIME_DIR||'source',ctx=stack(root+'/'+runtimeDir),R=ctx.CRPGRuntime.Runtime;
function test(name,fn){try{const evidence=fn();report.checks.push({name,passed:true,evidence:evidence||null});}catch(e){report.checks.push({name,passed:false,error:e.stack});console.error('FAIL',name,e.stack);}}
function fresh(map='MAP_LIYUE_PLAINS',seed=219){const r=new R(DB);r.newGame({name:'리월 모라 검증',route:'ROUTE_ISEKAI',seed,saveId:'LIYUE-MORA-'+seed+'-'+map});Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'HUB',STORY_CURSOR_NODE_ID:'HUB',ACTIVE_STORY_QUEST:'',SCREEN_MODE:'LOCATION',STORY_MENU_POLICY:'FULL',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:map,PLAYER_LEVEL_STATE:12,PLAYER_BASE_HP:100000});delete r.s.storyJourney;delete r.s.storyBreak;r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;return r;}
function settle(r,group,origin='RANDOM',victory=true){const before=r.s.global.MORA;r.startBattle(group,origin);const id=r.s.runtime.id;r.action('COMBAT_BEGIN',{battle:id});if(victory)for(const a of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))a.hp=0;const plan=r.liyueFieldMoraPlan(r.s.runtime);const result=r.finishBattle(victory);return{before,after:r.s.global.MORA,delta:r.s.global.MORA-before,plan,result,id};}
const cases=[
 ['MAP_LIYUE_PLAINS','EG_TREASURE_PATROL'],
 ['MAP_LIYUE_MOUNTAINS','EG_LIYUE_VISHAP'],
 ['MAP_LIYUE_JUEYUN','EG_LIYUE_HILI_ROCK'],
 ['MAP_CHASM_SURFACE','EG_CHASM_HUSK'],
 ['MAP_CHASM_DEEP','EG_CHASM_SERPENT']
];
for(const [map,group] of cases)test('Liyue random victory grants shared Mora: '+map+' / '+group,()=>{const r=fresh(map);const x=settle(r,group);assert(x.plan&&x.plan.mora>0);assert.equal(x.delta,x.plan.mora);assert.equal(x.result.mora,x.plan.mora);assert.equal(x.result.rewardPolicy,'LIYUE_FIELD_MORA_V2');assert.equal(x.result.moraMap,map);assert.equal(x.result.moraRisk,x.plan.risk);assert.deepEqual(clone(x.result.moraParts),clone(x.plan.parts));assert.equal(r.s.combatReceipts[x.id].mora,x.plan.mora);report.samples.push({map,group,mora:x.plan.mora,risk:x.plan.risk,parts:clone(x.plan.parts)});return{mora:x.plan.mora,risk:x.plan.risk};});
test('regional risk rises from plains to deep Chasm without altering enemy data',()=>{const risks=cases.map(([map,group])=>{const r=fresh(map);r.startBattle(group,'RANDOM');return r.liyueFieldMoraPlan(r.s.runtime).risk;});assert.deepEqual(risks,[3,3,4,5,6]);return{risks};});
test('defeat grants no Mora even with the regional reward plan recorded',()=>{const r=fresh();const x=settle(r,'EG_TREASURE_PATROL','RANDOM',false);assert.equal(x.delta,0);assert.equal(x.result.mora,0);assert.equal(x.result.rewardPolicy,'LIYUE_FIELD_MORA_V2');return{delta:x.delta};});
test('quest-origin Liyue battle keeps quest economy separate',()=>{const r=fresh();const x=settle(r,'EG_TREASURE_PATROL','QUEST:Q_LIYUE_EXP_PLAINS_CARAVAN',true);assert.equal(x.plan,null);assert.equal(x.delta,0);assert.equal(x.result.mora,undefined);assert.equal(x.result.rewardPolicy,undefined);return{delta:x.delta};});
test('Mond field reward remains owned by MOND_BALANCE_V1',()=>{const r=fresh('MAP_MOND_PLAINS');const x=settle(r,'EG_MOND_LOCAL_MOND_PLAINS_1');assert(x.delta>0);assert.equal(x.result.rewardPolicy,'MOND_BALANCE_V1');assert.equal(x.result.mora,x.delta);assert.equal(x.result.moraMap,undefined);return{mora:x.delta};});
test('save/reload before settlement preserves exact Liyue Mora result',()=>{const r=fresh('MAP_CHASM_SURFACE',220);r.startBattle('EG_CHASM_HUSK','RANDOM');r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});const resumed=new R(DB,JSON.parse(r.serialize()));for(const x of [r,resumed])for(const a of x.s.runtime.actors.filter(a=>a.side==='ENEMY'))a.hp=0;const a=r.finishBattle(true),b=resumed.finishBattle(true);assert.equal(a.mora,b.mora);assert.equal(a.rewardPolicy,b.rewardPolicy);assert.equal(r.s.global.MORA,resumed.s.global.MORA);assert.equal(r.serialize(),resumed.serialize());return{mora:a.mora};});
test('settled receipt cannot pay the same random battle twice',()=>{const r=fresh();const x=settle(r,'EG_TREASURE_PATROL');const after=r.s.global.MORA;assert.equal(r.finishBattle(true),undefined);assert.equal(r.s.global.MORA,after);assert.equal(Object.keys(r.s.combatReceipts).filter(k=>k===x.id).length,1);return{mora:x.delta};});
report.total=report.checks.length;report.passed=report.checks.filter(t=>t.passed).length;fs.mkdirSync(root+'/reports/liyue_mora_step2',{recursive:true});fs.writeFileSync(root+'/reports/liyue_mora_step2/runtime-tests.json',JSON.stringify(report,null,2));console.log(JSON.stringify({total:report.total,passed:report.passed,samples:report.samples},null,2));if(report.passed!==report.total)process.exitCode=1;
