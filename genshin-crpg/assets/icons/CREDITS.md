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
