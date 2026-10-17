# 0.16.19 반응 수정 검증 자료

[구현 내용](IMPLEMENTATION_KO.md)과 [검증 요약](summary.json)을 함께 읽는다. 아래 결과는 기존 전투 화면·DB·경제 시스템을 추가하지 않고 확정 반응 오류를 수정한 범위에 해당한다.

## 검사 결과

| 검사 | 통과 수 | 결과 JSON | 실행 로그 |
|---|---:|---|---|
| 신규 반응 회귀 전체, 실제 유라 추가타 구분 포함 | **43 / 43** | [reactions_43.json](reactions_43.json) | [reactions_43.log](reactions_43.log) |
| 기존 슬라임·보호막·보스 원소 면역 | **41 / 41** | [immunity_41.json](immunity_41.json) | [immunity_41.log](immunity_41.log) |
| 기존 반응·운명의 자리·다인 | **14 / 14** | [legacy_reactions_14.json](legacy_reactions_14.json) | [legacy_reactions_14.log](legacy_reactions_14.log) |
| 신규 제어 거부·충전·저장 복구 | **10 / 10** | [control_grace_10.json](control_grace_10.json) | [control_grace_10.log](control_grace_10.log) |
| 기존 몬스터 제어·호위·물 부착 | **13 / 13** | [monster_control_13.json](monster_control_13.json) | [monster_control_13.log](monster_control_13.log) |

14개 검사의 JSON은 해당 검사 프로그램이 출력한 통과 수 요약이다. 다른 네 JSON은 개별 검사 결과/수치도 포함한다. 같은 결과를 합산한 수를 추가 실험 수로 세지 않는다. 이 다섯 묶음은 합계 **121개 검사**다.

## 재현 방법

저장소 루트에서 Node.js로 실행한다. 서버 계정·브라우저·운영 세이브를 사용하지 않는다. 실제 런타임의 전체 스크립트 순서와 기존 몬스터/카드/장비를 사용하며, 소유 동료·레벨·적법한 돌파/특성 단계는 검사 준비값이다. 고정 난수와 일부 상태/턴 경계를 사용하여 피해 공식 및 상태 수명을 분리한다. 전투 승률·실제 플레이 시간 측정과는 다른 검사다.

```bash
REACTION_FIX_REPORT=docs/data/reaction_fixes_v01619/reactions_43.json node tests/test_reaction_fixes_v01619.cjs
ELEMENT_IMMUNITY_REPORT=docs/data/reaction_fixes_v01619/immunity_41.json node tests/test_element_immunity_v01618.cjs
node tests/test_control_reactions_v0168.cjs
node tests/test_control_grace_v01619.cjs
node tests/test_monster_control_fixes_v01618.cjs
```

정상 소스에서는 위 다섯 실행이 모두 종료 코드 0이다. 로그의 마지막 JSON에 검사 수가 나온다. 보존한 이전 소스의 과대 피해를 재현하려면 아래 명령을 실행한다.

```bash
node docs/data/reaction_fixes_v01619/replay_counterfactual.cjs
```

이 명령의 **종료 코드 1은 의도한 결과**다. Lv.60·기본 특성 4의 촉진이 정상 기대 **3,601**보다 높은 **4,452** 피해를 내므로 검사에 걸린다. [실행 로그](counterfactual_additive.log)를 남겼다. 세 개의 [이전 반응 소스](baseline_v01618/)만 읽기 전용으로 주입하며, 제품 파일은 쓰지 않는다. 나머지 스크립트와 DB는 이 패치의 검증 소스를 사용한다. 따라서 이전 버전 전체 배포본을 재현하는 실행이라고 해석하면 안 된다.

## 소스와 도우미

- 검사: [test_reaction_fixes_v01619.cjs](../../../tests/test_reaction_fixes_v01619.cjs), [test_control_grace_v01619.cjs](../../../tests/test_control_grace_v01619.cjs)
- 전체 로드·기존 시나리오 준비: [helpers_v011.cjs](../../../tests/helpers_v011.cjs)
- 같은 장비·합법 돌파/특성 준비: [audit_protagonist_v01618.cjs](../../../tools/audit_protagonist_v01618.cjs)
- 기존 검사: [원소 면역](../../../tests/test_element_immunity_v01618.cjs), [반응/운명의 자리](../../../tests/test_control_reactions_v0168.cjs), [몬스터 제어](../../../tests/test_monster_control_fixes_v01618.cjs)
- 수정 제품 소스: [runtime_rules.js](../../../source/runtime_rules.js), [runtime_premium_v0148.js](../../../source/runtime_premium_v0148.js), [runtime_mond_cards.js](../../../source/runtime_mond_cards.js)
- 이전 소스 반례 도우미: [replay_counterfactual.cjs](replay_counterfactual.cjs)
- 이전 제어 함수만 되돌린 비교 원자료: [control_before_after.json](control_before_after.json), [이전 제어 실패 로그](control_previous_counterfactual.log)
- 검증 시점 전체 소스·DB·검사 도우미와 보존 원본의 SHA-256: [sourcehash.json](sourcehash.json)

해시의 첫 기록은 검사가 실행되는 동안 취득했고 종료 후 같은 파일인지 다시 확인했다. 이전 소스 비교 결과와 현재 전체 실행 결과는 별도 파일로 구분했다. 제품이나 도우미를 바꾼 뒤 재실행하면 해시를 함께 갱신한다.

## 적용 범위

반응 계수 전면 교체, 감전 선지급, 원소 게이지/초 단위 피해 상한의 새 구현은 포함하지 않는다. 과부하 2·감전 1.2·초전도 0.5 등 현재 게임 계수와 초전도의 물리 피해 증가 25%는 유지했다. 원작 수치와 동일하다는 의미가 아니다. 정확한 수정 및 고증 근거는 [IMPLEMENTATION_KO.md](IMPLEMENTATION_KO.md)에 정리했다.
