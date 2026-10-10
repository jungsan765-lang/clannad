# 공략 기반 추가 점검 원자료

제품은 0.16.22 그대로이며 수치를 변경하지 않은 추가 점검이다. 먼저 [판정과 목표](../../FIELD_BOSS_MANUAL_TARGET_KO.md)를 읽는다. field_rarity의 최초 12조건과 추가 6조건, daily_first_access의 8조건은 별도로 보존한다. 최초 MANIFEST와 실행기 원문은 수정하지 않았다.

사용자의 마지막 기준은 **일일보스가 필드보스보다 더 많은 공략을 요구하고, 동레벨 4성 풀돌·5성 명함도 공략을 수행해야 승리해야 한다**는 것이다. 현재 수급 가능성이나 단계 전환 로그를 그 목표의 달성으로 보지 않는다. 필드 +3/+6과 일일 +10은 강화도가 달라 라운드만으로 직접 비교하지 않는다.

후속 field_daily_hierarchy는 같은 +10 장비 기준의 필드 2조건으로, 앞선 26조건과 합쳐 완료 전투는 28조건이다. 장소 진입 단계를 누락해 전투 전에 차단된 최초 2건은 field_daily_hierarchy_entry_required_attempt에 별도로 보존한다. 원자료 제목의 0.16.23은 작업명이며, 이 기준선이 실행한 제품 소스는 0.16.22다. 로컬 검사 DB 입력은 운영 authored DB 전체 원문과 같다고 보장하지 않는다. 입력 SHA로 그 경계를 확인한다.

원래실행기에는검사작업폴더의상대경로가있다. rerun_field/rerun_manual은ROOT경로만현재저장소위치로바꾼복사본이다. rerun_daily는ROOT·출력경로·동일helper스냅샷위치만바꾼복사본이다. 이는새실전실행결과가아니며현재제품의입력과보존한준비물조건을함께확인한다. 기존증거폴더를출력대상으로사용하지않는다.

```bash
node docs/data/boss_manual_target_review_v01622/rerun_field.cjs docs/data/boss_manual_target_review_v01622/field_rarity/electro_four_cases.json /tmp/crpg-boss-electro-review.json 80
node docs/data/boss_manual_target_review_v01622/rerun_field.cjs docs/data/boss_manual_target_review_v01622/field_rarity/rarity_eight_cases.json /tmp/crpg-boss-rarity-review.json 80
node docs/data/boss_manual_target_review_v01622/rerun_manual.cjs docs/data/boss_manual_target_review_v01622/field_rarity/manual_six_cases.json /tmp/crpg-boss-manual-review.json 80
node docs/data/boss_manual_target_review_v01622/rerun_daily.cjs /tmp/crpg-daily-review
node docs/data/boss_manual_target_review_v01622/rerun_hierarchy.cjs /tmp/crpg-field-daily-hierarchy-review
```

원소면역이있는편성과특성65%조건의필드반례를최적파티의승률로확대하지않는다. 일일은특성기본상한·+10·무성유물이며선행클리어준비기록이있다. 자연계정의최초보스도전·소유·강화·모라획득완주는미검증이다. raw저장의패배·입력한도·수동정책실패를별도로읽는다.

rerun_hierarchy도 ROOT·출력·동일 helper 위치만 바꾼 복사본이다. 이 경로 수정에 따른 추가 전투 실행을 주장하지 않는다. 필드2조건의 원래 실행기는 audit_field_daily_hierarchy.cjs에 보존했다.
