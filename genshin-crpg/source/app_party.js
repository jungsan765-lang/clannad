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
// 0.15.19: a member leaving the party keeps their gear (runtime_party.js), so there is nothing to warn about any more.
function confirmPartyRemoval(id,run){run();}
// 0.15.19 (user: 편성에서 멤버를 누르면 캐릭터를 바꿀 수 있게, 이름만 말고 그림으로): the companions as picture tiles.
// A companion already in another slot trades places with this one; anyone else joins here (the one leaving keeps their gear).
const ELEMENT_OF=id=>(/\[(불|물|얼음|번개|바람|바위|풀)\]/.exec(String(game.row('07_CHAR_DB',id)?.[3]||''))||[])[1]||'';
function pickCompanion(n,current){
  const box=el('div','member-picker'),grid=el('div','member-pick-grid'),close=()=>document.getElementById('modal').close();
  box.append(el('p','muted',current?withJosa(ownerName(current),'과','와')+' 바꿀 동료를 고르세요. 편성에서 빠져도 장비는 각자 그대로 갖고 있습니다.':'이 칸에 넣을 동료를 고르세요.'));
  const list=game.ownedActors().filter(x=>x.id!=='PLAYER_CUSTOM'&&x.id!==current)
   .sort((a,b)=>Number(a.active)-Number(b.active)||(game.premiumRarity?.(b.id)||4)-(game.premiumRarity?.(a.id)||4)||Number(b.level)-Number(a.level)||a.name.localeCompare(b.name,'ko'));
  for(const x of list){
   const type=x.active?'PARTY_SWAP':current?'PARTY_REPLACE':'PARTY',params=x.active?{from:x.slot,to:n}:{char:x.id,slot:n},why=game.actionReason(type,params);
   const b=button('',()=>{close();act(type,params);},busy||!!why);b.className='member-pick'+(x.active?' in-party':'');if(why)b.title=why;
   const stars=game.premiumRarity?.(x.id)>=5?5:4,element=ELEMENT_OF(x.id),icons=typeof CRPGIcons!=='undefined'?CRPGIcons:null,weapon=icons?.weaponOfCharacter(x.id)||'';
   // 0.15.21 (user: 「동료칸에 불 번개 바람 얼음 뭐 이런거 적혀있는거 가능하면 아이콘으로」): the element's symbol and the weapon
   // kind, the original game's pictures (app_icons_v01521.js).
   const meta=el('small','member-pick-meta','Lv.'+x.level),mark=icons?.element(element),arm=icons?.weapon(weapon,'pick-weapon');
   if(mark)meta.append(mark);else if(element)meta.append(' · '+element);if(arm)meta.append(arm);
   b.append(actorPortrait(x.id,'member-pick-face'),el('strong','',x.name),meta,el('span','member-pick-stars r'+stars,'★'.repeat(stars)));
   if(x.active)b.append(el('small','member-pick-state',(x.slot-1)+'번 칸과 자리 바꾸기'));
   b.setAttribute('aria-label',x.name+' · Lv.'+x.level+(element?' · '+element+' 원소':'')+(weapon?' · '+weapon:'')+(x.active?' · '+(x.slot-1)+'번 칸과 자리 바꾸기':''));grid.append(b);
  }
  if(!list.length)grid.append(el('p','empty','함께할 수 있는 동료가 아직 없습니다. 기원이나 동료의 이야기에서 만날 수 있습니다.'));
  box.append(grid);showModal(current?'동료 바꾸기 · 동료 칸 '+(n-1):'동료 넣기 · 동료 칸 '+(n-1),box);
}
// v0.13.33: the battle line is its own order (the protagonist can stand anywhere); party slots only hold members.
const POSITIONS=['선두 · 전열','전열 · 치명타 확률 +5%','후열 · 최대 HP +5%','후미 · 받는 최종 피해 −20%'];
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
// v0.14.4: a party-wide 진형 chosen before battle, with roles that can trigger its synergy.
const roleLabel=t=>window.CRPGRuntime?.formationConfig?.roles?.[t]?.label||t;
function formationChoice(p){
  const v=game.formationView?.();if(!v)return;
  const box=el('section','card formation-choice');box.append(el('h2','','진형'),el('p','muted formation-help','파티 전체의 진형입니다. 동료 역할이 진형과 맞으면 시너지가 붙습니다.'));
  const grid=el('div','formation-options');
  for(const f of v.formations){
    const why=game.actionReason('FORMATION_SET',{formation:f.id}),b=button('',()=>act('FORMATION_SET',{formation:f.id}),busy||f.selected||!!why);
    b.className='formation-option'+(f.selected?' selected':'');b.setAttribute('aria-pressed',String(f.selected));if(why)b.title=why;
    b.append(el('strong','',f.name+(f.selected?' ✓':'')),el('span','formation-effect',f.text),el('small','formation-synergy'+(f.synergyActive?' on':''),(f.synergyActive?'발동 · ':'')+f.synergy.text));b.title=f.motto;
    grid.append(b);
  }
  box.append(grid);p.append(box);
}
function partyScreen(p){
  p.append(el('div','eyebrow','PARTY'),el('h1','','편성'),el('p','muted','함께 싸울 동료와 진형, 전투 대열, 동료 역할을 정합니다. 동료 칸을 누르면 그림을 보며 바꿀 수 있고, 편성에서 빠져도 동료의 장비는 그대로 남습니다.'));
  const owners=game.ownedActors(),reason=game.actionReason('PARTY');
  if(reason)p.append(el('p','phase-note','현재 장면에서는 편성을 확인만 할 수 있습니다. 변경은 장면을 마친 뒤 가능합니다.'));
  // v0.14.5: the party itself comes first; formation and battle line follow below it.
  p.append(el('h2','','동료 편성'));
  const formation=el('div','formation-grid');
  for(let n=1;n<=4;n++){
    const member=game.s.party.find(x=>x.slot==='PARTY_'+n&&x.active),id=member?.source,c=el('section','formation-slot');
    c.append(el('small','slot-label',n===1?'주인공':'동료 칸 '+(n-1)));
    // The protagonist's picture opens the character screen; a companion's opens the picker (장비 변경 is its own button).
    if(id){const worn=game.s.inventory.filter(i=>i.equip&&i.equipped&&i.owner===id).length,swap=n>1,who=button('',swap?()=>pickCompanion(n,id):()=>{window.CRPGShell?.focusGear?.(id);act('MENU',{screen:'STATUS'});},swap&&(busy||!!reason));who.className='member-select'+(swap?' swappable':'');if(swap&&reason)who.title=reason;
     who.setAttribute('aria-label',ownerName(id)+(swap?' · 다른 동료로 바꾸기':' 장비 보기'));who.append(actorPortrait(id,'party-portrait'),el('strong','',ownerName(id)),el('small','muted',swap?'눌러서 동료 바꾸기 · 장비 '+worn+'개':'장비 '+worn+'개'));c.append(who);}
    else{const add=button('',()=>pickCompanion(n,null),busy||!!reason);add.className='empty-slot member-add';if(reason)add.title=reason;add.setAttribute('aria-label','동료 칸 '+(n-1)+' · 동료 넣기');add.append(el('span','member-add-plus','+'),el('strong','','동료 넣기'));c.append(add);}
    if(n>1){
      const controls=el('div','formation-controls');
      if(id){
        const tactic=el('select');tactic.setAttribute('aria-label',ownerName(id)+' 역할');for(const t of game.partyTactics())tactic.append(new Option(roleLabel(t),t));tactic.value=member.tactic;tactic.onchange=()=>act('PARTY_TACTIC',{slot:n,tactic:tactic.value});controls.append(tactic);
        const effect=window.CRPGRuntime?.formationConfig?.roles?.[member.tactic||'균형']?.text;if(effect)controls.append(el('small','role-effect',effect));
        // v0.14.4: how often this companion's E/Q come back, and the awakening chance with the exclusive weapon.
        const rhythm=game.skillRhythm?.(id);if(rhythm){const ch=game.resonanceChance?.(id)||0;controls.append(el('small','skill-rhythm','원소전투 스킬 '+rhythm.e+'차례 · 원소폭발 '+rhythm.q+'차례마다'+(ch?' · 공명 각성 '+Math.round(ch*100)+'%':'')));}
        // 0.15.17 (user: 장비 변경 above 편성 해제): opens the character screen on this member.
        const gearWhy=game.actionReason('MENU',{screen:'STATUS'}),gear=button('장비 변경',()=>{window.CRPGShell?.focusGear?.(id);act('MENU',{screen:'STATUS'});},busy||!!gearWhy);if(gearWhy)gear.title=gearWhy;gear.classList.add('party-gear');controls.append(gear);
        controls.append(button('편성 해제',()=>confirmPartyRemoval(id,()=>act('PARTY_REMOVE',{slot:n})),busy||!!game.actionReason('PARTY_REMOVE',{slot:n})));
      }
      lockControls(controls,reason);c.append(controls);
    }
    formation.append(c);
  }
  p.append(formation);formationChoice(p);formationLine(p);p.append(el('p','muted','편성에 넣은 동료는 개인 임무를 마쳤다면 전투에서 이길 때마다 호감도가 1점씩 오릅니다. 개인 임무를 처음 마칠 때 받는 10점은 한 번뿐입니다.'));
  p.append(actionButton('캐릭터 화면으로','MENU',{screen:'STATUS'}));returnToJourney(p);
}
inventory=function(p){
  p.append(el('div','eyebrow','INVENTORY'),el('h1','','가방'),el('p','muted','음식·재료·전술 도구를 관리합니다. 장비는 캐릭터 화면에서 캐릭터별로 관리할 수 있습니다.'));
  const reason=game.actionReason('USE_ITEM'),content=el('div');if(reason)p.append(el('p','phase-note','현재 장면에서는 가방 확인만 가능합니다.'));
  const items=game.s.inventory.filter(x=>x.item&&x.quantity>0),grid=el('div','grid');
  for(const item of items){const row=game.row('14_ITEM_DB',item.item),c=el('section','card');c.append(el('small','',row[2]||'물건'),el('h3','',row[1]),el('p','',item.quantity.toLocaleString()+'개'));
    if(row[2]==='음식'){let spec;try{spec=game.foodSpec(item.item);}catch{}if(spec){const select=el('select');select.setAttribute('aria-label',row[1]+' 사용 대상');for(const member of game.s.party.filter(x=>x.active))select.append(new Option(ownerName(member.source),member.source));c.append(select,button('1개 사용',()=>act('USE_ITEM',{item:item.item,quantity:1,owner:select.value}),!!reason));}}
    if(item.item.startsWith('MAT_CHAR_EXP_'))c.append(actionButton('캐릭터 화면에서 사용','MENU',{screen:'STATUS'}));grid.append(c);
  }
  if(!items.length)grid.append(el('p','empty','가방이 비어 있습니다.'));content.append(grid);const tools=el('section');toolPreparation(tools);lockControls(tools,game.actionReason('TOOL_PREPARE'));content.append(tools);p.append(content);
  p.append(actionButton('보유 장비 '+game.s.inventory.filter(x=>x.equip).length+'개 관리','MENU',{screen:'PARTY'}));returnToJourney(p);
};
// Keep preparation choices in the save, including an intentionally empty selection.
battlePrepare=function(p){
  const prep=game.view().battlePreparation||game.s.battlePreparation;if(!prep)return;
  const raw=game.s.battlePreparation,owned=game.ownedActors().filter(x=>x.id!=='PLAYER_CUSTOM'&&x.state==='JOINED'),choices=new Map(owned.map(o=>[o.id,{id:o.id,name:o.name,owned:true}]));
  const selected=new Set((raw.selectedCompanions??prep.active??[]).filter(id=>choices.has(id))),limit=(prep.max||4)-1;
  p.append(el('div','eyebrow','BEFORE THE BATTLE'),el('h1','','전투 준비'),el('p','',withJosa(game.s.global.PLAYER_NAME,'과','와')+' 함께 싸울 동료를 '+limit+'명까지 선택하세요. 정식으로 합류한 동료만 참가합니다.'));
  const group=game.row('33_ENCOUNTER_GROUP_DB',prep.group),members=game.combatRows('49_ENCOUNTER_MEMBER_DB').filter(r=>r[1]===prep.group);
  p.append(el('p','phase-note',members.map(m=>{const e=game.row('09_MONSTER_DB',m[3]);return e[1]+' · '+(group[6]==='PARTY_BANDED'?'파티 레벨에 맞춰 등장':(/DVALIN/.test(prep.group)?'권장 Lv. '+(game.mondBossProfiles?.().BOSS_DVALIN?.recommended||7)+' · 4명':/^EG_TRV_(FALCON|WOLF|LION)_WAVE$/.test(prep.group)?'권장 Lv. 2':'Lv. '+e[18]));}).join(' / ')));
  for(const choice of choices.values()){const row=el('label','settings-row'),check=el('input');check.type='checkbox';check.checked=selected.has(choice.id);check.disabled=busy||(!check.checked&&selected.size>=limit);check.onchange=()=>{const next=new Set(selected);check.checked?next.add(choice.id):next.delete(choice.id);act('PREP_SELECT',{group:prep.group,companions:[...next]});};row.append(check,el('span','',choice.name+(choice.owned?' · 합류한 동료':' · 이번 전투 동행')));p.append(row);}
  if(!choices.size)p.append(el('p','muted','현재 함께할 수 있는 동료가 없습니다. 주인공이 전투에 참가합니다.'));
  p.append(el('p','muted','선택한 동료 '+selected.size+' / '+limit+'명 · 메뉴를 오가거나 저장해도 선택이 유지됩니다.'));
  const buttons=el('div','row');buttons.append(actionButton('편성','MENU',{screen:'PARTY'}),actionButton('캐릭터','MENU',{screen:'STATUS'}),actionButton('가방','MENU',{screen:'INVENTORY'}));p.append(buttons);
  if(game.combatStoryConfig(prep.group))p.append(el('p','muted','공중의 적에게는 원거리 공격 또는 부양·발판이 필요합니다. 지형이 모두 무너지기 전에 전투를 마쳐야 합니다.'));
  p.append(actionButton('이 편성으로 전투 순서 확인','COMBAT_PREPARE',{group:prep.group,companions:[...selected]},true),el('p','muted','패배하면 전투 직전 상태로 돌아가 다시 준비할 수 있습니다.'));
};
