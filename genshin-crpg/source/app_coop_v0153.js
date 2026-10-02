/* 0.15.3 다인 모드 화면 (runtime_coop_v0153.js, server/coop-v0153.mjs). Paimon's menu (다인 모드), 「같이 하기」 on an
 * adventurer's card and invitations open the window: the rooms that take guests, opening a room (in the list, or by
 * invitation only), the character one brings (protagonist or a companion who joined, with level, 운명의 자리 and gear), the
 * room itself (members, what each brought, ready, a fight running) with leave / kick / close / invite.
 * A guest does not run the host's game: their own battle window shows the host's fight from the server's views (both
 * sides with HP, whose turn it is with the 20-second count, their own cards with the reason when one cannot be used, and
 * the targets). The host keeps the usual battle screen, which marks the guests' fighters and says when it waits for one.
 * When a guest's 20 seconds are over, every client in the room asks the server to let the AI play that turn (the server
 * checks the time). Load after app_chat.js, app_profile_v01415.js and app_raid_v0152.js. */
(function(){'use strict';
const SHELL=window.CRPGShell,O=window.CRPGOnline,RULES=window.CRPGRuntime?.coopV0153;if(!SHELL||!RULES)return;
const C=window.CRPGCoop={enabled:null,status:null,list:null,node:null,view:'home',msg:'',busy:false,loading:false,probe:0,joining:null,battle:null,battleAt:0,shown:null,
 ended:null,rewards:null,invites:[],inviteNode:null,card:'',target:'',branch:'',autoAsked:'',tick:0,poll:0,minimized:false,online:null};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const btn=(label,fn,cls='',why='')=>{const b=mk('button','cp-btn '+cls,label);b.type='button';b.onclick=fn;if(why){b.disabled=true;b.title=why;b.dataset.reason=why;}return b;};
const SND=n=>{try{window.CRPGSound?.play(n);}catch{}};
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ready=()=>typeof game!=='undefined'&&!!game&&typeof game.coopCharChoices==='function';
const online=()=>!!(O?.token&&O?.account);
const isBusy=()=>(typeof busy!=='undefined'&&busy)||!!O?.pending;
const itemName=id=>{try{return game.tables['14_ITEM_DB'].get(id)?.[1]||id;}catch{return id;}};
const toast=t=>{try{SHELL.toast?.(t);}catch{}};
const room=()=>C.status?.room||null;
const host=()=>room()?.you==='HOST';
// Why one cannot take part right now (shown on locked buttons and in the window).
function reason(){
 if(!ready())return '게임을 불러오는 중입니다.';
 if(!online())return '다인 모드는 온라인 계정으로 접속했을 때 열립니다.';
 if(!O.active)return '계정 여정을 연 뒤에 함께할 수 있습니다.';
 if(C.enabled===false)return '이 서버에서는 다인 모드가 열리지 않았습니다.';
 return game.coopLevelReason?.()||'';
}
// ---------- the server ----------
async function load(){
 if(!online()||C.loading)return;C.loading=true;
 try{const out=await O.request('/coop/room');C.enabled=true;apply(out);}
 catch(e){if(e.status===404){C.enabled=false;C.status=null;}else if(C.node)C.msg=e.message;}
 finally{C.loading=false;}
 draw();drawBattle();
}
C.reload=load;
async function loadList(){if(!online()||C.enabled===false)return;try{const out=await O.request('/coop/list');C.list=out.rooms||[];}catch(e){if(e.status===404)C.enabled=false;else C.msg=e.message;}draw();}
function apply(out){
 C.status=out;C.invites=out.invites||[];
 if(out.rewards?.length)showRewards(out.rewards);
 setBattle(out.battle||null);
 if(!out.room)closeBattle(true);
 schedule();
}
async function call(path,body,ok){
 if(C.busy)return null;C.busy=true;C.msg='';draw();
 try{const out=await O.request(path,body||{});if(ok){toast(ok);SND('menu_open');}return out;}
 catch(e){C.msg=e.message;SND('error');return null;}
 finally{C.busy=false;draw();}
}
async function openRoom(visibility){const out=await call('/coop/open',{visibility},visibility==='INVITE'?'초대한 모험가만 들어올 수 있는 방을 열었습니다.':'방을 열었습니다. 모집 중인 방 목록에 보입니다.');if(out){C.view='home';await load();}}
async function join(id,char){const out=await call('/coop/join',{room:id,char},'방에 들어갔습니다.');if(out){C.joining=null;C.view='home';await load();}}
async function changeChar(char){const out=await call('/coop/char',{char},'함께할 캐릭터를 바꿨습니다.');if(out){C.joining=null;C.view='home';await load();}}
async function leave(){const h=host(),out=await call(h?'/coop/close':'/coop/leave',{},h?'방을 닫았습니다.':'방에서 나왔습니다.');if(out){C.status={...C.status,room:null,battle:null};closeBattle(true);await load();await loadList();}}
async function kick(pid){const out=await call('/coop/kick',{pid},'방에서 내보냈습니다.');if(out)await load();}
async function setReady(v){const out=await call('/coop/ready',{ready:v},v?'함께 싸울 준비가 되었습니다.':'잠시 쉬는 중으로 바꿨습니다.');if(out)await load();}
async function invite(pid,name){const out=await call('/coop/invite',{pid},(name||'모험가')+' 님을 초대했습니다.');if(out)await load();return !!out;}
async function decline(id){await call('/coop/decline',{room:id});C.invites=C.invites.filter(x=>x.room!==id);closeInvite();draw();}
// Online adventurers to invite (from the chat's list).
async function loadOnline(){try{C.online=(await O.request('/online')).players||[];}catch{C.online=[];}draw();}
// ---------- the window ----------
function close(){if(!C.node)return;const n=C.node;C.node=null;n.classList.remove('open');setTimeout(()=>n.remove(),160);SND('menu_close');schedule();}
C.close=close;
C.open=function(opts={}){
 C.msg='';if(opts.join){C.joining={room:opts.join,host:opts.hostName||''};C.view='pick';}else if(!C.node)C.view='home';
 if(!C.node){const wrap=mk('div','cp-overlay');wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','다인 모드');
  wrap.addEventListener('click',e=>{if(e.target===wrap)close();});wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
  wrap.append(mk('div','cp-box'));document.body.append(wrap);C.node=wrap;requestAnimationFrame(()=>wrap.classList.add('open'));SND('menu_open');}
 draw();load().then(()=>{if(!room())loadList();});schedule();
};
function head(title,sub,back){
 const h=mk('header','cp-head');if(back){const b=mk('button','cp-back');b.type='button';b.setAttribute('aria-label','뒤로');b.append(SHELL.icon('BACK','shell-icon'));b.onclick=back;h.append(b);}
 h.append(SHELL.icon('COOP','shell-icon cp-head-icon'));const t=mk('div','cp-head-copy');t.append(mk('strong','',title),mk('small','',sub));h.append(t);
 const x=mk('button','cp-close');x.type='button';x.setAttribute('aria-label','닫기');x.append(SHELL.icon('CLOSE','shell-icon'));x.onclick=close;h.append(x);return h;
}
function charCard(c,{onPick,picked,why}={}){
 const card=mk(onPick?'button':'div','cp-char rarity-'+(c?.rarity||4)+(picked?' picked':''));if(onPick){card.type='button';card.onclick=onPick;if(why){card.disabled=true;card.title=why;card.dataset.reason=why;}}
 if(!c){card.append(mk('span','cp-char-name','—'));return card;}
 let face;try{face=typeof actorPortrait==='function'&&!c.player?actorPortrait(c.id,'cp-face'):null;}catch{face=null;}
 card.append(face||mk('span','cp-face cp-face-glyph',c.player?'✦':'✧'));
 const copy=mk('span','cp-char-copy');copy.append(mk('strong','',c.name),mk('small','','Lv.'+c.level+(c.player?' · '+(c.route||'주인공'):' · '+'★'.repeat(c.rarity||4))+(c.constellation?' · 운명의 자리 '+c.constellation:'')));
 const stats=mk('small','cp-char-stats','HP '+fmt(c.hp)+' · 공격 '+fmt(c.atk)+' · 방어 '+fmt(c.def)+(c.talents?' · 특성 '+c.talents.na+'/'+c.talents.e+'/'+c.talents.q:''));copy.append(stats);
 const gear=(c.gear||[]).map(g=>g.name+(g.enhance?' +'+g.enhance:'')).join(' · ');copy.append(mk('small','cp-char-gear',gear?'장비 · '+gear:'장비 없음'));
 card.append(copy);if(why&&onPick)card.append(mk('em','cp-char-why',why));return card;
}
function draw(){
 const wrap=C.node;if(!wrap)return;const box=wrap.querySelector('.cp-box'),parts=[];
 const why=reason(),r=room();
 if(C.view==='pick'){parts.push(...pickView());}
 else if(r){parts.push(head('다인 모드',(r.you==='HOST'?'내 방':'방장 '+r.host.name)+' · '+(r.visibility==='INVITE'?'초대 전용':'공개 모집')+' · '+r.count+' / '+r.max+'명'),roomView(r));}
 else{parts.push(head('다인 모드','필드 전투를 다른 모험가와 함께 · 최대 4명'),homeView(why));}
 if(C.msg){const m=mk('p','cp-msg',C.msg);m.setAttribute('role','alert');parts.push(m);}
 box.replaceChildren(...parts);
}
function rulesBox(){
 const s=mk('section','cp-rules');const R=C.status?.rules;
 s.append(mk('p','','함께 싸우는 전투 · '+(R?.shared||RULES.text.shared)),mk('p','','혼자 하는 전투 · '+(R?.solo||RULES.text.solo)),
  mk('p','','방장의 주인공과 손님 최대 3명이 각자 데려온 캐릭터 하나로 싸웁니다. 손님의 차례에는 '+(RULES.turnMs/1000)+'초 안에 고르고, 넘기면 스스로 싸웁니다. 보상은 각자의 여정에 들어가고, 패배해도 손님은 잃는 것이 없습니다.'));
 return s;
}
function homeView(why){
 const body=mk('div','cp-body');
 if(C.enabled===false){body.append(mk('p','cp-empty','이 서버에서는 다인 모드가 열리지 않았습니다.'));return body;}
 for(const inv of C.invites){const row=mk('section','cp-invite-row');row.append(mk('strong','',inv.from.name+' 님의 초대'),btn('함께하기',()=>{C.joining={room:inv.room,host:inv.from.name};C.view='pick';draw();},'primary',why),btn('거절',()=>decline(inv.room)));body.append(row);}
 const open=mk('section','cp-open');open.append(mk('h3','','방 열기'));
 const row=mk('div','cp-row');row.append(btn('공개 모집으로 열기',()=>openRoom('PUBLIC'),'primary',why||(C.busy?'잠시 기다려 주세요.':'')),btn('초대 전용으로 열기',()=>openRoom('INVITE'),'',why||(C.busy?'잠시 기다려 주세요.':'')));open.append(row);
 if(why)open.append(mk('p','cp-why',why));body.append(open);
 const list=mk('section','cp-list');const h=mk('h3','','모집 중인 방');h.append(btn('새로 고침',loadList,'cp-mini'));list.append(h);
 if(!C.list)list.append(mk('p','cp-empty','방 목록을 불러오는 중…'));
 else if(!C.list.length)list.append(mk('p','cp-empty','지금 모집 중인 방이 없습니다. 방을 열고 기다려 보세요.'));
 for(const x of C.list||[]){
  const item=mk('article','cp-room'+(x.invited?' invited':''));const t=mk('div','cp-room-copy');
  t.append(mk('strong','',x.host.name+' 님의 방'),mk('small','','방장 Lv.'+x.host.level+' · '+x.count+' / '+x.max+'명'+(x.fighting?' · 전투 중':'')+(x.invited?' · 초대받음':'')));
  if(x.members.length)t.append(mk('small','cp-room-members',x.members.map(m=>m.name+'('+m.char+' Lv.'+m.level+')').join(', ')));item.append(t);
  item.append(btn('참여',()=>{C.joining={room:x.id,host:x.host.name};C.view='pick';draw();},'primary',why||(x.full?'방이 가득 찼습니다.':'')));list.append(item);
 }
 body.append(list,rulesBox());return body;
}
function pickView(){
 const r=room(),change=!!r&&r.you==='GUEST'&&(!C.joining||C.joining.room===r.id),why=reason();
 const h=head(change?'함께할 캐릭터 바꾸기':'함께할 캐릭터 고르기',change?'다음 전투부터 바뀝니다':(C.joining?.host?C.joining.host+' 님의 방':'방에 들어가기'),()=>{C.view='home';C.joining=null;draw();});
 const body=mk('div','cp-body');body.append(mk('p','cp-note','주인공이나 합류한 동료 한 명을 데려갑니다. 레벨·장비·강화·성유물·운명의 자리·특성이 그대로 함께합니다.'));
 const grid=mk('div','cp-chars');let list=[];try{list=game.coopCharChoices();}catch{}
 // In one's own room the companions the others brought are known; elsewhere the server says so when one is taken.
 const taken=new Set(change?(r.members||[]).filter(m=>!m.me&&m.char&&!m.char.player).map(m=>m.char.id):[]);
 for(const c of list){const busyWhy=why||(c.reason)||(taken.has(c.id)?'다른 모험가가 이미 데려왔습니다.':'')||(C.busy?'잠시 기다려 주세요.':'');grid.append(charCard(c,{onPick:()=>change?changeChar(c.id):join(C.joining?.room,c.id),why:busyWhy}));}
 if(!list.length)grid.append(mk('p','cp-empty','데려갈 캐릭터가 없습니다.'));
 body.append(grid);return [h,body];
}
function roomView(r){
 const body=mk('div','cp-body');const me=r.members.find(m=>m.me),why=reason();
 const b=r.battle;const state=mk('section','cp-state'+(b?.running?' running':''));
 state.append(mk('strong','',b?.running?(b.shared?'전투 중 · '+(b.opening?'시작 전':'라운드 '+b.round):'방장이 혼자 싸우는 중'):'전투를 기다리는 중'),
  mk('small','',b?.running?(b.shared?(b.title||'함께 싸우는 전투')+(r.you==='GUEST'?' · '+(me&&C.battle?.me?'내 캐릭터가 싸우고 있습니다':'다음 라운드부터 함께 싸웁니다'):''):b.solo):(r.you==='HOST'?'필드에서 전투가 시작되면 손님들이 함께 싸웁니다.':'방장이 필드에서 싸움을 시작하면 함께 싸웁니다.')));
 if(r.you==='GUEST'&&b?.shared&&C.battle)state.append(btn('전투 화면 보기',()=>{C.minimized=false;openBattle();},'primary'));
 body.append(state);
 const team=mk('section','cp-team');team.append(mk('h3','','함께하는 모험가'));
 const hostRow=mk('div','cp-member host');hostRow.append(charCard(r.host.char),mk('span','cp-member-who',r.host.name+' · 방장'+(r.host.online?'':' · 접속 끊김')));team.append(hostRow);
 for(const m of r.members){const row=mk('div','cp-member'+(m.me?' me':''));row.append(charCard(m.char));const who=mk('span','cp-member-who',m.name+(m.me?' (나)':''));
  who.append(mk('em','cp-ready '+(m.present?'on':'off'),m.ready?(m.here?'준비':'자리 비움'):'쉬는 중'));row.append(who);
  if(r.you==='HOST')row.append(btn('내보내기',()=>kick(m.pid),'cp-mini',C.busy?'잠시 기다려 주세요.':''));team.append(row);}
 for(let i=r.members.length;i<r.max;i++)team.append(mk('div','cp-member empty','빈자리'));
 body.append(team);
 const acts=mk('section','cp-actions');
 if(r.you==='GUEST'){acts.append(btn('캐릭터 바꾸기',()=>{C.joining={room:r.id,host:r.host.name};C.view='pick';draw();},'',why||(C.busy?'잠시 기다려 주세요.':'')),btn(me?.ready?'잠시 쉬기':'준비 완료',()=>setReady(!me?.ready),me?.ready?'':'primary',C.busy?'잠시 기다려 주세요.':''),btn('방 나가기',leave,'cp-danger',C.busy?'잠시 기다려 주세요.':''));}
 else{acts.append(btn(r.visibility==='INVITE'?'공개 모집으로 바꾸기':'초대 전용으로 바꾸기',()=>openRoom(r.visibility==='INVITE'?'PUBLIC':'INVITE'),'',C.busy?'잠시 기다려 주세요.':''),btn('방 닫기',leave,'cp-danger',C.busy?'잠시 기다려 주세요.':''));}
 body.append(acts);
 if(r.you==='HOST'){
  const inv=mk('section','cp-invite');const h=mk('h3','','초대하기');h.append(btn('접속 중인 모험가 보기',loadOnline,'cp-mini'));inv.append(h);
  if(r.invites.length)inv.append(mk('p','cp-note','초대 보냄 · '+r.invites.map(x=>x.name).join(', ')));
  if(C.online){if(!C.online.length)inv.append(mk('p','cp-empty','지금 접속 중인 다른 모험가가 없습니다.'));
   for(const p of C.online.slice(0,20)){const row=mk('div','cp-online');row.append(mk('span','',p.name));const inRoom=r.members.some(m=>m.pid===p.pid);row.append(btn(inRoom?'함께하는 중':'초대',()=>invite(p.pid,p.name),'cp-mini',inRoom?'이미 방에 있습니다.':r.count>=r.max?'방이 가득 찼습니다.':''));inv.append(row);}}
  else inv.append(mk('p','cp-note','모험가 정보 카드의 「같이 하기」로도 초대할 수 있습니다.'));
  body.append(inv);
 }
 body.append(rulesBox());return body;
}
// ---------- invitations and rewards ----------
function showInvite(inv){
 closeInvite();const n=mk('div','cp-invite-pop');n.setAttribute('role','alertdialog');n.setAttribute('aria-label','다인 모드 초대');
 n.append(mk('strong','',inv.from.name+' 님이 다인 모드에 초대했습니다'),mk('small','','2분 안에 들어가지 않으면 사라집니다.'));
 const row=mk('div','cp-row');const why=reason();row.append(btn('함께하기',()=>{closeInvite();C.open({join:inv.room,hostName:inv.from.name});},'primary',why),btn('거절',()=>decline(inv.room)));n.append(row);
 if(why)n.append(mk('p','cp-why',why));document.body.append(n);C.inviteNode=n;SND('notice');setTimeout(()=>{if(C.inviteNode===n)closeInvite();},122000);
}
function closeInvite(){C.inviteNode?.remove();C.inviteNode=null;}
function rewardLine(w){const parts=[];if(w.xp)parts.push(w.charName+' 경험치 '+fmt(w.xp));if(w.mora)parts.push(fmt(w.mora)+' 모라');for(const [id,n] of Object.entries(w.items||{}))parts.push(itemName(id)+' '+n+'개');return parts.join(' · ')||'받은 것이 없습니다';}
function showRewards(list){C.rewards=list;for(const w of list)toast('다인 모드 보상 · '+rewardLine(w));SND('chest_reward');drawBattle();draw();}
// ---------- the guest's battle window ----------
function setBattle(view){
 const before=C.battle;C.battle=view;C.battleAt=Date.now();if(view)C.lastTitle=view.title||view.encounter||'';
 if(view&&(!before||before.battle!==view.battle)){C.ended=null;C.rewards=null;C.card='';C.target='';C.branch='';C.autoAsked='';if(room()?.you==='GUEST'&&!C.minimized)openBattle();}
 if(view&&view.turn?.mine&&before?.turn?.actor!==view.turn.actor){SND('notice');if(C.minimized)toast('내 차례입니다 · '+(RULES.turnMs/1000)+'초 안에 골라 주세요.');}
 drawBattle();schedule();
}
function openBattle(){
 if(room()?.you!=='GUEST')return;C.minimized=false;
 if(!C.shown){const wrap=mk('div','cp-battle');wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','다인 모드 전투');
  wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();minimize();}});
  wrap.append(mk('div','cp-bbox'));document.body.append(wrap);C.shown=wrap;requestAnimationFrame(()=>wrap.classList.add('open'));}
 document.querySelector('body > .cp-pill')?.remove();drawBattle();
}
function minimize(){C.minimized=true;if(C.shown){const n=C.shown;C.shown=null;n.classList.remove('open');setTimeout(()=>n.remove(),160);}pill();}
function closeBattle(all){if(C.shown){const n=C.shown;C.shown=null;n.classList.remove('open');setTimeout(()=>n.remove(),160);}if(all){C.battle=null;C.ended=null;document.querySelector('body > .cp-pill')?.remove();}}
// A small button to go back to the fight after minimizing it.
function pill(){
 let p=document.querySelector('body > .cp-pill');if(!C.minimized||!C.battle||room()?.you!=='GUEST'){p?.remove();return;}
 if(!p){p=mk('button','cp-pill');p.type='button';p.onclick=openBattle;document.body.append(p);}
 const t=C.battle.turn;p.classList.toggle('mine',!!t?.mine);p.replaceChildren(SHELL.icon('COOP','shell-icon'),mk('span','',t?.mine?'내 차례! · 전투로 돌아가기':'다인 전투 · 라운드 '+C.battle.round));
}
const left=t=>t?.deadline?Math.max(0,Math.ceil((t.deadline-(C.battle?.now||0)-(Date.now()-C.battleAt))/1000)):null;
function unitRow(u,me){
 const row=mk('div','cp-unit'+(u.hp<=0?' down':'')+(u.guest?.mine?' mine':'')+(C.battle?.turn?.actor===u.id?' acting':'')+(C.target===u.id?' targeted':''));row.dataset.id=u.id;
 const top=mk('div','cp-unit-top');top.append(mk('strong','',u.name),mk('small','','Lv.'+u.level));
 if(u.guest)top.append(mk('em','cp-tag'+(u.guest.mine?' me':''),u.guest.mine?'나':u.guest.name));else if(u.host)top.append(mk('em','cp-tag host',u.protagonist?'방장':'방장 동료'));
 if(u.guest?.left)top.append(mk('em','cp-tag auto','스스로 싸움'));if(u.grade==='보스')top.append(mk('em','cp-tag boss','보스'));
 const bar=mk('div','cp-hp');const fill=mk('span','');fill.style.width=Math.max(0,Math.min(100,u.hp/u.maxHp*100)).toFixed(1)+'%';bar.append(fill);
 const nums=mk('small','cp-hp-num',fmt(u.hp)+' / '+fmt(u.maxHp)+(u.shield?' · 보호막 '+fmt(u.shield):''));
 row.append(top,bar,nums);if(u.statuses?.length)row.append(mk('small','cp-unit-st',u.statuses.join(' · ')));
 return row;
}
function drawBattle(){
 pill();const wrap=C.shown;if(!wrap)return;const box=wrap.querySelector('.cp-bbox'),v=C.battle,r=room(),parts=[];
 const h=mk('header','cp-bhead');const t=mk('div','cp-head-copy');
 const sub=[r?'방장 '+r.host.name:'',v?(v.opening?'전투 시작 전':'라운드 '+v.round):C.ended?'전투 결과':''].filter(Boolean).join(' · ');
 t.append(mk('strong','',v?.title||v?.encounter||(C.ended&&C.lastTitle)||'함께 싸우는 전투'),mk('small','',sub));h.append(SHELL.icon('COOP','shell-icon cp-head-icon'),t);
 const mini=mk('button','cp-close');mini.type='button';mini.setAttribute('aria-label','작게 보기');mini.append(SHELL.icon('BACK','shell-icon'));mini.onclick=minimize;mini.title='작게 보기';h.append(mini);parts.push(h);
 const body=mk('div','cp-bbody');
 if(C.ended&&!v){
  const res=mk('section','cp-result '+(C.ended.victory?'win':'lose'));res.append(mk('h2','',C.ended.victory?'승리':'패배'));
  if(C.ended.victory){res.append(mk('p','','전투 보상 · 경험치 '+fmt(C.ended.xp)+' · '+fmt(C.ended.mora)+' 모라'+(Object.keys(C.ended.loot||{}).length?' · '+Object.entries(C.ended.loot).map(([id,n])=>itemName(id)+' '+n+'개').join(', '):'')));
   res.append(mk('p','cp-note',C.rewards?.length?'내 여정에 들어온 보상 · '+C.rewards.map(rewardLine).join(' / '):'보상을 내 여정에 넣는 중입니다…'));
   for(const w of C.rewards||[])for(const n of w.notes||[])res.append(mk('p','cp-why',n));}
  else res.append(mk('p','','방장의 파티가 쓰러졌습니다. 손님은 잃는 것이 없습니다.'));
  res.append(btn('닫기',()=>{C.ended=null;closeBattle(false);},'primary'));body.append(res);
 }else if(!v){body.append(mk('p','cp-empty',r?.battle?.running&&!r.battle.shared?r.battle.solo:'함께 싸우는 전투가 없습니다.'));body.append(btn('닫기',()=>closeBattle(false),'primary'));}
 else{
  const turn=mk('section','cp-turn'+(v.turn?.mine?' mine':''));const tl=left(v.turn);
  turn.append(mk('strong','cp-turn-who',v.opening?'방장이 「전투 시작」을 누르면 시작합니다':v.turn?.mine?'내 차례 · '+(v.me?.name||''):v.turn?.host?'방장 '+(v.turn.name||'')+'의 차례':v.turn?(v.turn.ownerName+' 님의 차례 · '+v.turn.name):'진행 중…'));
  if(tl!==null)turn.append(mk('span','cp-count'+(tl<=5?' hurry':''),tl+'초'));
  if(!v.me)turn.append(mk('small','cp-note','다음 라운드가 시작되면 내 캐릭터가 전투에 들어갑니다.'));
  else if(v.me.left)turn.append(mk('small','cp-note','자리를 비운 동안 '+v.me.name+'이(가) 스스로 싸웁니다. 다음 라운드부터 다시 이끕니다.'));
  else if(!v.me.alive)turn.append(mk('small','cp-note',v.me.name+'이(가) 쓰러졌습니다. 동료들을 응원해 주세요.'));
  body.append(turn);
  // On my turn the cards come first, so a phone shows them without scrolling past the fighters.
  if(v.turn?.mine&&v.cards?.length)body.append(commands(v));
  const sides=mk('div','cp-sides');const a=mk('section','cp-side allies'),e=mk('section','cp-side enemies');a.append(mk('h3','','우리 편'));e.append(mk('h3','','적'));
  for(const u of v.allies)a.append(unitRow(u));for(const u of v.enemies)e.append(unitRow(u));sides.append(a,e);body.append(sides);
  if(v.log?.length){const log=mk('section','cp-log');log.append(mk('h3','','전투 기록'));for(const line of v.log.slice(-8))log.append(mk('p','',line));body.append(log);}
 }
 const foot=mk('footer','cp-bfoot');foot.append(btn('작게 보기',minimize),btn('방 나가기',leave,'cp-danger',C.busy?'잠시 기다려 주세요.':''));
 box.replaceChildren(...parts,body,foot);
 if(C.msg&&C.shown){const m=mk('p','cp-msg',C.msg);m.setAttribute('role','alert');box.insertBefore(m,foot);}
}
function commands(v){
 const s=mk('section','cp-commands');const cards=v.cards;
 if(!cards.some(c=>c.id===C.card&&!c.reason))C.card=cards.find(c=>!c.reason)?.id||'';
 const chosen=cards.find(c=>c.id===C.card);if(!chosen?.targets?.some(t=>t.id===C.target))C.target=chosen?.targets?.[0]?.id||'';
 if(chosen?.branches?.length&&!chosen.branches.includes(C.branch))C.branch=chosen.branches[0];
 const row=mk('div','cp-cards');
 for(const c of cards){const b=mk('button','cp-card'+(c.id===C.card?' selected':''));b.type='button';b.append(mk('strong','',c.name),mk('small','',c.reason||(c.cooldown?'재사용 '+c.cooldown+'차례':c.key?c.key+' 기술':'사용 가능')));
  if(c.reason){b.disabled=true;b.title=c.reason;b.dataset.reason=c.reason;}else b.onclick=()=>{C.card=c.id;C.branch='';drawBattle();};if(c.description&&!c.reason)b.title=c.description;row.append(b);}
 s.append(row);
 const go=mk('div','cp-go');
 if(chosen?.targets?.length){const sel=mk('select','cp-select');sel.setAttribute('aria-label','대상');for(const t of chosen.targets)sel.append(new Option(t.name+' · HP '+fmt(t.hp),t.id));sel.value=C.target;sel.onchange=()=>{C.target=sel.value;drawBattle();};go.append(sel);}
 if(chosen?.branches?.length){const sel=mk('select','cp-select');sel.setAttribute('aria-label','스킬 방식');for(const x of chosen.branches)sel.append(new Option(({TAP:'짧게',HOLD:'길게',CHARGE:'차지',PURSUIT:'추격',EXPLOSION:'폭발'})[x]||x,x));sel.value=C.branch;sel.onchange=()=>{C.branch=sel.value;};go.append(sel);}
 go.append(btn(C.busy?'보내는 중…':'실행',()=>command(),'primary cp-run',!chosen?'쓸 수 있는 행동이 없습니다.':C.busy?'잠시 기다려 주세요.':''),btn('자동으로 맡기기',()=>auto(true),'',C.busy?'잠시 기다려 주세요.':''));
 s.append(go);return s;
}
async function command(){
 if(C.busy||!C.battle?.turn?.mine)return;C.busy=true;C.msg='';drawBattle();
 try{const out=await O.request('/coop/act',{card:C.card,target:C.target||undefined,branch:C.branch||undefined,requestId:'coop-'+crypto.randomUUID()});if(out?.battle)setBattle(out.battle);SND('click');}
 catch(e){C.msg=e.message;SND('error');load();}
 finally{C.busy=false;drawBattle();}
}
// After the 20 seconds, any client in the room asks for the AI to play the waiting turn (the server checks the time).
async function auto(mine=false){
 const t=C.battle?.turn||null,key=t?C.battle.battle+':'+t.actor+':'+t.deadline:'';
 if(!t||t.host||(!mine&&C.autoAsked===key))return;C.autoAsked=key;
 try{const out=await O.request('/coop/auto',{});if(out?.battle)setBattle(out.battle);}
 catch(e){if(mine){C.msg=e.message;drawBattle();}}
}
// ---------- the host's own battle screen ----------
function hostTurn(){try{return game?.s?.runtime?.coop?game.coopTurnInfo():null;}catch{return null;}}
async function hostAuto(){
 const t=hostTurn(),key=t?game.s.runtime.id+':'+t.actor+':'+t.deadline:'';if(!t||C.autoAsked===key||isBusy())return;C.autoAsked=key;
 try{await O.request('/coop/auto',{});}
 catch(e){
  // The room is gone (a server restart): the host's own action moves the fight on (the rules check the time).
  if(e.status===404&&!isBusy()&&typeof act==='function'){try{await act('COOP_AUTO',{});}catch{}}
 }
}
if(typeof combat==='function'){const prior=combat;combat=function(p,...args){
 const out=prior(p,...args);
 try{
  const b=game.s.runtime;if(!b?.coop)return out;
  for(const row of p.querySelectorAll('.combatant-row[data-actor-id]')){const a=b.actors.find(x=>x.id===row.dataset.actorId);if(!a?.coop)continue;
   const tag=mk('span','cp-host-tag'+(a.coop.left?' away':''),'동료 모험가 · '+a.coop.ownerName+(a.coop.left?' · 스스로 싸움':''));tag.title=a.coop.ownerName+' 님이 데려온 캐릭터입니다.';(row.querySelector('.combatant-copy')||row).append(tag);}
  const t=hostTurn(),cmd=p.querySelector('.battle-command');
  if(t&&cmd){const w=mk('div','cp-host-wait');w.setAttribute('role','status');w.append(SHELL.icon('COOP','shell-icon'),mk('strong','',t.ownerName+' 님의 차례'),mk('span','cp-host-count',''),mk('small','','고르지 않으면 시간이 지난 뒤 스스로 싸웁니다.'));cmd.prepend(w);}
  else if(b.actors.some(a=>a.coop)){const n=b.actors.filter(a=>a.coop&&!a.coop.left).length;if(cmd)cmd.prepend(mk('p','cp-host-note','다인 모드 · 함께 싸우는 모험가 '+n+'명'));}
  tickHost();
 }catch{}
 return out;
};}
function tickHost(){
 const t=hostTurn();for(const n of document.querySelectorAll('.cp-host-count')){if(!t){n.textContent='';continue;}const s=Math.max(0,Math.ceil((t.deadline-(O.now?O.now():Date.now()))/1000));n.textContent=s+'초';n.classList.toggle('hurry',s<=5);}
 if(t&&(O.now?O.now():Date.now())>t.deadline+700)hostAuto();
}
// ---------- the clock: countdowns, the auto turn, a slow poll while in a room ----------
function schedule(){
 const need=!!(C.battle||hostTurn()||room()||C.node);
 if(need&&!C.tick)C.tick=setInterval(tick,500);if(!need&&C.tick){clearInterval(C.tick);C.tick=0;}
}
function tick(){
 try{
  const v=C.battle,t=v?.turn;
  if(v){for(const n of document.querySelectorAll('.cp-count')){const s=left(t);n.textContent=s===null?'':s+'초';n.classList.toggle('hurry',s!==null&&s<=5);}
   // Room members other than the waiting guest wait a little longer, so that one request usually goes alone.
   if(t&&!t.host&&left(t)===0){const late=Date.now()-C.battleAt-(t.deadline-(v.now||0));if(late>(t.mine?400:1500))auto();}}
  tickHost();
  if(online()&&C.enabled===true&&(room()||C.node)&&Date.now()>C.poll){C.poll=Date.now()+(C.battle?6000:9000);load();}
  schedule();
 }catch{}
}
// ---------- news from the server ----------
let syncing=false,syncWanted=false;
async function wantSync(){
 syncWanted=true;if(syncing)return;syncing=true;
 try{for(let i=0;i<60&&syncWanted;i++){if(isBusy()){await sleep(400);continue;}syncWanted=false;try{await O.sync();}catch{}}}finally{syncing=false;}
}
window.CRPGChat?.on?.(ev=>{
 if(ev?.type!=='coop')return;
 if(['kicked','left','closed'].includes(ev.kind)){const was=!!room();C.status={...(C.status||{}),room:null,battle:null};if(ev.kind!=='left'||was)toast(ev.reason||'방이 닫혔습니다.');C.msg=ev.reason||'';closeBattle(true);draw();schedule();return;}
 if(ev.kind==='invite'){C.invites=[...C.invites.filter(x=>x.room!==ev.invite.room),{room:ev.invite.room,from:ev.invite.from,at:Date.now()}];showInvite(ev.invite);draw();return;}
 if(ev.kind==='declined'){toast(ev.from.name+' 님이 초대를 거절했습니다.');return;}
 if(ev.kind==='reward'){showRewards(ev.rewards||[]);if(ev.sync)wantSync();return;}
 if(ev.kind==='sync'){wantSync();return;}
 if(ev.room!==undefined){C.status={...(C.status||{enabled:true}),room:ev.room};if(ev.kind==='ended'&&ev.ended&&ev.room?.you==='GUEST'){C.ended=ev.ended;SND(ev.ended.victory?'victory':'defeat');if(!C.minimized)openBattle();}setBattle(ev.battle||null);draw();}
});
// ---------- where it is opened ----------
SHELL.extraTiles.push({icon:'COOP',label:'다인 모드',show:()=>ready()&&online()&&C.enabled!==false,run:()=>C.open()});
// 「같이 하기」 on an adventurer's card (app_profile_v01415.js): join their room, invite them into mine, or open a room
// by invitation and invite them.
C.profileButton=function(v,closeCard){
 if(!v||v.you||C.enabled===false||!v.coop)return null;const x=v.coop,mine=room(),why=reason();let label='같이 하기',run,lock=why;
 if(x.hosting){label=x.joined?'같은 방 · 열기':'같이 하기 · 방 참여';run=()=>{closeCard?.();if(x.joined)C.open();else C.open({join:x.room,hostName:v.name});};
  if(!lock&&!x.joined){if(x.visibility==='INVITE'&&!x.invited)lock='초대받은 모험가만 들어갈 수 있는 방입니다.';else if(x.count>=x.max)lock='방이 가득 찼습니다.';else if(mine)lock='이미 다른 방에 들어가 있습니다.';}}
 // Without a room of one's own, 「같이 하기」 opens one by invitation and invites them; what goes wrong shows in the window.
 else{label=mine?'같이 하기 · 초대':'같이 하기';run=async()=>{closeCard?.();C.open();if(!room()){const out=await call('/coop/open',{visibility:'INVITE'});if(!out)return;await load();}await invite(v.pid,v.name);};
  if(!lock){if(x.busy)lock=v.name+' 님은 다른 방에서 함께하는 중입니다.';else if(!v.online)lock=v.name+' 님은 지금 접속해 있지 않습니다.';else if(mine&&mine.you!=='HOST')lock='손님으로 들어간 방에서는 초대할 수 없습니다.';else if(mine&&!x.canInvite)lock='방이 가득 찼습니다.';}}
 const b=mk('button','pf-btn cp-profile-btn'+(lock?'':' primary'),label);b.type='button';b.onclick=run;if(lock){b.disabled=true;b.title=lock;b.dataset.reason=lock;}return b;
};
// Find out once per login whether this server runs 다인 모드, keep the room, forget everything on logout.
if(typeof render==='function'){const prior=render;render=function(){prior();try{
 if(!online()){if(C.status||C.enabled!==null){C.status=null;C.enabled=null;C.list=null;C.invites=[];closeBattle(true);closeInvite();close();schedule();}return;}
 if(C.enabled===null&&!C.loading&&Date.now()>=C.probe){C.probe=Date.now()+30000;load();}
 schedule();
}catch{}};}
})();
