import {performance} from 'node:perf_hooks';
export async function benchmark({base,secret,fetcher=fetch,samples=30,environment='remote',onProgress=()=>{}}){
 if(!Number.isInteger(samples)||samples<1||samples>30)throw Error('Sample count must be between 1 and 30.');
 const report={createdAt:new Date().toISOString(),status:'incomplete',environment,syntheticSaves:true,includesBodyDownload:true,koreanGatePassed:false,targets:{p50:150,p95:300},actions:[],d1:[],storage:{observedSqlRows:0,reservedRows:0,reservationLimit:25000},notes:['Warm state; differential fixture reset outside timed action. Two warm-up samples omitted.','Local workerd results exclude Internet and production replication.','Synthetic equipment-heavy save is not the unavailable production 378KB save.','D1 gzip includes compression; SQL time is separate from end-to-end latency.','SQL counters cover fixture resets and actions, including warm-ups. They exclude setup, platform alarm writes and unrelated account usage. Reservation is conservative, not an account-wide billing cap.']};
 const progress=async()=>onProgress(structuredClone(report));
 const invoke=async(path,body,auth=secret)=>{
  const start=performance.now(),res=await fetcher(base+path,{method:'POST',headers:{'content-type':'application/json','x-crpg-benchmark-token':auth,authorization:'Bearer '+auth},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
  const raw=await res.text();let out;try{out=JSON.parse(raw);}catch{throw Error(path+': HTTP '+res.status+' (non-JSON response; stopped without retry)');}
  if(!res.ok){const e=Error(path+': HTTP '+res.status+' '+(out.code||out.error||'request failed'));e.code=out.code||'HTTP_'+res.status;e.diagnostic={stage:out.stage||null,detail:out.detail||null,diagnostic:out.diagnostic||null};throw e;}
  const header=res.headers.get('X-Benchmark-SQL-Rows-Written'),sqlRows=header===null?null:Number(header);
  return {out,ms:performance.now()-start,bytes:Number(res.headers.get('X-CRPG-Response-Bytes'))||null,sqlRows};
 };
 try{
  await progress();const {out:session}=await invoke('/bench/setup',{});
  Object.assign(report,{serverBuild:session.serverBuild,clientCountry:session.clientCountry||null,edgeColo:session.edgeColo||null});await progress();
  for(const [kind,large] of [['move',false],['move',true],['combat',true],['combat-log',false]]){
   const scenario={kind,large,rows:[],warmups:[],summary:null};report.actions.push(scenario);
   for(let i=0;i<samples+2;i++){
    const reset=await invoke('/bench/reset',{accountId:session.accountId,kind,large}),fixture=reset.out;
    if(reset.sqlRows===null)throw Error('Benchmark write counter missing. Update the test Worker before measuring.');
    report.storage.observedSqlRows+=reset.sqlRows;report.storage.reservedRows=fixture.reservedRows;await progress();
    const r=await invoke('/game/action',{...fixture.action,requestId:crypto.randomUUID(),revision:0,engineVersion:fixture.engineVersion,responseMode:'state-parts-v1'},session.token);
    if(r.sqlRows===null)throw Error('Action write counter missing. Stopped without retry.');
    report.storage.observedSqlRows+=r.sqlRows;
    (i<2?scenario.warmups:scenario.rows).push({ms:r.ms,bytes:r.bytes,stateBytes:fixture.stateBytes,sqlRows:r.sqlRows,resetSqlRows:reset.sqlRows});await progress();
   }
   const rows=scenario.rows,sorted=rows.map(x=>x.ms).sort((a,b)=>a-b),writes=rows.map(x=>x.sqlRows).sort((a,b)=>a-b);
   scenario.summary={kind,large,n:rows.length,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],max:sorted.at(-1),medianResponseBytes:rows.map(x=>x.bytes).sort((a,b)=>a-b)[Math.floor(rows.length/2)],stateBytes:rows[0].stateBytes,medianSqlRows:writes[Math.floor(writes.length/2)],maxSqlRows:writes.at(-1)};
   console.log(JSON.stringify(scenario.summary));await progress();
  }
  for(const mode of ['small','json','gzip']){
   const scenario={mode,rows:[]};report.d1.push(scenario);
   for(let i=0;i<12;i++){const r=await invoke('/bench/d1',{mode});if(i>=2)scenario.rows.push({ms:r.ms,...r.out});await progress();}
   const sorted=scenario.rows.map(x=>x.ms).sort((a,b)=>a-b);Object.assign(scenario,{bytes:scenario.rows[0].bytes,p50:sorted[5],p95:sorted[9]});
  }
  report.status='complete';report.koreanGatePassed=environment==='remote'&&report.clientCountry==='KR'&&samples===30&&report.actions.every(x=>x.summary.p50<=150&&x.summary.p95<=300);await progress();return report;
 }catch(e){report.status='failed';report.koreanGatePassed=false;report.failure={code:e.code||'BENCHMARK_FAILED',message:e.message,...(e.diagnostic?{diagnostic:e.diagnostic}:{})};await progress();e.partialReport=report;throw e;}
}
