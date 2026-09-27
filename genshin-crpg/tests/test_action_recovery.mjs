import assert from 'node:assert/strict';
import {onlineFixture,R,DB} from './helpers_online.mjs';
import {ENGINE_FINGERPRINT} from '../server/generated/engine.mjs';
const f=onlineFixture();await f.start();
let checked=0;
for(const route of ['ROUTE_ISEKAI','ROUTE_TRAVELER']){
 const r=new R(DB);r.newGame({name:'검증',route,seed:7,saveId:'relations-'+route});r.serverAdmin=true;r.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_CITY'});
 for(const def of Object.values(globalThis.CRPGRelationships.activitiesFromDB(DB)).filter(x=>x.route===route)){
  // Each catalog case is an independent play session, not a rate-limit stress test.
  f.sql.exec('DELETE FROM rate_limits');r.markContact(def.profileId);const reason=r.actionReason('RELATION_ACTIVITY',{activityId:def.id});assert(reason?.includes('개인'),def.id);
  f.seed(r.s);const before=f.read(),denied=await f.action('RELATION_ACTIVITY',{activityId:def.id});assert.equal(denied.status,400,def.id);assert.equal(denied.outcome,'REJECTED');assert.equal(f.read().state,before.state);assert.equal(f.read().revision,before.revision);
  const unlocked=new R(DB,structuredClone(r.s));unlocked.s.flags[def.completeFlag]=true;assert.equal(unlocked.actionReason('RELATION_ACTIVITY',{activityId:def.id}),'');f.seed(unlocked.s);
  const accepted=await f.action('RELATION_ACTIVITY',{activityId:def.id});assert.equal(accepted.status,200,accepted.error);assert.equal(accepted.result.result.minutes,30);const again=await f.action('RELATION_ACTIVITY',{activityId:def.id});assert.equal(again.status,400);assert.equal(again.outcome,'REJECTED');checked++;
 }
}
const r=new R(DB);r.newGame({name:'검증',route:'ROUTE_ISEKAI',seed:7,saveId:'recovery'});r.serverAdmin=true;r.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_PLAINS'});f.seed(r.s);
// Undefined activities are also ordinary domain rejections.
const unknown=await f.action('RELATION_ACTIVITY',{activityId:'DOES_NOT_EXIST'});assert.equal(unknown.status,400);assert.equal(unknown.outcome,'REJECTED');
const action=R.prototype.action;R.prototype.action=function(){throw new globalThis.CRPGRelationships.RelationshipError('ACTIVITY_LOCKED','개인임무를 먼저 마쳐 주세요.');};
try{const domain=await f.action('WAIT',{minutes:1});assert.equal(domain.status,400);assert.equal(domain.outcome,'REJECTED');assert.equal(domain.code,'ACTIVITY_LOCKED');}finally{R.prototype.action=action;}
R.prototype.action=function(){throw Error('test precommit exception');};const before=f.read();
try{const rejected=await f.action('WAIT',{minutes:1});assert.equal(rejected.status,500);assert.equal(rejected.outcome,'REJECTED');assert.equal(f.read().state,before.state);assert.equal(f.read().revision,before.revision);}finally{R.prototype.action=action;}
// If persistence may have happened, never claim rejection. Retry the identical receipt.
const batch=f.env.DB.batch,requestId=crypto.randomUUID(),revision=f.read().revision;
f.env.DB.batch=async qs=>{const out=await batch(qs);if(qs.some(q=>q.query.startsWith('UPDATE games')))throw Error('test response lost after commit');return out;};
try{const uncertain=await f.action('WAIT',{minutes:1},{requestId,revision});assert.equal(uncertain.status,500);assert.equal(uncertain.outcome,undefined);assert.equal(f.read().revision,revision+1);}finally{f.env.DB.batch=batch;}
const replay=await f.action('WAIT',{minutes:1},{requestId,revision});assert.equal(replay.status,200);assert.equal(f.read().revision,revision+1);
// A frontend version can change without deploying the same engine again.
assert.equal((await f.action('WAIT',{minutes:1},{version:'UI-only-next-release',engineVersion:ENGINE_FINGERPRINT})).status,200);
const mismatch=await f.action('WAIT',{minutes:1},{engineVersion:'different-rules'});assert.equal(mismatch.status,409);assert.equal(mismatch.code,'VERSION_MISMATCH');
console.log(JSON.stringify({ok:true,allRelationshipActivities:checked,domainRejection:true,precommitFailure:true,ambiguousCommitExactlyOnce:true,uiOnlyReleaseCompatible:true}));
