"""UI-only releases must remain compatible; every authoritative source must not."""
from pathlib import Path
import json, sys, tempfile
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from engine_identity import engine_fingerprint
with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp);(root/'source').mkdir();(root/'server').mkdir()
    (root/'source/index.html').write_text('<script src="runtime.js"></script><script src="app.js"></script>')
    (root/'source/runtime.js').write_text('rules-v1');(root/'server/worker.mjs').write_text('endpoint-v1')
    baseline=engine_fingerprint(root,{'content':['v1']})
    (root/'source/app.js').write_text('new UI');(root/'package.json').write_text('{"version":"next-ui-release"}')
    assert engine_fingerprint(root,{'content':['v1']})==baseline
    for path in ['source/runtime.js','server/worker.mjs']:
        p=root/path;original=p.read_text();p.write_text(original+'-changed')
        assert engine_fingerprint(root,{'content':['v1']})!=baseline,path
        p.write_text(original)
    assert engine_fingerprint(root,{'content':['v2']})!=baseline
print(json.dumps({'ok':True,'uiOnlyCompatible':True,'runtimeAndWorkerAndContentGated':True}))
