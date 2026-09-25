/* Mond local encounter pass. Existing species only; no remote writes. */
(function(root){
'use strict';const api=root.CRPGRuntime;
const CONFIG={
  "version": 2,
  "scope": "MOND_RANDOM_ONLY",
  "authorship": "CRPG 지역별 조우 설계; 확률·레벨·수치는 원작 수치가 아님",
  "sourceWorkbookSha256": "48c1efe3229bf9ea20407663be116c4c2a171a87e71c27511960c4f7e41d3c3d",
  "riskLabels": {
    "1": "성 주변",
    "2": "근교 야외",
    "3": "외곽 야생",
    "4": "위험 지대",
    "5": "폐허·설산 입구",
    "6": "설산 심부"
  },
  "scales": {
    "1": {
      "hp": 1.15,
      "atk": 1.1,
      "def": 1.0
    },
    "2": {
      "hp": 1.18,
      "atk": 1.12,
      "def": 1.0
    },
    "3": {
      "hp": 1.22,
      "atk": 1.14,
      "def": 1.02
    },
    "4": {
      "hp": 1.25,
      "atk": 1.16,
      "def": 1.03
    },
    "5": {
      "hp": 1.28,
      "atk": 1.18,
      "def": 1.04
    },
    "6": {
      "hp": 1.3,
      "atk": 1.2,
      "def": 1.05
    }
  },
  "allowedMonsterIds": [
    "MON_ABYSS_MAGE_CRYO",
    "MON_ABYSS_MAGE_HYDRO",
    "MON_ABYSS_MAGE_PYRO",
    "MON_CICIN_CRYO",
    "MON_CICIN_ELECTRO",
    "MON_FATUI_CRYO",
    "MON_FATUI_ELECTRO",
    "MON_FATUI_GEO",
    "MON_FATUI_PYRO",
    "MON_HILI_CRYO_SHOOTER",
    "MON_HILI_ELECTRO_SHOOTER",
    "MON_HILI_FIGHTER",
    "MON_HILI_GRENADIER",
    "MON_HILI_PYRO_SHOOTER",
    "MON_HILI_SHOOTER",
    "MON_LAWACHURL_FROST",
    "MON_MITACHURL_AXE",
    "MON_MITACHURL_ICE",
    "MON_MITACHURL_WOOD",
    "MON_RUIN_GRADER",
    "MON_RUIN_GUARD_VARIANT",
    "MON_SAMACHURL_ANEMO",
    "MON_SAMACHURL_CRYO",
    "MON_SAMACHURL_HYDRO",
    "MON_SLIME_ANEMO",
    "MON_SLIME_CRYO",
    "MON_SLIME_DENDRO",
    "MON_SLIME_ELECTRO",
    "MON_SLIME_GEO",
    "MON_SLIME_HYDRO",
    "MON_SLIME_LARGE_ANEMO",
    "MON_SLIME_LARGE_CRYO",
    "MON_SLIME_LARGE_GEO",
    "MON_SLIME_LARGE_HYDRO",
    "MON_SLIME_LARGE_PYRO",
    "MON_SLIME_PYRO",
    "MON_TH_CRUSHER",
    "MON_TH_HANDYMAN",
    "MON_TH_MARKSMAN",
    "MON_TH_POTION_CRYO",
    "MON_TH_POTION_PYRO",
    "MON_TH_SCOUT",
    "MON_WHOPPER_CRYO",
    "MON_WHOPPER_PYRO"
  ],
  "templates": {
    "BREEZE": {
      "name": "초원의 바람 슬라임",
      "members": [
        [
          "MON_SLIME_ANEMO",
          1,
          3
        ],
        [
          "MON_SLIME_PYRO",
          1,
          1
        ]
      ]
    },
    "RIVER": {
      "name": "물가의 슬라임",
      "members": [
        [
          "MON_SLIME_HYDRO",
          1,
          3
        ],
        [
          "MON_SLIME_ELECTRO",
          1,
          1
        ]
      ]
    },
    "HILI_ROAM": {
      "name": "츄츄족 소규모 배회대",
      "members": [
        [
          "MON_HILI_FIGHTER",
          1,
          2
        ],
        [
          "MON_HILI_SHOOTER",
          1,
          1
        ]
      ]
    },
    "TH_SCOUT": {
      "name": "보물 사냥단 정찰조",
      "members": [
        [
          "MON_TH_SCOUT",
          1,
          2
        ],
        [
          "MON_TH_MARKSMAN",
          1,
          1
        ]
      ]
    },
    "WOOD_SLIME": {
      "name": "수풀 속 슬라임",
      "members": [
        [
          "MON_SLIME_DENDRO",
          1,
          2
        ],
        [
          "MON_SLIME_HYDRO",
          1,
          2
        ]
      ]
    },
    "WOOD_ARCHERS": {
      "name": "숲길의 사격 매복",
      "members": [
        [
          "MON_HILI_PYRO_SHOOTER",
          1,
          1
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          2
        ],
        [
          "MON_HILI_SHOOTER",
          1,
          1
        ]
      ]
    },
    "COLD_PATROL": {
      "name": "얼음 화살 순찰조",
      "members": [
        [
          "MON_HILI_CRYO_SHOOTER",
          1,
          1
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          2
        ],
        [
          "MON_HILI_SHOOTER",
          1,
          1
        ]
      ]
    },
    "WOOD_THIEVES": {
      "name": "숲속 보물 사냥단",
      "members": [
        [
          "MON_TH_SCOUT",
          1,
          1
        ],
        [
          "MON_TH_POTION_PYRO",
          1,
          1
        ],
        [
          "MON_TH_HANDYMAN",
          1,
          2
        ]
      ]
    },
    "HIGHLAND_SLIME": {
      "name": "능선의 원소 슬라임",
      "members": [
        [
          "MON_SLIME_LARGE_ANEMO",
          1,
          1
        ],
        [
          "MON_SLIME_ANEMO",
          1,
          2
        ],
        [
          "MON_SLIME_ELECTRO",
          1,
          1
        ]
      ]
    },
    "THUNDER_ARCHERS": {
      "name": "능선의 번개 화살대",
      "members": [
        [
          "MON_HILI_ELECTRO_SHOOTER",
          1,
          2
        ],
        [
          "MON_HILI_GRENADIER",
          1,
          1
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          1
        ]
      ]
    },
    "AXE_SCOUT": {
      "name": "도끼 폭도의 정찰대",
      "members": [
        [
          "MON_MITACHURL_AXE",
          1,
          1
        ],
        [
          "MON_HILI_SHOOTER",
          1,
          1
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          2
        ]
      ]
    },
    "HIGHLAND_FIRE": {
      "name": "고지의 불 슬라임",
      "members": [
        [
          "MON_SLIME_LARGE_PYRO",
          1,
          1
        ],
        [
          "MON_SLIME_PYRO",
          1,
          2
        ],
        [
          "MON_SLIME_ANEMO",
          1,
          1
        ]
      ]
    },
    "WOLF_SLIME": {
      "name": "영지의 대형 슬라임",
      "members": [
        [
          "MON_SLIME_LARGE_CRYO",
          1,
          1
        ],
        [
          "MON_SLIME_HYDRO",
          1,
          2
        ],
        [
          "MON_SLIME_CRYO",
          1,
          1
        ]
      ]
    },
    "CICIN": {
      "name": "번개 치친 술사의 정찰",
      "members": [
        [
          "MON_CICIN_ELECTRO",
          1,
          1
        ]
      ]
    },
    "TRIBE_FIRE": {
      "name": "야영지의 화염 공격대",
      "members": [
        [
          "MON_MITACHURL_AXE",
          1,
          1
        ],
        [
          "MON_HILI_GRENADIER",
          1,
          1
        ],
        [
          "MON_HILI_PYRO_SHOOTER",
          1,
          1
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          1
        ]
      ]
    },
    "TRIBE_ARROWS": {
      "name": "부족의 혼성 사격대",
      "members": [
        [
          "MON_HILI_CRYO_SHOOTER",
          1,
          1
        ],
        [
          "MON_HILI_ELECTRO_SHOOTER",
          1,
          1
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          2
        ]
      ]
    },
    "TRIBE_AXES": {
      "name": "야영지의 도끼 정예대",
      "members": [
        [
          "MON_MITACHURL_AXE",
          1,
          2
        ],
        [
          "MON_HILI_SHOOTER",
          1,
          2
        ]
      ]
    },
    "PYRO_MAGE": {
      "name": "불 심연 메이지의 습격",
      "members": [
        [
          "MON_ABYSS_MAGE_PYRO",
          1,
          1
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          2
        ],
        [
          "MON_HILI_SHOOTER",
          1,
          1
        ]
      ]
    },
    "COAST_SLIME": {
      "name": "물가의 대형 슬라임",
      "members": [
        [
          "MON_SLIME_LARGE_HYDRO",
          1,
          1
        ],
        [
          "MON_SLIME_ELECTRO",
          1,
          2
        ],
        [
          "MON_SLIME_HYDRO",
          1,
          1
        ]
      ]
    },
    "RUIN_GUARD": {
      "name": "잠에서 깬 유적 가디언",
      "members": [
        [
          "MON_RUIN_GUARD_VARIANT",
          1,
          1
        ]
      ]
    },
    "RUIN_PATROL": {
      "name": "폐허의 중무장 순찰대",
      "members": [
        [
          "MON_MITACHURL_AXE",
          1,
          1
        ],
        [
          "MON_HILI_ELECTRO_SHOOTER",
          1,
          1
        ],
        [
          "MON_HILI_GRENADIER",
          1,
          1
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          1
        ]
      ]
    },
    "RUIN_SLIME": {
      "name": "무너진 석벽의 슬라임",
      "members": [
        [
          "MON_SLIME_LARGE_GEO",
          1,
          1
        ],
        [
          "MON_SLIME_GEO",
          1,
          2
        ],
        [
          "MON_SLIME_ANEMO",
          1,
          1
        ]
      ]
    },
    "RUIN_WIND": {
      "name": "폐허 상층의 바람 슬라임",
      "members": [
        [
          "MON_SLIME_LARGE_ANEMO",
          1,
          2
        ],
        [
          "MON_SLIME_ANEMO",
          1,
          2
        ]
      ]
    },
    "SNOW_SLIME": {
      "name": "설산의 얼음 슬라임",
      "members": [
        [
          "MON_SLIME_LARGE_CRYO",
          1,
          1
        ],
        [
          "MON_SLIME_CRYO",
          1,
          3
        ]
      ]
    },
    "SNOW_ARROWS": {
      "name": "눈길의 얼음 화살대",
      "members": [
        [
          "MON_HILI_CRYO_SHOOTER",
          1,
          2
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          2
        ]
      ]
    },
    "SNOW_SHIELD": {
      "name": "얼음 방패 경비대",
      "members": [
        [
          "MON_MITACHURL_ICE",
          1,
          1
        ],
        [
          "MON_HILI_CRYO_SHOOTER",
          1,
          2
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          1
        ]
      ]
    },
    "SNOW_FATUI": {
      "name": "설산의 우인단 사격조",
      "members": [
        [
          "MON_FATUI_CRYO",
          1,
          1
        ],
        [
          "MON_FATUI_PYRO",
          1,
          1
        ]
      ]
    },
    "SNOW_FATUI_HEAVY": {
      "name": "설산의 우인단 중무장조",
      "members": [
        [
          "MON_FATUI_ELECTRO",
          1,
          1
        ],
        [
          "MON_FATUI_PYRO",
          1,
          1
        ],
        [
          "MON_FATUI_GEO",
          1,
          1
        ]
      ]
    },
    "SNOW_THIEVES": {
      "name": "설산의 보물 사냥단",
      "members": [
        [
          "MON_TH_POTION_CRYO",
          1,
          1
        ],
        [
          "MON_TH_CRUSHER",
          1,
          1
        ],
        [
          "MON_TH_MARKSMAN",
          1,
          1
        ]
      ]
    },
    "SNOW_GUARD": {
      "name": "얼어붙은 유적의 가디언",
      "members": [
        [
          "MON_RUIN_GUARD_VARIANT",
          1,
          1
        ]
      ]
    },
    "SNOW_MIXED": {
      "name": "설산의 혼성 폭도대",
      "members": [
        [
          "MON_MITACHURL_ICE",
          1,
          1
        ],
        [
          "MON_MITACHURL_AXE",
          1,
          1
        ],
        [
          "MON_HILI_CRYO_SHOOTER",
          1,
          2
        ]
      ]
    },
    "SHAMAN_WIND": {
      "name": "바람 샤먼의 순찰대",
      "members": [
        [
          "MON_SAMACHURL_ANEMO",
          1,
          1
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          2
        ],
        [
          "MON_HILI_SHOOTER",
          1,
          1
        ]
      ]
    },
    "SHAMAN_WATER": {
      "name": "회복 샤먼의 방패대",
      "members": [
        [
          "MON_SAMACHURL_HYDRO",
          1,
          1
        ],
        [
          "MON_MITACHURL_WOOD",
          1,
          1
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          1
        ]
      ]
    },
    "SHAMAN_ICE": {
      "name": "얼음 샤먼의 경계대",
      "members": [
        [
          "MON_SAMACHURL_CRYO",
          1,
          1
        ],
        [
          "MON_HILI_CRYO_SHOOTER",
          1,
          2
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          1
        ]
      ]
    },
    "WOOD_GUARD": {
      "name": "나무 방패 폭도의 매복",
      "members": [
        [
          "MON_MITACHURL_WOOD",
          1,
          1
        ],
        [
          "MON_HILI_PYRO_SHOOTER",
          1,
          1
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          1
        ]
      ]
    },
    "WHOPPER_FIRE": {
      "name": "화염 구라구라꽃의 기습",
      "members": [
        [
          "MON_WHOPPER_PYRO",
          1,
          1
        ],
        [
          "MON_SLIME_PYRO",
          1,
          1
        ]
      ]
    },
    "WHOPPER_ICE": {
      "name": "얼음 구라구라꽃의 기습",
      "members": [
        [
          "MON_WHOPPER_CRYO",
          1,
          1
        ],
        [
          "MON_SLIME_CRYO",
          1,
          1
        ]
      ]
    },
    "HYDRO_MAGE": {
      "name": "물 심연 메이지의 습격",
      "members": [
        [
          "MON_ABYSS_MAGE_HYDRO",
          1,
          1
        ],
        [
          "MON_HILI_FIGHTER",
          1,
          1
        ],
        [
          "MON_HILI_SHOOTER",
          1,
          1
        ]
      ]
    },
    "CRYO_MAGE": {
      "name": "얼음 심연 메이지의 습격",
      "members": [
        [
          "MON_ABYSS_MAGE_CRYO",
          1,
          1
        ],
        [
          "MON_HILI_CRYO_SHOOTER",
          1,
          1
        ]
      ]
    },
    "CRYO_CICIN": {
      "name": "얼음 치친 술사의 정찰",
      "members": [
        [
          "MON_CICIN_CRYO",
          1,
          1
        ]
      ]
    },
    "RUIN_GRADER": {
      "name": "눈에 묻힌 유적 중기",
      "members": [
        [
          "MON_RUIN_GRADER",
          1,
          1
        ]
      ]
    },
    "FROST_LAWACHURL": {
      "name": "설산의 츄츄 서리왕",
      "members": [
        [
          "MON_LAWACHURL_FROST",
          1,
          1
        ]
      ]
    }
  },
  "maps": {
    "MAP_MOND_PLAINS": {
      "name": "몬드 외곽 초원",
      "minLevel": 1,
      "maxLevel": 2,
      "risk": 1,
      "biome": "초원",
      "notes": "성 가까운 길목. 초반 장비를 준비하며 소규모 적을 상대하는 구역.",
      "encounters": [
        {
          "template": "BREEZE",
          "weight": 35
        },
        {
          "template": "RIVER",
          "weight": 25
        },
        {
          "template": "HILI_ROAM",
          "weight": 30
        },
        {
          "template": "TH_SCOUT",
          "weight": 10
        }
      ]
    },
    "MAP_MOND_FOREST": {
      "name": "속삭임의 숲",
      "minLevel": 2,
      "maxLevel": 3,
      "risk": 2,
      "biome": "숲",
      "notes": "수풀 속 원소 슬라임과 원거리 매복. 숲이 깊어질수록 장비와 동료가 중요해진다.",
      "encounters": [
        {
          "template": "WOOD_SLIME",
          "weight": 25
        },
        {
          "template": "WOOD_ARCHERS",
          "weight": 35
        },
        {
          "template": "COLD_PATROL",
          "weight": 25
        },
        {
          "template": "WOOD_THIEVES",
          "weight": 15
        }
      ]
    },
    "MAP_MOND_WINDRISE": {
      "name": "바람이 시작되는 곳",
      "minLevel": 1,
      "maxLevel": 3,
      "risk": 2,
      "biome": "초원·물가",
      "notes": "물가와 초원 중심. 본편 신상·이야기 장면에는 별도 무작위 전투를 추가하지 않는다.",
      "encounters": [
        {
          "template": "RIVER",
          "weight": 35
        },
        {
          "template": "BREEZE",
          "weight": 30
        },
        {
          "template": "HILI_ROAM",
          "weight": 25
        },
        {
          "template": "WOOD_ARCHERS",
          "weight": 10
        }
      ]
    },
    "MAP_CRPG_WHISPER_HUNT": {
      "name": "속삭임의 숲 사냥터",
      "minLevel": 2,
      "maxLevel": 3,
      "risk": 2,
      "biome": "숲·사냥터",
      "notes": "생활 활동의 기존 낮은 조우율을 유지한다. 사냥터라고 늑대 몬스터를 임의 생성하지 않는다.",
      "encounters": [
        {
          "template": "WOOD_SLIME",
          "weight": 35
        },
        {
          "template": "HILI_ROAM",
          "weight": 35
        },
        {
          "template": "WOOD_ARCHERS",
          "weight": 20
        },
        {
          "template": "TH_SCOUT",
          "weight": 10
        }
      ]
    },
    "MAP_CRPG_STORMBEARER_MOUNTAINS": {
      "name": "바람맞이 산",
      "minLevel": 3,
      "maxLevel": 4,
      "risk": 3,
      "biome": "산지",
      "notes": "성에서 떨어진 능선. 대형 슬라임과 도끼 폭도가 드물게 등장한다.",
      "encounters": [
        {
          "template": "HIGHLAND_SLIME",
          "weight": 25
        },
        {
          "template": "THUNDER_ARCHERS",
          "weight": 35
        },
        {
          "template": "SHAMAN_WIND",
          "weight": 25
        },
        {
          "template": "AXE_SCOUT",
          "weight": 15
        }
      ]
    },
    "MAP_CRPG_STORMBEARER_POINT": {
      "name": "바람맞이 봉우리",
      "minLevel": 4,
      "maxLevel": 5,
      "risk": 3,
      "biome": "고지",
      "notes": "산보다 한 단계 높은 고지. 원거리 적과 정예의 비중이 높다.",
      "encounters": [
        {
          "template": "HIGHLAND_SLIME",
          "weight": 20
        },
        {
          "template": "WHOPPER_FIRE",
          "weight": 20
        },
        {
          "template": "THUNDER_ARCHERS",
          "weight": 35
        },
        {
          "template": "AXE_SCOUT",
          "weight": 25
        }
      ]
    },
    "MAP_MOND_WOLVENDOM": {
      "name": "울프 영지",
      "minLevel": 3,
      "maxLevel": 5,
      "risk": 3,
      "biome": "깊은 숲",
      "notes": "깊은 숲의 강한 개체. 왕랑 도전 구역과 그 보스전은 이 배치에서 제외한다.",
      "encounters": [
        {
          "template": "WOLF_SLIME",
          "weight": 25
        },
        {
          "template": "WOOD_GUARD",
          "weight": 35
        },
        {
          "template": "COLD_PATROL",
          "weight": 30
        },
        {
          "template": "CICIN",
          "weight": 10
        }
      ]
    },
    "MAP_CRPG_DADAUPA_GORGE": {
      "name": "타타우파 협곡",
      "minLevel": 4,
      "maxLevel": 5,
      "risk": 4,
      "biome": "부족 야영지",
      "notes": "츄츄족 중심 야영지. 부족 조합의 변형이며 원작의 특정 퀘스트 웨이브를 그대로 옮긴 것은 아니다.",
      "encounters": [
        {
          "template": "TRIBE_FIRE",
          "weight": 35
        },
        {
          "template": "TRIBE_ARROWS",
          "weight": 30
        },
        {
          "template": "SHAMAN_WATER",
          "weight": 25
        },
        {
          "template": "PYRO_MAGE",
          "weight": 10
        }
      ]
    },
    "MAP_CRPG_SWORD_CEMETERY": {
      "name": "이름없는 검무덤",
      "minLevel": 4,
      "maxLevel": 6,
      "risk": 4,
      "biome": "야영지·물가",
      "notes": "검무덤 주변의 야영지와 물가를 하나의 CRPG 구역으로 다룬다. 봉인 해제 사건은 바꾸지 않는다.",
      "encounters": [
        {
          "template": "TRIBE_ARROWS",
          "weight": 30
        },
        {
          "template": "TRIBE_FIRE",
          "weight": 30
        },
        {
          "template": "COAST_SLIME",
          "weight": 25
        },
        {
          "template": "HYDRO_MAGE",
          "weight": 15
        }
      ]
    },
    "MAP_CRPG_CAPE_OATH": {
      "name": "맹세의 갑각",
      "minLevel": 4,
      "maxLevel": 6,
      "risk": 4,
      "biome": "해안 고지",
      "notes": "외곽의 고지와 물가 접근로. 높은 곳의 혼성 적대를 상대한다.",
      "encounters": [
        {
          "template": "HIGHLAND_FIRE",
          "weight": 25
        },
        {
          "template": "THUNDER_ARCHERS",
          "weight": 30
        },
        {
          "template": "AXE_SCOUT",
          "weight": 30
        },
        {
          "template": "COAST_SLIME",
          "weight": 15
        }
      ]
    },
    "MAP_CRPG_BRIGHTCROWN_CANYON": {
      "name": "크라운 협곡",
      "minLevel": 4,
      "maxLevel": 6,
      "risk": 4,
      "biome": "폐허 접근로",
      "notes": "폐허의 경계. 유적 가디언은 적 여러 마리를 붙이지 않는 단독 강적 편성이다.",
      "encounters": [
        {
          "template": "RUIN_PATROL",
          "weight": 35
        },
        {
          "template": "HIGHLAND_SLIME",
          "weight": 25
        },
        {
          "template": "PYRO_MAGE",
          "weight": 25
        },
        {
          "template": "RUIN_GUARD",
          "weight": 15
        }
      ]
    },
    "MAP_CRPG_LAIR_OUTER_GATE": {
      "name": "바람 드래곤의 폐허 · 옛 관문",
      "minLevel": 5,
      "maxLevel": 6,
      "risk": 5,
      "biome": "폐허 관문",
      "notes": "옛 관문의 경비 편성. 보스 입장과 전초전은 바꾸지 않는다.",
      "encounters": [
        {
          "template": "RUIN_PATROL",
          "weight": 40
        },
        {
          "template": "TRIBE_AXES",
          "weight": 25
        },
        {
          "template": "PYRO_MAGE",
          "weight": 20
        },
        {
          "template": "RUIN_GUARD",
          "weight": 15
        }
      ]
    },
    "MAP_CRPG_LAIR_WEST_RUINS": {
      "name": "바람 드래곤의 폐허 · 서쪽 회랑",
      "minLevel": 5,
      "maxLevel": 7,
      "risk": 5,
      "biome": "기계 폐허",
      "notes": "기계와 석벽 중심 회랑. 원작 폐허 생태를 참고한 지역 내 편성 변형이다.",
      "encounters": [
        {
          "template": "RUIN_GUARD",
          "weight": 35
        },
        {
          "template": "RUIN_SLIME",
          "weight": 25
        },
        {
          "template": "RUIN_PATROL",
          "weight": 25
        },
        {
          "template": "PYRO_MAGE",
          "weight": 15
        }
      ]
    },
    "MAP_CRPG_LAIR_EAST_RUINS": {
      "name": "바람 드래곤의 폐허 · 동쪽 정원",
      "minLevel": 5,
      "maxLevel": 7,
      "risk": 5,
      "biome": "폐허 정원",
      "notes": "바람 슬라임과 심연 세력의 비중을 높여 서쪽 회랑과 구분한다.",
      "encounters": [
        {
          "template": "RUIN_WIND",
          "weight": 30
        },
        {
          "template": "PYRO_MAGE",
          "weight": 30
        },
        {
          "template": "SHAMAN_WIND",
          "weight": 25
        },
        {
          "template": "RUIN_GUARD",
          "weight": 15
        }
      ]
    },
    "MAP_DRAGONSPINE": {
      "name": "드래곤 스파인 · 산기슭",
      "minLevel": 5,
      "maxLevel": 7,
      "risk": 5,
      "biome": "설산 산기슭",
      "notes": "도입부용 초원과 다른 선택형 고위험 구역. 설산 야영지는 안전하게 유지한다.",
      "encounters": [
        {
          "template": "SNOW_SLIME",
          "weight": 35
        },
        {
          "template": "SNOW_ARROWS",
          "weight": 30
        },
        {
          "template": "SNOW_SHIELD",
          "weight": 25
        },
        {
          "template": "SNOW_FATUI",
          "weight": 10
        }
      ]
    },
    "MAP_CRPG_SNOW_COVERED_PATH": {
      "name": "눈 덮인 길",
      "minLevel": 5,
      "maxLevel": 7,
      "risk": 5,
      "biome": "설산 등산로",
      "notes": "얼음 계열과 방패 적을 만나는 등산로. 장비와 회복을 준비한다.",
      "encounters": [
        {
          "template": "SHAMAN_ICE",
          "weight": 30
        },
        {
          "template": "SNOW_SLIME",
          "weight": 25
        },
        {
          "template": "SNOW_SHIELD",
          "weight": 30
        },
        {
          "template": "SNOW_FATUI",
          "weight": 15
        }
      ]
    },
    "MAP_CRPG_WYRMREST_VALLEY": {
      "name": "드래곤이 잠든 협곡",
      "minLevel": 6,
      "maxLevel": 8,
      "risk": 6,
      "biome": "설산 협곡",
      "notes": "우인단과 탐사 방해 세력 중심. 실제 개체 좌표를 재현하는 배치는 아니다.",
      "encounters": [
        {
          "template": "SNOW_FATUI",
          "weight": 30
        },
        {
          "template": "SNOW_FATUI_HEAVY",
          "weight": 25
        },
        {
          "template": "CRYO_CICIN",
          "weight": 25
        },
        {
          "template": "SNOW_THIEVES",
          "weight": 20
        }
      ]
    },
    "MAP_CRPG_ENTOMBED_OUTSKIRTS": {
      "name": "눈에 묻힌 도시 · 근교",
      "minLevel": 6,
      "maxLevel": 8,
      "risk": 6,
      "biome": "설산 폐허",
      "notes": "폐허 기계·방패·도굴 세력의 혼합. 얼음 구라구라꽃의 차지를 주의한다.",
      "encounters": [
        {
          "template": "SNOW_GUARD",
          "weight": 25
        },
        {
          "template": "SNOW_SHIELD",
          "weight": 30
        },
        {
          "template": "SNOW_THIEVES",
          "weight": 25
        },
        {
          "template": "WHOPPER_ICE",
          "weight": 20
        }
      ]
    },
    "MAP_CRPG_ENTOMBED_PALACE": {
      "name": "눈에 묻힌 도시 · 고궁",
      "minLevel": 7,
      "maxLevel": 9,
      "risk": 6,
      "biome": "설산 고궁",
      "notes": "고도와 폐허 깊이를 반영한 상위 지역. 별도 보스 추가는 없다.",
      "encounters": [
        {
          "template": "RUIN_GRADER",
          "weight": 30
        },
        {
          "template": "SNOW_MIXED",
          "weight": 30
        },
        {
          "template": "SNOW_FATUI_HEAVY",
          "weight": 25
        },
        {
          "template": "FROST_LAWACHURL",
          "weight": 15
        }
      ]
    },
    "MAP_CRPG_STARGLOW_CAVERN": {
      "name": "별빛 동굴",
      "minLevel": 7,
      "maxLevel": 9,
      "risk": 6,
      "biome": "설산 동굴",
      "notes": "동굴의 얼음 원소 편성. 얼음 메이지의 보호막과 구라구라꽃의 차지를 공략한다.",
      "encounters": [
        {
          "template": "SNOW_SLIME",
          "weight": 25
        },
        {
          "template": "SNOW_SHIELD",
          "weight": 30
        },
        {
          "template": "CRYO_MAGE",
          "weight": 25
        },
        {
          "template": "WHOPPER_ICE",
          "weight": 20
        }
      ]
    }
  },
  "localCardMinLevels": {
    "ECARD_RUIN_VARIANT_SPIN": 5
  },
  "sources": [
    {
      "id": "OFFICIAL_MAP",
      "url": "https://act.hoyolab.com/ys/app/interactive-map/index.html?lang=ko-kr",
      "scope": "공식 지도 참고 경로. 이번 작업에서 개별 좌표 핀을 전수 추출·검증하지 않음."
    },
    {
      "id": "OFFICIAL_12",
      "url": "https://www.hoyolab.com/article/109392",
      "scope": "공식 1.2 공지: 설산 적 계열. 확인한 공지를 지역 단위 근거로 사용하며 세부 배치는 설계값."
    },
    {
      "id": "LAIR",
      "url": "https://genshin-impact.fandom.com/wiki/Stormterror%27s_Lair",
      "scope": "폐허의 슬라임·츄츄족·가디언 계열. 서쪽/동쪽 편성 비중은 CRPG 설계."
    },
    {
      "id": "DADAUPA",
      "url": "https://www.hoyolab.com/article/18581253",
      "scope": "사용자의 실제 야영지 촬영 기록. 공식 운영팀 게시물은 아님."
    },
    {
      "id": "MOND_LEYLINE",
      "url": "https://game8.co/games/Genshin-Impact/archives/376562",
      "scope": "몬드 지역의 적 구성 보조 대조. 지맥 웨이브를 일반 필드의 고정 출현 좌표로 취급하지 않음."
    }
  ],
  "deferred": {
    "ids": [],
    "reason": "3-1에서 제외했던 11종의 기존 기술을 구현하여 지역 풀에 복원. 다른 지역 미구현 적은 별도 감사 목록 참고."
  },
  "restoredSkillSpecies": [
    "MON_SAMACHURL_ANEMO",
    "MON_SAMACHURL_HYDRO",
    "MON_SAMACHURL_CRYO",
    "MON_MITACHURL_WOOD",
    "MON_LAWACHURL_FROST",
    "MON_ABYSS_MAGE_CRYO",
    "MON_ABYSS_MAGE_HYDRO",
    "MON_CICIN_CRYO",
    "MON_RUIN_GRADER",
    "MON_WHOPPER_PYRO",
    "MON_WHOPPER_CRYO"
  ]
};

const P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x));
const old=Object.fromEntries(['installMarketContent','fieldBattlePolicy','limitFieldBattle','actorCards','describeEncounter'].map(k=>[k,P[k]]));
const fail=(c,m)=>{throw new api.RuleError(c,m);};
const groupId=(map,index)=>'EG_MOND_LOCAL_'+map.replace(/^MAP_/, '')+'_'+(index+1);
P.installMondEncounters=function(){
 if(this._mondEncountersInstalled)return;
 const names=['32_MAP_DB','33_ENCOUNTER_GROUP_DB','34_MAP_ENCOUNTER_POOL','49_ENCOUNTER_MEMBER_DB'];
 const rows=Object.fromEntries(names.map(n=>[n,this.db[n].map(r=>r.slice())]));
 const mapById=new Map(rows['32_MAP_DB'].slice(1).map(r=>[r[0],r]));
 const groups={},allowed=new Set(CONFIG.allowedMonsterIds);
 for(const id of allowed){const monster=this.tables['09_MONSTER_DB'].get(id);if(!monster||monster[3]==='보스')fail('MOND_ENCOUNTER_CONTENT','사용할 수 없는 몬스터 정의: '+id);}
 rows['34_MAP_ENCOUNTER_POOL']=rows['34_MAP_ENCOUNTER_POOL'].filter((r,i)=>i===0||!CONFIG.maps[r[1]]);
 for(const [mapId,area]of Object.entries(CONFIG.maps)){
  const map=mapById.get(mapId);if(!map||map[1]!=='몬드'||map[8]!=='Y'||map[12]==='Y')fail('MOND_ENCOUNTER_MAP','대상 야외 구역을 확인해 주세요: '+mapId);
  map[6]=area.minLevel;map[7]=area.maxLevel;map[11]='POOL_MOND_LOCAL_'+mapId;
  let face=1;
  area.encounters.forEach((enc,index)=>{
   const id=groupId(mapId,index),t=CONFIG.templates[enc.template];
   if(!t||!Number.isInteger(enc.weight)||enc.weight<1)fail('MOND_ENCOUNTER_CONFIG','지역 조우 구성이 올바르지 않습니다.');
   const row=Array(this.db['33_ENCOUNTER_GROUP_DB'][0].length).fill('');
   Object.assign(row,{0:id,1:area.name+' · '+t.name,2:'RANDOM',3:CONFIG.riskLabels[area.risk],4:area.minLevel,5:area.maxLevel,6:'PARTY_BANDED',23:'기존 몬스터 AI / 생존 파티 규모 제한',24:1,25:'N',26:'Y',27:area.notes,28:'MOND_LOCAL_V1'});
   t.members.forEach((m,i)=>{if(!allowed.has(m[0]))fail('MOND_ENCOUNTER_MONSTER','허용 목록에 없는 몬스터입니다.');const n=7+i*3;row[n]=m[0];row[n+1]=m[1];row[n+2]=m[2];rows['49_ENCOUNTER_MEMBER_DB'].push(['EM_'+id+'_'+(i+1),id,i+1,m[0],m[1],m[2],'MON'+(i+1),'CRPG_LOCAL_V0137','업로드한 기존 몬스터 ID 사용']);});
   rows['33_ENCOUNTER_GROUP_DB'].push(row);
   rows['34_MAP_ENCOUNTER_POOL'].push([map[11],mapId,'d100',face,face+enc.weight-1,id,'','','','N','CRPG 지역 조우 / 연속 제외 시 남은 비중으로 재계산']);
   groups[id]={mapId,area,template:enc.template,weight:enc.weight};face+=enc.weight;
  });
  if(face!==101)fail('MOND_ENCOUNTER_WEIGHTS','지역별 확률의 합은 100이어야 합니다.');
 }
 this.db={...this.db,...rows};for(const n of names)this.tables[n]=new Map(rows[n].slice(1).filter(r=>r[0]).map(r=>[r[0],r]));
 this._mondLocalGroups=groups;this._mondEncountersInstalled=true;
};
// Preserve the existing initialization order (notably merchant prices).
P.installMarketContent=function(...args){const result=old.installMarketContent.apply(this,args);this.installMondEncounters();return result;};
// Scale only newly authored RANDOM groups. Global monster rows, story encounters,
// boss gauntlets and other regions retain their exact previous definitions.
P.fieldBattlePolicy=function(row,origin,allies,members){
 const policy=old.fieldBattlePolicy.call(this,row,origin,allies,members),local=this._mondLocalGroups?.[row[0]];
 if(!policy||origin!=='RANDOM'||!local||local.mapId!==this.s.global.CURRENT_MAP_ID)return policy;
 const scale=CONFIG.scales[local.area.risk];
 return {...policy,mondLocal:{version:1,map:local.mapId,risk:local.area.risk,minLevel:local.area.minLevel,maxLevel:local.area.maxLevel,hpScale:scale.hp,atkScale:scale.atk,defScale:scale.def},hpFactor:policy.hpFactor*scale.hp,atkFactor:policy.atkFactor*scale.atk};
};
P.limitFieldBattle=function(b,policy){
 old.limitFieldBattle.call(this,b,policy);
 if(!policy?.mondLocal||b.mondLocalApplied)return;
 for(const a of b.actors.filter(a=>a.side==='ENEMY'))a.def=Math.max(0,Math.round(a.def*policy.mondLocal.defScale));
 b.mondLocalApplied=true;
};
P.actorCards=function(a){
 const cards=old.actorCards.call(this,a);
 if(a.side!=='ENEMY'||!this.s.runtime?.balanceProfile?.mondLocal)return cards;
 // This existing guard variant was locked to Lv14 despite being a Lv5 species.
 // Lower only its existing attack's gate in the new regional encounters.
 return cards.map(c=>CONFIG.localCardMinLevels[c.id]!==undefined?{...c,level:CONFIG.localCardMinLevels[c.id]}:c);
};
P.mondAreaThreat=function(mapId=this.s.global.CURRENT_MAP_ID){
 const area=CONFIG.maps[mapId];if(!area)return null;
 const party=this.s.party.filter(p=>p.active).map(p=>p.type==='PLAYER'?this.player():this.character(p.source)).filter(a=>a.hp>0);
 const avg=party.length?party.reduce((n,a)=>n+a.level,0)/party.length:0;
 const entries=area.encounters.map((e,i)=>({group:groupId(mapId,i),name:CONFIG.templates[e.template].name,weight:e.weight,monsters:CONFIG.templates[e.template].members.map(m=>({id:m[0],name:this.row('09_MONSTER_DB',m[0])[1],min:m[1],max:m[2]}))}));
 return {map:mapId,name:area.name,risk:area.risk,label:CONFIG.riskLabels[area.risk],biome:area.biome,minLevel:area.minLevel,maxLevel:area.maxLevel,partySize:party.length,underLevel:avg<area.minLevel,notes:area.notes,entries};
};
P.describeEncounter=function(b,action){
 const result=old.describeEncounter.call(this,b,action);
 if(!b.balanceProfile?.mondLocal)return result;
 const a=CONFIG.maps[b.balanceProfile.mondLocal.map];
 return {...result,label:CONFIG.riskLabels[a.risk]+' · '+result.label,text:result.text+' 지역 적 레벨은 '+a.minLevel+'~'+a.maxLevel+' 범위이며, 생존 파티 규모에 맞춰 적 수가 조정됩니다.'};
};
api.mondEncounterConfig=CONFIG;
})(globalThis);
