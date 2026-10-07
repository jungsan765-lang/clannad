# 일일·주간 임무와 캐서린 의뢰 늘리는 법 (ChatGPT용, 0.16.7)

사용자 지시 (2026-10-07): 「일일 미션이나 주간 미션 종류도 좀 많이 만들건데, 이건 챗지피티한테 맡기면 될듯」, 「아니면 그냥 캐서린 자체 미션도」,
「좀 늘리는게 좋겠다 ㅇㅇ 그건 챗지피티한테」, 「어떻게 하는지 알려주기만 하면 될 것 같네」.

ChatGPT가 맡는 일: **임무의 종류(데이터)와 집계**, **캐서린 의뢰의 내용(데이터)**.
그대로 두는 일: 화면(임무판·의뢰 한 줄·획득 창·메인 화면 「오늘의 임무」), 드롭다운 금지, 비경·지맥 구조 (`AGENTS.md`).

## 1. 일일·주간 임무 — `source/runtime_tasks_v0167.js`

임무는 파일 위쪽의 세 목록에 한 줄씩 있습니다. 한 줄을 더하면 임무판과 메인 화면에 바로 나옵니다.

```js
const DAILY=[ {id:'D_WIN',kind:'win',goal:3,name:'전투 3번 이기기',short:'3번 이기기',icon:'battle',reward:{items:{[BOOK2]:2}}}, … ];
const DAILY_BONUS={id:'D_BONUS', … ,report:true};   // 「모두 달성」: 캐서린에게 보고해야 받음
const WEEKLY=[ {id:'W_BOSS',kind:'boss',goal:3,name:'필드 보스 3번 토벌',icon:'boss',reward:{primogem:30},minLevel:15}, … ];
```

| 칸 | 뜻 |
|---|---|
| `id` | 일일은 `D_`, 주간은 `W_`로 시작 (날·주가 바뀔 때 이 앞글자로 받음 기록을 지움). 한 번 쓴 id는 바꾸거나 지우지 않음 |
| `kind` | 무엇을 세는지 (아래 표) |
| `goal` | 몇 번 |
| `name` / `short` | 임무판 이름 / 메인 화면 좁은 칸에 들어갈 짧은 이름 (6자 안팎) |
| `icon` | 색 이름표: `battle` 전투 · `ley` 지맥 · `domain` 비경 · `life` 생활 · `boss` 토벌 · `bonus` 보너스. 새 색이 필요하면 Claude에게 |
| `reward` | `{mora, primogem, items:{아이템ID:개수}}` |
| `minLevel` | 이 주인공 레벨부터 (그 전엔 「주인공 Lv.N부터」로 잠김) |
| `report:true` | 캐서린에게 보고해야 받음 |

지금 세는 것 (`kind`):

| kind | 어디서 세나 |
|---|---|
| `win` | 이긴 전투 (`finishBattle` 감싸기) |
| `ley` / `domain` / `boss` | 이긴 전투가 지맥 / 비경 / 필드 보스일 때 |
| `life` | 무언가를 얻은 채집·채광·사냥·낚시 (`LIFE_FINISH`) |
| `bonus` | 주간 전용: 「모두 달성」을 받은 날 수 |

**새로 셀 것**(요리, 단조, 상자, 의뢰 완료 …)은 그 일이 끝나는 곳에서 `this.tasksCount('cook')`처럼 한 번 부르면 됩니다.
가장 쉬운 곳은 이 파일 아래쪽 `P.apply` 감싸기입니다 (`LIFE_FINISH`를 세는 줄과 같은 모양으로, 성공한 결과일 때만).

여러 개 중 날마다 4개를 고르고 싶으면: `DAILY`를 큰 목록(풀)으로 두고 `taskView`에서 `box.day`와 `SAVE_ID`로 정해지는 순서로 4개를
뽑으세요 (같은 날엔 늘 같은 4개). 메인 화면 「오늘의 임무」는 폰에서 일일 4개 + 보너스 1줄까지 들어갑니다 — 5개 이상은 Claude에게 먼저.

보상 크기: 지금 일일 합계 원석 20, 주간 70 (원석은 현금 없이 버는 재화). 크게 바꾸려면 사용자에게 먼저 묻기.

## 2. 캐서린 의뢰 — `content`의 `22_QUEST_DB`

의뢰는 `22_QUEST_DB`의 줄입니다 (`P.isCommission`: 12열이 `READY`, 10열 JSON의 `kind`가 `exploration` 또는 `supply`).
- 10열 JSON: `schema`, `kind`, `map_id`, `conditions`(`map_id`, `min_level`, `flags_false` …), `text`, `choices`(`label`, `minutes`,
  `success_rate`, `next`, `success_text` …). 이미 있는 `Q_MOND_EXP_*`, `Q_LIYUE_*` 줄을 본보기로.
- 11열 JSON: 보상 `{mora, xp, items, equipment_choice}`.
- 지금 의뢰는 한 번 하면 끝입니다 (`claimed`가 남음). 매일 새로 받는 의뢰를 만들려면 일일 임무처럼 날짜로 받음 기록을 지우는 규칙이
  필요합니다 — 규칙은 `runtime_*`에, 화면은 그대로 (의뢰 한 줄 `app_guild_v0167.js`이 상태·보상·버튼을 알아서 그립니다).
- 장소(`map_id`)는 HoYoLAB 지도에 있는 곳만. 어비스 공략·숨은 눈동자 위치·상자 위치를 글에 쓰지 않기.

## 3. 시험

- `tests/test_v0167.cjs`가 임무 id 순서를 확인합니다 — 목록을 바꾸면 이 시험의 목록도 같이 고치기.
- `node tests/test_v0167.cjs`, 그리고 평소처럼 `python tools/verify_release.py`.
- 서버가 받는 행동은 `server/game-core.mjs`의 허용 목록에 `TASK_CLAIM`이 이미 있습니다. 새 행동을 만들면 거기에도 추가.
