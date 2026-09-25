/* v0.13.9: Mond boss-only tuning. Fixed authored targets; no party/gear scaling.
 * Changes apply only at new opening boundaries. Old live battles are untouched.
 * Numbers and the shared wind route are CRPG house rules, not original-game stats.
 */
(function(root){'use strict';
 const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x));
 const VERSION=1,WIND='SYS_MOND_WIND_ROUTE',ACCESS='EXPLICIT_ACCESS_TO_BOSS_DVALIN';
 const PROFILES={
  BOSS_DVALIN:{name:'드발린',level:5,hp:2050,atk:190,def:70,recommended:5,terrain:4},
  BOSS_ANDRIUS:{name:'안드리우스',level:7,hp:2100,atk:110,def:75,recommended:7}
 };
 const old=Object.fromEntries(['startBattle','combatCards','executeCombatSystem','enemyIntel','validateSave'].map(k=>[k,P[k]]));
 P.mondBossProfiles=function(){return copy(PROFILES);};
 P.startBattle=function(...args){
  const result=old.startBattle.apply(this,args),b=this.s.runtime;
  if(!b||b.opening?.state!=='PENDING'||b.mondBossBalance)return result;
  const bosses=b.actors.filter(a=>a.side==='ENEMY'&&PROFILES[a.source]);if(!bosses.length)return result;
  b.mondBossBalance={version:VERSION,bosses:bosses.map(a=>a.source),windRoute:false};
  for(const a of bosses){const c=PROFILES[a.source];a.rewardLevel=a.level;a.hp=a.maxHp=c.hp;a.atk=c.atk;a.def=c.def;a.level=c.level;
   if(a.andrius)a.andrius.rageStacks=0;
   if(a.source==='BOSS_DVALIN'){a.airborne=true;b.terrain=b.terrainMax=c.terrain;}
  }
  // Replace the legacy STORY_DVALIN profile (six platforms / party-count stats).
  b.balanceProfile={version:4,kind:'MOND_BOSS_FIXED',bosses:copy(b.mondBossBalance.bosses),recommendedLevel:Math.max(...bosses.map(a=>PROFILES[a.source].recommended)),party:b.actors.filter(a=>a.side==='ALLY').length,recommendedParty:4};
  return result;
 };
 P.combatCards=function(...args){const cards=old.combatCards.apply(this,args),b=this.s.runtime,a=this.combatActor(args[0]||'PLAYER_CUSTOM');
  if(!b?.mondBossBalance||!a||a.source!=='PLAYER_CUSTOM'||!b.mondBossBalance.bosses.includes('BOSS_DVALIN'))return cards;
  let reason=b.opening?.state==='PENDING'?'먼저 전투 시작을 눌러 주세요.':b.interlude?'현재 대화를 마쳐 주세요.':b.subduedPending?'마지막 행동을 선택해 주세요.':a.hp<=0?'전투불능 상태입니다.':b.mondBossBalance.windRoute?'이미 바람길을 확보했습니다.':this.combatActionLocked?.(a)?'행동 불가 상태입니다.':'';
  cards.push({id:WIND,name:'상승 기류 · 바람길 확보',system:true,cooldown:0,reason,targets:[{id:a.id,name:a.name,hp:a.hp,maxHp:a.maxHp}],description:'전장에 생긴 상승 기류를 이용합니다. 주인공의 1행동으로 살아 있는 아군 전체의 공중 접근을 이 전투 동안 확보하며, 주인공이 원소 능력을 얻는 것은 아닙니다. 근접·중거리 공격은 기존 최종 피해 −15%를 적용합니다. 장비·아이템은 소비하지 않습니다.'});return cards;
 };
 P.executeCombatSystem=function(a,id,target){if(id!==WIND)return old.executeCombatSystem.call(this,a,id,target);
  const b=this.s.runtime,entry=this.combatCards(a.id).find(c=>c.id===WIND);if(!entry||entry.reason)throw new api.RuleError('BOSS_WIND_ROUTE',entry?.reason||'현재 전투에서는 바람길을 확보할 수 없습니다.');
  b.mondBossBalance.windRoute=true;
  for(const member of b.actors.filter(x=>x.side==='ALLY'&&x.hp>0))this.addCombatStatus(member,ACCESS,null,{sourceCardId:WIND,bossAccess:true});
  b.log.push({actor:a.name,actorId:a.id,card:WIND,cardName:'상승 기류 · 바람길 확보',round:b.round,actionSequence:b.actionSequence,text:'아군 전체 공중 접근 확보 · 근접·중거리 최종 피해 −15%',sourceKind:'BOSS_ARENA'});
 };
 P.mondBossReadiness=function(id){const c=PROFILES[id];if(!c)return null;const party=this.activePartyActors(),naked=party.filter(a=>!this.s.inventory.some(i=>i.quantity>0&&i.equip&&i.equipped&&i.owner===a.id)).map(a=>a.name),low=party.filter(a=>a.level<c.recommended).map(a=>a.name);
  return {id,...copy(c),party:party.length,naked,low,warnings:[...(party.length<4?['권장 4인 · 현재 '+party.length+'인']:[]),...(low.length?['권장 Lv.'+c.recommended+' 미만: '+low.join(', ')]:[]),...(naked.length?['장비 미착용: '+naked.join(', ')]:[])],tips:id==='BOSS_DVALIN'?['2·4·6·8라운드 끝에 지형 파괴 · 8라운드 종료 전 제압','근접·중거리 동료가 있으면 첫 차례에 상승 기류 사용','원거리·대공 기술은 바람길 없이 공격 가능']:['얼음·바람 피해 완전면역 · 다른 원소나 물리 공격 준비','2라운드부터 매 라운드 공격력 10% 누적 증가','질주 뒤 2행동·빙창 압박 · 회복과 집중 공격으로 장기전 억제']};
 };
 if(old.enemyIntel)P.enemyIntel=function(id){const info=old.enemyIntel.call(this,id),a=this.combatActor(id),b=this.s.runtime;if(!info||!b?.mondBossBalance||!PROFILES[a?.source])return info;
  const p=PROFILES[a.source];info.cues=[...(info.cues||[]),{kind:'warning',text:'권장 4인 · Lv.'+p.recommended+' · 전원 장비 착용',detail:'권장치이며 입장·승리 보장 조건이 아닙니다. 보스는 파티의 레벨·강화도에 맞춰 자동 상승하지 않습니다.'}];
  if(a.source==='BOSS_DVALIN')info.cues.push({kind:'warning',text:'남은 지형 '+b.terrain+' / 4 · 8라운드 종료 시 전멸',detail:b.mondBossBalance.windRoute?'바람길 확보됨 · 근접·중거리도 공격 가능, 최종 피해 −15%':'상승 기류를 1행동으로 사용하면 아군 전체가 공중 목표에 접근할 수 있습니다.'});return info;
 };
 P.validateSave=function(s){old.validateSave.call(this,s);const b=s.runtime,m=b?.mondBossBalance;if(!m)return s;
  if(m.version!==VERSION||typeof m.windRoute!=='boolean'||!Array.isArray(m.bosses)||!m.bosses.length||m.bosses.some(id=>!PROFILES[id]||!b.actors.some(a=>a.side==='ENEMY'&&a.source===id)))throw new api.RuleError('BOSS_BALANCE_SAVE','보스 전투 규칙 저장이 올바르지 않습니다.');
  if(b.actors.some(a=>m.bosses.includes(a.source)&&(!Number.isInteger(a.rewardLevel)||a.rewardLevel<1||a.rewardLevel>20)))throw new api.RuleError('BOSS_REWARD_SAVE','보스 보상 기준 기록이 올바르지 않습니다.');
  if(m.bosses.includes('BOSS_DVALIN')&&(!Number.isInteger(b.terrain)||b.terrain<0||b.terrain>4))throw new api.RuleError('BOSS_TERRAIN_SAVE','드발린 지형 기록이 올바르지 않습니다.');return s;
 };
 api.mondBossBalanceVersion=VERSION;
})(globalThis);
