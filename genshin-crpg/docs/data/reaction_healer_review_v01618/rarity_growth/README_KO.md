# 희귀도·성장·운명의 자리 검토 원자료

`REVIEW_KO.md`는 담당 에이전트의 최종 해석, `observation.json`은43명×8레벨의344능력치·43개C6 진단·공개해금258영수증·격리 진/다이루크C2 관찰, `sourcehash.json`은 주요12제품 파일의 전후 해시, `evidence_qa.json`은 독립 재계산 원본이다. 제품·DB233개 및 전체118런타임의 fingerprint도 기준과 일치했다.

현재 실제 지원43명은4성24명/5성19명이다. DB READY119명을 모두 현재 이용 가능한 캐릭터로 읽지 않는다. 미지원76명은 미래 정의 범위다. C6 진단은 Lv25·최소돌파2·기초특성4에서 공개 해금6번씩 실행했고 실제 특성 일반4/스킬7/폭발7이다. 원자료344행의HP·ATK·DEF·실효DEF를 독립 수식으로 다시 계산해 모두 일치했다.

여기에는 새 실전 캠페인 승패 표본이 없다. 정의된 효과22유형에 실행 분기가 있고 이름·설명·C3/5 배정이 존재한다는 점과 모든 조건/상호작용의 실제 전투 동작 검증을 구분한다. 진C2 갱신·만료와 다이루크C2 3중첩·정산은 native 훅에 넣은 격리 검사다. 일반 패배 정산 뒤 다음 전투에 상태가 남지 않는 것까지 관찰했으며 전투 승률이나 사용자 스크린샷의 정확 편성을 증명하지 않는다. 5성10%·돌파 비율은 작성 기본값·반올림·장비가 같은 이상화 공식과 실제 캐릭터 수치를 구분한다.

원 리뷰의 저장 예시와 달리 실제 스크립트가 수행한 검증은 `validateSave(clone(runtime.s))`다. 새 저장소 직렬화→역직렬화 roundtrip이나 획득 노가다 시간까지 검증했다고 읽지 않는다. 부모 최종 보고서는 이 독립 QA 제한을 함께 적용한다.

제품 루트는 스크립트 위치에서 찾으며 다른 체크아웃은 `CRPG_AUDIT_ROOT`로 지정한다. 아래 두 순서로 실행하고 동일한 임시 출력 폴더를 사용한다. 결과는 `CRPG_AUDIT_OUT` 또는 기본 임시 폴더에 쓴다. 원본과 복사본의 수치·fixture·훅은 같고 경로만 바뀌었다.

```bash
CRPG_AUDIT_OUT=/tmp/crpg-review-rarity node docs/data/reaction_healer_review_v01618/rarity_growth/observe.cjs
CRPG_AUDIT_OUT=/tmp/crpg-review-rarity node docs/data/reaction_healer_review_v01618/rarity_growth/supplement.cjs
```

원래 스크립트는 상위 `original_scripts/rarity_growth/`에gzip으로 보존했고 상위 manifest에 원본·복사본 SHA가 있다. 제품·서버 변경은 없으며 VM 후보 파일을 제품에 복사하거나 배포하지 않는다.
