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

0.14.5: 이틀 주기 보스(안드리우스·드발린·타르탈리아·야타용왕)는 현실 시간 하루 1회(한국 시간 자정)로 바뀌었다. 장비 등급 색은 별 등급 기준이다. (0.14.5는 main에 병합됨.) 0.14.8부터 화면에서는 「일일 보스」라고 부른다.

0.14.8(`docs/PATCH_0.14.8_KO.md`): PC 틀은 창 크기를 따라 넓어진다(설정 「화면 크기」 작게·보통·크게 = 0.85·1·1.2배, 1280×720 미만·높이 1200 초과·약 2:1보다 넓은 창만 통째로 줄이거나 키움). 숨겨진 눈동자(몬드 외곽 초원·리월항 부두)는 안내 없이 「풍경 보기」(V) 안에서만 반짝인다(사용자: 「숨겨놔야지」). 위치를 알려 주는 카드·버튼·문구를 만들지 마. 필드 보스는 모두 합쳐 현실 시간 12시간마다 3번(한국 시간 0시·12시 초기화, `s.fieldBossWindow`), 보스별 게임 내 재등장 대기는 없앴다(사용자 결정).

0.14.7(UI 전면 개편, 브랜치 `crpg/ui-overhaul`): `docs/PATCH_0.14.7_KO.md`를 먼저 읽어. 새 화면은 `app_shell.js`가 기존 화면 함수의 DOM을 **옮겨서** 배치하는 방식이라, 기존 기능 모듈을 고치지 않고도 동작이 유지된다. 새 화면 요소는 이 셸에 붙이고(`CRPGShell.extraTools`/`extraTiles`), 스타일은 `shell.css`의 `body.teyvat` 범위에 둔다. 효과음은 `app_sound.js`가 맡으며 원신 녹음만 쓴다(사용자: 「원신에 있는 SE 써. 합성 다 없애버려」). 소리마다 후보(`CHOICES`)를 두고 사용자가 「효과음 고르기」에서 들어 보고 고른 것을 기본으로 한다. 예외로 전투 시작은 사용자 요청에 따라 0.14.7 중간 버전의 합성음을 녹음 파일(`prev_battle_start`)로 되살렸다. 바위는 비경 문 소리 앞부분(끝의 「츠컹」 없음), 풀은 사용자 요청으로 새로 만든 「서걱」 소리(`made_dendro_*`)다. 리월에서는 `tools/gen_liyue_theme.cjs`가 만든 갈색·주황 덮어쓰기 규칙이 `shell.css` 끝에 붙는다(`shell.css` 색을 고치면 다시 돌릴 것). 《His Resolution》의 뒤쪽 부분은 사용자가 나중에 레이드 음악으로 쓰고 싶어 한다. PC 브라우저에서는 `index.html`의 맨 앞 스크립트가 게임을 iframe 틀에 넣는다(「컴퓨터는 화면이 늘어날 때마다 깨지니 틀을 만들자, 제대로 크기 나오게」; 0.14.8부터 크기 규칙은 아래). 안쪽 문서는 `html.crpg-framed`, 테스트·휴대폰·`?frame=0`은 틀 없음. 제목 글자는 원래 굵은 고딕을 유지한다(명조·그라데이션은 잘 안 보인다는 지적). 테스트 서버(test.clannad.shop) 배포: `test/*` 또는 `release/*` 브랜치(그 버전 변경만)에서 main으로 Draft PR을 열면 CI가 검사·빌드 후 `crpg-test-latest`(게임 파일·테스트 API 서버 묶음·설치 스크립트)를 올리고, 서울 VPS에서는 운영자가 `install-fixed-region-test-release.sh`로 내려받아 바꿔 끼우기만 한다(`docs/PATCH_0.14.7_KO.md`). 1GB VPS에서 npm·빌드·검사를 돌리지 말고 `genshin-crpg-fixed-region-update.timer`를 다시 켜지 마(메모리 부족으로 운영까지 멈춘 적이 있음). `staging/crpg-seoul-node-v0145`는 끝난 인프라 브랜치이므로 테스트 PR에 다시 쓰지 마. 운영(clannad.shop)은 사용자가 「운영 반영」이라고 말하기 전에는 건드리지 않는다. 채팅·교환은 `CRPG_FEATURES`로 켜며 운영 DB는 기본으로 꺼져 있다. 다음 큰 작업은 다인 모드다(호스트는 주인공 고정, 참가자는 캐릭터 1명, 전투 중 참여 가능, 나선비경 등 단독 도전 불가).