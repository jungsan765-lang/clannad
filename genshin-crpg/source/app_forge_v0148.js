/* 0.14.8 제작 화면: like the forge of the original. Recipes become item cards on their grade colour (1★ grey,
 * 2★ green, 3★ blue, 4★ purple, 5★ gold) with the stars on them; choosing one shows it large on the right with
 * its base numbers (attack, defence, HP, critical, sub stat, unique effect) above the existing recipe card, whose
 * materials and 제작 button work exactly as before (the card is moved, never rebuilt). Load after app_shell.js. */
(function(){
'use strict';
if(typeof render!=='function')return;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const F=window.CRPGForge={selected:null};
const TYPE_LABEL={EQUIP:'장비',ITEM:'아이템'};
const num=x=>Number(x)||0;
function rankOf(kind,id){try{return Math.max(1,Math.min(5,typeof itemTierRank==='function'?itemTierRank(id):1));}catch{return 1;}}
function statRows(e){
 const rows=[];const add=(label,value,suffix='')=>{if(value)rows.push([label,value+suffix]);};
 add('공격력',num(e[4]));add('방어력',num(e[5]));add('HP',num(e[6]));add('치명타 확률',num(e[7]),'%');add('치명타 피해',num(e[8]),'%');
 add('속도',num(e[20]));add('명중',num(e[21]));add('회피',num(e[22]));add('상태 저항',num(e[23]));
 const extra=String(e[9]||'').trim();if(extra&&!/^(없음|-|null)$/i.test(extra))rows.push(['보조',extra]);
 return rows;
}
function hero(card,recipe){
 const r=game.tables['17_RECIPE_DB']?.get(recipe),kind=r?.[2]==='EQUIP'?'EQUIP':'ITEM',out=r?.[3],rank=rankOf(kind,out);
 const box=mk('div','shell-forge-hero tier-'+rank),art=mk('div','shell-forge-art');
 const icon=card.querySelector('.craft-output .item-icon, .craft-output .item-glyph, .craft-output img');if(icon)art.append(icon.cloneNode(true));
 art.append(mk('span','shell-forge-stars','★'.repeat(rank)));
 const words=mk('div','shell-forge-words'),name=card.querySelector('.craft-output h3')?.textContent||'';
 words.append(mk('small','shell-forge-kind',kind==='EQUIP'?String(game.tables['16_EQUIP_DB']?.get(out)?.[2]||'장비')+' · '+(window.CRPGInventoryPresenter?.TIER_LABELS?.[rank]||''):(game.tables['14_ITEM_DB']?.get(out)?.[2]||TYPE_LABEL.ITEM)),mk('h3','tier-text tier-'+rank,name));
 box.append(art,words);
 const info=mk('div','shell-forge-info');
 if(kind==='EQUIP'){
  const e=game.tables['16_EQUIP_DB']?.get(out);
  if(e){const rows=statRows(e);if(rows.length){const dl=mk('dl','shell-forge-stats');for(const [k,v]of rows)dl.append(mk('dt','',k),mk('dd','',v));info.append(mk('p','shell-forge-sub','기본 능력치 (+0)'),dl);}
   const effect=String(e[11]||'').trim();if(effect&&!/^(없음|-)$/.test(effect))info.append(mk('p','shell-forge-sub','고유 효과'),mk('p','shell-forge-effect',effect));
   const lv=num(e[19]);if(lv>1)info.append(mk('p','shell-forge-note','착용 레벨 '+lv+' 이상'));
   const owner=game.exclusiveOwner?.(out);if(owner)info.append(mk('p','shell-forge-note','전용 무기 · '+(game.tables['07_CHAR_DB']?.get(owner)?.[1]||owner)));}
 }else{const it=game.tables['14_ITEM_DB']?.get(out);const d=String(it?.[5]||'').trim();if(d)info.append(mk('p','shell-forge-effect',d));}
 return [box,info];
}
function forge(){
 if(!game||document.body.dataset.shellScreen!=='CRAFT')return;
 const cards=[...document.querySelectorAll('.content .panel section.card[data-recipe-id]')];if(!cards.length)return;
 const grid=cards[0].parentElement;if(!grid||grid.closest('.shell-forge'))return;
 const wrap=mk('div','shell-forge'),list=mk('div','shell-forge-list'),detail=mk('div','shell-forge-detail');list.setAttribute('role','listbox');list.setAttribute('aria-label','제작법');
 const ids=cards.map(c=>c.dataset.recipeId);
 if(!ids.includes(F.selected)){const ready=cards.find(c=>!c.querySelector(':scope > button')?.disabled);F.selected=(ready||cards[0]).dataset.recipeId;}
 const show=(id,user)=>{
  F.selected=id;for(const t of list.children){const on=t.dataset.recipeId===id;t.classList.toggle('active',on);t.setAttribute('aria-selected',String(on));}
  const card=cards.find(c=>c.dataset.recipeId===id);detail.replaceChildren();if(!card)return;
  detail.append(...hero(card,id),card);card.classList.add('shell-forge-card');
  if(user)window.CRPGSound?.play?.('tab');
 };
 for(const card of cards){
  const id=card.dataset.recipeId,r=game.tables['17_RECIPE_DB']?.get(id),kind=r?.[2]==='EQUIP'?'EQUIP':'ITEM',rank=rankOf(kind,r?.[3]);
  const tile=mk('button','shell-forge-tile tier-'+rank);tile.type='button';tile.dataset.recipeId=id;tile.setAttribute('role','option');
  const ready=!card.querySelector(':scope > button')?.disabled;if(!ready)tile.classList.add('unready');
  const art=mk('span','shell-forge-tile-art');const icon=card.querySelector('.craft-output .item-icon, .craft-output .item-glyph, .craft-output img');if(icon)art.append(icon.cloneNode(true));art.append(mk('span','shell-forge-tile-stars','★'.repeat(rank)));
  const name=card.querySelector('.craft-output h3')?.textContent||id;tile.title=name+(ready?'':' · '+(card.querySelector('.choice-note')?.textContent||'지금은 만들 수 없음'));
  tile.append(art,mk('span','shell-forge-tile-name',name));tile.onclick=()=>show(id,true);list.append(tile);
 }
 wrap.append(list,detail);grid.replaceWith(wrap);show(F.selected,false);
 // A smith also enhances: 제작 and 강화·돌파 become two tabs, so the recipes are not pushed below the fold.
 const ench=wrap.parentElement?.querySelector(':scope > .enhance-panel');
 if(ench&&window.CRPGShell?.tabset){
  const body=wrap.parentElement,craft=[...body.children].filter(n=>n!==ench&&(n.matches('.craft-tabs,.forge-filters,.shell-forge')||n.tagName==='H2'&&/제작법/.test(n.textContent)));
  const spot=mk('div');ench.before(spot);
  const tabs=CRPGShell.tabset('FORGE_PAGE',[{id:'craft',label:'제작',icon:'SWORD',nodes:craft},{id:'enhance',label:'강화·돌파',icon:'STAR',nodes:[ench]}],'shell-forge-tabs');
  if(tabs)spot.replaceWith(tabs);else spot.remove();
 }
}
const prior=render;
render=function(){prior();try{forge();}catch(e){console.error('[forge]',e);}};
})();
