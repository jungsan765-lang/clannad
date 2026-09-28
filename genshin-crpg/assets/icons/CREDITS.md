# v0.12 아이템 아이콘·피해 숫자 자산

통합 파일: `item-icons.json`, `assets/icons/`, `assets/fonts/hoyo-damage-numbers.woff`, `damage-font.css`.

- 아이템·무기 개별 원본 아이콘 127개: 공식 HoYo CDN 42개, 공개 원본 게임 텍스처 보관본 85개.
- 분류 대체 아이콘 6개. `categories`와 `categoryByLabel`로 조회. 자체 CRPG 아이템은 정확한 원신 아이콘이 없으므로 분류 아이콘이라고 표시한다.
- 최적화된 전체 자산 1,568,338바이트(약 1.50MiB).
- 숫자 폰트 2,356바이트: 공식 웹 이벤트의 Default_SC-85W 숫자 글리프를 합친 WOFF. 0~9 및 + - % , . 지원. 한글과 나머지 문자는 기존 UI 폰트에 맡긴다. `HoyoDamageNumbers`는 CSS 별칭이다.

## 적용

개별 아이콘: `manifest.icons[DB_ID].path`. 없으면 `manifest.categories[manifest.categoryByLabel[분류]]`를 사용한다. 대체 아이콘에 개별 아이템의 공식 외형이라는 설명을 붙이지 않는다.

CSS `damage-font.css`를 스타일에 추가하고 피해 숫자에 `font-family:HoyoDamageNumbers, sans-serif;font-weight:400`을 적용한다. 이 CSS는 페이지 기준 assets 경로다.

## 검증

127개 이미지 전체 디코딩·SHA-256 확인, 공식 CDN의 공통 깨진 그림(HTTP 200 응답) 해시 제외, 투명 PNG→256px 이내 WebP 변환, 전체 접촉 시트 육안 확인. 폰트 15개 문자 모두 cmap과 윤곽을 확인하고 실제 숫자 예시를 렌더링했다.

## 출처

- 한국어 공식 게임 이름·파일 ID 대조: https://github.com/theBowja/genshin-db 와 https://github.com/theBowja/genshin-db-dist (게임 데이터 보관본; 조회 시 7.1 반영).
- 아이콘 원본 공개 보관본: https://github.com/ylyking/GenshinTextures-full (원본 텍스처 추출임을 README에 명시).
- 공식 CDN의 실제 개별 URL 및 파일별 원본/최적화 SHA-256은 `source-manifest.json`에 기록.
- 공식 숫자 글리프 예: https://act-webstatic.mihoyo.com/font_generate/hanyi-sc/hanyi-sc-30.woff
- 이 글리프 로더를 사용하는 공식 웹 이벤트: https://act.hoyoverse.com/ys/event/e20240316discovery/index.html

이 자료는 자산의 출처·일치 여부를 기록한다. 재배포 사용 조건 전체를 검토했다거나 모든 원신 자산에 제한이 없다고 주장하지 않는다.

## 미확보/주의

`fallback-items.json`에 현재 DB의 개별 아이콘 미확보 항목(자체 제작품 포함) 145개를 기록했다. `item-icons.json.unavailable`에는 이름/파일 ID 매칭은 됐지만 도달 가능한 원본 자산이 없던 44개가 있다. 최신 지역의 일부 원소재·장비는 분류 아이콘으로 남겨야 한다.

기존 시트의 이름 차이는 변경하지 않았다. `verified_id_alias` 11개는 ID 의미에 따라 원본 아이콘을 연결했다. 특히 `MAT_TRANSOCEANIC_PEARL`을 기존 표시명만으로 이색 결정석에 연결하면 다른 등급 아이콘이므로 제외했다(세 관련 아이템 원본 아이콘은 미확보).

# v0.13.27 추가 아이콘 138개

분류 아이콘으로만 보이던 아이템·장비 138개에 개별 원본 텍스처를 연결했다. `unavailable` 44개는 모두 해소되어 빈 목록이 됐다. 새 WebP 합계 1,809,532바이트(약 1.73MiB).

- `exact_name` 46개: 원신에 같은 한국어 이름이 있는 아이템. 응축 결정·무지개 방울 수정·가장자리 땅의 무기 원형 5종·청심·유리주머니·「잿빛 눈동자」, 스네즈나야 식재료 6종과 요리 10종, 무기 18종, 성유물 세트 2종(세트 대표 부위인 생명의 꽃).
- `verified_id_alias` 11개: 같은 원작 아이템이지만 시트 표기가 다른 것. 이색 결정 3종은 표시명이 아니라 ID·등급(일반/고급/희귀 → 기이한 바다의 방울/결정/이색 결정석)으로 연결해 위 주의 사항의 등급 불일치를 피했다. 스네즈나야 소재 8종은 시트에 「한국 공식 표기 확인 못 함」으로 남은 것을 원작 이름(눈서리꽃·복슬풀·키메라 코어 3종 등)으로 연결했다. 시트 이름은 저장 호환성 때문에 바꾸지 않았다.
- `official_base_visual` 81개: 원작에 없는 CRPG 자체 아이템·장비. 가장 비슷한 원작 텍스처를 골라 붙였고, 원작 동명 아이템이라고 주장하지 않는다. 항목별 `sourceName`에 원작 이름, `note`에 대응 근거를 적었다. 예: 원소 공명 변환기=매개 변수 변환기, 장비 수리 키트=파도 배 수리 공구함, 여행자 응급치료 세트=삼공식·영양키트, 철제 수호갑=장수의 투구, 치유사의 브로치=교관의 브로치.

## 출처 우선순위

1. 무기·성유물은 공식 HoYo CDN `upload-bbs.mihoyo.com/game_record/genshin/equip/`부터 조회해 14개를 받았다. 없는 파일에 돌려주는 공통 깨진 그림 해시는 제외했다.
2. 아이템은 원본 텍스처 보관본 `ylyking/GenshinTextures-full`에서 39개(2022년 이전 텍스처).
3. 나머지 중 59개는 원본 PNG를 그대로 제공하는 `enka.network/ui/`에서 받았다(CDN에 없는 무기·성유물 포함, `original_game_texture_mirror`).
4. 위 세 곳에 없는 최신 텍스처 26개는 `gi.yatta.moe/assets/UI/`에서 받았다(재인코딩본이라 `original_game_texture_mirror_reencoded`로 구분).

한국어 이름·아이템 ID 대조는 genshin-db(v5.2.14)와 Project Amber API(`gi.yatta.moe/api/v2/kr`)를 함께 사용했다. 모든 이미지를 디코딩해 256px 이내 WebP(q90)로 변환하고 원본·변환본 SHA-256을 `item-icons.json`과 `item-icon-sources.json`에 기록했으며, 접촉 시트로 전체를 육안 확인했다. 시스템 전용 행(SYS_*, 간이 회복식·파티 식사 시스템 행, 예시 장비), 스토리 전용 신의 심장, 아직 열리지 않은 스네즈나야 특별 보상 2종은 분류 아이콘을 유지한다.

# v0.13.30 아이콘 재선정 15개

그림이 아이템과 어울리지 않던 4개를 바꾸고, 런타임이 추가해 개별 그림이 없던 11개(`installedBy: runtime`)에 그림을 붙였다. 모두 원작 동명 아이템이 아니라 가장 비슷한 원작 그림이다(`official_base_visual`). 예외는 잃어버린 바위 신의 눈동자로, 원작과 이름이 같다(`exact_name`). 새 WebP 14개를 추가했고, 더 쓰지 않는 3개(`UI_ItemIcon_113005`, `113007`, `114077`)는 지웠다.

| 아이템 | 이전 | 새 원작 그림 | 출처 |
|---|---|---|---|
| 생명 반지 | 북풍의 고리(재료) | 약스체의 고리 `UI_EquipIcon_Catalyst_Isikhulu` — 반지 모양 법구 | enka.network/ui |
| 나무 부적 | 분류 아이콘 | 숲의 이슬을 닮은 동 부적 `UI_ItemIcon_114037` | GenshinTextures-full |
| 누빔 두건(구 누빔 조끼) | 분류 아이콘 | 떠돌이 의사의 두건 `UI_RelicIcon_10013_3` — 장비도 조끼에서 두건으로 바꿈 | HoYo CDN |
| 수압 섬유 | 동풍의 숨결 | 물보라깃 산호 `UI_ItemIcon_101247` | gi.yatta.moe(재인코딩) |
| 용혈 결정 | 진홍의 옥수 | 혈옥의 가지 `UI_ItemIcon_113018` | GenshinTextures-full |
| 화염 합금 | 긴 밤을 밝히는 불티 | 진홍의 옥수 `UI_ItemIcon_107010` | GenshinTextures-full |
| 잃어버린 바위 신의 눈동자 | 분류 아이콘 | 같은 이름 `UI_ItemIcon_107003` | GenshinTextures-full |
| 과일 미끼 | 분류 아이콘 | 과즙 미끼 `UI_ItemIcon_111023` | GenshinTextures-full |
| 야타용왕의 지맥 결정 | 분류 아이콘 | 용왕의 면류관 `UI_ItemIcon_113017` | GenshinTextures-full |
| 성유물 · 칼날형 | 분류 아이콘 | 검투사의 미련 `UI_RelicIcon_15001_4` | HoYo CDN |
| 성유물 · 격류형 | 분류 아이콘 | 도금 브로치 `UI_RelicIcon_15016_4` | HoYo CDN |
| 성유물 · 철벽형 | 분류 아이콘 | 공로의 꽃 `UI_RelicIcon_15017_4` | HoYo CDN |
| 성유물 · 생명형 | 분류 아이콘 | 바다에 물든 꽃 `UI_RelicIcon_15022_4` | HoYo CDN |
| 성유물 · 신속형 | 분류 아이콘 | 야생화 기억 속의 푸른 들판 `UI_RelicIcon_15002_4` | HoYo CDN |
| 성유물 · 균형형 | 분류 아이콘 | 옛 벗의 마음 `UI_RelicIcon_10001_4` | HoYo CDN |

변환 방식과 해시 기록은 v0.13.27과 같다. 런타임 추가 항목은 `item-icons.json`에서 `installedBy: "runtime"`로 표시해 콘텐츠 시트에 없는 ID임을 구분한다.

## v0.13.40 리월 특산물 · 콜 라피스 제작 장비

런타임에 추가되는 24개 항목(`installedBy: "runtime"`). 특산물 6개는 같은 이름의 원본 아이콘, 제작 장비 18개는 분위기가 맞는 원작 무기·성유물 외형을 빌린 것이다(`official_base_visual`, 원작의 같은 장비라는 뜻이 아님).

| CRPG 아이템 | 원본 이름 `텍스처` | 출처 |
|---|---|---|
| 콜 라피스 · 야박석 · 유리백합 · 예상꽃 · 별소라 · 절운고추 | 같은 이름 `UI_ItemIcon_100058/100028/100030/100029/100033/100027` | GenshinTextures-full |
| 암각 파쇄검 | 용의 포효 `UI_EquipIcon_Sword_Rockkiller` | HoYo CDN |
| 암맥 대검 | 천암고검 `UI_EquipIcon_Claymore_Lapis` | HoYo CDN |
| 천암 관통창 | 천암장창 `UI_EquipIcon_Pole_Lapis` | HoYo CDN |
| 천형 대공궁 | 흑암 배틀 보우 `UI_EquipIcon_Bow_Blackrock` | HoYo CDN |
| 절운 불씨 법구 | 일월의 정수 `UI_EquipIcon_Catalyst_Resurrection` | HoYo CDN |
| 별소라 물결 법구 | 소심 `UI_EquipIcon_Catalyst_Truelens` | HoYo CDN |
| 적옥 내열갑 | 불 위를 걷는 현인 `UI_RelicIcon_14003_2` | HoYo CDN |
| 뇌운 절연복 | 뇌명을 평정한 존자 `UI_RelicIcon_14002_3` | HoYo CDN |
| 벽수 방수 외투 | 몰락한 마음 `UI_RelicIcon_15016_1` | HoYo CDN |
| 기암 중장갑 | 유구한 반암 `UI_RelicIcon_15014_3` | HoYo CDN |
| 운보 경갑 | 대지를 유랑하는 악단 `UI_RelicIcon_15003_3` | HoYo CDN |
| 청심 정화 향낭 | 사랑받는 소녀 `UI_RelicIcon_14004_2` | HoYo CDN |
| 천암군 수호 인장 | 견고한 천암 `UI_RelicIcon_15017_2` | HoYo CDN |
| 유리백합 치유 매듭 | 사랑받는 소녀 `UI_RelicIcon_14004_4` | HoYo CDN |
| 천추 관측경 | 학사 `UI_RelicIcon_10012_5` | HoYo CDN |
| 지맥 안정 말뚝 | 유구한 반암 `UI_RelicIcon_15014_5` | HoYo CDN |
| 야박석 원소 부적 | 물을 모시는 자 `UI_RelicIcon_15010_3` | HoYo CDN |
| 잿불막이 부적 | 불을 모시는 자 `UI_RelicIcon_15009_3` | HoYo CDN |

이름·파일 ID는 genshin-db(한국어)로 대조했다. 변환 방식(256px 이내 WebP)과 해시 기록 방식은 v0.13.27과 같다.
## v0.13.41 필드 보스 재료

필드 보스 9종이 떨어뜨리는 원작 재료를 같은 이름의 원본 아이콘으로 표시한다(런타임 추가, `installedBy: "runtime"`).

| CRPG 아이템 | 원본 `텍스처` | 출처 |
|---|---|---|
| 폭풍의 씨앗 · 뇌광 프리즘 · 서리의 핵 · 응결의 꽃 · 현암의 탑 | `UI_ItemIcon_113001/113002/113010/113020/113009` | GenshinTextures-full |
| 꺼지지 않는 불씨 · 물처럼 맑은 마음 · 설익은 옥 · 룬 무늬 이빨 | `UI_ItemIcon_113011/113012/113016/113035` | GenshinTextures-full |

이미 들어 있던 113001·113010·113011은 기존 파일을 재사용했다. 재료 이름과 드랍 보스는 genshin-db(한국어)의 재료 출처로 대조했다.

## v0.13.41 캐릭터 전용 무기 · 보스 소재 장비

전용 무기 43종과 보스 소재 장비 9종은 CRPG 고유 장비다.
- 아이콘은 분위기가 맞는 원작 무기·성유물 외형을 빌렸다(`official_base_visual`).
- 원작의 같은 무기라는 뜻은 아니다.
- 원본은 모두 HoYo 공식 CDN에서 받았다.

| CRPG 장비 | 원본 이름 `텍스처` |
|---|---|
| 백악 전정검 | 진사의 방추 `UI_EquipIcon_Sword_Opus` |
| 반짝반짝 무대 악보 | 불멸의 달빛 `UI_EquipIcon_Catalyst_Kaleido` |
| 불운을 가르는 모험검 | 부식의 검 `UI_EquipIcon_Sword_Magnum` |
| 방랑 시인의 바람활 | 종말 탄식의 노래 `UI_EquipIcon_Bow_Widsith` |
| 고양이 꼬리 사냥활 | 바람 꽃의 노래 `UI_EquipIcon_Bow_Fleurfair` |
| 성당 침례의 검 | 오래된 자유의 서약 `UI_EquipIcon_Sword_Widsith` |
| 새벽 와이너리 대검 | 천공의 긍지 `UI_EquipIcon_Claymore_Dvalin` |
| 정찰 기사의 신호궁 | 청록의 사냥활 `UI_EquipIcon_Bow_Viridescent` |
| 민들레 기사의 검 | 매의 검 `UI_EquipIcon_Sword_Falcon` |
| 서리 여우의 비검 | 천공의 검 `UI_EquipIcon_Sword_Dvalin` |
| 도도코 폭죽 그림책 | 도도코 이야기집 `UI_EquipIcon_Catalyst_Ludiharpastum` |
| 측량 기사의 창 | 용의 척추 `UI_EquipIcon_Pole_Everfrost` |
| 점성술사의 천구 법구 | 천공의 두루마리 `UI_EquipIcon_Catalyst_Dvalin` |
| 메이드 기사의 수호검 | 설장의 성은 `UI_EquipIcon_Claymore_Dragonfell` |
| 단죄의 황녀 활 | 뒷골목 사냥꾼 `UI_EquipIcon_Bow_Outlaw` |
| 장미 서고 마도서 | 사풍 원서 `UI_EquipIcon_Catalyst_Fourwinds` |
| 늑대 무리의 대검 | 늑대의 말로 `UI_EquipIcon_Claymore_Wolfmound` |
| 심야 순찰 창 | 천공의 마루 `UI_EquipIcon_Pole_Dvalin` |
| 연금 확산 연구서 | 뒷골목의 술과 시 `UI_EquipIcon_Catalyst_Outlaw` |
| 물보라 기사의 대검 | 송뢰가 울릴 무렵 `UI_EquipIcon_Claymore_Widsith` |
| 불복려 약재 법구 | 벽락의 옥 `UI_EquipIcon_Catalyst_Morax` |
| 남십자 선장의 대검 | 이무기 검 `UI_EquipIcon_Claymore_Kione` |
| 불복려 부적검 | 참봉의 칼날 `UI_EquipIcon_Sword_Kunwu` |
| 군옥각 성광구 | 속세의 자물쇠 `UI_EquipIcon_Catalyst_Kunwu` |
| 옥형의 뇌광검 | 반암결록 `UI_EquipIcon_Sword_Morax` |
| 서수 춤꾼의 대검 | 빗물 베기 `UI_EquipIcon_Claymore_Perdue` |
| 월해정 비서의 활 | 아모스의 활 `UI_EquipIcon_Bow_Amos` |
| 고화 가문의 비검 | 흑암 장검 `UI_EquipIcon_Sword_Blackrock` |
| 왕생당 호접창 | 호마의 지팡이 `UI_EquipIcon_Pole_Homa` |
| 만민당 주방창 | 결투의 창 `UI_EquipIcon_Pole_Gladiator` |
| 선학의 구름 법구 | 학의 여음 `UI_EquipIcon_Catalyst_MountainGale` |
| 제비 매듭 법구 | 흑암 홍옥 `UI_EquipIcon_Catalyst_Blackrock` |
| 항마 야차의 창 | 화박연 `UI_EquipIcon_Pole_Morax` |
| 빙결 부적 창 | 식재 `UI_EquipIcon_Pole_Santika` |
| 록 스피릿 대검 | 흑암참도 `UI_EquipIcon_Claymore_Blackrock` |
| 공자의 물빛 활 | 극지의 별 `UI_EquipIcon_Bow_Worldbane` |
| 율법 자문의 인장서 | 왕실의 비전록 `UI_EquipIcon_Catalyst_Theocrat` |
| 야란의 첩보 활 | 약수 `UI_EquipIcon_Bow_Kirin` |
| 운한사 무대창 | 왕실의 장창 `UI_EquipIcon_Pole_Theocrat` |
| 월계 토끼 창 | 달을 꿰뚫는 화살 `UI_EquipIcon_Pole_Arakalari` |
| 계약 수호의 창 | 관홍의 창 `UI_EquipIcon_Pole_Kunwu` |
| 퇴마 방사의 대검 | 왕실의 대검 `UI_EquipIcon_Claymore_Theocrat` |
| 달결정 수양검 | 왕실의 장검 `UI_EquipIcon_Sword_Theocrat` |
| 폭풍 씨앗 부적 | 청록색 그림자 `UI_RelicIcon_15002_2` |
| 뇌광 프리즘 렌즈 | 번개 같은 분노 `UI_RelicIcon_15005_5` |
| 서리 핵 보온구 | 얼음바람 속에서 길잃은 용사 `UI_RelicIcon_14001_4` |
| 응결 꽃 장식 | 얼음바람 속에서 길잃은 용사 `UI_RelicIcon_14001_2` |
| 현암 방벽 인장 | 유구한 반암 `UI_RelicIcon_15014_1` |
| 불씨 수호 부적 | 불타오르는 화염의 마녀 `UI_RelicIcon_15006_5` |
| 맑은 마음 성배 | 바다에 물든 거대 조개 `UI_RelicIcon_15022_1` |
| 설익은 옥 원소 갑옷 | 견고한 천암 `UI_RelicIcon_15017_1` |
| 룬 이빨 파쇄 장갑 | 창백의 화염 `UI_RelicIcon_15018_3` |

이름과 파일 ID는 genshin-db(한국어)로 대조했다.

## v0.14.3 요리·식재료 원본 아이콘 102개

분류 아이콘으로만 보이던 요리와 식재료, 이번에 추가한 몬드·리월 요리와 식재료에 원작 그림을 붙였다. 모두 원작에 같은 한국어 이름이 있는 아이템이다(`exact_name`).

- 요리 84개, 식재료 18개(설탕·라즈베리·송이버섯·행인·두부·연꽃받침·죽순·베이컨·금어초·훈제 새고기, 새 식재료 8종).
- 출처: GenshinTextures-full 81개, gi.yatta.moe/assets/UI(재인코딩본) 20개, enka.network/ui 1개. 출처 우선순위와 변환 방식(256px 이내 WebP q90, 원본·변환본 SHA-256 기록)은 v0.13.27과 같다.
- 새 WebP 합계 1,445,240바이트(약 1.38MiB).
- 한국어 이름·아이템 ID·요리 재료는 Project Amber API(`gi.yatta.moe/api/v2/kr`)로 대조했다. 접촉 시트로 전체를 육안 확인했다.
- 시스템 전용 행(SYS_*, 간이 회복식·파티 식사), 스토리 전용 신의 심장, 스네즈나야 특별 보상 2종은 계속 분류 아이콘을 쓴다.
