/* v0.13.40 step 12-3: the Liyue Cor Lapis forge.
 * Liyue specialties come from mining/gathering (plus a small shop restock). The Liyue equipment shop turns them
 * into purpose-built gear whose worth is its traits (12-4), not a higher tier than Mond: breaking shields and armour,
 * anti-air, heat/insulation/waterproof armour, heavy plate, cover seals, purification and so on. One cheap Mond
 * charm is added so early Mond gear keeps a niche against fire fields later.
 * Load after runtime_liyue_equipment.js and BEFORE runtime_enhancement.js, so crafted rows receive the shared
 * enhancement profile. Names of specialties are official (genshin-db KR); placement, stats and costs are CRPG rules. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x));
if(P.liyueForgeVersion)return;
const fail=(c,m)=>{throw new api.RuleError(c,m);};

// ---- regional specialties ------------------------------------------------------------------------------------
const MATERIALS=[
 {id:'MAT_LIYUE_COR_LAPIS',name:'콜 라피스',grade:'고급',tag:'[광물][바위]',desc:'바위 원소의 힘이 굳어 생긴 리월의 광물. 리월 장비점이 바위 원소 장비를 단련할 때 쓴다.',source:'호로산·천주 골짜기·성법 관문·천형산 채광 · 리월 장비점 소량 입고',sell:40},
 {id:'MAT_LIYUE_NOCTILUCOUS_JADE',name:'야박석',grade:'고급',tag:'[광물]',desc:'밤에 은은하게 빛나는 옥. 원소를 막는 부적과 지맥 장치의 심지로 쓴다.',source:'명온 마을·천형산·둔옥릉 채광',sell:40},
 {id:'MAT_LIYUE_GLAZE_LILY',name:'유리백합',grade:'일반',tag:'[식물]',desc:'유리처럼 맑은 꽃잎의 백합. 치유 매듭과 절연 직물의 광택제로 쓴다.',source:'귀리 평원·청허포 채집',sell:20},
 {id:'MAT_LIYUE_SILK_FLOWER',name:'예상꽃',grade:'일반',tag:'[식물]',desc:'비단처럼 부드러운 꽃. 가벼운 옷감을 짜는 데 쓴다.',source:'경책 산장 밭길 채집 · 리월 잡화 상인',sell:20},
 {id:'MAT_LIYUE_STARCONCH',name:'별소라',grade:'일반',tag:'[해산물]',desc:'모래톱에서 줍는 별 모양 소라. 껍데기 가루로 방수 도료를 만든다.',source:'요광 해안 채집',sell:20},
 {id:'MAT_LIYUE_JUEYUN_CHILI',name:'절운고추',grade:'일반',tag:'[식물][불]',desc:'산속에서 자라는 매운 고추. 불씨를 오래 품게 하는 법구 심지로 쓴다.',source:'경운봉·화광림 채집',sell:20}
];
// Extra life-pool entries per named Liyue area: [item,min,max,weight]. Existing entries stay as they are.
const POOLS={
 MAP_LY_DETAIL_HULAO:{MINE:[['MAT_LIYUE_COR_LAPIS',1,2,35]]},
 MAP_LY_DETAIL_TIANQIU:{MINE:[['MAT_LIYUE_COR_LAPIS',1,2,30]]},
 MAP_LY_DETAIL_LINGJU:{MINE:[['MAT_LIYUE_COR_LAPIS',1,2,30]]},
 MAP_LY_DETAIL_TIANHENG:{MINE:[['MAT_LIYUE_COR_LAPIS',1,1,20],['MAT_LIYUE_NOCTILUCOUS_JADE',1,1,20]]},
 MAP_LY_DETAIL_MINGYUN:{MINE:[['MAT_LIYUE_NOCTILUCOUS_JADE',1,2,30]]},
 MAP_LY_DETAIL_DUNYU:{MINE:[['MAT_LIYUE_NOCTILUCOUS_JADE',1,1,25]]},
 MAP_LY_DETAIL_GUILI:{GATHER:[['MAT_LIYUE_GLAZE_LILY',2,3,40]]},
 MAP_LY_DETAIL_QINGXU:{GATHER:[['MAT_LIYUE_GLAZE_LILY',2,3,35]]},
 MAP_LY_DETAIL_QINGCE_FIELDS:{GATHER:[['MAT_LIYUE_SILK_FLOWER',2,3,35]]},
 MAP_LY_DETAIL_YAOGUANG:{GATHER:[['MAT_LIYUE_STARCONCH',2,3,45]]},
 MAP_LY_DETAIL_QINGYUN:{GATHER:[['MAT_LIYUE_JUEYUN_CHILI',2,3,35]]},
 MAP_LY_DETAIL_HUAGUANG:{GATHER:[['MAT_LIYUE_JUEYUN_CHILI',2,3,30]]}
};
const STOCKS=[
 ['STK_LIYUE_FORGE_COR_LAPIS','MRC_LIYUE_EQUIP','ITEM','MAT_LIYUE_COR_LAPIS','콜 라피스',120,5,'3일','LEVEL>=3','대장간 보조 재고 · 주 공급원은 리월 산악 채광'],
 ['STK_LIYUE_FOOD_SILK_FLOWER','MRC_LIYUE_GENERAL','ITEM','MAT_LIYUE_SILK_FLOWER','예상꽃',60,5,'매일','없음','항구 화분에서 기른 꽃']
];

// ---- crafted gear --------------------------------------------------------------------------------------------
// type: weapon class / 방어구 / 장신구 / 특수. role = what the item is FOR (shown on the forge card).
const L='MAT_LIYUE_COR_LAPIS',J='MAT_LIYUE_NOCTILUCOUS_JADE';
const GEAR=[
 {id:'EQ_LY_SWORD_ROCKBREAKER',name:'암각 파쇄검',type:'한손검',atk:58,level:4,grade:'4성',role:'방패·갑주 파괴',traits:[['ARMOR_BREAK',20],['SHIELD_BREAK',15]],cost:{[L]:4,ORE_WHITE_IRON:6,MAT_STAINED_MASK:2},mora:420,time:'1시간',note:'바위 방패·유적 기계·원소 보호막을 깨는 한손검. 순수 공격력은 몬드 단조검보다 낮다.'},
 {id:'EQ_LY_CLAYMORE_BEDROCK',name:'암맥 대검',type:'양손검',atk:66,level:5,grade:'4성',role:'대형·보스 공략',traits:[['GIANT',15],['ARMOR_BREAK',10]],cost:{[L]:5,ORE_WHITE_IRON:8,TRPG_DRAGON_SCALE:2},mora:480,time:'2시간',note:'대형 적과 보스에게 강한 대검. 작은 적 무리에는 특별한 이점이 없다.'},
 {id:'EQ_LY_POLEARM_PIERCER',name:'천암 관통창',type:'장병기',atk:60,level:4,grade:'4성',role:'보호막 관통',traits:[['SHIELD_BREAK',30],['PRECISION',5]],cost:{[L]:4,ORE_WHITE_IRON:6,MAT_CHAOS_DEVICE:3},mora:450,time:'1시간',note:'장병기 고유 보호막 파괴와 겹쳐 보호막을 빠르게 걷어낸다.'},
 {id:'EQ_LY_BOW_SKYPIERCER',name:'천형 대공궁',type:'활',atk:58,level:4,grade:'4성',role:'공중·약점 저격',traits:[['ANTI_AIR',20],['WEAK_POINT',15]],cost:{[L]:3,ORE_WHITE_IRON:4,MAT_TREASURE_INSIGNIA:4,MAT_SILVER_INSIGNIA:1},mora:450,time:'1시간',note:'공중 적과 드러난 코어를 노리는 활.'},
 {id:'EQ_LY_CATALYST_CHILI_EMBER',name:'절운 불씨 법구',type:'법구',atk:56,level:4,grade:'4성',role:'불 원소 · 얼음막 녹이기',traits:[['ELEMENT_BOOST','불',14],['SHIELD_BREAK',15]],cost:{[L]:3,MAT_LIYUE_JUEYUN_CHILI:4,ORE_CRYSTAL:2},mora:460,time:'1시간',note:'불 원소 법구 사용자 전용 성향. 다른 원소 사용자에게는 보호막 파괴만 남는다.'},
 {id:'EQ_LY_CATALYST_TIDE_CONCH',name:'별소라 물결 법구',type:'법구',atk:56,level:4,grade:'4성',role:'물 원소 · 불 원소 적 공략',traits:[['ELEMENT_BOOST','물',14],['AURA_HUNTER','불',12]],cost:{[L]:3,MAT_LIYUE_STARCONCH:4,ORE_CRYSTAL:2},mora:460,time:'1시간',note:'물 원소 법구 사용자와 불 원소 적을 상대할 때 빛나는 법구.'},
 {id:'EQ_LY_ARMOR_JADEFLAME',name:'적옥 내열갑',type:'방어구',def:40,hp:220,level:5,grade:'희귀',role:'화염 지형·불 피해 대응',traits:[['HEAT',60],['ELEMENT_RES','불',8]],cost:{[L]:4,[J]:3,ORE_WHITE_IRON:4,MAT_DAMAGED_MASK:4},mora:520,time:'2시간',note:'화염 지형과 불 원소 공격을 크게 줄인다. 불이 없는 전장에서는 평범한 갑옷.'},
 {id:'EQ_LY_ARMOR_THUNDERWARD',name:'뇌운 절연복',type:'방어구',def:34,hp:240,level:5,grade:'희귀',role:'낙뢰·번개 피해 대응',traits:[['INSULATE',60],['ELEMENT_RES','번개',8]],cost:{[L]:3,MAT_LIYUE_GLAZE_LILY:4,MAT_CHAOS_DEVICE:3},mora:500,time:'2시간',note:'낙뢰와 번개 원소 공격에 대비하는 절연 직물.'},
 {id:'EQ_LY_ARMOR_TIDEWARD',name:'벽수 방수 외투',type:'방어구',def:30,hp:260,level:5,grade:'희귀',role:'침수·물 피해 대응',traits:[['WATERPROOF',60],['ELEMENT_RES','물',8]],cost:{[L]:3,MAT_LIYUE_STARCONCH:4,MAT_TREASURE_INSIGNIA:3},mora:480,time:'2시간',note:'침수 지형과 젖음, 물 원소 공격을 막는 외투.'},
 {id:'EQ_LY_ARMOR_BEDROCK',name:'기암 중장갑',type:'방어구',def:62,hp:300,spd:-4,level:6,grade:'희귀',role:'강한 일격·밀치기 대응 (속도 −4)',traits:[['HEAVY',25],['STAGGER_RES',100],['ELEMENT_RES','바위',6]],cost:{[L]:6,ORE_WHITE_IRON:8,MAT_STAINED_MASK:2},mora:620,time:'3시간',note:'강한 단타와 밀치기를 버티는 중장갑. 대신 속도가 떨어져 행동 순서가 늦어진다.'},
 {id:'EQ_LY_ARMOR_CLOUDSTRIDE',name:'운보 경갑',type:'방어구',def:22,hp:200,spd:5,eva:6,level:4,grade:'희귀',role:'속도·은밀 (강한 일격에 약함)',traits:[['STEALTH',20],['AOE_GUARD',15],['LIGHT',10]],cost:{[L]:2,MAT_LIYUE_SILK_FLOWER:4,MAT_SILVER_INSIGNIA:2},mora:460,time:'1시간',note:'빠르고 눈에 덜 띄지만 강한 단타에는 더 아프다.'},
 {id:'EQ_LY_ACC_QINGXIN_SACHET',name:'청심 정화 향낭',type:'장신구',hp:120,res:6,level:4,grade:'희귀',role:'해로운 상태·행동 방해 대응',traits:[['PURIFY',30],['CONTROL_RES',15]],cost:{[L]:2,MAT_LIYUE_QINGXIN:5},mora:380,time:'1시간',note:'차례마다 해로운 상태를 털어낼 기회를 준다.'},
 {id:'EQ_LY_ACC_MILLELITH_SEAL',name:'천암군 수호 인장',type:'장신구',def:14,hp:120,level:5,grade:'희귀',role:'도발·엄호 (탱커)',traits:[['COVER',35],['AGGRO',40]],cost:{[L]:4,ORE_CRYSTAL:2,MAT_STAINED_MASK:2},mora:450,time:'1시간',note:'적의 시선을 끌고 옆 칸 동료를 대신 막는다. 약한 동료가 들면 위험하다.'},
 {id:'EQ_LY_ACC_LILY_KNOT',name:'유리백합 치유 매듭',type:'장신구',hp:180,level:4,grade:'희귀',role:'회복·보호막 효율',traits:[['HEAL_BOOST',15],['SHIELD_BOOST',12]],cost:{[L]:2,MAT_LIYUE_GLAZE_LILY:4},mora:400,time:'1시간',note:'받는 회복과 보호막을 늘린다. 치유 담당이 없으면 효과가 작다.'},
 {id:'EQ_LY_ACC_STARGAZER',name:'천추 관측경',type:'장신구',atk:6,hit:6,level:4,grade:'희귀',role:'공중 접근·대공',traits:[['AIR_ACCESS',1],['ANTI_AIR',10]],cost:{[L]:2,ORE_CRYSTAL:2,MAT_SILVER_INSIGNIA:1},mora:380,time:'1시간',note:'근접 동료도 공중 적을 노릴 수 있게 한다.'},
 {id:'EQ_LY_SPECIAL_LEYLINE_STAKE',name:'지맥 안정 말뚝',type:'특수',hp:80,level:5,grade:'희귀',role:'지형 효과·지속 피해 대응',traits:[['TERRAIN_STEADY',1],['DOT',25]],cost:{[L]:3,[J]:2,MAT_CHAOS_CIRCUIT:1},mora:520,time:'2시간',note:'어떤 지형 효과든 조금씩 줄여 주는 범용 대응 장비.'},
 {id:'EQ_LY_SPECIAL_JADE_WARD',name:'야박석 원소 부적',type:'특수',hp:60,res:4,level:6,grade:'희귀',role:'모든 원소·광역 공격 완화',traits:[['ELEMENT_RES','ALL',10],['AOE_GUARD',15],['AURA_SHORTEN',40]],cost:{[L]:3,[J]:3,ORE_CRYSTAL:2},mora:560,time:'2시간',note:'원소를 가리지 않는 방호. 특정 원소 전용 장비보다는 약하다.'},
 {id:'EQ_MOND_ACC_EMBERGUARD',name:'잿불막이 부적',type:'장신구',def:4,hp:90,level:3,grade:'고급',role:'화염 지형·불 지속 피해 대응',traits:[['HEAT',40],['DOT',10]],cost:{MAT_SLIME_CONDENSATE:3,ORE_WHITE_IRON:2},mora:180,time:'30분',region:'MOND',note:'몬드에서 싸게 만드는 방화 부적. 먼 곳의 화염 지형에서도 쓸모가 있다.'}
];
// Existing weapon that the Liyue forge now makes (its traits already live in runtime_gear_traits.js).
const EXTRA_RECIPES=[{id:'REC_LY_POLEARM_DRAGONBANE',out:'EQ_POLEARM_DRAGONBANE',kind:'무기 제작',cost:{[L]:3,TRPG_DRAGON_SCALE:3,ORE_WHITE_IRON:5},mora:400,level:4,time:'1시간',note:'물·불 원소가 묻은 적과 용 계열에 강한 장병기. 리월 장비점에서 콜 라피스로 단조한다.'}];
const KIND={한손검:'무기 제작',양손검:'무기 제작',장병기:'무기 제작',활:'무기 제작',법구:'무기 제작',방어구:'장비 제작',장신구:'장신구 제작',특수:'특수장비 제작'};
const TRAITS=Object.fromEntries(GEAR.map(g=>[g.id,g.traits]));
const recipeId=g=>'REC_'+g.id.replace(/^EQ_/,'');

const old=Object.fromEntries(['installMarketContent','lifePool','extraGearTraits'].map(k=>[k,P[k]]));
P.installLiyueForge=function(){
 if(this._liyueForgeInstalled)return;
 const names=['14_ITEM_DB','16_EQUIP_DB','17_RECIPE_DB','48_RECIPE_INGREDIENT_DB','19_SHOP_STOCK_DB'],rows=Object.fromEntries(names.map(n=>[n,this.db[n].map(r=>r.slice())]));
 const has=(n,id)=>rows[n].some(r=>r[0]===id);
 for(const m of MATERIALS)if(!has('14_ITEM_DB',m.id)){
  const r=Array(rows['14_ITEM_DB'][0].length).fill('');
  Object.assign(r,{0:m.id,1:m.name,2:'지역 특산물',3:m.grade,4:m.tag,5:m.desc,6:'재료',7:'리월 장비 제작 재료',8:0,10:'N',11:'공용',14:m.sell,15:0,16:999,17:m.source,18:'Y',19:'N',20:'리월',21:'공식 명칭 · CRPG 배치'});
  rows['14_ITEM_DB'].push(r);
 }
 const eh=rows['16_EQUIP_DB'][0],ei=Object.fromEntries(eh.map((x,i)=>[x,i])),set=(r,k,v)=>{if(ei[k]!==undefined)r[ei[k]]=v;};
 for(const g of GEAR){
  if(has('16_EQUIP_DB',g.id))continue;const weapon=!['방어구','장신구','특수'].includes(g.type),r=Array(eh.length).fill('');
  set(r,'EQUIP_ID',g.id);set(r,'장비명',g.name);set(r,'장비 종류',g.type);set(r,'장착 가능 대상',weapon?g.type+' 사용자':'전체');
  set(r,'기본 ATK',g.atk||0);set(r,'기본 DEF',g.def||0);set(r,'기본 HP',g.hp||0);set(r,'치확%',0);set(r,'치피%',0);
  set(r,'기타 보조 스탯',g.role);set(r,'힘 태그',g.region==='MOND'?'[몬드][제작]':'[리월][콜 라피스][제작]');set(r,'고유 효과',g.note);set(r,'세트/계열',g.region==='MOND'?'몬드 대응 장비':'리월 콜 라피스 단조');set(r,'등급',g.grade);
  set(r,'제작 가능 여부','Y');set(r,'RECIPE_ID',recipeId(g));set(r,'구매 가능 여부','N');set(r,'판매가',Math.floor(g.mora*.4));set(r,'비고','v0.13.34 12-3 목적형 제작 장비');
  set(r,'최소 레벨',g.level);set(r,'SPD 보정',g.spd||0);set(r,'명중 보정',g.hit||0);set(r,'회피 보정',g.eva||0);set(r,'상태저항 보정',g.res||0);set(r,'사거리 보정','');
  set(r,'용도 태그',g.role);set(r,'획득 티어','T2 제작');set(r,'획득 방식',g.region==='MOND'?'몬드 대장간 제작':'리월 장비점 제작');set(r,'강화 성장','공용 확률 강화 +10 / 돌파 후 +12');
  set(r,'전용 대상','');set(r,'획득처/조건',(g.region==='MOND'?'바그너의 대장간':'리월 장비점')+' · Lv.'+g.level+' 이상');
  set(r,'ENHANCEMENT_PROFILE_JSON','{}');set(r,'ENHANCE_ALLOWED','Y');set(r,'ENHANCE_LIMIT',10);set(r,'NO_ENHANCE_REASON','');
  rows['16_EQUIP_DB'].push(r);
 }
 const width=rows['17_RECIPE_DB'][0].length,recipes=[...GEAR.map(g=>({id:recipeId(g),out:g.id,kind:KIND[g.type],cost:g.cost,mora:g.mora,level:g.level,time:g.time,note:g.role+' · '+g.note,region:g.region})),...EXTRA_RECIPES];
 for(const x of recipes){
  if(has('17_RECIPE_DB',x.id))continue;const entries=Object.entries(x.cost);if(entries.length>5)fail('LIYUE_FORGE','제작 재료는 5종까지입니다: '+x.id);
  const r=Array(width).fill('');Object.assign(r,{0:x.id,1:x.kind,2:'EQUIP',3:x.out,4:1,15:x.mora,16:x.region==='MOND'?'몬드성':'리월항',17:x.region==='MOND'?'MRC_MOND_EQUIP':'MRC_LIYUE_EQUIP',18:'LEVEL>='+x.level,19:x.time,20:100,21:x.note});
  entries.forEach(([id,n],i)=>{r[5+i*2]=id;r[6+i*2]=n;rows['48_RECIPE_INGREDIENT_DB'].push(['RI_'+x.id+'_'+(i+1),x.id,i+1,id,n,'재료'+(i+1),'','CRPG_LIYUE_FORGE_V1']);});
  for(let i=entries.length;i<5;i++){r[5+i*2]='';r[6+i*2]='';}
  rows['17_RECIPE_DB'].push(r);
 }
 for(const s of STOCKS)if(!has('19_SHOP_STOCK_DB',s[0]))rows['19_SHOP_STOCK_DB'].push(s.slice());
 this.db={...this.db,...rows};for(const n of names)this.tables[n]=new Map(rows[n].slice(1).filter(r=>r[0]).map(r=>[r[0],r]));
 for(const x of recipes)for(const [id]of Object.entries(x.cost))if(!this.tables['14_ITEM_DB'].has(id))fail('LIYUE_FORGE','제작 재료 정의가 없습니다: '+id);
 this._placeCatalog=null;this._liyueForgeInstalled=true;
};
P.installMarketContent=function(...args){const out=old.installMarketContent.apply(this,args);this.installLiyueForge();return out;};
P.lifePool=function(kind,map=this.s.global.CURRENT_MAP_ID){
 const pool=old.lifePool.call(this,kind,map),extra=POOLS[map]?.[kind];if(!extra||!pool.length)return pool;
 return [...pool,...extra.filter(([id])=>this.tables['14_ITEM_DB'].has(id)&&!pool.some(x=>x.item===id)).map(([item,min,max,weight])=>({item,min,max,weight}))];
};
P.extraGearTraits=function(id){const prior=old.extraGearTraits?.call(this,id)||[];return TRAITS[id]?[...prior,...TRAITS[id].map(x=>x.slice())]:prior;};
P.liyueForgeVersion=1;
api.liyueForge={version:1,materials:copy(MATERIALS),pools:copy(POOLS),gear:copy(GEAR),extraRecipes:copy(EXTRA_RECIPES),stocks:copy(STOCKS),recipeId:g=>recipeId(g)};
})(globalThis);
