'use strict';
// 고유명사 사전 (user, 2026-10-15: 「앞으로 고유명사 나오면 그 명사를 쓸 수 있게 어디 저장을 해두던가 해서 단어들은 그걸 이용하게 하는게
// 좋아보이는데」, after 「테이바트가 한국 공식 이름이 아닐텐데..」).
//
//   node tools/editorial/build_glossary.cjs [--yatta <dir with avatar_kr.json weapon_kr.json material_kr.json monster_kr.json food_kr.json>]
//
// tools/editorial/glossary_ko.json is the one place for proper nouns:
//  - `terms`: names chosen by hand, each with the official Korean, the English, what it is, the spellings that are wrong, and
//    where the official spelling was confirmed. Edit these by hand.
//  - `data`: every character, weapon, material, monster and dish in the official Korean game strings, English → Korean
//    (the Yatta copies of the game's text, https://gi.yatta.moe/api/v2/kr/<kind>). Rebuilt with --yatta.
// This tool also writes what follows from it, so nothing is kept twice:
//  - `display` in the glossary and the same map in source/app_glossary_v01647.js (screen text is corrected as it is drawn);
//  - docs/GLOSSARY_KO.md, the readable list.
// tests/test_glossary_v01647.cjs keeps the game to it.
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'../..'),FILE=path.join(ROOT,'tools/editorial/glossary_ko.json'),APP=path.join(ROOT,'source/app_glossary_v01647.js'),DOC=path.join(ROOT,'docs/GLOSSARY_KO.md');
const arg=k=>{const i=process.argv.indexOf(k);return i<0?null:process.argv[i+1];};
const g=JSON.parse(fs.readFileSync(FILE,'utf8'));
const sortObj=o=>Object.fromEntries(Object.entries(o).sort(([a],[b])=>a.localeCompare(b)));
const dir=arg('--yatta');
if(dir){
 const kinds={characters:'avatar',weapons:'weapon',materials:'material',monsters:'monster',foods:'food'};g.data={};
 for(const [key,file] of Object.entries(kinds)){const p=path.join(dir,file+'_kr.json');if(!fs.existsSync(p))continue;const items=Object.values(JSON.parse(fs.readFileSync(p,'utf8')).data.items),m={};
  for(const x of items){const en=String(x.route||'').trim(),ko=String(x.name||'').trim();if(!en||!ko||/^\(test\)|^\$|^\?+$/i.test(en))continue;if(!(en in m))m[en]=ko;}
  g.data[key]=sortObj(m);}
 g.sources.data={from:'https://gi.yatta.moe/api/v2/kr/{avatar,weapon,material,monster,food}',fetched:arg('--date')||new Date().toISOString().slice(0,10),counts:Object.fromEntries(Object.entries(g.data).map(([k,v])=>[k,Object.keys(v).length]))};
}
// What the screen corrects: the wrong spellings of the terms marked `display` (they stay in old code and rules, never on screen).
g.display=sortObj(Object.fromEntries(g.terms.filter(t=>t.display).flatMap(t=>t.wrong.map(w=>[w,t.ko]))));
fs.writeFileSync(FILE,JSON.stringify(g,null,1)+'\n');
// the same map in the page
if(fs.existsSync(APP)){const a=fs.readFileSync(APP,'utf8'),re=/\/\*GLOSSARY_DISPLAY\*\/[\s\S]*?\/\*END\*\//;if(!re.test(a))throw Error('app_glossary_v01647.js has no /*GLOSSARY_DISPLAY*/ … /*END*/');fs.writeFileSync(APP,a.replace(re,'/*GLOSSARY_DISPLAY*/'+JSON.stringify(g.display)+'/*END*/'));}
// the readable list
const esc=s=>String(s??'').replace(/\|/g,'\\|');
const KIND_ORDER=['세계','나라','지역','칭호','단체','장소','인물','콘텐츠','시스템','재화','아이템','원소 반응'];
const rows=[...g.terms].sort((a,b)=>(KIND_ORDER.indexOf(a.kind)-KIND_ORDER.indexOf(b.kind))||a.ko.localeCompare(b.ko));
let md=`# 고유명사 사전 (공식 한국어)

이 파일은 \`node tools/editorial/build_glossary.cjs\`가 [glossary_ko.json](../tools/editorial/glossary_ko.json)에서 만든다. 고칠 때는 JSON을 고치고 도구를 다시 돌린다.

## 쓰는 법
- 게임에 들어가는 글(데이터, 코드의 화면 문구, 이야기 원고, 업데이트 안내)에 고유명사를 쓸 때는 여기서 찾아 그대로 쓴다.
- 여기에 없는 이름은 공식 자료로 확인한 뒤 \`terms\`에 넣는다. 공식 자료는 공식 게임 문자열(Yatta), HoYoLAB 지도 지명, HoYoWiki 한국어다. 기억이나 추측으로 넣지 않는다(예: 「테이바트」는 틀렸고 공식은 「티바트」다).
- 캐릭터·무기·재료·몬스터·요리의 공식 이름은 \`data\`에 영어 → 한국어로 있다(${Object.entries(g.sources.data?.counts||{}).map(([k,n])=>k+' '+n).join(', ')}; ${g.sources.data?.fetched||''} 받음).
- \`tests/test_glossary_v01647.cjs\`가 지킨다.
  - 틀린 표기가 들어가면 막는다.
  - 게임 데이터의 몬드·리월 캐릭터, 무기, 몬스터 이름이 공식과 다르면 막는다.
  - 화면 바로잡기 표가 이 사전과 같은지 본다.
- **화면 바로잡기:** 옛 코드·규칙에 남은 표기는 화면에 그려질 때 공식 표기로 바뀐다(\`source/app_glossary_v01647.js\`). 새 글에는 처음부터 공식 표기를 쓴다.

## 고른 고유명사
| 공식 한국어 | 영어 | 종류 | 틀린 표기 | 확인한 곳 | 메모 |
| --- | --- | --- | --- | --- | --- |
`;
for(const t of rows)md+=`| ${esc(t.ko)} | ${esc(t.en)} | ${esc(t.kind)} | ${esc((t.wrong||[]).join(', '))}${t.display?' (화면에서 바로잡음)':''} | ${esc(t.source)} | ${esc(t.note||'')} |\n`;
md+=`
## 화면에서 바로잡는 표기
${Object.entries(g.display).map(([w,k])=>`- 「${w}」 → 「${k}」`).join('\n')||'- 없음'}

## 예외 (틀린 표기처럼 보이지만 그대로 둠)
${(g.allow||[]).map(a=>`- \`${a.file}\`의 「${a.text}」: ${a.why}`).join('\n')||'- 없음'}

## 게임 데이터와 공식 이름이 다른 것 (아직 게임에 나오지 않음)
${(g.knownDifferences||[]).map(d=>`- ${d.where}: 「${d.game}」 → 공식 「${d.official}」 · ${d.why}`).join('\n')||'- 없음'}
`;
fs.writeFileSync(DOC,md);
console.log(JSON.stringify({terms:g.terms.length,display:g.display,data:g.sources.data?.counts||null}));
