/* 제작·강화 작업장 (0.14.8, reworked 0.14.11): the forge, the alchemy bench and the kitchen read like the original's
 * workshops.
 * - One bar under the title: 판매 상품 / 제작 (요리) / 강화·돌파. It joins the place's own mode buttons and the craft and
 *   enhance tabs, which used to be three rows of buttons.
 * - Recipes and dishes are tiles on their grade colour (1★ grey … 5★ gold) with their stars; the chosen one opens on
 *   the right with its base numbers, materials and the 제작 button, which stays in view at the bottom of that panel.
 * - Gear to enhance is a tile list as well; the chosen piece shows its next step and the 강화 / 돌파 button.
 * The original cards and rows are moved, never rebuilt, so every button works exactly as before. Load after app_shell.js. */
(function(){
'use strict';
if(typeof render!=='function')return;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const $=(sel,root=document)=>root.querySelector(sel),$$=(sel,root=document)=>[...root.querySelectorAll(sel)];
const F=window.CRPGForge={selected:null,dish:null,gear:null};
const num=x=>Number(x)||0;
const icon=name=>window.CRPGShell?.icon?.(name)||mk('span');
function rankOf(id){try{return Math.max(1,Math.min(5,typeof itemTierRank==='function'?itemTierRank(id):1));}catch{return 1;}}
function statRows(e){
 const rows=[];const add=(label,value,suffix='')=>{if(value)rows.push([label,value+suffix]);};
 add('공격력',num(e[4]));add('방어력',num(e[5]));add('HP',num(e[6]));add('치명타 확률',num(e[7]),'%');add('치명타 피해',num(e[8]),'%');
 add('속도',num(e[20]));add('명중',num(e[21]));add('회피',num(e[22]));add('상태 저항',num(e[23]));
 const extra=String(e[9]||'').trim();if(extra&&!/^(없음|-|null)$/i.test(extra))rows.push(['보조',extra]);
 return rows;
}
// The big picture of the chosen thing: its icon on the grade colour, its kind and name.
function heroBox(rank,glyph,kind,name){
 const box=mk('div','shell-forge-hero tier-'+rank),art=mk('div','shell-forge-art');if(glyph)art.append(glyph.cloneNode(true));art.append(mk('span','shell-forge-stars','★'.repeat(rank)));
 const words=mk('div','shell-forge-words');words.append(mk('small','shell-forge-kind',kind),mk('h3','tier-text tier-'+rank,name));box.append(art,words);return box;
}
function recipeHero(card,recipe){
 const r=game.tables['17_RECIPE_DB']?.get(recipe),equip=r?.[2]==='EQUIP',out=r?.[3],rank=rankOf(out);
 const glyph=card.querySelector('.craft-output .item-icon, .craft-output .item-glyph, .craft-output img'),name=card.querySelector('.craft-output h3')?.textContent||'';
 const kind=equip?String(game.tables['16_EQUIP_DB']?.get(out)?.[2]||'장비')+' · '+(window.CRPGInventoryPresenter?.TIER_LABELS?.[rank]||''):(game.tables['14_ITEM_DB']?.get(out)?.[2]||'아이템');
 const info=mk('div','shell-forge-info');
 if(equip){
  const e=game.tables['16_EQUIP_DB']?.get(out);
  if(e){const rows=statRows(e);if(rows.length){const dl=mk('dl','shell-forge-stats');for(const [k,v]of rows)dl.append(mk('dt','',k),mk('dd','',v));info.append(mk('p','shell-forge-sub','기본 능력치 (+0)'),dl);}
   const effect=String(e[11]||'').trim();if(effect&&!/^(없음|-)$/.test(effect))info.append(mk('p','shell-forge-sub','고유 효과'),mk('p','shell-forge-effect',effect));
   const lv=num(e[19]);if(lv>1)info.append(mk('p','shell-forge-note','착용 레벨 '+lv+' 이상'));
   const owner=game.exclusiveOwner?.(out);if(owner)info.append(mk('p','shell-forge-note','전용 무기 · '+(game.tables['07_CHAR_DB']?.get(owner)?.[1]||owner)));}
 }else{const it=game.tables['14_ITEM_DB']?.get(out);const d=String(it?.[5]||'').trim();if(d)info.append(mk('p','shell-forge-effect',d));}
 return [heroBox(rank,glyph,kind,name),info];
}
// A list of tiles and a detail panel; `items` gives each tile and what the panel shows for it.
function tilesAndDetail(cls,key,items,label){
 const wrap=mk('div','shell-forge '+cls),list=mk('div','shell-forge-list'),detail=mk('div','shell-forge-detail');list.setAttribute('role','listbox');list.setAttribute('aria-label',label);
 if(!items.some(x=>x.id===F[key])){const ready=items.find(x=>x.ready);F[key]=(ready||items[0])?.id||null;}
 const show=(id,user)=>{
  F[key]=id;for(const t of list.children){const on=t.dataset.pick===id;t.classList.toggle('active',on);t.setAttribute('aria-selected',String(on));}
  const item=items.find(x=>x.id===id);detail.replaceChildren();if(!item)return;
  // 0.15.6: the buttons are taken from the card once and kept with the item. They used to be looked up in the card
  // every time, but the first showing had moved them into a foot that is thrown away, so picking the item again
  // showed no 제작 / 준비 / 강화 button (user: 「제작 버튼이 안나오는 버그인듯 전용무기에도 같은 문제」).
  item.actionNodes??=item.actions();
  const body=mk('div','shell-forge-scroll'),foot=mk('div','shell-forge-foot');body.append(...item.detail());if(item.actionNodes.length)foot.append(...item.actionNodes);
  detail.append(body);if(foot.children.length)detail.append(foot);
  if(user)window.CRPGSound?.play?.('tab');
 };
 for(const x of items){
  const tile=mk('button','shell-forge-tile tier-'+x.rank+(x.ready?'':' unready'));if(x.enh&&typeof enhanceFrameClass==='function'){const f=enhanceFrameClass(x.enh);if(f)tile.classList.add('enh',f);}tile.type='button';tile.dataset.pick=x.id;tile.setAttribute('role','option');tile.title=x.title||x.name;
  const art=mk('span','shell-forge-tile-art');if(x.glyph)art.append(x.glyph.cloneNode(true));art.append(mk('span','shell-forge-tile-stars','★'.repeat(x.rank)));
  if(x.badge)art.append(mk('span','shell-forge-tile-badge',x.badge));if(x.ready)art.append(mk('span','shell-forge-ready'));
  tile.append(art,mk('span','shell-forge-tile-name',x.name));tile.onclick=()=>show(x.id,true);list.append(tile);
 }
 wrap.append(list,detail);if(F[key])show(F[key],false);else detail.append(mk('p','muted shell-forge-none','고를 수 있는 항목이 없습니다.'));
 return wrap;
}
// Recipes at the forge and the alchemy bench.
function recipes(root){
 const cards=$$('section.card[data-recipe-id]',root).filter(c=>!c.closest('.shell-forge'));if(!cards.length)return null;
 const grid=cards[0].parentElement;
 const items=cards.map(card=>{const id=card.dataset.recipeId,r=game.tables['17_RECIPE_DB']?.get(id),rank=rankOf(r?.[3]),ready=!card.querySelector(':scope > button')?.disabled,name=card.querySelector('.craft-output h3')?.textContent||id;
  return {id,rank,ready,name,title:name+(ready?'':' · '+(card.querySelector('.choice-note')?.textContent||'지금은 만들 수 없음')),glyph:card.querySelector('.craft-output .item-icon, .craft-output .item-glyph, .craft-output img'),
   detail:()=>{card.classList.add('shell-forge-card');return [...recipeHero(card,id),card];},actions:()=>[...card.querySelectorAll(':scope > button')]};});
 const wrap=tilesAndDetail('recipes','selected',items,'제작법');grid.replaceWith(wrap);return wrap;
}
// Dishes at a kitchen: the same tiles (stars of the dish) and the cook card on the right.
function dishes(root){
 const grid=$('.cook-grid',root);if(!grid||grid.closest('.shell-forge'))return null;
 const cards=$$(':scope > section.cook-card',grid);if(!cards.length)return null;
 const items=cards.map(card=>{const id=card.dataset.recipeId,stars=(card.querySelector('.cook-stars')?.textContent||'★').length,name=card.querySelector('.cook-title h3')?.textContent||id;
  const rank=Math.max(1,Math.min(5,stars)),glyph=card.querySelector('.cook-head > :first-child'),kind=card.querySelector('.cook-badge')?.textContent||'요리';
  return {id,rank,ready:card.classList.contains('ready'),name,badge:card.classList.contains('locked')?'레시피':'',title:name,glyph,
   detail:()=>{card.classList.add('shell-forge-card');return [heroBox(rank,glyph,kind,name),card];},actions:()=>{const foot=card.querySelector('.cook-foot');return foot?[foot]:[];}};});
 const wrap=tilesAndDetail('dishes','dish',items,'요리');grid.replaceWith(wrap);return wrap;
}
// Gear at an enhancing forge: tiles with their +level; the piece's next step and its 강화 / 돌파 button on the right.
function gear(root){
 const list=$('.forge-list',root);if(!list||list.closest('.shell-forge'))return null;
 const rows=$$(':scope > .forge-row',list);if(!rows.length)return null;
 const items=rows.map(row=>{const id=row.dataset.enhanceSlot,strong=row.querySelector('.forge-copy strong'),rank=Number((strong?.className.match(/tier-(\d)/)||[])[1])||1,title=strong?.textContent||'';
  const level=(title.match(/\+(\d+)$/)||[])[1],actions=row.querySelector('.forge-actions'),ready=!!actions&&[...actions.children].some(b=>!b.disabled);
  // 0.15.6: the piece's next step is kept with the item; looked up in the row each time, it was gone once shown (moved).
  const copy=row.querySelector('.forge-copy');
  return {id,rank,ready,enh:level,name:title.replace(/\s*\+\d+$/,''),badge:level?'+'+level:'',title,glyph:row.querySelector(':scope > .item-glyph, :scope > .item-icon, :scope > img'),
   detail:()=>{copy?.classList.add('shell-forge-copy');return [heroBox(rank,row.querySelector(':scope > .item-glyph, :scope > .item-icon, :scope > img'),row.classList.contains('worn')?'장착 중':'보관 중',title),copy].filter(Boolean);},
   actions:()=>actions?[...actions.children]:[]};});
 const wrap=tilesAndDetail('gear','gear',items,'강화할 장비');list.replaceWith(wrap);return wrap;
}
// The bar under the title: what the place sells, what it makes, what it enhances.
function workbar(panel,entry,mode){
 const head=$(':scope > .shell-page-head',panel);if(!head||$('.shell-workbar',head))return;
 const body=$(':scope > .shell-page-body',panel);
 const modeRow=$$('div.row',panel).find(r=>[...r.children].some(b=>/^(판매 상품|제작·강화)$/.test(b.textContent.trim())));
 const shopBtn=modeRow&&[...modeRow.children].find(b=>b.textContent.trim()==='판매 상품'),craftBtn=modeRow&&[...modeRow.children].find(b=>b.textContent.trim()==='제작·강화');
 const ftabs=$('.shell-forge-tabs',panel),kitchen=!!$('.cook-hero,.shell-forge.dishes',panel)||/조리/.test(String(entry?.facility||entry?.name||''));
 const canCraft=mode==='CRAFT'||!!craftBtn,canEnhance=!!ftabs||(!!craftBtn&&!!game.placeCanEnhance?.(entry));
 const S=window.CRPGShell,sub=S?.tabs?.FORGE_PAGE||'craft';
 const bar=mk('div','shell-workbar'),tabs=mk('div','shell-worktabs');tabs.setAttribute('role','tablist');
 const tab=(label,iconName,active,fn,disabled)=>{const b=mk('button','shell-worktab'+(active?' active':''));b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(active));b.append(icon(iconName),mk('span','',label));b.disabled=!!disabled;b.onclick=()=>{if(!active)window.CRPGSound?.play?.('tab');fn();};tabs.append(b);return b;};
 const pick=id=>{const t=ftabs&&$(':scope > .shell-tabbar [data-tab="'+id+'"]',ftabs);if(t)t.click();for(const b of tabs.children)if(b.dataset.sub){const on=b.dataset.sub===id;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));}};
 if(shopBtn)tab('판매 상품','SHOP',mode==='SHOP',()=>shopBtn.click(),shopBtn.disabled&&mode!=='SHOP');
 if(canCraft){const b=tab(kitchen?'요리':'제작',kitchen?'POT':/연금|약제/.test(String(entry?.name||''))?'FLASK':'ANVIL',mode==='CRAFT'&&(!ftabs||sub!=='enhance'),()=>{if(mode!=='CRAFT'){S.tabs.FORGE_PAGE='craft';craftBtn.click();}else pick('craft');},craftBtn?.disabled&&mode!=='CRAFT');b.dataset.sub='craft';}
 if(canEnhance){const b=tab('강화·돌파','STAR',mode==='CRAFT'&&!!ftabs&&sub==='enhance',()=>{if(mode!=='CRAFT'){S.tabs.FORGE_PAGE='enhance';craftBtn.click();}else pick('enhance');},craftBtn?.disabled&&mode!=='CRAFT');b.dataset.sub='enhance';}
 if(tabs.children.length>1||canCraft)bar.append(tabs);
 // The kitchen's counts go into the bar instead of a big box above the dishes.
 const hero=$('.cook-hero',panel);if(hero){const stats=$('.cook-stats',hero);if(stats){stats.classList.add('shell-workstats');bar.append(stats);}hero.remove();}
 if(bar.children.length){head.insertBefore(bar,$(':scope > .shell-page-tools',head));}
 const side=modeRow?.parentElement;if(modeRow)modeRow.remove();
 if(side?.matches('.shell-col-side')&&!side.children.length){side.parentElement?.classList.remove('with-side');side.remove();}
 if(ftabs)$(':scope > .shell-tabbar',ftabs)?.classList.add('shell-offscreen');
 // The way out and the path sit in the title bar, as on the shop page.
 const crumb=body&&$(':scope > .place-breadcrumb',body);if(crumb){const leave=$('button',crumb),where=$('p',crumb),tools=$(':scope > .shell-page-tools',head),words=$('.shell-page-words',head);if(leave&&tools){leave.classList.add('shell-leave');tools.prepend(leave);}if(where&&words){where.className='shell-page-intro';words.append(where);}crumb.remove();}
 const label=body&&[...body.children].find(n=>n.matches('p.muted'));if(label&&!label.closest('.shell-forge'))label.remove();
}
function layout(){
 if(!game)return;const screen=document.body.dataset.shellScreen;if(screen!=='CRAFT'&&screen!=='SHOP')return;
 const panel=$('.content > .panel.shell-page');if(!panel)return;
 const visit=game.currentPlace?.(),entry=visit?.valid?visit.entry:null;if(!entry)return;
 if(screen==='CRAFT'){
  panel.classList.add('shell-workshop');
  const body=$(':scope > .shell-page-body',panel);
  recipes(body);dishes(body);
  const ench=body&&$(':scope > .enhance-panel',body);if(ench)gear(ench);
  // A smith also enhances: 제작 and 강화·돌파 are two panes (picked from the bar above).
  if(ench&&!ench.closest('.shell-forge-tabs')&&window.CRPGShell?.tabset){
   const craft=[...body.children].filter(n=>n!==ench&&!n.matches('.place-breadcrumb,.row')&&!(n.matches('p.muted')));
   const spot=mk('div');ench.before(spot);
   const tabs=CRPGShell.tabset('FORGE_PAGE',[{id:'craft',label:'제작',icon:'ANVIL',nodes:craft},{id:'enhance',label:'강화·돌파',icon:'STAR',nodes:[ench]}],'shell-forge-tabs');
   if(tabs)spot.replaceWith(tabs);else spot.remove();
  }else if(body&&!$('.shell-forge-tabs',body)){const area=mk('div','shell-workarea');area.append(...[...body.children].filter(n=>!n.matches('.place-breadcrumb,.row')&&!n.matches('p.muted')));body.append(area);}
  workbar(panel,entry,'CRAFT');
 }else if(entry.modes?.includes('CRAFT'))workbar(panel,entry,'SHOP');
}
const prior=render;
render=function(){prior();try{layout();}catch(e){console.error('[forge]',e);}};
})();
