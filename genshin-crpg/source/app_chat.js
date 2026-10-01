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
const ADMIN_NEWS={gift:'운영자가 보낸 선물이 도착했습니다. 가방과 재화를 확인해 보세요.',reset:'운영자가 여정을 초기화했습니다.',profile:'계정 정보가 바뀌었습니다.'};
C.on(async ev=>{
 if(ev?.type!=='admin'||!ev.sync)return;
 for(let i=0;i<20&&(busy||O.pending);i++)await new Promise(r=>setTimeout(r,500));
 if(busy||O.pending)return;
 try{await O.sync();SHELL.toast?.(ADMIN_NEWS[ev.reason]||'운영자가 여정 기록을 갱신했습니다.');}
 catch(e){if(e.status===401){await O.logout?.();const text='운영자가 이 계정의 로그인을 끝냈습니다. 다시 로그인해 주세요.';if(typeof say==='function')say(text);else SHELL.toast?.(text);}}
});
async function probe(){
 if(C.enabled===false||C.probing||!online())return;C.probing=true;
 try{const out=await O.request('/chat/recent');C.enabled=true;C.max=out.max||140;C.me=out.me||'';ingest(out.messages,true);connect();}
 catch(e){if(e.status===404)C.enabled=false;else C.enabled=null;}
 finally{C.probing=false;badge();}
}
function connect(){
 if(C.ctrl||!online()||C.enabled!==true)return;const ctrl=new AbortController();C.ctrl=ctrl;
 fetch(base+'/chat/stream',{headers:{Authorization:'Bearer '+O.token},signal:ctrl.signal,cache:'no-store'}).then(async res=>{
  if(!res.ok||!res.body)throw Error('stream '+res.status);C.fails=0;stopPoll();const reader=res.body.getReader(),dec=new TextDecoder();let buf='';
  for(;;){const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;while((i=buf.indexOf('\n\n'))>=0){const block=buf.slice(0,i);buf=buf.slice(i+2);const data=block.split('\n').filter(l=>l.startsWith('data: ')).map(l=>l.slice(6)).join('\n');if(data){try{handle(JSON.parse(data));}catch{}}}}
 }).catch(()=>{C.fails++;}).finally(()=>{if(C.ctrl!==ctrl)return;C.ctrl=null;if(ctrl.signal.aborted||!online())return;
  // Missed lines while reconnecting come from the recent list; three failures switch to polling.
  if(C.fails>=3)startPoll();setTimeout(()=>{catchUp();connect();},Math.min(30000,1500*Math.pow(2,Math.min(C.fails,4))));});
}
async function catchUp(){if(!online()||C.enabled!==true)return;try{const out=await O.request('/chat/recent'+(C.last?'?after='+C.last:''));ingest(out.messages);}catch{}}
function startPoll(){if(C.poll)return;C.poll=setInterval(()=>{if(!document.hidden)catchUp();},C.open?3000:15000);}
function stopPoll(){clearInterval(C.poll);C.poll=null;}
function disconnect(){C.ctrl?.abort();C.ctrl=null;stopPoll();}
C.reset=function(){disconnect();C.enabled=null;C.lines=[];C.last=0;C.unread=0;C.open=false;C.node?.remove();C.node=null;};
// ---------- window ----------
function toggle(open=!C.open){
 C.open=open;if(open){C.unread=0;if(!C.node)build();C.node.hidden=false;requestAnimationFrame(()=>C.node?.classList.add('open'));draw();setTimeout(()=>C.node?.querySelector('input')?.focus(),60);window.CRPGSound?.play('menu_open');if(C.fails>=3){stopPoll();startPoll();}}
 else if(C.node){C.node.classList.remove('open');setTimeout(()=>{if(!C.open&&C.node)C.node.hidden=true;},180);window.CRPGSound?.play('menu_close');}
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
 input.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();toggle(false);}};
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
  const own=!!C.me&&m.pid===C.me,row=mk('div','chat-line'+(own?' own':'')+(m.deleted?' deleted':''));
  const who=mk('strong','chat-author',m.author);who.style.setProperty('--h',hue(m.pid));if(m.staff)who.append(mk('span','chat-staff','운영'));
  row.append(who,mk('time','chat-time',time(m.at)),mk('p','chat-text',m.deleted?'운영자가 가린 메시지입니다.':m.text));
  if(!own&&!m.deleted){const tools=mk('span','chat-tools');const hide=mk('button','',`숨기기`);hide.type='button';hide.title=m.author+'의 메시지를 이 기기에서 숨깁니다.';hide.onclick=()=>{C.muted.add(m.pid);saveMuted();draw();};tools.append(hide);
   if(me?.admin){const del=mk('button','','가리기');del.type='button';del.onclick=async()=>{try{await O.request('/chat/delete',{id:m.id});}catch(e){SHELL.toast?.(e.message);}};tools.append(del);}row.append(tools);}
  list.append(row);
 }
 const muted=C.node.querySelector('.chat-muted');muted.hidden=!C.muted.size;muted.textContent='숨긴 모험가 '+C.muted.size+'명 · 다시 보기';
 if(stick)list.scrollTop=list.scrollHeight;
}
function badge(){for(const b of document.querySelectorAll('.hud-chat')){b.hidden=C.enabled!==true;b.classList.toggle('active',C.open);const n=b.querySelector('.hud-badge');if(n){n.textContent=C.unread>99?'99+':String(C.unread);n.hidden=!C.unread;}}}
SHELL.extraTools.push(tool=>{const b=tool('CHAT','채팅 ( / )',()=>toggle());b.classList.add('hud-chat');b.append(mk('span','hud-badge'));b.hidden=C.enabled!==true;return b;});
document.addEventListener('keydown',e=>{if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey||!document.body.classList.contains('teyvat')||C.enabled!==true)return;if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)||e.target?.isContentEditable||document.querySelector('dialog[open]'))return;e.preventDefault();toggle(true);});
// Follow the session: connect while a journey is open online, drop everything on logout.
if(typeof render==='function'){const prior=render;render=function(){prior();try{if(!online()){if(C.enabled!==null||C.lines.length)C.reset();}else if(document.body.classList.contains('teyvat')){if(C.enabled===null)probe();badge();}else if(C.open)toggle(false);}catch{}};}
})();
