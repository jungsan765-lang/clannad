/* User-approved raster maps. Anchors mark each area roughly, not live world coordinates; captions are player-facing.
   Indoor/underground areas use their entrance. Since 0.15.16 every place has its own circle (user: 「맵에 동그라미를 다
   치고」); a place beyond the picture sits on its edge, on the side where it lies. The few small spots that sat on another
   road's line (사냥터, 낚시터 셋, 검무덤, 야타용왕 입구) moved a little within their place, so a line never runs through a circle
   it does not reach. */
window.CRPGTerrainMap={version:2,width:880,height:786,atlases:{
 mond:{name:'몬드',url:'assets/terrain/mond.png'},
 // 0.16.2 (user: 「왜 수메르가 찍혀있고 … 침옥협곡은 아예 있지도 않은데 교영마을은 무엇? 로카팔라숲인데 저기」): the picture's left edge
 // shows Sumeru (its forest and a cut-off name), so a mist covers it; 침옥 협곡 is the misted block north-west of 경책 산장
 // (the picture predates it) and carries its name there.
 liyue:{name:'리월',url:'assets/terrain/liyue.png',mists:[[0,286,58,320]],captions:[['침옥 협곡',66,112]]}
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
 MAP_V141_STORMBEARER_PASS:['mond',546,182],
 MAP_V141_THOUSAND_RAVINE:['mond',614,298],
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
 // 침옥 협곡 (교영 마을 · 유롱항) is north-west Liyue, west of 경책 산장: the misted top-left block of this picture. Their dots
 // used to sit on the Sumeru forest at the left edge.
 MAP_CHENYU_QIAOYING:['liyue',60,200,'침옥 협곡 위쪽 골짜기'],
 MAP_CHENYU_YILONG:['liyue',95,265,'침옥 협곡 남쪽 나루'],
 MAP_AZHDAHA_DOMAIN:['liyue',207,427,'바위 결계 입구'],
 MAP_OSIAL_BATTLE:['liyue',658,610,'먼바다 전투 해역'],
 MAP_LIYUE_GOLDEN_HOUSE:['liyue',511,709,'황금옥 입구'],
 MAP_CRPG_LIYUE_BANK:['liyue',519,664,'방파제 낚시터']
}};
