#!/usr/bin/env python3
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
DB=ROOT/'content/db.json'
db=json.loads(DB.read_text(encoding='utf-8'))
TABLE='55_MAIN_STORY_DB'
headers=db[TABLE][0]; ix={h:i for i,h in enumerate(headers)}
rows={(r[ix['ROUTE_ID']],r[ix['NODE_ID']]):r for r in db[TABLE][1:] if r and r[ix['NODE_ID']]}

text_fixes={
'TRV_M01_A002':"멈춰! ...아, 겁줄 생각은 없었어. 난 페보니우스 기사단의 정찰 기사 엠버야. 성 밖을 순찰하던 중인데 이쪽 숲에서 큰 그림자가 지나가는 걸 봤어. 두 사람은 그쪽 길에서 나온 거지? 다친 곳은 없어?",
'TRV_M01_A003':"난 페이몬이야. 페이몬은 멀쩡해! 이쪽도 걸을 수 있고. 그런데 엠버가 말한 큰 그림자가 정확히 얼마나 컸는지부터 알려 줘. 우린 숲 안에서 아주 큰 용을 봤거든.",
'TRV_M01_A004':"두 사람도 봤구나. 그럼 더 빨리 성으로 가야겠어. 길에서 본 걸 기사단에 보고해야 해. 오는 동안 위험한 곳은 내가 먼저 확인할게.",
'TRV_M01_Z003':"바람이 묻는 이름. 몬드에서의 첫 만남과 첫 보고를 마치고, 여행자는 다음 움직임을 준비한다.",
'TRV_M02_N157':"사당 안쪽을 물 슬라임과 츄츄족이 막아선다. 리사와 힘을 합쳐 적을 쓰러뜨리고 장치의 흐름을 되돌려야 한다.",
'TRV_M02_N265':"매의 문 안쪽에서 불 심연 메이지와 물 슬라임이 길을 막는다. 이들을 물리쳐야 숨겨진 눈물을 되찾을 수 있다.",
'TRV_M02_N274':"일식 부족의 야영지에서 츄츄족들이 상자를 지키고 있다. 이들을 물리치고 빼앗긴 눈물을 되찾아야 한다.",
'TRV_M02_N311':"지도에는 동풍의 용이 사라진 방향과 몬드로 돌아가는 길이 함께 남는다. 드발린과의 첫 재회는 실패했고 천공의 하프는 깨졌다. 그래도 드발린이 벤티의 노래를 들었다는 사실과 심연 교단이 끼어들었다는 단서는 남았다. 바람 드래곤의 폐허로 향하기 전에 몬드에서 장비와 동료를 정비하고 필요한 일을 마칠 시간이 있다.",
'TRV_M02_MENU_001':"도시를 덮은 드발린이 북쪽으로 사라진 뒤, 경보 종의 마지막 울림도 잠잠해진다. 복구 중인 몬드성으로 돌아온 여행자는 잠시 숨을 고를 수 있다. 성문과 기사단, 도움이 필요한 사람들이 있는 광장을 둘러본 뒤 준비가 되면 기사단 본부로 향하자.",
'TRV_M02_MENU_003':"몬드성은 아직 드발린의 습격을 수습하는 중이다. 필요한 준비를 마치면 기사단 본부로 가서 진·리사·케이아의 보고를 듣자.",
'TRV_M02_N357':"서쪽 빛 인도 장치 주위로 심연 메이지의 습격조가 몰려든다. 장치를 지키는 적을 모두 물리쳐야 돌문과 봉인을 풀 수 있다.",
'TRV_M02_N422':"드발린의 오염을 정화해 자유롭게 떠나보냈고, 여행자는 벤티의 정체와 신의 심장이 빼앗긴 일까지 지켜봤다. 몬드에는 아직 살필 일과 인사를 나눌 사람들이 남아 있다. 준비를 마치면 남쪽 길을 따라 리월로 향할 수 있다.",
'TRV_LY1_N166':"청신의례에서 암왕제군에게 벌어진 변고를 목격한 여행자는 타르탈리아에게 받은 백무금기 비록으로 선인들에게 사실을 알렸다. 원인과 제군의 생사는 아직 확정하지 않았다. 이제 리월항으로 돌아가 다음 단서를 찾아야 한다.",
'TRV_LY2_N193':"송신의례 준비와 군옥각 방문을 거쳐 우인단이 백무금기 비록을 복제한 흔적까지 확인했다. 여행자는 황금옥 입구에서 숨을 고른다. 타르탈리아의 속내와 선조의 허물에 얽힌 진상은 아직 안쪽에 남아 있다.",
'TRV_LY3_A_END':"황금옥에서 타르탈리아와 직접 맞선 끝에 여행자가 승리했다. 선조의 허물에는 신의 심장이 없었고, 그 사실을 확인한 타르탈리아는 오셀의 봉인을 깨웠다. 이제 전투에서 확인한 정보와 뒤늦게 울린 경보를 들고 항구의 다음 작전에 합류해야 한다.",
'TRV_LY3_B_END':"여행자는 타르탈리아와 정면으로 싸우는 대신 황금옥의 증거를 확보해 항구에 먼저 경보를 보냈다. 타르탈리아는 빈 선조의 허물을 확인한 뒤 오셀의 봉인을 깨웠다. 확보한 자료와 미확인 적 전력을 들고 다음 결전에 합류해야 한다.",
'TRV_LY4_R11':"항구에 저녁 불이 켜졌다. 리월에서 풀지 못한 일은 여행자의 기록에 남았고, 바다 건너 이나즈마는 소문만큼 가까운 길이 아니었다. 페이몬이 배편을 묻겠다며 시장 쪽을 가리켰지만 여행자는 지도를 먼저 펼쳐 출항 가능한 항구를 살폈다. 당장 바다를 건널 일은 없다. 두 사람은 리월항에서 다음 여정을 천천히 준비하기로 한다.",
}
choice_fixes={
'TRV_M01_G007':"위험해! 이쪽으로 물러나!",
'TRV_M01_A006':"용도 봤고, 초록 옷의 음유시인도 봤어.",
'TRV_M01_A007':"용은 봤어. 다른 사람 이야기는 지금은 하지 않을게.",
'TRV_M01_A008':"여긴 위험해. 안전한 곳에 가면 자세히 말할게.",
'TRV_M01_K006':"숲에서 본 일부터 기사단에 보고할게.",
'TRV_M01_K007':"용건은 진 단장 대행 앞에서 이야기할게.",
'TRV_M01_K008':"질문보다 내 표정부터 읽고 있는 거야?",
'TRV_M01_J007':"붉은 결정을 가지고 있어. 천으로 싸 뒀으니 조심해서 보여 줄게.",
'TRV_M01_J008':"결정은 건드리지 않았어. 위치만 표시해 뒀어.",
'TRV_M01_J009':"지금은 내가 본 장면부터 설명할게. 물건 이야기는 나중에 하자.",
'TRV_M01_J022':"난 헤어진 쌍둥이를 찾고 있어.",
'TRV_M01_J023':"지금은 숲의 일부터 정리하자. 내 개인 사정은 나중에 물어볼게.",
'TRV_M01_L007':"숲의 현장 위치부터 다시 설명할게. 그다음 책을 보자.",
'TRV_LY1_N022':"헤어진 쌍둥이를 찾을 단서가 있는지 먼저 묻고 싶어.",
'TRV_LY1_N025':"처음 길을 가로막았던 낯선 신에 대해 알고 싶은 게 있어.",
'TRV_LY1_N046':"내가 직접 본 것만 이야기할게.",
'TRV_LY1_N064':"현장에서는 무슨 일이 있었어?",
'TRV_LY1_N082':"이 백무금기 비록은 어떤 조건으로 쓰고, 어떻게 돌려주면 돼?",
'TRV_LY1_N085':"출처를 숨길 생각은 없어.",
'TRV_LY1_N106':"제단에서 본 일을 전하러 왔어. 선인들의 판단도 듣고 싶어.",
'TRV_LY2_N006':"사람들이 지금 가장 걱정하는 게 뭐야?",
'TRV_LY2_N035':"시험 비용과 원석 값은 따로 계산되는 거야?",
'TRV_LY2_N050':"선인들에게 소식은 전했어. 하지만 판단은 항구에서도 확인해야 해.",
'TRV_LY2_N064':"이 꽃의 향은 어떤 식으로 남는 거야?",
'TRV_LY2_N127':"칠성은 선인들에게 뭐라고 전했어?",
'TRV_LY2_N129':"우인단은 항구에서 뭘 원하는 거야?",
'TRV_LY2_N142':"연구 현장에서 확인할 수 있는 자료만 보고할게.",
'TRV_LY2_N187':"현장을 먼저 확인하자. 대화할 수 있으면 이유부터 물어볼게.",
'TRV_LY3_A_REPORT_C1':"타르탈리아는 물과 번개를 전환하며 싸웠어. 그 순서부터 설명할게.",
'TRV_LY3_A_REPORT_C2':"선조의 허물이 비어 있는 걸 확인한 뒤 오셀의 봉인이 풀렸어. 그 순서부터 설명할게.",
'TRV_LY3_B_REPORT_C1':"대피를 시작한 시각과 안전했던 길부터 전할게.",
'TRV_LY3_B_REPORT_C2':"복제된 비록과 황금옥에서 확보한 기록부터 보여 줄게.",
'TRV_LY4_A04':"타르탈리아와 직접 싸웠어. 선조의 허물에서는 신의 심장을 찾지 못했어.",
'TRV_LY4_A05':"먼저 바다의 변화와 봉인이 풀린 시점부터 말할게. 전투 경과는 그다음이야.",
'TRV_LY4_B04':"가져온 문서부터 맡길게. 내가 직접 본 동선은 따로 설명하겠어.",
'TRV_LY4_B05':"대피에 필요한 해역 변화부터 말할게. 문서 사본도 같이 가져왔어.",
'TRV_LY4_SRV_INTEL':"황금옥의 시간 기록과 해역 변화를 다시 정리해서 전할게.",
'TRV_LY4_AFT_A':"황금옥에서 타르탈리아와 싸우게 된 경위부터 설명할게.",
'TRV_LY4_AFT_B':"황금옥에서 증거를 옮기게 된 경위부터 설명할게.",
'TRV_LY4_BANK_ASK_CONTRACT':"신의 심장을 넘기는 계약을 하면서 리월의 위험은 어떻게 계산한 거야?",
'TRV_LY4_BANK_ASK_PEOPLE':"선인과 칠성, 항구 사람들은 그 선택을 언제 알게 되는 거야?",
'TRV_LY4_RW_POSTER_CITY':"헤어진 쌍둥이를 찾고 있어. 이 전단을 리월항 곳곳에 붙여 줄 수 있을까?",
'TRV_LY4_RW_POSTER_TRAVEL':"이 전단을 여행자와 상인들이 지나는 길에도 전해 줄 수 있을까?",
'TRV_LY4_R07A':"헤어진 쌍둥이를 찾으려면 다른 나라의 신에게도 물어봐야 해.",
'TRV_LY4_R07B':"쌍둥이의 행적을 알 만한 사람과 길을 계속 찾아볼 거야.",
}
changes=[]
for node,new in text_fixes.items():
    row=rows.get(('ROUTE_TRAVELER',node))
    if row is None: raise SystemExit('missing story node '+node)
    old=row[ix['TEXT_KO']]
    if old!=new:
        row[ix['TEXT_KO']]=new;changes.append({'table':TABLE,'node':node,'field':'TEXT_KO','old':old,'new':new})
for node,new in choice_fixes.items():
    row=rows.get(('ROUTE_TRAVELER',node))
    if row is None: raise SystemExit('missing choice node '+node)
    old=row[ix['CHOICE_LABEL']]
    if old!=new:
        row[ix['CHOICE_LABEL']]=new;changes.append({'table':TABLE,'node':node,'field':'CHOICE_LABEL','old':old,'new':new})

# Traveler personal-story gates: keep mechanics in columns, remove implementation prose from player-facing text.
P='57_MOND_STORY_SCENE_DB'; ph=db[P][0]; pi={h:i for i,h in enumerate(ph)}
tech=re.compile(r'(?:실제 SAVE|해당 SAVE|플레이어가 과거 선택|카드만|카드를 1회|퀘스트 완료|전설 완료|호감도|하트|중복 지급|중복 처리|A/B 외에는 이벤트 진입|A/B 기억|같은 사건으로 합류|동일한 사건의 다음 단계로 이어진다|필수 경로는 같다|둘 모두 완료된다|명시적으로 수락할 때만|거절/보류에는 불이익|수락하기 전에는 지불하지 않는다|수락 전에는 (?:소모|차감)하지 않는다|미수락 때는 차감이 없다|동의 전에는 소모하지 않는다)')
def natural_gate(node,text):
    if not tech.search(text or ''): return text
    if 'MEMORY_GATE' in node or 'TARTAGLIA_G_A' in (text or '') or '해당 SAVE' in (text or ''):
        return '황금옥에서 실제로 겪었던 일을 떠올리고, 그 기억을 바탕으로 대화를 이어 간다.'
    if 'PREP' in node:
        first=(text or '').split('.',1)[0].strip()
        return (first+'. 준비가 되면 일을 시작할 수 있다.') if first else '필요한 준비를 확인한다. 준비가 되면 일을 시작할 수 있다.'
    if 'REJOIN' in node and ('수락' in (text or '') or '카드' in (text or '')):
        return '동행 제안을 받아들였다. 함께 움직일 준비를 마친다.'
    if 'REJOIN_END' in node:
        return '동행에 대한 이야기를 마치고 다음 일정을 준비한다.'
    if 'REJOIN_GATE' in node:
        return '이전에 보류했던 동행 제안에 다시 답한다.'
    if 'JOIN_GATE' in node:
        return '동행 제안에 어떻게 답할지 정한다.'
    if 'DECIDE' in node:
        return '어떤 태도로 답할지 정한다.'
    if any(k in node for k in ['INVEST_GATE','ACTION_GATE','ALLOC_GATE','FAMILY_GATE','FIRST_GATE','SECOND_GATE','_A_GATE','_B_GATE']):
        return '어떻게 대응할지 정한다.'
    return '지금 상황에서 어떻게 행동할지 정한다.'
for row in db[P][1:]:
    if not row or row[pi['ROUTE_ID']]!='ROUTE_TRAVELER' or row[pi['NODE_TYPE']]!='MENU_GATE': continue
    node=str(row[pi['NODE_ID']]);old=str(row[pi['TEXT_KO']] or '');new=natural_gate(node,old)
    if new!=old:
        row[pi['TEXT_KO']]=new;changes.append({'table':P,'node':node,'field':'TEXT_KO','old':old,'new':new})

DB.write_text(json.dumps(db,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
out=ROOT/'reports/v01331_step12_0'
out.mkdir(parents=True,exist_ok=True)
(out/'story-text-changes.json').write_text(json.dumps({'version':'0.13.31','count':len(changes),'changes':changes},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'changed':len(changes),'mainText':len(text_fixes),'mainChoices':len(choice_fixes)},ensure_ascii=False))
