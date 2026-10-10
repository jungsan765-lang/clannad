# 0.16.21 성장 증거 안내

설명 문서는 `docs/GROWTH_AUDIT_V01621_KO.md`다. 이 폴더는 수정 전 실패, 후보별 실제 소스 해시, 최종 실행, 산술 추정과 실패 표본을 같이 보존한다. `.gz`는 JSON 또는 원본 코드의 gzip이며 Python `gzip` 모듈 등으로 읽을 수 있다.

최종 성장 소스 SHA256은 `84a4b734e58ae05f4f61b495a0eefd622bdf532911b79f0f57c1f072708e891a`다. 공통 단계 재료는 1/2/3/4/6/8/20/35/80/180/600/1500, 주인공·4성 6회 돌파 재료는 3/6/16/175/1440/37500이다. 기존 재료 개수나 영수증을 자동 환산하지 않으며 구매력 변화는 `existing_inventory_cost_impact.json`에 공개한다.

| 자료 | 실제 범위와 읽는 순서 |
|---|---|
| `ascension_final_readable/summary.json` | 최종 표의 독립255조건, 비경749전/739승·10패/숙박97회 |
| `ascension_final_readable/native.json.gz` | 해당255조건의 실제 입력·최신 저장 HP·약속/지급·전투/회복 시간 |
| `ascension_final_comparison.json` | 게시0.16.20 및 초기 후보와255조건의 시간·최종HP·승패 비교 |
| `ascension_final_readable_partial/` | 환경 메모리 중단 전에 완료한30조건 원본. 최종255에 포함됨 |
| `merge_final_ascension_v01621.py` | 보존30+후속225의 로드 소스/DB/순서/중복/측정을 검사하는 병합 도구 |
| `common_stage_reward_proposals.json` | 관측 시간에 여러 보상 후보를 넣은 산술. 최종255 직접 재실행과 혼동하지 않음 |
| `early_electro_limit_summary.json` | 초기 Lv25 번개 단계가 Lv20보다 비효율적인 실제 반례 |
| `early_electro_limit_native.json.gz` | 반례 두 조건의 정산 안에서 읽은 최신 실제 전투 로그·면역 확인 |
| `full_final_gem_readable_high/` | 최종 Lv60 불3시드,57전/56승·1패. 두 시드25승 완료, 한 시드6승 뒤패배 |
| `full_final_gem_cost_final/` | 초기5000/200 후보의6조건·1932전투. 최종37500개 실증으로 숫자를 바꾸지 않음 |
| `growth_campaign_comparison.json` | 여행자/이세계인1→60의 전후 연속 실측 비교 |
| `growth_full_campaign_final_*.json.gz` | 해당 경로의 비경전7707회 및 실제 이동·숙박·HP/XP 기록 |
| `source_change_impact_assertion.json` | `ef07…` 후보와 `84a4…`의 공통 돌파 리터럴 한 곳 이외의 동일 바이트 |
| `book_growth_projection.json` | 실제 책 사용/돌파와 단계별 조건부 공급량. 지맥 승리/실제 소요 일수의 증거가 아님 |
| `senior_account_new_character_projection.json` | 기존Lv60 4인 유지·벤치 새피슬Lv1→60. 최고180권22창의 조건부 정산 원장,3784권 사용/176권 잔여/벤치공유2200XP |
| `project_senior_account_new_character_v01621.cjs` | 승리 입력을 주입하는 정산fixture와 실제 USE_ITEM/CHAR_ASCEND/공유시간쿼터 검사. 실제 전투는 실행하지 않음 |
| `senior_account_wrong_bench_zero_assumption.log` | 첫 QA가 벤치공유XP를0으로 가정하여 중단한 원문. 기존25% 공유를 확인하고 정확히 반영해 다시 실행 |
| `growth_accounting_final_readable.json` | 실제 성장·특성 비용 원장 |
| `whole_character_cost_projection.json` | 위 원장과 장비 강화 기대값을 합한 모라 비용. 재료 조달/회복/장비 제작은 제외 |
| `final_growth_test_results.json` | 순차 최종 회귀 프로그램의 종료 코드·PASS 줄·소스/로그 해시 |
| `material_rewards_stale_nextday_expectation.log` | 최종1500 표에서 미래날 보너스를 옛400으로 기대한 QA실패. 올바른 기대값3000으로 고친 후 재실행 |
| `resource_interruption_report.json` | 공동 메모리 부족으로 중단한 검사/조건과 재개 원칙 |

기존 성장 runner는 공개 행동이 상태를 복사한 뒤 처음 붙잡은 전투 참조를 계속 보유했다. 그 원문의 `battle.log`/`finalActors`를 상세 피해나 최종 전투액터의 증거로 사용하면 안 된다. 완료 영수증·HP·XP·실지급·행동 전후 프레젠테이션 시간은 최신 저장에서 측정해 유효하다. `audit_early_electro_limit_v01621.cjs`는 네이티브 정산 안에서 현재 참조와 `lastCombatLog`를 읽는 관측 hook으로 이를 보완한 별도 증거다. 과거 자료를 새 로그로 덮어써 재실행인 것처럼 꾸미지 않는다.

코드·DB를 시험 fixture로 조작해 소유/해금/정확한 시작 레벨·장비·초기 자금을 마련했다. 이후 실제 공격/난수/요리·숙박/이동·전투불능은 엔진을 사용했다. 따라서 해금·장비/재료 조달을 포함한 신규 계정 총 완성 기간, 모든 편성의 승리, 모든 난도의 효율 상승을 보장하지 않는다.

최종 `manifest.json`은 자신을 제외한 이 폴더 모든 파일의 크기·SHA256·증거 분류와 실제 검증 범위를 담는다. 완주하지 못한 사례를 성공 승수나 완료 시간으로 외삽하지 않는다.
