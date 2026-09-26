/* 장비 장착: compact gear for the current party with hover details. Replaces the 성장·능력치 menu. Load last. */
(function(){'use strict';
const SLOTS=[['WEAPON','무기'],['ARMOR','방어구'],['ACCESSORY','장신구'],['SPECIAL','특수 장비']];
const STATS=[['공격력','atk',''],['방어력','def',''],['최대 HP','maxHp',''],['속도','spd',''],['치명타 확률','crit','%'],['치명타 피해','critDmg','%'],['명중','hit',''],['회피','eva','']];
const ART={ATK:'공격력',DEF:'방어력',MAX_HP:'최대 HP',SPD:'속도',CRIT:'치명타 확률',CRIT_DMG:'치명타 피해',HIT:'명중',EVA:'회피',STATUS_RESIST:'상태 저항'};
const BOOKS={MAT_CHAR_EXP_WANDERER:50,MAT_CHAR_EXP_ADVENTURER:250,MAT_CHAR_EXP_HERO:1000};
const fmt=n=>Number(n||0).toLocaleString('ko-KR',{maximumFractionDigits:1});
let pendingPick=null,lockTimer=null;
const canHover=()=>!!window.matchMedia?.('(hover: hover)').matches;
function presenter(){if(presenterDB!==game.db){itemPresenter=CRPGInventoryPresenter.create(game.db,MANIFEST);presenterDB=game.db;}return itemPresenter;}
function inSlot(owner,category){return game.s.inventory.find(i=>i.equip&&i.equipped&&i.owner===owner&&itemCategory(i)===category)||null;}
function itemLabel(inv,d){return d.name+(inv.enhance?' +'+inv.enhance:'');}
function artifactLine(inv){const a=inv?.artifact;if(!a)return '';const st=game.artifactStats?.(inv)||a.stats||{};return '성유물 '+a.grade+' · 품질 '+a.quality+'/1000 · +'+a.level+' · '+Object.entries(st).filter(([,v])=>v).map(([k,v])=>(ART[k]||k)+' +'+fmt(v)+(k==='CRIT'||k==='CRIT_DMG'?'%':'')).join(' · ');}
function tooltip(inv,d){
 const tip=el('div','gear-tip');tip.setAttribute('role','tooltip');tip.append(el('strong','',itemLabel(inv,d)),el('small','muted',d.category+(d.minimumLevel?' · 장착 Lv. '+d.minimumLevel+' 이상':'')));
 const stats=(d.stats||[]).map(s=>s.label+' '+(s.value>=0?'+':'')+fmt(s.value)+(s.unit||'')).join(' · ');if(stats)tip.append(el('p','gear-tip-stats',stats));
 const art=artifactLine(inv);if(art)tip.append(el('p','gear-tip-stats',art));if(d.effect&&d.effect!=='없음')tip.append(el('p','',d.effect));
 if(inv.equipped)tip.append(el('small','muted',ownerName(inv.owner)+' 장착 중'));return tip;
}
// Touch screens have no hover, so the picker also prints the effect under the name there.
function effectNote(inv,d){const text=[artifactLine(inv),d.effect&&d.effect!=='없음'?d.effect:''].filter(Boolean).join(' · ');return text?el('small','gear-effect',text):'';}
function deltaLine(before,after){return STATS.map(([label,key,unit])=>{const d=Math.round(((after?.[key]||0)-(before?.[key]||0))*10)/10;return d?label+' '+(d>0?'+':'')+fmt(d)+unit:'';}).filter(Boolean).join(' · ');}
function memberCard(id){
 const growth=game.growth(id),actor=game.s.runtime?.actors.find(a=>a.source===id)||(id==='PLAYER_CUSTOM'?game.player():game.character(id)),bonus=game.equipmentContribution?.(id)?.bonus||{};
 const card=el('section','card gear-member'),head=el('div','gear-member-head'),copy=el('div','gear-member-copy');card.dataset.owner=id;
 copy.append(el('h2','',growth.name),el('small','muted','Lv. '+growth.level+(growth.max?' · 최대 레벨':' · 다음 레벨까지 경험치 '+fmt(growth.remaining))));meter(copy,'HP',Math.round(actor.hp),Math.round(actor.maxHp));
 head.append(actorPortrait(id,'gear-portrait'),copy);card.append(head);
 const slots=el('div','gear-slots');
 for(const [category,label]of SLOTS){
  const inv=inSlot(id,category),cell=el('div','gear-cell'),b=button('',()=>openPicker(id,category));b.className='gear-slot'+(inv?'':' empty');b.dataset.category=category;
  if(inv){const d=presenter().itemDetail(inv);b.setAttribute('aria-label',label+' · '+itemLabel(inv,d)+' · 바꾸기');b.append(itemGlyph(d),el('small','',label),el('strong','',itemLabel(inv,d)));cell.append(b,tooltip(inv,d));}
  else{b.setAttribute('aria-label',label+' · 비어 있음 · 장착하기');b.append(el('span','gear-empty-mark','+'),el('small','',label),el('strong','','비어 있음'));cell.append(b);}
  slots.append(cell);
 }
 card.append(slots);
 const stats=el('dl','gear-stats');for(const [label,key,unit]of STATS){const dd=el('dd','',fmt(actor[key])+unit),plus=Math.round((bonus[key]||0)*10)/10;if(plus)dd.append(el('span',plus>0?'stat-up':'stat-down',' '+(plus>0?'+':'')+fmt(plus)));stats.append(el('dt','',label),dd);}
 card.append(stats);return card;
}
function openPicker(owner,category){
 const label=SLOTS.find(s=>s[0]===category)[1],current=inSlot(owner,category),box=el('div','gear-picker'),close=()=>document.getElementById('modal').close();
 box.append(el('p','muted',(canHover()?'마우스를 올리면 장비 효과가 보입니다. ':'')+'다른 파티원이 쓰던 장비를 고르면 옮겨서 장착합니다.'));
 const locked=game.actionReason('EQUIP');if(locked)box.append(el('p','phase-note','지금은 확인만 할 수 있습니다. '+locked));
 if(current){const d=presenter().itemDetail(current),row=el('div','gear-current'),copy=el('div','gear-option-copy');copy.append(el('strong','',itemLabel(current,d)+' · 장착 중'),effectNote(current,d));row.append(itemGlyph(d),copy,button('해제',()=>{close();act('UNEQUIP',{slot:current.slot,owner});},busy||!!game.actionReason('UNEQUIP',{slot:current.slot,owner})));box.append(row);}
 const options=game.s.inventory.filter(i=>i.equip&&itemCategory(i)===category&&!(i.equipped&&i.owner===owner)).map(inv=>{const preview=game.equipmentPreview(inv.slot,owner);return {inv,d:presenter().itemDetail(inv),preview,reason:preview.reason||game.actionReason('EQUIP',{slot:inv.slot,owner})};})
  .sort((a,b)=>Number(!!a.reason)-Number(!!b.reason)||Number(a.inv.equipped)-Number(b.inv.equipped)||a.d.name.localeCompare(b.d.name,'ko'));
 const list=el('div','gear-options');
 for(const o of options){
  const cell=el('div','gear-cell'),row=el('div','gear-option'+(o.reason?' blocked':'')),copy=el('div','gear-option-copy');
  copy.append(el('strong','',itemLabel(o.inv,o.d)),el('small','muted',o.inv.equipped?ownerName(o.inv.owner)+' 장착 중 · 옮겨서 장착':'보관 중'));
  if(!o.preview.reason){const delta=deltaLine(o.preview.before,o.preview.after);copy.append(el('small','gear-delta',delta||'능력치 변화 없음'));}
  copy.append(effectNote(o.inv,o.d));if(o.reason)copy.append(el('small','choice-note',o.reason));
  row.append(itemGlyph(o.d),copy,button('장착',()=>{close();act('EQUIP',{slot:o.inv.slot,owner});},busy||!!o.reason,true));cell.append(row,tooltip(o.inv,o.d));list.append(cell);
 }
 if(!options.length)list.append(el('p','empty','바꿔 낄 '+label+'가 없습니다. 상점이나 제작 시설에서 구할 수 있습니다.'));
 box.append(list);showModal(ownerName(owner)+' · '+label,box);
}
function books(p){
 const owners=game.s.party.filter(x=>x.active).map(x=>x.source),rows=Object.keys(BOOKS).filter(id=>game.itemCount(id));if(!rows.length)return;
 const box=el('section','gear-books');box.append(el('h2','','경험치 책'));
 for(const id of rows){const row=el('div','gear-book');row.append(el('strong','',safeName('14_ITEM_DB',id)+' · '+game.itemCount(id)+'개'),el('small','muted','1개당 경험치 '+fmt(BOOKS[id])));
  for(const owner of owners){const g=game.growth(owner),b=actionButton(g.name,'USE_ITEM',{item:id,quantity:1,owner});if(g.max){b.disabled=true;b.title='최대 레벨입니다.';}row.append(b);}box.append(row);}
 p.append(box);
}
growthScreen=function(p){
 p.classList.add('gear-screen');p.append(el('div','eyebrow','EQUIPMENT'),el('h1','','장비 장착'),el('p','muted','편성된 파티원의 장비와 능력치입니다. 칸을 누르면 장비를 바꾸고'+(canHover()?', 마우스를 올리면 효과가 보입니다.':' 효과를 확인할 수 있습니다.')+' 편성에서 빠진 동료의 장비는 소지품으로 돌아갑니다.'));
 const locked=game.actionReason('EQUIP');if(locked)p.append(el('p','phase-note','지금은 장비를 확인만 할 수 있습니다. '+locked));
 const grid=el('div','gear-members');for(const id of game.s.party.filter(x=>x.active).map(x=>x.source))grid.append(memberCard(id));p.append(grid);
 books(p);
 const links=el('div','row gear-links');links.append(actionButton('편성 바꾸기','MENU',{screen:'PARTY'}));if(window.openEquipmentHelp)links.append(button('장비 사용법',()=>window.openEquipmentHelp()));p.append(links);
 p.append(actionButton(game.s.runtime?'전투로 돌아가기':'이야기로 돌아가기','MENU',{screen:game.s.runtime&&!game.s.runtime.interlude?'COMBAT':'STORY'},true));
 if(pendingPick){const x=pendingPick;pendingPick=null;queueMicrotask(()=>openPicker(x.owner,x.category));}
};
// Other screens open the gear screen with one item's slot already chosen.
window.openGear=function(slot,owner){
 const inv=game?.s.inventory.find(i=>i.slot===slot&&i.equip);if(!inv)return act('MENU',{screen:'STATUS'});
 const party=game.s.party.filter(x=>x.active).map(x=>x.source);pendingPick={owner:party.includes(owner)?owner:inv.equipped&&party.includes(inv.owner)?inv.owner:'PLAYER_CUSTOM',category:itemCategory(inv)};
 return act('MENU',{screen:'STATUS'});
};
const gearSidebar=sidebar;
sidebar=function(g,v){
 const side=gearSidebar(g,v),b=side.querySelector('nav [data-screen="STATUS"]');
 if(b){const spans=b.querySelectorAll('span');if(spans[0])spans[0].textContent='⚔';if(spans[1])spans[1].textContent='장비 장착';b.setAttribute('aria-label','장비 장착');}
 const left=game?.defeatLockRemaining?.()||0,note=side.querySelector('.phase-note');
 if(left>0&&note){note.replaceChildren(document.createTextNode('패배 후 회복 중 · '));const t=el('strong','',Math.ceil(left/1000)+'초');t.dataset.defeatCountdown='1';note.append(t);}
 return side;
};
function countdown(parent,text){const left=game.defeatLockRemaining?.()||0;if(left<=0)return;const line=el('p','defeat-wait');line.append(document.createTextNode(text+' '));const t=el('strong','',Math.ceil(left/1000)+'초');t.dataset.defeatCountdown='1';line.append(t);parent.append(line);}
recoveryCard=function(parent){
 const penalty=game.s.defeatPenalty,c=el('section','card recovery-card');c.append(el('h2','','전투불능'));
 if(penalty)c.append(el('p','defeat-penalty','전투에서 패배해 모라를 '+fmt(penalty.mora)+' 잃었습니다.'));
 countdown(c,'정신을 차리는 중입니다. 다시 움직일 수 있을 때까지');
 c.append(el('p','','회복하면 파티의 HP가 복구되고 1시간이 지납니다.'),actionButton('회복하고 다시 출발','RECOVER',{},true));parent.append(c);
};
const gearReward=reward;
reward=function(p){
 gearReward(p);const r=parseUI(game.s.global.LAST_BATTLE_RESULT_JSON),anchor=p.querySelector('h1')?.nextSibling||null;
 if(r.protagonistRevived)p.insertBefore(el('p','revive-note',withJosa(game.s.global.PLAYER_NAME,'은','는')+' 쓰러졌지만 동료들이 전투에서 이겼습니다. HP '+fmt(r.protagonistRevived)+'으로 다시 일어났습니다.'),anchor);
 if(r.defeatPenalty&&game.s.defeatPenalty&&!p.querySelector('.recovery-card')){const box=el('section','card defeat-card');box.append(el('p','defeat-penalty','패배로 모라를 '+fmt(r.defeatPenalty.mora)+' 잃었습니다.'));countdown(box,'다시 도전하거나 회복할 수 있을 때까지');p.insertBefore(box,anchor);}
};
function tick(){const left=game?.defeatLockRemaining?.()||0;for(const n of document.querySelectorAll('[data-defeat-countdown]'))n.textContent=Math.ceil(left/1000)+'초';if(left<=0){clearInterval(lockTimer);lockTimer=null;render();}}
const gearRender=render;
render=function(){gearRender();if(!lockTimer&&(game?.defeatLockRemaining?.()||0)>0)lockTimer=setInterval(tick,1000);};
})();
