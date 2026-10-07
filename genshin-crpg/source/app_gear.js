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
function artifactLine(inv){const a=inv?.artifact;if(!a)return '';const st=game.artifactStats?.(inv)||a.stats||{};return '성유물 '+a.grade+' · 품질 '+fmt(a.quality/10)+'% · +'+a.level+' · '+Object.entries(st).filter(([,v])=>v).map(([k,v])=>(ART[k]||k)+' +'+fmt(v)+(k==='CRIT'||k==='CRIT_DMG'?'%':'')).join(' · ');}
function tooltip(inv,d){
 const tip=el('div','gear-tip');if(tip.showPopover)tip.setAttribute('popover','manual');tip.setAttribute('role','tooltip');tip.append(tierMark(el('strong','',itemLabel(inv,d)),d),el('small','muted',[d.tier?.label?d.tier.label+' 등급':'',d.category,d.minimumLevel?'장착 Lv. '+d.minimumLevel+' 이상':''].filter(Boolean).join(' · ')));
 const stats=(d.stats||[]).map(s=>s.label+' '+(s.value>=0?'+':'')+fmt(s.value)+(s.unit||'')).join(' · ');if(stats)tip.append(el('p','gear-tip-stats',stats));
 const art=artifactLine(inv);if(art)tip.append(el('p','gear-tip-stats',art));
 const traits=traitLines(inv);if(traits.length){const list=el('ul','gear-traits');for(const t of traits)list.append(el('li',t.innate?'innate':'',t.text));tip.append(list);}else if(d.effect&&d.effect!=='없음')tip.append(el('p','',d.effect));
 if(inv.equipped)tip.append(el('small','muted',ownerName(inv.owner)+' 장착 중'));return tip;
}
// Battle traits (v0.13.33) replace the flavour text when an item has them.
function traitLines(inv){return game.gearTraitLines?game.gearTraitLines(inv.equip):[];}
function traitShort(inv){return traitLines(inv).filter(t=>!t.innate).map(t=>t.label).join(' · ');}
// Touch screens have no hover, so the picker also prints the effect under the name there.
function effectNote(inv,d){const traits=traitLines(inv).map(t=>t.text).join(' · '),text=[artifactLine(inv),traits||(d.effect&&d.effect!=='없음'?d.effect:'')].filter(Boolean).join(' · ');return text?el('small','gear-effect',text):'';}
function deltaLine(before,after){return STATS.map(([label,key,unit])=>{const d=Math.round(((after?.[key]||0)-(before?.[key]||0))*10)/10;return d?label+' '+(d>0?'+':'')+fmt(d)+unit:'';}).filter(Boolean).join(' · ');}
function memberCard(id,bench=false){
 const growth=game.growth(id),actor=game.s.runtime?.actors.find(a=>a.source===id)||(id==='PLAYER_CUSTOM'?game.player():game.character(id)),bonus=game.equipmentContribution?.(id)?.bonus||{};
 const card=el('section','card gear-member'+(bench?' bench':'')),head=el('div','gear-member-head'),copy=el('div','gear-member-copy');card.dataset.owner=id;if(bench)card.dataset.bench='1';
 // 0.15.21 (user: 「이쪽에도 아이콘 넣자」, then 「딴데서 에셋을 가져오는게 맞지 않아?」): the element's symbol before the name and the
 // weapon kind after it, the original game's pictures (app_icons_v01521.js).
 const name=el('h2','',growth.name),icons=typeof CRPGIcons!=='undefined'?CRPGIcons:null,weapon=icons?.weaponOfCharacter(id)||'';
 const mark=icons?.element(icons.ofCharacter(id),'gear-element'),arm=icons?.weapon(weapon,'gear-weapon-kind');if(mark)name.prepend(mark);if(arm)name.append(arm);
 copy.append(name,el('small','muted','Lv. '+growth.level+(growth.max?' · 최대 레벨':' · 다음 레벨까지 경험치 '+fmt(growth.remaining))));meter(copy,'HP',Math.round(actor.hp),Math.round(actor.maxHp));
 if(game.s.tutorialV2?.loan?.id===id)copy.append(el('small','gear-bench-note','이번 이야기 전투에만 동행합니다'));
 if(bench)copy.append(el('small','gear-bench-note','대기 중 · 편성에 넣으면 이 장비 그대로 싸웁니다'));
 head.append(actorPortrait(id,'gear-portrait'),copy);card.append(head);
 const slots=el('div','gear-slots');
 for(const [category,label]of SLOTS){
  const inv=inSlot(id,category),cell=el('div','gear-cell'),b=button('',()=>openPicker(id,category));b.className='gear-slot'+(inv?'':' empty');b.dataset.category=category;
  if(inv){const d=presenter().itemDetail(inv);b.classList.add('tier-'+(d.tier?.rank||1));{const f=typeof enhanceFrameClass==='function'?enhanceFrameClass(inv.enhance):'';if(f)b.classList.add('enh',f);}b.setAttribute('aria-label',label+' · '+itemLabel(inv,d)+' · 바꾸기');b.append(itemGlyph(d),el('small','',label),tierMark(el('strong','',itemLabel(inv,d)),d));cell.append(b,tooltip(inv,d));}
  // 0.15.21: an empty weapon slot shows the character's weapon kind with a + on it.
  else{b.setAttribute('aria-label',label+' · 비어 있음 · 장착하기');b.title=label+' · 비어 있음';const mark=el('span','gear-empty-mark','+'),pic=category==='WEAPON'?icons?.weapon(weapon||'한손검'):null;if(pic){pic.removeAttribute('role');pic.removeAttribute('aria-label');pic.removeAttribute('title');mark.textContent='';mark.classList.add('with-icon');mark.append(pic,el('i','','+'));}b.append(mark,el('small','',label),el('strong','','비어 있음'));cell.append(b);}
  slots.append(cell);
 }
 card.append(slots);
 const stats=el('dl','gear-stats');for(const [label,key,unit]of STATS){const dd=el('dd','',fmt(actor[key])+unit),plus=Math.round((bonus[key]||0)*10)/10;if(plus)dd.append(el('span',plus>0?'stat-up':'stat-down',' '+(plus>0?'+':'')+fmt(plus)));stats.append(el('dt','',label),dd);}
 card.append(stats);
 const summary=game.traitSummary?.(id)||[];if(summary.length){const chips=el('ul','gear-trait-chips');chips.setAttribute('aria-label','장비 특성');for(const t of summary){const chip=el('li','trait-'+(t.group||''),t.label);chip.title=t.text;chips.append(chip);}card.append(chips);}
 if(game.experienceBookLimit)card.append(bookRow(id));
 return card;
}
function openPicker(owner,category){
 const label=SLOTS.find(s=>s[0]===category)[1],current=inSlot(owner,category),box=el('div','gear-picker'),close=()=>document.getElementById('modal').close();
 box.append(el('p','muted',(canHover()?'마우스를 올리면 장비 효과가 보입니다. ':'')+'다른 캐릭터가 쓰던 장비를 고르면 옮겨서 장착합니다.'));
 const locked=game.actionReason('EQUIP');if(locked)box.append(el('p','phase-note','지금은 확인만 할 수 있습니다. '+locked));
 if(current){const d=presenter().itemDetail(current),row=el('div','gear-current'),copy=el('div','gear-option-copy');copy.append(tierMark(el('strong','',itemLabel(current,d)+' · 장착 중'),d),effectNote(current,d));row.append(itemGlyph(d),copy,button('해제',()=>{close();act('UNEQUIP',{slot:current.slot,owner});},busy||!!game.actionReason('UNEQUIP',{slot:current.slot,owner})));box.append(row);}
 // 0.15.6 (user: 「장비 좋은거랑 자기 전무를 맨 위로 올려서 보여지게 해. 기원 하면서 많이 나오면 장비 찾기도 힘들어」):
 // the character's own exclusive weapon first, then what can be worn now, then by star grade, enhancement and how much
 // it raises the numbers.
 const gain=o=>{const b=o.preview.before,a=o.preview.after;if(o.preview.reason||!a||!b)return -1e9;return (a.atk-b.atk)*2+(a.def-b.def)*1.5+(a.maxHp-b.maxHp)*.1+(a.crit-b.crit)*3+(a.critDmg-b.critDmg)*1.5+(a.spd-b.spd)*2;};
 const options=game.s.inventory.filter(i=>i.equip&&itemCategory(i)===category&&!(i.equipped&&i.owner===owner)).map(inv=>{const preview=game.equipmentPreview(inv.slot,owner);return {inv,d:presenter().itemDetail(inv),preview,own:game.exclusiveOwner?.(inv.equip)===owner,reason:preview.reason||game.actionReason('EQUIP',{slot:inv.slot,owner})};})
  .map(o=>({...o,score:gain(o)}))
  .sort((a,b)=>Number(b.own)-Number(a.own)||Number(!!a.reason)-Number(!!b.reason)||(b.d.tier?.rank||0)-(a.d.tier?.rank||0)||(Number(b.inv.enhance)||0)-(Number(a.inv.enhance)||0)||b.score-a.score||Number(a.inv.equipped)-Number(b.inv.equipped)||a.d.name.localeCompare(b.d.name,'ko'));
 const list=el('div','gear-options');
 for(const o of options){
  const cell=el('div','gear-cell'),row=el('div','gear-option'+(o.reason?' blocked':'')),copy=el('div','gear-option-copy');
  copy.append(tierMark(el('strong','',itemLabel(o.inv,o.d)),o.d),el('small','muted',(o.own?'전용 무기 · ':'')+(o.d.tier?.label?o.d.tier.label+' · ':'')+(o.inv.equipped?ownerName(o.inv.owner)+' 장착 중 · 옮겨서 장착':'보관 중')));
  const short=traitShort(o.inv);if(short)copy.append(el('small','gear-trait-line','특성 · '+short));
  if(!o.preview.reason){const delta=deltaLine(o.preview.before,o.preview.after);copy.append(el('small','gear-delta',delta||'능력치 변화 없음'));}
  copy.append(effectNote(o.inv,o.d));if(o.reason)copy.append(el('small','choice-note',o.reason));
  row.append(itemGlyph(o.d),copy,button('장착',()=>{close();act('EQUIP',{slot:o.inv.slot,owner});},busy||!!o.reason,true));cell.append(row,tooltip(o.inv,o.d));list.append(cell);
 }
 if(!options.length)list.append(el('p','empty','바꿔 낄 '+label+'이(가) 없습니다. 상점이나 제작 시설에서 구할 수 있습니다.'));
 box.append(list);showModal(ownerName(owner)+' · '+label,box);
}
// 0.16.7 (user: 「경험치책, 캐릭터 많으면 너무 복잡해지니까 캐릭터마다 경험치 책 사용을 만들어두는게 좋아보인다. 오른쪽에꺼 지우고.」):
// each member uses its own books — a picture per kind with how many are held, and 「1개」 · 「레벨 업」 · 「최대」 to press.
// The 「수량 선택」 list of every member on the right side and its number box are gone. 「최대」 stops at the current
// ascension cap (experienceBookLimit), as the old window did.
// One line: the kinds held as pictures to pick (the count on each), then 「1개」 · 「레벨 업 ×n」 · 「최대 ×n」 for the picked one.
const bookPick={};
function bookRow(owner){
 const g=game.growth(owner),row=el('div','gear-exp');row.dataset.owner=owner;
 const head=el('div','gear-exp-head');head.append(el('strong','','경험치 책'),el('small','',g.max?'지금 돌파 상한입니다':'다음 레벨까지 '+fmt(g.remaining)));row.append(head);
 const kinds=Object.keys(BOOKS).filter(id=>game.itemCount(id)>0);
 if(!kinds.length){row.append(el('small','gear-exp-none','경험치 책이 없습니다 · 계시의 꽃(지맥)에서 얻습니다'));return row;}
 const id=kinds.includes(bookPick[owner])?bookPick[owner]:kinds[0],line=el('div','gear-exp-line'),faces=el('div','gear-exp-books');faces.setAttribute('role','radiogroup');faces.setAttribute('aria-label','경험치 책 종류');
 for(const k of kinds){const name=safeName('14_ITEM_DB',k),path=(typeof MANIFEST!=='undefined'?MANIFEST:window.CRPG_MANIFEST)?.itemIcons?.icons?.[k]?.path,face=button('',()=>{bookPick[owner]=k;render();});
  face.className='gear-exp-face'+(k===id?' on':'');face.setAttribute('role','radio');face.setAttribute('aria-checked',String(k===id));face.title=name+' · 1개당 경험치 '+fmt(BOOKS[k]);face.setAttribute('aria-label',name+' '+fmt(game.itemCount(k))+'개');
  if(path){const pic=el('img','gear-exp-icon');pic.src=path;pic.alt='';pic.draggable=false;face.append(pic);}else face.append(el('span','gear-exp-icon mark','EXP'));face.append(el('b','','×'+fmt(game.itemCount(k))));faces.append(face);}
 const have=game.itemCount(id),max=g.max?0:Math.min(have,Number(game.experienceBookLimit(id,owner))||0),next=Math.max(1,Math.min(max,Math.ceil((Number(g.remaining)||0)/BOOKS[id]))),name=safeName('14_ITEM_DB',id);
 const use=(q,label)=>{const why=max?game.actionReason('USE_ITEM',{item:id,quantity:q,owner}):'지금 돌파 상한입니다.';const b=button(label,()=>act('USE_ITEM',{item:id,quantity:q,owner}),busy||!max||!!why);b.title=why||name+' '+q+'개 · 경험치 +'+fmt(q*BOOKS[id]);return b;};
 const buttons=el('div','gear-exp-use');buttons.append(use(1,'1개'));if(next>1)buttons.append(use(next,'레벨 업 ×'+next));if(max>next)buttons.append(use(max,'최대 ×'+max));
 line.append(faces,buttons);row.append(line);return row;
}
// Native popovers occupy the top layer, including above an equipment picker dialog.
// Position against the viewport so neither the scrolling list nor the mobile edge clips them.
let tipSequence=0;
function showGearTip(target){
 const cell=target?.closest?.('.gear-cell'),tip=cell?.querySelector('.gear-tip');if(!tip||!canHover()||!tip.showPopover)return;
 document.querySelectorAll('.gear-tip:popover-open').forEach(t=>{if(t!==tip)t.hidePopover();});
 tip.setAttribute('popover','manual');tip.id||='gear-tip-'+(++tipSequence);const trigger=cell.querySelector('button');trigger?.setAttribute('aria-describedby',tip.id);
 tip.showPopover();const a=cell.getBoundingClientRect(),t=tip.getBoundingClientRect(),gap=10;
 tip.style.left=Math.max(gap,Math.min(a.left,window.innerWidth-t.width-gap))+'px';
 tip.style.top=Math.max(gap,Math.min(a.bottom+gap+t.height<=window.innerHeight?a.bottom+gap:a.top-t.height-gap,window.innerHeight-t.height-gap))+'px';
}
document.addEventListener('pointerover',e=>showGearTip(e.target));
document.addEventListener('focusin',e=>showGearTip(e.target));
for(const name of ['pointerout','focusout'])document.addEventListener(name,e=>{const cell=e.target?.closest?.('.gear-cell');if(cell&&!cell.contains(e.relatedTarget))cell.querySelector('.gear-tip:popover-open')?.hidePopover();});
window.addEventListener('resize',()=>document.querySelectorAll('.gear-tip:popover-open').forEach(t=>t.hidePopover()));

growthScreen=function(p){
 p.classList.add('gear-screen');p.append(el('div','eyebrow','CHARACTER'),el('h1','','캐릭터'),el('p','muted','함께하는 모든 캐릭터의 장비와 능력치입니다. 칸을 누르면 장비를 바꾸고'+(canHover()?', 마우스를 올리면 효과가 보입니다.':' 효과를 확인할 수 있습니다.')+' 편성에서 빠져도 장비는 그대로 남습니다.'));
 const locked=game.actionReason('EQUIP');if(locked)p.append(el('p','phase-note','지금은 장비를 확인만 할 수 있습니다. '+locked));
 // 0.15.19 (user: 캐릭터 메뉴에 모든 캐릭터): the party first in battle order, then everyone else the player has.
 const party=game.formationOrder?game.formationOrder():game.s.party.filter(x=>x.active).map(x=>x.source);
 const bench=game.ownedActors().filter(a=>!party.includes(a.id)).sort((a,b)=>(game.premiumRarity?.(b.id)||4)-(game.premiumRarity?.(a.id)||4)||Number(b.level)-Number(a.level)||a.name.localeCompare(b.name,'ko')).map(a=>a.id);
 const grid=el('div','gear-members');for(const id of party)grid.append(memberCard(id));for(const id of bench)grid.append(memberCard(id,true));p.append(grid);
 const links=el('div','row gear-links');links.append(actionButton('편성 바꾸기','MENU',{screen:'PARTY'}));if(window.openEquipmentHelp)links.append(button('장비 사용법',()=>window.openEquipmentHelp()));p.append(links);
 // 0.15.20: back to the battle, a waiting story scene, or the main screen (app_experience.js journeyReturn).
 {const back=typeof journeyReturn==='function'?journeyReturn():{label:game.s.runtime?'전투로 돌아가기':'이야기로 돌아가기',screen:game.s.runtime&&!game.s.runtime.interlude?'COMBAT':'STORY'};p.append(back.retry?actionButton(back.label,'STORY_RETRY',{},true):actionButton(back.label,'MENU',{screen:back.screen},true));}
 // Open after the MENU action has finished. A picker built during the busy render
 // keeps its disabled buttons even when the underlying page is rendered again.
 if(pendingPick&&!busy){const x=pendingPick;pendingPick=null;queueMicrotask(()=>openPicker(x.owner,x.category));}
};
// Other screens open the gear screen with one item's slot already chosen.
window.bookRow=bookRow;
window.openGear=function(slot,owner){
 const inv=game?.s.inventory.find(i=>i.slot===slot&&i.equip);if(!inv)return act('MENU',{screen:'STATUS'});
 const owned=game.ownedActors().map(a=>a.id);pendingPick={owner:owned.includes(owner)?owner:inv.equipped&&owned.includes(inv.owner)?inv.owner:'PLAYER_CUSTOM',category:itemCategory(inv)};
 // 0.15.17: the screen shows the member whose slot opens, not the one picked last time.
 window.CRPGShell?.focusGear?.(pendingPick.owner);
 return act('MENU',{screen:'STATUS'});
};
const gearSidebar=sidebar;
sidebar=function(g,v){
 const side=gearSidebar(g,v),b=side.querySelector('nav [data-screen="STATUS"]');
 if(b){const spans=b.querySelectorAll('span');if(spans[0])spans[0].textContent='⚔';if(spans[1])spans[1].textContent='캐릭터';b.setAttribute('aria-label','캐릭터');}
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
 if(r.protagonistRevived)p.insertBefore(el('p','revive-note',withJosa(game.s.global.PLAYER_NAME,'은','는')+' 쓰러졌지만 동료들이 전투에서 이겼습니다. HP '+fmt(r.protagonistRevived)+'(으)로 다시 일어났습니다.'),anchor);
 if(r.defeatPenalty&&game.s.defeatPenalty&&!p.querySelector('.recovery-card')){const box=el('section','card defeat-card');box.append(el('p','defeat-penalty','패배로 모라를 '+fmt(r.defeatPenalty.mora)+' 잃었습니다.'));countdown(box,'다시 도전하거나 회복할 수 있을 때까지');p.insertBefore(box,anchor);}
};
function tick(){const left=game?.defeatLockRemaining?.()||0;for(const n of document.querySelectorAll('[data-defeat-countdown]'))n.textContent=Math.ceil(left/1000)+'초';if(left<=0){clearInterval(lockTimer);lockTimer=null;render();}}
// 0.15.24 (user: 「이것도 시간이 안맞아」): a locked action's note printed on screen (「…정신을 차리는 중입니다 · N초 남음」) counts
// down with the same clock as the HUD instead of keeping the second it was drawn at.
const DEFEAT_NOTE=/정신을 차리는 중입니다 · (\d+초) 남음/;
function liveDefeatNotes(){
 const root=document.getElementById('root');if(!root)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),hits=[];
 while(walker.nextNode()){const n=walker.currentNode;if(DEFEAT_NOTE.test(n.nodeValue)&&!n.parentElement?.closest('[data-defeat-countdown]'))hits.push(n);}
 for(const n of hits){const m=DEFEAT_NOTE.exec(n.nodeValue),start=m.index+m[0].indexOf(m[1]),mid=n.splitText(start);mid.splitText(m[1].length);const t=el('strong','',m[1]);t.dataset.defeatCountdown='1';mid.replaceWith(t);}
}
const gearRender=render;
render=function(){gearRender();if((game?.defeatLockRemaining?.()||0)>0){liveDefeatNotes();if(!lockTimer)lockTimer=setInterval(tick,1000);}};
})();
