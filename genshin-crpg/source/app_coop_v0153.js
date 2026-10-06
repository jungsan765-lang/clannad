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
// 0.16: the room's battle speed as last taken (see 「one battle speed for the room」 below).
const SPEED={want:null,flight:false,room:null,rev:-1};
// Why one cannot take part right now (shown on locked buttons and in the window).
function reason(){
 if(!ready())return '게임을 불러오는 중입니다.';
 if(!online())return '다인 모드는 온라인 계정으로 접속했을 때 열립니다.';
 if(!O.active)return '계정 여정을 연 뒤에 함께할 수 있습니다.';
 if(C.enabled===false)return '이 서버에서는 다인 모드가 열리지 않았습니다.';
 return game.coopLevelReason?.()||'';
}
// ---------- the server ----------
let roomFlight=null,roomSequence=0,roomNews=0;
function load(refresh=false){
 if(!online())return Promise.resolve();
 const session=O.sessionStamp();if(!refresh&&roomFlight&&O.sameSession(roomFlight.session))return roomFlight.promise;
 const sequence=++roomSequence,news=roomNews,flight={session};C.loading=true;
 const current=()=>sequence===roomSequence&&O.sameSession(session);
 flight.promise=(async()=>{
  try{const out=await O.request('/coop/room');if(!current())return;C.enabled=true;
   // Stream news may advance or close the room while this snapshot is travelling back.
   if(news!==roomNews&&C.status){C.status={...out,...C.status};if(out.rewards?.length){showRewards(out.rewards);wantSync();}return;}apply(out);
  }catch(e){if(!current()||news!==roomNews)return;if(e.status===404){C.enabled=false;C.status=null;}else if(C.node)C.msg=e.message;}
  finally{if(roomFlight===flight){roomFlight=null;C.loading=false;}}
  if(current()){draw();drawBattle();}
 })();roomFlight=flight;return flight.promise;
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
 if(C.busy)return null;const session=O.sessionStamp();C.busy=true;C.msg='';draw();
 try{const out=await O.request(path,body||{});if(ok){toast(ok);SND('menu_open');}return out;}
 catch(e){if(O.sameSession(session)){C.msg=e.message;SND('error');}return null;}
 finally{if(O.sameSession(session)){C.busy=false;draw();}}
}
async function openRoom(visibility){const out=await call('/coop/open',{visibility},visibility==='INVITE'?'초대한 모험가만 들어올 수 있는 방을 열었습니다.':'방을 열었습니다. 모집 중인 방 목록에 보입니다.');if(out){C.view='home';await load(true);}}
async function join(id,char){const out=await call('/coop/join',{room:id,char},'방에 들어갔습니다.');if(out){C.joining=null;C.view='home';await load(true);}}
async function changeChar(char){const out=await call('/coop/char',{char},'함께할 캐릭터를 바꿨습니다.');if(out){C.joining=null;C.view='home';await load(true);}}
async function leave(){const h=host(),out=await call(h?'/coop/close':'/coop/leave',{},h?'방을 닫았습니다.':'방에서 나왔습니다.');if(out){C.status={...C.status,room:null,battle:null};closeBattle(true);await load(true);await loadList();}}
async function kick(pid){const out=await call('/coop/kick',{pid},'방에서 내보냈습니다.');if(out)await load(true);}
async function setReady(v){const out=await call('/coop/ready',{ready:v},v?'함께 싸울 준비가 되었습니다.':'잠시 쉬는 중으로 바꿨습니다.');if(out)await load(true);}
async function invite(pid,name){const out=await call('/coop/invite',{pid},(name||'모험가')+' 님을 초대했습니다.');if(out)await load(true);return !!out;}
async function decline(id){if(!await call('/coop/decline',{room:id}))return;C.invites=C.invites.filter(x=>x.room!==id);closeInvite();draw();}
// Online adventurers to invite (from the chat's list).
async function loadOnline(){try{C.online=(await O.request('/online')).players||[];}catch{C.online=[];}draw();}
// ---------- the window ----------
function close(){if(!C.node)return;const n=C.node;C.node=null;n.classList.remove('open');setTimeout(()=>n.remove(),160);SND('menu_close');schedule();pill();}
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
 // Each stat keeps together, so a narrow phone breaks the line between them (never inside 「특성 1/1/1」).
 const stats=mk('small','cp-char-stats'),parts=['HP '+fmt(c.hp),'공격 '+fmt(c.atk),'방어 '+fmt(c.def),...(c.talents?['특성 '+c.talents.na+'/'+c.talents.e+'/'+c.talents.q]:[])];
 parts.forEach((t,i)=>{if(i)stats.append(' · ');stats.append(mk('span','',t));});copy.append(stats);
 const gear=(c.gear||[]).map(g=>g.name+(g.enhance?' +'+g.enhance:'')).join(' · ');copy.append(mk('small','cp-char-gear',gear?'장비 · '+gear:'장비 없음'));
 card.append(copy);if(why&&onPick)card.append(mk('em','cp-char-why',why));return card;
}
function draw(){
 speedFromRoom();pill();const wrap=C.node;if(!wrap)return;const box=wrap.querySelector('.cp-box'),parts=[];
 const why=reason(),r=room();
 if(C.view==='pick'){parts.push(...pickView());}
 else if(r){parts.push(head('다인 모드',(r.you==='HOST'?'내 방':'방장 '+r.host.name)+' · '+(r.visibility==='INVITE'?'초대 전용':'공개 모집')+' · '+r.count+' / '+r.max+'명'),roomView(r));}
 else{parts.push(head('다인 모드','필드 전투를 다른 모험가와 함께 · 최대 4명'),homeView(why));}
 if(C.msg){const m=mk('p','cp-msg',C.msg);m.setAttribute('role','alert');parts.push(m);}
 const live=box.querySelector('.cp-talk'),fresh=parts.map(p=>p.querySelector?.('.cp-talk')).find(Boolean);
 if(live&&fresh&&live.dataset.room===fresh.dataset.room&&keepTalk(box,parts,live,fresh))return;
 box.replaceChildren(...parts);const log=box.querySelector('.cp-talk-log');if(log)log.scrollTop=log.scrollHeight;
}
// A redraw (news, the slow poll) leaves the room's talk box in the page and swaps everything around it, so what is
// being typed, the caret and a phone's keyboard stay; its lines and quick words are renewed in place.
function keepTalk(box,parts,live,fresh){
 const oldBody=live.parentElement,newBody=fresh.parentElement,top=parts.indexOf(newBody);if(!oldBody||oldBody.parentElement!==box||top<0)return false;
 const oldLog=live.querySelector(':scope>.cp-talk-log'),atEnd=!oldLog||oldLog.scrollTop+oldLog.clientHeight>=oldLog.scrollHeight-8,was=oldLog?.scrollTop||0;
 for(const cls of ['cp-talk-log','cp-chips']){const a=live.querySelector(':scope>.'+cls),b=fresh.querySelector(':scope>.'+cls);if(a&&b)a.replaceWith(b);}
 const kids=[...newBody.children],i=kids.indexOf(fresh);
 for(const n of [...oldBody.childNodes])if(n!==live)n.remove();live.before(...kids.slice(0,i));live.after(...kids.slice(i+1));oldBody.className=newBody.className;
 for(const n of [...box.childNodes])if(n!==oldBody)n.remove();oldBody.before(...parts.slice(0,top));oldBody.after(...parts.slice(top+1));
 const log=live.querySelector(':scope>.cp-talk-log');if(log)log.scrollTop=atEnd?log.scrollHeight:was;
 return true;
}
function rulesBox(){
 const s=mk('section','cp-rules');const R=C.status?.rules;
 // 0.15.25: short lines instead of a paragraph (user: no screens explained by walls of text).
 s.append(mk('p','','함께 싸우는 전투 · '+(R?.shared||RULES.text.shared)),mk('p','','혼자 하는 전투 · '+(R?.solo||RULES.text.solo)),
  mk('p','','방장 + 손님 최대 3명 · 각자 캐릭터 1명 · 손님 차례 '+(RULES.turnMs/1000)+'초(넘기면 자동) · 보상은 각자 · 패배해도 손님 손해 없음'));
 return s;
}
// ---------- 0.15.9 함께 다니기: the host's world, suggestions and the room's talk ----------
const mapName=id=>{try{return game.tables['32_MAP_DB'].get(id)?.[2]||id;}catch{return id;}};
const muted=pid=>{try{return !!window.CRPGChat?.muted?.has(pid);}catch{return false;}};
function doingText(w,r){
 if(w.doing==='BATTLE')return r.battle?.shared===false?'방장이 혼자 싸우는 중':'전투 중';
 if(w.doing==='STORY')return '이야기 진행 중 · 이야기 전투는 방장 혼자 합니다';
 if(w.doing==='PLACE')return (w.place||'시설')+' 이용 중';
 return (w.safe?'안전한 거점':'야외 · 이동 중 적과 마주칠 수 있음')+(w.levels?' · 권장 Lv.'+w.levels[0]+'~'+w.levels[1]:'');
}
// 0.16 함께 돌아다니기 (user: 「그냥 손님이 방장 맵에 아예 들어가는 원신처럼 맵 알아서 돌아다니다가 방장이나 손님이 쌈 나면 전투
// 시작 전에 끼고 그런거 안돼?」, 「그래야 상자도 대신 좀 퍼즐같은것도 풀어줄 수 있고」): the host's world with everyone in it. A guest
// walks it one step at a time (the pins one step away) and goes back to the host; anyone steps into a fight going on
// (「참가」). My own fight there is drawn by my own battle screen. The host's chests are found in 풍경 보기 on one's own main
// screen standing in the host's world (app_coop_world_v0160.js), never listed here: where a chest lies is for the eyes.
const myPos=r=>(r.positions||[]).find(p=>p.me)||null;
function stepWhy(r){
 if(C.busy)return '잠시 기다려 주세요.';const me=myPos(r);if(me?.fight)return '함께 싸우는 동안에는 움직일 수 없습니다.';
 let why='';try{why=game.coopRoamReason?.()||'';}catch{}return why;
}
function fightWhy(f){
 const r=room();if(C.busy)return '잠시 기다려 주세요.';if(!r)return '방이 닫혔습니다.';
 const me=myPos(r);if(me?.fight&&!(f&&me.fight.pid===f.owner.pid))return '다른 전투에 함께하는 중입니다.';
 try{if(game?.s?.runtime)return '진행 중인 내 전투를 먼저 마쳐 주세요.';}catch{}
 if(r.you==='GUEST'&&!(r.members||[]).find(m=>m.me)?.ready)return '「준비 완료」로 바꾼 뒤 함께할 수 있습니다.';
 // 0.16 (user: 「다른 사람 전투는 그쪽으로 가야 할 수 있는것으로」): one stands where the fight is.
 if(farFrom(f))return (f.mapName||'전투가 벌어진 곳')+'에 가야 함께 싸울 수 있습니다.';
 return '';
}
function farFrom(f){const me=myPos(room()||{});return !!(f&&me&&me.map!==f.map);}
// The way to a place: the travel map with the route drawn (a guest's in the host's world, entered first if need be).
function goTo(map){
 closePrompt();const W=window.CRPGCoopWorld,r=room();
 if(r?.you==='GUEST'&&W&&!W.shown){W.enter?.();setTimeout(()=>showOnMap(map),250);return;}
 showOnMap(map);
}
function worldMap(r,center){
 const T=window.CRPGTerrainMap,pt=T?.points?.[center];if(!pt)return null;const A=T.atlases?.[pt[0]];if(!A)return null;
 const box=mk('div','cp-minimap cp-worldmap');box.setAttribute('aria-label',A.name+' 지도');
 const W=T.width||880,H=T.height||786,layer=mk('div','cp-minimap-layer');layer.style.transform='translate('+(-pt[1]/W*100).toFixed(2)+'%,'+(-pt[2]/H*100).toFixed(2)+'%)';
 const img=mk('img');img.src=A.url;img.alt='';img.decoding='async';layer.append(img);
 const put=(id,node)=>{const p=T.points[id];if(!p||p[0]!==pt[0])return;node.style.left=(p[1]/W*100).toFixed(2)+'%';node.style.top=(p[2]/H*100).toFixed(2)+'%';layer.append(node);};
 // One step away: pins to press (a guest walks; the host walks their own world by playing).
 if(r.you==='GUEST'){const why=stepWhy(r);for(const n of r.near||[]){const b=mk('button','cp-step');b.type='button';b.setAttribute('aria-label',n.name+'(으)로 이동');b.title=why||n.name+'(으)로 이동';b.append(mk('em','',n.name));if(why){b.disabled=true;b.dataset.reason=why;}else b.onclick=()=>move(n.map);put(n.map,b);}}
 const sug=r.suggest&&r.suggest.map!==r.world?.map?r.suggest:null;if(sug){const d=mk('span','cp-pin suggest');d.append(mk('em','','제안'));put(sug.map,d);}
 for(const f of r.fights||[]){const d=mk('span','cp-pin fight');d.append(mk('em','','⚔ '+f.owner.name));put(f.map,d);}
 const at=new Map();for(const p of r.positions||[])(at.get(p.map)||at.set(p.map,[]).get(p.map)).push(p);
 for(const [id,list] of at){const d=mk('span','cp-pin '+(list.some(p=>p.me)?'me':list.some(p=>p.host)?'party':'other'));d.append(mk('em','',list.map(p=>p.me?'나':p.host?'방장':p.name).join(' · ')));put(id,d);}
 box.append(layer);return box;
}
function fightRows(r){
 const list=(r.fights||[]).filter(f=>!f.mine);if(!list.length)return null;const s=mk('div','cp-fights');s.setAttribute('aria-label','진행 중인 전투');
 for(const f of list){const row=mk('div','cp-fight'+(f.joined?' joined':'')),copy=mk('span','cp-fight-copy');
  copy.append(mk('strong','',f.owner.name+(f.owner.host?' · 방장':'')+(f.title?' · '+f.title:'')),mk('small','',f.mapName+' · '+(f.opening?'시작 전':'라운드 '+f.round)+(f.count?' · 함께 '+f.count+'명':'')));
  row.append(SHELL.icon('SWORD','shell-icon'),copy,f.joined?btn('전투 보기',()=>{C.minimized=false;openBattle();},'cp-mini primary'):farFrom(f)?btn('가는 길',()=>goTo(f.map),'cp-mini'):btn('참가',()=>joinFight(f),'cp-mini primary',fightWhy(f)));s.append(row);}
 return s;
}
function worldSection(r){
 const w=r.world,s=mk('section','cp-world'),guest=r.you==='GUEST';s.append(mk('h3','',guest?'함께 다니기 · '+r.host.name+' 님의 세계':'함께 다니기 · 내 세계'));
 if(!w){s.append(mk('p','cp-empty','방장의 위치를 불러오는 중…'));return s;}
 const at=r.at||{map:w.map,name:w.name,follow:true},where=mk('div','cp-where');
 if(guest)where.append(mk('strong','',(at.follow?'방장과 함께 · ':'혼자 둘러보는 중 · ')+at.name),mk('small','','방장 · '+w.name+' · '+doingText(w,r)+(w.time?' · '+w.day+'일차 '+w.time:'')));
 else where.append(mk('strong','',(w.region?w.region+' · ':'')+w.name),mk('small','',doingText(w,r)+(w.time?' · '+w.day+'일차 '+w.time:'')));
 s.append(where);
 const map=worldMap(r,guest?at.map:w.map);if(map)s.append(map);
 const fights=fightRows(r);if(fights)s.append(fights);
 // 0.16 같이 풀기: a chest's board someone is on where one stands (app_coop_puzzle_v0160.js).
 const here=myPos(r)?.map,boards=(r.boards||[]).filter(b=>!b.mine&&b.map===here);
 if(boards.length){const list=mk('div','cp-fights cp-boards');for(const b of boards){const row=mk('div','cp-fight cp-board'),copy=mk('span','cp-fight-copy');copy.append(mk('strong','',b.players.join(' · ')),mk('small','',b.mapName+' · 보물상자 퍼즐을 푸는 중'));row.append(SHELL.icon('PUZZLE','shell-icon'),copy,btn('같이 풀기',()=>{close();window.CRPGCoopPuzzle?.join?.(b.chest);},'cp-mini primary'));list.append(row);}s.append(list);}
 const sug=r.suggest&&r.suggest.map!==w.map?r.suggest:null;
 if(sug){const p=mk('div','cp-suggested');p.append(mk('span','',sug.from.name+' 님 · 「'+sug.name+'」(으)로 가요'));if(!guest)p.append(btn('지도에서 보기',()=>showOnMap(sug.map),'cp-mini'));s.append(p);}
 if(guest){
  const why=stepWhy(r),row=mk('div','cp-row cp-walk');
  // 0.16: one's own main screen stands in the host's world (app_coop_world_v0160.js); this button goes there or back.
  const world=window.CRPGCoopWorld?.button?.();if(world)row.append(world);
  if(!at.follow)row.append(btn('방장에게 가기',follow,'primary',why));
  if(!at.follow&&at.map!==w.map)row.append(btn('여기로 오자고 하기',()=>suggest(at.map),'cp-mini',C.busy?'잠시 기다려 주세요.':''));
  if(row.childElementCount)s.append(row);
 }
 return s;
}
// ---------- 0.16: walking, stepping into fights, the host's chests ----------
async function move(map){
 const out=await call('/coop/move',{map});if(!out)return;
 if(out.room)C.status={...C.status,room:out.room};SND('click');
 if(out.encounter){toast('적과 마주쳤습니다! 내 전투가 시작됩니다.');SND('notice');close();wantSync();return;}
 draw();
}
async function follow(){const out=await call('/coop/follow',{},'방장에게 왔습니다.');if(out?.room)C.status={...C.status,room:out.room};draw();return out;}
async function joinFight(f){
 const out=await call('/coop/fight',{owner:f.owner.pid},f.opening?'전투에 함께합니다.':'다음 라운드부터 함께 싸웁니다.');closePrompt(f.owner.pid);if(!out)return;
 if(out.room)C.status={...C.status,room:out.room};if(out.battle){C.minimized=false;setBattle(out.battle);openBattle();}draw();
 return out;
}
function openChest(ch){
 const CH=window.CRPGChests;if(!CH)return;const host=room()?.host?.name||'방장';
 if(!ch.game||!ch.puzzle){claimChest(ch,undefined,null);return;}
 close();
 // 0.16 같이 풀기: the board is shared with whoever stands here (app_coop_puzzle_v0160.js); the clock games stay one's own.
 if(window.CRPGCoopPuzzle?.wants?.(ch)){window.CRPGCoopPuzzle.open(ch);return;}
 CH.play({title:ch.tierName,sub:ch.mapName+' · '+host+' 님의 상자',region:ch.region,icon:ch.icon,puzzle:ch.puzzle,map:ch.map,solvedText:'봉인이 풀렸다!',done:(answer,body)=>claimChest(ch,answer,body)});
}
// 0.16 (user: 「보물상자 클리어 하는건 클리어 따로, 상자 먹는거 따로 … (손님)님이 상자의 암호를 풀어냈다 이런식으로 적어두고 먹게」): solving
// unseals the chest where it lies; the host comes and opens it themselves, and the chest says who solved it.
async function claimChest(ch,answer,body){
 const CH=window.CRPGChests,host=room()?.host?.name||'방장';
 try{const out=(await O.request('/coop/chest',{chest:ch.id,answer})).result||{};SND('chest_unlock');
  const what=ch.game?'상자의 암호를 풀어냈습니다':'보물상자를 찾아냈습니다',where=host+' 님이 '+(out.mapName||ch.mapName)+'에 오면 열 수 있습니다';
  if(body){body.replaceChildren();body.className='ch-body ch-reveal';const stage=mk('div','ch-stage tier-'+ch.icon),img=mk('img','ch-chest');img.src='assets/icons/chests/chest_'+ch.icon+'.webp';img.alt=ch.tierName;stage.append(mk('div','ch-glow'),img);
   const ok=mk('button','ch-btn primary ch-done','확인');ok.type='button';ok.onclick=()=>CH?.close();body.append(stage,mk('p','ch-progress',what),mk('p','ch-note',where),ok);}
  else toast(what+' · '+where);
  load(true);
 }catch(e){toast(e.message);SND('error');if(body)body.append(mk('p','ch-note warn',e.message));}
}
// 「참가」 on a fight one hears of (kind 'fight'): a small note that goes away by itself.
function showFightPrompt(f){
 closePrompt();const n=mk('div','cp-invite-pop cp-fight-pop');n.setAttribute('role','alertdialog');n.setAttribute('aria-label','전투 참가');
 n.append(mk('strong','',f.owner.name+' 님이 싸움을 시작합니다'),mk('small','',f.title&&f.mapName&&f.title.startsWith(f.mapName)?f.title:[f.mapName,f.title].filter(Boolean).join(' · ')));
 const why=fightWhy(f),row=mk('div','cp-row');row.append(farFrom(f)?btn('가는 길',()=>goTo(f.map),'primary'):btn('참가',()=>joinFight(f),'primary',why),btn('닫기',()=>closePrompt()));n.append(row);if(why)n.append(mk('p','cp-why',why));
 document.body.append(n);C.promptNode=n;C.promptOwner=f.owner.pid;SND('notice');setTimeout(()=>{if(C.promptNode===n)closePrompt();},20000);
}
function closePrompt(owner){if(owner&&C.promptOwner!==owner)return;C.promptNode?.remove();C.promptNode=null;C.promptOwner=null;}
// The note goes once that fight is over or one is in it.
function closePromptFor(r){if(!C.promptOwner)return;const f=(r?.fights||[]).find(x=>x.owner.pid===C.promptOwner);if(!f||f.joined)closePrompt();}
function talkSection(r){
 const s=mk('section','cp-talk');s.dataset.room=r.id;s.append(mk('h3','','방 대화'));
 const log=mk('div','cp-talk-log');log.setAttribute('aria-live','polite');const lines=(r.log||[]).filter(l=>!muted(l.from.pid)).slice(-8);
 if(!lines.length)log.append(mk('p','cp-empty','아직 나눈 말이 없습니다. 방 사람에게만 보입니다.'));
 for(const l of lines){const p=mk('p','cp-talk-line'+(l.from.host?' host':''));p.append(mk('strong','',l.from.name+(l.from.host?' · 방장':'')),mk('span','',l.text));log.append(p);}
 s.append(log);
 const quick=mk('div','cp-chips');for(const q of ['출발해요','준비됐어요','잠깐만요','고마워요'])quick.append(btn(q,()=>say(q),'cp-chip',C.busy?'잠시 기다려 주세요.':''));s.append(quick);
 const form=mk('form','cp-talk-form'),input=mk('input');input.maxLength=80;input.placeholder='방 사람들에게 할 말';input.setAttribute('aria-label','방 대화');input.value=C.draft||'';
 input.oninput=()=>{C.draft=input.value;};
 const send=btn('보내기',()=>{},'primary');send.type='submit';form.append(input,send);
 form.onsubmit=e=>{e.preventDefault();const t=input.value.trim();if(t){C.draft='';input.value='';say(t);}};s.append(form);
 return s;
}
async function suggest(map){const out=await call('/coop/suggest',{map},'「'+mapName(map)+'」(으)로 가자고 했습니다.');if(out?.room)C.status={...C.status,room:out.room};draw();}
async function say(text){
 try{const out=await O.request('/coop/say',{text});if(out?.line)addLine(out.line);}
 catch(e){C.msg=e.message;SND('error');draw();}
}
function addLine(line){const r=room();if(!r)return;const log=r.log||[];if(log.some(l=>l.at===line.at&&l.from.pid===line.from.pid&&l.text===line.text))return;r.log=[...log,line].slice(-20);draw();try{window.CRPGChat?.coopLine?.(line);}catch{}}
// 0.16: the chat window's 「다인」 tab (app_chat.js) shows and sends the room's talk.
C.say=text=>say(text);C.roomLog=()=>room()?.log||[];C.inRoom=()=>!!room();
// 0.16: walking the host's world from one's own field screen (app_coop_world_v0160.js) uses the same steps, fights and
// chests as this window.
C.api={follow,joinFight,openChest,claim:claimChest,fightWhy,farFrom,goTo,stepWhy,suggest,myPos:()=>myPos(room()||{}),wantSync:()=>wantSync(),msg:()=>C.msg,
 // 0.16: the battle screen of a fight one is in that is someone else's (app_coop_world_v0160.js) acts through these.
 command:p=>{C.card=String(p?.card||'');C.target=p?.target?String(p.target):'';C.branch=p?.branch?String(p.branch):'';return command();},
 minimize:()=>minimize(),leave:()=>leave(),board:()=>C.fxBoard||C.battle,
 openBattle:()=>{C.minimized=false;openBattle();},
 step:async map=>{const out=await call('/coop/move',{map});if(!out)return null;if(out.room)C.status={...C.status,room:out.room};if(out.encounter)wantSync();draw();return out;}};
// The host's own travel map shows the suggested place (app_navigation.js; on a phone the main screen's 「이동」 tab).
function showOnMap(map){
 close();try{const pt=window.CRPGTerrainMap?.points?.[map];if(typeof NavigationUI!=='undefined'){if(pt){NavigationUI.atlas=pt[0];NavigationUI.camera={mode:'custom',zoom:2,cx:pt[1],cy:pt[2]};}NavigationUI.choose(map);}
  if(SHELL.openMap)SHELL.openMap();else if(game?.s?.global?.SCREEN_MODE!=='LOCATION'&&typeof act==='function')act('MENU',{screen:'LOCATION'});}catch{}
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
  t.append(mk('strong','',x.host.name+' 님의 방'),mk('small','','방장 Lv.'+x.host.level+' · '+x.count+' / '+x.max+'명'+(x.where?' · '+x.where.name:'')+(x.fighting?' · 전투 중':'')+(x.invited?' · 초대받음':'')));
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
 // 0.16: what I am doing — fighting in someone's fight, my own fight, or waiting (short lines, no paragraph).
 const b=r.battle,mePos=myPos(r),inFight=mePos?.fight||null,state=mk('section','cp-state'+(inFight||b?.running?' running':''));
 if(inFight&&!inFight.own){state.append(mk('strong','',inFight.name+' 님의 전투에 함께하는 중'),mk('small','',C.battle?(C.battle.opening?'시작 전':'라운드 '+C.battle.round)+(C.battle.title?' · '+C.battle.title:''):'곧 들어갑니다'));if(C.battle)state.append(btn('전투 화면 보기',()=>{C.minimized=false;openBattle();},'primary'));}
 else if(inFight){const f=(r.fights||[]).find(x=>x.mine);state.append(mk('strong','','내 전투 중'+(f?' · '+(f.opening?'시작 전':'라운드 '+f.round):'')),mk('small','',f?.count?'함께 싸우는 모험가 '+f.count+'명':'다른 모험가가 「참가」로 함께할 수 있습니다'));}
 else state.append(mk('strong','',b?.running&&!b.shared?'방장이 혼자 싸우는 중':'전투를 기다리는 중'),mk('small','',b?.running&&!b.shared?b.solo:r.you==='HOST'?'따라오는 손님은 함께 싸우고, 다른 손님은 「참가」로 끼어듭니다':'방장을 따라가면 함께 싸우고, 혼자 다니다 만난 싸움은 내 전투입니다'));
 body.append(state,worldSection(r),talkSection(r));
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
 // The last blows of a fight that ended are playing: the window keeps that fight until they are done.
 if(!view&&C.holdBattle)return;
 const before=C.battle;C.battle=view;C.battleAt=Date.now();if(view)C.lastTitle=view.title||view.encounter||'';
 if(view&&(!before||before.battle!==view.battle)){C.ended=null;C.rewards=null;C.card='';C.target='';C.branch='';C.autoAsked='';if(!C.minimized)openBattle();}
 if(view?.owner)C.lastOwner=view.owner;
 // The last view of a fight is kept for its end (its final blows come with the result).
 if(view)C.lastFight=view;
 if(view&&view.turn?.mine&&before?.turn?.actor!==view.turn.actor){SND('notice');if(C.minimized)toast('내 차례입니다 · '+(RULES.turnMs/1000)+'초 안에 골라 주세요.');}
 // 0.16: what the fight did since the last view plays on the board as it was (the fallen still standing until their blow),
 // then the board is drawn as it is now.
 const watching=!C.minimized&&(C.shown||view?.state);
 if(before&&view&&before.battle===view.battle&&watching){const frames=framesFor(before,view);
  if(frames===null){drawBattle();playChanges(before,view);}
  else if(frames.length){if(!C.fxPlaying)C.fxBoard=before;fxChain=fxChain.then(()=>runFrames(frames)).catch(()=>{});}
  else drawBattle();}
 else{if(view)C.fxSeen={battle:view.battle,len:view.fx?.len||0};drawBattle();}
 schedule();
}
// ---------- 0.16: the battle screen's own playback in this window (user: 「모든 모션이 다 나오는건 아닌 것 같은데」, 「버벅이는 것
// 같기도 하고 … 모션이 나오기도 전에 승리판정이 나오네」) ----------
// What the fight's log added since the last view (view.fx, stamped by presentation.js in the server's engine) becomes the
// battle screen's frames (CRPGPresentation) and plays through its player (GameEffects: the band over the commands, the
// one acting, every number, crit, reaction, shield and status, the shakes and the sounds). The window is not drawn again
// while it plays (no stutter), and a fight's result waits for its last blows.
let fxChain=Promise.resolve();
function framesFor(a,b){
 const PR=window.CRPGPresentation,fx=b?.fx;if(!PR?.delta||!PR.actionFrames||!fx||!Array.isArray(fx.entries))return null;
 const seen=C.fxSeen?.battle===b.battle?C.fxSeen.len:(a?.battle===b.battle&&a.fx?a.fx.len:fx.len),start=Math.max(seen,fx.from);
 C.fxSeen={battle:b.battle,len:Math.max(seen,fx.len)};if(fx.len<=start)return [];
 const log=new Array(fx.len);fx.entries.forEach((e,i)=>{log[fx.from+i]=e;});
 const actors=v=>unitsOf(v).map(u=>({id:u.id,name:u.name,side:u.side,hp:u.hp,maxHp:u.maxHp})),save='coop:'+b.battle;
 let events=[];try{events=PR.delta({saveId:save,battleId:b.battle,count:start,actors:actors(a||b),resultId:null},{global:{SAVE_ID:save,LAST_BATTLE_RESULT_JSON:'{}',LAST_COMMITTED_ACTION_ID:String(fx.len)},runtime:{id:b.battle,log,actors:actors(b)}});}catch{return null;}
 // A long stretch (the others' turns while one waited) keeps its last part, so one's own turn is not held back for long.
 return PR.actionFrames(events).slice(-8);
}
function queueFx(a,b){
 const frames=framesFor(a,b);if(frames===null){playChanges(a,b);return;}if(!frames.length)return;
 fxChain=fxChain.then(()=>runFrames(frames)).catch(()=>{});
}
async function runFrames(frames){
 const GE=typeof GameEffects!=='undefined'?GameEffects:null;
 if(!GE?.play||C.minimized||!(C.shown||C.battle?.state)){C.fxBoard=null;drawBattle();return;}
 C.fxPlaying=true;document.body.classList.add('cp-fx-on');
 try{const run=GE.play(frames);if(GE.dock&&C.shown)C.shown.append(GE.dock);await run;}
 finally{C.fxPlaying=false;C.fxBoard=null;document.body.classList.remove('cp-fx-on');drawBattle();}
}
// The player finds the fighters in this window while it plays here, and lights the one acting.
if(typeof GameEffects!=='undefined'){
 const node=GameEffects.actorNode,show=GameEffects.showAction;
 if(typeof node==='function')GameEffects.actorNode=function(id){if(C.fxPlaying&&C.shown&&id){const n=C.shown.querySelector('.combatant-row[data-actor-id="'+CSS.escape(id)+'"]');if(n)return n;}return node.call(this,id);};
 if(typeof show==='function')GameEffects.showAction=function(frame,...rest){if(C.fxPlaying&&C.shown)for(const row of C.shown.querySelectorAll('.combatant-row[data-actor-id]'))row.classList.toggle('acting',row.dataset.actorId===frame?.actorId);return show.call(this,frame,...rest);};
}
// ---------- 0.16: the fight plays out in this window too (user: 「전투 모션이 손님한테는 거의 없는 수준인데?」) ----------
// Between two views of the same fight, what changed plays out like the battle screen: the new lines one after another,
// the one acting lit, the numbers rising from whoever was hit or healed (the battle screen's .impact pictures), the HP bar
// running down with each blow, a shake and the hit sounds.
const ELEMENT_FX={'불':'fire','물':'water','얼음':'ice','번개':'lightning','바람':'wind','바위':'rock','풀':'dendro',PYRO:'fire',HYDRO:'water',CRYO:'ice',ELECTRO:'lightning',ANEMO:'wind',GEO:'rock',DENDRO:'dendro'};
const fxSettings=()=>{try{return typeof settings!=='undefined'?settings:{};}catch{return {};}};
let fxRun=0;
const unitsOf=v=>[...(v.allies||[]),...(v.enemies||[])];
// The lines added since the last view (the view keeps the last ten).
function newLines(a,b){const x=a.log||[],y=b.log||[];for(let k=Math.min(x.length,y.length);k>0;k--){let same=true;for(let i=0;i<k;i++)if(x[x.length-k+i]!==y[i]){same=false;break;}if(same)return y.slice(k);}return y.slice(-5);}
function fxCard(id){return C.shown?.querySelector('.combatant-row[data-actor-id="'+CSS.escape(id)+'"]')||null;}
function fxLayer(){const w=C.shown;if(!w)return null;let l=w.querySelector(':scope > .cp-fx');if(!l){l=mk('div','combat-effects cp-fx');l.setAttribute('aria-hidden','true');w.append(l);}return l;}
function fxBar(id,hp,max){const card=fxCard(id);if(!card)return;const stat=card.querySelector('.combatant-copy > .stat'),bar=card.querySelector('.combatant-copy > .meter i');if(stat)stat.textContent='HP  '+hp+' / '+max;if(bar)bar.style.width=Math.max(0,Math.min(100,hp/(max||1)*100))+'%';card.classList.toggle('dead',hp<=0);}
function fxPop(id,text,cls){
 const card=fxCard(id),layer=fxLayer();if(!card||!layer)return;const r=card.getBoundingClientRect();if(!r.width)return;
 const item=mk('div','impact kind-action '+cls);item.style.left=Math.round(r.left+r.width/2)+'px';item.style.top=Math.round(r.top+r.height/2)+'px';item.append(mk('strong','impact-label',text));layer.append(item);setTimeout(()=>item.remove(),1150);
 if(!fxSettings().reducedMotion)card.animate?.([{transform:'translateX(0)'},{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'translateX(0)'}],{duration:160,easing:'ease-out'});
}
function fxLine(text){const layer=fxLayer();if(!layer||!text)return;layer.querySelector(':scope > .cp-fx-line')?.remove();const n=mk('div','cp-fx-line',text);layer.append(n);setTimeout(()=>n.remove(),1400);}
function playChanges(a,b){
 const old=new Map(unitsOf(a).map(u=>[u.id,u])),now=unitsOf(b),lines=newLines(a,b).slice(-6);
 const hp=new Map(now.filter(u=>old.has(u.id)&&old.get(u.id).hp!==u.hp).map(u=>[u.id,old.get(u.id).hp]));
 if(!hp.size&&!lines.length)return;
 const run=++fxRun,final=new Map(now.map(u=>[u.id,u]));
 for(const [id,v] of hp)fxBar(id,v,final.get(id).maxHp);
 // A name may be on more than one fighter: the one whose HP still has that change to come.
 const pick=(name,dir)=>{const list=now.filter(u=>u.name===name);return list.find(u=>hp.has(u.id)&&(dir<0?hp.get(u.id)>u.hp:hp.get(u.id)<u.hp))||list[0]||null;};
 const steps=lines.map(line=>()=>{
  const m=line.match(/^(?:(.+?) → )?(.+?) · (.+)$/),actorName=m?(m[1]||m[2]):'',actor=actorName?now.find(u=>u.name===actorName):null;
  if(actor){const c=fxCard(actor.id);if(c){c.classList.add('cp-fx-acting');setTimeout(()=>c.classList.remove('cp-fx-acting'),560);}}
  fxLine(line);if(!m||!m[1]&&!/회복/.test(m[3]))return;
  const what=m[3],fx='effect-'+(ELEMENT_FX[actor?.element]||'hit'),heal=what.match(/회복 (\d+)/),dmg=heal?null:what.match(/^(\d+)/);
  if(/빗나감/.test(what)){const t=pick(m[2],-1);if(t)fxPop(t.id,'빗나감','worded');return;}
  const t=pick(m[2],heal?1:-1);if(!t)return;
  if(dmg){const n=Number(dmg[1]);if(hp.has(t.id)){hp.set(t.id,Math.max(t.hp,hp.get(t.id)-n));fxBar(t.id,hp.get(t.id),t.maxHp);}fxPop(t.id,'HP -'+fmt(n),fx+(/치명타/.test(what)?' critical':''));SND('hit');}
  else if(heal){const n=Number(heal[1]);if(hp.has(t.id)){hp.set(t.id,Math.min(t.hp,hp.get(t.id)+n));fxBar(t.id,hp.get(t.id),t.maxHp);}fxPop(t.id,'+'+fmt(n),'healing');SND('heal');}
 });
 // What changed without a line of its own (a burn, a field) shows at the end, and every bar lands where it is now.
 steps.push(()=>{for(const [id,v] of hp){const u=final.get(id),d=u.hp-v;if(d)fxPop(id,d<0?'HP -'+fmt(-d):'+'+fmt(d),d<0?'effect-hit':'healing');fxBar(id,u.hp,u.maxHp);}});
 const s=fxSettings(),gap=s.reducedMotion?80:Math.round(520/(Number(s.combatSpeed)||1));
 steps.forEach((fn,i)=>setTimeout(()=>{if(run!==fxRun||!C.shown)return;try{fn();}catch{}},i*gap));
}
function openBattle(){
 // 0.16: anyone fighting in someone else's fight (the host too, in a guest's fight) gets this window.
 if(!room())return;C.minimized=false;
 // 0.16 (user: 「왜 전투 부분만 다른거야? … 그냥 모든 부분을 다 똑같이」): a fight the server sends whole is one's own battle screen
 // (app_coop_world_v0160.js draws it from the fight); this window keeps the result and older servers' fights.
 if(C.battle?.state&&!C.ended){if(C.shown){const n=C.shown;C.shown=null;n.classList.remove('open');setTimeout(()=>n.remove(),160);}document.querySelector('body > .cp-pill')?.remove();render();return;}
 if(!C.shown){const wrap=mk('div','cp-battle');wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','다인 모드 전투');
  wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();minimize();}});
  wrap.append(mk('div','cp-bbox'));document.body.append(wrap);C.shown=wrap;requestAnimationFrame(()=>wrap.classList.add('open'));}
 document.querySelector('body > .cp-pill')?.remove();drawBattle();
}
function minimize(){C.minimized=true;if(C.shown){const n=C.shown;C.shown=null;n.classList.remove('open');setTimeout(()=>n.remove(),160);}pill();if(C.battle?.state)render();}
function closeBattle(all){if(C.shown){const n=C.shown;C.shown=null;n.classList.remove('open');setTimeout(()=>n.remove(),160);}if(all){C.battle=null;C.ended=null;document.querySelector('body > .cp-pill')?.remove();}}
// A small button to go back to the fight after minimizing it.
// 0.15.9: outside a fight the same corner shows where the party is (guests) or who is along (the host), and opens the room.
// The world note shows on one's own field and town screen only (0.15.15: not on the menu screens such as 관계 · 캐릭터 · 가방,
// nor inside a facility, on the title, in a story or in a fight). While it shows, the field screen's list keeps room under
// it (`cp-world-on`), so the last button can always be scrolled clear of the button.
function roaming(){
 try{if(!ready()||!O?.active||game.s.runtime||game.s.placeVisit)return false;return String(game.s.global.SCREEN_MODE||'')==='LOCATION'&&['FREE','LIFE','DOWNED'].includes(game.playPhase?.()||'FREE');}catch{return false;}
}
function pill(){
 let p=document.querySelector('body > .cp-pill');const r=room();
 const fight=C.minimized&&!!C.battle&&!!r;
 const world=!fight&&!!r?.world&&!C.node&&!C.shown&&roaming()&&(r.you==='GUEST'||r.count>0);
 document.body.classList.toggle('cp-world-on',world);
 if(!fight&&!world){p?.remove();return;}
 const fresh=!p;if(fresh){p=mk('button','cp-pill');p.type='button';document.body.append(p);}
 p.onclick=fight?openBattle:()=>C.open();p.classList.toggle('world',world);
 if(fight){const t=C.battle.turn;p.classList.toggle('mine',!!t?.mine);p.classList.remove('compact','news');p.removeAttribute('title');p.removeAttribute('aria-label');p.replaceChildren(SHELL.icon('COOP','shell-icon'),mk('span','',t?.mine?'내 차례! · 전투로 돌아가기':'다인 전투 · 라운드 '+C.battle.round));return;}
 p.classList.remove('mine');
 // Two short lines: who one is with, and where (or, for the host, the guests' suggestion). 0.16: a fight one can step
 // into comes first; a guest who walks alone says so.
 const w=r.world,sug=r.suggest&&r.suggest.map!==w.map?r.suggest:null,at=r.at,open=(r.fights||[]).find(f=>!f.mine&&!f.joined);
 // A fight elsewhere says where it is: one goes there to step in.
 const fightLine=open?'⚔ '+open.owner.name+' 님 전투 · '+(farFrom(open)?open.mapName:'참가'):'';
 const lines=r.you==='HOST'
  ?['함께 다니는 중 · 손님 '+r.count+'명',fightLine||(sug?'제안 · '+sug.name+' ('+sug.from.name+')':'내 세계 · '+w.name)]
  :[r.host.name+(at&&!at.follow?' 님의 세계':' 님과 함께'),fightLine||(at&&!at.follow?'혼자 · '+at.name:w.name+({STORY:' · 이야기 진행 중',BATTLE:' · 전투 중'}[w.doing]||(w.doing==='PLACE'&&w.place?' · '+w.place:'')))];
 const copy=mk('span','cp-pill-copy');copy.append(mk('strong','',lines[0]),mk('small','',lines[1]));
 p.title=lines.join(' · ')+' · 눌러서 방 열기';p.setAttribute('aria-label','다인 모드 · '+lines.join(' · '));
 p.replaceChildren(SHELL.icon('COOP','shell-icon'),copy);
 // Folded to a round button like the chat's, so it covers nothing; it opens for a few seconds when something changes.
 const sig=lines.join('|');p.classList.toggle('news',!!open||!!sug&&r.you==='HOST');
 if(fresh||C.pillSig!==sig){C.pillSig=sig;p.classList.remove('compact');clearTimeout(C.pillFold);C.pillFold=setTimeout(()=>document.querySelector('body > .cp-pill.world')?.classList.add('compact'),5000);}
}
const left=t=>t?.deadline?Math.max(0,Math.ceil((t.deadline-(C.battle?.now||0)-(Date.now()-C.battleAt))/1000)):null;
// 0.15.25 (user: 「왜 얘만 다른 화면이야? 그냥 화면 다 똑같이 하면 안되는거야?」): a guest's fight is drawn with the battle screen's
// own parts — the round's order with faces, the enemies' pictures, the party down the side, the skills along the bottom
// with their pictures — and a target is chosen by touching the enemy, as in one's own fights. The same style sheet
// lays it out (the panel is a .combat-panel); only what the server sends about the fight is shown.
const SLOT=id=>id==='PLAYER_BASIC_ATTACK'?'na':/_Q$/.test(id)?'q':/_E(_CHARGE)?$/.test(id)?'e':null;
const unitOf=(v,id)=>v.allies.find(u=>u.id===id)||v.enemies.find(u=>u.id===id)||null;
function portraitSrc(u){try{return typeof combatPortraitSrc==='function'&&(typeof showArt==='undefined'||showArt)?combatPortraitSrc({side:u.side,source:u.source}):null;}catch{return null;}}
function faceOf(u,cls){const src=portraitSrc(u);if(src){const i=mk('img',cls);i.src=src;i.alt='';i.decoding='async';i.draggable=false;return i;}return mk('span',cls+' mark','✦');}
function fighterCard(v,u,targets){
 const target=targets.has(u.id),c=mk('div','actor combatant-row'+(u.hp<=0?' dead':'')+(target&&C.target===u.id?' selected':'')+(v.turn?.actor===u.id?' shell-acting':''));c.dataset.actorId=u.id;c.dataset.side=u.side;c.dataset.maxHp=u.maxHp;
 const src=portraitSrc(u);if(src){const img=mk('img','combat-portrait');img.src=src;img.alt='';img.decoding='async';c.append(img);}else c.append(mk('span','combat-player-mark','✦'));
 const copy=mk('div','combatant-copy'),name=mk('strong','');
 const own=typeof CRPGIcons!=='undefined'?CRPGIcons.element(CRPGIcons.ofActor({side:u.side,source:u.source,element:u.element}),'own-element'):null;if(own)name.append(own);
 name.append(mk('small','shell-level','Lv.'+u.level),document.createTextNode(u.name));copy.append(name);
 if(typeof meter==='function')meter(copy,'HP',u.hp,u.maxHp);
 if(u.shield>0&&typeof meter==='function'){const sb=mk('div','shield-meter');meter(sb,'보호막',u.shield,u.shield);copy.append(sb);}
 // 0.16: the side of the save the fight is in — the host's, or the guest's whose fight it is.
 const side=v.owner&&!v.owner.host?v.owner.name:'방장';
 const tags=[];if(u.guest)tags.push([u.guest.mine?'나':u.guest.name,'cp-tag'+(u.guest.mine?' me':'')]);else if(u.host)tags.push([u.protagonist?side:side+' 동료','cp-tag host']);if(u.guest?.left)tags.push(['스스로 싸움','cp-tag auto']);if(u.grade==='보스')tags.push(['보스','cp-tag boss']);
 if(tags.length){const row=mk('span','cp-tags');for(const [t,cls]of tags)row.append(mk('em',cls,t));copy.append(row);}
 if(u.statuses?.length||u.airborne){const row=mk('span','status-chips');if(u.airborne)row.append(mk('span','st-chip hold','공중'));for(const s of u.statuses||[])row.append(mk('span','st-chip',s));copy.append(row);}
 c.append(copy);
 const aura=typeof CRPGIcons!=='undefined'?CRPGIcons.kindOf(u.aura):null;if(aura){const badge=mk('span','shell-aura-badge aura-'+aura),pic=CRPGIcons.element(aura);if(pic)badge.append(pic);badge.append('부착');c.append(badge);}
 if(target){c.classList.add('targetable');c.tabIndex=0;c.setAttribute('role','button');c.setAttribute('aria-pressed',String(C.target===u.id));c.setAttribute('aria-label',u.name+' 대상으로 고르기');
  c.addEventListener('click',e=>{if(e.target.closest('button')||C.target===u.id)return;C.target=u.id;drawBattle();});c.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target===c){e.preventDefault();c.click();}});}
 return c;
}
function fightOrder(v){
 if(!v.order?.length)return null;const ol=mk('ol','battle-order compact-order');ol.setAttribute('aria-label','이번 라운드 행동 순서');
 v.order.forEach((id,i)=>{const u=unitOf(v,id);if(!u)return;const now=v.turn?.actor===id,li=mk('li',(u.side==='ALLY'?'ally':'enemy')+(now?' current':'')+' with-face');li.dataset.actorId=id;li.append(mk('small','',String(i+1)),faceOf(u,'order-face'),mk('span','',u.name));if(now)li.append(mk('small','','현재'));ol.append(li);});
 return ol;
}
function fightCommand(v,chosen){
 const s=mk('section','battle-command'),t=v.turn,who=t?unitOf(v,t.actor):null,banner=mk('div','battle-turn-banner '+(who?.side==='ENEMY'?'enemy':'ally'));
 banner.append(who?faceOf(who,'battle-turn-face'):mk('span','battle-turn-face mark','✦'));
 // 0.16: the fight may be a guest's; its owner starts it and plays its own side.
 const own=v.owner&&!v.owner.host?v.owner.name+' 님':'방장';
 const copy=mk('div','battle-turn-copy');copy.append(mk('strong','',v.opening?'전투 시작 전':t?.mine?'내 차례 · '+(v.me?.name||''):t?.host?own+' '+(t.name||'')+'의 차례':t?(t.ownerName+' 님의 차례 · '+t.name):'진행 중…'),
  mk('small','',v.opening?own+'이(가) 「전투 시작」을 누르면 시작합니다':!v.me?'다음 라운드가 시작되면 내 캐릭터가 들어갑니다':v.me.left?'자리를 비운 동안 '+v.me.name+'이(가) 스스로 싸웁니다':!v.me.alive?v.me.name+'이(가) 쓰러졌습니다':t?.mine?'기술을 고르고 적을 눌러 대상을 정한 뒤 실행':'차례를 기다리는 중'));
 banner.append(copy);const tl=left(t);if(tl!==null)banner.append(mk('span','cp-count'+(tl<=5?' hurry':''),tl+'초'));s.append(banner);
 if(!(t?.mine&&v.cards?.length))return s;
 const cards=mk('div','battle-cards');
 for(const c of v.cards){const slot=SLOT(c.id),wrap=mk('div','battle-card-choice'+(slot==='q'?' shell-burst':'')),b=mk('button',(c.id===C.card?'selected':'')+(slot==='e'||slot==='q'?' skill-'+slot:''));b.type='button';b.dataset.cardId=c.id;
  const owner=slot==='na'?v.me?.source:(game?.tables?.['08_SKILL_CARD_DB']?.get(c.id)?.[2]||v.me?.source),pic=slot&&owner&&typeof CRPGIcons!=='undefined'?CRPGIcons.talent(owner,slot,'shell-card-glyph'):null;
  if(pic)b.append(pic);else{const g=mk('span','shell-card-glyph');g.setAttribute('aria-hidden','true');g.append(SHELL.icon(c.id==='PLAYER_BASIC_ATTACK'?'SWORD':c.id==='PLAYER_BASIC_GUARD'?'SHIELD':'DIAMOND','shell-icon'));b.append(g);}
  b.append(mk('strong','',c.name),mk('small','',c.reason||(c.cooldown?'재사용 '+c.cooldown+'차례':'사용 가능')));
  if(c.reason){b.disabled=true;b.title=c.reason;b.dataset.reason=c.reason;}else{b.onclick=()=>{C.card=c.id;C.branch='';drawBattle();};if(c.description)b.title=c.description;}
  wrap.append(b);cards.append(wrap);}
 s.append(cards);
 const go=mk('div','battle-execute');
 if(chosen?.branches?.length)go.append(choiceTiles({label:'스킬 방식',className:'battle-branches',options:chosen.branches.map(x=>({value:x,label:({TAP:'짧게',HOLD:'길게',CHARGE:'차지',PURSUIT:'추격',EXPLOSION:'폭발'})[x]||x})),value:C.branch,onChange:val=>{C.branch=val;}}));
 go.append(btn(C.busy?'보내는 중…':'실행',()=>command(),'primary cp-run',!chosen?'쓸 수 있는 행동이 없습니다.':C.busy?'잠시 기다려 주세요.':''),btn('자동으로 맡기기',()=>auto(true),'',C.busy?'잠시 기다려 주세요.':''));
 s.append(go);return s;
}
function fightPanel(v,r){
 if(v.turn?.mine&&v.cards?.length){if(!v.cards.some(c=>c.id===C.card&&!c.reason))C.card=v.cards.find(c=>!c.reason)?.id||'';}
 const chosen=v.turn?.mine?v.cards.find(c=>c.id===C.card):null;if(chosen&&!chosen.targets?.some(t=>t.id===C.target))C.target=chosen.targets?.[0]?.id||'';
 if(chosen?.branches?.length&&!chosen.branches.includes(C.branch))C.branch=chosen.branches[0];
 const targets=new Set((chosen?.targets||[]).map(t=>t.id)),p=mk('section','panel combat-panel coop-combat');
 const head=mk('div','battle-heading');head.append(mk('span','eyebrow',v.opening?'전투 시작 전':'ROUND '+v.round),mk('h1','',v.title||v.encounter||'함께 싸우는 전투'));if(v.owner&&!v.owner.host)head.append(mk('span','cp-head-host',v.owner.name+' 님의 전투'));else if(r?.host?.name)head.append(mk('span','cp-head-host','방장 '+r.host.name));
 const rec=btn('기록',()=>{const box=mk('div','log');for(const line of v.log||[])box.append(mk('p','',line));if(!box.children.length)box.append(mk('p','','아직 기록이 없습니다.'));showModal('전투 기록',box);},'battle-head-button');
 const mini=btn('작게 보기',minimize,'battle-head-button'),out=btn('방 나가기',leave,'battle-head-button cp-danger',C.busy?'잠시 기다려 주세요.':'');head.append(rec,mini,out);p.append(head);
 const order=fightOrder(v);if(order)p.append(order);
 const duo=mk('div','combat-duo'),stage=mk('div','compact-battle-stage'),teams=mk('div','battle-teams compact-teams'),allies=mk('section','shell-allies'),enemies=mk('section','shell-enemies');
 allies.append(mk('h2','','우리 파티'));enemies.append(mk('h2','','적'));
 for(const u of v.allies)allies.append(fighterCard(v,u,targets));
 const n=v.enemies.length;enemies.dataset.count=String(n);enemies.dataset.rows=n>4?'2':'1';enemies.style.setProperty('--cols',String(n>4?Math.ceil(n/2):Math.max(1,n)));for(const u of v.enemies)enemies.append(fighterCard(v,u,targets));
 teams.append(allies,enemies);stage.append(teams);duo.append(stage,fightCommand(v,chosen));p.append(duo);
 if(C.msg){const m=mk('p','cp-msg',C.msg);m.setAttribute('role','alert');p.append(m);}
 return p;
}
function drawBattle(){
 // 0.16: while the fight's blows play, the board stays as the player leaves it; it is drawn once they are done. A fight on
 // one's own battle screen is drawn by the screen (render).
 if(C.fxPlaying){pill();return;}
 if(!C.shown&&C.battle?.state&&!C.minimized){pill();render();return;}
 pill();const wrap=C.shown;if(!wrap)return;const box=wrap.querySelector('.cp-bbox'),v=C.battle,r=room(),parts=[];
 wrap.classList.toggle('coop-fight',!!v);
 if(v){box.replaceChildren(fightPanel(v,r));return;}
 const h=mk('header','cp-bhead');const t=mk('div','cp-head-copy');
 const owner=C.endedOwner||C.lastOwner,sub=[owner&&!owner.host?owner.name+' 님의 전투':r?'방장 '+r.host.name:'',C.ended?'전투 결과':''].filter(Boolean).join(' · ');
 t.append(mk('strong','',(C.ended&&C.lastTitle)||'함께 싸우는 전투'),mk('small','',sub));h.append(SHELL.icon('COOP','shell-icon cp-head-icon'),t);
 const mini=mk('button','cp-close');mini.type='button';mini.setAttribute('aria-label','작게 보기');mini.append(SHELL.icon('BACK','shell-icon'));mini.onclick=minimize;mini.title='작게 보기';h.append(mini);parts.push(h);
 const body=mk('div','cp-bbody');
 if(C.ended){
  const res=mk('section','cp-result '+(C.ended.victory?'win':'lose'));res.append(mk('h2','',C.ended.victory?'승리':'패배'));
  if(C.ended.victory){res.append(mk('p','','전투 보상 · 경험치 '+fmt(C.ended.xp)+' · '+fmt(C.ended.mora)+' 모라'+(Object.keys(C.ended.loot||{}).length?' · '+Object.entries(C.ended.loot).map(([id,n])=>itemName(id)+' '+n+'개').join(', '):'')));
   res.append(mk('p','cp-note',C.rewards?.length?'내 여정에 들어온 보상 · '+C.rewards.map(rewardLine).join(' / '):'보상을 내 여정에 넣는 중입니다…'));
   for(const w of C.rewards||[])for(const n of w.notes||[])res.append(mk('p','cp-why',n));}
  else res.append(mk('p','',(owner&&!owner.host?owner.name+' 님':'방장')+'의 파티가 쓰러졌습니다. 함께한 모험가는 잃는 것이 없습니다.'));
  res.append(btn('닫기',()=>{C.ended=null;closeBattle(false);},'primary'));body.append(res);
 }else{body.append(mk('p','cp-empty',r?.battle?.running&&!r.battle.shared?r.battle.solo:'함께 싸우는 전투가 없습니다.'));body.append(btn('닫기',()=>closeBattle(false),'primary'));}
 const foot=mk('footer','cp-bfoot');foot.append(btn('작게 보기',minimize),btn('방 나가기',leave,'cp-danger',C.busy?'잠시 기다려 주세요.':''));
 box.replaceChildren(...parts,body,foot);
 if(C.msg&&C.shown){const m=mk('p','cp-msg',C.msg);m.setAttribute('role','alert');box.insertBefore(m,foot);}
}let pendingCommand=null;
async function command(){
 if(C.busy||!C.battle?.turn?.mine)return;const session=O.sessionStamp();C.busy=true;C.msg='';drawBattle();
 const payload={card:C.card,target:C.target||undefined,branch:C.branch||undefined,battle:C.battle.battle,turn:{actor:C.battle.turn.actor,deadline:C.battle.turn.deadline,round:C.battle.round}},intent=JSON.stringify(payload);
 if(pendingCommand?.intent!==intent)pendingCommand={intent,payload:{...payload,requestId:'coop-'+crypto.randomUUID()}};
 try{const out=await O.request('/coop/act',pendingCommand.payload);pendingCommand=null;if(out&&'battle' in out)setBattle(out.battle);SND('click');}
 catch(e){if(!O.sameSession(session))return;if(e.code==='SESSION_CHANGED'||e.outcome==='REJECTED'||e.status&&e.status<500)pendingCommand=null;C.msg=e.message;SND('error');load();}
 finally{if(O.sameSession(session)){C.busy=false;drawBattle();}}
}
// After the 20 seconds, any client in the room asks for the AI to play the waiting turn (the server checks the time).
async function auto(mine=false){
 const t=C.battle?.turn||null,key=t?C.battle.battle+':'+t.actor+':'+t.deadline:'';
 if(!t||t.host||(!mine&&C.autoAsked===key))return;C.autoAsked=key;
 try{const out=await O.request('/coop/auto',{});if(out?.battle)setBattle(out.battle);}
 catch(e){if(mine){C.msg=e.message;drawBattle();}}
}
// ---------- the host's own battle screen ----------
// 0.16: a fight one is in that is someone else's is drawn on one's own battle screen too (app_coop_world_v0160.js).
const fightGame=()=>{try{return game?.s?.runtime?game:window.CRPGCoopWorld?.fightGame?.()||null;}catch{return null;}};
function hostTurn(){try{const g=fightGame();return g?.s?.runtime?.coop?g.coopTurnInfo():null;}catch{return null;}}
async function hostAuto(){
 const g=fightGame(),t=hostTurn(),key=t?g.s.runtime.id+':'+t.actor+':'+t.deadline:'';if(!t||C.autoAsked===key||isBusy())return;C.autoAsked=key;
 try{await O.request('/coop/auto',{});}
 catch(e){
  // The room is gone (a server restart): the host's own action moves the fight on (the rules check the time).
  if(e.status===404&&!isBusy()&&game?.s?.runtime&&typeof act==='function'){try{await act('COOP_AUTO',{});}catch{}}
 }
}
if(typeof combat==='function'){const prior=combat;combat=function(p,...args){
 const out=prior(p,...args);
 try{
  const b=game.s.runtime;if(!b?.coop)return out;
  const me=C.status?.me?.pid||'';
  for(const row of p.querySelectorAll('.combatant-row[data-actor-id]')){const a=b.actors.find(x=>x.id===row.dataset.actorId);if(!a?.coop)continue;const own=a.coop.owner===me;
   // A protagonist someone brought has the protagonist's mark, as one's own does.
   if(a.source==='PLAYER_CUSTOM'&&(typeof showArt==='undefined'||showArt)&&!row.querySelector(':scope > .combat-portrait,:scope > .combat-player-mark'))row.prepend(mk('span','combat-player-mark','✦'));
   const tag=mk('span','cp-host-tag'+(a.coop.left?' away':'')+(own?' me':''),(own?'나':'동료 모험가 · '+a.coop.ownerName)+(a.coop.left?' · 스스로 싸움':''));tag.title=own?'내가 데려온 캐릭터입니다.':a.coop.ownerName+' 님이 데려온 캐릭터입니다.';(row.querySelector('.combatant-copy')||row).append(tag);}
  const t=hostTurn(),cmd=p.querySelector('.battle-command');
  if(t&&cmd){const own=t.owner===me,w=mk('div','cp-host-wait'+(own?' mine':''));w.setAttribute('role','status');w.append(SHELL.icon('COOP','shell-icon'),mk('strong','',own?'내 차례':t.ownerName+' 님의 차례'),mk('span','cp-host-count',''),mk('small','','고르지 않으면 시간이 지난 뒤 스스로 싸웁니다.'));cmd.prepend(w);}
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
 syncWanted=true;if(syncing)return;const session=O.sessionStamp();syncing=true;
 try{for(let i=0;i<60&&syncWanted&&O.sameSession(session);i++){if(isBusy()){await sleep(400);continue;}syncWanted=false;const keep=screenNow();try{await O.sync();}catch{}await keepScreen(keep);}}finally{syncing=false;}
}
// 0.16 (user: 「한 쪽이 승리했을 때 보상창이 나오고 … 이동할때마다 계속 보상창이 나오는 버그」): a sync brings the save as the server
// has it, and a screen one moved to on this device (「계속」 after a fight's result, a menu) is saved only with the next
// action. The room's syncs keep that screen, unless the sync brings something new (a fight, a new result, a story).
const LOCAL_SCREENS=new Set(['LOCATION','HUB','MAIN_MENU','PARTY','STATUS','INVENTORY','QUEST','RELATIONS','SYSTEM']);
function resultId(){try{const x=JSON.parse(game.s.global.LAST_BATTLE_RESULT_JSON||'null');return String(x?.battleId||x?.id||'');}catch{return '';}}
function screenNow(){try{if(!ready()||game.s.runtime)return null;const g=game.s.global;return {screen:String(g.SCREEN_MODE||''),result:resultId(),save:g.SAVE_ID};}catch{return null;}}
async function keepScreen(k){
 try{
  if(!k||!LOCAL_SCREENS.has(k.screen)||!ready()||game.s.runtime||game.s.global.SAVE_ID!==k.save||resultId()!==k.result)return;
  const now=String(game.s.global.SCREEN_MODE||'');if(now===k.screen||(now!=='REWARD'&&!LOCAL_SCREENS.has(now)))return;
  if(typeof act==='function'&&!isBusy()&&!game.actionReason('MENU',{screen:k.screen}))await act('MENU',{screen:k.screen});
 }catch{}
}
// ---------- 0.16: one battle speed for the room (user: 「배속도 공유하게 해야겠는데」) ----------
// Whoever moves 「전투 속도」 while in a room moves it for everyone in it; the room's speed is taken on entering it. The
// room counts its changes (speedRev), so an older snapshot of the room never puts back an earlier speed (SPEED is at the top).
const speedLabel=v=>window.BattleFX?.speedLabel?.(v)||Number(v).toFixed(2).replace(/0$/,'')+'×';
function setSpeed(v){
 try{
  if(typeof settings==='undefined')return false;v=Math.min(Number(window.BattleFX?.SPEED_MAX)||2,Math.max(.5,Number(v)));
  if(!Number.isFinite(v)||Number(settings.combatSpeed)===v)return false;settings.combatSpeed=v;
  for(const r of document.querySelectorAll('.combat-speed input'))r.value=String(v);
  for(const o of document.querySelectorAll('.combat-speed output'))o.textContent=speedLabel(v);
  try{GameEffects.reschedule();}catch{}try{persistSettings();}catch{}return true;
 }catch{return false;}
}
function speedFromRoom(){
 const r=room();if(!r?.id){SPEED.room=null;SPEED.rev=-1;return;}
 if(SPEED.room!==r.id){SPEED.room=r.id;SPEED.rev=-1;}
 if(!Number.isFinite(r.speed)||SPEED.flight||SPEED.want!==null||!(Number(r.speedRev)>SPEED.rev))return;
 SPEED.rev=Number(r.speedRev);setSpeed(r.speed);
}
function speedNews(ev){
 const r=room();if(!r||r.id!==ev.room||!Number.isFinite(ev.speed))return;
 if(SPEED.room!==r.id){SPEED.room=r.id;SPEED.rev=-1;}if(!(Number(ev.rev)>SPEED.rev))return;
 SPEED.rev=Number(ev.rev);r.speed=ev.speed;r.speedRev=ev.rev;
 if(setSpeed(ev.speed)&&ev.by?.pid!==C.status?.me?.pid)toast((ev.by?.name||'모험가')+' 님이 전투 속도를 '+speedLabel(ev.speed)+'로 바꿨습니다.');
}
async function sendSpeed(v){
 SPEED.want=v;if(SPEED.flight)return;SPEED.flight=true;
 try{while(SPEED.want!==null){const x=SPEED.want;SPEED.want=null;
  try{const out=await O.request('/coop/speed',{speed:x}),r=room();if(r&&Number(out?.rev)>SPEED.rev){SPEED.room=r.id;SPEED.rev=Number(out.rev);r.speed=out.speed;r.speedRev=out.rev;}}
  catch(e){toast(e.message||'전투 속도를 함께 바꾸지 못했습니다.');}}}
 finally{SPEED.flight=false;}
}
document.addEventListener('change',e=>{const r=e.target;if(!r?.closest?.('.combat-speed')||!room()||!online())return;const v=Number(r.value);if(Number.isFinite(v))sendSpeed(v);},true);
window.CRPGChat?.on?.(ev=>{
 if(ev?.type==='coop'&&ev.kind==='speed'){speedNews(ev);return;}
 if(ev?.type!=='coop'||ev.kind==='puzzle')return;roomNews++;
 if(['kicked','left','closed'].includes(ev.kind)){const was=!!room();C.status={...(C.status||{}),room:null,battle:null};if(ev.kind!=='left'||was)toast(ev.reason||'방이 닫혔습니다.');C.msg=ev.reason||'';closeBattle(true);draw();schedule();return;}
 if(ev.kind==='invite'){C.invites=[...C.invites.filter(x=>x.room!==ev.invite.room),{room:ev.invite.room,from:ev.invite.from,at:Date.now()}];showInvite(ev.invite);draw();return;}
 if(ev.kind==='declined'){toast(ev.from.name+' 님이 초대를 거절했습니다.');return;}
 if(ev.kind==='reward'){showRewards(ev.rewards||[]);if(ev.sync)wantSync();return;}
 if(ev.kind==='sync'){wantSync();return;}
 // 0.15.9: the room's talk, a suggestion for the host, the host moving for a guest (a note when the window is closed).
 if(ev.kind==='say'){if(ev.line&&room()?.id===ev.room){addLine(ev.line);if(!C.node&&!window.CRPGChat?.coopVisible?.()&&ev.line.from.pid!==C.status?.me?.pid&&!muted(ev.line.from.pid)){toast(ev.line.from.name+' · '+ev.line.text);SND('notice');}}return;}
 if(ev.kind==='suggest'&&ev.room?.you==='HOST'&&ev.room.suggest){toast(ev.room.suggest.from.name+' 님이 「'+ev.room.suggest.name+'」(으)로 가자고 합니다.');SND('notice');}
 // 0.16: only those who follow the host move with them.
 if(ev.kind==='moved'&&ev.room?.you==='GUEST'&&ev.room.world&&ev.room.at?.follow!==false&&!C.node)toast('방장이 「'+ev.room.world.name+'」(으)로 이동했습니다. 함께 이동합니다.');
 // 0.16: someone's fight one can step into; a chest a guest opened for the host.
 if(ev.kind==='fight'&&ev.fight){if(ev.fight.owner.pid!==C.status?.me?.pid)showFightPrompt(ev.fight);return;}
 // 0.16: a chest someone unsealed stays where it is; the host goes there and opens it.
 if(ev.kind==='chest'&&ev.chest){const mine=room()?.you==='HOST',by=ev.chest.by?.name||'모험가',what=ev.chest.puzzle===false?'보물상자를 찾아냈습니다':'보물상자의 암호를 풀어냈습니다';
  if(ev.chest.by?.pid!==C.status?.me?.pid){toast(mine?by+' 님이 '+(ev.chest.mapName||'')+'에서 '+what+' · 가서 열 수 있습니다':by+' 님이 방장의 '+what);SND('chest_unlock');}if(mine)wantSync();draw();return;}
 // 0.16: news that carries only the room's id (the shared boards' are read in app_coop_puzzle_v0160.js) never replaces it.
 if(ev.room!==undefined&&(ev.room===null||typeof ev.room==='object')){C.status={...(C.status||{enabled:true}),room:ev.room};
  // The server sends a fight's result only to those who fought in it (0.16: in anyone's fight). 0.16: its last blows play
  // first (ev.ended.fx), then the result.
  if(ev.kind==='ended'&&ev.ended){
   const show=()=>{C.holdBattle=false;C.fxBoard=null;C.ended=ev.ended;C.endedOwner=ev.ended.owner?{name:ev.ended.owner.name,host:ev.ended.owner.pid===ev.room?.host?.pid}:C.lastOwner||null;SND(ev.ended.victory?'victory':'defeat');if(!C.minimized)openBattle();setBattle(ev.battle||null);draw();
    // The battle screen of that fight gives way to one's own screen under the result.
    if(!ev.battle&&typeof render==='function')render();};
   // (user: 「손님쪽이 마지막에 모션 없이 종료가 되는문제」) The fight one watched — on the battle screen or in this window — even if
   // a room update already cleared it; its last blows play on its board as it was, then the result.
   closePromptFor(ev.room);const last=C.battle||(C.lastFight&&(!ev.ended.battle||C.lastFight.battle===ev.ended.battle)?C.lastFight:null);
   const frames=last&&ev.ended.fx&&(C.shown||last.state)&&!C.minimized?framesFor(last,{...last,fx:ev.ended.fx}):null;
   if(frames?.length){C.holdBattle=true;if(C.battle!==last){C.battle=last;C.fxBoard=last;}fxChain=fxChain.then(()=>runFrames(frames)).catch(()=>{}).then(show);draw();if(!C.shown)render();return;}
   show();return;
  }
  closePromptFor(ev.room);setBattle(ev.battle||null);draw();}
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
 else{label=mine?'같이 하기 · 초대':'같이 하기';run=async()=>{closeCard?.();C.open();if(!room()){const out=await call('/coop/open',{visibility:'INVITE'});if(!out)return;await load(true);}await invite(v.pid,v.name);};
  if(!lock){if(x.busy)lock=v.name+' 님은 다른 방에서 함께하는 중입니다.';else if(!v.online)lock=v.name+' 님은 지금 접속해 있지 않습니다.';else if(mine&&mine.you!=='HOST')lock='손님으로 들어간 방에서는 초대할 수 없습니다.';else if(mine&&!x.canInvite)lock='방이 가득 찼습니다.';}}
 const b=mk('button','pf-btn cp-profile-btn'+(lock?'':' primary'),label);b.type='button';b.onclick=run;if(lock){b.disabled=true;b.title=lock;b.dataset.reason=lock;}return b;
};
// Find out once per login whether this server runs 다인 모드, keep the room, forget everything on logout.
if(typeof render==='function'){const prior=render;render=function(){prior();try{
 if(!online()){if(C.status||C.enabled!==null||C.loading||C.node){roomSequence++;roomNews++;roomFlight=null;C.loading=false;C.busy=false;C.probe=0;C.status=null;C.enabled=null;C.list=null;C.invites=[];C.draft='';closeBattle(true);closeInvite();close();schedule();}return;}
 if(C.enabled===null&&!C.loading&&Date.now()>=C.probe){C.probe=Date.now()+30000;load();}
 schedule();pill();
}catch{}};}
})();
