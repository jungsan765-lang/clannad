#!/usr/bin/env python3
"""Verify preserved ascension evidence and unchanged cost rules without rerunning 210 native cases."""
import argparse,hashlib,json,re
from pathlib import Path

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root',type=Path,required=True)
    parser.add_argument('--baseline-root',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    pack=Path(__file__).resolve().parent
    manifest=json.loads((pack.parent/'baseline_product_manifest.json').read_text())
    entries=manifest['files']
    for entry in entries:
        content=(args.baseline_root/entry['path']).read_bytes()
        assert len(content)==entry['bytes'],entry['path']
        assert hashlib.sha256(content).hexdigest()==entry['sha256'],entry['path']
        assert hashlib.sha1(b'blob '+str(len(content)).encode()+b'\0'+content).hexdigest()==entry['gitBlob'],entry['path']
    prior=(args.baseline_root/'source/runtime_growth_v01522.js').read_text()
    current=(args.source_root/'source/runtime_growth_v01522.js').read_text()
    patterns={
        'gemRewards':r'const ASCENSION_GEMS_V01616=.+?;',
        'gemCosts':r'const ASCENSION_GEM_COSTS_V01616=.+?;',
        'growthElement':r'P.growthElement=function.+?;};',
        'ascensionInfo':r'P.ascensionInfo=function\(owner=PLAYER\)\{.*?\n};',
    }
    equal={}
    for name,pattern in patterns.items():
        before=re.search(pattern,prior,re.S);after=re.search(pattern,current,re.S)
        assert before and after,name
        assert before.group()==after.group(),name
        equal[name]={'identical':True,'sha256':hashlib.sha256(after.group().encode()).hexdigest()}
    quotes=json.loads((pack/'native_quotes.json').read_text())
    assert len(quotes['quotes'])==210
    assert len(quotes['domainRows'])==96
    assert len(quotes['protagonistPayments'])==12
    recorded_parity=json.loads((pack/'baseline_cost_parity.json').read_text())
    for name in patterns:
        assert recorded_parity[name]['same']
        assert recorded_parity[name]['current']==re.search(patterns[name],current,re.S).group(),name
    for route in ['ROUTE_TRAVELER','ROUTE_ISEKAI']:
        rows=[x for x in quotes['quotes'] if x['route']==route and x['owner']=='PLAYER_CUSTOM']
        assert [x['quote']['cost']['items'].get('GROWTH_GEM_NEUTRAL',0) for x in rows]==[3,6,12,45,192,1250,0]
        assert [x['quote']['cost']['mora'] for x in rows]==[800,2400,6000,14000,28000,42000,0]
    for row in quotes['protagonistPayments']:
        assert row['receiptPreserved'] is True
        assert row['restoredPhase']==row['phase']+1
    rewards={}
    for row in quotes['domainRows']:
        element=row['element'];level=row['domain']['level'];item='GROWTH_GEM_'+element
        assert row['boosted']['items'][item]==2*row['base']['items'][item]
        rewards.setdefault(element,{})[level]=row['base']['items'][item]
    assert rewards['ELECTRO'][25]==6
    assert rewards['PYRO'][25]==21
    assert rewards['PYRO'][30]==18
    result={
        'readOnly':True,
        'restoredBaselineFileCount':len(entries),
        'everyBaselineByteAndGitBlobVerified':True,
        'publishedBaselineSHA':manifest['publishedBaseline'],
        'fourCostPolicySectionsIdentical':equal,
        'savedNativeQuoteCountVerified':210,
        'savedRewardCountVerified':96,
        'savedPaymentReloadAndRetryCountVerified':12,
        'lv25BaseRewards':{'ELECTRO':6,'PYRO':21},
        'pyroBaseRewardDecline':{'level25':21,'level30':18},
        'fullNativeCaseRerun':False,
        'currentCombatDurationValidation':False,
        'sourceChangeCount':0,
    }
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))
if __name__=='__main__':main()
