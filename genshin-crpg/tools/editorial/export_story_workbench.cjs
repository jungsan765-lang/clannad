#!/usr/bin/env node
'use strict';
// 0.16.45 (user: 「내가 스토리 직접 수정할 수 있게 좀 줘볼 수 있나? … 선택지라던지 어떤 장소로 이동하는지, 전투를 하는지 이런거 다 세세하게
// 내가 체크하고 직접 수정해서 적어두려고」): every installed main-story chain, in play order, as one JSON file for the story
// workbench page (the page shows it and keeps the user's edits; the edits come back to tools/editorial/main_story_k/*.md).
//   node tools/editorial/export_story_workbench.cjs out.json
const path=require('path'),root=path.resolve(__dirname,'../..');
const {fs,fresh}=require(root+'/tests/helpers_v011.cjs');
const content=require(root+'/tools/editorial/compile_main_story_k.cjs').compile();
// Chapter names from the manuscript README table (| `file` | `CHAIN` | what happens |).
const readme=fs.readFileSync(path.join(root,'tools/editorial/main_story_k/README.md'),'utf8'),about={};
for(const line of readme.split('\n')){const m=line.match(/^\|\s*`([^`]+)`[^|]*\|\s*((?:`[^`]+`\s*)+)\|\s*(.+?)\s*\|\s*$/);if(!m)continue;for(const c of m[2].match(/`([^`]+)`/g).map(x=>x.slice(1,-1)))about[c]={file:m[1],what:m[3].replace(/`/g,'')};}
const fileOf={};for(const f of fs.readdirSync(path.join(root,'tools/editorial/main_story_k')).filter(f=>f.endsWith('.md')&&f!=='README.md')){const t=fs.readFileSync(path.join(root,'tools/editorial/main_story_k',f),'utf8');for(const m of t.matchAll(/^# chain (\S+)/gm))fileOf[m[1]]=f;}
const ROUTES={ROUTE_ISEKAI:fresh('MAP_MOND_CITY','ROUTE_ISEKAI'),ROUTE_TRAVELER:fresh('MAP_MOND_CITY','ROUTE_TRAVELER')};
const any=ROUTES.ROUTE_ISEKAI,T=any.tables;
const mapName=id=>{const r=T['32_MAP_DB'].get(id);return r?(r[2]||r[1]||id):id;};
const monster=id=>T['09_MONSTER_DB'].get(id)?.[1]||id;
const members=new Map();for(const m of T['49_ENCOUNTER_MEMBER_DB'].values()){if(!members.has(m[1]))members.set(m[1],[]);members.get(m[1]).push(m);}
function foes(group){
 const list=(members.get(group)||[]).map(m=>monster(m[3])+(Number(m[5])>1?' ×'+(Number(m[4])===Number(m[5])?m[4]:m[4]+'~'+m[5]):''));
 if(list.length)return list;const g=T['33_ENCOUNTER_GROUP_DB'].get(group);if(!g)return [];
 const out=[];for(const at of [7,10,13,16,19])if(g[at])out.push(monster(g[at])+(Number(g[at+2])>1?' ×'+(g[at+1]===g[at+2]?g[at+1]:g[at+1]+'~'+g[at+2]):''));return out;
};
const groupName=g=>T['33_ENCOUNTER_GROUP_DB'].get(g)?.[1]||g;
const charName=id=>{const r=T['07_CHAR_DB']?.get(id);const p=[...(T['04_CHAR_DB']?.values()||[])].find(x=>x[1]===id||x[0]===id);return p?.[2]||r?.[1]||id;};
// What a row does, in words (its EFFECT and NEXT).
function deeds(row){
 const out=[];
 for(const e of String(row[12]||'').split(';').map(s=>s.trim()).filter(Boolean)){
  let m;
  if((m=e.match(/^START_FIXED_COMBAT:(\w+)/)))out.push({k:'combat',text:groupName(m[1]),foes:foes(m[1]),code:m[1]});
  else if((m=e.match(/^UNLOCK_CARD:(\w+)/)))out.push({k:'join',text:charName(m[1])+' 동료 합류',code:m[1]});
  else if((m=e.match(/^EVENT:(\w+)/)))out.push({k:'event',text:(T['51_EVENT_DB']?.get(m[1])?.[1]==='STORY_RESOLVE'?'이야기 사건':'사건')+' · '+m[1].replace(/^EVT_/,''),code:m[1]});
  else if((m=e.match(/^COMPLETE_QUEST:(\w+)/)))out.push({k:'quest',text:'임무 완료',code:m[1]});
  else if(/^(ON_VICTORY|ON_DEFEAT)/.test(e))continue;
  else if((m=e.match(/^(FLAG_\w+)=(\w+)/)))out.push({k:'flag',text:m[1].replace(/^FLAG_(ISK|TRV)_/,'')+' = '+m[2],code:e});
  else out.push({k:'other',text:e,code:e});
 }
 if(/^SCREEN:/.test(String(row[13]||'')))out.push({k:'free',text:'자유 행동으로 돌아감'});
 return out;
}
// Conditions: atoms common to most of the chain are the chain's own and are not shown on each line.
const NOISE=/^(ROUTE_ID|ACTIVE_STORY_QUEST|PENDING_INTERLUDE|BATTLE_CONTEXT|L0\d_EXPLICIT|FLAG_ISK_L0\d_(STARTED|CONTENT_GATE))/;
const atoms=c=>String(c||'').split(/\s+AND\s+/).map(s=>s.trim()).filter(a=>a&&!NOISE.test(a));
const WORDS={'FLAG_ISK_META_KNOWLEDGE=KNOWN':'몬드를 알 때','FLAG_ISK_META_KNOWLEDGE=UNKNOWN':'몬드를 모를 때','FLAG_ISK_MOND_BRANCH=EXPEDITION':'토벌대(A)','FLAG_ISK_MOND_BRANCH=GUILD':'길드(B)','FLAG_ISK_EXPEDITION_FORK=RIDE':'드발린을 쫓음(AA)','FLAG_ISK_EXPEDITION_FORK=RETURN':'다이루크 쪽(AB)','FLAG_TRV_AVATAR=MALE':'아이테르','FLAG_TRV_AVATAR=FEMALE':'루미네'};
const condText=a=>WORDS[a]||(a.match(/^BOND\((\w+)\)>=(\d+)/)?charName(a.match(/^BOND\((\w+)\)/)[1])+' 호감도 '+a.match(/>=(\d+)/)[1]+' 이상':a.replace(/^FLAG_(ISK|TRV)_/,'').replace('=',' = '));
const chains=[];
for(const chain of content.chains){
 if(/^(LEG|AFF)_/.test(chain.id))continue;
 const route=chain.id.startsWith('TRV_')?'ROUTE_TRAVELER':'ROUTE_ISEKAI',r=ROUTES[route],ix=r.storyIndex();
 const get=id=>ix.nodes.get(route+':'+id),groups=new Map();
 for(const x of ix.byTable['55_MAIN_STORY_DB'])if(x[0]===route&&x[5]==='CHOICE'&&x[14]){if(!groups.has(x[14]))groups.set(x[14],[]);groups.get(x[14]).push(x);}
 // the chain's own conditions
 const ids=new Set();(function collect(items){for(const it of items||[]){if(it.id)ids.add(it.id);if(it.keep)ids.add(it.keep);for(const o of it.options||[]){if(o.id)ids.add(o.id);if(o.keep)ids.add(o.keep);collect(o.items);}}})(chain.items);
 const freq={};let total=0;for(const id of ids){const row=get(id);if(!row)continue;total++;for(const a of atoms(row[11]))freq[a]=(freq[a]||0)+1;}
 const own=new Set(Object.entries(freq).filter(([,n])=>n>=total*.6).map(([a])=>a));
 const cond=row=>atoms(row[11]).filter(a=>!own.has(a)).map(condText);
 const seen=new Set();let scene='';
 const sceneOf=id=>{const m=String(id).match(/^PRO_[^_]+_(.+)_\d+$/);return m?m[1].replace(/_/g,' '):null;};
 // Every node reachable from id, in order (both ways through any choice).
 const reachMemo=new Map();
 function reach(id){
  const key=id;if(reachMemo.has(key))return reachMemo.get(key);
  const order=[],got=new Set(),stack=[id];
  while(stack.length&&order.length<6000){const x=stack.pop();if(!x||got.has(x)||String(x).startsWith('SCREEN:'))continue;got.add(x);order.push(x);
   if(String(x).startsWith('CHOICE_GROUP:')){const opts=(groups.get(x.slice(13))||[]).map(c=>c[13]);for(let i=opts.length-1;i>=0;i--)stack.push(opts[i]);}
   else{const row=get(x);if(row)stack.push(row[13]);}}
  const out={order,got};reachMemo.set(key,out);return out;
 }
 function visit(id,list,state,stop=null){
  for(let guard=0;id&&guard<5000;guard++){
   if(stop&&id===stop)return;
   if(String(id).startsWith('SCREEN:')){list.push({t:'free',text:'자유 행동으로 돌아감'});return;}
   if(String(id).startsWith('CHOICE_GROUP:')){const g=id.slice(13);if(seen.has(id)){list.push({t:'flow',to:id});return;}seen.add(id);
    const rows=groups.get(g)||[];
    // a choice with one answer is the protagonist speaking (the game shows every line of theirs as a choice)
    if(rows.length===1){const c=rows[0];list.push({id:c[4],t:'say',who:'주인공',text:c[10]||'',cond:cond(c),does:deeds(c).filter(d=>d.k!=='free'),kept:!/^PRO_/.test(c[4])});id=c[13];continue;}
    // where the options meet again: the first node every option reaches; the choice's results end there and the story goes on
    let merge=null;if(rows.length>1){const sets=rows.map(c=>reach(c[13]));merge=sets[0].order.find(x=>sets.every(s=>s.got.has(x)))||null;}
    const opts=rows.map(c=>{const o={id:c[4],label:c[10]||'',cond:cond(c),does:deeds(c).filter(d=>d.k!=='free'),items:[]};const s={map:state.map};visit(c[13],o.items,s,merge);return o;});
    list.push({t:'choice',group:g,opts});
    if(!merge)return;id=merge;continue;}
   if(seen.has(id)){list.push({t:'flow',to:id});return;}seen.add(id);
   const row=get(id);if(!row){list.push({t:'missing',id});return;}
   const sc=sceneOf(row[4]);if(sc&&sc!==scene){scene=sc;list.push({t:'scene',name:sc});}
   if(row[8]&&row[8]!==state.map){if(state.map)list.push({t:'move',from:mapName(state.map),to:mapName(row[8]),fromId:state.map,toId:row[8]});state.map=row[8];}
   const type=row[5],who=type==='DIALOGUE'?(row[7]||''):'',player=/^PLAYER_/.test(row[6]||'');
   const item={id:row[4],t:type==='NARRATION'?'narr':type==='DIALOGUE'?'line':type==='COMBAT_GATE'?'combat':type==='CARD_JOIN'?'join':type==='STORY_PAUSE'?'pause':type==='CHAPTER_END'?'end':type==='FIELD_GATE'?'field':type==='MENU_GATE'?'menu':type==='EVENT'?'event':type.toLowerCase(),who:player?'주인공':who,text:row[9]||'',cond:cond(row),does:deeds(row),kept:!/^PRO_/.test(row[4])};
   if(item.t==='meta'&&!item.text){id=row[13];continue;}
   list.push(item);
   id=row[13];
  }
 }
 const items=[];visit(chain.entry,items,{map:null});
 const a=about[chain.id]||{};
 chains.push({id:chain.id,route,file:fileOf[chain.id]||a.file||'',about:a.what||'',items});
}
const out={version:1,made:new Date().toISOString().slice(0,10),chains};
const file=process.argv[2]||path.join(root,'reports/story_workbench.json');
fs.writeFileSync(file,JSON.stringify(out));
console.log(JSON.stringify({chains:chains.length,bytes:fs.statSync(file).size,lines:chains.reduce((n,c)=>n+JSON.stringify(c.items).split('"t":').length-1,0)}));
