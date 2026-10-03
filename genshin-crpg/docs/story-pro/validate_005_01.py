"""Validate authored text/choices only. Does not execute the CRPG or contact a server."""
from pathlib import Path
import hashlib
import json
import re

HERE = Path(__file__).resolve().parent

def render_line(row):
    text = row['text'] if row['kind'] == 'NARRATION' else '“' + row['text'] + '”'
    return f"**{row['speaker']}**  \n{text}\n"

def validate():
    scene = json.loads((HERE / 'SCENE_005_01.json').read_text(encoding='utf-8'))
    manuscript = (HERE / 'WORK_005_01.md').read_text(encoding='utf-8')
    before, after, choice = scene['before'], scene['after'], scene['choice']
    thanks = next(i for i, row in enumerate(after) if row['text'] == '그럼... 고맙습니다.')
    assert after[thanks+1] == {'kind':'DIALOGUE','speaker':'각청','text':'......'}
    assert after[thanks+2]['speaker'] == '각청' and after[thanks+2]['text'] == '인사는 들었으니까, 이제 정말 가서 쉬어.'
    assert sum(row['text'] == '......' for row in before+after) == 1
    assert scene['task'] == '005.01' and scene['mainRoute'] == 'K2'
    assert choice['type'] == 'LOCAL_DIALOGUE' and len(choice['options']) == 2
    assert not any(choice[key] for key in ('changesMainRoute', 'grantsReward', 'changesAffinity'))
    labels = [option['label'] for option in choice['options']]
    assert len(set(labels)) == 2
    replies = [option['reply'] for option in choice['options']]
    assert replies[0] != replies[1]
    rows = before + after + [row for reply in replies for row in reply]
    for row in rows:
        assert row['speaker'] in {'이야기', '각청', '플레이어 닉네임', '짐꾼', '천암군 병사'}
        assert (row['kind'] == 'NARRATION') == (row['speaker'] == '이야기')
        assert row['kind'] in {'NARRATION', 'DIALOGUE'} and row['text'].strip()
    forbidden = re.compile(r'FLAG_|NODE_ID|ROUTE_|ISK_L|R39_|CHOICE_GROUP|\{PLAYER_NAME\}|코드|런타임|노드|플래그|관계 회수|K[12]')
    for text in [row['text'] for row in rows] + labels:
        assert not forbidden.search(text), text
    # This scene must not tell Keqing the warning reserved for the other main route.
    for row in rows:
        assert not any(word in row['text'] for word in ('호법야차', '소에게', '소의 경고', '죽음과 생명', '마신'))
    body = '\n'.join(map(render_line, before)) + f"\n**선택 — {choice['prompt']}**\n\n"
    for i, option in enumerate(choice['options'], 1):
        body += f"**{i}. “{option['label']}”**\n\n" + '\n'.join(map(render_line, option['reply'])) + '\n'
        assert not any(row['text'] == option['label'] for row in option['reply'])
    body += '**합류**\n\n' + '\n'.join(map(render_line, after))
    actual = manuscript.split('\n---\n\n', 1)[1].split('\n---\n', 1)[0]
    assert body == actual, 'Manuscript and structured text differ'
    assert scene['exit'] == {
        'mainRoute': 'K2', 'harborAccess': 'unchanged_closed',
        'xiaoWarningToldToKeqing': False, 'cargoCaseSolved': False,
        'keeper': 'soldiers', 'peopleMayLeaveAfterInformingSoldier': True,
        'elapsedTimeCommitted': False,
    }
    paths = []
    for i, option in enumerate(choice['options'], 1):
        path = before + [{'kind': 'DIALOGUE', 'speaker': '플레이어 닉네임', 'text': option['label']}] + option['reply'] + after
        paths.append({'option': i, 'units': len(path), 'characters': sum(len(row['text']) for row in path), 'declaredExitRoute': scene['exit']['mainRoute']})
    result = {
        'task': '005.01', 'ok': True,
        'scope': 'manuscript text and declared choice structure only; not game, browser or server execution',
        'choiceGroups': 1, 'optionsPerGroup': 2, 'readingPaths': paths,
        'bodyAndStructuredTextMatch': True, 'choiceSpecificRepliesDistinct': True,
        'chosenTextNotImmediatelyRepeated': True, 'K1WarningAbsentFromBody': True,
        'declaredRouteChange': False, 'declaredAffinityChange': False, 'declaredReward': False,
        'maxUnitCharacters': max(len(row['text']) for row in rows),
        'manuscriptSha256': hashlib.sha256((HERE/'WORK_005_01.md').read_bytes()).hexdigest(),
        'gameIntegration': 'pending', 'testServerDeployment': 'not_done',
    }
    (HERE / 'VALIDATION_005_01.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return result

if __name__ == '__main__':
    print(json.dumps(validate(), ensure_ascii=False, indent=2))
