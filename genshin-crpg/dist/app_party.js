/* Formation and equipment have their own screen; the bag only manages items. */
let partyOwner='PLAYER_CUSTOM',equipmentCategory='WEAPON',equipmentCandidate=null;
const equipmentCategories={WEAPON:'무기',ARMOR:'방어구',ACCESSORY:'장신구',SPECIAL:'특수 장비'};
function ownerName(id){return id==='PLAYER_CUSTOM'?game.s.global.PLAYER_NAME:safeName('07_CHAR_DB',id);}
function itemCategory(item){const value=game.row('16_EQUIP_DB',item.equip)[2];return value==='방어구'?'ARMOR':value==='장신구'?'ACCESSORY':value==='특수'?'SPECIAL':'WEAPON';}
function lockControls(box,reason){if(!reason)return;for(const control of box.querySelectorAll('button,input,select')){control.disabled=true;control.title=reason;}}
function returnToJourney(p){p.append(actionButton(game.playPhase()==='PREPARATION'?'전투 준비로 돌아가기':'이야기로 돌아가기','MENU',{screen:'STORY'},true));}
function actorPortrait(id,cls){const profile=game.rows('04_CHAR_DB').find(r=>r[1]===id),src=profile&&portraitFor(profile[0]);if(!src)return el('div',cls+' portrait-placeholder','✧');const img=el('img',cls);img.src=src;img.alt=ownerName(id);return img;}
function partyScreen(p){
  p.append(el('div','eyebrow','PARTY & EQUIPMENT'),el('h1','','편성·장비'),el('p','muted','현재 파티의 장비를 관리합니다. 편성을 해제하면 착용 장비는 소지품으로 돌아갑니다.'));
  const owners=game.ownedActors(),ids=new Set(owners.filter(x=>x.active).map(x=>x.id)),reason=game.actionReason('EQUIP');
  if(!ids.has(partyOwner))partyOwner='PLAYER_CUSTOM';
  if(reason)p.append(el('p','phase-note','현재 장면에서는 편성과 장비를 확인할 수 있습니다. 변경은 장면을 마친 뒤 가능합니다.'));
  const formation=el('div','formation-grid');
  const bonuses=['주인공 · 고정','치명타 확률 +5% · 호감도 동행','최대 HP +5%','받는 최종 피해 −20%'];
  for(let n=1;n<=4;n++){
    const member=game.s.party.find(x=>x.slot==='PARTY_'+n&&x.active),id=member?.source,c=el('section','formation-slot'+(id===partyOwner?' selected':''));
    c.append(el('small','slot-label',n+'번 · '+bonuses[n-1]));
    if(id){const choose=button('',()=>{partyOwner=id;equipmentCandidate=null;render();});choose.className='member-select';choose.setAttribute('aria-label',ownerName(id)+' 장비 보기');choose.append(actorPortrait(id,'party-portrait'),el('strong','',ownerName(id)));c.append(choose);}
    else c.append(el('div','empty-slot','비어 있음'));
    if(n>1){
      const controls=el('div','formation-controls'),select=el('select');select.setAttribute('aria-label',n+'번 슬롯 동료');select.append(new Option('동료를 선택하세요',''));
      for(const owner of owners.filter(x=>x.id!=='PLAYER_CUSTOM'&&(!x.active||x.id===id)))select.append(new Option(owner.name,owner.id));select.value=id||'';
      select.onchange=()=>{if(select.value)act(id?'PARTY_REPLACE':'PARTY',{char:select.value,slot:n});};controls.append(select);
      if(id){
        const tactic=el('select');tactic.setAttribute('aria-label',ownerName(id)+' 행동 방침');for(const t of game.partyTactics())tactic.append(new Option(t,t));tactic.value=member.tactic;tactic.onchange=()=>act('PARTY_TACTIC',{slot:n,tactic:tactic.value});controls.append(tactic);
        const moves=el('div','slot-moves');for(const target of [2,3,4].filter(x=>x!==n))moves.append(actionButton(target+'번과 교환','PARTY_SWAP',{from:n,to:target}));controls.append(moves,actionButton('편성 해제','PARTY_REMOVE',{slot:n}));
      }
      lockControls(controls,game.actionReason('PARTY'));c.append(controls);
    }
    formation.append(c);
  }
  p.append(formation,el('p','muted','2번 슬롯은 개인 임무를 마친 동료의 호감도가 전투 승리마다 1점 오릅니다. 개인 임무 완료 보상은 10점으로 한 번만 받습니다.'));
  const focus=el('label','settings-row'),chooser=el('select');chooser.setAttribute('aria-label','장비를 관리할 캐릭터');for(const owner of owners.filter(x=>x.active))chooser.append(new Option(owner.name+(owner.active?' · 편성 중':' · 대기 중'),owner.id));chooser.value=partyOwner;chooser.onchange=()=>{partyOwner=chooser.value;equipmentCandidate=null;render();};focus.append(el('span','','장비를 관리할 캐릭터'),chooser);p.append(focus);
  const layout=el('div','equipment-layout'),summary=el('section','card equipment-character'),gear=el('section');
  const actor=partyOwner==='PLAYER_CUSTOM'?game.player():game.character(partyOwner);
  summary.append(actorPortrait(partyOwner,'equipment-portrait'),el('h2','',ownerName(partyOwner)),el('p','muted','Lv. '+game.growth(partyOwner).level));meter(summary,'HP',actor.hp,actor.maxHp);
  const stats=el('dl','stat-grid');for(const [label,key]of [['공격력','atk'],['방어력','def'],['속도','spd'],['치명타 확률','crit']])stats.append(el('dt','',label),el('dd','',Math.round(actor[key]||0)+(key==='crit'?'%':'')));summary.append(stats,el('small','muted','능력치는 장비를 포함한 기본 수치입니다. 슬롯 효과는 전투에 적용됩니다.'));
  for(const [category,label]of Object.entries(equipmentCategories)){
    const item=game.s.inventory.find(x=>x.equip&&x.equipped&&x.owner===partyOwner&&itemCategory(x)===category),b=button('',()=>{equipmentCategory=category;equipmentCandidate=null;render();});b.className='equipped-slot'+(category===equipmentCategory?' selected':'');b.append(el('small','',label),el('strong','',item?safeName('16_EQUIP_DB',item.equip)+' +'+item.enhance:'미장착'));summary.append(b);
  }
  gear.append(el('h2','',equipmentCategories[equipmentCategory]+' 선택'));
  const items=game.s.inventory.filter(x=>x.equip&&itemCategory(x)===equipmentCategory),current=items.find(x=>x.equipped&&x.owner===partyOwner);
  if(current)gear.append(actionButton('현재 '+equipmentCategories[equipmentCategory]+' 해제','UNEQUIP',{slot:current.slot,owner:partyOwner}));
  if(!items.length)gear.append(el('p','empty','보유한 장비가 없습니다.'));
  const list=el('div','equipment-list');for(const item of items){const selected=item.slot===equipmentCandidate,b=button('',()=>{equipmentCandidate=selected?null:item.slot;render();});b.className='equipment-choice'+(selected?' selected':'');b.append(el('strong','',safeName('16_EQUIP_DB',item.equip)+' +'+item.enhance),el('small','',item.equipped?ownerName(item.owner)+' 장착 중':'미장착'));list.append(b);}gear.append(list);
  const candidate=items.find(x=>x.slot===equipmentCandidate);
  if(candidate){const preview=game.equipmentPreview(candidate.slot,partyOwner),box=el('section','card equipment-comparison');box.append(el('h3','','장착 전 비교'));
    if(preview.reason)box.append(el('p','choice-note',preview.reason));
    else{const table=el('table','compare-table'),head=el('tr');for(const text of ['능력치','현재','장착 후'])head.append(el('th','',text));table.append(head);
      for(const [label,key]of [['최대 HP','maxHp'],['공격력','atk'],['방어력','def'],['속도','spd'],['치명타 확률','crit'],['치명타 피해','critDmg'],['명중','hit'],['회피','eva']]){const a=Math.round(preview.before[key]||0),b=Math.round(preview.after[key]||0),row=el('tr');row.append(el('th','',label),el('td','',a),el('td',b>a?'stat-up':b<a?'stat-down':'',b+(b!==a?' ('+(b>a?'+':'')+(b-a)+')':'')));table.append(row);}box.append(table);
      if(candidate.equipped&&candidate.owner!==partyOwner)box.append(el('p','transfer-note',ownerName(candidate.owner)+'에게서 가져와 장착합니다. 이전 착용자의 해당 장비는 해제됩니다.'));
      box.append(el('small','muted','장비 교체로 현재 HP가 회복되지는 않습니다.'));
    }
    const equip=actionButton(candidate.equipped&&candidate.owner===partyOwner?'현재 장착 중':'이 장비 장착','EQUIP',{slot:candidate.slot,owner:partyOwner},true);equip.disabled=equip.disabled||!!preview.reason||(candidate.equipped&&candidate.owner===partyOwner);box.append(equip);gear.append(box);
  }
  layout.append(summary,gear);p.append(layout);returnToJourney(p);
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
  const buttons=el('div','row');buttons.append(actionButton('편성·장비','MENU',{screen:'PARTY'}),actionButton('소지품·식사','MENU',{screen:'INVENTORY'}),actionButton('성장 확인','MENU',{screen:'STATUS'}));p.append(buttons);
  if(game.combatStoryConfig(prep.group))p.append(el('p','muted','공중의 적에게는 원거리 공격 또는 부양·발판이 필요합니다. 지형이 모두 무너지기 전에 전투를 마쳐야 합니다.'));
  p.append(actionButton('이 편성으로 전투 순서 확인','COMBAT_PREPARE',{group:prep.group,companions:[...selected]},true),el('p','muted','패배하면 전투 직전 상태로 돌아가 다시 준비할 수 있습니다.'));
};
