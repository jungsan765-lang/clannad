import {spawnSync} from 'node:child_process';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';

const root=resolve(import.meta.dirname,'..');
const dir=resolve(root,'.local/edge-probe');mkdirSync(dir,{recursive:true});
const wrangler=resolve(root,'node_modules/wrangler/bin/wrangler.js');
const configPath=resolve(dir,'wrangler.json');
const worker='genshin-crpg-latency-test';
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

console.log('[1/3] 서버 빌드');
const build=spawnSync(process.execPath,[resolve(root,'tools/python.mjs'),resolve(root,'tools/build_server.py')],{cwd:root,stdio:'inherit'});
if(build.status!==0)throw Error('서버 빌드 실패');

console.log('[2/3] placement 제거한 시험 Worker 배포');
let list;
try{list=JSON.parse(run(['d1','list','--json'],{capture:true}));}
catch{run(['login']);list=JSON.parse(run(['d1','list','--json'],{capture:true}));}
const db=list.find(x=>x.name===worker);
if(!db)throw Error('기존 시험용 D1을 찾지 못했습니다.');

const config={
 name:worker,
 main:'../../server/benchmark-worker.mjs',
 compatibility_date:'2026-09-01',
 workers_dev:true,
 vars:{
  ALLOWED_ORIGIN:'https://clannad.shop',
  GAME_STATE_BACKEND:'do',
  DO_LOCATION_HINT:'apac-ne',
  BENCHMARK_ONLY:'1',
  PASSWORD_PEPPER:'edge-probe-only-not-used-000000000000000000'
 },
 d1_databases:[{binding:'DB',database_name:worker,database_id:db.uuid}],
 durable_objects:{bindings:[{name:'GAME_ACCOUNTS',class_name:'GameAccount'}]},
 migrations:[{tag:'v1',new_sqlite_classes:['GameAccount']}]
};
writeFileSync(configPath,JSON.stringify(config,null,2));
const deployed=run(['deploy','--config',configPath],{capture:true});
const urls=deployed.match(/https:\/\/[a-zA-Z0-9.-]+\.workers\.dev/g);
const base=urls?.at(-1);
if(!base)throw Error('시험 Worker 주소를 찾지 못했습니다.');

async function ping(){
 const started=performance.now();
 const res=await fetch(base+'/bench/edge-ping',{
  method:'POST',headers:{'content-type':'application/json'},body:'{}',signal:AbortSignal.timeout(10000)
 });
 const raw=await res.text();let body=null;try{body=JSON.parse(raw);}catch{}
 return {status:res.status,ms:performance.now()-started,body,raw};
}

let ready=null,last='';
for(let i=0;i<45;i++){
 try{
  const r=await ping();last='HTTP '+r.status+' '+r.raw.slice(0,300);
  if(r.status===200&&r.body?.probe==='edge-do-v1'&&r.body?.ok){ready=r.body;break;}
 }catch(e){last=String(e?.message||e);}
 await sleep(1000);
}
if(!ready)throw Error('시험 Worker 준비 실패: '+last);

console.log('[3/3] 5회 DO 경로 측정');
const rows=[];
for(let i=0;i<5;i++){
 const r=await ping();
 if(r.status!==200||r.body?.probe!=='edge-do-v1'||!r.body?.ok)throw Error('DO 경로 측정 실패: '+r.raw.slice(0,300));
 rows.push({totalMs:r.ms,doMs:r.body.doMs,clientCountry:r.body.clientCountry,edgeColo:r.body.edgeColo,placement:r.body.placement,serverBuild:r.body.serverBuild});
 await sleep(250);
}
const vals=rows.map(x=>x.totalMs).sort((a,b)=>a-b),doVals=rows.map(x=>x.doMs).sort((a,b)=>a-b);
const report={
 createdAt:new Date().toISOString(),status:'complete',base,worker,placementConfig:null,
 rows,
 summary:{
  total:{n:5,min:vals[0],p50:vals[2],p95:vals[4],max:vals[4]},
  durable:{n:5,min:doVals[0],p50:doVals[2],p95:doVals[4],max:doVals[4]}
 },
 observed:{clientCountry:rows.at(-1)?.clientCountry||null,edgeColo:rows.at(-1)?.edgeColo||null,placement:rows.at(-1)?.placement||null}
};
writeFileSync(resolve(root,'edge-probe-result.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
console.log('완료: edge-probe-result.json');
