'use strict';
// Diagnostic only: each campaign starts at full HP once, then carries native
// battle settlement HP and PRNG state across every subsequent battle.
// No game content edits, forced wins, repeated healing, or per-battle reseeding.
const path=require('node:path');
const {setup,observe,G,PLAYER}=require('./audit_balance_v01522.cjs');
const {policy,REFERENCE_TEAM}=require('./audit_balance_v0161.cjs');
const {c,fs,root}=require('../tests/helpers_v011.cjs');
const DEFAULT_OUT=path.join(root,'docs/data/ascension_sustained_v01614.json');
const LEVELS=Array.from({length:12},(_,i)=>(i+1)*5);
const ROUTES=['ROUTE_TRAVELER','ROUTE_ISEKAI'];
const PARTY=[PLAYER,...REFERENCE_TEAM];
const OUT_EDGES=['EDGE_D163_LIANSHAN_FORMULA_LY_DETAIL_MINGYUN_B','EDGE_LY_DETAIL_017_B','EDGE_LY_DETAIL_009_B','EDGE_LY_DETAIL_001_B'];
const BACK_EDGES=['EDGE_LY_DETAIL_001_A','EDGE_LY_DETAIL_009_A','EDGE_LY_DETAIL_017_A','EDGE_D163_LIANSHAN_FORMULA_LY_DETAIL_MINGYUN_A'];
const copy=x=>JSON.parse(JSON.stringify(x));
const assert=(test,message)=>{if(!test)throw Error(message);};
const resultSeconds=(presentationMs,inputs,result)=>presentationMs/1000+inputs*3+6+Number(result.defeatPenalty?.seconds||0);
function persistentHp(r){return PARTY.map(id=>({id,hp:id===PLAYER?r.s.global.PLAYER_HP_CURRENT:r.s.chars[id].hp,maxHp:id===PLAYER?r.s.global.PLAYER_HP_MAX:r.character(id).maxHp,level:r.growth(id).level,phase:r.growthPhase(id)}));}
function itemCount(r,id){return r.s.inventory.filter(x=>x.item===id).reduce((n,x)=>n+Number(x.quantity||0),0);}
function siteAt(level){return Object.entries(G.domains).find(([,d])=>d.kind==='ASCENSION'&&d.levels.includes(level));}
function campaign({stage=60,route='ROUTE_TRAVELER',seed=717,element='NEUTRAL',victoryLimit=12,targetGems=800,recoveryMode='NONE',recoveryThreshold=.5,startingMora=10000,onBattle=()=>{}}={}){
 const [key,site]=siteAt(stage),domain=key+':'+stage;
 const r=setup({level:55,route,team:REFERENCE_TEAM,map:site.map,gear:'craft',enhance:6,talent:'mid'});
 Object.assign(r.tutorialState().done,{combatAttack:true,combatGuard:true,combatSkill:true,combatBurst:true});
 r.s.global.PRNG_STATE=seed;
 r.s.global.MORA=startingMora;
 r.s.domainDaily={day:G.dayOf(r.leyLineNow()),wins:3};
 observe(r);
 const baseFinish=r.finishBattle;
 r.finishBattle=function(win){this._auditEndCombatState=this.s.runtime?.actors.filter(a=>a.side==='ALLY').map(a=>({id:a.source,hp:a.hp,maxHp:a.maxHp,cooldowns:copy(a.cooldowns||{}),turns:a.turns,energy:a.energy??null}));return baseFinish.call(this,win);};
 const baseAction=r.action;let presentationMs=0,rawFrameMs=0,silentStateFrames=0,playerInputs=0;
 r.action=function(type,args){const before=c.CRPGPresentation.snapshot(this.s),out=baseAction.call(this,type,args);
  for(const f of c.CRPGPresentation.actionFrames(c.CRPGPresentation.delta(before,this.s))){const ms=f.kind==='action'?460+(f.attemptCount>1?520:650):1400;rawFrameMs+=ms;if(f.kind==='state'&&f.silent){silentStateFrames++;continue;}presentationMs+=ms;}
  if(type==='COMBAT')playerInputs++;return out;
 };
 const row={stage,domain,map:site.map,route,seed,element,saveId:r.s.global.SAVE_ID,party:PARTY,level:55,initialPhase:5,gear:'craft',enhance:6,talent:'mid',targetGems,victoryLimit,recoveryMode,recoveryThreshold,startingMora,timingModelVersion:2,silentStateFramesSkipped:true,initialHp:persistentHp(r),battles:[],recoveries:[],wins:0,losses:0,gems:0,mora:0,seconds:0};
 const gem='GROWTH_GEM_'+element;
 function restRoundTrip(){
  if(key!=='LIANSHAN_FORMULA')throw Error('Native rest path only implemented for the Liyue ascension entrance');
  const before=persistentHp(r),moraBefore=r.s.global.MORA,gameBefore={day:r.s.global.WORLD_DAY,time:r.s.global.WORLD_TIME},actions=[],encounters=[];
  let seconds=0;
  let afterLodging;
  const act=(type,args,visualSeconds)=>{const record={type,...args,from:r.s.global.CURRENT_MAP_ID,completed:false};actions.push(record);seconds+=visualSeconds+3;r.action(type,args);record.to=r.s.global.CURRENT_MAP_ID;record.completed=true;return record;};
  try{
  for(const edge of OUT_EDGES){
   const prior=r.s.global.CURRENT_MAP_ID;act('MOVE',{edge},1);assert(r.s.global.CURRENT_MAP_ID!==prior,'Native MOVE did not change map: '+edge);
   if(r.s.runtime){const t=presentationMs,n=playerInputs,hpBefore=persistentHp(r),walletBefore=r.s.global.MORA,battle=policy(r);const delta=presentationMs-t,inputs=playerInputs-n,combatSeconds=resultSeconds(delta,inputs,battle);seconds+=combatSeconds;encounters.push({hpBefore,hpAfter:persistentHp(r),result:copy(battle),presentationMs:delta,playerInputs:inputs,seconds:combatSeconds,secondsAt2x:combatSeconds,walletBefore,walletAfter:r.s.global.MORA,defeatLostMora:Number(battle.defeatPenalty?.mora||0),defeatLockSeconds:Number(battle.defeatPenalty?.seconds||0)});if(!battle.victory)return {failed:true,reason:'OUTWARD_ENCOUNTER_DEFEAT',before,after:persistentHp(r),mora:r.s.global.MORA-moraBefore,seconds,secondsAt2x:seconds,actions,encounters};}
  }
  act('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_LIYUE_INN',mode:'SHOP'},1);
  act('BUY',{stock:'STK_INN_LIYUE',quantity:1},3);
  afterLodging=persistentHp(r);
  assert(afterLodging.every(x=>x.hp===x.maxHp),'Native lodging did not fully restore the declared party');
  for(const edge of BACK_EDGES){
   const prior=r.s.global.CURRENT_MAP_ID;act('MOVE',{edge},1);assert(r.s.global.CURRENT_MAP_ID!==prior,'Native MOVE did not change map: '+edge);
   if(r.s.runtime){const t=presentationMs,n=playerInputs,hpBefore=persistentHp(r),walletBefore=r.s.global.MORA,battle=policy(r);const delta=presentationMs-t,inputs=playerInputs-n,combatSeconds=resultSeconds(delta,inputs,battle);seconds+=combatSeconds;encounters.push({hpBefore,hpAfter:persistentHp(r),result:copy(battle),presentationMs:delta,playerInputs:inputs,seconds:combatSeconds,secondsAt2x:combatSeconds,walletBefore,walletAfter:r.s.global.MORA,defeatLostMora:Number(battle.defeatPenalty?.mora||0),defeatLockSeconds:Number(battle.defeatPenalty?.seconds||0)});if(!battle.victory)return {failed:true,reason:'RETURN_ENCOUNTER_DEFEAT',before,afterLodging,after:persistentHp(r),mora:r.s.global.MORA-moraBefore,seconds,secondsAt2x:seconds,actions,encounters};}
  }
  assert(r.s.global.CURRENT_MAP_ID===site.map,'Native recovery return did not reach the domain entrance');
  return {failed:false,before,afterLodging,after:persistentHp(r),mora:r.s.global.MORA-moraBefore,seconds,secondsAt2x:seconds,actions,movementFacilityInputs:actions.length,lodgingMora:140,encounters,gameBefore,gameAfter:{day:r.s.global.WORLD_DAY,time:r.s.global.WORLD_TIME}};
  }catch(e){return {failed:true,reason:e.code||e.name,message:e.message,before,afterLodging,after:persistentHp(r),mora:r.s.global.MORA-moraBefore,seconds,secondsAt2x:seconds,actions,movementFacilityInputs:actions.length,encounters,gameBefore,gameAfter:{day:r.s.global.WORLD_DAY,time:r.s.global.WORLD_TIME}};}
 }
 for(let index=1;index<=victoryLimit;index++){
  const hpBefore=persistentHp(r),rngBefore=r.s.global.PRNG_STATE,gemsBefore=itemCount(r,gem),moraBefore=r.s.global.MORA;
  presentationMs=0;rawFrameMs=0;silentStateFrames=0;playerInputs=0;delete r._auditLast;delete r._auditEndCombatState;
  const reason=r.actionReason('DOMAIN_START',{domain,element});
  if(reason){row.stopReason='ENTRY_BLOCKED';row.entryReason=reason;break;}
  r.action('DOMAIN_START',{domain,element});
  const entryHp=r.s.runtime.actors.filter(a=>a.side==='ALLY'&&!a.summon).map(a=>({id:a.source,hp:a.hp,maxHp:a.maxHp,cooldowns:copy(a.cooldowns||{}),turns:a.turns,energy:a.energy??null}));
  assert(hpBefore.every(x=>entryHp.find(a=>a.id===x.id)?.hp===x.hp),'Native battle entry failed to carry saved HP');
  assert(entryHp.every(a=>Object.keys(a.cooldowns).length===0),'Native entry cooldown reset differs from expected rule');
  const initialEnemies=r.s.runtime.actors.filter(a=>a.side==='ENEMY').map(a=>({id:a.source,level:a.level,hp:a.hp,maxHp:a.maxHp,atk:a.atk,def:a.def}));
  const result=policy(r),hpAfter=persistentHp(r),gems=itemCount(r,gem)-gemsBefore,mora=r.s.global.MORA-moraBefore;
  const battle={index,hpBefore,entryHp,hpAfter,endCombatState:r._auditEndCombatState,rngBefore,rngAfter:r.s.global.PRNG_STATE,initialEnemies,result:copy(result),aliveBefore:hpBefore.filter(x=>x.hp>0).length,aliveAfter:hpAfter.filter(x=>x.hp>0).length,deaths:hpAfter.filter(x=>x.hp<=0).map(x=>x.id),gems,mora,rawFrameMs,silentStateFrames,presentationMs,playerInputs,walletBefore:moraBefore,walletAfter:r.s.global.MORA,defeatLostMora:Number(result.defeatPenalty?.mora||0),defeatLockSeconds:Number(result.defeatPenalty?.seconds||0),seconds:resultSeconds(presentationMs,playerInputs,result)};battle.secondsAt2x=battle.seconds;
  row.battles.push(battle);row.wins+=result.victory?1:0;row.losses+=result.victory?0:1;row.gems+=gems;row.mora+=mora;row.seconds+=battle.seconds;
  row.finalHp=hpAfter;row.secondsAt2x=row.seconds;row.gemsPerMinute=row.gems/(row.seconds/60);row.linearExtrapolationTo800Seconds=row.losses===0&&row.gems>0?targetGems/(row.gems/row.seconds):null;row.extrapolationIsNotACompletedCampaign=row.gems<targetGems;
  onBattle(row,battle);
  if(!result.victory){row.stopReason=result.stalled?'STALLED':'FIRST_LOSS';break;}
  if(row.gems>=targetGems){row.stopReason='TARGET_REACHED';break;}
  if(recoveryMode==='NATIVE_LODGING'&&hpAfter.some(x=>x.hp<=0||x.hp/x.maxHp<recoveryThreshold)){
   const recovery=restRoundTrip();
   row.recoveries.push({afterBattle:index,...recovery});row.seconds+=recovery.seconds;row.secondsAt2x=row.seconds;row.mora+=recovery.mora;row.finalHp=persistentHp(r);row.gemsPerMinute=row.gems/(row.seconds/60);row.linearExtrapolationTo800Seconds=targetGems/(row.gems/row.seconds);onBattle(row,battle);
   if(recovery.failed){row.stopReason='RECOVERY_FAILED';row.recoveryReason=recovery.reason;break;}
  }
 }
 row.stopReason??='PILOT_VICTORY_LIMIT';
 row.secondsAt2x=row.seconds;
 row.actualTargetCompleted=row.stopReason==='TARGET_REACHED';row.actualSecondsToTarget=row.actualTargetCompleted?row.seconds:null;
 row.finalMora=r.s.global.MORA;
 if(['FIRST_LOSS','RECOVERY_FAILED','STALLED','ENTRY_BLOCKED'].includes(row.stopReason))row.linearExtrapolationTo800Seconds=null;
 row.recoveryExcluded=recoveryMode==='NONE';
 return row;
}
if(require.main===module){
 const out=process.env.CRPG_SUSTAINED_OUT||DEFAULT_OUT;
 const stages=(process.env.CRPG_SUSTAINED_STAGES||LEVELS.join(',')).split(',').map(Number);
 const routes=(process.env.CRPG_SUSTAINED_ROUTES||ROUTES.join(',')).split(',');
 const seeds=(process.env.CRPG_SUSTAINED_SEEDS||'717').split(',').map(Number);
 const elements=(process.env.CRPG_SUSTAINED_ELEMENTS||'NEUTRAL').split(',');
 const victoryLimit=Number(process.env.CRPG_SUSTAINED_LIMIT||12),targetGems=Number(process.env.CRPG_SUSTAINED_TARGET||800),recoveryMode=process.env.CRPG_SUSTAINED_RECOVERY||'NONE';
 const data={version:require('../package.json').version,mode:'native-continuous-farming',source:'tools/audit_ascension_sustained_v01614.cjs',timingAssumptions:{displaySpeed:2,internalSpeed:1,presentationDivisor:1000,inputSeconds:3,reentrySeconds:6,moveSeconds:1,facilitySeconds:1,lodgingSeconds:3,lodgingRoundTripInputCount:10,lodgingRoundTripBaseSeconds:42,silentStateFramesSkipped:true,timingModelVersion:2,excluded:'Network latency and navigation beyond the declared native actions.'},invariants:{oneInitialFullHp:true,noArtificialBetweenBattleHeal:true,oneSeedPerCampaign:true,nativeHpSettlement:true,unboostedDailyWinsAtStart:3,noGameChanges:true},skillResources:{energy:'No numeric energy resource in native combat; bursts use cooldowns.',cooldowns:'Native initCombatActor resets cooldowns and turns at every entry; HP persists.'},rows:[]};
 if(process.env.CRPG_SUSTAINED_APPEND==='1'&&fs.existsSync(out)){
  data.rows=JSON.parse(fs.readFileSync(out,'utf8')).rows;
  for(const row of data.rows){row.recoveryMode??='NONE';row.startingMora??=0;row.recoveries??=[];row.saveId??=row.battles[0]?.result.saveId;row.finalMora??=row.startingMora+row.mora;
   if(row.timingModelVersion!==2){row.timingModelVersion=1;row.silentStateFramesSkipped=false;row.timingPrecisionCaveat='Legacy pilot counts silent state frames at 1400 ms; modelled time is an upper estimate. Use timingModelVersion 2 for final comparisons.';}
   let wallet=row.startingMora;
   for(const b of row.battles){b.walletBefore??=wallet;wallet+=b.mora;b.walletAfter??=wallet;b.defeatLostMora=Number(b.result.defeatPenalty?.mora||0);b.defeatLockSeconds=Number(b.result.defeatPenalty?.seconds||0);b.seconds=resultSeconds(b.presentationMs,b.playerInputs,b.result);b.secondsAt2x=b.seconds;}
   row.seconds=row.battles.reduce((n,b)=>n+b.seconds,0)+row.recoveries.reduce((n,x)=>n+x.seconds,0);
   row.secondsAt2x=row.seconds;row.gemsPerMinute=row.gems/(row.seconds/60);row.linearExtrapolationTo800Seconds=row.losses===0&&row.gems>0?row.targetGems/(row.gems/row.seconds):null;row.extrapolationIsNotACompletedCampaign=row.gems<row.targetGems;delete row.projectedSecondsFor800;
   row.actualTargetCompleted=row.stopReason==='TARGET_REACHED';row.actualSecondsToTarget=row.actualTargetCompleted?row.seconds:null;if(['FIRST_LOSS','RECOVERY_FAILED','STALLED','ENTRY_BLOCKED'].includes(row.stopReason))row.linearExtrapolationTo800Seconds=null;
  }
 }
 fs.mkdirSync(path.dirname(out),{recursive:true});
 const save=()=>{data.completedComparisons=data.rows.filter(r=>r.timingModelVersion===2&&r.actualTargetCompleted).map(r=>({route:r.route,element:r.element,stage:r.stage,targetGems:r.targetGems,gems:r.gems,wins:r.wins,secondsAt2x:r.secondsAt2x,minutes:r.secondsAt2x/60,lodgingCount:r.recoveries.length,travelEncounterCount:r.recoveries.reduce((n,x)=>n+x.encounters.length,0),lodgingMora:r.recoveries.reduce((n,x)=>n+(x.lodgingMora||0),0),travelEarnedMora:r.recoveries.reduce((n,x)=>n+x.mora+(x.lodgingMora||0),0),netMora:r.mora}));fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');};
 for(const route of routes)for(const element of elements)for(const seed of seeds)for(const stage of stages){
  data.rows=data.rows.filter(x=>!(x.route===route&&x.element===element&&x.seed===seed&&x.stage===stage&&(x.recoveryMode||'NONE')===recoveryMode));
  let current;
  const row=campaign({stage,route,seed,element,victoryLimit,targetGems,recoveryMode,onBattle:progress=>{if(!current){current=progress;data.rows.push(current);}save();}});
  if(!current)data.rows.push(row);save();
  console.log(JSON.stringify({route,element,seed,stage,wins:row.wins,losses:row.losses,gems:row.gems,seconds:+row.seconds.toFixed(2),gemsPerMinute:+(row.gemsPerMinute||0).toFixed(3),stop:row.stopReason,finalHp:row.finalHp?.map(x=>({id:x.id,ratio:+(x.hp/x.maxHp).toFixed(3)}))}));
 }
}
module.exports={campaign,persistentHp,itemCount,siteAt,DEFAULT_OUT};
