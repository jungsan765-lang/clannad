# 계정·자동저장·나선비경 랭킹 서버

현재 게임 주소와 GitHub 저장소는 그대로 사용합니다. GitHub Pages는 정적 파일만 제공하므로 계정과 서버 확정 자동저장에는 별도 서버가 필요합니다. 이 폴더는 Cloudflare Workers + D1 구현입니다. **배포 전이며 실제 가입·공식 랭킹은 아직 열리지 않았습니다.**

## 운영자가 준비할 것

1. Cloudflare 계정을 만듭니다. **2026년 9월 4일부터 Free/Paid 모두 Worker 비압축 크기 한도는 64 MiB이며, 종전의 gzip 3/10 MiB 제한은 폐지됐습니다. 용량을 이유로 유료 가입이나 카드 등록을 요구하지 않습니다.** 아래 dry-run의 `Total Upload`를 확인합니다. gzip 값은 한도 판정 기준이 아닙니다. Free의 요청당 CPU 한도 10ms와 시작 시간 1초는 별도이므로 가입·저장·전투 요청을 실제 Worker에서 검증해야 합니다. 이 게임의 Free CPU 적합성은 아직 검증하지 않았습니다.
2. 아래 명령으로 D1 DB를 만들고 출력되는 `database_id`를 `server/wrangler.jsonc`에 넣습니다.
3. 비밀번호용 서버 비밀값을 한 번 생성해 비밀 관리 도구에 보관한 뒤 Worker secret으로 등록합니다. **비밀번호·토큰·비밀값을 채팅이나 Git에 올리지 마세요.** 이 값을 바꾸면 기존 비밀번호를 검증할 수 없으므로 분실하거나 임의 교체하지 않습니다.
4. Worker 배포 주소를 `source/online_config.js`의 `apiBase`에 넣고 정적 게임을 다시 빌드합니다.
5. 게임에서 운영자용 계정을 직접 가입합니다. 계정 관리에 표시되는 **계정 ID(UUID)** 를 `ADMIN_ACCOUNT_IDS`에 넣고 Worker를 다시 배포합니다. 아이디 문자열이나 최초 가입자 순서로 운영 권한을 부여하지 않습니다.

공식 문서: https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/ · https://developers.cloudflare.com/workers/platform/limits/ · https://developers.cloudflare.com/d1/get-started/

## 배포 명령

Node 24, Python 3 환경에서 저장소의 `genshin-crpg/server` 폴더로 이동합니다. Wrangler 4는 Cloudflare 공식 CLI입니다.

```bash
npx wrangler@4 login
npx wrangler@4 d1 create genshin-crpg-online
# 출력된 database_id를 wrangler.jsonc에 기록한 후:
npx wrangler@4 d1 execute genshin-crpg-online --remote --file=schema.sql
npx wrangler@4 secret put PASSWORD_PEPPER
# 위 프롬프트에 비밀 관리 도구로 생성한 32자 이상의 무작위 값을 입력합니다.
npx wrangler@4 deploy --dry-run
# Total Upload(비압축)가 64 MiB 이하인지 확인합니다.
npx wrangler@4 deploy
```

v0.13.43 로컬 dry-run: `Total Upload: 35857.93 KiB / gzip: 4915.60 KiB`로, 비압축 약 35.02 MiB입니다. 크기 한도 64 MiB 이내임을 확인했습니다. 이 결과는 실제 요청 CPU·시작 시간 검증을 대신하지 않습니다.

`ALLOWED_ORIGIN` 기본값은 `https://clannad.shop`입니다. 다른 도메인으로 바꾸는 경우 실제 게임의 origin과 정확히 맞춥니다. API URL은 공개 설정이고 비밀값은 Worker secret에만 둡니다. `/health`가 `configured:true`와 `package.json`의 현재 게임 버전을 반환하는지 확인합니다. 기본 설정에는 유료 플랜 전용 `limits.cpu_ms`를 넣지 않았습니다.

게임 메뉴의 **나선비경 랭킹** 또는 기존 사이트의 `?view=ranking`으로 순위를 봅니다. 별도 랭킹 사이트나 새 도메인은 필요하지 않습니다.

## 운영 방식

- 가입에는 외부 인증과 이메일이 필요 없습니다. 비밀번호는 salt + 서버 pepper + PBKDF2-SHA256으로 해시하며 평문으로 저장하지 않습니다. 이메일 없는 방식이므로 비밀번호 자동 복구는 제공하지 않습니다.
- 공식 여정은 새 계정 여정부터 시작합니다. 기존 브라우저 저장은 그대로 기기 여정으로 이어갈 수 있으며 서버 랭킹에 가져올 수 없습니다.
- 서버가 동일한 Runtime으로 행동을 계산하고 결과·자동저장·랭킹을 D1 트랜잭션으로 함께 확정합니다. 임의 저장 파일이나 클라이언트 점수를 받는 API는 없습니다.
- 요청 ID와 저장 revision으로 중복 클릭·응답 유실·다중 탭 충돌을 처리합니다. 연결이 끊기면 같은 행동을 재전송합니다. 새 난수를 뽑아 이전 결과를 되돌릴 수 없습니다.
- 동료 딱지는 실패해도 남습니다. 같은 층 재입장은 가능합니다. 도전 초기화는 진행 층과 딱지를 함께 지우며, 최초 보상 수령 기록은 지우지 않습니다.
- 디버그는 `ADMIN_ACCOUNT_IDS`에 등록한 본인의 계정 ID로 로그인했을 때만 표시됩니다. 모든 디버그 요청은 서버가 권한을 다시 확인합니다. 공개 테스트 모드와 로컬 저장 기반 권한은 없습니다. 서버 연결 전에는 일반 기기 여정만 이용할 수 있습니다.
- 운영자 디버그를 사용하면 그 여정은 영구 비집계 처리되고 기존 랭킹이 삭제됩니다. 기존 테스트 저장이 남아 있어도 운영 권한을 얻지 못합니다.
- 랭킹은 최고 정복 층, 해당 도전의 누적 최단 라운드, 입장 횟수, 달성 시각 순입니다. 공개 응답에는 20명만 포함됩니다.
- 계정 삭제는 비밀번호와 아이디 재입력 후 계정·세션·진행·랭킹을 함께 제거합니다. 운영 DB 백업·Cloudflare 보존 정책은 서비스 설정을 따릅니다.
- 서버와 정적 게임은 같은 소스로 배포해야 합니다. 엔진 버전이 다르면 행동을 거부합니다. 새 콘텐츠 AI 작업을 합친 후 두 쪽을 함께 업데이트하세요.

## 로컬 검증

`genshin-crpg` 폴더에서:

```bash
python3 tools/build_server.py
node tests/test_online_server.mjs
node tests/test_update_v01341.cjs
node tests/test_abyss_v01341.cjs
node tests/test_osial_v01341.cjs
python3 tools/build.py
```

서버 테스트는 메모리 SQLite에서 실행하며 운영 계정이나 실제 D1 데이터를 사용하지 않습니다. 전투 테스트는 합법 범위의 장비·레벨·자연 생성 성유물 표본으로 각 층의 전투와 보상을 검증합니다. 능력치를 비정상적으로 올린 리월 메인스토리 테스트는 분기 연결 검증 전용이며 난이도 근거로 쓰지 않습니다.
