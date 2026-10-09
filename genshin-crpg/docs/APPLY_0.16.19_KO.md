# 0.16.19 적용 소스

테스트 브랜치 `test/crpg-v01414-story`에 게시한 **최종 전달문의 전체 40자리 커밋 SHA**를 사용한다. 같은 커밋 안에 자기 자신의 SHA를 넣을 수 없으므로 아래 자리만 최종 SHA로 채운다. 브랜치 최신값을 자동 조회해 대체하지 않는다.

## 테스트 서버

```bash
RELEASE_SHA='최종_전달문의_0.16.19_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

기존 설치기가 고정 커밋의 검증 배포본을 확인한다. 배포본이 아직 준비되지 않았다면 설치자가 준비를 기다린 뒤 같은 명령을 실행한다. 소스 게시 작업에서는 워크플로 완료를 기다리거나 실제 VPS를 설치하지 않았다.

## 본서버 적용

테스트 서버에서 확인한 **동일한 SHA**로 적용한다.

```bash
RELEASE_SHA='테스트한_0.16.19_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

기존 운영 승격 스크립트를 사용하며 운영 저장은 유지한다. 이 작업에서 실제 운영 승격이나 main 병합은 실행하지 않았다. 변경·검증·저장 호환 범위는 [PATCH_0.16.19_KO.md](PATCH_0.16.19_KO.md)에 있다.
