# 0.16.21 적용 상태 — 복구 후보

현재 복구 브랜치는 확인했던 수정 소스7개와 문서를 보존한 후보 코드다. 최종177회귀, 현재 정책에 맞춘 회귀 검사/QA도구의 선별 게시, 최종 원자료 manifest, 테스트 배포 브랜치 게시와 검증된 배포본은 미완료다.

따라서 이 브랜치 SHA를 기존 `install-fixed-region-test-release.sh` 또는 `promote-test-release-to-production.sh`의 검증된 배포 SHA라고 제공하지 않는다. 실제 서버 설치와 운영 승격은 실행하지 않았다.

다음 AI는 [인수인계](AI_HANDOFF.md)에 있는 남은 결과만 읽고 재검한 뒤, 기준 테스트 브랜치의 최신 HEAD를 다시 읽어 CAS로 게시해야 한다. 기존DB/assets/타AI 수정은 보존한다. 최종 성공한 전체40자리 SHA를 별도로 사용자에게 전달하고 테스트/본서버 기존 설치 명령을 제공한다. 소스 게시 후 워크플로 완료는 사용자 지시에 따라 기다리지 않는다.

핵심 소스 패치: [source_changes.patch](data/full_balance_v01621/recovery/source_changes.patch).
핵심 SHA 목록: [source_manifest.json](data/full_balance_v01621/recovery/source_manifest.json).
현재 변경과 실제 검증 범위: [PATCH_0.16.21_KO.md](PATCH_0.16.21_KO.md).
