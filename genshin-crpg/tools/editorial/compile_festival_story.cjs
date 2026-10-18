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
//   # chain EVT_<FESTIVAL>_<ISK|TRV>_1     part 1, one for each route: the same meeting seen from both sides
//   # chain EVT_<FESTIVAL>_<n>             parts 2–4, the same on both routes (user: 「중간부터는 아예 같은 길로 가게」)
//   # title <제목>                         its title
//   @map <MAP_ID>                          where the following lines happen (the picture behind them)
//   ## <장면>                              a scene
//   이야기: <text>                         narration
//   <이름>: <text>                         a line; 페이몬, 이세계인, 여행자 and the game's characters by their names
//   ?? <text>                              the player speaks (one) or chooses (several in a row, at the same indent);
//                                          the lines indented under an option are what follows it, then the story goes on
//   @for isk | @for trv | @for all         (parts 2–4) the following lines are only on that route, or on both again
//   @know | @unknown | @any                (이세계인 part 1) only when the protagonist knows Genshin (몬드를 앎), does not, or both
//   이세계인: / 여행자:                     (parts 2–4) the two protagonists: on their own route the line is the player's
//   {이세계인}                              (parts 2–4) the protagonist's name on 이세계인's route, 「이세계인」 on the traveler's
//   // comment
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..'),DIR=path.join(__dirname,'festival_k'),OUT=path.join(ROOT,'source/app_feststory_v01667.js');
const FESTIVALS=['XMAS','SEOLLAL','CHUSEOK'];
const where=r=>path.basename(r.file)+':'+(r.n+1);
function parse(file){
 const lines=fs.readFileSync(file,'utf8').split(/\r?\n/),chains=[],body=[];let cur=null,state={route:null,know:null};
 const bad=(n,why)=>{throw new Error(path.basename(file)+':'+(n+1)+' '+why);};
 const flush=()=>{if(!cur)return;cur.items=build(body.splice(0),cur);chains.push(cur);};
 for(let n=0;n<lines.length;n++){
  const raw=lines[n];if(!raw.trim()||/^\s*\/\//.test(raw))continue;
  let m;
  if((m=raw.match(/^# chain (EVT_([A-Z]+)_(?:(ISK|TRV)_)?([1-9]))\s*$/))){
   flush();if(!FESTIVALS.includes(m[2]))bad(n,'unknown festival '+m[2]);const part=Number(m[4]);
   if((part===1)!==!!m[3])bad(n,'part 1 is per route (EVT_X_ISK_1 / EVT_X_TRV_1), parts 2–4 are shared (EVT_X_2)');
   cur={id:m[1],festival:m[2],route:m[3]||'ALL',part,title:'',map:null,file:path.basename(file)};state={route:null,know:null};continue;}
  if(!cur)bad(n,'text before the first # chain');
  if((m=raw.match(/^# title (.+)$/))){cur.title=m[1].trim();continue;}
  if(/^#\s/.test(raw)&&!/^##\s/.test(raw))bad(n,'unknown header');
  const t=raw.trim();
  if((m=t.match(/^@for (isk|trv|all)$/))){if(cur.route!=='ALL')bad(n,'@for only in the shared parts');state.route=m[1]==='all'?null:m[1].toUpperCase();continue;}
  if((m=t.match(/^@(know|unknown|any)$/))){if(cur.route!=='ISK')bad(n,'@know/@unknown only in 이세계인 part 1');state.know=m[1]==='any'?null:m[1]==='know'?'KNOWN':'UNKNOWN';continue;}
  const indent=raw.match(/^ */)[0].length;if(indent%2)bad(n,'indent by two spaces');
  body.push({n,indent:indent/2,text:t,file,route:state.route,know:state.know});
 }
 flush();return chains;
}
// lines → items, in the workbench's shape ({t:'scene'|'move'|'narr'|'line'|'say'|'choice'}); a line kept to one route or to one
// 이세계인 carries route / know
function build(rows,chain){
 let count=0,groups=0,map=null;const id=()=>chain.id+'_'+String(++count).padStart(3,'0');
 const bad=(r,why)=>{throw new Error(where(r)+' '+why);};
 const tag=(x,r)=>{if(r.route)x.route=r.route;if(r.know)x.know=r.know;if(chain.route!=='ALL'&&/\{이세계인\}/.test(x.text||x.label||''))bad(r,'{이세계인} only in the shared parts');return x;};
 function level(start,end,depth){
  const out=[];
  for(let i=start;i<end;){
   const r=rows[i];if(r.indent!==depth)bad(r,'unexpected indent');
   if(r.text.startsWith('?? ')){
    const opts=[],head=r;
    // a choice is the options in a row on one route (a @know / @for line between them starts another)
    while(i<end&&rows[i].indent===depth&&rows[i].text.startsWith('?? ')&&rows[i].route===head.route&&rows[i].know===head.know){
     const o=rows[i];let j=i+1;while(j<end&&rows[j].indent>depth)j++;
     const label=o.text.slice(3).trim();if(!label)bad(o,'empty option');
     opts.push(tag({id:id(),label,items:level(i+1,j,depth+1)},o));i=j;
    }
    const mark=x=>tag(x,head);
    if(opts.length===1){out.push(mark({id:opts[0].id,t:'say',who:'주인공',text:opts[0].label}));out.push(...opts[0].items);}
    else out.push(mark({t:'choice',group:chain.id+'_C'+(++groups),opts}));
    continue;
   }
   i++;let m;
   if((m=r.text.match(/^@map (MAP_[A-Z0-9_]+)$/))){if(!chain.map&&!out.length&&depth===0&&!map&&!r.route){chain.map=m[1];map=m[1];}else if(m[1]!==map){out.push(tag({t:'move',fromId:map,toId:m[1]},r));map=m[1];}continue;}
   if((m=r.text.match(/^## (.+)$/))){out.push(tag({t:'scene',name:m[1].trim()},r));continue;}
   if((m=r.text.match(/^이야기:\s*(.+)$/))){out.push(tag({id:id(),t:'narr',who:'',text:m[1].trim()},r));continue;}
   if((m=r.text.match(/^([^:：]{1,16}):\s*(.+)$/))){
    const who=m[1].trim();if(who==='나'||who==='주인공')bad(r,'the protagonist speaks with ??');
    if(chain.route==='ISK'&&who==='이세계인'||chain.route==='TRV'&&who==='여행자')bad(r,'on this route '+who+' is the player: use ??');
    out.push(tag({id:id(),t:'line',who,text:m[2].trim()},r));continue;}
   bad(r,'unknown line: '+r.text);
  }
  return out;
 }
 const items=level(0,rows.length,0);if(!chain.map)throw new Error(chain.id+' has no @map before its first line');
 if(!chain.title)throw new Error(chain.id+' has no # title');return items;
}
// 0.16.68 축제 대사 (festival_k/talk.md): `# talk <KEY>` and its lines (이름: / 이야기: / ??) — the festival window's host, the travel
// tasks' short talks, the 윷놀이 friend, the songpyeon orders and the snowball calls (user: 「이벤트 퀄리티좀 높여봐. 좀 재밌게」).
function parseTalk(file){
 const lines=fs.readFileSync(file,'utf8').split(/\r?\n/),talk={};let key=null,n=0;
 const bad=(i,why)=>{throw new Error(path.basename(file)+':'+(i+1)+' '+why);};
 lines.forEach((raw,i)=>{const t=raw.trim();if(!t||t.startsWith('//'))return;let m;
  if((m=t.match(/^# talk ([A-Z0-9_]+)$/))){key=m[1];if(talk[key])bad(i,'two talks '+key);talk[key]=[];n=0;return;}
  if(!key)bad(i,'text before the first # talk');const id=()=>'TALK_'+key+'_'+String(++n).padStart(2,'0');
  if((m=t.match(/^\?\? (.+)$/))){talk[key].push({id:id(),t:'say',who:'주인공',text:m[1].trim()});return;}
  if((m=t.match(/^이야기:\s*(.+)$/))){talk[key].push({id:id(),t:'narr',who:'',text:m[1].trim()});return;}
  if((m=t.match(/^([^:：]{1,16}):\s*(.+)$/))){talk[key].push({id:id(),t:'line',who:m[1].trim(),text:m[2].trim()});return;}
  bad(i,'unknown line: '+t);});
 return talk;
}
function compileTalk(){const f=path.join(DIR,'talk.md');return fs.existsSync(f)?parseTalk(f):{};}
function compile(){
 const chains=[];for(const f of fs.readdirSync(DIR).filter(f=>f.endsWith('.md')&&f!=='README.md'&&f!=='talk.md').sort())chains.push(...parse(path.join(DIR,f)));
 const ids=new Set();for(const c of chains){if(ids.has(c.id))throw new Error('two chains '+c.id);ids.add(c.id);}
 // every festival with a story: part 1 for each route, parts 2–4 shared
 for(const fest of new Set(chains.map(c=>c.festival)))for(const id of ['EVT_'+fest+'_ISK_1','EVT_'+fest+'_TRV_1','EVT_'+fest+'_2','EVT_'+fest+'_3','EVT_'+fest+'_4'])if(!ids.has(id))throw new Error('missing '+id);
 return chains;
}
module.exports={compile,compileTalk};
if(require.main===module){
 const chains=compile(),talk=compileTalk(),lines=c=>JSON.stringify(c.items).split('"id":').length-1;
 const data={version:3,chains:Object.fromEntries(chains.map(c=>[c.id,{festival:c.festival,route:c.route,part:c.part,title:c.title,map:c.map,items:c.items}])),talk};
 const text='/* 0.16.67 축제 이야기 — made by tools/editorial/compile_festival_story.cjs from tools/editorial/festival_k/*.md. Do not edit here:\n * edit the manuscripts (the story workbench), then run the tool. */\nwindow.CRPGFestivalStory='+JSON.stringify(data)+';\n';
 if(process.argv.includes('--check')){const now=fs.existsSync(OUT)?fs.readFileSync(OUT,'utf8'):'';if(now!==text){console.error('source/app_feststory_v01667.js is not up to date: node tools/editorial/compile_festival_story.cjs');process.exit(1);}}
 else fs.writeFileSync(OUT,text);
 console.log(JSON.stringify({chains:chains.length,lines:chains.reduce((n,c)=>n+lines(c),0),parts:chains.map(c=>c.id+'('+lines(c)+')').join(' ')}));
}
