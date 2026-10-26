# 0.16.27 적용 소스

테스트 브랜치는 `test/crpg-v01414-story`다. 최종 전달문 또는 함께 전달한 고정 SHA 적용 문서의 **전체40자리 커밋**을 아래에 넣는다. 배포 워크플로를 기다리지는 않았으며 실제 VPS 설치·본서버 승격·main 병합은 실행하지 않았다.

## 테스트 서버

```bash
RELEASE_SHA='최종_전달문의_0.16.27_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

해당 SHA의 배포본이 아직 없으면 워크플로가 끝난 뒤 같은 명령을 실행한다. 설치기는 지정 SHA와 다른 빌드를 설치하지 않는다.

## 본서버

위 SHA를 테스트 서버에 실제로 설치하고 확인한 뒤 같은 소스를 승격한다.

```bash
RELEASE_SHA='테스트한_0.16.27_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

기존 설치기의 백업·빌드 확인·실패 복구 절차를 사용한다. 테스트 서버의 운영자 설정은 본서버로 자동 복사되지 않는다. 운영자 개별 수치가 있으면 이번 기본 수치보다 우선하므로 해당 설정도 확인한다.

진행 중 저장 전투는 기존 수치·보상·드발린 바람길을 유지한다. 새 입장부터 변경된다. 전체 소스의 기준은 최종 GitHub 커밋이며 함께 제공하는 선별 소스 ZIP은 그 커밋의 변경 파일을 확인하기 위한 자료다. [변경·검증 정리](PATCH_0.16.27_KO.md)를 함께 읽는다.
