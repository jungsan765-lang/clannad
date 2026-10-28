/* 0.14.12: 4★ and 5★ companions differ, in strength and in how hard they are to recruit.
 * User: 「4성하고 5성 캐릭터를 나누게 되었으니 그만큼 차이도」, 「획득 방법도 4성보다는 5성이 훨씬 어려워야」,
 * 「리월 동료 획득 조건은 조금 빡세야 돼」, and the handbook did not say what each condition meant.
 * - Strength: every 5★ companion's base HP, ATK and DEF are 10% higher. The protagonist keeps its own numbers.
 * - Recruitment (the personal missions that open a companion):
 *   Liyue 4★: protagonist Lv.10/12/14/16 by story chapter (+2), and two of the field boss material their exclusive
 *             weapon is forged from at every chapter (it used to be chapter 3 on).
 *   Liyue 5★: at least chapter 2, Lv.16/18/19, 8/10/12 Geo oculi collected, preparation Mora ×1.5 and four boss
 *             materials.
 *   Mond 5★:  the Mond story cleared, Lv.10, 6 Anemoculi, +1,000 Mora and two boss materials. Mond 4★ are unchanged.
 *   The archons (Venti, Zhongli) and event-only companions keep their own ways. A mission already paid for and under
 *   way is not stopped by the new terms.
 * - Every requirement now carries a hint (what to do, where an item comes from) for the handbook and companion screen. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.rarityV01412)return;
const json=x=>{try{return JSON.parse(x||'{}');}catch{return {};}};
const FIVE_BONUS=1.1,STATS=[7,8,9];// 07_CHAR_DB BASE_HP, BASE_ATK, BASE_DEF
const LIYUE_LEVEL={1:10,2:12,3:14,4:16},LIYUE5_OCULI={2:8,3:10,4:12};
const MOND5={level:10,oculi:6,mora:1000,boss:2};
const MOND_CLEAR={ROUTE_TRAVELER:'FLAG_TRV_MON_CH2_CLEAR',ROUTE_ISEKAI:'FLAG_ISK_M05_CLEAR'};
const ARCHONS=new Set(['MOND_VENTI','LIYUE_ZHONGLI']);
const OCULI={geo:'바위 신의 눈동자',wind:'바람 신의 눈동자'};
const liyueQuest=(route,stage)=>(route==='ROUTE_ISEKAI'?'Q_ISK_LIYUE_0':'Q_TRV_LIYUE_0')+stage;
const materialOf=id=>api.exclusiveWeapons?.weapons?.find(w=>w.owner===id)?.material||null;
const old={installMarketContent:P.installMarketContent,storyIndex:P.storyIndex,legendRequirements:P.legendRequirements,actionReason:P.actionReason};
P.rarityOf=function(id){try{return this.premiumRarity?.(id)===5?5:4;}catch{return 4;}};
P.legendOwner=function(d){return this.tables['04_CHAR_DB']?.get(d?.PROFILE_ID)?.[1]||d?.CHAR_ID||d?.CHARACTER_ID||null;};
// ---- strength ----
P.installMarketContent=function(...args){
 const out=old.installMarketContent?old.installMarketContent.apply(this,args):undefined;
 if(this._rarityV01412)return out;this._rarityV01412=true;
 const rows=this.db['07_CHAR_DB'].map(r=>r.slice());
 for(const r of rows.slice(1)){if(!r?.[0]||r[0]==='PLAYER_CUSTOM'||this.rarityOf(r[0])!==5)continue;for(const k of STATS){const v=Number(r[k]);if(Number.isFinite(v))r[k]=Math.round(v*FIVE_BONUS);}}
 this.db={...this.db,'07_CHAR_DB':rows};this.tables['07_CHAR_DB']=new Map(rows.slice(1).filter(r=>r&&r[0]).map(r=>[r[0],r]));
 return out;
};
// ---- recruitment terms ----
P.storyIndex=function(){
 const ix=old.storyIndex.call(this);if(ix.rarityV01412)return ix;
 for(const d of ix.legends.values()){
  const id=this.legendOwner(d);if(!id||ARCHONS.has(id)||this.recruitEventOnly?.(id)||!['리월','몬드'].includes(d.REGION))continue;
  const five=this.rarityOf(id)===5,mat=materialOf(id),items=json(d.COST_ITEMS_JSON),row=ix.nodes.get(d.ROUTE_SCOPE+':'+d.ENTRY_NODE_ID);
  if(d.REGION==='리월'&&d.LIYUE_RECRUIT_STAGE){
   const stage=five?Math.max(2,Number(d.LIYUE_RECRUIT_STAGE)):Number(d.LIYUE_RECRUIT_STAGE),level=five?Math.min(19,LIYUE_LEVEL[stage]+4):LIYUE_LEVEL[stage];
   d.START_CONDITION=String(d.START_CONDITION).replace(/DONE\(Q_[A-Z]+_LIYUE_0\d\)=TRUE/,'DONE('+liyueQuest(d.ROUTE_SCOPE,stage)+')=TRUE').replace(/PLAYER_LEVEL_STATE>=\d+/,'PLAYER_LEVEL_STATE>='+level);
   d.LIYUE_RECRUIT_STAGE=stage;d.LIYUE_RECRUIT_LEVEL=level;
   if(mat)items[mat]=five?4:Math.max(2,items[mat]||0);
   if(five){d.COST_MORA=Math.round(Number(d.COST_MORA||0)*1.5/50)*50;d.RARITY_OCULI={kind:'geo',count:LIYUE5_OCULI[stage]};}
   if(row)row[11]=d.START_CONDITION;
  }else if(d.REGION==='몬드'&&five){
   const flag=MOND_CLEAR[d.ROUTE_SCOPE],extra=[flag&&!String(d.START_CONDITION||'').includes(flag)?flag+'=TRUE':'',/PLAYER_LEVEL_STATE>=/.test(d.START_CONDITION||'')?'':'PLAYER_LEVEL_STATE>='+MOND5.level].filter(Boolean).join(' && ');
   if(extra){d.START_CONDITION=(d.START_CONDITION?d.START_CONDITION+' && ':'')+extra;if(row?.[11])row[11]=String(row[11])+' && '+extra;}
   d.MOND_RECRUIT_LEVEL=MOND5.level;if(mat)items[mat]=Math.max(MOND5.boss,items[mat]||0);
   d.COST_MORA=Number(d.COST_MORA||0)+MOND5.mora;d.RARITY_OCULI={kind:'wind',count:MOND5.oculi};
  }else continue;
  d.COST_ITEMS_JSON=JSON.stringify(items);d.RARITY=five?5:4;
 }
 Object.defineProperty(ix,'rarityV01412',{value:true});return ix;
};
// A mission already paid for (or finished) keeps going under the terms it began with.
P.legendUnderWay=function(d){return !!d&&(!!this.s.storyCostReceipts?.[d.QUEST_ID]||this.storyDone(d.id)||this.s.storyContext?.entry===d.id);};
P.legendOculiNeed=function(d){
 const need=d?.RARITY_OCULI;if(!need)return null;
 const sum=need.kind==='geo'?this.geoOculusSummary?.():this.oculusSummary?.(),have=Number(sum?.collected)||0;
 return {kind:need.kind,count:need.count,have,met:have>=need.count,label:OCULI[need.kind]+' '+have+' / '+need.count+'개 모으기'};
};
const HINT={
 story:d=>'임무 화면에서 '+(d.REGION==='리월'?'리월':'몬드')+' 본편을 진행하면 채워집니다.',
 level:()=>'전투·의뢰·계시의 꽃(지맥)으로 주인공 경험치를 모으세요.',
 oculi:d=>(d.RARITY_OCULI?.kind==='geo'?'리월':'몬드')+' 곳곳에서 빛나는 눈동자를 찾아 모으세요. 핸드북 「여정」에서 수집 현황을 볼 수 있습니다.',
 map:()=>'그 지역으로 이동하면 채워집니다.',
 introduction:()=>'그곳에서 대화하면 이 동료의 개인 임무를 소개받습니다.',
 event:()=>'이벤트로만 합류합니다.',
 content:()=>'아직 이 루트에서는 만날 수 없습니다.'
};
P.legendRequirements=function(d,opts={}){
 const out=old.legendRequirements.call(this,d,opts);if(!d||!out.length)return out;
 const g=this.s.global,lv=Number(g.PLAYER_LEVEL_STATE)||1,at=Math.max(0,out.map(r=>r.kind).lastIndexOf('story')+1);
 if(d.MOND_RECRUIT_LEVEL&&!out.some(r=>r.kind==='level'))out.splice(at,0,{label:'주인공 Lv. '+d.MOND_RECRUIT_LEVEL+' 이상 · 현재 Lv. '+lv,met:lv>=d.MOND_RECRUIT_LEVEL,kind:'level'});
 const oc=this.legendOculiNeed(d);if(oc&&!this.legendUnderWay(d)){const i=Math.max(0,out.map(r=>r.kind).lastIndexOf('level')+1)||at;out.splice(i,0,{label:oc.label,met:oc.met,kind:'oculi'});}
 // Hints: what to do, or where a preparation item comes from.
 const items=this.tables['14_ITEM_DB'],cost=this.legendEffectiveCost?.(d)||{items:{}};
 for(const r of out){
  if(r.hint)continue;
  if(r.kind==='cost'){
   if(/모라/.test(r.label)&&/^준비 비용/.test(r.label)){r.hint='개인 임무를 시작할 때 냅니다.';continue;}
   const id=Object.keys(cost.items||{}).find(k=>r.label.startsWith((items?.get(k)?.[1]||k)+' '));const src=id&&items?.get(id)?.[17];
   if(src)r.hint='얻는 곳 · '+src+(String(id).startsWith('MAT_FB_')?' (필드 보스)':'');continue;
  }
  const h=HINT[r.kind];if(h)r.hint=h(d);
 }
 if(d.RARITY)for(const r of out)r.rarity=d.RARITY;
 return out;
};
P.actionReason=function(type,a={}){
 if(type==='LEGEND_REGISTER'||type==='LEGEND_ENTER'){
  const d=this.storyDefinition?.(a.quest||a.id),oc=this.legendOculiNeed(d);
  if(oc&&!oc.met&&!this.legendUnderWay(d))return oc.label+'가 필요합니다. (지금 '+oc.have+'개)';
 }
 return old.actionReason.call(this,type,a);
};
P.rarityV01412=true;
api.rarityV01412={fiveBonus:FIVE_BONUS,liyueLevel:{...LIYUE_LEVEL},liyue5Oculi:{...LIYUE5_OCULI},mond5:{...MOND5}};
})(typeof window!=='undefined'?window:globalThis);
