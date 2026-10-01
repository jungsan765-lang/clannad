#!/usr/bin/env node
'use strict';
// Compile the K-route main story manuscripts (tools/editorial/main_story_k/*.md)
// into source/runtime_main_story_k_content.js. The runtime installer
// (source/runtime_main_story_k.js) wires the compiled chains into the story
// index at load time; content/db.json is not modified.
//
// Manuscript syntax (one item per line):
//   # chain <CHAIN_ID>            start a chain (first line of the file)
//   # entry <NODE_ID>             existing story node the chain starts from
//   # pre <EXPR> | # pre -        base precondition of every new row (default: the most common one among the chain's old prose rows; '-' = none)
//   ## <scene-key>                scene key used for generated node ids
//   @map <MAP_ID>                 map for the following new lines
//   @keep <NODE_ID>               keep an existing node (effects, gates, events)
//   @keep <NODE_ID> hold          keep the node but stop before its ensemble/gate rows;
//   @thru <NODE_ID>               ...then continue through that node's ensemble/gate rows here
//   > <text>                      replacement text for the preceding @keep/@text
//   @text <NODE_ID>               rewrite the text of a node outside the chain
//   @drop <NODE_ID>               unlink an existing node from its chain
//   @combat <ENCOUNTER_GROUP_ID>  new fixed battle (the following > line is its text);
//                                 defeat retries the same node, victory continues
//   이야기: <text>                narration
//   <이름>: <text>                dialogue; 나: is the player
//   ~ <text>                      close-bond variant of the preceding dialogue
//   ?? <label>                    choice option; following deeper-indented lines are its reply
//   ??@<CHOICE_ID> [label]        keep an existing choice row (its effects stay)
//   ??= <CHOICE_ID>               freeze an existing choice row: it and everything only
//                                 reachable through it stay exactly as in the original DB
//   @cond <EXPR> | @cond -        precondition added to the following new lines (or cleared)
//   // comment
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..'),srcDir=path.join(__dirname,'main_story_k'),out=path.join(root,'source/runtime_main_story_k_content.js');

function parseFile(file){
 const raw=fs.readFileSync(file,'utf8').split(/\r?\n/);
 const lines=[];
 raw.forEach((text,i)=>{if(!text.trim()||/^\s*\/\//.test(text))return;const indent=text.match(/^ */)[0].length;lines.push({indent,text:text.trim(),line:i+1,file:path.basename(file)});});
 const chain={id:'',entry:'',items:[],edits:[]};
 let pos=0;
 const err=(l,msg)=>{throw Error(`${l.file}:${l.line}: ${msg}`);};
 const counters={};let scene='MAIN',map='',cond='';
 const nextId=()=>{const key=scene;counters[key]=(counters[key]||0)+1;return `PRO_${chain.id.replace(/^ISK_/,'').replace(/_/g,'')}_${key}_${String(counters[key]).padStart(3,'0')}`;};
 function block(indent){
  const items=[];
  while(pos<lines.length){
   const l=lines[pos];
   if(l.indent<indent)break;
   if(l.indent>indent)err(l,'unexpected indentation');
   const t=l.text;
   if(t.startsWith('# chain ')){chain.id=t.slice(8).trim();pos++;continue;}
   if(t.startsWith('# entry ')){chain.entry=t.slice(8).trim();pos++;continue;}
   if(t.startsWith('# pre')){const v=t.slice(5).trim();chain.pre=v==='-'?'':v;pos++;continue;}
   if(t.startsWith('## ')){scene=t.slice(3).trim().replace(/[^A-Za-z0-9가-힣]+/g,'_');pos++;continue;}
   if(t.startsWith('@map ')){map=t.slice(5).trim();pos++;continue;}
   if(t.startsWith('@cond ')){cond=t.slice(6).trim();if(cond==='-')cond='';pos++;continue;}
   if(t.startsWith('@keep ')){const w=t.slice(6).trim().split(/\s+/);const item={k:'keep',id:w[0]};if(w[1]==='hold')item.hold=true;else if(w[1])err(l,'unknown @keep flag '+w[1]);pos++;const text=quoted(indent);if(text!=null)item.text=text;items.push(item);continue;}
  if(t.startsWith('@thru ')){items.push({k:'thru',id:t.slice(6).trim()});pos++;continue;}
   if(t.startsWith('@combat ')){const group=t.slice(8).trim();if(!/^EG_[A-Z0-9_]+$/.test(group))err(l,'bad encounter group '+group);pos++;const text=quoted(indent);if(text==null)err(l,'@combat needs a > line');const item={k:'combat',id:nextId(),group,text};if(map)item.map=map;if(cond)item.cond=cond;items.push(item);continue;}
   if(t.startsWith('@text ')){const id=t.slice(6).trim();pos++;const text=quoted(indent);if(text==null)err(l,'@text needs a > line');chain.edits.push({k:'text',id,text});continue;}
   if(t.startsWith('@drop ')){chain.edits.push({k:'drop',id:t.slice(6).trim()});pos++;continue;}
   if(t.startsWith('>'))err(l,'stray > line');
   if(t.startsWith('~ ')){const prev=items[items.length-1];if(!prev||prev.k!=='line'||!prev.speaker||prev.speaker==='나')err(l,'~ needs a preceding named dialogue line');if(prev.alt)err(l,'only one ~ variant per line');prev.alt={id:nextId(),text:t.slice(2).trim()};pos++;continue;}
   if(t.startsWith('??')){
    const group={k:'choice',group:nextId().replace(/^PRO_/,'G_PRO_'),options:[]};
    while(pos<lines.length&&lines[pos].indent===indent&&lines[pos].text.startsWith('??')){
     const o=lines[pos];
     const fz=/^\?\?=\s*([A-Za-z0-9_]+)\s*$/.exec(o.text);
     if(fz){pos++;if(pos<lines.length&&lines[pos].indent>indent)err(lines[pos],'a frozen choice (??=) takes no body');group.options.push({freeze:fz[1]});continue;}
     const m=/^\?\?(?:@([A-Za-z0-9_]+))?\s*(.*)$/.exec(o.text);
     const opt={label:m[2].trim()};if(m[1])opt.keep=m[1];else opt.id=nextId();
     if(!opt.keep&&!opt.label)err(o,'choice needs a label');
     pos++;
     if(pos<lines.length&&lines[pos].indent>indent)opt.items=block(lines[pos].indent);else opt.items=[];
     group.options.push(opt);
    }
    if(!group.options.some(o=>!o.freeze))err(l,'a choice needs at least one option that is not frozen');
    items.push(group);continue;
   }
   const m=/^([^:]{1,24}):\s*(.*)$/.exec(t);
   if(!m)err(l,'cannot parse line: '+t);
   const speaker=m[1].trim()==='이야기'?'':m[1].trim();
   const item={k:'line',id:nextId(),speaker,text:m[2].trim()};if(map)item.map=map;if(cond)item.cond=cond;
   if(!item.text)err(l,'empty text');
   items.push(item);pos++;
  }
  return items;
 }
 function quoted(indent){
  const parts=[];
  while(pos<lines.length&&lines[pos].indent===indent&&lines[pos].text.startsWith('>')){parts.push(lines[pos].text.slice(1).trim());pos++;}
  return parts.length?parts.join('\n'):null;
 }
 chain.items=block(0);
 if(!chain.id||!chain.entry)throw Error(file+': missing # chain / # entry');
 if(chain.items[0]?.k!=='keep'||chain.items[0].id!==chain.entry)throw Error(file+': first item must be @keep '+chain.entry);
 return chain;
}

function compile(){
 const files=fs.readdirSync(srcDir).filter(f=>f.endsWith('.md')&&fs.readFileSync(path.join(srcDir,f),'utf8').startsWith('# chain ')).sort();
 const chains=files.map(f=>parseFile(path.join(srcDir,f)));
 const ids=new Set();
 const walk=items=>{for(const it of items){if(it.k==='combat'){if(ids.has(it.id))throw Error('duplicate id '+it.id);ids.add(it.id);}if(it.k==='line'){if(ids.has(it.id))throw Error('duplicate id '+it.id);ids.add(it.id);if(it.alt)ids.add(it.alt.id);}if(it.k==='choice')for(const o of it.options){if(o.freeze)continue;if(o.id)ids.add(o.id);walk(o.items);}}};
 chains.forEach(c=>walk(c.items));
 return {version:1,chains};
}
function render(content){return '/* Generated by tools/editorial/compile_main_story_k.cjs from tools/editorial/main_story_k/*.md. Do not edit by hand. */\n(function(root){root.CRPGMainStoryK='+JSON.stringify(content,null,0).replace(/\u2028|\u2029/g,m=>'\\u'+m.charCodeAt(0).toString(16))+';})(globalThis);\n';}
module.exports={compile,render,parseFile,out};
if(require.main===module){const content=compile();const text=render(content);if(process.argv.includes('--check')){const current=fs.existsSync(out)?fs.readFileSync(out,'utf8'):'';if(current!==text){console.error('runtime_main_story_k_content.js is stale; run node tools/editorial/compile_main_story_k.cjs');process.exit(1);}console.log('up to date');}else{fs.writeFileSync(out,text);console.log('wrote',path.relative(root,out),content.chains.map(c=>c.id+'('+JSON.stringify(c.items).length+')').join(' '));}}
