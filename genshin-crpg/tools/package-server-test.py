"""Small reproducible staging bundle. No production deploy launcher, credentials, art or audio."""
from pathlib import Path
import sys,zipfile
from engine_identity import runtime_files
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]).resolve()
files=[root/'package.json',root/'package-lock.json',root/'test-server.cmd',root/'test-domain.cmd',root/'test-edge.cmd',root/'source/index.html',root/'content/db.json',root/'content/story-revisions/rev03-db-patch.json']
files += [root/'source'/name for name in runtime_files(root)]
files += list((root/'server').glob('*.mjs'))
files += [root/'server'/name for name in ['schema.sql','protocol.json','compatibility.json','migrations/0001-durable-ownership.sql']]
files += [root/'tools'/name for name in ['build_server.py','engine_identity.py','runtime_data.py','apply_liyue_rework.py','python.mjs','stage-server.mjs','latency-benchmark.mjs','benchmark-safety.mjs','domain-probe.mjs','edge-probe.mjs']]
files += list((root/'docs').glob('server-*.md'))
files += list((root/'reports/server-v2').glob('*.json'))
readme='''성능시험 전용 묶음 — 2026-09-30 쓰기 한도 문제 수정본

이 묶음은 Workers Paid 전환 후 즉시 1회 시험할 수 있는 최신본입니다.
기존에 받은 ZIP은 사용하지 마세요. 아직 Paid 전환이 완료되지 않았다면 실행하지 말고, Cloudflare 결제가 완료된 뒤 사용하세요.

1. 이 ZIP 전체를 새 폴더에 압축 해제합니다. Node.js 24와 Python 3.10 이상이 필요합니다.
2. Custom Domain 경로 확인은 test-domain.cmd를 한 번만 더블클릭합니다. 이 검사는 5회 ping만 실행하고 운영 서버/세이브를 건드리지 않습니다.
3. 전체 DO 지연 벤치마크가 필요할 때만 test-server.cmd를 사용합니다.
3. Cloudflare 로그인 화면이 나오면 기존 계정으로 로그인합니다.
4. 완료되면 latency-result.json을 대화에 첨부해 주세요.
   중간에 멈추면 재실행하지 말고 latency-partial.json을 보내 주세요.
   두 파일이 없으면 오류 화면만 보내 주세요. 비밀번호나 토큰은 보내지 마세요.

하루에 한 번만 시험을 시작합니다. 오류가 나도 전체 시험을 자동 반복하지 않습니다.
전체 저장 내용을 매번 지웠다가 넣는 작업을 없앴습니다.
시험용 서버에서도 보수적으로 계산한 쓰기 예산 25,000행을 넘기기 전에 중단합니다.
이는 이 시험의 제한이며, Cloudflare 계정 전체의 남은 한도를 보증하는 것은 아닙니다.

운영 서버와 실제 사용자 세이브는 사용하지 않습니다.
별도 시험 서버 이름은 genshin-crpg-latency-test입니다.
결과 파일에는 비밀번호나 세션 토큰이 들어가지 않습니다.
성능 목표를 못 맞추거나 한국 접속이 아니면 통과로 표시하지 않습니다.
현재 운영 배포용 실행기는 이 묶음에 넣지 않았습니다.

docs/server-benchmark-quota-incident-ko.md: 원인, 수정, 확인한 쓰기 횟수
docs/server-performance-ko.md: 구조 분석과 로컬 측정 결과
docs/server-operations-ko.md: 검증 후 운영 반영 및 복구 계획
'''
out.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(set(files)):
        info=zipfile.ZipInfo('crpg-server-test/'+str(p.relative_to(root)).replace('\\','/'),(2026,9,29,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(info,p.read_bytes())
    z.writestr('crpg-server-test/README_FIRST_KO.txt',readme.encode('utf-8-sig'))
print(f'{out}: {out.stat().st_size} bytes, {len(set(files))} source/evidence files')
