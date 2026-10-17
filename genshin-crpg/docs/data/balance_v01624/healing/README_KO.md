# 치유·보호막 영향 검증 자료

전역 종려 방패/원소폭발 너프는 채택하지 않았다. 회복, 음식, 숙박 요금, 경제 수치도 이 검토로 변경하지 않았다. 수정 후보와 최종 일일보스 전용 정책을 구분해서 보존한다.

| 자료 | 의미 |
|---|---|
| `pressure_baseline_native.json`, `pressure_baseline_review_KO.md` | 0.16.23의 종려+진 보호막·치유와 방어 압력 고립 측정. 실제 보스 완주 승률 측정은 아니다. |
| `shield_defense_formulas_v01623.md`, `shield_defense_input_hashes_v01623.json` | 당시 실제 방어, 보호막 갱신·중첩, 치유, 돌파, 저장 식의 읽기 검토와 입력 SHA. |
| `baseline_and_half_domains.json`, `baseline_and_half_review_KO.md` | 불변 `input_basicfix`에서 기본값과 Q/방패 배율 후보 비교. 18조건36전투 모두 승리·KO0. 수정은 운영자 분리 프로필로만 넣었다. |
| `rejected_quarter_shield_domains.json`, `rejected_quarter_shield_review_KO.md` | Q×0.35 또는0.25, 방패×0.25 후보. 기본 비교36전투+종려만2돌/6돌 추가16전투, 총52전투. 두 후보의 Lv20 특성 비경 2회차에서 각각 주인공 KO가 생겨 전역 적용을 기각했다. |
| `rejected_quarter_c2_c6_packets.json`, `rejected_quarter_c2_c6_nonlethal.json` | 실제 별자리 해금에 따른 천성 방패·방패 피격 치유가 보존되는지 고립 검증. 처음 자료는 post-defense8000, 두번째는300의 선언 패킷으로 조건을 나눴다. |
| `shield_resolution_16cases.json` | 기존 보호막 소모 배율 훅의 충분/부분파괴/중첩/무방패, 명함/6돌, 배율1/3 고립16조건96수치검사. 최종 보스별 배율표의 완주 검사는 아니다. |
| `runtime_contract_final.json` | 최종 통합 source의 새 반복 일일보스 정책 계약21검사. 모두PASS, 입력 드리프트0. |

## 최종 정책에서 검증한 의미

`dailyPressureRevision=1`은 새 반복 일일보스 전투에서만 고정한다. 북풍/드발린/타르탈리아/야타의 정확한 반복 origin과 적 본체, 대응하는 전용 카드가 있어야 적용된다. 기존 저장 전투에 마커를 추가하지 않는다. 이야기·일반 비경·나선·레이드와 원소 반응에는 해당 정책을 적용하지 않는다.

일일보스별 방패 소모 배율은 북풍1.5, 드발린3, 타르탈리아3, 야타1.5다. 타르탈리아·야타의 별도 기술 피해 계수 조정은 `growthV01522.dailyCardDamage`의 기존 전용 기술에만 적용한다. 동적 API값을 읽어 검사했고 실제 검사 보고서에 숫자와 계산 결과를 남겼다.

방패 소모 배율은 HP 피해 전체를 곱하는 효과가 아니다. 받은 피해300에서 충분한 방패는 기존처럼 HP를 보호하지만 방패 pool이 더 빨리 소모된다. 부분적으로 깨진 방패의 HP 흡수량은 소모량/배율이며, 중첩한 캐릭터 방패는 각각 같은 원본 패킷을 받고 흡수량을 더하지 않는다. 방패 없는 캐릭터의 HP 피해는 동일하다.

종려6돌은 방패 pool 소모량의40%를 회복하므로, 방패를 더 빨리 소모시키면 기존8% 대상 최대HP cap까지 회복량도 커질 수 있다. 이를 일반 회복 너프로 바꾸지 않았다. gear 없는 충분방패1200·300패킷에서 소모배율3은 소모900/HP손실0/6돌회복360, 부분방패600은 HP손실100/6돌회복240으로 재현됐다.

## 재현·한계

최종 계약 검사는 `node tests/test_daily_pressure_v01624.cjs <출력JSON경로>`로 실행한다. 단일 `H.load(ROOT)` 진입을 사용하므로 생성된 클라이언트/서버 엔진 비교에는 loader를 해당 엔진으로 바꿔 같은 계약 검사 본문을 실행할 수 있다.

검사 소스: `tests/test_daily_pressure_v01624.cjs`.
최종 성장 소스 SHA256: `611503d487c25bb9b9b5f0a7fdc809cdb3c0526d56f9914194c93aa9379e4d81`.
최종 네이티브 입력 fingerprint: `840ef8955b08346d086de5b39ab87d918123ab4ce2dc0c292f080827fc4bafdc`.

보스 난도의 최종 완주/반복/수동 공략 수치 원장은 별도 일일보스·필드보스 담당 자료다. 이 폴더의 고립/계약 검사 통과가 모든 조합의 난도·경제·공략 재미를 보장하지 않는다. 이전 후보 원장은 실제 선택한 제품 수치의 검증으로 재사용하지 않는다.

후보 검사 원본은 작업 당시 scratch `v01624-heal-work/`에 보존했다. `q_and_domain_probe.cjs`, `q_and_domain_stronger_probe.cjs`는 `BALANCE_PROBE_ROOT`, `BALANCE_PROBE_OUT`을 받아 당시 불변 입력으로 실행했으며, 이 폴더의 후보 JSON에 입력별 SHA와 fingerprint가 들어 있다. 실제 입력 스냅샷은 `v01624-field-work/input_basicfix`였다.
