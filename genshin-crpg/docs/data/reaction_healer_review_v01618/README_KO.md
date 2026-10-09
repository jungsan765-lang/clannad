# 0.16.18 반응·회복 검토 원자료

제품 기준은 공개 원격 커밋 `1e1b2442b53d42873d29556898f5f612d52d0c7a`이다. 이 자료는 검토와 메모리 안 후보 실험 결과이며 제품 변경·서버 배포를 뜻하지 않는다. 숫자·편성·적·특성·강화·행동 정책은 원래 실행과 같다. 복사한 재현 스크립트의 제품 루트·helper 참조·결과 출력 경로만 바꿨다. 원래 스크립트도 `original_scripts/`에 압축 보존했다.

| 자료 | 범위와 읽는 순서 |
|---|---|
| `canon/canon_review.json` | 공식 안내와 원문 검증 자료의 반응 고증·한국어 명칭·출처·확인 한계 |
| `native_roles/summary.json`, `summary.md`, `native_roles.json.gz` | Lv10·20·40·60 반응 피해·물리 후속타·감전 시간표·결정 흡수·빙결/쇄빙의 분리 진단 |
| `native_roles/metadata_corrections.json` | Lv20 요청 특성 3은 실제 상한 2로 실행됐다는 표기 정정. 원시 숫자는 수정하지 않았다 |
| `native_roles/canon_edges.json`, `native_cast_paths.json`, `control_grace_native_whopper.json`, `enemy_shield_packets.json` | 실제 카드 경로, 면역·물 확산·복합 반응·충전 취소·보호막 피해 항목의 작은 재현 |
| `native_roles/ec_early_failed.*` | 폐기된 감전 후보의 한계 기록. 최종 조정안이나 통과 사례로 사용하지 않는다 |
| `dendro/probe.json`, `edges.json`, `review.md` | 연소·씨앗·가산 반응·발동 범위의 분리 진단과 세 가지 VM 후보 규칙 |
| `dendro/campaign_summary.json`, `campaign_native.json.gz` | 68개 고유 조건, 본 전투 220회 202승 18패. 귀환 포함 241전투. 현행 치유와 AI가 포함된 반복 전투 |
| `healer_candidates/candidate_summary.json`, `candidate_conditions.csv`, `candidate_native.json.gz` | 본 묶음 438회 실행·426개 고유 조건, 본 전투 2,661회 2,480승 181패. 계측 재실행 12조건 포함 |
| `healer_candidates/candidate_manifest.json`, `vm_sources/` | 실행된 계수·정확한 문자열 치환·VM 후보 원문 스냅샷과 당시 해시 |
| `healer_candidates/cause_summary.json`, `isolated_jean.json.gz` | 치유·공격·제어 분리와 레벨별 회복 곡선. 보정 후 명목 치유는 공식 복원값이며 새 core 계측값이 아니다 |
| `healer_candidates/*cases*.json`, `pilot_*.json`, `broad_*.json`, `*candidate*.json` | 재현에 필요한 원래 조건과 후보 계수. 낮은 후보를 확정 패치로 해석하지 않는다 |
| `barbara_late/native*.json.gz`, `candidate*.json`, `cases.json` | 후반 Lv50·60 재료 비경의 추가 24조건·192전투 전승. 가장 낮은 Q 0.03/E 0.01에서 KO 6회 |
| `evidence_qa.json`, `supplement_evidence_qa.json` | 독립 검사 결과 원본. 원래 경로와 원래 입력 파일 해시도 그대로 남아 있다 |
| `field_boss_mechanics/README_KO.md` | 9종 보스·26고립 패턴·9회전·11동작 확인, 성장식52행. 실전 승률 자료와 구분 |
| `field_boss_repeat/README_KO.md` | C0 60조건 142전 118승24패와 별도 C6 12조건 30전 24승6패. 실제 연전·핵 부활·HP 수지·숙박비 |
| `chasm_gap/README_KO.md` | 기본132·보충28을 분리한160조건 자연 전투·무숙박 연전·과잉피해/보상정산 제한 |
| `rarity_growth/README_KO.md` | 43명×8레벨344능력치·43C6/258공개해금·격리C2 관찰. 실전 승패 분모 아님 |
| `baseline/source_before.json`, `MANIFEST.json` | 제품 소스·DB 233개 기준 해시, 원본/복사본/압축본의 추적 정보 |

힐러 두 묶음 합계는 **462회 실행·450개 고유 조건·2,853전투·2,672승·181패**다. 동일 조건 계측 재실행 12개를 빼면 2,757전투·2,576승·181패다. 실행 오류와 전투 패배를 구분한다. 회복 실패나 완전 회복 종점이 없는 숙박비 0은 `innCostComparable=null`로 제외해야 한다. 귀환 전투가 회복과 최종 비용에 영향을 줄 수 있다.

## 재현 방법

저장소 루트에서 실행한다. 기본 제품 루트는 스크립트 위치로 찾으며 다른 체크아웃은 `CRPG_AUDIT_ROOT`로 지정한다. 결과는 기본적으로 임시 폴더에 저장하고 `CRPG_AUDIT_OUT`으로 바꿀 수 있다. 현재 자료의 해시는 다음처럼 확인한다.

```bash
python docs/data/reaction_healer_review_v01618/verify_archive.py
```

분리 반응 진단은 다음과 같다. 이는 적 HP를 진단용으로 크게 만든 효과 검사이므로 실전 승률 시험이 아니다. 원시 `talent`의 요청값과 실제 상한 정정은 위 정정 파일을 함께 읽는다.

```bash
CRPG_AUDIT_OUT=/tmp/crpg-review-native node docs/data/reaction_healer_review_v01618/native_roles/probe.cjs
CRPG_AUDIT_OUT=/tmp/crpg-review-dendro node docs/data/reaction_healer_review_v01618/dendro/probe.cjs
CRPG_AUDIT_OUT=/tmp/crpg-review-dendro node docs/data/reaction_healer_review_v01618/dendro/campaign.cjs 40 rule_candidate
```

후반 회복 후보의 원래 조건을 다시 실행하는 예다. `CRPG_HEALER_CANDIDATE`는 JSON을 직접 읽고 조건 파일은 원문 그대로 사용한다. 후보를 저장소 소스에 덮어쓰지 않는다.

```bash
CRPG_HEALER_CANDIDATE="$(cat docs/data/reaction_healer_review_v01618/barbara_late/candidate_middle.json)" node docs/data/reaction_healer_review_v01618/healer_candidates/native_repeat_broad.cjs --casesfile docs/data/reaction_healer_review_v01618/barbara_late/cases.json --out /tmp/crpg-review-barbara-middle.json
```

큰 개별 campaign JSON은 압축 aggregate에 모아 중복 보관을 줄였다. 원래 집계 스크립트에 필요한 행을 별도 폴더로 풀 수 있다. 이 복원 파일은 aggregate에서 다시 구성한 것으로 원래 개별 파일 바이트가 동일하다고 주장하지 않는다.

```bash
python docs/data/reaction_healer_review_v01618/unpack_campaigns.py /tmp/crpg-review-restored
CRPG_AUDIT_DATA=/tmp/crpg-review-restored python docs/data/reaction_healer_review_v01618/healer_candidates/aggregate.py
CRPG_AUDIT_DATA=/tmp/crpg-review-restored python docs/data/reaction_healer_review_v01618/healer_candidates/cause_summary.py
```

독립 QA 스크립트는 보존된 압축 자료를 읽고 별도 `recomputed_*` 파일을 만든다. 원래 QA 파일을 덮어쓰지 않는다. 실행 당시 경로/해시 기록과 현재 압축 경로가 달라질 수 있으므로 원래 기록의 바이트 보존은 `MANIFEST.json`과 함께 확인한다.

```bash
python docs/data/reaction_healer_review_v01618/check_evidence_qa.py
python docs/data/reaction_healer_review_v01618/check_supplement_evidence_qa.py
```

## 해석과 배포 주의

- VM 후보 원문인 `vm_sources/`는 검증용이다. **제품 source 폴더에 복사하거나 배포하면 안 된다.** 낮은 계수·치유 0 반사실 조건은 확정 조정안이 아니다.
- 반응 분리 진단은 실제 레벨·방어력과 진단용 HP/배치를 사용한다. 1회 감전의 총량 보존을 반복 부착·저장 복원·부활까지 검증했다고 해석하지 않는다.
- 풀 반응 `mainCounts`는 로그 항목 수이며 지속 피해와 여러 대상이 포함된다. 증폭·가산 반응 피해는 전체 히트, 격변 반응은 별도 피해이므로 그대로 순수 추가 피해끼리 비교하지 않는다.
- 힐러 후보는 정해진 편성·강화·특성·두 시드의 측정이다. 후반 후보 24조건만으로 초반·모든 장비·모든 조합의 수치를 확정하지 않는다.
- 필드 보스 동작 검사는 이후 `field_boss_mechanics/`에 별도로 보강했다. 반복 전투 및 추가 구성 검사는 각각의 별도 자료를 읽고 기본 힐러 462회 집계와 섞지 않는다.
