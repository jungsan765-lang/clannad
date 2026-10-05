# 남은 일 · 이어받기 (2026-10-06, 0.15.21 기준)

다음 AI가 이 문서와 `docs/AI_HANDOFF.md` 맨 위 0.15.21 항목을 먼저 읽는다. 사용자에게는 쉬운 한국어로, 깃 용어 없이 말한다.

## 1. 지금 상태
- 0.15.21: 전투 연출, 원작 아이콘, 버프 · 디버프 칸, 행동 순서. 내용은 `docs/PATCH_0.15.21_KO.md`에 있다.
- 브랜치: 작업은 `crpg/ui-overhaul`, 시험 줄은 `test/crpg-v01414-story`다. Draft PR #20이고 main에는 병합하지 않는다. 두 브랜치에 같이 올린다.
- 시험 서버(test.clannad.shop)는 사용자가 SHA를 고정한 설치 명령으로 직접 설치한다(`docs/VPS_TEST_INSTALL_KO.md`).
- 운영(clannad.shop)은 사용자가 「운영 반영」이라고 할 때만 바꾼다. 운영은 알파 서버이며, 나중에 사용자가 초기화한다.

## 2. 꼭 지킬 규칙 (요약 — 자세한 것은 AI_HANDOFF)
- 서울 VPS:
  - `genshin-crpg-fixed-region-update.timer`를 다시 켜지 않는다.
  - VPS에서 npm build/test를 돌리지 않는다. 빌드와 시험은 GitHub Actions에서 하고, VPS는 검증된 묶음만 받는다.
  - `staging/crpg-seoul-node-v0145` 브랜치를 쓰지 않는다.
- 남의 파일: `source/app_av.js`, `source/app_online.js`, `server/worker.mjs`, `.github/workflows/crpg-sync-dist.yml`.
- `dist/`, `reports/`는 커밋하지 않는다. 확인이 끝나면 `git checkout -- dist reports`와 `git clean -fdq -- dist reports`로 되돌린다.
- 저장소가 공개이므로 다음은 어디에도 적지 않는다: 관리자 비밀번호 · 해시, 시험자가 보낸 가입 문자열, 운영 DB · 저장 · 비밀값.
- 이야기 원고는 이야기 담당 세션의 것이다. 명백한 표시 · 고유명사 오류만 고친다. `docs/story-proposals/v01514-unapplied-story.patch`는 자동 적용하지 않는다.
- 이름은 한국 서버 공식 표기만 쓰고 출처로 확인한다(예: 타타우파 협곡, 페보니우스 기사단).
- 금지 사항:
  - 나선비경 공략을 글로 쓰지 않는다.
  - 숨은 신의 눈동자는 숨긴 채 둔다.
  - 보물상자 위치를 알려 주지 않는다(개수만).
  - 현금 결제는 없다.
- 소리는 원신 녹음만 쓴다. 아이콘 · 그림도 원작 그림을 쓰고, 직접 그린 아이콘은 쓰지 않는다.
  - 새로 받을 때는 파일 · 출처 · 크기를 말하고 사용자 허락을 받는다.
  - 받은 것은 `content/genshin-ui-assets.json`과 `assets/icons/CREDITS.md`에 적는다.
- 화면 확인:
  - 휴대폰은 빠짐없이 본다.
  - 실제로 눌러서 확인한다(사용자가 미리보기 창에서 같이 플레이한다).
  - 막힌 버튼은 누르면 이유를 말한다.
  - 창 안의 메시지는 그 창 안에 띄운다.
- 미리보기에서 전투 중에 새로고침하면 그 전투는 패배로 처리된다(60초 대기). 사용자가 싸우는 중에는 새로고침하지 않는다.

## 3. 0.15.21에서 이어지는 작은 일
1. **효과 이름 · 설명 채우기.**
   - 캐릭터 전용 상태(불 원소 부여 · 대청소 · 노래의 고리 등)는 표에 설명이 없다. 칩을 누르면 「설명이 없는 효과입니다」가 나온다.
   - 이름이 없는 상태(호두 혈매향, 타르탈리아 단류, 운명의 자리 효과 등)는 「알 수 없는 항목」으로 나온다.
   - 상태마다 하는 일은 `docs/STATUS_EFFECTS_KO.md` 조사표에 다 있다. 이름은 원작 공식 한국어 이름을 출처로 확인해 쓴다.
   - 넣을 곳: `app_experience.js`의 `battleStatusList`(설명 목록 추가). 이름은 `app_revision.js`의 `combatStatusNames`.
   - 칩 분류(버프 · 디버프 · 묶임)는 0.15.21에서 조사표대로 고쳤다.
   - 효과가 없는 상태 2개(ENCOURAGEMENT_TAG, STATUS_STUN)를 고칠지는 사용자와 정한다.
2. **반응으로 걸리는 상태도 즉시 표시.**
   - 지금은 약점 간파만 걸리는 순간 칩과 표시가 붙는다(`app_battle_fx_v01521.js`의 `APPLIES`).
   - 빙결 · 연소 · 감전 등은 재생이 끝난 뒤 붙는다.
   - 재생 기록에는 「상태가 걸렸다」는 줄이 없다. 로그(`presentation.js`의 `delta`)에 상태 부여를 남기거나, 반응 종류로 대응한다.
3. **무상의 바람 원소 부착 고증.** 사용자는 원소가 붙지 않는 보스로 알고 있다. 「고증은 나중에」로 미뤘다. 무상 시리즈 · 다른 보스의 원작 규칙을 출처로 확인하고 정한다.
4. **남은 글자.**
   - 능력치 줄과 방어구 · 장신구 · 특수 장비 빈 칸은 맞는 원작 그림을 못 찾아 글자다. 출처를 찾으면 바꾼다.
   - 이세계인 E · Q는 원작 그림이 없어 글자다.
5. **(선택) 동료가 자동으로 행동할 때** 재생 띠에 그 동료의 E · Q 원작 그림을 함께 띄운다.

## 4. 합의된 큰 일 (이 순서로)
1. **휴대폰 메인 화면 지도.**
   - 휴대폰 메인 화면에 지도가 바로 보이지 않는다(지금은 「이동」 탭).
   - 사용자가 처음에 「애매하다」고 했다. 만들기 전에 원하는 모양(작은 지도 · 펼치기 등)을 먼저 묻는다.
2. **채광 · 채집 미니게임.**
   - 지금은 10초 타이머다(`runtime_life.js`의 GATHER · MINE · HUNT. 낚시는 게이지형이 이미 있다).
   - 직접 해 보는 미니게임으로 바꾼다. 보상 · 하루 한도는 서버 규칙과 맞춘다.
3. **성장 개편과 치유 조정.**
   - 결정 사항: `docs/DESIGN_GROWTH_KO.md` — 레벨 상한 60, 돌파 10 · 20 · 30 · 40 · 50 · 55, 비경 반복, 모라 부족감, 진행 초기화와 함께 출시.
   - 코드 위치: `docs/GROWTH_CODE_MAP.md`.
   - 설계 문서 7장 「아직 정하지 않은 것」은 사용자와 먼저 정한다. 수치표는 그다음이다.
   - 1단계는 뼈대와 몬드 1~30이다. 치유 쿨타임은 모의 전투로 맞춘다. 같이 움직이는 시험 목록은 GROWTH_CODE_MAP에 있다.
4. **뽑기 전용 캐릭터와 호감도 이야기.**
   - 캐릭터는 기원으로만 얻는다. 4★은 넉넉히, 5★은 차이를 분명히 둔다.
   - 호감도 이야기를 읽어야 능력치가 오른다.
   - 개인 임무가 무엇을 주는지 다시 설계한다.
   - 결정은 설계 문서 3-4b, 코드 · 저장 · 고칠 시험은 GROWTH_CODE_MAP 뒷부분에 있다.
   - 지금의 호감도 규칙(첫 개인 임무 +10, 이긴 전투 +1)을 바꾸는 일이므로 사용자 확인을 받는다.
5. **튜토리얼 새로 만들기(마지막).**
   - 새 성장 고리를 가르치므로 마지막에 한다. 방향은 설계 문서 6장에 있다.
   - 지금 「직접 해 보기 n / 11」 카드가 휴대폰에서 탭을 가린다(0.15.21 확인 때도 가렸다).

## 5. 사용자 답을 기다리는 것 · 보류
- 이야기 브랜치(PR #19)의 새 몬드 개인 이야기(`d51263b`, 10명)를 우리 줄에 합칠지 아직 답이 없다. 다음 보고 때 다시 묻는다.
- 리월항 안쪽 9곳의 지도 위치는 사용자가 찍어 주겠다고 했었다(「어디가 어딘지 내가 찍어줘?」). 지도가 커지면 상자도 늘린다.
- 다인 함께 돌아다니기(0.16)는 성장 개편 뒤에 한다.
- 소리: 「His Resolution」 뒷부분은 나중의 레이드용이다.
- 필드 보스 소환물(물의 정령의 물 형상, 프리즘, 기둥)은 그림이 없다.

## 6. 빌드 · 확인 · 올리기 (이 PC 기준)
- PATH 앞에 다음을 붙이고 `PYTHONUTF8=1`을 켠다:
  - `C:\Program Files\nodejs`
  - `%LOCALAPPDATA%\Programs\Python\Python312`
  - GitHub Desktop의 `git\cmd`
- 빌드: `node tools/gen_liyue_theme.cjs`, `python tools/build_windows.py`, `python tools/build_server.py`. 새 화면 파일은 `source/index.html`과 `tools/build.py` 목록 두 곳에 넣는다.
- 전체 확인: `python tools/verify_release.py`.
  - 이 PC에서 10분이 넘게 걸린다.
  - 리눅스 전용 3개(test_test_release_pin, test_test_release_transaction, test_release_isolation_v01513.py)는 여기서 실패하고 GitHub에서 돈다.
- 판 올리기:
  - package.json과 package-lock.json(두 곳)의 버전을 올린다.
  - `content/release-notes.json`의 맨 위 항목을 쓴다. `previous` 사슬은 통째로 두고 `JSON.stringify(x,null,2)+'\n'`로 쓴다.
  - 패치 노트 `docs/PATCH_x_KO.md`와 시험 `tests/test_vxxxx.cjs`를 만들고 게이트에 등록한다.
- 커밋 메시지는 BOM 없는 파일로 `git commit -F`. 두 브랜치에 올린다: `git push origin crpg/ui-overhaul crpg/ui-overhaul:test/crpg-v01414-story`.
- 사용자에게는 40자리 SHA를 넣은 시험 설치 명령을 준다(`docs/VPS_TEST_INSTALL_KO.md` 2장). GitHub 검사(약 13분)가 끝난 뒤 설치하라고 말한다.
- 사용자의 로컬 시험은 `dev-local.cmd`(`docs/LOCAL_DEVELOPMENT_KO.md`)로 한다.
