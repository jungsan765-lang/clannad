const base=(process.argv[2]||'').replace(/\/+$/,'');
const token=process.env.CRPG_STAGING_TOKEN||'';
if(!/^https?:\/\//.test(base)) throw new Error('Usage: CRPG_STAGING_TOKEN=<token> node tools/fixed-region-smoke.mjs https://staging-host');
if(token.length<32) throw new Error('CRPG_STAGING_TOKEN must be at least 32 characters.');

const round=n=>Math.round(n*10)/10;
const median=values=>{
  const x=[...values].sort((a,b)=>a-b),m=Math.floor(x.length/2);
  return x.length%2?x[m]:round((x[m-1]+x[m])/2);
};

async function call(path,{method='GET',body,auth=false}={}){
  const headers={};
  if(auth) headers.authorization=`Bearer ${token}`;
  if(body!==undefined) headers['content-type']='application/json';
  const started=performance.now();
  const response=await fetch(base+path,{
    method,headers,
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const text=await response.text();
  let json;
  try{json=JSON.parse(text);}catch{json={raw:text};}
  return {
    status:response.status,
    ms:round(performance.now()-started),
    json,
    serverTiming:response.headers.get('server-timing')||''
  };
}

function requireStatus(result,status,label){
  if(result.status!==status) throw new Error(`${label}: expected HTTP ${status}, got ${result.status}: ${JSON.stringify(result.json)}`);
}

async function reset(scenario){
  const r=await call('/synthetic/reset',{method:'POST',auth:true,body:{scenario}});
  requireStatus(r,200,`reset ${scenario}`);
  return r.json;
}

async function action(seed,label){
  const body={
    ...seed.suggestedAction,
    requestId:crypto.randomUUID(),
    responseMode:'state-parts-v1'
  };
  const r=await call('/game/action',{method:'POST',auth:true,body});
  requireStatus(r,200,label);
  if(!r.json.statePatch) throw new Error(`${label}: state-parts-v1 patch missing`);
  return {body,r};
}

const health=await call('/health');
requireStatus(health,200,'health');
if(!health.json.synthetic||health.json.storage!=='sqlite-node') throw new Error(`unexpected health: ${JSON.stringify(health.json)}`);

const ping=[];
for(let i=0;i<3;i++){
  const r=await call('/ping');
  requireStatus(r,200,'ping');
  ping.push(r.ms);
}

const move=[];
let lastMove;
for(let i=0;i<3;i++){
  const seed=await reset('move');
  const out=await action(seed,`MOVE ${i+1}`);
  move.push(out.r.ms);
  lastMove=out;
}

const replay=await call('/game/action',{method:'POST',auth:true,body:lastMove.body});
requireStatus(replay,200,'requestId replay');
if(!replay.json.replayed) throw new Error('requestId replay was not marked replayed');

const stale=await call('/game/action',{
  method:'POST',auth:true,
  body:{...lastMove.body,requestId:crypto.randomUUID(),revision:0}
});
requireStatus(stale,409,'revision conflict');
if(stale.json.code!=='REVISION_CONFLICT') throw new Error(`revision conflict code mismatch: ${JSON.stringify(stale.json)}`);

const combat=[];
for(let i=0;i<3;i++){
  const seed=await reset('combat');
  const out=await action(seed,`COMBAT ${i+1}`);
  combat.push(out.r.ms);
}

console.log(JSON.stringify({
  ok:true,
  base,
  health:{
    version:health.json.version,
    engineVersion:health.json.engineVersion,
    serverBuild:health.json.serverBuild,
    transportBuild:health.json.transportBuild,
    storage:health.json.storage
  },
  samples:{ping,move,combat,replayMs:replay.ms},
  medianMs:{ping:median(ping),move:median(move),combat:median(combat)},
  checks:['health','ping x3','MOVE x3','COMBAT x3','requestId replay','revision conflict','state-parts-v1 delta'],
  note:'Synthetic staging only; no production account or save was used.'
},null,2));
