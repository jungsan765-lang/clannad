# 0.16.13 적용 코드

최종 40자리 커밋은 최종 답변과 [PR20](https://github.com/jungsan765-lang/clannad/pull/20)에 기록한다. 테스트 브랜치는 `test/crpg-v01414-story`다. 실제 테스트/운영 설치와 main 병합은 실행하지 않았으며 워크플로 완료를 기다리지 않는다.

## 테스트 서버

```bash
read -r -p '0.16.13 커밋 40자리: ' RELEASE_SHA
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

해당 SHA의 검증 배포본이 아직 준비되지 않았다면 설치기는 현재 서버를 유지하고 종료한다. 준비 후 같은 명령을 다시 실행한다.

## 본서버

같은 커밋의 테스트 설치를 확인한 뒤 실행한다. 새 터미널에서는 `RELEASE_SHA`에 같은 40자리 커밋을 입력한다.

```bash
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

확인할 내용: 몬드·리월 시설 첫 칸의 캐서린, 기존 방문 동작, 분류와 새 임무 이름, 기존 수락 의뢰 보고, 운명의 별 5성100/4성25, 새로 시작한 Lv.55/60 돌파 비경 보상20/32(공유 보너스 적용 시40/64). 업데이트 전 진행 전투는 옛 보상을 유지한다. 상세: [PATCH_0.16.13_KO.md](PATCH_0.16.13_KO.md).
