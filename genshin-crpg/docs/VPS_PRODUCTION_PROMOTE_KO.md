# 테스트 설치와 본서버 적용 소스

이번 작업에서 운영 서버 배포는 실행하지 않았다. 아래는 사용자가 서버에서 실행할 설치/승격 소스다. 워크플로가 배포 파일을 만들 때까지 기다리는 일은 사용자 쪽에서 한다. 최종 답변에서 받은 **40자리 테스트 게시 커밋 SHA**를 사용한다. `crpg-test-latest`가 가리키는 현재 파일과 그 SHA가 다르면 설치기가 거부하는 것이 정상이다.

## 테스트 서버 설치

최종 게시 SHA의 스크립트를 받아 실행한다. 서버에서는 root 권한이 필요하다. 스크립트는 GitHub 릴리스의 클라이언트/서버 파일이 같은 커밋인지 검사한다.

```bash
TEST_SHA='최종_답변의_40자리_커밋_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$TEST_SHA/genshin-crpg/tools/install-fixed-region-test-release.sh" -o /tmp/install-fixed-region-test-release.sh
sudo env CRPG_EXPECTED_TEST_SHA="$TEST_SHA" bash /tmp/install-fixed-region-test-release.sh
```

SHA 자리의 안내 문구를 실제 값으로 교체한 뒤 실행한다. 스크립트 다운로드가 성공했는지 확인하고 다음 명령을 실행한다.

설치 대상은 기존 테스트 환경이며 운영 세이브를 쓰지 않는다. 설치기는 같은 서버의 중복 설치를 직렬화하고 클라이언트/서버의 커밋·엔진 일치를 확인하며, 실패 시 이전 설치로 복원한다. 릴리스 파일이 아직 생성되지 않았다면 워크플로 완료 후 같은 명령을 실행한다. 이 문서가 서버에 설치됐다는 증거는 아니다.

## 본서버 적용 소스

먼저 **같은 SHA가 테스트 서버에 실제 설치되어 있어야 한다.** 테스트 설치 후 직접 확인한 버전을 운영으로 승격하는 기존 스크립트를 사용한다.

```bash
TEST_SHA='최종_답변의_40자리_커밋_SHA'
curl -fsSL "https://raw.githubusercontent.com/jungsan765-lang/clannad/$TEST_SHA/genshin-crpg/tools/promote-test-release-to-production.sh" -o /tmp/promote-test-release-to-production.sh
sudo bash /tmp/promote-test-release-to-production.sh "$TEST_SHA"
```

승격기는 테스트 배포 SHA 및 클라이언트/서버 일치를 확인하고, 운영 SQLite 세이브를 백업한 뒤 같은 파일을 운영에 적용한다. 기존 운영 환경/세이브/프록시 설정을 보존하고 테스트 표시 설정을 제거한다. 새 API의 상태 확인이 실패하면 화면 교체 전에 API를 이전 상태로 되돌린다. 화면 교체 뒤 별도 되돌리기는 스크립트가 출력하는 이전 경로를 사용한다.

운영 데이터가 있는 서버에서 이 명령을 실행하면 실제 운영 배포가 바뀐다. 이번 AI 작업에서는 실행하지 않았다. 최종 보고에는 **소스 게시**, **테스트 설치**, **본서버 설치**를 구분한다. 릴리스가 만들어졌다는 사실만으로 본서버 적용 완료라고 기록하지 않는다.
