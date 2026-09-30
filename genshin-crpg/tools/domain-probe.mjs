import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';

const root=resolve(import.meta.dirname,'..');
const dir=resolve(root,'.local/domain-probe');
mkdirSync(dir,{recursive:true});
const wrangler=resolve(root,'node_modules/wrangler/bin/wrangler.js');
const configPath=resolve(dir,'wrangler.json');
const worker='genshin-crpg-latency-test';
const host='bench-do30.clannad.shop';
const base='https://'+host;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const run=(args,{capture=false}={})=>{
 const r=spawnSync(process.execPath,[wrangler,...args],{
  cwd:root,encoding:'utf8',
  stdio:capture?['ignore','pipe','pipe']:'inherit',
  env:{...process.env,WRANGLER_SEND_METRICS:'false'}
 });
 if(r.status!==0)throw Error(capture?(r.stderr||r.stdout||'Wrangler failed'):'Cloudflare 작업에 실패했습니다.');
 return r.stdout||'';
};

if(!existsSync(wrangler))throw Error('npm ci가 먼저 필요합니다.');

console.log('[1/4] 서버 빌드');
const build=spawnSync(process.execPath,[resolve(root,'tools/python.mjs'),resolve(root,'tools/build_server.py')],{cwd:root,stdio:'inherit'});
if(build.status!==0)throw Error('서버 빌드 실패');

console.log('[2/4] 시험용 D1 확인');
let list;
try{list=JSON.parse(run(['d1','list','--json'],{capture:true}));}
catch{run(['login']);list=JSON.parse(run(['d1','list','--json'],{capture:true}));}
const db=list.find(x=>x.name===worker);
if(!db)throw Error('기존 시험용 D1을 찾지 못했습니다. 운영 D1은 건드리지 않습니다.');

const config={
 name:worker,
 main:'../../server/benchmark-worker.mjs',
 compatibility_date:'2026-09-01',
 workers_dev:true,
 placement:{region:'gcp:asia-northeast3'},
 routes:[{pattern:host,custom_domain:true}],
 vars:{
  ALLOWED_ORIGIN:'https://clannad.shop',
  GAME_STATE_BACKEND:'do',
  DO_LOCATION_HINT:'apac-ne',
  BENCHMARK_ONLY:'1',
  PASSWORD_PEPPER:'domain-probe-only-not-used-0000000000000000'
 },
 d1_databases:[{binding:'DB',database_name:worker,database_id:db.uuid}],
 durable_objects:{bindings:[{name:'GAME_ACCOUNTS',class_name:'GameAccount'}]},
 migrations:[{tag:'v1',new_sqlite_classes:['GameAccount']}]
};
writeFileSync(configPath,JSON.stringify(config,null,2));

console.log('[3/4] '+host+' 연결 및 배포');
run(['deploy','--config',configPath]);

async function ping(){
 const started=performance.now();
 const res=await fetch(base+'/bench/domain-ping',{
  method:'POST',
  headers:{'content-type':'application/json'},
  body:'{}',
  signal:AbortSignal.timeout(10000)
 });
 const raw=await res.text();
 let body=null;try{body=JSON.parse(raw);}catch{}
 return {status:res.status,ms:performance.now()-started,body,raw};
}

let ready=null,last='';
for(let i=0;i<90;i++){
 try{
  const r=await ping();
  last='HTTP '+r.status+' '+r.raw.slice(0,300);
  if(r.status===200&&r.body?.probe==='domain-v1'){ready=r.body;break;}
 }catch(e){last=String(e?.message||e);}
 await sleep(1000);
}
if(!ready)throw Error('Custom Domain 준비 실패: '+last);

console.log('[4/4] 5회 경로 측정');
const rows=[];
for(let i=0;i<5;i++){
 const r=await ping();
 if(r.status!==200||r.body?.probe!=='domain-v1')throw Error('경로 측정 실패: HTTP '+r.status+' '+r.raw.slice(0,300));
 rows.push({ms:r.ms,serverBuild:r.body.serverBuild,clientCountry:r.body.clientCountry,edgeColo:r.body.edgeColo,placement:r.body.placement});
 await sleep(250);
}
const sorted=rows.map(x=>x.ms).sort((a,b)=>a-b);
const report={
 createdAt:new Date().toISOString(),
 status:'complete',
 host,worker,
 placementConfig:'gcp:asia-northeast3',
 rows,
 summary:{n:5,min:sorted[0],p50:sorted[2],p95:sorted[4],max:sorted[4]},
 observed:{clientCountry:rows.at(-1)?.clientCountry||null,edgeColo:rows.at(-1)?.edgeColo||null,placement:rows.at(-1)?.placement||null}
};
writeFileSync(resolve(root,'domain-probe-result.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
console.log('완료: domain-probe-result.json');
