#!/usr/bin/env python3
"""Read-only frozen product/assets checkpoint; writes only a requested QA report."""
from pathlib import Path
import argparse,base64,datetime,gzip,hashlib,json
ROOT=Path(__file__).resolve().parents[4]
p=argparse.ArgumentParser();p.add_argument('--source-root',default=str(ROOT));p.add_argument('--out',default=str(Path(__file__).with_name('final_scope.json')));a=p.parse_args()
root=Path(a.source_root).resolve();build=root/'docs/data/food_balance_v01620/build'
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda file:json.loads((root/file).read_text())
baseline=read('docs/data/food_balance_v01620/baseline_product_manifest.json');before=json.loads((build/'scope_before_build.json').read_text());assets=json.loads((build/'assets_content_before_build.json').read_text())
expected={'source/runtime_economy.js':'5c04f9c3d1f23596482f2d38cb392048c37291311ee07a9fefe296837d5d8140','source/runtime_growth_v01522.js':'ce0bada1295acc904e0e39542139749dfcbdac3a4d0c03b8390271900758feb5','source/app_abyss.js':'5f46a08f37c609e7330fdc44cb367ee378707728429c68c0a45346c5203c78d2'}
frozen={r['path']:r['finalBeforeBuildSha256'] for r in before['rows']};rows=[]
for b in baseline['files']:
 file=root/b['path'];raw=file.read_bytes();digest=sha(raw);rows.append({'path':b['path'],'bytes':len(raw),'baselineSha256':b['sha256'],'frozenBeforeBuildSha256':frozen[b['path']],'finalSha256':digest,'sameAsBaseline':digest==b['sha256'],'sameAsFrozen':digest==frozen[b['path']]})
changed=sorted(r['path'] for r in rows if not r['sameAsBaseline']);drift=sorted(r['path'] for r in rows if not r['sameAsFrozen'])
sourcePaths={r['path'] for r in baseline['files'] if r['path'].startswith('source/')};sourceNow={str(f.relative_to(root)) for f in (root/'source').rglob('*') if f.is_file()}
oldAssets={r['path']:r for r in assets['files']};nowAssets={str(f.relative_to(root)):f for top in ['assets','content'] for f in (root/top).rglob('*') if f.is_file()}
assetRows=[{'path':file,'beforeSha256':oldAssets[file]['sha256'],'finalSha256':sha(nowAssets[file].read_bytes()),'bytes':nowAssets[file].stat().st_size} for file in sorted(oldAssets.keys()&nowAssets.keys())]
assetDrift=[r['path'] for r in assetRows if r['beforeSha256']!=r['finalSha256']]
snapshot=json.loads(gzip.decompress((root/'docs/data/food_balance_v01620/baseline_product_snapshot.json.gz').read_bytes()));original={r['path']:(base64.b64decode(r['content']) if r['encoding']=='base64' else r['content'].encode()) for r in snapshot['files']}
growth=(root/'source/runtime_growth_v01522.js').read_bytes();growthOnly=growth.replace(b'this.installFoodBalance();',b'',1)==original['source/runtime_growth_v01522.js']
abyss=(root/'source/app_abyss.js').read_text();abyssOld=original['source/app_abyss.js'].decode()
new="function foodLabel(row,owner){const heal=game.foodSpec(row[0]).heal,status=game.tables['13_STATUS_EFFECT_DB']?.get(row[9]);return row[1]+' ('+game.itemCount(row[0])+'개) · '+(heal?'HP '+game.foodHealingAmount(heal,owner)+' 회복':(status?.[1]||'전투 효과'));}"
old="function foodLabel(row){const heal=Number(row[8]||0),status=game.tables['13_STATUS_EFFECT_DB']?.get(row[9]);return row[1]+' ('+game.itemCount(row[0])+'개) · '+(heal?'HP '+heal+' 회복':(status?.[1]||'전투 효과'));}"
abyssOnly=abyss.count(new)==1 and abyss.replace(new,old,1).replace('foodLabel(r,id)','foodLabel(r)',1)==abyssOld
economy=(root/'source/runtime_economy.js').read_text();economyOld=original['source/runtime_economy.js'].decode();start=economy.index('  // Existing dishes:');end=economy.index('  const old =',start);economyBack=economy[:start]+economy[end:];start=economyBack.index('\n  P.installFoodBalance =');end=economyBack.index('\n  P.apply =',start);economyBack=economyBack[:start]+economyBack[end:];economyOnly=economyBack==economyOld
checks={
 'baseline235FilesChecked':len(rows)==235,'onlyExpectedFiveBaselineDifferences':changed==sorted([*expected,'package.json','package-lock.json']),
 'frozenProductDriftZero':not drift,'fixedThreeSourceHashes':all(sha((root/f).read_bytes())==h for f,h in expected.items()),
 'sourcePathsUnchanged':sourcePaths==sourceNow,'assetsContent1670PathsChecked':len(oldAssets)==1670,
 'assetsContentPathSetUnchanged':oldAssets.keys()==nowAssets.keys(),'assetsContentHashDriftZero':not assetDrift,
 'rawDbUnchanged':sha((root/'content/db.json').read_bytes())=='254c9294c7787b421f38c84b3ad8fed9f00c207a8ef74855868c0cda48dc0962',
 'growthExactAfterRemovingOnlyInstallCall':growthOnly,'abyssExactAfterRemovingOnlyExistingNumericLabelEdits':abyssOnly,
 'economyExactAfterRemovingOnlyFoodBalanceInsertion':economyOnly,
}
result={'schema':1,'collectedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'passed':all(checks.values()),'baselinePublishedSHA':baseline['publishedBaseline'],'checks':checks,'productFilesChecked':len(rows),'changedPathsVersusBaseline':changed,'sourceChangedOnly':sorted(expected),'productDriftVersusFrozenBuildInput':drift,'addedSourcePaths':sorted(sourceNow-sourcePaths),'removedSourcePaths':sorted(sourcePaths-sourceNow),'localAssetsContentFilesChecked':len(oldAssets),'assetsContentBytes':sum(r['bytes'] for r in assetRows),'assetsContentDrift':assetDrift,'addedAssetsContentPaths':sorted(nowAssets.keys()-oldAssets.keys()),'removedAssetsContentPaths':sorted(oldAssets.keys()-nowAssets.keys()),'rawDbSha256':sha((root/'content/db.json').read_bytes()),'rows':rows,'assetsContentRows':assetRows,'interpretation':'All existing growth cost/reward/combat code and all other source bytes match baseline; growth differs solely by food installer call. Existing abyss label now uses actual AUTO foodSpec and recipient scaling; layout and abyss rules are unchanged. Economy differs solely by the numeric food policy and runtime-row cloning insertion.'}
out=Path(a.out).resolve();out.parent.mkdir(parents=True,exist_ok=True);raw=(json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode();out.write_bytes(raw)
with gzip.GzipFile(str(out)+'.gz','wb',mtime=0,compresslevel=9) as f:f.write(raw)
print(json.dumps({k:result[k] for k in ['passed','productFilesChecked','changedPathsVersusBaseline','productDriftVersusFrozenBuildInput','localAssetsContentFilesChecked','assetsContentBytes','rawDbSha256','checks']}))
if not result['passed']:raise SystemExit(1)
