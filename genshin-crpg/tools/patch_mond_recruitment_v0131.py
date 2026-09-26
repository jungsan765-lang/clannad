#!/usr/bin/env python3
"""Idempotent, local v0.13.1 content patch; never writes the connected spreadsheet."""
import json
from pathlib import Path

EARLY_FLAGS = {
    'ROUTE_TRAVELER': ('FLAG_TRV_MON_CH2_CLEAR', 'FLAG_TRV_MON_PROLOGUE_CLEAR'),
    'ROUTE_ISEKAI': ('FLAG_ISK_M05_CLEAR', 'FLAG_ISK_MON_PROLOGUE_CLEAR'),
}
EXCLUDED = {'LEG_MOND_VENTI', 'LEG_ISK_MOND_DILUC'}

def patch(db):
    headers = db['56_MOND_LEGEND_DB'][0]
    node_headers = db['57_MOND_STORY_SCENE_DB'][0]
    definitions = {r[0]: dict(zip(headers, r)) for r in db['56_MOND_LEGEND_DB'][1:] if r}
    targets = {k: d for k, d in definitions.items() if d.get('REGION') == '몬드' and k not in EXCLUDED}
    quests = {d['QUEST_ID']: d for d in targets.values()}
    changed = []

    def early(condition, route):
        if not condition:
            return condition
        late, initial = EARLY_FLAGS[route]
        value = condition.replace(late, initial)
        for term in ('Q_ISK_MOND_03=완료 && ', 'DONE(Q_ISK_MOND_03)=TRUE && '):
            value = value.replace(term, '')
        return value

    for row in db['56_MOND_LEGEND_DB'][1:]:
        if not row or row[0] not in targets:
            continue
        d = targets[row[0]]
        before = row[headers.index('START_CONDITION')]
        row[headers.index('START_CONDITION')] = early(before, d['ROUTE_SCOPE'])
        row[headers.index('MAIN_FLAG_GATE')] = EARLY_FLAGS[d['ROUTE_SCOPE']][1]
        d['START_CONDITION'] = row[headers.index('START_CONDITION')]
        if before != d['START_CONDITION']:
            changed.append(d['LEGEND_ID'])
        i = headers.index('NOTE')
        note = str(row[i] or '')
        marker = 'v0.13.1: 몬드 도입부 이후 식당·술집 소개; 본편 최종 완료 불필요.'
        if marker not in note:
            row[i] = (note + ' ' + marker).strip()

    for row in db['22_QUEST_DB'][1:]:
        if not row or row[0] not in quests:
            continue
        row[4] = early(row[4], quests[row[0]]['ROUTE_SCOPE'])
        if isinstance(row[9], str):
            row[9] = row[9].replace('몬드 본편 뒤 독립 진행.', '몬드 도입부 이후 독립 진행.')

    for row in db['57_MOND_STORY_SCENE_DB'][1:]:
        if len(row) <= 12 or row[2] not in targets:
            continue
        # Preserve the authored post-story Jean greetings; a disjoint early greeting is added below.
        if row[4] not in {'LEG_ISK_MOND_JEAN_GREETING_K', 'LEG_ISK_MOND_JEAN_GREETING_OTHER'}:
            # Eula's late greetings deliberately retain their own story-history checks.
            if not row[4].startswith('LEG_ISK_MOND_EULA_ROUTE_') and row[4] != 'ISK_EULA_MET_AA_01':
                row[11] = early(row[11], row[0])

    def node(id):
        return next(r for r in db['57_MOND_STORY_SCENE_DB'][1:] if len(r) > 4 and r[4] == id)

    def add_node(**values):
        id = values['NODE_ID']
        row = [values.get(h, '') for h in node_headers]
        rows = db['57_MOND_STORY_SCENE_DB']
        at = next((i for i, r in enumerate(rows) if len(r) > 4 and r[0] == values['ROUTE_ID'] and r[4] == id), None)
        if at is None:
            rows.append(row)
        else:
            rows[at] = row
        return row

    # Diluc always keeps a normal post-Mond personal acquisition route.
    # Some authored story branches may already have recruited him; runtime waives this personal quest cost in that case.
    diluc = definitions.get('LEG_ISK_MOND_DILUC')
    if diluc:
        condition = 'ROUTE_ID=ROUTE_ISEKAI && FLAG_ISK_M05_CLEAR=TRUE && FLAG_LEG_ISK_MOND_DILUC_CLEAR=FALSE && CURRENT_MAP_ID=MAP_MOND_DAWN_WINERY'
        row = next(r for r in db['56_MOND_LEGEND_DB'][1:] if r and r[0] == 'LEG_ISK_MOND_DILUC')
        row[headers.index('START_CONDITION')] = condition
        row[headers.index('MAIN_FLAG_GATE')] = 'FLAG_ISK_M05_CLEAR'
        row[headers.index('RECRUIT_MODE')] = 'STORY_OR_LEGEND_OPT_IN'
        row[headers.index('COST_MORA')] = 650
        row[headers.index('COST_ITEMS_JSON')] = json.dumps({'ORE_CRYSTAL':4,'MAT_DAMAGED_MASK':3}, ensure_ascii=False, separators=(',', ':'))
        diluc.update(START_CONDITION=condition, MAIN_FLAG_GATE='FLAG_ISK_M05_CLEAR', RECRUIT_MODE='STORY_OR_LEGEND_OPT_IN',
                     COST_MORA=650, COST_ITEMS_JSON=row[headers.index('COST_ITEMS_JSON')])
        entry = next((r for r in db['57_MOND_STORY_SCENE_DB'][1:] if len(r)>11 and r[0]=='ROUTE_ISEKAI' and r[4]==diluc['ENTRY_NODE_ID']), None)
        if entry: entry[11] = condition

    # Preserve early/late branch history instead of letting post-clear prose run during the prologue.
    start = node('LEG_ISK_MOND_JEAN_START')
    start[9] = start[9].replace('몬드의 명예기사라는 호칭보다', '형식적인 인사보다')
    prep = node('LEG_ISK_MOND_JEAN_PREP_2')
    prep[9] = prep[9].replace('명예기사라는 이유로', '일을 부탁드린다는 이유로')
    late = node('LEG_ISK_MOND_JEAN_GREETING_OTHER')
    early_greeting = dict(zip(node_headers, late))
    early_greeting.update(NODE_ID='LEG_ISK_MOND_JEAN_GREETING_EARLY',
        PRECONDITION='FLAG_ISK_M05_CLEAR=FALSE',
        TEXT_KO='소개를 받고 와 주셨군요. 구호물품 장부에는 수량이 맞는데, 현장에서는 비상함이 비어 있다고 합니다. 확인을 도와주실 수 있을까요? 아직 물자가 도착하지 않은 사람들을 더 기다리게 하고 싶지는 않아요.',
        NOTE='v0.13.1: 본편 완료 전 전용 인사. 설산 동행·명예기사 칭호를 선취하지 않음.')
    add_node(**early_greeting)
    for id in ['LEG_ISK_MOND_EULA_ROUTE_AA', 'LEG_ISK_MOND_EULA_ROUTE_K', 'LEG_ISK_MOND_EULA_ROUTE_AB', 'LEG_ISK_MOND_EULA_ROUTE_B', 'ISK_EULA_MET_AA_01']:
        row = node(id)
        if 'FLAG_ISK_M05_CLEAR' not in (row[11] or ''):
            row[11] = (row[11] or 'TRUE') + ' && FLAG_ISK_M05_CLEAR=TRUE'
    template = dict(zip(node_headers, node('LEG_ISK_MOND_EULA_ROUTE_K')))
    template.update(NODE_ID='LEG_ISK_MOND_EULA_ROUTE_EARLY', PRECONDITION='FLAG_ISK_M05_CLEAR=FALSE',
        TEXT_KO='本편 갈래가 확정되기 전에는 현재 시점의 첫 만남으로 이어진다.'.replace('本', '본'),
        NOTE='v0.13.1: 미결정·K·AA·AB·B의 본편 완료 전 공통 첫 만남. 이후 출발 인사를 소급하지 않음.')
    add_node(**template)
    node('LEG_ISK_MOND_EULA_START')[9] = '몬드 도입부 이후 별도 전설 임무의 개방 조건과 실제 만남 시점을 확인한다.'

    # The existing affirmative Jean choice must actually recruit; Eula receives an explicit proposal.
    jean = definitions['LEG_ISK_MOND_JEAN']
    join = node('LEG_ISK_MOND_JEAN_END_JOIN')
    effect = 'UNLOCK_CARD_ONCE:MOND_JEAN:' + jean['RECRUIT_FLAG_ID']
    if effect not in (join[12] or ''):
        join[12] = (join[12] or '') + ';' + effect
    node('LEG_ISK_MOND_EULA_END')[13] = 'LEG_ISK_MOND_EULA_REJOIN_START'

    # Existing first-contact source material becomes a playable, saveable introduction, not a free card.
    contacts = []
    for row in db['51_EVENT_DB'][1:]:
        if not row or row[0] not in {'EVT_MOND_MIKA_INTRO', 'EVT_MOND_MONA_INTRO'}:
            continue
        event = row[0]
        row[5] = early(row[5], 'ROUTE_TRAVELER')
        row[12] = str(row[12] or '').replace('본편 뒤', '도입부 이후')
        payload = json.loads(row[13])
        if event == 'EVT_MOND_MIKA_INTRO':
            payload['dialogue'][1] = '페이몬: 지도에 지워진 길이 있어? 직접 살펴봐야 하는 거야?'
        row[13] = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
        profile = payload['profile_id']
        name = next(r[2] for r in db['04_CHAR_DB'][1:] if r and r[0] == profile)
        host = '디어 헌터의 사라' if event == 'EVT_MOND_MIKA_INTRO' else '천사의 몫의 찰스'
        base = dict(ROUTE_ID='ROUTE_TRAVELER', QUEST_ID=event, ARC_ID=event, SCENE_ID=event,
                    MAP_ID='MAP_MOND_CITY', CANON_SCOPE='CRPG_ORIGINAL', STATUS='ACTIVE', ORDER_INDEX=1,
                    NOTE='v0.13.1: 51_EVENT_DB의 기존 첫 만남을 연결. 수락 전 플래그·재화·동료 보상 없음.')
        group = event + '_CHOICE'
        add_node(**base, NODE_ID=event + '_START', NODE_TYPE='NARRATION',
                 TEXT_KO=f'{host}에게서 이야기를 듣고 {payload["location"]}으로 향했다. 그곳에서 {name}의 부탁을 직접 들어 보기로 했다.',
                 NEXT_NODE_ID=event + '_LINE_1')
        for i, line in enumerate(payload['dialogue'], 1):
            speaker, text = line.split(':', 1)
            add_node(**base, NODE_ID=f'{event}_LINE_{i}', NODE_TYPE='DIALOGUE',
                     SPEAKER_REF=profile if speaker == name else 'NPC_PAIMON', SPEAKER_NAME=speaker,
                     TEXT_KO=text.strip(), NEXT_NODE_ID=f'{event}_LINE_{i+1}' if i < len(payload['dialogue']) else 'CHOICE_GROUP:' + group)
        for choice in payload['choices']:
            effects = ';'.join(f'{k}={"TRUE" if v else "FALSE"}' for k, v in choice['on_accept'].items())
            add_node(**base, NODE_ID=event + '_' + choice['id'].upper(), NODE_TYPE='CHOICE',
                     CHOICE_LABEL=choice['label'], CHOICE_GROUP_ID=group, EFFECT_ON_RESOLVE=effects,
                     NEXT_NODE_ID='SCREEN:CRPG_MAIN')
        contacts.append(event)

    # Existing M05 greeting machinery can now acknowledge an Eula met during the early personal quest.
    for row in db['55_MAIN_STORY_DB'][1:]:
        if len(row) > 19 and row[4] == 'ISK_M05_AA_212' and 'GREETING_VARIANT_JSON=' not in str(row[19]):
            greeting = {'profile_id': 'PROFILE_MOND_EULA', 'condition': 'FIRST_CONTACT_BEFORE_M05_ENTRY',
                        'first_text': row[9], 'reunion_text': '다시 보는군. 명예기사 칭호를 받았다는 이야기는 들었어. 이번에는 리월로 간다지? 전에 맞춰 본 기록처럼, 길에서도 확인한 사실을 먼저 믿도록 해.'}
            row[19] = (str(row[19] or '') + ' GREETING_VARIANT_JSON=' + json.dumps(greeting, ensure_ascii=False, separators=(',', ':'))).strip()
    return {'changedLateGates': len(changed), 'legendsWithEarlyPolicy': len(targets),
            'firstContactScenes': contacts, 'preservedSpecialLegends': sorted(EXCLUDED)}

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    file = root / 'content/db.json'
    db = json.loads(file.read_text())
    report = patch(db)
    file.write_text(json.dumps(db, ensure_ascii=False, separators=(',', ':')))
    (root / 'reports/mond-recruitment-content-v0131.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False))
