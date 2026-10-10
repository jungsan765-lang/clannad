# 돌파 강화 +12 저레벨 추가 검증

원본192조건의 저레벨 장비는 **기본 강화 상한 +10**이었다. 제품에는 장비 돌파 후 +12가 있으므로 이를 최고 강화라고 부른 표현을 정정하고 최고 강화 조건을 따로 확인했다. 제품 수치·캐릭터·반응·공략·보상 변경은 없다.

**후속 공개 후열 배치에서 Lv35 +12 → 뱀56은2/3 승리했다.** 아래 기본 배치18전멸만 보고 모든 최고 투자 편성이 막힌다고 결론내리지 않는다. Lv25는 후열에서도 바위 용48·뱀56 모두 실패했다.

## 실제 준비

4인 고정: 종려·다이루크·진 C0 + 주인공 C0. Lv25→바위 용은 바위 여행자, 뱀은 이세계인이다. 합법 레벨/돌파/기본 특성 상한, 공개 지원·공격 역할과 진형을 썼다. 계정이 이미 얻은 장비 전승을 허용하여 착용 가능한 각 분류에서 ATK+DEF+HP×0.15 점수가 큰 장비를 고르고 **장비 돌파 한도12/강화12**를 지급한 뒤 공개 EQUIP을 했다. 각자 자연 성유물60회 추첨에서 하나 선택해 +5. 비용과 획득 시간을 생략한 강한 계정 진단이며 최적 장비 조합 전체를 탐색했다는 뜻은 아니다. 음식과 전투 중 임의 회복·동료 강제 조작은 없다.

장비 준비가 불법 상태가 되지 않도록 **native validateSave를 통과한 실제 저장**과 모든 장비/성유물·특성·초기 배우 HP/ATK/DEF를 남겼다. 관리자 revision0/빈 수정, 적 HP/공격/난수/명중 무변경이다. 각 보스의 새 스펙과 marker1을 독립 숫자로 검사한 후 실제 공개 입장·전투·끝나기 전 HP 피해/보호막 소모/회복/KO를 측정했다.

| 편성 → 적 | 반복/공략 각3seed | 실제 결과 |
|---|---|---|
| Lv25 +12 → 바위 용48 |0/3 · 0/3|19–33R 전멸, 전원KO|
| Lv25 +12 → 유적의 뱀56 |0/3 · 0/3|26–32R 전멸, 전원KO|
| Lv35 +12 → 유적의 뱀56 |0/3 · 0/3|56–84R 전멸, 전원KO|

**18조건 전부 실제 패배, 엔진 오류0·입력 한도0**이다. 원본192를 다시 돌린 것이 아니며 최고 강화로 저레벨 격차를 건너뛰는지 보완한18개다. 같은 레벨 최고 투자 편성이 모든 필드에서 어렵다는 증거로 넓히지 않는다.

`raw_18_rows.json.gz`는 전체 원시 기록, `summary.json`은 초기 배우·장비·특성과 피해/회복/전투결과다. 초기 +12 도구가 기존 장비 한도를10으로 다시 정규화한 잘못된 준비6개는 `invalid_setup_attempt.json.gz`에 별도 보존했다. 이는 전투 입장 전 저장 검증 오류여서 패배18개에 포함하지 않는다. 도구의 +12 준비만 수정했고 +10 이하 준비와 제품은 바꾸지 않았다.

## 재현

저장한 runner.cjs를 쓰거나 같은 tools/audit_field_balance_v01627.cjs를 실행한다. 각 블록은 별도 output으로 순차 실행하며 seed717/19/43이 실제 전투에 쓰인다.

```sh
FIELD_INPUT_ROOT="$PWD" node --max-old-space-size=384 --expose-gc docs/data/balance_v01627/field/maximum12/runner.cjs --out reports/max12_lv25_primo --bosses FB_PRIMO_GEOVISHAP --investments FIVE_C0 --seeds 717,19,43 --policies REPEAT,MANUAL --talent 10 --prepared yes --enhance 12 --best-gear yes --art 60 --level 25
FIELD_INPUT_ROOT="$PWD" node --max-old-space-size=384 --expose-gc docs/data/balance_v01627/field/maximum12/runner.cjs --out reports/max12_lv25_serpent --bosses FB_RUIN_SERPENT --investments FIVE_C0 --seeds 717,19,43 --policies REPEAT,MANUAL --talent 10 --prepared yes --enhance 12 --best-gear yes --art 60 --level 25
FIELD_INPUT_ROOT="$PWD" node --max-old-space-size=384 --expose-gc docs/data/balance_v01627/field/maximum12/runner.cjs --out reports/max12_lv35_serpent --bosses FB_RUIN_SERPENT --investments FIVE_C0 --seeds 717,19,43 --policies REPEAT,MANUAL --talent 10 --prepared yes --enhance 12 --best-gear yes --art 60 --level 35
```


## 전열 종려 / 주인공 후열 반례 점검

위18개는 기존 +10과 같은 기본 배치(주인공→종려→다이루크→진)다. 이를 최적 편성 전체라고 결론내리지 않도록 **종려→다이루크→진→주인공** 공개 배치로 수동9개를 추가했다. 동일 seed·장비 객체 전체·성유물·기본 특성·명함이 각 원본과 정확히 일치하며 배치만 바뀐다. native 준비 저장 검증도 다시 통과했다. 배치에 따른 전투 배우의 자리 보너스·대상 선택 차이는 제품의 실제 효과다.

| 전열 종려 / 주인공 후열 | 3seed 공략 | 결과 |
|---|---|---|
| Lv25 +12 → 바위 용48 |0/3|15/16/24R 전멸|
| Lv25 +12 → 뱀56 |0/3|26/20/24R 전멸|
| Lv35 +12 → 뱀56 |**2/3 승리**|717:37R·HP51.3%·KO1, 19:50R 전멸, 43:40R·HP38.2%·KO1|

따라서 **Lv35 최고 강화 편성이 유적의 뱀56을 못 깬다는 일반 결론은 틀리다.** 후열에서 실제37/40회 공략 입력과 보호막·회복을 유지하면 2조건 승리했다. 저레벨 배치 반례를 숨기거나 어려움을 보장하는 숫자 문턱을 추가하지 않았다. Lv25의 큰 격차는 이 공개 배치에서도 막혔다. Lv35 성공도 적정 편성·전승 장비·강화 비용을 지급한 진단이고, 반복 입력 정책까지 같은 결과라는 증거는 아니다. 최적 전략 전체·전 조합 불가능성을 증명한 것이 아니다.

추가9개는 2승·7전멸, 엔진 오류/입력 한도0이다. `rear_manual_9_rows.json.gz`에 전체 전투 원자료, `rear_summary.json`에 원본 +12 수동과 준비 동일성·배치별 결과·실제 피해/회복을 남겼다. 기존18과 합계27개를 모두 최고 강화 보완 검사라고 부르되, **18개의 기본 배치 결과와9개의 후열 결과를 구분**해야 한다.
