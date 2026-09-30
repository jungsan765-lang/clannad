import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=fs.existsSync(path.join(dir,'../source/runtime_local_story.js'))?path.join(dir,'..'):dir;
const source=fs.readFileSync(fs.existsSync(path.join(root,'source/runtime_local_story.js'))?path.join(root,'source/runtime_local_story.js'):path.join(root,'runtime_local_story.js'),'utf8');
const marker='/* Main story manuscript 001.01, v0.14.6.';
assert.equal(source.split(marker).length,2,'one manuscript installer');
const patch=marker+source.split(marker)[1];
const scene=JSON.parse(patch.match(/const SCENE=(\[[\s\S]*?\]);\nconst ALIASES=/)[1]);
const R='ROUTE_ISEKAI',Q='Q_ISK_LIYUE_03',S='K2_VANISHED';
const condition='ROUTE_ID=ROUTE_ISEKAI AND FLAG_ISK_META_KNOWLEDGE=KNOWN AND FLAG_ISK_L01_LEAF=K2 AND FLAG_ISK_L02_LEAF=K2 AND FLAG_ISK_L03_STARTED=TRUE AND FLAG_ISK_L03_LEAF=K2 AND ACTIVE_STORY_QUEST=Q_ISK_LIYUE_03 AND FLAG_ISK_L03_CONTENT_GATE=FALSE';
const originals=scene.filter(s=>!s.id.startsWith('V146_'));
function fixture(){
 const all=originals.map((s,i)=>[R,Q,'LIYUE',S,s.id,s.type,s.profile||'',s.type==='NARRATION'?'나':s.speaker,'MAP_LIYUE_HARBOR','old text','',''+condition,'',originals[i+1]?.id||'CHOICE_GROUP:G_ISK_L03_K2_027','','ASSET_TEST','CRPG_ADAPTATION',i+19,'READY','']);
 for(const suffix of ['020','022','025']){
  const c=all.find(r=>r[4]==='R39_PROSE_ISK_L03_K2_'+suffix),r=c.slice();r[4]='ISK_L03_K2_'+suffix;r[5]='CHOICE';r[9]='';r[10]='old label';r[14]='G_ISK_L03_K2_'+suffix;all.push(r);
 }
 all.push([R,Q,'LIYUE','OTHER','OUTSIDE','DIALOGUE','PROFILE_LIYUE_KEQING','각청','MAP_LIYUE_HARBOR','원래 대사','','','KEEP','EXIT','','NONE','',999,'READY','']);
 all.push(['ROUTE_TRAVELER',Q,'LIYUE',S,'ISK_L03_K2_019','NARRATION','','','','여행자 대사','','','','EXIT']);
 return {nodes:new Map(all.map(r=>[r[0]+':'+r[4],r])),byTable:{'55_MAIN_STORY_DB':all}};
}
function install(ix){class Runtime{storyIndex(){return ix;}}const context={CRPGRuntime:{Runtime},WeakSet,Map};vm.runInNewContext(patch,context);return new Runtime();}
let checks=0;
const ix=fixture(),before=new Map([...ix.nodes].map(([k,r])=>[k,r.slice()])),runtime=install(ix);
assert.equal(runtime.storyIndex(),ix);checks++;
assert.equal(ix.nodes.size,before.size+14);checks++;
const seen=[],get=id=>ix.nodes.get(R+':'+id);let id='ISK_L03_K2_019';
while(!id.startsWith('CHOICE_GROUP:')){assert.ok(!seen.includes(id),'no cycle');seen.push(id);const row=get(id);assert.ok(row,'resolved link '+id);id=row[13];}
assert.deepEqual(seen,scene.map(s=>s.id));checks++;
assert.equal(id,'CHOICE_GROUP:G_ISK_L03_K2_027');checks++;
for(const s of scene){const r=get(s.id);assert.equal(r[9],s.text);assert.equal(r[5],s.type);assert.equal(r[11],condition);assert.equal(r[12],'');if(s.type==='DIALOGUE')assert.equal(r[7],s.speaker);assert.ok(!/(?:FLAG_|NODE_ID|ROUTE_|V146_|R39_|CHOICE_GROUP|[A-Z]+_[A-Z0-9_]+|코드|노드|런타임|플래그|데이터베이스|구현|관계 회수)/.test(r[9]));checks++;}
for(const [k,old]of before){const now=ix.nodes.get(k);assert.ok(now);for(const col of [0,1,2,3,4,5,6,8,11,12,14,15,16,17,18,19])assert.equal(now[col],old[col]);assert.equal(now[7],old[5]==='NARRATION'?'이야기':old[7]);checks++;}
for(const suffix of ['020','022','025']){const legacy=get('ISK_L03_K2_'+suffix),canonical=get('R39_PROSE_ISK_L03_K2_'+suffix);assert.equal(legacy[10],canonical[9]);assert.equal(legacy[13],canonical[13]);let cursor=legacy[13],limit=0;while(!cursor.startsWith('CHOICE_GROUP:')){assert.ok(limit++<30);cursor=get(cursor)[13];}assert.equal(cursor,id);checks++;}
assert.deepEqual(ix.nodes.get(R+':OUTSIDE'),before.get(R+':OUTSIDE'));const travelerExpected=before.get('ROUTE_TRAVELER:ISK_L03_K2_019').slice();travelerExpected[7]='이야기';assert.deepEqual(ix.nodes.get('ROUTE_TRAVELER:ISK_L03_K2_019'),travelerExpected);checks++;
const saved=JSON.stringify([...ix.nodes]),size=ix.nodes.size;runtime.storyIndex();assert.equal(ix.nodes.size,size);assert.equal(JSON.stringify([...ix.nodes]),saved);checks++;
const bad=fixture();bad.nodes.delete(R+':ISK_L03_K2_024');const badBefore=JSON.stringify([...bad.nodes]);assert.throws(()=>install(bad).storyIndex(),/anchor mismatch/);assert.equal(JSON.stringify([...bad.nodes]),badBefore);checks++;
const collision=fixture();collision.nodes.set(R+':V146_M00101_001',[]);const collisionBefore=JSON.stringify([...collision.nodes]);assert.throws(()=>install(collision).storyIndex(),/duplicate/);assert.equal(JSON.stringify([...collision.nodes]),collisionBefore);checks++;
const changed=fixture();changed.nodes.get(R+':ISK_L03_K2_026')[12]='NEW_EFFECT';assert.throws(()=>install(changed).storyIndex(),/anchor mismatch/);checks++;
// Both existing and added narration rows use 이야기; protagonist dialogue is unchanged.
for(const row of ix.nodes.values())if(row[5]==='NARRATION')assert.equal(row[7],'이야기');checks++;
for(const s of scene.filter(s=>s.type==='NARRATION')){assert.equal(s.speaker,'이야기');assert.ok(!/(?:^|[.!?]\s+|\n)나는\s/.test(s.text));}checks++;
assert.ok(scene.some(s=>s.type==='NARRATION'&&/내가|내 쪽|내 얼굴/.test(s.text)),'first-person relational wording is retained');checks++;
assert.ok(scene.some(s=>s.type==='DIALOGUE'&&s.speaker==='{PLAYER_NAME}'&&s.text.startsWith('내가 여기')),'spoken protagonist remains intact');checks++;
console.log(JSON.stringify({ok:true,checks,scope:'focused installer and graph checks on reconstructed anchor fixture; not a full game/browser/deployment test',screens:scene.length,addedNodes:14,exit:id},null,2));
