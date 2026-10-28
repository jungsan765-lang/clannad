import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'source/runtime_reading.js'),'utf8');
const story=fs.readFileSync(path.join(root,'source/runtime_local_story.js'),'utf8');
const original=source.split('\n/* Authored speech variants')[0];
const bytes=Buffer.from(original);
assert.equal(crypto.createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex'),'327876af42a32c9701ac2cbda60245e61ca922c0');
const scene=JSON.parse(story.split('/* Main story manuscript 002.01, v0.14.6.')[1].match(/const SCENE=(\[[\s\S]*?\]);/)[1]);
const alternate=JSON.parse(source.match(/const FAMILIAR=Object.freeze\((\{[^\n]+\})\);/)[1]);
const PROFILE='PROFILE_MOND_JEAN',R='ROUTE_ISEKAI',Q='Q_ISK_LIYUE_01';
class Runtime{
 constructor(){this.s={global:{STORY_ROUTE_ID:R},relations:{},flags:{sentinel:true}};}
 storyNode(){return this.current;}
 storyBond(profile){const r=this.s.relations[profile];return Number(r?.BOND_SCORE??r?.bondScore??((r?.heart||0)*20));}
 storyDisplayText(row){if(row?.invalid)throw Error('previous validation');return row?.[9]||'';}
}
const context={CRPGRuntime:{Runtime}};vm.runInNewContext(source,context);
const rows=scene.map(x=>[R,Q,'ARC','SCENE',x.id,x.type,x.profile,x.speaker,'MAP',x.text]);
let checks=1;
function verify(bond,expected){
 const r=new Runtime();r.s.relations[PROFILE]=bond;r.current=rows[0];
 const before=JSON.stringify(r.s),all=JSON.stringify(rows);
 for(const row of rows){
  assert.equal(r.storyDisplayText(row),expected&&alternate[row[4]]?alternate[row[4]]:row[9]);checks++;
 }
 assert.equal(JSON.stringify(r.s),before);assert.equal(JSON.stringify(rows),all);checks++;
 assert.equal(r.storyDisplayText(),expected?alternate[rows[0][4]]:rows[0][9]);checks++;
}
for(const [score,familiar]of [[0,false],[59,false],[60,true],[100,true],[-1,false],['60',true],['bad',false],[Infinity,false]])verify({BOND_SCORE:score},familiar);
verify(undefined,false);verify({bondScore:60},true);verify({heart:3},true);verify({BOND_SCORE:0,bondScore:60},false);
const r=new Runtime();r.s.relations[PROFILE]={BOND_SCORE:60};
for(const [col,value]of [[0,'ROUTE_TRAVELER'],[1,'Q_OTHER'],[4,'OTHER'],[5,'NARRATION'],[6,'PROFILE_LIYUE_KEQING']]){
 const row=rows[0].slice();row[col]=value;assert.equal(r.storyDisplayText(row),row[9]);checks++;
}
r.s.storyContext={entry:'PERSONAL'};assert.equal(r.storyDisplayText(rows[0]),rows[0][9]);checks++;delete r.s.storyContext;
r.s.global.STORY_ROUTE_ID='ROUTE_TRAVELER';assert.equal(r.storyDisplayText(rows[0]),rows[0][9]);checks++;r.s.global.STORY_ROUTE_ID=R;
const second=new Runtime();assert.equal(second.storyDisplayText(rows[0]),rows[0][9]);assert.equal(r.storyDisplayText(rows[0]),alternate[rows[0][4]]);checks++;
const invalid=rows[0].slice();invalid.invalid=true;assert.throws(()=>r.storyDisplayText(invalid),/previous validation/);checks++;
const method=Runtime.prototype.storyDisplayText;vm.runInNewContext(source,context);assert.equal(Runtime.prototype.storyDisplayText,method);checks++;
assert.equal(context.CRPGRuntime.mainStorySpeechPolicy.bondMin,60);assert.equal(Object.keys(alternate).length,6);checks++;
const basic=fs.readFileSync(path.join(root,'docs/story-pro/WORK_002_01.md'),'utf8');
const familiar=fs.readFileSync(path.join(root,'docs/story-pro/WORK_002_01_FAMILIAR.md'),'utf8');
let a=0,b=0;
for(const row of scene){
 const x=basic.indexOf(row.text,a),t=alternate[row.id]||row.text,y=familiar.indexOf(t,b);
 assert.ok(x>=a);assert.ok(y>=b);a=x+row.text.length;b=y+t.length;
 assert.ok(!/(?:FLAG_|NODE_ID|CHOICE_GROUP|플래그|런타임)/.test(t));checks++;
}
console.log(JSON.stringify({ok:true,checks,scope:'reconstructed runtime display fixture; shared-state isolation and unchanged reading implementation; not full-game/browser/deployment',profile:PROFILE,bondMin:60,variantLines:6},null,2));
