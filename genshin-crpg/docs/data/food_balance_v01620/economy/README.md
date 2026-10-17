# 요리·숙박·시장 경제 근거

이 폴더는 0.16.19 읽기 전용 기준 감사와 선택된 0.16.20 수치의 native 경제 연동 검증을 보존한다. 제품·DB·화면을 바꾸는 도구가 아니다.

이후 검증은 완료했다. **213/213 통과, 실제 준비품 BUY8회·SELL8회, LIFE384표본, NPC 구매/가공/매각 차익0건**이다. `ECONOMY_AFTER_KO.md`와 `after/economy_after_checks.json`에 결과와 한계를 기록했다.

## 기준 자료

- `ECONOMY_AUDIT_KO.md`: 확인한 열위 음식, 숙박·상점·매각·시장 연결과 조정 시 주의할 실제 근거.
- `catalog_baseline.json.gz`: 회복 요리45종의 기초 회복·제조비·원재료/가공/수집·상점·거래 조건과 7레벨×3HP손실=21조건의 기존 숙박/식사량.
- `economy_summary.json`: 음식별 NPC 재료 매각 기회비용과 같은HP 비용, 숙박 표, 기존 매각 상한.
- `supply_baseline.json` / `.gz`: 12지도×32시드=384회의 실제 LIFE 장면 표본. gzip은 상세 입력/장면과 NPC 전체경로 원문이고 JSON은 그 요약이다. 회복 음식45종, NPC 구매/가공/제작/매각 차익 위반0건.
- `baseline_source_identity.json`: 당시 로드한 runtime/source/index 및 QA DB 해시와 게시 기준 커밋.
- `original_manifest.json`, `original_catalog_audit.cjs.txt.gz`: 최초 임시 작업 자료의 해시 기록과 원본 감사 스크립트. 최초 스크립트는 기록용이고 재실행에는 아래 portable 스크립트를 사용한다.

수급 표본은 지도에 이미 도착한 상태에서 최적 입력을 사용한다. 장면 평균은 실제 여행/사람 입력/조우 전투를 포함한 수급 완료 시간이 아니다. 재료 매각 기회비용과 NPC 재구입값, 실제 거래소 시세를 혼동하지 않는다. 실서버 거래소 가격은 수집하지 않았다.

`MANIFEST.json`은 하위 after 자료를 포함한 이 폴더의 실제 파일 bytes/SHA256와 압축 원문 bytes/SHA256를 분리한다. `catalog_baseline.json.gz`의 gzip 파일 SHA256를 원본 `catalog_baseline.json`의 SHA256로 표기하지 않는다. 요약용 `supply_baseline.json`은 gzip 상세 원문과 다른 파일이며 gzip의 원문 해시는 요약 내부 `fullEvidence.uncompressedSha256`와 일치해야 한다.

## 기준 재현

기준 디렉터리에는 `source/`, `content/db.json`, `package.json`이 필요하다. `--baseline`은 재현자가 복원한 **0.16.19 소스 경로**를 명시한다. 기록 안의 `/tmp/...` 경로는 당시 실행 출처이며 필요한 실행 경로가 아니다. 정확한 숫자 재현에는 `baseline_source_identity.json`에 기록한 플레이용 QA DB를 사용한다. 게시 저장소의 authored DB와 로컬 QA DB는 원문이 다르지만 기존 공개 검증에서는 런타임 테이블 의미가 같았다.

저장소 루트에서:

```bash
node docs/data/food_balance_v01620/economy/audit_catalog.cjs --baseline /path/to/0.16.19/genshin-crpg --out /path/to/catalog_replay.json
node tools/audit_food_supply_v01617.cjs --runtime-root /path/to/0.16.19/genshin-crpg --samples 32 --no-campaigns --out /path/to/supply_replay.json
```

카탈로그는 저장소에 이미 있는 `tools/audit_food_lodging_v01617.cjs`를 이용해 기준 런타임을 로드한다. 공급 감사는 기존 `tools/audit_food_supply_v01617.cjs`를 그대로 사용한다. 도구 내부의 권위 있는 기존 engine 클래스로 계산하며 제품 수치를 임의 모의 함수로 대체하지 않는다.

## 선택된 수치의 이후 검사

선택 수치에서 실행한 검사를 재현하려면 아래를 사용한다. 원본 결과를 덮어쓰지 않도록 별도의 `--out-dir`을 지정한다. 소스나 DB가 바뀌면 새 결과의 로드 지문을 확인한다.

```bash
node docs/data/food_balance_v01620/economy/verify_after_economy.cjs --source-root /path/to/selected/genshin-crpg --out-dir /path/to/after_results
```

이후 검사는 회복 음식45종의 재료·수량·NPC 매각값·거래권한, 숙박21조건·기존 HP의 보존과 강화 준비품의 기존 모라/HP 비율, 실제 상점8행 BUY/SELL, 시작 지급 스튜2+감자전2 일회 유지, 수급384표본, NPC 구매/가공/매각 루프를 확인한다. 준비품 가격이 올라 재매각값이 저절로 오르는 경우를 실패로 기록한다. 조건별 결과를 파일로 남긴 뒤 실패가 있으면 비정상 종료한다.

시작 캐릭터·장비·모라·조건별 부상은 명시한 합성 검사 준비이며 무료 반복 재료 수급을 실제 계정에 적용하지 않는다. 시작 음식 지급/기존 납품 의뢰 정책, 플레이어 시장 가격과5%수수료는 유지해야 한다. 개인 시장 공급의 실제 체결 수익이나 게임의 모든 콘텐츠 균형을 검증했다고 주장하지 않는다.
