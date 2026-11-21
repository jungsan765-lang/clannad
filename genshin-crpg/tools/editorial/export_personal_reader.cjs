#!/usr/bin/env node
'use strict';
// Export the personal legend/affection stories (57_MOND_STORY_SCENE_DB) as a readable Korean manuscript:
//   node tools/editorial/export_personal_reader.cjs out.md --doc trv_mond|isk_mond|trv_liyue|isk_liyue [--char MOND_AMBER] [--all]
// By default only characters that have manuscript chains (tools/editorial/personal_k) are written; --all writes every character.
const path=require('path'),root=path.resolve(__dirname,'../..');
const {fs,fresh}=require(root+'/tests/helpers_v011.cjs');
const content=require(root+'/tools/editorial/compile_main_story_k.cjs').compile();
const argv=process.argv.slice(2),arg=k=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:null;},has=k=>argv.includes(k);
const outFile=argv.find((a,i)=>!a.startsWith('--')&&(i===0||!argv[i-1].startsWith('--')));
const DOC={
 trv_mond:{route:'ROUTE_TRAVELER',region:'몬드',title:'개인 이야기 원고 전문 · 여행자 루트 · 몬드 (0.14.8)',intro:'여행자 루트(원신의 여행자 · 페이몬 동행)에서 몬드 인물들과 겪는 개인 이야기입니다. 인물마다 전설 임무(동료로 맞이하는 이야기) 한 편과, 호감도가 오를 때마다 열리는 짧은 이야기 H01→H05, 그 위의 상위 이야기가 이어집니다.'},
 isk_mond:{route:'ROUTE_ISEKAI',region:'몬드',title:'개인 이야기 원고 전문 · 이세계 루트 · 몬드 (0.14.8)',intro:'이세계 주인공 루트에서 몬드 인물들과 겪는 개인 이야기입니다. 인물마다 전설 임무 한 편과 호감도 이야기 H01→H05, 그 위의 상위 이야기가 이어집니다.'},
 trv_liyue:{route:'ROUTE_TRAVELER',region:'리월',title:'개인 이야기 원고 전문 · 여행자 루트 · 리월 (0.14.8)',intro:'여행자 루트에서 리월 인물들과 겪는 개인 이야기입니다. 인물마다 전설 임무 한 편과 호감도 이야기 H01→H05가 이어집니다.'},
 isk_liyue:{route:'ROUTE_ISEKAI',region:'리월',title:'개인 이야기 원고 전문 · 이세계 루트 · 리월 (0.14.8)',intro:'이세계 주인공 루트에서 리월 인물들과 겪는 개인 이야기입니다. 인물마다 전설 임무 한 편과 호감도 이야기 H01→H05가 이어집니다.'}};
const doc=DOC[arg('--doc')];if(!doc){console.error('--doc trv_mond|isk_mond|trv_liyue|isk_liyue');process.exit(1);}
const ROUTE=doc.route,r=fresh(doc.region==='리월'?'MAP_LIYUE_HARBOR':'MAP_MOND_CITY',ROUTE),ix=r.storyIndex();
const db=r.db||require(root+'/content/db.json');
const TABLE='57_MOND_STORY_SCENE_DB';
const mapName=new Map(db['32_MAP_DB'].slice(1).map(x=>[x[0],x[2]]));
const itemName=new Map((db['14_ITEM_DB']||[]).slice(1).map(x=>[x[0],x[1]]));
const charName=new Map(db['04_CHAR_DB'].slice(1).map(x=>[x[1],x[2]]));
const charOf=d=>d.CHAR_ID||(String(d.id).match(/^(?:LEG|AFF)_(?:ISK_)?((?:MOND|LIYUE)_[A-Z]+)/)||[])[1]||'';
const manuscript=new Set(content.chains.map(c=>c.id));
const get=id=>ix.nodes.get(ROUTE+':'+id),groups=new Map();
for(const x of ix.byTable[TABLE])if(x[0]===ROUTE&&x[14]){if(!groups.has(x[14]))groups.set(x[14],[]);groups.get(x[14]).push(x);}
const frozen=new Set();const fz=items=>{for(const it of items)if(it.k==='choice')for(const o of it.options){if(o.freeze)frozen.add(o.freeze);else fz(o.items);}};content.chains.forEach(c=>fz(c.items));
const clean=t=>String(t).replace(/\{PLAYER_NAME\}/g,'(이름)').replace(/\{PLAYER\}/g,'(이름)').trim();
// Conditions that gate the whole event are explained once in the event header, not on every line.
const EVENTWIDE=/^(!?ROUTE_ID=|HEART\(|BOND_SCORE\(|!?DONE\(|AFTER_PRIOR_DAILY\(|WORLD_DAY_AFTER|FLAG\(FLAG_(LEG|ISK_LEG)_[A-Z_]+_CLEAR\)|FLAG_(LEG|ISK_LEG)_[A-Z_]+_CLEAR=|SCENE_MEMORY\(|ADULT_ROUTE_ENABLED\(|ADULT_CONTENT_ELIGIBLE\(|PROJECT_AGE_CLASS\(|CE_155_|QUEST_COST_COMMITTED=|LIYUE_PERSONAL_READY=|MENU_ACCESS=|CURRENT_MAP_ID=|PLAYER_LEVEL_STATE|FLAG_TRV_[A-Z_]*CLEAR=|FLAG_ISK_[A-Z_]*(CLEAR|UNLOCKED)=|FUTURE_PERSONAL)/;
const condOne=c=>{let m;
 if((m=/^ITEM\(([A-Z0-9_]+)\)>=(\d+)$/.exec(c)))return `${itemName.get(m[1])||m[1]} ${m[2]}개가 있을 때`;
 if((m=/^MORA>=(\d+)$/.exec(c)))return `모라 ${m[1]} 이상일 때`;
 if((m=/^FLAG\((FLAG_(?:ISK_|TRV_)?(?:RECRUIT|CARD)_[A-Z]+)\)=(TRUE|FALSE)$/.exec(c)))return m[2]==='TRUE'?'이미 동료일 때':'아직 동료가 아닐 때';
 if((m=/^(FLAG_(?:ISK_|TRV_)?(?:RECRUIT|CARD)_[A-Z]+)=(TRUE|FALSE)$/.exec(c)))return m[2]==='TRUE'?'이미 동료일 때':'아직 동료가 아닐 때';
 if((m=/^LOCAL_CHOICE\(([A-Z0-9_]+)\)=([A-Z0-9_:]+)$/.exec(c)))return '앞선 선택에 따라';
 return c;};
const condText=s=>{const parts=String(s||'').split(/\s*(?:&&|AND)\s*/).map(x=>x.trim()).filter(x=>x&&!EVENTWIDE.test(x));return parts.length?parts.map(condOne).join(', '):'';};
let out=[],curMap=null;
function line(depth,s){const q=depth?'> '.repeat(depth):'';out.push(s===''?q.trim():q+s);}
const opts=g=>(groups.get(g)||[]).filter(c=>c[18]!=='INACTIVE'&&!frozen.has(c[4]));
const isGroup=id=>id.startsWith('CHOICE_GROUP:')||id.startsWith('CONDITION_GROUP:');
const members=id=>id.startsWith('CHOICE_GROUP:')?opts(id.slice(13)).map(c=>({label:clean(c[10]),cond:condText(c[11]),next:c[13]})):opts(id.slice(16)).map(c=>({label:'',cond:condText(c[11])||'그 밖의 경우',next:c[4]}));
function reach(id){const seen=new Set(),st=[id];while(st.length){const x=st.pop();if(!x||x.startsWith('SCREEN:'))continue;if(isGroup(x)){if(seen.has(x))continue;seen.add(x);for(const m of members(x))st.push(m.next);continue;}if(seen.has(x)||!get(x))continue;seen.add(x);st.push(get(x)[13]);}return seen;}
function firstPath(id){const p=[],seen=new Set();while(id&&!seen.has(id)&&!id.startsWith('SCREEN:')){seen.add(id);if(isGroup(id)){const o=members(id);p.push(id);id=o[0]?.next;continue;}if(!get(id))break;p.push(id);id=get(id)[13];}return p;}
function joinOf(id){const o=members(id);if(o.length<2)return null;const sets=o.map(m=>reach(m.next));const common=x=>sets.every(s=>s.has(x));for(const x of firstPath(o[0].next))if(common(x))return x;return null;}
let printed=new Map(),owner='';
const brief=id=>{const row=get(id);const t=row?clean(row[9]||''):'';return t?`「${t.replace(/\s+/g,' ').slice(0,28)}…」`:'';};
const ENDS=new Set(['EVENT_END','LEGEND_END','AFFECTION_END','END','SYSTEM']);
function visit(id,depth,stop){
 while(id){
  if(id.startsWith('SCREEN:'))return;
  if(stop&&id===stop)return;
  if(printed.has(id)&&printed.get(id)!==owner){line(depth,'');line(depth,`*(→ 여기서부터 ${printed.get(id)}과 같은 흐름으로 이어진다${brief(id)?': '+brief(id):''})*`);return;}
  if(id.startsWith('CHOICE_GROUP:')){const o=members(id);printed.set(id,owner);
   if(!o.length)return;
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
   o.forEach((m,i)=>{line(depth,'');line(depth,`**${i+1}. ${m.cond}**`);owner=`${outer?outer+' → ':''}조건 ${i+1}`;visit(m.next,depth+1,join||stop);});
   owner=outer;
   if(!join)return;id=join;continue;}
  const row=get(id);if(!row)return;
  printed.set(id,owner);
  const t=row[9]?clean(row[9]):'',type=row[5];
  if(row[8]&&row[8]!==curMap&&t&&type!=='META'){curMap=row[8];line(depth,'');line(depth,`*— ${mapName.get(curMap)||curMap} —*`);}
  const cn=condText(row[11]);const note=cn?` *(${cn})*`:'';
  if(type==='NARRATION'&&t){line(depth,'');line(depth,t+note);}
  else if(type==='DIALOGUE'&&t){line(depth,'');line(depth,`**${clean(row[7])}**${note} ${t}`);}
  else if(type==='COMBAT_GATE'){line(depth,'');line(depth,`〔전투〕 ${t}`);}
  else if(type==='MENU_GATE'&&t){line(depth,'');line(depth,`〔자유 행동〕 ${t}`);}
  else if(ENDS.has(type)&&t){line(depth,'');line(depth,`〔마침〕 ${t}`);}
  id=row[13];
 }
}
const defs=[...ix.legends.values()].concat([...ix.affections.values()]).filter(d=>d.ROUTE_SCOPE===ROUTE&&charOf(d).startsWith(doc.region==='리월'?'LIYUE_':'MOND_'));
const only=arg('--char');
const chars=[...new Set(defs.map(charOf))].filter(c=>!only||c===only).filter(c=>has('--all')||defs.some(d=>charOf(d)===c&&manuscript.has(d.id)));
const rank=d=>d.kind==='LEGEND'?(/REJOIN/.test(d.id)?1:0):(m=>m?({H:10,B:20,ADULT:30}[m[1]]||40)+Number(m[2]||0)/1000:50)(/_(H|B)(\d+)$|_(ADULT)_FIRST$/.exec(d.id)?.filter(Boolean).slice(1)&&/_(H|B)(\d+)$/.exec(d.id)||/_(ADULT)_FIRST$/.exec(d.id));
const eventTitle=d=>{const ends=[...reach(d.ENTRY_NODE_ID)].map(get).filter(x=>x&&ENDS.has(x[5])&&x[9]);const m=ends.map(x=>/「([^」]+)」/.exec(x[9])?.[1]).find(Boolean);return m||'';};
out.push('# '+doc.title);out.push('');
out.push(doc.intro+' 게임에 설치된 순서 그대로입니다. 굵은 글씨는 말하는 사람이고 주인공은 **(이름)**으로 적었습니다. 주인공의 말은 게임에서 전부 선택지로 나오며, 고를 것이 하나뿐인 선택지는 **(이름)** 줄로 적었습니다. **▶ 선택**은 플레이어가 고르는 자리이며 번호 아래 들여쓴 부분이 그 선택의 결과입니다. 선택지 옆의 *(…일 때)* 표시는 그 조건에서만 나오는 선택지라는 뜻입니다. 〔자유 행동〕은 이야기가 잠시 멈추고 자유 행동으로 돌아가는 자리, 〔마침〕은 이야기가 끝나는 자리입니다. 각 이야기 제목 아래 *조건* 줄은 그 이야기가 열리는 조건입니다.');
for(const c of chars){
 out.push('');out.push('---');out.push('');out.push('## '+(charName.get(c)||c));
 const list=defs.filter(d=>charOf(d)===c).sort((a,b)=>rank(a)-rank(b)||a.id.localeCompare(b.id));
 for(const d of list){
  const title=d.kind==='LEGEND'?`전설 임무${/REJOIN/.test(d.id)?' (재합류)':''}`:(eventTitle(d)||d.id);
  const stage=d.kind==='LEGEND'?'':` · ${/_(H|B)(\d+)$/.exec(d.id)?.[0].slice(1)||(/ADULT/.test(d.id)?'성인 선택 이야기':'')}`;
  out.push('');out.push(`### ${title}${stage}${manuscript.has(d.id)?'':' *(원문 그대로 · 아직 손보지 않음)*'}`);
  const cond=[];
  if(d.kind==='LEGEND'){const items=Object.entries(JSON.parse(d.COST_ITEMS_JSON||'{}')).map(([k,n])=>`${itemName.get(k)||k} ${n}개`);if(Number(d.COST_MORA))items.unshift(`모라 ${d.COST_MORA}`);if(items.length)cond.push('준비물: '+items.join(', '));if(d.DAILY_DIALOGUE_KO)cond.push(`평소 한마디: 「${clean(d.DAILY_DIALOGUE_KO)}」`);}
  else{if(d.HEART_MIN)cond.push(`하트 ${d.HEART_MIN} 이상`);if(d.BOND_SCORE_MIN)cond.push(`호감 점수 ${d.BOND_SCORE_MIN} 이상`);if(d.PREV_EVENT_ID)cond.push(`앞 이야기(${/_(H|B)\d+$/.exec(d.PREV_EVENT_ID)?.[0].slice(1)||d.PREV_EVENT_ID})를 마친 뒤`);if(/AFTER_PRIOR_DAILY|WORLD_DAY_AFTER/.test(String(get(d.ENTRY_NODE_ID)?.[11]||'')))cond.push('하루가 지난 뒤');if(/ADULT_OPTIONAL|ADULT_FIRST/.test(d.RELATION_KIND))cond.push('성인 설정을 켠 경우에만');}
  if(cond.length){out.push('');out.push(`*조건: ${cond.join(' · ')}*`);}
  curMap=null;printed=new Map();owner='';visit(d.ENTRY_NODE_ID,0,null);
 }
}
const text=out.join('\n').replace(/\n{3,}/g,'\n\n');
fs.writeFileSync(outFile||'/dev/stdout',text);
console.error('lines',out.length,'chars',chars.length);
