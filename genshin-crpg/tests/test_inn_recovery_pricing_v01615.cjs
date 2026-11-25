'use strict';
// Runs the native shop action and the existing inn renderer. No live account is used.
const assert=require('node:assert/strict');
const {fresh,R,db,fs,path,root,vm}=require('./helpers_v011.cjs');
const copy=x=>JSON.parse(JSON.stringify(x)),PLAYER='PLAYER_CUSTOM',TEAM=['MOND_AMBER','MOND_KAEYA','MOND_LISA'];
const INNS=[['MAP_MOND_CITY','EVT_SCHEDULE_MRC_MOND_INN','STK_INN_MOND',1],['MAP_LIYUE_HARBOR','EVT_SCHEDULE_MRC_LIYUE_INN','STK_INN_LIYUE',140/120]];
let passed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
function inn(index=0,levels=[20,20,20,20]){
 const [map,place,stock]=INNS[index],r=fresh(map);if(index)r.s.flags.FLAG_CRPG_LIYUE_HARBOR_VISITED=true;
 r.adminApply({op:'level',target:PLAYER,value:levels[0]});
 for(const [i,id]of TEAM.entries()){r.adminApply({op:'recruit',char:id});r.adminApply({op:'level',target:id,value:levels[i+1]});r.action('PARTY',{char:id,slot:i+2});}
 r.action('PLACE_ENTER',{place,mode:'SHOP'});return {r,row:r.row('19_SHOP_STOCK_DB',stock),stock,place};
}
function hp(r,id,ratio){if(id===PLAYER)r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX*ratio;else r.s.chars[id].hp=r.character(id).maxHp*ratio;}
function hpAll(r,ratio){for(const id of [PLAYER,...TEAM])hp(r,id,ratio);}
function unchangedFailure(r,type,params,pattern){const before=r.serialize();assert.throws(()=>r.action(type,params),e=>!pattern||pattern.test(e.message));assert.equal(r.serialize(),before);}
function intent(r,type,params){return {id:r.s.global.SAVE_ID+':'+(r.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:r.s.global.SAVE_REVISION,type,...params};}

check('only each target recovery costs scale with level and lost HP; regional rounding is per target',()=>{
 for(let region=0;region<2;region++)for(const [level,costs]of [[1,[[20,28,36],[24,36,44]]],[20,[[20,180,340],[24,212,400]]],[60,[[20,500,980],[24,584,1144]]]]){
  const {r,row}=inn(region,[level,level,level,level]);
  for(const [i,ratio]of [1,.5,0].entries()){hpAll(r,ratio);const q=r.innRecoveryQuote(row);assert.equal(q.totalLevel,4*level);assert.equal(q.targets.length,4);assert.equal(q.cost,costs[region][i]);assert.equal(q.roomCost,region?24:20);assert.equal(q.cost-q.roomCost,q.targets.reduce((n,t)=>n+t.recoveryCost,0));assert.equal(r.stockPrice(row),q.cost);}
 }
});

check('integer recovery fees never gain an extra Mora from floating-point lost-HP subtraction',()=>{
 const r=fresh();r.adminApply({op:'level',target:PLAYER,value:6});const max=r.player().maxHp;assert.equal(max,1020);r.s.global.PLAYER_HP_CURRENT=max-85;
 const mond=r.innRecoveryQuote(r.row('19_SHOP_STOCK_DB','STK_INN_MOND'));assert.equal(mond.targets[0].recoveryCost,2);assert.equal(mond.cost,22);
 r.adminApply({op:'level',target:PLAYER,value:2});assert.equal(r.player().maxHp,679);r.s.global.PLAYER_HP_CURRENT=679-291;
 const liyue=r.innRecoveryQuote(r.row('19_SHOP_STOCK_DB','STK_INN_LIYUE'));assert.equal(liyue.targets[0].recoveryCost,4);assert.equal(liyue.cost,28);
});

check('mixed levels, a dead ally, injury and a reserve use only active real targets',()=>{
 const {r,row}=inn(0,[10,20,30,40]);hp(r,PLAYER,1);hp(r,TEAM[0],.5);hp(r,TEAM[1],0);hp(r,TEAM[2],.75);
 r.adminApply({op:'recruit',char:'MOND_BARBARA'});r.adminApply({op:'level',target:'MOND_BARBARA',value:60});r.s.chars.MOND_BARBARA.hp=0;
 const q=r.innRecoveryQuote(row);assert.equal(q.totalLevel,100);assert.equal(q.weightedHpLoss,50);assert.equal(q.cost,220);assert.deepEqual(copy(q.targets.map(t=>t.recoveryCost)),[0,40,120,40]);assert(!q.targets.some(t=>t.owner==='MOND_BARBARA'));
 const before=r.s.chars.MOND_BARBARA.hp;r.s.global.MORA=q.cost;const out=r.action('BUY',{stock:row[0]}).result;
 assert.equal(out.cost,220);assert.deepEqual(copy(out.recovery),copy(q));assert.equal(r.s.global.MORA,0);assert.equal(r.s.chars.MOND_BARBARA.hp,before);
 for(const id of TEAM)assert.equal(r.s.chars[id].hp,r.character(id).maxHp);assert.equal(r.s.global.PLAYER_HP_CURRENT,r.s.global.PLAYER_HP_MAX);
});

check('healthy high-level members never inflate another target low-level recovery fee',()=>{
 const alone=fresh();alone.adminApply({op:'level',target:PLAYER,value:10});hp(alone,PLAYER,.5);assert.equal(alone.stockPrice(alone.row('19_SHOP_STOCK_DB','STK_INN_MOND')),40);
 const {r,row}=inn(0,[60,10,60,60]);hp(r,TEAM[0],.5);assert.equal(r.stockPrice(row),40);assert.deepEqual(copy(r.innRecoveryQuote(row).targets.map(t=>t.recoveryCost)),[0,20,0,0]);
 r.action('PARTY_REMOVE',{slot:3});r.action('PARTY_REMOVE',{slot:4});assert.equal(r.stockPrice(row),40);assert.equal(r.innRecoveryQuote(row).targets.length,2);
 hp(r,TEAM[0],1);hp(r,PLAYER,.5);assert.equal(r.stockPrice(row),140);assert.deepEqual(copy(r.innRecoveryQuote(row).targets.map(t=>t.recoveryCost)),[120,0]);
});

check('summons, unknown entries, inactive members and duplicate sources cannot inflate the quote',()=>{
 const {r,row}=inn();hpAll(r,.5);const expected=copy(r.innRecoveryQuote(row));
 r.s.party.push({active:true,type:'SUMMON',source:'MOND_BARBARA'},{active:true,type:'CHAR',source:'NOT_A_CHARACTER'},{active:false,type:'CHAR',source:'MOND_BARBARA'},{...r.s.party[1]});
 assert.deepEqual(copy(r.innRecoveryQuote(row)),expected);
});

check('full HP pays only the fixed room fee and retains the existing eight-hour stay',()=>{
 const {r,row}=inn();r.s.global.WORLD_TIME='20:30';const day=r.s.global.WORLD_DAY;r.s.global.MORA=20;
 const out=r.action('BUY',{stock:row[0],quantity:1}).result;assert.equal(out.cost,20);assert.equal(out.recovery.targets.every(t=>t.recoveryCost===0),true);assert.equal(out.minutes,480);assert.equal(out.recovered,true);
 assert.equal(r.s.global.WORLD_DAY,day+1);assert.equal(r.s.global.WORLD_TIME,'04:30');assert.equal(r.s.placeVisit,null);assert.equal(r.s.global.SCREEN_MODE,'LOCATION');
});

check('removing an injured member lowers the bill but cannot heal that member on rejoining',()=>{
 const {r,row}=inn();hp(r,TEAM[0],.25);const injured=r.s.chars[TEAM[0]].hp;assert.equal(r.stockPrice(row),80);
 r.action('PARTY_REMOVE',{slot:2});assert.equal(r.stockPrice(row),20);r.s.global.MORA=20;r.action('BUY',{stock:row[0]});assert.equal(r.s.chars[TEAM[0]].hp,injured);
 r.action('PARTY',{char:TEAM[0],slot:2});assert.equal(r.s.chars[TEAM[0]].hp,injured);r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_INN',mode:'SHOP'});assert.equal(r.stockPrice(row),80);
});

check('different maximum HP at the same level has the same fee for the same lost-HP percentage',()=>{
 const {r,row}=inn();hp(r,TEAM[0],.5);const amberMax=r.character(TEAM[0]).maxHp,price=r.stockPrice(row);
 r.adminApply({op:'recruit',char:'MOND_DILUC'});r.adminApply({op:'level',target:'MOND_DILUC',value:20});r.action('PARTY_REPLACE',{char:'MOND_DILUC',slot:2});hp(r,'MOND_DILUC',.5);
 assert.notEqual(r.character('MOND_DILUC').maxHp,amberMax);assert.equal(r.stockPrice(row),price);assert.equal(r.innRecoveryQuote(row).weightedHpLoss,10);
});

check('displayed stock price, affordability, direct debit and receipt use the same pre-heal quote',()=>{
 for(let region=0;region<2;region++){
  const {r,row}=inn(region);hpAll(r,.5);const q=r.innRecoveryQuote(row);r.s.global.MORA=q.cost-1;
  const offer=r.placeStocks().find(x=>x.row[0]===row[0]),view=r.view().stocks.find(x=>x.row[0]===row[0]);assert.equal(offer.price,q.cost);assert.equal(view.price,q.cost);assert.equal(offer.row[5],INNS[region][3]*120);assert.match(offer.reason,/모라가 부족/);assert.match(view.reason,/모라가 부족/);
  unchangedFailure(r,'BUY',{stock:row[0]},/모라가 부족/);r.s.global.MORA=q.cost;assert.equal(r.stockReason(row),'');
  const before=r.s.global.MORA,out=r.action('BUY',{stock:row[0]}).result;assert.equal(before-r.s.global.MORA,q.cost);assert.equal(out.cost,q.cost);assert.deepEqual(copy(out.recovery),copy(q));assert.equal(out.recovery.targets[0].lostHpRatio,.5);
 }
});

check('invalid lodging quantities fail before either direct-buy or transactional resource mutation',()=>{
 const {r,row}=inn();hpAll(r,0);r.s.global.MORA=100000;
 for(const quantity of [0,-1,2,.5,'1']){unchangedFailure(r,'BUY',{stock:row[0],quantity});const before=r.serialize();assert.throws(()=>r.buy(row[0],quantity));assert.equal(r.serialize(),before);}
 assert.equal(r.s.global.SHOP_STOCK_USAGE_STATE,'{}');assert.equal(r.s.global.PLAYER_HP_CURRENT,0);
});

check('HP and party changes reprice the current visit; settled and old receipts never pay twice',()=>{
 let {r,row}=inn();const full=r.stockPrice(row);hp(r,TEAM[0],0);assert(r.stockPrice(row)>full);
 r.adminApply({op:'recruit',char:'MOND_BARBARA'});r.adminApply({op:'level',target:'MOND_BARBARA',value:1});r.action('PARTY_REPLACE',{char:'MOND_BARBARA',slot:2});assert.equal(r.innRecoveryQuote(row).totalLevel,61);assert.equal(r.stockPrice(row),20);
 r.s.global.MORA=10000;const a=intent(r,'BUY',{stock:row[0],quantity:1}),receipt=r.transact(a),after=r.serialize();assert.deepEqual(copy(r.transact(a)),copy(receipt));assert.equal(r.serialize(),after);
 r=new R(db,JSON.parse(after));const restored=r.serialize();assert.deepEqual(copy(r.transact(a)),copy(receipt));assert.equal(r.serialize(),restored);
 // A historical paid receipt had a fixed fee and no recovery quote. Loading it cannot reprice history.
 const legacy=JSON.parse(restored),old=JSON.parse(legacy.global.LAST_ACTION_RECEIPT_JSON);old.result.cost=120;delete old.result.recovery;legacy.global.LAST_ACTION_RECEIPT_JSON=JSON.stringify(old);
 r=new R(db,legacy);const saved=r.serialize();assert.deepEqual(copy(r.transact(a)),old);assert.equal(r.serialize(),saved);
});

check('all regional inn rates remain authored and ordinary shop prices retain their fixed values',()=>{
 const {r}=inn(),rows=r.rows('19_SHOP_STOCK_DB');hpAll(r,.5);
 const regionalHalfCosts={STK_INN_MOND:180,STK_INN_LIYUE:212,STK_INN_INAZUMA:243,STK_INN_SUMERU:270,STK_INN_FONTAINE:333,STK_INN_NATLAN:302,STK_INN_NODKRAI:360,STK_INN_SNEZ:392,STK_INN_LIYUE_WANGSHU:225};
 for(const row of rows){const before=copy(row),price=r.stockPrice(row);if(row[2]==='SERVICE'&&row[3]==='SERVICE_INN_REST_8H')assert.equal(price,regionalHalfCosts[row[0]]);else assert.equal(price,Number(row[5]));assert.deepEqual(copy(row),before);}
 r.action('PLACE_LEAVE');r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_EQUIP',mode:'SHOP'});const stock=r.placeStocks().find(s=>!s.reason&&s.row[2]==='EQUIP');assert(stock);
 const price=Number(stock.row[5]),money=r.s.global.MORA,receipt=r.action('BUY',{stock:stock.row[0]}).result;assert.equal(stock.price,price);assert.equal(receipt.cost,price);assert.equal(r.s.global.MORA,money-price);assert(!receipt.recovery);
});

check('the existing inn renderer shows the live price in its amount and action button',()=>{
 class Node{constructor(tag,cls='',text=''){Object.assign(this,{tag,cls,text:String(text),children:[]});}append(...nodes){this.children.push(...nodes);}all(){return [this,...this.children.flatMap(n=>n.all())];}}
 const {r,row}=inn(1);hpAll(r,.5);const cost=r.stockPrice(row),context={game:r,DB:db,MANIFEST:{},CRPGInventoryPresenter:{create:()=>({})},busy:false,el:(...args)=>new Node(...args),actionButton:(label,type,params)=>Object.assign(new Node('button','',label),{type,params})};
 vm.createContext(context);const src=fs.readFileSync(path.join(root,'source/app_experience.js'),'utf8');vm.runInContext(src.slice(0,src.indexOf('function placeHeader('))+src.slice(src.indexOf('shop=function(p){'),src.indexOf('function costBlock(')),context);
 context.placeHeader=()=>r.currentPlace().entry;const panel=new Node('section');context.shop(panel);const nodes=panel.all();assert(nodes.some(n=>n.text===cost+' 모라 · 보유 '+r.s.global.MORA+' 모라'));const action=nodes.find(n=>n.tag==='button');assert.equal(action.text,'숙박하기 · '+cost+' 모라');assert.equal(action.type,'BUY');assert.equal(action.params.stock,row[0]);assert.equal(action.params.quantity,1);
});

console.log('Inn recovery pricing checks: '+passed);
