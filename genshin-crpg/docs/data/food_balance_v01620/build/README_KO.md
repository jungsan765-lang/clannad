# 0.16.20 고정 빌드·DB·제품 범위 증거

브라우저 빌드 후 서버 빌드를 실행했고 두 명령 모두 종료 코드 0이다. 그 결과물을 다시 사용하여 소스 런타임, 실제 브라우저 빌드의 런타임 스크립트, 실제 서버 ESM을 비교했다. 원래 성공한 빌드를 중복 실행하지 않았다.

| 확인 대상 | 결과 | 원자료 |
|---|---|---|
| 브라우저 빌드 | pack 목록 1,888파일, assets 314개, 128,067,981바이트 | `browser_build_command.json`, `browser_build.log`, `browser_build_report.json` |
| 브라우저 pack 실제 파일 검증 | 목록 1,888개 모두 크기·SHA256 일치; 인덱스 2개 포함 실제 폴더는 1,890파일 | `browser_pack_integrity.json`, `browser_offline_pack_executed.json.gz` |
| 서버 빌드 | 런타임 119스크립트, 원문 28,354,948바이트, gzip 5,378,932바이트 | `server_build_command.json`, `server_build.log`, `server_build_report.json` |
| 엔진·음식·복제 DB 동일성 | 204/204검사 통과, 3엔진×회복45종, 실제 식사54회 | `parity_raw.json`, `parity_raw.json.gz`, `parity.log` |
| 제품 범위 | 235파일 확인; 고정 빌드 입력 대비 변경0 | `scope_before_build.json`, `scope_after_build.json`, `final_scope.json.gz` |
| assets·content | 1,670경로, 121,891,394바이트, 경로·내용 변경0 | `assets_content_before_build.json.gz`, `final_scope.json.gz` |

전체 요약은 `build_integrity_proof.json`, 전달 파일 및 gzip/압축해제 원문 해시는 `MANIFEST.json`이다. 서버의 실제 실행 ESM은 `server_engine_executed.mjs.gz`에 정확한 원문으로 보존했다. 브라우저 pack 및 asset 인덱스도 실행 결과의 정확한 바이트를 압축하여 보존했다.

## 실제 엔진·복제 행 검사

브라우저 `release.json`과 `asset-manifest.json`, 서버의 `ENGINE_FINGERPRINT`, 브라우저에 실린 119개 스크립트와 직렬화 DB에서 독립 재계산한 지문이 모두 같다.

```text
engine3-ddba236da0175f088b1a4d2d7931df2755f0db6f9d6b54b10c0aa5e6af213ba4
server-f7fdd9a5a3f0bd871a70
```

각 엔진에서 정책표45종의 전체 `14_ITEM_DB` 행을 비교했고, 모두 승인 회복 원액과 일치했다. `19_SHOP_STOCK_DB`에는 해당 회복 음식의 완성품 SKU가8개 있으며, 전체8개 행과 상점 테이블 전체 지문도 엔진 간 같다. 여기서 ‘19’는 테이블 번호이며 SKU19개라는 뜻이 아니다.

각 첫 런타임의 정규화된 `r.db`를 두 번째 `Runtime` 입력으로 사용해 새 게임을 시작했다. 45개 음식 행과8개 완성품 가격·재고·조건 행이 그대로였고, 가격 비율이 다시 적용되지 않았다. 각 엔진의 공용 입력 DB 및 첫 런타임의 입력 객체도 내용 지문이 그대로였다. 원격 authored DB와 로컬 배포용 정리 DB의 바이트가 같다고 주장하지 않는다. 원자료의 역사적 키 `authoredDbSha256`와 그 검사 이름은 로컬 `content/db.json` 원문 파일을 가리킨다.

일반식과 바바라 특제는 각각 Lv.5/20/60, 초기 달걀·감자전·농어 스튜로 실제 `USE_ITEM`을 실행했다. `AUTO`가 고른 종류, 대상별 `requestedHealing`, HP 상한 처리, 소비 및10게임분 영수증이 세 엔진에서 같았다. 기존 나선 `foodLabel`은 같은 `foodSpec(item)`의 실제 `AUTO` 선택과 `foodHealingAmount(heal, owner)`를 사용하므로 특제만 남은 경우도 실제 사용량과 같은 숫자를 읽는다.

이 검사는 공개된 브라우저 런타임을 Node VM으로 실행하고 생성된 서버 ESM을 실제 import한 엔진/데이터 검사다. 그래픽 브라우저 화면이나 운영 서버에 접속한 검사로 세지 않는다. 동일 레벨·시드·소유권·합법 장비와 음식1개, HP=1은 명시한 소비 fixture이며 재료가 무료라는 증거가 아니다.

## 고정 제품 범위

기준 게시SHA는 `da29f36312af19ca11dd2c0ac29b54d6b31ee8f4`이다. 기준235개와의 차이는 소스3개와 버전 metadata2개뿐이다.

| 소스 | 최종 SHA256 |
|---|---|
| `source/runtime_economy.js` | `5c04f9c3d1f23596482f2d38cb392048c37291311ee07a9fefe296837d5d8140` |
| `source/runtime_growth_v01522.js` | `ce0bada1295acc904e0e39542139749dfcbdac3a4d0c03b8390271900758feb5` |
| `source/app_abyss.js` | `5f46a08f37c609e7330fdc44cb367ee378707728429c68c0a45346c5203c78d2` |

`runtime_growth_v01522.js`는 `this.installFoodBalance();` 한 호출을 제거하면 기준 소스 전체 바이트와 같다. 성장 공식·요구량·보상·전투 블록은 그대로다. `app_abyss.js`는 기존 음식 숫자 함수와 대상 인자2개 수정만 되돌리면 기준 전체 바이트와 같다. `runtime_economy.js`는 음식 정책·가격 기준·복제 설치 삽입만 제거하면 기준 전체 바이트와 같다. 나머지 소스 경로 및 바이트는 모두 유지됐다. 세 파일의 정확한 기준 diff도 이 폴더에 보존했다.

로컬 `content/db.json` SHA256은 빌드 전후 및 모든 런타임 검사 후 동일하다.

```text
254c9294c7787b421f38c84b3ad8fed9f00c207a8ef74855868c0cda48dc0962
```

## 재현

프로젝트 루트에서 새 임시 결과 폴더를 지정한다. 다음 두 빌드 명령은 원래 로그의 실행 명령과 같은 도구이며 운영 설치를 수행하지 않는다.

```bash
CRPG_BUILD_DIR=/tmp/food-v01620-browser CRPG_BUILD_REPORT=/tmp/food-v01620-browser-report.json npm run build
npm run build:server
node docs/data/food_balance_v01620/build/audit_build_parity.cjs --source-root . --browser-root /tmp/food-v01620-browser --server-file server/generated/engine.mjs --out /tmp/food-v01620-parity.json
python3 docs/data/food_balance_v01620/build/verify_final_scope.py --source-root . --out /tmp/food-v01620-scope.json
python3 docs/data/food_balance_v01620/build/verify_build_evidence.py --browser-root /tmp/food-v01620-browser
```

생성 서버 파일 대신 보존한 실행 ESM을 읽을 수도 있다.

```bash
gzip -dc docs/data/food_balance_v01620/build/server_engine_executed.mjs.gz > /tmp/food-v01620-executed-engine.mjs
node docs/data/food_balance_v01620/build/audit_build_parity.cjs --source-root . --browser-root /tmp/food-v01620-browser --server-file /tmp/food-v01620-executed-engine.mjs --out /tmp/food-v01620-archived-engine-parity.json
```

`original_audit_build_parity.cjs.gz`와 `original_verify_final_scope.py.gz`는 실행 당시 도구의 정확한 원문이다. 각 gzip은 압축 파일 SHA256과 압축해제 원문 SHA256을 별도로 기록했다. 서버 빌드 로그의 gzip은 기본 level9/당시 시간 헤더이고, 보존 gzip은 level9/mtime0이다. 두 gzip은 같은 바이트 수이며 압축해제 원문이 같지만 gzip 파일 해시는 같다고 주장하지 않는다. 현재 또는 재현한 생성물은 기록한 원문 SHA256과 비교한다. 실제 VPS 설치, 운영 승격, main 병합 또는 워크플로 대기는 수행하지 않았다.
