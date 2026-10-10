'use strict';
// Runs only in an isolated Runtime VM. No browser, account, production save or asset is written.
const assert=require('node:assert/strict');
const {fresh,R,db,c,advance}=require('./helpers_v011.cjs');
const api=c.CRPGRuntime,plain=x=>JSON.parse(JSON.stringify(x)),checks=[];
const DAY=86400000,KST=9*3600000,BASE=Date.UTC(2026,9,3,3);
function check(name,fn){try{const evidence=fn();checks.push({name,ok:true,evidence});console.log('PASS '+name);}catch(e){checks.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
function world(map='MAP_MOND_CITY'){const r=fresh(map);r.actionStartedAt=BASE;return r;}
function restore(save,at){
 // Restore under the same simulated request clock; constructor migration must not
 // advance to the real run date before this boundary test resumes its past clock.
 const now=c.Date.now;let next;c.Date.now=()=>at;
 try{next=new R(db,save);}finally{c.Date.now=now;}
 next.actionStartedAt=at;return next;
}
function reload(r){return restore(JSON.parse(r.serialize()),r.actionStartedAt);}
function rejected(r,type,params={},pattern){const before=r.serialize();assert.throws(()=>r.action(type,params),e=>!pattern||pattern.test(e.message));assert.equal(r.serialize(),before,'rejection changes neither resources nor progress');}
function intent(r,type,params={}){return {id:r.s.global.SAVE_ID+':'+(r.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:r.s.global.SAVE_REVISION,type,...params};}
function once(r,a){const receipt=r.transact(a),after=r.serialize();assert.deepEqual(plain(r.transact(a)),plain(receipt));assert.equal(r.serialize(),after,'retrying the receipt pays/consumes once');const restored=reload(r),saved=restored.serialize();assert.deepEqual(plain(restored.transact(a)),plain(receipt));assert.equal(restored.serialize(),saved,'the same receipt after reload stays inert');return receipt.result;}
function enter(r,id,mode='CRAFT'){r.action('PLACE_ENTER',{place:id,mode});}
function fund(r,cost){r.s.global.MORA=cost.mora||0;for(const [id,n]of Object.entries(cost.items||{})){const old=r.itemCount(id);if(old<n)r.giveItem(id,n-old);}}
function event(kind,predicate=()=>true){const r=world();for(let day=0;day<20;day++){r.actionStartedAt=BASE+day*DAY;for(const row of r.rows('32_MAP_DB')){const ev=r.regionEventAt(row[0]);if(ev?.kind===kind&&predicate(ev)){r.s.global.CURRENT_MAP_ID=ev.map;return {r,ev};}}}throw Error('No event fixture for '+kind);}
function settleOpening(r,victory){assert.equal(r.s.runtime.opening.state,'PENDING');for(const a of r.s.runtime.actors)if(a.side===(victory?'ENEMY':'ALLY'))a.hp=0;once(r,intent(r,'COMBAT_BEGIN',{battle:r.s.runtime.id}));assert.equal(r.s.runtime,null);return JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);}

check('escort: accepted travel cannot also choose another ending; completion and restored receipt pay once',()=>{
 let {r,ev}=event('LOST');const start=r.s.global.MORA,primo=r.s.global.PRIMOGEM||0;
 once(r,intent(r,'REGION_EVENT',{choice:'ESCORT'}));r=reload(r);
 for(const choice of ['ESCORT','POINT'])rejected(r,'REGION_EVENT',{choice},/함께 이동/);
 rejected(r,'REGION_EVENT',{choice:'ARRIVE'},/도착해야/);
 assert.equal(r.regionEventHere().event.choices.find(x=>x.id==='LEAVE').label,'동행을 그만둔다');
 r.s.global.CURRENT_MAP_ID=ev.to;const out=once(r,intent(r,'REGION_EVENT',{choice:'ARRIVE'}));
 assert.equal(r.s.global.MORA-start,out.mora);assert.equal((r.s.global.PRIMOGEM||0)-primo,out.primogem);
 assert.equal(r.s.regionEvents.count,1);assert.equal(r.s.regionEvents.total.LOST,1);assert.equal(r.s.regionEvents.escort,null);
 rejected(r,'REGION_EVENT',{choice:'ARRIVE'},/데려다줄 사람/);
 r.s.global.CURRENT_MAP_ID=ev.map;rejected(r,'REGION_EVENT',{choice:'POINT'},/이미 마무리/);
 return {completionCount:r.s.regionEvents.count,mora:out.mora};
});

check('escort: stopping travel, old settled saves, and Korean midnight cannot leave a payable orphan',()=>{
 let {r,ev}=event('LOST');const money=r.s.global.MORA;r.action('REGION_EVENT',{choice:'ESCORT'});
 const accepted=JSON.parse(r.serialize());once(r,intent(r,'REGION_EVENT',{choice:'LEAVE'}));
 assert.equal(r.s.global.MORA,money);assert.equal(r.s.regionEvents.count,0);assert.equal(r.s.regionEvents.escort,null);
 r=reload(r);r.s.global.CURRENT_MAP_ID=ev.to;rejected(r,'REGION_EVENT',{choice:'ARRIVE'});
 for(const outcome of ['DONE','LEFT']){const s=plain(accepted);s.regionEvents.done[ev.map]={kind:'LOST',choice:outcome==='DONE'?'POINT':'LEAVE',outcome};
  const priorMoney=s.global.MORA,restored=restore(s,r.actionStartedAt);assert.equal(restored.s.regionEvents.escort,null);assert.equal(restored.s.global.MORA,priorMoney);restored.s.global.CURRENT_MAP_ID=ev.to;rejected(restored,'REGION_EVENT',{choice:'ARRIVE'});}
 r=restore(plain(accepted),r.actionStartedAt);
 // The generated event may come from a later fixture day; advance from that event's own date.
 r.actionStartedAt=(ev.day+1)*DAY-KST-1;assert(r.regionToday()?.escort);r.actionStartedAt++;
 assert.equal(r.regionEventHere().escort,null);r.s.global.CURRENT_MAP_ID=ev.to;rejected(r,'REGION_EVENT',{choice:'ARRIVE'});
 return {aborted:true,legacyEndings:2,midnightExpired:true};
});

check('regional deliveries and gifts: one missing item, wrong item, retry and reload preserve the promised exchange',()=>{
 let {r,ev}=event('REQUEST');r.giveItem(ev.want.item,ev.want.qty-1);rejected(r,'REGION_EVENT',{choice:'DELIVER'},/필요합니다/);
 r.giveItem(ev.want.item,1);const money=r.s.global.MORA;const out=once(r,intent(r,'REGION_EVENT',{choice:'DELIVER'}));
 assert.equal(r.itemCount(ev.want.item),0);assert.equal(r.s.global.MORA-money,out.mora);rejected(r,'REGION_EVENT',{choice:'DELIVER'},/이미 마무리/);
 ({r,ev}=event('INJURED'));r.giveItem('ORE_IRON',1);rejected(r,'REGION_EVENT',{choice:'GIVE',item:'ORE_IRON'},/음식이나 치료품/);
 const item='TRPG_HEALING_POTION';r.giveItem(item,1);once(r,intent(r,'REGION_EVENT',{choice:'GIVE',item}));assert.equal(r.itemCount(item),0);
 rejected(reload(r),'REGION_EVENT',{choice:'AID'},/이미 마무리/);return {delivery:true,gift:true};
});

check('regional merchant: insufficient funds, invalid selection, partial reload and sold-out items never duplicate stock',()=>{
 let {r,ev}=event('MERCHANT');r.s.global.MORA=ev.stock[0].price-1;rejected(r,'REGION_EVENT',{choice:'BUY',index:0},/모라가 부족/);
 r.s.global.MORA=10000;for(const index of [-1,3,0.5,'0',null])rejected(r,'REGION_EVENT',{choice:'BUY',index});
 const before=r.itemCount(ev.stock[0].item),money=r.s.global.MORA;once(r,intent(r,'REGION_EVENT',{choice:'BUY',index:0}));
 assert.equal(r.itemCount(ev.stock[0].item)-before,ev.stock[0].qty);assert.equal(money-r.s.global.MORA,ev.stock[0].price);
 r=reload(r);rejected(r,'REGION_EVENT',{choice:'BUY',index:0},/이미 산/);
 for(let index=1;index<ev.stock.length;index++)once(r,intent(r,'REGION_EVENT',{choice:'BUY',index}));
 assert(r.s.regionEvents.done[ev.map]);assert.equal(r.s.regionEvents.count,1);rejected(r,'REGION_EVENT',{choice:'BUY',index:2},/이미 마무리/);
 return {stock:ev.stock.length};
});

check('crafting: cooking and alchemy use their own facility, reject invalid batches, and preserve exact costs on reload',()=>{
 const cases=[['EVT_SCHEDULE_SERVICE_MOND_COOK','REC_PROCESS_BUTTER'],['EVT_SCHEDULE_MRC_ALCHEMY_COMMON','REC_ALCH_HEALING_POTION']];
 for(const [place,recipe]of cases){let r=world();const row=r.recipeDefinition(recipe),cost=r.recipeCost(row,2);fund(r,cost);
  enter(r,place==='EVT_SCHEDULE_SERVICE_MOND_COOK'?'EVT_SCHEDULE_MRC_ALCHEMY_COMMON':'EVT_SCHEDULE_SERVICE_MOND_COOK');rejected(r,'CRAFT',{recipe,quantity:2});r.action('PLACE_LEAVE');enter(r,place);
  for(const quantity of [0,-1,0.5,1000000])rejected(r,'CRAFT',{recipe,quantity});
  const material=Object.keys(cost.items)[0];r.pay({items:{[material]:1}});rejected(r,'CRAFT',{recipe,quantity:2},/부족/);r.giveItem(material,1);
  const outputBefore=r.itemCount(row[3]);const out=once(r,intent(r,'CRAFT',{recipe,quantity:2}));
  assert.equal(r.itemCount(row[3])-outputBefore,row[4]*2);assert.equal(r.s.global.MORA,0);for(const id of Object.keys(cost.items))assert.equal(r.itemCount(id),0);
  assert.deepEqual(plain(out.cost),plain(cost));r=reload(r);assert.equal(r.itemCount(row[3])-outputBefore,row[4]*2);
 }return {facilities:cases.length};
});

check('lodging: both regional inns enforce funds, quantity and locality, then heal active members once across midnight',()=>{
 for(const [map,place,stock]of [['MAP_MOND_CITY','EVT_SCHEDULE_MRC_MOND_INN','STK_INN_MOND'],['MAP_LIYUE_HARBOR','EVT_SCHEDULE_MRC_LIYUE_INN','STK_INN_LIYUE']]){
  let r=world(map);if(map==='MAP_LIYUE_HARBOR')r.s.flags.FLAG_CRPG_LIYUE_HARBOR_VISITED=true;
  r.adminApply({op:'recruit',char:'MOND_AMBER'});r.adminApply({op:'recruit',char:'MOND_LISA'});r.action('PARTY',{char:'MOND_AMBER',slot:2});
  rejected(r,'BUY',{stock,quantity:1});r.s.global.WORLD_TIME='20:30';enter(r,place,'SHOP');
  let price=r.stockPrice(r.row('19_SHOP_STOCK_DB',stock));r.s.global.MORA=price-1;rejected(r,'BUY',{stock,quantity:1},/부족/);r.s.global.MORA=price;
  for(const quantity of [0,-1,2])rejected(r,'BUY',{stock,quantity});
  r.s.global.PLAYER_HP_CURRENT=1;r.s.chars.MOND_AMBER.hp=2;r.s.chars.MOND_LISA.hp=3;const day=r.s.global.WORLD_DAY;price=r.stockPrice(r.row('19_SHOP_STOCK_DB',stock));r.s.global.MORA=price;
  once(r,intent(r,'BUY',{stock,quantity:1}));assert.equal(r.s.global.MORA,0);assert.equal(r.s.global.WORLD_DAY,day+1);assert.equal(r.s.global.WORLD_TIME,'04:30');
  assert.equal(r.s.global.PLAYER_HP_CURRENT,r.s.global.PLAYER_HP_MAX);assert.equal(r.s.chars.MOND_AMBER.hp,r.character('MOND_AMBER').maxHp);assert.equal(r.s.chars.MOND_LISA.hp,3);
  assert.equal(r.s.placeVisit,null);assert.equal(r.s.global.CURRENT_MAP_ID,map);r=reload(r);rejected(r,'BUY',{stock,quantity:1});
 }return {inns:2};
});

check('enhancement: failed rolls consume one cost; stale quotes, ascension and maximum levels survive reload safely',()=>{
 for(const [roll,outcome,level]of [[1,'SUCCESS',10],[9000,'HOLD',9],[10000,'DOWN',8]]){
  let r=world(),slot=r.giveEquipment('EQ_ARMOR_TRAVEL_COAT');const inv=r.s.inventory.find(i=>i.slot===slot);inv.enhance=9;r.recalculate();enter(r,'EVT_SCHEDULE_MRC_MOND_EQUIP');
  const q=r.enhancementQuote(slot);fund(r,q.cost);r.die=()=>roll;const params={slot,expectedLevel:q.level,instanceRevision:q.instanceRevision,expectedCap:q.cap};
  const out=once(r,intent(r,'ENHANCE',params));assert.equal(out.outcome,outcome);assert.equal(out.level,level);assert.equal(r.s.global.MORA,0);
  r=reload(r);r.s.global.MORA=99999;for(const id of ['ORE_IRON','ORE_WHITE_IRON','ORE_CRYSTAL'])r.giveItem(id,100);rejected(r,'ENHANCE',params);
 }
 let r=world(),slot=r.giveEquipment('EQ_ARMOR_TRAVEL_COAT');r.s.inventory.find(i=>i.slot===slot).enhance=10;r.recalculate();enter(r,'EVT_SCHEDULE_MRC_MOND_EQUIP');rejected(r,'ENHANCE',{slot},/돌파/);
 const q=r.enhancementQuote(slot,'ASCEND');fund(r,q.cost);const mat=Object.keys(q.cost.items)[0];r.pay({items:{[mat]:1}});rejected(r,'EQUIP_ASCEND',{slot},/부족/);r.giveItem(mat,1);
 once(r,intent(r,'EQUIP_ASCEND',{slot,expectedLevel:10,expectedCap:10,instanceRevision:q.instanceRevision}));r=reload(r);assert.equal(r.enhancementQuote(slot).cap,12);rejected(r,'EQUIP_ASCEND',{slot},/이미/);
 r.s.inventory.find(i=>i.slot===slot).enhance=12;r.recalculate();rejected(r,'ENHANCE',{slot},/최대 강화/);return {rollOutcomes:3,ascension:true,max:12};
});

check('premium exchanges: weekly and monthly caps reset only at the exact Korean boundary and receipts remain single-use',()=>{
 for(const [offer,boundary,limit]of [['DUST_MORA',Date.UTC(2026,9,4,15),5],['DUST_ACQUAINT',Date.UTC(2026,9,31,15),5]]){
  let r=world();r.actionStartedAt=boundary-1;r.s.global.STARDUST=5000;
  for(let i=0;i<limit;i++)once(r,intent(r,'PREMIUM_BUY',{offer}));rejected(r,'PREMIUM_BUY',{offer},/이번 (주|달)/);
  r=reload(r);rejected(r,'PREMIUM_BUY',{offer});r.actionStartedAt=boundary;const before=r.s.global.STARDUST;once(r,intent(r,'PREMIUM_BUY',{offer}));assert(r.s.global.STARDUST<before);
  assert.equal(offer==='DUST_MORA'?r.premiumWeeklyUsed(offer):r.premiumMonthlyUsed(offer),1);
 }return {weekly:true,monthly:true};
});

check('constellations and wishes: missing ownership, maximum rank, insufficient currency and reload never consume twice',()=>{
 let r=world();r.s.global.STARGLITTER=1000;rejected(r,'PREMIUM_BUY',{offer:'GLITTER_STELLA',char:'MOND_AMBER'},/동료/);r.adminApply({op:'recruit',char:'MOND_AMBER'});
 for(let i=0;i<6;i++)once(r,intent(r,'PREMIUM_BUY',{offer:'GLITTER_STELLA',char:'MOND_AMBER'}));rejected(r,'PREMIUM_BUY',{offer:'GLITTER_STELLA',char:'MOND_AMBER'},/더 이상/);
 for(let i=0;i<6;i++)once(r,intent(r,'CONSTELLATION_UNLOCK',{char:'MOND_AMBER'}));r=reload(r);assert.equal(r.constellationLevel('MOND_AMBER'),6);rejected(r,'CONSTELLATION_UNLOCK',{char:'MOND_AMBER'},/모두/);
 r=world();r.s.global.INTERTWINED_FATE=9;rejected(r,'WISH',{banner:'EVENT',count:10},/부족/);r.s.global.INTERTWINED_FATE=10;
 for(const count of [0,2,-1,11])rejected(r,'WISH',{banner:'EVENT',count});
 const out=once(r,intent(r,'WISH',{banner:'EVENT',count:10}));assert.equal(out.results.length,10);assert.equal(r.s.global.INTERTWINED_FATE,0);assert.equal(r.s.wish.EVENT.total,10);rejected(reload(r),'WISH',{banner:'EVENT',count:1},/부족/);
 return {constellationMax:6,wishes:10};
});

check('achievement claims: incomplete/unknown claims stay inert and a saved bulk claim cannot also pay individual rewards',()=>{
 let r=world();const incomplete=r.achievementView().list.find(a=>!a.done);assert(incomplete);rejected(r,'ACHIEVEMENT_CLAIM',{achievement:incomplete.id},/달성하지/);rejected(r,'ACHIEVEMENT_CLAIM',{achievement:'MISSING_ACHIEVEMENT'},/찾을 수/);
 r.action('MOVE',{edge:'EDGE_MOND_CITY_TO_PLAINS'});r.s.global.ENCOUNTER_COOLDOWN=100;r.achievementCount('chat',1);
 // A real wish action creates a persistent completion fact without awarding its achievement yet.
 r.s.global.ACQUAINT_FATE=10;r.action('WISH',{banner:'STANDARD',count:10});const ready=r.achievementView().list.filter(a=>a.done&&!a.claimed);assert(ready.length);
 const before=r.s.global.PRIMOGEM||0,out=once(r,intent(r,'ACHIEVEMENT_CLAIM',{achievement:'ALL'}));assert.equal((r.s.global.PRIMOGEM||0)-before,ready.reduce((n,a)=>n+a.reward,0));assert.equal(out.claimed.length,ready.length);
 r=reload(r);for(const a of ready)rejected(r,'ACHIEVEMENT_CLAIM',{achievement:a.id},/이미 받은/);rejected(r,'ACHIEVEMENT_CLAIM',{achievement:'ALL'},/받을 업적/);return {claims:ready.length};
});

check('regional combat: restored defeats allow recovery and retry, while a fight crossing midnight never settles the new event',()=>{
 let {r,ev}=event('AMBUSH',e=>!!e.group);r.action('REGION_EVENT',{choice:'FIGHT'});r=reload(r);const lost=settleOpening(r,false);assert.equal(lost.victory,false);assert(!r.regionToday()?.done[ev.map]);
 r=reload(r);rejected(r,'REGION_EVENT',{choice:'FIGHT'});advance(60001);r.action('RECOVER');r.s.global.CURRENT_MAP_ID=ev.map;
 r.action('REGION_EVENT',{choice:'FIGHT'});r=reload(r);const won=settleOpening(r,true);assert(won.regionEvent.settled);assert.equal(r.s.regionEvents.count,1);rejected(r,'REGION_EVENT',{choice:'FIGHT'},/이미 마무리/);
 ({r,ev}=event('AMBUSH',e=>!!e.group));r.actionStartedAt=(ev.day+1)*DAY-KST-1;r.action('REGION_EVENT',{choice:'FIGHT'});r=reload(r);const primogem=r.s.global.PRIMOGEM||0;r.actionStartedAt++;
 const late=settleOpening(r,true);assert.equal(late.regionEvent.settled,false);assert.equal(r.s.global.PRIMOGEM||0,primogem);assert(!r.regionToday()?.done[ev.map]);
 return {defeatRecovery:true,retry:true,expiredFightSettled:false};
});

check('hourly challenge: entry gates, restored defeat, old-hour victory and next-hour availability stay separate',()=>{
 let r=world(),hour=Math.floor(BASE/3600000),site=api.leyLines.sitesAt(hour).find(x=>x.region==='몬드'&&x.kind==='REVELATION'),route=api.leyLines.route(site.kind,site.map);
 r.s.global.CURRENT_MAP_ID=site.map;rejected(r,'PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'},/Lv/);
 r.serverAdmin=true;r.action('OPERATOR_DEBUG',{op:'level',value:10});r.actionStartedAt=hour*3600000+3599999;
 enter(r,'BOSS:'+route,'BOSS');rejected(r,'BOSS_ROUTE',{route,entry:'DIRECT',tier:5},/Lv/);r.action('BOSS_ROUTE',{route,entry:'DIRECT',tier:2});r=reload(r);
 const before=r.itemCount('MAT_CHAR_EXP_HERO');r.actionStartedAt++;const result=settleOpening(r,true);
 assert(result.leyLine.claimed);assert.equal(r.itemCount('MAT_CHAR_EXP_HERO')-before,18);assert.equal(r.s.leyLine.REVELATION,hour);assert.equal(r.leyLineClaimed('REVELATION'),false);
 r=reload(r);assert.equal(r.leyLineClaimed('REVELATION'),false);site=r.leyLineStatus().blossoms.find(x=>x.region==='몬드'&&x.kind==='REVELATION');r.s.global.CURRENT_MAP_ID=site.map;r.s.placeVisit=null;
 assert.equal(r.placeBossReason(site.route,'DIRECT'),'');enter(r,'BOSS:'+site.route,'BOSS');r.action('BOSS_ROUTE',{route:site.route,entry:'DIRECT',tier:2});r=reload(r);settleOpening(r,false);
 assert.equal(r.s.leyLine.REVELATION,hour,'a defeat never claims the next window');r=reload(r);advance(60001);r.action('RECOVER');r.s.global.CURRENT_MAP_ID=site.map;assert.equal(r.placeBossReason(site.route,'DIRECT'),'');
 return {oldHourClaimed:hour,currentHour:hour+1,defeatConsumed:false};
});

check('field boss: a restored fight crossing the 12-hour reset counts the completion window once and defeat consumes no victory',()=>{
 let r=world(),boss=api.fieldBosses.bosses.FB_CRYO_REGISVINE,route=api.fieldBosses.route('FB_CRYO_REGISVINE');r.serverAdmin=true;r.action('OPERATOR_DEBUG',{op:'level',value:15});
 r.s.global.CURRENT_MAP_ID=boss.map;r.actionStartedAt=Date.UTC(2026,9,3,3)-1;const previousWindow=r.fieldBossWindow();r.s.fieldBossWindow={window:previousWindow,wins:2};
 enter(r,'BOSS:'+route,'BOSS');r.action('BOSS_ROUTE',{route,entry:'DIRECT'});r=reload(r);r.actionStartedAt++;
 settleOpening(r,true);assert.deepEqual(plain(r.s.fieldBossWindow),{window:previousWindow+1,wins:1});r=reload(r);assert.equal(r.fieldBossDaily().left,2);
 if(r.s.placeVisit?.place!=='BOSS:'+route)enter(r,'BOSS:'+route,'BOSS');r.action('BOSS_ROUTE',{route,entry:'DIRECT'});r=reload(r);settleOpening(r,false);assert.equal(r.s.fieldBossWindow.wins,1);
 return {completionWindow:previousWindow+1,wins:1};
});

console.log(JSON.stringify({suite:'feature-boundaries-v01513',total:checks.length,passed:checks.filter(x=>x.ok).length,checks},null,2));

