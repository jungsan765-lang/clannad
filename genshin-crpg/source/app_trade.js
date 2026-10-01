/* 0.14.7 교환소 (trade groundwork). Shows which items can change hands (a chip in the bag's item detail), and lets
 * two adventurers on the same account server send, accept, decline or cancel offers. The server checks both
 * saves and moves everything in one transaction; afterwards each client reloads its save from the server.
 * Available only where the server offers trade (test server for now). Load after app_chat.js. */
(function(){
'use strict';
const O=window.CRPGOnline,SHELL=window.CRPGShell;if(!O||!SHELL)return;
const T=window.CRPGTrade={node:null,tab:'incoming',data:null,enabled:null,busy:false,draft:{to:'',give:new Map(),want:new Map(),note:'',search:''}};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const btn=(label,fn,cls='')=>{const b=mk('button','tr-btn '+cls,label);b.type='button';b.onclick=fn;return b;};
const STATUS={PENDING:['대기 중','wait'],ACCEPTED:['교환 완료','ok'],DECLINED:['거절됨','warn'],CANCELLED:['취소됨','muted'],FAILED:['실패','warn']};
const itemName=id=>game?.tables['14_ITEM_DB']?.get(id)?.[1]||id;
async function load(){if(!O.token)return;try{T.data=await O.request('/trade/list');T.enabled=true;T.error='';}catch(e){if(e.status===404)T.enabled=false;T.error=e.message;}draw();}
T.load=load;
function open(tab){if(!game)return;if(tab)T.tab=tab;if(!T.node)build();T.node.hidden=false;requestAnimationFrame(()=>T.node?.classList.add('open'));window.CRPGSound?.play('handbook_open');draw();load();}
function close(){if(!T.node)return;const n=T.node;n.classList.remove('open');setTimeout(()=>{n.hidden=true;},180);window.CRPGSound?.play('menu_close');}
T.open=open;T.close=close;T.isOpen=()=>!!T.node&&!T.node.hidden;
function build(){
 const wrap=mk('div','trade-overlay');wrap.hidden=true;wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','교환소');
 wrap.addEventListener('click',e=>{if(e.target===wrap)close();});wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
 const box=mk('div','trade-box'),head=mk('header','trade-head');head.append(SHELL.icon('TRADE','shell-icon trade-glyph'),mk('strong','','교환소'),mk('small','','다른 모험가와 재료·장비를 주고받습니다'));
 const x=btn('',close,'trade-close');x.setAttribute('aria-label','교환소 닫기');x.append(SHELL.icon('CLOSE','shell-icon'));head.append(x);
 const tabs=mk('div','trade-tabs');for(const [id,label]of [['incoming','받은 제안'],['outgoing','보낸 제안'],['new','새 제안']]){const b=btn(label,()=>{if(T.tab!==id)window.CRPGSound?.play('page');T.tab=id;draw();},'trade-tab');b.dataset.tab=id;tabs.append(b);}
 const body=mk('div','trade-body');box.append(head,tabs,body);wrap.append(box);document.body.append(wrap);T.node=wrap;
}
function draw(){
 if(!T.node)return;for(const b of T.node.querySelectorAll('.trade-tab')){const on=b.dataset.tab===T.tab;b.classList.toggle('active',on);const n=b.dataset.tab==='incoming'?(T.data?.incoming||[]).filter(t=>t.status==='PENDING').length:0;b.textContent=b.textContent.replace(/ \d+$/,'')+(n?' '+n:'');}
 const body=T.node.querySelector('.trade-body');body.replaceChildren();
 if(T.enabled===false){body.append(mk('p','trade-note','이 서버에서는 아직 교환을 사용할 수 없습니다. 테스트 서버에서 먼저 시험 중입니다.'));return;}
 if(!game){body.append(mk('p','trade-note','여정을 연 뒤 사용할 수 있습니다.'));return;}
 if(T.tab==='new')return drawNew(body);
 const list=(T.tab==='incoming'?T.data?.incoming:T.data?.outgoing)||[];
 if(T.error)body.append(mk('p','trade-note warn',T.error));
 if(!list.length){body.append(mk('p','trade-note',T.tab==='incoming'?'받은 교환 제안이 없습니다.':'보낸 교환 제안이 없습니다. 「새 제안」에서 시작해 보세요.'));return;}
 for(const t of list){
  const card=mk('article','trade-card '+t.status.toLowerCase()),who=T.tab==='incoming'?t.from:t.to,[label,kind]=STATUS[t.status]||[t.status,''];
  const top=mk('div','trade-card-top');top.append(mk('strong','',(T.tab==='incoming'?'보낸 모험가 · ':'받는 모험가 · ')+(who.name||'')+' ('+(who.username||'?')+')'),mk('span','trade-chip '+kind,label));card.append(top);
  const give=mk('p','trade-line');give.append(mk('b','',T.tab==='incoming'?'받을 것':'줄 것'),document.createTextNode(t.give.map(x=>x.label).join(', ')||'없음'));
  const want=mk('p','trade-line');want.append(mk('b','',T.tab==='incoming'?'줄 것':'받을 것'),document.createTextNode(t.want.map(x=>x.label).join(', ')||'없음'));card.append(give,want);
  if(t.note)card.append(mk('p','trade-memo','“'+t.note+'”'));
  if(t.status==='PENDING'){const row=mk('div','trade-actions');
   if(T.tab==='incoming'){row.append(btn('수락',()=>respond(t,'accept'),'primary'),btn('거절',()=>respond(t,'decline')));}
   else row.append(btn('제안 취소',()=>respond(t,'cancel')));card.append(row);}
  body.append(card);
 }
}
async function respond(t,decision){
 if(T.busy)return;if(decision==='accept'&&(busy||O.pending)){SHELL.toast?.('진행 중인 저장이 끝난 뒤 수락해 주세요.');return;}
 T.busy=true;try{const out=await O.request('/trade/'+decision,{id:t.id});
  if(decision==='accept'){window.CRPGSound?.play('item_receive');SHELL.toast?.('교환 완료 · 받은 것: '+(out.received||'없음'));try{await O.sync();}catch{}}
  else SHELL.toast?.(decision==='decline'?'제안을 거절했습니다.':'제안을 취소했습니다.');
 }catch(e){SHELL.toast?.(e.message);window.CRPGSound?.play('error');}finally{T.busy=false;load();}
}
function drawNew(body){
 const d=T.draft,form=mk('div','trade-new');
 const to=mk('input');to.placeholder='받는 모험가의 아이디';to.value=d.to;to.maxLength=24;to.oninput=()=>{d.to=to.value;};to.setAttribute('aria-label','받는 모험가 아이디');
 form.append(mk('h3','','받는 모험가'),to);
 // What I give: stacks and unequipped gear the rules allow.
 form.append(mk('h3','','보낼 것'),mk('p','trade-note','교환할 수 있는 아이템만 보입니다. 모라·경험치 책·보스 재료·전용 무기·장착 중인 장비는 교환할 수 없습니다.'));
 const mine=mk('div','trade-pick'),inv=game.s.inventory.filter(i=>game.tradeRule?.(i.equip?i:i.item)?.ok&&(i.equip||i.quantity>0));
 if(!inv.length)mine.append(mk('p','trade-note','지금 보낼 수 있는 아이템이 없습니다.'));
 for(const i of inv.slice(0,120)){
  const key=i.equip?'slot:'+i.slot:'item:'+i.item,label=i.equip?game.tradeLabel([{slot:i.slot}]):itemName(i.item),row=mk('label','trade-row'+(d.give.has(key)?' picked':''));
  if(i.equip){const c=mk('input');c.type='checkbox';c.checked=d.give.has(key);c.onchange=()=>{if(c.checked)d.give.set(key,{slot:i.slot});else d.give.delete(key);row.classList.toggle('picked',c.checked);};row.append(c,mk('span','',label));}
  else{const have=game.itemCount(i.item),q=mk('input');q.type='number';q.min=0;q.max=Math.min(999,have);q.value=d.give.get(key)?.qty||0;q.oninput=()=>{const n=Math.max(0,Math.min(Number(q.max),Math.floor(Number(q.value)||0)));if(n)d.give.set(key,{item:i.item,qty:n});else d.give.delete(key);row.classList.toggle('picked',!!n);};row.append(mk('span','',label),mk('small','','보유 '+have),q);}
  mine.append(row);
 }
 form.append(mine);
 // What I ask for in return (optional): any tradeable item by name.
 form.append(mk('h3','','받고 싶은 것 (선택)'));
 const search=mk('input');search.placeholder='아이템 이름 검색';search.value=d.search;search.setAttribute('aria-label','받고 싶은 아이템 검색');
 const hits=mk('div','trade-pick small'),wanted=mk('div','trade-wanted');
 const drawWanted=()=>{wanted.replaceChildren();for(const [id,qty]of d.want){const chip=mk('span','trade-chip ok',itemName(id)+' ×'+qty);const x=btn('×',()=>{d.want.delete(id);drawWanted();},'tr-x');chip.append(x);wanted.append(chip);}};
 const drawHits=()=>{hits.replaceChildren();const q=d.search.trim();if(!q)return;for(const r of game.rows('14_ITEM_DB').filter(r=>r[1]&&String(r[1]).includes(q)&&game.tradeRule(r[0]).ok).slice(0,12)){const qty=mk('input');qty.type='number';qty.min=1;qty.max=999;qty.value=1;const row=mk('div','trade-row');row.append(mk('span','',r[1]),qty,btn('추가',()=>{d.want.set(r[0],Math.max(1,Math.min(999,Math.floor(Number(qty.value)||1))));drawWanted();}));hits.append(row);}};
 search.oninput=()=>{d.search=search.value;drawHits();};form.append(search,hits,wanted);drawHits();drawWanted();
 const note=mk('input');note.placeholder='한마디 (선택, 60자)';note.maxLength=60;note.value=d.note;note.oninput=()=>{d.note=note.value;};form.append(mk('h3','','메모'),note);
 const send=btn('교환 제안 보내기',async()=>{
  if(T.busy)return;if(!d.to.trim()){SHELL.toast?.('받는 모험가의 아이디를 입력해 주세요.');return;}
  const give=[...d.give.values()],want=[...d.want].map(([item,qty])=>({item,qty}));if(!give.length&&!want.length){SHELL.toast?.('주거나 받을 아이템을 고르세요.');return;}
  T.busy=true;try{await O.request('/trade/offer',{to:d.to.trim(),give,want,note:d.note});SHELL.toast?.('교환 제안을 보냈습니다.');window.CRPGSound?.play('commission_accept');T.draft={to:'',give:new Map(),want:new Map(),note:'',search:''};T.tab='outgoing';}
  catch(e){SHELL.toast?.(e.message);window.CRPGSound?.play('error');}finally{T.busy=false;load();}
 },'primary trade-send');
 form.append(send);body.append(form);
}
// News from the server: an offer arrived or settled. A settled trade reloads this save from the server.
window.CRPGChat?.on?.(async ev=>{
 if(ev?.type!=='trade')return;
 if(ev.status==='PENDING'){SHELL.toast?.('새 교환 제안이 도착했습니다 · 메뉴의 교환소에서 확인하세요.');window.CRPGSound?.play('toast');}
 else if(ev.status==='ACCEPTED'){SHELL.toast?.('교환이 완료되었습니다.');if(ev.sync&&!busy&&!O.pending&&!T.busy){try{await O.sync();}catch{}}}
 if(T.isOpen())load();
});
SHELL.extraTiles.push({icon:'TRADE',label:'교환소',key:'',show:()=>T.enabled!==false&&!!O.token,run:()=>open()});
// The bag says whether the selected item can be traded.
if(typeof itemDetailView==='function'){const prior=itemDetailView;itemDetailView=function(box,d){prior(box,d);try{const entry=d.kind==='EQUIPMENT'?game.s.inventory.find(i=>i.slot===d.key):d.id;const rule=game.tradeRule?.(entry||d.id);if(rule){const chip=mk('p','trade-rule '+(rule.ok?'ok':'bound'),rule.ok?'교환 가능':'교환 불가 · '+rule.reason);box.append(chip);}}catch{}};}
// Keep the list fresh while open; forget everything on logout.
if(typeof render==='function'){const prior=render;render=function(){prior();try{if(!O.token&&T.node){T.node.remove();T.node=null;T.data=null;T.enabled=null;}}catch{}};}
})();
