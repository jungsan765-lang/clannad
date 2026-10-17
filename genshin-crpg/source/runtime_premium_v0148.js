/* v0.14.8 원석·스타라이트·스타더스트, 특성, 운명의 자리; v0.14.11 인연·교환·특성 곡선. This is a non-profit fan game,
 * so nothing here is ever bought with money, and there is still no way to earn 원석 in play (the operator can grant some
 * for testing).
 * - Currencies live next to Mora: global PRIMOGEM, STARGLITTER, STARDUST, INTERTWINED_FATE (뒤얽힌 인연, event wish)
 *   and ACQUAINT_FATE (만남의 인연, standard wish) — whole numbers, 0 by default. Wishes are in runtime_wish_v01411.js.
 * - PREMIUM_BUY offers: 원석 160 → one fate of either kind (1-10 at a time); 스타라이트 → the 운명의 별 of a chosen
 *   fighter (5★ and the protagonist 100, 4★ 25; 0.16.13); four field boss materials → 1 스타라이트;
 *   스타더스트 → 인연 (75 each, five of each kind a month; 0.15.1), 영웅의 경험 or Mora. The boss exchange and the other
 *   stardust offers have weekly limits (Korean time, the week turns on Monday 00:00, the month on the 1st; the server's action
 *   clock decides online).
 * - 운명의 별 · <character> unlocks that character's next 운명의 자리 (CONSTELLATION_UNLOCK), up to six. What each
 *   level does is in runtime_constellations_v01411.js.
 * - 특성: every fighter has 일반 공격 / 원소전투 스킬 / 원소폭발 at Lv.1-10 (s.talents; all Lv.1 for now), up to 13 with
 *   C3 and C5. A level multiplies that kind of hit along a rising curve (Lv.1 100% … Lv.10 208% … Lv.13 262%), so each
 *   level is worth more than the one before.
 * With nobody holding a level above 1 or any 운명의 자리, combat is exactly as before. Numbers are CRPG rules. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.premiumV0148)return;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const PLAYER='PLAYER_CUSTOM';
const CURRENCY={PRIMOGEM:'원석',STARGLITTER:'스타라이트',STARDUST:'스타더스트',INTERTWINED_FATE:'뒤얽힌 인연',ACQUAINT_FATE:'만남의 인연'};
const STELLA=id=>'STELLA_'+id;
const TALENT={MAX:10,CAP:13,KEYS:['na','e','q'],CURVE:[100,108,117,127,138,150,163,177,192,208,225,243,262]};
// Weekly limits count in Korean time; the week turns on Monday 00:00.
const KST=9*3600000,DAY=86400000,WEEK=7*DAY;
const weekOf=now=>Math.floor((now+KST+3*DAY)/WEEK);
const monthOf=now=>{const d=new Date(now+KST);return d.getUTCFullYear()*12+d.getUTCMonth();};
const BOSS_MATERIALS=['MAT_FB_HURRICANE_SEED','MAT_FB_LIGHTNING_PRISM','MAT_FB_BASALT_PILLAR','MAT_FB_HOARFROST_CORE','MAT_FB_EVERFLAME_SEED','MAT_FB_CLEANSING_HEART','MAT_FB_JUVENILE_JADE','MAT_FB_CRYSTALLINE_BLOOM','MAT_FB_RUNIC_FANG'];
const OFFERS=[
 {id:'FATE_INTERTWINED',shop:'PRIMOGEM',price:160,label:'뒤얽힌 인연',give:{INTERTWINED_FATE:1},bulk:10,note:'이벤트 기원에 쓰는 인연'},
 {id:'FATE_ACQUAINT',shop:'PRIMOGEM',price:160,label:'만남의 인연',give:{ACQUAINT_FATE:1},bulk:10,note:'상시 기원에 쓰는 인연'},
 {id:'GLITTER_STELLA',shop:'STARGLITTER',price:100,label:'운명의 별 · 원하는 동료 1명',stella:true,note:'5★ 동료와 주인공 100, 4★ 동료 25'},
 {id:'BOSS_GLITTER',shop:'BOSS',price:4,label:'스타라이트 ×1',give:{STARGLITTER:1},boss:true,weekly:5,note:'같은 필드 보스 재료 4개'},
 // 0.15.1: 스타더스트 buys fates as in the original, five of each a month (user: 「스타더스트도 좀 과하게 나오거나,
 // 쓸데가 없다거나 그런 경우가 있는것 같아서」). The month turns on the 1st at 00:00, Korean time.
 {id:'DUST_ACQUAINT',shop:'STARDUST',price:75,label:'만남의 인연',give:{ACQUAINT_FATE:1},monthly:5,note:'상시 기원에 쓰는 인연'},
 {id:'DUST_INTERTWINED',shop:'STARDUST',price:75,label:'뒤얽힌 인연',give:{INTERTWINED_FATE:1},monthly:5,note:'이벤트 기원에 쓰는 인연'},
 {id:'DUST_HERO_EXP',shop:'STARDUST',price:20,label:'영웅의 경험 ×1',items:{MAT_CHAR_EXP_HERO:1},weekly:5},
 // 0.14.12: about one 부의 꽃 (1,200~2,600) per exchange; 500 was less than half the smallest blossom.
 {id:'DUST_MORA',shop:'STARDUST',price:10,label:'모라 ×2,000',mora:2000,weekly:5}
];
api.premiumV0148={currency:copy(CURRENCY),offers:copy(OFFERS),talent:copy(TALENT),bossMaterials:copy(BOSS_MATERIALS),weekOf,monthOf};
const old=Object.fromEntries(['apply','actionReason','validateSave','combatDamageMultiplier','installMarketContent'].map(k=>[k,P[k]]));
const int=x=>Math.max(0,Math.floor(Number(x)||0));
// ---- reads ----
P.premiumNow=function(){return Number(this.actionStartedAt??Date.now());};
P.premiumWeek=function(){return weekOf(this.premiumNow());};
P.premiumBalance=function(){const g=this.s.global;return Object.fromEntries(Object.keys(CURRENCY).map(k=>[k,int(g[k])]));};
P.premiumWeeklyUsed=function(offer){const w=this.s.premiumWeekly;return w&&w.week===this.premiumWeek()?int(w.bought?.[offer]):0;};
P.premiumWeekReset=function(){const now=this.premiumNow(),next=(this.premiumWeek()+1)*WEEK-KST-3*DAY;return {at:next,hours:Math.max(0,Math.ceil((next-now)/3600000))};};
P.premiumMonth=function(){return monthOf(this.premiumNow());};
P.premiumMonthlyUsed=function(offer){const m=this.s.premiumMonthly;return m&&m.month===this.premiumMonth()?int(m.bought?.[offer]):0;};
P.constellationLevel=function(id){return Math.max(0,Math.min(6,int(this.s.constellations?.[id])));};
P.premiumRarity=function(id){if(id===PLAYER)return 5;return this.constellationInfo?.(id)?.rarity||4;};
P.premiumStellaPrice=function(id){return this.premiumRarity(id)>=5?100:25;};
P.talentLevels=function(id){
 const t=this.s.talents?.[id]||{},c=this.constellationLevel(id),kinds=this.constellationTalentKinds?.(id)||{c3:'e',c5:'q'},lv=k=>Math.max(1,Math.min(TALENT.MAX,int(t[k])||1));
 const base={na:lv('na'),e:lv('e'),q:lv('q')},out={...base};
 if(c>=3)out[kinds.c3]=Math.min(TALENT.CAP,out[kinds.c3]+3);if(c>=5)out[kinds.c5]=Math.min(TALENT.CAP,out[kinds.c5]+3);
 return {...out,base,kinds};
};
// A fighter or a character id. 0.15.3: a fighter brought from another adventurer's journey (다인 모드) carries its own
// talent levels (talentSnapshot, C3/C5 already added).
P.premiumTalentMultiplier=function(x,kind){const actor=x&&typeof x==='object'?x:null,levels=actor?.talentSnapshot||this.talentLevels(actor?actor.source:x),lv=Number(levels?.[kind])||0;return lv?TALENT.CURVE[Math.max(1,Math.min(TALENT.CAP,lv))-1]/100:1;};
// Only companions who have joined (their own story) count; every character has a stat block from the start.
P.premiumOwns=function(id){if(id===PLAYER)return true;if(!this.s.chars?.[id])return false;try{return JSON.parse(this.s.global.COMPANION_ELIGIBILITY_JSON||'{}')[id]?.state==='JOINED';}catch{return false;}};
P.premiumFighters=function(){return [PLAYER,...Object.keys(this.s.chars||{}).filter(id=>this.tables['07_CHAR_DB']?.has(id)&&this.premiumOwns(id))];};
P.premiumCharName=function(id){return id===PLAYER?(this.s.global.PLAYER_NAME||'주인공'):(this.tables['07_CHAR_DB']?.get(id)?.[1]||id);};
P.talentCards=function(id){
 if(id===PLAYER){const own=String(this.s.global.PLAYER_SKILL_CARD_IDS||'').split(';').filter(Boolean),row=x=>this.tables['08_SKILL_CARD_DB']?.get(x);
  const e=own.find(x=>/_E$/.test(x)),q=own.find(x=>/_Q$/.test(x));return {e:e?{id:e,name:row(e)?.[3]||e,text:row(e)?.[16]||''}:null,q:q?{id:q,name:row(q)?.[3]||q,text:row(q)?.[16]||''}:null};}
 const rows=this.rows('08_SKILL_CARD_DB').filter(r=>r[2]===id),e=rows.find(r=>/_E$/.test(r[0])),q=rows.find(r=>/_Q$/.test(r[0]));
 return {e:e?{id:e[0],name:e[3],text:e[16]||''}:null,q:q?{id:q[0],name:q[3],text:q[16]||''}:null};
};
P.constellationView=function(id){
 const n=this.constellationLevel(id),info=this.constellationInfo?.(id);
 return {id,name:this.premiumCharName(id),level:n,group:info?.group||'',rarity:this.premiumRarity(id),stella:STELLA(id),stellaCount:this.itemCount?this.itemCount(STELLA(id)):0,
  nodes:(info?.nodes||[]).map(c=>({...c,unlocked:n>=c.n})),reason:this.constellationReason(id)};
};
P.constellationReason=function(id){
 if(this.s.runtime)return '전투 중에는 열 수 없습니다.';
 if(!this.premiumOwns(id))return '함께하는 동료만 열 수 있습니다.';
 if(this.constellationLevel(id)>=6)return '운명의 자리를 모두 열었습니다.';
 if(!this.itemCount(STELLA(id)))return '운명의 별 · '+this.premiumCharName(id)+'이(가) 필요합니다.';
 return '';
};
P.premiumOfferReason=function(a={}){
 const o=OFFERS.find(x=>x.id===a.offer);if(!o)return '상품을 골라 주세요.';
 if(this.s.runtime)return '전투 중에는 교환할 수 없습니다.';
 const count=a.count===undefined?1:a.count;
 if(!Number.isInteger(count)||count<1||count>(o.bulk||1))return '수량을 확인해 주세요.';
 if(o.weekly&&this.premiumWeeklyUsed(o.id)+count>o.weekly)return '이번 주에는 더 교환할 수 없습니다. (주간 '+o.weekly+'회, 월요일 0시 초기화)';
 if(o.monthly&&this.premiumMonthlyUsed(o.id)+count>o.monthly)return '이번 달에는 더 교환할 수 없습니다. (매달 '+o.monthly+'회, 1일 0시 초기화)';
 if(o.boss){if(!BOSS_MATERIALS.includes(a.item))return '교환할 필드 보스 재료를 골라 주세요.';if(this.itemCount(a.item)<o.price*count)return '같은 필드 보스 재료가 '+(o.price*count)+'개 필요합니다.';return '';}
 if(o.stella){
  if(!a.char||!this.premiumOwns(a.char))return '운명의 별을 받을 동료를 골라 주세요.';
  if(this.constellationLevel(a.char)+this.itemCount(STELLA(a.char))>=6)return '이 동료는 더 이상 운명의 별이 필요하지 않습니다.';
  if(int(this.s.global.STARGLITTER)<this.premiumStellaPrice(a.char))return '스타라이트가 부족합니다.';
  return '';
 }
 if(int(this.s.global[o.shop])<o.price*count)return CURRENCY[o.shop]+'이(가) 부족합니다.';
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
 if(a?.type==='PREMIUM_BUY'){const why=this.premiumOfferReason(a);if(why)fail('PREMIUM_SHOP',why);const o=OFFERS.find(x=>x.id===a.offer),g=this.s.global,count=a.count===undefined?1:a.count;
  if(o.boss)this.pay({mora:0,items:{[a.item]:o.price*count}});
  else if(o.stella)g.STARGLITTER=int(g.STARGLITTER)-this.premiumStellaPrice(a.char);
  else g[o.shop]=int(g[o.shop])-o.price*count;
  for(const [k,n]of Object.entries(o.give||{}))g[k]=int(g[k])+n*count;
  for(const [id,n]of Object.entries(o.items||{}))this.giveItem(id,n*count);
  if(o.mora)g.MORA=int(g.MORA)+o.mora*count;
  if(o.stella)this.giveItem(STELLA(a.char),1);
  if(o.weekly){const w=this.premiumWeek();if(this.s.premiumWeekly?.week!==w)this.s.premiumWeekly={week:w,bought:{}};this.s.premiumWeekly.bought[o.id]=int(this.s.premiumWeekly.bought[o.id])+count;}
  if(o.monthly){const m=this.premiumMonth();if(this.s.premiumMonthly?.month!==m)this.s.premiumMonthly={month:m,bought:{}};this.s.premiumMonthly.bought[o.id]=int(this.s.premiumMonthly.bought[o.id])+count;}
  return {offer:o.id,count,char:a.char||null,item:a.item||null,balance:this.premiumBalance()};}
 return old.apply.call(this,a);
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,g=out.global||{};
 for(const k of Object.keys(CURRENCY))if(g[k]!==undefined&&!(Number.isSafeInteger(g[k])&&g[k]>=0))fail('PREMIUM_SAVE',CURRENCY[k]+' 기록이 올바르지 않습니다.');
 for(const [id,n]of Object.entries(out.constellations||{}))if(!Number.isInteger(n)||n<0||n>6||!(id===PLAYER||this.tables['07_CHAR_DB']?.has(id)))fail('PREMIUM_SAVE','운명의 자리 기록이 올바르지 않습니다.');
 for(const [id,t]of Object.entries(out.talents||{})){if(!t||typeof t!=='object')fail('PREMIUM_SAVE','특성 기록이 올바르지 않습니다.');for(const k of TALENT.KEYS)if(t[k]!==undefined&&!(Number.isInteger(t[k])&&t[k]>=1&&t[k]<=TALENT.MAX))fail('PREMIUM_SAVE','특성 기록이 올바르지 않습니다.');}
 const w=out.premiumWeekly;if(w!==undefined&&w!==null&&(typeof w!=='object'||!Number.isInteger(w.week)||!w.bought||typeof w.bought!=='object'||Object.entries(w.bought).some(([k,n])=>!OFFERS.some(o=>o.id===k)||!Number.isInteger(n)||n<0)))fail('PREMIUM_SAVE','주간 교환 기록이 올바르지 않습니다.');
 const m=out.premiumMonthly;if(m!==undefined&&m!==null&&(typeof m!=='object'||!Number.isInteger(m.month)||!m.bought||typeof m.bought!=='object'||Object.entries(m.bought).some(([k,n])=>!OFFERS.some(o=>o.id===k&&o.monthly)||!Number.isInteger(n)||n<0)))fail('PREMIUM_SAVE','월간 교환 기록이 올바르지 않습니다.');
 return out;
};
// ---- combat: talent levels ----
// The kind of hit: a fighter's own skill (_E, the protagonist's _E_CHARGE-style follow-ups) or burst (_Q), or a plain
// attack. Another fighter's card used on their behalf (이세계인's joint attack) is a plain strike for them.
P.premiumHitKind=function(a,o={}){
 const c=String(o?.card||'');
 if(c){
  if(c==='PLAYER_BASIC_ATTACK')return 'na';
  const owner=/^PLAYER_/.test(c)?PLAYER:this.tables['08_SKILL_CARD_DB']?.get(c)?.[2]||null;
  if(owner&&a?.source&&owner!==a.source)return c==='PLAYER_ISEKAI_Q'?'na':null;
  if(/_E(_CHARGE)?$/.test(c))return 'e';if(/_Q$/.test(c))return 'q';return null;
 }
 return o?.sourceKind?null:'na';
};
P.combatDamageMultiplier=function(a,t,e,o={}){
 let n=old.combatDamageMultiplier.call(this,a,t,e,o);if(a?.side!=='ALLY'||!a.source)return n;
 const kind=this.premiumHitKind(a,o);if(kind&&!o.skipTalentMultiplier)n*=this.premiumTalentMultiplier(a,kind);
 return n;
};
// ---- tables: one 운명의 별 per fighter ----
P.installMarketContent=function(...args){
 const out=old.installMarketContent?old.installMarketContent.apply(this,args):undefined;
 if(this._premiumV0148)return out;this._premiumV0148=true;
 this.db={...this.db};const rows=this.db['14_ITEM_DB'].map(r=>r.slice());
 const add=(id,name)=>{if(rows.some(r=>r[0]===STELLA(id)))return;rows.push([STELLA(id),'운명의 별 · '+name,'운명의 별','전설','[운명]',name+'의 운명의 자리를 하나 여는 별. 캐릭터 화면의 운명의 자리에서 쓴다.','비전투','운명의 자리 해금',null,null,'N',null,null,null,0,0,6,'기원·스타라이트 교환','N','N','공용','CRPG 0.14.8','']);};
 add(PLAYER,'주인공');for(const r of this.db['07_CHAR_DB'].slice(1))if(r?.[0])add(r[0],r[1]);
 this.db['14_ITEM_DB']=rows;this.tables['14_ITEM_DB']=new Map(rows.slice(1).filter(r=>r&&r[0]).map(r=>[r[0],r]));
 return out;
};
P.premiumV0148=true;
})(typeof window!=='undefined'?window:globalThis);
