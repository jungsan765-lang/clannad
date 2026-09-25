import json,pathlib,base64
p=pathlib.Path(__file__).parent
assets={f.name:'data:image/png;base64,'+base64.b64encode(f.read_bytes()).decode() for f in (p/'assets').glob('*.png')}
data=json.loads((p/'db_planned.json').read_text())
s=(p/'ui.html').read_text();font=base64.b64encode((p/'NotoSansKR_subset.woff').read_bytes()).decode();s=s.replace('<style>','<style>@font-face{font-family:CRPGKorean;src:url(data:font/woff;base64,'+font+') format("woff");font-weight:100 900;font-display:swap;}').replace('system-ui,"Noto Sans KR",sans-serif','CRPGKorean,system-ui,sans-serif')
for token,value in {'__DATABASE__':json.dumps(data,ensure_ascii=False).replace('<','\\u003c'),'__ASSETS__':json.dumps(assets),'__RUNTIME__':(p/'runtime.js').read_text(),'__EXTENSIONS__':(p/'runtime_extensions.js').read_text()+'\n'+(p/'runtime_story.js').read_text()}.items():s=s.replace(token,value)
out=p/'CRPG_player.html';out.write_text(s);print(out.name,out.stat().st_size)
