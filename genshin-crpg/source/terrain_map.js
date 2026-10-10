/* User-approved raster maps. Anchors mark each area roughly, not live world coordinates; captions are player-facing.
   Indoor/underground areas use their entrance. Since 0.15.16 every place has its own circle (user: 「맵에 동그라미를 다
   치고」); a place beyond the picture sits on its edge, on the side where it lies. The few small spots that sat on another
   road's line (사냥터, 낚시터 셋, 검무덤, 야타용왕 입구) moved a little within their place, so a line never runs through a circle
   it does not reach. */
window.CRPGTerrainMap={version:2,width:880,height:786,atlases:{
 mond:{name:'몬드',url:'assets/terrain/mond.png'},
 // 0.16.2 (user: 「왜 수메르가 찍혀있고」): the picture's left edge shows Sumeru (its forest and a cut-off name), so a mist covers it.
 // 0.16.3 (user: 「교영마을을 왜 굳이 침옥협곡쪽을 만들어서 넣는건데;; 거긴 빼도 된다고」): no 침옥 협곡 on this map, and its places are gone.
 liyue:{name:'리월',url:'assets/terrain/liyue.png',mists:[[0,286,58,320]]}
},points:{
 MAP_MOND_CITY:['mond',363,285],
 MAP_MOND_PLAINS:["mond", 426, 328, '몬드성 다리 동쪽의 초원'],
 MAP_MOND_FOREST:["mond", 455, 267, '속삭임의 숲 한가운데'],
 MAP_MOND_WINDRISE:["mond", 471, 371, '강 북쪽 들판의 거목'],
 MAP_MOND_SPRINGVALE:["mond", 385, 373, '샘물 마을 집들 사이'],
 MAP_MOND_WOLVENDOM:["mond", 274, 339, '울프 영지의 숲'],
 MAP_WOLF_ARENA:['mond',227,358,'울프 영지 깊숙한 곳'],
 MAP_MOND_DAWN_WINERY:["mond", 264, 413, '다운 와이너리 건물'],
 MAP_MOND_TEMPLE_FALCON:['mond',451,353,'비경 입구 근처'],
 MAP_MOND_TEMPLE_WOLF:['mond',554,304,'비경 입구 근처'],
 MAP_MOND_TEMPLE_LION:['mond',497,444,'비경 입구 근처'],
 MAP_MOND_FATUI_CACHE:['mond',529,382,'외딴 보관고 근처'],
 MAP_MOND_THOUSAND_WINDS:["mond", 596, 269, '천풍 신전의 둥근 폐허'],
 MAP_MOND_EAGLES_GATE:['mond',608,526,'비경 입구 근처'],
 MAP_MOND_ECLIPSE_CAMP:['mond',494,524,'츄츄족 야영지'],
 MAP_MOND_STARSNATCH_CLIFF:["mond", 606, 211, '바닷가 절벽 위'],
 MAP_CRPG_MOND_QUARRY:['mond',494,285,'몬드성 동쪽 채석장'],
 MAP_CRPG_CIDER_BANK:["mond", 421, 305, '호숫가 낚시터'],
 MAP_CRPG_WHISPER_HUNT:["mond", 446, 252, '숲속 사냥터'],
 MAP_CRPG_DAWN_BANK:["mond", 270, 447, '와이너리 남쪽 강변'],
 MAP_CRPG_SPRING_POOL:["mond", 383, 407, '샘물 마을 남쪽 연못가'],
 MAP_CRPG_STARFELL_LAKE:['mond',495,213],
 MAP_CRPG_STORMBEARER_MOUNTAINS:['mond',511,171],
 MAP_CRPG_STORMBEARER_POINT:['mond',577,140],
 MAP_CRPG_FALCON_COAST:["mond", 562, 367, '매의 해안 모래사장'],
 MAP_CRPG_DADAUPA_GORGE:['mond',548,499],
 MAP_CRPG_CAPE_OATH:['mond',668,492],
 // 0.15.16: places that used to borrow their parent's dot have their own (user: 「머스크 암초도 왜 그 위치가 있는데 거기로
 // 안가고 맹세의 갑각 옆이 머스크 암초로 표기되는지」). 머스크 암초 is the ring-shaped island off 맹세의 갑각.
 MAP_V141_MUSK_REEF:['mond',825,441],
 // 0.16.3: 돌풍 고개 is the hill where 무상의 바람 stands and 서리 협곡 the shore hollow of 얼음 나무 (HoYoLAB map), so their circles moved
 // there; 서리 협곡 sits a few pixels east of the tree so the 매의 해안 road does not run through it.
 MAP_V141_STORMBEARER_PASS:['mond',488,128],
 MAP_V141_THOUSAND_RAVINE:['mond',592,333],
 MAP_CRPG_BRIGHTCROWN_CANYON:['mond',226,267],
 MAP_STORMTERROR_LAIR:['mond',129,195,'폐허 입구'],
 MAP_CRPG_LAIR_OUTER_GATE:['mond',216,236],
 MAP_CRPG_LAIR_WEST_RUINS:['mond',90,208],
 MAP_CRPG_LAIR_EAST_RUINS:['mond',178,195],
 MAP_DRAGONSPINE:['mond',399,501,'설산 산기슭'],
 MAP_CRPG_DRAGONSPINE_CAMP:['mond',435,492],
 MAP_CRPG_SNOW_COVERED_PATH:['mond',415,519],
 MAP_CRPG_WYRMREST_VALLEY:['mond',333,515],
 MAP_CRPG_ENTOMBED_OUTSKIRTS:['mond',279,571],
 MAP_CRPG_ENTOMBED_PALACE:['mond',384,553,'고궁으로 내려가는 입구'],
 MAP_CRPG_STARGLOW_CAVERN:['mond',356,628,'동굴 입구 근처'],
 MAP_CRPG_SKYFROST_NAIL:['mond',370,574,'한천의 못 아래'],
 MAP_CRPG_SWORD_CEMETERY:['mond',555,480],
 // 0.16.3 (user: 「세실리아의 모밭은 크라운 협곡에 있어」, 「무상의 바위 위치랑 하늘을 찌르는 땅 비경 위치를 아직도 모르겠어?」): every domain and
 // field boss on its own circle at the original's spot. The HoYoLAB map's points over 4 plus (352, 274) here and (776, −93) on
 // the Liyue picture; 세실리아의 모밭, 빈다그니르의 정상 and 얼음 분지 sit a few pixels aside so no road runs through them.
 // 산등성이의 파수꾼 belongs to Liyue but lies on this picture's edge, west of Dragonspine.
 MAP_D163_FORSAKEN_RIFT:['mond',388,439,'샘물 마을 남쪽 골짜기'],
 MAP_D163_VALLEY_OF_REMEMBRANCE:['mond',332,429,'와이너리 동쪽 호숫가 골짜기'],
 MAP_D163_MIDSUMMER_COURTYARD:['mond',556,231,'별이 떨어지는 산골짜기 동쪽 언덕'],
 MAP_D163_CECILIA_GARDEN:['mond',220,292,'크라운 협곡 아래'],
 MAP_D163_PEAK_OF_VINDAGNYR:['mond',382,598,'한천의 못 아래'],
 MAP_D163_RIDGE_WATCH:['mond',244,489,'드래곤 스파인 서쪽, 리월 경계'],
 MAP_D163_ELECTRO_HYPOSTASIS:['mond',651,526,'맹세의 갑각 남서쪽 둥근 터'],
 MAP_D163_CRYO_HYPOSTASIS:['mond',308,566,'드래곤이 잠든 협곡 남서쪽 분지'],
 MAP_LIYUE_HARBOR:['liyue',501,629],
 MAP_LIYUE_PLAINS:['liyue',533,359,'넓은 평야와 큰길'],
 MAP_LIYUE_MOUNTAINS:['liyue',214,334,'험한 산악 지대'],
 MAP_LIYUE_QINGCE:['liyue',421,84],
 MAP_LIYUE_JUEYUN:['liyue',275,332],
 MAP_CHASM_SURFACE:['liyue',139,660],
 MAP_CHASM_DEEP:['liyue',124,679,'층암거연 지하 · 입구는 지상'],
 MAP_V141_CHASM_CAMP:['liyue',236,681],
 MAP_V141_GUYUN_WRECK:['liyue',752,571],
 MAP_V141_GUYUN_CHANNEL:['liyue',797,601],
 MAP_D163_ZHOU_FORMULA:['liyue',492,65,'무망의 언덕 북쪽 바위 언덕'],
 MAP_D163_OCEANID:['liyue',521,42,'경책 산장 동쪽 호수'],
 MAP_D163_LIANSHAN_FORMULA:['liyue',692,307,'명온 마을 동쪽 해안 절벽'],
 MAP_D163_TAISHAN_MANSION:['liyue',298,324,'절운간 동쪽 물웅덩이'],
 MAP_D163_CLEAR_POOL:['liyue',235,165,'오장산 북쪽 물가'],
 MAP_D163_DOMAIN_OF_GUYUN:['liyue',830,559,'고운각 큰 섬 한가운데'],
 MAP_D163_GEO_HYPOSTASIS:['liyue',802,476,'고운각 북쪽 섬의 둥근 터'],
 MAP_D163_PYRO_REGISVINE:['liyue',353,450,'천주 골짜기 동쪽 고원'],
 MAP_AZHDAHA_DOMAIN:['liyue',207,427,'바위 결계 입구'],
 MAP_OSIAL_BATTLE:['liyue',658,610,'먼바다 전투 해역'],
 MAP_LIYUE_GOLDEN_HOUSE:['liyue',511,709,'황금옥 입구'],
 MAP_CRPG_LIYUE_BANK:['liyue',519,664,'방파제 낚시터']
}};
