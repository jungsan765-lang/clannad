/* Item-grid shopping and exact-instance selling share the inventory presentation. */
let marketMode='BUY',marketCategory='전체',marketSelection=null,marketPlace=null,marketAvailable=false,marketOwner='PLAYER_CUSTOM';
function marketItems(){
 if(marketMode==='BUY')return game.placeStocks().filter(s=>!/SYSTEM_DISABLED|사용 금지|레거시/.test(s.row[8]||'')).map(s=>({key:s.row[0],stock:s,d:shopStockDetail(s.row),group:shopStockGroup(s.row),groups:shopStockGroups(s.row),reason:s.reason,quantity:s.remaining,price:Number(s.row[5])}));
 const entries=[];
 for(const inv of game.s.inventory.filter(i=>i.equip||i.item&&i.quantity>0)){
  const special=inv.item?game.s.specialFoodLots?.[inv.item]?.BARBARA_SPECIAL||0:0;
  for(const [variant,quantity]of inv.equip?[['NORMAL',1]]:[['NORMAL',inv.quantity-special],['BARBARA_SPECIAL',special]]){
   if(quantity<=0)continue;const args={slot:inv.slot,quantity:1,variant,instanceRevision:inv.instanceRevision||0},d=itemPresenter.itemDetail(inv,{quantity,variant:variant==='NORMAL'?undefined:variant});
   const groups=inv.equip?shopStockGroups(['','','EQUIP',inv.equip]):[d.group];entries.push({key:inv.slot+':'+variant,inv,args,d,group:groups[0],groups,quantity,price:game.saleUnitPrice(inv),reason:game.actionReason('SELL',args)});
  }
 }return entries;
}
function marketComparison(box,id){
 const members=game.ownedActors().filter(x=>x.active);if(!members.some(x=>x.id===marketOwner))marketOwner='PLAYER_CUSTOM';
 const label=el('label','market-compare-label','장착할 인물과 비교'),select=el('select');select.setAttribute('aria-label','장비 비교 대상');
 for(const m of members){const opt=el('option','',ownerName(m.id));opt.value=m.id;select.append(opt);}select.value=marketOwner;label.append(select);box.append(label);const values=el('div','market-comparison');box.append(values);
 const refresh=()=>{values.replaceChildren();const preview=game.shopEquipmentPreview(id,marketOwner);if(preview.after){const table=el('dl','item-detail-fields');for(const [key,name]of [['atk','공격력'],['def','방어력'],['maxHp','최대 HP'],['crit','치명타 확률'],['spd','속도']]){const before=preview.before[key],after=preview.after[key],delta=after-before;table.append(el('dt','',name),el('dd',delta>0?'stat-up':delta<0?'stat-down':'',before+' → '+after+(delta?' ('+(delta>0?'+':'')+Math.round(delta*100)/100+')':'')));}values.append(table);}if(preview.reason)values.append(el('p','market-restriction',preview.reason));};
 select.onchange=()=>{marketOwner=select.value;refresh();};refresh();
}
function showSaleQuantity(entry){
 const box=el('div','purchase-quantity'),label=el('label','','판매 수량'),input=el('input');input.type='number';input.min='1';input.max=String(Math.min(999,entry.quantity));input.value='1';input.step='1';input.setAttribute('aria-label','판매 수량');label.append(input);
 const total=el('p','purchase-total'),reason=el('p','market-restriction');reason.setAttribute('role','status');
 const confirm=button('선택한 수량 판매',()=>{const args={...entry.args,quantity:Number(input.value)};if(game.actionReason('SELL',args))return;document.getElementById('modal').close();act('SELL',args);},false,true);
 const refresh=()=>{const quantity=Number(input.value),why=game.actionReason('SELL',{...entry.args,quantity});total.textContent='받는 금액 · '+(Number.isSafeInteger(quantity)&&quantity>0?(quantity*entry.price).toLocaleString():'—')+' 모라';reason.textContent=why;confirm.disabled=busy||!!why;};input.oninput=refresh;refresh();box.append(label,total,reason,confirm);showModal(entry.d.name+' · 판매',box);input.focus();
}
function marketDetail(box,entry){
 const {d,stock,reason}=entry;box.append(el('small','',d?.category||entry.group),el('h2','',d?.name||stock?.row[4]));if(d){box.append(itemGlyph(d));if(d.rarity)box.append(el('p','muted',d.rarity));if(d.description)box.append(el('p','',d.description));if(d.effect)box.append(el('p','item-effect',d.effect));
  if(d.stats.length){const stats=el('dl','item-detail-fields');for(const s of d.stats)stats.append(el('dt','',s.label),el('dd','',s.value+s.unit));box.append(stats);}
  if(d.questLabel)box.append(el('p','', '관련 임무 · '+d.questLabel));
  if(d.minimumLevel)box.append(el('p',game.s.global.PLAYER_LEVEL_STATE<d.minimumLevel?'market-restriction':'muted','장착 Lv. '+d.minimumLevel+' 이상'));
 }
 box.append(el('p','market-price',(marketMode==='BUY'?'구매가 ':'판매가 ')+entry.price.toLocaleString()+' 모라'),el('p','muted',(marketMode==='BUY'?'남은 재고 ':'보유 수량 ')+(entry.quantity===Infinity?'상시':entry.quantity+'개')));
 if(stock){const min=String(stock.row[8]).match(/LEVEL>=(\d+)/)?.[1];if(min)box.append(el('p',game.s.global.PLAYER_LEVEL_STATE<Number(min)?'market-restriction':'muted','Lv. '+min+' 이상 구매 가능'));}
 if(reason)box.append(el('p','market-restriction',reason));const controls=el('div','row market-controls');
 if(stock){const one=actionButton('1개 구매','BUY',{stock:stock.row[0],quantity:1},true);one.disabled=one.disabled||!!reason;controls.append(one);if(['ITEM','EQUIP'].includes(stock.row[2])){const why=game.stockReason(stock.row,2),multi=button('여러 개 구매',()=>showPurchaseQuantity(stock.row[0]),busy||!!why);multi.title=why;controls.append(multi);}}
 else{controls.append(actionButton('1개 판매','SELL',entry.args,true));if(!entry.inv.equip&&entry.quantity>1)controls.append(button('여러 개 판매',()=>showSaleQuantity(entry),busy||!!reason));}
 box.append(controls);if(stock?.row[2]==='EQUIP')marketComparison(box,stock.row[3]);if(d&&d.kind!=='EQUIPMENT')appendItemUses(box,d);
}
const marketOldShop=shop;
shop=function(p,v){
 const visit=game.currentPlace();if(!visit?.valid||isInn(visit.entry)){marketOldShop(p,v);return;}
 const entry=placeHeader(p,'SHOP');if(!entry)return;
 if(presenterDB!==game.db){itemPresenter=CRPGInventoryPresenter.create(game.db,MANIFEST);presenterDB=game.db;}
 if(marketPlace!==entry.id){marketPlace=entry.id;marketMode='BUY';marketCategory='전체';marketSelection=null;marketAvailable=false;}
 const tabs=el('div','row market-tabs');for(const [mode,title]of [['BUY','구매'],['SELL','판매']]){const b=button(title,()=>{marketMode=mode;marketCategory='전체';marketSelection=null;render();});b.classList.toggle('selected',marketMode===mode);b.setAttribute('aria-pressed',String(marketMode===mode));tabs.append(b);}tabs.append(el('strong','shop-balance','보유 '+Number(game.s.global.MORA).toLocaleString()+' 모라'));p.append(tabs);
 const all=marketItems(),filter=el('div','market-filter');if(marketMode==='BUY'){const label=el('label','row'),check=el('input');check.type='checkbox';check.checked=marketAvailable;check.onchange=()=>{marketAvailable=check.checked;marketSelection=null;render();};label.append(check,el('span','','지금 구매 가능한 상품만'));filter.append(label);}
 const preferred=['기본 무기','한손검','양손검','장병기','활','법구','방어구','장신구','특수','단조 무기','제작 재료','음식','소모품','제작법','기타','장비','재료','퀘스트/핵심'],entryGroups=e=>e.groups?.length?e.groups:[e.group],present=new Set(all.flatMap(entryGroups)),categories=['전체',...preferred.filter(x=>present.has(x)),...[...present].filter(x=>!preferred.includes(x))];if(!categories.includes(marketCategory))marketCategory='전체';for(const category of categories){const count=category==='전체'?all.length:all.filter(e=>entryGroups(e).includes(category)).length,b=button(category+' · '+count,()=>{marketCategory=category;marketSelection=null;render();});b.dataset.marketCategory=category;b.classList.toggle('selected',category===marketCategory);filter.append(b);}p.append(filter);
 const entries=all.filter(e=>(marketCategory==='전체'||entryGroups(e).includes(marketCategory))&&!(marketMode==='BUY'&&marketAvailable&&e.reason)).sort((a,b)=>Number(!!a.reason)-Number(!!b.reason)||a.price-b.price);
 if(!entries.some(e=>e.key===marketSelection))marketSelection=entries[0]?.key||null;
 p.append(el('p','muted',marketMode==='BUY'?'상품을 선택하면 효과와 장착 후 능력치를 비교할 수 있습니다.':'장착·준비 중인 장비와 임무 핵심 물품은 판매할 수 없습니다.'));
 const layout=el('div','market-layout'),grid=el('div','market-grid'),detail=el('section','card market-detail');
 for(const e of entries){const b=button('',()=>{marketSelection=e.key;render();});b.className='market-item'+(e.key===marketSelection?' selected':'')+(e.reason?' unavailable':'');b.dataset.marketKey=e.key;b.setAttribute('aria-pressed',String(e.key===marketSelection));b.setAttribute('aria-label',(e.d?.name||e.stock?.row[4])+' 상세');if(e.d)b.append(itemGlyph(e.d));b.append(el('strong','',e.d?.name||e.stock?.row[4]),el('span','',e.price.toLocaleString()+' 모라'));if(e.reason)b.append(el('small','market-restriction',e.reason));grid.append(b);}
 const selected=entries.find(e=>e.key===marketSelection);if(selected)marketDetail(detail,selected);else detail.append(el('p','empty',marketMode==='BUY'?'이 조건에 맞는 상품이 없습니다.':'판매할 소지품이 없습니다.'));layout.append(grid,detail);p.append(layout);contactStories(p);discoveryCards(p);
};
const marketReceivedLoot=receivedLoot;
receivedLoot=function(before,type){
 if(type==='SELL'&&lastResult?.ok){const sale=lastResult.result;return {title:'판매 완료',entries:[],levelUps:[],bonds:[],mora:sale.mora,sale,receipt:game.s.global.LAST_COMMITTED_ACTION_ID};}
 return marketReceivedLoot(before,['WORLD_WORK_FINISH','WORLD_WORK_START'].includes(type)?'CRAFT':type);
};
const marketShowReceivedLoot=showReceivedLoot;
showReceivedLoot=function(loot){if(!loot?.sale){marketShowReceivedLoot(loot);return;}const box=el('div','loot-summary'),sale=loot.sale;box.append(el('p','purchase-receipt',sale.name+' '+sale.quantity+'개 판매 완료'),el('strong','market-price','+'+sale.mora.toLocaleString()+' 모라'));showModal('판매 완료',box);};
