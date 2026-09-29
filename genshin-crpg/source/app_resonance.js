/* v0.14.4 공명 각성 on screen. When a burst awakens (runtime_skill_rhythm.js marks it in the battle log), a short
 * translucent band crosses the battle with the character's motion art (image 7, or the default image when the
 * character has none), their name and the burst. It never blocks input, follows the playback speed, fades only
 * when motion is reduced, and plays once per burst. View-only; load after app_combat_fx.js and presentation.js. */
(function(){'use strict';
if(typeof CombatFX==='undefined')return;
const shown=new Set();
function resonanceEntry(frame){
 const b=game?.s?.runtime,logs=b?.log||game?.s?.lastCombatLog||[];
 return logs.find(e=>e.resonance&&e.actorId===frame.actorId&&e.round===frame.round&&(frame.action===undefined||e.actionSequence===frame.action))||null;
}
function cue(frame){
 if(frame?.kind!=='action')return;const hit=resonanceEntry(frame);if(!hit)return;
 const key=[game.s.global.SAVE_ID,game.s.runtime?.id||'',hit.actorId,hit.round,hit.actionSequence].join(':');if(shown.has(key))return;shown.add(key);
 const actor=(game.s.runtime?.actors||[]).find(a=>a.id===hit.actorId),source=actor?.source||String(hit.actorId).split('#')[0];
 const profile=game.rows('04_CHAR_DB').find(r=>r[1]===source)?.[0],src=profile&&(portraitFor(profile,7)||portraitFor(profile,1));
 document.querySelector('.resonance-cue')?.remove();
 const band=el('div','resonance-cue'+(settings?.reducedMotion?' still':''));band.setAttribute('role','status');band.setAttribute('aria-label',(actor?.name||hit.actor)+' 공명 각성');
 if(src){const art=el('div','resonance-art');art.style.backgroundImage='url("'+src+'")';band.append(art);}
 const text=el('div','resonance-text');text.append(el('small','','공명 각성'),el('strong','',actor?.name||hit.actor||''),el('span','',hit.cardName||''));band.append(text);
 const ms=Math.round(1500/(settings?.combatSpeed||1));band.style.setProperty('--resonance-ms',ms+'ms');
 document.body.append(band);setTimeout(()=>band.remove(),ms+80);
}
// Wide screens: the battle stage and the command column sit side by side, so both stay in view.
const priorCombat=combat;
combat=function(p,...args){const out=priorCombat(p,...args);try{const stage=p.querySelector('.compact-battle-stage'),cmd=p.querySelector('.battle-command');if(stage&&cmd&&!stage.parentElement.classList.contains('combat-duo')){const duo=el('div','combat-duo');stage.before(duo);duo.append(stage,cmd);}}catch{}return out;};
const priorWindup=CombatFX.windup;
CombatFX.windup=function(frame,effects){const out=priorWindup.call(this,frame,effects);try{cue(frame);}catch{}return out;};
})();
