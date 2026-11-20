const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const source=fs.readFileSync(path.join(__dirname,'../tools/install-fixed-region-test-release.sh'),'utf8');
const sha='a'.repeat(40),old='b'.repeat(40),engine='engine-new',oldEngine='engine-old';
const build='server-new',oldBuild='server-old',version='0.15.11',oldVersion='0.15.10';
function put(file,text,mode){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text,mode?{mode}:undefined);}
function run(name,fail,{dropin=true,first=false,healthDelay=false,repeat=false}={}) {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'crpg-install-transaction-'));
  const server=path.join(tmp,'server'),web=path.join(tmp,'web'),drop=path.join(tmp,'systemd/test.service.d');
  try {
    // Execute the complete installer, substituting only machine paths and the root privilege check.
    // Every service/network operation is a local mock; no production or real VPS path is reachable.
    let script=source.replace('SERVER_ROOT="/opt/genshin-crpg-test-server"',`SERVER_ROOT="${server}"`)
      .replace('WEB_ROOT="/var/www/genshin-crpg-test"',`WEB_ROOT="${web}"`)
      .replace('DROPIN_DIR="/etc/systemd/system/$SERVICE.d"',`DROPIN_DIR="${drop}"`)
      .replaceAll('/run/lock/genshin-crpg-test-release.lock',path.join(tmp,'install.lock'))
      .replace('if [[ "${EUID}" -ne 0 ]]; then','if false; then');
    assert(!script.includes('SERVER_ROOT="/opt/')&&!script.includes('WEB_ROOT="/var/')&&!script.includes('DROPIN_DIR="/etc/'),'mock paths replace all installation destinations');
    put(path.join(tmp,'install.sh'),script);
    for(const root of [server,web]) {
      fs.mkdirSync(path.join(root,'releases'),{recursive:true});
      if(!first){fs.mkdirSync(path.join(root,'releases',old));fs.symlinkSync(path.join(root,'releases',old),path.join(root,'current'));}
    }
    if(!first){put(path.join(server,'releases',old,'server-engine.txt'),oldEngine);put(path.join(web,'deployed-sha'),old+'\n');}
    const oldDrop='[Service]\nWorkingDirectory=/previous/test-only\nEnvironment=KEEP_ME=1\n';
    if(dropin)put(path.join(drop,'verified-release.conf'),oldDrop);
    const bundle=path.join(tmp,'bundle');
    put(path.join(bundle,'server/server/fixed-region-live.mjs'),'// test');
    put(path.join(bundle,'server/server/generated/engine.mjs'),`// Reading identity must not evaluate this file.\nthrow new Error("must not import the runtime");\nexport const ENGINE_VERSION="${version}";\n${fail==='missing-build'?'':`export const SERVER_BUILD="${build}";\n`}`);
    put(path.join(bundle,'server/server-engine.txt'),engine);
    put(path.join(bundle,'server/test-source-sha.txt'),sha);
    put(path.join(bundle,'web/release.json'),JSON.stringify({engineVersion:engine}));
    put(path.join(bundle,'web/index.html'),'test');
    put(path.join(bundle,'web/online_config.js'),'test');
    put(path.join(bundle,'web/test-source-sha.txt'),sha);
    for(const half of ['server','web'])assert.equal(spawnSync('tar',['-czf',path.join(tmp,half+'.tgz'),'-C',path.join(bundle,half),'.']).status,0);
    const realMv=spawnSync('which',['mv'],{encoding:'utf8'}).stdout.trim();
    put(path.join(tmp,'bin/curl'),`#!/usr/bin/env bash
url="\${!#}"
case "$url" in
  */crpg-test-sha.txt) printf '%s' '${sha}';;
  */crpg-test-server.tar.gz) cat "$MOCK_TMP/server.tgz";;
  */crpg-test-pack.tar.gz) cat "$MOCK_TMP/web.tgz";;
  */health)
    value='${oldEngine}'
    if [[ -f "$MOCK_TMP/restarted" && -f "$MOCK_TMP/server/current/server-engine.txt" ]]; then value=$(cat "$MOCK_TMP/server/current/server-engine.txt"); fi
    if [[ "$MOCK_FAIL" == health && "$value" == '${engine}' ]]; then value=wrong-engine; fi
    if [[ "$MOCK_DELAY" == 1 && "$value" == '${engine}' && ! -f "$MOCK_TMP/delayed" ]]; then touch "$MOCK_TMP/delayed"; value='${oldEngine}'; fi
    build='${oldBuild}'; version='${oldVersion}'
    if [[ "$value" == '${engine}' ]]; then build='${build}'; version='${version}'; fi
    if [[ "$MOCK_FAIL" == old-build && "$value" == '${engine}' ]]; then build='${oldBuild}'; fi
    if [[ "$MOCK_FAIL" == old-version && "$value" == '${engine}' ]]; then version='${oldVersion}'; fi
    okay=true
    if [[ "$MOCK_FAIL" == unhealthy && "$value" == '${engine}' ]]; then okay=false; fi
    printf '{"ok":%s,"engineVersion":"%s","serverBuild":"%s","version":"%s"}' "$okay" "$value" "$build" "$version";;
  *) exit 91;;
esac
`,0o755);
    put(path.join(tmp,'bin/systemctl'),`#!/usr/bin/env bash
printf '%s\\n' "$*" >>"$MOCK_TMP/service.log"
if [[ "$1" == restart ]]; then
  if [[ "$MOCK_FAIL" == restart && ! -f "$MOCK_TMP/failed" ]]; then touch "$MOCK_TMP/failed"; exit 1; fi
  touch "$MOCK_TMP/restarted"
fi
if [[ "$1" == daemon-reload && "$MOCK_FAIL" == reload && ! -f "$MOCK_TMP/failed" ]]; then touch "$MOCK_TMP/failed"; exit 1; fi
`,0o755);
    put(path.join(tmp,'bin/mv'),`#!/usr/bin/env bash
last="\${!#}"
if [[ "$MOCK_FAIL" == stage-web && "$last" == "$MOCK_TMP/web/releases/${sha}" ]]; then exit 1; fi
if [[ "$MOCK_FAIL" == switch-web && "$last" == "$MOCK_TMP/web/current" && ! -f "$MOCK_TMP/failed" ]]; then touch "$MOCK_TMP/failed"; exit 1; fi
if [[ "$MOCK_FAIL" == marker && "$last" == "$MOCK_TMP/web/deployed-sha" && ! -f "$MOCK_TMP/failed" ]]; then touch "$MOCK_TMP/failed"; exit 1; fi
exec '${realMv}' "$@"
`,0o755);
    put(path.join(tmp,'bin/sleep'),'#!/bin/sh\nexit 0\n',0o755);
    const options={encoding:'utf8',timeout:20000,env:{...process.env,PATH:path.join(tmp,'bin')+path.delimiter+process.env.PATH,CRPG_EXPECTED_TEST_SHA:sha,MOCK_TMP:tmp,MOCK_FAIL:fail,MOCK_DELAY:healthDelay?'1':'0'}};
    const command=fail==='locked'?'flock':'bash';
    const args=fail==='locked'?['-n',path.join(tmp,'install.lock'),'bash',path.join(tmp,'install.sh')]:[path.join(tmp,'install.sh')];
    const result=spawnSync(command,args,options);
    if(result.error)throw result.error;
    if(!fail){
      assert.equal(result.status,0,name+': '+result.stderr);
      assert.equal(fs.realpathSync(path.join(server,'current')),path.join(server,'releases',sha),name);
      assert.equal(fs.realpathSync(path.join(web,'current')),path.join(web,'releases',sha),name);
      assert.equal(fs.readFileSync(path.join(web,'deployed-sha'),'utf8'),sha+'\n',name);
      if(repeat){const again=spawnSync('bash',[path.join(tmp,'install.sh')],options);assert.equal(again.status,0,name+' repeat: '+again.stderr);assert.equal(fs.realpathSync(path.join(web,'current')),path.join(web,'releases',sha),name+' repeat keeps pair');}
    } else {
      assert.notEqual(result.status,0,name+' must report failure');
      for(const root of [server,web]){
        if(first)assert.equal(fs.existsSync(path.join(root,'current')),false,name+' restores absent link');
        else assert.equal(fs.realpathSync(path.join(root,'current')),path.join(root,'releases',old),name+' restores previous half');
      }
      assert.equal(fs.existsSync(path.join(drop,'verified-release.conf')),dropin,name+' restores drop-in presence');
      if(dropin)assert.equal(fs.readFileSync(path.join(drop,'verified-release.conf'),'utf8'),oldDrop,name+' restores complete drop-in contents');
      if(!first)assert.equal(fs.readFileSync(path.join(web,'deployed-sha'),'utf8'),old+'\n',name+' keeps deployed marker');
      if(fail==='stage-web'||fail==='locked'||fail==='missing-build')assert.equal(fs.existsSync(path.join(tmp,'service.log')),false,name+' must fail before any service mutation');
    }
    for(const root of [server,web])assert(!fs.readdirSync(path.join(root,'releases')).some(x=>x.startsWith('.tmp-')),name+' cleans temporary directories');
    for(const pending of [path.join(server,'current.new'),path.join(web,'current.new'),path.join(web,'deployed-sha.new'),path.join(drop,'verified-release.conf.new')])assert.equal(fs.existsSync(pending),false,name+' cleans pending switch file');
    console.log('PASS: '+name);
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
}
run('failed restart rolls both halves back','restart');
run('failed daemon reload restores original drop-in','reload');
run('client disk/rename failure happens before API activation','stage-web');
run('client switch failure rolls API back','switch-web');
run('wrong engine rolls back','health');
run('first installation failure restores legacy service path','restart',{first:true,dropin:false});
run('healthy matching release installs both halves','');
run('old health response is retried until the new engine appears','',{healthDelay:true});
run('deployed marker failure rolls both halves back','marker');
run('health must report ok as well as the expected engine','unhealthy');
run('concurrent installer is refused before local mutations','locked');
run('same reviewed release can be installed again safely','',{repeat:true});
run('same engine with an old server build cannot activate the client','old-build');
run('same engine and build with an old version cannot activate the client','old-version');
run('bundle with no generated build identity fails before activation','missing-build');
