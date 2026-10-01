"""Manuscript-only checks; never loads the game or contacts a server."""
from pathlib import Path
import hashlib
import json
import re

HERE = Path(__file__).resolve().parent

def render(row):
    text = row['text'] if row['kind'] == 'NARRATION' else '“' + row['text'] + '”'
    return f"**{row['speaker']}**  \n{text}\n"

def validate():
    scene = json.loads((HERE / 'SCENE_007_01.json').read_text(encoding='utf-8'))
    manuscript = (HERE / 'WORK_007_01.md').read_text(encoding='utf-8')
    choice = scene['choice']
    assert scene['task'] == '007.01' and scene['mainRoute'] == 'K2'
    assert choice['type'] == 'LOCAL_DIALOGUE' and len(choice['options']) == 2
    assert not any(choice[k] for k in ('changesMainRoute', 'changesAffinity', 'grantsReward'))
    assert choice['options'][0]['reply'] != choice['options'][1]['reply']
    rows = scene['before'] + scene['afterChoice'] + scene['afterAction']
    rows += [r for o in choice['options'] for r in o['reply']]
    for row in rows:
        assert row['speaker'] in {'이야기', '호위 병사', '플레이어 닉네임'}
        assert (row['kind'] == 'NARRATION') == (row['speaker'] == '이야기')
        assert row['kind'] in {'NARRATION', 'DIALOGUE'} and row['text'].strip()
    labels = [o['label'] for o in choice['options']]
    assert len(set(labels)) == 2
    bad = re.compile(r'FLAG_|NODE_ID|ROUTE_|ISK_L|R39_|CHOICE_GROUP|\{PLAYER_NAME\}|코드|런타임|노드|플래그|K[12]')
    for text in [r['text'] for r in rows] + labels + [scene['fieldAction']['prompt']]:
        assert not bad.search(text), text
    body = '\n'.join(map(render, scene['before'])) + f"\n**선택 — {choice['prompt']}**\n\n"
    for i, option in enumerate(choice['options'], 1):
        body += f"**{i}. “{option['label']}”**\n\n" + '\n'.join(map(render, option['reply'])) + '\n'
        assert not any(r['text'] == option['label'] for r in option['reply'])
    body += '**합류**\n\n' + '\n'.join(map(render, scene['afterChoice']))
    body += f"\n**현장 행동 — {scene['fieldAction']['prompt']}**\n\n"
    body += '\n'.join(map(render, scene['afterAction']))
    assert manuscript.split('\n---\n\n', 1)[1].split('\n---\n', 1)[0] == body
    assert scene['fieldAction']['basisAnchor'] == 'ISK_L04_K2_001'
    assert scene['fieldAction']['basisKind'] == 'DESTROY'
    assert scene['exit']['rescuersReachedHand'] and not scene['exit']['extractionComplete']
    assert scene['exit']['tartagliaLocation'] == 'not_confirmed'
    assert not scene['exit']['porterReunionShown']
    five = json.loads((HERE / 'SCENE_005_01.json').read_text(encoding='utf-8'))['after']
    thanks = next(i for i, r in enumerate(five) if r['text'] == '그럼... 고맙습니다.')
    assert five[thanks + 1] == {'kind': 'DIALOGUE', 'speaker': '각청', 'text': '......'}
    assert five[thanks + 2]['text'] == '인사는 들었으니까, 이제 정말 가서 쉬어.'
    paths = []
    for i, o in enumerate(choice['options'], 1):
        path = scene['before'] + [{'text': o['label']}] + o['reply'] + scene['afterChoice'] + scene['afterAction']
        paths.append({'option': i, 'utteranceAndNarrationUnits': len(path), 'bodyCharacters': sum(len(r['text']) for r in path), 'declaredFieldActions': 1, 'declaredExitRoute': 'K2'})
    result = {'task': '007.01', 'ok': True, 'scope': 'manuscript text and declared structure only; not game/browser/server execution',
        'readingPaths': paths, 'choiceGroups': 1, 'optionsPerGroup': 2, 'bodyAndStructuredTextMatch': True,
        'choicesHaveDifferentReplies': True, 'priorFiveSilencePreserved': True,
        'maxUnitCharacters': max(len(r['text']) for r in rows),
        'gameIntegration': 'pending', 'testServerDeployment': 'not_done',
        'manuscriptSha256': hashlib.sha256((HERE / 'WORK_007_01.md').read_bytes()).hexdigest()}
    (HERE / 'VALIDATION_007_01.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return result

if __name__ == '__main__':
    print(json.dumps(validate(), ensure_ascii=False, indent=2))
