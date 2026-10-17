'use strict';
// Native candidate comparison. One initial heal/seed per campaign; saved HP and
// RNG carry through every battle. Candidate stats are declared fixed stage
// tables applied before COMBAT_BEGIN; no forced results or between-fight heals.
const {setup,observe,G,PLAYER,api}=require('./audit_balance_v01522.cjs');
const {policy,REFERENCE_TEAM}=require('./audit_balance_v0161.cjs');
const {c,fs,path,root}=require('../tests/helpers_v011.cjs');
const crypto=require('node:crypto'),digest=relative=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,relative))).digest('hex');
const SOURCE_SNAPSHOT={growthSourceSha256:digest('source/runtime_growth_v01522.js'),innSourceSha256:digest('source/runtime.js'),dbSha256:digest('content/db.json'),materialBudgetVersion:api.growthV01522.materialBudgetVersion,durability:copyBudget(api.growthV01522.materialDurabilityBudgets),pressure:copyBudget(api.growthV01522.materialAttackPressureBudgets)};
function copyBudget(x){return x===undefined?null:JSON.parse(JSON.stringify(x));}
const PARTY=[PLAYER,...REFERENCE_TEAM],copy=x=>JSON.parse(JSON.stringify(x));
const DEFAULT_OUT=path.join(root,'docs/data/material_candidates_v01615.json');
const STAGES=[5,10,15,20,25,30,35,40,45,50,55,60];
const CANDIDATES={
 durable:{
  durability:{5:3400,10:5800,15:7500,20:9200,25:10900,30:30000,35:32000,40:34000,45:36000,50:38000,55:46000,60:48000},
  pressure:{5:525,10:730,15:880,20:1070,25:1270,30:5120,35:5460,40:5750,45:6040,50:6340,55:6630,60:6920},weightPower:.5
 },
 paced:{
  hp:{5:2700,10:4200,15:5200,20:6200,25:7200,30:19500,35:20500,40:21500,45:22500,50:23500,55:24500,60:25500},
  atk:{5:540,10:750,15:900,20:1100,25:1300,30:5250,35:5600,40:5900,45:6200,50:6500,55:6800,60:7100},weightPower:.5,
  sourceHpWeights:{MON_GEOVISHAP_HATCHLING:.4}
 },
 moderate:{
  hp:{5:2700,10:11200,15:12000,20:13000,25:14000,30:19500,35:20500,40:21500,45:22500,50:23500,55:24500,60:25500},
  atk:{5:540,10:2400,15:2600,20:2800,25:3000,30:5250,35:5600,40:5900,45:6200,50:6500,55:6800,60:7100},weightPower:.5
 },
 compact:{
  hp:{5:2700,10:11200,15:11800,20:12400,25:13000,30:19500,35:19800,40:20100,45:20400,50:20700,55:21000,60:21300},
  atk:{5:540,10:2400,15:2600,20:2800,25:3000,30:5250,35:5400,40:5550,45:5700,50:5850,55:6000,60:6150},weightPower:0
 }
};
function allocate(total,weights){const sum=weights.reduce((n,x)=>n+x,0),raw=weights.map(x=>total*x/sum),values=raw.map(Math.floor);for(const i of raw.map((x,i)=>[i,x-values[i]]).sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,total-values.reduce((n,x)=>n+x,0)))values[i[0]]++;return values;}
function applyBudget(r,b,candidate){
 const d=b.growthDomain;if(!d||!['TALENT','ASCENSION'].includes(d.kind))return;
 const foes=[...b.actors,...(b.enemyReserve||[])].filter(a=>a.side==='ENEMY'&&!a.fbSummon),totalHp=candidate.hp?.[d.level],totalAtk=candidate.atk?.[d.level];
 const hpWeights=foes.map(a=>a.maxHp**candidate.weightPower*(candidate.sourceHpWeights?.[a.source]||1)),atkWeights=foes.map(a=>a.atk**candidate.weightPower);
 const factors=foes.map(a=>(1+Math.max((a.shields||[]).reduce((n,s)=>n+s.value,0)/a.maxHp,a.source==='MON_FATUI_GEO'?.2:0))*(1+r.combatStat(a,'def')/100)/(a.source==='MON_MITACHURL_WOOD'?.65:1)),cadence=foes.map(a=>a.source.startsWith('MON_SLIME_LARGE_')?1.9:a.source==='MON_MITACHURL_AXE'?1.675:.975);
 const hp=candidate.durability?hpWeights.map((w,i)=>Math.max(1,Math.round(candidate.durability[d.level]*w/hpWeights.reduce((n,x)=>n+x,0)/factors[i]))):allocate(totalHp,hpWeights),atk=candidate.pressure?atkWeights.map((w,i)=>Math.max(1,Math.round(candidate.pressure[d.level]*w/atkWeights.reduce((n,x)=>n+x,0)/cadence[i]))):allocate(totalAtk,atkWeights);
 foes.forEach((a,i)=>{const previous=a.maxHp;a.hp=a.maxHp=hp[i];a.atk=atk[i];for(const s of a.shields||[]){s.value=Math.round(s.value*hp[i]/previous);if(s.initialValue)s.initialValue=Math.round(s.initialValue*hp[i]/previous);}});
 b.materialBudgetCandidate={totalHp:hp.reduce((n,x)=>n+x,0),totalAtk:atk.reduce((n,x)=>n+x,0),targetDurability:candidate.durability?.[d.level],targetPressure:candidate.pressure?.[d.level],weightPower:candidate.weightPower};
}
const persistentHp=r=>PARTY.map(id=>({id,hp:id===PLAYER?r.s.global.PLAYER_HP_CURRENT:r.s.chars[id].hp,maxHp:id===PLAYER?r.s.global.PLAYER_HP_MAX:r.character(id).maxHp}));
const itemCount=(r,id)=>r.s.inventory.filter(x=>x.item===id).reduce((n,x)=>n+Number(x.quantity||0),0);
function campaign({candidate='moderate',kind='TALENT',level=20,stage=20,route='ROUTE_TRAVELER',element='NEUTRAL',seed=717,limit=12,target=0,recovery=false}={}){
 const [key,site]=Object.entries(G.domains).find(([,x])=>x.kind===kind&&x.levels.includes(stage)),domain=key+':'+stage,enhance=level<30?3:6;
 const r=setup({level,route,team:REFERENCE_TEAM,map:site.map,gear:'craft',enhance,talent:'mid'});Object.assign(r.tutorialState().done,{combatAttack:true,combatGuard:true,combatSkill:true,combatBurst:true});
 r.s.global.PRNG_STATE=seed;r.s.global.MORA=10000;r.s.domainDaily={day:G.dayOf(r.leyLineNow()),wins:3};observe(r);
 const nativeStart=r.startBattle;if(candidate!=='shipped'){r.tuneMaterialDomain=function(b,d){delete d.materialBudgetVersion;};r.startBattle=function(...args){const prior=this.s.runtime,out=nativeStart.apply(this,args),b=this.s.runtime;if(b&&b!==prior)applyBudget(this,b,CANDIDATES[candidate]);return out;};}
 const nativeAction=r.action;let presentationMs=0,inputs=0;
 r.action=function(type,args){const before=c.CRPGPresentation.snapshot(this.s),out=nativeAction.call(this,type,args);for(const f of c.CRPGPresentation.actionFrames(c.CRPGPresentation.delta(before,this.s))){if(f.kind==='state'&&f.silent)continue;presentationMs+=f.kind==='action'?460+(f.attemptCount>1?520:650):1400;}if(type==='COMBAT')inputs++;return out;};
 const item=kind==='TALENT'?'GROWTH_TALENT_'+(site.region==='몬드'?'MOND':'LIYUE'):'GROWTH_GEM_'+element;
 const row={candidate,configuration:candidate==='shipped'?copy(SOURCE_SNAPSHOT):copy(CANDIDATES[candidate]),kind,level,phase:G.phaseFor(level),stage,region:site.region,domain,route,element,seed,enhance,limit,target,recovery,item,party:PARTY,initialHp:persistentHp(r),wins:0,losses:0,materials:0,seconds:0,battles:[],recoveries:[]};
 function nativeRest(){
  const before=persistentHp(r),wallet=r.s.global.MORA,actions=[],encounters=[],city=site.region==='몬드'?'MAP_MOND_CITY':'MAP_LIYUE_HARBOR',stock=site.region==='몬드'?'STK_INN_MOND':'STK_INN_LIYUE',place=site.region==='몬드'?'EVT_SCHEDULE_MRC_MOND_INN':'EVT_SCHEDULE_MRC_LIYUE_INN';let seconds=0,lodgingCost=0;
  function act(type,args,visual){const t=presentationMs,n=inputs;seconds+=visual+3;r.action(type,args);actions.push({type,...args,map:r.s.global.CURRENT_MAP_ID});if(r.s.runtime){const result=policy(r),duration=(presentationMs-t)/1000+(inputs-n)*3+6+Number(result.defeatPenalty?.seconds||0);seconds+=duration;encounters.push({result:copy(result),seconds:duration});if(!result.victory)throw Error('RECOVERY_TRAVEL_DEFEAT');}}
  try{
   const outward=r.navigationRoute(city);if(!outward)throw Error('NO_LODGING_ROUTE');for(const edge of outward.edges)act('MOVE',{edge:edge[0]},1);
   act('PLACE_ENTER',{place,mode:'SHOP'},1);const costBefore=r.s.global.MORA;act('BUY',{stock,quantity:1},3);lodgingCost=costBefore-r.s.global.MORA;
   const afterLodging=persistentHp(r);if(afterLodging.some(x=>x.hp!==x.maxHp))throw Error('LODGING_HP_MISMATCH');
   const backward=r.navigationRoute(site.map);if(!backward)throw Error('NO_RETURN_ROUTE');for(const edge of backward.edges)act('MOVE',{edge:edge[0]},1);
   return {before,afterLodging,after:persistentHp(r),actions,encounters,seconds,lodgingCost,mora:r.s.global.MORA-wallet};
  }catch(e){return {failed:true,reason:e.code||e.message,before,after:persistentHp(r),actions,encounters,seconds,lodgingCost,mora:r.s.global.MORA-wallet};}
 }
 for(let index=0;index<limit;index++){
  const reason=r.actionReason('DOMAIN_START',{domain,element});if(reason){row.stop='ENTRY_BLOCKED';row.reason=reason;break;}
  const hpBefore=persistentHp(r),rngBefore=r.s.global.PRNG_STATE,countBefore=itemCount(r,item);presentationMs=0;inputs=0;r.action('DOMAIN_START',{domain,element});
  const enemies=r.s.runtime.actors.filter(a=>a.side==='ENEMY').map(a=>({source:a.source,hp:a.maxHp,atk:a.atk,def:a.def,shield:(a.shields||[]).reduce((n,s)=>n+s.value,0)}));
  const result=policy(r),materials=itemCount(r,item)-countBefore,seconds=presentationMs/1000+inputs*3+6+Number(result.defeatPenalty?.seconds||0),hpAfter=persistentHp(r);
  row.battles.push({index:index+1,hpBefore,hpAfter,rngBefore,rngAfter:r.s.global.PRNG_STATE,enemies,result:copy(result),materials,seconds,presentationMs,inputs});row.wins+=result.victory?1:0;row.losses+=result.victory?0:1;row.materials+=materials;row.seconds+=seconds;row.finalHp=hpAfter;
  if(!result.victory){row.stop='FIRST_LOSS';break;}
  if(target>0&&row.materials>=target){row.stop='TARGET_REACHED';break;}
  if(recovery&&hpAfter.some(x=>x.hp<=0||x.hp/x.maxHp<.5)){const trip=nativeRest();row.recoveries.push(trip);row.seconds+=trip.seconds;row.finalHp=persistentHp(r);if(trip.failed){row.stop='RECOVERY_FAILED';row.reason=trip.reason;break;}}
 }
 row.stop??='VICTORY_LIMIT';row.rate=row.materials*60/row.seconds;row.meanSeconds=row.seconds/row.battles.length;row.meanRounds=row.battles.reduce((n,x)=>n+x.result.rounds,0)/row.battles.length;row.recoveryExcluded=!recovery;row.netMora=r.s.global.MORA-10000;return row;
}
if(require.main===module){
 if(process.env.CRPG_MATERIAL_VERIFY_PRICING_FIX==='1'){
  const assert=require('node:assert/strict'),file=process.env.CRPG_MATERIAL_OUT||DEFAULT_OUT,rawText=fs.existsSync(file)?fs.readFileSync(file,'utf8'):require('node:zlib').gunzipSync(fs.readFileSync(file+'.gz')).toString('utf8'),raw=JSON.parse(rawText),targets=raw.rows.filter(r=>r.mode==='FINAL_SOURCE_TARGET_COMPLETION'),originalRawHash=raw.postPricingFixVerification?.originalRawSha256||crypto.createHash('sha256').update(rawText).digest('hex');
  assert.equal(SOURCE_SNAPSHOT.growthSourceSha256,raw.sourceSnapshot.growthSourceSha256,'Material source changed; this pricing-only verification would be insufficient.');
  assert.equal(SOURCE_SNAPSHOT.dbSha256,raw.sourceSnapshot.dbSha256,'Native content changed; this pricing-only verification would be insufficient.');
  assert(raw.rows.every(r=>r.recoveries.length===0),'Some original campaign used lodging; its new fee must be replayed to full completion.');
  assert.equal(raw.rows.reduce((n,r)=>n+r.battles.length,0),raw.counts.totalNativeBattles);
  // Independent arithmetic boundary fixture. It does not alter combat states.
  const quoteRuntime=setup({level:6,team:[],gear:'none'});quoteRuntime.player=()=>({source:PLAYER,level:6,hp:935,maxHp:1020});
  const boundary=quoteRuntime.innRecoveryQuote(quoteRuntime.row('19_SHOP_STOCK_DB','STK_INN_MOND'));
  assert.equal(boundary.targets.length,1);assert.equal(boundary.targets[0].recoveryCost,2);assert.equal(boundary.cost,22);
  const comparable=b=>({hpBefore:b.hpBefore,hpAfter:b.hpAfter,rngBefore:b.rngBefore,rngAfter:b.rngAfter,enemies:b.enemies,victory:b.result.victory,rounds:b.result.rounds,deaths:b.result.deaths,materials:b.materials,seconds:b.seconds,presentationMs:b.presentationMs,inputs:b.inputs});
  const checked=[];let battles=0;
  for(const old of targets){const count=Math.min(12,old.battles.length),now=campaign({candidate:'shipped',kind:old.kind,level:old.level,stage:old.stage,route:old.route,element:old.element,seed:old.seed,limit:count,target:old.target,recovery:old.recovery});assert.equal(now.recoveries.length,0);assert.equal(now.battles.length,count);for(let i=0;i<count;i++)assert.deepEqual(copy(comparable(now.battles[i])),comparable(old.battles[i]),old.route+' '+old.domain+' '+old.element+' battle '+(i+1));battles+=count;checked.push({kind:old.kind,domain:old.domain,route:old.route,element:old.element,seed:old.seed,originalTarget:old.target,originalBattles:old.battles.length,replayedPrefixBattles:count,identical:true});console.log(JSON.stringify(checked.at(-1)));}
  raw.postPricingFixVerification={verifiedAt:new Date().toISOString(),packageVersion:require('../package.json').version,originalRawSha256:originalRawHash,originalInnSourceSha256:raw.sourceSnapshot.innSourceSha256,currentSourceSnapshot:SOURCE_SNAPSHOT,method:'Pricing-only zero-lodging-path review plus native twelve-battle prefix replay of every final target campaign. Original full campaigns were not rerun.',originalConditionsWithNoLodging:raw.rows.length,originalNativeBattlesWithNoLodging:raw.counts.totalNativeBattles,sourceAndContentUnchangedExceptInnPricing:true,integerBoundaryFixture:{level:6,maxHp:1020,lostHp:85,regionalBasePrice:120,expectedRecoveryMora:2,actualRecoveryMora:boundary.targets[0].recoveryCost,roomMora:boundary.roomCost,totalMora:boundary.cost},replayedConditions:checked.length,replayedNativeBattles:battles,replayedFields:'Enemy source/HP/ATK/DEF, persistent party HP, PRNG, victory, rounds, deaths, materials, presentation/input durations and modeled seconds.',allReplayedFieldsIdentical:true,conclusion:'All original 208 campaign totals remain unchanged: none executes the sole changed pricing operation. Current-source native prefix regressions match exactly; original simulation hashes and counts are preserved.',checkedConditions:checked};
  fs.writeFileSync(file,JSON.stringify(raw,null,2)+'\n');console.log(JSON.stringify({ok:true,replayedConditions:checked.length,replayedNativeBattles:battles,currentInnHash:SOURCE_SNAPSHOT.innSourceSha256}));process.exit();
 }
 const out=process.env.CRPG_MATERIAL_OUT||DEFAULT_OUT,rows=process.env.CRPG_MATERIAL_APPEND==='1'&&fs.existsSync(out)?JSON.parse(fs.readFileSync(out,'utf8')).rows:[];
 const candidates=(process.env.CRPG_MATERIAL_CANDIDATES||'shipped,moderate,compact').split(','),levels=(process.env.CRPG_MATERIAL_LEVELS||'20,55').split(',').map(Number),routes=(process.env.CRPG_MATERIAL_ROUTES||'ROUTE_TRAVELER,ROUTE_ISEKAI').split(','),seeds=(process.env.CRPG_MATERIAL_SEEDS||'717').split(',').map(Number),limit=Number(process.env.CRPG_MATERIAL_LIMIT||4),elements=(process.env.CRPG_MATERIAL_ELEMENTS||'NEUTRAL,HYDRO,ELECTRO').split(','),kinds=(process.env.CRPG_MATERIAL_KINDS||'TALENT,ASCENSION').split(',');
 const data={source:'tools/audit_material_candidates_v01615.cjs',sourceSnapshot:SOURCE_SNAPSHOT,displaySpeed:2,internalSpeed:1,inputSeconds:3,reentrySeconds:6,candidates:CANDIDATES,rows};fs.mkdirSync(path.dirname(out),{recursive:true});
 if(process.env.CRPG_MATERIAL_FINAL==='1'){
  if(rows.length)throw Error('Final-source reproduction must start with a fresh output; APPEND is not allowed.');
  delete data.candidates;data.version=require('../package.json').version;data.selection='Final native source only; retired candidate rows are excluded.';
  const cases=[];for(const route of routes)for(const stage of STAGES)for(const element of ['NEUTRAL','PYRO','HYDRO','ANEMO','ELECTRO','CRYO','GEO','DENDRO'])cases.push({route,seed:717,candidate:'shipped',kind:'ASCENSION',level:55,stage,element,limit:12,mode:'FINAL_SOURCE_SCREENING_12_WINS'});
  for(const route of routes)for(const scenario of [{kind:'TALENT',level:20,stage:10,target:168},{kind:'TALENT',level:20,stage:20,target:168},{kind:'TALENT',level:55,stage:30,target:336},{kind:'TALENT',level:55,stage:55,target:336},{kind:'TALENT',level:55,stage:60,target:336},{kind:'ASCENSION',level:55,stage:30,target:800,element:'HYDRO'},{kind:'ASCENSION',level:55,stage:60,target:800,element:'HYDRO'},{kind:'ASCENSION',level:55,stage:60,target:1600,element:'HYDRO'}])cases.push({...scenario,route,seed:717,candidate:'shipped',limit:180,recovery:true,mode:'FINAL_SOURCE_TARGET_COMPLETION'});
  for(const options of cases){const row=campaign(options);row.mode=options.mode;rows.push(row);fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({mode:row.mode,kind:row.kind,route:row.route,stage:row.stage,element:row.element,target:row.target,materials:row.materials,wins:row.wins,losses:row.losses,seconds:row.seconds,rest:row.recoveries.length,stop:row.stop}));}
  const targets=rows.filter(r=>r.mode==='FINAL_SOURCE_TARGET_COMPLETION'),screening=rows.filter(r=>r.mode==='FINAL_SOURCE_SCREENING_12_WINS');
  data.counts={screeningConditions:screening.length,screeningNativeBattles:screening.reduce((n,r)=>n+r.battles.length,0),completedTargetConditions:targets.length,targetNativeBattles:targets.reduce((n,r)=>n+r.battles.length,0),totalConditions:rows.length,totalNativeBattles:rows.reduce((n,r)=>n+r.battles.length,0),totalLosses:rows.reduce((n,r)=>n+r.losses,0)};
  data.completedComparisons=targets.map(r=>({kind:r.kind,domain:r.domain,partyLevel:r.level,phase:r.phase,stage:r.stage,route:r.route,element:r.element,seed:r.seed,target:r.target,materials:r.materials,wins:r.wins,losses:r.losses,stop:r.stop,seconds:r.seconds,minutes:r.seconds/60,materialsPerMinute:r.rate,lodgingCount:r.recoveries.length,travelEncounterCount:r.recoveries.reduce((n,x)=>n+x.encounters.length,0),lodgingMora:r.recoveries.reduce((n,x)=>n+x.lodgingCost,0),netMora:r.netMora}));
  data.highestTierComparisons=[];for(const route of routes)for(const element of ['NEUTRAL','PYRO','HYDRO','ANEMO','ELECTRO','CRYO','GEO','DENDRO']){const xs=screening.filter(r=>r.route===route&&r.element===element),low=xs.filter(r=>r.stage<60).sort((a,b)=>b.rate-a.rate)[0],high=xs.find(r=>r.stage===60);data.highestTierComparisons.push({route,element,bestLowerStage:low.stage,bestLowerMaterialsPerMinute:low.rate,highestMaterialsPerMinute:high.rate,highestRatio:high.rate/low.rate});}
  fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');process.exit();
 }
 if(process.env.CRPG_MATERIAL_CORE==='1'){
  for(const route of routes)for(const seed of seeds)for(const scenario of [{kind:'TALENT',level:20,stage:10,target:168},{kind:'TALENT',level:20,stage:20,target:168},{kind:'TALENT',level:55,stage:30,target:336},{kind:'TALENT',level:55,stage:60,target:336},{kind:'ASCENSION',level:55,stage:30,target:800,element:'HYDRO'},{kind:'ASCENSION',level:55,stage:60,target:800,element:'HYDRO'}]){
   const row=campaign({candidate:'shipped',...scenario,route,seed,limit:180,recovery:true});row.mode='FINAL_SOURCE_TARGET_COMPLETION';rows.push(row);fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({route,seed,...scenario,wins:row.wins,losses:row.losses,materials:row.materials,seconds:row.seconds,minutes:row.seconds/60,rest:row.recoveries.length,netMora:row.netMora,rate:row.rate,stop:row.stop}));
  }
  process.exit();
 }
 for(const candidate of candidates)for(const level of levels)for(const route of routes)for(const seed of seeds)for(const kind of kinds)for(const stage of (process.env.CRPG_MATERIAL_STAGES?.split(',').map(Number)||STAGES).filter(n=>level===55||n<=level+5))for(const element of kind==='TALENT'?['NEUTRAL']:elements){
  const row=campaign({candidate,level,route,seed,kind,stage,element,limit,target:Number(process.env.CRPG_MATERIAL_TARGET||0),recovery:process.env.CRPG_MATERIAL_RECOVERY==='1'});rows.push(row);fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({candidate,level,route,seed,kind,stage,element,wins:row.wins,losses:row.losses,rate:+row.rate.toFixed(2),seconds:+row.meanSeconds.toFixed(2),rounds:+row.meanRounds.toFixed(2),hp:row.finalHp?.map(x=>+(x.hp/x.maxHp).toFixed(2)),rest:row.recoveries.length,netMora:row.netMora,stop:row.stop}));
 }
}
module.exports={campaign,allocate,applyBudget,CANDIDATES,persistentHp,itemCount,DEFAULT_OUT};
