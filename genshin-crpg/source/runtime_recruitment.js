/* Acquisition catalogue; explicit local introductions, independent of the later quest destination. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype;
const json=x=>{try{return JSON.parse(x||'{}');}catch{return {};}};
const yes=x=>x===true||x==='TRUE'||x==='Y';
const oldReason=P.actionReason,baseStoryIndex=P.storyIndex,baseStoryAcceptLegend=P.storyAcceptLegend,basePlaceCatalog=P.placeCatalog,baseLegendContactAllowed=P.legendContactAllowed;
const liyueRecruitStages={
 LIYUE_XIANGLING:1,LIYUE_XINGQIU:1,LIYUE_CHONGYUN:1,LIYUE_YAOYAO:1,LIYUE_GAMING:1,LIYUE_XINYAN:1,LIYUE_YANFEI:1,LIYUE_YUNJIN:1,LIYUE_LANYAN:1,LIYUE_XIAO:1,LIYUE_BEIDOU:1,LIYUE_HUTAO:1,
 LIYUE_KEQING:2,LIYUE_QIQI:2,LIYUE_YELAN:2,LIYUE_GANYU:2,
 LIYUE_TARTAGLIA:3,
 LIYUE_NINGGUANG:4,LIYUE_BAIZHU:4,LIYUE_SHENHE:4,LIYUE_XIANYUN:4,LIYUE_ZIBAI:4
};
const liyueStageQuest=(route,stage)=>(route==='ROUTE_ISEKAI'?'Q_ISK_LIYUE_0':'Q_TRV_LIYUE_0')+stage;
const liyueRecruitCosts={
 LIYUE_XIANGLING:{mora:480,items:{ING_RICE:3,ING_SHRIMP:2}},LIYUE_XINGQIU:{mora:520,items:{MAT_TREASURE_INSIGNIA:3}},LIYUE_CHONGYUN:{mora:300,items:{MAT_DAMAGED_MASK:4,ORE_IRON:4}},LIYUE_YAOYAO:{mora:320,items:{ING_RICE:3}},
 LIYUE_GAMING:{mora:520,items:{ORE_IRON:5,MAT_TREASURE_INSIGNIA:2}},LIYUE_XINYAN:{mora:380,items:{ORE_IRON:6}},LIYUE_YANFEI:{mora:600,items:{MAT_TREASURE_INSIGNIA:4}},LIYUE_YUNJIN:{mora:550,items:{ORE_CRYSTAL:3}},
 LIYUE_LANYAN:{mora:320,items:{ORE_IRON:8}},LIYUE_XIAO:{mora:320,items:{ORE_CRYSTAL:4}},LIYUE_BEIDOU:{mora:380,items:{ORE_CRYSTAL:6,TRPG_SCRAP_METAL:2}},LIYUE_HUTAO:{mora:550,items:{ORE_IRON:4,MAT_DAMAGED_MASK:2}},
 LIYUE_KEQING:{mora:520,items:{ORE_IRON:8,MAT_TREASURE_INSIGNIA:3}},LIYUE_QIQI:{mora:500,items:{MAT_DAMAGED_MASK:3,ING_RICE:2}},LIYUE_YELAN:{mora:650,items:{MAT_SILVER_INSIGNIA:2,MAT_TREASURE_INSIGNIA:3}},LIYUE_GANYU:{mora:600,items:{ORE_CRYSTAL:4,MAT_STAINED_MASK:1}},
 LIYUE_TARTAGLIA:{mora:700,items:{MAT_CHAOS_DEVICE:2,MAT_SILVER_INSIGNIA:2}},LIYUE_NINGGUANG:{mora:800,items:{ORE_CRYSTAL:5,MAT_CHAOS_DEVICE:2}},LIYUE_BAIZHU:{mora:700,items:{ORE_CRYSTAL:3,MAT_STAINED_MASK:2}},
 LIYUE_SHENHE:{mora:650,items:{ORE_CRYSTAL:5,MAT_STAINED_MASK:2}},LIYUE_XIANYUN:{mora:650,items:{MAT_CHAOS_CIRCUIT:1,ORE_CRYSTAL:5}},LIYUE_ZIBAI:{mora:750,items:{TRPG_SCRAP_METAL:3,MAT_CHAOS_DEVICE:2}}
};
const liyueContactPlaces=[
 ['EVT_CRPG_LIYUE_WANMIN','만민당',['MAP_LIYUE_HARBOR']],['EVT_CRPG_LIYUE_FEIYUN','비운 상회',['MAP_LIYUE_HARBOR']],['EVT_CRPG_LIYUE_WANGSHENG','왕생당',['MAP_LIYUE_HARBOR']],
 ['EVT_CRPG_LIYUE_HEYU','화유다관',['MAP_LIYUE_HARBOR']],['EVT_CRPG_LIYUE_YUJING','옥경대',['MAP_LIYUE_HARBOR']],['EVT_CRPG_LIYUE_BUBU','불복려',['MAP_LIYUE_HARBOR']],
 ['EVT_CRPG_LIYUE_NORTHLAND','북국 은행',['MAP_LIYUE_HARBOR']],['EVT_CRPG_LIYUE_DOCKS','리월항 부두',['MAP_LIYUE_HARBOR']],['EVT_CRPG_LIYUE_YANSHANG','암상 찻집',['MAP_LIYUE_HARBOR']],
 ['EVT_CRPG_LIYUE_QINGCE_CONTACT','경책 산장',['MAP_LIYUE_QINGCE']],['EVT_CRPG_LIYUE_JUEYUN_CONTACT','절운간 산길',['MAP_LIYUE_JUEYUN']],
 ['EVT_CRPG_LIYUE_MOUNTAIN_EXORCIST','리월 산악지대 · 퇴마 의뢰지',['MAP_LIYUE_MOUNTAINS']],['EVT_CRPG_LIYUE_MOUNTAIN_RETURN','리월 산악지대 · 귀환 흔적',['MAP_LIYUE_MOUNTAINS']],
 ['EVT_CRPG_LIYUE_ARTISAN','공예 작업장',['MAP_LIYUE_HARBOR','MAP_CHENYU_QIAOYING']]
].map(([id,name,maps])=>({id,name,maps,kind:'FACILITY',entity:null,merchant:null,facility:name,from:0,to:1440,merchantMaps:null,merchantFrom:null,merchantTo:null,merchantType:'',merchantName:'',modes:['TALK']}));
const liyueContactOwners={
 LIYUE_ZHONGLI:['EVT_CRPG_LIYUE_WANGSHENG'],
 LIYUE_XIANGLING:['EVT_CRPG_LIYUE_WANMIN'],LIYUE_XINGQIU:['EVT_CRPG_LIYUE_FEIYUN'],LIYUE_CHONGYUN:['EVT_CRPG_LIYUE_MOUNTAIN_EXORCIST'],LIYUE_YAOYAO:['EVT_CRPG_LIYUE_QINGCE_CONTACT'],
 LIYUE_GAMING:['EVT_CRPG_LIYUE_DOCKS'],LIYUE_XINYAN:['EVT_CRPG_LIYUE_HEYU'],LIYUE_YANFEI:['EVT_CRPG_LIYUE_YUJING'],LIYUE_YUNJIN:['EVT_CRPG_LIYUE_HEYU'],
 LIYUE_LANYAN:['EVT_CRPG_LIYUE_ARTISAN'],LIYUE_XIAO:['EVT_CRPG_LIYUE_JUEYUN_CONTACT'],LIYUE_BEIDOU:['EVT_CRPG_LIYUE_DOCKS'],LIYUE_HUTAO:['EVT_CRPG_LIYUE_WANGSHENG'],
 LIYUE_KEQING:['EVT_CRPG_LIYUE_YUJING'],LIYUE_QIQI:['EVT_CRPG_LIYUE_BUBU'],LIYUE_YELAN:['EVT_CRPG_LIYUE_YANSHANG'],LIYUE_GANYU:['EVT_CRPG_LIYUE_YUJING'],
 LIYUE_TARTAGLIA:['EVT_CRPG_LIYUE_NORTHLAND'],LIYUE_NINGGUANG:['EVT_CRPG_LIYUE_YUJING'],LIYUE_BAIZHU:['EVT_CRPG_LIYUE_BUBU'],LIYUE_SHENHE:['EVT_CRPG_LIYUE_YUJING'],
 LIYUE_XIANYUN:['EVT_CRPG_LIYUE_YUJING'],LIYUE_ZIBAI:['EVT_CRPG_LIYUE_MOUNTAIN_RETURN']
};
P.liyueRecruitContactPlace=id=>liyueContactPlaces.some(p=>p.id===id);
P.placeCatalog=function(){const list=basePlaceCatalog.call(this);for(const entry of liyueContactPlaces)if(!list.some(p=>p.id===entry.id))list.push({...entry,maps:entry.maps.slice(),modes:entry.modes.slice()});return list;};
P.legendContactAllowed=function(d,place=this.currentPlace()){
 if(!d||d.kind!=='LEGEND'||!place?.valid)return false;
 if(['NPC_MOND_KATHERYNE','NPC_LIYUE_KATHERYNE'].includes(place.entity))return false;
 const owner=this.tables['04_CHAR_DB'].get(d.PROFILE_ID)?.[1]||d.CHAR_ID||d.CHARACTER_ID;
 if(d.REGION==='리월'||String(owner).startsWith('LIYUE_'))return !!liyueContactOwners[owner]?.includes(place.place);
 return baseLegendContactAllowed.call(this,d,place);
};
P.storyIndex=function(){
 const ix=baseStoryIndex.call(this);if(ix.liyueRecruitmentStageVersion===2)return ix;
 for(const d of ix.legends.values()){
  if(d.REGION!=='리월'||d.CHAR_ID==='LIYUE_ZHONGLI')continue;
  const stage=liyueRecruitStages[d.CHAR_ID]||4,quest=liyueStageQuest(d.ROUTE_SCOPE,stage),extra=d.CHAR_ID==='LIYUE_ZIBAI'?' && FLAG_WORLD_ZIBAI_RETURNED=TRUE':'';
  d.LIYUE_RECRUIT_STAGE=stage;d.MAIN_FLAG_GATE='';d.START_CONDITION='ROUTE_ID='+d.ROUTE_SCOPE+' && DONE('+quest+')=TRUE && '+d.COMPLETE_FLAG_ID+'=FALSE'+extra+' && CURRENT_MAP_ID='+d.MAP_ID;
  const cost=liyueRecruitCosts[d.CHAR_ID];if(cost){d.COST_MORA=cost.mora;d.COST_ITEMS_JSON=JSON.stringify(cost.items);}
  const row=ix.nodes.get(d.ROUTE_SCOPE+':'+d.ENTRY_NODE_ID);if(row)row[11]=d.START_CONDITION;
 }
 const diluc=ix.legends.get('LEG_ISK_MOND_DILUC');
 if(diluc){
  diluc.MAIN_FLAG_GATE='FLAG_ISK_M05_CLEAR';diluc.RECRUIT_MODE='STORY_OR_LEGEND_OPT_IN';diluc.COST_MORA=650;diluc.COST_ITEMS_JSON=JSON.stringify({ORE_CRYSTAL:4,MAT_DAMAGED_MASK:3});
  diluc.START_CONDITION='ROUTE_ID=ROUTE_ISEKAI && FLAG_ISK_M05_CLEAR=TRUE && FLAG_LEG_ISK_MOND_DILUC_CLEAR=FALSE && CURRENT_MAP_ID=MAP_MOND_DAWN_WINERY';
  const set=(id,fn)=>{const row=ix.nodes.get('ROUTE_ISEKAI:'+id);if(row)fn(row);};
  set(diluc.ENTRY_NODE_ID,row=>{row[9]='이세계인 전용 다이루크 개인 임무. 다운 와이너리의 운송 기록을 조사하고, 완료 뒤 동행 여부를 정한다.';row[11]=diluc.START_CONDITION;});
  set('LEG_ISK_MOND_DILUC_N005',row=>row[9]='이 기록은 사당의 일과 별개로 보겠다. 자네가 눈에 보이는 차이를 확인해 줘. 나는 실제로 수레를 몬 사람에게 묻지. 필요한 준비를 마쳤다면 시작하지.');
  set('LEG_ISK_MOND_DILUC_PREP_ACCEPT',row=>row[10]='준비한 물자와 비용을 확인하고 운송 기록 조사를 시작한다.');
  set('LEG_ISK_MOND_DILUC_N024',row=>row[9]='오늘 일은 여기서 마쳤다. 앞으로도 함께 움직일 생각이 있다면 지금 정해도 된다. 당장 답하지 않아도 상관없어.');
  set('LEG_ISK_MOND_DILUC_N025',row=>row[10]='앞으로도 함께 움직이자고 제안한다.');
  set('LEG_ISK_MOND_DILUC_N026',row=>row[10]='오늘은 여기까지 하고, 동행 이야기는 다음으로 미룬다.');
  set('LEG_ISK_MOND_DILUC_END_JOIN',row=>{row[9]='다이루크: 필요할 때 연락하지. 함께 움직일 일이 생기면 준비해 두겠다.\n다이루크와의 개인 임무를 마치고 동행하기로 한다.';row[12]='COMPLETE_LEGEND:Q_LEG_ISK_MOND_DILUC;UNLOCK_CARD_ONCE:MOND_DILUC:FLAG_ISK_RECRUIT_DILUC;ADD_HEART:PROFILE_MOND_DILUC:1;FLAG:FLAG_LEG_ISK_MOND_DILUC_CLEAR=TRUE';});
  set('LEG_ISK_MOND_DILUC_END_DEFER',row=>{row[9]='다이루크: 오늘 일은 끝났군. 동행 이야기는 서두를 필요 없다. 생각이 정리되면 와이너리로 와.\n개인 임무는 마쳤지만 동행 제안은 다음으로 미룬다.';});
  const table='57_MOND_STORY_SCENE_DB',add=(id,type,text,next,effect='',group='',label='')=>{
   const key='ROUTE_ISEKAI:'+id;if(ix.nodes.has(key))return;const row=Array(20).fill('');
   Object.assign(row,{0:'ROUTE_ISEKAI',1:diluc.QUEST_ID,2:diluc.id+'_REJOIN',3:diluc.id+'_REJOIN',4:id,5:type,6:type==='DIALOGUE'?'PROFILE_MOND_DILUC':'',7:type==='DIALOGUE'?'다이루크':'',8:'MAP_MOND_DAWN_WINERY',9:text,10:label,11:'FLAG_LEG_ISK_MOND_DILUC_CLEAR=TRUE && FLAG_ISK_RECRUIT_DILUC=FALSE',12:effect,13:next,14:group,16:'CRPG_ORIGINAL',17:1,18:'ACTIVE',19:'v0.13.22 일반 획득 후 무료 재합류 제안.'});
   Object.defineProperties(row,{table:{value:table},sourceRow:{value:0}});ix.nodes.set(key,row);ix.byTable[table].push(row);
  };
  add('LEG_ISK_MOND_DILUC_REJOIN_START','DIALOGUE','전에 미뤄 둔 동행 이야기라면 지금 정해도 된다. 함께 움직일 생각이 있나?','CHOICE_GROUP:LEG_ISK_MOND_DILUC_REJOIN_G');
  add('LEG_ISK_MOND_DILUC_REJOIN_ACCEPT','CHOICE','', 'SCREEN:CRPG_MAIN','UNLOCK_CARD_ONCE:MOND_DILUC:FLAG_ISK_RECRUIT_DILUC','LEG_ISK_MOND_DILUC_REJOIN_G','함께 움직이자고 한다.');
  add('LEG_ISK_MOND_DILUC_REJOIN_DEFER','CHOICE','', 'SCREEN:CRPG_MAIN','NO_PENALTY','LEG_ISK_MOND_DILUC_REJOIN_G','이번에는 각자의 일을 한다.');
 }
 for(const a of ix.affections.values())if(a.id.startsWith('AFF_ISK_MOND_DILUC_H0')){a.REQUIRED_FLAGS=JSON.stringify(['FLAG_ISK_RECRUIT_DILUC','FLAG_LEG_ISK_MOND_DILUC_CLEAR']);a.NOTE=String(a.NOTE||'').replace(/2AB[^.;]*/g,'일반 획득 또는 이야기 합류 이후');}
 for(const row of ix.byTable['57_MOND_STORY_SCENE_DB'])if(String(row[4]).startsWith('AFF_ISK_MOND_DILUC_H0')&&row[11])row[11]=String(row[11]).replace(/FLAG_ISK_MOND_BRANCH=EXPEDITION\s*&&\s*/g,'').replace(/FLAG_ISK_EXPEDITION_FORK=RETURN\s*&&\s*/g,'').replace(/FLAG\(FLAG_ISK_DILUC_LEGEND_FREE\)=TRUE\s*&&\s*/g,'').replace(/FLAG_ISK_DILUC_LEGEND_FREE=TRUE\s*&&\s*/g,'');
 Object.defineProperty(ix,'liyueRecruitmentStageVersion',{value:2});return ix;
};
P.legendEffectiveCost=function(d){
 const base={mora:Number(d?.COST_MORA)||0,items:json(d?.COST_ITEMS_JSON)},f=this.s.flags,g=this.s.global;
 const dilucStoryWaiver=d?.id==='LEG_ISK_MOND_DILUC'&&(yes(f.FLAG_ISK_RECRUIT_DILUC)||(g.STORY_ROUTE_ID==='ROUTE_ISEKAI'&&yes(f.FLAG_ISK_M05_CLEAR)&&f.FLAG_ISK_MOND_BRANCH==='EXPEDITION'&&f.FLAG_ISK_EXPEDITION_FORK==='RETURN'));
 if(dilucStoryWaiver)return {mora:0,items:{},waivedByStory:true};
 return {...base,waivedByStory:false};
};
P.storyAcceptLegend=function(id,node){
 const d=this.storyDefinition(id),cost=this.legendEffectiveCost(d);
 if(!d||!cost.waivedByStory)return baseStoryAcceptLegend.call(this,id,node);
 const mora=d.COST_MORA,items=d.COST_ITEMS_JSON;d.COST_MORA=0;d.COST_ITEMS_JSON='{}';
 try{return baseStoryAcceptLegend.call(this,id,node);}finally{d.COST_MORA=mora;d.COST_ITEMS_JSON=items;}
};
P.liyueLegendProgress=function(d){
 if(!d||d.REGION!=='리월'||d.CHAR_ID==='LIYUE_ZHONGLI')return null;
 const stage=Number(d.LIYUE_RECRUIT_STAGE||liyueRecruitStages[d.CHAR_ID]||4),quest=liyueStageQuest(d.ROUTE_SCOPE,stage),ready=this.storyDone(quest);
 return {stage,quest,ready,label:'리월 본편 '+stage+'장 완료'};
};
const flagNames={FLAG_TRV_MON_PROLOGUE_CLEAR:'몬드 도입부 완료',FLAG_ISK_MON_PROLOGUE_CLEAR:'몬드 도입부 완료',FLAG_ISK_MAIN_UNLOCKED:'도입부 마무리 및 메인 화면 개방',FLAG_TRV_MON_CH2_CLEAR:'몬드 본편 완료',FLAG_ISK_M05_CLEAR:'몬드 본편 완료',FLAG_TRV_LIYUE_CLEAR:'리월 본편 완료',FLAG_ISK_L04_REGION_CLEAR:'리월 본편 완료',FLAG_MOND_MIKA_RETURNED:'첫 만남 임무에서 귀환 확인',FLAG_MOND_MONA_PRESENT:'첫 만남 임무에서 만남 확인',FLAG_WORLD_ZIBAI_RETURNED:'귀환 임무 완료'};
P.legendRequirements=function(d,{cost=true,location=true,introduction=true}={}){
 if(!d)return [];
 const out=[],g=this.s.global,add=(label,met,kind)=>out.push({label,met:!!met,kind});
 if(d.STATUS!=='ACTIVE')add('이 루트의 개인 임무 연결 준비 중',false,'content');
 const liyueGate=this.liyueLegendProgress?.(d);if(liyueGate)add(liyueGate.label,liyueGate.ready,'story');
 const flags=new Set([d.MAIN_FLAG_GATE,...[...String(d.START_CONDITION||'').matchAll(/(FLAG_[A-Z0-9_]+)\s*=\s*TRUE/g)].map(m=>m[1])].filter(Boolean));
 for(const flag of flags){if(flag===d.COMPLETE_FLAG_ID)continue;const name=flagNames[flag]||this.tables['23_FLAG_DB'].get(flag)?.[1]||'선행 이야기 진행';add(name,yes(this.s.flags[flag]),'story');}
 if(location&&d.MAP_ID)add((this.tables['32_MAP_DB'].get(d.MAP_ID)?.[2]||'지정 장소')+'에서 만나기',g.CURRENT_MAP_ID===d.MAP_ID,'map');
 if(introduction)add(this.legendIntroductionLabel(d)+'에서 개인 임무 소개받기',this.legendRegistered(d.id),'introduction');
 if(cost&&!this.s.storyCostReceipts?.[d.QUEST_ID]&&!this.storyDone(d.id)){
  const effective=this.legendEffectiveCost(d);if(effective.waivedByStory)add('이야기 진행으로 준비 비용 면제',true,'cost');
  const mora=effective.mora;if(mora)add('준비 비용 '+mora+' 모라 · 보유 '+g.MORA,g.MORA>=mora,'cost');
  for(const [id,n]of Object.entries(effective.items))add((this.tables['14_ITEM_DB'].get(id)?.[1]||'준비물')+' '+this.itemCount(id)+' / '+n+'개',this.itemCount(id)>=n,'cost');
 }
 return out;
};
P.legendIntroductionReason=function(d){
 if(!d||d.kind!=='LEGEND'||d.ROUTE_SCOPE!==this.s.global.STORY_ROUTE_ID||d.STATUS!=='ACTIVE')return '현재 루트에서 소개받을 수 없는 임무입니다.';
 if(this.playPhase()!=='FREE'||this.s.worldJob||this.s.lifeJob)return '현재 장면이나 진행 중인 작업을 먼저 마쳐 주세요.';
 if(!this.legendContactAllowed(d))return this.legendIntroductionLabel(d)+'에서 개인 임무를 소개받아 주세요.';
 if(this.legendRegistered(d.id))return '이미 소개받았거나 마친 개인 임무입니다.';
 const facade=Object.create(this);facade.s={...this.s,global:{...this.s.global,CURRENT_MAP_ID:d.MAP_ID||this.s.global.CURRENT_MAP_ID}};
 try{if(!facade.storyCondition(d.START_CONDITION,d))return this.legendRequirements(d,{cost:false,location:false,introduction:false}).find(r=>!r.met)?.label||'개인 임무의 선행 이야기를 먼저 진행해 주세요.';}catch{return '이 개인 임무의 연결을 준비하고 있습니다.';}
 return '';
};
P.actionReason=function(type,a={}){
 if(type==='LEGEND_REGISTER')return this.legendIntroductionReason(this.storyDefinition(a.quest));
 if(type==='LEGEND_ENTER'&&!this.legendRegistered(a.quest||a.id)){
  const d=this.storyDefinition(a.quest||a.id);
  if(d?.REGION==='몬드')return this.legendIntroductionLabel(d)+'에서 개인 임무를 먼저 소개받아 주세요.';
 }
 return oldReason.call(this,type,a);
};
P.recruitmentEntries=function(){
 const route=this.s.global.STORY_ROUTE_ID,owned=json(this.s.global.COMPANION_ELIGIBILITY_JSON),defs=[...this.storyIndex().legends.values()].filter(d=>d.ROUTE_SCOPE===route);
 return this.rows('04_CHAR_DB').filter(r=>['몬드','리월'].includes(r[3])&&this.tables['07_CHAR_DB'].has(r[1])).map(r=>{
  const d=defs.find(d=>d.PROFILE_ID===r[0]),joined=owned[r[1]]?.state==='JOINED',archon=['MOND_VENTI','LIYUE_ZHONGLI'].includes(r[1]);
  let method=archon?'지역의 신의 눈동자 전량 수집 → 순서대로 공양 → 동행 수락':d?'개인 임무 완료 → 동행 제안 수락':'이 루트의 획득 임무 연결 준비 중';
  if(r[1]==='MOND_DILUC'&&route==='ROUTE_ISEKAI')method=joined?'이야기 진행 중 동행 합류 완료':'다운 와이너리 개인 임무 완료 → 동행 제안 수락';
  let requirements=d?this.legendRequirements(d):[{label:'획득 임무 연결 준비 중',met:false,kind:'content'}];
  if(archon){const summary=r[3]==='몬드'?this.oculusSummary():this.geoOculusSummary?.();requirements=[{label:'지역 눈동자 수집 '+(summary?.collected||0)+' / '+(summary?.total||16),met:!!summary&&summary.collected===summary.total,kind:'oculi'},{label:'본편 완료 후 최종 공양에서 동행 약속',met:joined,kind:'story'}];}
  return {profile:r[0],character:r[1],name:r[2],region:r[3],owned:joined,definition:d,method,requirements,complete:!!d&&this.storyDone(d.id),archon};
 });
};
})(globalThis);
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype,old=Object.fromEntries(['apply','actionReason','storyCompleteLegend','placeCatalog','atGuild','assetFor','validateSave'].map(k=>[k,P[k]])),json=x=>JSON.parse(x||'{}');
P.assetFor=function(id,variant){return old.assetFor.call(this,id==='NPC_LIYUE_KATHERYNE'?'NPC_MOND_KATHERYNE':id,variant);};
P.atGuild=function(){const p=this.currentPlace();return old.atGuild.call(this)||(p?.valid&&p.entity==='NPC_LIYUE_KATHERYNE'&&p.mode==='TALK');};
P.placeCatalog=function(){const list=old.placeCatalog.call(this);if(!list.some(p=>p.id==='EVT_CRPG_LIYUE_GUILD'))list.push({id:'EVT_CRPG_LIYUE_GUILD',kind:'FACILITY',entity:'NPC_LIYUE_KATHERYNE',merchant:null,name:'모험가 길드 · 캐서린',facility:'모험가 길드',maps:['MAP_LIYUE_HARBOR'],from:0,to:1440,merchantMaps:null,merchantFrom:null,merchantTo:null,merchantType:'',merchantName:'',modes:['TALK']});return list;};
P.recruitmentRejoinEntry=function(d){
 if(!d||['MOND_VENTI','LIYUE_ZHONGLI'].includes(d.CHAR_ID))return null;
 const row=this.storyIndex().nodes.get(this.s.global.STORY_ROUTE_ID+':'+d.id+'_REJOIN_START');if(!row)return null;
 let reason='';const owned=json(this.s.global.COMPANION_ELIGIBILITY_JSON);
 if(d.ROUTE_SCOPE!==this.s.global.STORY_ROUTE_ID)reason='현재 이야기 루트에서 만날 수 없습니다.';
 else if(!this.storyDone(d.id))reason='개인 임무를 먼저 마쳐 주세요.';
 else if(owned[d.CHAR_ID]?.state==='JOINED')reason='이미 동행하는 인물입니다.';
 else if(this.playPhase()!=='FREE'||this.s.storyContext||this.s.worldJob||this.s.lifeJob)reason='현재 진행 중인 장면을 먼저 마쳐 주세요.';
 else if(d.REGION==='리월'&&d.CHAR_ID!=='LIYUE_ZHONGLI'){const gate=this.liyueLegendProgress?.(d);if(gate&&!gate.ready)reason=gate.label+' 후 다시 만날 수 있습니다.';}
 else if(this.s.global.CURRENT_MAP_ID!==row[8])reason=(this.tables['32_MAP_DB'].get(row[8])?.[2]||'지정 장소')+'에서 다시 만날 수 있습니다.';
 else {try{if(!this.storyCondition(row[11],d))reason='재회 조건을 먼저 확인해 주세요.';}catch{reason='재회 조건을 확인할 수 없습니다.';}}
 return {id:row[4],map:row[8],reason};
};
P.storyCompleteLegend=function(id){const out=old.storyCompleteLegend.call(this,id),d=this.storyDefinition(id);if(d&&this.s.storyContext?.entry===d.id&&!['MOND_VENTI','LIYUE_ZHONGLI'].includes(d.CHAR_ID))this.s.storyContext.kind='RECRUIT';return out;};
P.actionReason=function(type,a={}){
 if(type==='RECRUIT_REJOIN')return this.recruitmentRejoinEntry(this.storyDefinition(a.quest))?.reason??'다시 제안할 개인 임무가 없습니다.';
 if(type==='ZIBAI_RETURN_CHECK')return this.playPhase()!=='FREE'?'현재 장면을 먼저 마쳐 주세요.':!this.liyuePersonalReady()?'리월 본편을 먼저 마쳐 주세요.':this.s.flags.FLAG_WORLD_ZIBAI_RETURNED?'이미 귀환을 확인했습니다.':this.s.global.CURRENT_MAP_ID!=='MAP_LIYUE_MOUNTAINS'?'리월 산지의 귀환 흔적을 찾아가세요.':'';
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){
 if(a.type==='RECRUIT_REJOIN'){const d=this.storyDefinition(a.quest),e=this.recruitmentRejoinEntry(d);if(!e||e.reason)throw new api.RuleError('RECRUIT_REJOIN',e?.reason||'재회할 인물이 없습니다.');this.s.storyReturnStack||=[];this.s.storyReturnStack.push(this.storyFrame());this.s.storyContext={kind:'RECRUIT',entry:d.id,node:e.id,table:'57_MOND_STORY_SCENE_DB'};Object.assign(this.s.global,{PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',SCREEN_MODE:'STORY'});this.prepareStory();return {entry:e.id};}
 if(a.type==='ZIBAI_RETURN_CHECK'){
  const g=this.s.global;this.s.liyueSideStories??={};const progress=this.s.liyueSideStories.zibai??={step:0,route:g.STORY_ROUTE_ID,saveId:g.SAVE_ID,visited:[]};
  if(progress.step!==Number(a.step))throw new api.RuleError('SIDE_STORY_STEP','현재 귀환 확인 단계를 선택하세요.');
  progress.visited.push({step:progress.step,day:g.WORLD_DAY,turn:g.TURN,map:g.CURRENT_MAP_ID});progress.step++;
  if(progress.step===3){this.s.flags.FLAG_WORLD_ZIBAI_RETURNED=true;progress.completed={saveId:g.SAVE_ID,route:g.STORY_ROUTE_ID,day:g.WORLD_DAY,turn:g.TURN};this.markContact('PROFILE_LIYUE_ZIBAI');}
  return {step:progress.step,complete:progress.step===3};
 }
 return old.apply.call(this,a);
};
P.validateSave=function(s){
 const p=s.liyueSideStories?.zibai,g=s.global;
 if(p){
  const valid=p.saveId===g.SAVE_ID&&p.route===g.STORY_ROUTE_ID&&Number.isInteger(p.step)&&p.step>=0&&p.step<=3&&Array.isArray(p.visited)&&p.visited.length===p.step&&p.visited.every((v,i)=>v&&typeof v==='object'&&v.step===i&&v.map==='MAP_LIYUE_MOUNTAINS'&&Number.isInteger(v.day)&&v.day>=1&&v.day<=g.WORLD_DAY&&Number.isInteger(v.turn)&&v.turn>=0&&v.turn<=g.TURN);
  const complete=p.step===3?p.completed?.saveId===g.SAVE_ID&&p.completed?.route===g.STORY_ROUTE_ID&&s.flags.FLAG_WORLD_ZIBAI_RETURNED===true:!p.completed&&!s.flags.FLAG_WORLD_ZIBAI_RETURNED;
  if(!valid||!complete)throw new api.RuleError('SIDE_STORY_SAVE','귀환 확인의 단계와 저장 출처가 일치하지 않습니다.');
 }
 return old.validateSave.call(this,s);
};
})(globalThis);

/* First-contact prerequisites use the existing authored meeting, never a synthetic true flag. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype;
const old={actionReason:P.actionReason,apply:P.apply,validateSave:P.validateSave,storyReturn:P.storyReturn};
const contacts={LEG_MOND_MIKA:{event:'EVT_MOND_MIKA_INTRO',flag:'FLAG_MOND_MIKA_RETURNED'},LEG_MOND_MONA:{event:'EVT_MOND_MONA_INTRO',flag:'FLAG_MOND_MONA_PRESENT'}};
P.mondFirstContact=function(d){
 const c=d&&contacts[d.id];if(!c||d.ROUTE_SCOPE!==this.s.global.STORY_ROUTE_ID)return null;
 return {...c,complete:this.s.flags[c.flag]===true,profile:d.PROFILE_ID};
};
P.mondFirstContactReason=function(d){
 const c=this.mondFirstContact(d);
 if(!c||d.STATUS!=='ACTIVE')return '현재 루트의 첫 만남이 아닙니다.';
 if(c.complete)return '이미 첫 만남을 마쳤습니다.';
 if(this.playPhase()!=='FREE'||this.s.storyContext||this.s.storyJourney||this.s.worldJob||this.s.lifeJob||this.s.global.STORY_MENU_POLICY==='SAVE_LOAD_ONLY')return '현재 장면이나 이동을 먼저 마쳐 주세요.';
 if(this.s.flags.FLAG_TRV_MON_PROLOGUE_CLEAR!==true)return '몬드 도입부를 먼저 마쳐 주세요.';
 if(!this.legendContactAllowed(d))return this.legendIntroductionLabel(d)+'에게 먼저 이야기를 들어 주세요.';
 return '';
};
P.actionReason=function(type,a={}){return type==='MOND_FIRST_CONTACT'?this.mondFirstContactReason(this.storyDefinition(a.quest)):old.actionReason.call(this,type,a);};
P.apply=function(a){
 if(a.type!=='MOND_FIRST_CONTACT')return old.apply.call(this,a);
 const d=this.storyDefinition(a.quest),reason=this.mondFirstContactReason(d);
 if(reason)throw new api.RuleError('MOND_FIRST_CONTACT',reason);
 const c=this.mondFirstContact(d);this.s.storyReturnStack||=[];this.s.storyReturnStack.push({...this.storyFrame(),introductionPlace:JSON.parse(JSON.stringify(this.s.placeVisit))});
 this.s.storyContext={kind:'INTRODUCTION',entry:c.event,node:c.event+'_START',table:'57_MOND_STORY_SCENE_DB'};
 delete this.s.storyBreak;delete this.s.storyArrival;this.s.storyMenuFrame=null;
 Object.assign(this.s.global,{PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',SCREEN_MODE:'STORY'});
 this.prepareStory();return {event:c.event};
};
P.storyReturn=function(){
 const contact=this.s.storyContext?.kind==='INTRODUCTION',visit=this.s.storyReturnStack?.at(-1)?.introductionPlace;
 const result=old.storyReturn.call(this);
 if(contact&&visit&&this.playPhase()==='FREE'){
  this.s.placeVisit=JSON.parse(JSON.stringify(visit));
  if(this.placeVisitReason()){this.s.placeVisit=null;this.s.global.SCREEN_MODE='LOCATION';}
  else {this.s.global.SCREEN_MODE=visit.mode==='TALK'?'DIALOGUE':visit.mode;this.s.global.CURRENT_NPC_ENTITY_ID=visit.entity;}
 }
 return result;
};
P.validateSave=function(s){
 const ctx=s.storyContext;
 if(ctx?.kind==='INTRODUCTION'){
  const def=Object.values(contacts).find(c=>c.event===ctx.entry),prefix=ctx.entry+'_';
  const valid=def&&s.global.STORY_ROUTE_ID==='ROUTE_TRAVELER'&&ctx.table==='57_MOND_STORY_SCENE_DB'&&(String(ctx.node).startsWith(prefix)||ctx.node==='CHOICE_GROUP:'+ctx.entry+'_CHOICE')&&Array.isArray(s.storyReturnStack)&&s.storyReturnStack.length>0;
  if(!valid)throw new api.RuleError('CONTACT_SAVE','첫 만남 장면의 루트와 복귀 기록을 확인할 수 없습니다.');
 }
 return old.validateSave.call(this,s);
};
})(globalThis);
