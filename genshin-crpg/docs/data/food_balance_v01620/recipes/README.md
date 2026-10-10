# 요리 재료·준비·식사 비교 증거

제품·DB는 이 증거 수집자가 수정하지 않았다. 0.16.19의 요리45종과 버프61종, 사용금지2종을 전수 분류했다. 원액 수정의 승인값은 상위 `approved_policy_v01620.json`이며 최초 논의 후보표와 구분한다.

- `catalog_v01619.json.gz`: 수정 전108종의 재료·필드·상점·가공·해금·현재 수급불가 경로. 당시 원자료이며 원자료의 절대 경로는 출처 기록이다.
- `native_preparation_v01619.json.gz`: 수정 전52조건, 실제 LIFE 입력/영수증/전투/가공/조리/식사/복귀 원자료.
- `findings_v01619.json.gz`: 초기 비용과 반복 비용, 요청 회복과 실제 회복을 분리한 수정 전 결과.
- `portable_baseline_replay_check.json`: 명시 복원한 before 스냅샷에서26조건을 재실행해 실제 수급/입력/시간/영수증/HP/난수가 원자료와 완전히 같음을 확인했다.
- `recommended_ranges_v01620.json.gz`, `RECIPE_AUDIT_AND_CANDIDATES_KO.md`: 결정 전 후보 기록. 승인 적용값이 아니다.
- `audit_recipe_catalog.cjs`: 전수 경로와 권위 있는 `foodSpec(...NORMAL).heal`을 추출한다. `rawHealing`은 원본 표 수치이고 `effectiveHealing`은 실제 사용 수치라 서로 구분한다.
- `audit_native_preparation.cjs`: 같은52조건의 native 준비 캠페인. 기본 시드는717/4242, 몬드 Lv10·20·30·40·50·60, 리월 Lv30·40·50·60이다.
- `compare_preparation.py`: 두52조건의 식사 전 HP·원재료·구매·가공·드롭을 엄격히 비교하고 요청/실제 회복과 잔여 부상을 분리한다.
- `audit_shared_fish_meals.cjs`: 같은 생선2개/인분을 사용하는 생선볶음면1회와 몬드/흘호어 구이2회의 실제 CRAFT/MEAL 비교. 다른 부재료와 식사 횟수 차이를 유지하며 완전히 같은 원재료 묶음이라고 하지 않는다.
- `original_*.txt.gz`: 최초 조사 도구의 원문이며 실행용 도구가 아니다. 저장 당시 해시를 해석할 원문으로 보존했다.

## 재실행

저장소 루트에서 실행한다. before는 상위 스냅샷 복원 도구로 만든 디렉터리를 명시해야 한다. 현재 소스를 before라고 부르지 않는다. 출력은 임의 빈 임시 디렉터리에 둘 수 있다.

```bash
node docs/data/food_balance_v01620/recipes/audit_recipe_catalog.cjs --source-root /path/to/restored-before --out-dir /tmp/food-recipes-before
node docs/data/food_balance_v01620/recipes/audit_native_preparation.cjs --source-root /path/to/restored-before --out-dir /tmp/food-prep-before
node docs/data/food_balance_v01620/recipes/audit_native_preparation.cjs --out-dir /tmp/food-prep-after
python docs/data/food_balance_v01620/recipes/compare_preparation.py --before /tmp/food-prep-before/native_preparation.json.gz --after /tmp/food-prep-after/native_preparation.json.gz --out /tmp/food-prep-comparison.json
node docs/data/food_balance_v01620/recipes/audit_shared_fish_meals.cjs --source-root /path/to/restored-before --out /tmp/food-shared-before.json
node docs/data/food_balance_v01620/recipes/audit_shared_fish_meals.cjs --out /tmp/food-shared-after.json
```

제품 도구 `tools/audit_food_lodging_v01617.cjs`, `tools/audit_food_supply_v01617.cjs`를 재사용하되 VM은 `--source-root`의 source·DB를 실제로 읽는다. 이전 snapshot에 도구가 없어도 현재 저장소의 동일 native 준비 도구를 사용할 수 있으며 로드한 모든 런타임과 도구 해시를 함께 기록한다.

## 해석 제한

재료별 `separateTargetExpectedActivities`는 독립적인 목표 재료의 기대 행동을 더한 보조값이다. 공동 채집 때문에 엄밀한 하한이나 실제 준비 시간이 아니다. 실제 준비 부담은 native 캠페인의 장면·이동·전투·가공·조리를 읽는다.

52조건은4인분을 준비하고 살아서 부상한 대상에게 각각 음식1개씩 준다. 완전회복 숙박과 같은 HP 종점이 아니므로 음식4개 현금과 숙박비만 비교해 모든 음식이 더 싸다고 하지 않는다. 첫 낚싯대/레시피는 반복 조달 비용과 분리한다. 준비 도중 전투불능은 일반 음식으로 부활하지 않는다. 더 큰 요청 회복이 작은 상처에서 같은 실제 회복으로 보이는 것은 최대HP의 정상 상한이다.

이야기 해금·파티·장비·초기자금·최초50% 부상은 명시한 합성 셋업이다. 이후 실제 입력·지불·드롭·전투·세계시간·HP를 그대로 유지한다. 지역 진입을 처음 달성하는 과정이나 계정 소유권 확보 시간은 모의하지 않았다. 미리 소지한 음식의 현장 식사는 원재료 수급/가공/조리 왕복과 구분한다. 시간은 완전 장면입력과3초 메뉴입력 모델이며 실제 사용자의 벽시계 관찰이 아니다.
