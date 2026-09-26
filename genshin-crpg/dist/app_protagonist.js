/* Stage-2 presentation only: no state writes; keyboard shortcuts select, never execute. */
(function(){'use strict';
 const priorCombat=combat;
 combat=function(p){priorCombat(p);const v=game.protagonistCombatView(),controls=p.querySelector('.battle-command');
  for(const c of game.combatCards()){if(!c.key)continue;const btn=[...p.querySelectorAll('.battle-cards button')].find(x=>x.dataset.cardId===c.id);if(!btn)continue;btn.classList.add('protagonist-skill','skill-'+c.key.toLowerCase(),'identity-'+c.protagonistKind.toLowerCase());btn.prepend(el('span','skill-key',c.key));btn.setAttribute('aria-label',c.key+' · '+c.name+(c.reason?' · '+c.reason:''));}
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
