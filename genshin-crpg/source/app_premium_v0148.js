/* 0.14.8 원석·상점·특성·운명의 자리 on screen; 0.14.11 교환, 운명의 자리 차트와 카드 테두리 (rules in
 * runtime_premium_v0148.js and runtime_constellations_v01411.js).
 * - 원석 stays in the top bar beside Mora (the original icon); pressing it opens 기원 (app_wish_v01411.js). 교환 in the
 *   Paimon menu and on the wish screen opens the exchanges: 원석 → 인연, 스타라이트 → 원하는 동료의 운명의 별, 필드
 *   보스 재료 → 스타라이트, 스타더스트 → 영웅의 경험 · 모라 (weekly limits shown).
 * - The character screen shows each member's 특성 under their own names (일반 공격 included) with the level curve, and
 *   their 운명의 자리 as a chart of the six original icons: pointing at or pressing one shows its name and effect beside
 *   the chart, and opening the next one plays the original activation sound and lights it up.
 * - A fighter's card grows a frame with their 운명의 자리: gold lines from C1, corner ornaments from C3, an elemental
 *   glow at C5, a full shining frame at C6, with the unlocked constellation icons set into the frame. On the party
 *   screen, the character screen and in battle.
 * Load after app_shell.js. */
(function(){
'use strict';
if(typeof render!=='function')return;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const S=window.CRPGShell,fmt=n=>Math.round(Number(n)||0).toLocaleString('ko-KR');
const P=()=>window.CRPGRuntime?.premiumV0148,MAN=()=>window.CRPG_MANIFEST||{};
const CUR={PRIMOGEM:['원석','CUR_PRIMOGEM'],STARGLITTER:['스타라이트','CUR_STARGLITTER'],STARDUST:['스타더스트','CUR_STARDUST'],INTERTWINED_FATE:['뒤얽힌 인연','CUR_INTERTWINED_FATE'],ACQUAINT_FATE:['만남의 인연','CUR_ACQUAINT_FATE']};
const SHOPS=[['PRIMOGEM','원석 교환'],['STARGLITTER','스타라이트 교환'],['BOSS','보스 재료 교환'],['STARDUST','스타더스트 교환']];
const EL={'불':'fire','물':'water','얼음':'ice','번개':'electro','바람':'anemo','바위':'geo','풀':'dendro'};
const KIND={na:'일반 공격',e:'원소전투 스킬',q:'원소폭발'};
let shopTab='PRIMOGEM';const ui={talent:{},node:{},lit:null};
function curIcon(key,cls='premium-cur'){const p=MAN().itemIcons?.icons?.[CUR[key]?.[1]]?.path;if(!p)return mk('span',cls+' fallback','◆');const i=mk('img',cls);i.src=p;i.alt='';i.draggable=false;return i;}
// 0.15.1: 운명의 별 shows its own picture (4★ or 5★ by the chosen companion) instead of a ✦ glyph.
function stellaArt(goods,o,pick){if(!o.stella)return;const img=goods.querySelector('img.stella');if(!img||!pick?.value)return;const p=MAN().itemIcons?.icons?.['STELLA_FORTUNA_'+((game.premiumRarity?.(pick.value)||4)>=5?5:4)]?.path;if(p)img.src=p;}
function itemIcon(id,cls='premium-cur'){const p=MAN().itemIcons?.icons?.[id]?.path;if(!p)return mk('span',cls+' fallback','◆');const i=mk('img',cls);i.src=p;i.alt='';i.draggable=false;return i;}
const sfx=n=>window.CRPGSound?.play?.(n);
// ---- 교환 ----
function openShop(tab,done){
 if(!game?.premiumBalance)return;if(tab)shopTab=tab;
 const box=mk('div','shell-premium-shop'),bal=game.premiumBalance(),info=P();
 // 0.14.12: say what an exchange gave (or why it failed) inside the window; the game's notice line sits behind it.
 if(done){const p=mk('p','premium-done'+(done.error?' failed':''),done.text);p.setAttribute('role','status');box.append(p);}
 const head=mk('div','premium-balances');for(const key of ['PRIMOGEM','STARGLITTER','STARDUST','INTERTWINED_FATE','ACQUAINT_FATE']){const b=mk('span','premium-balance '+key.toLowerCase());b.title=CUR[key][0];b.append(curIcon(key),mk('b','',fmt(bal[key])),mk('small','',CUR[key][0]));head.append(b);}
 const tabs=mk('div','premium-tabs');for(const [k,label]of SHOPS){const t=mk('button','premium-tab'+(shopTab===k?' active':''),label);t.type='button';t.onclick=()=>{shopTab=k;openShop();};tabs.append(t);}
 const list=mk('div','premium-offers'),owned=game.premiumFighters?.()||[];
 for(const o of (info?.offers||[]).filter(o=>o.shop===shopTab)){
  const card=mk('div','premium-offer');
  const goods=mk('div','premium-goods');
  if(o.give)for(const k of Object.keys(o.give))goods.append(curIcon(k,'premium-goods-icon'));
  if(o.items)for(const k of Object.keys(o.items))goods.append(itemIcon(k,'premium-goods-icon'));
  if(o.mora)goods.append(itemIcon('CUR_MORA','premium-goods-icon'));
  if(o.stella)goods.append(itemIcon('STELLA_FORTUNA_5','premium-goods-icon stella'));
  card.append(goods,mk('strong','',o.label));if(o.note)card.append(mk('small','muted',o.note));
  let pick=null,count=null;
  // 0.15.25: companions by face, materials by picture, counts as buttons (no drop-down in the game, AGENTS.md).
  // Nothing is picked at first, so an exchange never goes to someone by accident.
  if(o.stella){pick=choiceTiles({label:'운명의 별을 받을 동료',className:'premium-pick face-choice',value:null,onChange:()=>sync(),options:owned.map(id=>({value:id,label:game.premiumCharName(id)+' '+game.constellationLevel(id)+'/6',title:game.premiumCharName(id)+' · '+game.premiumRarity(id)+'★ · 운명의 자리 '+game.constellationLevel(id)+'/6 · 스타라이트 '+game.premiumStellaPrice(id),icon:typeof actorPortrait==='function'?actorPortrait(id,'choice-face'):null}))});card.append(pick);}
  if(o.boss){pick=choiceTiles({label:'바꿀 필드 보스 재료',className:'premium-pick',value:null,onChange:()=>sync(),options:info.bossMaterials.map(id=>({value:id,label:'×'+game.itemCount(id),title:(game.tables['14_ITEM_DB']?.get(id)?.[1]||id)+' · 보유 '+game.itemCount(id),icon:MAN().itemIcons?.icons?.[id]?.path||null}))});card.append(pick);}
  if(o.bulk>1){count=choiceTiles({label:'교환 횟수',className:'premium-count',value:'1',onChange:()=>sync(),options:[1,5,10].map(n=>({value:String(n),label:n+'개'}))});card.append(count);}
  const price=mk('span','premium-price');
  const priceIcon=o.shop==='BOSS'?itemIcon(info.bossMaterials?.[0],'premium-cur'):curIcon(o.shop);
  const amount=mk('b','');price.append(priceIcon,amount);card.append(price);
  if(o.weekly){const used=game.premiumWeeklyUsed(o.id);card.append(mk('small','premium-weekly','이번 주 '+used+' / '+o.weekly+' · 월요일 0시 초기화'));}
  if(o.monthly){const used=game.premiumMonthlyUsed?.(o.id)||0;card.append(mk('small','premium-weekly','이번 달 '+used+' / '+o.monthly+' · 매달 1일 0시 초기화'));}
  const buy=mk('button','premium-buy','교환');buy.type='button';
  const params=()=>({offer:o.id,...(o.stella&&pick?.value?{char:pick.value}:{}),...(o.boss&&pick?.value?{item:pick.value}:{}),...(count?{count:Number(count.value)}:{})});
  const sync=()=>{const n=count?Number(count.value):1;stellaArt(goods,o,pick);if(o.boss&&pick?.value){const ip=MAN().itemIcons?.icons?.[pick.value]?.path;if(ip&&priceIcon.tagName==='IMG')priceIcon.src=ip;}amount.textContent=o.stella?(pick?.value?fmt(game.premiumStellaPrice(pick.value)):'25~100'):o.boss?o.price*n+'개':fmt(o.price*n);const r=game.premiumOfferReason(params());buy.disabled=!!r||busy;buy.title=r||'';};sync();
  buy.onclick=async()=>{
   const p=params(),n=p.count||1,out=await act('PREMIUM_BUY',p);if(out===undefined)return;
   if(out?.ok===false){openShop(undefined,{error:true,text:out.error||'교환하지 못했습니다.'});return;}
   const what=o.stella?'운명의 별 · '+game.premiumCharName(p.char):o.label;
   sfx('item_receive');openShop(undefined,{text:'교환했습니다 · '+what+(n>1?' ('+n+'번)':'')});
  };
  card.append(buy);list.append(card);
 }
 if(!list.childElementCount)list.append(mk('p','muted','교환할 수 있는 상품이 없습니다.'));
 box.append(head,tabs,list,mk('p','muted premium-note','비영리 팬 게임이므로 현금으로 사는 일은 없습니다.'));
 showModal('교환',box);
}
window.CRPGPremium={openShop};
if(S?.extraTiles)S.extraTiles.push({icon:'SHOP',label:'교환',run:()=>openShop()});
// ---- 특성 ----
function talentRow(id,kind,name,lv,base,mult,next){
 const row=mk('button','premium-talent'+(ui.talent[id]===kind?' open':''));row.type='button';row.dataset.kind=kind;
 const level=mk('span','talent-level','Lv.'+lv);if(lv>base)level.append(mk('em','',' +'+(lv-base)));
 // 0.15.21 (user: 「글씨가 꼭 필요하지 않은 부분은 아이콘으로」, 「딴데서 에셋을 가져오는게 맞지 않아?」): the kind is the talent's own
 // picture from the original game, in a round mark tinted by the element; its name stays on the pointer and for screen
 // readers. A talent without a picture (이세계인's E and Q) shows its letter.
 const icons=typeof CRPGIcons!=='undefined'?CRPGIcons:null,pic=icons?.talent(id,kind),mark=pic||mk('span','',KIND[kind]);
 mark.classList.add('talent-kind');
 if(icons){const el=icons.ofCharacter(id);mark.classList.add('as-icon','kind-'+kind);if(el)mark.classList.add('el-'+el);
  if(!pic){mark.textContent='';mark.title=KIND[kind];mark.setAttribute('role','img');mark.setAttribute('aria-label',KIND[kind]);mark.append(mk('b','',kind==='na'?'A':kind.toUpperCase()));}}
 row.append(mark,mk('strong','',name),level,mk('span','talent-mult',mult+'%'));
 row.title=KIND[kind]+' '+name+' · 피해 '+mult+'%'+(next?' · 다음 레벨 '+next+'%':'');
 row.onclick=()=>{ui.talent[id]=ui.talent[id]===kind?null:kind;sfx('tab');render();};
 return row;
}
function talentCurve(id,kind,lv){
 const curve=P()?.talent?.CURVE||[],box=mk('div','premium-curve'),bars=mk('div','premium-curve-bars'),max=curve[curve.length-1]||1;
 curve.forEach((v,i)=>{const b=mk('span','premium-curve-bar'+(i+1===lv?' now':i+1<lv?' past':'')+(i>=10?' extra':''));b.style.setProperty('--h',String(Math.round(v/max*100)));b.title='Lv.'+(i+1)+' · '+v+'%';b.append(mk('i','',v));bars.append(b);});
 box.append(bars,mk('small','muted','레벨이 오를수록 더 크게 오릅니다: Lv.1 100% → Lv.10 '+curve[9]+'%. 운명의 자리 3·5번째가 열리면 해당 특성이 3레벨 올라 Lv.13 '+curve[12]+'%까지 갑니다. 특성 레벨을 올리는 방법은 아직 없습니다.'));
 return box;
}
// ---- 운명의 자리 chart ----
const SPOTS=[[10,74],[25,36],[42,66],[58,28],[75,60],[90,22]];
function consIcon(id,n){const key=game.constellationKey?.(id),rec=MAN().uiAssets?.constellations?.[key]?.[n-1];if(!rec)return mk('span','cons-glyph','✦');const i=mk('img','cons-icon');i.src=rec.path;i.alt='';i.draggable=false;return i;}
function premiumCard(id){
 const sec=mk('section','shell-premium-member');sec.dataset.owner=id;
 const t=game.talentLevels(id),info=game.constellationInfo?.(id),cards=game.talentCards?.(id)||{},curve=P()?.talent?.CURVE||[];
 const talents=mk('div','premium-talents');talents.append(mk('h4','','특성'));
 const names={na:info?.talentNames?.na||'일반 공격',e:info?.talentNames?.e||cards.e?.name||'—',q:info?.talentNames?.q||cards.q?.name||'—'};
 for(const kind of ['na','e','q']){const lv=t[kind];talents.append(talentRow(id,kind,names[kind],lv,t.base[kind],curve[lv-1]||100,curve[lv]||null));if(ui.talent[id]===kind)talents.append(talentCurve(id,kind,lv));}
 const v=game.constellationView(id),cons=mk('div','premium-cons');cons.dataset.level=String(v.level);
 const head=mk('div','cons-head');head.append(mk('h4','','운명의 자리'),mk('span','cons-group',v.group||''),mk('b','cons-count',v.level+' / 6'));cons.append(head);
 const chart=mk('div','cons-chart'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.classList.add('cons-lines');
 for(let i=1;i<SPOTS.length;i++){const l=document.createElementNS('http://www.w3.org/2000/svg','line');l.setAttribute('x1',SPOTS[i-1][0]);l.setAttribute('y1',SPOTS[i-1][1]);l.setAttribute('x2',SPOTS[i][0]);l.setAttribute('y2',SPOTS[i][1]);if(v.level>i)l.classList.add('on');svg.append(l);}
 chart.append(svg);
 const selected=ui.node[id]||Math.min(6,Math.max(1,v.level||1));
 const detail=mk('div','cons-detail');
 const show=node=>{detail.replaceChildren(mk('small','',node.n+'번째 · '+(node.unlocked?'활성':'잠김')),mk('strong','',node.name),mk('p','',node.text));detail.classList.toggle('locked',!node.unlocked);};
 for(const node of v.nodes){
  const b=mk('button','cons-node'+(node.unlocked?' on':'')+(node.n===selected?' selected':'')+(ui.lit&&ui.lit.id===id&&ui.lit.level===node.n?' just-on':''));b.type='button';
  b.style.setProperty('--x',SPOTS[node.n-1][0]+'%');b.style.setProperty('--y',SPOTS[node.n-1][1]+'%');
  b.setAttribute('aria-label',node.n+'번째 운명의 자리 '+node.name+(node.unlocked?' (활성)':' (잠김)'));b.title=node.name+' — '+node.text;
  b.append(consIcon(id,node.n),mk('span','cons-num',node.n));
  b.onmouseenter=()=>show(node);b.onfocus=()=>show(node);b.onmouseleave=()=>show(v.nodes[(ui.node[id]||selected)-1]);
  b.onclick=()=>{ui.node[id]=node.n;sfx('constellation_node');for(const x of chart.querySelectorAll('.cons-node'))x.classList.toggle('selected',x===b);show(node);};
  chart.append(b);
 }
 if(v.nodes.length)show(v.nodes[selected-1]);
 cons.append(chart,detail);
 const open=mk('button','premium-cons-open','운명의 별로 다음 자리 활성화'+(v.stellaCount?' · 보유 '+v.stellaCount:''));open.prepend(itemIcon('STELLA_FORTUNA_'+((game.premiumRarity?.(id)||4)>=5?5:4),'premium-stella-icon'));open.type='button';open.disabled=!!v.reason||busy;open.title=v.reason||'';
 open.onclick=async()=>{const before=game.constellationLevel(id);const out=await act('CONSTELLATION_UNLOCK',{char:id});const after=game.constellationLevel(id);if(after>before&&out?.ok!==false){ui.lit={id,level:after,at:Date.now()};ui.node[id]=after;sfx('constellation');render();setTimeout(()=>{if(ui.lit?.id===id)ui.lit=null;},2600);}};
 cons.append(open,mk('small','muted',v.reason&&!v.stellaCount?'운명의 별은 기원이나 스타라이트 교환으로 얻습니다.':'운명의 별을 쓰면 다음 자리가 열립니다.'));
 sec.append(talents,cons);return sec;
}
// ---- the card frame ----
function elementOf(id){if(id==='PLAYER_CUSTOM'){const k=game.constellationKey?.(id);return k==='TRAVELER_GEO'?'바위':k==='TRAVELER_ANEMO'?'바람':null;}const tag=String(game.tables['07_CHAR_DB']?.get(id)?.[3]||'');return Object.keys(EL).find(k=>tag.includes('['+k+']'))||null;}
function frame(card,id){
 if(!card||!id||!game.constellationLevel)return;const lv=game.constellationLevel(id);
 card.classList.remove('cons-frame','cons-1','cons-2','cons-3','cons-4','cons-5','cons-6');card.querySelector(':scope > .cons-skin')?.remove();
 if(!lv)return;const el=EL[elementOf(id)]||'none';
 card.classList.add('cons-frame','cons-'+lv);card.dataset.consEl=el;
 const skin=mk('div','cons-skin');skin.setAttribute('aria-hidden','true');
 if(lv>=3)for(const c of ['tl','tr','bl','br'])skin.append(mk('i','cons-corner '+c));
 if(lv>=6){const shine=mk('i','cons-shine');skin.append(shine);for(let k=0;k<6;k++){const s=mk('i','cons-spark s'+k);skin.append(s);}}
 const badges=mk('div','cons-badges');badges.append(mk('span','cons-tag','C'+lv));for(let n=1;n<=lv;n++){const b=mk('span','cons-badge');b.append(consIcon(id,n));badges.append(b);}
 skin.append(badges);card.append(skin);
}
function frames(){
 for(const c of document.querySelectorAll('.formation-grid > [data-owner], .shell-battle-line > [data-owner]'))frame(c,c.dataset.owner);
 for(const c of document.querySelectorAll('.gear-member[data-owner]'))frame(c,c.dataset.owner);
 // Battle: party members are fighters whose id is their source.
 for(const c of document.querySelectorAll('.combatant-row[data-actor-id]')){const id=c.dataset.actorId,a=game.s.runtime?.actors.find(x=>x.id===id);if(a?.side==='ALLY'&&a.source)frame(c,a.source);}
}
window.CRPGConstellationFrame={frame,frames};
function decorate(){
 if(!game?.premiumBalance)return;
 // 원석 beside Mora in the top bar, with the original icon; it opens 기원.
 const mora=document.querySelector('main > aside .hud-mora');
 if(mora&&!mora.parentElement.querySelector('.hud-primo')){const b=mk('button','hud-primo');b.type='button';b.title='원석 · 기원';const n=fmt(game.premiumBalance().PRIMOGEM);b.setAttribute('aria-label','원석 '+n+' · 기원 열기');b.append(curIcon('PRIMOGEM','hud-primo-icon'),mk('span','',n));b.onclick=()=>window.CRPGWish?.open?window.CRPGWish.open():openShop('PRIMOGEM');mora.after(b);}
 // 특성 · 운명의 자리 on the character screen.
 if(document.body.dataset.shellScreen==='STATUS')for(const m of document.querySelectorAll('.gear-member[data-owner]')){if(m.querySelector('.shell-premium-member'))continue;try{m.append(premiumCard(m.dataset.owner));}catch(e){console.error('[premium]',e);}}
 try{frames();}catch(e){console.error('[constellation frame]',e);}
}
const prior=render;
render=function(){prior();try{decorate();}catch(e){console.error('[premium]',e);}};
})();
