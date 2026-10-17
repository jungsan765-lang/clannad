# 0.16.25 선정 회귀 검사 명령

제품/테스트는 수정하지 않는다. 최신 수치 계약과 충돌하는 실패는 원인을 분류해 남긴다. 아래 8개는 `source/index.html`의 실제 스크립트 순서로 런타임을 로드한다. generated 엔진과 구분한다.

```bash
python3 docs/data/balance_v01625/regression/run_regressions.py --label provisional_source_8
python3 docs/data/balance_v01625/regression/run_regressions.py --label final_frozen_source_8
```

실행 폴더가 이미 있으면 새 label을 사용한다. 실패 로그를 덮어쓰지 않는다. 최종 동결 후 필요 항목만 검사하려면 `--test 상대경로`를 반복 지정한다.

```bash
node tests/test_incoming_defense_v01622.cjs
node tests/test_healing_v01619.cjs
node tests/test_noelle_healing_v01621.cjs
node tests/test_shield_balance_v01619.cjs
node tests/test_food_balance_v01620.cjs
node tests/test_inn_recovery_pricing_v01615.cjs
node tests/test_reaction_fixes_v01619.cjs
node tools/test_admin_balance_runtime_v01623.cjs
```

각 결과에는 정확한 명령, 시간, 종료 코드, 테스트 SHA와 제품 입력 SHA, 전체 stdout/stderr를 보존한다. QA 실행 시간은 육성/파밍 시간 실측이 아니다.

## 최종2 동결판

```bash
python3 docs/data/balance_v01625/regression/run_regressions.py --label final2_frozen_source_8
```

완료한 폴더가 이미 있으므로 다시 실행할 때에는 새 label을 사용한다. 최종2는 같은8개 모두 통과했고 추가 테스트 교정은 없다. 기존3파일 기대식/C3 교정은 그 이전 승인 기록을 계승한다.
