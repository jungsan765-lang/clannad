import assert from 'node:assert/strict';
import {durableFixture} from './helpers_durable.mjs';
const f=durableFixture();f.env.GAME_STATE_BACKEND='d1';await f.start();
const id=f.account.id,legacy=f.token,secretToken='v2.'+id+'.'+legacy,original=f.sql.prepare('SELECT * FROM games WHERE account_id=?').get(id);
f.env.GAME_STATE_BACKEND='do';f.get(id);f.handles.get(id).failSql='INSERT INTO metadata';
assert.equal((await f.call('/me')).status,500);assert.equal(f.sql.prepare('SELECT state FROM games WHERE account_id=?').get(id).state,original.state);assert.equal(f.sql.prepare('SELECT owner FROM game_owners WHERE account_id=?').get(id).owner,'DO');
f.handles.get(id).failSql=null;const migrated=await f.call('/me');assert.equal(migrated.status,200,JSON.stringify(migrated));assert.equal(migrated.revision,original.revision);
const d1Calls=f.d1Calls;assert.equal((await f.call('/me',undefined,secretToken)).status,200);assert.equal(f.d1Calls,d1Calls);
const prepare=f.env.DB.prepare;f.env.DB.prepare=q=>q.startsWith('DELETE FROM sessions')?{bind:()=>({run:async()=>{throw Error('D1 revocation unavailable');}})}:prepare(q);
assert.equal((await f.call('/logout',{},secretToken)).status,200);f.env.DB.prepare=prepare;
assert(f.sql.prepare('SELECT COUNT(*) n FROM sessions WHERE account_id=?').get(id).n>0);assert.equal((await f.call('/me',undefined,legacy)).status,401,'legacy D1 session cannot resurrect DO revocation');assert.equal((await f.call('/me',undefined,secretToken)).status,401);
const login=await f.call('/login',{username:'durabletest',password:'test-only-password'},'');assert.equal(login.status,200);assert.equal((await f.call('/me',undefined,login.token)).status,200);
const expiredHash=f.get(id).rows('SELECT token_hash FROM sessions WHERE revoked=0')[0].token_hash;f.get(id).sql.exec('UPDATE sessions SET expires_at=0 WHERE token_hash=?',expiredHash);assert.equal((await f.call('/me',undefined,login.token)).status,401);
const nextLogin=await f.call('/login',{username:'durabletest',password:'test-only-password'},'');assert.equal((await f.call('/account/delete',{confirm:'durabletest',password:'wrong-password'},nextLogin.token)).status,403);assert.equal((await f.call('/account/delete',{confirm:'durabletest',password:'test-only-password'},nextLogin.token)).deleted,true);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM accounts WHERE id=?').get(id).n,0);assert.equal((await f.call('/me',undefined,nextLogin.token)).status,401);
console.log(JSON.stringify({ok:true,migrationFailureRecovery:true,originalPreserved:true,zeroD1RoutedAuth:true,legacyRevocationTombstone:true,expiry:true,accountDeletion:true}));

// Once activated, a missing object must never reimport the stale D1 original.
const lost=durableFixture();await lost.start();const lostId=lost.account.id;
lost.get(lostId).sql.exec('DELETE FROM metadata');
const blocked=await lost.call('/login',{username:'durabletest',password:'test-only-password'},'');
assert.equal(blocked.status,503);assert.equal(lost.get(lostId).meta(),undefined);
assert.equal(lost.sql.prepare('SELECT activated FROM game_owners WHERE account_id=?').get(lostId).activated,1);
console.log('PASS activated-object loss cannot overwrite a save with the stale D1 original');
