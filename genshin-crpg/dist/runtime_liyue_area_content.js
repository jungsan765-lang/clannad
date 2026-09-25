/* Liyue named subareas. v0.13.15: approved-raster coordinate correction only. */
globalThis.CRPGLiyueAreas={
  "version": 2,
  "areas": [
    {
      "id": "MAP_LY_DETAIL_NORTH_GATE",
      "name": "리월항 · 북쪽 진입로",
      "zone": "운래해",
      "parent": "MAP_LIYUE_HARBOR",
      "point": [
        505,
        576
      ],
      "kind": null,
      "resource": "",
      "feature": "항구와 내륙을 잇는 길",
      "description": "산길을 내려오는 여행자와 항구로 들어가는 짐수레가 만나는 길목이다. 여기서 항구 안으로 들어가거나 천형산과 내륙으로 발길을 돌릴 수 있다.",
      "observe": "돌다리 너머로 항구의 지붕이 겹쳐 보인다. 내륙에서 내려온 짐수레들이 길 가장자리를 비켜 지나가고, 부두 쪽에서는 희미하게 종소리가 들린다. 남쪽으로 내려가면 상업 거리, 서쪽 산길로 돌아서면 천형산이다.",
      "anchor": "북쪽 돌다리의 북단 접속부 · 북쪽 돌다리로 들어가는 육상 접속부. 문지기 NPC나 문턱의 좌표는 아님.",
      "safe": true,
      "anchorKind": "PATH",
      "anchorFeature": "북쪽 돌다리의 북단 접속부"
    },
    {
      "id": "MAP_LY_DETAIL_FEIYUN",
      "name": "비운 언덕 · 상업 거리",
      "zone": "운래해",
      "parent": "MAP_LIYUE_HARBOR",
      "point": [
        512,
        619
      ],
      "kind": null,
      "resource": "",
      "feature": "상업 거리와 항구 중심 연결",
      "description": "계단과 상점가가 이어지는 거리다. 항구 중심에서 정비한 뒤 부두나 옥경대 쪽을 산책할 수 있다.",
      "observe": "천막 아래 가지런히 놓인 상품과 계단을 오르내리는 사람들 사이로 항구의 하루가 이어진다. 좁은 골목을 지나면 부두의 바람이 닿고, 반대쪽 계단은 옥경대 방향으로 높아진다.",
      "anchor": "비운 언덕 중앙 상업 거리 · 북쪽 건물군 사이의 넓은 거리. 건물 지붕과 구분하며 기존 기준점을 유지.",
      "safe": true,
      "anchorKind": "FEATURE",
      "anchorFeature": "비운 언덕 중앙 상업 거리"
    },
    {
      "id": "MAP_LY_DETAIL_YUJING",
      "name": "옥경대 · 전망 구역",
      "zone": "운래해",
      "parent": "MAP_LIYUE_HARBOR",
      "point": [
        494,
        643
      ],
      "kind": null,
      "resource": "",
      "feature": "높은 대에서 항구 조망",
      "description": "낮은 항구 거리와 달리 시야가 트이는 높은 구역이다. 도시의 동선을 살펴보고 아래 상업 거리로 돌아갈 수 있다.",
      "observe": "넓은 돌바닥 끝에 서면 낮은 거리와 지붕들이 한눈에 들어온다. 사람들의 목소리는 아래로 멀어지고, 난간 곁에는 바람에 흔들리는 나뭇잎 소리만 가까이 남는다. 내려갈 길은 상업 거리 쪽 계단으로 이어진다.",
      "anchor": "옥경대 남쪽 네모난 광장 · 도시 서쪽 높은 대의 남쪽 광장 돌바닥. 북쪽 건물군·비운 언덕 부두가 아님.",
      "safe": true,
      "anchorKind": "FEATURE",
      "anchorFeature": "옥경대 남쪽 네모난 광장"
    },
    {
      "id": "MAP_LY_DETAIL_CHIHU",
      "name": "흘호암 · 골목",
      "zone": "운래해",
      "parent": "MAP_LIYUE_HARBOR",
      "point": [
        536,
        649
      ],
      "kind": null,
      "resource": "",
      "feature": "생활 골목과 정비 거점 연결",
      "description": "생활 소음과 음식 냄새가 섞이는 골목이다. 항구 중심의 조리·숙박 시설로 돌아가거나 남쪽 길을 살펴볼 수 있다.",
      "observe": "음식 냄새와 생활 소음이 골목 사이에서 섞인다. 손수레가 빠져나가기를 기다렸다 길을 건너면, 가게들이 이어지는 중심가와 부두로 내려가는 길이 갈린다.",
      "anchor": "흘호암 남쪽 생활 거리 · 비운 언덕 남동쪽 다리를 건넌 반도의 생활 거리. 서쪽 옥경대 광장과 구분.",
      "safe": true,
      "anchorKind": "FEATURE",
      "anchorFeature": "흘호암 남쪽 생활 거리"
    },
    {
      "id": "MAP_LY_DETAIL_WHARF",
      "name": "리월항 · 부두",
      "zone": "운래해",
      "parent": "MAP_LIYUE_HARBOR",
      "point": [
        567,
        657
      ],
      "kind": null,
      "resource": "",
      "feature": "선박과 방파제",
      "description": "배와 화물이 드나드는 부두다. 방파제 낚시터로 갈 수 있고, 고운각 방면 항로도 여기서 고른다.",
      "observe": "계류 밧줄이 팽팽하게 당겨졌다 느슨해진다. 짐을 나르는 발걸음 아래로 판자가 낮게 울리고, 바다 건너에는 바위섬의 윤곽이 보인다. 방파제 물가에서 낚싯줄을 드리우거나 고운각행 배편을 고를 수 있다.",
      "anchor": "남쪽 부두의 육상 잔교 접속부 · 흘호암 동쪽의 잔교가 만나는 부두. 바다 위 빈 수면이 아니라 지도에 그려진 구조물.",
      "safe": true,
      "anchorKind": "FEATURE",
      "anchorFeature": "남쪽 부두의 육상 잔교 접속부"
    },
    {
      "id": "MAP_LY_DETAIL_SHIMEN",
      "name": "석문 · 통행로",
      "zone": "벽수원",
      "parent": "MAP_LIYUE_PLAINS",
      "point": [
        519,
        133
      ],
      "kind": null,
      "resource": "",
      "feature": "북부 통행과 남쪽 습지의 갈림길",
      "description": "바위 사이로 난 통행로가 북부와 적화주 방향을 이어 준다. 돌아갈 길과 남쪽으로 이어지는 길을 함께 확인할 수 있다.",
      "observe": "높은 바위 사이로 도로가 좁아졌다가 다시 열린다. 남쪽으로는 물길을 따라 적화주가 이어지고, 북서쪽으로 접어드는 길은 경책 산장 쪽으로 향한다. 갈림길을 지나기 전에 되돌아올 방향을 눈에 담는다.",
      "anchor": "석문 남쪽 통행로 · 북쪽에서 내려온 길이 적화주 방향으로 이어지는 도로 구간. 좁은 바위문 입구 자체는 별도 확인 필요.",
      "safe": true,
      "anchorKind": "PATH",
      "anchorFeature": "석문 남쪽 통행로"
    },
    {
      "id": "MAP_LY_DETAIL_DIHUA",
      "name": "적화주 · 갈대 물가",
      "zone": "벽수원",
      "parent": "MAP_LIYUE_PLAINS",
      "point": [
        477,
        223
      ],
      "kind": "GATHER",
      "resource": "ING_SWEET_FLOWER:3-5@45;ING_MINT:3-5@55",
      "feature": "습지 채집",
      "description": "얕은 물길과 풀밭 사이로 도로가 이어진다. 길가의 재료를 모으고 남쪽 망서 객잔으로 이동할 수 있다.",
      "observe": "얕은 수로 옆으로 풀이 촘촘하게 자라 있다. 물가에서 떨어진 단단한 땅을 따라가면 채집할 꽃과 풀이 눈에 띈다. 남쪽으로 솟아 있는 객잔은 멀리서도 길잡이가 된다.",
      "anchor": "적화주 서쪽 물가의 육지 · 망서 객잔 북쪽, 본길 서편의 물가 육지. 특정 갈대나 채집물의 생성 좌표는 아님.",
      "safe": false,
      "anchorKind": "SHORE",
      "anchorFeature": "적화주 서쪽 물가의 육지"
    },
    {
      "id": "MAP_LY_DETAIL_WANGSHU",
      "name": "망서 객잔 · 아래 광장",
      "zone": "벽수원",
      "parent": "MAP_LIYUE_PLAINS",
      "point": [
        513,
        250
      ],
      "kind": "FISH",
      "resource": "ING_FISH:2-4@100",
      "feature": "물가 낚시와 길목",
      "description": "높게 솟은 객잔 아래에서 남북 도로와 주변 물가를 확인한다. 낚싯대와 미끼가 있으면 이 구역의 강변 낚시를 시작할 수 있다.",
      "observe": "객잔을 떠받치는 바위 아래로 물길이 돌아 나간다. 수레가 지나는 도로를 벗어나 강변에 서면 물고기의 잔물결이 보인다. 낚시를 마친 뒤에는 북쪽 적화주나 남쪽 평원으로 길을 이어갈 수 있다.",
      "anchor": "망서 객잔 북동쪽 지상 마당 · 큰 원형 건물 북동쪽의 밝은 마당. 객잔 지붕이나 서쪽 수면이 아님. 수직 층은 표현하지 않음.",
      "safe": true,
      "anchorKind": "FEATURE",
      "anchorFeature": "망서 객잔 북동쪽 지상 마당"
    },
    {
      "id": "MAP_LY_DETAIL_QINGCE_FIELDS",
      "name": "경책 산장 · 남쪽 밭길",
      "zone": "벽수원",
      "parent": "MAP_LIYUE_QINGCE",
      "point": [
        427,
        17
      ],
      "kind": "GATHER",
      "resource": "ING_CARROT:3-5@35;ING_RADISH:3-5@35;ING_SWEET_FLOWER:3-5@30",
      "feature": "마을 밖 채집",
      "description": "층층이 이어진 밭과 그 사이의 길을 따라 걷는 구역이다. 산장 안의 주민 이야기와 바깥 채집을 분리해 이용할 수 있다.",
      "observe": "밭 사이의 좁은 길이 높낮이를 달리하며 이어진다. 산장으로 돌아가는 길목을 살핀 뒤 바깥 채집 구역으로 발길을 돌린다. 주변에서 필요한 식재료를 모아 두면 다음 여정의 식사를 준비하기 좋겠다.",
      "anchor": "경책 산장 남쪽 계단식 밭의 둑길 · 지도 상단에서 식별되는 계단식 밭의 둑길. 남쪽 산기슭 도로와 구분하며 집이나 NPC 위치는 아님.",
      "safe": true,
      "anchorKind": "PATH",
      "anchorFeature": "경책 산장 남쪽 계단식 밭의 둑길"
    },
    {
      "id": "MAP_LY_DETAIL_GUILI",
      "name": "귀리 평원 · 옛 유적",
      "zone": "경기 들판",
      "parent": "MAP_LIYUE_PLAINS",
      "point": [
        538,
        405
      ],
      "kind": "GATHER",
      "resource": "ING_MINT:3-5@50;ING_SWEET_FLOWER:3-5@50",
      "feature": "옛 유적 주변 채집",
      "description": "무너진 석조 구조물과 평야 도로가 함께 남아 있는 곳이다. 동쪽 해안, 남쪽 녹화 연못, 북쪽 객잔 방면을 잇는 내륙 거점이다.",
      "observe": "풀 사이로 끊어진 석축과 기둥의 밑동이 드러난다. 그 곁으로 사람들의 발길이 다져 놓은 길이 이어지고, 오래된 돌틈에는 작은 꽃이 피어 있다. 동쪽 해안과 남쪽 항구 중 어느 쪽으로 향할지 주변 지형을 살핀다.",
      "anchor": "귀리 평원 네모난 옛 유적 · 귀리 평원 중앙의 사각 유적 터 안 돌바닥. 평원 전체를 가리키는 상위 거점과 구분.",
      "safe": false,
      "anchorKind": "FEATURE",
      "anchorFeature": "귀리 평원 네모난 옛 유적"
    },
    {
      "id": "MAP_LY_DETAIL_MINGYUN",
      "name": "명온 마을 · 폐광 주변",
      "zone": "경기 들판",
      "parent": "MAP_LIYUE_PLAINS",
      "point": [
        615,
        292
      ],
      "kind": "MINE",
      "resource": "ORE_IRON:1-2@45;ORE_WHITE_IRON:1@40;ORE_CRYSTAL:1@15",
      "feature": "폐광 채광",
      "description": "폐광과 마을 흔적 사이로 길을 찾는 구역이다. 광물을 캐거나 요광 해안 쪽으로 내려갈 수 있다.",
      "observe": "낡은 울타리와 버려진 길 너머로 암벽이 이어진다. 드러난 광맥을 찾을 수 있지만 어두운 갱도 안으로 들어가기 전에는 돌아갈 길부터 확보하는 편이 좋겠다. 낮아지는 길을 따라가면 요광 해안에 닿는다.",
      "anchor": "명온 마을 서쪽 암벽 주변 · 마을 서쪽 암벽과 폐광 주변의 지상 활동 기준점. 개별 갱도 입구는 이 지도만으로 확정하지 않음.",
      "safe": false,
      "anchorKind": "AREA",
      "anchorFeature": "명온 마을 서쪽 암벽 주변"
    },
    {
      "id": "MAP_LY_DETAIL_YAOGUANG",
      "name": "요광 해안 · 모래톱",
      "zone": "경기 들판",
      "parent": "MAP_LIYUE_PLAINS",
      "point": [
        621,
        358
      ],
      "kind": "GATHER",
      "resource": "ING_CRAB:3-5@70;ING_MINT:3-5@30",
      "feature": "해안 재료 채집",
      "description": "모래톱과 얕은 수로가 갈라진 해안이다. 해안 재료를 모으고 명온 마을 또는 귀리 평원으로 돌아갈 수 있다.",
      "observe": "햇빛을 받은 모래톱 사이로 얕은 물길이 갈라져 있다. 작은 게가 움직인 흔적을 따라 물가를 살피되, 짙은 수면 쪽으로는 발을 옮기지 않는다. 내륙으로 돌아갈 때는 마른 모래가 이어지는 길을 찾는다.",
      "anchor": "요광 해안 서쪽 모래톱 · 해안 서쪽의 연결된 모래톱 위. 물속 또는 바다 위 도보 지점이 아님.",
      "safe": false,
      "anchorKind": "SHORE",
      "anchorFeature": "요광 해안 서쪽 모래톱"
    },
    {
      "id": "MAP_LY_DETAIL_LUHUA",
      "name": "녹화 연못 · 물가",
      "zone": "경기 들판",
      "parent": "MAP_LIYUE_PLAINS",
      "point": [
        422,
        418
      ],
      "kind": "FISH",
      "resource": "ING_FISH:2-4@100",
      "feature": "층진 연못의 낚시",
      "description": "층층이 이어지는 연못의 가장자리를 따라 이동한다. 낚시를 하거나 서쪽 산길·남쪽 리사교 방면으로 이동할 수 있다.",
      "observe": "낮은 돌턱마다 고인 물의 빛깔이 조금씩 다르다. 발을 디딜 수 있는 가장자리를 따라가면 낚싯줄을 드리울 만한 물가가 나타난다. 고개를 들면 평원과 산지 사이로 돌아가는 길이 보인다.",
      "anchor": "녹화 연못 북쪽 본토 기슭 · 큰 연못 북쪽의 연결된 육지 가장자리. 연못 수면·작은 섬·원형 비경 구조물 위가 아님.",
      "safe": false,
      "anchorKind": "SHORE",
      "anchorFeature": "녹화 연못 북쪽 본토 기슭"
    },
    {
      "id": "MAP_LY_DETAIL_AOCANG",
      "name": "오장산 · 정상 호숫가",
      "zone": "민림",
      "parent": "MAP_LIYUE_JUEYUN",
      "point": [
        213,
        211
      ],
      "kind": "FISH",
      "resource": "ING_FISH:2-4@100",
      "feature": "고산 호수 낚시",
      "description": "높은 산 정상의 호수 곁에서 쉬어 갈 수 있는 구역이다. 낚시와 주변 감상을 마친 뒤 경운봉 방면 산길로 돌아간다.",
      "observe": "정상 호수에는 주변 암벽과 하늘이 비친다. 물가의 단단한 돌턱에 자리를 잡으면 아래의 소음은 거의 들리지 않는다. 잠시 낚시를 한 뒤 경운봉으로 돌아가는 산길을 찾을 수 있다.",
      "anchor": "오장산 정상 호수 남동쪽 돌기슭 · 정상 호수의 남동쪽 돌기슭. 호수 한가운데가 아니라 바깥 가장자리.",
      "safe": false,
      "anchorKind": "SHORE",
      "anchorFeature": "오장산 정상 호수 남동쪽 돌기슭"
    },
    {
      "id": "MAP_LY_DETAIL_QINGYUN",
      "name": "경운봉 · 산길",
      "zone": "민림",
      "parent": "MAP_LIYUE_MOUNTAINS",
      "point": [
        235,
        281
      ],
      "kind": "GATHER",
      "resource": "MAT_LIYUE_QINGXIN:3-5@60;ING_MINT:3-5@40",
      "feature": "고지대 식물 채집",
      "description": "주변 산봉우리의 방향을 가늠할 수 있는 높은 산길이다. 오장산과 호로산·절운간 사이를 오가는 산악 거점으로 삼을 수 있다.",
      "observe": "능선 너머로 여러 봉우리가 겹쳐 보인다. 바람이 닿는 바위틈에는 고지대의 식물이 자라고, 아래로 내려가는 길은 구름 사이로 끊겼다 이어진다. 오장산과 호로산의 방향을 살핀 뒤 발길을 정한다.",
      "anchor": "경운봉 정상부 능선길 · 경운봉 정상부의 밝은 능선길. 공중 정자나 수직 높이의 좌표가 아님.",
      "safe": false,
      "anchorKind": "PATH",
      "anchorFeature": "경운봉 정상부 능선길"
    },
    {
      "id": "MAP_LY_DETAIL_HULAO",
      "name": "호로산 · 호박 바위길",
      "zone": "민림",
      "parent": "MAP_LIYUE_MOUNTAINS",
      "point": [
        137,
        311
      ],
      "kind": "MINE",
      "resource": "ORE_WHITE_IRON:1@60;ORE_CRYSTAL:1@40",
      "feature": "산악 채광",
      "description": "호박빛 바위가 눈에 띄는 산길이다. 채광과 길 찾기를 마친 뒤 화광림이나 경운봉으로 이어진다.",
      "observe": "호박빛 바위 사이로 산길이 꺾여 내려간다. 밝은 돌과 짙은 암벽이 번갈아 나타나는 길 주변에서 광맥을 살펴볼 수 있다. 더 내려가면 계곡의 물소리가 가까워진다.",
      "anchor": "호로산 정상 동쪽 바위 구역 · 정상 연못 동쪽의 바위 지형. 개별 호박·광맥은 원본에서 식별되지 않아 위치를 확정하지 않음.",
      "safe": false,
      "anchorKind": "AREA",
      "anchorFeature": "호로산 정상 동쪽 바위 구역"
    },
    {
      "id": "MAP_LY_DETAIL_HUAGUANG",
      "name": "화광림 · 계곡길",
      "zone": "민림",
      "parent": "MAP_LIYUE_MOUNTAINS",
      "point": [
        171,
        268
      ],
      "kind": "GATHER",
      "resource": "MAT_LIYUE_VIOLETGRASS:3-5@55;ING_MUSHROOM:3-5@45",
      "feature": "암벽 식물과 계곡 탐방",
      "description": "바위 봉우리 사이로 물길이 내려가는 계곡이다. 절벽 주변 식물을 모으고 호로산 쪽으로 오를 수 있다.",
      "observe": "바위 봉우리 사이로 계곡의 물소리가 울린다. 암벽 가장자리에는 작은 식물들이 붙어 있고, 발 디딜 땅은 물길을 피해 굽이친다. 채집을 마친 뒤 호로산 쪽으로 오르거나 산악 거점으로 돌아갈 수 있다.",
      "anchor": "화광림 계곡 다리 동쪽 발판 · 계곡을 가로지르는 가느다란 다리의 동쪽 육상 발판. 계곡 물속에 표시하지 않음.",
      "safe": false,
      "anchorKind": "FEATURE",
      "anchorFeature": "화광림 계곡 다리 동쪽 발판"
    },
    {
      "id": "MAP_LY_DETAIL_NANTIANMEN",
      "name": "남천문 · 고목 주변",
      "zone": "민림",
      "parent": "MAP_LIYUE_MOUNTAINS",
      "point": [
        185,
        380
      ],
      "kind": "GATHER",
      "resource": "ING_MUSHROOM:3-5@60;ING_MINT:3-5@40",
      "feature": "고목 숲의 채집",
      "description": "거대한 나무와 주변 숲을 둘러보는 구역이다. 민림 남부를 지나 천주 골짜기 쪽으로 이어지는 길을 확인할 수 있다.",
      "observe": "거대한 나무뿌리가 땅과 바위를 감싸고 있다. 그늘 안팎의 풀과 버섯을 살피다 고개를 들면, 가지 사이로 산길이 이어지는 방향이 보인다. 남쪽 골짜기로 가기 전에 주변의 갈림길을 확인한다.",
      "anchor": "남천문 북쪽 지상 접근 지역 · 남천문 북쪽 강변 동편의 지상 접근 지역. 고목 줄기와 비경 입구는 원본에서 확정하지 못해 접근 지역 대표점으로 표시.",
      "safe": false,
      "anchorKind": "AREA",
      "anchorFeature": "남천문 북쪽 지상 접근 지역"
    },
    {
      "id": "MAP_LY_DETAIL_TIANQIU",
      "name": "천주 골짜기 · 유적길",
      "zone": "민림",
      "parent": "MAP_LIYUE_MOUNTAINS",
      "point": [
        244,
        441
      ],
      "kind": "MINE",
      "resource": "ORE_WHITE_IRON:1@55;ORE_CRYSTAL:1@45",
      "feature": "골짜기 유적과 채광",
      "description": "연못과 석조 유적 사이로 난 골짜기 길이다. 주변 광물을 캐고 녹화 연못이나 리사교 방면으로 내려갈 수 있다.",
      "observe": "호숫가를 따라 오래된 석조 건축물이 남아 있다. 무너진 돌 사이로 길을 찾고 암벽의 광맥을 살펴본다. 물가를 떠나 남동쪽으로 향하면 리사교 방면으로 내려가는 길이 이어진다.",
      "anchor": "천주 골짜기 연못 서쪽 석조 유적 · 연못 서쪽의 밝은 석조 유적 바닥. 수면 및 남쪽의 작은 연못과 구분.",
      "safe": false,
      "anchorKind": "FEATURE",
      "anchorFeature": "천주 골짜기 연못 서쪽 석조 유적"
    },
    {
      "id": "MAP_LY_DETAIL_DUNYU",
      "name": "둔옥릉 · 유적 가장자리",
      "zone": "리사교",
      "parent": "MAP_LIYUE_MOUNTAINS",
      "point": [
        373,
        529
      ],
      "kind": "MINE",
      "resource": "ORE_IRON:1@20;ORE_WHITE_IRON:1@50;ORE_CRYSTAL:1@30",
      "feature": "리사교 북부 폐허 채광",
      "description": "물이 고인 유적을 둘러싸고 낡은 석축이 이어진다. 채광을 하거나 남쪽 성법 관문으로 향할 수 있다.",
      "observe": "연못 주위의 높은 석축을 따라 유적의 윤곽을 살핀다. 물에 잠긴 안쪽 대신 마른 돌바닥과 바깥 암벽을 따라 움직이면 광맥을 찾을 수 있다. 남서쪽으로는 성법 관문으로 내려가는 길이 보인다.",
      "anchor": "둔옥릉 동쪽 네모난 석조 유적 · 연못 동쪽의 네모난 유적 구조물. 주변의 푸른 수면과 구분.",
      "safe": false,
      "anchorKind": "FEATURE",
      "anchorFeature": "둔옥릉 동쪽 네모난 석조 유적"
    },
    {
      "id": "MAP_LY_DETAIL_LINGJU",
      "name": "성법 관문 · 바깥길",
      "zone": "리사교",
      "parent": "MAP_LIYUE_MOUNTAINS",
      "point": [
        340,
        614
      ],
      "kind": "MINE",
      "resource": "ORE_WHITE_IRON:1@65;ORE_CRYSTAL:1@35",
      "feature": "관문 유적 채광",
      "description": "석조 유적과 물길 사이의 바깥길이다. 둔옥릉과 청허포, 층암거연 방면을 연결한다.",
      "observe": "물길을 두고 낡은 석조 건축물들이 서로 마주 보고 있다. 무너진 곳을 피해 바깥길을 돌며 채광할 암벽을 살핀다. 북동쪽은 둔옥릉, 남쪽은 청허포, 서쪽은 광구 방면이다.",
      "anchor": "성법 관문 동쪽 바깥길 · 유적 연못 동쪽을 도는 밝은 지상 길. 기존 연못 안 위치에서 육지로 교정.",
      "safe": false,
      "anchorKind": "PATH",
      "anchorFeature": "성법 관문 동쪽 바깥길"
    },
    {
      "id": "MAP_LY_DETAIL_QINGXU",
      "name": "청허포 · 석조 유적",
      "zone": "리사교",
      "parent": "MAP_LIYUE_MOUNTAINS",
      "point": [
        274,
        708
      ],
      "kind": "GATHER",
      "resource": "ING_MUSHROOM:3-5@65;ING_MINT:3-5@35",
      "feature": "남부 폐허 채집",
      "description": "계곡을 내려다보는 석조 유적을 돌아보는 구역이다. 채집 후 성법 관문이나 천형산 쪽 길로 돌아간다.",
      "observe": "높은 석조 유적 사이를 지나면 계곡 바람이 불어온다. 돌틈과 그늘에서 자라는 식물을 살피고, 올라왔던 길을 다시 눈에 담는다. 북쪽 관문으로 돌아가거나 항구 방면 길을 택할 수 있다.",
      "anchor": "청허포 중앙 석조 유적 · 주변 연못에 둘러싸인 중앙 석조 유적의 지상부. 북쪽 수면이나 지하 공간이 아님.",
      "safe": false,
      "anchorKind": "FEATURE",
      "anchorFeature": "청허포 중앙 석조 유적"
    },
    {
      "id": "MAP_LY_DETAIL_TIANHENG",
      "name": "천형산 · 항구 전망길",
      "zone": "운래해",
      "parent": "MAP_LIYUE_MOUNTAINS",
      "point": [
        448,
        606
      ],
      "kind": "MINE",
      "resource": "ORE_IRON:1-2@45;ORE_WHITE_IRON:1@40;ORE_CRYSTAL:1@15",
      "feature": "항구 서쪽 산길 채광",
      "description": "리월항 서쪽 고지의 전망길이다. 채광을 하거나 항구로 내려가고, 서쪽 리사교 방면으로 더 나아갈 수도 있다.",
      "observe": "능선 아래로 항구와 바다가 함께 펼쳐진다. 길가의 암벽에서 광물을 살피는 동안에도 동쪽의 지붕들이 돌아갈 방향을 알려 준다. 서쪽으로 더 나아가면 리사교의 유적길로 이어진다.",
      "anchor": "천형산 동쪽 전망 능선 · 항구 서쪽의 밝은 능선 지형. 지도에 나타나지 않는 동굴·광맥 입구는 표시하지 않음.",
      "safe": false,
      "anchorKind": "AREA",
      "anchorFeature": "천형산 동쪽 전망 능선"
    },
    {
      "id": "MAP_LY_DETAIL_GUYUN",
      "name": "고운각 · 서북쪽 섬",
      "zone": "운래해",
      "parent": "MAP_LIYUE_PLAINS",
      "point": [
        754,
        508
      ],
      "kind": "MINE",
      "resource": "ORE_WHITE_IRON:1@40;ORE_CRYSTAL:1@60",
      "feature": "해상 이동 후 섬 채광",
      "description": "바다 위로 솟은 섬의 바위길이다. 채광을 마친 뒤 부두로 돌아가는 배편을 이용할 수 있다.",
      "observe": "발아래 단단한 섬의 바위와 섬 사이의 깊은 수면을 구분해 살핀다. 바위틈에서 광물을 찾을 수 있고, 해안으로 돌아오면 항구행 배를 탈 수 있다. 높은 바위들 너머로 다른 섬의 윤곽이 겹친다.",
      "anchor": "고운각 서북쪽 섬 중앙 육지 · 선택한 서북쪽 섬의 넓은 육지. 배편 경로와 섬을 구분하며 별도 선착장 좌표는 아님.",
      "safe": false,
      "anchorKind": "AREA",
      "anchorFeature": "고운각 서북쪽 섬 중앙 육지"
    },
    {
      "id": "MAP_LY_DETAIL_CHASM_GATE",
      "name": "층암거연 · 동쪽 진입로",
      "zone": "층암거연",
      "parent": "MAP_CHASM_SURFACE",
      "point": [
        240,
        658
      ],
      "kind": "MINE",
      "resource": "ORE_IRON:1-2@45;ORE_WHITE_IRON:1@40;ORE_CRYSTAL:1@15",
      "feature": "광구 외곽 채광",
      "description": "거대한 지상 광구로 접근하는 동쪽 길목이다. 바깥 광맥을 캐거나 광구 지상으로 들어갈 수 있다.",
      "observe": "길 앞에서 땅이 거대한 층을 이루며 안쪽으로 꺼져 있다. 동쪽 진입로의 바깥 광맥을 살핀 뒤, 아래로 이어지는 지상 광구길을 확인한다. 깊은 갱도로 향하는 길과 지상으로 돌아오는 길을 혼동하지 않도록 주의한다.",
      "anchor": "층암거연 동쪽 외곽 접근길 · 동쪽 외곽에서 광구로 이어지는 밝은 길의 서쪽 구간. 특정 관문 문턱의 정밀 위치는 미확정.",
      "safe": false,
      "anchorKind": "PATH",
      "anchorFeature": "층암거연 동쪽 외곽 접근길"
    },
    {
      "id": "MAP_LY_DETAIL_CHASM_RIM",
      "name": "층암거연 · 동쪽 광구길",
      "zone": "층암거연",
      "parent": "MAP_CHASM_SURFACE",
      "point": [
        210,
        655
      ],
      "kind": "MINE",
      "resource": "ORE_IRON:1@25;ORE_WHITE_IRON:1@40;ORE_CRYSTAL:1@35",
      "feature": "지상 광구 가장자리 채광",
      "description": "지상 광구의 가장자리를 따라 난 길이다. 광물을 캐고 기존 지상 탐험 거점으로 돌아갈 수 있다.",
      "observe": "광구의 가장자리를 따라 내려가면 높이가 다른 작업로가 겹쳐 보인다. 발을 디딜 수 있는 지상 길을 따라 노출된 광맥을 살피고, 동쪽 진입로로 돌아갈 방향을 확인한다.",
      "anchor": "층암거연 동쪽 지상 광구길 · 동쪽 광구 가장자리를 따라 서쪽으로 이어지는 밝은 작업로. 지하 갱도·승강기·높이 좌표가 아님.",
      "safe": false,
      "anchorKind": "PATH",
      "anchorFeature": "층암거연 동쪽 지상 광구길"
    }
  ],
  "links": [
    [
      "MAP_LIYUE_HARBOR",
      "MAP_LY_DETAIL_NORTH_GATE",
      5,
      "WORLD_MOVE"
    ],
    [
      "MAP_LIYUE_HARBOR",
      "MAP_LY_DETAIL_FEIYUN",
      5,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_FEIYUN",
      "MAP_LY_DETAIL_YUJING",
      5,
      "WORLD_MOVE"
    ],
    [
      "MAP_LIYUE_HARBOR",
      "MAP_LY_DETAIL_CHIHU",
      5,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_FEIYUN",
      "MAP_LY_DETAIL_WHARF",
      5,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_CHIHU",
      "MAP_LY_DETAIL_WHARF",
      5,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_WHARF",
      "MAP_CRPG_LIYUE_BANK",
      5,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_NORTH_GATE",
      "MAP_LY_DETAIL_TIANHENG",
      15,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_NORTH_GATE",
      "MAP_LY_DETAIL_GUILI",
      35,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_GUILI",
      "MAP_LIYUE_PLAINS",
      15,
      "WORLD_MOVE"
    ],
    [
      "MAP_LIYUE_PLAINS",
      "MAP_LY_DETAIL_WANGSHU",
      25,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_WANGSHU",
      "MAP_LY_DETAIL_DIHUA",
      15,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_DIHUA",
      "MAP_LY_DETAIL_SHIMEN",
      25,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_SHIMEN",
      "MAP_LY_DETAIL_QINGCE_FIELDS",
      30,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_QINGCE_FIELDS",
      "MAP_LIYUE_QINGCE",
      10,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_DIHUA",
      "MAP_LY_DETAIL_QINGCE_FIELDS",
      30,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_GUILI",
      "MAP_LY_DETAIL_MINGYUN",
      25,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_MINGYUN",
      "MAP_LY_DETAIL_YAOGUANG",
      15,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_YAOGUANG",
      "MAP_LY_DETAIL_GUILI",
      20,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_GUILI",
      "MAP_LY_DETAIL_LUHUA",
      20,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_LUHUA",
      "MAP_LY_DETAIL_TIANHENG",
      30,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_LUHUA",
      "MAP_LIYUE_JUEYUN",
      35,
      "WORLD_MOVE"
    ],
    [
      "MAP_LIYUE_JUEYUN",
      "MAP_LY_DETAIL_QINGYUN",
      20,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_QINGYUN",
      "MAP_LY_DETAIL_AOCANG",
      25,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_QINGYUN",
      "MAP_LY_DETAIL_HULAO",
      25,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_HULAO",
      "MAP_LY_DETAIL_HUAGUANG",
      15,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_HUAGUANG",
      "MAP_LIYUE_MOUNTAINS",
      20,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_QINGYUN",
      "MAP_LIYUE_MOUNTAINS",
      15,
      "WORLD_MOVE"
    ],
    [
      "MAP_LIYUE_MOUNTAINS",
      "MAP_LY_DETAIL_NANTIANMEN",
      25,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_NANTIANMEN",
      "MAP_LY_DETAIL_TIANQIU",
      30,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_TIANQIU",
      "MAP_LY_DETAIL_LUHUA",
      25,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_TIANQIU",
      "MAP_LY_DETAIL_DUNYU",
      20,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_DUNYU",
      "MAP_LY_DETAIL_LINGJU",
      20,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_LINGJU",
      "MAP_LY_DETAIL_QINGXU",
      20,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_QINGXU",
      "MAP_LY_DETAIL_TIANHENG",
      35,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_LINGJU",
      "MAP_LY_DETAIL_CHASM_GATE",
      30,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_CHASM_GATE",
      "MAP_LY_DETAIL_CHASM_RIM",
      15,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_CHASM_RIM",
      "MAP_CHASM_SURFACE",
      20,
      "WORLD_MOVE"
    ],
    [
      "MAP_LY_DETAIL_WHARF",
      "MAP_LY_DETAIL_GUYUN",
      60,
      "SEA_TRANSIT"
    ]
  ],
  "notes": [
    "좌표는 승인 PNG의 왼쪽 위 기준 픽셀. 지형·길·기슭·구조물 기준점을 구분하며 미확정 갱도·관문 입구를 정밀 좌표로 주장하지 않음.",
    "지명은 원작 이름을 사용하되 세부 구역 구분·활동·이동 시간은 CRPG 설계.",
    "기존 본편 구역/경로/조건/보상은 삭제하지 않음."
  ],
  "coordinateSystem": {
    "image": "assets/terrain/liyue.png",
    "width": 880,
    "height": 786,
    "origin": "top-left",
    "unit": "source-image pixel",
    "imageSha256": "84f54d5a8bd58f098985f1135c553b028bbe9268dae5ba2c1c4096f38a283c35",
    "method": "Approved raster feature alignment. Context checked against published in-game map screenshots; not an official exported world-coordinate dataset.",
    "checkedOn": "2026-09-25"
  }
};
