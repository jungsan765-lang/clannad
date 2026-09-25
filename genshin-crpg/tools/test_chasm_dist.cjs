'use strict';
// Verify the delivered compiled runtime and file-format compatibility, not browser storage.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),dist=root+'/dist',db=JSON.parse(fs.readFileSync(root+'/content/db.json'));
const checks=[];function test(name,f){try{f();checks.push({name,passed:true});}catch(e){checks.push({name,passed:false,error:e.stack});}}
const c=vm.createContext({console,Date,setTimeout,clearTimeout,TextEncoder,TextDecoder});
for(const[,file]of fs.readFileSync(dist+'/index.html','utf8').matchAll(/<script src="((?:world_content|runtime[^" ?]*)\.js)(?:\?[^" ]*)?"/g))vm.runInContext(fs.readFileSync(dist+'/'+file,'utf8'),c,{filename:file});
vm.runInContext(fs.readFileSync(dist+'/save_adapter.js','utf8'),c);
const R=c.CRPGRuntime.Runtime,S=c.CRPGSave.SaveAdapter,m=JSON.parse(fs.readFileSync(dist+'/asset-manifest.json')),old=JSON.parse(fs.readFileSync(root+'/content/gameplay-revisions/chasm1-base-save-compatibility.json'));
const adapter=new S({contentVersion:m.saveCompatibilityVersion,compatibleContentVersions:m.compatibleSaveVersions,validate:s=>new R(db,s).s});
const prior=new S({contentVersion:old.saveCompatibilityVersion,compatibleContentVersions:old.compatibleSaveVersions});
function fresh(){const r=new R(db);r.newGame({name:'테스트',route:'ROUTE_ISEKAI',seed:172,saveId:'PATCH-DIST-CHECK'});Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'HUB',STORY_CURSOR_NODE_ID:'HUB',ACTIVE_STORY_QUEST:'',SCREEN_MODE:'LOCATION',STORY_MENU_POLICY:'FULL',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:'MAP_CHASM_DEEP',PLAYER_LEVEL_STATE:12});r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;return r;}
for(const group of ['EG_CHASM_HUSK','EG_CHASM_SERPENT'])test('compiled distribution starts and roundtrips a battle: '+group,()=>{const r=fresh();r.startBattle(group,'RANDOM');r.action('COMBAT_BEGIN');assert(r.s.runtime);assert.equal(r.s.runtime.chasmSkillVersion,1);const text=adapter.exportState(r.s),p=adapter.parseImport(text);assert.equal(new R(db,p.state).serialize(),r.serialize());});
test('0.13.17 export accepted, saved state preserved',()=>{const r=fresh(),text=prior.exportState(r.s);assert.equal(new R(db,adapter.parseImport(text).state).serialize(),r.serialize());});
test('new compatibility tag prevents old app from interpreting new save',()=>{assert(m.saveCompatibilityVersion.endsWith('-chasm1'));assert.throws(()=>prior.parseImport(adapter.exportState(fresh().s)),e=>e.code==='SAVE_CONTENT_VERSION');});
test('source and compiled combat handlers match byte-for-byte',()=>{for(const f of ['runtime_combat.js','runtime_chasm_skills.js'])assert(fs.readFileSync(dist+'/'+f).equals(fs.readFileSync(root+'/source/'+f)));});
let checkedFiles=0;
test('every offline package hash matches delivered bytes, new module included',()=>{const pack=JSON.parse(fs.readFileSync(dist+'/offline-pack.json'));assert(pack.files.some(f=>f.path==='runtime_chasm_skills.js'));for(const f of pack.files){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(dist+'/'+f.path)).digest('hex'),f.sha256,f.path);checkedFiles++;}});
const result={version:'0.13.18',total:checks.length,passed:checks.filter(t=>t.passed).length,checkedFiles,checks};fs.mkdirSync(root+'/reports/chasm_step1',{recursive:true});fs.writeFileSync(root+'/reports/chasm_step1/dist-tests.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(result.total!==result.passed)process.exitCode=1;
