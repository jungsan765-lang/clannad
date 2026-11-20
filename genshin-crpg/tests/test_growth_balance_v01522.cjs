'use strict';
// Native combat, identical party/gear/talents/seeds. Only legal level and ascension change.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fixture,run}=require('./helpers_balance_v0141.cjs');
const {R,db}=require('./helpers_v011.cjs'),copy=x=>JSON.parse(JSON.stringify(x));
const team=['MOND_AMBER','MOND_KAEYA','MOND_NOELLE'],report=[];
const experience=r=>({player:{level:r.s.global.PLAYER_LEVEL_STATE,xp:r.s.global.PLAYER_XP_STATE},chars:team.map(id=>({id,level:r.s.chars[id].level,xp:r.s.chars[id].xp}))});
function defeatChecks(r,out,terminal,beforeXp){
 assert.equal(out.result.result,'DEFEAT');assert.equal(out.result.victory,false);assert.equal(out.result.xp,0);assert.equal(out.result.mora||0,0);assert.deepEqual(copy(out.result.loot),{});
 assert.equal(r.s.runtime,null);assert.equal(r.s.global.ACTIVE_BATTLE_ID,'');assert.equal(r.s.global.COMBAT_ACTION_PHASE,'NONE');assert.deepEqual(experience(r),beforeXp,'defeat must not grant growth');
 assert.equal(terminal.victory,false);assert(terminal.actors.filter(a=>a.side==='ALLY').every(a=>a.hp===0),'defeat must follow an actual party wipe');assert(terminal.actors.some(a=>a.side==='ENEMY'&&a.hp>0),'a defeated party must not have cleared all enemies');
 const id=out.result.battleId,receipts=Object.entries(r.s.combatReceipts||{}).filter(([key])=>key===id),logs=r.s.log.filter(x=>(x.battleId||x.id)===id);assert.equal(receipts.length,1);assert.equal(logs.length,1);assert.equal(receipts[0][1].victory,false);assert.equal(receipts[0][1].xp,0);assert.equal(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).battleId,id);
 const restored=new R(db,JSON.parse(r.serialize()));assert.equal(restored.s.runtime,null);assert.equal(restored.playPhase(),'DOWNED');assert.deepEqual(experience(restored),beforeXp);assert.deepEqual(copy(restored.s.combatReceipts),copy(r.s.combatReceipts));
 // A repeated settlement with no active battle must not regrant rewards or reapply the defeat fine.
 const settled=restored.serialize();restored.finishBattle(false);assert.equal(restored.serialize(),settled,'settled defeat must remain unchanged');
 return{actualPartyWipe:true,enemyStillAlive:true,zeroRewards:true,oneReceipt:true,saveRestored:true,duplicateSettlementUnchanged:true};
}
for(const [map,group,levels]of [['MAP_MOND_WOLVENDOM','EG_MOND_HILI_ELITE',[17,30,45]],['MAP_LIYUE_PLAINS','EG_LIYUE_HILI_ROCK',[32,45,60]]]){
 const byLevel=[];
 for(const level of levels){const battles=[];
  for(const seed of [11,22,33]){const r=fixture(Array(4).fill(level),team,3);Object.assign(r.s.global,{CURRENT_MAP_ID:map,SAVE_ID:'GROWTH-FEEL-'+seed,LAST_COMMITTED_ACTION_SEQ:0});const beforeXp=experience(r),terminal=[],finish=r.finishBattle;r.finishBattle=function(victory){if(this.s.runtime)terminal.push({victory,actors:copy(this.s.runtime.actors)});return finish.call(this,victory);};const out=run(r,group,seed);assert.notEqual(out.result,'STALLED');assert.equal(terminal.length,1);assert.equal(r.s.runtime,null);assert(Number.isInteger(out.result.rounds)&&out.result.rounds>0);if(level!==levels[0])assert(out.result.victory,JSON.stringify({map,level,seed,result:out.result}));const defeat=out.result.victory?null:defeatChecks(r,out,terminal[0],beforeXp);battles.push({seed,victory:out.result.victory,rounds:out.result.rounds,defeat,enemies:out.stats.filter(a=>!['PLAYER_CUSTOM',...team].includes(a[0]))});}
  const wins=battles.filter(b=>b.victory);assert(wins.length>0,'every level must have an actual winning sample');byLevel.push({level,battles,wins:wins.length,losses:battles.length-wins.length,averageRounds:wins.reduce((n,b)=>n+b.rounds,0)/wins.length});
 }
 for(let i=1;i<byLevel.length;i++)for(let j=0;j<3;j++)assert.deepEqual(byLevel[i].battles[j].enemies,byLevel[0].battles[j].enemies,'enemies must stay fixed');
 for(let i=1;i<byLevel.length;i++)for(const battle of byLevel[i].battles){const previous=byLevel[i-1].battles.find(b=>b.seed===battle.seed);if(previous.victory&&battle.victory)assert(battle.rounds<=previous.rounds,'growth must not slow the same winning seed');}
 assert(byLevel.at(-1).averageRounds<byLevel[0].averageRounds,'growth must shorten the same fight');
 if(map==='MAP_LIYUE_PLAINS')assert(byLevel.at(-1).averageRounds<=byLevel[0].averageRounds*.5,'returning with late-game growth takes at most half the rounds');
 report.push({map,group,byLevel});console.log(JSON.stringify({map,rounds:byLevel.map(x=>({level:x.level,wins:x.wins,losses:x.losses,averageWinningRounds:x.averageRounds}))}));
}
const out=path.resolve(__dirname,'../evidence/v01522');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'growth-balance.json'),JSON.stringify(report,null,2));

