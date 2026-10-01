# 원신 CRPG 서버 인수인계 — 2026-09-30

> 목적: 다음 세션이 오늘 했던 Cloudflare/DNS/Workers/D1/DO 검증을 처음부터 반복하지 않도록 현재 운영 상태, 이미 확인한 사실, 실패한 접근, 다음 단계만 남긴다.

## 0. 최우선 규칙

- **이 문서를 먼저 읽고 오늘 했던 30회 벤치마크, Custom Domain 삽질, DNS/Route 재검증을 기본적으로 반복하지 않는다.**
- 현재 운영 Worker는 이미 **Durable Object 백엔드 체감시험판**으로 바뀌어 있고 사용자가 실제 게임에서 플레이해 본 상태다.
- 사용자의 현재 평가는: “아주 좋다고는 못하지만 폰에서 하는 것과 비슷해져서 나쁘지 않다.”
- 기존 D1/세이브는 삭제하지 않았다. **과거 Worker를 그냥 덮어써서 롤백하면 안 된다.**
- 다음 세션의 주 목표는 **서울 또는 도쿄처럼 고정 리전에 둘 수 있는 외부 API 서버를 별도 스테이징으로 만들어 비교 검증**하는 것이다.
- Cloudflare Workers Paid 월 $5는 현재 실제 운영 Worker/DO에 사용 중이므로 지금 당장 버려진 비용이 아니다.

## 1. 저장소 / 브랜치

Repository:
- `jungsan765-lang/clannad`
- project: `genshin-crpg`

2026-09-30 기록 시점:
- `main` 게임/서버 코드 기준: `abe662b5940763ef17b81c7392b33f49dd5c65d3`\n- 인수인계 문서 저장으로 main HEAD는 docs-only commit `ffc187f1b7ea7a29af437aeae6851b44afd34c90`가 추가됨 (게임/서버 코드 변경 없음)
- DO 구현 브랜치: `perf/crpg-durable-state-v0145`
- PR #14: `perf(crpg): promote Durable Object backend for production trial`
- PR #14는 **open / not merged** 상태.
- 운영 Worker는 main보다 앞선 DO 코드를 수동 체감시험 배포한 상태이므로, main을 운영 진실로 가정하면 안 된다.

패키징/벤치마크 전용 브랜치 `package/crpg-do30-paid-zip`의 테스트용 auth/benchmark 수정은 운영 코드로 가져오지 않는다.

## 2. 현재 운영 Worker — 이미 적용됨

운영 Worker:
- `genshin-crpg-online.jungsan765.workers.dev`

운영 D1:
- name: `genshin-crpg-online`
- id: `1eaf2269-ca70-4b07-a4dc-0421d9a8bd78`

2026-09-30 운영 체감시험 배포 후 사용자가 직접 확인한 `/health`:

```json
{
  "ok": true,
  "version": "0.14.5",
  "engineVersion": "engine2-b48a72e36492ba7799a86cbb52d383f6be03faca43911e21d00ad3360e691b19",
  "serverBuild": "server-4dd9a52c8d3f0867123c",
  "storage": "do",
  "configured": true
}
```

현재 Worker 설정의 핵심:
- `GAME_STATE_BACKEND=do`
- `DO_LOCATION_HINT=apac-ne`
- Durable Object binding: `GAME_ACCOUNTS -> GameAccount`
- **placement 강제 설정은 운영 trial 배포 시 제거함**
- 기존 production D1 유지
- D1에 additive migration:
  - `game_owners`
  - `game_checkpoints`
  - DO 소유 계정의 오래된 D1 game writer를 막는 fence trigger
- 계정별 DO는 SQLite 기반
- warm game action은 DO 내부에서 처리하며 action hot path의 D1 call은 0을 목표로 한 구조
- requestId/revision receipt, local backup, rollback/drain 경로 유지
- D1은 계정 directory / ranking / checkpoint projection 용도로 남음

### 매우 중요: 현재 사용자의 세이브

사용자는 trial 배포 후 **로그아웃 -> 재로그인 -> 실제 플레이**를 했다.
따라서 해당 계정은 새 v2 session을 받았고, 실제 세이브가 DO 소유로 이전되었을 가능성이 높다.

**금지:** 예전 main Worker를 그냥 배포해서 덮어쓰기.
롤백이 필요하면 `docs/server-operations-ko.md`의 DO -> D1 drain 절차를 사용한다.

## 3. 현재 Pages/client 상태 — DO의 풀 성능을 아직 다 쓰지 않음

운영 Pages는 오늘 DO trial 때 재배포하지 않았다.

현재 main의 `source/app_online.js`는 구형 클라이언트라:
- 로그인 응답 본문으로 받은 v2 token은 사용할 수 있음 -> 그래서 현재 게임은 DO backend로 동작 가능
- 하지만 새 클라이언트의 `responseMode:'state-parts-v1'` delta 요청 로직은 운영 Pages에 아직 반영되지 않은 상태로 본다
- 따라서 현재 DO action도 클라이언트가 delta를 요청하지 않으면 full state 응답을 받을 수 있음

DO 브랜치의 새 클라이언트는:
- `X-CRPG-Session` 처리
- `state-parts-v1` delta response
- patch 적용
을 지원한다.

**다음 세션에서 성능을 더 볼 때 “DO가 별로다”라고 결론내기 전에 이 Pages/client delta 미반영을 기억할 것.**
단, 사용자는 거대한 Pages 배포를 싫어하므로 불필요한 재배포를 반복하지 않는다.

## 4. 오늘 이미 한 성능 실험 — 반복 금지

### A. 기존 D1 기반 운영 로그

과거 운영 0.14.5에서:
- STORY_READ total 약 2.6s
- STORY_PAUSE_FREE 약 1.7s
- MOVE 약 1.8s
- 병목은 D1 remote round trip / persist 쪽
- D1 SQL 자체 duration은 매우 짧았지만 wall clock이 컸음
- D1 served colo는 주로 HKG

명시적 HKG 쪽 placement를 썼을 때 체감이 크게 나아져 COMBAT가 대략 132~217ms 수준까지 관측된 적이 있음.

### B. DO 구조 로컬 workerd

DO + local SQLite + delta response 구조는 로컬에서 대략:
- MOVE normal p50 ~9ms
- large MOVE p50 ~18ms
- COMBAT p50 ~20ms
수준까지 확인했다.

이 값은 인터넷 RTT를 제외한 로컬 구조 성능이므로 그대로 원격 기대값으로 쓰면 안 된다.

### C. 한국 원격 전체 benchmark

최종적으로 정상 완주한 remote benchmark는:
- clientCountry = KR
- edgeColo = DFW
- small MOVE p50 ~451.8ms
- large MOVE p50 ~451.2ms
- COMBAT p50 ~462.0ms
- combat-log p50 ~472.9ms
- 32KB와 378KB MOVE의 p50이 거의 동일했음

즉 그 시험에서는 payload 크기보다 network path가 훨씬 큰 요소였다.

### D. placement 제거 edge probe

`workers.dev`에 placement를 완전히 빼고 DO만 5회 probe:
- clientCountry = KR
- edgeColo = DFW 5/5
- total p50 ~345ms
- DO 내부 왕복 p50 ~148ms
- placement = null

### E. 일반 Cloudflare 경로

같은 PC에서:
- `https://www.cloudflare.com/cdn-cgi/trace`
- `colo=ICN`

즉 사용자의 인터넷 전체가 무조건 미국으로 가는 것은 아니다.
**일반 Cloudflare 접속은 ICN인데 시험 Worker 요청은 DFW로 관측됐다.**

### F. clannad.shop Route 실험

`clannad.shop`을 Cloudflare active DNS zone으로 전환:
- Cloudflare nameserver:
  - `aleena.ns.cloudflare.com`
  - `vick.ns.cloudflare.com`
- root GitHub Pages A records는 유지
- test DNS:
  - `bench-do30.clannad.shop`
  - AAAA `100::`
  - Proxied
- Worker Route:
  - `bench-do30.clannad.shop/*`
  - -> `genshin-crpg-latency-test`

Kornet DNS가 한동안 NXDOMAIN cache를 들고 있었으나:
- authoritative Cloudflare DNS에서는 정상
- 1.1.1.1에서도 정상

DNS를 우회해 Cloudflare IP를 강제한 curl 시험:
- `104.21.52.241`
- `172.67.205.121`

둘 다 Worker 응답의 `edgeColo`가 계속 **DFW**였다.

**결론:** Custom Domain/Route를 다시 만들거나 DNS 레코드를 반복해서 바꾸는 것으로 DFW 문제가 해결되지 않았다. 이 실험을 다음 세션에서 다시 하지 않는다.

## 5. 현재 미국 경유 여부에 대한 정확한 표현

**현재 production DO Worker가 미국을 안 간다고 확인된 것은 아니다.**

확인된 것은:
- 과거 test Worker 경로는 DFW였음
- 일반 Cloudflare 접속은 ICN이었음
- production을 DO backend로 바꾼 뒤에는 별도의 production colo 측정을 아직 하지 않음
- 사용자가 실제 플레이했을 때 체감은 크게 개선되어 “폰과 비슷하고 나쁘지 않다”고 평가함

따라서 현재 체감 개선은 **DO hot path에서 D1 왕복을 제거한 효과**일 가능성이 크지만,
“production 요청이 이제 ICN이다”라고 단정하지 않는다.

다음 세션에서 이 사실 하나를 확인하기 위해 예전 30회 benchmark를 다시 돌리지 말 것.
정말 필요한 경우 production에 **1회/5회짜리 무해한 diagnostic**만 추가해 확인한다.

## 6. 다음 세션 목표 — 서울/도쿄 외부 API

사용자가 원하는 다음 단계:

> 현재 Cloudflare DO trial은 fallback으로 유지한 채,
> 서울 또는 도쿄의 고정 리전 외부 API 서버를 별도 staging으로 만들어 한국 PC에서 체감/RTT를 비교한다.
> 검증이 끝나기 전 production save/API를 끊지 않는다.

### 우선순위

1. **서울 리전 우선**
2. 서울 조건이 안 좋으면 도쿄 리전
3. API는 `api.clannad.shop` 또는 별도 staging hostname으로 연결
4. 가능하면 Cloudflare proxy(주황 구름)를 거치지 않고 **DNS only**로 origin에 직접 연결하여 경로를 고정
5. HTTPS는 origin에서 직접 종료하거나 안정적인 reverse proxy 사용
6. 기존 Cloudflare Worker/DO production은 fallback으로 유지

### 호스팅 요구사항

최신 웹 검색으로 당일 기준 후보/가격/리전을 확인한다.
요구사항:
- Seoul 또는 Tokyo 고정 region
- Node.js 24 실행 가능
- persistent disk
- SQLite 또는 PostgreSQL 사용 가능
- Web/API server 장기 실행 가능
- custom domain + HTTPS 가능
- 월 비용 가급적 $5~10 수준
- 한국에서 안정적인 RTT가 우선
- 사용자의 결제 수단 제약도 확인할 것
- 플랫폼 마케팅 문구가 아니라 실제 region/egress/가격을 확인할 것

### 외부 API로 옮길 때 주의

Cloudflare Durable Object 코드는 proprietary runtime이므로 그대로 VPS에 복사하면 안 된다.
하지만 다음 게임 서버 규칙은 그대로 유지해야 한다:
- authoritative server
- requestId exactly-once
- revision conflict
- receipt
- state split / delta response
- rollback/backups
- client pending journal
- account/session security

새 서버의 저장 방식은 별도 설계한다.

**실제 사용자 세이브를 옮기기 전에 synthetic staging으로 먼저 RTT/안정성을 측정한다.**
사용자는 검증 반복에 매우 지쳐 있으므로 30x4 전체 벤치마크부터 하지 않는다.
처음에는 ping + synthetic MOVE/COMBAT 각각 소수 샘플로 충분하다.

## 7. 실제 세이브를 외부 API로 옮길 때

현재 세이브가 DO 소유일 수 있으므로 D1의 오래된 `games.state`를 그대로 복사하면 안 된다.

안전한 방식 중 하나를 선택:
1. 현재 DO에서 최신 snapshot/export를 얻어 외부 서버로 import
2. 또는 공식 DO -> D1 drain으로 최신 상태를 D1에 넘긴 뒤 D1에서 migration

**절대 오래된 D1 원본을 최신이라고 가정하지 않는다.**

계정 credential migration도 별도 고려:
- account directory는 D1
- password salt/hash와 Worker `PASSWORD_PEPPER` 관계를 고려해야 함
- 비밀번호를 plaintext로 추출하지 않는다
- 필요하면 새 외부 API의 auth migration/token exchange를 설계

## 8. Cloudflare $5 Paid

현재 Paid는 낭비된 상태가 아니다.
- production Worker가 DO backend로 실제 동작 중
- fallback server로 유지할 수 있음
- DNS는 계속 Cloudflare 사용 가능

외부 API가 충분히 안정적이고 완전 이전한 뒤에야 다음 결제 주기부터 Paid 유지/취소를 판단한다.

## 9. GitHub / 배포 상태 주의

현재 production Worker는 DO trial 코드인데 `main`은 아직 `abe662b...`의 구 D1 구조다.
즉 **production과 main이 일시적으로 어긋나 있다.**

PR #14가 이 차이를 main에 반영하기 위한 PR이다.
사용자가 현재 DO trial을 유지하기로 확정하면 PR #14를 정리/검토 후 병합하는 것이 맞다.
다만 source/client 변경까지 포함되어 있으므로 Pages publication은 별도 승인으로 한다.

**main 병합과 Pages publish를 자동으로 묶지 않는다.**

## 10. 로컬 GitHub Desktop 흔적

사용자 PC main checkout에 예전 수동 시험 흔적 3개가 보였음:
- `server/python3.cmd`
- `server/wrangler.windows.jsonc`
- 로컬 수정된 `server/wrangler.jsonc`

사용자에게 이미:
- Commit to main 누르지 말 것
- push하지 말 것
이라고 안내함.

다음 세션에서도 이 로컬 임시 파일을 production source로 오해하지 않는다.

## 11. 다음 세션용 실행 지시

다음 세션은 아래 순서로 시작한다.

1. 이 문서를 읽는다.
2. 현재 DO production을 함부로 재배포/롤백하지 않는다.
3. 과거 DFW/DNS/Custom Domain/30회 benchmark를 반복하지 않는다.
4. 최신 웹 검색으로 Seoul/Tokyo API host 후보를 2~4개 비교한다.
5. 하나를 골라 **별도 staging API**를 만든다.
6. synthetic state로 requestId/revision/delta를 유지한 최소 서버를 올린다.
7. 한국 PC에서 소수 샘플 RTT + MOVE/COMBAT를 측정한다.
8. 현재 Cloudflare DO production 체감과 비교한다.
9. 실제 개선이 확인된 뒤에만 real-save migration 계획을 실행한다.
10. 사용자가 현재 DO를 유지할지 외부 API로 전환할지 결정한다.

성공 기준은 과거의 “30ms 숫자” 자체보다 **실제 게임에서 사용자가 답답하지 않다고 느끼는 것 + 안정성 + 세이브 안전성**을 우선한다.
