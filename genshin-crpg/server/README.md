# 계정·자동저장·나선비경 랭킹 서버

현재 게임 주소와 GitHub 저장소는 그대로 사용합니다. GitHub Pages는 정적 파일만 제공하므로 계정과 서버 확정 자동저장에는 별도 서버가 필요합니다. 이 폴더는 Cloudflare Workers + D1 구현입니다. 운영 API는 `https://genshin-crpg-online.jungsan765.workers.dev`이며 D1 `genshin-crpg-online`에 연결되어 있습니다.

## 이 브랜치의 운영 반영

운영에는 아직 적용하지 않은 계정별 SQLite Durable Object 구현입니다. 기존 D1·계정·세이브·비밀번호 pepper를 유지합니다. **D1을 삭제하거나 재생성하지 않습니다.**

- [종합 분석과 측정](../docs/server-performance-ko.md)
- [시험·배포·이전·롤백 안내](../docs/server-operations-ko.md)
- [설계 계약](../docs/server-architecture-v2.md)

먼저 한국에서 `test-server.cmd`로 별도 시험 서버를 측정합니다. 검토가 끝난 최종본만 `deploy-server.cmd`로 반영합니다. 두 실행기는 `genshin-crpg` 폴더에 있습니다. 직접 Wrangler를 사용할 때도 이 폴더에서 `--config server/wrangler.jsonc`를 지정합니다. 기존 서버의 비밀번호 pepper·운영자 ID는 유지합니다.

`engineVersion`은 게임 규칙·콘텐츠·필수 프로토콜의 호환성입니다. 서버 성능 구현은 `serverBuild`로 별도 표시합니다. 서버 구현만 바뀌면 Pages 업데이트가 필요하지 않습니다. 작은 응답을 지원하는 UI는 처음 한 번 배포합니다.

2026-09-04부터 Worker 크기 제한은 Free/Paid 모두 비압축 64MiB입니다. gzip 크기 때문에 유료 플랜을 요구하지 않습니다. CPU·시작 시간·저장 사용량은 별도이며 실제 시험 결과와 현재 계정 플랜을 확인합니다. [공식 변경 안내](https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/)

## 운영 방식

- 가입에는 외부 인증과 이메일이 필요 없습니다. 비밀번호는 salt + 서버 pepper + PBKDF2-SHA256으로 해시하며 평문으로 저장하지 않습니다. 이메일 없는 방식이므로 비밀번호 자동 복구는 제공하지 않습니다.
- 공식 여정은 새 계정 여정부터 시작합니다. 기존 브라우저 저장은 그대로 기기 여정으로 이어갈 수 있으며 서버 랭킹에 가져올 수 없습니다.
- 서버가 동일한 Runtime으로 행동을 계산하고 결과·자동저장·revision·receipt를 DO SQLite 트랜잭션으로 확정하고 랭킹은 D1에 비동기로 반영합니다. 임의 저장 파일이나 클라이언트 점수를 받는 API는 없습니다.
- 요청 ID와 저장 revision으로 중복 클릭·응답 유실·다중 탭 충돌을 처리합니다. 연결이 끊기면 같은 행동을 재전송합니다. 새 난수를 뽑아 이전 결과를 되돌릴 수 없습니다.
- 동료 딱지는 실패해도 남습니다. 같은 층 재입장은 가능합니다. 도전 초기화는 진행 층과 딱지를 함께 지우며, 최초 보상 수령 기록은 지우지 않습니다.
- 디버그는 `ADMIN_ACCOUNT_IDS`에 등록한 본인의 계정 ID로 로그인했을 때만 표시됩니다. 모든 디버그 요청은 서버가 권한을 다시 확인합니다. 공개 테스트 모드와 로컬 저장 기반 권한은 없습니다. 서버 연결 전에는 일반 기기 여정만 이용할 수 있습니다.
- 운영자 디버그를 사용하면 그 여정은 영구 비집계 처리되고 기존 랭킹이 삭제됩니다. 기존 테스트 저장이 남아 있어도 운영 권한을 얻지 못합니다.
- 랭킹은 최고 정복 층, 해당 도전의 누적 최단 라운드, 입장 횟수, 달성 시각 순입니다. 공개 응답에는 20명만 포함됩니다.
- 계정 삭제는 비밀번호와 아이디 재입력 후 계정·세션·진행·랭킹을 함께 제거합니다. 운영 DB 백업·Cloudflare 보존 정책은 서비스 설정을 따릅니다.
- 게임 규칙·콘텐츠·필수 프로토콜 버전이 다르면 행동을 거부합니다. 저장 구현만 바뀐 경우에는 정적 게임을 다시 배포하지 않습니다.

## 로컬 검증

`genshin-crpg` 폴더에서:

```bash
npm run build:server
node tests/test_online_server.mjs
node tests/test_update_v01341.cjs
node tests/test_abyss_v01341.cjs
node tests/test_osial_v01341.cjs
npm run build
```

서버 테스트는 메모리 SQLite에서 실행하며 운영 계정이나 실제 D1 데이터를 사용하지 않습니다. 전투 테스트는 합법 범위의 장비·레벨·자연 생성 성유물 표본으로 각 층의 전투와 보상을 검증합니다. 능력치를 비정상적으로 올린 리월 메인스토리 테스트는 분기 연결 검증 전용이며 난이도 근거로 쓰지 않습니다.
