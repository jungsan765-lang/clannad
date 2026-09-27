/* v0.13.41 steps 12-6-6~12-6-8 and the boss-material tier of 12-3: companion exclusive weapons and boss gear.
 * Every playable companion (Mond 20, Liyue 23) gets one exclusive weapon, forged at the Liyue equipment shop from the
 * boss material that character uses in the original game (ascension data, genshin-db). When that boss is not in this
 * game a substitute is used and marked as such. The Traveler and the Isekai protagonist get none (12-6-8).
 * An exclusive weapon amplifies its owner's own elemental skill and burst (전용 공명) and adds a role trait; its plain
 * ATK stays at or below the best generic forge weapons, so it is strong for that character without being the answer
 * to everything (12-6-7). Boss materials also make nine pieces of boss gear with strong counter traits.
 * Names are CRPG originals; icons borrow official weapon/artifact textures as a visual base.
 * Load after runtime_liyue_forge.js and BEFORE runtime_enhancement.js (crafted rows get the shared enhancement). */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.exclusiveWeaponsVersion)return;
const copy=x=>JSON.parse(JSON.stringify(x)),fail=(c,m)=>{throw new api.RuleError(c,m);};
const tv=(a,k)=>Number(a?.traits?.[k]||0);
const MAT={ANEMO:'MAT_FB_HURRICANE_SEED',ELECTRO:'MAT_FB_LIGHTNING_PRISM',CRYO_VINE:'MAT_FB_HOARFROST_CORE',CRYO_HYPO:'MAT_FB_CRYSTALLINE_BLOOM',GEO:'MAT_FB_BASALT_PILLAR',PYRO:'MAT_FB_EVERFLAME_SEED',OCEANID:'MAT_FB_CLEANSING_HEART',PRIMO:'MAT_FB_JUVENILE_JADE',SERPENT:'MAT_FB_RUNIC_FANG'};
// [owner, name, class, ATK, extra stats, traits, boss material, official ascension material?, icon texture, texture's official name]
const S=(v)=>['SIGNATURE',v];
const WEAPONS=[
 ['MOND_ALBEDO','백악 전정검','한손검',62,{def:10},[S(18),['ELEMENT_BOOST','바위',10]],'GEO',true,'UI_EquipIcon_Sword_Opus','진사의 방추'],
 ['MOND_BARBARA','반짝반짝 무대 악보','법구',52,{hp:160},[S(15),['HEAL_OUT',25]],'OCEANID',true,'UI_EquipIcon_Catalyst_Kaleido','불멸의 달빛'],
 ['MOND_BENNETT','불운을 가르는 모험검','한손검',60,{hp:100},[S(15),['HEAL_OUT',20]],'PYRO',true,'UI_EquipIcon_Sword_Magnum','부식의 검'],
 ['MOND_VENTI','방랑 시인의 바람활','활',62,{},[S(18),['ANTI_AIR',15]],'ANEMO',true,'UI_EquipIcon_Bow_Widsith','종말 탄식의 노래'],
 ['MOND_DIONA','고양이 꼬리 사냥활','활',56,{hp:120},[S(15),['SHIELD_OUT',25],['HEAL_OUT',10]],'CRYO_VINE',true,'UI_EquipIcon_Bow_Fleurfair','바람 꽃의 노래'],
 ['MOND_DAHLIA','성당 침례의 검','한손검',58,{hp:120},[S(15),['HEAL_OUT',15],['STEALTH',10]],'OCEANID',false,'UI_EquipIcon_Sword_Widsith','오래된 자유의 서약'],
 ['MOND_DILUC','새벽 와이너리 대검','양손검',70,{},[S(20),['ELEMENT_BOOST','불',10],['LIGHT',8]],'PYRO',true,'UI_EquipIcon_Claymore_Dvalin','천공의 긍지'],
 ['MOND_AMBER','정찰 기사의 신호궁','활',62,{},[S(20),['WEAK_POINT',12]],'PYRO',true,'UI_EquipIcon_Bow_Viridescent','청록의 사냥활'],
 ['MOND_JEAN','민들레 기사의 검','한손검',64,{},[S(15),['HEAL_OUT',15],['COVER',15]],'ANEMO',true,'UI_EquipIcon_Sword_Falcon','매의 검'],
 ['MOND_KAEYA','서리 여우의 비검','한손검',66,{},[S(18),['AURA_HUNTER','물',15]],'CRYO_VINE',true,'UI_EquipIcon_Sword_Dvalin','천공의 검'],
 ['MOND_KLEE','도도코 폭죽 그림책','법구',62,{},[S(22),['ELEMENT_BOOST','불',10],['LIGHT',10]],'PYRO',true,'UI_EquipIcon_Catalyst_Ludiharpastum','도도코 이야기집'],
 ['MOND_MIKA','측량 기사의 창','장병기',58,{hit:5},[S(15),['HEAL_OUT',15]],'CRYO_HYPO',false,'UI_EquipIcon_Pole_Everfrost','용의 척추'],
 ['MOND_MONA','점성술사의 천구 법구','법구',62,{},[S(18),['ELEMENT_BOOST','물',12]],'OCEANID',true,'UI_EquipIcon_Catalyst_Dvalin','천공의 두루마리'],
 ['MOND_NOELLE','메이드 기사의 수호검','양손검',60,{def:16},[S(15),['SHIELD_OUT',25],['COVER',25]],'GEO',true,'UI_EquipIcon_Claymore_Dragonfell','설장의 성은'],
 ['MOND_FISCHL','단죄의 황녀 활','활',62,{},[S(20),['ANTI_AIR',12]],'ELECTRO',true,'UI_EquipIcon_Bow_Outlaw','뒷골목 사냥꾼'],
 ['MOND_LISA','장미 서고 마도서','법구',62,{},[S(20),['ELEMENT_BOOST','번개',10]],'ELECTRO',true,'UI_EquipIcon_Catalyst_Fourwinds','사풍 원서'],
 ['MOND_RAZOR','늑대 무리의 대검','양손검',70,{},[S(18),['STACK_ATK',3],['LIGHT',8]],'ELECTRO',true,'UI_EquipIcon_Claymore_Wolfmound','늑대의 말로'],
 ['MOND_ROSARIA','심야 순찰 창','장병기',66,{},[S(18),['FIRST_STRIKE',20],['STEALTH',15]],'CRYO_VINE',true,'UI_EquipIcon_Pole_Dvalin','천공의 마루'],
 ['MOND_SUCROSE','연금 확산 연구서','법구',56,{},[S(15),['ELEMENT_BOOST','ALL',8]],'ANEMO',true,'UI_EquipIcon_Catalyst_Outlaw','뒷골목의 술과 시'],
 ['MOND_EULA','물보라 기사의 대검','양손검',72,{},[S(22),['PROC_PHYSICAL',20],['LIGHT',8]],'CRYO_HYPO',true,'UI_EquipIcon_Claymore_Widsith','송뢰가 울릴 무렵'],
 ['LIYUE_BAIZHU','불복려 약재 법구','법구',54,{hp:160},[S(15),['HEAL_OUT',25],['SHIELD_OUT',10]],'OCEANID',false,'UI_EquipIcon_Catalyst_Morax','벽락의 옥'],
 ['LIYUE_BEIDOU','남십자 선장의 대검','양손검',66,{def:10},[S(18),['SHIELD_OUT',20],['COVER',20]],'ELECTRO',true,'UI_EquipIcon_Claymore_Kione','이무기 검'],
 ['LIYUE_QIQI','불복려 부적검','한손검',58,{hp:120},[S(15),['HEAL_OUT',25]],'CRYO_VINE',true,'UI_EquipIcon_Sword_Kunwu','참봉의 칼날'],
 ['LIYUE_NINGGUANG','군옥각 성광구','법구',64,{},[S(20),['COVER',15],['ELEMENT_BOOST','바위',8]],'GEO',true,'UI_EquipIcon_Catalyst_Kunwu','속세의 자물쇠'],
 ['LIYUE_KEQING','옥형의 뇌광검','한손검',70,{},[S(20),['HIGH_HP_CRIT',8],['LIGHT',8]],'ELECTRO',true,'UI_EquipIcon_Sword_Morax','반암결록'],
 ['LIYUE_GAMING','서수 춤꾼의 대검','양손검',68,{},[S(20),['ON_KILL_HEAL',80]],'PYRO',false,'UI_EquipIcon_Claymore_Perdue','빗물 베기'],
 ['LIYUE_GANYU','월해정 비서의 활','활',66,{},[S(20),['WEAK_POINT',12]],'CRYO_VINE',true,'UI_EquipIcon_Bow_Amos','아모스의 활'],
 ['LIYUE_XINGQIU','고화 가문의 비검','한손검',62,{},[S(18),['AOE_GUARD',10]],'OCEANID',true,'UI_EquipIcon_Sword_Blackrock','흑암 장검'],
 ['LIYUE_HUTAO','왕생당 호접창','장병기',70,{},[S(22),['ELEMENT_BOOST','불',10],['LIGHT',10]],'PRIMO',true,'UI_EquipIcon_Pole_Homa','호마의 지팡이'],
 ['LIYUE_XIANGLING','만민당 주방창','장병기',64,{},[S(20),['ELEMENT_BOOST','불',8]],'PYRO',true,'UI_EquipIcon_Pole_Gladiator','결투의 창'],
 ['LIYUE_XIANYUN','선학의 구름 법구','법구',58,{},[S(18),['HEAL_OUT',15],['AIR_ACCESS',1]],'ANEMO',false,'UI_EquipIcon_Catalyst_MountainGale','학의 여음'],
 ['LIYUE_LANYAN','제비 매듭 법구','법구',56,{hp:100},[S(15),['SHIELD_OUT',25]],'ANEMO',false,'UI_EquipIcon_Catalyst_Blackrock','흑암 홍옥'],
 ['LIYUE_XIAO','항마 야차의 창','장병기',72,{},[S(22),['ANTI_AIR',10],['LIGHT',10]],'PRIMO',true,'UI_EquipIcon_Pole_Morax','화박연'],
 ['LIYUE_SHENHE','빙결 부적 창','장병기',64,{},[S(18),['ELEMENT_BOOST','얼음',10]],'CRYO_HYPO',false,'UI_EquipIcon_Pole_Santika','식재'],
 ['LIYUE_XINYAN','록 스피릿 대검','양손검',64,{def:10},[S(15),['SHIELD_OUT',20],['PROC_PHYSICAL',15]],'PYRO',true,'UI_EquipIcon_Claymore_Blackrock','흑암참도'],
 ['LIYUE_TARTAGLIA','공자의 물빛 활','활',68,{},[S(20),['STACK_ATK',3]],'OCEANID',true,'UI_EquipIcon_Bow_Worldbane','극지의 별'],
 ['LIYUE_YANFEI','율법 자문의 인장서','법구',62,{},[S(20),['ELEMENT_BOOST','불',8]],'PRIMO',true,'UI_EquipIcon_Catalyst_Theocrat','왕실의 비전록'],
 ['LIYUE_YELAN','야란의 첩보 활','활',66,{},[S(20),['FIRST_STRIKE',15],['STEALTH',15]],'SERPENT',true,'UI_EquipIcon_Bow_Kirin','약수'],
 ['LIYUE_YUNJIN','운한사 무대창','장병기',60,{def:10},[S(15),['SHIELD_OUT',15],['AGGRO',20]],'GEO',false,'UI_EquipIcon_Pole_Theocrat','왕실의 장창'],
 ['LIYUE_YAOYAO','월계 토끼 창','장병기',56,{hp:140},[S(15),['HEAL_OUT',25]],'PRIMO',false,'UI_EquipIcon_Pole_Arakalari','달을 꿰뚫는 화살'],
 ['LIYUE_ZHONGLI','계약 수호의 창','장병기',64,{},[S(15),['SHIELD_OUT',25],['COVER',20]],'GEO',true,'UI_EquipIcon_Pole_Kunwu','관홍의 창'],
 ['LIYUE_CHONGYUN','퇴마 방사의 대검','양손검',66,{},[S(18),['ELEMENT_BOOST','얼음',10]],'CRYO_VINE',true,'UI_EquipIcon_Claymore_Theocrat','왕실의 대검'],
 ['LIYUE_ZIBAI','달결정 수양검','한손검',64,{},[S(18),['ELEMENT_BOOST','바위',10]],'PRIMO',false,'UI_EquipIcon_Sword_Theocrat','왕실의 장검']
].map(([owner,name,type,atk,extra,traits,mat,official,icon,iconSource])=>({id:'EQ_EX_'+owner,owner,name,type,atk,...extra,traits,material:MAT[mat],official,icon,iconSource}));
// Boss gear: one piece per boss material, strong counter traits, modest stats.
const BOSS_GEAR=[
 {id:'EQ_FB_ACC_STORM_CHARM',name:'폭풍 씨앗 부적',type:'장신구',hp:80,traits:[['AIR_ACCESS',1],['ANTI_AIR',15],['STAGGER_RES',50]],material:MAT.ANEMO,role:'공중 적·밀치기 대응',icon:'UI_RelicIcon_15002_2',iconSource:'청록색 그림자'},
 {id:'EQ_FB_SPECIAL_PRISM_LENS',name:'뇌광 프리즘 렌즈',type:'특수',hit:6,traits:[['INSULATE',45],['WEAK_POINT',15]],material:MAT.ELECTRO,role:'낙뢰 대응·약점 저격',icon:'UI_RelicIcon_15005_5',iconSource:'번개 같은 분노'},
 {id:'EQ_FB_SPECIAL_FROST_CORE',name:'서리 핵 보온구',type:'특수',hp:100,traits:[['COLD',60],['CONTROL_RES',20]],material:MAT.CRYO_VINE,role:'냉기·빙결 대응',icon:'UI_RelicIcon_14001_4',iconSource:'얼음바람 속에서 길잃은 용사'},
 {id:'EQ_FB_ACC_BLOOM_PIN',name:'응결 꽃 장식',type:'장신구',res:6,traits:[['PURIFY',25],['CONTROL_RES',20],['COLD',25]],material:MAT.CRYO_HYPO,role:'해로운 상태·행동 방해 대응',icon:'UI_RelicIcon_14001_2',iconSource:'얼음바람 속에서 길잃은 용사'},
 {id:'EQ_FB_ACC_BASALT_SEAL',name:'현암 방벽 인장',type:'장신구',def:16,traits:[['SHIELD_BOOST',20],['COVER',25],['HEAVY',10]],material:MAT.GEO,role:'보호막·엄호 탱커',icon:'UI_RelicIcon_15014_1',iconSource:'유구한 반암'},
 {id:'EQ_FB_SPECIAL_EMBER_WARD',name:'불씨 수호 부적',type:'특수',hp:80,traits:[['HEAT',60],['DOT',15]],material:MAT.PYRO,role:'화염 지형·지속 피해 대응',icon:'UI_RelicIcon_15006_5',iconSource:'불타오르는 화염의 마녀'},
 {id:'EQ_FB_ACC_CLEAR_CHALICE',name:'맑은 마음 성배',type:'장신구',hp:160,traits:[['HEAL_BOOST',20],['WATERPROOF',40]],material:MAT.OCEANID,role:'회복 효율·침수 대응',icon:'UI_RelicIcon_15022_1',iconSource:'바다에 물든 거대 조개'},
 {id:'EQ_FB_ARMOR_JADE_BULWARK',name:'설익은 옥 원소 갑옷',type:'방어구',def:48,hp:260,traits:[['ELEMENT_RES','ALL',12],['SHIELD_BOOST',15],['AOE_GUARD',10]],material:MAT.PRIMO,role:'모든 원소·광역 대응',icon:'UI_RelicIcon_15017_1',iconSource:'견고한 천암'},
 {id:'EQ_FB_SPECIAL_RUNIC_GAUNTLET',name:'룬 이빨 파쇄 장갑',type:'특수',atk:8,traits:[['ARMOR_BREAK',20],['SHIELD_BREAK',20],['ANTITOXIN',40]],material:MAT.SERPENT,role:'방어 파괴·부식 대응',icon:'UI_RelicIcon_15018_3',iconSource:'창백의 화염'}
];
const NEW_TRAITS={
 SIGNATURE:{label:'전용 공명',group:'공략',text:v=>'이 캐릭터의 원소 스킬·원소폭발 피해 +'+v+'%'},
 HEAL_OUT:{label:'치유 공명',group:'지원',text:v=>'이 캐릭터가 주는 회복량 +'+v+'%'},
 SHIELD_OUT:{label:'수호 공명',group:'지원',text:v=>'이 캐릭터가 거는 보호막 흡수량 +'+v+'%'}
};
const TRAITS=Object.fromEntries([...WEAPONS,...BOSS_GEAR].map(g=>[g.id,g.traits]));
const OWNER=Object.fromEntries(WEAPONS.map(w=>[w.id,w.owner]));
const recipeId=g=>'REC_'+g.id.replace(/^EQ_/,'');
const old=Object.fromEntries(['installMarketContent','extraGearTraits','equipmentDefinition','placeRecipes','craftReason','combatDamageMultiplier','heal','shield','actionReason'].map(k=>[k,P[k]]));

P.installExclusiveWeapons=function(){
 if(this._exclusiveWeaponsInstalled)return;
 // Trait texts live in the shared catalog (created by runtime_gear_traits.js, which loads later but runs first here).
 if(api.traitCatalog)for(const [k,t]of Object.entries(NEW_TRAITS))if(!api.traitCatalog[k])api.traitCatalog[k]=t;
 if(api.gearTraits?.catalog)for(const [k,t]of Object.entries(NEW_TRAITS))api.gearTraits.catalog[k]??={label:t.label,group:t.group,keyed:false};
 const names=['16_EQUIP_DB','17_RECIPE_DB','48_RECIPE_INGREDIENT_DB'],rows=Object.fromEntries(names.map(n=>[n,this.db[n].map(r=>r.slice())]));
 const has=(n,id)=>rows[n].some(r=>r[0]===id),eh=rows['16_EQUIP_DB'][0],ei=Object.fromEntries(eh.map((x,i)=>[x,i])),set=(r,k,v)=>{if(ei[k]!==undefined)r[ei[k]]=v;};
 const charName=id=>this.tables['07_CHAR_DB']?.get(id)?.[1]||id;
 const addGear=(g,excl)=>{if(has('16_EQUIP_DB',g.id))return;const weapon=!['방어구','장신구','특수'].includes(g.type),r=Array(eh.length).fill('');
  set(r,'EQUIP_ID',g.id);set(r,'장비명',g.name);set(r,'장비 종류',g.type);set(r,'장착 가능 대상',excl?charName(g.owner)+' 전용':(weapon?g.type+' 사용자':'전체'));
  set(r,'기본 ATK',g.atk||0);set(r,'기본 DEF',g.def||0);set(r,'기본 HP',g.hp||0);set(r,'치확%',0);set(r,'치피%',0);
  set(r,'기타 보조 스탯',excl?charName(g.owner)+' 전용 무기':g.role);set(r,'힘 태그',excl?'[전용 무기]':'[보스 소재]');
  set(r,'고유 효과',excl?charName(g.owner)+'의 원소 스킬·원소폭발을 강화하는 전용 무기. 기본 공격력은 범용 최고급 무기보다 낮다.':g.role+' · 보스 소재로 만든 특수 장비.');
  set(r,'세트/계열',excl?'캐릭터 전용 무기':'보스 소재 장비');set(r,'등급','5성');set(r,'제작 가능 여부','Y');set(r,'RECIPE_ID',recipeId(g));set(r,'구매 가능 여부','N');set(r,'판매가',excl?600:400);
  set(r,'비고','v0.13.41 12-6 '+(excl?'전용 무기':'보스 소재 장비'));set(r,'최소 레벨',6);set(r,'SPD 보정',g.spd||0);set(r,'명중 보정',g.hit||0);set(r,'회피 보정',g.eva||0);set(r,'상태저항 보정',g.res||0);set(r,'사거리 보정','');
  set(r,'용도 태그',excl?charName(g.owner)+' 전용':g.role);set(r,'획득 티어','T3 보스 소재');set(r,'획득 방식','리월 장비점 제작');set(r,'강화 성장','공용 확률 강화 +10 / 돌파 후 +12');
  set(r,'전용 대상',excl?g.owner:'');set(r,'획득처/조건','리월 장비점 · 보스 재료 · Lv.6 이상'+(excl?' · 동료 합류 후':''));
  set(r,'ENHANCEMENT_PROFILE_JSON','{}');set(r,'ENHANCE_ALLOWED','Y');set(r,'ENHANCE_LIMIT',10);set(r,'NO_ENHANCE_REASON','');rows['16_EQUIP_DB'].push(r);};
 for(const w of WEAPONS)addGear(w,true);for(const g of BOSS_GEAR)addGear(g,false);
 const width=rows['17_RECIPE_DB'][0].length;
 const addRecipe=(g,excl)=>{const id=recipeId(g);if(has('17_RECIPE_DB',id))return;const cost=excl?{[g.material]:4,MAT_LIYUE_COR_LAPIS:6,ORE_CRYSTAL:3}:{[g.material]:3,MAT_LIYUE_COR_LAPIS:3};
  const r=Array(width).fill('');Object.assign(r,{0:id,1:excl?'무기 제작':({방어구:'장비 제작',장신구:'장신구 제작',특수:'특수장비 제작'}[g.type]),2:'EQUIP',3:g.id,4:1,15:excl?1800:900,16:'리월항',17:'MRC_LIYUE_EQUIP',18:'LEVEL>=6',19:excl?'3시간':'2시간',20:100,
   21:excl?charName(g.owner)+' 전용 무기 · '+(g.official?'원작 돌파 재료':'이 게임에 없는 보스라 대체 재료'):g.role+' · 보스 소재 장비'});
  Object.entries(cost).forEach(([item,n],i)=>{r[5+i*2]=item;r[6+i*2]=n;rows['48_RECIPE_INGREDIENT_DB'].push(['RI_'+id+'_'+(i+1),id,i+1,item,n,'재료'+(i+1),'','CRPG_EXCLUSIVE_V1']);});
  rows['17_RECIPE_DB'].push(r);};
 for(const w of WEAPONS)addRecipe(w,true);for(const g of BOSS_GEAR)addRecipe(g,false);
 this.db={...this.db,...rows};for(const n of names)this.tables[n]=new Map(rows[n].slice(1).filter(r=>r[0]).map(r=>[r[0],r]));
 this._placeCatalog=null;this._exclusiveWeaponsInstalled=true;
};
P.installMarketContent=function(...args){const out=old.installMarketContent.apply(this,args);this.installExclusiveWeapons();return out;};
P.extraGearTraits=function(id){const prior=old.extraGearTraits?.call(this,id)||[];return TRAITS[id]?[...prior,...TRAITS[id].map(x=>x.slice())]:prior;};
P.exclusiveOwner=function(equipId){return OWNER[equipId]||null;};
P.companionJoined=function(id){try{return JSON.parse(this.s.global.COMPANION_ELIGIBILITY_JSON||'{}')[id]?.state==='JOINED';}catch{return false;}};
P.exclusiveReason=function(equipId,owner){const excl=OWNER[equipId];if(!excl||!owner||owner===excl)return '';return '「'+(this.tables['16_EQUIP_DB']?.get(equipId)?.[1]||equipId)+'」은(는) '+(this.tables['07_CHAR_DB']?.get(excl)?.[1]||excl)+' 전용 무기입니다.';};
P.equipmentDefinition=function(slot,owner){const out=old.equipmentDefinition.call(this,slot,owner),why=this.exclusiveReason(out.inv.equip,owner);if(why)fail('EXCLUSIVE',why);return out;};
P.actionReason=function(type,a={}){if(type==='EQUIP'&&a.slot!==undefined&&a.owner){const inv=this.s?.inventory?.find(i=>i.slot===a.slot&&i.equip),why=inv&&this.exclusiveReason(inv.equip,a.owner);if(why)return why;}return old.actionReason.call(this,type,a);};
// Forty-three recipes would bury the forge: show a companion's weapon once that companion has joined.
P.placeRecipes=function(...args){return old.placeRecipes.apply(this,args).filter(x=>{const owner=OWNER[x.row?.[3]];return !owner||this.companionJoined(owner);});};
P.craftReason=function(input){const r=this.recipeDefinition(input[0]),owner=OWNER[r?.[3]];if(owner&&!this.companionJoined(owner))return (this.tables['07_CHAR_DB']?.get(owner)?.[1]||owner)+'이(가) 동료로 합류한 뒤 만들 수 있습니다.';return old.craftReason.call(this,input);};

// ---- signature traits in combat ----------------------------------------------------------------------------
P.combatDamageMultiplier=function(a,t,e,o={}){let n=old.combatDamageMultiplier.call(this,a,t,e,o);
 if(a?.side==='ALLY'&&t?.side!=='ALLY'){const sig=tv(a,'SIGNATURE');if(sig&&String(o.card||'').startsWith(a.source+'_'))n*=1+sig/100;}
 return n;};
P.heal=function(a,amount,source=''){const b=this.s.runtime;if(b&&a?.side==='ALLY'&&source){const healer=b.actors.find(x=>x.side==='ALLY'&&x.name===source&&x.hp>0),v=tv(healer,'HEAL_OUT');if(v)amount*=1+v/100;}return old.heal.call(this,a,amount,source);};
P.shield=function(a,value,source,rounds,extra={}){const b=this.s.runtime;if(b&&a?.side==='ALLY'&&typeof source==='string'){const caster=b.actors.find(x=>x.side==='ALLY'&&source.startsWith(x.source+'_')),v=tv(caster,'SHIELD_OUT');if(v)value*=1+v/100;}return old.shield.call(this,a,value,source,rounds,extra);};
P.exclusiveWeaponsVersion=1;
api.exclusiveWeapons={version:1,weapons:copy(WEAPONS),bossGear:copy(BOSS_GEAR),materials:copy(MAT),traits:Object.keys(NEW_TRAITS),recipeId:g=>recipeId(g)};
})(globalThis);
