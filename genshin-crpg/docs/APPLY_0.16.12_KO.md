# 0.16.12 적용 코드

최종 40자리 소스 커밋은 최종 답변과 [PR20](https://github.com/jungsan765-lang/clannad/pull/20)에 기록한다. 테스트 브랜치는 `test/crpg-v01414-story`다. 실제 서버 설치·운영 승격·main 병합은 실행하지 않았다. 워크플로 완료는 기다리지 않는다.

## 테스트 서버

```bash
read -r -p '0.16.12 커밋 40자리: ' RELEASE_SHA
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

지정 커밋의 검증 배포본이 준비되지 않았으면 설치기는 현재 서버를 유지하고 종료한다. 준비 후 같은 명령을 다시 실행한다.

## 본서버

같은 커밋의 테스트 설치를 확인한 뒤 실행한다. 다른 터미널이면 위의 `RELEASE_SHA`에 같은 40자리 커밋을 입력한다.

```bash
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

설치 후 접수 연습 → 보고 → 다른 갈래 공개, 반복 선행 수령 → 다음 목표 공개, 메인 완료 숫자, 기존 의뢰 보고를 확인한다. 상세: [PATCH_0.16.12_KO.md](PATCH_0.16.12_KO.md), [TASK_BRANCHES_V01612_KO.md](TASK_BRANCHES_V01612_KO.md).
