/* 0.16.9: ordinary commissions teach existing activities and request real supplies.
 * No menu-open objectives, new scene, item or UI. Finite learning outcomes may use an
 * existing native completion receipt; all other activity objectives start on acceptance.
 * Delivery requirements are checked and consumed atomically by the shared task engine.
 */
(function(root){'use strict';
const c=root.CRPGTaskCatalogV0168;if(!c||c.learningV0169)return;
c.learningV0169=true;const map='MAP_MOND_CITY';
const lesson=(name,kind,goal,minLevel,description,reward,filter={})=>({name,kind,goal,minLevel,description,reward,filter});
const lessons=[
 lesson('의뢰 접수 연습','commission',1,1,'캐서린에게 다른 의뢰를 하나 수락하세요. 이 안내 의뢰 자체를 받는 것은 세지 않습니다.',{mora:600},{actions:['COMMISSION_ACCEPT']}),
 lesson('주변에서 재료 채집','gather',3,1,'야외의 채집 활동을 3번 마치세요. 얻은 재료의 종류와 개수는 관계없습니다.',{mora:900}),
 lesson('풍경 속 보물상자','chest',1,1,'풍경에서 보물상자를 찾고 필요한 퍼즐을 풀어 열어 보세요. 이미 연 상자 기록도 인정합니다.',{mora:700,primogem:5},{completedBeforeAccept:true}),
 lesson('신의 눈동자 조사','oculus',1,1,'야외의 눈동자 흔적을 조사하고 마지막 조건까지 해결해 눈동자를 얻으세요. 기존 수집 기록도 인정합니다.',{mora:1200,primogem:5},{completedBeforeAccept:true}),
 lesson('제작을 위한 채광','mine',2,1,'채광 구역에서 광석을 얻는 활동을 2번 마치세요.',{mora:1200}),
 lesson('회복 음식 요리','cook',1,1,'조리시설에 들어가 가지고 있는 제작법으로 음식을 한 번 요리하세요.',{mora:1000}),
 lesson('동료와 회복 음식 먹기','meal',1,1,'HP가 줄어든 캐릭터에게 회복 음식을 먹여 실제로 회복시키세요. 포만·전투불능·연속 음식 제한을 확인하세요.',{mora:1200}),
 lesson('숙박으로 파티 회복','sleep',1,1,'숙박시설에서 모라를 내고 숙박하세요. 기다리기나 전투불능 회복은 숙박에 포함되지 않습니다.',{mora:1000}),
 lesson('낚싯대와 미끼 준비','fish',1,1,'낚싯대와 미끼를 준비하고 낚시터에서 물고기를 한 번 낚으세요. 빈손으로 종료하면 세지 않습니다.',{mora:1500,primogem:5}),
 lesson('식재료 가공','process',1,1,'조리시설에서 설탕·크림 등 식재료를 한 번 가공하세요.',{mora:1200}),
 lesson('장비 제작의 첫걸음','forge',1,1,'대장간 등 해당 시설에서 장비를 한 번 제작하세요.',{mora:2000},{actions:['CRAFT'],equipmentOutput:true}),
 lesson('새 장비 장착','equip',1,1,'장비를 캐릭터에게 새로 장착하세요. 이미 장착된 같은 장비를 다시 누르면 세지 않습니다.',{mora:800}),
 lesson('장비 강화 체험','enhance',1,1,'대장간에서 광석과 모라를 내고 장비 강화를 한 번 시도하세요. 성공·유지·하락 모두 실제 시도로 인정합니다.',{mora:2000,primogem:5}),
 lesson('경험치 비경으로 레벨링','domain',2,1,'현재 입장 가능한 경험치 비경에서 2번 승리하세요. 경험치 책은 계시의 꽃에서 얻습니다.',{mora:2000,primogem:5},{domainTypes:['EXP']}),
 lesson('계시의 꽃과 경험치 책','ley',1,1,'모험가 핸드북의 지맥 정보를 확인하고 입장 가능한 계시의 꽃에서 승리하세요.',{mora:1500},{leyTypes:['REVELATION']}),
 lesson('현장 의뢰 결과 보고','commission',1,1,'다른 의뢰를 실제로 마친 뒤 캐서린에게 보고하고 보상을 받으세요. 안내 의뢰의 보고는 세지 않습니다.',{mora:1800,primogem:5},{actions:['CLAIM_QUEST']}),
 lesson('개인 임무를 통한 만남','bond',1,1,'소개받은 동료의 개인 임무를 끝까지 완료하세요. 이미 완료한 개인 임무도 인정합니다.',{mora:2500,primogem:10},{actions:['LEGEND_COMPLETE'],completedBeforeAccept:true}),
 lesson('호감도와 관계 사건','bond',1,1,'동료와 함께 싸워 호감도를 쌓고 열린 관계 사건 하나를 끝까지 완료하세요. 기존 완료 기록도 인정합니다.',{mora:2000,primogem:10},{actions:['AFFECTION_COMPLETE'],completedBeforeAccept:true}),
 lesson('길 위의 돌발상황','encounter',1,1,'야외에서 발생한 지역 사건을 해결하세요. 거절·동행 시작·전투 진입만으로는 완료되지 않습니다.',{mora:2500,primogem:10}),
 lesson('모아 온 눈동자 공양','oculusOffer',1,1,'공양처에서 수집한 눈동자를 공양하세요. 이미 완료한 공양 기록도 인정합니다.',{mora:2000,primogem:10},{completedBeforeAccept:true}),
 lesson('핸드북에서 업적 보상 받기','handbook',1,1,'모험가 핸드북에서 달성한 업적의 보상을 받으세요. 화면을 열기만 하면 세지 않습니다. 기존 수령 기록도 인정합니다.',{mora:1500,primogem:5},{actions:['ACHIEVEMENT_CLAIM'],completedBeforeAccept:true}),
 lesson('핸드북으로 필드 보스 찾기','boss',1,15,'모험가 핸드북의 토벌 정보를 참고해 입장 가능한 필드 보스를 하나 토벌하세요.',{mora:3500,primogem:10}),
 lesson('부의 꽃과 강화 자금','ley',2,1,'입장 가능한 부의 꽃에서 2번 승리해 강화 자금을 모으세요.',{mora:4000},{leyTypes:['WEALTH']}),
 lesson('나선비경 첫 공략','abyss',1,10,'파티를 준비해 나선비경의 입장 가능한 방에서 한 번 승리하세요.',{mora:4000,primogem:20})
];
const learning=lessons.map((t,i)=>({...t,id:'Q_TASK_LEARN_'+String(i+1).padStart(2,'0'),family:'LEARN',tier:i+1,map,region:'몬드',predecessor:i?'Q_TASK_LEARN_'+String(i).padStart(2,'0'):'',successor:i+1<lessons.length?'Q_TASK_LEARN_'+String(i+2).padStart(2,'0'):'',rewardScale:'absolute',learning:true}));
// Replacement budgets include supplied stock, not just the recipe's Mora fee. Each is finite.
const supplies=[
 ['SUPPLIES','야외 보급품',[
  ['달콤달콤꽃 8개 납품',{ING_SWEET_FLOWER:8},160,0,1],
  ['짐승고기 6개 납품',{ING_RAW_MEAT:6},240,0,1],
  ['생선 살코기 6개 납품',{ING_FISH:6},240,5,1],
  ['새알 10개 납품',{ING_BIRD_EGG:10},240,0,1],
  ['철광 12개 납품',{ORE_IRON:12},480,5,1],
  ['백철 8개 납품',{ORE_WHITE_IRON:8},780,10,5]
 ]],
 ['PROVISIONS','가공 재료 보급',[
  ['밀가루 4개 납품',{ING_FLOUR:4},160,0,1],
  ['설탕 6개 납품',{ING_SUGAR:6},200,5,1],
  ['크림 6개 납품',{ING_CREAM:6},240,0,1],
  ['버터 4개 납품',{ING_BUTTER:4},320,5,1],
  ['과일잼 4개 납품',{ING_JAM:4},440,10,1],
  ['훈제 새고기 4개 납품',{ING_SMOKED_FOWL:4},240,10,1]
 ]],
 ['KITCHEN_DELIVERY','원정용 음식 보급',[
  ['스테이크 4개 납품',{FOOD_STEAK:4},320,0,1],
  ['몬드 생선구이 4개 납품',{FOOD_MOND_GRILLED_FISH:4},240,5,1],
  ['달콤달콤 닭고기 스튜 4개 납품',{FOOD_SWEET_MADAME:4},480,5,1],
  ['크림 스튜 3개 납품',{FOOD_CREAM_STEW:3},640,10,1],
  ['몬드 감자전 3개 납품',{FOOD_HASH_BROWN:3},580,10,1],
  ['냉채수육 2개 납품',{FOOD_COLD_CUT:2},520,15,1]
 ]]
];
const delivery=[];
for(const[family,title,rows]of supplies)for(let i=0;i<rows.length;i++){
 const[name,items,mora,primogem,minLevel]=rows[i],id='Q_TASK_'+family+'_'+String(i+1).padStart(2,'0');
 delivery.push({id,family,tier:i+1,map,region:'몬드',kind:'delivery',goal:1,minLevel,name,description:name+'을 준비해 캐서린에게 보고하세요. 보고할 때 실제 물품을 넘깁니다.',filter:{},delivery:{items},reward:{mora,...(primogem?{primogem}:{})},rewardScale:'absolute',predecessor:i?'Q_TASK_'+family+'_'+String(i).padStart(2,'0'):'',successor:i+1<rows.length?'Q_TASK_'+family+'_'+String(i+2).padStart(2,'0'):''});
}
const gear=[
 ['EQ_ARMOR_TRAVEL_COAT','여행자 외투',160,0,1],
 ['EQ_ARMOR_REINFORCED_LEATHER','보강 가죽갑옷',400,5,3],
 ['EQ_ACC_VITAL_RING','생명 반지',480,5,3],
 ['EQ_ACC_SHARP_CHARM','예리함의 부적',500,10,3],
 ['EQ_ARMOR_IRON_GUARD','철제 수호갑',900,10,5],
 ['EQ_ACC_STEADFAST','불굴의 수호석',1400,20,10]
];
for(let i=0;i<gear.length;i++){
 const[equip,name,mora,primogem,minLevel]=gear[i],id='Q_TASK_GEAR_DELIVERY_'+String(i+1).padStart(2,'0');
 delivery.push({id,family:'GEAR_DELIVERY',tier:i+1,map,region:'몬드',kind:'delivery',goal:1,minLevel,name:name+' 1개 납품',description:name+'의 미장착·미강화 여분 1개를 준비해 캐서린에게 보고하세요. 잠금·강화·돌파·장착한 장비는 넘기지 않습니다.',filter:{},delivery:{equipment:{[equip]:1}},reward:{mora,...(primogem?{primogem}:{})},rewardScale:'absolute',predecessor:i?'Q_TASK_GEAR_DELIVERY_'+String(i).padStart(2,'0'):'',successor:i+1<gear.length?'Q_TASK_GEAR_DELIVERY_'+String(i+2).padStart(2,'0'):''});
}
c.chains.push(...learning,...delivery);
c.kinds=[...new Set([...(c.kinds||[]),'commission','chest','oculus','oculusOffer','sleep','process','equip','enhance','artifactEnhance','meal','bond','encounter','handbook','acquire','delivery'])];
c.families.push({id:'LEARN',name:'모험 활동 안내',map,count:learning.length},...supplies.map(([id,name,rows])=>({id,name,map,count:rows.length})),{id:'GEAR_DELIVERY',name:'장비 보급',map,count:gear.length});
const bands=(first,mid,last)=>[{minLevel:1,mora:first},{minLevel:30,mora:mid},{minLevel:50,mora:last}];
const weekly=[
 {id:'W_V169_INN',kind:'sleep',goal:5,name:'숙박시설에서 5번 숙박',icon:'life',reward:{moraByLevel:bands(3000,4200,5000)}},
 {id:'W_V169_PROCESS',kind:'process',goal:12,name:'식재료 12회 가공',icon:'life',reward:{moraByLevel:bands(3500,8500,14000)}},
 {id:'W_V169_INCIDENT',kind:'encounter',goal:8,name:'지역 돌발상황 8번 해결',icon:'life',reward:{primogem:35,moraByLevel:bands(3000,7000,11000)}},
 {id:'W_V169_REPORT',kind:'commission',goal:6,name:'현장 의뢰 6번 보고',icon:'life',filter:{actions:['CLAIM_QUEST']},reward:{moraByLevel:bands(5000,10000,16000)}},
 {id:'W_V169_ENHANCE',kind:'enhance',goal:4,name:'장비 강화 4번 시도',icon:'forge',reward:{moraByLevel:bands(4500,16000,27000)}},
 {id:'W_V169_ARTIFACT_ENHANCE',kind:'artifactEnhance',goal:4,name:'성유물 강화 4번 시도',minLevel:40,icon:'forge',filter:{artifactUnlocked:true},reward:{primogem:30,moraByLevel:bands(4500,15000,25000)}},
 {id:'W_V169_RECOVERY_MEAL',kind:'meal',goal:12,name:'회복 음식으로 캐릭터 12번 회복',icon:'life',reward:{moraByLevel:bands(3000,6000,10000)}}
];
c.weekly.push(...weekly);
c.stats={...c.stats,daily:c.daily.length,weekly:c.weekly.length,chains:c.chains.length,families:c.families.length};
c.learningV0169Info={lessons:learning.length,deliveries:delivery.length,weekly:weekly.length,finiteEvidence:'native receipts only; flagged learning objectives',equipmentPolicy:'Only unequipped, unlocked, unenhanced, unascended spare gear',learningMora:learning.reduce((n,t)=>n+(t.reward.mora||0),0),learningPrimogems:learning.reduce((n,t)=>n+(t.reward.primogem||0),0),deliveryMora:delivery.reduce((n,t)=>n+(t.reward.mora||0),0),deliveryPrimogems:delivery.reduce((n,t)=>n+(t.reward.primogem||0),0)};
// 0.16.11: retain the exact former definitions for validation of accepted 0.16.9
// objectives before applying the user-requested removals and prerequisite links.
c.snapshotV0169=JSON.parse(JSON.stringify({
 version:c.version,daily:[...c.legacyDaily,...c.daily],weekly:[...c.legacyWeekly,...c.weekly],chains:c.chains,
 legacyDaily:c.legacyDaily,legacyWeekly:c.legacyWeekly,legacyChains:c.legacyChains,
 legacyDailyDefinitions:c.legacyDailyDefinitions,legacyWeeklyDefinitions:c.legacyWeeklyDefinitions,
 stats:c.stats,notes:c.notes,learningV0169Info:c.learningV0169Info
}));
const removedRecurringIds=['D_V168_HILI','W_V168_MOND_PATROL','W_V169_REPORT','W_V168_CRYO_VINE'];
c.daily=c.daily.filter(t=>!removedRecurringIds.includes(t.id));
c.weekly=c.weekly.filter(t=>!removedRecurringIds.includes(t.id));
const acceptanceRoot='Q_TASK_LEARN_01',byId=new Map(c.chains.map(t=>[t.id,t]));
const setPrerequisites=(t,ids)=>{t.predecessor=ids[0]||'';if(ids.length>1)t.prerequisites=ids.slice();else delete t.prerequisites;};
const lessonBranches={
 1:[],2:[1],3:[1],4:[3],5:[2],6:[2],7:[6],8:[7],9:[2],10:[6],11:[5],12:[11],
 13:[12],14:[1],15:[14],16:[2],17:[16],18:[17],19:[1],20:[4],21:[1],22:[14,12],23:[15,13],24:[14,12]
};
const lessonId=n=>'Q_TASK_LEARN_'+String(n).padStart(2,'0');
for(const[n,ids]of Object.entries(lessonBranches))setPrerequisites(byId.get(lessonId(n)),ids.map(lessonId));
const rootLesson=byId.get(acceptanceRoot);
rootLesson.acceptancePractice=true;
rootLesson.description='이 의뢰를 수락한 뒤 캐서린에게 보고하세요. 접수와 보고를 마치면 다른 임무 갈래가 열립니다.';
rootLesson.filter={actions:['COMMISSION_ACCEPT'],entities:[acceptanceRoot]};
// Ordinary commissions are finite. An account that has already reported all of
// them can demonstrate its real claimed receipt instead of needing a new one.
const reportLesson=byId.get('Q_TASK_LEARN_16');
reportLesson.filter={...reportLesson.filter,completedBeforeAccept:true};
reportLesson.description+=' 이미 보고를 마친 일반 의뢰 기록도 인정합니다.';
// Each existing activity chain starts after its matching lesson. Its later ten
// parts keep the original predecessor, roster, native unlock and reward rules.
const familyLesson={
 MOND_PATROL:16,LIYUE_PATROL:16,SLIME:16,HILICHURL:16,BANDITS:16,RUINS:16,
 MOND_GATHER:2,LIYUE_GATHER:2,MINING:5,FISH_HUNT:9,COOKING:6,FORGING:11,
 REVELATION:15,WEALTH:23,TALENT:14,ASCENSION:14,EXPERIENCE:14,
 MOND_BOSSES:22,LIYUE_BOSSES:22,ABYSS:24,MONO_ANEMO:17,DOUBLE_PAIRS:17,MOND_SQUADS:17,LIYUE_SQUADS:17,
 SUPPLIES:2,PROVISIONS:10,KITCHEN_DELIVERY:6,GEAR_DELIVERY:11
};
for(const t of c.chains)if(t.tier===1&&t.family!=='LEARN')setPrerequisites(t,[lessonId(familyLesson[t.family])]);
c.oneTimeBranches=Object.fromEntries(c.chains.map(t=>[t.id,t.prerequisites?.slice()||(t.predecessor?[t.predecessor]:[])]));
for(const t of c.chains){
 const children=c.chains.filter(next=>c.oneTimeBranches[next.id].includes(t.id)).map(next=>next.id);
 t.successors=children;if(children.length===1)t.successor=children[0];else delete t.successor;
}
// These maps select the visible frontier of the existing recurring catalogs.
// Successors start counting after every predecessor reward is claimed in the
// same period; siblings may still share a successful native activity.
c.dailyBranches={
 D_WIN:[],D_LIFE:[],D_V168_PYRO_HYDRO:['D_WIN'],D_LEY:['D_WIN'],
 D_V168_REVELATION15:['D_LEY'],D_V168_WEALTH30:['D_LEY'],D_DOMAIN:['D_WIN'],
 D_V168_TALENT15:['D_DOMAIN'],D_V168_ASCENSION40:['D_DOMAIN'],
 D_V168_APPLE:['D_LIFE'],D_V168_STEAK:['D_V168_APPLE']
};
c.weeklyBranches={
 W_V168_REACTION:[],W_DOMAIN:[],W_V168_GATHER:[],W_V168_MINE:[],W_BONUS:[],
 W_WIN:['W_V168_REACTION'],W_BOSS:['W_V168_REACTION'],W_V168_OCEANID:['W_BOSS'],
 W_V168_LIYUE_PATROL:['W_V168_REACTION'],W_V168_REVELATION:['W_V168_REACTION'],W_V168_WEALTH:['W_V168_REVELATION'],
 W_V168_EXPERIENCE:['W_DOMAIN'],W_V168_TALENT30:['W_V168_EXPERIENCE'],W_V168_ASCENSION:['W_V168_EXPERIENCE'],
 W_V168_DOMAIN_CIRCUIT:['W_V168_TALENT30','W_V168_ASCENSION'],W_V168_ABYSS:['W_DOMAIN'],
 W_V168_FISH:['W_V168_GATHER'],W_V168_HUNT:['W_V168_GATHER'],W_V168_COOK:['W_V168_GATHER'],
 W_V168_FORGE:['W_V168_MINE'],W_V168_ORE_SUPPLY:['W_V168_MINE'],W_V168_LIFE_SUPPLY:['W_V168_GATHER','W_V168_MINE'],
 W_V169_INN:['W_V168_REACTION'],W_V169_PROCESS:['W_V168_COOK'],W_V169_INCIDENT:['W_V168_REACTION'],
 W_V169_ENHANCE:['W_V168_FORGE'],W_V169_ARTIFACT_ENHANCE:['W_V169_ENHANCE'],W_V169_RECOVERY_MEAL:['W_V168_COOK']
};
const elementalDaily=c.daily.find(t=>t.id==='D_V168_PYRO_HYDRO');
elementalDaily.fallbackName='추가 전투 5번 이기기';elementalDaily.fallbackShort='추가 5승';
c.version='0.16.11';c.branchVersion=171;c.removedRecurringIds=removedRecurringIds;
c.branchRoot=acceptanceRoot;
c.stats={...c.stats,daily:c.daily.length,weekly:c.weekly.length,chains:c.chains.length};
c.notes={...c.notes,successors:'ALL_PREREQUISITES_CLAIMED',dailySlots:11,weeklySlots:28,totalDailyCandidates:11,totalWeeklyCandidates:28,
 recurringProgress:'Only unlocked targets count; successors start after prerequisite rewards are claimed in the same period.',
 acceptancePractice:'Accept this native root commission, then report it. Self-acceptance credits only this root.'};
// 0.16.12: retain the entire strict 171 branch catalogue before also retiring
// the matching Liyue regional weekly patrol. Existing period payouts survive.
c.snapshotV01611=JSON.parse(JSON.stringify({
 version:c.version,branchVersion:c.branchVersion,daily:[...c.legacyDaily,...c.daily],weekly:[...c.legacyWeekly,...c.weekly],chains:c.chains,
 dailyBranches:c.dailyBranches,weeklyBranches:c.weeklyBranches,oneTimeBranches:c.oneTimeBranches,
 stats:c.stats,notes:c.notes,removedRecurringIds:c.removedRecurringIds
}));
c.weekly=c.weekly.filter(t=>t.id!=='W_V168_LIYUE_PATROL');
delete c.weeklyBranches.W_V168_LIYUE_PATROL;
c.version='0.16.12';c.branchVersion=172;
c.removedRecurringIds=[...c.removedRecurringIds,'W_V168_LIYUE_PATROL'];
c.stats={...c.stats,weekly:c.weekly.length};
c.notes={...c.notes,weeklySlots:27,totalWeeklyCandidates:27};
})(globalThis);
