'use strict';
// Independent opening observations. No enemy, roll, action or victory is replaced.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../../../..'),H=require(path.join(ROOT,'tools/audit_protagonist_v01618.cjs')),cp=x=>JSON.parse(JSON.stringify(x));
const NOW=1791615600000,FixedDate=class extends Date{constructor(...args){super(...(args.length?args:[NOW]));}static now(){return NOW;}};
const scripts=[...fs.readFileSync(path.join(ROOT,'source/index.html'),'utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)].map(m=>m[1]);
const changed=['runtime_abyss.js','runtime_formations.js','runtime_growth_v01522.js','runtime_balance_admin_v01623.js'];
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,p))).digest('hex');
const hashes=()=>Object.fromEntries(scripts.map(f=>['source/'+f,sha('source/'+f)])),before=hashes();
for(const [f,h]of Object.entries({
 'runtime_abyss.js':'bfe0d10cde798b29b91e13db7feb3d74da3c5e5b6561f63af523eba751eb9d84',
 'runtime_formations.js':'b8990bbc326902afd1e4d3d80ff5c472825a629e5d35c7fa2fa9184fb58b74dd',
 'runtime_growth_v01522.js':'0cfbce046bdcc77df245bb8cd43dd24340bd898827aec8e8db33276bba8800ed',
 'runtime_balance_admin_v01623.js':'838f10fab7738ece5ad232ad606cbf2ed952bf1098416132e5e9a5ddc6db015f'}))assert.equal(before['source/'+f],h,'frozen source '+f);
function load(old){const c=vm.createContext({console,Date:FixedDate,setTimeout,clearTimeout});for(const f of scripts){const p=old&&changed.includes(f)?'docs/data/abyss_fixes_v01626/baseline/'+f:'source/'+f;vm.runInContext(fs.readFileSync(path.join(ROOT,p),'utf8'),c,{filename:f});}return{c,db:JSON.parse(fs.readFileSync(path.join(ROOT,'content/db.json'),'utf8')),R:c.CRPGRuntime.Runtime,api:c.CRPGRuntime,root:ROOT};}
const old=load(true),now=load(false),results=[],TEAM=['MOND_AMBER','MOND_KAEYA','MOND_NOELLE'];
function prepare(e,s){let r=H.setup(e,{level:s.playerLevel||60,team:TEAM,route:s.route||'ROUTE_TRAVELER',seed:717,map:s.map||'MAP_MOND_PLAINS',gear:'none',talent:1});
 r.s.global.SAVE_ID=s.saveId||'INITIATIVE-'+s.id;
 if(s.admin){const config=e.api.adminBalance.emptyConfig();for(const row of e.api.adminBalance.catalog(r).enemies)config.enemies[row.id]={spd:s.admin};const profile={revision:600+s.admin,config};r=e.api.adminBalance.createRuntime(e.db,cp(r.s),profile);r._reviewProfile=profile;}
 r.action('FORMATION_SET',{formation:'ECHELON'});
 if(s.food)for(const owner of r.abyssParty()){r.giveItem('FOOD_CREAM_STEW',1);r.action('USE_ITEM',{item:'FOOD_CREAM_STEW',owner});}
 if(s.before)s.before(r,e);
 return r;
}
function enter(e,s){const r=prepare(e,s),stat=r.combatStat,round=r.newRound,die=r.die,trace={speeds:{},rolls:{}};let measuring=false,last;
 r.combatStat=function(a,k){const n=stat.call(this,a,k);if(measuring&&k==='spd'){if(trace.speeds[a.id]===undefined)trace.speeds[a.id]=n;last=a.id;}return n;};
 r.die=function(...args){const n=die.apply(this,args);if(measuring&&args[0]===10&&last&&trace.rolls[last]===undefined)trace.rolls[last]=n-1;return n;};
 r.newRound=function(...args){const initial=this.s.runtime?.phase==='START'&&!this.s.runtime?.opening;measuring=initial;try{return round.apply(this,args);}finally{if(initial)trace.initialOrder=cp(this.s.runtime.order);measuring=false;}};
 let out;try{out=s.enter(r,e);}finally{delete r.combatStat;delete r.die;delete r.newRound;}
 assert(r.s.runtime,'native battle entry '+s.id);assert.equal(r.s.runtime.opening.state,'PENDING');assert(r.s.runtime.actors.every(a=>a.turns===0));assert(trace.initialOrder?.length);
 for(const q of trace.initialOrder)assert.equal(q.score,trace.speeds[q.id]+trace.rolls[q.id],'unmodified native initial score '+q.id);
 return{r,b:r.s.runtime,trace,out,profile:r._reviewProfile};
}
function compare(s){const a=enter(old,s),b=enter(now,s),detail=[];
 assert.equal(b.r.s.global.PRNG_STATE,a.r.s.global.PRNG_STATE,'same random state');assert.deepEqual(cp(b.b.actors),cp(a.b.actors),'same final actors and balance stats');assert.deepEqual(b.trace,a.trace,'same original native speeds and rolls');
 assert.equal(b.b.order[0].id,'PLAYER_CUSTOM','intentional player-first');assert.deepEqual(cp(b.b.opening.initialOrder),cp(b.b.order),'final opening snapshot');
 for(const q of b.b.order){const actor=b.b.actors.find(x=>x.id===q.id),final=b.r.combatStat(actor,'spd'),roll=b.trace.rolls[q.id];assert.equal(q.score,final+roll,'exact final speed + native original roll '+s.id+'/'+q.id);const oq=a.b.order.find(x=>x.id===q.id);assert.equal(q.first,oq.first);detail.push({id:q.id,side:actor.side,source:actor.source,affixes:actor.variant?.affixes||[],initialSpeed:b.trace.speeds[q.id],finalSpeed:final,roll,oldScore:oq.score,score:q.score});}
 const tail=b.b.order.slice(1),sorted=[...tail].sort((x,y)=>Number(y.first)-Number(x.first)||y.score-x.score||x.id.localeCompare(y.id));assert.deepEqual(cp(tail),cp(sorted),'final sorted tail');
 // Receipts returned directly by startBattle are part of this narrow contract.
 if(s.direct)assert.deepEqual(cp(b.out.order),cp(b.r.combatOrderView()),'final public startBattle order');
 const saved=JSON.parse(a.r.serialize()),loaded=a.profile?now.api.adminBalance.createRuntime(now.db,cp(saved),a.profile):new now.R(now.db,cp(saved));assert.deepEqual(cp(loaded.s.runtime),saved.runtime,'legacy save order and complete runtime preserved');
 results.push({id:s.id,origin:b.b.origin,publicEntry:!s.direct,administrativeSpeed:s.admin||null,food:!!s.food,finalActorsIdentical:true,originalRollsIdentical:true,legacyRuntimeUnchanged:true,rows:detail,deferredSummons:b.b.actors.filter(x=>x.side==='ENEMY'&&!b.b.order.some(q=>q.id===x.id)).map(x=>x.id)});
 console.log(JSON.stringify({id:s.id,pass:true,origin:b.b.origin,enemies:detail.filter(x=>x.side==='ENEMY').length}));global.gc?.();return b;
}
const ordinary=(id,map,origin='RANDOM',extra={})=>({id,map,direct:true,...extra,enter:r=>r.startBattle('EG_MOND_HILI_PATROL',origin)});
compare(ordinary('random_plain','MAP_MOND_PLAINS'));
compare(ordinary('random_food_admin_1000','MAP_MOND_PLAINS','RANDOM',{food:true,admin:1000}));
compare(ordinary('quest_admin_1','MAP_MOND_FOREST','QUEST:OPENING_CONTRACT',{food:true,admin:1}));
// Pick a native SAVE_ID that produces SWIFT; deterministic affix hashes are never replaced.
let swift;
for(let i=0;i<80&&!swift;i++){const s=ordinary('swift_native','MAP_MOND_FOREST','RANDOM',{saveId:'INITIATIVE-SWIFT-'+i,food:true}),r=prepare(old,s);s.enter(r,old);if(r.s.runtime.actors.some(a=>a.variant?.affixes.includes('SWIFT')))swift=s;global.gc?.();}
assert(swift,'found deterministic native SWIFT fixture');compare(swift);compare({...swift,id:'swift_native_admin_88',admin:88});
for(const id of ['VALLEY_OF_REMEMBRANCE:5','CECILIA_GARDEN:25','LIANSHAN_FORMULA:60','FORSAKEN_RIFT:5','FORSAKEN_RIFT:25','TAISHAN_MANSION:60','MIDSUMMER_COURTYARD:5','DOMAIN_OF_GUYUN:55','LOST_VALLEY:60']){const domain=now.api.growthV01522.domains[id.split(':')[0]];compare({id:'domain_'+id,map:domain.map,food:true,enter:r=>r.action('DOMAIN_START',{domain:id,element:'NEUTRAL'})});}
for(const region of ['몬드','리월'])for(const tier of now.api.leyLines.regionalTiers(region)){const site=now.api.leyLines.sitesAt(Math.floor(NOW/3600000)).find(x=>x.region===region&&x.kind==='REVELATION');compare({id:'ley_'+region+'_'+tier.tier,map:site.map,food:true,enter:(r,e)=>{const route=e.api.leyLines.route('REVELATION',site.map);r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});return r.action('BOSS_ROUTE',{route,entry:'DIRECT',tier:tier.tier});}});}
const specs=Object.keys(now.api.fieldBosses.bosses).map(source=>({source,kind:'FIELD',map:now.api.fieldBosses.bosses[source].map}));
for(const source of ['BOSS_ANDRIUS','BOSS_DVALIN'])specs.push({...now.api.enhancementConfig.bosses[source],source,kind:'MOND'});
for(const [kind,f]of Object.entries(now.api.liyueArtifactConfig.farm))specs.push({...f,source:kind==='TARTAGLIA'?'BOSS_TARTAGLIA':'BOSS_AZHDAHA',kind:'LIYUE',farmKind:kind});
for(const spec of specs)compare({id:'boss_'+spec.source,map:spec.map,food:true,before:r=>{if(spec.kind==='MOND')r.s.flags[r.row('35_BOSS_ROUTE_DB',spec.route)[13]]=true;if(spec.farmKind==='AZHDAHA')r.s.flags[r.row('35_BOSS_ROUTE_DB','BRT_AZHDAHA')[13]]=true;},enter:r=>{if(spec.kind==='FIELD'){const route=r.fieldBossCatalog().find(x=>x.id===spec.source).route;r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});return r.action('BOSS_ROUTE',{route,entry:'DIRECT'});}if(spec.kind==='MOND')return r.action('MOND_MATERIAL_CHALLENGE',{boss:spec.source});return r.action('LIYUE_ARTIFACT_CHALLENGE',{kind:spec.farmKind});}});
const storyGroup='EG_ISK_M04_AA_DVALIN',srt=prepare(now,{id:'story_metadata',route:'ROUTE_ISEKAI'}),cfg=srt.combatStoryConfig(storyGroup);
compare({id:'story_dvalin',route:'ROUTE_ISEKAI',map:cfg.map_id||cfg.map,direct:true,food:true,before:r=>{r.s.global.CURRENT_STORY_NODE_ID=cfg.node_id;r.s.global.STORY_CURSOR_NODE_ID=cfg.node_id;},enter:r=>r.startBattle(storyGroup,'STORY:'+cfg.node_id,{confirmed:true,companions:TEAM})});
compare({id:'raid_excluded',map:'MAP_MOND_PLAINS',food:true,before:r=>{r.raidServerEvent={id:'RAID_626',boss:'MON_RAID_GRADER',startsAt:NOW-60000,endsAt:NOW+3600000,target:4000};},enter:r=>r.action('RAID_ENTER')});
assert.deepEqual(hashes(),before,'source hashes unchanged');
const report={scope:'Independent paired opening observations through native public admission, or explicitly labeled direct native startBattle calls. These do not simulate victories, measure difficulty, or claim campaign/acquisition feasibility.',method:'Pass-through first newRound/combatStat/die observers capture exact original initiative roll per actor; final score must equal final combatStat SPD plus that same roll. No artificial enemy, RNG, action, recovery, or result changes.',cases:results.length,passed:results.length,failed:0,sourceBefore:before,sourceAfter:hashes(),qaDBSHA256:sha('content/db.json'),details:results};
fs.writeFileSync(path.join(__dirname,'STARTUP_ORIGINS.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:results.length,passed:results.length,failed:0}));
