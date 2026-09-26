/* v0.13.10 — Mond integrated tuning; authored CRPG rules, not original-game values.
 * Only newly opened regional random battles and the two Mond bosses opt in.
 * Unmodified battles/saves, quest reward tables and other regions keep old rules.
 */
(function(root){'use strict';
 const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x));
 const VERSION=1;
 const CONFIG={version:VERSION,
  // Factors on v0.13.9 regional stats; never on player gear or relative level.
  field:{1:{hp:1,atk:1},2:{hp:.98,atk:1.12},3:{hp:.95,atk:1.2},4:{hp:.92,atk:1.28},5:{hp:.9,atk:1.4},6:{hp:.86,atk:1.5}},
  xpGrade:{'일반':1,'정예':2,'강적':4},moraGrade:{'일반':1,'정예':2,'강적':4},
  moraRisk:{1:1,2:1.05,3:1.1,4:1.2,5:1.3,6:1.4},
  boss:{BOSS_DVALIN:{xp:600,mora:600},BOSS_ANDRIUS:{xp:900,mora:900}},
  dropConditions:{
   LT_SLIME:['없음','일반 슬라임 희귀 드랍','일반 슬라임 매우 희귀'],
   LT_SLIME_ELITE:['대형 슬라임'],
   LT_HILICHURL:['없음','일반 츄츄족 희귀 드랍','일반 츄츄족 매우 희귀'],
   LT_HILICHURL_ELITE:['정예 츄츄족'],LT_LAWACHURL:['츄츄왕','츄츄왕 희귀 보상'],
   LT_WHOPPER:['없음','구라구라꽃'],LT_ABYSS_MAGE:['심연 메이지'],LT_FATUI:['우인단'],
   LT_RUIN:['유적 기계'],LT_RUIN_ELITE:['강적 유적 기계'],
   LT_TREASURE:['보물 사냥단'],LT_TREASURE_ELITE:['정예 보물 사냥단']
  }
 };
 const old=Object.fromEntries(['startBattle','validateSave','enemyIntel','mondAreaThreat'].map(k=>[k,P[k]]));
 const enabled=b=>b?.mondBalance?.version===VERSION;
 P.mondBalanceConfig=function(){return copy(CONFIG);};
 P.startBattle=function(...args){
  const out=old.startBattle.apply(this,args),b=this.s.runtime;
  if(!b||b.opening?.state!=='PENDING'||b.mondBalance)return out;
  const local=b.balanceProfile?.mondLocal,field=!!local&&b.origin==='RANDOM';
  const boss=!!b.mondBossBalance&&b.actors.some(a=>a.side==='ENEMY'&&CONFIG.boss[a.source]);
  if(!field&&!boss)return out;
  const enemies=b.actors.filter(a=>a.side==='ENEMY'),risk=field?local.risk:0,scale=CONFIG.field[risk];
  if(field)for(const a of enemies){a.hp=a.maxHp=Math.max(1,Math.round(a.maxHp*scale.hp));a.atk=Math.max(1,Math.round(a.atk*scale.atk));
   // Opening passive shields were computed from pre-tuning HP. Scale once too.
   for(const s of a.shields||[])if(Number.isFinite(s.value))s.value=Math.max(0,Math.round(s.value*scale.hp));
  }
  const parts=enemies.map(a=>{const named=boss&&CONFIG.boss[a.source];return {source:a.source,level:a.level,grade:a.grade,
   xp:named?named.xp:Math.round((30+15*a.level)*(CONFIG.xpGrade[a.grade]||1)),
   mora:named?named.mora:Math.round((8+5*a.level)*(CONFIG.moraGrade[a.grade]||1)*(CONFIG.moraRisk[risk]||1))};});
  const noRewards=!!b.storyConfig?.noRewards;
  b.mondBalance={version:VERSION,kind:field?'FIELD':'BOSS',risk,
   rewards:{xp:noRewards?0:parts.reduce((n,x)=>n+x.xp,0),mora:noRewards?0:parts.reduce((n,x)=>n+x.mora,0),parts:noRewards?[]:parts}};
  return out;
 };
 P.mondRewardPlan=function(b){return enabled(b)?b.mondBalance.rewards:null;};
 P.mondLootSourceMatches=function(b,a,d){
  if(!enabled(b)||b.mondBalance.kind!=='FIELD')return false;
  // Explicit parent-species aliases only, not arbitrary conditional loot.
  return d[0]==='LT_SLIME'&&d[1]==='MON_SLIME'&&/^MON_SLIME_/.test(a.source)||
   d[0]==='LT_WHOPPER'&&d[1]==='MON_WHOPPERFLOWER'&&/^MON_WHOPPER_/.test(a.source);
 };
 P.mondLootConditionAllowed=function(b,a,d){
  if(!enabled(b)||b.mondBalance.kind!=='FIELD')return false;
  if(d[0]!==this.row('09_MONSTER_DB',a.source)[14])return false;
  return (CONFIG.dropConditions[d[0]]||[]).includes(d[6]||'없음');
 };
 // A taunt is not a silence: keep area attacks / healing / self support executable.
 // Ordinary or single-target attacks still strike the existing decoy, unchanged.
 P.resolveMondDecoyAction=function(a,targets){return this.resolveDecoyAction?.(a,targets)||false;};
 if(old.mondAreaThreat)P.mondAreaThreat=function(...args){const x=old.mondAreaThreat.apply(this,args);if(x)x.rewardGuide='승리 보상: 참가자별 경험치 · 공용 모라 · 적 종류별 소재. 고급 소재는 확률 획득.';return x;};
 P.validateSave=function(s){old.validateSave.call(this,s);const b=s.runtime,m=b?.mondBalance;if(!m)return s;
  if(m.version!==VERSION||!['FIELD','BOSS'].includes(m.kind)||!Number.isInteger(m.risk)||m.risk<0||m.risk>6||!m.rewards||!Array.isArray(m.rewards.parts))throw new api.RuleError('MOND_BALANCE_SAVE','몬드 전투 보상 기록이 올바르지 않습니다.');
  const v=m.rewards;
  for(const k of ['xp','mora'])if(!Number.isSafeInteger(v[k])||v[k]<0||v[k]>1000000)throw new api.RuleError('MOND_BALANCE_SAVE','몬드 보상 수치가 올바르지 않습니다.');
  if(v.parts.some(p=>!b.actors.some(a=>a.side==='ENEMY'&&a.source===p.source)||!Number.isInteger(p.level)||p.level<1||p.level>20||!Number.isSafeInteger(p.xp)||p.xp<0||!Number.isSafeInteger(p.mora)||p.mora<0)||v.xp!==v.parts.reduce((n,p)=>n+p.xp,0)||v.mora!==v.parts.reduce((n,p)=>n+p.mora,0))throw new api.RuleError('MOND_BALANCE_SAVE','몬드 보상 상세가 합계와 일치하지 않습니다.');
  return s;
 };
 api.mondIntegratedBalanceVersion=VERSION;
})(globalThis);
