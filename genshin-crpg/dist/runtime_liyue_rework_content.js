/* CRPG-authored scenes, not official Genshin quests. */
globalThis.CRPGLiyueRework={
  "version": 1,
  "missions": {
    "reed": {
      "title": "벽수원 · 끊긴 보급로",
      "intro": "망서 객잔으로 가는 짐이 적화주에서 끊겼다. 행추는 물에 젖은 운송표를 펼치고, 향릉은 멈춘 수레에서 식재료부터 건져 낸다. 항구의 설명을 기다리기 전에 이 길에서 무슨 일이 생겼는지 확인해야 한다.",
      "steps": [
        {
          "kind": "INVESTIGATE",
          "map": "MAP_LY_DETAIL_DIHUA",
          "title": "갈대 사이의 수레 자국",
          "prompt": "행추: 물건은 말을 바꾸지 않지. 발자국보다 먼저 바퀴가 어디서 꺾였는지 보자.",
          "clues": [
            {
              "id": "0",
              "label": "갈대밭의 자국",
              "text": "사람 발자국은 물가로 가지만, 무거운 수레의 두 줄은 돌다리 쪽에서 끊긴다."
            },
            {
              "id": "1",
              "label": "찢어진 운송표",
              "text": "망서 객잔으로 보낼 약재와 식료품이다. 운송표의 붉은 매듭은 돌다리 보급대의 표시다."
            },
            {
              "id": "2",
              "label": "물가의 빈 자루",
              "text": "바닥이 마르고 가벼운 돌만 들었다. 젖은 발자국은 이 자루를 끌어 만든 흔적이다."
            }
          ],
          "answer": 1,
          "options": [
            "물가 발자국을 따라간다",
            "돌다리 쪽 끊긴 바퀴 자국을 찾는다",
            "운송표를 버리고 객잔으로 간다"
          ],
          "result": "빈 자루로 만든 유인 흔적을 피했다. 돌다리 뒤에서 멈춘 수레를 찾았다.",
          "speaker": "XINGQIU"
        },
        {
          "kind": "ESCORT",
          "map": "MAP_LY_DETAIL_DIHUA",
          "title": "보급 수레 호위",
          "prompt": "수레를 지키며 3라운드를 버틴 뒤 남은 적을 제압한다. 적을 먼저 처치하면 수레가 안전하게 이동한다.",
          "result": "수레가 갈대밭을 벗어났다. 향릉이 건져 낸 식료품도 무사하다.",
          "speaker": "XIANGLING"
        },
        {
          "kind": "SEQUENCE",
          "map": "MAP_LY_DETAIL_WANGSHU",
          "title": "객잔 승강기 복구",
          "prompt": "향릉: 사람과 짐은 내렸어. 먼저 움직이지 않게 고정하고, 끊긴 줄을 묶은 다음 빈 승강기로 시험하자.",
          "options": [
            "빈 승강기를 시험한다",
            "제동 쐐기를 끼운다",
            "새 밧줄을 고정한다"
          ],
          "sequence": [
            1,
            2,
            0
          ],
          "result": "승강기가 빈 상태로 올라갔다 내려왔다. 짐꾼들이 약재를 올리는 동안 다친 사람을 객잔으로 옮겼다.",
          "speaker": "XIANGLING"
        }
      ]
    },
    "witness": {
      "title": "귀리 평원 · 말보다 먼저 남은 흔적",
      "intro": "연비가 봉쇄선 바깥으로 나와 증언과 실제 물자를 따로 살핀다. “기억을 못 한다고 잘못한 사람이 되는 건 아니야. 지금 손으로 확인할 수 있는 것부터 찾자.”",
      "steps": [
        {
          "kind": "INVESTIGATE",
          "map": "MAP_LY_DETAIL_GUILI",
          "title": "사라진 인계 구간",
          "prompt": "같은 표식이 찍힌 포대가 두 곳에 있다. 어느 기록을 먼저 고쳐야 할까?",
          "clues": [
            {
              "id": "0",
              "label": "포대의 봉함",
              "text": "두 포대 모두 뜯기지 않았고 수량도 같다. 물건을 훔쳤다는 증거는 없다."
            },
            {
              "id": "1",
              "label": "운송표의 시간",
              "text": "앞의 인계 시각이 뒤의 도착 시각보다 늦다. 시각을 옮겨 적은 줄이 겹쳤다."
            },
            {
              "id": "2",
              "label": "병사의 진술",
              "text": "병사는 자기 이름과 앞뒤 업무는 기억하지만 인계하던 짧은 구간을 말하지 못한다."
            }
          ],
          "answer": 2,
          "options": [
            "병사를 범인으로 단정한다",
            "구슬이 원인이라고 기록한다",
            "수량과 시각의 불일치만 따로 남긴다"
          ],
          "result": "연비는 확인한 수량과 어긋난 시각만 기록했다. 기억 공백의 원인은 여전히 알 수 없다.",
          "speaker": "YANFEI"
        },
        {
          "kind": "CHOICE",
          "map": "MAP_LY_DETAIL_GUILI",
          "title": "다시 움직일 자리",
          "prompt": "물자를 조사하는 동안 경계가 비었다. 무엇을 먼저 할까?",
          "options": [
            "병사에게 휴식을 권하고 경계 교대를 요청한다",
            "포대를 옮길 사람을 모으고 길을 비운다"
          ],
          "results": [
            "병사는 쉬는 동안 자신이 기억하는 구간을 적었다. 진술을 강요하지 않고 교대를 마쳤다.",
            "포대를 함께 옮겨 수레 한 대가 지나갈 틈을 만들었다. 혼자 들겠다고 나서지 않은 덕에 허리도 무사하다."
          ],
          "speaker": "YANFEI"
        }
      ]
    },
    "minlin": {
      "title": "민림·층암거연 · 의례 전의 보급길",
      "intro": "송신의례까지 남은 날, 외곽 대기처에는 약재와 장작이 모자랐다. 감우가 마련한 운송표를 들고 요요와 함께 민림으로 간다. 돌아오는 길에는 신염과 층암거연 입구의 자재 통로를 열어 대기처에 보낼 물자를 챙긴다.",
      "steps": [
        {
          "kind": "CHOICE",
          "map": "MAP_LY_DETAIL_HUAGUANG",
          "title": "계곡의 약재 운반",
          "prompt": "요요가 물에 젖지 않은 길을 가리킨다. 짐을 나눠 들면 옆의 좁은 바위턱도 지날 수 있다.",
          "options": [
            "짐을 나누고 천천히 건넌다",
            "무거운 짐은 두고 사람부터 건넌 뒤 다시 옮긴다"
          ],
          "results": [
            "요요가 앞에서 돌을 짚어 준다. 가벼운 짐부터 옮겨 모두가 계곡을 건넜다.",
            "사람이 먼저 안전한 곳에 섰다. 남은 짐은 줄로 받아 올렸다."
          ],
          "speaker": "YAOYAO"
        },
        {
          "kind": "DESTROY",
          "map": "MAP_LY_DETAIL_HULAO",
          "title": "보급길을 막은 낙석",
          "prompt": "전투에서 「무너진 통로의 버팀돌」을 공격해 내구도를 모두 깎는다. 버팀돌은 공격하거나 원소를 부착하지 않는다.",
          "result": "버팀돌을 깨자 작은 돌들이 안전한 쪽으로 굴러내렸다. 막혔던 보급 수레 길이 열렸다.",
          "speaker": "CHONGYUN"
        },
        {
          "kind": "SEQUENCE",
          "map": "MAP_LY_DETAIL_QINGYUN",
          "title": "바람에 돌아간 길잡이",
          "prompt": "감우가 보낸 약도에는 낮은 길의 표식부터 잇도록 적혀 있다. 계곡→중턱→고개 순으로 이정표를 돌리자.",
          "options": [
            "고개 표식",
            "계곡 표식",
            "중턱 표식"
          ],
          "sequence": [
            1,
            2,
            0
          ],
          "result": "고개에서 계곡까지 표식이 이어졌다. 돌아오는 약재 수레는 더 이상 같은 갈림길을 돌지 않는다.",
          "speaker": "GANYU"
        },
        {
          "kind": "SEQUENCE",
          "map": "MAP_LY_DETAIL_CHASM_GATE",
          "title": "공명 말뚝의 안전 해제",
          "prompt": "신염: 사람은 갱도 밖으로 나왔어. 지지대를 받치고, 떨리는 쇠기둥을 멈춘 뒤, 작은 돌을 치우자. 박자를 맞추듯 한 단계씩 가는 거야.",
          "options": [
            "버팀목 고정",
            "낙석 제거",
            "공명 말뚝 정지"
          ],
          "sequence": [
            0,
            2,
            1
          ],
          "result": "지지대를 받친 뒤 흔들리는 기둥을 멈췄다. 자재 통로 앞의 작은 돌을 치웠다.",
          "speaker": "XINYAN"
        },
        {
          "kind": "DESTROY",
          "map": "MAP_LY_DETAIL_CHASM_RIM",
          "title": "구조 통로의 버팀돌",
          "prompt": "전투에서 「무너진 통로의 버팀돌」을 공격해 내구도를 모두 깎는다. 버팀돌은 공격하거나 원소를 부착하지 않는다.",
          "result": "낙석을 깨고 임시 보급 통로를 열었다. 기다리는 사람들에게 보낼 장작과 천막 지지대를 꺼낼 수 있게 됐다.",
          "speaker": "XINYAN"
        }
      ]
    },
    "escape": {
      "title": "옥경대 · 끊긴 탈출로",
      "intro": "반응 없는 사람들 사이에서 돌아갈 통로를 찾았다. 계단 끝은 무너진 가림벽에 막혀 있다. 살아 있는 사람을 찾아 밖에 이 일을 알려야 한다.",
      "steps": [
        {
          "kind": "INVESTIGATE",
          "map": "MAP_LY_DETAIL_YUJING",
          "title": "흔들리는 통로",
          "prompt": "벽을 무작정 밀면 계단까지 무너진다. 어디를 열어야 할까?",
          "clues": [
            {
              "id": "0",
              "label": "난간의 돌가루",
              "text": "난간 밑 기둥은 금이 이어져 있다. 이쪽을 치면 계단도 내려앉는다."
            },
            {
              "id": "1",
              "label": "벽 아래의 틈",
              "text": "바람이 드나드는 틈 위에 작은 버팀돌 하나가 걸렸다."
            },
            {
              "id": "2",
              "label": "계단의 발자국",
              "text": "행사장 밖으로 나가는 발자국이 틈 너머까지 이어진다."
            }
          ],
          "answer": 1,
          "options": [
            "난간 기둥을 부순다",
            "바람이 드나드는 틈의 버팀돌을 제거한다",
            "벽 전체를 한꺼번에 민다"
          ],
          "result": "벽 아래의 작은 틈을 작업할 자리로 골랐다.",
          "speaker": ""
        },
        {
          "kind": "DESTROY",
          "map": "MAP_LY_DETAIL_YUJING",
          "title": "탈출로의 가림벽",
          "prompt": "전투에서 「무너진 통로의 버팀돌」을 공격해 내구도를 모두 깎는다. 버팀돌은 공격하거나 원소를 부착하지 않는다.",
          "result": "사람 하나가 빠져나갈 틈이 열렸다. 가방을 먼저 밀어 넣고 뒤따라 통로를 벗어났다.",
          "speaker": ""
        }
      ]
    },
    "guyun": {
      "title": "고운각 · 바다 쪽 경보",
      "intro": "실종된 몸의 단서를 좇는 동안, 북두가 해상 경보를 전한다. 응광에게 위험을 말로만 경고하기 전에 고운각의 경보 장치와 대피 항로가 작동하는지 확인하기로 했다.",
      "steps": [
        {
          "kind": "INVESTIGATE",
          "map": "MAP_LY_DETAIL_GUYUN",
          "title": "같은 빛, 다른 암초",
          "prompt": "북두: 불빛만 보고 노를 젓지 마. 바위에 물이 부딪치는 방향까지 봐.",
          "clues": [
            {
              "id": "0",
              "label": "서쪽 신호",
              "text": "등불 아래 바위가 마르고, 바람이 불 때마다 빛이 같은 쪽으로 기운다."
            },
            {
              "id": "1",
              "label": "동쪽 신호",
              "text": "등불이 파도보다 먼저 움직인다. 물에 비친 가짜 빛이다."
            },
            {
              "id": "2",
              "label": "수면의 흰 물결",
              "text": "서쪽 암초 바깥으로 하얀 물결이 길게 흐른다. 안쪽은 소용돌이다."
            }
          ],
          "answer": 0,
          "options": [
            "서쪽 암초 바깥 항로를 표시한다",
            "동쪽 불빛을 향해 간다",
            "암초 안쪽의 잔잔한 곳을 고른다"
          ],
          "result": "실제 등불과 물결을 맞춰 안전한 접근선을 표시했다. 북두는 선원에게 그 선 밖으로 나가지 말라고 전했다.",
          "speaker": "BEIDOU"
        },
        {
          "kind": "DEFEND",
          "map": "MAP_LY_DETAIL_GUYUN",
          "title": "신호대 방어",
          "prompt": "구호 거점을 3라운드 지키고 남은 적을 제압한다. 거점 내구도가 0이 되면 재정비 후 도전한다.",
          "result": "신호대를 지켰다. 항로 경보가 해안의 선박에 전달되었다. 오셀에 관한 추측과 실제 확인한 바다 상태는 구별해 보고한다.",
          "speaker": "BEIDOU"
        }
      ]
    },
    "mine": {
      "title": "층암거연 · 닫힌 구조 통로",
      "intro": "붕괴한 통로 너머에서 두드리는 소리가 들린다. 현장 구조를 맡은 신염이 버팀목을 잡고, 연비는 대피 명단을 확인한다. 누가 무슨 말을 기억하는지 따지기 전에 갇힌 사람부터 꺼내야 한다.",
      "steps": [
        {
          "kind": "SEQUENCE",
          "map": "MAP_LY_DETAIL_CHASM_GATE",
          "title": "공명 말뚝의 안전 해제",
          "prompt": "기울어진 지지대를 세우고, 울리는 말뚝을 멈춘 다음 돌을 걷어 내야 한다. 순서가 어긋나면 작업을 멈추고 다시 점검한다.",
          "options": [
            "버팀목 고정",
            "낙석 제거",
            "공명 말뚝 정지"
          ],
          "sequence": [
            0,
            2,
            1
          ],
          "result": "말뚝이 멎었다. 구조 통로를 건드려도 천장이 흔들리지 않는다.",
          "speaker": "XINYAN"
        },
        {
          "kind": "DESTROY",
          "map": "MAP_LY_DETAIL_CHASM_RIM",
          "title": "구조 통로의 버팀돌",
          "prompt": "전투에서 「무너진 통로의 버팀돌」을 공격해 내구도를 모두 깎는다. 버팀돌은 공격하거나 원소를 부착하지 않는다.",
          "result": "돌벽을 열자 갇힌 사람에게 밧줄을 건넬 수 있게 됐다.",
          "speaker": "XINYAN"
        },
        {
          "kind": "CHOICE",
          "map": "MAP_LY_DETAIL_CHASM_RIM",
          "title": "들것을 옮기는 순서",
          "prompt": "연비가 인원을 센다. 들것 하나에 두 사람이 필요하다.",
          "options": [
            "가벼운 짐을 버리고 다친 사람부터 옮긴다",
            "밧줄을 고정해 들것을 차례로 끌어올린다"
          ],
          "results": [
            "짐을 내려놓으니 손이 남았다. 두 사람이 들것을 들고 나머지가 길을 비웠다.",
            "고정점을 서로 확인한 뒤 들것을 한 번에 하나씩 올렸다. 어느 쪽 줄도 놓치지 않았다."
          ],
          "speaker": "YANFEI"
        }
      ]
    },
    "experiment": {
      "title": "명온 마을 · 움직이는 그림자",
      "intro": "알베도가 고른 비교 지점은 사람이 드문 명온 마을 폐광 앞이다. 야란은 조사선 바깥에서 발자국을 살핀다. 구슬을 열었는지 여부는 앞서 내린 선택 그대로이며, 이번에 확인할 것은 주변의 빛과 이동 흔적이다.",
      "steps": [
        {
          "kind": "INVESTIGATE",
          "map": "MAP_LY_DETAIL_MINGYUN",
          "title": "빛의 출처 추적",
          "prompt": "야란: 뒤따라온 게 있다면 발자국보다 네 그림자부터 달라질 수 있어. 세 지점을 따로 확인해.",
          "clues": [
            {
              "id": "0",
              "label": "갱도 바깥",
              "text": "바람에 등불이 움직일 때 사람의 그림자도 함께 흔들린다."
            },
            {
              "id": "1",
              "label": "갱도 입구",
              "text": "등불을 가려도 바닥의 검은 선 하나는 그대로 남는다."
            },
            {
              "id": "2",
              "label": "운송 상자",
              "text": "상자 밑 먼지는 끊기지 않았다. 상자가 움직였다는 흔적은 없다."
            }
          ],
          "answer": 1,
          "options": [
            "상자가 움직인 것으로 결론 낸다",
            "등불과 무관한 검은 선을 표시한다",
            "구슬 속 유해가 살아났다고 기록한다"
          ],
          "result": "알베도는 등불과 분리된 선만 기록했다. 유해나 기억 공백의 원인에 대한 결론은 내리지 않는다.",
          "speaker": "YELAN"
        },
        {
          "kind": "BATTLE",
          "map": "MAP_LY_DETAIL_MINGYUN",
          "title": "조사선 바깥의 위협",
          "prompt": "일행을 편성하고 앞을 가로막은 적을 쓰러뜨린다.",
          "result": "폐광 입구의 적을 물리쳤다. 조사선으로 돌아가면 알베도의 비교 실험이 이어진다.",
          "speaker": "YELAN"
        }
      ]
    },
    "stage": {
      "title": "경책 산장 · 운근의 공연길",
      "intro": "운근의 공연 일행이 경책 산장의 임시 무대로 향한다. 행추는 잃어버린 대본 조각을 찾고, 중운은 관객이 지날 길을 점검한다. 공연에서 생길 일은 아직 아무도 모른다.",
      "steps": [
        {
          "kind": "INVESTIGATE",
          "map": "MAP_LY_DETAIL_QINGCE_FIELDS",
          "title": "도둑맞은 대본 추적",
          "prompt": "운근: 대사가 사라져도 이야기를 함부로 채우면 안 돼요. 남은 장수와 먹 자국을 함께 봐 주세요.",
          "clues": [
            {
              "id": "0",
              "label": "무대 밑 종이",
              "text": "위쪽 가장자리에 실밥이 남았다. 대본의 안쪽 장이다."
            },
            {
              "id": "1",
              "label": "길가의 표지",
              "text": "표지는 젖었지만 실로 묶인 등에는 빈 장이 한 장뿐이다."
            },
            {
              "id": "2",
              "label": "운송 표식",
              "text": "짐꾼이 떨어뜨린 곳을 밭길 끝 수레 옆으로 적어 두었다."
            }
          ],
          "answer": 2,
          "options": [
            "그럴듯한 대사를 새로 쓴다",
            "사라진 장을 읽었다고 말한다",
            "밭길 끝 수레에서 빠진 한 장을 찾는다"
          ],
          "result": "빠진 장을 찾아 운근에게 돌려주었다. 공연에서 아직 부르지 않은 말은 대본에도 없었다.",
          "speaker": "YUNJIN"
        },
        {
          "kind": "ESCORT",
          "map": "MAP_LY_DETAIL_QINGCE_FIELDS",
          "title": "공연 일행 호위",
          "prompt": "수레를 지키며 3라운드를 버틴 뒤 남은 적을 제압한다. 적을 먼저 처치하면 수레가 안전하게 이동한다.",
          "result": "악기와 무대 천이 무사히 도착했다. 관객이 들어올 길을 비우고 공연을 기다린다.",
          "speaker": "CHONGYUN"
        }
      ]
    },
    "ravine": {
      "title": "화광림 · 되돌아오는 발자국",
      "intro": "북두와 케이아가 앞뒤 길을 확인하는 동안, 중운이 바위에 새 표식을 남긴다. 같은 길로 되돌아오는 현상을 막으려면 남의 목소리보다 직접 만든 표식을 따라야 한다.",
      "steps": [
        {
          "kind": "INVESTIGATE",
          "map": "MAP_LY_DETAIL_HUAGUANG",
          "title": "반복되는 갈림길",
          "prompt": "중운: 소리가 나는 길로 가지 마. 방금 내가 바위에 낸 흠집을 확인해.",
          "clues": [
            {
              "id": "0",
              "label": "왼쪽 바위",
              "text": "흠집 안쪽까지 이끼가 덮였다. 오래된 자국이다."
            },
            {
              "id": "1",
              "label": "오른쪽 바위",
              "text": "가루가 떨어지는 새 흠집이 두 줄이다. 방금 남긴 표시와 같다."
            },
            {
              "id": "2",
              "label": "앞쪽 목소리",
              "text": "뒤에 있어야 할 사람 목소리가 들린다. 얼굴은 보이지 않는다."
            }
          ],
          "answer": 1,
          "options": [
            "앞에서 부르는 목소리로 간다",
            "새 흠집 두 줄이 있는 길을 고른다",
            "이끼 낀 바위로 돌아간다"
          ],
          "result": "표식을 맞춰 갈림길 하나를 벗어났다. 사라진 사람의 생사까지 확인된 것은 아니다.",
          "speaker": "CHONGYUN"
        },
        {
          "kind": "SEQUENCE",
          "map": "MAP_LY_DETAIL_HUAGUANG",
          "title": "절벽 구조줄",
          "prompt": "북두가 몸으로 줄을 버틴다. 지지점을 고정하고 보조줄을 건 뒤 신호에 맞춰 당겨야 한다.",
          "options": [
            "신호에 맞춰 당긴다",
            "지지점을 고정한다",
            "보조줄을 건다"
          ],
          "sequence": [
            1,
            2,
            0
          ],
          "result": "줄의 하중이 나뉘었다. 북두가 손을 옮길 틈이 생겼고, 절벽 아래를 다시 살필 수 있다.",
          "speaker": "BEIDOU"
        }
      ]
    },
    "boat": {
      "title": "고운각 · 여덟 사람의 배",
      "intro": "사라지는 해안 앞에서도 배 안의 일은 멈출 수 없다. 북두가 조타를 맡고 신염이 부상자를 받친다. 여덟 사람 모두가 살아서 돌아갈 자리를 남겨야 한다.",
      "steps": [
        {
          "kind": "SEQUENCE",
          "map": "MAP_LY_DETAIL_GUYUN",
          "title": "낮아지는 돌다리",
          "prompt": "북두: 사람이 먼저야. 부상자를 중앙으로 옮기고, 돛대를 받친 다음 버팀줄을 풀어!",
          "options": [
            "버팀줄을 푼다",
            "부상자를 중앙으로 옮긴다",
            "돛대를 받친다"
          ],
          "sequence": [
            1,
            2,
            0
          ],
          "result": "돛대가 사람을 덮치지 않고 내려왔다. 낮은 돌다리 밑을 통과할 자세를 만들었다.",
          "speaker": "BEIDOU"
        },
        {
          "kind": "DESTROY",
          "map": "MAP_LY_DETAIL_GUYUN",
          "title": "배를 붙잡은 잔해",
          "prompt": "전투에서 「무너진 통로의 버팀돌」을 공격해 내구도를 모두 깎는다. 버팀돌은 공격하거나 원소를 부착하지 않는다.",
          "result": "걸린 잔해를 부쉈다. 여덟 사람의 이름을 다시 부른 뒤 노를 저었다. 낯선 바다가 사라진 것은 아니다.",
          "speaker": "XINYAN"
        }
      ]
    },
    "rescue": {
      "title": "무너진 현장 · 밖으로 이어지는 신호",
      "intro": "구조대가 들을 수 있도록 벽과 줄로 신호를 보낸다. 주인공 혼자 돌벽을 들어 올릴 수는 없지만, 안전한 틈을 찾아 밖의 손길과 맞출 수는 있다.",
      "steps": [
        {
          "kind": "SEQUENCE",
          "map": null,
          "title": "신호를 맞춘다",
          "prompt": "짧게 두 번은 준비, 길게 한 번은 당기기, 마지막 짧은 한 번은 멈춤이다.",
          "options": [
            "길게 한 번",
            "짧게 두 번",
            "짧게 한 번"
          ],
          "sequence": [
            1,
            0,
            2
          ],
          "result": "밖에서 같은 신호가 돌아왔다. 서두르지 않고 힘을 맞춰 통로를 열었다.",
          "speaker": ""
        }
      ]
    },
    "relief": {
      "title": "고운각 · 재난 이후의 항로",
      "intro": "대재난을 넘겼지만 돌아오지 못한 구호 물자가 남았다. 감우가 필요한 약재를 추리고 북두가 배를 댄다. 이나즈마행을 묻기 전에 리월 사람들의 귀환길부터 마무리한다.",
      "steps": [
        {
          "kind": "INVESTIGATE",
          "map": "MAP_LY_DETAIL_GUYUN",
          "title": "구호품 표식 분류",
          "prompt": "감우: 목적지를 바꾸지 않도록 봉함표부터 확인해 주세요. 물에 젖은 것은 따로 검수해야 해요.",
          "clues": [
            {
              "id": "0",
              "label": "푸른 매듭",
              "text": "방수 포장된 약재다. 바깥 종이는 젖었지만 안쪽 봉함은 온전하다."
            },
            {
              "id": "1",
              "label": "붉은 매듭",
              "text": "습기에 약한 가루약이다. 봉함이 벌어져 다시 검수해야 한다."
            },
            {
              "id": "2",
              "label": "구호소 목록",
              "text": "바로 보낼 약재와 검수 대상을 나눠 적도록 되어 있다."
            }
          ],
          "answer": 0,
          "options": [
            "푸른 매듭은 발송하고 붉은 매듭은 검수한다",
            "젖은 약재를 모두 바로 보낸다",
            "목적지를 확인하지 않고 배에 싣는다"
          ],
          "result": "약재가 목적지별로 나뉘었다. 손상된 물자를 정상 물자로 보고하지 않았다.",
          "speaker": "GANYU"
        },
        {
          "kind": "DEFEND",
          "map": "MAP_LY_DETAIL_GUYUN",
          "title": "구호 물자 출항 방어",
          "prompt": "구호 거점을 3라운드 지키고 남은 적을 제압한다. 거점 내구도가 0이 되면 재정비 후 도전한다.",
          "result": "구호선이 안전한 항로로 나갔다. 오늘의 일은 오늘 만난 사람들과 함께 마쳤다.",
          "speaker": "BEIDOU"
        }
      ]
    },
    "rescue_K1": {
      "title": "무너진 들보 아래",
      "intro": "손이 닿는 작은 돌만 움직일 수 있다. 먼저 들보를 받치고 숨 쉴 틈을 넓힌 뒤, 밖을 향해 신호를 보낸다.",
      "steps": [
        {
          "kind": "SEQUENCE",
          "map": null,
          "title": "무너진 들보 아래",
          "prompt": "손이 닿는 작은 돌만 움직일 수 있다. 먼저 들보를 받치고 숨 쉴 틈을 넓힌 뒤, 밖을 향해 신호를 보낸다.",
          "options": [
            "들보를 받칠 돌을 고정한다",
            "작은 돌을 밀어 틈을 넓힌다",
            "세 번 두드려 위치를 알린다"
          ],
          "sequence": [
            0,
            1,
            2
          ],
          "result": "들보를 지탱한 채 숨 쉴 틈을 확보했다. 바깥에서 작은 진동이 돌아온다."
        }
      ]
    },
    "rescue_K2": {
      "title": "먼지 속의 응답",
      "intro": "큰 돌을 당기면 들보가 내려앉는다. 받침→작은 틈→구조 신호 순으로 시도한다.",
      "steps": [
        {
          "kind": "SEQUENCE",
          "map": null,
          "title": "먼지 속의 응답",
          "prompt": "큰 돌을 당기면 들보가 내려앉는다. 받침→작은 틈→구조 신호 순으로 시도한다.",
          "options": [
            "구조 신호를 보낸다",
            "받침을 고정한다",
            "작은 틈을 넓힌다"
          ],
          "sequence": [
            1,
            2,
            0
          ],
          "result": "무게를 지탱할 받침을 남겨 두고 구조 신호를 보냈다."
        }
      ]
    },
    "rescue_AA1": {
      "title": "검은 벽의 틈",
      "intro": "호두가 천장 쪽을 짚는다. 바닥 고정→옆벽 확인→천장 받침 순서로 살펴 웃는 입의 움직임과 실제 균열을 구분한다.",
      "steps": [
        {
          "kind": "SEQUENCE",
          "map": null,
          "title": "검은 벽의 틈",
          "prompt": "호두가 천장 쪽을 짚는다. 바닥 고정→옆벽 확인→천장 받침 순서로 살펴 웃는 입의 움직임과 실제 균열을 구분한다.",
          "options": [
            "옆벽의 균열을 확인한다",
            "천장 받침을 확인한다",
            "발밑의 돌을 고정한다"
          ],
          "sequence": [
            2,
            0,
            1
          ],
          "result": "웃는 입과 다른 방향으로 돌가루가 흘렀다. 두 사람은 실제 천장 균열의 위치를 기억한다."
        }
      ]
    },
    "rescue_AA2": {
      "title": "움직일 수 있는 마지막 신호",
      "intro": "몸은 움직이지 않는다. 알베도가 눈을 보며 묻는다. 한 번 깜박이면 듣고 있음, 두 번은 통증, 길게 감았다 뜨면 구슬 쪽의 소리. 그 순서로 상태를 전한다.",
      "steps": [
        {
          "kind": "SEQUENCE",
          "map": null,
          "title": "움직일 수 있는 마지막 신호",
          "prompt": "몸은 움직이지 않는다. 알베도가 눈을 보며 묻는다. 한 번 깜박이면 듣고 있음, 두 번은 통증, 길게 감았다 뜨면 구슬 쪽의 소리. 그 순서로 상태를 전한다.",
          "options": [
            "두 번 깜박인다",
            "길게 감았다 뜬다",
            "한 번 깜박인다"
          ],
          "sequence": [
            2,
            0,
            1
          ],
          "result": "손발은 여전히 움직이지 않는다. 알베도는 눈으로 보낸 세 신호를 확인하고 도구의 위치를 바꾼다."
        }
      ]
    },
    "rescue_AB1": {
      "title": "닫힌 문 안의 증언",
      "intro": "문은 잠겨 있다. 혼자 설 수 있다고 했던 관리인의 말, 끈 자국, 밖의 발소리를 구분해 사건 순서를 정리한다. 관리인의 말→묶였던 흔적→현재 발소리 순서다.",
      "steps": [
        {
          "kind": "SEQUENCE",
          "map": null,
          "title": "닫힌 문 안의 증언",
          "prompt": "문은 잠겨 있다. 혼자 설 수 있다고 했던 관리인의 말, 끈 자국, 밖의 발소리를 구분해 사건 순서를 정리한다. 관리인의 말→묶였던 흔적→현재 발소리 순서다.",
          "options": [
            "손목의 끈 자국을 확인한다",
            "지금 문밖 발소리를 듣는다",
            "관리인의 말을 되짚는다"
          ],
          "sequence": [
            2,
            0,
            1
          ],
          "result": "아직 문은 열리지 않았다. 모르는 시간을 억지로 채우지 않고 확실히 기억하는 순서만 남겼다."
        }
      ]
    },
    "rescue_AB2": {
      "title": "광창의 붕괴 흔적",
      "intro": "추가 붕괴를 피하려면 바닥→지지대→바깥 신호 순으로 확인해야 한다.",
      "steps": [
        {
          "kind": "SEQUENCE",
          "map": null,
          "title": "광창의 붕괴 흔적",
          "prompt": "추가 붕괴를 피하려면 바닥→지지대→바깥 신호 순으로 확인해야 한다.",
          "options": [
            "지지대의 균열을 확인한다",
            "바깥에 신호를 보낸다",
            "발밑의 흔들림을 확인한다"
          ],
          "sequence": [
            2,
            0,
            1
          ],
          "result": "움직여도 되는 자리와 위험한 지지대를 구분했다. 구조를 기다리며 위치를 알렸다."
        }
      ]
    },
    "rescue_B1": {
      "title": "문틀 아래의 손",
      "intro": "북두의 밧줄과 케이아의 서리 사이에서 진짜 막힌 부분을 찾는다. 밧줄 고정→손 없는 가장자리 확인→작은 틈 확보 순서다.",
      "steps": [
        {
          "kind": "SEQUENCE",
          "map": null,
          "title": "문틀 아래의 손",
          "prompt": "북두의 밧줄과 케이아의 서리 사이에서 진짜 막힌 부분을 찾는다. 밧줄 고정→손 없는 가장자리 확인→작은 틈 확보 순서다.",
          "options": [
            "손이 없는 가장자리를 확인한다",
            "밧줄을 고정한다",
            "작은 틈을 확보한다"
          ],
          "sequence": [
            1,
            0,
            2
          ],
          "result": "멈춘 손에 힘을 가하지 않고 가장자리에 틈을 만들었다. 교대 병사의 목소리만 믿고 당기지 않았다."
        }
      ]
    },
    "rescue_B2": {
      "title": "선저의 쇠고리",
      "intro": "뒤집힌 배의 쇠고리가 배를 긁는다. 부상자 중심 이동→등불로 위치 확인→노로 쇠고리 밀기 순서로 배의 균형을 지킨다.",
      "steps": [
        {
          "kind": "SEQUENCE",
          "map": null,
          "title": "선저의 쇠고리",
          "prompt": "뒤집힌 배의 쇠고리가 배를 긁는다. 부상자 중심 이동→등불로 위치 확인→노로 쇠고리 밀기 순서로 배의 균형을 지킨다.",
          "options": [
            "등불로 쇠고리를 비춘다",
            "노로 쇠고리를 밀어 낸다",
            "부상자를 배 가운데로 옮긴다"
          ],
          "sequence": [
            2,
            0,
            1
          ],
          "result": "뒤집힌 배와의 접촉이 줄었다. 여덟 사람의 자리는 그대로 지켰다."
        }
      ]
    }
  },
  "placements": [
    {
      "anchor": "ISK_L01_K_016",
      "mission": "reed"
    },
    {
      "anchor": "ISK_L01_AA_004",
      "mission": "reed"
    },
    {
      "anchor": "ISK_L01_AB_019",
      "mission": "reed"
    },
    {
      "anchor": "ISK_L01_B_038",
      "mission": "reed"
    },
    {
      "anchor": "ISK_L01_K_105",
      "mission": "witness"
    },
    {
      "anchor": "ISK_L01_AA_034",
      "mission": "witness"
    },
    {
      "anchor": "ISK_L01_AB_069",
      "mission": "witness"
    },
    {
      "anchor": "ISK_L01_B_078",
      "mission": "witness"
    },
    {
      "anchor": "ISK_L02_K1_001",
      "mission": "minlin"
    },
    {
      "anchor": "ISK_L02_K2_001",
      "mission": "minlin"
    },
    {
      "anchor": "ISK_L02_AA1_001",
      "mission": "minlin"
    },
    {
      "anchor": "ISK_L02_AA2_001",
      "mission": "minlin"
    },
    {
      "anchor": "ISK_L02_AB1_001",
      "mission": "minlin"
    },
    {
      "anchor": "ISK_L02_AB2_001",
      "mission": "minlin"
    },
    {
      "anchor": "ISK_L02_B1_001",
      "mission": "minlin"
    },
    {
      "anchor": "ISK_L02_B2_001",
      "mission": "minlin"
    },
    {
      "anchor": "ISK_L02_K1_056",
      "mission": "escape"
    },
    {
      "anchor": "ISK_L02_K2_062",
      "mission": "escape"
    },
    {
      "anchor": "ISK_L02_AA1_062",
      "mission": "escape"
    },
    {
      "anchor": "ISK_L02_AA2_074",
      "mission": "escape"
    },
    {
      "anchor": "ISK_L02_AB1_083",
      "mission": "escape"
    },
    {
      "anchor": "ISK_L02_AB2_085",
      "mission": "escape"
    },
    {
      "anchor": "ISK_L02_B1_074",
      "mission": "escape"
    },
    {
      "anchor": "ISK_L02_B2_062",
      "mission": "escape"
    },
    {
      "anchor": "ISK_L03_K1_031",
      "mission": "guyun"
    },
    {
      "anchor": "ISK_L03_K2_030",
      "mission": "guyun"
    },
    {
      "anchor": "ISK_L03_AA1_047",
      "mission": "mine"
    },
    {
      "anchor": "ISK_L03_AA2_077",
      "mission": "experiment"
    },
    {
      "anchor": "ISK_L03_AB1_021",
      "mission": "stage"
    },
    {
      "anchor": "ISK_L03_AB2_074",
      "mission": "mine"
    },
    {
      "anchor": "ISK_L03_B1_069",
      "mission": "ravine"
    },
    {
      "anchor": "ISK_L03_B2_072",
      "mission": "boat"
    },
    {
      "anchor": "ISK_L04_K1_001",
      "mission": "rescue_K1"
    },
    {
      "anchor": "ISK_L04_K2_001",
      "mission": "rescue_K2"
    },
    {
      "anchor": "ISK_L04_AA1_001",
      "mission": "rescue_AA1"
    },
    {
      "anchor": "ISK_L04_AA2_001",
      "mission": "rescue_AA2"
    },
    {
      "anchor": "ISK_L04_AB1_001",
      "mission": "rescue_AB1"
    },
    {
      "anchor": "ISK_L04_AB2_001",
      "mission": "rescue_AB2"
    },
    {
      "anchor": "ISK_L04_B1_001",
      "mission": "rescue_B1"
    },
    {
      "anchor": "ISK_L04_B2_001",
      "mission": "rescue_B2"
    },
    {
      "anchor": "ISK_L04_K1_073",
      "mission": "relief"
    },
    {
      "anchor": "ISK_L04_K2_091",
      "mission": "relief"
    },
    {
      "anchor": "ISK_L04_AA1_088",
      "mission": "relief"
    },
    {
      "anchor": "ISK_L04_AA2_098",
      "mission": "relief"
    },
    {
      "anchor": "ISK_L04_AB1_121",
      "mission": "relief"
    },
    {
      "anchor": "ISK_L04_AB2_115",
      "mission": "relief"
    },
    {
      "anchor": "ISK_L04_B1_084",
      "mission": "relief"
    },
    {
      "anchor": "ISK_L04_B2_074",
      "mission": "relief"
    }
  ],
  "relocations": [
    [
      3,
      "AA1",
      25,
      999,
      "MAP_CHASM_SURFACE"
    ],
    [
      4,
      "AA1",
      1,
      56,
      "MAP_CHASM_SURFACE"
    ],
    [
      3,
      "AA2",
      77,
      999,
      "MAP_LY_DETAIL_MINGYUN"
    ],
    [
      4,
      "AA2",
      1,
      29,
      "MAP_LY_DETAIL_MINGYUN"
    ],
    [
      3,
      "AB1",
      21,
      120,
      "MAP_LIYUE_QINGCE"
    ],
    [
      3,
      "AB2",
      74,
      999,
      "MAP_CHASM_SURFACE"
    ],
    [
      4,
      "AB2",
      1,
      54,
      "MAP_CHASM_SURFACE"
    ],
    [
      3,
      "B1",
      59,
      999,
      "MAP_LY_DETAIL_HUAGUANG"
    ],
    [
      4,
      "B1",
      1,
      28,
      "MAP_LY_DETAIL_HUAGUANG"
    ],
    [
      3,
      "B2",
      20,
      999,
      "MAP_LY_DETAIL_GUYUN"
    ],
    [
      4,
      "B2",
      1,
      41,
      "MAP_LY_DETAIL_GUYUN"
    ]
  ],
  "archive": {
    "ISK_L01_K_002": [
      {
        "node": "ISK_L01_K_002",
        "profile": "PROFILE_MOND_JEAN",
        "speaker": "진",
        "text": "끈이 어깨를 누르면 지금 고치는 게 좋아. 걷기 시작하고 나서 참지 말고."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_003",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "일단 출발하는 모습은 좀 괜찮게 남기려고 했는데요. 마지막까지 초보 티를 내면 보내는 사람도 불안하잖아요."
      }
    ],
    "ISK_L01_K_004": [
      {
        "node": "ISK_L01_K_004",
        "profile": "PROFILE_MOND_JEAN",
        "speaker": "진",
        "text": "불편한 걸 숨기는 편이 더 불안해. 잠깐만. 짐을 내려 봐."
      },
      {
        "node": "ISK_L01_K_005",
        "profile": null,
        "speaker": null,
        "text": "진은 안쪽에 말아 넣은 천을 빼내 끈 아래에 받쳤다. 짐을 대신 들겠다는 말은 하지 않았다. 손을 떼기 전에 매듭이 풀리지 않는지만 한 번 더 확인했다."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_006",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이러면 됐네요. 명예기사 수여식보다 이쪽이 더 실감 납니다. 이제 진짜 나가는 사람이 된 것 같아서."
      }
    ],
    "ISK_L01_K_007": [
      {
        "node": "ISK_L01_K_007",
        "profile": "PROFILE_MOND_JEAN",
        "speaker": "진",
        "text": "돌아올 길도 있으니까. 리월에서 문제가 생겼다고 혼자 해결하고 오겠다는 약속까지 할 필요는 없어. 확인한 것부터 전해 줘."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_008",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "저도 이번에는 구경만 하고 싶습니다. 문제가 없다는 걸 확인하고, 거기 밥이 맛있다는 소식 정도 전하면 좋겠네요."
      }
    ],
    "ISK_L01_K_009": [
      {
        "node": "ISK_L01_K_009",
        "profile": "PROFILE_MOND_JEAN",
        "speaker": "진",
        "text": "그런 편지를 받아도 괜찮아. 일부러 큰 소식을 만들지는 말고."
      },
      {
        "node": "ISK_L01_K_010",
        "profile": null,
        "speaker": null,
        "text": "웃음이 조금 사라졌다. 설산 정상에서 본 작은 구슬은 짐 속에 없었다. 그것을 발견했다는 사실과 손에 넣었다는 사실은 달랐다. 빈 안주머니를 괜히 확인하려던 손을 멈췄다. 드발린은 살아 있었다. 그렇다고 폐허에 떨어졌던 몸까지 살아 있었던 일로 고칠 수는 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_011",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "진. 나중에 누가 물어봐도, 그때 드발린이 죽어 있었다는 기록은 남겨 주세요. 제가 잘못 봤다고 정리하면 이야기가 편해지긴 하겠지만."
      }
    ],
    "ISK_L01_K_012": [
      {
        "node": "ISK_L01_K_012",
        "profile": "PROFILE_MOND_JEAN",
        "speaker": "진",
        "text": "우리가 확인한 사실이야. 지우지 않아. 다시 살아 돌아왔다는 사실도 함께 남길 거야."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_013",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "좋습니다. 제가 리월 가서 이상한 소리 한다고 쫓겨나면, 적어도 몬드에 증인이 있다는 말은 할 수 있겠네요."
      }
    ],
    "ISK_L01_K_014": [
      {
        "node": "ISK_L01_K_014",
        "profile": "PROFILE_MOND_JEAN",
        "speaker": "진",
        "text": "증인이 필요하면 내 이름을 말해도 돼. 다만 편지에 적어야 할 일이 생기지 않으면 더 좋겠어."
      },
      {
        "node": "ISK_L01_K_015",
        "profile": null,
        "speaker": null,
        "text": "진은 성안으로 돌아갔다. 내가 몇 걸음 뒤에 돌아보았을 때는 이미 전달받은 보고를 읽고 있었다. 동료가 되었다고 해서 도시를 비워 내 모든 여정에 따라올 수 있는 것은 아니었다. 그래도 떠나기 전에 해야 할 말 하나는 제대로 남긴 셈이었다."
      }
    ],
    "ISK_L01_K_021": [
      {
        "node": "ISK_L01_K_021",
        "profile": null,
        "speaker": null,
        "text": "쌀과 흙을 씻어 내고 식당으로 향했다. 수건을 쥔 손은 아직 조금 떨렸지만 그릇 부딪치는 소리를 들으니 살 것 같았다. 복도 끝에서 멀쩡해진 승강기를 내려다보다가 걸음을 멈췄다. 난간 곁에 누군가 서 있었다."
      },
      {
        "node": "ISK_L01_K_022",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "거기서 멈춰."
      },
      {
        "node": "ISK_L01_K_023",
        "profile": null,
        "speaker": null,
        "text": "목소리는 바로 옆에서 들렸다. 난간 끝에 서 있던 소는 사람을 부르려고 목청을 높인 것도 아니었는데, 내 발은 움직이지 않았다. 얼굴을 알아보는 것과 그 사람에게 아는 척할 수 있는 사이라는 것은 전혀 다른 문제였다. 입에 걸린 이름을 먼저 삼켰다."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_024",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "길을 잘못 들었습니까? 식당 가는 중이었는데. 손님이 올라오면 안 되는 곳이면 내려갈게요."
      }
    ],
    "ISK_L01_K_025": [
      {
        "node": "ISK_L01_K_025",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "길을 말하는 게 아니야. 네게서 나는 기척을 확인하는 중이다."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_026",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "아, 그쪽 문제면 방금 씻었습니다. 땀 냄새가 남았을 수는 있어도, 복도에서 세워 둘 정도는 아닐 텐데요."
      }
    ],
    "ISK_L01_K_027": [
      {
        "node": "ISK_L01_K_027",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "그런 냄새가 아니다. 죽음의 냄새와 생명의 냄새가 함께 난다. 네 주위에서."
      },
      {
        "node": "ISK_L01_K_028",
        "profile": null,
        "speaker": null,
        "text": "수건이 아직 손에 있었다. 그것을 움켜쥐었다가 펴 보았다. 손끝에 피가 묻은 것도 아니고, 숨이 차갑게 식은 것도 아니었다. 객잔 안에서는 누군가 식사를 더 주문했다. 몇 걸음만 돌아서면 같은 저녁으로 돌아갈 수 있을 것 같은 거리였다."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_029",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "잠깐만요. 죽음이요? 제가 죽은 사람처럼 보인다는 뜻입니까? 눈 뜨고 걸어왔는데 그런 판정부터 받으면 좀 억울합니다."
      }
    ],
    "ISK_L01_K_030": [
      {
        "node": "ISK_L01_K_030",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "네가 죽었다고 말하지 않았어. 살아 있는 너의 곁에, 죽음의 흔적도 있다."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_031",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 시신을 본 적이 있어서 그런 건요. 최근에… 가까이서 본 적은 있습니다. 그게 옷에 남듯이 남는다면 설명이 되잖아요."
      }
    ],
    "ISK_L01_K_032": [
      {
        "node": "ISK_L01_K_032",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "그것만으로 설명하기에는 어긋난다. 더 있어. 마신을 향한 강한 혐오. 네 주위에 남은 기척에서 느껴진다."
      },
      {
        "node": "ISK_L01_K_033",
        "profile": null,
        "speaker": null,
        "text": "양손을 들어 손사래를 쳤다. 급히 부정하려다 발뒤꿈치가 난간 아래 턱에 걸렸다. 소의 시선이 잠깐 아래로 내려갔다."
      },
      {
        "node": "ISK_L01_K_034",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "뒤로 더 물러나지 마. 발밑을 봐."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_035",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그러니까, 그런 거 아니라니까요. 마신이랑 원수 맺을 처지도 아니고요. 당장 신한테 진 빚이 있으면 있지, 다 미워할 만큼 사정이 넉넉하지 않습니다."
      }
    ],
    "ISK_L01_K_036": [
      {
        "node": "ISK_L01_K_036",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "네 말과 이 기척이 같은 데서 나온 것인지는 아직 모른다."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_037",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 부분부터 말씀해 주시면 안 됩니까. 저도 모르는 속마음을 들킨 사람처럼 서 있었잖아요. 저는 제가 무슨 생각 하는지는 좀 알고 싶습니다."
      }
    ],
    "ISK_L01_K_038": [
      {
        "node": "ISK_L01_K_038",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "그래서 확인하는 중이라고 했다. 단정했다면 묻지 않았어."
      },
      {
        "node": "ISK_L01_K_039",
        "profile": null,
        "speaker": null,
        "text": "말은 짧았지만 소는 길을 막은 채 위협적으로 다가오지 않았다. 오히려 내가 턱에서 발을 떼자 한 걸음 옆으로 비켰다. 식당의 불빛으로 이어지는 길이 열렸다. 그렇다고 대화가 끝난 것은 아니었다. 열린 길과 소의 얼굴을 번갈아 보았다."
      }
    ],
    "ISK_L01_K_047": [
      {
        "node": "ISK_L01_K_047",
        "profile": null,
        "speaker": null,
        "text": "바르바토스라는 이름까지 말하려다가 멈췄다. 누가 어디까지 알고 있는지 모르는 자리에서 남의 정체를 확인증처럼 내밀고 싶지는 않았다. 소는 그 멈춤을 재촉하지 않았다."
      },
      {
        "node": "ISK_L01_K_048",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "죽었다는 판단은 누가 했지?"
      },
      {
        "node": "R39_PROSE_ISK_L01_K_049",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "제가 먼저 보고, 같이 있던 사람들이 확인했습니다. 기절한 걸 잘못 봤다는 말로는 넘길 수 없어요. 나중에 살아났다는 이유로, 처음 확인한 죽음까지 잘못 본 일로 바꿀 수는 없습니다."
      }
    ],
    "ISK_L01_K_050": [
      {
        "node": "ISK_L01_K_050",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "네가 직접 본 일과 남에게 들은 일을 구분해 둬. 다시 물을 수 있다."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_051",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그건 할 수 있어요. 대신 저를 마신 혐오자로 먼저 적지는 마세요. 살던 데서도 남이 대신 써 준 평가표 때문에 고생은 충분히 했습니다."
      }
    ],
    "ISK_L01_K_052": [
      {
        "node": "ISK_L01_K_052",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "네 주변의 기척을 말했을 뿐이다. 네가 무엇을 택할지는 아직 보지 못했어."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_053",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "앞으로도 그 순서로 부탁드립니다. 먼저 제가 하는 걸 보고, 그다음에 판단하는 거. 이름은… 뭐라고 부르면 됩니까?"
      }
    ],
    "ISK_L01_K_054": [
      {
        "node": "ISK_L01_K_054",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "소. 네가 이상을 느끼면, 여기 있던 사람에게 그대로 전해. 리월에서 무엇을 하는지 지켜보겠다."
      },
      {
        "node": "ISK_L01_K_055",
        "profile": null,
        "speaker": null,
        "text": "대답이 끝난 뒤에도 나는 잠깐 그 자리에 서 있었다. 언제든 이름을 부르면 달려오겠다는 약속도, 안전을 보장하겠다는 말도 없었다. 소가 무엇을 경계하는지 다 이해할 수는 없었지만, 그것이 단순히 기분 나쁜 손님을 쫓아내는 태도와는 다르다는 것은 알 수 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_056",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알겠습니다. 지켜보는 건 제가 막을 수 없겠죠. 그래도 다음에는 식사 전에 죽음 얘기부터 하지는 말아 주세요. 저는 이따가 밥이 넘어갈지도 확인해야 하니까."
      }
    ],
    "ISK_L01_K_057": [
      {
        "node": "ISK_L01_K_057",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "먹을 수 있을 때 먹어. 네 몸은 아직 지쳐 있어."
      },
      {
        "node": "ISK_L01_K_058",
        "profile": null,
        "speaker": null,
        "text": "소는 그 말을 끝으로 시선을 돌렸다. 더 말을 붙이지 않았다. 식당으로 돌아왔을 때 종업원은 정말 한 번 부르러 갈 생각이었다며 손짓했다. 식어 가는 그릇을 앞에 두고 손을 폈다. 숟가락은 잡혔고 음식 맛도 났다. 그것만으로 안심하기에는 방금 들은 말이 너무 구체적이었지만, 저녁을 남기는 것은 그 말에 대한 어떤 반박도 되지 못했다."
      },
      {
        "node": "ISK_L01_K_059",
        "profile": null,
        "speaker": "객잔 종업원",
        "text": "길에서 무슨 일 있으셨어요? 아까보다 더 조용해지셨네."
      }
    ],
    "ISK_L01_K_065": [
      {
        "node": "ISK_L01_K_065",
        "profile": null,
        "speaker": "객잔 종업원",
        "text": "남쪽 길로 계속 가시면 귀리 평원이 나와요. 리월항 가까이 가서 길이 나뉘면 오늘 세워진 안내판도 꼭 보세요. 요 며칠 지나는 분들 말이 자주 바뀌어서요."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_066",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "길이 바뀌는 겁니까, 말이 바뀌는 겁니까? 그거 구분 못 하고 따라갔다가 저 혼자 엉뚱한 데서 저녁 먹게 되면 곤란한데."
      }
    ],
    "ISK_L01_K_067": [
      {
        "node": "ISK_L01_K_067",
        "profile": null,
        "speaker": "객잔 종업원",
        "text": "그래서 마지막 안내를 보시라는 거예요. 제가 여기서 장담하면 더 곤란하잖아요."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_068",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그렇네요. 모르는 걸 장담 안 해 주는 집이라 마음에 듭니다. 오늘은 제가 길을 좀 믿어 봐야겠네요."
      }
    ],
    "ISK_L01_K_076": [
      {
        "node": "ISK_L01_K_076",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "항구에 들어가려는 거라면 여기서 멈춰. 지금은 출입을 허용하지 않아. 볼일은 바깥 접수대에 남기고 안내를 받아."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_077",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청… 씨죠? 리월 칠성의 옥형. 사람 잘못 본 거면 지금 굉장히 큰 실례를 하는 건데."
      }
    ],
    "ISK_L01_K_078": [
      {
        "node": "ISK_L01_K_078",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "맞아. 내 이름은 알고 있네. 넌 어디서 왔어?"
      },
      {
        "node": "R39_PROSE_ISK_L01_K_079",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "몬드에서 왔습니다. 최근에 명예기사 칭호를 받았고요. 그걸로 줄을 건너뛸 생각은 없는데, 신원 설명할 때는 좀 써먹어도 되겠죠."
      }
    ],
    "ISK_L01_K_080": [
      {
        "node": "ISK_L01_K_080",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "신원을 확인하는 데는 도움이 되겠지. 통행 허가를 대신하지는 않아. 리월에는 무슨 일로 왔어?"
      },
      {
        "node": "ISK_L01_K_081",
        "profile": null,
        "speaker": null,
        "text": "접수대 옆 공고에는 송신의례라는 글자가 있었다. 몬드를 떠날 때 들은 말과 달랐다. 그 앞에서 잠깐 눈을 멈췄다. 자신이 기억하던 이야기를 기준으로 빈칸을 메우려다, 소 앞에서 직접 본 일과 들은 일을 구분하겠다고 말했던 것이 떠올랐다."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_082",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "송신의례요. 그 일 때문에 이렇게 막은 겁니까? 저는 의례가 가까워졌다고 들어서 왔는데, 이 정도로 통제할 줄은 몰랐습니다."
      }
    ],
    "ISK_L01_K_087": [
      {
        "node": "ISK_L01_K_087",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "이미 하고 있어. 그런데 표를 적는 것과 물건을 넘기는 것 사이의 기억이 끊기면? 적힌 표를 보고도 아직 넘기지 않았다고 판단할 수 있지. 확인하려고 짐을 다시 풀었는데 어디까지 풀었는지 잊으면, 다른 수레의 짐까지 섞일 수 있어."
      },
      {
        "node": "ISK_L01_K_088",
        "profile": null,
        "speaker": null,
        "text": "각청은 설명을 멈추고 접수대 위 두 장의 표를 나란히 놓았다. 어느 쪽에도 거짓이라고 써 있지 않았다. 한 장은 물건을 넘긴 쪽의 확인이고, 다른 한 장은 아직 받지 못했다는 쪽의 신고였다. 표 아래에는 서로를 비난하는 문장보다 긴 수량 목록이 있었다."
      },
      {
        "node": "ISK_L01_K_089",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "리월은 물건 하나가 여러 사람의 계약을 거쳐 이동해. 수량을 잘못 세면 한 사람 몫이 사라져. 이미 받은 돈을 못 받았다고 여기면 서로가 상대를 사기꾼이라고 생각하지. 그 틈에 물건이나 사람을 빼돌리는 자가 끼어들면, 기억을 못 하는 병사에게 죄를 뒤집어씌울 수도 있어."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_090",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그러니까 계산을 다시 하면 끝나는 게 아니라, 누가 뭘 했는지 자신 있게 말할 사람까지 같이 사라지는 거네요. 사람은 서 있는데도."
      }
    ],
    "ISK_L01_K_091": [
      {
        "node": "ISK_L01_K_091",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그래. 지금 들어오게 했다가 나중에 묶어 두는 것보다, 바깥에서 확인할 수 있을 때 먼저 막는 편이 피해를 줄여. 이미 불편을 겪는 사람이 많다는 건 알아. 그래서 대기 줄과 짐을 나눠 두고 있어."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_092",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "저 앞의 병사가 표찰을 한참 보고 있던데. 아까 지나오면서 그냥 피곤한 줄 알았습니다."
      }
    ],
    "ISK_L01_K_093": [
      {
        "node": "ISK_L01_K_093",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그것만으로 증상이라고 단정하지 마. 봤다면 언제 어디서 무엇을 했는지 전해. 지쳤을 수도 있고, 표가 잘못됐을 수도 있어. 원인이 다른 문제까지 한데 묶으면 놓치는 게 생겨."
      },
      {
        "node": "ISK_L01_K_094",
        "profile": null,
        "speaker": null,
        "text": "말을 마친 각청은 물을 마시지 않은 채 일하던 병사에게 교대를 지시했다. 병사는 괜찮다고 대답하려다가 그녀가 자신의 표를 넘겨받자 손을 놓았다. 각청은 글씨를 확인하고, 표를 병사의 눈높이로 돌려 어느 물건까지 보았는지 다시 물었다. 빨리 대답하라고 재촉하지는 않았다."
      }
    ],
    "ISK_L01_K_102": [
      {
        "node": "ISK_L01_K_102",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "옥경대로 가는 별도 통로를 마련해 뒀어. 항구의 상점과 창고, 주거 구역을 거치지 않도록 구분한 길이야. 의례가 열리는 날에 그쪽으로 안내할 거야. 지금 그 길을 이용해서 도시 안으로 들어갈 수 있다는 뜻은 아니고."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_103",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "행사 가는 길은 있고, 오늘 들어가는 길은 없는 거군요. 이해는 했습니다. 제 발이 납득하는 데는 조금 더 걸리겠지만."
      }
    ],
    "ISK_L01_K_107": [
      {
        "node": "ISK_L01_K_107",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "이 접수대에서 받으면 돼. 직접 본 일인지, 남에게 들은 말인지 구분해서. 사람 상태가 급하면 기다리지 말고 근처 천암군을 불러."
      },
      {
        "node": "ISK_L01_K_108",
        "profile": null,
        "speaker": null,
        "text": "열린 접수대와 닫힌 목책 사이를 보았다. 어젯밤 소에게 들은 말이 목덜미를 누르는 듯했다. 남들이 자신을 먼저 위험한 사람으로 적어 둘까 두려운 마음과, 아무 말 없이 군중 속에 섞이는 것도 찜찜하다는 마음이 함께 남았다. 다른 한쪽에서는 아까의 짐꾼이 병사와 같은 포대 앞에서 다시 수량을 세고 있었다. 지금 무엇부터 알릴지는 스스로 골라야 했다."
      }
    ],
    "ISK_L01_K_1_001": [
      {
        "node": "ISK_L01_K_1_001",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "누구에게 어디서 들었어? 지금 너한테 증상이 있다는 말이야?"
      },
      {
        "node": "R39_PROSE_ISK_L01_K_112",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "어제 망서 객잔에서 소에게 들었습니다. 제 주위에 죽음과 생명의 냄새가 같이 난다고, 마신을 향한 혐오 같은 기척도 있다고요. 제가 그런 생각을 한다고 확인한 건 아닙니다. 그건 말한 사람도 구분했어요."
      }
    ],
    "ISK_L01_K_113": [
      {
        "node": "ISK_L01_K_113",
        "profile": null,
        "speaker": null,
        "text": "각청은 바로 펜을 움직이지 않았다. 내 얼굴을 보고, 뒤에 줄 선 사람들이 얼마나 가까운지 확인한 다음 접수대 옆으로 자리를 옮겼다. 병사에게는 새 통행객을 다른 쪽에서 안내하라고 말했다."
      },
      {
        "node": "ISK_L01_K_114",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "소가 한 말이라면 가볍게 넘길 수는 없어. 그래도 네 생각이나 행동을 확인한 것과 같은 기록으로 남기지는 않을 거야. 지금까지 스스로 느낀 이상은 있어?"
      },
      {
        "node": "R39_PROSE_ISK_L01_K_115",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "없다고 하면 저를 너무 믿고 있는 것 같고, 있다고 하면 아무거나 병으로 붙일 것 같네요. 일단 오늘 길은 기억합니다. 누굴 해치고 싶지도 않았고요. 잠을 설친 건 있습니다. 그런 말을 듣고 푹 자면 그게 더 대단한 거 아닌가요."
      }
    ],
    "ISK_L01_K_116": [
      {
        "node": "ISK_L01_K_116",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "잠을 설친 건 그렇게 적으면 돼. 네가 한 말을 다른 증상으로 바꿔 적을 생각은 없어."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_117",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 몬드에서 용이 죽었다가 살아난 일도 전하겠습니다. 소한테도 말했어요. 증인은 기사단에 있습니다. 제가 혼자 신기한 사람 되려고 지어낸 이야기는 아니라는 것부터 확인할 수 있어요."
      }
    ],
    "ISK_L01_K_118": [
      {
        "node": "ISK_L01_K_118",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 이야기는 따로 들을게. 여기서 천암군의 기억상실 원인이라고 묶지는 않겠어. 우선 네가 본 순서와 증인을 남겨. 내가 확인할 수 있는 건 확인하겠지만, 이 자리에서 답을 주지는 못해."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_119",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "폐허에서 시체가 떨어졌고, 진과 함께 확인했습니다. 나중에 알베도와 설산 정상에 갔을 때 죽었던 드발린이 다시 나타났어요. 그곳 잔해에 작은 수정구슬도 있었습니다. 발견만 했고 가져오지는 않았습니다. 이 짐에서 꺼내 보여 드릴 물건은 아니에요."
      }
    ],
    "ISK_L01_K_127": [
      {
        "node": "ISK_L01_K_127",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "신고 내용은 필요한 사람에게만 전달할 거야. 외부 대기자라는 사실 외에는 줄에 알릴 필요 없어."
      },
      {
        "node": "ISK_L01_K_128",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "저쪽으로 오시면 됩니다. 짐은 직접 가지고 계세요. 의자는 흔들리는 쪽 말고 안쪽 걸 쓰시고요."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_129",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "안 흔들리는 걸 먼저 알려 주시니까 믿음이 생기네요. 제 기억 확인하기 전에 의자 때문에 머리부터 다치면 서로 할 말 없어집니다."
      }
    ],
    "ISK_L01_K_130": [
      {
        "node": "ISK_L01_K_130",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "그건 제가 먼저 앉아 봤습니다. 적어도 지금은 확실합니다."
      },
      {
        "node": "ISK_L01_K_131",
        "profile": null,
        "speaker": null,
        "text": "짐을 무릎 아래에 놓고 앉았다. 바로 전의 농담에 병사가 웃다 말고 손을 펴 보는 모습을 보았다. 기억할 수 있다는 말을 입에 올리는 일조차 여기서는 조심스러웠다. 자신을 확인하러 올 다음 사람에게 무엇부터 이야기할지 머릿속으로 순서를 정했다. 소에게 들은 말, 직접 본 죽음, 다시 살아 있던 용. 어느 것 하나 다른 것의 답이 되지는 않았다."
      },
      {
        "node": "ISK_L01_K_132",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "의례 통로는 저 공고로 안내받으면 돼. 몸 상태를 확인하더라도 송신의례가 열릴 때까지는 밖에서 기다려야 해. 오늘 도시 출입을 허가한 건 아니니까."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_133",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알겠습니다. 오늘 하루에 받은 특별 취급은 이 의자면 충분하네요. 나머지는 제가 걸어서 들어갈 수 있을 때 받겠습니다."
      }
    ],
    "ISK_L01_K_2_001": [
      {
        "node": "ISK_L01_K_2_001",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "어느 포대? 마지막으로 본 위치와 표찰부터 짚어 줘. 확인 전에는 누구 잘못이라고 말하지 말고."
      },
      {
        "node": "ISK_L01_K_138",
        "profile": null,
        "speaker": null,
        "text": "짐꾼의 수레에 묶인 색이 다른 끈을 가리켰다. 자신이 앞쪽으로 비켜 올 때 걸릴 뻔했던 끈이었다. 짐꾼은 각청을 보자 표를 들고 다가왔지만, 병사는 표에 적힌 수량을 다시 확인해야 한다며 손을 내밀었다."
      },
      {
        "node": "ISK_L01_K_139",
        "profile": null,
        "speaker": "짐꾼",
        "text": "확인하는 건 좋습니다. 그런데 아까 제가 이 자리에서 풀고 다시 묶었어요. 또 풀라니, 저는 지금 몇 번째 일을 하는지 모르겠습니다."
      },
      {
        "node": "ISK_L01_K_140",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "통과 표시가 된 건 봤습니다. 그런데 제가 속을 본 기억이 없습니다. 제대로 확인 안 하고 표시만 했을 수도 있지 않습니까."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_141",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "두 분 말이 같이 맞을 수는 없다고 싸우기 전에, 제가 본 부분부터 넣어도 됩니까? 저 끈, 아까 바닥에 풀려 있었습니다. 저기 지나오다가 밟을 뻔해서 비켰고요. 안에 뭐가 들었는지까지는 안 봤습니다."
      }
    ],
    "ISK_L01_K_142": [
      {
        "node": "ISK_L01_K_142",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "좋아. 끈이 풀려 있던 것과 내용물을 검사한 것은 별개로 두자. 짐은 더 움직이지 말고, 다른 짐이 옆으로 들어오지 않게 빈 수레를 세워."
      },
      {
        "node": "ISK_L01_K_143",
        "profile": null,
        "speaker": null,
        "text": "확인표를 받으려던 순간 짐꾼의 어깨 너머로 포대가 미끄러졌다. 받침 수레의 한쪽 바퀴가 홈에 빠져 있었다. 짐꾼이 포대를 받치자 그 아래에서 어린 견습의 발이 보였다. 놀라 소리를 지른 내 쪽으로 각청이 손을 내밀었다. 앞으로 뛰어나가지 말라는 손이었다."
      }
    ],
    "ISK_L01_K_144": [
      {
        "node": "ISK_L01_K_144",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "제가 쓴 표가 맞습니다. 글씨도, 끝에 짧게 선을 그은 것도요. 그런데… 쓰고 나서 접어 준 기억이 없습니다. 지금 표를 보고 맞춰 말하는 것 같아서 더 말하기가 어렵습니다."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_145",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "지금 못 떠올리겠다고 말해도 되잖아요. 틀린 설명 하나 더 얹으면 이 포대는 해 질 때까지 여기 있을 것 같습니다. 저도 여기서 같이 서 있어야 하고요."
      }
    ],
    "ISK_L01_K_147": [
      {
        "node": "ISK_L01_K_147",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그래서 네 짐을 그대로 둘 거야. 이 병사에게 기억을 만들어 내라고 요구하지도 않을 거고. 지금 확인 가능한 실물과 표를 두 사람이 함께 다시 보자. 그동안 다음 짐은 받지 않아."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_148",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이 짐은 잠깐만 그대로 놔 주세요. 바로 옆 수레와 섞이면 다시 세야 합니다. 저도 지금 왜 멈춰 있는지 같이 확인하는 중이라서요."
      }
    ],
    "ISK_L01_K_154": [
      {
        "node": "ISK_L01_K_154",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "고마워. 네가 지나가던 위치와 본 표찰은 따로 남겨 뒀어. 이 건을 확인하는 동안 바깥 접수대에서 기다릴 수 있겠어? 같은 걸 두 번 설명할 필요가 없게, 확인할 사람을 이쪽으로 부를게."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_155",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "갈 곳이 열려 있었으면 고민했을 텐데, 보시다시피 없습니다. 기다릴게요. 대신 부르러 올 때는 “거기 여행 온 사람”이라고 하지 마세요. 그 말에 이 줄 전부 일어납니다."
      }
    ],
    "ISK_L01_K_156": [
      {
        "node": "ISK_L01_K_156",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "이름으로 부를게. 지금 남긴 증언만 확인할 거야. 그 밖의 일을 맡기로 한 것처럼 처리하지는 않겠어."
      },
      {
        "node": "ISK_L01_K_157",
        "profile": null,
        "speaker": null,
        "text": "짐꾼 옆 그늘로 물러났다. 어젯밤 소에게 들은 이야기는 이번 접수 내용에 넣지 않았다. 아무 말도 없었던 일로 만든 것은 아니었다. 아직 감각의 주인조차 모르는 관찰과 눈앞에서 본 짐끈을 같은 사실처럼 내놓고 싶지 않았다. 리월항 입구에서 나는 우선 자신이 실제로 본 것에 이름을 붙였다."
      },
      {
        "node": "ISK_L01_K_158",
        "profile": null,
        "speaker": "짐꾼",
        "text": "풍경 좋은 데서 하루 보내게 생겼구려."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_159",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "아까 그 말씀, 예언이었습니까? 그렇다면 다음에는 좋은 쪽으로 좀 해 주세요. 이번엔 앉을 자리까지는 구했으니까."
      }
    ],
    "ISK_L01_K_160": [
      {
        "node": "ISK_L01_K_160",
        "profile": null,
        "speaker": "짐꾼",
        "text": "저 안으로 들어가는 것보다 여기 앉는 게 먼저 될 줄은 나도 몰랐소."
      },
      {
        "node": "ISK_L01_K_161",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "송신의례 통로 안내는 저 공고를 확인하면 돼. 오늘 이 일을 도왔다고 먼저 열어 줄 수는 없어."
      },
      {
        "node": "R39_PROSE_ISK_L01_K_162",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 정도 대가를 기대했으면 포대 옆에 서 있기 전에 협상했겠죠. 지금은 목격자 자리면 됩니다. 의례 날에는 진짜 손님으로 좀 들어가고 싶고요."
      }
    ],
    "ISK_L01_AA_005": [
      {
        "node": "ISK_L01_AA_005",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "거기, 천 모서리 잡아! 얼굴로 받지 말고 손으로! 좋아, 기둥 쪽으로 돌아서 버텨 줘. 이 사람 옷부터 빼야 해!"
      },
      {
        "node": "ISK_L01_AA_006",
        "profile": null,
        "speaker": null,
        "text": "천을 붙잡았다가 어깨가 딸려 나갔다. 옆의 말뚝을 한 바퀴 돌아서야 겨우 멈출 수 있었다. 소녀가 바퀴 틈에 걸린 옷을 찢어 내고 수레꾼을 끌어냈다. 힘이 풀리는 바람에 나는 천 안으로 반쯤 굴러 들어갔다. 가림천 너머로 괜찮다는 대답이 들린 뒤에야 고개를 내밀었다. 수레에 실린 것은 접어 싣던 빈 나무틀이었다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_007",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나도 좀 꺼내 줘. 사람 구하고 내가 포장됐잖아. 리월은 인사부터 이렇게 격한 곳이야?"
      }
    ],
    "ISK_L01_AA_008": [
      {
        "node": "ISK_L01_AA_008",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "아하하, 포장 완료라고 도장 찍으면 안 되겠네. 다친 데는 없어? 나는 왕생당의 일흔일곱 번째 당주, 호두야. 저 사람은 살아서 저녁 먹으러 가게 됐고, 너는 천에서 꺼내 드릴 손님!"
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_009",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "{PLAYER_NAME}. 합격한 건 좋은데 무슨 일에 합격한 건지는 먼저 알려 줘. 모르고 맡았다가 나중에 옷까지 갈아입게 되는 건 사양할게."
      }
    ],
    "ISK_L01_AA_010": [
      {
        "node": "ISK_L01_AA_010",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "도와주는 일은 끝났어. 정말이야. 우선 손 펴 봐. 천에 쓸린 데 없지? 농담은 웃을 수 있을 때 해야 하는 거니까."
      },
      {
        "node": "ISK_L01_AA_011",
        "profile": null,
        "speaker": "수레꾼",
        "text": "당주님, 검사 순서 돌아왔습니다. 아까 열었다 접었는데 또 펴야 하는 모양입니다."
      },
      {
        "node": "ISK_L01_AA_012",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "이번에는 바람 반대쪽으로 돌려요. 검사하는 분도 천과 씨름하게 만들 필요는 없잖아요. 너도 놓아도 돼. 고마워!"
      },
      {
        "node": "ISK_L01_AA_013",
        "profile": null,
        "speaker": null,
        "text": "천암군 병사는 짐의 모양을 확인한 뒤 가림천을 걷어 달라고 했다. 호두는 수레꾼과 함께 틀을 펼쳤다. 얇은 막대와 접는 경첩, 말아 둔 천뿐이었다. 병사는 안쪽까지 몸을 숙여 살피고 수레 앞에 매달린 목패에 확인 표시를 남겼다. 옆에서 틀이 접히지 않도록 손을 대고 있었다."
      },
      {
        "node": "ISK_L01_AA_014",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "틀과 천, 수량 확인했습니다. 앞줄이 움직이면 그 뒤를 따라가십시오. 통행 허가와는 별개입니다. 리월항으로 들어갈 수 있는지는 앞의 담당자가 다시 안내할 겁니다."
      }
    ],
    "ISK_L01_AA_016": [
      {
        "node": "ISK_L01_AA_016",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "예. 비켜 세워 주시면 다음 수레를 확인하겠습니다."
      },
      {
        "node": "ISK_L01_AA_017",
        "profile": null,
        "speaker": null,
        "text": "수레를 옆으로 빼는 동안 바퀴가 작은 돌에 걸렸다. 호두가 손짓하기 전에 틀의 끝을 잡아 주었다. 수레꾼이 돌을 치우고, 뒤의 짐수레가 앞으로 조금 움직였다. 병사는 그 수레의 끈을 확인하다가 다시 이쪽을 돌아봤다."
      },
      {
        "node": "ISK_L01_AA_018",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "그쪽 수레. 덮개를 열어 주십시오. 안을 확인해야 합니다."
      },
      {
        "node": "ISK_L01_AA_019",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "방금 보셨는데요. 여기 앞에 표시도 남기셨고. 혹시 빠진 데가 있었나요?"
      },
      {
        "node": "ISK_L01_AA_020",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "아니요, 저는 아직…."
      }
    ],
    "ISK_L01_AA_021": [
      {
        "node": "ISK_L01_AA_021",
        "profile": null,
        "speaker": null,
        "text": "병사는 목패를 보고 말을 멈췄다. 자신의 손에 든 도구와 같은 모양의 표시였다. 그는 수레꾼을 보고 호두를 보고, 자신이 접는 경첩을 짚으며 설명했던 자리까지 보았다. 그 자리의 천은 아직 반쯤 풀려 있었다. 병사가 장난하는 것처럼 보이지 않는다는 사실을 알아차렸다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_022",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내가 바로 옆에 있었어. 안쪽까지 보고 표시 남기는 것도 봤고. 다시 확인할 필요가 있으면 열 수는 있는데, 처음부터 안 했다고 하면 방금 한 일은 어디로 가?"
      }
    ],
    "ISK_L01_AA_023": [
      {
        "node": "ISK_L01_AA_023",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "보셨다는 말씀은 알겠습니다. 다만 저는 이 수레를 살핀 기억이 없습니다. 조금 전까지 다음 수레의 끈을 확인하고 있었는데…."
      },
      {
        "node": "ISK_L01_AA_024",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "손을 좀 쉬세요. 빈 수레라는 건 여기 있는 사람들이 같이 확인했어요. 누가 틀렸다고 소리부터 높일 일은 아니니까, 다른 담당자도 불러서 목패를 함께 봅시다."
      },
      {
        "node": "ISK_L01_AA_025",
        "profile": null,
        "speaker": null,
        "text": "병사는 자신이 들고 있는 확인 도구를 내려다봤다. 손가락에 묻은 잉크가 경첩 가까이에 남은 작은 얼룩과 닮아 있었다. 그것만으로 병사의 머릿속까지 설명할 수 없다는 것을 알았다. 다만 조금 전 이 자리에 있었던 일을 없었다고 말할 수는 없었다."
      }
    ],
    "ISK_L01_AA_027": [
      {
        "node": "ISK_L01_AA_027",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "…알겠습니다. 말씀하신 순서대로 옆에 적어 두겠습니다. 제가 기억하는 부분은 따로 말씀드리고요."
      },
      {
        "node": "ISK_L01_AA_028",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "좋아. 서로 기억을 빌려 쓰는 건 잠깐 미루자. 네가 본 일은 네 목소리로, 이분이 기억 못 하는 부분은 그 말 그대로. 덮어 쓰면 나중에 더 엉키겠어."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_029",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 내 차례부터. 수레 앞에서 손을 댄 쪽도 말해 줄게. 바람 잡는 아르바이트가 이렇게 쓸모 있을 줄은 몰랐네."
      }
    ],
    "ISK_L01_AA_031": [
      {
        "node": "ISK_L01_AA_031",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그게 좋겠네. 수레꾼 아저씨, 끈은 아직 묶지 마세요. 뒤에서 기다리는 분들께는 내가 설명할게요. 너는 저 깃발 쪽 사람을 불러 줄래?"
      },
      {
        "node": "ISK_L01_AA_032",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "제가 부르겠습니다. 자리에서 움직이지 않아도 들릴 거리입니다. 번거롭게 해서 죄송합니다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_033",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "번거로운 건 맞는데, 급하다고 손부터 더 움직이면 처음에 뭐 했는지 다 섞이잖아. 오늘은 수레가 조용히 있어 주면 되겠네."
      }
    ],
    "ISK_L01_AA_035": [
      {
        "node": "ISK_L01_AA_035",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "이상한 일을 만났네. 모르는 길에 왔다가 남이 뭘 잊었는지까지 설명해 주게 될 줄은 몰랐겠지?"
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_036",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "길 잃는 쪽은 내가 맡을 줄 알았는데. 방금 일은 좀 다르네. 저 사람은 여기 서 있었고 실제로 손도 움직였어. 그런데 자기한테만 그 부분이 없는 것 같았어."
      }
    ],
    "ISK_L01_AA_037": [
      {
        "node": "ISK_L01_AA_037",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그래. 하지만 방금 본 걸로 저 사람이 거짓말하는지, 무슨 병인지, 누가 손댔는지까지 정해 버리지는 말자. 떠드는 사람만 늘고 정작 확인할 사람은 못 쉬게 될 테니까."
      },
      {
        "node": "ISK_L01_AA_038",
        "profile": null,
        "speaker": "수레꾼",
        "text": "그럼 당주님은 여기서 기다리시겠습니까?"
      },
      {
        "node": "ISK_L01_AA_039",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "네. 틀은 지금 펼친 상태로 두세요. 한 번 더 꺼내 보라는 말이 나오면 제가 얘기할게요. 수레가 먼저 지쳐 쓰러지겠네, 정말."
      },
      {
        "node": "ISK_L01_AA_040",
        "profile": null,
        "speaker": null,
        "text": "호두는 가림천의 매듭을 한 번 더 확인했다. 장난스러운 말투가 돌아왔지만 병사의 등 뒤로 소리를 던지지는 않았다. 나도 그가 다른 담당자에게 설명하는 모습을 잠깐 보고 시선을 거뒀다. 오래 쳐다본다고 잃어버린 순간이 돌아올 것 같지는 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_041",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "아까 왕생당이라고 했지. 이름만 들어서는 뭘 하는 곳인지 모르겠는데, 저 가림틀을 보면 공연하는 곳은 아닌 것 같고. 물어봐도 되는 일이야?"
      }
    ],
    "ISK_L01_AA_042": [
      {
        "node": "ISK_L01_AA_042",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "장례를 맡아. 떠나는 사람을 잘 배웅하고, 남은 사람에게 필요한 일도 챙기는 곳이지. 네가 잡아 준 건 그 일을 할 때 쓰는 가림틀이야. 오늘은 틀을 손보러 나온 길이고, 안에는 아무도 없어."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_043",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그건 내가 검사할 때 같이 봤으니까 알아. 미안, 이상한 걸 묻자고 불러 세운 건 아닌데… 사람이 죽은 뒤에 뭘 어떻게 해야 하는지도 아는 거네."
      }
    ],
    "ISK_L01_AA_044": [
      {
        "node": "ISK_L01_AA_044",
        "profile": null,
        "speaker": null,
        "text": "호두는 당장 농담을 붙이지 않았다. 내 손이 가방 끈을 누르는 것을 보고, 그 시선이 길 위의 사람들에게 한 번씩 향하는 것도 보았다. 그녀는 수레 뒤편, 길에서 조금 물러난 돌담 그늘을 가리켰다. 펼쳐 둔 가림틀 덕에 사람들이 오가는 줄에서는 보이지 않는 자리였다. 수레를 맡아 둔 사람에게 자리를 짧게 알린 뒤, 먼저 그쪽으로 걸어갔다."
      },
      {
        "node": "ISK_L01_AA_045",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "여기라면 아는 사람의 이야기를 하다 목소리를 낮출 필요는 없겠네. 누가 돌아가셨어? 네가 배웅하려는 사람이야?"
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_046",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "아는 사람이라고 해야 할지부터 모르겠어. 이름도 몰라. 죽어 있는 건 봤고, 그 뒤에 사라졌다가 다시 나타난 것도 봤어. 내가 구한 용에게 닿았었고…. 잠깐, 나도 듣는 입장이었으면 질문부터 했겠다."
      }
    ],
    "ISK_L01_AA_047": [
      {
        "node": "ISK_L01_AA_047",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "잠깐, 설명이 용보다 빨라. 나한테 말할 때는 땅에 발 붙이고, 처음부터 가자. 그 사람을 처음 본 곳이 어디야? 무슨 일이 있었어? 놀라서 뛰어가야 하는 대목이 아니면 나도 앉아서 들을게."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_048",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "드래곤의 폐허에서였어. 하늘에서 사람이 떨어져 드발린에게 닿았고, 그때부터 드발린을 괴롭히던 게 떨어져 나오기 시작했어. 우리는 공격을 막으면서 버텼고, 끝났을 때 그 사람은 없어져 있었지. 그 뒤 몬드의 기사단 방에서 같은 유해가 다시 나타났어. 하늘에서 또 떨어진 게 아니라 눈앞에 잠깐 드러나더니, 내가 가지고 있던 구슬 안으로 들어갔어. 진 단장이랑 엠버, 다이루크, 벤티도 그걸 같이 봤고. 여기까지야. 하나도 안 빼고 말하니까 듣기에는 더 이상하네."
      }
    ],
    "ISK_L01_AA_053": [
      {
        "node": "ISK_L01_AA_053",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "산 사람은 쉬어야지. 그 사람을 지킨다고 네 숨까지 붙들고 있을 수는 없잖아. 우선 가방이 넘어지지 않을 자리를 마련해. 네가 고개만 돌리면 볼 수 있는 곳이면 더 좋고. 밤에는 젖은 땅을 피하고. 그런 작은 일부터 하면 돼."
      },
      {
        "node": "ISK_L01_AA_054",
        "profile": null,
        "speaker": null,
        "text": "호두는 옆 돌의 먼지를 손으로 털고 흔들리는지 눌러 보았다. 튀어나온 모서리가 가방에 닿을 만한 곳은 피했다. 내가 짐을 내려놓자 끈이 돌 틈으로 빠지려 했고, 그녀가 손끝으로 끌어 올려 안쪽에 걸쳤다. 특별한 의식을 치르는 손놀림은 아니었다. 누군가 잠깐 내려놓은 짐이 넘어지지 않도록, 말을 이어 가는 동안에도 한 번 더 살피는 손이었다. 그제야 비어 있는 무릎 위에 두 손을 올려놓았다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_055",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "모락스를 찾아가는 중이야. 몬드에서 도와준 사람이 그분이라면 뭔가 알지도 모른다고 해서. 네가 보기에는 그럴 만한 이야기야, 아니면 내가 나라를 잘못 찾아온 거야?"
      }
    ],
    "ISK_L01_AA_056": [
      {
        "node": "ISK_L01_AA_056",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "모락스라면 우리 쪽에서는 보통 암왕제군이라고 불러. 리월까지 찾아온 이유는 알겠네. 하지만 여기 왔다고 곧장 만날 수 있는 건 아니야. 내가 손짓하면 제군이 나오는 것도 아니고."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_057",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 정도로 편한 방법은 기대 안 했어. 그래도 물어볼 이름은 틀리지 않았네. 사람 만나는 일부터 하려고 왔는데 신을 찾아야 하니, 처음부터 안내가 좀 까다롭다."
      }
    ],
    "ISK_L01_AA_060": [
      {
        "node": "ISK_L01_AA_060",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "장례는 산 사람 마음이 급하다고 죽은 사람을 치워 버리는 일이 아니야. 이름을 모르는 분을 모실 때도 생각할 건 많지. 지금은 그 사람에게 무슨 일이 있었는지 알아보려는 중이잖아. 그 길부터 함께 살펴보자."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_061",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 말은 고맙네. 나는 제대로 책임지려면 끝내 이 사람을 살려야 하는 건가 하는 생각까지 했거든. 그럴 방법이 있는지도 모르면서. 못하면 데리고 온 것부터 잘못이 될까 봐."
      }
    ],
    "ISK_L01_AA_064": [
      {
        "node": "ISK_L01_AA_064",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "이름 하나에는 그걸 부르던 사람의 목소리도 따라붙지. 우리가 아직 모르는 건 그 이름이지, 그 사람에게 이름이 없었던 건 아니야. 네가 알아보고 싶다면 찾아보자. 그동안 억지로 다른 이름을 붙일 필요도 없고."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_065",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "처음에는 누구였는지 알면 설명도 쉬워질 거라고 생각했어. 그런데 자꾸 저 사람이라고만 말하니까 나중엔 나도 얼굴보다 사건부터 떠올리는 게 싫더라. 몬드에서 함께 본 사람들 이름은 기억해. 그 사람들한테도 다시 물어볼게."
      }
    ],
    "ISK_L01_AA_067": [
      {
        "node": "ISK_L01_AA_067",
        "profile": null,
        "speaker": null,
        "text": "가림천의 아래쪽이 바람에 들렸다. 호두는 끈을 조금 낮춰 묶고, 내가 앉은 쪽으로 햇빛이 들어오지 않게 틀의 각도를 돌렸다. 천 하나의 높이를 바꾸자 지나가는 사람들의 발만 보였다. 밖에서는 바퀴가 돌고 짐을 부르는 목소리가 이어졌다. 그 소리를 듣는 동안 나는 자신의 무릎도, 옆에 내려놓은 가방도 같은 그늘 안에 있다는 것을 보았다."
      },
      {
        "node": "ISK_L01_AA_068",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "원한다면 여기서 나에게 보여 줘. 천만 걷고, 구슬 밖으로 보이는 모습을 살펴보는 거야. 안에 있는 사람을 꺼내거나 흔들어 깨워 보자는 일은 하지 않을게. 바람과 구경꾼은 저 틀이 막아 줄 테고."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_069",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "계속 감싸 두기만 하면 아무도 이 사람을 알아보지 못하겠지. 그런데 가는 곳마다 풀어 보여 주는 건 더 싫어. 구슬이 작다고 신경 쓸 일도 작을 줄 알았나 봐. 손안에 들어온다고 다 감당할 수 있는 건 아니네."
      }
    ],
    "ISK_L01_AA_070": [
      {
        "node": "ISK_L01_AA_070",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "지금 못 풀겠으면 그대로 두자. 몬드에서 함께 본 사람들에게 물어볼 길도 있잖아. 네가 겪은 일을 접수하고 그분들에게 연락하도록 부탁하면 돼. 나는 오늘 네 이야기를 들었다고 함께 말해 줄 수 있고."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_071",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 혼자 끙끙대다가 해 질 때까지 여기 앉아 있는 건 그만하자. 누군가에게 보여 주든 연락부터 남기든, 하나는 고르고 움직일게. 저 틀도 나 때문에 계속 서 있을 수는 없잖아."
      }
    ],
    "ISK_L01_AA_072": [
      {
        "node": "ISK_L01_AA_072",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "틀은 기다릴 수 있어. 다리도 없어서 저리다고 투덜대지도 않거든. 당주 쪽이 조금 먼저 발을 바꿔 디딜 수는 있겠지만. 천천히 골라. 그 사람을 데려온 네가 무엇을 부탁하려는지는 듣고 움직여야지."
      },
      {
        "node": "ISK_L01_AA_073",
        "profile": null,
        "speaker": null,
        "text": "매듭 위에 얹었던 손을 거뒀다. 그 손으로 바람에 들리는 가림천 끝을 잠깐 눌렀다. 호두는 먼지가 날아들지 않는지 바깥을 살피다가 다시 이쪽을 보았다. 가방을 열기로 해도, 지금처럼 닫아 두어도 돌아오는 대답은 자신이 해야 했다. 돌 위의 가방을 무릎으로 옮긴 뒤 입을 열었다."
      }
    ],
    "ISK_L01_AA_075": [
      {
        "node": "ISK_L01_AA_075",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "저 안으로 가자. 천 끝을 바닥에 끌지만 말고. 내가 건너편에 앉을 테니 네가 펼치기 편한 쪽을 골라. 내려놓을 판부터 보자. 울퉁불퉁한 곳에서 굴러갈까 봐 손으로 붙들고만 있을 수는 없으니까."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_076",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "좋아. 그런데 내가 못 알아듣는 말을 하면서 고개부터 끄덕이면 바로 설명해 줘. 내가 무슨 큰 결정을 한 줄 알고 같이 끄덕일 수도 있어."
      }
    ],
    "ISK_L01_AA_077": [
      {
        "node": "ISK_L01_AA_077",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "어이쿠, 그럼 당주도 알아듣는 말을 써야겠네. 우선 여기 앉자. 봐, 특별한 말 안 했지? 벌써 첫 번째는 통과야."
      },
      {
        "node": "ISK_L01_AA_078",
        "profile": null,
        "speaker": null,
        "text": "호두는 수레꾼에게 잠깐 자리를 비워 달라고 부탁했다. 아까 비어 있음을 확인한 가림틀이 이번에는 두 사람을 길의 시선에서 가려 주었다. 바닥에 평평한 판을 놓고 자기 천을 펼쳤다. 바람이 들어와도 구슬이 굴러가지 않도록 접은 부분으로 가장자리를 받쳤다. 그 뒤에야 위를 덮은 천을 천천히 걷었다."
      },
      {
        "node": "ISK_L01_AA_079",
        "profile": null,
        "speaker": null,
        "text": "구슬 안에는 몬드에서 보았던 같은 유해가 있었다. 새 형체가 생기거나 밖으로 나오지 않았다. 호두는 웃지 않았다. 무릎을 낮추고 내가 비켜 준 방향에서 들여다보되 표면에는 손을 대지 않았다. 빛이 비치는 각도를 바꿔 보기 위해 몸을 옮길 때에도 먼저 손으로 방향을 가리켰다."
      },
      {
        "node": "ISK_L01_AA_080",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "안에 사람의 형체가 보이는 건 나도 확인했어. 네 설명에 있던 옷자락과 손의 위치도 보여. 하지만 이렇게 보는 것만으로 그 사람이 누구인지, 이 안에서 어떤 상태로 보존되는지까지 말할 수는 없어."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_081",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "움직임은 없어. 몬드에서 들어간 뒤로 계속 그랬어. 내가 눈을 떼면 다른 일이 생길까 봐 가끔 확인했는데, 그때마다 그대로였고."
      }
    ],
    "ISK_L01_AA_082": [
      {
        "node": "ISK_L01_AA_082",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "작게 보인다고 그 사람이 살아온 시간까지 짧아지는 건 아닐 텐데. 이 앞에 앉으니 이상한 기분이 드네. 조금 더 가까이 앉아도 될까? 네 손이 빛을 가리는데, 급히 떼지는 마. 내가 반대쪽으로 옮기면 되니까."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_083",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그쪽으로 와. 나는 손을 어디 둬야 할지도 모르겠네. 가리면 보여 주겠다고 한 보람이 없고, 아예 물러나 있으면 나만 빠지는 것 같고. 아까부터 설명만 계속 하고 있었어. 안 그러면 둘 다 이 사람만 보고 있게 되니까."
      }
    ],
    "ISK_L01_AA_084": [
      {
        "node": "ISK_L01_AA_084",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "조용하지. 바깥은 저렇게 시끄러운데. 떠난 사람 곁에 앉으면 그 차이가 유난히 크게 느껴질 때가 있어. 무슨 말을 해야 할지 찾다가 더 조용해지기도 하고. 꼭 계속 설명할 필요는 없어. 지금은 잠깐 같이 보자."
      },
      {
        "node": "ISK_L01_AA_085",
        "profile": null,
        "speaker": null,
        "text": "호두는 종이 한쪽에 옷자락의 접힌 모서리와 손이 놓인 방향을 작게 옮겼다. 얼굴은 그리지 않았다. 내가 옆에서 기록을 보았고, 두 사람은 천을 덮었다가 같은 자리에서 한 번 더 걷어 보았다. 처음 적은 모양은 다시 보았을 때도 같았다. 구슬을 두드리거나 원소 힘을 가하는 일은 하지 않았다."
      }
    ],
    "ISK_L01_AA_091": [
      {
        "node": "ISK_L01_AA_091",
        "profile": null,
        "speaker": null,
        "text": "바깥에서 가림틀을 접어도 되느냐는 물음이 들렸다. 호두는 내가 가방을 다시 멘 것을 확인하고 나서야 천을 걷었다. 밖의 사람들에게 안에서 무엇을 보았는지 설명하지 않았다. 수레꾼에게는 틀을 빌려 쓴 일이 끝났다는 말만 전했다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_092",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "처음에는 바람 막는 도구였는데 이번에는 사람들 눈을 막았네. 아까 잡아 준 보람이 있었어."
      }
    ],
    "ISK_L01_AA_093": [
      {
        "node": "ISK_L01_AA_093",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그렇지? 의외로 성실하게 일하는 가림틀이라니까. 오늘 제일 말을 적게 하고 제 몫을 했어. 너는 말이 조금 많았지만 손도 빨랐으니 같이 합격."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_094",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 시험 아까 끝났다며. 평가가 자꾸 뒤늦게 추가되면 나도 당주 점수를 매길 거야."
      }
    ],
    "ISK_L01_AA_097": [
      {
        "node": "ISK_L01_AA_097",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "리월 칠성의 옥형, 각청이야. 항구 안으로 들어가려는 거지? 지금은 입장할 수 없어. 머무를 곳을 안내받을 사람은 오른쪽으로, 직접 확인해야 할 용건이 있는 사람은 이쪽으로 와."
      },
      {
        "node": "ISK_L01_AA_098",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "옥형, 잠깐 다른 사람들 귀에서 떨어져 이야기하고 싶은 용건이 있어. 왕생당 업무와도 닿아 있지만 내가 혼자 판단할 수 없는 일이야."
      },
      {
        "node": "ISK_L01_AA_099",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "어떤 확인이 필요한지부터 말해 줘. 여기서 한 걸음 옆으로. 지나가는 사람들 길은 비워 두고."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_100",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "몬드에서 죽은 사람을 봤어. 지금 그 유해가 내가 가진 구슬 안에 있고. 모락스라면 이유를 알지도 모른다고 해서 찾아왔어. 호두한테는 방금 보여 줬어. 여기서는 이 사람이 누구인지 알아볼 길부터 부탁하고 싶어."
      }
    ],
    "ISK_L01_AA_101": [
      {
        "node": "ISK_L01_AA_101",
        "profile": null,
        "speaker": null,
        "text": "각청의 시선이 가방에 머물렀다가 나에게 돌아왔다. 조금 전 호두 앞에서 정리한 자기 메모를 펼쳤다. 몬드에서 누구와 무엇을 보았는지 적은 종이였다. 호두는 오늘 자신이 살펴본 내용을 옆에 놓되 작은 그림은 천으로 가렸다. 바람에 종이가 들리자 각청이 손바닥으로 모서리를 눌렀다."
      },
      {
        "node": "ISK_L01_AA_102",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "너는 몬드에서 일어난 일을 직접 봤고, 호 당주는 오늘 구슬 안쪽 모습을 봤다는 거지? 같은 범위까지 확인했다고 합쳐 적지는 않을게. 지금 그 구슬을 이쪽에서 맡아 달라는 요청이야?"
      }
    ],
    "ISK_L01_AA_105": [
      {
        "node": "ISK_L01_AA_105",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "살펴본 내용은 이쪽이야. 다음에 다시 볼 일이 생기면 왕생당에도 함께 연락해 줘. 오늘도 가림천 안에서 보았잖아. 떠난 사람의 모습을 사람들 오가는 길에서 급히 보여 줄 일은 아니지."
      },
      {
        "node": "ISK_L01_AA_106",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "알겠어. 필요하면 따로 자리를 마련하도록 전달하겠어. 그 종이는 이쪽 덮개 아래에 두고. 말하는 동안 계속 바람에 들리잖아. 내용은 내가 살펴볼 테니 모서리를 잡고 서 있지는 않아도 돼."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_107",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "항구를 막은 것도 이런 일 때문이야? 아까 수레 검사한 병사가, 바로 전에 자기가 표시한 걸 기억 못 하던데."
      }
    ],
    "ISK_L01_AA_110": [
      {
        "node": "ISK_L01_AA_110",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그뿐이 아니야. 이미 인계한 짐을 아직 맡고 있다고 생각하면 같은 수량을 두 번 넘겨. 확인 표시를 못 믿겠다며 지우면 다음 담당자는 어느 쪽을 세야 할지도 몰라. 물건을 받은 사람과 받을 사람이 서로 같은 계약서를 들고 기다리게 되는 거지."
      },
      {
        "node": "ISK_L01_AA_111",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "빈 수레가 얌전히 서 있는 동안에는 어떻게든 다시 세면 돼. 하지만 행렬 한복판에서 같은 안내를 두 번 하면 앞뒤 사람들부터 엇갈리겠네. 왕생당 쪽도 전달을 한 사람 말만 듣고 다음 순서로 넘기지는 않겠어."
      },
      {
        "node": "ISK_L01_AA_112",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그렇게 해 줘. 확인 도구를 더 찍는다고 사람의 기억까지 돌아오지는 않아. 교대와 재확인 방법을 같이 바꾸고 있어. 항구 안에 사람이 더 쌓이기 전에 멈출 필요가 있었어."
      }
    ],
    "ISK_L01_AA_117": [
      {
        "node": "ISK_L01_AA_117",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "공고된 송신의례에 맞춰 옥경대로만 가는 별도 길은 준비했어. 그날 통행이 시작되면 안내에 따라 그 길로 와. 지금 통과할 수 있다는 뜻은 아니야. 그쪽에서도 항구 안으로 샛길을 낼 수는 없어."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_118",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 길로 가면 모락스를 만날 수 있어?"
      }
    ],
    "ISK_L01_AA_119": [
      {
        "node": "ISK_L01_AA_119",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "내가 안내하는 건 옥경대까지 가는 길이야. 누군가와 만날 수 있다는 약속까지 할 수는 없어. 그곳에서 용건을 전할 기회를 찾겠다면, 정해진 날에 와. 그전에는 밖에서 기다려."
      },
      {
        "node": "ISK_L01_AA_120",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "들었지? 길 하나와 대답 하나는 다른 모양이네. 오늘은 왕생당 쪽 가림자리에서 기다리자. 안에 든 사람을 불필요하게 드러내지 않고, 연락도 받을 수 있어."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_121",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "좋아. 그런데 나까지 가림틀 안에 종일 넣어 두는 건 아니지? 구슬은 잘 싸 뒀으니까 나도 바깥 풍경은 보고 싶어."
      }
    ],
    "ISK_L01_AA_122": [
      {
        "node": "ISK_L01_AA_122",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "하하, 살아 있는 사람에게 그 좁은 자리만 권하겠어? 수레 옆 그늘이면 돼. 다만 다른 줄에 끼어서 또 바람을 잡아 오지는 마. 연락 전하러 갔다가 네가 어디로 날아갔는지 찾기 싫으니까."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_123",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그건 약속 못 하겠는데. 오늘 먼저 부른 건 네 쪽이었잖아. 다음에는 이름으로 불러. 길 찾는 얼굴이라고 부르면 여기 사람들 절반은 돌아보겠다."
      }
    ],
    "ISK_L01_AA_124": [
      {
        "node": "ISK_L01_AA_124",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "좋아, {PLAYER_NAME}. 이제는 구별할 수 있겠네. 따라와. 내가 본 이야기는 보관하고, 남은 길은 앉아서 기다릴 곳부터 정하자."
      },
      {
        "node": "ISK_L01_AA_125",
        "profile": null,
        "speaker": null,
        "text": "차단선에서 한 걸음 물러났다. 항구의 지붕은 여전히 가까이 보였지만 오늘 그 아래로 들어갈 수는 없었다. 호두가 앞서 걷다가 뒤돌아보고, 나는 가방이 흔들리지 않게 끈을 고쳐 잡았다. 안에 있는 유해는 끝내 움직이지 않았다. 변한 것은 그 모습을 조용히 함께 본 사람이 리월에도 생겼다는 점이었다."
      }
    ],
    "ISK_L01_AA_128": [
      {
        "node": "ISK_L01_AA_128",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "알겠어. 오늘은 감싼 채 가는 거야. 그럼 끈이 어디 걸릴 것부터 보자. 이 모서리가 빠져 있네. 네가 걷다가 계속 눌러 넣던 게 이쪽이었어?"
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_129",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "응. 세 번쯤 집어넣었는데 또 나왔어. 네가 안쪽을 못 봤다는 건 내가 먼저 말할게. 그건 걱정하지 말고, 저 천 끝이나 좀 봐 줘. 아까부터 내 손만 바빠."
      }
    ],
    "ISK_L01_AA_130": [
      {
        "node": "ISK_L01_AA_130",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "지금은 끈이 천을 밀고 있어. 순서를 바꾸자. 천을 먼저 안으로 넣고 끈을 그 위에. 좋아, 이제 덮개를 내려 봐. 풀리지 않게 한다고 무조건 세게 조일 일은 아니네."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_131",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "아, 이러면 되는구나. 힘만 더 주고 있었네. 내가 놓친 사이에 일이 또 생길까 봐 자꾸 누르게 돼. 가방은 가만있는데 내 쪽이 시끄러운 모양이야."
      }
    ],
    "ISK_L01_AA_132": [
      {
        "node": "ISK_L01_AA_132",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "끈은 이제 됐어. 네 손도 좀 펴. 도중에 매듭이 풀리면 멈춰 묶으면 되지. 접수처까지 가는 동안 수십 번씩 점검할 필요는 없어. 자, 먼저 걸어 봐. 나는 끈이 빠져나오는지만 볼게."
      },
      {
        "node": "ISK_L01_AA_133",
        "profile": null,
        "speaker": null,
        "text": "내가 몇 걸음 옮겨도 천 끝은 나오지 않았다. 호두는 그제야 수레꾼에게 손을 흔들었다. 가방은 닫힌 채였다. 접수하는 병사가 준비된 자리를 가리키자 두 사람은 그쪽으로 걸어갔다. 조금 전 검사를 기억하지 못했던 병사도 동료 옆에 서 있었다. 그는 확인 도구를 손에서 놓지 못하고 있었다."
      },
      {
        "node": "ISK_L01_AA_134",
        "profile": null,
        "speaker": "접수 담당 병사",
        "text": "앞서 수레 검사를 목격하셨다는 분입니까? 다른 용건도 있다고 들었습니다. 먼저 직접 보신 일부터 말씀해 주십시오."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_135",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "응. 그런데 한 장에 섞어 쓰지는 말자. 여기서 병사가 검사를 했는데 기억하지 못한 일하고, 내가 몬드에서 겪고 가져온 일은 별개야. 같은 원인인지 물으면 나도 모르고."
      }
    ],
    "ISK_L01_AA_136": [
      {
        "node": "ISK_L01_AA_136",
        "profile": null,
        "speaker": "접수 담당 병사",
        "text": "구분해서 적겠습니다. 몬드에서 가져오셨다는 물품을 확인할 수 있겠습니까?"
      },
      {
        "node": "ISK_L01_AA_137",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그 안에는 유해가 있다는 설명을 들었어요. 공개된 줄에서 펼쳐 보일 물건으로 다루지 말아 주세요. 나는 아직 안쪽을 직접 보지 않았고요."
      },
      {
        "node": "ISK_L01_AA_138",
        "profile": null,
        "speaker": "접수 담당 병사",
        "text": "그렇다면 이쪽에는 ‘본인 진술, 실물 미확인’으로 남겨야 합니다. 확인했다고 적어 드릴 수는 없습니다."
      },
      {
        "node": "ISK_L01_AA_139",
        "profile": null,
        "speaker": null,
        "text": "병사가 쓰려는 문구를 보고 잠깐 입을 다물었다. 몬드에서 그 방의 모두가 놀라던 순간은 분명했는데, 여기 종이 위에서는 아직 확인되지 않은 한 사람의 설명이 되었다. 호두는 옆에서 그 문구를 지우라고 요구하지 않았다. 대신 내가 다음 말을 고를 때까지 기다렸다."
      }
    ],
    "ISK_L01_AA_141": [
      {
        "node": "ISK_L01_AA_141",
        "profile": null,
        "speaker": "접수 담당 병사",
        "text": "함께 목격한 분들과 연락할 곳을 적겠습니다. 지금은 접수한 내용이며, 확인 뒤에 추가 기록을 남기는 방식입니다."
      },
      {
        "node": "ISK_L01_AA_142",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "자, 종이는 내가 눌러 줄게. 너는 가방을 무릎에 둬. 방금 매듭을 고쳤는데 또 바람이랑 씨름하면서 쓸 필요는 없지. 손가락에 잉크 묻었어. 코부터 만지지는 말고."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_143",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "코는 아직 안 만졌어. 얼굴로 가림천을 받을 뻔한 것도 충분한데, 잉크까지 바르고 첫인사를 할 필요는 없지. 이름은 썼어. 함께 본 사람들한테 꼭 물어봐 줘."
      }
    ],
    "ISK_L01_AA_145": [
      {
        "node": "ISK_L01_AA_145",
        "profile": null,
        "speaker": "접수 담당 병사",
        "text": "함께 묶겠습니다. 여기에는 본인 이름을 써 주십시오. 연락이 닿으면 답변을 덧붙일 수 있도록, 외곽에서 기다릴 장소도 정하신 뒤 알려 주시면 됩니다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_146",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "응. 회신은 오면 붙이고, 그전에는 내가 여기서 기다린다고 적어 줘. 설명만 던져 놓고 사라질 생각은 없으니까."
      }
    ],
    "ISK_L01_AA_149": [
      {
        "node": "ISK_L01_AA_149",
        "profile": null,
        "speaker": null,
        "text": "기록을 넘기려던 병사가 수레 검사 쪽 종이를 다시 펼쳤다. 다른 병사는 자기 글씨를 알아보고도 한동안 손을 펴지 않았다. 그가 손에 묻은 잉크를 엄지로 문지르는 것을 보았다. 손가락이 움직일 때마다 말라붙은 얼룩이 얇게 벗겨졌다. 수레를 살피던 기억까지 그렇게 벗겨졌는지, 도구를 놓으면 그 흔적마저 잃을까 두려운지 얼굴에서는 알아낼 수 없었다."
      },
      {
        "node": "ISK_L01_AA_150",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "제 글씨는 맞습니다. 표시하는 도구도 제가 들고 있었습니다. 다만 검사하던 순간이 기억나지 않습니다. 수레를 보고도 제가 안을 봤다는 생각이 들지 않았습니다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_151",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 동료가 와서 우리랑 목패를 같이 본 건? 그 뒤에 여기로 걸어와서 나눈 얘기도 기억해? 처음 검사했던 순간만 계속 빠져 있는 건지 궁금해서."
      }
    ],
    "ISK_L01_AA_152": [
      {
        "node": "ISK_L01_AA_152",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "동료가 와서 함께 살핀 것은 기억합니다. 그 뒤에 제 이름과 근무 구간을 말씀드린 것도, 이쪽으로 온 것도요. 그런데 처음 그 수레의 덮개를 열고 검사했다는 부분은 아직 없습니다. 시간이 지났는데도 거기만 떠오르지 않습니다."
      },
      {
        "node": "ISK_L01_AA_153",
        "profile": null,
        "speaker": null,
        "text": "호두는 병사가 손톱으로 잉크를 긁는 것을 보고 탁자 끝의 물통을 가리켰다. 접수 담당자가 젖은 천을 건넸다. 그는 그 천을 받아 들고도 무엇부터 해야 할지 잠깐 망설였다. 호두가 자기 손에서 같은 자리를 짚어 보이자 그제야 손등을 닦았다. 병사의 다른 손에 쥐인 도구가 손바닥을 누르고 있는 것을 보았다."
      },
      {
        "node": "ISK_L01_AA_154",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "살갗까지 긁어 내면 다음 일을 할 때 아프잖아요. 젖은 천으로 조금씩 닦으면 돼요. 손을 펴 보세요. 그래요, 도구는 탁자 위에 두고. 이렇게 내려놓는다고 아까 남긴 표시까지 없어지는 건 아니니까."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_155",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 지금까지 한 말이 계속 사라지는 건 아니네. 처음 검사한 때만 아직 없는 거고. 알겠어. 더 기억나는 척할 필요는 없어. 그 도구도 조금 놓고 있어. 손에 자국이 다 남았어."
      }
    ],
    "ISK_L01_AA_156": [
      {
        "node": "ISK_L01_AA_156",
        "profile": null,
        "speaker": "접수 담당 병사",
        "text": "여기는 제가 맡겠습니다. 잠깐 앉아 쉬십시오. 이후의 인계는 옆에서 같이 살피겠습니다. 다른 두 분께도 다시 여쭐 일이 있으면 이 접수처에서 연락드리겠습니다."
      },
      {
        "node": "ISK_L01_AA_157",
        "profile": null,
        "speaker": null,
        "text": "병사는 물에 적신 천을 내려놓고 손가락을 천천히 폈다. 잉크는 옅어졌지만 수레에 남긴 확인 표시는 그대로였다. 그는 동료에게 앉을 자리를 물었고, 조금 전 함께 목패를 살핀 이야기를 다시 할 수 있었다. 처음 덮개를 열었던 순간만은 끝내 떠올리지 못했다. 그가 앉은 뒤에도 한동안 손바닥을 내려다보는 것을 보았다."
      }
    ],
    "ISK_L01_AA_160": [
      {
        "node": "ISK_L01_AA_160",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "장례 치르는 집에서도 매듭 하나 못 풀고 서 있는 사람이 있어. 손에 힘이 너무 들어가서. 그럴 때는 긴 말보다 끈을 잠깐 대신 잡아 주는 게 나을 때도 있지. 네가 아까 가림천을 잡아 준 것처럼."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_161",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 오늘 내 손도 꽤 쓸모가 있었네. 다음에는 바람 안 부는 곳에서 불러 줘. 손은 빌려 줘도 내가 통째로 날아가는 것까지는 곤란하니까. 그건 단기 도움치고 너무 멀리 가잖아."
      }
    ],
    "ISK_L01_AA_167": [
      {
        "node": "ISK_L01_AA_167",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "옥형, 저쪽 말뚝 옆 사람들도 조금 비켜 설 수 있게 해 줘. 우리가 이야기하는 동안 계속 옷자락을 당기고 있네. 내 가림틀은 검사소 쪽에 세워 뒀어. 나갈 길을 알려 주면 수레꾼한테 먼저 옮겨 두라고 할게."
      },
      {
        "node": "ISK_L01_AA_168",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "바깥으로 돌아가는 줄 옆에 빈자리가 있어. 그쪽에 세워 줘. 정문 쪽으로 돌리면 또 엉켜. 안내하는 병사 한 명을 붙일게. 지금 이 앞에서 수레를 다시 펴지는 말고."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_169",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럴 기운은 가림틀도 없을 거야. 아까 그 병사 말인데, 동료가 온 뒤에 한 얘기는 기억하더라. 맨 처음 검사한 순간만 계속 없고. 항구를 막은 이유도 그런 일이 생겨서야?"
      }
    ],
    "ISK_L01_AA_173": [
      {
        "node": "ISK_L01_AA_173",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "맞아. 물건은 옮겨졌는데 담당자가 인계한 기억이 없어. 반대로 받았다고 생각하는 사람이 실제로 받은 건 앞의 짐일 수도 있지. 수량이 맞지 않는 순간 대금을 누가 지급했는지, 어느 계약이 이행됐는지까지 전부 멈춰. 계약의 도시에서 그 혼란을 눈감고 사람을 더 들일 수는 없어."
      },
      {
        "node": "ISK_L01_AA_174",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그럼 왕생당에서도 길 안내를 받을 때 일행이 따라왔는지 다시 봐야겠네. 장례를 치르고 혼자 돌아서는 사람이 있어. 안내가 바뀌었는데 다들 전해 들었겠거니 하고 보내 버리면 곤란해. 바뀌는 길은 우리 쪽에도 알려 줘."
      },
      {
        "node": "ISK_L01_AA_175",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "알겠어. 바깥에서 기다리는 사람들에게도 같은 안내가 가도록 하겠어. 대기처로 가는 줄과 제보하러 오는 줄도 나눴어. 어디로 가야 할지 몰라 헤매는 시간이 줄어야 안쪽 일을 맡은 인원도 교대할 수 있으니까."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_176",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 나도 바깥에서 기다릴게. 다만 해가 움직이면 그늘 쪽으로는 옮길 수 있지? 가방 지키겠다고 서 있다가 내가 먼저 쓰러져서 누가 업어 가게 되는 건 피하고 싶네."
      }
    ],
    "ISK_L01_AA_177": [
      {
        "node": "ISK_L01_AA_177",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "대기처 그늘은 써도 돼. 통행로만 막지 말고. 네 말대로 업어서 옮겨야 할 일을 더 만들 필요는 없겠지. 자리를 크게 옮길 때는 접수처에 알려 줘. 그 짐도 젖은 땅보다는 옆의 평평한 곳에 두는 게 좋겠어."
      },
      {
        "node": "ISK_L01_AA_178",
        "profile": null,
        "speaker": null,
        "text": "짐수레가 방향을 바꾸자 차단선 앞에 사람 하나가 지날 틈이 생겼다. 각청은 말을 이어 가면서도 그 틈이 다시 막히지 않는지 눈으로 따라갔다. 호두는 내 신발에 붙은 마른 풀을 가리켰다. 내가 발끝을 털자 가방에 걸린 끈도 한 번 흔들렸다. 긴 길의 먼지는 아직 남아 있었고, 오늘 안으로 들어갈 수 없다는 말도 그대로였다. 그래도 서 있을 곳과 잠깐 앉을 곳은 생겼다."
      },
      {
        "node": "ISK_L01_AA_179",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "공고된 송신의례 때 옥경대로만 가는 별도 길은 준비해 뒀어. 그날 통행이 시작되면 안내에 따라 와. 지금은 바깥 대기처에 머물러. 그 길도 항구 안을 자유롭게 다니는 허가는 아니야."
      }
    ],
    "ISK_L01_AA_185": [
      {
        "node": "ISK_L01_AA_185",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그럼 나는 가림틀을 마저 챙기러 갔다 올게. 이야기를 더 하고 싶으면 아까 검사소 쪽 사람에게 왕생당 당주를 물어봐. 오늘은 네가 어디 기다리는지도 알았으니 내가 찾아와도 되겠네."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_186",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "응. 다음에 와도 가방부터 열어 보라는 인사는 하지 않을 거지?"
      }
    ],
    "ISK_L01_AA_187": [
      {
        "node": "ISK_L01_AA_187",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "첫 번째 인사가 천 잡아 달라는 말이었던 당주를 너무 얌전하게 예상하는데? 그래도 가방은 네가 먼저 말할 때까지 묻지 않을게. 그 대신 오늘 길 찾기는 몇 점이었는지 물어보지 뭐."
      },
      {
        "node": "R39_PROSE_ISK_L01_AA_188",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "항구 바로 앞까지 왔는데 못 들어갔으니까 반쯤인가. 그런데 내가 길을 틀려서 못 들어간 건 아니잖아. 그 부분은 점수에서 빼 줘."
      }
    ],
    "ISK_L01_AA_189": [
      {
        "node": "ISK_L01_AA_189",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "좋아. 채점 기준을 고쳐야겠네. 길은 제대로 찾았고, 기다릴 이유도 들었고, 돌아갈 사람에게 네 이름도 남겼으니까. 나머지는 다음에 보자."
      },
      {
        "node": "ISK_L01_AA_190",
        "profile": null,
        "speaker": null,
        "text": "호두가 자리를 떠난 뒤 나는 접수처에서 조금 떨어진 자리를 골랐다. 사람들의 얼굴을 볼 수 있었고, 자기 이름이 불리면 들을 수 있는 거리였다. 가방은 무릎 위에 두었다. 천의 매듭은 그대로였으며 안쪽의 유해도 꺼내지 않았다. 이 나라에 먼저 내놓은 것은 죽은 사람의 모습이 아니라, 자신이 본 일을 끝까지 설명하겠다는 이름이었다."
      }
    ],
    "ISK_L01_AB_002": [
      {
        "node": "ISK_L01_AB_002",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "급하게 걷다 짐을 떨어뜨리진 말게. 물건보다 떨어뜨린 걸 못 알아채는 쪽이 문제니까."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_003",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 말 듣고 벌써 두 번 확인했어. 이제 한 번 더 하면 가방한테 내가 떠나는지 허락받아야겠는데."
      }
    ],
    "ISK_L01_AB_004": [
      {
        "node": "ISK_L01_AB_004",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "확인했으면 됐어. 다음에는 길을 보게."
      },
      {
        "node": "ISK_L01_AB_005",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "출발 전에 하나만 맞추자. 몬드에서 맡기로 한 건 현장의 증언과 기록을 비교하는 일이야. 길에서 누가 네 소문을 더 크게 부풀려도 할 일이 저절로 늘어나는 건 아니고."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_006",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "좋아. 용을 진정시켰다는 이유로 리월 사람 머릿속까지 수리하라는 소리만 안 나오면 돼. 그건 내가 아직 수리점 간판을 안 달아서."
      }
    ],
    "ISK_L01_AB_007": [
      {
        "node": "ISK_L01_AB_007",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "못 하는 일에 간판부터 달 필요는 없지. 각청, 새로 확인되는 내용은 이 사람에게도 바로 알려 주게. 몬드에서 한 약속만 들고 현장에 서게 하지 말고."
      },
      {
        "node": "ISK_L01_AB_008",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그럴 생각이에요. 상황이 바뀌면 맡길 일부터 다시 정하겠어요."
      },
      {
        "node": "ISK_L01_AB_009",
        "profile": null,
        "speaker": null,
        "text": "다이루크는 짐을 대신 들어 주거나 길 위로 한 걸음 더 따라오지 않았다. 와이너리에서 처리할 일이 남아 있었다. 함께 싸웠고 도움을 청할 수 있는 사이라는 사실이, 그가 모든 여행을 같이 떠난다는 뜻은 아니었다. 빈손으로 돌아서려는 그를 한 번 더 불렀다."
      }
    ],
    "ISK_L01_AB_011": [
      {
        "node": "ISK_L01_AB_011",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "목적지부터 확인하고 안내하게. 가게를 들르기 위한 길이라면 미리 말하고."
      },
      {
        "node": "ISK_L01_AB_012",
        "profile": null,
        "speaker": null,
        "text": "다이루크의 입가가 아주 조금 움직였다. 내가 대답할 틈을 찾는 동안 각청은 지도를 접고 먼저 길을 향해 몸을 돌렸다. 이번에도 가게 이야기를 오래 끌 생각은 없어 보였다."
      }
    ],
    "ISK_L01_AB_014": [
      {
        "node": "ISK_L01_AB_014",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "그게 좋겠군. 닮았다는 것과 이어져 있다는 건 달라. 다만 직접 본 사실까지 남의 말에 맞춰 고칠 필요는 없어."
      },
      {
        "node": "ISK_L01_AB_015",
        "profile": null,
        "speaker": null,
        "text": "그는 구슬이 든 곳을 보지 않았다. 시신이 있던 바닥과 아무것도 없던 바닥을 함께 보았다는 사실만으로도, 어느 부분을 남겨야 하는지 서로 알 수 있었다."
      }
    ],
    "ISK_L01_AB_016": [
      {
        "node": "ISK_L01_AB_016",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "연락할 일이 생기면 전하게. 내가 아는 범위는 확인해 주지."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_017",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알았어. 부탁할 일이 생겼는데 혼자 멋있는 척하다 망하는 쪽은 피할게."
      }
    ],
    "ISK_L01_AB_021": [
      {
        "node": "ISK_L01_AB_021",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "저 바위까지 가면 바람을 막을 수 있어. 거기서 쉬자. 물은 얼마나 남았어?"
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_022",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "물보다 다리부터 확인해 줄 줄 알았는데."
      }
    ],
    "ISK_L01_AB_023": [
      {
        "node": "ISK_L01_AB_023",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "다리는 방금 네가 보고했잖아. 물까지 확인해야 다음에 어디서 멈출지 정하지."
      },
      {
        "node": "ISK_L01_AB_024",
        "profile": null,
        "speaker": null,
        "text": "바위 그늘에 앉자 발바닥이 뒤늦게 욱신거렸다. 각청도 지도를 무릎 위에 내려놓았다. 가방에서 꺼낸 서류 묶음에는 몬드에서 보았던 내용과 아직 빈칸인 쪽지가 함께 있었다. 빈칸 쪽을 손가락으로 가리켰다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_025",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "저게 내가 채울 부분이야? 종이가 저만큼 비었으면 사람도 좀 비워 둬야 해. 다 채우고 돌아오라고 하면 오래 걸릴걸."
      }
    ],
    "ISK_L01_AB_026": [
      {
        "node": "ISK_L01_AB_026",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "다 채울 종이는 아니야. 이 줄은 마지막으로 기억하는 장면, 옆줄은 이상하다고 느낀 다음 눈앞에 있던 것. 사이가 얼마나 비었는지 모르니까 넓게 남겨 둔 거야. 빈칸이 큰 사람에게 말을 더 길게 하라고 할 수는 없잖아."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_027",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 빈칸 아래에 성의가 없다고 적지만 말아 줘. 나도 예전에는 그런 종이 보면 괜히 뭐라도 채우고 싶어졌거든."
      }
    ],
    "ISK_L01_AB_028": [
      {
        "node": "ISK_L01_AB_028",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 버릇은 여기서는 참아. 없는 말을 채우면 다음 사람은 그걸 지우는 데 시간을 써야 해."
      },
      {
        "node": "ISK_L01_AB_029",
        "profile": null,
        "speaker": null,
        "text": "말은 빨랐지만 서류를 나에게 밀어 넣지는 않았다. 각청은 아직 당사자가 동의하지 않은 진술과 공개해도 되는 현장 정보의 묶음을 갈라 넣었다. 기억이 빈 사람들의 이야기가, 정작 그 사람보다 먼저 낯선 곳을 돌아다니지 않게 하려는 손길이었다."
      }
    ],
    "ISK_L01_AB_035": [
      {
        "node": "ISK_L01_AB_035",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "말하기 싫다면 그날은 서류를 덮으면 돼. 다만 목소리가 떨린다고 네가 먼저 끝내지는 마. 어렵더라도 끝까지 말해 보겠다는 사람도 있으니까. 그때는 조금 기다려 주자."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_036",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그건 물어볼게. 내가 상대 마음을 읽을 수 있었으면 전에 회사에서도 그렇게 많이 헛짚지는 않았겠지."
      }
    ],
    "ISK_L01_AB_039": [
      {
        "node": "ISK_L01_AB_039",
        "profile": null,
        "speaker": null,
        "text": "귀리 평원 쪽 길목에서 천암군 전령이 각청을 알아보고 멈춰 섰다. 그는 인사 뒤 곧바로 봉한 문서를 내밀었다. 각청은 서서 내용을 읽다가 두 번째 장으로 손을 옮겼다. 내가 끈을 고쳐 묶는 동안에도 종이 넘기는 소리가 다시 나지 않았다."
      },
      {
        "node": "ISK_L01_AB_040",
        "profile": null,
        "speaker": "천암군 전령",
        "text": "외곽 인계 초소에서도 새 사례가 확인됐습니다. 같은 교대 시간에 있던 인원 일부입니다. 입항과 육로 출입 통제를 함께 강화했습니다. 현장 담당관이 옥형님 확인을 기다리고 있습니다."
      },
      {
        "node": "ISK_L01_AB_041",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "의식은? 지금도 공백이 계속돼?"
      },
      {
        "node": "ISK_L01_AB_042",
        "profile": null,
        "speaker": "천암군 전령",
        "text": "대화와 보행은 가능합니다. 짧은 구간이 기억나지 않는다고 합니다. 해당 업무에서는 빠졌고, 확인받은 인원으로 교대했습니다."
      },
      {
        "node": "ISK_L01_AB_043",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "좋아. 원문은 내가 가져갈게. 넌 다음 연락 지점에 도착 확인을 남겨. 같은 문서를 기다리느라 사람을 또 보내지 않도록."
      }
    ],
    "ISK_L01_AB_044": [
      {
        "node": "ISK_L01_AB_044",
        "profile": null,
        "speaker": null,
        "text": "전령이 물러난 뒤 각청은 나에게 문서의 공개할 수 있는 부분을 보여 주었다. 몬드에서 출발할 때에는 일부 초소의 배치를 바꾸고 현장을 따로 확인하는 단계였다. 지금은 새로 사람과 물건이 들어오는 일을 함께 멈췄다는 표시가 있었다. 초청받았다는 사실은 남아 있었지만, 그 초청을 이행할 길이 달라졌다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_045",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "같이 들어가서 사람들 만나기로 했는데, 지금은 들어가는 것부터 다시 정해야 한다는 거지?"
      }
    ],
    "ISK_L01_AB_050": [
      {
        "node": "ISK_L01_AB_050",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "응. 준비가 달라진 건 내가 설명할 일이야. 도착하면 남에게 미루지 않을게."
      },
      {
        "node": "ISK_L01_AB_051",
        "profile": null,
        "speaker": null,
        "text": "각청이 먼저 움직였다. 그녀가 건넨 접견 확인서를 두 번 접어 넣었다. 종이는 가벼웠지만, 종이에 적힌 사람이 눈앞에 없으면 해야 할 말이 더 많아질 수 있었다. 길목의 안내 병사가 표시한 큰길을 따라 천천히 남쪽으로 내려갔다."
      }
    ],
    "ISK_L01_AB_053": [
      {
        "node": "ISK_L01_AB_053",
        "profile": null,
        "speaker": "초소 담당관",
        "text": "성함과 만나기로 한 분을 말씀해 주십시오. 입항 허가를 기다리는 분은 왼쪽, 접견 확인은 이쪽입니다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_054",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "{PLAYER_NAME}. 각청이 부른 사람이야. 들어가도 된다고 우길 생각은 없는데, 부른 사람이 나를 밖에서 만나기로 한 건 꼭 전해 줘."
      }
    ],
    "ISK_L01_AB_055": [
      {
        "node": "ISK_L01_AB_055",
        "profile": null,
        "speaker": null,
        "text": "담당관은 확인서를 읽고 뒤쪽 병사에게 전달을 맡겼다. 나를 목책 안으로 밀어 넣지도, 상인들의 줄 맨 뒤로 돌려보내지도 않았다. 길을 막지 않는 자리에 서 있는 동안 각청이 외곽 작업대 쪽에서 걸어왔다. 한쪽 장갑에는 밧줄의 보풀이 붙어 있었다."
      },
      {
        "node": "ISK_L01_AB_056",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "기다렸지. 여기서부터 항구 안으로는 못 들어가. 네가 온 이유는 알고 있고, 부탁을 취소하는 것도 아니야."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_057",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "도착 인사가 입장 금지부터네. 부른 사람이 당신이라서 순서를 따지고 싶은데, 설명은 당신한테 직접 들으면 되는 거지?"
      }
    ],
    "ISK_L01_AB_058": [
      {
        "node": "ISK_L01_AB_058",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "맞아. 내가 현장을 보여 주겠다고 했으니, 만날 자리와 들어갈 수 있는 범위를 먼저 정해서 알려 줬어야 해. 도중에 통제가 바뀌었고 지금은 항구 밖에서만 움직일 수 있어. 기다리게 해서 미안해. 네 일정이 늘어나는 건 네 잘못으로 넘기지 않을게."
      },
      {
        "node": "ISK_L01_AB_059",
        "profile": null,
        "speaker": null,
        "text": "각청은 사과 뒤에 다른 사람 이름을 대지 않았다. 접수대 옆 판을 돌려 지도를 펼치고, 처음 만나기로 했던 자리와 지금 이용할 수 있는 바깥 작업대를 각각 짚었다. 종이에서 두 곳은 가까웠다. 실제로는 그 사이에 사람의 출입을 막는 목책이 있었다."
      },
      {
        "node": "ISK_L01_AB_060",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "지금 면담에 응한 병사는 이쪽 휴식소에 있어. 관련 물자는 저 외곽 보관 구역에 남겨 뒀고. 둘 다 항구 밖이야. 내가 동행해서 현장을 확인하고, 기다릴 자리도 여기서 정하자. 네가 초청장을 들고 문마다 부딪치게 둘 생각은 없어."
      }
    ],
    "ISK_L01_AB_062": [
      {
        "node": "ISK_L01_AB_062",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "오늘은 한쪽을 깊게 확인할 거야. 둘을 얕게 훑고 끝냈다고 하지 않을게. 멈출 때는 남은 일을 적고 같이 멈추자."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_063",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "좋아. 말이 아주 믿음직한데, 지도 접고도 기억해 줘."
      }
    ],
    "ISK_L01_AB_066": [
      {
        "node": "ISK_L01_AB_066",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그래서 내가 밖으로 나온 거야. 여기서 결정할 건 여기서 결정할게. 네가 알아낸 걸 들고 안쪽까지 다시 들어오라고 하지도 않을 거고."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_067",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 정도면 납득하지. 같이 불편한 사람이 있으면 기다리는 기분도 덜 나빠지거든."
      }
    ],
    "ISK_L01_AB_070": [
      {
        "node": "ISK_L01_AB_070",
        "profile": null,
        "speaker": null,
        "text": "옆줄의 상인이 다시 빈 자루를 들어 보였다. 접수받았다는 표는 있는데 누가 물건을 옮겼는지 분명하지 않다는 말이었다. 담당관은 남은 물건을 다시 내라고 하지 않고, 이미 맡긴 자리가 확인될 때까지 별도로 기다리게 했다. 뒤의 수레도 함께 멈췄다. 짧은 공백 하나가 길 위에서는 긴 줄이 되어 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_071",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "몬드에서 들을 때는 짧게 잊는다고 해서, 물어보고 다시 세면 되는 건가 싶었어. 여기 와 보니까 다시 세는 동안 다음 물건이 계속 오는 거네."
      }
    ],
    "ISK_L01_AB_072": [
      {
        "node": "ISK_L01_AB_072",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "세는 것만의 문제도 아니야. 상인이 한 번 넘긴 물건을 또 넘기라는 요구를 받을 수 있고, 받은 쪽은 아직 안 받았다고 믿을 수 있어. 그 상태에서 값을 치르면 중복 지급이 되고, 치르지 않으면 제때 일한 사람이 돈을 못 받아. 수량이 맞아도 누가 맡았는지가 비면 책임이 끊겨."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_073",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그러면 다들 남이 거짓말한다고 생각하기도 쉽겠네. 나는 줬는데 당신은 못 받았다고 하고, 둘 다 자기 말은 확실할 테니까."
      }
    ],
    "ISK_L01_AB_074": [
      {
        "node": "ISK_L01_AB_074",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "이미 그런 다툼이 생겼어. 그래서 사람을 더 들이기 전에 인계 지점을 줄였고, 기억이 끊긴 당사자를 혼자 증명하게 세워 두지 않으려는 거야. 오래 일한 사람일수록 자기 손으로 했다는 사실을 더 받아들이기 힘들어해."
      },
      {
        "node": "ISK_L01_AB_075",
        "profile": null,
        "speaker": null,
        "text": "각청이 손가락을 떼자 지도 모서리가 바람에 들렸다. 작은 돌을 올려 눌렀다. 품 안의 구슬을 지도 위에 꺼내 문진처럼 놓는 대신이었다. 드발린에게서 일어났던 반응은 선명하게 기억했다. 그 기억이 선명하다고 다른 사람에게 똑같이 해도 된다는 답까지 따라오지는 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_076",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "구슬 이야기는 여기서 먼저 정해 두자. 누가 기대하면 당신도 바로 말해 줘. 용한테 일어난 일은 설명하겠지만, 기억을 되돌릴 수 있다고 말한 적은 없어."
      }
    ],
    "ISK_L01_AB_077": [
      {
        "node": "ISK_L01_AB_077",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "꺼내지 않아도 돼. 알베도가 적어 준 경위를 읽었어. 앨리스에게서 사용법까지 전해 받은 물건은 아니잖아. 누가 기대하고 찾아오면 나도 같이 설명할게."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_078",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "좋아. 가끔 물건 하나 생기면 세상 문제가 전부 그 물건 크기에 맞춰 줄어들 거라고 기대하는 사람이 있더라고. 내 주머니는 그렇게 넓지 않은데."
      }
    ],
    "ISK_L01_AB_079": [
      {
        "node": "ISK_L01_AB_079",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "오늘 필요한 건 네 눈과 질문이야. 주머니는 닫아 둬도 돼."
      },
      {
        "node": "ISK_L01_AB_080",
        "profile": null,
        "speaker": null,
        "text": "내가 잠금끈을 확인하자 각청은 재촉하지 않고 지도를 다시 폈다. 면담에 응한 병사는 쉬는 동안 이야기할 수 있다고 했다. 물자 보관 구역은 다른 수레를 옮기기 전에 확인할 수 있었다. 모두를 붙잡고 같은 이야기를 반복시키지 않으려면, 먼저 파고들 한쪽을 골라야 했다."
      },
      {
        "node": "ISK_L01_AB_081",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "병사는 마지막으로 무엇을 기억하는지 이야기하겠다고 했고, 상인은 먼저 자기 물건을 봐 달라고 해. 어디부터 갈래? 두 곳을 번갈아 다니며 모두를 기다리게 하진 말자. 고른 쪽부터 끝내고, 나머지는 담당자에게 보존을 맡길게."
      }
    ],
    "ISK_L01_AB_084": [
      {
        "node": "ISK_L01_AB_084",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "좋아. 얼굴이 알려질까 걱정해서 초소 뒤에서 만나기로 했어. 줄 선 사람들 곁을 지나갈 때부터 이름을 큰 소리로 부르지는 마. 그쪽 천막이야. 아직 쉬고 있으니 길어지면 내가 끊을게."
      },
      {
        "node": "ISK_L01_AB_085",
        "profile": null,
        "speaker": null,
        "text": "휴식소는 초소 뒤 천막이었다. 길에서 완전히 떨어진 곳은 아니었지만, 가림막을 내리면 줄 선 사람들이 안을 들여다볼 수 없었다. 갑옷의 어깨 부분을 풀어 놓은 병사가 의자에서 일어나려 했다. 각청이 손을 내려 앉아 있어도 된다고 표시했지만 그는 허리를 반쯤 세운 채 멈췄다."
      },
      {
        "node": "ISK_L01_AB_086",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "옥형님. 다시 설명드릴 수 있습니다. 아까 보고한 내용은…."
      },
      {
        "node": "ISK_L01_AB_087",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "일어서지 않아도 돼. 기록판은 내가 들게. 이쪽은 몬드에서 만나 조사를 도와 달라고 부탁한 사람이야. 아까 보고를 그대로 외워 말할 필요는 없어. 나도 여기 있어도 괜찮겠어?"
      },
      {
        "node": "ISK_L01_AB_088",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "계셔도 괜찮습니다. 다만 밖에서 듣지는 않았으면 합니다. 제가 같은 말을 자꾸 바꾼다고들 해서요."
      }
    ],
    "ISK_L01_AB_090": [
      {
        "node": "ISK_L01_AB_090",
        "profile": null,
        "speaker": null,
        "text": "병사가 고개를 끄덕이는 것을 보고 가림막을 내렸다. 한쪽은 공기가 드나들도록 남겼다. 안이 어두워지자 각청은 기록판을 더 가까이 당겼다. 그녀의 직함까지 천막 밖에 둘 수는 없었지만, 적어도 병사가 누구의 얼굴을 보며 말할지는 고를 수 있었다."
      },
      {
        "node": "ISK_L01_AB_091",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "제 이름도 알고, 집이 어딘지도 압니다. 휴무 날 어머니께 들르기로 한 것도 기억해요. 그런데 그런 건 괜찮다고 말씀드리면, 그럼 왜 고리 하나 푼 걸 모르느냐고 하십니다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_092",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "전부 멀쩡하다고 억지로 증명할 필요는 없어. 가족 이야기는 아는데 고리 푼 기억은 없다는 게, 지금 우리가 들으러 온 얘기니까."
      }
    ],
    "ISK_L01_AB_093": [
      {
        "node": "ISK_L01_AB_093",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "고리를 풀기 전, 마지막으로 확실한 장면부터 말해 줘. 네가 나중에 들은 말은 뒤에서 따로 적을게."
      },
      {
        "node": "ISK_L01_AB_094",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "수레 앞바퀴가 홈에 걸렸습니다. 운송인이 왼쪽을 더 밀라고 했어요. 저는 통행줄을 낮추려고 고리를 잡았고요. 쇠가 차가웠던 것까지는 기억납니다. 그다음엔 수레가 벌써 제 옆을 지나 있었어요. 제 손에는 줄을 감은 자국이 남았는데, 고리를 어디에 걸었는지 모르겠더군요."
      },
      {
        "node": "ISK_L01_AB_095",
        "profile": null,
        "speaker": null,
        "text": "병사의 손목에 난 짐끈 자국을 보던 중, 그가 갑자기 의자에서 일어나 내 어깨를 잡았다. 말보다 먼저 몸을 끌어당겼다. 내가 앉았던 자리로 천막의 가로대가 떨어졌다. 그제야 위에서 못 빠지는 소리가 났다. 그는 나를 붙잡은 채, 왜 일어났는지 모르겠다는 얼굴로 바닥을 내려다봤다."
      }
    ],
    "ISK_L01_AB_097": [
      {
        "node": "ISK_L01_AB_097",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "눈을 감았다는 기억도 없습니다. 한참 딴생각을 했나 싶어서 사과하려고 했어요. 그런데 옆의 교대병이 아직 고리를 내리지 말라고 하더군요. 고리는 이미 걸려 있었는데요."
      },
      {
        "node": "ISK_L01_AB_098",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그때 서로 앞의 말을 반복했어?"
      },
      {
        "node": "ISK_L01_AB_099",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "제가 수레를 밀어야 한다고 했고, 그 사람은 운송인이 아직 오지 않았다고 했습니다. 수레도 운송인도 바로 앞에 있었어요. 보고 나서는 둘 다 안다는 얼굴을 했는데, 그 사이를 말하라고 하면 아무것도 안 나왔습니다."
      }
    ],
    "ISK_L01_AB_101": [
      {
        "node": "ISK_L01_AB_101",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "그렇게 적으면 제가 일을 안 했다고 보지는 않겠습니까?"
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_102",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "일을 했다는 흔적이랑, 본인이 기억 못 한다는 말은 같이 적으면 되지. 둘 중 하나를 버려야 종이가 예뻐지는 건 아니잖아."
      }
    ],
    "ISK_L01_AB_103": [
      {
        "node": "ISK_L01_AB_103",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "이 줄을 봐. 네가 고리를 잡았다는 말까지 적혀 있어. 그다음이 비었다고 앞에서 한 일까지 지우지는 않아. 읽어 보고 네 말과 다른 곳이 있으면 짚어 줘."
      },
      {
        "node": "ISK_L01_AB_104",
        "profile": null,
        "speaker": null,
        "text": "병사는 기록판에 남은 빈 줄을 오래 보았다. 조금 전까지는 그 줄을 메우려고 문장을 앞에서부터 다시 시작했다. 이번에는 손을 무릎 위에 놓고 다음 질문을 기다렸다."
      }
    ],
    "ISK_L01_AB_106": [
      {
        "node": "ISK_L01_AB_106",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "그 사람에게 제 말부터 알려 주지 않으실 겁니까?"
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_107",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "응. 내가 두 사람 사이를 오가면서 정답을 전달하면, 듣는 사람은 편해도 알아낼 건 없어지잖아."
      }
    ],
    "ISK_L01_AB_108": [
      {
        "node": "ISK_L01_AB_108",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "진술은 따로 받기로 했어. 다 받은 뒤 겹치는 부분만 같이 확인하자. 서로 다른 말이 있어도 당장 한쪽을 거짓말로 적지 않을 거야."
      },
      {
        "node": "ISK_L01_AB_109",
        "profile": null,
        "speaker": null,
        "text": "병사는 그제야 어깨에 걸친 갑옷끈을 끝까지 풀었다. 끈 끝이 의자 옆으로 내려왔고, 천막 안에서 처음으로 쇠붙이 부딪히는 소리가 멎었다."
      }
    ],
    "ISK_L01_AB_110": [
      {
        "node": "ISK_L01_AB_110",
        "profile": null,
        "speaker": null,
        "text": "첫 면담을 마친 뒤에는 병사에게 기록을 보여 주었다. 그가 직접 기억한다는 말 아래에 줄을 긋고, 다른 사람에게 들었다는 대목은 옆으로 옮겼다. 비어 있는 구간을 둥글게 둘러싸려다가 손을 멈췄다. 정확히 얼마나 긴지 아직 모르는 일을 일정한 크기로 그릴 필요는 없었다."
      },
      {
        "node": "ISK_L01_AB_111",
        "profile": null,
        "speaker": null,
        "text": "교대 병사는 다른 쪽 가림막 안에서 만났다. 각청은 먼저 받은 진술을 뒤집어 놓았다. 앞사람의 고리 이야기를 꺼내지 않고, 근무를 시작했을 때부터 기억나는 순서대로 말해 달라고 했다."
      },
      {
        "node": "ISK_L01_AB_112",
        "profile": null,
        "speaker": "교대 병사",
        "text": "앞사람이 물통을 내려놓는 걸 봤습니다. 바퀴가 걸렸다는 말은 들었어요. 운송인은 수레 뒤쪽에 있었고요. 저는 통행줄을 내리기 전에 수레가 멈췄는지 확인하려고 했습니다. 그런데 다음에 보니 제 손이 벌써 줄 끝을 들고 있었습니다."
      }
    ],
    "ISK_L01_AB_115": [
      {
        "node": "ISK_L01_AB_115",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 뒤에는? 지금까지의 일도 끊겨?"
      },
      {
        "node": "ISK_L01_AB_116",
        "profile": null,
        "speaker": "교대 병사",
        "text": "아닙니다. 서로 이상하다고 말한 뒤부터는 기억합니다. 담당관을 부른 것도, 교대한 것도요. 처음에는 제가 말을 잘못한 줄 알았습니다. 옆사람도 같은 얼굴이라서 그제야 보고했어요."
      },
      {
        "node": "ISK_L01_AB_117",
        "profile": null,
        "speaker": null,
        "text": "그의 마지막 기억은 앞사람의 마지막 기억과 같지 않았다. 한 사람은 고리를 잡던 손을, 다른 사람은 운송인의 위치를 말했다. 그러나 둘 다 끝난 동작 앞에서 뒤늦게 멈췄다. 같은 자리에 있었다는 사실만으로 공백의 시작과 길이까지 같다고 적을 수는 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_118",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "두 사람이 같은 말을 외워서 하는 건 아니네. 그래서 오히려 더 난감해. 누구 말 하나 고쳐 쓰면 끝나는 문제였으면 간단했을 텐데."
      }
    ],
    "ISK_L01_AB_119": [
      {
        "node": "ISK_L01_AB_119",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "기억이 끊기기 전의 자세도 달랐어. 같은 자리에 있었다고 똑같은 순간부터 잊은 건 아닐 수 있겠네. 인계가 끝난 걸 보고 둘 다 놀랐다는 부분부터 표시하자. 앞뒤를 본 사람이 더 필요해."
      },
      {
        "node": "ISK_L01_AB_120",
        "profile": null,
        "speaker": "교대 병사",
        "text": "그럼 저희가 함께 잠깐 정신을 놓았다는 겁니까?"
      },
      {
        "node": "ISK_L01_AB_121",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그렇게 단정하지 않았어. 의식을 잃었는지, 행동은 계속했는지, 지금 이 말만으로는 구분할 수 없어. 모른다는 부분을 검사할 때도 전할 거야."
      },
      {
        "node": "ISK_L01_AB_122",
        "profile": null,
        "speaker": null,
        "text": "천막 밖에서 수레바퀴가 삐걱거렸다. 교대 병사는 소리가 나자 본능적으로 몸을 돌렸다가 앉은 자리로 돌아왔다. 자기 근무가 끝났다는 걸 잊은 움직임은 아니었다. 아직 줄을 놓아서는 안 된다는 긴장만 몸에 남은 듯했다."
      }
    ],
    "ISK_L01_AB_124": [
      {
        "node": "ISK_L01_AB_124",
        "profile": null,
        "speaker": null,
        "text": "처음 만난 병사에게 돌아오자 그는 가림막 틈으로 바깥을 보고 있었다. 나를 알아보고 먼저 의자를 당겼다. 방금 나눈 대화는 기억하고 있었다. 그 작은 동작을 곧바로 회복의 증거로 부르고 싶지는 않았다. 문제가 된 틈이 메워진 것은 아니었다."
      },
      {
        "node": "ISK_L01_AB_125",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "옆사람도 같은 말을 했습니까?"
      }
    ],
    "ISK_L01_AB_128": [
      {
        "node": "ISK_L01_AB_128",
        "profile": null,
        "speaker": null,
        "text": "그는 말을 멈추고 내 얼굴을 보았다. 평생을 잊은 사람도, 눈앞의 사람을 못 알아보는 사람도 아니었다. 다만 자기 손으로 한 짧은 동작의 주인이 누구인지 묻는 순간, 대답이 돌아오지 않았다. 몬드의 빈 사당을 떠올렸다. 있었던 것이 없다는 광경과, 한 일이 자기 안에는 없다는 말 사이에 함부로 선을 그을 수는 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_129",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나는 분명히 본 게 나중에는 사라져 있던 곳에 다시 가 본 적이 있어. 당신 일하고 같다는 말은 못 하겠는데, 남아 있는 사실이 없다고 내가 본 것까지 없던 일로 만들기는 싫더라."
      }
    ],
    "ISK_L01_AB_130": [
      {
        "node": "ISK_L01_AB_130",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "몬드 사당 이야기지. 그 사건은 네가 직접 본 기록으로 따로 남기자. 여기 증언과 연결되는 증거가 나온 건 아니야."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_131",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "응. 누가 했는지 아는 척하려는 건 아니야. 우인단 생각이 안 나는 것도 아닌데, 생각이 난다는 것하고 범인이 있다는 건 다르니까."
      }
    ],
    "ISK_L01_AB_132": [
      {
        "node": "ISK_L01_AB_132",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "그럼 제가 이상하다고 느낀 것도 적어도 됩니까? 그게 증거가 아니더라도요."
      },
      {
        "node": "ISK_L01_AB_133",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "써 줘. 내가 대신 문장을 만들면 네가 느낀 것과 달라질 수 있으니까. 다 쓰면 함께 읽고, 낯선 사람이 읽어도 네 뜻대로 이해할지만 확인하자."
      },
      {
        "node": "ISK_L01_AB_134",
        "profile": null,
        "speaker": null,
        "text": "병사는 자신이 적은 짧은 문장을 읽다가 한 단어를 지웠다. 하지 않았다는 말 대신 기억나지 않는다는 말을 남겼다. 각청은 대신 고쳐 주지 않았다. 나도 그 문장이 더 그럴듯하게 들리도록 말을 보태지 않았다. 이번에는 쓰는 사람이 끝낼 때까지 기다렸다."
      }
    ],
    "ISK_L01_AB_136": [
      {
        "node": "ISK_L01_AB_136",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "이번에 나눈 말은 기억합니다. 너무 먼저 잊을 사람처럼 대해 주시지는 마세요."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_137",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "아, 그건 맞네. 내가 걱정을 한 걸음 너무 멀리 보냈다. 그럼 다음에는 오늘 의자가 불편했다는 얘기부터 해도 알아듣겠지?"
      }
    ],
    "ISK_L01_AB_138": [
      {
        "node": "ISK_L01_AB_138",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "그건 확실히 기억할 것 같습니다. 다리 하나가 짧거든요."
      },
      {
        "node": "ISK_L01_AB_139",
        "profile": null,
        "speaker": null,
        "text": "내가 앉은 의자가 바로 그 의자였다. 다시 자세를 잡는 순간 한쪽으로 기울었다. 병사는 처음으로 입가에 힘을 풀었다. 각청은 웃는 대신 의자 밑을 확인하고 접힌 천을 끼웠다."
      }
    ],
    "ISK_L01_AB_141": [
      {
        "node": "ISK_L01_AB_141",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "그런 말이 벌써 도는 건 아니겠죠?"
      },
      {
        "node": "ISK_L01_AB_142",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "밖에는 확인한 범위만 안내할 거야. 이름과 가족까지 공개하지 않겠다는 약속도 지킬게."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_143",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내가 한 말을 증명하겠다고 당신까지 사람들 앞에 끌고 나가지는 않을게. 필요하면 여기서 다시 얘기하자. 의자는 그때 조금 나은 걸로 부탁하고."
      }
    ],
    "ISK_L01_AB_145": [
      {
        "node": "ISK_L01_AB_145",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "오늘은 더 묻지 않을게. 교대와 휴식은 담당관에게 내가 다시 확인할 거야. 밖에 있는 사람들에게 네가 일일이 해명하러 나가지는 마. 근무에서 빠진 이유도 내가 설명할게."
      },
      {
        "node": "ISK_L01_AB_146",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "네. 그 말은 제가 직접 들었다고 기억해 두겠습니다."
      },
      {
        "node": "ISK_L01_AB_147",
        "profile": null,
        "speaker": null,
        "text": "가림막을 걷자 바람이 천막 안으로 들어왔다. 병사는 문밖까지 따라 나서지 않고 물통을 집었다. 그가 물을 마시는 동안 시선을 돌렸다. 평범하게 남겨 둘 수 있는 동작까지 계속 지켜보고 기록하고 싶지는 않았다."
      },
      {
        "node": "ISK_L01_AB_148",
        "profile": null,
        "speaker": null,
        "text": "각청은 담당관과 면담 기록을 대조한 뒤 휴식소 옆 대기 자리를 가리켰다. 환자를 기다리는 가족과 조사 협력자가 섞여 서지 않도록 자리를 조금 벌려 놓았다. 내가 머무를 곳은 사람들의 증언을 다시 들을 수 있는 쪽이었다. 물자 구역에서 아직 확인하지 않은 일을 이번 결론에 덧붙이지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_149",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이제 기다리라는 말이 나올 차례지? 듣는 준비는 됐어. 어디서, 누구를, 뭘 하면서 기다리는지까지 한 번에 알려 줘."
      }
    ],
    "ISK_L01_AB_150": [
      {
        "node": "ISK_L01_AB_150",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "이 대기 구역에 있으면 돼. 담당관에게 네 위치를 남기고, 자리를 옮길 때는 알려 줘. 면담 당사자가 내용을 고치고 싶어 하면 여기로 연락할 거야. 내가 다시 확인할 때도 밖으로 나올게."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_151",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "좋아. 그런데 저 공고에 있는 송신의례도 지금처럼 밖에서 구경하는 거야? 길 전체를 막아 두면 행사 보러 온 사람들도 그대로 서 있을 텐데."
      }
    ],
    "ISK_L01_AB_152": [
      {
        "node": "ISK_L01_AB_152",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그날에는 옥경대로만 이어지는 별도 길을 사용할 거야. 시내 거주 구역과 물자 인계 구역을 통과하지 않도록 나눠 준비했어. 지금 여는 건 아니야. 날이 되면 저 안내 지점에서 다시 확인하고 그 길로 와."
      },
      {
        "node": "ISK_L01_AB_153",
        "profile": null,
        "speaker": null,
        "text": "각청은 목책 밖을 따라 돌아가는 방향과 아직 출발할 수 없는 갈림길을 짚었다. 내가 지도를 돌려 보자 그녀는 손을 옮겨 내 눈높이에서 방향을 다시 맞췄다. 옥경대로 가는 길을 안다고 항구를 드나들 권한이 생기지는 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_154",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그러니까 오늘 여기서 기다리는 건 그대로고, 행사날에만 정해진 길로 옥경대. 중간에 가게 구경하러 빠지는 건 안 되고."
      }
    ],
    "ISK_L01_AB_155": [
      {
        "node": "ISK_L01_AB_155",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "정확해. 그 부분까지 한 번에 알아들어서 다행이네."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_156",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나도 길 안내를 받을 때마다 혼나는 재능만 있는 건 아니야. 그리고 오늘은 내가 물어보기 전에 의자부터 챙긴 걸 높이 평가해 줄게."
      }
    ],
    "ISK_L01_AB_157": [
      {
        "node": "ISK_L01_AB_157",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "흔들리지 않는 것으로 골랐어. 다음 이야기를 들을 때 네가 바닥에 앉아 있으면 설명을 또 해야 하니까."
      },
      {
        "node": "ISK_L01_AB_158",
        "profile": null,
        "speaker": null,
        "text": "각청은 서류를 챙긴 뒤에도 곧바로 목책 안으로 들어가지 않았다. 담당관에게 공개 안내의 문구를 확인하고, 병사들이 쉬는 천막 쪽을 한 번 더 살폈다. 의자를 밀어 대기 줄에 걸리지 않게 놓았다. 리월항의 문은 닫혀 있었고, 들은 이야기에는 아직 채울 수 없는 틈이 있었다. 그러나 그 틈을 이야기한 사람들은 바로 뒤 천막 안에 살아서 남아 있었다."
      }
    ],
    "ISK_L01_AB_160": [
      {
        "node": "ISK_L01_AB_160",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그럼 현장을 건드리지 않은 상태부터 보자. 물건 주인과 운송인도 불렀어. 네가 만져도 되는 물건인지 먼저 확인하고 시작할 거야."
      },
      {
        "node": "ISK_L01_AB_161",
        "profile": null,
        "speaker": null,
        "text": "보관 구역은 목책의 바깥에 붙은 낮은 천막이었다. 짐을 항구 안으로 반입하기 전에 수량과 상태를 확인하던 곳이었다. 바퀴에 쐐기를 댄 수레와, 줄로 구획을 나눈 적치대가 마주 보고 있었다. 상인은 수레 옆에 섰고 운송인은 짐끈을 손에서 놓지 않았다. 누구도 남의 짐을 훔쳐보는 얼굴은 아니었지만, 모두가 서로의 손부터 보고 있었다."
      },
      {
        "node": "ISK_L01_AB_162",
        "profile": null,
        "speaker": "상인",
        "text": "쇠고리입니다. 임시 방호물에 쓰는 거예요. 여섯 상자, 상자마다 열둘. 수레에 실을 때는 저와 운송인이 함께 확인했습니다. 그런데 하나가 비었다고 다시 가져오랍니다."
      },
      {
        "node": "ISK_L01_AB_163",
        "profile": null,
        "speaker": "운송인",
        "text": "제가 잃어버린 게 아닙니다. 여기서 멈추고 천막 지시대로 끈을 풀었어요. 그 뒤엔 검수가 끝나길 기다렸고요. 빈 상자가 다시 제 수레 위에 올라간 건 보았습니다."
      },
      {
        "node": "ISK_L01_AB_164",
        "profile": null,
        "speaker": "검수 서기",
        "text": "인계표에는 여섯 상자로 적혀 있습니다. 다만 실물을 검수한 병사는 한 상자를 열기 전까지 기억하고, 그 뒤 수량 확인을 기억하지 못합니다. 제가 전달받은 표만으로 인수를 완료할 수는 없습니다."
      }
    ],
    "ISK_L01_AB_166": [
      {
        "node": "ISK_L01_AB_166",
        "profile": null,
        "speaker": "검수 서기",
        "text": "수레에 실려 온 포장 수입니다. 내용물을 확인한 칸에는 담당자 서명이 있지만, 정작 서명한 사람이 그때 일을 기억하지 못합니다."
      },
      {
        "node": "ISK_L01_AB_167",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그러니 지금 더 내라고 할 수도 없고, 이미 모두 받았다고 끝낼 수도 없어. 상인에게 추가 물량을 요구한 건 보류했어. 먼저 여기 남은 실물을 확인하자."
      },
      {
        "node": "ISK_L01_AB_168",
        "profile": null,
        "speaker": "상인",
        "text": "보류만 길어지면 저도 손해입니다. 제대로 넘겼는데 도둑맞은 사람처럼 상자 뚜껑만 붙잡고 있으니까요."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_169",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그건 알아. 그래서 누구 기억이 더 자신 있는지 뽑는 대신 상자를 보러 온 거야. 다만 내가 세다가 하나 놓치면 지적은 해 줘. 지금까지는 용보다 작은 걸 세는 쪽이 더 익숙하긴 해."
      }
    ],
    "ISK_L01_AB_172": [
      {
        "node": "ISK_L01_AB_172",
        "profile": null,
        "speaker": "운송인",
        "text": "저도 그래서 끈을 잡고 있었습니다. 다시 실으라고 하면 제가 다 옮겨야 하니까요."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_173",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 지금은 그 끈 놓아도 돼. 아무 말 없이 짐 다시 실어 놓고 당신한테 왜 그랬냐고 묻지는 않을게."
      }
    ],
    "ISK_L01_AB_176": [
      {
        "node": "ISK_L01_AB_176",
        "profile": null,
        "speaker": "상인",
        "text": "제가 포장을 맡았습니다. 수레에 싣는 건 함께 했고요. 여기서 내린 과정은 운송인이 봤습니다."
      },
      {
        "node": "ISK_L01_AB_177",
        "profile": null,
        "speaker": "운송인",
        "text": "상자 하나가 천막 쪽으로 내려갔고 빈 채로 돌아왔습니다. 내용물을 꺼내는 손은 수레 너머라 보이지 않았어요."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_178",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "좋아. 바로 그 정도만. 안 보였던 손까지 누구 손이라고 채우면, 나는 그 사람부터 찾아다녀야 하잖아."
      }
    ],
    "ISK_L01_AB_182": [
      {
        "node": "ISK_L01_AB_182",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "적치대 밑은 아직 쓸지 않았어. 짐 옮길 때 걸릴까 봐 치우려던 걸 잠시 멈췄지. 운송인, 마지막으로 상자가 내려갔던 방향을 가리켜 줘."
      },
      {
        "node": "ISK_L01_AB_183",
        "profile": null,
        "speaker": null,
        "text": "천막의 낮은 가장자리 밑에서 쇠고리 한 묶음이 나왔다. 정확히는 새로 꺼낸 것이 아니라, 덮여 있던 포장 천을 걷자 보였다. 옆에는 상자 모서리에서 떨어진 듯한 얇은 조각과 풀린 짐끈이 있었다. 각청은 누구도 곧바로 상자에 되담지 못하게 손을 들어 멈췄다."
      },
      {
        "node": "ISK_L01_AB_184",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그대로 두고 수부터 확인하자. 주인도 같이 봐. 물건이 맞는지 확인받기 전에는 발견했다고 끝낼 수 없어."
      },
      {
        "node": "ISK_L01_AB_185",
        "profile": null,
        "speaker": null,
        "text": "쇠고리는 열둘이었다. 모양과 묶음 방식은 상인이 가져온 나머지 물건과 같았다. 상인이 제작 표식을 짚었고, 운송인이 자신이 묶었던 끈의 두 번 감은 끝을 확인했다. 내가 가져온 나무 조각은 빈 상자의 모서리에 빈틈을 줄이며 맞았다. 그렇다고 이 조각이 누가 언제 물건을 꺼냈는지 말해 주지는 않았다."
      },
      {
        "node": "ISK_L01_AB_186",
        "profile": null,
        "speaker": "상인",
        "text": "제 물건이 맞아요. 봤죠? 여기 있잖습니까. 없어진 게 아니잖아요."
      }
    ],
    "ISK_L01_AB_187": [
      {
        "node": "ISK_L01_AB_187",
        "profile": null,
        "speaker": "검수 서기",
        "text": "실물은 확인됐습니다. 다만 이쪽 적치대로 옮긴 과정은 다시 확인해야 합니다. 장부에는 별도 적치 위치가 안 적혀 있습니다."
      },
      {
        "node": "ISK_L01_AB_188",
        "profile": null,
        "speaker": "상인",
        "text": "또 그 말입니까? 물건이 나왔는데도 제가 뭘 더 증명해야 하죠?"
      }
    ],
    "ISK_L01_AB_191": [
      {
        "node": "ISK_L01_AB_191",
        "profile": null,
        "speaker": null,
        "text": "검수 서기가 종이 한가운데 그 내용을 적었다. 상인은 그 문장을 읽고 나서야 빈 상자를 움켜쥔 손을 풀었다. 여섯 상자라는 말은 잠시 접어 두고, 다섯 상자 속 물건과 적치대의 열두 개를 합쳐 대조했다. 두 번 센 수가 같아졌다고 천막 안의 표정까지 금방 같아지지는 않았다."
      },
      {
        "node": "ISK_L01_AB_192",
        "profile": null,
        "speaker": "운송인",
        "text": "그런데 담당 병사는 분명히 못 받았다고 했습니다. 제 눈앞에서요. 이렇게 가까운 데 둔 걸 모를 수 있습니까?"
      },
      {
        "node": "ISK_L01_AB_193",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 병사는 뚜껑을 열기 전까지 기억하고, 그 다음 구간은 기억하지 못한다고 보고했어. 물건이 여기 있다는 사실과 그 진술을 함께 남길 거야. 어느 한쪽을 없애면 이번 일을 조사할 이유도 없어져."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_194",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그러니까 나무 조각은 상자가 열리고 옮겨진 쪽을 가리키는데, 사람한테 물으면 그 장면이 없는 거네. 물건은 짧은 틈이라고 봐주질 않는구나."
      }
    ],
    "ISK_L01_AB_197": [
      {
        "node": "ISK_L01_AB_197",
        "profile": null,
        "speaker": null,
        "text": "상인은 찾은 물건의 수를 확인한 뒤 임시 보관에 동의했다. 각청은 소유자와 수량을 적고 정산 담당자를 따로 불렀다. 대금 문제는 아직 남았지만, 없는 물건을 다시 내라는 말은 더 나오지 않았다. 나는 바깥의 넓은 길을 보며 오늘은 천장 낮은 곳에 들어갈 일이 더 없기를 바랐다."
      },
      {
        "node": "ISK_L01_AB_198",
        "profile": null,
        "speaker": "상인",
        "text": "받아 놓고 받은 건 아니라니, 제 입장에서는 말장난처럼 들립니다. 물건은 못 가져가고 대금도 못 받는데 서류만 하나 더 받으라는 겁니까?"
      },
      {
        "node": "ISK_L01_AB_199",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "인수 도장은 안 찍어 주고 물건부터 붙잡아 두면 화가 나는 게 맞아. 그래서 임시 보관에 동의하는지 지금 묻는 거야. 네 물건이라는 표시와 수량을 남기고, 정산은 담당자가 답하게 할게. 동의하지 않는다면 물건을 돌려줄 수 있는지도 바로 확인하겠어. 여기서 결제까지 끝났다고 말할 수는 없어."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_200",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "상인 입장에서는 종이 두 장이 식사 두 끼가 되지는 않으니까. 최소한 다음에 누구한테 이걸 보여 주면 되는지는 정해 줘. 한 바퀴 돌고 원래 줄로 돌아오게 하지는 말고."
      }
    ],
    "ISK_L01_AB_201": [
      {
        "node": "ISK_L01_AB_201",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "이 현장 대조는 내가 맡았다고 적을게. 인수 담당자가 확인할 내용은 서기가 가져가고, 답변은 이 외곽 작업대로 돌려보내. 이분이 항구 안을 찾아다니게 하지 마."
      },
      {
        "node": "ISK_L01_AB_202",
        "profile": null,
        "speaker": "검수 서기",
        "text": "물품 위치와 수량 확인, 임시 보관, 최종 인수 여부를 나눠 적겠습니다. 보관 구역을 바꾸기 전에도 주인에게 알리고 확인받겠습니다."
      },
      {
        "node": "ISK_L01_AB_203",
        "profile": null,
        "speaker": "상인",
        "text": "그럼 적치한 물건을 몰래 공사에 써 버리고, 나중에 처음 듣는다고 하는 일은 없어야 합니다."
      },
      {
        "node": "ISK_L01_AB_204",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "내가 보관 표식을 붙일게. 공사 담당이 와도 알아볼 수 있도록 빈 상자 옆에 따로 두자. 누가 가져가려고 하면 내게 먼저 연락하도록 해."
      },
      {
        "node": "ISK_L01_AB_205",
        "profile": null,
        "speaker": null,
        "text": "상인은 종이를 받아 단숨에 서명하지 않았다. 자신이 이해한 내용으로 다시 묻고, 각청은 앞에서 한 설명을 짜증 없이 짧게 반복했다. 비어 있는 의자를 운송인 쪽으로 발끝으로 밀었다. 수레를 끌고 온 사람도 물건을 발견한 뒤부터 계속 서 있었다."
      }
    ],
    "ISK_L01_AB_212": [
      {
        "node": "ISK_L01_AB_212",
        "profile": null,
        "speaker": "상인",
        "text": "그건 제가 적겠습니다. 제 물건인 건 맞으니까요. 그렇다고 인수 완료했다는 말 아래에는 지금 서명하지 않겠습니다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_213",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "바로 그 차이를 남기자는 거야. 나도 남의 물건을 찾아줬다는 기분에 계약까지 끝내 줄 능력은 없어서."
      }
    ],
    "ISK_L01_AB_214": [
      {
        "node": "ISK_L01_AB_214",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "본인이 확인한 사실 옆에만 서명하면 돼. 다른 뜻으로 읽힐 문장은 나눠 쓰자."
      },
      {
        "node": "ISK_L01_AB_215",
        "profile": null,
        "speaker": null,
        "text": "상인은 제작 표식을 다시 한 번 확인하고 종이를 당겨 적었다. 처음부터 각청의 말에 고개를 끄덕인 것은 아니었지만, 이번에는 무엇에 동의하는지 손가락으로 짚을 수 있었다."
      }
    ],
    "ISK_L01_AB_216": [
      {
        "node": "ISK_L01_AB_216",
        "profile": null,
        "speaker": null,
        "text": "확인을 마친 물건에는 별도 보관 표시가 붙었다. 내 가방으로 들어가는 것은 없었다. 나무 조각도 빈 상자 옆에 그대로 남겼다. 증거가 될 것 같다는 이유로 덜컥 가져가면, 다음에 온 사람이 상자에 없는 부분부터 다시 설명해야 했다."
      },
      {
        "node": "ISK_L01_AB_217",
        "profile": null,
        "speaker": "운송인",
        "text": "아까는 솔직히 그 구슬을 꺼내실 줄 알았습니다. 몬드에서 용한테 썼다는 이야기를 들었거든요. 여기 와서 보니 계속 종이랑 상자만 보시네요."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_218",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 이야기도 여기까지 왔어? 구슬이 상자 안에 든 쇠고리 숫자를 알려 줬다면 나도 편했겠지. 그런데 그런 기능은 들어본 적도 없어. 오늘은 내가 직접 세는 편이 확실해."
      }
    ],
    "ISK_L01_AB_219": [
      {
        "node": "ISK_L01_AB_219",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "소문은 벌써 네 손보다 빠르네. 서기, 오늘은 외곽 적치대에서 물건을 찾은 거야. 구슬을 썼다는 이야기가 덧붙지 않게 결과를 직접 읽어 줘."
      },
      {
        "node": "ISK_L01_AB_220",
        "profile": null,
        "speaker": null,
        "text": "각청의 말에 나는 품 안의 주머니를 건드리려던 손을 내렸다. 빈 사당에서 사라진 시체를 찾지 못했던 기억이 머리를 스쳤다. 오늘은 물건을 찾았지만, 그 사실이 과거의 실패를 대신 해결하지는 않았다. 죽었던 드발린이 돌아온 일도, 시뇨라가 잘라 냈던 질문도 상자 사이에서 갑자기 해답을 얻지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_221",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "몬드에서는 있던 게 없어져서 못 찾았는데, 여기는 물건이 있는데 받았던 순간이 없네. 비슷해서 자꾸 같은 쪽을 보게 된다."
      }
    ],
    "ISK_L01_AB_222": [
      {
        "node": "ISK_L01_AB_222",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "몬드의 현장과 닮은 점은 더 찾아봐야겠어. 여기서는 이 상자를 옮겨 둔 사람부터 확인하자. 누가 기억을 지웠는지 묻기 전에, 누가 무엇을 했는지부터 막혀 있으니까."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_223",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알아. 우인단이라고 적어 두고 빈칸을 채우기 시작하면 마지막에는 전부 그쪽 말처럼 보일 테니까. 오늘은 이 상자가 여기 있었다는 것부터 남길게."
      }
    ],
    "ISK_L01_AB_224": [
      {
        "node": "ISK_L01_AB_224",
        "profile": null,
        "speaker": null,
        "text": "각청은 서류의 결론을 소리 내어 읽었다. 실물 수량을 확인했다는 문장 뒤에, 인계한 사람과 정확한 시각은 추가 확인이 필요하다는 문장이 이어졌다. 처음보다 적게 아는 기분은 아니었다. 다만 알게 된 것과 아직 모르는 것이 같은 줄에 눌려 있지 않게 됐다."
      },
      {
        "node": "ISK_L01_AB_225",
        "profile": null,
        "speaker": null,
        "text": "늦은 빛이 수레바퀴 사이로 들어왔다. 항구 안으로 갈 수 없는 상인들이 자기 짐 옆에 앉기 시작했다. 각청은 임시 보관과 관련한 회신이 돌아올 장소를 작업대 옆으로 고정하고, 나에게도 그곳을 알려 주었다. 오늘은 짐이 옮겨질 때 무엇이 달라지는지 볼 수 있는 자리가 다음 대기 장소가 되었다."
      }
    ],
    "ISK_L01_AB_229": [
      {
        "node": "ISK_L01_AB_229",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 표에 네 이름은 안 넣어. 오늘 같이 확인할 일은 끝났으니 서기가 답을 가져오는 동안 쉬어. 자리 옮길 때는 담당관에게 알려 주고. 찾으러 다니는 일까지 새로 만들지는 말자."
      },
      {
        "node": "ISK_L01_AB_230",
        "profile": null,
        "speaker": null,
        "text": "그제야 가방을 내려놓았다. 목책 옆 게시판에는 송신의례 안내가 붙어 있었다. 기다리는 사람들 중에는 그것을 보러 왔다는 이들도 있었다. 상인은 물건이 막힌 것과 행사에 가는 길까지 막힌 것이 같은 문제인지 묻고 있었다."
      },
      {
        "node": "ISK_L01_AB_231",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "행사날에는 옥경대로만 향하는 별도 길을 열 예정이야. 시내와 물자 인계 구역을 거치지 않도록 준비했어. 너도 날이 되면 저 바깥 안내 지점으로 와. 지금부터 그 길을 쓰거나 항구 안에 드나들 수 있다는 뜻은 아니야."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_232",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "옥경대에만 갈 수 있고, 중간에 시장으로 빠지는 길은 없다. 맞지? 도시를 처음 보는데 허용된 길부터 외우게 되네."
      }
    ],
    "ISK_L01_AB_233": [
      {
        "node": "ISK_L01_AB_233",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "막힌 길을 하나씩 시험하는 것보다는 빠르잖아. 길을 쓸 수 있게 되는 때도 따로 알릴게. 지금은 밖에서 기다려 줘."
      },
      {
        "node": "R39_PROSE_ISK_L01_AB_234",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알았어. 대신 소식이 바뀌면 서류만 먼저 보내지 말고, 내가 알아들을 말도 같이 보내 줘. 오늘처럼 도착한 뒤에 뜻이 달라지는 종이는 한 장이면 충분해."
      }
    ],
    "ISK_L01_AB_235": [
      {
        "node": "ISK_L01_AB_235",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 약속은 지킬게. 네가 다시 접수대에서 설명을 요구하기 전에 알려 주지."
      },
      {
        "node": "ISK_L01_AB_236",
        "profile": null,
        "speaker": null,
        "text": "각청은 손에 든 문서 중 현장 대조에 필요한 쪽을 작업대에 남겼다. 안으로 가져가 확인받아야 할 묶음만 따로 들었다. 떠나기 전 그녀는 수레의 쐐기와 분리해 둔 쇠고리, 쉬고 있는 운송인을 차례로 확인했다. 닫힌 도시 대신 상자 옆의 작은 나무 조각을 보았다. 이미 일어난 동작은 사람의 기억 밖에서도 흔적을 남기고 있었다. 그 흔적을 따라갈 다음 문은 아직 열리지 않았다."
      }
    ],
    "ISK_L01_B_009": [
      {
        "node": "ISK_L01_B_009",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "네 생활까지 구슬에 묶어 둘 필요는 없지. 나는 아직 이것을 설명하지 못했고, 기다린다고 언제 답을 낼지도 몰라. 그러니 네가 하려던 일은 계속하는 편이 좋아."
      },
      {
        "node": "ISK_L01_B_010",
        "profile": null,
        "speaker": null,
        "text": "알베도는 더 보겠다고 손을 내밀지 않았다. 그게 조금 어색했다. 물건의 정체를 아는 사람이 나타나 다음 일을 정해 주기만 기다렸는데, 맞은편 사람은 모르는 부분을 남겨 둔 채 내 내일을 물었다. 천의 구겨진 모서리를 폈다."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_011",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 말은 좋네. 대신 나중에 대단한 게 밝혀지면 내 이름은 빼지 마. 내가 들고 다닌 날까지 네 연구 시간으로 계산하면 항의할 거야."
      }
    ],
    "ISK_L01_B_012": [
      {
        "node": "ISK_L01_B_012",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "네 관찰이 들어가면 그 사실을 적어야지. 다만 주머니를 확인하느라 깬 시간은 연구 시간보다는 네 수면을 방해한 시간에 가깝겠군."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_013",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그걸 바로잡으니까 내가 갑자기 손해 본 사람처럼 되잖아. 됐고, 다른 데서 알아볼 방법은 있어? 물건이 대답할 때까지 위험한 곳에 들이밀자는 계획만 아니면."
      }
    ],
    "ISK_L01_B_014": [
      {
        "node": "ISK_L01_B_014",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "리월이라면 다양한 물건과 가공법을 비교할 기회는 있을 거야. 사람이 많이 오가는 곳이니까. 하지만 누가 답을 안다는 단서는 없어. 구슬 때문에만 떠나면 아무것도 알아내지 못했을 때 실망이 크겠지."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_015",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 내 밥벌이도 좀 알아볼까. 여기서 이름이 알려지는 건 고마운데, 누가 반갑게 손 흔들면 부탁할 일이 있나 먼저 보게 돼. 내가 사람이 삭막해진 건가."
      }
    ],
    "ISK_L01_B_016": [
      {
        "node": "ISK_L01_B_016",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "네 시간을 어떻게 쓸지 생각하기 시작한 것 같아. 리월이 궁금하다면 가 볼 수 있지. 다만 낯선 곳이라고 부탁이 없어지는 건 아닐 거야. 맡을 일을 네가 정하는 연습은 어디서든 필요하고."
      },
      {
        "node": "ISK_L01_B_017",
        "profile": null,
        "speaker": null,
        "text": "가져온 천으로 구슬을 싸서 같은 주머니에 넣었다. 정체도 보관 방법도 갑자기 달라지지는 않았다. 다만 이것을 지녔다는 이유로 하루 일정을 모두 내줘야 하는 것은 아니라는 생각이 들었다. 옆을 지나가는 장바구니를 다시 보다가 길드 안내판 쪽으로 고개를 돌리고 자리에서 일어났다."
      },
      {
        "node": "ISK_L01_B_018",
        "profile": "PROFILE_MOND_KATHERYNE",
        "speaker": "캐서린",
        "text": "별과 심연을 향해! 리월 쪽으로 갈 방법을 찾는 거야? 마침 항구로 돌아가는 물자 행렬에서 육로 동행자를 받고 있어. 전달 확인을 거들 기회가 있는지는 담당자에게 물어볼 수 있고."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_019",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이 안내에는 용이 나온다는 작은 글씨 없지? 글씨가 작아서 못 봤다는 게 동의했다는 뜻은 아니거든."
      }
    ],
    "ISK_L01_B_020": [
      {
        "node": "ISK_L01_B_020",
        "profile": "PROFILE_MOND_KATHERYNE",
        "speaker": "캐서린",
        "text": "새 토벌 의뢰는 아니야. 함께 이동하는 구간과 도울 수 있는 일을 먼저 얘기하면 돼. 보수 있는 일을 맡게 된다면 그때 업무와 보수를 정해서 별도로 접수하고."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_021",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "좋네. 같이 걸었다고 갑자기 짐 전부 내 책임이 되지만 않으면. 나는 지금 배 한 척까지 살 형편은 아니라서."
      }
    ],
    "ISK_L01_B_022": [
      {
        "node": "ISK_L01_B_022",
        "profile": "PROFILE_MOND_KATHERYNE",
        "speaker": "캐서린",
        "text": "그럴 계약은 없어. 이미 받은 설산 의뢰 보상에서 돌아올 비용도 남겨 두고. 도착해서 마음이 달라지면 계획을 바꿀 수 있어야 하니까."
      },
      {
        "node": "ISK_L01_B_023",
        "profile": null,
        "speaker": null,
        "text": "알베도는 내가 안내문의 출발 위치를 다시 읽을 때까지 기다렸다. 항구 근처에서는 길 사정에 따라 외곽에서 인계할 수도 있다는 문장이 붙어 있었다. 이번에는 나도 작은 글씨까지 읽었다."
      },
      {
        "node": "ISK_L01_B_024",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "일을 얻으려고 구슬부터 보여 줄 필요는 없어. 네가 할 수 있는 일로 얘기해. 모르면 다시 묻는 것도 물건을 맡을 때는 필요한 능력이니까."
      }
    ],
    "ISK_L01_B_033": [
      {
        "node": "ISK_L01_B_033",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "얼마나 길어질지는 조금 걱정되는군. 그래도 들어 볼게. 몸조심해."
      },
      {
        "node": "ISK_L01_B_034",
        "profile": null,
        "speaker": null,
        "text": "안내문에 표시된 집결지에서 행렬 담당자를 찾았다. 수레 곁에서 사람을 확인하던 담당자가 내 손에 들린 안내문을 보고 기다렸다."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_035",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "리월행 행렬에 같이 가려고요. 물자 확인을 조금 거들 수는 있는데, 정식 인계 담당을 맡기로 한 건 아니에요. 어디서 합류해서 어느 구간까지 함께 움직이면 되죠?"
      }
    ],
    "ISK_L01_B_039": [
      {
        "node": "ISK_L01_B_039",
        "profile": null,
        "speaker": "행렬 담당자",
        "text": "여기서 선장님께 확인을 받고 갑니다. 따로 살펴보시던 육로 운송분도 함께 항구로 돌아가니까요. 저기 계시네요."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_040",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "선장님이 왜 여기 있어요? 내가 피곤해서 바다를 못 보고 있는 건 아니죠?"
      }
    ],
    "ISK_L01_B_041": [
      {
        "node": "ISK_L01_B_041",
        "profile": null,
        "speaker": "행렬 담당자",
        "text": "배에서 내린 뒤 움직이는 물건도 선장님 일이니까요. 아, 수레 바퀴부터 보시네. 잠시 멈춰 주십시오."
      },
      {
        "node": "ISK_L01_B_042",
        "profile": null,
        "speaker": null,
        "text": "붉은 옷의 여자가 기울어진 수레 쪽으로 걸어왔다. 그녀가 멈추라는 손짓을 하는 순간, 갈대밭에서 날아온 돌이 수레 덮개를 찢었다. 길 안내를 하던 낯선 사내가 칼을 꺼냈다. 뒤에서도 둘이 길을 막았다. 행렬 담당자가 내 등을 떠밀어 수레 안쪽에 숨겼다."
      }
    ],
    "ISK_L01_B_043": [
      {
        "node": "ISK_L01_B_043",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "짐보다 사람부터 세어. 다들 있지? 바퀴는 받쳐 두고, 끊어진 끈은 새로 묶어. 이쪽은 처음 보는 얼굴인데, 우리 행렬하고 같이 온 거야?"
      },
      {
        "node": "R39_PROSE_ISK_L01_B_044",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "네. 도착하면 일자리부터 찾으려고 했는데 방금 목숨부터 찾았네요. 고마워요. 가방 들고 싸우려던 건 못 본 걸로 해 줘요."
      }
    ],
    "ISK_L01_B_051": [
      {
        "node": "ISK_L01_B_051",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "일할 곳을 찾는다는 건 알겠고, 항구에 아는 사람은 있어? 누구를 소개하느냐에 따라 일이 달라져서 말이야."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_052",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그게 문제죠. 따로 알아보고 싶은 물건도 있는데, 아는 사람은 없어요. 일자리에 나를 소개하면서 그 물건까지 세트로 넘기지만 않으면 좋겠는데."
      }
    ],
    "ISK_L01_B_053": [
      {
        "node": "ISK_L01_B_053",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "네가 안 판다는데 누가 세트로 묶어? 보여 달라는 말도 안 했잖아. 지금은 어디서 쉴지, 뭘 할 수 있는지부터 생각해. 내 이름 붙여서 아무 데나 들여보내 달라는 부탁은 어렵고."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_054",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "아직 그런 좋은 부탁은 생각 못 했는데 먼저 막으시네. 그냥 구경하고 일거리부터 물어볼게요. 위험한 거면 설명을 듣고요."
      }
    ],
    "ISK_L01_B_055": [
      {
        "node": "ISK_L01_B_055",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "좋아. 설명을 듣고도 싫으면 싫다고 해. 먼 길 한번 같이 걸었다고 평생 같은 배를 탈 필요는 없으니까."
      },
      {
        "node": "ISK_L01_B_056",
        "profile": null,
        "speaker": null,
        "text": "한동안 더 걸은 뒤 행렬은 물길 옆에서 쉬었다. 수레 그늘에 앉았다가 그곳에 짐을 내려야 한다는 말에 도로 일어났다. 북두가 옆의 넓적한 돌을 가리켰다. 내가 그 자리에도 물건이 올 예정인지 묻자 선장이 웃음을 터뜨렸다."
      },
      {
        "node": "ISK_L01_B_057",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그 바위까지 쌓으면 내가 내려놓으라고 할 거야. 앉아. 쉬면서 자리 눈치만 보면 다리가 언제 쉬겠어? 물은 챙긴 게 남았나?"
      },
      {
        "node": "R39_PROSE_ISK_L01_B_058",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "남았어요. 그렇게 물으니까 내가 꽤 준비 잘한 사람 같네. 아까는 가방에서 찾는 동안 없는 줄 알고 혼자 심각했거든요."
      }
    ],
    "ISK_L01_B_059": [
      {
        "node": "ISK_L01_B_059",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그럼 다음에는 쉽게 찾을 곳에 넣어 둬. 파도가 치면 가방 바닥까지 뒤질 여유가 없지. 육지에서도 급할 때 필요한 건 손 닿는 곳에 있어야 하고."
      },
      {
        "node": "ISK_L01_B_060",
        "profile": null,
        "speaker": null,
        "text": "물통을 다시 넣으며 구슬이 든 주머니와 다른 짐 사이를 벌렸다. 북두는 안을 들여다보지 않고 선원에게 출발 준비를 물었다. 누구도 그 주머니 때문에 길을 바꾸자고 하지 않았다. 자기가 묻고 싶은 일을 다시 꺼낼 수 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_061",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "전달 확인을 돕는다면 뭘 보면 돼요? 숫자만 세면 될 줄 알았는데, 같은 상자도 놓인 자리에 따라 다르다면서요."
      }
    ],
    "ISK_L01_B_066": [
      {
        "node": "ISK_L01_B_066",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "일반 통행은 중지됐습니다. 운송 물품은 확인선 밖에서 안내를 기다려 주십시오. 수령 담당이 서명하기 전에는 인계 완료가 아닙니다. 확인표부터 보여 주시겠습니까?"
      },
      {
        "node": "ISK_L01_B_067",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "나는 남십자의 북두야. 육로로 돌아온 물건까지 함께 확인하기로 했어. 안으로 못 들어가면 여기서 어디까지 할 수 있나? 우리 담당자는 이쪽이고."
      },
      {
        "node": "ISK_L01_B_068",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "우선 수량을 확인하겠습니다. 작은 포장 두 개를 저 비어 있는 받침에 옮겨 주십시오. 큰 상자는 대기시키겠습니다."
      },
      {
        "node": "ISK_L01_B_069",
        "profile": null,
        "speaker": null,
        "text": "선원이 포장 둘을 내려놓았다. 병사는 묶인 끈을 보고 확인표의 한 칸을 가리켰다. 그때 뒤쪽에서 다른 수레를 멈추라는 고함이 들렸다. 병사가 고개를 돌렸다가 돌아왔고, 선원이 다음 짐을 물었을 때 대답이 어긋났다."
      },
      {
        "node": "ISK_L01_B_070",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "작은 포장부터 옮겨 주십시오. 저 받침이 비었으니 거기에… 잠깐, 누가 벌써 내려놓았습니까? 허가 없이 물건을 움직이면 곤란합니다."
      }
    ],
    "ISK_L01_B_071": [
      {
        "node": "ISK_L01_B_071",
        "profile": null,
        "speaker": "남십자 선원",
        "text": "방금 직접 옮기라고 하셨잖습니까. 그 자리도 손으로 가리키셨고요. 지금 들고 계신 종이의 그 칸을 같이 봤습니다."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_072",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나도 옆에서 봤어요. 마음대로 옮긴 건 아니에요. 그렇다고 다 받았다는 얘기도 안 했고. 우선 다음 짐은 그대로 두면 안 될까요? 더 옮기면 나까지 헷갈리겠는데."
      }
    ],
    "ISK_L01_B_073": [
      {
        "node": "ISK_L01_B_073",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그대로 멈춰. 아무도 더 손대지 마. 자네, 우리가 벌써 넘겼다고 우길 생각은 없어. 다만 내 선원이 시킨 적 없는 일을 멋대로 했다고 할 수도 없지. 무슨 부분이 다른지 보자."
      },
      {
        "node": "ISK_L01_B_074",
        "profile": null,
        "speaker": null,
        "text": "병사의 얼굴에는 분노보다 당혹감이 먼저 떠올랐다. 나를 알아보지 못하거나 자기 근무지를 잊은 것은 아니었다. 다만 조금 전의 자기 손짓을 두 사람이 똑같이 이야기하는 이유를 설명하지 못했다. 뒤쪽에서 누군가 혀를 찼다. 병사가 입을 열었다가 다시 종이를 내려다보았다."
      },
      {
        "node": "ISK_L01_B_075",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "저는 아직 그 지시를 하지 않았다고 기억합니다. 큰 상자가 먼저 들어오려고 해서… 아니, 그건 언제였지. 잠시 기다려 주십시오. 확인을 다시 받아야 합니다."
      }
    ],
    "ISK_L01_B_079": [
      {
        "node": "ISK_L01_B_079",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 짐은 잠시 그대로 둬. 선장, 인계를 끝냈다는 거야, 확인하는 중에 말이 달라졌다는 거야?"
      },
      {
        "node": "ISK_L01_B_080",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "두 번째야. 이쪽도 처음부터 봤어. 우리 짐 책임을 저 병사한테 떠넘길 생각은 없으니 무슨 일이 났는지부터 들어 봐."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_081",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "포장 둘을 옮기라는 말을 듣고 옮기는 것도 봤어요. 병사분이 확인표를 보더니 다시 옮기라고 했고요. 내가 못 본 일이 있을 수는 있는데, 물건이 수레에 계속 있었던 건 아니에요."
      }
    ],
    "ISK_L01_B_082": [
      {
        "node": "ISK_L01_B_082",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "알겠어. 나는 리월 칠성의 각청이야. 지금 이 구역 통행을 조정하고 있어. 너는 선장의 정식 인계 담당이야?"
      },
      {
        "node": "R39_PROSE_ISK_L01_B_083",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "함께 길을 온 모험가예요. 본 일은 말하겠는데 짐값 전체를 책임지는 소개라면 고치고 싶네요. 아직 취업도 못 했거든요."
      }
    ],
    "ISK_L01_B_093": [
      {
        "node": "ISK_L01_B_093",
        "profile": null,
        "speaker": null,
        "text": "교대 병사가 확인대를 넘겨받았다. 먼저 있던 병사는 쉬는 자리로 물러나면서도 줄 쪽을 여러 번 돌아봤다. 북두는 수레 손잡이를 잡아 길을 넓혔다. 내가 손을 보태려 하자 그녀는 바퀴가 아니라 사람들이 다가오지 않는 쪽을 봐 달라고 했다."
      },
      {
        "node": "ISK_L01_B_094",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "짐은 바깥에 모아 둘게. 담당자끼리 지금 보관 상태를 맞추자. 그보다 저 사람은 앉을 자리라도 있나? 서서 쉬라는 건 쉬라는 말이 아니잖아."
      },
      {
        "node": "ISK_L01_B_095",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그늘 쪽에 자리를 마련하고 있어. 담당도 붙일 거야. 참관객 줄은 여기와 나눠야 하니, 선장 쪽 사람들에게도 행사 안내를 확인하라고 해 줘."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_096",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "길가에 송신의례라고 붙은 그거예요? 항구가 닫혔는데 행사 길은 열리면, 다들 갑자기 의례에 관심이 많아질 것 같은데."
      }
    ],
    "ISK_L01_B_097": [
      {
        "node": "ISK_L01_B_097",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "지금 열리는 길이 아니야. 의례가 있는 날 옥경대로만 가는 별도 통로를 준비했어. 그날 안내와 통제를 따라야 하고, 항구를 자유롭게 돌아다니는 허가는 아니야. 지금은 밖에서 기다려."
      },
      {
        "node": "ISK_L01_B_098",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "들었지? 우리 상자에 참관객 이름표 붙일 생각도 접어 둬. 물건까지 구경하러 왔다고 하면 내 말이 길어지니까."
      },
      {
        "node": "ISK_L01_B_099",
        "profile": null,
        "speaker": null,
        "text": "병사가 앉은 쪽에서 다시 낮은 수군거림이 들렸다. 행렬 쪽에는 아직 자리를 잡지 못한 짐이 남아 있었다. 어느 쪽도 나를 고용하지 않았고 명령하지도 않았다. 먼저 자기 시간을 어디에 쓸지 골랐다."
      }
    ],
    "ISK_L01_B_102": [
      {
        "node": "ISK_L01_B_102",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "좋아. 난 짐 맡길 사람부터 정해 놓고 올게. 저 사람이 나한테 설명을 못 끝냈다고 생각하는 모양이라, 나도 잠깐 얼굴은 봐야겠어. 네 자리는 하나 챙겨 두고."
      },
      {
        "node": "ISK_L01_B_103",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "교대 담당에게 말해 둘게. 상태가 나빠지면 바로 불러. 네가 해결할 때까지 붙잡고 있어야 한다는 뜻은 아니야."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_104",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나도 그런 끈기는 없어요. 잠깐 쉰다는데 옆에서 답을 받아내면 그건 쉬는 게 아니죠. 의자만 하나 부탁해요. 같이 서서 위로하다가 내가 먼저 주저앉으면 모양 빠지니까."
      }
    ],
    "ISK_L01_B_105": [
      {
        "node": "ISK_L01_B_105",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "교대 담당에게 하나 부탁해 둘게. 통로 쪽은 비워 두고 앉아."
      },
      {
        "node": "ISK_L01_B_106",
        "profile": null,
        "speaker": null,
        "text": "병사의 정면을 피해서 옆에 앉았다. 병사는 쉬라는 지시를 받았으면서도 두 발을 가지런히 모으고 허리를 세웠다. 확인대에서 누군가 이름을 부르는 소리가 날 때마다 어깨가 움직였다. 내가 가방을 무릎에서 내려놓자 그도 뒤늦게 손에 쥔 장갑을 폈다."
      },
      {
        "node": "ISK_L01_B_107",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "기다리게 해서 죄송합니다. 저는 괜찮습니다. 다시 가서 설명을 들으면 일을 이어 갈 수 있을 것 같은데… 다들 바쁜데 저만 이렇게 있네요."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_108",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나는 원래 항구에 못 들어가서 기다리던 사람이에요. 병사님이 내 오후를 다 망쳤다는 표정은 안 해도 돼요. 이미 길에서 다리가 먼저 망했거든요."
      }
    ],
    "ISK_L01_B_109": [
      {
        "node": "ISK_L01_B_109",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "그렇게 말씀하시면 제가 웃어도 되는지 모르겠습니다."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_110",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "웃으면 되죠. 내 다리 얘긴데 내가 허락할게요. 그 대신 병사님이 잠깐 쉰다고 나한테 허락받지는 마세요. 나는 그걸 결정할 사람도 아니고."
      }
    ],
    "ISK_L01_B_111": [
      {
        "node": "ISK_L01_B_111",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "제가 옆자리까지 근무하는 자리처럼 만들었네요. 다리가 아프시면 조금 펴셔도 됩니다."
      },
      {
        "node": "ISK_L01_B_112",
        "profile": null,
        "speaker": null,
        "text": "병사는 입가만 조금 움직였다. 길 쪽에서 짐을 내려놓던 인부 둘이 휴식 자리를 바라봤다. 한 사람은 오늘 들어가기는 틀렸다는 듯 양손을 털었고, 다른 사람은 기억이 안 난다는 말로 일을 빼는 것 아니냐고 중얼거렸다. 아주 큰 목소리는 아니었지만 가까운 사람에게는 들렸다. 병사의 손이 다시 장갑을 구겼다."
      },
      {
        "node": "ISK_L01_B_113",
        "profile": null,
        "speaker": "상인",
        "text": "괜한 말을 하려는 건 아닙니다만, 우리도 오늘 짐을 못 넘기면 손해입니다. 적어도 언제까지 쉬실 건지는 알려 주셔야 하지 않겠습니까?"
      }
    ],
    "ISK_L01_B_119": [
      {
        "node": "ISK_L01_B_119",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "대기 안내는 저쪽에서 확인하시면 됩니다. 우리도 짐 못 넘기고 있어요. 저 사람 세워 놓고 혼내면 줄이 줄어드는 건 아니니, 통로도 조금 비켜 주시고."
      },
      {
        "node": "ISK_L01_B_120",
        "profile": null,
        "speaker": null,
        "text": "돌아온 북두가 병사 곁에 앉으려던 순간 초소 뒤에서 연기가 났다. 바람에 기울어진 화로가 대기 천막의 아랫단을 그슬리고 있었다. 줄에 선 사람들이 한꺼번에 몸을 돌리면서 출입구가 막혔다. 병사는 벌떡 일어나려고 했지만 무릎이 풀렸다. 대신 그늘 뒤에 물독이 있다고 손으로 짚었다."
      }
    ],
    "ISK_L01_B_121": [
      {
        "node": "ISK_L01_B_121",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "우리 물건은 담당자를 붙였어. 선원도 자기 잘못으로 남은 건 아니라는 얘기 들었고. 그러니 지금 여기서 내 얼굴 보고 또 사과할 필요는 없어."
      },
      {
        "node": "ISK_L01_B_122",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "기다리시면 손해가 생기실 텐데요."
      },
      {
        "node": "ISK_L01_B_123",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "생기지. 하지만 손해가 생긴다고 네가 모르는 걸 안다고 해 줄 수는 없잖아. 따질 곳에는 내가 따질 테니 그건 맡겨 둬. 자네는 집에 늦는다고 알려야 할 사람 없나?"
      },
      {
        "node": "ISK_L01_B_124",
        "profile": null,
        "speaker": null,
        "text": "병사는 바로 대답하지 못했다. 집에서는 원래 교대 무렵 돌아오는 것으로 알고 있다고 했다. 연락을 보내면 좋겠다는 생각은 했지만, 무슨 일이 생겼다고 말해야 하는지를 정하지 못한 모양이었다."
      },
      {
        "node": "ISK_L01_B_125",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "기억이 없어졌다고 전하면 집에서 놀라실 겁니다. 그렇다고 아무 일도 없다고 하면 나중에 다른 사람에게 듣고 더 걱정하실 테고요. 제가 직접 설명할 수 있을 때까지 기다려야 할지…"
      }
    ],
    "ISK_L01_B_127": [
      {
        "node": "ISK_L01_B_127",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그래. 뭐라고 전할지는 자네가 정해. 동료를 통해 연락할 수 있는지 물어보고. 우리가 보고 들은 걸 멋대로 집에 다 알리지는 않을 테니까."
      },
      {
        "node": "ISK_L01_B_128",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "귀가가 늦어지고, 상태를 확인하는 동안 동료와 함께 있다고 전하고 싶습니다. 숨길 생각은 없습니다. 다만 먼저 소문으로 들으시지는 않았으면 합니다."
      }
    ],
    "ISK_L01_B_134": [
      {
        "node": "ISK_L01_B_134",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그렇지. 나도 배에서 위험할 때는 사람을 끌어당기지만, 안전한 데 앉힌 뒤까지 어디를 보고 무슨 말을 하라고 정하진 않아. 스스로 일어날 힘까지 빼앗을 필요는 없으니까."
      },
      {
        "node": "ISK_L01_B_135",
        "profile": null,
        "speaker": null,
        "text": "주머니 위에 얹었던 손을 무릎으로 내렸다. 병사는 두 사람의 대화에 끼어들지 않았지만 조금 뒤 장갑을 가지런히 접어 옆에 놓았다. 확인대에서 소리가 났을 때 이번에는 바로 일어서지 않았다. 쉬어도 된다는 말을 들어서가 아니라, 돌아갈 때가 되면 담당자가 부른다는 설명을 스스로 받아들인 모양이었다."
      },
      {
        "node": "ISK_L01_B_136",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "조금 더 앉아 있겠습니다. 다만 두 분도 저 때문에 계속 계실 필요는 없습니다. 저는 동료가 여기 있다는 걸 아니까요."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_137",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 서로 붙잡고 있지는 않는 걸로 해요. 나는 다리 좀 더 쉬고 갈게요. 도움 준 시간으로 계산하면 뿌듯하긴 한데, 솔직히 의자가 마음에 들어서."
      }
    ],
    "ISK_L01_B_138": [
      {
        "node": "ISK_L01_B_138",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그 말은 일어날 때도 기억해. 편한 의자라고 함대까지 가지고 오면 내가 돌려주러 보내야 하니까."
      },
      {
        "node": "ISK_L01_B_139",
        "profile": null,
        "speaker": null,
        "text": "각청은 통로를 점검하다가 세 사람이 앉아 있는 것을 보고 속도를 줄였다. 병사에게 빠진 기억을 떠올리라고 재촉하는 대신, 그 곁에서 도울 사람이 있는지 확인했다. 북두는 교대 담당이 다녀갔다고 알렸고, 병사는 가족에게 전할 말을 부탁한 상태라고 직접 설명했다."
      },
      {
        "node": "ISK_L01_B_140",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "알겠어. 그 연락은 담당에게 다시 확인할게. 통행은 아직 막혀 있어. 자리를 옮기면 바깥 대기 구역을 이용해. 옥경대의 행사 통로는 송신의례 당일 안내를 따르고. 오늘 그 길로 들어갈 수 있는 건 아니야."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_141",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "들었어요. 오늘 안으로 들어갈 자격을 얻으려고 앉아 있는 건 아니니까 안심해요. 여기 앉은 값을 따지기 시작하면 의자 주인부터 불러야 하잖아요."
      }
    ],
    "ISK_L01_B_142": [
      {
        "node": "ISK_L01_B_142",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "됐다. 나도 우리 사람들한테 네가 여기 있다고 알려 둘게. 나중에 일자리 얘길 하더라도 오늘 사람 곁에 남은 시간을 입사 시험으로 세지는 않을 거야."
      },
      {
        "node": "ISK_L01_B_143",
        "profile": null,
        "speaker": null,
        "text": "북두는 선원들이 기다리는 쪽으로 돌아갔다. 항구는 열리지 않았고 병사의 빠진 기억도 돌아오지 않았다. 옆에 앉은 사람이 다음 말을 고를 때까지 기다렸다. 오늘은 무엇을 증명해 내지 않아도 자기 자리에 잠깐 머물 수 있었다. 수정구슬은 주머니에 그대로 있었고, 그 침묵을 깨 보려는 사람도 없었다."
      }
    ],
    "ISK_L01_B_145": [
      {
        "node": "ISK_L01_B_145",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "좋아. 우리 담당자는 전체 짐을 보고, 넌 아까 포장 둘이 어디 있었는지만 같이 확인해. 다 옮길 때까지 온종일 서 있으라는 뜻은 아니고."
      },
      {
        "node": "ISK_L01_B_146",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "교대 담당과 확인하고 옮겨 줘. 인수는 끝나지 않았으니 보관은 행렬 쪽에서 계속 맡는 걸로 맞춰야 해. 저 돌담 앞 표시까지 바깥 대기 공간으로 쓸 수 있어."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_147",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알겠어요. 그런데 말하다 보니 벌써 내가 들어 나르는 사람처럼 됐는데, 저기 훨씬 튼튼한 분들이 있거든요. 나는 어디서 어디로 가는지 보는 쪽으로 쓸게요."
      }
    ],
    "ISK_L01_B_148": [
      {
        "node": "ISK_L01_B_148",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "네 허리를 내 짐보다 먼저 시험할 생각은 없다. 대신 보는 동안 누가 말을 걸어도 물건에서 눈 떼지 마. 힘쓰는 일 아니면 쉬운 일인 건 아니니까."
      },
      {
        "node": "ISK_L01_B_149",
        "profile": null,
        "speaker": null,
        "text": "옮길 포장은 둘이었다. 하나는 매듭이 가운데에서 비켜나 있었고, 다른 하나는 접힌 천 끝이 길게 나왔다. 받침을 바꾸려고 조금 움직이자 둘 사이에 끼인 짐끈이 팽팽해졌다. 첫 포장만 밀었는데 둘째까지 기울었다. 담당자가 뒤로 물러나다 수레의 퇴로를 막았다. 내 쪽으로 넘어오는 모서리가 생각보다 컸다."
      }
    ],
    "ISK_L01_B_150": [
      {
        "node": "ISK_L01_B_150",
        "profile": null,
        "speaker": "남십자 선원",
        "text": "옆에 매듭이 몰린 게 먼저 내린 쪽이야. 무게가 한쪽으로 쏠려서 밑에 놓았거든. 돌아갈 때도 그 순서로 올릴게."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_151",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그러면 나한테 다 됐다고 할 때까지 기다려 줘요. 내가 뒤에서 다른 상자 세느라 못 봤는데도 고개만 끄덕이는 사람이 되고 싶지는 않아서."
      }
    ],
    "ISK_L01_B_152": [
      {
        "node": "ISK_L01_B_152",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "들었지? 움직이기 전에 먼저 알려. 너도 무슨 일이 생기면 못 봤다고 바로 말하고. 모르는 걸 아는 척하면 눈 하나 더 붙인 의미가 없어."
      },
      {
        "node": "ISK_L01_B_153",
        "profile": null,
        "speaker": null,
        "text": "상인 하나가 대기 공간을 둘러보다 돌담 쪽의 그늘을 가리켰다. 물건만 세워 두고 안으로 연락할 사람부터 보내자는 말이었다. 지금은 사람도 통과할 수 없다는 설명을 듣자, 그는 최소한 다른 줄에라도 누군가 세워 두자고 제안했다. 조금만 자리가 나면 놓치지 않으려는 모양이었다."
      },
      {
        "node": "ISK_L01_B_154",
        "profile": null,
        "speaker": "상인",
        "text": "사람 손이 부족하니 이분이 저쪽 줄을 봐 주시면 되겠네요. 여기 짐은 다들 보고 있고, 돌아와서 어디가 빠른지만 알려 주셔도 되잖습니까."
      }
    ],
    "ISK_L01_B_160": [
      {
        "node": "ISK_L01_B_160",
        "profile": null,
        "speaker": null,
        "text": "북두는 상인에게 다음 운송을 묻고, 선원에게 바깥에서 전할 수 있는 연락을 확인하게 했다. 조급해진 사람을 비웃지는 않았다. 사람이 부족하다는 말만 되풀이하지 않고 지금 필요한 일을 나눴다."
      },
      {
        "node": "ISK_L01_B_161",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "지금 급하다고 각자 흩어지면 돌아왔을 때 서로부터 찾아야 해. 담당자는 연락할 곳을 확인하고, 선원 둘은 짐을 옮겨. 나머지는 물 마시고 기다려. 전부 서서 내 눈치 볼 필요는 없어."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_162",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나는 보는 동안 말 걸려도 안 가는 사람이고요. 그럼 나름 중요한 자리네. 어깨 펴도 돼요? 지금까지 너무 싸게 소개하고 다녔나."
      }
    ],
    "ISK_L01_B_169": [
      {
        "node": "ISK_L01_B_169",
        "profile": null,
        "speaker": null,
        "text": "선원 하나가 수레 밑 그늘에 앉으려다 북두의 부름에 멈췄다. 바퀴를 고정해도 짐이 내려앉을 수 있었다. 북두는 사람들을 빈 공간으로 옮기고 그늘을 만들 천을 찾아보게 했다. 짐이 안전해졌다고 일이 끝난 것은 아니었다."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_170",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "아까 바위에 앉을 자리 보장해 주셨는데, 여기에도 그런 자리 있나요? 그늘 따라 옮겨 다니다가 수레 취급받고 싶진 않은데."
      }
    ],
    "ISK_L01_B_171": [
      {
        "node": "ISK_L01_B_171",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "저쪽이면 돼. 사람 다닐 틈은 비워 두고. 좋은 자리라고 다른 사람 가방 밀어내진 말고."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_172",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "안 밀어요. 옆 사람한테 자리 있냐고 묻는 솜씨는 있거든요. 이쯤 되면 이력에 길 찾기보다 자리 찾기부터 넣어야겠네."
      }
    ],
    "ISK_L01_B_173": [
      {
        "node": "ISK_L01_B_173",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그 솜씨로 앉았으면 옆 사람도 자리 좀 내줘. 오늘은 다들 사정이 비슷하니까."
      },
      {
        "node": "ISK_L01_B_174",
        "profile": null,
        "speaker": null,
        "text": "앉은 뒤 가방을 다리 쪽으로 당겼다. 남십자 선원이 그 옆에 몸을 낮췄다. 멀리 보이는 항구를 보며 내가 한숨을 내쉬자 선원도 따라 웃었다. 북두는 그들 앞에 서서 항구가 안 보이는 편이 쉬기 좋으냐고 물었다."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_175",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "안 보이면 더 억울하죠. 여기까지 와서 뭐가 있는지도 못 본 거잖아요. 그렇다고 좋은 경험이라고만 하면 내가 불평할 자리도 없어지고. 경험은 좋은데 다리는 아프고 계획도 틀어졌어요."
      }
    ],
    "ISK_L01_B_176": [
      {
        "node": "ISK_L01_B_176",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그럼 그렇게 말하고 쉬어. 불평한다고 짐이 사라지는 건 아니니 들어 줄 수는 있지. 내가 선장이라고 네 기분까지 전부 좋게 만들 재주는 없다."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_177",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 말이 제일 마음 편하네요. 나중에 몬드에 편지 쓰면 선장도 길 막혀서 수레 옆에 앉았다고 써도 돼요? 내가 혼자 바보같이 기다린 건 아니었다고 하게."
      }
    ],
    "ISK_L01_B_178": [
      {
        "node": "ISK_L01_B_178",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "써. 대신 바다도 없는 데서 내가 파도를 갈랐다는 얘기까지 붙이지 마. 사람들 입에서 내 이야기가 커지는 건 익숙하지만, 걷는 길까지 바다로 만들 필요는 없잖아."
      },
      {
        "node": "ISK_L01_B_179",
        "profile": null,
        "speaker": null,
        "text": "각청이 보관 구역을 돌아보러 왔다. 짐과 사람의 대기 위치는 정해져 있었다. 통로 쪽으로 튀어나온 긴 짐을 각청이 짚자 북두가 선원과 방향을 고쳤다."
      },
      {
        "node": "ISK_L01_B_180",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "이제 이 자리에서 기다리면 돼. 움직일 필요가 생기면 교대 담당에게 알려 줘. 통행을 열 시각은 아직 정해지지 않았어. 송신의례 날에는 옥경대 별도 통로 안내를 확인하고."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_181",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "오늘 짐 정리 도왔다고 그때 우선 들어가는 작은 혜택은 없죠? 아는 얼굴 할인 같은 건 되는지 한번 물어본 거예요."
      }
    ],
    "ISK_L01_B_182": [
      {
        "node": "ISK_L01_B_182",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "없어. 대신 너는 설명을 잘 들었으니 엉뚱한 줄에서 기다릴 시간은 아끼겠네. 그 통로도 옥경대로만 가는 길이야. 다른 항구 구역까지 돌아다닐 허가는 아니고."
      },
      {
        "node": "ISK_L01_B_183",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "받을 수 있는 건 한 번씩 다 물어보는구나. 답은 들었으니 이제 앉아. 우리도 먼저 사람과 물건 인계를 마쳐야 해. 행사에 맞춰 같이 움직인다고 약속할 순 없어."
      },
      {
        "node": "R39_PROSE_ISK_L01_B_184",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "괜찮아요. 오늘은 여기서 기다릴게요. 선장을 만났다고 몬드에 쓰되 취업했다고는 안 쓰고, 항구 앞까지 왔다고 쓰되 들어왔다고는 안 쓰면 되겠네. 과장할 자리가 별로 없어서 편지는 짧겠다."
      }
    ],
    "ISK_L01_B_185": [
      {
        "node": "ISK_L01_B_185",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "아까부터 하는 말 들어 보면 짧을 것 같지는 않은데. 대신 네가 뭘 보고 싶어서 여기까지 왔는지는 써. 길이 막혔다고 그 이유까지 없어진 건 아니잖아."
      },
      {
        "node": "ISK_L01_B_186",
        "profile": null,
        "speaker": null,
        "text": "생활의 다음 자리를 찾고 구슬에 관해서도 물어보겠다는 계획은 남아 있었다. 오늘은 그 앞에서 멈췄을 뿐이었다. 옆 사람에게 걸리지 않게 가방을 당겼다. 물건도 사람도 놓고 가지 않은 행렬이 그 주위에서 쉴 모양을 갖추었다."
      }
    ],
    "ISK_L02_K1_003": [
      {
        "node": "ISK_L02_K1_003",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "몸이 불편해졌어? 아까와 다른 증상이 생겼으면 먼저 말해. 내가 물어본 항목에 없다고 참을 필요는 없어."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_004",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "몸은 멀쩡한 것 같아. 문제는 내가 멀쩡한지 확인하는 일을 자꾸 하게 된다는 거지. 사람이 자기 맥박에까지 출석을 부르고 있으면, 그건 좀 피곤하잖아."
      }
    ],
    "ISK_L02_K1_005": [
      {
        "node": "ISK_L02_K1_005",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 선인이 말한 건 네 주변에서 느낀 기척이지, 네가 죽었다는 판정이 아니야. 네가 전한 말에서도 그 둘은 달랐어. 확인하지 않은 결론을 네 몸에 먼저 붙이지 마."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_006",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나도 머리로는 알아. 그런데 주변이라고 하면 어디까지가 주변인지 모르겠거든. 옆 사람이 잊어버리기라도 하면, 내가 너무 가까이 앉았나부터 생각하게 돼."
      }
    ],
    "ISK_L02_K1_007": [
      {
        "node": "ISK_L02_K1_007",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그래서 네가 도착하기 전에 있었던 일과 이후의 일을 따로 확인하는 거야. 네가 지나간 자리만 모아서 들여다보면 네가 원인이라는 이야기밖에 만들 수 없어. 그건 조사가 아니라 결론을 정해 놓고 사람을 맞추는 일이야."
      },
      {
        "node": "ISK_L02_K1_008",
        "profile": null,
        "speaker": null,
        "text": "각청은 천막의 접힌 부분을 올려 바깥길이 보이게 했다. 나에게는 그 사소한 행동이 질문 몇 개보다 도움이 되었다. 밖을 볼 수 있자 바깥에서도 자신을 볼 수 있다는 생각이 덜 무서워졌다. 숨겨진 사람처럼 앉아 있을 필요가 없었다."
      }
    ],
    "ISK_L02_K1_019": [
      {
        "node": "ISK_L02_K1_019",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "손을 놓고 이야기하면 더 빨리 끝나겠지. 지금 네 손에 걸린 부분부터 빼고 항의해."
      },
      {
        "node": "ISK_L02_K1_020",
        "profile": null,
        "speaker": null,
        "text": "물이 한꺼번에 빠지며 두 사람의 신발 앞을 적셨다. 발을 물렸다가 각청의 신발도 젖었다는 것을 보고 참던 웃음을 내보였다. 각청은 웃는 이유를 알아차렸지만 다시 설명을 요구하지 않았다. 대신 마른 자리를 발끝으로 확인한 뒤 의자를 그쪽으로 옮겼다. 그날 저녁부터 나는 천막 안에 앉아 있는 자신을 실험대 위의 물건처럼 상상하는 횟수가 조금 줄었다."
      },
      {
        "node": "ISK_L02_K1_021",
        "profile": null,
        "speaker": null,
        "text": "셋째 날과 넷째 날에도 병사들의 기억 이상은 풀리지 않았다. 내가 있는 곳에서 멀리 떨어진 자리의 보고가 들어오기도 했고, 곁에서 대화를 나눈 사람이 그 대화를 기억하고 돌아오기도 했다. 그것만으로 내가 무관하다고 확정할 수는 없었다. 다만 자신이 입을 열면 누군가 반드시 잊는다는 두려움에는 맞지 않았다."
      },
      {
        "node": "ISK_L02_K1_022",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "네가 설산에서 발견했다는 구슬은 지금 가지고 있지 않은 거지? 지난번 대답을 의심해서 묻는 게 아니야. 물건을 가진 사람과 발견한 사람을 구분해 적어야 해."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_023",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "없어. 그때 봤다는 말이 어느새 내가 꺼내 줄 수 있다는 말로 바뀌면 곤란하잖아. 나한테 있는 걸 전부 뒤져도 그건 안 나와. 솔직히 지금은 없어서 다행인지 아닌지도 모르겠지만."
      }
    ],
    "ISK_L02_K1_024": [
      {
        "node": "ISK_L02_K1_024",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그럼 발견한 사람으로만 남겨 둘게. 몬드의 확인도 아직 도착했다고 말할 수 없어. 진이 함께 보았다는 네 증언과, 우리가 진에게 직접 들은 말은 구별해야 해."
      },
      {
        "node": "ISK_L02_K1_025",
        "profile": null,
        "speaker": null,
        "text": "그녀는 아직 모르는 것을 모른다고 말했다. 이전 같았으면 답답하다고 느꼈을 태도였다. 그러나 자기 주변에 죽음의 냄새가 난다는 말을 들은 뒤로는, 섣불리 안심시키지 않는 것이 오히려 믿을 만했다. 각청도 내가 어느 부분에서 안도하는지 설명을 요구하지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_026",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "의례 때는 나도 올라갈 수 있는 거지? 이왕 여기까지 왔는데, 항구 밖에서 지붕만 보다가 돌아갈 수는 없잖아. 물어볼 사람도 있고."
      }
    ],
    "ISK_L02_K1_027": [
      {
        "node": "ISK_L02_K1_027",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "행사 통로는 예정대로 열어. 일반 거리가 개방되는 건 아니고, 옥경대로 올라갔다가 같은 길로 내려오는 거야. 네가 별도로 대기했다는 이유로 참관을 막을 계획은 없어. 다만 그 자리에서 원하는 사람을 마음대로 만날 수 있다는 뜻도 아니야."
      },
      {
        "node": "ISK_L02_K1_028",
        "profile": null,
        "speaker": null,
        "text": "그 말에서 앞부분만 고르고 싶었다. 내가 기억하는 이야기에서는 신이 하늘에서 떨어지고, 그 뒤의 일은 살아 있는 신의 계획으로 이어졌다. 공고에 적힌 송신의례라는 이름은 여전히 기억과 맞지 않았다. 이번 세계의 일을 게임의 순서로 짐작해도 되는지, 드발린의 죽음 이후에는 자신도 확신할 수 없었다. 그래도 미리 안다고 믿는 부분이 하나 있다는 사실에 자꾸 기대고 싶어졌다."
      }
    ],
    "ISK_L02_K1_031": [
      {
        "node": "ISK_L02_K1_031",
        "profile": null,
        "speaker": "안내 병사",
        "text": "앞사람과 너무 붙지 마십시오. 올라갈 때는 오른쪽으로, 내려올 때는 맞은편 줄을 이용합니다. 길을 벗어나시면 다시 바깥 대기 구역으로 안내합니다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_032",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알겠어요. 도시 구경은 아직 장부에도 못 올리는 거죠. 이 길로만 올라갔다가 이 길로만 내려오겠습니다."
      }
    ],
    "ISK_L02_K1_034": [
      {
        "node": "ISK_L02_K1_034",
        "profile": null,
        "speaker": null,
        "text": "옥경대에 도착하자 나는 가장 먼저 내려가는 길의 위치를 확인했다. 도망칠 생각이라기보다, 모르는 군중 속에 들어왔을 때 몸이 먼저 하게 되는 일이었다. 각청은 통로가 꺾이는 곳에서 병사에게 몇 가지 지시를 내리고 있었다. 눈이 마주치자 그녀는 짧게 고개를 끄덕였다. 닷새 동안 나누었던 대화가 그 작은 반응 안에 남아 있었다."
      },
      {
        "node": "ISK_L02_K1_035",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "올라오는 데 문제는 없었어? 도중에 불편해진 건 없고?"
      }
    ],
    "ISK_L02_K1_039": [
      {
        "node": "ISK_L02_K1_039",
        "profile": null,
        "speaker": null,
        "text": "아무 말도 하지 못하는 순간 뒤에 질문들이 한꺼번에 터졌다. 제군에게 무슨 일이 생긴 것인지, 누가 손을 댄 것인지, 기억을 잃은 병사들도 이것과 관련된 것인지 서로 다른 말들이 뒤엉켰다. 원작을 떠올리려 했지만 눈앞의 먼지와 사람들의 떨리는 목소리가 그 기억 위를 덮었다. 화면 속 장면에는 자신을 밀치는 사람의 팔꿈치가 없었다."
      },
      {
        "node": "ISK_L02_K1_040",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "뒤쪽 통로를 비워. 쓰러진 사람이 있으면 먼저 확인하고, 단상으로 접근하는 사람은 막아. 추측을 사실처럼 전하지 마. 지금 필요한 건 각자가 직접 본 일이야."
      },
      {
        "node": "ISK_L02_K1_041",
        "profile": null,
        "speaker": null,
        "text": "응광의 목소리는 군중 위로 또렷하게 지나갔다. 사람들은 그 목소리만으로 상황이 수습되기를 바라는 듯 고개를 돌렸다. 각청은 앞으로 밀려오는 줄을 멈추고, 넘어진 사람이 다시 일어설 공간을 만들었다. 나에게도 자리를 지키라고 손짓했다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_042",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청, 응광하고 따로 이야기하게 해 줘. 여기서 다 같이 들을 얘기는 아닌데, 지금 꼭 전해야 할 말이 있어. 잠깐이면 돼."
      }
    ],
    "ISK_L02_K1_053": [
      {
        "node": "ISK_L02_K1_053",
        "profile": null,
        "speaker": null,
        "text": "각청의 말이 중간에서 끊겼다. 숨을 고르려는 멈춤과는 달랐다. 그녀의 손이 공중에 남은 채 힘을 잃었고, 발을 고쳐 디디기도 전에 몸이 무너졌다. 내가 손을 뻗는 동안 옆의 병사도 쓰러졌다. 뒤쪽에서 부딪치는 소리가 이어졌다. 비명을 지르던 사람의 입이 열린 그대로 조용해졌다."
      },
      {
        "node": "ISK_L02_K1_054",
        "profile": null,
        "speaker": null,
        "text": "각청의 어깨를 받치려다 함께 주저앉았다. 그녀는 눈을 감으라는 말도, 놓으라는 말도 하지 않았다. 주변에 쓰러진 사람들 누구에게서도 대답이 돌아오지 않았다. 조금 전까지 좁기만 하던 곳에서 사람의 움직임이 한꺼번에 사라졌다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_055",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청, 장난할 상황 아니잖아. 눈 좀 떠 봐. 아까 하던 말부터 끝내. 내가 듣고 있으니까, 일단 숨부터 쉬어. 제발."
      }
    ],
    "ISK_L02_K1_057": [
      {
        "node": "ISK_L02_K1_057",
        "profile": null,
        "speaker": null,
        "text": "살았다는 사실을 확인하자 안심해야 했다. 그런데 자기 가슴이 뛰는 것이 견디기 어려웠다. 누군가를 일으키지도 못하는 손이 혼자 따뜻했다. 천막에서 각청에게 했던 말이 돌아왔다. 자신이 가까이 앉아서 누군가 잊으면 어쩌느냐던 말. 이번에는 잊은 것이 아니었다. 내가 팔을 받치고 있는 사람이 죽었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_058",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "누구든 대답해 봐요. 아무나, 내 말 들리면 소리 좀 내 줘요. 여기에 사람들 쓰러졌어요. 도와주세요!"
      }
    ],
    "ISK_L02_K1_062": [
      {
        "node": "ISK_L02_K1_062",
        "profile": null,
        "speaker": null,
        "text": "발이 더 나가지 않는 곳에서 나는 길가의 낮은 바위에 기대었다. 손을 펴자 손바닥에 묻은 흙이 보였다. 닦으려다가 그 흙이 어디에서 묻었는지 생각났다. 각청의 어깨를 받칠 때였는지, 계단에서 넘어졌을 때였는지 구별할 수 없었다. 물도 닿지 않은 손을 옷에 문지르는 동안, 숨을 잘못 삼켜 기침이 났다."
      },
      {
        "node": "ISK_L02_K1_063",
        "profile": null,
        "speaker": null,
        "text": "몬드로 돌아가 진에게 알리는 길이 떠올랐다. 진은 드발린의 죽음도 함께 확인한 사람이었다. 그러나 그곳까지 가는 동안 또 다른 일이 생기면 어떻게 할 것인가. 그리고 이번에는 자기 주변에 머무른 사람들만 죽었다면. 그 가정을 지워 보려 했지만, 지울 근거 역시 가지고 있지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_064",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "일단 선인을 만나자. 내가 무서워서 산으로 숨는 거여도, 찾아가서 말할 사람은 있어야 하잖아. 류운차풍진군. 그 사람이라면 적어도 내가 본 걸 설명할 때까지는 들어 주겠지."
      }
    ],
    "ISK_L02_K1_067": [
      {
        "node": "ISK_L02_K1_067",
        "profile": null,
        "speaker": null,
        "text": "산중에 들어선 뒤에도 길은 친절해지지 않았다. 한쪽으로 몸을 기울여 통과해야 하는 구간에서 나는 벽을 등지고 오래 서 있었다. 발밑을 보지 않으려 고개를 들면 구름이 움직였고, 구름이 움직이면 자신이 서 있는 바위도 흔들리는 듯했다. 추락하면 누군가 살아 돌아오는 기적이 자기에게도 일어날지, 그런 생각이 스친 것만으로 속이 울렁거렸다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_068",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "죽었다가 살아난 걸 두 번 기대하는 건 너무 염치없지. 살아서 올라가는 쪽으로 하자. 길이 돌아가면 돌아가고, 못 넘으면 다른 길 찾고. 지금 내가 잘할 수 있는 건 그것뿐이잖아."
      }
    ],
    "ISK_L02_K1_069": [
      {
        "node": "ISK_L02_K1_069",
        "profile": null,
        "speaker": null,
        "text": "한 번에 건너려던 틈을 포기하고 낮은 쪽으로 내려갔다. 신발 옆으로 흙이 들어왔고 다리에 힘이 풀렸다. 쉬는 동안 눈을 감으면 각청이 말을 끝내지 못하던 입 모양이 떠올라서, 눈을 뜬 채 발끝만 보았다. 산의 고요는 의례장의 고요와 달랐다. 새가 날고 바람이 나뭇잎을 흔들었다. 그 소리가 있다는 것을 확인할 때마다 나는 다시 걸을 수 있었다."
      },
      {
        "node": "ISK_L02_K1_070",
        "profile": null,
        "speaker": null,
        "text": "거처가 있는 곳에 이르렀을 때 나는 반가워하기보다 문이 닫혀 있다는 사실에 먼저 주저앉을 뻔했다. 산을 올라오기만 하면 다음 장면이 시작될 줄 알았다. 문은 사람의 도착을 알아서 헤아려 주지 않았다. 주변을 살펴봐도 자신을 안내하는 사람이 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_071",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "류운차풍진군을 뵈러 왔습니다. 아래에서 큰일이 났어요. 제가 예를 잘 갖추지는 못했는데, 일부러 그런 건 아닙니다. 사람들한테 무슨 일이 생겼는지 말씀드려야 합니다."
      }
    ],
    "ISK_L02_K1_072": [
      {
        "node": "ISK_L02_K1_072",
        "profile": null,
        "speaker": null,
        "text": "문에 가까이 다가가 다시 불렀지만 대답은 없었다. 기억 속 공양 절차를 떠올렸다가 손을 내려다보았다. 갖추지도 못한 음식을 있다고 할 수는 없었다. 문을 두드리면 무례일까 고민하다가, 무례가 두려워 돌아갈 상황이 아니라는 생각에 손을 들었다. 손끝이 닿기 전에 안쪽에서 목소리가 들렸다."
      },
      {
        "node": "ISK_L02_K1_073",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "문을 부술 생각으로 손을 드는 것이라면 내려놓게. 열리지 않는 문 앞에서는 먼저 주인이 들었는지부터 기다리는 법이니. 자네가 이곳까지 허둥지둥 올라온 사정은 무엇인가?"
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_074",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "들으셨으면 대답을 조금만 빨리 해 주시지 그랬어요. 죄송합니다, 지금 투정 부릴 때 아닌 건 아는데. 아래에서 모락스의 시신이 떨어졌습니다. 그리고 사람들이 죽었어요. 제가 있던 곳에서, 저만 빼고 전부요."
      }
    ],
    "ISK_L02_K1_075": [
      {
        "node": "ISK_L02_K1_075",
        "profile": null,
        "speaker": null,
        "text": "안쪽의 기척이 멈췄다. 더 말하려다 숨이 목에 걸렸다. 내가 방금 한 말을 다시 들으면 자신도 아무 설명 없이 받아들이지 못할 것 같았다. 그러나 문밖에서 혼자 순서를 다듬는 동안에도 아래에 두고 온 사람들의 몸은 그대로일 것이었다."
      },
      {
        "node": "ISK_L02_K1_076",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "제군의 일과 사람들의 죽음을 한숨에 묶어 말하지 말게. 언제, 어디서, 무엇을 보았는지 차례로 답할 수 있겠나. 이 몸이 듣고 있으니 목소리부터 낮추고 호흡을 고르게."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_077",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "차례대로 말할 수 있어요. 대신 문밖에서 소리치는 건 여기까지 했으면 합니다. 제가 또 사람 앞에서 이상한 일을 일으킬까 봐 도망쳐 온 건데, 문에 대고 말하니까 정말 혼자 남은 것 같아서요."
      }
    ],
    "ISK_L02_K1_078": [
      {
        "node": "ISK_L02_K1_078",
        "profile": null,
        "speaker": null,
        "text": "문이 열리자 나는 곧장 들어가지 못했다. 마침내 허락을 얻었는데도 먼저 발을 내딛으면 안 될 것 같았다. 안쪽에 모습을 드러낸 학이 나를 바라보았다. 사진이나 그림으로 기억하던 자태와 달리, 눈앞의 존재는 자신이 가만히 서 있는 것만으로 내가 걸어온 거리를 작게 만들었다."
      },
      {
        "node": "ISK_L02_K1_079",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "들어오게. 다만 자네가 무엇인지 이 몸이 벌써 판단한 것은 아니니, 그 표정으로 스스로 판결을 내리지는 말거라. 저 돌턱은 낮아 보이지만 발이 걸리기 쉽다. 고개를 들고 걷겠다면 적어도 발은 제대로 옮겨야지."
      },
      {
        "node": "ISK_L02_K1_080",
        "profile": null,
        "speaker": null,
        "text": "지정받은 자리에 앉았다. 앉으라는 말을 기다렸다가 앉는 일이 이렇게 힘들 줄은 몰랐다. 무릎이 굽혀지자 올라오는 동안 참았던 통증이 한꺼번에 느껴졌다. 류운차풍진군은 내가 허리를 펴기도 전에 질문을 이어가지 않았다. 그 짧은 기다림 때문에 나는 오히려 먼저 입을 열 수 있었다."
      }
    ],
    "ISK_L02_K1_084": [
      {
        "node": "ISK_L02_K1_084",
        "profile": null,
        "speaker": null,
        "text": "말을 끝내자 처음으로 각청의 이름을 부르는 일이 견딜 만해졌다. 그녀를 들쳐 업고 도망치지 못했다는 생각은 여전히 남아 있었다. 류운차풍진군은 내 말을 듣고서도 곧바로 위로하지 않았다. 대신 내가 직접 확인한 범위와, 내려오면서 볼 수 없었던 범위를 하나씩 짚었다. 대답할 수 없는 질문에서 입을 다물었다."
      },
      {
        "node": "ISK_L02_K1_085",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "응광은 그 전에 자리를 떠났고, 자네는 그 뒤의 행방을 보지 못했다. 그렇다면 그 사람의 생사까지 같은 말로 묶지는 않겠네. 현장의 죽음을 가볍게 보자는 뜻이 아니야. 어디까지 알며 어디서부터 모르는지가 분명해야, 이 몸도 움직일 방향을 정할 수 있지."
      }
    ],
    "ISK_L02_K1_087": [
      {
        "node": "ISK_L02_K1_087",
        "profile": null,
        "speaker": null,
        "text": "류운차풍진군의 시선이 달라졌다. 놀라서 물러나는 반응이 아니었다. 내가 해서는 안 될 이름을 우연히 입에 담았는지, 아니면 자신이 하는 말의 무게를 알고 있는지 가늠하는 침묵이었다. 그 침묵을 견디면서 손가락을 무릎 위에 펼쳤다. 다시 자기 맥박을 찾기 시작하면 말을 이어가지 못할 것 같았다."
      },
      {
        "node": "ISK_L02_K1_088",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "자네가 말하는 계략에 방금 죽었다는 사람들까지 포함되어 있나? 제군의 이름을 앞에 붙인다고 서로 다른 일이 하나의 이유가 되는 것은 아닐세. 그리고 오셀이라는 이름은 어디에서 들었지? 항구에서 누가 자네에게 알려 주었나?"
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_089",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "아니요. 사람들까지 죽는 건 제가 알던 일에 없었어요. 그 부분은 모르겠습니다. 제가 살던 곳에서 이곳의 일을 이야기로 알고 있었어요. 당신이 계신 곳도 그래서 떠올렸고요. 그런데 여기서는 드발린이 진짜로 죽었다가 살아났고, 오늘은 제 눈앞에서 사람들이 죽었습니다. 제가 알던 이야기만 믿고 괜찮을 거라 말할 수는 없어요."
      }
    ],
    "ISK_L02_K1_100": [
      {
        "node": "ISK_L02_K1_100",
        "profile": null,
        "speaker": null,
        "text": "그녀의 말은 아무 일도 없을 것이라는 약속이 아니었다. 그것을 알아들었다. 자신을 안전한 사람이라 선언해 달라고 요구할 근거가 없듯, 위험한 사람이라 선언해 달라고 요구할 근거도 없었다. 그 사실이 안도보다 먼저 지친 몸을 찾아왔다. 어깨가 내려가자 의례장을 나온 뒤 처음으로 숨이 끝까지 들어왔다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_101",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "제가 여기서 잠깐 쉬어도 될까요? 대답은 다 했다고 생각했는데, 일어서려고 하니까 다리가 말을 안 듣네요. 아무리 선인 앞이어도 이 정도 체면은 포기하겠습니다."
      }
    ],
    "ISK_L02_K1_102": [
      {
        "node": "ISK_L02_K1_102",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "체면을 포기하는 허락까지 이 몸에게 받을 셈인가. 앉아 있으라 했으면 쉬어도 된다는 뜻이지. 발목을 그런 식으로 비틀고 있으면 일어날 때 더 아플 테니 곧게 놓게. 인간의 몸은 쓰러지기 직전까지 버틴다고 더 오래 가는 물건이 아니야."
      },
      {
        "node": "ISK_L02_K1_103",
        "profile": null,
        "speaker": null,
        "text": "내가 자세를 고쳐 앉자 그녀는 한 차례 더 발목을 살피고서야 눈을 돌렸다. 내가 웃을 만한 여유가 있었다면 잔소리를 들었다고 생각했을 것이다. 지금은 누군가 자신의 다음 걸음을 실제로 걱정한다는 사실만 남았다."
      },
      {
        "node": "ISK_L02_K1_104",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "이 몸도 항구 쪽의 사정을 확인하겠네. 자네의 이야기를 그대로 받아 적고 끝낼 일은 아니니. 경계를 늦춰도 된다고 말할 근거가 없는 만큼 필요한 대비도 살펴보지. 그렇다고 자네가 산을 내려가는 동안 모든 길이 안전해진다고 생각하지는 말게."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_105",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알겠습니다. 내려가면 제가 도망친 길부터 다시 볼게요. 사람을 만나면 무조건 피하지 말고, 살아 있는 사람이 있으면 어디서 왔는지 물어보겠습니다. 다만 지금 바로 뛰어 내려가라고는 하지 말아 주세요. 그건 의욕 문제가 아니라 다리 문제예요."
      }
    ],
    "ISK_L02_K1_106": [
      {
        "node": "ISK_L02_K1_106",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "이제야 두 가지를 제대로 나누는군. 마음이 급한 것과 발이 움직일 수 있는 것은 별개지. 쉬었다 가게. 자네가 가져온 이야기는 이 몸이 들었으니, 문밖에서 다시 외칠 필요도 없네."
      },
      {
        "node": "ISK_L02_K1_107",
        "profile": null,
        "speaker": null,
        "text": "몸을 추스르고 밖으로 나왔을 때 산의 빛은 이미 낮과 달랐다. 내려가는 길을 서두르다가도 발을 확인했다. 어둠이 깊어지는 구간에서는 더 움직이지 않고 바람을 피할 만한 곳에서 기다렸다. 눈을 감는 일은 여전히 어려웠지만, 한 번도 쉬지 않은 몸으로 비탈을 내려가는 일이 용기라는 생각은 하지 않기로 했다."
      }
    ],
    "ISK_L02_K1_111": [
      {
        "node": "ISK_L02_K1_111",
        "profile": null,
        "speaker": null,
        "text": "각청은 서 있었다. 어깨를 곧게 펴고 상대의 설명을 들으며, 필요한 대목에서 질문하고 있었다. 내 손 안에서 무게만 남았던 몸이 스스로 움직였다. 그녀가 고개를 돌렸을 때 나는 자신도 모르게 앞으로 나섰다가 멈췄다. 반가워해야 하는지, 달아나야 하는지, 무엇부터 해야 하는지 결정할 수 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K1_112",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청… 너 어떻게 살아 있어? 내가 바로 앞에서 봤는데. 네 손을 잡고, 숨도 확인했는데. 나한테 지금 위험한 게 뭐냐고 묻다가 쓰러졌잖아. 그 말, 아직 끝내지도 못했잖아."
      }
    ],
    "ISK_L02_K2_004": [
      {
        "node": "ISK_L02_K2_004",
        "profile": null,
        "speaker": "짐꾼",
        "text": "반씩 낼 사람이 있었으면 당신부터 안 골랐을 거요. 얼굴에 나도 돈 아깝다는 소리가 아주 잘 쓰여 있으니까. 여기 있는 동안 밧줄 잘못 밟아서 짐이나 넘어뜨리지 마시오."
      },
      {
        "node": "ISK_L02_K2_005",
        "profile": null,
        "speaker": null,
        "text": "내가 발밑을 확인하자 짐꾼은 그제야 조금 웃었다. 웃음이 사라진 뒤에는 다시 짐을 보았다. 안으로 넘겼다고 주장할 수도 없고, 아직 넘기지 않았다고 확답할 수도 없는 일 사이에서 그는 포대의 무게를 계속 자기 어깨에 얹고 있는 사람처럼 앉아 있었다."
      },
      {
        "node": "ISK_L02_K2_006",
        "profile": null,
        "speaker": null,
        "text": "각청이 돌아왔을 때 짐꾼은 곧장 일어났다. 같이 일어서려다 너무 빠르게 움직인 탓에 무릎을 바닥에 부딪쳤다. 각청은 두 사람을 번갈아 보더니 먼저 짐의 위치부터 확인했다. 그녀가 무언가를 물을 때마다 답을 앞질러 주던 짐꾼이 이번에는 말을 아꼈다. 같은 대답을 또 해도 좋을지부터 고민하는 표정이었다."
      },
      {
        "node": "ISK_L02_K2_007",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "짐은 그 자리에 두었지? 다시 검사했느냐는 질문이 아니야. 아까 내가 확인한 뒤에 이동했는지 묻는 거야. 네가 말한 끈이 풀려 있던 모습도 그 전에 본 일이 맞고."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_008",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "맞아. 나는 내용물을 꺼내 본 적 없고, 누가 다 넘겨받는 걸 본 것도 아니야. 끈이 풀린 상태를 봤다는 것까지만. 기다리는 시간이 길어진다고 내가 본 장면까지 길어지는 건 아니니까."
      }
    ],
    "ISK_L02_K2_009": [
      {
        "node": "ISK_L02_K2_009",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그렇게 구분해서 말해 주면 돼. 부족하다고 생각해서 다른 장면까지 채울 필요 없어. 지금 문제는 우리가 알고 싶은 만큼 기억이 남아 있지 않다는 거니까."
      },
      {
        "node": "ISK_L02_K2_010",
        "profile": null,
        "speaker": "짐꾼",
        "text": "그럼 오늘은 어디까지 갈 수 있소? 안으로 못 들어가는 건 이해했는데, 같은 자리에서 같은 설명만 하다가 해가 져 버렸소. 다음에는 누가 와서 뭘 확인해야 끝나는 건지 알아야 기다리지 않겠소."
      },
      {
        "node": "ISK_L02_K2_011",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "오늘 바로 끝난다고 약속할 수는 없어. 대신 아무나 와서 처음부터 다시 짐을 풀지 않게 할게. 잠깐 자리를 비워야 하면 이쪽 병사에게 알리고 다녀와. 네가 계속 옆에 붙어 서 있는 걸 확인 절차로 삼지는 않겠어."
      }
    ],
    "ISK_L02_K2_018": [
      {
        "node": "ISK_L02_K2_018",
        "profile": null,
        "speaker": null,
        "text": "이튿날에는 짐꾼이 자리를 비웠다가 해가 기울기 전에 돌아왔다. 자신이 짐을 맡은 것은 아니라고 병사에게 다시 확인하고 한쪽에 앉아 있었다. 짐꾼이 돌아와 가장 먼저 확인한 것은 짐의 수가 아니라 내가 아직 거기 있다는 사실이었다."
      },
      {
        "node": "ISK_L02_K2_019",
        "profile": null,
        "speaker": "짐꾼",
        "text": "설마 내가 도망쳤다고 생각한 건 아니겠지? 볼일이 길어져서 늦었소. 기다리다 먼저 갔을 줄 알았는데."
      }
    ],
    "ISK_L02_K2_022": [
      {
        "node": "ISK_L02_K2_022",
        "profile": null,
        "speaker": null,
        "text": "입을 열었다가 닫았다. 실제로 무거운 일을 거들겠다고 할 생각이었으므로, 들킨 기분이 들었다. 대신 짐꾼이 앉을 자리를 비워 주었다. 두 사람이 나누는 대화는 인계가 어디에서 막혔는지에서 오늘 바람이 어느 쪽으로 부는지로, 다시 어디까지 걸어가면 사람들 줄이 덜 붐비는지로 옮겨 갔다."
      },
      {
        "node": "ISK_L02_K2_023",
        "profile": null,
        "speaker": null,
        "text": "셋째 날, 같은 병사가 익숙한 글씨를 앞에 놓고 한동안 말을 하지 못했다. 자기가 적은 것은 알겠는데 그때 했던 일이 떠오르지 않는다고 했다. 정답을 알려 주듯 끼어들려다 멈췄다. 다른 사람이 알려 준 장면을 따라 말하는 것과 자기 기억을 되찾는 것은 다르다는 걸, 이 자리에서 조금씩 배우고 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_024",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "생각 안 나면 일단 거기까지만 말해도 돼요. 제가 본 것도 끈 풀린 것뿐이라니까요. 두 사람이 반쪽씩 안다고 붙여 놓으면 하나의 완벽한 기억이 되는 건 아니잖아요."
      }
    ],
    "ISK_L02_K2_025": [
      {
        "node": "ISK_L02_K2_025",
        "profile": null,
        "speaker": "검수 병사",
        "text": "그렇게 말해 주시는 건 고맙습니다. 그런데 제가 모른다고 하면 다른 사람이 또 멈추게 되니까요. 일을 하러 나왔는데, 제가 일의 제일 큰 걸림돌이 된 기분입니다."
      },
      {
        "node": "ISK_L02_K2_026",
        "profile": null,
        "speaker": "짐꾼",
        "text": "당신이 오늘 새로 멈춘 건 아니오. 멈춰야 할 곳을 이제 알게 된 거겠지. 모르는 걸 안다고 해서 안으로 넘겼다가 나중에 사라졌다고 하면, 그땐 셋 다 거짓말쟁이가 되지 않겠소."
      },
      {
        "node": "ISK_L02_K2_027",
        "profile": null,
        "speaker": null,
        "text": "짐꾼을 보았다. 첫날에는 한시라도 빨리 일을 끝내려고 병사의 대답을 재촉하던 사람이었다. 성격이 갑자기 느긋해진 것은 아니었다. 그는 여전히 기다리는 시간을 아까워했고, 짐의 끈을 볼 때마다 한숨을 쉬었다. 다만 그 시간을 누구에게 화를 내서 되찾을 수 있는지에 대해서는 생각이 달라진 듯했다."
      },
      {
        "node": "ISK_L02_K2_028",
        "profile": null,
        "speaker": null,
        "text": "넷째 날에는 의례가 열리는 날의 동선 안내가 다시 돌았다. 물자를 들여보내는 길과 참관객이 올라가는 길은 다르다는 설명에, 짐꾼은 한동안 먼 곳을 바라보았다. 기다리는 동안 도시가 나아지기를 빌어 보는 것 외에 할 일이 없다는 표정이었다."
      },
      {
        "node": "ISK_L02_K2_029",
        "profile": null,
        "speaker": "짐꾼",
        "text": "짐은 병사에게 위치를 확인받고 그대로 둘 거요. 나도 잠깐 올라갔다 오려고. 신 앞에서 이러고 기다리는 사람 있다는 얘기라도 해 볼까 해서. 당신도 갈 거면 같이 가겠소?"
      }
    ],
    "ISK_L02_K2_031": [
      {
        "node": "ISK_L02_K2_031",
        "profile": null,
        "speaker": "짐꾼",
        "text": "말만 들으면 아주 큰 선행을 하는 것 같군. 올라가는 길에서 힘들다고 먼저 주저앉지만 마시오. 당신은 별것도 없는 짐을 들고 와 놓고 걸핏하면 어깨를 주무르더구먼."
      },
      {
        "node": "ISK_L02_K2_032",
        "profile": null,
        "speaker": null,
        "text": "빈정대는 말에 웃었다. 상대가 내일도 자신을 같은 사람으로 기억하고 있을 것이라고 당연히 믿을 수 있는 대화였다. 그 당연함이 얼마나 드문 일인지, 나는 얼마 뒤에야 알게 된다. 소가 했던 말은 여전히 각청에게 전하지 않은 채였다. 대기 구역에서 나눈 이야기들만으로도 하루가 넘쳤고, 불분명한 자기 사정을 보태야 할지 결정하지 못했다."
      }
    ],
    "ISK_L02_K2_039": [
      {
        "node": "ISK_L02_K2_039",
        "profile": null,
        "speaker": null,
        "text": "옥경대에서는 시선이 자연스럽게 한곳으로 모였다. 사람들의 기대에 섞여 서면서도 공고에 적힌 의례 이름과 자기 기억 사이의 어긋남을 생각했다. 내가 알던 이야기의 시작은 달랐다. 이것이 이름만 바뀐 것인지, 실제 일이 다른 순서로 일어나는 것인지 누구에게 물어야 할지도 분명하지 않았다."
      },
      {
        "node": "ISK_L02_K2_040",
        "profile": null,
        "speaker": "짐꾼",
        "text": "고개를 그렇게 내밀면 앞사람과 부딪히오. 보고 싶은 게 있으면 차라리 이쪽에 서시오. 나는 저 위까지 훤히 보이지 않아도 괜찮으니까."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_041",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "오늘은 내가 가리는 쪽이네. 고마워요. 올라올 때는 구경 잘하고 내려가면 될 줄 알았는데, 막상 오니까 물어보고 싶은 게 더 많아져서요."
      }
    ],
    "ISK_L02_K2_043": [
      {
        "node": "ISK_L02_K2_043",
        "profile": null,
        "speaker": null,
        "text": "짐꾼이 잡은 팔을 바로 빼지 못했다. 두 사람 모두 시신에서 눈을 떼지 못하고 있었다. 기억을 잃은 병사들이 모자라 신마저 죽었다는 말이 가까이에서 튀어나왔다. 누군가는 자리를 뜨려 했고, 누군가는 앞으로 나아가 직접 보려 했다. 서로 반대 방향으로 움직이자 길이 더 막혔다."
      },
      {
        "node": "ISK_L02_K2_044",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "그 자리에서 서로 밀지 마. 앞을 보겠다고 움직이면 뒤의 사람이 넘어져. 천암군은 통로를 확보하고, 현장을 벗어난 사람의 이야기는 따로 확인해. 지금 들리는 말들을 그대로 옮기지 마라."
      },
      {
        "node": "ISK_L02_K2_045",
        "profile": null,
        "speaker": null,
        "text": "각청이 통로 가장자리로 와서 사람들을 물렸다. 짐꾼은 앞에 넘어진 사람을 일으켜 주었고, 나도 손을 뻗어 설 자리를 만들었다. 잠깐 생긴 틈 사이로 응광이 보였다. 그녀에게 미리 알고 있는 일을 말할 수만 있다면, 앞으로 닥칠 위험을 줄일 수 있을지도 몰랐다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_046",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청, 나 응광하고 개인적으로 이야기해야겠어. 지금 본 것 말고도 전할 게 있어. 여기서 소리 내면 더 혼란스러워질 테니까, 잠깐만 따로 만나게 해 줘."
      }
    ],
    "ISK_L02_K2_056": [
      {
        "node": "ISK_L02_K2_056",
        "profile": null,
        "speaker": null,
        "text": "내가 다시 고개를 돌렸을 때 응광은 현장을 떠나고 있었다. 뒤따르는 사람들 사이로 그녀의 옷자락이 보였다가 다른 통로 너머로 사라졌다. 따라가려다 각청이 막고 있는 선 앞에서 멈췄다. 각청의 거절에는 이유가 있었다. 그 이유를 이해한다고 해서 사라지는 초조함도 아니었다."
      },
      {
        "node": "ISK_L02_K2_057",
        "profile": null,
        "speaker": "짐꾼",
        "text": "아는 게 있으면 지금 이분한테 먼저 말하시오. 사람을 가려 가며 할 때가 아닌 것 같은데. 당신은 본 것과 안 본 것을 잘 나누더니, 오늘은 말 앞에서 자꾸 머뭇거리는군."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_058",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "맞아요. 이상하게 들릴까 봐 순서를 찾고 있었어요. 각청, 조금만 들어. 이건 내가 전에—"
      }
    ],
    "ISK_L02_K2_059": [
      {
        "node": "ISK_L02_K2_059",
        "profile": null,
        "speaker": null,
        "text": "짐꾼의 손이 내 팔에서 떨어졌다. 그가 한 발을 헛디딘 것처럼 보여 나는 반사적으로 옷깃을 잡았다. 각청도 동시에 무릎이 꺾였다. 옆에 서 있던 병사가 창을 놓쳤고, 군중의 소리가 중간에서 뚝 끊겼다. 한 사람이 넘어져 다른 사람을 밀친 것과 달랐다. 서로 떨어져 있던 사람들까지 아무 힘 없이 무너졌다."
      },
      {
        "node": "ISK_L02_K2_060",
        "profile": null,
        "speaker": null,
        "text": "짐꾼을 끌어안은 채 바닥에 주저앉았다. 그가 가벼울 거라던 짐이 갑자기 움직일 수 없는 무게가 되었다. 어깨를 흔들고 이름 대신 아는 호칭을 불렀다. 닷새를 같이 있었는데도 이름보다 먼저 짐꾼이라는 말이 떠올랐다는 사실이 뒤늦게 나를 찔렀다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_061",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "일어나요. 조금 전까지 나한테 할 말 하라고 했잖아요. 알았으니까, 내가 말할 테니까 들어 줘요. 이렇게 누워 있으면 다시 일하러 가야 한다고 투덜댈 사람도 없잖아요."
      }
    ],
    "ISK_L02_K2_063": [
      {
        "node": "ISK_L02_K2_063",
        "profile": null,
        "speaker": null,
        "text": "짐꾼의 몸을 다시 당겼다. 사람들을 지나 내려가는 길까지 끌고 갈 수 있을지 가늠하려 했지만, 몸을 조금 옮기는 것만으로도 손이 미끄러졌다. 가까운 병사에게 도와 달라고 말하려 고개를 들었다가 그 말마저 삼켰다. 부탁을 받을 사람이 없었다. 바로 앞에 사람들이 가득한데, 도움을 청할 상대는 하나도 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_064",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "왜 아무도… 아까 다들 살아 있었잖아. 나한테 말을 했잖아요. 누가 좀, 제발 누가 오라고 해 줘요. 여기에 혼자 두지 말아요."
      }
    ],
    "ISK_L02_K2_068": [
      {
        "node": "ISK_L02_K2_068",
        "profile": null,
        "speaker": null,
        "text": "길가에 엎드리듯 앉았다. 입 안에 들어온 먼지를 뱉으면서 자신이 아직 짐꾼의 소매를 쥐고 있는 줄 알고 손을 폈다. 아무것도 없었다. 들고 올 수 있는 표찰이나 흔적을 찾을 생각조차 하지 못했다. 살아 나왔다는 말에 붙일 수 있는 증거가 자기 기억뿐이라는 사실은, 기억 때문에 봉쇄된 도시 앞에서 특히 막막했다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_069",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내가 본 건 내가 말해야지. 저 사람들은 이제 자기 일을 말할 수 없잖아. 그러니까 사람 있는 데로 가야 해. 누가 알아들을 때까지라도. 이번에는 무슨 말을 해야 할지 고민하다가 또 놓치지 말자."
      }
    ],
    "ISK_L02_K2_070": [
      {
        "node": "ISK_L02_K2_070",
        "profile": null,
        "speaker": null,
        "text": "말을 알아들어 줄 사람을 생각하자 선인들이 떠올랐다. 자신을 두고 죽음과 생명의 냄새를 이야기했던 소도 있었다. 그러나 지금의 그를 어디에서 만날 수 있을지는 몰랐다. 무엇보다 나는 원작에서 알던 이름들 가운데, 정해진 거처와 그곳으로 가는 산의 모습을 가장 선명하게 기억하는 이를 붙들었다. 류운차풍진군이었다."
      },
      {
        "node": "ISK_L02_K2_071",
        "profile": null,
        "speaker": null,
        "text": "머릿속에서는 간단했다. 절운간 쪽으로 가서 오장산에 오르고, 거처에 찾아가 급한 소식을 전한다. 실제로는 어느 길이 산을 돌아 올라가고 어느 길이 절벽 아래에서 끊기는지부터 알아내야 했다. 처음 택한 오르막은 멀리서 보이던 능선에 닿지 않았다. 돌아 내려오는 동안 나는 위에서 던져진 작은 돌이 발치까지 굴러오는 소리를 들었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_072",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "길을 안다고 한 적은 없지. 있는 장소를 안다고만 했지. 이런 말로 나를 변호하고 있는 게 벌써 마음에 안 드는데, 그래도 다른 길로 가면 되잖아. 여기까지 왔는데 산한테 면담 거절당하고 끝낼 수는 없고."
      }
    ],
    "ISK_L02_K2_074": [
      {
        "node": "ISK_L02_K2_074",
        "profile": null,
        "speaker": null,
        "text": "높이 오를수록 사람 소리가 멀어졌다. 한숨 돌릴 때마다 아래를 내려다보았지만 리월항의 어느 곳에서 무슨 일이 벌어지고 있는지까지 보이지는 않았다. 이렇게 멀리 왔는데도 조금 전 의례장의 소리를 떠올릴 수 있다는 것이 이상했다. 머릿속에서 짐꾼은 여전히 나에게 본 것과 안 본 것을 나누라고 말하고 있었다."
      },
      {
        "node": "ISK_L02_K2_075",
        "profile": null,
        "speaker": null,
        "text": "거처 앞에 도착했을 때 나는 문을 향해 곧장 걸어갔다가 제자리로 돌아왔다. 숨이 거칠어 첫마디를 끝내지 못할 것 같았다. 바지에 손을 문질러 흙을 조금 털고, 무엇을 먼저 말할지 순서를 세웠다. 급한 일이다, 제군의 몸이 떨어졌다, 사람들이 죽었다. 이 셋을 말하기 전에 길을 잘못 들었느냐는 질문을 받고 싶지는 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_076",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "류운차풍진군, 리월항에서 왔습니다. 제군의 시신이 떨어진 것을 봤고, 그 뒤 현장에 있던 사람들이 죽었습니다. 저는 살아 나왔어요. 문을 여실 수 없으면 여기서라도 듣고 계신지만 알려 주십시오."
      }
    ],
    "ISK_L02_K2_081": [
      {
        "node": "ISK_L02_K2_081",
        "profile": null,
        "speaker": null,
        "text": "말끝에서 가빠진 숨을 한 번 골랐다. 문 너머에서는 내가 마지막까지 말을 잇기를 기다리고 있었다. 먼저 요점을 재촉할 것이라고 생각했기에 그 기다림이 의외였다. 내가 어떻게 왔는지는 문밖에서 이미 밝혔다. 이제 실제로 보았던 것들을 흐트러뜨리지 않고 전해야 했다."
      },
      {
        "node": "ISK_L02_K2_082",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "의례를 보러 간 사람이 제군의 시신을 보고 돌아왔다. 그 뒤 사람들이 죽었다는 말은, 모두가 흩어져 보이지 않았다는 뜻이 아니겠지? 자네가 직접 본 일과 남에게 들은 일을 뒤섞지 않도록 하게."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_083",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "사람들이 없어진 게 아니에요. 제 앞에 남아 있었어요. 같이 올라간 사람을 잡고 있었는데 몸에서 힘이 빠졌고, 제가 불러도 대답하지 않았습니다. 각청도 바로 거기서 죽었어요. 제가 정말 본 것을 말하고 있습니다."
      }
    ],
    "ISK_L02_K2_084": [
      {
        "node": "ISK_L02_K2_084",
        "profile": null,
        "speaker": null,
        "text": "문이 열렸다. 보이지 않던 상대가 모습을 드러내자 말을 멈췄다. 학의 눈이 내 차림보다 얼굴에 오래 머물렀다. 게임에서 알고 있던 선인을 만났다는 감탄은 나중 일이었다. 지금은 마침내 자신의 증언이 살아 있는 상대에게 도착했다는 사실이 먼저였다."
      },
      {
        "node": "ISK_L02_K2_085",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "발부터 들이밀 생각은 접고 잠깐 서 있게. 바닥의 높이가 달라 몸이 앞으로 쏠릴 것이야. 자네처럼 무릎에 힘이 빠진 채 들어오면 문턱 앞에서 쓰러지기 쉽지. 들으려 문을 열었으니, 넘어지며 서두를 필요는 없네."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_086",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알겠습니다. 제가 아무 데서나 넘어지는 사람이 된 건 오늘만 그런 겁니다. 원래 아주 튼튼했다고 우기지는 않겠지만, 손님이 들어오자마자 쓰러지면 서로 곤란하겠죠."
      }
    ],
    "ISK_L02_K2_087": [
      {
        "node": "ISK_L02_K2_087",
        "profile": null,
        "speaker": null,
        "text": "말한 것만큼 조심해서 들어갔다. 말을 길게 하면 아직 괜찮은 척할 수 있을 줄 알았지만, 마지막 말끝에서 목소리가 갈라졌다. 류운차풍진군은 웃음거리로 삼지 않고 나를 앉혔다. 문밖에서 정리한 순서는 앉는 순간 다시 흐트러졌고, 나는 손등을 내려다보며 첫 질문을 기다렸다."
      },
      {
        "node": "ISK_L02_K2_088",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "함께 올라갔다는 이는 자네의 오랜 벗인가?"
      }
    ],
    "ISK_L02_K2_092": [
      {
        "node": "ISK_L02_K2_092",
        "profile": null,
        "speaker": null,
        "text": "마지막 대답을 할 때 나는 고개를 들었다. 말을 돌리면 그녀가 눈치채지 못할 것 같지는 않았다. 무엇보다 짐꾼에게 본 것만 말하겠다고 했던 사람이, 그를 두고 나온 장면만 다른 모양으로 바꿀 수는 없었다. 류운차풍진군은 내가 말을 마친 뒤에도 잠깐 기다렸다."
      },
      {
        "node": "ISK_L02_K2_093",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "구할 수 있었는데 하지 않았다는 것과, 구하려 했으나 손이 닿지 않았다는 것은 다르지. 이 몸이 그 자리에 없었으니 어느 쪽이라고 대신 판정하지는 않겠네. 다만 그 사람을 업고 오지 못했다고 해서 지금 가져온 소식까지 버릴 이유는 없네."
      }
    ],
    "ISK_L02_K2_095": [
      {
        "node": "ISK_L02_K2_095",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "자네가 방금 붙인 이름이 얼마나 무거운지 알고 하는 말인가. 사람의 죽음을 전한 입으로 제군의 뜻까지 단언했군. 누구에게 들었는가? 그 말을 전한 사람이 오늘 그곳에 있었나?"
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_096",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이곳 사람한테 들은 이야기가 아닙니다. 제가 살던 곳에서, 이곳의 일을 이야기처럼 알고 있었어요. 제가 여기 왔다는 사실부터 설명이 안 된다는 건 알아요. 그런데 오셀 이름을 아는 이유도, 당신을 찾아올 생각을 한 이유도 그겁니다. 거짓말을 덧대서 더 그럴듯한 출처를 만들 수는 없어요."
      }
    ],
    "ISK_L02_K2_097": [
      {
        "node": "ISK_L02_K2_097",
        "profile": null,
        "speaker": null,
        "text": "류운차풍진군은 날개를 접은 채 나를 바라보았다. 알고 있는 비밀을 감탄하며 맞장구칠 상대를 기대한 적은 없었지만, 이렇게 대답을 돌려받지 못하자 자신이 믿고 있던 이야기의 바닥이 얇아 보였다. 그것이 맞는 이야기라면 자신이 떠나온 현장은 대체 무엇이란 말인가."
      },
      {
        "node": "ISK_L02_K2_098",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "자네가 알고 있었다는 이야기에는 오늘 함께 갔던 이의 죽음도 있었나?"
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_099",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "없었어요. 천암군이 기억을 잃는 일도, 제 눈앞에서 모두가 죽는 일도요. 드발린이 정말 죽었다가 살아나는 일도 없었습니다. 그러니까 계략이라는 건 제가 아는 원래 이야기에서의 설명이고, 오늘 이 죽음의 이유까지 안다는 뜻은 아니에요. 제가 말을 너무 한꺼번에 했네요."
      }
    ],
    "ISK_L02_K2_100": [
      {
        "node": "ISK_L02_K2_100",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "한꺼번에 말한 것만이 문제는 아니네. 아는 이야기가 있으니 모르는 일이 벌어져도 그 안에 들어갈 것이라고 기대하고 있지 않은가. 이미 자네는 그 이야기에 없던 죽음을 두 번 보았다고 했네. 그런데도 그중 더 오래 알고 있던 쪽에 모든 판단을 맡길 셈인가?"
      },
      {
        "node": "ISK_L02_K2_101",
        "profile": null,
        "speaker": null,
        "text": "그 말에 반박할 이유는 많아 보였다. 자신이 아무것도 모르는 사람이 아니라는 것, 미리 알던 이름들이 실제로 존재한다는 것, 여기에 오기까지 그 지식이 도움이 되었다는 것. 그러나 어느 반박도 짐꾼을 다시 일으켜 세우지는 못했다. 무릎 위에 놓았던 손을 풀었다."
      }
    ],
    "ISK_L02_K2_108": [
      {
        "node": "ISK_L02_K2_108",
        "profile": null,
        "speaker": null,
        "text": "대화가 이어지자 나는 자신이 아직 말하지 않은 것을 떠올렸다. 망서 객잔에서 소에게 들었던 말이었다. 각청에게는 물자 일에 대한 증언만 남겼다. 그때는 자기 이야기를 더 보태면 이미 혼란스러운 일이 꼬일 것 같았다. 지금 와서 그 판단이 참사를 막을 기회를 놓친 것인지 따져도 답은 나오지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_109",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "한 가지 더 있어요. 소를 만났을 때 제 주변에 죽음과 생명의 냄새가 같이 난다고 했습니다. 마신에 대한 강한 혐오도 느껴진다고요. 저는 그런 마음이 없다고 했고, 그분도 그게 누구 건지까지 말하지는 않았습니다. 각청에게는 아직 전하지 못했어요."
      }
    ],
    "ISK_L02_K2_110": [
      {
        "node": "ISK_L02_K2_110",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "소에게서 직접 들었다는 말이지. 그 말을 듣고 난 뒤 자네에게 달라진 점이 있었나? 누군가 그것을 알아보았다고 하거나, 자네가 스스로 느낀 변화가 있던가?"
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_111",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "딱 잘라 말할 변화는 없어요. 오늘 일을 전부 그 말에 붙이면 설명한 것 같을 텐데, 그렇게 할 근거는 없잖아요. 제가 가까이 있어서 죽었다는 걸 본 것도 아니고요. 그냥 저만 남았습니다. 그게 지금 제일 무섭습니다."
      }
    ],
    "ISK_L02_K2_112": [
      {
        "node": "ISK_L02_K2_112",
        "profile": null,
        "speaker": null,
        "text": "류운차풍진군은 내 마지막 말에서 질문을 멈췄다. 그때까지 자신이 구슬을 가지고 있지 않다는 사실을 이상할 만큼 여러 번 떠올리고 있었음을 깨달았다. 설산에서 구슬을 보았지만 가져오지는 않았다. 그곳에서 보았다는 자기 말에 덧붙여, 지금 직접 보여 줄 물건은 없었다. 그 빈손을 마치 아무 관련도 없다는 증거처럼 내밀지 않기로 했다."
      },
      {
        "node": "ISK_L02_K2_113",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "이 몸은 소가 전한 말을 가볍게 여기지 않네. 그렇다고 들은 말 하나로 지금의 모든 죽음에 주인을 정해 주지도 않을 것이야. 자네가 모르는 것을 견디지 못해 아무 답이나 붙잡는다면, 다음에 보는 것도 그 답에 맞춰 바꾸게 되겠지."
      }
    ],
    "ISK_L02_K2_116": [
      {
        "node": "ISK_L02_K2_116",
        "profile": null,
        "speaker": null,
        "text": "그녀는 나에게 자신이 무엇을 이미 알고 있는지 낱낱이 풀어놓지 않았다. 오래된 인연의 이름을 들려주며 안심시키지도 않았다. 대신 지금 들은 이야기에서 무엇을 확인할지 스스로 정했다. 그 태도에서 자신이 원작의 중요한 장면을 맞혀 보이는 손님이 아니라, 실제 현장에서 소식을 가져온 사람으로 대우받고 있다는 것을 느꼈다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_117",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "저도 내려가겠습니다. 그분 짐이 있던 곳으로요. 집이 어디인지, 기다리는 사람이 누군지는 아직 모르지만… 적어도 무슨 일이 있었는지 물을 사람이 있으면 제가 대답해야죠. 아까는 너무 무서워서 아무것도 못 했어요."
      }
    ],
    "ISK_L02_K2_118": [
      {
        "node": "ISK_L02_K2_118",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "지금 내려가겠다고 벌떡 일어나지는 말게. 산길은 자네가 후회하는 만큼 짧아지는 것이 아니야. 다리의 힘이 돌아오는지부터 보고, 빛이 남은 구간만 움직이게. 해가 지면 안전하게 쉴 곳에서 멈춰. 사람을 대신해 소식을 전하려거든 소식을 가진 몸부터 무사히 데려가야 하네."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_119",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "말씀은 잘 알겠는데, 들을수록 제가 되게 관리가 안 된 짐짝 같네요. 그래도 내려가는 길에서는 떨어뜨리지 않도록 해 보겠습니다. 돌아가서 또 아무 말도 못 하고 서 있으면, 오늘 산을 오른 보람이 없으니까요."
      }
    ],
    "ISK_L02_K2_120": [
      {
        "node": "ISK_L02_K2_120",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "떨어뜨리지 않도록 해 보겠다는 말은 장담이 아니니 마음에 드는군. 다만 이 몸의 충고를 전부 짐짝에 빗대어야 알아듣는 버릇은 고치는 편이 좋겠네. 앉아 있을 수 있을 때는 더 앉아 있게. 자네가 일어서는 속도로 이 몸의 판단까지 재촉할 필요는 없어."
      },
      {
        "node": "ISK_L02_K2_121",
        "profile": null,
        "speaker": null,
        "text": "조금 더 앉아 있었다. 무언가를 해야 한다는 마음과 몸이 움직일 수 있다는 사실을 처음으로 따로 생각했다. 나를 재촉할 짐꾼은 없었다. 그 빈자리를 당장 메우지 못해도, 살아서 돌아가 본 일을 말하는 것까지 포기할 필요는 없었다."
      },
      {
        "node": "ISK_L02_K2_122",
        "profile": null,
        "speaker": null,
        "text": "산을 내려오는 길에서는 길을 잘못 들었다는 것을 알아차리면 곧장 돌아섰다. 이미 걸은 거리가 아깝다는 이유로 더 가 보지 않았다. 남은 힘을 계산하는 일이 조금은 나아진 듯했지만, 그것을 칭찬해 줄 사람에게 돌아가는 길은 아니었다. 그 사실을 생각할 때마다 보폭을 줄였다."
      }
    ],
    "ISK_L02_K2_126": [
      {
        "node": "ISK_L02_K2_126",
        "profile": null,
        "speaker": null,
        "text": "사람을 잘못 보았다고 생각하려 했다. 그러나 눈앞의 각청은 자기 이름을 부르는 사람에게 돌아보았고, 질문을 끝낸 사람에게 필요한 대답을 했다. 살아 있었다. 의례장에서 확인한 손목의 침묵과 이곳에서 움직이는 손이 한 사람의 것이었다. 그 사이에 들어갈 설명을 하나도 가지고 있지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L02_K2_127",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청, 너 어떻게 살아 있어? 나야. 포대 끈이 풀린 걸 봤다고 했던 사람. 의례에서 응광하고 이야기하게 해 달라고 했잖아. 네가 안 된다고 했고, 그 뒤에… 너도 죽었는데. 내가 확인했는데."
      }
    ],
    "ISK_L02_AA1_004": [
      {
        "node": "ISK_L02_AA1_004",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "도와줄 사람한테는 이 당주님이 직접 말을 걸어. 너 혼자 대기조를 만들고 혼자 근무표까지 짜지 말고. 오늘 일은 저 끈에 묻은 흙 털기야. 그건 여기 앉아서도 할 수 있어."
      },
      {
        "node": "ISK_L02_AA1_005",
        "profile": null,
        "speaker": null,
        "text": "호두는 가림틀의 긴 끈 한쪽을 내밀었다. 내가 손바닥으로 흙을 털자 가는 먼지가 무릎 위에 앉았다. 구슬을 보았던 직후에는 무슨 말로 다음 대화를 시작해야 할지 서로 잠깐 침묵했는데, 그 뒤의 대화는 이렇게 매듭과 바람과 앉을 자리에서 이어졌다. 사람은 이해하지 못한 일을 하나 품고도 다른 일을 할 수 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA1_006",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이름도 모르는 사람을 들고 다니는 게 이상해서 보여 준 건데, 보여 주고 나서도 달라진 게 없네. 네가 알아보지 못해서 하는 소리는 아니야. 그냥 어디에 모셔야 하는지조차 모르는데 내가 너무 태연한가 싶어서."
      }
    ],
    "ISK_L02_AA1_007": [
      {
        "node": "ISK_L02_AA1_007",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "태연한 사람이 아침부터 같은 매듭을 세 번 만지지는 않지. 그리고 이름을 모른다고 네가 아무렇게나 대한 건 아니잖아. 드러내기 전에 허락을 물었고, 보여 준 뒤에는 다시 잘 감쌌어. 지금 할 수 있는 일은 했어."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA1_008",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 내가 밥 먹는 동안까지 옆에서 미안해할 필요는 없다는 거지? 안 그래도 가방 놓고 숟가락 드는 데 순서가 생기기 시작했거든. 이러다 식사도 무슨 의식처럼 하겠어."
      }
    ],
    "ISK_L02_AA1_009": [
      {
        "node": "ISK_L02_AA1_009",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "배고픈 채로 예의를 지키면 예의도 오래 못 가. 밥은 살아 있는 네가 먹어. 대신 다른 사람들 앞에서 그분을 구경거리로 만들지 않는 것, 그건 계속 지키자. 내가 본 일도 허락 없이 풀어놓지는 않을게."
      },
      {
        "node": "ISK_L02_AA1_010",
        "profile": null,
        "speaker": null,
        "text": "끈의 마지막 매듭을 풀어 흙을 털었다. 호두의 말은 안에 있는 사람이 어떤 존재인지에 대한 답은 아니었다. 그러나 밥을 먹는 행동과 유해를 존중하는 행동을 서로 저울에 올리지 않아도 된다는 말은, 당장 점심을 앞둔 사람에게는 꽤 쓸모가 있었다."
      }
    ],
    "ISK_L02_AA1_012": [
      {
        "node": "ISK_L02_AA1_012",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "좋아. 끈 담당은 오늘로 끝, 내일은 내일 물어볼게. 대신 흙을 털었다고 내 신발 위로 몰아놓지는 마. 좋은 사람 흉내보다 청소한 사람 티부터 내야지."
      },
      {
        "node": "ISK_L02_AA1_013",
        "profile": null,
        "speaker": null,
        "text": "떨어진 흙을 발끝으로 한데 모았다. 호두는 더 큰 일을 얹지 않고, 마른 끈을 받아 직접 가림틀에 감았다."
      }
    ],
    "ISK_L02_AA1_015": [
      {
        "node": "ISK_L02_AA1_015",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그건 끈 한 번 털어 준 값으로 맡는 일이 아니야. 내가 본 것은 기억할게. 다만 네가 여기 없을 때 대신 결정해도 된다는 허락까지 받은 건 아니니까, 그건 네가 계속 해 줘."
      },
      {
        "node": "ISK_L02_AA1_016",
        "profile": null,
        "speaker": null,
        "text": "호두는 구슬 쪽을 다시 가리키거나 들여다보자고 하지 않았다. 가방 끈을 만지던 손을 내려놓고, 끝내 남은 흙부터 털었다."
      }
    ],
    "ISK_L02_AA1_017": [
      {
        "node": "ISK_L02_AA1_017",
        "profile": null,
        "speaker": null,
        "text": "며칠 동안 가림자리에는 각기 다른 용무가 지나갔다. 예정된 장례가 봉쇄 때문에 늦어진 집에서는 관을 옮길 수 있는지 물었고, 다른 집에서는 항구 밖에 남은 친척에게 소식만 먼저 전해 달라고 했다. 호두는 모든 사람에게 같은 말을 하지 않았다. 다급한 사람에게는 기다리는 장소를 짚어 주고, 이미 할 말을 다 한 사람에게는 빈 의자를 밀어 주었다. 가까이 있었지만 듣지 말아야 할 대화 앞에서는 천 바깥으로 나왔다."
      },
      {
        "node": "ISK_L02_AA1_018",
        "profile": null,
        "speaker": "왕생당 직원",
        "text": "당주님, 의례날 아침에 만나기로 한 분은 그대로 바깥 수레 쉼터로 오신답니다. 안쪽으로 들어갈 수 있을 거라 기대하셨는데, 아직은 어렵다고 다시 설명드렸습니다."
      },
      {
        "node": "ISK_L02_AA1_019",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그럼 약속은 바꾸지 말아요. 사람이 기다릴 자리를 우리가 헷갈리면 안 되니까. 가림틀도 그쪽에 하나 남겨 두고요. 나는 의례 통로 상황만 보고 정해 둔 시간 전에 돌아올게요."
      }
    ],
    "ISK_L02_AA1_023": [
      {
        "node": "ISK_L02_AA1_023",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "숨을 장소를 더 잘 고르라는 말은 아니었는데. 좋아, 돌아오면 네 자리는 비워 둘게. 자리값은 성공담이 아니라 네 발로 돌아오는 걸로 받지."
      },
      {
        "node": "ISK_L02_AA1_024",
        "profile": null,
        "speaker": null,
        "text": "나흘째 저녁에는 빌려 앉았던 낮은 의자의 다리가 흔들렸다. 내가 접은 천을 밑에 끼우자 호두는 의자 자체를 돌려 평평한 돌 위에 놓았다. 일을 해결하려고 천을 계속 더하는 사람과, 처음부터 앉을 땅을 바꾸는 사람이 나란히 서서 같은 의자를 내려다보았다. 그날의 웃음은 구슬이나 장례 때문에 나온 것이 아니었다. 닷새를 기다리는 동안에도 그런 저녁이 있었다."
      }
    ],
    "ISK_L02_AA1_026": [
      {
        "node": "ISK_L02_AA1_026",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "가방은 가지고 갈 수 있어. 다만 네가 말했던 물건을 사람들 앞에서 꺼내지는 마. 의례를 보는 자리에서 갑자기 유해가 나왔다고 소문이 돌면, 설명할 기회를 얻기도 전에 사람부터 몰릴 거야."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA1_027",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나도 그 사람을 내 입장권으로 쓰려는 건 아니야. 보여 주면 믿어 주겠지 싶어서 한 번 꺼냈다가, 다시 감쌀 때까지 무슨 표정을 해야 하는지도 모르겠더라. 오늘은 말을 할 수 있는 자리부터 구하고 싶어."
      }
    ],
    "ISK_L02_AA1_028": [
      {
        "node": "ISK_L02_AA1_028",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 점은 알아. 하지만 신을 향한 개인 질문 순서가 따로 보장되어 있는 건 아니야. 기회가 생기면 안내를 받되, 통제선을 넘어서 기회를 만들지는 마."
      },
      {
        "node": "ISK_L02_AA1_029",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "들었지? 용기만 챙겨서 줄을 새로 만드는 건 금지래. 나는 앞쪽 상황을 본 뒤에 돌아올 거야. 네가 오래 기다려도 바깥 약속은 먼저 지켜야 하니까, 나를 찾으러 안쪽으로 따라 들어가지는 말고."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA1_030",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "오늘은 다들 내가 뭔가 저지를 사람처럼 설명하네. 질문을 길게 쓰긴 했지만 담장을 넘는 순서까지 적지는 않았어. 돌아오는 길도 이쪽, 약속 장소는 수레 쉼터. 그 정도는 외웠어."
      }
    ],
    "ISK_L02_AA1_031": [
      {
        "node": "ISK_L02_AA1_031",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 정도를 지키지 않는 사람이 적지 않아서 설명하는 거야. 기억이 불안한 병사에게 안내를 전부 떠넘길 수도 없고. 길이 막히면 앞사람을 밀지 말고 멈춰. 나는 위에서 확인할게."
      },
      {
        "node": "ISK_L02_AA1_032",
        "profile": null,
        "speaker": null,
        "text": "각청은 대화를 끝내자마자 줄 옆으로 걸어가 뒤틀린 이동 차단대를 바로 세웠다. 그녀가 직접 차단대 다리를 밟아 고정하는 모습을 보며 앞사람과 거리를 벌렸다. 호두는 옆으로 비켜서 가림틀을 옮기는 직원과 마지막으로 손짓을 맞췄다. 여기서부터는 함께 걸어도 같은 일을 하러 가는 사람들은 아니었다."
      }
    ],
    "ISK_L02_AA1_035": [
      {
        "node": "ISK_L02_AA1_035",
        "profile": null,
        "speaker": null,
        "text": "누군가는 제단이 잘 보이는 위치를 골랐고, 누군가는 발끝에 흙이 묻었는지 옷을 털었다. 접어 둔 질문을 다시 꺼내지 않았다. 벤티에게조차 설명할 수 없었던 죽은 사람, 사라졌다 나타난 유해, 그것을 품은 구슬. 앞뒤를 모두 말하면 듣는 사람을 붙들어 놓는 시간이 길어질 것이 분명했다. 가장 먼저 무엇을 물어야 할지 정하는 사이, 의례의 시작을 알리는 움직임이 앞쪽에서 일어났다."
      },
      {
        "node": "ISK_L02_AA1_036",
        "profile": null,
        "speaker": null,
        "text": "하늘에서 거대한 몸이 떨어졌다. 돌바닥을 친 충격이 발바닥으로 올라오고, 제단 가까이 있던 사람들이 동시에 뒤로 물러섰다. 처음에는 누구도 그것을 어떤 말로 불러야 할지 정하지 못했다. 이어 암왕제군이라는 부름이 여기저기서 터졌다. 사람들 앞에 놓인 것은 모락스의 시신이라고밖에는 부를 수 없는 모습이었다. 내가 구하러 온 대답은 그 몸에서 들려오지 않았다."
      },
      {
        "node": "ISK_L02_AA1_037",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "제단 가까이 있는 사람은 천천히 뒤로 물러나. 밀지 말고, 넘어진 사람부터 일으켜. 지금 본 것을 밖으로 옮기겠다고 통로를 뛰어 내려가는 사람은 멈춰 세워. 확인되지 않은 말이 사람보다 먼저 항구에 도착하게 둘 수는 없어."
      }
    ],
    "ISK_L02_AA1_038": [
      {
        "node": "ISK_L02_AA1_038",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "오른쪽 통로를 비워! 왼쪽 줄은 제자리에서 기다려. 무릎을 다친 사람부터 저쪽에 앉히고, 사람을 데려갈 때는 혼자 두지 마. 기억이 흐릿해졌다면 즉시 다른 사람에게 인계를 해."
      },
      {
        "node": "ISK_L02_AA1_039",
        "profile": null,
        "speaker": null,
        "text": "각청은 넘어진 사람을 일으켜 통로 가장자리로 옮겼다. 천암군 병사 하나가 받은 지시를 되묻자 그녀는 짜증부터 내지 않고 손으로 가야 할 곳을 가리켰다. 이미 기억 문제로 팽팽했던 현장에 신의 시신까지 떨어져 있었다. 사람들은 자기 옆 사람이 무엇을 봤는지부터 확인하려 했고, 그 질문 때문에 발은 더욱 움직이지 않았다."
      }
    ],
    "ISK_L02_AA1_042": [
      {
        "node": "ISK_L02_AA1_042",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "지금 개인 면담은 안 돼. 응광은 현장 하나만 맡고 있는 게 아니야. 시신을 지키는 사람도 세워야 하고, 밖에 퍼질 말도 확인해야 해. 네 말은 내가 들었어. 여기에서 더 말하겠다면 내가 듣겠지만, 응광 앞으로 데려갈 수는 없어."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA1_043",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "처음부터 믿어 달라는 것도 아니잖아. 호두도 그 구슬 안에 있는 사람을 직접 봤어. 적어도 내가 혼자 꾸며 낸 이야기인지 물어볼 사람은 있어. 부탁할 곳을 하나씩 돌다가 또 아무것도 못 하면 어쩌지 싶어서 그래."
      }
    ],
    "ISK_L02_AA1_046": [
      {
        "node": "ISK_L02_AA1_046",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 부분까지 네가 직접 겪었다는 주장으로 남기겠어. 내가 확인했다고 바꾸지도, 듣기 편한 말로 줄이지도 않을 거야. 지금은 네 몸부터 통로 밖으로 빼. 뒤에서 사람이 밀려오고 있어."
      },
      {
        "node": "ISK_L02_AA1_047",
        "profile": null,
        "speaker": null,
        "text": "각청이 팔을 내밀어 나를 돌기둥 옆으로 옮겼다. 가방이 기둥에 닿지 않도록 받친 뒤 그녀의 손에서 한 발 떨어졌다."
      }
    ],
    "ISK_L02_AA1_049": [
      {
        "node": "ISK_L02_AA1_049",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "끝난 일이 아니야. 네가 자리를 옮기는 건 사람들을 움직일 공간이 필요해서야. 내가 다시 찾아야 한다면 가림자리에서 찾을 수 있다는 것도 알아. 지금 여기서 놓치지 않으려고 서로를 붙들고 있을 필요는 없어."
      },
      {
        "node": "ISK_L02_AA1_050",
        "profile": null,
        "speaker": null,
        "text": "각청은 말과 함께 기둥 뒤의 빈 바닥을 가리켰다. 그쪽으로 옮겨 서며, 적어도 다음에 자신을 어디서 찾을지는 알고 있는 사람이라는 생각을 했다."
      }
    ],
    "ISK_L02_AA1_051": [
      {
        "node": "ISK_L02_AA1_051",
        "profile": null,
        "speaker": null,
        "text": "응광은 제단 아래에서 짧은 보고를 들은 뒤 남아 있는 책임자에게 지시를 넘겼다. 경호를 맡은 사람들이 길을 열었고, 그녀는 내가 서 있던 곳과 다른 쪽 통로로 빠져나갔다. 내가 몸을 앞으로 기울였을 때는 이미 사람들 어깨에 가려져 있었다. 각청은 그 움직임을 보고 손바닥을 들어 제지했다."
      },
      {
        "node": "ISK_L02_AA1_052",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "쫓아가면 안 돼. 너만 움직이면 되는 길이 아니야. 방금까지 우리가 무슨 이야기를 했는지 잊지 않았지? 기다릴 장소를 바꿨다고 약속까지 없어지지는 않아."
      }
    ],
    "ISK_L02_AA1_055": [
      {
        "node": "ISK_L02_AA1_055",
        "profile": null,
        "speaker": null,
        "text": "손을 내려다보았다. 각청의 말대로 손가락 끝에 힘이 몰려 있었다. 끈을 놓으려다가 또 놓지 못했다. 바로 그때 옆에서 들리던 병사의 설명이 문장 중간에서 끊겼다. 사람들 사이에 작은 틈이 생긴 것 같았고, 다음 순간 그 틈이 바닥으로 무너졌다."
      },
      {
        "node": "ISK_L02_AA1_056",
        "profile": null,
        "speaker": null,
        "text": "병사의 창이 먼저 바닥을 쳤다. 뒤이어 그 병사가 쓰러졌고, 그를 붙잡으려던 사람도 같이 무너졌다. 비명으로 번질 틈이 없었다. 내 앞의 각청이 한쪽 무릎을 꺾으며 넘어졌고, 멀리 손을 들고 있던 사람도 그대로 바닥에 떨어졌다. 방금까지 시야 안에서 움직이던 사람 가운데 서 있는 사람은 나뿐이었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA1_057",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청, 잠깐만. 아까 나 보고 거기 있으라고 했잖아. 여기 있어. 그러니까 대답 좀 해. 내가 잘못 움직였으면 말해. 무슨 지시든 들을 테니까 일단 눈을 떠 봐."
      }
    ],
    "ISK_L02_AA1_058": [
      {
        "node": "ISK_L02_AA1_058",
        "profile": null,
        "speaker": null,
        "text": "각청은 대답하지 않았다. 몸을 받쳐 돌바닥에서 얼굴을 돌려 놓고, 호흡과 맥박을 확인하려 손을 옮겼다. 손이 떨려 한 번에 찾지 못하자 다시 잡았다. 가까운 병사에게 도움을 청하려 고개를 들었다가 그가 누워 있는 자세를 보았다. 조금 전 각청이 앉혀 주었던 사람도 더는 숨을 쉬지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA1_059",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "누구 없어요? 누가 좀 도와줘요! 여기에 사람이 쓰러졌어요. 한 사람이라도 대답해요. 어떻게 해야 하는지 아는 사람, 제발 아무나!"
      }
    ],
    "ISK_L02_AA1_060": [
      {
        "node": "ISK_L02_AA1_060",
        "profile": null,
        "speaker": null,
        "text": "목소리는 사람들의 몸 사이를 지나 돌기둥에 닿았다. 각청의 가슴이 움직이는지, 입가로 숨이 나오는지 거듭 확인했다. 도움을 부르면서 옆의 병사에게도 손을 뻗었다. 어느 쪽에서도 생명의 반응은 돌아오지 않았다. 이것은 사람들이 동시에 지쳐 앉은 일도, 잠깐 의식을 놓친 일도 아니었다. 방금 전까지 말하고 걸었던 사람들이 실제로 죽어 있었다."
      },
      {
        "node": "ISK_L02_AA1_061",
        "profile": null,
        "speaker": null,
        "text": "각청의 손을 놓지 못한 채 한동안 무릎을 꿇고 있었다. 다른 손으로 가방 안을 더듬었지만 천에 감긴 구슬을 쥐었을 뿐이었다. 그 안의 유해를 처음 보았던 날도 자신에게 되살릴 방법은 없었다. 모르는 힘이 이번에는 알아서 사람을 살려 줄 거라고 외치는 것은 구조가 되지 못했다. 구슬을 꺼내 다른 몸에 대거나 죽은 이에게 억지로 넣는 일도 하지 않았다."
      }
    ],
    "ISK_L02_AA1_064": [
      {
        "node": "ISK_L02_AA1_064",
        "profile": null,
        "speaker": null,
        "text": "각청의 손을 내려놓았다가 다시 잡았다. 손을 놓는 순간 죽음을 받아들이는 사람이 되는 것만 같았다. 그러나 계속 잡고 있어도 달라지는 것은 없었다. 다른 사람의 몸 위로 넘어지지 않게 일어서자 다리에 힘이 제대로 들어가지 않았다. 방금 전 자신의 길을 막았던 사람들이 모두 누워 있는 길은, 막혀 있을 때보다 훨씬 지나가기 어려웠다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA1_065",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "으아악…! 누가, 제발 누가 좀 와 줘요! 나는 여기서 더 못 하겠어. 혼자서는 못 해. 사람을 데려올게. 그러니까…."
      }
    ],
    "ISK_L02_AA1_069": [
      {
        "node": "ISK_L02_AA1_069",
        "profile": null,
        "speaker": null,
        "text": "가림틀 뒤에서 호두의 모자가 보였다. 그녀는 바깥에서 만나기로 했던 사람과 마주 앉아 있었다. 반가움보다 먼저 그 얼굴이 움직이는지 확인했다. 호두가 입을 열고 의자에서 일어나는 모습을 보고서야, 달려오며 쌓였던 숨이 한꺼번에 흐트러졌다."
      },
      {
        "node": "ISK_L02_AA1_070",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "무슨 일이야? 그대로 서 있어. 넘어지겠어. 여기 기대고, 가방은 네 무릎에 놔. 내가 잡아당기지 않을 테니까 끈부터 조금 놓자."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA1_071",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "죽었어. 다 죽었어. 위에 있던 사람들, 병사도, 각청도. 나만 그대로 서 있었어. 기다리라고 한 사람이 바로 내 앞에서 죽었는데… 내가 손을 잡았는데도 아무것도 안 됐어."
      }
    ],
    "ISK_L02_AA1_072": [
      {
        "node": "ISK_L02_AA1_072",
        "profile": null,
        "speaker": null,
        "text": "호두의 얼굴에서 남아 있던 웃음이 사라졌다. 그녀는 뒤쪽 직원에게 앉아 있던 손님을 다른 그늘로 안내해 달라고 짧게 부탁했다. 이미 장례 때문에 찾아온 사람에게 또 다른 죽음의 소식을 설명도 없이 쏟아 놓지 않도록, 대화의 자리부터 옮긴 것이다. 내가 손님을 따라가려는 눈길을 보내자 호두는 내 시야 앞으로 낮은 의자를 당겨 앉았다."
      },
      {
        "node": "ISK_L02_AA1_073",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "네가 말할 상대는 여기 있어. 저분한테 지금 설명하려고 하지 마. 먼저 어디에서 무슨 일이 있었는지 내게 알려 줘. 내가 없던 자리를 본 것처럼 말할 수는 없으니까, 네가 본 순서가 필요해."
      }
    ],
    "ISK_L02_AA1_077": [
      {
        "node": "ISK_L02_AA1_077",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "네가 한 말을 없애려고 묻는 게 아니야. 누가 어디에 있었는지 알아야 사람을 데려가도 엉뚱한 곳을 찾지 않지. 네가 그 죽음을 다시 설명해야 하는 건 잔인한 일이지만, 내가 멋대로 빈 곳을 채워서도 안 되잖아."
      },
      {
        "node": "ISK_L02_AA1_078",
        "profile": null,
        "speaker": null,
        "text": "호두는 물을 내밀면서도 마시라고 재촉하지 않았다. 컵을 받았지만 입가까지 올리지 못했다. 손가락 사이가 축축해졌고, 자신이 컵을 기울였다는 것을 늦게 알아차렸다. 호두는 젖은 바닥을 닦기 전에 컵 밑을 받쳐 놓았다. 아무것도 묻지 않는 친절보다 어디에 손을 두어야 하는지 알려 주는 동작이 먼저 들어왔다."
      }
    ],
    "ISK_L02_AA1_080": [
      {
        "node": "ISK_L02_AA1_080",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "나한테 돌아온 이유를 보기 좋게 꾸밀 필요는 없어. 무서워서 달린 것과, 여기까지 와서 사람들에게 알리는 건 같이 일어날 수 있어. 지금 네가 할 일은 혼자 못 지킨 약속을 더 크게 만드는 게 아니야. 어디로 가야 하는지 알려 줘."
      },
      {
        "node": "ISK_L02_AA1_081",
        "profile": null,
        "speaker": null,
        "text": "컵을 내려놓고 손가락으로 흙바닥에 굽은 통로를 그렸다. 선이 흔들려도 호두는 그 모양을 대신 바로잡지 않고 갈림길의 위치부터 물었다."
      }
    ],
    "ISK_L02_AA1_083": [
      {
        "node": "ISK_L02_AA1_083",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그러면 이름을 모른다고 남겨. 알아내기 전까지 죽은 분들이 없어지는 건 아니야. 가족을 찾는 일도 네 혼자 여기서 끝낼 수는 없어. 입었던 옷, 쓰러진 자리, 네가 실제로 들은 말부터 알려 줘. 내가 그걸 다 가족에게 바로 전하겠다고 약속하지도 않을게."
      },
      {
        "node": "ISK_L02_AA1_084",
        "profile": null,
        "speaker": null,
        "text": "사람들의 얼굴보다 먼저 신발과 넘어진 창을 떠올렸다. 남겨야 할 말이 생각보다 작고 구체적이라는 사실이 오히려 입을 열게 했다."
      }
    ],
    "ISK_L02_AA1_085": [
      {
        "node": "ISK_L02_AA1_085",
        "profile": null,
        "speaker": null,
        "text": "호두는 깨끗한 종이를 꺼내 내가 말한 통로의 위치를 적었다. 의례장의 정확한 인원수는 비워 두었다. 밖으로 먼저 나간 응광과 자신은 참사 현장에 없었다는 점도 따로 썼다. 각청이 누워 있던 돌기둥의 위치를 덧붙였다. 손을 잡고 확인한 사람과 멀리서 쓰러지는 모습을 본 사람을 뒤섞지 않으려고, 막혔던 말을 여러 번 다시 골라야 했다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA1_086",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이렇게 적고 있으니까 내가 보고서를 만드는 사람 같아. 안에 있는 사람들은 아직 그대로인데. 호두, 내가 이렇게 한 줄씩 말해도 되는 거야? 다급하게 뛰어가야 하는 거 아닌가 싶어서."
      }
    ],
    "ISK_L02_AA1_087": [
      {
        "node": "ISK_L02_AA1_087",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "뛰어가야 할 사람이 길도 모르고 뛰면 더 늦어. 나는 의례장에 남아 있지 않았고, 저 위가 지금 어떤 상태인지도 아직 몰라. 왕생당 직원들에게 구체적인 장소를 전하고 통제 담당에게 확인을 요청할 거야. 너에게 또 혼자 올라가서 확인하라고 시키지는 않을 거고."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA1_088",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 나는 여기 앉아 있는 사람이 되는 거네. 아까는 기다리다가 일이 났고, 이제는 도망쳐 와서 기다리고. 머리로는 네 말이 맞는 것 같은데 몸은 자꾸 일어나려고 해."
      }
    ],
    "ISK_L02_AA1_089": [
      {
        "node": "ISK_L02_AA1_089",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "일어나도 돼. 대신 갈 곳부터 정하고 일어나. 네가 어디에 있는지 나도 알아야 하니까. 기다리는 게 괴롭다고 아무 방향으로 달리면, 나중에는 네 소식까지 찾아야 하잖아."
      },
      {
        "node": "ISK_L02_AA1_090",
        "profile": null,
        "speaker": null,
        "text": "호두는 직원을 불러 통제선 담당에게 의례장 사망 목격 신고를 전달하도록 부탁했다. 직원은 들은 장소와 연락 자리를 되짚은 뒤 나갔다. 아직 현장에 도착했다는 회신도, 시신을 확인했다는 답도 없었다. 그가 보이지 않게 된 방향을 오래 바라보았다. 다른 사람이 걸어가는 속도는 자신이 달렸던 속도보다 느려 보였지만, 지금은 그쪽이 목적지를 알고 있었다."
      }
    ],
    "ISK_L02_AA1_093": [
      {
        "node": "ISK_L02_AA1_093",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "좋아. 가림천을 내리고 네가 직접 풀어. 내가 봤던 범위에서만 말할게. 구슬 안에 있다는 이유로 저 위의 일까지 전부 이 사람 탓으로 돌리지는 말자."
      },
      {
        "node": "ISK_L02_AA1_094",
        "profile": null,
        "speaker": null,
        "text": "무릎 위에 천을 펼쳤다. 급하게 당겨 매듭이 꼬이자 호두가 손을 뻗으려다 멈췄다. 잠깐 숨을 고르고 스스로 끈을 풀었다. 구슬은 처음부터 끝까지 내 손 안에 있었다. 호두는 바깥에서 보이는 모습만 살폈고, 그 안으로 손을 넣거나 어떤 의식을 시작하지 않았다."
      },
      {
        "node": "ISK_L02_AA1_095",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "내가 전에 본 그 모습이야. 보이는 범위에서 새로 움직이는 곳은 없어. 그렇다고 내가 이 구슬의 안쪽을 전부 아는 건 아니니, 네가 못 본 변화까지 없었다고 장담할 수는 없어."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA1_096",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내가 찾는 답은 저 사람을 다시 죽었다고 확인하는 말밖에 없네. 모락스에게 가면 이름 정도는 알 수 있지 않을까 했는데, 오늘은 이름 모르는 사람들이 더 생겼어."
      }
    ],
    "ISK_L02_AA1_097": [
      {
        "node": "ISK_L02_AA1_097",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그분의 이름을 찾으러 간 일이 잘못이었다고 생각하지는 마. 오늘 일어난 죽음의 이유를 네 질문에서 만들어 낼 수는 없어. 다만 지금은 당주도 모르는 것이 있어. 그걸 모른다고 말하지 않으면, 네가 다음에 믿어야 할 말까지 망가뜨리게 돼."
      },
      {
        "node": "ISK_L02_AA1_098",
        "profile": null,
        "speaker": null,
        "text": "구슬을 다시 감쌌다. 같은 죽은 유해는 여전히 그 안에 남아 있었다. 다른 시신이 더 들어오지도 않았고, 비어 있던 공간이 살아 있는 사람을 내보내지도 않았다. 호두가 그 모습을 다시 보았다는 사실만 새로 늘었다. 그것만으로 옥경대의 죽음과 구슬 사이의 원인을 잇지는 못했다."
      }
    ],
    "ISK_L02_AA1_104": [
      {
        "node": "ISK_L02_AA1_104",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "외곽 통제선까지는 가자. 안으로 들어가는 건 그때 확인하고. 대신 가는 동안 또 달리기 시작하면 내가 부를 거야. 부르면 멈춰. 이것만은 듣는 척하고 넘기지 말고."
      },
      {
        "node": "ISK_L02_AA1_105",
        "profile": null,
        "speaker": null,
        "text": "바닥에 내려두었던 가방을 멨다. 호두는 가림틀 안에 남을 직원에게 새로 온 손님을 혼자 돌려보내지 말고 기다릴 자리를 내어 달라고 부탁했다. 죽음을 알리는 일 때문에 출발하지만, 이미 바깥에서 기다리던 사람의 용무도 사라진 것은 아니었다. 모든 일을 한꺼번에 놓고 가거나 한꺼번에 끝낼 수는 없었다."
      }
    ],
    "ISK_L02_AA1_109": [
      {
        "node": "ISK_L02_AA1_109",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "죽은 분에게 네가 돌아왔다는 대답을 들을 수는 없겠지. 그래도 누군가 그분이 마지막에 어디 있었는지 물으면 네가 말할 수 있어. 무엇을 해 줄 수 있는지 전부 정한 사람만 돌아가는 건 아니야."
      },
      {
        "node": "ISK_L02_AA1_110",
        "profile": null,
        "speaker": null,
        "text": "통제선 가까이에서 병사 두 명이 길을 비켰다. 그 사이로 보라색 옷자락이 움직였다. 걸음을 멈췄다. 손을 펴고 닫는 동작, 병사의 말을 듣다가 직접 앞으로 나서는 걸음, 자신을 향해 고개를 돌리는 얼굴. 방금 전까지 누구에게 죽음을 알려야 할지 이야기하던 사람이 거기에 서 있었다."
      },
      {
        "node": "ISK_L02_AA1_111",
        "profile": null,
        "speaker": null,
        "text": "각청은 살아 있었다. 흉곽이 오르내렸고 사람의 목소리로 병사에게 지시했다. 내가 옥경대에서 확인했던 죽음이 기절이었다는 뜻은 아니었다. 죽었던 사람이 지금 살아 움직인다는 두 번째 사실이, 처음 사실을 지우지 않은 채 눈앞에 놓였다. 앞으로 다가가려다가 호두와 한 약속 때문에 멈췄다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA1_112",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청… 너, 어떻게 살아 있어? 내가 네 손을 잡았어. 위에서 네가 죽은 걸 확인했다고. 나한테 가림자리로 돌아가 있으라고 했잖아. 정말 나를 못 알아보겠어?"
      }
    ],
    "ISK_L02_AA2_004": [
      {
        "node": "ISK_L02_AA2_004",
        "profile": null,
        "speaker": "접수 담당 병사",
        "text": "돌 쪽이면 여기서 보입니다. 식사하러 자리를 비우실 때만 말씀해 주세요. 제가 교대하면 다음 담당에게 그 자리까지 알려 주겠습니다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_005",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "식사하러 가는 것도 말하고 움직이게 될 줄은 몰랐는데요. 괜히 제 기다림 때문에 그쪽 일만 늘린 건가 싶기도 합니다. 답이 오기 전에는 같은 질문 안 할 테니, 답이 없다고 제 이름부터 치우지는 말아 주세요."
      }
    ],
    "ISK_L02_AA2_006": [
      {
        "node": "ISK_L02_AA2_006",
        "profile": null,
        "speaker": "접수 담당 병사",
        "text": "기다리는 분이 잠깐 사라졌다고 문의까지 없애지는 않습니다. 대신 돌아오셨을 때 저 말고 다른 사람이 앉아 있으면, 그 사람에게도 이름은 다시 알려 주셔야 합니다."
      },
      {
        "node": "ISK_L02_AA2_007",
        "profile": null,
        "speaker": null,
        "text": "돌아가 돌 위에 앉았다. 목격자의 이름을 적을 때는 자신이 들고 온 이야기의 무게가 조금 나뉜 것 같았다. 그러나 답을 기다리는 동안에는 그 이름이 멀리 있는 사람에게 괜한 일을 떠넘기는 것이 아닌지 생각했다. 벤티도 답을 몰라 다른 신에게 가 보라고 했는데, 자신의 이름을 남긴 자리에 벤티의 이름까지 묶어 둔 셈이었다."
      },
      {
        "node": "ISK_L02_AA2_008",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "아직도 저 책상을 보고 있네. 의자도 아닌 돌하고 그 정도로 친해지면 엉덩이가 먼저 항의하지 않아? 오늘은 세 번 지나가며 봤는데, 볼 때마다 네 등이 같은 방향이야."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_009",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "사람은 안 친해졌고 돌하고만 친해졌다는 식으로 말하지 마. 저 병사랑은 식사 시간을 서로 알리는 사이까지 갔어. 이 정도면 여기서 할 수 있는 교류는 꽤 한 거야."
      }
    ],
    "ISK_L02_AA2_010": [
      {
        "node": "ISK_L02_AA2_010",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그럼 돌에게도 잠깐 다녀온다고 말하고 일어나. 저쪽 천이 말랐는지 보러 가는데, 너도 걸으면 좋잖아. 답이 네가 일어서자마자 달아나는 건 아닐 테니까."
      },
      {
        "node": "ISK_L02_AA2_011",
        "profile": null,
        "speaker": null,
        "text": "호두는 가방을 대신 들어 주려 하지 않았다. 내가 직접 몸에 붙여 메는 것을 기다린 뒤 앞장섰다. 둘은 접수처가 보이는 범위에서 천이 걸린 곳까지 걸었다. 호두는 구슬을 보여 달라는 말을 다시 꺼내지 않았다. 그 점 때문에 나는 오히려 언젠가 말해야 할 이야기를 조금 더 쉽게 입에 올릴 수 있었다."
      }
    ],
    "ISK_L02_AA2_017": [
      {
        "node": "ISK_L02_AA2_017",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "좋아. 멋있게 쓰려고 문장을 꾸미지는 마. 본 곳에서 못 본 곳으로 넘어가는 순간이 어디인지 네가 알아볼 수 있으면 돼. 글씨가 지저분하면 나중에 네가 고생하겠지만, 그건 이 당주님의 영역이 아니고."
      },
      {
        "node": "ISK_L02_AA2_018",
        "profile": null,
        "speaker": null,
        "text": "접힌 종이의 빈 쪽을 찾아 짧은 문장을 적었다. 호두는 가림천을 걷으면서도 그 종이 위로 고개를 들이밀지 않았다."
      }
    ],
    "ISK_L02_AA2_020": [
      {
        "node": "ISK_L02_AA2_020",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그 정도는 해 줄 수 있어. 네가 직접 본 건지, 그럴 거라고 생각한 건지 물어볼게. 다만 내가 질문했다고 다시 처음부터 끝까지 잘못된 말이라고 받아들이지는 말고. 그러면 둘 다 입을 열기가 어려워져."
      },
      {
        "node": "ISK_L02_AA2_021",
        "profile": null,
        "speaker": null,
        "text": "고개를 끄덕인 뒤 가방에서 자기 종이를 꺼냈다. 이야기를 외우는 대신 지금까지 본 장면의 순서를 적어 두기로 했다."
      }
    ],
    "ISK_L02_AA2_022": [
      {
        "node": "ISK_L02_AA2_022",
        "profile": null,
        "speaker": null,
        "text": "둘째 날과 셋째 날에는 같은 자리에 앉되 하루 종일 책상만 보지는 않았다. 물을 길러 오는 사람에게 길을 비키고, 접수 담당이 교대하면 고개를 들어 새로 자리에 앉은 얼굴을 확인했다. 처음 가림틀을 검사했다가 그 일을 기억하지 못했던 병사를 다시 보기도 했다. 그 병사는 그 뒤 나누었던 대화는 알아보았지만, 최초 검사가 어떻게 이루어졌는지는 여전히 설명하지 못했다. 반복해서 묻지 않았다. 상대가 난처한 얼굴을 한다고 잊힌 일이 돌아오지는 않았다."
      },
      {
        "node": "ISK_L02_AA2_023",
        "profile": null,
        "speaker": "접수 담당 병사",
        "text": "의례날에는 접수처가 여기와 통로 위쪽으로 나뉩니다. 현장에서 따로 전할 말이 생기면 같은 이름을 알려 주세요. 다만 여기서 기다리던 문의가 바로 의례장 책임자에게 올라간다는 뜻은 아닙니다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_024",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "통로 위에서도 당신이 계세요? 얼굴 아는 사람이 한 명 있으면 좋겠는데. 내가 처음부터 그 이상한 설명을 다시 시작하면 뒤에 줄 선 사람들이 나보다 먼저 지칠 것 같아서요."
      }
    ],
    "ISK_L02_AA2_025": [
      {
        "node": "ISK_L02_AA2_025",
        "profile": null,
        "speaker": "접수 담당 병사",
        "text": "그날 위쪽 안내를 맡을 예정입니다. 말씀하신 내용을 제가 전부 확인한 것은 아니지만, 누구인지와 왜 기다리고 계셨는지는 알아볼 수 있겠죠."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_026",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그것만으로도 좋습니다. 이름부터 다시 말하는 일이 사소한 줄 알았는데, 며칠 해 보니까 은근히 힘이 빠지더라고요. 그날 저를 보면 아는 사람인 척만 해 주세요. 실제로 아는 사이니까 거짓말도 아니고."
      }
    ],
    "ISK_L02_AA2_027": [
      {
        "node": "ISK_L02_AA2_027",
        "profile": null,
        "speaker": "접수 담당 병사",
        "text": "그렇게 거창한 부탁처럼 말씀하실 일은 아닙니다. 다만 의례가 시작되면 제가 안내하는 길로 움직여 주세요. 아는 얼굴이라고 옆문을 열어 드리지는 못합니다."
      },
      {
        "node": "ISK_L02_AA2_028",
        "profile": null,
        "speaker": null,
        "text": "웃으며 손을 들었다. 나흘째 저녁까지도 몬드에서 온 확인 회신은 없었다. 답이 없다는 사실을 거절로 바꾸지도, 접수가 되었다는 사실을 확인 완료로 바꾸지도 않았다. 가방 안에는 같은 구슬과 같은 유해가 있었고, 가방 바깥 주머니에는 이번에 적은 자신의 말이 들어 있었다. 어느 쪽도 아직 내가 누구인지, 죽은 사람은 누구인지 온전히 설명해 주지는 못했다."
      }
    ],
    "ISK_L02_AA2_031": [
      {
        "node": "ISK_L02_AA2_031",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "준비는 다 했어? 천에 묶은 건 그대로 두고, 물어볼 말만 챙겨. 길 위에서 만난 사람마다 처음부터 끝까지 설명하다 보면 정작 도착해서 목소리가 안 나올지도 모르잖아."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_032",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "대본을 외워야 할지 고민했는데, 그냥 내가 말하다가 헷갈릴 부분만 적었어. 신을 만나러 가는 사람이 이렇게 종이를 자꾸 접었다 펴도 되는지는 모르겠네. 바짝 긴장한 손님 티가 날 텐데."
      }
    ],
    "ISK_L02_AA2_033": [
      {
        "node": "ISK_L02_AA2_033",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "네 손이 그렇게 생긴 걸 어떡해. 종이 모서리 때문에 대답을 안 해 줄 거라면 네가 글씨를 반듯하게 쓴다고 달라지겠어? 필요한 말을 잊지 않는 쪽으로 챙겨."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_034",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "너도 올라가? 전에 길을 좀 안다고 했으니까 옆에 있으면 덜 헤맬 것 같은데. 보여 주지 않았다고 모르는 사람 행세를 하라는 부탁은 안 할게."
      }
    ],
    "ISK_L02_AA2_035": [
      {
        "node": "ISK_L02_AA2_035",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "초입까지만 같이 가. 가림틀 하나가 바깥에서 쓰이게 돼서 직원한테 넘겨야 하거든. 기다리는 집안 사람이 있어서 내가 약속 시간을 미룰 수는 없어. 오늘은 네 질문도 내 일도 각자 발로 찾아가야지."
      },
      {
        "node": "ISK_L02_AA2_036",
        "profile": null,
        "speaker": null,
        "text": "호두는 수레를 모는 직원에게 돌아올 시간을 다시 확인했다. 구슬 속 유해의 정체와 관계없는 일, 지금 바깥에서 가족의 장례를 준비하는 사람들의 일이었다. 그녀가 끝까지 동행하지 않는 것이 자신을 믿지 않기 때문이라는 생각을 밀어냈다. 다른 사람에게도 미리 정해 둔 약속이 있었다."
      },
      {
        "node": "ISK_L02_AA2_037",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "접수처에 있던 사람이지. 네 문의는 아직 확인 중이야. 여기서 회신이 없다는 말을 또 하게 되겠지만, 들어오려면 알아 두는 편이 낫겠어. 오늘 통로를 연다고 문의 처리 방식까지 달라지는 건 아니야."
      }
    ],
    "ISK_L02_AA2_044": [
      {
        "node": "ISK_L02_AA2_044",
        "profile": null,
        "speaker": null,
        "text": "통로 위에서 접수 담당 병사가 나를 알아보고 고개를 끄덕였다. 긴 이야기를 새로 시작하지 않아도 되는 순간이었다. 나도 같은 정도로 고개를 숙인 뒤 지정된 자리에 섰다. 사람들 사이에서는 의례 뒤에 통제가 얼마나 풀릴지, 집으로 돌아갈 수 있을지 같은 말이 오갔다. 신에게 물어볼 말보다 오늘 저녁의 거처가 먼저인 사람들도 많았다."
      },
      {
        "node": "ISK_L02_AA2_045",
        "profile": null,
        "speaker": "접수 담당 병사",
        "text": "여기에서 기다리시면 됩니다. 앞으로 사람이 몰리면 뒤로 물러나 주세요. 전하실 말이 생기면 손을 드시고요. 아까 약속한 대로, 옆쪽 줄로 혼자 빠지시면 안 됩니다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_046",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "어제 한 말까지 챙겨서 반복하시네요. 이제 제 이름보다 옆문 안 열린다는 말을 먼저 기억할 것 같습니다. 알았어요. 질문을 하더라도 줄 안에서 할게요."
      }
    ],
    "ISK_L02_AA2_047": [
      {
        "node": "ISK_L02_AA2_047",
        "profile": null,
        "speaker": null,
        "text": "병사가 조금 웃고 다음 사람에게 돌아섰다. 가방 바깥 주머니를 눌러 종이가 있는지 확인했다. 유해의 신원을 알고 싶다는 말부터 할지, 구슬에 들어간 이유를 묻겠다는 말부터 할지 아직 정하지 못했다. 의례의 시작을 알리는 움직임이 앞쪽에서 일어났을 때도 나는 입 안에서 첫 문장을 고르고 있었다."
      },
      {
        "node": "ISK_L02_AA2_048",
        "profile": null,
        "speaker": null,
        "text": "거대한 몸이 하늘에서 떨어져 제단 쪽을 덮쳤다. 돌바닥이 울리고 사람들의 시선이 위에서 아래로 꺾였다. 누구도 이 광경을 보려고 줄을 선 것은 아니었다. 암왕제군을 부르는 목소리가 터졌고, 곧 모락스의 시신이라는 말이 사람들 사이를 지나갔다. 가방을 감싸 쥔 손을 풀지 못했다. 자신에게 답해 줄 거라고 기대했던 신이, 이제 다른 사람들이 설명해야 하는 몸으로 놓여 있었다."
      },
      {
        "node": "ISK_L02_AA2_049",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "제단 주위를 비워. 앞줄은 물러나되 뒤의 사람을 밀지 마. 누가 어디에서 무엇을 봤는지 확인할 테니, 지금은 각자 있던 위치를 기억해 둬. 말이 먼저 달리게 두지 말고 사람부터 안전하게 옮겨."
      },
      {
        "node": "ISK_L02_AA2_050",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "통로 위에서 멈춰 서서 뒤를 돌아보지 마! 넘어지면 바로 손을 들어. 서로 다른 지시를 들었으면 지금 말하고, 누구도 혼자 사람을 데려가지는 마. 바깥 줄은 아직 움직이지 않도록 전달해."
      },
      {
        "node": "ISK_L02_AA2_051",
        "profile": null,
        "speaker": null,
        "text": "기억하라는 말에 몇몇 병사들의 얼굴이 더 굳었다. 이미 짧은 기억 공백을 겪은 사람들이 있는 현장이었다. 다른 사람이 기억하지 못할까 봐 같은 말을 되풀이하는 사람과, 누가 자기 지시를 바꿨는지 확인하느라 발을 떼지 못하는 사람이 함께 섞였다. 각청은 그 사이를 걸어 직접 길을 나누었다."
      }
    ],
    "ISK_L02_AA2_058": [
      {
        "node": "ISK_L02_AA2_058",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "네가 걱정하는 부분은 들었어. 다만 지금 신의 시신도 반드시 사라진다는 예고처럼 퍼뜨리면 안 돼. 현장의 목격 내용은 따로 확인하게 할게. 네가 알고 있는 일을 말하는 것과 다음 일을 확정하는 것은 구분해 줘."
      },
      {
        "node": "ISK_L02_AA2_059",
        "profile": null,
        "speaker": null,
        "text": "각청은 곁에 있던 병사에게 목격 위치를 확인하라는 지시를 전했다. 구슬을 꺼내 보이라는 요구는 하지 않았다."
      }
    ],
    "ISK_L02_AA2_061": [
      {
        "node": "ISK_L02_AA2_061",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그럼 그 말 그대로 남겨. 네가 모르는 이유까지 채울 필요는 없어. 다만 지금 이곳의 혼란을 더 키우지 않게, 나와 담당 병사에게만 먼저 이야기해 줘. 필요한 때에 네가 직접 설명할 자리도 찾을게."
      },
      {
        "node": "ISK_L02_AA2_062",
        "profile": null,
        "speaker": null,
        "text": "각청은 나를 통로 벽 쪽으로 옮겨 세웠다. 입을 막으려는 자리가 아니라 다른 사람들이 지나갈 수 있도록 비켜선 자리였다."
      }
    ],
    "ISK_L02_AA2_063": [
      {
        "node": "ISK_L02_AA2_063",
        "profile": null,
        "speaker": null,
        "text": "제단 가까이에서 보고를 듣던 응광이 책임자 몇 명에게 마지막 지시를 넘겼다. 그녀는 다른 통로로 이동했고 내가 볼 수 있는 범위에서 사라졌다. 그쪽으로 움직이려던 발을 각청이 막았다. 멈추면서 종이가 든 주머니를 다시 눌렀다. 접힌 모서리가 손바닥에 닿았다."
      },
      {
        "node": "ISK_L02_AA2_064",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "안 돼. 방금도 말했지. 응광을 따라가서는 안 돼. 네 이야기는 내가 들었고, 접수 담당도 네가 누구인지 알아. 지금 혼자 움직이면 너를 찾는 일부터 다시 해야 해."
      }
    ],
    "ISK_L02_AA2_067": [
      {
        "node": "ISK_L02_AA2_067",
        "profile": null,
        "speaker": null,
        "text": "접수 담당 병사가 위쪽에서 내려오는 줄을 확인하려 돌아섰다. 그가 자신을 알아보았던 조금 전의 표정을 기억했다. 모든 사람이 자신을 처음부터 믿어야 하는 것은 아니었다. 누군가는 이야기의 시작만 알고, 누군가는 이름만 알고 있어도 이어갈 수 있을 것이다. 그렇게 생각하는 순간 병사의 몸이 옆으로 무너졌다."
      },
      {
        "node": "ISK_L02_AA2_068",
        "profile": null,
        "speaker": null,
        "text": "처음에는 다른 사람이 밀었는지 보려고 고개를 돌렸다. 그러나 병사 뒤의 사람도, 그 옆에서 손을 뻗던 사람도 함께 쓰러지고 있었다. 살아 있는 몸들이 서로를 부축하는 움직임은 끝까지 이어지지 못했다. 각청이 입을 열어 무엇인가 말하려 했지만 목소리가 나오기 전에 몸이 꺾였다. 내가 팔을 받쳤을 때에는 이미 전해지던 힘이 사라져 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_069",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청! 나 여기 있어. 가방도 안 열었고, 줄 밖으로도 안 갔어. 그러니까 이쪽 좀 봐. 나한테 뭘 하라고 해 줘. 지금은 어디로 가야 하는지도 모르겠어."
      }
    ],
    "ISK_L02_AA2_070": [
      {
        "node": "ISK_L02_AA2_070",
        "profile": null,
        "speaker": null,
        "text": "각청을 조심스럽게 눕히고 손목과 목가를 번갈아 확인했다. 호흡이 없었다. 맥박도 돌아오지 않았다. 확인을 잘못했을까 봐 자세를 바꾸고 다시 살폈지만 결과는 바뀌지 않았다. 앞에 쓰러진 접수 담당 병사에게 다가가 이름 대신 직무를 불렀다. 닷새 동안 자신의 이름을 불러 주던 사람의 이름을 자신은 끝내 물어보지 않았다는 사실이 그때 들어왔다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_071",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "접수처에 계셨잖아요. 저를 안다고 했잖아요. 제가 왔어요. 눈 좀 떠 보세요. 아무도 대답을 안 해요. 어떻게 해야 합니까, 제가 뭘 해야 해요?"
      }
    ],
    "ISK_L02_AA2_072": [
      {
        "node": "ISK_L02_AA2_072",
        "profile": null,
        "speaker": null,
        "text": "그 병사도 이미 죽어 있었다. 멀리 있던 사람들이 한꺼번에 쓰러진 모습만 본 것이 아니라, 나는 가까운 두 사람에게서 생명이 끝났다는 것을 직접 확인했다. 각청의 죽음과 병사의 죽음은 실제였다. 주변의 다른 사람들도 다시 몸을 일으키지 않았다. 한 장소를 채우던 숨과 목소리가 끊긴 뒤, 아직 움직이고 있는 사람은 나 하나였다."
      },
      {
        "node": "ISK_L02_AA2_073",
        "profile": null,
        "speaker": null,
        "text": "사람들 사이에서 도움을 불렀다. 대답이 돌아오지 않아 목소리가 점점 커졌다. 누구라도 자신을 본다면 이 상황을 같이 겪는 사람이 될 텐데, 시선을 마주칠 상대가 없었다. 가방 바깥 주머니의 종이가 몸을 숙일 때마다 옆구리에 걸렸다. 받아 적은 말은 그대로 있는데 그것을 알아볼 사람들이 눈앞에서 죽어 있었다."
      }
    ],
    "ISK_L02_AA2_076": [
      {
        "node": "ISK_L02_AA2_076",
        "profile": null,
        "speaker": null,
        "text": "누군가 들을 때까지 계속 말하면 될 것 같았지만, 말은 현장에 남은 사람을 더 살아 있게 만들지 못했다. 일어나려다가 주저앉았다. 자신을 알아보던 사람이 죽었다는 사실이 자기 존재까지 끌고 내려가는 것처럼 느껴졌다. 종이를 꺼내 이름을 보여 주고 싶다는 엉뚱한 생각도 들었다. 이름을 보여 줄 눈이 더는 움직이지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_077",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "으아악! 안 돼, 나는 여기 못 있어. 사람을 불러와야 해. 나중에… 나중에 다시 설명할게. 내가 어디 있었는지, 전부 말할 테니까."
      }
    ],
    "ISK_L02_AA2_081": [
      {
        "node": "ISK_L02_AA2_081",
        "profile": null,
        "speaker": null,
        "text": "접수 책상에는 다른 병사가 앉아 있었다. 처음 보는 얼굴이라는 이유로 내 걸음이 멎었다. 닷새 동안 기다린 자리인데도, 자신을 처음부터 다시 설명해야 하는 곳이 되어 있었다. 책상 앞에서 서성이자 병사가 고개를 들었다. 뒤쪽에는 의례에 가지 않고 연락을 기다리는 사람들이 남아 있었다."
      },
      {
        "node": "ISK_L02_AA2_082",
        "profile": null,
        "speaker": "교대 병사",
        "text": "무슨 용무십니까? 의례 참석자는 이쪽에서 새로 줄을 서지 않습니다. 안에서 나오셨다면 어느 통로를 이용했는지 먼저 말씀해 주세요."
      }
    ],
    "ISK_L02_AA2_085": [
      {
        "node": "ISK_L02_AA2_085",
        "profile": null,
        "speaker": null,
        "text": "화가 날 뻔했다. 사람들이 죽었다는데 이름과 위치부터 묻는 태도가 참을 수 없었다. 그러나 자신이 도착한 곳에는 실제로 살아 있는 사람들이 있었고, 모여 있는 이들 가운데 누가 누구의 가족인지 알지도 못했다. 책상 끝으로 옮겨 서며 손바닥으로 입을 문질렀다. 분노를 버린 것이 아니라 지금 여기서 어떻게 말을 건네야 할지 골랐다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_086",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "직접 봤어요. 듣고 뛰어온 게 아닙니다. 올라갔던 의례 통로의 윗부분, 사람들이 줄을 정리하던 곳이에요. 응광은 그 전에 떠났고, 남아 있던 사람들한테 일이 났어요. 호두는 거기에 없었어요. 내가 본 자리에 있던 사람들만 말하는 거예요."
      }
    ],
    "ISK_L02_AA2_087": [
      {
        "node": "ISK_L02_AA2_087",
        "profile": null,
        "speaker": "교대 병사",
        "text": "알겠습니다. 제가 이 자리에서 모두의 상태를 확인했다고 할 수는 없습니다. 안쪽 통제 담당에게 연락하겠습니다. 일단 그곳을 떠난 시점과 되돌아온 길을 설명해 주십시오. 지금 추가로 들어가려는 사람부터 막아야 합니다."
      },
      {
        "node": "ISK_L02_AA2_088",
        "profile": null,
        "speaker": null,
        "text": "병사는 옆에 있던 동료에게 위쪽 통제 상태를 확인해 달라고 요청했다. 그 동료가 떠났지만 곧바로 현장 보고가 돌아온 것은 아니었다. 아침에 길을 안내받은 지점을 종이 뒤쪽에 표시했다. 그때 가림틀을 옮기던 직원에게 이야기를 들은 호두가 접수처로 왔다. 그녀는 먼저 내가 앉을 자리가 있는지 보고, 그다음 병사가 적는 내용을 살폈다."
      },
      {
        "node": "ISK_L02_AA2_089",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "무슨 일이 있었는지는 아직 자세히 못 들었어. 네가 신고하러 왔다고만 들었지. 내가 대신 목격자가 되어 줄 수는 없지만, 네가 오늘 왜 올라갔는지와 그 전부터 여기에서 무엇을 기다렸는지는 말할 수 있어."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_090",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그것만 말해 줘. 내가 갑자기 어디서 튀어나온 사람이 아니라는 거. 내 안에 있는 사람을 보여 줘야만 내가 봤다는 말도 들을 수 있는 건 아니잖아. 지금까지 같이 있었던 시간은 있으니까."
      }
    ],
    "ISK_L02_AA2_091": [
      {
        "node": "ISK_L02_AA2_091",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "응. 네 가방은 닫아 두어도 돼. 내가 보지 않은 유해를 보았다고 말하지 않고도, 네가 닷새 동안 이곳에 있었다는 말은 할 수 있지. 두 가지를 억지로 묶지 말자."
      },
      {
        "node": "ISK_L02_AA2_092",
        "profile": null,
        "speaker": null,
        "text": "호두는 교대 병사에게 나와 외곽에서 만난 경위, 구슬 속 유해에 관한 설명을 들었으나 실물은 보지 않았다는 점, 의례 통로 초입에서 헤어졌다는 점을 짧게 전했다. 참사 현장을 보았다고 주장하지는 않았다. 그 말이 끝날 때까지 끼어들지 않았다. 자신의 이야기가 다른 사람의 입에서 나와도, 그 사람이 본 것만 남는 모습을 처음 차분히 들었다."
      }
    ],
    "ISK_L02_AA2_094": [
      {
        "node": "ISK_L02_AA2_094",
        "profile": null,
        "speaker": "교대 병사",
        "text": "직접 목격했다는 신고로 받겠습니다. 원인 불명이라는 부분도 함께 남기겠습니다. 지금 적은 위치가 맞는지 여기만 확인해 주십시오. 조사 결과가 나온 것은 아니라는 점도 구분해 두겠습니다."
      },
      {
        "node": "ISK_L02_AA2_095",
        "profile": null,
        "speaker": null,
        "text": "병사의 손끝이 가리킨 곳을 보고 자신이 돌아 내려온 길을 수정했다. 아는 척 빈틈을 채우는 대신, 보지 못한 갈림길은 비워 두었다."
      }
    ],
    "ISK_L02_AA2_097": [
      {
        "node": "ISK_L02_AA2_097",
        "profile": null,
        "speaker": "교대 병사",
        "text": "이전 문의는 따로 두고, 오늘 현장에서 보신 일부터 받겠습니다. 이름을 남겨 두시면 추가 확인이 필요할 때 다시 묻겠습니다. 지금 모두 설명하려고 서두르지 않으셔도 됩니다."
      },
      {
        "node": "ISK_L02_AA2_098",
        "profile": null,
        "speaker": null,
        "text": "주머니에서 자기 메모를 꺼내 펼쳤다. 구슬 안의 유해에 관한 글이 있는 쪽은 접고, 오늘 이동한 곳을 적은 뒷면부터 가리켰다."
      }
    ],
    "ISK_L02_AA2_100": [
      {
        "node": "ISK_L02_AA2_100",
        "profile": null,
        "speaker": null,
        "text": "신고하는 동안 옆에서 기다리던 한 사람이 가까이 왔다. 의례를 보러 먼저 올라간 지인이 아직 돌아오지 않았다고 했다. 그 사람의 질문을 듣기도 전에 얼굴을 들지 못했다. 자신이 위에서 본 시신 가운데 그 지인이 있었는지 알 수 없었다. 이름이나 옷차림을 들으면 기억해 낼 수 있을 것 같다가도, 모르겠다고 하면 상대를 또 기다리게 만들 것 같았다."
      },
      {
        "node": "ISK_L02_AA2_101",
        "profile": null,
        "speaker": "기다리던 사람",
        "text": "혹시 통로 위에서 푸른 겉옷을 입은 남자를 보셨습니까? 저보다 먼저 올라갔는데 내려오는 길이 막혔다고만 해서요. 무슨 일이 있었던 겁니까?"
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_102",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "위쪽에 큰일이 있어서 통제를 확인하고 있어요. 내가 직접 본 사람들이 쓰러진 자리도 있었고요. 하지만 당신이 찾는 분이 거기에 있었다고는 말할 수 없어요. 얼굴도 이름도 모르니까… 여기 담당에게 함께 알려 주세요. 제가 그 사람을 봤다고 꾸며서 대답할 수는 없어요."
      }
    ],
    "ISK_L02_AA2_103": [
      {
        "node": "ISK_L02_AA2_103",
        "profile": null,
        "speaker": null,
        "text": "상대의 얼굴이 굳었다. 더 나은 말을 찾으려 입을 열었다가 멈췄다. 살아 있을 것이라고 보장하는 것도, 이미 죽었다고 가두는 것도 자신이 할 수 없는 말이었다. 호두가 옆으로 와 기다리는 사람에게 찾는 이의 이름과 마지막으로 헤어진 장소를 물었다. 그 대화에서 한 걸음 물러났다."
      },
      {
        "node": "ISK_L02_AA2_104",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "이쪽 그늘에서 말씀해 주세요. 길 한가운데 서 계시면 찾는 분이 내려와도 서로 못 볼 수 있어요. 제가 함께 들을게요. 지금 알 수 없는 부분은 알 수 없다고 두고, 마지막으로 연락된 곳부터 찾아보죠."
      },
      {
        "node": "ISK_L02_AA2_105",
        "profile": null,
        "speaker": null,
        "text": "가방을 의자 밑에 두려다 무릎으로 올렸다. 천의 매듭은 출발할 때와 같았다. 보여 주지 않은 유해가 있다는 사실 때문에 자신이 무엇인가를 숨긴 범인처럼 느껴지는 순간도 있었지만, 그 느낌이 원인의 증거가 되는 것은 아니었다. 주머니에 든 개인 메모와 방금 접수된 신고도 서로 다른 종이였다. 자신이 들고 있는 글만으로 위쪽에 남은 사람들을 대신할 수는 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_106",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "호두, 잠깐만. 나는 저 사람한테 도움이 되는 말을 못 했어. 죽었다고도 못 하고 괜찮다고도 못 하고. 막상 직접 본 사람이 되고 나니까 오히려 아무 말이나 할 수가 없네."
      }
    ],
    "ISK_L02_AA2_112": [
      {
        "node": "ISK_L02_AA2_112",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "알겠어. 나는 안을 보지 않았고, 봤다는 식으로 말을 보태지도 않을 거야. 네가 나중에 마음을 바꾸더라도 오늘의 설명을 거꾸로 바꾸지는 말자. 지금은 그대로 감싸 두면 돼."
      },
      {
        "node": "ISK_L02_AA2_113",
        "profile": null,
        "speaker": null,
        "text": "매듭을 더 세게 조이지 않았다. 이미 묶인 천을 확인하고 손을 떼는 것으로 끝냈다."
      }
    ],
    "ISK_L02_AA2_115": [
      {
        "node": "ISK_L02_AA2_115",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "좋아. 필요하면 네가 말을 고를 시간을 벌어 줄 수는 있어. 하지만 네 눈으로 본 일을 내 기억인 것처럼 가져가지는 않을게. 당주님이 남의 장부까지 전부 맡는 건 아니거든."
      },
      {
        "node": "ISK_L02_AA2_116",
        "profile": null,
        "speaker": null,
        "text": "호두는 마지막 말을 조금 가볍게 했지만 웃음을 요구하지 않았다. 나도 억지로 웃는 대신 종이를 반듯하게 접어 주머니에 넣었다."
      }
    ],
    "ISK_L02_AA2_117": [
      {
        "node": "ISK_L02_AA2_117",
        "profile": null,
        "speaker": null,
        "text": "바깥 통제선을 오가는 연락 담당은 있었지만, 내가 신고한 현장의 확인 결과는 아직 돌아오지 않았다. 교대 병사는 무작정 다시 올라가지 말고 외곽 책임자에게 오늘 나온 길을 설명할 수 있다고 안내했다. 접수된 신고를 두고 돌아서야 하는지 고민했다. 기다리기만 하는 동안 자신의 설명에서 빠진 길이 하나 떠올랐다. 각청이 사람들을 옮기려던 기둥 옆, 갈라지는 줄의 방향이었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_118",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "바깥 담당에게 길을 다시 설명하러 갈게. 위쪽으로 혼자 들어가겠다는 건 아니야. 아까 뛰어 내려오느라 어느 줄이 막혀 있었는지 말을 제대로 못 했어. 내가 가 본 데까지는 알려 줄 수 있을 것 같아."
      }
    ],
    "ISK_L02_AA2_119": [
      {
        "node": "ISK_L02_AA2_119",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그렇게 해. 나는 찾는 사람 소식을 기다리는 분과 여기 있을게. 네가 어디로 가는지는 이 담당에게도 알리고 가. 돌아오는 길에 나를 못 만나면 여기에서 기다려. 서로 찾느라 다른 길로 움직이지 않게."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_120",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알았어. 이번에는 달려서 사라지지 않을게. 내가 없는 동안 답이 와도 내 이름을 치우지는 말아 달라고, 그 말만 또 하게 되네. 아침에는 귀찮게 굴지 말자고 다짐했는데."
      }
    ],
    "ISK_L02_AA2_121": [
      {
        "node": "ISK_L02_AA2_121",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "네가 돌아올 자리가 필요하다는 말 정도는 여러 번 해도 돼. 대신 어디에든 잠깐 서서 네 이름을 말할 수는 있을 거야. 그렇게 말하고 움직이자. 지금처럼."
      },
      {
        "node": "ISK_L02_AA2_122",
        "profile": null,
        "speaker": null,
        "text": "교대 병사에게 외곽 책임자 쪽으로 다녀오겠다고 알렸다. 몬드에서 올 회신은 여전히 미도착이었다. 호두는 그 사이에 유해를 살펴보겠다며 가방을 맡기라고 하지 않았고, 나도 두고 가지 않았다. 장례와 실종된 사람을 걱정하는 이들의 대화가 이어지는 자리에서, 자신이 다음에 말을 전할 상대를 찾아 일어섰다."
      }
    ],
    "ISK_L02_AA2_125": [
      {
        "node": "ISK_L02_AA2_125",
        "profile": null,
        "speaker": null,
        "text": "병사 한 명이 책임자가 저쪽에 있다며 길을 비켜 주었다. 고개를 숙이고 그 옆을 지나다 멈췄다. 각청이 책상에서 일어나 이쪽으로 돌아서고 있었다. 방금 죽음을 접수했던 이름, 되돌아오는 길을 가르쳐 준 사람, 맥박과 호흡을 직접 확인했던 몸이 지금 살아서 자신을 보고 있었다."
      },
      {
        "node": "ISK_L02_AA2_126",
        "profile": null,
        "speaker": null,
        "text": "종이를 꺼내려던 손을 주머니 안에 둔 채 굳었다. 각청의 몸은 사람의 호흡에 맞춰 움직였고, 눈은 새로운 방문자를 살피고 있었다. 자신이 봤던 죽음이 잘못된 것이었다는 생각으로 넘어갈 수는 없었다. 실제 죽음은 이미 일어났고, 지금 살아 있다는 사실이 그 뒤에 추가되었다. 그 사이를 이어 줄 설명만 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AA2_127",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청, 너… 어떻게 살아 있는 거야? 위에서 죽었잖아. 내가 확인했고, 방금 네가 죽었다고 내 이름까지 적어서 신고했어. 닷새 동안 접수처에서 기다린 사람, 가방을 닫아 두라고 네가 말했던 사람. 나를 알아보겠지?"
      }
    ],
    "ISK_L02_AB1_004": [
      {
        "node": "ISK_L02_AB1_004",
        "profile": null,
        "speaker": null,
        "text": "둘은 의자를 기둥의 그늘 안으로 옮겼다. 병사는 앉기 전에 바닥이 평평한지 발뒤꿈치로 눌렀다. 그 동작을 기억해 두려다 멈췄다. 사람을 만날 때마다 무엇을 나중에 잊을지부터 찾는 습관이 생기는 것 같았다."
      },
      {
        "node": "ISK_L02_AB1_005",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "오늘도 처음부터 이야기해야 합니까? 지난번 말한 것과 달라질까 봐 자꾸 머릿속으로 반복했더니, 나중에는 정말 기억하는 건지 제가 외운 건지 구분이 잘 안 됩니다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_006",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "오늘은 의자를 잘못 옮기면 둘 다 넘어졌다는 이야기부터 해도 돼. 지난번 빈 부분을 채우러 온 건 아니야. 내가 모르는 걸 네가 반드시 알아내 줘야 하는 것도 아니고."
      }
    ],
    "ISK_L02_AB1_007": [
      {
        "node": "ISK_L02_AB1_007",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "다행입니다. 저도 빈 부분 대신 다른 이야기를 하고 싶었습니다. 이런 말을 하면 일을 피하는 것처럼 들릴까 봐서요."
      },
      {
        "node": "ISK_L02_AB1_008",
        "profile": null,
        "speaker": null,
        "text": "병사는 부츠 앞에 묻은 흙을 나뭇가지로 털었다. 집에서는 흙 묻은 신발로 문턱을 밟으면 먼저 한 소리를 듣는다고 했다. 조사를 받은 뒤부터는 제집 앞에서도 먼저 이름을 물을까 두렵다는 말은 그다음에 나왔다. 웃으며 시작한 이야기를 어디서 멈춰야 할지 모르는 얼굴이었다."
      }
    ],
    "ISK_L02_AB1_010": [
      {
        "node": "ISK_L02_AB1_010",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "아내에게 그렇게 말하면 저더러 신발 얘기는 빼라고 할 겁니다. 기억이 멀쩡하던 날에도 똑같이 혼났거든요. 그 일까지 병 탓으로 돌리면 이번에는 정말 쫓겨날지도 모르고요."
      },
      {
        "node": "ISK_L02_AB1_011",
        "profile": null,
        "speaker": null,
        "text": "병사가 처음으로 눈가를 느슨하게 했다. 기억이 사라지기 전부터 가지고 있던 실수도 있었다. 그 사실에 조금 안심했고, 병사도 상대가 더 묻지 않는 것을 알아차렸다."
      }
    ],
    "ISK_L02_AB1_013": [
      {
        "node": "ISK_L02_AB1_013",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "저를 낫게 할 이유라고는 안 하시는군요. 처음엔 그게 좀 서운했는데, 지금은 차라리 그쪽이 덜 겁납니다. 모두가 괜찮아질 거라고만 하면, 안 괜찮은 제가 약속을 어기는 기분이어서요."
      },
      {
        "node": "ISK_L02_AB1_014",
        "profile": null,
        "speaker": null,
        "text": "병사는 가지를 내려놓고 먼지가 묻은 손바닥을 털었다. 두 사람은 그늘이 조금 더 길어질 때까지 같은 의자에 있었다. 더 좋은 말을 찾아내느라 상대를 붙잡을 필요는 없었다."
      }
    ],
    "ISK_L02_AB1_015": [
      {
        "node": "ISK_L02_AB1_015",
        "profile": null,
        "speaker": null,
        "text": "각청이 돌아왔을 때 나는 의자 아래에 굴러간 물병 마개를 찾고 있었다. 그녀는 발끝으로 마개를 막아 세우고 손을 내밀었다. 올려다보자 서류보다 먼저 마개가 눈앞에 와 있었다."
      },
      {
        "node": "ISK_L02_AB1_016",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "바닥에 닿았으니까 씻어서 써. 그리고 의자를 이쪽으로 옮긴 건 잘했어. 햇빛을 피하려고 벽에 기대던 사람들이 통로를 막고 있었거든."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_017",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이것도 성과에 넣어 줘. 면담 두 번, 의자 한 번, 물병 마개 회수에는 네 도움이 조금 있었음. 적다 보면 나도 꽤 바빴어."
      }
    ],
    "ISK_L02_AB1_018": [
      {
        "node": "ISK_L02_AB1_018",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "성과에 넣을 거라면 의자는 둘이 옮겼다고 적어. 네가 혼자 끌었다간 앉아 있던 사람까지 넘어뜨릴 뻔했다는 이야기를 방금 들었으니까."
      },
      {
        "node": "ISK_L02_AB1_019",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "넘어지지는 않았습니다. 그 뒤에는 호흡이 맞았고요."
      },
      {
        "node": "ISK_L02_AB1_020",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그럼 됐어. 여기서부터는 네가 쉬는 시간이야. 앞으로 조사 때문에 부르면 이유부터 알려 주겠어. 부르지 않았을 때는 내 발소리가 난다고 일어나지 마."
      },
      {
        "node": "ISK_L02_AB1_021",
        "profile": null,
        "speaker": null,
        "text": "각청은 병사가 경례하려고 들었던 팔을 내려놓을 때까지 기다렸다가 나를 옆으로 불렀다. 회복을 기다리는 사람에게 일의 빈자리를 설명하지 않는 편이 낫다고 했다. 그녀의 눈 밑에 남은 피로를 보았다. 다른 사람의 빈자리를 더 채우는 쪽은 여전히 각청이었다."
      }
    ],
    "ISK_L02_AB1_024": [
      {
        "node": "ISK_L02_AB1_024",
        "profile": null,
        "speaker": null,
        "text": "각청은 의자 끝에 앉아 싸 온 음식을 꺼냈다. 내 시선이 닿자 자기 몫이라고 먼저 말했다. 그 단호함이 오히려 반가웠다. 누군가의 머릿속에서 빠진 시간을 채우지 않고도 점심 한 끼는 지나갈 수 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_025",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "안 뺏어 먹어. 남의 점심까지 받아 가면 여기 머무르는 이유가 조금 없어 보이잖아. 냄새만 맡는 건 봉쇄 대상 아니지?"
      }
    ],
    "ISK_L02_AB1_026": [
      {
        "node": "ISK_L02_AB1_026",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "지금은 아니야. 그런데 그렇게 오래 쳐다보면 먹는 사람 쪽에서 임시 조치를 검토할 수는 있겠지."
      },
      {
        "node": "ISK_L02_AB1_027",
        "profile": null,
        "speaker": null,
        "text": "그녀는 음식을 씹는 동안 정말로 일을 말하지 않았다. 나도 의자 반대쪽에 기대었다. 말없이 앉아 있어도 당장 필요한 사람인지 증명하지 않아도 되는 시간이, 닷새 가운데 처음으로 남았다."
      },
      {
        "node": "ISK_L02_AB1_028",
        "profile": null,
        "speaker": null,
        "text": "이어지는 날에는 같은 질문을 덜 했다. 병사가 먼저 말하고 싶다고 한 날에만 면담 자리를 폈고, 대답의 앞뒤가 달라져도 현장에서 옳은 쪽을 고르라고 몰아붙이지 않았다. 기다리는 시간이 길면 일이 쉬울 줄 알았다. 실제로는 기다리는 동안 상대의 얼굴을 보고도 성급한 결론을 입 밖에 내지 않는 일이 더 어려웠다."
      },
      {
        "node": "ISK_L02_AB1_029",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "처음에 네게 도움을 청한 건 몬드의 일을 겪은 사람이라서였어. 여기서 똑같은 일을 알아볼 거라 기대한 건 아니고. 그런데 사람들이 자꾸 네가 해결책을 가지고 왔느냐고 묻지?"
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_030",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내 표정이 좀 유능해 보이나 봐. 하루쯤은 그 착각을 즐기고 싶었는데, 정작 나한테 묻는 사람들이 너무 간절해서 못 그러겠더라."
      }
    ],
    "ISK_L02_AB1_031": [
      {
        "node": "ISK_L02_AB1_031",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그러면 내가 소개를 잘못한 거야. 낯선 사람에게 털어놓기가 편한 말도 있겠다고 생각했는데, 기대까지 네게 떠넘길 필요는 없었어. 다음에는 내가 먼저 바로잡겠어."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_032",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "네가 몬드까지 와서 부탁했을 때 내가 거절할 수도 있었어. 따라온 걸 전부 네 실수로 만들면 내 선택까지 작아져. 대신 돌아가고 싶다고 말하면 용기 부족 점수 같은 건 매기지 마."
      }
    ],
    "ISK_L02_AB1_033": [
      {
        "node": "ISK_L02_AB1_033",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그런 점수는 없어. 다만 돌아갈 때는 말해 줘. 네가 사라지면 찾아다니는 사람도 생길 테니까. 내가 직접 데려온 사람이니까 더 그렇고."
      },
      {
        "node": "ISK_L02_AB1_034",
        "profile": null,
        "speaker": null,
        "text": "대답하기 전에 초소를 돌아보았다. 며칠 전에는 외국의 낯선 기둥이던 것이, 지금은 누가 언제 기대어 서는지 아는 물건이 되어 있었다. 다이루크가 몬드에서 자리를 지키듯 각청에게도 돌아와 확인할 사람이 있었다. 그 사람들 사이에 자신도 잠깐 들어왔다는 생각이 들었다."
      }
    ],
    "ISK_L02_AB1_036": [
      {
        "node": "ISK_L02_AB1_036",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 정도는 나도 기억해. 갈림길마다 쉬어 가자고 하던 것도. 네가 사라졌다가 다른 사람이 나타난 척해도 걷는 속도로 알아볼 수 있겠네."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_037",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "걷는 속도가 신분증이 될 줄은 몰랐어. 다음 여행에서는 조금 더 빠르게 걸어야겠는데."
      }
    ],
    "ISK_L02_AB1_040": [
      {
        "node": "ISK_L02_AB1_040",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "네가 직접 말해. 나는 사실을 확인해 달라고 하면 확인해 주겠어. 사람들의 말을 재촉하지 않았고, 모르는 걸 안다고 하지 않았다고."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_041",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 정도면 꽤 괜찮다. 검을 멋지게 휘둘렀다는 이야기는 빼도 되겠네. 안 한 일을 묘사하려면 동작부터 고민해야 하거든."
      }
    ],
    "ISK_L02_AB1_043": [
      {
        "node": "ISK_L02_AB1_043",
        "profile": null,
        "speaker": null,
        "text": "행사 전날, 면담했던 병사가 초소 근처에 매단 가림천의 끈을 고쳐 묶었다. 그는 내일 옥경대로 올라가는 길의 질서를 돕는다고 했다. 기억이 빈 일 이후 혼자 인계 업무를 맡는 대신, 눈앞의 사람들이 넘어지지 않게 길을 나누는 자리였다. 그가 돌아오면 그늘이 충분히 남아 있겠다고 생각했다."
      },
      {
        "node": "ISK_L02_AB1_044",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "내일은 저를 보고 바로 면담 이야기를 꺼내지 마십시오. 의례 보러 온 사람들 앞에서 이번에는 제 이름 대신 그 일로 불리고 싶지 않습니다. 도와 달라는 일이 생기면 제가 먼저 말씀드리겠습니다."
      }
    ],
    "ISK_L02_AB1_051": [
      {
        "node": "ISK_L02_AB1_051",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "왔구나. 내려가는 길도 올라온 쪽이야. 일이 생기면 반대편 골목으로 빠지려고 하지 말고 안내하는 사람부터 찾아. 오늘은 네가 조사하려고 움직일 필요 없어."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_052",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 말을 여기 올라오기 전에 한 번 더 해 줬으면 좋았을걸. 내가 쉬는 날이라는 걸 의자한테만 알리고 왔거든. 그래도 네가 직접 말했으니까 오늘은 제대로 구경해 볼게."
      }
    ],
    "ISK_L02_AB1_053": [
      {
        "node": "ISK_L02_AB1_053",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "기대에 맞을지는 모르겠네. 익숙한 사람도 오늘은 예민해. 병사들 상태를 보러 왔다고 생각하면 몸짓 하나에도 자꾸 이유를 붙이게 될 테니, 적어도 시작할 때는 앞을 봐."
      },
      {
        "node": "ISK_L02_AB1_054",
        "profile": null,
        "speaker": null,
        "text": "그녀가 가리킨 곳에는 응광이 있었다. 이름과 직함을 들었을 뿐 개인적으로 말해 본 적이 없었다. 관람객들의 목소리가 잦아들고 의례가 시작되었다. 위쪽의 움직임을 좇던 고개들이 한꺼번에 더 높이 들렸다. 예상했던 신호를 알아본 동작은 아니었다."
      },
      {
        "node": "ISK_L02_AB1_055",
        "profile": null,
        "speaker": null,
        "text": "거대한 몸이 허공에서 떨어졌다. 부딪치는 소리에 가까운 난간이 떨렸고, 앞줄 사람들이 본능적으로 뒤로 물러났다. 뒤쪽에서는 무엇이 일어났는지 보지도 못한 사람들이 떠밀렸다. 먼지 사이로 늘어진 몸을 본 누군가가 암왕제군을 불렀다. 그 호칭이 퍼지고 나서야 나는 모락스의 시신이라고 여겨지는 존재가 눈앞에 떨어졌음을 이해했다."
      }
    ],
    "ISK_L02_AB1_057": [
      {
        "node": "ISK_L02_AB1_057",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "뒤쪽 사람부터 멈춰 세워. 앞이 무슨 상황인지 모른 채 밀고 있어. 확인되지 않은 말을 전달하려고 뛰는 사람은 붙잡아 두되, 넘어지는 사람을 막는 길까지 닫지는 마."
      },
      {
        "node": "ISK_L02_AB1_058",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "내가 이쪽 통로를 비울게. 난간에 기대지 말고 가운데로 돌아서! 앞사람이 멈추면 너도 멈춰. 지금 밀면 내려갈 수 있는 길까지 막혀."
      },
      {
        "node": "ISK_L02_AB1_059",
        "profile": null,
        "speaker": null,
        "text": "옆 사람의 팔을 받쳤다. 그늘로 의자를 함께 옮겼던 병사도 통로 아래에서 손을 벌리고 있었다. 익숙한 목소리가 들리자 잠깐 숨이 돌아왔다. 사람들이 서로의 얼굴을 알아보며 버티는 사이, 응광은 가까운 수행원에게 따로 지시하고 몸을 돌렸다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_060",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청, 응광과 잠깐 이야기하게 해 줘. 몬드에서 죽었다고 알려진 드발린이 다시 나타났고, 없어졌던 시신도 있었어. 그 이야기를 여기서 남들한테 먼저 퍼뜨리는 것보다 직접 말하는 게 낫겠어."
      }
    ],
    "ISK_L02_AB1_061": [
      {
        "node": "ISK_L02_AB1_061",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "지금은 안 돼. 네가 말한 몬드의 일은 내가 알고 있어. 그 사실을 무시해서가 아니라 이 자리에서 비공개 면담을 만들 수 없어서 그래. 여기 있는 사람들을 먼저 안전한 곳으로 옮겨야 해."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_062",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그러니까 네가 아는 내용까지 다시 증명하자는 게 아니야. 저분이 떠나기 전에 내가 직접 본 부분만 말하겠다는 거야. 이번에도 나중에 가 봤더니 아무것도 없는 자리가 될까 봐 그래."
      }
    ],
    "ISK_L02_AB1_063": [
      {
        "node": "ISK_L02_AB1_063",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "네가 왜 조급한지 알아. 하지만 저 몸과 드발린이 같은 일을 겪었다는 증거는 아직 없어. 연결된 일처럼 소문이 나면 확인해야 할 사람들까지 그 결론을 믿고 움직여. 내가 전달할 테니 지금은 이 선을 넘지 마."
      },
      {
        "node": "ISK_L02_AB1_064",
        "profile": null,
        "speaker": null,
        "text": "각청은 길을 가로막으면서도 나를 병사들에게 밀어 넘기지 않았다. 직접 데려온 사람에게 직접 설명하려고 멈춰 선 얼굴이었다. 응광은 이미 수행원들과 시야 밖으로 떠나고 있었다. 여기 남은 나에게 면담을 허락하거나 거절하는 말을 남기지는 않았다."
      }
    ],
    "ISK_L02_AB1_066": [
      {
        "node": "ISK_L02_AB1_066",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그렇게 정리하지 않아. 네가 처음 몬드의 일을 설명할 때부터 그건 구분했어. 지금은 손을 난간에서 떼. 네 뒤 사람이 움직이면 손가락이 끼겠어."
      },
      {
        "node": "ISK_L02_AB1_067",
        "profile": null,
        "speaker": null,
        "text": "각청은 설명을 마치자마자 내 손과 밀려오는 사람을 함께 보았다. 큰 약속 뒤에 사소한 위험을 놓치지 않는 모습이, 닷새 동안 알게 된 그녀와 같았다."
      }
    ],
    "ISK_L02_AB1_069": [
      {
        "node": "ISK_L02_AB1_069",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "길 한가운데 서서 지휘하려고 하지는 마. 왼쪽으로 빠지는 사람에게 난간 끝이 좁아진다고 알려 줘. 네가 밀리면 저 기둥 뒤로 물러나고. 네 앞에 있는 사람까지만 도와."
      },
      {
        "node": "ISK_L02_AB1_070",
        "profile": null,
        "speaker": null,
        "text": "역할은 작았지만 곧바로 할 수 있었다. 기둥을 확인한 뒤 돌아섰다. 각청은 내가 지시를 이해했는지 한 번 보고 다음 줄을 향해 손을 들었다."
      }
    ],
    "ISK_L02_AB1_071": [
      {
        "node": "ISK_L02_AB1_071",
        "profile": null,
        "speaker": null,
        "text": "소리가 먼저 줄어든 것 같기도 했다. 그러나 나중에 돌아보면 그 순서조차 확실히 말할 수 없었다. 내가 붙들던 사람의 몸에서 힘이 풀리고, 통로 아래 병사의 팔이 떨어졌다. 각청이 돌아서는 동작을 끝내기 전에 무릎이 꺾였다. 기둥 옆에 섰던 사람부터 멀리 줄 끝에 있던 사람까지, 시야 안에서 움직이던 몸들이 한꺼번에 무너졌다."
      },
      {
        "node": "ISK_L02_AB1_072",
        "profile": null,
        "speaker": null,
        "text": "넘어지는 사람을 떠받치려다가 같이 주저앉았다. 목에 걸린 숨소리나 신음이 뒤따르기를 기다렸지만 들리지 않았다. 방금 팔꿈치로 자신을 밀던 사람이 눈을 뜬 채 아무것도 보지 않았다. 흔들리는 천만이 사람들 위로 움직였다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_073",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청, 일어나. 지금 장난칠 때 아니야. 방금 사람들 밀리지 않게 하라고 했잖아. 나 혼자서는 어느 쪽으로 보내야 하는지도 몰라. 내 말 들리면 손이라도 움직여 봐."
      }
    ],
    "ISK_L02_AB1_074": [
      {
        "node": "ISK_L02_AB1_074",
        "profile": null,
        "speaker": null,
        "text": "각청의 어깨를 받쳐 눕혔다. 대답이 없자 입가와 가슴을 살피고 목 옆에 손을 댔다. 두 번, 세 번 바꾼 손의 위치보다 자기 손가락의 떨림이 더 분명했다. 떨림이 가라앉기를 기다린 뒤 다시 확인해도 각청에게서 숨과 맥박은 돌아오지 않았다."
      },
      {
        "node": "ISK_L02_AB1_075",
        "profile": null,
        "speaker": null,
        "text": "오래 확인한 것은 각청뿐이 아니었다. 아래쪽 병사에게도 기어가 투구를 벗기고 숨길을 살폈다. 뒤쪽에서 주저앉은 노인과, 노인을 붙잡던 상인도 같았다. 기절한 사람들이 깨어나기를 기다리는 자리가 아니었다. 나를 제외하고 그 현장에 있던 사람들은 실제로 죽어 있었다."
      }
    ],
    "ISK_L02_AB1_084": [
      {
        "node": "ISK_L02_AB1_084",
        "profile": null,
        "speaker": null,
        "text": "다시 누군가를 불렀다. 명령하는 목소리라도 욕하는 목소리라도 돌아오기를 바랐다. 자신이 지나치게 요란하다고 따지는 사람이 하나쯤 있어야 했다. 대답이 없자 목소리는 문장이 되지 못하고 찢어졌다. 통로를 채운 자기 비명이 너무 낯설어, 나는 그것을 다른 사람의 소리처럼 피해 몸을 돌렸다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_085",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "도와주세요. 여기 사람이 죽었어요. 아무나 대답 좀 해 주세요. 제발, 누구라도 여기 살아 있으면 대답해 주세요!"
      }
    ],
    "ISK_L02_AB1_089": [
      {
        "node": "ISK_L02_AB1_089",
        "profile": null,
        "speaker": "교대 병사",
        "text": "왜 혼자 오셨습니까? 옥경대로 올라간 사람들이 돌아올 시간은 아직이라고 들었는데요. 손을 좀 펴 보세요. 다치신 겁니까, 다른 사람 피가 묻은 겁니까?"
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_090",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "여기 계속 있었어? 의례 쪽으로 간 적 없어? 누가 잠깐 쓰러졌다든가, 네가 뭘 하고 있었는지 기억이 안 난다든가 하는 일은 없었어?"
      }
    ],
    "ISK_L02_AB1_091": [
      {
        "node": "ISK_L02_AB1_091",
        "profile": null,
        "speaker": "교대 병사",
        "text": "아침 교대하고 여기서 불 지폈습니다. 저와 같이 있던 사람도 있고요. 질문에 대답은 하겠습니다만, 우선 앉으세요. 서 있다가 넘어지면 제가 붙들 수 있는 쪽으로라도 와 주십시오."
      },
      {
        "node": "ISK_L02_AB1_092",
        "profile": null,
        "speaker": null,
        "text": "그는 나를 붙잡기 전에 손을 내밀어도 되는지 눈으로 물었다. 그 손이 움직이는 모습을 오래 보았다. 손가락이 구부러지고 팔에 힘이 들어가는 일이 믿기 어려울 만큼 크게 느껴졌다. 각청의 손목에서 찾으려 했던 움직임이었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_093",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청이 죽었어. 나랑 이야기하던 병사도, 그 앞에 서 있던 사람들도. 다 한꺼번에 쓰러졌는데 아무도 숨을 안 쉬었어. 응광은 먼저 나갔고, 그 사람까지 어떻게 됐는지는 몰라. 내가 보고 온 건 거기야."
      }
    ],
    "ISK_L02_AB1_094": [
      {
        "node": "ISK_L02_AB1_094",
        "profile": null,
        "speaker": "교대 병사",
        "text": "옥형님이요? 직접 확인하셨습니까? 아니, 같은 말을 다시 하시라는 뜻은 아닙니다. 지금 당장 누구를 어디로 보내야 하는지 알아야 해서요. 그분을 마지막으로 본 곳을 가리킬 수 있겠습니까?"
      },
      {
        "node": "ISK_L02_AB1_095",
        "profile": null,
        "speaker": null,
        "text": "통로가 있는 방향을 손으로 짚었다. 손이 떨려 방향을 잘못 가리킨 것처럼 보이자 팔꿈치를 무릎에 눌렀다. 교대 병사는 내가 입을 열 때마다 서둘러 되묻지 않았다. 그러나 말이 끝나기도 전에 믿었다고 고개를 끄덕이지도 않았다. 옆에 있던 동료를 불러 실제 확인할 사람을 구해 오라고 부탁했다."
      },
      {
        "node": "ISK_L02_AB1_096",
        "profile": null,
        "speaker": "교대 병사",
        "text": "저는 그 자리에 없었습니다. 그래서 여기서 옥형님의 상태를 단정해 전달할 수는 없습니다. 다만 의례 통로에 다수의 사람이 쓰러졌고 목격자가 구조를 요청했다고는 바로 알리겠습니다. 당신이 확인한 내용도 빼지 않겠습니다."
      }
    ],
    "ISK_L02_AB1_101": [
      {
        "node": "ISK_L02_AB1_101",
        "profile": null,
        "speaker": "교대 병사",
        "text": "아침에 저한테도 그런 말을 했습니다. 오늘만큼은 길 안내를 잘하는 병사로 서 있고 싶다고요. 당신이 이야기를 들어 줬다는 말을 덧붙였습니다. 제가 아는 건 거기까지입니다."
      },
      {
        "node": "ISK_L02_AB1_102",
        "profile": null,
        "speaker": null,
        "text": "컵을 내려놓았다. 상대가 자신을 위로하려고 더 좋은 마지막 말을 만들지 않았다는 사실을 알 수 있었다. 병사는 아침에 직접 들은 한 문장 뒤를 비워 두었다. 그 빈자리에 마음대로 행복한 결말을 써넣을 사람은 없었다."
      }
    ],
    "ISK_L02_AB1_104": [
      {
        "node": "ISK_L02_AB1_104",
        "profile": null,
        "speaker": "교대 병사",
        "text": "기억합니다. 제가 말을 길게 했을 때, 앞사람과 같은 답을 해야 하는 건 아니라고 하셨죠. 오늘 처음 보는 분이라면 갑자기 물부터 드리진 않았을 겁니다. 적어도 제게는 그 며칠이 남아 있습니다."
      },
      {
        "node": "ISK_L02_AB1_105",
        "profile": null,
        "speaker": null,
        "text": "눈을 감았다가 떴다. 한 사람이 기억하고 있다는 말이 다른 사람들의 죽음을 되돌리지는 못했다. 그래도 지금 자신이 서 있는 곳이 어디인지 붙들 수 있게 했다. 컵을 천천히 들어 남은 물을 마셨다."
      }
    ],
    "ISK_L02_AB1_106": [
      {
        "node": "ISK_L02_AB1_106",
        "profile": null,
        "speaker": null,
        "text": "초소의 동료가 돌아와 앞쪽 연결 길에는 사람이 있으며, 구조 요청을 넘길 수 있다고 알렸다. 옥경대 안쪽까지 확인하고 온 것은 아니었다. 그 말을 듣고 바로 일어났다. 살아 있는 사람이 있는 길을 따라가면, 적어도 자신이 두고 온 자리를 다른 사람에게 가리킬 수 있었다."
      },
      {
        "node": "ISK_L02_AB1_107",
        "profile": null,
        "speaker": "교대 병사",
        "text": "제가 앞쪽까지만 함께 가겠습니다. 다만 지금 같은 속도로 뛰면 도중에 쓰러집니다. 우리에게 길을 알려 줄 사람이 필요한 거지, 쓰러진 사람을 하나 더 데려오라는 뜻이 아닙니다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_108",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "네 말도 각청 같네. 그 사람도 내가 할 수 있는 데까지만 하라고 했어. 마지막까지 그랬는데, 나는 할 수 있는 게 뭔지 아직 모르겠어."
      }
    ],
    "ISK_L02_AB1_109": [
      {
        "node": "ISK_L02_AB1_109",
        "profile": null,
        "speaker": "교대 병사",
        "text": "그러면 우선 걷는 걸로 합시다. 통로 입구가 보이면 멈추고요. 그다음 일은 도착해서 말해도 됩니다."
      },
      {
        "node": "ISK_L02_AB1_110",
        "profile": null,
        "speaker": null,
        "text": "그는 내 짐을 빼앗듯 대신 들지 않았다. 물을 마신 컵만 회수하고 나란히 걸을 자리를 만들었다. 구슬이 여전히 품 안에 있다는 것을 확인했다. 그것을 가지고도 아무도 살리지 못한 손을 어디에 둘지 몰라, 한동안 가방끈만 움켜쥐었다."
      }
    ],
    "ISK_L02_AB1_114": [
      {
        "node": "ISK_L02_AB1_114",
        "profile": null,
        "speaker": null,
        "text": "곁에 선 교대 병사가 무슨 말을 하는지 듣지 못했다. 자신이 맥박을 찾던 목 옆과 대답 없이 처졌던 손목이 번갈아 눈에 들어왔다. 병사가 이름을 부르려 하자 내가 먼저 앞으로 나갔다. 각청은 다가오는 낯선 사람을 보고 일을 멈추었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB1_115",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청, 너 어떻게 살아 있어? 내가 네 옆에 있었어. 네가 죽은 걸 확인했고, 이 구슬도 대 봤는데 아무 일도 없었어. 몬드에서 나를 데려온 것도, 여기서 닷새 동안 같이 사람들 만난 것도 기억하지?"
      }
    ],
    "ISK_L02_AB2_004": [
      {
        "node": "ISK_L02_AB2_004",
        "profile": null,
        "speaker": null,
        "text": "운송인은 덮개 위를 손등으로 쳐 고인 물을 바깥으로 흘렸다. 바닥에 발을 넓게 벌리고 끝을 당겼다. 다섯 상자와 따로 놓인 쇠고리 열두 개는 각자 있던 자리를 지켰다. 하늘이 흐려지면 서류보다 먼저 천을 걱정하는 사람들이 이곳을 굴러가게 하고 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_005",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "여기 온 뒤로 물건을 옮기는 것보다 안 옮기게 하는 일을 더 많이 하는 것 같아. 원래 운송이 이렇게 가만히 서 있는 기술이었어?"
      }
    ],
    "ISK_L02_AB2_006": [
      {
        "node": "ISK_L02_AB2_006",
        "profile": null,
        "speaker": "운송인",
        "text": "잘못 놓은 짐을 한 번 더 옮기느니 처음에 오래 서 있는 게 낫습니다. 그렇다고 일주일씩 서 있는 게 좋다는 뜻은 아닙니다. 바퀴가 흙에 박히는 걸 보면 제 발도 같이 박히는 기분이거든요."
      },
      {
        "node": "ISK_L02_AB2_007",
        "profile": null,
        "speaker": null,
        "text": "운송인은 덮개를 묶은 뒤 수레 바퀴의 쐐기를 살폈다. 그가 일을 잘해서 물건이 멈춘 상태로 남아 있다는 사실이 답답하게 보였다. 봉쇄가 풀리면 가장 먼저 무엇을 하겠느냐고 물을 뻔하다가, 모든 대화를 같은 기다림으로 끌고 가는 것 같아 입을 다물었다."
      },
      {
        "node": "ISK_L02_AB2_008",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "덮개를 잘 씌웠네. 그렇지만 물 빠지는 끝을 길 쪽으로 내면 지나가는 사람이 맞아. 저쪽 기둥으로 반 폭만 돌릴 수 있어?"
      }
    ],
    "ISK_L02_AB2_013": [
      {
        "node": "ISK_L02_AB2_013",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "끝을 두 번 감고 아래로 빼. 너무 짧게 남기면 나중에 풀 사람이 손톱으로 씨름해야 해. 내가 받치고 있을 테니 천이 팽팽한지부터 보고."
      },
      {
        "node": "ISK_L02_AB2_014",
        "profile": null,
        "speaker": null,
        "text": "그녀가 짚은 곳에서 매듭을 완성했다. 각청은 잡아당겨 확인한 뒤 손을 놓았다. 처음에는 지시를 듣고 따라 한 일이었는데, 마지막에는 세 사람이 손을 떼는 타이밍이 맞았다."
      }
    ],
    "ISK_L02_AB2_016": [
      {
        "node": "ISK_L02_AB2_016",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "상자를 옮기지 않고 덮개를 옮긴 판단은 좋았어. 이제 물을 길로 보내지 않게 고쳤으니 더 좋아졌고. 내가 한 번 칭찬하면 다음 수정을 못 하게 되는 건 아니겠지?"
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_017",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 정도로 독점 계약을 맺을 생각은 없었어. 칭찬은 받고 잘못된 매듭은 다시 묶을게. 생각보다 우리 거래가 건전하네."
      }
    ],
    "ISK_L02_AB2_019": [
      {
        "node": "ISK_L02_AB2_019",
        "profile": null,
        "speaker": null,
        "text": "조사가 진척되지 않는 날에도 해야 할 일은 줄지 않았다. 떨어진 쐐기를 찾고, 아이가 수레 아래로 들어가지 않도록 길을 막고, 잠깐 자리를 비울 사람 대신 천막 끝을 붙들었다. 해가 기울면 옆구리가 아팠다. 검을 휘두르지 않은 날에도 몸이 제 몫의 불평을 한다는 것을 새삼 배웠다."
      },
      {
        "node": "ISK_L02_AB2_020",
        "profile": null,
        "speaker": "운송인",
        "text": "오늘은 그만 붙들어도 됩니다. 기둥이 그 일을 하라고 서 있는 거니까요. 손을 놓아도 상자가 갑자기 사라지지는 않습니다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_021",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "몬드에서는 다시 가 보니 시체가 하나도 없었거든. 물건까지 그러겠다는 말은 아닌데, 잠깐 놓았다가 달라져 있을 것 같아서 자꾸 보게 돼."
      }
    ],
    "ISK_L02_AB2_022": [
      {
        "node": "ISK_L02_AB2_022",
        "profile": null,
        "speaker": null,
        "text": "운송인은 웃으려던 표정을 거두었다. 그는 몬드의 사당을 본 사람이 아니었다. 구체적인 일을 캐묻지도, 술 한 잔이면 잊힌다고 가볍게 넘기지도 않았다. 대신 천막 기둥을 두드려 소리를 냈다."
      },
      {
        "node": "ISK_L02_AB2_023",
        "profile": null,
        "speaker": "운송인",
        "text": "그러면 제가 보는 동안 쉬세요. 없어지지 않을 거라고 약속하는 건 못 해도, 제가 실제로 본 것을 말할 수는 있습니다. 자리를 비운 동안은 비웠다고 하고요."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_024",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 정도면 돼. 내가 눈 뜨고 있는 시간을 두 사람 몫으로 늘릴 수는 없으니까. 나중에 내가 잠들었다고 상자 옮기는 일을 다 떠맡기지는 말고."
      }
    ],
    "ISK_L02_AB2_025": [
      {
        "node": "ISK_L02_AB2_025",
        "profile": null,
        "speaker": "운송인",
        "text": "자는 사람을 깨우는 것보다 제가 옮기는 게 빠를 때도 있습니다. 그러니 손님은 물건에 기대서 잠들지만 마십시오. 깨우지도 않고 둘 수가 없어집니다."
      },
      {
        "node": "ISK_L02_AB2_026",
        "profile": null,
        "speaker": null,
        "text": "수레 바퀴에서 조금 떨어진 자리에 앉았다. 누군가 같은 물건을 바라봐 주는 것만으로도 어깨가 내려갔다. 구슬은 품 안에 그대로 있었다. 그것을 지키는 일까지 다른 사람에게 넘기지는 않았다."
      },
      {
        "node": "ISK_L02_AB2_027",
        "profile": null,
        "speaker": null,
        "text": "각청은 다음날 짧은 설명을 가지고 왔다. 인계가 실제로 이루어진 정황은 계속 확인하고 있지만, 누가 어느 시각에 옮겼는지는 아직 말할 수 없다는 내용이었다. 좋은 소식을 기대하다가 얼굴이 먼저 굳었다. 각청은 그 표정을 보고 서류를 접어 버리는 대신 옆에 앉았다."
      },
      {
        "node": "ISK_L02_AB2_028",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "네가 찾아낸 흔적이 쓸모없었다는 뜻은 아니야. 쇠고리가 지금 있는 자리와 출발 물량을 설명할 수 있게 됐으니까. 하지만 그 설명에서 사람 이름까지 바로 꺼낼 수는 없었어."
      }
    ],
    "ISK_L02_AB2_032": [
      {
        "node": "ISK_L02_AB2_032",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "네가 먼저 쉬어도 내 차례가 없어지지는 않아. 오늘은 여기까지 확인하고 식사할 거야. 그러니까 내 접시가 나올 때까지 다른 상자를 보여 주려 하지 마."
      },
      {
        "node": "ISK_L02_AB2_033",
        "profile": null,
        "speaker": null,
        "text": "그녀는 정말로 자리를 옮겼다. 물자 천막 바깥의 작은 취사 자리까지 따라갔다. 도시 안 가게의 제대로 된 식탁은 아니었다. 그래도 한쪽 다리가 흔들리는 판자 위에 그릇을 놓고 앉는 동안, 사람들은 서류의 빈칸보다 당장 뜨거운 그릇을 어디에 잡을지 더 걱정했다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_034",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "리월까지 왔는데 문밖에서 밥만 먹다 돌아가면 여행기를 쓰기 곤란하겠어. 제목을 닫힌 문 아래에서 먹은 것들로 잡아야 하나. 내용은 의외로 많아지고 있는데."
      }
    ],
    "ISK_L02_AB2_035": [
      {
        "node": "ISK_L02_AB2_035",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "성 안에도 먹을 곳은 많아. 봉쇄가 풀린 뒤 네가 더 머무른다면 직접 돌아봐. 지금 내가 한곳을 골라 주면 그 집이 네 리월 전체가 될지도 모르잖아."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_036",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 네가 일 핑계 안 대고 한 번 같이 걸어 줘. 어디가 맛있는지보다 어디서 길을 잘못 들기 쉬운지부터 알려 주면 꽤 도움이 될걸."
      }
    ],
    "ISK_L02_AB2_037": [
      {
        "node": "ISK_L02_AB2_037",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그날 일을 보고 정하자. 대신 시간이 맞으면 네가 길을 고르고 내가 따라갈게. 잘못 들었을 때 바로 고쳐 주면 길을 배울 기회가 없으니까, 조금은 돌아갈 수도 있겠네."
      },
      {
        "node": "ISK_L02_AB2_038",
        "profile": null,
        "speaker": null,
        "text": "각청도 일부러 길을 돌아갈 수 있다는 말에 웃었다. 그녀는 그 웃음이 자신을 향한 것인지 살피더니, 음식이 식는다고 그릇을 가리켰다. 아직 열린 도시는 아니었지만 그 안에서 걸을 미래를 상상하는 일까지 금지된 것은 아니었다."
      }
    ],
    "ISK_L02_AB2_040": [
      {
        "node": "ISK_L02_AB2_040",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "당당한 것과 목적지가 있는 것은 다르다는 걸 그때 배우겠네. 나는 길을 잃었다고 판단되면 말할 거야. 함께 걷기로 했지 하루를 전부 잃기로 한 건 아니니까."
      },
      {
        "node": "ISK_L02_AB2_041",
        "profile": null,
        "speaker": null,
        "text": "그녀는 빈 그릇을 겹쳐 들어 취사 자리로 옮겼다. 누군가 가져가려고 손을 뻗었지만 자신이 들고 있는 김에 하겠다며 먼저 움직였다. 나도 뒤따라 그릇 하나를 더 들었다."
      }
    ],
    "ISK_L02_AB2_043": [
      {
        "node": "ISK_L02_AB2_043",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그럴 필요 없어. 네가 몬드에서 왜 따라왔는지와 여기서 뭘 했는지는 내가 알아. 입구에서 묻는 사람이 있어도 네가 전부 처음부터 설명하게 두지는 않겠어."
      },
      {
        "node": "ISK_L02_AB2_044",
        "profile": null,
        "speaker": null,
        "text": "그 말 뒤에 다른 보증을 요구하지 않았다. 각청이 나를 대신해 세상의 모든 문을 열 수는 없었다. 다만 한 사람에게는 자신이 이곳에 온 이유를 매번 다시 증명하지 않아도 된다는 뜻이었다."
      }
    ],
    "ISK_L02_AB2_045": [
      {
        "node": "ISK_L02_AB2_045",
        "profile": null,
        "speaker": null,
        "text": "행사 전날에는 운송인이 임시 통로에 쓰일 낡은 판자를 골라냈다. 구조를 받치는 자재가 아니라, 줄 아래 빈틈으로 발이 빠지지 않도록 막는 좁은 덧판이었다. 그중 하나의 끝이 비스듬히 갈라져 있었다. 그는 판자가 뒤틀리면 어느 쪽에 힘이 걸리는지 보여 주며 금이 간 것을 따로 뺐다."
      },
      {
        "node": "ISK_L02_AB2_046",
        "profile": null,
        "speaker": "운송인",
        "text": "갈라진 자리를 끈으로 꽉 감으면 겉으로는 멀쩡해 보일 수 있습니다. 그래도 하중을 받으면 안쪽이 벌어집니다. 묶였다는 것과 버틴다는 것은 다른 말이지요."
      }
    ],
    "ISK_L02_AB2_053": [
      {
        "node": "ISK_L02_AB2_053",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "아래쪽 물자 구역은 괜찮았어? 바람이 세지면 덮개가 들릴 수 있다고 하던데."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_054",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "확인하고 왔어. 오늘은 상자 대신 앞을 보고 구경하러 왔으니까 여기서도 못자리부터 세게 만들지는 마. 의례가 끝날 때쯤 내가 난간 검사관으로 취직해 있으면 곤란해."
      }
    ],
    "ISK_L02_AB2_055": [
      {
        "node": "ISK_L02_AB2_055",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 자리는 따로 있어. 네가 맡은 일도 아니고. 다만 저 안쪽 난간에는 기대지 마. 구조 문제라기보다 사람들 무게가 한꺼번에 실리는 걸 막으려는 거야."
      },
      {
        "node": "ISK_L02_AB2_056",
        "profile": null,
        "speaker": null,
        "text": "각청은 지나가던 병사에게 가장자리를 비우라고 짧게 지시한 뒤 앞쪽으로 나갔다. 응광이 의례를 시작하자 군중은 말소리를 낮췄다. 나도 다른 사람들의 시선을 따라 고개를 들었다. 그 순간 하늘에서 떨어진 그림자가 앞쪽을 덮었다."
      },
      {
        "node": "ISK_L02_AB2_057",
        "profile": null,
        "speaker": null,
        "text": "추락한 몸은 사람들이 뒤로 물러날 만큼 거대했다. 바닥의 떨림이 신발 밑으로 전해지고, 흩어진 먼지가 움직이지 않는 비늘 위에 내려앉았다. 군중 속에서 터져 나온 모락스와 암왕제군이라는 호칭을 들었다. 신의 시신이 의례 한가운데 떨어졌다는 이해가 한 박자 늦게 몸을 통과했다."
      }
    ],
    "ISK_L02_AB2_059": [
      {
        "node": "ISK_L02_AB2_059",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "이 자리에 들어오는 길과 나가는 길을 분리해. 물건을 두고 온 사람도 지금은 되돌아오지 못하게 하고. 확인하는 사람의 발밑까지 군중으로 채우면 어떤 말도 믿을 수 없게 돼."
      },
      {
        "node": "ISK_L02_AB2_060",
        "profile": null,
        "speaker": null,
        "text": "응광은 추락한 몸과 출입구를 번갈아 살폈다. 미리 준비한 행사 안내를 계속 읽는 사람은 없었다. 각청은 흔들리는 줄을 잡고 사람들에게 한쪽으로만 이동하라고 했다. 옆으로 넘어지려는 관람객을 일으키다가, 응광이 수행원들과 자리를 뜨려는 것을 보았다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_061",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청, 응광에게 나를 잠깐 소개해 줘. 몬드에서 시체가 있던 자리가 나중에 전부 비어 있었어. 여기서도 누군가 몸을 옮기기 전에, 본 사람이 실제로 무얼 봤는지 남겨야 해. 사람들 앞에서는 그 얘기를 길게 못 하겠어."
      }
    ],
    "ISK_L02_AB2_062": [
      {
        "node": "ISK_L02_AB2_062",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "지금 별도 면담은 안 돼. 응광은 현장 밖에서도 확인할 일이 있어. 네가 말한 몬드의 일은 내가 알고 있으니 전달하겠어. 네가 직접 본 것을 잊으라고 하는 게 아니야."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_063",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "네가 아는 이야기라도 그 사람이 내 표정을 보고 묻고 싶은 게 있을 수 있잖아. 이번에도 나중에 돌아왔을 때 아무것도 없으면, 나는 또 빈 바닥 앞에서 설명하는 사람이 돼."
      }
    ],
    "ISK_L02_AB2_064": [
      {
        "node": "ISK_L02_AB2_064",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그런 일이 있었다는 이유로 지금 여기서 같은 결론을 내릴 수는 없어. 네 설명은 남기겠지만, 면담을 만들려고 사람들을 헤집고 갈 수는 없어. 네 뒤에서 누군가 넘어지려 하고 있어. 지금 손이 닿는 사람부터 잡아."
      },
      {
        "node": "ISK_L02_AB2_065",
        "profile": null,
        "speaker": null,
        "text": "돌아보니 노인이 줄과 덧판 사이에 발을 끼우고 있었다. 팔을 내밀어 노인을 받쳤다. 각청도 몸을 낮춰 걸린 신발을 빼 주었다. 응광의 옷자락이 멀어지는 것을 보았지만 그쪽으로 갈 여유는 없었다. 그녀는 참사가 벌어지기 전에 내 시야 밖으로 떠났다."
      }
    ],
    "ISK_L02_AB2_067": [
      {
        "node": "ISK_L02_AB2_067",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "사람들이 빠진 뒤에 하자. 네가 본 위치부터 다시 짚으면 돼. 우선 그분의 체중을 이쪽으로 받쳐. 발을 빼기 전에 일으키면 발목을 다칠 수 있어."
      },
      {
        "node": "ISK_L02_AB2_068",
        "profile": null,
        "speaker": null,
        "text": "각청은 장담 대신 지금 가능한 순서를 정했다. 힘을 주는 방향을 바꿨다. 두 사람 사이에서 노인이 간신히 균형을 되찾았다."
      }
    ],
    "ISK_L02_AB2_070": [
      {
        "node": "ISK_L02_AB2_070",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "기억할게. 하지만 네 말을 듣기 싫어서 거절하는 건 아니야. 지금 네가 서운한 것도 알겠고. 이분을 옮기고 나서 다음 사람을 보자."
      },
      {
        "node": "ISK_L02_AB2_071",
        "profile": null,
        "speaker": null,
        "text": "그녀는 나를 밀어내지 않고 노인의 다른 팔을 맡았다. 기분이 상한 채로도 같은 사람을 받칠 수 있었다. 일은 두 사람의 감정이 정리되기를 기다려 주지 않았다."
      }
    ],
    "ISK_L02_AB2_072": [
      {
        "node": "ISK_L02_AB2_072",
        "profile": null,
        "speaker": null,
        "text": "노인이 이제 혼자 설 수 있다고 손을 떼려던 순간이었다. 각청의 팔에서 힘이 빠졌다. 내 쪽으로 쏠리는 노인의 무게를 받느라 몸을 돌렸을 때, 그녀는 이미 바닥에 쓰러지고 있었다. 주변의 목소리들이 문장의 끝에 닿지 못했다. 사람이 몸을 피하려고 서로를 미는 움직임까지 같은 순간에 끊겼다."
      },
      {
        "node": "ISK_L02_AB2_073",
        "profile": null,
        "speaker": null,
        "text": "노인을 바닥에 눕히고 각청에게 손을 뻗었다. 대답을 재촉하려고 어깨를 잡았지만 힘이 돌아오지 않았다. 입가에 숨이 닿지 않았고 목 옆에서도 맥박을 찾지 못했다. 손을 바꿔 다시 확인했다. 옆의 노인과 난간에 기대앉은 병사에게도 같은 일을 했다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_074",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청, 내 손 잡아. 여기 누우면 사람들이 못 지나가잖아. 일어나서 나한테 또 뭐부터 하라고 말해. 방금처럼 하면 돼. 내가 이번에는 바로 들을게."
      }
    ],
    "ISK_L02_AB2_077": [
      {
        "node": "ISK_L02_AB2_077",
        "profile": null,
        "speaker": null,
        "text": "각청을 그 자리에서 옮기려고 했다. 한쪽 팔을 자기 목 뒤로 걸치고 일어서다가 무게에 눌려 다시 주저앉았다. 살아 있는 사람이 걸음을 맞추어 주지 않으면 몸 하나를 옮기는 일도 전혀 달랐다. 그녀를 다시 눕혔다. 머리가 바닥에 닿지 않도록 접어 놓은 천을 받치는 손이 말을 듣지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_078",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "누가 좀 와 줘. 사람 하나만, 나 말고 사람 하나만 있으면 돼. 내가 다 옮기라는 것도 아니잖아. 여기서 이 사람을 두고 갈 수는 없잖아."
      }
    ],
    "ISK_L02_AB2_079": [
      {
        "node": "ISK_L02_AB2_079",
        "profile": null,
        "speaker": null,
        "text": "대답 대신 임시 난간의 끈이 움직였다. 내가 일어서며 잡은 곳이었다. 줄을 세게 당기자 아래 덧판의 못 하나가 들렸고, 판자 끝에 가느다란 금이 벌어졌다. 그 소리를 듣고 뒤늦게 손을 놓았다. 살아 있는 동안에는 사소했던 물건의 파손이, 대답 없는 현장에서 유일하게 자기 행동을 따라왔다."
      },
      {
        "node": "ISK_L02_AB2_080",
        "profile": null,
        "speaker": null,
        "text": "떨어질 듯한 덧판을 걷어내려다가 멈췄다. 몬드에서 다시 찾아간 사당에는 시신이 없었다. 바닥에 무엇이 있었는지 설명하는 사람과, 지금은 아무것도 없다고 대답하는 사람이 남았었다. 이번에도 이곳을 비운 뒤 달라지면 각청을 마지막으로 어디에 눕혔는지조차 자기 말만 남을 것 같았다."
      }
    ],
    "ISK_L02_AB2_086": [
      {
        "node": "ISK_L02_AB2_086",
        "profile": null,
        "speaker": null,
        "text": "표시를 남긴 뒤에는 더는 버틸 수 없었다. 손을 씻고 싶었지만 씻을 곳부터 찾으러 가는 것조차 각청을 두고 움직이는 일 같았다. 구슬은 품 안에서 묵직했다. 그것이 드발린에게 했던 일을 떠올렸으나, 지금의 죽음을 치료할 수 있다는 근거는 없었다. 물건을 꺼내 시험하기보다 살아 있는 사람을 찾아야겠다는 생각에 매달렸다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_087",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내가 돌아오면 또 할 일이 많다고 해. 지금 약속한다고 말은 못 듣겠지만, 나 혼자만 기억하고 있어도 일단 갈게. 사람들을 데리고 올게."
      }
    ],
    "ISK_L02_AB2_088": [
      {
        "node": "ISK_L02_AB2_088",
        "profile": null,
        "speaker": null,
        "text": "앞쪽으로 몇 걸음 움직이다가 바닥에 놓인 손을 밟을 뻔했다. 몸을 피하는 순간 시야 전체에 죽은 사람들이 들어왔다. 조금 전까지 자기가 그 가운데에 앉아 있었다는 것을 견딜 수 없어 비명이 터졌다. 길의 방향보다 비어 있는 바닥을 골라 뛰기 시작했다."
      },
      {
        "node": "ISK_L02_AB2_089",
        "profile": null,
        "speaker": null,
        "text": "도망은 표시를 남긴 계획보다 빨랐다. 어디로 나가면 도움을 구할 수 있는지 생각하는 동안에도 몸은 이미 아래로 달리고 있었다. 뒤돌아볼 때마다 매듭이 잘 보이는지 확인하려던 생각이 사라졌다. 지금은 아무도 뒤따라오지 않는 것이 오히려 견딜 수 없었다."
      }
    ],
    "ISK_L02_AB2_092": [
      {
        "node": "ISK_L02_AB2_092",
        "profile": null,
        "speaker": "운송인",
        "text": "벌써 돌아오셨습니까? 행사 쪽에서 이상한 소리가 들리기는 했습니다만, 여기는 들어온 말마다 달라서요. 잠깐, 손님. 기둥이 아니라 저를 보십시오. 얼굴이 왜 그 모양입니까?"
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_093",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "너는 여기 있었지? 천막이랑 상자 보고 있었지? 옥경대에 가지 않았다는 말을 좀 해 줘. 네가 여기 있었다는 걸 내가 아침에도 봤는데, 지금 다시 들어야겠어."
      }
    ],
    "ISK_L02_AB2_094": [
      {
        "node": "ISK_L02_AB2_094",
        "profile": null,
        "speaker": "운송인",
        "text": "계속 여기 있었습니다. 물은 저쪽에서 한 번 길어 왔고, 그때는 옆 수레 사람이 짐을 봐 줬습니다. 의례에는 가지 않았습니다. 앉으실 자리부터 만들겠습니다."
      },
      {
        "node": "ISK_L02_AB2_095",
        "profile": null,
        "speaker": null,
        "text": "운송인은 상자를 끌어다 의자처럼 놓으려다가 멈췄다. 조사 중인 물건은 건드리지 않고 자신이 쉬던 자리를 비워 주었다. 그 사소한 순서를 지켜보았다. 무엇이 이미 일어났고 무엇을 지금 바꾸는지 구별할 수 있는 사람이 눈앞에 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_096",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "모락스의 시신이 떨어졌어. 각청이 사람들을 옮기다가 쓰러졌고, 주변 사람들이 전부 죽었어. 나는 각청을 옮기려고 했는데 못 했어. 다시 갈 수 있게 표시만 묶고 도망쳤어."
      }
    ],
    "ISK_L02_AB2_097": [
      {
        "node": "ISK_L02_AB2_097",
        "profile": null,
        "speaker": "운송인",
        "text": "사람들이 전부요? 손님이 보던 자리의 사람들이라는 뜻입니까? 여기는 아침부터 아무도 쓰러지지 않았습니다. 저 아래에서 물을 긷던 사람들도 걸어 다녔고요. 제가 본 곳은 그렇습니다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_098",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그래, 내가 있던 자리야. 여기까지 다 죽었다고 말하는 건 아니야. 그런데 그 차이를 설명하면 내가 거기서 한 사람이라도 못 찾은 게 더 선명해져. 분명히 나 말고 아무도 없었어."
      }
    ],
    "ISK_L02_AB2_099": [
      {
        "node": "ISK_L02_AB2_099",
        "profile": null,
        "speaker": null,
        "text": "운송인은 그 말을 듣고 물병을 꺼냈다. 내가 손을 내밀지 않자 물을 한 잔 따라 가까운 바닥에 두었다. 마시라고 세 번씩 재촉하지 않았다. 상자 쪽에서 누군가를 부르는 소리가 들렸지만 그는 그쪽을 향해 잠시 기다려 달라는 손짓을 했다."
      },
      {
        "node": "ISK_L02_AB2_100",
        "profile": null,
        "speaker": "운송인",
        "text": "표시는 어디에 남겼습니까? 제가 사람 몸은 모릅니다. 그렇지만 길을 찾아갈 표시는 같이 볼 수 있습니다. 천암군에게 누가 확인하러 가고 있는지 먼저 물어보지요."
      }
    ],
    "ISK_L02_AB2_105": [
      {
        "node": "ISK_L02_AB2_105",
        "profile": null,
        "speaker": "운송인",
        "text": "저는 그 자리에 없어서 손님의 순서를 고칠 수 없습니다. 다만 표시를 보고 다시 찾아갈 사람은 될 수 있습니다. 얼굴을 잊었다는 뜻으로 제가 받아들이지는 않겠습니다."
      },
      {
        "node": "ISK_L02_AB2_106",
        "profile": null,
        "speaker": null,
        "text": "운송인은 내 손이 기둥 굵기를 그리듯 벌어져 있는 것을 보고도 내려놓으라고 하지 않았다. 내가 자기 손을 보고 천천히 무릎으로 옮겼다. 지금은 그 위치를 다시 찾을 이유가 남아 있었다."
      }
    ],
    "ISK_L02_AB2_108": [
      {
        "node": "ISK_L02_AB2_108",
        "profile": null,
        "speaker": "운송인",
        "text": "말할 수 있는 건 무엇이 남았고 무엇이 없었는지까지겠지요. 하지만 저는 아직 거기 가지 않았습니다. 이미 없어졌을 거라고 생각해서 손님을 붙잡아 둘 이유도 없습니다."
      },
      {
        "node": "ISK_L02_AB2_109",
        "profile": null,
        "speaker": null,
        "text": "아직 일어나지 않은 두려움과 이미 본 죽음을 한데 섞고 있었다는 것을 깨달았다. 운송인은 시신이 남아 있을 거라는 반대 약속도 하지 않았다. 두 사람에게 필요한 것은 예언보다 실제로 돌아갈 발이었다."
      }
    ],
    "ISK_L02_AB2_110": [
      {
        "node": "ISK_L02_AB2_110",
        "profile": null,
        "speaker": null,
        "text": "천막 바깥에서 쉬던 다른 운송인이 다가왔다. 사정을 짧게 들은 그는 앞쪽 통제선에 구조를 요청하러 갔다. 돌아왔을 때는 목격자를 데려오라는 말만 전했다. 누구를 치료했다거나 어떤 시신을 확인했다는 결과는 없었다. 의례 현장을 다시 떠올리고 물잔을 비웠다."
      },
      {
        "node": "ISK_L02_AB2_111",
        "profile": null,
        "speaker": "운송인",
        "text": "저는 통제선까지 동행하겠습니다. 짐은 옆 수레 사람이 보겠다고 했습니다. 우리가 자리를 비운다는 것을 알고 있으니 물건을 옮기려는 사람이 오면 먼저 막을 겁니다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_112",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "너한테 이걸 부탁하러 돌아올 줄은 몰랐어. 아침에는 잠깐 짐 좀 봐 달라는 얼굴로 갔는데. 지금은 내가 본 게 있었던 자리까지 같이 가 달라는 부탁을 하네."
      }
    ],
    "ISK_L02_AB2_113": [
      {
        "node": "ISK_L02_AB2_113",
        "profile": null,
        "speaker": "운송인",
        "text": "둘 다 혼자서는 눈을 둘 곳이 모자라서 하는 부탁입니다. 큰 차이가 없다는 뜻은 아닙니다. 다만 저더러 죽은 사람을 살리라고 하시는 게 아니라면, 같이 걷는 일은 할 수 있습니다."
      },
      {
        "node": "ISK_L02_AB2_114",
        "profile": null,
        "speaker": null,
        "text": "일어서면서 다시 천막을 보았다. 구슬을 꺼내거나 맡기지 않았고, 조사하던 상자에서 증거를 떼어 가져가지도 않았다. 필요한 것은 살아 있는 사람 한 명과 돌아갈 방향이었다. 옥경대에 남겨 둔 각청의 몸에 관해 말할 때마다 혼자라는 느낌을 조금 덜 수 있기를 바랐다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_115",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "돌아가면 내가 묶어 둔 걸 먼저 찾아 줘. 끈이 남아 있든 없어졌든 본 대로 말해 줘. 내가 듣고 싶은 말이 뭔지 미리 알아맞히려고 하지 말고."
      }
    ],
    "ISK_L02_AB2_116": [
      {
        "node": "ISK_L02_AB2_116",
        "profile": null,
        "speaker": "운송인",
        "text": "그렇게 하겠습니다. 다만 그곳까지 들어갈 수 있는지는 도착해서 확인해야 합니다. 지금 제가 약속하는 건 곁에서 보고 말하는 일이지, 막힌 길을 열어 드리는 일은 아닙니다."
      },
      {
        "node": "ISK_L02_AB2_117",
        "profile": null,
        "speaker": null,
        "text": "고개를 끄덕였다. 길을 열겠다는 사람이 없는 것이 오히려 현실적이었다. 각청도 닷새 동안 무조건 열어 주겠다는 약속을 하지 않았다. 그 사람이 있었기 때문에 기다릴 수 있었던 문 앞으로, 이제 그 사람이 죽었다고 설명하러 가고 있었다."
      }
    ],
    "ISK_L02_AB2_121": [
      {
        "node": "ISK_L02_AB2_121",
        "profile": null,
        "speaker": null,
        "text": "자신의 손바닥을 내려다보았다. 끈을 묶다가 쓸린 자국이 남아 있었다. 눈앞의 각청은 그 자국을 만든 자리에서 돌아온 사람처럼 나를 반기지 않았다. 갑자기 멈춰 선 낯선 사람이 왜 자신을 보는지 살피는 눈이었다. 다가오던 병사의 질문도 끝까지 듣지 못했다."
      },
      {
        "node": "R39_PROSE_ISK_L02_AB2_122",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청, 어떻게 여기 서 있어? 너 죽었잖아. 내가 난간 옆에 눕히고 기둥에 표시까지 했어. 우리 같이 덮개 묶던 것도, 도시가 열리면 같이 걸어 보자던 것도 기억하지? 내가 누구인지 알잖아."
      }
    ],
    "ISK_L02_B1_004": [
      {
        "node": "ISK_L02_B1_004",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "그건 아프든 안 아프든 빼앗기는 거 아닙니까? 제 그릇은 제가 치울 겁니다. 이쪽에 앉았다고 종일 보살핌만 받아야 하는 사람으로 보지는 말아 주세요."
      },
      {
        "node": "ISK_L02_B1_005",
        "profile": null,
        "speaker": null,
        "text": "병사는 나보다 먼저 빈 그릇들을 겹쳤다. 반쯤 들었던 손을 거두고 대신 바닥에 떨어진 천을 주웠다. 별일 아닌 분담이었지만, 누가 누구를 간호하는지 정하지 않아도 같이 앉아 있을 수 있다는 점이 편했다. 그의 기억에는 여전히 구멍이 있었다. 그렇다고 남은 하루 전체가 그 구멍으로 사라지는 것은 아니었다."
      }
    ],
    "ISK_L02_B1_014": [
      {
        "node": "ISK_L02_B1_014",
        "profile": null,
        "speaker": null,
        "text": "북두는 기둥을 붙잡고 차양의 방향을 바꾸었다. 내가 서툴게 묶은 끈을 몽땅 풀어 대신 해 주지는 않았다. 비틀린 한 가닥을 짚어 주고, 내가 다시 걸어 당길 때까지 기다렸다. 지나가던 선원이 선장의 시간을 빼앗는다며 웃자 북두는 손이 비면 반대편 기둥이나 잡으라고 돌려보냈다. 그날 저녁 비는 오지 않았지만, 세 사람은 바람이 꺾여 들어오는 자리에서 처음으로 덜 떨며 앉았다."
      },
      {
        "node": "ISK_L02_B1_015",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "가족에게는 제가 당장 위험한 상태는 아니라고 전해 달랬습니다. 그런데 그 말이 아직 맞는지도 모르겠습니다. 이곳에 앉아 있으면 아무 일도 없는데, 다시 근무에 들어가면 같은 일이 생길까 봐요."
      },
      {
        "node": "R39_PROSE_ISK_L02_B1_016",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "아직 못 정한 말까지 미리 보낼 필요는 없지. 무사히 쉬고 있다는 건 지금 사실이고, 다음 근무가 걱정된다는 것도 사실이잖아. 하나를 말한다고 다른 하나가 거짓말이 되는 건 아니야. 네가 빼고 싶은 부분은 내가 옆에서 덧붙이지 않을게."
      }
    ],
    "ISK_L02_B1_017": [
      {
        "node": "ISK_L02_B1_017",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "가족이 제 대신 걱정을 다 해 줄 수는 없겠죠. 그래도 아무 말도 못 듣고 기다리는 건 더 싫을 겁니다. 전갈이 닿았는지 확인되면, 그다음에는 제가 직접 무엇을 말할지 정하겠습니다."
      },
      {
        "node": "ISK_L02_B1_018",
        "profile": null,
        "speaker": null,
        "text": "그는 가족이 듣지 못한 말들을 나에게 전부 털어놓지는 않았다. 나도 기다리는 사이가 가까워졌다는 이유로 그 안쪽까지 들어가려 하지 않았다. 이틀째에는 병사가 혼자 산책을 하고 돌아왔고, 사흘째에는 내가 자리를 비운 동안 그가 비가 샌 곳에 돌을 받쳐 두었다. 어느 쪽도 그것을 회복의 증거라고 선언하지 않았다. 달라진 것은 병사의 상태보다 두 사람이 도움을 청하는 방식이었다."
      },
      {
        "node": "ISK_L02_B1_019",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "쉬는 곳이 통행로 쪽으로 밀렸어. 짐이 늘어서 그런 거지? 차양을 철거하라는 뜻이 아니야. 이 기둥을 안으로 옮기면 수레가 돌 때 부딪히지 않아. 내가 들 테니 밑의 돌만 빼 줘."
      },
      {
        "node": "R39_PROSE_ISK_L02_B1_020",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "옥형이 직접 들면 나중에 내가 지위 높은 사람을 부렸다고 혼나는 건 아니지? 닷새째 문밖에 살게 되더라도, 쫓겨날 이유까지 늘리고 싶지는 않은데."
      }
    ],
    "ISK_L02_B1_021": [
      {
        "node": "ISK_L02_B1_021",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "지금 돌을 빼면 기둥을 덜 오래 들겠지. 괜한 걱정에 시간을 쓰는 동안 오히려 더 오래 부리고 있다는 생각은 안 해 봤어? 그리고 의례 날이 와도 여기 있는 짐이 전부 안으로 들어가는 건 아니야."
      },
      {
        "node": "ISK_L02_B1_022",
        "profile": null,
        "speaker": null,
        "text": "말을 접고 돌을 옮겼다. 기둥을 놓은 각청은 병사에게 근무 복귀를 재촉하지 않고 교대 담당과 다시 상태를 확인하라고 했다. 병사가 의례를 보러 가는 일도 금지되느냐고 묻자, 각청은 몸을 움직이는 데 지장이 없다면 참관인으로 지정 통로를 이용할 수 있다고 답했다. 다만 현장 질서를 맡는 복무는 별개이며, 구경하러 왔다가 제멋대로 창을 잡지 말라는 말도 덧붙였다."
      },
      {
        "node": "ISK_L02_B1_023",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "원래부터 구경만 잘하는 성격은 아닌데, 이번에는 그래 보겠습니다. 이 사람과 같이 가면 덜 답답할 것 같군요. 밖에서 닷새를 보냈다고 안쪽 지리를 다 아는 건 아니니까요."
      }
    ],
    "ISK_L02_B1_031": [
      {
        "node": "ISK_L02_B1_031",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "돌아오면 여기에 있을 거다. 다만 사람들이 한꺼번에 쏟아져 나오면 이 자리까지 밀릴 수 있으니, 길이 막혔다고 무턱대고 줄을 뚫지는 마. 얼굴 못 찾으면 바깥 차양부터 봐."
      },
      {
        "node": "R39_PROSE_ISK_L02_B1_032",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알았어. 구경 다녀와서 짐까지 들어 달라는 조건은 없는 거지? 그런 거라면 출발 전에 알려 줘. 나중에 의례가 좋았느냐고 물으며 자연스럽게 손잡이를 쥐여 주면 너무 능숙해서 거절을 못 할 것 같거든."
      }
    ],
    "ISK_L02_B1_033": [
      {
        "node": "ISK_L02_B1_033",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "지금 보니 이미 수법을 아는군! 쉬고 올 사람을 억지로 부리지는 않아. 대신 돌아와서 내가 사람을 부르는데 못 들은 척할 생각이라면, 그건 네 양심하고 상의해 봐라."
      },
      {
        "node": "ISK_L02_B1_034",
        "profile": null,
        "speaker": null,
        "text": "북두의 웃음소리가 천막 사이로 멀어졌다. 병사는 제 손목에 감긴 천을 한번 고쳐 매고 내 보폭을 따라왔다. 갑옷을 입지 않은 그는 길을 양보하는 습관만큼은 버리지 못했다. 내가 뒤처진 노인에게 자리를 내주자, 병사는 자신도 똑같이 옆으로 물러서려다가 둘이 동시에 통로를 비우는 바람에 웃었다. 닷새 전보다 편안한 웃음이었다."
      },
      {
        "node": "ISK_L02_B1_035",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "혹시 나중에 제 가족을 만날 일이 생기면, 제가 쉬는 동안 아무것도 안 하고 있었다는 식으로 말하지는 말아 주세요. 이렇게 부탁하는 것도 우습지만, 제가 제대로 쉬려고 애썼다는 건 알아줬으면 합니다."
      }
    ],
    "ISK_L02_B1_048": [
      {
        "node": "ISK_L02_B1_048",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "뒤로 물러서십시오! 밀면 앞쪽이 넘어집니다. 잠깐, 저분들이 아직 못 일어났습니다. 먼저 길을……"
      },
      {
        "node": "ISK_L02_B1_049",
        "profile": null,
        "speaker": null,
        "text": "병사는 쉬는 날이라는 사실을 잊은 듯 손을 내밀었다. 각청이 가림줄을 걷어 사람들을 넓은 쪽으로 유도했고, 응광은 먼지를 피해 달아나는 대신 쓰러진 몸과 주변의 위치를 빠르게 살폈다. 내 귀에는 여러 사람이 같은 질문을 내놓는 소리만 겹쳤다. 자신이 본 것이 신의 죽음이라면, 기다리던 다섯 날이 무엇을 위한 시간이었는지 누구도 대답할 수 없었다."
      },
      {
        "node": "ISK_L02_B1_050",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "달려 나가지 마. 나가는 길부터 확보해. 쓰러진 사람과 의례를 본 사람을 구분해 두고, 들은 소문을 본 사실에 섞지 않도록 해. 지금 서로를 의심하기 시작하면 범인을 찾기도 전에 우리가 만든 혼란에 갇혀."
      },
      {
        "node": "ISK_L02_B1_051",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "뒤쪽 줄은 멈춰! 앞에서 넘어졌어. 옆으로 공간을 만들고 부축해서 일으켜. 너희 둘도 저쪽으로 붙어. 지금 제군 가까이 가려 해서는 안 돼."
      },
      {
        "node": "R39_PROSE_ISK_L02_B1_052",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "응광하고 개인적으로 이야기할 수 있을까? 나, 몬드에서 구슬로 드발린을 정화한 적이 있어. 여기 일과 같은 건지는 모르겠지만, 적어도 누군가는 그걸 알아야 할 것 같아. 사람들 앞에서 물건부터 꺼내기는 싫고."
      }
    ],
    "ISK_L02_B1_053": [
      {
        "node": "ISK_L02_B1_053",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "지금은 안 돼. 무슨 일을 겪었는지 들을 자리는 마련할 수 있어도, 현장을 통제하는 사람을 따로 데려갈 수는 없어. 구슬은 꺼내지 마. 제군이 쓰러진 앞에서 정체 모를 물건을 보여 주면 설명보다 의심이 먼저 번져."
      },
      {
        "node": "ISK_L02_B1_054",
        "profile": null,
        "speaker": null,
        "text": "그녀는 내 말을 비웃지 않았다. 대신 다음 순간 밀려드는 사람을 붙잡아 방향을 바꾸어 주었다. 응광은 이미 수행 인원에게 다른 곳의 경계와 연락을 지시하며 참관 구역 반대편으로 움직이고 있었다. 지금 다가가 이름을 부르면 돌아볼지도 모른다는 생각이 들었지만, 그 사이에 서 있는 사람들을 밀어내지 않고는 갈 수 없었다."
      }
    ],
    "ISK_L02_B1_060": [
      {
        "node": "ISK_L02_B1_060",
        "profile": null,
        "speaker": null,
        "text": "응광의 모습이 건물 모서리 너머로 사라졌다. 그녀가 떠난 뒤에야 자신이 붙잡으려 한 것이 면담 기회만은 아니라는 사실을 알았다. 지금 본 장면을 이해하는 사람이 어디엔가 있을 것이라는 기대였다. 병사는 아침에 맨 손목의 천을 다시 당기고 있었고, 각청은 그를 쉬는 참관인으로 돌려보내기 위해 손짓했다. 누구도 그 손짓이 끝까지 이어지지 못하리라고 생각하지 않았다."
      },
      {
        "node": "ISK_L02_B1_061",
        "profile": null,
        "speaker": null,
        "text": "소리가 사라진 것은 아니었다. 바람은 차양을 흔들었고 멀리 떨어진 장식은 돌바닥에서 굴렀다. 끊어진 것은 사람들의 움직임이었다. 병사가 내 쪽으로 돌리던 얼굴이 그대로 무너져 내렸다. 그를 받으려고 내민 팔 너머로 각청이 쓰러졌고, 방금 서로 부축하던 사람들까지 같은 순간 바닥으로 꺾였다. 내 주변, 눈이 닿던 참관 구역의 사람들은 나를 제외하고 모두 죽었다. 누군가 정신을 잃어 쉬고 있는 장면이 아니었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_B1_062",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "왜 그래. 방금까지 멀쩡했잖아. 나 좀 봐, 손에 힘 줘 봐. 아까 가족한테 뭐라고 말해 달랬는지 내가 아직 대답 다 안 했어. 이렇게 말하다가 그만두면 안 되잖아!"
      }
    ],
    "ISK_L02_B1_071": [
      {
        "node": "ISK_L02_B1_071",
        "profile": null,
        "speaker": null,
        "text": "구슬을 감싼 천을 움켜쥐었다. 드발린을 정화할 때와 같은 일이 일어나기를 바랐지만, 지금은 대상을 어떻게 도와야 하는지도 알지 못했다. 구슬을 꺼내 병사 곁에 가져가 보았다. 죽은 몸은 되살아나지 않았다. 빛이나 목소리도 없었고, 천을 걷은 손바닥에 닿는 둥근 물체의 감촉만 있었다. 용을 정화했던 경험은 죽은 사람을 되돌리는 방법을 가르쳐 주지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L02_B1_072",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이럴 때는 왜 아무것도 안 하는데. 내가 들고 있어야 하는 거라면 이유라도 있어야 하잖아. 부탁할게. 한 사람만이라도, 저 사람만이라도 어떻게 좀 해 줘……!"
      }
    ],
    "ISK_L02_B1_073": [
      {
        "node": "ISK_L02_B1_073",
        "profile": null,
        "speaker": null,
        "text": "구슬을 다시 감쌌다. 놓쳐 버릴까 봐가 아니라, 더 들여다보고 있으면 아무 일도 일어나지 않는다는 사실에 붙들려 끝내 움직이지 못할 것 같아서였다. 시야에 들어오는 사람마다 사정을 묻고 싶었고, 동시에 어느 얼굴도 더 보고 싶지 않았다. 병사의 몸을 들어 보려 했지만 다리에 힘이 풀렸다. 어디로 옮겨야 하는지조차 모르는 채 한 사람을 당기고 놓는 동안, 살아 있는 자신의 숨소리가 너무 크게 들렸다."
      },
      {
        "node": "R39_PROSE_ISK_L02_B1_074",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "으아악……! 누구 없어? 나 혼자 두지 마! 밖에 있는 사람이라도, 제발 누구든 대답해 줘!"
      }
    ],
    "ISK_L02_B1_077": [
      {
        "node": "ISK_L02_B1_077",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "거기 멈춰. 그대로 더 뛰면 수레 밑에 들어간다. 나 봐, 네 앞에 있는 건 나야. 옆으로 비켜! 이 사람 앉을 자리부터 내 줘. 너하고 같이 올라간 병사는 어디 있어?"
      },
      {
        "node": "R39_PROSE_ISK_L02_B1_078",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "죽었어. 그 사람도, 각청도. 사람들이 전부…… 내 앞에 있던 사람들이 다 쓰러졌는데, 아무도 숨을 안 쉬었어. 나만 계속 숨을 쉬고 있었어. 왜 그런지는 모르겠어. 나는 그냥 도망쳤어."
      }
    ],
    "ISK_L02_B1_079": [
      {
        "node": "ISK_L02_B1_079",
        "profile": null,
        "speaker": null,
        "text": "북두는 곧바로 항구 전체가 죽었다고 외치지 않았다. 그녀는 차양 뒤로 나를 옮겨 앉히고, 들은 이야기를 옆에서 큰 소리로 되풀이하려는 선원을 손으로 막았다. 그 눈빛에 평소의 웃음은 없었지만 나를 붙들어 흔들지도 않았다. 겁에 질린 한 사람에게서 정보를 억지로 짜내면, 무서웠다는 사실밖에 남지 않으리라는 것을 아는 태도였다."
      },
      {
        "node": "ISK_L02_B1_080",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "네가 봤다는 곳이 의례 자리라는 거지? 내가 아직 확인하지 못한 구역까지 죽었다고 말하지는 않을 거다. 하지만 네가 이렇게 도망쳐 올 만한 일을 봤다는 건 알겠어. 병사하고 각청은 가까이서 확인했나?"
      }
    ],
    "ISK_L02_B1_086": [
      {
        "node": "ISK_L02_B1_086",
        "profile": null,
        "speaker": null,
        "text": "북두는 사람 둘을 가까운 외곽 초소로 보냈다. 의례 쪽에서 중대한 사고를 목격한 사람이 왔으니 담당자를 불러 달라는 전갈이었다. 죽음의 범위나 원인을 알아낸 것처럼 말하지 말라는 지시가 붙었다. 나머지 선원들은 차양으로 접근하는 사람들을 옆길로 안내했다. 일어나지 않은 추가 참사를 상상하며 모두 달아나는 대신, 지금 확보할 수 있는 공간을 지키는 움직임이었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_B1_087",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 병사가 가족에게 보낸 말, 아직 전해졌는지 모르잖아. 누가 지금 전하러 가려는 거면 기다리게 해야 하지 않을까? 잘 쉬고 있다고만 말하면, 나는 그 사람이 어떻게 됐는지 알면서도 모른 척하는 거잖아."
      }
    ],
    "ISK_L02_B1_088": [
      {
        "node": "ISK_L02_B1_088",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그 말을 맡은 동료를 찾아보자. 다만 네가 봤다는 사실과 가족에게 사망을 알리는 건 따로 확인할 일이 있어. 아무나 달려가 문을 두드리게 하지는 않을 거야. 넌 닷새 동안 그 사람이 원하던 말을 들어 준 사람이지, 혼자서 모든 뒷일을 떠안겠다고 약속한 사람은 아니잖아."
      },
      {
        "node": "ISK_L02_B1_089",
        "profile": null,
        "speaker": null,
        "text": "병사의 동료는 얼마 뒤 바깥 초소에서 왔다. 그는 의례에 올라가지 않았고, 내가 알고 있는 전갈도 자신이 직접 전달한 것이 아니라 연락을 부탁받은 단계라고 설명했다. 가족이 들었는지는 여전히 확인되지 않았다. 그 말에 안도할 수 없었다. 늦게 닿은 말이 거짓이 될 수도 있다는 생각이, 빨리 닿기를 바라던 마음을 밀어냈다."
      },
      {
        "node": "ISK_L02_B1_090",
        "profile": null,
        "speaker": "교대 병사",
        "text": "추가로 보내는 말은 일단 멈추겠습니다. 가족이 이미 무엇을 들었는지부터 알아봐야 합니다. 그런데 정말 그 사람을 본 겁니까? 아침에 걸어 나갈 때는, 의례 끝나면 다시 이쪽으로 온다고 했는데요."
      },
      {
        "node": "R39_PROSE_ISK_L02_B1_091",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나도 그렇게 들었어. 같이 돌아오기로 했으니까. 손목에 감은 천이 자꾸 풀려서 고쳐 맸고, 갈 때 길을 알려 줬어. 다른 사람하고 착각한 건 아니야. 미안해. 내가 여기 와서 제일 먼저 해야 할 말을 아직도 못 찾겠어."
      }
    ],
    "ISK_L02_B1_092": [
      {
        "node": "ISK_L02_B1_092",
        "profile": null,
        "speaker": "교대 병사",
        "text": "사과받으려고 물은 건 아닙니다. 다만 당신이 혼자 돌아온 이유를 듣고 나니, 저도 무엇부터 해야 할지 모르겠습니다. 대답을 듣기 전에는 사람이 늦게 오는 데도 평범한 이유가 있을 거라고 생각했는데요."
      },
      {
        "node": "R39_PROSE_ISK_L02_B1_093",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 사람, 남의 그릇도 치웠고 혼자 걷고 돌아오기도 했어. 자기가 쉬려고 애썼다는 걸 가족이 알아줬으면 한다고 했고. 남의 짐만 되는 사람으로 기억되기는 싫었던 거야. 내가 그 말을 끝까지 기억할 줄 몰랐는데, 지금은 자꾸 그 말이 생각나."
      }
    ],
    "ISK_L02_B1_107": [
      {
        "node": "ISK_L02_B1_107",
        "profile": null,
        "speaker": "교대 병사",
        "text": "이 앞에서 담당자를 찾겠습니다. 당신이 본 자리부터 확인하고, 구조와 수습을 어떻게 할지 정해야 합니다. 그 사람의 가족에게 누구 이름으로 무엇을 전할지도요. 제가 같이 들었다는 말은 하겠습니다."
      },
      {
        "node": "R39_PROSE_ISK_L02_B1_108",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "고마워. 나중에 그 사람 이야기를 하게 되면, 닷새 내내 불안해하기만 했다고 말하지는 말아 줘. 실제로 웃었고, 나한테 따질 줄도 알았어. 내가 기억하는 마지막이 이런 일이라고 앞의 날들까지 없어지지는 않잖아."
      }
    ],
    "ISK_L02_B1_109": [
      {
        "node": "ISK_L02_B1_109",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그래. 그 이야기를 들을 자리는 남겨 두자. 지금은 앞을 봐. 저기 누가 나오고 있어."
      },
      {
        "node": "ISK_L02_B1_110",
        "profile": null,
        "speaker": null,
        "text": "통제선 안쪽에서 보랏빛 옷자락이 움직였다. 처음에는 비슷한 사람이라고 생각하려 했다. 그러나 걸음과 자세가 다가올수록, 자신이 바로 앞에서 죽음을 확인한 얼굴과 하나씩 겹쳤다. 각청이었다. 몸을 옮겨 숨을 확인했던 그 사람, 아무리 불러도 응답하지 않았던 그 사람이 스스로 걸어오고 있었다. 내 발이 멈췄다. 구슬은 품 안에서 아무 반응도 보이지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L02_B1_111",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청…… 너 어떻게 살아 있어? 내가 아까 바로 옆에서 확인했어. 숨도 없었고, 네가 내 말을 듣겠다고 한 다음에 다들…… 네가 어떻게 여기 걸어 나와? 나 기억하지? 병사 쉬는 자리에서, 기둥 같이 옮겼잖아."
      }
    ],
    "ISK_L02_B2_004": [
      {
        "node": "ISK_L02_B2_004",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "좋아, 들을 때마다 네 이름부터 부르라고 해 둘까? 이름 부르는 동안 물건이 젖겠지만 네 억울함은 확실히 줄겠군. 농담이고, 책임자는 저 사람이다. 힘을 보태는 사람한테 몰래 넘길 생각은 없으니 같이 들어."
      },
      {
        "node": "ISK_L02_B2_005",
        "profile": null,
        "speaker": null,
        "text": "북두가 무거운 쪽을 받쳤다. 가장 가벼운 모서리를 잡았는데도 팔이 당겼다. 둘이 들고 나머지 사람이 받침을 밀어 넣자, 물건은 바닥에서 손바닥만큼 떨어졌다. 잠깐이면 끝날 일이 말 몇 마디를 거쳐 덜 찜찜한 일이 되었다. 북두는 포장 상태를 맡은 사람에게 다시 확인시킨 뒤 자기 손을 털었다. 내가 붙잡았다는 이유로 수취인이 바뀌지는 않았다."
      }
    ],
    "ISK_L02_B2_011": [
      {
        "node": "ISK_L02_B2_011",
        "profile": null,
        "speaker": null,
        "text": "그 뒤로 닷새의 생활에는 대단한 모험보다 몸을 조금씩 쓰는 일이 많았다. 낡은 천막의 물길을 바꾸고, 햇볕을 피해 쉴 자리를 옮기고, 수레가 방향을 틀 때 끈이 바퀴에 끼지 않도록 들어 주었다. 누구도 그것을 새 의뢰로 등록하거나 별도의 보수를 약속하지 않았다. 설산에서 받은 배달 보수가 다시 생기는 일도 없었다. 아직 일거리를 찾는 사람이었고, 기다림을 나누는 행렬 옆에서 할 수 있는 몫을 골랐다."
      },
      {
        "node": "ISK_L02_B2_012",
        "profile": null,
        "speaker": "남십자 선원",
        "text": "손에 물집 잡히겠는데. 물건보다 손을 먼저 봐. 선장 앞이라고 괜히 더 오래 붙들 필요 없어. 우리도 한 사람이 계속 들고 있으면 일 잘한다고 칭찬 안 해. 바꿔 줄 틈을 안 준다고 뭐라고 하지."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_013",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 말은 조금 일찍 해 줬으면 더 멋있었을 텐데. 지금 와서 놓으면 방금 들은 핑계를 바로 쓰는 사람 같잖아. 그러니 네가 먼저 손을 내밀어 줘. 나는 어쩔 수 없이 넘긴 표정을 잘할게."
      }
    ],
    "ISK_L02_B2_014": [
      {
        "node": "ISK_L02_B2_014",
        "profile": null,
        "speaker": "남십자 선원",
        "text": "표정까지 맡을 생각은 없지만 손은 내밀어 주지. 자, 넘겨. 얼굴 덜 찡그리면 속일 수 있을 것 같다고 생각하나 본데, 네 손가락이 이미 다 말하고 있어."
      },
      {
        "node": "ISK_L02_B2_015",
        "profile": null,
        "speaker": null,
        "text": "무게를 넘기고 손을 폈다. 북두가 그 장면을 보고 웃었지만, 쉬는 사람에게 곧바로 다른 것을 들이밀지는 않았다. 그녀는 선원에게 묶은 끈을 다시 풀어 보라고 시켰다. 비상시에 잘라야만 풀리는 매듭을 아무 데나 쓰면 안 된다는 설명이었다. 평소라면 단단히 묶은 것을 칭찬했을 것이다. 여기서는 빨리 풀 수 있는지도 중요했다."
      },
      {
        "node": "ISK_L02_B2_016",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "바다에선 짐을 지키려고 배에 남았다가 사람까지 잃는 일이 있다. 육지라고 다르지는 않아. 네가 맡은 물건이 소중한 것과, 네가 끝까지 거기 서 있어야 하는 건 같은 말이 아니야. 평소에 정해 두면 급할 때 덜 망설이지."
      }
    ],
    "ISK_L02_B2_019": [
      {
        "node": "ISK_L02_B2_019",
        "profile": null,
        "speaker": null,
        "text": "사흘째에는 들어가는 길보다 되돌아 나오는 길이 더 눈에 익었다. 수레가 늘어 길을 반쯤 막으면 사람들은 남은 틈으로 습관처럼 다녔다. 북두는 짐을 조금 바깥으로 빼서 서로 마주 오는 두 사람이 어깨를 부딪히지 않게 했다. 그 공간을 자기의 오가는 길쯤으로 생각했다. 누군가 넘어져도 뒤 사람이 밟지 않고 멈출 수 있다는 말은 들었지만, 실제 그런 장면을 상상하지는 않았다."
      },
      {
        "node": "ISK_L02_B2_020",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "이쪽은 정리가 됐네. 다만 의례 당일에는 짐수레가 따라 들어갈 수 없어. 통로를 열어도 참관인 왕복만 허용할 거야. 그 틈에 인계까지 끝내려 하면 다시 막아야 해."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_021",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알았어. 모처럼 사람 신분으로 들어가는데 짐까지 등에 지고 갈 생각은 없어. 대신 밖으로 나오는 길도 같은 데 맞지? 표지 하나만 바뀌어도 나는 다시 여기로 돌아올 자신이 별로 없거든."
      }
    ],
    "ISK_L02_B2_022": [
      {
        "node": "ISK_L02_B2_022",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "같은 통로를 쓸 거야. 입장하는 줄과 돌아오는 줄은 구분할 테니 안내를 봐. 자신이 없으면 따라가는 사람에게 먼저 물어보고. 익숙해 보이는 사람도 길을 잘못 들 수 있다는 건 요 며칠 충분히 봤을 테니까."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_023",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "가기 전에 이쪽도 한번 봐 줄래? 사람들이 들고 지나가는 짐이 자꾸 차양에 걸려. 내가 높이를 바꿔 보려다가 기둥을 통째로 빼는 수가 있을 것 같아서, 손대기 전에 물어보는 거야."
      }
    ],
    "ISK_L02_B2_032": [
      {
        "node": "ISK_L02_B2_032",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "나는 여기 남을 거다. 우리 사람들은 한꺼번에 자리를 비우지 않아. 너는 남십자 당번이 아니니까 눈치 보지 말고 가 봐. 오늘까지 물건 옆에서 하루를 보내면 나중에 리월에서 뭘 봤느냐는 질문에 포장끈 모양이나 설명하겠어."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_033",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그것도 꽤 자세히 설명할 수 있을 것 같아서 문제야. 그럼 다녀올게. 대신 돌아와서 구경보다 여기 있는 게 나았다고 투덜거리면 너무 뿌듯해하지는 마. 그건 내가 놀러 가는 요령이 없어서일 수 있으니까."
      }
    ],
    "ISK_L02_B2_034": [
      {
        "node": "ISK_L02_B2_034",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "가기도 전에 돌아올 핑계를 만들어 두는군. 무슨 일이든 보고 판단해. 천천히 다녀와도 되지만, 길이 꼬이면 멋대로 돌아 들어가지는 말고. 문이 닫혀 있을 때는 모르는 샛길이 친절한 길인 줄 착각하기 쉽거든."
      },
      {
        "node": "ISK_L02_B2_035",
        "profile": null,
        "speaker": null,
        "text": "북두가 선원들에게 바깥 수레의 배치를 지시하는 모습을 남겨 두고 출발했다. 그녀와 선원들은 바깥 행렬 곁에 남아, 자리를 비운 사람들 몫까지 둘러보고 있었다. 줄에서 알게 된 상인 몇 사람이 어제 밖에서 뭘 먹었는지 이야기했고, 나도 자연스럽게 속도를 맞췄다. 그들 중 누구의 물건이 더 값나가는지 몰라도 같이 언덕을 오르는 데는 지장이 없었다."
      }
    ],
    "ISK_L02_B2_045": [
      {
        "node": "ISK_L02_B2_045",
        "profile": null,
        "speaker": null,
        "text": "드발린을 떠올렸다. 그러나 내가 겪은 드발린은 죽었다 되살아난 용이 아니었다. 위험해진 살아 있는 용을 알베도와 함께 막았고 구슬로 정화했던 경험이 전부였다. 눈앞의 움직이지 않는 신을 두고 같은 일을 하면 된다고 말할 근거는 없었다. 품 안으로 향하던 손을 멈춘 것은 용기가 없어서만이 아니라, 함부로 가능성을 외치면 절박한 사람들이 매달릴 것 같아서였다."
      },
      {
        "node": "ISK_L02_B2_046",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "자리에서 밀지 마. 뒤쪽은 앞사람을 당기지 말고 공간부터 비워. 지금 본 것을 각자 기억해 둬. 다른 사람의 말에 맞추려고 자신이 본 장면을 고치지 않도록 해. 경계 인원은 빠지는 길을 확보하고, 외부의 상황을 확인해."
      },
      {
        "node": "ISK_L02_B2_047",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "넘어진 사람부터 세워! 뛰어 내려가지 마. 계단에서 밀리면 피해가 더 커져. 너, 바깥 행렬에 있던 사람이네. 이쪽으로 붙어. 지금은 응광에게 다가갈 수 없어."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_048",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알아봤네. 그럼 부탁 하나만 들어 줘. 응광하고 따로 이야기하고 싶어. 내가 몬드에서 겪은 일 중에 이 상황을 보고도 말하지 않고 넘어가기는 어려운 게 있어. 사람들 앞에서 떠들고 싶지는 않아."
      }
    ],
    "ISK_L02_B2_058": [
      {
        "node": "ISK_L02_B2_058",
        "profile": null,
        "speaker": null,
        "text": "내가 붙잡은 사람은 아직 숨을 거칠게 몰아쉬고 있었다. 각청의 말에 따라 한 걸음씩 발을 디뎠고, 고맙다는 말을 하려는 듯 고개를 돌렸다. 이 정도라면 도울 수 있다고 생각했다. 신에게 일어난 일을 이해하지 못해도, 넘어질 사람을 받쳐 주는 일은 할 수 있었다. 그 생각이 끝나기도 전에 내 팔에 실린 무게가 달라졌다."
      },
      {
        "node": "ISK_L02_B2_059",
        "profile": null,
        "speaker": null,
        "text": "붙잡고 있던 사람이 더는 제 몸을 지탱하지 않았다. 누군가 또 밀었나 싶어 돌아본 나는 그곳에 서 있는 사람이 자신뿐이라는 사실을 보았다. 앞과 뒤, 계단 옆과 가림줄 안쪽까지, 눈앞에 있던 사람들이 같은 순간에 쓰러졌다. 각청도 주저앉은 자세를 거쳐 돌바닥으로 넘어졌다. 현장의 사람들은 나만 남기고 실제로 죽었다. 곧 다시 일어날 기절이나 함께 꾸는 꿈이 아니었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_060",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "잠깐, 내가 붙잡고 있어. 넘어지지 않았어. 그러니까 일어나 봐. 아까 발을 디딜 수 있었잖아. 어디가 아픈 건지 말해 줘야 내가 어떻게든 해 보지!"
      }
    ],
    "ISK_L02_B2_069": [
      {
        "node": "ISK_L02_B2_069",
        "profile": null,
        "speaker": null,
        "text": "품 안의 구슬을 꺼내려다가 손가락이 천에 걸렸다. 드발린에게 도움이 되었던 물건이 지금도 무언가 할 수 있을지 모른다는 기대는 있었지만, 무엇을 해야 한다는 지식은 없었다. 잠깐 구슬을 손바닥에 올려놓았다. 아무 반응도 없었다. 누군가 돌아오지도, 길을 지시하는 말이 들리지도 않았다. 구슬을 감싸 품에 돌려 넣었다. 물건을 쥐고 있다고 살아 있는 사람이 할 일을 저절로 알게 되는 것은 아니었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_070",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "으아악……! 안 돼, 여기 못 있겠어. 미안해, 내가 사람을 불러올게. 누군가는 있어야 하잖아. 밖에는 아직, 밖에는……!"
      }
    ],
    "ISK_L02_B2_074": [
      {
        "node": "ISK_L02_B2_074",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "알았다. 일단 손을 놓고 숨부터 돌려. 네 말은 들었어. 지금 누가 어디까지 봤는지 따질 테니, 내가 묻는 것만 답해 봐. 위에서 무너진 건물이 있었나? 불이나 연기가 따라왔어?"
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_075",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그런 건 못 봤어. 나도 뭘 피해야 하는지 모르겠어. 그런데 아무도 숨을 안 쉬었고, 각청은 내가 직접 확인했어. 사람들한테 가만히 있으라고 해도 되는지 모르겠어. 여기가 안전한지도 모르겠어."
      }
    ],
    "ISK_L02_B2_076": [
      {
        "node": "ISK_L02_B2_076",
        "profile": null,
        "speaker": null,
        "text": "북두는 항구 쪽을 바라보았다. 눈앞에 달려오는 적이나 불길은 없었다. 그래서 아무 위험도 없다고 단정하지도 않았다. 그녀는 수레 사이에 엉켜 있는 사람들을 먼저 밖으로 빼고, 의례 통로로 올라가려던 선원을 불러 세웠다. 확인되지 않은 구역으로 사람을 더 보내지 않는 것과, 들은 말만으로 리월 전체의 끝을 선언하는 것 사이에 그녀가 택한 행동이 있었다."
      },
      {
        "node": "ISK_L02_B2_077",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "우선 이 좁은 자리에서 벗어난다. 멀리 흩어지지는 마. 바깥 길의 높은 굽이까지 같이 가고, 그곳에서 인원을 다시 확인한다. 짐은 한꺼번에 끌고 가지 않아. 지금 손에 잡은 물건부터 놓고 옆사람 얼굴을 봐."
      },
      {
        "node": "ISK_L02_B2_078",
        "profile": null,
        "speaker": "짐주인",
        "text": "그런데 이 수레들은 어쩝니까? 이것까지 잃으면 돌아갈 길이 없습니다. 아직 인계도 못 한 물건이고, 지금 움직여 두면 나중에 누가 책임을 질지……"
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_079",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "책임질 사람이 살아 있어야 따지지. 나 아까 사람을 붙잡고 있었어. 안 넘어지게 잡고 있었는데도 죽었어. 상자는 우리가 들면 따라오지만 사람은 그렇게 못 했다고. 지금은 사람부터 나가자. 제발."
      }
    ],
    "ISK_L02_B2_080": [
      {
        "node": "ISK_L02_B2_080",
        "profile": null,
        "speaker": null,
        "text": "자기 목소리에 놀랐다. 짐주인을 설득할 말을 골랐다기보다, 자신이 방금 놓고 온 무게를 밀어내듯 내뱉은 말이었다. 북두는 내 어깨를 눌러 더 앞으로 나서지 않게 하고 직접 수레 사이로 들어갔다. 물건을 포기하기 쉽지 않은 사람 앞에서 값어치를 비웃지 않았다. 대신 지금 쓸 수 있는 손과 지나갈 수 있는 길을 셌다."
      },
      {
        "node": "ISK_L02_B2_081",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "네 물건이 가벼운 손실이 아니라는 건 알아. 그래서 나중에 어디에 남겼는지 말할 사람도 데려가는 거다. 여기서 각자 한 대씩 붙잡으면 서로 보이지 않아. 셋을 다 끌려고 하지 마. 사람을 태울 수레 하나만 먼저 비운다."
      },
      {
        "node": "ISK_L02_B2_082",
        "profile": null,
        "speaker": null,
        "text": "행렬에는 가까이 모아 둔 수레 세 대가 있었다. 북두는 가운데 수레의 짐을 받침 위로 내려 두게 했다. 남십자 선원이 모서리를 잡고, 짐주인이 젖으면 안 되는 면을 가리켰다. 물건을 아무렇게나 던지지 않는 데 드는 짧은 시간은 확보할 수 있었다. 하지만 안쪽 가장 무거운 수레까지 빼려면 바퀴에 걸린 끈과 다른 짐을 모두 풀어야 했다. 북두는 그 수레를 남기기로 했다."
      }
    ],
    "ISK_L02_B2_088": [
      {
        "node": "ISK_L02_B2_088",
        "profile": null,
        "speaker": null,
        "text": "수레꾼은 오래 짐을 옮기며 다리를 접질러 속도를 내기 어려웠다. 이것은 의례 자리에서 돌아온 부상이 아니었다. 그는 아침부터 바깥에 있었고, 나도 출발 전에 그가 절뚝이는 것을 보았다. 빈 수레에 앉으라는 말에 자신보다 귀한 물건을 싣는 편이 낫다고 버티자, 북두가 손잡이를 잡고 수레를 조금 움직였다. 흔들림에 그가 옆판을 붙잡자 선원 하나가 발을 올릴 자리를 만들어 주었다."
      },
      {
        "node": "ISK_L02_B2_089",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "사람을 실을 때 사람이 타야지, 이제 와서 수레에게 사양하겠다는 거냐. 네가 걸어가다 멈추면 어차피 다시 데리러 와야 해. 앉아. 짐을 내려놓은 사람들 수고를 헛되게 만들지 말고."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_090",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "타 줘. 나 오늘은 부탁한 사람이 제 발로 움직여 주는 걸 좀 보고 싶어. 옆판 잡고 발만 올리면 되잖아. 그 정도는 해 줄 수 있지?"
      }
    ],
    "ISK_L02_B2_095": [
      {
        "node": "ISK_L02_B2_095",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "여덟, 다 왔군. 지금부터 혼자 돌아가는 사람은 없다. 물건을 다시 보러 가고 싶으면 먼저 말해. 누군가 사라진 줄 알고 다른 사람이 찾으러 뛰지 않게 하는 게 먼저야. 너희 둘은 여기서 길을 보고, 나머지는 물 나눠 마셔."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_096",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "사람 수를 세는 게 이렇게 무서울 줄 몰랐어. 아까는 몇 명이 있었는지도 몰라. 지금은 한 명만 대답 늦게 해도 나머지 숫자가 전부 틀릴 것 같아. 북두, 너는 이런 걸 어떻게 계속 판단해?"
      }
    ],
    "ISK_L02_B2_105": [
      {
        "node": "ISK_L02_B2_105",
        "profile": null,
        "speaker": null,
        "text": "둘의 입장이 완전히 같아지지는 않았다. 그래도 상대가 무엇을 버렸는지 모르는 채 비난하던 순간에서는 벗어났다. 짐주인은 바깥 도로에 놓고 온 수레를 바라보았다."
      },
      {
        "node": "ISK_L02_B2_106",
        "profile": null,
        "speaker": "짐주인",
        "text": "물건을 그냥 두고 왔다는 말보다, 사람을 실으려고 내려놓았다는 말을 하겠습니다. 나중에 따져야 할 사람에게요. 그렇다고 손해가 없어지는 건 아니겠지만, 제가 왜 그렇게 했는지까지 잃고 싶지는 않습니다."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_107",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그때 내가 어디까지 도왔는지는 말해도 돼. 대신 나 혼자 다 해결했다고는 하지 말아 줘. 나는 뛰쳐나와서 소리부터 질렀고, 실제로 사람들을 움직인 건 북두랑 여기 사람들이었으니까."
      }
    ],
    "ISK_L02_B2_108": [
      {
        "node": "ISK_L02_B2_108",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "소리만 지른 건 아니었지. 그래도 공을 세는 건 뒤로 미루자. 지금은 의례 쪽으로 올라가려는 사람이 더 있는지 알아야 해. 밖으로 나온 사람이 우리에게만 말했으면 다른 길에서는 여전히 아무것도 모를 수 있잖아."
      },
      {
        "node": "ISK_L02_B2_109",
        "profile": null,
        "speaker": null,
        "text": "품에 든 구슬을 만졌다. 도망치기 전에도, 수레를 밀 때에도, 지금도 아무 반응이 없었다. 그 물건이 자신을 살렸다고 말할 근거도 없었다. 구슬 때문에 목숨을 건질 수 있었던 것인지 묻고 싶었지만, 누가 답을 안다는 보장도 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_110",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "북두, 몬드에서 구슬 하나를 얻었어. 위험해진 드발린을 그걸로 정화한 적이 있어서 아까도 꺼내 봤는데, 아무 반응도 없더라. 내가 그 물건을 가지고 살아 돌아왔다고 해서, 그게 나를 살렸다고까지는 말 못 하겠어."
      }
    ],
    "ISK_L02_B2_111": [
      {
        "node": "ISK_L02_B2_111",
        "profile": null,
        "speaker": null,
        "text": "북두는 구슬을 달라고 하지 않았다. 눈앞의 사람을 움직이는 일과 아직 알 수 없는 물건을 알아보는 일을 구분해 두려는 태도였다."
      },
      {
        "node": "ISK_L02_B2_112",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그 이야기는 네가 직접 말해야겠다. 내가 구슬을 들고 가 봐야 네가 봤다는 일을 대신 본 게 되지는 않으니까. 하지만 그걸 가지고 있다고 여기 남은 사람들 목숨까지 네 책임이라고 생각하지 마. 지금 우릴 움직인 건 서로 듣고 손을 맞춘 일이었어."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_113",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "바깥 초소에 알리러 갈 때 나도 갈게. 내가 도망친 길은 아니까 어느 쪽에서 무슨 일을 봤는지 말할 수 있어. 대신 안으로 들어가 사람을 확인하는 건 아직 못 하겠어. 그건 할 수 있다고 거짓말 못 하겠어."
      }
    ],
    "ISK_L02_B2_118": [
      {
        "node": "ISK_L02_B2_118",
        "profile": null,
        "speaker": "남십자 선원",
        "text": "앞의 통제선은 아직 서 있습니다. 담당자가 밖으로 나오는 모양인데요. 선장, 여기서 말을 걸면 되겠습니다."
      },
      {
        "node": "ISK_L02_B2_119",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그래. 먼저 멈춰서 우리 쪽 상황을 알린다. 저쪽에서 움직이라고 하기 전엔 통로로 들어가지 마. 네가 말할 동안 내가 곁에 있겠지만, 모르는 사실까지 맞춰서 이야기할 필요는 없어."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_120",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "응. 내가 확인한 것부터 말할게. 신의 몸이 떨어졌고, 응광은 먼저 떠났고, 각청하고 사람들이 내 앞에서 죽었어. 그 사이에 누가 무슨 일을 했는지는 못 봤고. 지금은 그게 내가 말할 수 있는 전부야."
      }
    ],
    "ISK_L02_B2_121": [
      {
        "node": "ISK_L02_B2_121",
        "profile": null,
        "speaker": null,
        "text": "그 말을 끝냈을 때 통제선의 담당자가 고개를 들었다. 각청이었다. 자신이 방금 이름을 말했기 때문에 잘못 본 것이라고 생각했다. 하지만 그녀가 걸어 나와 멈추고, 시선을 돌려 북두와 선원의 위치를 확인하는 동안에도 얼굴은 바뀌지 않았다. 숨을 확인하려고 몸을 돌렸던 감각이 손바닥에 되살아났다. 그 손바닥이 이제 살아서 움직이는 그녀를 향해 올라갔다."
      },
      {
        "node": "R39_PROSE_ISK_L02_B2_122",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "너 어떻게 살아 있어? 각청, 내가 아까 네 숨을 확인했어. 네 손을 잡았는데 아무 힘도 없었고, 네가 내 이야기를 들어 주겠다고 했잖아. 기억 안 나? 바깥 행렬에서 차양 높이 같이 보던 나야."
      }
    ],
    "ISK_L03_K1_003": [
      {
        "node": "ISK_L03_K1_003",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 천막이 어딘지는 알아. 그런데 네가 말한 일은 기억나지 않아. 내가 너를 조사했다면 담당 병사도 있었겠지. 그 사람부터 찾아보자. 손을 다쳤는데, 그건 언제 생긴 상처야?"
      },
      {
        "node": "ISK_L03_K1_004",
        "profile": null,
        "speaker": null,
        "text": "상처라는 말을 듣자 나는 손바닥을 뒤집었다. 산을 오르다 긁힌 자국과 말라붙은 흙이 남아 있었다. 그녀를 붙들던 손이었고, 놓고 도망쳤던 손이었다. 각청은 손을 잡아 검사하지 않았다. 대신 곁의 병사에게 씻을 물이 있는 곳을 묻고, 나에게 길 옆의 낮은 자리를 가리켰다. 그 배려마저 익숙해서 나는 앉을 수 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_005",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "상처는 나중에 볼게. 의례에서 무슨 일이 있었는지부터 말해 줘. 모락스의 시신이 떨어졌잖아. 네가 사람들 물리고 응광이 지시하던 거, 설마 그것도 기억 안 나?"
      }
    ],
    "ISK_L03_K1_006": [
      {
        "node": "ISK_L03_K1_006",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "제군의 시신이라고? 의례에 다녀온 건 기억해. 하지만 그런 일이 있었다면 지금 이 봉쇄선에 서서 물자 통행을 정리하고 있을 리 없잖아. 천천히 말해. 네가 무엇을 봤는지부터."
      },
      {
        "node": "ISK_L03_K1_007",
        "profile": null,
        "speaker": null,
        "text": "뒤의 병사도 고개를 들었다. 각청을 바라보다가 그에게 시선을 옮겼다. 병사는 그날 안내를 맡았다고 했지만 하늘에서 떨어진 거대한 몸은 기억하지 못했다. 다른 참관객을 불러도 답은 다르지 않았다. 행사장까지 올라간 길과 내려와 마신 차를 이야기하던 사람이, 내가 정확히 무슨 순간을 묻는지 이해하지 못해 말을 멈췄다."
      },
      {
        "node": "ISK_L03_K1_008",
        "profile": null,
        "speaker": "참관객",
        "text": "사람이 많아서 앞은 잘 보이지 않았어요. 그렇지만 그런 일이 났으면 소리라도 들었겠죠. 저는 그냥… 잠깐 정신이 없었던 것 같은데, 그게 무슨 일이었는지는 모르겠네요. 왜 그런 표정으로 보세요? 제가 숨기는 건 없어요."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_009",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "숨겼다고 안 했어요. 당신을 탓하는 게 아니에요. 그런데 다들 그 부분만 없다고 하니까, 나는 대체 어디에다 대고 말해야 하나 싶어서 그래요. 각청, 응광한테 물어봐 줘. 그 사람은 봤어. 가까이서 보고 직접 명령도 내렸어."
      }
    ],
    "ISK_L03_K1_021": [
      {
        "node": "ISK_L03_K1_021",
        "profile": null,
        "speaker": null,
        "text": "병사의 손에 든 전갈을 보다가 손바닥으로 제 무릎을 눌렀다. 응광까지 기억하지 못했다. 그 거대한 몸을 앞에 두고 냉정하게 사람을 움직이던 여자가, 이제는 시신을 옮기라고 했는지조차 말해 줄 수 없었다. 사라진 자리를 둘러싼 사람들은 모두 살아 움직이고 있었지만 누구도 그 자리에 무엇이 놓였는지 기억하지 못했다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_022",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 끝이야? 기억이 없고 넘겨받은 것도 없으니까, 원래 없었던 걸로 치자고? 저게 작은 소품이었어? 누가 주머니에 넣고 간 물건도 아니잖아! 사람이 죽고, 너도 죽고, 지금은 시신까지 없어졌는데 왜 나만 그걸 찾고 있냐고!"
      }
    ],
    "ISK_L03_K1_023": [
      {
        "node": "ISK_L03_K1_023",
        "profile": null,
        "speaker": null,
        "text": "마지막 말은 각청을 향해 튀어나왔다. 소리를 지른 뒤에야 그녀가 한 발도 피하지 않았다는 것을 보았다. 사람들의 시선이 몰렸다. 병사가 말리려고 팔을 내밀자 각청이 그 앞을 막았고, 나는 막힌 팔을 보며 더 화를 낼 대상을 잃었다. 살아 돌아온 사람에게 왜 죽었느냐고 따지고 있었다. 그 사실이 분노를 가라앉히기보다 속을 더 뒤집었다."
      },
      {
        "node": "ISK_L03_K1_024",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "네 말이 맞다면 내가 모르는 사이에 죽었다가 지금 여기 서 있는 거겠지. 그걸 네게 설명해 주지 못하는 건 사실이야. 하지만 내 기억이 비어 있다는 이유로 나까지 아무것도 하려 하지 않는 사람으로 만들지는 마. 지금 네 옆에 서 있잖아."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_025",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알아. 머리로는 아는데, 네가 너무 멀쩡해서 화가 나. 살아 있어서 다행인데, 살아 있는 네 앞에서 죽었다고 소리치는 내가 미친 것 같고. 미안해. 너한테 화낼 일이 아닌데… 그래도 시신은 찾아야 해. 아무도 기억 못 하면 가져간 사람은 너무 편하잖아."
      }
    ],
    "ISK_L03_K1_026": [
      {
        "node": "ISK_L03_K1_026",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 말부터 같이 확인하자. 시신이 없어졌다면 옮긴 길이 있을 수 있어. 기억이 없다고 길까지 없어지는 건 아니니까. 넌 네가 있던 자리를 짚어 줘. 나는 옮길 수 있는 출구와 그쪽에 있던 사람을 찾을게."
      },
      {
        "node": "ISK_L03_K1_027",
        "profile": null,
        "speaker": null,
        "text": "각청은 곧장 병사 둘을 나누어 보냈다. 나도 몸을 돌렸다. 분노가 사라진 것은 아니었지만, 이제는 무엇을 향해 움직여야 하는지 보였다. 큰 몸을 숨길 수 있는 장소, 제군의 힘을 노리고 접근할 사람, 다른 이들이 혼란한 동안 먼저 움직였을 가능성이 있는 자. 이름 하나가 머릿속을 차갑게 가로질렀다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_028",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "타르탈리아. 우인단 집행관, 그 사람이 리월에 와 있지? 제군의 시신이 어디 있는지 찾거나, 이미 다른 곳에서 기다리고 있을 수도 있어. 황금옥부터 확인해야 해."
      }
    ],
    "ISK_L03_K1_029": [
      {
        "node": "ISK_L03_K1_029",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 이름은 알아. 하지만 네가 지금 어떤 관계로 연결한 건지는 모르겠어. 그가 가져갔다는 목격이 있어?"
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_030",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "본 건 아니야. 내가 알고 있던 이야기에서는 그가 황금옥으로 가고, 제군의 신의 심장을 얻으려 해. 거기서 뜻대로 안 되면 일이 바다까지 번져. 지금까지 겪은 일을 전부 그 사람 짓이라고 하려는 게 아니야. 더 큰 사고가 날 곳을 하나 알고 있다는 거야."
      }
    ],
    "ISK_L03_K1_032": [
      {
        "node": "ISK_L03_K1_032",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "이 몸이 항구의 사정을 살피겠다고 한 것이 그저 자네를 돌려보내려는 말로 들렸나? 돌아오자마자 목이 쉬도록 외쳐 대고 있으니 산에서 쉬게 한 보람이 없군. 자네가 말한 각청이 바로 이 사람인가?"
      },
      {
        "node": "ISK_L03_K1_033",
        "profile": null,
        "speaker": null,
        "text": "류운차풍진군이 내려앉는 동안 먼 지붕 위로 또 다른 선인의 형체가 멈췄다. 홀로 찾아온 것이 아니었다. 내가 밤을 넘겨 산을 내려오는 동안 그녀는 다른 선인들에게 경고를 전하고 항구로 향한 것이다. 소는 소란의 가운데로 들어오지 않은 채 주변을 한 번 살폈다가, 각청과 나 사이에 시선을 멈췄다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_034",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "맞아요. 분명 제 앞에서 죽었는데 지금은 살아 있어요. 모락스의 시신도 없어졌고, 각청도 응광도 그 일이 기억나지 않는답니다. 제가 거짓말한 거라고 생각하실까 봐… 아니, 지금 그걸 걱정할 때가 아니네요. 타르탈리아가 황금옥으로 갔을 수 있어요."
      }
    ],
    "ISK_L03_K1_035": [
      {
        "node": "ISK_L03_K1_035",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "산에서 들은 말을 이 몸이 잊지 않았네. 자네가 지금 눈앞의 사람을 보고 말을 바꾼 것이 아니라는 뜻이지. 다만 시신이 사라진 일은 별개로 살펴야겠군. 칠성이 제군의 일을 모른다 하니, 이 몸도 당사자에게 직접 물을 말이 있어."
      },
      {
        "node": "ISK_L03_K1_036",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "응광에게 자리를 마련하라고 전하겠습니다. 하지만 이 사람의 증언만으로 리월의 조사가 끝난 것은 아닙니다. 선인께서 함께 들으신다는 것과, 제가 현장을 확인할 책임은 같이 갈 수 있어요."
      },
      {
        "node": "ISK_L03_K1_037",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "이 몸이 자네에게 손을 놓으라 하였나? 움직일 마음이 있다면 길부터 열게. 인간들의 일이니 인간들끼리 해결하겠다고 하면서 제군의 일까지 문밖에 세워 둘 생각은 없겠지."
      },
      {
        "node": "ISK_L03_K1_038",
        "profile": null,
        "speaker": null,
        "text": "각청의 눈썹이 움직였지만 그녀는 돌아서서 길을 지시했다. 두 사람 사이에서 말을 고르다가 입을 다물었다. 자신을 믿게 하려고 선인을 데려온 것은 아니었는데, 지금 자신을 응광에게 데려갈 수 있는 힘은 그녀들이었다. 누군가 대신 큰 소리를 내 준다는 안도와 그 소리가 또 다른 충돌을 부를지 모른다는 걱정이 함께 왔다."
      }
    ],
    "ISK_L03_K1_050": [
      {
        "node": "ISK_L03_K1_050",
        "profile": null,
        "speaker": null,
        "text": "응광은 창가가 아니라 길게 놓인 탁자 곁에 서 있었다. 손님을 위한 잔과 항구 지도가 함께 준비되어 있었다. 내가 자리에 앉기 전에 그녀의 눈길은 내 흙 묻은 신발, 갈라진 입술, 선인들 앞에서도 물러서지 않는 각청을 차례로 훑었다. 여유로운 얼굴이었지만 이미 여러 곳에 사람을 보냈다는 것이 주변의 빠른 움직임에서 드러났다."
      },
      {
        "node": "ISK_L03_K1_051",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "며칠 동안 바깥에서 기다리던 손님이 선인들과 함께 올라올 줄은 몰랐네. 내게 개인적으로 하고 싶었던 말이 있다지? 이번에는 들을 사람이 모두 모였으니, 가장 급한 것부터 말해 봐."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_052",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "먼저 당신도 기억 못 한다는 게 맞는지 직접 듣고 싶어요. 의례가 시작되자 모락스의 시신이 떨어졌고, 당신은 사람들을 물린 다음 현장을 떠났어요. 저는 각청한테 당신을 만나게 해 달라고 했고요. 그 장면 중에 기억나는 게 하나도 없어요?"
      }
    ],
    "ISK_L03_K1_053": [
      {
        "node": "ISK_L03_K1_053",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "의례를 준비하고 올라간 일은 기억해. 네가 말하는 제군의 죽음은 기억에 없어. 전갈을 보낸 뒤에도 달라지지 않았고. 자리를 떠난 뒤 누구에게 무엇을 맡겼는지 물으면, 그 사이에 분명하지 않은 부분이 있어. 마음에 들지 않는 대답이겠지만 내게 없는 기억을 만들어 줄 수는 없겠지."
      },
      {
        "node": "ISK_L03_K1_054",
        "profile": null,
        "speaker": null,
        "text": "응광은 웃지 않았다. 자신이 모르는 일을 인정하면서도 그 자리를 나에게 넘기지는 않았다. 류운차풍진군은 탁자 가까이 다가와 산에서 들은 증언을 짚었다. 기억이 끊긴 사람들끼리 이야기를 맞추다 생긴 소문이 아니라, 내가 항구에 돌아오기 전에 이미 전한 말이라는 점이었다."
      },
      {
        "node": "ISK_L03_K1_055",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "제군께 일이 생겼다는 증언을 이 몸이 들었고, 다른 선인들에게도 전했네. 그런데 이곳에 오니 제군의 몸은 없고, 칠성마저 당시를 기억하지 못한다 하는군. 이 일을 인간들의 장부 한 장이 빠진 정도로 취급할 수는 없어."
      },
      {
        "node": "ISK_L03_K1_056",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "가볍게 보았다면 이 자리에 항구 지도를 펴 두지 않았겠죠. 다만 기억나지 않는다는 말과 아무것도 하지 않았다는 말은 달라요. 지금도 이동로와 황금옥을 확인하고 있어요. 선인들께서는 바다와 항구 밖을 살펴 주실 수 있겠죠. 서로 같은 곳만 뒤져서는 시간을 잃을 테니까요."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_057",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 시간 때문에 말씀드려요. 제가 알고 있던 이야기에서는 이건 모락스의 계획이었어요. 죽은 모습을 보이고, 자신이 없는 리월이 어떻게 버티는지 보려는 계획. 타르탈리아가 신의 심장을 찾아 황금옥으로 가고, 결국 오셀이 나타납니다. 그래서 류운차풍진군에게도 미리 바다를 경계해 달라고 했어요."
      }
    ],
    "ISK_L03_K1_058": [
      {
        "node": "ISK_L03_K1_058",
        "profile": null,
        "speaker": null,
        "text": "잔을 옮기던 사람이 손을 멈췄다. 각청은 내 쪽으로 몸을 돌렸고, 응광은 탁자 위에 얹어 두었던 손가락을 천천히 거두었다. 이름 하나가 방의 무게를 바꾸었다. 이야기를 알고 있다는 말 뒤에 숨고 싶었지만 이미 숨을 자리까지 말해 버린 뒤였다."
      },
      {
        "node": "ISK_L03_K1_059",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "제군의 계획을 안다는 말은 가벼운 패가 아니야. 그분이 직접 알려 줬어? 아니면 네가 본다는 그 이야기에서, 지금 이 방에 있는 사람들의 결정까지 정해져 있었던 거니?"
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_060",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "직접 들은 적은 없어요. 다른 세계에서 이곳의 일을 이야기로 봤습니다. 그래서 알고 있다고 생각했는데, 이번에는 사람들까지 죽었어요. 드발린도 정말 죽었고 다시 살아났고요. 제가 알던 계획에는 그런 일이 없었습니다. 사람들 죽은 것까지 모락스가 했다고 우기는 게 아니라, 제가 알고 있는 다음 위험을 말하는 거예요."
      }
    ],
    "ISK_L03_K1_061": [
      {
        "node": "ISK_L03_K1_061",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그럼 앞에서 맞는 일이 있었다고 뒤의 일을 전부 믿어서는 안 돼. 하지만 대비하지 않을 이유도 없어. 바다의 위험을 막을 방법, 타르탈리아를 막을 방법. 네가 아는 건 그 두 가지에 도움이 돼?"
      },
      {
        "node": "ISK_L03_K1_062",
        "profile": null,
        "speaker": null,
        "text": "군옥각의 안쪽을 보았다. 멀리서 올려다보았을 때는 거대한 이야기 속 무대였지만 지금은 누군가 오래 모은 물건들이 놓인 집이었다. 창틀과 난간의 간격에도 고른 사람의 취향이 있었다. 그것을 잃으라고 말할 차례가 다가오자, 머릿속에서 쉬웠던 공략이 갑자기 남의 삶을 처분하는 말이 되었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_063",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "오셀이 정말 나오고, 제가 아는 흐름대로 흘러가면… 이 군옥각을 포기해야 합니다. 바다에 떨어뜨려서 막는 거예요. 당신이 이걸 얼마나 아끼는지도 알아요. 그래서 다른 말로 돌려서 결국 희생이 필요하다는 식으로 넘어가고 싶지는 않아요. 당신 집을 잃게 되는 이야기입니다."
      }
    ],
    "ISK_L03_K1_067": [
      {
        "node": "ISK_L03_K1_067",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "그 판단에 선인들의 힘도 계산해 넣게. 인간의 건물 하나를 떨어뜨릴 때까지 구경만 할 셈으로 온 것이 아니니. 다만 오셀의 이름을 가볍게 여기지도 말아야 하네. 대비할 수 있는 동안 대비하는 것이 자존심보다 먼저야."
      },
      {
        "node": "ISK_L03_K1_068",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "해안부터 움직이겠습니다. 겁을 먹은 사람들이 한 길에 몰리지 않게 바깥 대기 구역도 다시 나눠야 해요. 기억이 끊긴 병사를 그대로 한 자리에 세워 둘 수도 없고요. 선인들이 바다를 맡아 주시면 안쪽 통로는 제가 열겠습니다."
      },
      {
        "node": "ISK_L03_K1_069",
        "profile": null,
        "speaker": null,
        "text": "응광은 각청에게 고개를 끄덕인 뒤 사람들을 불렀다. 논쟁이 끝났다는 선언은 없었지만 해야 할 일이 갈라졌다. 바다를 향할 선인들, 해안을 비울 칠성의 사람들, 황금옥을 확인할 병사들이 제 방향을 얻었다. 제 말이 받아들여지면 홀가분할 줄 알았다. 실제로는 자신의 말 때문에 사람들이 움직이기 시작한 것이 더 무거웠다."
      }
    ],
    "ISK_L03_K1_080": [
      {
        "node": "ISK_L03_K1_080",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "마시고 돌려줘. 가는 길에 쓰러지면 네가 하겠다는 일을 아무도 대신 이어받지 못해. 병사들도 네 머릿속에 있는 길을 아는 게 아니니까, 들어가기 전에 어느 쪽으로 갈지 말해 두고."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_081",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "말하는 건 진짜 그대로네. 기억만 없다는 게 이렇게 사람을 서운하게 할 줄 몰랐다. 나중에 생각나면 내가 천막 당기던 힘 조절은 좀 나아졌다고 해 줘. 못 떠올리면… 그건 됐고, 오늘 물 챙겨 준 건 내가 기억할게."
      }
    ],
    "ISK_L03_K1_082": [
      {
        "node": "ISK_L03_K1_082",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "기억나지 않는 일을 기억한다고 약속할 수는 없어. 오늘 네가 돌아오길 기다리는 건 할 수 있어. 네가 봤다는 나와 지금의 나를 자꾸 경쟁시키지는 마. 나도 지금 할 수 있는 일을 하고 있으니까."
      },
      {
        "node": "ISK_L03_K1_083",
        "profile": null,
        "speaker": null,
        "text": "물통을 돌려주며 처음으로 그녀의 얼굴을 제대로 보았다. 죽어 있던 얼굴과 살아 있는 얼굴을 겹쳐 확인하지 않고, 지금 자신에게 화를 내지 않으려 애쓰는 사람을 보았다. 각청은 할 말을 마치자 곧 해안 쪽으로 돌아섰다. 그 걸음이 시야에서 사라질 때까지 기다리는 대신 나도 자기 길로 움직였다."
      }
    ],
    "ISK_L03_K1_086": [
      {
        "node": "ISK_L03_K1_086",
        "profile": null,
        "speaker": null,
        "text": "황금옥 외부에서는 마지막 일꾼 둘이 병사의 부축을 받아 나오고 있었다. 안쪽 통로에서 큰 소리를 들은 뒤 문짝 하나가 비틀렸고, 관리 구역을 거쳐 돌아 나왔다는 설명이었다. 호위대는 대피한 사람을 안전한 쪽으로 옮기면서 출구를 붙들었다. 관리 통로의 방향을 듣고 그 앞에 섰다. 안쪽으로 이어지는 틈은 아직 열려 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_087",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "저는 저 통로로 들어갈게요. 안에 있는 사람이 나오면 붙잡으려고 몰려들지 마세요. 타르탈리아면 여러분이 출구를 막고 서는 쪽이 더 위험해요. 사람들 먼저 멀리 보내고, 제가 나오면 이쪽이 비어 있게 해 주세요."
      }
    ],
    "ISK_L03_K1_090": [
      {
        "node": "ISK_L03_K1_090",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "오는 데 시간이 걸렸네. 길을 찾지 못한 건 아닐 테고, 만나고 싶은 사람이 많았나 봐. 여기까지 왔으니 할 말은 있겠지?"
      },
      {
        "node": "ISK_L03_K1_091",
        "profile": null,
        "speaker": null,
        "text": "말투는 가볍게 들렸다. 그 가벼움 뒤에서 당연히 나타날 것 같은 호기심을 기다렸다. 어디서 왔는지, 얼마나 싸울 수 있는지, 재미있는 상대인지. 그러나 타르탈리아의 시선은 내 얼굴에 머물다 손, 문, 다시 얼굴 순으로 움직였다. 사람을 반기는 눈길인지 무언가가 도착했는지 살피는 눈길인지 구별하기 어려웠다."
      }
    ],
    "ISK_L03_K1_095": [
      {
        "node": "ISK_L03_K1_095",
        "profile": null,
        "speaker": null,
        "text": "타르탈리아의 입가에 엷은 웃음이 걸렸다. 예상한 말을 들은 사람처럼 놀라지 않는 반응이 내 등을 서늘하게 했다. 자신이 아는 미래를 말하면 적어도 계획을 들킨 상대의 반응은 볼 수 있으리라 생각했다. 그러나 눈앞의 남자는 신의 심장이라는 말보다 내가 어디까지 다가왔는지에 더 관심이 있는 것처럼 보였다."
      },
      {
        "node": "ISK_L03_K1_096",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "내가 무엇을 할지 많이 생각했구나. 그러고도 혼자 이 앞까지 들어왔어. 바깥 사람들을 물린 건 잘했어. 여기서 벌어지는 일을 그들이 감당할 수 있을지는 나도 궁금하지 않거든."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_097",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "보통 그런 말은 부하들 상태부터 보고 하지 않나? 안쪽 문이 망가져서 일꾼들이 돌아 나왔어. 네 사람들이 안에 남아 있는지 궁금하지도 않아?"
      }
    ],
    "ISK_L03_K1_098": [
      {
        "node": "ISK_L03_K1_098",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "지금 내 앞에 있는 건 너잖아. 다른 사람을 이야기한다고 네가 할 일이 바뀌어? 싸우러 왔으면 움직여. 네가 어디서 멈추는지 보고 싶네."
      },
      {
        "node": "ISK_L03_K1_099",
        "profile": null,
        "speaker": null,
        "text": "무기를 고쳐 쥐었다. 기억 속 타르탈리아라면 그 말에 자신이 먼저 들떠 있을 것 같았다. 상대의 기세를 끌어올리고, 위험을 즐기며 거리를 좁혔을 것이다. 눈앞의 남자는 웃고 있었지만 재촉하지 않았다. 마치 시작하는 순간보다 끝나는 순간에 관심이 있는 사람처럼 기다렸다. 자신이 알던 모습과 다르다는 느낌은 분명했지만 그것으로 무엇을 알아냈다고 할 수는 없었다."
      }
    ],
    "ISK_L03_K1_108": [
      {
        "node": "ISK_L03_K1_108",
        "profile": null,
        "speaker": null,
        "text": "공격을 피하려 기둥 뒤로 물러났을 때 발밑의 돌판이 내려앉았다. 타르탈리아가 따라 들어오다 자세를 낮췄다. 내가 힘으로 밀어붙인 것이 아니었다. 그가 다시 발을 딛을 곳을 고르는 동안 겨우 숨을 삼켰다. 손아귀가 풀려 무기를 놓칠 뻔했다. 보이는 틈이 마지막 기회인지, 다가가면 죽는 거리인지도 자신할 수 없었다. 그래도 밖으로 이어지는 길을 그냥 내줄 수는 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_109",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "여기서 끝내. 더는 바다도, 밖의 사람들도 건드리지 마. 내가 아는 일이 틀렸다면 틀린 채로 끝내도 되니까, 지금 네가 하려는 것부터 멈춰."
      }
    ],
    "ISK_L03_K1_110": [
      {
        "node": "ISK_L03_K1_110",
        "profile": null,
        "speaker": null,
        "text": "타르탈리아가 고개를 들었다. 숨을 고르거나 다음 공격을 준비하는 대신 내 어깨 너머를 보았다. 그 시선이 어디에 닿았는지 확인하지 못했다. 이미 앞으로 체중을 옮겼고 결정타를 넣을 거리가 남아 있었기 때문이다. 승기를 붙잡았다고 생각한 바로 그 순간, 발밑에서 낮은 파열음이 났다."
      },
      {
        "node": "ISK_L03_K1_111",
        "profile": null,
        "speaker": null,
        "text": "바닥의 금이 발끝을 지나 기둥 아래로 달렸다. 위에서 먼저 먼지가 쏟아지고, 이어 돌을 잇던 구조물이 굉음과 함께 어긋났다. 공격을 거두어 출구 쪽으로 몸을 틀었다. 늦었다. 무너져 내리는 들보가 시야를 가렸고, 틈 너머로 보이던 타르탈리아의 모습도 먼지 속에 사라졌다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K1_112",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "밖으로 물러나요! 문 앞에 서 있지 말고, 멀리—!"
      }
    ],
    "ISK_L03_K2_003": [
      {
        "node": "ISK_L03_K2_003",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "끈이 풀린 포대 때문에 확인할 일이 있었던 건 알아. 그런데 네 얼굴은 기억나지 않아. 찾는 사람 이름은? 허리가 아프다는 말만으로는 이 구역의 짐꾼을 고를 수 없어."
      },
      {
        "node": "ISK_L03_K2_004",
        "profile": null,
        "speaker": null,
        "text": "입을 열었다가 닫았다. 닷새를 함께 지냈으면서 일할 때 부르는 소리와 푸념만 기억했다. 그를 가족에게 돌려보내려면 무엇부터 물어야 하는지 생각해 놓고도, 정작 이름조차 확실히 부를 수 없었다. 각청의 질문은 당연했는데 그 당연함이 견디기 어려웠다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_005",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "얼굴 보면 알아. 그분하고 의례에 같이 갔어. 돌아와서 짐 확인하기로 했고. 그런데 하늘에서 모락스의 시신이 떨어진 뒤에 사람들이 다 쓰러졌어. 너도, 그 사람도. 그래서 내가 데리고 나오려다가 못 하고… 지금 네가 살아 있으니까 그분도 찾고 싶어."
      }
    ],
    "ISK_L03_K2_006": [
      {
        "node": "ISK_L03_K2_006",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "제군의 시신이 떨어졌다는 말부터 처음 들어. 현장에 있었던 병사들을 불러 볼게. 네가 찾는 사람도 수레와 작업 구역을 보면 좁힐 수 있겠지. 대신 사람들 사이로 뛰어들지는 마. 지금 네가 무슨 말을 하는지 모르는 사람들이야."
      },
      {
        "node": "ISK_L03_K2_007",
        "profile": null,
        "speaker": null,
        "text": "각청은 직접 길을 앞장섰다. 사람들의 얼굴을 하나씩 살폈다. 자신을 기억하는 검수 병사는 있었지만 함께 의례에 간 짐꾼은 보이지 않았다. 병사는 그가 한동안 자리를 비운 것은 알면서도 언제 돌아왔는지 설명하지 못했다. 행사에 다녀왔다는 두 사람을 더 붙잡아 보아도 모락스가 추락한 장면을 기억하는 사람은 없었다."
      },
      {
        "node": "ISK_L03_K2_008",
        "profile": null,
        "speaker": "검수 병사",
        "text": "그분 짐은 아직 다른 데로 넘기지 않았습니다. 제가 임의로 손댈 수는 없으니까요. 그렇지만 사람이 죽었다는 이야기는… 그런 큰일을 들었으면 모르고 여기 서 있지는 않았을 겁니다. 아까부터 생각해 보는데 기억이 없습니다."
      }
    ],
    "ISK_L03_K2_019": [
      {
        "node": "ISK_L03_K2_019",
        "profile": null,
        "speaker": null,
        "text": "도착하자마자 나는 짐꾼이 쓰러졌던 곳으로 갔다. 돌바닥을 살피고, 사람의 몸을 끌다가 멈춘 자리를 찾았다. 각청이 뒤에서 멈추었다. 고개를 들어 의례장 안쪽을 보았다. 거대한 몸이 있어야 할 곳에는 아무것도 없었다. 사람만 사라진 것이 아니었다. 그날의 죽음을 가장 크게 증명하던 시신까지 없어졌다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_020",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "어디 갔어? 저기에 있었잖아. 내가 잘못 봤다고 해도 저만한 걸 사람 하나랑 헷갈릴 수는 없잖아. 누가 치웠어? 응광이 옮기라고 했으면 옮긴 사람이라도 있을 거 아냐!"
      }
    ],
    "ISK_L03_K2_021": [
      {
        "node": "ISK_L03_K2_021",
        "profile": null,
        "speaker": "현장 병사",
        "text": "시신을 옮기라는 명령은 확인되지 않았습니다. 지금 남아 있는 사람들도 본 적이 없다고 하고요. 응광 님께서 확인하라고 하셔서 다시 찾아봤습니다만, 인수한 곳이 없습니다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_022",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 누가 그냥 가져간 거네! 모두 기억 못 한다고 하면 가지고 간 사람은 손도 안 댄 셈이 되는 거야? 사람을 두고 도망친 놈은 나니까 나한테는 뭐라고 해도 되는데, 없어진 것까지 없던 일이 되면 안 되잖아!"
      }
    ],
    "ISK_L03_K2_023": [
      {
        "node": "ISK_L03_K2_023",
        "profile": null,
        "speaker": null,
        "text": "내 목소리가 현장에 울렸다. 자기 발 앞을 가리키다 손을 내려놓았다. 그 자리에 두고 간 몸의 무게를 아직 팔이 기억했다. 그런데 설명할수록 나는 사건을 아는 사람이 아니라 혼자 난리를 치는 사람이 되어 갔다. 각청은 이번에도 나를 끌어내지 않았지만, 나는 그 참는 눈길조차 견딜 수 없어 바닥으로 시선을 떨궜다."
      },
      {
        "node": "ISK_L03_K2_024",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "여기서 누가 네게 도망쳤다고 책임을 물었어? 네가 살아서 돌아와 말하고 있잖아. 확인할 자리를 찾았으니 이제 사람을 보낼 수 있어. 네가 네 말을 듣는 사람까지 밀어내면, 네가 찾는 사람한테도 도움이 안 돼."
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_025",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "도움이 되는 말만 하려고 애쓰고 있는데 잘 안 되네. 내가 그 사람을 여기 두고 갔어. 그건 아무도 안 따져도 내가 알아. 모락스라도 여기 있으면 적어도 내가 본 일은 남았다고 말할 수 있을 줄 알았어. 그런데 그것까지 없어졌잖아."
      }
    ],
    "ISK_L03_K2_031": [
      {
        "node": "ISK_L03_K2_031",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "이 몸에게 확인하면 된다더니, 정작 이 몸이 와도 인사할 숨은 남겨 두지 않았군. 산에서 그렇게 기진하더니 돌아와서는 또 목부터 쓰고 있는가. 자네가 말한 사람들 가운데 이 여인이 포함되어 있었지?"
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_032",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "네. 지금 살아 있어요. 그런데 저를 기억 못 하고, 응광도 모락스가 쓰러진 걸 기억 못 한답니다. 시신은 없어졌고요. 제가 같이 갔던 짐꾼은 아직 못 찾았어요. 찾고 나서 기뻐해야 하는데, 각청이 살아 있다는 걸 보자마자 그 사람부터 찾게 됐습니다."
      }
    ],
    "ISK_L03_K2_033": [
      {
        "node": "ISK_L03_K2_033",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "살아 있는 사람을 보고 다른 살아 있을 사람을 찾는 것이 잘못은 아니지. 다만 이 몸도 없는 사람을 이 자리에서 곧장 데려다줄 수는 없네. 자네의 말을 들은 뒤 다른 선인들에게 알렸고, 필요한 자들이 함께 왔어. 제군께 관한 일은 칠성과 직접 이야기하겠네."
      },
      {
        "node": "ISK_L03_K2_034",
        "profile": null,
        "speaker": null,
        "text": "선인들을 보며 처음으로 산길에서 한 일이 헛되지 않았다는 것을 실감했다. 짐꾼을 데려오지 못했지만 이야기는 전달했다. 그 말을 들은 누군가가 다른 이들에게 전했고, 그들이 실제로 이곳에 와 있었다. 기록에 남긴다는 말보다 발소리가 더 분명한 답이었다."
      },
      {
        "node": "ISK_L03_K2_035",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "자리를 마련하겠습니다. 제군의 시신을 옮겼다는 명령이나 인수는 찾지 못했습니다. 황금옥에도 사람을 보냈고요. 확인되지 않은 일을 확인된 일처럼 말씀드릴 수는 없지만, 없는 기억을 핑계로 기다리고 있지는 않겠습니다."
      },
      {
        "node": "ISK_L03_K2_036",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "그 마음가짐은 좋네. 그렇다면 길을 여는 일에 오래 걸릴 이유도 없겠지. 이 몸은 자네들의 자리를 빼앗으러 온 것이 아니라 제군과 리월의 일을 물으러 왔네. 대답할 수 있는 사람 앞으로 안내하게."
      },
      {
        "node": "ISK_L03_K2_037",
        "profile": null,
        "speaker": null,
        "text": "소는 선인들 뒤에서 나를 잠깐 살폈다. 망서 객잔에서 처음 만났을 때와 같은 간결한 눈길이었다. 그 앞에서 자신이 냄새의 주인인지 설명하려 하지 않았다. 산에서 류운차풍진군에게 전한 말은 이제 그녀가 알고 있었다. 각청에게까지 갑자기 옛 대화를 모두 쏟아 내는 대신 지금 필요한 질문을 골랐다."
      }
    ],
    "ISK_L03_K2_048": [
      {
        "node": "ISK_L03_K2_048",
        "profile": null,
        "speaker": null,
        "text": "응광은 내가 앉을 의자를 미리 비워 두었다. 흙 묻은 옷 때문에 망설이자 그녀는 의자를 새로 가져오라고 하지 않고 손으로 자리를 가리켰다. 내가 앉는 동안 다른 이들은 탁자에 지도를 펼쳤다. 귀한 물건을 더럽히는 걱정은 갑자기 아주 사소한 일이 되었지만, 응광이 그것을 사소하게 만들어 준 방식은 눈에 남았다."
      },
      {
        "node": "ISK_L03_K2_049",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "내 앞에 오기 위해 먼저 산을 다녀온 손님이네. 평소라면 기다린 값이 얼마나 되는지부터 물었을 텐데, 오늘은 시간이 없겠지. 제군에 관한 일과 황금옥에 관한 일, 모두 네가 꺼낸 이야기라고 들었어."
      }
    ],
    "ISK_L03_K2_053": [
      {
        "node": "ISK_L03_K2_053",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "사람 하나를 찾는 일과 항구를 지키는 일은 서로 깎아야만 값을 맞출 수 있는 거래가 아니야. 각청이 이미 사람을 붙였다고 들었어. 그 보고는 계속 받겠어. 이제 네가 이곳까지 와서 말하려던 다음 일을 들어 보자."
      },
      {
        "node": "ISK_L03_K2_054",
        "profile": null,
        "speaker": null,
        "text": "그 대답은 찾았다는 약속도 살아 있다는 위로도 아니었다. 그러나 나는 처음으로 자신의 부탁을 손에서 놓을 수 있었다. 누군가가 계속 들고 있겠다고 말했다. 류운차풍진군을 한 번 본 뒤 응광을 향해 몸을 바로 세웠다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_055",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "사실 제가 알고 있던 이야기에서는 모락스의 죽음은 계획이었습니다. 리월이 제군 없이 설 수 있는지 보기 위한 거였어요. 타르탈리아가 황금옥에서 신의 심장을 찾고, 뜻대로 되지 않으면 오셀을 불러오는 흐름으로 이어집니다. 저는 그걸 막으려고 해요."
      }
    ],
    "ISK_L03_K2_056": [
      {
        "node": "ISK_L03_K2_056",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "제군이 우리를 시험한다는 뜻이야? 우리에게는 기억이 끊겨서 당장 누구 말을 믿을지도 흔들리는 사람들이 있어. 그 고통까지 계획이라고 말하는 거라면 받아들일 수 없어."
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_057",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그건 아니야. 내가 알던 이야기에는 병사들 기억상실도, 의례장에서 사람들이 죽는 일도 없었어. 그래서 나도 화가 나는 거야. 분명 아는 줄 알고 왔는데, 그 사이에서 사람이 죽었는데, 큰 계획이 있겠지 하고 기다릴 수는 없잖아. 내가 아는 위험이라도 먼저 막자는 거야."
      }
    ],
    "ISK_L03_K2_058": [
      {
        "node": "ISK_L03_K2_058",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "산에서도 그와 같이 말했네. 자네들이 잊은 일을 먼저 이 몸에게 전했고, 제군의 계획이라는 말과 자신이 설명하지 못하는 참사를 나누어 이야기했지. 이 몸이 그 해석을 모두 받아들였다는 뜻은 아니네. 허나 오셀을 경계하라는 말을 듣고도 손 놓고 있을 이유는 없었어."
      },
      {
        "node": "ISK_L03_K2_059",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "내가 먼저 궁금한 건 네가 왜 그 이야기의 다음 일을 믿느냐는 거야. 앞에서 틀린 부분이 이렇게 많았다면, 타르탈리아가 네 예상대로 움직이지 않을 수도 있겠지. 그를 막는 데 사람과 시간을 보내는 동안 바다가 먼저 움직이면?"
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_060",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그래서 선인들에게 바다를 부탁한 겁니다. 저는 황금옥으로 가고요. 전부 제 말 한 줄에 걸라고는 못 해요. 하지만 저기서 위험을 막을 기회가 있는데, 어긋날 수도 있다는 이유로 여기서 기다리는 건 못 하겠습니다. 기다리는 동안에도 누군가는 일을 겪으니까요."
      }
    ],
    "ISK_L03_K2_061": [
      {
        "node": "ISK_L03_K2_061",
        "profile": null,
        "speaker": null,
        "text": "응광은 지도의 해안선을 손끝으로 짚었다. 그녀가 고개를 돌리자 비서가 대피 가능한 길과 아직 막혀 있는 길을 차례로 설명했다. 류운차풍진군은 바다 쪽을 맡을 선인들의 움직임을 짚었고, 각청은 사람을 빼낼 순서를 바꾸었다. 서로의 판단을 전부 좋아하지는 않아도, 손은 같은 지도 위에서 움직였다."
      },
      {
        "node": "ISK_L03_K2_062",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "황금옥은 확인할 거야. 네가 가겠다는 것도 들었고. 그 전에, 네가 아는 이야기에서 오셀은 어떻게 막았니? 공격을 늦추는 것과 끝내는 건 다르잖아. 네 얼굴을 보니 그 답이 마음에 들지 않는 모양인데."
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_063",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "군옥각입니다. 제가 아는 흐름대로 가면, 오셀을 막기 위해 이걸 포기해야 해요. 바다에 떨어뜨려야 합니다. 응광, 지금 내가 앉은 의자까지 당신이 골랐을 텐데 처음 온 사람이 집을 버리라는 말을 하는 게 얼마나 뻔뻔한지는 알아요. 그래도 말 안 하고 떠나면 더 비겁할 것 같아서요."
      }
    ],
    "ISK_L03_K2_064": [
      {
        "node": "ISK_L03_K2_064",
        "profile": null,
        "speaker": null,
        "text": "방의 소리가 멎었다. 의자 팔걸이에서 손을 떼었다. 짐꾼에게는 남의 짐을 함부로 맡을 수 없다고 말해 놓고, 지금은 더 큰 것을 잃어야 한다고 이야기하고 있었다. 응광은 내 손이 떨어지는 것을 보았지만 바로 답하지 않았다. 창 너머로 항구가 펼쳐져 있었다."
      },
      {
        "node": "ISK_L03_K2_065",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "네가 그 이야기를 알았다고 해서 내 군옥각에 대한 권리까지 얻은 건 아니야. 그렇지만 손해가 날 수 있다는 말을 듣기 싫어서 숨기는 사람도 아니지. 내가 알고 싶은 건 그 순간까지 무엇을 해 볼 수 있느냐는 거야. 떨어뜨리기 전까지는 아주 쓸모 있는 곳이거든."
      }
    ],
    "ISK_L03_K2_068": [
      {
        "node": "ISK_L03_K2_068",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "좋은 건물은 쓰임이 많지. 이 몸에게 조금 일찍 보였다면 손볼 부분도 더 짚었을 터인데, 지금은 공들여 설명할 시간이 없군. 바다의 경계는 맡겠네. 인간들의 준비가 늦어져 싸움터에 사람이 남는 일은 없도록 하게."
      },
      {
        "node": "ISK_L03_K2_069",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그건 저희가 하겠습니다. 다만 대피 중인 길 위로 싸움이 밀려오면 즉시 알려 주세요. 선인들이 지킨다는 말만 믿고 사람을 같은 자리에 세워 두지는 않을 겁니다. 움직일 길이 있어야 저희도 옮길 수 있어요."
      },
      {
        "node": "ISK_L03_K2_070",
        "profile": null,
        "speaker": null,
        "text": "류운차풍진군은 각청을 보다가 고개를 한 번 움직였다. 쉽고 다정한 합의는 아니었다. 선인에게는 오래 지켜 온 땅이었고 칠성에게는 지금 사람들을 먹이고 재우는 도시였다. 두 쪽이 그것을 설명하는 말은 달랐지만 지켜야 할 사람들의 위치는 같았다. 그 사이에서 더 끼어들지 않았다."
      }
    ],
    "ISK_L03_K2_082": [
      {
        "node": "ISK_L03_K2_082",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "물어봐. 내가 다른 일을 하고 있더라도 지나가지 말고. 네가 했던 증언을 기억하지 못하는 것과 지금 네가 부탁한 일을 놓치는 건 달라. 오늘 들은 일은 오늘부터 내가 맡는 거야."
      },
      {
        "node": "ISK_L03_K2_083",
        "profile": null,
        "speaker": null,
        "text": "그 말을 듣자 나는 각청에게 예전 일을 다시 증명하려던 마음을 조금 내려놓았다. 그녀는 닷새를 돌려줄 수 없었지만 새로운 일을 맡을 수 있었다. 짐꾼의 빈자리를 메울 사람처럼 대할 필요도 없었다. 자신 앞에서 살아 움직이며 자기 몫을 고르는 각청이었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_084",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 나도 내 몫 하러 갈게. 나 남의 짐 대신 맡는 재주는 없는데, 남의 일에 끼어드는 재주만 자꾸 느네. 이번에는 끝까지 끼어들고 돌아올 테니까 저쪽 자리 하나는 비워 둬."
      }
    ],
    "ISK_L03_K2_088": [
      {
        "node": "ISK_L03_K2_088",
        "profile": null,
        "speaker": null,
        "text": "황금옥 앞에서는 일꾼들이 밖으로 빠져나오고 있었다. 안쪽에서 충격이 난 뒤 주 출입문이 비틀려 관리 통로로 우회했다는 말이었다. 병사들은 사람들을 건물에서 더 멀리 옮겼다. 그 통로의 방향을 확인하고 돌아서서 길목을 보았다. 큰 수레를 세우면 문을 가릴 위치였다. 닷새 동안 물자 구역에서 익힌 감각이 엉뚱한 곳에서 도움이 되었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_089",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "저 수레는 문 앞에서 옆으로 빼 주세요. 사람이 급하게 나오면 바퀴에 걸리겠어요. 저는 안으로 들어가겠습니다. 타르탈리아가 나오면 앞을 막고 싸우려 하지 말고 사람들 쪽으로 못 가게 떨어져 주세요. 제가 어느 통로로 들어갔는지는 꼭 남겨 두시고요."
      }
    ],
    "ISK_L03_K2_092": [
      {
        "node": "ISK_L03_K2_092",
        "profile": null,
        "speaker": null,
        "text": "넓은 공간에 이르자 발소리가 길게 돌아왔다. 모락스의 시신은 보이지 않았다. 대신 타르탈리아가 서 있었다. 붉은 머리와 낯익은 옷차림을 확인하고도 바로 말을 걸지 못했다. 자신이 상상한 상대는 무언가를 찾고 있거나 뜻대로 되지 않아 불쾌해하고 있을 것 같았다. 눈앞의 남자는 빈 공간에서 기다리는 데 익숙해 보였다."
      },
      {
        "node": "ISK_L03_K2_093",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "들어오기 전에 바깥을 제법 정리했더군. 여기서 나갈 때도 그 길을 쓸 생각인가 봐. 준비성이 좋은 손님은 싫지 않아. 날 찾아온 거지?"
      }
    ],
    "ISK_L03_K2_096": [
      {
        "node": "ISK_L03_K2_096",
        "profile": null,
        "speaker": null,
        "text": "미간을 좁혔다. 낯선 사람에게 처음 말을 걸 때의 간격이 이상했다. 타르탈리아는 자신을 아는지 묻지 않았다. 알려진 이름을 들었다는 정도로 넘길 수도 있었지만, 시신과 신의 심장을 동시에 들은 사람의 얼굴치고는 놀라움이 너무 적었다. 그는 이곳에 온 이유를 따지는 대신 내가 어디까지 버틸지 보고 있는 것처럼 보였다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_097",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "질문 잘하네. 그럼 내 질문에도 답해 봐. 너, 지금 싸우고 싶어? 내가 아는 너라면 여기까지 온 상대를 보고 좀 더 들떠야 할 것 같은데. 아까부터 내가 뭘 할지만 기다리고 있잖아."
      }
    ],
    "ISK_L03_K2_098": [
      {
        "node": "ISK_L03_K2_098",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "네가 아는 나라는 말이 재미있군. 나는 아직 네 이야기를 많이 듣지 못했는데. 서로 아는 양이 다른 만남도 있겠지. 네가 그렇게 확신한다면 먼저 보여 줘. 내가 어떤 반응을 할지도 알고 있을 테니까."
      },
      {
        "node": "ISK_L03_K2_099",
        "profile": null,
        "speaker": null,
        "text": "말끝은 가벼웠다. 그러나 강한 상대를 만났을 때 솟아날 것 같은 열은 느껴지지 않았다. 내가 먼저 한 발 움직이자 타르탈리아의 시선은 무기가 아니라 발이 놓인 곳으로 잠깐 내려갔다. 전투에서 위치를 보는 것은 이상할 일이 아니었다. 그런데 그 짧은 시선이 이상하게 오래 남았다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_100",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "밖에 네 사람들이 있었어. 안쪽에서 연락이 끊겼다는데 찾으러 나갈 생각은 없어? 난 여기까지 오는 길에 남의 짐꾼 한 사람 못 찾았다는 얘기만 들었는데도 계속 걸렸거든."
      }
    ],
    "ISK_L03_K2_101": [
      {
        "node": "ISK_L03_K2_101",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "그래서 네가 여기 온 건 아니잖아. 못 찾은 사람 이야기로 시간을 벌려고? 네가 막겠다고 한 일을 막아 봐. 다른 사람은 네가 돌아간 다음에 찾아도 늦지 않을지 모르지."
      },
      {
        "node": "ISK_L03_K2_102",
        "profile": null,
        "speaker": null,
        "text": "내 손에 힘이 들어갔다. 말을 잘못 골랐다고 생각한 듯한 표정도, 일부러 도발하고 흡족해하는 기색도 없었다. 그저 상대가 아파하는 지점을 짚고 다음 반응을 기다렸다. 자신이 알고 있던 성격과의 차이를 설명할 이름을 찾으려다 그만두었다. 지금 필요한 것은 낯선 이유를 맞히는 일이 아니었다."
      }
    ],
    "ISK_L03_K2_111": [
      {
        "node": "ISK_L03_K2_111",
        "profile": null,
        "speaker": null,
        "text": "몇 번이나 넘어질 뻔하며 뒤로 물러났다. 내가 디딘 금 간 돌판을 타르탈리아도 피하려 몸을 틀었다. 공격이 끊긴 것은 잠깐이었다. 그 짧은 틈을 내 실력으로 착각할 여유는 없었다. 무기를 고쳐 쥐자 손끝이 아팠고, 다시 뻗기 전에 손을 숨기고 싶었다. 바깥의 사람들을 떠올리고서야 한 걸음 움직였다. 멋있는 싸움은 아니었다. 아직 여기서 끝낼 수 없다는 고집만 남아 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_112",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이제 그만해. 네가 다음에 뭘 하려고 했든 여기서 끝내. 나는 돌아가서 찾을 사람이 있어. 또 누군가가 없어졌다는 말만 듣고 서 있을 생각은 없으니까."
      }
    ],
    "ISK_L03_K2_113": [
      {
        "node": "ISK_L03_K2_113",
        "profile": null,
        "speaker": null,
        "text": "타르탈리아는 답하지 않았다. 그 침묵을 더 공격할 힘이 없다는 뜻으로 받아들이려 했다. 상대의 시선이 자신의 무기 끝에서 벗어났지만, 무엇을 보았는지 확인하기 전에 몸이 앞으로 나갔다. 마지막 틈이라고 판단했다. 결정타를 날리려 팔을 뻗는 순간, 발밑의 감각이 통째로 내려앉았다."
      },
      {
        "node": "ISK_L03_K2_114",
        "profile": null,
        "speaker": null,
        "text": "처음에는 자신이 중심을 잃은 줄 알았다. 곧 기둥의 장식이 떨어지며 바닥을 부쉈고, 천장을 가로지르는 들보가 뒤틀렸다. 출구 방향을 기억해 몸을 틀었다. 바깥의 수레를 치워 두었다는 생각이 스쳤다. 그쪽으로만 나가면 된다고, 길은 열어 두었다고 생각했다. 그러나 길이 남아 있어도 그 길에 닿을 시간이 남은 것은 아니었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_K2_115",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "황금옥 무너져요! 문에서 떨어져! 안으로 들어오지 마요!"
      }
    ],
    "ISK_L03_AA1_002": [
      {
        "node": "ISK_L03_AA1_002",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "옥형, 이 사람은 나와 함께 왔어. 네가 죽었다는 말은 내가 직접 본 일은 아니지만, 돌아올 때부터 저 상태였고 어디서 무엇을 확인했는지 계속 같은 이야기를 했지. 소란을 피우려고 준비한 얼굴은 아니야. 우선 손에 든 것부터 내려놓게 해 주면 좋겠는데."
      },
      {
        "node": "ISK_L03_AA1_003",
        "profile": null,
        "speaker": null,
        "text": "자기가 가방 끈을 얼마나 세게 당기고 있었는지 그제야 알았다. 호두가 말한 것은 무기가 아니었다. 손가락 사이에 파고든 가느다란 끈이었다. 각청도 그 손을 보고 병사에게 눈짓했다. 다가오던 창끝이 옆으로 비켜났다."
      }
    ],
    "ISK_L03_AA1_007": [
      {
        "node": "ISK_L03_AA1_007",
        "profile": null,
        "speaker": null,
        "text": "각청은 손목을 내려다보았다. 새로 생긴 흠집이나 숨은 표식이 있기를 바랐으나, 그걸 찾아내야만 눈앞의 사람이 각청이라는 뜻은 아니었다. 그녀는 내가 말한 가방을 한번 보고도 열라고 명령하지 않았다. 호두가 그 사이에 내 굳은 손가락을 하나씩 펴 주었다."
      },
      {
        "node": "ISK_L03_AA1_008",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 대화는 기억나지 않아. 지금 여기서 기억난다고 말하면 네가 기대는 근거만 더 잘못되겠지. 대신 네가 나온 길에는 사람을 보내겠어. 호두, 네가 함께 있었다는 건 언제부터야?"
      },
      {
        "node": "ISK_L03_AA1_009",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "이 사람이 밖으로 돌아온 뒤부터. 그리고 네가 방금 이 사람을 알아보지 못하는 것도 함께 봤고. 자, 그러면 둘 다 아직 할 일이 있네. 너는 길을 살피고, 우리는 도망쳐 나온 사람이 주저앉기 전에 앉을 곳부터 찾을게."
      },
      {
        "node": "ISK_L03_AA1_010",
        "profile": null,
        "speaker": null,
        "text": "그때 통제선 바깥에서 왕생당 직원이 급하게 달려왔다. 목격 신고를 전달하러 보냈던 직원이었다. 그는 호두 앞에서 멈췄다가 바로 옆에 선 각청을 보고 인사를 고쳐 했다. 가져온 것은 의례장의 결론이 아니라, 전혀 다른 집에서 생긴 일이었다."
      },
      {
        "node": "ISK_L03_AA1_011",
        "profile": null,
        "speaker": "왕생당 직원",
        "text": "당주님, 안쪽에서 사람이 왔습니다. 어제 돌아가신 분을 모신 임시 안치소에 손님 하나가 찾아왔는데, 자기도 죽었다고 한답니다. 이름을 물어보기도 전에 안에 계신 분의 성함을 댔고요. 방금은 지하에서 누가 문을 두드린다고 해서 사람을 내려보냈는데, 올라오지를 않습니다."
      }
    ],
    "ISK_L03_AA1_012": [
      {
        "node": "ISK_L03_AA1_012",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "아래에 몇 명이 들어갔어? 문을 열어 달라는 사람이 먼저 있었고, 그 뒤에 직원을 보낸 거야? 대답이 늦어진 정도인지, 길이 막힌 건지도 알아야 해."
      },
      {
        "node": "ISK_L03_AA1_013",
        "profile": null,
        "speaker": "왕생당 직원",
        "text": "짐 옮기던 일꾼 둘과 관리인이 내려갔습니다. 손님은 방 안에 있습니다. 안치하신 분의 유가족은 다른 곳으로 모셨고요. 이쪽으로 나오려다 문 안에서 사람 목소리가 자꾸 들려서, 문은 지켜보되 더 들어가지는 말라고 했습니다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA1_014",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그쪽도 사람이 죽었다고 해? 아니, 잠깐. 내가 겪은 일하고 같다는 뜻은 아니지. 살아 있는 사람이 자기가 죽었다고 말하고 있고, 아래에는 아직 대답이 없는 사람이 셋 있다는 거지?"
      }
    ],
    "ISK_L03_AA1_015": [
      {
        "node": "ISK_L03_AA1_015",
        "profile": null,
        "speaker": "왕생당 직원",
        "text": "예. 숨을 쉬고 걸어서 온 손님입니다. 하지만 관리인은 아래에서 자기 아버지 목소리가 난다고 했습니다. 그분 장례는 몇 해 전에 왕생당에서 치렀습니다."
      },
      {
        "node": "ISK_L03_AA1_016",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그럼 사람부터 데리러 가야지. 죽은 분의 이름을 안다고 길까지 잘 아는 건 아니니까. 옥형, 안치소까지 들어갈 수 있게 해 줘. 길이 막혔으면 들어간 사람을 먼저 꺼내고, 문을 두드리는 손님은 그다음에 만나겠어."
      },
      {
        "node": "ISK_L03_AA1_017",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "병사 둘을 붙이지. 안치소와 그쪽 보행로만 통과해. 그동안 다른 사람은 그 건물에서 나오게 하고, 내가 추가 인원을 보낼 때까지 누구도 지하로 내려가지 못하게 해."
      }
    ],
    "ISK_L03_AA1_026": [
      {
        "node": "ISK_L03_AA1_026",
        "profile": null,
        "speaker": null,
        "text": "임시 안치소는 평소 짐을 맡기던 건물을 빌려 가림막을 친 곳이었다. 장례를 기다리는 유해는 위쪽 작은 방에 모셨고, 지하는 비워 두었다고 했다. 마당에는 일을 멈춘 사람들이 모여 있었다. 왕생당 직원이 유가족을 다른 쉼터로 모신 뒤 돌아와 호두에게 열쇠 꾸러미를 넘겼다. 꾸러미에는 아래 문을 열 때 쓰는 열쇠가 없었다. 관리인이 가지고 내려갔다고 했다."
      },
      {
        "node": "ISK_L03_AA1_027",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "창문을 열고 입구는 비워 둬. 유가족에게는 내가 직접 찾아뵙겠다고 전해 줘. 아직 그분을 옮길 일이 생긴 건 아니니까 놀라게 하지 말고. 저기 앉은 분이 찾아온 손님이야?"
      },
      {
        "node": "ISK_L03_AA1_028",
        "profile": null,
        "speaker": null,
        "text": "마루 끝에 앉은 남자는 젖은 소매를 무릎 위에 올려놓고 있었다. 얼굴은 창백했지만 눈동자는 사람을 따라 움직였다. 내가 가까이 가자 그가 처음 한 일은 얼굴을 숨기는 것이 아니라, 신발을 가지런히 돌려놓는 것이었다. 남의 집에 흙을 들여온 걸 뒤늦게 걱정하는 사람 같은 동작이었다."
      },
      {
        "node": "ISK_L03_AA1_029",
        "profile": null,
        "speaker": "낯선 손님",
        "text": "여기가 맞는 줄 알았습니다. 누가 저를 불렀는데, 안에는 다른 분이 누워 계시더군요. 제 자리가 없다고 항의하려던 건 아닙니다. 저는 제가 죽은 줄 알았는데 몸은 이렇게 붙어 있고, 돌아가라는 집도 생각나지 않아서요."
      },
      {
        "node": "ISK_L03_AA1_030",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그럼 우선 살아 있는 손님 자리에 앉아. 자리는 있어. 이름이 안 떠오르면 지금 정할 필요도 없고. 대신 무슨 일이 있었는지, 네가 기억하는 마지막 장소부터 말해 줄래?"
      }
    ],
    "ISK_L03_AA1_031": [
      {
        "node": "ISK_L03_AA1_031",
        "profile": null,
        "speaker": "낯선 손님",
        "text": "물이 들어왔습니다. 위에서 문이 닫혔고요. 저는 바닥이 없는 줄 알고 헤엄을 쳤는데 발은 계속 돌에 닿았습니다. 그러다가 누가 제 이름 대신 남의 이름을 불렀어요. 그 이름을 따라오니 여기였습니다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA1_032",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "물이 들어왔다고? 그런데 아까부터 옷에서는 물이 안 떨어지네. 말리지 않은 채로 계속 앉아 있었어? 미안, 네 이야기를 따지는 게 아니라 바닥이 너무 말라 있어서 그래."
      }
    ],
    "ISK_L03_AA1_033": [
      {
        "node": "ISK_L03_AA1_033",
        "profile": null,
        "speaker": null,
        "text": "남자의 소매 가까이 손을 가져갔다가 멈췄다. 축축해 보이던 천에는 물이 아니라 아주 고운 검은 가루가 붙어 있었다. 남자가 손을 펴자 가루가 잠깐 떠올랐다가 바닥에 내려앉았다. 바다 냄새는 나지 않았다. 호두는 남자의 손목을 잠시 짚고, 다른 손에 따뜻한 물잔을 쥐여 주었다."
      },
      {
        "node": "ISK_L03_AA1_034",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "맥은 뛰고 있어. 숨도 쉬고 있고. 네가 겪은 일이 얼마나 무서웠든 지금 네 자리는 저 안의 누운 분 옆이 아니야. 그쪽을 비워 달라고 하는 손님도 없고. 여기서 물을 마시고, 저 직원과 함께 있어 줘."
      },
      {
        "node": "ISK_L03_AA1_035",
        "profile": null,
        "speaker": "낯선 손님",
        "text": "그런데 아래에서 자꾸 대답하라고 합니다. 제가 대답하면 다른 사람 이름으로 또 불러요. 아까는 저분을 불렀습니다. 아직 이 집에 들어오시기 전이었는데."
      },
      {
        "node": "ISK_L03_AA1_036",
        "profile": null,
        "speaker": null,
        "text": "남자의 시선이 나에게 닿았다. 호두는 고개를 돌리지 않고 남자를 보고 있었다. 남자는 내가 외곽에서 자기 입으로 몇 번이나 말했던 그 이름을 정확히 발음했다. 내 배가 서늘해졌다. 이 건물에 오겠다고 결정한 뒤 호두에게 자기 이름을 새로 소개한 적은 없었다."
      }
    ],
    "ISK_L03_AA1_039": [
      {
        "node": "ISK_L03_AA1_039",
        "profile": null,
        "speaker": null,
        "text": "남자가 가리킨 계단 아래에서 노크가 울렸다. 같은 문을 계속 두드리는 소리인데도 멀리서 나다가 바로 발밑으로 옮겨왔다. 가방을 앞쪽으로 끌어안았다. 안에 든 구슬은 무게가 달라지지 않았다. 호두는 귀를 기울이더니 웃음기 없는 얼굴로 마루 끝에서 신발을 벗고, 발바닥으로 바닥의 울림을 짚었다."
      },
      {
        "node": "ISK_L03_AA1_040",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "손님은 여기 있어. 네가 가야 조용해질 것 같다고 생각해도 가지 말고. 내가 다녀올게. 아래에 있는 사람들이 네 이름을 찾는 일까지 대신해 줄 수는 없잖아."
      }
    ],
    "ISK_L03_AA1_049": [
      {
        "node": "ISK_L03_AA1_049",
        "profile": null,
        "speaker": null,
        "text": "지하의 첫 문은 안쪽으로 비스듬히 꺾여 있었다. 물은 한 방울도 없었고 바닥에는 오래된 운반 자국이 남아 있었다. 등불 빛이 닿는 한쪽 구석에서 일꾼이 손을 흔들었다. 그는 허리 높이로 떨어진 선반 아래에 다리가 끼여 있었다. 조금 더 안쪽에는 또 다른 일꾼이 엎드린 관리인의 어깨를 잡고 버티고 있었다."
      },
      {
        "node": "ISK_L03_AA1_050",
        "profile": null,
        "speaker": "갇힌 일꾼",
        "text": "거기로 돌아가지 마세요! 문이 닫혔다가 열렸는데 계단이 다른 데로 붙었습니다. 제가 손을 넣었을 때는 안쪽에서 누가 잡아당겼고요. 저 사람은 아버지가 부른다고 들어갔다가 쓰러졌습니다. 숨은 쉽니다. 빨리 좀 도와주세요."
      },
      {
        "node": "ISK_L03_AA1_051",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "우리가 온 쪽에는 줄이 이어져 있어. 그걸 보고 나가면 돼. 다친 다리는 억지로 빼지 말고, 내가 선반을 들면 네 친구가 몸을 옆으로 밀어. 관리인은 내가 확인할 테니까 고개를 앞으로 처박게 두지 말고."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA1_052",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나는 밧줄 끝 잡으러 왔는데 어느새 이쪽 끝 담당이 됐네. 알았어, 줄 여기 있어. 손에 한 번만 감고 놓치지 마. 나보다 빨리 나가려다 같이 넘어지면 둘 다 면목 없으니까 천천히 가자."
      }
    ],
    "ISK_L03_AA1_053": [
      {
        "node": "ISK_L03_AA1_053",
        "profile": null,
        "speaker": null,
        "text": "일꾼에게 줄을 쥐여 주고 선반 아래에 접은 천을 받쳤다. 호두가 기울어진 선반을 밀자 나무가 긴 비명을 냈다. 일꾼은 악을 쓰며 다리를 빼냈고, 내 소매를 붙잡아 몸을 돌렸다. 붙잡힌 팔이 아팠다. 그 아픔은 누군가가 살아서 필사적으로 매달리고 있다는 뜻이어서, 나는 떼어 내지 않았다."
      },
      {
        "node": "ISK_L03_AA1_054",
        "profile": null,
        "speaker": null,
        "text": "두 번째 일꾼이 다친 사람을 문까지 끌고 갔다. 줄이 바깥으로 팽팽해졌고, 위에서 병사가 받아 주겠다는 목소리가 들렸다. 호두는 관리인의 턱 아래에 손을 대고 숨을 살폈다. 그때 방 안쪽의 노크가 멈추더니, 아주 가까운 곳에서 나이 든 남자의 목소리가 흘러나왔다."
      },
      {
        "node": "ISK_L03_AA1_055",
        "profile": null,
        "speaker": "벽 너머 목소리",
        "text": "문을 닫아라. 저 사람들을 들이면 내가 못 나간다. 네 아버지를 또 혼자 두고 갈 셈이냐."
      },
      {
        "node": "ISK_L03_AA1_056",
        "profile": null,
        "speaker": null,
        "text": "관리인의 눈꺼풀이 떨렸다. 그는 의식이 완전히 돌아오기도 전에 그쪽으로 팔을 뻗었다. 호두는 팔을 누르지 않고 손목을 잡아 자신의 소매를 쥐게 했다. 그 움직임은 놀랄 만큼 빠르고 조용했다. 사람을 다른 방향으로 끌어내기 전에, 잡고 있을 것을 바꿔 주는 동작이었다."
      },
      {
        "node": "ISK_L03_AA1_057",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "지금 잡은 건 네 아버지 손이 아니야. 왕생당 당주 호두의 옷소매고, 난 네가 여기서 나가는 걸 도와주러 왔어. 이름을 제대로 듣고 잡아. 그다음에 같이 일어나자."
      }
    ],
    "ISK_L03_AA1_058": [
      {
        "node": "ISK_L03_AA1_058",
        "profile": null,
        "speaker": "관리인",
        "text": "아버지가… 제가 그때 늦게 가서, 이번에는 문을 열어 드려야… 목소리가 분명히 들렸는데…."
      },
      {
        "node": "ISK_L03_AA1_059",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "늦었다는 마음을 안다고 아무나 네 아버지가 되는 건 아니지. 정말 그분이 네가 살아서 나가기를 바라셨는지, 혼자 기억해 봐. 나는 지금 네 목소리를 듣고 있어. 밖에서 기다리는 사람들도 마찬가지고."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA1_060",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "저기요, 저도 아까 누굴 두고 도망친 사람인데요. 이럴 때 한마디 제대로 하면 사람이 일어나는 줄 알았는데 아닌 것 같아서 그냥 부축할게요. 창피한 건 나가서 하고, 팔은 제 어깨에 얹으세요. 무거우면 무겁다고 말할 테니까 사양은 나중에 해요."
      }
    ],
    "ISK_L03_AA1_061": [
      {
        "node": "ISK_L03_AA1_061",
        "profile": null,
        "speaker": null,
        "text": "관리인이 내 어깨를 누르며 일어섰다. 세 사람의 몸이 좁은 문 쪽으로 돌아가는 순간, 내 가방에서 딱딱한 소리가 났다. 안에 다른 돌을 넣어 둔 적은 없었다. 호두의 손에 든 등불이 바람도 없는데 가방 쪽으로 길게 누웠다."
      },
      {
        "node": "ISK_L03_AA1_062",
        "profile": null,
        "speaker": null,
        "text": "불이 번지는 것이 아니었다. 불꽃의 끝이 가느다란 실처럼 뽑혀 나갔다. 내가 몸을 돌리자 그 실도 따라 움직였다. 방 반대쪽 벽은 여전히 밝은데, 가방을 향한 좁은 부채꼴 안에서는 손가락 윤곽이 지워졌다. 관리인은 뻗은 자기 팔을 보지 못하고 비명을 질렀다."
      },
      {
        "node": "ISK_L03_AA1_063",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "줄에서 손 놓지 마! 밖에 있는 사람, 지금 당겨요. 등불은 내려놓고 사람부터 받아요!"
      },
      {
        "node": "ISK_L03_AA1_064",
        "profile": null,
        "speaker": null,
        "text": "바깥에서 줄을 잡아당겼다. 관리인의 허리를 밀었고, 호두는 앞쪽 어깨를 받쳤다. 관리인이 문턱을 넘어간 직후 문짝이 아니라 돌벽의 모서리가 소리 없이 옆으로 미끄러졌다. 계단을 비추던 밝은 틈이 좁아졌다. 마지막으로 밖의 손이 관리인의 옷을 움켜쥐는 모습이 보였다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA1_065",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "받았어? 밖에 있는 사람들, 받았으면 줄을 두 번 당겨 줘! 우리 쪽은 길이… 아니, 소리 들리면 줄부터 당겨!"
      }
    ],
    "ISK_L03_AA1_073": [
      {
        "node": "ISK_L03_AA1_073",
        "profile": null,
        "speaker": null,
        "text": "가방을 호두의 발 옆에 낮게 내려놓았다. 돌바닥에 닿은 무게는 평소와 같았다. 덮인 천의 모서리가 저절로 들리지는 않았다. 호두가 등불을 뒤쪽에 놓자, 나는 어둠이 덜 걸친 방향에서 손을 넣어 매듭을 풀었다. 이미 호두에게 두 번 보여 주었던 바로 그 구슬이 드러났다."
      },
      {
        "node": "ISK_L03_AA1_074",
        "profile": null,
        "speaker": null,
        "text": "구슬 속에는 같은 유해가 있었다. 고개가 들리거나 눈이 뜨이는 일은 없었다. 그 고요가 오히려 무서웠다. 주변의 빛과 길이 달라지고 있는데 안에 있는 죽음만 처음 모습대로 남아 있었다. 구슬의 표면에는 등불이 비치지 않았다. 손바닥을 비추어야 할 작은 반사광조차 보이지 않았다."
      }
    ],
    "ISK_L03_AA1_077": [
      {
        "node": "ISK_L03_AA1_077",
        "profile": null,
        "speaker": null,
        "text": "호두가 손끝에 불빛을 피워 벽 쪽으로 보냈다. 불빛은 벽에 닿기 전 길게 찌그러져 구슬을 향했다. 호두는 곧바로 손을 거두었다. 어둠은 한 뼘 더 넓어졌고, 그 안에 걸친 나무 손잡이가 바닥에 떨어졌는데 떨어지는 소리는 들리지 않았다. 내 입안이 바싹 말랐다."
      },
      {
        "node": "ISK_L03_AA1_078",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "불은 더 쓰지 않을게. 네가 오른쪽으로 반 걸음 움직일 때 나는 왼쪽으로 갈 거야. 서로 밀지 말고, 네 손바닥에 힘이 빠지면 바로 말해. 오늘 이 물건을 길들이는 건 일정에서 빼자."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA1_079",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 일정은 애초에 내가 넣은 적도 없어. 밧줄 끝 잡는 일부터 이렇게 커질 줄 알았으면 밥을 더 먹었지. 알았어, 오른쪽 반 걸음. 네가 당기면 버티지 않을게."
      }
    ],
    "ISK_L03_AA1_080": [
      {
        "node": "ISK_L03_AA1_080",
        "profile": null,
        "speaker": null,
        "text": "작은 이동이 방 안의 그림자를 크게 바꾸었다. 어둠이 천장으로 기울고, 아까 계단이 있던 자리 아래에 네모난 구멍이 드러났다. 줄은 그 구멍으로 이어져 있었다. 호두가 다가가 줄을 힘껏 잡아당겼다. 바깥에서도 당기는 힘이 돌아왔다. 길이 사라진 것 같아도 그 끝에 있던 사람은 사라지지 않았다."
      },
      {
        "node": "ISK_L03_AA1_081",
        "profile": null,
        "speaker": null,
        "text": "줄을 따라 접힌 천 꾸러미와 짧은 나무 막대가 안으로 밀려 들어왔다. 바깥 병사가 좁은 틈을 다시 벌려 보려는 모양이었다. 호두는 막대를 받아 틈에 끼웠지만 나무는 돌을 버티지 못하고 갈라졌다. 내가 구슬을 반대편으로 옮기자 틈은 잠깐 더 넓어졌다. 그 너머로 관리인이 살아서 바닥에 앉아 있는 모습이 보였다."
      },
      {
        "node": "ISK_L03_AA1_082",
        "profile": null,
        "speaker": "관리인",
        "text": "당주님! 두 분 다 나와요. 제가 줄 잡고 있을 테니까, 빨리…!"
      },
      {
        "node": "ISK_L03_AA1_083",
        "profile": null,
        "speaker": null,
        "text": "말 끝이 끊겼다. 소리가 막힌 것이 먼저였고, 틈이 닫힌 것은 그다음이었다. 호두의 어깨를 밀어 넣으려다 손을 멈췄다. 폭은 사람의 머리 하나도 지나가지 못할 만큼 좁았다. 무리하게 밀면 그녀를 끼게 할 수 있었다. 호두가 대신 내 손등을 잡고 아래로 눌렀다."
      },
      {
        "node": "ISK_L03_AA1_084",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "둘 다 여기 있어. 한 사람을 억지로 넣을 틈이 아니야. 구슬은 네 허리보다 아래로. 천천히, 좋아. 이제 네 발을 내 발 옆에 놓아."
      }
    ],
    "ISK_L03_AA1_087": [
      {
        "node": "ISK_L03_AA1_087",
        "profile": null,
        "speaker": null,
        "text": "호두는 어둠 속에서 먼저 내 손목을 잡았다. 손끝으로 맥박을 세려는 것이 아니라 서로 떨어지지 않으려는 동작이었다. 구슬을 천으로 다시 감쌌다. 빛을 막으려는 시도가 아니었다. 눈에 보이지 않을 때라도 이 물건이 어느 손에 있는지 분명하게 두고 싶었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA1_088",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "셋은 나갔어. 너도 봤지? 이 말까지 네가 기억 못 한다고 하면 나는 이번에는 정말 못 버틸 것 같아. 내가 봤다는 말 말고, 같이 봤다는 말을 한 번만 해 줘."
      }
    ],
    "ISK_L03_AA1_089": [
      {
        "node": "ISK_L03_AA1_089",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "봤어. 선반에 깔렸던 사람, 그 옆에서 버티던 사람, 마지막 관리인까지. 마지막엔 관리인이 우리한테 빨리 나오라고 했지. 네가 혼자 본 게 아니야. 그리고 지금 내 손을 잡은 것도 너고."
      },
      {
        "node": "ISK_L03_AA1_090",
        "profile": null,
        "speaker": null,
        "text": "숨을 길게 내쉬었다. 출구가 생긴 것도 구조대가 바로 닿은 것도 아니었지만, 방금 일어난 일 전체를 혼자 지키지 않아도 된다는 안도감이 있었다. 호두는 잠시 그대로 기다렸다가, 구슬을 들지 않은 내 손을 벽에 대 주었다."
      },
      {
        "node": "ISK_L03_AA1_091",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "벽을 따라가면서 바람이 닿는 틈을 찾자. 목소리가 들리면 바로 부르지 말고 나를 먼저 봐. 아까 저쪽은 네 이름을 먼저 알았어. 이제는 네 대답도 흉내 낼 수 있다고 생각하고 움직이는 게 좋겠지."
      }
    ],
    "ISK_L03_AA1_094": [
      {
        "node": "ISK_L03_AA1_094",
        "profile": null,
        "speaker": null,
        "text": "두 사람은 벽을 따라 세 걸음 움직였다. 그때 벽 안쪽에서 노크가 울렸다. 내 손바닥 바로 아래였다. 반대편 누군가가 같은 높이에 손을 대고 있는 것처럼, 소리가 손목 뼈를 타고 올라왔다. 호두는 내 다른 손을 놓지 않았다."
      },
      {
        "node": "ISK_L03_AA1_095",
        "profile": null,
        "speaker": "벽 너머 목소리",
        "text": "셋은 나갔어. 너도 봤지? 이제 네가 나가면 돼. 이쪽에는 자리가 있어."
      },
      {
        "node": "ISK_L03_AA1_096",
        "profile": null,
        "speaker": null,
        "text": "목소리는 나와 같았다. 방금 자신이 한 말 뒤에, 한 적 없는 문장이 붙었다. 호두의 손등을 누른 적은 없었다. 그런데 돌벽 아래에서 또 다른 손가락 마디가 맞장단처럼 두 번 두드렸다. 구슬을 감싼 천이 내 손바닥 안에서 갑자기 차가워졌다."
      },
      {
        "node": "ISK_L03_AA1_097",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그쪽 자리에는 안 갈 거야. 이쪽에는 둘이 있으니까. 내 손을 놓지 마."
      },
      {
        "node": "ISK_L03_AA1_098",
        "profile": null,
        "speaker": null,
        "text": "호두가 말을 마친 뒤에도 노크는 계속되었다. 천장 어딘가에서 마른 가루가 떨어졌고, 막힌 돌벽에는 손바닥만 한 검은 틈이 천천히 벌어졌다. 두 사람은 서로의 손을 잡은 채 물러났다. 그 안에서 누가 나오려는지, 바깥 사람들이 이 방까지 닿을 수 있는지는 아직 알 수 없었다."
      }
    ],
    "ISK_L03_AA2_003": [
      {
        "node": "ISK_L03_AA2_003",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "네 신고를 읽어 볼게. 내가 기억하지 못한다고 없애면 기억을 잃은 병사들이 올린 보고도 전부 버려야 하니까. 다만 내 앞에서 네가 죽음을 확인했다고 말하는 만큼, 그때 무엇을 했는지는 자세히 물을 수밖에 없어."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_004",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "물어봐. 다만 오늘 안에 모든 질문을 끝내려고 하면 서로 지칠 것 같아. 나도 확인하고 싶은 사람이 있어. 몬드에서 내 옆에 있었던 사람. 그 사람까지 나를 모른다고 하기 전에, 내가 먼저 연락해야겠어."
      }
    ],
    "ISK_L03_AA2_005": [
      {
        "node": "ISK_L03_AA2_005",
        "profile": null,
        "speaker": null,
        "text": "각청은 입구를 막고 있던 병사에게 작은 책상을 비우라고 했다. 종이를 펴서 눌렀다. 손끝의 주름은 펴졌지만 글씨 밑에 눌린 자국은 남았다. 각청은 내가 신고한 위치를 묻고 다른 담당에게 넘겼다. 그녀에게 이전의 대화를 떠올리게 만들지는 못했다. 대신 이 자리에서 말을 남기고 다른 일을 시작할 틈은 생겼다."
      },
      {
        "node": "ISK_L03_AA2_006",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "기사단에 연락할 생각이라면 외곽 연락소를 이용해. 항구가 닫힌 동안에도 지역 밖으로 나가는 긴급 연락은 이어지고 있어. 네가 누군지 확인하는 일과 실제 도움을 청하는 일은 구분해서 적어. 상대도 무엇을 준비해야 할지 알아야 하니까."
      }
    ],
    "ISK_L03_AA2_016": [
      {
        "node": "ISK_L03_AA2_016",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "이야기는 했어? 표정만 보면 책임자를 만나고 온 게 아니라 책임자가 둘로 늘어난 것 같은데. 물부터 마셔. 무슨 말을 하든 목이 먼저 버텨야 하니까."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_017",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "각청이 살아 있어. 걸어 다니고, 지시하고, 내 편지도 보내 주겠대. 그런데 나를 몰라. 내가 본 죽음은 없어지지 않았는데 그 사람은 여기서 다음 일을 하고 있어. 그래서 이제 몬드에 사람을 보내 달라고 할 거야."
      }
    ],
    "ISK_L03_AA2_018": [
      {
        "node": "ISK_L03_AA2_018",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그럼 보내자. 지금 네가 제일 필요한 게 같이 봤던 사람이라면, 여기서 말만 되풀이하는 것보다 낫지. 난 저쪽 손님을 모셔야 하니까 편지 쓰는 동안은 못 앉아 있어. 다 썼다고 가방까지 두고 가지는 말고."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_019",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "가방 맡기는 게 더 민폐라는 건 알아. 아직 너한테 안을 보여 준 적도 없는데 떠넘길 수는 없지. 오늘은 편지 한 장 맡길 데만 있으면 돼. 내가 사라지면 어떻게 하라는 문장부터 쓰지 않도록 옆에서 말려 줘서 고맙고."
      }
    ],
    "ISK_L03_AA2_020": [
      {
        "node": "ISK_L03_AA2_020",
        "profile": null,
        "speaker": null,
        "text": "호두는 웃다가 곧 표정을 가다듬었다. 내가 정말 그 문장으로 시작하려 했다는 걸 알아챈 모양이었다. 그녀는 빈 종이를 한 장 더 놓아 주고 먼저 일어섰다. 첫 줄에 자신이 살아 있고 리월항 밖에 있다고 썼다. 그 문장을 다 쓴 뒤에야 남의 죽음을 적을 수 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_021",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "받는 사람은 기사단, 진에게. 벤티한테도 꼭 전해 줬으면 좋겠어. 의례장에서 사람들이 실제로 죽었고, 지금 살아 있는 각청이 나를 모른다는 것부터 쓸게. 구슬은 열지 않았고 유해도 밖에 나온 적 없다고. 몬드에서 그걸 같이 본 사람의 대답이 필요해. 가능하면 이런 물건을 살필 줄 아는 사람도 보내 달라고 할 거야. 혼자 가지고 있기는 이제 겁이 난다고."
      }
    ],
    "ISK_L03_AA2_022": [
      {
        "node": "ISK_L03_AA2_022",
        "profile": null,
        "speaker": "연락 담당",
        "text": "임시 연락처를 이곳으로 적으십시오. 앞선 조회는 안쪽 접수처를 거쳐 나갔는데 봉쇄 중에 회신이 다른 곳에 머물 수 있습니다. 이번 편지는 제가 오늘 떠나는 담당에게 직접 넘기겠습니다. 답이 오면 여기서 찾을 수 있게 남겨 두겠습니다."
      },
      {
        "node": "ISK_L03_AA2_023",
        "profile": null,
        "speaker": null,
        "text": "의례장에서 실제로 사람들이 죽은 일, 각청이 지금 살아 있으나 자신을 알아보지 못하는 일, 구슬은 열지 않았고 같은 유해가 안에 있는 일을 적었다. 말로 꺼냈을 때는 한꺼번에 쏟아지던 이야기가 종이 위에서는 여러 줄을 차지했다. 편지를 받는 사람이 어디서 숨을 고를지 생각하며 문장 사이를 조금 띄웠다. 마지막에는 와 달라는 말을 지우지 않고 그대로 두었다."
      },
      {
        "node": "ISK_L03_AA2_024",
        "profile": null,
        "speaker": null,
        "text": "연락 담당이 봉한 편지를 가방에 넣었고, 나는 밖에 나가 출발하는 모습을 끝까지 보았다. 이 편지는 실제로 몬드를 향해 떠났다. 닷새 동안 먼저 보냈던 조회의 답을 기다린 일과 이번에 현장 지원을 청한 일은 그때부터 서로 다른 진행을 갖게 되었다."
      }
    ],
    "ISK_L03_AA2_027": [
      {
        "node": "ISK_L03_AA2_027",
        "profile": null,
        "speaker": null,
        "text": "첫날 밤에는 가까이서 컵이 떨어지는 소리에 잠이 깼다. 죽는 순간의 소리가 아니었다. 피곤한 사람이 팔꿈치로 컵을 밀었을 뿐이었다. 사과하는 사람에게 손을 저어 보인 뒤 한동안 누워 있지 못했다. 다음 날에는 일부러 연락소의 짐을 옮겼다. 몸이 아프면 생각이 줄어들 거라는 계산이었는데, 생각은 줄지 않고 어깨만 아팠다."
      },
      {
        "node": "ISK_L03_AA2_028",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "바쁜 사람 흉내를 내려면 쉬는 시간도 흉내 내야지. 네가 그 상자를 세 번째 옮기는 동안 상자 주인은 계속 옆에서 기다리고 있어. 도와주려던 거면 이제 내려놓아도 돼."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_029",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "같은 걸 다시 옮기고 있었어? 미안, 빈자리를 만들려고 했는데 빈자리만 자꾸 따라다녔네. 사람 기다리는 것도 할 줄 알아야 하구나. 나 원래 이 정도로 쓸모없는 사람은 아닌데."
      }
    ],
    "ISK_L03_AA2_033": [
      {
        "node": "ISK_L03_AA2_033",
        "profile": null,
        "speaker": null,
        "text": "호두는 그날 저녁부터 안쪽 장례 일을 맡아 외곽에 오래 머무르지 못했다. 그녀가 떠나기 전에 나는 손을 들어 인사했다. 구슬은 여전히 보여 주지 않았다. 그녀가 보지 않은 사실을 못 미더워한 것은 아니었다. 한 번 열면 상대가 감당해야 할 광경이 생긴다는 걸 알게 되었고, 누구에게 언제 보여 줄지는 아직 자신에게 남은 선택이었다."
      },
      {
        "node": "ISK_L03_AA2_034",
        "profile": null,
        "speaker": null,
        "text": "나흘째 아침에는 안쪽 접수 담당이 밀린 회신 묶음을 가져왔다. 몬드에서 먼저 보냈던 조회 답이 그 안에 섞여 있었다. 오래 기다린 종이는 몬드의 부정을 담고 있지 않았다. 리월 안쪽으로 들어온 뒤 바뀐 대기 장소를 찾지 못해 멈췄던 답이었다. 봉투를 뜯으며 어이가 없어 웃었다가, 그 웃음 때문에 눈물이 날 것 같아 입을 다물었다."
      }
    ],
    "ISK_L03_AA2_036": [
      {
        "node": "ISK_L03_AA2_036",
        "profile": "PROFILE_MOND_VENTI",
        "speaker": "벤티",
        "text": "네가 몬드에서 본 것은 네 혼자 지어낸 이야기가 아니야. 그 유해가 구슬 안으로 들어가는 모습을 나도 보았고, 내가 설명할 수 없어서 네게 모락스를 만나 보라고 했지. 이 글이 설명을 대신하진 못하겠지만, 네가 봤다는 말을 혼자 붙들고 있을 필요는 없다는 대답은 될 거야."
      },
      {
        "node": "ISK_L03_AA2_037",
        "profile": null,
        "speaker": null,
        "text": "편지에는 벤티의 필체로 짧은 덧붙임이 있었다. 돌아오는 길에 마실 것을 사 오라는 식의 농담을 쓰려다가, 지금 그런 말을 하면 내가 정말 짐을 하나 더 들고 올 것 같아 그만두었다는 내용이었다. 그 부분을 두 번 읽었다. 자신을 모르는 누군가가 대신 써 준 문장 같지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_038",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "기억하고 있네. 내가 그때 무슨 얼굴을 했는지까지 기억하고 있어. 물건만 확인해 달라고 보낸 줄 알았는데, 사실 이걸 기다렸나 봐. 적어도 내가 몬드에서부터 혼자 떠들고 다닌 건 아니라는 말."
      }
    ],
    "ISK_L03_AA2_039": [
      {
        "node": "ISK_L03_AA2_039",
        "profile": null,
        "speaker": "연락 담당",
        "text": "새 요청은 아직 돌아오지 않았습니다. 이 편지는 먼저 보낸 조회의 답입니다. 도착한 장소가 달라서 늦었습니다. 이쪽에 와서 기다리고 계신다고 표시해 두겠습니다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_040",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "응, 그건 알아. 그래도 이건 내가 갖고 있을게. 답을 받았다고 버릴 수 있는 종이가 아니야. 늦게라도 찾아 줘서 고마워. 화낼 곳이 없어진 건 아닌데, 지금은 그거보다 읽을 데가 생겨서 좋아."
      }
    ],
    "ISK_L03_AA2_044": [
      {
        "node": "ISK_L03_AA2_044",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "이 편지를 쓴 사람이 너라고 들었어. 나는 기사단의 알베도야. 진 단장에게 요청을 전달받았고, 벤티에게도 직접 들었어. 우선 오늘은 네가 계속 들고 다녔다는 물건보다 너를 먼저 만나야겠다고 생각했지. 잠은 조금 잤어?"
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_045",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "만나자마자 수면부터 검사하는 사람이 올 줄은 몰랐네. 반가워, 진짜로. 와 달라고 쓰긴 했는데 누가 실제로 오니까 할 말이 없어졌어. 구슬을 먼저 내밀어야 하나, 가방부터 받아 줘야 하나 생각 중이야."
      }
    ],
    "ISK_L03_AA2_046": [
      {
        "node": "ISK_L03_AA2_046",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "내 가방은 내가 들 수 있어. 네가 내밀 물건도 조금 뒤에 보면 되고. 다만 오래 서 있기 힘들면 먼저 앉자. 편지에 네가 겪은 일을 적었는데, 마지막에 네 상태를 쓴 문장만 여러 번 고친 흔적이 있더군."
      },
      {
        "node": "ISK_L03_AA2_047",
        "profile": null,
        "speaker": null,
        "text": "알베도는 봉투에서 내가 보낸 편지를 꺼냈다. 부탁을 받은 사람이 그 부탁을 손에 들고 왔다. 그는 벤티의 두 번째 짧은 답과 진이 현장 조사를 맡겼다는 회신도 함께 건넸다. 연락소 담당은 지원자가 실제로 도착한 것을 적고, 내가 기다리던 표시에 줄을 그었다. 기다림이 사라진 것이 아니라 도착으로 바뀐 표시였다."
      },
      {
        "node": "ISK_L03_AA2_048",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "네 새 편지는 사흘째 몬드에 도착했어. 그날 필요한 기록을 받아 두고 다음 아침 길을 나섰지. 벤티는 몬드에서 목격한 일까지 다시 설명해 줬어. 여기서 일어난 죽음은 직접 보지 못했으니 네게 듣는 게 맞다고 했고."
      }
    ],
    "ISK_L03_AA2_060": [
      {
        "node": "ISK_L03_AA2_060",
        "profile": null,
        "speaker": null,
        "text": "알베도가 쉬는 동안 나는 연락소의 조용한 빈 천막을 빌렸다. 호두는 안쪽 장례 일정 때문에 그 자리에 없었다. 천막에는 두 사람과 닫힌 가방만 남았다. 알베도는 휴대 도구를 내려놓았지만 곧바로 펼치지 않았다. 먼저 나에게 맞은편 자리를 가리켰다."
      },
      {
        "node": "ISK_L03_AA2_061",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "벤티가 본 광경은 들었지만 나는 아직 안을 보지 못했어. 오늘 네가 보여 주고 싶지 않다면 포장한 상태에서 주변 변화를 살피는 것부터 할 수 있어. 안에 있는 분을 꺼내는 시도는 지금 할 이유가 없고."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_062",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "호두한테도 이야기만 했어. 장례 일을 하는 사람이니까 보여 주면 뭔가 알지도 모른다고 생각은 했는데, 결국 못 열었지. 지금 네가 봤으면 좋겠다는 마음도 있고 아무도 더 안 봤으면 좋겠다는 마음도 있어."
      }
    ],
    "ISK_L03_AA2_072": [
      {
        "node": "ISK_L03_AA2_072",
        "profile": null,
        "speaker": null,
        "text": "조사는 예상보다 소박하게 시작되었다. 알베도는 흰 종이 위에 작게 표시를 하고, 가방을 가까이 두었을 때와 떨어뜨렸을 때를 비교했다. 천막 안에서는 아무 일도 일어나지 않았다. 오히려 그 평범함에 당황했다. 자신의 생활을 이렇게 크게 바꿔 놓은 물건이 조사대 위에서는 얌전한 짐처럼 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_073",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "평소에는 갑자기 사람을 들여보내더니, 정작 보겠다는 사람이 오니까 아무것도 안 하네. 나 없을 때는 얌전한 애가 손님만 가면 사고 치는 경우랑 반대잖아. 네가 계속 옆에 있으면 해결되는 거면 아주 좋겠는데."
      }
    ],
    "ISK_L03_AA2_074": [
      {
        "node": "ISK_L03_AA2_074",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "계속 옆에 있어 달라는 부탁으로 받으면 될까? 안타깝지만 내가 근처에 있다는 것만으로 달라졌는지는 아직 몰라. 장소가 바뀌었기 때문일 수도 있고, 반응할 대상이 없기 때문일 수도 있지."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_075",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "부탁은 맞는데 연구 결론으로 적진 말아 줘. 나중에 네가 다른 데 가야 할 때 발목 잡는 기록이 되면 좀 치사하니까. 그럼 다음엔 어디서 볼 거야?"
      }
    ],
    "ISK_L03_AA2_078": [
      {
        "node": "ISK_L03_AA2_078",
        "profile": null,
        "speaker": null,
        "text": "골짜기 입구에는 비가 그친 뒤 남은 웅덩이가 있었다. 물 위로 작은 슬라임들이 느릿하게 튀어 다녔다. 내가 가까이 다가가자 가장 바깥의 한 마리가 튀어 오르던 동작을 멈췄다. 몸이 터지거나 죽은 것처럼 사라지지는 않았다. 납작해진 물방울처럼 바닥에 가라앉아 흔들렸다."
      },
      {
        "node": "ISK_L03_AA2_079",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "여기서 멈춰. 가방을 내리지 말고 지금 선 자리를 기억해 둬. 내가 한 발 옆으로 갈게. 네가 움직였을 때와 내가 움직였을 때를 나눠 봐야겠어."
      },
      {
        "node": "ISK_L03_AA2_080",
        "profile": null,
        "speaker": null,
        "text": "알베도가 옆으로 움직이는 동안 슬라임은 변하지 않았다. 내가 뒤로 한 발 물러나자 납작하던 몸이 조금 부풀었다. 다시 앞으로 나아가지는 않았다. 눈앞의 작은 생명체를 자신 때문에 바닥에 눌린 것처럼 바라보다가, 가방 끈을 어깨에서 빼려 했다."
      }
    ],
    "ISK_L03_AA2_083": [
      {
        "node": "ISK_L03_AA2_083",
        "profile": null,
        "speaker": null,
        "text": "내가 물러나자 슬라임은 천천히 몸을 부풀렸다. 제자리에서 두 번 작게 튄 뒤 웅덩이 반대편으로 도망갔다. 잡으러 가거나 따라오게 만들지는 않았다. 알베도는 땅에 작은 표시를 남기고, 내 얼굴을 살폈다. 가방을 내려놓지 않은 채 숨을 고르고 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_084",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "괜찮냐고 물으려는 표정이네. 아직은 괜찮아. 다만 내가 동물들이 싫어하는 사람이면 조금 서러울 것 같아. 먹을 거 들고 가도 도망가던데 이제 이유가 하나 더 생겼어."
      }
    ],
    "ISK_L03_AA2_085": [
      {
        "node": "ISK_L03_AA2_085",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "지금 본 것을 네가 싫어서 도망갔다고 받아들일 필요는 없어. 가까워졌을 때 움직임이 달라졌고 멀어졌을 때 회복했어. 그 두 가지를 봤지. 네 성격에 대한 반응은 아니야."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_086",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그렇게 딱 잘라 말해 주니까 조금 낫네. 자, 그럼 성격은 무사한 걸로 하고. 이걸 바닥에 놓고 나만 떨어져 보면 되지? 네가 대신 들 필요는 없어. 내가 여기까지 가져왔으니까 놓는 것까지는 할게."
      }
    ],
    "ISK_L03_AA2_093": [
      {
        "node": "ISK_L03_AA2_093",
        "profile": null,
        "speaker": null,
        "text": "가방을 돌 위에 놓았다. 천에 싸인 구슬은 안쪽에 그대로 있었다. 알베도가 가방과 나 사이에 서지 않도록 옆으로 비켰다. 손을 떼고 일어났고, 두 걸음을 물러났다. 그때 웅덩이 위의 잔물결이 한쪽으로 길게 당겨졌다. 물은 움직이지 않는데 물 위의 반짝임만 돌 쪽으로 옮겨가는 것처럼 보였다."
      },
      {
        "node": "ISK_L03_AA2_094",
        "profile": null,
        "speaker": null,
        "text": "골짜기 아래에서 날리던 가는 빛들이 낮아졌다. 바람에 흩어져야 할 작은 입자들이 땅을 향해 가라앉았고, 알베도가 바위 옆에 만들어 둔 짧은 원소의 흔적도 윤곽을 잃었다. 돌은 깨지지 않았다. 주변이 밝은 낮인데도 가방 주위에는 해가 닿지 않은 얼룩 같은 원이 생겼다."
      },
      {
        "node": "ISK_L03_AA2_095",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "가방에서 더 떨어져. 내 쪽으로 곧장 오지 말고 왼쪽 마른 길로. 물건은 지금 그대로 둬도 돼."
      },
      {
        "node": "R39_PROSE_ISK_L03_AA2_096",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나도 그렇게 하려는데 왼발이… 잠깐, 신발이 걸린 건 아닌 것 같아. 발목은 안 아픈데 몸이 이쪽으로 안 돌아가. 손은 움직여. 아직 손은…."
      }
    ],
    "ISK_L03_AA2_097": [
      {
        "node": "ISK_L03_AA2_097",
        "profile": null,
        "speaker": null,
        "text": "말을 끝내기 전에 내 오른손이 멈췄다. 허공에 든 손가락이 오므라들지도 펴지지도 않았다. 땅이 발을 붙잡은 느낌과 달랐다. 발끝을 움직이라는 생각이 몸에 닿지 않았다. 눈앞의 풀은 바람에 흔들렸고 알베도의 옷자락도 움직였다. 세상이 모두 멈춘 것이 아니라 내 몸만 명령을 받지 않았다."
      },
      {
        "node": "ISK_L03_AA2_098",
        "profile": null,
        "speaker": null,
        "text": "알베도가 곧바로 팔을 잡았다. 그의 손은 움직였다. 내 팔은 알베도가 끄는 만큼 따라왔지만 힘을 싣지 못했다. 한쪽 무릎이 꺾였고, 알베도가 어깨를 받쳐 바닥에 닿지 않게 했다. 소리를 내려고 했다. 턱과 혀가 움직이지 않았다. 입 안에 고인 숨이 목을 지나갈 때의 가느다란 감각만 남았다."
      },
      {
        "node": "ISK_L03_AA2_099",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "내 목소리 들리면 눈을 감아 봐. 억지로 고개를 움직이지 말고. 좋아, 들리는구나. 지금 옮길게. 네가 걷지 못해도 괜찮으니 내 쪽으로 몸을 맡겨."
      },
      {
        "node": "ISK_L03_AA2_100",
        "profile": null,
        "speaker": null,
        "text": "눈을 한번 감았다. 그것만은 할 수 있었다. 알베도가 팔을 어깨에 걸고 나를 뒤로 옮겼다. 가방이 있던 돌에서 멀어지는데도 손은 돌아오지 않았다. 슬라임들은 이미 웅덩이 너머로 사라져 있었고, 골짜기의 빛은 계속 낮아지고 있었다. 알베도는 나를 마른 바위에 기대게 한 뒤 호흡을 확인했다."
      },
      {
        "node": "ISK_L03_AA2_101",
        "profile": null,
        "speaker": null,
        "text": "알베도의 손을 잡고 싶었다. 힘을 주려 할수록 어디에 손이 있는지부터 멀어졌다. 알베도가 손바닥을 펴 주자 손가락이 그대로 누웠다. 주변은 계속 움직였고, 자신에게만 비어 있는 간격이 생겼다. 머릿속에서는 문장이 길게 이어졌지만 바깥으로 나간 말은 하나도 없었다."
      }
    ],
    "ISK_L03_AA2_105": [
      {
        "node": "ISK_L03_AA2_105",
        "profile": null,
        "speaker": null,
        "text": "가방과의 거리는 더 벌어졌는데도 손끝은 돌아오지 않았다. 알베도는 다시 내 옆에 무릎을 꿇었다. 그의 입이 움직이는 게 보였다. 이번에는 목소리가 물속에서 들리는 것처럼 멀었다. 반대로 내 귀 바로 안쪽에서 난 낮은 소리는 너무 가까워서, 누군가 머리를 숙여 귓가에 말하는 줄 알았다."
      },
      {
        "node": "ISK_L03_AA2_106",
        "profile": null,
        "speaker": "귓속의 소리",
        "text": "이번에는 잘 멈췄네. 움직이지 마. 아직 네가 나갈 차례는 아니야."
      },
      {
        "node": "ISK_L03_AA2_107",
        "profile": null,
        "speaker": null,
        "text": "비명을 지르려 했지만 입은 열리지 않았다. 알베도는 누가 뒤에 나타난 것처럼 고개를 돌리지 않았다. 그 소리를 들었다는 반응도 없었다. 눈을 세게 감았다 떴다. 자신에게만 들린 것인지 설명할 수 없어서, 남아 있는 동작을 다급하게 반복했다."
      },
      {
        "node": "ISK_L03_AA2_108",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "들리는 게 달라졌어? 대답할 수 없으면 눈으로만 해도 돼. 지금 네 표정이 바뀌었어. 내가 여기 있다는 건 계속 기억해. 네 손을 놓지 않을게."
      },
      {
        "node": "ISK_L03_AA2_109",
        "profile": null,
        "speaker": null,
        "text": "알베도의 손이 내 손등을 덮었다. 피부에 닿는 압력은 느껴졌다. 가방 쪽에서 천이 바스락거렸고, 그곳의 그림자 끝이 다시 나를 향해 길어졌다. 알베도는 그것을 보고 몸을 돌렸지만 나와의 접촉은 끊지 않았다. 바람은 여전히 골짜기 밖으로 불고 있었다."
      }
    ],
    "ISK_L03_AA2_110": [
      {
        "node": "ISK_L03_AA2_110",
        "profile": null,
        "speaker": "귓속의 소리",
        "text": "그 사람은 네가 어디에 서 있는지 몰라. 너도 아직 모르지. 그러니까 조용히 있어."
      },
      {
        "node": "ISK_L03_AA2_111",
        "profile": null,
        "speaker": null,
        "text": "눈을 감지 않았다. 알베도가 볼 수 있는 마지막 반응까지 그 말에 내주고 싶지 않았다. 소리는 그 짧은 저항을 기다렸다는 듯 가까워졌다. 한편 바깥에서는 알베도가 가방과 나 사이의 바닥에 도구를 박아 넣었다. 그가 무엇을 막으려는지 묻고 싶었지만, 나에게는 아직 목소리가 없었다."
      }
    ],
    "ISK_L03_AB1_004": [
      {
        "node": "ISK_L03_AB1_004",
        "profile": null,
        "speaker": "교대 병사",
        "text": "이 사람을 직접 데리고 오셨습니다. 저는 초소에서 소개받았고요. 저희에게 기억을 억지로 채워 말하지 않아도 된다고 했습니다. 그 일까지 제가 잘못 기억한다고 하시면……."
      },
      {
        "node": "ISK_L03_AB1_005",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그렇게 말하지 않았어. 네가 아는 일을 지워서 내 기억에 맞출 생각도 없고. 부관을 불러 와. 조금 전 구조 요청을 받은 사람을 데리고 오라고 해."
      },
      {
        "node": "ISK_L03_AB1_006",
        "profile": null,
        "speaker": null,
        "text": "교대 병사는 몇 걸음 가다가 다시 돌아왔다. 내가 혼자 남는 것이 마음에 걸린 눈치였다. 각청은 그 시선을 알아보고 자리를 옮기지 않겠다고 말했다. 병사가 달려간 뒤 나는 내밀어진 물통을 받아 들었다. 함께 밥 먹던 때와 같은 손이었지만, 그 손의 주인은 오늘 처음 나에게 물을 건네고 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB1_007",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이상한 말을 하는 건 아는데, 네가 지금 나한테 친절하면 좀 억울해. 내가 알던 너도 이랬거든. 사람을 일단 앉혀 놓고, 쉬라고 했다가, 자기는 다시 뛰어나가고. 처음 보는 사람이 나한테 그 버릇까지 보여 주는 건 반칙이야."
      }
    ],
    "ISK_L03_AB1_008": [
      {
        "node": "ISK_L03_AB1_008",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "내가 어떤 사람인지 알고 있다는 말로 들을게. 그렇다고 네 말을 전부 믿었다는 뜻은 아니야. 네가 제대로 말할 수 있을 때까지 기다릴 이유는 충분하다는 뜻이지."
      },
      {
        "node": "ISK_L03_AB1_009",
        "profile": null,
        "speaker": null,
        "text": "그녀는 내 옆에 앉지 않고 맞은편에 쪼그려 앉았다. 눈높이가 내려오자 목에 걸린 말이 조금 풀렸다. 구슬을 대고 기다렸던 자신의 손을 바라보았다. 아무 일도 일어나지 않았던 그때와 지금 살아 있는 각청 사이를 이어 줄 설명은 없었다."
      }
    ],
    "ISK_L03_AB1_016": [
      {
        "node": "ISK_L03_AB1_016",
        "profile": null,
        "speaker": null,
        "text": "부관이 데리고 온 수색 인원은 사람들이 말한 만큼 현장에 쓰러져 있지 않았다고 보고했다. 일부는 자신이 왜 그곳에 서 있었는지 몰라 떠나려 했고, 시신을 봤다는 내 설명은 아무도 확인해 주지 못했다. 보고하는 병사는 거짓말쟁이를 찾듯 나를 보다가 각청의 시선을 받고 입을 다물었다."
      },
      {
        "node": "ISK_L03_AB1_017",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "없었다는 말과 죽지 않았다는 말은 같지 않아. 현장에 누가 먼저 들어갔는지부터 알아봐. 사람을 찾았으면 어디로 보냈는지도. 지금 그 둘을 섞으면 살아 있는 사람까지 놓치게 돼."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB1_018",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "의자에 앉던 병사도 찾아 줘. 전에 나랑 그늘로 옮겼던 사람. 그 사람은 내가 돌아올 때 자리 하나 남겨 두기로 했어. 이제 와서 이름보다 의자 얘기부터 하는 것도 웃긴데, 내가 마지막으로 약속한 게 그거야."
      }
    ],
    "ISK_L03_AB1_019": [
      {
        "node": "ISK_L03_AB1_019",
        "profile": null,
        "speaker": null,
        "text": "각청은 교대 병사에게 동료를 찾을 수 있는 곳을 물었다. 잠시 뒤 외곽의 임시 휴식소라는 답이 돌아왔다. 이름을 확인한 부관이 방금 그곳에서 같은 이름의 병사를 봤다는 것이다. 내가 자리에서 벌떡 일어나자 각청도 일어났다. 그녀는 통제선 너머를 가리키며 먼저 걷기 시작했다."
      },
      {
        "node": "ISK_L03_AB1_020",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "가서 만나자. 여기서 그 사람이 살아 있다는 말을 백 번 들어도 네가 믿지는 못하겠지. 이번에는 나도 같이 보겠어."
      }
    ],
    "ISK_L03_AB1_022": [
      {
        "node": "ISK_L03_AB1_022",
        "profile": null,
        "speaker": null,
        "text": "휴식소는 봉쇄가 길어지면서 길가의 빈 공터와 창고 마당을 이어 만든 곳이었다. 뜨거운 물을 나누는 솥 옆에 긴 의자가 놓여 있었고, 그 한쪽에 내가 찾던 병사가 앉아 있었다. 갑옷의 같은 자리에 흠집이 있었다. 병사는 나를 보고 손을 들었다. 얼굴이 아니라 그 자연스러운 손짓 때문에 내 걸음이 멎었다."
      },
      {
        "node": "ISK_L03_AB1_023",
        "profile": null,
        "speaker": "면담 병사",
        "text": "늦으셨네요. 자리를 비워 두긴 했는데, 아까 아주머니가 잠깐 앉았다 가셨어요. 그것까지 제가 막을 수는 없잖습니까. 무슨 일 있으셨습니까? 얼굴이 안 좋아 보입니다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB1_024",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "너도 그런 소리를 하네. 나는 네가…… 됐다. 잠깐 손 좀 내밀어 봐. 맥을 볼 줄 안다는 소리는 아니고, 일단 잡고 있어야 네가 어디 안 갈 것 같아서 그래."
      }
    ],
    "ISK_L03_AB1_025": [
      {
        "node": "ISK_L03_AB1_025",
        "profile": null,
        "speaker": null,
        "text": "병사는 어색하게 손을 내밀었다. 체온이 있었고 손가락이 움직였다. 내가 힘을 주자 상대도 영문을 모르는 채 악수처럼 마주 쥐었다. 각청은 두 사람의 손을 한 번 보고 병사의 눈높이에 몸을 낮췄다. 의례에서 마지막으로 기억나는 일을 묻는 목소리는 아까보다 느렸다."
      },
      {
        "node": "ISK_L03_AB1_026",
        "profile": null,
        "speaker": "면담 병사",
        "text": "사람들이 웅성거렸던 것까지는 압니다. 그다음에는 여기서 물을 마셨고요. 자리를 비워 둬야 한다는 생각이 나서 의자 끝으로 옮겼습니다. 이상하게 그건 기억났습니다. 다른 건 도무지……."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB1_027",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그거면 됐어. 아니, 된 건 아닌데 지금은 그걸로 하자. 너한테 빈칸 채워 오라고 안 한다고 해 놓고 내가 제일 먼저 들이밀 뻔했네. 손은 조금만 더 잡고 있을게. 실례지만 나도 지금 상태가 썩 좋지는 않거든."
      }
    ],
    "ISK_L03_AB1_028": [
      {
        "node": "ISK_L03_AB1_028",
        "profile": null,
        "speaker": null,
        "text": "교대 병사가 웃어 주려다 눈가를 훔쳤다. 그는 동료의 팔을 두드린 뒤 의자 끝에 걸터앉았다. 방금 전까지 살아 있던 사람, 죽음을 직접 본 사람, 그 죽음을 보지 못한 사람이 같은 그늘에 모였다. 각청은 동료 병사에게 억지로 생각하지 말라며 물그릇을 밀어 주었다."
      },
      {
        "node": "ISK_L03_AB1_029",
        "profile": null,
        "speaker": "면담 병사",
        "text": "그런데 아까 들은 노래는 기억납니다. 문 앞에서 돌아오는 사람을 기다린다고 했는데, 그 뒤는 바꿔 불렀죠. 돌아오지 않는 사람 말고 기다리다 밥이 다 식어 버린 사람 이야기로. 저는 그쪽이 더 좋았습니다."
      },
      {
        "node": "ISK_L03_AB1_030",
        "profile": null,
        "speaker": "교대 병사",
        "text": "무슨 노래 말이야? 여기서 아직 공연은 안 했는데. 무대 만드는 중인 건 봤어도 노래를 부른 사람은 없었어."
      },
      {
        "node": "ISK_L03_AB1_031",
        "profile": null,
        "speaker": null,
        "text": "마당 안쪽에서 천을 접던 여자가 손을 멈췄다. 작업하기 편하게 정리한 차림이었지만 걸어오는 자세가 단정했다. 그녀는 병사의 말을 다시 묻기 전에 각청에게 인사를 건넸고, 병사를 겁주지 않으려는 듯 의자에서 조금 떨어져 섰다."
      },
      {
        "node": "ISK_L03_AB1_032",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "실례하겠습니다. 방금 말씀하신 뒤 구절은 어디서 들으셨나요? 제가 조금 전에 대본의 여백에 고친 부분과 닮아서요. 아직 소리 내어 맞춰 보지도 않았습니다."
      }
    ],
    "ISK_L03_AB1_035": [
      {
        "node": "ISK_L03_AB1_035",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "운근 씨, 그 대본은 잠깐 다른 사람에게 보여 주지 말아 주세요. 방금 이 사람에게 들은 말부터 확인하고 싶어요. 이쪽은 몬드에서 온 협력자예요. 본인은 나와 이미 아는 사이라고 하는데, 내가 그 기억을 잃은 것 같고요."
      },
      {
        "node": "ISK_L03_AB1_036",
        "profile": null,
        "speaker": null,
        "text": "운근은 어설픈 위로 대신 먼저 자신의 이름과 이곳에 온 이유를 밝혔다. 오랫동안 발이 묶인 사람들에게 잠깐이라도 다른 이야기를 들려주려고 극단 사람들과 자리를 빌렸다고 했다. 좁은 무대에 쓸 바닥판이 부족해 낮은 평상을 붙이는 중이었다. 그녀의 손끝에 묻은 분필과 먼지를 보았다."
      }
    ],
    "ISK_L03_AB1_038": [
      {
        "node": "ISK_L03_AB1_038",
        "profile": null,
        "speaker": null,
        "text": "각청은 휴식소를 맡은 병사에게 무대 뒤와 두 출구를 비워 두라고 했다. 공연을 당장 취소하겠다는 말에 운근은 대본을 내밀었다. 문제가 된 구절은 자신이 부르지 않겠으며, 여기 모인 사람을 다시 긴 대기 줄로 돌려보내기 전에 무엇이 위험한지 한 번만 더 생각해 달라는 부탁이었다."
      },
      {
        "node": "ISK_L03_AB1_039",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "옥형성, 저도 아무 일 없었다고 노래하고 싶지는 않아요. 하지만 여기 있는 분들은 벌써 며칠째 자기 이름을 확인받고 짐을 옮기며 기다리고 계시잖아요. 이야기를 듣는 동안만큼은 의심받는 사람이 아니어도 되게 하고 싶습니다."
      },
      {
        "node": "ISK_L03_AB1_040",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "마당에 들어올 인원은 줄일 거예요. 출구는 막지 않고, 무대 위에 무거운 장식도 올리지 마세요. 이상한 일이 한 번이라도 더 생기면 중단하겠어요. 공연을 지키려고 그걸 미루지는 마세요."
      },
      {
        "node": "ISK_L03_AB1_041",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "제가 먼저 멈추겠습니다. 그 대신 아무것도 보지 않은 분들까지 병을 옮기는 사람처럼 세우지는 말아 주세요. 서로 눈을 피하면서 같은 노래를 듣기는 어렵답니다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB1_042",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내가 가운데 앉아서 무서운 표정을 짓고 있으면 분위기는 이미 망한 거 아닐까. 뒤에서 판자나 나르는 쪽이 더 도움이 될 것 같은데. 힘이 대단한 건 아니고, 뭘 들고 있으면 손 떠는 게 덜 티 나거든."
      }
    ],
    "ISK_L03_AB1_043": [
      {
        "node": "ISK_L03_AB1_043",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "그럼 저쪽에서 작은 발판을 부탁드릴게요. 무겁지 않은 것으로요. 도움을 청한 사람을 공연 전에 쓰러뜨리면, 제가 끝까지 나쁜 사람으로 남을 테니까요."
      },
      {
        "node": "ISK_L03_AB1_044",
        "profile": null,
        "speaker": null,
        "text": "운근은 말끝에 작게 웃었다가 내가 제대로 받치고 있는지 확인했다. 각청은 그 옆에서 발판을 시험하고 금이 간 곳에 표시했다. 서로를 기억하느냐는 문제는 잠시 남겨 둔 채 세 사람이 같은 바닥을 만들었다. 나사를 조이는 무대 관리인에게 손을 빌렸고, 관리인은 망치를 주는 대신 손가락을 빼라고 잔소리했다."
      },
      {
        "node": "ISK_L03_AB1_045",
        "profile": null,
        "speaker": "무대 관리인",
        "text": "못은 겁먹고 살살 치면 더 위험해요. 그 대신 손을 멀리 두라고요. 내가 치고 나면 당신이 잡아 봐요. 이 조각은 받침으로 쓰는 거지 허리에 차고 다니는 칼이 아닙니다."
      }
    ],
    "ISK_L03_AB1_055": [
      {
        "node": "ISK_L03_AB1_055",
        "profile": null,
        "speaker": null,
        "text": "면담 병사는 무대 옆에 놓인 의자를 손으로 만지다가 자신도 할 일을 달라고 했다. 운근은 관객이 앉을 자리를 고르게 해 달라고 부탁했다. 병사는 병이 있다는 말을 먼저 하려다 멈췄다. 자리를 권하는 데 기억을 전부 되찾을 필요는 없었다. 각청이 그 광경을 보는 동안 나는 봉투 속 구슬을 확인했다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB1_056",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "공연 전에 말할 게 있어. 이 물건이 몬드에서 큰일을 해결한 적은 있는데, 오늘 사람을 살려 달라고 했을 때는 아무 반응도 없었어. 나도 뭘 하는 건지 잘 몰라. 혹시 이게 문제라면 멀리 가 있는 게 나을까?"
      }
    ],
    "ISK_L03_AB1_057": [
      {
        "node": "ISK_L03_AB1_057",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "네가 지나온 곳에서 전부 같은 일이 난 것도 아니잖아. 지금 혼자 내보내면 문제가 생겨도 볼 사람이 없어. 마당 끝에서 나와 함께 있어. 이상한 반응이 생기면 감추지 말고 즉시 알려 줘."
      },
      {
        "node": "ISK_L03_AB1_058",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "그 물건 때문에 이분을 숨겨 두어야 한다는 말은 아니지요? 저도 가까이서 보지는 않을게요. 대신 제가 잘 보이는 자리에 계세요. 무대 위에서도 객석 표정은 생각보다 잘 보인답니다."
      },
      {
        "node": "ISK_L03_AB1_059",
        "profile": null,
        "speaker": null,
        "text": "구슬을 도로 감쌌다. 무대 관리인은 기둥에 기대 둔 긴 나무 지렛대를 치우려다가 출구 아래 바닥을 한 번 더 살피고 그대로 두었다. 바퀴가 끼면 들어 올릴 때 쓸 물건이라고 했다. 손으로 다룰 수 있는 물건의 용도가 분명하다는 사실이 이상하게 반가웠다."
      }
    ],
    "ISK_L03_AB1_061": [
      {
        "node": "ISK_L03_AB1_061",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "오늘은 큰 무대에서 하던 인사를 조금 줄이겠습니다. 오래 서 계신 분이 많아 앉을 자리부터 마련한 탓에, 이야기도 여러분 가까이 오게 되었네요. 잠시만 그릇과 짐을 내려놓으시고, 길 위의 한 사람을 만나 주세요."
      },
      {
        "node": "ISK_L03_AB1_062",
        "profile": null,
        "speaker": null,
        "text": "처음에는 아이를 달래는 소리와 수저 부딪치는 소리가 섞였다. 운근은 그 소리를 밀어내려 하지 않았다. 길을 떠난 사람이 신발을 고쳐 신고 다시 걷는 장면에서 천천히 박자를 잡았고, 앞줄의 시선이 모이자 발끝 하나로 무대의 넓이를 바꾸었다. 낮에 판자를 맞추던 바로 그 사람이 맞는지 잠시 잊었다."
      },
      {
        "node": "ISK_L03_AB1_063",
        "profile": null,
        "speaker": "면담 병사",
        "text": "여기 다음에는 문 앞에 도착합니다. 저 사람은 자기가 먼저 돌아왔다고 생각하는데, 안에는 이미 다른 사람이……."
      },
      {
        "node": "ISK_L03_AB1_064",
        "profile": null,
        "speaker": null,
        "text": "병사는 말을 끝내기 전에 입을 막았다. 옆자리 사람이 조용히 하라고 한 탓이 아니었다. 무대 위의 운근이 병사 쪽으로 시선을 돌렸다. 아직 그 장면까지 가지 않았다. 원래 대본에도 집 안에 다른 사람이 있다는 이야기는 없었다. 교대 병사에게 팔을 뻗었다가 멈췄다. 품 안에서 구슬이 몸의 박자와 다르게 떨렸다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB1_065",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "구슬이 움직여. 내 손이 떨리는 게 아니라 안에서…… 공연을 멈춰 줘. 사람이 쓰러질 때까지 기다리면 안 돼. 운근 씨, 잠깐 멈춰요!"
      }
    ],
    "ISK_L03_AB1_066": [
      {
        "node": "ISK_L03_AB1_066",
        "profile": null,
        "speaker": null,
        "text": "운근은 다음 소리를 내지 않았다. 징을 치려던 단원이 손을 멈췄는데도 낮고 긴 울림이 마당을 통과했다. 내 눈앞에서 판자 사이로 검은 물이 솟는 것처럼 보였다. 바로 옆 교대 병사는 불이 붙었다며 관객을 밀어냈다. 두 사람이 가리킨 곳은 같은 무대였다."
      },
      {
        "node": "ISK_L03_AB1_067",
        "profile": null,
        "speaker": "교대 병사",
        "text": "뒤로 빠지세요! 장막 쪽에 불이…… 왜 안 보입니까? 저 위 사람이 그대로 서 있잖습니까!"
      },
      {
        "node": "ISK_L03_AB1_068",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "불을 피해 뛰지 마세요. 앞줄부터 오른쪽 출구로 나가세요! 제가 내려가겠습니다. 서로 밀면 아이들이 넘어져요!"
      },
      {
        "node": "ISK_L03_AB1_069",
        "profile": null,
        "speaker": null,
        "text": "각청이 출구를 넓히려고 짐을 걷어냈다. 나에게는 그녀의 발목까지 물이 차는 것처럼 보였지만 젖은 자국은 없었다. 무대 관리인이 접이식 계단을 내려오다 관객과 부딪혔고, 낮에 표시했던 금이 벌어졌다. 누군가 장막을 잡아당기면서 위쪽 가로대가 기울었다. 이번에는 눈으로 보는 것뿐인 이상 현상이 아니었다. 목재가 실제로 부러지는 소리가 났다."
      },
      {
        "node": "ISK_L03_AB1_070",
        "profile": null,
        "speaker": null,
        "text": "내가 품을 누르자 구슬의 떨림이 더 거칠어졌다. 귀 바로 옆에서 익숙하지 않은 숨소리가 지나갔다. 늦었네. 짧은 말이 물속에서 들리는 것처럼 뭉개졌다. 고개를 돌려도 아무도 없었다. 그 사이 관리인의 다리가 무너진 계단 밑으로 끼었고, 관객 쪽으로 넘어진 가로대가 출구의 일부를 막았다."
      }
    ],
    "ISK_L03_AB1_079": [
      {
        "node": "ISK_L03_AB1_079",
        "profile": null,
        "speaker": null,
        "text": "계단 틀 밑에 받침이 들어갔다. 지렛대를 놓고 관리인의 허리띠를 잡았다. 관리인은 발이 아프다며 욕을 했고, 그 소리가 나에게는 지금까지 들은 어떤 위로보다 믿음직했다. 세 사람이 무대 뒤 좁은 통로로 나오는 동안 면담 병사는 반대편에서 쓰러진 의자를 치웠다. 각청은 마당 바깥에서 사람을 받아 내고 있었다."
      },
      {
        "node": "ISK_L03_AB1_080",
        "profile": null,
        "speaker": "무대 관리인",
        "text": "왼쪽 발은 괜찮습니다. 오른쪽을 끌지 마세요. 아니, 거기 말고…… 됐어요. 이제 혼자 서 볼 수 있겠습니다. 당신 팔부터 떼도 됩니다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB1_081",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "혼자 서는 건 저쪽 벽에 가서 해요. 여기서 다시 주저앉으면 나도 같이 주저앉을 것 같거든. 아까 망치질 잘못한다고 혼낸 사람은 끝까지 책임져야 하는 거 아닌가요."
      }
    ],
    "ISK_L03_AB1_082": [
      {
        "node": "ISK_L03_AB1_082",
        "profile": null,
        "speaker": null,
        "text": "관리인은 숨을 몰아쉬면서도 헛웃음을 지었다. 운근은 장막을 걷어 벽 쪽 길을 열었다. 그 틈으로 나는 희고 낮은 건물의 복도를 보았다. 실제로 있어야 할 것은 창고의 흙벽이었다. 구슬이 한 차례 크게 흔들렸고, 막 건넜던 통로가 눈앞에서 멀어졌다가 돌아왔다. 내가 관리인의 팔을 놓친 것은 발밑의 돌을 밟으려 손을 바꾼 순간이었다."
      },
      {
        "node": "ISK_L03_AB1_083",
        "profile": null,
        "speaker": null,
        "text": "눈에 들어왔던 물빛이 꺼졌다. 마당에는 부러진 가로대와 의자, 짐이 뒤섞여 있었다. 장막에는 불이 붙지 않았고 바닥도 젖어 있지 않았다. 하지만 무너진 계단과 거기에 다친 사람은 남았다. 반대 손을 뻗어 관리인을 다시 찾았다. 손끝에 잡힌 것은 찢어진 천 한 장뿐이었다."
      }
    ],
    "ISK_L03_AB1_085": [
      {
        "node": "ISK_L03_AB1_085",
        "profile": null,
        "speaker": null,
        "text": "무대 앞에서 비명이 터졌다. 관리인은 무너진 계단의 다른 쪽에 쓰러져 있었다. 방금 붙잡았던 허리띠 아래로 옷이 어둡게 젖어 갔다. 내가 달려가려 하자 관객 하나가 길을 막았다. 저 사람을 잡으라는 외침이 이어졌고, 누군가는 내 손에 아무것도 없다는 사실을 보고도 창을 버렸다고 말했다."
      },
      {
        "node": "ISK_L03_AB1_086",
        "profile": null,
        "speaker": "관객",
        "text": "봤어요. 그 사람이 찔렀습니다. 무대 위로 올라가서, 도망가는 사람을 붙잡고…… 저기 있었어요. 바로 저 사람이에요!"
      },
      {
        "node": "R39_PROSE_ISK_L03_AB1_087",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "무슨 소리야. 나는 저 사람을 끌어냈어. 여기서 옷을 잡고, 운근 씨랑 같이…… 길 좀 비켜! 지금 피가 나잖아. 나를 붙잡고 싶으면 붙잡고 같이 가든가!"
      }
    ],
    "ISK_L03_AB1_088": [
      {
        "node": "ISK_L03_AB1_088",
        "profile": null,
        "speaker": null,
        "text": "밀치고 나아가려다 뒤에서 팔이 꺾였다. 교대 병사였다. 며칠 전 자신의 기억을 끝까지 들어 주었던 사람을 잡고 있다는 사실 때문에 병사의 얼굴이 일그러졌다. 그는 손을 풀지 못했고, 나도 그 표정을 보고 더 움직이지 못했다."
      },
      {
        "node": "ISK_L03_AB1_089",
        "profile": null,
        "speaker": "교대 병사",
        "text": "왜 그러셨습니까. 저는 당신을 알고 있었는데, 옥형 님이 몰라도 제가 설명하려고…… 제가 본 걸 아니라고 할 수는 없잖습니까."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB1_090",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 네가 본 내가 어디에 있었는지 말해. 난 무대 아래에서 저 사람 발을 빼고 있었어. 네가 불이 난다고 했을 때도 거기 있었다고. 지금 내 팔을 잡고 있는 건 괜찮으니까, 적어도 내가 무슨 말을 하는지는 들어 줘."
      }
    ],
    "ISK_L03_AB1_091": [
      {
        "node": "ISK_L03_AB1_091",
        "profile": null,
        "speaker": null,
        "text": "각청이 사람 사이를 뚫고 들어왔다. 그녀는 먼저 관리인의 상태를 살피고 의료 인력을 불렀다. 압박하던 손을 바꾸는 순간 천암군 병사가 고개를 저었다. 각청의 눈매가 굳었다. 관리인은 살아 있던 목소리를 되찾지 못했다. 그는 계단에 다쳐 실려 나온 뒤, 다른 상처를 입은 채 죽어 있었다."
      },
      {
        "node": "ISK_L03_AB1_092",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "그분은 조금 전까지 저와 이야기했어요. 발이 아프다고 했고, 혼자 서 보겠다고도 했습니다. 이 사람은 그때 허리를 받치고 있었어요. 무대 위로 올라가 창을 휘두른 사람은 제가 보지 못했어요."
      },
      {
        "node": "ISK_L03_AB1_093",
        "profile": null,
        "speaker": "관객",
        "text": "노래하는 분은 등을 돌리고 계셨잖아요! 저는 앞에서 봤어요. 모두가 보는데 그걸 왜 감싸 줍니까? 당신이 유명하다고 우리 눈이 없었던 일이 됩니까?"
      },
      {
        "node": "ISK_L03_AB1_094",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "제 이름으로 여러분 말을 누르려는 게 아니에요. 제가 본 일을 이야기하고 있는 겁니다. 같은 순간을 다르게 기억한다고 해서, 제 기억을 여러분 쪽에 맞출 수는 없어요."
      },
      {
        "node": "ISK_L03_AB1_095",
        "profile": null,
        "speaker": null,
        "text": "면담 병사가 한 발 앞으로 나왔다. 그는 나와 함께 계단을 들었던 손을 내밀었다가 말문이 막혔다. 손바닥에는 같은 자리에 생긴 가시 자국이 있었지만, 그의 눈은 내가 무대 위에 있었다고 말하는 관객 쪽으로 자꾸 돌아갔다. 서로 맞지 않는 두 장면을 입 밖에 내면 어느 쪽도 자기 말이 아니게 될까 두려워하는 얼굴이었다."
      }
    ],
    "ISK_L03_AB1_096": [
      {
        "node": "ISK_L03_AB1_096",
        "profile": null,
        "speaker": "면담 병사",
        "text": "저는 계단을 들었습니다. 이 사람 옆에서요. 그런데 얼굴을 올려다봤던 것 같기도 합니다. 위에 서서…… 저는 제가 한 일은 아는데 왜 본 일이 다릅니까?"
      },
      {
        "node": "ISK_L03_AB1_097",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그만 몰아붙여. 이 병사에게 지금 대답을 완성하라고 시키지 마. 다친 사람부터 밖으로 옮기고, 서로 본 일을 맞춰 이야기하지 않게 자리를 나눠. 네가 들고 있었다는 창을 본 사람은 그 위치를 가리켜."
      },
      {
        "node": "ISK_L03_AB1_098",
        "profile": null,
        "speaker": null,
        "text": "서로 다른 손들이 서로 다른 방향을 가리켰다. 무대 끝, 출구 옆, 장막 뒤였다. 천암군이 찾은 긴 물건은 구조에 사용한 나무 지렛대와 경비가 놓쳤던 창 한 자루였다. 창에는 피가 보이지 않았고, 그것만으로 다른 무기가 없었다고 할 수는 없었다. 각청은 어느 쪽도 관객에게 들어 보이며 정답이라고 선언하지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB1_099",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내가 잡고 있던 사람은 살아 있었어. 욕도 했어. 나한테 발 끌지 말라고, 손을 떼도 된다고 했어. 그런데 손을 한 번 바꿨더니 저기서 죽어 있잖아. 내가 그걸 어떻게 설명해? 나도 설명할 수 있으면 여기서 이러고 있겠어?"
      }
    ],
    "ISK_L03_AB1_100": [
      {
        "node": "ISK_L03_AB1_100",
        "profile": null,
        "speaker": null,
        "text": "마지막 말은 각청보다 자신의 빈손에 가까웠다. 사람을 두고 도망친 뒤에는 죽은 사람을 알아보았고, 이번에는 사람을 끌어낸 뒤 살인한 사람으로 불렸다. 구슬을 감싼 천은 찢어지지 않은 채 품 안에 있었다. 그것을 뜯어 바닥에 던지고 싶었지만, 손을 올리는 순간 병사들의 창끝이 다시 따라왔다."
      },
      {
        "node": "ISK_L03_AB1_101",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "지금은 손을 내려. 무엇을 꺼내려는지 내가 알아도 다른 사람은 몰라. 여기서 네가 뛰면 쫓는 사람이 나오고, 누가 창을 들면 또 다치는 사람이 생겨. 나와 함께 나가자."
      }
    ],
    "ISK_L03_AB1_104": [
      {
        "node": "ISK_L03_AB1_104",
        "profile": null,
        "speaker": null,
        "text": "각청은 관객을 향해 몸을 돌렸다. 나와 자신 사이에 거리를 두지 않은 채, 누가 먼저 손을 댄다면 그 사람부터 막겠다고 했다. 한 상인이 억울한 사람의 말을 막는다고 항의하자 그녀는 죽은 사람의 이름과 그에게 무엇이 일어났는지 밝히는 일을 사람을 둘러싸고 몰아붙이는 것으로 대신하지 않겠다고 답했다."
      },
      {
        "node": "ISK_L03_AB1_105",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "저도 함께 가겠습니다. 제가 데리고 나온 분이 죽었어요. 이 사람과 같이 움직인 건 저니까, 제 이야기를 나중으로 미룰 수는 없습니다."
      },
      {
        "node": "ISK_L03_AB1_106",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "운근 씨는 잠깐 여기 남아 주세요. 단원 중에 뒤쪽을 보고 있던 사람이 있는지, 장막을 누가 잡아당겼는지 찾아 주셨으면 해요. 여기서 말을 맞춰 달라는 뜻은 아니에요. 자기 일을 아는 사람을 잃기 전에 따로 만나 달라는 부탁이에요."
      },
      {
        "node": "ISK_L03_AB1_107",
        "profile": null,
        "speaker": null,
        "text": "운근은 나를 보았다. 한쪽 뺨에 묻은 먼지를 닦다가 손을 내렸다. 누구 편에 서겠다는 말을 먼저 하면 그것 때문에 자신의 눈이 바뀐 것처럼 들릴 수 있었다. 그녀는 대신 무대에서 내려왔던 길을 손가락으로 짚었다. 같이 걸었던 몇 걸음이 지금 가장 정확하게 건넬 수 있는 말이었다."
      },
      {
        "node": "ISK_L03_AB1_108",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "제가 저분을 받친 손과 당신이 잡았던 허리띠를 기억해요. 그다음에는 장막을 걷었고요. 제가 등을 돌린 짧은 순간까지 봤다고 말하지는 않을게요. 하지만 그전에 당신이 한 일도 다른 이야기로 바꾸지 않겠어요."
      }
    ],
    "ISK_L03_AB1_115": [
      {
        "node": "ISK_L03_AB1_115",
        "profile": null,
        "speaker": null,
        "text": "각청이 호송을 맡을 병사를 불렀다. 교대 병사는 자신이 가겠다고 했다가 말끝을 삼켰다. 그는 내 팔을 잡고 있었던 자기 손을 내려다보았다. 그를 원망하고 싶었지만, 불이 보였다며 사람을 내보내던 목소리와 지금 거짓말을 하고 있는 사람의 목소리를 구별할 근거가 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB1_116",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "네가 본 걸 나 때문에 바꾸지는 마. 대신 나한테 한 번은 다시 말해 줘. 내가 어디에 서 있었고 어느 손을 썼는지. 네 기억이랑 싸우는 건 나중에 해도 되니까, 네가 날 알았던 사실까지 버리지는 마."
      }
    ],
    "ISK_L03_AB1_117": [
      {
        "node": "ISK_L03_AB1_117",
        "profile": null,
        "speaker": "교대 병사",
        "text": "그건 버리지 않았습니다. 그래서 더 모르겠습니다. 당신이 아니라면…… 제가 붙잡은 건 누구였던 겁니까. 지금도 얼굴은 같은데."
      },
      {
        "node": "ISK_L03_AB1_118",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 질문을 사람들 앞에서 계속 되풀이하면 답보다 소문이 먼저 커져. 네 진술도 따로 받을 거야. 오늘은 다른 인원이 호송한다. 너는 이곳에서 다친 동료를 도와."
      },
      {
        "node": "ISK_L03_AB1_119",
        "profile": null,
        "speaker": null,
        "text": "각청은 내 양손을 앞으로 모으게 했다. 달아나지 않겠다는 말을 믿는 것과 사람들이 보는 앞에서 나를 풀어 두는 것은 다른 결정이었다. 천이 쓸린 손목 위로 들어오는 가는 끈을 보았다. 매듭을 죄던 병사가 멈칫하자 각청이 직접 여유를 확인했다. 그녀가 붙잡은 자리는 의례 뒤 내가 맥을 찾던 바로 그곳이었다."
      }
    ],
    "ISK_L03_AB1_122": [
      {
        "node": "ISK_L03_AB1_122",
        "profile": null,
        "speaker": null,
        "text": "조사실은 창살 있는 감방보다 작은 창고에 가까웠다. 낮은 창으로 마당을 볼 수 있었지만 문 밖에는 경비가 섰다. 각청은 의자를 벽에 붙이지 말라고 시킨 뒤, 내가 앉은 것을 확인하고 끈을 풀었다. 구슬은 감싼 상태로 내 허리 주머니에 남았다. 물건을 강제로 옮기려다가 무슨 일이 생길지 모르는 상황에서, 방 안의 움직임을 지켜보는 쪽을 택한 것이다."
      },
      {
        "node": "ISK_L03_AB1_123",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "여기서는 혼자 나갈 수 없어. 네가 범인이라고 결론 내린 건 아니야. 밖에서 사람들이 널 찾고 있고, 조사할 것도 남았어. 나도 그들이 봤다는 장면을 직접 보지는 못했어. 그 사실은 분명히 해 둘게."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB1_124",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 말은 조금 낫네. 아까부터 다들 나보다 나를 더 잘 본 것처럼 말해서 숨이 막혔거든. 나 혼자만 내 얼굴을 못 보니까 반박할 데가 없는 기분이었어. 물은 또 빌려도 돼? 기억이 없어져도 두 번째 물통까지는 계산해 줘."
      }
    ],
    "ISK_L03_AB1_125": [
      {
        "node": "ISK_L03_AB1_125",
        "profile": null,
        "speaker": null,
        "text": "각청은 물통을 내려놓았다. 이번에는 마개도 풀어 놓았다. 웃으려다 그만두었다. 자신이 데리고 나온 사람이 실제로 죽었다. 각청이 문을 닫는다고 그 무게가 밖에 남는 것은 아니었다. 멀어진 발소리 사이로, 의자에서 돌아오길 기다렸던 병사가 자기 이름을 반복하는 소리가 희미하게 들렸다."
      },
      {
        "node": "ISK_L03_AB1_126",
        "profile": null,
        "speaker": null,
        "text": "운근은 공연장을 떠나지 않았다. 그녀는 단원들을 한자리에 모으는 대신 장막 뒤를 정리하던 아이와 무대 뒤편 배달을 마친 노인을 각각 찾아갔다. 둘에게 자신이 본 장면을 먼저 이야기하지 않았다. 노인은 무대가 흔들릴 때 뒷문으로 누군가 지나갔다고 했고, 아이는 그 문이 안에서 잠겨 있었다고 했다. 운근은 찢어진 장막을 걷었다. 문에는 안쪽 빗장이 걸려 있었지만, 아래쪽 흙에는 막 밟힌 발자국이 남아 있었다."
      },
      {
        "node": "ISK_L03_AB1_127",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "오늘 들은 이야기를 그대로 노래로 만들지는 않을 거예요. 먼저 그 문을 누가 지나갔는지 알아야겠네요. 저를 기다리는 사람이 있으니까요."
      }
    ],
    "ISK_L03_AB2_003": [
      {
        "node": "ISK_L03_AB2_003",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "어디로 가자는 거야? 네가 말한 의례 현장? 네 손에 난 상처도 거기서 생겼어?"
      },
      {
        "node": "ISK_L03_AB2_004",
        "profile": null,
        "speaker": "운송인",
        "text": "제가 아는 것은 함께 오셨다는 것과 닷새를 같은 물자 구역에서 지냈다는 겁니다. 저 사람 혼자 지어낸 관계는 아니에요. 오늘 저를 부르러 왔을 때는 제대로 서 있지도 못했고요."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_005",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "난간 아래 끈을 두 번 감아 뒀어. 네 몸이 있던 자리를 찾으려고. 끌어안고 옮기려다가 못해서, 끈을 잡아당기다가 덧판도 갈랐어. 네가 이 말을 기억하라는 게 아니야. 거기에 내가 남긴 게 있는지만 같이 보자고."
      }
    ],
    "ISK_L03_AB2_006": [
      {
        "node": "ISK_L03_AB2_006",
        "profile": null,
        "speaker": null,
        "text": "각청은 내가 움켜쥐고 있던 손을 펴게 했다. 흙먼지 사이로 작은 찢김들이 보였다. 그녀는 아프겠다는 말 대신 경비에게 천과 물을 가져오게 했다. 내가 손을 닦는 동안 통로를 맡은 부관이 도착했다. 각청은 옥경대의 폐쇄된 구간까지 자신이 동행하겠다고 알렸다."
      },
      {
        "node": "ISK_L03_AB2_007",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "길을 전부 여는 건 아니야. 지정한 통로로 갔다가 돌아올 거고, 현장에 있는 건 함부로 치우지 마. 네가 남긴 표시라면 네가 먼저 가리켜. 내가 먼저 손대면 나중에 서로 다른 걸 보았다고 또 싸우게 되니까."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_008",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "좋아. 나도 이제 입으로만 설명하는 건 못 하겠어. 내가 그런 적 없다는 얼굴로 듣고 있으면 자꾸 목소리부터 커져. 네가 일부러 그러는 건 아닌데, 나도 멀쩡한 척할 여유가 없네."
      }
    ],
    "ISK_L03_AB2_012": [
      {
        "node": "ISK_L03_AB2_012",
        "profile": null,
        "speaker": null,
        "text": "오르는 길에는 정리하다 만 의자와 천막 줄이 남아 있었다. 의례가 시작될 때 보았던 몸은 보이지 않았다. 부관은 몸이 떨어졌다는 보고가 전달되는 동안 지휘가 몇 차례 엇갈렸고, 수색 인원은 그 자리에 아무것도 없다고 답했다고 말했다. 각청은 그 보고를 들었지만 자신이 몸을 보았던 장면은 떠올리지 못했다. 그 자리로 뛰어가려다 난간부터 보겠다는 약속을 붙잡았다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_013",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "여기야. 저 기둥 아래. 네 몸은 안쪽으로 눕혔고, 그 옆에 노인이 있었어. 내가 몸을 일으킬 때 붙든 덧판은 저 끝이 갈라졌을 거야. 끈은…… 아직 있어."
      }
    ],
    "ISK_L03_AB2_014": [
      {
        "node": "ISK_L03_AB2_014",
        "profile": null,
        "speaker": null,
        "text": "끈은 두 번 감긴 채 기둥 아래에 남아 있었다. 내가 서툴게 남긴 긴 끝이 바닥에 닿았다. 바로 위 덧판에는 비스듬한 금이 나 있었고, 떨어져 나간 가느다란 조각은 난간 아래 돌 틈에 끼어 있었다. 운송인은 손을 대지 않고 가까이 얼굴을 기울였다. 그는 내가 설명했던 모양을 다시 들을 필요가 없었다."
      },
      {
        "node": "ISK_L03_AB2_015",
        "profile": null,
        "speaker": "운송인",
        "text": "이건 얘기한 그대로네요. 끈 끝을 남기라고 옥형 님이 가르치던 것도 제가 봤고요. 다만 이 밑에 수레 자국은 없었을 텐데. 행사용 사람 통로에 짐수레를 들이면 제가 먼저 욕을 먹었을 겁니다."
      },
      {
        "node": "ISK_L03_AB2_016",
        "profile": null,
        "speaker": null,
        "text": "기둥 안쪽에 가는 바퀴 자국 두 줄이 나 있었다. 그중 하나가 긴 끈 끝을 눌러 지나갔고, 젖은 흙에 눌린 섬유 위로 바퀴 기름이 묻어 있었다. 적어도 누군가 매듭을 남긴 뒤 이 자리에 수레를 들인 것은 분명했다. 그것이 무엇을 싣고 갔는지는 바퀴가 말해 주지 않았다."
      },
      {
        "node": "ISK_L03_AB2_017",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "이 구간을 정리한 수레가 있었는지 알아봐. 짐을 치운 사람이 있다면 이름보다 먼저 이동한 방향부터 받아 와. 길이 막혀서 돌아갔다면 그곳 경비도 봤을 거야."
      }
    ],
    "ISK_L03_AB2_027": [
      {
        "node": "ISK_L03_AB2_027",
        "profile": null,
        "speaker": null,
        "text": "주변을 지키던 노인은 뒤쪽 계단으로 작은 수레가 내려간 것을 기억했다. 정리 인력이라고 생각해 막지 않았지만, 고정된 표식이 있는 관용 수레는 아니었다고 했다. 짐 위에는 덮개가 있었고 옆에서는 젊은 남자가 발이 걸리지 않게 끈을 들어 주었다. 노인은 그 아래를 본 적이 없었다."
      },
      {
        "node": "ISK_L03_AB2_028",
        "profile": null,
        "speaker": "운송인",
        "text": "바퀴가 좁은 수레면 안쪽 하역장에서 씁니다. 큰 상자를 싣는 제 수레와는 달라요. 그 통로를 쓰는 짐꾼을 아는 사람은 있습니다. 제가 찾아가 보겠습니다. 당신은 또 혼자 쫓아가겠다고 하지 마요."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_029",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나도 이제 혼자 하고 싶다는 생각은 없어. 몬드에서 같은 식으로 시체가 사라졌을 때 같이 갔던 사람이 있거든. 그때도 답을 못 찾았지만, 적어도 내가 뭘 봤는지는 아는 사람이야. 다이루크에게 연락하고 싶어."
      }
    ],
    "ISK_L03_AB2_030": [
      {
        "node": "ISK_L03_AB2_030",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "몬드에 있는 사람이라면 기다려야 해. 기다리는 동안 이 수레를 놓치지는 않겠어. 연락이 닿을 수 있게 전령 편을 마련해 줄 테니, 그 사람이 와서 무엇을 도와줘야 하는지 적어."
      },
      {
        "node": "ISK_L03_AB2_031",
        "profile": null,
        "speaker": null,
        "text": "구슬이 든 주머니를 한 번 눌렀다. 다이루크에게 무엇부터 써야 할지 생각하자 몬드 사당의 빈 바닥이 떠올랐다. 해결하지 못했던 일을 다시 부탁하는 편지가 될 것이었다. 그러나 그곳을 함께 걸었던 사람이 이 자리에 필요하다는 마음은 분명했다."
      }
    ],
    "ISK_L03_AB2_034": [
      {
        "node": "ISK_L03_AB2_034",
        "profile": null,
        "speaker": null,
        "text": "빈 상자의 평평한 면에 종이를 올렸다. 죽었던 각청이 돌아와 자신을 모른다는 말을 어떻게 적어야 할지 몰라 펜을 멈췄다. 자신이 남긴 매듭은 아직 그곳에 있었다. 그 사실부터 시작할까 생각하다가 빈 첫 줄로 시선을 돌렸다. 앞뒤가 맞는 부분만 골라 적으면 다이루크가 와 주기를 바라는 이유도 사라질 것 같았다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_035",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "다이루크. 몬드에서 우리가 다시 갔던 사당 기억하지. 이번에는 리월에서 사람들이 죽었고, 각청이 살아 돌아와서 나를 모른다고 했어. 내가 그 자리에 남긴 매듭은 아직 있어. 그 뒤 수레가 지나간 흔적도 있는데, 무엇을 옮겼는지는 아직 몰라. 네가 그 사당에서 본 일을 기억하는 상태로 와 줬으면 해. 구슬은 여전히 내가 가지고 있고 이번 사건에서는 아직 꺼내 쓰지 않았어. 편지로 설명할 수 있는 게 너무 적다."
      }
    ],
    "ISK_L03_AB2_036": [
      {
        "node": "ISK_L03_AB2_036",
        "profile": null,
        "speaker": null,
        "text": "그는 구슬 이야기를 쓴 마지막 줄을 손끝으로 눌렀다. 말로 읽어 보니 부탁이라기보다 엉망인 보고 같았다. 운송인은 편지가 멋있게 쓰였다고 사람이 더 빨리 오는 건 아니라며 접을 종이를 가져다주었다. 각청은 몬드로 가는 실제 전령에게 봉투를 맡겼고, 전령은 해지기 전에 출발했다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_037",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "편지에 돈 얘기를 안 썼네. 찾아와 달라고 해 놓고 길값은 알아서 쓰라는 모양새가 됐어. 이런 부탁을 받고 와 주면 성격이 나쁘다는 소리는 내가 앞으로 못 하겠다."
      }
    ],
    "ISK_L03_AB2_038": [
      {
        "node": "ISK_L03_AB2_038",
        "profile": null,
        "speaker": "운송인",
        "text": "그분은 성격이 나쁩니까?"
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_039",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "말수가 적어서 내가 쓸데없는 말을 한 만큼 전부 기억하고 있을 것 같아. 그래서 괜히 돈 얘기부터 걱정하게 돼. 정작 도와달라고 했을 때는 안 들어 준 적이 없는데."
      }
    ],
    "ISK_L03_AB2_042": [
      {
        "node": "ISK_L03_AB2_042",
        "profile": null,
        "speaker": null,
        "text": "이틀의 기다림 끝에 다른 편으로 온 짧은 답장이 도착했다. 다이루크는 편지를 받았으며 리월로 출발한다고 했다. 나 혼자 수레의 뒤를 밟지 말 것, 현장의 흔적이 없어져도 사람까지 쫓아 몰아붙이지 말 것이라는 말이 이어졌다. 마지막 줄에는 식사를 거르지 말라는 문장이 있었다. 필체가 다른 것은 아니었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_043",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "끝까지 잔소리네. 내가 멀리까지 와서 뭘 하고 있는지 다 아는 사람 같잖아. 그래도 출발했다는 말은 좋다. 이제 이 글자를 보고 있으면 사람이 조금씩 가까워지고 있을 거 아니야."
      }
    ],
    "ISK_L03_AB2_049": [
      {
        "node": "ISK_L03_AB2_049",
        "profile": null,
        "speaker": null,
        "text": "다이루크는 나를 보고 걸음을 멈추지 않았다. 바로 앞까지 와서 얼굴과 붕대를 감은 손을 차례로 본 뒤 짐을 내려놓았다. 준비해 두었던 설명 대신 물을 마셨냐는 말을 하고 싶어졌다. 먼 길을 건너온 사람에게 다시 끔찍한 일을 바로 꺼내 놓기가 싫었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_050",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "생각보다 빨리 왔네. 아니, 난 기다리는 동안 엄청 길었는데 네 입장에서는 꽤 달렸겠다. 고맙다는 말부터 해야 할 것 같은데, 일단 앉아. 네가 길에서 쓴 힘까지 내가 빌리러 부른 건 아니니까."
      }
    ],
    "ISK_L03_AB2_051": [
      {
        "node": "ISK_L03_AB2_051",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "앉아서 들으면 된다. 편지는 읽었어. 내가 오기 전에 네가 안으로 사라졌을까 봐 걱정했지. 이곳에서 찾을 수 있었으니 그 일은 잘했군."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_052",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "혼나는 건 몬드에 돌아가서 하자. 여기서는 네가 나를 예전부터 알았다고 해 주는 것만으로도 꽤 도움이 돼. 각청도 나를 모르고, 멀쩡한 사람들까지 내가 본 일을 없던 일처럼 듣거든."
      }
    ],
    "ISK_L03_AB2_053": [
      {
        "node": "ISK_L03_AB2_053",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "몬드의 사당에서 함께 본 것은 기억한다. 그때 있었던 시신이 나중에 사라졌다는 것도. 그 이상은 여기서 봐야겠지. 네가 나를 부른 이유는 충분히 알겠어."
      },
      {
        "node": "ISK_L03_AB2_054",
        "profile": null,
        "speaker": null,
        "text": "각청이 돌아오자 다이루크는 그녀의 직함을 부르며 인사했다. 나를 몬드에서 초청했던 일은 자신도 알고 있다고 짧게 확인한 뒤, 그것으로 지금의 각청을 몰아붙이지 않았다. 그녀가 준비한 수레 경로를 보면서 어느 구간에서 사람의 손이 끊겼는지부터 물었다."
      },
      {
        "node": "ISK_L03_AB2_055",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "수레는 뒤쪽 계단에서 하역장으로 내려갔어. 반납한 사람은 품삯을 더 받았다고 했고, 짐은 안쪽 낡은 창고로 옮겼다고 해. 문제는 창고마다 다시 짐을 나눠 싣는다는 거야. 먼저 봉쇄하면 안에 있는 게 옮겨질 수도 있어."
      },
      {
        "node": "ISK_L03_AB2_056",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "그곳을 드나드는 상인을 만나 보겠어. 문을 지키는 사람보다 물건을 넘겨받는 사람이 더 많이 알 때도 있으니까. 이 사람이 갈 곳은 내가 확인한 뒤 정하지."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_057",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "다들 내 행선지는 참 잘 정하네. 그래도 이번에는 같이 가자. 그 사람이 어떤 표정으로 나를 봤는지, 내가 어디에 멈췄는지는 옆에서 말해 줄 수 있어. 맨 앞에 세워 달라는 소리는 안 할게."
      }
    ],
    "ISK_L03_AB2_070": [
      {
        "node": "ISK_L03_AB2_070",
        "profile": null,
        "speaker": null,
        "text": "운송인이 들어와 손바닥만 한 종이를 내려놓았다. 수레를 반납받은 사람의 말에 따르면 짐을 내릴 때 무언가 굴러가는 소리가 났다고 했다. 돌인지 쇠인지 알 수 없었고, 덮개는 창고 사람이 직접 걷었다. 구슬이 든 주머니를 무의식적으로 만졌다. 지금까지 차갑게 잠들어 있던 물건이었다."
      },
      {
        "node": "ISK_L03_AB2_071",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "내가 경비를 한꺼번에 보내면 안쪽 사람들이 달아날 거야. 먼저 창고 뒤 통로와 밖으로 나오는 짐을 막을 위치를 잡겠어. 안에 들어간 뒤 신호가 오면 바로 움직일 수 있게. 다이루크 씨, 오래 머물지는 말아 주세요."
      },
      {
        "node": "ISK_L03_AB2_072",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "확인하고 돌아오는 것으로 하지. 정면에서 누군가를 붙잡아야 한다면 그때는 그쪽 몫이겠군. 들어가는 동안 뒤편 통로에 민간인이 접근하지 않게 해 줬으면 한다."
      }
    ],
    "ISK_L03_AB2_075": [
      {
        "node": "ISK_L03_AB2_075",
        "profile": null,
        "speaker": null,
        "text": "창고는 바닷가 큰길에서 두 골목 안쪽에 있었다. 창마다 널빤지가 대어져 있었지만 지붕 아래 작은 통풍구는 열려 있었다. 다이루크는 문보다 땅을 먼저 보았다. 바퀴에 눌린 흙이 아직 말라붙지 않았고, 사람이 서 있던 쪽에만 먼지가 걷혀 있었다. 낮에 사람이 살지 않는 건물에도 밤에는 발소리가 이렇게 모일 수 있다는 것을 처음 실감했다."
      },
      {
        "node": "ISK_L03_AB2_076",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "뒷문에서 오른쪽 골목으로 나가면 각청이 세운 사람이 있다. 안쪽에서 무슨 일이 생겨도 모르는 문으로 먼저 뛰지 마. 이 길을 기억해 둬."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_077",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "오른쪽 골목, 두 번째 낮은 담, 경비. 알겠어. 불난 건물에서도 귀중품 챙기러 들어가지 말라는 말을 이제야 제대로 배운 기분이네. 오늘은 시신이 보여도 혼자 들고 나오겠다고 하지 않을게."
      }
    ],
    "ISK_L03_AB2_078": [
      {
        "node": "ISK_L03_AB2_078",
        "profile": null,
        "speaker": null,
        "text": "다이루크는 나를 잠깐 보다가 고개를 끄덕였다. 그 약속이 가벼운 농담이 아니라는 것을 알았다. 뒷문에는 새 자물쇠가 걸려 있었지만 옆의 오래된 문틀은 안쪽 고정쇠가 빠져 있었다. 연락 상대가 쓰던 출입구였다. 다이루크가 문틀을 벌리는 동안 나는 움직인 나무가 다시 부딪히지 않게 받쳤다."
      },
      {
        "node": "ISK_L03_AB2_079",
        "profile": null,
        "speaker": null,
        "text": "안에는 비어 있지 않은 상자들이 좁은 길을 만들고 있었다. 두 사람이 지나자 천으로 덮은 긴 짐 하나가 흔들렸다. 걸음을 멈췄지만 다이루크가 손을 들어 기다리게 했다. 바닥에는 끝이 열린 포대가 있었고 그 안에서 작은 쇳조각들이 굴러 나와 있었다. 긴 짐은 사람의 몸이 아니라 겹쳐 놓은 운반대였다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_080",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "헛것부터 찾네. 내 머릿속에서는 이미 저 덮개 안에 사람이 누워 있었어. 앞으로 긴 물건만 보면 이럴까 봐 겁난다. 지금은 네가 먼저 봐 주는 게 좋겠어."
      }
    ],
    "ISK_L03_AB2_081": [
      {
        "node": "ISK_L03_AB2_081",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "그럼 발밑을 봐. 누가 지나갔는지 확인하는 데는 그쪽도 필요하다. 이 수레 바퀴에 묻은 흙은 밖에서 본 것과 비슷해. 안쪽으로 밀고 간 흔적이 있군."
      },
      {
        "node": "ISK_L03_AB2_082",
        "profile": null,
        "speaker": null,
        "text": "안쪽 칸막이를 지나자 좁은 수레가 나타났다. 같은 모양이라고 같은 수레가 되지는 않았지만, 바퀴 안쪽에 길게 찢어진 가죽띠가 달려 있었다. 운송인이 빌려준 사람에게 들은 특징이었다. 몸을 낮춰 끈이 묶였던 자리를 보았다. 바닥에는 덮개가 내려져 있었고, 그 위로 흰 가루가 작은 부채꼴 모양으로 퍼져 있었다."
      },
      {
        "node": "ISK_L03_AB2_083",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "여기서 짐을 내리긴 했군. 만지지 마. 저쪽에서 사람이 온다."
      },
      {
        "node": "ISK_L03_AB2_084",
        "profile": null,
        "speaker": null,
        "text": "말이 끝나기도 전에 등불이 칸막이 너머로 움직였다. 다이루크는 나를 뒤로 밀고 상자 옆으로 붙었다. 창고를 지키던 남자 둘이 돌아서다 벌어진 문틈을 발견했다. 한 명은 손에 든 짧은 칼을 들었고 다른 한 명은 천장에 매달린 종 쪽으로 손을 뻗었다. 다이루크가 먼저 거리를 좁혔다."
      }
    ],
    "ISK_L03_AB2_091": [
      {
        "node": "ISK_L03_AB2_091",
        "profile": null,
        "speaker": null,
        "text": "다이루크는 칼을 든 손목을 비틀어 공격을 벗기고 칸막이 쪽으로 밀어붙였다. 출입구의 작은 상자를 옆으로 끌어 종으로 이어지는 길을 좁혔다. 다른 남자가 허리를 들이밀자 나는 버티는 대신 몸을 빼고 상자 뚜껑을 밀었다. 남자의 팔이 잠깐 걸린 사이 다이루크가 옆으로 돌아 그를 바닥에 눕혔다. 불을 크게 일으키지 않은 교전이었지만 숨이 돌아올 틈은 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_092",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "여기서 뭘 옮겼어? 뒤쪽 계단에서 수레가 왔잖아. 덮개 아래 있던 게 어디로 갔는지 말해. 사람을 실었는지 돌을 실었는지 그것부터!"
      }
    ],
    "ISK_L03_AB2_093": [
      {
        "node": "ISK_L03_AB2_093",
        "profile": null,
        "speaker": "창고 경비",
        "text": "우리는 안 건드렸어! 안쪽 방에 들여놓으라고 해서 밀어 줬을 뿐이야. 나온 사람도 없어. 당신들 때문에 소리가 나면 우리까지……."
      },
      {
        "node": "ISK_L03_AB2_094",
        "profile": null,
        "speaker": null,
        "text": "남자는 말하다가 자기 이빨을 딱딱 부딪쳤다. 구슬이 든 주머니 쪽에서 희미한 열이 올라왔다. 상대가 자신의 얼굴이 아니라 그 아래를 보고 있다는 것을 알아차렸다. 안쪽 방의 문은 바깥에서 잠기지 않았다. 문 아래 좁은 틈을 통해 어두운 빛이 바닥의 먼지를 비추고 있었다."
      },
      {
        "node": "ISK_L03_AB2_095",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "밖으로 나가. 무기는 두고, 골목의 경비에게 붙잡혀도 달아나지 마라. 여기서 다치지 않을 수 있는 길은 그쪽이다."
      },
      {
        "node": "ISK_L03_AB2_096",
        "profile": null,
        "speaker": null,
        "text": "남자들은 더 설명하지 않고 뒷문으로 달렸다. 밖에서 천암군이 제지하는 소리가 들렸다. 다이루크는 그들이 빠져나간 것을 확인한 뒤 나에게 방 안으로 들어가지 말고 문 밖에 서 있으라고 했다. 뜨거워지는 주머니를 몸에서 떼었다. 손바닥을 통해 구슬의 떨림이 전해졌다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_097",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이번에는 반응해. 여기 오기 전까지는 아무 일도 없었는데. 네가 사당에서 봤던 걸 기억하지? 나도 지금 같은 걸 찾으러 왔는데, 얘는 다른 걸 보고 있는 것 같아."
      }
    ],
    "ISK_L03_AB2_098": [
      {
        "node": "ISK_L03_AB2_098",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "문 앞에서 기다려. 무엇에 반응하는지 확인하려고 네 몸을 먼저 가까이 댈 필요는 없다. 안쪽에 사람이 있으면 내가 데리고 나오겠다."
      },
      {
        "node": "ISK_L03_AB2_099",
        "profile": null,
        "speaker": null,
        "text": "다이루크가 문을 밀었다. 작은 방에는 사람을 눕힐 만큼 긴 작업대가 있었지만 그 위에 몸은 없었다. 가운데 놓인 낡은 상자의 뚜껑은 반쯤 깨져 있었고, 안에는 손톱보다 조금 큰 거무스름한 파편이 매달리듯 떠 있었다. 잘라낸 쇠처럼 보이다가 각도가 바뀌면 얼음 속을 보는 것처럼 깊어졌다. 누가 그것을 이곳에 놓았는지 알려 주는 표시는 없었다."
      },
      {
        "node": "ISK_L03_AB2_100",
        "profile": null,
        "speaker": null,
        "text": "내가 문턱 밖에서 천을 풀자 구슬이 손안에서 돌아갔다. 내가 돌린 방향과 반대였다. 파편에서 얇은 빛이 풀려 나와 실처럼 길어졌고, 그 끝이 구슬 안으로 끌려 들어갔다. 구슬의 표면을 감싸던 차가운 결이 잠깐 안쪽으로 깊어졌다. 파편은 그만큼 빛을 잃었지만 크기가 줄었는지까지는 눈으로 가릴 수 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_101",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내가 당기는 거 아니야. 손을 빼도 따라와. 덮어 볼게. 구슬 말고 저 조각을 먼저 건드리지는 마. 이게 먹는 건지 깨뜨리는 건지 모르겠지만, 네 손이 그 사이에 들어가면 안 될 것 같아."
      }
    ],
    "ISK_L03_AB2_102": [
      {
        "node": "ISK_L03_AB2_102",
        "profile": null,
        "speaker": null,
        "text": "천을 덮자 빛은 가려졌지만 떨림은 멈추지 않았다. 다이루크가 작업대와 문 사이에서 한 발 물러났다. 바깥 천장에 달린 종이 저절로 흔들렸다. 아까 남자가 잡지 못했던 줄이 위로 팽팽해지며 벽에 부딪쳤다. 문 너머 창고가 순간 좁아졌다가 원래 폭으로 돌아왔고, 먼지가 서 있던 자리에서 아래가 아닌 옆으로 쓸렸다."
      },
      {
        "node": "ISK_L03_AB2_103",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "나가자. 지금은 저 물건을 챙길 때가 아니야. 네가 들고 있는 것은 그대로 감싸. 떨어뜨리려고 멈추지도 마."
      },
      {
        "node": "ISK_L03_AB2_104",
        "profile": null,
        "speaker": null,
        "text": "구슬을 천째 주머니에 넣었다. 돌아서는 순간 작업대가 한쪽으로 미끄러졌고 파편을 담은 상자가 뒤집혔다. 바닥에 닿는 소리는 들리지 않았다. 두 사람은 그 물건을 줍지 않았다. 방과 창고 사이의 문틀이 뒤틀리며 나무가 갈라졌고, 바깥에서 창문을 뜯는 듯한 충격이 연달아 울렸다."
      }
    ],
    "ISK_L03_AB2_109": [
      {
        "node": "ISK_L03_AB2_109",
        "profile": null,
        "speaker": null,
        "text": "팔을 벌려 기둥을 붙잡았다. 손바닥의 상처가 다시 벌어졌다. 다이루크가 선반을 옆으로 밀고 건너오려는 순간 두 사람 사이에 문짝 하나가 떨어졌다. 천장에서 떨어진 물건이라면 바닥에 쓰러졌어야 했다. 그러나 문은 서 있는 채 경첩 소리를 냈고, 그 너머 다이루크의 어깨가 얇은 틈처럼 줄어들었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_110",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "다이루크, 여기야! 내가 지금 기둥을 잡고 있어. 목소리 들리면 대답해. 넘어오려고 하다 깔리지 말고, 일단…… 내 쪽 문이 닫히고 있어!"
      }
    ],
    "ISK_L03_AB2_111": [
      {
        "node": "ISK_L03_AB2_111",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "손을 떼고 뒤로 물러나! 그 틈에 팔을 넣지 마라. 나는 밖에서 다른 길을 찾겠다. 살아서 대답할 수 있게 있어!"
      },
      {
        "node": "ISK_L03_AB2_112",
        "profile": null,
        "speaker": null,
        "text": "검날이 문 사이로 한 번 들어왔다. 그 너머 붉은 빛이 번졌지만 문틀이 아니라 칠해지지 않은 돌벽이 나타났다. 다이루크의 검끝이 사라지기 직전 나는 기둥에서 손을 뗐다. 충격이 옆구리를 밀어 바닥으로 넘어뜨렸다. 벽이 바로 앞을 스쳤고, 몸이 잘려 나갈 것처럼 좁아지던 틈은 닫혔다."
      },
      {
        "node": "ISK_L03_AB2_113",
        "profile": null,
        "speaker": null,
        "text": "등불빛이 사라진 뒤에도 나는 한동안 얼굴을 들지 못했다. 먼지가 입 안에서 씹혔다. 들고 있던 구슬은 주머니 안에 있었고 손을 넣자 열이 느껴졌다. 다리를 움직이니 아팠지만 움직였다. 바로 옆에서 작은 돌이 떨어져 어깨를 쳤다. 몸을 굴려 벽에서 떨어진 좁은 빈틈으로 기어갔다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_114",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "다이루크! 나 살아 있어. 들리는지는 모르겠는데, 일단 살아 있다고 할게. 아까 그 오른쪽 골목은 없어. 문도 없어졌어. 내가 일부러 다른 데로 간 건 아니니까, 나중에 잔소리할 때 그건 좀 빼 줘."
      }
    ],
    "ISK_L03_AB2_115": [
      {
        "node": "ISK_L03_AB2_115",
        "profile": null,
        "speaker": null,
        "text": "대답 대신 머리 위에서 느리게 긁는 소리가 났다. 소리가 나는 쪽으로 기어가다가 멈췄다. 무너진 창고라면 벽 바깥에서 바람이나 사람 소리가 들어와야 했다. 그러나 돌 사이로 보인 것은 천장이 낮은 긴 복도였다. 창고에서 보았던 흙벽도 널빤지도 없었다. 멀리 희미한 불빛이 있었지만 그곳까지의 거리를 알 수 없었다."
      },
      {
        "node": "ISK_L03_AB2_116",
        "profile": null,
        "speaker": null,
        "text": "다이루크는 창고 뒷문 밖으로 밀려 나왔다. 각청이 뛰어와 어깨를 받치려 했지만 그는 다시 문을 향했다. 안쪽은 무너진 선반과 꺼진 바닥으로 막혀 있었다. 검으로 걷어 낸 널빤지 너머에 아까 내가 붙잡았던 기둥은 없었다. 그는 밖에서 확인한 벽의 길이와 안에서 달린 거리가 맞지 않는다는 것을 깨닫고, 문이 있던 면을 주먹으로 쳤다."
      },
      {
        "node": "ISK_L03_AB2_117",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "혼자 다시 들어가지 마세요. 뒤쪽 벽을 열 인원을 부르고 있어요. 마지막으로 어디서 갈라졌어요? 그 사람이 어느 쪽으로 밀렸는지만 먼저 알려 주세요."
      },
      {
        "node": "ISK_L03_AB2_118",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "안쪽 기둥 옆이다. 거기에 없던 문이 둘 사이에 생겼어. 내가 잡기 전에 벽으로 바뀌었고. 무너진 곳을 전부 같은 바닥이라고 생각하고 밟으면 안 된다."
      },
      {
        "node": "ISK_L03_AB2_119",
        "profile": null,
        "speaker": null,
        "text": "각청은 설명을 이해한 척하지 않았다. 대신 두 사람을 뒤쪽 지붕으로 보내고, 다른 인원에게 길 건너 건물의 안쪽 벽을 확인하게 했다. 운송인은 붙잡힌 창고 경비에게 다른 출입구를 물었다. 경비는 안쪽 방 뒤에는 벽밖에 없다고 울먹였다. 다이루크는 내 이름을 다시 불렀다. 답이 들렸다고 말할 수는 없었지만, 부르는 것을 멈추지도 않았다."
      }
    ],
    "ISK_L03_AB2_120": [
      {
        "node": "ISK_L03_AB2_120",
        "profile": null,
        "speaker": null,
        "text": "아래쪽의 나는 벽을 손바닥으로 세 번 두드렸다. 손바닥이 아파 옷소매로 감싸고 다시 쳤다. 가까운 돌이 울렸을 뿐 건너편의 대답은 오지 않았다. 복도 쪽으로 몸을 돌리자 품의 구슬이 한 차례 낮게 떨렸다. 빛이 길을 가리키지는 않았다. 다만 이곳에 자기 숨소리 이외의 것이 하나 더 있다는 사실만 분명해졌다."
      },
      {
        "node": "R39_PROSE_ISK_L03_AB2_121",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "네가 뭘 했는지는 나중에 따질게. 지금 여기서 나까지 조용해지면 아무도 찾을 게 없잖아. 손이든 목소리든 아직 되는 걸 써야지. 구하러 오라고 불렀다가 나를 캐내게 생겼네. 그래도 살아서 욕먹는 쪽으로 해 보자."
      }
    ],
    "ISK_L03_B1_003": [
      {
        "node": "ISK_L03_B1_003",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "네가 겁에 질렸다는 건 보여. 그렇다고 기억나지 않는 일을 기억한다고 해 줄 수는 없어. 선장, 이 사람과 언제부터 함께 있었지? 여기로 오기 전에 다치거나 쓰러진 적은?"
      },
      {
        "node": "ISK_L03_B1_004",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "행렬에 있을 때부터 내 눈앞에 있었어. 네가 차양을 봐준 자리에도 나와 내 선원이 있었다. 너를 봤다는 말부터 틀렸다고 밀어버리지 마. 지금 쓰러질 사람은 이쪽 같으니, 우선 앉힐 곳부터 내줘."
      },
      {
        "node": "ISK_L03_B1_005",
        "profile": null,
        "speaker": null,
        "text": "북두는 허락을 기다리며 나를 세워두지 않았다. 통로를 막지 않는 낮은 석축으로 나를 데려가 앉히고 물통을 쥐여주었다. 각청은 병사에게 자리를 비우라고 지시한 뒤 맞은편에 쪼그려 앉았다. 그녀가 허리의 장식을 옆으로 밀어 앉는 사소한 움직임을 보고, 나는 다시 한 번 눈을 감았다. 지금의 각청은 질문을 받으면 짜증도 내고 무릎도 접는 사람이었다. 자신이 놓고 도망친 몸과는 너무 달랐다."
      },
      {
        "node": "ISK_L03_B1_006",
        "profile": null,
        "speaker": "교대 병사",
        "text": "제가 함께 근무하던 병사도 돌아왔는지 확인해 주십시오. 쉬다가 이분과 의례에 들어갔습니다. 저한테 가족 연락을 부탁했던 그 친구입니다. 저는 밖에 있었고, 이분은 그 친구가 죽었다고……."
      },
      {
        "node": "ISK_L03_B1_007",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "이름과 소속은 따로 적어 줘. 돌아온 참관인과 통로 경계를 다시 대조하겠어. 네가 직접 데려간 사람을 찾는 거라면, 인상착의만으로 대신 확인했다고 넘기지는 않을 거야."
      }
    ],
    "ISK_L03_B1_021": [
      {
        "node": "ISK_L03_B1_021",
        "profile": null,
        "speaker": null,
        "text": "교대 병사는 품에서 접은 종이를 꺼내다 말고 손을 멈췄다. 그가 부탁했던 전달 담당자는 봉쇄선 배치를 바꾸느라 전갈을 다른 병사에게 넘겼고, 그 뒤로 누구도 마을까지 다녀오지 않았다. 교대 병사가 출발 전에 돌려받은 것은 모서리만 닳은 채 봉인이 그대로인 종이였다. 기억이 지워졌기 때문에 못 온 것이 아니었다. 누구에게나 급한 일이 생겼고, 그 사이에서 한 집으로 갈 말이 계속 뒤로 밀렸다."
      },
      {
        "node": "ISK_L03_B1_022",
        "profile": null,
        "speaker": "교대 병사",
        "text": "제가 끝까지 찾아왔어야 했습니다. 전달했다고 들은 게 아니라 전달을 부탁했다고 들은 건데, 그걸 붙잡고 기다렸습니다. 이건 그 친구가 처음에 부탁했던 말입니다. 늦었지만 지금 드리겠습니다."
      },
      {
        "node": "ISK_L03_B1_023",
        "profile": null,
        "speaker": "병사의 누나",
        "text": "이걸 지금 읽으면 동생이 돌아오나요? 내가 걱정할까 봐 괜찮다고 쓴 말이겠죠. 당신들 표정은 전혀 괜찮지가 않은데, 종이만 먼저 주면 내가 뭐부터 믿어야 해요?"
      },
      {
        "node": "R39_PROSE_ISK_L03_B1_024",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "저는 오늘 동생분의 숨이 멎는 걸 봤어요. 손을 잡고도 아무것도 못 했고, 다른 사람들도 한꺼번에 죽어서 겁먹고 도망쳤어요. 그 뒤에 똑같이 죽었던 각청을 살아서 만났어요. 그래서 동생분도 살아 있다고 말씀드리고 싶은데, 제가 찾은 건 아직 없어요. 그렇다고 본 걸 감추고 그냥 길이 막혀 늦는다고 말할 수도 없어서 왔어요."
      }
    ],
    "ISK_L03_B1_025": [
      {
        "node": "ISK_L03_B1_025",
        "profile": null,
        "speaker": null,
        "text": "여자는 종이를 받지 않았다. 행주를 쥔 손이 천천히 내려가다가, 물이 떨어지는 것도 잊은 채 멎었다. 북두는 내가 말을 이어 붙여 침묵을 메우려 하자 팔꿈치를 잡았다. 냄비 안에서 끓어넘친 물이 화덕으로 떨어졌다. 여자는 그제야 돌아서서 뚜껑을 치웠고, 뜨거운 김에 얼굴을 숨긴 채 왜 혼자 돌아왔느냐고 물었다."
      },
      {
        "node": "ISK_L03_B1_026",
        "profile": null,
        "speaker": "병사의 누나",
        "text": "같이 갔다면서요. 돌아올 때도 같이 와야죠. 내가 그 사람하고 무슨 약속을 했는지 알아요? 여기 와서 쉬기 싫어할 거라고 생각해서, 일 안 시킬 테니 밥만 먹고 가라고 했어요. 왜 그 사람은 남들 앞에서 괜찮아야 했는데, 당신은 혼자 돌아와도 돼요?"
      },
      {
        "node": "R39_PROSE_ISK_L03_B1_027",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그래서는 안 된다고 생각해서 다시 가는 중이에요. 용서받을 말을 만들어 온 건 아니에요. 동생분은 쉬는 동안 아무것도 안 한 게 아니라, 제대로 쉬려고 애썼어요. 남의 짐만 되고 싶지는 않았다고, 그건 기억해 달라고 했어요. 제가 지금 가져온 게 그 말밖에 없어서 미안해요."
      }
    ],
    "ISK_L03_B1_028": [
      {
        "node": "ISK_L03_B1_028",
        "profile": null,
        "speaker": null,
        "text": "그녀는 화덕 앞에 그대로 앉았다. 그녀를 일으키려고 손을 내밀지 않았다. 교대 병사가 종이를 식탁의 마른 자리 위에 놓았고, 북두가 넘친 물을 닦았다. 침묵이 길어지는 동안 그릇의 수가 눈에 들어왔다. 여자 혼자 쓰기에는 큰 그릇 두 개와 작은 접시 여럿이었다. 동생이 일을 하지 않아도 앉을 자리는 이미 준비되어 있었다."
      },
      {
        "node": "ISK_L03_B1_029",
        "profile": null,
        "speaker": "병사의 누나",
        "text": "그 아이는 누가 쉬라고 하면 꼭 뭘 하나 치우고 앉았어요. 당신이 만들어낸 말 같지는 않네요. 그래서 더 화가 나요. 내가 그 말을 직접 듣지 못했는데, 당신은 들었다니까."
      }
    ],
    "ISK_L03_B1_036": [
      {
        "node": "ISK_L03_B1_036",
        "profile": null,
        "speaker": null,
        "text": "여자는 오래된 천주머니를 가져왔다. 바닥을 한 번 덧댄 것으로, 닫는 끈 한쪽에 진한 갈색 실이 섞여 있었다. 동생이 집에 두고 간 물건을 가져왔나 생각했다. 교대 병사는 이내 안색이 변했다. 전날 저녁 외곽 창고의 물통 옆에서 바로 그 주머니를 보았다는 것이다. 그때 병사는 분명 나와 차양에 있었고, 창고로 갈 이유가 없었다. 여자는 동생이 집에 두고 간 물건이 아니라며 내민 것은 같은 천으로 만든 자신의 주머니라고 정정했다. 둘은 함께 산 천을 나눠 썼다."
      },
      {
        "node": "ISK_L03_B1_037",
        "profile": null,
        "speaker": "교대 병사",
        "text": "새 주머니라고 기억합니다. 바닥을 덧댄 것도 아니고, 끈에 갈색 실도 없었습니다. 제가 잘못 본 걸지도 모르지만, 그 친구가 물건을 잃어버렸다는 말은 하지 않았습니다. 창고를 다시 찾아보겠습니다."
      },
      {
        "node": "R39_PROSE_ISK_L03_B1_038",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "비슷한 물건 하나 보고 동생분이라고 정하진 않을게요. 그래도 이제 돌아가서 볼 곳은 생겼어요. 이건 빌릴 수 있을까요? 얼굴을 못 찾는다고 해서, 그 사람이 살아온 흔적까지 모른 척하고 싶지는 않아요."
      }
    ],
    "ISK_L03_B1_042": [
      {
        "node": "ISK_L03_B1_042",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그러면 아는 사람을 늘려. 네 손으로 전부 풀 수 있어야 남을 부르는 건 아니잖아. 몬드에서 너와 이 구슬을 함께 본 사람이 있다며. 그쪽에 아무 소식도 주지 않고 혼자 들여다보는 건 네 고집이지, 책임감은 아니야."
      },
      {
        "node": "R39_PROSE_ISK_L03_B1_043",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "진에게 도움을 청할게. 편지에는 내가 본 죽음, 돌아왔는데 나를 모르는 각청, 설산의 구슬, 아직 돌아오지 않은 병사 이야기까지 적을 거야. 몬드에는 구슬을 얻고 드발린을 막을 때 함께 있었던 알베도도 있으니까. 지금 당장 날아올 수 없다는 건 알아. 그래도 저기까지 길이 이어져 있을 때 사람을 불러야 할 것 같아."
      }
    ],
    "ISK_L03_B1_045": [
      {
        "node": "ISK_L03_B1_045",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "달려가는 사람에게는 길을 열어 주고, 기다리는 사람은 여기서 할 일을 해. 네 편지 한 통 때문에 내 선원들이 모두 장사 접고 너만 보고 앉아 있지는 않을 거야. 너도 그건 바라지 않겠지?"
      },
      {
        "node": "R39_PROSE_ISK_L03_B1_046",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 정도로 대접받으면 나는 오히려 도망가. 편지를 써 놓고도 손이 놀고 있으면 내가 쓸데없는 결론을 낼 것 같으니까, 오늘 밤에 들고 나를 물통부터 줘. 단, 다 씻은 그릇을 또 씻기라고 시키면 그때는 항의한다."
      }
    ],
    "ISK_L03_B1_060": [
      {
        "node": "ISK_L03_B1_060",
        "profile": null,
        "speaker": "교대 병사",
        "text": "날이 개면 이 길은 금방입니다. 저 갈라진 바위를 지나면 수레 두 대가 나란히 설 만한 자리가 나옵니다. 창고지기가 말한 것도 이 부근이었습니다. 그 친구를 닮은 병사가 밤중에 혼자 북쪽으로 걸었다고요."
      },
      {
        "node": "R39_PROSE_ISK_L03_B1_061",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이제는 닮았다는 말만 들어도 쫓아가고 싶네. 만나면 먼저 따지고 싶었는데, 무슨 말을 해야 할지도 잊었어. 그릇은 왜 남한테 치우게 해 놓고 사라졌냐고 하면 너무 못된 소린가?"
      }
    ],
    "ISK_L03_B1_062": [
      {
        "node": "ISK_L03_B1_062",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "돌아와 앉는다면 그 정도 잔소리는 직접 해. 만나기도 전에 뭘 물을지 전부 정해두면, 정작 얼굴 보고 나서는 하나도 못 꺼내더라. 저 위로 가면 쉬자. 네 발뒤꿈치가 또 벗겨졌어."
      },
      {
        "node": "ISK_L03_B1_063",
        "profile": null,
        "speaker": null,
        "text": "갈라진 바위 곁을 지나 언덕을 넘었다. 케이아는 뒤처지는 내 짐을 슬쩍 나누어 들었고, 나는 알아차리고도 모르는 척했다. 언덕 너머에 갈라진 바위가 있었다. 처음에는 비슷한 모양이라 생각했다. 그러나 북두가 걸음을 멈추고 바위 아래 풀숲을 가리켰다. 아까 내가 바닥에 떨어뜨렸다가 젖었다며 버린 끈 한 토막이 똑같이 놓여 있었다."
      },
      {
        "node": "ISK_L03_B1_064",
        "profile": "PROFILE_MOND_KAEYA",
        "speaker": "케이아",
        "text": "길을 잘못 들어 한 바퀴 돌았다면 내가 먼저 부끄러워해야겠군. 하지만 방금까지 해는 같은 쪽에 있었어. 저 끈, 네가 주머니에서 꺼내다 떨어뜨린 게 맞지?"
      },
      {
        "node": "R39_PROSE_ISK_L03_B1_065",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "맞아. 다시 묶을 수 없을 만큼 짧아서 버렸어. 지저분하게 굴었다고 혼나기 전에 주우면 해결될 줄 알았는데, 주워서 끝날 문제가 아닌 것 같네."
      }
    ],
    "ISK_L03_B1_066": [
      {
        "node": "ISK_L03_B1_066",
        "profile": null,
        "speaker": null,
        "text": "북두는 바위에 칼끝으로 길게 흠집을 냈다. 네 사람은 되돌아가 보았다. 내려왔어야 할 언덕이 또 올라가는 길이 되어 있었다. 흠집 낸 바위가 앞에 나타났고, 이번에는 케이아가 그것을 직접 손으로 쓸어보았다. 돌가루가 손가락에 묻었다. 풍경을 멀리서 잘못 본 것이 아니라, 방금 손댄 자리에 돌아온 것이다. 뒤돌아보았지만 조금 전 함께 지나온 넓은 길이 보이지 않았다."
      },
      {
        "node": "ISK_L03_B1_067",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "다들 여기 붙어. 길이 꼬였다고 아무 데나 퍼져서 찾으면, 다음에는 길보다 네 얼굴을 먼저 잃어버려. 케이아, 바위 위에서 바깥을 볼 수 있겠어? 나는 밑으로 내려가는 쪽을 본다."
      },
      {
        "node": "ISK_L03_B1_068",
        "profile": "PROFILE_MOND_KAEYA",
        "speaker": "케이아",
        "text": "올라가 볼게. 네가 절벽을 내려간다면 혼자는 가지 마. 아직 이 자리가 어디인지 모르는 상태니까. 그리고 너희 둘, 내가 안 보이더라도 소리 없이 움직이지는 말고."
      }
    ],
    "ISK_L03_B1_071": [
      {
        "node": "ISK_L03_B1_071",
        "profile": "PROFILE_MOND_KAEYA",
        "speaker": "케이아",
        "text": "나도 네가 멀쩡히 항의하는 편이 좋지. 다만 붙잡아 달라고 할 때는 크게 말해. 네 체면까지 보전해 주느라 손을 늦추지는 않을 거야."
      },
      {
        "node": "ISK_L03_B1_072",
        "profile": null,
        "speaker": null,
        "text": "바위 위로 바람이 멎었다. 북두의 머리카락은 어깨에 가라앉았는데, 풀숲의 잎만 한쪽 방향으로 당겨졌다. 겉옷 안에서 단단한 것이 갈비뼈를 밀어내는 느낌을 받았다. 구슬이었다. 굴러갈 자리도 없는 주머니 안에서 그것이 옷감을 팽팽하게 잡아당기고 있었다. 꺼내자 손바닥 위에서 미세한 진동이 느껴졌고, 갈라진 바위의 안쪽에 가느다란 청백색 선이 드러났다."
      }
    ],
    "ISK_L03_B1_075": [
      {
        "node": "ISK_L03_B1_075",
        "profile": null,
        "speaker": null,
        "text": "케이아는 길가 돌출부에 밧줄을 돌려 얼음으로 틈을 메웠다. 그러자 구슬 가까이에 있던 얼음 끝에서 푸른 빛이 실처럼 풀려 나왔다. 빛은 녹은 물로 떨어지지 않고 내 손바닥으로 휘어 들어왔다. 동시에 바위 안쪽의 선도 더 선명해졌다가 가늘어졌다. 그 빛을 먹은 듯 구슬 한쪽이 희게 달아올랐고, 나는 이를 악물었다. 따뜻한 수준을 넘어서 살갗이 아플 만큼 뜨거웠다."
      },
      {
        "node": "ISK_L03_B1_076",
        "profile": "PROFILE_MOND_KAEYA",
        "speaker": "케이아",
        "text": "잠깐, 내 얼음에도 반응했어. 네 손에서 떨어진 곳은 그대로인데 가까운 부분만 얇아지고 있어. 얼려서 고정하는 건 여기서는 오래 못 쓰겠군. 밧줄을 돌에 두 번 감겠다."
      }
    ],
    "ISK_L03_B1_083": [
      {
        "node": "ISK_L03_B1_083",
        "profile": null,
        "speaker": null,
        "text": "구슬을 감싼 천이 돌 가까이 내려가자 바닥에 가는 틈이 생겼다. 천째 그것을 다시 끌어안아야 했다. 발밑이 옆으로 미끄러지고 있었기 때문이다. 반복되던 언덕이 젖은 종이처럼 말려 올라가며 그 뒤의 낮은 골짜기를 드러냈다. 바깥에서는 선원들이 피운 연기가 보였다. 불과 얼마 떨어지지 않은 곳이었다. 북두가 먼저 발을 걸어 틈을 넓히고, 케이아가 내 몸을 밀었다."
      },
      {
        "node": "ISK_L03_B1_084",
        "profile": null,
        "speaker": null,
        "text": "교대 병사가 마지막으로 넘어오려던 순간 바위가 내려앉았다. 돌 조각이 그의 종아리를 때렸고, 그는 비명과 함께 무릎을 꿇었다. 북두가 팔을 잡아당겼지만 발목이 낀 바닥까지 함께 끌려왔다. 구슬에서 풀려나온 빛은 다시 바위로 돌아가지 않았다. 오히려 바위의 밝은 선이 끊기고, 그 자리를 검은 틈이 대신했다. 열린 길이 사람을 밀어내는 입처럼 오므라들었다."
      },
      {
        "node": "R39_PROSE_ISK_L03_B1_085",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내 쪽으로 당겨! 밧줄 길이 남아 있어. 내가 여기서 주저앉으면 받칠 수 있어. 그 사람 발부터 빼, 아까 그 친구도 내가 손 놓고 나왔는데 이번에는 또 그러기 싫어!"
      }
    ],
    "ISK_L03_B1_088": [
      {
        "node": "ISK_L03_B1_088",
        "profile": null,
        "speaker": null,
        "text": "병사는 상처보다 가슴 쪽을 먼저 더듬었다. 가족에게서 빌린 주머니와 창고에서 찾은 주머니를 함께 싼 천이 여전히 있었다. 그는 그것을 꺼내 보이려다 손을 놓쳤다. 두 주머니가 흙바닥에 떨어졌고, 바닥을 덧댄 쪽만 가느다랗게 떨렸다. 제 손을 감싼 천을 더 조였다. 구슬이 다시 반응할까 봐 섣불리 가까이 가져가지 못했다."
      },
      {
        "node": "ISK_L03_B1_089",
        "profile": null,
        "speaker": "교대 병사",
        "text": "제가 가져가겠습니다. 누나께 빌린 거니까 제가 돌려드려야 합니다. 신발은 한쪽만 있어도 가는데, 저건 남기고 갈 수 없습니다. 바로 앞이잖습니까. 제가 집겠습니다."
      },
      {
        "node": "ISK_L03_B1_090",
        "profile": "PROFILE_MOND_KAEYA",
        "speaker": "케이아",
        "text": "앉아 있어. 방금 구해냈는데 신발도 없이 돌밭을 기어갈 필요는 없지. 물건은 내가 가져올 테니, 넌 북두가 묶는 천을 잡아 줘. 네 다리에 감고 있는데 다른 데를 보면 곤란하잖아."
      },
      {
        "node": "ISK_L03_B1_091",
        "profile": null,
        "speaker": null,
        "text": "케이아가 손을 뻗기 전에 병사가 허리를 기울였다. 그의 어깨에서 미끄러지는 밧줄을 잡았다. 바로 그 순간, 천을 붙잡고 있던 손이 비었다. 병사가 있던 자리에 몸이 아래로 빠질 구멍은 없었다. 흙바닥에는 네 사람이 굴러온 자국이 있고, 아직 신지 못한 한쪽 발의 눌린 자국까지 남아 있었다. 그런데 병사만 없었다. 붕대가 사람의 다리 모양으로 잠깐 떠 있다가 풀어져 내려앉았다."
      }
    ],
    "ISK_L03_B1_094": [
      {
        "node": "ISK_L03_B1_094",
        "profile": null,
        "speaker": null,
        "text": "북두의 목소리가 골짜기에 부딪혔다. 대답은 위에서 들렸다. 교대 병사가 도와달라고 외치는 소리였다. 세 사람은 동시에 고개를 들었다. 아무도 없는 허공에 밧줄이 팽팽히 걸려 있었다. 방금까지 병사의 허리에 묶여 있던 끝이었다. 밧줄 아래에는 병사의 그림자가 땅을 짚으려고 팔을 뻗고 있었지만, 그 그림자를 만드는 몸은 보이지 않았다. 케이아가 손을 뻗었다가 허공의 단단한 무언가에 손바닥을 부딪쳤다."
      },
      {
        "node": "ISK_L03_B1_095",
        "profile": "PROFILE_MOND_KAEYA",
        "speaker": "케이아",
        "text": "여기에 닿는 게 있어. 벽처럼 막혔는데 보이지는 않아. 그쪽, 내 목소리 들리지? 밧줄은 잡고 있어. 아무것도 놓지 말고, 네 발밑이 어떤지 말해 줘!"
      },
      {
        "node": "ISK_L03_B1_096",
        "profile": null,
        "speaker": "교대 병사의 목소리",
        "text": "물입니다! 바닥이 없어요. 바로 앞에 사람이 있는데 얼굴이 안 보입니다. 제 앞에 손을 뻗고 있어요. 그 친구 같습니다. 저를 잡으라고……."
      },
      {
        "node": "ISK_L03_B1_097",
        "profile": null,
        "speaker": null,
        "text": "죽었던 병사가 있다고 곧바로 믿지 못했다. 보이지 않는 곳의 목소리가 간신히 숨을 쉬고 있다는 것만 들렸다. 북두는 밧줄을 어깨에 감고 몸을 뒤로 뉘었다. 케이아가 곁의 나무에 줄을 한 번 더 둘렀지만, 줄은 점점 공중으로 빨려 들어갔다. 세 사람이 붙잡고 있는데도 젖은 옷을 입은 사람 하나보다 훨씬 무거웠다. 흙에 남아 있던 그림자의 발목이 사라지기 시작했다."
      },
      {
        "node": "R39_PROSE_ISK_L03_B1_098",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 사람이 네 친구처럼 보여도 지금은 잡지 마! 여기로 돌아와서 얼굴 보고 확인하자. 그 친구 누나가 빌려준 주머니도 아직 여기 있어. 내가 대신 돌려주게 만들지 말고, 네가 와서 받아!"
      }
    ],
    "ISK_L03_B1_099": [
      {
        "node": "ISK_L03_B1_099",
        "profile": null,
        "speaker": null,
        "text": "줄이 한 번 세게 튀었다. 내 귀 바로 안쪽에서 설산에서 들었던 목소리가 되살아났다. 주위의 소리를 덮을 만큼 크지는 않았는데, 북두의 고함보다 더 가까웠다. 처음 들었을 때와 같은 억양이었지만 이번에는 명령이 뒤따랐다. “넌 내꺼야. 그 손을 놓고 와.” 내가 고개를 돌려도 소리가 멀어지지 않았다. 구슬을 감싼 천 아래에서 희미한 빛이 손가락 사이로 새어 나왔다."
      },
      {
        "node": "R39_PROSE_ISK_L03_B1_100",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "또 들려. 설산에서 들었던 목소리야. 내 거라고, 손을 놓고 오라고 해. 누구 손인지도 말 안 해 주고 사람을 물건처럼 부르네. 나는 안 놓을 거야. 방법이 있으면 지금 같이 찾아 줘!"
      }
    ],
    "ISK_L03_B1_101": [
      {
        "node": "ISK_L03_B1_101",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "네가 안 놓겠다면 나도 안 놓아. 대신 혼자 줄 끝에서 버티지는 마. 뒤로 와, 내가 가운데 선다! 케이아, 저 막힌 데를 열 수 있겠어?"
      },
      {
        "node": "ISK_L03_B1_102",
        "profile": "PROFILE_MOND_KAEYA",
        "speaker": "케이아",
        "text": "베어서 풀리는지조차 아직 몰라. 하지만 줄을 끊는 것 말고 시험할 수는 있지. 넌 북두 뒤로 와. 손이 아파서 놓치는 것과 네가 놓기로 하는 건 전혀 다른 일이니까."
      }
    ],
    "ISK_L03_B2_003": [
      {
        "node": "ISK_L03_B2_003",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "다친 사람은 어디 있어? 의례 구역에서 나온 사람이야, 바깥에서 다친 사람이야? 너를 안다는 문제는 내가 혼자 답을 만들 수 없지만, 부상자를 옮기는 일은 지금 할 수 있어."
      },
      {
        "node": "ISK_L03_B2_004",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "바깥에서 수레 일을 하다 다쳤어. 의례 안쪽에 들어간 건 얘 하나고, 우린 밖에서 사람들을 옮겼다. 북쪽 길에는 수레가 밀렸으니 연안으로 빼려고 해. 네 병사들이 작은 나루까지 막고 있다면 그건 지금 풀어줘."
      },
      {
        "node": "ISK_L03_B2_005",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "도시 안으로 몰래 들여보내는 배라면 안 돼. 하지만 바깥 나루에서 환자를 다른 외곽 정박지로 옮기는 건 허가할 수 있어. 선장, 사람을 어디에 내려놓았는지 내 쪽에도 알려 줘. 돌아오지 않았다고 내가 또 수색대를 보내게 만들지는 말고."
      },
      {
        "node": "ISK_L03_B2_006",
        "profile": null,
        "speaker": null,
        "text": "각청은 곁의 병사에게 나루 경계를 부르게 했다. 그녀가 아무렇지 않게 사람을 살릴 일을 정하는 것을 보면서 자꾸만 다른 장면을 떠올렸다. 살아 있는 각청에게 죽어 있던 각청을 설명한다고 해서 그 몸의 무게가 손에서 사라지지는 않았다. 북두가 내 어깨를 쳤다. 오래 붙잡아둘 손이 아니라, 지금 돌아설 방향을 정해 주는 손이었다."
      }
    ],
    "ISK_L03_B2_021": [
      {
        "node": "ISK_L03_B2_021",
        "profile": null,
        "speaker": "남십자 선원",
        "text": "여덟 명 탈 수 있습니다. 짐은 싣지 말아야 합니다. 물통과 기존 비상 식량만 남겼습니다. 노는 네 자루, 돛도 쓸 수 있습니다. 다만 바람이 바뀌면 저 바위 끝을 돌아가는 동안은 많이 흔들릴 겁니다."
      },
      {
        "node": "R39_PROSE_ISK_L03_B2_022",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "북두 배라길래 내가 멀미해도 아무도 못 보는 구석이 있을 줄 알았는데, 여긴 어디서 토해도 전원이 보겠네. 미리 말하는 건데, 내가 난간 붙잡고 있어도 나를 화물로 묶진 마."
      }
    ],
    "ISK_L03_B2_023": [
      {
        "node": "ISK_L03_B2_023",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "네가 물에 뛰어들 것 같으면 묶어야지. 농담할 기운이 남았으면 저 물통부터 가운데로 옮겨. 큰 배는 여기까지 끌고 올 수 없고, 사람 여덟 옮기자고 좁은 나루에 배를 박을 생각도 없어. 작으니까 움직일 수 있는 거다."
      },
      {
        "node": "ISK_L03_B2_024",
        "profile": null,
        "speaker": null,
        "text": "수레꾼은 선원 둘이 천을 함께 들어 옮겼다. 배 가장자리를 잡고 버티다가 물결에 발판이 흔들리자 무릎을 꿇었다. 북두는 웃지 않았다. 서서 균형을 잃는 것보다 훨씬 낫다고 하고, 몸을 조금 더 안쪽으로 옮기게 했다. 짐주인이 마지막으로 빈 수레를 돌아보았다. 나루 경계의 병사는 그 수레가 남았다는 말을 들었지만, 주인 대신 물건을 맡아주겠다는 약속은 하지 않았다."
      },
      {
        "node": "ISK_L03_B2_025",
        "profile": null,
        "speaker": "짐주인",
        "text": "사람은 다 탔어요? 수레는 저쪽 그늘에 세웠습니다. 저거까지 없어지면 난 정말…… 아니, 이제 출발해요. 계속 보면 못 가겠으니까."
      }
    ],
    "ISK_L03_B2_028": [
      {
        "node": "ISK_L03_B2_028",
        "profile": null,
        "speaker": "수레꾼",
        "text": "양말은 제가 벗어드릴 수가 없네요. 누워서 남 고생하는 것만 보자니 그것도 참 못 할 일입니다. 발을 저쪽으로 돌려요. 제 천 끝이라도 덮어두면 바람은 덜 맞겠죠."
      },
      {
        "node": "R39_PROSE_ISK_L03_B2_029",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "넌 아픈 다리 신경 써. 내 발은 젖었다고 성질내는 정도고, 네 다리는 움직일 때마다 너를 혼내잖아. 그래도 천은 좀 빌릴게. 내가 말은 이래도 추운 건 못 참아."
      }
    ],
    "ISK_L03_B2_030": [
      {
        "node": "ISK_L03_B2_030",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "둘 다 남 챙기면서 자기 몫까지 밀어내지는 마. 바위만 돌아가면 잠깐 댈 곳이 있어. 거기서 젖은 걸 바꾸고 천천히 가자. 이 바람이면 어두워지기 전에 충분히 닿아."
      },
      {
        "node": "ISK_L03_B2_031",
        "profile": null,
        "speaker": null,
        "text": "북두가 말을 끝내기 전에 돛이 힘을 잃었다. 바람이 멎은 것처럼 늘어졌는데, 배 옆의 물살은 계속 앞으로 흘렀다. 선원이 노를 넣자 노끝이 비스듬히 당겨졌다. 바다가 깊은 곳으로 내려가는 것이 아니라, 물의 표면 자체가 한쪽으로 접히고 있었다. 배 가운데를 움켜쥐었다. 구슬이 든 주머니가 물살과 반대쪽으로 옷을 잡아당겼다."
      },
      {
        "node": "ISK_L03_B2_032",
        "profile": null,
        "speaker": "남십자 선원",
        "text": "선장, 노가 바닥을 못 잡습니다! 물이 옆으로 빠집니다. 앞쪽도 똑같습니다. 저 바위 그림자가 거꾸로 서 있습니다!"
      },
      {
        "node": "ISK_L03_B2_033",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "돛 내려! 옆구리를 물살에 내주지 말고 뱃머리를 돌려. 가운데 둘은 몸을 낮춰. 물에 손 넣지 마, 노가 빠진 쪽은 힘으로 버티면 팔까지 따라간다!"
      },
      {
        "node": "R39_PROSE_ISK_L03_B2_034",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "구슬도 당겨져. 배가 가는 쪽하고는 반대야. 꺼낼게, 하지만 내가 이걸 들면 배를 돌릴 수 있다는 뜻은 아니야. 북두, 내가 한쪽으로 기울면 잡아 줘!"
      }
    ],
    "ISK_L03_B2_035": [
      {
        "node": "ISK_L03_B2_035",
        "profile": null,
        "speaker": null,
        "text": "구슬은 내 손안에서 희게 흐려졌다. 그 안에 무엇이 생긴 것은 아니었다. 바다 밑의 희미한 빛이 수면을 통과해 구슬 쪽으로 휘어 올라오고 있었다. 선원 한 명이 등불을 들었지만 등불의 불빛은 흔들릴 뿐 빨려 들어가지 않았다. 해저에서 올라오는 가는 빛줄기만 내 손으로 향했다. 북두는 그 모습을 보고도 구슬이 길을 찾아 준다고 말하지 않았다. 그녀가 보는 것은 물살과 배의 방향이었다."
      },
      {
        "node": "ISK_L03_B2_036",
        "profile": null,
        "speaker": null,
        "text": "뱃머리 앞의 바다가 갈라졌다. 물이 절벽처럼 양쪽에 섰고, 그 사이에는 아래로 내려가는 마른 길이 드러났다. 낮은 지붕과 무너진 계단, 아무 글자도 남지 않은 넓은 돌문이 보였다. 배는 그 길로 떨어지지 않았다. 배 밑에만 얇은 물이 남아 길 위로 늘어졌고, 그 위를 배가 천천히 미끄러졌다. 육지의 등불은 이제 높은 벼랑 위 별처럼 머리 위에 걸려 있었다."
      }
    ],
    "ISK_L03_B2_046": [
      {
        "node": "ISK_L03_B2_046",
        "profile": null,
        "speaker": null,
        "text": "돌문 아래를 지날 때 물길이 갑자기 얇아졌다. 배의 뒤가 낮은 턱에 걸리면서 앞이 들렸고, 수레꾼이 깔고 있던 천째 미끄러졌다. 그의 어깨를 붙잡았지만 자신도 같이 넘어질 뻔했다. 짐주인이 두 팔을 뻗어 수레꾼의 허리를 막았다. 그와 동시에 앞쪽 선원이 난간 밖으로 떨어졌다. 허리에 맨 안전줄이 팽팽해지면서 배가 더 기울었다."
      },
      {
        "node": "ISK_L03_B2_047",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "뒤쪽 줄 풀지 마! 오른쪽 둘, 반대편으로 붙어! 떨어진 사람부터 올린다. 앞줄이 바닥 모서리에 걸렸어. 누구도 물벽으로 뛰어들지 마!"
      },
      {
        "node": "ISK_L03_B2_048",
        "profile": null,
        "speaker": null,
        "text": "떨어진 선원은 물속으로 잠기지 않았다. 배 아래에 드러난 낮은 돌턱에 매달린 채 미끄러지고 있었다. 발밑에는 물도 길도 아닌 어두운 틈이 뻗어 있었다. 돌문을 통과한 배는 앞으로 가려 했고, 사람과 연결된 줄은 뒤로 당겼다. 배를 세게 밀면 선원의 허리가 꺾일 수 있었다. 그렇다고 가만히 두면 물길이 마르는 속도를 따라 바닥이 내려앉았다."
      },
      {
        "node": "R39_PROSE_ISK_L03_B2_049",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내 줄을 내려줘. 배에서 뛰지는 않을게. 저 선원이 손 뻗을 수 있는 데까지 밧줄 고리를 내릴게. 지금 줄은 허리를 꺾고 있잖아. 손으로 잡을 걸 하나 더 줘야 해!"
      }
    ],
    "ISK_L03_B2_050": [
      {
        "node": "ISK_L03_B2_050",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "내려갈 생각부터 했으면 멱살을 잡았을 거다. 고리는 줘. 넌 배 안에서 끝을 쥐고, 저쪽 둘과 같이 당겨. 내가 난간에 걸친다. 배를 밀어낼 때까지 원래 줄은 그대로 둬!"
      },
      {
        "node": "ISK_L03_B2_051",
        "profile": null,
        "speaker": null,
        "text": "배 한쪽에 남은 줄을 풀어 고리를 만들었다. 닷새 동안 북두에게 배웠던 매듭은 손이 떨려 한 번 어긋났다. 욕을 삼키고 다시 묶었다. 북두가 그것을 받아 선원의 팔 앞으로 던졌다. 첫 번째에는 물길이 고리를 밀어냈고, 두 번째에는 선원이 손목을 끼웠다. 나와 짐주인, 왼쪽 선원이 함께 줄을 당겼다. 배를 움직이지 않으면서 사람만 옮기는 일은 생각보다 훨씬 무거웠다."
      },
      {
        "node": "ISK_L03_B2_052",
        "profile": null,
        "speaker": "짐주인",
        "text": "당기고 있어요! 더는 안 돼, 내 손이…… 저 사람이 아직 아래에 있어요? 내가 놓으면 떨어져요?"
      },
      {
        "node": "R39_PROSE_ISK_L03_B2_053",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내 손 위에 네 손 올려! 한꺼번에 놓지만 마. 손가락 풀려도 줄을 팔에 감지 말고 몸을 뒤로 빼. 북두가 저쪽에서 잡고 있어. 나만 보고 조금씩 와!"
      }
    ],
    "ISK_L03_B2_054": [
      {
        "node": "ISK_L03_B2_054",
        "profile": null,
        "speaker": null,
        "text": "북두는 난간에 한쪽 발을 걸고 선원의 옷깃을 붙잡았다. 그가 가까스로 배 쪽으로 돌아서자, 뒤쪽 선원이 걸린 안전줄을 돌턱에서 빼냈다. 줄이 풀리며 배가 크게 흔들렸다. 짐주인과 함께 뒤로 나가떨어졌고, 북두는 선원을 가슴 쪽으로 끌어안고 배 안에 굴렀다. 선원은 기침을 하면서도 두 손으로 바닥을 두드렸다. 몸이 돌아온 것을 자기 손으로 확인하는 움직임이었다."
      },
      {
        "node": "ISK_L03_B2_055",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "살아 올라왔으면 숨부터 쉬어. 지금 보고하지 마. 팔은 움직이냐? 발은? 좋아, 저쪽에 누워. 네 자리는 내가 맡는다. 이번에는 누구도 난간 밖으로 몸 내밀지 마."
      }
    ],
    "ISK_L03_B2_060": [
      {
        "node": "ISK_L03_B2_060",
        "profile": null,
        "speaker": null,
        "text": "북두가 바라보자 창문이 닫혔다. 안에서 사람이 닫은 것이 아니라, 창이 있어야 할 벽면이 차츰 평평해지며 구멍을 메웠다. 북두는 잠시 입을 다물었다. 선원들은 그녀가 무엇을 보았는지 알아보려 했지만, 북두는 지금 고개를 돌리면 노가 빠진다고 먼저 경고했다. 그제야 뒤에 있는 선원에게 창이 사라졌다고 말했다. 허세로 아무것도 못 봤다고 하지 않았다."
      },
      {
        "node": "ISK_L03_B2_061",
        "profile": null,
        "speaker": "남십자 선원",
        "text": "선장, 물길 앞에 갈래가 있습니다. 왼쪽은 좁고 물이 계속 흐릅니다. 오른쪽은 넓지만 바닥이 보입니다. 여기서 멈추면 뒤의 물이 따라붙습니다."
      },
      {
        "node": "ISK_L03_B2_062",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "왼쪽으로 간다. 넓어 보여도 배를 띄울 물이 없으면 그게 땅이지 길이냐. 오른쪽에 남은 노 하나만 넣어 깊이를 봐. 배를 기대지는 말고, 끝에서 이상하면 바로 놓아."
      },
      {
        "node": "ISK_L03_B2_063",
        "profile": null,
        "speaker": null,
        "text": "선원은 노끝으로 오른쪽 물을 짚었다. 나무가 물에 닿자 그 부분부터 색이 사라지더니, 칠하지 않은 종이처럼 얇아졌다. 선원이 놓은 노는 소리 없이 길 위로 눕다가 보이지 않게 되었다. 구슬이 더 세게 떨렸다. 내가 천을 벗기자 그 속의 빛은 왼쪽 길을 가리키지 않았다. 사라진 노가 있던 오른쪽으로 당기고 있었다. 구슬이 원하는 방향과 사람들이 탈 수 있는 방향이 달랐다."
      },
      {
        "node": "R39_PROSE_ISK_L03_B2_064",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "오른쪽으로 끌려가. 하지만 저기는 노도 못 버텼어. 이게 반응한다고 우리가 그걸 따라야 하는 건 아니잖아. 북두, 왼쪽으로 가. 나는 이걸 잡고 있을게. 내 몸까지 돌아가면 그때는 내가 소리칠게."
      }
    ],
    "ISK_L03_B2_073": [
      {
        "node": "ISK_L03_B2_073",
        "profile": null,
        "speaker": null,
        "text": "왼쪽 물길의 끝에는 낮은 돌다리가 가로놓여 있었다. 물높이가 낮아지면 충분히 지나갈 수 있었겠지만, 배를 받친 물은 오히려 조금씩 두꺼워지고 있었다. 선원이 돛을 완전히 내렸는데도 돛대 끝은 다리 아래에 걸릴 높이였다. 배를 멈추려 노를 세워 보자 뒤쪽 물이 선미를 눌렀다. 북두는 돛대 밑을 살폈다. 작은 운반선의 돛대는 눕혀 묶을 수 있었지만, 아래의 버팀줄 한 가닥이 젖어 단단히 조여 있었다."
      },
      {
        "node": "ISK_L03_B2_074",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "돛대 눕힌다. 앞의 둘은 받치고, 다친 사람들은 가운데 더 낮게 눕혀. 버팀줄은 잘라. 다시 묶을 줄은 남겨두고, 천천히 내린다. 돛은 살릴 수 있으면 살리되 사람 위로 떨어뜨리지는 마!"
      },
      {
        "node": "R39_PROSE_ISK_L03_B2_075",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내가 뒤쪽을 받칠게. 길게 뻗은 건 힘이 다르게 걸린다고 네가 말했었지? 그러니까 끝을 내 어깨에 바로 올리지는 말고, 낮아지면 손으로 받아볼게. 무거우면 바로 말할 거야."
      }
    ],
    "ISK_L03_B2_076": [
      {
        "node": "ISK_L03_B2_076",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그렇게 해. 못 받겠으면 버텨서 다 같이 다치지 말고 바닥 쪽으로 넘겨. 배에 흠집 하나 더 나는 건 나중에 고치면 돼. 너한테 새 어깨를 달아줄 수는 없잖아."
      },
      {
        "node": "ISK_L03_B2_077",
        "profile": null,
        "speaker": null,
        "text": "밧줄이 끊어지자 돛대가 옆으로 쏠렸다. 두 선원이 무게를 받았고 나는 뒤에서 손을 댔다. 나무가 손바닥의 물기 위로 미끄러지며 피부를 긁었다. 무게를 잃는 순간 곧바로 옆으로 몸을 빼었다. 돛대는 사람 대신 난간에 부딪혔다. 북두가 끝을 잡아 배 가운데로 당겼고, 선원들은 그것을 바닥에 묶었다. 나무가 긁힌 긴 자국이 배의 옆구리에 남았다."
      },
      {
        "node": "ISK_L03_B2_078",
        "profile": null,
        "speaker": null,
        "text": "돌다리 아래를 통과할 때는 모두 고개를 숙였다. 수레꾼의 머리 위를 팔로 가리다가 팔꿈치가 차가운 돌에 스쳤다. 작은 부스러기가 내 목덜미로 떨어졌다. 다리 위에는 발소리가 있었다. 누군가 배와 같은 속도로 걷다가 멈췄다. 북두는 위를 보지 말라고 했다. 지금은 누가 걷는지 확인하려고 몸을 세우는 순간, 눈으로 볼 사람부터 다칠 높이였다."
      },
      {
        "node": "ISK_L03_B2_079",
        "profile": null,
        "speaker": "수레꾼",
        "text": "아까는 누워 있는 게 미안했는데, 이번에는 제 자세가 제일 편하군요. 팔 치워도 됩니다. 여기까지는 안 닿습니다. 위에 누가 있습니까? 걸어가도 되는 데라면 왜 우리는 이 물길로……."
      },
      {
        "node": "R39_PROSE_ISK_L03_B2_080",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "걸어가도 되는 사람인지부터 모르잖아. 나는 오늘 배가 작아서 살 것 같다는 생각을 처음 했어. 나중에 큰 배 타면 꼭 자랑할게. 저 작은 배에서 고개 숙여서 살았다고."
      }
    ],
    "ISK_L03_B2_085": [
      {
        "node": "ISK_L03_B2_085",
        "profile": null,
        "speaker": null,
        "text": "높은 불빛 하나가 아래에서 위로 지워졌다. 불이 꺼지는 모양이 아니었다. 그 불이 서 있던 기둥부터 밤하늘 속으로 밀려 들어가고, 그 곁의 지붕선이 뒤따랐다. 선원 하나가 나루의 밧줄 기둥을 가리켰다. 낮에 배를 붙들어 두었던 바로 그 자리였다. 가리키는 동안 그 기둥도 사라졌다. 나루에 남긴 수레를 찾으려 했지만, 이미 해안선 자체가 보이지 않았다."
      },
      {
        "node": "ISK_L03_B2_086",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "노 멈춰. 저쪽으로 쫓아가지 마. 육지가 달아난다고 배로 따라잡을 수는 없어. 배가 도는지부터 본다. 뒤쪽 등불을 옮겨. 얼굴에 비추지 말고 물결을 봐!"
      },
      {
        "node": "ISK_L03_B2_087",
        "profile": null,
        "speaker": null,
        "text": "선원들이 배의 방향을 바꾸었다. 고개를 돌려도 사라진 나루는 다른 쪽에 나타나지 않았다. 사방의 물은 잔잔했고, 별은 머리 위에 있었지만 물에 비치는 별자리만 서로 맞지 않았다. 북두는 한동안 아무 말도 하지 않았다. 바다를 아는 사람의 침묵이었다. 바다를 모르는 사람이 침묵을 메워 달라고 재촉하면, 그녀가 해야 할 판단까지 서둘러질 것 같아 나도 기다렸다."
      },
      {
        "node": "ISK_L03_B2_088",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "지금 보이는 별로 방향을 정하면 안 되겠다. 저 물에 비친 건 우리가 올려다보는 하늘이 아니야. 닻부터 내려 깊이를 본다. 바닥을 못 찾으면 배끼리 붙들 때 쓰는 줄로 떠밀리는 속도를 볼 거야. 그때까지 모두 가운데 있어."
      },
      {
        "node": "ISK_L03_B2_089",
        "profile": null,
        "speaker": null,
        "text": "작은 닻이 물로 내려갔다. 줄이 끝까지 풀렸는데도 바닥에 닿는 느낌이 없었다. 대신 닻은 배의 반대편 수면에서 떠올랐다. 줄이 배 밑을 한 바퀴 돈 것이 아니었다. 선원이 내려보낸 닻은 오른쪽에 있었고, 똑같은 줄 끝은 왼쪽으로 올라왔다. 북두가 줄을 잡아당기자 양쪽 수면이 동시에 움푹 패였다. 그녀는 더 힘을 주지 않고 닻을 배 안으로 거두었다."
      }
    ],
    "ISK_L03_B2_091": [
      {
        "node": "ISK_L03_B2_091",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그래. 숨기지는 마. 그렇다고 그 돌이 반응할 때까지 아무것도 안 할 생각도 없어. 물과 먹을 것부터 나눠 놓고, 다친 사람 상처를 다시 본다. 바다가 낯설어졌다고 배 안의 일까지 달라지는 건 아니야."
      },
      {
        "node": "ISK_L03_B2_092",
        "profile": null,
        "speaker": null,
        "text": "선원들은 남은 식수를 모았다. 깨진 물통 하나를 빼고 배에 원래 실려 있던 통 두 개가 남아 있었다. 젖은 음식은 따로 걷어내고 마른 비상 식량을 가운데 두었다. 다친 선원은 스스로 상처를 눌렀고, 수레꾼은 손에 닿는 천을 접어 옆 사람에게 건넸다. 짐주인은 돈주머니를 꺼내다 다시 넣었다. 지금 필요한 것을 사줄 상대는 배 밖에 없었다. 대신 물통이 구르지 않게 두 무릎 사이에 끼웠다."
      },
      {
        "node": "ISK_L03_B2_093",
        "profile": null,
        "speaker": null,
        "text": "구슬을 천 위에 올려 보았다. 한쪽 표면에 비친 불빛이 있었다. 다른 곳에서는 사라진 나루의 등불이었다. 배의 등불을 가려도 그 작은 빛은 꺼지지 않았다. 구슬 안쪽에 나루 전체가 들어갔다고 말할 수는 없었다. 나에게 보이는 것은 작고 고정된 빛 하나뿐이었다. 그런데 그 빛을 향해 검은 점이 다가오고 있었다. 배는 멎어 있었지만, 표면에 비친 점은 조금씩 커졌다."
      },
      {
        "node": "R39_PROSE_ISK_L03_B2_094",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "북두, 이거 봐. 나루의 불 같은 게 여기 비쳐. 내 눈만 이상한지 같이 봐 줘. 그리고 저 점, 아까는 없었어. 우리가 움직이지 않는데 가까워지고 있어."
      }
    ],
    "ISK_L03_B2_095": [
      {
        "node": "ISK_L03_B2_095",
        "profile": null,
        "speaker": null,
        "text": "북두가 내 손을 낮추게 했다. 물 위에서도 같은 검은 점이 보였다. 물결 하나 세우지 않고 이쪽으로 오는 형체였다. 돛대도 노도 보이지 않았고, 위에 누가 타고 있는지 알아볼 만큼 가깝지도 않았다. 북두는 다친 선원에게 무기를 맡기지 않았다. 멀쩡한 선원 둘에게 노를 들게 하고, 다른 한 명에게 사람들 앞을 막게 했다. 자신은 뱃머리로 갔다."
      },
      {
        "node": "ISK_L03_B2_096",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "불부터 높여. 다가오는 게 사람이면 우리 얼굴을 보게 하고, 아니라면 우리도 그걸 먼저 봐야지. 너는 구슬을 단단히 챙기고 부상자들 곁에 앉아. 내가 부르기 전까지 물 위로 손 내밀지 마."
      },
      {
        "node": "R39_PROSE_ISK_L03_B2_097",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나는 여기 있을게. 사람은 여덟, 배는 하나. 빠뜨린 사람 없고, 아직 다 같이 있어. 다음에 육지에 내리면 이 숫자부터 말하고 싶어. 그러니까 나 혼자만 살아서 내리게 만들지는 마."
      }
    ],
    "ISK_L04_K1_002": [
      {
        "node": "ISK_L04_K1_002",
        "profile": null,
        "speaker": null,
        "text": "팔을 비틀어 손목을 만졌다. 박동이 있었다. 각청에게서 찾지 못했던 것을 자기 몸에서 찾자 안심과 죄책감이 함께 올라왔다. 손을 떼고 어둠 속으로 귀를 기울였다. 타르탈리아가 움직이는 소리는 들리지 않았다. 조금 전까지 자신을 바라보던 남자의 얼굴은 기억났지만, 그 얼굴이 마지막에 어디로 사라졌는지는 떠오르지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_003",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "여기 사람 있어요. 안쪽 관리 통로로 들어간 사람, 아직 살아 있습니다! 돌부터 막 치우지 말고 위에 들보 걸린 것 좀 봐 줘요. 이거 내려앉으면 대답 못 해요!"
      }
    ],
    "ISK_L04_K1_004": [
      {
        "node": "ISK_L04_K1_004",
        "profile": null,
        "speaker": "호위 병사",
        "text": "들립니다! 목소리 나는 곳을 찾았으니 계속 소리 지르지 마십시오. 바깥에서 받침을 넣겠습니다. 움직일 수 있더라도 몸을 억지로 빼지 마십시오. 어떤 돌이 무게를 받는지 먼저 봐야 합니다!"
      },
      {
        "node": "ISK_L04_K1_005",
        "profile": null,
        "speaker": null,
        "text": "자신을 찾는 목소리가 실제로 돌아왔다. 그제야 자기가 구조를 기다리는 사람이 되었음을 알았다. 돌을 긁는 소리와 나무를 밀어 넣는 소리가 이어졌다. 틈으로 빛이 들어왔을 때 병사는 곧장 팔을 잡아당기지 않았다. 얼굴을 보며 숨을 쉬는지 묻고, 몸이 어디에 걸렸는지 살핀 뒤 다른 이들과 무게를 나누었다."
      }
    ],
    "ISK_L04_K1_021": [
      {
        "node": "ISK_L04_K1_021",
        "profile": null,
        "speaker": "군의관",
        "text": "걸을 수 있는지 확인한 것이 전투를 허락했다는 뜻은 아닙니다. 혼자 달려가시면 도중에 다시 업고 와야 합니다. 병사들과 함께 움직이세요. 쉬는 구간 없이 계속 밀어붙이지 말고, 호흡이 바뀌면 바로 멈추십시오."
      },
      {
        "node": "ISK_L04_K1_022",
        "profile": null,
        "speaker": null,
        "text": "말을 들으며 황금옥을 돌아보았다. 자신이 기억하는 타르탈리아는 싸움을 즐겼다. 그런데 안에서 만난 상대는 마지막 순간까지 무엇이 끝나는지를 기다리는 듯했다. 그 차이가 마음을 잡아당겼지만, 바다 쪽에서는 더 큰 소리가 울렸다. 의문은 살아서 나중에 붙잡아야 했다. 병사가 내민 팔을 붙들었다."
      }
    ],
    "ISK_L04_K1_025": [
      {
        "node": "ISK_L04_K1_025",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "살아 돌아왔네. 황금옥이 무너졌다는 보고가 먼저 와서, 사람을 더 보내려던 참이야. 왜 그렇게 서 있어? 다친 쪽에 힘을 덜 줘. 보고는 앉아서 해도 들려."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_026",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "돌아오면 기다리겠다고 했잖아. 그 약속 지키러 왔는데 시작부터 자세 지적을 받네. 타르탈리아와 싸웠고, 끝낼 수 있을 것 같던 순간 건물이 무너졌어. 나는 병사들이 꺼냈고, 그 사람은 못 찾았대. 시신도 안에선 못 봤어. 바다를 막는 쪽에 나도 보태 줘."
      }
    ],
    "ISK_L04_K1_027": [
      {
        "node": "ISK_L04_K1_027",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "어디에 붙일지는 네 몸 상태부터 보고 정할 거야. 여기서 쓰러지면 널 지키느라 또 사람이 빠져. 싸울 수 있다는 말만 하지 말고, 팔을 들었을 때 어디가 아픈지 말해. 군옥각의 뒤쪽 방어 지점에 인원이 필요해. 버틸 수 있는 곳을 맡겨야 해."
      },
      {
        "node": "ISK_L04_K1_028",
        "profile": null,
        "speaker": null,
        "text": "내가 팔을 천천히 들자 붕대가 당겼다. 각청은 그 범위를 보고 앞으로 칼을 크게 휘두르는 자리 대신 방어선 안쪽을 가리켰다. 부상자를 옮기고, 장치로 이어지는 길을 막는 적을 저지하는 자리였다. 바다의 거대한 몸을 향해 뛰어들 자리는 처음부터 누구도 내주지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_029",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "뒤쪽도 괜찮아. 앞으로 나가야 도와주는 거라는 고집은 황금옥 밑에 놓고 왔어. 대신 위험해지면 말해 줘. 내가 아는 결말 있다고 혼자 버티는 척하지 않게."
      }
    ],
    "ISK_L04_K1_036": [
      {
        "node": "ISK_L04_K1_036",
        "profile": null,
        "speaker": null,
        "text": "류운차풍진군이 고개를 돌렸다. 황금옥에서 깔렸다 나온 몸으로 또 높은 곳에 섰다는 말을 하려는 듯하다가, 다친 어깨와 그 옆에 선 병사를 보고 말을 줄였다. 지금은 잔소리를 듣는 시간도 방어선의 일부였다."
      },
      {
        "node": "ISK_L04_K1_037",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "살아 돌아온 것은 잘했네. 그렇다고 기둥 아래서 버텼다는 이유로 파도 앞에서도 버틸 몸이 되었다고 착각하지 말게. 장치 뒤쪽의 연결로를 지키게. 이 몸이 정면을 돌보는 동안 그곳에 발을 들이는 것들을 막아야 하네."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_038",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알겠습니다. 저기 거대한 머리랑 눈 마주칠 생각은 없어요. 제 몸하고 크기 비교해 보니까 협상할 여지가 없더라고요. 이 길을 지키고, 다친 사람은 안쪽으로 빼겠습니다."
      }
    ],
    "ISK_L04_K1_041": [
      {
        "node": "ISK_L04_K1_041",
        "profile": null,
        "speaker": null,
        "text": "연결로에 밀려들던 적의 마지막 공격이 끊겼다. 뒤로 물러나는 사람을 부축하고 난간 안쪽으로 옮겼다. 길은 지켰다. 그러나 정면에서 들려오는 충격은 잦아들지 않았다. 바다의 형체가 다시 몸을 일으키자 방어 장치 위로 균열이 번졌고, 선인들이 힘을 밀어 넣던 자리가 통째로 흔들렸다."
      },
      {
        "node": "ISK_L04_K1_042",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "뒤쪽 인원부터 내려보내! 장치를 붙들려고 남지 마. 사람 다 나갔는지 먼저 확인해. 너도 그 부상자 데리고 안쪽으로 와!"
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_043",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이 사람 다리에 힘이 안 들어가. 반대쪽 어깨 좀 잡아 줘! 하나씩 옮기면 되니까 밀지 말고, 저기 턱에 발 걸리는 사람 없는지 봐요!"
      }
    ],
    "ISK_L04_K1_044": [
      {
        "node": "ISK_L04_K1_044",
        "profile": null,
        "speaker": null,
        "text": "나와 병사 하나가 부상자를 사이에 두고 옮겼다. 피로해진 팔은 곧 떨렸지만 놓지 않았다. 각청이 다가와 무게를 받아 주자 숨이 터졌다. 전에는 손에 남은 사람을 놓고 도망쳤다. 지금은 누군가가 그 무게를 나누어 들었다. 그것만으로 같은 끝을 피할 수 있는 순간도 있었다."
      },
      {
        "node": "ISK_L04_K1_045",
        "profile": null,
        "speaker": null,
        "text": "응광은 무너진 방어 지점과 바다를 번갈아 보았다. 비서가 남은 대피 인원을 알렸고, 류운차풍진군은 장치를 다시 이어도 오래 버티기 어렵다고 말했다. 응광은 창 안쪽을 한 번 보았다. 급히 챙겨 나온 문서와 물건들이 모여 있었지만 모든 것을 들고 나갈 수는 없었다. 그녀는 더 가져오라는 명령을 내리지 않았다."
      },
      {
        "node": "ISK_L04_K1_046",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "이제 결정할 때네. 군옥각을 포기하겠어. 바다에 떨어뜨려 그 틈을 막을 거야. 남은 사람을 모두 옮겨 줘. 내가 아끼는 것 때문에 누군가 마지막까지 이곳에 남는 일은 없도록."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_047",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "정말 다른 방법이 없는 겁니까? 제가 먼저 말했던 건 알아요. 그런데 여기서 사람들이 움직이고 당신이 지켜 온 걸 직접 보니까, 알고 있었으니 괜찮다는 말은 못 하겠네요."
      }
    ],
    "ISK_L04_K1_048": [
      {
        "node": "ISK_L04_K1_048",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "괜찮을 필요는 없어. 아깝고, 화도 나고, 다시 만들 생각을 하면 벌써 손이 많이 가겠지. 그래도 아래 도시를 남길 수 있다면 내 선택은 분명해. 네가 말했기 때문이 아니라 내가 지금 보고 결정한 거야. 그러니 네 몫까지 내 표정을 살필 시간에 사람을 옮겨."
      },
      {
        "node": "ISK_L04_K1_049",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "이 몸이 길을 열겠네. 소, 남은 자들을 살피게. 칠성의 결정에 맞추어 힘을 모으겠어. 이 건물을 떨어뜨리는 것만으로 끝내서는 안 되니, 닿는 순간까지 빈틈을 남기지 말게."
      },
      {
        "node": "ISK_L04_K1_050",
        "profile": null,
        "speaker": null,
        "text": "선인들이 각자의 자리로 움직였다. 각청은 마지막 명단을 확인하는 사람 곁에서 직접 머릿수를 세었다. 난간에 매달려 있던 천을 걷어 발이 걸리지 않게 한 뒤, 뒤를 돌아보며 따라오는 사람을 재촉했다. 비 새는 천막을 둘이 들어 올리던 일이 떠올랐다. 이번에는 물을 빼는 대신 집을 두고 떠나야 했다."
      }
    ],
    "ISK_L04_K1_057": [
      {
        "node": "ISK_L04_K1_057",
        "profile": null,
        "speaker": null,
        "text": "발판이 기울자 나는 몸을 낮췄다. 균열을 타고 바람이 올라왔다. 소가 마지막으로 주변을 살핀 뒤 남은 이들을 이끌었고, 선인들의 힘이 부서지는 가장자리에서 사람들을 떼어 냈다. 발밑에 있던 군옥각이 멀어졌다. 응광은 마지막까지 바다를 보며 힘을 내렸고, 거대한 건물이 빛을 안은 채 아래로 향했다."
      },
      {
        "node": "ISK_L04_K1_058",
        "profile": null,
        "speaker": null,
        "text": "바다와 하늘 사이가 눈부시게 터졌다. 뒤이어 온 소리는 몸 안쪽을 울렸다. 시선을 돌리지 못했다. 조금 전 차가 놓여 있던 방, 지도가 펼쳐졌던 탁자, 손님에게 비워 주었던 의자가 모두 빛과 물 아래로 사라졌다. 오셀을 향해 모인 힘이 바다를 누르자 솟아 있던 거대한 형체도 그 아래로 가라앉았다."
      }
    ],
    "ISK_L04_K1_062": [
      {
        "node": "ISK_L04_K1_062",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "밥 한 끼 먹을 곳도 남기지 못했으면 오늘 선택은 실패였겠지. 다행히 아래에 도시가 남았네. 너는 먼저 치료를 받아. 손님을 초대해 놓고 식탁에서 쓰러지게 만드는 건 내 취향이 아니야."
      },
      {
        "node": "ISK_L04_K1_063",
        "profile": null,
        "speaker": null,
        "text": "웃으려다가 갈비뼈 근처가 당겨 얼굴을 찡그렸다. 각청이 그 표정을 놓치지 않았다. 그녀는 군의관을 불렀고, 나는 이번에는 바다를 핑계로 일어서지 않았다. 다시 감긴 붕대가 젖어 있었다. 전투가 끝났다는 것은 아픈 곳을 이제 제대로 아파해도 된다는 뜻이기도 했다."
      }
    ],
    "ISK_L04_K1_065": [
      {
        "node": "ISK_L04_K1_065",
        "profile": null,
        "speaker": "군의관",
        "text": "상처가 다시 벌어진 곳은 처치했습니다. 지금 당장 움직여야 할 일은 끝났으니 오늘은 쉬십시오. 밤에 숨이 가빠지거나 의식이 흐려지면 곁의 사람을 부르세요. 내일 상태를 다시 보고 걷는 범위를 늘리겠습니다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_066",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "걷는 범위를 남이 정해 주는 생활에 아주 익숙해지고 있네요. 알겠습니다. 이번에는 도시를 구해야 한다는 핑계도 다 써 버렸으니까, 얌전히 누워 있을게요. 물 좀 가까이 놔 주실 수 있습니까? 자꾸 남을 부르기도 민망해서요."
      }
    ],
    "ISK_L04_K1_069": [
      {
        "node": "ISK_L04_K1_069",
        "profile": null,
        "speaker": null,
        "text": "각청이 찾아왔을 때 나는 침상 가장자리에 앉아 밥을 먹고 있었다. 그녀는 빈 그릇부터 확인하더니 오늘 열리는 길을 설명했다. 기억 이상 때문에 시작된 통제는 한꺼번에 없애지 않았지만, 확인을 마친 구역은 다시 사람을 받기로 했다. 무너진 황금옥 주변과 해안의 위험 구역은 계속 막혔다."
      },
      {
        "node": "ISK_L04_K1_070",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "오늘부터 리월항의 일반 봉쇄를 해제해. 황금옥 잔해와 해안의 파손 구역만 위험 때문에 계속 막아 둘 거야. 멀리 가지 말라는 건 군의관의 지시니까 내가 취소해 줄 수 없고. 사람을 만나고 싶으면 통행 가능한 길로 움직여. 네가 다시 사라졌다는 보고까지 받고 싶지는 않아."
      }
    ],
    "ISK_L04_K1_075": [
      {
        "node": "ISK_L04_K1_075",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "군옥각이 사라졌다고 회의할 자리까지 없어지지는 않았군. 이 몸은 칠성의 판단을 가볍게 보지 않겠네. 허나 이번에 함께 막아 냈다고 해서 바다와 산의 경계를 풀어도 된다는 뜻은 아니야. 인간들이 맡을 일과 이 몸들이 계속 볼 일을 분명히 해 두는 편이 좋겠어."
      },
      {
        "node": "ISK_L04_K1_076",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "필요할 때 도움을 청하는 것과 평소 결정을 전부 맡기는 것은 다르다고 생각합니다. 이번에 직접 힘을 모았으니 다음에는 어떤 소식을 얼마나 빨리 전달해야 할지도 알게 됐어요. 저희가 맡은 곳에서 이상이 생기면 숨기지 않겠습니다."
      },
      {
        "node": "ISK_L04_K1_077",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "선인들과 사람들 사이에 남길 길이 하나 더 생긴 셈이겠죠. 같은 탁자에 앉았다고 모든 생각이 같아질 필요는 없어요. 이번에 서로가 지키려는 것을 직접 보았으니, 다음 대화는 조금 덜 돌아가도 되겠네요."
      }
    ],
    "ISK_L04_K1_080": [
      {
        "node": "ISK_L04_K1_080",
        "profile": null,
        "speaker": null,
        "text": "농담 뒤에는 의례장의 이야기가 남았다. 그 이야기를 끝났다고 덮을 수 없었다. 각청도 응광도 의례에서 모락스가 쓰러지던 순간을 되찾지 못했고, 나는 사람들의 실제 죽음을 기억했다. 도시를 구했다는 큰 결말 옆에 해결되지 않은 작은 시간이 그대로 붙어 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_081",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "바다가 잠잠해진 건 다행인데, 제가 의례에서 본 일은 아직 그대로예요. 각청이 죽었던 것도, 사람들이 한꺼번에 쓰러진 것도요. 지금 살아 있는 사람 앞에서 자꾸 꺼내는 건 미안하지만 없던 일로 넘기지는 말아 주세요. 황금옥에서 만난 타르탈리아도 제가 알던 성격과 달랐습니다."
      }
    ],
    "ISK_L04_K1_082": [
      {
        "node": "ISK_L04_K1_082",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "전투가 끝났다고 조사를 끝낸다는 명령은 내리지 않았어. 다만 살아 있는 사람들에게 네가 본 죽음을 날마다 증명하라고 요구할 수도 없겠지. 지금의 생활은 돌려주고, 남은 문제는 따로 추적할 거야. 네가 본 것을 다시 물어야 할 때는 사람을 보내겠어."
      },
      {
        "node": "ISK_L04_K1_083",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "네 기억을 버릴 필요는 없어. 그렇다고 그 기억 때문에 지금 숨 쉬는 사람을 못 보면 안 된다. 네가 돌아올 자리를 남겨 둔 이유도 그 때문 아니었나."
      }
    ],
    "ISK_L04_K1_090": [
      {
        "node": "ISK_L04_K1_090",
        "profile": null,
        "speaker": null,
        "text": "소의 말을 듣고 각청 쪽을 보았다. 그녀는 고개를 끄덕여 주지 않았다. 이미 오늘의 자신으로 옆에 앉아 있었다. 그 사실을 확인하는 것으로 충분하다고 생각했다. 류운차풍진군은 산과 바다의 경계를 계속 살피겠다고 했고, 응광은 새로운 제보가 닿을 곳을 남겼다. 모두가 답을 알지 못한 채 자기 몫을 끝내고 있었다."
      },
      {
        "node": "ISK_L04_K1_091",
        "profile": null,
        "speaker": null,
        "text": "집무 공간을 나온 뒤 나는 길가의 긴 의자에 잠깐 앉았다. 멀리서 한 남자가 걸어왔다. 단정한 옷차림과 낮은 목소리가 기억 속 모습에 겹쳤다. 종려였다. 알고 있던 이름을 처음 실제로 부르게 되는 순간이었다. 반가운 지인을 대하듯 손을 흔들지 않았다. 자신이 아는 것과 상대와 쌓은 인연은 달랐다."
      },
      {
        "node": "ISK_L04_K1_092",
        "profile": "PROFILE_LIYUE_ZHONGLI",
        "speaker": "종려",
        "text": "부상이 있는데도 오늘 여러 사람을 만났다고 들었네. 나는 왕생당의 객경, 종려라고 하네. 잠깐 함께 앉아도 괜찮겠나? 서서 이야기를 나누는 것보다 자네 다리에도 나을 듯하군."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_093",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "앉으세요. 성함은 알고 있습니다. 처음 뵙는데 안다고 말하는 게 여기 와서는 자꾸 버릇이 됐네요. 어떤 분인지 안다고 생각했다가 몇 번 크게 틀렸으니, 이번에는 직접 이야기부터 듣겠습니다."
      }
    ],
    "ISK_L04_K1_097": [
      {
        "node": "ISK_L04_K1_097",
        "profile": null,
        "speaker": null,
        "text": "종려는 군옥각이 사라진 하늘을 바라보았다. 그 옆얼굴을 보며 직접 물을 말을 골랐다. 제군이라는 호칭을 길 한가운데 던지면 곁을 지나가는 사람들의 이야기도 바뀔 수 있었다. 지금 종려가 시민들에게 어떤 이름으로 서 있는지까지 자신이 결정할 수는 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_098",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "당신에게는 따로 묻고 싶은 게 있어요. 제가 알고 있는 당신의 일하고, 당신이 아직 제게 직접 말하지 않은 일. 여기서 목소리 높여 꺼내지는 않겠습니다. 조용히 이야기할 자리가 있습니까?"
      }
    ],
    "ISK_L04_K1_099": [
      {
        "node": "ISK_L04_K1_099",
        "profile": "PROFILE_LIYUE_ZHONGLI",
        "speaker": "종려",
        "text": "나도 마침 약속된 일을 마무리하러 가는 길이네. 북국은행에서 만나지. 자네가 묻고 싶은 것 가운데 답할 수 있는 것도, 답할 수 없는 것도 있을 걸세. 그 차이는 그곳에서 말해 주겠네."
      },
      {
        "node": "ISK_L04_K1_100",
        "profile": null,
        "speaker": null,
        "text": "왜 처음부터 모든 것을 말하지 않느냐고 따지고 싶었다. 그러나 지금 돌아온 대답은 문이 닫혔다는 말은 아니었다. 종려는 나를 재촉하지 않았고 나는 의자에서 천천히 일어났다. 멀리서 각청의 목소리가 들렸지만 그녀를 부르지는 않았다. 종려의 정체를 누구에게 어떻게 드러낼 것인지까지 자신의 의문에 끌어들일 생각은 없었다."
      }
    ],
    "ISK_L04_K1_102": [
      {
        "node": "ISK_L04_K1_102",
        "profile": "PROFILE_SNEZ_SGN",
        "speaker": "시뇨라",
        "text": "몬드에서 보았던 얼굴이군. 이번에도 손님이 앞을 가로막으려는 건가? 이곳에서 끝낼 일은 정해져 있어. 사적인 불만으로 순서를 늘리지 않았으면 좋겠네."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_103",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "방해하지 않겠습니다. 당신들 사이의 계약을 제가 여기서 뒤집을 수 있다고 생각하지도 않아요. 대신 끝난 뒤에 묻고 싶은 건 묻겠습니다. 지금 저쪽에 아무렇지 않게 서 있는 사람한테도요."
      }
    ],
    "ISK_L04_K1_104": [
      {
        "node": "ISK_L04_K1_104",
        "profile": null,
        "speaker": null,
        "text": "타르탈리아는 그 시선을 받고 눈썹을 올렸다. 낯선 적을 경계하는 것과 자신을 아는 상대를 흥미로워하는 기색이 섞여 있었다. 황금옥에서 보았던, 끝을 기다리는 듯한 눈길과 달랐다. 반사적으로 무기에 손을 댔다가 거두었다. 방해하지 않겠다고 한 말을 자기 손부터 지켜야 했다."
      },
      {
        "node": "ISK_L04_K1_105",
        "profile": "PROFILE_LIYUE_ZHONGLI",
        "speaker": "종려",
        "text": "얼음의 여왕과 맺은 계약에 따라 약속한 것을 이행하겠네. 이것으로 나의 신의 심장은 자네가 받아 전하게 되겠지. 그 대가와 조건 역시 계약에 따라 지켜지기를 바라네."
      },
      {
        "node": "ISK_L04_K1_106",
        "profile": null,
        "speaker": null,
        "text": "종려가 내민 신의 심장을 시뇨라가 받았다. 그 장면을 지켜보았다. 기존 이야기로 알고 있던 모락스와 종려의 관계가 이제 자신의 눈앞에서 행동으로 확인되고 있었다. 그러나 이 은행 안에서 들은 일을 항구 전체가 함께 들은 것은 아니었다. 거리에서는 여전히 각자의 물건 값을 흥정하는 소리가 들렸다."
      },
      {
        "node": "ISK_L04_K1_107",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "결국 나는 바깥에서 한참 뛰고, 마지막 이야기는 두 사람이 다 알고 있었던 거네. 종려 씨, 숨겨 둔 패가 많다는 건 알겠지만 이번에는 설명을 듣고 싶어지는군요. 덕분에 내 쪽 일도 꽤 복잡해졌으니까요."
      },
      {
        "node": "ISK_L04_K1_108",
        "profile": "PROFILE_SNEZ_SGN",
        "speaker": "시뇨라",
        "text": "모든 수를 미리 알렸어야 한다는 조항은 없었을 텐데. 맡은 일이 끝났으면 결과를 봐. 여기서 네 기분을 풀어 주는 것까지 내 역할은 아니니까."
      }
    ],
    "ISK_L04_K1_109": [
      {
        "node": "ISK_L04_K1_109",
        "profile": null,
        "speaker": null,
        "text": "타르탈리아는 불쾌한 듯 웃었다. 상대의 말에 되받아칠 준비를 하는 얼굴, 자신만 모른 일에 짜증을 느끼면서도 대화를 놓치지 않는 반응이었다. 그 모습에 더 불편해졌다. 낯설어서 불편한 것이 아니라 이제야 자신이 기억하던 타르탈리아와 닮아 보였기 때문이다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_110",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "종려 씨, 왜 그런 계약을 맺은 겁니까? 신의 심장을 넘길 만큼 무엇을 받았어요? 리월이 직접 버티는 모습을 보고 싶었다는 설명만으로는, 그 계약의 내용까지 알 수가 없잖아요. 이유하고 대가를 직접 듣고 싶습니다."
      }
    ],
    "ISK_L04_K1_111": [
      {
        "node": "ISK_L04_K1_111",
        "profile": "PROFILE_LIYUE_ZHONGLI",
        "speaker": "종려",
        "text": "그 질문에 모두 답할 수는 없네. 계약에는 비밀을 지켜야 한다는 약속도 포함되어 있어. 무엇을 주고받았는지와 어떤 조건에 합의했는지는 그 약속의 범위 안에 있지. 자네가 위험을 겪었다는 사실을 가볍게 여겨서 말을 아끼는 것은 아니네."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_112",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "위험을 겪은 사람은 밖에서 몸으로 값을 치르고, 값이 어떻게 정해졌는지는 못 듣는다는 게 참 기분 나쁘네요. 약속을 어기라고 억지로 떼쓰지는 않을게요. 그래도 제가 납득했다는 뜻으로 듣지는 마세요."
      }
    ],
    "ISK_L04_K1_120": [
      {
        "node": "ISK_L04_K1_120",
        "profile": null,
        "speaker": null,
        "text": "시뇨라는 받은 물건을 확인하고 몸을 돌렸다. 몬드에서 부하들의 죽음을 부정하던 얼굴을 떠올렸지만, 같은 질문을 소리 높여 반복하지 않았다. 지금 더 직접 확인해야 할 사람이 남아 있었다. 타르탈리아는 내 다친 팔을 살피다가 먼저 말을 걸었다."
      },
      {
        "node": "ISK_L04_K1_121",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "나한테도 할 말이 있다고 했지. 그런데 네 표정은 처음 만난 사람한테 인사하려는 표정이 아니네. 그 상처하고 내가 무슨 관계가 있다고 생각하는 거야?"
      }
    ],
    "ISK_L04_K1_124": [
      {
        "node": "ISK_L04_K1_124",
        "profile": null,
        "speaker": null,
        "text": "내 손이 굳었다. 각청에게 들었던 말이 다른 얼굴에서 돌아왔다. 다만 이번 상대는 죽은 것을 본 사람이 아니라 자신과 싸우다 사라진 사람이었다. 타르탈리아는 상처를 더 잘 보려 몸을 기울이다가 내가 물러서자 멈췄다. 다친 사람을 지금 당장 붙잡고 겨루려 하지는 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_125",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그때 너는 싸움이 즐거워 보이지 않았어. 내 움직임을 보면서 끝나는 순간만 기다리는 것 같았고, 바깥의 네 사람들 얘기에도 관심이 없었어. 그런데 지금은 또 내가 알던 얼굴을 하네. 이걸 네가 기억 못 한다는 말 하나로 넘기라고?"
      }
    ],
    "ISK_L04_K1_126": [
      {
        "node": "ISK_L04_K1_126",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "넘기라고는 안 했어. 나도 누가 내 이름으로 네게 그런 기억을 남겼는지, 내가 무엇을 놓쳤는지 알고 싶으니까. 그렇지만 없는 기억을 있는 척해서 네 설명에 맞출 생각은 없어. 칼로 확인하고 싶다면 상처부터 낫고 와. 지금 네 몸을 건드려서 얻을 답은 별로 없어 보이네."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_127",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "칼로 확인하면 알 수 있는 일이었으면 황금옥에서 끝났겠지. 됐어, 지금 다시 싸울 생각은 없어. 기억나는 게 생기면 숨기지 마. 나도 내가 본 걸 거짓말로 바꿔서 편해질 생각은 없으니까."
      }
    ],
    "ISK_L04_K1_129": [
      {
        "node": "ISK_L04_K1_129",
        "profile": null,
        "speaker": null,
        "text": "은행 밖으로 나오자 햇빛이 눈에 들어왔다. 계단 아래에서 잠깐 멈췄다. 도시를 구한 뒤에는 답이 이어질 줄 알았다. 실제로 손에 남은 것은 더 정확해진 질문들이었다. 모락스의 계획만으로 설명되지 않는 죽음, 살아 돌아온 사람들의 빈 기억, 자신이 알던 사람과 달랐던 상대. 여기 더 오래 서 있으면 답이 나올 것 같지는 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_130",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이나즈마로 가 보자. 다음에 무슨 일이 있는지 안다고 자신할 생각은 없어. 그래도 이 세계가 내가 알던 이야기와 어디서 달라지는지 직접 보려면 계속 움직여야 해. 그쪽의 신을 만날 길도 찾아보고. 이번에는 아는 줄 안다는 말부터 좀 줄이고."
      }
    ],
    "ISK_L04_K1_133": [
      {
        "node": "ISK_L04_K1_133",
        "profile": null,
        "speaker": "군의관",
        "text": "그 일정은 앞으로도 잡지 마십시오. 당분간은 이틀마다 상처를 확인하고, 무거운 짐을 한쪽 어깨에 걸지 마세요. 항해 날짜가 정해지면 그 전에 다시 오십시오. 배 위에서는 여기처럼 바로 손을 볼 수 없으니까요."
      },
      {
        "node": "ISK_L04_K1_134",
        "profile": null,
        "speaker": null,
        "text": "각청을 만날 시간을 잡았다. 그녀는 해안 통행을 확인하러 가는 길에 나를 만났다. 처음처럼 내가 누구인지 묻지 않았다. 오늘 약속한 사람이 어느 자리에 앉아 있는지 알고 찾아왔다. 그 사실을 이번에는 아무 설명 없이 받아들였다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_135",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나, 다음에는 이나즈마로 가려고 해. 배하고 들어갈 방법부터 알아봐야 해서 당장은 여기 있을 거야. 그리고 진한테는 내가 살아 있고 리월의 위기는 일단 막았다고 알려야겠어. 치료받는 중이라는 말도 빼지 말고 보낼 생각이야. 다음 소식이 수색 요청이면 너무 미안하잖아."
      }
    ],
    "ISK_L04_K1_145": [
      {
        "node": "ISK_L04_K1_145",
        "profile": null,
        "speaker": "남십자 선원",
        "text": "신청은 전하겠습니다. 선장님이 목적과 몸 상태를 직접 물으실 겁니다. 이나즈마 쪽 사정도 맞춰 봐야 하니 출발 날짜를 정한 것으로 생각하지는 마십시오. 연락받을 곳은 치료소로 남겨 두면 되겠습니까?"
      },
      {
        "node": "R39_PROSE_ISK_L04_K1_146",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "네. 당분간은 거기서 부르면 됩니다. 돌아갈 곳을 알려 두는 게 생각보다 중요하더라고요. 밥때 아니면 대체로 얌전히 있을 겁니다."
      }
    ],
    "ISK_L04_K1_147": [
      {
        "node": "ISK_L04_K1_147",
        "profile": null,
        "speaker": null,
        "text": "선원은 내 이름과 연락받을 곳을 적고 승선 상담 접수를 마쳤다. 치료소에 돌아온 뒤에는 칠성 쪽의 정산 담당자가 기다리고 있었다. 그는 이번 방어와 위험 전달에 참여한 공적에 대해 지급되는 모라와 모험 경험 자료를 설명했다. 상처가 완전히 나았다는 증명도, 새로운 직위를 주는 절차도 아니었다. 끝낸 일의 몫을 실제로 돌려받는 자리였다."
      },
      {
        "node": "ISK_L04_K1_148",
        "profile": null,
        "speaker": "정산 담당자",
        "text": "지급액은 1,800모라, 영웅의 경험 두 개와 모험가의 경험 세 개입니다. 이번 리월 방어에 참여하고 위험을 전달한 공적에 대한 정산입니다. 물품과 금액을 확인하신 뒤 받아 주십시오."
      }
    ],
    "ISK_L04_K2_003": [
      {
        "node": "ISK_L04_K2_003",
        "profile": null,
        "speaker": "호위 병사",
        "text": "들립니다! 당신이 들어간 길을 기억해 뒀습니다. 막힌 쪽을 확인하고 있으니 계속 움직이지 마십시오. 들보가 어디에 걸렸는지 바깥에서도 보입니다. 받침을 먼저 넣겠습니다!"
      },
      {
        "node": "ISK_L04_K2_004",
        "profile": null,
        "speaker": null,
        "text": "들어간 길을 남겨 둔 일이 자신에게 돌아왔다. 목소리를 따라 고개를 움직였다. 빛이 보이는 틈 너머에 손이 나타났다가 사라졌다. 병사들은 무게를 나누어 받치고 작은 돌부터 옮겼다. 다리에 닿은 압박이 줄었을 때 나는 억지로 당기지 않고 지시를 기다렸다. 누군가 꺼내려는 사람을 스스로 더 깊이 밀어 넣고 싶지는 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_005",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "옆에 붉은 머리 남자는 안 보입니까? 저랑 같이 있었어요. 마지막까지 제 앞에 있었는데… 타르탈리아요. 그 사람이 나왔는지 좀 봐 주세요."
      }
    ],
    "ISK_L04_K2_022": [
      {
        "node": "ISK_L04_K2_022",
        "profile": null,
        "speaker": null,
        "text": "수레 하나가 길을 가로막고 있었다. 사람을 태우려고 짐을 내린 수레였다. 앞쪽에서 누군가 끈을 당기는 병사에게 매듭을 너무 깊게 넣지 말라고 핀잔을 주었다. 걸음을 멈췄다. 닷새 동안 들어 귀에 익었던 목소리였다. 멈추면 안 된다는 것을 알면서도 발이 움직이지 않았다."
      },
      {
        "node": "ISK_L04_K2_023",
        "profile": null,
        "speaker": "짐꾼",
        "text": "다시 풀어야 하는 매듭인데 그렇게 꽉 묶으면 칼로 끊어야 하잖아. 손 이쪽으로 빼고… 거기, 당신 왜 그렇게 보고 있어? 어디 갔다가 그런 꼴로 돌아왔어? 같이 내려오기로 해 놓고."
      },
      {
        "node": "ISK_L04_K2_024",
        "profile": null,
        "speaker": null,
        "text": "살아 있었다. 내가 들어 올리려다 끝내 두고 온 사람이 자기 발로 서서 다른 사람의 일을 도와주고 있었다. 이름을 부를 수 없어서 그대로 앞으로 다가갔다. 짐꾼은 다친 다리를 보고 손을 내밀었다. 그 손을 잡자 내 어깨가 무너졌다. 차가웠던 몸과 따뜻한 손이 같은 사람의 것이었다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_025",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "살아 계셨네요. 나… 당신을 거기 두고 나왔어요. 데리고 가려고 했는데 힘이 안 됐고, 너무 무서워서 도망쳤어요. 돌아와서 찾았는데 어디 있는지도 모르겠고. 지금 이렇게 서 계시면 제가 무슨 말을 해야 할지 모르겠습니다."
      }
    ],
    "ISK_L04_K2_029": [
      {
        "node": "ISK_L04_K2_029",
        "profile": null,
        "speaker": "짐꾼",
        "text": "내가 설명할 수 있었으면 벌써 했겠지. 당신이 나를 두고 도망쳤다고 말하는데, 나는 돌아와서 나를 찾는 사람을 보고 있잖아. 지금 내 앞에 있는 사람부터 봐야지. 둘 다 할 말이 많아 보이는데 바다가 잠잠해진 다음에 해. 당장은 저 수레에 앉을지 말지부터 정하고."
      },
      {
        "node": "ISK_L04_K2_030",
        "profile": null,
        "speaker": null,
        "text": "웃으려다가 울음처럼 숨을 뱉었다. 말을 알아듣기 쉬운 사람이 돌아왔다. 각청에게서 잃었던 닷새가 이 사람에게는 남아 있었다. 모두의 기억이 같은 범위로 사라진 것이 아니라는 차이도 보였지만, 나는 지금 그 손을 단서라고 부르고 싶지 않았다. 살아 있는 사람이 먼저였다."
      }
    ],
    "ISK_L04_K2_033": [
      {
        "node": "ISK_L04_K2_033",
        "profile": null,
        "speaker": null,
        "text": "각청이 보낸 병사가 수색을 마쳤다는 보고를 가지고 다가왔다. 짐꾼을 직접 보았다고 고개를 끄덕이려다, 병사가 말을 기다리는 것을 보고 입을 열었다. 이번에는 찾았다는 소식이 실제로 목적지에 닿아야 했다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_034",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "찾았습니다. 제가 찾던 분이 맞고 지금 살아 계십니다. 각청에게도 그렇게 전해 주세요. 의례 때 기억이 비어 있다는 건 나중에 제가 함께 설명하겠습니다. 우선 이분이 대피하는 길부터 안내해 주세요."
      }
    ],
    "ISK_L04_K2_035": [
      {
        "node": "ISK_L04_K2_035",
        "profile": null,
        "speaker": null,
        "text": "병사는 대피 조에 짐꾼을 인계하고 발견 소식을 각청에게 전했다. 짐꾼은 수레 옆에서 마지막 끈을 정리한 뒤 다른 사람들과 출발했다. 그가 걸어가는 뒷모습을 오래 보지 않았다. 이번에는 어디로 가는지 알고 있었고, 다시 만날 일을 남겨 두었다."
      },
      {
        "node": "ISK_L04_K2_036",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 사람을 찾았다는 보고를 받았어. 다행이네. 네가 직접 확인했으니 이제 수색 인원도 대피 쪽에 붙일 수 있어. 네 상태는 군의관에게 들었어. 정면에서 뛰어다닐 생각이면 돌려보낼 거야."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_037",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "정면으로 뛰어갈 기운은 없어. 하지만 길 하나라도 지킬 수 있으면 맡겨 줘. 그분 찾았다고 나만 안심하고 앉아 있기에는 저 바다가 아직 너무 시끄럽잖아. 짐을 들어 옮길 때 한쪽 손이라도 더 있으면 다르다는 건 배웠어."
      }
    ],
    "ISK_L04_K2_041": [
      {
        "node": "ISK_L04_K2_041",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "황금옥에서 살아 나온 손님이 돌아왔군. 지금은 앉을 의자를 내줄 수 없어. 네가 경고한 덕분에 옮긴 사람이 있지만, 아직 이곳을 비울 만큼 시간을 벌지는 못했어. 뒤쪽 길을 부탁할게."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_042",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "의자는 나중에 빌리겠습니다. 먼저 말씀드리면 짐꾼을 찾았어요. 살아 있고 대피 중입니다. 그 일까지 놓지 않고 사람 붙여 주신 거, 잊지 않을게요. 그러니까 남은 사람도 다 내보내고 나서 당신 집 얘기를 합시다."
      }
    ],
    "ISK_L04_K2_043": [
      {
        "node": "ISK_L04_K2_043",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "기쁜 소식 하나는 가져왔네. 그렇다고 지금 마음이 가벼워져서 다친 몸을 잊지는 마. 선인들이 공격을 받아 내는 동안에도 뒤로 들어오는 적은 있을 거야. 네가 선 곳을 비우지 않는 것이 지금 가장 필요한 도움이야."
      },
      {
        "node": "ISK_L04_K2_044",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "이 몸이 바다를 막는 사이 연결 장치에 손을 대려는 것들이 있네. 장치를 살피겠다고 함부로 선 밖으로 나가지 말게. 선인들이 나누어 받는 힘도 빈 곳까지 저절로 채우지는 못해."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_045",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알겠습니다. 제 자리 지키고, 옆에 있는 사람하고 맞춰 움직이겠습니다. 오늘은 혼자 더 많이 들겠다고 고집부리는 사람이 제일 먼저 지치는 날인 것 같네요. 저도 조금은 배웠어요."
      }
    ],
    "ISK_L04_K2_048": [
      {
        "node": "ISK_L04_K2_048",
        "profile": null,
        "speaker": null,
        "text": "연결 지점을 향하던 적의 움직임이 마침내 꺾였다. 후퇴하는 적을 쫓지 않고 비틀거리는 병사의 팔을 잡았다. 뒤쪽으로 통하는 길은 남았다. 그러나 바다의 힘이 다시 장치를 덮치자 선인들이 펼친 방어가 크게 휘었고, 건물 아래로 떨어진 파편이 돌아오지 않는 깊이까지 내려갔다."
      },
      {
        "node": "ISK_L04_K2_049",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "연결부가 더 버티지 못하겠네. 이 몸이 힘을 받아 낼 테니 안쪽 인원부터 물리게. 장치를 붙잡으려고 남으면 구해야 할 사람만 늘어나네!"
      },
      {
        "node": "ISK_L04_K2_050",
        "profile": null,
        "speaker": null,
        "text": "응광은 남은 대피 인원과 손상된 지점을 빠르게 확인했다. 각청은 병사들의 퇴로를 열고, 소는 무너지는 가장자리로 밀려난 사람들을 안쪽으로 돌렸다. 비서가 들고 가려던 상자에 시선을 두었다. 큰 상자는 두 사람이 들어야 했다. 그 곁에 서지 못하는 부상자가 있었다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_051",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "상자는 여기 놔요. 저 사람 먼저 옮깁시다. 두 사람이 들 수 있으면 상자도 사람도 들 수 있지만, 지금은 한 번에 하나밖에 못 가잖아요. 돌아올 시간이 있으면 그때 보고요. 어깨 이쪽으로 잡아 주세요."
      }
    ],
    "ISK_L04_K2_052": [
      {
        "node": "ISK_L04_K2_052",
        "profile": null,
        "speaker": null,
        "text": "비서는 상자를 내려놓았다. 나와 함께 부상자의 팔을 나누어 받았다. 다친 다리가 당겼지만 옆 사람이 속도를 맞췄다. 의례장에서 짐꾼을 혼자 들어 올리려다 실패한 팔이었다. 이번에는 혼자가 아니었고, 들어야 할 사람도 숨을 쉬며 발을 움직이려 애썼다. 그 숨소리에 보폭을 맞췄다."
      },
      {
        "node": "ISK_L04_K2_053",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "군옥각을 포기하겠어. 남은 힘을 모아 바다로 떨어뜨릴 거야. 사람은 모두 옮겨. 가져갈 수 없는 물건은 두고 가고. 여기 남는 것은 내가 책임질 손해니까, 누구도 그것 때문에 목숨을 걸 필요는 없어."
      }
    ],
    "ISK_L04_K2_063": [
      {
        "node": "ISK_L04_K2_063",
        "profile": null,
        "speaker": null,
        "text": "소가 남은 사람들의 위치를 확인하고 선인들이 빠져나갈 길을 붙들었다. 바닥이 기울면서 발이 미끄러졌지만 옆의 손이 나를 잡았다. 그 손을 놓지 않고 건물에서 멀어졌다. 응광이 힘을 내려 보내는 순간 군옥각은 도시를 받치던 높이를 버리고 바다를 향해 떨어졌다."
      },
      {
        "node": "ISK_L04_K2_064",
        "profile": null,
        "speaker": null,
        "text": "거대한 충격이 하늘과 물을 갈랐다. 눈을 감지 못했다. 조금 전까지 사람을 들고 나오던 문과, 그 뒤에 두고 온 상자와, 손님을 위해 비워졌던 의자가 하나의 빛 속으로 사라졌다. 바다의 형체는 선인들과 군옥각이 모은 힘 아래로 밀려났다. 오래 도시를 위협하던 울림이 마침내 잦아들었다."
      }
    ],
    "ISK_L04_K2_074": [
      {
        "node": "ISK_L04_K2_074",
        "profile": null,
        "speaker": "짐꾼",
        "text": "누운 사람 깨워 놓고 나 쉬겠다고 할 수는 없잖아. 군의관이 그냥 앉아 있다 가도 된다고 하더라고. 당신이 먼저 찾아오겠다더니 몸을 그 꼴로 만들어 놓아서 내가 왔지. 내려오면 이야기하자던 약속은 지켜야 하니까."
      },
      {
        "node": "ISK_L04_K2_075",
        "profile": null,
        "speaker": null,
        "text": "두 사람은 한동안 마주 보고 있었다. 짐꾼이 살아 있는지 다시 손목을 확인하지 않았다. 잠에서 깬 사람이 뻣뻣해진 허리를 펴고 물을 찾는 모습을 보았다. 닷새 동안 너무 흔해서 흘려보냈던 행동들이 전부 선명했다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_076",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "제대로 말할게요. 의례에서 사람들이 한꺼번에 죽었어요. 당신 숨도 맥박도 없었고, 제가 들어 올리려다 못 했어요. 저는 그걸 기억하는데 당신은 그 뒤를 기억 못 한다고 하셨죠. 그러니까 지금 당신이 잘못 기억한다고 몰아붙이려고 하는 말은 아니에요. 제가 왜 그렇게 굴었는지 알아 주셨으면 해서요."
      }
    ],
    "ISK_L04_K2_077": [
      {
        "node": "ISK_L04_K2_077",
        "profile": null,
        "speaker": "짐꾼",
        "text": "그 말을 들으니 당신 얼굴은 이해가 되네. 나는 내가 그렇게 됐다는 감각이 없어. 알고 있다고 거짓말해 줄 수도 없겠지. 그래도 당신이 찾으러 돌아왔다는 건 알아. 당신이 나를 두고 왔다고 자신을 계속 붙들면, 지금 찾아온 나는 어디에 서 있어야 하겠어?"
      },
      {
        "node": "ISK_L04_K2_078",
        "profile": null,
        "speaker": null,
        "text": "시선을 내렸다가 다시 들었다. 죽음을 기억하는 사람만 대화의 중심에 두면 살아 돌아온 사람이 자기 이야기를 할 자리가 없었다. 짐꾼에게도 모르는 시간이 있었다. 그러나 그 앞뒤로 살아온 사람이 통째로 빈 것은 아니었다."
      }
    ],
    "ISK_L04_K2_085": [
      {
        "node": "ISK_L04_K2_085",
        "profile": null,
        "speaker": null,
        "text": "잠시 뒤 짐꾼은 종이에 자기 이름과 찾을 수 있는 작업 구역을 적어 주었다. 말을 나누다 엇갈리더라도 누가 어디를 찾아가면 되는지 남겨 두자는 뜻이었다. 종이를 받아 이름을 읽고서 짐꾼의 얼굴을 다시 보았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_086",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이름하고 찾을 곳을 적어 주셔서 고맙습니다. 제 이름과 지금 머무는 곳도 같이 적어 드릴게요. 몸 좀 나아지면 포대 확인하러 같이 가요. 제가 주인인 척 나서지는 않을 테니까, 이번에는 끝나는 것까지 옆에서 볼게요."
      }
    ],
    "ISK_L04_K2_089": [
      {
        "node": "ISK_L04_K2_089",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "리월항의 일반 봉쇄는 오늘 해제해. 황금옥 잔해와 해안 파손 구역은 위험해서 계속 막아 두지만, 물자 대기 구역과 시내의 통행은 다시 연다. 너희가 기다리던 포대도 상대와 검수 인원을 불러 확인할 거야. 이번에는 기억에만 맡겨 설명하지 않고 실제 물건을 함께 볼 수 있어."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_090",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "좋아. 지난번에 내가 본 건 끈이 풀린 것까지였고, 안에 뭐가 있었는지는 못 봤어. 그건 그대로 말할게. 오늘은 오늘 확인한 것만 보면 되는 거지. 끝까지 같이라고 해 놓고 중간에 또 쓰러지면 안 되니까 천천히 걸어갈게."
      }
    ],
    "ISK_L04_K2_099": [
      {
        "node": "ISK_L04_K2_099",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "잘 전해 줬어. 도시를 지킨 뒤 남겨야 할 것은 거대한 승리 이야기만이 아니니까. 그 사람이 자기 일을 끝낸 것도 오늘의 결과겠지. 다만 기억의 빈칸은 계속 남아 있군. 네가 본 것과 그 사람이 기억하는 것을 나누어 확인해 두겠어."
      },
      {
        "node": "ISK_L04_K2_100",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "산에서 자네가 그 사람을 두고 왔다며 괴로워하던 모습을 기억하네. 다시 만났으니 이 몸도 다행이라 생각해. 그러나 기뻐할 일과 설명할 일을 한데 섞어 억지 답을 만들지는 말게. 살아 있는 사람은 살아 있는 대로 만나고, 남은 이상은 계속 살필 일이야."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_101",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이제는 조금 알겠습니다. 처음에는 살아 있는 사람만 보면 어떻게 살아 있냐고 붙들었는데, 그분이 그러더라고요. 그렇게만 묻고 있으면 지금 찾아온 자기는 어디 서 있느냐고. 그 말 듣고 좀 부끄러웠어요. 모르는 걸 남한테 대답하라고 밀어붙이고 있었더라고요."
      }
    ],
    "ISK_L04_K2_102": [
      {
        "node": "ISK_L04_K2_102",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그래서 지금 할 수 있는 일을 다시 정하는 거야. 선인들께 도움받은 바다의 경계도 계속할 거고, 사람들의 통행과 생활은 저희가 돌려놓을 거예요. 이 도시가 앞으로 누구의 손으로 움직일지 보여 주는 건 큰 선언보다 매일 그 일을 끝내는 쪽이겠죠."
      },
      {
        "node": "ISK_L04_K2_103",
        "profile": "PROFILE_LIYUE_XIANYUN",
        "speaker": "류운차풍진군",
        "text": "자네의 뜻은 들었네. 인간들이 스스로 하겠다는 말만 하고 남은 일은 선인들이 알아서 하길 바란다면 이 몸이 가만있지는 않았을 것이야. 이번에는 직접 지키고 직접 내놓는 것을 보았지. 서로 확인할 길을 남겨 두는 편이 낫겠군."
      },
      {
        "node": "ISK_L04_K2_104",
        "profile": "PROFILE_LIYUE_NINGGUANG",
        "speaker": "응광",
        "text": "연락할 길은 열어 둘게요. 군옥각을 잃었다고 리월의 결정까지 공중에 매달려 사라진 것은 아니니까요. 필요한 도움을 청하는 일에도 책임이 따르겠죠. 무엇이 부족한지 먼저 아는 쪽이 분명하게 알려 주도록 하죠."
      },
      {
        "node": "ISK_L04_K2_105",
        "profile": null,
        "speaker": null,
        "text": "지도 위에 놓인 손들을 보았다. 이전에는 누가 더 오래 이 도시를 지켰는지, 누가 지금 책임지는지로 팽팽해지던 자리였다. 오늘은 같은 문제를 서로 다른 자리에서 계속 맡기로 정하고 있었다. 생각이 같아진 것이 아니라 상대에게 넘길 때 무엇을 말해야 하는지 조금 더 알게 된 것이다."
      }
    ],
    "ISK_L04_K2_108": [
      {
        "node": "ISK_L04_K2_108",
        "profile": null,
        "speaker": null,
        "text": "그 잔소리를 다시 들을 수 있다는 사실이 나에게는 위로였다. 소는 문밖에서 시선을 돌려 나를 보았다. 길게 말하지 않았지만 황금옥으로 가기 전 돌아올 길을 보라고 했던 사람이었다. 이번에는 고개를 숙여 인사했다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_109",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그때 돌아올 길 보라고 하신 말씀, 도움이 됐습니다. 관리 통로로 들어간 걸 병사들에게 남겼고, 그 길을 기억해서 저를 찾았대요. 제가 혼자 잘해서 나온 건 아니었습니다."
      }
    ],
    "ISK_L04_K2_110": [
      {
        "node": "ISK_L04_K2_110",
        "profile": "PROFILE_LIYUE_XIAO",
        "speaker": "소",
        "text": "살아 돌아왔으면 됐어. 다음에도 길을 남겨. 네가 찾는 사람만 있는 게 아니라 너를 찾는 사람도 생겼으니까."
      },
      {
        "node": "ISK_L04_K2_111",
        "profile": null,
        "speaker": null,
        "text": "면담이 끝난 뒤 임시 집무 공간을 나서자 종려가 길가에서 기다리고 있었다. 그의 얼굴을 알아보았지만 다가가며 오래된 친구처럼 부르지는 않았다. 이 세계에서 실제로 소개를 받는 것은 처음이었다. 류운차풍진군은 두 사람을 잠깐 보고 먼저 다른 선인들과 이동했다. 옛 인연을 설명하는 말은 남기지 않았다."
      },
      {
        "node": "ISK_L04_K2_112",
        "profile": "PROFILE_LIYUE_ZHONGLI",
        "speaker": "종려",
        "text": "나는 왕생당의 객경, 종려라고 하네. 자네가 리월에서 겪은 일이 적지 않다고 들었어. 몸이 괜찮다면 잠깐 이야기를 나누고 싶군. 다리가 불편하면 앉을 곳부터 찾지."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_113",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "종려 씨. 성함은 알고 있습니다. 대체 어디부터 물어야 할지 모르겠는 사람을 이렇게 길가에서 만나니까 이상하네요. 우선 앉고 싶다는 데는 동의합니다. 요즘은 사람 말보다 의자가 먼저 반가울 때가 있어서요."
      }
    ],
    "ISK_L04_K2_120": [
      {
        "node": "ISK_L04_K2_120",
        "profile": "PROFILE_LIYUE_ZHONGLI",
        "speaker": "종려",
        "text": "자네가 겪었다는 그 죽음과 기억의 빈자리를 내가 계획한 시험의 결과라고 말해 줄 수는 없네. 내가 설명할 수 있는 계획이 있다는 이유로 그 밖의 모든 현상을 거기에 넣어서는 안 되지. 자네가 본 일은 그 자체로 살펴야 할 일이네."
      },
      {
        "node": "ISK_L04_K2_121",
        "profile": null,
        "speaker": null,
        "text": "잔을 내려놓았다. 모든 일이 하나의 손에서 나왔다고 들으면 미워할 사람을 정하기는 쉬웠을 것이다. 그러나 그 대답은 내가 알고 있는 이야기와 현재 벌어진 일 사이에 다시 경계를 그었다. 답답했지만 없는 다리를 밟고 건너가는 것보다는 나았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_122",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 남은 질문은 계약 쪽이겠네요. 저도 알아낸 척 지친 사람처럼 굴기 싫으니까, 물을 수 있는 자리에서 직접 묻고 싶습니다. 당신이 가는 곳에 함께 가도 됩니까?"
      }
    ],
    "ISK_L04_K2_131": [
      {
        "node": "ISK_L04_K2_131",
        "profile": "PROFILE_SNEZ_SGN",
        "speaker": "시뇨라",
        "text": "몬드에 두고 왔다고 생각한 방해꾼이 리월에도 와 있었군. 그 팔은 또 어디서 성급하게 나서다 얻은 상처지? 이곳의 일까지 길게 만들 생각이면 미리 말해 두겠어. 참아 줄 생각은 없으니까."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_132",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "방해하지 않겠습니다. 계약을 마무리하는 자리에 주먹부터 들이밀러 온 건 아니에요. 다만 그 계약 때문에 제가 묻고 싶은 일이 있고, 저 사람한테도 할 말이 있습니다. 당신들이 끝내면 제 차례도 좀 남겨 주세요."
      }
    ],
    "ISK_L04_K2_133": [
      {
        "node": "ISK_L04_K2_133",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "나한테? 시뇨라한테 한 소리 듣고도 눈은 계속 이쪽을 보고 있네. 어느 쪽 일로 나를 찾았는지 궁금한데, 종려 씨의 거래부터 끝내는 편이 좋겠군요. 나도 그 설명을 기다리던 중이라서요."
      },
      {
        "node": "ISK_L04_K2_134",
        "profile": null,
        "speaker": null,
        "text": "그 말투에 나는 눈을 가늘게 떴다. 기분이 좋지 않아도 상대와 한 번 부딪쳐 보고 싶어 하는 온도가 있었다. 황금옥에서는 같은 입가의 웃음이 비어 보였다. 지금의 차이가 더 선명해질수록 나는 그곳에서 무엇과 마주했는지 설명하기 어려워졌다. 알아냈다는 말을 입 밖으로 내지 않았다."
      },
      {
        "node": "ISK_L04_K2_135",
        "profile": "PROFILE_LIYUE_ZHONGLI",
        "speaker": "종려",
        "text": "얼음의 여왕과 맺은 계약에 따라 나의 신의 심장을 넘기겠네. 시뇨라, 자네가 받아 전하게. 약속한 대가와 조건도 그대로 지켜져야 하겠지. 이것으로 이번 교환은 이행되는 셈이네."
      },
      {
        "node": "ISK_L04_K2_136",
        "profile": null,
        "speaker": null,
        "text": "시뇨라가 내밀어진 신의 심장을 받았다. 움직이지 않았다. 종려가 모락스라는 사실은 기존 이야기에서 알고 있었지만, 지금 눈앞에서 그 힘의 상징이 다른 손으로 넘어가는 일은 처음 보는 현실이었다. 이 방에 있는 사람들과 거리의 시민들은 같은 정보를 가진 상태가 아니었다. 문밖을 향해 누구의 이름도 외치지 않았다."
      },
      {
        "node": "ISK_L04_K2_137",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "나는 내 방식대로 움직이고 있다고 생각했는데, 뒤에서는 이미 합의가 되어 있었던 거군요. 재미있는 판이었다고만 하고 넘기기에는 손에 남는 게 너무 적네요. 적어도 언제부터 어디까지 알고 있었는지는 들을 수 있겠죠?"
      }
    ],
    "ISK_L04_K2_138": [
      {
        "node": "ISK_L04_K2_138",
        "profile": "PROFILE_SNEZ_SGN",
        "speaker": "시뇨라",
        "text": "네가 알아야 할 만큼을 알았고, 이제 결과도 보았잖아. 모든 사람에게 모든 설명을 돌리는 것은 계약의 조건이 아니야. 불만을 말하는 것으로 거래가 바뀌지도 않고."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_139",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 불만은 저도 있어요. 종려 씨, 왜 그 계약을 맺은 겁니까? 신의 심장을 건네줄 만큼 받은 게 무엇이고, 구체적으로 어떤 조건이었어요? 제가 아는 이야기로 대신 대답하지 말고 이번에는 당신에게 직접 듣고 싶습니다."
      }
    ],
    "ISK_L04_K2_143": [
      {
        "node": "ISK_L04_K2_143",
        "profile": null,
        "speaker": null,
        "text": "감사하다는 말은 대답을 대신하지 못했다. 그래도 종려는 둘을 같은 것으로 넘기려 하지 않았다. 손을 풀었다. 원하는 답을 못 들었다는 이유로 신의 심장을 빼앗으려 달려들 생각은 없었다. 지금 자신의 질문에 남은 다른 빈칸을 돌아볼 차례였다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_144",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "타르탈리아, 황금옥에서 있었던 일은 기억해? 나하고 싸웠고, 네가 밀리다가 바닥이 무너졌어. 내가 밖의 사람들한테 물러서라고 외쳤는데 너는 먼지 속으로 사라졌지. 나는 깔렸다가 병사들이 꺼냈고. 그 중에 기억나는 게 있어?"
      }
    ],
    "ISK_L04_K2_145": [
      {
        "node": "ISK_L04_K2_145",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "네가 황금옥에서 나와 싸웠다고? 그건 처음 듣는 이야기야. 그 무렵의 일이 끊겨 있는 건 나도 알아. 하지만 너와 싸운 장면은 기억나지 않아. 내가 패색을 보였다는 말까지 붙으니 더 직접 확인하고 싶어지는군. 다친 몸을 지금 상대하겠다는 뜻은 아니고."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_146",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그때는 내가 찾는 짐꾼 얘기를 해도 아무 관심이 없었어. 부하들이 안에 남아 있을지 모른다고 했을 때도 그랬고. 싸움을 즐기는 게 아니라 내가 어디까지 오는지만 기다리는 것 같았다고. 지금 너는 그때하고 느낌이 달라. 본인도 모른다는 거야?"
      }
    ],
    "ISK_L04_K2_147": [
      {
        "node": "ISK_L04_K2_147",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "없는 기억을 꾸며서 맞장구쳐 줄 수는 없지. 네가 묘사하는 내가 좀 기분 나쁜 상대라는 건 알겠어. 누군가 내 일에 손을 댄 건지, 내가 놓친 게 있는지부터 알아봐야겠군. 그렇지만 네 말만 듣고 어느 쪽이라고 결정할 생각도 없어."
      },
      {
        "node": "ISK_L04_K2_148",
        "profile": null,
        "speaker": null,
        "text": "그가 대답할 때 눈을 피하지 않는 것을 보았다. 솔직해서 그렇다고 확신할 수는 없었다. 그러나 기억이 없다는 사람에게 기억하라고 소리친다고 답이 생기지 않는다는 것은 이미 배웠다. 짐꾼 앞에서 들었던 말을 적 앞에서도 적용해야 한다는 사실이 썩 반갑지는 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_149",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "좋아. 네가 기억 못 한다는 말은 들었어. 그렇다고 내가 거기서 겪은 일이 사라지지는 않아. 다시 기억나는 게 있으면 사람 보내. 나도 내 판단이 틀린 부분이 드러나면 그건 말하겠지만, 본 걸 안 봤다고 바꾸지는 않을 거야."
      }
    ],
    "ISK_L04_K2_150": [
      {
        "node": "ISK_L04_K2_150",
        "profile": "PROFILE_LIYUE_TARTAGLIA",
        "speaker": "타르탈리아",
        "text": "그 정도면 이야기할 여지는 있네. 서로 좋은 감정으로 시작한 사이는 아닌 모양이지만, 알아야 할 일이 있다는 데는 동의해. 다 낫고 나면 너와 직접 겨뤄 보고 싶다는 말도 남겨 둘게. 잊은 싸움으로만 내 실력을 평가받는 건 재미없으니까."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_151",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "환자 앞에서 재경기 예약부터 잡는 건 역시 만만치 않네. 지금은 예약 안 받을게. 나는 아직 멀쩡한 다리로 밥집까지 가는 게 다음 목표거든. 그 정도는 먼저 하게 놔둬."
      }
    ],
    "ISK_L04_K2_153": [
      {
        "node": "ISK_L04_K2_153",
        "profile": null,
        "speaker": null,
        "text": "북국은행을 나와 나는 사람들 사이에 섞여 천천히 걸었다. 리월에는 아직 확인할 곳이 있었고, 이제 누구에게 소식을 남겨야 할지도 알았다. 그러나 이곳에서 같은 질문을 반복한다고 모든 답이 열릴 것 같지는 않았다. 자신이 아는 이야기와 실제로 벌어진 일의 차이는 한 도시에서 시작해 한 도시에서 끝나는 것처럼 보이지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_154",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "다음에는 이나즈마로 가야겠어. 거기까지 가면 답이 나온다고 장담할 수는 없지만, 신을 만나 물을 길도 더 찾아봐야지. 리월에서 본 일만 붙들고 세상이 전부 이럴 거라고 정할 수는 없잖아. 이번에는 가기 전에 사람들한테 어디로 가는지도 남기고."
      }
    ],
    "ISK_L04_K2_160": [
      {
        "node": "ISK_L04_K2_160",
        "profile": null,
        "speaker": "짐꾼",
        "text": "갈 곳을 정했구나. 여기서 알아낸 게 다 끝났다는 얼굴은 아니네. 그래도 계속 붙잡고 있을 이유만 찾다 보면 평생 짐을 못 내릴 수도 있지. 내가 줄 만한 대단한 물건은 없어. 대신 배에 가져갈 짐은 한쪽으로 쏠리지 않게 싸. 그 어깨로 아직 욕심내지 말고."
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_161",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알겠습니다. 대단한 물건보다 그 말이 저한테는 더 필요한 것 같네요. 저는 모르는 거 묻겠다고 나가서 자꾸 몸부터 망가뜨려 오니까요. 당신도 다음 일 시작하기 전에 쉬세요. 허리 아픈 사람 둘이 서로 걱정하는 모양새가 됐네."
      }
    ],
    "ISK_L04_K2_162": [
      {
        "node": "ISK_L04_K2_162",
        "profile": null,
        "speaker": null,
        "text": "짐꾼은 웃으며 어깨를 한 번 두드리려다 다친 곳을 보고 손을 거두었다. 대신 내 멀쩡한 쪽 팔을 가볍게 잡았다. 서로가 살아 돌아온 이유는 알지 못했다. 그러나 누가 먼저 찾았는지, 다음에는 어디서 부르면 되는지는 알고 있었다. 그 정도를 가진 채 헤어지는 것도 가능한 일이었다."
      },
      {
        "node": "ISK_L04_K2_163",
        "profile": null,
        "speaker": null,
        "text": "각청은 남십자 함대가 이나즈마 방면 항해를 상의할 수 있는 창구를 알려 주었다. 북두와 실제 인연이 없다는 것을 굳이 숨기지 않았다. 소개받은 곳에서 처음부터 목적과 몸 상태를 말할 생각이었다. 먼저 몬드에도 현재 소식을 남겨 두기로 했다."
      }
    ],
    "ISK_L04_K2_171": [
      {
        "node": "ISK_L04_K2_171",
        "profile": null,
        "speaker": "남십자 선원",
        "text": "뜻은 선장님께 전달하겠습니다. 다만 배에 자리가 있는 것과 이나즈마에 들어갈 수 있는 것은 별개입니다. 그쪽 상황과 항해 일정까지 맞아야 하니 당장 출발을 약속할 수는 없습니다. 만나 뵐 일정이 정해지면 어디로 연락드리면 됩니까?"
      },
      {
        "node": "R39_PROSE_ISK_L04_K2_172",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "항구 치료소에 있습니다. 출발 전에 다시 진료받기로 했으니까 당분간은 거기가 제일 정확해요. 연락 오기 전에 무작정 배에 올라가 자리를 맡지는 않겠습니다. 남의 짐처럼 실려 가고 싶은 것도 아니고요."
      }
    ],
    "ISK_L04_K2_173": [
      {
        "node": "ISK_L04_K2_173",
        "profile": null,
        "speaker": null,
        "text": "선원은 상담 요청과 연락받을 곳을 적었다. 접수가 끝난 것을 확인하고 치료소로 돌아왔다. 길에서 군옥각이 있던 하늘을 보았다. 그 빈자리는 도시를 구한 값이 무엇인지 기억하게 했지만, 남아 있는 길과 사람까지 가리지는 않았다."
      },
      {
        "node": "ISK_L04_K2_174",
        "profile": null,
        "speaker": "정산 담당자",
        "text": "돌아오셨군요. 리월 방어에 참여하고 위험을 전달한 공적에 대한 정산입니다. 1,800모라, 영웅의 경험 두 개와 모험가의 경험 세 개를 지급합니다. 금액과 물품을 확인하고 받아 주십시오."
      },
      {
        "node": "ISK_L04_K2_175",
        "profile": null,
        "speaker": null,
        "text": "치료소의 책상 위에 정산 물품이 놓였다. 익숙해진 인수 절차를 보며 잠깐 웃었다. 남의 화물이 끝나는 것을 보고 돌아왔더니 이번에는 자기 몫을 확인할 차례였다. 모라가 상처와 빈 기억을 설명해 주지는 않았지만, 다음 길의 식비와 준비에 쓸 수 있는 실제 몫이었다."
      }
    ],
    "ISK_L04_AA1_002": [
      {
        "node": "ISK_L04_AA1_002",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "저쪽 입은 우리 둘을 따라 움직이는데, 가루는 위에서 떨어지고 있어. 누가 진짜로 땅을 건드리는 모양이야. 네가 먼저 뛰어들 틈은 아니니까 내 손 잡고 있어. 이번에는 위에서 오는 소리를 들어 보자."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_003",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "입만 보이는 손님을 만나서 좋은 일이 생길 것 같지는 않았어. 위에서 누가 파고 있다면 우리가 여기 있다는 걸 알려야 하지 않아? 내 목소리까지 가져간 놈한테 구조 요청을 맡길 생각은 없는데."
      }
    ],
    "ISK_L04_AA1_004": [
      {
        "node": "ISK_L04_AA1_004",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "말은 따라 할 수 있어도 우리가 지금 만지는 벽까지 같이 만지는지는 모르겠지. 끊어진 줄 끝을 줘. 매듭으로 돌을 감싸서 천장 아래쪽을 두드려 보자. 너무 세게 쳐서 우리 위로 무너지게 하지는 말고."
      },
      {
        "node": "ISK_L04_AA1_005",
        "profile": null,
        "speaker": null,
        "text": "호두는 바닥의 작은 돌을 줄로 묶었다. 한 손으로 구슬을 감싼 천을 붙들고, 다른 손으로 줄을 받았다. 돌이 천장 가까운 돌출부를 치자 둔한 울림이 퍼졌다. 벽 안의 목소리가 곧바로 같은 박자를 따라 했다. 그러나 잠시 뒤 위에서는 박자가 아닌 긁는 소리가 났다. 틈새로 마른 흙과 길쭉한 나무 조각이 떨어졌다."
      },
      {
        "node": "ISK_L04_AA1_006",
        "profile": null,
        "speaker": "벽 너머 목소리",
        "text": "거긴 막혔어. 여기로 와. 네가 구한 사람들이 위에 있는 건 아니야."
      },
      {
        "node": "ISK_L04_AA1_007",
        "profile": null,
        "speaker": null,
        "text": "호두는 대꾸하지 않았다. 떨어진 나무 조각에는 왕생당에서 가림천을 걸 때 썼던 붉은 끈이 묶여 있었다. 위쪽에서 끈을 잡아당기자 조각이 다시 들렸다. 손을 뻗어 끈을 쥐었다. 벽에서 나온 목소리와 달리 끈에는 바깥 사람이 당기는 무게가 실렸다."
      },
      {
        "node": "ISK_L04_AA1_008",
        "profile": null,
        "speaker": "왕생당 직원",
        "text": "당주님, 들리십니까! 관리인이 옛 환기구 위치를 기억했습니다. 이쪽에 사람이 있다고 손님도 계속 가리켰고요. 먼저 내려보낸 막대를 잡으셨으면 끝을 묶어 주십시오. 넓힐 자리를 찾겠습니다!"
      }
    ],
    "ISK_L04_AA1_010": [
      {
        "node": "ISK_L04_AA1_010",
        "profile": null,
        "speaker": null,
        "text": "목소리는 벽을 건너기 어려웠다. 직원이 모든 말을 알아들었는지는 알 수 없었지만 줄은 같은 자리에서 버텼다. 호두가 매듭을 단단히 조이고, 나는 그 밑에 손바닥을 대어 흔들림을 느꼈다. 바깥에서 쇠가 부딪히는 소리가 났다. 어둠 속 입은 이제 웃지 않았다. 실금처럼 벌어져 있던 틈이 사람의 어깨 높이까지 길어졌다."
      },
      {
        "node": "ISK_L04_AA1_011",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "바깥에서 길을 만들고 있어. 우리는 그 밑을 비워 줘야겠네. 가방은 네 몸 앞에 두고, 무릎으로 바닥을 더듬어. 저쪽 틈과 줄 사이에 서지 말고 내가 선 쪽으로 돌아와."
      }
    ],
    "ISK_L04_AA1_014": [
      {
        "node": "ISK_L04_AA1_014",
        "profile": null,
        "speaker": null,
        "text": "내가 몸을 낮추는 순간 검은 틈에서 팔처럼 긴 그림자가 나왔다. 피부도 뼈도 없는 어둠이었다. 그것은 사람보다 구슬을 든 손 가까이로 뻗었다. 가방을 몸 안쪽으로 끌어당겼다. 그림자가 호두의 옷자락을 스치자 천 가장자리가 순간 보이지 않게 되었다가 돌아왔다. 찢어진 자국은 없었지만 호두도 바로 물러났다."
      },
      {
        "node": "ISK_L04_AA1_015",
        "profile": null,
        "speaker": null,
        "text": "호두는 불을 크게 일으키지 않았다. 전의 불빛이 구슬 쪽으로 빨려들던 모습을 이미 보았기 때문이다. 대신 떨어진 나무 조각을 틈의 아래에 밀어 넣고 몸을 돌렸다. 나무가 순식간에 가늘어 보이더니 둘로 부러졌다. 그동안 천장의 작은 구멍이 팔 하나를 넣을 만큼 넓어졌고, 병사의 손이 아래로 내려왔다."
      }
    ],
    "ISK_L04_AA1_022": [
      {
        "node": "ISK_L04_AA1_022",
        "profile": null,
        "speaker": null,
        "text": "바깥 사람들은 가느다란 줄 옆으로 두꺼운 밧줄을 내려보냈다. 먼저 올라간 사람이 손을 뻗었고, 아래에 남은 사람이 그 손과 밧줄을 함께 잡았다. 내 가방도 끈을 짧게 묶어 몸에서 떨어지지 않게 올렸다. 호두가 구멍의 가장자리를 마지막으로 넘었을 때 지하에서 내 목소리가 다시 울렸다. 이번에는 두 사람 중 누구도 돌아보지 않았다."
      },
      {
        "node": "ISK_L04_AA1_023",
        "profile": null,
        "speaker": null,
        "text": "바깥으로 나온 뒤에야 숨을 얼마나 얕게 쉬고 있었는지 알았다. 마당 바닥에 손을 짚고 기침했다. 호두는 곁에 앉았다가 가방 끈이 아직 내 어깨에 있는 것을 확인했다. 직원이 건넨 물잔을 받아 먼저 한 모금 마셨다. 구조된 관리인은 무릎을 꿇으려다 다친 일꾼에게 팔을 잡혔다."
      },
      {
        "node": "ISK_L04_AA1_024",
        "profile": null,
        "speaker": "관리인",
        "text": "제가 그 소리를 따라 들어가서 두 분까지… 죄송합니다. 옛 통로가 저쪽인 걸 생각했어야 했는데, 아래에서는 문 말고 다른 데가 보이지 않았습니다. 손님이 천장 위를 가리킬 때에야 기억이 났습니다."
      },
      {
        "node": "ISK_L04_AA1_025",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "사과는 들었어. 이제 일어나서 저 둘이 앉을 자리를 같이 만들자. 우리가 나온 구멍은 바로 막지 말고, 아무도 가까이 못 가게 지켜. 안에 다시 들어가야 할 사람이 남아 있지는 않아. 그걸 잊지 않으면 돼."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_026",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "셋을 데리고 나왔다가 둘이 빠졌는데 결국 다섯이 나왔네. 이 계산은 다시 틀리고 싶지 않다. 다친 데 보는 동안 나도 앉아 있을게. 지금 일어나면 다리가 내 건지 바닥 건지 좀 헷갈릴 것 같아."
      }
    ],
    "ISK_L04_AA1_032": [
      {
        "node": "ISK_L04_AA1_032",
        "profile": null,
        "speaker": null,
        "text": "낯선 손님은 여전히 직원 곁에 있었다. 그는 두 사람이 나온 구멍을 오래 보다가, 내가 가까이 오자 자기 손을 무릎 밑으로 감췄다. 손님이 가리킨 환기구 위치가 구조에 도움이 된 것은 사실이었다. 그렇다고 그가 지하의 목소리를 낸 사람이라는 뜻도, 안에 있던 모든 것을 설명할 사람이라는 뜻도 아니었다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_033",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "당신이 길을 가리켰다면서요. 고마워요. 아래에서 내 이름을 부르는 게 또 있었는데 당신 말처럼 들리지는 않았어요. 지금은 누가 먼저 잘못했는지 따지러 온 게 아니라, 어떻게 위에 길이 있다는 걸 알았는지 듣고 싶어서요."
      }
    ],
    "ISK_L04_AA1_034": [
      {
        "node": "ISK_L04_AA1_034",
        "profile": null,
        "speaker": "낯선 손님",
        "text": "여기서 짐을 내린 적이 있습니다. 당주님이 내려가신 뒤에 마당의 기둥을 보니 생각났습니다. 비가 들이치면 저쪽 통풍구 밑에 있는 포대를 옮겼거든요. 제 이름은 아직 모르겠는데, 몸은 문보다 저곳을 알고 있었습니다."
      },
      {
        "node": "ISK_L04_AA1_035",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "좋아. 이름은 나중에 확인해도 돼. 여기서 일했던 사람이라면 알아보는 사람이 있을 거야. 숨이 붙어 있는 손님을 먼저 고인으로 대할 이유는 없지. 바깥에서 확인해 줄 사람을 찾아보자."
      },
      {
        "node": "ISK_L04_AA1_036",
        "profile": null,
        "speaker": "왕생당 직원",
        "text": "아까 짐을 옮기던 분이 저분을 알아봤습니다. 항구에서 하역 일을 했고 며칠째 보이지 않았답니다. 함께 일한 사람을 데리러 갔습니다. 이 건물은 안치소로 빌리기 전까지 귀국 짐을 맡기는 창고였다고 합니다."
      },
      {
        "node": "ISK_L04_AA1_037",
        "profile": null,
        "speaker": null,
        "text": "잠시 뒤 온 일꾼은 낯선 손님을 보자 화부터 냈다. 어디 갔다 이제 오느냐는 말이 먼저였고, 얼굴을 가까이서 보고 나서는 목소리가 작아졌다. 손님의 왼손에 난 오래된 흉터를 가리키며 함께 밧줄을 놓쳐 다친 날을 말했다. 손님은 그날을 떠올리지 못했지만 흉터를 가리는 동작은 익숙했다."
      },
      {
        "node": "ISK_L04_AA1_038",
        "profile": null,
        "speaker": "동료 일꾼",
        "text": "네 방은 그대로 있어. 돌아오면 혼내려고 열쇠도 치우지 않았어. 죽었다고? 누가 너한테 그런 말을 해? 마지막에 여기서 이나즈마로 돌아갈 짐을 분류했고, 그 뒤로 안 보였던 거야. 가족한테도 네가 일을 나갔다가 안 왔다고만 전했어."
      }
    ],
    "ISK_L04_AA1_042": [
      {
        "node": "ISK_L04_AA1_042",
        "profile": null,
        "speaker": null,
        "text": "직원은 종이 묶음에서 반송 화물의 목록을 찾아냈다. 한 장에는 이도에서 짐을 보냈던 사람의 주소와, 되돌아갈 수신인이 적혀 있었다. 사람의 이름을 여기저기 덧쓴 흔적이 있었지만 판독할 수 있는 마지막 주소는 남아 있었다. 그것은 구슬의 설명서도 유해의 신원표도 아니었다. 낯선 손님이 마지막으로 일한 짐을 따라갈 수 있는 출발점이었다."
      },
      {
        "node": "ISK_L04_AA1_043",
        "profile": null,
        "speaker": "왕생당 직원",
        "text": "이 짐을 맡긴 손님도 바깥에 있습니다. 이도의 거래 상대에게 돌려보내려고 했는데 항구가 막혀 기다리고 있었답니다. 종이가 여러 번 바뀐 이유를 물어볼 수는 있겠습니다. 원본은 제가 보관하고 사본을 만들까요?"
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_044",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그렇게 해 줘요. 낯선 목소리가 내 이름을 알고 있었고, 저 사람은 이 짐을 읽은 뒤부터 이름이 뒤섞였다고 했다는 것까지 내가 직접 적을게요. 같은 원인이라고 결론내리진 않을 거예요. 그래도 계속 땅바닥만 보고 있던 것보단 따라갈 길이 생겼네요."
      }
    ],
    "ISK_L04_AA1_046": [
      {
        "node": "ISK_L04_AA1_046",
        "profile": null,
        "speaker": null,
        "text": "목록을 접는 동안 마당에 그림자가 덮였다. 구름이라기에는 너무 빨리 어두워졌고, 지붕 위의 기왓장이 같은 방향으로 떨렸다. 바다 쪽에서 낮은 울음 같은 소리가 올라왔다. 누군가 짐이 무너지는 소리라고 말했지만, 그 소리는 건물 사이를 지나서도 끊기지 않았다. 호두가 직원의 말을 멈추게 하고 높은 담 쪽으로 올라섰다."
      },
      {
        "node": "ISK_L04_AA1_047",
        "profile": null,
        "speaker": "천암군 연락병",
        "text": "바다 쪽에서 마신이 나타났습니다! 오셀입니다. 해안과 낮은 골목은 모두 비워야 합니다. 선인들과 칠성이 위에서 막고 있으니 안쪽 대피로를 열어 주세요. 이 건물에도 남은 사람이 있습니까?"
      },
      {
        "node": "ISK_L04_AA1_048",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "살아 있는 사람은 마당에 모였고 모신 분이 한 분 있어. 함께 옮기겠어. 수레를 가져와 줘. 지하 쪽은 들어갈 수 없으니 그 골목을 통로로 쓰지 말고, 우리가 온 큰길로 사람을 빼자."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_049",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "잠깐 쉬면 오늘 일은 끝날 줄 알았는데 바다가 차례를 기다리고 있었나 보네. 나는 수레 앞을 맡을게. 방향은 호두가 말해 줘. 모르는 길에서 내가 먼저 뛰었다가 다시 아래로 내려가고 싶지는 않아."
      }
    ],
    "ISK_L04_AA1_050": [
      {
        "node": "ISK_L04_AA1_050",
        "profile": null,
        "speaker": null,
        "text": "천암군은 고인을 모신 방까지 길을 비워 주었다. 직원들은 관을 옮기면서도 덮인 천이 바람에 들리지 않도록 눌렀다. 수레의 바퀴 앞에 끼운 돌을 빼고 손잡이를 들었다. 피난하는 사람들은 그 수레 앞에서 잠시 속도를 줄였다. 호두는 길을 막고 절을 받으려 하지 않았다. 살아서 걸을 수 있는 사람부터 옆길로 보내고 수레를 천천히 돌렸다."
      },
      {
        "node": "ISK_L04_AA1_051",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "고개 숙이고 서 있을 필요 없어. 지금은 같이 올라가면 돼. 좁은 골목에서는 수레 옆을 걷지 말고 앞뒤로 갈라져. 네 가족이 뒤에 있으면 손을 잡고 움직여. 당주님은 이 수레와 함께 갈 거야."
      },
      {
        "node": "ISK_L04_AA1_052",
        "profile": null,
        "speaker": null,
        "text": "낮은 골목의 입구로 물이 밀려왔다. 아직 사람 키만 한 파도는 아니었지만 바닥의 짐과 먼지를 쓸어가기에는 충분했다. 뒤쪽에서 물 슬라임 두 마리가 담을 넘어왔다. 불어난 물을 따라 밀려온 놈들이 떨어진 상자 사이로 길 안에 들어오자 병사 둘이 창을 맞대었다. 앞쪽에는 수레가 걸릴 만큼 좁은 계단이 남아 있었다."
      },
      {
        "node": "ISK_L04_AA1_053",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "수레를 위로 올릴 동안 이쪽을 잡아야 합니다. 저놈들이 밀고 들어오면 사람들 등이 그대로 드러납니다. 두 분은 안쪽으로 가십시오. 저희가…."
      },
      {
        "node": "ISK_L04_AA1_054",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "둘로 막기에는 양쪽 골목이 열려 있어. 난 오른쪽을 맡을게. 수레는 관리인과 직원에게 넘기고, 너는 이 사람과 왼쪽을 봐. 구슬은 꺼내지 마. 이 길은 우리가 지키면 돼."
      }
    ],
    "ISK_L04_AA1_059": [
      {
        "node": "ISK_L04_AA1_059",
        "profile": null,
        "speaker": null,
        "text": "마지막 피난민이 위쪽에서 손을 흔들었다. 앞으로 나가던 발을 멈추고 방어선 뒤로 물러났다. 마지막 물 슬라임까지 정리된 뒤 호두가 빈 측면을 확인했고, 천암군이 부서진 운반판을 입구에 걸었다. 길을 영원히 막는 벽은 아니었으나 모두가 돌아설 만큼의 틈은 생겼다. 숨이 차서 계단을 올라가는 사람의 등을 밀지 않으려 손을 난간에 붙였다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_060",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "다 올라왔어? 아까 그 수레도, 다친 사람들도? 이번엔 숫자 외우기보다 얼굴을 보는 게 낫겠네. 호두, 너도 여기 있어. 이제 아래로 다시 가자는 말만 하지 마."
      }
    ],
    "ISK_L04_AA1_061": [
      {
        "node": "ISK_L04_AA1_061",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "여기 있어. 수레도 저기 있고. 네가 말 안 해도 지금은 돌아갈 생각 없어. 대신 난간에서 손은 떼지 마. 바람이 사람 허리를 밀고 있어."
      },
      {
        "node": "ISK_L04_AA1_062",
        "profile": null,
        "speaker": null,
        "text": "해안 쪽으로 시선을 돌리자 군옥각이 움직였다. 멀리서는 큰 배처럼 보였던 건물이 바다 위의 형상 쪽으로 기울었다. 건물 아래에 빛이 모이고, 지붕 끝의 장식들이 폭풍 속에서 반짝였다. 저것이 추락하는 것인지 누가 밀고 있는 것인지 바로 알 수 없었다. 대피로의 병사가 사람들을 벽 아래에 앉히며 소리쳤다."
      },
      {
        "node": "ISK_L04_AA1_063",
        "profile": null,
        "speaker": "천암군 연락병",
        "text": "엎드리십시오! 천권께서 군옥각을 내려 마신을 억누르기로 하셨습니다. 충격이 옵니다. 담장 가까이 붙고 머리를 가리십시오!"
      },
      {
        "node": "ISK_L04_AA1_064",
        "profile": null,
        "speaker": null,
        "text": "호두가 내 어깨를 눌렀다. 눈을 감기 직전 군옥각의 그림자가 거대한 물결에 들어가는 것을 보았다. 그 뒤에는 가슴을 때리는 압력과 길게 밀려오는 굉음이 이어졌다. 돌계단이 울렸고 바다 쪽에서 솟구친 물이 하늘을 가렸다. 몸을 웅크린 채 바닥에 남아 있는 호두의 신발 끝을 보았다. 그녀가 옆에 있다는 걸 확인하는 가장 작은 표식이었다."
      },
      {
        "node": "ISK_L04_AA1_065",
        "profile": null,
        "speaker": null,
        "text": "충격이 지나고도 아무도 바로 일어나지 않았다. 먼지가 내려앉은 뒤 바다 위의 형상은 보이지 않았고, 군옥각도 있던 자리에 없었다. 불안하게 솟던 물기둥이 낮아졌다. 천암군이 먼저 길을 살핀 뒤 사람들이 하나씩 고개를 들었다. 누군가는 울었고 누군가는 입을 벌린 채 아무 소리도 내지 못했다."
      }
    ],
    "ISK_L04_AA1_070": [
      {
        "node": "ISK_L04_AA1_070",
        "profile": null,
        "speaker": null,
        "text": "쉼터에서 가장 먼저 나눈 것은 전투 이야기가 아니라 젖은 겉옷이었다. 자기 것과 남의 것을 가르지 못하고 받아 들었다가 호두에게 돌려받았다. 소매 길이가 다르다는 간단한 이유였다. 큰일 뒤에도 옷은 맞는 사람이 입어야 했고 밥그릇은 빈 곳에 놓아야 했다."
      },
      {
        "node": "ISK_L04_AA1_071",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "네 옷은 이쪽이야. 남의 옷을 입고 돌아가면 감사 인사보다 먼저 돌려 달라는 말부터 듣겠네. 아직 먹을 힘 있으면 저쪽에서 죽을 받아 와. 내 것도 하나 부탁할게."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_072",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "드디어 내가 잘할 수 있는 일이 나왔네. 두 그릇 받아 오고, 쏟지 않고, 남의 몫 안 먹기. 마지막은 조금 자신 없지만 앞의 두 개는 해 볼게. 너도 앉아 있어. 내가 돌아왔을 때 또 누굴 데리러 내려갔으면 화낼 거야."
      }
    ],
    "ISK_L04_AA1_073": [
      {
        "node": "ISK_L04_AA1_073",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "좋아. 기다리는 건 내가 맡지. 대신 당주님 몫까지 다 먹어 놓고 구조하느라 배고팠다는 핑계는 안 통한다. 그건 나도 똑같거든."
      },
      {
        "node": "ISK_L04_AA1_074",
        "profile": null,
        "speaker": null,
        "text": "죽을 받으러 가면서 갑자기 웃었다. 오래 이어지지는 않았지만 억지로 낸 웃음도 아니었다. 두 그릇을 들고 돌아왔을 때 호두는 약속대로 앉아 있었다. 그녀는 먼저 먹지 않고 한쪽 그릇을 받았다. 옆에 가방을 내려놓되 발로 누르거나 끌어안지는 않았다."
      }
    ],
    "ISK_L04_AA1_082": [
      {
        "node": "ISK_L04_AA1_082",
        "profile": null,
        "speaker": null,
        "text": "각청은 진흙이 묻은 신발로 쉼터에 들어왔다. 병사에게 먼저 대피 인원을 듣고, 호두에게는 안치소 쪽을 다시 물었다. 나를 보았을 때는 자신이 안치소로 보냈던 사람으로 알아보았다. 이전의 기억이 돌아온 것은 아니었다. 새로 겪은 일을 잃지 않고 이어 가는 얼굴이었다."
      },
      {
        "node": "ISK_L04_AA1_083",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "돌아왔구나. 아래에 갇혔다는 보고를 받았는데, 구조된 뒤 피난로 방어까지 했다고 들었어. 맡긴 통로보다 일이 커졌네. 지금은 건물 안으로 돌아가면 안 돼. 구조가 끝났어도 지하 상태가 확인되지 않았어."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_084",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "돌아온 건 이번엔 네가 먼저 알아봐 줬네. 그거부터 고맙다. 아래에서 호두랑 갇혔고 바깥 사람들이 꺼내 줬어. 목소리가 내 말을 따라 했고 구슬 쪽으로 빛이 당겨졌어. 이 얘기는 따로 제대로 남길게. 지금 마당 밑에 사람을 더 넣지 말라는 데는 나도 찬성이야."
      }
    ],
    "ISK_L04_AA1_090": [
      {
        "node": "ISK_L04_AA1_090",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "종려 씨, 의자는 그쯤이면 됐어요. 앉을 때마다 옛 의자 제작법까지 설명해 주면 기다리는 분이 더 피곤해지겠네. 이 사람은 내가 말했던 손님이야. 어제는 같이 갇혔다가 오늘까지 살아서 잘 걸어왔지."
      },
      {
        "node": "ISK_L04_AA1_091",
        "profile": "PROFILE_LIYUE_ZHONGLI",
        "speaker": "종려",
        "text": "당주, 흔들리는 의자에 사람을 앉힌 뒤 이야기를 시작할 수는 없지. 이제 됐군. 나는 왕생당의 객경 종려라고 하네. 자네가 괜찮다면 앉아서 이야기하지. 당주와 함께 사람들을 구조하다 갇혔던 손님이라고 들었네. 아직 다친 곳이 있다면 앉기 편한 자리부터 고르도록 하지."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_092",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "제가 들고 다니는 구슬 안에 죽은 분의 유해가 있어요. 호두는 직접 봤고요. 모신다고 하기엔 아직 어설퍼요. 가방에 넣고 밥 먹고 도망도 치고, 제대로 대하고 있는 건가 걱정하죠. 그 이야기를 드리러 왔는데, 어디에 묻어야 한다는 답부터 받고 싶지는 않아요."
      }
    ],
    "ISK_L04_AA1_093": [
      {
        "node": "ISK_L04_AA1_093",
        "profile": "PROFILE_LIYUE_ZHONGLI",
        "speaker": "종려",
        "text": "그렇다면 장례 날짜부터 정할 필요도 없겠지. 이름을 모르고 생전의 뜻도 알지 못하는 상황에서 절차만 서둘러 완결하면, 산 사람의 불안을 덜기 위해 고인을 옮기는 일이 될 수 있으니까. 지금 자네에게 필요한 질문이 무엇인지부터 듣고 싶군."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_094",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "죽은 사람이 살아 돌아오면 제가 그 죽음을 슬퍼했던 건 어떻게 되는 건가요? 각청을 두고 달아났고, 여기 와서 살아 있는 각청을 봤어요. 기뻐해야 한다는 건 아는데 그 순간에 더 무서웠거든요. 그때 느낀 걸 아무 일 없었던 것처럼 정리하고 싶지는 않아요."
      }
    ],
    "ISK_L04_AA1_095": [
      {
        "node": "ISK_L04_AA1_095",
        "profile": null,
        "speaker": null,
        "text": "종려는 대답하기 전에 내 손을 보았다. 새로 감은 천 아래에 붉은 얼룩이 조금 배어 있었다. 시선을 곧 가방으로 옮기지 않았다. 호두도 끼어들어 상황을 대신 설명하지 않았다. 자기가 물은 것이 죽음을 되돌리는 기술이 아니라, 돌아온 사람 앞에서 남아 있는 감정을 어디에 둘지라는 문제였음을 깨달았다."
      },
      {
        "node": "ISK_L04_AA1_096",
        "profile": "PROFILE_LIYUE_ZHONGLI",
        "speaker": "종려",
        "text": "살아 있는 이를 반기는 마음과 죽음을 마주했을 때 생긴 고통은 서로를 취소하지 않네. 자네가 확인했던 순간을 거짓으로 만들지 않고도 지금의 그를 살아 있는 사람으로 대할 수 있지. 한 가지 감정만 옳다고 정하면 남은 감정은 갈 곳을 잃고 더 오래 남을 거야."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_097",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 말씀 들으니 좀 살겠네요. 제가 계속 각청 손목만 보고 있으면 그 사람도 불편할 테니까요. 당장 믿음직한 표정을 만들어 낼 수는 없겠지만, 적어도 살아 있냐고 확인하는 말 말고 다른 이야기를 해 볼 수는 있겠어요."
      }
    ],
    "ISK_L04_AA1_098": [
      {
        "node": "ISK_L04_AA1_098",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "좋지. 다음에는 밥 먹었냐고 물어봐. 살아 있는지 확인하는 데 손목만 잡는 방법이 있는 건 아니잖아. 그 사람도 계속 일만 해서 그런 질문이 필요한 때일 거야."
      },
      {
        "node": "ISK_L04_AA1_099",
        "profile": "PROFILE_LIYUE_ZHONGLI",
        "speaker": "종려",
        "text": "당주의 제안도 일리가 있네. 기억이 남아 있는 사람에게만 관계의 부담을 전부 지울 필요는 없어. 새로 나누는 시간도 관계를 이루지. 물론 잃어버린 사실을 찾는 일을 포기해야 한다는 뜻은 아니야."
      },
      {
        "node": "ISK_L04_AA1_100",
        "profile": null,
        "speaker": null,
        "text": "의자 등받이에 등을 붙였다. 기울어지지 않았다. 종려가 고친 아주 작은 문제 덕분에, 큰 문제에 대해 말하는 동안 몸을 버티려고 애쓸 필요는 없었다. 호두는 찻잔을 놓고 상담을 기다리던 직원에게 잠시 더 기다려 달라고 손짓했다."
      }
    ],
    "ISK_L04_AA1_103": [
      {
        "node": "ISK_L04_AA1_103",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "나도 같은 생각이야. 함께 봤다고 내가 그분의 유족이 되는 건 아니니까. 네가 답을 찾으러 간다면 제대로 싸는 건 도와줄게. 못 보던 동안 무슨 일이 있었는지 돌아와서 들려주는 것도 좋고. 돌아오라는 말을 빚처럼 쓰지는 않을게."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_104",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "기다리는 사람을 남기는 게 무서워졌는데 그렇게 말해 주니까 조금 덜 무섭네. 구슬 안을 모두에게 보여 주는 건 여기서 멈출게. 대신 내가 봤던 일이랑 얻은 단서는 정리해서 남기고 갈 거야. 누가 먼저 없어져도 나머지 사람이 처음부터 다시 헤매지 않도록."
      }
    ],
    "ISK_L04_AA1_107": [
      {
        "node": "ISK_L04_AA1_107",
        "profile": null,
        "speaker": "반송 짐을 맡긴 상인",
        "text": "그 일꾼을 찾았다고요? 다행입니다. 짐은 없어져도 찾을 사람이 있어야 하는데, 다들 짐값부터 물어서 저도 화를 냈습니다. 이 목록은 제가 맡긴 게 맞습니다. 이도의 거래 상대가 돌려 달라고 해서 보내려던 거였죠."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_108",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 사람이 작업하던 중에 자기 아닌 목소리를 들었대요. 나도 그 건물 지하에서 내 목소리를 흉내 내는 걸 들었고요. 당신을 범인으로 생각해서 온 건 아니에요. 이 물건을 보낸 쪽에서도 비슷한 일이 있었는지 물어볼 길이 필요해요."
      }
    ],
    "ISK_L04_AA1_109": [
      {
        "node": "ISK_L04_AA1_109",
        "profile": null,
        "speaker": "반송 짐을 맡긴 상인",
        "text": "그쪽 편지에도 이상한 말이 있었어요. 빈 방에서 먼저 대답이 돌아와 밤에는 장부를 읽지 못하겠다고 했죠. 저는 일꾼들이 괜히 겁주는 이야기라고 생각했습니다. 물건을 받지 않겠다면 돌려보내면 그만이라고 했고요. 편지는 버리지 않았습니다."
      },
      {
        "node": "ISK_L04_AA1_110",
        "profile": null,
        "speaker": null,
        "text": "상인은 접어 둔 편지를 펼쳤다. 편지의 대부분은 운송비와 보관 기한에 관한 다툼이었다. 이상한 목소리에 대한 말은 그 사이에 끼어 있었다. 유해나 구슬에 관한 이름은 없었다. 그 짧은 문장을 읽고도 바로 정답을 얻었다고 생각하지 않았다. 같은 일을 겪은 사람이 다른 곳에 있을 가능성이 처음 생긴 것이었다."
      },
      {
        "node": "ISK_L04_AA1_111",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그분은 지금도 이도에 있나요? 편지 주소만 보고 찾아갔다가 문이 닫혀 있으면 이 손님이 또 한참 기다려야 해서요. 답을 주고받을 수 있는 사람부터 있으면 좋겠어요."
      },
      {
        "node": "ISK_L04_AA1_112",
        "profile": null,
        "speaker": "반송 짐을 맡긴 상인",
        "text": "아직 떠났다는 말은 못 들었습니다. 지난번 선편으로도 자기 창고의 미납 비용을 따져 보냈으니까요. 이도에 도착한다면 외국 상인 접수 쪽에 이 주소를 보여 주면 됩니다. 다만 지금은 이나즈마에 가는 배도, 들어가는 절차도 쉽지 않습니다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_113",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "주소가 있고 실제로 최근까지 편지를 보내는 사람이 있으면 충분해요. 도착만 하면 답이 다 나온다고는 생각 안 할게요. 우선 편지의 그 부분과 주소를 베껴도 되죠? 당신한테 나중에 괜한 책임이 생기지 않게 내 질문도 같이 남기겠어요."
      }
    ],
    "ISK_L04_AA1_127": [
      {
        "node": "ISK_L04_AA1_127",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "내일 아침에는 포장할 천을 가져올게. 지금 쓰는 건 매듭이 너무 깊이 파였어. 풀 때마다 손톱부터 상하겠더라. 그분을 잘 모시려면 들고 있는 네 손도 좀 편해야지."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_128",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그러면 나는 밥을 사 올게. 그걸로 포장 값까지 퉁치겠다는 건 아니고, 같이 앉을 이유 하나쯤은 내가 준비하고 싶어서. 오늘처럼 그릇 두 개 들고 오는 건 이제 익숙해졌어."
      }
    ],
    "ISK_L04_AA1_129": [
      {
        "node": "ISK_L04_AA1_129",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "좋아. 당주님 식사 취향까지 외우면 이제 리월에서 길 잃었을 때 돌아올 핑계가 더 생기겠네. 다만 멀리 가서도 굶고 버티는 버릇은 만들지 마. 누가 기다린다고 말해 줘야만 밥 먹는 사람은 되지 말고."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA1_130",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알았어. 돌아올 사람으로만 지내다 보면 정작 가야 할 때도 눈치 보게 되니까, 이번에는 갔다가 돌아올 생각으로 움직일게. 모르는 게 하나도 줄지 않은 줄 알았는데 적어도 내일 뭘 할지는 알겠다."
      }
    ],
    "ISK_L04_AA1_131": [
      {
        "node": "ISK_L04_AA1_131",
        "profile": null,
        "speaker": null,
        "text": "가방을 방 안의 마른 자리로 옮겼다. 같은 유해가 담긴 구슬 하나를 데리고 떠날 준비는 아직 끝나지 않았다. 그러나 지하에서 따라오던 목소리를 기다리며 앉아 있을 이유도 없었다. 문을 열어 두고 호두와 저녁 메뉴를 정했다. 바깥에서는 살아 있는 사람들이 자기 이름을 부르면 대답하고 있었다."
      },
      {
        "node": "ISK_L04_AA1_132",
        "profile": null,
        "speaker": null,
        "text": "그날 저녁 칠성의 정산 담당이 숙소를 찾아왔다. 피난로 방어와 구조 활동에 대한 공적 정산으로 1,800모라와 영웅의 경험 두 개, 모험가의 경험 세 개가 책정되어 있었다. 자기 이름과 활동 구간이 맞는지 확인했다. 호두의 몫이나 다른 사람의 공적을 대신 받은 서류는 아니었다."
      }
    ],
    "ISK_L04_AA2_002": [
      {
        "node": "ISK_L04_AA2_002",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "여기에 표시를 남기는 거야. 네가 있는 곳과 가방 사이에 무엇이 변하는지 보려고. 하지만 변화를 끝까지 기다릴 생각은 없어. 먼저 이 골짜기에서 나가자. 네 몸을 옮길 때 목이 꺾이지 않게 내 어깨 쪽으로 받칠게."
      },
      {
        "node": "ISK_L04_AA2_003",
        "profile": null,
        "speaker": null,
        "text": "알베도는 내 등을 받치고 자신의 외투를 접어 어깨와 목 사이에 끼웠다. 이미 바위 옆으로 옮겼고 가방도 멀리 밀었지만 돌아오지 않은 몸이었다. 이번에는 가방과의 간격을 조금 더 늘리는 데서 멈추지 않았다. 빛이 바닥에 가라앉기 전 두 사람이 걸어 내려왔던 높은 길을 향해 나를 끌어올렸다."
      },
      {
        "node": "ISK_L04_AA2_004",
        "profile": null,
        "speaker": null,
        "text": "몇 걸음 움직였는데도 손가락은 그대로였다. 눈을 감았다 뜨며 의식이 있다는 신호를 보냈다. 알베도는 그 신호를 보고 잠깐 멈춰 호흡을 확인했다. 가방은 아직 돌의 반대편에 있었다. 알베도는 자신의 짐에서 긴 줄을 풀어 가방 끈에 걸었고, 움직이지 못하는 나를 내려놓은 채 멀리 다녀오는 대신 줄을 당겨 회수했다."
      },
      {
        "node": "ISK_L04_AA2_005",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "가방은 닫힌 채로 끌어올릴게. 네가 보는 앞에서 한다는 건 알겠지? 안을 열지 않을 거야. 지금은 그 안에 대해 새로 알아내는 것보다 너와 함께 여기서 나가는 게 먼저야."
      },
      {
        "node": "ISK_L04_AA2_006",
        "profile": null,
        "speaker": null,
        "text": "눈을 한번 감았다 떴다. 알베도는 가방이 바위 모서리에 걸리지 않도록 도구 끝으로 끈을 들었다. 돌에서 떨어진 가방은 풀 위로 넘어왔고 구슬을 감싼 천은 풀리지 않았다. 그는 가방을 자기 짐의 바깥쪽에 단단히 묶었다. 내 소유물을 잠시 운반하는 일이었고, 내가 그것을 넘기겠다고 말한 적은 없었다."
      }
    ],
    "ISK_L04_AA2_008": [
      {
        "node": "ISK_L04_AA2_008",
        "profile": null,
        "speaker": null,
        "text": "이를 악물고 싶었지만 턱을 움직일 수 없었다. 분노가 몸 밖으로 나가지 못하자 오히려 숨의 마찰이 크게 느껴졌다. 알베도가 나를 다시 부축했다. 발을 디딜 힘이 없는 동안에는 어깨와 허리에 걸친 천이 체중을 나누어 받았다. 위쪽 마른 풀밭까지는 짧은 거리였지만 두 사람에게는 몇 번이나 멈춰야 하는 비탈이었다."
      },
      {
        "node": "ISK_L04_AA2_009",
        "profile": null,
        "speaker": null,
        "text": "중간의 평평한 돌을 지날 때 내 오른손 새끼손가락이 한번 떨렸다. 알베도는 곧장 가방을 내려놓거나 되돌아가지 않았다. 그 작은 움직임이 나왔다고 현상이 끝난 것은 아니었다. 손가락을 다시 움직이려 하자 여전히 되지 않았고, 목 안에서도 소리가 나지 않았다."
      },
      {
        "node": "ISK_L04_AA2_010",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "움직이는 걸 봤어. 하지만 지금 돌아가서 다시 확인하지는 않을 거야. 위의 나무 그늘까지 간다. 네가 힘을 주지 못하는 동안은 내가 들 테니, 안 움직인다고 미안해할 필요 없어."
      },
      {
        "node": "ISK_L04_AA2_011",
        "profile": null,
        "speaker": null,
        "text": "대답할 수 없었다. 대신 알베도의 소매에 닿아 있는 자기 손끝을 오래 보았다. 골짜기의 낮은 빛이 등 뒤로 멀어지고 정상적인 그림자가 두 사람 앞에 생겼다. 나무 그늘의 경계를 넘었을 때 혀끝에 감각이 돌아왔다. 입술 사이로 새는 숨이 전과 달라졌다. 처음 나온 것은 문장이 아니라 마른 기침이었다."
      }
    ],
    "ISK_L04_AA2_013": [
      {
        "node": "ISK_L04_AA2_013",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "말부터 길게 하려고 하지 마. 숨을 고르고 혀가 움직이는지 확인해. 물은 삼킬 수 있을 때 조금씩 마시자. 나는 옆에 있을게. 가방도 여기에 두었어."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_014",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내가… 지금 말한 거지? 네가 들었지? 목 안에서는 계속 소리를 지르고 있었는데 바깥에 아무것도 안 나갔어. 눈만 움직이는 걸로는 내가 얼마나 무서운지까지 전해지지 않더라."
      }
    ],
    "ISK_L04_AA2_015": [
      {
        "node": "ISK_L04_AA2_015",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "들었어. 네 말이야. 알아들을 수 있었고. 눈으로 신호를 계속 보낸 것도 봤어. 무엇을 느끼는지는 다 알 수 없었지만 네가 혼자 두면 안 되는 상태라는 건 충분히 알 수 있었지."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_016",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "거기서 누가 말했어. 조용히 있으라고, 네가 내가 어디 있는지 모른다고 했어. 내 귀 안에 있는 것처럼 가까웠는데 네가 못 들은 것 같았어. 지금은 안 들려. 그렇다고 끝났다고 말할 자신은 없지만 지금은 없어."
      }
    ],
    "ISK_L04_AA2_017": [
      {
        "node": "ISK_L04_AA2_017",
        "profile": null,
        "speaker": null,
        "text": "알베도는 그 말을 들은 뒤 내 시선을 따라 골짜기 쪽을 보았다. 내려갈 준비를 하지는 않았다. 그는 가방의 위치를 나에게 보여 주고, 다시 손목 가까이에 손을 댔다. 손을 조금 들어 그의 손가락을 잡았다. 강하게 쥐지는 못했지만 이번에는 자기 뜻으로 한 동작이었다."
      },
      {
        "node": "ISK_L04_AA2_018",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "나는 그 말을 듣지 못했어. 네가 말한 것을 기록하겠지만, 무엇이 말했는지 지금 이름을 붙이지는 않을게. 아래에서 간격만 벌렸을 때는 돌아오지 않았고 이곳까지 옮긴 뒤에 변화가 생겼어. 그 차이는 남겨 둘 수 있겠지."
      }
    ],
    "ISK_L04_AA2_033": [
      {
        "node": "ISK_L04_AA2_033",
        "profile": null,
        "speaker": null,
        "text": "잠자리를 정한 뒤 나는 입을 열었다 닫았다. 목소리가 나오는지 시험하는 일이어서 꼭 할 말이 있지는 않았다. 알베도는 그 모습을 보다가 물잔을 내려놓고, 내일 아침까지 조사 도구를 정리해 두겠다고 말했다. 안심했다가 곧 조금 민망해졌다. 와 달라고 부른 사람의 일을 자신이 계속 멈추게 만드는 것 같았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_034",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "너 여기까지 와서 짐 나르고 사람 업고, 정작 알아낸 건 얼마 없네. 나 때문에 온 건 맞지만 이쯤 되면 현장 조사라고 하기에도 좀 미안해진다. 돌아가서 뭘 했냐고 물으면 나부터 욕해도 돼."
      }
    ],
    "ISK_L04_AA2_035": [
      {
        "node": "ISK_L04_AA2_035",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "확인한 건 있어. 조건을 조금 바꾸는 것만으로 해결되지 않는 현상이었고, 사람을 먼저 옮겼을 때 회복이 시작되었다는 것. 실패한 연구처럼 포장할 이유는 없지. 다만 그걸 확인하려고 다시 네 몸을 멈추게 할 생각은 없어."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_036",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 말은 정말 고맙네. 솔직히 네가 한 번만 더 해 보자고 하면 내가 거절할 수 있을까 걱정했거든. 여기까지 와 준 값을 몸으로 내야 하나 싶어서."
      }
    ],
    "ISK_L04_AA2_037": [
      {
        "node": "ISK_L04_AA2_037",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "네 몸이 출장비는 아니야. 이 말은 기록하지 않아도 기억해 주면 좋겠군. 네가 거절하지 못할 것 같아서 제안하지 않는 것이 아니라, 지금 반복할 이유가 없어서 하지 않는 거야."
      },
      {
        "node": "ISK_L04_AA2_038",
        "profile": null,
        "speaker": null,
        "text": "이번에는 조금 웃었다. 알베도의 대답은 위로를 만들려고 과장한 말처럼 들리지 않았다. 알베도는 자기 도시락의 남은 음식을 나누려다 양부터 물었다. 자기 몫을 정리한 뒤에는 구호소에서 더 받을 수 있는 곳을 가리켰다. 함께 있어도 각자의 밥은 남아 있었다."
      }
    ],
    "ISK_L04_AA2_044": [
      {
        "node": "ISK_L04_AA2_044",
        "profile": null,
        "speaker": null,
        "text": "먼저 달려온 것은 부상자가 탄 수레였다. 바퀴 한쪽이 깨져 있었고 뒤따르던 사람들이 번갈아 들어 올려 움직였다. 천막 문을 걷다가 바다 쪽 하늘에서 솟아오른 거대한 형상을 보았다. 아직 무엇인지 몰랐는데 수레 옆 병사가 오셀이라는 이름을 외쳤다. 이어 선인과 칠성이 막고 있다는 말, 해안 쪽에서 더 많은 사람이 나온다는 말이 들렸다."
      },
      {
        "node": "ISK_L04_AA2_045",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "이쪽 길을 열어 주십시오! 안쪽에서 피난민이 계속 옵니다. 마물이 길 위로 올라와서 수레를 멈춰 세웠습니다. 높은 갈림길까지만 통과시키면 뒤의 대피소로 보낼 수 있습니다."
      },
      {
        "node": "ISK_L04_AA2_046",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "앞바퀴는 내가 받칠게. 여기서 수레를 기울이면 누운 사람이 미끄러져. 옆에 있는 자루를 먼저 내려서 무게를 줄이고, 내 신호에 맞춰 뒤쪽을 밀어."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_047",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "몸이 돌아오자마자 수레부터 밀게 되네. 그래도 지금은 밀 수 있다는 게 반갑다. 내가 뒤에 설게. 만약 손에 힘이 풀리면 바로 말할 거야. 말없이 버티다가 사람을 떨어뜨리지는 않겠어."
      }
    ],
    "ISK_L04_AA2_048": [
      {
        "node": "ISK_L04_AA2_048",
        "profile": null,
        "speaker": null,
        "text": "내가 손잡이를 잡자 옆의 상인이 함께 밀었다. 수레는 조금씩 높은 길로 올라갔다. 누운 사람은 천으로 얼굴을 가리고 있었는데, 바퀴가 턱을 넘을 때마다 손을 들어 난간을 붙잡았다. 그 손이 스스로 움직이는 걸 보고 나는 눈을 돌리지 못했다. 어제까지 자신에게 없던 힘이 누군가의 손끝에 있었다."
      },
      {
        "node": "ISK_L04_AA2_049",
        "profile": null,
        "speaker": "피난 중인 상인",
        "text": "우리 짐은 뒤에 내려놓았습니다. 저 노인부터 보내 주세요. 배를 알아보러 왔다가 이쪽으로 나오지도 못할 뻔했어요. 이나즈마로 돌아가면 천천히 장사하겠다고 큰소리쳤는데 돌아갈 길이 자꾸 멀어지네요."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_050",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "오늘은 돌아갈 길을 찾기 전에 여기 길부터 뚫죠. 짐은 나중에 같이 찾으면 되고요. 아니, 내가 물어내겠다는 뜻은 아니에요. 그냥 사람 싣고 가는 수레에 물건 더 올리지는 말자는 거예요."
      }
    ],
    "ISK_L04_AA2_051": [
      {
        "node": "ISK_L04_AA2_051",
        "profile": null,
        "speaker": null,
        "text": "상인은 지친 얼굴로 한번 웃고 더는 짐 이야기를 하지 않았다. 갈림길 아래로 물 슬라임 두 마리가 밀려들었다. 병사들은 피난민 사이로 창을 들이밀 수 없어 뒤로 물러나 길을 나누었다. 알베도는 깨진 바퀴 아래에 임시 받침을 세우고 수레를 인계했다. 그의 시선이 나에게 돌아왔다."
      },
      {
        "node": "ISK_L04_AA2_052",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "너는 방금까지 몸의 힘을 확인했어. 싸움에 들어가면 짐을 미는 것과는 다르게 움직여야 해. 여기서 바로 거절해도 이상하지 않아. 나와 병사들이 앞에 서고 네가 뒤를 맡는 방법도 있어."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_053",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "앞에 혼자 뛰겠다는 건 아니야. 네 옆에서 길로 들어오는 놈만 막을게. 네가 나를 업고 또 나가야 할 상황은 피하고 싶지만, 내가 아직 살아서 움직인다는 이유로 할 수 있는 일이 이것밖에 없는 것도 아니잖아. 피난 수레가 지나가면 같이 빠지자."
      }
    ],
    "ISK_L04_AA2_054": [
      {
        "node": "ISK_L04_AA2_054",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "좋아. 가방은 몸 가까이에 고정하고, 내가 만든 장애물 바깥으로는 나가지 마. 네 움직임이 이상해지면 적을 잡으려고 하지 말고 내 이름을 불러. 이번에는 목소리가 있을 때 바로 알려 줘."
      },
      {
        "node": "ISK_L04_AA2_055",
        "profile": null,
        "speaker": null,
        "text": "천암군이 대피로를 두 갈래로 나누었다. 걷는 사람들은 높은 사면으로, 수레는 완만한 길로 움직였다. 알베도의 옆에 서서 바닥의 턱을 먼저 보았다. 골짜기에서 자기 발이 멈췄던 순간이 떠올랐지만 지금의 발끝은 움직였다. 원하는 만큼만 앞으로 나가고, 다시 돌아설 자리를 남겼다."
      }
    ],
    "ISK_L04_AA2_058": [
      {
        "node": "ISK_L04_AA2_058",
        "profile": null,
        "speaker": null,
        "text": "마지막 수레의 바퀴가 갈림길을 넘었다. 알베도가 장애물 뒤로 물러나며 손을 들었고 나도 따라 나왔다. 남은 물 슬라임까지 정리했어도 부서진 길 너머로 더 나아가지는 않았다. 뒤쪽 병사가 임시 울타리를 닫을 때 나는 자기 손을 보았다. 손잡이를 쥐고 놓는 동작이 아직 자기 뜻대로 되었다. 심장이 빨리 뛰는 이유도 이번에는 눈앞에서 싸웠기 때문이었다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_059",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나 지금 멀쩡하게 말하고 있어. 별소리 다 한다고 생각해도 오늘은 확인 좀 할게. 네 이름 부르려던 순간도 있었는데 힘이 풀려서가 아니라 뒤에서 놈이 돌아오는 걸 알려주려고 그랬어."
      }
    ],
    "ISK_L04_AA2_060": [
      {
        "node": "ISK_L04_AA2_060",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "들었고 피했어. 네 경고가 도움이 됐지. 움직임이 돌아왔는지 확인하는 일도 끝낼 수 있겠군. 지금은 전투 뒤에 숨이 찬 상태로 보여. 저쪽 바위에 앉아서 호흡을 고르자."
      },
      {
        "node": "ISK_L04_AA2_061",
        "profile": null,
        "speaker": null,
        "text": "그때 바다 쪽 하늘이 밝아졌다. 멀리 떠 있던 군옥각 아래에서 빛이 모였다. 공중의 전투를 하나하나 구분할 수는 없었지만 건물 전체가 방향을 바꾸어 내려가는 모습은 보였다. 그것이 안전한 착륙이 아니라는 것만 알 수 있었다. 병사들이 모두 엎드리라고 외쳤고 알베도가 나를 바위 뒤로 끌었다."
      },
      {
        "node": "ISK_L04_AA2_062",
        "profile": null,
        "speaker": "천암군 병사",
        "text": "군옥각이 내려갑니다! 대피 대열을 멈추고 몸을 낮추십시오! 수레 바퀴를 잡고, 위에 서 있는 사람부터 앉히십시오!"
      },
      {
        "node": "ISK_L04_AA2_063",
        "profile": null,
        "speaker": null,
        "text": "땅이 울렸다. 골짜기에서 소리가 멀어지던 경험과는 달리 이번 소리는 너무 커서 몸 전체로 들어왔다. 알베도의 손을 붙들고 눈을 감았다. 바닷물이 솟구치며 멀리 구름을 밀었고, 차가운 물방울이 바람을 타고 여기까지 날아왔다. 다시 고개를 들었을 때 군옥각은 사라지고 거대한 물의 형상도 낮아져 있었다."
      },
      {
        "node": "ISK_L04_AA2_064",
        "profile": null,
        "speaker": null,
        "text": "누가 건물을 포기했는지 아직 몰랐다. 한동안 대피소 아래 길을 살피며 기다린 뒤에 연락병이 도착했다. 선인들과 칠성이 함께 막았고, 응광이 군옥각을 희생해 오셀을 억눌렀다는 설명이었다. 그 이야기가 도착하는 동안 나는 부상자 수레의 덮개를 다시 묶었다. 멀리서 벌어진 결정을 듣는 일과 눈앞의 사람을 돌보는 일은 함께 진행되었다."
      }
    ],
    "ISK_L04_AA2_069": [
      {
        "node": "ISK_L04_AA2_069",
        "profile": null,
        "speaker": "피난 중인 상인",
        "text": "두 분 덕분에 올라왔습니다. 내 짐을 못 챙겼다고 투덜대다가 사람부터 데리고 나오자고 해 놓고, 정작 방어선에서는 발이 안 떨어지더군요. 감사 인사는 하고 싶었습니다. 먹을 건 별로 없지만 마른 천은 있습니다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_070",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "천이면 지금 꽤 고마워요. 젖은 옷 입고 잘난 척하다 감기까지 걸리면 다음엔 누가 업어 줄지도 모르고요. 다만 밥까지 없는 걸 나누지는 마세요. 아까 같이 밀어 준 걸로 이미 충분히 받았어요."
      }
    ],
    "ISK_L04_AA2_071": [
      {
        "node": "ISK_L04_AA2_071",
        "profile": null,
        "speaker": null,
        "text": "상인은 천을 나누어 주고 자기 편지를 다시 묶었다. 종이 가장자리에 겹쳐 적힌 글씨를 보았다. 지워진 문장을 다시 쓰는 버릇이 자기 편지와 닮아 있었다. 상인은 두 사람이 그쪽을 보자 먼저 설명했다. 이도에 있는 동생이 보낸 편지였고, 요즘에는 자신이 무엇을 잘하는지 형에게 묻고 있다고 했다."
      },
      {
        "node": "ISK_L04_AA2_072",
        "profile": null,
        "speaker": "피난 중인 상인",
        "text": "어릴 때부터 배를 만들겠다고 그렸습니다. 배 밑 모양 하나로 밤새 떠드는 녀석이었는데 요즘은 도면을 보고도 누가 그렸냐고 묻는답니다. 가족이 누군지는 압니다. 밥을 어디서 사 먹는지도 알고요. 그런데 자기 꿈에 관해서만 남의 이야기처럼 굴어요."
      },
      {
        "node": "ISK_L04_AA2_073",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "갑자기 그렇게 되었다고 적혀 있군. 다친 일이나 열병을 앓았다는 말도 있어? 직접 만난 것은 아니라고 했으니, 편지에서 확인한 부분부터 알고 싶어."
      },
      {
        "node": "ISK_L04_AA2_074",
        "profile": null,
        "speaker": "피난 중인 상인",
        "text": "신의 눈을 내놓은 뒤부터랍니다. 이나즈마에서는 안수령 때문에 신의 눈을 거둬들이고 있어요. 저는 직접 그 자리에 없었지만 동생과 이웃 둘이 각각 써 보냈습니다. 돌아가 확인하려는데 배를 잡지 못했고 이번에는 이 재난까지 겹쳤습니다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_075",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "여기서도 기억을 잃은 사람이 있었어요. 내가 아는 사람을 그 사람이 몰라봤고요. 그렇다고 동생분하고 같은 일이라고 하려는 건 아니에요. 그냥 누군가는 가족은 기억하는데 자기 일을 잊는다는 게… 잃는 방식이 전부 같지는 않구나 싶어서요."
      }
    ],
    "ISK_L04_AA2_076": [
      {
        "node": "ISK_L04_AA2_076",
        "profile": null,
        "speaker": null,
        "text": "알베도는 내가 말하는 동안 끼어들지 않았다. 상인은 편지를 읽어도 좋다고 허락했다. 편지에는 동생이 지금 사는 곳, 밥을 챙겨 주는 이웃의 이름, 잊은 도면을 어디에 모아 뒀는지가 적혀 있었다. 누군가 죽어서 남긴 수수께끼가 아니었다. 아직 그곳에서 자기 과거를 묻고 있는 사람이 있었다."
      },
      {
        "node": "ISK_L04_AA2_077",
        "profile": null,
        "speaker": "피난 중인 상인",
        "text": "만나 보고 싶다면 주소를 드리겠습니다. 다만 고칠 수 있다고 말하고 가지는 마세요. 한동안 누가 조금만 말을 걸어도 원래대로 돌아온다고 기대했다가 실망했습니다. 그냥 이야기를 들어줄 사람이라면 동생도 싫어하지 않을 겁니다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_078",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "고칠 수 있다는 약속은 안 할게요. 나도 모르는 사람한테 괜찮아질 거란 말부터 듣고 싶지는 않았으니까. 나를 모르는 각청 앞에서 내가 뭘 잃었다고 생각했는지, 이번에는 기억을 잃은 쪽에게도 물어보고 싶어요."
      }
    ],
    "ISK_L04_AA2_079": [
      {
        "node": "ISK_L04_AA2_079",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "그 만남은 의미가 있겠어. 다만 네 몸이 멎었던 현상과 그 사람의 기억 변화까지 한 원인으로 묶지는 말자. 신의 눈을 거둔 뒤 생긴 변화라면 그 상황부터 따로 살펴야 해. 닮은 점을 찾는 것만큼 다른 점을 남기는 것도 필요하지."
      },
      {
        "node": "ISK_L04_AA2_080",
        "profile": null,
        "speaker": null,
        "text": "편지의 주소를 베끼며 자신이 잊힌 쪽의 이야기만 붙들고 있었다는 것을 생각했다. 각청이 나를 몰라본 순간부터 나는 기억이 사라진 사람에게 무엇이 남아 있는지를 차분히 물어본 적이 없었다. 죽음을 봤던 공포가 먼저 밀려왔기 때문이다. 저편의 살아 있는 사람에게는 조금 다른 질문을 들고 갈 수 있을 것 같았다."
      }
    ],
    "ISK_L04_AA2_089": [
      {
        "node": "ISK_L04_AA2_089",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "외곽 갈림길을 맡았다고 들었어. 몬드에 요청했던 지원도 도착했구나. 덕분에 수레 대열이 끊기지 않았어. 안쪽 피해 확인과는 별도로 이 구간에 참여한 사람들의 이름을 받고 있어. 네 이름은 알고 있으니 다시 처음부터 설명하지 않아도 돼."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_090",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 말을 들으니까 좀 이상하게 안심되네. 지난번에 네가 나를 모른다고 했을 때는 앞으로도 계속 처음부터 말해야 하는 줄 알았거든. 이 사람은 알베도야. 내가 요청해서 실제로 와 줬고, 얼마 전에는 몸이 멈춘 나를 골짜기에서 꺼내 줬어."
      }
    ],
    "ISK_L04_AA2_091": [
      {
        "node": "ISK_L04_AA2_091",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "페보니우스 기사단의 알베도야. 요청받은 현장 조사를 맡고 있어. 이번 방어와 별개로 골짜기 현상은 다시 접근하지 못하게 표시해 두었어. 위치는 담당자에게 전달하지. 지금 그 안으로 들어가 추가 확인을 할 생각은 없어."
      },
      {
        "node": "ISK_L04_AA2_092",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "좋아. 그 위치는 위험 구역으로 남길게. 도시 전체의 통제와는 구별해야겠네. 리월항의 일반 출입은 오늘 다시 열어. 해안 잔해와 무너진 건물 쪽은 계속 막지만, 기억 이상을 이유로 모든 사람을 바깥에 묶어 둘 단계는 지났어."
      },
      {
        "node": "ISK_L04_AA2_093",
        "profile": null,
        "speaker": null,
        "text": "각청은 그동안 묶였던 수레를 어느 길로 들일지 병사와 논의했다. 그녀가 일하는 손을 보았다. 죽었을 때 움직이지 않던 그 손이었고, 돌아온 뒤 자신의 편지를 보낼 길을 열어 준 손이기도 했다. 새로 나누는 대화가 앞의 두 장면 중 하나를 지우지는 않았다."
      }
    ],
    "ISK_L04_AA2_100": [
      {
        "node": "ISK_L04_AA2_100",
        "profile": null,
        "speaker": null,
        "text": "보급 접수소에서 가장 바쁜 사람은 다른 사람보다 목소리가 크지 않았다. 짐을 어느 순서로 올릴지 짧게 정하고, 올라가서는 안 되는 바닥을 발끝으로 가리켰다. 그 말에 선원들이 바로 움직였다. 담당이 그녀를 남십자 함대의 선장 북두라고 소개하자 나는 구호소에서 준비해 둔 질문을 주머니 안에서 만졌다."
      },
      {
        "node": "ISK_L04_AA2_101",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "이나즈마로 가고 싶다는 손님이 너희야? 난 북두다. 지금은 사람 태울 날짜보다 배부터 손보고 있어. 그래도 어디로 왜 가려는지는 들을 수 있지. 이 먼 데까지 와서 부두만 보고 돌아가려던 건 아닐 테니까."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_102",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나는 이도에 있는 사람을 만나려 해. 기억을 잃은 걸 겪고 있는 사람이고, 가족에게 주소와 만나도 된다는 답을 받았어. 이쪽은 나를 도와주러 몬드에서 온 알베도야. 둘이 당장 태워 달라고 밀어붙이러 온 건 아니고 필요한 준비를 알고 싶어서 왔어."
      }
    ],
    "ISK_L04_AA2_103": [
      {
        "node": "ISK_L04_AA2_103",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "나는 현장 조사와 이동 준비를 돕고 있어. 지금 이 사람의 승선 가능 여부를 먼저 확인하면 돼. 내 일정까지 승객 둘로 확정하지는 말아 줘. 리월에서 마무리할 조사가 남아 있어서."
      },
      {
        "node": "ISK_L04_AA2_104",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "좋아. 사람 수부터 정확하니 이야기하기 편하네. 이도까지 바다는 건널 수 있지만 내 배에 오른다는 것만으로 이나즈마 안을 마음대로 다닐 수 있는 건 아니야. 쇄국 때문에 입경에서 막힐 일도 따져야 하고. 만나려는 주소가 실제로 남아 있다는 확인도 해 봐야지."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_105",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "주소는 최근 편지에 적혀 있었어. 도착하면 외국 상인 쪽을 통해 먼저 연락할 생각이야. 그리고 배에 타기 전에 말해야 할 게 하나 더 있어. 내 가방에 설명하지 못하는 물건이 있고, 가까이 있던 내 몸이 움직이지 못한 일이 있었어. 지금은 돌아왔지만 없었던 일인 척하고 배에 오르고 싶지는 않아."
      }
    ],
    "ISK_L04_AA2_106": [
      {
        "node": "ISK_L04_AA2_106",
        "profile": null,
        "speaker": null,
        "text": "북두는 웃음기를 거두었다. 내가 가방을 내려놓으려 하자 지금 그 자리에서 열지 말라고 손을 들었다. 수많은 사람이 짐을 들고 오가는 통로였다. 알베도는 자신의 앞선 관찰을 넘어서 물건이 안전하다거나 위험하다고 대신 보증하지 않았다."
      },
      {
        "node": "ISK_L04_AA2_107",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그건 먼저 말해 주길 잘했네. 네 사정을 들었다고 내 선원들까지 멋대로 위험에 들일 수는 없지. 그렇다고 여기서 바다에 던지라고 할 생각도 없어. 지금은 문의를 받은 걸로 해 두자. 배를 정비하는 동안 상태와 운반 방법을 더 알아보고 나서 승선 여부를 다시 얘기하겠어."
      }
    ],
    "ISK_L04_AA2_119": [
      {
        "node": "ISK_L04_AA2_119",
        "profile": null,
        "speaker": null,
        "text": "호두는 저녁 무렵 숙소에 들렀다. 내가 실제로 지원자를 만났다는 소식을 전해 듣고 온 것이었다. 그녀는 먼저 알베도와 이름을 나누고, 내가 말없이 가방을 끌어안고 있지 않은 것을 보았다. 가방은 의자 옆에 닫힌 채 놓여 있었다. 호두가 그 안을 본 적은 여전히 없었다."
      },
      {
        "node": "ISK_L04_AA2_120",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "왔다는 사람이 정말 여기 있네. 잘됐어. 편지를 두 번 쓰더니 이번에는 사람까지 데려왔구나. 내가 자리 비운 동안 또 혼자 견디고 있는 건 아닌가 싶어서 들렀어."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_121",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "혼자였으면 큰일 났을 거야. 몸이랑 목소리가 멈췄는데 알베도가 끌고 나와 줬어. 지금은 돌아왔고 수레 대피로도 같이 지켰어. 아직 가방 안을 네게 보여 주겠다는 말은 못 하겠는데, 도와준 일까지 숨기고 싶지는 않았어."
      }
    ],
    "ISK_L04_AA2_122": [
      {
        "node": "ISK_L04_AA2_122",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "보여 줘야만 소식을 듣는 건 아니야. 오늘은 네 목소리가 돌아왔다는 말을 들었으니 됐어. 그동안 못 한 말을 한꺼번에 다 하다가 다시 목이 쉬지는 말고. 앞으로는 어떻게 할 생각이야? 여기서 더 머무를지 다음 길을 찾을지 정했어?"
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_123",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이나즈마로 가려고. 기억을 잃은 일을 겪는 사람이 아직 살아서 대답할 수 있을 때 만나 보고 싶어. 그쪽 가족한테 주소를 받았고 북두에게 배도 문의했어. 다음에는 기다리는 데서 그치지 않고 준비할 게 생겼어. 물론 아직 배에 태워 준다는 말은 못 들었고."
      }
    ],
    "ISK_L04_AA2_124": [
      {
        "node": "ISK_L04_AA2_124",
        "profile": "PROFILE_LIYUE_HUTAO",
        "speaker": "호두",
        "text": "그럼 떠나는 날 이 당주님이 네가 갑자기 사라졌다고 생각하지 않게 한 번 알려 줘. 네 짐을 열어 보라는 부탁은 안 할 테니 내가 가져온 마른 천은 받아도 되지? 그건 남의 마음을 훔쳐보는 물건은 아니거든."
      },
      {
        "node": "ISK_L04_AA2_125",
        "profile": null,
        "speaker": null,
        "text": "호두는 여행용 천을 직접 건네는 대신 포장할 때 쓸 수 있도록 숙소 주인에게 맡겼다. 아직 배편이 정해지지 않았으므로 당장 짐을 새로 꾸릴 필요는 없었다. 호두가 떠나는 동안 문까지 함께 걸었다. 자기 발로 따라가 문밖까지 나갔다가 돌아오는 단순한 일이 오늘은 작게 느껴지지 않았다."
      },
      {
        "node": "ISK_L04_AA2_126",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "출발 준비가 끝날 때까지 관찰한 내용을 정리하자. 네가 허락한 범위를 넘어서 이야기를 늘리지 않을게. 내가 직접 확인한 현상과 전해 들은 이야기를 섞지 않으면, 나중에 다른 사람에게도 네 말을 다시 지워 쓰게 만들지 않을 수 있어."
      }
    ],
    "ISK_L04_AA2_135": [
      {
        "node": "ISK_L04_AA2_135",
        "profile": null,
        "speaker": null,
        "text": "원래 편지와 새 주소를 따로 접었다. 벤티가 몬드의 일을 기억한다고 쓴 종이는 잊힌 적 없다는 증거로 남았고, 이도에서 온 편지는 잃어버린 기억에도 살아 있는 당사자가 있다는 증거로 남았다. 둘을 같은 종류의 답으로 묶지 않았다. 가방 속 구슬과 같은 유해는 여전히 설명되지 않았지만, 그 물건만이 다음 행선지를 정하는 유일한 이유는 아니게 되었다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AA2_136",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내일은 주소 사본을 한 장 더 만들고, 각청에게 남길 질문도 줄이고, 북두한테 가져갈 짐 목록을 정리할게. 너무 그럴듯한 계획 같으니까 하나 더 넣자. 아침에 늦잠을 자도 밥은 먹기. 그건 이제 누가 안 시켜도 할 수 있을 것 같아."
      }
    ],
    "ISK_L04_AA2_137": [
      {
        "node": "ISK_L04_AA2_137",
        "profile": "PROFILE_MOND_ALBEDO",
        "speaker": "알베도",
        "text": "그 정도면 내일 할 일이 충분하군. 지금 잊지 말아야 할 게 있다면 적어 두고 자. 계속 깨어 있다고 기억이 더 안전해지는 건 아니니까. 네가 잠든 동안에도 오늘 일이 없어진 것으로 바뀌지는 않아."
      },
      {
        "node": "ISK_L04_AA2_138",
        "profile": null,
        "speaker": null,
        "text": "마지막 문장을 오래 보다가 등불을 조금 낮췄다. 불빛은 이번에는 구슬 쪽으로 당겨지지 않았다. 방 안의 소리는 제자리에서 났고, 손은 자신이 정한 곳에 가서 멈췄다. 배가 정해지면 떠날 사람으로 그 밤을 맞이했다. 이나즈마는 아직 바다 건너였지만 기다리기만 하던 목적지는 아니었다."
      },
      {
        "node": "ISK_L04_AA2_139",
        "profile": null,
        "speaker": null,
        "text": "잠들기 전 숙소로 칠성의 정산 담당이 찾아와 외곽 피난수레 방어에 대한 공적 정산을 안내했다. 내 몫은 1,800모라와 영웅의 경험 두 개, 모험가의 경험 세 개였다. 함께 싸운 사람들의 몫과 구분된 명단을 확인한 뒤 수령할 차례가 돌아왔다."
      }
    ],
    "ISK_L04_AB1_003": [
      {
        "node": "ISK_L04_AB1_003",
        "profile": null,
        "speaker": "경비병",
        "text": "가까운 치료소로 옮겼습니다. 지금 이 방에서 제가 알려 드릴 수 있는 건 그 정도입니다. 옥형 님께서 돌아오시면 더 물어보실 수 있습니다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_004",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그래. 고마워. 조금 전에는 내가 뭘 말해도 살인한 사람이 변명하는 소리가 될 것 같았는데, 그 정도 대답이면 지금은 충분해. 물이 더 필요하면 또 부를게. 귀찮아서 모른 척하지는 말고."
      }
    ],
    "ISK_L04_AB1_005": [
      {
        "node": "ISK_L04_AB1_005",
        "profile": null,
        "speaker": null,
        "text": "경비병은 문 밖에서 알겠다고 답했다. 의자에 등을 붙였다. 구슬은 품 안에서 잠잠했다. 이것을 꺼내 흔들면 무슨 일이든 설명해 줄 것 같은 기대가 잠깐 들었지만, 무대에서 이미 그 기대보다 더 많은 사람이 다쳤다. 주머니 위에 손을 얹은 채 문이 열리는 쪽을 보았다."
      },
      {
        "node": "ISK_L04_AB1_006",
        "profile": null,
        "speaker": null,
        "text": "먼저 들어온 사람은 운근이었다. 먼지를 닦지 못한 소매를 여미면서도 시선은 곧바로 나에게 갔다. 각청과 무대를 세웠던 목수가 뒤따라 들어왔다. 운근의 손에는 접은 천이 있었지만, 그것을 나에게 덥석 건네지 않고 탁자 가운데 조심스럽게 폈다."
      },
      {
        "node": "ISK_L04_AB1_007",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "오래 기다리게 해서 미안해요. 공연장 뒤를 확인했어요. 제가 혼자 본 이야기를 더 얹으러 온 것은 아니고요. 이 물건이 어디서 떨어졌는지 직접 아는 분을 모셔 왔습니다."
      }
    ],
    "ISK_L04_AB1_010": [
      {
        "node": "ISK_L04_AB1_010",
        "profile": null,
        "speaker": null,
        "text": "쇳조각의 끝에는 닦이지 않은 어두운 자국이 남아 있었다. 그것을 오래 보지 못했다. 목수는 천을 조금 접어 날카로운 부분을 가렸다. 관리인의 몸을 확인한 사람의 기록에는 옷 아래에서 발견한 짧은 금속과 상처의 방향이 적혀 있었다. 창을 찾던 사람들에게는 눈에 들어오지 않았던 무대의 일부였다."
      },
      {
        "node": "ISK_L04_AB1_011",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "아직 누가 가로대를 건드렸는지, 저 조각이 정확히 언제 부러졌는지는 조사해야 해. 하지만 사람들이 말한 창 공격으로는 남은 상처를 설명할 수 없어. 그리고 그들이 널 보았다는 무대 위 자리는, 네가 구조를 시작했을 때 이미 바닥이 무너져 있었어."
      },
      {
        "node": "ISK_L04_AB1_012",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "관객이 찍어 둔 표시가 있었어요. 아이가 무대 앞으로 나가지 않게 어머니가 바닥에 천을 펴 놓으셨는데, 그 위에 떨어진 널빤지가 덮여 있었습니다. 사람들은 그 널빤지가 떨어진 뒤에도 당신이 그 자리에 서 있었다고 했어요. 저는 그때 당신과 계단 밑에 있었고요."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_013",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 내 손이 저 사람을 찌른 손은 아니었다는 거지? 말 한마디로 전부 끝내 달라는 건 아닌데, 나는 그 사람 허리를 받쳤던 것까지 의심하고 있었어. 다들 그렇게 선명하게 봤다고 하니까 나만 내 팔을 모르는 기분이었거든."
      }
    ],
    "ISK_L04_AB1_026": [
      {
        "node": "ISK_L04_AB1_026",
        "profile": null,
        "speaker": null,
        "text": "목수가 먼저 나간 뒤 운근은 문에 관해 덧붙였다. 공연장 뒷문은 안쪽 빗장이 걸려 있었지만 아래 널판 한 장이 들리도록 고쳐져 있었다. 무대 밑으로 물건을 넣는 틈이었다. 관리인이 그곳을 이용했다는 것은 동료가 확인했다. 그러나 노인이 보았다는 바깥으로 나가는 사람의 얼굴은 누구도 제대로 보지 못했고, 진흙 발자국 일부는 관리인의 신발과 맞지 않았다."
      },
      {
        "node": "ISK_L04_AB1_027",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "문이 잠겨 있었다고 누구도 지나가지 않았다고 할 수는 없더군요. 제가 그 틈을 찾기 전에는 노인분과 아이 중 한쪽이 잘못 기억했다고만 생각했어요. 여전히 모르는 부분이 있지만, 모른다는 이유로 쉬운 쪽을 골라서는 안 되겠죠."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_028",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내가 여기 있는 동안 저 문 밑까지 기어가 봤어요? 소매가 왜 그렇게 됐나 했네. 고맙다고 말하고 끝내기에는 네가 너무 많이 움직였는데. 다음에는 내가 높은 데 있는 물건 정도는 내려 줄게. 노래는 못 하니까 거기까지는 기대하지 말고."
      }
    ],
    "ISK_L04_AB1_029": [
      {
        "node": "ISK_L04_AB1_029",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "높은 곳은 의자가 있으면 돼요. 대신 오늘 다 끝나고 나서도 이 공연장을 기억해 주세요. 끔찍한 일만 일어난 곳으로 남겨 두고 싶지는 않아서요. 오전에 당신이 나르던 발판도 여기 있었잖아요."
      },
      {
        "node": "ISK_L04_AB1_030",
        "profile": null,
        "speaker": null,
        "text": "문 밖으로 발을 내디뎠다. 경비병이 길을 비켜 주었다. 그 단순한 움직임이 생각보다 크게 느껴졌다. 마당에는 자신을 붙잡았던 교대 병사가 서 있었다. 그는 사과하려 입을 열었다가, 입 안에 남은 장면을 삼키지 못하고 눈을 내렸다."
      },
      {
        "node": "ISK_L04_AB1_031",
        "profile": null,
        "speaker": "교대 병사",
        "text": "제가 본 것을 아직도 지울 수 없습니다. 그런데 남은 물건이 제 기억과 맞지 않는 것도 들었습니다. 당신에게 틀림없다고 말했던 건…… 그렇게 말하면 제가 본 것이 무너지지 않을 줄 알았던 것 같습니다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_032",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "당장 잊어버리라고 하면 내가 네가 겪던 일에 했던 말까지 다 거꾸로 뒤집는 거겠지. 그래도 다음에는 나한테 대답할 자리부터 줘. 네 손에 붙잡혀 있을 때 아픈 것보다, 네가 내 말을 들을 생각이 없어 보이는 게 더 무서웠어."
      }
    ],
    "ISK_L04_AB1_038": [
      {
        "node": "ISK_L04_AB1_038",
        "profile": null,
        "speaker": null,
        "text": "면담 병사는 의자들을 정리하다가 나에게 빈자리를 보여 주었다. 돌아오면 앉으라고 남겨 둔 자리였다. 죽음에서 돌아온 사람이 기다려 준다는 사실을 여전히 받아들이기 어려웠다. 그러나 그가 지금 팔에 힘을 주며 의자를 옮기는 모습을 보고 있으면, 물어야 할 질문보다 같이 들어야 할 끝이 먼저 눈에 들어왔다."
      },
      {
        "node": "ISK_L04_AB1_039",
        "profile": null,
        "speaker": "면담 병사",
        "text": "그분 가족에게는 제가 아는 사람이 연락하러 갔습니다. 공연장에 들어오기 전에 이름을 물었는데, 그때 제가 대충 듣고 넘겼습니다. 지금 와서 자꾸 다시 생각납니다. 오늘 이 일이 없었으면 계속 이름도 모르고 만났을 겁니다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_040",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나도 망치질 가르쳐 준 사람이라고만 생각했어. 나를 혼냈던 장면이 남아서 다행이라고 해야 하나. 마지막에 죽은 모습만 남는 것보다는 그쪽이 그 사람 같거든. 네가 알고 있는 건 나중에 가족이 들을 마음이 생겼을 때 말해 주자."
      }
    ],
    "ISK_L04_AB1_041": [
      {
        "node": "ISK_L04_AB1_041",
        "profile": null,
        "speaker": null,
        "text": "운근은 부러진 가로대 옆에 엎어진 작은 찻잔을 세웠다. 손잡이가 떨어져 나갔지만 누군가 바로 버리지 못하고 남겨 둔 물건이었다. 그녀는 앞으로 공연을 다시 할 수 있을지 생각하기 전에, 그 자리에 있던 사람들의 짐을 돌려보내는 일을 끝내야 한다고 말했다. 낮에 흥미로운 소재를 얻었다고 웃던 사람과 같은 얼굴이었다."
      },
      {
        "node": "ISK_L04_AB1_042",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "사람의 이야기를 듣는 일이 늘 즐겁기만 할 수는 없겠죠. 그래도 오늘 일을 곧바로 무대에 올리겠다는 약속은 하지 않을래요. 누군가의 마지막 날이 제 새로운 작품이 되는 건, 제가 감동했다고 정할 일이 아니니까요."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_043",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나도 내 얘기를 멋있게 만들어 달라는 부탁은 못 하겠네. 내가 실제로 한 일보다 괜찮은 사람이 되어 버리면 그걸 들으면서 계속 눈치를 볼 것 같거든. 다만 오전에 기다리던 사람이 밥부터 먹는 이야기는 나중에 다시 듣고 싶어요."
      }
    ],
    "ISK_L04_AB1_044": [
      {
        "node": "ISK_L04_AB1_044",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "그건 들려드릴 수 있어요. 결말은 아직 바꿀 수 있고요. 돌아온 사람과 기다린 사람이 서로에게 서운한 말을 한참 하고 나서, 식은 밥을 함께 데워 먹는 쪽으로요."
      },
      {
        "node": "ISK_L04_AB1_045",
        "profile": null,
        "speaker": null,
        "text": "멀리서 커다란 물체가 부서지는 소리가 났다. 처음에는 창고 지붕을 내리는 줄 알았다. 다음 충격이 땅을 타고 발바닥에 닿자 마당의 사람들이 동시에 몸을 돌렸다. 바다 쪽 하늘이 어두워졌고, 구름 아래에서 도저히 파도라고 부를 수 없는 높이의 물기둥이 솟고 있었다."
      },
      {
        "node": "ISK_L04_AB1_046",
        "profile": null,
        "speaker": null,
        "text": "그 물기둥이 방향을 바꾸었다. 멀리 떠 있던 군옥각 아래로 커다란 형체가 들어 올려졌다. 병사 하나가 달려와 선인들이 항구 방어에 나섰고 칠성이 해안 쪽 사람들을 안으로 들이지 말라는 명령을 보냈다고 외쳤다. 각청은 이미 말을 타고 휴식소 입구에 도착해 있었다."
      },
      {
        "node": "ISK_L04_AB1_047",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "다들 바다와 반대쪽으로 움직여! 이곳도 낮아서 물이 들면 위험해. 운근 씨, 단원들 중 길을 아는 분이 있으면 사람을 나눠 데려가 주세요. 지금부터 이 마당은 짐을 지키는 곳이 아니라 지나가는 곳이에요."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_048",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "저게 대체 뭐야. 아까 무대에서 보였던 물이 또 보이는 거면 좋겠는데, 이번에는 모두 같은 쪽을 보고 있잖아. 각청, 정말 바다에서 올라온 거야?"
      }
    ],
    "ISK_L04_AB1_049": [
      {
        "node": "ISK_L04_AB1_049",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "오셀이야. 자세한 설명을 듣고 있을 시간이 없어. 너도 이동해. 저쪽 옛 수문을 지나 높은 창고 마당까지 가면 돼. 그 길이 막히면 휴식소 사람들이 한꺼번에 큰길로 몰려."
      },
      {
        "node": "ISK_L04_AB1_050",
        "profile": null,
        "speaker": null,
        "text": "각청은 대답을 기다리지 않고 마당을 가로질러 쓰러진 짐을 치웠다. 먼 바다의 형체와 손안에 남은 나무 먼지를 번갈아 보았다. 감방에서 나오자마자 세상이 다시 사람을 시험하는 것 같았다. 그러나 이번에는 나를 향해 오는 손이 범인을 붙잡으려는 손만은 아니었다. 의자를 함께 들던 병사가 수레의 다른 쪽을 가리켰다."
      }
    ],
    "ISK_L04_AB1_053": [
      {
        "node": "ISK_L04_AB1_053",
        "profile": null,
        "speaker": null,
        "text": "운근은 노래를 부르지 않았다. 마당 끝까지 고르게 닿는 목소리로 다음에 걸을 곳을 반복했다. 소리가 닿자 불안해서 되묻던 사람들이 움직였고, 병사들은 그 틈에서 넘어진 사람을 일으켰다. 사라지는 무대 대신 움직이는 사람들의 줄을 보았다. 그녀가 쌓아 온 훈련이 다른 모양으로 사람들을 붙잡고 있었다."
      },
      {
        "node": "ISK_L04_AB1_054",
        "profile": null,
        "speaker": null,
        "text": "휴식소를 떠나는 길에서 한 노인이 자신의 악기 상자를 놓지 못했다. 옆 사람은 그깟 나무통이라고 화를 냈지만 노인은 상자 손잡이를 더 세게 쥐었다. 내가 한쪽을 들어 보자 짧은 끈 아래에 손수 깎은 작은 다리 여러 개가 달랑거렸다. 물건을 파는 상자이자 오래 써 온 작업대였다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_055",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "손잡이 이쪽은 내가 들게. 대신 아저씨가 혼자 붙잡고 버티면 나까지 여기 서 있어야 돼. 밥벌이는 중요하지. 그러니까 둘이 들고 밥 먹을 수 있는 데까지 갑시다."
      }
    ],
    "ISK_L04_AB1_056": [
      {
        "node": "ISK_L04_AB1_056",
        "profile": null,
        "speaker": "악기 수리공",
        "text": "그렇게까지 할 것은…… 미안하네. 이걸 버리고 나면 어디에 앉아서 무엇을 해야 할지 모르겠어서 그랬어. 길이 막힌 뒤로 계속 손에 두고 있었지."
      },
      {
        "node": "ISK_L04_AB1_057",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "이분은 제가 데리고 갈게요. 뒤에 작은 수레가 하나 있어요. 짐을 같이 실으면 다른 분들 발밑도 덜 복잡해질 거예요. 당신은 앞에서 병사분이 부르는 것 같은데요."
      },
      {
        "node": "ISK_L04_AB1_058",
        "profile": null,
        "speaker": null,
        "text": "옛 수문 쪽에서 교대 병사가 손을 흔들었다. 물이 불어나기 전에 닫혀야 할 문이 중간에 걸려 있었고, 물길에 떠밀린 물 슬라임 두 마리가 둑으로 올라와 움직이고 있었다. 상류의 얕은 둑을 넘으면 피난민이 걷는 길이었다. 각청은 먼저 다친 사람을 데리고 건너가며 병사들에게 수문 손잡이를 돌릴 시간을 벌어 달라고 했다."
      }
    ],
    "ISK_L04_AB1_060": [
      {
        "node": "ISK_L04_AB1_060",
        "profile": null,
        "speaker": "교대 병사",
        "text": "제가 앞을 막겠습니다. 당신은 사람들을 데려가 주십시오. 아까 일을 만회하겠다고 하는 말은 아닙니다. 여기는 원래 제 근무 구역이고, 어디가 무너질지 제가 더 잘 압니다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_061",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "만회라는 말 안 한 건 잘했어. 나도 누가 죽어야 풀리는 사과 같은 건 받고 싶지 않아. 네가 길을 알면 뒤로 빠질 때도 알려 줘. 나는 수문 돌리는 사람들 옆을 맡을게. 서로 따로 용감해지지는 말자."
      }
    ],
    "ISK_L04_AB1_062": [
      {
        "node": "ISK_L04_AB1_062",
        "profile": null,
        "speaker": null,
        "text": "검을 꺼냈다. 구슬은 꺼내지 않았다. 무엇을 할지 모르는 물건에 사람들의 피난 시간을 걸 수 없었다. 운근은 긴 무기를 손에 쥐고 수문과 피난민 사이로 내려왔다. 내가 돌아보자 그녀는 목소리를 낮추어 앞쪽은 병사들에게 맡기고 가까이 오는 것만 막겠다고 했다."
      },
      {
        "node": "ISK_L04_AB1_063",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "무대에서 익힌 동작을 여기서 뽐낼 생각은 없어요. 다만 제가 닿을 수 있는 사람을 두고 위에서 계속 부르기만 할 수는 없잖아요. 길이 열리면 저부터 물러나라고 말해 주세요."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_064",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알겠어요. 대신 넘어지는 사람 쪽으로 둘 다 뛰지는 말자. 내가 오른쪽을 보고, 운근 씨는 손잡이 쪽을 봐 줘요. 오늘은 잘했다고 박수 받을 일보다 다 같이 투덜거리며 돌아갈 일이 더 좋겠어."
      }
    ],
    "ISK_L04_AB1_067": [
      {
        "node": "ISK_L04_AB1_067",
        "profile": null,
        "speaker": null,
        "text": "마지막으로 길목을 넘어오던 적이 물러나자 수문이 땅을 울리며 내려왔다. 물살은 낮은 피난길을 비껴 빈 수로 쪽으로 터졌다. 문이 완전히 닫히는 동안 교대 병사가 내 어깨를 잡아 끌었고, 운근은 손잡이를 돌리다 주저앉은 사람을 부축했다. 누구도 그 자리를 지켰다는 이유로 끝까지 남아 있지 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_068",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "다 건넜어? 저 뒤에 상자 든 아저씨도? 좋아. 그러면 우리도 갑시다. 내 다리는 아직 걸을 수 있을 때 쓰는 게 좋겠네. 다음에는 일터에서 손에 쥐여 주는 게 망치든 검이든 일단 한 번 더 생각할 거야."
      }
    ],
    "ISK_L04_AB1_069": [
      {
        "node": "ISK_L04_AB1_069",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "생각하시는 동안 제가 먼저 건너가 있을게요. 방금 천천히 빠지라고 말한 사람이 마지막까지 남아 있으면 약속이 어긋나잖아요. 팔은 이쪽으로 주세요. 기대는 정도는 괜찮아요."
      },
      {
        "node": "ISK_L04_AB1_070",
        "profile": null,
        "speaker": null,
        "text": "내민 팔을 잡았다. 자신을 도와주느라 그녀도 팔에 힘이 풀렸다는 것을 느끼고 조금 덜 기댔다. 높은 창고 마당에 올라서자 바다가 한눈에 들어왔다. 군옥각에서는 빛줄기가 이어졌고 그 주변을 선인들의 힘과 천암군의 움직임이 채우고 있었다. 오셀의 몸을 내 검으로 어떻게 해 볼 수 있으리라는 생각은 들지 않았다."
      }
    ],
    "ISK_L04_AB1_072": [
      {
        "node": "ISK_L04_AB1_072",
        "profile": null,
        "speaker": null,
        "text": "지상으로 내려온 연락 병사는 군옥각에서 방어를 이어 가고 있으며 옥형은 해안 쪽 마지막 인원을 물리고 있다고 전했다. 바다 위에서 쏟아진 충격이 해안을 때릴 때마다 마당의 사람들이 서로를 붙잡았다. 악기 상자를 수레에서 내려 바퀴 아래 받침으로 밀었다가 수리공의 표정을 보고 빈 나무통으로 바꿨다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_073",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "미안해요. 아까 밥벌이를 구해 놓고 지금 바퀴 받침으로 쓸 뻔했네. 정신없을 때도 남의 물건은 남의 물건인데. 대신 이 손잡이는 같이 붙잡아 줘요. 수레가 미끄러지면 사람 쪽으로 가니까."
      }
    ],
    "ISK_L04_AB1_074": [
      {
        "node": "ISK_L04_AB1_074",
        "profile": null,
        "speaker": "악기 수리공",
        "text": "내려놓기만 하면 되는 일을 자꾸 못 놓네. 자네도 손이 다쳤잖아. 옆으로 비켜. 나무통이 움직이면 내가 발로 막겠네. 다리에 힘은 아직 남았어."
      },
      {
        "node": "ISK_L04_AB1_075",
        "profile": null,
        "speaker": null,
        "text": "멀리 떠 있던 군옥각의 빛이 달라졌다. 공격이 멈춘 것처럼 보이더니 건물 전체가 바다의 형체를 향해 낮아지기 시작했다. 사람들은 처음에는 추락하는 줄 알고 소리를 질렀다. 연락 병사가 모두 벽 아래로 몸을 낮추라고 외쳤다. 운근과 함께 아이들을 안쪽으로 밀어 넣고, 그제야 하늘에 있던 집이 무엇을 향하고 있는지 알아차렸다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_076",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "저걸 일부러 내리는 거야? 사람들은 빠져나온 거지? 건물이 바다로 가고 있어. 운근 씨, 여기 사람들은 내가 볼 테니까 저 뒤에 남은 단원 있는지 확인해 줘요!"
      }
    ],
    "ISK_L04_AB1_077": [
      {
        "node": "ISK_L04_AB1_077",
        "profile": null,
        "speaker": null,
        "text": "군옥각이 바다를 덮었다. 충격은 소리보다 먼저 가슴을 눌렀고, 마당 끝의 먼지와 물보라가 한꺼번에 일어났다. 눈을 감고 양팔로 앞사람을 감쌌다. 건물의 조각들이 무엇인지 알아볼 수 없는 크기로 흩어지는 동안, 거대한 형체도 아래로 눌려 사라졌다. 그것은 한 사람의 결투가 끝나는 모습과는 전혀 달랐다."
      },
      {
        "node": "ISK_L04_AB1_078",
        "profile": null,
        "speaker": null,
        "text": "처음 들린 것은 울음이었다. 이어서 누군가 살아 있는 사람의 이름을 불렀고, 대답들이 마당 여기저기서 돌아왔다. 운근은 말을 잇기 전에 숨을 깊이 들이쉬었다. 다시 사람들을 불렀을 때 목소리는 조금 쉬었지만 끝까지 닿았다. 바다에 생긴 빈자리를 보았다. 건물이 있었던 자리에는 더 이상 돌아갈 문이 없었다."
      },
      {
        "node": "ISK_L04_AB1_079",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "그 자리에서 움직일 수 있는 분은 손을 들어 주세요. 대답이 어려우시면 옆 사람을 잡아 주세요. 이제 찾을 수 있어요. 한 번에 모두 말씀하지 않으셔도 돼요. 저희가 차례로 갈게요."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_080",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "여기 있어요. 나도 있고, 이쪽 사람도 살아 있어. 저 밑으로 내려가려는 사람은 잠깐 기다려 줘요. 아직 뭐가 떠내려오는지 모르니까. 살아남자마자 또 뛰어들면 도와준 사람들이 너무 허무하잖아."
      }
    ],
    "ISK_L04_AB1_081": [
      {
        "node": "ISK_L04_AB1_081",
        "profile": null,
        "speaker": null,
        "text": "각청이 마당으로 올라왔을 때 옷자락에는 흙과 바닷물이 말라붙어 있었다. 그녀는 먼저 인원과 부상자를 확인했고, 내가 수문을 지켰다는 보고에는 짧게 고개를 끄덕였다. 손을 뻗었다가 자신의 장갑에도 피가 묻어 있다는 것을 보고 멈췄다. 내가 대신 깨끗한 천 끝을 내밀었다."
      },
      {
        "node": "ISK_L04_AB1_082",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "응광이 군옥각을 내려 오셀을 다시 눌렀어. 선인들과 사람들이 마지막까지 함께 버텼고. 바다 쪽이 안정되면 수색을 시작할 거야. 아직 돌아가서 잃어버린 짐을 찾을 때는 아니야."
      }
    ],
    "ISK_L04_AB1_088": [
      {
        "node": "ISK_L04_AB1_088",
        "profile": null,
        "speaker": null,
        "text": "관리인의 장례 소식은 치료소로 전해졌다. 옷에 남은 먼지를 털다가 손을 멈췄다. 멀끔하게 보이려고 할수록 자신이 무슨 자격으로 가는지 생각하게 되었다. 운근은 새 옷을 고르라고 하지 않고, 오래 서 있지 않아도 될 자리를 가족이 마련했다고 알려 주었다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_089",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나를 보고 화를 내셔도 받아들이면 되는 줄 알았는데, 막상 가려니까 무서워. 나를 용서해 줘야 내 마음이 편해지는 식으로 서 있고 싶지는 않거든. 내가 할 말은 도움을 받았다는 거지, 내가 얼마나 힘들었는지가 아니니까."
      }
    ],
    "ISK_L04_AB1_090": [
      {
        "node": "ISK_L04_AB1_090",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "그것만 말씀하셔도 될 거예요. 아무 말도 하기 어려워지면 잠깐 옆으로 물러나도 되고요. 가족분들은 그날 함께 있던 사람이 오는지 알고 싶어 하셨어요. 당신에게 정해진 표정을 보여 달라고 하신 것은 아니에요."
      },
      {
        "node": "ISK_L04_AB1_091",
        "profile": null,
        "speaker": null,
        "text": "작은 마당에 들어서자 관리인의 가족이 조용히 자리를 내주었다. 고개를 숙였고, 준비했던 말을 한동안 시작하지 못했다. 유족은 서두르지 않았다. 멀리서 오셀을 막았다는 이야기를 듣고 온 사람도 있었지만, 이 마당에서는 그것이 먼저 꺼낼 이야기가 아니었다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_092",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그분이 제 손가락을 다치지 않게 해 주셨어요. 망치를 어떻게 잡는지도 가르쳐 주셨고요. 마지막에는 제가 몸을 받쳤는데 끝까지 지켜 드리지 못했습니다. 제가 도왔다고만 기억되게 하고 싶지는 않았어요. 그분이 먼저 저를 도와주셨다는 말씀을 드리러 왔습니다."
      }
    ],
    "ISK_L04_AB1_093": [
      {
        "node": "ISK_L04_AB1_093",
        "profile": null,
        "speaker": "유족",
        "text": "일하다가 남을 혼내는 일이 많았어요. 손을 그렇게 두면 다친다고, 급하게 하다가 다시 하면 더 늦는다고요. 집에서도 같은 말을 했습니다. 그날도 그랬군요."
      },
      {
        "node": "ISK_L04_AB1_094",
        "profile": null,
        "speaker": null,
        "text": "유족이 고개를 끄덕인 뒤 나는 더 말을 늘리지 않았다. 운근은 마당 한쪽에서 목수와 함께 상 위에 놓인 작은 물건을 바로 세웠다. 누군가 용서했다는 선언도, 이제 괜찮아졌다는 결말도 없었다. 다만 관리인이 일하던 때의 목소리가 이곳에 있는 사람들의 기억 속에서 잠깐 같은 모습으로 겹쳤다."
      }
    ],
    "ISK_L04_AB1_104": [
      {
        "node": "ISK_L04_AB1_104",
        "profile": null,
        "speaker": null,
        "text": "병사는 웃다가 자신이 죽었던 이야기를 아직 이해할 수 없다고 말했다. 이해할 수 있게 만들어 주겠다는 약속을 하지 않았다. 옆에 있던 교대 병사도 기억이 아직 달라지지 않았다고 인정했다. 세 사람은 그 불편한 말을 한 뒤 같은 의자 주변에서 물을 마셨다. 이번에는 누구도 그것을 끝난 일처럼 서둘러 덮지 않았다."
      },
      {
        "node": "ISK_L04_AB1_105",
        "profile": null,
        "speaker": null,
        "text": "악기 수리공이 나를 찾아온 것은 다음 날 아침이었다. 그는 고맙다는 말과 함께 고친 물통 고리를 가져왔다. 구해 준 값을 물건으로 갚겠다고 하자 내가 손사래를 쳤고, 수리공은 대신 망가진 고리만 달아 주겠다고 고집했다. 내가 실제로 풀어진 고리를 내밀자 그제야 이야기가 편해졌다."
      },
      {
        "node": "ISK_L04_AB1_106",
        "profile": null,
        "speaker": "악기 수리공",
        "text": "부두에서 자네 이야기를 들었네. 서로 알던 사람이 기억을 못 해서 곤란했다더군. 소문처럼 이야기하고 싶지 않아서 직접 물으러 왔어. 내가 받은 편지에도 비슷한 말이 있거든. 내 누이가 이나즈마에서 보내온 거야."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_107",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나를 데려온 사람이 나를 기억하지 못해. 그뿐 아니라 사람들끼리 같은 순간을 다르게 기억하기도 했고. 소문 중에는 내가 직접 겪지 않은 말도 섞였을 거야. 아저씨 편지에는 무슨 일이 적혔어요?"
      }
    ],
    "ISK_L04_AB1_108": [
      {
        "node": "ISK_L04_AB1_108",
        "profile": null,
        "speaker": null,
        "text": "수리공은 여러 번 접힌 편지를 폈다. 누이가 쓰는 문장과 글씨를 오래 보아 왔다고 먼저 말했다. 편지에는 자기 집에 돌아온 친척이 함께 지내던 몇 해를 기억하지 못한다는 내용이 있었다. 그 사람이 사라졌을 때 물에 빠져 죽었다는 이야기를 들었으나 몸은 직접 확인하지 못했고, 이제는 살아서 문 앞에 돌아왔다는 것이다. 내 경험과 같다고 단정할 수는 없었다."
      },
      {
        "node": "ISK_L04_AB1_109",
        "profile": null,
        "speaker": "악기 수리공",
        "text": "처음에는 집을 떠났다가 변명하는 줄 알았어. 빚이 있었나, 남에게 못할 짓을 했나 싶었지. 그런데 누이가 쓰기를, 돌아온 친척이 예전에 내게 선물받아 아끼던 작은 장난감조차 본 적 없는 물건이라며 치우려 한다더군. 우리 집에서 여러 번 함께 만졌던 것을 남의 짐처럼 보는 게 이상하다고 했어."
      },
      {
        "node": "ISK_L04_AB1_110",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "그 편지는 언제 받으셨나요? 이번 소식이 건너간 뒤 쓰인 것이라면 들은 이야기가 섞일 수 있잖아요. 전에 받은 것이면 그쪽 사정부터 따로 알아볼 이유가 있을 것 같고요."
      },
      {
        "node": "ISK_L04_AB1_111",
        "profile": null,
        "speaker": "악기 수리공",
        "text": "리월항이 이번에 막히기 전에 받았네. 그때부터 돌아갈 방법을 구하고 있었어. 이곳도 막히고 바다 건너는 더 복잡하니 짐을 풀지도 못했지. 내가 직접 보고 싶어도 못 가는 동안 편지의 사람이 계속 달라지고 있을까 봐 겁나."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_112",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나도 그 사람을 만나 보고 싶어요. 같은 일이라고 우기는 게 아니라, 내가 모르는 곳에서도 무슨 일이 있는지 직접 물어보고 싶어. 지금까지는 다른 사람이 없다고 말하면 여기서 계속 같은 바닥만 보게 됐거든. 바다 건너에 물어볼 사람이 있다면 가 볼 이유는 생기네."
      }
    ],
    "ISK_L04_AB1_116": [
      {
        "node": "ISK_L04_AB1_116",
        "profile": null,
        "speaker": null,
        "text": "각청은 그 편지를 보며 한동안 말이 없었다. 자신의 예전 기억이 돌아올 때까지 나를 리월에 붙잡아 둘 수는 없다는 것을 그녀도 알고 있었다. 대신 새로 조사한 내용을 읽고 사본을 돌려주었다. 리월에서 벌어진 기억 문제를 외국의 질병이나 누군가의 죄로 떠넘기는 문서가 되지 않게 목적을 정리하겠다고 했다."
      },
      {
        "node": "ISK_L04_AB1_117",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "네가 가서 보고 들은 것을 보내 주면 도움이 되겠어. 하지만 내 기억을 찾으려고 무리하지는 마. 네가 여기 온 이유가 나였다고 해도 앞으로 갈 곳까지 내가 정할 수는 없으니까."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_118",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그건 알아. 처음에는 네가 데려왔다는 말만 붙잡고 있었는데, 그 말을 계속 반복한다고 네가 돌아오는 것도 아니더라. 그래도 이번에는 내가 갈 이유를 직접 고를 수 있겠네. 사라진 시간을 찾는다고 지금 시간을 전부 같은 자리에서 쓰고 싶지는 않아."
      }
    ],
    "ISK_L04_AB1_123": [
      {
        "node": "ISK_L04_AB1_123",
        "profile": null,
        "speaker": null,
        "text": "운근이 소개한 부두 관계자를 통해 북두를 만났다. 나에게는 처음 보는 사람이었고, 북두에게도 리월의 최근 소문으로 이름만 들은 낯선 방문자였다. 그녀는 일을 보던 선원에게 잠깐 기다리라고 한 뒤, 내 붕대와 들고 온 편지를 한 번씩 보았다. 곁에 선 운근이 건너갈 길을 묻고 싶어 찾아왔다고 소개했다."
      },
      {
        "node": "ISK_L04_AB1_124",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "이나즈마라. 막힌 나라에 가겠다는 사람이 요즘 더 많아졌네. 가서 누구를 만나려는지부터 들을까? 바다를 건너는 것과 도착해서 마음대로 걷는 건 다른 일이야."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_125",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "몬드에서 온 명예기사야. 각청을 도우러 리월에 왔는데, 이번에는 바다 건너 사람을 만나서 확인할 일이 생겼어. 리월에서는 죽은 사람을 봤는데 다시 살아 나타났고, 나를 알던 사람은 나를 몰랐어. 저쪽 편지에도 닮은 일이 적혀 있는데, 같은 원인인지 아닌지 직접 듣고 싶어. 내가 겪은 걸 해결해 줄 나라가 있다고 믿는 건 아니고."
      }
    ],
    "ISK_L04_AB1_126": [
      {
        "node": "ISK_L04_AB1_126",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "처음 들으면 술 마시고 꾼 꿈이라고 하겠지만, 네가 그 말 때문에 고생했다는 이야기는 들었어. 배에 태울지 정하기 전에 목적은 알아야 하니까 물은 거야. 그렇다고 그 편지 한 장이 입항 허가증이 되는 건 아니고."
      },
      {
        "node": "ISK_L04_AB1_127",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "그 점을 알아보러 온 거예요. 급한 마음에 배만 타고 도착하면 된다고 생각하지 않도록요. 저는 리월에 남아야 하지만 이분이 떠난 뒤 연락을 받을 수 있게 도와드릴 수는 있어요."
      },
      {
        "node": "ISK_L04_AB1_128",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "좋아. 다음 항해 준비가 맞는지 선원과 확인해 볼게. 배에 태운다면 내 배의 규칙을 따라야 해. 몸이 회복되지 않았는데 괜찮다고 우기지 말고, 기상과 입항 사정 때문에 기다려야 하면 기다려. 그 정도는 할 수 있겠어?"
      }
    ],
    "ISK_L04_AB1_138": [
      {
        "node": "ISK_L04_AB1_138",
        "profile": null,
        "speaker": null,
        "text": "북두는 담당 선원을 불러 내 이름과 목적, 필요한 입항 관련 서류를 확인하게 했다. 출항 날짜를 그 자리에서 약속하지는 않았다. 체류 중 연락받을 곳을 적었다. 북두는 이나즈마의 가족에게 먼저 보낼 소개장을 보고 담당 선원에게 전달 가능한 편이 있는지도 확인하게 했다. 실제로 움직일 일이 생기자 막연한 바다 건너가 지도 위의 길로 바뀌었다."
      },
      {
        "node": "ISK_L04_AB1_139",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "오늘은 여기까지 하자. 배가 준비되는 것과 네가 준비되는 걸 같이 맞추면 돼. 다시 올 때는 붕대를 숨기지 마. 내가 바다에서 몰랐던 상처를 발견하는 것보다는 여기서 기다리는 게 훨씬 싸게 먹혀."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_140",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "모든 사람이 나한테 밥 먹고 상처 보이라고 하네. 믿음직해 보이려고 자세도 좀 폈는데. 알겠어. 나중에 배에 타면 선장한테 처음부터 거짓말한 사람으로 시작하지는 않을게."
      }
    ],
    "ISK_L04_AB1_141": [
      {
        "node": "ISK_L04_AB1_141",
        "profile": null,
        "speaker": null,
        "text": "선착장을 나왔을 때 운근은 생각보다 오래 함께 걷고 있었다. 내가 공연 준비는 괜찮으냐고 묻기 전에 그녀가 먼저 시간표를 접었다. 당분간 큰 무대보다 단원들의 회복과 작은 공연부터 맞출 생각이라고 했다. 돌아갈 자리가 있는 사람도 그 자리를 다시 만드는 데 시간이 필요했다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB1_142",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "다음에 돌아오면 이번에는 돈 내고 보러 올게요. 무대도 안 부수고, 공연 중에 소리도 안 지르고. 약속을 이렇게 하면 괜히 불길한가. 그냥 끝까지 잘 듣고 감상을 말하러 올게요."
      }
    ],
    "ISK_L04_AB1_143": [
      {
        "node": "ISK_L04_AB1_143",
        "profile": "PROFILE_LIYUE_YUNJIN",
        "speaker": "운근",
        "text": "그 약속이 더 좋아요. 힘든 일이 생기면 소리쳐도 되니까요. 다음 이야기에는 밥이 식기 전에 돌아오는 사람도 나올 수 있어요. 관객 한 분 때문에 결말을 정하지는 않겠지만, 돌아올 자리는 남겨 둘게요."
      },
      {
        "node": "ISK_L04_AB1_144",
        "profile": null,
        "speaker": null,
        "text": "부두 위로 아직 젖은 밧줄이 길게 놓여 있었다. 그것을 넘다가 멈추고 발을 조금 더 높이 들었다. 사람을 구한다고 쥐었던 손, 누군가를 죽였다고 지목받던 손, 밖으로 나올 때 잡아 준 손이 모두 같은 몸에 남아 있었다. 그 손으로 소개장을 다시 접었다. 바다 건너에도 대답할 사람이 있을지, 이번에는 직접 물으러 갈 생각이었다."
      },
      {
        "node": "ISK_L04_AB1_145",
        "profile": null,
        "speaker": null,
        "text": "떠나기 전 각청이 보낸 정산 담당자가 선착장 접견소로 왔다. 옛 수문과 피난 통로에서 맡은 일에 대한 칠성의 공적 정산이었다. 담당자는 지급 내역을 읽고 내가 직접 확인하도록 내밀었다."
      },
      {
        "node": "ISK_L04_AB1_146",
        "profile": null,
        "speaker": "정산 담당자",
        "text": "이번 지급은 1,800모라, 영웅의 경험 두 개, 모험가의 경험 세 개입니다. 리월 방어에 참여한 이번 활동에 대한 정산이며, 이전 몬드의 보상이나 아직 조사 중인 사건의 해결 보상과는 별개입니다. 확인하고 수령하시겠습니까?"
      }
    ],
    "ISK_L04_AB2_003": [
      {
        "node": "ISK_L04_AB2_003",
        "profile": null,
        "speaker": null,
        "text": "말이 닿았는지 알 수 없었다. 그래도 긁히던 소리가 멈췄다. 잠시 뒤 다른 쪽에서 낮은 쇳소리가 났다. 바닥을 더듬어 철제 배관처럼 단단한 부분을 찾고 거기에 손목을 대었다. 진동이 팔을 타고 올라왔다. 벽을 통해 들어온 소리보다 가까웠다."
      },
      {
        "node": "ISK_L04_AB2_004",
        "profile": null,
        "speaker": null,
        "text": "다이루크는 건물 밖에서 드러난 낡은 배수관을 검집으로 쳤다. 각청은 옆 건물의 바닥 도면을 펴 놓고 창고 아래로 들어가는 빈 수로를 찾았다. 벽을 통째로 무너뜨리면 안에 있는 사람부터 눌릴 수 있었다. 운송인은 천암군과 함께 긴 판자를 날랐고, 붙잡힌 경비는 자기가 아는 마지막 배수구 위치를 떨리는 손으로 가리켰다."
      },
      {
        "node": "ISK_L04_AB2_005",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "동쪽 바닥을 먼저 열어요. 이 관은 창고 안쪽까지 이어져요. 대답이 오면 그곳을 기준으로 범위를 좁힐 수 있어요. 다이루크 씨, 소리가 끊겨도 바로 안으로 뛰지 마세요. 통로를 받칠 때까지 기다려요."
      },
      {
        "node": "ISK_L04_AB2_006",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "알고 있다. 지금은 답을 받고 있어. 이 관을 따라 조금 더 옆으로 가면 닿을 것 같군. 안쪽 사람이 관을 찾았다면 같은 곳을 계속 치고 있을 거야."
      },
      {
        "node": "ISK_L04_AB2_007",
        "profile": null,
        "speaker": null,
        "text": "손에 닿는 관을 따라 몸을 끌었다. 발끝 아래 바닥이 없어진 곳에서는 옆 벽을 짚어 무릎을 돌렸다. 구슬은 뜨거웠지만 빛으로 길을 보여 주지 않았다. 복도 쪽에서 흘러오는 희미한 밝기를 따라가고 싶은 충동이 일었고, 나는 대신 계속 진동하는 쇠에 손을 붙였다."
      }
    ],
    "ISK_L04_AB2_009": [
      {
        "node": "ISK_L04_AB2_009",
        "profile": null,
        "speaker": null,
        "text": "마지막 몇 걸음을 기어가자 빛이 바뀌었다. 돌벽의 틈 사이로 바깥의 먼지 묻은 햇빛이 들어왔다. 내가 손을 내밀려 하자 위에서 각청의 목소리가 들렸다. 먼저 손을 넣지 말고 얼굴을 옆으로 돌리라는 말이었다. 나무판이 내려와 돌을 받쳤고, 뒤이어 밧줄이 바닥에 닿았다."
      },
      {
        "node": "ISK_L04_AB2_010",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "몸통에 걸어. 손으로만 붙잡으면 다친 쪽이 버티지 못해. 묶을 수 있겠어? 급하게 대답하지 말고, 일단 줄이 어디까지 닿는지 보여 줘."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_011",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "묶을 수 있어. 끈 끝을 남기라는 말은 이제 평생 안 잊을 것 같거든. 다만 이건 덮개가 아니라 나니까, 너무 세게 당기지는 말아 줘. 살아서 나가고 싶은 거지 안에 있던 걸 꺼내기만 하면 되는 건 아니잖아."
      }
    ],
    "ISK_L04_AB2_012": [
      {
        "node": "ISK_L04_AB2_012",
        "profile": null,
        "speaker": null,
        "text": "허리와 겨드랑이 아래로 줄을 돌렸다. 다이루크가 틈 안으로 팔을 넣어 매듭을 확인하고, 움직이는 돌이 없는 쪽으로 어깨를 돌리게 했다. 밖에서 당기는 힘에 몸을 맡겼다가, 옆구리가 걸릴 때마다 멈추고 숨을 내쉬었다. 마지막으로 발목이 빠져나왔을 때 다이루크가 내 등을 받쳤다."
      },
      {
        "node": "ISK_L04_AB2_013",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "나왔어. 더 기어갈 필요 없다. 눈을 감지 말고 내 쪽을 봐. 숨을 쉴 때 어디가 아픈가?"
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_014",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 질문에 진지하게 대답하면 한참 걸릴 것 같은데. 손이랑 옆구리가 제일 아파. 다리는 움직여. 그리고 배고프다는 생각도 조금 드니까 아직 죽을 때는 아닌 것 같아. 네 얼굴은…… 바깥에 있었던 사람치고는 먼지가 너무 많네."
      }
    ],
    "ISK_L04_AB2_023": [
      {
        "node": "ISK_L04_AB2_023",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "내가 본 도면에는 네가 말한 긴 복도가 없어. 그렇다고 네가 없던 데서 걸어 나왔다고 적지는 않겠어. 관이 이어진 곳과 우리가 실제로 연 바닥부터 남겨 둘 거야. 네가 조금 쉬고 나면 안에서 본 순서를 들어야겠어."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_024",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "기억나는 만큼 이야기할게. 조각에서 빛이 빠져나와 구슬로 들어갔고, 덮어도 멈추지 않았어. 나갈 때 벽이 움직이더니 우리 사이에 문이 생겼고, 안쪽에서는 창고와 다른 복도가 보였어. 그 빛 쪽으로 안 가고 관을 잡았어. 조각은 줍지 않았고, 시신은 끝내 못 찾았어."
      }
    ],
    "ISK_L04_AB2_032": [
      {
        "node": "ISK_L04_AB2_032",
        "profile": null,
        "speaker": null,
        "text": "운송인은 구조가 끝난 뒤에야 내 앞에 나타났다. 그는 사람을 캐내면서도 화물을 어디에 놓았는지 생각하는 자신이 싫었다고 했다. 그 덕분에 판자가 제때 왔다며 앉을 곳을 내주었다. 운송인의 뒤로 경비를 지키던 천암군이 얇은 종이 묶음을 가져왔다. 창고에 출입한 사람에게 지급한 품삯 기록이었다."
      },
      {
        "node": "ISK_L04_AB2_033",
        "profile": null,
        "speaker": "운송인",
        "text": "수레를 직접 몰았다는 사람을 찾았습니다. 당신이 구조되는 동안 붙잡힌 경비 하나가 그 사람 이름을 댔어요. 뒤 계단에서 덮개를 씌우고 실었다는 건 맞는데, 몸을 싣지는 않았다고 합니다. 저는 여기서 그 말을 믿어도 되는지 모르겠더군요."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_034",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나도 몸이 있었으면 차라리 답이 될까 생각했어. 그런데 시신이 나오기를 기다리고 있다는 걸 알아차리면 내가 뭘 찾는 사람인지 무섭더라. 그 사람이 실제로 본 걸 듣자. 내가 원하는 내용이 아니어도."
      }
    ],
    "ISK_L04_AB2_038": [
      {
        "node": "ISK_L04_AB2_038",
        "profile": null,
        "speaker": null,
        "text": "그는 상자 대금을 받은 사람이 아니라 운반 품삯을 받은 사람이었다. 기록에는 출발 구간과 도착 창고가 있었고, 다음 취급처를 가리키는 짧은 부호가 있었다. 운송인은 그것이 오래된 포장 상자에 남아 있던 제작 표식과 같은 종류라는 것을 알아보았다. 같다는 이유만으로 내용물까지 같아지는 것은 아니었지만, 서로 떨어졌던 작업이 같은 취급처를 거쳤다는 점은 좁힐 수 있었다."
      },
      {
        "node": "ISK_L04_AB2_039",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "짐을 싣기 전에 사람을 보지 못했다는 말은, 그전에 무슨 일이 없었다는 뜻이 아니야. 네가 남긴 매듭 이후 누군가 지나간 것은 확인했지. 이제 그 수레가 시신을 치웠을 거라는 생각에 나머지 흔적을 전부 끌어맞추지는 않으면 된다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_040",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알겠어. 내 매듭이 거기 있었다는 건 그대로고, 그다음에 누가 지나간 것도 그대로네. 수레 안에 내가 찾는 답이 꼭 들어 있어야 하는 건 아니고. 조금 허탈한데, 다른 데를 볼 수 있게 된 거라고 생각해 볼게."
      }
    ],
    "ISK_L04_AB2_041": [
      {
        "node": "ISK_L04_AB2_041",
        "profile": null,
        "speaker": null,
        "text": "각청은 수레 짐꾼의 진술을 따로 받아 두고, 도착 창고를 맡은 사람이 그날 떠났다는 보고를 확인했다. 그 사람은 다른 화물을 해안 하역장으로 보내는 일을 마지막으로 지시했다. 남은 기록을 읽던 다이루크는 글자 하나를 손끝으로 눌렀다. 이나즈마의 항구 이름이었다. 실제 물건이 이미 건너갔다는 기록은 아니었다."
      },
      {
        "node": "ISK_L04_AB2_042",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "다음 취급처는 이도로 적혀 있다. 여기 서명한 사람은 출항 때 인수 증서를 받기로 했고. 물건이 이나즈마에서 왔다는 뜻까지는 아니야. 적어도 다음 말을 들을 상대가 바다 건너에 있다는 뜻이지."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_043",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이도가 이나즈마에 있는 곳이지? 내 여행이 점점 짐 잃어버린 사람처럼 되고 있네. 다만 이쪽 창고가 무너졌으니, 그 거래처에 가면 상자에 뭐가 들었는지 처음부터 물어볼 사람은 있는 거잖아."
      }
    ],
    "ISK_L04_AB2_044": [
      {
        "node": "ISK_L04_AB2_044",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "먼저 여기서 확인할 것부터 끝내. 실제로 이 기록을 쓴 사람이 맞는지, 받는 쪽이 그 이름으로 거래하는지 알아볼 거야. 종이에 바다 건너를 적었다고 곧바로 네가 떠날 이유가 되지는 않으니까."
      },
      {
        "node": "ISK_L04_AB2_045",
        "profile": null,
        "speaker": null,
        "text": "운송인은 물품을 넘기는 곳에 붙은 발송 번호를 아는 하역원에게 확인하러 갔다. 종이를 가져도 되느냐고 묻기 전에 손에 묻은 약을 닦았다. 다이루크가 원본은 조사 인원에게 남기고 읽을 수 있는 사본을 받으라고 했다. 필요한 이름과 인수 조건이 보이는 부분을 가리켰다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_046",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이 부분을 옮겨 적어도 될까요? 제가 찾는 시신의 답이라고 쓰지는 않을게요. 여기 창고에서 물건을 다음에 넘기려던 사람과 장소를 알아보는 자료로 가지고 싶어요. 원본은 여기 두고요."
      }
    ],
    "ISK_L04_AB2_049": [
      {
        "node": "ISK_L04_AB2_049",
        "profile": null,
        "speaker": null,
        "text": "창고 밖으로 나오자 바람의 방향이 바뀌어 있었다. 바닷가에 있어야 할 소금 냄새가 막힌 골목 끝까지 밀려들었다. 천암군의 호각 소리가 이어졌고, 먼 바다에 물기둥이 솟았다. 각청은 보고하러 달려온 병사와 몇 마디를 나눈 뒤 내가 앉은 쪽으로 돌아왔다. 눈길이 구슬이 아니라 내 붕대에 먼저 닿았다."
      },
      {
        "node": "ISK_L04_AB2_050",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "오셀이 나타났어. 선인들과 군옥각이 바다 쪽을 막고 있어. 여기서는 해안의 사람들을 뒤로 빼야 해. 너는 다이루크 씨와 함께 높은 곳으로 이동해. 창고 수사는 내가 인원을 남겨 두겠어."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_051",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그 이름을 처음 듣는 사람한테도 지금 눈앞에 있는 게 얼마나 큰 문제인지는 보여. 혼자 나가서 해결하겠다는 소리는 안 할게. 다만 저 하역장에 아까 운송인이 갔잖아. 그 사람이 돌아오는 길은 열려 있는 거야?"
      }
    ],
    "ISK_L04_AB2_052": [
      {
        "node": "ISK_L04_AB2_052",
        "profile": null,
        "speaker": null,
        "text": "각청이 해안 쪽을 돌아보았다. 짐과 수레가 움직이던 길에 사람들이 한꺼번에 모여 있었다. 높은 길로 올라가려면 짧은 연결 다리를 지나야 했는데, 하역 장치에서 풀린 큰 상자가 다리 앞을 가로막았다. 그 곁에서 운송인이 사람들에게 수레를 돌리라고 외치고 있었다."
      },
      {
        "node": "ISK_L04_AB2_053",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "내가 저쪽을 확인하겠다. 자네는 가까운 대피 거점까지만 함께 와. 길을 열면 사람을 넘겨받아 위로 올려 보내면 된다. 지금 몸으로 무거운 상자를 들 생각은 하지 마."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_054",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알겠어. 오늘 나를 꺼내려고 들었던 판자를 내가 다시 등에 지게 만들지는 않을게. 길을 보고 사람들에게 어디로 가라고 말하는 건 할 수 있어. 아까 너희가 나한테 했던 일 정도는 기억하고 있거든."
      }
    ],
    "ISK_L04_AB2_060": [
      {
        "node": "ISK_L04_AB2_060",
        "profile": null,
        "speaker": null,
        "text": "운송인은 짐을 내리는 데 망설이지 않았다. 대신 한쪽 바퀴 밑에 받침을 넣어 빈 수레가 기울지 않게 했다. 물건이 빠진 자리에는 부상자가 눕게 되었다. 종이 사본을 옷 안쪽에 넣었다. 시신을 찾겠다고 따라온 흔적 때문에 살아 있는 사람이 못 지나가게 할 생각은 없었다."
      },
      {
        "node": "ISK_L04_AB2_061",
        "profile": null,
        "speaker": null,
        "text": "다이루크가 막힌 상자를 걷어 내자 갑자기 바다 쪽 계단에서 병사가 굴러 올라왔다. 뒤따라 물 슬라임 두 마리가 물보라와 함께 하역장으로 밀려왔다. 떠밀려 온 몸이 길목을 차지하더니 가까운 사람에게 달려들었다. 선인들이 멀리서 싸우는 동안 이 낮은 길목까지 대신 지켜 줄 수는 없었다."
      },
      {
        "node": "ISK_L04_AB2_062",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "다리 건너는 속도를 올려. 내가 앞을 막겠다. 운송인은 수레를 돌리지 말고 곧장 위로 가. {PLAYER_NAME}, 자네는 뒤쪽 사람을 먼저 보내. 적이 붙으면 혼자 받지 말고 내 쪽으로 물러나."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_063",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "보내는 건 내가 할게. 하지만 네가 물러날 길도 남겨 둘 거야. 아까 나만 나오게 하려고 문 사이에 손을 넣던 것처럼 또 혼자 남지는 마. 한 사람씩 다리로 올라가요. 빈 수레에는 걸을 수 없는 사람부터!"
      }
    ],
    "ISK_L04_AB2_066": [
      {
        "node": "ISK_L04_AB2_066",
        "profile": null,
        "speaker": null,
        "text": "길목으로 밀고 들어오던 적이 더 나아오지 못하자 마지막 수레가 다리를 건넜다. 수레 뒤를 따라가다가 난간에 몸을 붙이고 다이루크를 기다렸다. 다이루크는 퇴로를 막으려 다가오는 공격을 끊은 뒤 뒤로 물러났다. 두 사람이 함께 다리를 벗어났을 때 운송인이 반대편에서 쐐기를 빼내 임시 판을 거둬들였다."
      },
      {
        "node": "ISK_L04_AB2_067",
        "profile": null,
        "speaker": "운송인",
        "text": "둘 다 건넜습니다! 뒤에 더 오는 사람 없습니다. 물건은 저 아래에 남겼어요. 사람부터 올려 보냈습니다. 나중에 뭐라고 하면 저도 같이 듣겠습니다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_068",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이런 날에도 나중에 혼날 걸 같이 걱정하는 사람이 있어서 좀 살 것 같네. 지금은 아무한테도 짐 내려놓았다고 사과하지 마요. 내려놓아서 건넌 사람이 여기 있잖아."
      }
    ],
    "ISK_L04_AB2_074": [
      {
        "node": "ISK_L04_AB2_074",
        "profile": null,
        "speaker": null,
        "text": "고개를 끄덕였다. 옆에 앉은 사람에게 물을 건넸고, 그 사람이 부상자 쪽으로 옮겨 앉을 때 팔을 받쳤다. 스스로 걸을 수 있는 사람들이 가까운 부상자 곁에 자리를 잡기 시작했다. 다이루크는 올라오는 계단을 보며 다음 공격이 없는지 살폈다. 서로 불안을 설명하는 것만으로 시간을 쓰지 않자, 기다림에도 손을 둘 곳이 생겼다."
      },
      {
        "node": "ISK_L04_AB2_075",
        "profile": null,
        "speaker": null,
        "text": "군옥각이 내려오기 시작한 순간 석축 위에서도 비명이 터졌다. 건물의 높이가 빠르게 낮아지는 것을 보고 앞쪽으로 몸을 기울였다. 다이루크가 어깨를 눌렀다. 돌아온 연락 병사가 낙하 충격에 대비하라고 외쳤고, 군옥각의 사람들이 빠져나오고 있다는 말을 덧붙였다. 그 소식을 믿고 몸을 낮추는 것밖에는 할 수 없었다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_076",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "다들 벽 쪽으로! 위에 있는 걸 더 보려고 나가지 마요. 저게 부서지면 여기까지 뭐가 날아올지 몰라. 물통이랑 짐은 내려놓고 머리부터 가려요. 내 쪽은 다이루크가 보고 있으니까 앞으로 몰리지 말고!"
      }
    ],
    "ISK_L04_AB2_077": [
      {
        "node": "ISK_L04_AB2_077",
        "profile": null,
        "speaker": null,
        "text": "하늘의 건물이 오셀의 형체를 향해 떨어졌다. 먼 거리인데도 몸이 들릴 듯한 압력이 닿았다. 등으로 작은 아이를 감싸던 어른을 함께 붙잡았고, 다이루크는 날아든 나무 조각을 쳐냈다. 그 사이 바다에서는 빛과 물이 거대한 벽처럼 솟았다가 내려앉았다. 오래 머리 위에 있던 한 사람의 집이 도시의 앞을 막는 무게가 되었다."
      },
      {
        "node": "ISK_L04_AB2_078",
        "profile": null,
        "speaker": null,
        "text": "몸을 일으켰을 때 오셀의 거대한 형체는 다시 보이지 않았다. 바다는 한동안 울었지만 더 높게 솟아 도시로 나아오지는 않았다. 병사들이 서로 신호를 보냈다. 그 신호의 뜻을 몰라 다이루크를 바라보았다. 그는 검을 놓지는 않았지만 조금 전처럼 몸의 중심을 앞에 두고 있지도 않았다."
      },
      {
        "node": "ISK_L04_AB2_079",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "막아 낸 모양이군. 아직 아래로 내려가지는 마. 끝난 싸움 뒤에도 다치는 사람은 있다. 우선 여기 있는 사람을 세자."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_080",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "나는 여기 있어. 운송인도 있고, 마지막 수레에 있던 사람도 보여. 네가 먼저 여기를 보고 있으니까 내가 저쪽 끝부터 확인할게. 이번에는 누구를 찾으러 혼자 사라지지는 않을 거야."
      }
    ],
    "ISK_L04_AB2_081": [
      {
        "node": "ISK_L04_AB2_081",
        "profile": null,
        "speaker": null,
        "text": "각청이 올라와 응광이 군옥각을 희생해 오셀을 다시 억제했고 선인들과 방어 인원이 철수했다고 전했다. 그 말을 듣고서야 무너진 건물을 바라보았다. 구하지 못한 집이라고만 생각하면 놓치는 결정이 있었다. 그렇다고 그 결정이 집 안에 살던 사람의 상실을 작게 만드는 것도 아니었다."
      },
      {
        "node": "ISK_L04_AB2_082",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "이곳은 조금 더 유지할 거야. 하역장 아래에는 파손된 시설이 많고, 떠내려오는 물건도 있어. 방어에 참여한 사람도 먼저 부상 확인을 받아. 지금 괜찮다고 걷다가 쓰러지는 사람이 많아."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_083",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알겠어. 오늘 내가 여러 번 들은 말인데 이제는 나도 다른 사람한테 하게 되네. 내려가서 조사하겠다는 말도 오늘은 안 할게. 살아 있는 사람을 위로 올려놓았으니, 내가 다시 밑에서 깔릴 차례까지 만들고 싶지는 않아."
      }
    ],
    "ISK_L04_AB2_087": [
      {
        "node": "ISK_L04_AB2_087",
        "profile": null,
        "speaker": null,
        "text": "세 번째 아침 다이루크는 내 앞에 접힌 종이를 내려놓았다. 이도의 취급처가 실제로 거래하던 상대라는 답이 왔다. 이름을 빌려 쓴 가짜 주소만은 아니었고, 이번 발송을 기다렸다는 연락도 이전 교환 기록에 남아 있었다. 그러나 그곳이 리월에서 벌어진 일을 알고 있었다는 증거는 없었다."
      },
      {
        "node": "ISK_L04_AB2_088",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "받는 사람은 실제로 존재한다. 누가 이 물건을 넘기려 했는지 물을 상대는 있겠군. 다만 네가 그곳에 간다고 창고에서 본 현상이 바로 설명되지는 않을 거다."
      }
    ],
    "ISK_L04_AB2_091": [
      {
        "node": "ISK_L04_AB2_091",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그 두 번째 운반은 내가 남아서 찾을 거야. 첫 수레를 따라간 조사가 헛수고였다고 생각하지 마. 하나를 실제로 확인했으니, 그걸로 설명되지 않는 다음 일이 드러난 거니까."
      },
      {
        "node": "ISK_L04_AB2_092",
        "profile": null,
        "speaker": null,
        "text": "난간에 남긴 매듭을 떠올렸다. 아무것도 바꾸지 못했다고 여겼던 표시가 누군가의 동선을 나누는 기준이 되었다. 매듭을 남긴 자신은 그저 다시 찾아올 수 있기를 바랐을 뿐이었다. 각청은 그것을 어떻게 남겼는지 다시 묻지 않았다. 이미 함께 확인한 일이었다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_093",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "두 번째 운반에 내가 본 사람들이 있었을까. 그런 생각이 먼저 드는데, 이번에는 질문으로 남겨 둘게. 답을 미리 정해 놓으면 옆에 있는 상자를 또 사람이라고 보게 될 것 같아서. 찾으면 내가 어디에 있든 연락해 줘."
      }
    ],
    "ISK_L04_AB2_094": [
      {
        "node": "ISK_L04_AB2_094",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "연락받을 곳은 떠나기 전에 정하자. 네가 보내오는 소식도 같은 창구로 받겠어. 병사들의 기억 문제와 시신이 사라진 일은 계속 조사할 거야. 오셀을 막았다고 사람들한테 그전 일까지 잊으라고 할 수는 없어."
      },
      {
        "node": "ISK_L04_AB2_095",
        "profile": null,
        "speaker": null,
        "text": "다이루크는 구슬에 관한 소견을 몬드에 전달할지 물었다. 알베도는 처음 물건을 가져온 사람이지만 지금의 반응을 본 것은 두 사람이었다. 어디까지 적을지 생각한 뒤 종이를 앞으로 당겼다. 물건의 정체를 모른다는 문장을 부끄러워하지 않고 쓸 수 있을 것 같았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_096",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알베도에게 전해 줘. 리월의 창고에서 작은 조각의 빛이 구슬로 들어갔고, 뒤에 벽과 문이 이상하게 달라졌어. 나는 갇혔다가 네 도움으로 나왔고 조각은 가져오지 않았어. 이걸 앨리스가 만들었다고 생각하고 있는 건 아니지만, 전해 준 물건을 다시 설명할 사람이 필요해. 알게 되는 게 있으면 연락해 달라고."
      }
    ],
    "ISK_L04_AB2_097": [
      {
        "node": "ISK_L04_AB2_097",
        "profile": null,
        "speaker": null,
        "text": "다이루크는 내가 정한 내용을 그대로 적고 자신이 직접 본 부분을 별도로 덧붙였다. 알베도에게 보낼 편지는 다음 몬드행 연락편으로 넘겨졌다. 그날 바로 답이 올 수는 없었다. 전달을 부탁한 사실과 답을 얻은 사실을 같은 것으로 세지 않았다."
      },
      {
        "node": "ISK_L04_AB2_098",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "답이 오면 네가 남긴 연락처로 돌리겠다. 나도 몬드로 돌아가면 직접 확인할 수 있어. 리월에 계속 머무는 것보다 각자 다른 쪽을 맡는 편이 나을 시점이 온 것 같군."
      }
    ],
    "ISK_L04_AB2_107": [
      {
        "node": "ISK_L04_AB2_107",
        "profile": null,
        "speaker": null,
        "text": "그날 오후 나는 각청과 함께 복구된 짧은 길을 걸었다. 도시를 보여 주겠던 이전 약속을 그녀가 떠올린 것은 아니었다. 숙소에서 연락 창구로 이동하는 길이었고, 각청은 막 열린 골목을 직접 확인해야 했다. 그 사실을 알면서도 며칠 전의 말을 꺼낼지 고민했다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_108",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "전에 네가 시간이 맞으면 같이 도시를 걸어 보자고 했어. 기억하라는 뜻으로 말하는 건 아니야. 지금 이 길을 걷고 있으니까 말하고 싶어졌어. 약속한 산책이랑은 조금 다르지만, 난 나쁘지 않거든."
      }
    ],
    "ISK_L04_AB2_109": [
      {
        "node": "ISK_L04_AB2_109",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "그랬어? 그럼 내가 길을 너무 빠르게 잡았나 보네. 오늘은 저 앞 골목까지 천천히 가도 돼. 다만 다음에 왔을 때도 무너진 벽만 구경하고 리월을 다 봤다고 말하지는 마."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_110",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "좋아. 다음에는 멀쩡한 가게도 들어가 보고 먹을 것도 제대로 먹자. 조사하러 왔다가 통로랑 상자랑 벽 밑만 보고 가는 건 도시한테도 좀 실례잖아."
      }
    ],
    "ISK_L04_AB2_111": [
      {
        "node": "ISK_L04_AB2_111",
        "profile": null,
        "speaker": null,
        "text": "각청은 아직 영업하지 않는 가게 앞에서 걸음을 멈추고 다시 열 날짜를 물었다. 가게 주인이 기억해 두었다가 오라고 답하자 나도 고개를 끄덕였다. 돌아올 약속은 사라진 기억 속에만 남아 있어야 하는 것은 아니었다. 새로 들은 날짜와 새로운 길이 그 옆에 놓일 수 있었다."
      },
      {
        "node": "ISK_L04_AB2_112",
        "profile": null,
        "speaker": null,
        "text": "각청은 항구의 일반 통행을 다시 열겠다는 조정을 직접 설명했다. 파손된 부두와 조사 중인 창고에는 통제가 남았지만, 생계와 구호를 위한 길을 예전 봉쇄와 똑같이 막아 둘 수는 없었다. 내 조사 협력도 출입 제한 구역을 마음대로 넘을 권한이 되지는 않았다. 마지막으로 창고 쪽을 돌아본 뒤 새로 열린 큰길로 나왔다."
      },
      {
        "node": "ISK_L04_AB2_113",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "다음에는 내 이름을 대고 아무 데나 들어가지 마. 허가가 필요하면 지금처럼 물어. 대신 일반 길에서 매번 네가 왜 여기 왔는지 설명하게 두지는 않을 거야. 네가 오셀의 몸을 베었다고 과장하는 소문도 정리하겠어. 실제로 한 일만으로 충분하니까."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_114",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그건 꼭 좀 해 줘. 나중에 누가 또 큰 게 나오면 나를 먼저 부를까 봐 무섭다. 나는 다리 한쪽도 다이루크랑 같이 막았어. 잘한 일을 줄이자는 게 아니라, 다음에 살아서 할 수 있는 정도로 소개해 줬으면 해."
      }
    ],
    "ISK_L04_AB2_117": [
      {
        "node": "ISK_L04_AB2_117",
        "profile": null,
        "speaker": null,
        "text": "북두와의 만남은 운송인이 아는 하역원을 거쳐 마련되었다. 다이루크는 연락 상대와 약속이 있어 먼저 갈라졌고, 나는 혼자서 자신의 이름과 용건을 소개해야 했다. 북두는 처음 보는 나에게 소문 속 별명을 붙이지 않았다. 대신 오래 앉아도 되는 몸인지 묻고 난간이 아닌 안정된 의자를 내주었다."
      },
      {
        "node": "ISK_L04_AB2_118",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "이나즈마행을 알아본다고 들었어. 저 아래 무너진 창고에 있다 나왔다더니, 여기서 또 무리할 생각은 아니겠지? 배가 물 위에 떠 있다고 누워 가는 길인 건 아니야."
      }
    ],
    "ISK_L04_AB2_121": [
      {
        "node": "ISK_L04_AB2_121",
        "profile": null,
        "speaker": null,
        "text": "북두는 담당 선원을 불러 승선할 때 필요한 짐과 확인할 서류를 설명하게 했다. 자신의 연락처와 머무는 숙소를 적었다. 바다를 건넌 뒤 거래처를 찾기까지도 길을 알아야 했다. 한 번 만난 선장이 그것까지 모두 대신해 줄 것처럼 기대하지는 않았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_AB2_122",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "한 가지 더 말할 게 있어. 내가 가지고 있는 구슬이 창고 안의 작은 조각과 반응한 뒤 공간이 이상하게 바뀌었어. 원인은 아직 몰라. 물건을 빼앗기기 싫어서 숨긴 채 배에 오르고 싶지는 않아. 승선 전에 어떤 상태인지 확인할 자리가 필요하면 정해 줘."
      }
    ],
    "ISK_L04_AB2_130": [
      {
        "node": "ISK_L04_AB2_130",
        "profile": null,
        "speaker": null,
        "text": "승선 협의는 그 자리에서 끝나지 않았다. 북두는 다음 항해의 보급과 출입 조건이 맞는지 확인하겠다고 했고, 나는 필요한 서류를 갖춰 다시 오기로 했다. 실제 출항도 이나즈마 입국도 아직 결정되지 않았다. 하지만 누구에게 무엇을 준비해 와야 하는지는 분명해졌다."
      },
      {
        "node": "ISK_L04_AB2_131",
        "profile": null,
        "speaker": null,
        "text": "선착장 끝에서 다이루크가 기다리고 있었다. 그는 내가 북두와 어떤 말을 했는지 대신 아는 척하지 않았다. 곧 몬드로 돌아가는 길에 오르겠다며 마지막으로 연락을 받을 곳을 맞췄다. 다이루크의 외투에서 씻어도 남은 창고 먼지를 보았다."
      }
    ],
    "ISK_L04_AB2_135": [
      {
        "node": "ISK_L04_AB2_135",
        "profile": "PROFILE_MOND_DILUC",
        "speaker": "다이루크",
        "text": "내 걱정은 그 정도면 됐다. 길을 떠나기 전에는 제대로 먹고 자라. 다음 편지에서 그 말을 또 해야 하는 일이 없었으면 좋겠군."
      },
      {
        "node": "ISK_L04_AB2_136",
        "profile": null,
        "speaker": null,
        "text": "다이루크는 악수를 청하듯 손을 내밀었다가 내 붕대를 보고 팔뚝 쪽을 가볍게 잡았다. 그 손은 창고 아래에서 끌어올릴 때와 같은 힘으로 오래 붙들지는 않았다. 이제 놓아도 내가 스스로 서 있을 수 있었다. 그가 걸어가는 등을 보고 나서야 옷 안쪽에 넣어 둔 사본을 확인했다."
      },
      {
        "node": "ISK_L04_AB2_137",
        "profile": null,
        "speaker": null,
        "text": "매듭 하나에서 시작된 길은 상자와 창고를 지나 바다까지 이어졌다. 그 길에서 찾은 것은 사라진 사람들의 몸이 아니었다. 대신 함께 모르는 것을 확인해 준 동료와, 자기 기억을 잃고도 현재의 일을 맡아 준 사람과, 다음에 물어볼 주소가 남았다. 종이를 꺼내 숙소로 돌아갈 길을 적었다. 먼 데 갈 준비도 오늘 돌아갈 곳을 잊지 않는 데서 시작해야 했다."
      },
      {
        "node": "ISK_L04_AB2_138",
        "profile": null,
        "speaker": null,
        "text": "숙소로 돌아가기 전 나는 선착장 접견소의 정산 담당자에게 불려 갔다. 각청이 확인한 하역장 방어와 피난 지원 기록이 도착해 있었다. 담당자는 조사 중인 화물 사건과 별개의 공적 정산임을 설명하고 지급 내역을 보여 주었다."
      },
      {
        "node": "ISK_L04_AB2_139",
        "profile": null,
        "speaker": "정산 담당자",
        "text": "지급액은 1,800모라이고 영웅의 경험 두 개, 모험가의 경험 세 개가 함께 지급됩니다. 하역장 방어와 피난 지원에 대한 이번 정산입니다. 내역을 확인하셨으면 수령 의사를 말씀해 주세요."
      }
    ],
    "ISK_L04_B1_004": [
      {
        "node": "ISK_L04_B1_004",
        "profile": null,
        "speaker": null,
        "text": "맞닿은 손바닥은 펴진 채였다. 그 손을 붙잡고 싶은 충동을 억지로 눌렀다. 도와달라는 목소리와 손바닥의 위치가 가깝다는 이유만으로 같은 사람일 수는 없었다. 케이아가 줄이 통과하는 지점을 손등으로 더듬었다. 눈에 보이지 않는 면과 줄 사이에 손톱도 들어가지 않을 만큼 가는 틈이 있었다. 그는 그 틈을 얼리다 멈추었다. 안쪽으로 번진 서리가 구슬 쪽으로 가늘게 풀리고 있었다."
      },
      {
        "node": "ISK_L04_B1_005",
        "profile": "PROFILE_MOND_KAEYA",
        "speaker": "케이아",
        "text": "구슬을 조금 뒤로 옮겨 봐. 지금은 내 얼음까지 없어져. 문이 열릴 거라고 믿고 마냥 가까이 가져다 대면, 우리가 딛고 있는 쪽부터 무너질 수도 있어. 줄은 북두가 받고 있으니 네 몸만 뒤로 가."
      },
      {
        "node": "R39_PROSE_ISK_L04_B1_006",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "오라고는 했어도 어디로 오라는 말은 안 했지. 내가 물어봐도 대답할 생각은 없어 보이고. 좋아, 뒤로 옮길게. 네가 여기라고 할 때까지 내 쪽에서 움직이지 않을 테니까, 손이 필요하면 말해."
      }
    ],
    "ISK_L04_B1_014": [
      {
        "node": "ISK_L04_B1_014",
        "profile": null,
        "speaker": null,
        "text": "틈이 어깨 너비만큼 벌어지자 젖은 천이 먼저 밀려 나왔다. 북두가 그 천을 움켜쥐고 병사의 가슴을 끌어냈다. 케이아는 한쪽 신발이 없는 발을 받쳐 돌에 다시 끼지 않게 했다. 병사는 물을 토하면서도 줄을 놓지 않았다. 세 사람이 그의 몸을 완전히 바깥으로 끌어낸 다음에야 손가락이 풀렸다. 문 안쪽의 손은 마지막까지 펴진 채였다. 쐐기가 부러지고 서리가 닫히자 그 손도 보이지 않게 되었다."
      },
      {
        "node": "ISK_L04_B1_015",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "돌아왔어. 줄 그만 잡아도 된다. 네가 놓으면 사라지는 게 아니니까 손가락부터 펴. 케이아, 호흡을 봐. 나는 다리에 다시 천을 감을게. 너는 바닥의 주머니 두 개를 챙겨. 이번엔 물건이 사람 밑으로 굴러가게 두지 말자."
      }
    ],
    "ISK_L04_B1_017": [
      {
        "node": "ISK_L04_B1_017",
        "profile": null,
        "speaker": "교대 병사",
        "text": "그 친구 목소리였습니다. 같이 근무할 때 제 이름을 부르던 그대로였어요. 그런데 제가 가까이 가니까, 말은 앞에서 들리는데 몸은 아래에 있었습니다. 물 밑에 누워 있었어요. 손을 내민 건 그 친구가 아니었을지도 모릅니다."
      },
      {
        "node": "R39_PROSE_ISK_L04_B1_018",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그럼 지금 네가 돌아온 것부터 믿자. 누가 무슨 얼굴을 하고 있었는지는 숨 좀 돌리고 얘기해도 돼. 여기서 또 네가 본 걸 증명하러 들어가면, 너를 기다리는 사람은 내가 방금 했던 말을 다시 듣게 되잖아."
      }
    ],
    "ISK_L04_B1_019": [
      {
        "node": "ISK_L04_B1_019",
        "profile": null,
        "speaker": null,
        "text": "병사는 고개를 끄덕이다가 내 어깨 너머를 보았다. 골짜기 아래 배수로에 젖은 천 한 조각이 걸려 있었다. 북두가 먼저 내려갔다. 케이아는 내가 앞질러 달리지 못하게 팔을 잡았지만, 따라가는 것까지 막지는 않았다. 낮은 관목 뒤에는 사람의 몸이 누워 있었다. 한쪽 어깨가 돌에 기대어 있고 손은 몸 아래에 깔려 있었다. 의례에 함께 갔던 병사였다."
      },
      {
        "node": "ISK_L04_B1_020",
        "profile": null,
        "speaker": null,
        "text": "얼굴을 보는 순간 무릎을 꿇었다. 차양 아래에서 밥그릇을 자기 손으로 치우겠다고 하던 사람이었다. 손목에 감았던 천도 그대로였다. 돌아온 각청을 만난 뒤로 마음속에서 계속 살아나던 가능성들이 그 앞에서 한꺼번에 멎었다. 케이아가 목과 가슴을 확인하는 동안 나는 아무 말도 하지 않았다. 몸은 차가웠다. 이번에도 숨이 없었다. 케이아는 오래 헛된 동작을 되풀이하지 않았다."
      },
      {
        "node": "ISK_L04_B1_021",
        "profile": "PROFILE_MOND_KAEYA",
        "speaker": "케이아",
        "text": "찾았어. 네가 찾던 사람이라는 건 얼굴을 보고 알겠지. 여기에는 살아 있는 숨이 없어. 지금 우리가 할 수 있는 건 몸을 이곳에 놓고 가지 않는 거야. 네가 들겠다면 한쪽을 받쳐 줘. 다만 혼자 들겠다고 고집하지는 마."
      },
      {
        "node": "R39_PROSE_ISK_L04_B1_022",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내가 알던 사람이야. 마지막에 제대로 쉬려고 애썼다고 말해 달랬어. 나는 그 말만 가져다주고, 몸은 아직 못 찾았다고 했고. 이번에는 같이 데려가자. 누나한테 또 어디 있는지 모른다고 말하고 싶지 않아."
      }
    ],
    "ISK_L04_B1_026": [
      {
        "node": "ISK_L04_B1_026",
        "profile": null,
        "speaker": null,
        "text": "북두가 길 위로 올라간 뒤, 나는 죽은 병사의 젖은 옷자락을 정리했다. 케이아는 묻지 않고 옆에서 들것을 받쳤다. 구슬이 든 주머니가 몸에 닿을 것 같자 나는 그것을 반대쪽으로 옮겼다. 전에 반응하지 않았던 물건을 다시 들이대면 무엇이 달라질지 생각했지만, 죽은 사람 앞에서 가족도 모르는 시험을 하고 싶지는 않았다. 구슬은 조용했다."
      },
      {
        "node": "ISK_L04_B1_027",
        "profile": null,
        "speaker": "교대 병사",
        "text": "제가 보았다는 사람이 이 친구인지, 다른 것이었는지 모르겠습니다. 그런데 여기 있는 얼굴은 압니다. 제가 가족을 찾아가는 길도 알고요. 걸을 수 있게 되면 제가 누나를 모셔오겠습니다. 이번에는 누구에게 부탁만 하고 기다리지 않겠습니다."
      }
    ],
    "ISK_L04_B1_031": [
      {
        "node": "ISK_L04_B1_031",
        "profile": null,
        "speaker": null,
        "text": "선원은 들은 말을 되짚고 마을로 향했다. 그 뒷모습이 보이지 않을 때까지 서 있었다. 그때 멀리서 천둥 같은 소리가 났다. 하늘의 구름은 바다 쪽으로 끌려가고 있었다. 북두가 즉시 높은 자리로 올라갔다. 바람이 해안에서 불어오는데, 나뭇잎과 천막 끝은 반대쪽으로 당겨졌다. 골짜기에서 겪었던 고요한 이상과 달리 이번에는 넓은 땅 전체가 거칠게 흔들리는 느낌이었다."
      },
      {
        "node": "ISK_L04_B1_032",
        "profile": null,
        "speaker": "남십자 선원",
        "text": "남쪽 제방의 경계에서 사람이 왔습니다! 항구 앞바다에서 큰 것이 솟았다고 합니다. 물이 밀려와서 낮은 길을 비우고 있습니다. 이쪽까지 피난민이 올라옵니다!"
      },
      {
        "node": "ISK_L04_B1_033",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "바다에 나온 형체가 뭔지 봤나? 높이와 방향부터 말해. 소문으로 들은 이름은 뒤에 듣겠다. 여기 있는 부상자들은 높은 천막으로 옮기고, 누나 데리러 간 사람한테도 낮은 길 피하라고 보내!"
      },
      {
        "node": "ISK_L04_B1_034",
        "profile": null,
        "speaker": null,
        "text": "경계에서 온 병사는 바다 위에 솟은 거대한 형체와 여러 갈래로 치솟는 물의 기둥을 설명했다. 뒤이어 달려온 전달병이 칠성과 선인들이 오셀을 막고 있다는 명령을 전했다. 그 이름을 처음 듣고 북두를 보았다. 그녀의 얼굴에서는 평소의 웃음이 사라져 있었다. 바다를 잘 안다는 이유로 이번에는 괜찮다고 말할 사람이 아니었다."
      },
      {
        "node": "ISK_L04_B1_035",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "오셀이라면 여기를 비우는 것만으로 끝나지 않을 거다. 바깥 제방이 무너지면 항구에서 나온 사람들이 이쪽으로 올라올 길도 끊겨. 케이아, 너와 나는 그쪽으로 간다. 네가 따라오려면 먼저 저 손 치료부터 받아."
      }
    ],
    "ISK_L04_B1_046": [
      {
        "node": "ISK_L04_B1_046",
        "profile": null,
        "speaker": null,
        "text": "제방에 닿자 바다 위의 형체가 구름 사이로 보였다. 그 크기를 사람이나 드발린과 나란히 놓아볼 수 없었다. 물의 기둥 하나가 방향을 틀 때마다 먼 수면이 하얗게 갈라졌다. 제방 아래에서는 흘러온 마물들이 마른 길로 기어올랐다. 천암군은 주민들을 높은 길로 보내면서도 무너지는 목책을 다시 세우느라 손이 부족했다. 북두는 그들이 버티는 틈에 들어갔다."
      },
      {
        "node": "ISK_L04_B1_047",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "막아야 할 건 여기다! 바다 쪽에 눈 팔지 마. 선인과 칠성이 저쪽을 맡는 동안 우린 이 길을 지킨다. 케이아, 왼쪽 목책을 받쳐. 너는 가운데 빈틈으로 들어오는 걸 막아. 사람들이 다 지나면 안쪽으로 물러난다!"
      },
      {
        "node": "ISK_L04_B1_048",
        "profile": "PROFILE_MOND_KAEYA",
        "speaker": "케이아",
        "text": "주민들은 한 줄씩 건너. 얼음이 얇은 곳은 내가 표시할 테니 지름길이라고 밟지 마. 네가 넘어지면 뒤의 사람이 피할 데가 없어. 그리고 너, 이번에는 내가 손을 내밀면 누구 손인지 오래 고민하지 않아도 돼."
      },
      {
        "node": "R39_PROSE_ISK_L04_B1_049",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "지금은 네 손 알아볼 자신 있어. 아까부터 날 너무 많이 끌어당겨서 손목에 감각이 남았거든. 내 쪽은 맡겨. 다들 건너갈 때까지 여기서 길을 지킬게."
      }
    ],
    "ISK_L04_B1_055": [
      {
        "node": "ISK_L04_B1_055",
        "profile": null,
        "speaker": null,
        "text": "북두는 높은 자리에서 항구 쪽을 올려다보았다. 구름 사이로 밝은 선들이 번졌고, 하늘에 떠 있던 커다란 형체가 천천히 아래로 기울었다. 먼지와 비 때문에 나에게는 일부만 보였다. 북두는 그것을 군옥각이라고 불렀다. 땅으로 떨어질 집을 보며 놀라는 사람의 목소리가 아니었다. 무엇을 내려놓기로 했는지 알아본 사람의 낮은 목소리였다."
      },
      {
        "node": "ISK_L04_B1_056",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "응광이 저걸 내놓는군. 시비 걸 때마다 들었던 그 집 얘기를 이런 식으로 끝내게 될 줄은 몰랐는데. 모두 고개 숙여! 충격이 밀려오면 손으로 버티지 말고 몸을 낮춰!"
      }
    ],
    "ISK_L04_B1_071": [
      {
        "node": "ISK_L04_B1_071",
        "profile": null,
        "speaker": null,
        "text": "누나는 웃으려다 그릇을 내려놓았다. 울음이 나오는데 웃는 얼굴을 유지할 이유가 없었다. 나도 위로할 말을 더 찾지 않았다. 조금 떨어진 자리에서 교대 병사가 고개를 숙였다. 케이아와 북두는 구호 담당자의 부탁을 받아 다른 사람의 짐을 옮겼다. 누구도 그 자리를 가족의 마음이 풀리는 장면으로 만들기 위해 둘러서 있지 않았다."
      },
      {
        "node": "ISK_L04_B1_072",
        "profile": null,
        "speaker": "병사의 누나",
        "text": "주머니는 이제 돌려주세요. 제 것은 제가 쓰고, 동생 것은 제가 가지고 있을게요. 그런데 옷에서 나왔다는 나무패는 모르겠어요. 동생은 리월을 떠난 적이 없어요. 바다 건너 물건을 받았더라도 집에는 말을 안 했습니다."
      },
      {
        "node": "R39_PROSE_ISK_L04_B1_073",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그러면 그 패는 어디서 온 건지 알아보고 싶어요. 제가 가져가도 될까요? 동생분 물건이라는 사실부터 감추거나, 알아낸 걸 혼자만 갖고 있지는 않을게요. 원하시면 먼저 모양을 옮겨 적고 원래 것은 남겨둘 수도 있어요."
      }
    ],
    "ISK_L04_B1_077": [
      {
        "node": "ISK_L04_B1_077",
        "profile": null,
        "speaker": null,
        "text": "구호 일이 조금 정리됐을 때 각청이 외곽 구호 자리를 찾았다. 물에 잠긴 길과 옮겨온 주민들을 확인한 뒤 그녀는 북두와 케이아에게 제방에서 있었던 일을 물었다. 그녀가 걸어오는 모습을 보고도 손목을 잡지 않았다. 살아 있는 각청에게 처음 만났던 날과 같은 질문을 되풀이한다고 자신이 찾은 죽은 사람까지 바뀌지는 않았다. 각청은 내가 예전처럼 자신을 아는 얼굴로 보는 것을 알아차렸다."
      },
      {
        "node": "ISK_L04_B1_078",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "내가 기억하지 못하는 일을 계속 묻지 않은 건 고마워. 그렇다고 없었던 일로 치자는 뜻은 아니야. 함께 있던 병사를 찾았다는 보고는 받았어. 가족에게 돌아갈 수 있도록 도와준 것도. 네가 말한 이상 현상은 다른 실종 신고와 묶어 조사하겠어."
      }
    ],
    "ISK_L04_B1_082": [
      {
        "node": "ISK_L04_B1_082",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "기억 이상 때문에 걸었던 일반 출입 봉쇄는 오늘부터 해제해. 정리된 대로와 생활 구역은 드나들 수 있어. 다만 물에 잠긴 창고와 무너진 해안은 계속 통제할 거야. 문이 열렸다고 위험한 곳까지 구경하러 들어가지는 마. 다음에도 밖에서 널 찾아야 한다면 나도 좋은 말만 하지는 않을 거야."
      },
      {
        "node": "R39_PROSE_ISK_L04_B1_083",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "입성 인사부터 추궁으로 시작할 것 같아서 걱정했는데, 이번에는 살아서 들어오라고 하는 말로 들을게. 쉬러 갈 수 있는 데가 생기면 나도 웬만하면 얌전히 쉬어. 아주 믿지는 말고, 지금은 그럴 생각이란 정도로만 믿어 줘."
      }
    ],
    "ISK_L04_B1_085": [
      {
        "node": "ISK_L04_B1_085",
        "profile": null,
        "speaker": null,
        "text": "케이아는 그날 오후 몬드로 돌아갈 준비를 했다. 동행한 기사도 함께였다. 지원이 영원히 내 곁에 붙어 있는 형태로 바뀐 것은 아니었다. 그는 리월 쪽의 부상자 인계와 연락처를 남긴 뒤 나를 불렀다. 이번에도 감사 인사를 하려다 뜻하지 않은 부탁이 붙을까 봐 입을 다물었다. 케이아가 먼저 그 표정을 지적했다."
      },
      {
        "node": "ISK_L04_B1_086",
        "profile": "PROFILE_MOND_KAEYA",
        "speaker": "케이아",
        "text": "무슨 말을 하려다 세 번쯤 삼킨 얼굴인데. 이번에는 편지를 보내면 읽을 거라는 약속을 다시 받아내려는 건가? 내 답은 같아. 다만 네가 쓰기 전에 모든 걸 해결할 필요는 없어. 그러면 도움을 청하는 편지가 아니라 사건이 끝난 보고서가 되겠지."
      }
    ],
    "ISK_L04_B1_099": [
      {
        "node": "ISK_L04_B1_099",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "이제 제대로 들어왔네. 처음 왔을 때부터 항구 구경보다 바깥 차양을 더 오래 봤으니, 네 리월 얘기를 들으면 남들은 여기가 천막 도시인 줄 알겠다. 우선 밥부터 먹자. 네가 장부 보듯 얼굴을 들여다봐도 주방에서 저녁은 나온다."
      },
      {
        "node": "R39_PROSE_ISK_L04_B1_100",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이번에는 남의 남은 밥 먹겠다는 농담은 안 할게. 제대로 한 그릇 시켜서 끝까지 내 자리에 앉아 있을래. 누가 급한 일 있다고 불러도 두 숟갈은 더 먹고 일어날 수 있는 날이면 좋겠네."
      }
    ],
    "ISK_L04_B1_101": [
      {
        "node": "ISK_L04_B1_101",
        "profile": null,
        "speaker": null,
        "text": "북두는 모퉁이의 평범한 식당에 자리를 잡았다. 내가 주머니에서 종이를 꺼내자 그녀는 밥상 위 국물부터 옆으로 치웠다. 병사의 옷에서 나온 나무패를 옮겨 놓은 종이였다. 종이가 마르며 먹이 더 진하게 드러났다. 북두는 가장자리의 끈 구멍과 세 겹으로 겹친 문양을 살폈고, 뒤이어 들어온 선원에게 오래전 화물표를 가져와 보라고 했다."
      },
      {
        "node": "ISK_L04_B1_102",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "이 형식은 이나즈마를 드나들던 화물에 달린 걸 봤어. 나라의 허가증이라는 뜻은 아니야. 저쪽 상인들 중에 자기가 보낸 짐을 구분하려고 나무패를 쓰는 놈들이 있었지. 같은 모양이라고 그 병사가 거기 갔다고 정해 버리면 안 된다. 물건이 사람보다 훨씬 멀리 다니기도 하니까."
      },
      {
        "node": "R39_PROSE_ISK_L04_B1_103",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "알아. 누나도 그 친구는 리월을 떠난 적이 없다고 했어. 그래도 이게 어디서 나온 건지 물어볼 곳은 생긴 거잖아. 왜 그 몸이 골짜기로 돌아왔는지는 몰라도, 옷 안에 들어 있던 물건이 지나온 길은 찾아볼 수 있겠네."
      }
    ],
    "ISK_L04_B1_104": [
      {
        "node": "ISK_L04_B1_104",
        "profile": null,
        "speaker": null,
        "text": "선원이 가져온 낡은 화물표에는 다른 문양이 새겨져 있었지만 끈 구멍의 배치와 패를 묶는 방식은 닮아 있었다. 북두는 종이를 겹쳐 같은 물건이라고 말하지 않았다. 대신 이나즈마 쪽 거래 상대에게 물어볼 수 있다고 했다. 종이를 접으며 한동안 밥을 뜨지 않았다. 알지도 못하는 나라의 이름이 처음으로 멀리 있는 지도 글자보다 가까워졌다."
      },
      {
        "node": "R39_PROSE_ISK_L04_B1_105",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이나즈마에 가보고 싶어. 이 종이 하나 때문에 온 나라를 뒤질 수 있다는 소리는 아니야. 그래도 목소리가 시키는 데로 끌려다니기만 할 순 없잖아. 내가 물어볼 사람을 찾아가는 건 할 수 있을 것 같아. 거긴 네 배로 갈 수 있는 곳이야?"
      }
    ],
    "ISK_L04_B1_115": [
      {
        "node": "ISK_L04_B1_115",
        "profile": null,
        "speaker": null,
        "text": "북두는 아직 출항 날짜를 찍지 않았다. 재난 뒤 선원들의 몸 상태와 배의 수리, 물자 확보를 먼저 살펴야 했다. 그녀가 안 된다고 돌려세우는 것과 함께 가기 위해 조건을 정하는 말의 차이를 알 수 있었다. 그날 정한 것은 배편과 입국 절차를 확인하고 비용·도움 범위를 따로 의논한다는 계획이었다. 바다를 건넌 승객도, 새로 고용된 선원도 아니었다."
      },
      {
        "node": "ISK_L04_B1_116",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그리고 그 구슬. 네가 몰래 두고 타라는 말은 안 하겠어. 하지만 바다 한가운데서 또 빛을 당기거나 목소리가 들리면 내게 먼저 알려. 배 안에 있는 사람들한테도 피해야 할 자리는 알려야지. 내가 선장으로 책임질 일을 모른 채 출항할 수는 없으니까."
      },
      {
        "node": "R39_PROSE_ISK_L04_B1_117",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그건 약속할게. 내가 겪은 반응하고 모르는 부분을 같이 설명할게. 아무 일 없을 거라고는 말 못 해. 대신 일이 생겼는데도 내가 해결할 수 있을 것처럼 숨기지는 않을게. 나도 이제 누가 옆에 있는지 보고 움직이는 쪽이 덜 무섭다는 걸 알거든."
      }
    ],
    "ISK_L04_B1_118": [
      {
        "node": "ISK_L04_B1_118",
        "profile": null,
        "speaker": null,
        "text": "식사를 마친 뒤 나는 누나에게 보낼 편지의 첫 문장을 오래 골랐다. 아직 이나즈마로 떠났다고 쓰지 않았다. 종이에 옮긴 표식과 닮은 형식을 북두가 기억했고, 그 출처를 물어볼 계획이라는 사실만 쓰기로 했다. 누나가 편지가 실제로 집까지 오게 해 달라고 한 말을 잊지 않았다. 쓰기 전에 북두에게 부탁할 내용을 직접 말했다."
      },
      {
        "node": "R39_PROSE_ISK_L04_B1_119",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "누나에게는 유해가 있는 집 주소로 보내 줘. 표식과 닮은 형태를 바다 건너 화물에서 본 사람이 있어서 알아보려 하고, 아직 출항은 정하지 않았다고 쓸 거야. 답을 찾았다는 소리는 안 넣을게. 편지 가져간 사람이 집에 다녀오면 나도 만나게 해 줘."
      }
    ],
    "ISK_L04_B2_004": [
      {
        "node": "ISK_L04_B2_004",
        "profile": null,
        "speaker": null,
        "text": "노끝이 뒤집힌 배에 닿았다. 썩은 나무가 떨어져야 할 곳에서 물이 튀었다. 물은 아래로 흘러내리지 않고 선체를 따라 감겼다. 선원이 다시 힘을 주자 검은 배가 잠깐 멀어졌다가, 물결을 만들지 않은 채 원래 자리로 돌아왔다. 사람 얼굴은 보이지 않았다. 배 안에 빈 공간이 있는지조차 알 수 없었다. 북두는 거기에 사람이 숨어 있을 거라고 기대하며 몸을 실어 옮기지 않았다."
      },
      {
        "node": "ISK_L04_B2_005",
        "profile": null,
        "speaker": "남십자 선원",
        "text": "선장, 뒤쪽도 같은 배가 보입니다! 하나가 돌아온 건지 둘인지 모르겠습니다. 고리 위치가 똑같습니다. 우리가 밀면 뒤쪽 것도 움직입니다!"
      },
      {
        "node": "ISK_L04_B2_006",
        "profile": null,
        "speaker": null,
        "text": "앞과 뒤를 번갈아 보았다. 양쪽에 보이는 검은 배는 긁힌 자국까지 같았다. 한 번의 움직임이 두 곳에서 보였다. 얼마 전 닻을 내리자 반대쪽에서 돌아 나온 현상과 닮아 있었다. 북두는 두 배 사이를 뚫겠다고 노를 쪼개 맡기지 않고 한쪽만 밀게 했다. 그동안 자신은 배에 닿은 쇠고리를 검으로 눌러 벌렸다. 단단한 금속이 휘어지는 소리가 났다."
      },
      {
        "node": "R39_PROSE_ISK_L04_B2_007",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "앞뒤가 따로 있는 게 아닌 것 같아. 저 자국이 같이 움직여. 한쪽을 밀었을 때 벌어지는 틈으로 가 보자. 구슬은 불빛만 비추고 있어. 이걸 들면 길이 열린다고 생각하고 뛰어들지는 않을게."
      }
    ],
    "ISK_L04_B2_015": [
      {
        "node": "ISK_L04_B2_015",
        "profile": null,
        "speaker": null,
        "text": "북두가 방향을 바꾸자 검은 배의 뱃전 아래로 밝은 선이 드러났다. 내 구슬에 비치던 작은 등불과 같은 높이였다. 빛은 멀리 있는 해안이 아니라 수면 가까운 틈에서 새어 나오고 있었다. 내가 품에서 구슬을 꺼내자 그 빛이 가늘게 휘었다. 동시에 배를 감싸고 있던 물이 한쪽으로 쏠렸다. 북두는 구슬이 배를 움직였다고 정하지 않고, 실제로 열린 물살 쪽에 노를 넣게 했다."
      },
      {
        "node": "R39_PROSE_ISK_L04_B2_016",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "빛이 휘어. 하지만 저쪽에 길이 있다고 말할 자신은 없어. 아까도 구슬은 위험한 쪽으로 끌렸잖아. 북두, 네가 물 보고 정해. 나는 뜨거워지면 바로 말할게."
      }
    ],
    "ISK_L04_B2_017": [
      {
        "node": "ISK_L04_B2_017",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그래. 지금은 물이 흘러나가는 틈이 있다. 그 틈으로 간다. 뒤쪽 선원, 닻은 당겨 올려. 둘은 내가 손 내리면 함께 밀어! 배가 걸리면 물건보다 사람 쪽으로 몸을 붙여!"
      },
      {
        "node": "ISK_L04_B2_018",
        "profile": null,
        "speaker": null,
        "text": "틈에 닿은 순간 배가 갑자기 아래로 떨어졌다. 아주 짧은 낙하였지만 배 안의 모든 물건이 동시에 떠올랐다. 수레꾼의 어깨를 품으로 당겼고, 짐주인은 물통을 놓치는 대신 바닥으로 눕혔다. 닻줄이 선원의 발목을 스치며 지나갔다. 북두는 그를 밀어내고 줄 끝을 잘랐다. 작은 닻은 검은 수면으로 사라졌다. 되돌려 받으려고 몸을 내밀 사람은 없었다."
      },
      {
        "node": "ISK_L04_B2_019",
        "profile": null,
        "speaker": null,
        "text": "곧 배 바닥이 물에 부딪혔다. 이번 물결에는 바람이 있었다. 거센 비가 얼굴을 때렸고, 소금기 섞인 물이 난간을 넘어왔다. 눈을 제대로 뜨지 못하면서도 그것이 아까의 고요한 수면과 다르다는 것을 알았다. 뒤에는 검은 배가 보이지 않았다. 그 대신 넓은 바다와 해안의 높은 불빛, 비를 가르며 흔들리는 신호등이 보였다. 돌아온 것이 기뻐 입을 열기도 전에 큰 파도가 옆구리를 쳤다."
      },
      {
        "node": "ISK_L04_B2_020",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "살아 나왔다고 고개부터 들지 마! 큰 파도 온다. 오른쪽을 세워! 돛대는 그대로 둬, 지금 세우면 바람에 뒤집힌다. 두 자루로 방향을 잡는다. 저 불빛 아래 바위 뒤로 붙여!"
      },
      {
        "node": "R39_PROSE_ISK_L04_B2_021",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "다 있어! 앞에 세 사람, 가운데 나하고 수레꾼하고 짐주인, 뒤에 북두랑 한 사람. 여덟이야! 구슬도 여기 있어. 그런데 바깥이 왜 이 모양이야? 아까보다 더 큰 물이 오잖아!"
      }
    ],
    "ISK_L04_B2_022": [
      {
        "node": "ISK_L04_B2_022",
        "profile": null,
        "speaker": null,
        "text": "북두는 대답 대신 먼바다를 보았다. 비구름 사이로 거대한 형체가 솟아 있었다. 물기둥 같은 목이 움직일 때마다 수면이 갈라졌다. 검은 배가 다시 따라오는 것인지 생각했다가 이내 차이를 깨달았다. 이번 것은 두 번 보이는 작은 그림자가 아니었다. 해안의 신호등도 그 형체 쪽을 향해 경고를 보내고 있었다. 다른 사람들도 보고 있는 재난이었다."
      },
      {
        "node": "ISK_L04_B2_023",
        "profile": null,
        "speaker": "남십자 선원",
        "text": "해안 경계에서 피하라는 신호입니다! 항구 쪽으로 붙지 말라고 합니다. 바위 뒤 낮은 나루는 열려 있습니다. 하지만 여기서 파도를 한 번 더 넘어야 합니다!"
      },
      {
        "node": "ISK_L04_B2_024",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "거기로 간다. 전부 안쪽으로 몸을 붙여. 앞에서 파도를 받으면 뒤의 노를 놓지 말고, 물이 빠질 때 힘을 맞춰. 너는 그릇으로 바닥물을 퍼내! 물통의 물까지 버리지 말고 바닥에 찬 것만!"
      },
      {
        "node": "ISK_L04_B2_025",
        "profile": null,
        "speaker": null,
        "text": "물을 퍼냈다. 물을 다 퍼내면 더 들어왔고, 팔을 쉬면 바닥에서 사람의 옷이 먼저 젖었다. 짐주인은 자기 겉옷을 접어 수레꾼 밑에 받쳤다. 다친 선원도 한 손으로 작은 그릇을 잡았다. 온전한 노 두 자루가 번갈아 물에 들어갔다. 조급한 힘을 쓰면 노 하나가 더 부러질 것 같았지만, 멈춰 있으면 파도가 배를 가로로 밀어버렸다. 북두가 몸으로 방향을 받아냈다."
      }
    ],
    "ISK_L04_B2_028": [
      {
        "node": "ISK_L04_B2_028",
        "profile": null,
        "speaker": "구호 담당자",
        "text": "여덟 분 모두 여기 계시네요. 다친 두 분은 안쪽으로 모십니다. 다른 분들도 젖은 겉옷부터 벗고 천을 덮으세요. 바닷물이 찬 몸으로 바로 뛰면 다리가 말을 안 듣습니다. 선장님, 바깥 경계에서 찾고 있었습니다."
      },
      {
        "node": "ISK_L04_B2_029",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "두 사람 먼저 봐줘. 정강이 상처는 돌에 긁힌 거고, 수레꾼 다리는 바다에 오기 전부터 다쳤다. 나머지도 멀쩡하다고 내버려 두지 마. 오래 물을 퍼냈어. 경계 담당자는 여기로 보내. 사람들 상태 보면서 얘기하겠다."
      }
    ],
    "ISK_L04_B2_043": [
      {
        "node": "ISK_L04_B2_043",
        "profile": null,
        "speaker": null,
        "text": "낮은 접안길은 파도가 칠 때마다 물속으로 숨었다가 드러났다. 밀려온 마물이 틈을 파고들면 부상자를 실은 사람들이 걸음을 멈춰야 했다. 뒤에서는 다음 배가 기다리고, 앞에서는 무거운 들것을 든 팔이 떨렸다. 북두는 끝까지 붙잡고 있어야 할 줄과 물이 넘치면 놓아야 할 줄을 나누어 지시했다. 들것이 지나갈 폭을 비워두고 무기를 들었다."
      },
      {
        "node": "ISK_L04_B2_044",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "배 붙이는 줄은 왼쪽으로! 들것이 가운데를 지난다. 마물은 내가 바깥에서 받으니 네 쪽으로 넘어오는 걸 막아. 파도 물러날 때 앞으로 붙고, 다음 물이 오기 전에는 돌 위로 올라가. 사람이 탄 배 밑으로 뛰어들지는 마!"
      },
      {
        "node": "R39_PROSE_ISK_L04_B2_045",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "가운데 길은 비워둘게. 마물을 한 마리 더 잡는 것보다 들것 하나 더 지나가는 게 먼저지? 좋아, 이번에는 내가 뭘 못 놓아야 하는지 알아. 들어오는 사람들한테 뒤로 밀리지만 말라고 전해 줘."
      }
    ],
    "ISK_L04_B2_049": [
      {
        "node": "ISK_L04_B2_049",
        "profile": null,
        "speaker": null,
        "text": "높은 해안에 올라서자 구름 사이로 군옥각이 보였다. 이름을 알기 전에 크기에 놀랐다. 공중에 떠 있는 건축물이 비바람 속에서 바다를 향해 기울고 있었다. 북두는 응광의 결심을 알아본 듯 눈을 가늘게 떴다. 하늘의 궁전이 무너진다고 당황하며 뛰지 않았다. 대신 주변 사람들을 바위 뒤로 모았다."
      },
      {
        "node": "R39_PROSE_ISK_L04_B2_050",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "저게 군옥각이야? 항구에서 사람들이 위를 보며 얘기하던 곳? 기울고 있어. 안에 사람이 있다면 저대로 떨어져도 되는 거야? 지금 누구라도 피하고 있는지 보여?"
      }
    ],
    "ISK_L04_B2_051": [
      {
        "node": "ISK_L04_B2_051",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "저 안에서 어떻게 움직이는지 여기서는 볼 수 없어. 하지만 응광이 아무 생각 없이 자기 집을 버릴 사람은 아니지. 우린 밀려올 물을 받아낼 준비를 해야 한다. 바위 뒤로 붙어. 구경하겠다고 높이 서 있으면 저쪽에서 번 시간을 네가 버리는 거야."
      },
      {
        "node": "ISK_L04_B2_052",
        "profile": null,
        "speaker": null,
        "text": "군옥각이 내려왔다. 해안의 낮은 바위 뒤에서 그 모습을 보았다. 바다 위의 거대한 형체와 하늘의 빛이 맞부딪히고, 물이 한순간 벽처럼 솟았다. 이번 물벽은 별을 뒤집어 비추지 않았다. 돌과 배와 사람을 그대로 밀어버릴 수 있는 실제 파도였다. 북두가 내 어깨를 누르고 병사들이 뒤쪽의 아이를 감쌌다. 굉음이 지난 뒤 바닥으로 밀려온 물은 발목을 적시고 되돌아갔다."
      }
    ],
    "ISK_L04_B2_058": [
      {
        "node": "ISK_L04_B2_058",
        "profile": null,
        "speaker": "짐주인",
        "text": "난 아직도 자다 깨면 돈주머니부터 만져요. 웃기죠. 거기서는 돈이 있어도 물 한 모금 살 상대가 없었는데. 당신들이 아니었으면 주머니만 멀쩡하게 남았겠네요. 그래도 내 짐 생각을 하면 속이 쓰린 건 어쩔 수가 없어요."
      },
      {
        "node": "R39_PROSE_ISK_L04_B2_059",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그건 당연하지. 나도 살아 돌아왔다고 신발이 젖은 게 안 불편해지진 않았어. 그러니까 짐 아깝다고 말하는 건 괜찮아. 다만 찾으러 가겠다고 다친 수레꾼부터 일으키지는 마. 이번에는 걸을 수 있는 사람들이 같이 가 보자."
      }
    ],
    "ISK_L04_B2_062": [
      {
        "node": "ISK_L04_B2_062",
        "profile": null,
        "speaker": "짐주인",
        "text": "한 포장이라도 받는 데까지 끝나니까 사람 속이 좀 내려앉네요. 잃어버린 건 잃어버린 거고요. 그때 내 겉옷은 계속 덮어줘도 돼요. 새로 사겠다고 했으니 이번에는 말 바꾸지 않을 겁니다."
      },
      {
        "node": "ISK_L04_B2_063",
        "profile": null,
        "speaker": "수레꾼",
        "text": "그걸 제가 돌려주려고 일어날 줄 아셨습니까? 다리가 나으면 빨아서 드릴 생각이었죠. 그냥 쓰라면 고맙게 쓰겠습니다. 대신 다음에 제 수레 타실 땐 갑자기 배로 바꾸자는 말은 하지 마세요."
      },
      {
        "node": "R39_PROSE_ISK_L04_B2_064",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그건 나도 동의. 이제 누가 잠깐 바다로 돌면 빠르다고 하면, 얼마큼 잠깐인지부터 물어볼 거야. 그래도 너희 둘이 옷 한 벌로 흥정하는 소리를 다시 들으니까, 진짜 돌아왔다는 느낌이 난다."
      }
    ],
    "ISK_L04_B2_066": [
      {
        "node": "ISK_L04_B2_066",
        "profile": null,
        "speaker": null,
        "text": "각청이 외곽 나루를 찾았을 때 북두는 사람과 배의 상태를 설명하고 있었다. 작업장 옆에서 나무 조각을 쓸어내다가 그녀와 눈이 마주쳤다. 처음 보았다는 표정이 돌아오지는 않았다. 각청은 환자를 옮기겠다고 허가받은 사람들이 이제야 연락을 보내왔다며 북두에게 먼저 말을 걸었다. 이번 만남을 그녀는 기억하고 있었다."
      },
      {
        "node": "ISK_L04_B2_067",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "선장, 사람을 내린 곳을 알려 달라고 했지. 경계에서는 배가 사라졌다고 보고했고, 다른 나루에서는 여덟 사람이 돌아왔다고 보고했어. 다친 사람들이 치료받고 있다는 소식이 먼저 와서 다행이야. 그래도 다음에는 내가 같은 배를 두 번 찾는 일은 줄여 줘."
      },
      {
        "node": "ISK_L04_B2_068",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그건 나도 바라지. 바다가 갈라져 아래로 내려갔다가 닻을 내려도 반대쪽에서 돌아오는 곳에 갇힐 줄 알았으면 애초에 작은 배를 띄우지 않았을 거다. 내 선원들과 이쪽 손님이 함께 겪었어. 농담으로 넘길 생각은 하지 마."
      },
      {
        "node": "R39_PROSE_ISK_L04_B2_069",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "내가 설명할게. 갈라진 바다 아래에 길과 건물이 있었고, 구슬은 밑에서 올라오는 빛을 끌어당겼어. 돌아가려고 해도 해안이 사라졌고, 뒤집힌 검은 배가 우리를 긁었어. 우리가 빠져나왔을 때는 이미 바깥에서 오셀을 막고 있었고. 둘이 같은 일인지는 몰라. 하지만 원래 타고 있던 여덟 명은 전부 돌아왔어."
      }
    ],
    "ISK_L04_B2_070": [
      {
        "node": "ISK_L04_B2_070",
        "profile": null,
        "speaker": null,
        "text": "각청은 내 손에 감긴 붕대를 보고 말을 끊지 않았다. 내가 꺼내 보인 검은 배의 작은 명판은 물에 오래 잠긴 듯 테두리가 닳아 있었다. 닫힌 해역에서 떨어져 나온 것이 실제로 손에 남아 있었다. 각청은 그것을 곧바로 압수하라고 하지 않았다. 나루 담당자에게 표면을 옮겨 적게 하고, 위험한 변화를 보이면 나 혼자 감추지 말라고 했다."
      },
      {
        "node": "ISK_L04_B2_071",
        "profile": "PROFILE_LIYUE_KEQING",
        "speaker": "각청",
        "text": "전부 돌아왔다는 건 분명히 좋은 소식이야. 겪은 일을 확인하는 동안에도 그 사실까지 의심할 필요는 없어. 해안의 이상 현상은 따로 조사하겠어. 오셀은 선인과 칠성이 함께 막았고, 응광이 군옥각을 희생해서 재앙을 가라앉혔어. 그게 바다에서 봤다는 모든 것을 설명해 주지는 않아."
      }
    ],
    "ISK_L04_B2_079": [
      {
        "node": "ISK_L04_B2_079",
        "profile": null,
        "speaker": null,
        "text": "따뜻한 식사가 끝나고 나서야 북두는 검은 배의 명판을 씻었다. 표면의 검은 때를 아주 조금 벗겨내자 글자 몇 개가 남아 있었다. 선원 하나가 종이에 글자를 옮겼고 북두가 그 가운데 지명을 읽었다. 이도. 이나즈마의 항구 이름이었다. 선박의 이름이나 만든 날짜까지 알아볼 수는 없었다. 명판의 위치도 제대로 된 선체가 아니라 부러진 고리 곁이었으므로, 원래 어디에 붙어 있던 것인지 따로 알아봐야 했다."
      },
      {
        "node": "R39_PROSE_ISK_L04_B2_080",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "이나즈마에서 온 배였다는 뜻일까? 그런데 우리가 본 건 뒤집혀 있었고, 밀어도 물처럼 휘었어. 이걸 보고 나서 그냥 낡은 배 하나에 겁먹었다고 하기는 싫은데. 그 나라에서 누가 이 글자를 읽어 주면 좀 달라질까?"
      }
    ],
    "ISK_L04_B2_081": [
      {
        "node": "ISK_L04_B2_081",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "어디서 만들었는지 알아낼 실마리는 될 수 있지. 그렇다고 이도에서 유령 배를 내보낸다고 따지러 가면 맞기 딱 좋다. 이 판만 다른 배에서 떼어 붙였을 수도 있고, 바다를 몇 번 건넜는지도 모르잖아. 먼저 저쪽 거래 상대에게 물어보는 게 순서야."
      },
      {
        "node": "ISK_L04_B2_082",
        "profile": null,
        "speaker": null,
        "text": "북두는 이나즈마를 드나들며 물자를 주고받던 사람들 가운데 명판을 알아볼 만한 이가 있는지 선원과 이야기했다. 자신의 구슬을 보며 출처를 안다고 생각했던 날을 떠올렸다. 설산에서 얻었다는 사실과 물건의 정체를 안다는 것은 전혀 달랐다. 이번에는 눈앞의 지명을 발견했다고 결론부터 정하고 싶지 않았다. 그래도 아무 데도 물어볼 곳이 없던 때보다는 나았다."
      }
    ],
    "ISK_L04_B2_091": [
      {
        "node": "ISK_L04_B2_091",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "우선 알아둘 게 있다. 우리가 탔던 작은 배로 바다를 건널 생각은 없어. 그 배는 수리해서 연안 일을 해야 해. 이나즈마행을 준비한다면 사조성호 쪽 항해 계획과 맞춰야 한다. 지금 당장 빈자리가 있다고 널 태워 출항하는 건 아니야."
      },
      {
        "node": "R39_PROSE_ISK_L04_B2_092",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "그건 다행이다. 저 작은 배를 다시 타자고 했으면 용기 내겠다는 말부터 주워 담았을 거야. 그럼 내가 필요한 건 승선할 자리, 비용, 들어가서 지낼 준비네. 나는 돈을 낼지 일을 더 도울지 조건부터 듣고 결정할게. 구조해 줬으니 평생 승객권 받았다는 소리는 안 할 테니까."
      }
    ],
    "ISK_L04_B2_093": [
      {
        "node": "ISK_L04_B2_093",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "그 소리를 했으면 정말 뻔뻔하다고 웃었을 거다. 함께 버틴 일은 내가 잊지 않아. 하지만 선원들의 식량과 배의 물자까지 내 기분만으로 없던 값이 되지는 않지. 네가 도울 일과 지불할 몫은 출항 전에 분명히 정하자. 그리고 쇄국 중인 나라에 가는 거니 입경을 네 멋대로 해결했다고 생각하지 마."
      },
      {
        "node": "R39_PROSE_ISK_L04_B2_094",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "일은 할게. 다만 상처가 나은 다음에. 지금 무거운 짐 들다가 붕대에 피 배면 옆에서 보던 선원이 또 대신 들잖아. 물자 목록 대조하거나 줄 묶는 연습부터 하자. 내가 항해를 돕는다고 해 놓고 실제로는 손만 더 가게 만드는 건 싫어."
      }
    ],
    "ISK_L04_B2_095": [
      {
        "node": "ISK_L04_B2_095",
        "profile": null,
        "speaker": null,
        "text": "북두는 그 제안을 받아들였다. 나에게 당장 짐꾼 몫을 떠넘기지 않고, 출항 준비를 하는 사람 곁에서 물자의 이름과 놓는 자리를 익히게 했다. 승선비와 노동의 범위는 아직 확정하지 않았다. 장거리 항해가 시작된 것도, 남십자의 정식 선원이 된 것도 아니었다. 자신의 이름을 적을 빈 자리를 보았지만 북두가 확인하기 전에는 마음대로 채워 넣지 않았다."
      },
      {
        "node": "ISK_L04_B2_096",
        "profile": null,
        "speaker": null,
        "text": "그날 저녁 원래 작은 배에 탔던 여덟 사람이 다시 모였다. 수레꾼은 다리를 뻗고 앉았고 다친 선원은 의자를 하나 더 받았다. 짐주인은 잃은 물건 이야기를 한참 하다가, 다시 찾은 한 포장을 인계했다는 이야기를 더 길게 했다. 북두는 선원들에게 작은 배의 수리가 끝나면 노를 넉넉히 점검하라고 했다. 두 자루를 더 잃어도 된다는 뜻이 아니라, 있는 물건이 멀쩡한지 몸으로 확인하라는 말이었다."
      },
      {
        "node": "ISK_L04_B2_097",
        "profile": null,
        "speaker": "수레꾼",
        "text": "이제 이나즈마까지 간다고요? 배에서 내리자마자 다시 배 탈 생각을 하다니 대단하네요. 나는 당분간 바퀴 네 개 달린 것만 믿으려고 합니다. 물웅덩이도 피해서 갈 겁니다."
      }
    ],
    "ISK_L04_B2_101": [
      {
        "node": "ISK_L04_B2_101",
        "profile": null,
        "speaker": null,
        "text": "그들은 연락받을 자리를 남기고 식사를 마쳤다. 내가 모두를 영원히 붙잡아 두려고 하지는 않았다. 수레꾼은 다리를 고쳐야 했고, 짐주인은 남은 일을 정리해야 했으며, 선원들은 각자의 배와 자리를 돌봐야 했다. 같은 배에 갇혔던 시간이 그 뒤의 삶까지 하나로 묶지는 않았다. 북두는 내가 그들을 배웅할 동안 서두르지 않고 기다렸다."
      },
      {
        "node": "ISK_L04_B2_102",
        "profile": "PROFILE_LIYUE_BEIDOU",
        "speaker": "북두",
        "text": "잘 보냈네. 이제 네가 떠날 준비도 하면 된다. 구슬이 항해 중 다시 반응하면 내게 먼저 알린다는 약속은 잊지 마. 명판은 내가 맡아 봉해 둘까, 네가 지닐래? 어디 있는지만 서로 알면 돼. 혼자 품고 있어야 책임지는 건 아니다."
      },
      {
        "node": "R39_PROSE_ISK_L04_B2_103",
        "profile": "PLAYER_ISEKAI",
        "speaker": "{PLAYER_NAME}",
        "text": "명판하고 함께 떨어져 나온 쇠고리 조각은 네가 맡아 줘. 내가 본 부분하고 판에 남은 글자는 종이에 따로 적어 둘게. 구슬은 내가 가지고, 변화가 있으면 바로 말할게. 그걸 누군가에게 덜컥 넘겨놓고 마음이 편해질 것 같지는 않지만, 적어도 너한테 숨기고 탈 생각은 없어."
      }
    ]
  }
};
