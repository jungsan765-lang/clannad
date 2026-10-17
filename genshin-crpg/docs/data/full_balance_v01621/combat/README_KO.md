# 0.16.21 전투 증거 재실행

사람이 읽는 결론은 `COMBAT_AUDIT_V01621.md`, 분모/수치 요약은 `COMBAT_SUMMARY.json`이다. 모든 몬스터와 카드의 실행·지원·미실행·입장 거절은 `monster_registry_228.json`, `card_registry_414.json`, `active_card_refs_after.json`을 따른다. 원문 READY는 현재 엔진 지원과 다르다.

저장된 대표 fixture는 사용자 실제 저장이 아니다. 고정4인·현재 실제2배속 프레임시간·4성 C0/C6 및5성 C0를 명시했으며 전투 HP/XP/난수는 연속 전투 사이에 초기화하지 않는다. 초기 100만 모라는 진단용 지급이고 자연 수입으로 세지 않는다.

## 기준본과 고정 검증본

상위 `baseline_v01620.tar.gz`는 게시 `df1d2c48b630bf8a152481bcc4bcc3e5b8b37785`의 제품236파일이다. `frozen_product_snapshot.tar.gz`는 최종 검증용236파일, `frozen_harness.tar.gz`는 같은 테스트/도구/소환 이미지/서버 정적 보조입력이다. 제품 목록은 `frozen_product_manifest.json`, 추가 서버 입력은 `frozen_harness_extra_inputs.json`에 기록했다. 각 archive의 compressed SHA256·압축 해제 원문 SHA256은 `MANIFEST.json`을 따른다.

원래 고정 계약 실행은 서버 액션 허용목록을 읽는 `server/game-core.mjs` 보조입력을 빠뜨려 14PASS·2ENOENT였다. 전투 항목은 통과했고 초기 실패 로그를 보존했다. 해당 보조입력만 동일 해시로 추가하고 협동·레이드 두 검사를 재실행했다. 최종 합쳐진 결과는 `frozen_contracts_final.json`, 최초 결과는 `frozen_contracts/results.json`, 재실행 로그는 `frozen_coop_retry.log`/`frozen_raid_retry.log`다. 현재본 원래16검사도 모두PASS지만 공용 파일5개가 실행 중 바뀌어 별도로 보존했다(`after_contracts/results.json`).

## 명령

저장소 루트에서 실행한다. 아래 상대 경로는 저장소와 함께 이동해도 사용할 수 있다. source-root가 제공되면 해당 복제본의 index 순서/실제 source/DB를 로드하며 제품을 수정하지 않는다.

```bash
node tests/test_noelle_healing_v01621.cjs
node docs/data/full_balance_v01621/combat/audit_noelle_heal.cjs --out /tmp/noelle-current.json
node docs/data/full_balance_v01621/combat/audit_recovery_settlement.cjs --out /tmp/recovery-current.json
node docs/data/full_balance_v01621/combat/audit_repeated_combat.cjs --out /tmp/repeated-current.json.gz
node docs/data/full_balance_v01621/combat/audit_major_bosses.cjs --out /tmp/major-current.json
node docs/data/full_balance_v01621/combat/audit_special_owners.cjs --out /tmp/special-current.json
node docs/data/full_balance_v01621/combat/audit_capacity_native.cjs --out /tmp/capacity-current.json
```

전체 초기331그룹과 현재 적카드 정의를 다시 진단하려면 `audit_enemy_catalog.cjs --out ...`를 실행한다. 이 도구는 실제 승률 검사가 아니라 네이티브 초기화와 격리 합법 executeCard 증거를 만든다. `audit_enemy_phases.cjs`와 `audit_active_card_refs.cjs`는 같은 폴더의 기존 초기 catalog를 입력으로 사용한다. 초기 catalog의 hash를 남기므로 다른 입력에서 나온 수치를 섞지 않는다. 현재본과 기준본 전후 JSON을 별도로 저장한 후 `summarize_combat.py`로 전수표를 재생성한다.

추가 고레벨 적 비교는 `boss_underlevel_extra_cases.json`의 24조건이다. 아래 필드보스 명령의 `--cases`를 이 파일로, `--out`을 별도 출력 파일로 바꿔 재실행한다. 첫48과 추가24는 서로 다른 input fingerprint이며 성장·임무 이외 source 해시는 같다. 첫48의 성장 SHA는 `../growth/after_growth_hp.json`의 HP 정책 수정 후8조건과 연결되며 추가24는ef07 고정본을 사용했다. 이 차이를 남긴 합계72관측을 요약한다. 추가 결과의5성 장시간 생존 승리를 모든 저레벨 고난도 도전 차단으로 설명하지 않는다. 첫48의 선택 재실행이26조건 로그 후 종료137로 중단된 원문도 보존하고 완주/성공으로 세지 않는다.

고정 복제본 전체 계약은 다음처럼 추출해서 실행한다. 기존 디렉터리와 섞지 않는다.

```bash
mkdir -p /tmp/combat-replay
tar -xzf docs/data/full_balance_v01621/combat/frozen_product_snapshot.tar.gz -C /tmp/combat-replay
tar -xzf docs/data/full_balance_v01621/combat/frozen_harness.tar.gz -C /tmp/combat-replay
python3 docs/data/full_balance_v01621/combat/run_combat_checks.py --root /tmp/combat-replay --workers 2 --out /tmp/combat-replay-results
```

필드보스48조건은 `boss_cases.json`에 파티·Lv·시드·요청 격차를 고정했다. 현재본 원래 명령은 다음과 같다. `--mode current`는 저장소의 source를 로드하고 `--baseline`은 실제 같은 로컬 DB를 읽는 기존 도구의 인자다. 다른 source를 검증할 때는 `--mode baseline --baseline <제품복제본>`으로 그 복제본의 source와 DB를 함께 사용한다.

```bash
node tools/audit_boss_balance_v01619.cjs --mode baseline --baseline /tmp/combat-replay --cases docs/data/full_balance_v01621/combat/boss_cases.json --out /tmp/boss-replay.json
```

노엘 기준본 반례는 기준 archive를 별도 디렉터리에 추출한 뒤 `COMBAT_SOURCE_ROOT=<기준본> COMBAT_EVIDENCE_OUT=<JSON경로> node tests/test_noelle_healing_v01621.cjs`로 실행한다. 기준본의5실패·2통과는 수정 대상과 정상 경계를 구분하는 기대 결과다. `audit_*` 도구의 기준본은 `--source-root <기준본>`을 사용한다. 현재 도구/보조 helper의 압축 원본과 실제 실행 명령·해시는 native 결과의 provenance, 각 계약 결과 및 `original_tools/`에 있다.

## 해시와 범위

`MANIFEST.json`은 증거별 bytes/SHA256을 기록하며 gzip마다 압축된 bytes/SHA256과 해제된 원문 bytes/SHA256을 모두 기록한다. 자기 자신은 목록에서 제외한다. 큰 반복 원자료는 gzip이 원본 운반 형식이며 해제 SHA256으로 그대로 검증한다. `owned_source_proof.json`은 승인된 노엘 단일 제품 파일의 원본/수정본 hash와 DB 동일성을 담는다. 원격 authored DB 원문과 이 로컬 배포용 DB의 바이트가 같다고 주장하지 않는다.

최초 책 probe가 주인공 KO의 ACTION_LOCK을 실패로 처리한 harness 로그와 최초 존재하지 않는 raid 파일명(MISSING1)도 보존했다. 수정한 harness/올바른 `test_v0152.cjs`에서 통과한 결과와 구별한다. 운영 서버 호출·배포·main 병합·실제 계정/파티 변경을 수행하지 않았다.
