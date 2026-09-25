/* Explicit battle access is a runtime flag, not a DB status row. */
const bossStatusName=safeName;safeName=function(table,id,col=1){if(table==='13_STATUS_EFFECT_DB'&&id==='EXPLICIT_ACCESS_TO_BOSS_DVALIN')return '공중 접근';return bossStatusName(table,id,col);};
/* Boss readiness and all-side technique headings. View-only; no RNG/actions. */
const BattleTechnique={
 actors:new Map(),current:null,banner:null,dialog:null,resumeToken:null,
 capture(){const b=game?.s.runtime;if(b)this.actors=new Map(b.actors.map(a=>[a.id,{id:a.id,name:a.name,side:a.side,source:a.source}]));},
 definition(frame){const events=frame.events||[frame],actor=this.actors.get(frame.actorId),cardId=events.find(e=>e.cardId)?.cardId||frame.cardId;
  const own=game?.combatRows('08_SKILL_CARD_DB').find(r=>r[0]===cardId),enemy=own?null:game?.combatRows('12_ENEMY_CARD_DB').find(r=>r[0]===cardId);
  let name=frame.cardName||own?.[3]||enemy?.[2];
  if(cardId==='SYS_MOND_WIND_ROUTE')name='상승 기류 · 바람길 확보';
  if(!name)name=events.some(e=>e.kind==='guard')?'방어 태세':events.some(e=>e.kind==='heal')?'회복 효과':frame.periodic?'지속 효과':'기본 공격';
  const state=events.some(e=>e.interrupted)?'중단':events.some(e=>e.charging)?'준비':events.some(e=>e.released)?'발동':frame.periodic?'지속 효과':'사용';
  return {frame,cardId,name,state,actor,side:actor?.side||events.find(e=>e.actorSide)?.actorSide||'EFFECT',owner:actor?.name||frame.actor||'전장 효과',description:own?.[16]||enemy?.[17]||'',coefficient:own?.[7]||enemy?.[6]||'',cooldown:own?.[9]??enemy?.[8],targets:[...new Set((frame.targets||[]).map(t=>t.target).filter(Boolean))],events};
 },
 show(frame){if(!frame||['victory','defeat'].includes(frame.kind)){this.banner?.remove();this.banner=null;return;}const dock=GameEffects.dock;if(!dock)return;
  const d=this.definition(frame);this.current=d;
  if(!this.banner||this.banner.parentElement!==dock){this.banner=el('section','combat-skill-banner');this.banner.setAttribute('aria-label','현재 사용 기술');this.banner.setAttribute('role','status');this.banner.setAttribute('aria-live','polite');dock.prepend(this.banner);}
  const box=this.banner;box.dataset.side=d.side;box.replaceChildren();
  const caption=el('div','combat-skill-heading');caption.append(el('span','combat-skill-side',(d.side==='ALLY'?'아군':d.side==='ENEMY'?'적':'효과')+' · '+d.owner+' · '+d.state),el('strong','combat-skill-name',d.name));
  const bonus=d.events.find(e=>Number.isFinite(e.jointBonusPct))?.jointBonusPct;
  let meta=d.targets.length?'대상 · '+d.targets.join(', '):d.state==='준비'?'다음 차례 발동을 준비합니다.':'기술 효과 적용';
  if(bonus!==undefined)meta='합동 공격 · 추가 배율 +'+bonus+'%'+(d.targets.length?' · '+d.targets.join(', '):'');
  caption.append(el('small','combat-skill-target',meta));box.append(caption,button(d.side==='ENEMY'?'적 기술 정보':'기술 정보',()=>this.open()));
  // The heading occupies layout space inside the dock; floating damage stays
  // above its top. If not enough room remains, dock outcome text is the fallback.
  this.keepDamageSeparate();
 },
 keepDamageSeparate(){const dock=GameEffects.dock;if(!dock)return;const bounds=dock.getBoundingClientRect();
  for(const impact of document.querySelectorAll('.combat-effects .impact')){const r=impact.getBoundingClientRect();if(r.bottom>bounds.top-18){const y=bounds.top-24-r.height/2;if(y<115)impact.hidden=true;else impact.style.top=y+'px';}}
 },
 open(){const d=this.current;if(!d)return;if(d.side==='ENEMY'&&EnemyIntel.cache.has(d.frame.actorId)){EnemyIntel.open(d.frame.actorId,d.cardId);return;}
  if(!this.dialog){const dialog=el('dialog','enemy-intel-dialog combat-technique-dialog');dialog.id='combat-technique-dialog';dialog.setAttribute('aria-labelledby','combat-technique-title');document.body.append(dialog);this.dialog=dialog;dialog.addEventListener('close',()=>{const t=this.resumeToken;this.resumeToken=null;if(t&&GameEffects.active&&GameEffects.generation===t.generation&&!t.wasPaused){GameEffects.paused=false;CombatFX.pause(false);GameEffects.reschedule();}});}
  if(GameEffects.active&&!this.dialog.open){this.resumeToken={generation:GameEffects.generation,wasPaused:GameEffects.paused};GameEffects.paused=true;CombatFX.pause(true);GameEffects.reschedule();}
  const head=el('header','intel-dialog-head'),title=el('h2','',d.name);title.id='combat-technique-title';const close=button('닫기',()=>this.dialog.close());close.setAttribute('aria-label','기술 정보 닫기');head.append(title,close);
  const body=el('div','intel-dialog-scroll');body.append(el('p','',d.owner+' · '+(d.side==='ALLY'?'아군 기술':'전장 효과')));
  if(d.coefficient)body.append(el('p','',d.coefficient));
  body.append(el('p','',d.cardId==='SYS_MOND_WIND_ROUTE'?'전장에 생긴 상승 기류를 이용하는 행동이며 주인공의 새 원소 기술이 아닙니다. 1행동으로 생존 아군 전체의 이번 전투 공중 접근을 확보합니다. 근접·중거리 공격은 최종 피해가 15% 감소합니다. 지형 파괴와 제한시간은 그대로입니다.':d.description||'현재 행동의 피해·회복·방어 결과는 아래 전투 결과 영역에 별도로 표시됩니다.'));
  if(Number(d.cooldown)>0)body.append(el('p','','재사용 · '+d.cooldown+'차례'));
  body.append(el('p','intel-replay-note','이번 행동은 이미 계산된 결과를 재생 중입니다. 확인을 닫으면 이어서 표시하며, 다음 조작 차례에 대응할 수 있습니다.'));
  this.dialog.replaceChildren(head,body);if(!this.dialog.open)this.dialog.showModal();close.focus({preventScroll:true});
 },
 clear(){this.banner?.remove();this.banner=null;this.current=null;this.resumeToken=null;if(this.dialog?.open)this.dialog.close();}
};
const bossIntelCapture=EnemyIntel.capture;EnemyIntel.capture=function(){bossIntelCapture.call(this);BattleTechnique.capture();};
// Replaces the old enemy-only floating toast; no duplicate layer over damage.
EnemyIntel.showSkill=function(frame){BattleTechnique.show(frame);};
const bossWindup=CombatFX.windup;CombatFX.windup=function(frame,effects){bossWindup.call(this,frame,effects);BattleTechnique.show(frame);};
const bossEffectsCancel=GameEffects.cancel;GameEffects.cancel=function(...args){BattleTechnique.clear();return bossEffectsCancel.apply(this,args);};
window.addEventListener('resize',()=>BattleTechnique.keepDamageSeparate());
const bossCombat=combat;combat=function(p){bossCombat(p);const b=game.s.runtime;if(!b?.mondBossBalance)return;
 const box=el('section','boss-readiness');box.setAttribute('aria-label','보스 전투 현황');
 for(const id of b.mondBossBalance.bosses){const r=game.mondBossReadiness(id);box.append(el('h2','',r.name+' · 권장 Lv.'+r.recommended+' / 4인 장비 파티'));
  if(id==='BOSS_DVALIN')box.append(el('strong','boss-clock','남은 지형 '+b.terrain+'/4 · 현재 '+b.round+'라운드'));
  
 }
 const heading=p.querySelector('.battle-heading');if(heading)heading.after(box);else p.prepend(box);
};
function appendBossPreparation(p,ids){
 if(!ids.length)return;const box=el('section','boss-readiness');box.setAttribute('aria-label','입장 전 보스 준비 확인');
 for(const id of ids){const r=game.mondBossReadiness(id);if(!r)continue;box.append(el('h2','',r.name+' · 권장 Lv.'+r.recommended+' / 4인'));
  box.append(el('p','','체력 '+r.hp+' · 공격력 '+r.atk+' · 방어력 '+r.def+' · 장비·레벨에 따라 자동 상승하지 않는 고정 보스'));
  
  box.append(el('small','muted','장비 착용은 승리 보장이 아닙니다. 입장 후에는 장비 교체가 불가능하며, 보스별 게임 내 이틀 입장 간격은 유지됩니다.'));
 }p.prepend(box);
}
const bossPrepareScreen=battlePrepare;battlePrepare=function(p,...args){bossPrepareScreen(p,...args);const group=game.s.battlePreparation?.group;const row=game.combatRows('33_ENCOUNTER_GROUP_DB').find(r=>r[0]===group);appendBossPreparation(p,row&&['BOSS_DVALIN','BOSS_ANDRIUS'].includes(row[7])?[row[7]]:[]);};
const bossEntryScreen=boss;boss=function(p,...args){bossEntryScreen(p,...args);const routes=game.rows('35_BOSS_ROUTE_DB').filter(r=>r[2]===game.s.global.CURRENT_MAP_ID);appendBossPreparation(p,routes.map(r=>({BRT_DVALIN:'BOSS_DVALIN',BRT_ANDRIUS:'BOSS_ANDRIUS'}[r[0]])).filter(Boolean));};
