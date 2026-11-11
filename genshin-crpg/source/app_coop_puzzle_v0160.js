/* 0.16 다인 모드 · 같이 풀기 (user, 2026-10-06: 「상자를 기회는 공유하고, 같이 풀 수도 있게 만들면 더 좋을 것 같아」).
 * One board per chest of the host's: whoever in the room stands at its place opens the same puzzle (a guest walking the
 * host's world, the host in their own), and what each one does on the board — a press, a key, a number typed — goes
 * through the server in one order and plays on every board in it, so every move and the chances (♥) are shared. Someone
 * who comes later plays the board up to now first; a board left alone keeps for ten minutes. Solved with the host on it,
 * the host opens the chest on their own screen; solved by guests alone, the first guest's board unseals it for the host
 * (app_coop_v0153.js). Puzzles that run on a clock (SIMON, MEMGRID, PAIRS) stay one player's. The answer is checked by the
 * rules as always. Load after app_coop_world_v0160.js. */
(function(){'use strict';
const O=window.CRPGOnline,C=window.CRPGCoop,CH=window.CRPGChests,SHELL=window.CRPGShell;if(!O||!C?.api||!CH)return;
const SOLO=new Set(['SIMON','MEMGRID','PAIRS']);
const P=window.CRPGCoopPuzzle={s:null,live:false,replaying:false,prompt:null};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const SND=n=>{try{window.CRPGSound?.play(n);}catch{}};
const toast=t=>{try{SHELL.toast?.(t);}catch{}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const room=()=>C.status?.room||null;
const myPid=()=>C.status?.me?.pid||'';
const hostName=()=>room()?.host?.name||'방장';
const round=v=>Math.round(Math.max(0,Math.min(1,v))*1000)/1000;

// ---------- which chests are played together ----------
P.wants=ch=>!!(ch?.game&&ch.puzzle&&!SOLO.has(ch.puzzle.game)&&room()&&O.active);
// A guest opens one of the host's chests (the world's 풍경 보기 or the 「같이 풀기」 note): the board first, then the puzzle.
P.open=async function(ch){
 let out;try{out=await O.request('/coop/puzzle',{op:'join',chest:ch.id});}catch(e){toast(e.message);SND('error');return;}
 const view={...ch,...(out.chest||{})};if(!view.puzzle){toast('퍼즐을 불러오지 못했습니다.');return;}
 C.close?.();CH.play({title:view.tierName,sub:view.mapName+' · '+hostName()+' 님의 상자',region:view.region,icon:view.icon,puzzle:view.puzzle,map:view.map,solvedText:'봉인이 풀렸다!',done:(answer,body)=>finish(view,answer,body)});
 attach(out.session,view,false);
};
// The host opens their own puzzle chest while in a room: the same board (app_chests_v01415.js asks here first).
CH.together=function(chest){
 const r=room();if(!r||r.you!=='HOST'||!O.active)return false;
 let kind='';try{kind=game.chestPuzzle(chest.id)?.game||'';}catch{}if(!kind||SOLO.has(kind))return false;
 (async()=>{
  let out=null;try{out=await O.request('/coop/puzzle',{op:'join',chest:chest.id});}catch{}
  CH.startSolo(chest);if(out?.session&&CH.node)attach(out.session,chest,true);
 })();
 return true;
};

// ---------- one board ----------
function pathOf(el,root){const path=[];for(let n=el;n&&n!==root;n=n.parentElement){const p=n.parentElement;if(!p)return null;path.unshift([...p.children].indexOf(n));}return path;}
function byPath(root,path){let n=root;for(const i of path||[]){n=n?.children?.[i];if(!n)return null;}return n;}
function attach(session,view,isHost){
 detach(false);const node=CH.node,body=node?.querySelector('.ch-body');if(!node||!body)return;
 P.s={chest:view.id,view,host:isHost,node,body,players:session.players||[],applied:0,pending:new Map(),gapSince:0,ended:false};
 node.addEventListener('click',onClick,true);node.addEventListener('input',onInput,true);document.addEventListener('keydown',onKey,true);
 people();replay(session.events||[]);
}
function detach(leave=true){
 const s=P.s;if(!s)return;P.s=null;P.live=false;
 s.node.removeEventListener('click',onClick,true);s.node.removeEventListener('input',onInput,true);document.removeEventListener('keydown',onKey,true);
 if(leave&&!s.ended)O.request('/coop/puzzle',{op:'leave',chest:s.chest}).catch(()=>{});
}
CH.onClose=n=>{if(P.s&&P.s.node===n)detach(true);};
// Who is on the board, in the window's title (never inside the board, whose shape every board shares).
function people(){
 const s=P.s;if(!s)return;const copy=s.node.querySelector('.ch-head .ch-head-copy');if(!copy)return;copy.querySelector('.ch-together')?.remove();
 const names=s.players.map(p=>p.pid===myPid()?'나':p.name);if(names.length<2)return;copy.append(mk('small','ch-together','함께 푸는 중 · '+names.join(' · ')));
}
// Up to now: a short board plays at the pace it was played (a wrong press rests the board for a moment), a long one at once.
async function replay(events){
 const s=P.s;P.live=false;const timed=events.length<=40;let prev=null;
 for(const e of events){if(P.s!==s)return;if(timed&&prev!==null){const gap=Math.min(750,Math.max(0,e.at-prev));if(gap>40)await sleep(gap);}apply(e);prev=e.at;}
 if(P.s===s){P.live=true;flush();}
}
function receive(e){const s=P.s;if(!s||!e||e.seq<=s.applied)return;s.pending.set(e.seq,e);flush();}
function flush(){
 const s=P.s;if(!s||!P.live)return;
 while(s.pending.has(s.applied+1)){const e=s.pending.get(s.applied+1);s.pending.delete(e.seq);apply(e);}
 // A move that never came: the board asks for what it missed.
 if(s.pending.size){if(!s.gapSince){s.gapSince=Date.now();setTimeout(()=>{if(P.s===s&&s.pending.size&&Date.now()-s.gapSince>=1400)resync();},1500);}}else s.gapSince=0;
}
async function resync(){const s=P.s;if(!s)return;try{const out=await O.request('/coop/puzzle',{op:'join',chest:s.chest});if(P.s!==s)return;s.gapSince=0;for(const e of out.session?.events||[])receive(e);}catch{}}
function apply(e){
 const s=P.s;if(!s||e.seq<=s.applied)return;s.applied=e.seq;const ev=e.ev||{},body=s.body;if(!body.isConnected)return;
 let at=null;P.replaying=true;
 try{
  if(ev.t==='click'){const el=byPath(body,ev.path);if(el){const r=el.getBoundingClientRect();at={x:r.left+(ev.x??.5)*r.width,y:r.top+(ev.y??.5)*r.height};el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window,clientX:at.x,clientY:at.y}));}}
  else if(ev.t==='input'){const el=byPath(body,ev.path);if(el&&'value' in el){el.value=String(ev.v??'');el.dispatchEvent(new Event('input',{bubbles:true}));}}
  // A key with no place of its own goes from inside the window, so the window's own key rules let it through to the game.
  else if(ev.t==='key'){const el=(ev.path?byPath(body,ev.path):null)||body;el.dispatchEvent(new KeyboardEvent('keydown',{key:String(ev.k||''),code:String(ev.c||''),bubbles:true,cancelable:true}));}
 }catch{}finally{P.replaying=false;}
 // Someone else's press shows their name where they pressed.
 if(at&&e.pid!==myPid()&&P.live){const who=s.players.find(p=>p.pid===e.pid)?.name||'모험가',tag=mk('span','ch-peer',who);tag.style.left=Math.round(at.x)+'px';tag.style.top=Math.round(at.y)+'px';s.node.append(tag);setTimeout(()=>tag.remove(),900);}
}
// What this player does goes to the server first; it plays here when it comes back, in its turn with everyone else's.
async function send(ev){
 const s=P.s;if(!s)return;
 try{const out=await O.request('/coop/puzzle',{op:'event',chest:s.chest,ev});if(P.s===s&&out?.event)receive(out.event);}
 catch(e){if(P.s!==s)return;toast(e.message);if(e.code==='NO_PUZZLE'){s.ended=true;detach(false);}}
}
const local=(t,body)=>body.classList.contains('ch-reveal')||!!t.closest('details,summary,.ch-final')||t.matches('input,textarea')||t.textContent.trim()==='규칙 보기';
function onClick(e){
 const s=P.s;if(!s||P.replaying||!s.body.contains(e.target)||e.target===s.body)return;
 const t=e.target.closest('.spot-pic,button,[role=button],a')||e.target;if(local(t,s.body))return;
 e.preventDefault();e.stopImmediatePropagation();if(!P.live)return;
 const r=t.getBoundingClientRect(),path=pathOf(t,s.body);if(!path)return;
 send({t:'click',path,x:r.width?round((e.clientX-r.left)/r.width):.5,y:r.height?round((e.clientY-r.top)/r.height):.5});
}
function onInput(e){const s=P.s;if(!s||P.replaying||!s.body.contains(e.target)||!('value' in e.target))return;const path=pathOf(e.target,s.body);if(path)send({t:'input',path,v:String(e.target.value).slice(0,40)});}
function onKey(e){
 const s=P.s;if(!s||P.replaying||!s.node.isConnected||e.ctrlKey||e.metaKey||e.altKey)return;
 const top=SHELL?.topOverlay?.();if(top&&top!==s.node)return;if(s.body.classList.contains('ch-reveal'))return;
 if(['Escape','Tab','Shift','Control','Alt','Meta','CapsLock'].includes(e.key))return;
 const typing=e.target?.matches?.('input,textarea');if(typing&&e.key!=='Enter')return;
 e.preventDefault();e.stopImmediatePropagation();if(!P.live)return;
 send({t:'key',k:e.key,c:e.code,path:s.body.contains(e.target)&&e.target!==s.body?pathOf(e.target,s.body):null});
}

// ---------- solved, and the end of a board ----------
function final(body,title,sub){
 const v=P.s?.view;body.replaceChildren();body.className='ch-body ch-reveal ch-final';
 if(v){const stage=mk('div','ch-stage tier-'+v.icon),img=mk('img','ch-chest');img.src='assets/icons/chests/chest_'+v.icon+'.webp';img.alt=v.tierName||'';stage.append(mk('div','ch-glow'),img);body.append(stage);}
 const ok=mk('button','ch-btn primary ch-done','확인');ok.type='button';ok.onclick=()=>CH.close();body.append(mk('p','ch-progress',title),mk('p','ch-note',sub),ok);
}
// A guest's board: with the host on it the host opens the chest; else the first guest (by number) unseals it for the host.
function finish(view,answer,body){
 const s=P.s,players=s?.players||[];
 if(!s||!players.some(p=>p.pid!==myPid())){C.api.claim(view,answer,body);return;}
 if(players.some(p=>p.host)){final(body,'함께 풀었습니다!',hostName()+' 님이 상자를 엽니다');return;}
 const first=players.filter(p=>!p.host).map(p=>p.pid).sort()[0];
 if(first===myPid())C.api.claim(view,answer,body);else final(body,'함께 풀었습니다!',hostName()+' 님이 '+(view.mapName||'이곳')+'에 오면 열 수 있습니다');
}
function ended(ev){
 const s=P.s;if(!s||s.chest!==ev.chest)return;s.ended=true;
 if(!s.body.classList.contains('ch-reveal')&&s.body.isConnected){
  if(ev.opened)final(s.body,ev.by?.pid===myPid()?'상자를 열었습니다':(ev.by?.name||hostName())+' 님이 상자를 열었습니다','함께 푼 보물상자');
  else if(ev.unsealed)final(s.body,(ev.by?.pid===myPid()?'':(ev.by?.name||'모험가')+' 님이 ')+'상자의 암호를 풀어냈습니다',hostName()+' 님이 '+(s.view.mapName||'이곳')+'에 오면 열 수 있습니다');
 }
 detach(false);
}

// ---------- 「같이 풀기」: someone starts a board where one stands ----------
function closePrompt(chest){if(chest&&P.prompt?.chest!==chest)return;P.prompt?.node.remove();P.prompt=null;}
function showPrompt(ev){
 if(P.s||P.prompt?.chest===ev.chest)return;const me=C.api.myPos?.();if(!me||me.map!==ev.map)return;
 closePrompt();const n=mk('div','cp-invite-pop cp-puzzle-pop');n.setAttribute('role','alertdialog');n.setAttribute('aria-label','같이 풀기');
 n.append(mk('strong','',(ev.by?.name||'모험가')+' 님이 보물상자 퍼즐을 풀고 있습니다'),mk('small','',(ev.mapName||'이곳')+' · 같은 판을 함께 풀고 기회도 함께 씁니다'));
 const row=mk('div','cp-row'),go=mk('button','cp-btn primary','같이 풀기'),no=mk('button','cp-btn','닫기');go.type=no.type='button';
 go.onclick=()=>{closePrompt();join(ev.chest);};no.onclick=()=>closePrompt();row.append(go,no);n.append(row);
 document.body.append(n);P.prompt={chest:ev.chest,node:n};SND('notice');setTimeout(()=>{if(P.prompt?.node===n)closePrompt();},20000);
}
function join(chest){
 const r=room();if(!r)return;
 if(r.you==='HOST'){let c=null;try{c=game.chestsHere('SCENERY').find(x=>x.id===chest)||null;}catch{}if(!c){toast('보물상자가 있는 곳에 가야 함께 풀 수 있습니다.');SND('error');return;}CH.start(c);return;}
 P.open({id:chest});
}
P.join=join;
// The room's list of boards (the world's side and the room window show 「같이 풀기」 for one where one stands) follows the
// boards' comings and goings, not each move.
let roomTimer=0;const roomSoon=()=>{clearTimeout(roomTimer);roomTimer=setTimeout(()=>C.reload?.(true),400);};
window.CRPGChat?.on?.(ev=>{
 if(ev?.type!=='coop'||ev.kind!=='puzzle')return;const s=P.s;
 if(ev.op==='event'){if(s&&ev.chest===s.chest)receive(ev.event);return;}
 roomSoon();
 if(ev.op==='end'){closePrompt(ev.chest);ended(ev);return;}
 if(s&&ev.chest===s.chest){s.players=ev.players||s.players;people();if(ev.op==='join'&&ev.by?.pid!==myPid()){toast((ev.by?.name||'모험가')+' 님이 같이 풉니다');SND('notice');}return;}
 if(ev.op==='join'&&ev.by?.pid!==myPid())showPrompt(ev);
 if(ev.op==='leave'&&!(ev.players||[]).length)closePrompt(ev.chest);
});
})();
