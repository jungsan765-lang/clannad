/* 0.14.8 원석·상점·특성·운명의 자리 on screen (rules in runtime_premium_v0148.js).
 * - 원석 stays in the HUD beside Mora; pressing it (or 상점 in the Paimon menu) opens the three exchanges.
 * - The character screen shows each member's 특성 (일반 공격 / 원소 전투 스킬 / 원소 폭발 levels) and the six
 *   운명의 자리, with the button to open the next one when a 운명의 별 is held.
 * Nothing can be earned yet; the screens say so. Load after app_shell.js. */
(function(){
'use strict';
if(typeof render!=='function')return;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const S=window.CRPGShell,fmt=n=>Math.round(Number(n)||0).toLocaleString('ko-KR');
const P=()=>window.CRPGRuntime?.premiumV0148;
const CUR=[['PRIMOGEM','원석','PRIMO'],['STARGLITTER','스타라이트','STARS'],['STARDUST','스타더스트','STARS']];
const NOTE='지금은 원석·스타라이트·스타더스트를 얻을 방법이 없습니다. 나중에 운명의 자리를 얻는 데 쓰입니다. 비영리 팬 게임이므로 현금으로 사는 일은 없습니다.';
let shopTab='PRIMOGEM';
function icon(name,cls){return S?.icon?S.icon(name,cls):mk('span',cls,'◆');}
function openShop(tab){
 if(!game?.premiumBalance)return;if(tab)shopTab=tab;
 const box=mk('div','shell-premium-shop'),bal=game.premiumBalance();
 const head=mk('div','premium-balances');for(const [k,label,ic]of CUR){const b=mk('span','premium-balance '+k.toLowerCase());b.append(icon(ic,'shell-icon'),mk('b','',fmt(bal[k])),mk('small','',label));head.append(b);}
 const tabs=mk('div','premium-tabs');for(const [k,label]of CUR){const t=mk('button','premium-tab'+(shopTab===k?' active':''),label+' 상점');t.type='button';t.onclick=()=>{shopTab=k;openShop();};tabs.append(t);}
 const list=mk('div','premium-offers');
 const owned=game.premiumFighters?.()||[],name=id=>id==='PLAYER_CUSTOM'?(game.s.global.PLAYER_NAME||'주인공'):(game.tables['07_CHAR_DB']?.get(id)?.[1]||id);
 for(const o of (P()?.offers||[]).filter(o=>o.shop===shopTab)){
  const card=mk('div','premium-offer');card.append(mk('strong','',o.label));
  const price=mk('span','premium-price');price.append(icon(CUR.find(c=>c[0]===o.shop)[2],'shell-icon'),mk('b','',fmt(o.price)));card.append(price);
  let pick=null;if(o.stella){pick=mk('select','premium-pick');pick.append(new Option('동료 고르기',''));for(const id of owned)pick.append(new Option(name(id)+' · 운명의 자리 '+game.constellationLevel(id)+'/6',id));card.append(pick);}
  const buy=mk('button','premium-buy','교환');buy.type='button';
  const reason=()=>game.premiumOfferReason({offer:o.id,char:pick?.value||undefined});
  const sync=()=>{const r=reason();buy.disabled=!!r||busy;buy.title=r||'';};sync();pick?.addEventListener('change',sync);
  buy.onclick=async()=>{await act('PREMIUM_BUY',{offer:o.id,...(pick?.value?{char:pick.value}:{})});openShop();};
  card.append(buy);list.append(card);
 }
 box.append(head,tabs,list,mk('p','muted premium-note',NOTE));
 showModal('상점',box);
}
window.CRPGPremium={openShop};
// Paimon menu tile.
if(S?.extraTiles)S.extraTiles.push({icon:'SHOP',label:'상점',run:()=>openShop()});
// 특성 · 운명의 자리 for one fighter.
function premiumCard(id){
 const sec=mk('section','shell-premium-member');sec.dataset.owner=id;
 const t=game.talentLevels(id),cards=game.talentCards?.(id)||{},talents=mk('div','premium-talents');
 talents.append(mk('h4','','특성'));
 for(const [key,label,card]of [['na','일반 공격',null],['e','원소 전투 스킬',cards.e],['q','원소 폭발',cards.q]]){
  const row=mk('div','premium-talent');row.append(mk('span','talent-kind',label),mk('strong','',card?.name||(key==='na'?'기본 공격':'—')),mk('span','talent-level','Lv. '+t[key]+(t[key]>t.base[key]?' (+'+(t[key]-t.base[key])+')':'')+' / 10'));if(card?.text)row.title=card.text;talents.append(row);
 }
 talents.append(mk('small','muted','특성 레벨을 올리는 방법은 아직 없습니다. 레벨이 1 오를 때마다 그 공격의 피해가 7.5% 늘어납니다.'));
 const v=game.constellationView(id),cons=mk('div','premium-cons');cons.append(mk('h4','','운명의 자리 · '+v.level+' / 6'));
 const ring=mk('ol','premium-cons-nodes');for(const node of v.nodes){const li=mk('li',node.unlocked?'on':'');li.append(mk('b','',node.n),mk('span','',node.text));ring.append(li);}
 cons.append(ring);
 const open=mk('button','premium-cons-open','운명의 별로 다음 자리 열기'+(v.stellaCount?' · 보유 '+v.stellaCount:''));open.type='button';open.disabled=!!v.reason||busy;open.title=v.reason||'';open.onclick=()=>act('CONSTELLATION_UNLOCK',{char:id});
 cons.append(open,mk('small','muted','운명의 별은 원석·스타라이트 상점에서 교환합니다.'));
 sec.append(talents,cons);return sec;
}
function decorate(){
 if(!game?.premiumBalance)return;
 // 원석 beside Mora in the HUD.
 const mora=document.querySelector('main > aside .hud-mora');
 if(mora&&!mora.parentElement.querySelector('.hud-primo')){const b=mk('button','hud-primo');b.type='button';b.title='원석 · 상점 열기';b.setAttribute('aria-label','원석 '+fmt(game.premiumBalance().PRIMOGEM)+' · 상점 열기');b.append(icon('PRIMO','shell-icon'),mk('span','',fmt(game.premiumBalance().PRIMOGEM)));b.onclick=()=>openShop('PRIMOGEM');mora.after(b);}
 // 특성 · 운명의 자리 on the character screen.
 if(document.body.dataset.shellScreen==='STATUS')for(const m of document.querySelectorAll('.gear-member[data-owner]')){if(m.querySelector('.shell-premium-member'))continue;try{m.append(premiumCard(m.dataset.owner));}catch(e){console.error('[premium]',e);}}
}
const prior=render;
render=function(){prior();try{decorate();}catch(e){console.error('[premium]',e);}};
})();
