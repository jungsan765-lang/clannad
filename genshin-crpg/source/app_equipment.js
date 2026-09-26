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
  box.append(el('p','','장비는 소지품에 가지고만 있어서는 효과가 없습니다. 왼쪽 메뉴의 장비 장착에서 파티원마다 무기·방어구·장신구·특수 장비 칸을 눌러 장착하세요.'));
  for(const [title,text]of [
   ['1. 바꿀 칸 누르기','편성된 파티원만 장비 장착 화면에 나옵니다. 칸에 마우스를 올리면 지금 장비의 효과가 보이고, 누르면 바꿔 낄 장비 목록이 열립니다.'],
   ['2. 바뀌는 능력치 확인','목록의 각 장비 아래에 장착하면 오르고 내리는 능력치가 표시됩니다. 무기는 캐릭터의 무기 종류와 요구 레벨을 확인하세요.'],
   ['3. 장착 버튼 누르기','장착을 눌러야 능력치가 적용됩니다. 다른 파티원이 쓰던 장비는 옮겨서 장착합니다. 편성에서 빠지면 그 동료의 장비는 소지품으로 돌아오며, 빼기 전에 한 번 알려 드립니다.'],
   ['4. 전투 전 회복','최대 HP가 올라가도 현재 HP는 자동 회복되지 않습니다. 음식이나 숙박으로 준비하세요. 전투 중에는 장비를 바꿀 수 없습니다.']
  ])box.append(el('h3','',title),el('p','',text));
  box.append(el('p','muted','몬드 대장간에서 강화 확률과 비용을 확인하세요. +10 이후에는 보스 재료로 +12 한도를 돌파할 수 있습니다.'));
 }
 function help(){if(!game)return;const box=el('div','equipment-guide');explanation(box);showModal('장비 사용법',box);}
 window.openEquipmentHelp=help;
 async function acknowledge(kind,goGear=false,slot=null,owner='PLAYER_CUSTOM'){
  const saveId=game?.s.global.SAVE_ID;document.getElementById('modal').close();
  const receipt=await act('EQUIPMENT_GUIDE_ACK',{kind});if(!receipt?.ok||game?.s.global.SAVE_ID!==saveId)return;
  if(goGear&&!game.actionReason('MENU',{screen:'STATUS'}))await openGear(slot,owner);
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
   box.append(button('장비 장착에서 확인',()=>acknowledge(p.kind,true,p.slot,owned?.owner),false,true),button('안내 확인 · 나중에 장착',()=>acknowledge(p.kind)));
  }else{
   box.append(el('p','',p.after.name+'의 첫 장비 장착을 완료했습니다. 무기·방어구·장신구·특수 장비를 각각 확인해 파티를 준비하세요.'));comparison(box,p.before,p.after);
   box.append(el('p','muted','장비 교체는 현재 HP를 회복시키지 않습니다. 이후에도 장비 장착 화면에서 변화를 확인할 수 있습니다.'),button('장착 확인',()=>acknowledge(p.kind),false,true));
  }
  openFor={saveId,kind:p.kind};showModal(p.kind==='ACQUIRED'?'첫 장비 획득':'첫 장비 장착',box);
 }
 // Equipment moved to the 장비 장착 screen (app_gear.js); 편성 only arranges the party.
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
