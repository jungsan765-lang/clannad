// Regression cases discovered by the 2026-10-03 read-only audit. No remote services or real accounts.
import assert from 'node:assert/strict';
import {LiveRegionStore} from '../server/fixed-region-live.mjs';
import {AdminConsole} from '../server/admin-api.mjs';
import {pidOf} from '../server/social-v01415.mjs';

const store=new LiveRegionStore(':memory:',{pepper:'account-audit-fix-test'.padEnd(64,'x'),features:['chat','trade','coop']}),admin=new AdminConsole(store);
const checks=[];
const edit=(a,ops)=>admin.editSave(a,r=>{const out=admin.applyOps(r,ops);if(r.s.mail?.list.some(x=>x.kind==='GIFT'&&!x.claimed))r.mailClaim('ALL');return out;},'test fixture');
const player=async(username,level=10)=>{const reg=await store.register({username,password:'test-only-password'},'local');const a=store.account(username);await store.newGame(a,{name:username,route:'ROUTE_TRAVELER'});await edit(a,[{op:'level',target:'PLAYER_CUSTOM',value:level},{op:'teleport',map:'MAP_MOND_CITY'},{op:'item',id:'ING_APPLE',count:20},{op:'currency',key:'MORA',mode:'set',value:10000}]);return {a,token:reg.token};};
const runtime=a=>store.runtimeOf(a.id),mora=a=>runtime(a).s.global.MORA,count=a=>runtime(a).itemCount('ING_APPLE'),wallet=a=>store.db.prepare('SELECT mora FROM market_wallet WHERE account_id=?').get(a.id)?.mora||0;
const snapshot=a=>({revision:store.meta(a.id).revision,mora:mora(a),apples:count(a),wallet:wallet(a)});
const rollback=(a,steps=1)=>admin.rollback({id:a.id,steps},'test','local');
try{
 const {a:A,token:tokenA}=await player('audit_seller'),{a:B}=await player('audit_buyer');
 const listing=(await store.marketSell(A,{entry:{item:'ING_APPLE',qty:1},price:1000})).listing;
 await store.marketBuy(B,{id:listing.id,price:1000});const base=mora(A);await store.marketCollect(A);await rollback(A);
 assert.equal(mora(A),base);assert.equal(wallet(A),950);const kept=snapshot(A);
 await assert.rejects(rollback(A),e=>e.status===409&&e.code==='ROLLBACK_EXTERNAL');assert.deepEqual(snapshot(A),kept);
 await store.marketCollect(A);assert.equal(mora(A),base+950);assert.equal(wallet(A),0);
 await assert.rejects(rollback(A,2),e=>e.code==='ROLLBACK_EXTERNAL');assert.equal(mora(A),base+950);
 checks.push('external rollback barrier blocks immediate and multi-step redo without changing either wallet');

 const sent=await store.letterSend(A,{to:pidOf(B.id),title:'반복 되돌리기 검사',items:[{item:'ING_APPLE',qty:1}],mora:100});
 await store.letterTake(B,{id:sent.letter.id});await rollback(B);const beforeAgain=snapshot(B);
 await assert.rejects(rollback(B),e=>e.code==='ROLLBACK_EXTERNAL');assert.deepEqual(snapshot(B),beforeAgain);
 await store.letterTake(B,{id:sent.letter.id});assert.equal(count(B),beforeAgain.apples+1);assert.equal(mora(B),beforeAgain.mora+100);
 checks.push('mail receipt cannot be restored while the same parcel stays claimable');

 const beforeSimple=mora(A);await edit(A,[{op:'currency',key:'MORA',mode:'set',value:beforeSimple+7}]);await rollback(A);assert.equal(mora(A),beforeSimple);await rollback(A);assert.equal(mora(A),beforeSimple+7);
 const legacy=store.db.prepare('SELECT request_id,result FROM receipts WHERE account_id=? ORDER BY revision DESC LIMIT 1').get(A.id),old=JSON.parse(legacy.result);delete old.result.rollback;
 store.db.prepare('UPDATE receipts SET result=? WHERE account_id=? AND request_id=?').run(JSON.stringify(old),A.id,legacy.request_id);
 await assert.rejects(rollback(A),e=>e.code==='ROLLBACK_EXTERNAL');
 checks.push('ordinary save-only rollback remains reversible; pre-fix unknown rollback receipts are protected');

 const offer=store.tradeOffer(A,{to:B.username,give:[{item:'ING_APPLE',qty:1}],want:[]}).trade;await store.tradeRespond(B,{id:offer.id},'accept');
 const aTrade=snapshot(A),bTrade=snapshot(B);for(const a of [A,B])await assert.rejects(rollback(a),e=>e.status===409&&e.code==='ROLLBACK_TRADE');assert.deepEqual(snapshot(A),aTrade);assert.deepEqual(snapshot(B),bTrade);
 const pending=store.tradeOffer(A,{to:B.username,give:[{item:'ING_APPLE',qty:1}],want:[]}).trade;await edit(A,[{op:'level',target:'PLAYER_CUSTOM',value:1}]);
 assert.throws(()=>store.tradeOffer(A,{to:B.username,give:[{item:'ING_APPLE',qty:1}]}),e=>e.status===403&&e.code==='LEVEL');
 await assert.rejects(store.tradeRespond(B,{id:pending.id},'accept'),e=>e.status===403&&e.code==='LEVEL');assert.equal(store.db.prepare('SELECT status FROM trades WHERE id=?').get(pending.id).status,'PENDING');
 await edit(A,[{op:'level',target:'PLAYER_CUSTOM',value:10}]);await edit(B,[{op:'level',target:'PLAYER_CUSTOM',value:1}]);
 assert.throws(()=>store.tradeOffer(A,{to:B.username,give:[{item:'ING_APPLE',qty:1}]}),e=>e.status===403&&e.code==='LEVEL');await edit(B,[{op:'level',target:'PLAYER_CUSTOM',value:10}]);await store.tradeRespond(B,{id:pending.id},'accept');
 checks.push('legacy trade protects both rollback sides and enforces both levels at offer and acceptance');

 const results=await Promise.allSettled(Array.from({length:5},(_,i)=>store.register({username:'race_fix_'+i,password:'test-only-password'},'203.0.113.42')));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,3);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='REGISTER_LIMIT').length,2);assert.equal(store.db.prepare('SELECT COUNT(*) n FROM register_log').get().n,3);
 checks.push('parallel signups reserve account and daily slot atomically');

 await store.register({username:'profile_reset',password:'test-only-password'},'local');const C=store.account('profile_reset');await store.newGame(C,{name:'이전 이름',route:'ROUTE_TRAVELER'});assert.equal(store.profile(C,pidOf(C.id)).player.name,'이전 이름');
 await admin.resetJourney({id:C.id,confirm:C.username},'test','local');await store.newGame(C,{name:'새 이름',route:'ROUTE_ISEKAI'});const card=store.profile(C,pidOf(C.id));assert.equal(card.player.name,'새 이름');assert.equal(card.player.route,'이세계인');
 checks.push('journey reset invalidates a profile even when the new revision repeats zero');

 const oldName=runtime(A).s.global.PLAYER_NAME,revision=store.meta(A.id).revision;
 await assert.rejects(admin.profile({id:A.id,displayName:'적용되면 안 됨',username:B.username},'test','local'),e=>e.status===409);assert.equal(runtime(A).s.global.PLAYER_NAME,oldName);assert.equal(store.meta(A.id).revision,revision);
 await admin.profile({id:A.id,displayName:'새로운 이름'},'test','local');assert.equal(runtime(A).s.global.PLAYER_NAME,'새로운 이름');assert.equal((await store.auth(tokenA)).a.display_name,'새로운 이름');assert.equal(store.profile(A,pidOf(A.id)).player.name,'새로운 이름');
 await rollback(A);assert.equal(runtime(A).s.global.PLAYER_NAME,oldName);assert.equal((await store.auth(tokenA)).a.display_name,oldName);
 await store.register({username:'no_journey_yet',password:'test-only-password'},'local');const N=store.account('no_journey_yet');await admin.profile({id:N.id,displayName:'여정 전 이름',username:'renamed_login'},'test','local');assert.equal(store.account('renamed_login').display_name,'여정 전 이름');
 checks.push('admin name uses the canonical saved name, stays after auth, rolls back, and validates combined edits atomically');
 console.log(JSON.stringify({ok:true,checks}));
}finally{await store.coopSettled();store.close();}
