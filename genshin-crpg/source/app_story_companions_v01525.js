/* 0.15.25 동료 카드 (user: 「스토리 진행하면서 만나는 캐릭터중에 4성 있으면 좀 나눠줘서 적어도 4인은」; and no paragraphs where a
 * picture does): whoever joins — a chapter's 4★ (runtime_story_companions_v01525.js) or anyone else — comes up in the reward
 * window (app_adventure.js showReceivedLoot, 「새 동료 합류!」) as character cards: picture, element, weapon, stars, name and
 * level, with 「편성」 to put them in the party. The window's old lines (「…가 동료가 되었습니다」) are gone. */
(function(){
'use strict';
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
function portrait(id){try{return typeof combatPortraitSrc==='function'&&(typeof showArt==='undefined'||showArt)?combatPortraitSrc({side:'ALLY',source:id}):null;}catch{return null;}}
function card(id,index=0){
 const rarity=game.rarityOf?.(id)||4,I=window.CRPGIcons,el=I?.ofCharacter(id),name=game.premiumCharName(id),c=mk('article','sc-card rarity-'+rarity+(el?' el-'+el:''));c.style.setProperty('--i',String(index));
 const art=mk('div','sc-art'),src=portrait(id);if(src){const i=mk('img');i.src=src;i.alt='';i.draggable=false;art.append(i);}else art.append(mk('span','sc-initial',name.slice(0,1)));
 const badges=mk('div','sc-badges'),e=I?.element(el,'sc-el'),w=I?.weapon(I.weaponOfCharacter(id),'sc-weapon');if(e)badges.append(e);if(w)badges.append(w);art.append(badges);
 const stars=mk('div','sc-stars','★'.repeat(rarity));stars.setAttribute('role','img');stars.setAttribute('aria-label',rarity+'성');art.append(stars);
 const info=mk('div','sc-info');info.append(mk('strong','',name),mk('small','','Lv. '+(game.s.chars?.[id]?.level||1)));
 c.append(art,info);return c;
}
// The cards of everyone who joined, then 「편성」 (closes the window and opens the party).
function joined(ids){
 const box=mk('div','sc-joined'),cards=mk('div','sc-cards');ids.forEach((id,i)=>cards.append(card(id,i)));box.append(cards);
 const go=mk('button','primary sc-party','편성');go.type='button';go.onclick=()=>{document.getElementById('modal')?.close();window.CRPGShell?.open?.('PARTY');};
 // Mid-story the party cannot open yet: the button says why (the cards still show).
 let why='';try{why=game.actionReason?.('MENU',{screen:'PARTY'})||'';}catch{}if(why){go.disabled=true;go.title=why;go.setAttribute('aria-description',why);}
 box.append(go);return box;
}
window.CRPGCompanionCards={card,joined};
})();
