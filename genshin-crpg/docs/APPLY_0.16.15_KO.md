# 0.16.15 적용 명령

이 문서를 제공한 최종 답변 또는 PR20의 **40자리 고정 커밋 SHA**를 아래 `RELEASE_SHA`에 넣는다. 브랜치 최신값을 자동 선택하지 않는다. 테스트 서버에 같은 SHA를 적용해 확인한 뒤 운영 명령으로 그 배포본을 복사한다. 이 작업에서는 실제VPS설치나 운영승격을 실행하지 않았다.

## 테스트 서버

```bash
RELEASE_SHA='<최종 답변의 40자리 SHA>'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

CI 배포본이 아직 준비되지 않았으면 설치기는 기존 서버를 유지한다. VPS에서 빌드하거나 검사 프로그램을 돌리지 않는다. 같은 명령을 배포본 준비 후 다시 실행할 수 있다.

## 운영 서버

```bash
RELEASE_SHA='<테스트에서 확인한 동일한 40자리 SHA>'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

승격 스크립트는 테스트 서버의 실제 SHA와 API/클라이언트 엔진을 확인하고 운영 저장을 백업한 후 같은 배포본만 복사한다. 테스트 설치와 운영 승격은 별개다.

## 확인할 항목

- 건강한 고레벨 동료와 부상한 저레벨 동료를 함께 편성해도 숙박비가 부상자 기준인지.
- 숙박 표시 가격·실제 차감·회복·중복 결제 방지가 일치하는지.
- 업데이트 전부터 진행 중인 전투는 기존 능력치/보상으로 이어지는지.
- 새 특성/돌파 입장에만 새 고정 난이도가 적용되는지.

상세 수치와 검증 범위는 [PATCH_0.16.15_KO.md](PATCH_0.16.15_KO.md)를 따른다.
