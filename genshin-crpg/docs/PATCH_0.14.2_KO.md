# 0.14.2 전투·소환물 수정판

기준: 0.14.1 main 후보에서 이어지는 0.14 테스트 라인.

## 수정 내용

- 전투 마지막 공격 뒤 결과 연출이 끝나기 전에 지역 BGM으로 바뀌지 않도록 전투 BGM을 재생 종료까지 고정.
- 보호막 피해에 `shieldBefore/shieldAfter`를 기록하고 다단 공격의 각 타격마다 보호막 수치와 게이지를 갱신.
- 토끼 백작:
  - 별도 HP 보유.
  - 일반 적의 단일 공격만 기본 30% 확률로 대신 맞음.
  - 광역 공격·보스 공격은 강제 도발하지 않음.
  - 파괴 또는 유지 시간 종료 시 폭발.
- 오즈·누룽지·월계:
  - 전투장에 별도 소환물 카드와 전용 이미지 표시.
  - 자동 공격은 캐릭터 위치가 아니라 소환물 위치에서 발사되는 연출.
  - 남은 자동 행동 횟수 표시.
  - 재소환은 기존 소환물을 중복 생성하지 않고 갱신.
  - 소환자 전투불능 뒤에도 이미 생성된 소환물은 자기 지속시간까지 처리.
- 전용 에셋:
  - `assets/summons/summon_baron_bunny.webp`
  - `assets/summons/summon_oz.webp`
  - `assets/summons/summon_guoba.webp`
  - `assets/summons/summon_yuegui.webp`
  - production build의 `assets/summons`에 그대로 포함.

## 검증

`tests/test_v0142_combat_summons.cjs`를 release gate에 추가했다.

검증 항목:
- 보호막 타격별 잔량.
- 토끼 백작 HP 및 확률 도발.
- 오즈의 소환자 전투불능 후 독립 지속 및 소환물 위치 공격 표기.
- 누룽지·월계의 소환물 위치 공격 메타데이터.
- 전투 BGM hold.
- 4종 이미지와 production build 연결.

## 배포 경계

이 변경은 전투 런타임을 포함하므로 engineVersion이 변경된다. main 반영과 검증은 가능하지만, 운영 Worker와 Pages 게시를 임의로 실행하지 않는다. 운영 게시가 필요하면 기존 Worker/Pages 승인 절차를 따른다.
