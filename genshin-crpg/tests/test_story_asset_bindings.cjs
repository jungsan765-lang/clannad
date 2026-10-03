'use strict';
// Existing story art only: no prose, conditions, rewards or first-contact changes.
const assert=require('node:assert/strict'),vm=require('node:vm');
const {fresh,fs,path,root,db,R}=require('./helpers_v011.cjs');
const ozIds=['LEG_MOND_FISCHL_N004','LEG_MOND_FISCHL_N011','LEG_MOND_FISCHL_N022','LEG_MOND_FISCHL_N025','LEG_MOND_FISCHL_N035','LEG_MOND_FISCHL_N042','LEG_MOND_FISCHL_N051','LEG_ISK_MOND_FISCHL_V143_INTRO_01','LEG_ISK_MOND_FISCHL_V143_FIRST_01','LEG_ISK_MOND_FISCHL_V143_FIRST_03','LEG_ISK_MOND_FISCHL_V143_AGAIN_01','LEG_ISK_MOND_FISCHL_V143_FIELD_01','LEG_ISK_MOND_FISCHL_V143_FIELD_04','LEG_ISK_MOND_FISCHL_V143_FIELD_05B_R_01','LEG_ISK_MOND_FISCHL_V143_FIELD_07','LEG_ISK_MOND_FISCHL_V143_AFTER_00','LEG_ISK_MOND_FISCHL_V143_JOIN_01','LEG_MOND_FISCHL_V143_FIRST_01','LEG_MOND_FISCHL_V143_AGAIN_01'];
const xianglingIds=['LEG_LIYUE_SHENHE_WORK04','LEG_LIYUE_SHENHE_MID04','LEG_LIYUE_SHENHE_B2_R','LEG_LIYUE_SHENHE_RES04','AFF_LIYUE_SHENHE_H01_C2_R'];
const game=fresh();game.installMarketContent();
const index=game.storyIndex(),nodes=[...index.nodes.values()];
assert(index.nodes.size>=25617,'full effective story graph, including later approved scenes');
assert.deepEqual(JSON.parse(JSON.stringify(index.mainStoryK.failed)),[],'main-story composition succeeds');
// Compare the complete final graph with the same runtime minus this one patch.
// The source DB remains upstream-owned; the renderer consumes effective rows.
const baselineContext=vm.createContext({console,setTimeout,clearTimeout});
const portraitMarker='/* v0.15.14 existing story portraits: explicit audited rows, no name inference. */';
for(const [,file] of fs.readFileSync(path.join(root,'source/index.html'),'utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)){
 let source=fs.readFileSync(path.join(root,'source',file),'utf8');
 if(file==='runtime_quality_fixes.js'){const at=source.indexOf(portraitMarker);assert(at>=0);source=source.slice(0,at);}
 vm.runInContext(source,baselineContext,{filename:file});
}
const baselineGame=new baselineContext.CRPGRuntime.Runtime(db);
baselineGame.newGame({name:'클라나드',route:'ROUTE_TRAVELER',seed:71247,saveId:'ASSET-BASELINE'});
baselineGame.installMarketContent();
const baselineIndex=baselineGame.storyIndex(),cellDiff=[];
assert.deepEqual([...index.nodes.keys()].sort(),[...baselineIndex.nodes.keys()].sort(),'no graph nodes added or removed');
for(const [key,row] of index.nodes){
 const original=baselineIndex.nodes.get(key);assert.equal(row.length,original.length);
 for(let column=0;column<row.length;column++)if(JSON.stringify(row[column])!==JSON.stringify(original[column]))cellDiff.push([row[4],column,original[column],row[column]]);
}
const expected=[...ozIds.map(id=>[id,6,'','ENTITY_OZ']),...xianglingIds.map(id=>[id,15,'','ASSET_RIWAL_HR_1'])];
assert.deepEqual(cellDiff.sort((a,b)=>a[0].localeCompare(b[0])),expected.sort((a,b)=>a[0].localeCompare(b[0])),'only the 24 approved bindings differ');
assert.equal(game.storyIndex(),index,'cached index stays stable');
console.log('PASS complete '+index.nodes.size+'-node graph: exactly 24 binding cells differ; all other prose, costs, effects, connections and portraits unchanged');
const targets=[...ozIds,...xianglingIds].map(id=>{const rows=nodes.filter(r=>r[4]===id);assert.equal(rows.length,1,id);return rows[0];});
const manifest=JSON.parse(fs.readFileSync(path.join(root,'content/asset-manifest.json'),'utf8'));
const assets=Object.fromEntries(Object.entries(manifest.assets).filter(([,a])=>a.content_rating==='GENERAL').map(([id,a])=>[id,{url:'assets/'+a.file_name.replace(/\.[^.]+$/,'.webp')}]));
const files=Object.fromEntries(Object.values(manifest.assets).filter(a=>a.content_rating==='GENERAL').map(a=>[a.file_name,'assets/'+a.file_name.replace(/\.[^.]+$/,'.webp')]));
class Node{
 constructor(tag,cls='',text=''){this.tag=tag;this.className=cls;this.text=text;this.children=[];this.classList={add:x=>{this.className+=' '+x;}};}
 append(...nodes){this.children.push(...nodes);}
 setAttribute(k,v){this[k]=v;}
}
const el=(...args)=>new Node(...args),walk=n=>[n,...n.children.filter(x=>x instanceof Node).flatMap(walk)];
const ctx=vm.createContext({game,showArt:true,MANIFEST:{assets},ASSETS:files,el,displayText:x=>String(x??''),button:(s)=>el('button','',s),actions:(p,buttons)=>p.append(...buttons),displayHistory(){},act(){},appendChoices(){}});
const app=fs.readFileSync(path.join(root,'source/app.js'),'utf8');
for(const fn of ['assetPath','portraitFor','enemyPortraitFor'])vm.runInContext(app.split('\n').find(line=>line.startsWith('function '+fn+'(')),ctx);
vm.runInContext(app.split('\n').find(line=>line.startsWith('story=function(p,v){const n=v.node;')),ctx);
function render(row,showArt=true){ctx.showArt=showArt;ctx.row=row;ctx.parent=el('section');vm.runInContext('story(parent,{node:row,choices:[]})',ctx);return walk(ctx.parent);}
const saveBefore=game.serialize();
for(const row of targets){
 const oz=ozIds.includes(row[4]),old=row.slice(),column=oz?6:15;
 assert.equal(row[5],'DIALOGUE');assert.equal(row[18],'ACTIVE');
 assert.equal(row[7],oz?'오즈':'향릉');
 assert.equal(row[column],oz?'ENTITY_OZ':'ASSET_RIWAL_HR_1');
 if(!oz)assert(!row[6],'Xiangling art must not create a PROFILE first contact');
 old[column]='';
 const before=render(old),after=render(row);
 assert.equal(before.filter(n=>n.tag==='img').length,0,row[4]+': reproduce missing portrait');
 const images=after.filter(n=>n.tag==='img');assert.equal(images.length,1,row[4]);
 assert.equal(images[0].src,oz?'assets/summons/summon_oz.webp':'assets/riwal_hr_1.webp');
 assert(fs.existsSync(path.join(root,images[0].src)),row[4]+': image shipped');
 assert.equal(after.find(n=>n.className==='story').text,before.find(n=>n.className==='story').text,'prose unchanged');
 assert.deepEqual(after.filter(n=>n.tag==='button').map(n=>n.text),before.filter(n=>n.tag==='button').map(n=>n.text),'controls unchanged');
 assert.equal(render(row,false).filter(n=>n.tag==='img').length,0,'art setting respected');
}
assert.equal(game.serialize(),saveBefore,'rendering does not alter any save field');
console.log('PASS 24 effective story nodes: existing images rendered, original prose and controls retained, art setting respected');

// Resolve the same original/patched dialogue from identical state. Keep the
// next node boundary fixed so this measures the edited row, not later scenes.
for(const row of targets){
 const old=row.slice();old[ozIds.includes(row[4])?6:15]='';
 function resolve(candidate){
  const g=new R(db,JSON.parse(saveBefore));
  Object.assign(g.s.global,{STORY_ROUTE_ID:candidate[0],CURRENT_STORY_NODE_ID:candidate[4],STORY_CURSOR_NODE_ID:candidate[4],SCREEN_MODE:'STORY'});
  delete g.s.storyContext;delete g.s.storyJourney;delete g.s.storyBreak;
  g.storyNode=()=>candidate;g.prepareStory=()=>{};
  g.markContact=()=>{assert.fail('art-only binding must not create a contact');};
  const out=g.storyNext(candidate[4]);return {out:JSON.parse(JSON.stringify(out)),state:JSON.parse(JSON.stringify(g.s))};
 }
 assert.deepEqual(resolve(row),resolve(old),row[4]+': progress/effects/relations identical');
}
console.log('PASS 24 dialogue resolution comparisons: cursor, effects and relationship state unchanged');

// A missing anonymous NPC picture remains unbound; no broad name guessing.
const anonymous=nodes.find(r=>r[5]==='DIALOGUE'&&!r[6]&&r[7]==='짐꾼'&&!r[15]);
assert(anonymous);assert.equal(render(anonymous).filter(n=>n.tag==='img').length,0);
const unknown=targets[0].slice();unknown[6]='ENTITY_UNVERIFIED';unknown[7]='미등록 인물';unknown[15]='';
assert.equal(render(unknown).filter(n=>n.tag==='img').length,0);
console.log('PASS unknown and anonymous speakers are not assigned unrelated art');
