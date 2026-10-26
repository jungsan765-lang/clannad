# 0.16.16 적용 소스

게시 대상은 `jungsan765-lang/clannad`의 `test/crpg-v01414-story`이며 PR20이다. 이 작업은 소스 게시와 적용 명령 제공이다. 실제 서버 설치·운영 승격·main 병합은 실행하지 않았다. 워크플로 완료를 기다리지 않는다.

이번0.16.16은0.16.15의 재료 비경 전투 약화를 제거하고 보상·요구량을 함께 조정한다. 기존 숙박비 계산은 유지한다. 상세 수치·완주·검사와 구버전 저장 경계는 [PATCH_0.16.16_KO.md](PATCH_0.16.16_KO.md)를 따른다.

커밋 자신의SHA를같은커밋문서에고정할수없으므로 **최종답변/PR20에실제로게시한SHA**를확인해아래변수에넣는다. 움직이는브랜치이름이나옛0.16.15 SHA를대신쓰지않는다.

## 테스트 설치

```bash
RELEASE_SHA='최종답변 또는 PR20의 0.16.16 전체 SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

기존 설치기는 해당SHA의검증된배포본준비전에는기존서버를유지한다. 테스트서버에서확인한같은SHA로 운영승격한다.

## 운영 적용

```bash
RELEASE_SHA='테스트에서 확인한 0.16.16 전체 SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```
