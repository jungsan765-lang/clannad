# 0.16.23 적용 소스

최종 전달문에 적힌 **전체 40자리 SHA**를 사용한다. 브랜치 최신값으로 자동 대체하지 않는다.

## 테스트 서버

```bash
RELEASE_SHA='최종_전달문의_0.16.23_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

배포본이 아직 준비되지 않았다면 준비된 뒤 같은 명령을 실행한다. 소스 게시 단계에서 워크플로 완료를 기다리지 않는다.

## 본서버 적용

테스트한 동일 SHA로 승격한다.

```bash
RELEASE_SHA='테스트한_0.16.23_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

기존 서버 DB를 유지하는 배포 절차다. 운영자 설정도 서버 DB에 저장된다. 테스트에서 입력한 밸런스는 JSON을 내보내 본서버 운영자 페이지에서 차이를 확인하고 별도로 적용한다.

적용 뒤 `/admin.html`의 **밸런스** 탭을 사용한다. 기존 운영자 로그인이 필요하며 일반 게임 계정으로 대신 로그인할 수 없다. [사용법](ADMIN_BALANCE_GUIDE_KO.md)과 [변경·검증](PATCH_0.16.23_KO.md)을 따른다. 이번 작업에서 실제 VPS 설치·운영 승격·main 병합은 실행하지 않았다.
