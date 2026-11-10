# 캐릭터 인계 형식

이 프로그램(바탕화면 캐릭터 비서)이 바로 쓸 수 있는 캐릭터 형식이다. 그림·리깅 담당은 아래 **A** 형식을 권장한다.
**B** 는 분리 파츠를 받아 이쪽에서 리깅하는 방식, **C** 는 미리 알려줘야 하는 방식이다.

---

## A. 프레임 묶음 (권장, 그대로 적용)

폴더 하나에 `manifest.json` 과 동작별 PNG 프레임을 넣는다. 설정에서 이 폴더만 지정하면 끝.

```
danika/
  manifest.json
  idle/0000.png 0001.png ...
  talk/0000.png ...        (선택)
  nod/0000.png ...         (선택)
```

### 프레임 규칙
- PNG, RGBA(진짜 투명 채널). 배경·체크무늬·그림자 바닥 없음.
- **모든 동작, 모든 프레임이 같은 캔버스 크기**이고, 캐릭터가 같은 자리에 서 있어야 한다(동작이 바뀔 때 위치가 튀지 않게).
- 파일 이름은 `0000.png` 부터 빈 번호 없이.
- 권장 크기: 캐릭터 키 600~800px. 권장 fps: 24~30.
- 반복 동작(`loop`)은 마지막 프레임 다음에 첫 프레임이 와도 자연스러워야 한다.
- 한 번 재생 동작(`once`)은 기본 대기 동작(`idle`)의 **첫 프레임 자세에서 시작해서 그 자세로 끝나야** 한다.
- 불투명 픽셀은 알파 255(253 같은 값은 뒤가 비쳐 보임). 가장자리만 부드럽게.
- 메모리: 프레임이 모두 메모리에 올라간다. 동작 전체 합계 600장 이하를 권장.

### manifest.json

```json
{
  "format": 1,
  "name": "danika",
  "size": [512, 768],
  "image_format": "png",
  "default": "idle",
  "talk": "talk",
  "motions": {
    "idle": {"dir": "idle", "frames": 180, "fps": 30, "loop": "loop", "then": null},
    "talk": {"dir": "talk", "frames": 60,  "fps": 30, "loop": "loop", "then": null},
    "nod":  {"dir": "nod",  "frames": 36,  "fps": 30, "loop": "once", "then": "idle"},
    "appear": {"dir": "appear", "frames": 45, "fps": 30, "loop": "once", "then": "idle"}
  },
  "emotions": {"normal": "idle", "happy": "nod", "worried": "idle", "surprised": "idle", "angry": "idle"},
  "fidgets": ["tilt"],
  "fidget_every": [90, 240]
}
```

| 키 | 뜻 |
|---|---|
| `size` | 프레임 캔버스 크기 [너비, 높이] |
| `default` | 평소 재생하는 동작 (보통 `idle`) |
| `talk` | 말풍선이 떠 있는 동안 재생할 반복 동작. 없으면 `null` |
| `motions.*.loop` | `loop`(반복) · `pingpong`(앞뒤 왕복) · `once`(한 번) |
| `motions.*.then` | `once` 가 끝나면 이어서 재생할 동작 |
| `emotions` | 대사의 감정 값 → 재생할 동작. 감정은 `normal, happy, worried, surprised, angry` |
| `fidgets` | 가만히 있을 때 가끔 하는 `once` 동작들 |
| `fidget_every` | 그 간격(초) [최소, 최대] |
| (특별) `appear` | 이 이름의 동작이 있으면 프로그램을 켤 때 한 번 재생 |

---

## B. 분리 파츠 + layers.json (이쪽에서 리깅)

`Danica_Parts_Handoff_v0.1` 과 같은 형식. `make_rig.py` 로 숨쉬기·고개·머리카락·깜빡임·끄덕임·갸웃을 만들어 A 형식으로 굽는다.

- 모든 파츠가 같은 전체 캔버스 좌표(여백 자르지 않음), `layers.json` 에 순서(z)·위치·교체 관계.
- 깜빡임은 눈 감은 얼굴 + `optional_eye_region_xyxy`(눈 위치). 눈 밖 얼굴형·피부색은 눈 뜬 얼굴과 **완전히 같아야** 한다.
- 더 많이 움직이려면 따로 분리: 홍채(시선), 입(말하기), 팔·손(손 동작), 앞머리 몇 갈래, 옷자락.

---

## C. Live2D (Cubism)

`model3.json` + `.moc3` + 텍스처 + 모션(`.motion3.json`) 형식이면 프로그램에 Live2D 실행기를 추가해야 한다(Qt WebEngine + Cubism SDK for Web).
이 형식으로 만들 거면 **미리 알려줄 것**. 파라미터 이름(ParamEyeLOpen, ParamAngleX 등)은 Cubism 표준 이름을 쓴다.
