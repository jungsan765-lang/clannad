# 0.16.24 주변 시스템 회귀 검증

제품 소스는 수정하지 않았다. 성장·재료·방어·치유·보호막·음식·숙박·원소 반응·운영자 설정의 기존 회귀 검사를 선택 실행했다. 신규 보스 전투 공략·난도 비교는 담당자의 별도 원장에 있으며 이 문서의 통과 수에 합산하지 않는다.

**선정한 17개 검사 프로그램의 최신 실행은 모두 통과했다.** 그중 소스 변경 영향이 있는 재료 정산·반응 2종·운영자 source/서버 3종·역사 출처/현재 표 검사를 최종 동결된 source와 generated **0.16.24**에서 총 7개 재실행했고 모두 통과했다. 초기 source 15개는 13통과/2실패였으며, 승인한 테스트 문맥 교정 후 재실행을 별도 보존했다. 총 24회 실행에 최초 실패 2회를 포함한다. 최종 재실행 도중 제품 입력 SHA 변경은 없었다. 동시 편집된 미실행 보스 테스트 3개는 원장에 기록하지만 제품 변화로 세지 않는다.

`REGRESSION_INDEX.json`은 모든 시도와 검사별 최신 결과를 연결한다. 전투·카드·경제·원본 DB 등 변화 없는 영역의 초기 통과와 7개 최종 재실행을 구분하며 17개 전체를 동결 뒤 다시 실행했다고 주장하지 않는다.

| 검사 | 최신 결과 | 내용 |
|---|---:|---|
| test_growth_balance_v01621.cjs | 통과 · 10항목 | 레벨 상승/돌파가 상처·사망 상태를 무료 회복하지 않음, 재요청/과거 영수증 |
| test_liyue_growth_gate_v01622.cjs | 통과 · 4항목 | 실제 END 기록의 성장 해금 권한, 288개 부정 사례 |
| test_material_efficiency_v01622.cjs | 최초 실패 보존 · 최종 6항목 통과 | 과거 실측 원장의 봉인 출처와 현재 수량·요구량 표; 새 전투시간 실측이 아님 |
| test_material_rewards_v01616.cjs | 최종 통과 · 13항목 | 실제 비경 재료 정산·과거 보상 정책·재요청 |
| test_incoming_defense_v01622.cjs | 통과 · 11항목 | 5레벨 구간의 실제 적 공격 방어, 오셀 기지, 기존 저장 정책 |
| test_healing_v01619.cjs | 통과 · 6항목 | 실제 치유 예산·기술 효과·표기와 원본 DB 보존 |
| test_noelle_healing_v01621.cjs | 통과 · 7항목 | 노엘 같은 라운드 발동 상한, 소환/추가타 구분 |
| test_xianyun_balance_v01622.cjs | 통과 · 5항목 | 한운 현재/옛 저장의 실제 회복과 설명 |
| test_shield_balance_v01619.cjs | 통과 · 11항목 | 흡수·중첩·원소·관통·소수점 실제 처리 |
| test_shield_meter_v01619.cjs | 통과 · 4항목 | 보호막 표시와 실제 적 공격의 순차 차감 |
| test_food_balance_v01620.cjs | 통과 · 14항목 | 채집 난도별 요리 효과·배식·설명·레시피 계약 |
| test_inn_recovery_pricing_v01615.cjs | 통과 · 13항목 | 대상별 레벨과 HP 손실 비율 비용·실제 구매·영수증·표시 |
| test_reaction_fixes_v01619.cjs | 최종 통과 · 43항목 | 원소 반응 실제 처리 |
| test_control_reactions_v0168.cjs | 최종 통과 · 14항목 | 제어 반응·내성 |
| test_admin_balance_runtime_v01623.cjs | 최초 실패 보존 · 최종 81항목 통과 | 카탈로그의 실제 반복도전 수치와 운영자 설정 적용 |
| test_admin_balance_v01623.mjs | 최종 통과 · 76항목 | 실제 HTTP/SQLite 운영자 인증·CAS·실제 가격·보스 설정·고정 전투·영수증·원복·서버별 격리·협동·재시작 |
| test_admin_balance_growth_v01623.mjs | 최종 통과 · 20항목 | 실제 육성 재료/모라 지출·비경 입장·전투 당시 보상 유지·원복 |

## 최초 실패 2건과 최소 교정

1. 재료 효율 검사는 과거 `cash_cost_adjustment/assessment.json`이 기록한 `runtime_growth_v01522.js` 전체 SHA를 현재 모듈 SHA와 비교했다. 보스 수치/소환체 처리 추가로 모듈 SHA가 달라 실패했다. 현재 수량표·요구량·기록 비교 5항목은 통과한 상태였다. 부모 담당자의 지시에 따라 현재 소스가 다르면 `../source_before/source/`의 정확한 0.16.23 봉인 소스 SHA를 검증하도록 테스트만 교정했다. 현재 보상/요구량 API 비교는 유지했다. 과거 47전을 새 0.16.24 전투 실측으로 주장하지 않는다.
2. 관리자 런타임 검사는 보스 카탈로그를 `RANDOM` 출현과 비교했다. 0.16.24 수치가 정식 `BOSS:<route>` 반복도전에 한정되면서 카탈로그 18000/1600/180과 RANDOM 13182/1281/164가 달라졌다. 승인받아 테스트의 전투 origin만 정식 반복도전으로 교정했다. 수치를 비교하는 실제 런타임 검증과 원본 DB 불변 검사는 유지했다.

최초 출력·종료 코드·수정 전 테스트 원문은 `initial_source_15/`에 남겼다. 교정 후 재실행은 `historical_hash_corrected/`와 `canonical_admin_boss_origin_corrected/`이며 실패 원장을 삭제하지 않았다.

## 최종 동결판 증거

- `final_frozen_native_6/`: 실제 재료 정산 13, 반응 43/14, 관리자 source 81, 실제 서버 76/20항목 통과.
- `final_historical_provenance/`: 현재 보상/요구량과 과거 봉인 출처 6항목 통과. 과거 전투시간은 새 실측으로 세지 않는다.
- `final_engine_provenance.json`: generated 버전 `0.16.24`, 엔진 SHA `dfc165652b5b2b109f7b60bedcd661812c0762943bcd98945798e29b4ea082de`.
- 최종 growth SHA `611503d487c25bb9b9b5f0a7fdc809cdb3c0526d56f9914194c93aa9379e4d81`; 운영자 runtime SHA `34fe63170c899dd5d8702efa286d7296f7035beafae5e8d2fb46b27829e9e811`.

육성 관리자 정산 검사는 실제 `CHAR_ASCEND`, `TALENT_UPGRADE`, `DOMAIN_START`와 비용 차감을 실행한다. 전투 당시 설정에 따른 보상 정산만 분리해 검증하기 위해 승리 종료를 주입한다. 이를 보스 난도·파밍 승리율 검증으로 주장하지 않는다.

## 재현과 증거

```bash
python3 docs/data/balance_v01624/regression/run_regressions.py --label 다른_새_폴더명
python3 docs/data/balance_v01624/regression/run_regressions.py --server --label 다른_서버_새_폴더명
```

최종 6개 정확 명령은 `final_frozen_native_6/selection.json`과 각 `*.result.json`의 `command`에 보존했다. 최초 실행은 240초, 최종 실행은 다른 검사와 CPU를 공유하는 조건에서 불필요한 중단을 피하도록 검사당 600초 제한을 사용했다. native 재료 검사 실제 실행은 214.584초이며 시간 측정은 QA 수행 시간이다.

각 실행 폴더에는 선택 목록과 시작/끝 시각, 전체 stdout/stderr, 종료 코드, 실제 명령 배열, 테스트 SHA, generated 서버 엔진 SHA, 제품/테스트 입력의 실행 전후 SHA가 있다. `inputDrift`에는 다른 담당자의 동시 편집도 기록한다. 테스트별 입력과 무관한 다른 테스트 파일 편집은 제품 회귀 실패를 의미하지 않는다. 제품 소스 편집이 겹친 결과는 동결 후 관련 재검사로 구분한다.

이 검사는 선정된 계약의 회귀 근거다. 모든 편성·난수·구간의 보스 승리율이나 모든 육성/파밍 시간의 보장은 아니다.
