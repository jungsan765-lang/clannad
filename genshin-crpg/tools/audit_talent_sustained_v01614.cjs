'use strict';
// Read-only diagnostic: native talent fights; one initial heal and RNG seed per
// campaign, then persistent HP/XP and RNG settlement. No forced wins or edits.
const path=require('node:path');
const {setup,observe,G,PLAYER}=require('./audit_balance_v01522.cjs');
const {policy,REFERENCE_TEAM}=require('./audit_balance_v0161.cjs');
const {c,fs,root}=require('../tests/helpers_v011.cjs');
const DEFAULT_OUT=path.join(root,'docs/data/talent_sustained_v01614.json');
const PARTY=[PLAYER,...REFERENCE_TEAM],copy=x=>JSON.parse(JSON.stringify(x));
const persistentHp=r=>PARTY.map(id=>({id,hp:id===PLAYER?r.s.global.PLAYER_HP_CURRENT:r.s.chars[id].hp,maxHp:id===PLAYER?r.s.global.PLAYER_HP_MAX:r.character(id).maxHp,level:r.growth(id).level,phase:r.growthPhase(id)}));
const itemCount=(r,id)=>r.s.inventory.filter(x=>x.item===id).reduce((n,x)=>n+Number(x.quantity||0),0);
function campaign({level=20,stage=20,region='MOND',route='ROUTE_TRAVELER',seed=717,limit=12}={}){
 const key=region==='MOND'?'FORSAKEN_RIFT':'TAISHAN_MANSION',site=G.domains[key],domain=key+':'+stage;
 const enhance=level<30?3:6,r=setup({level,route,team:REFERENCE_TEAM,map:site.map,gear:'craft',enhance,talent:'mid'});
 Object.assign(r.tutorialState().done,{combatAttack:true,combatGuard:true,combatSkill:true,combatBurst:true});
 r.s.global.PRNG_STATE=seed;r.s.domainDaily={day:G.dayOf(r.leyLineNow()),wins:3};observe(r);
 const baseAction=r.action;let presentationMs=0,rawPresentationMs=0,silentFrames=0,playerInputs=0,actionFrames=0,allyFrames=0,enemyFrames=0;
 r.action=function(type,args){const before=c.CRPGPresentation.snapshot(this.s),out=baseAction.call(this,type,args);
  for(const f of c.CRPGPresentation.actionFrames(c.CRPGPresentation.delta(before,this.s))){const duration=f.kind==='action'?460+(f.attemptCount>1?520:650):1400;rawPresentationMs+=duration;if(f.kind==='state'&&f.silent){silentFrames++;continue;}presentationMs+=duration;if(f.kind==='action'){actionFrames++;if(f.actorSide==='ALLY')allyFrames++;if(f.actorSide==='ENEMY')enemyFrames++;}}
  if(type==='COMBAT')playerInputs++;return out;
 };
 const item='GROWTH_TALENT_'+region,row={level,initialPhase:G.phaseFor(level),stage,region,domain,map:site.map,route,seed,party:PARTY,gear:'craft',enhance,talent:'mid',limit,initialHp:persistentHp(r),wins:0,losses:0,books:0,mora:0,seconds:0,battles:[]};
 for(let index=1;index<=limit;index++){
  const reason=r.actionReason('DOMAIN_START',{domain});if(reason){row.stopReason='ENTRY_BLOCKED';row.entryReason=reason;break;}
  const hpBefore=persistentHp(r),booksBefore=itemCount(r,item),moraBefore=r.s.global.MORA,rngBefore=r.s.global.PRNG_STATE;
  presentationMs=0;rawPresentationMs=0;silentFrames=0;playerInputs=0;actionFrames=0;allyFrames=0;enemyFrames=0;delete r._auditLast;
  r.action('DOMAIN_START',{domain});
  const initialEnemies=r.s.runtime.actors.filter(a=>a.side==='ENEMY').map(a=>({id:a.source,name:a.name,level:a.level,hp:a.hp,maxHp:a.maxHp,atk:a.atk,def:a.def}));
  const result=policy(r),hpAfter=persistentHp(r),books=itemCount(r,item)-booksBefore,mora=r.s.global.MORA-moraBefore;
  const battle={index,hpBefore,hpAfter,rngBefore,rngAfter:r.s.global.PRNG_STATE,initialEnemies,result:copy(result),deaths:hpAfter.filter(x=>x.hp<=0).map(x=>x.id),books,mora,presentationMs,rawPresentationMs,silentFrames,playerInputs,actionFrames,allyFrames,enemyFrames,seconds:presentationMs/1000+3*playerInputs+6};
  row.battles.push(battle);row.wins+=result.victory?1:0;row.losses+=result.victory?0:1;row.books+=books;row.mora+=mora;row.seconds+=battle.seconds;row.finalHp=hpAfter;
  if(!result.victory){row.stopReason=result.stalled?'STALLED':'FIRST_LOSS';break;}
 }
 row.stopReason??='VICTORY_LIMIT';row.booksPerMinute=row.books/(row.seconds/60);row.meanSeconds=row.seconds/row.battles.length;row.meanRounds=row.battles.reduce((n,b)=>n+b.result.rounds,0)/row.battles.length;row.recoveryExcluded=true;row.deathPenaltySeconds=row.losses*60;row.secondsIncludingDefeatLock=row.seconds+row.deathPenaltySeconds;row.booksPerMinuteIncludingDefeatLock=row.books/(row.secondsIncludingDefeatLock/60);
 return row;
}
if(require.main===module){
 const out=process.env.CRPG_TALENT_OUT||DEFAULT_OUT,levels=(process.env.CRPG_TALENT_LEVELS||'20,25,30,55').split(',').map(Number),routes=(process.env.CRPG_TALENT_ROUTES||'ROUTE_TRAVELER,ROUTE_ISEKAI').split(','),seeds=(process.env.CRPG_TALENT_SEEDS||'717,4242').split(',').map(Number),limit=Number(process.env.CRPG_TALENT_LIMIT||12);
 const data={version:require('../package.json').version,source:'tools/audit_talent_sustained_v01614.cjs',mode:'native-continuous-talent-farming',timingAssumptions:{displaySpeed:2,internalSpeed:1,presentationDivisor:1000,silentStateFramesHaveZeroWait:true,inputSeconds:3,reentrySeconds:6,deathPenaltySeconds:60,deathPenaltyPolicy:'The pilot stops at first defeat; reported seconds excludes the following 60-second entry lock, secondsIncludingDefeatLock includes it separately.',excluded:'Recovery, travel, food, network latency and UI navigation beyond declared combat/re-entry input budget.'},invariants:{oneInitialFullHp:true,oneSeedPerCampaign:true,nativeHpSettlement:true,noArtificialBetweenBattleHeal:true,noGameChanges:true,unboostedMaterialWinsAtStart:3},rows:[]};
 if(process.env.CRPG_TALENT_APPEND==='1'&&fs.existsSync(out)){data.rows=JSON.parse(fs.readFileSync(out,'utf8')).rows;if(data.rows.some(r=>r.battles.some(b=>b.silentFrames===undefined)))throw Error('Old timing rows must be rerun; silent-state frame duration was not recorded.');}
 fs.mkdirSync(path.dirname(out),{recursive:true});
 for(const level of levels)for(const route of routes)for(const seed of seeds)for(const region of (level===55?['MOND','LIYUE']:['MOND']))for(const stage of region==='MOND'?[5,10,15,20,25]:[30,35,40,45,50,55,60]){
  data.rows=data.rows.filter(x=>!(x.level===level&&x.route===route&&x.seed===seed&&x.region===region&&x.stage===stage));
  const row=campaign({level,stage,region,route,seed,limit});data.rows.push(row);fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');
  console.log(JSON.stringify({level,route,seed,region,stage,wins:row.wins,losses:row.losses,books:row.books,seconds:+row.seconds.toFixed(2),meanSeconds:+row.meanSeconds.toFixed(2),meanRounds:+row.meanRounds.toFixed(2),booksPerMinute:+row.booksPerMinute.toFixed(2),stop:row.stopReason,finalHp:row.finalHp?.map(x=>({id:x.id,ratio:+(x.hp/x.maxHp).toFixed(3)}))}));
 }
}
module.exports={campaign,persistentHp,itemCount,DEFAULT_OUT};
