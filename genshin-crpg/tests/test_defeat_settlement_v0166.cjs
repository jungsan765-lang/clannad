'use strict';
const assert=require('node:assert/strict');
const {fresh,R,fs,path,vm,root}=require('./helpers_v011.cjs');
const {setup,observe,TEAMS}=require('../tools/audit_balance_v01522.cjs');
const cp=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
let passed=0;
function check(name,fn){fn();passed++;console.log('PASS '+name);}
function finishKo(r){
 if(r.combatOpening?.())r.action('COMBAT_BEGIN');
 assert(r.s.runtime,'fixture must still be in an active fight');
 const before={round:r.s.runtime.round,log:r.s.runtime.log.length};
 for(const a of r.s.runtime.actors.filter(a=>a.side==='ALLY'))a.hp=0;
 r.autoUntilPlayer();
 assert.equal(r.s.runtime,null);
 const result=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);
 assert.equal(result.victory,false);assert.equal(result.result,'DEFEAT');
 assert.equal(r._auditLast.rounds,before.round);assert.equal(r._auditLast.log.length,before.log);
 const receipt=cp(result);r.autoUntilPlayer();
 assert.deepEqual(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON),receipt);
}
// Native regression: the objective and receipt code run unchanged. HP is zeroed only
// to reproduce an already fallen party; this is not combat-balance evidence.
check('native Osial settles an already fallen party immediately without another round or action',()=>{
 const r=setup({level:60,map:'MAP_OSIAL_BATTLE',route:'ROUTE_TRAVELER',team:TEAMS.heal,enhance:10,talent:8,saveId:'KO-V0166-OSIAL'});
 observe(r);r.storySetCursor('TRV_LY4_OSIAL_COMBAT');
 r.startBattle('EG_BOSS_OSIAL','STORY:TRV_LY4_OSIAL_COMBAT',{confirmed:true,companions:TEAMS.heal});
 finishKo(r);
});
check('native ordinary, Dvalin and Golden House fights keep immediate all-party defeat settlement',()=>{
 for(const [map,group,level]of [['MAP_MOND_PLAINS','EG_MOND_HILI_PATROL',10],['MAP_STORMTERROR_LAIR','EG_BOSS_DVALIN',28],['MAP_LIYUE_GOLDEN_HOUSE','EG_ISK_L03_GOLDEN',50]]){
  const r=setup({level,map,team:TEAMS.heal,enhance:3,talent:'mid',saveId:'KO-V0166-'+group});observe(r);r.startBattle(group,'EXPLICIT');finishKo(r);
 }
});
// Focused method tests below intentionally mock phase/AI hooks to isolate each
// lethal boundary. They verify scheduling, not the strength of a real enemy.
function unit(){
 const r=fresh(),ally={id:'A',source:'PLAYER_CUSTOM',name:'아군',side:'ALLY',hp:1,maxHp:1,control:'PLAYER',statuses:[],cooldowns:{}},enemy={id:'E',source:'MON_HILICHURL_FIGHTER',name:'적',side:'ENEMY',hp:1,maxHp:1,control:'AI',statuses:[],cooldowns:{}};
 const b=r.s.runtime={combatVersion:1,id:'UNIT-KO',group:'EG_MOND_HILI_PATROL',origin:'EXPLICIT',round:1,actors:[ally,enemy],order:[{id:'E'}],cursor:0,phase:'RESOLVING',terrain:null,fields:[],log:[],actionSequence:0};
 const settled=[];r.finishBattle=win=>{settled.push(win);r.s.runtime=null;};
 r.liyueBattleOutcome=()=>undefined;r.resolveEnemyPhases=()=>{};r.checkBattleInterludes=()=>false;r.onCombatTurnStart=()=>{};r.combatActionLocked=()=>false;r.combatActionsPerTurn=()=>1;
 return {r,b,ally,enemy,settled};
}
check('all-party defeat takes priority over an objective HOLD',()=>{
 const {r,b,ally,settled}=unit();ally.hp=0;b.liyueObjective={kind:'DEFEND'};r.liyueBattleOutcome=()=>{throw Error('objective must not run after all-party defeat');};
 r.autoUntilPlayer();assert.deepEqual(settled,[false]);
});
check('lethal enemy phase resolution settles before an interlude',()=>{
 const {r,ally,settled}=unit();r.resolveEnemyPhases=()=>{ally.hp=0;};r.checkBattleInterludes=()=>{throw Error('interlude must not run after defeat');};
 r.autoUntilPlayer();assert.deepEqual(settled,[false]);
});
check('lethal round-end damage settles before a new initiative list',()=>{
 const {r,b,ally,settled}=unit();b.cursor=b.order.length;let interludes=0;r.checkBattleInterludes=()=>{interludes++;return false;};r.roundEnd=()=>{ally.hp=0;return true;};r.newRound=()=>{throw Error('new round must not be generated after defeat');};
 r.autoUntilPlayer();assert.deepEqual(settled,[false]);assert.equal(interludes,1);
});
check('a multi-action enemy stops after its first lethal action',()=>{
 const {r,ally,settled}=unit();let actions=0;r.combatActionsPerTurn=()=>2;r.aiTurn=()=>{actions++;ally.hp=0;};
 r.autoUntilPlayer();assert.deepEqual(settled,[false]);assert.equal(actions,1);
});
check('a fallen protagonist alone does not settle defeat while another ally is alive',()=>{
 const {r,b,ally,settled}=unit();ally.hp=0;const companion={...ally,id:'C',source:'MOND_AMBER',hp:1,name:'엠버',control:'GUEST'};b.actors.push(companion);b.order=[{id:'C'}];r.coopHold=()=>true;
 r.autoUntilPlayer();assert.deepEqual(settled,[]);assert.equal(b.phase,'WAIT_PLAYER');
});
check('the first tutorial formatter spells 몬드성이야 and retains other place wording',()=>{
 const source=fs.readFileSync(path.join(root,'source/app_tutorial.js'),'utf8'),fn=source.match(/function tutorialLine\(speaker,say,step\)\{[\s\S]*?\n\}/)?.[0];assert(fn,'tutorialLine formatter must exist');
 const x=vm.createContext({TUTORIAL_LINES:{PAIMON:{arrival:'여기가 {place}야.'}},mapName:id=>id==='MAP_MOND_CITY'?'몬드성':'속삭임의 숲'});vm.runInContext(fn,x);
 assert.equal(x.tutorialLine('PAIMON','arrival',{destination:'MAP_MOND_CITY'}),'여기가 몬드성이야.');
 assert.equal(x.tutorialLine('PAIMON','arrival',{destination:'MAP_MOND_FOREST'}),'여기가 속삭임의 숲야.');assert.equal(x.tutorialLine('PAIMON','missing',{}),null);
});
console.log(JSON.stringify({passed,nativeRegressionCases:2,isolatedMethodCases:5,isolatedFormatterCases:1}));
