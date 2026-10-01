/* Spiral Abyss screen (0.14.3): three chambers per floor, rest breaks, the floor mark and first-clear rewards. */
(function(){
'use strict';
function pick(p,label,rows){const l=el('label','form-label',label),s=el('select');for(const [id,name]of rows){const o=el('option','',name);o.value=id;s.append(o);}l.append(s);p.append(l);return s;}
const who=id=>id==='PLAYER_CUSTOM'?(game.s.global.PLAYER_NAME||'주인공'):safeName('07_CHAR_DB',id);
const hpOf=id=>id==='PLAYER_CUSTOM'?[game.s.global.PLAYER_HP_CURRENT,game.s.global.PLAYER_HP_MAX]:[game.s.chars[id]?.hp||0,game.character(id).maxHp];
const n=v=>String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
function foodLabel(row){const heal=Number(row[8]||0),status=game.tables['13_STATUS_EFFECT_DB']?.get(row[9]);return row[1]+' ('+game.itemCount(row[0])+'개) · '+(heal?'HP '+heal+' 회복':(status?.[1]||'전투 효과'));}
function foods(){return [...game.tables['14_ITEM_DB'].values()].filter(r=>r[2]==='음식'&&(Number(r[8]||0)>0||r[9])&&game.itemCount(r[0])>0).sort((a,b)=>Number(b[8]||0)-Number(a[8]||0));}
function roomList(rooms,current){const ol=el('ol','abyss-rooms');for(const r of rooms){const li=el('li',current===r.chamber?'current':'');li.append(el('strong','',r.chamber+'번 방 「'+r.name+'」'),el('small','muted',' 제한 '+r.limit+'라운드 · 적 '+r.foes+'명'),el('p','',r.hint));ol.append(li);}return ol;}
function confirmBox(title,text,label,run){const box=el('div');box.append(el('p','',text),button(label,run,false,true),button('돌아가기',abyssScreen));showModal(title,box);}
function breakPanel(p,v){
 const a=v.active,room=a.room,c=el('section','card abyss-break');
 c.append(el('h2','',a.floor+'층 · '+a.floorName+' — '+a.chamber+'번 방 앞에서 숨 고르기'),
  el('p','','지난 방에서 잃은 HP는 그대로입니다. 음식은 한 사람당 한 번에 하나씩 먹을 수 있고, 같은 회복 음식을 연달아 먹을 수는 없습니다. 장비와 진형은 바꿀 수 있지만 파티원은 바꿀 수 없습니다.'),
  el('h3','','다음: '+a.chamber+'번 방 「'+room.name+'」'),el('p','abyss-hint',room.hint),el('small','muted','제한 '+room.limit+'라운드'));
 const list=el('div','abyss-party'),menu=foods(),pending=game.s.pendingCombatEffects||{};
 for(const id of a.party){
  const [hp,max]=hpOf(id),row=el('div','abyss-member'+(hp<=0?' down':''));
  row.append(el('strong','',who(id)),el('span','',hp>0?'HP '+n(hp)+' / '+n(max):'전투불능'));
  const bar=el('div','abyss-hp');bar.style.setProperty('--hp',Math.max(0,Math.min(1,hp/max)));row.append(bar);
  const buffs=(pending[id]||[]).map(e=>game.tables['13_STATUS_EFFECT_DB']?.get(e.id)?.[1]||e.id);
  if(buffs.length)row.append(el('small','abyss-buffs','다음 방 효과: '+buffs.join(', ')));
  if(hp>0&&menu.length){const s=pick(row,'먹을 음식',menu.map(r=>[r[0],foodLabel(r)]));row.append(button('먹기',async()=>{await act('USE_ITEM',{item:s.value,owner:id});abyssScreen();}));}
  list.append(row);
 }
 if(!menu.length)list.append(el('p','muted','가방에 먹을 수 있는 음식이 없습니다.'));
 c.append(list,button(a.chamber+'번 방 입장',async()=>{document.getElementById('modal').close();await act('ABYSS_ENTER',{floor:a.floor});},!!game.actionReason('ABYSS_ENTER',{floor:a.floor}),true),
  button('도전 포기',()=>confirmBox('도전 포기',a.floor+'층 도전을 여기서 멈춥니다. 다시 도전하면 1번 방부터 시작하며, 이 층의 '+v.markName+'은 새겨지지 않습니다.','포기하기',async()=>{await act('ABYSS_RESET',{confirm:true,retreat:true});abyssScreen();})));
 const why=game.actionReason('ABYSS_ENTER',{floor:a.floor});if(why)c.append(el('small','muted',why));
 p.append(c);
}
function floorCard(f,v){
 const d=el('details','card abyss-floor'),s=el('summary');
 s.append(el('strong','',f.floor+'층 · '+f.name),el('span','abyss-badges',[f.cleared?'정복 '+f.best+'라운드':'',f.claimed?'보상 수령':f.cleared?'보상 대기':''].filter(Boolean).join(' · ')));
 d.append(s,el('p','muted','권장 Lv. '+f.level+(f.floor>=10?' · 파티 전원 Lv. 20 필요':'')),roomList(f.rooms,v.active?.floor===f.floor?v.active.chamber:0),el('p','abyss-reward','첫 정복 보상: '+f.reward.text));
 if(!v.active){const b=button(f.cleared?'다시 도전':'입장',async()=>{document.getElementById('modal').close();await act('ABYSS_ENTER',{floor:f.floor});},!!f.reason,!f.cleared);b.title=f.reason;d.append(b);if(f.reason)d.append(el('small','muted',f.reason));}
 if(f.cleared&&!f.claimed&&!v.active){
  if(f.reward.artifact||!f.reward.choice)d.append(button('보상 받기',async()=>{await act('ABYSS_REWARD',{floor:f.floor});abyssScreen();},false,true));
  else{const s=pick(d,'받을 이나즈마 장비',f.reward.choice.map(id=>[id,rewardEquipLabel(id)+' · '+safeName('16_EQUIP_DB',id,2)]));d.append(button('보상 받기',async()=>{await act('ABYSS_REWARD',{floor:f.floor,equipment:s.value});abyssScreen();},false,true));}
 }
 return d;
}
function abyssScreen(){
 if(!game)return;const v=game.abyssView(),p=el('div','abyss-list');
 p.append(el('p','','층마다 방이 세 개 있고, 방마다 전투를 한 번씩 치릅니다. 방과 방 사이에는 음식을 먹으며 숨을 고를 수 있고, HP는 다음 방까지 이어집니다. 한 방이라도 지거나 제한 라운드를 넘기면 그 층은 1번 방부터 다시 도전해야 합니다.'),
  el('p','','세 방을 모두 돌파하면 함께 싸운 동료에게 그 층의 '+v.markName+'이 새겨집니다. '+v.markName+'이 새겨진 동료는 도전을 전부 초기화하기 전까지 다른 층에 나설 수 없습니다. 주인공은 각인이 새겨지지 않습니다.'));
 if(v.active?.phase==='BREAK')breakPanel(p,v);
 const next=Math.min(12,(Object.keys(v.progress.clears).map(Number).sort((a,b)=>b-a)[0]||0)+1);
 for(const f of v.floors){const card=floorCard(f,v);if(f.floor===(v.active?.floor||next)||f.cleared&&!f.claimed)card.open=true;p.append(card);}
 const marks=Object.entries(v.progress.tags);
 p.append(el('h2','',v.markName+' · 다른 층에 나설 수 없는 동료'),el('p','muted','층을 정복할 때 함께 싸운 동료에게 새겨지는 표시입니다. 도전 전체 초기화로 지울 수 있습니다.'),el('p',marks.length?'':'muted',marks.length?marks.sort((a,b)=>a[1]-b[1]).map(([id,f])=>who(id)+' '+f+'층').join(' · '):'아직 각인이 새겨진 동료가 없습니다.'));
 p.append(button('도전 전체 초기화',()=>confirmBox('도전 전체 초기화','모든 층의 정복 기록과 '+v.markName+'이 한꺼번에 지워지고 1층부터 다시 시작합니다. 층 하나만 골라 초기화할 수는 없습니다. 이미 받은 첫 정복 보상은 다시 받을 수 없습니다.','전체 초기화',async()=>{await act('ABYSS_RESET',{confirm:true});abyssScreen();}),!!game.actionReason('ABYSS_RESET',{confirm:true})));
 showModal('나선비경',p);
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
