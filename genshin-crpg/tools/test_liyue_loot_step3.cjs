'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),DB=JSON.parse(fs.readFileSync(root+'/content/db.json'));
const runtimeDir=process.env.CRPG_RUNTIME_DIR||'source';
function stack(dir){
 const c=vm.createContext({console,Date:class extends Date{static now(){return 1790355600000;}},setTimeout,clearTimeout,TextEncoder,TextDecoder});
 const html=fs.readFileSync(dir+'/index.html','utf8');
 for(const [,f] of html.matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ?]*)\.js)(?:\?[^" ]*)?"/g)) vm.runInContext(fs.readFileSync(dir+'/'+f,'utf8'),c,{filename:f});
 vm.runInContext(fs.readFileSync(dir+'/save_adapter.js','utf8'),c,{filename:'save_adapter.js'});return c;
}
const ctx=stack(root+'/'+runtimeDir),R=ctx.CRPGRuntime.Runtime,copy=x=>JSON.parse(JSON.stringify(x));
const report={version:'0.13.20',runtimeDir,scope:'priority 3 Liyue loot + economy normalization',checks:[],samples:[]};
function test(name,fn){try{const evidence=fn();report.checks.push({name,passed:true,evidence:evidence||null});console.log('PASS '+name);}catch(e){report.checks.push({name,passed:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);}}
function fresh(map='MAP_LIYUE_PLAINS',seed=301,level=12,count=4){
 const r=new R(DB);r.newGame({name:'리월경제검증',route:'ROUTE_ISEKAI',seed,saveId:'LY-ECO-'+seed+'-'+map+'-'+count});
 Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'HUB',STORY_CURSOR_NODE_ID:'HUB',ACTIVE_STORY_QUEST:'',SCREEN_MODE:'LOCATION',STORY_MENU_POLICY:'FULL',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:map,PLAYER_LEVEL_STATE:level,PLAYER_BASE_HP:100000});delete r.s.storyJourney;delete r.s.storyBreak;r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;
 const ids=['MOND_NOELLE','MOND_AMBER','MOND_BARBARA'];r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(Object.fromEntries(ids.map(id=>[id,{state:'JOINED'}])));
 for(const [i,id] of ids.slice(0,count-1).entries()){r.s.chars[id].level=level;r.s.chars[id].hp=r.character(id).maxHp;r.setParty(id,i+2);}return r;
}
function settle(map,group,{origin='RANDOM',count=4,die=100,rand=.5,level=12,seed=301,victory=true}={}){
 const r=fresh(map,seed,level,count),before=r.s.global.MORA;r.startBattle(group,origin);r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});const b=r.s.runtime,id=b.id;
 r.die=()=>die;r.random=()=>rand;if(victory)for(const a of b.actors.filter(x=>x.side==='ENEMY'))a.hp=0;
 const plan=r.liyueFieldMoraPlan(b),result=r.finishBattle(victory);return{r,b,id,before,delta:r.s.global.MORA-before,plan,result};
}
const fixtures=[
 ['MAP_LIYUE_PLAINS','EG_TREASURE_PATROL'],['MAP_LIYUE_MOUNTAINS','EG_LIYUE_HILI_ROCK'],['MAP_LIYUE_JUEYUN','EG_LIYUE_VISHAP'],['MAP_CHASM_SURFACE','EG_LIYUE_RUIN'],['MAP_CHASM_SURFACE','EG_CHASM_HUSK'],['MAP_CHASM_DEEP','EG_CHASM_SERPENT']
];
test('source DB loot rows and chances are not rewritten',()=>{const rows=DB['20_LOOT_TABLE'].slice(1),find=(t,i)=>rows.find(r=>r[0]===t&&r[2]===i);assert.equal(find('LT_TREASURE','MAT_TREASURE_INSIGNIA')[5],80);assert.equal(find('LT_RUIN','MAT_CHAOS_DEVICE')[5],80);assert.equal(find('LT_VISHAP','TRPG_DRAGON_SCALE')[5],65);assert.equal(find('LT_ABYSS_KNIGHT','TRPG_ABYSS_KNIGHT_FRAGMENT')[5],55);return{contentUnchanged:true};});
test('market resale caps high-value Liyue crafting materials',()=>{const r=fresh();const got={};for(const id of ['TRPG_DRAGON_SCALE','TRPG_DRAGON_BLOOD_CRYSTAL','TRPG_ABYSS_KNIGHT_FRAGMENT','TRPG_ABYSS_SHARD','MAT_LEY_LINE_SPROUT']){r.giveItem(id,1);got[id]=r.saleUnitPrice(r.s.inventory.find(x=>x.item===id));}assert.deepEqual(got,{TRPG_DRAGON_SCALE:30,TRPG_DRAGON_BLOOD_CRYSTAL:200,TRPG_ABYSS_KNIGHT_FRAGMENT:90,TRPG_ABYSS_SHARD:70,MAT_LEY_LINE_SPROUT:120});return got;});
for(const [map,group] of fixtures)test('Liyue random victory pays bounded shared Mora '+group,()=>{const x=settle(map,group,{die:100});assert(x.plan&&x.plan.version===2);assert.equal(x.delta,x.plan.mora);assert.equal(x.result.mora,x.plan.mora);assert.equal(x.result.rewardPolicy,'LIYUE_FIELD_MORA_V2');assert(x.delta>=10&&x.delta<=180,'Mora out of target band: '+x.delta);report.samples.push({map,group,mora:x.delta,enemies:x.b.actors.filter(a=>a.side==='ENEMY').map(a=>({source:a.source,level:a.level,grade:a.grade}))});return{mora:x.delta};});
test('small-party scaling also lowers direct Mora instead of becoming a solo farm exploit',()=>{const four=settle('MAP_LIYUE_PLAINS','EG_TREASURE_PATROL',{count:4,die:100}).delta,one=settle('MAP_LIYUE_PLAINS','EG_TREASURE_PATROL',{count:1,die:100}).delta;assert(one<four);assert(one>=10);return{one,four};});
test('defeat gives no direct Mora',()=>{const x=settle('MAP_LIYUE_PLAINS','EG_TREASURE_PATROL',{victory:false,die:1});assert.equal(x.delta,0);assert.equal(x.result.mora,0);return{mora:x.delta};});
test('quest battle keeps quest Mora separate but now receives eligible monster materials',()=>{const x=settle('MAP_LIYUE_PLAINS','EG_TREASURE_PATROL',{origin:'QUEST:Q_LIYUE_EXP_PLAINS_CARAVAN',die:1});assert.equal(x.plan,null);assert.equal(x.delta,0);assert.equal(x.result.mora,undefined);assert((x.result.loot.MAT_TREASURE_INSIGNIA||0)>0);assert((x.result.loot.MAT_SILVER_INSIGNIA||0)>0);return{loot:x.result.loot};});
test('treasure, ruin, elite hilichurl and Chasm conditional rows really drop on successful rolls',()=>{
 const a=settle('MAP_LIYUE_PLAINS','EG_TREASURE_PATROL',{die:1}).result.loot;assert(a.MAT_TREASURE_INSIGNIA>0&&a.MAT_SILVER_INSIGNIA>0);
 const b=settle('MAP_CHASM_SURFACE','EG_LIYUE_RUIN',{die:1}).result.loot;assert(b.MAT_CHAOS_DEVICE>0&&b.MAT_CHAOS_CIRCUIT>0&&b.TRPG_SCRAP_METAL>0);
 const c=settle('MAP_LIYUE_MOUNTAINS','EG_LIYUE_HILI_ROCK',{die:1}).result.loot;assert(c.MAT_DAMAGED_MASK>0&&c.MAT_STAINED_MASK>0&&c.MAT_OMINOUS_MASK>0);
 const d=settle('MAP_CHASM_DEEP','EG_CHASM_SERPENT',{die:1}).result.loot;assert(d.MAT_LEY_LINE_SPROUT>0&&d.TRPG_ABYSS_KNIGHT_FRAGMENT>0&&d.TRPG_ABYSS_SHARD>0);
 return{treasure:a,ruin:b,hili:c,chasm:d};
});
test('hatchling drops scale but not strong-vishap blood crystal',()=>{const x=settle('MAP_LIYUE_JUEYUN','EG_LIYUE_VISHAP',{die:1}).result.loot;assert((x.TRPG_DRAGON_SCALE||0)>0);assert.equal(x.TRPG_DRAGON_BLOOD_CRYSTAL,undefined);return x;});
test('condition rejection is explicit and does not open unrelated tables',()=>{const r=fresh('MAP_LIYUE_PLAINS');r.startBattle('EG_TREASURE_PATROL','RANDOM');const a=r.s.runtime.actors.find(x=>x.side==='ENEMY'),fake=['LT_ABYSS_KNIGHT','','TRPG_ABYSS_SHARD',1,1,100,'흑 뱀 기사'];assert.equal(r.liyueLootConditionAllowed(r.s.runtime,a,fake),false);return{source:a.source};});
test('Mond reward ownership remains MOND_BALANCE_V1',()=>{const r=fresh('MAP_MOND_PLAINS');r.startBattle('EG_MOND_LOCAL_MOND_PLAINS_1','RANDOM');r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});for(const a of r.s.runtime.actors.filter(x=>x.side==='ENEMY'))a.hp=0;r.die=()=>100;const before=r.s.global.MORA,out=r.finishBattle(true);assert.equal(out.rewardPolicy,'MOND_BALANCE_V1');assert(out.mora>0);assert.equal(r.s.global.MORA-before,out.mora);assert.equal(out.moraMap,undefined);return{mora:out.mora};});
test('expected liquid value stays below economy ceiling for current Liyue field groups',()=>{const ceilings={EG_TREASURE_PATROL:260,EG_LIYUE_HILI_ROCK:240,EG_LIYUE_VISHAP:180,EG_LIYUE_RUIN:230,EG_CHASM_HUSK:430,EG_CHASM_SERPENT:470},summary={};for(const [map,group] of fixtures){const r=fresh(map,444,12,4);r.startBattle(group,'RANDOM');r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});const b=r.s.runtime,plan=r.liyueFieldMoraPlan(b);let resale=0;for(const a of b.actors.filter(x=>x.side==='ENEMY')){const m=r.row('09_MONSTER_DB',a.source);for(const d of r.combatRows('20_LOOT_TABLE').filter(x=>x[0]===m[14]&&(!x[1]||x[1]===a.source))){const base=['','없음','일반 슬라임 희귀 드랍','일반 슬라임 매우 희귀'].includes(d[6]||''),allowed=base||r.liyueLootConditionAllowed(b,a,d);if(!allowed)continue;const priceRow=r.row('14_ITEM_DB',d[2]);r.giveItem(d[2],1);const inv=r.s.inventory.find(x=>x.item===d[2]),price=r.saleUnitPrice(inv);r.pay({items:{[d[2]]:1}});resale+=Number(d[5])/100*((Number(d[3])+Number(d[4]))/2)*price;}}
 const liquid=Math.round(plan.mora+resale);summary[group]={mora:plan.mora,expectedResale:Math.round(resale),expectedLiquid:liquid,ceiling:ceilings[group]};assert(liquid<=ceilings[group],group+' liquid '+liquid+' > '+ceilings[group]);}return summary;});
report.total=report.checks.length;report.passed=report.checks.filter(x=>x.passed).length;fs.mkdirSync(root+'/reports/liyue_loot_step3',{recursive:true});fs.writeFileSync(root+'/reports/liyue_loot_step3/runtime-tests.json',JSON.stringify(report,null,2));console.log(JSON.stringify({total:report.total,passed:report.passed,samples:report.samples},null,2));if(report.total!==report.passed)process.exitCode=1;
