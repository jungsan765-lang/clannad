'use strict';
const assert=require('node:assert/strict'),{fresh,c,fs,path,vm,root,R,db}=require('./helpers_v011.cjs');
vm.runInContext(fs.readFileSync(path.join(root,'source/readable_text.js'),'utf8'),c);
vm.runInContext(fs.readFileSync(path.join(root,'source/inventory_presenter.js'),'utf8'),c);
const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI'),ix=r.storyIndex(),errors=[],technical=[];let count=0,choices=0;
for(const [table,rows]of Object.entries(ix.byTable))for(const row of rows){
 if(!String(row[1]).includes('MOND')||row[18]!=='ACTIVE')continue;count++;if(row[5]==='CHOICE')choices++;
 try{c.CRPGRuntime.StoryParser.parseEffects(row[12]);c.CRPGRuntime.StoryParser.parseCondition(row[11]);}catch(e){errors.push([row[4],e.message]);}
 const next=String(row[13]||'');if(next&&!/^(SCREEN:|RETURN:|END$|PAUSE$|HUB$)/.test(next)){
  const group=next.match(/^(?:CHOICE_GROUP|CONDITION_GROUP):(.+)$/);if(group){if(!rows.some(x=>x[0]===row[0]&&x[14]===group[1]&&x[18]==='ACTIVE'))errors.push([row[4],'missing group '+next]);}else if(!ix.nodes.has(row[0]+':'+next))errors.push([row[4],'missing next '+next]);
 }
 if(!['META','EVENT'].includes(row[5])){const text=c.CRPGText.readable(row[9]+' '+(row[10]||''),{name:'민수'});if(/주인공|\b(?:DEX|ATK|DEF|SPD)\b|다음 이야기 입력|기존 성인 루트 허용/.test(text))technical.push([row[4],text.slice(0,130)]);}
}
assert.deepEqual(errors,[],'all Mond links/commands/conditions must be connected');assert.deepEqual(technical,[],'story surface cannot leak internal prose');
// All removed cameos stay loadable; new paths are optional and never grant their contacts.
for(const id of ['ISK_M05_AA_129','ISK_M05_AA_155','ISK_M05_AA_164','ISK_M05_AA_178','ISK_M05_AA_194','ISK_M05_AA_212','ISK_M05_AA_DEPART_DIRECT']){
 const s=JSON.parse(r.serialize());Object.assign(s.global,{CURRENT_STORY_NODE_ID:id,STORY_CURSOR_NODE_ID:id,PENDING_CHOICE_GROUP_ID:'',STORY_WAITING:false});assert.doesNotThrow(()=>new R(db,s).serialize());
}
const text=c.CRPGText;assert.equal(text.readable('주인공은 주인공으로 불린다. DEX +3 / ATK +8%',{name:'수진'}),'수진은 수진으로 불린다. 민첩 +3 / 공격력 +8%');assert.equal(text.readable('주인공이 왔다. 주인공과 함께 간다.',{name:'민수'}),'민수가 왔다. 민수와 함께 간다.');assert.equal(text.readable('주인공으로 이동',{name:'하늘'}),'하늘로 이동');
const items=c.CRPGInventoryPresenter.create(r.db),itemIssues=[];let itemCount=0;
for(const row of [...r.rows('14_ITEM_DB').map(x=>({item:x[0],quantity:1})),...r.rows('16_EQUIP_DB').map(x=>({equip:x[0],slot:'AUDIT',quantity:1,enhance:10}))]){const d=items.itemDetail(row);const shown=text.readable(JSON.stringify([d.description,d.effect,d.fields]),{name:'민수'});if(/\b(?:DEX|ATK|DEF|SPD|MAX_HP|STATUS_[A-Z0-9_]+)\b/.test(shown))itemIssues.push(row.item||row.equip);itemCount++;}
assert.deepEqual(itemIssues,[]);
const report={storyNodes:count,choices,itemAndEquipmentDefinitions:itemCount,brokenLinks:errors.length,technicalStoryText:technical.length,oldCursors:7};fs.mkdirSync(root+'/reports/mond-v01344',{recursive:true});fs.writeFileSync(path.join(root,'reports/mond-v01344/content-audit.json'),JSON.stringify(report,null,2));console.log('PASS '+JSON.stringify(report));
