'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const {fresh,fs,path,root,R,db}=require('./helpers_v011.cjs');
const text=require('../source/readable_text.js');
const legacy=fs.readFileSync(path.join(root,'source/app_legacy.js'),'utf8');
const journey=fs.readFileSync(path.join(root,'source/app_journey.js'),'utf8');
const g=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');g.installMarketContent();
const ix=g.storyIndex(),noelle=ix.nodes.get('ROUTE_ISEKAI:LEG_ISK_MOND_NOELLE_V143_FIRST_01');
assert(noelle);assert.equal(noelle[5],'CHOICE');assert.match(noelle[10],/\{PLAYER_NAME\}이라고 해/);
class Element {
 constructor(){this.children=[];this.value='';}
 append(...children){this.children.push(...children);}
 set textContent(value){this.value=String(value);}
 get textContent(){return this.value+this.children.map(x=>x.textContent??String(x)).join('');}
}
const app=fs.readFileSync(path.join(root,'source/app.js'),'utf8');
function uiFor(game){
 const context=vm.createContext({game,document:{createElement:()=>new Element(),getElementById:()=>new Element()}});context.window=context;
 // Each UI gets a fresh formatter: the literal text registry starts empty.
 vm.runInContext(fs.readFileSync(path.join(root,'source/readable_text.js'),'utf8'),context);
 vm.runInContext(legacy.split('\n')[1],context);
 const start=legacy.indexOf('function displayText(s)');vm.runInContext(legacy.slice(start,legacy.indexOf('\n',start)),context);
 vm.runInContext(journey.slice(0,journey.indexOf('const journeyMainObjective=')),context);
 context.button=()=>new Element();context.act=()=>{};
 for(const name of ['appendChoices','displayHistory']){const at=app.indexOf('function '+name+'(');vm.runInContext(app.slice(at,app.indexOf('\n',at)),context);}
 return context;
}
const context=uiFor(g);
function shown(value){context.value=value;return vm.runInContext("el('p','story',displayText(value)).textContent",context);}
const sourceRow=JSON.stringify(noelle);
for(const [name,ending]of [['민수','라고'],['수진','이라고'],['하늘','이라고'],['클라나드','라고'],['DEX','라고'],['주인공','이라고']]){
 g.s.global.PLAYER_NAME=name;const before=g.serialize();
 for(const suffix of ['이라고','라고']){
  const raw='{PLAYER_NAME}'+suffix+' 해.';
  assert.equal(text.named(raw,name),name+ending+' 해.');
  assert.equal(text.readable(raw,{name}),name+ending+' 해.');
  assert.equal(shown(raw),name+ending+' 해.');
 }
 context.target=new Element();context.choices=[noelle];
 vm.runInContext('appendChoices(target,choices)',context);
 assert.equal(context.target.textContent,'01도우러 왔어. '+name+ending+' 해.');
 assert.equal(shown('{PLAYER_NAME}입니다.'),name+'입니다.');
 assert.equal(g.serialize(),before,'formatting must not change save or relationship state');
}
assert.equal(JSON.stringify(noelle),sourceRow,'formatting must not rewrite the authored row');
// Existing player aliases, explicit placeholders, nicknames and particle cases remain valid.
assert.equal(text.readable('주인공은 주인공으로 불린다. DEX +3 / ATK +8%',{name:'수진'}),'수진은 수진으로 불린다. 민첩 +3 / 공격력 +8%');
assert.equal(text.readable('주인공이 왔다. 주인공과 함께 간다.',{name:'민수'}),'민수가 왔다. 민수와 함께 간다.');
assert.equal(text.readable('주인공으로 이동',{name:'하늘'}),'하늘로 이동');
assert.equal(text.readable('{PLAYER_NAME}이라는 이름',{name:'민수'}),'민수라는 이름');
assert.equal(text.readable('{PLAYER_NAME}라는 이름',{name:'수진'}),'수진이라는 이름');
assert.equal(text.readable('DEX가 왔다. ATK +8',{name:'DEX'}),'DEX가 왔다. 공격력 +8');
assert.equal(text.named('책의 주인공이 {PLAYER_NAME}을 만났다.','민수',{literalProtagonist:true}),'책의 주인공이 민수를 만났다.');
assert.equal(text.readable('책의 주인공이 {PLAYER_NAME}을 만났다.',{name:'민수',literalProtagonist:true}),'책의 주인공이 민수를 만났다.');
assert.equal(text.readable('책의 주인공이 왔다.',{literalProtagonist:true}),'책의 주인공이 왔다.');
assert.equal(text.literalProtagonistNodes.length,8);assert(Object.isFrozen(text.literalProtagonistNodes));
for(let i=0;i<20;i++)assert.equal(text.registerLiteralProtagonist('UNAPPROVED_'+i,'주인공이 왔다.'),false);
const literalRows=text.literalProtagonistNodes.map(id=>ix.nodes.get('ROUTE_ISEKAI:'+id)||ix.nodes.get('ROUTE_TRAVELER:'+id));
assert(literalRows.every(Boolean));
const rowsBefore=literalRows.map(r=>JSON.stringify(r)),history=literalRows.map(r=>({category:'GENERAL',speaker:r[7]||'이야기',text:g.storyDisplayText(r)}));
assert(history.every(x=>x.text.includes('주인공')&&!x.text.includes('{PLAYER_NAME}')));
function historyFirst(runtime){
 const ui=uiFor(runtime);ui.sceneHistory=history;ui.showModal=(_title,body)=>{ui.historyBody=body;};
 const before=runtime.serialize();
 // No scene or displayText call may seed the formatter before history opens.
 vm.runInContext('displayHistory()',ui);
 assert.equal(ui.historyBody.children.length,8);
 history.forEach((entry,i)=>{
  assert.equal(ui.historyBody.children[i].children[1].textContent,entry.text);
  ui.value=entry.text;
  assert.equal(vm.runInContext("el('p','story',displayText(value)).textContent",ui),entry.text,'repeat formatting must preserve the ordinary noun');
 });
 assert.equal(ui.CRPGText.readable('주인공이 왔다.',{name:'민수'}),'민수가 왔다.','normal player alias remains enabled after registration');
 assert.equal(runtime.serialize(),before,'history and formatter binding must not mutate the save');
}
const first=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');first.s.global.PLAYER_NAME='민수';historyFirst(first);
const reloaded=new R(db,JSON.parse(first.serialize()));reloaded.s.global.PLAYER_NAME='수진';historyFirst(reloaded);
assert.deepEqual(literalRows.map(r=>JSON.stringify(r)),rowsBefore,'literal preservation must not rewrite story rows');
console.log('PASS Noelle named particles, six nicknames, normal player aliases, eight literal story nouns, fresh/reload history-first and unchanged rows/saves');
