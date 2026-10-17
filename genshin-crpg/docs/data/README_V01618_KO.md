# 0.16.18 검증 자료 읽는 순서

1. `release_v01618_checks.json`: 통합 검사·최종 재실행·빌드·소스 보존·한계.
2. `monster_immunity_v01618.json`, `monster_fieldboss_v01618.json`, `monster_control_v01618.json`: 확정 전투 오류의 변경과 실제 회귀 근거.
3. `shop_summary.json`와 `shop_catalog_v01618.json`: 실제16재료31판매행과17정책항목을 구분. 구매/가공 폐쇄, 새 공급불가0, 완성 음식·수입 특산물 예외.
4. `shop_canon_v01618.json`: 원작의 실제 판매 근거. 원작 수량을 CRPG에 그대로 복제했다는 뜻은 아님.
5. `shop_native_supply_v01618.json`: 실제 수급·요리·식사·이동 조우. 음식45종·조건192표본·18캠페인.
6. `protagonist_endpoint_v01618.json`: 동일 숙박시설·완전HP 종점의 추가12캠페인72전. 원래 복귀 후 잔여피해 기록도 보존. `protagonist_support_v01618.json`: 같은 버그 수정 코드에서 이전/새 지원 계수112전, 연속72전, 실패와 성공시간을 분리한 집계.
7. `protagonist_native_v01618.json.gz`: 상세 단판·연속·초반 fixture 원본. Python의 `json.load(gzip.open(path,'rt',encoding='utf-8'))`로 읽는다. 일일 제한 보스의 반복 시제품은 비용 검증에서 제외했으며 합법 비경으로 대체했다.
8. `control_wrapper_review_*_v01618.json`: 독립 교차 검토에서 발견한 E 반격 사망 후 표식 잔존의 수정 전/후, 협동 시전자 구분 등5조건.
9. `tutorial_immunity_v01618.json`: 여행자 시드27·이동 조우 억제 fixture의 첫 이야기 실제 진행·네 수업과 Worker+SQLite 재시도/동행 회수. 평타20회 반복 가정을 실제 지시 수행으로 바로잡은 근거.
10. `monster_baseline_provenance_v01618.json`: 기준 원격SHA와 배포 엔진의64개 표 대조. 로컬 원시DB가 원격 작성용DB와 바이트까지 같다고 해석하지 않는다.

## 재현

저장소 `genshin-crpg` 폴더에서 실행한다. 비교용 소지품·레벨·편성·장비는 명시적 fixture다. 개인/적 수치를 임의 교체하거나 연속 캠페인 안에서 전투마다 체력·난수를 초기화하지 않는다. 단판은 명시된 조건·시드의 독립 새 여정이다.

```bash
node tests/test_element_immunity_v01618.cjs
node tools/test_field_boss_immunity_v01618.cjs /tmp/fieldboss-v01618.json
node tests/test_monster_control_fixes_v01618.cjs
node tests/test_shop_supply_v01618.cjs
node tests/test_protagonist_support_v01618.cjs
node tools/audit_protagonist_v01618.cjs --cases docs/data/protagonist_cases_v01618.json --seeds 717,4242 --out /tmp/support-final.json
node tools/audit_protagonist_v01618.cjs --cases docs/data/protagonist_cases_v01618.json --seeds 717,4242 --candidate '{"normal":20,"boss":12,"jointCoefficient":0.65}' --out /tmp/support-previous.json
node tools/audit_protagonist_v01618.cjs --cases docs/data/protagonist_repeat_cases_v01618.json --seeds 717 --runs 6 --final-recovery --out /tmp/support-repeat-final.json
node tools/audit_protagonist_v01618.cjs --cases docs/data/protagonist_repeat_cases_v01618.json --seeds 717 --runs 6 --final-recovery --candidate '{"normal":20,"boss":12,"jointCoefficient":0.65}' --out /tmp/support-repeat-previous.json
node tools/audit_protagonist_v01618.cjs --cases docs/data/protagonist_repeat_cases_v01618.json --seeds 717 --runs 6 --finish-at-inn --out /tmp/support-inn-final.json
node tools/audit_protagonist_v01618.cjs --cases docs/data/protagonist_repeat_cases_v01618.json --seeds 717 --runs 6 --finish-at-inn --candidate '{"normal":20,"boss":12,"jointCoefficient":0.65}' --out /tmp/support-inn-previous.json
```

버전별 지원 계수 비교를 원소 면역 수정 전후 비교로 바꾸지 않는다. 이득 없는 편성·패배·실제 숙박비를 숨기지 않는다. 2시드/대표5성1편성의 결과를 모든5성·미래캐릭터·시장가격의 안정성 증명으로 확대하지 않는다.
