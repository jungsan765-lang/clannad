'use strict';
// Observation only: native six-fight EXP campaigns, no food, actual full-HP inn endpoint.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const H=require('./audit_protagonist_v01618.cjs'),args=process.argv.slice(2),arg=k=>args.includes(k)?args[args.indexOf(k)+1]:null;
const root=path.resolve(arg('--root')||path.resolve(__dirname,'..')),out=arg('--out')||'/tmp/crpg_v01627_ordinary/final7147/exp_inn_endpoint.json';
const FP='7147e88113388e51a3042d1d51c9bde3e084213502f976f52202012542f0dbe2',env=H.load(root),cp=x=>JSON.parse(JSON.stringify(x));
if(env.fingerprint!==FP)throw Error('Frozen product fingerprint changed: '+env.fingerprint);
const rows=[],errors=[],data={schema:1,fingerprint:FP,root,assumptions:{party:'Traveler / Zhongli / Diluc / Jean, all C0 Lv60, crafted+6, legal base talents6, no artifacts.',actions:'Native public DOMAIN_START/COMBAT/MOVE/BUY. No food, ingredient or HP grants between fights. Native inn round-trip if any actor below50% HP or KO. Final native move/inn to the same Liyue inn, all four full HP.',time:'Displayed2x native frames plus3s combat input,6s settlement,4s move,10s inn. Initial domain approach and recipe/gear/ownership acquisition excluded. Initial1m wallet is diagnostic funding; actual inn cash remains a cost.',receiptObservation:'A wrapper records native finishBattle return values only; calls the original exactly once with unchanged args, does not alter actors, RNG, rewards, state or input.'},rows,errors};
let receipts=[];const nativeFinish=env.R.prototype.finishBattle;
env.R.prototype.finishBattle=function(...a){const b=this.s.runtime,origin=b?.origin,domain=cp(b?.growthDomain||null),result=nativeFinish.apply(this,a);receipts.push({origin,domain,result:cp(result||null)});return result;};
fs.mkdirSync(path.dirname(out),{recursive:true});
const save=()=>fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');
for(const seed of [717,4242,9031])for(const stage of [55,60])try{
  receipts=[];const domain=(stage===60?'LOST_VALLEY':'DOMAIN_OF_GUYUN')+':'+stage;
  const row=H.campaign(env,{name:'heal5',level:60,team:['LIYUE_ZHONGLI','MOND_DILUC','MOND_JEAN'],talent:6,enhance:6,route:'ROUTE_TRAVELER',seed,domain},{runs:6,finishAtInn:true});
  row.stage=stage;row.nativeReceipts=cp(receipts);row.domainReceipts=receipts.filter(x=>x.domain);
  row.xpPerParticipant=row.domainReceipts.reduce((n,x)=>n+(x.result?.victory?Number(x.result.xp||0):0),0);
  if(row.wins!==6||row.domainReceipts.length!==6||!row.endpoint?.allFullHp||row.endpoint.place!=='EVT_SCHEDULE_MRC_LIYUE_INN')throw Error('Unsuccessful/unmatched full-HP endpoint');
  if(row.xpPerParticipant!==6*(stage===60?24000:8000))throw Error('Unexpected native EXP payout');
  rows.push(row);console.log(JSON.stringify({seed,stage,wins:row.wins,seconds:row.seconds,mora:row.lodgingMora,xp:row.xpPerParticipant,full:row.endpoint.allFullHp}));save();
}catch(e){errors.push({seed,stage,error:e.message,stack:e.stack});save();}
data.counts={conditions:rows.length,battles:rows.reduce((n,x)=>n+x.battles.length,0),wins:rows.reduce((n,x)=>n+x.wins,0),losses:rows.reduce((n,x)=>n+x.losses,0),errors:errors.length,allFullHp:rows.every(x=>x.endpoint?.allFullHp)};
data.finalFingerprint=H.load(root).fingerprint;if(data.finalFingerprint!==FP)throw Error('Product changed while observing');
data.toolSha256=crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex');save();if(errors.length)process.exitCode=1;
