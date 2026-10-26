# 0.16.26 적용 소스

테스트 브랜치: `test/crpg-v01414-story`. 최종 전달문 또는 함께 전달한 `APPLY_0.16.26_FIXED_SHA_KO.md`의 전체 40자리 SHA를 사용한다. 워크플로 완료를 기다린 뒤 이 명령을 실행하면 된다. 작성자가 실제 VPS 설치나 본서버 승격을 실행한 것은 아니다.

## 테스트 서버

```bash
RELEASE_SHA='최종_전달문의_0.16.26_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

설치기는 내려받은 배포본 SHA가 지정값과 다르면 설치를 중단한다. 아직 해당 배포본이 게시되지 않았다면 완료된 뒤 같은 명령을 다시 실행한다. 테스트 서버의 운영자 설정은 본서버로 자동 복사되지 않는다.

## 본서버

테스트 서버에 위 SHA가 실제 설치되어 있는 상태에서 같은 소스를 승격한다.

```bash
RELEASE_SHA='테스트한_0.16.26_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

기존 설치기의 백업·정확한 빌드 확인·실패 복구 절차를 사용한다. 진행 중 저장 전투는 새 나선 정산을 소급 적용하지 않고 저장한 순서로 이어간다. 새 방 또는 새 전투부터 수정된 순서를 사용한다.

함께 전달한 `crpg-0.16.26-source-overlay.zip`은 정확한 0.16.25 소스 위에 덮는 선별 소스다. DB·assets·UI 및 다른 AI의 코드는 포함하지 않는다. 전체 소스의 권위 있는 기준은 최종 GitHub 커밋이다. 변경 내용과 검증은 [패치 정리](PATCH_0.16.26_KO.md)에 있다.
