/* A wave has eight bodies. Both sides get three separate summon slots. Reserve bodies keep their rewards. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype,old=Object.fromEntries(['startBattle','newRound','resolveEnemyPhases','liyueBattleOutcome','addField','addCombatObject','fbSummon','applyDamage','finishBattle','validateSave'].map(k=>[k,P[k]]));
const SUMMONS=new Set(['BUNNY','OZ','GOU_BA','YUEGUI_THROWING','MAN_CHAI','PHANTOM','BAMBOO_STAR']);
const live=f=>!f.done&&(f.hp===undefined||f.hp>0)&&(!Number.isFinite(f.rounds)||f.rounds>0);
P.limitSummonFields=function(b=this.s.runtime){if(!b)return;for(const side of ['ALLY','ENEMY']){const list=(b.fields||[]).filter(f=>f.side===side&&SUMMONS.has(f.kind)&&live(f));while(list.length>3){const f=list.shift();f.done=true;f.rounds=0;b.log.push({text:(f.name||'소환체')+'이(가) 새 소환체와 교대했습니다.',round:b.round});}}};
P.limitBattleEnemies=function(b=this.s.runtime){if(!b)return;this.limitSummonFields(b);b.enemyReserve??=[];const fields=(b.fields||[]).filter(f=>f.side==='ENEMY'&&SUMMONS.has(f.kind)&&live(f)).length;
 for(const [summon,cap]of [[false,8],[true,Math.max(0,3-fields)]]){const active=b.actors.filter(a=>a.side==='ENEMY'&&!!a.fbSummon===summon&&a.hp>0),excess=active.slice(cap);if(excess.length){const ids=new Set(excess.map(a=>a.id));b.enemyReserve.push(...excess);b.actors=b.actors.filter(a=>!ids.has(a.id));const removedBefore=(b.order||[]).slice(0,b.cursor).filter(t=>ids.has(typeof t==='string'?t:t.id)).length;b.order=b.order?.filter(t=>!ids.has(typeof t==='string'?t:t.id))||[];b.cursor=Math.max(0,Math.min(b.cursor-removedBefore,b.order.length));}
 // 0.15.24 tutorial waves (runtime_tutorial_v01522.js): a held body joins only when its side of the field is clear,
 // one wave at a time, and only while a lesson is still waiting.
 if(b.tutorialWaves?.stop)b.enemyReserve=b.enemyReserve.filter(a=>!a.waveHold);
 const held=b.enemyReserve.filter(a=>!!a.fbSummon===summon&&a.waveHold),nextWave=held.length&&!active.length?Math.min(...held.map(a=>a.waveHold)):null;let arrived=false;
 let free=cap-Math.min(active.length,cap);for(let i=0;i<b.enemyReserve.length&&free>0;){const a=b.enemyReserve[i];if(!!a.fbSummon!==summon||a.waveHold&&a.waveHold!==nextWave){i++;continue;}b.enemyReserve.splice(i,1);if(a.waveHold){delete a.waveHold;arrived=true;}b.actors.push(a);if(!b.order.some(t=>(typeof t==='string'?t:t.id)===a.id))b.order.push({id:a.id,score:this.combatStat(a,'spd')});free--;}
 if(arrived){b.tutorialWaves.arrived=b.round;b.tutorialWaves.released=(b.tutorialWaves.released||0)+1;b.log.push({text:'적이 더 몰려왔다!',round:b.round,tutorialWave:b.tutorialWaves.released});}}
 if(b.opening?.state==='PENDING')b.opening.initialOrder=JSON.parse(JSON.stringify(b.order));b.capacityVersion=1;
};
P.startBattle=function(...a){const out=old.startBattle.apply(this,a);this.limitBattleEnemies();return out;};
P.newRound=function(...a){this.limitBattleEnemies();return old.newRound.apply(this,a);};
P.resolveEnemyPhases=function(...a){this.limitBattleEnemies();const out=old.resolveEnemyPhases?.apply(this,a);this.limitBattleEnemies();return out;};
P.liyueBattleOutcome=function(b){this.limitBattleEnemies(b);if(b?.growthBalance?.field&&b.round>30){b.defeatReason='ROUND_LIMIT';b.defeatMessage='30라운드 안에 적을 정리하지 못해 후퇴했습니다.';return false;}return old.liyueBattleOutcome?.call(this,b);};
for(const key of ['addField','addCombatObject','fbSummon'])if(old[key])P[key]=function(...a){const out=old[key].apply(this,a);this.limitBattleEnemies();return out;};
P.applyDamage=function(...a){const out=old.applyDamage.apply(this,a);this.limitBattleEnemies();return out;};
P.finishBattle=function(win){const b=this.s.runtime;if(b?.enemyReserve?.length){if(win&&!b.liyueObjective&&!b.fieldObjective){this.limitBattleEnemies(b);if(b.enemyReserve.length||b.actors.some(a=>a.side==='ENEMY'&&a.hp>0))throw new api.RuleError('BATTLE_RESERVE','남아 있는 증원을 먼저 정리해야 합니다.');}else b.enemyReserve=[];}return old.finishBattle.call(this,win);};
P.validateSave=function(s){const b=s.runtime,reserve=b?.enemyReserve;if(reserve){if(!Array.isArray(reserve)||reserve.length>128||reserve.some(a=>a.side!=='ENEMY'||a.hp<=0)||new Set([...b.actors,...reserve].map(a=>a.id)).size!==b.actors.length+reserve.length)throw new api.RuleError('BATTLE_CAPACITY','증원 기록을 확인해 주세요.');const actors=b.actors;b.actors=[...actors,...reserve];try{old.validateSave.call(this,s);}finally{b.actors=actors;}}else old.validateSave.call(this,s);if(b?.capacityVersion===1&&(b.actors.filter(a=>a.side==='ENEMY'&&!a.fbSummon&&a.hp>0).length>8||b.actors.filter(a=>a.side==='ENEMY'&&a.fbSummon&&a.hp>0).length>3))throw new api.RuleError('BATTLE_CAPACITY','전투 정원을 초과했습니다.');return s;};
api.battleCapacity={enemies:8,summons:3,fieldKinds:[...SUMMONS]};
})(globalThis);
