const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const source=fs.readFileSync(path.join(__dirname,'../tools/install-fixed-region-test-release.sh'),'utf8');
// Execute the real preflight only: this test cannot reach mkdir, service operations or the release switch.
const guard=source.slice(source.indexOf('# Optional pin'),source.indexOf('\nlive_engine() {'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'crpg-release-pin-'));
const sha='a'.repeat(40),other='b'.repeat(40);
try {
  fs.writeFileSync(path.join(temp,'curl'),'#!/bin/sh\nprintf "%s\\n" "$MOCK_RELEASE_SHA"\n',{mode:0o755});
  for(const [name,pin,remote,ok] of [
    ['matching reviewed release',sha,sha,true],
    ['moving latest release',sha,other,false],
    ['malformed pin','invalid',sha,false],
    ['existing unpinned flow','',sha,true]
  ]) {
    const r=spawnSync('bash',['-c','set -Eeuo pipefail\nBASE=https://example.invalid\n'+guard+'\nprintf "ACCEPTED"'],{encoding:'utf8',env:{...process.env,PATH:temp+path.delimiter+process.env.PATH,CRPG_EXPECTED_TEST_SHA:pin,MOCK_RELEASE_SHA:remote}});
    if(r.error)throw r.error;
    assert.equal(r.status===0,ok,name+': '+r.stderr);
    assert.equal(r.stdout.endsWith('ACCEPTED'),ok,name+' must stop before local changes');
  }
  console.log('PASS: test release pin, mismatch, malformed pin and compatible default');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
