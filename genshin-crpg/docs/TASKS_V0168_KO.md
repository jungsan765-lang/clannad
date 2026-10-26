# 0.16.8 임무 데이터·집계 인수인계

일일 후보는 기존 4종 + 신규 8종 = **총 12종**, 주간 후보는 기존 4종 + 신규 4종 = **총 8종**이다. 실제 임무판에는 하루 4개, 주간 4개가 표시된다. 일일 모두 달성 보고 보너스는 별도 한 줄이며, 주간 `W_BONUS`는 기존의 일일 보너스 5회 보고 목표를 유지한다. 기존 ID는 유지한다.

날·주가 바뀔 때 저장 ID와 기간으로 후보를 골라 같은 기간의 선택을 고정한다. 확보한 동료·원소, 주인공 레벨, 도착한 지역, 입장 가능한 비경·나선 층, 사용 가능한 제작법을 확인한다. 선택 가능한 목표가 부족하면 기존 목표로 네 칸을 채운다. 일일 원석 합계 **20**, 주간 원석 합계 **70**은 유지한다. 신규 반복 후보의 데이터에는 원석이나 경험치 책을 추가하지 않는다.

캐서린의 장기 의뢰는 **24개 독립 계열 × 10단계 = 240개**다. 각 계열은 현재 받을 수 있는 단계만 표시한다. 기존 `COMMISSION_ACCEPT`로 수락 → 수락 뒤 성공한 실제 활동 집계 → 목표 달성(`READY_TO_CLAIM`) → 캐서린에게 `CLAIM_QUEST`로 보고·보상 수령 → 다음 단계 공개 순서다. 먼저 완료해 둔 활동은 새 단계에 소급하지 않는다. 전투 조건은 전투를 시작할 때의 주인공과 동료 3명 편성으로 판단한다.

보고 보상은 기존 의뢰의 `reward.mora`와 `reward.primogem`을 사용한다. 받은 의뢰는 `claimed` 상태로 남아 날짜·주차·나선 시즌 변경 후에도 다시 보상받지 못한다. 새 화면·아이템·통화·비경·지맥 보상 구조는 추가하지 않는다. 고유 특별 보상은 추후 별도 설계하며, 이번에는 중후반 원석 보상으로 완료 동기를 준다.

원소 4인 목표는 여행자의 현재 구현에서 가능한 바람 또는 해금한 바위 원소만 사용한다. 이세계 주인공의 물리 원소로는 이 목표를 제시하지 않는다. 2+2 목표는 여행자의 바람·바위와 실제 동료 편성을 요구한다. 이름을 지정한 4★ 편성은 **지정 동료 3명 + 고정 주인공**이며, 노엘 1명만 지정한 목표는 다른 동료 2명을 자유롭게 고른다.

## 중후반 일회성 보상

1–3단계는 모라만 지급한다. 4–9단계는 원석을 늘리고 마지막 10단계는 원석 300을 지급한다. 이 마지막 보상은 **계열 10단계 완료 보상**이다. 비교적 쉬운 몬드 채집·단조 계열은 Lv.30–40에 끝나므로 모든 최종 보상이 Lv.60 전투를 뜻하지는 않는다. 전투·비경·지맥·편성 계열 후반은 Lv.50–60 조건을 포함한다.

| 단계 | 기본 모라 | 원석 |
| --- | ---: | ---: |
| 1 | 125 | 0 |
| 2 | 150 | 0 |
| 3 | 175 | 0 |
| 4 | 200 | 20 |
| 5 | 225 | 30 |
| 6 | 250 | 40 |
| 7 | 275 | 60 |
| 8 | 300 | 80 |
| 9 | 325 | 120 |
| 10 | 350 | 300 |

계열 하나의 합계는 **기본 모라 2,375 + 원석 650**이다. 24개 전부의 유한 보상은 **기본 모라 57,000 + 원석 15,600**이며 반복 수입이 아니다. 기존 캐서린 의뢰의 모라 배율 `max(1, 주인공 레벨/10)`은 그대로이므로 Lv.60에 전부 보고하면 실제 모라는 최대 342,000이다. 원석에는 이 배율을 적용하지 않는다. 아래 전체 목록의 모라도 기본값이다. 단계마다 먼저 수락하고 보고해야 하므로 이전 전투·보유 자원만으로 보상이 연속 지급되지 않는다.

## 신규 반복 후보

| 구분 | ID | 목표 |
| --- | --- | --- |
| 일일 | `D_V168_HILI` | 츄츄 싸움꾼 전투 2승 |
| 일일 | `D_V168_PYRO_HYDRO` | 불·물 포함 4인 전투 2승 |
| 일일 | `D_V168_REVELATION15` | 계시의 꽃 Lv.15 이상 1승 |
| 일일 | `D_V168_WEALTH30` | 부의 꽃 Lv.30 이상 1승 |
| 일일 | `D_V168_TALENT15` | 특성 비경 Lv.15 이상 1승 |
| 일일 | `D_V168_ASCENSION40` | 돌파 비경 Lv.40 이상: 물·번개 포함 1승 |
| 일일 | `D_V168_APPLE` | 사과 3개 채집 |
| 일일 | `D_V168_STEAK` | 스테이크 1회 요리 |
| 주간 | `W_V168_REACTION` | 불·물·얼음 포함 4인 전투 10승 |
| 주간 | `W_V168_CRYO_VINE` | 얼음 나무: 불 포함 3승 |
| 주간 | `W_V168_OCEANID` | 물의 정령: 번개·얼음 포함 2승 |
| 주간 | `W_V168_TALENT30` | 태산부 Lv.30 이상 5승 |

기존 일일: `D_WIN`, `D_LEY`, `D_DOMAIN`, `D_LIFE`. 기존 주간: `W_WIN`, `W_BOSS`, `W_DOMAIN`, `W_BONUS`. 일일 별도 보고 보너스: `D_BONUS`.

## 계열 목록

| 계열 ID | 계열 | 수 | 보고 장소 | 마지막 주인공 레벨 | 주요 활동 |
| --- | --- | ---: | --- | ---: | --- |
| `MOND_PATROL` | 몬드 순찰 | 10 | 몬드성 | 30 | 전투 |
| `LIYUE_PATROL` | 리월 순찰 | 10 | 리월항 | 60 | 전투 |
| `SLIME` | 슬라임 대응 | 10 | 몬드성 | 60 | 전투 |
| `HILICHURL` | 츄츄족 대응 | 10 | 몬드성 | 60 | 전투 |
| `BANDITS` | 보물 사냥단·우인단 대응 | 10 | 몬드성 | 60 | 전투 |
| `RUINS` | 유적·층암거연 대응 | 10 | 리월항 | 60 | 전투·비경 |
| `MOND_GATHER` | 몬드 채집 | 10 | 몬드성 | 30 | 채집 |
| `LIYUE_GATHER` | 리월 채집 | 10 | 리월항 | 60 | 채집 |
| `MINING` | 광석 수집 | 10 | 몬드성 | 60 | 채광 |
| `FISH_HUNT` | 낚시·사냥 | 10 | 몬드성 | 60 | 낚시·사냥 |
| `COOKING` | 조리 기록 | 10 | 몬드성 | 50 | 요리 |
| `FORGING` | 단조 기록 | 10 | 몬드성 | 40 | 단조·제작 |
| `REVELATION` | 계시의 꽃 수련 | 10 | 몬드성 | 60 | 지맥 |
| `WEALTH` | 부의 꽃 수련 | 10 | 몬드성 | 60 | 지맥 |
| `TALENT` | 특성 비경 수련 | 10 | 몬드성 | 60 | 비경 |
| `ASCENSION` | 돌파 비경 수련 | 10 | 몬드성 | 60 | 비경 |
| `EXPERIENCE` | 경험치 비경 순회 | 10 | 몬드성 | 60 | 비경 |
| `MOND_BOSSES` | 몬드 필드 보스 | 10 | 몬드성 | 60 | 필드 보스 |
| `LIYUE_BOSSES` | 리월 필드 보스 | 10 | 리월항 | 60 | 필드 보스 |
| `ABYSS` | 나선비경 도전 | 10 | 몬드성 | 60 | 나선비경 |
| `MONO_ANEMO` | 바람·바위 4인 도전 | 10 | 몬드성 | 60 | 전투·비경·지맥 |
| `DOUBLE_PAIRS` | 원소 2+2인 편성 | 10 | 몬드성 | 60 | 전투·지맥·비경·필드 보스 |
| `MOND_SQUADS` | 몬드 4★ 동료 편성 | 10 | 몬드성 | 60 | 전투·비경·지맥·필드 보스 |
| `LIYUE_SQUADS` | 리월 4★ 동료 편성 | 10 | 리월항 | 60 | 전투·비경·필드 보스·지맥 |

## 전체 240개 의뢰

각 계열 `_01`은 선행 의뢰가 없고, `_02`부터는 같은 계열의 바로 앞 ID를 보고·수령해야 공개된다. 자원 수량은 수락 이후 해당 생활 행동으로 실제 획득한 개수이며, 요리·단조는 성공한 제작 수량을 센다. `TALENT`/`ASCENSION`/`EXP`, `REVELATION`/`WEALTH`는 현재 구현의 비경·꽃 종류다. 나선비경 목표는 표에 적힌 실제 층의 승리 전투를 센다.

| ID | 완료 조건 | 일회성 보상 |
| --- | --- | --- |
| `Q_TASK_MOND_PATROL_01` | 몬드 외곽 초원 전투 1번 승리; 주인공 Lv.1 이상; 장소 MAP_MOND_PLAINS | 125 모라 |
| `Q_TASK_MOND_PATROL_02` | 속삭임의 숲 전투 2번 승리; 주인공 Lv.5 이상; 장소 MAP_MOND_FOREST | 150 모라 |
| `Q_TASK_MOND_PATROL_03` | 바람이 시작되는 곳 전투 2번 승리; 주인공 Lv.7 이상; 장소 MAP_MOND_WINDRISE | 175 모라 |
| `Q_TASK_MOND_PATROL_04` | 바람맞이 산 전투 2번 승리; 주인공 Lv.12 이상; 장소 MAP_CRPG_STORMBEARER_MOUNTAINS | 200 모라 + 원석 20 |
| `Q_TASK_MOND_PATROL_05` | 바람맞이 봉우리 전투 2번 승리; 주인공 Lv.16 이상; 장소 MAP_CRPG_STORMBEARER_POINT | 225 모라 + 원석 30 |
| `Q_TASK_MOND_PATROL_06` | 울프 영지 전투 3번 승리; 주인공 Lv.17 이상; 장소 MAP_MOND_WOLVENDOM | 250 모라 + 원석 40 |
| `Q_TASK_MOND_PATROL_07` | 맹세의 갑각 전투 3번 승리; 주인공 Lv.20 이상; 장소 MAP_CRPG_CAPE_OATH | 275 모라 + 원석 60 |
| `Q_TASK_MOND_PATROL_08` | 타타우파 협곡 전투 3번 승리; 주인공 Lv.20 이상; 장소 MAP_CRPG_DADAUPA_GORGE | 300 모라 + 원석 80 |
| `Q_TASK_MOND_PATROL_09` | 드래곤 스파인 전투 3번 승리; 주인공 Lv.25 이상; 장소 MAP_DRAGONSPINE | 325 모라 + 원석 120 |
| `Q_TASK_MOND_PATROL_10` | 바람 드래곤의 폐허 동부에서 4인으로 전투 4번 승리; 주인공 Lv.30 이상; 장소 MAP_CRPG_LAIR_EAST_RUINS; 전투 시작 때 주인공+동료 3명 | 350 모라 + 원석 300 |
| `Q_TASK_LIYUE_PATROL_01` | 리월 평야·도로 전투 2번 승리; 주인공 Lv.30 이상; 장소 MAP_LIYUE_PLAINS | 125 모라 |
| `Q_TASK_LIYUE_PATROL_02` | 적화주 전투 2번 승리; 주인공 Lv.32 이상; 장소 MAP_LY_DETAIL_DIHUA | 150 모라 |
| `Q_TASK_LIYUE_PATROL_03` | 귀리 평원 전투 3번 승리; 주인공 Lv.34 이상; 장소 MAP_LY_DETAIL_GUILI | 175 모라 |
| `Q_TASK_LIYUE_PATROL_04` | 명온 마을 전투 3번 승리; 주인공 Lv.36 이상; 장소 MAP_LY_DETAIL_MINGYUN | 200 모라 + 원석 20 |
| `Q_TASK_LIYUE_PATROL_05` | 녹화 연못 전투 3번 승리; 주인공 Lv.36 이상; 장소 MAP_LY_DETAIL_LUHUA | 225 모라 + 원석 30 |
| `Q_TASK_LIYUE_PATROL_06` | 절운간 전투 3번 승리; 주인공 Lv.40 이상; 장소 MAP_LIYUE_JUEYUN | 250 모라 + 원석 40 |
| `Q_TASK_LIYUE_PATROL_07` | 리월 산악지대 전투 4번 승리; 주인공 Lv.42 이상; 장소 MAP_LIYUE_MOUNTAINS | 275 모라 + 원석 60 |
| `Q_TASK_LIYUE_PATROL_08` | 고운각 전투 4번 승리; 주인공 Lv.48 이상; 장소 MAP_LY_DETAIL_GUYUN | 300 모라 + 원석 80 |
| `Q_TASK_LIYUE_PATROL_09` | 층암거연 지상 전투 4번 승리; 주인공 Lv.50 이상; 장소 MAP_CHASM_SURFACE | 325 모라 + 원석 120 |
| `Q_TASK_LIYUE_PATROL_10` | 층암거연 지하 심층에서 4인으로 전투 5번 승리; 주인공 Lv.60 이상; 장소 MAP_CHASM_DEEP; 전투 시작 때 주인공+동료 3명 | 350 모라 + 원석 300 |
| `Q_TASK_SLIME_01` | 바람 슬라임이 있는 전투 1번 승리; 주인공 Lv.1 이상; 대상 MON_SLIME_ANEMO | 125 모라 |
| `Q_TASK_SLIME_02` | 불 슬라임이 있는 전투 2번 승리; 주인공 Lv.5 이상; 대상 MON_SLIME_PYRO | 150 모라 |
| `Q_TASK_SLIME_03` | 물 슬라임이 있는 전투 2번 승리; 주인공 Lv.5 이상; 대상 MON_SLIME_HYDRO | 175 모라 |
| `Q_TASK_SLIME_04` | 번개 슬라임이 있는 전투 2번 승리; 주인공 Lv.10 이상; 대상 MON_SLIME_ELECTRO | 200 모라 + 원석 20 |
| `Q_TASK_SLIME_05` | 얼음 슬라임이 있는 전투 2번 승리; 주인공 Lv.15 이상; 대상 MON_SLIME_CRYO | 225 모라 + 원석 30 |
| `Q_TASK_SLIME_06` | 바위 슬라임이 있는 전투 2번 승리; 주인공 Lv.20 이상; 대상 MON_SLIME_GEO | 250 모라 + 원석 40 |
| `Q_TASK_SLIME_07` | 풀 슬라임이 있는 전투 2번 승리; 주인공 Lv.25 이상; 대상 MON_SLIME_DENDRO | 275 모라 + 원석 60 |
| `Q_TASK_SLIME_08` | 대형 물 슬라임 상대: 얼음 동료 포함 3승; 주인공 Lv.30 이상; 대상 MON_SLIME_LARGE_HYDRO; 전투 시작 때 주인공+동료 3명; 얼음 포함 | 300 모라 + 원석 80 |
| `Q_TASK_SLIME_09` | 대형 얼음 슬라임 상대: 불 동료 포함 3승; 주인공 Lv.40 이상; 대상 MON_SLIME_LARGE_CRYO; 전투 시작 때 주인공+동료 3명; 불 포함 | 325 모라 + 원석 120 |
| `Q_TASK_SLIME_10` | 대형 번개 슬라임 상대: 불·얼음 포함 4승; 주인공 Lv.60 이상; 대상 MON_SLIME_LARGE_ELECTRO; 전투 시작 때 주인공+동료 3명; 불·얼음 포함 | 350 모라 + 원석 300 |
| `Q_TASK_HILICHURL_01` | 츄츄 싸움꾼이 있는 전투 1번 승리; 주인공 Lv.1 이상; 대상 MON_HILI_FIGHTER | 125 모라 |
| `Q_TASK_HILICHURL_02` | 츄츄 궁수가 있는 전투 2번 승리; 주인공 Lv.5 이상; 대상 MON_HILI_SHOOTER | 150 모라 |
| `Q_TASK_HILICHURL_03` | 화염탄 츄츄가 있는 전투 2번 승리; 주인공 Lv.10 이상; 대상 MON_HILI_GRENADIER | 175 모라 |
| `Q_TASK_HILICHURL_04` | 츄츄 화염 궁수 상대: 물 포함 2승; 주인공 Lv.12 이상; 대상 MON_HILI_PYRO_SHOOTER; 전투 시작 때 주인공+동료 3명; 물 포함 | 200 모라 + 원석 20 |
| `Q_TASK_HILICHURL_05` | 츄츄 얼음 궁수 상대: 불 포함 2승; 주인공 Lv.15 이상; 대상 MON_HILI_CRYO_SHOOTER; 전투 시작 때 주인공+동료 3명; 불 포함 | 225 모라 + 원석 30 |
| `Q_TASK_HILICHURL_06` | 나무 방패 츄츄 폭도 상대: 불 포함 3승; 주인공 Lv.20 이상; 대상 MON_MITACHURL_WOOD; 전투 시작 때 주인공+동료 3명; 불 포함 | 250 모라 + 원석 40 |
| `Q_TASK_HILICHURL_07` | 얼음 방패 츄츄 폭도 상대: 불·번개 포함 3승; 주인공 Lv.25 이상; 대상 MON_MITACHURL_ICE; 전투 시작 때 주인공+동료 3명; 불·번개 포함 | 275 모라 + 원석 60 |
| `Q_TASK_HILICHURL_08` | 돌방패 츄츄 폭도 상대: 바위 포함 3승; 주인공 Lv.35 이상; 대상 MON_MITACHURL_ROCK; 전투 시작 때 주인공+동료 3명; 바위 포함 | 300 모라 + 원석 80 |
| `Q_TASK_HILICHURL_09` | 불도끼 츄츄 폭도 상대: 물·얼음 포함 4승; 주인공 Lv.45 이상; 대상 MON_MITACHURL_AXE; 전투 시작 때 주인공+동료 3명; 물·얼음 포함 | 325 모라 + 원석 120 |
| `Q_TASK_HILICHURL_10` | 번개 궁수 상대: 바위·불·얼음 포함 4승; 주인공 Lv.60 이상; 대상 MON_HILI_ELECTRO_SHOOTER; 전투 시작 때 주인공+동료 3명; 바위·불·얼음 포함 | 350 모라 + 원석 300 |
| `Q_TASK_BANDITS_01` | 보물 사냥단 척후병이 있는 전투 2승; 주인공 Lv.5 이상; 대상 MON_TH_SCOUT | 125 모라 |
| `Q_TASK_BANDITS_02` | 보물 사냥단 신궁이 있는 전투 2승; 주인공 Lv.10 이상; 대상 MON_TH_MARKSMAN | 150 모라 |
| `Q_TASK_BANDITS_03` | 보물 사냥단 불의 약제사 상대: 물 포함 2승; 주인공 Lv.15 이상; 대상 MON_TH_POTION_PYRO; 전투 시작 때 주인공+동료 3명; 물 포함 | 175 모라 |
| `Q_TASK_BANDITS_04` | 우인단 화승총 유격대 상대: 물 포함 2승; 주인공 Lv.20 이상; 대상 MON_FATUI_PYRO; 전투 시작 때 주인공+동료 3명; 물 포함 | 200 모라 + 원석 20 |
| `Q_TASK_BANDITS_05` | 우인단 얼음총 중보병 상대: 불 포함 2승; 주인공 Lv.25 이상; 대상 MON_FATUI_CRYO; 전투 시작 때 주인공+동료 3명; 불 포함 | 225 모라 + 원석 30 |
| `Q_TASK_BANDITS_06` | 우인단 물총 중보병 상대: 얼음·번개 포함 3승; 주인공 Lv.30 이상; 대상 MON_FATUI_HYDRO; 전투 시작 때 주인공+동료 3명; 얼음·번개 포함 | 250 모라 + 원석 40 |
| `Q_TASK_BANDITS_07` | 우인단 바위 유격대 상대: 바위 포함 3승; 주인공 Lv.35 이상; 대상 MON_FATUI_GEO; 전투 시작 때 주인공+동료 3명; 바위 포함 | 275 모라 + 원석 60 |
| `Q_TASK_BANDITS_08` | 우인단 번개 해머 돌격대 상대: 얼음 포함 3승; 주인공 Lv.40 이상; 대상 MON_FATUI_ELECTRO; 전투 시작 때 주인공+동료 3명; 얼음 포함 | 300 모라 + 원석 80 |
| `Q_TASK_BANDITS_09` | 우인단 풍권 돌격대 상대: 불·물 포함 4승; 주인공 Lv.50 이상; 대상 MON_FATUI_ANEMO; 전투 시작 때 주인공+동료 3명; 불·물 포함 | 325 모라 + 원석 120 |
| `Q_TASK_BANDITS_10` | 우인단 상대: 4★ 동료 셋과 전투 5승; 주인공 Lv.60 이상; 대상 MON_FATUI_PYRO / MON_FATUI_CRYO / MON_FATUI_ELECTRO; 전투 시작 때 주인공+동료 3명; 동료 전원 4★ | 350 모라 + 원석 300 |
| `Q_TASK_RUINS_01` | 유적 가디언이 있는 전투 1번 승리; 주인공 Lv.30 이상; 대상 MON_RUIN_GUARD_VARIANT | 125 모라 |
| `Q_TASK_RUINS_02` | 새끼 바위 용 도마뱀이 있는 전투 2승; 주인공 Lv.30 이상; 대상 MON_GEOVISHAP_HATCHLING | 150 모라 |
| `Q_TASK_RUINS_03` | 유적 가디언 상대: 번개 포함 2승; 주인공 Lv.35 이상; 대상 MON_RUIN_GUARD_VARIANT; 전투 시작 때 주인공+동료 3명; 번개 포함 | 175 모라 |
| `Q_TASK_RUINS_04` | 새끼 바위 용 도마뱀 상대: 바위 포함 2승; 주인공 Lv.40 이상; 대상 MON_GEOVISHAP_HATCHLING; 전투 시작 때 주인공+동료 3명; 바위 포함 | 200 모라 + 원석 20 |
| `Q_TASK_RUINS_05` | 층암거연 지상에서 유적 가디언 전투 2승; 주인공 Lv.50 이상; 장소 MAP_CHASM_SURFACE; 대상 MON_RUIN_GUARD_VARIANT | 225 모라 + 원석 30 |
| `Q_TASK_RUINS_06` | 층암거연 지하에서 유적 가디언 전투 3승; 주인공 Lv.56 이상; 장소 MAP_CHASM_DEEP; 대상 MON_RUIN_GUARD_VARIANT | 250 모라 + 원석 40 |
| `Q_TASK_RUINS_07` | 빈 갑주 기수가 있는 전투 2승; 주인공 Lv.56 이상; 대상 MON_HUSK_STANDARD | 275 모라 + 원석 60 |
| `Q_TASK_RUINS_08` | 빈 갑주 궁수가 있는 전투 2승; 주인공 Lv.56 이상; 대상 MON_HUSK_BOW | 300 모라 + 원석 80 |
| `Q_TASK_RUINS_09` | 유적 가디언 상대: 물·얼음·번개 포함 3승; 주인공 Lv.60 이상; 대상 MON_RUIN_GUARD_VARIANT; 전투 시작 때 주인공+동료 3명; 물·얼음·번개 포함 | 325 모라 + 원석 120 |
| `Q_TASK_RUINS_10` | 암중협곡 Lv.60 경험치 비경 3승; 주인공 Lv.60 이상; 장소 MAP_CHASM_DEEP; 비경 EXP; 선택 난이도 Lv.60 이상; 전투 시작 때 주인공+동료 3명 | 350 모라 + 원석 300 |
| `Q_TASK_MOND_GATHER_01` | 초원에서 사과 3개 채집; 주인공 Lv.1 이상; 장소 MAP_MOND_PLAINS; 자원 ING_APPLE | 125 모라 |
| `Q_TASK_MOND_GATHER_02` | 초원에서 일몰 열매 3개 채집; 주인공 Lv.3 이상; 장소 MAP_MOND_PLAINS; 자원 ING_SUNSETTIA | 150 모라 |
| `Q_TASK_MOND_GATHER_03` | 초원에서 달콤달콤꽃 4개 채집; 주인공 Lv.5 이상; 장소 MAP_MOND_PLAINS; 자원 ING_SWEET_FLOWER | 175 모라 |
| `Q_TASK_MOND_GATHER_04` | 속삭임의 숲에서 버섯 4개 채집; 주인공 Lv.5 이상; 장소 MAP_MOND_FOREST; 자원 ING_MUSHROOM | 200 모라 + 원석 20 |
| `Q_TASK_MOND_GATHER_05` | 속삭임의 숲에서 솔방울 4개 채집; 주인공 Lv.7 이상; 장소 MAP_MOND_FOREST; 자원 ING_PINECONE | 225 모라 + 원석 30 |
| `Q_TASK_MOND_GATHER_06` | 속삭임의 숲에서 송이버섯 5개 채집; 주인공 Lv.10 이상; 장소 MAP_MOND_FOREST; 자원 ING_MATSUTAKE | 250 모라 + 원석 40 |
| `Q_TASK_MOND_GATHER_07` | 속삭임의 숲에서 등불꽃 5개 채집; 주인공 Lv.15 이상; 장소 MAP_MOND_FOREST; 자원 ING_LAMP_GRASS | 275 모라 + 원석 60 |
| `Q_TASK_MOND_GATHER_08` | 다운 와이너리에서 라즈베리 6개 채집; 주인공 Lv.20 이상; 장소 MAP_MOND_DAWN_WINERY; 자원 ING_BERRY | 300 모라 + 원석 80 |
| `Q_TASK_MOND_GATHER_09` | 몬드 초원·숲길에서 새알 8개 채집; 주인공 Lv.25 이상; 장소 MAP_MOND_PLAINS / MAP_MOND_FOREST; 자원 ING_BIRD_EGG | 325 모라 + 원석 120 |
| `Q_TASK_MOND_GATHER_10` | 몬드 초원·숲길에서 민트 10개 채집; 주인공 Lv.30 이상; 장소 MAP_MOND_PLAINS / MAP_MOND_FOREST; 자원 ING_MINT | 350 모라 + 원석 300 |
| `Q_TASK_LIYUE_GATHER_01` | 리월 평야에서 당근 3개 채집; 주인공 Lv.30 이상; 장소 MAP_LIYUE_PLAINS; 자원 ING_CARROT | 125 모라 |
| `Q_TASK_LIYUE_GATHER_02` | 리월 평야에서 흰 무 4개 채집; 주인공 Lv.30 이상; 장소 MAP_LIYUE_PLAINS; 자원 ING_RADISH | 150 모라 |
| `Q_TASK_LIYUE_GATHER_03` | 리월 평야에서 연꽃받침 4개 채집; 주인공 Lv.32 이상; 장소 MAP_LIYUE_PLAINS; 자원 ING_LOTUS_HEAD | 175 모라 |
| `Q_TASK_LIYUE_GATHER_04` | 리월 평야에서 금어초 4개 채집; 주인공 Lv.34 이상; 장소 MAP_LIYUE_PLAINS; 자원 ING_SNAPDRAGON | 200 모라 + 원석 20 |
| `Q_TASK_LIYUE_GATHER_05` | 리월 평야에서 말총 5개 채집; 주인공 Lv.36 이상; 장소 MAP_LIYUE_PLAINS; 자원 ING_HORSETAIL | 225 모라 + 원석 30 |
| `Q_TASK_LIYUE_GATHER_06` | 절운간에서 죽순 5개 채집; 주인공 Lv.40 이상; 장소 MAP_LIYUE_JUEYUN; 자원 ING_BAMBOO_SHOOT | 250 모라 + 원석 40 |
| `Q_TASK_LIYUE_GATHER_07` | 절운간에서 절운고추 6개 채집; 주인공 Lv.42 이상; 장소 MAP_LIYUE_JUEYUN; 자원 MAT_LIYUE_JUEYUN_CHILI | 275 모라 + 원석 60 |
| `Q_TASK_LIYUE_GATHER_08` | 절운간에서 청심 8개 채집; 주인공 Lv.45 이상; 장소 MAP_LIYUE_JUEYUN; 자원 MAT_LIYUE_QINGXIN | 300 모라 + 원석 80 |
| `Q_TASK_LIYUE_GATHER_09` | 절운간에서 유리주머니 8개 채집; 주인공 Lv.50 이상; 장소 MAP_LIYUE_JUEYUN; 자원 MAT_LIYUE_VIOLETGRASS | 325 모라 + 원석 120 |
| `Q_TASK_LIYUE_GATHER_10` | 절운간에서 송이버섯 10개 채집; 주인공 Lv.60 이상; 장소 MAP_LIYUE_JUEYUN; 자원 ING_MATSUTAKE | 350 모라 + 원석 300 |
| `Q_TASK_MINING_01` | 몬드 동쪽 광산에서 철광 3개 채광; 주인공 Lv.1 이상; 장소 MAP_CRPG_MOND_QUARRY; 자원 ORE_IRON | 125 모라 |
| `Q_TASK_MINING_02` | 몬드 동쪽 광산에서 백철 3개 채광; 주인공 Lv.5 이상; 장소 MAP_CRPG_MOND_QUARRY; 자원 ORE_WHITE_IRON | 150 모라 |
| `Q_TASK_MINING_03` | 몬드 동쪽 광산에서 수정 3개 채광; 주인공 Lv.10 이상; 장소 MAP_CRPG_MOND_QUARRY; 자원 ORE_CRYSTAL | 175 모라 |
| `Q_TASK_MINING_04` | 드래곤 스파인에서 성은 광석 4개 채광; 주인공 Lv.24 이상; 장소 MAP_DRAGONSPINE; 자원 ORE_STARSILVER | 200 모라 + 원석 20 |
| `Q_TASK_MINING_05` | 드래곤 스파인에서 백철 4개 채광; 주인공 Lv.25 이상; 장소 MAP_DRAGONSPINE; 자원 ORE_WHITE_IRON | 225 모라 + 원석 30 |
| `Q_TASK_MINING_06` | 바람 드래곤의 폐허에서 수정 4개 채광; 주인공 Lv.28 이상; 장소 MAP_STORMTERROR_LAIR; 자원 ORE_CRYSTAL | 250 모라 + 원석 40 |
| `Q_TASK_MINING_07` | 층암거연 지상에서 철광 6개 채광; 주인공 Lv.50 이상; 장소 MAP_CHASM_SURFACE; 자원 ORE_IRON | 275 모라 + 원석 60 |
| `Q_TASK_MINING_08` | 층암거연 지상에서 백철 6개 채광; 주인공 Lv.50 이상; 장소 MAP_CHASM_SURFACE; 자원 ORE_WHITE_IRON | 300 모라 + 원석 80 |
| `Q_TASK_MINING_09` | 층암거연 지하에서 수정 8개 채광; 주인공 Lv.56 이상; 장소 MAP_CHASM_DEEP; 자원 ORE_CRYSTAL | 325 모라 + 원석 120 |
| `Q_TASK_MINING_10` | 층암거연 지하에서 백철 10개 채광; 주인공 Lv.60 이상; 장소 MAP_CHASM_DEEP; 자원 ORE_WHITE_IRON | 350 모라 + 원석 300 |
| `Q_TASK_FISH_HUNT_01` | 시드르 호수 낚시터에서 생선 살코기 3개 낚기; 주인공 Lv.3 이상; 장소 MAP_CRPG_CIDER_BANK; 자원 ING_FISH | 125 모라 |
| `Q_TASK_FISH_HUNT_02` | 속삭임의 숲 사냥터에서 짐승고기 4개 획득; 주인공 Lv.6 이상; 장소 MAP_CRPG_WHISPER_HUNT; 자원 ING_RAW_MEAT | 150 모라 |
| `Q_TASK_FISH_HUNT_03` | 샘물 연못 낚시터에서 생선 살코기 4개 낚기; 주인공 Lv.8 이상; 장소 MAP_CRPG_SPRING_POOL; 자원 ING_FISH | 175 모라 |
| `Q_TASK_FISH_HUNT_04` | 샘물 마을에서 새고기 5개 획득; 주인공 Lv.10 이상; 장소 MAP_MOND_SPRINGVALE; 자원 ING_FOWL | 200 모라 + 원석 20 |
| `Q_TASK_FISH_HUNT_05` | 와이너리 강변 낚시터에서 생선 살코기 5개 낚기; 주인공 Lv.12 이상; 장소 MAP_CRPG_DAWN_BANK; 자원 ING_FISH | 225 모라 + 원석 30 |
| `Q_TASK_FISH_HUNT_06` | 울프 영지에서 짐승고기 6개 획득; 주인공 Lv.17 이상; 장소 MAP_MOND_WOLVENDOM; 자원 ING_RAW_MEAT | 250 모라 + 원석 40 |
| `Q_TASK_FISH_HUNT_07` | 속삭임의 숲 사냥터에서 새고기 6개 획득; 주인공 Lv.20 이상; 장소 MAP_CRPG_WHISPER_HUNT; 자원 ING_FOWL | 275 모라 + 원석 60 |
| `Q_TASK_FISH_HUNT_08` | 리월항 방파제 낚시터에서 생선 살코기 8개 낚기; 주인공 Lv.30 이상; 장소 MAP_CRPG_LIYUE_BANK; 자원 ING_FISH | 300 모라 + 원석 80 |
| `Q_TASK_FISH_HUNT_09` | 리월 산악지대에서 짐승고기 10개 획득; 주인공 Lv.42 이상; 장소 MAP_LIYUE_MOUNTAINS; 자원 ING_RAW_MEAT | 325 모라 + 원석 120 |
| `Q_TASK_FISH_HUNT_10` | 리월 산악지대에서 새고기 10개 획득; 주인공 Lv.60 이상; 장소 MAP_LIYUE_MOUNTAINS; 자원 ING_FOWL | 350 모라 + 원석 300 |
| `Q_TASK_COOKING_01` | 스테이크 1회 요리; 주인공 Lv.1 이상; 제작법 REC_FOOD_STEAK | 125 모라 |
| `Q_TASK_COOKING_02` | 달콤달콤 닭꼬치 2회 요리; 주인공 Lv.3 이상; 제작법 REC_FOOD_CHICKEN_SKEWER | 150 모라 |
| `Q_TASK_COOKING_03` | 몬드 생선구이 2회 요리; 주인공 Lv.5 이상; 제작법 REC_FOOD_MOND_GRILLED_FISH | 175 모라 |
| `Q_TASK_COOKING_04` | 흰 무 야채 수프 2회 요리; 주인공 Lv.7 이상; 제작법 REC_FOOD_RADISH_SOUP | 200 모라 + 원석 20 |
| `Q_TASK_COOKING_05` | 민트 젤리 3회 요리; 주인공 Lv.10 이상; 제작법 REC_FOOD_MINT_JELLY | 225 모라 + 원석 30 |
| `Q_TASK_COOKING_06` | 달콤달콤 닭고기 스튜 3회 요리; 주인공 Lv.15 이상; 제작법 REC_FOOD_SWEET_MADAME | 250 모라 + 원석 40 |
| `Q_TASK_COOKING_07` | 모라육 3회 요리; 주인공 Lv.30 이상; 제작법 REC_FOOD_MORA_MEAT | 275 모라 + 원석 60 |
| `Q_TASK_COOKING_08` | 고기볶음 3회 요리; 주인공 Lv.35 이상; 제작법 REC_FOOD_STIR_FRIED_FILET | 300 모라 + 원석 80 |
| `Q_TASK_COOKING_09` | 연밥 계란찜 4회 요리; 주인공 Lv.40 이상; 제작법 REC_FOOD_LOTUS_EGG_SOUP | 325 모라 + 원석 120 |
| `Q_TASK_COOKING_10` | 행인두부 4회 요리; 주인공 Lv.50 이상; 제작법 REC_FOOD_ALMOND_TOFU | 350 모라 + 원석 300 |
| `Q_TASK_FORGING_01` | 참암 프로토타입 1개 단조; 주인공 Lv.3 이상; 제작법 REC_SWORD_RANCOUR | 125 모라 |
| `Q_TASK_FORGING_02` | 강철 벌침 1개 단조; 주인공 Lv.5 이상; 제작법 REC_SWORD_IRON_STING | 150 모라 |
| `Q_TASK_FORGING_03` | 백영검 1개 단조; 주인공 Lv.7 이상; 제작법 REC_CLAYMORE_WHITEBLIND | 175 모라 |
| `Q_TASK_FORGING_04` | 고화 프로토타입 1개 단조; 주인공 Lv.10 이상; 제작법 REC_CLAYMORE_ARCHAIC | 200 모라 + 원석 20 |
| `Q_TASK_FORGING_05` | 별의 낫 프로토타입 1개 단조; 주인공 Lv.12 이상; 제작법 REC_POLEARM_STARGITTER | 225 모라 + 원석 30 |
| `Q_TASK_FORGING_06` | 유월창 1개 단조; 주인공 Lv.15 이상; 제작법 REC_POLEARM_CRESCENT | 250 모라 + 원석 40 |
| `Q_TASK_FORGING_07` | 담월 프로토타입 1개 단조; 주인공 Lv.20 이상; 제작법 REC_BOW_CRESCENT | 275 모라 + 원석 60 |
| `Q_TASK_FORGING_08` | 만국 항해용해도 1개 단조; 주인공 Lv.25 이상; 제작법 REC_CATALYST_MAPPA | 300 모라 + 원석 80 |
| `Q_TASK_FORGING_09` | 황금 호박 프로토타입 1개 단조; 주인공 Lv.30 이상; 제작법 REC_CATALYST_AMBER | 325 모라 + 원석 120 |
| `Q_TASK_FORGING_10` | 철제 수호갑 1개 제작; 주인공 Lv.40 이상; 제작법 REC_ARMOR_IRON | 350 모라 + 원석 300 |
| `Q_TASK_REVELATION_01` | 계시의 꽃 Lv.6 이상 1승; 주인공 Lv.5 이상; 꽃 REVELATION; 선택 난이도 Lv.6 이상 | 125 모라 |
| `Q_TASK_REVELATION_02` | 몬드 계시의 꽃 Lv.6 이상 2승; 주인공 Lv.10 이상; 장소 MAP_MOND_PLAINS / MAP_MOND_FOREST / MAP_MOND_WINDRISE / MAP_MOND_WOLVENDOM / MAP_DRAGONSPINE; 꽃 REVELATION; 선택 난이도 Lv.6 이상 | 150 모라 |
| `Q_TASK_REVELATION_03` | 계시의 꽃 Lv.15 이상 1승; 주인공 Lv.15 이상; 꽃 REVELATION; 선택 난이도 Lv.15 이상 | 175 모라 |
| `Q_TASK_REVELATION_04` | 계시의 꽃 Lv.15 이상: 불·물 포함 2승; 주인공 Lv.20 이상; 꽃 REVELATION; 선택 난이도 Lv.15 이상; 전투 시작 때 주인공+동료 3명; 불·물 포함 | 200 모라 + 원석 20 |
| `Q_TASK_REVELATION_05` | 계시의 꽃 Lv.30 이상 2승; 주인공 Lv.30 이상; 꽃 REVELATION; 선택 난이도 Lv.30 이상 | 225 모라 + 원석 30 |
| `Q_TASK_REVELATION_06` | 계시의 꽃 Lv.30 이상: 얼음·번개 포함 2승; 주인공 Lv.35 이상; 꽃 REVELATION; 선택 난이도 Lv.30 이상; 전투 시작 때 주인공+동료 3명; 얼음·번개 포함 | 250 모라 + 원석 40 |
| `Q_TASK_REVELATION_07` | 계시의 꽃 Lv.45 이상 2승; 주인공 Lv.45 이상; 꽃 REVELATION; 선택 난이도 Lv.45 이상 | 275 모라 + 원석 60 |
| `Q_TASK_REVELATION_08` | 계시의 꽃 Lv.45 이상: 바위·물 포함 3승; 주인공 Lv.50 이상; 꽃 REVELATION; 선택 난이도 Lv.45 이상; 전투 시작 때 주인공+동료 3명; 바위·물 포함 | 300 모라 + 원석 80 |
| `Q_TASK_REVELATION_09` | 계시의 꽃 Lv.60: 4★ 동료 셋과 2승; 주인공 Lv.60 이상; 꽃 REVELATION; 선택 난이도 Lv.60 이상; 전투 시작 때 주인공+동료 3명; 동료 전원 4★ | 325 모라 + 원석 120 |
| `Q_TASK_REVELATION_10` | 계시의 꽃 Lv.60: 불·물·얼음 포함 3승; 주인공 Lv.60 이상; 꽃 REVELATION; 선택 난이도 Lv.60 이상; 전투 시작 때 주인공+동료 3명; 불·물·얼음 포함 | 350 모라 + 원석 300 |
| `Q_TASK_WEALTH_01` | 부의 꽃 Lv.6 이상 1승; 주인공 Lv.5 이상; 꽃 WEALTH; 선택 난이도 Lv.6 이상 | 125 모라 |
| `Q_TASK_WEALTH_02` | 부의 꽃 Lv.6 이상: 4인으로 2승; 주인공 Lv.10 이상; 꽃 WEALTH; 선택 난이도 Lv.6 이상; 전투 시작 때 주인공+동료 3명 | 150 모라 |
| `Q_TASK_WEALTH_03` | 부의 꽃 Lv.15 이상 1승; 주인공 Lv.15 이상; 꽃 WEALTH; 선택 난이도 Lv.15 이상 | 175 모라 |
| `Q_TASK_WEALTH_04` | 부의 꽃 Lv.15 이상: 바위 포함 2승; 주인공 Lv.20 이상; 꽃 WEALTH; 선택 난이도 Lv.15 이상; 전투 시작 때 주인공+동료 3명; 바위 포함 | 200 모라 + 원석 20 |
| `Q_TASK_WEALTH_05` | 부의 꽃 Lv.30 이상 2승; 주인공 Lv.30 이상; 꽃 WEALTH; 선택 난이도 Lv.30 이상 | 225 모라 + 원석 30 |
| `Q_TASK_WEALTH_06` | 부의 꽃 Lv.30 이상: 물·번개 포함 2승; 주인공 Lv.35 이상; 꽃 WEALTH; 선택 난이도 Lv.30 이상; 전투 시작 때 주인공+동료 3명; 물·번개 포함 | 250 모라 + 원석 40 |
| `Q_TASK_WEALTH_07` | 부의 꽃 Lv.45 이상 2승; 주인공 Lv.45 이상; 꽃 WEALTH; 선택 난이도 Lv.45 이상 | 275 모라 + 원석 60 |
| `Q_TASK_WEALTH_08` | 부의 꽃 Lv.45 이상: 불·얼음 포함 3승; 주인공 Lv.50 이상; 꽃 WEALTH; 선택 난이도 Lv.45 이상; 전투 시작 때 주인공+동료 3명; 불·얼음 포함 | 300 모라 + 원석 80 |
| `Q_TASK_WEALTH_09` | 부의 꽃 Lv.60: 엠버·바바라·노엘과 2승; 주인공 Lv.60 이상; 꽃 WEALTH; 선택 난이도 Lv.60 이상; 전투 시작 때 주인공+동료 3명; MOND_AMBER / MOND_BARBARA / MOND_NOELLE; 동료 전원 4★ | 325 모라 + 원석 120 |
| `Q_TASK_WEALTH_10` | 부의 꽃 Lv.60: 풀·물·번개 포함 3승; 주인공 Lv.60 이상; 꽃 WEALTH; 선택 난이도 Lv.60 이상; 전투 시작 때 주인공+동료 3명; 풀·물·번개 포함 | 350 모라 + 원석 300 |
| `Q_TASK_TALENT_01` | 잊혀진 협곡 Lv.5 이상 1승; 주인공 Lv.5 이상; 장소 MAP_D163_FORSAKEN_RIFT; 비경 TALENT; 선택 난이도 Lv.5 이상 | 125 모라 |
| `Q_TASK_TALENT_02` | 잊혀진 협곡 Lv.10 이상 1승; 주인공 Lv.10 이상; 장소 MAP_D163_FORSAKEN_RIFT; 비경 TALENT; 선택 난이도 Lv.10 이상 | 150 모라 |
| `Q_TASK_TALENT_03` | 잊혀진 협곡 Lv.15 이상: 불 포함 1승; 주인공 Lv.15 이상; 장소 MAP_D163_FORSAKEN_RIFT; 비경 TALENT; 선택 난이도 Lv.15 이상; 전투 시작 때 주인공+동료 3명; 불 포함 | 175 모라 |
| `Q_TASK_TALENT_04` | 잊혀진 협곡 Lv.20 이상: 물·번개 포함 2승; 주인공 Lv.20 이상; 장소 MAP_D163_FORSAKEN_RIFT; 비경 TALENT; 선택 난이도 Lv.20 이상; 전투 시작 때 주인공+동료 3명; 물·번개 포함 | 200 모라 + 원석 20 |
| `Q_TASK_TALENT_05` | 잊혀진 협곡 Lv.25: 4★ 동료 셋과 2승; 주인공 Lv.25 이상; 장소 MAP_D163_FORSAKEN_RIFT; 비경 TALENT; 선택 난이도 Lv.25 이상; 전투 시작 때 주인공+동료 3명; 동료 전원 4★ | 225 모라 + 원석 30 |
| `Q_TASK_TALENT_06` | 태산부 Lv.30 이상 1승; 주인공 Lv.30 이상; 장소 MAP_D163_TAISHAN_MANSION; 비경 TALENT; 선택 난이도 Lv.30 이상 | 250 모라 + 원석 40 |
| `Q_TASK_TALENT_07` | 태산부 Lv.40 이상: 바위 포함 2승; 주인공 Lv.40 이상; 장소 MAP_D163_TAISHAN_MANSION; 비경 TALENT; 선택 난이도 Lv.40 이상; 전투 시작 때 주인공+동료 3명; 바위 포함 | 275 모라 + 원석 60 |
| `Q_TASK_TALENT_08` | 태산부 Lv.50 이상: 물·얼음 포함 2승; 주인공 Lv.50 이상; 장소 MAP_D163_TAISHAN_MANSION; 비경 TALENT; 선택 난이도 Lv.50 이상; 전투 시작 때 주인공+동료 3명; 물·얼음 포함 | 300 모라 + 원석 80 |
| `Q_TASK_TALENT_09` | 태산부 Lv.55 이상: 향릉·행추·중운과 2승; 주인공 Lv.55 이상; 장소 MAP_D163_TAISHAN_MANSION; 비경 TALENT; 선택 난이도 Lv.55 이상; 전투 시작 때 주인공+동료 3명; LIYUE_XIANGLING / LIYUE_XINGQIU / LIYUE_CHONGYUN; 동료 전원 4★ | 325 모라 + 원석 120 |
| `Q_TASK_TALENT_10` | 태산부 Lv.60: 불·물·바위 포함 3승; 주인공 Lv.60 이상; 장소 MAP_D163_TAISHAN_MANSION; 비경 TALENT; 선택 난이도 Lv.60 이상; 전투 시작 때 주인공+동료 3명; 불·물·바위 포함 | 350 모라 + 원석 300 |
| `Q_TASK_ASCENSION_01` | 각인의 골짜기 Lv.5 이상 1승; 주인공 Lv.5 이상; 장소 MAP_D163_VALLEY_OF_REMEMBRANCE; 비경 ASCENSION; 선택 난이도 Lv.5 이상 | 125 모라 |
| `Q_TASK_ASCENSION_02` | 각인의 골짜기 Lv.10 이상: 얼음 포함 1승; 주인공 Lv.10 이상; 장소 MAP_D163_VALLEY_OF_REMEMBRANCE; 비경 ASCENSION; 선택 난이도 Lv.10 이상; 전투 시작 때 주인공+동료 3명; 얼음 포함 | 150 모라 |
| `Q_TASK_ASCENSION_03` | 각인의 골짜기 Lv.15: 불·물 포함 2승; 주인공 Lv.15 이상; 장소 MAP_D163_VALLEY_OF_REMEMBRANCE; 비경 ASCENSION; 선택 난이도 Lv.15 이상; 전투 시작 때 주인공+동료 3명; 불·물 포함 | 175 모라 |
| `Q_TASK_ASCENSION_04` | 세실리아의 모밭 Lv.20 이상 2승; 주인공 Lv.20 이상; 장소 MAP_D163_CECILIA_GARDEN; 비경 ASCENSION; 선택 난이도 Lv.20 이상 | 200 모라 + 원석 20 |
| `Q_TASK_ASCENSION_05` | 세실리아의 모밭 Lv.25: 4★ 동료 셋과 2승; 주인공 Lv.25 이상; 장소 MAP_D163_CECILIA_GARDEN; 비경 ASCENSION; 선택 난이도 Lv.25 이상; 전투 시작 때 주인공+동료 3명; 동료 전원 4★ | 225 모라 + 원석 30 |
| `Q_TASK_ASCENSION_06` | 천둥 연산 밀궁 Lv.30 이상 2승; 주인공 Lv.30 이상; 장소 MAP_D163_LIANSHAN_FORMULA; 비경 ASCENSION; 선택 난이도 Lv.30 이상 | 250 모라 + 원석 40 |
| `Q_TASK_ASCENSION_07` | 천둥 연산 밀궁 Lv.40 이상: 불·얼음 포함 2승; 주인공 Lv.40 이상; 장소 MAP_D163_LIANSHAN_FORMULA; 비경 ASCENSION; 선택 난이도 Lv.40 이상; 전투 시작 때 주인공+동료 3명; 불·얼음 포함 | 275 모라 + 원석 60 |
| `Q_TASK_ASCENSION_08` | 천둥 연산 밀궁 Lv.50 이상: 물·번개 포함 2승; 주인공 Lv.50 이상; 장소 MAP_D163_LIANSHAN_FORMULA; 비경 ASCENSION; 선택 난이도 Lv.50 이상; 전투 시작 때 주인공+동료 3명; 물·번개 포함 | 300 모라 + 원석 80 |
| `Q_TASK_ASCENSION_09` | 천둥 연산 밀궁 Lv.55 이상: 북두·행추·요요와 2승; 주인공 Lv.55 이상; 장소 MAP_D163_LIANSHAN_FORMULA; 비경 ASCENSION; 선택 난이도 Lv.55 이상; 전투 시작 때 주인공+동료 3명; LIYUE_BEIDOU / LIYUE_XINGQIU / LIYUE_YAOYAO; 동료 전원 4★ | 325 모라 + 원석 120 |
| `Q_TASK_ASCENSION_10` | 천둥 연산 밀궁 Lv.60: 4인으로 3승; 주인공 Lv.60 이상; 장소 MAP_D163_LIANSHAN_FORMULA; 비경 ASCENSION; 선택 난이도 Lv.60 이상; 전투 시작 때 주인공+동료 3명 | 350 모라 + 원석 300 |
| `Q_TASK_EXPERIENCE_01` | 한 여름의 정원 Lv.5 이상 1승; 주인공 Lv.5 이상; 장소 MAP_D163_MIDSUMMER_COURTYARD; 비경 EXP; 선택 난이도 Lv.5 이상 | 125 모라 |
| `Q_TASK_EXPERIENCE_02` | 한 여름의 정원 Lv.10 이상 1승; 주인공 Lv.10 이상; 장소 MAP_D163_MIDSUMMER_COURTYARD; 비경 EXP; 선택 난이도 Lv.10 이상 | 150 모라 |
| `Q_TASK_EXPERIENCE_03` | 한 여름의 정원 Lv.15: 얼음 포함 1승; 주인공 Lv.15 이상; 장소 MAP_D163_MIDSUMMER_COURTYARD; 비경 EXP; 선택 난이도 Lv.15 이상; 전투 시작 때 주인공+동료 3명; 얼음 포함 | 175 모라 |
| `Q_TASK_EXPERIENCE_04` | 빈다그니르의 정상 Lv.20 이상: 불 포함 1승; 주인공 Lv.20 이상; 장소 MAP_D163_PEAK_OF_VINDAGNYR; 비경 EXP; 선택 난이도 Lv.20 이상; 전투 시작 때 주인공+동료 3명; 불 포함 | 200 모라 + 원석 20 |
| `Q_TASK_EXPERIENCE_05` | 빈다그니르의 정상 Lv.25: 불·물 포함 2승; 주인공 Lv.25 이상; 장소 MAP_D163_PEAK_OF_VINDAGNYR; 비경 EXP; 선택 난이도 Lv.25 이상; 전투 시작 때 주인공+동료 3명; 불·물 포함 | 225 모라 + 원석 30 |
| `Q_TASK_EXPERIENCE_06` | 산등성이의 파수꾼 Lv.30 2승; 주인공 Lv.30 이상; 장소 MAP_D163_RIDGE_WATCH; 비경 EXP; 선택 난이도 Lv.30 이상 | 250 모라 + 원석 40 |
| `Q_TASK_EXPERIENCE_07` | 무망 인구 밀궁 Lv.40: 물·얼음 포함 2승; 주인공 Lv.40 이상; 장소 MAP_D163_ZHOU_FORMULA; 비경 EXP; 선택 난이도 Lv.40 이상; 전투 시작 때 주인공+동료 3명; 물·얼음 포함 | 275 모라 + 원석 60 |
| `Q_TASK_EXPERIENCE_08` | 화지 산굴 Lv.45: 얼음·번개 포함 2승; 주인공 Lv.45 이상; 장소 MAP_D163_CLEAR_POOL; 비경 EXP; 선택 난이도 Lv.45 이상; 전투 시작 때 주인공+동료 3명; 얼음·번개 포함 | 300 모라 + 원석 80 |
| `Q_TASK_EXPERIENCE_09` | 하늘을 찌르는 땅 Lv.55: 바위 포함 2승; 주인공 Lv.55 이상; 장소 MAP_D163_DOMAIN_OF_GUYUN; 비경 EXP; 선택 난이도 Lv.55 이상; 전투 시작 때 주인공+동료 3명; 바위 포함 | 325 모라 + 원석 120 |
| `Q_TASK_EXPERIENCE_10` | 암중협곡 Lv.60: 4★ 동료 셋과 3승; 주인공 Lv.60 이상; 장소 MAP_CHASM_DEEP; 비경 EXP; 선택 난이도 Lv.60 이상; 전투 시작 때 주인공+동료 3명; 동료 전원 4★ | 350 모라 + 원석 300 |
| `Q_TASK_MOND_BOSSES_01` | 무상의 바람 1회 토벌; 주인공 Lv.18 이상; 대상 FB_ANEMO_HYPOSTASIS | 125 모라 |
| `Q_TASK_MOND_BOSSES_02` | 무상의 뇌전 1회 토벌; 주인공 Lv.20 이상; 대상 FB_ELECTRO_HYPOSTASIS | 150 모라 |
| `Q_TASK_MOND_BOSSES_03` | 얼음 나무 1회 토벌; 주인공 Lv.22 이상; 대상 FB_CRYO_REGISVINE | 175 모라 |
| `Q_TASK_MOND_BOSSES_04` | 무상의 바람: 엠버·바바라·노엘과 1승; 주인공 Lv.25 이상; 대상 FB_ANEMO_HYPOSTASIS; 전투 시작 때 주인공+동료 3명; MOND_AMBER / MOND_BARBARA / MOND_NOELLE; 동료 전원 4★ | 200 모라 + 원석 20 |
| `Q_TASK_MOND_BOSSES_05` | 무상의 뇌전: 불·얼음 포함 1승; 주인공 Lv.28 이상; 대상 FB_ELECTRO_HYPOSTASIS; 전투 시작 때 주인공+동료 3명; 불·얼음 포함 | 225 모라 + 원석 30 |
| `Q_TASK_MOND_BOSSES_06` | 무상의 얼음: 불 포함 1승; 주인공 Lv.30 이상; 대상 FB_CRYO_HYPOSTASIS; 전투 시작 때 주인공+동료 3명; 불 포함 | 250 모라 + 원석 40 |
| `Q_TASK_MOND_BOSSES_07` | 얼음 나무: 엠버·베넷·바바라와 2승; 주인공 Lv.35 이상; 대상 FB_CRYO_REGISVINE; 전투 시작 때 주인공+동료 3명; MOND_AMBER / MOND_BENNETT / MOND_BARBARA; 동료 전원 4★ | 275 모라 + 원석 60 |
| `Q_TASK_MOND_BOSSES_08` | 무상의 뇌전: 4★ 동료 셋과 2승; 주인공 Lv.40 이상; 대상 FB_ELECTRO_HYPOSTASIS; 전투 시작 때 주인공+동료 3명; 동료 전원 4★ | 300 모라 + 원석 80 |
| `Q_TASK_MOND_BOSSES_09` | 무상의 얼음: 불·바위·번개 포함 2승; 주인공 Lv.50 이상; 대상 FB_CRYO_HYPOSTASIS; 전투 시작 때 주인공+동료 3명; 불·바위·번개 포함 | 325 모라 + 원석 120 |
| `Q_TASK_MOND_BOSSES_10` | 무상의 바람: 불·물·얼음 포함 3승; 주인공 Lv.60 이상; 대상 FB_ANEMO_HYPOSTASIS; 전투 시작 때 주인공+동료 3명; 불·물·얼음 포함 | 350 모라 + 원석 300 |
| `Q_TASK_LIYUE_BOSSES_01` | 폭염 나무: 물 포함 1승; 주인공 Lv.38 이상; 대상 FB_PYRO_REGISVINE; 전투 시작 때 주인공+동료 3명; 물 포함 | 125 모라 |
| `Q_TASK_LIYUE_BOSSES_02` | 물의 정령: 얼음·번개 포함 1승; 주인공 Lv.40 이상; 대상 FB_OCEANID; 전투 시작 때 주인공+동료 3명; 얼음·번개 포함 | 150 모라 |
| `Q_TASK_LIYUE_BOSSES_03` | 무상의 바위: 바위 포함 1승; 주인공 Lv.45 이상; 대상 FB_GEO_HYPOSTASIS; 전투 시작 때 주인공+동료 3명; 바위 포함 | 175 모라 |
| `Q_TASK_LIYUE_BOSSES_04` | 고대 바위 용 도마뱀: 노엘 포함 1승; 주인공 Lv.48 이상; 대상 FB_PRIMO_GEOVISHAP; 전투 시작 때 주인공+동료 3명; MOND_NOELLE | 200 모라 + 원석 20 |
| `Q_TASK_LIYUE_BOSSES_05` | 폭염 나무: 행추·중운·북두와 2승; 주인공 Lv.50 이상; 대상 FB_PYRO_REGISVINE; 전투 시작 때 주인공+동료 3명; LIYUE_XINGQIU / LIYUE_CHONGYUN / LIYUE_BEIDOU; 동료 전원 4★ | 225 모라 + 원석 30 |
| `Q_TASK_LIYUE_BOSSES_06` | 물의 정령: 케이아·피슬·설탕과 2승; 주인공 Lv.52 이상; 대상 FB_OCEANID; 전투 시작 때 주인공+동료 3명; MOND_KAEYA / MOND_FISCHL / MOND_SUCROSE; 동료 전원 4★ | 250 모라 + 원석 40 |
| `Q_TASK_LIYUE_BOSSES_07` | 무상의 바위: 노엘·응광·운근과 2승; 주인공 Lv.55 이상; 대상 FB_GEO_HYPOSTASIS; 전투 시작 때 주인공+동료 3명; MOND_NOELLE / LIYUE_NINGGUANG / LIYUE_YUNJIN; 동료 전원 4★ | 275 모라 + 원석 60 |
| `Q_TASK_LIYUE_BOSSES_08` | 유적의 뱀: 노엘 포함 1승; 주인공 Lv.56 이상; 대상 FB_RUIN_SERPENT; 전투 시작 때 주인공+동료 3명; MOND_NOELLE | 300 모라 + 원석 80 |
| `Q_TASK_LIYUE_BOSSES_09` | 고대 바위 용 도마뱀: 북두·행추·노엘과 2승; 주인공 Lv.60 이상; 대상 FB_PRIMO_GEOVISHAP; 전투 시작 때 주인공+동료 3명; LIYUE_BEIDOU / LIYUE_XINGQIU / MOND_NOELLE; 동료 전원 4★ | 325 모라 + 원석 120 |
| `Q_TASK_LIYUE_BOSSES_10` | 유적의 뱀: 불·물·바위 포함 2승; 주인공 Lv.60 이상; 대상 FB_RUIN_SERPENT; 전투 시작 때 주인공+동료 3명; 불·물·바위 포함 | 350 모라 + 원석 300 |
| `Q_TASK_ABYSS_01` | 나선비경 1층 전투 3승; 주인공 Lv.15 이상; 층 1 | 125 모라 |
| `Q_TASK_ABYSS_02` | 나선비경 2층 전투 3승; 주인공 Lv.20 이상; 층 2 | 150 모라 |
| `Q_TASK_ABYSS_03` | 나선비경 3층 전투 3승; 주인공 Lv.25 이상; 층 3 | 175 모라 |
| `Q_TASK_ABYSS_04` | 나선비경 4층 전투 3승; 주인공 Lv.30 이상; 층 4 | 200 모라 + 원석 20 |
| `Q_TASK_ABYSS_05` | 나선비경 5층 전투 3승; 주인공 Lv.35 이상; 층 5 | 225 모라 + 원석 30 |
| `Q_TASK_ABYSS_06` | 나선비경 6층 전투 3승; 주인공 Lv.40 이상; 층 6 | 250 모라 + 원석 40 |
| `Q_TASK_ABYSS_07` | 나선비경 7층 전투 3승; 주인공 Lv.45 이상; 층 7 | 275 모라 + 원석 60 |
| `Q_TASK_ABYSS_08` | 나선비경 8층 전투 3승; 주인공 Lv.50 이상; 층 8 | 300 모라 + 원석 80 |
| `Q_TASK_ABYSS_09` | 나선비경 9층 전투 3승; 주인공 Lv.55 이상; 층 9 | 325 모라 + 원석 120 |
| `Q_TASK_ABYSS_10` | 나선비경 12층 전투 3승; 주인공 Lv.60 이상; 층 12 | 350 모라 + 원석 300 |
| `Q_TASK_MONO_ANEMO_01` | 바람 원소 4인으로 초원 전투 2승; 주인공 Lv.30 이상; 장소 MAP_MOND_PLAINS; 전투 시작 때 주인공+동료 3명; 바람 4인 | 125 모라 |
| `Q_TASK_MONO_ANEMO_02` | 바람 원소 4인으로 숲길 전투 2승; 주인공 Lv.32 이상; 장소 MAP_MOND_FOREST; 전투 시작 때 주인공+동료 3명; 바람 4인 | 150 모라 |
| `Q_TASK_MONO_ANEMO_03` | 바람 4인: 잊혀진 협곡 Lv.20 이상 1승; 주인공 Lv.35 이상; 장소 MAP_D163_FORSAKEN_RIFT; 비경 TALENT; 선택 난이도 Lv.20 이상; 전투 시작 때 주인공+동료 3명; 바람 4인 | 175 모라 |
| `Q_TASK_MONO_ANEMO_04` | 바람 4인: 계시의 꽃 Lv.30 이상 1승; 주인공 Lv.35 이상; 꽃 REVELATION; 선택 난이도 Lv.30 이상; 전투 시작 때 주인공+동료 3명; 바람 4인 | 200 모라 + 원석 20 |
| `Q_TASK_MONO_ANEMO_05` | 바람 4인: 부의 꽃 Lv.30 이상 2승; 주인공 Lv.40 이상; 꽃 WEALTH; 선택 난이도 Lv.30 이상; 전투 시작 때 주인공+동료 3명; 바람 4인 | 225 모라 + 원석 30 |
| `Q_TASK_MONO_ANEMO_06` | 바위 4인: 산등성이의 파수꾼 Lv.30 2승; 주인공 Lv.42 이상; 장소 MAP_D163_RIDGE_WATCH; 비경 EXP; 선택 난이도 Lv.30 이상; 전투 시작 때 주인공+동료 3명; 바위 4인 | 250 모라 + 원석 40 |
| `Q_TASK_MONO_ANEMO_07` | 바위 4인: 태산부 Lv.40 이상 2승; 주인공 Lv.45 이상; 장소 MAP_D163_TAISHAN_MANSION; 비경 TALENT; 선택 난이도 Lv.40 이상; 전투 시작 때 주인공+동료 3명; 바위 4인 | 275 모라 + 원석 60 |
| `Q_TASK_MONO_ANEMO_08` | 바위 원소 4인으로 리월 산악지대 3승; 주인공 Lv.50 이상; 장소 MAP_LIYUE_MOUNTAINS; 전투 시작 때 주인공+동료 3명; 바위 4인 | 300 모라 + 원석 80 |
| `Q_TASK_MONO_ANEMO_09` | 바위 4인: 계시의 꽃 Lv.45 이상 2승; 주인공 Lv.55 이상; 꽃 REVELATION; 선택 난이도 Lv.45 이상; 전투 시작 때 주인공+동료 3명; 바위 4인 | 325 모라 + 원석 120 |
| `Q_TASK_MONO_ANEMO_10` | 바위 4인: 암중협곡 Lv.60 2승; 주인공 Lv.60 이상; 장소 MAP_CHASM_DEEP; 비경 EXP; 선택 난이도 Lv.60 이상; 전투 시작 때 주인공+동료 3명; 바위 4인 | 350 모라 + 원석 300 |
| `Q_TASK_DOUBLE_PAIRS_01` | 바람 2·불 2인으로 전투 2승; 주인공 Lv.30 이상; 전투 시작 때 주인공+동료 3명; 바람 2명 + 불 2명 | 125 모라 |
| `Q_TASK_DOUBLE_PAIRS_02` | 바람 2·물 2인으로 전투 2승; 주인공 Lv.32 이상; 전투 시작 때 주인공+동료 3명; 바람 2명 + 물 2명 | 150 모라 |
| `Q_TASK_DOUBLE_PAIRS_03` | 바람 2·얼음 2인으로 전투 2승; 주인공 Lv.35 이상; 전투 시작 때 주인공+동료 3명; 바람 2명 + 얼음 2명 | 175 모라 |
| `Q_TASK_DOUBLE_PAIRS_04` | 바람 2·번개 2인으로 전투 3승; 주인공 Lv.38 이상; 전투 시작 때 주인공+동료 3명; 바람 2명 + 번개 2명 | 200 모라 + 원석 20 |
| `Q_TASK_DOUBLE_PAIRS_05` | 바람 2·바위 2인으로 전투 3승; 주인공 Lv.40 이상; 전투 시작 때 주인공+동료 3명; 바람 2명 + 바위 2명 | 225 모라 + 원석 30 |
| `Q_TASK_DOUBLE_PAIRS_06` | 바람 2·불 2인: 계시의 꽃 Lv.30 이상 2승; 주인공 Lv.42 이상; 꽃 REVELATION; 선택 난이도 Lv.30 이상; 전투 시작 때 주인공+동료 3명; 바람 2명 + 불 2명 | 250 모라 + 원석 40 |
| `Q_TASK_DOUBLE_PAIRS_07` | 바람 2·물 2인: 부의 꽃 Lv.45 이상 2승; 주인공 Lv.45 이상; 꽃 WEALTH; 선택 난이도 Lv.45 이상; 전투 시작 때 주인공+동료 3명; 바람 2명 + 물 2명 | 275 모라 + 원석 60 |
| `Q_TASK_DOUBLE_PAIRS_08` | 바람 2·얼음 2인: 태산부 Lv.50 이상 2승; 주인공 Lv.50 이상; 장소 MAP_D163_TAISHAN_MANSION; 비경 TALENT; 선택 난이도 Lv.50 이상; 전투 시작 때 주인공+동료 3명; 바람 2명 + 얼음 2명 | 300 모라 + 원석 80 |
| `Q_TASK_DOUBLE_PAIRS_09` | 바위 2·얼음 2인: 물의 정령 2승; 주인공 Lv.55 이상; 대상 FB_OCEANID; 전투 시작 때 주인공+동료 3명; 바위 2명 + 얼음 2명 | 325 모라 + 원석 120 |
| `Q_TASK_DOUBLE_PAIRS_10` | 바위 2·번개 2인: 암중협곡 Lv.60 2승; 주인공 Lv.60 이상; 장소 MAP_CHASM_DEEP; 비경 EXP; 선택 난이도 Lv.60 이상; 전투 시작 때 주인공+동료 3명; 바위 2명 + 번개 2명 | 350 모라 + 원석 300 |
| `Q_TASK_MOND_SQUADS_01` | 엠버·케이아·리사와 초원 전투 2승; 주인공 Lv.10 이상; 장소 MAP_MOND_PLAINS; 전투 시작 때 주인공+동료 3명; MOND_AMBER / MOND_KAEYA / MOND_LISA; 동료 전원 4★ | 125 모라 |
| `Q_TASK_MOND_SQUADS_02` | 엠버·바바라·노엘과 숲길 전투 2승; 주인공 Lv.15 이상; 장소 MAP_MOND_FOREST; 전투 시작 때 주인공+동료 3명; MOND_AMBER / MOND_BARBARA / MOND_NOELLE; 동료 전원 4★ | 150 모라 |
| `Q_TASK_MOND_SQUADS_03` | 베넷·피슬·설탕: 잊혀진 협곡 Lv.15 이상 1승; 주인공 Lv.20 이상; 장소 MAP_D163_FORSAKEN_RIFT; 비경 TALENT; 선택 난이도 Lv.15 이상; 전투 시작 때 주인공+동료 3명; MOND_BENNETT / MOND_FISCHL / MOND_SUCROSE; 동료 전원 4★ | 175 모라 |
| `Q_TASK_MOND_SQUADS_04` | 케이아·디오나·로자리아: 세실리아 Lv.20 이상 1승; 주인공 Lv.25 이상; 장소 MAP_D163_CECILIA_GARDEN; 비경 ASCENSION; 선택 난이도 Lv.20 이상; 전투 시작 때 주인공+동료 3명; MOND_KAEYA / MOND_DIONA / MOND_ROSARIA; 동료 전원 4★ | 200 모라 + 원석 20 |
| `Q_TASK_MOND_SQUADS_05` | 리사·피슬·레이저: 부의 꽃 Lv.30 이상 1승; 주인공 Lv.30 이상; 꽃 WEALTH; 선택 난이도 Lv.30 이상; 전투 시작 때 주인공+동료 3명; MOND_LISA / MOND_FISCHL / MOND_RAZOR; 동료 전원 4★ | 225 모라 + 원석 30 |
| `Q_TASK_MOND_SQUADS_06` | 바바라·달리아·노엘: 계시의 꽃 Lv.30 이상 2승; 주인공 Lv.35 이상; 꽃 REVELATION; 선택 난이도 Lv.30 이상; 전투 시작 때 주인공+동료 3명; MOND_BARBARA / MOND_DAHLIA / MOND_NOELLE; 동료 전원 4★ | 250 모라 + 원석 40 |
| `Q_TASK_MOND_SQUADS_07` | 엠버·베넷·디오나와 얼음 나무 1승; 주인공 Lv.40 이상; 대상 FB_CRYO_REGISVINE; 전투 시작 때 주인공+동료 3명; MOND_AMBER / MOND_BENNETT / MOND_DIONA; 동료 전원 4★ | 275 모라 + 원석 60 |
| `Q_TASK_MOND_SQUADS_08` | 노엘·미카·로자리아: 태산부 Lv.45 이상 2승; 주인공 Lv.45 이상; 장소 MAP_D163_TAISHAN_MANSION; 비경 TALENT; 선택 난이도 Lv.45 이상; 전투 시작 때 주인공+동료 3명; MOND_NOELLE / MOND_MIKA / MOND_ROSARIA; 동료 전원 4★ | 300 모라 + 원석 80 |
| `Q_TASK_MOND_SQUADS_09` | 피슬·케이아·바바라와 물의 정령 2승; 주인공 Lv.50 이상; 대상 FB_OCEANID; 전투 시작 때 주인공+동료 3명; MOND_FISCHL / MOND_KAEYA / MOND_BARBARA; 동료 전원 4★ | 325 모라 + 원석 120 |
| `Q_TASK_MOND_SQUADS_10` | 베넷·피슬·노엘: 암중협곡 Lv.60 2승; 주인공 Lv.60 이상; 장소 MAP_CHASM_DEEP; 비경 EXP; 선택 난이도 Lv.60 이상; 전투 시작 때 주인공+동료 3명; MOND_BENNETT / MOND_FISCHL / MOND_NOELLE; 동료 전원 4★ | 350 모라 + 원석 300 |
| `Q_TASK_LIYUE_SQUADS_01` | 향릉·행추·중운과 리월 평야 전투 2승; 주인공 Lv.30 이상; 장소 MAP_LIYUE_PLAINS; 전투 시작 때 주인공+동료 3명; LIYUE_XIANGLING / LIYUE_XINGQIU / LIYUE_CHONGYUN; 동료 전원 4★ | 125 모라 |
| `Q_TASK_LIYUE_SQUADS_02` | 북두·행추·요요와 귀리 평원 전투 2승; 주인공 Lv.34 이상; 장소 MAP_LY_DETAIL_GUILI; 전투 시작 때 주인공+동료 3명; LIYUE_BEIDOU / LIYUE_XINGQIU / LIYUE_YAOYAO; 동료 전원 4★ | 150 모라 |
| `Q_TASK_LIYUE_SQUADS_03` | 연비·행추·남연: 태산부 Lv.35 이상 1승; 주인공 Lv.35 이상; 장소 MAP_D163_TAISHAN_MANSION; 비경 TALENT; 선택 난이도 Lv.35 이상; 전투 시작 때 주인공+동료 3명; LIYUE_YANFEI / LIYUE_XINGQIU / LIYUE_LANYAN; 동료 전원 4★ | 175 모라 |
| `Q_TASK_LIYUE_SQUADS_04` | 중운·행추·운근과 폭염 나무 1승; 주인공 Lv.38 이상; 대상 FB_PYRO_REGISVINE; 전투 시작 때 주인공+동료 3명; LIYUE_CHONGYUN / LIYUE_XINGQIU / LIYUE_YUNJIN; 동료 전원 4★ | 200 모라 + 원석 20 |
| `Q_TASK_LIYUE_SQUADS_05` | 가명·향릉·요요: 계시의 꽃 Lv.30 이상 2승; 주인공 Lv.40 이상; 꽃 REVELATION; 선택 난이도 Lv.30 이상; 전투 시작 때 주인공+동료 3명; LIYUE_GAMING / LIYUE_XIANGLING / LIYUE_YAOYAO; 동료 전원 4★ | 225 모라 + 원석 30 |
| `Q_TASK_LIYUE_SQUADS_06` | 신염·북두·운근과 리월 산악 전투 3승; 주인공 Lv.42 이상; 장소 MAP_LIYUE_MOUNTAINS; 전투 시작 때 주인공+동료 3명; LIYUE_XINYAN / LIYUE_BEIDOU / LIYUE_YUNJIN; 동료 전원 4★ | 250 모라 + 원석 40 |
| `Q_TASK_LIYUE_SQUADS_07` | 응광·운근·남연: 천둥 연산 Lv.45 이상 2승; 주인공 Lv.45 이상; 장소 MAP_D163_LIANSHAN_FORMULA; 비경 ASCENSION; 선택 난이도 Lv.45 이상; 전투 시작 때 주인공+동료 3명; LIYUE_NINGGUANG / LIYUE_YUNJIN / LIYUE_LANYAN; 동료 전원 4★ | 275 모라 + 원석 60 |
| `Q_TASK_LIYUE_SQUADS_08` | 북두·요요·응광과 고대 바위 용 도마뱀 1승; 주인공 Lv.48 이상; 대상 FB_PRIMO_GEOVISHAP; 전투 시작 때 주인공+동료 3명; LIYUE_BEIDOU / LIYUE_YAOYAO / LIYUE_NINGGUANG; 동료 전원 4★ | 300 모라 + 원석 80 |
| `Q_TASK_LIYUE_SQUADS_09` | 연비·행추·중운: 태산부 Lv.55 이상 2승; 주인공 Lv.55 이상; 장소 MAP_D163_TAISHAN_MANSION; 비경 TALENT; 선택 난이도 Lv.55 이상; 전투 시작 때 주인공+동료 3명; LIYUE_YANFEI / LIYUE_XINGQIU / LIYUE_CHONGYUN; 동료 전원 4★ | 325 모라 + 원석 120 |
| `Q_TASK_LIYUE_SQUADS_10` | 향릉·행추·요요: 암중협곡 Lv.60 2승; 주인공 Lv.60 이상; 장소 MAP_CHASM_DEEP; 비경 EXP; 선택 난이도 Lv.60 이상; 전투 시작 때 주인공+동료 3명; LIYUE_XIANGLING / LIYUE_XINGQIU / LIYUE_YAOYAO; 동료 전원 4★ | 350 모라 + 원석 300 |

## 검증

`node tests/test_task_catalog_v0168.cjs`는 신규 8/4 후보와 기존 포함 12/8 총수를 고정해서 검사한다. 24×10 연결, 고유 ID, 실제 몬드·리월 장소와 조우·자원 풀, 레시피, 4★ 동료, 비경·꽃 난이도, 현재 나선 층, 계열마다 서로 다른 열 개 목표, 단계별 보상·전체 합계, 설치된 의뢰의 보상 JSON과 영구 미수령 조건을 확인한다. 실제 수락·승리·보고·재보고 거절·후속 해금과 반복 기간 변경은 런타임 통합 시험으로 확인한다.

구현 데이터: `source/runtime_task_catalog_v0168.js`. 집계·회전·기존 의뢰 설치: `source/runtime_tasks_v0167.js`. 의뢰를 실행 인스턴스의 복사본에 설치하며 `content/db.json`은 수정하지 않는다.
