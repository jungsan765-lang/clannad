/* Battle layout. 0.15.24 (user, 2026-10-06 13:25: 「0.15.22 이전에 쓰던 전투 구도를 선호한다 … 원래 구도와 그림 비율을 유지」, and the
 * hand-over docs/handoffs/UI_INSTALLED_LANDSCAPE_KO.md): the 0.15.22 fixed 1180×700 board scaled as one picture is gone.
 * The 0.15.21 composition stays — enemies in the middle with their big pictures, the party down the right, the
 * commands along the bottom — and space goes to the fighters that are actually there:
 * - up to 8 enemies in at most two rows (1–4: one row; 5–8: two), the cards growing or shrinking with the count;
 * - 아군 소환체 / 적 소환체 each in its own strip, only while a side has one (at most 3 each);
 * - the battle screen fits the window, so a fight never scrolls the page;
 * - the battle record and the extra battle notes open in windows from the heading.
 * View-only: no rule, action or save changes here. */
(function(){
'use strict';
const previousSummons=battleSummons;
// Enemy summons that are fighters (a field boss's summons) join the existing summon strips; no strip for a side with none.
battleSummons=function(stage,b){
 previousSummons(stage,b);
 const cards=game.combatCards?.()||[],chosen=cards.find(c=>c.id===selectedCard),fighters=b.actors.filter(a=>a.fbSummon&&a.hp>0);if(!fighters.length)return;
 let wrap=stage.querySelector('.battle-summons');if(!wrap){wrap=el('div','battle-summons top');wrap.setAttribute('aria-label','전투 소환물');stage.prepend(wrap);}
 for(const side of ['ALLY','ENEMY']){
  const list=fighters.filter(a=>a.side===side);if(!list.length)continue;
  let lane=wrap.querySelector('.summon-lane.'+side.toLowerCase());if(!lane){lane=el('section','summon-lane '+side.toLowerCase());lane.append(el('h3','',side==='ALLY'?'아군 소환체':'적 소환체'));wrap.append(lane);}
  for(const a of list){const row=battleActorRow(a,chosen,0);row.classList.add('battle-summon','summon-actor');row.dataset.summonId=a.id;lane.append(row);}
 }
};
function objectiveLine(b){
 const line=el('div','battle-objective-strip');
 if(b.liyueObjective){const o=b.liyueObjective;line.append(el('strong','','진법 HP '+Math.max(0,Math.round(o.hp))+' / '+o.maxHp),el('span','','충전 '+o.charge+' / '+o.target));}
 else if(b.fieldObjective){const o=b.fieldObjective;line.append(el('strong','',o.kind==='DESTROY'?'구조물 파괴':o.kind==='BATTLE'?'습격자 제압':'보호 대상 '+o.integrity+' / '+o.maxIntegrity));}
 else if(b.fieldBoss){const hint=game.fieldBossView?.()?.hint||b.fieldBoss.telegraph?.name;if(hint)line.append(el('span','',hint));}
 if(b.enemyReserve?.length)line.append(el('small','','증원 대기 '+b.enemyReserve.length));
 if(b.terrain!==null&&b.terrain!==undefined)line.append(el('small','','지형 '+b.terrain+' / '+(b.terrainMax||4)));
 return line.childElementCount?line:null;
}
function layout(){
 const p=document.querySelector('.combat-panel');document.body.classList.toggle('battle-screen',!!p);if(!p)return;
 const b=game.s.runtime;if(!b)return;const head=p.querySelector('.battle-heading');
 // Count-based enemy grid (CSS reads data-count): the cards share the width the fighters really need.
 const enemies=p.querySelector('.shell-enemies');if(enemies){const n=enemies.querySelectorAll(':scope > .combatant-row').length;enemies.dataset.count=String(n);enemies.dataset.rows=n>4?'2':'1';enemies.style.setProperty('--cols',String(n>4?Math.ceil(n/2):Math.max(1,n)));}
 const allies=p.querySelector('.shell-allies');if(allies)allies.dataset.count=String(allies.querySelectorAll(':scope > .combatant-row').length);
 // 0.15.25: the objective (증원 대기, 진법 HP…) sits in the heading row after the title; as a row of its own it took a whole
 // line from the fighters on a short screen.
 const line=objectiveLine(b);if(line&&head){const title=head.querySelector('h1');if(title)title.after(line);else head.append(line);}
 const details=p.querySelector('.battle-details');if(details&&head){details.hidden=true;const rec=button('기록',()=>{const box=details.querySelector('.log').cloneNode(true);showModal('전투 기록',box);});rec.className='battle-head-button';rec.title='전투 기록 '+b.log.length+'건';head.append(rec);}
 const info=p.querySelector('.shell-battle-info');if(info&&head){info.hidden=true;const n=info.querySelector('.shell-battle-info-body')?.childElementCount||0;const more=button('전투 정보'+(n?' '+n:''),()=>{const box=info.querySelector('.shell-battle-info-body').cloneNode(true);showModal('전투 정보',box);});more.className='battle-head-button';head.append(more);}
}
const previousRender=render;render=function(){previousRender();renderTutorial();layout();};
// 0.15.25 (the GitHub check tests/test_online_browser.mjs 「playback controls occupy the reserved command area」 failed
// since 0.15.24, which dropped 0.15.23's fitting along with the fixed board): the playback band lies exactly on the
// command area it replaces, and that area keeps its height while the round plays, so the fighters above do not jump and
// the band never covers them. app_av.js builds the band in <body> and empties the commands when play() starts.
let reserved=0,following=0;
const SIDES=['left','top','right','bottom','width','height','transform'];
function fitPlayback(){
 const dock=GameEffects.dock;if(!dock?.isConnected)return;
 const command=document.querySelector('.combat-panel .battle-command');
 // At the end of a fight app_av.js hides the commands: the band goes back to its own place along the bottom.
 if(!command||command.hidden||!command.getClientRects().length){if(dock.classList.contains('command-docked')){dock.classList.remove('command-docked');delete dock.dataset.fit;for(const k of SIDES)dock.style[k]='';}return;}
 if(reserved&&command.offsetHeight<reserved)command.style.minHeight=reserved+'px';
 const r=command.getBoundingClientRect(),key=[r.left,r.top,r.width,r.height].map(v=>Math.round(v)).join(',');if(dock.dataset.fit===key)return;
 dock.dataset.fit=key;dock.classList.add('command-docked');
 Object.assign(dock.style,{left:r.left+'px',top:r.top+'px',right:'auto',bottom:'auto',width:r.width+'px',height:r.height+'px',transform:'none'});
}
// Follow the area while the band is up (a new round redraws the order above it; the window can change size).
function followDock(){
 if(following)return;
 const step=()=>{if(!GameEffects.dock?.isConnected){following=0;reserved=0;const c=document.querySelector('.combat-panel .battle-command');if(c)c.style.minHeight='';return;}fitPlayback();following=requestAnimationFrame(step);};
 fitPlayback();following=requestAnimationFrame(step);
}
if(typeof GameEffects!=='undefined'&&typeof GameEffects.play==='function'){const priorPlay=GameEffects.play;GameEffects.play=function(...args){const c=document.querySelector('.combat-panel .battle-command');reserved=c?.offsetHeight||0;const out=priorPlay.apply(this,args);try{followDock();}catch(e){console.error('[battle layout]',e);}return out;};}
addEventListener('resize',()=>{try{fitPlayback();}catch{}});
window.CRPGBattleLayout={fitPlayback};
})();
