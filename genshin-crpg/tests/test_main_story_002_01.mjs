import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'source/runtime_local_story.js'),'utf8');
const marker='/* Main story manuscript 002.01, v0.14.6.';
assert.equal(source.split(marker).length,2);
const patch=marker+source.split(marker)[1].split('/* Main story manuscript 001.01, v0.14.6.')[0];
const scene=JSON.parse(patch.match(/const SCENE=(\[[\s\S]*?\]);\nconst installed=/)[1]);
const R='ROUTE_ISEKAI',Q='Q_ISK_LIYUE_01';
// A reconstructed installer fixture, NOT the complete current game database.
function fixture(legacy=true){
 const rows=scene.map((s,i)=>[R,Q,'ARC_TEST','SCENE_TEST',s.id,s.type,s.profile||'',s.type==='NARRATION'?'나':s.speaker,'MAP_MOND_CITY','old text','','FLAG_TEST=TRUE','EVENT:EXISTING_EVENT',scene[i+1]?.id||'EXISTING_TRAVEL_GATE','','ASSET_TEST','CRPG',i,'READY','original metadata']);
 if(legacy)for(const s of scene.filter(s=>s.id.startsWith('R39_PROSE_'))){const r=rows.find(r=>r[4]===s.id).slice();r[4]=s.id.slice(10);r[5]='CHOICE';r[9]='';r[10]='old label';r[14]='UNCHANGED_GROUP';rows.push(r);}
 rows.push([R,Q,'ARC','SCENE','ISK_L01_K_001','NARRATION','','','MAP_MOND_CITY','unchanged entry','','','','ISK_L01_K_002']);
 rows.push([R,Q,'ARC','SCENE','EXISTING_TRAVEL_GATE','EVENT','','','','unchanged exit','','','TRAVEL:ORIGINAL','ISK_L01_K_016']);
 rows.push([R,'Q_ISK_LIYUE_03','ARC','SCENE','ISK_L03_K2_024','DIALOGUE','PROFILE_LIYUE_KEQING','각청','','prior approved story']);
 rows.push(['ROUTE_TRAVELER',Q,'ARC','SCENE','ISK_L01_K_002','DIALOGUE','','진','','traveler untouched']);
 return {nodes:new Map(rows.map(r=>[r[0]+':'+r[4],r])),byTable:{'55_MAIN_STORY_DB':rows},otherIndex:{sentinel:true}};
}
function install(ix){class Runtime{storyIndex(){return ix;}}const ctx={CRPGRuntime:{Runtime},WeakSet};vm.runInNewContext(patch,ctx);return {runtime:new Runtime(),api:ctx.CRPGRuntime};}
let checks=0;const check=(condition,label)=>{assert.ok(condition,label);checks++;};
const ix=fixture(),before=new Map([...ix.nodes].map(([k,r])=>[k,r.slice()])),rowsRef=ix.byTable['55_MAIN_STORY_DB'];
const {runtime,api}=install(ix);check(runtime.storyIndex()===ix,'same index');
check(ix.nodes.size===before.size,'no new/deleted IDs');check(rowsRef===ix.byTable['55_MAIN_STORY_DB'],'same table');
check(api.mainStoryEntryRevision==='002.01-r2','revision');
const targets=new Map(scene.map(s=>[R+':'+s.id,s]));
for(const [k,row]of ix.nodes){
 const original=before.get(k),spec=targets.get(k),legacy=scene.find(s=>s.id.startsWith('R39_PROSE_')&&k===R+':'+s.id.slice(10));
 const mutable=new Set(spec?[9,...(spec.type==='NARRATION'?[7]:[])]:legacy?[9,10]:[]);
 for(let c=0;c<original.length;c++)if(!mutable.has(c))assert.equal(row[c],original[c],k+' column '+c);
 check(true,'all non-display columns preserved '+k);
 if(spec){assert.equal(row[9],spec.text);assert.equal(row[7],spec.type==='NARRATION'?'이야기':spec.speaker);check(true,'visible text/speaker '+k);}
 if(legacy){assert.equal(row[10],legacy.text);check(row[13]===original[13],'legacy continuation');}
}
for(const s of scene)check(!/(?:FLAG_|NODE_ID|V146_|R39_|CHOICE_GROUP|코드|런타임|플래그|노드|데이터베이스|관계 회수)/.test(s.text),'no implementation terms');
const snap=JSON.stringify([...ix.nodes]);runtime.storyIndex();check(JSON.stringify([...ix.nodes])===snap,'idempotent');
const noLegacy=fixture(false);check(install(noLegacy).runtime.storyIndex()===noLegacy,'legacy rows optional');
for(const failure of ['missing','wrongQuest','wrongType','badLegacy']){
 const bad=fixture(),key=R+':'+scene[0].id;
 if(failure==='missing')bad.nodes.delete(key);
 if(failure==='wrongQuest')bad.nodes.get(key)[1]='DIFFERENT_QUEST';
 if(failure==='wrongType')bad.nodes.get(key)[5]='COMBAT_GATE';
 if(failure==='badLegacy')bad.nodes.get(R+':ISK_L01_K_003')[5]='EVENT';
 const snapshot=JSON.stringify([...bad.nodes]);assert.throws(()=>install(bad).runtime.storyIndex(),/mismatch/);
 check(JSON.stringify([...bad.nodes])===snapshot,'atomic validation '+failure);
}
const manuscript=fs.readFileSync(path.join(root,'docs/story-pro/WORK_002_01.md'),'utf8');
let pos=0;for(const s of scene){const found=manuscript.indexOf(s.text,pos);assert.ok(found>=pos);pos=found+s.text.length;}check(true,'manuscript matches source in authored order');
console.log(JSON.stringify({ok:true,checks,scope:'reconstructed installer fixture, not full-game/browser/deployment verification',screens:scene.length,addedNodes:0,textCharacters:scene.reduce((n,s)=>n+s.text.length,0)},null,2));
