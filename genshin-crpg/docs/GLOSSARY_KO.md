# 고유명사 사전 (공식 한국어)

이 파일은 `node tools/editorial/build_glossary.cjs`가 [glossary_ko.json](../tools/editorial/glossary_ko.json)에서 만든다. 고칠 때는 JSON을 고치고 도구를 다시 돌린다.

## 쓰는 법
- 게임에 들어가는 글(데이터, 코드의 화면 문구, 이야기 원고, 업데이트 안내)에 고유명사를 쓸 때는 여기서 찾아 그대로 쓴다.
- 여기에 없는 이름은 공식 자료로 확인한 뒤 `terms`에 넣는다. 공식 자료는 공식 게임 문자열(Yatta), HoYoLAB 지도 지명, HoYoWiki 한국어다. 기억이나 추측으로 넣지 않는다(예: 「테이바트」는 틀렸고 공식은 「티바트」다).
- 캐릭터·무기·재료·몬스터·요리의 공식 이름은 `data`에 영어 → 한국어로 있다(characters 136, weapons 276, materials 824, monsters 570, foods 451; 2026-10-15 받음).
- `tests/test_glossary_v01647.cjs`가 지킨다.
  - 틀린 표기가 들어가면 막는다.
  - 게임 데이터의 몬드·리월 캐릭터, 무기, 몬스터 이름이 공식과 다르면 막는다.
  - 화면 바로잡기 표가 이 사전과 같은지 본다.
- **화면 바로잡기:** 옛 코드·규칙에 남은 표기는 화면에 그려질 때 공식 표기로 바뀐다(`source/app_glossary_v01647.js`). 새 글에는 처음부터 공식 표기를 쓴다.

## 고른 고유명사
| 공식 한국어 | 영어 | 종류 | 틀린 표기 | 확인한 곳 | 메모 |
| --- | --- | --- | --- | --- | --- |
| 티바트 | Teyvat | 세계 | 테이바트 | yatta | 2026-10-15 사용자 지적 |
| 나타 | Natlan | 나라 | 낫란, 나틀란 | yatta |  |
| 리월 | Liyue | 나라 | 리유에 | yatta |  |
| 몬드 | Mondstadt | 나라 | 몬드슈타트 | yatta |  |
| 수메르 | Sumeru | 나라 |  | yatta |  |
| 스네즈나야 | Snezhnaya | 나라 |  | yatta |  |
| 이나즈마 | Inazuma | 나라 |  | yatta |  |
| 켄리아 | Khaenri'ah | 나라 |  | yatta |  |
| 폰타인 | Fontaine | 나라 |  | yatta |  |
| 노드크라이 | Nod-Krai | 지역 |  | yatta |  |
| 선인 | Adeptus | 칭호 |  | yatta |  |
| 집정관 | Archon | 칭호 |  | yatta |  |
| 집행관 | Harbinger | 칭호 |  | yatta |  |
| 남십자 함대 | The Crux | 단체 | 남십자 선대 | 0.15.20 |  |
| 도금 여단 | Eremites | 단체 | 도금여단 (화면에서 바로잡음) | yatta | 게임 데이터의 수메르 몬스터 이름 2개가 「도금여단」(아직 나오지 않음) |
| 모험가 길드 | Adventurers' Guild | 단체 |  | game |  |
| 보물 사냥단 | Treasure Hoarders | 단체 | 보물사냥단 (화면에서 바로잡음) | yatta | 낱말 퍼즐 답과 적 태그(`[보물사냥단]`)에는 붙인 표기가 남아 있고 화면에서 바로잡는다 |
| 북국 은행 | Northland Bank | 단체 |  | 0.15.20 | 공식 문장은 띄어 씀. 이야기 원고에 「북국은행」이 섞여 있다(사용자 원고) |
| 비운 상회 | Feiyun Commerce Guild | 단체 |  | yatta | 0.16.67 축제 이야기 · Yatta 공식 게임 문자열 행추 소개 「비운 상회」 (2026-10-18 확인) |
| 심연 교단 | Abyss Order | 단체 |  | yatta |  |
| 우인단 | Fatui | 단체 | 파투이 | yatta |  |
| 운한사 | Yun-Han Opera House | 단체 | 운한 극단 | 0.15.20 |  |
| 천암군 | Millelith | 단체 |  | yatta |  |
| 칠성 | Liyue Qixing | 단체 |  | yatta | 0.16.67 축제 이야기 · Yatta 공식 게임 문자열 업적 「칠성 몰래 …」 (2026-10-18 확인) |
| 페보니우스 기사단 | Knights of Favonius | 단체 | 서풍 기사단, 서풍기사단 | yatta |  |
| 페보니우스 성당 | Church of Favonius | 단체 | 서풍 교회 | 0.15.20 |  |
| 군옥각 | Jade Chamber | 장소 |  | yatta |  |
| 리월항 | Liyue Harbor | 장소 |  | yatta |  |
| 만민당 | Wanmin Restaurant | 장소 |  | yatta |  |
| 망서 객잔 | Wangshu Inn | 장소 |  | yatta | 0.16.67 축제 이야기 · Yatta 공식 게임 문자열 업적 「망서 객잔의 …」 (2026-10-18 확인) |
| 몬드성 | Mondstadt City | 장소 |  | yatta |  |
| 옥경대 | Yujing Terrace | 장소 |  | yatta | 0.16.67 축제 이야기 · Yatta 공식 게임 문자열 임무 이름 (2026-10-18 확인) |
| 왕생당 | Wangsheng Funeral Parlor | 장소 |  | yatta | 0.16.67 축제 이야기 · Yatta 공식 게임 문자열 호두 소개·임무 「왕생당 당주 …」 (2026-10-18 확인) |
| 일곱신상 | Statue of The Seven | 장소 | 일곱 신상 | yatta | 붙여 씀 |
| 캣테일 | Cat's Tail | 장소 | 고양이 꼬리 | yatta | 주점 이름 |
| 타타우파 협곡 | Dadaupa Gorge | 장소 | 다다우파 | 0.15.20 |  |
| 누룽지 | Guoba | 인물 |  | yatta | 0.16.67 축제 이야기 · Yatta 공식 게임 문자열 향릉 원소전투 「누룽지 출격」 (2026-10-18 확인) |
| 모락스 | Morax | 인물 |  | game |  |
| 바르바토스 | Barbatos | 인물 |  | game |  |
| 설탕 | Sucrose | 인물 | 수크로스 | yatta |  |
| 엠버 | Amber | 인물 | 앰버 | yatta |  |
| 여행자 | Traveler | 인물 |  | yatta |  |
| 페이몬 | Paimon | 인물 | 파이몬 | yatta |  |
| 계시의 꽃 | Blossom of Revelation | 콘텐츠 |  | yatta |  |
| 나선 비경 | Spiral Abyss | 콘텐츠 | 나선비경 (화면에서 바로잡음) | yatta | 띄어 씀. 옛 코드·규칙 표식(`[나선비경]`)에는 붙인 표기가 남아 있고 화면에서 바로잡는다 |
| 부의 꽃 | Blossom of Wealth | 콘텐츠 |  | game |  |
| 비경 | Domain | 콘텐츠 |  | yatta |  |
| 지맥의 꽃 | Ley Line Blossom | 콘텐츠 |  | game |  |
| 축월절 | Moonchaser Festival | 콘텐츠 |  | yatta | 0.16.67 축제 이야기 · Yatta 공식 게임 문자열 임무 이름 「축월절」 (2026-10-18 확인) |
| 해등절 | Lantern Rite | 콘텐츠 |  | yatta | 0.16.67 축제 이야기 · Yatta 공식 게임 문자열 업적·임무 「해등절 첫째 날」 (2026-10-18 확인) |
| 기원 | Wish | 시스템 |  | yatta |  |
| 성유물 | Artifact | 시스템 |  | yatta |  |
| 원소폭발 | Elemental Burst | 시스템 |  | yatta | 붙여 씀. 적 기술 이름의 「원소 폭발」(화염 원소 폭발 등)은 창작 기술명이라 다르다 |
| 뒤얽힌 인연 | Intertwined Fate | 재화 |  | yatta |  |
| 레진 | Original Resin | 재화 |  | yatta |  |
| 만남의 인연 | Acquaint Fate | 재화 |  | yatta |  |
| 모라 | Mora | 재화 |  | yatta |  |
| 원석 | Primogem | 재화 | 프리모젬 | yatta |  |
| 주인 없는 스타더스트 | Masterless Stardust | 재화 |  | yatta | 상점에서는 「스타더스트」로 줄여 씀 |
| 주인 없는 스타라이트 | Masterless Starglitter | 재화 |  | yatta | 상점에서는 「스타라이트」로 줄여 씀 |
| 창세의 결정 | Genesis Crystal | 재화 |  | yatta |  |
| 모험가의 경험 | Adventurer's Experience | 아이템 |  | yatta |  |
| 방랑자의 경험 | Wanderer's Advice | 아이템 |  | yatta |  |
| 신의 눈 | Vision | 아이템 |  | yatta | 낱말 퍼즐 답은 띄어쓰기 없이 「신의눈동자」처럼 쓴다 |
| 신의 눈동자 | Oculus | 아이템 |  | yatta | 바람 신의 눈동자(Anemoculus), 바위 신의 눈동자(Geoculus) |
| 영웅의 경험 | Hero's Wit | 아이템 |  | yatta |  |
| 감전 | Electro-Charged | 원소 반응 |  | yatta |  |
| 결정 | Crystallize | 원소 반응 | 결정화 | 0.15.20 |  |
| 과부하 | Overloaded | 원소 반응 |  | yatta |  |
| 빙결 | Frozen | 원소 반응 |  | yatta |  |
| 융해 | Melt | 원소 반응 |  | yatta |  |
| 초전도 | Superconduct | 원소 반응 |  | yatta |  |
| 확산 | Swirl | 원소 반응 |  | yatta |  |

## 화면에서 바로잡는 표기
- 「나선비경」 → 「나선 비경」
- 「도금여단」 → 「도금 여단」
- 「보물사냥단」 → 「보물 사냥단」

## 예외 (틀린 표기처럼 보이지만 그대로 둠)
- `source/runtime_exclusive_weapons.js`의 「고양이 꼬리 사냥활」: 디오나 전용 무기(이 게임의 창작 이름). 주점 이름은 캣테일
- `tools/editorial/personal_k/VOICE_BIBLE.md`의 「*」: 글쓰기 규칙이 틀린 표기를 예로 든다(「서풍기사단 X」, 「다다우파 X」)
- `content/db.json`의 「원작의 일곱 신상 공양」: 개발 계획표의 설명(화면에 나오지 않음)
- `tools/editorial/main_story_k/README.md`의 「(테이바트 X)」: 원고 규칙이 틀린 표기를 예로 든다

## 게임 데이터와 공식 이름이 다른 것 (아직 게임에 나오지 않음)
- content/db.json 07_CHAR_DB 이나즈마 캐릭터 10명: 「아야카·아야토·헤이조·이토·코코미·카즈하·미코·미즈키·시노부·사라」 → 공식 「카미사토 아야카·카미사토 아야토·시카노인 헤이조·아라타키 이토·산고노미야 코코미·카에데하라 카즈하·야에 미코·유메미즈키 미즈키·쿠키 시노부·쿠죠 사라」 · 이나즈마는 아직 게임에 없고 기원에도 나오지 않는다. 넣을 때 공식 전체 이름으로
- content/db.json 09_MONSTER_DB MON_EREMITE_CROSSBOW·MON_EREMITE_GALEHUNTER: 「도금여단·석궁병, 도금여단·바람 사냥꾼」 → 공식 「도금 여단·석궁병, 도금 여단·바람 사냥꾼」 · 수메르 적이라 아직 나오지 않는다. 화면에서는 바로잡는다
