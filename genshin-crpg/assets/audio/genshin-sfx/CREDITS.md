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

## 출처

- 공식 이벤트: https://webstatic.mihoyo.com/ys/event/e20220517-jump-eola/index.html
- 실제 파일을 참조하는 JS: https://webstatic.mihoyo.com/ys/event/e20220517-jump-eola/index_e419b2294575f173ec57.js
- 녹음자 원 게시물: https://www.bilibili.com/video/BV1n64y1t7LR/
- 원 게시물이 링크한 ZIP: https://raw.githubusercontent.com/SamToki/Genshin-Impact-Archive/main/Genshin%20Impact%20Short%20Sound%20Collection.zip

녹음자 게시물의 출처 표기: audio copyright miHoYo; recording collection Sam Toki, CC BY-NC. 녹음자가 밝혔던 `229`개 WAV 파일과 ZIP 구조를 확인했다. 공식 CDN 원본 14개를 확보했고 그중 8개를 MP3로 정리했다. 녹음 모음에서 18개를 후보로 선정했다. 전체 라이브러리를 게임에 추가하지 않는다.
