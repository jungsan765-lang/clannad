'use strict';

const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const launcher=read('dev-local.cmd');
const reset=read('reset-local.cmd');
const runner=read('tools/local_dev.mjs');
const config=JSON.parse(read('server/wrangler.local.jsonc'));
const production=JSON.parse(read('server/wrangler.jsonc'));
const online=read('source/online_config.js');
const pkg=JSON.parse(read('package.json'));

assert(launcher.includes('tools\\local_dev.mjs'),'Windows launcher must start the local runner');
assert.equal(config.name,'genshin-crpg-local');
assert.equal(config.vars.ALLOWED_ORIGIN,'http://127.0.0.1:5173');
assert(config.vars.PASSWORD_PEPPER.length>=32,'local password pepper must satisfy the Worker guard');
assert.equal(config.d1_databases[0].binding,'DB');
assert.equal(config.d1_databases[0].database_name,'genshin-crpg-local');
assert.notEqual(config.d1_databases[0].database_id,production.d1_databases[0].database_id,'local config must never reuse the production D1 id');

assert(runner.includes("'--local'"),'local Wrangler operations must be explicitly local');
assert(runner.includes("'d1', 'execute', 'genshin-crpg-local'"),'local D1 schema must target the local database');
assert(runner.includes("'wrangler@4', 'dev'"),'runner must start a local Worker');
assert(!runner.includes("'--remote'"),'local runner must not contain a remote D1 flag');
assert(!runner.includes("'deploy'"),'local runner must never deploy a Worker');
assert(!runner.includes('genshin-crpg-online'),'local runner must not target the production database');

assert(online.includes("local?'http://127.0.0.1:8787':'https://genshin-crpg-online.jungsan765.workers.dev'"),'localhost must use the local Worker while production keeps the deployed API');
assert(reset.includes('.local\\wrangler'),'reset command must only clear isolated local state');
assert(!reset.includes('--remote'),'reset command must not include a remote operation');
assert.equal(pkg.version,'0.14.0','adding local development must not bump the production game version');

console.log('PASS isolated one-click local development configuration');
