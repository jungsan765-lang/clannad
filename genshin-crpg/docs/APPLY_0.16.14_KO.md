# 0.16.14 적용 코드

최종40자리 커밋은 최종 답변과 [PR20](https://github.com/jungsan765-lang/clannad/pull/20)에 기록한다. 테스트 브랜치는 `test/crpg-v01414-story`다. 워크플로 완료를 기다리지 않고 고정 커밋의 적용 명령을 제공한다. 이번 담당은 실제 서버 설치·운영 승격·main 병합을 실행하지 않았다.

## 테스트 서버

```bash
read -r -p '0.16.14 커밋40자리: ' RELEASE_SHA
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

해당SHA의 검증 배포본이 아직 준비되지 않았다면 설치기는 현재 서버를 유지하고 종료한다. 준비 후 같은 명령을 다시 실행한다.

## 본서버

같은 커밋의 테스트 설치를 확인한 뒤 실행한다. 새 터미널에서는 `RELEASE_SHA`에 같은40자리 커밋을 입력한다.

```bash
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

확인: 최종 돌파 미리보기4성·주인공800/5성1,600, 실제 한 번만 차감, 이미 완료한 돌파 유지, 미완료 돌파의 부족 재료 안내, 진행 중0.16.13 비경 보상20/32 유지. 캐서린·임무 갈래·스타라이트 등0.16.13 변경은 함께 포함된다. 상세: [PATCH_0.16.14_KO.md](PATCH_0.16.14_KO.md).
