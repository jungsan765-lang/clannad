# 로컬 개발 환경

운영 사이트, 운영 Worker, 운영 D1을 건드리지 않고 PC 안에서 게임 전체 흐름을 확인하기 위한 환경입니다.

## 가장 쉬운 실행

Windows에서는 저장소의 `genshin-crpg/dev-local.cmd`를 더블클릭합니다.

첫 실행에서는 필요한 npm 패키지를 설치하고 다음 작업을 자동으로 합니다.

1. 서버 엔진 빌드
2. 정적 게임 빌드
3. 로컬 D1 생성 및 `server/schema.sql` 적용
4. 로컬 Worker 실행: `http://127.0.0.1:8787`
5. 로컬 게임 실행: `http://127.0.0.1:5173`
6. 브라우저 자동 열기

로컬에서 가입한 계정과 세이브는 `.local/wrangler` 아래에만 저장됩니다. 운영 D1 `genshin-crpg-online`에는 쓰지 않습니다.

## 준비물

- Node.js
- Python 3

Windows에서는 Python 실행 명령을 `py -3`, `python`, `python3` 순서로 자동 탐색합니다.

## 개발 중 수정 반영

`source/`, `content/`, `server/worker.mjs` 변경을 감지하면 서버 엔진과 게임을 자동으로 다시 빌드합니다. 빌드 완료 메시지가 나온 뒤 브라우저를 새로고침합니다.

`server/schema.sql`을 바꾼 경우에는 `dev-local.cmd`를 다시 실행해야 새 스키마가 적용됩니다.

## 테스트 데이터 초기화

`reset-local.cmd`를 실행합니다. 이 명령은 `.local/wrangler`만 지우며 운영 Cloudflare D1에는 접근하지 않습니다.

로컬 브라우저에 남아 있는 로그인 토큰은 DB 초기화 뒤 더 이상 유효하지 않을 수 있습니다. 그 경우 다시 로그인하거나 새 계정을 만듭니다.

## 안전 규칙

로컬 개발 명령에는 `deploy` 또는 `--remote`를 넣지 않습니다.

운영 배포가 필요한 경우에만 별도의 기존 운영 절차를 사용합니다.

- Worker 운영 배포: 사용자의 인증된 Wrangler 환경에서 명시적으로 실행
- Pages 운영 게시: `.github/workflows/crpg-sync-dist.yml`을 `main + publish=true`로 수동 실행

개발 중에는 버전 번호를 올리거나 운영 배포를 반복하지 않습니다.
