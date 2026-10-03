# 서울 VPS에서 검증된 테스트판 설치하기

대상은 `test.clannad.shop`이다. 게임의 `admin.html`은 운영자 화면이고, 아래 명령을 넣는 VPS 터미널과 다르다. 현재 연결 정보는 Ubuntu 서버 `49.247.134.37`, SSH 사용자 `root`다. 비밀번호·개인 키·환경 파일 내용을 채팅이나 공개 저장소에 올리지 않는다.

## 1. VPS 접속

Windows는 PowerShell 또는 Windows Terminal, macOS는 터미널을 연다.

```bash
ssh root@49.247.134.37
```

비밀번호 입력 중에는 글자나 별표가 표시되지 않는다. 입력 후 Enter를 누른다. 최초 접속의 호스트 지문은 VPS 관리 콘솔의 지문과 확인한다. 기존 지문이 바뀌었다는 경고는 무시하거나 검사를 끄지 않는다. 접속이 안 되면 VPS 업체 관리 화면의 웹 콘솔에서도 다음 단계를 실행할 수 있다.

`root@...:~#` 형태의 프롬프트가 나오면 서버에 접속한 것이다. 일반 사용자로 접속했다면 `sudo -i`로 root 터미널을 연다.

## 2. 검증한 커밋 고정 후 설치

최종 전달문에 적힌 **40자리 검증 커밋**을 아래 첫 줄에 넣는다. 버전 이름이나 브랜치 이름을 넣으면 안 된다. GitHub 검사와 테스트 묶음 게시가 끝난 커밋이어야 한다.

```bash
TEST_SHA='검증한_40자리_커밋을_여기에_넣기'
curl -fsSLo /tmp/crpg-test-install-reviewed.sh \
  "https://raw.githubusercontent.com/jungsan765-lang/clannad/${TEST_SHA}/genshin-crpg/tools/install-fixed-region-test-release.sh" &&
CRPG_EXPECTED_TEST_SHA="$TEST_SHA" bash /tmp/crpg-test-install-reviewed.sh
```

설치기는 GitHub에서 검증한 서버·화면 묶음을 내려받고 커밋·엔진 일치를 확인한다. 두 묶음 준비가 모두 끝난 뒤 테스트 API를 재시작하고, 새 엔진·서버 빌드 지문·앱 버전이 모두 정상 응답하면 웹 파일을 전환한다. 동시 설치는 거절한다. 전환 중 실패하면 기존 API·웹 링크·systemd 설정·배포 표시를 복원한다. 롤백까지 실패한 경우에는 설정 백업 경로와 운영자 확인이 필요하다는 오류가 나온다.

성공 문구는 `Installed verified test release ... on test.clannad.shop.`이다. 같은 커밋을 다시 설치할 수도 있다. `Published test commit differs ...`가 나오면 다른 테스트판이 게시된 것이므로 검증한 새 커밋을 확인한다. SHA 검사 조건을 지워서 실행하지 않는다.

VPS에서는 `npm install`, 빌드, 테스트를 실행하지 않는다. 이전 자동 업데이트 스크립트나 `genshin-crpg-fixed-region-update.timer`를 다시 켜지 않는다. 1GB 서버에서 빌드가 메모리를 소진한 이력이 있다.

## 3. 설치 확인

```bash
systemctl is-active genshin-crpg-fixed-region-live.service
curl -fsS http://127.0.0.1:8789/health
curl -fsS https://test.clannad.shop/release.json
curl -fsS https://test.clannad.shop/api/health
curl -fsS https://test.clannad.shop/test-source-sha.txt
```

서비스가 `active`, 두 health가 `ok:true`, 화면과 API의 `engineVersion` 및 앱 버전이 같아야 한다. 설치기는 추가로 묶음의 실제 `serverBuild`와 실행 중인 API를 대조한다. 마지막 커밋은 `TEST_SHA`와 같아야 한다. 브라우저에서도 테스트 서버를 새로 열어 버전 표시와 기존 여정 불러오기를 확인한다. 이미 열어 둔 탭은 예전 화면 코드를 실행할 수 있다.

오류가 나면 반복 실행하기 전에 다음 상태를 확인한다.

```bash
systemctl status genshin-crpg-fixed-region-live.service --no-pager -l
journalctl -u genshin-crpg-fixed-region-live.service -n 80 --no-pager
df -h /opt /var/www /tmp
free -m
```

로그를 전달할 때는 계정·토큰·비밀번호 등 비밀값을 제외한다. DB나 release 폴더를 임의로 지우거나 운영 서비스를 재설치하지 않는다.

## 설치 경로와 범위

| 대상 | 위치 |
|---|---|
| 테스트 API | `/opt/genshin-crpg-test-server/current` |
| 테스트 웹 | `/var/www/genshin-crpg-test/current` |
| 테스트 서비스 | `genshin-crpg-fixed-region-live.service`, 포트 8789 |
| 서비스 설정 | `/etc/systemd/system/genshin-crpg-fixed-region-live.service.d/verified-release.conf` |
| 동시 설치 잠금 | `/run/lock/genshin-crpg-test-release.lock` |

이 절차는 테스트판 설치다. `main` 병합이나 `clannad.shop` 운영 승격을 실행하지 않는다. GitHub 게시 성공, VPS 설치 성공, 실제 화면·기기 검증 성공은 각각 별도의 확인 결과다.
