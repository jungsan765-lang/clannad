# 0.14.5 사용자 피드백 수정판

기준: 0.14.4에서 이어지는 0.14 테스트 라인.

## 수정 내용
- 이틀 주기 보스(안드리우스·드발린 재료 재도전, 타르탈리아 성유물·야타용왕 결정 파밍): 보스별 현실 시간 하루 1회 입장(한국 시간 자정 초기화, 온라인은 서버 시각). 입장 순간 기록, 패배·이탈도 그날 입장으로 친다. 기록은 `s.bossRealAdmissions`(`BOSS_*`, `FARM_TARTAGLIA`, `FARM_AZHDAHA`)에 현실 날짜 번호로 저장하고, 예전 게임 내 48시간 기록은 읽지 않는다(`source/runtime_boss_rematch.js`).
- 장비 등급 색: 별 등급 우선(3성 희귀·4성 영웅·5성 전설), 별 등급이 없을 때만 획득 티어(`source/inventory_presenter.js`).
- 편성 화면: 동료 편성 → 진형(한 줄) → 전투 대열 순서(`source/app_party.js`).
- 토끼 백작: 행동하지 않는 전장 효과이며 폭발 피해에 「폭발」 이름을 붙여 공격처럼 보이지 않게 함(`source/runtime_combat.js`의 `explodeBunny`).

## 검증
- `tests/test_v0144.cjs`에 0.14.5 항목 4개 추가(15개 통과), `tools/test_gameplay_step10_artifacts.cjs`를 하루 1회 규칙으로 갱신.

## 배포 경계
- 로컬 테스트 후보. 승인 전 main 병합·운영 배포 없음. 런타임 규칙이 바뀌었으므로 정식 배포 때 Worker도 함께 배포.
