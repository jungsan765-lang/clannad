/* v0.14.8 원석·스타라이트·스타더스트, 특성, 운명의 자리. They exist with no way to earn them yet (the user will add
 * one later); this is a non-profit fan game, so nothing here is ever bought with money.
 * - Currencies live next to Mora: global PRIMOGEM, STARGLITTER, STARDUST (whole numbers, 0 by default).
 * - Three exchanges (PREMIUM_BUY): 원석 상점, 스타라이트 상점, 스타더스트 상점. 운명의 별 · <character> unlocks that
 *   character's next 운명의 자리 (CONSTELLATION_UNLOCK), up to six.
 * - 특성: every fighter has 일반 공격 / 원소 전투 스킬 / 원소 폭발 at Lv.1-10 (s.talents; all Lv.1 for now). Each level
 *   above 1 adds 7.5% to that kind of hit.
 * - 운명의 자리 (s.constellations, 0-6), the same pattern for everyone: 1 skill damage +15%, 2 burst damage +15%,
 *   3 skill talent +3, 4 attack +10%, 5 burst talent +3, 6 all damage +15%.
 * With nobody holding a level above 1 or any 운명의 자리, combat is exactly as before. Numbers are CRPG rules. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.premiumV0148)return;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const PLAYER='PLAYER_CUSTOM';
const CURRENCY={PRIMOGEM:'원석',STARGLITTER:'스타라이트',STARDUST:'스타더스트'};
const STELLA=id=>'STELLA_'+id;
const TALENT={MAX:10,STEP:7.5,KEYS:['na','e','q']};
const CONSTELLATIONS=[
 {n:1,text:'원소 전투 스킬 피해 +15%'},{n:2,text:'원소 폭발 피해 +15%'},{n:3,text:'원소 전투 스킬 특성 레벨 +3'},
 {n:4,text:'공격력 +10%'},{n:5,text:'원소 폭발 특성 레벨 +3'},{n:6,text:'주는 모든 피해 +15%'}
];
// Shop offers. A 운명의 별 offer names the character when bought.
const OFFERS=[
 {id:'PRIMO_STELLA',shop:'PRIMOGEM',price:1600,label:'운명의 별 · 원하는 동료 1명',stella:true},
 {id:'PRIMO_STARDUST',shop:'PRIMOGEM',price:160,label:'스타더스트 ×75',give:{STARDUST:75}},
 {id:'GLITTER_STELLA',shop:'STARGLITTER',price:34,label:'운명의 별 · 원하는 동료 1명',stella:true},
 {id:'DUST_HERO_EXP',shop:'STARDUST',price:20,label:'영웅의 경험 ×1',items:{MAT_CHAR_EXP_HERO:1}},
 {id:'DUST_CRYSTAL',shop:'STARDUST',price:10,label:'수정덩이 ×2',items:{ORE_CRYSTAL:2}},
 {id:'DUST_MORA',shop:'STARDUST',price:10,label:'10,000 모라',mora:10000}
];
api.premiumV0148={currency:copy(CURRENCY),offers:copy(OFFERS),constellations:copy(CONSTELLATIONS),talent:copy(TALENT)};
const old=Object.fromEntries(['apply','actionReason','validateSave','combatDamageMultiplier','combatStat','installMarketContent'].map(k=>[k,P[k]]));
const int=x=>Math.max(0,Math.floor(Number(x)||0));
// ---- reads ----
P.premiumBalance=function(){const g=this.s.global;return Object.fromEntries(Object.keys(CURRENCY).map(k=>[k,int(g[k])]));};
P.constellationLevel=function(id){return Math.max(0,Math.min(6,int(this.s.constellations?.[id])));};
P.talentLevels=function(id){const t=this.s.talents?.[id]||{},c=this.constellationLevel(id),lv=k=>Math.max(1,Math.min(TALENT.MAX,int(t[k])||1));
 return {na:lv('na'),e:lv('e')+(c>=3?3:0),q:lv('q')+(c>=5?3:0),base:{na:lv('na'),e:lv('e'),q:lv('q')}};};
P.premiumOwns=function(id){return id===PLAYER||!!this.s.chars?.[id];};
P.premiumFighters=function(){const ids=[PLAYER,...Object.keys(this.s.chars||{}).filter(id=>this.tables['07_CHAR_DB']?.has(id))];return ids;};
P.talentCards=function(id){
 if(id===PLAYER){const own=String(this.s.global.PLAYER_SKILL_CARD_IDS||'').split(';').filter(Boolean),row=x=>this.tables['08_SKILL_CARD_DB']?.get(x);
  const e=own.find(x=>/_E$/.test(x)),q=own.find(x=>/_Q$/.test(x));return {e:e?{id:e,name:row(e)?.[3]||e,text:row(e)?.[16]||''}:null,q:q?{id:q,name:row(q)?.[3]||q,text:row(q)?.[16]||''}:null};}
 const rows=this.rows('08_SKILL_CARD_DB').filter(r=>r[2]===id),e=rows.find(r=>/_E$/.test(r[0])),q=rows.find(r=>/_Q$/.test(r[0]));
 return {e:e?{id:e[0],name:e[3],text:e[16]||''}:null,q:q?{id:q[0],name:q[3],text:q[16]||''}:null};
};
P.constellationView=function(id){
 const n=this.constellationLevel(id),name=id===PLAYER?(this.s.global.PLAYER_NAME||'주인공'):(this.tables['07_CHAR_DB']?.get(id)?.[1]||id);
 return {id,name,level:n,stella:STELLA(id),stellaCount:this.itemCount?this.itemCount(STELLA(id)):0,nodes:CONSTELLATIONS.map(c=>({...c,unlocked:n>=c.n})),reason:this.constellationReason(id)};
};
P.constellationReason=function(id){
 if(this.s.runtime)return '전투 중에는 열 수 없습니다.';
 if(!this.premiumOwns(id))return '함께하는 동료만 열 수 있습니다.';
 if(this.constellationLevel(id)>=6)return '운명의 자리를 모두 열었습니다.';
 if(!this.itemCount(STELLA(id)))return '운명의 별 · '+(this.tables['07_CHAR_DB']?.get(id)?.[1]||'주인공')+'이(가) 필요합니다.';
 return '';
};
P.premiumOfferReason=function(a={}){
 const o=OFFERS.find(x=>x.id===a.offer);if(!o)return '상품을 골라 주세요.';
 if(this.s.runtime)return '전투 중에는 교환할 수 없습니다.';
 if(int(this.s.global[o.shop])<o.price)return CURRENCY[o.shop]+'이(가) 부족합니다.';
 if(o.stella){if(!a.char||!this.premiumOwns(a.char))return '운명의 별을 받을 동료를 골라 주세요.';if(this.constellationLevel(a.char)+this.itemCount(STELLA(a.char))>=6)return '이 동료는 더 이상 운명의 별이 필요하지 않습니다.';}
 return '';
};
// ---- actions ----
P.actionReason=function(type,a={}){
 const base=old.actionReason.call(this,type,a);if(base)return base;
 if(type==='CONSTELLATION_UNLOCK')return this.constellationReason(a.char);
 if(type==='PREMIUM_BUY')return this.premiumOfferReason(a);
 return '';
};
P.apply=function(a){
 if(a?.type==='CONSTELLATION_UNLOCK'){const why=this.constellationReason(a.char);if(why)fail('CONSTELLATION',why);
  this.pay({mora:0,items:{[STELLA(a.char)]:1}});(this.s.constellations??={})[a.char]=this.constellationLevel(a.char)+1;
  return {char:a.char,level:this.s.constellations[a.char]};}
 if(a?.type==='PREMIUM_BUY'){const why=this.premiumOfferReason(a);if(why)fail('PREMIUM_SHOP',why);const o=OFFERS.find(x=>x.id===a.offer),g=this.s.global;
  g[o.shop]=int(g[o.shop])-o.price;
  for(const [k,n]of Object.entries(o.give||{}))g[k]=int(g[k])+n;
  for(const [id,n]of Object.entries(o.items||{}))this.giveItem(id,n);
  if(o.mora)g.MORA=int(g.MORA)+o.mora;
  if(o.stella)this.giveItem(STELLA(a.char),1);
  return {offer:o.id,char:a.char||null,balance:this.premiumBalance()};}
 return old.apply.call(this,a);
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,g=out.global||{};
 for(const k of Object.keys(CURRENCY))if(g[k]!==undefined&&!(Number.isSafeInteger(g[k])&&g[k]>=0))fail('PREMIUM_SAVE',CURRENCY[k]+' 기록이 올바르지 않습니다.');
 for(const [id,n]of Object.entries(out.constellations||{}))if(!Number.isInteger(n)||n<0||n>6||!(id===PLAYER||this.tables['07_CHAR_DB']?.has(id)))fail('PREMIUM_SAVE','운명의 자리 기록이 올바르지 않습니다.');
 for(const [id,t]of Object.entries(out.talents||{})){if(!t||typeof t!=='object')fail('PREMIUM_SAVE','특성 기록이 올바르지 않습니다.');for(const k of TALENT.KEYS)if(t[k]!==undefined&&!(Number.isInteger(t[k])&&t[k]>=1&&t[k]<=TALENT.MAX))fail('PREMIUM_SAVE','특성 기록이 올바르지 않습니다.');}
 return out;
};
// ---- combat ----
const kindOf=o=>{const c=String(o?.card||'');if(/_E$/.test(c))return 'e';if(/_Q$/.test(c))return 'q';if(!c&&!o?.sourceKind)return 'na';if(c==='PLAYER_BASIC_ATTACK')return 'na';return null;};
P.combatDamageMultiplier=function(a,t,e,o={}){
 let n=old.combatDamageMultiplier.call(this,a,t,e,o);if(a?.side!=='ALLY'||!a.source)return n;
 const kind=kindOf(o),c=this.constellationLevel(a.source);
 if(kind){const lv=this.talentLevels(a.source)[kind];if(lv>1)n*=1+TALENT.STEP*(lv-1)/100;}
 if(c>=1&&kind==='e')n*=1.15;if(c>=2&&kind==='q')n*=1.15;if(c>=6)n*=1.15;
 return n;
};
P.combatStat=function(a,key){let n=old.combatStat.call(this,a,key);if(key==='atk'&&a?.side==='ALLY'&&a.source&&this.constellationLevel(a.source)>=4)n*=1.1;return n;};
// ---- tables: one 운명의 별 per fighter ----
P.installMarketContent=function(...args){
 const out=old.installMarketContent?old.installMarketContent.apply(this,args):undefined;
 if(this._premiumV0148)return out;this._premiumV0148=true;
 this.db={...this.db};const rows=this.db['14_ITEM_DB'].map(r=>r.slice());
 const add=(id,name)=>{if(rows.some(r=>r[0]===STELLA(id)))return;rows.push([STELLA(id),'운명의 별 · '+name,'운명의 별','전설','[운명]',name+'의 운명의 자리를 하나 여는 별. 장비·성장 화면의 운명의 자리에서 쓴다.','비전투','운명의 자리 해금',null,null,'N',null,null,null,0,0,6,'원석·스타라이트 상점','N','N','공용','CRPG 0.14.8','']);};
 add(PLAYER,'주인공');for(const r of this.db['07_CHAR_DB'].slice(1))if(r?.[0])add(r[0],r[1]);
 this.db['14_ITEM_DB']=rows;this.tables['14_ITEM_DB']=new Map(rows.slice(1).filter(r=>r&&r[0]).map(r=>[r[0],r]));
 return out;
};
P.premiumV0148=true;
})(typeof window!=='undefined'?window:globalThis);
