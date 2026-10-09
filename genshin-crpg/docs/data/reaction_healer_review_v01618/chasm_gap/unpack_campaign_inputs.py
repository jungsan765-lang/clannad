from pathlib import Path
import argparse,gzip,json
p=argparse.ArgumentParser(description='Restore native condition values into a separate directory for summary recomputation; original input compressed bytes are not reconstructed.')
p.add_argument('output',type=Path);a=p.parse_args();base=Path(__file__).resolve().parent;out=a.output.resolve();out.mkdir(parents=True,exist_ok=True)
raw=json.load(gzip.open(base/'native_all.json.gz','rt',encoding='utf8'))
assert len(raw['files'])==len(raw['outputs'])
for name,data in zip(raw['files'],raw['outputs']):
 assert Path(name).name==name and name.startswith('campaign_') and name.endswith('.json.gz')
 (out/name).write_bytes(gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),compresslevel=9,mtime=0))
print(json.dumps({'conditionFiles':len(raw['files']),'output':str(out)},ensure_ascii=False))
