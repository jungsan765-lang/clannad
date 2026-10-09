# 0.16.19 회복 요리 재료·회복 효율 점검

제품·DB는 수정하지 않았다. 회복45종, 버프61종, 사용금지2종을 따로 집계했고, 부활 음식은 현재 실제 런타임에 없다. 전수 재료/판매/가공/필드 경로는 `catalog_v01619.json.gz`에 기록했다.

## 사용자가 지적한 문제는 재현된다

0.16.17은 회복량을 유지한 채 제조비를2~4모라로만 나눴다. 0.16.18은 직접 모아야 하는 재료 판매를 막았지만 회복량은 바꾸지 않았다. 모든 레벨에 같은 수급 불균형이 남는다.

아래는 Lv.60 고정4인 여행자+엠버+케이아+리사, +6 합법 장비/중간 특성, 재료·음식 재고0, 각기50% 부상, 시드717/4242 평균이다.4인분을 실제 준비하고 한 번씩만 식사했다. 즉, 숙박과 같은 완전회복량 비교가 아니다. 준비 시간은 실제 LIFE 장면 완전입력/초기 레시피·낚싯대 구입/이동·조우·가공·조리·식사·원위치 복귀를 포함하는 모델이다.

| 음식 | 기본HP | 첫 준비 평균 | 채집/사냥/낚시 횟수 | 반복 조달현금(4인분) | 최초 레시피 / 도구 |
|---|---:|---:|---|---:|---|
| 티바트 달걀 프라이 | 90 | 52.2초 | 2 / 1 | 16 | 0 / 0 |
| 몬드 감자전 | 220 | 236.6초 | 15 / 9 | 72 | 0 / 0 |
| 버섯고기말이 | 240 | 280.7초 | 18 / 23 | 8 | 0 / 0 |
| 채식 전복 | 170 | 384.1초 | 26 / 23 | 8 | 450 / 0 |
| 삶은 검정 농어 | 260 | 496.4초 | 10 / 11 | 100 | 900 / 120 |

채식 전복은 달걀보다 준비시간7.4배인데 회복은1.89배다. 버섯고기말이보다 준비시간37% 더 들고 회복은29% 적다. 삶은 검정 농어는 버섯고기말이보다 준비시간77% 더 들고 반복현금92모라가 더 드는데 회복은8.3%만 높다.

같은 생선2개를 쓰는 비교에서는 생선볶음면170보다 몬드 생선구이100+흘호어구이100=200이 더 회복된다. 두 구이는 서로 다른 음식으로 실제 연속식사 제한에 걸리지 않는다. 볶음면은 추가 금어초2개와 쌀2개를 요구한다.

## 범위와 한계

52조건에서 native 재료 활동662회, 조우109회, 준비 도중 전투실패4회였다. 레벨업 치유는0회였다. Lv.10 감자전1조건, Lv.30 채식전복1조건/검정농어2조건에서 전멸했다. 준비를 완료해도 Lv.20 감자전1조건에서는2명, Lv.40 검정농어2조건에서는1명씩 전투불능이라 일반 음식으로 회복할 수 없었다.

몬드Lv10/20, 리월Lv30 이상을 따로 시험했지만 기존 도구가 이야기 지역 해금·장 완료를 명시적으로 설정한다. 따라서 이 자료는 이미 해금한 계정의 해당 파티 레벨에서의 준비 부담이지, 그 레벨의 신규 계정이 모든 장소를 먼저 열 수 있다는 증거가 아니다. 완전장면 입력·초기자금/장비/동료는 합성 셋업이며, 동작·전투·수량·지불·HP는 런타임 그대로다.

첫 준비와 반복 준비를 구분했다. 검정농어는 첫 낚싯대120모라와 레시피900모라가 있다. 반복4인분100모라는 소금60+미끼32+조리8이다. 첫 준비시간에서 단순히 구입시간을 빼 반복시간이라고 하지 않는다. 재고를 이미 소지한 현장 식사 자체는3초 입력 모델+native 세계시간10분이며 수급·가공·요리의 왕복 시간을 포함하지 않는다.

## 수치 수정 방향

새알90/스테이크110처럼 기초식은 유지하고, 희귀 재료2종·가공 다중·낚시/사냥 혼합 음식의 단일식사 이점을 키운다. 최고 원액430~445면 대표4인의 보통 식사는 대체로50~80% 최대HP 범위에 들어가지만 HP특화 장비/5성에서 비율이 달라진다. 바바라 특수요리는 같은 재료지만 기존1.1배이므로 보통식 기준과 구분한다. 구체적인45종별 범위표는 `RECIPE_AUDIT_AND_CANDIDATES_KO.md`와 `recommended_ranges_v01620.json.gz`에 있다. 이 표는 논의 후보이며 제품 적용·확정 균형은 아니다.

전량구매 황금 새우볼327모라/인분과 일부 차잎음식은 HP 원액만 올려 숙박보다 저렴하게 만들기 어렵다. 현장 편의성과 구매 재료현금이 역할이다. 이를 직접모은 음식의2모라 제조비와 같이 취급해 모든 음식이 모라 이득이라고 결론내면 안 된다.

현재 회복음식 중 수급불가 미래 재료는 호밀빵의호밀, 베리아이스크림의얼음별열매 두 개다. 이 둘은 미래 수급 난이도를 지어내지 않고 현 회복량을 유지하는 편이 적절하다. 소시지/메도빅/자르코예는 몬드에서 현 수급 가능하다. 무 수프의흰무는 현재 몬드 채집원이 없고 리월에만 있다. 이전 몬드 쉬운메뉴 분류를 재사용하면 안 된다.

## 모든 음식 분류

| 음식 | 종류 | 현재 기본HP / 상태 | 현재 재료 수급 불가 |
|---|---|---|---|
| 간이 회복식(시스템) | LEGACY_DISABLED | 사용금지 | SYS_INGREDIENT_COMMON |
| 파티 식사(시스템) | LEGACY_DISABLED | 사용금지 | SYS_INGREDIENT_COMMON |
| 티바트 달걀 프라이 | RECOVERY | 90 | 없음 |
| 달콤달콤 닭고기 스튜 | RECOVERY | 180 | 없음 |
| 몬드 감자전 | RECOVERY | 220 | 없음 |
| 버섯고기말이 | RECOVERY | 240 | 없음 |
| 세계 평화 | RECOVERY | 160 | 없음 |
| 비옥야채쌈 | BUFF | STATUS_FOOD_ATK | 없음 |
| 선도장 | BUFF | STATUS_FOOD_FEAST | 없음 |
| 버섯피자 | RECOVERY | 130 | 없음 |
| 벚꽃 모찌 | RECOVERY | 170 | 없음 |
| 타친 | RECOVERY | 145 | 없음 |
| 수정 소라 케이크 | BUFF | STATUS_FOOD_DEF | 없음 |
| 화염 스튜 | BUFF | STATUS_FOOD_ATK | 없음 |
| 글루포프 호밀빵 | RECOVERY | 200 | ING_RYE |
| 대패 생선회 | BUFF | STATUS_FOOD_ATK | 없음 |
| 베리 아이스크림 | RECOVERY | 200 | ING_ICE_STAR_FRUIT |
| 설원 위 눈덩이꽃 | BUFF | STATUS_FOOD_ATK | ING_SNOWBALL_FLOWER |
| 설국 냉수프 | BUFF | STATUS_FOOD_DEF | ING_SNOWBALL_FLOWER |
| 옛뜰 훈제 소시지 | RECOVERY | 120 | 없음 |
| 보르시 | BUFF | STATUS_FOOD_RESIST | ING_RED_BEET |
| 메도빅 | RECOVERY | 220 | 없음 |
| 자르코예 | RECOVERY | 260 | 없음 |
| 스네즈나야 꼬치구이 | BUFF | STATUS_FOOD_SPEED | ING_RED_BEET |
| 스테이크 | RECOVERY | 110 | 없음 |
| 버섯 닭꼬치 | RECOVERY | 100 | 없음 |
| 몬드 생선구이 | RECOVERY | 100 | 없음 |
| 무 수프 | RECOVERY | 90 | 없음 |
| 민트 젤리 | RECOVERY | 90 | 없음 |
| 크림 스튜 | BUFF | STATUS_FOOD_SPEED | 없음 |
| 장원 팬케이크 | RECOVERY | 170 | 없음 |
| 만족 샐러드 | BUFF | STATUS_FOOD_CRIT | 없음 |
| 어부 토스트 | BUFF | STATUS_FOOD_DEF | 없음 |
| 북극 훈제 닭 | BUFF | STATUS_FOOD_SPEED | 없음 |
| 불꽃 미트 스파게티 | RECOVERY | 180 | 없음 |
| 바람신의 잡채 | BUFF | STATUS_FOOD_SPEED | 없음 |
| 허니캐럿그릴 | BUFF | STATUS_FOOD_SPEED | 없음 |
| 냉채수육 | BUFF | STATUS_FOOD_ATK | 없음 |
| 북극 사과고기찜 | RECOVERY | 240 | 없음 |
| 모험가 계란빵 | BUFF | STATUS_FOOD_ATK | 없음 |
| 바삭바삭 치킨버거 | RECOVERY | 250 | 없음 |
| 달빛 파이 | BUFF | STATUS_FOOD_DEF | 없음 |
| 황금 크리스피 치킨 | BUFF | STATUS_FOOD_FEAST | 없음 |
| 모라육 | RECOVERY | 100 | 없음 |
| 고기볶음 | RECOVERY | 110 | 없음 |
| 연밥 계란찜 | BUFF | STATUS_FOOD_SPEED | 없음 |
| 행인두부 | BUFF | STATUS_FOOD_ATK | 없음 |
| 무완자 튀김 | BUFF | STATUS_FOOD_ATK | 없음 |
| 절운고추 치킨 | BUFF | STATUS_FOOD_CRIT | 없음 |
| 민트냉채 | BUFF | STATUS_FOOD_ATK | 없음 |
| 수정 새우딤섬 | RECOVERY | 190 | 없음 |
| 산미 울면 | BUFF | STATUS_FOOD_SPEED | 없음 |
| 진주비취백옥탕 | BUFF | STATUS_FOOD_DEF | 없음 |
| 채식 전복 | RECOVERY | 170 | 없음 |
| 경책 가정식 | BUFF | STATUS_FOOD_ATK | 없음 |
| 연꽃 파이 | BUFF | STATUS_FOOD_DEF | 없음 |
| 탕수어 | RECOVERY | 250 | 없음 |
| 황금 새우볼 | RECOVERY | 240 | 없음 |
| 죽순 수프 | RECOVERY | 240 | 없음 |
| 고기죽순데침 | BUFF | STATUS_FOOD_DEF | 없음 |
| 흥얼채 | BUFF | STATUS_FOOD_ATK | 없음 |
| 중원 내장꼬치 | BUFF | STATUS_FOOD_SPEED | 없음 |
| 용수면 | BUFF | STATUS_FOOD_ATK | 없음 |
| 민트 고기말이 | BUFF | STATUS_FOOD_SPEED | 없음 |
| 삶은 검정 농어 | RECOVERY | 260 | 없음 |
| 골든크랩 | BUFF | STATUS_FOOD_DEF | 없음 |
| 천추육 | BUFF | STATUS_FOOD_FEAST | 없음 |
| 통통 연꽃 해산물 수프 | BUFF | STATUS_FOOD_DEF | 없음 |
| 버터 송이구이 | BUFF | STATUS_FOOD_ATK | 없음 |
| 높이 쌓기 | BUFF | STATUS_FOOD_CRIT | 없음 |
| 꽃게알 야채찜 | RECOVERY | 230 | 없음 |
| 뜨끈 야채 스튜 | BUFF | STATUS_FOOD_RESIST | ING_CHILLED_MEAT |
| 버터 생선 구이 | BUFF | STATUS_FOOD_DEF | 없음 |
| 바삭 쉬림프 카나페 | RECOVERY | 230 | 없음 |
| 촉촉 으깬 감자 | BUFF | STATUS_FOOD_ATK | 없음 |
| 흘호어 구이 | RECOVERY | 100 | 없음 |
| 쌀 찐빵 | RECOVERY | 100 | 없음 |
| 절운 누룽지 | BUFF | STATUS_FOOD_ATK | 없음 |
| 청심 전병 | BUFF | STATUS_FOOD_SPEED | 없음 |
| 매운 고기 찐빵 | BUFF | STATUS_FOOD_DEF | 없음 |
| 차와 보름달 | RECOVERY | 240 | 없음 |
| 옥무늬 찻잎 달걀 | RECOVERY | 90 | 없음 |
| 차향 훈제 비둘기 | RECOVERY | 180 | 없음 |
| 고화 어양선 | BUFF | STATUS_FOOD_DEF | 없음 |
| 침옥 차 이슬 | RECOVERY | 90 | 없음 |
| 선잎 파이 | BUFF | STATUS_FOOD_FEAST | 없음 |
| 꽃게알 두부 | RECOVERY | 170 | 없음 |
| 명월 딤섬 | RECOVERY | 230 | 없음 |
| 훈제고기 볶음 | BUFF | STATUS_FOOD_CRIT | 없음 |
| 생선 볶음면 | RECOVERY | 170 | 없음 |
| 바위항 지삼선 | BUFF | STATUS_FOOD_CRIT | 없음 |
| 새우살 볶음 | BUFF | STATUS_FOOD_DEF | 없음 |
| 꼬꼬 연두부 | BUFF | STATUS_FOOD_FEAST | 없음 |
| 문심 두부 | BUFF | STATUS_FOOD_SPEED | 없음 |
| 풍요로운 한 해 | BUFF | STATUS_FOOD_FEAST | 없음 |
| 금옥만당 | BUFF | STATUS_FOOD_DEF | 없음 |
| 번현급관 | BUFF | STATUS_FOOD_CRIT | 없음 |
| 만족의 기쁨 | RECOVERY | 230 | 없음 |
| 내 집 같은 편안함 | BUFF | STATUS_FOOD_DEF | 없음 |
| 팔보 복 오리 | BUFF | STATUS_FOOD_DEF | 없음 |
| 유폭쌍취 | BUFF | STATUS_FOOD_CRIT | 없음 |
| 홍소 고기 완자 | BUFF | STATUS_FOOD_ATK | 없음 |
| 꿀 차사오 | RECOVERY | 90 | 없음 |
| 눈에 취한 매화 | BUFF | STATUS_FOOD_DEF | 없음 |
| 풍요 백설기 | RECOVERY | 270 | 없음 |
| 춘권 | BUFF | STATUS_FOOD_DEF | 없음 |
| 빛나는 냉옥 | RECOVERY | 170 | 없음 |
| 냥더우푸 | BUFF | STATUS_FOOD_SPEED | 없음 |

원자료: `native_preparation_v01619.json.gz`의 실제 영수증·장면입력·전투결과와 `native_preparation_summary_v01619.json.gz`, 수치 재분류는 `findings_v01619.json.gz`. 모든수급시간은 추정입력시간을 포함한 모델이며 실제 사용자 벽시계 관찰이라고 하지 않는다.
