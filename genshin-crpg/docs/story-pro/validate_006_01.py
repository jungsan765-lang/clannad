"""Validate manuscript text, choices and the exact previous-scene correction; no game execution."""
from pathlib import Path
import json
import hashlib
import re

HERE = Path(__file__).resolve().parent

def render(row):
    text = row['text'] if row['kind'] == 'NARRATION' else '“' + row['text'] + '”'
    return f"**{row['speaker']}**  \n{text}\n"

def validate():
    s = json.loads((HERE/'SCENE_006_01.json').read_text(encoding='utf-8'))
    m = (HERE/'WORK_006_01.md').read_text(encoding='utf-8')
    assert s['task'] == '006.01' and s['mainRoute'] == 'K2'
    assert s['revision'] == 2
    opening = s['before']
    assert opening[1]['text'] == '...각청? 너... 살아 있었어?'
    assert opening[2]['speaker'] == '각청'
    assert '누군지는 모르겠지만' in opening[2]['text'] and '무례한걸?' in opening[2]['text']
    assert '끈 풀린 포대' in opening[3]['text'] and '그 포대 일은 알아' in opening[4]['text']
    assert opening[7]['speaker'] == '각청' and opening[7]['text'].startswith('진정해 봐.')
    assert '지금 이 근처' in opening[7]['text'] and opening[7]['text'].endswith('찾는 거야?')
    assert opening[8]['text'].startswith('응...')
    assert all('네 얼굴은 기억나지 않아' not in row['text'] for row in opening)
    c = s['choice']
    assert c['type'] == 'LOCAL_DIALOGUE' and len(c['options']) == 2
    assert not any(c[k] for k in ('changesMainRoute','changesAffinity','grantsReward'))
    assert c['options'][0]['reply'] != c['options'][1]['reply']
    rows = s['before'] + s['after'] + [x for o in c['options'] for x in o['reply']]
    labels = [o['label'] for o in c['options']]
    assert len(set(labels)) == len(labels)
    for x in rows:
        assert x['speaker'] in ('이야기','플레이어 닉네임','각청','검수 병사')
        assert (x['kind'] == 'NARRATION') == (x['speaker'] == '이야기')
        assert x['text'].strip()
    bad = re.compile(r'FLAG_|NODE_ID|ROUTE_|ISK_L|R39_|CHOICE_GROUP|\{PLAYER_NAME\}|코드|런타임|노드|플래그|K[12]')
    for t in [x['text'] for x in rows] + labels:
        assert not bad.search(t), t
        assert not any(w in t for w in ('호법야차','소에게','소의 경고','죽음과 생명','마신을 미워'))
    body = '\n'.join(map(render,s['before'])) + f"\n**선택 — {c['prompt']}**\n\n"
    for i,o in enumerate(c['options'],1):
        body += f"**{i}. “{o['label']}”**\n\n" + '\n'.join(map(render,o['reply'])) + '\n'
        assert not any(x['text'] == o['label'] for x in o['reply'])
    body += '**합류**\n\n' + '\n'.join(map(render,s['after']))
    assert m.split('\n---\n\n',1)[1].split('\n---\n',1)[0] == body
    assert not s['exit']['porterLocated'] and not s['exit']['keqingRecognizesProtagonistFace']
    assert s['exit']['portersCurrentLifeStatus'] == 'unknown'
    assert not s['exit']['riteSiteArrivalCommitted']
    five = json.loads((HERE/'SCENE_005_01.json').read_text(encoding='utf-8'))
    a = five['after']; i = next(i for i,x in enumerate(a) if x['text'] == '그럼... 고맙습니다.')
    assert a[i+1] == {'kind':'DIALOGUE','speaker':'각청','text':'......'}
    assert a[i+2] == {'kind':'DIALOGUE','speaker':'각청','text':'인사는 들었으니까, 이제 정말 가서 쉬어.'}
    paths = []
    for i,o in enumerate(c['options'],1):
        path = s['before'] + [{'text':o['label']}] + o['reply'] + s['after']
        paths.append({'option':i,'units':len(path),'characters':sum(len(x['text']) for x in path),'declaredExitRoute':'K2'})
    result = {'task':'006.01','revision':2,'ok':True,'scope':'manuscript text and declared structure only; no game/browser/server execution',
      'readingPaths':paths,'choiceGroups':1,'optionsPerGroup':2,'bodyAndStructuredTextMatch':True,
      'fiveSeparateSilenceExact':True,'choicesHaveDifferentReplies':True,'mainRouteChanged':False,
      'nextSiteNotYetReached':True,'gameIntegration':'pending','testServerDeployment':'not_done',
      'manuscriptSha256':hashlib.sha256((HERE/'WORK_006_01.md').read_bytes()).hexdigest()}
    (HERE/'VALIDATION_006_01.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return result

if __name__ == '__main__':
    print(json.dumps(validate(),ensure_ascii=False,indent=2))
