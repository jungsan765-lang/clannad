/* 0.14.7 chat. Adventurers on the same account server talk in one world channel: a HUD button with an unread
 * count, a chat window (/ opens it), live lines over an authorised event stream with polling as a fallback,
 * per-player hiding kept on this device, and line removal for staff. Text only: lines are shown as plain text,
 * never as links or markup. Nothing here touches the save. Load after app_shell.js and app_online.js. */
(function(){
'use strict';
const O=window.CRPGOnline,SHELL=window.CRPGShell;if(!O||!SHELL)return;
const isLocal=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const base=String(window.CRPG_ONLINE_CONFIG?.apiBase||'').replace(/\/$/,'')||(!isLocal?'https://genshin-crpg-online.jungsan765.workers.dev':'');
const C=window.CRPGChat={enabled:null,open:false,lines:[],last:0,unread:0,muted:new Set(),node:null,ctrl:null,fails:0,poll:null,probing:false,max:140,handlers:[]};
try{for(const x of JSON.parse(localStorage.getItem('crpg-chat-muted')||'[]'))C.muted.add(String(x));}catch{}
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const online=()=>!!(O.token&&O.account&&base);
const hue=pid=>parseInt(String(pid||'0').slice(0,6),16)%360;
const time=at=>{const d=new Date(at);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');};
function ingest(list,quiet){
 let added=0;for(const m of list||[]){if(C.lines.some(x=>x.id===m.id))continue;C.lines.push(m);C.last=Math.max(C.last,m.id);added++;if(!quiet&&!C.open&&!C.muted.has(m.pid)&&m.pid!==C.me)C.unread++;}
 C.lines.sort((a,b)=>a.id-b.id);if(C.lines.length>200)C.lines.splice(0,C.lines.length-200);if(added){draw();badge();}
}
function handle(ev){
 if(ev?.type==='chat'){ingest([ev.message]);if(!C.open&&!C.muted.has(ev.message.pid)&&ev.message.pid!==C.me)SHELL.toast?.(ev.message.author+': '+ev.message.text);}
 else if(ev?.type==='chat-delete'){const m=C.lines.find(x=>x.id===ev.id);if(m){m.deleted=true;m.text='';draw();}}
 for(const h of C.handlers)try{h(ev);}catch{}
}
C.on=fn=>C.handlers.push(fn);
// 0.14.12: the operator console changed this journey (or ended this login). Load it again from the server once the
// current action has finished; a login that was ended returns to the login screen.
const ADMIN_NEWS={gift:'운영자가 보낸 선물이 우편함에 도착했습니다.',reset:'운영자가 여정을 초기화했습니다.',profile:'계정 정보가 바뀌었습니다.'};
C.on(async ev=>{
 if(ev?.type!=='admin'||!ev.sync)return;const session=O.sessionStamp();
 for(let i=0;i<20&&(busy||O.pending);i++)await new Promise(r=>setTimeout(r,500));
 if(busy||O.pending||!O.sameSession(session))return;
 try{await O.sync();if(!O.sameSession(session))return;SHELL.toast?.(ADMIN_NEWS[ev.reason]||'운영자가 여정 기록을 갱신했습니다.');}
 catch(e){if(O.sameSession(session)&&e.status===401){await O.logout?.();const text='운영자가 이 계정의 로그인을 끝냈습니다. 다시 로그인해 주세요.';if(typeof say==='function')say(text);else SHELL.toast?.(text);}}
});
let probeId=0,reconnectTimer=0,probeTimer=0,probeAfter=0;
async function probe(){
 if(C.enabled===false||C.probing||!online()||document.hidden||Date.now()<probeAfter)return;C.probing=true;const id=++probeId,session=O.sessionStamp(),current=()=>id===probeId&&O.sameSession(session);
 try{const out=await O.request('/chat/recent');if(!current())return;C.enabled=true;C.max=out.max||140;C.me=out.me||'';ingest(out.messages,true);connect();}
 catch(e){if(current()){if(e.status===404)C.enabled=false;else{C.enabled=null;probeAfter=Date.now()+30000;clearTimeout(probeTimer);probeTimer=setTimeout(()=>{probeTimer=0;if(current())probe();},30000);}}}
 finally{if(current()){C.probing=false;badge();}}
}
function connect(){
 if(C.ctrl||!online()||C.enabled!==true||document.hidden)return;clearTimeout(reconnectTimer);const ctrl=new AbortController(),session=O.sessionStamp();C.ctrl=ctrl;
 let watchdog=0,stalled=false;
 // The server sends a heartbeat every 25 seconds. A half-open mobile connection must recover too.
 const watch=()=>{clearTimeout(watchdog);watchdog=setTimeout(()=>{stalled=true;ctrl.abort();},60000);};watch();
 fetch(base+'/chat/stream',{headers:{Authorization:'Bearer '+O.token},signal:ctrl.signal,cache:'no-store'}).then(async res=>{
  if(C.ctrl!==ctrl||!O.sameSession(session)||!online()){ctrl.abort();return;}if(!res.ok||!res.body)throw Error('stream '+res.status);
  const opened=Date.now(),reader=res.body.getReader(),dec=new TextDecoder();let buf='';
  for(;;){const {value,done}=await reader.read();if(C.ctrl!==ctrl||!online()||!O.sameSession(session)){ctrl.abort();return;}if(done)break;watch();
   // A 200 response which closes immediately is still a failed connection, not recovery.
   if(Date.now()-opened>=20000){C.fails=0;stopPoll();}
   buf+=dec.decode(value,{stream:true});let i;while((i=buf.indexOf('\n\n'))>=0){const block=buf.slice(0,i);buf=buf.slice(i+2);const data=block.split('\n').filter(l=>l.startsWith('data: ')).map(l=>l.slice(6)).join('\n');if(data){try{if(C.ctrl!==ctrl||!online()||!O.sameSession(session))return;handle(JSON.parse(data));}catch{}}}}
 }).catch(()=>{}).finally(()=>{clearTimeout(watchdog);if(C.ctrl!==ctrl)return;C.ctrl=null;if(ctrl.signal.aborted&&!stalled||!online()||!O.sameSession(session))return;
  C.fails++;if(C.fails>=3)startPoll();
  // Hidden tabs keep a healthy stream, but do not repeatedly reopen a broken one.
  reconnectTimer=setTimeout(()=>{reconnectTimer=0;if(!O.sameSession(session)||document.hidden)return;catchUp();connect();},Math.min(30000,1500*Math.pow(2,Math.min(C.fails,4))));
 });
}
let catchUpFlight=null;
function catchUp(){if(!online()||C.enabled!==true)return Promise.resolve();if(catchUpFlight)return catchUpFlight;const session=O.sessionStamp(),generation=probeId,flight=(async()=>{try{const out=await O.request('/chat/recent'+(C.last?'?after='+C.last:''));if(generation===probeId&&O.sameSession(session))ingest(out.messages);}catch{}})();catchUpFlight=flight;flight.then(()=>{if(catchUpFlight===flight)catchUpFlight=null;});return flight;}
function startPoll(){if(C.poll)return;C.poll=setInterval(()=>{if(!document.hidden)catchUp();},C.open?3000:15000);}
function stopPoll(){clearInterval(C.poll);C.poll=null;}
function disconnect(){clearTimeout(probeTimer);probeTimer=0;clearTimeout(reconnectTimer);reconnectTimer=0;C.ctrl?.abort();C.ctrl=null;stopPoll();}
C.reset=function(){disconnect();probeAfter=0;probeId++;C.probing=false;C.fails=0;C.me='';catchUpFlight=null;C.enabled=null;C.lines=[];C.last=0;C.unread=0;C.open=false;C.node?.remove();C.node=null;document.querySelector('body > .chat-fab')?.remove();};
// Recover missed lines on returning to the page without starting duplicate streams or polls.
function resume(){if(document.hidden||!online())return;if(C.enabled===null)probe();else if(C.enabled===true){catchUp();if(!C.ctrl&&!reconnectTimer)connect();}}
document.addEventListener('visibilitychange',resume);window.addEventListener?.('online',resume);
// ---------- window ----------
function toggle(open=!C.open){
 C.open=open;if(open){C.unread=0;if(!C.node)build();C.node.hidden=false;requestAnimationFrame(()=>C.node?.classList.add('open'));draw();setTimeout(()=>C.node?.querySelector('input')?.focus(),60);window.CRPGSound?.play('menu_open');}
 else if(C.node){C.node.classList.remove('open');setTimeout(()=>{if(!C.open&&C.node)C.node.hidden=true;},180);window.CRPGSound?.play('menu_close');}
 if(C.fails>=3){stopPoll();startPoll();}
 badge();
}
C.toggle=toggle;
function build(){
 const box=mk('section','chat-window');box.setAttribute('aria-label','채팅');box.hidden=true;
 const head=mk('header','chat-head');head.append(SHELL.icon('CHAT','shell-icon'),mk('strong','','채팅'),mk('small','','전체'));
 const close=mk('button','chat-close');close.type='button';close.setAttribute('aria-label','채팅 닫기');close.append(SHELL.icon('CLOSE','shell-icon'));close.onclick=()=>toggle(false);head.append(close);
 const list=mk('div','chat-list');list.setAttribute('role','log');list.setAttribute('aria-live','polite');
 const form=mk('form','chat-form'),input=mk('input');input.type='text';input.maxLength=C.max;input.placeholder='모두에게 보내기 · Enter';input.setAttribute('aria-label','채팅 입력');input.autocomplete='off';
 const send=mk('button','chat-send','보내기');send.type='submit';const count=mk('small','chat-count','0/'+C.max);
 input.oninput=()=>{count.textContent=[...input.value].length+'/'+C.max;};
 // 0.14.13: Enter on an empty line closes the window again, as in the game it imitates (Enter opens it).
 input.onkeydown=e=>{if(e.key==='Escape'||e.key==='Enter'&&!e.isComposing&&!input.value.trim()){e.preventDefault();e.stopPropagation();toggle(false);}};
 form.onsubmit=async e=>{e.preventDefault();const text=input.value.trim();if(!text||send.disabled)return;send.disabled=true;
  try{const out=await O.request('/chat/send',{text});ingest([out.message],true);input.value='';count.textContent='0/'+C.max;}catch(err){SHELL.toast?.(err.message);}finally{send.disabled=false;input.focus();}};
 form.append(input,count,send);
 const muted=mk('button','chat-muted');muted.type='button';muted.onclick=()=>{C.muted.clear();saveMuted();draw();};
 box.append(head,list,muted,form);document.body.append(box);C.node=box;
}
function saveMuted(){try{localStorage.setItem('crpg-chat-muted',JSON.stringify([...C.muted]));}catch{}}
function draw(){
 if(!C.node)return;const list=C.node.querySelector('.chat-list'),stick=list.scrollTop+list.clientHeight>=list.scrollHeight-24;list.replaceChildren();
 const me=O.account,shown=C.lines.filter(m=>!C.muted.has(m.pid));
 if(!shown.length)list.append(mk('p','chat-empty',C.enabled===false?'이 서버에서는 채팅을 사용할 수 없습니다.':'아직 대화가 없습니다. 먼저 인사해 보세요.'));
 for(const m of shown){
  // 0.14.15: a frame for those who reached floor 10+ in the Spiral Abyss last season, their best 나선 문장 (one per
  // season at floor 10+) beside the name, and the name opens the adventurer's card (app_profile_v01415.js).
  const own=!!C.me&&m.pid===C.me,row=mk('div','chat-line'+(own?' own':'')+(m.deleted?' deleted':'')+(m.frame?' abyss-frame frame-'+Math.min(12,m.frame):''));
  const who=mk('button','chat-author',m.author);who.type='button';who.style.setProperty('--h',hue(m.pid));who.title=m.author+' · 모험가 정보 보기';
  who.onclick=()=>window.CRPGProfile?.open(m.pid,m.author);if(m.staff)who.append(mk('span','chat-staff','운영'));
  if(m.medals>0&&window.CRPGProfile?.medal){const medal=window.CRPGProfile.medal(m.top,m.top);medal.title='나선 문장 '+m.medals+'개 · 최고 '+m.top+'층';medal.removeAttribute('aria-hidden');who.append(medal);}
  if(m.frame)row.title='지난 시즌 나선비경 '+m.frame+'층 정복';
  row.append(who,mk('time','chat-time',time(m.at)),mk('p','chat-text',m.deleted?'운영자가 가린 메시지입니다.':m.text));
  if(!own&&!m.deleted){const tools=mk('span','chat-tools');const hide=mk('button','',`숨기기`);hide.type='button';hide.title=m.author+'의 메시지를 이 기기에서 숨깁니다.';hide.onclick=()=>{C.muted.add(m.pid);saveMuted();draw();};tools.append(hide);
   if(me?.admin){const del=mk('button','','가리기');del.type='button';del.onclick=async()=>{try{await O.request('/chat/delete',{id:m.id});}catch(e){SHELL.toast?.(e.message);}};tools.append(del);}row.append(tools);}
  list.append(row);
 }
 const muted=C.node.querySelector('.chat-muted');muted.hidden=!C.muted.size;muted.textContent='숨긴 모험가 '+C.muted.size+'명 · 다시 보기';
 if(stick)list.scrollTop=list.scrollHeight;
}
// 0.14.13: a phone's top bar has no room for the chat button, so a round one waits above the bottom dock (shell.css
// shows it on phones only) and the window opens from the bottom.
function fab(){let b=document.querySelector('body > .chat-fab');if(!b){b=mk('button','chat-fab');b.type='button';b.setAttribute('aria-label','채팅 열기');b.append(SHELL.icon('CHAT','shell-icon'),mk('span','hud-badge'));b.onclick=()=>toggle(true);document.body.append(b);}return b;}
C.redraw=()=>draw();
function badge(){
 const live=C.enabled===true&&document.body.classList.contains('teyvat');if(live)fab();else document.querySelector('body > .chat-fab')?.remove();
 for(const b of document.querySelectorAll('.hud-chat,body > .chat-fab')){b.hidden=C.enabled!==true||b.classList.contains('chat-fab')&&C.open;b.classList.toggle('active',C.open);const n=b.querySelector('.hud-badge');if(n){n.textContent=C.unread>99?'99+':String(C.unread);n.hidden=!C.unread;}}
}
SHELL.extraTools.push(tool=>{const b=tool('CHAT','채팅 (Enter · /)',()=>toggle());b.classList.add('hud-chat');b.append(mk('span','hud-badge'));b.hidden=C.enabled!==true;return b;});
// / or Enter opens the chat (0.14.13: Enter too). A button that was clicked keeps the focus, and Enter would press it
// again (in a battle, the last attack): Enter opens the chat instead, unless the focus was moved there by keyboard.
document.addEventListener('keydown',e=>{if(!(e.key==='/'||e.key==='Enter')||e.isComposing||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||window.CRPGShell?.topOverlay?.()||!document.body.classList.contains('teyvat')||C.enabled!==true||C.open)return;if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)||e.target?.isContentEditable||document.querySelector('dialog[open]'))return;if(e.key==='Enter'&&e.target?.closest?.('button,a[href],summary,[role=button],[tabindex]:not([tabindex="-1"])')&&e.target.matches?.(':focus-visible'))return;e.preventDefault();toggle(true);});
// Follow the session: connect while a journey is open online, drop everything on logout.
if(typeof render==='function'){const prior=render;render=function(){prior();try{if(!online()){if(C.enabled!==null||C.lines.length||C.probing||C.ctrl||C.poll||C.node)C.reset();}else if(document.body.classList.contains('teyvat')){if(C.enabled===null)probe();badge();}else if(C.open)toggle(false);}catch{}};}
})();
