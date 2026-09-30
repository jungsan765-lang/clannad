"""Small production-trial bundle for the already verified DO backend. No assets, audio or secrets."""
from pathlib import Path
import sys, zipfile
from engine_identity import runtime_files

root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]).resolve()

files=[
    root/'package.json',
    root/'package-lock.json',
    root/'deploy-server-trial.cmd',
    root/'content/db.json',
    root/'content/story-revisions/rev03-db-patch.json',
    root/'server/wrangler.jsonc',
    root/'server/schema.sql',
    root/'server/protocol.json',
    root/'server/compatibility.json',
    root/'server/migrations/0001-durable-ownership.sql',
]
files += [root/'source'/name for name in runtime_files(root)]
files += list((root/'server').glob('*.mjs'))
files += [root/'tools'/name for name in [
    'build_server.py','engine_identity.py','runtime_data.py','apply_liyue_rework.py',
    'python.mjs','promote-server.mjs'
]]
files += [root/'docs/server-operations-ko.md']

readme='''원신 CRPG 운영 DO 체감시험 묶음

이 파일은 사용자가 명시적으로 승인한 운영 체감시험 전용입니다.
기존 운영 D1과 세이브를 삭제하지 않습니다.
운영 D1에 소유권/체크포인트용 추가 테이블을 만들고 Worker를 DO 백엔드로 전환합니다.

실행:
1. 새 폴더에 압축 해제
2. deploy-server-trial.cmd 실행
3. 마지막 확인 문구가 나오면 TRIAL_DEPLOY 입력
4. 성공 후 게임에서 로그아웃 -> 다시 로그인 1회
5. 실제 게임 이동/전투 체감 확인

중요:
- Pages는 이 실행으로 배포하지 않습니다.
- 기존 클라이언트도 동작하며, 재로그인하면 v2 세션 토큰을 받아 액션별 D1 인증 왕복을 피합니다.
- 작은 delta 응답까지 쓰려면 이후 검증된 Pages를 한 번만 게시하면 됩니다.
- 롤백은 예전 Worker를 그냥 덮어쓰지 말고 docs/server-operations-ko.md 절차를 사용합니다.
- 비밀키/토큰은 ZIP에 포함하지 않습니다. 기존 Wrangler 로그인과 Worker 설정을 그대로 사용합니다.
'''

out.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(set(files)):
        info=zipfile.ZipInfo('crpg-production-trial/'+str(p.relative_to(root)).replace('\\','/'),(2026,9,30,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(info,p.read_bytes())
    z.writestr('crpg-production-trial/README_FIRST_KO.txt',readme.encode('utf-8-sig'))

print(f'{out}: {out.stat().st_size} bytes, {len(set(files))} files')
