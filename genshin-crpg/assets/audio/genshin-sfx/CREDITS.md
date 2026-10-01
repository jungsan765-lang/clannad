# v0.12 효과음 조사 결과

`ready/`의 MP3 26종은 총 827,436 bytes다. 모든 파일은 ffprobe 형식·길이 확인, ffmpeg 전체 디코딩 검사를 통과했다. 내려받은 ZIP도 CRC 검사를 통과했다. 원본 전체 길이를 유지하고 메타데이터를 제거했으며, 원본 peak가 -6 dBFS를 넘으면 감쇄했다. 청각 입력을 지원하지 않는 실행 환경이므로 사람이 실제로 들어본 음질 검증은 수행하지 못했다.

파일별 출처·해시·용도는 `integration-manifest.json`에 있다. 원본 게임 제작사와 녹음 모음 제작자를 함께 표기해야 한다.

## 권장 연결

| 준비된 파일 | 게임 연결 후보 | 실제 원본 출처/맥락 |
|---|---|---|
| fire.mp3 | 불 원소 | 공식 `통통 슬라임` 웹 이벤트의 불 슬라임 효과 |
| ice.mp3 | 얼음 원소 | 같은 이벤트의 얼음 슬라임 효과 |
| lightning.mp3 | 번개 원소 | 같은 이벤트의 번개 슬라임 효과 |
| wind.mp3 | 바람 원소 | 같은 이벤트의 바람 슬라임 효과 |
| heal.mp3 | 회복 | 본편 신상 HP 회복 녹음, 전체 5초 유지 |
| victory.mp3 | 승리 | 본편 도전 성공 녹음 |
| defeat.mp3 | 패배 | 본편 도전 실패 녹음 |
| hunt_bow.mp3 | 활 사냥 시작/활 공격 | 본편 활 일반 공격 녹음 |
| equip.mp3 | 장착 | 본편 장비 장착 녹음 |
| item_receive.mp3 | 구매/판매/재료 획득 | 본편 아이템 획득 녹음 |
| cook_complete.mp3 | 요리 완료 | 본편 요리 완료 녹음 |
| forge_complete.mp3 | 단조 완료 | 본편 단조 완료 녹음 |
| craft_complete.mp3 | 합성 완료 | 본편 합성 완료 녹음 |
| quest_complete.mp3 | 임무 완료 | 본편 임무 완료 녹음 |
| commission_accept.mp3 | 의뢰 수락 | 본편 의뢰 수락 녹음 |
| commission_complete.mp3 | 의뢰 완료 | 본편 의뢰 완료 녹음 |
| unlock.mp3 | 숨김 요소/퍼즐 해제 | 공식 웹 이벤트의 해제 효과 |
| encounter_hilichurl.mp3 | 해당 적의 전투 진입에만 | 본편 해당 적이 플레이어를 발견한 음성 |
| slime_hit.mp3 | 슬라임 공격에만 | 본편 슬라임 공격 녹음 |

공식 웹 이벤트 파일이 본편 전투음과 같다는 것은 확인하지 않았다. `heal` 이후 녹음본은 원신 소리를 직접 녹음했다고 작성자가 밝힌 공개 자료이며 **공식 CDN 직접 배포본은 아니다**. 일반 소리를 공식 원본이라고 가장하지 않는다.

## 연결을 보류할 후보

- `dendro`: 파일명은 해당 풀 캐릭터 스킬이나, 모음의 변경 기록이 2022년 출시 전 녹음이라고 명시한다. 출시된 본편과 동일한 소리인지 비교하지 못해 권장하지 않는다.
- `rock`: 본편 바위 원소폭발 녹음. 음성 혼입 여부를 직접 청취하지 못했으므로 기본 연결은 보류한다.
- `water_ambience`: 수영 소리이며 물 원소 전투음이 아니다.
- `pot_break`: 도자기 파괴음이며 바위 원소 고유 효과가 아니다.
- `slime_land`: 공식 웹 이벤트 슬라임 착지음이며 일반 타격음으로 증명되지 않았다.
- `event_success`/`event_fail`: 공식 웹 이벤트 결과음. 본편 성공·실패 녹음도 확보했으므로 결과에는 본편 쪽을 우선 제안한다.

## 확인하지 못한 요청

본편 일반 물리 타격·방어·물 원소 공격·융해/증발/과부하/빙결 전용 원본과 공식 새·멧돼지 소리는 이번 제한된 조사에서 용도와 소리를 모두 확인한 파일을 찾지 못했다. 현재 자체 제작음이나 자연 녹음을 그대로 유지한다면 최종 보고에서도 미완료로 구분한다. 기존 자연 녹음을 원신 공식 소리로 이름만 바꿔서는 안 된다.

## 0.14.7 추가: 전투 결과 음악 후보

설정의 「효과음 고르기」에서 승리·패배 음악으로 고를 수 있는 파일이다. 파일별 해시와 원본 위치는 `catalog.json`에 있다.

| 파일 | 용도 | 출처 |
|---|---|---|
| event_success.mp3 | 승리 후보 | 공식 `통통 슬라임` 웹 이벤트의 성공 효과(`effect_success`) 원본 그대로 |
| event_fail.mp3 | 패배 후보 | 같은 이벤트의 실패 효과(`effect_fail`) 원본 그대로 |
| ost_victory_gallant.mp3 | 승리 후보(기본) | 게임에 있는 원신 OST 《Gallant Challenge》(공식 웹 이벤트 배포본) 34.9–42.2초 |
| ost_victory_resolution.mp3 | 승리 후보 | 원신 OST 《His Resolution》(게임에 이미 있는 제3자 공개 보관본) 272.0–280.3초 |
| ost_victory_monoceros.mp3 | 승리 후보 | 원신 OST 《Wrath of Monoceros Caeli》(공식 웹 이벤트 배포본) 49.0–56.2초 |
| ost_victory_mountains.mp3 | 승리 후보 | 원신 OST 《Wind-Washed Mountains》(게임에 이미 있는 제3자 공개 보관본) 30.0–37.9초 |
| ost_defeat_moonlike.mp3 | 패배 후보 | 원신 OST 《Moonlike Smile》(공식 웹 이벤트 배포본) 62.0–72.8초 |
| ost_defeat_fragile.mp3 | 패배 후보 | 원신 OST 《Fragile Fantasy》(공식 웹 이벤트 배포본) 110.0–118.6초 |

OST 구간은 MP3 프레임 단위로 잘라 다시 인코딩하지 않았고, 재생할 때 앞 0.12초를 페이드 인·끝 약 1초를 페이드 아웃한다. 원곡 출처는 `assets/audio/README_OFFICIAL_AUDIO_KO.md`와 같다.

버튼 소리는 기존 `audio/official-review-click.mp3`(공식 웹 이벤트 클릭음)를 다시 기본으로 쓰고, 마우스를 올릴 때는 같은 파일을 1.45배 빠르게·0.07초만 재생한다. 그 밖의 합성음은 이 게임에서 만든 소리이며 원작 소리라고 표시하지 않는다.

## 출처

- 공식 이벤트: https://webstatic.mihoyo.com/ys/event/e20220517-jump-eola/index.html
- 실제 파일을 참조하는 JS: https://webstatic.mihoyo.com/ys/event/e20220517-jump-eola/index_e419b2294575f173ec57.js
- 녹음자 원 게시물: https://www.bilibili.com/video/BV1n64y1t7LR/
- 원 게시물이 링크한 ZIP: https://raw.githubusercontent.com/SamToki/Genshin-Impact-Archive/main/Genshin%20Impact%20Short%20Sound%20Collection.zip

녹음자 게시물의 출처 표기: audio copyright miHoYo; recording collection Sam Toki, CC BY-NC. 녹음자가 밝혔던 `229`개 WAV 파일과 ZIP 구조를 확인했다. 공식 CDN 원본 14개를 확보했고 그중 8개를 MP3로 정리했다. 녹음 모음에서 18개를 후보로 선정했다. 전체 라이브러리를 게임에 추가하지 않는다.
