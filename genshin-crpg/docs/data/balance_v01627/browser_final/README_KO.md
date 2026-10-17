# 0.16.27 실제 브라우저 검증

최종 제품에서 네 검사를 직렬 실행했고 **4/4 통과**했습니다. 각 실행은 기존 `tests/test_online_browser.mjs`와 기존 설치된 Chromium headless shell 134.0.6998.35를 사용했습니다. 게임·테스트·워크플로·node_modules는 수정하지 않았습니다.

| 실행 | 화면 | 저장 경로 | 종료 | 관측 시간 | 결과 항목 |
|---|---|---|---:|---:|---:|
| source_sqlite | 소스 | SQLite | 0 | 112.741초 | 17 |
| source_do | 소스 | GameAccount DO | 0 | 107.292초 | 17 |
| dist_sqlite | 배포본 | SQLite | 0 | 113.040초 | 17 |
| dist_do | 배포본 | GameAccount DO | 0 | 105.129초 | 17 |

각 폴더의 `receipt.json`, `stdout.log`, `online-flow/results.json`과 화면 캡처가 정본입니다. 실제 성공 stdout의 결과와 새 결과 JSON이 같음을 확인하고 해시를 기록했습니다. 요약은 `summary.json`입니다. 소스 지문 7147e881…, 네이티브 소스 파일 증명 b323a2fb…, 배포 묶음 2026-09-24-c3d5eef26ac2-9f53be852293, 엔진 engine3-ccab181d…를 사용했고 소스·서버 번들·원문 DB는 실행 전후 동일했습니다.

실제 Worker 코드와 GameAccount 코드가 격리 SQLite에서 실행됩니다. API 전송은 기존 테스트의 Playwright route와 로컬 fixture를 사용합니다. Cloudflare 운영 인프라나 실제 계정에 접속한 검사는 아닙니다. 1440×1000 데스크톱 화면에서 읽기·저장·재시도·장비·채집·작업·전투 재생·즉시 HP 갱신·재접속 패배를 검사했습니다. 휴대폰 실기기나 모든 화면·보스 조합의 동작을 검증한 결과는 아닙니다.

처음 일반 Chrome 실행 파일로 시도한 네 실행은 `process_singleton_posix.cc`의 `socket(): Operation not permitted`로 브라우저 시작 단계에서 종료했습니다. UI assertion은 실행되지 않았고 제품 실패로 집계하지 않았습니다. 이 네 로그·영수증은 `chrome_launch_denied`에 분리했습니다. 당시 섞여 들어온 이전 PNG/결과는 **미확인출력**으로 표시했으며 `/workspace/scratch/a62414469990/browser-unverified-v01627/`에 보존했습니다. 실제 통과 자료와 합치지 않았습니다. 기존 headless shell의 최소 실행·렌더링을 확인한 후 같은 네 검사 본문을 다시 실행한 것이 위 정본입니다.

기존 자료와 중복 복사본은 작업 폴더 밖에 보존했고 게시 자료에는 정본 한 벌만 남겼습니다. 195개 회귀 프로그램 및 별도 441개 네이티브 계약 검사는 이 네 GUI 검사와 각각 별도 결과입니다.
