# 0.16.19 필드 보스 수치·처리 경계 검증

최종 소스의 적정 레벨 54조건, 특성 상한 12조건, 무상의 바위 균형 편성 3조건은 모두 완료됐다. 세 자료의 실행 fingerprint는 `73cd503e06bbde8330651f8847691df2354b2e5545019ce9c81f5fa89f0dbb42`로 같고, 자료에 기록한 `sourceHashes`는 현재 제품 파일과 일치한다. 보스 경계 22개와 기존 면역 회귀 30개도 모두 통과했다. 파일 해시·분모·완료 로그는 [completion_manifest.json](completion_manifest.json)에 기록했다.

## 적용 범위

- `source/runtime_growth_v01522.js`: 새 무상의 바람·무상의 뇌전·얼음 나무의 ATK만 기존 전용 공격력보다 낮아지지 않도록 한다. 최종 ATK는 각각 **574→1,281 / 672→1,053 / 897→1,689**다. 최신 성장식의 HP·DEF와 다른 여섯 보스의 ATK는 유지한다. 파티 인원·별 등급·레벨에 따라 보스를 조정하는 수식이 아니다.
- `source/runtime_field_bosses.js`: 새 전투에 `behaviorRevision:2`를 기록한다. 유적의 뱀은 잠행한 자신의 차례를 종료하고 다음 자신의 차례에 기습한다. 갑주를 이미 연 뒤의 잠행도 아군 최종 피해 패킷을 차단한다. 신규 무상의 얼음 핵은 생성 라운드의 END를 기한에서 빼지 않는다. 이어지는 두 전체 라운드의 마지막 END 장판·지속 피해까지 받은 뒤, 네 유효 타격을 채우지 못하면 HP 50%로 한 번 부활한다.
- `source/runtime_combat.js`: 기존 END 장판·지속 피해 뒤, 다음 START보다 앞에 보스 기한 경계를 연결한다. 마지막 END의 네 번째 유효 피해와 다음 START의 기한 뒤 피해를 구분한다.
- 기존 진행 중 보스 전투에 새 ATK와 `behaviorRevision`을 소급 부여하지 않는다. 기존 `growthScaled` 적의 실제 HP·ATK·DEF·보호막 값과 기존 핵/잠행 순서는 유지한다. 이 보스 변경에서 보상·쿨다운·토벌 횟수·숙박/음식 가격·전투 화면 배치는 바꾸지 않는다. 별도로 함께 적용된 회복·아군 보호막·반응 수정은 최종 통합 자료에 포함되며, 기존 복수 아군 보호막에 대한 이후 피해도 새 동시 소모 규칙을 따른다.

## 최종 결과와 판단

54조건은 아홉 보스 × 4성 C0 / 4성 C6 / 5성 C0의 세 편성 × 두 시드(717·925)다. 각 편성은 여행자와 동료 세 명으로 구성했다. C6는 동료 셋에 적용하고 여행자는 C0로 둔다. 적정 레벨에서 +3 또는 +6 장비와 기본 특성 약 65% 상한을 사용한 표본이다.

| 편성 | 0.16.18 | 최종 0.16.19 | 읽어야 할 점 |
|---|---:|---:|---|
| 4성 C0 | 16승·2패 / 18조건 | 12승·6패 / 18조건 | 특성·본체 면역에 맞지 않는 편성의 부담이 커졌다. 아래 추가 검사로 분리 확인 |
| 4성 C6 | 18승 / 18조건 | 18승 / 18조건 | 운명의 자리와 실제 추가 특성 효과를 유지 |
| 5성 C0 | 18승 / 18조건 | 18승 / 18조건 | 종려·다이루크·진의 방어 편성. 승리는 유지하되 여러 보스에서 HP 손실 발생 |
| 전체 | 52승·2패 / 54조건 | **48승·6패 / 54조건** | 실행 오류 0개 |

최종 4성 C0의 패배 여섯 조건 중 두 조건은 기존에도 패배한 고대 바위 용 도마뱀이다. 새 패배 네 조건은 무상의 얼음 Lv30(기본 특성2)과 무상의 바위 Lv45(기본 특성5)다. 각 두 시드의 결과이며, 모든 4성 편성이 같은 결과를 낸다는 뜻은 아니다.

| 추가 검사 | 최종 결과 | 정산 후 저장HP | 정산 전 전투불능 |
|---|---:|---:|---:|
| 무상의 얼음 Lv30, 4성 C0, 특성 상한4, +6 / +10, 각 세 시드 | **6승 / 6조건** | 10.2~38.8% | 조건당 0~1명 |
| 무상의 바위 Lv45, 4성 C0, 특성 상한8, +6 / +10, 각 세 시드 | **6승 / 6조건** | 71.9~88.4% | 조건당 0~1명 |
| 무상의 바위 Lv45, 노엘·향릉·바바라 C0, +6, 실제 특성5, 세 시드 | **3승 / 3조건** | 45.6~60.4% | 각 조건 1명 |

위 12조건은 별 등급과 운명의 자리를 올리지 않고 합법 특성 상한까지 준비한 검사다. 원래 무상의 바위 표본인 노엘·응광·바바라는 기둥 대응에는 맞지만 본체의 바위 면역 때문에 두 캐릭터의 바위 기술이 본체 공격에 불리하다. `PREPARED`는 기믹 대응을 선언한 검사명이며 최선의 공격 조합을 뜻하지 않는다. 노엘·향릉·바바라로 본체 공격을 보완한 추가 세 조건은 특성5 그대로 모두 승리했다. 이 표본의 기존 결과는 36~40라운드 / 저장HP86.1~98.9% / 전투불능0명이었고, 최종은 45~52라운드 / 저장HP45.6~60.4% / 각 조건1명 전투불능이다.

**남은 한계:** 5성 방어 편성의 종료 저장HP100% 조건은 12/18개에서 7/18개로 줄었지만 사라지지는 않았다. 모든 전투에 숙박비가 생기도록 강제하지 않았다. 또한 서로 다른 캐릭터 편성의 승리 수를 비교한 것이므로, 4성 C6와 모든 5성 C0의 화력이 같아졌다는 검증은 아니다. 실제 사용자 세이브나 전용 무기까지 재현한 검사도 아니다.

## 초기 세 보스의 독립 비교

초기 72조건은 세 보스 × 네 편성 × 적정 레벨/5레벨 낮음 × 세 시드(717·925·4242)다. 동일한 0.16.18 VM에서 **ATK 바닥만** 바꾼 비교를 보존했다. 회복·보호막·반응 변경 효과를 이 결과에 합치지 않는다.

| 실행 | 승·패 / 조건 | fingerprint |
|---|---:|---|
| 기존 0.16.18 | 65승·7패 / 72 | `c56205d73961ba475a0c76643828023e8d6120f71651e7457a2d00ecf14a32cb` |
| 초기 세 보스 ATK만 복원 | 54승·18패 / 72 | `6ef1c4f1d5d90772a839b84ecd58ecf5a3dff017e007585fce1cffcf804cdcbb` |
| 회복 등까지 합친 중간 통합안 | 53승·19패 / 72 | `d778635c61b79976873553c92ce99b1dc21e27c9604551845a88907a5ac19b1d` |

이 72조건의 중간 통합안은 최종 fingerprint의 자료가 아니다. 최종 보스 안전성은 위 54+12+3조건과 22/30개 경계·면역 검사를 읽는다.

ATK 복원만 비교하면, 적정 레벨의 향릉·케이아·피슬 C0 공격 편성은 무상의 바람3/3, 무상의 뇌전3/3, 얼음 나무2/3 승리했다. 얼음 나무2/3은 기존과 같다. 다섯 레벨 낮은 같은 공격 편성은 세 보스 모두0/3으로 바뀌었다. 다만 힐러·운명의 자리·5성 방어 편성까지 모두 저레벨 승리를 막는 변경은 아니다.

향릉·케이아·바바라의 불1명 C0 편성은 ATK 복원 후 얼음 나무 Lv22에서1/3 승리했다. 이를 무조건 승리시키도록 기믹을 약화하지 않고 불2명인 향릉·엠버·바바라로 별도 확인했다. 같은 Lv22 / +3 / 특성2에서는3/3 승리(저장HP49~85%, 한 조건은 정산 전2명 전투불능)했고, Lv17은0/3이었다. 중간 통합안의 불2명 적정 레벨 두 시드는2/2 승리했으며, +6 / 특성상한4의 세 시드는3/3 승리했다. 이는 준비의 차이를 확인하는 자료이며, 모든 조건이 무손실 승리라는 뜻은 아니다.

## 원자료 목록과 중간 자료 구분

| 파일 | 분모·용도 |
|---|---|
| `same_level_baseline.json` / `same_level_current.json` | 동일 적정 레벨54조건의 기존/최종 비교. 최종은 fingerprint `73cd503e…` |
| `same_level_cases.json` | 위 54조건의 실제 입력 |
| `c0_boss_max_cases.json` / `c0_boss_max_current.json` | 합법 특성 상한을 준비한 C0 12조건. 최종 `73cd503e…` |
| `geo_balanced_cases.json` / `geo_balanced_baseline.json` / `geo_balanced_current.json` | 본체 공격을 보완한 무상의 바위 C0 3조건. 최종 `73cd503e…` |
| `early_baseline.json` / `early_floor_candidate.json` / `early_current.json` | 초기72조건의 기존 / ATK만 복원 / 중간 통합 결과 |
| `vine_prepared_baseline.json` / `vine_prepared_floor.json` | 불2명 준비 Lv22/Lv17 각 세 시드, 최초6조건 |
| `vine_max_cases.json` / `vine_max_current.json` | 중간 통합안의 불2명 Lv22 / +6 / 특성4, 별도3조건 |
| `vine_prepared_cases.json` | 이후 위 상한3조건을 추가해 총9조건이 된 입력. 최초6조건 실행과 분모를 섞지 않음 |
| `boundaries.json` | 최종22/22 통과. 아홉 실제 스탯·저장, 신규/구 전투, 잠행 피해 차단, 핵의 END/START·저장 경계 |
| `immunity_regression.json` | 기존 검사 도구를 최종 소스에서 실행해30/30 통과. 아홉 보스×두 시드 완전 전투18개를 포함 |
| `serpent_burrow_dot_before_fix.json` | 열린 갑주·신규 잠행의 직접 지속 피해100이 HP83,496→83,396으로 우회한 변경 전 재현 |
| `same_level_pilot_d778.json` | 중간54조건, 48승·6패. fingerprint `d778635c…` |
| `c0_boss_max_pilot_67f2.json` | 중간 상한12조건, 12승. fingerprint `67f29c1e…` |
| `geo_balanced_pilot_7768.json` | 중간 균형3조건, 3승. **파일명과 달리 JSON 내부 실제 fingerprint는 `5c9771b7b61e48bc5b94a74b288d8c972dcf87bc3cef01e935ba2dd5f1a8b2f9`** |
| `*_initial_harness.json` | 도구가 C0의 없는 운명의 자리 객체를 JSON 복사하다54조건에서 실패한 최초 결과. 게임 실행 오류나 승률에 합치지 않음 |
| `logs/*_final.log` | 최종54/12/3조건 및22/30검사의 완료 로그 |
| `completion_manifest.json` | 이 문서에서 인용한 파일 해시, 소스 일치 검사, 분모와 중간/최종 구분 |

최초 도구의 `cp(undefined)`를 null로 처리한 뒤 성공 자료를 별도 보존했다. 일부 앞선 baseline/floor 자료에는 `effectiveTalents` / `beforeRewardHp`가 없다. 최종 도구는 실제 기본·유효 특성과 정산 전 HP를 함께 기록한다. 원자료를 사후 계산으로 덮어쓰지 않았다. `immunity_regression.json`의 `version:0.16.18`은 기존 검사 도구의 식별자이며 실행 제품 버전이 아니다. 이 도구 자체는 fingerprint를 기록하지 않으므로 완료 로그와 최종 고정 소스 해시를 함께 보존했다.

## 재현 명령

프로젝트 루트에서 실행한다. `BASELINE_DIR`에는 고정 0.16.18 SHA `1e1b2442b53d42873d29556898f5f612d52d0c7a`의 별도 `source/`와 검사에 사용한 `content/db.json`을 둔다. 이번 검사의 DB SHA256은 `254c9294c7787b421f38c84b3ad8fed9f00c207a8ef74855868c0cda48dc0962`다. 저장소 원본 DB와 검사 DB는 편집용 표의 제거 때문에 바이트가 다를 수 있다. 런타임 표의 의미 동일성은 별도 QA 자료에서 확인했으며, 정확히 같은 fingerprint를 재현할 때는 기록된 검사 DB 해시까지 맞춰야 한다.

```bash
BASELINE_DIR=/tmp/crpg_v01619_baseline
node tools/audit_boss_balance_v01619.cjs --mode current --baseline "$BASELINE_DIR" --cases docs/data/boss_balance_v01619/same_level_cases.json --out /tmp/boss_same_level_replay.json
node tools/audit_boss_balance_v01619.cjs --mode current --baseline "$BASELINE_DIR" --cases docs/data/boss_balance_v01619/c0_boss_max_cases.json --out /tmp/boss_c0_max_replay.json
node tools/audit_boss_balance_v01619.cjs --mode current --baseline "$BASELINE_DIR" --cases docs/data/boss_balance_v01619/geo_balanced_cases.json --out /tmp/boss_geo_balanced_replay.json
node tools/test_boss_boundaries_v01619.cjs /tmp/boss_boundaries_replay.json
node tools/test_field_boss_immunity_v01618.cjs /tmp/boss_immunity_replay.json
```

초기72조건은 `--cases`를 생략하고 `--mode baseline` / `--mode floor-candidate`를 구분해 실행한다. 출력은 기존 증거 파일을 덮지 않도록 별도 경로에 둔다.

## 해석 한계

진단용 소유·레벨·돌파·장비·특성을 부여한 동일 조건의 공개 `PLACE_ENTER → BOSS_ROUTE → COMBAT_BEGIN/COMBAT` 검사다. 실제 게임의 적 능력치·행동·면역·보호막·핵은 그대로 사용한다. 최초 HP만 한 번 채우고 연전 조건은 HP·XP·난수와 실제 토벌 제한을 이어 간다. 자연 획득·제작·육성 시간과 모든 편성의 승률을 대신하지 않는다.

`finalHpRatio`는 네 명의 **정산 후 저장HP 합계 / 저장 최대HP 합계**다. 정산 전 전투불능은 `actualKo`와 최종 자료의 `beforeRewardHp`를 함께 읽는다. 승리 보상의 레벨업과 기존 주인공10% 부활을 치유 기술의 효과로 오해하지 않는다. 패배 조건의0HP를 승리 후 숙박 절감으로 읽지 않는다. 최종 숙박 경로에서 모라를 실제 결제한 검사가 아니므로 HP 수치를 숙박비 절약액으로 확대하지 않는다.
