# 0.16.20 적용 소스

테스트 브랜치 `test/crpg-v01414-story`에 게시한 **최종 전달문의 전체40자리 커밋 SHA**를 사용한다. 같은 커밋 안에 자기 SHA를 넣을 수 없으므로 아래 자리만 최종 전달값으로 채운다. 최신 브랜치를 자동 조회해 대신 사용하지 않는다.

## 테스트 서버

```bash
RELEASE_SHA='최종_전달문의_0.16.20_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

검증 배포본이 아직 준비되지 않았다면 설치자가 준비를 기다린 뒤 같은 명령을 실행한다. 소스 게시에서는 워크플로 완료를 기다리지 않는다.

## 본서버 적용

테스트한 **동일 SHA**로 기존 승격 스크립트를 실행한다.

```bash
RELEASE_SHA='테스트한_0.16.20_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

실제 서버 설치·운영 승격·main 병합은 이 소스 게시에서 실행하지 않았다. 변경과 검증은 [PATCH_0.16.20_KO.md](PATCH_0.16.20_KO.md), 원자료와 재현 절차는 [음식 검증 자료](data/food_balance_v01620/README_KO.md)를 따른다. 원소별 돌파 보상/요구량은 이번 음식 패치에서 변경하지 않았으며 별도 [검토](ASCENSION_ELEMENT_REVIEW_V01620_KO.md)에 기록한다.
