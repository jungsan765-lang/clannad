/* Growth screens use the same previews and reason strings as authoritative actions. */
(function(){
'use strict';
const fmt=n=>Number(n||0).toLocaleString('ko-KR'),name=id=>safeName('14_ITEM_DB',id);
// 0.15.25: materials as pictures with 보유/필요 under them (the name stays in a small caption and the tooltip).
function costTile(icon,label,have,need,count){const t=el('div','growth-cost'+(have<need?' lack':''));t.title=label+' · 보유 '+fmt(have)+' / 필요 '+fmt(need);t.setAttribute('aria-label',t.title);t.append(icon||el('span','growth-cost-icon mark','✦'),el('b','',count),el('small','',label));return t;}
function costs(box,cost){const list=el('div','growth-costs'),mora=game.s.global.MORA;list.append(costTile(window.currencyIcon?.('MORA','growth-cost-icon'),'모라',mora,cost.mora,fmt(cost.mora)));
 for(const [id,n]of Object.entries(cost.items))list.append(costTile(picture(MANIFEST.itemIcons?.icons?.[id]?.path||MANIFEST.itemIcons?.categories?.CATEGORY_MATERIAL?.path,'growth-cost-icon'),name(id),game.itemCount(id),n,fmt(game.itemCount(id))+'/'+fmt(n)));box.append(list);}
function close(){document.getElementById('modal').close();}
window.openCharacterAscension=function(owner='PLAYER_CUSTOM'){const d=game.ascensionInfo(owner),box=el('div','growth-dialog');box.append(el('p','',d.name+' · Lv. '+d.level+' / '+d.cap),el('h3','','돌파 후 Lv. '+d.nextCap+'까지 성장'),el('p','','돌파 단계 '+d.phase+' → '+Math.min(6,d.phase+1)+' · 능력치와 특성 상한 증가'),el('p','',d.gate.label+' · '+(d.gate.ready?'완료':'미완료')));costs(box,d.cost);if(d.reason)box.append(el('p','choice-note',d.reason));const why=game.actionReason('CHAR_ASCEND',{owner});box.append(button('캐릭터 돌파',()=>{close();act('CHAR_ASCEND',{owner});},busy||!!why,true));showModal('캐릭터 돌파 · '+d.name,box);};
window.openCharacterTalent=function(owner='PLAYER_CUSTOM'){const box=el('div','growth-dialog');for(const [kind,label]of [['na','일반 공격'],['e','원소전투 스킬'],['q','원소폭발']]){const d=game.talentUpgradeInfo(owner,kind),card=el('section','card');card.append(el('h3','',label+' · Lv. '+d.level+' / '+d.cap));costs(card,d.cost);if(d.reason)card.append(el('p','choice-note',d.reason));card.append(button('특성 강화',()=>{close();act('TALENT_UPGRADE',{owner,kind});},busy||!!game.actionReason('TALENT_UPGRADE',{owner,kind}),true));box.append(card);}showModal('특성 강화 · '+game.growth(owner).name,box);};
const priorGrowth=growthScreen;growthScreen=function(p,...args){priorGrowth(p,...args);for(const card of p.querySelectorAll('.gear-member[data-owner]')){const owner=card.dataset.owner,g=game.growth(owner),line=el('div','growth-controls');line.append(el('small','','Lv. '+g.level+' / '+g.cap+' · 돌파 '+g.phase+' / 6'),button('캐릭터 돌파',()=>openCharacterAscension(owner)),button('특성 강화',()=>openCharacterTalent(owner)));card.append(line);}};
// ---------- 비경 입구 ----------
// 0.15.25 (user: 「비경 준비 이거 다 없애고 그냥 네가 만들어라 글만 적혀있고, 비경은 비경 같지도 않고 … 이런 그지같이 찾아서
// 누르는거 다 없애버려 그냥 편성이나 이런것도 일부러 없앴는데 글씨 좆같이도 써대네」; 「v 눌러서 고르는거 그거 아예 쓰지 말라」):
// no window, no lists to open, no party step. Where a domain stands, its gate shows the four stages and (ascension) the
// elements as pictures to press, the enemies' faces, the reward pictures and 「도전」.
// 0.16.3 (user: 「특성비경 따로 돌파 비경 따로 경험치 비경 따로」, 「비경 두배 표시 조금 이해가 잘 안가는 느낌이라 그거도 살짝 바꿔줘 글로
// 써도 될듯」): a domain gives one kind, its levels are pressed like the original's stages, and the daily double is one short
// line of words instead of a ×2 badge.
const KIND={TALENT:'특성',ASCENSION:'돌파',EXP:'경험치'};
const ELEMENTS=[['NEUTRAL','주인공',null],['PYRO','불','pyro'],['HYDRO','물','hydro'],['ANEMO','바람','anemo'],['ELECTRO','번개','electro'],['CRYO','얼음','cryo'],['GEO','바위','geo'],['DENDRO','풀','dendro']];
const picks={};
function picture(path,cls){if(!path)return null;const i=el('img',cls);i.src=path;i.alt='';i.draggable=false;i.decoding='async';return i;}
function elementPicture(key,cls){return picture(key&&MANIFEST.uiAssets?.elements?.[key]?.path,cls)||el('span',cls+' mark','✦');}
function rewardPicture(id,element){const own=picture(MANIFEST.itemIcons?.icons?.[id]?.path,'domain-reward-icon');if(own)return own;
 // Growth materials without their own picture yet: the element for a gem, the game's material-category icon otherwise.
 if(id.startsWith('GROWTH_GEM_'))return elementPicture(ELEMENTS.find(e=>e[0]===element)?.[2],'domain-reward-icon');return picture(MANIFEST.itemIcons?.categories?.CATEGORY_MATERIAL?.path,'domain-reward-icon')||el('span','domain-reward-icon mark','✦');}
function trialPicture(kind,region){
 if(kind==='TALENT')return picture(MANIFEST.itemIcons?.icons?.[region==='리월'?'GROWTH_TALENT_LIYUE':'GROWTH_TALENT_MOND']?.path,'domain-trial-icon')||el('span','domain-trial-icon exp','특성');
 if(kind==='ASCENSION')return picture(MANIFEST.itemIcons?.icons?.GROWTH_GEM_NEUTRAL?.path,'domain-trial-icon')||el('span','domain-trial-icon exp','돌파');
 return el('span','domain-trial-icon exp','EXP');
}
function domainGate(entries){
 const first=entries[0],key=first.key,last=game.s.lastGrowthDomain,lastHere=!!last&&entries.some(x=>x.id===last.domain);
 // The level last played here, else the highest one already open.
 const open=entries.filter(x=>!x.reason),pick=picks[key]??={id:lastHere?last.domain:(open[open.length-1]||first).id,element:lastHere&&last.element||'NEUTRAL'};
 const d=entries.find(x=>x.id===pick.id)||first,element=d.kind==='ASCENSION'?pick.element:'NEUTRAL',redraw=()=>card.replaceWith(domainGate(entries));
 const card=el('section','card growth-domains domain-gate');card.dataset.domain=key;card.dataset.kind=d.kind;
 const levels=first.levels||[first.level],range=levels.length>1?levels[0]+'–'+levels[levels.length-1]:levels[0];
 const rw=game.growthDomainRewards(d,element),head=el('div','domain-gate-head'),title=el('div','domain-gate-name');title.append(el('h2','',first.name),el('small','',KIND[first.kind]+' 비경 · Lv.'+range));head.append(trialPicture(first.kind,first.region),title);card.append(head);
 if(rw.doubles)card.append(el('p','domain-gate-double'+(rw.remaining?'':' spent'),rw.remaining?'오늘 첫 3번 승리는 재료 2배 · 남은 '+rw.remaining+'번':'오늘 재료 2배는 다 썼습니다 · 0시에 다시 3번'));
 if(entries.length>1){const tiers=el('div','domain-stages');tiers.setAttribute('role','radiogroup');tiers.setAttribute('aria-label',first.name+' 단계');
  for(const x of entries){const b=button('',()=>{pick.id=x.id;redraw();});b.className='domain-stage'+(x.id===d.id?' selected':'')+(x.reason?' locked':'');b.dataset.level=x.level;b.setAttribute('role','radio');b.setAttribute('aria-checked',String(x.id===d.id));b.setAttribute('aria-label','Lv.'+x.level+(x.reason?' · '+x.reason:''));b.title=b.getAttribute('aria-label');b.append(el('b','','Lv.'+x.level));if(x.lock)b.append(el('small','',x.lock));tiers.append(b);}
  card.append(tiers);}
 if(d.kind==='ASCENSION'){const row=el('div','domain-elements');row.setAttribute('role','radiogroup');row.setAttribute('aria-label','돌파 재료 원소');
  // The protagonist's own material has no element: its diamond picture stands for it.
  for(const [id,label,icon]of ELEMENTS){const b=button('',()=>{pick.element=id;redraw();});b.className='domain-element'+(id===element?' selected':'');b.setAttribute('role','radio');b.setAttribute('aria-checked',String(id===element));b.setAttribute('aria-label',label+(id==='NEUTRAL'?' 돌파 재료':' 원소 돌파 재료'));b.title=b.getAttribute('aria-label');b.append(icon?elementPicture(icon,'domain-element-icon'):picture(MANIFEST.itemIcons?.icons?.GROWTH_GEM_NEUTRAL?.path,'domain-element-icon')||elementPicture(null,'domain-element-icon'));row.append(b);}
  card.append(row);}
 const foes=el('div','domain-foes');foes.setAttribute('aria-label','나오는 적');
 for(const f of game.growthDomainFoes(d,element)){const box=el('span','domain-foe');box.title=f.name+' ×'+f.n;box.append(picture(enemyPortraitFor(f.id),'domain-foe-face')||el('span','domain-foe-face blank',f.name.slice(0,1)),el('b','','×'+f.n));foes.append(box);}
 const rewards=el('div','domain-rewards');rewards.setAttribute('aria-label','보상');
 for(const [id,n]of Object.entries(rw.items)){const chip=el('span','domain-reward');chip.title=name(id)+' ×'+n;chip.append(rewardPicture(id,element),el('b','','×'+n));rewards.append(chip);}
 // Experience goes to every fighter; no domain pays Mora (0.16.2).
 if(rw.xp){const xp=el('span','domain-reward xp'+(d.kind==='EXP'?' main':''));xp.title='경험치 '+fmt(rw.xp)+' · 함께 싸운 캐릭터마다';xp.append(el('span','domain-reward-icon exp','EXP'),el('b','',fmt(rw.xp)));rewards.append(xp);}
 const go=actionButton('도전','DOMAIN_START',{domain:d.id,element},true);go.classList.add('domain-go');
 const body=el('div','domain-gate-body');body.append(foes,rewards,go);card.append(body);return card;
}
window.domainGate=domainGate;
const priorLocation=drawLocation;drawLocation=function(p,...a){priorLocation(p,...a);if(game.s.placeVisit||game.s.runtime)return;
 // The domain comes first in its tab, before the ley lines.
 const byKey=new Map();for(const d of game.growthDomainEntries())(byKey.get(d.key)||byKey.set(d.key,[]).get(d.key)).push(d);const ley=p.querySelector('.ley-line-card');for(const entries of byKey.values()){const gate=domainGate(entries);if(ley)ley.before(gate);else p.append(gate);}
 const elite=game.growthEliteEntry();if(elite){const box=el('section','card growth-elite');box.append(el('h2','','지역 정예 토벌 · Lv. '+elite.level),el('p','',elite.reason||'한국 시간 하루 한 번 승리 보상'),actionButton('정예 토벌','ELITE_START',{},true));p.append(box);}};
// After a domain win or loss: the same stage again, one press (no party step).
const priorReward=reward;reward=function(p,...a){priorReward(p,...a);const last=game.s.lastGrowthDomain,r=parseUI(game.s.global.LAST_BATTLE_RESULT_JSON);if(!last||r.origin!=='DOMAIN:'+last.domain||!game.growthDomainEntries().some(x=>x.id===last.domain))return;const box=el('section','domain-retry');box.append(actionButton('같은 비경 다시 도전','DOMAIN_START',{domain:last.domain,element:last.element},true));p.append(box);};
})();
