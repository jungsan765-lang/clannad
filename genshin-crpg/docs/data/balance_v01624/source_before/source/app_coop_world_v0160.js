/* 0.16 다인 모드 · 방장의 세계 (user, 2026-10-06: 「아니 전투만 하는게 아니라 시발 그냥 맵을 같이 돌아다녀야된다고 아예」).
 * A guest in a room stands in the host's world on their own main screen. The field screen, its travel map and 풍경 보기
 * show the host's world where the guest stands: the host's places and the ways open there, the names of the places the host
 * has been, the host's day and hour, and everyone in the room and the fights going on (on the map and down the side).
 * Walking is the usual travel map — a destination card, or a circle and 「이동」 — one place at a time through the server
 * (/coop/move checks the way with the host's own map); a fight met on the way is the guest's own, and their battle screen
 * shows it (runtime_coop_world_v0160.js). The host's chests lying in a place are found in 풍경 보기 and open for the host.
 * 「내 세계로」 goes back to one's own journey; the room window brings the host's world back.
 * The screen is drawn from a copy of the guest's state standing in the host's world (never saved, never sent). There only
 * 이동 and the menus work; what belongs to the guest's own journey (facilities, story, gathering, waiting, their own hidden
 * finds) waits for their own world. The host sees the guests and their fights on their own travel map.
 * Load last (after app_choice_v01525.js). */
(function(){'use strict';
const SHELL=window.CRPGShell,O=window.CRPGOnline,C=window.CRPGCoop;
if(!SHELL||!O||!C?.api||typeof render!=='function'||typeof act!=='function'||typeof NavigationUI==='undefined')return;
const W=window.CRPGCoopWorld={off:null,data:null,flight:null,failedAt:0,facade:null,real:null,realS:null,key:'',broken:'',shown:false,scenery:null,sig:'',input:{at:0,content:false}};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
function btn(label,fn,{cls='',why='',icon='',title=''}={}){
 const b=mk('button','cw-btn'+(cls?' '+cls:''));b.type='button';if(icon)b.append(SHELL.icon(icon,'shell-icon'));b.append(mk('span','',label));b.onclick=fn;if(title)b.title=title;
 if(why){b.disabled=true;b.title=why;b.dataset.reason=why;}return b;
}
const SND=n=>{try{window.CRPGSound?.play(n);}catch{}};
const toast=t=>{try{SHELL.toast?.(t);}catch{}};
const room=()=>C.status?.room||null;
const mapRow=id=>{try{return game.tables['32_MAP_DB'].get(id)||null;}catch{return null;}};
const mapName=id=>mapRow(id)?.[2]||id||'';
const clone=x=>{try{return structuredClone(x);}catch{return JSON.parse(JSON.stringify(x));}};
const OFF='방장의 세계에서는 이동과 메뉴만 쓸 수 있습니다. 「내 세계로」를 누른 뒤 해 주세요.';
// What keeps one's own journey busy on its own screen (a fight, a facility, a story, work in hand, a step into a world).
const BUSY=['runtime','placeVisit','storyJourney','storyBreak','storyContext','battlePreparation','lifeJob','worldJob','storyRecovery','coopAway'];
const SCREENS=new Set(['LOCATION','HUB','MAIN_MENU']);

// ---------- when the host's world is shown ----------
// A guest of a room who has not gone back to their own world.
function wanted(){const r=room();return !!r&&r.you==='GUEST'&&W.off!==r.id&&!!O.active&&!!O.token&&!O.pending;}
// One's own journey stands on its main screen with nothing in hand.
function free(g){
 try{const s=g?.s;if(!s||BUSY.some(k=>s[k]))return false;
  return SCREENS.has(String(s.global.SCREEN_MODE||'LOCATION'))&&(g.playPhase?.()||'FREE')==='FREE'&&!g.needsRecovery?.();}catch{return false;}
}
function enterWhy(){
 if(!game)return '게임을 불러오는 중입니다.';
 let why='';try{why=game.coopRoamReason?.()||'';}catch{}if(why)return why;
 try{if(game.needsRecovery?.())return '쓰러진 파티를 먼저 회복해 주세요.';if((game.playPhase?.()||'FREE')!=='FREE')return '내 여정에서 하던 일을 마친 뒤 들어갈 수 있습니다.';}catch{}
 return '';
}
function stepWhy(){const r=room();if(!r)return '방이 닫혔습니다.';try{return C.api.stepWhy(r)||'';}catch{return '';}}

// ---------- the host's world (GET /coop/world): the ways open in it, the places the host has been, the hour ----------
function stale(){const r=room(),d=W.data;return !d||d.room!==r?.id||(!!r?.world?.rev&&d.rev!==r.world.rev);}
function load(){
 const r=room();if(!r||W.flight||Date.now()-W.failedAt<8000)return W.flight;
 const session=O.sessionStamp(),id=r.id;
 const flight=(async()=>{
  try{const out=await O.request('/coop/world');if(O.sameSession(session)&&room()?.id===id){W.data=out;W.failedAt=0;}}
  catch{if(O.sameSession(session))W.failedAt=Date.now();}
  finally{if(W.flight===flight)W.flight=null;}
  if(O.sameSession(session))refresh(true);
 })();
 W.flight=flight;return flight;
}

// ---------- the copy of one's own journey that stands in the host's world ----------
function edgeRow(g,a){const id=a?.edge;if(!id)return null;try{return g.rows('47_MAP_EDGE_DB').find(e=>e[0]===id)||null;}catch{return null;}}
function facade(real){
 if(!real||real.coopWorldView||!wanted()||!free(real))return null;
 const r=room();if(stale())load();const d=W.data;if(!d||d.room!==r.id)return null;
 const at=r.at?.map||d.at?.map,row=at&&real.tables['32_MAP_DB']?.get(at);if(!row)return null;
 const w=r.world||{},day=Number(w.day||d.day)||1,time=String(w.time||d.time||'12:00'),key=[at,day,time,d.rev,(d.open||[]).length,(d.visited||[]).length].join('|');
 if(W.broken===key)return null;
 if(W.facade&&W.real===real&&W.realS===real.s&&W.key===key)return W.facade;
 let s;try{s=clone(real.s);}catch{return null;}
 Object.assign(s.global,{CURRENT_MAP_ID:at,LOCATION:row[2],LOCATION_PROFILE:row[5],WORLD_DAY:day,WORLD_TIME:time,SCREEN_MODE:'LOCATION'});
 // The names on the map are the places the host has been (and the ones next to them), not one's own.
 s.exploration={...(s.exploration||{}),visitedMaps:Object.fromEntries((d.visited||[]).map(id=>[id,true]))};
 for(const k of BUSY)delete s[k];
 const open=new Set(d.open||[]),f=Object.create(real);
 Object.assign(f,{s,coopWorldView:true,
  // The host's own map rows and flags decided these, standing at each way's start (server/coop-v0153.mjs coopWorldFor).
  edgeReason:e=>e&&open.has(e[0])?'':'방장의 세계에서 아직 열리지 않은 길입니다.',
  navigationGoal:()=>null,needsRecovery:()=>false,placeEntries:()=>[],mainStoryEntries:()=>[],oculusEntries:()=>[],chestsHere:()=>[],
  actionReason(type,a={}){
   if(type==='MENU')return real.actionReason(type,a);if(type!=='MOVE')return OFF;
   const e=edgeRow(f,a);if(!e)return '갈 곳을 찾을 수 없습니다.';if(e[1]!==s.global.CURRENT_MAP_ID)return '지금 있는 곳에서 바로 갈 수 없는 곳입니다.';
   return f.edgeReason(e)||stepWhy();
  }});
 Object.assign(W,{facade:f,real,realS:real.s,key});return f;
}
// ---------- 0.16: someone else's fight one is in, on one's own battle screen ----------
// (user: 「왜 전투 부분만 다른거야? 화면도 맵이 없다거나 그런것도 있고... 그냥 모든 부분을 다 똑같이 하면 되는거 아니야?」)
// The server sends the fight itself with each view (runtime_coop_v0153.js coopBattleView state), so the battle screen is
// drawn from it exactly like one's own fight: the place behind it, the fighters with their own faces, the order, statuses,
// summons and log, and the playback of its blows (app_coop_v0153.js). Only one's own fighter's skills are there, on one's
// own turn; 「실행」 is a command to the fight's save (/coop/act). The menus stay one's own; 「작게 보기」 goes back.
const FIGHT_OFF='함께 싸우는 전투에서는 할 수 없습니다.';
const MENU_SCREENS=new Set(['PARTY','STATUS','INVENTORY','QUEST','RELATIONS','SYSTEM','SHOP','CRAFT','COOKING','MARKET','RECRUITMENT','ABYSS','ENHANCE','FORGE','DIALOGUE']);
function fightView(){let v=null;try{v=C.api.board?.();}catch{}return v?.state?.runtime&&!C.minimized&&room()?v:null;}
function fightFacade(real){
 const v=fightView();if(!v||!real?.s||real.coopWorldView||real.s.runtime)return null;
 if(MENU_SCREENS.has(String(real.s.global.SCREEN_MODE||'')))return null;
 if(W.fight&&W.fightFor===v&&W.fightReal===real&&W.fightS===real.s)return W.fight;
 const st=v.state,proto=Object.getPrototypeOf(real),me=v.me,mine=()=>!!(v.turn?.mine&&me&&me.alive&&!me.left);
 const s={...real.s,runtime:st.runtime,global:{...real.s.global,CURRENT_MAP_ID:st.map||real.s.global.CURRENT_MAP_ID,WORLD_DAY:st.day||real.s.global.WORLD_DAY,WORLD_TIME:st.time||real.s.global.WORLD_TIME,SCREEN_MODE:'COMBAT'}};
 const f=Object.create(real),owner=v.owner&&!v.owner.host?v.owner.name+' 님':'방장';
 Object.assign(f,{s,coopWorldView:true,coopFight:v,
  // One's own fighter's skills on one's own turn (the rules work them out from the fight as the server does).
  combatCards(){if(!mine())return [];try{return (proto.combatCards.call(this,me.id)||[]).filter(c=>!c.system);}catch{return [];}},
  combatFleeReason:()=>'함께 싸우는 전투에서는 도망칠 수 없습니다.',protagonistCombatView:()=>null,needsRecovery:()=>false,
  actionReason(type,a={}){
   if(type==='MENU')return real.actionReason(type,a);
   if(type==='COMBAT_BEGIN')return owner+'이 「전투 시작」을 누르면 시작합니다.';
   if(type==='COMBAT')return mine()?'':'내 차례에 고를 수 있습니다.';
   return FIGHT_OFF;
  }});
 Object.assign(W,{fight:f,fightFor:v,fightReal:real,fightS:real.s});return f;
}
W.fightGame=()=>W.fightShown&&W.fightReal===game?W.fight:null;
// The fight's heading says whose fight it is, with 「작게 보기」 and 「방 나가기」; off one's turn the skills' place says what is
// going on.
function decorateFight(v){
 const p=document.querySelector('#root > main > .content > .panel.combat-panel');if(!p||!v)return;p.classList.add('cw-fight-panel');
 const head=p.querySelector(':scope > .battle-heading');
 if(head&&!head.querySelector('.cw-fight-tools')){const tools=mk('div','cw-fight-tools');
  tools.append(mk('span','cp-head-host',(v.owner&&!v.owner.host?v.owner.name:(room()?.host?.name||'방장'))+' 님의 전투'),btn('작게 보기',()=>C.api.minimize(),{cls:'battle-head-button'}),btn('방 나가기',()=>C.api.leave(),{cls:'battle-head-button cw-leave'}));head.append(tools);}
 const cmd=p.querySelector('.battle-command'),mineTurn=!!(v.turn?.mine&&v.me?.alive&&!v.me?.left);if(!cmd)return;
 if(v.opening){const h=cmd.querySelector(':scope > h2'),t=h?.nextElementSibling;if(h)h.textContent='전투 시작 전';if(t?.tagName==='P')t.textContent=(v.owner&&!v.owner.host?v.owner.name+' 님':'방장')+'이 「전투 시작」을 누르면 시작합니다.';return;}
 if(!mineTurn){for(const n of cmd.querySelectorAll('.battle-cards,.battle-execute,.battle-target-warning,.battle-retreat'))n.remove();
  cmd.append(mk('p','cw-wait',!v.me?'다음 라운드가 시작되면 내 캐릭터가 들어갑니다':v.me.left?'자리를 비운 동안 '+v.me.name+'이(가) 스스로 싸웁니다':!v.me.alive?v.me.name+'이(가) 쓰러졌습니다':'내 차례를 기다리는 중'));}
}
// Code that draws outside a render (the travel map's own redraws, the music) sees the screen that is shown.
function inWorld(fn){
 const f=W.fightShown&&W.fightReal===game&&game?.s===W.fightS?W.fight:W.shown&&W.real&&game===W.real&&game.s===W.realS?W.facade:null;if(!f)return fn();
 const real=game;game=f;try{return fn();}finally{if(game===f)game=real;}
}

// ---------- drawing ----------
const priorRender=render;
render=function(){
 if(game?.coopWorldView){priorRender();return;}
 const real=game;
 let ff=null;try{ff=fightFacade(real);}catch(e){console.error('[coop-fight]',e);}
 if(ff){W.shown=false;W.fightShown=true;after(false);game=ff;try{priorRender();}finally{if(game===ff)game=real;}try{decorateFight(ff.coopFight);}catch(e){console.error('[coop-fight]',e);}return;}
 W.fightShown=false;
 let f=null;try{f=facade(real);}catch(e){console.error('[coop-world]',e);}
 if(!f){W.shown=false;priorRender();after(false);return;}
 W.shown=true;game=f;
 try{priorRender();}catch(e){W.shown=false;throw e;}finally{if(game===f)game=real;}
 // A screen that could not be drawn in the host's world falls back to one's own (the base render's error page).
 if(document.querySelector('#root > .panel > h1')?.textContent==='이 장면을 표시하지 못했습니다'){W.broken=W.key;W.shown=false;toast('방장의 세계를 그리지 못해 내 세계를 보여 줍니다.');priorRender();after(false);return;}
 after(true);
};
function after(shown){
 document.body.classList.toggle('cw-world',shown);
 if(!shown){closeScenery();return;}
 try{decorate();}catch(e){console.error('[coop-world]',e);}
}
// The field screen's side (on an upright phone, its tabs under the map) becomes the room in the host's world.
function decorate(){
 const r=room(),p=document.querySelector('#root > main > .content > .panel.shell-loc');if(!r||!p)return;
 const left=p.querySelector(':scope > .shell-loc-left'),tabs=p.querySelector(':scope > .shell-loc-tabs'),box=sidePanel(r,!left);
 if(left)left.replaceWith(box);else if(tabs)tabs.replaceWith(box);else p.append(box);
 const place=document.querySelector('main > aside .hud-place');if(place&&!place.querySelector('.cw-hud-tag'))place.append(mk('em','cw-hud-tag','방장 세계'));
 if(W.scenery&&W.sceneryAt!==r.at?.map)closeScenery();
}
function face(c){let f=null;try{f=c&&!c.player&&typeof actorPortrait==='function'?actorPortrait(c.id,'cw-face'):null;}catch{}return f||mk('span','cw-face glyph',c?.player?'✦':'✧');}
function sidePanel(r,mobile){
 const at=r.at||W.data?.at||{},box=mk('div','shell-region cw-panel'+(mobile?' cw-mobile':' shell-loc-left'));box.setAttribute('aria-label',r.host.name+' 님의 세계');
 const head=mk('header','shell-loc-head cw-head'),tag=mk('div','cw-tag');tag.append(SHELL.icon('COOP','shell-icon'),mk('span','',r.host.name+' 님의 세계'));
 head.append(tag,mk('h1','',at.name||mapName(at.map)));let risk='';try{risk=NavigationUI.risk(at.map);}catch{}if(risk)head.append(mk('span','area-level',risk));
 box.append(head,people(r,at));
 const fights=fightList(r);if(fights)box.append(fights);
 const boards=boardList(r,at);if(boards)box.append(boards);
 box.append(tools(r,at));
 return box;
}
// 같이 풀기: a chest's board someone is on, here (app_coop_puzzle_v0160.js).
function boardList(r,at){
 const list=(r.boards||[]).filter(b=>!b.mine&&b.map===at.map);if(!list.length)return null;
 const s=mk('section','cw-fights cw-boards');s.setAttribute('aria-label','같이 푸는 보물상자');
 for(const b of list){const item=mk('div','cw-fight cw-board'),copy=mk('span','cw-fight-copy');copy.append(mk('strong','',b.players.join(' · ')),mk('small','','보물상자 퍼즐을 푸는 중'));
  item.append(SHELL.icon('PUZZLE','shell-icon'),copy,btn('같이 풀기',()=>window.CRPGCoopPuzzle?.join?.(b.chest),{cls:'cw-mini cw-go'}));s.append(item);}
 return s;
}
// Where everyone in the room is: here, or the place's name; in a fight; with the host or alone.
function people(r,at){
 const s=mk('section','cw-people');s.setAttribute('aria-label','방 사람들의 위치');
 const chars=new Map([[r.host.pid,r.host.char],...(r.members||[]).map(m=>[m.pid,m.char])]),me=(r.positions||[]).find(p=>p.me);
 for(const p of r.positions||[]){
  const item=mk('div','cw-person'+(p.me?' me':'')+(p.host?' host':'')+(p.map===at.map?' here':''));
  const copy=mk('span','cw-person-copy'),name=mk('strong','',p.me?'나':p.name);if(p.host)name.append(mk('em','cw-host','방장'));
  const where=p.fight?(p.fight.own?'⚔ 전투 중':'⚔ '+p.fight.name+' 님 전투'):p.map===at.map?'여기':(p.mapName||mapName(p.map));
  copy.append(name,mk('small','',where+(p.me?(p.follow?' · 방장과 함께':' · 혼자 다니는 중'):'')));
  item.append(face(chars.get(p.pid)),copy);
  // Not with the host: to their side (or, standing there already, along with them from now on).
  if(p.host&&me&&!me.follow){const near=p.map===at.map;item.append(btn(near?'함께 다니기':'방장에게',follow,{cls:'cw-mini',why:stepWhy(),icon:near?'COOP':'PIN',title:near?'방장이 움직이면 함께 이동':'방장에게 가서 함께 다니기'}));}
  s.append(item);
 }
 return s;
}
function fightList(r){
 const list=(r.fights||[]).filter(f=>!f.mine);if(!list.length)return null;
 const s=mk('section','cw-fights');s.setAttribute('aria-label','진행 중인 전투');
 for(const f of list){
  const item=mk('div','cw-fight'+(f.joined?' joined':'')),copy=mk('span','cw-fight-copy');
  copy.append(mk('strong','',f.owner.name+(f.owner.host?' · 방장':'')),mk('small','',[f.title||f.mapName,f.opening?'시작 전':'라운드 '+f.round].filter(Boolean).join(' · ')));
  // One steps in where the fight is (user: 「다른 사람 전투는 그쪽으로 가야 할 수 있는것으로」); from elsewhere, the way there.
  item.append(SHELL.icon('SWORD','shell-icon'),copy,f.joined?btn('전투 보기',()=>C.api.openBattle(),{cls:'cw-mini'}):C.api.farFrom(f)?btn('가는 길',()=>C.api.goTo(f.map),{cls:'cw-mini',icon:'MAP',title:f.mapName+'까지 가는 길을 지도에 그리기'}):btn('참가',()=>join(f),{cls:'cw-mini cw-go',why:C.api.fightWhy(f)}));
  s.append(item);
 }
 return s;
}
function tools(r,at){
 const s=mk('div','cw-tools'),me=(r.positions||[]).find(p=>p.me);
 s.append(btn('풍경 보기',openScenery,{icon:'EYE',title:'풍경 보기 (V) · 방장의 보물상자를 찾아 열어 줄 수 있습니다'}));
 if(me&&!me.follow&&r.world&&at.map!==r.world.map)s.append(btn('오자고 하기',suggestHere,{icon:'STAR',why:C.busy?'잠시 기다려 주세요.':'',title:'방장에게 여기로 오자고 하기'}));
 s.append(btn('다인 모드',()=>C.open(),{icon:'COOP',title:'방 · 대화 · 함께하는 모험가'}),btn('내 세계로',leave,{icon:'BACK',cls:'cw-leave',title:'내 여정으로 돌아가기'}));
 return s;
}

// ---------- what one does there ----------
async function follow(){await C.api.follow();render();}
async function join(f){await C.api.joinFight(f);render();}
async function suggestHere(){const at=room()?.at?.map;if(at)await C.api.suggest(at);render();}
function leave(){const r=room();W.off=r?.id||null;closeScenery();SND('menu_close');render();toast('내 세계로 돌아왔습니다 · 다인 모드 창에서 다시 들어갈 수 있습니다.');}
function enter(){
 const r=room();if(!r)return;const why=enterWhy();if(why){toast(why);SND('error');return;}
 W.off=null;W.broken='';C.close?.();SND('menu_open');
 if(!SCREENS.has(String(game?.s?.global?.SCREEN_MODE||'')))act('MENU',{screen:'LOCATION'});else render();
}
// The room window's button: into the host's world, or back to one's own.
W.button=function(){
 const r=room();if(!r||r.you!=='GUEST')return null;
 const b=(label,fn,primary,why)=>{const x=mk('button','cp-btn'+(primary?' primary':''),label);x.type='button';x.onclick=fn;if(why){x.disabled=true;x.title=why;x.dataset.reason=why;}return x;};
 if(W.shown)return b('내 세계로 돌아가기',()=>{C.close?.();leave();},false,'');
 return b(W.off===r.id?'방장 세계로 들어가기':'방장 세계 보기',enter,true,enterWhy());
};
W.enter=enter;W.leave=leave;
// A step through the host's world, with the usual travel cover and sound; a fight met there is one's own.
async function step(params){
 const f=W.facade,e=edgeRow(f,params),why=f.actionReason('MOVE',params);
 if(why){toast(why);SND('error');return {ok:false,error:why};}
 if(busy)return {ok:false,error:'잠시 기다려 주세요.'};
 busy=true;let cover=null,out=null;
 try{
  render();try{cover=typeof startActionCover==='function'?startActionCover('MOVE',{edge:e[0]},true):null;}catch{}SND('travel');
  out=await C.api.step(e[2]);
  if(out){cover?.finishServer();if(cover)await cover.promise;}else cover?.abort();
 }finally{busy=false;}
 if(!out){const m=C.api.msg?.()||'이동하지 못했습니다.';toast(m);SND('error');render();return {ok:false,error:m};}
 if(out.encounter){toast('적과 마주쳤습니다! 내 전투가 시작됩니다.');SND('notice');}
 render();return {ok:true,result:out};
}
// Only 이동 and the menus act there: a step goes to the server, the rest of the field screen waits for one's own world.
const priorAct=act;
act=async function(type,params={}){
 if(game?.coopWorldView)await new Promise(r=>setTimeout(r,0));
 // Someone else's fight on one's battle screen: 「실행」 goes to that fight; the rest of the battle screen is refused there.
 if(W.fightShown&&W.fight&&W.fightReal===game&&type!=='MENU'){
  if(type==='COMBAT'){const why=W.fight.actionReason('COMBAT',params);if(why){toast(why);SND('error');return {ok:false,error:why};}SND('click');await C.api.command?.(params);return {ok:true};}
  if((W.input.content&&Date.now()-W.input.at<2000)||/^COMBAT_|^COOP_/.test(type)){const why=W.fight.actionReason(type,params)||FIGHT_OFF;toast(why);SND('error');return {ok:false,error:why};}
  return priorAct(type,params);
 }
 if(!W.shown||!W.facade||W.real!==game||type==='MENU')return priorAct(type,params);
 if(type==='MOVE')return step(params);
 if(W.input.content&&Date.now()-W.input.at<2000){toast(OFF);SND('error');return {ok:false,error:OFF};}
 return priorAct(type,params);
};
const mark=e=>{W.input={at:Date.now(),content:!!e.target?.closest?.('#root > main > .content')};};
document.addEventListener('pointerdown',mark,true);document.addEventListener('keydown',mark,true);

// ---------- the travel map: its own redraws in the host's world, and everyone on it ----------
const navDraw=NavigationUI.draw;NavigationUI.draw=function(...a){return inWorld(()=>navDraw.apply(this,a));};
const navName=NavigationUI.placeName;NavigationUI.placeName=function(...a){return inWorld(()=>navName.apply(this,a));};
const navMap=NavigationUI.drawMap;NavigationUI.drawMap=function(...a){const v=navMap.apply(this,a);try{pins(v,this.atlas);}catch(e){console.error('[coop-world]',e);}return v;};
// The others in the room (a guest in the host's world, or the host on their own map) and the fights one can step into.
function pins(viewport,atlas){
 const r=room();if(!r||!(W.shown||r.you==='HOST'))return;
 const sheet=viewport?.querySelector?.('.terrain-sheet'),T=window.CRPGTerrainMap;if(!sheet||!T)return;
 const layer=mk('div','cw-pins');
 const put=(id,node)=>{const p=T.points?.[id];if(!p||p[0]!==atlas)return;node.style.left=(p[1]/T.width*100)+'%';node.style.top=(p[2]/T.height*100)+'%';layer.append(node);};
 const who=p=>p.me?'나':p.host&&r.you!=='HOST'?'방장':p.name;
 // Someone in a fight is shown by that fight's mark, with everyone in it.
 const fights=(r.fights||[]).filter(f=>!f.mine),inFight=p=>!!p.fight&&fights.some(f=>f.owner.pid===p.fight.pid&&f.map===p.map);
 const groups=new Map();for(const p of r.positions||[]){if(p.me||inFight(p))continue;if(!groups.has(p.map))groups.set(p.map,[]);groups.get(p.map).push(p);}
 for(const [id,list] of groups){const pin=mk('span','cw-pin '+(list.some(p=>p.host)?'host':'other'));pin.setAttribute('aria-hidden','true');pin.append(mk('em','',list.map(who).join(' · ')));put(id,pin);}
 for(const f of fights){
  const names=(r.positions||[]).filter(p=>p.fight?.pid===f.owner.pid).map(who),far=C.api.farFrom(f),why=f.joined||far?'':C.api.fightWhy(f),b=mk('button','cw-pin fight'+(f.joined?' joined':''));b.type='button';b.append(mk('em','','⚔ '+(names.length?names:[f.owner.name]).join(' · ')));
  const does=f.joined?'전투 보기':far?'가는 길 보기':'참가';b.setAttribute('aria-label',f.owner.name+' 님의 전투 · '+does);b.title=why||does;
  if(why){b.disabled=true;b.dataset.reason=why;}else b.onclick=e=>{e.stopPropagation();if(f.joined)C.api.openBattle();else if(far)C.api.goTo(f.map);else join(f);};
  put(f.map,b);
 }
 if(layer.childElementCount)sheet.append(layer);
}
// The music follows the place one sees.
if(typeof GameAudio!=='undefined'&&typeof GameAudio.musicSelection==='function'){const prior=GameAudio.musicSelection;GameAudio.musicSelection=function(...a){return inWorld(()=>prior.apply(this,a));};}
// One's own hidden chests belong to one's own world: their glints wait while the host's world is shown.
const P=window.CRPGRuntime?.Runtime?.prototype;
if(P&&typeof P.chestsHere==='function'){const prior=P.chestsHere;P.chestsHere=function(...a){if(W.shown&&this===W.real)return [];return prior.apply(this,a);};}

// ---------- 풍경 보기 in the host's world: the place's picture and the host's chests lying there ----------
function placeImage(map){try{const m=MANIFEST.maps?.[map];return m?.url||(m?.file_name&&typeof assetPath==='function'?assetPath(m.file_name):null)||null;}catch{return null;}}
function openScenery(){
 const r=room(),at=r?.at?.map;if(W.scenery||!W.shown||!at)return;
 const c=document.querySelector('#root > main > .content'),src=c?.querySelector('.scene img.scene-back')?.src||c?.querySelector('.scene img')?.src||placeImage(at);
 if(!src){toast('이곳은 둘러볼 풍경이 없습니다.');return;}
 const view=mk('div','shell-scenery cw-scenery');view.setAttribute('role','dialog');view.setAttribute('aria-modal','true');view.setAttribute('aria-label','풍경 보기 · '+r.host.name+' 님의 세계');
 const pan=mk('div','scenery-pan'),stage=mk('div','scenery-stage'),img=mk('img','scenery-img');img.src=src;img.alt='';img.decoding='async';img.draggable=false;stage.append(img);pan.append(stage);
 const bar=mk('div','scenery-bar'),x=mk('button','scenery-close');x.type='button';x.setAttribute('aria-label','풍경 보기 닫기 (Esc)');x.title='닫기 (Esc)';x.append(SHELL.icon('CLOSE','shell-icon'));x.onclick=closeScenery;
 bar.append(mk('strong','',(r.at?.name||mapName(at))+' · '+r.host.name+' 님의 세계'),mk('small','','끌거나 휠을 돌려 둘러보기 · Esc 닫기'),x);
 view.append(pan,bar);document.body.append(view);document.body.classList.add('shell-scenery-open');W.scenery=view;W.sceneryAt=at;
 let drag=null;
 pan.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag={x:e.clientX,left:pan.scrollLeft,id:e.pointerId};try{pan.setPointerCapture(e.pointerId);}catch{}pan.classList.add('dragging');});
 pan.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.id)pan.scrollLeft=drag.left-(e.clientX-drag.x);});
 const end=e=>{if(drag&&e.pointerId===drag.id){drag=null;pan.classList.remove('dragging');}};pan.addEventListener('pointerup',end);pan.addEventListener('pointercancel',end);
 pan.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){pan.scrollLeft+=e.deltaY;e.preventDefault();}},{passive:false});
 view.addEventListener('keydown',e=>{
  if(e.key==='Escape'||String(e.key).toLowerCase()==='v'){e.preventDefault();e.stopPropagation();closeScenery();return;}
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();pan.scrollBy({left:(e.key==='ArrowLeft'?-1:1)*Math.round(pan.clientWidth*.25),behavior:typeof settings!=='undefined'&&settings.reducedMotion?'instant':'smooth'});}
 });
 requestAnimationFrame(()=>{view.classList.add('open');pan.scrollLeft=Math.round((pan.scrollWidth-pan.clientWidth)/2);x.focus({preventScroll:true});});
 SND('menu_open');chests(stage,at);
}
function closeScenery(){const v=W.scenery;if(!v)return;W.scenery=null;document.body.classList.remove('shell-scenery-open');v.classList.remove('open');setTimeout(()=>v.remove(),230);}
// The host's chests where one stands (the host's puzzles, POST /coop/chests): there to be found by looking, as at home.
async function chests(stage,at){
 let out=null;try{out=await O.request('/coop/chests',{});}catch{return;}
 if(!stage.isConnected||out?.map!==at)return;
 for(const ch of out.chests||[]){
  if(!ch.pos)continue;const night=ch.how==='SCENERY_NIGHT',b=mk('button','scenery-chest tier-'+ch.icon+(night?' night':''));b.type='button';b.style.left=ch.pos.x+'%';b.style.top=ch.pos.y+'%';
  b.setAttribute('aria-label',night?'어둠 속에서 무언가 일렁인다':ch.tierName+' 살펴보기');
  if(!night){const i=mk('img','');i.src='assets/icons/chests/chest_'+ch.icon+'.webp';i.alt='';i.draggable=false;b.append(i);}
  b.onclick=e=>{e.stopPropagation();closeScenery();setTimeout(()=>C.api.openChest(ch),120);};stage.append(b);
 }
}
// The field screen's 풍경 보기 (the top bar's eye, V, and the phone menu's tile) opens this view while the host's world shows.
document.addEventListener('click',e=>{
 if(!W.shown)return;const t=e.target?.closest?.('.hud-scenery,.pm-tile');if(!t)return;
 if(t.classList.contains('pm-tile')&&!/풍경 보기/.test(t.textContent||''))return;
 e.preventDefault();e.stopImmediatePropagation();if(t.classList.contains('pm-tile'))SHELL.menuToggle?.(false);openScenery();
},true);
document.addEventListener('keydown',e=>{
 if(!W.shown||W.scenery||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||e.repeat||String(e.key).toLowerCase()!=='v')return;
 if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName||'')||e.target?.isContentEditable||SHELL.topOverlay?.())return;
 e.preventDefault();e.stopImmediatePropagation();openScenery();
},true);

// ---------- keeping up with the room ----------
function sig(){
 const r=room();if(!r)return 'none';
 return [r.id,r.you,r.at?.map,r.at?.follow,r.world?.map,r.world?.day,r.world?.time,r.world?.rev,
  (r.positions||[]).map(p=>p.pid+'@'+p.map+(p.follow?'+':'')+(p.fight?'!'+p.fight.pid:'')).join(','),
  (r.fights||[]).map(f=>[f.owner.pid,f.map,f.opening,f.round,f.joined,f.count].join(':')).join(','),
  (r.boards||[]).map(b=>b.chest+':'+b.players.length+':'+b.mine).join(','),
  (r.members||[]).find(m=>m.me)?.ready?1:0,W.data?.rev||'',W.data?.room||'',W.off||''].join('|');
}
function refresh(force=false){
 if(!O.token&&(W.data||W.off||W.facade))Object.assign(W,{off:null,data:null,facade:null,real:null,realS:null,key:'',broken:''});
 const now=sig();if(!force&&now===W.sig)return;
 // An action on its way draws when it is done, and a fight's window over the screen first ends (no redraw under its
 // playback); this tries again on the next tick.
 if((typeof busy!=='undefined'&&busy)||O.pending||(C.shown&&!C.minimized)||C.fxPlaying)return;
 W.sig=now;const r=room();
 if(r&&wanted()&&stale())load();
 if(W.shown||(wanted()&&game&&free(game))){render();return;}
 if(r?.you==='HOST'&&document.getElementById('journey-map'))try{NavigationUI.refresh();}catch{}
}
W.refresh=refresh;
window.CRPGChat?.on?.(ev=>{if(ev?.type==='coop')setTimeout(()=>refresh(),0);});
setInterval(()=>{try{if(room()||W.shown)refresh();}catch{}},1000);
})();
