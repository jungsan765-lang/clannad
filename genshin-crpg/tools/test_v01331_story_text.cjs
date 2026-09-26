'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),db=JSON.parse(fs.readFileSync(path.join(root,'content/db.json'),'utf8'));
const tables=['55_MAIN_STORY_DB','57_MOND_STORY_SCENE_DB'];
const rows=[];
for(const table of tables){const h=db[table][0],i=Object.fromEntries(h.map((x,n)=>[x,n]));for(const r of db[table].slice(1))if(r&&r[i.ROUTE_ID]==='ROUTE_TRAVELER')rows.push({table,row:r,i});}
const byNode=id=>{const x=rows.find(x=>x.row[x.i.NODE_ID]===id);assert(x,'missing '+id);return x;};
assert(!/페이몬|여행자/.test(byNode('TRV_M01_A002').row[byNode('TRV_M01_A002').i.TEXT_KO]),'Amber must not know either name before introduction');
assert.match(byNode('TRV_M01_A003').row[byNode('TRV_M01_A003').i.TEXT_KO],/난 페이몬이야/);
const bannedVisible=/(?:실제 SAVE|해당 SAVE|플레이어가 과거 선택|CHOICE_GROUP:|SCREEN:|FLAG_|ROUTE_|NODE_ID|해금된 카드|다음 스토리 노드|사용자가 수락|37\/38 데이터|44 영구 파티|기존 전투 데이터대로|실제 승리 이전|퀘스트 완료·|호감도 가감|하트는 반복|A\/B 외에는 이벤트 진입|같은 사건으로 합류|필수 경로는 같다|카드만 1회 해금)/;
const leaks=rows.filter(x=>x.row[x.i.NODE_TYPE]!=='META'&&bannedVisible.test(String(x.row[x.i.TEXT_KO]||''))).map(x=>({table:x.table,node:x.row[x.i.NODE_ID],text:x.row[x.i.TEXT_KO]}));
assert.deepEqual(leaks,[],'player-visible technical story prose remains');
const indirect=/(?:다고|라고|겠다고|았다고|었다고|한다고)\s*(?:말한다|답한다|알린다|전한다|설명한다|되묻는다)|(?:에게|한테).{0,30}(?:말한다|답한다|알린다|전한다|설명한다|묻는다|되묻는다)$/;
const indirectChoices=rows.filter(x=>x.row[x.i.NODE_TYPE]==='CHOICE'&&x.row[x.i.SPEAKER_REF]==='PLAYER_TRAVELER'&&indirect.test(String(x.row[x.i.CHOICE_LABEL]||''))).map(x=>({node:x.row[x.i.NODE_ID],label:x.row[x.i.CHOICE_LABEL]}));
assert.deepEqual(indirectChoices,[],'traveler speech is still written as third-person reporting');
for(const id of ['TRV_M02_N157','TRV_M02_N265','TRV_M02_N274','TRV_M02_N357'])assert(!/^\s*\[고정 전투/.test(String(byNode(id).row[byNode(id).i.TEXT_KO]||'')),id);
const changeReport=JSON.parse(fs.readFileSync(path.join(root,'reports/v01331_step12_0/story-text-changes.json'),'utf8'));assert(changeReport.count>=50);
console.log(JSON.stringify({passed:true,changed:changeReport.count,technicalLeaks:leaks.length,indirectChoices:indirectChoices.length}));
