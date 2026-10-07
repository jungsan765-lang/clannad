/* 0.16.8 objective DATA only. Runtime installs private commission rows; the shipped DB stays untouched.
 * 24 independent ten-part commissions. Only the next unclaimed part is revealed; the engine records
 * accepted objectives from successful new actions, with the party captured when combat starts.
 * Names are factual instructions using existing Mond/Liyue places, creatures, recipes and characters.
 * Selected difficulty: filter.minStage means enemy level for a domain/ley line, floor for the Abyss.
 * A resource goal counts newly obtained units; a recipe goal counts successful batches' requested quantity.
 * Recurring rewards keep the existing 20/70 Primogem budgets. One-time chains add mid/late Primogems.
 * Final-tier rewards mark a ten-part chain completion; lower-risk chains do not require protagonist Lv.60.
 */
(function(root){'use strict';
const C='MAP_MOND_CITY',L='MAP_LIYUE_HARBOR';
const full=elements=>({full:true,elements}),pair=(element,base='ANEMO')=>({full:true,elementCounts:{[base]:2,[element]:2}});
const squad=(...companions)=>({full:true,companions,companionRarity:4});
const o=(kind,name,goal,minLevel,filter={})=>({kind,name,goal,minLevel,filter});
const w=(name,goal,minLevel,filter={})=>o('win',name,goal,minLevel,filter);
const resource=(kind,name,goal,minLevel,item,maps)=>o(kind,name,goal,minLevel,{resources:[item],...(maps?{maps}: {})});
const cook=(name,goal,minLevel,recipe)=>o('cook',name,goal,minLevel,{recipes:[recipe]});
const forge=(name,goal,minLevel,recipe)=>o('forge',name,goal,minLevel,{recipes:[recipe]});
const domain=(name,goal,minLevel,type,level,maps,party)=>o('domain',name,goal,minLevel,{domainTypes:[type],minStage:level,...(maps?{maps}:{}),...(party?{party}:{})});
const ley=(name,goal,minLevel,type,level,party,maps)=>o('ley',name,goal,minLevel,{leyTypes:[type],minStage:level,...(party?{party}:{}),...(maps?{maps}:{})});
const boss=(name,goal,minLevel,id,party)=>o('boss',name,goal,minLevel,{enemies:[id],...(party?{party}:{})});
const abyss=(name,goal,minLevel,floor,party)=>o('abyss',name,goal,minLevel,{stages:[floor],...(party?{party}:{})});
const mono={full:true,mono:'ANEMO'},monoGeo={full:true,mono:'GEO'};
const families=[
 ['MOND_PATROL','몬드 순찰',C,[
  w('몬드 외곽 초원 전투 1번 승리',1,1,{maps:['MAP_MOND_PLAINS']}),
  w('속삭임의 숲 전투 2번 승리',2,5,{maps:['MAP_MOND_FOREST']}),
  w('바람이 시작되는 곳 전투 2번 승리',2,7,{maps:['MAP_MOND_WINDRISE']}),
  w('바람맞이 산 전투 2번 승리',2,12,{maps:['MAP_CRPG_STORMBEARER_MOUNTAINS']}),
  w('바람맞이 봉우리 전투 2번 승리',2,16,{maps:['MAP_CRPG_STORMBEARER_POINT']}),
  w('울프 영지 전투 3번 승리',3,17,{maps:['MAP_MOND_WOLVENDOM']}),
  w('맹세의 갑각 전투 3번 승리',3,20,{maps:['MAP_CRPG_CAPE_OATH']}),
  w('타타우파 협곡 전투 3번 승리',3,20,{maps:['MAP_CRPG_DADAUPA_GORGE']}),
  w('드래곤 스파인 전투 3번 승리',3,25,{maps:['MAP_DRAGONSPINE']}),
  w('바람 드래곤의 폐허 동부에서 4인으로 전투 4번 승리',4,30,{maps:['MAP_CRPG_LAIR_EAST_RUINS'],party:{full:true}})
 ]],
 ['LIYUE_PATROL','리월 순찰',L,[
  w('리월 평야·도로 전투 2번 승리',2,30,{maps:['MAP_LIYUE_PLAINS']}),
  w('적화주 전투 2번 승리',2,32,{maps:['MAP_LY_DETAIL_DIHUA']}),
  w('귀리 평원 전투 3번 승리',3,34,{maps:['MAP_LY_DETAIL_GUILI']}),
  w('명온 마을 전투 3번 승리',3,36,{maps:['MAP_LY_DETAIL_MINGYUN']}),
  w('녹화 연못 전투 3번 승리',3,36,{maps:['MAP_LY_DETAIL_LUHUA']}),
  w('절운간 전투 3번 승리',3,40,{maps:['MAP_LIYUE_JUEYUN']}),
  w('리월 산악지대 전투 4번 승리',4,42,{maps:['MAP_LIYUE_MOUNTAINS']}),
  w('고운각 전투 4번 승리',4,48,{maps:['MAP_LY_DETAIL_GUYUN']}),
  w('층암거연 지상 전투 4번 승리',4,50,{maps:['MAP_CHASM_SURFACE']}),
  w('층암거연 지하 심층에서 4인으로 전투 5번 승리',5,60,{maps:['MAP_CHASM_DEEP'],party:{full:true}})
 ]],
 ['SLIME','슬라임 대응',C,[
  w('바람 슬라임이 있는 전투 1번 승리',1,1,{enemies:['MON_SLIME_ANEMO']}),
  w('불 슬라임이 있는 전투 2번 승리',2,5,{enemies:['MON_SLIME_PYRO']}),
  w('물 슬라임이 있는 전투 2번 승리',2,5,{enemies:['MON_SLIME_HYDRO']}),
  w('번개 슬라임이 있는 전투 2번 승리',2,10,{enemies:['MON_SLIME_ELECTRO']}),
  w('얼음 슬라임이 있는 전투 2번 승리',2,15,{enemies:['MON_SLIME_CRYO']}),
  w('바위 슬라임이 있는 전투 2번 승리',2,20,{enemies:['MON_SLIME_GEO']}),
  w('풀 슬라임이 있는 전투 2번 승리',2,25,{enemies:['MON_SLIME_DENDRO']}),
  w('대형 물 슬라임 상대: 얼음 동료 포함 3승',3,30,{enemies:['MON_SLIME_LARGE_HYDRO'],party:full(['CRYO'])}),
  w('대형 얼음 슬라임 상대: 불 동료 포함 3승',3,40,{enemies:['MON_SLIME_LARGE_CRYO'],party:full(['PYRO'])}),
  w('대형 번개 슬라임 상대: 불·얼음 포함 4승',4,60,{enemies:['MON_SLIME_LARGE_ELECTRO'],party:full(['PYRO','CRYO'])})
 ]],
 ['HILICHURL','츄츄족 대응',C,[
  w('츄츄 싸움꾼이 있는 전투 1번 승리',1,1,{enemies:['MON_HILI_FIGHTER']}),
  w('츄츄 궁수가 있는 전투 2번 승리',2,5,{enemies:['MON_HILI_SHOOTER']}),
  w('화염탄 츄츄가 있는 전투 2번 승리',2,10,{enemies:['MON_HILI_GRENADIER']}),
  w('츄츄 화염 궁수 상대: 물 포함 2승',2,12,{enemies:['MON_HILI_PYRO_SHOOTER'],party:full(['HYDRO'])}),
  w('츄츄 얼음 궁수 상대: 불 포함 2승',2,15,{enemies:['MON_HILI_CRYO_SHOOTER'],party:full(['PYRO'])}),
  w('나무 방패 츄츄 폭도 상대: 불 포함 3승',3,20,{enemies:['MON_MITACHURL_WOOD'],party:full(['PYRO'])}),
  w('얼음 방패 츄츄 폭도 상대: 불·번개 포함 3승',3,25,{enemies:['MON_MITACHURL_ICE'],party:full(['PYRO','ELECTRO'])}),
  w('돌방패 츄츄 폭도 상대: 바위 포함 3승',3,35,{enemies:['MON_MITACHURL_ROCK'],party:full(['GEO'])}),
  w('불도끼 츄츄 폭도 상대: 물·얼음 포함 4승',4,45,{enemies:['MON_MITACHURL_AXE'],party:full(['HYDRO','CRYO'])}),
  w('번개 궁수 상대: 바위·불·얼음 포함 4승',4,60,{enemies:['MON_HILI_ELECTRO_SHOOTER'],party:full(['GEO','PYRO','CRYO'])})
 ]],
 ['BANDITS','보물 사냥단·우인단 대응',C,[
  w('보물 사냥단 척후병이 있는 전투 2승',2,5,{enemies:['MON_TH_SCOUT']}),
  w('보물 사냥단 신궁이 있는 전투 2승',2,10,{enemies:['MON_TH_MARKSMAN']}),
  w('보물 사냥단 불의 약제사 상대: 물 포함 2승',2,15,{enemies:['MON_TH_POTION_PYRO'],party:full(['HYDRO'])}),
  w('우인단 화승총 유격대 상대: 물 포함 2승',2,20,{enemies:['MON_FATUI_PYRO'],party:full(['HYDRO'])}),
  w('우인단 얼음총 중보병 상대: 불 포함 2승',2,25,{enemies:['MON_FATUI_CRYO'],party:full(['PYRO'])}),
  w('우인단 물총 중보병 상대: 얼음·번개 포함 3승',3,30,{enemies:['MON_FATUI_HYDRO'],party:full(['CRYO','ELECTRO'])}),
  w('우인단 바위 유격대 상대: 바위 포함 3승',3,35,{enemies:['MON_FATUI_GEO'],party:full(['GEO'])}),
  w('우인단 번개 해머 돌격대 상대: 얼음 포함 3승',3,40,{enemies:['MON_FATUI_ELECTRO'],party:full(['CRYO'])}),
  w('우인단 풍권 돌격대 상대: 불·물 포함 4승',4,50,{enemies:['MON_FATUI_ANEMO'],party:full(['PYRO','HYDRO'])}),
  w('우인단 상대: 4★ 동료 셋과 전투 5승',5,60,{enemies:['MON_FATUI_PYRO','MON_FATUI_CRYO','MON_FATUI_ELECTRO'],party:{full:true,companionRarity:4}})
 ]],
 ['RUINS','유적·층암거연 대응',L,[
  w('유적 가디언이 있는 전투 1번 승리',1,30,{enemies:['MON_RUIN_GUARD_VARIANT']}),
  w('새끼 바위 용 도마뱀이 있는 전투 2승',2,30,{enemies:['MON_GEOVISHAP_HATCHLING']}),
  w('유적 가디언 상대: 번개 포함 2승',2,35,{enemies:['MON_RUIN_GUARD_VARIANT'],party:full(['ELECTRO'])}),
  w('새끼 바위 용 도마뱀 상대: 바위 포함 2승',2,40,{enemies:['MON_GEOVISHAP_HATCHLING'],party:full(['GEO'])}),
  w('층암거연 지상에서 유적 가디언 전투 2승',2,50,{maps:['MAP_CHASM_SURFACE'],enemies:['MON_RUIN_GUARD_VARIANT']}),
  w('층암거연 지하에서 유적 가디언 전투 3승',3,56,{maps:['MAP_CHASM_DEEP'],enemies:['MON_RUIN_GUARD_VARIANT']}),
  w('빈 갑주 기수가 있는 전투 2승',2,56,{enemies:['MON_HUSK_STANDARD']}),
  w('빈 갑주 궁수가 있는 전투 2승',2,56,{enemies:['MON_HUSK_BOW']}),
  w('유적 가디언 상대: 물·얼음·번개 포함 3승',3,60,{enemies:['MON_RUIN_GUARD_VARIANT'],party:full(['HYDRO','CRYO','ELECTRO'])}),
  domain('암중협곡 Lv.60 경험치 비경 3승',3,60,'EXP',60,['MAP_CHASM_DEEP'],{full:true})
 ]],
 ['MOND_GATHER','몬드 채집',C,[
  resource('gather','초원에서 사과 3개 채집',3,1,'ING_APPLE',['MAP_MOND_PLAINS']),
  resource('gather','초원에서 일몰 열매 3개 채집',3,3,'ING_SUNSETTIA',['MAP_MOND_PLAINS']),
  resource('gather','초원에서 달콤달콤꽃 4개 채집',4,5,'ING_SWEET_FLOWER',['MAP_MOND_PLAINS']),
  resource('gather','속삭임의 숲에서 버섯 4개 채집',4,5,'ING_MUSHROOM',['MAP_MOND_FOREST']),
  resource('gather','속삭임의 숲에서 솔방울 4개 채집',4,7,'ING_PINECONE',['MAP_MOND_FOREST']),
  resource('gather','속삭임의 숲에서 송이버섯 5개 채집',5,10,'ING_MATSUTAKE',['MAP_MOND_FOREST']),
  resource('gather','속삭임의 숲에서 등불꽃 5개 채집',5,15,'ING_LAMP_GRASS',['MAP_MOND_FOREST']),
  resource('gather','다운 와이너리에서 라즈베리 6개 채집',6,20,'ING_BERRY',['MAP_MOND_DAWN_WINERY']),
  resource('gather','몬드 초원·숲길에서 새알 8개 채집',8,25,'ING_BIRD_EGG',['MAP_MOND_PLAINS','MAP_MOND_FOREST']),
  resource('gather','몬드 초원·숲길에서 민트 10개 채집',10,30,'ING_MINT',['MAP_MOND_PLAINS','MAP_MOND_FOREST'])
 ]],
 ['LIYUE_GATHER','리월 채집',L,[
  resource('gather','리월 평야에서 당근 3개 채집',3,30,'ING_CARROT',['MAP_LIYUE_PLAINS']),
  resource('gather','리월 평야에서 흰 무 4개 채집',4,30,'ING_RADISH',['MAP_LIYUE_PLAINS']),
  resource('gather','리월 평야에서 연꽃받침 4개 채집',4,32,'ING_LOTUS_HEAD',['MAP_LIYUE_PLAINS']),
  resource('gather','리월 평야에서 금어초 4개 채집',4,34,'ING_SNAPDRAGON',['MAP_LIYUE_PLAINS']),
  resource('gather','리월 평야에서 말총 5개 채집',5,36,'ING_HORSETAIL',['MAP_LIYUE_PLAINS']),
  resource('gather','절운간에서 죽순 5개 채집',5,40,'ING_BAMBOO_SHOOT',['MAP_LIYUE_JUEYUN']),
  resource('gather','절운간에서 절운고추 6개 채집',6,42,'MAT_LIYUE_JUEYUN_CHILI',['MAP_LIYUE_JUEYUN']),
  resource('gather','절운간에서 청심 8개 채집',8,45,'MAT_LIYUE_QINGXIN',['MAP_LIYUE_JUEYUN']),
  resource('gather','절운간에서 유리주머니 8개 채집',8,50,'MAT_LIYUE_VIOLETGRASS',['MAP_LIYUE_JUEYUN']),
  resource('gather','절운간에서 송이버섯 10개 채집',10,60,'ING_MATSUTAKE',['MAP_LIYUE_JUEYUN'])
 ]],
 ['MINING','광석 수집',C,[
  resource('mine','몬드 동쪽 광산에서 철광 3개 채광',3,1,'ORE_IRON',['MAP_CRPG_MOND_QUARRY']),
  resource('mine','몬드 동쪽 광산에서 백철 3개 채광',3,5,'ORE_WHITE_IRON',['MAP_CRPG_MOND_QUARRY']),
  resource('mine','몬드 동쪽 광산에서 수정 3개 채광',3,10,'ORE_CRYSTAL',['MAP_CRPG_MOND_QUARRY']),
  resource('mine','드래곤 스파인에서 성은 광석 4개 채광',4,24,'ORE_STARSILVER',['MAP_DRAGONSPINE']),
  resource('mine','드래곤 스파인에서 백철 4개 채광',4,25,'ORE_WHITE_IRON',['MAP_DRAGONSPINE']),
  resource('mine','바람 드래곤의 폐허에서 수정 4개 채광',4,28,'ORE_CRYSTAL',['MAP_STORMTERROR_LAIR']),
  resource('mine','층암거연 지상에서 철광 6개 채광',6,50,'ORE_IRON',['MAP_CHASM_SURFACE']),
  resource('mine','층암거연 지상에서 백철 6개 채광',6,50,'ORE_WHITE_IRON',['MAP_CHASM_SURFACE']),
  resource('mine','층암거연 지하에서 수정 8개 채광',8,56,'ORE_CRYSTAL',['MAP_CHASM_DEEP']),
  resource('mine','층암거연 지하에서 백철 10개 채광',10,60,'ORE_WHITE_IRON',['MAP_CHASM_DEEP'])
 ]],
 ['FISH_HUNT','낚시·사냥',C,[
  resource('fish','시드르 호수 낚시터에서 생선 살코기 3개 낚기',3,3,'ING_FISH',['MAP_CRPG_CIDER_BANK']),
  resource('hunt','속삭임의 숲 사냥터에서 짐승고기 4개 획득',4,6,'ING_RAW_MEAT',['MAP_CRPG_WHISPER_HUNT']),
  resource('fish','샘물 연못 낚시터에서 생선 살코기 4개 낚기',4,8,'ING_FISH',['MAP_CRPG_SPRING_POOL']),
  resource('hunt','샘물 마을에서 새고기 5개 획득',5,10,'ING_FOWL',['MAP_MOND_SPRINGVALE']),
  resource('fish','와이너리 강변 낚시터에서 생선 살코기 5개 낚기',5,12,'ING_FISH',['MAP_CRPG_DAWN_BANK']),
  resource('hunt','울프 영지에서 짐승고기 6개 획득',6,17,'ING_RAW_MEAT',['MAP_MOND_WOLVENDOM']),
  resource('hunt','속삭임의 숲 사냥터에서 새고기 6개 획득',6,20,'ING_FOWL',['MAP_CRPG_WHISPER_HUNT']),
  resource('fish','리월항 방파제 낚시터에서 생선 살코기 8개 낚기',8,30,'ING_FISH',['MAP_CRPG_LIYUE_BANK']),
  resource('hunt','리월 산악지대에서 짐승고기 10개 획득',10,42,'ING_RAW_MEAT',['MAP_LIYUE_MOUNTAINS']),
  resource('hunt','리월 산악지대에서 새고기 10개 획득',10,60,'ING_FOWL',['MAP_LIYUE_MOUNTAINS'])
 ]],
 ['COOKING','조리 기록',C,[
  cook('스테이크 1회 요리',1,1,'REC_FOOD_STEAK'),
  cook('달콤달콤 닭꼬치 2회 요리',2,3,'REC_FOOD_CHICKEN_SKEWER'),
  cook('몬드 생선구이 2회 요리',2,5,'REC_FOOD_MOND_GRILLED_FISH'),
  cook('흰 무 야채 수프 2회 요리',2,7,'REC_FOOD_RADISH_SOUP'),
  cook('민트 젤리 3회 요리',3,10,'REC_FOOD_MINT_JELLY'),
  cook('달콤달콤 닭고기 스튜 3회 요리',3,15,'REC_FOOD_SWEET_MADAME'),
  cook('모라육 3회 요리',3,30,'REC_FOOD_MORA_MEAT'),
  cook('고기볶음 3회 요리',3,35,'REC_FOOD_STIR_FRIED_FILET'),
  cook('연밥 계란찜 4회 요리',4,40,'REC_FOOD_LOTUS_EGG_SOUP'),
  cook('행인두부 4회 요리',4,50,'REC_FOOD_ALMOND_TOFU')
 ]],
 ['FORGING','단조 기록',C,[
  forge('참암 프로토타입 1개 단조',1,3,'REC_SWORD_RANCOUR'),
  forge('강철 벌침 1개 단조',1,5,'REC_SWORD_IRON_STING'),
  forge('백영검 1개 단조',1,7,'REC_CLAYMORE_WHITEBLIND'),
  forge('고화 프로토타입 1개 단조',1,10,'REC_CLAYMORE_ARCHAIC'),
  forge('별의 낫 프로토타입 1개 단조',1,12,'REC_POLEARM_STARGITTER'),
  forge('유월창 1개 단조',1,15,'REC_POLEARM_CRESCENT'),
  forge('담월 프로토타입 1개 단조',1,20,'REC_BOW_CRESCENT'),
  forge('만국 항해용해도 1개 단조',1,25,'REC_CATALYST_MAPPA'),
  forge('황금 호박 프로토타입 1개 단조',1,30,'REC_CATALYST_AMBER'),
  forge('철제 수호갑 1개 제작',1,40,'REC_ARMOR_IRON')
 ]],
 ['REVELATION','계시의 꽃 수련',C,[
  ley('계시의 꽃 Lv.6 이상 1승',1,5,'REVELATION',6),
  ley('몬드 계시의 꽃 Lv.6 이상 2승',2,10,'REVELATION',6,null,['MAP_MOND_PLAINS','MAP_MOND_FOREST','MAP_MOND_WINDRISE','MAP_MOND_WOLVENDOM','MAP_DRAGONSPINE']),
  ley('계시의 꽃 Lv.15 이상 1승',1,15,'REVELATION',15),
  ley('계시의 꽃 Lv.15 이상: 불·물 포함 2승',2,20,'REVELATION',15,full(['PYRO','HYDRO'])),
  ley('계시의 꽃 Lv.30 이상 2승',2,30,'REVELATION',30),
  ley('계시의 꽃 Lv.30 이상: 얼음·번개 포함 2승',2,35,'REVELATION',30,full(['CRYO','ELECTRO'])),
  ley('계시의 꽃 Lv.45 이상 2승',2,45,'REVELATION',45),
  ley('계시의 꽃 Lv.45 이상: 바위·물 포함 3승',3,50,'REVELATION',45,full(['GEO','HYDRO'])),
  ley('계시의 꽃 Lv.60: 4★ 동료 셋과 2승',2,60,'REVELATION',60,{full:true,companionRarity:4}),
  ley('계시의 꽃 Lv.60: 불·물·얼음 포함 3승',3,60,'REVELATION',60,full(['PYRO','HYDRO','CRYO']))
 ]],
 ['WEALTH','부의 꽃 수련',C,[
  ley('부의 꽃 Lv.6 이상 1승',1,5,'WEALTH',6),
  ley('부의 꽃 Lv.6 이상: 4인으로 2승',2,10,'WEALTH',6,{full:true}),
  ley('부의 꽃 Lv.15 이상 1승',1,15,'WEALTH',15),
  ley('부의 꽃 Lv.15 이상: 바위 포함 2승',2,20,'WEALTH',15,full(['GEO'])),
  ley('부의 꽃 Lv.30 이상 2승',2,30,'WEALTH',30),
  ley('부의 꽃 Lv.30 이상: 물·번개 포함 2승',2,35,'WEALTH',30,full(['HYDRO','ELECTRO'])),
  ley('부의 꽃 Lv.45 이상 2승',2,45,'WEALTH',45),
  ley('부의 꽃 Lv.45 이상: 불·얼음 포함 3승',3,50,'WEALTH',45,full(['PYRO','CRYO'])),
  ley('부의 꽃 Lv.60: 엠버·바바라·노엘과 2승',2,60,'WEALTH',60,squad('MOND_AMBER','MOND_BARBARA','MOND_NOELLE')),
  ley('부의 꽃 Lv.60: 풀·물·번개 포함 3승',3,60,'WEALTH',60,full(['DENDRO','HYDRO','ELECTRO']))
 ]],
 ['TALENT','특성 비경 수련',C,[
  domain('잊혀진 협곡 Lv.5 이상 1승',1,5,'TALENT',5,['MAP_D163_FORSAKEN_RIFT']),
  domain('잊혀진 협곡 Lv.10 이상 1승',1,10,'TALENT',10,['MAP_D163_FORSAKEN_RIFT']),
  domain('잊혀진 협곡 Lv.15 이상: 불 포함 1승',1,15,'TALENT',15,['MAP_D163_FORSAKEN_RIFT'],full(['PYRO'])),
  domain('잊혀진 협곡 Lv.20 이상: 물·번개 포함 2승',2,20,'TALENT',20,['MAP_D163_FORSAKEN_RIFT'],full(['HYDRO','ELECTRO'])),
  domain('잊혀진 협곡 Lv.25: 4★ 동료 셋과 2승',2,25,'TALENT',25,['MAP_D163_FORSAKEN_RIFT'],{full:true,companionRarity:4}),
  domain('태산부 Lv.30 이상 1승',1,30,'TALENT',30,['MAP_D163_TAISHAN_MANSION']),
  domain('태산부 Lv.40 이상: 바위 포함 2승',2,40,'TALENT',40,['MAP_D163_TAISHAN_MANSION'],full(['GEO'])),
  domain('태산부 Lv.50 이상: 물·얼음 포함 2승',2,50,'TALENT',50,['MAP_D163_TAISHAN_MANSION'],full(['HYDRO','CRYO'])),
  domain('태산부 Lv.55 이상: 향릉·행추·중운과 2승',2,55,'TALENT',55,['MAP_D163_TAISHAN_MANSION'],squad('LIYUE_XIANGLING','LIYUE_XINGQIU','LIYUE_CHONGYUN')),
  domain('태산부 Lv.60: 불·물·바위 포함 3승',3,60,'TALENT',60,['MAP_D163_TAISHAN_MANSION'],full(['PYRO','HYDRO','GEO']))
 ]],
 ['ASCENSION','돌파 비경 수련',C,[
  domain('각인의 골짜기 Lv.5 이상 1승',1,5,'ASCENSION',5,['MAP_D163_VALLEY_OF_REMEMBRANCE']),
  domain('각인의 골짜기 Lv.10 이상: 얼음 포함 1승',1,10,'ASCENSION',10,['MAP_D163_VALLEY_OF_REMEMBRANCE'],full(['CRYO'])),
  domain('각인의 골짜기 Lv.15: 불·물 포함 2승',2,15,'ASCENSION',15,['MAP_D163_VALLEY_OF_REMEMBRANCE'],full(['PYRO','HYDRO'])),
  domain('세실리아의 모밭 Lv.20 이상 2승',2,20,'ASCENSION',20,['MAP_D163_CECILIA_GARDEN']),
  domain('세실리아의 모밭 Lv.25: 4★ 동료 셋과 2승',2,25,'ASCENSION',25,['MAP_D163_CECILIA_GARDEN'],{full:true,companionRarity:4}),
  domain('천둥 연산 밀궁 Lv.30 이상 2승',2,30,'ASCENSION',30,['MAP_D163_LIANSHAN_FORMULA']),
  domain('천둥 연산 밀궁 Lv.40 이상: 불·얼음 포함 2승',2,40,'ASCENSION',40,['MAP_D163_LIANSHAN_FORMULA'],full(['PYRO','CRYO'])),
  domain('천둥 연산 밀궁 Lv.50 이상: 물·번개 포함 2승',2,50,'ASCENSION',50,['MAP_D163_LIANSHAN_FORMULA'],full(['HYDRO','ELECTRO'])),
  domain('천둥 연산 밀궁 Lv.55 이상: 북두·행추·요요와 2승',2,55,'ASCENSION',55,['MAP_D163_LIANSHAN_FORMULA'],squad('LIYUE_BEIDOU','LIYUE_XINGQIU','LIYUE_YAOYAO')),
  domain('천둥 연산 밀궁 Lv.60: 4인으로 3승',3,60,'ASCENSION',60,['MAP_D163_LIANSHAN_FORMULA'],{full:true})
 ]],
 ['EXPERIENCE','경험치 비경 순회',C,[
  domain('한 여름의 정원 Lv.5 이상 1승',1,5,'EXP',5,['MAP_D163_MIDSUMMER_COURTYARD']),
  domain('한 여름의 정원 Lv.10 이상 1승',1,10,'EXP',10,['MAP_D163_MIDSUMMER_COURTYARD']),
  domain('한 여름의 정원 Lv.15: 얼음 포함 1승',1,15,'EXP',15,['MAP_D163_MIDSUMMER_COURTYARD'],full(['CRYO'])),
  domain('빈다그니르의 정상 Lv.20 이상: 불 포함 1승',1,20,'EXP',20,['MAP_D163_PEAK_OF_VINDAGNYR'],full(['PYRO'])),
  domain('빈다그니르의 정상 Lv.25: 불·물 포함 2승',2,25,'EXP',25,['MAP_D163_PEAK_OF_VINDAGNYR'],full(['PYRO','HYDRO'])),
  domain('산등성이의 파수꾼 Lv.30 2승',2,30,'EXP',30,['MAP_D163_RIDGE_WATCH']),
  domain('무망 인구 밀궁 Lv.40: 물·얼음 포함 2승',2,40,'EXP',40,['MAP_D163_ZHOU_FORMULA'],full(['HYDRO','CRYO'])),
  domain('화지 산굴 Lv.45: 얼음·번개 포함 2승',2,45,'EXP',45,['MAP_D163_CLEAR_POOL'],full(['CRYO','ELECTRO'])),
  domain('하늘을 찌르는 땅 Lv.55: 바위 포함 2승',2,55,'EXP',55,['MAP_D163_DOMAIN_OF_GUYUN'],full(['GEO'])),
  domain('암중협곡 Lv.60: 4★ 동료 셋과 3승',3,60,'EXP',60,['MAP_CHASM_DEEP'],{full:true,companionRarity:4})
 ]],
 ['MOND_BOSSES','몬드 필드 보스',C,[
  boss('무상의 바람 1회 토벌',1,18,'FB_ANEMO_HYPOSTASIS'),
  boss('무상의 뇌전 1회 토벌',1,20,'FB_ELECTRO_HYPOSTASIS'),
  boss('얼음 나무 1회 토벌',1,22,'FB_CRYO_REGISVINE'),
  boss('무상의 바람: 엠버·바바라·노엘과 1승',1,25,'FB_ANEMO_HYPOSTASIS',squad('MOND_AMBER','MOND_BARBARA','MOND_NOELLE')),
  boss('무상의 뇌전: 불·얼음 포함 1승',1,28,'FB_ELECTRO_HYPOSTASIS',full(['PYRO','CRYO'])),
  boss('무상의 얼음: 불 포함 1승',1,30,'FB_CRYO_HYPOSTASIS',full(['PYRO'])),
  boss('얼음 나무: 엠버·베넷·바바라와 2승',2,35,'FB_CRYO_REGISVINE',squad('MOND_AMBER','MOND_BENNETT','MOND_BARBARA')),
  boss('무상의 뇌전: 4★ 동료 셋과 2승',2,40,'FB_ELECTRO_HYPOSTASIS',{full:true,companionRarity:4}),
  boss('무상의 얼음: 불·바위·번개 포함 2승',2,50,'FB_CRYO_HYPOSTASIS',full(['PYRO','GEO','ELECTRO'])),
  boss('무상의 바람: 불·물·얼음 포함 3승',3,60,'FB_ANEMO_HYPOSTASIS',full(['PYRO','HYDRO','CRYO']))
 ]],
 ['LIYUE_BOSSES','리월 필드 보스',L,[
  boss('폭염 나무: 물 포함 1승',1,38,'FB_PYRO_REGISVINE',full(['HYDRO'])),
  boss('물의 정령: 얼음·번개 포함 1승',1,40,'FB_OCEANID',full(['CRYO','ELECTRO'])),
  boss('무상의 바위: 바위 포함 1승',1,45,'FB_GEO_HYPOSTASIS',full(['GEO'])),
  boss('고대 바위 용 도마뱀: 노엘 포함 1승',1,48,'FB_PRIMO_GEOVISHAP',{full:true,companions:['MOND_NOELLE']}),
  boss('폭염 나무: 행추·중운·북두와 2승',2,50,'FB_PYRO_REGISVINE',squad('LIYUE_XINGQIU','LIYUE_CHONGYUN','LIYUE_BEIDOU')),
  boss('물의 정령: 케이아·피슬·설탕과 2승',2,52,'FB_OCEANID',squad('MOND_KAEYA','MOND_FISCHL','MOND_SUCROSE')),
  boss('무상의 바위: 노엘·응광·운근과 2승',2,55,'FB_GEO_HYPOSTASIS',squad('MOND_NOELLE','LIYUE_NINGGUANG','LIYUE_YUNJIN')),
  boss('유적의 뱀: 노엘 포함 1승',1,56,'FB_RUIN_SERPENT',{full:true,companions:['MOND_NOELLE']}),
  boss('고대 바위 용 도마뱀: 북두·행추·노엘과 2승',2,60,'FB_PRIMO_GEOVISHAP',squad('LIYUE_BEIDOU','LIYUE_XINGQIU','MOND_NOELLE')),
  boss('유적의 뱀: 불·물·바위 포함 2승',2,60,'FB_RUIN_SERPENT',full(['PYRO','HYDRO','GEO']))
 ]],
 ['ABYSS','나선비경 도전',C,[
  abyss('나선비경 1층 전투 3승',3,15,1),
  abyss('나선비경 2층 전투 3승',3,20,2),
  abyss('나선비경 3층 전투 3승',3,25,3),
  abyss('나선비경 4층 전투 3승',3,30,4),
  abyss('나선비경 5층 전투 3승',3,35,5),
  abyss('나선비경 6층 전투 3승',3,40,6),
  abyss('나선비경 7층 전투 3승',3,45,7),
  abyss('나선비경 8층 전투 3승',3,50,8),
  abyss('나선비경 9층 전투 3승',3,55,9),
  abyss('나선비경 12층 전투 3승',3,60,12)
 ]],
 ['MONO_ANEMO','바람·바위 4인 도전',C,[
  w('바람 원소 4인으로 초원 전투 2승',2,30,{maps:['MAP_MOND_PLAINS'],party:mono}),
  w('바람 원소 4인으로 숲길 전투 2승',2,32,{maps:['MAP_MOND_FOREST'],party:mono}),
  domain('바람 4인: 잊혀진 협곡 Lv.20 이상 1승',1,35,'TALENT',20,['MAP_D163_FORSAKEN_RIFT'],mono),
  ley('바람 4인: 계시의 꽃 Lv.30 이상 1승',1,35,'REVELATION',30,mono),
  ley('바람 4인: 부의 꽃 Lv.30 이상 2승',2,40,'WEALTH',30,mono),
  domain('바위 4인: 산등성이의 파수꾼 Lv.30 2승',2,42,'EXP',30,['MAP_D163_RIDGE_WATCH'],monoGeo),
  domain('바위 4인: 태산부 Lv.40 이상 2승',2,45,'TALENT',40,['MAP_D163_TAISHAN_MANSION'],monoGeo),
  w('바위 원소 4인으로 리월 산악지대 3승',3,50,{maps:['MAP_LIYUE_MOUNTAINS'],party:monoGeo}),
  ley('바위 4인: 계시의 꽃 Lv.45 이상 2승',2,55,'REVELATION',45,monoGeo),
  domain('바위 4인: 암중협곡 Lv.60 2승',2,60,'EXP',60,['MAP_CHASM_DEEP'],monoGeo)
 ]],
 ['DOUBLE_PAIRS','원소 2+2인 편성',C,[
  w('바람 2·불 2인으로 전투 2승',2,30,{party:pair('PYRO')}),
  w('바람 2·물 2인으로 전투 2승',2,32,{party:pair('HYDRO')}),
  w('바람 2·얼음 2인으로 전투 2승',2,35,{party:pair('CRYO')}),
  w('바람 2·번개 2인으로 전투 3승',3,38,{party:pair('ELECTRO')}),
  w('바람 2·바위 2인으로 전투 3승',3,40,{party:pair('GEO')}),
  ley('바람 2·불 2인: 계시의 꽃 Lv.30 이상 2승',2,42,'REVELATION',30,pair('PYRO')),
  ley('바람 2·물 2인: 부의 꽃 Lv.45 이상 2승',2,45,'WEALTH',45,pair('HYDRO')),
  domain('바람 2·얼음 2인: 태산부 Lv.50 이상 2승',2,50,'TALENT',50,['MAP_D163_TAISHAN_MANSION'],pair('CRYO')),
  boss('바위 2·얼음 2인: 물의 정령 2승',2,55,'FB_OCEANID',pair('CRYO','GEO')),
  domain('바위 2·번개 2인: 암중협곡 Lv.60 2승',2,60,'EXP',60,['MAP_CHASM_DEEP'],pair('ELECTRO','GEO'))
 ]],
 ['MOND_SQUADS','몬드 4★ 동료 편성',C,[
  w('엠버·케이아·리사와 초원 전투 2승',2,10,{maps:['MAP_MOND_PLAINS'],party:squad('MOND_AMBER','MOND_KAEYA','MOND_LISA')}),
  w('엠버·바바라·노엘과 숲길 전투 2승',2,15,{maps:['MAP_MOND_FOREST'],party:squad('MOND_AMBER','MOND_BARBARA','MOND_NOELLE')}),
  domain('베넷·피슬·설탕: 잊혀진 협곡 Lv.15 이상 1승',1,20,'TALENT',15,['MAP_D163_FORSAKEN_RIFT'],squad('MOND_BENNETT','MOND_FISCHL','MOND_SUCROSE')),
  domain('케이아·디오나·로자리아: 세실리아 Lv.20 이상 1승',1,25,'ASCENSION',20,['MAP_D163_CECILIA_GARDEN'],squad('MOND_KAEYA','MOND_DIONA','MOND_ROSARIA')),
  ley('리사·피슬·레이저: 부의 꽃 Lv.30 이상 1승',1,30,'WEALTH',30,squad('MOND_LISA','MOND_FISCHL','MOND_RAZOR')),
  ley('바바라·달리아·노엘: 계시의 꽃 Lv.30 이상 2승',2,35,'REVELATION',30,squad('MOND_BARBARA','MOND_DAHLIA','MOND_NOELLE')),
  boss('엠버·베넷·디오나와 얼음 나무 1승',1,40,'FB_CRYO_REGISVINE',squad('MOND_AMBER','MOND_BENNETT','MOND_DIONA')),
  domain('노엘·미카·로자리아: 태산부 Lv.45 이상 2승',2,45,'TALENT',45,['MAP_D163_TAISHAN_MANSION'],squad('MOND_NOELLE','MOND_MIKA','MOND_ROSARIA')),
  boss('피슬·케이아·바바라와 물의 정령 2승',2,50,'FB_OCEANID',squad('MOND_FISCHL','MOND_KAEYA','MOND_BARBARA')),
  domain('베넷·피슬·노엘: 암중협곡 Lv.60 2승',2,60,'EXP',60,['MAP_CHASM_DEEP'],squad('MOND_BENNETT','MOND_FISCHL','MOND_NOELLE'))
 ]],
 ['LIYUE_SQUADS','리월 4★ 동료 편성',L,[
  w('향릉·행추·중운과 리월 평야 전투 2승',2,30,{maps:['MAP_LIYUE_PLAINS'],party:squad('LIYUE_XIANGLING','LIYUE_XINGQIU','LIYUE_CHONGYUN')}),
  w('북두·행추·요요와 귀리 평원 전투 2승',2,34,{maps:['MAP_LY_DETAIL_GUILI'],party:squad('LIYUE_BEIDOU','LIYUE_XINGQIU','LIYUE_YAOYAO')}),
  domain('연비·행추·남연: 태산부 Lv.35 이상 1승',1,35,'TALENT',35,['MAP_D163_TAISHAN_MANSION'],squad('LIYUE_YANFEI','LIYUE_XINGQIU','LIYUE_LANYAN')),
  boss('중운·행추·운근과 폭염 나무 1승',1,38,'FB_PYRO_REGISVINE',squad('LIYUE_CHONGYUN','LIYUE_XINGQIU','LIYUE_YUNJIN')),
  ley('가명·향릉·요요: 계시의 꽃 Lv.30 이상 2승',2,40,'REVELATION',30,squad('LIYUE_GAMING','LIYUE_XIANGLING','LIYUE_YAOYAO')),
  w('신염·북두·운근과 리월 산악 전투 3승',3,42,{maps:['MAP_LIYUE_MOUNTAINS'],party:squad('LIYUE_XINYAN','LIYUE_BEIDOU','LIYUE_YUNJIN')}),
  domain('응광·운근·남연: 천둥 연산 Lv.45 이상 2승',2,45,'ASCENSION',45,['MAP_D163_LIANSHAN_FORMULA'],squad('LIYUE_NINGGUANG','LIYUE_YUNJIN','LIYUE_LANYAN')),
  boss('북두·요요·응광과 고대 바위 용 도마뱀 1승',1,48,'FB_PRIMO_GEOVISHAP',squad('LIYUE_BEIDOU','LIYUE_YAOYAO','LIYUE_NINGGUANG')),
  domain('연비·행추·중운: 태산부 Lv.55 이상 2승',2,55,'TALENT',55,['MAP_D163_TAISHAN_MANSION'],squad('LIYUE_YANFEI','LIYUE_XINGQIU','LIYUE_CHONGYUN')),
  domain('향릉·행추·요요: 암중협곡 Lv.60 2승',2,60,'EXP',60,['MAP_CHASM_DEEP'],squad('LIYUE_XIANGLING','LIYUE_XINGQIU','LIYUE_YAOYAO'))
 ]]
];
const commissionPrimogems=[0,0,0,20,30,40,60,80,120,300];
const chains=families.flatMap(([family,title,map,list])=>list.map((task,i)=>{
 const tier=i+1,id='Q_TASK_'+family+'_'+String(tier).padStart(2,'0');
 return {...task,id,family,tier,predecessor:i?'Q_TASK_'+family+'_'+String(i).padStart(2,'0'):'',map,
  name:title+' '+tier+' · '+task.name,description:task.name+' (수락 이후의 성공한 행동만 집계)'+(task.filter.party?.full?' · 전투 시작 때 주인공과 동료 3명으로 편성':'')+(task.filter.party?.companions?.length===1?' · 지정 동료 외 나머지 동료 2명 자유':''),reward:{mora:100+25*tier,...(commissionPrimogems[i]?{primogem:commissionPrimogems[i]}:{})}};
}));
const daily=[];
const weekly=[];
function pool(to,id,slot,task,icon){to.push({...task,id,slot,short:task.kind==='domain'?'비경 도전':task.kind==='ley'?'꽃 도전':task.kind==='boss'?'보스 토벌':task.kind==='win'?'전투 목표':task.kind==='abyss'?'나선 도전':'생활 목표',icon,reward:{mora:slot==='life'?400:600}});}
const d=(id,slot,task,icon='battle')=>pool(daily,'D_V168_'+id,slot,task,icon);
const z=(id,slot,task,icon='battle')=>pool(weekly,'W_V168_'+id,slot,task,icon);
// Four rotating daily buckets. Roster/route/difficulty eligibility is handled before selection.
d('HILI','win',w('츄츄 싸움꾼 전투 2승',2,1,{enemies:['MON_HILI_FIGHTER']}));
d('PYRO_HYDRO','win',w('불·물 포함 4인 전투 2승',2,20,{party:full(['PYRO','HYDRO'])}));
d('REVELATION15','ley',ley('계시의 꽃 Lv.15 이상 1승',1,15,'REVELATION',15),'ley');
d('WEALTH30','ley',ley('부의 꽃 Lv.30 이상 1승',1,30,'WEALTH',30),'ley');
d('TALENT15','domain',domain('특성 비경 Lv.15 이상 1승',1,15,'TALENT',15),'domain');
d('ASCENSION40','domain',domain('돌파 비경 Lv.40 이상: 물·번개 포함 1승',1,40,'ASCENSION',40,null,full(['HYDRO','ELECTRO'])),'domain');
d('APPLE','life',resource('gather','사과 3개 채집',3,1,'ING_APPLE',['MAP_MOND_PLAINS','MAP_MOND_FOREST']),'life');
d('STEAK','life',cook('스테이크 1회 요리',1,1,'REC_FOOD_STEAK'),'life');
// Weekly buckets use larger or more demanding goals. W_BONUS remains the existing five daily reports.
z('REACTION','win',w('불·물·얼음 포함 4인 전투 10승',10,30,{party:full(['PYRO','HYDRO','CRYO'])}));
z('CRYO_VINE','boss',boss('얼음 나무: 불 포함 3승',3,22,'FB_CRYO_REGISVINE',full(['PYRO'])),'boss');
z('OCEANID','boss',boss('물의 정령: 번개·얼음 포함 2승',2,40,'FB_OCEANID',full(['ELECTRO','CRYO'])),'boss');
z('TALENT30','domain',domain('태산부 Lv.30 이상 5승',5,30,'TALENT',30,['MAP_D163_TAISHAN_MANSION']),'domain');
root.CRPGTaskCatalogV0168={version:'0.16.8',daily,weekly,chains,families:families.map(([id,name,map,list])=>({id,name,map,count:list.length})),
 stats:{daily:daily.length,weekly:weekly.length,chains:chains.length,families:families.length},
 notes:{partySnapshot:'BATTLE_START',successors:'PREDECESSOR_CLAIMED',dailySlots:4,weeklySlots:4,
  dailyPrimogems:20,weeklyPrimogems:70,totalDailyCandidates:12,totalWeeklyCandidates:8,
  commissionPrimogems:15600,commissionPrimogemsPerChain:650,commissionRewardSchedule:commissionPrimogems.slice(),commissionXpBooks:0,commissionRepeatable:false,
  monoRoute:'Traveler ANEMO or unlocked GEO only; a joined four-person elemental roster is required',pairRoute:'Traveler ANEMO/GEO plus one matching companion and two of the other required element',
  namedSquad:'Three named joined 4-star companions plus the fixed protagonist slot'}};
})(globalThis);
