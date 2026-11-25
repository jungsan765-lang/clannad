/* 0.15.25 이야기 동료 (user: 「4성은 좀 나눠주는게 좋지 않을까 싶다. 스토리 진행하면서 만나는 캐릭터중에 4성 있으면 좀 나눠줘서 적어도
 * 4인은 해주는게 좋지 않을까?」, 「나중에 리월에서도 좀 많이 퍼주기도 하고」, 「4인 말고도 그냥 더 많이 퍼줘도 되긴 해」, 「가챠는 냅둬」):
 * a 4★ companion met in the main story joins when that chapter ends, the same way a wished one joins (wishGrant: level
 * near the hero's, ascension to match, the starter weapon). Each chapter also keeps a floor: the Mond prologue leaves at
 * least three companions (a party of four), the end of Mond five Mond 4★, the second Liyue chapter three Liyue 4★, the end
 * of Liyue five. Wishes are untouched.
 * It runs after every action outside a fight, outside runtime_roster_v01522.js's wish-only guard (which turns any other new
 * member back into an acquaintance), so a journey already past a chapter catches up on its next action. Each chapter step
 * runs once (s.storyCompanions); none runs while Amber is only lent for the first fight. Load after runtime_roster_v01522.js
 * and runtime_tutorial_v01522.js. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.storyCompanionsV01525)return;
const old={apply:P.apply,validateSave:P.validateSave,recruitmentEntries:P.recruitmentEntries};
const fail=m=>{throw new api.RuleError('STORY_COMPANIONS',m);};
// Who fills a floor, in this order (the Knights first in Mond, the harbour's young heroes first in Liyue).
const MOND_FILL=['MOND_LISA','MOND_NOELLE','MOND_BARBARA','MOND_KAEYA','MOND_BENNETT','MOND_RAZOR','MOND_FISCHL','MOND_SUCROSE'];
const LIYUE_FILL=['LIYUE_XIANGLING','LIYUE_XINGQIU','LIYUE_CHONGYUN','LIYUE_BEIDOU','LIYUE_YANFEI','LIYUE_XINYAN','LIYUE_YUNJIN','LIYUE_YAOYAO','LIYUE_GAMING'];
const on=(r,id)=>[true,'TRUE','true'].includes(r.s.flags?.[id]),val=(r,id)=>String(r.s.flags?.[id]??'');
// The isekai route's Mond branch: K knows the world; the others split at the expedition (B guild, AA ride, AB return).
function mondBranch(r){if(val(r,'FLAG_ISK_META_KNOWLEDGE')==='KNOWN')return 'K';const b=val(r,'FLAG_ISK_MOND_BRANCH'),f=val(r,'FLAG_ISK_EXPEDITION_FORK');return b==='GUILD'?'B':b==='EXPEDITION'?(f==='RIDE'?'AA':f==='RETURN'?'AB':'U'):'U';}
const leaf=r=>val(r,'FLAG_ISK_L01_LEAF'),leafBranch=r=>leaf(r).replace(/\d$/,'');
// [step, chapter ended, who was met in it, floor]. Who is met where: docs/PATCH_0.15.25_KO.md (from the K manuscript).
const STEPS={
 ROUTE_TRAVELER:[
  ['MOND_START',r=>on(r,'FLAG_TRV_MON_PROLOGUE_CLEAR'),()=>['MOND_AMBER','MOND_KAEYA','MOND_LISA'],['MOND',3]],
  ['MOND_END',r=>on(r,'FLAG_TRV_MON_CH2_CLEAR'),()=>['MOND_BARBARA'],['MOND',5]],
  ['LIYUE_1',r=>on(r,'FLAG_TRV_LY1_CLEAR'),()=>['LIYUE_NINGGUANG']],
  ['LIYUE_2',r=>on(r,'FLAG_TRV_LY2_CLEAR'),()=>['LIYUE_XIANGLING'],['LIYUE',3]],
  ['LIYUE_END',r=>on(r,'FLAG_TRV_LIYUE_CLEAR'),()=>['LIYUE_BEIDOU'],['LIYUE',5]]
 ],
 ROUTE_ISEKAI:[
  ['AMBER',r=>on(r,'FLAG_ISK_RECRUIT_AMBER')||on(r,'FLAG_ISK_MON_PROLOGUE_CLEAR'),()=>['MOND_AMBER']],
  ['MOND_START',r=>on(r,'FLAG_ISK_MON_PROLOGUE_CLEAR'),r=>[mondBranch(r)==='K'?'MOND_DIONA':'MOND_KAEYA'],['MOND',3]],
  ['MOND_END',r=>on(r,'FLAG_ISK_M05_CLEAR'),r=>({K:['MOND_DAHLIA','MOND_KAEYA'],AA:['MOND_BARBARA']})[mondBranch(r)]||[],['MOND',5]],
  ['LIYUE_1',r=>on(r,'FLAG_ISK_L01_CONTENT_GATE'),r=>({K:['LIYUE_XINGQIU','LIYUE_CHONGYUN','LIYUE_YANFEI'],AA:['LIYUE_CHONGYUN'],AB:['LIYUE_XIANGLING','LIYUE_YANFEI'],B:['LIYUE_BEIDOU','LIYUE_GAMING']})[leafBranch(r)]||[]],
  ['LIYUE_2',r=>on(r,'FLAG_ISK_L02_CONTENT_GATE'),r=>['LIYUE_NINGGUANG',...(leaf(r)==='K2'?['LIYUE_XIANGLING','LIYUE_YAOYAO']:[])],['LIYUE',3]],
  ['LIYUE_3',r=>on(r,'FLAG_ISK_L03_CONTENT_GATE'),r=>leaf(r)==='AB1'?['LIYUE_YUNJIN','LIYUE_XINYAN']:[]],
  ['LIYUE_END',r=>on(r,'FLAG_ISK_L04_CONTENT_GATE'),r=>({AA2:['LIYUE_BEIDOU'],AB1:['LIYUE_BEIDOU'],AB2:['LIYUE_BEIDOU'],B1:['LIYUE_CHONGYUN','LIYUE_XINGQIU']})[leaf(r)]||[],['LIYUE',5]]
 ]
};
const STEP_KEYS=new Set(Object.values(STEPS).flatMap(list=>list.map(x=>x[0])));
P.storyCompanionState=function(){const s=this.s.storyCompanions;if(s?.version===1)return s;return this.s.storyCompanions={version:1,steps:{},joined:{}};};
P.storyCompanionGrants=function(){
 const list=STEPS[this.s.global?.STORY_ROUTE_ID];if(!list||this.s.runtime||this.s.tutorialV2?.loan||!this.tables?.['07_CHAR_DB'])return [];
 const st=this.storyCompanionState(),given=[];
 const join=(id,step)=>{if(!this.tables['07_CHAR_DB'].has(id)||this.premiumOwns(id))return;this.wishGrant({kind:'char',id,rarity:this.rarityOf?.(id)||4});if(this.premiumOwns(id)){st.joined[id]=step;given.push(id);}};
 const owned4=region=>this.premiumFighters().filter(id=>id.startsWith(region+'_')&&(this.rarityOf?.(id)||4)===4).length;
 for(const [step,ended,met,floor]of list){
  if(st.steps[step]||!ended(this))continue;
  for(const id of met(this))join(id,step);
  if(floor){const [region,count]=floor;for(const id of region==='MOND'?MOND_FILL:LIYUE_FILL){if(owned4(region)>=count)break;join(id,step);}}
  st.steps[step]=true;
 }
 return given;
};
P.apply=function(a){
 const out=old.apply.call(this,a);
 const given=this.storyCompanionGrants();
 if(given.length){(this.s.storyCompanions.news??=[]).push(...given);this.s.storyCompanions.news=this.s.storyCompanions.news.slice(-12);if(out&&typeof out==='object'&&!Array.isArray(out))out.companionsJoined=given;}
 return out;
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,c=out.storyCompanions;if(c===undefined)return out;
 const bad=()=>fail('이야기 동료 기록을 확인해 주세요.');
 if(!c||typeof c!=='object'||c.version!==1||!c.steps||typeof c.steps!=='object'||Array.isArray(c.steps)||!c.joined||typeof c.joined!=='object'||Array.isArray(c.joined))bad();
 if(Object.entries(c.steps).some(([k,v])=>!STEP_KEYS.has(k)||v!==true))bad();
 if(Object.entries(c.joined).some(([id,step])=>typeof id!=='string'||!STEP_KEYS.has(step)))bad();
 if(c.news!==undefined&&(!Array.isArray(c.news)||c.news.length>12||c.news.some(id=>typeof id!=='string')))bad();
 return out;
};
// The companions list says how one who came with the story joined.
if(old.recruitmentEntries)P.recruitmentEntries=function(){const joined=this.s.storyCompanions?.joined||{};return old.recruitmentEntries.call(this).map(e=>joined[e.character]&&typeof e.method==='string'?{...e,method:e.method.replace('캐릭터 소유: 기원','캐릭터 소유: 이야기에서 합류')}:e);};
api.storyCompanionsV01525={steps:Object.fromEntries(Object.entries(STEPS).map(([route,list])=>[route,list.map(x=>x[0])])),mondFill:MOND_FILL.slice(),liyueFill:LIYUE_FILL.slice()};
P.storyCompanionsV01525=true;
})(typeof window!=='undefined'?window:globalThis);
