"""Small reproducible staging bundle. No production deploy launcher, credentials, art or audio."""
from pathlib import Path
import sys,zipfile
from engine_identity import runtime_files
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]).resolve()
files=[root/'package.json',root/'package-lock.json',root/'test-server.cmd',root/'source/index.html',root/'content/db.json',root/'content/story-revisions/rev03-db-patch.json']
files += [root/'source'/name for name in runtime_files(root)]
files += list((root/'server').glob('*.mjs'))
files += [root/'server'/name for name in ['schema.sql','protocol.json','compatibility.json','migrations/0001-durable-ownership.sql']]
files += [root/'tools'/name for name in ['build_server.py','engine_identity.py','runtime_data.py','apply_liyue_rework.py','python.mjs','stage-server.mjs','latency-benchmark.mjs']]
files += list((root/'docs').glob('server-*.md'))
files += list((root/'reports/server-v2').glob('*.json'))
readme='''성능시험 전용 묶음입니다. 운영 서버는 변경하지 않습니다.

1. ZIP 전체를 압축 해제합니다. Node.js 24와 Python 3.10 이상이 필요합니다.
2. 한국에서 test-server.cmd를 더블클릭합니다.
3. Cloudflare 로그인 화면이 나오면 기존 계정으로 로그인합니다.
4. 완료되면 latency-result.json을 대화에 첨부해 주세요.

명령어를 직접 입력하지 않아도 됩니다. 생성되는 시험 서버 이름은 genshin-crpg-latency-test입니다.
실제 사용자 세이브를 가져오지 않습니다. 별도 시험 서비스 사용료가 생길 수 있습니다.
결과 파일에는 비밀번호나 세션 토큰이 들어가지 않습니다.
성능 목표를 못 맞추거나 한국 접속이 아니면 통과로 표시하지 않습니다.
시험이 실패하면 창에 보이는 오류를 전달해 주세요. 비밀번호나 토큰은 보내지 마세요.

docs/server-performance-ko.md: 분석과 로컬 측정 결과
docs/server-operations-ko.md: 검증 후 운영 반영 및 복구 계획
현재 운영 배포용 실행기는 이 묶음에 넣지 않았습니다.
'''
out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(set(files)):
        info=zipfile.ZipInfo('crpg-server-test/'+str(p.relative_to(root)).replace('\\','/'),(2026,9,29,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(info,p.read_bytes())
    z.writestr('crpg-server-test/README_FIRST_KO.txt',readme.encode('utf-8-sig'))
print(f'{out}: {out.stat().st_size} bytes, {len(set(files))} source/evidence files')
