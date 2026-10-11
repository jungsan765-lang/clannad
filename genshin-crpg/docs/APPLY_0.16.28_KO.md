# 0.16.28 테스트·본서버 적용 소스

테스트 브랜치는 `test/crpg-v01414-story`입니다. 함께 전달한 적용 문서의 **0.16.28 전체 40자리 커밋 SHA**를 아래에 넣습니다. [변경과 검증 결과](PATCH_0.16.28_KO.md)를 먼저 확인합니다. 이번 작업은 소스 게시까지이며 실제 VPS 설치·본서버 승격·main 병합은 실행하지 않았습니다.

## 테스트 서버

```bash
RELEASE_SHA='전달문의_0.16.28_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$RELEASE_SHA" bash /tmp/install-fixed-region-test-release.sh
```

해당 SHA의 배포본이 아직 없으면 워크플로가 끝난 뒤 같은 명령을 실행합니다. 설치기는 지정 SHA와 다른 빌드를 설치하지 않습니다. 서버에서 직접 전체 게임을 빌드하는 절차를 추가하지 않습니다.

## 본서버

위 SHA를 테스트 서버에 실제 설치하고 확인한 뒤 같은 소스를 승격합니다.

```bash
RELEASE_SHA='테스트한_0.16.28_전체_40자리_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$RELEASE_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$RELEASE_SHA"
```

기존 설치기의 DB 백업·SHA 확인·API/클라이언트 동시 설치·실패 복구 절차를 사용합니다. 테스트 서버의 운영자 밸런스 설정은 본서버에 자동 복사되지 않습니다. 이번 패치는 기존 숫자·저장·보상을 바꾸지 않습니다.

## 캐시 설정과 설치 확인

기본값으로 실행하면 최적화가 적용됩니다. 런타임 캐시 수는 16개, 미사용 정리 시간은 600,000ms입니다. 직접 Node 서버를 시작하는 환경은 `CRPG_RUNTIME_CACHE_MAX`(정수 1~128), `CRPG_RUNTIME_CACHE_IDLE_MS`(정수 60,000~3,600,000ms)를 사용할 수 있습니다. 실제 RAM 측정 없이 최대값으로 올리지 않습니다. 캐시 수는 동시접속 인원 제한이 아닙니다.

설치 후 `/api/health`의 버전은 `0.16.28`, 서버 빌드는 `server-862ceb36200a8bfb6a64`여야 합니다. 엔진 지문은 `engine3-58331e639a984025612c388c2f4479d2d69cb59771b903939070895382e35003`입니다. 코드가 달라졌으므로 API와 클라이언트를 함께 설치하고 이전 화면은 새로 불러옵니다. 버전만 같고 빌드가 다르면 설치 성공으로 판단하지 않습니다.

게임 시작·신규 계정 공개 프로필·행동 저장/다시 읽기·운영자 밸런스·거래/협동의 실제 이용 경로를 확인합니다. 격리 검사 26개 통과와 실제 운영 서버의 설치 확인은 구분합니다.
