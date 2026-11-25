/* 0.15.21 아이콘 (user, 2026-10-06: 「원래 퍼즐때 쓰던 아이콘 있잖아 여기다가도 넣으면 되잖아. 전투할때도 아군, 적 원소같은것도
 * 넣어두면 편하겠지? 글씨가 꼭 필요하지 않은 부분은 아이콘으로 대체해도 될 것 같아 전체적으로」, then 「아이콘이 저게 맞아? 그냥
 * 딴데서 에셋을 가져오는게 맞지 않아?」 — all official icons).
 * One set of pictures for the whole game, the original game's UI textures listed in content/genshin-ui-assets.json
 * (MANIFEST.uiAssets: elements, weaponTypes, normalAttacks, skills; sources and hashes there and in assets/icons/CREDITS.md):
 * - the element symbols, for characters, enemies and auras, and inside the puzzles' coloured orbs;
 * - the weapon kinds; the talents (일반 공격 · 원소전투 스킬 · 원소폭발) of every character.
 * The word always stays as the picture's title and for screen readers. Load before every screen that draws them. */
(function(){
'use strict';
const ELEMENTS=['pyro','hydro','cryo','electro','anemo','geo','dendro'];
const KO={pyro:'불',hydro:'물',cryo:'얼음',electro:'번개',anemo:'바람',geo:'바위',dendro:'풀'};
const TALENT={na:'일반 공격',e:'원소전투 스킬',q:'원소폭발'};
const FROM={'불':'pyro','물':'hydro','얼음':'cryo','번개':'electro','바람':'anemo','바위':'geo','풀':'dendro',fire:'pyro',water:'hydro',ice:'cryo',lightning:'electro',wind:'anemo',rock:'geo',grass:'dendro'};
for(const k of ELEMENTS){FROM[k]=k;FROM[k.toUpperCase()]=k;}
const MAN=()=>typeof MANIFEST!=='undefined'?MANIFEST:(window.CRPG_MANIFEST||{});
const UI=()=>MAN().uiAssets||{};
// Any way the game writes an element (불, [불], 불 원소, PYRO, fire, …) -> pyro…; null when there is none.
function kindOf(x){
 if(x==null)return null;const s=String(x).trim();if(!s)return null;if(FROM[s])return FROM[s];
 const bare=s.replace(/[[\]]/g,'').replace(/\s*원소$/,'');if(FROM[bare])return FROM[bare];
 const tag=s.match(/\[(불|물|얼음|번개|바람|바위|풀)\]/);return tag?FROM[tag[1]]:null;
}
const elementName=k=>KO[kindOf(k)]||'';
// A picture from the list, in a span that carries its name (title, aria-label), or null when the list has none.
function picture(rec,cls,label){
 if(!rec?.path)return null;const s=document.createElement('span');s.className=cls;
 const i=document.createElement('img');i.src=rec.path;i.alt='';i.draggable=false;i.decoding='async';s.append(i);
 if(label){s.title=label;s.setAttribute('role','img');s.setAttribute('aria-label',label);}else s.setAttribute('aria-hidden','true');
 return s;
}
// The element's symbol beside a name (span.el-icon.el-pyro …).
function element(kind,cls=''){const k=kindOf(kind);return k?picture(UI().elements?.[k],'el-icon el-'+k+(cls?' '+cls:''),KO[k]+' 원소'):null;}
// The puzzles' coloured orb (span.pz-orb.el-…) with the element's symbol in white on it. `cls` adds classes; a title
// names it when asked.
function orb(kind,cls='',title=false){
 const k=kindOf(kind)||'geo',o=document.createElement('span');o.className='pz-orb el-'+k+(cls?' '+cls:'');
 const rec=UI().elements?.[k];if(rec?.path){const i=document.createElement('img');i.className='pz-glyph';i.src=rec.path;i.alt='';i.draggable=false;o.append(i);}
 if(title){o.title=KO[k]+' 원소';o.setAttribute('role','img');o.setAttribute('aria-label',KO[k]+' 원소');}else o.setAttribute('aria-hidden','true');
 return o;
}
const weapon=(kind,cls='')=>picture(UI().weaponTypes?.[kind],'weapon-icon'+(cls?' '+cls:''),kind);

// ---- who has which element, weapon and talents ----------------------------------------------------------------------
function tableRow(name,id){try{return game.tables?.[name]?.get(id)||null;}catch{return null;}}
// A character's own element: 07_CHAR_DB's tag ([불] …); the traveller by the resonance they took (바람 or 바위).
function ofCharacter(id){
 if(typeof game==='undefined'||!game)return null;
 if(id==='PLAYER_CUSTOM'){const c=game.constellationKey?.(id);return c==='TRAVELER_GEO'?'geo':c==='TRAVELER_ANEMO'?'anemo':null;}
 return kindOf(tableRow('07_CHAR_DB',id)?.[3]);
}
// A fighter on the battlefield: an ally by its character, an enemy by the element it fights with (runtime_combat.js
// gives every enemy one: its native element, its cards' only element, or 물리 — which has no symbol).
function ofActor(a){
 if(!a)return null;if(a.side==='ALLY')return ofCharacter(a.source||a.id)||kindOf(a.element);
 return kindOf(a.element);
}
const WEAPONS=['한손검','양손검','장병기','활','법구'];
function weaponOfCharacter(id){
 if(typeof game==='undefined'||!game)return null;
 if(id==='PLAYER_CUSTOM'){const rows=game.tables?.['16_EQUIP_DB'];const worn=(game.s?.inventory||[]).find(x=>x.equipped&&x.owner==='PLAYER_CUSTOM'&&WEAPONS.includes(rows?.get(x.equip)?.[2]));return worn?rows.get(worn.equip)[2]:'한손검';}
 return (game.equipmentProficiencies?.(id)||[]).find(k=>WEAPONS.includes(k))||null;
}
// A character's talent picture (slot na · e · q): their own, by the constellation key (the traveller's by the element
// they resonate with); a normal attack falls back to the one of their weapon kind. Null when there is none (이세계인's E/Q).
function talentRecord(id,slot){
 if(typeof game==='undefined'||!game)return null;
 const key=game.constellationKey?.(id)||id,own=UI().skills?.[key]?.[slot];if(own)return own;
 return slot==='na'?UI().normalAttacks?.[weaponOfCharacter(id)||'한손검']||null:null;
}
const talent=(id,slot,cls='')=>picture(talentRecord(id,slot),'talent-icon talent-'+slot+(cls?' '+cls:''),TALENT[slot]);

window.CRPGIcons={ELEMENTS,KO,TALENT,kindOf,elementName,element,orb,weapon,talent,talentRecord,ofCharacter,ofActor,weaponOfCharacter};
})();
