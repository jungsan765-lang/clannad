# 개인 이야기(전설 임무·호감도) 원고 작성 안내

`tools/editorial/personal_k/*.md`는 `57_MOND_STORY_SCENE_DB`(개인 이야기 표)의 원고판이다. 컴파일러
(`node tools/editorial/compile_main_story_k.cjs`)가 메인스토리 원고와 함께 `source/runtime_main_story_k_content.js`로
묶고, 설치기 `source/runtime_main_story_k.js`가 게임 시작 때 원래 행의 효과·선택·종료는 그대로 둔 채 글만 바꿔 끼운다.
문법은 `tools/editorial/main_story_k/README.md`와 같다. 이 문서는 개인 이야기에서 더 지켜야 할 것만 적는다.

## 파일 하나 = 인물 하나 · 루트 하나
- `trv_mond_amber.md`(여행자 루트), `isk_mond_amber.md`(이세계 루트). 리월은 `trv_liyue_keqing.md` / `isk_liyue_keqing.md`.
- 한 파일에 체인을 여러 개 쓴다. `# chain <ID>` 줄마다 새 체인. 첫 줄은 `//` 주석으로 시작해도 된다.
- 체인 ID = 전설/호감도 사건 ID(`LEG_MOND_AMBER`, `AFF_MOND_AMBER_H01`, `AFF_ISK_MOND_AMBER_H01`, `LEG_ISK_LIYUE_KEQING` …).
  `_ISK_`가 들어가면 이세계 루트, 아니면 여행자 루트로 설치된다.
- 모든 체인에 `# pre -`를 쓴다(개인 이야기의 새 행은 선행 조건이 없어야 한다. 입구 행이 사건 전체를 막아 준다).
- 원본 구조는 `node <scratch>/dump_all.cjs CHAR_ID outDir`로 뽑은 덤프(`pers/<CHAR>.txt`)에서 본다. 덤프의 `[ID] 화자 FX=… @MAP IF=…` 행이 원래 노드이고, `<선택 G> ? [ID] 라벨 FX=…`가 선택지다.

## 반드시 지켜 둬야 하는 행 (`@keep` / `??@`)
설치기가 거부하므로 빠뜨리면 설치가 실패한다(검사가 알려 준다).
1. **입구 행**: `# entry`의 행을 첫 `@keep`으로. 전설은 META 행(화면에 안 나옴, 글 바꿀 필요 없음), 호감도는 `*_START` 지문 행(`>`로 새 글).
2. **효과(FX)가 있는 모든 행**: 선택지는 `??@ID 새 라벨`, 지문·대사는 `@keep ID` + `> 새 글`.
   - 준비 선택 `*_PREP_ACCEPT`(LEGEND_ACCEPT_AND_PAY), `*_PREP_DEFER`/`*_PREP_SHORTAGE`(NO_COST_NO_PROGRESS 등)와 그 뒤의 `*_PREP_EXIT`(MENU_GATE).
   - 현장 선택 `LOCAL_CHOICE:…` 선택지 전부(원래 2개면 2개 다 `??@`).
   - 합류 선택 `*_JOIN_*`/`*_CARD_OPT_*`(JOIN_ACCEPTED / COMPANION_ELIGIBLE / KEEP_EXISTING_CARD… / UNLOCK_CARD_ONCE 대사 행).
   - 종료 행 `*_END*`(LEGEND_END / EVENT_END / AFFECTION_END / END / SYSTEM) — 글은 `> 「제목」 이야기가 마무리됐다.` 식으로 바꿔도 됨.
   - 성인 선택 사건의 `*_INTIMATE_FADE`, `*_STOP_OUTCOME`, `*_DECLINE_OUTCOME`(SCENE_MEMORY 효과) 등.
3. **구조 행**: MENU_GATE(자유 행동 멈춤), CONDITIONAL, SYSTEM, 각종 END, META. 개인 이야기에서는 효과가 없어도 지켜야 한다.
4. 조건 분기(`<조건 G>`, CONDITION_GROUP)는 멤버 전부를 `??@`로 적는다(새 선택지 추가 불가).
그 밖의 지문·대사 행은 지키지 않아도 된다. 지키지 않은 행은 자동으로 다음 지킨 행으로 건너뛴다.

## 합류(두 선택지가 한 흐름으로 돌아오기)
- 효과 없는 원래 행 하나(`*_JOIN`, `*_CONVERGE_N01`, `N017` 등)를 첫 선택지 안에서 `@keep ID` + `> 새 글`로 지키고, 다른 선택지 끝에서 `@goto ID`. 끝으로 바로 가면 `@goto *_END`.
- 새 선택지(`??` 새 라벨)도 자유롭게 추가할 수 있다. 새 선택지 묶음(`??` 여러 줄)은 새 그룹이 되고, 각 선택지의 들여쓴 줄이 그 결과다. 합류는 위와 같이 `@goto`.
- `@map`은 **파일 순서대로 이어진다**(블록을 벗어나도 유지). 첫 선택지 안에서 지도를 바꿨으면 둘째 선택지 첫 줄에 `@map`을 다시 쓴다. 지도가 바뀌면 게임이 이동을 요구하므로, 한 사건 안에서 지도를 바꾸는 건 원본이 바꾸는 자리(성 안→초원)에서만.
- 전투: `@combat EG_ID` 다음 줄 `> 전투 전 한 줄`. 그룹은 `33_ENCOUNTER_GROUP_DB`에 있는 것만(몬드: EG_MOND_SLIME_SMALL, EG_MOND_HILI_PATROL, EG_MOND_HILI_ELITE, EG_MOND_ABYSS_MAGE, EG_TREASURE_PATROL, EG_FATUI_PATROL · 리월: EG_LIYUE_HILI_ROCK, EG_LIYUE_VISHAP, EG_LIYUE_RUIN, EG_TREASURE_PATROL, EG_FATUI_PATROL). 전설 임무에 한 번, 호감도에는 보통 넣지 않는다(넣어도 한 번).

## 분량과 재미 (2026-10-05 사용자 지시: 「분량도 늘려주고 그에 맞는 재밌는 스토리」)
- **전설 임무 한 편 = 짧은 전설 임무 한 편 분량.** 지문·대사 90~130줄. 구성: ① 도입(성 안, 사건의 실마리 + 인물 소개식 장면) → 준비 선택 → ② 현장 1(조사·추적, 선택 1, 전투 한 번) → ③ 현장 2(반전·그 인물의 개인사가 드러나는 장면, 선택 2) → ④ 마무리(성 안, 결과 보고 + 그 인물의 한마디) → 합류 선택. 원본의 사건 소재(제목·물건·장소)는 살리되 장면은 새로 짓는다. 지루한 행정 대화·물 배분표 같은 소재는 사람 이야기로 바꾼다.
- **호감도 H01~H05 = 각 25~40줄.** 매 사건이 구체적인 활동 하나(함께 뭔가를 하는 장면)와 웃음 포인트 하나, 그 인물의 매력이 드러나는 순간 하나를 가진다. 원래 선택지 2개(`??@`)는 지키고, 반응을 서로 다르게 3~5줄. H05는 감정의 보상(관계가 한 단계 바뀌는 느낌). 호감도 사건은 보통 같은 지도 안에서 끝난다.
- **상위 호감(B110·B120) = 35~50줄.** 성인 선택(H110·H120·ADULT_FIRST) = 구조를 그대로 지키고(모든 선택지·분기·조건 행 `??@`/`@keep`) 글만 다시 쓴다. 노골적 묘사 없이 서로의 마음을 확인하는 로맨스로, 동의·멈춤 선택의 뜻은 그대로.
- 리월 이세계 루트는 메인스토리 4장 뒤의 상황을 전제한다(각청은 송신의례에서 죽었다 돌아와 기억이 없다, 종려는 정체가 알려졌다, 오셀 사건 뒤). 여행자 루트 리월은 원작 1장 뒤.

## 작업 순서 (인물 하나마다)
1. `VOICE_BIBLE.md`에서 그 인물과 주인공·페이몬 항목을 읽고, `<scratch>/voice_db/<CHAR>.md`(DB 발췌)도 읽는다. 쓰기 전에 그 인물의 말투 두 줄을 파일 첫 `//` 주석으로 적는다.
2. 덤프를 읽고 지킬 행 목록을 뽑는다.
3. 쓴다. 쓴 뒤 소리 내어 읽듯 번역투·설명조를 지운다. 이름을 가리고 읽어 화자가 구분되는지 본다.
4. 검증(저장소 루트에서):
   - `node tools/editorial/compile_main_story_k.cjs`
   - `node tests/test_main_story_k_v0148.cjs` (설치·그래프·효과 보존)
   - `node tools/editorial/qa_personal_play.cjs --only LEG_MOND_AMBER,AFF_MOND_AMBER` (모든 분기 실제 플레이)
   - `node tools/editorial/export_personal_reader.cjs out.md --doc trv_mond --char MOND_AMBER` 로 읽기용 문서를 뽑아 한 번 읽는다.
5. 고유명사 확인: `grep -c "표기" content/db.json`.
