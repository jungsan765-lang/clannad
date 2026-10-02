#!/usr/bin/env node
'use strict';
// Export the installed manuscript-edition chains as a readable Korean manuscript (Markdown):
//   node tools/editorial/export_main_story_k_reader.cjs out.md --doc mond|liyue
//   node tools/editorial/export_main_story_k_reader.cjs out.md [--only ISK_M0] [--title "..."] [--intro "..."]
// Every branch is written out: choices whose options are only offered on one branch carry a note,
// rows that only appear on one branch carry the same note, and condition forks (no player choice) are
// shown as 「▶ 조건 분기」.
const path=require('path'),root=path.resolve(__dirname,'../..');
const {fs,fresh}=require(root+'/tests/helpers_v011.cjs');
const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI'),ix=r.storyIndex(),ROUTE='ROUTE_ISEKAI';
const content=require(root+'/tools/editorial/compile_main_story_k.cjs').compile();
const argv=process.argv.slice(2),arg=k=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:null;},outFile=argv.find((a,i)=>!a.startsWith('--')&&(i===0||!argv[i-1].startsWith('--')));
const DOC={
 mond:{only:'ISK_M',title:'메인스토리 몬드 전 갈래 원고 전문 (0.14.8)',
  intro:'이세계 주인공 루트 · 몬드 1장~5장 · 모든 갈래. 1장에서 엠버가 몬드를 아느냐고 묻는 첫 선택에서 「몬드… 그 이름, 알아」(K)와 「몬드? 처음 듣는 이름인데」(모름)가 갈립니다. 모름 쪽은 2장 끝에서 「토벌대에 합류」(A)와 「길드에 남는다」(B)로, A는 3장 끝 별을 따는 절벽에서 「드발린을 쫓는다」(AA)와 「다이루크 쪽으로 간다」(AB)로 다시 갈립니다. 1·2장은 한 장 안에서 갈리므로 선택지 아래에 두 갈래가 함께 적혀 있고, 3장부터는 갈래별로 장을 나누어 K → A(AA·AB) → B 순서로 실었습니다.',
  order:['ISK_M01','ISK_M02','ISK_M03_K','ISK_M04_K','ISK_M05_K','ISK_M03_A','ISK_M04_AA','ISK_M05_AA','ISK_M04_AB','ISK_M05_AB','ISK_M03_B','ISK_M04_B','ISK_M05_B'],
  parts:{ISK_M01:'1·2장 (공통 · 몬드를 「알아 / 처음 듣는 이름인데」가 한 장 안에서 갈린다)',ISK_M03_K:'K 갈래 · 1장에서 「몬드… 그 이름, 알아」 (3~5장)',ISK_M03_A:'모름·토벌대 갈래 · 2장 끝에서 「나도 같이 갈게」 (3장, 끝에서 AA/AB로 갈린다)',ISK_M04_AA:'모름·AA 갈래 · 절벽에서 「드발린! 기다려!」 (4~5장)',ISK_M04_AB:'모름·AB 갈래 · 절벽에서 「다이루크, 지금 그쪽으로 갈게!」 (4~5장)',ISK_M03_B:'모름·길드 갈래 · 2장 끝에서 「난 성에 남을게」 (3~5장)'}},
 liyue:{only:'ISK_L',title:'메인스토리 K 루트 리월 원고 전문 (0.14.8)',
  intro:'이세계 주인공 루트 · 리월 1장~4장 · K1/K2 분기. 1장 끝의 선택으로 K1(각청 곁에 남음)·K2(짐꾼 곁에 남음)가 갈리고, 그 뒤 2~4장은 같은 분기로 이어집니다.',
  order:['ISK_L01_K','ISK_L02_K1','ISK_L03_K1','ISK_L04_K1','ISK_L02_K2','ISK_L03_K2','ISK_L04_K2'],
  parts:{ISK_L01_K:'1장 (공통)',ISK_L02_K1:'K1 갈래 · 각청 곁에 남음 (2~4장)',ISK_L02_K2:'K2 갈래 · 짐꾼 곁에 남음 (2~4장)'}}};
const doc=DOC[arg('--doc')]||{only:arg('--only')||'',order:[],parts:{}};
const only=doc.only,chains=content.chains.filter(c=>c.id.startsWith(only)).sort((a,b)=>{const i=doc.order.indexOf(a.id),j=doc.order.indexOf(b.id);return (i<0?999:i)-(j<0?999:j)||a.id.localeCompare(b.id);});
const frozen=new Set();const fz=items=>{for(const it of items)if(it.k==='choice')for(const o of it.options){if(o.freeze)frozen.add(o.freeze);else fz(o.items);}};chains.forEach(c=>fz(c.items));
const db=r.db||require(root+'/content/db.json');
const mapName=new Map(db['32_MAP_DB'].slice(1).map(x=>[x[0],x[2]]));
const get=id=>ix.nodes.get(ROUTE+':'+id),groups=new Map();
for(const x of ix.byTable['55_MAIN_STORY_DB'])if(x[0]===ROUTE&&x[14]){if(!groups.has(x[14]))groups.set(x[14],[]);groups.get(x[14]).push(x);}
const TITLES={ISK_M01:'몬드 1장 · 낯선 하늘 아래 (튜토리얼)',ISK_M02:'몬드 2장 · 기사단과 두 사당 (K) / 성 안의 나날, 토벌대 소식 (모름)',ISK_M03_K:'몬드 3장 K · 벤티와 폐허, 떨어진 용',ISK_M04_K:'몬드 4장 K · 드래곤 스파인의 속삭임',ISK_M05_K:'몬드 5장 K · 돌아온 용, 신의 심장, 남쪽 길',ISK_M03_A:'몬드 3장 A · 토벌대 출정, 세 사당, 별을 따는 절벽',ISK_M04_AA:'몬드 4장 AA · 드발린의 등, 떨어진 것, 바르바토스',ISK_M05_AA:'몬드 5장 AA · 귀환, 골목의 시뇨라, 구슬 속의 사람, 리월로',ISK_M04_AB:'몬드 4장 AB · 기다림, 빈 사당, 앨리스의 구슬, 성 앞의 용',ISK_M05_AB:'몬드 5장 AB · 길드 보고, 명예 기사, 각청, 계단 아래의 강탈',ISK_M03_B:'몬드 3장 B · 길드 의뢰, 드래곤 스파인, 한천의 못',ISK_M04_B:'몬드 4장 B · 하산길의 용, 이름을 묻는 목소리',ISK_M05_B:'몬드 5장 B · 돌아온 토벌대, 명예기사, 접견실의 담보',ISK_L01_K:'1장 (공통) · 몬드에서 리월항 봉쇄선까지',ISK_L02_K1:'2장 K1 · 각청 곁의 닷새, 그리고 죽음',ISK_L02_K2:'2장 K2 · 짐꾼 곁의 닷새, 그리고 죽음',ISK_L03_K1:'3장 K1 · 기억 없는 각청과 황금옥',ISK_L03_K2:'3장 K2 · 사라진 짐꾼과 황금옥',ISK_L04_K1:'4장 K1 · 구조, 오셀, 북국은행, 이나즈마',ISK_L04_K2:'4장 K2 · 돌 틈 너머의 목소리, 장록'};
const clean=t=>String(t).replace(/\{PLAYER_NAME\}/g,'(이름)').replace(/\{PLAYER\}/g,'(이름)').trim();
const COND={'FLAG_ISK_META_KNOWLEDGE=KNOWN':'1장에서 「몬드… 그 이름, 알아」를 골랐을 때 (K)','FLAG_ISK_META_KNOWLEDGE=UNKNOWN':'1장에서 「몬드? 처음 듣는 이름인데」를 골랐을 때 (모름)','FLAG_ISK_KNOWLEDGE_DISCLOSURE=GAME_TRUTH':'1장에서 게임이라고 밝혔을 때','FLAG_ISK_KNOWLEDGE_DISCLOSURE=FRAGMENTARY':'1장에서 이름만 기억난다고 했을 때','FLAG_ISK_KNOWLEDGE_DISCLOSURE=DEFERRED':'1장에서 나중에 말하겠다고 했을 때','FLAG_ISK_KNOWLEDGE_DISCLOSURE!=GAME_TRUTH':'1장에서 게임이라고 밝히지 않았을 때','FLAG_ISK_K_TEMPLE_EXIT=COUNTERWEIGHT':'사당에서 추 밑의 나무를 빼냈을 때','FLAG_ISK_K_TEMPLE_EXIT=SIGNAL':'사당에서 후미를 확인하고 신호했을 때','FLAG_ISK_K_TEMPLE_EXIT=FORCE_RESCUED':'사당에서 손잡이를 억지로 돌렸을 때','MET(PROFILE_MOND_DILUC)=FALSE':'다이루크를 처음 만날 때','MET(PROFILE_MOND_DILUC)=TRUE':'다이루크를 이미 만났을 때'};
let curChain='';
// Conditions that hold for a whole chapter file (the branch the chapter belongs to) are not notes.
const chainWide=c=>(!/^ISK_M0[12]$/.test(curChain)&&/^FLAG_ISK_(META_KNOWLEDGE|MOND_BRANCH|EXPEDITION_FORK)[=!]/.test(c))||/^FLAG_ISK_L0\d_(LEAF|STARTED|CONTENT_GATE)=|^ACTIVE_STORY_QUEST=|EXPLICIT_RESUME_GUARD|^NEW_GAME|^ROUTE_ID=|^BOND\(/.test(c);
// A condition set by an earlier choice is described by that choice's line.
const AUTO=new Map();for(const x of ix.byTable['55_MAIN_STORY_DB'])if(x[0]===ROUTE&&x[5]==='CHOICE'&&x[18]!=='INACTIVE')for(const fx of String(x[12]||'').split(';')){const m=fx.trim().match(/^(FLAG_[A-Z0-9_]+=[A-Z0-9_]+)$/);if(m&&!AUTO.has(m[1])){const l=clean(x[10]).replace(/\s+/g,' ');AUTO.set(m[1],`앞서 「${l.length>26?l.slice(0,26)+'…':l}」를 골랐을 때`);}}
const condText=s=>{const parts=String(s||'').split(/\s+AND\s+/).map(x=>x.trim()).filter(x=>x&&!chainWide(x));if(!parts.length)return '';return parts.map(c=>COND[c]||AUTO.get(c)||c).join(', ');};
const condNote=row=>{const c=condText(row[11]);return c?` *(${c})*`:'';};
let out=[],curMap=null;
function line(depth,s){const q=depth?'> '.repeat(depth):'';out.push(s===''?q.trim():q+s);}
const opts=g=>(groups.get(g)||[]).filter(c=>c[18]!=='INACTIVE'&&!frozen.has(c[4]));
const isGroup=id=>id.startsWith('CHOICE_GROUP:')||id.startsWith('CONDITION_GROUP:');
const members=id=>id.startsWith('CHOICE_GROUP:')?opts(id.slice(13)).map(c=>({label:clean(c[10]),cond:condText(c[11]),next:c[13]})):opts(id.slice(16)).map(c=>({label:'',cond:condText(c[11]),next:c[4]}));
function reach(id){const seen=new Set(),st=[id];while(st.length){const x=st.pop();if(!x||x.startsWith('SCREEN:'))continue;if(isGroup(x)){if(seen.has(x))continue;seen.add(x);for(const m of members(x))st.push(m.next);continue;}if(seen.has(x)||!get(x))continue;seen.add(x);st.push(get(x)[13]);}return seen;}
function firstPath(id){const path=[],seen=new Set();while(id&&!seen.has(id)&&!id.startsWith('SCREEN:')){seen.add(id);if(isGroup(id)){const o=members(id);path.push(id);id=o[0]?.next;continue;}if(!get(id))break;path.push(id);id=get(id)[13];}return path;}
function joinOf(id){const o=members(id);if(o.length<2)return null;const sets=o.map(m=>reach(m.next));const common=x=>sets.every(s=>s.has(x));for(const x of firstPath(o[0].next))if(common(x))return x;return null;}
// printed: node → label of the choice under which it was first written, so a later option that
// flows into an earlier option's tail says so instead of repeating the whole tail.
let printed=new Map(),owner='',suppress='';
const brief=id=>{const row=get(id);const t=row?clean(row[9]||''):'';return t?`「${t.replace(/\s+/g,' ').slice(0,28)}…」`:'';};
function visit(id,depth,stop){
 while(id){
  if(id.startsWith('SCREEN:'))return;
  if(stop&&id===stop)return;
  if(printed.has(id)&&printed.get(id)!==owner){line(depth,'');line(depth,`*(→ 여기서부터 ${printed.get(id)}과 같은 흐름으로 이어진다${brief(id)?': '+brief(id):''})*`);return;}
  if(id.startsWith('CHOICE_GROUP:')){const o=members(id);printed.set(id,owner);
   if(o.length===1){line(depth,'');line(depth,`**(이름)**${o[0].cond?` *(${o[0].cond})*`:''} ${o[0].label}`);id=o[0].next;continue;}
   const join=joinOf(id);
   line(depth,'');line(depth,'**▶ 선택**');
   const outer=owner;
   o.forEach((m,i)=>{line(depth,'');line(depth,`**${i+1}. ${m.label}**${m.cond?` *(${m.cond})*`:''}`);owner=`${outer?outer+' → ':''}${i+1}번 선택`;visit(m.next,depth+1,join||stop);});
   owner=outer;
   if(!join)return;id=join;continue;}
  if(id.startsWith('CONDITION_GROUP:')){const o=members(id);const join=joinOf(id);printed.set(id,owner);
   line(depth,'');line(depth,'**▶ 조건 분기** *(선택이 아니라 앞선 상황에 따라 갈린다)*');
   const outer=owner;
   o.forEach((m,i)=>{line(depth,'');line(depth,`**${i+1}. ${m.cond||'그 밖의 경우'}**`);owner=`${outer?outer+' → ':''}조건 ${i+1}`;suppress=m.cond;visit(m.next,depth+1,join||stop);});
   owner=outer;
   if(!join)return;id=join;continue;}
  const row=get(id);if(!row)return;
  printed.set(id,owner);
  const t=row[9]?clean(row[9]):'',type=row[5];
  if(row[8]&&row[8]!==curMap&&t&&type!=='META'){curMap=row[8];line(depth,'');line(depth,`*— ${mapName.get(curMap)||curMap} —*`);}
  let cn=condNote(row);if(suppress&&cn===` *(${suppress})*`)cn='';suppress='';
  const bond=(/BOND\([^)]*\)>=60/.test(row[11]||'')?' *(호감도가 높을 때)*':'')+cn;
  if(type==='NARRATION'&&t){line(depth,'');line(depth,t+bond);}
  else if(type==='DIALOGUE'&&t){line(depth,'');line(depth,`**${clean(row[7])}**${bond} ${t}`);}
  else if(type==='FIELD_GATE'){line(depth,'');line(depth,`〔현장 행동〕 ${t}`);}
  else if(type==='COMBAT_GATE'){line(depth,'');line(depth,`〔전투〕 ${t}`);}
  else if(type==='STORY_PAUSE'||type==='CHAPTER_END'){line(depth,'');line(depth,`〔장 마침〕 ${t.split('\n')[0]}`);return;}
  else if(type==='INPUT_TEXT'){line(depth,'');line(depth,`〔이름 입력〕 ${t}`);}
  id=row[13];
 }
}
out.push('# '+(arg('--title')||doc.title||'메인스토리 원고 전문 (0.14.8)'));out.push('');
out.push((arg('--intro')||doc.intro||'')+' 게임에 설치된 순서 그대로입니다. 굵은 글씨는 말하는 사람이고 주인공은 **(이름)**으로 적었습니다. 주인공의 말은 게임에서 전부 선택지로 나오며, 고를 것이 하나뿐인 선택지는 **(이름)** 줄로 적었습니다. **▶ 선택**은 플레이어가 고르는 자리이며 번호 아래 들여쓴 부분이 그 선택의 결과입니다. 선택지나 대사 옆의 *(…일 때)* 표시는 그 조건에서만 나오는 선택지·대사라는 뜻입니다. 〔전투〕는 전투가 벌어지는 자리, 〔장 마침〕은 장이 끝나고 자유 행동으로 돌아가는 자리입니다. 선택의 결과가 끝나면 다시 왼쪽으로 돌아와 공통 흐름이 이어집니다.');
let curPart=null;
for(const chain of chains){curChain=chain.id;if(doc.parts[chain.id]&&doc.parts[chain.id]!==curPart){curPart=doc.parts[chain.id];out.push('');out.push('---');out.push('');out.push('## '+curPart);}out.push('');out.push('---');out.push('');out.push('### '+(TITLES[chain.id]||chain.id));curMap=null;printed=new Map();owner='';visit(chain.entry,0,null);}
const text=out.join('\n').replace(/\n{3,}/g,'\n\n');
fs.writeFileSync(outFile||'/dev/stdout',text);
console.error('lines',out.length);
