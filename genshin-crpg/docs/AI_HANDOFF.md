# 다음 AI에게 전달할 프롬프트

`jungsan765-lang/clannad`의 `genshin-crpg` 작업을 이어서 해줘. 먼저 최신 main과 미반영 PR을 확인하고 별도 브랜치에서 작업해.

현재 운영 구성은 GitHub Pages(`https://clannad.shop/genshin-crpg/dist/`) 정적 클라이언트 + Cloudflare Worker(`https://genshin-crpg-online.jungsan765.workers.dev`) authoritative API + D1이다. 정적 파일 업로드만으로 서버 로직은 바뀌지 않는다. Worker는 `server/worker.mjs`, 설정은 **`server/wrangler.jsonc`**이며 빌드 명령이 `tools/build_server.py`로 공통 엔진을 생성한다. 운영 D1·세이브·비밀값을 재생성하거나 덮어쓰지 마.

배포 방식이 바뀌었다. Pages Source는 이미 **GitHub Actions**다. main push/PR은 검증만 하고 배포하지 않는다. `crpg-sync-dist.yml`의 workflow_dispatch에서 **main + publish=true**일 때만 게시한다. 소스 수정 → `npm test` → `npm run test:browser` → `npm run build` → `CRPG_TEST_DIST=1 npm run test:browser` → production artifact 배포 순서다. dist를 main에 중간 커밋하며 배포를 반복하지 마. 전체 사이트의 기존 이미지 파일도 함께 보존해야 하므로 게임 dist만 Pages 루트로 올리면 안 된다. 워크플로의 `prepare_pages.py`를 사용해. 서버 `/health`의 ok/configured/version이 해당 클라이언트와 일치해야 Pages 게시가 허용된다. health 확인은 워크플로처럼 curl을 사용한다.

v0.13.48에는 전체 전투의 서버 로그에 대상 ID·HP 전후·행동 번호를 포함시키고 메뉴 문맥/재접속/저장 재시도를 수정했다. v0.13.49 변경은 일반 대사 읽기를 즉시 표시하고 검증 가능한 명령 목록으로 묶어 서버 체크포인트에 저장하는 구조다. 선택·보상·이동·편성·장비·전투·생활 시작/완료는 즉시 서버 확정한다. 읽은 위치는 표시 전에 계정별 기기 저널에 남기고, 동일 requestId로 복구한다. 서버 응답이 와도 이미 읽은 대사를 되돌리지 마. 채집·현장 작업 시간에는 시작 저장을 겹쳐 처리한다. 전투 준비 동작은 응답 대기 동안 이어지고 HP/피해는 확정 로그에서만 재생한다. 장비 장착 대기는 화면 가운데 `장착 중…` 하나로 표시한다.

배포 상태를 추측하지 말고 main SHA, Actions run, 실제 release.json과 Worker health를 확인해. v0.13.49는 서버와 클라이언트를 함께 반영해야 한다. Cloudflare 인증은 사용자의 로컬 Wrangler 로그인 환경을 쓸 수 있다. 전달용 서버 ZIP은 컴파일된 engine과 wrangler.jsonc/build 제외본, deploy.cmd를 포함한다. 비밀 토큰을 채팅에 붙여 넣도록 요구하지 마.

`docs/authoritative-flow.md`와 `docs/validation-v01349.json`을 먼저 읽어. 테스트 기대값만 바꾸지 말고 실제 플레이 UI와 D1 저장 행을 비교해. 528개 카드 전체가 구현된 것은 아니다. 기존 미구현 효과 281개와 조건 제한 19개를 완료했다고 보고하지 마.
