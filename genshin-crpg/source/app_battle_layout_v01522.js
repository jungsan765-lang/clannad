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
 fitFighters();watchChips(p);
}
// 0.16.41 (user: 「전투하면서 버프량이 많아지거나 버프 이름이 길어지면 파티가 위아래로 너무 길어져서 상태도 안보이고 그래」, then
// 「버프가 한개만 있으면 그건 좀」): a fighter's effects take at most two lines on its card — as many as fit, then 「+N」 (or
// 「효과 N」 when not even one fits). The lines are the button that lists them all (battleStatusDetails), so a card grows by
// one line at most however many effects it carries. Where even that leaves no room (a full party with many effects on the
// 1280×720 page) that side goes back to one line (data-chip-lines, fitFighters).
const CHIP_LINES=2;
function fitChips(scope=document){
 for(const row of scope.querySelectorAll('.combatant-copy>.status-chips')){
  const most=Number(row.closest('[data-chip-lines]')?.dataset.chipLines)||CHIP_LINES;
  row.querySelector(':scope>.st-more')?.remove();const chips=[...row.querySelectorAll(':scope>.st-chip')];for(const c of chips)c.hidden=false;
  const over=()=>{const shown=[...row.children].filter(c=>!c.hidden);if(!shown.length)return false;const edge=row.getBoundingClientRect().right+.5,boxes=shown.map(c=>c.getBoundingClientRect());
   if(boxes.some(b=>b.right>edge))return true;let lines=1;const tops=boxes.map(b=>b.top).sort((a,b)=>a-b);for(let i=1;i<tops.length;i++)if(tops[i]-tops[i-1]>4)lines++;return lines>most;};
  if(!chips.length||!over())continue;
  const more=el('span','st-chip st-more');row.append(more);let shown=chips.length;
  while(shown>0){chips[--shown].hidden=true;more.textContent='+'+(chips.length-shown);if(!over())break;}
  if(!shown)more.textContent='효과 '+chips.length;
 }
}
// The playback adds an effect to a card as its blow lands (app_battle_fx_v01521.js liveStatus): fit that line again.
let chipWatch=null,chipFrame=0;
function watchChips(p){
 chipWatch?.disconnect();
 // Only ever tightens while a round plays (loosening would make the cards jump under the blows).
 const fit=()=>{chipFrame=0;if(!p.isConnected)return;fitChips(p);const floor=floorOf(p);roomForParty(p.querySelector('.shell-allies'),floor);roomForEnemies(p.querySelector('.shell-enemies'),floor);chipWatch?.takeRecords();};
 chipWatch=new MutationObserver(list=>{if(!chipFrame&&list.some(m=>m.target.classList?.contains('status-chips')||[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches('.status-chips,.combatant-row')||n.querySelector('.status-chips')))))chipFrame=requestAnimationFrame(fit);});
 chipWatch.observe(p,{childList:true,subtree:true});
}
// 0.16.3 (user: 「내가 휴대폰으로 했을 때 저런식으로 몬스터 체력도 가리고 좀 불편해」): on a sideways phone the enemy pictures took their
// height from the window height minus a fixed allowance, so a taller heading or a full party on another phone pushed the
// names, HP and HP bars under the commands. The pictures now shrink to the room really left above the commands, and a
// party that does not fit tightens its rows, so every name and HP bar stays in view.
// 0.16.41: on every screen. A phone draws the 1280×720 page now (index.html), and the question 「is the phone held sideways」
// asked inside the frame went to the phone itself, so the fitting no longer asks it.
function floorOf(p){
 // 0.16.41: on every screen (the pictures of one to four enemies grew with the room, so the room is measured everywhere):
 // the floor is the commands or the board's own bottom, whichever is higher.
 const c=p.querySelector('.combat-duo>.battle-command')?.getBoundingClientRect(),board=p.querySelector('.compact-battle-stage')?.getBoundingClientRect();
 return Math.min(c&&c.height?c.top:p.getBoundingClientRect().bottom,board&&board.height?board.bottom:Infinity)-4;
}
const partyOver=(allies,floor)=>{const last=allies?.querySelector(':scope>.combatant-row:last-of-type');return !!last&&last.getBoundingClientRect().bottom>floor;};
const enemiesOver=(enemies,floor)=>{const cards=[...(enemies?.querySelectorAll(':scope>.combatant-row')||[])];return !!cards.length&&Math.max(...cards.map(r=>r.getBoundingClientRect().bottom))>floor;};
// The party first: its column sets the height of the row the enemy cards are centred in. Its rows tighten (the 「1번 · 전열」
// tag goes before any effect does), then its effects go back to one line, then the rows tighten once more.
function roomForParty(allies,floor){
 if(!partyOver(allies,floor))return;
 allies.classList.add('tight');if(!partyOver(allies,floor))return;
 if(allies.dataset.chipLines!=='1'){allies.dataset.chipLines='1';fitChips(allies);}
 if(partyOver(allies,floor))allies.classList.add('tighter');
}
// The enemies: their pictures give up a quarter first, then their effects go back to one line, then the pictures shrink on.
function roomForEnemies(enemies,floor){
 if(!enemiesOver(enemies,floor))return;
 const pic=enemies.querySelector(':scope>.combatant-row .combat-portrait');shrinkEnemies(enemies,floor,pic?Math.round(pic.offsetHeight*.75):0);
 if(!enemiesOver(enemies,floor))return;
 if(enemies.dataset.chipLines!=='1'){enemies.dataset.chipLines='1';fitChips(enemies);}
 shrinkEnemies(enemies,floor);
}
function fitFighters(){
 const p=document.querySelector('.combat-panel');if(!p)return;const enemies=p.querySelector('.shell-enemies'),allies=p.querySelector('.shell-allies');
 enemies?.style.removeProperty('--enemy-h');allies?.classList.remove('tight','tighter');if(allies)delete allies.dataset.chipLines;if(enemies)delete enemies.dataset.chipLines;
 fitChips(p);const floor=floorOf(p);
 roomForParty(allies,floor);roomForEnemies(enemies,floor);
}
// Shrink the pictures by what still runs past the floor (centred cards move as they shrink, so measure again).
function shrinkEnemies(enemies,floor,least=0){
 const cards=[...(enemies?.querySelectorAll(':scope>.combatant-row')||[])],pic=cards[0]?.querySelector('.combat-portrait');
 if(pic){const lines=Number(enemies.dataset.rows)||1;for(let i=0;i<6;i++){const over=Math.max(...cards.map(r=>r.getBoundingClientRect().bottom))-floor;if(over<=0)break;const h=Math.max(lines>1?24:36,least,pic.offsetHeight-Math.ceil(over/lines)-1);if(h>=pic.offsetHeight)break;enemies.style.setProperty('--enemy-h',h+'px');}}
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
addEventListener('resize',()=>{try{fitFighters();fitPlayback();}catch{}});
window.CRPGBattleLayout={fitPlayback,fitFighters,fitChips};
})();
