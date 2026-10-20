'use strict';
// 0.16.0 · 빙결 on our side (user: 「빙결 뭐냐 원래 이렇게 오래 얼어붙어? 장난없이 쳐맞다가 죽네」): a water slime and an ice slime
// froze a party round after round to the end. Now a freeze takes the one turn the character would take next, a new freeze
// never refreshes it, and after it two turns of their own come before it can freeze them again. Enemies keep the old rule.
const assert=require('node:assert/strict');
const {fresh}=require('./helpers_v011.cjs');

// A battle where the protagonist acts first (or last) every round, nobody falls, and the enemies try to freeze the
// protagonist once in the rounds asked for: after the protagonist's turn (first) or before it (last).
function run({speed,rounds,tries}){
 const r=fresh('MAP_MOND_PLAINS');r.startBattle('EG_MOND_SLIME_SMALL','EXPLICIT');
 // Each action works on a copy of the battle: look the protagonist up again every time.
 const b=()=>r.s.runtime,me=()=>b().actors.find(a=>a.id==='PLAYER_CUSTOM');assert(me()?.side==='ALLY');
 // The player always opens round 1 (「전투 시작」); from round 2 the speeds decide.
 for(const a of b().actors){a.maxHp=99999;a.hp=99999;if(a.side==='ALLY'&&a.id!=='PLAYER_CUSTOM')a.hp=0;if(a.side==='ENEMY')a.spd=500;}me().spd=speed;
 const results=[],asked=new Set(tries),prior=r.aiTurn;
 r.aiTurn=function(a,targets){
  const x=this.s.runtime;if(a.side==='ENEMY'&&asked.has(x.round)){asked.delete(x.round);results.push({round:x.round,frozen:!!this.addCombatStatus(me(),'STATUS_FREEZE',1,{coexist:['물','얼음']})});}
  return prior.call(this,a,targets);
 };
 r.action('COMBAT_BEGIN');const acted=[];
 while(r.s.runtime&&b().round<=rounds){
  assert.equal(b().phase,'WAIT_PLAYER');assert.equal(b().order[b().cursor].id,'PLAYER_CUSTOM');
  acted.push(b().round);const guard=r.combatCards().find(c=>/GUARD/.test(c.id)&&!c.reason);assert(guard,'a guard card');r.action('COMBAT',{card:guard.id});
 }
 const name=me().name,skipped=b().log.filter(e=>e.skipped&&e.actor===name).length,refused=b().log.filter(e=>e.resisted==='STATUS_FREEZE'&&e.targetId==='PLAYER_CUSTOM').length;
 return {acted,results,skipped,refused,r};
}

// First every round: frozen after acting in round 1 → round 2 is the one turn lost. In round 2 (still frozen) a new freeze
// changes nothing; in round 3 (just thawed, acted) it is refused; in round 4 it lands again → round 5 lost.
{
 const out=run({speed:999,rounds:6,tries:[1,2,3,4]});
 assert.deepEqual(out.results.map(x=>x.frozen),[true,false,false,true]);
 assert.deepEqual(out.acted,[1,3,4,6],'one turn lost per freeze, never two in a row');
 assert.equal(out.skipped,2);assert.equal(out.refused,1,'「막 풀려나 다시 얼지 않는다」 once, not while still frozen');
 console.log('PASS a freeze takes one turn; it never refreshes; two turns of one’s own come before the next');
}
// Last from round 2: frozen in round 2 before acting → only that turn is lost (it used to last through round 3 as well).
{
 const out=run({speed:1,rounds:4,tries:[2]});
 assert.deepEqual(out.results.map(x=>x.frozen),[true]);assert.deepEqual(out.acted,[1,3,4]);assert.equal(out.skipped,1);
 console.log('PASS a freeze before one’s turn in the same round takes only that turn');
}
// 0.16.4 (user: 「종려의 무한 석화 버그.(이건 좀 전체적으로 바꿀 필요가 있어보인다)」): the enemies' side follows the same rule
// now — one turn taken, no refresh while it holds, then two turns of their own (it used to refresh round after round).
{
 const r=fresh('MAP_MOND_PLAINS');r.startBattle('EG_MOND_SLIME_SMALL','EXPLICIT');const foe=r.s.runtime.actors.find(a=>a.side==='ENEMY'),t=Number(foe.turns)||0;
 const s=r.addCombatStatus(foe,'STATUS_FREEZE',1,{});assert(s);assert.equal(s.untilTurn,t+2);assert.equal(foe.controlGuard,t+3);
 assert.equal(r.addCombatStatus(foe,'STATUS_FREEZE',1,{}),null,'no refresh while it holds');
 assert.equal(r.addCombatStatus(foe,'LIYUE_PETRIFY',2,{}),null,'nor another turn-taking status on top');
 console.log('PASS enemies: one turn taken, then two of their own (0.16.4)');
}
console.log(JSON.stringify({ok:true}));
