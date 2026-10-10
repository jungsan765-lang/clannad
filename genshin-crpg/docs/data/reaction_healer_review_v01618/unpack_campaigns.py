from pathlib import Path
import argparse,json,gzip
p=argparse.ArgumentParser(description='Restore aggregate diagnostic rows into a separate directory; never writes product files.')
p.add_argument('output',type=Path);a=p.parse_args();base=Path(__file__).resolve().parent
out=a.output.resolve();out.mkdir(parents=True,exist_ok=True)
def load(path):
 with gzip.open(path,'rt',encoding='utf8') as f:return json.load(f)
native=load(base/'healer_candidates/candidate_native.json.gz')
for group in native['groups']:
 data={k:group[k] for k in ['fingerprint','candidate','substitutions','errors']}
 data['rows']=[r for r in native['rows'] if r['rawFile']==group['file']]
 (out/group['file']).write_text(json.dumps(data,ensure_ascii=False))
with gzip.open(base/'healer_candidates/isolated_jean.json.gz','rb') as f:(out/'isolated_jean.json').write_bytes(f.read())
print(json.dumps({'campaignFiles':len(native['groups']),'output':str(out)},ensure_ascii=False))
