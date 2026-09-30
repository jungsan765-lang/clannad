# Fixed-region 외부 API 스테이징

기준일: 2026-09-30 KST

이 문서는 Cloudflare Durable Object production을 대체하는 문서가 아니다. 현재 production은 그대로 fallback으로 유지하고, 고정 리전 외부 API를 synthetic 데이터만으로 비교하기 위한 staging 기록이다.

## 1. 1차 후보

### iwinv KR1 — 1차 선택

- 위치: Region1 (KR1), IDC SMILE 가산 센터.
- General Purpose `vgna_1_n`: 1 vCPU, RAM 1 GB, NVMe 25 GB, 월 600 GB, 월 5,600원 + VAT.
- 공인 IP, 방화벽, 이미지(스냅샷) 기능을 제공한다.
- 개인/법인 명의 신용카드·체크카드 등록 가능.
- Ubuntu 클라우드 이미지 제공. 2026-05에는 Ubuntu 26.04 LTS 이미지도 추가됨.
- staging 권장 OS: Ubuntu 24.04 LTS. 최신성보다 운영 도구 호환성과 안정성을 우선한다.

공식 참고:
- https://docs.iwinv.kr/docs/iwinv-cloud/iwinv-region-az/
- https://docs.iwinv.kr/service/compute/virtual-machine/server-type/general-purpose/
- https://docs.iwinv.kr/docs/quick-start/register-card/
- https://docs.iwinv.kr/blog/2026/05/04/ubuntu26-04/

### AWS Lightsail Seoul — 2차 후보

- Seoul `ap-northeast-2` 지원.
- Linux public IPv4 1 GB bundle: 월 $7, 2 vCPU, RAM 1 GB, SSD 40 GB, 2 TB 전송량.
- iwinv보다 비용이 높지만 관리형 콘솔과 고정 서울 리전이 명확하다.

공식 참고:
- https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html
- https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html

### Vultr Seoul — 대체 후보

- Seoul(ICN)과 Tokyo(NRT) 위치가 현재 문서에 존재한다.
- Cloud Compute는 shared CPU VPS이며 장기 실행 웹/API 서버에 사용 가능하다.
- 가격 페이지의 현재 세부 플랜을 공식 문서에서 안정적으로 재조회하기 어려워 1차 선택에서 제외한다.

공식 참고:
- https://docs.vultr.com/vultr-server-status-json-endpoints
- https://docs.vultr.com/products/compute/instances/cloud-compute/provisioning

### Akamai/Linode Tokyo — Tokyo fallback

- Asia-Pacific Shared CPU 1 GB 상품이 존재한다.
- 서울이 아니라 Tokyo이므로 KR1 실측이 실패할 때만 비교한다.

공식 참고:
- https://www.akamai.com/cloud/pricing/asia-pacific

## 2. staging 구조

브랜치:
`staging/crpg-seoul-node-v0145`

기준:
`perf/crpg-durable-state-v0145` 위에 쌓는다.

현재 파일:
- `server/fixed-region-staging.mjs`
- `tests/test_fixed_region_staging.mjs`

외부 staging은 Node.js 24의 `node:sqlite` 파일 DB를 사용한다. Durable Object의 게임 규칙을 다시 만들지 않고 기존 `game-core.mjs`, `state-parts.mjs`, 실제 benchmark fixture를 재사용한다.

검증 대상:
- `GET /health`
- `GET /ping`
- synthetic MOVE
- synthetic COMBAT
- requestId exactly-once replay
- requestId collision
- revision conflict
- `state-parts-v1` delta
- 프로세스 재시작 뒤 SQLite revision 지속

실제 계정, 실제 비밀번호, production D1, production DO save는 사용하지 않는다.

## 3. 서버 배치

권장:
- iwinv KR1 `vgna_1_n`
- Ubuntu 24.04 LTS
- Node.js 24
- API 프로세스는 `127.0.0.1:8788`에만 bind
- SQLite: `/var/lib/genshin-crpg/staging.sqlite3`
- Caddy 또는 nginx가 80/443에서 HTTPS 종료
- 예: `api-staging.clannad.shop` A record를 서버 공인 IP로 연결
- Cloudflare DNS를 사용할 경우 proxy는 끄고 DNS only로 직접 연결
- 방화벽은 80/443만 공개하고 SSH는 운영자 IP 범위로 제한

환경 변수:
- `STAGING_BEARER_TOKEN`: 32자 이상 임의값. Git에 저장하지 않는다.
- `CRPG_SQLITE_PATH=/var/lib/genshin-crpg/staging.sqlite3`
- `ALLOWED_ORIGIN=https://clannad.shop`
- `HOST=127.0.0.1`
- `PORT=8788`

실행 전:
```bash
npm ci
npm run build:server
npm run test:fixed-region
```

실행:
```bash
STAGING_BEARER_TOKEN=... \
CRPG_SQLITE_PATH=/var/lib/genshin-crpg/staging.sqlite3 \
ALLOWED_ORIGIN=https://clannad.shop \
HOST=127.0.0.1 \
PORT=8788 \
npm run serve:fixed-region
```

## 4. promotion 금지선

다음은 staging 체감과 synthetic 정확성 검증 전에는 하지 않는다.

- production Worker 롤백 또는 삭제
- production D1/DO 삭제
- real save import
- D1의 오래된 `games.state`를 외부 API 최신 save로 간주
- password plaintext 추출
- Pages publish
- main merge

실제 이전 단계에서는 authoritative handoff의 원칙대로 현재 DO export를 사용하거나, 정식 DO → D1 drain 후 최신 revision을 검증하고 이동한다.


## 5. 한국 PC 최소 실측

서버와 HTTPS 연결이 끝난 뒤 전체 30회 벤치마크 대신 아래 smoke를 한 번 실행한다.

```bash
CRPG_STAGING_TOKEN=<서버와 같은 staging token> node tools/fixed-region-smoke.mjs https://api-staging.clannad.shop
```

이 도구는 synthetic 데이터만 사용해서:
- health
- ping 3회
- MOVE 3회
- COMBAT 3회
- 같은 requestId 재전송
- stale revision 충돌
- state-parts-v1 delta

만 확인하고 중앙값을 출력한다. production 계정이나 production save는 읽지 않는다.
