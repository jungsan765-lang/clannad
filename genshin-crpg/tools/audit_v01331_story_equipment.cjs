'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),db=JSON.parse(fs.readFileSync(path.join(root,'content/db.json'),'utf8'));
const rowObj=(table,row)=>Object.fromEntries((db[table][0]||[]).map((h,i)=>[h,row[i]??'']));
const tables=Object.keys(db);
console.log('TABLE_KEYS '+JSON.stringify(tables.filter(k=>/EQUIP|RECIPE|STOCK|MERCHANT|SHOP|STORY/.test(k))));
for(const t of ['55_MAIN_STORY_DB','57_MOND_STORY_SCENE_DB','16_EQUIP_DB']){
 console.log('\nHEADER '+t+' '+JSON.stringify(db[t]?.[0]||[]));
}
const storyTables=['55_MAIN_STORY_DB','57_MOND_STORY_SCENE_DB'];
const suspicious=[];
const leak=/(?:\[메인 화면|메인 임무 계속하기|서브임무:|실제 SAVE|다음 스토리 노드|해금된 카드|해금 조건|CHOICE_GROUP|SCREEN:|FLAG_|ROUTE_|NODE_ID|노드(?:를|가|로|에서)|사용자가 수락|돌아오기:|카드 목록·소지품)/i;
const indirect=/(?:에게|한테).{0,30}(?:알았다고|말했다고|대답했다고|묻는다고|전한다고|말한다|대답한다|묻는다)|(?:알았다고|말했다고|대답했다고|묻는다고) 한다/;
const meta=/^(?:메인 화면|메인 임무|서브임무|파티|카드 목록|소지품|지도|저장|돌아오기)\s*[:—]/;
for(const table of storyTables){
 const h=db[table][0],idx=Object.fromEntries(h.map((x,i)=>[x,i]));
 for(let n=1;n<db[table].length;n++){
  const r=db[table][n];if(!r||r[idx.ROUTE_ID]!=='ROUTE_TRAVELER')continue;
  const text=String(r[idx.TEXT_KO]||''),speaker=String(r[idx.SPEAKER_NAME]||''),ref=String(r[idx.SPEAKER_REF]||'');
  const reasons=[];if(leak.test(text)||meta.test(text))reasons.push('SYSTEM_LEAK');if(indirect.test(text)&&(speaker==='여행자'||/TRAVELER|PLAYER/.test(ref)))reasons.push('TRAVELER_INDIRECT');
  if(reasons.length)suspicious.push({table,row:n+1,node:r[idx.NODE_ID],quest:r[idx.QUEST_ID],arc:r[idx.ARC_ID],type:r[idx.NODE_TYPE],speaker,ref,text,reasons});
 }
}
console.log('\nSUSPICIOUS_STORY '+JSON.stringify(suspicious,null,2));
for(const table of storyTables){
 const h=db[table][0],idx=Object.fromEntries(h.map((x,i)=>[x,i]));
 const rows=db[table].slice(1).filter(r=>r&&r[idx.ROUTE_ID]==='ROUTE_TRAVELER'&&/몬드|MOND|TRV_M0/.test(String(r[idx.ARC_ID]||'')+' '+String(r[idx.QUEST_ID]||'')+' '+String(r[idx.NODE_ID]||'')));
 const counts={};for(const r of rows){const k=String(r[idx.SPEAKER_NAME]||'')+'|'+String(r[idx.SPEAKER_REF]||'');counts[k]=(counts[k]||0)+1;}
 console.log('\nSPEAKER_FREQ '+table+' '+JSON.stringify(counts,null,2));
 console.log('\nPAIMON_AMBER_CONTEXT '+table+' '+JSON.stringify(rows.filter(r=>/페이몬|엠버/.test(String(r[idx.TEXT_KO]||''))||/페이몬|엠버/.test(String(r[idx.SPEAKER_NAME]||''))).slice(0,120).map(r=>({node:r[idx.NODE_ID],type:r[idx.NODE_TYPE],speaker:r[idx.SPEAKER_NAME],ref:r[idx.SPEAKER_REF],text:r[idx.TEXT_KO]})),null,2));
}

for(const table of storyTables){
 const h=db[table][0],idx=Object.fromEntries(h.map((x,i)=>[x,i]));
 const rows=db[table].slice(1).filter(r=>r&&r[idx.ROUTE_ID]==='ROUTE_TRAVELER');
 console.log('\nTRAVELER_LINES '+table+' '+JSON.stringify(rows.filter(r=>String(r[idx.SPEAKER_REF]||'')==='PLAYER_TRAVELER').map(r=>({node:r[idx.NODE_ID],type:r[idx.NODE_TYPE],speaker:r[idx.SPEAKER_NAME],ref:r[idx.SPEAKER_REF],text:r[idx.TEXT_KO]})),null,2));
 console.log('\nNPC_PAIMON_MENTIONS '+table+' '+JSON.stringify(rows.filter(r=>String(r[idx.SPEAKER_REF]||'')!=='PLAYER_TRAVELER'&&String(r[idx.SPEAKER_REF]||'')!=='ENTITY_PAIMON'&&r[idx.NODE_TYPE]==='DIALOGUE'&&/페이몬/.test(String(r[idx.TEXT_KO]||''))).map(r=>({node:r[idx.NODE_ID],speaker:r[idx.SPEAKER_NAME],ref:r[idx.SPEAKER_REF],text:r[idx.TEXT_KO]})),null,2));
 console.log('\nVISIBLE_META_TEXT '+table+' '+JSON.stringify(rows.filter(r=>r[idx.NODE_TYPE]!=='META'&&/(?:메인 화면|메인 임무|서브임무|실제 SAVE|다음 스토리 노드|사용자|해금된 카드|해금 조건|CHOICE_GROUP|SCREEN:|FLAG_|ROUTE_|NODE_ID|버튼|메뉴로 복귀|파티:|카드 목록)/i.test(String(r[idx.TEXT_KO]||''))).map(r=>({node:r[idx.NODE_ID],type:r[idx.NODE_TYPE],speaker:r[idx.SPEAKER_NAME],text:r[idx.TEXT_KO]})),null,2));
}


for(const table of storyTables){
 const h=db[table][0],idx=Object.fromEntries(h.map((x,i)=>[x,i]));
 const rows=db[table].slice(1).filter(r=>r&&r[idx.ROUTE_ID]==='ROUTE_TRAVELER');
 console.log('\nTRAVELER_CHOICES '+table+' '+JSON.stringify(rows.filter(r=>String(r[idx.SPEAKER_REF]||'')==='PLAYER_TRAVELER'&&r[idx.NODE_TYPE]==='CHOICE').map(r=>({node:r[idx.NODE_ID],arc:r[idx.ARC_ID],quest:r[idx.QUEST_ID],label:r[idx.CHOICE_LABEL],next:r[idx.NEXT_NODE_ID],pre:r[idx.PRECONDITION]})),null,2));
}

const relevantKeys=tables.filter(k=>/EQUIP|RECIPE|STOCK|MERCHANT|SHOP/.test(k));
for(const t of relevantKeys){console.log('\nTABLE '+t+' HEADER '+JSON.stringify(db[t][0]||[]));const rows=db[t].slice(1);const picked=rows.filter(r=>JSON.stringify(r).includes('리월')||JSON.stringify(r).includes('몬드')||String(r?.[0]||'').startsWith('EQ_')||String(r?.[0]||'').startsWith('REC_')||String(r?.[0]||'').startsWith('STK_'));console.log('ROWS '+t+' '+JSON.stringify(picked.slice(0,250),null,2));}


const items=db['14_ITEM_DB']||[];
console.log('\nLIYUE_MATERIAL_MATCHES '+JSON.stringify(items.slice(1).filter(r=>/(콜|라피스|COR|LAPIS|리월)/i.test(JSON.stringify(r))).map(r=>r.slice(0,Math.min(r.length,20))),null,2));


for(const table of storyTables){
 const h=db[table][0],idx=Object.fromEntries(h.map((x,i)=>[x,i]));
 const rows=db[table].slice(1).filter(r=>r&&r[idx.ROUTE_ID]==='ROUTE_TRAVELER'&&r[idx.NODE_TYPE]!=='META');
 console.log('\nTRAVELER_STRUCTURAL_TEXT '+table+' '+JSON.stringify(rows.filter(r=>['MENU_GATE','CHAPTER_END'].includes(r[idx.NODE_TYPE])||/^\s*\[/.test(String(r[idx.TEXT_KO]||''))).map(r=>({node:r[idx.NODE_ID],type:r[idx.NODE_TYPE],text:r[idx.TEXT_KO],next:r[idx.NEXT_NODE_ID]})),null,2));
}
