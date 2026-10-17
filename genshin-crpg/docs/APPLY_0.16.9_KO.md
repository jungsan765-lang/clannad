# 0.16.9 적용 소스

테스트 브랜치는 `test/crpg-v01414-story`, 검토는 [PR #20](https://github.com/jungsan765-lang/clannad/pull/20)이다. 최종 답변 또는 PR에 기록한 **0.16.9의40자리 커밋**을 사용한다. 이 문서는 적용 코드 제공이며 실제 VPS 설치·운영 승격·main 병합은 실행하지 않았다.

## 테스트 서버

서울 VPS 터미널에서 입력 후 실행한다.

```bash
read -r -p '0.16.9 커밋 40자리: ' RELEASE_SHA
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

다운로드할 검증 배포본이 아직 준비되지 않았거나 지정 커밋과 다르면 설치기는 기존 서버를 유지하고 종료한다. 준비된 후 같은 명령을 다시 실행한다. 워크플로 완료를 기다려 소스 제공을 미루지 않는다.

## 본서버 적용 코드

같은 커밋을 테스트 서버에 설치해 확인한 뒤 아래를 실행한다. 다른 터미널에서는 위의 `RELEASE_SHA`를 같은 값으로 입력한다.

```bash
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

기존 도구가 테스트 설치 커밋을 확인하고 운영 저장을 백업한 뒤 API와 화면을 함께 복사한다. 커밋을 움직이는 브랜치 이름으로 바꾸지 않는다.

## 이어 받을 자료

- 변경·경제·저장 유지: [PATCH_0.16.9_KO.md](PATCH_0.16.9_KO.md)
- 전체 임무와 개별 보상: [TASKS_V0169_KO.md](TASKS_V0169_KO.md)
- 통합 보상: [data/task_rewards_v0169.json](data/task_rewards_v0169.json)
- 재료 지급·요구량·결제: [data/task_materials_v0169.json](data/task_materials_v0169.json)
- 최종 검사: [data/release_v0169_checks.json](data/release_v0169_checks.json)

임무 후반의 고유 특별 보상과 화면 개편은 사용자와 해당 담당AI가 따로 정한다. 당장은 기존 원석이다.
