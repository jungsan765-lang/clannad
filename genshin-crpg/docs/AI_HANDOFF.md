# 다음 AI에게 전달할 프롬프트

`jungsan765-lang/clannad`의 `genshin-crpg`를 작업해. 최신 main을 확인하고 별도 브랜치에서 수정해. 현재는 **GitHub Pages 정적 클라이언트 + Cloudflare Worker/D1 authoritative 서버**다. 예전 동적 웹서버 방식으로 배포하지 마. 운영 D1·기존 세이브·비밀값은 보존해.

개발 중 실제 플레이 확인은 우선 **로컬 격리 환경**을 사용한다. Windows에서는 `dev-local.cmd`가 로컬 정적 게임 서버 + 로컬 Worker + 로컬 D1을 함께 띄우며, `source/`, `content/`, `server/worker.mjs` 변경을 감지해 다시 빌드한다. 로컬 D1은 `.local/wrangler`에 저장되고 `reset-local.cmd`로만 초기화한다. 로컬 개발 경로에 `deploy` 또는 `--remote`를 추가하지 말고 운영 D1을 연결하지 마. 자세한 내용은 `docs/LOCAL_DEVELOPMENT_KO.md`를 따른다.

테스트 후보는 0.14.1, 0.14.2처럼 올려. 사용자의 최종 승인 전에는 main 병합이나 운영 Worker/D1/Pages 배포를 하지 마. 정식 큰 배포 때만 0.15.0처럼 올려.

소스 → `npm test` → 소스 브라우저 회귀검증 → `npm run build` → `CRPG_TEST_DIST=1 npm run test:browser` → 검증된 Pages artifact 순서다. PR/main push는 검증만 한다. `.github/workflows/crpg-sync-dist.yml`을 **main + publish=true**로 수동 실행해야 Pages가 게시된다. dist 중간 커밋으로 배포를 반복하지 마. 기존 사이트 이미지도 보존해야 하므로 `prepare_pages.py`를 쓰고 게임 dist만 Pages 루트에 올리지 마.

v0.13.50부터 **클라이언트 appVersion과 서버 engineVersion을 분리**했다. `tools/engine_identity.py`가 실제 런타임·콘텐츠·Worker 엔트리·프로토콜의 해시를 만든다. Pages release.json과 Worker /health의 engineVersion이 같으면 UI 버전이 달라도 배포할 수 있다. **UI/CSS/안내 문구/이미지만 바뀌면 기존 Worker를 다시 배포할 필요가 없다.** 런타임·콘텐츠 규칙·서버 프로토콜을 바꾸면 서버 검증/배포가 필요하다. 해시나 테스트를 수동으로 맞춰 통과시키지 마. Worker 엔트리 변경도 이 검사에 포함된다.

대사마다/선택마다 서버 저장을 기다리게 하지 마. **한 개짜리 주인공 응답, 일반 대화 선택, 이름 응답도 장면 끝에 묶어 저장**한다. 명령은 표시 전에 계정별 기기 저널에 보관하고 서버가 순서대로 재실행한다. 대화 중 시간 간격으로 저장하는 debounce는 없다. 장면 끝, 대화에서 나가기, 명시적 동기화/종료, 전투·이동 등 서버 행동 경계에서 저장한다. 새로고침·응답 유실은 같은 requestId로 복구한다. 무작위 보상과 전투 판정은 서버 확정을 유지한다. MENU만으로는 서버 revision을 만들지 않으며, 미저장 대화가 있을 때 그 대화를 체크포인트하는 경우만 있다.

교류 활동은 모든 캐릭터/루트에서 `actionReason`과 `relationshipActivityReason`을 공유한다. 개인임무 미완료/활동 불가면 버튼을 disabled로 하고 조건은 붉게 표시한다. 서버 오류는 **확실히 미저장인 REJECTED**와 **저장 여부 불명**을 구분한다. REJECTED는 pending을 해제하고 다른 행동을 허용한다. DB 쓰기 이후 오류/응답 유실은 pending/requestId를 유지해 영수증으로 확인한다. 모든 500 오류의 pending을 무조건 지우거나, 모든 오류를 영구 대기로 남기지 마.

전투 HP/다단/광역 연출은 확정 서버 로그를 사용하고, 채집/현장 작업은 시작 응답 대기를 작업 시간에 포함한다. 전투 새로고침·재접속 이탈은 패배 처리한다. 장비 장착 대기는 가운데 `장착 중…` 하나로 표시한다.

Worker 빌드: `npm run build:server`, 운영 설정: `server/wrangler.jsonc`, 로컬 설정: `server/wrangler.local.jsonc`. 현재 자동 Cloudflare 배포 인증은 구성되지 않았다. 서버 변경 운영 배포는 사용자의 로컬 Wrangler 로그인 환경 또는 정식으로 구성된 CI 인증을 사용한다. 비밀 토큰을 채팅으로 요구하지 마. main SHA/Actions 결과/실제 release.json/Worker health를 보고 배포 여부를 판단해. 배포 ZIP을 만들었다는 이유만으로 운영 반영 완료라고 말하지 마.

`docs/authoritative-flow.md`를 읽어. 테스트는 실제 UI와 Worker/SQLite 저장 행을 비교한다. 기존 미구현 카드 효과 281개 및 조건 제한 19개는 이번에 구현한 것이 아니다. 528개 카드가 전부 완성됐다고 보고하지 마.

0.14.3~0.14.4 게임 규칙(자세한 내용은 `docs/PATCH_0.14.4_KO.md`): 나선비경 화면 문구·출시 노트에 풀이를 적지 마(방 설명은 장면만, 테스트가 검사). 10층부터 파티 전원 Lv.20. 진형 이름은 원신 세계관의 일반 낱말(돌격·연계·수호·기동·균형 진형)로 쓰고 다른 게임 용어를 가져오지 마. 전용 무기 원소폭발 연출은 「공명 각성」이며 '컷인'이라 부르지 마. 필드 보스는 보스마다 고정 레벨(몬드 10~13, 리월 14~20)이고 난이도 단계를 나누지 마(사용자 결정). 지맥의 꽃은 단계(1~5)가 있고 현실 시간 정각마다 자리를 옮긴다. 리월 동료는 몬드보다 얻기 어렵게(레벨 조건·비용) 하되 성능은 올리지 마. 동료 E/Q 주기는 `runtime_skill_rhythm.js` 한 곳에서 정하고, 전투 밸런스는 전용 무기를 든 파티 기준으로 맞춰(나선비경 기준 파티도 4층부터 전용 무기).

0.14.5: 이틀 주기 보스(안드리우스·드발린·타르탈리아·야타용왕)는 현실 시간 하루 1회(한국 시간 자정)로 바뀌었다. 장비 등급 색은 별 등급 기준이다. 사용자 사용 한도 때문에 작업이 끊기면 `docs/PATCH_0.14.4_KO.md`와 `docs/PATCH_0.14.5_KO.md`, 브랜치 `crpg/v0143-content-audit`(PR 미병합)부터 이어서 확인해.

메인스토리 K 루트 원고판(브랜치 `claude/story-main-manuscript-qlknji`, PR #19, 사용자 검토 완료 2026-10-01): 이세계 루트 리월 1~4장(K1·K2)과 몬드 1~5장(모든 갈래: K, 모름 A→AA/AB, 모름 B) 본문을 `tools/editorial/main_story_k/*.md` 원고로 다시 썼고, `source/runtime_main_story_k_content.js`+`source/runtime_main_story_k.js`가 시작 시 설치한다(문법·규칙은 그 폴더 README). **테스트 서버에 넣을 때는 이 브랜치를 현재 테스트 라인(`test/…` 브랜치)에 병합해서 올려.** 이야기 런타임이 바뀌므로 engineVersion이 달라지고, 서버(`staging/crpg-seoul-node-v0145`)도 같은 코드로 다시 올라가야 테스트 팩이 설치된다. 병합 충돌은 버전 문자열 파일에만 난다: `package.json`·`package-lock.json`·`content/release-notes.json`(원고 항목을 맨 위에 두고 테스트 라인 항목을 `previous`로)·`tests/test_local_dev_config.cjs`·`tests/helpers_durable.mjs`(테스트 라인 쪽을 유지)·`tools/build.py`(파일 목록에 `runtime_main_story_k_content.js`,`runtime_main_story_k.js` 두 개를 추가)·`docs/PATCH_0.14.8_KO.md`(테스트 라인에 같은 이름이 있으면 원고판 문서를 새 버전 번호로 바꿔 둘 것). 원고 수정은 원고 `.md`를 고치고 `node tools/editorial/compile_main_story_k.cjs` → `node tests/test_main_story_k_v0148.cjs` → `QA_LEAVES=K1,K2 node tests/test_liyue_rework_flow.cjs` 순서로 확인한다. 몬드 1~5장 K 분기 원고(`mond_ch1_k.md`~`mond_ch5_k.md`)도 같은 PR에 들어 있다(2026-10-01). 몬드는 U 분기(`??=`로 얼림)와 AA/AB/B 잎이 원문 그대로이므로 `MOND_LEAVES=K,AA,AB,B node tests/test_mond_full_v01344.cjs`로 네 잎을 모두 확인한다. 여행자 루트 원고는 스토리 스레드가 이어서 작업 중이다.
