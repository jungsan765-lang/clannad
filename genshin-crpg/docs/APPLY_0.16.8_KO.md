# 0.16.8 적용 소스

테스트 브랜치는 `test/crpg-v01414-story`, 검토 창은 [PR #20](https://github.com/jungsan765-lang/clannad/pull/20)이다. 최종 답변이나 PR에 적힌 **0.16.8 커밋 40자리**를 사용한다. 움직이는 브랜치의 최신값이나 다른 버전으로 대신하지 않는다.

이번 작업은 소스 게시와 적용 명령 제공까지다. 실제 VPS 설치와 운영 승격은 실행하지 않았다. 워크플로 완료를 기다려 답변하지 않으며, 다운로드할 검증 배포본이 아직 준비되지 않았으면 설치기는 기존 서버를 유지하고 종료한다. 준비된 후 같은 명령을 다시 실행한다.

## 테스트 서버

서울 VPS 터미널에서 아래 커밋 입력 뒤 실행한다.

```bash
read -r -p '0.16.8 커밋 40자리: ' RELEASE_SHA
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

테스트 API와 화면이 같은 커밋/엔진인지 확인해 전환하는 기존 설치기다. 공개된 배포본이 지정 커밋과 다르면 전환하지 않는다.

## 운영 서버 적용 코드

**그 커밋을 테스트 서버에 설치해 직접 확인한 뒤** 아래를 실행한다. 다른 터미널이라면 같은 `RELEASE_SHA`를 먼저 입력한다.

```bash
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

기존 승격 도구가 테스트에 설치된 커밋을 확인하고 운영 저장을 백업한 뒤 API와 화면 묶음을 복사한다. 이 문서는 사용자가 실행할 코드이며, 문서 작성만으로 운영에 적용되지는 않는다.

## 다른 AI가 이어 받을 문서

- 변경과 검사 결과: [PATCH_0.16.8_KO.md](PATCH_0.16.8_KO.md)
- 240개 조건/보상: [TASKS_V0168_KO.md](TASKS_V0168_KO.md)
- 성장 계산: [data/growth_pacing_v0168.json](data/growth_pacing_v0168.json)
- 경제 계산: [data/economy_v0168.json](data/economy_v0168.json)
- 릴리스 검사와 별도 재실행: [data/release_v0168_checks.json](data/release_v0168_checks.json)

고유 특별 임무 보상과 화면 작업은 사용자와 다른 AI가 별도로 논의한다. 이번 중후반 임무 보상은 일회성 원석이다.
