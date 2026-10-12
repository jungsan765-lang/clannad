/* Stage-2 presentation only: no state writes of its own. E/Q select a skill; since 0.16.35 (TODO 6-5) Space presses the
 * battle's own 「전투 시작」/「실행」 button and 1–4 its target rows, the same buttons a click would. */
(function(){'use strict';
 const priorCombat=combat;
 combat=function(p){priorCombat(p);const v=game.protagonistCombatView(),controls=p.querySelector('.battle-command');
  for(const c of game.combatCards()){if(!c.key)continue;const btn=[...p.querySelectorAll('.battle-cards button')].find(x=>x.dataset.cardId===c.id);if(!btn)continue;btn.classList.add('protagonist-skill','skill-'+c.key.toLowerCase(),'identity-'+c.protagonistKind.toLowerCase());btn.prepend(el('span','skill-key',c.key));btn.setAttribute('aria-label',c.key+' · '+c.name+(c.reason?' · '+c.reason:''));}
 };
 document.addEventListener('keydown',event=>{if(event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey||window.CRPGShell?.topOverlay?.()||busy||!game?.s?.runtime||document.querySelector('dialog[open]')||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName)||event.target?.isContentEditable)return;
  if(game.combatOpening?.()||!document.querySelector('.combat-panel'))return;const key=event.key.toUpperCase();if(!['E','Q'].includes(key))return;const c=game.combatCards().find(x=>x.key===key&&!x.reason);if(!c)return;event.preventDefault();selectedCard=c.id;selectedBranch=c.branches?.[0]||'';render();
 });
 // 0.16.35 (TODO 6-5): Space presses the screen's main button — the battle's 「전투 시작」 or 「실행」 (so E/Q then Space
 // uses a skill), a chest window's open/confirm, a window's main button, the result's way out — and 1–4 pick a target. A
 // focused button keeps its own Space; the story keeps its own keys (app_shell.js).
 const pressable=b=>!!b&&!b.disabled&&b.getClientRects().length>0;
 document.addEventListener('keydown',event=>{
  const space=event.key===' ',digit=/^[1-4]$/.test(event.key);if(!space&&!digit)return;
  if(event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey||busy||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName)||event.target?.isContentEditable)return;
  if(space&&event.target?.closest?.('button,a,summary,[role="button"]'))return;
  const press=b=>{if(!pressable(b))return false;event.preventDefault();b.click();return true;};
  const chest=document.querySelector('.ch-overlay');if(chest){if(space)press(chest.querySelector('.ch-open,.ch-done,.ch-challenge+.ch-open'));return;}
  const dialog=document.querySelector('dialog[open]');if(dialog){if(space)press(dialog.querySelector('#modal-body button.primary:not([data-action="COMMISSION_ABANDON"])')||dialog.querySelector('#modal-close'));return;}
  if(window.CRPGShell?.topOverlay?.()||document.getElementById('tutorial-spotlight'))return;
  if(game?.s?.runtime&&document.querySelector('.combat-panel')){
   if(window.ActorPlayback?.active)return;
   if(digit){const rows=[...document.querySelectorAll('.combatant-row.targetable')].filter(pressable);press(rows[Number(event.key)-1]);return;}
   press(document.querySelector('[data-action="COMBAT_BEGIN"]')||document.querySelector('[data-action="COMBAT"]'));return;
  }
  if(space)press(document.querySelector('.shell-result-actions button.primary'));
 });
 // The keys beside their buttons, on a computer (a phone has no keyboard).
 const priorKeys=combat;
 combat=function(p){priorKeys(p);try{if(!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
  const hint=t=>{const k=el('kbd','key-hint',t);k.setAttribute('aria-hidden','true');return k;};
  for(const b of p.querySelectorAll('[data-action="COMBAT_BEGIN"],[data-action="COMBAT"]'))if(!b.nextElementSibling?.classList.contains('key-hint'))b.after(hint('Space'));
  [...p.querySelectorAll('.combatant-row.targetable')].slice(0,4).forEach((r,i)=>{if(!r.querySelector(':scope>.key-hint')){const k=hint(String(i+1));k.classList.add('target-key');r.append(k);}});}catch{}}; // Grouped playback still uses its original timing and reduced-motion controls.
 const windup=CombatFX.windup;
 CombatFX.windup=function(frame,effects){const joint=frame.cardId==='PLAYER_ISEKAI_Q'||frame.events?.some(e=>e.cardId==='PLAYER_ISEKAI_Q'||e.sourceKind==='JOINT_ATTACK');const skipped=frame.events?.every(e=>e.jointSkipped);
  if(joint&&!skipped){const decorated={...frame,periodic:false,events:frame.events.map(e=>({...e,sourceKind:e.sourceKind==='JOINT_ATTACK'?null:e.sourceKind}))};windup.call(this,decorated,effects);
   if(effects.dock){effects.dock.classList.add('joint-attack-playback');effects.dock.querySelector('.playback-message').textContent='합동 공격 Q · '+frame.actor+' · 함께하는 일격';}
   // 0.15.21 (user: 「공격 할때마다 왜 컷인이 뜨는거냐 함께하는 일격에?」): no banner on every joined blow; the playback
   // window already names the joint attack.
  }else{effects.dock?.classList.remove('joint-attack-playback');windup.call(this,frame,effects);}
 };
 const showAction=GameEffects.showAction;
 GameEffects.showAction=function(frame){showAction.call(this,frame);if(frame.events?.some(e=>e.jointAttack&&!e.jointSkipped)&&this.dock){const pct=frame.events.find(e=>Number.isFinite(e.jointBonusPct))?.jointBonusPct;this.dock.querySelector('.playback-message').textContent='합동 공격 Q · '+frame.actor+(pct!==undefined?' · 추가 배율 +'+pct+'%':'');}};
})();
