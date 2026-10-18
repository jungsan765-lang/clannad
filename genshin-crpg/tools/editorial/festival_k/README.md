# 축제 이야기 원고 (0.16.67)

정기 축제(설날·추석)의 이야기다. 축제 창의 「이야기」 탭에서 1·3·5일째에 한 편씩 열리고, 처음 보면 원석 60과 축제 점수 100을 받는다.
눈꽃 축제(크리스마스)는 사용자 답(「이야기 없이」)대로 이야기가 없다.

| 파일 | 체인 | 내용 |
| --- | --- | --- |
| `seollal.md` | `EVT_SEOLLAL_ISK_1~3` | 이세계 루트: 주인공이 향릉·행추·중운·호두·종려에게 설날(떡국, 세배, 덕담)을 알려 준다 |
| `seollal.md` | `EVT_SEOLLAL_TRV_1~3` | 여행자 루트: 여행자와 페이몬이 갑자기 이세계인이 사는 세계의 리월로 넘어가 함께 설날을 보내고 복주머니를 받아 돌아온다 |
| `chuseok.md` | `EVT_CHUSEOK_ISK_1~3` | 이세계 루트: 호두·종려와 차례상, 향릉·행추·중운과 송편, 부두에서 보름달 소원 |
| `chuseok.md` | `EVT_CHUSEOK_TRV_1~3` | 여행자 루트: 다시 넘어간 세계에서 이세계인과 차례·송편·보름달, 「같은 달」 |

## 고치는 순서 — 이야기 작업대가 먼저다
사용자 지시(2026-10-18): 「스토리 관련은 전부 다 작업대가 필수야」.

1. 사용자가 이야기 작업대(https://claude.ai/artifact/2pKp3oqfozGeJaad5X4Lqu)의 「축제 · 설날」 「축제 · 추석」에서 줄을 고친다.
2. 고친 내용(작업대 db `edits`, 줄 이름 `EVT_<축제>_<루트>_<편>_<번호>`)을 이 원고에 옮긴다.
3. `node tools/editorial/compile_festival_story.cjs` → `source/app_feststory_v01667.js`(게임이 읽는 글).
4. `node tools/editorial/export_story_workbench.cjs <작업대 폴더>/story.json` 으로 작업대 이야기 파일을 다시 만들어 올린다.
5. `node tests/test_festival_v01667.cjs`, `node tests/test_glossary_v01647.cjs`.

## 문법
메인스토리 원고(`../main_story_k/README.md`)의 일부다.

```
# chain EVT_SEOLLAL_ISK_1      편 하나 (축제 · 루트 · 1~3편)
# title 설날이 뭐야?            제목
@map MAP_LY_DETAIL_CHIHU        뒤에 보이는 장소 (바꾸면 장소 이름이 뜬다)
## 만민당 앞                    장면
이야기: …                       지문
향릉: …                         대사 (페이몬, 이세계인, 게임 인물은 이름 그대로)
?? …                            주인공의 말. 같은 들여쓰기에 여러 줄이면 선택지, 그 밑에 두 칸 들여 쓴 줄이 그 선택의 결과
// 메모
```

- 주인공의 말은 전부 `??`다(`나:` 금지). `{PLAYER_NAME}` 뒤의 조사(이/가, 은/는…)는 화면이 이름에 맞춘다.
- 선택지는 결과만 다르고 이야기는 다시 합쳐진다(기록되는 선택은 없다).
- 말투는 `../personal_k/VOICE_BIBLE.md`, 고유명사는 사전 `../glossary_ko.json`(`tests/test_glossary_v01647.cjs`가 이 폴더도 검사한다).
- 본편 시점과 상관없는 축제 이야기다. 본편 사건(누가 죽었는지, 누구의 정체 등)은 말하지 않는다.
