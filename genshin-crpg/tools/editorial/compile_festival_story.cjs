#!/usr/bin/env node
'use strict';
// 0.16.67 축제 이야기 (user, 2026-10-18: 「스토리 관련은 전부 다 작업대가 필수야」): the festival stories are written in
// tools/editorial/festival_k/*.md and read in the story workbench like the main story. This turns them into
// source/app_feststory_v01667.js (window.CRPGFestivalStory), the words the festival window plays; the engine only records which part was
// seen (runtime_reading.js 0.16.67). The same items go to the workbench (tools/editorial/export_story_workbench.cjs).
//
//   node tools/editorial/compile_festival_story.cjs          # write the page file
//   node tools/editorial/compile_festival_story.cjs --check  # only check
//
// Manuscript (a part of the main story's syntax, tools/editorial/main_story_k/README.md):
//   # chain EVT_<FESTIVAL>_<ISK|TRV>_<n>   a part (n = 1, 2, 3)
//   # title <제목>                         its title
//   @map <MAP_ID>                          where the following lines happen (the picture behind them)
//   ## <장면>                              a scene
//   이야기: <text>                         narration
//   <이름>: <text>                         a line; 페이몬, 이세계인 and the game's characters by their names
//   ?? <text>                              the protagonist speaks (one) or chooses (several in a row, at the same indent);
//                                          the lines indented under an option are what follows it, then the story goes on
//   // comment
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..'),DIR=path.join(__dirname,'festival_k'),OUT=path.join(ROOT,'source/app_feststory_v01667.js');
const FESTIVALS=['XMAS','SEOLLAL','CHUSEOK'];
function parse(file){
 const lines=fs.readFileSync(file,'utf8').split(/\r?\n/),chains=[];let cur=null;
 const bad=(n,why)=>{throw new Error(path.basename(file)+':'+(n+1)+' '+why);};
 const body=[];
 const flush=()=>{if(!cur)return;cur.items=build(body.splice(0),cur);chains.push(cur);};
 for(let n=0;n<lines.length;n++){
  const raw=lines[n];if(!raw.trim()||/^\s*\/\//.test(raw))continue;
  let m;
  if((m=raw.match(/^# chain (EVT_([A-Z]+)_(ISK|TRV)_([1-9]))\s*$/))){flush();if(!FESTIVALS.includes(m[2]))bad(n,'unknown festival '+m[2]);cur={id:m[1],festival:m[2],route:m[3],part:Number(m[4]),title:'',map:null,file:path.basename(file)};continue;}
  if(!cur)bad(n,'text before the first # chain');
  if((m=raw.match(/^# title (.+)$/))){cur.title=m[1].trim();continue;}
  if(/^#\s/.test(raw)&&!/^##\s/.test(raw))bad(n,'unknown header');
  const indent=raw.match(/^ */)[0].length;if(indent%2)bad(n,'indent by two spaces');
  body.push({n,indent:indent/2,text:raw.trim(),file});
 }
 flush();return chains;
}
// lines → items, in the workbench's shape ({t:'scene'|'move'|'narr'|'line'|'say'|'choice'})
function build(rows,chain){
 let count=0,groups=0,map=null;const id=()=>chain.id+'_'+String(++count).padStart(3,'0');
 const bad=(r,why)=>{throw new Error(path.basename(r.file)+':'+(r.n+1)+' '+why);};
 function level(start,end,depth){
  const out=[];
  for(let i=start;i<end;){
   const r=rows[i];if(r.indent!==depth)bad(r,'unexpected indent');
   if(r.text.startsWith('?? ')){
    const opts=[];
    while(i<end&&rows[i].indent===depth&&rows[i].text.startsWith('?? ')){
     const head=rows[i];let j=i+1;while(j<end&&rows[j].indent>depth)j++;
     const label=head.text.slice(3).trim();if(!label)bad(head,'empty option');
     opts.push({id:id(),label,items:level(i+1,j,depth+1)});i=j;
    }
    if(opts.length===1&&!opts[0].items.length)out.push({id:opts[0].id,t:'say',who:'주인공',text:opts[0].label});
    else if(opts.length===1){out.push({id:opts[0].id,t:'say',who:'주인공',text:opts[0].label});out.push(...opts[0].items);}
    else out.push({t:'choice',group:chain.id+'_C'+(++groups),opts});
    continue;
   }
   i++;let m;
   if((m=r.text.match(/^@map (MAP_[A-Z0-9_]+)$/))){if(!chain.map&&!out.length&&depth===0&&!map){chain.map=m[1];map=m[1];}else if(m[1]!==map){out.push({t:'move',fromId:map,toId:m[1]});map=m[1];}continue;}
   if((m=r.text.match(/^## (.+)$/))){out.push({t:'scene',name:m[1].trim()});continue;}
   if((m=r.text.match(/^이야기:\s*(.+)$/))){out.push({id:id(),t:'narr',who:'',text:m[1].trim()});continue;}
   if((m=r.text.match(/^([^:：]{1,16}):\s*(.+)$/))){if(m[1]==='나'||m[1]==='주인공')bad(r,'the protagonist speaks with ??');out.push({id:id(),t:'line',who:m[1].trim(),text:m[2].trim()});continue;}
   bad(r,'unknown line: '+r.text);
  }
  return out;
 }
 const items=level(0,rows.length,0);if(!chain.map)throw new Error(chain.id+' has no @map before its first line');
 if(!chain.title)throw new Error(chain.id+' has no # title');return items;
}
function compile(){
 const chains=[];for(const f of fs.readdirSync(DIR).filter(f=>f.endsWith('.md')&&f!=='README.md').sort())chains.push(...parse(path.join(DIR,f)));
 const ids=new Set();for(const c of chains){if(ids.has(c.id))throw new Error('two chains '+c.id);ids.add(c.id);}
 // every festival with a story has parts 1–3 on both routes
 for(const fest of new Set(chains.map(c=>c.festival)))for(const route of ['ISK','TRV'])for(const part of [1,2,3])if(!ids.has('EVT_'+fest+'_'+route+'_'+part))throw new Error('missing EVT_'+fest+'_'+route+'_'+part);
 return chains;
}
module.exports={compile};
if(require.main===module){
 const chains=compile(),lines=c=>JSON.stringify(c.items).split('"id":').length-1;
 const data={version:1,chains:Object.fromEntries(chains.map(c=>[c.id,{festival:c.festival,route:c.route,part:c.part,title:c.title,map:c.map,items:c.items}]))};
 const text='/* 0.16.67 축제 이야기 — made by tools/editorial/compile_festival_story.cjs from tools/editorial/festival_k/*.md. Do not edit here:\n * edit the manuscripts (the story workbench), then run the tool. */\nwindow.CRPGFestivalStory='+JSON.stringify(data)+';\n';
 if(process.argv.includes('--check')){const now=fs.existsSync(OUT)?fs.readFileSync(OUT,'utf8'):'';if(now!==text){console.error('source/app_feststory_v01667.js is not up to date: node tools/editorial/compile_festival_story.cjs');process.exit(1);}}
 else fs.writeFileSync(OUT,text);
 console.log(JSON.stringify({chains:chains.length,lines:chains.reduce((n,c)=>n+lines(c),0),parts:chains.map(c=>c.id+'('+lines(c)+')').join(' ')}));
}
