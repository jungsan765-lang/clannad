# 최종 정책 독립 재검증 · 0.16.27

최종8소스에서 **29/29 통과**, 오류0이다. 일반 적·보스·회복의 최적 편성 승률을 전수 증명하는 검사가 아니라, 실제 권위 있는 입장·저장·난수·결제 경로의 보존 검사다.

- 원문DB와 나선·RAID·오셀·장비특성 등의 보호 소스가 기준판과 같다.
- 나선1·6·9층, RAID6종, 여행자·이세계인 오셀과 후속파가 기준판 배우·순서·난수대로 시작한다.
- 구EXP/TALENT의 PENDING/STARTED 전투는 구보상과 행동·난수를 유지한다. 신규EXP60=24,000/TALENT60=90과 운영자 개별 덮어쓰기를 실제 메뉴·정산으로 확인했다.
- 드발린 신규 재도전은 바람길을 거절하고, 과거 저장의 바람길과 행동을 유지한다.
- 필드의 구 저장·후속 소환, 공략 장비의 제작비와 서리막이 망토의 실제 제작을 확인했다.
- 강화 소스는 기준판에서+11/+12 현금·광석 두 행만 바뀌었다. 나머지 전체 소스 본문과 성장치·확률·강등·돌파 비용이 정확히 같다. 유료 영수증·자연 난수 검사는 [강화 가격 검증](../../../docs/data/balance_v01627/enhancement_price_revision/README_KO.md)을 본다.

이전 `final_independent_review`의28검사는 이전 후보 자료로 보존했다. 현재 기준은 이 폴더의 [summary.json](summary.json), [raw.json](raw.json), [동일 실행기](runner.cjs)다.

실행: `node tools/audit_final_scope_review_v01627.cjs --expect-exp60 24000 --out reports/abyss_difficulty_v01627/final_policy_review`

최종 native 런타임+DB 지문: `7147e88113388e51a3042d1d51c9bde3e084213502f976f52202012542f0dbe2`.
