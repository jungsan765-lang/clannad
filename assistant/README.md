# 캐릭터 비서

혼자 쓰는 Windows 바탕화면 캐릭터 비서. 배포하지 않음. 계획은 Claude 문서 "캐릭터 비서 개발 계획".

## 실행하기 (1단계: 대화)

1. Python 3.12 설치 후 이 폴더에서 `pip install -r requirements.txt`
2. API 키 설정 (둘 중 하나, 코드·설정 파일에는 쓰지 않음)
   - 환경 변수: `setx ANTHROPIC_API_KEY "키"` 후 새 터미널
   - Windows 자격 증명 관리자: `pip install keyring` 후
     `python -c "import keyring; keyring.set_password('danika-assistant', 'anthropic', '키')"`
3. `python main.py` (콘솔 창 없이: `pythonw main.py`)

- 캐릭터 클릭 → 입력창, Enter 로 보내면 말풍선으로 답한다. 드래그로 이동(위치 기억).
- 오른쪽 클릭·트레이 메뉴: 오늘/이번 달 사용 금액, 기억 보기, 기억 지금 정리하기, 최근 대화 잊기, 종료.
- 설정은 `config.toml`, 내 설정은 같은 키로 `config.local.toml` 에 (git 제외).
- 성격 파일: `config.toml` 의 `character.persona` (기본 `character/danika/persona.md`). 없으면 기본 말투.
- 캐릭터 그림: `character.folder` 의 `manifest.json` (make_character.py / make_rig.py 결과). 없으면 임시 원형 캐릭터.
- 기록은 `data/` 에만 저장 (git 제외): `usage.json` 비용, `memory.json` 장기기억, `recent.json` 최근 대화,
  `logs/날짜.jsonl` 대화 원문, `logs/app.log` 오류 기록.

### 화면 보기 (2단계)
- `screen.interval_seconds`(기본 30초)마다 `screen.monitor`(기본 왼쪽 모니터)를 캡처한다. 다니카는 오른쪽 모니터에 두면 된다.
- 화면이 거의 그대로면 판단 없이 건너뛴다(비용 0). 바뀌었으면 Haiku 가 말 걸지 판단(생각 끔),
  말하기로 했을 때만 Opus 가 화면을 보고 다니카 말투로 한마디 한다. 최소 간격은 `screen.cooldown_seconds`.
- 켜고 끄기: `screen.enabled`, 메뉴 체크, F9. 메뉴에서 바꾼 값은 다음에 켤 때도 유지된다(`data/state.json`).
- F8: 판단·간격 없이 지금 화면을 보고 말하게 한다. 먼저 건넨 말에 대답하면 그 말을 기억한 채 이어서 대화한다.
- 스크린샷은 디스크에 저장하지 않는다. 월 예산을 넘으면 화면 보기만 멈춘다(`screen.stop_when_over_budget`).

### 목소리로 말 걸기
- `voice.mode`: `always`(항상 듣기) | `push`(F7·메뉴로 그때만 듣기) | `off`. 메뉴의 "목소리로 말 걸기"에서도 바꾼다.
- 음성은 PC 안에서 Whisper(`voice.model`)로 글자가 된 뒤 일반 대화처럼 보내진다. 처음 쓸 때 모델을 내려받는다.
- 항상 듣기는 게임 음성 채팅 같은 말에도 반응한다. `voice.wake_word = "다니카"` 로 하면 이름을 부른 말에만 반응한다.

### 단축키
- `hotkeys` 의 F7(듣기)·F8(지금 화면)·F9(화면 보기 켜고 끄기). 등록한 키는 다른 프로그램으로 전달되지 않으니 게임 키와 겹치면 바꾼다.

### 대화가 동작하는 방식
- 모든 API 호출은 `ai_client.py` 하나로 모인다. 모델은 `config.toml` 의 `ai.chat_model` / `ai.memory_model`.
- 답은 JSON(`speak`, `message`, `emotion`) 형식으로만 받는다 (structured outputs).
- 한국어 강제: 규칙을 프롬프트 맨 앞에 두고, 답에 영어가 섞이면 한 번 다시 요청, 그래도 영어면 표시하지 않는다.
- 장기기억: 대화가 `memory.consolidate_every` 번 쌓이거나 다음에 켤 때, 캐릭터 본인 시점의 짧은 한국어 메모로
  다시 정리해 프롬프트에 넣는다. 성격 부분과 기억 부분은 따로 캐시해서 비용을 줄인다.
- 비용: 응답의 실제 토큰 수로 계산해 `data/usage.json` 에 쌓고, 월 예산의 80%·100% 에서 한 번씩 알린다.

## 캐릭터 만들기 (영상 → 바탕화면 캐릭터)

준비: Python 3.12, ffmpeg (`winget install Gyan.FFmpeg`), `pip install -r requirements.txt`

```
python make_character.py scan 영상.mp4                 # 시간표시 썸네일 시트 + 장면 목록 (work/scan/)
python make_character.py new 이름 영상.mp4              # character/이름.toml 레시피 생성
#   → 레시피에 동작별 start/end 를 채운다
python make_character.py build character/이름.toml      # 누끼·정렬·루프·미리보기
python preview_character.py character/이름              # 바탕화면에 띄워 확인
```

- 누끼: 기본은 애니 캐릭터 AI 분할 모델(처음 한 번 약 170MB 자동 다운로드). 단색 배경은 `matte = "chroma"`.
- 결과물(`character/`), 영상, 모델, 작업 폴더는 `.gitignore`로 저장소에 올라가지 않는다.

## 캐릭터 만들기 (분리 파츠 → 리깅)

```
python make_rig.py character/이름_rig.toml   # 숨쉬기·고개·머리카락·깜빡임, 끄덕임, 갸웃 → character/이름/
```

## 테스트

```
QT_QPA_PLATFORM=offscreen python -m pytest -q tests
```
