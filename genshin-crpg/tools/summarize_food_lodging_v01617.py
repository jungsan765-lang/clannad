#!/usr/bin/env python3
"""Compact native audit evidence without changing or rerunning gameplay."""
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'docs/data'


def digest(value):
    return hashlib.sha256(value).hexdigest()


def read(name):
    return json.loads((DATA / f'{name}.json').read_text())


def compact(name, kind):
    path = DATA / f'{name}.json'
    raw = path.read_bytes()
    source = json.loads(raw)
    packed = gzip.compress(raw, compresslevel=9, mtime=0)
    zipped = DATA / f'{name}.json.gz'
    zipped.write_bytes(packed)
    assert gzip.decompress(packed) == raw
    result = {key: value for key, value in source.items() if key not in ['rows', 'catalog']}
    result['fullEvidence'] = {
        'path': f'docs/data/{zipped.name}', 'gzipBytes': len(packed),
        'gzipSha256': digest(packed), 'uncompressedBytes': len(raw),
        'uncompressedSha256': digest(raw), 'compressionMtime': 0,
    }
    if kind == 'menus':
        result['catalog'] = source['catalog']
        result['rows'] = []
        for row in source['rows']:
            a = row['actual']
            result['rows'].append({
                **{k: row[k] for k in ['mode', 'levels', 'route', 'region', 'hpLoss', 'menu', 'priority']},
                'innMora': {region: x['quote']['cost'] for region, x in row['inn'].items()},
                'actual': {k: a.get(k) for k in [
                    'blocked', 'foodCounts', 'ingredients', 'craftedServings', 'craftActions',
                    'mealBatchActions', 'inputBudgetSeconds', 'gameMinutes', 'craftMora',
                    'ingredientNpcOpportunityMora', 'ownedIngredientTotalMora',
                    'purchasedIngredientMoraLowerBound', 'allNpcMoraLowerBound',
                    'minimumNpcMoraLowerBound', 'requestedHealing', 'actualHealed', 'overheal'
                ]},
            })
    else:
        result['comparisons'] = source['comparisons']
        result['rows'] = [
            {k: v for k, v in row.items() if k not in ['battles', 'recoveries', 'mealReceipts', 'lodgingReceipts', 'prep']}
            for row in source['rows']
        ]
    output = DATA / f'{name}_summary.json'
    output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n')
    return result


def main():
    baseline = compact('food_lodging_v01617_baseline', 'menus')
    final = compact('food_lodging_v01617_final', 'menus')
    all_foods = compact('food_lodging_v01617_all', 'menus')
    campaign = compact('food_campaign_v01617_final', 'campaign')
    supply = read('food_supply_v01617_final')
    table = []
    for row in final['rows']:
        if row['mode'] == 'SAME_LEVEL_FOUR' and row['hpLoss'] == .5 and row['route'] == 'ROUTE_TRAVELER' and row['menu'] == 'EASY' and row['priority'] == 'allNpc':
            table.append({
                'level': row['levels'], 'region': row['region'], 'innMora': row['innMora'][row['region']],
                **row['actual'],
                'scope': 'EASY six-food menu; catalog lower bound excludes stocks/unlocks/acquisition/travel; not global best menu',
            })
    foods = []
    for food in supply['foods']:
        foods.append({
            'food': food['food'], 'name': food['name'], 'baseHealing': food['baseHealing'],
            'recipe': food['recipe'], 'cookingMora': food['cost']['mora'], 'ingredients': food['cost']['items'],
            'ingredientNpcOpportunityMora': food['ingredientNpcOpportunityMora'] - food['cost']['mora'],
            'ownedIngredientTotalMora': food['ingredientNpcOpportunityMora'],
            'unlock': food['unlock'], 'regionalPrices': food['regional'],
        })
    result = {
        'version': '0.16.17', 'baselineVersion': '0.16.16',
        'gameplayChanged': ['Fixed 2–4 Mora cooking charge on 45 existing recovery foods'],
        'preserved': ['Healing', 'Ingredients', 'Combat', 'Inn pricing', 'Recipe availability', 'Food repeat/KO restrictions', 'Trading and passive mechanics'],
        'source': final['provenance'],
        'counts': {'baselineMenus': baseline['counts'], 'finalMenus': final['counts'], 'allFoodMenus': all_foods['counts'], 'supply': supply['counts'], 'campaign': campaign['counts']},
        'easyMenuHalfHpFourPartyTable': table,
        'allFoodMenuRows': all_foods['rows'],
        'foods': foods,
        'campaignComparisons': campaign['comparisons'],
        'limitations': [
            'Wallet savings do not equal savings including ingredient resale opportunity or market cost.',
            'Zero-stock ingredient acquisition is measured separately from prepared stock use.',
            'Menu stock ownership and learned recipe flags are declared synthetic setup; one-time unlock costs are not recurring costs.',
            'Catalog purchase alternatives are lower bounds rather than executed unlimited NPC purchases.',
            'Real-time estimates use native scenes/presentation and declared input time; WORLD_TIME cooking minutes are not real minutes.',
            'Fixed four-member reference parties and selected seeds do not establish every build or actual player-market price.',
        ],
    }
    path = DATA / 'food_lodging_v01617_comparison.json'
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'output': str(path), 'counts': result['counts']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
