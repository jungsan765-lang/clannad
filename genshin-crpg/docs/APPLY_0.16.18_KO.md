# 0.16.18 적용 소스

테스트 브랜치 `test/crpg-v01414-story`의 **0.16.18 최종 전달문에 있는 전체 40자리 커밋 SHA**를 아래 `RELEASE_SHA`에 넣는다. 같은 커밋 안의 문서에 자기 자신의 SHA를 미리 넣을 수 없으므로 브랜치명이나 최신 SHA를 자동 조회하여 대체하지 않는다.

## 테스트 서버

```bash
RELEASE_SHA='최종_전달문의_0.16.18_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

기존 설치 스크립트가 해당 고정 커밋의 배포본을 검증해 설치한다. 워크플로가 아직 실행 중이면 배포본 준비는 설치자가 기다린다. 이번 작업은 소스 게시이며 실제 VPS 설치를 대신 실행하지 않았다.

## 본서버 적용

테스트 서버에서 사용자가 확인한 **동일한 SHA**를 사용한다. 운영 저장을 테스트 저장으로 복사하는 명령이 아니다.

```bash
RELEASE_SHA='테스트한_0.16.18_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

운영 승격·main 병합은 이번 작업에서 실행하지 않았다. 변경 및 검증 정리는 [PATCH_0.16.18_KO.md](PATCH_0.16.18_KO.md)와 `data/release_v01618_checks.json`에 있다.
