# 필드 보스 동작·성장식 독립 점검

최종 원자료는 `native_mechanics.json.gz`, 요약은 `summary.json`·`summary.md`, 독립 검증은 `evidence_qa.json`이다. 9종의 최종 능력치, 26개 고립 패턴, 9개 고립 회전, 동작 확인 11개를 조사했다. 최종 확인은 **11/11 통과**이며 이는 실제 전투의 11승이나 승률을 뜻하지 않는다.

`native_mechanics_initial_harness.json.gz`는 폐기된 초기 계측이다. 당시 10/11 통과였지만 VM 배열 비교·첫 방어 효과 상태·정확한 반응 ID 비교를 바로잡아 최종 재실행했다. 초기 출력은 제품 버그나 현재 실패 결과로 인용하지 않는다. 원문은 추적용으로 보존했다.

`growth_curve.json`은 13레벨×4등급의 52개 성장식 표다. HP·ATK·DEF와 실효 DEF를 독립적으로 다시 계산해 모두 일치했다. 표의 `beforeFinalGrowth`→`afterFinalGrowth`는 **같은 0.16.18 전투 초기화에서 전용 능력치가 최종 성장식으로 덮어써지는 두 단계**다. 이전 버전→이번 버전 패치의 변화로 해석하면 안 된다. 플레이어 조건은 Lv25지만 적은 고유 레벨18–56을 유지한다. DEF와 실효 DEF는 구분한다.

수동 패턴 호출과 회전에서는 아군 HP를 복원하고 난수를 중간값으로 고정했다. 완전한 합법 행동 순서·실제 승률·숙박비·4성/5성 비교는 별도 반복 전투 자료를 사용한다. 과대한 진단 피해나 1HP 보호막은 핵·껍질·보호막 경계를 확인하기 위한 것으로 일반 전투 수치로 인용하지 않는다.

재현 스크립트의 제품 루트는 현재 파일 위치에서 찾고 `CRPG_AUDIT_ROOT`로 바꿀 수 있다. helper는 보존된 상대 경로로 연결한다. 출력은 임시 폴더 또는 `CRPG_AUDIT_OUT`에 저장한다. 조건·계수·난수 정책은 원래 실행에서 바꾸지 않았다.

```bash
CRPG_AUDIT_OUT=/tmp/crpg-review-boss-mechanics node docs/data/reaction_healer_review_v01618/field_boss_mechanics/probe.cjs
CRPG_AUDIT_OUT=/tmp/crpg-review-boss-growth node docs/data/reaction_healer_review_v01618/field_boss_mechanics/growth_curve.cjs
```

`manifest.json`은 원 실행 파일 해시이고 상위 `MANIFEST.json`은 원문·압축·휴대 가능한 스크립트 복사본의 해시다. 원래 스크립트는 상위 `original_scripts/`에 압축 보존했다. 원본 독립 QA JSON은 바이트 그대로 유지했다. 제품 소스·DB 233개가 기준 해시와 같으며 제품·서버 변경은 없다.
