/* 0.14.15 거래소 (user: 「교환소 뭐 저따구로 만드냐; 차라리 두 가지로 해. 상점을 열어서 판매하는 서비스(수수료까지)랑
 * 채팅에서 온라인 상태인 상대방과 거래하는 방식」). Two ways to trade, both checked and applied by the account server:
 *  - 시장 · 내 상점: put bag items or spare gear in your shop for Mora; buyers pay the price, the server keeps 5% and
 *    holds the rest until the seller presses 「받기」. Listed goods leave the bag until sold or taken back.
 *  - 직접 거래: with an adventurer online right now (from the chat card or the online list). Both put things on the
 *    table, both press 확정, both press 거래하기; any change releases both 확정. Mora is not traded hand to hand.
 * The old one-way offers (0.14.7) are gone from the screen. Load after app_chat.js and app_profile_v01415.js. */
(function(){
'use strict';
const O=window.CRPGOnline,SHELL=window.CRPGShell;if(!O||!SHELL)return;
const T=window.CRPGTrade={node:null,tab:'market',enabled:null,busy:false,market:null,online:null,deal:null,error:'',
 filter:{q:'',kind:'',sort:'',seller:'',sellerName:''},sell:{key:'',qty:1,price:''},cat:'전체',confirmBuy:null,dealNode:null,inviteNode:null,offer:null};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const btn=(label,fn,cls='')=>{const b=mk('button','tr-btn '+cls,label);b.type='button';b.onclick=fn;return b;};
const say=t=>SHELL.toast?.(t);
const SND=n=>window.CRPGSound?.play(n);
const presenter=()=>typeof itemPresenter!=='undefined'?itemPresenter:null;
const glyph=d=>{try{if(typeof itemGlyph==='function')return itemGlyph(d);}catch{}return mk('span','item-glyph','◆');};
const tierOf=d=>Math.max(1,Math.min(5,d?.tier?.rank||1));
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const detail=x=>{try{return x.kind==='GEAR'||x.gear||x.equip?presenter().itemDetail({equip:x.ref||x.equip||x.gear?.equip,quantity:1,enhance:x.enhance??x.gear?.enhance??0}):presenter().itemDetail({item:x.ref||x.item,quantity:x.qty||1});}catch{return {name:x.label||x.name||'',tier:{rank:1}};}};
const GROUPS=['전체','재료','음식','소모품','장비'];
const groupOf=d=>d.kind==='EQUIPMENT'?'장비':d.group==='음식'?'음식':d.group==='소모품'?'소모품':'재료';
const moraIcon=()=>{const i=window.currencyIcon?.('MORA','tr-mora tr-mora-img');if(i)return i;try{return SHELL.icon('MORA','shell-icon tr-mora');}catch{return mk('span','tr-mora','◈');}};
const free=()=>{try{return !game.s.runtime&&(game.playPhase?.()||'FREE')==='FREE';}catch{return false;}};
// 0.15.2: buying, selling and live trades start at protagonist Lv.10 (runtime_trade.js; the server checks it too).
const lvWhy=()=>{try{return game.tradeLevelReason?.()||'';}catch{return '';}};
// ---------- tiles ----------
function tile(d,{count,badge,cls='',title,onClick,disabled}={}){
 const b=mk('button','tr-tile tier-'+tierOf(d)+' '+cls);b.type='button';b.title=title||d?.name||'';b.disabled=!!disabled;
 const art=mk('span','tr-art');art.append(glyph(d||{}));b.append(art);
 if(count!==undefined&&count!=='')b.append(mk('span','tr-count',count));if(badge)b.append(mk('span','tr-badge',badge));
 b.append(mk('span','tr-name',d?.name||''));if(onClick)b.onclick=onClick;return b;
}
function stepper(value,max,set){const box=mk('div','tr-stepper'),minus=btn('−',()=>set(value-1),'tr-step'),n=mk('input');n.type='number';n.min=1;n.max=max;n.value=value;n.setAttribute('aria-label','수량');n.onchange=()=>set(Math.floor(Number(n.value)||1));const plus=btn('+',()=>set(value+1),'tr-step');minus.disabled=value<=1;plus.disabled=value>=max;box.append(minus,n,plus);return box;}
// What may change hands from my bag (the server checks again).
function myEntries(){const P=presenter();if(!P||typeof game==='undefined'||!game)return [];return P.inventoryEntries(game.s).filter(d=>{const entry=d.kind==='EQUIPMENT'?game.s.inventory.find(i=>i.slot===d.key):d.id;return game.tradeRule?.(entry)?.ok;});}
const entryKey=d=>d.kind==='EQUIPMENT'?'slot:'+d.key:'item:'+d.id;
function bagGrid(entries,{onPick,picked,empty}){
 const wrap=mk('div','tr-bag'),cats=mk('div','tr-cats'),grid=mk('div','tr-grid');
 for(const g of GROUPS){const n=g==='전체'?entries.length:entries.filter(d=>groupOf(d)===g).length;if(!n&&g!=='전체')continue;cats.append(btn(g+' '+n,()=>{T.cat=g;redraw();},'tr-cat'+(T.cat===g?' active':'')));}
 const shown=entries.filter(d=>T.cat==='전체'||groupOf(d)===T.cat);
 if(!shown.length)grid.append(mk('p','trade-note',empty||'거래할 수 있는 물건이 없습니다. 모라·경험치 책·보스 재료·전용 무기·장착 중인 장비는 거래할 수 없습니다.'));
 for(const d of shown.slice(0,240)){const have=d.kind==='EQUIPMENT'?1:game.itemCount(d.id),p=picked?.(d);grid.append(tile(d,{count:d.kind==='EQUIPMENT'?'+'+(d.enhance||0):'×'+fmt(have),badge:p||'',cls:p?'in-tray':'',title:d.name+(d.kind==='EQUIPMENT'?'':' · 보유 '+have+'개'),onClick:()=>onPick(d)}));}
 wrap.append(cats,grid);
 // 0.15.1: what cannot change hands is listed apart, each with the reason (user: 「거래 가능이랑 거래 불가 템을 나눠서」).
 const bound=boundEntries();
 if(bound.length){const det=mk('details','tr-bound'),list=mk('ul','tr-bound-list');det.append(mk('summary','','거래할 수 없는 물건 '+bound.length+'종 · 이유 보기'));
  for(const {d,reason} of bound.slice(0,160)){const li=mk('li');li.append(SHELL.icon('LOCK','shell-icon'),mk('span','tr-bound-name',d.name+(d.kind==='EQUIPMENT'?' +'+(d.enhance||0):' ×'+fmt(d.quantity))),mk('small','',reason));list.append(li);}
  det.append(list);wrap.append(det);}
 return wrap;
}
function boundEntries(){const P=presenter();if(!P||typeof game==='undefined'||!game)return [];return P.inventoryEntries(game.s).map(d=>({d,r:window.bagTradeRule?.(d)})).filter(x=>x.r&&!x.r.ok).map(x=>({d:x.d,reason:x.r.reason}));}
// ---------- the window ----------
function build(){
 const wrap=mk('div','trade-overlay');wrap.hidden=true;wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','거래소');
 wrap.addEventListener('click',e=>{if(e.target===wrap)close();});wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}});
 const box=mk('div','trade-box'),head=mk('header','trade-head');head.append(SHELL.icon('TRADE','shell-icon trade-glyph'),mk('strong','','거래소'),mk('small','','상점에 올려 팔거나, 접속 중인 모험가와 직접 거래합니다'));
 const x=btn('',close,'trade-close');x.setAttribute('aria-label','거래소 닫기');x.append(SHELL.icon('CLOSE','shell-icon'));head.append(x);
 const tabs=mk('div','trade-tabs');for(const [id,label]of [['market','시장'],['shop','내 상점'],['direct','직접 거래']]){const b=btn(label,()=>{if(T.tab!==id)SND('page');T.tab=id;T.confirmBuy=null;redraw();load();},'trade-tab');b.dataset.tab=id;tabs.append(b);}
 const body=mk('div','trade-body');box.append(head,tabs,body);wrap.append(box);document.body.append(wrap);T.node=wrap;
}
function open(tab,opts={}){
 if(typeof game==='undefined'||!game)return;if(tab)T.tab=tab;window.CRPGProfile?.close?.();
 if(opts.seller!==undefined){T.filter.seller=opts.seller||'';T.filter.sellerName=opts.sellerName||'';}
 if(opts.pick){T.sell={key:opts.pick,qty:1,price:''};}
 clearTimeout(closeTimer);if(!T.node)build();T.node.hidden=false;requestAnimationFrame(()=>T.node?.classList.add('open'));SND('handbook_open');redraw();load();
}
let closeTimer=0;
function close(){if(!T.node)return;const n=T.node;n.classList.remove('open');clearTimeout(closeTimer);closeTimer=setTimeout(()=>{n.hidden=true;},180);SND('menu_close');}
T.open=open;T.close=close;T.isOpen=()=>!!T.node&&!T.node.hidden;
let loadFlight=null,loadSequence=0;
function load(refresh=false){
 if(!O.token)return Promise.resolve();
 const f=T.filter,qs=new URLSearchParams();if(f.q)qs.set('q',f.q);if(f.kind)qs.set('kind',f.kind);if(f.sort)qs.set('sort',f.sort);if(f.seller)qs.set('seller',f.seller);
 const key=T.tab+':'+qs,session=O.sessionStamp();
 if(!refresh&&loadFlight?.key===key&&O.sameSession(loadFlight.session))return loadFlight.promise;
 const sequence=++loadSequence,before=T.deal,flight={key,session};
 const current=()=>sequence===loadSequence&&O.sameSession(session);
 flight.promise=(async()=>{
  try{
   const [market,deal,online]=await Promise.all([O.request('/market'+(qs.toString()?'?'+qs:'')),O.request('/deal'),T.tab==='direct'?O.request('/online').catch(error=>({error})):null]);
   if(!current())return;
   T.market=market;T.enabled=true;T.error='';if(online){T.online=online.error?null:online.players;if(online.error)T.error=online.error.message;}
   // A newer stream event must not be rolled back by a slow market refresh.
   if(T.deal===before){T.deal=deal.deal;if(T.deal?.status==='OPEN'&&(!T.offer||before?.id!==T.deal.id)){resetOfferSync();T.offer=new Map((T.deal.me.items||[]).map(x=>[x.slot?'slot:'+x.slot:'item:'+x.item,{...x}]));}}
  }catch(e){if(!current())return;if(e.status===404)T.enabled=false;else T.error=e.message;}
  finally{if(loadFlight===flight)loadFlight=null;}
  if(current())redraw();
 })();loadFlight=flight;return flight.promise;
}
T.load=load;
function redraw(){
 if(!T.node||T.node.hidden)return;
 for(const b of T.node.querySelectorAll('.trade-tab')){b.classList.toggle('active',b.dataset.tab===T.tab);const n=b.dataset.tab==='shop'&&T.market?.wallet?.mora?' ●':'';b.textContent={market:'시장',shop:'내 상점',direct:'직접 거래'}[b.dataset.tab]+n;}
 const body=T.node.querySelector('.trade-body');body.replaceChildren();body.className='trade-body tab-'+T.tab;
 if(T.enabled===false){body.append(mk('p','trade-note','이 서버에서는 아직 거래소를 쓸 수 없습니다.'));return;}
 if(typeof game==='undefined'||!game){body.append(mk('p','trade-note','여정을 연 뒤 사용할 수 있습니다.'));return;}
 if(T.error)body.append(mk('p','trade-note warn',T.error));
 if(!free())body.append(mk('p','trade-note warn','이야기나 전투가 진행 중입니다. 사고팔기와 거래는 자유행동 중에만 할 수 있습니다.'));
 if(lvWhy())body.append(mk('p','trade-note warn',lvWhy()+' 시장 구경과 판매 대금 받기는 지금도 할 수 있습니다.'));
 ({market:drawMarket,shop:drawShop,direct:drawDirect})[T.tab]?.(body);
}
// ---------- 시장 ----------
function drawMarket(body){
 const f=T.filter,tools=mk('div','mk-tools');
 const s=mk('input','tr-search');s.type='search';s.placeholder='물건이나 상점 이름';s.value=f.q;s.onkeydown=e=>{if(e.key==='Enter'){f.q=s.value.trim();load();}};s.onchange=()=>{f.q=s.value.trim();load();};
 const kinds=mk('div','tr-cats');for(const [k,label]of [['','전체'],['ITEM','아이템'],['GEAR','장비']])kinds.append(btn(label,()=>{f.kind=k;load();},'tr-cat'+(f.kind===k?' active':'')));
 const sort=mk('select','mk-sort');sort.setAttribute('aria-label','정렬');for(const [k,label]of [['','최신순'],['price','개당 가격 낮은 순'],['expensive','비싼 순']]){const o=mk('option','',label);o.value=k;sort.append(o);}sort.value=f.sort;sort.onchange=()=>{f.sort=sort.value;load();};
 tools.append(s,kinds,sort);
 if(f.seller)tools.append(btn((f.sellerName||'모험가')+'의 상점 ✕',()=>{f.seller='';f.sellerName='';load();},'tr-cat active mk-seller'));
 body.append(tools);
 const list=T.market?.listings||[];
 if(!T.market){body.append(mk('p','trade-note','시장을 불러오는 중…'));return;}
 if(!list.length){body.append(mk('p','trade-note empty',f.q||f.kind||f.seller?'조건에 맞는 물건이 없습니다.':'아직 시장에 올라온 물건이 없습니다. 「내 상점」에서 먼저 올려 보세요.'));return;}
 const grid=mk('div','mk-grid'),money=Number(game.s.global.MORA)||0;
 for(const x of list){
  const d=detail(x),card=mk('article','mk-card tier-'+tierOf(d)+(x.mine?' mine':''));
  card.append(tile(d,{count:x.kind==='GEAR'?'+'+x.enhance:'×'+fmt(x.qty),title:x.label}));
  const info=mk('div','mk-info');info.append(mk('strong','mk-name',x.label));
  const price=mk('span','mk-price');price.append(moraIcon(),mk('b','',fmt(x.price)));if(x.qty>1)price.append(mk('small','',' · 개당 '+fmt(Math.ceil(x.price/x.qty))));info.append(price);
  const seller=mk('button','mk-seller-name',x.seller.name);seller.type='button';seller.title='모험가 정보 보기';seller.onclick=()=>window.CRPGProfile?.open(x.seller.pid,x.seller.name);info.append(seller);
  card.append(info);
  if(x.mine)card.append(mk('span','mk-mine','내 물건'));
  else{
   const asking=T.confirmBuy===x.id,b=btn(asking?fmt(x.price)+' 모라로 사기':'구매',()=>asking?buy(x):(T.confirmBuy=x.id,redraw()),asking?'primary mk-buy confirm':'mk-buy');
   const why=lvWhy()||(!free()?'자유행동 중에만 살 수 있습니다.':money<x.price?'모라가 부족합니다 · 보유 '+fmt(money):'');if(why){b.disabled=true;b.title=why;}
   card.append(b);if(asking)card.append(btn('취소',()=>{T.confirmBuy=null;redraw();},'mk-cancel'));
  }
  grid.append(card);
 }
 body.append(grid);if(T.market.total>list.length)body.append(mk('p','trade-note small','최근 '+list.length+'개를 보여 줍니다 · 검색으로 좁혀 보세요.'));
}
async function buy(x){
 if(T.busy)return;const session=O.sessionStamp();T.busy=true;T.confirmBuy=null;
 try{const out=await O.request('/market/buy',{id:x.id,price:x.price});SND('item_receive');say('구매 완료 · '+out.label+' · '+fmt(out.price)+' 모라');try{await O.sync();}catch{}}
 catch(e){if(!O.sameSession(session))return;say(e.message);SND('error');}finally{if(O.sameSession(session)){T.busy=false;load(true);}}
}
// ---------- 내 상점 ----------
function drawShop(body){
 const M=T.market,rules=M?.rules||{fee:.05,minPrice:10,maxPrice:9999999,maxListings:8},wallet=M?.wallet||{mora:0,sales:0};
 const purse=mk('section','mk-wallet'),purseInfo=mk('div','');purseInfo.append(mk('strong','','판매 대금'),mk('span','',fmt(wallet.mora)+' 모라 · 지금까지 '+fmt(wallet.sales)+'건 팔림'));
 const take=btn('받기',collect,'primary');if(!wallet.mora){take.disabled=true;take.title='받을 판매 대금이 없습니다.';}else if(!free()){take.disabled=true;take.title='자유행동 중에만 받을 수 있습니다.';}
 purse.append(moraIcon(),purseInfo,take);body.append(purse);
 const cols=mk('div','mk-shop');const left=mk('section','mk-sell'),right=mk('section','mk-mine-list');
 left.append(mk('h3','','상점에 올리기'),mk('p','trade-note small','물건을 고르고 수량과 값을 정하세요. 팔리면 값에서 수수료 '+Math.round(rules.fee*100)+'%를 뺀 모라가 판매 대금으로 쌓입니다. 한 번에 '+rules.maxListings+'개까지 올릴 수 있습니다.'));
 const entries=myEntries(),S=T.sell,picked=entries.find(d=>entryKey(d)===S.key);
 left.append(bagGrid(entries,{picked:d=>entryKey(d)===S.key?'✓':'',onPick:d=>{T.sell={key:entryKey(d),qty:d.kind==='EQUIPMENT'?1:Math.min(game.itemCount(d.id),T.sell.key===entryKey(d)?T.sell.qty:1),price:T.sell.key===entryKey(d)?T.sell.price:''};SND('tab');redraw();}}));
 if(picked){
  const form=mk('div','mk-form'),max=picked.kind==='EQUIPMENT'?1:game.itemCount(picked.id);form.append(tile(picked,{count:picked.kind==='EQUIPMENT'?'+'+(picked.enhance||0):''}));
  const fields=mk('div','mk-fields');fields.append(mk('strong','',picked.name));
  if(picked.kind!=='EQUIPMENT')fields.append(stepper(S.qty,max,n=>{S.qty=Math.max(1,Math.min(max,n));redraw();}));
  const price=mk('input','mk-price-input');price.type='number';price.inputMode='numeric';price.min=rules.minPrice;price.max=rules.maxPrice;price.placeholder='판매 가격 (모라, 묶음 전체)';price.value=S.price;price.setAttribute('aria-label','판매 가격');
  const preview=mk('small','mk-preview');const showPreview=()=>{const v=Math.floor(Number(price.value)||0),fee=v?Math.max(1,Math.ceil(v*rules.fee)):0;preview.textContent=v?'수수료 '+fmt(fee)+' 모라 · 팔리면 '+fmt(v-fee)+' 모라'+(S.qty>1?' · 개당 '+fmt(Math.ceil(v/S.qty)):''):rules.minPrice+'~'+fmt(rules.maxPrice)+' 모라';};
  price.oninput=()=>{S.price=price.value;showPreview();};showPreview();fields.append(price,preview);
  const go=btn('상점에 올리기',()=>sell(picked),'primary');const why=lvWhy()||(!free()?'자유행동 중에만 올릴 수 있습니다.':(M?.mine||[]).filter(x=>x.status==='ACTIVE').length>=rules.maxListings?'상점이 가득 찼습니다.':'');if(why){go.disabled=true;go.title=why;}
  fields.append(go);form.append(fields);left.append(form);
 }
 right.append(mk('h3','','내 상점'));const mine=M?.mine||[];
 if(!mine.length)right.append(mk('p','trade-note','아직 올린 물건이 없습니다.'));
 for(const x of mine){const d=detail(x),row=mk('div','mk-row '+x.status.toLowerCase());row.append(tile(d,{count:x.kind==='GEAR'?'+'+x.enhance:'×'+fmt(x.qty),title:x.label}));
  const info=mk('div','mk-info');info.append(mk('strong','',x.label));const p=mk('span','mk-price');p.append(moraIcon(),mk('b','',fmt(x.price)));info.append(p);
  info.append(mk('small','',x.status==='SOLD'?'판매됨 · 대금 '+fmt(x.price-x.fee)+' 모라':'판매 중 · 수수료 '+fmt(x.fee)+' 모라'));row.append(info);
  if(x.status==='ACTIVE'){const b=btn('내리기',()=>cancel(x));if(!free()){b.disabled=true;b.title='자유행동 중에만 내릴 수 있습니다.';}row.append(b);}
  right.append(row);}
 cols.append(left,right);body.append(cols);
}
async function sell(d){
 if(T.busy)return;const session=O.sessionStamp(),S=T.sell,price=Math.floor(Number(S.price)||0);if(!price){say('판매 가격을 입력해 주세요.');return;}
 T.busy=true;try{const entry=d.kind==='EQUIPMENT'?{slot:d.key}:{item:d.id,qty:S.qty};const out=await O.request('/market/sell',{entry,price});SND('commission_accept');say('상점에 올렸습니다 · '+out.listing.label+' · '+fmt(out.listing.price)+' 모라');T.sell={key:'',qty:1,price:''};try{await O.sync();}catch{}}
 catch(e){if(!O.sameSession(session))return;say(e.message);SND('error');}finally{if(O.sameSession(session)){T.busy=false;load(true);}}
}
async function cancel(x){if(T.busy)return;const session=O.sessionStamp();T.busy=true;try{const out=await O.request('/market/cancel',{id:x.id});say('상점에서 내렸습니다 · '+out.returned+'을(를) 가방으로 돌려받았습니다.');try{await O.sync();}catch{}}catch(e){if(!O.sameSession(session))return;say(e.message);SND('error');}finally{if(O.sameSession(session)){T.busy=false;load(true);}}}
async function collect(){if(T.busy)return;const session=O.sessionStamp();T.busy=true;try{const out=await O.request('/market/collect',{});SND('item_receive');say('판매 대금 '+fmt(out.mora)+' 모라를 받았습니다.');try{await O.sync();}catch{}}catch(e){if(!O.sameSession(session))return;say(e.message);SND('error');}finally{if(O.sameSession(session)){T.busy=false;load(true);}}}
// ---------- 직접 거래 ----------
function drawDirect(body){
 body.append(mk('p','trade-note','접속 중인 모험가와 그 자리에서 물건을 주고받습니다. 두 사람 모두 「확정」한 뒤 「거래하기」를 눌러야 바뀌고, 한쪽이 물건을 바꾸면 확정이 풀립니다. 모라·경험치 책·보스 재료·전용 무기·장착 중인 장비는 거래할 수 없습니다(모라는 시장을 이용하세요).'));
 if(T.deal){const c=mk('section','mk-deal-now');c.append(mk('strong','',T.deal.status==='INVITED'?(T.deal.inviter?T.deal.other.name+' 님의 수락을 기다리는 중':T.deal.other.name+' 님이 거래를 신청했습니다'):T.deal.other.name+' 님과 거래 중'));
  if(T.deal.status==='OPEN')c.append(btn('거래 창 열기',openDeal,'primary'));else if(!T.deal.inviter)c.append(btn('수락',()=>respond(true),'primary'),btn('거절',()=>respond(false)));else c.append(btn('신청 취소',cancelDeal));body.append(c);}
 body.append(mk('h3','','접속 중인 모험가'));const list=mk('div','mk-online');
 if(T.online===null||T.online===undefined)list.append(mk('p','trade-note','불러오는 중…'));
 else if(!T.online.length)list.append(mk('p','trade-note','지금 접속 중인 다른 모험가가 없습니다.'));
 for(const p of T.online||[]){const row=mk('div','mk-person'),name=mk('button','mk-person-name',p.name);name.type='button';name.onclick=()=>window.CRPGProfile?.open(p.pid,p.name);
  if(p.honours?.count&&window.CRPGProfile?.medal){const m=window.CRPGProfile.medal(p.honours.top,p.honours.top);m.removeAttribute('aria-hidden');m.title='나선 문장 '+p.honours.count+'개 · 최고 '+p.honours.top+'층';name.append(m);}
  const b=btn('거래 신청',()=>T.invite(p.pid,p.name),'primary');if(p.busy){b.disabled=true;b.title=p.name+' 님은 다른 거래 중입니다.';}else if(T.deal){b.disabled=true;b.title='이미 진행 중인 거래가 있습니다.';}else if(!free()){b.disabled=true;b.title='자유행동 중에만 거래할 수 있습니다.';}else if(lvWhy()){b.disabled=true;b.title=lvWhy();}
  row.append(name,b);list.append(row);}
 body.append(list,btn('새로 고침',load,'mk-refresh'));
}
T.invite=async function(pid,name){
 if(T.busy)return;const session=O.sessionStamp();T.busy=true;
 try{const out=await O.request('/deal/invite',{toPid:pid});T.deal=out.deal;SND('commission_accept');say((name||'상대')+' 님에게 직접 거래를 신청했습니다. 수락하면 거래 창이 열립니다.');}
 catch(e){if(!O.sameSession(session))return;say(e.message);SND('error');}finally{if(O.sameSession(session)){T.busy=false;redraw();}}
};
async function respond(accept){if(!T.deal||T.busy)return;const session=O.sessionStamp();T.busy=true;try{const out=await O.request('/deal/respond',{id:T.deal.id,accept});setDeal(out.deal);}catch(e){if(!O.sameSession(session))return;say(e.message);SND('error');}finally{if(O.sameSession(session)){T.busy=false;closeInvite();redraw();}}}
async function cancelDeal(){if(!T.deal||T.busy)return;const session=O.sessionStamp();T.busy=true;try{const out=await O.request('/deal/cancel',{id:T.deal.id});setDeal(out.deal);}catch(e){if(!O.sameSession(session))return;say(e.message);}finally{if(O.sameSession(session)){T.busy=false;redraw();}}}
// ---------- the live trade window ----------
function setDeal(d){
 const before=T.deal;T.deal=d&&['INVITED','OPEN'].includes(d.status)?d:null;
 if(!d)return;
 if(d.status==='OPEN'){if(!T.offer||before?.id!==d.id){resetOfferSync();T.offer=new Map((d.me.items||[]).map(x=>[x.slot?'slot:'+x.slot:'item:'+x.item,{...x}]));}openDeal();drawDeal();}
 else if(d.status==='INVITED'){if(!d.inviter)showInvite(d);}
 else{resetOfferSync();closeDeal();closeInvite();T.offer=null;if(d.status==='DONE')SND('item_receive');say(d.note||({DONE:'거래가 끝났습니다.',DECLINED:'거래가 거절되었습니다.',CANCELLED:'거래가 닫혔습니다.',EXPIRED:'시간이 지나 거래가 닫혔습니다.'}[d.status]||''));}
 redraw();
}
function showInvite(d){
 closeInvite();const n=mk('div','deal-invite');n.setAttribute('role','alertdialog');n.setAttribute('aria-label','직접 거래 신청');
 n.append(mk('strong','',d.other.name+' 님이 직접 거래를 신청했습니다'),mk('small','','1분 안에 답하지 않으면 닫힙니다.'));
 const row=mk('div','deal-invite-actions');row.append(btn('수락',()=>respond(true),'primary'),btn('거절',()=>respond(false)),btn('정보',()=>window.CRPGProfile?.open(d.other.pid,d.other.name)));n.append(row);
 document.body.append(n);T.inviteNode=n;SND('notice');setTimeout(()=>{if(T.inviteNode===n)closeInvite();},62000);
}
function closeInvite(){T.inviteNode?.remove();T.inviteNode=null;}
function openDeal(){
 if(T.dealNode){drawDeal();return;}
 const wrap=mk('div','deal-overlay');wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','직접 거래');
 wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();}});
 const box=mk('div','deal-box');wrap.append(box);document.body.append(wrap);T.dealNode=wrap;requestAnimationFrame(()=>wrap.classList.add('open'));drawDeal();
}
function closeDeal(){if(!T.dealNode)return;const n=T.dealNode;T.dealNode=null;n.classList.remove('open');setTimeout(()=>n.remove(),160);}
// Keep one offer write in flight. A lock waits for every displayed edit to be acknowledged.
let pushTimer=0,offerFlight=null,offerNext=null,offerEpoch=0,offerIssue='';
function resetOfferSync(){clearTimeout(pushTimer);pushTimer=0;offerEpoch++;offerNext=null;offerFlight=null;offerIssue='';}
const offerPending=()=>!!(pushTimer||offerFlight||offerNext||offerIssue);
function pushOffer(){
 if(!T.deal||T.deal.status!=='OPEN'||!T.offer)return;
 offerNext={id:T.deal.id,items:[...T.offer.values()].map(x=>x.slot?{slot:x.slot}:{item:x.item,qty:x.qty}),session:O.sessionStamp(),epoch:offerEpoch};
 offerIssue='';clearTimeout(pushTimer);pushTimer=setTimeout(()=>{pushTimer=0;flushOffer();},350);drawDeal();
}
async function flushOffer(){
 clearTimeout(pushTimer);pushTimer=0;
 if(offerFlight){const ok=await offerFlight;if(!ok)return false;return offerFlight||offerNext?flushOffer():true;}
 const next=offerNext;if(!next)return !offerIssue;
 if(next.epoch!==offerEpoch||!O.sameSession(next.session)||T.deal?.id!==next.id){offerNext=null;return false;}
 offerNext=null;
 const current=()=>next.epoch===offerEpoch&&O.sameSession(next.session)&&T.deal?.id===next.id&&T.deal.status==='OPEN';
 const flight=(async()=>{
  try{const out=await O.request('/deal/update',{id:next.id,items:next.items});if(!current())return false;if(!T.deal.updated||out.deal.updated>=T.deal.updated)T.deal=out.deal;offerIssue='';return true;}
  catch(e){if(current()){offerNext??=next;offerIssue=e.message;say(e.message);SND('error');}return false;}
  finally{if(offerFlight===flight)offerFlight=null;if(current())drawDeal();}
 })();offerFlight=flight;const ok=await flight;
 return ok&&offerNext?flushOffer():ok;
}
async function toggleDealLock(d){
 if(T.busy||T.deal?.id!==d.id)return;const session=O.sessionStamp();T.busy=true;drawDeal();
 try{if(!d.me.locked&&!await flushOffer())return;if(!O.sameSession(session)||T.deal?.id!==d.id)return;
  const out=await O.request('/deal/lock',{id:d.id,locked:!d.me.locked});if(T.deal?.id===d.id&&(!T.deal.updated||out.deal.updated>=T.deal.updated))T.deal=out.deal;
 }catch(e){if(O.sameSession(session))say(e.message);}
 finally{if(O.sameSession(session)){T.busy=false;drawDeal();}}
}
async function confirmDeal(d){
 if(T.busy||offerPending()||T.deal?.id!==d.id)return;const session=O.sessionStamp();T.busy=true;drawDeal();
 try{const out=await O.request('/deal/confirm',{id:d.id});if(out.deal.status==='DONE'){setDeal(out.deal);try{await O.sync();}catch{}}
  else if(T.deal?.id===d.id){T.deal=out.deal;drawDeal();}
 }catch(e){if(!O.sameSession(session))return;say(e.message);SND('error');try{const out=await O.request('/deal');if(T.deal?.id===d.id)setDeal(out.deal);}catch{}}
 finally{if(O.sameSession(session)){T.busy=false;drawDeal();}}
}
function drawDeal(){
 if(!T.dealNode||!T.deal)return;const d=T.deal,box=T.dealNode.querySelector('.deal-box');box.replaceChildren();
 const head=mk('header','deal-head');head.append(mk('strong','','직접 거래 · '+d.other.name),mk('small','',d.note||'두 사람 모두 확정하고 「거래하기」를 누르면 바뀝니다.'));
 const x=btn('거래 닫기',cancelDeal,'deal-close');head.append(x);box.append(head);
 const side=(title,items,locked,confirmed,editable)=>{const s=mk('section','deal-side'+(locked?' locked':''));const h=mk('div','deal-side-head');h.append(mk('strong','',title),mk('span','deal-state '+(confirmed?'ok':locked?'lock':''),confirmed?'거래하기 누름':locked?'확정함':'고르는 중'));s.append(h);
  const list=mk('div','deal-items');if(!items.length)list.append(mk('p','trade-note',editable?'아래 가방에서 물건을 눌러 올리세요.':'아직 올린 물건이 없습니다.'));
  for(const it of items){const dd=detail(it),row=mk('div','deal-item');row.append(tile(dd,{count:it.kind==='GEAR'?'+'+(it.enhance||0):'×'+fmt(it.qty),title:it.label}));
   if(editable){const info=mk('div','deal-item-info');info.append(mk('span','',dd.name||it.label));const key=it.slot?'slot:'+it.slot:'item:'+it.item,cur=T.offer.get(key);
    if(!it.slot&&cur){const max=game.itemCount(it.item);info.append(stepper(cur.qty,max,n=>{cur.qty=Math.max(1,Math.min(max,n));pushOffer();}));}
    row.append(info,btn('×',()=>{T.offer.delete(key);pushOffer();},'tr-x'));}
   list.append(row);}
  s.append(list);return s;};
 const mineShown=[...T.offer.values()];
 const cols=mk('div','deal-cols');cols.append(side('내가 줄 것',mineShown,d.me.locked,d.me.confirmed,!d.me.locked&&!T.busy),side(d.other.name+' 님이 줄 것',d.other.items,d.other.locked,d.other.confirmed,false));box.append(cols);
 if(!d.me.locked&&!T.busy)box.append(bagGrid(myEntries(),{picked:x=>T.offer.get(entryKey(x))?(x.kind==='EQUIPMENT'?'✓':String(T.offer.get(entryKey(x)).qty)):'',onPick:x=>{const key=entryKey(x);if(x.kind==='EQUIPMENT'){if(T.offer.has(key))T.offer.delete(key);else if(T.offer.size<6)T.offer.set(key,{slot:x.key,kind:'GEAR',ref:x.equip||x.id,enhance:x.enhance||0,qty:1,label:x.name});}else{const cur=T.offer.get(key),have=game.itemCount(x.id);if(cur)cur.qty=Math.min(have,cur.qty+1);else if(T.offer.size<6)T.offer.set(key,{item:x.id,kind:'ITEM',ref:x.id,qty:1,label:x.name});}SND('tab');pushOffer();}}));
 const foot=mk('div','deal-foot');
 const lock=btn(d.me.locked?'확정 풀기':T.busy?'확인 중…':'확정',()=>toggleDealLock(d),d.me.locked?'':'primary');lock.disabled=T.busy;
 const both=d.me.locked&&d.other.locked,go=btn(d.me.confirmed?'상대를 기다리는 중…':'거래하기',()=>confirmDeal(d),'primary deal-go');
 if(offerPending()||T.busy){go.disabled=true;go.title='올린 물건을 서버에서 확인하고 있습니다. 확정을 눌러 다시 확인할 수 있습니다.';}else if(!both){go.disabled=true;go.title='두 사람 모두 확정해야 거래할 수 있습니다.';}else if(d.me.confirmed){go.disabled=true;go.title='상대가 「거래하기」를 누르면 끝납니다.';}
 foot.append(lock,go);box.append(foot);
}
// ---------- server news ----------
window.CRPGChat?.on?.(async ev=>{
 if(ev?.type==='deal'){const d=ev.deal;if(ev.sync&&d.status==='DONE'){setDeal(d);if(!busy&&!O.pending){try{await O.sync();}catch{}}return;}setDeal(d);return;}
 if(ev?.type==='market'){if(ev.status==='SOLD'&&ev.label){SND('item_receive');say('상점의 '+ev.label+'이(가) 팔렸습니다 · 판매 대금 '+fmt(ev.gain)+' 모라 (거래소 · 내 상점에서 받기)');}
  if(T.isOpen()){clearTimeout(T.reloadTimer);T.reloadTimer=setTimeout(()=>load(true),400);}}
});
SHELL.extraTiles.push({icon:'TRADE',label:'거래소',key:'',show:()=>T.enabled!==false&&!!O.token,run:()=>open()});
// 0.15.1: the bag marks what cannot change hands (a lock on the tile, with the reason) and can show either kind alone.
window.bagTradeRule=d=>{try{const entry=d.kind==='EQUIPMENT'?game.s.inventory.find(i=>i.slot===d.key):d.id;return game.tradeRule?.(entry||d.id)||null;}catch{return null;}};
window.bagTradeMark=(b,d)=>{const r=window.bagTradeRule(d);if(!r||r.ok)return;const lock=mk('span','item-bound');lock.title='거래 불가 · '+r.reason;lock.setAttribute('aria-label','거래 불가');lock.append(SHELL.icon('LOCK','shell-icon'));b.append(lock);b.title=(b.title?b.title+' · ':'')+'거래 불가';};
// The bag says whether the selected item can change hands, and sends it to the shop or the open trade in one press.
if(typeof itemDetailView==='function'){const prior=itemDetailView;itemDetailView=function(box,d){prior(box,d);try{
 const entry=d.kind==='EQUIPMENT'?game.s.inventory.find(i=>i.slot===d.key):d.id,rule=game.tradeRule?.(entry||d.id);if(!rule)return;
 box.append(mk('p','trade-rule '+(rule.ok?'ok':'bound'),rule.ok?'거래 가능':'거래 불가 · '+rule.reason));
 if(rule.ok&&O.token&&T.enabled!==false){box.append(btn('상점에 올리기',()=>open('shop',{pick:entryKey(d)}),'trade-bag-add'));
  if(T.deal?.status==='OPEN'&&!T.deal.me.locked)box.append(btn('거래 창에 올리기',()=>{const key=entryKey(d);if(!T.offer.has(key))T.offer.set(key,d.kind==='EQUIPMENT'?{slot:d.key,kind:'GEAR',ref:d.equip||d.id,enhance:d.enhance||0,qty:1,label:d.name}:{item:d.id,kind:'ITEM',ref:d.id,qty:1,label:d.name});openDeal();pushOffer();},'trade-bag-add'));}
}catch{}};}
// A trade that was open when the page reloaded comes back; everything is forgotten on logout.
if(typeof render==='function'){const prior=render;render=function(){prior();try{
 if(!O.token){resetOfferSync();clearTimeout(closeTimer);clearTimeout(T.reloadTimer);loadSequence++;loadFlight=null;if(T.node){T.node.remove();T.node=null;}closeDeal();closeInvite();Object.assign(T,{market:null,online:null,deal:null,enabled:null,offer:null,busy:false,probing:false,error:''});return;}
 if(T.enabled===null&&!T.probing&&window.CRPGChat?.enabled===true){const session=O.sessionStamp();T.probing=true;O.request('/deal').then(out=>{T.enabled=true;if(out.deal)setDeal(out.deal);}).catch(e=>{if(O.sameSession(session)&&e.status===404)T.enabled=false;}).finally(()=>{if(O.sameSession(session))T.probing=false;});}
}catch{}};}
})();
