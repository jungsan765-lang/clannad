# 0.16.23 검증 원장

[사용자가 읽을 결과](../../PATCH_0.16.23_KO.md) · [운영자 사용법](../../ADMIN_BALANCE_GUIDE_KO.md). 기준 원격은 0.16.22 `7a0a68dfe2c54e3cde93f1e03660677f9685ec60`이다. 보스 오류 수정과 수치 편집 도구를 검증한 기록이며 전체 공략 난도가 달성되었다는 기록이 아니다.

## 자료 구분

| 경로 | 실제 실행과 한계 |
|---|---|
| `../boss_manual_target_review_v01622/` | 수정 전 필드18·일일8·같은 강화도 필드2 = 28조건. 입장 fixture 누락으로 전투 전 차단된 최초2건은 별도 보존 |
| `daily_hp_rejected/` | 일일 HP 증가 후보 A의 격리 실행8조건. 제품 미적용. 보호막 편성 무손실이 남음. 잘못 기록했던 장비 강화도·HP 차이 원인은 ERRATUM을 함께 읽음 |
| `manual_primo/` | 실제 공개 전투 행동으로 같은 준비물·시드의 바위 용 도마뱀2조건: 대응 없는 반복21R 패배, 바위 방어/노출 공격11R 승리·4명 생존 |
| `daily_final/` | 최종 보스 코드의 실제 일일8조건. 모두 승리·KO0. 적·아군 시작 수치는 기존8과 같음. 타르탈리아 후열 피격만 달라짐. 뒤의 운영자 catalog 제한 교정은 별도이며 이 native 입력 해시를 소급 변경하지 않음 |
| `verification/` | 관련30프로그램 최초29통과/1실패와 원시 로그. 실패는 옛 갑주 영구개방을 기대한 fixture이며 저장 행동판3을 명시한 뒤 해당 전체22조건 재통과. 당시 실행하지 않은 신규 일일 검사 파일1개가 병행 완성되어 전역585파일 비교에는 drift1이 기록됨. 실행한30프로그램의 제품 입력 변경이라는 뜻은 아님 |
| `build/`, `three_engines/` | 최초 생성본 빌드, 기존219대조와 신규147계약. 마지막 catalog 교정 전 엔진이다 |
| `../admin_balance_v01623/runtime_checks.json` | 최종 소스 런타임81검사, 입력126개 drift0. 미지원 피해 배율7개의 비노출·거부, 지원 카드/한운Q회복 유지 포함 |
| `final_catalog/` | 마지막 catalog 교정 뒤 재빌드. 실제3엔진 신규147계약·기존219대조, 서버API76·성장API20, 엔진 동일성 재검사. 바위 용 도마뱀 수동2조건도 최종 모듈로 재실행해 같은 21R패배/11R승리를 확인. rerun.cjs는 출력 목적지를 인자로 받도록 수정했다. 빌드 입력254개 drift0 |
| `admin_ui_model_and_earlier_api/` | UI30검사와 이전 생성엔진에 런타임을 추가 적재한 API13검사. 최종 생성본 검사와 섞지 않음 |
| `admin_ui_initial_final_build/` | catalog 교정 전 새0.16.23 생성본의 실제API·메모리SQLite 브라우저13검사 |
| `admin_ui_final_catalog/` | 마지막 생성본 실제API·메모리SQLite 브라우저13검사, 오류0. PC·390px 휴대폰 적용·충돌·복구와 캡처 확인 |

성장 API의 승리는 정산 분리를 위한 직접 주입이며 실제 난이도나 자연 육성 증거가 아니다. 서버API는 별도 인증·원자적 적용·설정 충돌·이전 전투·다인 스냅샷·영수증 재전송·SQLite 재시작을 검사한다. UI 검사는 로컬 메모리SQLite이고 실제 VPS 설치·복구 시험은 아니다. 전체 등록 검사나 모든 조합의 완주는 실행했다고 주장하지 않는다.

## 입력과 생성본

로컬 검사 DB 파일 SHA256는 `254c9294c7787b421f38c84b3ad8fed9f00c207a8ef74855868c0cda48dc0962`다. 이 파일은 운영 authoredDB 전체 원문과 동일하다고 보장하지 않으며 원격에 게시하지 않는다. JSON 객체를 다시 직렬화한 SHA `78771cef…`는 파일 SHA와 다른 계산이므로 서로 다른 입력 파일의 증거로 쓰지 않는다.

최종 로컬 엔진은 `engine3-1b2c502f4d62bea2247c83625663b76d12b0cb9078373e3cced53f4d0251aab1`, 서버 빌드는 `server-2d17cb189a76e3dea1aa`다. authoredDB를 사용하는 배포 빌드의 식별자는 달라질 수 있다. 최초 엔진 `engine3-36c3def1…`과 native 소스 helper의 지문은 각각 별도 방법/입력 기록이다. 원격 DB blob `cc3996929c885d41289038ff501640039a4cc71e`와 assets tree `c8e23881af963b1eea026ba8d0e559f9df0f2181`, plannedDB `03d51f8a019f46dbb043f7b28d014548f448c68d`를 선별 게시에서 보존한다.

`MANIFEST.json`은 이 폴더 파일 목록과 SHA256를 제공한다. `PUBLICATION_FILES.json`은 기준 트리 위에 덧붙인 정확한 게시 파일 목록이며 자신과 마지막 MANIFEST는 목록 밖에서 별도로 게시한다. 과거 실패와 후보 원문은 삭제하지 않는다.

## 재검사

기존 원장을 출력 경로로 다시 사용하지 않는다. 현재 입력이 당시 SHA와 일치하는지 먼저 확인한다. UI 실행기는 캡처 환경의 Chromium·Playwright 경로가 필요하다.

```bash
python3 tools/build_server.py
CRPG_BUILD_DIR=/tmp/crpg-v01623-browser python3 tools/build.py
python3 tests/test_engine_identity.py
node tools/test_admin_balance_runtime_v01623.cjs
node tests/test_admin_balance_v01623.mjs
node tests/test_admin_balance_growth_v01623.mjs
node tools/audit_balance_engines_v01623.cjs /tmp/crpg-v01623-browser /tmp/crpg-v01623-contracts
node tools/audit_build_parity_v01621.cjs --source-root . --browser-root /tmp/crpg-v01623-browser --server-file server/generated/engine.mjs --out /tmp/crpg-v01623-parity.json
node docs/data/balance_v01623/manual_primo/rerun.cjs /tmp/crpg-v01623-primo.json
```

기본 수치는 운영자 profile0에서 기존 그대로다. 다음 밸런스 검토는 주인공 수동1명/동료AI3명, 4성C0/C6·5성C0 준비물을 구분하고 보호막·실제 치유·HP손실·패배 입장·음식·숙박·첫 장비 재료·육성 시간을 같이 비교한다. HP만 늘리거나 드롭만 줄여 공략 목표를 달성했다고 주장하지 않는다.
