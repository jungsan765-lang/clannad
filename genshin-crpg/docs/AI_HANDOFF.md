# 다음 AI에게 전달할 프롬프트

`jungsan765-lang/clannad`의 `genshin-crpg`를 작업해. 최신 main을 확인하고 별도 브랜치에서 수정해. 현재는 **GitHub Pages 정적 클라이언트 + Cloudflare Worker/D1 authoritative 서버**다. 예전 동적 웹서버 방식으로 배포하지 마. 운영 D1·기존 세이브·비밀값은 보존해.

소스 → `npm test` → 소스 브라우저 회귀검증 → `npm run build` → `CRPG_TEST_DIST=1 npm run test:browser` → 검증된 Pages artifact 순서다. PR/main push는 검증만 한다. `.github/workflows/crpg-sync-dist.yml`을 **main + publish=true**로 수동 실행해야 Pages가 게시된다. dist 중간 커밋으로 배포를 반복하지 마. 기존 사이트 이미지도 보존해야 하므로 `prepare_pages.py`를 쓰고 게임 dist만 Pages 루트에 올리지 마.

v0.13.50부터 **클라이언트 appVersion과 서버 engineVersion을 분리**했다. `tools/engine_identity.py`가 실제 런타임·콘텐츠·프로토콜의 해시를 만든다. Pages release.json과 Worker /health의 engineVersion이 같으면 UI 버전이 달라도 배포할 수 있다. **UI/CSS/안내 문구/이미지만 바뀌면 기존 Worker를 다시 배포할 필요가 없다.** 런타임·콘텐츠 규칙·서버 프로토콜을 바꾸면 서버 검증/배포가 필요하다. 해시나 테스트를 수동으로 맞춰 통과시키지 마. Worker 엔트리 변경도 별도로 반드시 배포해.

대사마다/선택마다 서버 저장을 기다리게 하지 마. **한 개짜리 주인공 응답, 일반 대화 선택, 이름 응답도 장면 끝에 묶어 저장**한다. 명령은 표시 전에 계정별 기기 저널에 보관하고 서버가 순서대로 재실행한다. 대화 중 시간 간격으로 저장하는 debounce는 없다. 장면 끝, 대화에서 나가기, 명시적 동기화/종료, 전투·이동 등 서버 행동 경계에서 저장한다. 새로고침·응답 유실은 같은 requestId로 복구한다. 무작위 보상과 전투 판정은 서버 확정을 유지한다. MENU만으로는 서버 revision을 만들지 않으며, 미저장 대화가 있을 때 그 대화를 체크포인트하는 경우만 있다.

교류 활동은 모든 캐릭터/루트에서 `actionReason`과 `relationshipActivityReason`을 공유한다. 개인임무 미완료/활동 불가면 버튼을 disabled로 하고 조건은 붉게 표시한다. 서버 오류는 **확실히 미저장인 REJECTED**와 **저장 여부 불명**을 구분한다. REJECTED는 pending을 해제하고 다른 행동을 허용한다. DB 쓰기 이후 오류/응답 유실은 pending/requestId를 유지해 영수증으로 확인한다. 모든 500 오류의 pending을 무조건 지우거나, 모든 오류를 영구 대기로 남기지 마.

전투 HP/다단/광역 연출은 확정 서버 로그를 사용하고, 채집/현장 작업은 시작 응답 대기를 작업 시간에 포함한다. 전투 새로고침·재접속 이탈은 패배 처리한다. 장비 장착 대기는 가운데 `장착 중…` 하나로 표시한다.

Worker 빌드: `npm run build:server`, 설정: `server/wrangler.jsonc`. 현재 자동 Cloudflare 배포 인증은 구성되지 않았다. 서버 변경 배포는 사용자의 로컬 Wrangler 로그인 환경 또는 정식으로 구성된 CI 인증을 사용한다. 비밀 토큰을 채팅으로 요구하지 마. main SHA/Actions 결과/실제 release.json/Worker health를 보고 배포 여부를 판단해. 배포 ZIP을 만들었다는 이유만으로 운영 반영 완료라고 말하지 마.

`docs/authoritative-flow.md`를 읽어. 테스트는 실제 UI와 Worker/SQLite 저장 행을 비교한다. 기존 미구현 카드 효과 281개 및 조건 제한 19개는 이번에 구현한 것이 아니다. 528개 카드가 전부 완성됐다고 보고하지 마.
