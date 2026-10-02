/* 0.15.2 지역 사건 (user: 「지역 사건? 좋아보여. … 탐험을 하는 게임에서 탐험적인 요소가 많아야 한다는걸 … 지역 사건들 좀
 * 늘리고. 종류를 좀 나눠서 추가하자. 원석도 좀 뿌려주고」). Every real day (Korean midnight) some wild Mond and Liyue maps
 * hold a small event: an ambush, a fierce monster, an injured traveller, a suspicious chest, an elemental device, someone
 * lost, a wandering merchant, scattered cargo, a request for materials. Which maps and which events come from the journey's
 * id and the day, so a journey sees the same thing on the server and in the game, and other days bring other events.
 * Each event is settled once (REGION_EVENT {choice,…} on its map); fights start a battle and settle on victory, puzzles
 * reuse the chest games. Events pay Mora and materials and some 원석, at most 40 원석 a day from events.
 * Load after runtime_chests_v01415.js (the games) and the encounter modules. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||!api.chestRules?.make||P.eventsV0152)return;P.eventsV0152=true;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const DAY=86400000,KST=9*3600000,CHANCE=35,PRIMO_DAY=40,ORIGIN='REGION_EVENT:';
const hash=s=>{let h=2166136261;for(const ch of String(s)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const rng=seed=>{let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};};
const REGION={몬드:'MOND',리월:'LIYUE'};
// Places a lost traveller may be heading to (always reachable towns of the region).
const TOWNS={MOND:['MAP_MOND_CITY','MAP_MOND_SPRINGVALE','MAP_MOND_WINDRISE','MAP_MOND_DAWN_WINERY'],LIYUE:['MAP_LIYUE_HARBOR','MAP_LIYUE_QINGCE','MAP_LY_DETAIL_WANGSHU','MAP_LIYUE_JUEYUN']};
const GOODS={
 MOND:{gather:['ING_APPLE','ING_SUNSETTIA','ING_MUSHROOM','ING_MINT','ING_BERRY','ING_SWEET_FLOWER'],ore:['ORE_IRON','ORE_WHITE_IRON','ORE_CRYSTAL'],drop:['MAT_TREASURE_INSIGNIA','MAT_STAINED_MASK','MAT_SLIME_SECRETIONS'],
  want:[['ING_APPLE',3],['ING_SUNSETTIA',3],['ING_MINT',4],['ING_MUSHROOM',3],['ING_SWEET_FLOWER',3],['ING_BERRY',3],['ING_CARROT',2],['ING_RADISH',2],['ORE_IRON',4],['ING_PINECONE',2]],
  shop:[['MAT_CHAR_EXP_ADVENTURER',2,500],['ORE_CRYSTAL',2,400],['TRPG_HEALING_POTION',2,300],['ORE_WHITE_IRON',3,300],['MAT_CHAR_EXP_WANDERER',5,250],['ING_CALLA_LILY',3,150],['ING_LAMP_GRASS',3,150],['ING_BIRD_EGG',4,120]]},
 LIYUE:{gather:['ING_LOTUS_HEAD','ING_BAMBOO_SHOOT','ING_ALMOND','MAT_LIYUE_JUEYUN_CHILI','MAT_LIYUE_SILK_FLOWER','ING_MUSHROOM'],ore:['ORE_WHITE_IRON','ORE_CRYSTAL','MAT_LIYUE_COR_LAPIS'],drop:['MAT_TREASURE_INSIGNIA','MAT_RECRUIT_INSIGNIA','MAT_SLIME_SECRETIONS'],
  want:[['ING_LOTUS_HEAD',2],['ING_BAMBOO_SHOOT',2],['ING_ALMOND',2],['MAT_LIYUE_JUEYUN_CHILI',2],['MAT_LIYUE_QINGXIN',1],['ING_MUSHROOM',3],['ORE_IRON',4],['ORE_WHITE_IRON',2],['ING_MINT',4]],
  shop:[['MAT_CHAR_EXP_ADVENTURER',2,500],['ORE_CRYSTAL',2,400],['TRPG_HEALING_POTION',2,300],['MAT_LIYUE_COR_LAPIS',2,300],['MAT_LIYUE_VIOLETGRASS',2,250],['MAT_LIYUE_GLAZE_LILY',2,250],['MAT_CHAR_EXP_WANDERER',5,250],['ING_SHRIMP',3,150]]}
};
// Kinds: weight, the texts (Mond / Liyue), the choices and what they pay. {to}, {item} and {n} are filled in.
const K={
 AMBUSH:{name:'보물 사냥단 매복',weight:14,text:{
  MOND:['길가 풀숲이 이상하게 조용하다. 지나가는 여행자를 노리는 무리가 숨어 있는 것 같다.','부서진 마차 옆에서 금화가 반짝인다. 함정이다 — 덤불 뒤에서 무기를 든 무리가 일어선다.','「거기 서! 짐 다 내려놓고 가!」 낡은 두건을 쓴 무리가 길을 막아선다.'],
  LIYUE:['바위틈에서 누군가 이쪽을 엿보고 있다. 상단의 짐을 노리는 도굴꾼들이 매복하고 있었다.','「천암군이 오기 전에 끝내 버려!」 산길 모퉁이에서 무리가 뛰쳐나온다.','모래에 반쯤 묻힌 상자 주위로 발자국이 어지럽다. 상자를 미끼로 숨어 있던 무리가 덤벼든다.']},
  choices:{FIGHT:{label:'맞서 싸운다',battle:true,reward:{primogem:10,mora:300,drop:2,gather:2}},LEAVE:{label:'조용히 물러난다'}}},
 ELITE:{name:'거친 마물',weight:9,text:{
  MOND:['다른 마물보다 몸집이 훨씬 큰 녀석이 길을 막고 있다. 주변 마물들이 녀석을 두려워하는 눈치다.','땅이 울릴 만큼 사나운 울음소리. 오래 살아남아 덩치가 커진 마물이 영역을 지키고 있다.'],
  LIYUE:['부러진 창과 방패가 흩어져 있다. 여러 모험가를 물리친 거친 마물이 근처를 배회한다.','「저 녀석 때문에 짐을 못 옮기고 있어요…」 짐꾼이 가리키는 곳에 유난히 강한 마물이 버티고 있다.']},
  choices:{FIGHT:{label:'도전한다 (강해진 마물)',battle:true,elite:true,reward:{primogem:15,mora:450,drop:2,items:{MAT_CHAR_EXP_ADVENTURER:2}}},LEAVE:{label:'물러난다'}}},
 INJURED:{name:'다친 여행자',weight:12,text:{
  MOND:['나무 밑에 기대앉은 여행자가 다리를 감싸 쥐고 있다. 「마물에게 쫓기다가 그만… 먹을 거라도 있으면 좋겠는데.」','서풍 기사단 견습 기사가 지친 얼굴로 앉아 있다. 「순찰 중에 다쳤어요. 잠깐만 쉬면 될 거예요…」'],
  LIYUE:['짐을 잔뜩 진 짐꾼이 길가에 주저앉아 있다. 「산길에서 미끄러졌지 뭐요. 기운 날 만한 게 있으면…」','약초를 캐던 아이가 무릎을 다쳐 울고 있다. 「불복려까지 가야 하는데 너무 아파요…」']},
  choices:{GIVE:{label:'음식이나 치료품을 건넨다',gift:true,reward:{primogem:10,mora:200,gather:3}},AID:{label:'응급처치를 해 준다 (30분)',minutes:30,reward:{primogem:5,mora:150}},LEAVE:{label:'지나친다'}}},
 CHEST:{name:'수상한 상자',weight:12,text:{
  MOND:['덩굴에 감긴 낡은 상자가 있다. 자물쇠에 처음 보는 장치가 달려 있다.','누군가 급히 숨겨 둔 듯한 상자. 수수께끼 자물쇠로 잠겨 있다.'],
  LIYUE:['옛 상단의 문양이 새겨진 상자다. 정교한 기관 자물쇠가 달려 있다.','바위 사이에 끼인 상자. 자물쇠의 장치를 풀어야 열릴 것 같다.']},
  puzzle:['SWAP','SLIDE','ROTATE','DIALS','MASTERMIND','WORD','HANOI'],
  choices:{SOLVE:{label:'자물쇠를 푼다',puzzle:true,reward:{primogem:10,mora:350,ore:3}},FORCE:{label:'힘으로 연다 (지키던 무리가 나타남)',battle:true,reward:{primogem:5,mora:250,ore:2}},LEAVE:{label:'그냥 둔다'}}},
 PUZZLE:{name:'원소 장치',weight:12,text:{
  MOND:['이끼 낀 오래된 장치가 놓여 있다. 무언가를 맞추면 열릴 것 같다.','바람 문양이 새겨진 고대 장치. 희미한 빛이 다음 손길을 기다린다.'],
  LIYUE:['고대 리월의 기관 장치다. 수수께끼를 풀면 봉인이 풀린다고 전해진다.','바위 원소가 흐르는 석판 장치. 표면에 알 수 없는 문제가 떠오른다.']},
  puzzle:['LIGHTS','LIGHTS_X','PIPES','MIRRORS','NONOGRAM','SYMMETRY','FLOOD','MEMGRID','SIMON','MAZE','CONSTELLATION','MINES','QUIZ','REACTION','ODD','COUNT','BALANCE','PAIRS','SHADOW','SUDOKU','SPOT'],
  choices:{SOLVE:{label:'장치를 푼다',puzzle:true,reward:{primogem:10,mora:250,ore:2,items:{MAT_CHAR_EXP_ADVENTURER:1}}},LEAVE:{label:'그냥 둔다'}}},
 LOST:{name:'길 잃은 사람',weight:10,text:{
  MOND:['「{to}에 가야 하는데 길을 잃었어요…」 여행 가방을 든 사람이 두리번거린다.','고양이를 찾아 헤매다 길을 잃은 아이가 있다. 「{to}에 우리 집이 있어요…」'],
  LIYUE:['「{to}까지 물건을 전해야 하는데, 산길이 다 비슷해 보여서…」 젊은 상인이 지도를 거꾸로 들고 있다.','순례 중인 노인이 길을 헤맨다. 「{to}에 가려던 참인데, 눈이 침침해서…」']},
  choices:{ESCORT:{label:'{to}까지 데려다준다',escort:true,reward:{primogem:10,mora:300,items:{MAT_CHAR_EXP_ADVENTURER:1}}},POINT:{label:'길만 알려 준다',reward:{mora:100}},LEAVE:{label:'지나친다'}}},
 MERCHANT:{name:'떠돌이 상인',weight:8,text:{
  MOND:['수레를 끄는 떠돌이 상인이 쉬어 가고 있다. 「여기선 보기 힘든 물건들이라오. 오늘만 싸게 드리지.」'],
  LIYUE:['「손님, 눈이 높으시군요!」 비단 보따리를 펼친 행상이 반갑게 손짓한다.']},
  choices:{BUY:{label:'산다',buy:true},LEAVE:{label:'떠난다'}}},
 CACHE:{name:'흩어진 화물',weight:11,text:{
  MOND:['뒤집힌 짐수레 주변에 상자와 자루가 흩어져 있다. 주인은 이미 떠난 듯하다. 찬찬히 살펴볼까?'],
  LIYUE:['산사태에 휩쓸린 상단의 짐이 비탈 아래 흩어져 있다. 「주운 사람이 임자」라는 쪽지가 꽂혀 있다.']},
  choices:{SEARCH15:{label:'잠깐 살핀다 (15분)',minutes:15,reward:{mora:100,gather:2}},SEARCH30:{label:'꼼꼼히 살핀다 (30분)',minutes:30,reward:{mora:150,gather:3,ore:1}},SEARCH60:{label:'구석구석 뒤진다 (60분)',minutes:60,reward:{primogem:5,mora:220,gather:4,ore:2}}}},
 REQUEST:{name:'여행자의 부탁',weight:12,text:{
  MOND:['「{item} {n}개만 구해 줄 수 있어요? 오늘 저녁 요리에 꼭 필요해서요.」 앞치마를 두른 요리사가 부탁한다.','「기사단 보급품이 모자라서… {item} {n}개가 필요합니다.」 견습 기사가 난처해한다.'],
  LIYUE:['「{item} {n}개가 있으면 좋겠는데… 단골손님 주문이라서요.」 객잔 주방장이 한숨을 쉰다.','「{item} {n}개를 구하고 있소. 사례는 섭섭지 않게 하겠소.」 나이 든 상인이 부탁한다.']},
  choices:{DELIVER:{label:'{item} {n}개를 건넨다',deliver:true,reward:{primogem:10,mora:350,items:{MAT_CHAR_EXP_ADVENTURER:2}}},LEAVE:{label:'거절한다'}}}
};
const KINDS=Object.keys(K),TOTAL=KINDS.reduce((n,k)=>n+K[k].weight,0);
api.regionEventsV0152={kinds:Object.fromEntries(KINDS.map(k=>[k,{name:K[k].name,choices:Object.keys(K[k].choices)}])),chance:CHANCE,primogemsPerDay:PRIMO_DAY};
const old=Object.fromEntries(['apply','actionReason','startBattle','fieldBattlePolicy','finishBattle','validateSave'].map(k=>[k,P[k]]));
const name=(rt,id)=>rt.tables['14_ITEM_DB'].get(id)?.[1]||id,mapName=(rt,id)=>rt.tables['32_MAP_DB'].get(id)?.[2]||id;
P.regionNow=function(){return Number(this.actionStartedAt??Date.now());};
P.regionDay=function(){return Math.floor((this.regionNow()+KST)/DAY);};
// Today's record without changing the save (views); regionEventState() starts a new day inside an action.
P.regionToday=function(){const s=this.s.regionEvents;return s?.day===this.regionDay()?s:null;};
P.regionEventState=function(){const d=this.regionDay(),s=this.s.regionEvents;if(s?.version===1&&s.day===d)return s;this.s.regionEvents={version:1,day:d,done:{},primogems:0,escort:null,bought:{},total:s?.total||{},count:s?.count||0};return this.s.regionEvents;};
// The event on one map today, built from the journey's id and the day.
P.regionEventAt=function(map,day=this.regionDay()){
 const m=this.tables['32_MAP_DB'].get(map),region=m&&REGION[m[1]];if(!region||m[8]!=='Y'||m[12]==='Y')return null;
 const seed=hash('EVT|'+(this.s.global.SAVE_ID||'save')+'|'+day+'|'+map);if(seed%100>=CHANCE)return null;
 const r=rng(seed),has=id=>this.tables['14_ITEM_DB'].has(id),pickOf=list=>list[Math.floor(r()*list.length)];
 let roll=r()*TOTAL,kind=KINDS[0];for(const k of KINDS){if(roll<K[k].weight){kind=k;break;}roll-=K[k].weight;}
 const D=K[kind],G=GOODS[region],ev={key:map+'@'+day,map,mapName:mapName(this,map),day,kind,name:D.name,region,text:pickOf(D.text[region])};
 const fill=t=>String(t).replace('{to}',ev.toName||'').replace('{item}',ev.want?name(this,ev.want.item):'').replace('{n}',ev.want?.qty||'');
 if(kind==='LOST'){const towns=TOWNS[region].filter(t=>t!==map&&this.tables['32_MAP_DB'].has(t));ev.to=pickOf(towns);ev.toName=mapName(this,ev.to);}
 if(kind==='REQUEST'){const w=pickOf(G.want.filter(([id])=>has(id)));ev.want={item:w[0],qty:w[1]};}
 if(kind==='MERCHANT'){const pool=G.shop.filter(([id])=>has(id)),stock=[];while(stock.length<3&&pool.length){const [id,qty,price]=pool.splice(Math.floor(r()*pool.length),1)[0];stock.push({item:id,name:name(this,id),qty,price});}ev.stock=stock;}
 if(D.puzzle){const pool=D.puzzle.filter(g=>api.chestRules.make[g]),game=pickOf(pool),size=api.chestRules.level[region]?.[game]||3;ev.puzzle={game,name:api.chestRules.games[game],size};}
 if(Object.values(D.choices).some(c=>c.battle)){let rows=[];try{rows=this.encounterPoolRows?.(m)||[];}catch{}const k=Math.floor(r()*Math.max(1,rows.length));ev.group=rows.length?rows[k][5]:null;}
 // What each choice pays (the picks are part of the event, so they never change on retry).
 const bundle=(reward={})=>{const items={...(reward.items||{})},add=(list,n)=>{if(!n)return;const id=pickOf(list.filter(has));if(id)items[id]=(items[id]||0)+n;};add(G.gather,reward.gather);add(G.ore,reward.ore);add(G.drop,reward.drop);for(const id of Object.keys(items))if(!has(id))delete items[id];return {primogem:reward.primogem||0,mora:reward.mora||0,items};};
 ev.text=fill(ev.text);
 ev.choices=Object.entries(D.choices).map(([id,c])=>({id,label:fill(c.label),battle:!!c.battle,elite:!!c.elite,puzzle:!!c.puzzle,gift:!!c.gift,escort:!!c.escort,buy:!!c.buy,deliver:!!c.deliver,minutes:c.minutes||0,reward:c.reward?bundle(c.reward):null}));
 return ev;
};
P.regionEventPuzzle=function(ev){if(!ev?.puzzle)return null;const r=rng(hash('EVTP|'+ev.key+'|'+(this.s.global.SAVE_ID||'save')));return {game:ev.puzzle.game,name:ev.puzzle.name,region:ev.region,...api.chestRules.make[ev.puzzle.game](ev.puzzle.size,r)};};
const free=rt=>!rt.s.runtime&&!rt.s.battlePreparation&&(rt.playPhase?.()||'FREE')==='FREE';
// What the location screen shows: today's event here (settled or not) and a lost traveller to bring here.
P.regionEventHere=function(){
 const map=this.s.global.CURRENT_MAP_ID,ev=this.regionEventAt(map);const today=this.regionToday();
 const escort=today?.escort?{...copy(today.escort),here:today.escort.to===map}:null;
 if(!ev)return {event:null,escort,primogems:today?.primogems||0,cap:PRIMO_DAY};
 const done=today?.done?.[map]||null,busy=free(this)?'':'이야기나 전투를 마친 뒤 할 수 있습니다.';
 for(const c of ev.choices)c.reason=done?'오늘 이곳의 사건은 이미 마무리했습니다.':this.regionChoiceReason(ev,c.id,{});
 return {event:ev,done,escort,primogems:today?.primogems||0,cap:PRIMO_DAY,busy,bought:today?.bought?.[map]||[],puzzle:ev.puzzle&&!done?this.regionEventPuzzle(ev):null};
};
P.regionChoiceReason=function(ev,choice,a={}){
 if(!free(this))return '이야기나 전투를 마친 뒤 할 수 있습니다.';
 if(!ev)return '오늘 이곳에는 사건이 없습니다.';const c=ev.choices.find(x=>x.id===choice);if(!c)return '고를 수 없는 선택입니다.';
 const today=this.regionToday();if(today?.done?.[ev.map])return '오늘 이곳의 사건은 이미 마무리했습니다.';
 if(c.battle&&!ev.group)return '이곳에는 싸울 상대가 없습니다.';
 if(c.escort&&today?.escort)return '이미 다른 사람을 데려다주는 중입니다.';
 if(c.deliver&&this.itemCount(ev.want.item)<ev.want.qty)return name(this,ev.want.item)+'이(가) '+ev.want.qty+'개 필요합니다. (보유 '+this.itemCount(ev.want.item)+')';
 if(c.gift&&a.item!==undefined){const row=this.tables['14_ITEM_DB'].get(String(a.item));if(!row||!['음식','전투 치료품'].includes(row[2]))return '음식이나 치료품을 골라 주세요.';if(this.itemCount(a.item)<1)return name(this,a.item)+'이(가) 없습니다.';}
 if(c.gift&&a.item===undefined&&!this.s.inventory.some(i=>i.item&&i.quantity>0&&['음식','전투 치료품'].includes(this.tables['14_ITEM_DB'].get(i.item)?.[2])))return '건넬 음식이나 치료품이 없습니다.';
 if(c.buy&&a.index!==undefined){const s=ev.stock?.[a.index];if(!s)return '상품을 골라 주세요.';if(today?.bought?.[ev.map]?.includes(a.index))return '이미 산 물건입니다.';if((Number(this.s.global.MORA)||0)<s.price)return '모라가 부족합니다.';}
 return '';
};
// Paying an event: 원석 up to today's cap, then Mora and items.
P.regionEventPay=function(st,reward){
 const g=this.s.global,primo=Math.min(reward.primogem||0,Math.max(0,PRIMO_DAY-st.primogems));st.primogems+=primo;
 if(primo)g.PRIMOGEM=(Number(g.PRIMOGEM)||0)+primo;if(reward.mora)g.MORA=(Number(g.MORA)||0)+reward.mora;for(const [id,n] of Object.entries(reward.items||{}))this.giveItem(id,n);
 return {primogem:primo,capped:primo<(reward.primogem||0),mora:reward.mora||0,items:copy(reward.items||{})};
};
P.regionEventSettle=function(st,ev,choice,outcome,reward){
 const paid=reward?this.regionEventPay(st,reward):{primogem:0,mora:0,items:{}};
 st.done[ev.map]={kind:ev.kind,choice,outcome};if(outcome!=='LEFT'){st.total[ev.kind]=(st.total[ev.kind]||0)+1;st.count=(st.count||0)+1;}
 return {event:ev.key,kind:ev.kind,name:ev.name,choice,outcome,...paid};
};
P.regionEventAct=function(a){
 const map=this.s.global.CURRENT_MAP_ID,choice=String(a.choice||'');
 // Bringing a lost traveller to the town they asked for.
 if(choice==='ARRIVE'){
  if(!free(this))fail('REGION_EVENT','이야기나 전투를 마친 뒤 할 수 있습니다.');
  const st=this.regionEventState(),e=st.escort;if(!e)fail('REGION_EVENT','데려다줄 사람이 없습니다.');if(e.to!==map)fail('REGION_EVENT',e.toName+'에 도착해야 합니다.');
  st.escort=null;st.done[e.map]={kind:'LOST',choice:'ESCORT',outcome:'DONE'};st.total.LOST=(st.total.LOST||0)+1;st.count=(st.count||0)+1;
  return {event:e.key,kind:'LOST',name:K.LOST.name,choice:'ARRIVE',outcome:'DONE',...this.regionEventPay(st,e.reward)};
 }
 const ev=this.regionEventAt(map),why=this.regionChoiceReason(ev,choice,a);if(why)fail('REGION_EVENT',why);
 const c=ev.choices.find(x=>x.id===choice),st=this.regionEventState();
 if(choice==='LEAVE')return this.regionEventSettle(st,ev,choice,'LEFT',null);
 if(c.battle){
  this._regionEvent={key:ev.key,kind:ev.kind,map,day:ev.day,choice,elite:c.elite};
  try{this.startBattle(ev.group,ORIGIN+ev.key);}finally{this._regionEvent=null;}
  return {event:ev.key,kind:ev.kind,name:ev.name,choice,outcome:'BATTLE'};
 }
 if(c.puzzle){const p=this.regionEventPuzzle(ev);if(!api.chestRules.check[p.game](p,a.answer))fail('REGION_EVENT','장치가 아직 풀리지 않았습니다.');return {...this.regionEventSettle(st,ev,choice,'DONE',c.reward),game:p.game};}
 if(c.gift){let item=a.item;if(item===undefined)item=this.s.inventory.find(i=>i.item&&i.quantity>0&&['음식','전투 치료품'].includes(this.tables['14_ITEM_DB'].get(i.item)?.[2]))?.item;this.pay({mora:0,items:{[item]:1}});const out=this.regionEventSettle(st,ev,choice,'DONE',c.reward);out.gave=item;return out;}
 if(c.deliver){this.pay({mora:0,items:{[ev.want.item]:ev.want.qty}});return this.regionEventSettle(st,ev,choice,'DONE',c.reward);}
 if(c.escort){st.escort={key:ev.key,map,to:ev.to,toName:ev.toName,from:ev.mapName,reward:copy(c.reward)};return {event:ev.key,kind:ev.kind,name:ev.name,choice,outcome:'ESCORT',to:ev.to,toName:ev.toName};}
 if(c.buy){
  const s=ev.stock?.[a.index];if(!s)fail('REGION_EVENT','상품을 골라 주세요.');this.pay({mora:s.price,items:{}});this.giveItem(s.item,s.qty);
  const bought=st.bought[map]??=[];bought.push(a.index);if(bought.length>=ev.stock.length)this.regionEventSettle(st,ev,'BUY','DONE',null);
  return {event:ev.key,kind:ev.kind,name:ev.name,choice,outcome:'BOUGHT',item:s.item,qty:s.qty,price:s.price};
 }
 if(c.minutes)this.advanceTime(c.minutes);
 return this.regionEventSettle(st,ev,choice,'DONE',c.reward);
};
P.actionReason=function(type,a={}){
 if(type==='REGION_EVENT'){if(a.choice==='ARRIVE'){const e=this.regionToday()?.escort;return !free(this)?'이야기나 전투를 마친 뒤 할 수 있습니다.':!e?'데려다줄 사람이 없습니다.':e.to!==this.s.global.CURRENT_MAP_ID?e.toName+'에 도착해야 합니다.':'';}return this.regionChoiceReason(this.regionEventAt(this.s.global.CURRENT_MAP_ID),String(a.choice||''),a);}
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){if(a?.type==='REGION_EVENT')return this.regionEventAct(a);return old.apply.call(this,a);};
// Event fights count like encounters for the party-size balance; a fierce monster is a stronger one.
P.fieldBattlePolicy=function(groupRow,origin,allies,members){return old.fieldBattlePolicy.call(this,groupRow,String(origin).startsWith(ORIGIN)?'RANDOM':origin,allies,members);};
P.startBattle=function(group,origin='EXPLICIT',...rest){
 const before=this.s.runtime,out=old.startBattle.call(this,group,origin,...rest),b=this.s.runtime,e=this._regionEvent;
 if(!b||b===before||!String(origin).startsWith(ORIGIN)||!e)return out;
 b.regionEvent={version:1,key:e.key,kind:e.kind,map:e.map,day:e.day,choice:e.choice};
 if(e.elite)for(const t of b.actors.filter(x=>x.side==='ENEMY')){t.maxHp=Math.round(t.maxHp*1.8);t.hp=t.maxHp;t.atk=Math.round(t.atk*1.25);t.def=Math.round(t.def*1.1);t.name='거친 '+t.name;t.regionElite=true;}
 b.log.push({card:'REGION_EVENT',cardName:K[e.kind].name,text:K[e.kind].name+' · '+(e.elite?'유난히 강한 마물이다!':'전투가 시작되었다!'),round:b.round});
 if(b.encounter){b.encounter.label='지역 사건 · '+K[e.kind].name;b.encounter.text=(e.elite?'유난히 강한 마물이 길을 막아섰습니다.':e.kind==='CHEST'?'상자를 지키던 무리가 나타났습니다.':'숨어 있던 무리가 덤벼듭니다.')+' 이기면 사건이 마무리되고, 지면 오늘 안에 다시 도전할 수 있습니다.';}
 return out;
};
// A won event fight settles the event (if it is still today's); a lost one can be tried again.
P.finishBattle=function(victory){
 const b=this.s.runtime,e=b?.regionEvent?copy(b.regionEvent):null,result=old.finishBattle.call(this,victory);
 if(!e||!result||typeof result!=='object')return result;
 const info={key:e.key,kind:e.kind,name:K[e.kind].name,victory:!!victory,settled:false};
 if(victory&&e.day===this.regionDay()&&!this.regionToday()?.done?.[e.map]){
  const ev=this.regionEventAt(e.map,e.day),c=ev?.choices.find(x=>x.id===e.choice);
  if(ev&&c){const st=this.regionEventState(),paid=this.regionEventSettle(st,ev,e.choice,'DONE',c.reward);Object.assign(info,{settled:true,primogem:paid.primogem,capped:paid.capped,mora:paid.mora,items:paid.items});}
 }
 const key=result.battleId||result.id,add=x=>{if(x&&typeof x==='object'){x.regionEvent=copy(info);if(info.settled){x.mora=(Number(x.mora)||0)+info.mora;x.loot={...(x.loot||{})};for(const [id,n] of Object.entries(info.items))x.loot[id]=(x.loot[id]||0)+n;}}};
 add(result);if(this.s.combatReceipts?.[key]&&this.s.combatReceipts[key]!==result)add(this.s.combatReceipts[key]);
 let settled=null;try{settled=JSON.parse(this.s.global.LAST_BATTLE_RESULT_JSON||'null');}catch{}
 if(settled&&(settled.battleId||settled.id)===key){add(settled);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(settled);}
 const log=this.s.log.findLast(x=>(x?.battleId||x?.id)===key);if(log&&log!==result)add(log);
 return result;
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,bad=()=>fail('REGION_EVENT_SAVE','지역 사건 기록이 올바르지 않습니다.'),r=out.regionEvents;
 if(r!==undefined){
  if(!r||r.version!==1||!Number.isInteger(r.day)||!r.done||typeof r.done!=='object'||!Number.isInteger(r.primogems)||r.primogems<0||r.primogems>PRIMO_DAY||!r.total||typeof r.total!=='object'||!Number.isInteger(r.count)||r.count<0||!r.bought||typeof r.bought!=='object')bad();
  for(const [map,v] of Object.entries(r.done))if(!this.tables['32_MAP_DB'].has(map)||!K[v?.kind]||typeof v.outcome!=='string')bad();
  for(const [k,n] of Object.entries(r.total))if(!K[k]||!Number.isInteger(n)||n<0)bad();
  for(const [map,list] of Object.entries(r.bought))if(!this.tables['32_MAP_DB'].has(map)||!Array.isArray(list)||list.some(i=>!Number.isInteger(i)||i<0||i>2))bad();
  if(r.escort!==null&&r.escort!==undefined&&(typeof r.escort!=='object'||!this.tables['32_MAP_DB'].has(r.escort.to)||!this.tables['32_MAP_DB'].has(r.escort.map)))bad();
 }
 const e=out.runtime?.regionEvent;if(e&&(e.version!==1||!K[e.kind]||!this.tables['32_MAP_DB'].has(e.map)))bad();
 return out;
};
})(globalThis);
