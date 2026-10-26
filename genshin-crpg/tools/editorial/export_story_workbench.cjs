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
// 0.16.68: the stage each chapter is at (tools/editorial/story_status.json), shown in the workbench as a badge
// the workbench edits already put into the manuscripts (tools/editorial/workbench_folded.json): shown as 「반영됨」, not over the text
const FOLDED=(()=>{try{const s=JSON.parse(fs.readFileSync(path.join(root,'tools/editorial/workbench_folded.json'),'utf8'));delete s['//'];return s;}catch{return {};}})();
const STATUS=(()=>{try{const s=JSON.parse(fs.readFileSync(path.join(root,'tools/editorial/story_status.json'),'utf8'));delete s['//'];return s;}catch{return {};}})();
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
// 0.16.68 스토리 체험 (user: 「스토리 연출도 확인할 수 있게, 스토리 체험하는 작업대도 만들어두자」): the raw condition atoms a story player decides on
const rawIf=c=>String(c||'').split(/\s+AND\s+|\s*&&\s*/).map(s=>s.trim()).filter(a=>/^(FLAG_|BOND\(|MET\()/.test(a));
const usedMaps=new Set(),usedRefs=new Set();
const stage=(x,row,r)=>{if(row[8]){x.map=row[8];usedMaps.add(row[8]);}if(row[6]&&!/^PLAYER_/.test(row[6])){x.ref=row[6];usedRefs.add(row[6]);}const m=r.storyMood?.(row[4]);if(m)x.mood=m;const fx=r.storyFx?.(row[4]);if(fx)x.fx=fx;const i=rawIf(row[11]);if(i.length)x.if=i;return x;};
// 0.16.68: 「MET(PROFILE_MOND_DILUC) = TRUE」 → 「다이루크를 이미 만났을 때」 (3장 A's condition branch)
const objectParticle=w=>{const c=String(w).charCodeAt(String(w).length-1);return c>=0xac00&&c<=0xd7a3&&(c-0xac00)%28?'을':'를';};
const metText=a=>{const m=String(a).match(/^MET\((\w+)\)\s*(=|!=)\s*(TRUE|FALSE)$/);if(!m)return null;const p=[...(T['04_CHAR_DB']?.values()||[])].find(x=>x[0]===m[1]);const who=p?.[2]||charName(m[1].replace(/^PROFILE_(MOND|LIYUE)_/,'$1_'))||m[1];const met=(m[2]==='=')===(m[3]==='TRUE');return who+objectParticle(who)+(met?' 이미 만났을 때':' 처음 만날 때');};
const condText=a=>metText(a)||WORDS[a]||(a.match(/^BOND\((\w+)\)>=(\d+)/)?charName(a.match(/^BOND\((\w+)\)/)[1])+' 호감도 '+a.match(/>=(\d+)/)[1]+' 이상':a.replace(/^FLAG_(ISK|TRV)_/,'').replace('=',' = '));
const chains=[];
// the first line of every chapter: a pause that leads into one of these is where a chapter ends
const ENTRIES=new Set(content.chains.map(c=>c.entry).filter(Boolean));
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
 const seen=new Set();let scene='',quest='';
 const sceneOf=id=>{const m=String(id).match(/^PRO_[^_]+_(.+)_\d+$/);return m?m[1].replace(/_/g,' '):null;};
 // Every node reachable from id, in order (both ways through any choice).
 const reachMemo=new Map();
 // a condition branch's scenes: every row of the route in that group (the game shows the one whose condition holds)
 const condMembers=g=>ix.byTable['55_MAIN_STORY_DB'].filter(x=>x[0]===route&&x[14]===g&&x[5]!=='CHOICE');
 function reach(id){
  const key=id;if(reachMemo.has(key))return reachMemo.get(key);
  const order=[],got=new Set(),stack=[id];
  while(stack.length&&order.length<6000){const x=stack.pop();if(!x||got.has(x)||String(x).startsWith('SCREEN:'))continue;got.add(x);order.push(x);
   if(String(x).startsWith('CHOICE_GROUP:')){const opts=(groups.get(x.slice(13))||[]).map(c=>c[13]);for(let i=opts.length-1;i>=0;i--)stack.push(opts[i]);}
   else if(String(x).startsWith('CONDITION_GROUP:')){const opts=condMembers(x.slice(16)).map(c=>c[4]);for(let i=opts.length-1;i>=0;i--)stack.push(opts[i]);}
   else{const row=get(x);if(row)stack.push(row[13]);}}
  const out={order,got};reachMemo.set(key,out);return out;
 }
 function visit(id,list,state,stop=null){
  for(let guard=0;id&&guard<5000;guard++){
   if(stop&&id===stop)return;
   if(String(id).startsWith('SCREEN:')){list.push({t:'free',text:'자유 행동으로 돌아감'});return;}
   // 0.16.68: a condition branch is shown like a choice the game makes by itself (auto): one option per scene, labelled by its condition
   if(String(id).startsWith('CONDITION_GROUP:')){const g=id.slice(16);if(seen.has(id)){list.push({t:'flow',to:id});return;}seen.add(id);
    const rows=condMembers(g);if(!rows.length){list.push({t:'missing',id});return;}
    let merge=null;if(rows.length>1){const sets=rows.map(c=>reach(c[4]));merge=sets[0].order.find(x=>sets.every(s=>s.got.has(x)))||null;}
    const opts=rows.map(c=>{const label=cond(c).join(' · ')||'그 밖의 경우';const o=stage({id:'IF:'+c[4],label,cond:[],does:[],items:[]},c,r);delete o.ref;delete o.map;const s={map:state.map};visit(c[4],o.items,s,merge);return o;});
    list.push({t:'choice',auto:true,group:g,opts});
    if(!merge)return;id=merge;continue;}
   if(String(id).startsWith('CHOICE_GROUP:')){const g=id.slice(13);if(seen.has(id)){list.push({t:'flow',to:id});return;}seen.add(id);
    const rows=groups.get(g)||[];
    // a choice with one answer is the protagonist speaking (the game shows every line of theirs as a choice)
    if(rows.length===1){const c=rows[0];list.push(stage({id:c[4],t:'say',who:'주인공',text:c[10]||'',cond:cond(c),does:deeds(c).filter(d=>d.k!=='free'),kept:!/^PRO_/.test(c[4])},c,r));id=c[13];continue;}
    // where the options meet again: the first node every option reaches; the choice's results end there and the story goes on
    let merge=null;if(rows.length>1){const sets=rows.map(c=>reach(c[13]));merge=sets[0].order.find(x=>sets.every(s=>s.got.has(x)))||null;}
    const opts=rows.map(c=>{const o=stage({id:c[4],label:c[10]||'',cond:cond(c),does:deeds(c).filter(d=>d.k!=='free'),items:[]},c,r);const s={map:state.map};visit(c[13],o.items,s,merge);return o;});
    list.push({t:'choice',group:g,opts});
    if(!merge)return;id=merge;continue;}
   if(seen.has(id)){list.push({t:'flow',to:id});return;}seen.add(id);
   const row=get(id);if(!row){list.push({t:'missing',id});return;}
   if(!quest&&row[1])quest=String(row[1]);
   const sc=sceneOf(row[4]);if(sc&&sc!==scene){scene=sc;list.push({t:'scene',name:sc});}
   if(row[8]&&row[8]!==state.map){if(state.map)list.push({t:'move',from:mapName(state.map),to:mapName(row[8]),fromId:state.map,toId:row[8]});state.map=row[8];}
   const type=row[5],who=type==='DIALOGUE'?(row[7]||''):'',player=/^PLAYER_/.test(row[6]||'');
   const item={id:row[4],t:type==='NARRATION'?'narr':type==='DIALOGUE'?'line':type==='COMBAT_GATE'?'combat':type==='CARD_JOIN'?'join':type==='STORY_PAUSE'?'pause':type==='CHAPTER_END'?'end':type==='FIELD_GATE'?'field':type==='MENU_GATE'?'menu':type==='EVENT'?'event':type.toLowerCase(),who:player?'주인공':who,text:row[9]||'',cond:cond(row),does:deeds(row),kept:!/^PRO_/.test(row[4])};
   if(item.t==='meta'&&!item.text){id=row[13];continue;}
   stage(item,row,r);if(item.t==='move'&&item.toId)usedMaps.add(item.toId);
   list.push(item);
   // 0.16.68: a chapter ends at its pause (「준비가 되면 이야기를 이어 가자」); what follows is the next chapter, exported on its own
   // (before this, 몬드 2장 carried 3–5장 inside it: user, 「2장 너무 길다」)
   // 0.16.68: …but a pause inside a chapter (3장 A stops before the cliff) goes on; only a pause whose next line starts another
   // chapter ends this one
   if(item.t==='end'||item.t==='pause'&&ENTRIES.has(String(row[13]||'')))return;
   id=row[13];
  }
 }
 const items=[];visit(chain.entry,items,{map:null});
 const a=about[chain.id]||{};
 // the quest's title card, worded as the game words it (app_shell.js storyStage): 「몬드 · 메인 임무」 over the quest's name
 const qrow=quest?T['22_QUEST_DB']?.get(quest):null;let card=null;
 if(qrow){const name=String(qrow[1]||''),cut=name.indexOf(' · ');card={label:cut>0?name.slice(0,cut):(String(qrow[2]||'')+(/^Q_(TRV|ISK)_/.test(quest)?' · 메인 임무':'')),title:cut>0?name.slice(cut+3):name};}
 chains.push({id:chain.id,route,file:fileOf[chain.id]||a.file||'',about:a.what||'',...(STATUS[chain.id]?{status:STATUS[chain.id]}:{}),...(quest?{quest}:{}),...(card?{card}:{}),items});
}
// 0.16.67 축제 이야기 (tools/editorial/festival_k/*.md): after the main story, in the same shape; a place change keeps its names.
const FEST_NAMES={XMAS:'눈꽃 축제',SEOLLAL:'설날',CHUSEOK:'추석'};
for(const c of require(root+'/tools/editorial/compile_festival_story.cjs').compile()){
 // a line kept to one route, or to a protagonist who knows Genshin or not, shows the workbench's condition tag
 const conds=it=>[...(it.route?[it.route==='ISK'?'이세계인 갈래':'여행자 갈래']:[]),...(it.know?[it.know==='KNOWN'?'원신을 아는 주인공':'원신을 모르는 주인공']:[])];
 const named=list=>list.map(it=>{const x=it.t==='move'?{...it,from:mapName(it.fromId),to:mapName(it.toId)}:it.t==='choice'?{...it,opts:it.opts.map(o=>({...o,cond:conds(o),items:named(o.items)}))}:{...it};const cs=conds(it);if(cs.length)x.cond=cs;return x;});
 const shared=c.route==='ALL';
 chains.push({id:c.id,route:shared?'ROUTE_BOTH':c.route==='TRV'?'ROUTE_TRAVELER':'ROUTE_ISEKAI',file:'festival_k/'+c.file,title:c.title,about:FEST_NAMES[c.festival]+' '+c.part+'편 「'+c.title+'」 · '+(shared?'두 갈래 공통 · 「이세계인:」 줄은 이세계인 갈래에서, 「여행자:」 줄은 여행자 갈래에서 내 말 · {이세계인} = 이세계인 갈래에선 주인공 이름, 여행자 갈래에선 「이세계인」':(c.route==='ISK'?'이세계인':'여행자')+' 갈래 · '+mapName(c.map)+'에서 시작'),items:named(c.items)});
}
// 0.16.68 축제 대사 (festival_k/talk.md): one chapter per festival, a scene per place the words are said
{const talk=require(root+'/tools/editorial/compile_festival_story.cjs').compileTalk(),TASKS={XMAS:'선물 배달',SEOLLAL:'세배 돌기',CHUSEOK:'차례상'};
 const YUT_EVENTS='시작 · 윷·모가 나옴 · 내 말을 잡음 · 잡힘 · 빽도 · 이김 · 짐';
 const label=k=>{let m;if((m=k.match(/^HOST_[A-Z]+_(\d|END)$/)))return '축제 창 맞이 · '+(m[1]==='END'?'끝난 뒤':m[1]+'일째');
  if((m=k.match(/^TASK_([A-Z]+)_(\d)_(\d)$/)))return TASKS[m[1]]+' · '+m[2]+'일째 '+(m[3]==='0'?'①':'②');
  if((m=k.match(/^YUT_(\w+)$/)))return '윷놀이 상대 '+charName(m[1])+' ('+YUT_EVENTS+' 순서)';
  return {SONG_ORDER:'송편 주문 ({소} = 깨·콩·밤)',SONG_PRETTY:'송편 · 예쁘게 빚었을 때',SONG_OK:'송편 · 보통일 때',SONG_BURST:'송편 · 터졌을 때',SNOW_JEAN:'눈싸움 · 진 단장을 맞혔을 때',SNOW_GIFT:'눈싸움 · 보물상자',SNOW_FEVER:'눈싸움 · 눈꽃 피버'}[k]||k;};
 const owner=k=>/^(HOST|TASK)_([A-Z]+)/.exec(k)?.[2]||(k.startsWith('YUT_')?'SEOLLAL':k.startsWith('SONG_')?'CHUSEOK':'XMAS');
 for(const fest of ['SEOLLAL','CHUSEOK','XMAS']){const items=[];for(const [k,list] of Object.entries(talk)){if(owner(k)!==fest)continue;items.push({t:'scene',name:label(k)},...list.map(x=>({...x})));}
  if(items.length)chains.push({id:'EVT_'+fest+'_TALK',route:'ROUTE_BOTH',file:'festival_k/talk.md',title:'축제 대사',about:FEST_NAMES[fest]+' · 축제 창의 맞이, 이동 과제를 마칠 때, 미니게임에서 나오는 짧은 말 · 갈래와 상관없이 나옴',items});}}
// the pictures (paths of the published game's assets) and the big branches a player picks between
const manifest=(()=>{try{return JSON.parse(fs.readFileSync(path.join(root,'dist/asset-manifest.json'),'utf8'));}catch{return null;}})();
for(const c of chains){if(c.map)usedMaps.add(c.map);(function w(items){for(const it of items||[]){if(it.t==='move'&&it.toId)usedMaps.add(it.toId);for(const o of it.opts||[])w(o.items);}})(c.items);}
const pictures={maps:{},faces:{},places:{}};
if(manifest){
 for(const id of usedMaps){const m=manifest.maps?.[id];if(m?.url)pictures.maps[id]=m.url;pictures.places[id]=mapName(id);}
 for(const ref of usedRefs){const p=[...(T['04_CHAR_DB']?.values()||[])].find(x=>x[0]===ref);const a=p&&any.assetFor(p[0],1);const url=a&&manifest.assets?.[a[0]]?.url;if(url)pictures.faces[ref]=url;}
 // by name too, for the festival stories (their lines carry names only): every character with a picture
 pictures.names={};for(const p of T['04_CHAR_DB']?.values()||[]){if(!p[2]||pictures.names[p[2]])continue;const a=any.assetFor(p[0],1),url=a&&manifest.assets?.[a[0]]?.url;if(url){pictures.faces[p[0]]=url;pictures.names[p[2]]=p[0];}}
 pictures.faces.PLAYER_ISEKAI='assets/icons/faces/isekai.webp';pictures.faces.PLAYER_TRAVELER='assets/icons/faces/traveler_aether.webp';
}
const branches=[];for(const [k,label] of Object.entries(WORDS)){const [flag,v]=k.split('=');let b=branches.find(x=>x.flag===flag);if(!b)branches.push(b={flag,options:[]});b.options.push({v,label});}
const out={version:1,made:new Date().toISOString().slice(0,10),folded:FOLDED,pictures,branches,chains};
const file=process.argv[2]||path.join(root,'reports/story_workbench.json');
fs.writeFileSync(file,JSON.stringify(out));
console.log(JSON.stringify({chains:chains.length,bytes:fs.statSync(file).size,lines:chains.reduce((n,c)=>n+JSON.stringify(c.items).split('"t":').length-1,0)}));
