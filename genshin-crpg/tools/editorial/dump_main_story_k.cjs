#!/usr/bin/env node
'use strict';
// Print an installed K-route chain in play order for proofreading:
//   node tools/editorial/dump_main_story_k.cjs ISK_L01_K [out.txt]
const path=require('path'),root=path.resolve(__dirname,'../..');
const {fs,fresh}=require(root+'/tests/helpers_v011.cjs');
const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI'),ix=r.storyIndex(),ROUTE='ROUTE_ISEKAI';
const content=require(root+'/tools/editorial/compile_main_story_k.cjs').compile();
const chain=content.chains.find(c=>c.id===process.argv[2])||content.chains[0];
const get=id=>ix.nodes.get(ROUTE+':'+id),groups=new Map();
for(const x of ix.byTable['55_MAIN_STORY_DB'])if(x[0]===ROUTE&&x[5]==='CHOICE'&&x[14]){if(!groups.has(x[14]))groups.set(x[14],[]);groups.get(x[14]).push(x);}
const out=[],seen=new Set();
function visit(id,depth){
 const pad='  '.repeat(depth);
 if(!id)return;if(id.startsWith('SCREEN:')){out.push(pad+'-> '+id);return;}
 if(id.startsWith('CHOICE_GROUP:')){const g=id.slice(13);if(seen.has(id))return;seen.add(id);const opts=groups.get(g)||[];out.push(`${pad}<선택 ${g}>`);for(const c of opts){out.push(`${pad} ? [${c[4]}] ${c[10]}${c[12]?'  FX='+c[12]:''}`);visit(c[13],depth+1);}return;}
 if(seen.has(id)){out.push(pad+'(합류 → '+id+')');return;}seen.add(id);
 const row=get(id);if(!row){out.push(pad+'!! missing '+id);return;}
 const who=row[5]==='NARRATION'?'이야기':row[5]==='DIALOGUE'?row[7]:row[5];
 const meta=[row[12]?'FX='+row[12]:'',row[8]?'@'+row[8]:'',/BOND\(/.test(row[11])?'COND='+row[11].split(' AND ').pop():''].filter(Boolean).join('  ');
 out.push(`${pad}[${row[4]}] ${who}${meta?'  '+meta:''}`);
 if(row[9])out.push(`${pad}    ${row[9]}`);
 visit(row[13],depth);
}
visit(chain.entry,0);
const text=out.join('\n');
if(process.argv[3])fs.writeFileSync(process.argv[3],text);else console.log(text);
