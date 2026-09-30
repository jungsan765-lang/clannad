// Creates/updates ONLY a separate synthetic benchmark environment; never the production Worker/D1.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {benchmark} from './latency-benchmark.mjs';
import {checkBenchmarkWindow} from './benchmark-safety.mjs';
async function main(){
const day=checkBenchmarkWindow();
if(process.argv.includes('--check-only'))return;
const root=resolve(import.meta.dirname,'..'),dir=resolve(root,'.local/staging');mkdirSync(dir,{recursive:true});
const attemptPath=resolve(dir,'attempt-'+day+'.json');
if(existsSync(attemptPath))throw Error('오늘 시험을 이미 시작했습니다. 다시 실행하지 말고 latency-partial.json 또는 latency-result.json을 전달해 주세요.');
const wrangler=resolve(root,'node_modules/wrangler/bin/wrangler.js'),configPath=resolve(dir,'wrangler.json'),name='genshin-crpg-latency-test';
const run=(args,{capture=false,input}={})=>{const r=spawnSync(process.execPath,[wrangler,...args],{cwd:root,encoding:'utf8',input,stdio:capture||input!==undefined?['pipe','pipe','pipe']:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(r.status!==0)throw Error(capture?(r.stderr||r.stdout||'Wrangler failed'):'Cloudflare 작업에 실패했습니다.');return r.stdout||'';};
if(!existsSync(wrangler))throw Error('먼저 npm ci를 실행해야 합니다.');
console.log('운영 서버는 변경하지 않습니다. 별도 성능시험 서버를 준비합니다.');
spawnSync(process.execPath,[resolve(root,'tools/python.mjs'),resolve(root,'tools/build_server.py')],{cwd:root,stdio:'inherit'}).status===0||(()=>{throw Error('서버 빌드 실패');})();
const list=()=>JSON.parse(run(['d1','list','--json'],{capture:true}));let db;
try{db=list().find(x=>x.name===name);}catch{run(['login']);db=list().find(x=>x.name===name);}
if(!db){run(['d1','create',name,'--location','apac','--no-update-config']);db=list().find(x=>x.name===name);}
if(!db||db.uuid==='1eaf2269-ca70-4b07-a4dc-0421d9a8bd78')throw Error('시험 DB 확인에 실패했습니다. 운영 DB는 사용하지 않습니다.');
const secret=randomBytes(32).toString('hex'),pepper=randomBytes(32).toString('hex');
const config={name,main:'../../server/benchmark-worker.mjs',compatibility_date:'2026-09-01',workers_dev:true,vars:{ALLOWED_ORIGIN:'https://clannad.shop',GAME_STATE_BACKEND:'do',DO_LOCATION_HINT:'apac-ne',BENCHMARK_ONLY:'1',BENCHMARK_TOKEN_V2:secret,PASSWORD_PEPPER:pepper},d1_databases:[{binding:'DB',database_name:name,database_id:db.uuid}],durable_objects:{bindings:[{name:'GAME_ACCOUNTS',class_name:'GameAccount'}]},migrations:[{tag:'v1',new_sqlite_classes:['GameAccount']}]};writeFileSync(configPath,JSON.stringify(config,null,2));
const schema=readFileSync(resolve(root,'server/schema.sql'),'utf8')+'\n'+readFileSync(resolve(root,'server/migrations/0001-durable-ownership.sql'),'utf8')+'\nCREATE TABLE IF NOT EXISTS benchmark_payloads(id INTEGER PRIMARY KEY,payload BLOB);';const schemaPath=resolve(dir,'schema.sql');writeFileSync(schemaPath,schema);
run(['d1','execute',name,'--remote','--config',configPath,'--file',schemaPath,'--yes']);
const deployed=run(['deploy','--config',configPath],{capture:true});const urls=deployed.match(/https:\/\/[a-zA-Z0-9.-]+\.workers\.dev/g),base=urls?.at(-1);if(!base)throw Error('시험 서버 주소를 확인하지 못했습니다.');
console.log('한국 접속 환경에서 이동·전투를 측정합니다. 창을 닫지 마세요.');
writeFileSync(attemptPath,JSON.stringify({startedAt:new Date().toISOString(),worker:name}),{flag:'wx'});
const partialPath=resolve(root,'latency-partial.json');
const report=await benchmark({base,secret,onProgress:report=>writeFileSync(partialPath,JSON.stringify(report,null,2))});
const out=resolve(root,'latency-result.json');writeFileSync(out,JSON.stringify(report,null,2));console.log('완료: '+out);console.log(report.koreanGatePassed?'한국 실측 목표 통과. 이 결과 파일을 전달해 주세요.':'아직 운영 반영하지 마세요. 결과 파일을 전달해 주세요.');

}
await main().catch(e=>{console.error('\n'+e.message);console.error('자동 재시도하지 않습니다. 창을 닫아도 됩니다. latency-partial.json이 있으면 전달해 주세요.');process.exitCode=1;});
