/* Equipment presentation and one-time guide; no new art or AI assets. */
(function(){'use strict';
 const labels=[['최대 HP','maxHp'],['공격력','atk'],['방어력','def'],['속도','spd']];
 const number=n=>Number(n||0).toLocaleString('ko-KR',{maximumFractionDigits:1});
 let queued=false,openFor=null;
 function presenter(){if(presenterDB!==game.db){itemPresenter=CRPGInventoryPresenter.create(game.db,MANIFEST);presenterDB=game.db;}return itemPresenter;}
 function detail(id,slot){return presenter().itemDetail(game.s.inventory.find(i=>i.slot===slot)||{equip:id,quantity:1,enhance:0});}
 function comparison(box,before,after){
  const table=el('table','compare-table'),head=el('tr');for(const text of ['능력치','장착 전','장착 후'])head.append(el('th','',text));table.append(head);
  for(const [label,key]of labels){const a=before[key]||0,b=after[key]||0,delta=Math.round((b-a)*10)/10,row=el('tr');row.append(el('th','',label),el('td','',number(a)),el('td',delta>0?'stat-up':delta<0?'stat-down':'',number(b)+(delta?' ('+(delta>0?'+':'')+number(delta)+')':'')));table.append(row);}box.append(table);
 }
 function explanation(box){
  box.append(el('p','','장비는 소지품에 가지고만 있어서는 효과가 없습니다. 편성·장비에서 착용할 캐릭터를 선택하고, 무기·방어구·장신구·특수 장비를 각각 장착하세요.'));
  for(const [title,text]of [
   ['1. 착용할 캐릭터 선택','주인공뿐 아니라 현재 파티의 동료도 개별 장비를 착용합니다. 무기는 캐릭터의 무기 종류와 요구 레벨을 확인하세요.'],
   ['2. 장착 전후 비교','장비를 선택하면 바뀌는 공격력·방어력·최대 HP를 확인할 수 있습니다. 같은 칸의 장비는 새 장비로 교체됩니다.'],
   ['3. 장착 버튼 누르기','장착을 확정해야 능력치가 적용됩니다. 다른 동료가 쓰던 물건은 이전 동료에게서 해제됩니다. 파티에서 빠지면 장비는 공용 소지품으로 돌아옵니다.'],
   ['4. 전투 전 회복','최대 HP가 올라가도 현재 HP는 자동 회복되지 않습니다. 음식이나 숙박으로 준비하세요. 전투 중에는 장비를 바꿀 수 없습니다.']
  ])box.append(el('h3','',title),el('p','',text));
  box.append(el('p','muted','몬드 대장간에서 강화 확률과 비용을 확인하세요. +10 이후에는 보스 재료로 +12 한도를 돌파할 수 있습니다.'));
 }
 function help(){if(!game)return;const box=el('div','equipment-guide');explanation(box);showModal('장비 사용법',box);}
 async function acknowledge(kind,goParty=false,slot=null,owner='PLAYER_CUSTOM'){
  const saveId=game?.s.global.SAVE_ID;document.getElementById('modal').close();
  const receipt=await act('EQUIPMENT_GUIDE_ACK',{kind});if(!receipt?.ok||game?.s.global.SAVE_ID!==saveId)return;
  if(goParty&&!game.actionReason('MENU',{screen:'PARTY'})){
   partyOwner=game.activePartyActors().some(a=>a.id===owner)?owner:'PLAYER_CUSTOM';const inv=game.s.inventory.find(i=>i.slot===slot);if(inv){equipmentCategory=itemCategory(inv);equipmentCandidate=slot;}
   await act('MENU',{screen:'PARTY'});
  }
 }
 function showPending(){
  if(!game||busy||game.s.runtime||activeTutorial||!['FREE','PREPARATION'].includes(game.playPhase())||document.getElementById('modal').open)return;
  const p=game.equipmentGuidePending();if(!p)return;const saveId=game.s.global.SAVE_ID;
  if(openFor?.saveId===saveId&&openFor.kind===p.kind)return;
  const box=el('div','equipment-guide'),d=detail(p.equip,p.slot);box.dataset.equipmentGuide=p.kind;
  const top=el('div','equipment-guide-item');top.append(itemGlyph(d),el('h2','',d.name));box.append(top);
  if(p.kind==='ACQUIRED'){
   const owned=game.s.inventory.find(i=>i.slot===p.slot);
   box.append(el('p','',owned?.equipped?'첫 장비를 획득하고 장착했습니다. 아래 안내를 확인하면 실제로 달라진 능력치를 볼 수 있습니다.':'첫 장비를 획득했습니다. 아직 장착하지 않았다면, 소지품에 가지고 있는 것만으로는 능력치가 오르지 않습니다.'));
   const stats=el('p','equipment-base-stats',d.stats?.map(x=>x.label+' '+(x.value>=0?'+':'')+number(x.value)+(x.unit||'')).join(' · ')||'전용 효과가 있는 장비입니다.');box.append(stats);explanation(box);
   box.append(button('편성·장비에서 확인',()=>acknowledge(p.kind,true,p.slot,owned?.owner),false,true),button('안내 확인 · 나중에 장착',()=>acknowledge(p.kind)));
  }else{
   box.append(el('p','',p.after.name+'의 첫 장비 장착을 완료했습니다. 무기·방어구·장신구·특수 장비를 각각 확인해 파티를 준비하세요.'));comparison(box,p.before,p.after);
   box.append(el('p','muted','장비 교체는 현재 HP를 회복시키지 않습니다. 이후에도 편성·장비의 비교 표에서 변화를 확인할 수 있습니다.'),button('장착 확인',()=>acknowledge(p.kind),false,true));
  }
  openFor={saveId,kind:p.kind};showModal(p.kind==='ACQUIRED'?'첫 장비 획득':'첫 장비 장착',box);
 }
 const oldParty=partyScreen;
 partyScreen=function(p){
  oldParty(p);const summary=p.querySelector('.equipment-character');if(!summary)return;
  const contribution=game.equipmentContribution(partyOwner),box=el('section','equipment-contribution');box.setAttribute('aria-label','본체와 장비의 능력치 기여');box.append(el('h3','','본체 + 장비'));
  const table=el('table','compare-table'),head=el('tr');for(const text of ['능력치','본체','장비','합계'])head.append(el('th','',text));table.append(head);
  for(const [label,key]of labels){const row=el('tr'),bonus=contribution.bonus[key];row.append(el('th','',label),el('td','',number(contribution.base[key])),el('td',bonus>0?'stat-up':bonus<0?'stat-down':'',(bonus>0?'+':'')+number(bonus)),el('td','',number(contribution.total[key])));table.append(row);}box.append(table,el('small','muted','장비 기여는 실제 능력치의 차이입니다. 전투 중 버프·슬롯 효과는 제외합니다.'));summary.querySelector('.stat-grid')?.after(box);
  p.insertBefore(button('장비 사용법 다시 보기',help),p.querySelector('.formation-grid'));
  const list=p.querySelector('.equipment-list'),items=game.s.inventory.filter(i=>i.equip&&itemCategory(i)===equipmentCategory);
  [...(list?.querySelectorAll('.equipment-choice')||[])].forEach((button,index)=>{const inv=items[index];if(!inv)return;const d=detail(inv.equip,inv.slot);button.prepend(itemGlyph(d));button.append(el('small','equipment-base-stats',d.stats?.map(x=>x.label+' '+(x.value>=0?'+':'')+number(x.value)+(x.unit||'')).join(' · ')||'전용 효과 장비'));});
 };
 const oldHelp=openGameHelp;
 openGameHelp=function(){oldHelp();if(game)document.getElementById('modal-body').append(button('장비 사용법',help));};
 const oldRender=render;
 render=function(){oldRender();if(!game){openFor=null;return;}if(openFor&&openFor.saveId!==game.s.global.SAVE_ID)openFor=null;if(queued)return;queued=true;queueMicrotask(()=>{queued=false;showPending();});};
 // Closing/Escape counts as acknowledging, avoiding a popup loop. Reopen from help any time.
 document.getElementById('modal').addEventListener('close',()=>{
  const pending=openFor;openFor=null;if(!pending||game?.s.global.SAVE_ID!==pending.saveId)return;
  // Explicit buttons commit through act(); wait for that transaction before checking.
  queueMicrotask(()=>{if(!busy&&game?.s.global.SAVE_ID===pending.saveId&&game.equipmentGuidePending()?.kind===pending.kind)act('EQUIPMENT_GUIDE_ACK',{kind:pending.kind});});
 });
})();
