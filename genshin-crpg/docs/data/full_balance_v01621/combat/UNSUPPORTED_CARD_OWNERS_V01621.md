# 0.16.21 미지원 적 카드 owner별 근거

원문 READY217종(86 owner), ACTIVE125종이다. 초기 합법95종의 62그룹 actorCards/cardReason 201참조 중 미지원 참조0·선택가능0이다. 아래 카드 수는 등록/정적 미지원이며 전투 중 실행 실패 수가 아니다. 지역 이름은 DB 원문이고 플레이 가능/미출시 여부를 추정하지 않는다. 개별 카드명·ID·종류·트리거·READY·그룹·거절 이유는 active_card_refs_after.json / card_registry_414.json의 전체 행을 따른다.

| owner ID | 이름 | 지역 원문 | 미지원 | ACTIVE | 초기 AI 참조 | 위험 분류 | 참조된 거절 코드 |
|---|---|---|---:|---:|---:|---|---|
| BOSS_ALL_DEVOURING_NARWHAL | 별을 삼킨 고래 | 폰타인 | 9 | 2 | 0 | PASSIVE_UNSUPPORTED:2, UNSUPPORTED_NOT_CURRENT_AI_REF:7 | UNSUPPORTED_BOSS |
| BOSS_APEP_GUARDIAN | 아펩의 오아시스 파수꾼 | 수메르 | 8 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:6, PASSIVE_UNSUPPORTED:2 | UNSUPPORTED_BOSS |
| BOSS_ARLECCHINO | 아를레키노 | 폰타인 | 10 | 4 | 0 | PASSIVE_UNSUPPORTED:3, UNSUPPORTED_NOT_CURRENT_AI_REF:7 | UNSUPPORTED_BOSS |
| BOSS_DOTTORE_FALSE_MOON | 「거짓된 달의 이단아」 도토레 | 노드크라이 | 24 | 3 | 0 | PASSIVE_UNSUPPORTED:3, UNSUPPORTED_NOT_CURRENT_AI_REF:21 | UNSUPPORTED_BOSS |
| BOSS_DOTTORE_HERETIC_SAINT | 「이단의 성자」 도토레 | 세계수 | 6 | 2 | 0 | PASSIVE_UNSUPPORTED:2, UNSUPPORTED_NOT_CURRENT_AI_REF:4 | UNSUPPORTED_BOSS |
| BOSS_GOSOYTHOTH | 침식된 근원의 불꽃 주인(그소요토스) | 나타 | 13 | 4 | 0 | PASSIVE_UNSUPPORTED:3, UNSUPPORTED_NOT_CURRENT_AI_REF:10 | UNSUPPORTED_BOSS |
| BOSS_NARUKAMI_MIKOTO | 마가츠 미타케 나루카미노 미코토 | 이나즈마 | 7 | 2 | 0 | PASSIVE_UNSUPPORTED:3, UNSUPPORTED_NOT_CURRENT_AI_REF:4 | UNSUPPORTED_BOSS |
| BOSS_RERIR | 「달 사냥꾼」 레리르 | 노드크라이 | 7 | 2 | 0 | PASSIVE_UNSUPPORTED:2, UNSUPPORTED_NOT_CURRENT_AI_REF:5 | UNSUPPORTED_BOSS |
| BOSS_SHOUKI_NO_KAMI | 정기의 신 | 수메르 | 7 | 1 | 0 | PASSIVE_UNSUPPORTED:2, UNSUPPORTED_NOT_CURRENT_AI_REF:5 | UNSUPPORTED_BOSS |
| BOSS_SIGNORA | 시뇨라 | 이나즈마 | 6 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:6 | UNSUPPORTED_BOSS |
| BOSS_SNEZ_IMMORTAL_BYPRODUCT | 불멸의 부산물 | 스네즈나야 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | UNSUPPORTED_BOSS |
| BOSS_SNEZ_WANDERING_SNOW_GUARDIAN | 방랑하는 눈의 수호자 | 스네즈나야 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | UNSUPPORTED_BOSS |
| BOSS_SNEZ_WINGED_LION_CHIMERA | 날개 사자 키메라 | 스네즈나야 | 3 | 3 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:3 | UNSUPPORTED_BOSS |
| MON_ABYSS_HERALD | 심연 사도 | 심연 관련 지역 | 2 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1, PASSIVE_UNSUPPORTED:1 | 현재 그룹/멤버 참조 없음 |
| MON_ABYSS_HERALD_CRYO | 심연 사도·서리 내림 | 심연 관련 지역 | 2 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1, PASSIVE_UNSUPPORTED:1 | 현재 그룹/멤버 참조 없음 |
| MON_ABYSS_HERALD_HYDRO | 심연 사도·격류 | 심연 관련 지역 | 2 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1, PASSIVE_UNSUPPORTED:1 | 현재 그룹/멤버 참조 없음 |
| MON_ABYSS_LECTOR_ELECTRO | 심연 봉독자·자색 뇌전 | 심연 관련 지역 | 2 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1, PASSIVE_UNSUPPORTED:1 | 현재 그룹/멤버 참조 없음 |
| MON_ABYSS_LECTOR_PYRO | 심연 봉독자·심연의 불꽃 | 심연 관련 지역 | 1 | 0 | 0 | PASSIVE_UNSUPPORTED:1 | 현재 그룹/멤버 참조 없음 |
| MON_ABYSS_MAGE | 심연 메이지 | 다수 지역 | 1 | 0 | 0 | PASSIVE_UNSUPPORTED:1 | 현재 그룹/멤버 참조 없음 |
| MON_ABYSS_MAGE_ELECTRO | 번개의 심연 메이지 | 다수 지역 | 2 | 1 | 0 | READY_ENTRY_REJECTED:2 | UNSUPPORTED_ENEMY |
| MON_BLACK_SERPENT_AXE | 흑 뱀 기사·바위를 부수는 도끼 | 층암거연/심연 | 1 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1 | 현재 그룹/멤버 참조 없음 |
| MON_BLACK_SERPENT_LANCE | 흑 뱀 기사·창 | 층암거연/심연 | 1 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1 | 현재 그룹/멤버 참조 없음 |
| MON_BREACHER_PRIMUS | 균열계 덩굴 원형체 | 폰타인 | 2 | 1 | 0 | PASSIVE_UNSUPPORTED:1, UNSUPPORTED_NOT_CURRENT_AI_REF:1 | 현재 그룹/멤버 참조 없음 |
| MON_EREMITE_CRYO | 도금 여단·태양의 서리 | 수메르 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_EREMITE_FLORAL_RING | 도금 여단·풀고리 무용수 | 수메르 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_EREMITE_GALEHUNTER | 도금여단·바람 사냥꾼 | 수메르 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_EREMITE_HYDRO | 도금 여단·사막의 물 | 수메르 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_EREMITE_RINGDANCER | 도금 여단·환도 무희 | 수메르 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_EREMITE_SCORCHING | 도금 여단·모래의 이야기꾼 | 수메르 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_EREMITE_STONE_ENCHANTER | 도금 여단·마암역사 | 수메르 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_EREMITE_THUNDER | 도금 여단·낮을 밝히는 번개 | 수메르 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_FONTEMER_RAY | 폰타인 원종 생물·가오리형 | 폰타인 수중 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_FONTEMER_SEAHORSE | 폰타인 원종 생물·해마형 | 폰타인 수중 | 2 | 2 | 0 | READY_ENTRY_REJECTED:2 | UNSUPPORTED_ENEMY |
| MON_FUNGUS_BEAST_CRYO | 포롱 얼음 버섯몬 | 수메르/기타 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_FUNGUS_BEAST_GEO | 뚜벅 바위 버섯몬 | 수메르/기타 | 1 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1 | 현재 그룹/멤버 참조 없음 |
| MON_GEOVISHAP | 바위 용 도마뱀 | 리월 | 2 | 1 | 0 | PASSIVE_UNSUPPORTED:1, UNSUPPORTED_NOT_CURRENT_AI_REF:1 | 현재 그룹/멤버 참조 없음 |
| MON_KAIRAGI_DANCING | 해란귀·뇌무 | 이나즈마 | 2 | 1 | 0 | READY_ENTRY_REJECTED:2 | UNSUPPORTED_ENEMY |
| MON_KAIRAGI_FIERY | 해란귀·염위 | 이나즈마 | 1 | 0 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_LAWACHURL_STONE | 츄츄 바위왕 | 리월/다수 지역 | 2 | 1 | 0 | PASSIVE_UNSUPPORTED:1, UNSUPPORTED_NOT_CURRENT_AI_REF:1 | 현재 그룹/멤버 참조 없음 |
| MON_LAWACHURL_THUNDER | 츄츄 번개왕 | 이나즈마/다수 지역 | 3 | 2 | 0 | PASSIVE_UNSUPPORTED:1, UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_MEKA_DUELIST | 태엽 장치·결투형 | 폰타인 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_MEKA_GUARD | 장치·구역 경비 타입 | 폰타인 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_MEKA_HEAVY | 태엽 장치·중장갑형 | 폰타인 | 1 | 0 | 0 | PASSIVE_UNSUPPORTED:1 | 현재 그룹/멤버 참조 없음 |
| MON_MEKA_SPECIAL_OUSIA | 태엽 장치·우시아형 | 폰타인 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_MEKA_SPECIAL_PNEUMA | 태엽 장치·프뉴마형 | 폰타인 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_MEKA_SUPPRESS | 제압 특화 타입 장치 | 폰타인 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_MIRROR_MAIDEN | 우인단·거울의 여인 | 다수 지역 | 2 | 2 | 0 | READY_ENTRY_REJECTED:2 | UNSUPPORTED_ENEMY |
| MON_NATLAN_SAURIAN_CHARGE | 뿔룡 | 나타 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_NATLAN_SAURIAN_FLIGHT | 깃룡 | 나타 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_NATLAN_SAURIAN_SPIRIT | 명룡 | 나타 | 2 | 2 | 0 | READY_ENTRY_REJECTED:2 | UNSUPPORTED_ENEMY |
| MON_NODKRAI_ABYSS | 노드크라이 심연 변이체 | 노드크라이 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_NODKRAI_AUTOMATON | 노드크라이 자동기계 | 노드크라이 | 1 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1 | 현재 그룹/멤버 참조 없음 |
| MON_NODKRAI_BEAST | 노드크라이 야생 마수 | 노드크라이 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_OPERATIVE_FROST | 우인단·서리 심부름꾼 | 폰타인/다수 지역 | 2 | 2 | 0 | READY_ENTRY_REJECTED:2 | UNSUPPORTED_ENEMY |
| MON_OPERATIVE_WIND | 우인단·바람 심부름꾼 | 폰타인/다수 지역 | 2 | 2 | 0 | READY_ENTRY_REJECTED:2 | UNSUPPORTED_ENEMY |
| MON_PRIMAL_CONSTRUCT | 태고의 구조체 | 수메르 사막 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_RIFTHOUND | 수계 사냥개 | 다수 지역 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_RIFT_HOUND_ELECTRO | 기뢰·수계(獸界) 사냥개 | 다수 지역 | 2 | 2 | 0 | READY_ENTRY_REJECTED:2 | UNSUPPORTED_ENEMY |
| MON_RIFT_HOUND_GEO | 기암·수계(獸界) 사냥개 | 다수 지역 | 2 | 2 | 0 | READY_ENTRY_REJECTED:2 | UNSUPPORTED_ENEMY |
| MON_RIFT_WHELP_ELECTRO | 기뢰·수계(獸界) 유견 | 다수 지역 | 2 | 2 | 0 | READY_ENTRY_REJECTED:2 | UNSUPPORTED_ENEMY |
| MON_RIFT_WHELP_GEO | 기암·수계(獸界) 유견 | 다수 지역 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_RUIN_CRUISER | 유적 순찰자 | 이나즈마/다수 지역 | 1 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1 | 현재 그룹/멤버 참조 없음 |
| MON_RUIN_DEFENDER | 유적 방어자 | 이나즈마/다수 지역 | 1 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1 | 현재 그룹/멤버 참조 없음 |
| MON_RUIN_DESTROYER | 유적 섬멸자 | 이나즈마/다수 지역 | 1 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1 | 현재 그룹/멤버 참조 없음 |
| MON_RUIN_DRAKE_GROUND | 유적 드레이크·대지의 수호자 | 수메르/다수 지역 | 2 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1, PASSIVE_UNSUPPORTED:1 | 현재 그룹/멤버 참조 없음 |
| MON_RUIN_DRAKE_SKY | 유적 드레이크·천공의 수호자 | 수메르/다수 지역 | 2 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1, PASSIVE_UNSUPPORTED:1 | 현재 그룹/멤버 참조 없음 |
| MON_RUIN_GUARD | 유적 가디언 | 다수 지역 | 2 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_RUIN_HUNTER | 유적 헌터 | 다수 지역 | 2 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_RUIN_SCOUT | 유적 정찰자 | 이나즈마/다수 지역 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_SAMACHURL_DENDRO | 풀 츄츄 샤먼 | 다수 지역 | 1 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1 | 현재 그룹/멤버 참조 없음 |
| MON_SAMACHURL_ELECTRO | 번개 츄츄 샤먼 | 다수 지역 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_SAMACHURL_GEO | 바위 츄츄 샤먼 | 다수 지역 | 1 | 1 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:1 | 현재 그룹/멤버 참조 없음 |
| MON_SECRET_SOURCE_HEAVY | 비밀근원 장치·중장형 | 나타 | 1 | 0 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_SECRET_SOURCE_SCOUT | 비밀근원 장치·정찰형 | 나타 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_SNEZ_BEAVER_LIAISON | 비버 요정 연락병 | 스네즈나야 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_SNEZ_CHIMERA_BURROW | 땅굴 키메라 | 스네즈나야 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_SNEZ_CHIMERA_CARAPACE | 갑각 키메라 | 스네즈나야 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_SNEZ_CHIMERA_ELEPHANT | 코끼리 키메라 | 스네즈나야 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_SNEZ_CHIMERA_HORNBEAR | 뿔곰 키메라 | 스네즈나야 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_SNEZ_LIONDOG_GUARD | 사자개 호위병 | 스네즈나야 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_SNEZ_SNOW_GUARD_KNIGHT | 눈의 수호기사 | 스네즈나야 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_SNEZ_TREE_FAIRY_OLD | 고목 요정 | 스네즈나야 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_SNEZ_TREE_FAIRY_SAPLING | 묘목 요정 | 스네즈나야 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_SNEZ_WOLF_TRACKER | 늑대 추적자 | 스네즈나야 | 1 | 1 | 0 | READY_ENTRY_REJECTED:1 | UNSUPPORTED_ENEMY |
| MON_WHOPPERFLOWER | 구라구라꽃 | 다수 지역 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
| MON_WHOPPER_ELECTRO | 전기 구라구라꽃 | 다수 지역 | 2 | 2 | 0 | UNSUPPORTED_NOT_CURRENT_AI_REF:2 | 현재 그룹/멤버 참조 없음 |
