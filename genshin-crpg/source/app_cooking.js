/* v0.14.0 cooking hall: dishes grouped by cuisine, effect filters, ingredient readiness and where to find what is missing. */
(function(){
'use strict';
const TABS=[['ALL','전체'],['MOND','몬드 요리'],['LIYUE','리월 요리'],['FOREIGN','이국 요리'],['PROCESS','재료 손질']];
const EFFECTS=[['ALL','모든 효과'],['HEAL','회복'],['ATK','공격'],['CRIT','치명타'],['DEF','방어'],['SPEED','속도'],['RESIST','상태 저항']];
const STATUS_KIND={STATUS_FOOD_ATK:'ATK',STATUS_FOOD_FEAST:'ATK',STATUS_FOOD_CRIT:'CRIT',STATUS_FOOD_DEF:'DEF',STATUS_FOOD_SPEED:'SPEED',STATUS_FOOD_RESIST:'RESIST'};
const EFFECT_LABEL={HEAL:'회복',ATK:'공격',CRIT:'치명타',DEF:'방어',SPEED:'속도',RESIST:'상태 저항',PROCESS:'재료'};
const STARS={일반:1,고급:2,희귀:3,전설:4};
const LIFE={GATHER:'채집',MINE:'채광',FISH:'낚시',HUNT:'사냥'};
const REACHABLE=new Set(['몬드','리월','각 지역']);
const view={tab:'ALL',effect:'ALL',ready:false};
let sourceCache=null;
const clean=text=>String(text||'').replace(/\(시스템\)/g,'').replace(/\s*·\s*CRPG[^·]*$/,'').trim();
// "사라 · 디어 헌터 식당" reads better as "디어 헌터 식당(사라)".
const shopName=m=>{const name=clean(m?.[1]||'상점'),parts=name.split(' · ');return parts.length===2&&!/상인|상점|식당|당$/.test(parts[0])?parts[1]+'('+parts[0]+')':name;};

function kitchenRecipes(){
  const list=game.placeRecipes?.()||[];
  if(!list.length||!list.every(x=>['요리','식재료 가공'].includes(x.row[1])))return null;
  return list.filter(x=>!/사용 금지|레거시/.test(x.row[18]||''));
}
// Where each ingredient comes from in regions the player can actually reach.
function sources(){
  if(sourceCache&&sourceCache.db===game.db)return sourceCache.map;
  // id -> {구입:[...], 채집:[...], 낚시:[...], ..., 손질:true}
  const map=new Map(),add=(id,key,text)=>{if(!map.has(id))map.set(id,{});const entry=map.get(id),list=entry[key]||(entry[key]=[]);if(!list.includes(text))list.push(text);};
  const merchants=new Map(game.rows('18_MERCHANT_DB').map(m=>[m[0],m]));
  for(const s of game.rows('19_SHOP_STOCK_DB')){
    const m=merchants.get(s[1]);if(s[2]!=='ITEM'||!m||!REACHABLE.has(m[2])||/SYSTEM_DISABLED/.test(String(s[8]||'')))continue;
    add(s[3],'구입',shopName(m));
  }
  for(const m of game.rows('32_MAP_DB')){
    if(!['몬드','리월'].includes(m[1]))continue;const kind=game.lifeKindAt?.(m[0]);if(!kind)continue;
    for(const x of game.lifePool?.(kind,m[0])||[])add(x.item,LIFE[kind],m[2]);
  }
  for(const r of game.rows('17_RECIPE_DB'))if(r[1]==='식재료 가공')add(r[3],'손질','조리시설');
  sourceCache={db:game.db,map};return map;
}
function whereText(id){
  const entry=sources().get(id);if(!entry)return '아직 구할 곳을 모릅니다';
  const parts=[];for(const key of ['구입','채집','사냥','낚시','채광'])if(entry[key])parts.push(key+': '+entry[key].slice(0,3).join(', ')+(entry[key].length>3?' 외':''));
  if(entry['손질'])parts.push('조리시설에서 손질해 만들 수 있음');return parts.join(' / ');
}
function recipeSeller(row){
  const merchants=new Map(game.rows('18_MERCHANT_DB').map(m=>[m[0],m]));
  const stocks=game.rows('19_SHOP_STOCK_DB').filter(s=>s[2]==='RECIPE'&&s[3]===row[0]);
  const reachable=stocks.find(s=>REACHABLE.has(merchants.get(s[1])?.[2]))||stocks[0];
  if(!reachable)return null;
  return {name:shopName(merchants.get(reachable[1])),price:Number(reachable[5]||0)};
}
function dishInfo(x){
  const r=x.row,item=game.tables['14_ITEM_DB'].get(r[3])||[],region=String(item[20]||'');
  const tab=r[1]==='식재료 가공'||item[2]==='낚시 도구'?'PROCESS':region==='리월'?'LIYUE':['몬드','전 지역','공용'].includes(region)?'MOND':'FOREIGN';
  const heal=Number(item[8]||0),status=item[9]||'';
  const effect=tab==='PROCESS'?'PROCESS':status?STATUS_KIND[status]||'ATK':heal?'HEAL':'PROCESS';
  let cost=null,missing='';try{cost=game.recipeCost(r,1);missing=Object.entries(cost.items).filter(([id,n])=>game.itemCount(id)<n).map(([id])=>id).join(',');}catch(e){missing='?';}
  const locked=/제작법을 먼저 구매/.test(x.reason||'');
  const canMake=cost?Math.min(...Object.entries(cost.items).map(([id,n])=>Math.floor(game.itemCount(id)/n)),game.s.global.MORA>=cost.mora?99:0):0;
  return {x,r,item,tab,effect,heal,status,cost,missing:missing?missing.split(','):[],locked,ready:!x.reason&&canMake>0,canMake,stars:STARS[item[3]]||1,region};
}
function effectLine(d){
  if(d.tab==='PROCESS')return d.item[2]==='낚시 도구'?'낚시에 쓰는 미끼':'다른 요리에 쓰는 재료';
  if(d.heal&&!d.status)return 'HP '+game.foodHealingAmount(d.heal)+' 회복 · 주인공 기준';
  const text=String(d.item[7]||'').replace(/^지정 캐릭터\s*/,'');
  return (d.heal?'HP '+game.foodHealingAmount(d.heal)+' 회복 · 주인공 기준 · ':'')+text;
}
function chip(id,need){
  const have=game.itemCount(id),box=el('span','cook-chip'+(have>=need?' ok':' short'));
  const icon=itemPresenter.itemDetail({item:id,quantity:1}).icon;
  if(icon?.url){const img=el('img','cook-chip-icon');img.src=icon.url;img.alt='';box.append(img);}
  box.append(tierMark(el('span','cook-chip-name',safeName('14_ITEM_DB',id)),id),el('span','cook-chip-count',have+'/'+need));return box;
}
function card(d){
  const c=el('section','cook-card'+(d.ready?' ready':'')+(d.locked?' locked':''));c.dataset.recipeId=d.r[0];c.dataset.effect=d.effect;
  const head=el('div','cook-head'),detail=itemPresenter.itemDetail({item:d.r[3],quantity:1});head.append(itemGlyph(detail));
  const title=el('div','cook-title');title.append(tierMark(el('h3','',detail.name||safeName('14_ITEM_DB',d.r[3])),detail),el('span','cook-stars','★'.repeat(d.stars)));
  head.append(title,el('span','cook-badge effect-'+d.effect.toLowerCase(),EFFECT_LABEL[d.effect]||''));c.append(head);
  if(d.item[5])c.append(el('p','cook-desc',d.item[5]));
  c.append(el('p','cook-effect',effectLine(d)));
  const chips=el('div','cook-chips');for(const [id,n]of Object.entries(d.cost?.items||{}))chips.append(chip(id,n));c.append(chips);
  if(d.missing.length&&!d.locked){
    const where=el('div','cook-where');
    for(const id of d.missing)where.append(el('p','',safeName('14_ITEM_DB',id)+' — '+whereText(id)));
    c.append(where);
  }
  if(d.locked){const seller=recipeSeller(d.r);c.append(el('p','cook-lock',seller?'레시피 필요 · '+seller.name+'에서 '+seller.price.toLocaleString()+'모라':'레시피를 먼저 배워야 합니다.'));}
  else if(d.x.reason&&!/재료|모라/.test(d.x.reason))c.append(el('p','choice-note',d.x.reason));
  const foot=el('div','cook-foot');foot.append(el('small','muted','조리 시간 '+d.r[19]));
  const one=actionButton(d.tab==='PROCESS'?'손질하기':'요리하기','CRAFT',{recipe:d.r[0]},d.ready);one.disabled=one.disabled||!d.ready;foot.append(one);
  const many=Math.min(5,d.canMake);if(d.ready&&many>1){const more=actionButton(many+'개 한 번에','CRAFT',{recipe:d.r[0],quantity:many});foot.append(more);}
  c.append(foot);return c;
}
function renderKitchen(p,recipes){
  const entry=placeHeader(p,'CRAFT');if(!entry)return;
  if(presenterDB!==game.db){itemPresenter=CRPGInventoryPresenter.create(game.db,MANIFEST);presenterDB=game.db;}
  const list=recipes.map(dishInfo),made=list.filter(d=>d.ready).length,learned=list.filter(d=>!d.locked).length;
  const hero=el('section','cook-hero');hero.append(el('h2','','오늘은 무엇을 만들까요?'),el('p','muted','재료를 모아 요리하고, 몬드의 디어 헌터 식당이나 리월의 만민당에서 새 레시피를 배울 수 있습니다. 요리는 만든다고 바로 먹지 않고 가방에 보관됩니다.'));
  const stats=el('div','cook-stats');stats.append(el('span','','지금 만들 수 있는 요리 '+made+'개'),el('span','','배운 레시피 '+learned+' / '+list.length));hero.append(stats);p.append(hero);
  if(view.tab!=='ALL'&&!list.some(d=>d.tab===view.tab))view.tab='ALL';
  const tabs=el('div','bag-tabs cook-tabs');tabs.setAttribute('aria-label','요리 분류');
  for(const [key,label]of TABS){const n=list.filter(d=>key==='ALL'||d.tab===key).length;if(!n&&key!=='ALL')continue;const b=button(label+' '+n,()=>{view.tab=key;render();});b.classList.toggle('selected',view.tab===key);b.setAttribute('aria-pressed',String(view.tab===key));tabs.append(b);}
  const effects=el('div','cook-effects');effects.setAttribute('aria-label','효과로 찾기');
  for(const [key,label]of EFFECTS){if(key!=='ALL'&&!list.some(d=>d.effect===key))continue;const b=button(label,()=>{view.effect=key;render();});b.classList.toggle('selected',view.effect===key);b.setAttribute('aria-pressed',String(view.effect===key));effects.append(b);}
  const box=el('label','forge-toggle cook-ready'),input=el('input');input.type='checkbox';input.checked=view.ready;input.onchange=()=>{view.ready=input.checked;render();};box.append(input,el('span','','지금 만들 수 있는 것만'));
  p.append(tabs,effects,box);
  const shown=list.filter(d=>(view.tab==='ALL'||d.tab===view.tab)&&(view.effect==='ALL'||d.effect===view.effect)&&(!view.ready||d.ready));
  shown.sort((a,b)=>(b.ready-a.ready)||(a.locked-b.locked)||(a.stars-b.stars)||String(a.item[1]).localeCompare(String(b.item[1]),'ko'));
  const grid=el('div','cook-grid');for(const d of shown)grid.append(card(d));
  if(!shown.length)grid.append(el('p','muted',list.length?'조건에 맞는 요리가 없습니다. 분류나 필터를 바꿔 보세요.':'이 조리시설에서 만들 수 있는 요리가 없습니다.'));
  p.append(grid);
}
const priorCrafting=crafting;
crafting=function(p){const recipes=game.currentPlace?.()?.valid?kitchenRecipes():null;if(recipes)renderKitchen(p,recipes);else priorCrafting(p);};
globalThis.CRPGCooking={view,sources,kitchenRecipes};
})();
