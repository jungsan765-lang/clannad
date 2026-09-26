/* Formation and equipment have their own screen; the bag only manages items. */
let partyOwner='PLAYER_CUSTOM',equipmentCategory='WEAPON',equipmentCandidate=null;
const equipmentCategories={WEAPON:'무기',ARMOR:'방어구',ACCESSORY:'장신구',SPECIAL:'특수 장비'};
function ownerName(id){return id==='PLAYER_CUSTOM'?game.s.global.PLAYER_NAME:safeName('07_CHAR_DB',id);}
function itemCategory(item){const value=game.row('16_EQUIP_DB',item.equip)[2];return value==='방어구'?'ARMOR':value==='장신구'?'ACCESSORY':value==='특수'?'SPECIAL':'WEAPON';}
function lockControls(box,reason){if(!reason)return;for(const control of box.querySelectorAll('button,input,select')){control.disabled=true;control.title=reason;}}
function returnToJourney(p){p.append(actionButton(game.playPhase()==='PREPARATION'?'전투 준비로 돌아가기':'이야기로 돌아가기','MENU',{screen:'STORY'},true));}
function actorPortrait(id,cls){const profile=game.rows('04_CHAR_DB').find(r=>r[1]===id),src=profile&&portraitFor(profile[0]);if(!src)return el('div',cls+' portrait-placeholder','✧');const img=el('img',cls);img.src=src;img.alt=ownerName(id);return img;}
// Korean particle for a name: 이/가, 은/는, 을/를 by the last syllable's final consonant.
function withJosa(word,consonant,vowel){const last=String(word||'').trim().slice(-1),code=last.charCodeAt(0)-0xAC00;return word+(code>=0&&code<11172?(code%28?consonant:vowel):consonant+'('+vowel+')');}
// Leaving the party returns that member's gear to the bag; say so before it happens.
function confirmPartyRemoval(id,run){
  const gear=game.s.inventory.filter(i=>i.equip&&i.equipped&&i.owner===id);if(!gear.length){run();return;}
  const box=el('div','party-remove-confirm'),list=el('ul'),row=el('div','row');for(const i of gear)list.append(el('li','',safeName('16_EQUIP_DB',i.equip)+(i.enhance?' +'+i.enhance:'')));
  row.append(button('취소',()=>{document.getElementById('modal').close();render();}),button('장비를 풀고 편성에서 빼기',()=>{document.getElementById('modal').close();run();},false,true));
  box.append(el('p','',withJosa(ownerName(id),'이','가')+' 편성에서 빠지면 착용 중인 장비 '+gear.length+'개가 해제되어 소지품으로 돌아갑니다.'),list,row);showModal('편성에서 빼기',box);
}
// v0.13.33: the battle line is its own order (the protagonist can stand anywhere); party slots only hold members.
const POSITIONS=['선두 · 전열','전열 · 치명타 확률 +5% · 호감도 동행','후열 · 최대 HP +5%','후미 · 받는 최종 피해 −20%'];
function formationLine(p){
  const order=game.formationOrder?game.formationOrder():game.s.party.filter(x=>x.active).map(x=>x.source),locked=game.actionReason('FORMATION_SET');
  const box=el('section','card formation-line');box.append(el('h2','','전투 대열'),el('p','muted','1·2번은 전열, 3·4번은 후열입니다. 근접 적은 전열을, 저격·기습형 적은 후열을 주로 노립니다. 바로 옆 칸 동료는 보호막이나 엄호 장비로 공격을 대신 받을 수 있습니다.'));
  const list=el('ol','formation-order');
  order.forEach((id,i)=>{
    const li=el('li','formation-row '+(i<2?'front':'back'));li.dataset.owner=id;
    li.append(el('span','formation-pos',String(i+1)),actorPortrait(id,'party-portrait'),el('strong','',ownerName(id)),el('small','muted',POSITIONS[i]||''));
    const swap=j=>{const next=order.slice();[next[i],next[j]]=[next[j],next[i]];act('FORMATION_SET',{order:next});};
    const moves=el('div','formation-moves'),up=button('▲',()=>swap(i-1),busy||i===0||!!locked),down=button('▼',()=>swap(i+1),busy||i===order.length-1||!!locked);
    up.setAttribute('aria-label',ownerName(id)+' 한 칸 앞으로');down.setAttribute('aria-label',ownerName(id)+' 한 칸 뒤로');moves.append(up,down);li.append(moves);list.append(li);
  });
  box.append(list);if(locked)box.append(el('small','choice-note',locked));p.append(box);
}
function partyScreen(p){
  p.append(el('div','eyebrow','PARTY'),el('h1','','편성'),el('p','muted','함께 싸울 동료, 전투 대열, 행동 방침을 정합니다. 장비는 장비 장착 메뉴에서 바꾸며, 편성에서 빠진 동료의 장비는 소지품으로 돌아갑니다.'));
  const owners=game.ownedActors(),reason=game.actionReason('PARTY');
  if(reason)p.append(el('p','phase-note','현재 장면에서는 편성을 확인만 할 수 있습니다. 변경은 장면을 마친 뒤 가능합니다.'));
  formationLine(p);p.append(el('h2','','동료 편성'));
  const formation=el('div','formation-grid');
  for(let n=1;n<=4;n++){
    const member=game.s.party.find(x=>x.slot==='PARTY_'+n&&x.active),id=member?.source,c=el('section','formation-slot');
    c.append(el('small','slot-label',n===1?'주인공':'동료 칸 '+(n-1)));
    if(id){const worn=game.s.inventory.filter(i=>i.equip&&i.equipped&&i.owner===id).length,who=button('',()=>act('MENU',{screen:'STATUS'}));who.className='member-select';who.setAttribute('aria-label',ownerName(id)+' 장비 보기');who.append(actorPortrait(id,'party-portrait'),el('strong','',ownerName(id)),el('small','muted','장비 '+worn+'개'));c.append(who);}
    else c.append(el('div','empty-slot','비어 있음'));
    if(n>1){
      const controls=el('div','formation-controls'),select=el('select');select.setAttribute('aria-label',n+'번 슬롯 동료');select.append(new Option('동료를 선택하세요',''));
      for(const owner of owners.filter(x=>x.id!=='PLAYER_CUSTOM'&&(!x.active||x.id===id)))select.append(new Option(owner.name,owner.id));select.value=id||'';
      select.onchange=()=>{if(!select.value)return;const go=()=>act(id?'PARTY_REPLACE':'PARTY',{char:select.value,slot:n});if(id&&select.value!==id)confirmPartyRemoval(id,go);else go();};controls.append(select);
      if(id){
        const tactic=el('select');tactic.setAttribute('aria-label',ownerName(id)+' 행동 방침');for(const t of game.partyTactics())tactic.append(new Option(t,t));tactic.value=member.tactic;tactic.onchange=()=>act('PARTY_TACTIC',{slot:n,tactic:tactic.value});controls.append(tactic);
        controls.append(button('편성 해제',()=>confirmPartyRemoval(id,()=>act('PARTY_REMOVE',{slot:n})),busy||!!game.actionReason('PARTY_REMOVE',{slot:n})));
      }
      lockControls(controls,reason);c.append(controls);
    }
    formation.append(c);
  }
  p.append(formation,el('p','muted','전투 대열 2번에 선 동료는 개인 임무를 마쳤다면 호감도가 전투 승리마다 1점 오릅니다. 개인 임무 완료 보상은 10점으로 한 번만 받습니다.'));
  p.append(actionButton('장비 장착으로','MENU',{screen:'STATUS'}));returnToJourney(p);
}
inventory=function(p){
  p.append(el('div','eyebrow','INVENTORY'),el('h1','','소지품'),el('p','muted','음식·재료·전술 도구를 관리합니다. 장비는 편성·장비에서 캐릭터별로 관리할 수 있습니다.'));
  const reason=game.actionReason('USE_ITEM'),content=el('div');if(reason)p.append(el('p','phase-note','현재 장면에서는 소지품 확인만 가능합니다.'));
  const items=game.s.inventory.filter(x=>x.item&&x.quantity>0),grid=el('div','grid');
  for(const item of items){const row=game.row('14_ITEM_DB',item.item),c=el('section','card');c.append(el('small','',row[2]||'소지품'),el('h3','',row[1]),el('p','',item.quantity.toLocaleString()+'개'));
    if(row[2]==='음식'){let spec;try{spec=game.foodSpec(item.item);}catch{}if(spec){const select=el('select');select.setAttribute('aria-label',row[1]+' 사용 대상');for(const member of game.s.party.filter(x=>x.active))select.append(new Option(ownerName(member.source),member.source));c.append(select,button('1개 사용',()=>act('USE_ITEM',{item:item.item,quantity:1,owner:select.value}),!!reason));}}
    if(item.item.startsWith('MAT_CHAR_EXP_'))c.append(actionButton('성장에서 사용','MENU',{screen:'STATUS'}));grid.append(c);
  }
  if(!items.length)grid.append(el('p','empty','아직 소지품이 없습니다.'));content.append(grid);const tools=el('section');toolPreparation(tools);lockControls(tools,game.actionReason('TOOL_PREPARE'));content.append(tools);p.append(content);
  p.append(actionButton('보유 장비 '+game.s.inventory.filter(x=>x.equip).length+'개 관리','MENU',{screen:'PARTY'}));returnToJourney(p);
};
// Keep preparation choices in the save, including an intentionally empty selection.
battlePrepare=function(p){
  const prep=game.view().battlePreparation||game.s.battlePreparation;if(!prep)return;
  const raw=game.s.battlePreparation,owned=game.ownedActors().filter(x=>x.id!=='PLAYER_CUSTOM'&&x.state==='JOINED'),choices=new Map(owned.map(o=>[o.id,{id:o.id,name:o.name,owned:true}]));
  const selected=new Set((raw.selectedCompanions??prep.active??[]).filter(id=>choices.has(id))),limit=(prep.max||4)-1;
  p.append(el('div','eyebrow','BEFORE THE BATTLE'),el('h1','','전투 준비'),el('p','',game.s.global.PLAYER_NAME+'와 함께 싸울 동료를 '+limit+'명까지 선택하세요. 정식으로 합류한 동료만 참가합니다.'));
  const group=game.row('33_ENCOUNTER_GROUP_DB',prep.group),members=game.combatRows('49_ENCOUNTER_MEMBER_DB').filter(r=>r[1]===prep.group);
  p.append(el('p','phase-note',members.map(m=>{const e=game.row('09_MONSTER_DB',m[3]);return e[1]+' · '+(group[6]==='PARTY_BANDED'?'파티 레벨에 맞춰 등장':(/DVALIN/.test(prep.group)?'권장 Lv. 4':/^EG_TRV_(FALCON|WOLF|LION)_WAVE$/.test(prep.group)?'권장 Lv. 2':'Lv. '+e[18]));}).join(' / ')));
  for(const choice of choices.values()){const row=el('label','settings-row'),check=el('input');check.type='checkbox';check.checked=selected.has(choice.id);check.disabled=busy||(!check.checked&&selected.size>=limit);check.onchange=()=>{const next=new Set(selected);check.checked?next.add(choice.id):next.delete(choice.id);act('PREP_SELECT',{group:prep.group,companions:[...next]});};row.append(check,el('span','',choice.name+(choice.owned?' · 합류한 동료':' · 이번 전투 동행')));p.append(row);}
  if(!choices.size)p.append(el('p','muted','현재 함께할 수 있는 동료가 없습니다. 주인공이 전투에 참가합니다.'));
  p.append(el('p','muted','선택한 동료 '+selected.size+' / '+limit+'명 · 메뉴를 오가거나 저장해도 선택이 유지됩니다.'));
  const buttons=el('div','row');buttons.append(actionButton('편성','MENU',{screen:'PARTY'}),actionButton('장비 장착','MENU',{screen:'STATUS'}),actionButton('소지품·식사','MENU',{screen:'INVENTORY'}));p.append(buttons);
  if(game.combatStoryConfig(prep.group))p.append(el('p','muted','공중의 적에게는 원거리 공격 또는 부양·발판이 필요합니다. 지형이 모두 무너지기 전에 전투를 마쳐야 합니다.'));
  p.append(actionButton('이 편성으로 전투 순서 확인','COMBAT_PREPARE',{group:prep.group,companions:[...selected]},true),el('p','muted','패배하면 전투 직전 상태로 돌아가 다시 준비할 수 있습니다.'));
};
