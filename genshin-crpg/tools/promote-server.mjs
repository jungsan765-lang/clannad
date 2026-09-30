// Prepared production rollout. No mutation without a matching Korean benchmark and explicit DEPLOY.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createInterface} from 'node:readline/promises';
const root=resolve(import.meta.dirname,'..'),dir=resolve(root,'.local/production');mkdirSync(dir,{recursive:true});
const wrangler=resolve(root,'node_modules/wrangler/bin/wrangler.js');
function run(args,capture=false){const r=spawnSync(process.execPath,[wrangler,...args],{cwd:root,encoding:'utf8',stdio:capture?'pipe':'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(r.status!==0)throw Error(capture?r.stderr:'Cloudflare 작업 실패. 같은 최종본으로 재시도하세요.');return r.stdout;}
const build=spawnSync(process.execPath,[resolve(root,'tools/python.mjs'),'tools/build_server.py'],{cwd:root,stdio:'inherit'});if(build.status!==0)throw Error('빌드 실패');
const {SERVER_BUILD,ENGINE_FINGERPRINT}=await import('../server/generated/engine.mjs');
const trial=process.argv.includes('--trial')&&process.env.CRPG_PRODUCTION_TRIAL==='1';
if(!trial){
 const measured=JSON.parse(readFileSync(resolve(root,'latency-result.json'),'utf8'));
 if(!measured.koreanGatePassed||measured.environment!=='remote'||measured.clientCountry!=='KR'||measured.serverBuild!==SERVER_BUILD||measured.actions.length<4||measured.actions.some(x=>x.summary.n<30||x.summary.p50>150||x.summary.p95>300))throw Error('이 최종본과 일치하는 한국 성능시험 통과 결과가 필요합니다. 먼저 test-server.cmd 결과를 검토받으세요.');
}else console.log('주의: 사용자 요청으로 성능 게이트 미통과 상태의 운영 체감 시험을 진행합니다. D1 원본은 보존하고 Worker만 DO 백엔드로 전환합니다.');
const config=JSON.parse(readFileSync(resolve(root,'server/wrangler.jsonc'),'utf8'));
if(config.name!=='genshin-crpg-online'||config.d1_databases?.[0]?.database_id!=='1eaf2269-ca70-4b07-a4dc-0421d9a8bd78')throw Error('운영 대상이 예상과 다릅니다.');
config.main='../../server/worker.mjs';delete config.build;delete config.placement;
config.vars={...config.vars,GAME_STATE_BACKEND:'do',DO_LOCATION_HINT:'apac-ne'};
config.durable_objects={bindings:[{name:'GAME_ACCOUNTS',class_name:'GameAccount'}]};config.migrations=[{tag:'game-account-sqlite-v1',new_sqlite_classes:['GameAccount']}];
const configPath=resolve(dir,'wrangler.json');writeFileSync(configPath,JSON.stringify(config,null,2));
console.log(`검토된 운영 반영: ${SERVER_BUILD}\n기존 D1 유지 / 소유권 보호 표·압축 백업 표 추가 / 접속 계정별 세이브 이전\nWorker 한 번 배포 / Pages 자동 배포 없음 / 기존 세션 유지\n롤백은 docs/server-operations-ko.md의 계정 drain 절차가 필요합니다.`);
const rl=createInterface({input:process.stdin,output:process.stdout}),word=trial?'TRIAL_DEPLOY':'DEPLOY';const answer=await rl.question((trial?'운영 체감 시험':'최종 검토 후 운영 반영')+'을 승인하려면 '+word+' 입력: ');rl.close();if(answer!==word)throw Error('운영 변경 없이 종료했습니다.');
run(['d1','execute','genshin-crpg-online','--remote','--config',configPath,'--file',resolve(root,'server/migrations/0001-durable-ownership.sql'),'--yes']);
run(['deploy','--config',configPath]);
const health=await (await fetch('https://genshin-crpg-online.jungsan765.workers.dev/health',{headers:{'Cache-Control':'no-cache'}})).json();
if(health.serverBuild!==SERVER_BUILD||health.engineVersion!==ENGINE_FINGERPRINT||health.storage!=='do')throw Error('배포 후 health 확인이 일치하지 않습니다. 서버 상태를 확인하고 이전 Worker로 즉시 덮어쓰지 마세요.');
console.log('Worker 확인 완료. 화면의 작은 응답 지원을 처음 적용할 때만 GitHub Actions의 CRPG Verify and Publish Artifact에서 publish를 켜고 한 번 실행하세요.');
console.log('https://github.com/jungsan765-lang/clannad/actions/workflows/crpg-sync-dist.yml');
