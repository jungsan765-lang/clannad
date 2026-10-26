/* 0.14.11 편성: the party cards are the battle line. They stand in battle order with their position (1·2 전열,
 * 3·4 후열) and are rearranged by pressing and holding a card, then dragging it onto another (the separate 전투 대열
 * list with ▲▼ buttons is gone). Above them, six 프리셋 keep whole loadouts (members, order, roles, 진형, equipment)
 * to switch to before a fight; the same presets can be applied from battle preparation. Load after app_party.js.
 * 0.15.2: every card has ◀ ▶ to trade places with its neighbour, and a finger no longer drags cards: on a phone the
 * cards stand side by side to swipe through, and a finger on a card scrolls (user: 「편성부분은 드래그로 내려야해서
 * 내리기가 힘들어. 그냥 옆으로 옮기는 방식이라던가」). A mouse can still drag. */
(function(){
'use strict';
if(typeof partyScreen!=='function')return;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const $=(sel,root=document)=>root.querySelector(sel),$$=(sel,root=document)=>[...root.querySelectorAll(sel)];
const LINE=['1 · 선두 · 전열','2 · 전열 · 치명타 확률 +5%','3 · 후열 · 최대 HP +5%','4 · 후미 · 받는 최종 피해 −20%'];
const UI={preset:null,naming:false,swapFrom:null};
// The old battle-line list: its job is done by the cards themselves now.
formationLine=function(){};
function nameOf(id){try{return ownerName(id);}catch{return id;}}
function presetBar(p,{compact=false}={}){
 if(!game.presetList)return null;const list=game.presetList(),box=mk('section','card shell-presets'+(compact?' compact':''));
 box.append(mk('h2','','편성 프리셋'),mk('p','muted shell-presets-help',compact?'저장해 둔 편성으로 바로 바꿀 수 있습니다.':'지금의 동료·전투 대열·역할·진형·장비를 칸에 저장해 두고, 상대에 맞춰 한 번에 바꿉니다.'));
 const chips=mk('div','shell-preset-chips');
 for(const x of list){
  const b=mk('button','shell-preset-chip'+(x.empty?' empty':'')+(UI.preset===x.slot?' active':''));b.type='button';b.setAttribute('aria-pressed',String(UI.preset===x.slot));
  b.append(mk('small','',String(x.slot)),mk('strong','',x.empty?'빈 칸':x.name));
  if(!x.empty){const faces=mk('span','shell-preset-faces');for(const id of x.members){try{faces.append(actorPortrait(id,'shell-preset-face'));}catch{faces.append(mk('span','shell-preset-face',nameOf(id).slice(0,1)));}}b.append(faces);}
  b.onclick=()=>{UI.preset=UI.preset===x.slot?null:x.slot;UI.naming=false;render();};chips.append(b);
 }
 box.append(chips);
 const x=list.find(e=>e.slot===UI.preset);
 if(x){
  const detail=mk('div','shell-preset-detail');
  if(!x.empty){detail.append(mk('p','shell-preset-members',x.members.map(nameOf).join(' → ')));const gear=Object.values(x.gear||{}).reduce((n,l)=>n+l.length,0);detail.append(mk('small','muted','장비 '+gear+'개'+(x.formation?' · 진형 '+(window.CRPGRuntime?.formationConfig?.formations?.[x.formation]?.name||x.formation):'')+' · '+x.day+'일차에 저장'));}
  const row=mk('div','row shell-preset-actions');
  if(!x.empty)row.append(actionButton('이 프리셋으로 바꾸기','PRESET_APPLY',{slot:x.slot},true));
  if(!compact){
   row.append(actionButton(x.empty?'지금 편성 저장':'지금 편성으로 덮어쓰기','PRESET_SAVE',{slot:x.slot}));
   if(!x.empty){const rename=button('이름 바꾸기',()=>{UI.naming=!UI.naming;render();},busy);row.append(rename,actionButton('삭제','PRESET_DELETE',{slot:x.slot}));}
  }
  detail.append(row);
  if(UI.naming&&!compact&&!x.empty){const form=mk('form','shell-preset-name'),input=mk('input');input.maxLength=window.CRPGRuntime?.presetsV01411?.nameMax||16;input.value=x.name;input.setAttribute('aria-label','프리셋 이름');const save=mk('button','primary','이름 저장');save.type='submit';form.append(input,save);form.onsubmit=e=>{e.preventDefault();UI.naming=false;act('PRESET_SAVE',{slot:x.slot,name:input.value});};detail.append(form);setTimeout(()=>input.focus(),0);}
  box.append(detail);
 }
 return box;
}
// Cards in battle order, each with its position; press, hold and drag one onto another to swap their places.
function battleLine(p){
 const grid=$('.formation-grid',p);if(!grid)return;
 const cards=[...grid.children],order=game.formationOrder?game.formationOrder():[];
 cards.forEach((c,i)=>{const n=i+1,m=game.s.party.find(x=>x.slot==='PARTY_'+n&&x.active);c.dataset.partySlot=String(n);if(m)c.dataset.owner=m.source;});
 const members=cards.filter(c=>c.dataset.owner).sort((a,b)=>order.indexOf(a.dataset.owner)-order.indexOf(b.dataset.owner)),empty=cards.filter(c=>!c.dataset.owner);
 grid.replaceChildren(...members,...empty);grid.classList.add('shell-battle-line');
 // 0.16.29: the card's label is its place (「2 · 전열」); the place's bonus is a second small line, so a long bonus never
 // wraps the label onto two lines and pushes the card's buttons past its bottom.
 members.forEach((c,i)=>{const label=$('.slot-label',c);if(label){const parts=String(LINE[i]||String(i+1)).split(' · ');label.textContent=parts.slice(0,2).join(' · ');label.title=LINE[i]||'';label.classList.add(i<2?'front':'back');if(parts[2]&&!/^(전열|후열)$/.test(parts[2])){const bonus=mk('small','slot-bonus',parts.slice(2).join(' · '));(c.querySelector('.member-select')||label).after(bonus);}}});
 const locked=game.actionReason('FORMATION_SET',{order});
 const help=mk('p','muted shell-line-help',locked?'지금은 전투 대열을 바꿀 수 없습니다 · '+locked:'자리 이름을 누른 뒤 바꿀 동료의 자리 이름을 누르면 두 동료가 자리를 바꿉니다. 1·2번은 전열, 3·4번은 후열입니다.');grid.before(help);
 // 0.16.29 (user: 「◀▶이거 다 없애버려. 차라리 다른 버튼으로 두던가 … 센스있는거 없어?」): no arrows. Press a card's place
 // (「2 · 전열」), then the place of the companion to trade with: the two trade places at once, at any distance. Pressing the
 // first place again lets it go. A mouse can still drag a card onto another.
 const swapWith=(from,to)=>{const x=order.indexOf(from),y=order.indexOf(to);if(x<0||y<0||x===y)return;const next=order.slice();[next[x],next[y]]=[next[y],next[x]];UI.swapFrom=null;act('FORMATION_SET',{order:next});};
 if(!members.some(c=>c.dataset.owner===UI.swapFrom))UI.swapFrom=null;
 // While one place is held, its button says so and every other place says it can take it.
 const mark=()=>{for(const c of members){const from=c.dataset.owner===UI.swapFrom,to=!!UI.swapFrom&&!from;c.classList.toggle('swap-from',from);c.classList.toggle('swap-to',to);const b=$('.shell-line-place',c);if(!b)continue;b.setAttribute('aria-pressed',String(from));b.textContent=from?'바꿀 자리 고르기':to?'여기와 바꾸기':b.dataset.place;}};
 members.forEach(c=>{
  const label=$('.slot-label',c),head=mk('div','shell-line-head'),place=mk('button','shell-line-place'+(label?.classList.contains('back')?' back':' front'));place.type='button';
  place.textContent=place.dataset.place=label?.textContent||'';place.title=(label?.title||place.textContent)+' · 눌러서 다른 동료와 자리 바꾸기';place.setAttribute('aria-label',place.textContent+' · 자리 바꾸기');
  if(locked||busy||members.length<2){place.disabled=true;if(locked)withReason(place,locked);}
  place.onclick=e=>{e.stopPropagation();const me=c.dataset.owner;if(!UI.swapFrom||UI.swapFrom===me){UI.swapFrom=UI.swapFrom===me?null:me;window.CRPGSound?.play?.('tab');mark();return;}swapWith(UI.swapFrom,me);};
  // On a phone (user: 「폰은 편성도 ◀ ▶ 버튼을 좀 넓게 해서 누르기 편하게 편성을 바꿀 수 있게 해도 좋을듯?」) wide ◀ ▶ beside the
  // place trade with the neighbour in one press; the computer screen hides them (screen_v01629.css).
  const i=members.indexOf(c),move=(text,to,name)=>{const b=mk('button','shell-line-move',text);b.type='button';b.setAttribute('aria-label',name);const why=locked||(to<0||to>=members.length?(to<0?'이미 맨 앞입니다.':'이미 맨 뒤입니다.'):'');if(why||busy){b.disabled=true;if(why)withReason(b,why);}b.onclick=e=>{e.stopPropagation();swapWith(c.dataset.owner,members[to].dataset.owner);};return b;};
  label?.remove();head.append(move('◀',i-1,'앞 자리와 바꾸기'),place,move('▶',i+1,'뒷 자리와 바꾸기'));c.prepend(head);
 });
 mark();
 if(locked||members.length<2)return;
 for(const card of members){
  card.classList.add('shell-draggable');
  // The portrait is an image: without this the browser starts its own image drag and cancels ours.
  card.addEventListener('dragstart',e=>e.preventDefault());for(const img of $$('img',card))img.draggable=false;
  card.addEventListener('pointerdown',e=>{
   // a finger scrolls (◀ ▶ move the cards); a mouse or pen may drag
   if(e.pointerType==='touch'||e.button!==0||busy||e.target.closest('select,input,.formation-controls button,.shell-line-place'))return;
   const start={x:e.clientX,y:e.clientY};let dragging=false,target=null;
   const hold=setTimeout(()=>{dragging=true;card.classList.add('dragging');try{card.setPointerCapture(e.pointerId);}catch{}window.CRPGSound?.play?.('tab');},220);
   const move=ev=>{
    if(!dragging){if(Math.hypot(ev.clientX-start.x,ev.clientY-start.y)>8)clearTimeout(hold);return;}
    ev.preventDefault();card.style.transform='translate('+(ev.clientX-start.x)+'px,'+(ev.clientY-start.y)+'px) scale(1.03)';
    card.style.pointerEvents='none';const under=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.shell-battle-line > [data-owner]');card.style.pointerEvents='';
    if(target!==under){target?.classList.remove('drop-target');target=under&&under!==card?under:null;target?.classList.add('drop-target');}
   };
   const end=()=>{clearTimeout(hold);card.removeEventListener('pointermove',move);card.removeEventListener('pointerup',end);card.removeEventListener('pointercancel',end);
    if(!dragging)return;card.classList.remove('dragging');card.style.transform='';target?.classList.remove('drop-target');
    // A drag never counts as a click on the card underneath.
    const swallow=ev=>{ev.stopPropagation();ev.preventDefault();};card.addEventListener('click',swallow,{capture:true,once:true});setTimeout(()=>card.removeEventListener('click',swallow,{capture:true}),50);
    if(!target)return;const a=order.indexOf(card.dataset.owner),b=order.indexOf(target.dataset.owner);if(a<0||b<0)return;const next=order.slice();[next[a],next[b]]=[next[b],next[a]];act('FORMATION_SET',{order:next});};
   card.addEventListener('pointermove',move);card.addEventListener('pointerup',end);card.addEventListener('pointercancel',end);
  });
 }
}
const prior=partyScreen;
partyScreen=function(p){
 prior(p);
 try{battleLine(p);const bar=presetBar(p);if(bar){const head=$('h2',p);(head||p.firstChild)?.before(bar);}const intro=$$('p.muted',p).find(x=>/전투 대열/.test(x.textContent));if(intro)intro.textContent='함께 싸울 동료와 전투 대열, 진형, 동료 역할을 정합니다. 동료 칸을 누르면 그림을 보며 바꿀 수 있고, 편성에서 빠져도 동료의 장비는 그대로 남습니다.';}catch(e){console.error('[party]',e);}
};
// Battle preparation: the presets are one press away.
if(typeof battlePrepare==='function'){const priorPrep=battlePrepare;battlePrepare=function(p,...rest){priorPrep(p,...rest);try{if(game.presetList?.().some(x=>!x.empty)){const bar=presetBar(p,{compact:true});if(bar)p.append(bar);}}catch(e){console.error('[party presets]',e);}};}
window.CRPGPresets={ui:UI};
})();
