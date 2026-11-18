# 운영 주소 이전: clannad.shop → clannad.pe.kr (2026-11-18)

웹사이트 주소만 옮겼다. 서울 서버(49.247.134.37)의 게임, API, DB, 이미지 프록시 구조는 그대로다.

## 지금 상태: 두 주소 병행 운영

| 주소 | DNS | 서비스 |
|---|---|---|
| `clannad.pe.kr` | 가비아, A `@` → 49.247.134.37 (TTL 600) | 운영 게임, `/api`(8790), `/ping`·`/diagnostic`(8788), 옛 이미지 12개 폴더 프록시. Let's Encrypt 인증서는 Caddy가 자동 갱신 |
| `clannad.shop` | Cloudflare(프록시 끔), A → 49.247.134.37 | 위와 같은 경로, 같은 파일 (변경 없음) |
| `test.clannad.shop`, `api-staging.clannad.shop` | Cloudflare | 테스트 서버. 웹사이트 주소가 아니라 이번에 옮기지 않음 |
| `jungsan765-lang.github.io/clannad/` | GitHub Pages | `clannad.shop`으로 리다이렉트(그대로). 새 주소를 Pages 커스텀 도메인으로 등록하지 않음 |

- `/etc/caddy/conf.d/production.caddy`에는 `clannad.shop` 블록과, 그 블록을 그대로 복사한 `clannad.pe.kr` 블록이 있다.
- 운영 `online_config.js`는 `apiBase:location.origin+'/api'`다. 페이지를 연 주소의 API를 부른다. 서버는 같은 주소에서 온 요청을 허용하고, 다른 주소의 페이지가 부르면 403으로 거절한다. 그래서 `tools/promote-test-release-to-production.sh`도 같은 형식으로 쓰도록 바꿨다(`tests/test_v01413.cjs`가 확인).
- 서버 env의 `ALLOWED_ORIGIN=https://clannad.shop`은 바꾸지 않았다. 같은 주소 요청만 쓰므로 영향이 없고, 바꾸면 운영 API를 재시작해야 한다.

## 서버 작업 도구: `tools/clannad-domain-migration.sh`

서버에는 `/root/clannad-domain-migration.sh`로 올라가 있다. Caddy 경로와 `online_config.js`만 바꾸고, 서비스 재시작이나 DB 쓰기, 빌드는 하지 않는다. 단계마다 `clannad.shop`의 응답을 바꾸기 전과 비교하고, 다르면 바로 되돌린다.

| 단계 | 실행 시각 | 결과 |
|---|---|---|
| `prepare` (백업, `http://clannad.pe.kr` 추가, online_config) | 2026-11-18 23:00 | 백업 `/var/backups/clannad-domain/20261118-230049` (설정·env·Caddy 인증서 저장소·DB 3개의 읽기 전용 스냅숏, quick_check 통과) |
| 가비아 A 레코드 4개(GitHub IP) → 49.247.134.37 1개 | 23:05 무렵 (사용자) | 가비아 NS 3곳, Google·Cloudflare DNS 확인 |
| `https` | 23:07 | 인증서 `CN=clannad.pe.kr`, Let's Encrypt YE1, 만료 2027-02-16. 되돌리기 백업 `…/20261118-230745-https` |
| `redirect-old` | **아직 안 함** | 아래 "남은 일" 참고 |

되돌리기: `bash /root/clannad-domain-migration.sh rollback /var/backups/clannad-domain/<시각>` (Caddy 경로와 online_config만. DB는 건드리지 않는다). 상태 보기: `… status`.

## 확인한 것 (2026-11-18)

- 두 주소 모두 `/`, `/release.json`, `/api/health`, `/genshin-crpg/dist/`, `/ping`, `/admin.html`가 200이다. HTTP는 HTTPS로 308 리다이렉트된다.
- 실제 브라우저로 `clannad.pe.kr`에 접속하면 게임 첫 화면이 뜨고, API 주소가 `https://clannad.pe.kr/api`로 계산되며, `/api/ranking`이 200이다(운영 DB의 11월 랭킹이 표시됨).
- **이미지 (최우선):**
  - 옛 이미지 12개 폴더(GitHub 이미지 3,427개)는 폴더마다 첫·끝·중간·무작위 파일과 한글·공백 파일까지 58개를 골라 새 주소·옛 주소·raw.githubusercontent.com 원본에서 받아 비교했다. 상태 200, 형식, 바이트 크기가 모두 같았다. 4개는 sha256까지 원본과 같았다.
  - `?v=` 쿼리, 없는 파일, 폴더 경로, 대문자 확장자도 옛 주소와 같은 응답이다.
  - 운영 릴리스에 들어 있는 게임 이미지 1,576개는 전부 새 주소에서 200이고 크기가 정확했다. 무작위 25개는 sha256도 같았다.
  - 응답 헤더(`Access-Control-Allow-Origin: *`, 캐시, ETag)도 두 주소가 같다.
  - 3,427개 전부를 서버로 한꺼번에 받지는 않았다. 서버가 raw.githubusercontent.com에서 가져오는 구조라, 몰아서 받으면 GitHub가 서버 IP를 막아 실제 사용자 이미지가 깨질 수 있다.

## 브라우저에 저장된 데이터 (주소마다 따로 저장)

- 로그인(`crpg-online-session-v1`): 새 주소에서는 다시 로그인해야 한다. 계정 진행은 서버 DB에 있으므로 그대로 이어진다.
- 기기 저장(IndexedDB `crpg-player-saves`, 옛 `crpg-save:*`): 새 주소에서는 보이지 않는다. 옛 주소에서 「저장 백업 파일 내보내기」로 받아 새 주소에서 「백업 파일 가져오기」로 옮긴다.
- 아직 서버에 못 보낸 행동·계정(`crpg-online-pending-v1`, `crpg-online-pending-accounts-v2`): 옛 주소에서 접속해 동기화를 마쳐야 한다.
- 설정, 채팅 숨김 같은 개인 설정은 새 주소에서 처음 상태로 시작한다.

## 남은 일

1. 사용자 확인: 새 주소에서 실제 계정 로그인과 기기 저장 옮기기.
2. 옛 주소 리다이렉트: 위 데이터를 옮길 시간을 준 뒤 `bash /root/clannad-domain-migration.sh redirect-old`를 실행한다.
   - `https://clannad.shop/*`는 `https://clannad.pe.kr/*`로 308 리다이렉트된다. 이미지도 같은 경로로 넘어간다.
   - `/api`, `/ping`, `/diagnostic`은 열려 있는 옛 탭을 위해 계속 직접 응답한다.
   - 이 단계 전에 `main`에 브랜치 `chore/clannad-pe-kr-domain-main`을 반영한다. 이미지 점검 워크플로가 두 주소를 모두 검사하고, `tools/restore-legacy-images.sh`가 두 사이트 블록(리다이렉트 뒤에는 `clannad.pe.kr`만)에 이미지 경로를 복구하게 된다. 지금 서버에 있는 옛 복구 스크립트는 블록이 두 개면 아무것도 바꾸지 않고 멈춘다.
3. GitHub Pages: 새 주소를 커스텀 도메인으로 등록하지 않는다(새 주소는 서울 서버가 직접 서비스). Pages에는 커스텀 도메인과 별도인 "리다이렉트 목적지" 설정이 없다. 그래서 github.io 주소는 `clannad.shop`을 거쳐, 2단계 이후에는 `clannad.pe.kr`에 도착한다.
4. 서버 코드의 기본값(`allowedOrigin='https://clannad.shop'`)과 테스트들, 테스트 서버 주소는 그대로다. 운영은 env 값을 쓰므로 영향이 없다.
