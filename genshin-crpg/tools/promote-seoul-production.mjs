#!/usr/bin/env node
import {readFileSync,existsSync,rmSync,mkdirSync,cpSync,writeFileSync,realpathSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {R,DB as GAME_DB,ENGINE_FINGERPRINT} from '../server/generated/engine.mjs';
import {LiveRegionStore} from '../server/fixed-region-live.mjs';
import {splitState} from '../server/state-parts.mjs';

const [snapshotArg,sourceArg,targetArg]=process.argv.slice(2);
if(!snapshotArg||!sourceArg||!targetArg){
 console.error('usage: node tools/promote-seoul-production.mjs SNAPSHOT TEST_DB PROD_DB');
 process.exit(2);
}
const snapshotPath=resolve(snapshotArg),sourcePath=resolve(sourceArg),targetPath=resolve(targetArg);
const snap=JSON.parse(readFileSync(snapshotPath,'utf8'));
if(snap.version!=='0.14.5'||snap.engineVersion!==ENGINE_FINGERPRINT)throw Error('snapshot engine/version mismatch');
if(!snap.account?.id||!snap.account?.username||!snap.state||!Number.isSafeInteger(snap.revision)||snap.revision<0)throw Error('snapshot envelope invalid');
new R(GAME_DB,structuredClone(snap.state),true);

const source=new DatabaseSync(sourcePath,{readOnly:true});
const sourceAccounts=source.prepare('SELECT id,username,display_name,salt,password_hash,created_at FROM accounts ORDER BY created_at').all();
source.close();
if(sourceAccounts.length!==1)throw Error('test DB must contain exactly one account before promotion');
const auth=sourceAccounts[0];

if(existsSync(targetPath))throw Error('production DB already exists; refusing to overwrite');
mkdirSync(dirname(targetPath),{recursive:true});
const pepper=process.env.PASSWORD_PEPPER||'';
if(pepper.length<32)throw Error('PASSWORD_PEPPER is required');
const store=new LiveRegionStore(targetPath,{pepper,adminIds:process.env.ADMIN_ACCOUNT_IDS||''});
const account={id:String(snap.account.id),username:String(snap.account.username).normalize('NFKC').trim().toLowerCase(),display:String(snap.account.displayName||snap.account.username).trim().slice(0,24)};
const parts=splitState(snap.state),t=Date.now(),ranked=snap.ranked===true?1:0;

store.db.exec('BEGIN IMMEDIATE');
try{
 store.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(account.id,account.username,account.display,auth.salt,auth.password_hash,t);
 store.db.prepare('INSERT INTO metadata VALUES(?,?,?,?,?)').run(account.id,snap.revision,ranked,'IMPORTED',t);
 const ins=store.db.prepare('INSERT INTO parts VALUES(?,?,?)');
 for(const [path,value] of parts)ins.run(account.id,path,value);
 store.db.exec('COMMIT');
}catch(e){if(store.db.isTransaction)store.db.exec('ROLLBACK');store.close();try{rmSync(targetPath,{force:true});}catch{}throw e;}

const restored=store.meta(account.id),restoredParts=store.loadParts(account.id);
if(restored.revision!==snap.revision||restoredParts.size!==parts.size){store.close();throw Error('production DB verification failed');}
store.rank(store.account(account.username),ranked,snap.state);
store.close();
console.log(JSON.stringify({
 ok:true,
 account:account.username,
 revision:snap.revision,
 ranked:!!ranked,
 engineVersion:snap.engineVersion,
 parts:parts.size,
 player:snap.state?.global?.PLAYER_NAME||'',
 level:snap.state?.global?.PLAYER_LEVEL_STATE||0,
 map:snap.state?.global?.CURRENT_MAP_ID||'',
 testCredentialCopied:true
}));
