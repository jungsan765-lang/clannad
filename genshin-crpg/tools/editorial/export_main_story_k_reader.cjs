#!/usr/bin/env node
'use strict';
// Export the installed K-route chains as a readable Korean manuscript (Markdown):
//   node tools/editorial/export_main_story_k_reader.cjs out.md [--only ISK_M0] [--title "..."] [--intro "..."]
// --only keeps the chains whose id starts with the prefix; the reader follows the K branch
// (FLAG_ISK_META_KNOWLEDGE=KNOWN), so rows and choices of the U branch are left out.
const path=require('path'),root=path.resolve(__dirname,'../..');
const {fs,fresh}=require(root+'/tests/helpers_v011.cjs');
const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI'),ix=r.storyIndex(),ROUTE='ROUTE_ISEKAI';
const content=require(root+'/tools/editorial/compile_main_story_k.cjs').compile();
const argv=process.argv.slice(2),arg=k=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:null;},outFile=argv.find((a,i)=>!a.startsWith('--')&&(i===0||!argv[i-1].startsWith('--')));
const only=arg('--only')||'',chains=content.chains.filter(c=>c.id.startsWith(only));
const frozen=new Set();const fz=items=>{for(const it of items)if(it.k==='choice')for(const o of it.options){if(o.freeze)frozen.add(o.freeze);else fz(o.items);}};chains.forEach(c=>fz(c.items));
const uOnly=row=>/FLAG_ISK_META_KNOWLEDGE=UNKNOWN/.test(row[11]||'');
const db=r.db||require(root+'/content/db.json');
const mapName=new Map(db['32_MAP_DB'].slice(1).map(x=>[x[0],x[2]]));
const get=id=>ix.nodes.get(ROUTE+':'+id),groups=new Map();
for(const x of ix.byTable['55_MAIN_STORY_DB'])if(x[0]===ROUTE&&x[5]==='CHOICE'&&x[14]){if(!groups.has(x[14]))groups.set(x[14],[]);groups.get(x[14]).push(x);}
const TITLES={ISK_M01:'몬드 1장 · 낯선 하늘 아래 (튜토리얼)',ISK_M02:'몬드 2장 · 기사단, 사라진 하프, 두 사당',ISK_M03_K:'몬드 3장 · 벤티와 폐허, 떨어진 용',ISK_M04_K:'몬드 4장 · 드래곤스파인의 속삭임',ISK_M05_K:'몬드 5장 · 돌아온 용, 신의 심장, 남쪽 길',ISK_L01_K:'1장 (공통) · 몬드에서 리월항 봉쇄선까지',ISK_L02_K1:'2장 K1 · 각청 곁의 닷새, 그리고 죽음',ISK_L02_K2:'2장 K2 · 짐꾼 곁의 닷새, 그리고 죽음',ISK_L03_K1:'3장 K1 · 기억 없는 각청과 황금옥',ISK_L03_K2:'3장 K2 · 사라진 짐꾼과 황금옥',ISK_L04_K1:'4장 K1 · 구조, 오셀, 북국은행, 이나즈마',ISK_L04_K2:'4장 K2 · 돌 틈 너머의 목소리, 장록'};
const clean=t=>String(t).replace(/\{PLAYER_NAME\}/g,'(이름)').replace(/\{PLAYER\}/g,'(이름)').trim();
const COND={'FLAG_ISK_KNOWLEDGE_DISCLOSURE=GAME_TRUTH':'1장에서 게임이라고 밝혔을 때','FLAG_ISK_KNOWLEDGE_DISCLOSURE=FRAGMENTARY':'1장에서 이름만 기억난다고 했을 때','FLAG_ISK_KNOWLEDGE_DISCLOSURE=DEFERRED':'1장에서 나중에 말하겠다고 했을 때','FLAG_ISK_KNOWLEDGE_DISCLOSURE!=GAME_TRUTH':'1장에서 게임이라고 밝히지 않았을 때','FLAG_ISK_K_TEMPLE_EXIT=COUNTERWEIGHT':'사당에서 추 밑의 나무를 빼냈을 때','FLAG_ISK_K_TEMPLE_EXIT=SIGNAL':'사당에서 후미를 확인하고 신호했을 때','FLAG_ISK_K_TEMPLE_EXIT=FORCE_RESCUED':'사당에서 손잡이를 억지로 돌렸을 때'};
const condNote=row=>{const c=String(row[11]||'').replace(/ROUTE_ID=ROUTE_ISEKAI AND /,'').replace(/FLAG_ISK_META_KNOWLEDGE=KNOWN( AND )?/,'').replace(/BOND\([^)]*\)[<>=]+\d+( AND )?/,'').trim();if(!c)return '';return ` *(${COND[c]||c})*`;};
let out=[],curMap=null;
function line(depth,s){const q=depth?'> '.repeat(depth):'';out.push(s===''?q.trim():q+s);}

const opts=g=>(groups.get(g)||[]).filter(c=>c[18]!=='INACTIVE'&&!frozen.has(c[4])&&!uOnly(c));
function reach(id){const seen=new Set(),st=[id];while(st.length){const x=st.pop();if(!x||x.startsWith('SCREEN:'))continue;if(x.startsWith('CHOICE_GROUP:')){if(seen.has(x))continue;seen.add(x);for(const c of opts(x.slice(13)))st.push(c[13]);continue;}if(seen.has(x)||!get(x))continue;seen.add(x);st.push(get(x)[13]);}return seen;}
function firstPath(id){const path=[],seen=new Set();while(id&&!seen.has(id)&&!id.startsWith('SCREEN:')){seen.add(id);if(id.startsWith('CHOICE_GROUP:')){const o=opts(id.slice(13));path.push(id);id=o[0]?.[13];continue;}if(!get(id))break;path.push(id);id=get(id)[13];}return path;}
function joinOf(gid){const o=opts(gid.slice(13));if(o.length<2)return null;const sets=o.map(c=>reach(c[13]));const common=x=>sets.every(s=>s.has(x));for(const x of firstPath(o[0][13]))if(common(x))return x;return null;}
function visit(id,depth,stop){
 while(id){
  if(id.startsWith('SCREEN:'))return;
  if(stop&&id===stop)return;
  if(id.startsWith('CHOICE_GROUP:')){const g=id.slice(13),o=opts(g);
   if(o.length===1){line(depth,'');line(depth,`**나** ${clean(o[0][10])}`);id=o[0][13];continue;}
   const join=joinOf(id);
   line(depth,'');line(depth,'**▶ 선택**');
   o.forEach((c,i)=>{line(depth,'');line(depth,`**${i+1}. ${clean(c[10])}**`);visit(c[13],depth+1,join||stop);});
   if(!join)return;id=join;continue;}
  const row=get(id);if(!row)return;
  if(uOnly(row)){id=row[13];continue;}
  if(row[8]&&row[8]!==curMap){curMap=row[8];line(depth,'');line(depth,`*— ${mapName.get(curMap)||curMap} —*`);}
  const t=row[9]?clean(row[9]):'',type=row[5];
  const bond=(/BOND\([^)]*\)>=60/.test(row[11]||'')?' *(호감도가 높을 때)*':'')+condNote(row);
  if(type==='NARRATION'&&t){line(depth,'');line(depth,t+bond);}
  else if(type==='DIALOGUE'&&t){line(depth,'');line(depth,`**${clean(row[7])}**${bond} ${t}`);}
  else if(type==='FIELD_GATE'){line(depth,'');line(depth,`〔현장 행동〕 ${t}`);}
  else if(type==='COMBAT_GATE'){line(depth,'');line(depth,`〔전투〕 ${t}`);}
  else if(type==='STORY_PAUSE'||type==='CHAPTER_END'){line(depth,'');line(depth,`〔장 마침〕 ${t.split('\n')[0]}`);return;}
  else if(type==='INPUT_TEXT'){line(depth,'');line(depth,`〔이름 입력〕 ${t}`);}
  id=row[13];
 }
}
out.push('# '+(arg('--title')||'메인스토리 K 루트 원고 전문 (0.14.8)'));out.push('');
out.push((arg('--intro')||'이세계 주인공 루트 · 리월 1장~4장 · K1/K2 분기.')+' 게임에 설치된 순서 그대로입니다. 굵은 글씨는 말하는 사람, **▶ 선택**은 플레이어가 고르는 자리이며 번호 아래 들여쓴 부분이 그 선택의 결과입니다. 〔현장 행동〕·〔전투〕는 기존 게임 장치가 그대로 들어가는 자리입니다. *(호감도가 높을 때)* 표시가 붙은 대사는 그 동료와 친할 때 바로 아랫줄 대신 나오는 대사입니다. 선택의 결과가 끝나면 다시 왼쪽으로 돌아와 공통 흐름이 이어집니다.');
if(!arg('--intro')){out.push('');out.push('1장 끝의 선택으로 K1(각청 곁에 남음)·K2(짐꾼 곁에 남음)가 갈리고, 그 뒤 2~4장은 같은 분기로 이어집니다.');}
for(const chain of chains){out.push('');out.push('---');out.push('');out.push('## '+(TITLES[chain.id]||chain.id));curMap=null;visit(chain.entry,0,null);}
const text=out.join('\n').replace(/\n{3,}/g,'\n\n');
fs.writeFileSync(outFile||'/dev/stdout',text);
console.error('lines',out.length);
