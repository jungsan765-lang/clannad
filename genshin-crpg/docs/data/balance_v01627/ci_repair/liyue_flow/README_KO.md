# 리월 전체 흐름 QA 복구 · 제품7147 유지

최초 등록195프로그램은 실제 **194통과·1실패·exit1**로 끝났다. 실패한 `test_liyue_rework_flow.cjs`만 원인을 확인해 교정한 뒤 **10가지 전체 경로를 다시 실행해10/10·exit0**을 확인했다. 전체195를 새로 재실행해exit0을 얻었다는 뜻은 아니다.

[종료 영수증](retest_full10.receipt.json) · [10경로 결과](retest_full10.results.json) · [실제 stdout](retest_full10.log) · [최종 저장10개](retest_full10_saves.tar.gz).

## 실패 원인과 좁은 수정

이 검사는 자연 육성이나 보스 난도 검사가 아니라 이야기·분기·전투 목표·저장 흐름을 확인하는 **합성 FLOW QA**다. 기존 준비는 주인공Lv20·기초HP100,000/ATK10,000/DEF1,000, 피슬·향릉·바바라Lv60·돌파6·특성8·제작+10이었다.

그러나 원래 `boost()`는 장비에owner/equipped만 직접 넣고 공개 `EQUIP`를 호출하지 않았다. 무기의 실제category가 없어서 첫 시작장비 자동장착 때 선언한+10 무기가 공용으로 풀렸으며, 실패 저장에서 세 동료의 실제 무기는 모두 시작무기+0이었다. 선행 우인단 26R 뒤 세 동료 HP0을 회복 없이 오셀에 넘겨 진법이8R에 파괴됐다.

- 숫자Lv20/Lv60/+10/특성8을 올리지 않았다. JOINED·기초 시작장비를 정상 초기화한 뒤 **공개 EQUIP 9회**로 원래 선언한 장비를 실제 장착했다.
- slot/owner/equip/category/강화10을 준비·첫 전투입장·저장복원 직후와 최종 저장에서 확인했다.
- 몬드 완료 경계인데 누락돼 있던 여행자 바람 해금도 정상화했다. genuine0.16.26/현재 모두 실제 `STORY_NEXT TRV_M01_E002`1회로해금되며, 실제 현재 몬드 남/녀완주 저장도 해금TRUE다. [공개 해금](anemo_boundary.json) · [완주 영수증](mond_unlock_receipts.json).
- 기존 공개기본공격/방어·진법전의사용가능한E/Q 선택, 이야기분기/지역종점/임무보고·승리·진법charge8·현장방어최소5R·보상검사와serialize/load의배우·목표·cursor·flags·리월상태·PRNG 비교를 보존했다.
- 전투사이HP대입·적수치/행동/난수변경·강제finishBattle·새기능은추가하지않았다. 공개회복도추가하지않았다.

공개EQUIP만 정상화하고 바람해금을 아직 보완하지 않은 별도TRV_A 재검사도 통과했다(우인단4R·오셀11R). 최종10경로의TRV_A는 우인단4R·오셀9R이다. 두 실행을 하나로 섞지 않는다.

## 오셀 자체가 바뀐 것인지 확인

실제 실패의오셀직전checkpoint를 그대로 두 런타임에 넣고 공개PREPARE→BEGIN→같은전투입력을 재생했다. 비교항목은 초기전투전체객체·명령·전체로그·보상·최종HP·PRNG 각6개다.

| 동일 직전 상태 | genuine0.16.26 | 현재7147 | 정확 비교 |
|---|---|---|---|
| 동료3명HP0 그대로 | 8R패배 | 8R패배 | 6/6동일 |
| 전원fullHP 원인분리 진단 | 11R승리 | 11R승리 | 6/6동일 |

fullHP두건은피로 원인만 분리하는명시적 합성 진단이다. 이를실제 공개 회복이나수정된 FLOW에사용하지않았다. 동일상태에서오셀의패턴/피해/난수/결과는바뀌지않았다. [요약](osial_diagnostic_summary.json) · [4건원자료](osial_before_current_diagnostic.json.gz).

원래helper는presentation을로드하지않고관찰용H.load는로드한다. 따라서원래실패와관찰용재생의로그는추가표시필드때문에전체객체그대로같다고부르지않는다. 원래 저장된 105로그행의모든기존필드·결과·최종PRNG는일치한다. 위 before/current 두 관찰용 엔진끼리의 전체 로그는 각각 정확히 같다.

오셀해역은 출발 간선0개라PREP_LEAVE후에도여관으로 갈 수 없고, HP0동료는일반 음식을 먹을 수 없다. [직전공개회복경로진단](public_recovery_path_diagnostic.json)은가능하지않은숙박을실행했다고주장하지않는다.

## 최종10경로 실제 종료

| 경로 | 결과 | actions | save/load복원 | 최종 이야기전투 |
|---|---|---:|---:|---|
| K1 | PASS | 695 | 58 | EG_ISK_L03_GOLDEN 3R · EG_ISK_L04_OSIAL 10R |
| K2 | PASS | 795 | 63 | EG_ISK_L03_GOLDEN 3R · EG_ISK_L04_OSIAL 10R |
| AA1 | PASS | 507 | 29 | EG_ISK_L04_AA1_EVAC 5R |
| AA2 | PASS | 534 | 27 | EG_ISK_L04_AA2_CART 5R |
| AB1 | PASS | 528 | 25 | EG_ISK_L04_AB1_STREET 5R |
| AB2 | PASS | 568 | 39 | EG_ISK_L04_AB2_STORE 5R |
| B1 | PASS | 465 | 30 | EG_ISK_L04_B1_ROAD 5R |
| B2 | PASS | 461 | 32 | EG_ISK_L04_B2_BOAT 5R |
| TRV_A | PASS | 846 | 42 | EG_BOSS_TARTAGLIA 3R · EG_FATUI_PATROL 4R · EG_BOSS_OSIAL 9R |
| TRV_B | PASS | 844 | 44 | EG_FATUI_PATROL 3R · EG_BOSS_OSIAL 9R |

총복원389회. 종료영수증elapsed는**317.959초**, 결과started→finished의실측이며helper초기로드를포함한전체subprocesswalltime은측정하지않았다. 여행자새게임seed71247, 이세계가지들은입력fixture의저장PRNG를유지하고모든후속난수는순정이다. 서로다른시간경계의195실행행값과동일한측정치로단정하지않는다.

이전 runner SHA `e9218ece69a99b15e80c2c3d4e3459b1dfe8efeea3c44b1dcd9657712aaf3651`, 최종 runner SHA `75b2923527692cbd72d9deb91535aa183a57008029987e0b290dbf75ab5467a8`. [원래실패runner](before_runner.cjs), [교정runner](after_runner.cjs), [최초실패로그](initial_full_run.log), [최초실패저장](initial_failure_TRV_A.json.gz)를분리보존했다.

제품 소스 수정0·새UI/시스템0. nativefingerprint `7147e88113388e51a3042d1d51c9bde3e084213502f976f52202012542f0dbe2`, authoredDBSHA `dcc2800000f20684e2c57420404aa3a3a7fe68b9042c608306ba2ec62bd178da`는유지한다. 이 FLOW QA 성공을 모든 실전 편성 승리·자연 성장 완성의 증명으로 확대하지 않는다.
