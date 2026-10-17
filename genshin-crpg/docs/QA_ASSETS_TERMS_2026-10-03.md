# 그림·한국어 명칭·개발 문구 후속 검사 — 2026-10-03

기준 소스 `5e05a75bdb2538636f3d2004bba0c41942db91c8`(0.15.13)에 대한 검사와 이후 0.15.14 작업 트리의 그림 연결 24셀 수정을 기록한다. **최종 구현은 원본 DB 수정이 아니라 명시한 24개 노드의 런타임 연결 보정**이다. 직접 브라우저 접근 제한은 유지했으며 다른 자동화로 우회하지 않았다. 아래 렌더링 검사는 **제품 함수를 실행한 Node DOM 스텁 검사**다. 실제 휴대폰·PC의 픽셀 배치나 물리 클릭 검증이 아니다.

## 확인 결과

| 항목 | 결과 | 상태 |
|---|---|---|
| 이미 있는 그림을 못 불러오던 개인 이야기 | 오즈 19행, 향릉 5행의 빈 화자/그림 참조 | 최종 합성 노드 24셀만 보정, 회귀 통과 |
| 현재 몬드·리월 콘텐츠의 적 그림 부재 | 필드 보스 9종, 타르탈리아 2개 전투 정의, 구조물/습격자 2종, 필드 소환 적 7종, 나선의 파수꾼 | 그림 부재 목록 확정; 새 그림 제작·교체 안 함 |
| 보조 화자 그림 부재 | 주인공·이번 수정분을 제외한 미연결 화자 ID/이름 조합 139종, 1,031행 후보 | 역할·목소리 연출도 포함. 전부 결함으로 합산하지 않음 |
| 낮은 원본 해상도 | 오즈 기존 그림 180×240 | 실제 파일 열어 확인. 크게 표시할 때 선명도 한계 |
| 내부 변수명 노출 | 드발린 적 정보의 기술 설명에 `DVALIN_TERRAIN_REMAIN=4` | 재현 후 표시 전용 한국어 설명 수정 완료. 개별 회귀 통과, 통합 회귀 대기 |
| 공식 한국어와 다른 명칭 확정 | 이번 1차 자료 대조에서 신규 확정 없음 | 전 용어 정상 판정이 아님. 아래 대조 범위 참고 |

기존 1,533개 경로 존재 검사는 반복하지 않았다. 파일 존재 여부와 실제 화자 연결·그림 내용·해상도는 별도로 확인했다.

## 1. 기존 초상 연결 24셀 보정

`helpers_v011.cjs`의 `fresh()`(실제 newGame 포함) → `installMarketContent()` → `storyIndex()`로 효과적인 행을 얻었다. 전체 25,617행, `mainStoryK.failed=[]`인 조합에서 검사했다. META·CONDITIONAL과 비활성 행을 제외한 검색 대상은 24,941행이었다. `new R(db)`만 만든 상태는 초기화가 덜 된 별도 상태이므로 이 수치와 섞지 않는다.

19개의 오즈 대사는 화자명만 있고 `SPEAKER_REF`가 비어 있었다. 이전 수정의 `ENTITY_OZ` 그림 fallback은 ID가 없는 이 행들에는 적용되지 않았다. 향릉 5행도 같은 방식으로 원래 초상이 빠져 있었다. 동일한 패턴을 전체 134개 프로필 표시명과 대조했으며, 기존 그림을 직접 연결할 수 있는 추가 대상은 없었다.

모두 `content/db.json`의 `57_MOND_STORY_SCENE_DB`에 실제 원본 행이 있다. 해당 행을 덮어쓰는 생성 원고는 없었다. 최종 `source/runtime_quality_fixes.js`의 `v0.15.14 existing story portraits` 블록이 명시한 ID 목록만 보정한다. DIALOGUE·ACTIVE·정확한 표시명·빈 SPEAKER_REF·빈 ASSET_ROW_ID를 함께 확인하며 이미 연결된 그림은 유지한다. 인덱스당 한 번 적용하며 원본 DB를 쓰지 않는다. 명칭만 보고 모든 익명 화자를 추정하는 방법은 추가하지 않았다.

- 오즈 19행: `SPEAKER_REF`만 `ENTITY_OZ`로 연결했다.
- 향릉 5행: `ASSET_ROW_ID`만 `ASSET_RIWAL_HR_1`로 연결했다. `SPEAKER_REF`는 빈값을 유지한다. 여기서 `PROFILE_LIYUE_XIANGLING`을 새로 넣으면 `markContact`가 호출되어 그림 수정이 관계 기록까지 바꿀 수 있기 때문이다.
- `assets/summons/summon_oz.webp`, `assets/riwal_hr_1.webp`를 직접 열어 각각 기존 오즈·향릉 그림임을 확인했다. 그림은 수정하지 않았다.
- 최종 런타임과 이 보정 블록만 제외한 동일 런타임을 각각 초기화해 **25,619개 최종 합성 노드 전체의 셀**을 대조했다. 오즈 19셀과 향릉 5셀 외에는 동일하다. 대사 본문, 이름, 선택, 조건, 효과, NEXT, 보상, 다른 인물의 기존 초상은 그대로다. 승인된 엠버 신규 2노드가 추가되어 최초 조사 25,617개보다 2개 많고, 양쪽 모두 `mainStoryK.failed=[]`다.

초기 DB 직접 수정 방식의 감사 이력: 수정 전 SHA-256 `e065177a5812146c7f386a0a7aa28b95ccb94f92173ea387264bd9e0107d9cfc`, 24셀 반영 직후 `df1bb1d9cdfc617a571425126d4faf59876585e7e934229a5ec4891f2ecb30f7`였다. 이 전후 셀 목록은 `audit-report/story-asset-binding-cell-diff.json`에 보존한다.

이후 GitHub connector의 단일 blob 크기 제한과 원본 자료 보존을 고려해 부모 승인으로 런타임 보정으로 이행했다. **부모가 직접 수정했던 DB 셀을 복원했으므로 위 ‘반영 직후’ 해시는 최종 배포 DB 해시가 아니다.** source-manifest와 저장 버전 호환 메타데이터도 부모가 원복·통합 관리한다. 원격 원본 `fileSha256`/테이블 해시와 스프레드시트를 변경하지 않았다.

검사: `node tests/test_story_asset_bindings.cjs`, `node tests/test_asset_followup.cjs` 통과. 신규 회귀는 원본 DB에 보정 셀이 써 있다고 요구하지 않으며, 전체 합성 그래프 비교와 24행 각각의 수정 전 그림 0개 → 수정 후 정확한 그림 1개, 본문·버튼 동일, 그림 끄기 적용을 확인한다. 또 같은 초기 상태에서 각 행을 해결한 전후 상태를 비교해 커서·효과·관계가 동일하고 `markContact`가 발생하지 않음을 확인한다. 다음 행 자동 진행은 고정한 단위 검사이며, 전체 개인 임무 완주/실서버 배포 검사는 별도다.

| 화자 | 루트 | 장면 ID | 변경 필드 |
|---|---|---|---|
| 오즈 | ROUTE_TRAVELER | `LEG_MOND_FISCHL_N004` | `SPEAKER_REF` |
| 오즈 | ROUTE_TRAVELER | `LEG_MOND_FISCHL_N011` | `SPEAKER_REF` |
| 오즈 | ROUTE_TRAVELER | `LEG_MOND_FISCHL_N022` | `SPEAKER_REF` |
| 오즈 | ROUTE_TRAVELER | `LEG_MOND_FISCHL_N025` | `SPEAKER_REF` |
| 오즈 | ROUTE_TRAVELER | `LEG_MOND_FISCHL_N035` | `SPEAKER_REF` |
| 오즈 | ROUTE_TRAVELER | `LEG_MOND_FISCHL_N042` | `SPEAKER_REF` |
| 오즈 | ROUTE_TRAVELER | `LEG_MOND_FISCHL_N051` | `SPEAKER_REF` |
| 향릉 | ROUTE_TRAVELER | `LEG_LIYUE_SHENHE_WORK04` | `ASSET_ROW_ID` |
| 향릉 | ROUTE_TRAVELER | `LEG_LIYUE_SHENHE_MID04` | `ASSET_ROW_ID` |
| 향릉 | ROUTE_TRAVELER | `LEG_LIYUE_SHENHE_B2_R` | `ASSET_ROW_ID` |
| 향릉 | ROUTE_TRAVELER | `LEG_LIYUE_SHENHE_RES04` | `ASSET_ROW_ID` |
| 향릉 | ROUTE_TRAVELER | `AFF_LIYUE_SHENHE_H01_C2_R` | `ASSET_ROW_ID` |
| 오즈 | ROUTE_ISEKAI | `LEG_ISK_MOND_FISCHL_V143_INTRO_01` | `SPEAKER_REF` |
| 오즈 | ROUTE_ISEKAI | `LEG_ISK_MOND_FISCHL_V143_FIRST_01` | `SPEAKER_REF` |
| 오즈 | ROUTE_ISEKAI | `LEG_ISK_MOND_FISCHL_V143_FIRST_03` | `SPEAKER_REF` |
| 오즈 | ROUTE_ISEKAI | `LEG_ISK_MOND_FISCHL_V143_AGAIN_01` | `SPEAKER_REF` |
| 오즈 | ROUTE_ISEKAI | `LEG_ISK_MOND_FISCHL_V143_FIELD_01` | `SPEAKER_REF` |
| 오즈 | ROUTE_ISEKAI | `LEG_ISK_MOND_FISCHL_V143_FIELD_04` | `SPEAKER_REF` |
| 오즈 | ROUTE_ISEKAI | `LEG_ISK_MOND_FISCHL_V143_FIELD_05B_R_01` | `SPEAKER_REF` |
| 오즈 | ROUTE_ISEKAI | `LEG_ISK_MOND_FISCHL_V143_FIELD_07` | `SPEAKER_REF` |
| 오즈 | ROUTE_ISEKAI | `LEG_ISK_MOND_FISCHL_V143_AFTER_00` | `SPEAKER_REF` |
| 오즈 | ROUTE_ISEKAI | `LEG_ISK_MOND_FISCHL_V143_JOIN_01` | `SPEAKER_REF` |
| 오즈 | ROUTE_TRAVELER | `LEG_MOND_FISCHL_V143_FIRST_01` | `SPEAKER_REF` |
| 오즈 | ROUTE_TRAVELER | `LEG_MOND_FISCHL_V143_AGAIN_01` | `SPEAKER_REF` |

## 2. 고유 그림이 없는 적: 현재 콘텐츠와 잠금 자료 분리

`app.js`의 실제 `enemyPortraitFor` 조회 결과를 기준으로 했다. 행의 이미지 번호가 NONE/0이고 검증된 별칭도 없으면 null이 반환된다. 파일 404 대신 그림 요소가 생기지 않는 문제다. `app_experience.js` 248행의 전투 목록 및 `app_raid_v0152.js`의 그림 조회가 영향을 받는다.

| 현재 사용 정의 | 이름 | 사용 근거 |
|---|---|---|
| `FB_ANEMO_HYPOSTASIS` | 무상의 바람 | 필드 보스 도전 정의 |
| `FB_ELECTRO_HYPOSTASIS` | 무상의 뇌전 | 필드 보스 도전 정의 |
| `FB_CRYO_REGISVINE` | 얼음 나무 | 필드 보스 도전 정의 |
| `FB_CRYO_HYPOSTASIS` | 무상의 얼음 | 필드 보스 도전 정의 |
| `FB_GEO_HYPOSTASIS` | 무상의 바위 | 필드 보스 도전 정의 |
| `FB_PYRO_REGISVINE` | 폭염 나무 | 필드 보스 도전 정의 |
| `FB_OCEANID` | 물의 정령 | 필드 보스 도전 정의 |
| `FB_PRIMO_GEOVISHAP` | 고대 바위 용 도마뱀 | 필드 보스 도전 정의 |
| `FB_RUIN_SERPENT` | 유적의 뱀 | 필드 보스 도전 정의 |
| `BOSS_TARTAGLIA` | 타르탈리아 | EG_BOSS_TARTAGLIA |
| `BOSS_ISK_L03_GOLDEN` | 타르탈리아 | EG_ISK_L03_GOLDEN |
| `MON_LY_R39_STRUCTURE` | 통로의 버팀돌 · 내구도 | EG_LY_R39_DESTROY |
| `MON_LY_R39_RAIDER` | 현장 습격자 | EG_LY_R39_BATTLE, EG_LY_R39_ESCORT 외 55개 그룹 |
| `FB_SUMMON_PRISM` | 뇌광 프리즘 | 필드 보스가 동적으로 소환(runtime_field_bosses.js 66–74, 314–336행) |
| `FB_SUMMON_PILLAR` | 현암 기둥 | 필드 보스가 동적으로 소환(runtime_field_bosses.js 66–74, 314–336행) |
| `FB_MIMIC_BOAR` | 물 멧돼지 | 필드 보스가 동적으로 소환(runtime_field_bosses.js 66–74, 314–336행) |
| `FB_MIMIC_CRANE` | 물 학 | 필드 보스가 동적으로 소환(runtime_field_bosses.js 66–74, 314–336행) |
| `FB_MIMIC_FROG` | 물 개구리 | 필드 보스가 동적으로 소환(runtime_field_bosses.js 66–74, 314–336행) |
| `FB_MIMIC_CRAB` | 물 게 | 필드 보스가 동적으로 소환(runtime_field_bosses.js 66–74, 314–336행) |
| `FB_MIMIC_FALCON` | 물 매 | 필드 보스가 동적으로 소환(runtime_field_bosses.js 66–74, 314–336행) |
| `MON_ABYSS_WARDEN` | 나선의 파수꾼 | 나선 전투 생성(runtime_abyss.js 102–103행) |

위는 서로 다른 전투 정의 21개이며 서로 다른 등장인물 21명을 뜻하지 않는다. 타르탈리아는 두 루트 전투 정의가 같은 인물이다. 물 형상·기둥은 보스의 보조 적이다. 이들이 존재하는 조우/소환 경로는 코드로 확인했고, 이번에 모든 전투를 실제 브라우저에서 끝까지 플레이한 것은 아니다.

전체 테이블에서 그림이 없는 정의는 45개지만, 나머지 24개는 다른 지역/잠금 자료에 속한다. 이들을 현재 플레이의 이미지 오류로 합산하지 않았다. 원본 아카이브에 정의가 존재한다는 이유만으로 현재 노출된다고 판단하지 않는다.

## 3. 보조 화자와 원본 해상도

장비 상인 `MRC_MOND_EQUIP` 9행, 천암군 `NPC_LIYUE_MILLELITH` 7행, 서기 `NPC_LIYUE_HARBOR_CLERK` 1행에는 그림 연결이 없다. 그 외 표시명만 있는 소월축양진군 7행, 리수첩산진군 5행, 평 할머니 6행, 앵아 6행, 장생 19행, 언소 2행도 그림이 생기지 않는다. 현재 검증된 등록 자산에서 정확히 같은 인물의 독립 초상을 확인하지 못했으므로 다른 사람 그림을 대입하지 않았다.

`짐꾼`, `수레꾼`, `운송인` 등의 조연과 `벽 너머 목소리`처럼 의도적으로 인물을 보여주지 않을 수 있는 연출이 함께 있다. 139종은 화자 ID/표시명의 조합 수이며 실제 인물 수가 아니다. 목록은 이 문서 하단에 전부 남겼다. 장면에 따라 그림이 필요한지의 편집 결정이 먼저다.

오즈의 기존 그림은 180×240이다. 실제 이미지에서 오즈를 식별할 수 있지만, `style.css`의 `.portrait-frame img { width:100%; height:auto }` 때문에 큰 이야기 초상 칸에 확대될 수 있다. 이 파일은 일반 manifest 이미지 최적화 목록에도 없어서 원본 해상도 제한이 자동 적용되지 않는다. 이는 **작은 원본+확대 가능성**의 확인이며, 특정 기기의 흐림 정도를 실화면 캡처로 확인한 것은 아니다. 이번 작업은 업스케일·새 그림 생성·교체를 하지 않았다.

일반 대화에 실제 연결된 다른 이미지의 크기를 검사했을 때, 짧은 변이 360px 미만인 별도 후보는 오즈뿐이었다. 360px는 선별 기준일 뿐 합격 해상도 기준이 아니다. 4K나 DPR 3에서 모두 선명하다는 의미가 아니다.

## 4. 제작 문구: 확정 노출과 오탐

### 확정: 적 기술 설명의 내부 변수

재현 경로: 드발린 전투 → 적 정보 → `ECARD_DVALIN_TERRAIN_CLOCK` 기술 상세. `fresh()` → `startBattle('EG_BOSS_DVALIN', ...)`로 현행 `enemySkillVersion=1` 전투를 만들고 `enemyIntel()` 및 실제 `EnemyIntel.detail()`을 실행했다. `CRPGText.readable`까지 적용한 뒤에도 `DVALIN_TERRAIN_REMAIN=4`가 사용자에게 전달되는 상세 내용에 남는다.

발생 지점은 `12_ENEMY_CARD_DB` 해당 카드 설명과 `source/runtime_enemy_skills.js` 221–225행, `source/app_enemy_intel.js` 28–30행이다. 상태 ID·전투 규칙을 바꾸지 말고 표시 문장만 자연어로 바꾸는 것이 적절하다. 보고 후 통합 담당자가 `runtime_enemy_skills.js`의 `enemySkillInfo`에 표시 전용 한국어 설명·요약·계수 문구를 반영했다. 현재 전투의 terrainMax=4와 구 저장의 6을 각각 따르며 실제 규칙과 저장은 바꾸지 않는다. `tests/test_enemy_text_v01514.cjs`가 실제 전투→enemyIntel→EnemyIntel.detail DOM 스텁 4개 상태에서 통과했다. 이 항목은 수정 완료·통합 회귀 대기다. 퍼즐 해답이나 숨겨진 보상 내용은 이 문서에 기록하지 않는다.

### 문맥 검토 후 결함에서 제외

활성 이야기의 TEXT/CHOICE_LABEL에서 제작 관련 단어를 검색한 후보 12행을 모두 문맥으로 확인했다. 편지나 보고서의 `초안`, 응광의 실제 작업 `예산`, 주인공이 말하는 식사 `예산`은 등장인물의 이야기 내용이며 개발 잔재가 아니다. 튜토리얼 완료 안내도 플레이 상태 알림이다. 이 검색에서 TODO/작성 예정/검수 필요 같은 명백한 원고 잔재는 추가 확정하지 않았다.

소스의 `개발 검증판`은 오래된 제목 화면 함수에 남아 있지만 현재 온라인 제목 화면은 뒤에서 교체된다. 일반 사용자의 현행 제목 화면에서 보인다고 보고하지 않았다. `로컬 테스트 로그인`은 localhost 전용이고 운영자 디버그는 권한 분기를 따르므로 전체 사용자에게 노출된다고 합산하지 않았다. `준비 중`도 공격의 시전 준비나 설치 진행일 수 있어 단어만으로 결함 처리하지 않았다.

## 5. 한국어 명칭 대조

공식 플랫폼 HoYoWiki의 한국어 문서를 조회했다. 검색 결과 본문을 얻을 수 있는 문서와, 페이지를 열어도 JavaScript 껍데기만 반환하는 문서가 섞여 있었다. 다음은 실제 확보한 한국어 본문으로 비교한 범위다.

| 대조 | 프로젝트 표기 | 판정 | 1차 출처 |
|---|---|---|---|
| 달리아의 두 기술·분류 | 신성한 침례식, 물빛 기도, 원소전투 스킬, 원소폭발 | 명칭 일치. CRPG의 효과/수치는 별도 | [HoYoWiki 달리아](https://wiki.hoyolab.com/pc/genshin/entry/7707?lang=ko-kr) |
| 몬드 인물명 표본 | 베넷, 피슬, 케이아, 설탕, 디오나, 노엘, 엠버, 레이저, 바바라, 리사 | 제공된 한국어 캐릭터 목록과 일치 | [HoYoWiki 한국어 캐릭터 목록 포함 문서](https://wiki.hoyolab.com/pc/genshin/entry/7420?lang=ko-kr) |
| 리월 인물명 표본 | 향릉, 응광, 북두, 연비, 운근, 중운, 가명, 요요, 남연 | 제공된 한국어 목록과 일치 | 위 한국어 목록 및 [「근면」의 철학](https://wiki.hoyolab.com/pc/genshin/entry/74?lang=ko-kr) |
| 벤티/지역·용어 표본 | 벤티, 바르바토스, 몬드성, 바람이 시작되는 곳, 원소 충전 효율 | 문서의 해당 표기와 일치 | [HoYoWiki 벤티](https://wiki.hoyolab.com/pc/genshin/entry/23?lang=ko-kr) |

이번 범위에서는 외국어 발음을 한국어로 적어 잘못 바꾼 신규 확정 사례를 얻지 못했다. 이것은 전체 지명·적·아이템·대사의 용어 검수가 끝났다는 뜻이 아니다. 예컨대 `드래곤 스파인`/`드래곤스파인`, `나선비경` 표기는 띄어쓰기 통일 후보로 남기며, 확보하지 못한 공식 문구를 기억으로 단정해 고치지 않는다. 일반 HoYoLAB 이용자 공략·팬 위키·검색 자동 번역문은 공식 한국어 명칭 확정 근거로 쓰지 않았다.

닫힌 이나즈마 등 자료에 있는 짧은 이름(시노부/미즈키 등)은 정식 전체 이름과 구분할 수 있지만, 이번 현재 노출 오류 수에 넣지 않았다. 필요한 화면의 공식 명칭과 대화에서 쓰는 호칭도 서로 구별해야 한다.

## 6. 남은 화자 그림 후보 전체 목록

아래는 수정 이전 전수 추출에서 주인공과 이번 24행을 제외한 목록이다. 이 문서는 해당 대사를 인용하지 않고 위치 식별자만 제공한다. 서로 다른 별칭은 같은 인물일 수 있다. 익명·목소리 연출은 그림을 생략하는 설계가 적절할 수 있으므로 장면별로 결정한다.

| 화자 표시명 | ID(없으면 이름만 있음) | 행 수 | 대표 장면 |
|---|---|---:|---|
| 짐꾼 | `` | 84 | `ISK_L01_K_071` |
| 천암군 병사 | `` | 75 | `ISK_L01_K_128` |
| 운송인 | `` | 75 | `ISK_L01_AB_163` |
| 교대 병사 | `` | 73 | `ISK_L01_AB_112` |
| 천암군 | `` | 63 | `TRV_LY1_N040` |
| 군의관 | `` | 30 | `ISK_L04_K1_009` |
| 짐주인 | `` | 28 | `ISK_L02_B2_078` |
| 병사의 누나 | `` | 28 | `ISK_L03_B1_018` |
| 상인 | `` | 25 | `ISK_L01_AB_162` |
| 남십자 선원 | `` | 25 | `ISK_L01_B_071` |
| 장생 | `` | 19 | `LEG_LIYUE_BAIZHU_L03` |
| 수레꾼 | `` | 18 | `ISK_L01_AA_011` |
| 면담 병사 | `` | 15 | `ISK_L03_AB1_023` |
| 객잔 종업원 | `` | 14 | `ISK_L01_K_018` |
| 왕생당 직원 | `` | 14 | `ISK_L02_AA1_018` |
| 접수 담당 병사 | `` | 13 | `ISK_L01_AA_134` |
| 호위 병사 | `` | 13 | `ISK_L03_K1_088` |
| 낯선 손님 | `` | 13 | `ISK_L03_AA1_029` |
| 악기 수리공 | `` | 13 | `ISK_L04_AB1_056` |
| 선원 | `` | 12 | `LEG_LIYUE_BEIDOU_INVEST_BEACON_R` |
| 손님 | `` | 10 | `AFF_LIYUE_BAIZHU_H03_WITNESS` |
| 장비 상인 | `MRC_MOND_EQUIP` | 9 | `ISK_M01_UT040` |
| 검사관 | `` | 9 | `LEG_LIYUE_TARTAGLIA_WORK02` |
| 찻집 주인 | `` | 9 | `LEG_ISK_LIYUE_ZHONGLI_INTRO_06` |
| 접수 | `` | 9 | `PRO_L01AA_fork_052` |
| 정산 담당자 | `` | 8 | `ISK_L04_K1_148` |
| 직원 | `` | 8 | `AFF_LIYUE_BAIZHU_H05_ISSUE` |
| 신참 선원 | `` | 8 | `LEG_ISK_LIYUE_BEIDOU_INTRO_05` |
| 소월축양진군 | `` | 7 | `TRV_LY1_N101` |
| 천암군 | `NPC_LIYUE_MILLELITH` | 7 | `TRV_LY3_A_PRIORITY_C1_R` |
| 농부 | `` | 7 | `LEG_ISK_LIYUE_KEQING_INTRO_05` |
| 장록 | `` | 7 | `PRO_L04K2_name_024` |
| 앵아 | `` | 6 | `TRV_LY2_N071` |
| 평 할머니 | `` | 6 | `TRV_LY2_N083` |
| 관리인 | `` | 6 | `ISK_L03_AA1_058` |
| 서고 담당자 | `` | 6 | `LEG_LIYUE_ZHONGLI_ARCHIVE_A` |
| 큰 상인 | `` | 6 | `LEG_ISK_LIYUE_NINGGUANG_INTRO_03` |
| 수선공 | `` | 6 | `LEG_ISK_LIYUE_NINGGUANG_INTRO_04` |
| 공방 주인 | `` | 6 | `LEG_ISK_LIYUE_KEQING_INTRO_06` |
| 리수첩산진군 | `` | 5 | `TRV_LY1_N130` |
| 검수 서기 | `` | 5 | `ISK_L01_AB_164` |
| 행렬 담당자 | `` | 5 | `ISK_L01_B_036` |
| 검수 병사 | `` | 5 | `ISK_L02_K2_025` |
| 현장 병사 | `` | 5 | `ISK_L03_K1_020` |
| 연락 담당 | `` | 5 | `ISK_L03_AA2_022` |
| 피난 중인 상인 | `` | 5 | `ISK_L04_AA2_049` |
| 담당자 | `` | 5 | `AFF_LIYUE_GANYU_H01_ISSUE` |
| 첫 손님 | `` | 5 | `LEG_ISK_LIYUE_YELAN_INTRO_05` |
| 찻집 직원 | `` | 5 | `LEG_ISK_LIYUE_YELAN_WORK_04` |
| 피난 상인 | `` | 5 | `PRO_L04AA2_cart_007` |
| 리월 상인 | `` | 4 | `TRV_LY1_N017` |
| 산길의 행인 | `` | 4 | `TRV_LY1_N097` |
| 안내 병사 | `` | 4 | `ISK_L02_K1_031` |
| 무대 관리인 | `` | 4 | `ISK_L03_AB1_045` |
| 관객 | `` | 4 | `ISK_L03_AB1_086` |
| 목수 | `` | 4 | `ISK_L04_AB1_009` |
| 둘째 손님 | `` | 4 | `LEG_ISK_LIYUE_YELAN_INTRO_06` |
| 행인 | `` | 4 | `AFF_ISK_LIYUE_KEQING_H01_BODY_05` |
| 채집가 | `` | 4 | `LEG_ISK_MOND_LISA_V143_FIELD_02` |
| 우인단 병사 | `` | 4 | `PRO_L03K1_golden_003` |
| 성당 수녀 | `` | 3 | `TRV_M02_N196` |
| 참관 상인 | `` | 3 | `ISK_L02_B2_038` |
| 벽 너머 목소리 | `` | 3 | `ISK_L03_AA1_055` |
| 귓속의 소리 | `` | 3 | `ISK_L03_AA2_106` |
| 교대 병사의 목소리 | `` | 3 | `ISK_L03_B1_096` |
| 반송 짐을 맡긴 상인 | `` | 3 | `ISK_L04_AA1_107` |
| 구호 담당자 | `` | 3 | `ISK_L04_AB1_023` |
| 수레 짐꾼 | `` | 3 | `ISK_L04_AB2_037` |
| 배달원 | `` | 3 | `LEG_MOND_AMBER_N019` |
| 접수인 | `` | 3 | `LEG_LIYUE_ZHONGLI_FAMILY_B` |
| 주민 | `` | 3 | `AFF_LIYUE_LANYAN_H01_T04` |
| 복각업자 | `` | 3 | `LEG_ISK_LIYUE_ZHONGLI_WORK_02` |
| 시장 당번 | `` | 3 | `AFF_ISK_LIYUE_ZHONGLI_H04_BODY_04` |
| 점원 | `` | 3 | `AFF_ISK_LIYUE_NINGGUANG_H01_BODY_04` |
| 디오나의 아빠 | `` | 3 | `LEG_ISK_MOND_DIONA_V143_FIELD_03` |
| 남십자 | `` | 3 | `PRO_L02B2_cargo_012` |
| 참관인 | `` | 3 | `PRO_L02B2_rite_006` |
| 벽 너머의 목소리 | `` | 3 | `PRO_L03AA1_below_008` |
| 귓속의 목소리 | `` | 3 | `PRO_L03AA2_pond_036` |
| 반송 상인 | `` | 3 | `PRO_L04AA1_cargo_001` |
| 구호 담당 | `` | 3 | `PRO_L04AB1_cell_023` |
| 천암군 전령 | `` | 2 | `ISK_L01_AB_040` |
| 기다리던 사람 | `` | 2 | `ISK_L02_AA2_101` |
| 참관객 | `` | 2 | `ISK_L03_K1_008` |
| 갇힌 일꾼 | `` | 2 | `ISK_L03_AA1_050` |
| 천암군 연락병 | `` | 2 | `ISK_L04_AA1_047` |
| 항로 접수 담당 | `` | 2 | `ISK_L04_AA1_123` |
| 경비병 | `` | 2 | `ISK_L04_AB1_003` |
| 유족 | `` | 2 | `ISK_L04_AB1_093` |
| 칠성 정산 담당자 | `` | 2 | `ISK_L04_B1_122` |
| 목격자 | `` | 2 | `LEG_MOND_RAZOR_N018` |
| 성문 기사 | `` | 2 | `LEG_ISK_MOND_AMBER_L1_INTRO_N04` |
| 호송국 직원 | `` | 2 | `LEG_LIYUE_GAMING_L03` |
| 언소 | `` | 2 | `AFF_LIYUE_XIAO_H02_T02` |
| 나무꾼 | `` | 2 | `AFF_LIYUE_XIAO_H03_T04` |
| 악사 | `` | 2 | `AFF_LIYUE_XIAO_H04_T04` |
| 보호자 | `` | 2 | `AFF_LIYUE_XINYAN_H03_T04` |
| 항구 관리인 | `` | 2 | `AFF_LIYUE_TARTAGLIA_H04_T04` |
| 봉사자 | `` | 2 | `AFF_ISK_LIYUE_NINGGUANG_H03_BODY_08` |
| 갑판장 | `` | 2 | `LEG_ISK_LIYUE_BEIDOU_EVIDENCE_04` |
| 등불 담당 | `` | 2 | `AFF_ISK_LIYUE_KEQING_H02_BODY_05` |
| 등산객 | `` | 2 | `LEG_ISK_MOND_BENNETT_V143_FIELD_02` |
| 노인 | `` | 2 | `LEG_ISK_MOND_DAHLIA_V143_FIELD_05` |
| 교대 | `` | 2 | `PRO_L01AB_fork_013` |
| 정산 담당 | `` | 2 | `PRO_L04AB1_beidou_024` |
| 칠성 정산 담당 | `` | 2 | `PRO_L04B1_harbor_023` |
| 서기 | `NPC_LIYUE_HARBOR_CLERK` | 1 | `TRV_LY3_B_EVAC_06` |
| 초소 담당관 | `` | 1 | `ISK_L01_AB_053` |
| 창고 경비 | `` | 1 | `ISK_L03_AB2_093` |
| 동료 일꾼 | `` | 1 | `ISK_L04_AA1_038` |
| 수상한 남자 | `` | 1 | `REV02_AA2_COURIER_N2` |
| 수리공 | `` | 1 | `LEG_MOND_VENTI_N010` |
| 정찰 대원 | `` | 1 | `LEG_MOND_MIKA_N019` |
| 인쇄 담당자 | `` | 1 | `LEG_MOND_MONA_N018` |
| 계약자 | `` | 1 | `LEG_MOND_FISCHL_N021` |
| 지나가는 사람 | `` | 1 | `LEG_MOND_FISCHL_N040` |
| 견습 연구자 | `` | 1 | `LEG_MOND_LISA_N018` |
| 운반꾼 | `` | 1 | `LEG_MOND_ROSARIA_N018` |
| 온실 상인 | `` | 1 | `LEG_MOND_SUCROSE_N017` |
| 물자 절도범 | `` | 1 | `LEG_MOND_EULA_N020` |
| 순찰 기사 | `` | 1 | `LEG_ISK_MOND_AMBER_L3_INTRO_N04` |
| 배급 담당자 | `` | 1 | `LEG_LIYUE_NINGGUANG_INVEST_SHELTER_R` |
| 창고 담당자 | `` | 1 | `LEG_LIYUE_NINGGUANG_INVEST_DOCK_R` |
| 운반인 | `` | 1 | `AFF_LIYUE_BAIZHU_H01_WITNESS` |
| 수령인 | `` | 1 | `LEG_LIYUE_GAMING_L13` |
| 신참 장인 | `` | 1 | `AFF_LIYUE_LANYAN_H05_C2_R` |
| 앞의 손님 | `` | 1 | `AFF_LIYUE_SHENHE_H01_C1_R` |
| 무대 담당 | `` | 1 | `AFF_LIYUE_XINYAN_H05_T04` |
| 도둑 | `` | 1 | `LEG_ISK_MOND_ROSARIA_V143_FIELD_04` |
| 주민 할머니 | `` | 1 | `LEG_ISK_MOND_NOELLE_V143_FIELD_05` |
| 보급대장 | `` | 1 | `LEG_ISK_MOND_MIKA_V143_FIELD_05` |
| 기사 | `` | 1 | `LEG_ISK_MOND_KLEE_V143_FIELD_02` |
| 객잔 요리사 | `` | 1 | `LEG_ISK_LIYUE_XIAO_V143_TOFU_00` |
| 약초꾼 | `` | 1 | `PRO_L01AB_ledge_002` |
| 검수 | `` | 1 | `PRO_L01AB_fork_069` |
| 행렬 담당 | `` | 1 | `PRO_L02B2_cargo_001` |
| 창고 지킴이 | `` | 1 | `PRO_L03AB2_warehouse_022` |
| 하역 동료 | `` | 1 | `PRO_L04AA1_guest_008` |
| 항로 담당 | `` | 1 | `PRO_L04AA1_cargo_017` |

## 7. 증거와 검사 한계

원시 비교 증거는 작업 공간 `audit-report/qa-assets-terms-v01513.json`, `story-asset-binding-cell-diff.json`, `qa-enemy-text-v01513.json`에 남겼다. 위 전체 행 수는 대사의 자연스러움을 전부 읽었다는 수치가 아니다. 이미지 검수도 원본 두 장 직접 열람과 연결/크기 검사를 조합한 것이며, 모든 이미지 구도·표정·장면 적합성을 직접 눈으로 전수 검수했다는 뜻이 아니다. 보스 그림 제작, 보조 NPC 그림 선택, 큰 화면에서 오즈 확대 표시의 실제 품질 평가는 남아 있다.
