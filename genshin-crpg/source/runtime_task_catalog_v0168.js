/* 0.16.9 objective DATA only. Stable IDs and a legacy snapshot preserve 0.16.8 accepted objectives. Runtime installs private commission rows; the shipped DB stays untouched.
 * 24 independent ten-part commissions. Only the next unclaimed part is revealed; the engine records
 * accepted objectives from successful new actions, with the party captured when combat starts.
 * Names are factual instructions using existing Mond/Liyue places, creatures, recipes and characters.
 * Selected difficulty: filter.minStage means enemy level for a domain/ley line, floor for the Abyss.
 * A resource goal counts newly obtained units; a recipe goal counts successful batches' requested quantity.
 * Daily reporting keeps 20 Primogems; the expanded weekly board has a separate all-complete report.
 * One-time rewards are explicit per objective; no protagonist-level multiplier is applied to the new rewards.
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
const legacySchedule=[0,0,0,20,30,40,60,80,120,300];
function chainRows(rewards){return families.flatMap(([family,title,map,list])=>list.map((task,i)=>{
 const tier=i+1,id='Q_TASK_'+family+'_'+String(tier).padStart(2,'0');
 const reward=rewards?{mora:rewards[family][i][0],...(rewards[family][i][1]?{primogem:rewards[family][i][1]}:{})}:{mora:100+25*tier,...(legacySchedule[i]?{primogem:legacySchedule[i]}:{})};
 return {...task,id,family,tier,predecessor:i?'Q_TASK_'+family+'_'+String(i).padStart(2,'0'):'',map,
  name:title+' '+tier+' · '+task.name,description:task.name+' (수락 이후의 성공한 행동만 집계)'+(task.filter.party?.full?' · 전투 시작 때 주인공과 동료 3명으로 편성':'')+(task.filter.party?.companions?.length===1?' · 지정 동료 외 나머지 동료 2명 자유':''),reward,
  ...(rewards?{rewardScale:'absolute',rewardRole:reward.mora===0?'primogem':reward.primogem>=150?'balanced':'mora'}:{})};
}));}
const legacyChains=chainRows(null);
const legacyDailyDefinitions=[{"kind":"win","name":"츄츄 싸움꾼 전투 2승","goal":2,"minLevel":1,"filter":{"enemies":["MON_HILI_FIGHTER"]},"id":"D_V168_HILI","slot":"win","short":"전투 목표","icon":"battle","reward":{"mora":600}},{"kind":"win","name":"불·물 포함 4인 전투 2승","goal":2,"minLevel":20,"filter":{"party":{"full":true,"elements":["PYRO","HYDRO"]}},"id":"D_V168_PYRO_HYDRO","slot":"win","short":"전투 목표","icon":"battle","reward":{"mora":600}},{"kind":"ley","name":"계시의 꽃 Lv.15 이상 1승","goal":1,"minLevel":15,"filter":{"leyTypes":["REVELATION"],"minStage":15},"id":"D_V168_REVELATION15","slot":"ley","short":"꽃 도전","icon":"ley","reward":{"mora":600}},{"kind":"ley","name":"부의 꽃 Lv.30 이상 1승","goal":1,"minLevel":30,"filter":{"leyTypes":["WEALTH"],"minStage":30},"id":"D_V168_WEALTH30","slot":"ley","short":"꽃 도전","icon":"ley","reward":{"mora":600}},{"kind":"domain","name":"특성 비경 Lv.15 이상 1승","goal":1,"minLevel":15,"filter":{"domainTypes":["TALENT"],"minStage":15},"id":"D_V168_TALENT15","slot":"domain","short":"비경 도전","icon":"domain","reward":{"mora":600}},{"kind":"domain","name":"돌파 비경 Lv.40 이상: 물·번개 포함 1승","goal":1,"minLevel":40,"filter":{"domainTypes":["ASCENSION"],"minStage":40,"party":{"full":true,"elements":["HYDRO","ELECTRO"]}},"id":"D_V168_ASCENSION40","slot":"domain","short":"비경 도전","icon":"domain","reward":{"mora":600}},{"kind":"gather","name":"사과 3개 채집","goal":3,"minLevel":1,"filter":{"resources":["ING_APPLE"],"maps":["MAP_MOND_PLAINS","MAP_MOND_FOREST"]},"id":"D_V168_APPLE","slot":"life","short":"생활 목표","icon":"life","reward":{"mora":400}},{"kind":"cook","name":"스테이크 1회 요리","goal":1,"minLevel":1,"filter":{"recipes":["REC_FOOD_STEAK"]},"id":"D_V168_STEAK","slot":"life","short":"생활 목표","icon":"life","reward":{"mora":400}}];
const legacyWeeklyDefinitions=[{"kind":"win","name":"불·물·얼음 포함 4인 전투 10승","goal":10,"minLevel":30,"filter":{"party":{"full":true,"elements":["PYRO","HYDRO","CRYO"]}},"id":"W_V168_REACTION","slot":"win","short":"전투 목표","icon":"battle","reward":{"mora":600}},{"kind":"boss","name":"얼음 나무: 불 포함 3승","goal":3,"minLevel":22,"filter":{"enemies":["FB_CRYO_REGISVINE"],"party":{"full":true,"elements":["PYRO"]}},"id":"W_V168_CRYO_VINE","slot":"boss","short":"보스 토벌","icon":"boss","reward":{"mora":600}},{"kind":"boss","name":"물의 정령: 번개·얼음 포함 2승","goal":2,"minLevel":40,"filter":{"enemies":["FB_OCEANID"],"party":{"full":true,"elements":["ELECTRO","CRYO"]}},"id":"W_V168_OCEANID","slot":"boss","short":"보스 토벌","icon":"boss","reward":{"mora":600}},{"kind":"domain","name":"태산부 Lv.30 이상 5승","goal":5,"minLevel":30,"filter":{"domainTypes":["TALENT"],"minStage":30,"maps":["MAP_D163_TAISHAN_MANSION"]},"id":"W_V168_TALENT30","slot":"domain","short":"비경 도전","icon":"domain","reward":{"mora":600}}];
// Each pair is [absolute Mora, finite Primogems]. This is deliberately not a level/tier formula.
// Travel/resource tasks emphasize cash; demanding elemental/named squads emphasize finite Primogems.
const rewards={
 MOND_PATROL:[[1000,0],[1800,0],[2300,0],[3200,0],[4200,10],[5200,0],[6800,15],[8000,20],[10000,30],[16000,80]],
 LIYUE_PATROL:[[7000,0],[8500,0],[10500,10],[12000,15],[13500,0],[17000,20],[19500,30],[25000,40],[30000,60],[42000,150]],
 SLIME:[[600,0],[1400,0],[1600,0],[2300,0],[3300,0],[4500,10],[6000,15],[6500,25],[8000,40],[14000,100]],
 HILICHURL:[[1200,0],[2000,0],[2800,0],[2800,10],[3600,10],[5200,20],[6000,30],[8500,40],[12000,60],[22000,150]],
 BANDITS:[[1500,0],[2300,0],[3400,10],[4200,15],[5300,20],[7800,30],[9000,40],[11000,60],[14000,75],[28000,200]],
 RUINS:[[7000,10],[8500,15],[11000,25],[14000,30],[18000,30],[25000,50],[22000,50],[24000,60],[29000,100],[36000,250]],
 MOND_GATHER:[[800,0],[1000,0],[1300,0],[1500,0],[1700,0],[2300,0],[2800,5],[3600,5],[4500,10],[6500,20]],
 LIYUE_GATHER:[[4000,0],[4800,0],[5200,0],[5800,0],[6700,5],[7500,10],[8500,10],[10500,15],[11500,20],[12500,50]],
 MINING:[[1500,0],[2200,0],[3300,0],[5000,0],[5500,0],[6500,5],[10000,10],[11000,10],[15000,15],[18000,40]],
 FISH_HUNT:[[1200,0],[1800,0],[2100,0],[2600,0],[3400,0],[5000,5],[5500,10],[9000,15],[14000,20],[16000,50]],
 COOKING:[[900,0],[1600,0],[2100,0],[1900,0],[2700,5],[3300,10],[5300,10],[5500,15],[7600,20],[8500,40]],
 FORGING:[[4500,10],[5000,10],[5200,15],[5600,15],[6000,20],[6500,20],[7500,25],[8500,30],[9500,45],[18000,80]],
 REVELATION:[[1500,0],[3000,0],[3500,5],[5000,20],[8000,10],[9000,30],[11000,20],[15000,50],[16000,75],[18000,150]],
 WEALTH:[[6000,0],[10000,0],[12000,0],[15000,0],[22000,0],[28000,0],[35000,0],[46000,0],[52000,10],[60000,30]],
 TALENT:[[1800,0],[2300,0],[3000,10],[5000,30],[6500,40],[6000,20],[10000,50],[14000,70],[0,200],[22000,250]],
 ASCENSION:[[1800,0],[2700,10],[4200,25],[6000,20],[8000,40],[9000,30],[14000,60],[17000,90],[0,200],[30000,250]],
 EXPERIENCE:[[1800,0],[2300,0],[3300,10],[5200,20],[7000,30],[9500,25],[13000,50],[15000,65],[18000,90],[20000,200]],
 MOND_BOSSES:[[6500,10],[8000,15],[9500,20],[5000,80],[12000,60],[13000,60],[18000,120],[25000,90],[30000,150],[45000,300]],
 LIYUE_BOSSES:[[12000,30],[15000,50],[18000,60],[20000,80],[10000,180],[0,250],[0,300],[25000,150],[38000,250],[65000,400]],
 ABYSS:[[5000,40],[8000,60],[12000,100],[18000,140],[25000,180],[33000,240],[44000,300],[55000,400],[70000,500],[90000,1000]],
 MONO_ANEMO:[[3000,40],[4000,50],[0,80],[5000,75],[10000,100],[0,140],[12000,180],[18000,180],[22000,240],[0,500]],
 DOUBLE_PAIRS:[[3500,40],[4000,50],[4500,60],[6000,80],[8000,100],[10000,130],[16000,160],[0,200],[20000,300],[0,500]],
 MOND_SQUADS:[[2200,25],[3000,40],[0,80],[0,100],[6000,100],[9000,120],[12000,180],[0,200],[16000,300],[0,500]],
 LIYUE_SQUADS:[[5500,50],[6500,65],[0,120],[0,150],[10000,160],[15000,150],[0,220],[22000,250],[0,350],[0,600]]
};
const chains=chainRows(rewards);
const LEVELS=[1,10,20,30,40,50,60],brackets=values=>LEVELS.map((minLevel,i)=>({minLevel,mora:values[i]}));
const cash=(values,extra={})=>({moraByLevel:brackets(values),...extra});
const DAILY_WIN=cash([300,800,1200,1800,2400,3200,4200],{items:{MAT_CHAR_EXP_ADVENTURER:2}});
const DAILY_LEY=cash([600,900,1300,1900,2700,3500,4500]);
const DAILY_DOMAIN=cash([500,1000,1500,2200,3000,3800,4800],{items:{MAT_CHAR_EXP_ADVENTURER:2}});
const DAILY_LIFE=cash([400,600,900,1200,1600,2100,2700]);
const legacyDaily=[
 {id:'D_WIN',kind:'win',goal:5,minLevel:1,filter:{},name:'전투 5번 이기기',short:'5승',icon:'battle',reward:DAILY_WIN},
 {id:'D_LEY',kind:'ley',goal:2,minLevel:1,filter:{},name:'지맥의 꽃 2번 이기기',short:'꽃 2승',icon:'ley',reward:DAILY_LEY},
 {id:'D_DOMAIN',kind:'domain',goal:3,minLevel:1,filter:{},name:'비경 3번 이기기',short:'비경 3승',icon:'domain',reward:DAILY_DOMAIN},
 {id:'D_LIFE',kind:'life',goal:3,minLevel:1,filter:{},name:'채집·채광·사냥·낚시 3번',short:'생활 3회',icon:'life',reward:DAILY_LIFE}
];
const legacyWeekly=[
 {id:'W_WIN',kind:'win',goal:150,minLevel:1,filter:{},name:'전투 150번 이기기',short:'150승',icon:'battle',reward:cash([2600,4200,6500,9100,13000,16900,20800],{items:{MAT_CHAR_EXP_HERO:2}})},
 {id:'W_BOSS',kind:'boss',goal:10,minLevel:1,filter:{},name:'필드 보스 10번 토벌',short:'보스 10승',icon:'boss',reward:cash([3900,5800,9100,14300,19500,25400,32500],{primogem:50})},
 {id:'W_DOMAIN',kind:'domain',goal:30,minLevel:1,filter:{},name:'비경 30번 이기기',short:'비경 30승',icon:'domain',reward:cash([2600,4200,6500,9800,14300,19500,26000],{items:{MAT_CHAR_EXP_HERO:3}})},
 {id:'W_BONUS',kind:'bonus',goal:5,minLevel:1,filter:{},name:'오늘의 임무 모두 달성 보상 5번 받기',short:'일일 보고 5회',icon:'bonus',reward:cash([1300,2000,2900,4200,5800,7800,9800],{primogem:40})}
];
const daily=[],weekly=[];
function pool(to,id,slot,task,icon,reward,extra={}){to.push({...task,id,slot,short:task.kind==='domain'?'비경 도전':task.kind==='ley'?'꽃 도전':task.kind==='boss'?'보스 토벌':task.kind==='win'?'전투 목표':task.kind==='abyss'?'나선 도전':'생활 목표',icon,reward,...extra});}
const d=(id,slot,task,icon,reward,extra)=>pool(daily,'D_V168_'+id,slot,task,icon,reward,extra);
const z=(id,slot,task,icon,reward,extra)=>pool(weekly,'W_V168_'+id,slot,task,icon,reward,extra);
// Stable legacy suffixes are IDs only: no daily blossom/domain objective imposes a stage or roster.
d('HILI','win',w('전투 5번 이기기',5,1), 'battle',cash([500,900,1400,2100,2900,3900,5200]));
d('PYRO_HYDRO','win',w('보유 원소를 포함하여 전투 5번 이기기',5,1), 'battle',cash([200,450,700,1100,1600,2200,3000]),{dynamicElements:true});
d('REVELATION15','ley',o('ley','계시의 꽃 1번 이기기',1,1,{leyTypes:['REVELATION']}),'ley',cash([600,1000,1400,2000,2800,3600,4600]));
d('WEALTH30','ley',o('ley','부의 꽃 1번 이기기',1,1,{leyTypes:['WEALTH']}),'ley',cash([1200,1700,2200,3000,4200,5200,6500]));
d('TALENT15','domain',o('domain','특성 비경 3번 이기기',3,1,{domainTypes:['TALENT']}),'domain',cash([800,1500,2300,3200,4400,5500,7000]));
d('ASCENSION40','domain',o('domain','돌파 비경 3번 이기기',3,1,{domainTypes:['ASCENSION']}),'domain',cash([1000,1800,2600,3800,5000,6500,8000]));
d('APPLE','life',o('gather','채집 3번 하기',3,1),'life',DAILY_LIFE,{countMode:'actions'});
d('STEAK','life',o('cook','요리 3개 만들기',3,1),'life',cash([700,1000,1400,1900,2500,3200,3900]));
// Twenty actual weekly assignments draw from distinct available activities. Goals count together;
// e.g. one talent-domain win contributes to all wins, all domains, and the talent objective.
z('REACTION','win',w('보유 원소를 포함하여 전투 30번 이기기',30,1),'battle',cash([1000,1600,2600,4200,5800,7800,10400],{primogem:30}),{dynamicElements:true});
z('CRYO_VINE','boss',boss('얼음 나무 3번 토벌',3,1,'FB_CRYO_REGISVINE'),'boss',cash([1300,2600,3900,5800,7800,9800,11700],{primogem:20}));
z('OCEANID','boss',boss('물의 정령 3번 토벌',3,1,'FB_OCEANID'),'boss',cash([1600,2900,4600,7200,9800,13000,16200],{primogem:40}));
z('TALENT30','domain',o('domain','특성 비경 20번 이기기',20,1,{domainTypes:['TALENT']}),'domain',cash([3200,5500,8400,13000,18800,25400,32500]));
z('ASCENSION','domain',o('domain','돌파 비경 20번 이기기',20,1,{domainTypes:['ASCENSION']}),'domain',cash([3600,6200,9400,14300,20200,27300,35800]));
z('EXPERIENCE','domain',o('domain','경험치 비경 20번 이기기',20,1,{domainTypes:['EXP']}),'domain',cash([2000,3200,5200,7800,11000,15000,19500],{primogem:30}));
z('REVELATION','ley',o('ley','계시의 꽃 10번 이기기',10,1,{leyTypes:['REVELATION']}),'ley',cash([1600,2600,3900,6200,8400,11700,15600]));
z('WEALTH','ley',o('ley','부의 꽃 10번 이기기',10,1,{leyTypes:['WEALTH']}),'ley',cash([5500,7500,11000,17000,24000,33000,45000]));
z('GATHER','life',o('gather','채집 30번 하기',30,1),'life',cash([1000,1600,2600,4200,5800,7800,10400]),{countMode:'actions'});
z('MINE','life',o('mine','채광 20번 하기',20,1),'life',cash([1300,2300,3600,5500,7800,10400,14300]),{countMode:'actions'});
z('FISH','life',o('fish','낚시 20번 하기',20,1),'life',cash([1000,1600,2600,3900,5500,7200,9100],{primogem:20}),{countMode:'actions'});
z('HUNT','life',o('hunt','사냥 20번 하기',20,1),'life',cash([1200,2000,2900,4600,6500,8800,11700]),{countMode:'actions'});
z('COOK','life',o('cook','요리 20개 만들기',20,1),'life',cash([1600,2600,3900,5500,7800,10400,14300]));
z('FORGE','life',o('forge','장비 3개 제작하기',3,1,{equipmentOutput:true}),'life',cash([3200,4600,7200,9800,13000,16900,22100],{primogem:20}));
z('ABYSS','abyss',o('abyss','나선비경 전투 9번 이기기',9,1),'abyss',cash([0,0,1600,2600,4600,7200,11700],{primogem:80}));
z('MOND_PATROL','win',w('몬드 초원·숲·바람이 시작되는 곳에서 전투 40번 승리',40,1,{maps:['MAP_MOND_PLAINS','MAP_MOND_FOREST','MAP_MOND_WINDRISE']}),'battle',cash([2300,3600,5200,7800,10700,14300,18800]));
z('LIYUE_PATROL','win',w('리월 평야·산악·절운간에서 전투 40번 승리',40,1,{maps:['MAP_LIYUE_PLAINS','MAP_LIYUE_MOUNTAINS','MAP_LIYUE_JUEYUN']}),'battle',cash([2600,4200,6200,9400,13600,18800,24700],{primogem:40}));
z('DOMAIN_CIRCUIT','domain',o('domain','비경 50번 이기기',50,1),'domain',cash([3900,6500,10100,15300,21800,29600,39000],{primogem:60}));
z('LIFE_SUPPLY','life',o('life','채집·채광·낚시·사냥 60번 하기',60,1),'life',cash([2000,3200,5200,7800,11000,15000,19500]));
z('ORE_SUPPLY','life',o('mine','광석 60개 새로 채광하기',60,1),'life',cash([1600,2900,4200,6500,9400,12700,16900]),{countMode:'units'});
// Guaranteed weekly farming/long-operation targets occupy their slots when their native activity is unlocked.
for(const t of legacyWeekly)t.weeklyCore=true;
for(const id of ['W_V168_TALENT30','W_V168_ASCENSION','W_V168_EXPERIENCE','W_V168_WEALTH','W_V168_DOMAIN_CIRCUIT','W_V168_LIFE_SUPPLY']){const t=weekly.find(t=>t.id===id);if(t)t.weeklyCore=true;}
const familyTotals=families.map(([id,name,map,list])=>({id,name,map,count:list.length,mora:chains.filter(t=>t.family===id).reduce((n,t)=>n+t.reward.mora,0),primogem:chains.filter(t=>t.family===id).reduce((n,t)=>n+(t.reward.primogem||0),0)}));
root.CRPGTaskCatalogV0168={version:'0.16.9',daily,weekly,chains,legacyChains,legacyDailyDefinitions,legacyWeeklyDefinitions,legacyDaily,legacyWeekly,
 families:familyTotals,
 stats:{daily:daily.length,weekly:weekly.length,chains:chains.length,families:families.length},
 notes:{partySnapshot:'BATTLE_START',successors:'PREDECESSOR_CLAIMED',dailySlots:4,weeklySlots:20,
  dailyPrimogems:20,weeklyAllPrimogems:200,totalDailyCandidates:daily.length+legacyDaily.length,totalWeeklyCandidates:weekly.length+legacyWeekly.length,
  commissionPrimogems:familyTotals.reduce((n,t)=>n+t.primogem,0),commissionMora:familyTotals.reduce((n,t)=>n+t.mora,0),commissionRewardSchedule:'PER_OBJECTIVE_ABSOLUTE',commissionXpBooks:0,commissionRepeatable:false,
  recurringRewardSnapshot:'Level bracket is fixed when the day/week objective is assigned; no later level multiplier.',
  weeklyOverlap:'Successful actions satisfy every accepted matching weekly target; overlapping goals do not require duplicate runs.',
  monoRoute:'Traveler ANEMO or unlocked GEO only; a joined four-person elemental roster is required',pairRoute:'Traveler ANEMO/GEO plus one matching companion and two of the other required element',
  namedSquad:'Three named joined 4-star companions plus the fixed protagonist slot'}};
})(globalThis);
