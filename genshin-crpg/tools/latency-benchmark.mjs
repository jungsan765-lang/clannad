import {performance} from 'node:perf_hooks';
export async function benchmark({base,secret,fetcher=fetch,samples=30,environment='remote'}){
 const invoke=async(path,body,auth=secret)=>{const start=performance.now(),res=await fetcher(base+path,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+auth},body:JSON.stringify(body)}),out=await res.json();if(!res.ok)throw Error(path+': '+JSON.stringify(out));return {out,ms:performance.now()-start,bytes:Number(res.headers.get('X-CRPG-Response-Bytes'))||null};};
 const {out:session}=await invoke('/bench/setup',{}),all=[];
 for(const [kind,large] of [['move',false],['move',true],['combat',true],['combat-log',false]]){
  const rows=[];
  for(let i=0;i<samples+2;i++){
   const {out:fixture}=await invoke('/bench/reset',{accountId:session.accountId,kind,large});
   const r=await invoke('/game/action',{...fixture.action,requestId:crypto.randomUUID(),revision:0,engineVersion:fixture.engineVersion,responseMode:'state-parts-v1'},session.token);
   if(i>=2)rows.push({ms:r.ms,bytes:r.bytes,stateBytes:fixture.stateBytes});
  }
  const sorted=rows.map(x=>x.ms).sort((a,b)=>a-b),summary={kind,large,n:rows.length,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],max:sorted.at(-1),medianResponseBytes:rows.map(x=>x.bytes).sort((a,b)=>a-b)[Math.floor(rows.length/2)],stateBytes:rows[0].stateBytes};all.push({summary,rows});console.log(JSON.stringify(summary));
 }
 const d1=[];
 for(const mode of ['small','json','gzip']){const rows=[];for(let i=0;i<12;i++){const r=await invoke('/bench/d1',{mode});if(i>=2)rows.push({ms:r.ms,...r.out});}const sorted=rows.map(x=>x.ms).sort((a,b)=>a-b);d1.push({mode,bytes:rows[0].bytes,p50:sorted[5],p95:sorted[9],rows});}
 const koreanGatePassed=environment==='remote'&&session.clientCountry==='KR'&&samples>=30&&all.every(x=>x.summary.p50<=150&&x.summary.p95<=300);
 return {createdAt:new Date().toISOString(),environment,serverBuild:session.serverBuild,clientCountry:session.clientCountry||null,edgeColo:session.edgeColo||null,syntheticSaves:true,includesBodyDownload:true,koreanGatePassed,targets:{p50:150,p95:300},actions:all,d1,notes:['Warm state; fixture reset outside timed action. Two warm-up samples omitted.','Local workerd results exclude Internet and production replication.','Synthetic equipment-heavy save is not the unavailable production 378KB save.','D1 gzip includes compression; SQL time is separate from end-to-end latency.']};
}
