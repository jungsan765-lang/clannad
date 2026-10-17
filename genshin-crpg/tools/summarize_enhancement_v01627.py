#!/usr/bin/env python3
"""Summarize native max+12 proof and exact absorbing-chain enhancement cost."""
import argparse, gzip, hashlib, json
from pathlib import Path
import numpy as np

p=argparse.ArgumentParser();p.add_argument('--root',default=str(Path(__file__).resolve().parents[1]));p.add_argument('--folder');p.add_argument('--wealth-input');a=p.parse_args()
root=Path(a.root).resolve();folder=Path(a.folder).resolve() if a.folder else root/'docs/data/balance_v01627/enhancement'
raw=gzip.decompress((folder/'native.json.gz').read_bytes());d=json.loads(raw);m=json.loads((folder/'manifest.json').read_text())
assert hashlib.sha256(raw).hexdigest()==m['uncompressedSha256']
assert hashlib.sha256((folder/'native.json.gz').read_bytes()).hexdigest()==m['gzipSha256']
assert d['counts']['errors']==0 and d['counts']['domainBattles']==36 and d['counts']['domainWins']==36
assert all(x['endpoint']['allFullHp'] for x in d['domains'])
c=d['enhancementConfig'];A=np.eye(12);C=np.zeros(12)
for current in range(12):
    j=current+1;up=c['success'][j]/10000;down=c['down'][j]/10000;hold=1-up-down
    A[current,current]-=hold
    if current+1<12:A[current,current+1]-=up
    if current:A[current,current-1]-=down
    C[current]=c['mora'][j]
v=np.linalg.solve(A,C)
checks=[]
for q in d['expectedPaths']:
    target=q['to'];AA=np.eye(target);CC=np.zeros(target)
    for current in range(target):
        j=current+1;up=c['success'][j]/10000;down=c['down'][j]/10000;hold=1-up-down
        AA[current,current]-=hold
        if current+1<target:AA[current,current+1]-=up
        if current:AA[current,current-1]-=down
        CC[current]=c['mora'][j]
    direct=float(np.linalg.solve(AA,CC)[q['from']])+(c['ascensionCost']['mora'] if target>10 else 0)
    error=abs(direct-q['mora']);assert error<1e-5
    checks.append({'from':q['from'],'to':target,'directAbsorbingChainMora':direct,'recurrenceMora':q['mora'],'error':error})
names={'PLAYER_CUSTOM':'이세계인','LIYUE_ZHONGLI':'종려','MOND_DILUC':'다이루크','MOND_JEAN':'진'}
sets={'CRAFT':'단조 대표','BOSS_EXCLUSIVE':'전용·보스 대표'}
by={(x['level'],x['set'],x['enhance']):x for x in d['actorStats']};increases=[]
for lv in [25,60]:
    for setid in sets:
        rows=[by[(lv,setid,x)]['actors'] for x in [6,10,12]]
        for index,old in enumerate(rows[1]):
            new=rows[2][index]
            increases.append({'level':lv,'set':setid,'owner':old['owner'],'hpPct':100*(new['hp']/old['hp']-1),'atkPct':100*(new['atk']/old['atk']-1),'defPct':100*(new['def']/old['def']-1)})
def reward(q):return q['xp'] if q['kind']=='EXP' else sum(q['items'].values())
# Current actual same-full-inn wealth endpoint is supplied explicitly.
# Historical default remains only for regenerating the original report.
wealthPath=Path(a.wealth_input) if a.wealth_input else None
wealthRaw=(gzip.decompress(wealthPath.read_bytes()) if wealthPath.suffix=='.gz' else wealthPath.read_bytes()) if wealthPath else None
wealth=json.loads(wealthRaw) if wealthRaw else None
if wealth:assert wealth['fingerprint']==d['fingerprint'] and all(q['endpoint']['allFullHp'] for q in wealth['rows'])
cashSeconds=max(q['marginalSecondsPerMora'] for q in wealth['rows']) if wealth else 147.84/40019
domains=[]
for kind in ['EXP','TALENT','ASCENSION']:
    lo=next(q for q in d['domains'] if q['kind']==kind and q['stage']==55)
    hi=next(q for q in d['domains'] if q['kind']==kind and q['stage']==60)
    pct=100*((reward(hi)/hi['seconds'])/(reward(lo)/lo['seconds'])-1)
    cashPct=100*((reward(hi)/(hi['seconds']+hi['lodgingMora']*cashSeconds))/(reward(lo)/(lo['seconds']+lo['lodgingMora']*cashSeconds))-1)
    domains.append({'kind':kind,'lower':{k:lo[k] for k in ['stage','seconds','lodgingMora','wins','xp','items']},'higher':{k:hi[k] for k in ['stage','seconds','lodgingMora','wins','xp','items']},'higherEfficiencyGainPct':pct,'higherCashInclusiveGainPct':cashPct})
receipts=d['preparationReceipts'];actual=[q['ascensionReceipt']['cost']['mora']+sum(x['cost']['mora'] for x in q['attempts']) for q in receipts]
summary={'schema':1,'sourceFingerprint':d['fingerprint'],'dbSha256':d['dbSha256'],'counts':d['counts'],'expectedPaths':d['expectedPaths'],'absorbingChainChecks':checks,'totalActorIncreases10to12':increases,'domains':domains,'nativeActual10to12Cash':{'count':len(actual),'minimum':min(actual),'maximum':max(actual),'mean':sum(actual)/len(actual)},'cashConversion':{'secondsPerMora':cashSeconds,'note':'Marginal replenishment only; actual native wealth campaign selected by --wealth-input, or historical default when omitted. Actual wealth hourly quota persists. Initial gear investment and acquisition excluded from these domain efficiency rows.','rawInput':a.wealth_input,'rawUncompressedSha256':hashlib.sha256(wealthRaw).hexdigest() if wealthRaw else None,'sourceFingerprint':wealth['fingerprint'] if wealth else None},'limitations':['Gear+80% affects equipment bases, not total actor stats.','12 diagnostic stat conditions and 36 top preparation native domain battles, one seed9031, no constellations/artifacts; not every possible weapon/party optimum.','Starting+6/+10 gear, owners, funding and materials are explicit fixtures; public+12 ascension/enhancement itself is native and receipts saved.','Equipment acquisition, mining and earned investment time are not demonstrated by granted inventory.','Full HP at the same Liyue inn after each 6-run sample; all incident combat and native restoration retained.','Top healer/shielder investment sample can finish EXP/ASC with0 innMora; do not claim all endgame teams retain a lodging cash burden.']}
(folder/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
out=[]
def line(x=''):out.append(x)
line('# 0.16.27 장비 강화 상한·경제·비경 추가 점검')
line();line('최대 강화는 기본 +10, 보스 재료로 한도를 돌파하면 +12입니다. 기존 보고서의 “+10 고강화”는 최고 상한 검증이 아니었습니다. 이번에는 실제 공개 돌파·강화 동작으로 +12를 만들고 Lv25/Lv60 총스탯과 최고 투자 비경을 추가 확인했습니다. 제품의 장비·몬스터·전투 계수는 수정하지 않았습니다.')
finalUpgrade=next(x for x in d['expectedPaths'] if x['from']==10 and x['to']==12);finalAll=next(x for x in d['expectedPaths'] if x['from']==0 and x['to']==12)
line();line(f"결론: +12의 “+80%”는 장비 자체의 기본 공격력·방어력·HP 증가입니다. 캐릭터 전체가 80% 강해지는 뜻은 아닙니다. Lv60에서는 +10→12에 따른 총스탯 증가가 대략 0.4~2.2%인 반면, 장비 하나의 추가 기대 지출은 {finalUpgrade['mora']:,.0f}모라입니다. 후반 강화의 가격 대비 순수 수치 이득이 작다는 경제적 한계는 남아 있습니다. 반대로 이미 최대 장비를 가진 계정은 난도 점검에서 제외하면 안 됩니다.")
line();line('## 1. 정확한 확률·강화 견적')
line();line('| 목표 강화 | 성공 | 유지 | 1단계 강등 | 1회 모라 | 1회 광물 |')
line('|---|---:|---:|---:|---:|---|')
for j in [6,10,11,12]:line(f"| +{j} | {c['success'][j]/100:.0f}% | {(10000-c['success'][j]-c['down'][j])/100:g}% | {c['down'][j]/100:g}% | {c['mora'][j]:,} | "+', '.join(f'{id} {n}' for id,n in c['ores'][j].items())+' |')
line();line('한도 돌파는 +10일 때 3,000모라·강적의 잔향 3·강적의 핵 1·수정덩이 5를 한 번 지불합니다. 돌파 자체는 강화도나 스탯을 올리지 않습니다. 이후 +11/+12 시도를 해야 증가합니다. 실패 유지·강등 때도 매번 비용을 지불하며 파괴는 없습니다.')
line();line('| 경로 / 장비 1개 | 기대 모라 | 기대 철광 | 기대 백철 | 기대 수정 | 추가 보스 재료 |')
line('|---|---:|---:|---:|---:|---|')
for q in d['expectedPaths']:
    it=q['items'];boss='잔향 3·핵 1' if q['to']>10 else '없음'
    line(f"| +{q['from']}→+{q['to']} | {q['mora']:,.0f} | {it.get('ORE_IRON',0):,.1f} | {it.get('ORE_WHITE_IRON',0):,.1f} | {it.get('ORE_CRYSTAL',0):,.1f} | {boss} |")
q=next(q for q in d['expectedPaths'] if q['from']==10 and q['to']==12)
line();line(f"4인×3슬롯 전부 +10→12: 기대 현금 {12*q['mora']:,.0f}모라, 백철 {12*q['items']['ORE_WHITE_IRON']:,.0f}, 수정 {12*q['items']['ORE_CRYSTAL']:,.0f}, 잔향36·핵12입니다. 전부 +0→12의 강화 현금은 {12*finalAll['mora']:,.0f}모라입니다. 제작비·재료 매입·광물 채굴·보스 토벌·전투 회복 비용은 여기에 별도입니다.")
line();line('계산은 단순 성공률 나눗셈에서 끝내지 않았습니다. 목표 j 직전부터 성공할 때까지의 기대 비용 F_j=(회당 비용_j + 강등확률_j×F_(j-1))/성공확률_j를 각 모라·재료에 적용했습니다. 별도로 전체 상태 전이 행렬의 흡수 마르코프 연립방정식을 풀어 현금 결과 6경로를 교차 검증했습니다(오차<0.00001모라). 소수 재료 수는 많은 계정의 장기 평균입니다.')
line();line(f"부의 꽃 최고 단계 40,000모라만으로 +10→12 12슬롯 현금을 마련한다면 {12*finalUpgrade['mora']/40000:.2f}회분(정수 지급으로는{int(np.ceil(12*finalUpgrade['mora']/40000))}회)이 필요합니다. 시간당 보상 상한도 있으므로 이를 10분짜리 투자로 계산하지 않습니다. 다만 임무·토벌 등 다른 수입을 제외한 참고치이며 실제 계정의 총 육성 시간으로 단정하지 않습니다. 강화 30분·돌파 60분·제작 1~3시간·보스 48시간 제한은 게임 속 시간이고 실제 벽시계 시간이 아닙니다.")
line();line('## 2. 실제 장비 수치와 취득 비용')
line();line('| 장비 | +6 ATK/DEF/HP | +10 ATK/DEF/HP | +12 ATK/DEF/HP | 제작 모라 | 제작 재료 |')
line('|---|---|---|---|---:|---|')
itemNames={q['id']:q['row'][1] for q in d['itemEconomy']}
for q in d['gearQuotes']:
    def equipStats(x):return '/'.join(f'{x.get(k,0):g}' for k in ['ATK','DEF','MAX_HP'])
    r=q['recipe'];cost=r['cost'] if r else {'mora':0,'items':{}}
    line('| '+q['name']+' | '+' | '.join(equipStats(x['stats']) for x in q['stats'])+f" | {cost['mora']:,} | "+', '.join(f'{id} {n}' for id,n in cost['items'].items())+' |')
line();line('백철·수정·강적의 잔향·핵은 현재 NPC 고정 재고가 없습니다. 아이템 DB의 표시 구매 기준값(백철75·수정150·잔향2700·핵3600)을 실제 NPC 무제한 구매가로 간주하지 않았습니다. 철광은 몬드 실제28모라/일12개, 리월70모라/일10개 재고가 있습니다. 시장 가격은 이용자 거래에 따라 달라지므로 고정 현금으로 환산하지 않았습니다.')
line();line('드발린·안드리우스의 정상 승리 보상은 잔향1~2개 100%, 핵1개35%입니다. 12슬롯 한도 돌파에 핵12개가 필요하므로 핵만으로도 평균 약34.3승분입니다. 잔향 획득 및 두 보스 입장 제한을 함께 적용해야 하며, 실제 필요 횟수는 확률에 따라 변합니다.')
line();line('전용 장비·보스 장비의 보호막/치유/내성 등 고유 특성은 단조 장비와 서로 다릅니다. 같은 장비의 강화도 비교와 장비 종류 교체 효과를 섞지 않았습니다. 예: 진 전용 검 HEAL_OUT15, 종려 전용 창 SHIELD_OUT25, 옥 갑옷 전체 원소 내성12·보호막15, 성배 HEAL_BOOST20. 이 고정 특성은 장비 강화도와 별개의 전투 효율입니다. 모든 실제 특성·제작법·시설 요구조건은 원자료에 있습니다.')
line();line('이 샘플은 기존에 보유한 장비를 전제로 합니다. 진단용 치유사의 브로치 제작시설은 수메르이고, 황금 호박은 공동 제작 준비가 필요합니다. 앞선 “단조 대표” 이름만 보고 해당 계정이 몬드 대장간에서 모든 장비를 즉시 만들 수 있다고 해석하면 안 됩니다. 실제 제작 이유·시설·재료를 원자료에 남겼습니다.')
line();line('기본 ATK/DEF/HP와 증가 효과가 모두 없는 보스 보조장비 2종(뇌광 프리즘 렌즈·응결 꽃 장식)은 강화/돌파를 거부합니다. 이 장비를 유료로 강화를 시켜 돈을 소모하는 결과는 발생하지 않았습니다.')
line();line('## 3. Lv25/Lv60 캐릭터 총스탯')
line();line('각 행은 같은 인물·같은 종류의 무기/갑옷/장신구 3개를 모두 해당 강화도로 갖췄을 때입니다. 숫자는 HP / ATK / DEF입니다. C0, 법적으로 가능한 돌파 단계, 특성10 요청(낮은 레벨은 실제 특성 상한 적용), 성유물 없음. 캐릭터 기본 레벨/돌파 성장까지 포함한 실제 런타임 결과입니다.')
line();line('| 레벨 | 장비군 | 인물 | +6 HP/ATK/DEF | +10 HP/ATK/DEF | +12 HP/ATK/DEF | +10→12 HP/ATK/DEF 증가 |')
line('|---:|---|---|---|---|---|---|')
for lv in [25,60]:
    for setid in sets:
        rows=[by[(lv,setid,x)]['actors'] for x in [6,10,12]]
        for index,old in enumerate(rows[1]):
            q=next(q for q in increases if q['level']==lv and q['set']==setid and q['owner']==old['owner'])
            vals=[' / '.join(f'{x[index][k]:,.1f}'.rstrip('0').rstrip('.') for k in ['hp','atk','def']) for x in rows]
            pct=' / '.join(f'{q[k]:.2f}%' for k in ['hpPct','atkPct','defPct'])
            line(f'| {lv} | {sets[setid]} | {names[old["owner"]]} | '+' | '.join(vals)+' | '+pct+' |')
line();line('Lv25는 총 HP 증가1.2~5.0%, ATK2.2~4.0%, DEF1.6~6.0%; Lv60는 총 HP0.4~2.0%, ATK0.7~1.5%, DEF0.5~2.2%입니다. “+80% 장비이므로 60레벨 캐릭터 전체도 80% 강해진다”는 계산은 성립하지 않습니다. 직접 공격 피해의 실제 증가율은 내성·방어·치명타·고유 특성과 적 패턴의 영향을 추가로 받습니다.')
line();line('## 4. 최고 투자 +12 비경 연전 확인')
line();line('이세계인·종려·다이루크·진 C0 Lv60, 특성10, 전용/보스 장비 각3슬롯 +12, 성유물 없음, 시드9031입니다. 이전 +10을 진단용으로 보유시킨 뒤 EQUIP_ASCEND와 ENHANCE를 실제 공개 동작으로 지불하여 준비했습니다. 전투 적/피해/회복/확률/행동은 수정하지 않았습니다. 음식은 쓰지 않았으며 첫 시작 이후 HP를 덮어쓰지 않았습니다.')
line();line('55/60단계마다6연전, 필요 시 실제 숙박 왕복, 마지막에는 실제 이동/길 위 전투/숙박 후 같은 리월항 여관의 전원 완전 회복 종점에 도착했습니다. 표시2배속, 입력3초·정산재입장6초·이동4초·숙박10초 기준입니다.')
line();line('| 종류 | 55단계 6회 보상 | 55단계 전체 시간 / 숙박 | 60단계 6회 보상 | 60단계 전체 시간 / 숙박 | 상위 시간당 효율 | 모라 보충 시간 포함 |')
line('|---|---:|---|---:|---|---:|---:|')
kindNames={'EXP':'경험치','TALENT':'특성','ASCENSION':'돌파'}
for q in domains:
    lo=q['lower'];hi=q['higher'];lr=lo['xp'] if q['kind']=='EXP' else sum(lo['items'].values());hr=hi['xp'] if q['kind']=='EXP' else sum(hi['items'].values())
    line(f"| {kindNames[q['kind']]} | {lr:,} | {lo['seconds']:.2f}초 / {lo['lodgingMora']}모라 | {hr:,} | {hi['seconds']:.2f}초 / {hi['lodgingMora']}모라 | +{q['higherEfficiencyGainPct']:.2f}% | +{q['higherCashInclusiveGainPct']:.2f}% |")
line();line(f'36전 전승·실행 오류0·6조건 모두 같은 여관에서 전원 HP 완전 회복. 상위 비경의 보상 우위는 이 최대 투자 샘플에서도 유지됐습니다. 현금 보충 계산에는 실제 부의 꽃 원자료의 보수적 한계시간 {cashSeconds:.8f}초/모라를 썼습니다. 원자료 경로는 summary.json의 cashConversion.rawInput에 기록했습니다. 초기 장비 제작/강화/재료 취득 투자는 제외하며, 지급한 재료를 자연 채집했다고 주장하지 않습니다.')
line();line('최상위 투자에서 경험치·돌파 비경은 실제 숙박 지출0으로도 마칠 수 있었습니다. 특성 비경60단계도6회 총47모라입니다. 따라서 “후기 최대 치유·보호막 투자에서도 항상 숙박비를 쓴다”고 단정할 수 없습니다. 이 샘플은 이미 최종 육성을 갖춘 계정이고, 성장 중 +6/특성6/음식 취득 포함 검사와 구분해야 합니다. 필드/일일보스 수동 공략 요구 여부는 별도의 최대장비 실전 결과로 판정합니다.')
line();line('## 5. 재현·원자료·한계')
line();line(f"- 공개 +12 준비 {d['counts']['publicMax12Preparation']}장비, 실제 강화 시도 {d['counts']['nativeEnhancementAttempts']}회, 성공/유지/강등 비용 영수증 저장.")
line(f"- 실제 시드 준비 +10→12 현금 범위 {min(actual):,}~{max(actual):,}모라, 평균 {sum(actual)/len(actual):,.0f}모라. 이 특정 표본 평균으로 기대값을 대체하지 않음.")
line('- 통계조건 12개, 장비 개별 견적11종, 비경36전, 시드1개. 모든 캐릭터/장비/성유물 최적 조합 전수 검사라고 주장하지 않음.')
line('- 소유 캐릭터·이전 +6/+10 장비·재료·현금은 명시적 진단 준비. 자연 취득이나 무과금 육성시간을 이 자료만으로 증명하지 않음.')
line('- native.json.gz: 동작·견적·제작법·스탯·영수증·전투 로그·회복 이동·HP 종점 원자료. summary.json: 비용과 증가율 및 효율 계산. manifest.json: 제품/DB/도구/원자료 SHA256.')
line();line('```sh\nnode tools/audit_enhancement_impact_v01627.cjs --root . --out-dir docs/data/balance_v01627/enhancement_final\npython tools/summarize_enhancement_v01627.py --root . --folder docs/data/balance_v01627/enhancement_final --wealth-input docs/data/balance_v01627/ordinary_final/raw/material_mora_endpoint.json.gz\n```')
line();line(f"제품 런타임 지문: `{d['fingerprint']}`\n\n정식 authored DB SHA256: `{d['dbSha256']}`")
(folder/'README_KO.md').write_text('\n'.join(out)+'\n')
reportPaths=['README_KO.md','summary.json','manifest.json','native.json.gz','final_policy_invariance.json']
reportManifest={'schema':1,'sourceFingerprint':d['fingerprint'],'status':'Final7147 public preparation prices and actual same-full-inn domain endpoints.','files':[{'path':x,'sha256':hashlib.sha256((folder/x).read_bytes()).hexdigest()} for x in reportPaths if (folder/x).exists()],'summarizer':{'path':str(Path(__file__).relative_to(root)),'sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()},'wealthInput':summary['cashConversion'],'ordinaryReference':'../ordinary_final/report_manifest.json','independentPriceReference':'../enhancement_price_revision/manifest.json'}
(folder/'report_manifest.json').write_text(json.dumps(reportManifest,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'output':str(folder/'README_KO.md'),'counts':d['counts'],'maxChainError':max(q['error'] for q in checks),'domainEfficiency':[(q['kind'],q['higherCashInclusiveGainPct']) for q in domains]},ensure_ascii=False))
