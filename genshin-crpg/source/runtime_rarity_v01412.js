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

/* Keep preparation dialogue, choice gates and deductions on the final recruitment cost.
 * Story amounts outside these audited preparation lines are intentionally untouched. */
(function(root){'use strict';
const P=root.CRPGRuntime.Runtime.prototype;
const old={index:P.storyIndex,condition:P.storyConditionValue,text:P.storyDisplayText,choices:P.storyChoices};
const MORA_ROWS=new Set([
 "LEG_MOND_MONA_N020","LEG_LIYUE_NINGGUANG_NG_B","LEG_LIYUE_NINGGUANG_PREP_GATE",
 "LEG_LIYUE_YELAN_YL_B","LEG_LIYUE_YELAN_PREP_GATE","LEG_LIYUE_BAIZHU_L06",
 "LEG_LIYUE_BAIZHU_PREP_GATE","LEG_LIYUE_QIQI_L06","LEG_LIYUE_QIQI_PREP_GATE",
 "LEG_LIYUE_GAMING_L04","LEG_LIYUE_GAMING_PREP_GATE","LEG_LIYUE_GANYU_L04",
 "LEG_LIYUE_GANYU_PREP_GATE","LEG_LIYUE_XINGQIU_PREP_GATE","LEG_LIYUE_HUTAO_PREP_GATE",
 "LEG_LIYUE_HUTAO_N009","LEG_LIYUE_XIANGLING_PREP_GATE","LEG_LIYUE_XIANGLING_N009",
 "LEG_LIYUE_LANYAN_INTRO04","LEG_LIYUE_LANYAN_PREP_GATE","LEG_LIYUE_SHENHE_INTRO04",
 "LEG_LIYUE_SHENHE_PREP_GATE","LEG_LIYUE_TARTAGLIA_INTRO04","LEG_LIYUE_TARTAGLIA_PREP_GATE",
 "LEG_LIYUE_YANFEI_N006","LEG_LIYUE_YUNJIN_N006","LEG_LIYUE_YAOYAO_N006",
 "LEG_ISK_LIYUE_NINGGUANG_PREP_YES","LEG_ISK_LIYUE_YELAN_PREP_YES","LEG_ISK_LIYUE_BAIZHU_N009",
 "LEG_ISK_LIYUE_BAIZHU_PREP_GATE","LEG_ISK_LIYUE_BAIZHU_N011","LEG_ISK_LIYUE_QIQI_N009",
 "LEG_ISK_LIYUE_QIQI_PREP_GATE","LEG_ISK_LIYUE_QIQI_N011","LEG_ISK_LIYUE_GAMING_N008",
 "LEG_ISK_LIYUE_GAMING_PREP_GATE","LEG_ISK_LIYUE_GAMING_N011","LEG_ISK_LIYUE_GAMING_N012",
 "LEG_ISK_LIYUE_GANYU_N008","LEG_ISK_LIYUE_GANYU_PREP_GATE","LEG_ISK_LIYUE_GANYU_N010",
 "LEG_ISK_LIYUE_GANYU_N011","LEG_ISK_LIYUE_XINGQIU_INTRO_04","LEG_ISK_LIYUE_XINGQIU_PREP_GATE",
 "LEG_ISK_LIYUE_XINGQIU_PREP_ACCEPT","LEG_ISK_LIYUE_XINGQIU_V143_AGAIN_00","LEG_ISK_LIYUE_XIANYUN_INTRO_04",
 "LEG_ISK_LIYUE_XIANYUN_PREP_GATE","LEG_ISK_LIYUE_XIANYUN_PREP_ACCEPT","LEG_ISK_LIYUE_XIANGLING_INTRO_04",
 "LEG_ISK_LIYUE_XIANGLING_PREP_GATE","LEG_ISK_LIYUE_XIANGLING_PREP_ACCEPT","LEG_ISK_LIYUE_HUTAO_INTRO_04",
 "LEG_ISK_LIYUE_HUTAO_PREP_GATE","LEG_ISK_LIYUE_HUTAO_PREP_ACCEPT","LEG_ISK_LIYUE_LANYAN_JOB",
 "LEG_ISK_LIYUE_LANYAN_ACCEPT_COST","LEG_ISK_LIYUE_SHENHE_JOB","LEG_ISK_LIYUE_SHENHE_ACCEPT_COST",
 "LEG_ISK_LIYUE_XINYAN_JOB","LEG_ISK_LIYUE_XINYAN_ACCEPT_COST","LEG_ISK_LIYUE_YANFEI_N006",
 "LEG_ISK_LIYUE_YANFEI_PREP_ACCEPT","LEG_ISK_LIYUE_YUNJIN_N006","LEG_ISK_LIYUE_YUNJIN_PREP_ACCEPT",
 "LEG_ISK_LIYUE_YAOYAO_N006","LEG_ISK_LIYUE_YAOYAO_PREP_ACCEPT"
]);
const costTerm=/^(?:MORA|(?:ITEM|INVENTORY)\(\w+\))\s*(?:>=|<)\s*\d+$/;
const costDefinition=(r,row)=>row&&r.storyIndex().legendCostRows.get(row[0]+':'+row[4]);
P.storyIndex=function(){
 const ix=old.index.call(this);if(ix.legendCostRows)return ix;
 ix.legendCostRows=new Map();ix.legendCostChoices=new Set();
 const defs=new Map([...ix.legends.values()].filter(d=>d.STATUS==='ACTIVE').map(d=>[d.ROUTE_SCOPE+':'+d.QUEST_ID,d]));
 for(const row of ix.byTable['57_MOND_STORY_SCENE_DB']){
  const d=defs.get(row[0]+':'+row[1]);if(!d||!String(row[4]).startsWith(d.id+'_')||row[18]!=='ACTIVE')continue;
  const key=row[0]+':'+row[4];ix.legendCostRows.set(key,d);
  const commits=String(row[12]).split(';').includes('LEGEND_ACCEPT_AND_PAY:'+d.QUEST_ID);
  const prep=/PREP_(?:YES|SHORT|SHORTAGE)$/.test(row[4]);
  if(!commits&&!prep)continue;
  const condition=String(row[11]||''),neg=/^NOT\((.*)\)$/.exec(condition),parts=condition.split(/\s*&&\s*/).filter(Boolean);
  const hasCost=neg?costTerm.test(neg[1]):parts.some(p=>costTerm.test(p));
  if(commits||hasCost){
   // Preserve unrelated conditions (e.g. unpaid-only choices) and use the complete current cost.
   const shortage=!!neg||parts.some(p=>costTerm.test(p)&&/</.test(p));
   row[11]=(neg?[]:parts.filter(p=>!costTerm.test(p))).concat('LEGEND_COST_READY('+d.QUEST_ID+')='+(shortage?'FALSE':'TRUE')).join(' && ');
   if(row[5]==='CHOICE'&&!shortage)ix.legendCostChoices.add(key);
  }
 }
 for(const id of ['EVT_MOND_MIKA_INTRO_LINE_2','EVT_MOND_MONA_INTRO_LINE_2']){
  const row=ix.nodes.get('ROUTE_TRAVELER:'+id);if(row?.[6]==='NPC_PAIMON')row[6]='ENTITY_PAIMON';
 }
 return ix;
};
P.legendCostReady=function(d){
 if(!d||d.STATUS!=='ACTIVE')return false;
 if(this.s.storyCostReceipts?.[d.QUEST_ID])return true;
 const cost=this.legendEffectiveCost(d);
 return this.s.global.MORA>=cost.mora&&Object.entries(cost.items).every(([id,n])=>this.itemCount(id)>=n);
};
P.storyConditionValue=function(name,args,property){
 if(name==='LEGEND_COST_READY'&&args)return this.legendCostReady(this.storyDefinition(args[0]));
 return old.condition.call(this,name,args,property);
};
P.legendCostSummary=function(d){
 if(this.s.storyCostReceipts?.[d.QUEST_ID])return '이미 지불함 · 추가 차감 없음';
 const cost=this.legendEffectiveCost(d);if(cost.waivedByStory)return '이야기 진행으로 준비 비용 면제';
 return [cost.mora+' 모라',...Object.entries(cost.items).map(([id,n])=>(this.tables['14_ITEM_DB'].get(id)?.[1]||id)+' '+n+'개')].join(' · ');
};
P.legendCostDisplayText=function(row,text){
 const d=costDefinition(this,row);if(!d)return text;
 let out=String(text||'');const cost=this.legendEffectiveCost(d),id=row[4];
 if(MORA_ROWS.has(id))out=out.replace(/([\d,]+)(\s*)모라|모라(\s*)([\d,]+)/g,(_,before,space,after)=>before?cost.mora+space+'모라':'모라'+after+cost.mora);
 // These lines describe the preparation material, not a separate story transaction.
 if(d.REGION==='리월'){
  if(d.id==='LEG_LIYUE_XINYAN')out=out.replace(/수정덩이 일곱 개|수정덩이 7개/g,'철광 '+cost.items.ORE_IRON+'개').replace(/수정덩이/g,'철광');
  if(d.id==='LEG_ISK_LIYUE_BEIDOU')out=out.replace(/철광 12개/g,'필요한 자재').replace(/철광으로/g,'준비한 자재로').replace(/철광을/g,'자재를');
  if(d.id==='LEG_ISK_LIYUE_CHONGYUN')out=out.replace(/철광석/g,'철광');
  for(const [item,n]of Object.entries(cost.items)){
   const name=this.tables['14_ITEM_DB'].get(item)?.[1];if(!name)continue;
   out=out.replace(new RegExp(name+' (?:\\d+|열두|열|여덟|일곱)\\s*개','g'),name+' '+n+'개');
  }
  if(id==='LEG_LIYUE_XIANGLING_PREP_GATE')out='향릉을 도우려면 준비물이 필요하다.';
  if(id==='LEG_LIYUE_XIANGLING_N008')out=out.replace('생선 살코기','준비물');
  if(id==='LEG_LIYUE_XIANGLING_N009')out=out.replace('생선 살코기 세 개는','준비해 준 재료는');
 }
 return out;
};
P.storyDisplayText=function(row){
 row??=this.storyNode();let text=this.legendCostDisplayText(row,old.text.call(this,row));
 const d=costDefinition(this,row);if(d&&/_PREP_GATE$/.test(row[4]))text+='\n준비 비용 · '+this.legendCostSummary(d);
 return text;
};
P.storyChoices=function(){return old.choices.call(this).map(row=>{
 const d=costDefinition(this,row);if(!d)return row;
 const copy=row.slice();Object.defineProperties(copy,{table:{value:row.table},sourceRow:{value:row.sourceRow}});
 copy[9]=this.legendCostDisplayText(row,row[9]);copy[10]=this.legendCostDisplayText(row,row[10]);
 if(this.storyIndex().legendCostChoices.has(row[0]+':'+row[4]))copy[10]+='\n준비 비용 · '+this.legendCostSummary(d);
 return copy;
});};
})(globalThis);
