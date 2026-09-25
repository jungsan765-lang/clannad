/* Stage-2 presentation only: no state writes; keyboard shortcuts select, never execute. */
(function(){'use strict';
 const priorCombat=combat;
 combat=function(p){priorCombat(p);const v=game.protagonistCombatView(),panel=el('section','protagonist-panel protagonist-'+v.kind.toLowerCase());panel.setAttribute('aria-label','주인공 전투 능력');
  panel.append(el('strong','',v.title),el('p','',v.text));
  if(v.kind==='ISEKAI'&&!v.legacy){const m=el('div','joint-members');m.setAttribute('aria-label','합동 공격 참여 상태');for(const a of v.members)m.append(el('span',a.reason?'unavailable':'',a.name+(a.reason?' · '+a.reason:'')));panel.append(m,el('p','joint-bonus',`Q · 기본 공격 배율 +${v.bonusPct}% · 자신의 공격력 ${v.stats.atk} / Lv.${v.stats.level}`));}
  const controls=p.querySelector('.battle-command');if(controls)p.insertBefore(panel,controls);else p.append(panel);
  for(const c of game.combatCards()){if(!c.key)continue;const btn=[...p.querySelectorAll('.battle-cards button')].find(x=>x.dataset.cardId===c.id);if(!btn)continue;btn.classList.add('protagonist-skill','skill-'+c.key.toLowerCase(),'identity-'+c.protagonistKind.toLowerCase());btn.prepend(el('span','skill-key',c.key));btn.setAttribute('aria-label',c.key+' · '+c.name+(c.reason?' · '+c.reason:''));}
  if(selectedCard==='PLAYER_ISEKAI_E'&&!v.legacy){const t=v.windowTargets.find(x=>x.id===selectedTarget);if(t)controls?.append(el('p','skill-preview',t.reason||`${t.name} · 최대 HP −${t.amount} · 다음 자기 차례까지. 임시 감소분은 만료 시 복원됩니다.`));}
  if(selectedCard==='PLAYER_ISEKAI_Q'&&!v.legacy)controls?.append(el('p','skill-preview','합동 공격: 본인부터 동료까지 기본 공격 1회씩. 사거리·행동 불가를 판정하며, 대상 격파 시 다음 공격 가능한 적을 노립니다. 동료의 평소 차례는 그대로입니다.'));
  if(selectedCard==='PLAYER_TRAVELER_ANEMO_E')controls?.append(el('p','skill-preview','짧게: 1명, 재사용 2턴. 길게: 대상 주변 최대 3명, 재사용 3턴. 바람 절단 후 폭발하며 원소 전환은 시전당 한 종류만 적용됩니다.'));
 };
 document.addEventListener('keydown',event=>{if(event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey||busy||!game?.s?.runtime||document.querySelector('dialog[open]')||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName)||event.target?.isContentEditable)return;
  if(game.combatOpening?.()||!document.querySelector('.combat-panel'))return;const key=event.key.toUpperCase();if(!['E','Q'].includes(key))return;const c=game.combatCards().find(x=>x.key===key&&!x.reason);if(!c)return;event.preventDefault();selectedCard=c.id;selectedBranch=c.branches?.[0]||'';render();
 });
 // Grouped playback still uses its original timing and reduced-motion controls.
 const windup=CombatFX.windup;
 CombatFX.windup=function(frame,effects){const joint=frame.cardId==='PLAYER_ISEKAI_Q'||frame.events?.some(e=>e.cardId==='PLAYER_ISEKAI_Q'||e.sourceKind==='JOINT_ATTACK');const skipped=frame.events?.every(e=>e.jointSkipped);
  if(joint&&!skipped){const decorated={...frame,periodic:false,events:frame.events.map(e=>({...e,sourceKind:e.sourceKind==='JOINT_ATTACK'?null:e.sourceKind}))};windup.call(this,decorated,effects);
   if(effects.dock){effects.dock.classList.add('joint-attack-playback');effects.dock.querySelector('.playback-message').textContent='합동 공격 Q · '+frame.actor+' · 함께하는 일격';}
   if(!settings.reducedMotion){const badge=el('div','joint-attack-banner','Q · 함께하는 일격');effects.layerNode().append(badge);this.animate(badge,[{opacity:0,transform:'translate(-50%,12px)'},{opacity:1,transform:'translate(-50%,0)'}],{duration:220,fill:'forwards'});}
  }else{effects.dock?.classList.remove('joint-attack-playback');windup.call(this,frame,effects);}
 };
 const showAction=GameEffects.showAction;
 GameEffects.showAction=function(frame){showAction.call(this,frame);if(frame.events?.some(e=>e.jointAttack&&!e.jointSkipped)&&this.dock){const pct=frame.events.find(e=>Number.isFinite(e.jointBonusPct))?.jointBonusPct;this.dock.querySelector('.playback-message').textContent='합동 공격 Q · '+frame.actor+(pct!==undefined?' · 추가 배율 +'+pct+'%':'');}};
})();
