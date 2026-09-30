export const diagnosticHtml = String.raw`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CRPG Seoul staging latency</title>
<style>
body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:760px;margin:40px auto;padding:0 18px;line-height:1.55}
button{font:inherit;padding:12px 18px;cursor:pointer}
button:disabled{cursor:wait;opacity:.6}
pre{background:#111;color:#eee;padding:16px;border-radius:8px;overflow:auto;white-space:pre-wrap}
small{color:#666}
</style>
</head>
<body>
<h1>CRPG 서울 스테이징 테스트</h1>
<p>실제 계정/세이브를 사용하지 않습니다. 서울 synthetic 서버에 Ping, MOVE, COMBAT를 각각 3회만 요청합니다.</p>
<button id="run">테스트 시작</button>
<button id="copy" disabled>결과 복사</button>
<p id="status">대기 중</p>
<pre id="out">아직 결과 없음</pre>
<small>브라우저에서 응답 본문을 모두 받은 시점까지 측정합니다.</small>
<script>
const run=document.getElementById('run'),copy=document.getElementById('copy'),status=document.getElementById('status'),out=document.getElementById('out');
const round=n=>Math.round(n*10)/10;
const median=values=>{const x=[...values].sort((a,b)=>a-b),m=Math.floor(x.length/2);return x.length%2?x[m]:round((x[m-1]+x[m])/2);};
async function call(path,options={}){
  const started=performance.now();
  const response=await fetch(path,{cache:'no-store',...options});
  const text=await response.text();
  let json;try{json=JSON.parse(text);}catch{json={raw:text};}
  if(!response.ok)throw new Error(path+' HTTP '+response.status+' '+text);
  return {ms:round(performance.now()-started),json,serverTiming:response.headers.get('server-timing')||''};
}
async function reset(scenario){
  return call('/diagnostic/reset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({scenario})});
}
async function action(seed){
  const body={...seed.suggestedAction,requestId:'diag-'+crypto.randomUUID(),responseMode:'state-parts-v1'};
  const result=await call('/diagnostic/action',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  if(!result.json.statePatch)throw new Error('delta response가 없습니다.');
  return result;
}
async function samples(label,scenario){
  const values=[],serverTiming=[];
  for(let i=0;i<3;i++){
    status.textContent=label+' '+(i+1)+'/3';
    const seed=await reset(scenario);
    const result=await action(seed.json);
    values.push(result.ms);serverTiming.push(result.serverTiming);
  }
  return {values,serverTiming};
}
run.onclick=async()=>{
  run.disabled=true;copy.disabled=true;out.textContent='측정 중...';
  try{
    const ping=[];
    for(let i=0;i<3;i++){status.textContent='PING '+(i+1)+'/3';ping.push((await call('/ping')).ms);}
    const move=await samples('MOVE','move');
    const combat=await samples('COMBAT','combat');
    const result={
      ok:true,
      measuredAt:new Date().toISOString(),
      location:'browser -> api-staging.clannad.shop (Seoul fixed-region staging)',
      samples:{ping,move:move.values,combat:combat.values},
      medianMs:{ping:median(ping),move:median(move.values),combat:median(combat.values)},
      serverTiming:{move:move.serverTiming,combat:combat.serverTiming},
      note:'synthetic staging only; no production account or save used'
    };
    out.textContent=JSON.stringify(result,null,2);status.textContent='완료';copy.disabled=false;
  }catch(e){out.textContent=String(e?.stack||e);status.textContent='실패';}
  finally{run.disabled=false;}
};
copy.onclick=async()=>{await navigator.clipboard.writeText(out.textContent);status.textContent='결과를 클립보드에 복사했습니다.';};
</script>
</body>
</html>`;
