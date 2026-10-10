# 무상의 얼음 반복 전투 원자료

이 묶음은 공개 0.16.18 그대로 실행한 실제 전투·HP 이월 검토다. 제품 변경이나 후보 치유 계수 치환은 없다. `native.json.gz`는 C0 기본 60개 고유 조건의 전체 로그, `summary.json.gz`·`conditions.csv`는 요약이다. `c6_native.json.gz`·`c6_summary.json.gz`·`c6_conditions.csv`는 **별도 C6 보충 12조건**이다. `c0_evidence_qa.json`·`c6_evidence_qa.json`은 입력 원문 해시까지 담은 독립 검증 원본이다.

| 분모 | 결과 |
|---|---|
| C0 60조건 | 142전 118승24패, 첫 전투 46/60승, 세 전투 연속 승리 36/60조건, 실행 오류0 |
| C6 보충 12조건 | 30전 24승6패, 첫 전투 12/12승, 회복형 6/6조건 세 전투 승리, 공격형 6/6조건 두 번째 전투 패배, 실행 오류0 |

C0와 C6는 대상 구성과 조건 수가 다르므로 하나의 평균 승률·숙박비로 합치지 않는다. 모든 파티는 여행자+동료3명이다. `FOUR_*`·`FIVE_*`는 동료의 4성·5성 등급을 뜻하며 인원 수가 아니다. 파티 Lv25·최소 돌파2·유물 없음·같은 제작 장비 강화+3/+6이고 C0 기본 특성2/4다. C6는 4성 공격형·회복형 두 구성에만 동료 운명의 자리6/여행자0을 저장한 별도 진단이다. 실제 동료 특성은 일반4/스킬7/폭발7, 여행자는4/4/4다. C6 직접 부활 발동은 없었다. 모든 5성·무기·유물 조합이나 사용자 계정의 성장 경로를 검증한 자료는 아니다.

첫 입장 때만 완전 회복하고 세 전투 사이에는 숙박·음식·강제 회복을 사용하지 않았다. 마지막 합법 귀환·숙박은 별도 기록한다. 패배로 회복에 실패한 C0 24조건/C6 6조건의 원시 숙박비0은 성공한 무료 회복으로 해석하지 않으며 `innMoraComparableAfterThreeWins=null`이다. 숙박비 비교 분모는 C0 세 전투 승리36조건, C6 회복형6조건이다. 여행 중 전투·회복이 최종 숙박비에 영향을 줄 수 있다.

행추 우렴검의 선행 회복 때문에 `applyDamage` 바깥의 HP 차이는 순손실일 수 있다. 최종 집계는 C0 11,605/C6 1,542개 피해 패킷을 같은 순서의 네이티브 피해 로그와 실제 피격 직전 HP에 대응해 바로잡았다. 옛 순손실도 별도 필드에 남겼다. C0 41/C6 11개 패킷이 정정됐고 소를 제외한 모든 HP 수지는0이다. 소의 종료시 최대HP8% 직접 자해는 일반 피해 파이프라인 밖 손실로 분리했으며 실제 합계48,460을 독립적으로 재구성했다. 보상 정산의 HP 차이도 전투 중 피해와 섞지 않는다.

냉기 핵4타 파괴는 C0 7회/C6 0회다. 핵 미완료 후 시간 초과로 실제 최대HP50% 부활한 사례는 C0 117회/C6 30회이며 재처치 승리를 핵 파괴로 세지 않는다. 표시 시간은 네이티브2배속 연출과 고정 입력 예산의 모형이며 브라우저 실측 시간이 아니다.

재현은 저장소 루트에서 아래처럼 실행한다. 제품 루트는 스크립트 위치로 찾고 다른 체크아웃은 `CRPG_AUDIT_ROOT`로 지정한다. 두 조건 생성 후 집계하므로 출력 폴더는 동일해야 한다. 원래 두 거대 개별 JSON은 저장소에 중복 보존하지 않았고 원본 크기·SHA는 상위 `MANIFEST.json`과 독립 QA에 남겼다. 압축 통합 로그에는 정정 계측 필드가 더해져 있으므로 원본 개별 JSON 바이트 복원용이 아니다. 새 전투에서 원본 계측을 다시 생성한 뒤 집계한다.

```bash
CRPG_AUDIT_OUT=/tmp/crpg-review-boss-repeat node docs/data/reaction_healer_review_v01618/field_boss_repeat/audit.cjs --enhance 3 --out /tmp/crpg-review-boss-repeat/e3.json
CRPG_AUDIT_OUT=/tmp/crpg-review-boss-repeat node docs/data/reaction_healer_review_v01618/field_boss_repeat/audit.cjs --enhance 6 --out /tmp/crpg-review-boss-repeat/e6.json
CRPG_AUDIT_DATA=/tmp/crpg-review-boss-repeat python docs/data/reaction_healer_review_v01618/field_boss_repeat/aggregate.py
CRPG_AUDIT_OUT=/tmp/crpg-review-boss-repeat node docs/data/reaction_healer_review_v01618/field_boss_repeat/audit_c6.cjs --enhance 3 --out /tmp/crpg-review-boss-repeat/c6_e3.json
CRPG_AUDIT_OUT=/tmp/crpg-review-boss-repeat node docs/data/reaction_healer_review_v01618/field_boss_repeat/audit_c6.cjs --enhance 6 --out /tmp/crpg-review-boss-repeat/c6_e6.json
CRPG_AUDIT_DATA=/tmp/crpg-review-boss-repeat python docs/data/reaction_healer_review_v01618/field_boss_repeat/aggregate_c6.py
```

복사본은 제품 루트·helper·입출력·집계용 원본 스크립트/fixture 위치만 바꿨고 수치·조건·계산식은 그대로다. 원래 스크립트는 상위 `original_scripts/field_boss_repeat/`에 gzip으로 남겼다. 제품 소스·DB233개는 기준 해시와 같다. 이 묶음에 VM 치유 후보 원문이 있지 않으며, 상위 자료에 있는 VM 후보를 제품에 복사하거나 배포하지 않는다.
