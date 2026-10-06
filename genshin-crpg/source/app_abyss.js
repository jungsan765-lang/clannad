/* Spiral Abyss screen (0.14.3): three chambers per floor, rest breaks, the floor mark and first-clear rewards. */
(function(){
'use strict';
// 0.15.25: choices are pictures to press, never a drop-down (AGENTS.md). rows: [value, label, picture path?]
function pick(p,label,rows){const l=el('div','form-label abyss-pick');l.append(el('span','',label));const s=choiceTiles({label,options:rows.map(([value,text,icon])=>({value,label:text,icon:icon||null}))});l.append(s);p.append(l);return s;}
const iconOf=id=>typeof MANIFEST!=='undefined'&&(MANIFEST.itemIcons?.icons?.[id]?.path)||null;
const who=id=>id==='PLAYER_CUSTOM'?(game.s.global.PLAYER_NAME||'주인공'):safeName('07_CHAR_DB',id);
const hpOf=id=>id==='PLAYER_CUSTOM'?[game.s.global.PLAYER_HP_CURRENT,game.s.global.PLAYER_HP_MAX]:[game.s.chars[id]?.hp||0,game.character(id).maxHp];
const n=v=>String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
function foodLabel(row){const heal=Number(row[8]||0),status=game.tables['13_STATUS_EFFECT_DB']?.get(row[9]);return row[1]+' ('+game.itemCount(row[0])+'개) · '+(heal?'HP '+heal+' 회복':(status?.[1]||'전투 효과'));}
function foods(){return [...game.tables['14_ITEM_DB'].values()].filter(r=>r[2]==='음식'&&(Number(r[8]||0)>0||r[9])&&game.itemCount(r[0])>0).sort((a,b)=>Number(b[8]||0)-Number(a[8]||0));}
// 0.15.25: the three rooms side by side as cards (number, name, limit and foes, a short line about them).
function roomList(rooms,current){const ol=el('ol','abyss-rooms');for(const r of rooms){const li=el('li',current===r.chamber?'current':'');li.append(el('b','abyss-room-no',r.chamber),el('strong','','「'+r.name+'」'),el('small','muted','제한 '+r.limit+'라운드 · 적 '+r.foes+'명'),el('p','',r.hint));ol.append(li);}return ol;}
function confirmBox(title,text,label,run){const box=el('div');box.append(el('p','',text),button(label,run,false,true),button('돌아가기',abyssScreen));showModal(title,box);}
function breakPanel(p,v){
 const a=v.active,room=a.room,c=el('section','card abyss-break');
 c.append(el('h2','',a.floor+'층 · '+a.floorName+' — '+a.chamber+'번 방 앞에서 숨 고르기'),
  el('p','abyss-rule-line','HP는 그대로 · 음식은 한 사람당 하나씩(같은 회복 음식 연달아 불가) · 장비·진형은 바꿀 수 있고 파티원은 그대로'),
  el('h3','','다음: '+a.chamber+'번 방 「'+room.name+'」'),el('p','abyss-hint',room.hint),el('small','muted','제한 '+room.limit+'라운드'));
 const list=el('div','abyss-party'),menu=foods(),pending=game.s.pendingCombatEffects||{};
 for(const id of a.party){
  const [hp,max]=hpOf(id),row=el('div','abyss-member'+(hp<=0?' down':''));
  row.append(el('strong','',who(id)),el('span','',hp>0?'HP '+n(hp)+' / '+n(max):'전투불능'));
  const bar=el('div','abyss-hp');bar.style.setProperty('--hp',Math.max(0,Math.min(1,hp/max)));row.append(bar);
  const buffs=(pending[id]||[]).map(e=>game.tables['13_STATUS_EFFECT_DB']?.get(e.id)?.[1]||e.id);
  if(buffs.length)row.append(el('small','abyss-buffs','다음 방 효과: '+buffs.join(', ')));
  if(hp>0&&menu.length){const s=pick(row,'먹을 음식',menu.map(r=>[r[0],foodLabel(r),iconOf(r[0])]));row.append(button('먹기',async()=>{await act('USE_ITEM',{item:s.value,owner:id});abyssScreen();}));}
  list.append(row);
 }
 if(!menu.length)list.append(el('p','muted','가방에 먹을 수 있는 음식이 없습니다.'));
 c.append(list,button(a.chamber+'번 방 입장',async()=>{document.getElementById('modal').close();await act('ABYSS_ENTER',{floor:a.floor});},!!game.actionReason('ABYSS_ENTER',{floor:a.floor}),true),
  button('도전 포기',()=>confirmBox('도전 포기',a.floor+'층 도전을 여기서 멈춥니다. 다시 도전하면 1번 방부터 시작하며, 이 층의 '+v.markName+'은 새겨지지 않습니다.','포기하기',async()=>{await act('ABYSS_RESET',{confirm:true,retreat:true});abyssScreen();})));
 const why=game.actionReason('ABYSS_ENTER',{floor:a.floor});if(why)c.append(el('small','muted',why));
 p.append(c);
}
// 0.15.25 (user: no screens explained by walls of text): one floor at a time. The floor numbers are buttons in a row;
// the chosen floor shows its three rooms, the first-clear reward and its button.
function floorPanel(f,v){
 const d=el('section','card abyss-floor'),head=el('div','abyss-floor-head');
 head.append(el('h3','',f.floor+'층 · '+f.name),el('span','abyss-floor-level','권장 Lv. '+f.level+(f.floor>=10?' · 파티 전원 Lv. 60 필요':'')));
 const badges=[f.cleared?'정복 '+f.best+'라운드':'',f.claimed?'보상 수령':f.cleared?'보상 대기':''].filter(Boolean);if(badges.length)head.append(el('span','abyss-badges',badges.join(' · ')));
 // The floor's button sits on its title line, so it is in view without scrolling.
 const acts=el('div','abyss-floor-actions');head.append(acts);
 d.append(head,roomList(f.rooms,v.active?.floor===f.floor?v.active.chamber:0),el('p','abyss-reward','첫 정복 보상 · '+f.reward.text));
 if(f.owed)d.append(el('p','abyss-owed','지난 시즌에 정복한 층입니다. 첫 정복 보상을 아직 받지 않았습니다.'));
 if(!v.active){const b=button(f.cleared?'다시 도전':'입장',async()=>{document.getElementById('modal').close();await act('ABYSS_ENTER',{floor:f.floor});},!!f.reason,!f.cleared);b.title=f.reason||'';if(f.reason)b.dataset.reason=f.reason;acts.append(b);if(f.reason)acts.append(el('small','muted',f.reason));}
 if((f.cleared||f.owed)&&!f.claimed&&!v.active){
  if(f.reward.artifact||!f.reward.choice)acts.append(button('보상 받기',async()=>{await act('ABYSS_REWARD',{floor:f.floor});abyssScreen();},false,true));
  else{const s=pick(d,'받을 이나즈마 장비',f.reward.choice.map(id=>[id,rewardEquipLabel(id)+' · '+safeName('16_EQUIP_DB',id,2),iconOf(id)]));d.append(button('보상 받기',async()=>{await act('ABYSS_REWARD',{floor:f.floor,equipment:s.value});abyssScreen();},false,true));}
 }
 return d;
}
let picked=null;
function floorTabs(v,onPick){
 const row=el('div','abyss-floors');row.setAttribute('role','tablist');row.setAttribute('aria-label','층');
 for(const f of v.floors){const here=v.active?.floor===f.floor,b=button('',()=>onPick(f.floor));b.className='abyss-floor-tab'+(f.cleared?' cleared':'')+(here?' active':'')+(f.reason&&!f.cleared&&!here?' locked':'');b.dataset.floor=f.floor;b.setAttribute('role','tab');
  b.setAttribute('aria-label',f.floor+'층 '+f.name+(f.cleared?' · 정복':here?' · 도전 중':''));b.title=f.floor+'층 · '+f.name+' · 권장 Lv. '+f.level;b.append(el('b','',f.floor),el('small','',f.cleared?(f.claimed?'정복':'보상'):here?'도전 중':'Lv.'+f.level));row.append(b);}
 return row;
}
// 0.14.15 seasons: this month's season, its time left, last season's best and the 나선 문장 (one per season at floor 10+).
function seasonCard(v){
 const c=el('section','card abyss-season'),head=el('div','abyss-season-head');
 head.append(el('strong','',v.seasonLabel),el('span','abyss-season-left',v.seasonEnds?left(v.seasonEnds):'시즌 기록 집계 전'));c.append(head);
 const last=v.history.at(-1);c.append(el('p','abyss-season-line','이번 시즌 최고 · '+(v.best.floor?v.best.floor+'층':'아직 없음')+(last?' · 지난 기록 · '+last.label+' '+last.floor+'층':'')));
 c.append(el('small','abyss-rule-line','매달 1일 0시 새 시즌 · '+CRPGRuntime.abyssSeason.medalFloor+'층 이상 정복하면 그 시즌의 나선 문장(10층 은빛 · 11층 보랏빛 · 12층 금빛)'));
 if(v.medals.length){const row=el('div','abyss-medals');for(const m of v.medals){const text=m.label.replace(/ 시즌$/,'')+' · '+m.floor+'층',b=window.CRPGProfile?.medal?window.CRPGProfile.medal(m.floor,text,'wide'):el('span','abyss-medal',text);b.removeAttribute('aria-hidden');b.title='나선 문장 · '+m.label+' '+m.floor+'층 정복'+(m.current?' (이번 시즌)':'');row.append(b);}c.append(row);}
 return c;
}
function left(at){const ms=at-Date.now();if(ms<=0)return '곧 새 시즌';const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000);return '남은 기간 '+(d?d+'일 ':'')+h+'시간';}
function abyssScreen(){
 if(!game)return;const v=game.abyssView(),p=el('div','abyss-list');
 p.append(seasonCard(v),el('p','abyss-rule-line','층마다 방 3개 · HP는 다음 방까지 이어짐 · 지거나 제한 라운드를 넘기면 그 층 1번 방부터'));
 if(v.active?.phase==='BREAK')breakPanel(p,v);
 // The floor shown first: the one being challenged, then one with a reward waiting, then the next to clear.
 const next=Math.min(12,(Object.keys(v.progress.clears).map(Number).sort((a,b)=>b-a)[0]||0)+1),owed=v.floors.find(f=>(f.cleared||f.owed)&&!f.claimed);
 if(v.active)picked=v.active.floor;else if(!v.floors.some(f=>f.floor===picked))picked=owed?.floor||next;
 const slot=el('div','abyss-floor-slot'),tabs=floorTabs(v,floor=>{picked=floor;show();});
 const show=()=>{for(const b of tabs.children){const on=Number(b.dataset.floor)===picked;b.classList.toggle('selected',on);b.setAttribute('aria-selected',String(on));}slot.replaceChildren(floorPanel(v.floors.find(f=>f.floor===picked)||v.floors[0],v));};
 show();p.append(tabs,slot);
 const marks=Object.entries(v.progress.tags),markBox=el('section','abyss-marks');
 markBox.append(el('h2','',v.markName+' · 다른 층에 나설 수 없는 동료'),el('p','abyss-rule-line','정복할 때 함께 싸운 동료에게 새겨짐 · 새겨진 동료는 전체 초기화 전까지 다른 층 불가 · 주인공 제외'),el('p',marks.length?'':'muted',marks.length?marks.sort((a,b)=>a[1]-b[1]).map(([id,f])=>who(id)+' '+f+'층').join(' · '):'아직 각인이 새겨진 동료가 없습니다.'));
 markBox.append(button('도전 전체 초기화',()=>confirmBox('도전 전체 초기화','모든 층의 정복 기록과 '+v.markName+'이 한꺼번에 지워지고 1층부터 다시 시작합니다. 층 하나만 골라 초기화할 수는 없습니다. 이미 받은 첫 정복 보상은 다시 받을 수 없습니다.','전체 초기화',async()=>{await act('ABYSS_RESET',{confirm:true});abyssScreen();}),!!game.actionReason('ABYSS_RESET',{confirm:true})));
 p.append(markBox);showModal('나선비경',p);
}
window.CRPGAbyssScreen=abyssScreen;
const abyssLocation=drawLocation;
drawLocation=function(p,v){
 abyssLocation(p,v);const card=p.querySelector('.abyss-entrance');if(!card||!game)return;const a=game.abyssView().active;
 card.replaceChildren(el('h2','','나선비경'),el('p','',a?a.floor+'층 '+a.chamber+'번 방 앞에서 숨을 고르고 있습니다. 음식을 먹고 다음 방에 들어가세요.':'바다 한가운데, 아래로 이어지는 입구가 열려 있다. 파티와 장비를 정비한 뒤 도전하자.'),button(a?'숨 고르기 · 다음 방 준비':'나선비경 입장',abyssScreen,!!game.s.runtime,!!a));
};
const abyssReward=reward;
reward=function(p){
 abyssReward(p);const r=parseUI(game.s.global.LAST_BATTLE_RESULT_JSON),a=r.abyss;if(!a||game.needsRecovery())return;
 const c=el('section','card abyss-result'),mark=game.abyssView().markName;
 if(a.outcome==='NEXT')c.append(el('h2','',a.floor+'층 '+a.chamber+'번 방 돌파'),el('p','',a.rounds+'라운드 만에 돌파했습니다. 다음은 '+a.next.chamber+'번 방 「'+a.next.room+'」입니다.'),el('p','abyss-hint',a.next.hint),button('숨 고르기 · 다음 방 준비',abyssScreen,false,true));
 else if(a.outcome==='CLEARED')c.append(el('h2','',a.floor+'층 정복!'),el('p','','세 방 합계 '+a.total+'라운드.'+(a.marked.length?' '+a.marked.map(who).join(', ')+'에게 '+a.floor+'층 '+mark+'이 새겨졌습니다.':'')),a.firstClear?el('p','','첫 정복 보상을 받을 수 있습니다.'):el('p','muted','첫 정복 보상은 이미 받았습니다.'),button('나선비경 열기',abyssScreen,false,true));
 else c.append(el('h2','',a.floor+'층 도전 실패'),el('p','',a.chamber+'번 방 「'+a.room+'」에서 '+({TIMEOUT:'제한 라운드를 넘겨',DOWNED:'주인공이 쓰러져',DEFEAT:'파티가 쓰러져'}[a.outcome]||'')+' 도전이 끝났습니다. 다시 도전하면 1번 방부터 시작합니다.'));
 p.querySelector('h1')?.after(c);
};
})();
