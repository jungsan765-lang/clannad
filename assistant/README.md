# 캐릭터 비서

혼자 쓰는 Windows 바탕화면 캐릭터 비서. 배포하지 않음. 계획은 Claude 문서 "캐릭터 비서 개발 계획".

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

## 테스트

```
QT_QPA_PLATFORM=offscreen python -m pytest -q tests
```
