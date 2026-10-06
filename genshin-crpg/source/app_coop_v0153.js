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
 pill();const wrap=C.node;if(!wrap)return;const box=wrap.querySelector('.cp-box'),parts=[];
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
// The places one step away from the host (the same map data every journey has); the host decides whether the way is open.
function neighbors(id){
 const out=new Map();try{for(const e of game.rows('47_MAP_EDGE_DB'))if(e[1]===id&&e[8]!=='N'&&(e[11]||'ACTIVE')==='ACTIVE'&&e[2]!==id&&game.tables['32_MAP_DB'].has(e[2]))out.set(e[2],{id:e[2],name:mapName(e[2])});}catch{}
 return [...out.values()];
}
function doingText(w,r){
 if(w.doing==='BATTLE')return r.battle?.shared===false?'방장이 혼자 싸우는 중':'전투 중';
 if(w.doing==='STORY')return '이야기 진행 중 · 이야기 전투는 방장 혼자 합니다';
 if(w.doing==='PLACE')return (w.place||'시설')+' 이용 중';
 return (w.safe?'안전한 거점':'야외 · 이동 중 적과 마주칠 수 있음')+(w.levels?' · 권장 Lv.'+w.levels[0]+'~'+w.levels[1]:'');
}
// The region's map with the party's pin (and the suggested place), centred on the party.
function miniMap(id,suggestId){
 const T=window.CRPGTerrainMap,pt=T?.points?.[id];if(!pt)return null;const A=T.atlases?.[pt[0]];if(!A)return null;
 const box=mk('div','cp-minimap');box.setAttribute('role','img');box.setAttribute('aria-label',A.name+' 지도 · 지금 파티가 있는 곳');
 const W=T.width||880,H=T.height||786,layer=mk('div','cp-minimap-layer');layer.style.transform='translate('+(-pt[1]/W*100).toFixed(2)+'%,'+(-pt[2]/H*100).toFixed(2)+'%)';
 const img=mk('img');img.src=A.url;img.alt='';img.decoding='async';layer.append(img);
 const pin=(p,cls,label)=>{const d=mk('span','cp-pin '+cls);d.style.left=(p[1]/W*100).toFixed(2)+'%';d.style.top=(p[2]/H*100).toFixed(2)+'%';d.append(mk('em','',label));layer.append(d);};
 const sp=suggestId&&suggestId!==id?T.points[suggestId]:null;if(sp&&sp[0]===pt[0])pin(sp,'suggest','제안');
 pin(pt,'party','함께');box.append(layer);return box;
}
function worldSection(r){
 const w=r.world,s=mk('section','cp-world');s.append(mk('h3','',r.you==='HOST'?'함께 다니기 · 내 세계':'함께 다니기 · '+r.host.name+' 님의 세계'));
 if(!w){s.append(mk('p','cp-empty','방장의 위치를 불러오는 중…'));return s;}
 const where=mk('div','cp-where');where.append(mk('strong','',(w.region?w.region+' · ':'')+w.name),mk('small','',doingText(w,r)+(w.time?' · '+w.day+'일차 '+w.time:'')));s.append(where);
 const sug=r.suggest&&r.suggest.map!==w.map?r.suggest:null,map=miniMap(w.map,sug?.map);if(map)s.append(map);
 if(sug){const p=mk('div','cp-suggested');p.append(mk('span','',sug.from.name+' 님 · 「'+sug.name+'」(으)로 가요'));if(r.you==='HOST')p.append(btn('지도에서 보기',()=>showOnMap(sug.map),'cp-mini'));s.append(p);}
 if(r.you==='GUEST'){const near=neighbors(w.map);if(near.length&&w.doing!=='BATTLE'){const row=mk('div','cp-chips');row.setAttribute('aria-label','가자고 하기');row.append(mk('small','cp-chips-label','가자고 하기'));
  for(const n of near.slice(0,8))row.append(btn(n.name,()=>suggest(n.id),'cp-chip'+(sug?.map===n.id?' on':''),C.busy?'잠시 기다려 주세요.':''));s.append(row);}}
 s.append(mk('small','cp-note',r.you==='HOST'?'내가 이동하면 손님들도 함께 이동합니다. 손님이 가고 싶은 곳을 고르면 여기와 지도에 보입니다.':'방장이 파티를 이끕니다. 방장이 이동하면 함께 이동하고, 가고 싶은 곳은 「가자고 하기」로 알려 주세요. 내 여정의 위치는 그대로입니다.'));
 return s;
}
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
function addLine(line){const r=room();if(!r)return;const log=r.log||[];if(log.some(l=>l.at===line.at&&l.from.pid===line.from.pid&&l.text===line.text))return;r.log=[...log,line].slice(-20);draw();}
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
 const b=r.battle;const state=mk('section','cp-state'+(b?.running?' running':''));
 state.append(mk('strong','',b?.running?(b.shared?'전투 중 · '+(b.opening?'시작 전':'라운드 '+b.round):'방장이 혼자 싸우는 중'):'전투를 기다리는 중'),
  mk('small','',b?.running?(b.shared?(b.title||'함께 싸우는 전투')+(r.you==='GUEST'?' · '+(me&&C.battle?.me?'내 캐릭터가 싸우고 있습니다':'다음 라운드부터 함께 싸웁니다'):''):b.solo):(r.you==='HOST'?'필드에서 전투가 시작되면 손님들이 함께 싸웁니다.':'방장이 필드에서 싸움을 시작하면 함께 싸웁니다.')));
 if(r.you==='GUEST'&&b?.shared&&C.battle)state.append(btn('전투 화면 보기',()=>{C.minimized=false;openBattle();},'primary'));
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
// 0.15.9: outside a fight the same corner shows where the party is (guests) or who is along (the host), and opens the room.
// The world note shows on one's own field and town screen only (0.15.15: not on the menu screens such as 관계 · 캐릭터 · 가방,
// nor inside a facility, on the title, in a story or in a fight). While it shows, the field screen's list keeps room under
// it (`cp-world-on`), so the last button can always be scrolled clear of the button.
function roaming(){
 try{if(!ready()||!O?.active||game.s.runtime||game.s.placeVisit)return false;return String(game.s.global.SCREEN_MODE||'')==='LOCATION'&&['FREE','LIFE','DOWNED'].includes(game.playPhase?.()||'FREE');}catch{return false;}
}
function pill(){
 let p=document.querySelector('body > .cp-pill');const r=room();
 const fight=C.minimized&&!!C.battle&&r?.you==='GUEST';
 const world=!fight&&!!r?.world&&!C.node&&!C.shown&&roaming()&&(r.you==='GUEST'||r.count>0);
 document.body.classList.toggle('cp-world-on',world);
 if(!fight&&!world){p?.remove();return;}
 const fresh=!p;if(fresh){p=mk('button','cp-pill');p.type='button';document.body.append(p);}
 p.onclick=fight?openBattle:()=>C.open();p.classList.toggle('world',world);
 if(fight){const t=C.battle.turn;p.classList.toggle('mine',!!t?.mine);p.classList.remove('compact','news');p.removeAttribute('title');p.removeAttribute('aria-label');p.replaceChildren(SHELL.icon('COOP','shell-icon'),mk('span','',t?.mine?'내 차례! · 전투로 돌아가기':'다인 전투 · 라운드 '+C.battle.round));return;}
 p.classList.remove('mine');
 // Two short lines: who one is with, and where (or, for the host, the guests' suggestion).
 const w=r.world,sug=r.suggest&&r.suggest.map!==w.map?r.suggest:null,lines=r.you==='HOST'
  ?['함께 다니는 중 · 손님 '+r.count+'명',sug?'제안 · '+sug.name+' ('+sug.from.name+')':'내 세계 · '+w.name]
  :[r.host.name+' 님과 함께',w.name+({STORY:' · 이야기 진행 중',BATTLE:' · 전투 중'}[w.doing]||(w.doing==='PLACE'&&w.place?' · '+w.place:''))];
 const copy=mk('span','cp-pill-copy');copy.append(mk('strong','',lines[0]),mk('small','',lines[1]));
 p.title=lines.join(' · ')+' · 눌러서 방 열기';p.setAttribute('aria-label','다인 모드 · '+lines.join(' · '));
 p.replaceChildren(SHELL.icon('COOP','shell-icon'),copy);
 // Folded to a round button like the chat's, so it covers nothing; it opens for a few seconds when something changes.
 const sig=lines.join('|');p.classList.toggle('news',!!sug&&r.you==='HOST');
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
 const tags=[];if(u.guest)tags.push([u.guest.mine?'나':u.guest.name,'cp-tag'+(u.guest.mine?' me':'')]);else if(u.host)tags.push([u.protagonist?'방장':'방장 동료','cp-tag host']);if(u.guest?.left)tags.push(['스스로 싸움','cp-tag auto']);if(u.grade==='보스')tags.push(['보스','cp-tag boss']);
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
 const copy=mk('div','battle-turn-copy');copy.append(mk('strong','',v.opening?'전투 시작 전':t?.mine?'내 차례 · '+(v.me?.name||''):t?.host?'방장 '+(t.name||'')+'의 차례':t?(t.ownerName+' 님의 차례 · '+t.name):'진행 중…'),
  mk('small','',v.opening?'방장이 「전투 시작」을 누르면 시작합니다':!v.me?'다음 라운드가 시작되면 내 캐릭터가 들어갑니다':v.me.left?'자리를 비운 동안 '+v.me.name+'이(가) 스스로 싸웁니다':!v.me.alive?v.me.name+'이(가) 쓰러졌습니다':t?.mine?'기술을 고르고 적을 눌러 대상을 정한 뒤 실행':'차례를 기다리는 중'));
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
 const head=mk('div','battle-heading');head.append(mk('span','eyebrow',v.opening?'전투 시작 전':'ROUND '+v.round),mk('h1','',v.title||v.encounter||'함께 싸우는 전투'));if(r?.host?.name)head.append(mk('span','cp-head-host','방장 '+r.host.name));
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
 pill();const wrap=C.shown;if(!wrap)return;const box=wrap.querySelector('.cp-bbox'),v=C.battle,r=room(),parts=[];
 wrap.classList.toggle('coop-fight',!!v);
 if(v){box.replaceChildren(fightPanel(v,r));return;}
 const h=mk('header','cp-bhead');const t=mk('div','cp-head-copy');
 const sub=[r?'방장 '+r.host.name:'',C.ended?'전투 결과':''].filter(Boolean).join(' · ');
 t.append(mk('strong','',(C.ended&&C.lastTitle)||'함께 싸우는 전투'),mk('small','',sub));h.append(SHELL.icon('COOP','shell-icon cp-head-icon'),t);
 const mini=mk('button','cp-close');mini.type='button';mini.setAttribute('aria-label','작게 보기');mini.append(SHELL.icon('BACK','shell-icon'));mini.onclick=minimize;mini.title='작게 보기';h.append(mini);parts.push(h);
 const body=mk('div','cp-bbody');
 if(C.ended){
  const res=mk('section','cp-result '+(C.ended.victory?'win':'lose'));res.append(mk('h2','',C.ended.victory?'승리':'패배'));
  if(C.ended.victory){res.append(mk('p','','전투 보상 · 경험치 '+fmt(C.ended.xp)+' · '+fmt(C.ended.mora)+' 모라'+(Object.keys(C.ended.loot||{}).length?' · '+Object.entries(C.ended.loot).map(([id,n])=>itemName(id)+' '+n+'개').join(', '):'')));
   res.append(mk('p','cp-note',C.rewards?.length?'내 여정에 들어온 보상 · '+C.rewards.map(rewardLine).join(' / '):'보상을 내 여정에 넣는 중입니다…'));
   for(const w of C.rewards||[])for(const n of w.notes||[])res.append(mk('p','cp-why',n));}
  else res.append(mk('p','','방장의 파티가 쓰러졌습니다. 손님은 잃는 것이 없습니다.'));
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
 syncWanted=true;if(syncing)return;const session=O.sessionStamp();syncing=true;
 try{for(let i=0;i<60&&syncWanted&&O.sameSession(session);i++){if(isBusy()){await sleep(400);continue;}syncWanted=false;try{await O.sync();}catch{}}}finally{syncing=false;}
}
window.CRPGChat?.on?.(ev=>{
 if(ev?.type!=='coop')return;roomNews++;
 if(['kicked','left','closed'].includes(ev.kind)){const was=!!room();C.status={...(C.status||{}),room:null,battle:null};if(ev.kind!=='left'||was)toast(ev.reason||'방이 닫혔습니다.');C.msg=ev.reason||'';closeBattle(true);draw();schedule();return;}
 if(ev.kind==='invite'){C.invites=[...C.invites.filter(x=>x.room!==ev.invite.room),{room:ev.invite.room,from:ev.invite.from,at:Date.now()}];showInvite(ev.invite);draw();return;}
 if(ev.kind==='declined'){toast(ev.from.name+' 님이 초대를 거절했습니다.');return;}
 if(ev.kind==='reward'){showRewards(ev.rewards||[]);if(ev.sync)wantSync();return;}
 if(ev.kind==='sync'){wantSync();return;}
 // 0.15.9: the room's talk, a suggestion for the host, the host moving for a guest (a note when the window is closed).
 if(ev.kind==='say'){if(ev.line&&room()?.id===ev.room){addLine(ev.line);if(!C.node&&ev.line.from.pid!==C.status?.me?.pid&&!muted(ev.line.from.pid)){toast(ev.line.from.name+' · '+ev.line.text);SND('notice');}}return;}
 if(ev.kind==='suggest'&&ev.room?.you==='HOST'&&ev.room.suggest){toast(ev.room.suggest.from.name+' 님이 「'+ev.room.suggest.name+'」(으)로 가자고 합니다.');SND('notice');}
 if(ev.kind==='moved'&&ev.room?.you==='GUEST'&&ev.room.world&&!C.node)toast('방장이 「'+ev.room.world.name+'」(으)로 이동했습니다. 함께 이동합니다.');
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
