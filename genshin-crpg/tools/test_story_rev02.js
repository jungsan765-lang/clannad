'use strict';
/* Actual runtime integration tests. Synthetic quest fixtures are not full game playthroughs. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),db=JSON.parse(fs.readFileSync(root+'/content/db.json'));
const rev=JSON.parse(fs.readFileSync(root+'/content/story-revisions/rev02.json'));
const c=vm.createContext({console,setTimeout,clearTimeout,TextEncoder,TextDecoder});
const loadOrder=[...fs.readFileSync(root+'/source/index.html','utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)].map(m=>m[1]);
for(const f of loadOrder)vm.runInContext(fs.readFileSync(root+'/source/'+f,'utf8'),c,{filename:f});
vm.runInContext(fs.readFileSync(root+'/source/save_adapter.js','utf8'),c,{filename:'save_adapter.js'});
const Runtime=c.CRPGRuntime.Runtime,report={checks:[],traces:{},moduleCount:loadOrder.length,fixture:'actual complete source runtime stack, synthetic starting quest state'};
function check(name,fn){try{fn();report.checks.push({name,passed:true});}catch(e){report.checks.push({name,passed:false,error:e.stack});console.error('FAILED',name,e.stack);write();throw e;}}
function write(){report.total=report.checks.length;report.passed=report.checks.filter(x=>x.passed).length;fs.mkdirSync(root+'/reports/story_rev02',{recursive:true});fs.writeFileSync(root+'/reports/story_rev02/runtime-tests.json',JSON.stringify(report,null,2));}
function routeState(r,leaf,quest,map){
 const traveler=leaf.startsWith('TRV_');
 Object.assign(r.s.global,{ACTIVE_STORY_QUEST:quest,CURRENT_MAP_ID:map,PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',SCREEN_MODE:'STORY',STORY_WAITING:false,STORY_NEXT_PREPARED:'',STORY_MENU_POLICY:'',STORY_ROUTE_ID:traveler?'ROUTE_TRAVELER':'ROUTE_ISEKAI'});
 Object.assign(r.s.flags,{FLAG_ISK_META_KNOWLEDGE:leaf.startsWith('K')?'KNOWN':'UNKNOWN',FLAG_ISK_MOND_BRANCH:leaf.startsWith('B')?'GUILD':'EXPEDITION',FLAG_ISK_EXPEDITION_FORK:leaf.startsWith('AA')?'RIDE':'RETURN',FLAG_TRV_LY_GOLDEN_ROUTE:leaf==='TRV_A'?'A':'B'});
 for(const ch of ['01','02','03','04']){r.s.flags['FLAG_ISK_L'+ch+'_LEAF']=leaf;r.s.flags['FLAG_ISK_L'+ch+'_STARTED']=true;r.s.flags['FLAG_ISK_L'+ch+'_CONTENT_GATE']=false;}
 const l=r.ensureLiyue();l.activeQuest=quest;l.accepts[quest]??={saveId:r.s.global.SAVE_ID,route:r.s.global.STORY_ROUTE_ID,entry:'synthetic-fixture',leaf,parent:r.liyueParent()};
 delete r.s.storyJourney;delete r.s.storyBreak;delete r.s.storyContext;delete r.s.runtime;
}
function create(leaf,scene){const r=new Runtime(db);r.newGame({name:'리월검증',route:leaf.startsWith('TRV_')?'ROUTE_TRAVELER':'ROUTE_ISEKAI',seed:712,saveId:'rev02-'+leaf});routeState(r,leaf,scene.quest,scene.map);return r;}
function jump(r,id){r.s.global.PENDING_CHOICE_GROUP_ID='';r.storySetCursor(id);r.prepareStory();}
function current(r){return r.s.global.PENDING_CHOICE_GROUP_ID?'CHOICE_GROUP:'+r.s.global.PENDING_CHOICE_GROUP_ID:r.storyActiveNodeId();}
function stateSnapshot(r){return JSON.stringify({leafs:['01','02','03','04'].map(x=>r.s.flags['FLAG_ISK_L'+x+'_LEAF']),route:r.s.global.STORY_ROUTE_ID,golden:r.s.flags.FLAG_TRV_LY_GOLDEN_ROUTE,hp:r.s.global.PLAYER_HP_CURRENT,mora:r.s.global.MORA,party:r.s.party});}
function run(r,stop,chosen,limit=70){const trace=[];for(let n=0;n<limit;n++){
 if(current(r)===stop || r.storyActiveNodeId()===stop)return trace;
 if(r.s.storyBreak)throw Error('unexpected story break at '+r.storyActiveNodeId()+': '+JSON.stringify(r.s.storyBreak));
 const cs=r.storyChoices();
 if(cs.length){const pick=cs.find(x=>x[4]===chosen)||cs[0];trace.push(pick[4]);r.action('STORY_CHOICE',{node:pick[4]});}
 else {const row=r.storyNode();assert(row,'missing at '+r.storyActiveNodeId()+' expecting '+stop);trace.push(row[4]);r.action('STORY_NEXT',{node:row[4]});}
 }throw Error('Traversal limit: '+r.storyActiveNodeId()+' expecting '+stop);}
const table=db['55_MAIN_STORY_DB'].slice(1),by=new Map(table.map(r=>[r[4],r]));
check('new next targets exist, are same route, and each group has three choices',()=>{for(const row of table.filter(x=>x[4].startsWith('REV02_'))){const next=row[13];assert(row[11].includes('ROUTE_ID='));if(next.startsWith('CHOICE_GROUP:')){const cs=table.filter(x=>x[14]===next.slice(13)&&x[5]==='CHOICE');if(next.startsWith('CHOICE_GROUP:REV02_'))assert.equal(cs.length,3);else assert(cs.length>0);assert(cs.every(x=>x[0]===row[0]));}else {assert(by.has(next),next);assert.equal(by.get(next)[0],row[0]);}}});
for(const scene of rev.scenes){for(const leaf of scene.audience)for(const option of scene.choices){
 check(leaf+' / '+scene.key+' / '+option.value+' choice, merge, save and callback',()=>{
 let r=create(leaf,scene);jump(r,scene.entry);const before=stateSnapshot(r);
 const trace=run(r,scene.resume,option.id);assert.equal(r.s.flags[scene.flag],option.value);assert.equal(stateSnapshot(r),before,'unintended route/stats mutation');
 assert.equal(trace.filter(x=>scene.choices.some(o=>o.id===x)).length,1);
 const cb=rev.callbacks.find(x=>x.key===scene.key);let recalled=[];
 if(cb){r=new Runtime(db,JSON.parse(r.serialize()));const anchor=by.get(cb.anchor);routeState(r,leaf,anchor[1],anchor[8]);jump(r,cb.anchor);recalled=run(r,cb.resume);assert.deepEqual(recalled.filter(x=>cb.nodes.includes(x)),[cb.nodes[scene.choices.findIndex(x=>x.id===option.id)]]);}
 report.traces[leaf+':'+option.id]={trace,callback:recalled};
 });
 }
 check(scene.key+' allows save/reload at the choice and rejects a second resolution',()=>{
 const leaf=scene.audience[0];let r=create(leaf,scene);jump(r,'CHOICE_GROUP:REV02_'+scene.key+'_CHOICES');assert.equal(r.storyChoices().length,3);
 r=new Runtime(db,JSON.parse(r.serialize()));r.prepareStory();assert.equal(r.storyChoices().length,3);
 r.action('STORY_CHOICE',{node:scene.choices[0].id});assert.equal(r.s.flags[scene.flag],scene.choices[0].value);
 assert.throws(()=>r.action('STORY_CHOICE',{node:scene.choices[1].id}));assert.equal(r.s.flags[scene.flag],scene.choices[0].value);
 });
 for(const leaf of ['K1','K2','AA1','AA2','AB1','AB2','B1','B2','TRV_A','TRV_B'].filter(x=>!scene.audience.includes(x)))check(scene.key+' hidden from '+leaf,()=>{const r=create(leaf,scene);r.storySetCursor('CHOICE_GROUP:REV02_'+scene.key+'_CHOICES');r.s.global.PENDING_CHOICE_GROUP_ID='REV02_'+scene.key+'_CHOICES';assert.equal(r.storyChoices().length,0);});
}
for(const cb of rev.callbacks)for(const value of [undefined,'UNSET'])check('legacy '+cb.key+' '+String(value)+' skips all added recall rows',()=>{const scene=rev.scenes.find(x=>x.key===cb.key),leaf=scene.audience[0];let r=create(leaf,scene);const a=by.get(cb.anchor);routeState(r,leaf,a[1],a[8]);if(value===undefined)delete r.s.flags[cb.flag];else r.s.flags[cb.flag]=value;jump(r,cb.anchor);const trace=run(r,cb.resume);assert.equal(trace.filter(x=>cb.nodes.includes(x)).length,0);});
check('ten leaves covered and new event effects limited to local choice/flag state',()=>{
 assert.deepEqual([...new Set(rev.scenes.flatMap(x=>x.audience))].sort(),['K1','K2','AA1','AA2','AB1','AB2','B1','B2','TRV_A','TRV_B'].sort());
 for(const row of table.filter(x=>x[4].startsWith('REV02_'))){assert(!row[12]||/^FLAG_REV02_\w+=\w+;LOCAL_CHOICE:REV02_\w+:\w+$/.test(row[12]),row[4]);}
});
const old=JSON.parse(fs.readFileSync(root+'/content/story-revisions/rev02-base-save-compatibility.json')),currentManifest=JSON.parse(fs.readFileSync(root+'/dist/asset-manifest.json'));
check('v0.13.16 current and historical save compatibility IDs retained',()=>{for(const v of [old.saveCompatibilityVersion,old.contentVersion,...old.compatibleSaveVersions])assert(currentManifest.compatibleSaveVersions.includes(v),v);});
check('v0.13.16 save imports through actual SaveAdapter without replaying new old-scene choices',()=>{const scene=rev.scenes.find(x=>x.key==='AB2_HATCH');let r=create('AB2',scene);jump(r,'ISK_L01_AB_196');delete r.s.flags[scene.flag];const oldState=JSON.parse(r.serialize());const adapter=new c.CRPGSave.SaveAdapter({contentVersion:currentManifest.saveCompatibilityVersion,compatibleContentVersions:currentManifest.compatibleSaveVersions});try{const out=adapter.parseImport(JSON.stringify({envelopeSchema:1,runtimeSchema:2,contentVersion:old.saveCompatibilityVersion,state:oldState}));assert.equal(out.state.global.STORY_CURSOR_NODE_ID,oldState.global.STORY_CURSOR_NODE_ID);const loaded=new Runtime(db,out.state);loaded.prepareStory();assert.equal(loaded.storyActiveNodeId(),'ISK_L01_AB_196');}finally{adapter.close();}});
write();console.log(JSON.stringify({checks:report.total,passed:report.passed,runtimeModules:loadOrder.length}));
