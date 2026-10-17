# 층암거연 자연 전투 검토 원자료

`REVIEW_KO.md`는 담당 에이전트의 최종 해석, `native_all.json.gz`는 완료한10개 조건 파일을 합친 전체 네이티브 로그, `summary.json.gz`는160조건의 요약이다. `evidence_qa.json`은 별도 독립 검증 원본이며 원본37파일 해시·mtime와 승패 재계산 근거가 있다. 초기 pilot는 완료 집계에서 제외했고 저장소에 중복 보존하지 않았다. 개별 캠페인 압축원문·요약도 합본과 중복되므로 원본 SHA만 상위 manifest 및 독립 QA에 남겼다.

| 분모 | 전투 | 승/패 | 첫 승리 | 무숙박 삼연승 |
|---|---:|---:|---:|---:|
| 기본132조건 | 216 | 115/101 | 48 | 31 |
| 보충28조건 | 41 | 13/28 | 10 | 0 |
| 추적용 전체160조건 | 257 | 128/129 | 58 | 31 |

실행 오류는0이고160키 모두 고유하다. `H.play` 실제 보상 victory·정산 win·원시 victory·첫승·세승 시퀀스가 전부 일치한다. 기본과 보충은 목적이 다른 표본이다. 보충에는 화면 구성 강화+10의6조건, 목적 선정 자연 seed의 화면 구성 +6/+10 각8조건, 4성C6의6조건이 들어 있다. 목적 선정2명·3명 표본과 기본 조건을 하나의 일반 승률 평균으로 섞지 않는다. 네이티브4인 파티는 여행자+동료3명이며 초기 전원Lv25/최소돌파2·유물없음·같은 제작 장비라는 진단 가정이다. 실제 사용자 동료 레벨·장비를 복원한 것이 아니다.

자연 `WAIT`→공개 `COMBAT_BEGIN/COMBAT` 경로를 사용하고 난수·적·효과·치유 계수는 바꾸지 않았다. 세 전투 동안 숙박·음식·REST·RECOVER·강제 회복이 없다. XP·레벨 상승에 따른 네이티브 회복·보상 정산·PRNG는 그대로 이어진다. 따라서 ‘무숙박 삼연승’은 ‘회복이 전혀 없었다’라는 뜻이 아니다. WAIT60분은 실제 자연 조우 경로의 증인이지 사람이 이동·노가다에 쓴 실측 시간도 아니다.

초기 원시 prose에 최소돌파1, 여행자C3의E+3이 적혔던 오기는 `summary.metadataCorrections`에 정정돼 있다. 실제 상태·계산은 처음부터 돌파2·여행자C3 Q+3이었으며 특성 증인은 기초2→2/2/5, 기초4→4/4/7이다. 원시 숫자와 로그는 바꾸지 않았다.

**피해 계측의 의미를 구분해야 한다.** outgoing `ownDamage/allyDamage`는 applyDamage 바깥 HP 순감소+보호막 순감소라 선행 회복이 섞일 수 있다. 반면 incoming `damageLogTotalToAllies`는 남은HP 상한을 적용하지 않은 네이티브 로그합이다. 전체 로그4,907개 중521개가 당시HP보다 컸고, 로그합5,508,226과 HP상한 진단합5,052,135가 다르다. 전체 로그합을 실제 잃은HP나 완전히 검증된 정확 피해로 인용하지 않는다. 이 제한은 승패·연승의 일치에 영향을 주지 않는다. `two_enemy_snapshot.json`은 특정 첫 전투에 한해 로그합·HPbefore/after 손실·정산후 순손실·치유·보호막·정산 전후HP·여행자10%HP 복귀를 분리했다. 전투 전후HP에 보상 회복이 섞일 수 있으므로 일반적인 ‘피해−회복=정산후손실’을 강제하지 않는다. 반응 로그합은 변환반응 별도 피해와 증폭/가산의 히트 전체가 섞이므로 순수 반응 추가 피해끼리의 비교가 아니다.

제품 루트는 상대 위치로 찾고 `CRPG_AUDIT_ROOT`로 바꿀 수 있다. 결과는 임시 폴더 또는 `CRPG_AUDIT_OUT`에 쓴다. 기본132조건과 보충28조건을 새로 재현하려면 저장소 루트에서 다음을 실행한다. 실행에는 실제 전투 시간이 들며 획득·사용자 입력의 최적화를 검증하지 않는다.

```bash
CRPG_AUDIT_OUT=/tmp/crpg-review-chasm python docs/data/reaction_healer_review_v01618/chasm_gap/run_campaigns.py
CRPG_AUDIT_OUT=/tmp/crpg-review-chasm node docs/data/reaction_healer_review_v01618/chasm_gap/campaign.cjs MAP_CHASM_DEEP 10 --screenshot --talent 4 --label extra10
CRPG_AUDIT_OUT=/tmp/crpg-review-chasm node docs/data/reaction_healer_review_v01618/chasm_gap/campaign.cjs MAP_CHASM_DEEP 6 --screenshot --talent 4 --seeds 3,53,251,318012461 --label native_extra
CRPG_AUDIT_OUT=/tmp/crpg-review-chasm node docs/data/reaction_healer_review_v01618/chasm_gap/campaign.cjs MAP_CHASM_DEEP 10 --screenshot --talent 4 --seeds 3,53,251,318012461 --label native_extra
CRPG_AUDIT_OUT=/tmp/crpg-review-chasm node docs/data/reaction_healer_review_v01618/chasm_gap/campaign.cjs MAP_CHASM_DEEP 6 --fourc6 --talent 4 --label fourC6
CRPG_AUDIT_DATA=/tmp/crpg-review-chasm python docs/data/reaction_healer_review_v01618/chasm_gap/summarize.py
CRPG_AUDIT_DATA=/tmp/crpg-review-chasm python docs/data/reaction_healer_review_v01618/chasm_gap/two_enemy_snapshot.py
```

이미 보존한 조건값의 집계만 다시 확인할 때는 아래처럼 합본을 임시 입력으로 풀면 된다. 값·순서가 보존되지만 원본 개별 gzip 바이트를 복원하는 기능은 아니다. `summarize.py`의 새 manifest는 현재 임시 폴더 파일만 기록하며 원 실행37파일 manifest를 대체하지 않는다.

```bash
python docs/data/reaction_healer_review_v01618/chasm_gap/unpack_campaign_inputs.py /tmp/crpg-review-chasm-recompute
CRPG_AUDIT_DATA=/tmp/crpg-review-chasm-recompute python docs/data/reaction_healer_review_v01618/chasm_gap/summarize.py
CRPG_AUDIT_DATA=/tmp/crpg-review-chasm-recompute python docs/data/reaction_healer_review_v01618/chasm_gap/two_enemy_snapshot.py
```

`catalog`·`routes_and_seeds`·`scattered_seeds`는 범위·합법 경로·특성·자연 seed 증인이다. 원래 재현/집계 스크립트는 상위 `original_scripts/chasm_gap/`에 압축 보존했고 복사본은 입출력·제품루트·helper 참조만 바꿨다. 제품·DB233개는 기준 해시와 같다. VM 후보 원문을 제품에 복사하거나 배포하지 않는다.

## 본문에서 인용한 두 전투의 추가 수지 점검

`two_cited_metrics_qa.json`은 특정 첫 전투 두 건에 한정한39개 독립 확인이며 기존160조건에 새 전투를 더한 자료가 아니다. 위험2갑주 C3/2/0/2·+6·seed318012461 첫11라운드는 실제HP손실24,606·치유16,976·정산후손실7,630이다. 전체조건은 이후2승1패여서 삼연승으로 소개하지 않는다. C0 종려/다이루크/진·+6·기초특성4·seed717 첫13라운드 Lv56갑주3명은 HP손실9,315·보호막흡수33,428·치유9,669·정산후손실0이다. 치유9,669에는 피격손실9,315 외 전투배치3의 추가HP354가 포함되며 정산에서354가 제거된다. 두 전투 모두 overkill0·전후4인생존·각 인원 수지0·부활/레벨업/후속회복 없음이다. 최초 두 번째 요청이 무상의 얼음 경로로 잘못 지정된 이력은 QA에 경로정정으로 남겼고 두 자료를 혼동하지 않는다.
