/* 0.14.7 교환소 (trade). Pick things the way the bag shows them: tiles with icons and tier colours on the left
 * (my tradeable bag, or every tradeable item when asking for something), a tray on the right with steppers, the
 * receiver picked from recent chat partners or typed as an ID, and offers drawn as item tiles. The server checks
 * both saves and moves everything in one transaction; afterwards each client reloads its save from the server.
 * Available only where the server offers trade (test server for now). Load after app_chat.js. */
(function(){
'use strict';
const O=window.CRPGOnline,SHELL=window.CRPGShell;if(!O||!SHELL)return;
const fresh=()=>({to:null,toText:'',give:new Map(),want:new Map(),note:'',pane:'bag',cat:'전체',search:''});
const T=window.CRPGTrade={node:null,tab:'new',data:null,enabled:null,busy:false,draft:fresh()};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const btn=(label,fn,cls='')=>{const b=mk('button','tr-btn '+cls,label);b.type='button';b.onclick=fn;return b;};
const STATUS={PENDING:['대기 중','wait'],ACCEPTED:['교환 완료','ok'],DECLINED:['거절됨','warn'],CANCELLED:['취소됨','muted'],FAILED:['실패','warn']};
const GROUPS=['전체','재료','음식','소모품','장비'];
const presenter=()=>typeof itemPresenter!=='undefined'?itemPresenter:null;
const glyph=d=>{try{if(typeof itemGlyph==='function')return itemGlyph(d);}catch{}const s=mk('span','item-glyph','◆');return s;};
const tierOf=d=>Math.max(1,Math.min(5,d?.tier?.rank||1));
const detailOf=id=>{try{return presenter()?.itemDetail({item:id,quantity:1})||null;}catch{return null;}};
const ago=at=>{const m=Math.max(0,Math.round((Date.now()-at)/60000));return m<1?'방금':m<60?m+'분 전':m<1440?Math.floor(m/60)+'시간 전':Math.floor(m/1440)+'일 전';};
async function load(){if(!O.token)return;try{T.data=await O.request('/trade/list');T.enabled=true;T.error='';}catch(e){if(e.status===404)T.enabled=false;T.error=e.message;}draw();}
T.load=load;
function open(tab){if(typeof game==='undefined'||!game)return;if(tab)T.tab=tab;if(!T.node)build();T.node.hidden=false;requestAnimationFrame(()=>T.node?.classList.add('open'));window.CRPGSound?.play('handbook_open');draw();load();}
function close(){if(!T.node)return;const n=T.node;n.classList.remove('open');setTimeout(()=>{n.hidden=true;},180);window.CRPGSound?.play('menu_close');}
T.open=open;T.close=close;T.isOpen=()=>!!T.node&&!T.node.hidden;
function build(){
 const wrap=mk('div','trade-overlay');wrap.hidden=true;wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','교환소');
 wrap.addEventListener('click',e=>{if(e.target===wrap)close();});wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
 const box=mk('div','trade-box'),head=mk('header','trade-head');head.append(SHELL.icon('TRADE','shell-icon trade-glyph'),mk('strong','','교환소'),mk('small','','재료·음식·장비를 다른 모험가와 주고받습니다'));
 const x=btn('',close,'trade-close');x.setAttribute('aria-label','교환소 닫기');x.append(SHELL.icon('CLOSE','shell-icon'));head.append(x);
 const tabs=mk('div','trade-tabs');for(const [id,label]of [['new','새 제안'],['incoming','받은 제안'],['outgoing','보낸 제안']]){const b=btn(label,()=>{if(T.tab!==id)window.CRPGSound?.play('page');T.tab=id;draw();},'trade-tab');b.dataset.tab=id;tabs.append(b);}
 const body=mk('div','trade-body');box.append(head,tabs,body);wrap.append(box);document.body.append(wrap);T.node=wrap;
}
// ---------- tiles ----------
function tile(d,{count,badge,cls='',title,onClick,disabled}={}){
 const b=mk('button','tr-tile tier-'+tierOf(d)+' '+cls);b.type='button';b.title=title||d?.name||'';b.disabled=!!disabled;
 const art=mk('span','tr-art');art.append(glyph(d||{}));b.append(art);
 if(count!==undefined)b.append(mk('span','tr-count',count));if(badge)b.append(mk('span','tr-badge',badge));
 b.append(mk('span','tr-name',d?.name||''));if(onClick)b.onclick=onClick;return b;
}
function gearTile(label,opts={}){return tile({name:label,tier:{rank:4},category:'한손검'},opts);}
function stepper(value,max,set){const box=mk('div','tr-stepper'),minus=btn('−',()=>set(value-1),'tr-step'),n=mk('input');n.type='number';n.min=1;n.max=max;n.value=value;n.onchange=()=>set(Math.floor(Number(n.value)||1));const plus=btn('+',()=>set(value+1),'tr-step');plus.disabled=value>=max;box.append(minus,n,plus);return box;}
// ---------- what can move ----------
function myEntries(){
 const P=presenter();if(!P)return [];
 return P.inventoryEntries(game.s).filter(d=>{const entry=d.kind==='EQUIPMENT'?game.s.inventory.find(i=>i.slot===d.key):d.id;return game.tradeRule?.(entry)?.ok;});
}
function groupOf(d){return d.kind==='EQUIPMENT'?'장비':d.group==='음식'?'음식':d.group==='소모품'?'소모품':'재료';}
function catalog(){
 if(T.catalog)return T.catalog;
 T.catalog=game.rows('14_ITEM_DB').filter(r=>r[0]&&r[1]&&game.tradeRule(r[0]).ok).map(r=>detailOf(r[0])||{id:r[0],name:r[1],tier:{rank:1}}).filter(Boolean);return T.catalog;
}
T.addGive=function(d){
 const D=T.draft;if(d.kind==='EQUIPMENT'){const key='slot:'+d.key;if(D.give.has(key))D.give.delete(key);else D.give.set(key,{slot:d.key,d,qty:1,max:1});}
 else{const key='item:'+d.id,have=game.itemCount(d.id),cur=D.give.get(key);if(cur)cur.qty=Math.min(have,cur.qty+1);else D.give.set(key,{item:d.id,d,qty:1,max:have});}
 window.CRPGSound?.play('tab');draw();
};
// ---------- drawing ----------
function draw(){
 if(!T.node)return;
 const pending=(T.data?.incoming||[]).filter(t=>t.status==='PENDING').length;
 for(const b of T.node.querySelectorAll('.trade-tab')){const on=b.dataset.tab===T.tab;b.classList.toggle('active',on);b.textContent={new:'새 제안',incoming:'받은 제안',outgoing:'보낸 제안'}[b.dataset.tab]+(b.dataset.tab==='incoming'&&pending?' '+pending:'');}
 const body=T.node.querySelector('.trade-body');body.replaceChildren();body.className='trade-body tab-'+T.tab;
 if(T.enabled===false){body.append(mk('p','trade-note','이 서버에서는 아직 교환을 사용할 수 없습니다. 테스트 서버에서 먼저 시험하고 있습니다.'));return;}
 if(typeof game==='undefined'||!game){body.append(mk('p','trade-note','여정을 연 뒤 사용할 수 있습니다.'));return;}
 if(T.tab==='new')return drawNew(body);
 const list=(T.tab==='incoming'?T.data?.incoming:T.data?.outgoing)||[];
 if(T.error)body.append(mk('p','trade-note warn',T.error));
 if(!list.length){body.append(mk('p','trade-note empty',T.tab==='incoming'?'받은 교환 제안이 없습니다.':'보낸 교환 제안이 없습니다. 「새 제안」에서 시작해 보세요.'));return;}
 for(const t of list)body.append(offerCard(t));
}
function itemsRow(list,label){
 const row=mk('div','tr-offer-row');row.append(mk('b','',label));const tiles=mk('div','tr-offer-tiles');
 if(!list.length)tiles.append(mk('span','trade-note','없음'));
 for(const x of list)tiles.append(x.item?tile(detailOf(x.item)||{name:x.label},{count:'×'+x.qty,title:x.label}):gearTile(x.label,{title:x.label}));
 row.append(tiles);return row;
}
function offerCard(t){
 const incoming=T.tab==='incoming',who=incoming?t.from:t.to,[label,kind]=STATUS[t.status]||[t.status,''];
 const card=mk('article','trade-card '+t.status.toLowerCase()),top=mk('div','trade-card-top');
 top.append(mk('strong','',(incoming?'보낸 모험가 · ':'받는 모험가 · ')+(who?.name||'')),mk('small','',ago(t.updated||t.at)),mk('span','trade-chip '+kind,label));card.append(top);
 card.append(itemsRow(t.give,incoming?'받을 것':'줄 것'),itemsRow(t.want,incoming?'줄 것':'받을 것'));
 if(t.note)card.append(mk('p','trade-memo','“'+t.note+'”'));
 if(t.status==='PENDING'){const row=mk('div','trade-actions');if(incoming)row.append(btn('수락',()=>respond(t,'accept'),'primary'),btn('거절',()=>respond(t,'decline')));else row.append(btn('제안 취소',()=>respond(t,'cancel')));card.append(row);}
 return card;
}
function drawNew(body){
 const D=T.draft,picker=mk('section','tr-picker'),offer=mk('section','tr-offer');
 // Left: my bag or the catalogue of things to ask for.
 const modes=mk('div','tr-modes');for(const [id,label]of [['bag','내 가방에서 담기'],['catalog','받고 싶은 것 고르기']]){const b=btn(label,()=>{D.pane=id;D.cat='전체';draw();},'tr-mode'+(D.pane===id?' active':''));modes.append(b);}
 const cats=mk('div','tr-cats');
 const source=D.pane==='bag'?myEntries():catalog();
 for(const g of GROUPS){const n=g==='전체'?source.length:source.filter(d=>groupOf(d)===g).length;if(!n&&g!=='전체')continue;const b=btn(g+' '+n,()=>{D.cat=g;draw();},'tr-cat'+(D.cat===g?' active':''));cats.append(b);}
 const tools=mk('div','tr-tools');tools.append(cats);
 if(D.pane==='catalog'){const s=mk('input','tr-search');s.type='search';s.placeholder='이름으로 좁히기';s.value=D.search;s.oninput=()=>{D.search=s.value;const g=picker.querySelector('.tr-grid');if(g)fillGrid(g);};tools.append(s);}
 const grid=mk('div','tr-grid');picker.append(modes,tools,grid);
 const fillGrid=g=>{g.replaceChildren();const q=D.search.trim();
  const shown=source.filter(d=>(D.cat==='전체'||groupOf(d)===D.cat)&&(D.pane==='bag'||!q||String(d.name).includes(q)));
  if(!shown.length)g.append(mk('p','trade-note',D.pane==='bag'?'교환할 수 있는 아이템이 없습니다. 모라·경험치 책·보스 재료·전용 무기·장착 중인 장비는 교환할 수 없습니다.':'찾는 아이템이 없습니다.'));
  for(const d of shown.slice(0,240)){
   if(D.pane==='bag'){const key=d.kind==='EQUIPMENT'?'slot:'+d.key:'item:'+d.id,inTray=D.give.get(key),max=d.kind==='EQUIPMENT'?1:game.itemCount(d.id);
    g.append(tile(d,{count:d.kind==='EQUIPMENT'?'+'+(d.enhance||0):'×'+max,badge:inTray?(d.kind==='EQUIPMENT'?'✓':String(inTray.qty)):'',cls:inTray?'in-tray':'',title:d.name+(d.kind==='EQUIPMENT'?'':' · 보유 '+max+'개')+' · 눌러서 담기',onClick:()=>T.addGive(d),disabled:!!inTray&&d.kind!=='EQUIPMENT'&&inTray.qty>=max}));}
   else{const cur=D.want.get(d.id);g.append(tile(d,{badge:cur?String(cur):'',cls:cur?'in-tray':'',title:d.name+' · 눌러서 받고 싶은 것에 담기',onClick:()=>{D.want.set(d.id,Math.min(999,(D.want.get(d.id)||0)+1));window.CRPGSound?.play('tab');draw();}}));}
  }};
 fillGrid(grid);
 // Right: who, what goes, what comes back.
 offer.append(mk('h3','','받는 모험가'));
 const people=mk('div','tr-people'),me=window.CRPGChat?.me,seen=new Set();
 for(const m of [...(window.CRPGChat?.lines||[])].reverse()){if(!m.pid||m.pid===me||seen.has(m.pid)||m.deleted)continue;seen.add(m.pid);const on=D.to?.pid===m.pid;const b=btn(m.author,()=>{D.to={pid:m.pid,name:m.author};D.toText='';draw();},'tr-person'+(on?' active':''));people.append(b);if(seen.size>=6)break;}
 if(!seen.size)people.append(mk('small','trade-note','최근 채팅한 모험가가 여기에 나타납니다.'));
 const id=mk('input','tr-id');id.placeholder='또는 상대 아이디 입력';id.value=D.toText;id.maxLength=24;id.oninput=()=>{D.toText=id.value;D.to=id.value.trim()?{username:id.value.trim()}:null;for(const b of people.querySelectorAll('.tr-person'))b.classList.remove('active');};
 offer.append(people,id);
 const tray=(title,empty,entries,render)=>{const box=mk('div','tr-tray');box.append(mk('h3','',title));const list=mk('div','tr-tray-list');if(!entries.length)list.append(mk('p','trade-note',empty));for(const e of entries)list.append(render(e));box.append(list);return box;};
 offer.append(tray('보낼 것','왼쪽 가방에서 아이템을 누르면 여기에 담깁니다.',[...D.give.entries()],([key,v])=>{const row=mk('div','tr-tray-item');row.append(v.slot?tile(v.d,{count:'+'+(v.d.enhance||0)}):tile(v.d,{}));const info=mk('div','tr-tray-info');info.append(mk('span','',v.d.name));if(!v.slot)info.append(stepper(v.qty,v.max,n=>{v.qty=Math.max(1,Math.min(v.max,n));draw();}));row.append(info,btn('×',()=>{D.give.delete(key);draw();},'tr-x'));return row;}));
 offer.append(tray('받고 싶은 것','필요한 것이 있으면 「받고 싶은 것 고르기」에서 담으세요. 비워 두면 선물이 됩니다.',[...D.want.entries()],([item,qty])=>{const d=detailOf(item)||{name:item};const row=mk('div','tr-tray-item');row.append(tile(d,{}));const info=mk('div','tr-tray-info');info.append(mk('span','',d.name),stepper(qty,999,n=>{D.want.set(item,Math.max(1,Math.min(999,n)));draw();}));row.append(info,btn('×',()=>{D.want.delete(item);draw();},'tr-x'));return row;}));
 const note=mk('input','tr-note');note.placeholder='한마디 (선택, 60자)';note.maxLength=60;note.value=D.note;note.oninput=()=>{D.note=note.value;};offer.append(note);
 const ready=!!D.to&&(D.give.size||D.want.size),send=btn('교환 제안 보내기',sendOffer,'primary trade-send');send.disabled=!ready||T.busy;
 offer.append(mk('p','trade-note small',D.to?'받는 모험가 · '+(D.to.name||D.to.username):'받는 모험가를 고르세요.'),send);
 body.append(picker,offer);
}
async function sendOffer(){
 const D=T.draft;if(T.busy||!D.to)return;
 const give=[...D.give.values()].map(v=>v.slot?{slot:v.slot}:{item:v.item,qty:v.qty}),want=[...D.want].map(([item,qty])=>({item,qty}));
 T.busy=true;draw();
 try{await O.request('/trade/offer',{...(D.to.pid?{toPid:D.to.pid}:{to:D.to.username}),give,want,note:D.note});SHELL.toast?.('교환 제안을 보냈습니다.');window.CRPGSound?.play('commission_accept');T.draft=fresh();T.tab='outgoing';}
 catch(e){SHELL.toast?.(e.message);window.CRPGSound?.play('error');}finally{T.busy=false;load();}
}
async function respond(t,decision){
 if(T.busy)return;if(decision==='accept'&&(busy||O.pending)){SHELL.toast?.('진행 중인 저장이 끝난 뒤 수락해 주세요.');return;}
 T.busy=true;try{const out=await O.request('/trade/'+decision,{id:t.id});
  if(decision==='accept'){window.CRPGSound?.play('item_receive');SHELL.toast?.('교환 완료 · 받은 것: '+(out.received||'없음'));try{await O.sync();}catch{}T.catalog=null;}
  else SHELL.toast?.(decision==='decline'?'제안을 거절했습니다.':'제안을 취소했습니다.');
 }catch(e){SHELL.toast?.(e.message);window.CRPGSound?.play('error');}finally{T.busy=false;load();}
}
// News from the server: an offer arrived or settled. A settled trade reloads this save from the server.
window.CRPGChat?.on?.(async ev=>{
 if(ev?.type!=='trade')return;
 if(ev.status==='PENDING'){SHELL.toast?.('새 교환 제안이 도착했습니다 · 메뉴의 교환소에서 확인하세요.');}
 else if(ev.status==='ACCEPTED'){SHELL.toast?.('교환이 완료되었습니다.');if(ev.sync&&!busy&&!O.pending&&!T.busy){try{await O.sync();}catch{}}}
 if(T.isOpen())load();
});
SHELL.extraTiles.push({icon:'TRADE',label:'교환소',key:'',show:()=>T.enabled!==false&&!!O.token,run:()=>open()});
// The bag says whether the selected item can be traded, and puts it in the trade tray in one click.
if(typeof itemDetailView==='function'){const prior=itemDetailView;itemDetailView=function(box,d){prior(box,d);try{const entry=d.kind==='EQUIPMENT'?game.s.inventory.find(i=>i.slot===d.key):d.id;const rule=game.tradeRule?.(entry||d.id);if(rule){const chip=mk('p','trade-rule '+(rule.ok?'ok':'bound'),rule.ok?'교환 가능':'교환 불가 · '+rule.reason);box.append(chip);if(rule.ok&&O.token&&T.enabled!==false){const b=btn('교환 바구니에 담기',()=>{T.tab='new';T.draft.pane='bag';T.addGive(d);open('new');},'trade-bag-add');box.append(b);}}}catch{}};}
// Forget everything on logout.
if(typeof render==='function'){const prior=render;render=function(){prior();try{if(!O.token&&T.node){T.node.remove();T.node=null;T.data=null;T.enabled=null;T.draft=fresh();T.catalog=null;}}catch{}};}
})();
