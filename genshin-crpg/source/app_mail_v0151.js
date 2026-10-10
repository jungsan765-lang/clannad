/* 0.15.1 우편함. The envelope at the top (and 「우편」 in Paimon's menu) opens one box for two kinds of post:
 *  - 운영자 우편 (runtime_mail_v0151.js, in the save): gifts wait until 「받기」, notices say what the operator changed.
 *  - 편지 (server/letters-v0151.mjs; user: 「편지는 그냥 우리가 아는 RPG의 모든 기능을 쓸 수도 있게 하자 물건 보내기
 *    이런것도 가능하게」, 「수수료 포함」): adventurers write to each other, online or not, with up to six tradeable things
 *    and some Mora. The postage is paid when the letter goes and is not refunded. The receiver takes the parcel or sends
 *    it back; after 30 days it goes back by itself. Reply, delete, tidy up, a sent box showing where each letter is, and
 *    blocking a sender.
 * The badge counts what is new or waiting; a note appears when something arrives. Load after app_chat.js,
 * app_profile_v01415.js and app_trade.js. */
(function(){
'use strict';
const SHELL=window.CRPGShell;if(!SHELL)return;
const O=window.CRPGOnline;
const mailSession=()=>O?.sessionStamp?.(),sameMailSession=session=>!O?.sameSession||O.sameSession(session);
const M=window.CRPGMail={node:null,tab:'in',pick:null,sentPick:null,seen:null,busy:false,letters:null,enabled:null,probing:false,nextProbe:0,draft:null,msg:''};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const btn=(label,fn,cls='')=>{const b=mk('button','ml-btn '+cls,label);b.type='button';b.onclick=fn;return b;};
const SND=n=>{try{window.CRPGSound?.play(n);}catch{}};
const MAN=()=>typeof MANIFEST!=='undefined'?MANIFEST:(window.CRPG_MANIFEST||{});
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const ready=()=>typeof game!=='undefined'&&!!game&&typeof game.mailView==='function';
const CUR=window.CRPGRuntime?.mailRules?.currencies||{};
const opView=()=>ready()?game.mailView():{list:[],unread:0,unclaimed:0};
const letters=()=>M.enabled===true&&!!O?.token;
const maybeLetters=()=>!!O?.token&&M.enabled!==false;
const RULES=()=>M.letters?.rules||{base:50,perEntry:100,moraRate:.05,maxMora:1000000,entries:6,titleMax:30,bodyMax:500,keepDays:30};
const postage=(n,mora)=>{const r=RULES();return r.base+r.perEntry*n+(mora>0?Math.max(1,Math.ceil(mora*r.moraRate)):0);};
const cut=(s,n)=>[...String(s||'')].slice(0,n).join('');
const when=at=>{const d=new Date(at),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'.'+p(d.getMonth()+1)+'.'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes());};
const day=at=>{const d=new Date(at);return (d.getMonth()+1)+'월 '+d.getDate()+'일';};
const icon=src=>{const i=mk('img','ml-gift-icon');i.src=src;i.alt='';i.draggable=false;return i;};
const mora=()=>{try{return Number(game.s.global.MORA)||0;}catch{return 0;}};
// Sending and taking need free movement (the server checks again); the buttons say why when they cannot.
const busyReason=()=>{try{if(game.s.runtime)return '전투 중에는 편지를 보내거나 받을 수 없습니다.';return (game.playPhase?.()||'FREE')==='FREE'?'':'이야기를 진행하는 중입니다. 자유행동 중에 다시 해 주세요.';}catch{return '';}};
const lock=(b,why)=>{if(why){b.disabled=true;b.title=why;}return b;};
// ---------- pictures ----------
const glyphOf=d=>{let gl;try{gl=itemGlyph(d);}catch{gl=mk('span','item-glyph','✦');}gl.classList.add('ml-gift-icon');return gl;};
const detailOf=g=>{try{return g.kind==='GEAR'?itemPresenter.itemDetail({equip:g.ref,quantity:1,enhance:g.enhance||0}):itemPresenter.itemDetail({item:g.ref,quantity:g.qty||1});}catch{return {name:g.ref,tier:{rank:1}};}};
const moraTile=n=>{const t=mk('div','ml-gift tier-3'),p=MAN().itemIcons?.icons?.CUR_MORA?.path;t.append(p?icon(p):mk('span','ml-gift-icon fallback','◈'),mk('strong','','×'+fmt(n)),mk('span','','모라'));return t;};
// One tile per thing in an operator gift: currency icon, item or gear art (the bag's own pictures).
function giftTiles(g){
 const out=[];
 for(const [k,n] of Object.entries(g?.currency||{})){const p=MAN().itemIcons?.icons?.['CUR_'+k]?.path,t=mk('div','ml-gift tier-'+(k==='PRIMOGEM'||k==='INTERTWINED_FATE'?5:k==='ACQUAINT_FATE'||k==='STARGLITTER'?4:3));t.append(p?icon(p):mk('span','ml-gift-icon fallback','✦'),mk('strong','','×'+fmt(n)),mk('span','',CUR[k]||k));out.push(t);}
 for(const [id,n] of Object.entries(g?.items||{})){const d=detailOf({kind:'ITEM',ref:id,qty:n}),t=mk('div','ml-gift tier-'+(d.tier?.rank||1));t.append(glyphOf(d),mk('strong','','×'+fmt(n)),mk('span','',d.name||id));out.push(t);}
 for(const e of g?.equipment||[]){const d=detailOf({kind:'GEAR',ref:e.id,enhance:e.enhance}),t=mk('div','ml-gift tier-'+(d.tier?.rank||1));t.append(glyphOf(d),mk('strong','',(e.enhance?'+'+e.enhance+' ':'')+'×'+e.count),mk('span','',d.name||e.id));out.push(t);}
 return out;
}
function parcelTiles(l){
 const out=[];
 for(const g of l.goods||[]){const d=detailOf(g),t=mk('div','ml-gift tier-'+(d.tier?.rank||1));t.append(glyphOf(d),mk('strong','',g.kind==='GEAR'?(g.enhance?'+'+g.enhance:'×1'):'×'+fmt(g.qty)),mk('span','',d.name||g.ref));out.push(t);}
 if(l.mora>0)out.push(moraTile(l.mora));
 return out;
}
// ---------- what is in the box ----------
// Operator mail and letters together, newest first. A letter that came back is listed again when it returns.
function inbox(){
 const out=[];
 for(const m of opView().list)out.push({key:m.id,src:'op',kind:m.kind,title:m.title,from:m.from,at:m.at,waiting:m.kind==='GIFT'&&!m.claimed,fresh:!m.read||(m.kind==='GIFT'&&!m.claimed),gone:m.read&&!(m.kind==='GIFT'&&!m.claimed),m});
 if(letters())for(const l of M.letters?.inbox||[])out.push(l.box==='BACK'?{key:'R'+l.id,src:'letter',kind:'RETURN',title:l.title,from:l.to.name,at:l.updated,waiting:l.waiting,fresh:l.waiting,gone:!l.waiting,l}
  :{key:'L'+l.id,src:'letter',kind:'LETTER',title:l.title,from:l.from.name,at:l.at,waiting:l.waiting,fresh:l.waiting||!l.read,gone:l.read&&!l.waiting,l});
 return out.sort((a,b)=>b.at-a.at);
}
const opCount=()=>ready()?game.mailUnread():0;
const letterCount=()=>letters()?(M.letters?.inbox||[]).filter(l=>l.waiting||(l.box==='IN'&&!l.read)).length:0;
const count=()=>opCount()+letterCount();
function badge(){
 const n=count(),text=n>9?'9+':String(n);for(const b of document.querySelectorAll('.hud-mail .hud-badge')){b.textContent=text;b.hidden=!n;}
 // A phone hides the envelope for room, so Paimon's menu button carries the count there (shell.css shows it on phones).
 const menu=document.querySelector('main > aside .hud-menu-button');if(!menu)return;
 let d=menu.querySelector('.ml-menu-badge');if(!d){d=mk('span','hud-badge ml-menu-badge');d.setAttribute('aria-hidden','true');menu.append(d);}d.textContent=text;d.hidden=!n;
}
const KIND={GIFT:'선물',NOTICE:'알림',LETTER:'편지',RETURN:'반송'};
const sentState=l=>l.status==='TAKEN'?['받아 감','ok']:l.status==='RETURNED'?['돌아옴','warn']:l.status==='BACK'?['되찾음','']:l.parcel?[l.read?'읽음 · 받기 전':'받기 전','info']:[l.read?'읽음':'배달됨',''];
// ---------- the server's letters ----------
let lettersFlight=null,lettersSequence=0;
function loadLetters(refresh=false){
 if(!O?.token)return Promise.resolve();
 const session=O.sessionStamp();if(!refresh&&lettersFlight&&O.sameSession(lettersFlight.session))return lettersFlight.promise;
 const sequence=++lettersSequence,flight={session},current=()=>sequence===lettersSequence&&O.sameSession(session);
 flight.promise=(async()=>{
  try{const out=await O.request('/mail/letters');if(!current())return;M.letters=out;M.enabled=true;}
  catch(e){if(!current())return;if(e.status===404){M.enabled=false;M.letters=null;}else M.nextProbe=Date.now()+30000;}
  finally{if(lettersFlight===flight)lettersFlight=null;}
  if(current()){badge();if(M.node&&M.tab!=='write')draw();}
 })();lettersFlight=flight;return flight.promise;
}
M.reload=()=>loadLetters(true);
let readQueue=new Set(),readTimer=null;
function seen(l){
 if(!l||l.box!=='IN'||l.read)return;l.read=true;readQueue.add(l.id);clearTimeout(readTimer);const session=O.sessionStamp();
 readTimer=setTimeout(async()=>{const ids=[...readQueue];readQueue=new Set();if(!O.sameSession(session)||!O.token)return;try{await O.request('/mail/read',{ids});}catch{}},400);badge();
}
// ---------- the window ----------
function close(){if(!M.node)return;const n=M.node;M.node=null;n.classList.remove('open');setTimeout(()=>n.remove(),180);SND('menu_close');}
M.close=close;
async function markRead(){
 if(!ready()||M.busy)return;const ids=(game.s.mail?.list||[]).filter(x=>x.kind==='NOTICE'&&!x.read).map(x=>x.id);if(!ids.length)return;
 try{await act('MAIL_READ',{ids});}catch{}
}
M.open=function(tab){
 if(!ready())return;if(tab)M.tab=tab;if(M.tab!=='in'&&!maybeLetters())M.tab='in';M.msg='';
 if(M.node){draw();return;}
 const wrap=mk('div','ml-overlay');wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','우편함');
 wrap.addEventListener('click',e=>{if(e.target===wrap)close();});wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
 const box=mk('div','ml-box');wrap.append(box);document.body.append(wrap);M.node=wrap;M.pick=null;
 requestAnimationFrame(()=>wrap.classList.add('open'));SND('menu_open');draw();markRead();if(O?.token&&M.enabled!==false)loadLetters();
};
// Write a letter, optionally to someone already chosen (the profile card, 「답장」).
const newDraft=(opts={})=>({to:opts.to||null,q:'',results:[],title:opts.title||'',body:'',items:new Map(),mora:0,picker:false,replyTo:opts.replyTo||null,confirm:false});
M.compose=function(opts={}){
 clearTimeout(M.findTimer);M.findList=null;M.draft=newDraft(opts);
 if(!M.node)M.open('write');else{M.tab='write';M.msg='';draw();}
};
M.canWrite=()=>!!O?.token&&M.enabled!==false;
function draw(){
 const wrap=M.node;if(!wrap)return;const box=wrap.querySelector('.ml-box'),list=inbox(),wait=list.filter(x=>x.waiting).length;
 if(M.tab!=='in'&&!maybeLetters())M.tab='in';
 const head=mk('header','ml-head');head.append(SHELL.icon('MAIL','shell-icon ml-head-icon'));
 const title=mk('div','ml-head-copy');title.append(mk('strong','','우편함'),mk('small','',M.tab==='write'?'편지 쓰기 · 수수료는 보낼 때 빠집니다':M.tab==='sent'?'보낸 편지가 지금 어디 있는지 보여 줍니다':wait?'받을 것이 있는 우편 '+wait+'통':letters()?'운영자 우편과 모험가의 편지가 여기에 옵니다':'운영자가 보낸 선물과 알림이 여기에 옵니다'));head.append(title);
 // Operator gifts only wait for a battle to end; a letter's parcel needs free movement.
 if(M.tab==='in'&&wait>1){const parcels=list.some(x=>x.waiting&&x.src==='letter'),gifts=list.some(x=>x.waiting&&x.src==='op');
  head.append(lock(btn('모두 받기',takeAll,'primary ml-all'),game.s.runtime?'전투가 끝난 뒤 우편을 받을 수 있습니다.':parcels&&!gifts?busyReason():''));}
 const x=mk('button','ml-close');x.type='button';x.setAttribute('aria-label','닫기');x.append(SHELL.icon('CLOSE','shell-icon'));x.onclick=close;head.append(x);
 const parts=[head];
 if(letters()){
  const tabs=mk('div','ml-tabs');tabs.setAttribute('role','tablist');
  for(const [id,label] of [['in','받은 우편'+(count()?' '+count():'')],['sent','보낸 편지'],['write','편지 쓰기']]){
   const b=btn(label,()=>{if(M.tab===id)return;SND('page');M.tab=id;M.msg='';draw();},'ml-tab'+(M.tab===id?' on':''));b.setAttribute('role','tab');b.setAttribute('aria-selected',String(M.tab===id));tabs.append(b);
  }
  parts.push(tabs);
 }
 parts.push(M.tab==='write'?composeView():M.tab==='sent'?sentView():inboxView(list));
 if(M.msg){const p=mk('p','ml-msg',M.msg);p.setAttribute('role','alert');parts.push(p);}
 box.replaceChildren(...parts);badge();
}
// ---------- 받은 우편 ----------
function inboxView(list){
 const body=mk('div','ml-body'),ul=mk('ul','ml-list'),detail=mk('section','ml-detail');
 if(!list.length)ul.append(mk('li','ml-empty','우편이 없습니다.'));
 if(!M.pick||!list.some(x=>x.key===M.pick))M.pick=list.find(x=>x.waiting)?.key||list[0]?.key||null;
 for(const x of list){
  const li=mk('li','ml-item '+x.kind.toLowerCase()+(x.key===M.pick?' on':'')+(x.fresh?' new':'')+(x.waiting?' waiting':''));
  const b=mk('button','ml-item-btn');b.type='button';b.onclick=()=>{M.pick=x.key;M.msg='';SND('page');draw();};
  b.append(mk('span','ml-kind',x.kind==='GIFT'&&!x.waiting?'받음':KIND[x.kind]),mk('strong','',x.title),mk('small','',(x.src==='letter'?(x.kind==='RETURN'?'돌아옴 · ':'')+x.from+' · ':'')+when(x.at)));li.append(b);ul.append(li);
 }
 const gone=list.filter(x=>x.gone);
 if(gone.length){const li=mk('li','ml-tidy');li.append(twoStep('읽은 우편 정리 · '+gone.length+'통','정말 지우기 · '+gone.length+'통',()=>remove(gone)));ul.append(li);}
 const blocked=M.letters?.blocked||[];
 if(letters()&&blocked.length){const li=mk('li','ml-blocked'),det=mk('details');det.append(mk('summary','','편지 차단 '+blocked.length+'명'));for(const p of blocked){const row=mk('div','ml-blocked-row');row.append(mk('span','',p.name),btn('풀기',()=>block(p,false),'ml-mini'));det.append(row);}li.append(det);ul.append(li);}
 const x=list.find(y=>y.key===M.pick);
 if(!x)detail.append(mk('p','ml-empty','고른 우편이 없습니다.'));
 else if(x.src==='op')opDetail(detail,x.m);
 else if(x.kind==='RETURN')returnDetail(detail,x.l);
 else{letterDetail(detail,x.l);seen(x.l);}
 body.append(ul,detail);return body;
}
const textLines=(box,text)=>{if(!String(text||'').trim()){box.append(mk('p','ml-text muted','(내용 없음)'));return;}for(const line of String(text).split('\n'))box.append(mk('p','ml-text',line||' '));};
function opDetail(detail,m){
 detail.append(mk('h3','',m.title),mk('p','ml-from','보낸 이 · '+m.from+' · '+when(m.at)));textLines(detail,m.body);
 const row=mk('div','ml-actions');
 if(m.kind==='GIFT'){
  const gifts=mk('div','ml-gifts'+(m.claimed?' taken':''));for(const t of giftTiles(m.gifts))gifts.append(t);detail.append(gifts);
  if(m.claimed)detail.append(mk('p','ml-taken','받은 선물입니다.'));
  else row.append(lock(btn('받기',()=>claim(m.id),'primary ml-take'),game.s.runtime?'전투가 끝난 뒤 우편을 받을 수 있습니다.':''));
 }
 const del=btn('지우기',()=>remove([{src:'op',key:m.id}]),'ml-del');if(m.kind==='GIFT'&&!m.claimed)lock(del,'선물을 받은 뒤 지울 수 있습니다.');row.append(del);
 detail.append(row);
}
function letterDetail(detail,l){
 detail.append(mk('h3','',l.title),mk('p','ml-from','보낸 이 · '+l.from.name+' · '+when(l.at)));textLines(detail,l.body);
 if(l.parcel){const g=mk('div','ml-gifts'+(l.waiting?'':' taken'));for(const t of parcelTiles(l))g.append(t);detail.append(g);}
 const row=mk('div','ml-actions'),why=busyReason();
 if(l.waiting){
  detail.append(mk('p','ml-note','받지 않으면 '+day(l.expires)+'에 보낸 이에게 돌아갑니다.'));
  row.append(lock(btn('받기',()=>take(l),'primary ml-take'),why),twoStep('돌려보내기','정말 돌려보내기',()=>sendBack(l)));
 }else if(l.parcel)detail.append(mk('p','ml-taken',l.status==='TAKEN'?'받은 물건입니다.':'돌려보낸 편지입니다.'));
 row.append(btn('답장',()=>M.compose({to:{pid:l.from.pid,name:l.from.name},title:cut((/^Re: /.test(l.title)?'':'Re: ')+l.title,RULES().titleMax),replyTo:l.id}),'ml-reply'));
 const del=btn('지우기',()=>remove([{src:'letter',key:'L'+l.id,id:l.id}]),'ml-del');if(l.waiting)lock(del,'물건을 받거나 돌려보낸 뒤 지울 수 있습니다.');row.append(del);
 const blocked=(M.letters?.blocked||[]).some(p=>p.pid===l.from.pid);
 row.append(blocked?btn('차단 풀기',()=>block(l.from,false),'ml-block'):twoStep('차단','정말 차단하기',()=>block(l.from,true),'ml-block'));
 detail.append(row);
}
function returnDetail(detail,l){
 detail.append(mk('h3','','돌아온 편지 · '+l.title),mk('p','ml-from',l.to.name+' 님에게 보냈던 편지 · '+when(l.updated)));
 if(l.note)detail.append(mk('p','ml-note',l.note));
 const g=mk('div','ml-gifts'+(l.waiting?'':' taken'));for(const t of parcelTiles(l))g.append(t);detail.append(g);
 const row=mk('div','ml-actions');
 if(l.waiting)row.append(lock(btn('되찾기',()=>take(l),'primary ml-take'),busyReason()));else detail.append(mk('p','ml-taken','되찾은 물건입니다.'));
 const del=btn('지우기',()=>remove([{src:'letter',key:'R'+l.id,id:l.id}]),'ml-del');if(l.waiting)lock(del,'물건을 되찾은 뒤 지울 수 있습니다.');row.append(del);
 detail.append(row);
}
// ---------- 보낸 편지 ----------
function sentView(){
 const body=mk('div','ml-body'),ul=mk('ul','ml-list'),detail=mk('section','ml-detail'),list=M.letters?.sent||[];
 if(!list.length)ul.append(mk('li','ml-empty','보낸 편지가 없습니다.'));
 // A letter just sent may not be listed yet (the list comes a moment later), so the choice is kept until it is.
 const pick=list.some(l=>'S'+l.id===M.sentPick)?M.sentPick:list[0]?'S'+list[0].id:null;
 for(const l of list){
  const [state,tone]=sentState(l),li=mk('li','ml-item sent'+('S'+l.id===pick?' on':''));
  const b=mk('button','ml-item-btn');b.type='button';b.onclick=()=>{M.sentPick='S'+l.id;M.msg='';SND('page');draw();};
  b.append(mk('span','ml-kind state-'+(tone||'plain'),state),mk('strong','',l.title),mk('small','',l.to.name+' 님 · '+when(l.at)));li.append(b);ul.append(li);
 }
 const l=list.find(x=>'S'+x.id===pick);
 if(!l)detail.append(mk('p','ml-empty','고른 편지가 없습니다.'));
 else{
  const [state]=sentState(l);detail.append(mk('h3','',l.title),mk('p','ml-from','받는 이 · '+l.to.name+' · '+when(l.at)+' · '+state));textLines(detail,l.body);
  if(l.parcel){const g=mk('div','ml-gifts'+(l.status==='SENT'?'':' taken'));for(const t of parcelTiles(l))g.append(t);detail.append(g);}
  detail.append(mk('p','ml-note','수수료 '+fmt(l.fee)+' 모라'+(l.status==='SENT'&&l.parcel?' · '+day(l.expires)+'까지 받지 않으면 돌아옵니다.':l.note?' · '+l.note:'')));
  const row=mk('div','ml-actions'),del=btn('지우기',()=>remove([{src:'letter',key:'S'+l.id,id:l.id}]),'ml-del');if(l.status==='RETURNED')lock(del,'돌아온 물건을 「받은 우편」에서 되찾은 뒤 지울 수 있습니다.');
  row.append(del);detail.append(row);
 }
 body.append(ul,detail);return body;
}
// ---------- 편지 쓰기 ----------
function bagEntries(){try{return itemPresenter.inventoryEntries(game.s).filter(d=>{const e=d.kind==='EQUIPMENT'?game.s.inventory.find(i=>i.slot===d.key):d.id;return game.tradeRule?.(e)?.ok;});}catch{return [];}}
const keyOf=d=>d.kind==='EQUIPMENT'?'slot:'+d.key:'item:'+d.id;
function composeView(){
 const d=M.draft??=newDraft(),R=RULES(),body=mk('div','ml-body ml-write'),form=mk('section','ml-form');
 // 받는 모험가
 const to=mk('div','ml-field');to.append(mk('span','ml-label','받는 모험가'));
 if(d.to){const chip=mk('div','ml-to');chip.append(mk('strong','',d.to.name),btn('바꾸기',()=>{d.to=null;d.q='';d.results=[];d.confirm=false;draw();},'ml-mini'));to.append(chip);}
 else{
  const q=mk('input','ml-input');q.type='search';q.placeholder='모험가 이름으로 찾기';q.value=d.q;q.maxLength=24;q.setAttribute('aria-label','받는 모험가 찾기');
  const res=mk('ul','ml-find');M.findList=res;fillFind(res,d);
  q.oninput=()=>{d.q=q.value;clearTimeout(M.findTimer);M.findTimer=setTimeout(()=>find(d),250);};
  to.append(q,res);if(!d.q&&matchMedia('(pointer:fine)').matches)setTimeout(()=>{if(q.isConnected&&(document.activeElement===document.body||!document.activeElement))q.focus();},60);
 }
 // 제목 · 내용
 const tf=mk('label','ml-field');tf.append(mk('span','ml-label','제목'));const t=mk('input','ml-input');t.maxLength=R.titleMax;t.value=d.title;t.placeholder='제목 ('+R.titleMax+'자)';t.oninput=()=>{d.title=t.value;d.confirm=false;};tf.append(t);
 const bf=mk('label','ml-field');const cnt=mk('small','ml-count',[...d.body].length+'/'+R.bodyMax);bf.append(mk('span','ml-label','내용'),cnt);
 const ta=mk('textarea','ml-input ml-textarea');ta.maxLength=R.bodyMax;ta.rows=5;ta.value=d.body;ta.placeholder='전할 말을 적어 주세요.';ta.oninput=()=>{d.body=ta.value;cnt.textContent=[...ta.value].length+'/'+R.bodyMax;};bf.append(ta);
 form.append(to,tf,bf);
 try{const lv=game.tradeLevelReason?.();if(lv)form.prepend(mk('p','ml-note ml-warn',lv+' 받은 편지는 지금도 읽고 받을 수 있습니다.'));}catch{}
 // 넣을 물건
 const af=mk('div','ml-field');af.append(mk('span','ml-label','넣을 물건 · '+d.items.size+'/'+R.entries+'종'));
 const tray=mk('div','ml-tray');
 for(const [key,x] of d.items){
  const t=mk('div','ml-gift ml-tray-item tier-'+(x.d.tier?.rank||1));t.append(glyphOf(x.d),mk('span','',x.d.name));
  if(x.slot)t.append(mk('strong','',x.d.enhance?'+'+x.d.enhance:'장비'));else t.append(stepper(x.qty,x.max,n=>{x.qty=n;d.confirm=false;draw();}));
  const rm=mk('button','ml-tray-x');rm.type='button';rm.setAttribute('aria-label',x.d.name+' 빼기');rm.append(SHELL.icon('CLOSE','shell-icon'));rm.onclick=()=>{d.items.delete(key);d.confirm=false;draw();};t.append(rm);tray.append(t);
 }
 const add=btn(d.picker?'가방 닫기':'가방에서 넣기',()=>{d.picker=!d.picker;draw();},'ml-add');if(d.items.size>=R.entries&&!d.picker)lock(add,'한 통에 '+R.entries+'종류까지 넣을 수 있습니다.');tray.append(add);af.append(tray);
 if(d.picker)af.append(picker(d));
 // 모라
 const mf=mk('label','ml-field ml-mora');mf.append(mk('span','ml-label','함께 보낼 모라'));const mi=mk('input','ml-input');mi.type='number';mi.min='0';mi.max=String(R.maxMora);mi.step='100';mi.inputMode='numeric';mi.value=d.mora?String(d.mora):'';mi.placeholder='0';
 const micon=window.currencyIcon?.('MORA','ml-mora-icon');const mrow=mk('div','ml-mora-row');if(micon)mrow.append(micon);mrow.append(mi);mf.append(mrow);
 const fee=mk('p','ml-fee');
 mi.oninput=()=>{d.mora=Math.max(0,Math.min(R.maxMora,Math.floor(Number(mi.value)||0)));d.confirm=false;feeText(fee,d);sendRow.replaceChildren(...sendButtons(d));};
 form.append(af,mf,fee);feeText(fee,d);
 const sendRow=mk('div','ml-actions ml-send');sendRow.append(...sendButtons(d));form.append(sendRow);
 body.append(form);return body;
}
function stepper(value,max,set){
 const box=mk('div','ml-stepper'),minus=btn('−',()=>set(Math.max(1,value-1)),'ml-step'),n=mk('input');n.type='number';n.min='1';n.max=String(max);n.value=String(value);n.setAttribute('aria-label','수량');
 n.onchange=()=>set(Math.max(1,Math.min(max,Math.floor(Number(n.value)||1))));const plus=btn('+',()=>set(Math.min(max,value+1)),'ml-step');minus.disabled=value<=1;plus.disabled=value>=max;box.append(minus,n,plus);return box;
}
function picker(d){
 const wrap=mk('div','ml-picker'),all=bagEntries(),list=all.filter(e=>!d.items.has(keyOf(e)));
 if(!list.length)wrap.append(mk('p','ml-note',all.length?'보낼 수 있는 물건을 모두 넣었습니다.':'보낼 수 있는 물건이 없습니다. 모라·경험치 책·보스 재료·전용 무기·장착 중인 장비·임무 아이템은 편지에 넣을 수 없습니다.'));
 for(const e of list.slice(0,200)){
  const have=e.kind==='EQUIPMENT'?1:game.itemCount(e.id),b=mk('button','ml-gift ml-pick tier-'+(e.tier?.rank||1));b.type='button';b.title=e.name+(e.kind==='EQUIPMENT'?'':' · 보유 '+have+'개');
  b.append(glyphOf(e),mk('strong','',e.kind==='EQUIPMENT'?(e.enhance?'+'+e.enhance:'장비'):'×'+fmt(have)),mk('span','',e.name));
  b.onclick=()=>{if(d.items.size>=RULES().entries){M.msg='한 통에 '+RULES().entries+'종류까지 넣을 수 있습니다.';draw();return;}d.items.set(keyOf(e),e.kind==='EQUIPMENT'?{d:e,slot:e.key,qty:1,max:1}:{d:e,item:e.id,qty:1,max:Math.min(999,have)});d.confirm=false;if(d.items.size>=RULES().entries)d.picker=false;SND('page');draw();};
  wrap.append(b);
 }
 return wrap;
}
function feeText(p,d){
 const R=RULES(),f=postage(d.items.size,d.mora),need=f+d.mora,have=mora();
 p.replaceChildren();p.classList.toggle('short',have<need);
 p.append(mk('strong','','수수료 '+fmt(f)+' 모라'),mk('span','',' 기본 '+fmt(R.base)+(d.items.size?' + 물건 '+d.items.size+'종 × '+fmt(R.perEntry):'')+(d.mora?' + 보낸 모라의 '+Math.round(R.moraRate*100)+'%':'')),
  mk('small','','보유 모라 '+fmt(have)+(have>=need?' → 보낸 뒤 '+fmt(have-need):' · '+fmt(need-have)+' 모라 부족')+' · 수수료는 돌려받지 못합니다'));
}
function sendWhy(d){
 if(uncertainSend(d))return '';
 const lv=(()=>{try{return game.tradeLevelReason?.()||'';}catch{return '';}})();if(lv)return lv;
 if(!d.to)return '받는 모험가를 골라 주세요.';if(!String(d.title).trim())return '제목을 적어 주세요.';
 const need=postage(d.items.size,d.mora)+d.mora;if(mora()<need)return '모라가 부족합니다.';return busyReason();
}
function sendButtons(d){
 const why=sendWhy(d);
 if(d.confirm&&!why){
  const what=[...d.items.values()].map(x=>x.d.name+(x.slot?(x.d.enhance?' +'+x.d.enhance:''):' ×'+x.qty));if(d.mora)what.push(fmt(d.mora)+' 모라');
  const note=mk('p','ml-confirm',d.to.name+' 님에게 「'+String(d.title).trim()+'」을(를) 보냅니다'+(what.length?' · 넣은 것: '+what.join(', '):'')+' · 수수료 '+fmt(postage(d.items.size,d.mora))+' 모라');
  return [note,btn('보내기 확인',()=>send(d),'primary ml-go'),btn('고치기',()=>{d.confirm=false;draw();})];
 }
 return [lock(btn(uncertainSend(d)?'보낸 기록 확인':'보내기',()=>{d.confirm=true;M.msg='';draw();},'primary ml-go'),why),btn('취소',()=>{M.draft=null;M.tab='in';M.msg='';draw();})];
}
async function find(d){
 if(M.draft!==d||M.tab!=='write'||!O?.token)return;
 const q=String(d.q||'').trim(),session=O.sessionStamp(),version=d.findVersion=(d.findVersion||0)+1;
 const current=()=>M.draft===d&&M.tab==='write'&&O.sameSession(session)&&d.findVersion===version&&String(d.q||'').trim()===q;
 if(!q){d.results=[];if(M.findList)fillFind(M.findList,d);return;}
 try{const out=await O.request('/mail/find?q='+encodeURIComponent(q));if(!current())return;d.results=out.players||[];}
 catch(e){if(!current())return;d.results=[];M.msg=e.message;}
 if(M.findList?.isConnected)fillFind(M.findList,d);
}
function fillFind(ul,d){
 ul.replaceChildren();
 if(d.q.trim()&&!d.results.length){ul.append(mk('li','ml-empty','찾는 모험가가 없습니다.'));return;}
 for(const p of d.results){const li=mk('li'),b=mk('button','ml-find-btn');b.type='button';b.append(mk('strong','',p.name),mk('small','',p.online?'접속 중':'접속 안 함'));b.onclick=()=>{d.to={pid:p.pid,name:p.name};d.results=[];d.q='';SND('page');draw();M.node?.querySelector('.ml-form input:not([type=search])')?.focus();};li.append(b);ul.append(li);}
}
// ---------- actions ----------
// A press that cannot be undone asks once more on the same button (messages stay inside the window).
function twoStep(label,sure,fn,cls=''){
 const b=btn(label,()=>{if(!b.dataset.sure){b.dataset.sure='1';b.textContent=sure;b.classList.add('sure');setTimeout(()=>{if(b.isConnected){delete b.dataset.sure;b.textContent=label;b.classList.remove('sure');}},3500);return;}fn();},cls);return b;
}
// act() answers {ok:false,error:'…'} when the game refuses, nothing while another action runs, else the receipt.
const failed=r=>r?.ok===false?(typeof r.error==='string'?r.error:r.error?.message||'처리하지 못했습니다.'):'';
async function claim(id){
 if(M.busy)return;const session=mailSession();M.busy=true;let receipt;
 try{receipt=await act('MAIL_CLAIM',{mail:id});}catch(e){if(!sameMailSession(session))return;receipt={ok:false,error:e.message};}
 if(!sameMailSession(session))return;M.busy=false;if(!receipt)return;
 const err=failed(receipt);if(err){M.msg=err;SND('error');draw();return;}
 SND('chest_reward');M.msg='';draw();
 if(receipt.result?.lines?.length)SHELL.toast?.('받았습니다 · '+receipt.result.lines.join(', '));
 M.node?.querySelector('.ml-gifts')?.classList.add('just');
}
async function take(l){
 if(M.busy)return;const session=mailSession();M.busy=true;M.msg='';
 try{const out=await O.request('/mail/take',{id:l.id});SND('chest_reward');SHELL.toast?.((l.box==='BACK'?'되찾았습니다 · ':'받았습니다 · ')+[out.label,out.mora?fmt(out.mora)+' 모라':''].filter(Boolean).join(', '));try{await O.sync();}catch{}}
 catch(e){if(!sameMailSession(session))return;M.msg=e.message;SND('error');}
 finally{if(sameMailSession(session))M.busy=false;}
 if(!sameMailSession(session))return;
 await loadLetters(true);draw();M.node?.querySelector('.ml-gifts')?.classList.add('just');
}
async function takeAll(){
 if(M.busy)return;const session=mailSession();M.msg='';const lines=[];
 if(opView().unclaimed){M.busy=true;let receipt;try{receipt=await act('MAIL_CLAIM',{mail:'ALL'});}catch(e){if(!sameMailSession(session))return;receipt={ok:false,error:e.message};}if(!sameMailSession(session))return;M.busy=false;
  if(!receipt)return;const err=failed(receipt);if(err){M.msg=err;SND('error');draw();return;}lines.push(...(receipt.result?.lines||[]));}
 if(letters()&&(M.letters?.inbox||[]).some(l=>l.waiting)){M.busy=true;
  try{const out=await O.request('/mail/take',{all:true});if(out.label)lines.push(out.label);if(out.mora)lines.push(fmt(out.mora)+' 모라');try{await O.sync();}catch{}}catch(e){if(!sameMailSession(session))return;M.msg=e.message;SND('error');}
  finally{if(sameMailSession(session))M.busy=false;}if(!sameMailSession(session))return;await loadLetters(true);}
 if(lines.length){SND('chest_reward');SHELL.toast?.('받았습니다 · '+lines.join(', '));}
 draw();
}
async function sendBack(l){
 if(M.busy)return;const session=mailSession();M.busy=true;M.msg='';
 try{await O.request('/mail/return',{id:l.id});SND('menu_close');SHELL.toast?.(l.from.name+' 님에게 돌려보냈습니다.');}catch(e){if(!sameMailSession(session))return;M.msg=e.message;SND('error');}
 finally{if(sameMailSession(session))M.busy=false;}if(!sameMailSession(session))return;await loadLetters(true);draw();
}
async function remove(items){
 if(M.busy)return;const session=mailSession();M.busy=true;M.msg='';let n=0;
 const ops=items.filter(x=>x.src==='op').map(x=>x.key),ids=items.filter(x=>x.src==='letter').map(x=>x.id??x.l?.id);
 try{
  if(ops.length){const receipt=await act('MAIL_DELETE',{ids:ops});if(!sameMailSession(session))return;const err=failed(receipt);if(err)throw Error(err);n+=receipt?.result?.deleted||0;}
  if(ids.length){const out=await O.request('/mail/delete',{ids});n+=out.deleted||0;}
  SND('menu_close');if(n)SHELL.toast?.('우편 '+n+'통을 지웠습니다.');
 }catch(e){if(!sameMailSession(session))return;M.msg=e.message;SND('error');}
 finally{if(sameMailSession(session))M.busy=false;}
 if(!sameMailSession(session))return;
 if(ids.length)await loadLetters(true);draw();
}
async function block(p,on){
 if(M.busy)return;const session=mailSession();M.busy=true;M.msg='';
 try{await O.request('/mail/block',{pid:p.pid,blocked:on});SHELL.toast?.(on?p.name+' 님의 편지를 더 받지 않습니다.':p.name+' 님의 편지를 다시 받습니다.');}catch(e){if(!sameMailSession(session))return;M.msg=e.message;SND('error');}
 finally{if(sameMailSession(session))M.busy=false;}if(!sameMailSession(session))return;await loadLetters(true);draw();
}
function sendPayload(d){
 const items=[...d.items.values()].map(x=>x.slot?{slot:x.slot}:{item:x.item,qty:x.qty}).sort((a,b)=>String(a.slot||a.item).localeCompare(String(b.slot||b.item)));
 return {to:d.to?.pid,title:String(d.title).trim(),body:String(d.body||'').trim(),items,mora:d.mora,replyTo:d.replyTo};
}
function uncertainSend(d){return !!(d.sendAttempt?.uncertain&&d.sendAttempt.intent===JSON.stringify(sendPayload(d)));}
async function send(d){
 if(M.busy)return;const session=mailSession();const why=sendWhy(d);if(why){M.msg=why;d.confirm=false;draw();return;}M.busy=true;M.msg='';
 const payload=sendPayload(d),intent=JSON.stringify(payload);
 if(d.sendAttempt?.intent!==intent)d.sendAttempt={intent,requestId:'mail-'+crypto.randomUUID(),uncertain:false};
 try{
  const out=await O.request('/mail/send',{...payload,requestId:d.sendAttempt.requestId});
  SND('commission_accept');SHELL.toast?.(d.to.name+' 님에게 편지를 보냈습니다 · 수수료 '+fmt(out.fee)+' 모라');
  M.draft=null;M.tab='sent';M.sentPick='S'+out.letter.id;try{await O.sync();}catch{}
 }catch(e){if(!sameMailSession(session))return;d.sendAttempt.uncertain=e.code!=='SESSION_CHANGED'&&e.outcome!=='REJECTED'&&(!e.status||e.status>=500);M.msg=e.message;d.confirm=false;SND('error');}
 finally{if(sameMailSession(session))M.busy=false;}
 if(!sameMailSession(session))return;
 await loadLetters(true);draw();
}
// ---------- the envelope at the top, Paimon's menu, news from the server ----------
SHELL.extraTools.push(tool=>{
 if(!ready())return null;const b=tool('MAIL','우편함',()=>M.open());b.classList.add('hud-mail');
 const n=count(),op=opCount(),badgeNode=mk('span','hud-badge');badgeNode.textContent=n>9?'9+':String(n);badgeNode.hidden=!n;b.append(badgeNode);
 if(M.seen!==null&&op>M.seen){SHELL.toast?.('우편이 도착했습니다.');SND('chest_appear');}
 M.seen=op;setTimeout(badge,0);if(M.node&&M.tab!=='write')setTimeout(draw,0);return b;
});
SHELL.extraTiles.push({icon:'MAIL',get label(){const n=count();return n?'우편 ('+n+')':'우편';},run:()=>M.open()});
window.CRPGChat?.on?.(ev=>{
 if(ev?.type!=='mail')return;
 if(ev.status==='NEW'){SND('chest_appear');SHELL.toast?.('편지가 도착했습니다 · '+ev.from+' 님'+(ev.parcel?' (물건이 들어 있습니다)':''));}
 else if(ev.status==='RETURNED')SHELL.toast?.('보낸 편지 「'+ev.title+'」이(가) 돌아왔습니다. 우편함에서 되찾아 주세요.');
 clearTimeout(M.reloadTimer);M.reloadTimer=setTimeout(()=>loadLetters(true),300);
});
// Letters come with a login on an account server that has them; everything is forgotten on logout.
if(typeof render==='function'){const prior=render;render=function(){prior();try{
 if(!O?.token){clearTimeout(readTimer);clearTimeout(M.findTimer);clearTimeout(M.reloadTimer);readQueue.clear();lettersSequence++;lettersFlight=null;M.letters=null;M.enabled=null;M.draft=null;M.findList=null;M.tab='in';M.busy=false;M.probing=false;M.seen=null;M.msg='';M.nextProbe=0;close();return;}
 if(M.enabled===null&&!M.probing&&Date.now()>=M.nextProbe){const session=O.sessionStamp();M.probing=true;loadLetters().finally(()=>{if(O.sameSession(session))M.probing=false;});}
}catch{}};}
})();
