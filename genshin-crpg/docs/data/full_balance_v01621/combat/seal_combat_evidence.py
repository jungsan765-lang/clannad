#!/usr/bin/env python3
"""Seal all combat evidence with compressed and original hashes; no product mutation."""
from pathlib import Path
import gzip,hashlib,json,re
p=Path(__file__).resolve().parent;repo=p.parents[3];sha=lambda b:hashlib.sha256(b).hexdigest();original=p/'original_tools';original.mkdir(exist_ok=True)
tools=[f for f in p.iterdir() if f.suffix in ['.cjs','.py']]+[repo/x for x in ['tools/audit_protagonist_v01618.cjs','tools/audit_healing_helpers_v01619.cjs','tools/audit_boss_balance_v01619.cjs','tests/test_noelle_healing_v01621.cjs']]
records=[]
for f in sorted(tools):
 rel=str(f.relative_to(repo));raw=f.read_bytes();target=original/(rel.replace('/','__')+'.original.gz');target.write_bytes(gzip.compress(raw,compresslevel=9,mtime=0));records.append({'sourcePath':rel,'bytes':len(raw),'sha256':sha(raw),'compressedPath':str(target.relative_to(p))})
(original/'source_map.json').write_text(json.dumps(records,indent=2)+'\n')
owned='source/runtime_constellations_v01411.js';base=Path('/tmp/crpg_full_balance_v01621/baseline')
for label,root in [('before',base),('after',repo)]:
 raw=(root/owned).read_bytes();(p/('noelle_source_'+label+'.js.gz')).write_bytes(gzip.compress(raw,compresslevel=9,mtime=0))
frozen=json.loads((p/'frozen_product_manifest.json').read_text());differences=[];runtime=[]
for f in frozen['files']:
 current=sha((repo/f['path']).read_bytes())
 if current!=f['sha256']:differences.append({'path':f['path'],'frozenSha256':f['sha256'],'currentSha256':current})
 if re.fullmatch(r'source/(?:runtime[^/]*|world_content|presentation)\.js',f['path']):runtime.append({'path':f['path'],'frozenSha256':f['sha256'],'currentSha256':current,'same':f['sha256']==current})
unexpected=[d for d in differences if d['path'] not in ['source/app_adventure.js','source/runtime_growth_v01522.js']];assert not unexpected,unexpected
frozen_root=Path('/tmp/crpg_full_balance_v01621/combat_final_frozen');growth_path='source/runtime_growth_v01522.js';before_growth=(frozen_root/growth_path).read_bytes();after_growth=(repo/growth_path).read_bytes();pattern=rb'^const ASCENSION_GEMS_V01621=.*$';normalized_before=re.sub(pattern,b'const ASCENSION_GEMS_V01621=<REWARD_TABLE>;',before_growth,flags=re.M);normalized_after=re.sub(pattern,b'const ASCENSION_GEMS_V01621=<REWARD_TABLE>;',after_growth,flags=re.M);assert normalized_before==normalized_after,'growth changed beyond the single approved common gem reward table'
reward_difference={'path':growth_path,'frozenSha256':sha(before_growth),'currentSha256':sha(after_growth),'changed':before_growth!=after_growth,'normalizedExceptRewardTableSha256':sha(normalized_before),'normalizedEqual':True,'beforeLine':re.search(pattern,before_growth,re.M).group().decode(),'afterLine':re.search(pattern,after_growth,re.M).group().decode(),'scope':'One common gem reward literal only. Existing phase costs derive from the literal. XP, HP/ATK/DEF, healing, AI, combat functions, mora, other materials and old in-flight policies have byte-identical text. This proves reusability of combat observations, not final material payout validation; root owns final native payout/build checks.'}
scope={'schema':1,'files':236,'frozenInputDrift':[],'frozenVsCurrentDifferences':differences,'expectedRootDisplayOnlyDifference':'source/app_adventure.js: all character lookup narrowed to joinedCompanions in experience-book display; root owns separate 11-item UI/build proof.','expectedRewardOnlyGrowthDifference':reward_difference,'unexpectedDifferences':unexpected,'runtimeFiles':len(runtime),'runtimeDefinition':'117 runtime*.js files plus world_content.js and presentation.js, matching native engine inputs.','runtimeDrift':[r for r in runtime if not r['same']],'runtimeHashes':runtime,'ownedNoelleCurrentSha256':sha((repo/owned).read_bytes()),'localDbCurrentSha256':sha((repo/'content/db.json').read_bytes()),'localDbFrozenSha256':next(f['sha256'] for f in frozen['files'] if f['path']=='content/db.json'),'scope':'Only approved Noelle product source and one new Noelle test are owned by combat agent. Root display/growth/economy changes are separately attributed. Frozen ef07 combat observations are native; final reward-table reuse is justified by exact one-line normalization and separately validated by root.'}
assert {r['path'] for r in scope['runtimeDrift']}<={'source/runtime_growth_v01522.js'};assert scope['localDbCurrentSha256']==scope['localDbFrozenSha256'];(p/'final_scope.json').write_text(json.dumps(scope,ensure_ascii=False,indent=2)+'\n')
for f in sorted(p.rglob('*')):
 if f.is_file() and f.suffix in ['.json','.log','.md','.diff'] and f.name!='MANIFEST.json':
  raw=f.read_bytes();f.with_name(f.name+'.gz').write_bytes(gzip.compress(raw,compresslevel=9,mtime=0))
items=[]
for f in sorted(p.rglob('*')):
 if not f.is_file() or f.name in ['MANIFEST.json','MANIFEST.json.gz']:continue
 raw=f.read_bytes();entry={'path':str(f.relative_to(p)),'bytes':len(raw),'sha256':sha(raw)}
 if f.name.endswith('.gz'):
  decoded=gzip.decompress(raw);entry.update({'originalBytes':len(decoded),'originalSha256':sha(decoded),'originalLogicalPath':str(f.relative_to(p))[:-3]})
  sibling=f.with_name(f.name[:-3])
  if sibling.exists():assert sibling.read_bytes()==decoded,f;entry['matchesUncompressedSibling']=True
 items.append(entry)
manifest={'schema':1,'baselineCommit':'df1d2c48b630bf8a152481bcc4bcc3e5b8b37785','fileCount':len(items),'storedBytes':sum(x['bytes'] for x in items),'gzipFiles':sum('originalSha256' in x for x in items),'finalFrozenCounts':json.loads((p/'frozen_contracts_final.json').read_text())['counts'],'nativeNoelleCounts':{'pass':7,'fail':0},'nativeCapacityCounts':{'pass':3,'fail':0},'scope':'Evidence only; self excluded. Every gzip has compressed and uncompressed bytes/SHA256. Initial expected failures and corrected harness retries remain preserved.','files':items}
(p/'MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'files':len(items),'bytes':manifest['storedBytes'],'gzip':manifest['gzipFiles'],'manifestSha256':sha((p/'MANIFEST.json').read_bytes()),'runtimeFiles':len(runtime),'runtimeDrift':len(scope['runtimeDrift']),'frozenVsCurrentExpectedDiff':[d['path'] for d in differences]},ensure_ascii=False))
