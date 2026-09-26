/* v0.13.35 quality fixes: field commission UX, guild reporting, richer Mond character voice. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.qualityFixesVersion)return;
const old={apply:P.apply,actionReason:P.actionReason,claimQuest:P.claimQuest,storyDisplayText:P.storyDisplayText};
const copy=x=>JSON.parse(JSON.stringify(x)),json=x=>{try{return JSON.parse(x||'{}');}catch{return {};}},
 fail=(c,m)=>{throw new api.RuleError(c,m);};

const PUZZLES={
 Q_MOND_EXP_PLAINS_CART:{prompt:'수레는 도랑에 기울어 있고 봉인 상자는 아래에 끼어 있다. 가장 먼저 해야 할 일은?',answer:0,options:['짐끈을 고정해 상자가 더 미끄러지지 않게 한다','바퀴부터 힘껏 밀어 수레를 세운다','봉인 상자를 먼저 잡아당긴다'],choice:'careful',minutes:4,fail:'수레가 흔들린다. 먼저 하중이 움직이지 않게 잡아야 한다.'},
 Q_MOND_EXP_FOREST_CACHE:{prompt:'낙엽 아래의 끈은 나무뿌리 사이로 이어진다. 보관함을 안전하게 꺼내려면?',answer:1,options:['끈을 세게 당겨 위치를 확인한다','끈이 걸린 뿌리와 발판부터 확인한다','낙엽에 불을 붙여 주변을 비운다'],choice:'careful',minutes:5,fail:'보관함이 뿌리에 더 걸린다. 끈보다 주변 지형을 먼저 봐야 한다.'},
 Q_MOND_EXP_DRAGONSPINE_CACHE:{prompt:'경첩이 얼어붙었고 강풍이 손을 빠르게 식힌다. 작업 순서로 알맞은 것은?',answer:2,options:['바람을 맞으며 덮개를 계속 두드린다','보관함을 비탈 아래로 굴린다','바위 그늘에서 경첩 주변 얼음부터 조금씩 제거한다'],choice:'careful',minutes:6,fail:'손끝이 먼저 굳는다. 바람을 피할 자리를 확보하는 편이 낫다.'},
 Q_MOND_EXP_STORMTERROR_CACHE:{prompt:'끊어진 회랑 위로 느슨한 돌조각이 계속 떨어진다. 어느 길이 안전한가?',answer:1,options:['가장 짧은 무너진 회랑을 곧장 건넌다','벽면에 붙은 안정된 구간을 돌아간다','떨어지는 돌 사이의 간격을 외워 달린다'],choice:'careful',minutes:6,fail:'발판이 흔들린다. 거리보다 구조물이 남아 있는 길을 골라야 한다.'},
 Q_CRPG_MOND_EXP_WINDRISE_RIBBONS:{prompt:'끊어진 길잡이 리본을 다시 묶는다. 강풍 속에서도 방향표시가 보이게 하려면?',answer:0,options:['바람이 불어오는 쪽에서 보이도록 낮고 단단한 가지에 묶는다','가장 높은 가지만 골라 느슨하게 묶는다','강가의 풀잎에 여러 장을 한꺼번에 묶는다'],choice:'careful',minutes:5,fail:'리본이 다시 뒤집힌다. 바람 방향과 고정할 곳을 함께 봐야 한다.'},
 Q_CRPG_MOND_EXP_SPRINGVALE_BASKET:{prompt:'넘어진 식량 바구니에서 젖은 것과 멀쩡한 것이 섞였다. 먼저 할 일은?',answer:2,options:['전부 한 자루에 다시 담는다','겉이 깨끗해 보이는 것부터 주민에게 돌린다','젖은 식량을 분리하고 바구니 바닥을 먼저 말린다'],choice:'careful',minutes:4,fail:'멀쩡한 식량까지 젖기 시작한다. 상태가 다른 물자를 먼저 나눠야 한다.'},
 Q_CRPG_MOND_EXP_FOREST_SIGNPOSTS:{prompt:'두 갈림길 표지판이 모두 쓰러졌다. 원래 방향을 찾는 가장 확실한 단서는?',answer:1,options:['표지판 글자가 잘 보이는 방향','최근 발자국과 길의 경사·지형을 함께 대조한다','해가 비치는 방향만 보고 정한다'],choice:'careful',minutes:6,fail:'한 가지 단서만으로는 두 길을 구분하기 어렵다. 서로 다른 흔적을 겹쳐 보자.'},
 Q_CRPG_MOND_EXP_WOLVENDOM_TRAPS:{prompt:'낡은 사냥 덫의 스프링에 아직 장력이 남아 있다. 어떻게 해체해야 할까?',answer:0,options:['긴 도구로 장력을 먼저 풀고 고정핀을 뺀다','덫을 밟아 닫힌 뒤 들어 올린다','줄을 끊고 바로 손으로 접는다'],choice:'careful',minutes:5,fail:'금속이 크게 튄다. 손을 대기 전에 남은 장력을 없애야 한다.'},
 Q_CRPG_MOND_EXP_DRAGONSPINE_MARKERS:{prompt:'눈보라에 귀환 표식이 묻혔다. 다음 표식을 세울 위치로 가장 알맞은 곳은?',answer:2,options:['멀리서 잘 보이는 바람받이 능선','눈이 가장 깊게 쌓인 골짜기','바람을 피하면서 앞뒤 표식이 동시에 보이는 바위 그늘'],choice:'careful',minutes:6,fail:'표식 자체가 눈보라에 가려진다. 귀환할 사람이 실제로 볼 수 있는 위치여야 한다.'},
 Q_CRPG_LIYUE_EXP_HARBOR_LEDGER:{prompt:'같은 화물이 두 장부에 중복 기록됐다. 실제 입고분을 가르는 핵심 비교는?',answer:1,options:['글씨체가 더 예쁜 장부를 고른다','서명과 도착 시각을 함께 맞춘다','수량이 적은 쪽을 진짜로 본다'],choice:'careful',minutes:5,fail:'수량만으로는 중복 여부를 알 수 없다. 같은 화물이 언제 누구에게 인계됐는지 봐야 한다.'},
 Q_CRPG_LIYUE_EXP_TREASURE_PROOF:{prompt:'보물 사냥단 휘장을 활동 범위 증거로 정리한다. 먼저 구분할 것은?',answer:0,options:['휘장의 종류와 마모·흙자국을 나눠 같은 야영지 흔적끼리 묶는다','가장 깨끗한 휘장만 제출한다','크기 순서대로만 쌓는다'],choice:'careful',minutes:4,fail:'모양만 정리해서는 어느 야영지에서 나온 것인지 비교하기 어렵다.'},
 Q_CRPG_LIYUE_EXP_QINGCE_PROVISIONS:{prompt:'공동 창고에 생선과 쌀을 넣는다. 오래 보관하려면?',answer:2,options:['생선과 쌀을 한 상자에 단단히 눌러 담는다','입구 가까운 곳에 전부 쌓는다','습기에 약한 쌀과 생선을 분리하고 먼저 쓸 물자를 앞으로 둔다'],choice:'careful',minutes:5,fail:'식량끼리 습기가 번진다. 재료마다 보관 조건을 나눠야 한다.'},
 Q_CRPG_LIYUE_EXP_JUEYUN_SURVEY:{prompt:'이정표 셋의 방향이 서로 맞지 않는다. 옮겨진 표식을 찾는 방법은?',answer:1,options:['가장 오래된 이정표를 그대로 믿는다','고도·발자국·바람 방향이 동시에 어긋나는 표식을 찾는다','가장 가까운 길을 가리키는 표식을 고른다'],choice:'careful',minutes:6,fail:'한 가지 기준만으로는 안개 속 이동 흔적을 구분할 수 없다.'},
 Q_CRPG_LIYUE_EXP_RUIN_PARTS_ORDER:{prompt:'가짜 유적 기계 부품이 섞였다. 분해 전에 확인할 것은?',answer:0,options:['맞물리는 면의 마모 방향과 기름때를 비교한다','무거운 부품을 진품으로 본다','표면이 반짝이는 부품을 진품으로 본다'],choice:'careful',minutes:5,fail:'겉모양만으로는 수리품과 가짜를 가르기 어렵다. 실제로 맞물렸던 흔적을 보자.'},
 Q_CRPG_LIYUE_EXP_THREE_PATROLS:{prompt:'세 차례 순찰 기록을 제출한다. 서로 다른 날의 기록을 검증하려면?',answer:2,options:['가장 전투가 많았던 날만 남긴다','세 기록의 결론만 한 줄로 합친다','시간·경로·조우 지점을 순서대로 맞춰 중복 동선을 지운다'],choice:'careful',minutes:5,fail:'결론만 합치면 같은 구역을 두 번 센 기록을 찾을 수 없다.'}
};

const STORY_TEXT={
 LEG_MOND_BARBARA_N002:'용의 습격이 지나간 뒤에도 성당 앞은 좀처럼 조용해지지 않는다. 치료를 기다리는 사람, 무사한 얼굴을 확인하러 온 가족, 바바라의 노래를 듣고 싶다며 몰려든 시민이 한 줄에 뒤엉켜 있다. 가림막 안에는 소음만으로도 지쳐 버린 환자가 쉬고 있고, 진료대 한쪽에는 분명 있어야 할 붕대 상자가 비어 있다. 바바라는 미소를 잃지 않으려 애쓰면서도, 오늘 필요한 건 공연이 아니라 사람과 물자를 제자리에 돌려놓는 일이라고 판단한다.',
 LEG_MOND_BARBARA_N003:'기다려 주셔서 정말 감사해요. 하지만 오늘은 노래를 들려드리기 전에 치료가 필요한 분부터 들어오실 수 있게 해야 해요. 그리고 가림막 안에 누가 있는지는 말씀드릴 수 없어요. 응원하는 마음은 고맙지만, 아픈 분에게는 박수보다 조용히 숨을 돌릴 시간이 먼저 필요하니까요. 여행자 님, 제가 안쪽을 맡을 테니 바깥 상황을 조금만 같이 정리해 주실래요?',
 LEG_MOND_BARBARA_N009:'진료 대기줄을 정리하고 나서야 이상한 점이 선명해진다. 붕대와 허브가 도착하지 않은 것이 아니라 같은 골목의 임시 진료소에 세 상자가 연달아 쌓여 있었다. 배송표에는 서로 다른 목적지가 적혔지만 도장이 같은 방향으로 겹쳐 찍혀 있다. 누군가 훔친 흔적은 없고, 서둘러 옮기던 과정에서 표식이 뒤바뀐 듯하다. 문제를 밝히는 동안에도 다른 진료소의 물품은 계속 부족해지고 있다.',
 LEG_MOND_BARBARA_N010:'세 번째 상자까지 이쪽으로 왔다면 다른 진료소는 빈손으로 기다리고 있을 거예요. 누가 실수했는지 찾아서 꾸짖는 건 나중에도 할 수 있어요. 지금은 상자의 원래 목적지를 확인해서 필요한 곳부터 채워요. 여행자 님은 배송표와 골목 표식을 봐 주세요. 저는 남아 있는 환자 수와 필요한 물품을 맞춰 볼게요. 둘이 맞으면 어느 상자가 어디로 가야 하는지 알 수 있을 거예요.',
 LEG_MOND_BARBARA_N013:'잘못 배달된 상자를 모두 돌려놓자 마지막으로 남은 문제는 물건이 아니라 사람이다. 조용한 치료를 원하는 환자 앞에서 바바라 팬 몇 명이 걱정된다는 이유로 소식을 묻고, 다른 쪽에서는 짧게라도 노래를 들려 달라는 요청이 이어진다. 바바라는 문손잡이에 손을 얹은 채 잠시 멈춘다. 모두 선의라는 걸 알기에 더 쉽게 거절하지 못하는 표정이다. 하지만 지금 누구의 마음을 먼저 확인해야 하는지는 분명하다.',
 LEG_MOND_BARBARA_N014:'제가 힘이 되어 드리고 싶다는 마음만 앞세우면 안 되겠죠. 노래가 편한지, 그냥 조용히 쉬는 게 편한지, 필요한 게 물인지 약인지 먼저 직접 여쭤볼게요. 사람마다 힘이 되는 소리가 다르다는 걸 알고 있으면서도, 모두를 웃게 해야 한다고 생각하면 가끔 그걸 잊어요. 오늘은 제가 답을 정하지 않고 듣는 쪽부터 해 볼게요.',
 LEG_MOND_BARBARA_N021:'진료 시간이 끝난 뒤 성당 뒤편 계단에는 낮 동안 쓰던 빈 물통과 접힌 안내표만 남는다. 바바라는 사람들에게 보이던 미소를 잠시 내려놓고 한동안 말없이 앉아 있는다. 노래를 기다렸던 사람들에게 미안했고, 환자 앞에서 지친 얼굴을 보인 것 같아 또 미안했다고 한다. 그러다 오늘 하루를 되짚으며, 웃고 노래하지 않는 순간에도 자신이 누군가에게 도움이 될 수 있었다는 사실을 처음에는 조금 낯설어한다.',
 LEG_MOND_BARBARA_N022:'사람들에게 힘을 주고 싶어서 노래를 시작했는데, 어느 순간부터 제가 힘든 표정을 보이면 안 된다고 생각했나 봐요. 오늘은 노래할 기운이 없어서 미안했어요. 그래도 물품을 찾아 옮기고, 환자분 말을 듣고, 줄이 다시 엉키지 않게 만든 것도 분명 도움이었죠. 웃는 얼굴이 아니어도 누군가 곁에 있어 줄 수 있다는 걸… 여행자 님과 같이 일하면서 조금 알 것 같아요.',
 LEG_MOND_BARBARA_N024:'고마워요. 오늘처럼 현장에서 필요한 일을 직접 보고 움직이는 경험을 더 해 보고 싶어요. 성당의 진료와 예배를 소홀히 하겠다는 뜻은 아니에요. 일정이 허락하는 날에는 여행자 님 일행과 함께 밖으로 나가서, 다친 사람이 생겼을 때 노래보다 먼저 필요한 치료를 해 주고 싶어요. 제가 제 일을 마친 뒤에 합류하는 거라면… 다음 현장에는 저도 함께 가도 될까요?',
 LEG_MOND_EULA_N003:'그 문양이 로렌스 가문의 것이라는 건 나도 알아. 그리고 그걸 본 순간 몇 명이 어떤 표정을 지었는지도 봤지. 사람보다 성부터 의심한 그 시선은… 이 원한, 기억해두겠어. 하지만 원한과 증거는 다른 문제야. 이 계급장을 주운 위치 하나만으로 내가 부대를 배신했다는 결론을 내리진 마.',
 LEG_MOND_EULA_N011:'좋아, 미카. 대원들은 바람이 덜 부는 쪽으로 보내. 기록이 이렇게 정확한데도 네 지도를 대충 봤다고 말하는 사람이 있다면 그 원한도 내가 기억해두지. 여행자는 나와 함께 이 발자국이 끊기는 지점을 봐. 가문 이름보다 현장에 남은 자국이 훨씬 말이 많으니까.',
 LEG_MOND_EULA_N021:'내 가문의 문양을 일부러 미끼로 썼군. 사람들이 로렌스라는 이름만 보면 다른 증거를 잊을 거라고 생각했고. 이 원한, 기억해두겠어. 하지만 네 죄를 정하는 건 내 기분이 아니야. 물자를 빼돌린 장부와 네가 남긴 흔적, 그게 증거지. 시민을 모욕했다는 이유로 죄를 덧붙일 생각도 없어.',
 LEG_MOND_EULA_N024:'차가운 곳에서 남의 이름만 보고 결론부터 내리면 길을 잃기 쉬워. 오늘 여행자가 끝까지 흔적을 같이 확인해 준 일도 기억해두겠어. 도움을 받은 것도 일종의 원한이니까 말이야. 언젠가 갚을 기회를 빼앗지는 마.',
 LEG_MOND_EULA_N026:'그래, 고맙다고만 하면 너무 싱겁겠지. 이 원한, 기억해두겠어. 다음 조사는 내가 동행할 테니 그때 제대로 갚을 방법을 정하지. 내가 먼저 따라가겠다고 했으니 도망갈 생각은 하지 마.'
};

P.commissionGuildPlace=function(region){
 const want=region==='리월'?'NPC_LIYUE_KATHERYNE':'NPC_MOND_KATHERYNE';
 return this.placeCatalog?.().find(e=>e.entity===want)||null;
};
P.atCommissionGuild=function(region=''){
 const p=this.currentPlace?.(),want=region==='리월'?'NPC_LIYUE_KATHERYNE':region==='몬드'?'NPC_MOND_KATHERYNE':null;
 return !!(p?.valid&&p.mode==='TALK'&&(!want?['NPC_MOND_KATHERYNE','NPC_LIYUE_KATHERYNE'].includes(p.entity):p.entity===want));
};
P.commissionFieldEntries=function(){
 const map=this.s.global.CURRENT_MAP_ID;
 return (this.commissionEntries?.()||[]).filter(q=>q.accepted&&!q.state?.claimed&&q.definition?.kind==='exploration'&&q.definition.map_id===map).map(q=>{
  const spec=PUZZLES[q.row[0]],stage=spec&&!q.state?.puzzleSolved?spec:null;
  return {...q,readyToReport:q.state?.node==='READY_TO_CLAIM',awaitingBattle:q.state?.node==='AWAIT_VICTORY',puzzle:stage?copy(stage):null};
 });
};
P.commissionPuzzle=function(id,answer){
 if(this.s.runtime)fail('COMMISSION_PUZZLE','전투를 먼저 마쳐 주세요.');
 const spec=PUZZLES[id],row=this.tables['22_QUEST_DB'].get(id),q=this.s.quests[id];
 if(!spec||!row||!this.isCommission?.(id)||!this.commissionAccepted?.(id)||q?.claimed)fail('COMMISSION_PUZZLE','현재 조사할 수 있는 의뢰가 아닙니다.');
 const d=json(row[10]);if(this.s.global.CURRENT_MAP_ID!==d.map_id||this.s.placeVisit)fail('COMMISSION_PUZZLE','의뢰 현장의 메인 화면에서 조사해 주세요.');
 if(q?.node==='READY_TO_CLAIM')fail('COMMISSION_PUZZLE','현장 조사는 끝났습니다. 캐서린에게 보고해 주세요.');
 if(q?.node==='AWAIT_VICTORY')fail('COMMISSION_PUZZLE','진행 중인 전투를 마쳐 주세요.');
 const reason=this.questConditions(id);if(reason)fail('COMMISSION_PUZZLE',reason);
 if(!Number.isInteger(answer)||answer<0||answer>=spec.options.length)fail('COMMISSION_PUZZLE','조사 방법을 하나 선택해 주세요.');
 if(answer!==spec.answer){q.puzzleMistakes=(q.puzzleMistakes||0)+1;this.advanceTime(2);return {quest:id,puzzle:true,correct:false,minutes:2,text:spec.fail};}
 q.puzzleSolved=true;this.advanceTime(spec.minutes||5);
 const choice=(d.choices||[]).find(c=>c.id===spec.choice)||(d.choices||[]).find(c=>!['leave','requirements'].includes(c.id)&&!c.combat_group);
 if(!choice)fail('COMMISSION_PUZZLE','현장 해결 선택지가 연결되지 않았습니다.');
 const result=this.questChoice(id,choice.id),minutes=(spec.minutes||5)+Number(choice.minutes||0);
 return {...result,puzzle:true,correct:true,minutes,text:result?.text||'단서를 맞춰 현장 목표를 해결했다.'};
};
P.claimQuest=function(id,equipment){
 if(!this.isCommission?.(id))return old.claimQuest.call(this,id,equipment);
 const row=this.row('22_QUEST_DB',id),d=json(row[10]),rewards=json(row[11]),q=this.questState(id);
 if(q.claimed)fail('ALREADY_CLAIMED','이미 보상을 수령했습니다.');
 if(q.node!==d.claim_node)fail('OBJECTIVE','현장 목표를 먼저 완료해 주세요.');
 if(!this.atCommissionGuild(row[2]))fail('QUEST_REPORT',(row[2]||'해당 지역')+'의 캐서린에게 직접 보고해야 보상을 받을 수 있습니다.');
 if(rewards.equipment_choice&&!rewards.equipment_choice.includes(equipment))fail('REWARD_CHOICE','보급 장비 하나를 선택해 주세요.');
 for(const [iid,n]of Object.entries(rewards.items||{}))this.giveItem(iid,n);
 this.s.global.MORA+=Number(rewards.mora||0);if(equipment)this.giveEquipment(equipment);
 if(Number(rewards.xp)>0)this.addXp('PLAYER_CUSTOM',Math.floor(Number(rewards.xp)));
 Object.assign(this.s.flags,rewards.flags||{});Object.assign(q,{claimed:true,state:'완료',node:'COMPLETE',completedTurn:this.s.global.TURN});
 this.s.global.SCREEN_MODE='DIALOGUE';
 return {quest:id,rewards,equipment:equipment||null,reported:true,xp:Number(rewards.xp||0)};
};
P.actionReason=function(type,a={}){
 if(type==='COMMISSION_PUZZLE'){
  const spec=PUZZLES[a.quest],row=this.tables['22_QUEST_DB']?.get(a.quest),q=this.s.quests[a.quest];if(!spec||!row||!this.commissionAccepted?.(a.quest)||q?.claimed)return '현재 조사할 수 있는 의뢰가 아닙니다.';
  const d=json(row[10]);if(this.s.global.CURRENT_MAP_ID!==d.map_id||this.s.placeVisit)return '의뢰 현장의 메인 화면에서 조사해 주세요.';
  if(q?.node==='READY_TO_CLAIM')return '현장 조사는 끝났습니다. 캐서린에게 보고해 주세요.';
  return this.questConditions(a.quest)||'';
 }
 if(type==='CLAIM_QUEST'&&this.isCommission?.(a.quest)){
  const row=this.tables['22_QUEST_DB'].get(a.quest),d=json(row?.[10]),q=this.s.quests[a.quest],reward=json(row?.[11]);
  if(!q||q.claimed)return '이미 보상을 수령했거나 보고할 의뢰가 없습니다.';
  if(q.node!==d.claim_node)return '현장 목표를 먼저 완료해 주세요.';
  if(!this.atCommissionGuild(row[2]))return (row[2]||'해당 지역')+'의 캐서린에게 직접 보고해야 보상을 받을 수 있습니다.';
  if(reward.equipment_choice&&a.equipment&&!reward.equipment_choice.includes(a.equipment))return '이 의뢰의 보상 장비가 아닙니다.';
  return '';
 }
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){if(a.type==='COMMISSION_PUZZLE')return this.commissionPuzzle(a.quest,a.answer);return old.apply.call(this,a);};
P.storyDisplayText=function(row){const override=STORY_TEXT[row?.[4]];return override!==undefined?override:(old.storyDisplayText?old.storyDisplayText.call(this,row):row?.[9]||'');};
P.qualityFixesVersion=1;api.qualityFixesVersion=1;api.commissionPuzzles=copy(PUZZLES);
})(globalThis);


/* v0.13.36 quality pass: pinned objectives, forge economy, acquaintance, region travel. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.qualityFixesV2)return;
const prior={
 newGame:P.newGame,validateSave:P.validateSave,apply:P.apply,actionReason:P.actionReason,
 edgeReason:P.edgeReason,move:P.move,navigationGoal:P.navigationGoal,storyDisplayText:P.storyDisplayText,
 storySetCompanion:P.storySetCompanion,placeCatalog:P.placeCatalog,legendContactAllowed:P.legendContactAllowed
};
const cp=x=>JSON.parse(JSON.stringify(x)),json=(x,d={})=>{if(x&&typeof x==='object')return cp(x);try{return JSON.parse(x||'{}')}catch{return cp(d)}};
const fail=(c,m)=>{throw new api.RuleError(c,m)};
const DIRECT_REGION=new Set([
 'EDGE_NAV_MOND_TO_LIYUE_ROAD','EDGE_NAV_LIYUE_ROAD_TO_MOND',
 'EDGE_CRPG_MOND_CITY_TO_LIYUE_HARBOR','EDGE_CRPG_LIYUE_HARBOR_TO_MOND_CITY'
]);
const RAZOR_PLACE='EVT_QUALITY_RAZOR_WOLVENDOM';
const VENTI_REVEAL_TEXT={
 TRV_M02_N300:'다이루크는 바로 대답하지 않는다. 깨진 하프를 쥔 손이 잠시 멈추고, 벤티를 처음 보는 사람처럼 한 번 더 훑어본다. “…바르바토스라고?” 짧은 침묵 뒤 표정이 다시 굳어진다. “놀랄 일은 나중에 정리하지. 신이라고 해서 깨진 악기를 되돌리거나 사라진 용을 이 자리로 데려올 수는 없겠지. 이름을 안 건 중요하지만, 먼저 오늘 무엇이 실패했는지부터 말해. 드발린은 네 소리를 알아들었고, 그다음 심연 메이지가 상처를 찔렀다. 맞나?”',
 TRV_M02_N302:'진은 한동안 말을 잇지 못한다. 시선이 벤티와 드발린이 사라진 하늘 사이를 오가고, 무의식적으로 자세를 바로잡는다. “바르바토스 님…” 입 밖으로 나온 호칭을 스스로 듣고서야 숨을 고른다. “죄송합니다. 지금은 놀라고 있을 때가 아니군요. 몬드가 드발린을 수호자라 불러 온 기록과 오늘 시민들이 느낀 공포, 둘 다 외면할 수 없습니다. 사풍수호의 이야기를 처음부터 들려주십시오. 앞으로 무엇을 해야 할지 판단하려면 알아야 합니다.”',
 ISK_M05_AB_117:'다이루크는 눈썹을 아주 조금 찌푸린 채 벤티를 바라본다. “바르바토스… 네가?” 평소라면 바로 다음 질문을 던졌을 그도 잠깐 말을 고른다. 곧 시선이 벤티의 부상으로 내려간다. “정체 얘기는 나중에도 할 수 있어. 방금 빼앗긴 신의 심장 때문에 지금 상태가 더 나빠지는지부터 말해.”',
 ISK_M05_B_122:'진은 벤티를 바라본 채 몇 초 동안 아무 말도 하지 못한다. “바르바토스 님이… 정말 당신이셨군요.” 놀람과 당혹이 지나간 뒤, 그녀는 손에 쥔 천을 고쳐 잡고 기사단장의 표정으로 돌아온다. “하지만 지금은 먼저 다친 분을 지켜야 합니다. 시뇨라가 멋대로 붙인 이름입니다. 기사단은 어떤 담보도 약속한 적이 없고, 당신이 내놓은 물건도 아닙니다. 제 앞에서 공격하고 빼앗아 간 일이라는 사실은 제가 증언하겠습니다.”'
};

P.installQualityV2Content=function(){
 if(this._qualityV2ContentInstalled)return;
 this.db={...this.db};
 const set=(name,rows)=>{this.db[name]=rows;this.tables[name]=new Map(rows.slice(1).filter(r=>r&&r[0]).map(r=>[r[0],r]));};

 // Forged weapons and meaningful mining materials must come from crafting/mining, not a shop shortcut.
 const recipes=this.db['17_RECIPE_DB']||[],forgeOutputs=new Set(recipes.slice(1).filter(r=>r&&r[1]==='무기 제작'&&r[2]==='EQUIP'&&r[3]).map(r=>r[3]));
 const stock=this.db['19_SHOP_STOCK_DB']||[];
 if(stock.length){
  const blockedMaterials=new Set(['ORE_WHITE_IRON','ORE_CRYSTAL']);
  set('19_SHOP_STOCK_DB',[stock[0].slice(),...stock.slice(1).filter(r=>r&&r[0]&&!forgeOutputs.has(r[3])&&!blockedMaterials.has(r[3])).map(r=>r.slice())]);
 }

 // Player-facing quest item text must never expose branch/CE implementation names.
 const items=(this.db['14_ITEM_DB']||[]).map(r=>r.slice()),orb=items.find(r=>r[0]==='KEY_ISK_MYSTERY_ORB');
 if(orb){
  orb[5]='드발린 사건 뒤 주인공의 손에 남은 작은 수정구슬. 안쪽에서 희미한 빛이 움직이지만 정체와 제작자는 아직 알 수 없다.';
  orb[6]='특정 이야기 장면에서만 사용할 수 있다.';
  orb[7]='드발린의 오염에 반응한 흔적이 있지만, 정확한 작용은 아직 밝혀지지 않았다.';
  orb[22]='중요한 퀘스트 아이템. 판매·양도·폐기할 수 없다.';
  set('14_ITEM_DB',items);
 }

 // Restore a normal overland border road without turning it into the once-per-day city shortcut.
 const edges=(this.db['47_MAP_EDGE_DB']||[]).map(r=>r.slice());
 const add=row=>{if(!edges.some(r=>r[0]===row[0]))edges.push(row);};
 add(['EDGE_QUALITY_DAWN_TO_SHIMEN','MAP_MOND_DAWN_WINERY','MAP_LY_DETAIL_SHIMEN','WORLD_MOVE',2,60,'NAV_LIYUE_VISITED','','Y','석문 통행로로 이동','EDGE_QUALITY_SHIMEN_TO_DAWN','ACTIVE','CRPG_QUALITY_V01336','다운 와이너리와 석문을 잇는 일반 육로. 지역 직행 쿨다운 대상 아님.']);
 add(['EDGE_QUALITY_SHIMEN_TO_DAWN','MAP_LY_DETAIL_SHIMEN','MAP_MOND_DAWN_WINERY','WORLD_MOVE',2,60,'NAV_LIYUE_VISITED','','Y','다운 와이너리 방향으로 이동','EDGE_QUALITY_DAWN_TO_SHIMEN','ACTIVE','CRPG_QUALITY_V01336','석문에서 몬드 방면으로 돌아가는 일반 육로. 지역 직행 쿨다운 대상 아님.']);
 set('47_MAP_EDGE_DB',edges);
 this._placeCatalog=null;
 this._qualityV2ContentInstalled=true;
};

P.placeCatalog=function(){
 const list=prior.placeCatalog.call(this);
 if(!list.some(p=>p.id===RAZOR_PLACE))list.push({
  id:RAZOR_PLACE,kind:'FACILITY',entity:null,merchant:null,name:'울프 영지 · 레이저',facility:'울프 영지',
  maps:['MAP_MOND_WOLVENDOM'],from:0,to:1440,merchantMaps:null,merchantFrom:null,merchantTo:null,
  merchantType:'',merchantName:'',modes:['TALK']
 });
 return list;
};
P.legendContactAllowed=function(d,place=this.currentPlace()){
 const owner=d&&(this.tables['04_CHAR_DB'].get(d.PROFILE_ID)?.[1]||d.CHAR_ID||d.CHARACTER_ID);
 if(owner==='MOND_RAZOR')return !!(d&&d.kind==='LEGEND'&&place?.valid&&place.place===RAZOR_PLACE);
 return prior.legendContactAllowed.call(this,d,place);
};

P.storyCharacterKnown=function(profile){
 if(!profile)return false;
 const rel=this.s?.relations?.[profile];if(rel&&rel.firstContact!==null&&rel.firstContact!==undefined)return true;
 const row=this.tables['04_CHAR_DB']?.get(profile),char=row?.[1],owned=json(this.s?.global?.COMPANION_ELIGIBILITY_JSON);
 if(char&&owned[char]&&owned[char].state&&!['LOCKED'].includes(owned[char].state))return true;
 const applied=json(this.s?.global?.STORY_NODE_EFFECTS_JSON),route=this.s?.global?.STORY_ROUTE_ID;
 for(const [id,done]of Object.entries(applied))if(done){const node=this.storyIndex?.().nodes?.get(route+':'+id);if(node?.[6]===profile)return true;}
 return false;
};
P.storySetCompanion=function(id,state){
 const out=prior.storySetCompanion.call(this,id,state);
 if(['JOINED','ELIGIBLE'].includes(state)){
  const profile=(this.db['04_CHAR_DB']||[]).find(r=>r[1]===id)?.[0];
  if(profile&&this.markContact)this.markContact(profile);
 }
 return out;
};
P.storyDisplayText=function(row){
 row??=this.storyNode?.();
 if(VENTI_REVEAL_TEXT[row?.[4]])return VENTI_REVEAL_TEXT[row[4]];
 const note=String(row?.[19]||''),m=note.match(/GREETING_VARIANT_JSON=(\{.*\})/);
 if(m){try{const data=JSON.parse(m[1]);if(data.profile_id&&this.storyCharacterKnown(data.profile_id)&&typeof data.reunion_text==='string')return data.reunion_text;}catch{}}
 return prior.storyDisplayText.call(this,row);
};

P.objectiveInfo=function(pin=this.s?.pinnedObjective){
 if(!pin||!['COMMISSION','LEGEND','AFFECTION'].includes(pin.kind)||typeof pin.id!=='string')return null;
 if(pin.kind==='COMMISSION'){
  const row=this.tables['22_QUEST_DB']?.get(pin.id),q=this.s.quests?.[pin.id];if(!row||!this.isCommission?.(pin.id)||!this.commissionAccepted?.(pin.id)||q?.claimed)return null;
  const d=json(row[10]),ready=q?.node===d.claim_node,target=ready?(this.commissionGuildPlace?.(row[2])?.maps?.[0]||d.map_id):d.map_id;
  return {kind:pin.kind,id:pin.id,title:row[1],region:row[2],target,ready,active:true,reason:this.questConditions(pin.id)||''};
 }
 const entry=(this.storyEntries?.()||[]).find(e=>e.id===pin.id);if(!entry||entry.kind!==pin.kind||this.storyDone?.(entry.id))return null;
 if(pin.kind==='LEGEND'&&!this.legendRegistered?.(entry.id))return null;
 const d=entry.definition||{},inside=this.s.storyContext?.entry===entry.id;
 const target=inside?(this.s.storyJourney?.target||this.s.storyBreak?.map||this.s.global.CURRENT_MAP_ID):(d.MAP_ID||null);
 const reason=inside?'':(this.storyEntryReason?.(d)||entry.reason||'');
 return {kind:pin.kind,id:pin.id,title:this.tables['22_QUEST_DB']?.get(d.QUEST_ID)?.[1]||entry.title||d.DISPLAY_NAME||entry.id,
  profile:d.PROFILE_ID||entry.profile,target,active:inside,ready:!inside&&!reason,reason,definition:d};
};
P.normalizePinnedObjective=function(){
 if(this.s?.pinnedObjective&&!this.objectiveInfo(this.s.pinnedObjective))delete this.s.pinnedObjective;
 return this.s?.pinnedObjective||null;
};
P.actionReason=function(type,a={}){
 if(type==='OBJECTIVE_CLEAR'){
  if(this.s.runtime)return '전투를 먼저 마쳐 주세요.';
  return '';
 }
 if(type==='OBJECTIVE_PIN'){
  if(this.s.runtime)return '전투를 먼저 마쳐 주세요.';
  if(this.s.global.STORY_MENU_POLICY==='SAVE_LOAD_ONLY')return '현재 장면을 마친 뒤 임무를 고정해 주세요.';
  const info=this.objectiveInfo({kind:a.kind,id:a.objective});
  return info?'':'현재 고정할 수 있는 임무가 아닙니다.';
 }
 return prior.actionReason.call(this,type,a);
};
P.apply=function(a){
 if(a.type==='OBJECTIVE_CLEAR'){delete this.s.pinnedObjective;return {pinned:null};}
 if(a.type==='OBJECTIVE_PIN'){const info=this.objectiveInfo({kind:a.kind,id:a.objective});if(!info)fail('OBJECTIVE_PIN','현재 고정할 수 있는 임무가 아닙니다.');this.s.pinnedObjective={kind:a.kind,id:a.objective};return {pinned:cp(this.s.pinnedObjective),target:info.target};}
 const out=prior.apply.call(this,a);this.normalizePinnedObjective();return out;
};
P.navigationGoal=function(){const info=this.objectiveInfo();return info?.target||prior.navigationGoal.call(this);};

P.edgeReason=function(row){
 const reason=prior.edgeReason.call(this,row);if(reason)return reason;
 if(DIRECT_REGION.has(row?.[0])&&this.s.regionTransitDaily?.day===this.s.global.WORLD_DAY)return '몬드성↔리월 직행은 게임 내 하루에 한 번만 이용할 수 있습니다. 일반 육로를 이용하거나 다음 날 다시 이용해 주세요.';
 return '';
};
P.move=function(id){
 const row=this.tables['47_MAP_EDGE_DB']?.get(id),direct=DIRECT_REGION.has(id),from=this.s.global.CURRENT_MAP_ID;
 const out=prior.move.call(this,id);
 if(direct){
  this.s.regionTransitDaily={day:this.s.global.WORLD_DAY,edge:id,from,to:out.map};
  return {...out,regionTransit:true,realWaitMs:30000};
 }
 return out;
};

function syncOwnedRelations(state){
 const owned=json(state?.global?.COMPANION_ELIGIBILITY_JSON);
 for(const [char,v]of Object.entries(owned)){
  if(!v||!['JOINED','ELIGIBLE'].includes(v.state))continue;
  const profile=(this.db['04_CHAR_DB']||[]).find(r=>r[1]===char)?.[0],rel=profile&&state.relations?.[profile];
  if(rel&&rel.firstContact==null)rel.firstContact=Number(state.global.TURN||1);
 }
}
P.newGame=function(...args){
 const out=prior.newGame.apply(this,args);this.installQualityV2Content();syncOwnedRelations.call(this,this.s);return cp(this.s);
};
P.validateSave=function(s){
 const out=prior.validateSave.call(this,s);this.installQualityV2Content();syncOwnedRelations.call(this,out);
 if(out.regionTransitDaily&&(!Number.isInteger(out.regionTransitDaily.day)||out.regionTransitDaily.day<1||out.regionTransitDaily.day>out.global.WORLD_DAY))delete out.regionTransitDaily;
 if(out.pinnedObjective){const priorState=this.s;this.s=out;try{if(!this.objectiveInfo(out.pinnedObjective))delete out.pinnedObjective;}finally{this.s=priorState;}}
 return out;
};

P.qualityFixesV2=1;api.qualityFixesV2=1;api.directRegionTransitIds=[...DIRECT_REGION];api.razorWolvendomPlace=RAZOR_PLACE;
})(globalThis);
