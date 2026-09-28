/* v0.14.0 field scenes. Exploration commissions play out as short narrated scenes on the field screen.
 * Options are the protagonist's own words; what they did is told in the narration afterwards.
 * Every mistake says exactly what it cost (time, HP, damaged goods) and a clean run earns a bonus at Katheryne.
 * Load after runtime_quality_fixes.js. Steps reuse the existing COMMISSION_PUZZLE action.
 */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.fieldScenesVersion)return;
const old={apply:P.apply,actionReason:P.actionReason,claimQuest:P.claimQuest,commissionFieldEntries:P.commissionFieldEntries,commissionPuzzle:P.commissionPuzzle,installExplorationContent:P.installExplorationContent,validateSave:P.validateSave};
const copy=x=>JSON.parse(JSON.stringify(x)),json=x=>{try{return JSON.parse(x||'{}');}catch{return {};}},
 plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x),fail=(c,m)=>{throw new api.RuleError(c,m);};

// Option fields: say (spoken line), text (what happened), paimon (Traveler route only),
// ok (the right call), pass (a mistake that still gets the job done), battle (starts the commission fight),
// min (minutes spent), hp (percent of max HP lost), mora (reward Mora lost to damaged goods).
const SCENES={
 Q_MOND_EXP_PLAINS_CART:{
  brief:'초원 길 옆 도랑에 보급 수레 한 대가 뒤집혀 있다. 짐이 더 망가지기 전에 남은 보급품을 건져 내자.',
  reward:{mora:100,xp:60,items:{MAT_CHAR_EXP_WANDERER:3}},bonus:{mora:30},
  steps:[
   {title:'뒤집힌 수레',text:'수레는 도랑 쪽으로 기울어 있고, 빠진 바퀴 하나가 풀밭에 나뒹군다. 진흙 위에는 수레를 끌던 말의 발자국과 그보다 작은 발자국 여러 개가 뒤섞여 있다.',paimon:'누가 일부러 넘어뜨린 걸까? 아니면 그냥 사고일까?',options:[
    {say:'발자국부터 보자. 누가 다녀갔는지 알아야 해.',ok:true,min:5,text:'쪼그려 앉아 진흙을 살핀다. 작은 발자국은 수레 주위를 한 바퀴 돌고는 풀숲으로 사라진다. 짐 상자 모서리에 난 이빨 자국을 보니 여우 몇 마리가 먹을 것을 찾다 간 모양이다. 누가 습격한 흔적은 없다. 바퀴 축이 부러져 생긴 사고다.',paimon:'휴, 츄츄족 짓이 아니라서 다행이야.'},
    {say:'주인이 근처에 있을지도 몰라. 크게 불러 보자!',min:10,mora:10,text:'목청껏 불러 보지만 대답은 없다. 대신 풀숲에서 새 떼가 한꺼번에 날아오르고, 그 바람에 도랑 가장자리 흙이 무너지며 수레가 한 뼘 더 기운다. 짐 꾸러미 하나가 도랑물에 빠져 버렸다. 소리보다 흔적을 먼저 봤어야 했다.',paimon:'으으, 짐이 물에 빠졌어…'},
    {say:'짐부터 꺼내자. 흔적은 나중에 봐도 돼.',hp:5,min:5,text:'상자에 손을 뻗는 순간 기울어 있던 수레가 삐걱이며 미끄러진다. 반사적으로 몸을 빼지만 수레 모서리에 정강이를 세게 부딪친다. 수레가 왜 이렇게 서 있는지부터 알아야 한다.',paimon:'괜찮아? 조심해야지!'}
   ]},
   {title:'수레 세우기',text:'부러진 것은 바퀴 축이다. 수레를 세우려면 누군가 받쳐 줘야 하고, 짐끈은 상자 아래에 끼어 팽팽하게 당겨져 있다. 근처에는 굵은 통나무가 하나 굴러다닌다.',options:[
    {say:'바퀴를 먼저 끼워 볼게.',min:10,text:'빠진 바퀴를 굴려 와 축에 맞춰 보지만, 부러진 축에는 바퀴를 걸 곳이 없다. 바퀴를 몇 번이나 들었다 놓는 사이 시간만 흘러간다.'},
    {say:'짐끈부터 묶어 두자. 상자가 미끄러지면 안 돼.',ok:true,min:10,text:'늘어진 짐끈을 수레 기둥에 두 번 감아 단단히 묶는다. 상자들이 더는 도랑 쪽으로 쏠리지 않는다. 그다음 통나무를 지렛대 삼아 수레를 조금씩 들어 올리고, 틈마다 돌을 괴어 수레를 바로 세운다.',paimon:'오오, 영차영차! 섰다!'},
    {say:'한 번에 밀어서 세우면 되잖아!',pass:true,hp:5,mora:20,min:5,text:'어깨를 대고 힘껏 밀자 수레가 벌떡 일어서기는 한다. 하지만 묶이지 않은 상자 하나가 반대편으로 굴러떨어져 뚜껑이 깨지고, 안에 든 약초 꾸러미가 진흙에 흩어진다. 수레를 받치던 팔에도 뻐근한 통증이 남는다.'}
   ]},
   {title:'봉인된 상자',text:'수레가 바로 서자 짐칸의 봉인 상자들이 드러난다. 상자마다 기사단 보급 표식과 모험가 길드 도장이 나란히 찍혀 있다.',paimon:'안에 뭐가 들었을까? 궁금하다…',options:[
    {say:'봉인은 뜯지 말고 길드에 그대로 가져가자.',ok:true,min:5,text:'봉인이 온전한 상자는 그대로 두고, 흩어진 물건만 추려 빈 자루에 담는다. 수레에 매단 천에는 발견한 시각과 위치를 적어 둔다. 주인이 돌아와도 무슨 일이 있었는지 알 수 있을 것이다.',paimon:'캐서린한테 보고하면 주인한테도 연락해 주겠지!'},
    {say:'안에 뭐가 들었는지는 확인해 봐야지.',pass:true,mora:20,min:5,text:'봉인을 뜯자 기사단 보급용 붕대와 건량이 나온다. 확인은 했지만, 봉인이 뜯긴 상자는 길드에서 다시 검수해야 한다. 검수 비용만큼 정산이 줄어들 것이다.'}
   ]}
  ],
  finale:'보급품을 추려 어깨에 멘다. 캐서린에게 가져가면 주인에게 전해 줄 것이다.'
 },
 Q_MOND_EXP_FOREST_CACHE:{
  brief:'속삭이는 숲 길가, 나무뿌리 사이로 빛바랜 끈 한 가닥이 낙엽 속으로 이어진다. 누군가 숨겨 둔 보관함이 있는 모양이다.',
  reward:{mora:120,xp:80,items:{MAT_CHAR_EXP_WANDERER:3}},bonus:{mora:40,items:{ING_MUSHROOM:2}},
  steps:[
   {title:'낙엽 속의 끈',text:'낙엽을 헤치자 빛바랜 붉은 끈이 드러난다. 끈은 굵은 나무뿌리 두 개 사이를 지나 땅속으로 파고든다. 가까운 흙바닥에는 누군가 나뭇가지로 그려 둔 화살표가 반쯤 지워진 채 남아 있다.',paimon:'화살표? 보물 지도 같은 건가? 두근거리는데!',options:[
    {say:'끈을 세게 당겨 보자. 뭐가 딸려 나오겠지.',hp:5,min:5,text:'끈을 감아쥐고 힘껏 당기자 땅속에서 무언가 딸깍 걸리는 소리가 난다. 다음 순간 뿌리 사이에 숨겨져 있던 가시 덫이 튀어 올라 손등을 할퀸다. 보관함 주인이 도둑을 대비해 끈에 덫을 이어 둔 것이다.',paimon:'으악! 괜찮아? 함부로 당기면 안 되겠다…'},
    {say:'화살표가 가리키는 쪽부터 확인하자.',ok:true,min:5,text:'화살표는 끈이 아니라 옆의 이끼 낀 바위를 가리킨다. 바위를 조심스럽게 들추자 녹슨 쇠고리와 접힌 쪽지가 나온다. 「끈은 미끼. 진짜는 동쪽 뿌리 아래.」 보관함 주인이 도둑을 헷갈리게 하려고 가짜 끈을 깔아 둔 것이다.',paimon:'와, 머리 좋은데? 그럼 진짜는 동쪽이야!'},
    {say:'낙엽을 태워서 한 번에 치우는 건 어때?',hp:3,min:10,text:'부싯돌로 불을 붙이자 마른 낙엽이 순식간에 타오르고, 불씨가 바람을 타고 옆 덤불로 튄다. 황급히 흙을 덮고 발로 밟아 불을 끄는 사이 손바닥이 뜨겁게 데인다. 숲에서 불을 쓰는 건 너무 위험하다.',paimon:'숲에서 불이라니! 기사단이 봤으면 큰일 났을 거야!'}
   ]},
   {title:'뿌리 아래의 보관함',text:'쪽지가 말한 동쪽 뿌리 아래의 흙은 유난히 부드럽다. 파 내려가자 나무 보관함의 뚜껑이 드러나지만, 굵은 뿌리가 보관함 위를 감싸듯 자라 있어 그대로는 꺼낼 수 없다.',options:[
    {say:'보관함째 들어 올려 보자!',hp:5,min:5,text:'보관함 모서리를 붙잡고 온몸으로 들어 올리자, 휘어 있던 뿌리가 반동으로 튕기며 팔뚝을 후려친다. 보관함은 꿈쩍도 하지 않는다.',paimon:'아야야… 보기만 해도 아파!'},
    {say:'뿌리를 베어 버리면 금방이야.',pass:true,mora:20,min:5,text:'뿌리를 몇 번 내리치자 보관함이 드러난다. 그런데 잘린 뿌리 틈으로 스며든 흙탕물이 보관함 이음새로 흘러들어, 안에 든 물건 일부가 젖어 버린다.',paimon:'나무한테도 미안하고, 물건도 젖었어…'},
    {say:'뿌리 옆 흙을 조금씩 파내서 틈을 만들자.',ok:true,min:10,text:'뿌리가 다치지 않도록 손으로 흙을 긁어내 옆으로 틈을 만든다. 손톱 밑이 흙투성이가 될 무렵, 보관함이 비스듬히 기울며 뿌리 아래로 미끄러져 나온다.'}
   ]},
   {title:'세 개의 걸쇠',text:'보관함에는 자물쇠 대신 톱니 모양 걸쇠 세 개가 달려 있다. 걸쇠마다 작은 그림이 새겨져 있다. 바람, 나무, 그리고 새.',paimon:'아까 그 쪽지, 뒷면에도 뭔가 적혀 있지 않았어?',options:[
    {say:'쪽지 뒷면을 다시 보자.',ok:true,min:5,text:'쪽지를 뒤집자 연필로 흐리게 적힌 글귀가 보인다. 「새가 앉고, 바람이 불면, 나무가 열린다.」 새, 바람, 나무 순서로 걸쇠를 돌리자 딸깍 소리와 함께 뚜껑이 열린다. 안에는 기름종이에 싼 모험 기록과 모라 주머니, 그리고 「이걸 찾아낸 모험가에게」라고 적힌 메모가 들어 있다.',paimon:'우리 같은 모험가를 위해 남겨 둔 거였구나!'},
    {say:'하나씩 다 돌려 보면 언젠간 열리겠지.',min:15,text:'걸쇠를 아무렇게나 돌리자 보관함 안쪽에서 무언가 철컥 잠기는 소리가 난다. 한참을 기다리자 잠금이 스르르 풀리며 걸쇠가 제자리로 돌아간다. 아무렇게나 돌려서 열리는 상자가 아니다.'},
    {say:'돌로 부숴서 열자.',pass:true,mora:30,min:5,text:'돌로 걸쇠를 내리치자 뚜껑이 쪼개지며 열린다. 그 충격에 안에 든 유리병 하나가 깨져, 기름종이에 싼 기록 일부가 얼룩지고 만다.',paimon:'열리긴 했는데… 좀 아깝다.'}
   ]}
  ],
  finale:'보관함 속 물건을 챙겨 든다. 캐서린에게 가져가면 주인을 찾아 주거나, 모험가 몫으로 정산해 줄 것이다.'
 },
 Q_MOND_EXP_PLAINS_CAMP:{
  brief:'초원 언덕 위 츄츄족 감시초소의 울타리 안에 보물함이 놓여 있다. 초소를 지키는 무리를 어떻게 상대할지 정해야 한다.',
  reward:{mora:130,xp:90,items:{MAT_CHAR_EXP_ADVENTURER:1,MAT_CHAR_EXP_WANDERER:1}},bonus:{mora:40},
  steps:[
   {title:'언덕 위 초소',text:'언덕 아래에서 올려다보니 나무 망루와 울타리가 보인다. 망루 위에서는 츄츄족 하나가 꾸벅꾸벅 졸고 있고, 울타리 안쪽 모닥불 주위에는 몇 마리가 둘러앉아 고기를 굽고 있다.',paimon:'보물함은 저 안쪽이야. 어떻게 할래?',options:[
    {say:'바람 방향부터 보자. 냄새로 들키면 안 되니까.',ok:true,min:5,text:'풀잎을 한 줌 뜯어 날려 본다. 바람은 초소 쪽에서 이쪽으로 분다. 이 방향이라면 가까이 가도 냄새로 들킬 일은 없다. 망루의 츄츄족이 고개를 떨굴 때마다 조금씩 거리를 좁혀, 울타리 바로 아래 덤불까지 다가간다.'},
    {say:'해가 질 때까지 기다리자. 어두워지면 편할 거야.',min:30,text:'풀숲에 몸을 숨긴 채 해가 기울기를 기다린다. 하지만 츄츄족은 어두워지자 모닥불을 더 키우고 경계를 늘릴 뿐이다. 시간만 흘렀다.',paimon:'오히려 불이 더 밝아졌잖아…'},
    {say:'망루부터 떨어뜨리자. 그럼 들킬 일도 없어.',battle:true,hp:5,mora:20,text:'망루를 겨냥하는 순간 햇빛에 반사된 무기가 번쩍인다. 졸던 츄츄족이 벌떡 일어나 뿔피리를 불고, 모닥불 주위의 무리가 몽둥이를 들고 뛰쳐나온다. 허둥대며 맞서는 사이 한 대를 허용하고, 놀란 츄츄족 하나가 보물함을 걷어차 뚜껑이 부서진다.',paimon:'들켰어! 싸울 수밖에 없어!'}
   ]},
   {title:'울타리 아래',text:'울타리 가까이 오자 뒤쪽 울타리 한 칸이 썩어 기울어 있는 게 보인다. 앞쪽에서는 츄츄족들이 고기 굽는 연기에 눈을 비비며 떠들고 있다.',options:[
    {say:'뒤쪽 울타리로 들어가서 보물함만 챙기자.',ok:true,min:10,text:'썩은 울타리 기둥을 소리 나지 않게 눕히고 안으로 몸을 밀어 넣는다. 보물함은 생각보다 가볍다. 츄츄족들이 연기에 눈을 비비는 사이, 보물함을 끌어안고 언덕 아래로 빠져나온다. 등 뒤에서는 여전히 고기 굽는 소리만 들린다.',paimon:'헤헤, 감쪽같았어!'},
    {say:'방심했을 때 기습하자. 초소 자체를 정리하는 게 나아.',ok:true,battle:true,text:'덤불을 박차고 뛰어들자 모닥불 주위의 츄츄족들이 고기를 떨어뜨리며 허둥댄다. 초소를 정리하고 보물함을 되찾을 차례다.'},
    {say:'울타리를 넘어가자. 높지 않잖아.',battle:true,hp:5,text:'울타리를 넘는 순간 걸려 있던 뼈 장식이 요란하게 흔들린다. 모닥불 주위의 츄츄족들이 일제히 고개를 돌린다. 착지하다 발목을 삐끗한 채 싸움이 시작된다.',paimon:'으악, 소리가 너무 컸어!'}
   ]}
  ],
  finale:'보물함 안에는 츄츄족이 어디선가 주워 모은 모라와 모험가의 낡은 기록이 들어 있다. 캐서린에게 보고하자.'
 },
 Q_MOND_EXP_DRAGONSPINE_CACHE:{
  brief:'드래곤 스파인 바위 틈에 탐사대의 보관함이 얼어붙어 있다. 혹한 속에서는 오래 버틸 수 없다. 몸이 얼기 전에 꺼내야 한다.',
  reward:{mora:220,xp:150,items:{MAT_CHAR_EXP_ADVENTURER:2,MAT_CHAR_EXP_WANDERER:1}},bonus:{mora:60},
  steps:[
   {title:'혹한',text:'눈보라가 잦아든 틈에 보관함이 보인다. 경첩은 두꺼운 얼음에 묻혀 있고, 바람이 불 때마다 손끝이 얼얼해진다. 가까이에는 탐사대가 쓰던 화로 자리가 눈에 반쯤 파묻혀 있다.',paimon:'으으, 추워! 이대로 오래 있으면 안 될 것 같아…',options:[
    {say:'빨리 끝내고 내려가자. 바로 얼음부터 깨자!',hp:8,min:10,text:'얼음을 몇 번 내리치는 사이 손가락이 굳어 도구를 놓친다. 한기가 뼛속까지 스며들어, 결국 바위 뒤로 물러나 몸을 웅크려야 한다.',paimon:'거 봐! 드래곤 스파인 추위를 얕보면 안 된다니까!'},
    {say:'화로부터 살려 놓자. 몸이 녹아야 작업을 하지.',ok:true,min:10,text:'화로 자리의 눈을 걷어내자 타다 남은 장작과 부싯돌이 나온다. 불씨를 살려 곱은 손을 녹이고, 화로를 바람막이 바위 쪽으로 옮겨 작업할 자리를 만든다. 몸에 온기가 돌자 숨이 한결 편해진다.',paimon:'따뜻해… 살 것 같아!'},
    {say:'보관함째 들고 산 아래로 내려가자.',hp:5,min:10,text:'보관함을 잡아당겨 보지만 바닥까지 얼어붙어 꿈쩍도 않는다. 버티는 사이 체온만 빼앗긴다.'}
   ]},
   {title:'얼어붙은 경첩',text:'불기가 닿자 경첩 주변 얼음이 조금씩 투명해진다. 얼음 한가운데에 가느다란 금이 가 있다.',options:[
    {say:'금 간 데를 세게 치면 한 번에 깨질 거야.',pass:true,mora:30,min:5,text:'금 간 자리를 내리치자 얼음이 큼직하게 깨져 나간다. 경첩은 드러났지만, 충격에 보관함 안쪽에서 병 몇 개가 깨지는 소리가 난다.'},
    {say:'눈을 녹인 물을 부으면 되지 않을까?',min:10,text:'눈을 녹여 데운 물을 붓지만, 물은 금세 식어 얼음 위에 새로운 얼음층을 만든다. 오히려 녹여야 할 얼음만 늘었다.',paimon:'여기서는 물도 금방 얼어 버리는구나…'},
    {say:'불을 가까이 대고 천천히 녹이자.',ok:true,min:15,text:'불붙은 장작을 경첩 가까이 대고 기다린다. 녹아 흐른 물이 다시 얼지 않도록 천으로 닦아 내며, 경첩이 드러날 때까지 인내심 있게 작업을 이어 간다.'}
   ]},
   {title:'탐사대의 부탁',text:'경첩이 풀리자 뚜껑 안쪽에 탐사대의 물자 목록이 붙어 있다. 목록 아래에는 「다음 탐사대를 위해 일부는 남겨 둘 것」이라는 부탁이 적혀 있다.',options:[
    {say:'목록대로 절반은 남겨 두자. 다음 사람도 필요할 테니까.',ok:true,min:5,text:'필요한 물자만 챙기고, 남은 연료와 비상식량은 다시 보관함에 넣어 뚜껑을 덮는다. 경첩에는 얼지 않도록 기름을 발라 둔다. 캐서린에게 가져갈 몫으로는 충분하다.',paimon:'착한 일 했으니까 분명 좋은 일이 생길 거야!'},
    {say:'다 가져가자. 여기까지 온 건 우리잖아.',pass:true,mora:40,min:5,text:'보관함을 통째로 비워 짐을 꾸린다. 하지만 탐사대 물자를 규정보다 많이 가져온 탓에, 캐서린은 남겨야 했던 몫을 탐사대에 돌려주고 그만큼 정산에서 뺄 것이다.'}
   ]}
  ],
  finale:'챙긴 물자를 등에 지고 화로의 불씨를 끈다. 몸이 얼기 전에 내려가 캐서린에게 보고하자.'
 },
 Q_MOND_EXP_STORMTERROR_CACHE:{
  brief:'풍룡 폐허의 끊어진 회랑 너머에 오래된 보급품이 남아 있다. 머리 위에서는 부서진 돌조각이 계속 떨어진다.',
  reward:{mora:250,xp:170,items:{MAT_CHAR_EXP_ADVENTURER:3,MAT_CHAR_EXP_WANDERER:2}},bonus:{mora:70},
  steps:[
   {title:'끊어진 회랑',text:'끊어진 회랑 사이로 거센 바람이 휘몰아친다. 건너편 벽감에 보급품 꾸러미가 보이지만, 가운데 다리는 절반쯤 무너져 있다. 머리 위 기둥에서 돌가루가 쉴 새 없이 떨어진다.',paimon:'여기 바람, 드발린이 있던 곳이라 그런지 엄청 세…',options:[
    {say:'그냥 뛰어서 건너자!',hp:8,min:5,text:'달리기 시작한 순간 돌풍이 옆에서 몰아쳐 몸이 난간 쪽으로 밀려난다. 난간을 붙잡고 겨우 버티지만, 떨어진 돌조각에 어깨를 호되게 맞는다.',paimon:'으아악! 하마터면 떨어질 뻔했잖아!'},
    {say:'무너진 다리 아래로 내려가서 돌아가자.',hp:3,min:20,text:'무너진 잔해를 타고 아래로 내려가 보지만 길은 돌무더기에 막혀 있다. 다시 기어오르는 데만 한참이 걸리고, 날카로운 돌에 손바닥이 긁힌다.'},
    {say:'바람이 멎는 순간을 세어 보자.',ok:true,min:10,text:'눈을 감고 바람 소리를 센다. 거센 돌풍은 일정한 간격으로 몰아치고, 그 사이에 짧은 정적이 찾아온다. 정적이 올 때마다 한 칸씩, 벽에 몸을 붙인 채 회랑을 건넌다.',paimon:'바람에도 박자가 있구나!'}
   ]},
   {title:'기울어진 석판',text:'벽감 앞에 서자 보급품 꾸러미 위로 금 간 석판이 비스듬히 걸려 있다. 조금만 건드려도 떨어질 것 같다. 발밑에는 부러진 창대 하나가 굴러다닌다.',options:[
    {say:'석판부터 받쳐 두고 꾸러미를 빼자.',ok:true,min:10,text:'부러진 창대를 주워 석판 아래를 비스듬히 받친다. 받침이 버티는 것을 확인한 뒤 꾸러미를 천천히 끌어낸다. 석판은 제자리에서 흔들리기만 할 뿐 떨어지지 않는다.'},
    {say:'재빨리 낚아채면 돼.',pass:true,hp:5,mora:30,min:5,text:'꾸러미를 낚아채는 순간 석판이 떨어져 꾸러미 끝자락을 짓누른다. 손은 빼냈지만 손목이 욱신거리고, 꾸러미 한쪽이 찢겨 물자가 쏟아진다.'},
    {say:'석판을 먼저 밀어서 떨어뜨리자.',pass:true,mora:20,min:10,text:'석판을 밀자 굉음과 함께 떨어지며 벽감 아래쪽을 부순다. 꾸러미는 무사하지만, 흩어진 물자를 흙먼지 속에서 다시 모으느라 시간이 걸리고 일부는 잔해에 묻혀 버린다.'}
   ]}
  ],
  finale:'보급품 꾸러미에는 오래전 기사단 원정대가 남긴 물자와 기록이 들어 있다. 캐서린에게 가져가자.'
 },
 Q_CRPG_MOND_EXP_WINDRISE_RIBBONS:{
  brief:'바람이 시작되는 곳의 길잡이 리본이 강풍에 끊어졌다. 거목 뿌리와 강가에 흩어진 리본을 모아 길을 다시 표시하자.',
  reward:{mora:110,xp:90,items:{ORE_IRON:3}},bonus:{mora:30},
  steps:[
   {title:'흩어진 리본',text:'거목 아래 풀밭 곳곳에 붉은 리본 조각이 걸려 있다. 몇 개는 강물 위를 떠내려가고, 몇 개는 높은 가지에 걸려 펄럭인다.',paimon:'리본이 없으면 처음 오는 사람들은 길을 잃을 거야.',options:[
    {say:'높은 가지에 걸린 것부터 따자.',pass:true,mora:10,min:10,text:'나무를 타고 올라가 가지의 리본을 떼는 사이, 강물에 떠 있던 리본 몇 개가 하류로 떠내려가 버린다. 모자란 만큼은 새 천을 사서 채워야 한다.'},
    {say:'강물에 떠내려가는 것부터 건지자. 곧 사라질 테니까.',ok:true,min:10,text:'얕은 여울로 들어가 떠내려가는 리본부터 건진다. 가지에 걸린 것들은 바람에 날아가지 않으니 나중에 챙겨도 된다. 순서를 잘 정한 덕분에 리본 한 가닥도 잃지 않는다.',paimon:'바지가 다 젖었지만… 하나도 안 놓쳤어!'},
    {say:'바람이 멎을 때까지 기다리자.',min:20,text:'바람이 시작되는 곳에서 바람이 멎기를 기다리는 건 무리다. 기다리는 동안 리본은 더 멀리 흩어진다.'}
   ]},
   {title:'다시 묶기',text:'모은 리본을 길을 따라 다시 묶어야 한다. 강풍은 여전히 거목 쪽에서 몰아친다.',options:[
    {say:'제일 높은 가지에 묶으면 멀리서도 보이겠지.',min:10,text:'높은 가지에 묶은 리본은 바람에 뒤집혀 엉뚱한 방향을 가리킨다. 아래에서는 잘 보이지도 않는다. 결국 다시 풀어야 한다.'},
    {say:'풀잎에 여러 개를 한꺼번에 묶어 두자.',min:5,text:'풀잎에 묶은 리본은 바람 한 번에 풀려 날아간다.',paimon:'아아, 날아간다!'},
    {say:'바람 불어오는 쪽에서도 보이게 낮은 가지에 묶자.',ok:true,min:10,text:'사람 눈높이의 튼튼한 가지를 골라, 바람을 받아도 풀리지 않게 매듭을 두 번 짓는다. 리본이 바람에 펄럭이며 거목으로 가는 길을 또렷하게 가리킨다.'}
   ]}
  ],
  finale:'리본이 제자리를 찾자 거목까지 이어지는 길이 다시 한눈에 들어온다. 캐서린에게 결과를 알리자.'
 },
 Q_CRPG_MOND_EXP_SPRINGVALE_BASKET:{
  brief:'청천역 샘가에 장터로 가던 식량 바구니가 넘어져 있다. 젖지 않은 식량을 골라 주인에게 돌려주자.',
  reward:{mora:110,xp:90,items:{ING_APPLE:3,MAT_CHAR_EXP_WANDERER:2}},bonus:{mora:20,items:{ING_APPLE:2}},
  steps:[
   {title:'쏟아진 바구니',text:'바구니에서 쏟아진 사과와 당근, 빵이 샘물 가장자리에 흩어져 있다. 몇 개는 물에 반쯤 잠겼고, 바구니 바닥은 흠뻑 젖었다.',paimon:'아까운 음식이… 빨리 주워야 해!',options:[
    {say:'젖은 거랑 멀쩡한 걸 먼저 나누자.',ok:true,min:10,text:'마른 돌 위에 천을 깔고 멀쩡한 식량과 젖은 식량을 따로 늘어놓는다. 젖은 빵은 햇볕에 말리면 새 모이로라도 쓸 수 있다. 바구니는 뒤집어 물기를 뺀다.'},
    {say:'전부 다시 바구니에 담자. 빨리 끝내야지.',pass:true,mora:15,min:5,text:'서둘러 쓸어 담는 사이 젖은 빵이 멀쩡한 사과에 물기를 옮긴다. 장터에 내놓기 어려운 식량이 늘어난다.',paimon:'사과까지 눅눅해졌어…'},
    {say:'깨끗해 보이는 것부터 사람들한테 나눠 주자.',min:10,text:'지나가던 주민에게 사과를 건네자, 주인이 따로 있는 식량을 함부로 나눠 줘도 되느냐는 핀잔이 돌아온다. 머쓱해진 채 샘가로 돌아온다.'}
   ]},
   {title:'바구니의 주인',text:'바구니 손잡이에 작은 나무패가 달려 있다. 「청천역 사냥꾼 휴게소 앞, 목요일 장.」 샘가 근처에는 사냥꾼 한 명과 짐마차 상인이 쉬고 있다.',options:[
    {say:'상인한테 맡기면 알아서 하겠지.',pass:true,mora:10,min:5,text:'상인은 바구니를 받아 들고는 수고비라며 식량 몇 개를 챙긴다. 주인에게 돌아갈 몫이 줄었다.'},
    {say:'나무패에 적힌 대로 사냥꾼한테 물어보자.',ok:true,min:10,text:'사냥꾼은 바구니를 보자마자 반색한다. 장에 가던 딸아이가 샘가에서 넘어져 울며 돌아왔다고 한다. 멀쩡한 식량을 돌려받은 사냥꾼은 몇 번이고 고개를 숙인다.',paimon:'주인을 찾아서 다행이야!'}
   ]}
  ],
  finale:'바구니가 주인에게 돌아갔다. 캐서린에게 결과를 알리자.'
 },
 Q_CRPG_MOND_EXP_FOREST_SIGNPOSTS:{
  brief:'속삭이는 숲 갈림길의 표지판 두 개가 쓰러져 행인들이 길을 잘못 들고 있다. 원래 방향을 찾아 다시 세우자.',
  reward:{mora:140,xp:120,items:{ORE_WHITE_IRON:2,MAT_CHAR_EXP_WANDERER:1}},bonus:{mora:30},
  steps:[
   {title:'두 갈래 길',text:'쓰러진 표지판에는 「몬드성」과 「청천역」이 적혀 있다. 갈림길은 두 갈래. 왼쪽 길은 내리막이고, 오른쪽 길에는 수레바퀴 자국이 깊게 패어 있다.',paimon:'어느 쪽이 몬드성이었더라…?',options:[
    {say:'표지판 글자가 잘 보이는 방향대로 세우면 되지.',min:10,text:'글자가 잘 보이도록 세웠더니 두 표지판이 같은 길을 가리킨다. 지나가던 행인이 고개를 갸웃한다.'},
    {say:'수레바퀴 자국이랑 경사를 같이 보자.',ok:true,min:10,text:'깊은 바퀴 자국은 짐을 실은 수레가 자주 다닌다는 뜻이다. 몬드성으로 물건을 나르는 수레들이 쓰는 오른쪽 길이 몬드성 방향이고, 내리막 왼쪽 길은 샘가로 이어지는 청천역 방향이다.',paimon:'오, 탐정 같아!'},
    {say:'해가 뜨는 방향으로 짐작해 보자.',min:10,text:'해를 기준으로 방향을 잡아 보지만 나무가 빽빽해 해가 어디 있는지조차 분명하지 않다.'}
   ]},
   {title:'썩은 밑동',text:'방향은 알아냈지만, 표지판 기둥 밑동이 썩어 그대로 박아서는 또 쓰러질 것 같다. 근처 개울에는 넓적한 돌이 많다.',options:[
    {say:'돌을 쌓아서 기둥을 받치자.',ok:true,min:15,text:'개울에서 넓적한 돌을 날라 기둥 둘레에 단단히 쌓는다. 흔들어 봐도 표지판은 꿈쩍하지 않는다.'},
    {say:'썩은 부분을 잘라 내고 다시 박자.',pass:true,mora:10,min:15,text:'밑동을 잘라 내자 표지판 높이가 낮아져 수풀에 가려진다. 방향은 맞으니 쓸 만하지만, 길드에서 새 기둥 값을 정산에서 뺄 것이다.'}
   ]}
  ],
  finale:'표지판이 제 방향을 가리키자, 길을 헤매던 행인들이 안도의 숨을 내쉰다. 캐서린에게 보고하자.'
 },
 Q_CRPG_MOND_EXP_PLAINS_ROAD_PATROL:{
  brief:'몬드 초원의 수송로를 츄츄족 무리가 막아 수레들이 발이 묶였다. 수레를 지키며 길을 되찾자.',
  reward:{mora:160,xp:110,items:{MAT_CHAR_EXP_ADVENTURER:1,MAT_CHAR_EXP_WANDERER:1}},bonus:{mora:30},
  steps:[
   {title:'막힌 수송로',text:'길 한가운데에서 츄츄족 서너 마리가 나무 방패를 두드리며 수레를 위협한다. 마부들은 수레 뒤에 숨어 발만 동동 구른다.',paimon:'싸우기 전에 사람들부터 챙겨야 하지 않을까?',options:[
    {say:'지금 바로 덤벼들자!',battle:true,mora:20,text:'무기를 뽑아 들고 달려들자 놀란 말이 앞발을 치켜들며 날뛴다. 수레가 기우뚱하며 짐 몇 개가 길바닥에 쏟아진다. 그대로 싸움이 시작된다.',paimon:'수레, 수레가!'},
    {say:'마부들부터 뒤로 물리자. 싸움은 그다음이야.',ok:true,min:5,text:'손짓으로 마부들에게 수레를 뒤로 빼라고 알린다. 수레가 삐걱이며 물러나는 동안 일부러 소리를 내 츄츄족의 시선을 이쪽으로 끌어 둔다.'},
    {say:'수레를 방패 삼아 싸우자.',pass:true,hp:5,mora:20,min:5,text:'수레 뒤에 자리를 잡고 버티지만, 츄츄족의 몽둥이가 수레를 두드려 짐칸 한쪽이 부서진다. 파편에 팔을 긁힌 채 가까스로 마부들을 뒤로 물린다.'}
   ]},
   {title:'싸울 자리',text:'수레가 안전한 곳으로 물러났다. 츄츄족들은 길 위에 진을 치고 이쪽을 노려본다.',options:[
    {say:'넓은 풀밭으로 유인해서 싸우자.',ok:true,battle:true,text:'일부러 소리를 내며 넓은 풀밭 쪽으로 물러선다. 츄츄족들이 괴성을 지르며 우르르 쫓아온다.'},
    {say:'좁은 길목에서 막자.',battle:true,hp:5,text:'길목에서 버티려는 순간 돌부리에 발이 걸려 휘청인다. 그 틈에 날아든 몽둥이를 맞으며 싸움이 시작된다.'}
   ]}
  ],
  finale:'수송로가 다시 열렸다. 캐서린에게 보고하자.'
 },
 Q_CRPG_MOND_EXP_DAWN_VINEYARD:{
  brief:'다운 와이너리의 물길에 슬라임이 모여 일꾼들이 포도밭에 들어가지 못하고 있다. 포도나무가 상하기 전에 정리하자.',
  reward:{mora:160,xp:110,items:{ING_RAW_MEAT:2,MAT_CHAR_EXP_WANDERER:2}},bonus:{mora:30},
  steps:[
   {title:'물길의 불청객',text:'물길 곳곳에서 물 슬라임과 바람 슬라임이 통통 튀어 오른다. 포도밭 가장자리에서는 일꾼들이 바구니를 든 채 발만 구르고 있고, 물길 끝의 수문은 반쯤 열려 있다.',paimon:'슬라임들이 물을 좋아하는 건가? 계속 모여들어!',options:[
    {say:'일꾼들한테 바구니를 두드려서 쫓으라고 하자.',min:10,text:'일꾼들이 바구니를 두드리자 슬라임들이 잠깐 흩어졌다가 금세 물길로 되돌아온다. 소리로는 쫓을 수 없다.'},
    {say:'수문부터 닫자. 물길이 넘치니까 몰려드는 거야.',ok:true,min:10,text:'수문의 손잡이를 힘껏 돌려 물길을 막는다. 물이 줄어들자 새로 몰려오던 슬라임들이 방향을 튼다. 남은 건 이미 들어온 몇 마리뿐이다.',paimon:'오오, 수가 확 줄었어!'},
    {say:'포도밭 한가운데서 싸우자. 빨리 끝내야지.',battle:true,mora:30,text:'포도밭으로 뛰어들자 슬라임들이 사방으로 튀어 오른다. 그 와중에 포도나무 몇 그루가 짓뭉개지고, 일꾼들의 탄식 속에 싸움이 시작된다.',paimon:'포도가…!'}
   ]},
   {title:'남은 슬라임',text:'물이 빠진 물길 바닥에 슬라임 몇 마리가 뒤엉켜 있다. 일꾼들은 아직 포도밭 가장자리에 서 있다.',options:[
    {say:'일꾼들을 물린 다음 한꺼번에 정리하자.',ok:true,battle:true,text:'일꾼들이 포도밭 밖으로 물러난 것을 확인하고 물길로 뛰어든다.'}
   ]}
  ],
  finale:'물길이 깨끗해졌다. 캐서린에게 보고하자.'
 },
 Q_CRPG_MOND_EXP_WOLVENDOM_TRAPS:{
  brief:'울프 영지 숲 가장자리에 낡은 사냥 덫이 남아 있다. 짐승과 행인이 다치기 전에 안전하게 치우자.',
  reward:{mora:200,xp:150,items:{ORE_IRON:3,MAT_CHAR_EXP_ADVENTURER:1}},bonus:{mora:20,items:{ORE_IRON:2}},
  steps:[
   {title:'낙엽 속의 쇠 이빨',text:'낙엽 사이로 녹슨 쇠 이빨이 삐죽 보인다. 주변 흙에는 늑대 발자국이 어지럽게 찍혀 있고, 덫이 몇 개인지는 알 수 없다.',paimon:'하나만 있는 게 아닐지도 몰라…',options:[
    {say:'발자국을 따라가면 덫을 피할 수 있을 거야.',hp:8,min:5,text:'늑대 발자국을 따라 걷던 중 발밑에서 쇠 이빨이 튀어 오른다. 간신히 발을 뺐지만 발목에 깊은 생채기가 남는다. 늑대들도 이 덫을 피해 다닌 게 아니었다.',paimon:'괜찮아? 피 나잖아!'},
    {say:'낙엽을 전부 쓸어 내면 다 보이겠지.',min:15,text:'넓은 숲 가장자리의 낙엽을 쓸어 내기엔 끝이 없다. 시간만 가고 덫은 몇 개 보이지 않는다.'},
    {say:'긴 나뭇가지로 앞을 짚으면서 가자.',ok:true,min:10,text:'긴 나뭇가지로 앞쪽 땅을 두드리며 한 걸음씩 나아간다. 딸깍, 딸깍. 낙엽 아래 숨어 있던 덫 두 개가 가지를 물고 닫힌다. 발을 디뎠다면 큰일 날 뻔했다.'}
   ]},
   {title:'남은 장력',text:'덫의 스프링에는 아직 장력이 남아 있다. 고정핀은 녹이 슬어 단단히 박혀 있다.',options:[
    {say:'막대로 장력을 먼저 풀고 핀을 빼자.',ok:true,min:10,text:'긴 막대를 덫의 입 사이에 끼워 스프링을 천천히 눌러 장력을 푼다. 힘이 빠진 덫에서 녹슨 고정핀을 두드려 뽑아낸다.'},
    {say:'줄을 끊고 손으로 접어 버리자.',hp:8,min:5,text:'줄을 끊자 남아 있던 장력이 한꺼번에 풀리며 덫이 크게 튄다. 손바닥이 쇠에 긁혀 피가 맺힌다.',paimon:'으… 보기만 해도 아파.'},
    {say:'돌을 던져서 덫을 닫히게 만들자.',pass:true,hp:5,min:10,text:'돌을 던지자 덫이 닫히며 튀어 오른 돌 조각이 뺨을 스친다. 덫은 닫혔지만, 맞물린 이빨을 벌려 들어 올리는 데 한참 애를 먹는다.'}
   ]},
   {title:'마무리',text:'덫은 모두 치웠다. 하지만 사냥꾼들이 이 근처에 다시 덫을 놓을지도 모른다.',options:[
    {say:'여기에 경고 표시를 남겨 두자.',ok:true,min:5,text:'치운 덫들을 한데 모아 묶고, 가까운 나무에 「덫 설치 금지 구역 · 모험가 길드」라고 새긴 나무패를 건다.',paimon:'이러면 사냥꾼들도 알겠지!'},
    {say:'할 일은 다 했어. 이제 가자.',pass:true,mora:20,text:'덫만 치우고 자리를 뜬다. 보고를 들은 캐서린은 표시가 없으면 순찰대가 다시 확인해야 한다며, 그 비용을 정산에서 뺄 것이다.'}
   ]}
  ],
  finale:'숲 가장자리가 다시 안전해졌다. 모아 둔 덫을 챙겨 캐서린에게 보고하자.'
 },
 Q_CRPG_MOND_EXP_WOLVENDOM_PATROL:{
  brief:'중무장한 츄츄족 무리가 울프 영지 숲 안쪽 통로를 막았다. 행인이 다치기 전에 길을 되찾자.',
  reward:{mora:250,xp:170,items:{MAT_CHAR_EXP_ADVENTURER:2,ORE_WHITE_IRON:2}},bonus:{mora:40},
  steps:[
   {title:'쇠를 덧댄 발자국',text:'진흙 위에 쇠를 덧댄 커다란 발자국이 찍혀 있다. 발자국 사이 간격이 넓고 깊다. 무거운 무언가를 든 무리다.',paimon:'이 발자국, 엄청 무거운 녀석이야…',options:[
    {say:'발자국이 얼마나 새것인지부터 보자.',ok:true,min:10,text:'발자국 가장자리의 흙이 아직 무너지지 않았다. 지나간 지 한 시간도 안 됐다. 발자국은 숲 안쪽 공터로 이어진다. 무리가 공터에 자리를 잡았다면 넓은 곳에서 상대할 수 있다.'},
    {say:'소리 나는 쪽으로 곧장 가자.',pass:true,hp:8,min:5,text:'덤불을 헤치고 소리를 따라가다 매복해 있던 츄츄족 척후에게 기습을 당한다. 쫓아내긴 했지만 한 대 제대로 맞았다.',paimon:'으윽, 숨어 있었잖아!'}
   ]},
   {title:'숲속 공터',text:'공터 한가운데에 도끼를 든 츄츄 폭도와 몽둥이를 든 무리가 모닥불을 둘러싸고 있다.',options:[
    {say:'정면으로 부딪치자!',battle:true,hp:5,text:'정면으로 뛰어들자 폭도의 도끼가 먼저 날아든다. 겨우 막아 냈지만 충격에 팔이 저린 채 싸움이 시작된다.'},
    {say:'공터 가장자리로 유인해서 하나씩 상대하자.',ok:true,battle:true,text:'돌멩이를 던져 무리의 시선을 끈 뒤 공터 가장자리 나무 사이로 물러선다. 무리가 흩어지며 쫓아온다.'}
   ]}
  ],
  finale:'통로를 막던 무리를 몰아냈다. 캐서린에게 보고하자.'
 },
 Q_CRPG_MOND_EXP_DRAGONSPINE_MARKERS:{
  brief:'드래곤 스파인의 눈보라에 탐사대의 귀환 표식이 묻혔다. 다음 탐사대가 길을 잃지 않도록 표식을 다시 세우자.',
  reward:{mora:270,xp:190,items:{MAT_CHAR_EXP_ADVENTURER:2,ORE_CRYSTAL:1}},bonus:{mora:60},
  steps:[
   {title:'묻힌 표식',text:'눈 위로 표식 깃대 끝이 겨우 드러나 있다. 다음 표식은 보이지 않는다. 바람은 산 위에서 아래로 몰아친다.',paimon:'온통 하얘서 어디가 어딘지 모르겠어…',options:[
    {say:'깃대가 기운 쪽을 보자. 다음 표식 쪽으로 기울여 세웠을 거야.',ok:true,min:15,text:'탐사대는 표식을 다음 표식 쪽으로 살짝 기울여 세운다. 깃대가 가리키는 방향으로 눈을 파 나가자, 두 번째 깃대의 붉은 천이 눈 속에서 모습을 드러낸다.',paimon:'찾았다! 빨간 천이야!'},
    {say:'발자국을 따라가자.',hp:5,min:15,text:'눈보라가 발자국을 금세 지운다. 한참을 헤매다 결국 처음 자리로 돌아온다. 몸만 차갑게 식었다.'},
    {say:'높은 곳에 올라가서 내려다보자.',hp:8,min:10,text:'바람받이 능선에 오르자 눈보라가 정면으로 몰아친다. 시야는커녕 몸을 가누기도 어렵다. 얼굴이 얼얼해져 서둘러 내려온다.'}
   ]},
   {title:'새 표식의 자리',text:'표식 사이 간격이 너무 멀어, 눈보라가 치면 다음 표식이 보이지 않는다. 사이에 새 표식을 하나 더 세워야 한다.',options:[
    {say:'멀리서도 보이게 능선 위에 세우자.',pass:true,mora:30,min:10,text:'능선 위 깃대는 멀리서 잘 보이지만 거센 바람에 금세 기울어진다. 탐사대가 다시 손봐야 할 비용을 길드가 정산에서 뺄 것이다.'},
    {say:'눈이 깊은 골짜기에 세우면 바람을 피하겠지.',min:10,text:'골짜기 아래에서는 앞뒤 표식이 전혀 보이지 않는다. 이래서는 표식을 세운 의미가 없다.'},
    {say:'앞뒤 표식이 둘 다 보이는 바위 그늘에 세우자.',ok:true,min:15,text:'바람을 피할 수 있는 바위 그늘에 서자 앞뒤 표식의 붉은 천이 동시에 보인다. 이곳에 깃대를 깊이 박고 돌로 밑동을 단단히 고정한다.'}
   ]}
  ],
  finale:'새 표식이 눈보라 속에서도 또렷하게 붉은 빛을 드러낸다. 이제 탐사대는 이 길을 따라 무사히 돌아올 수 있다. 캐서린에게 보고하자.'
 },
 Q_LIYUE_EXP_PLAINS_CARAVAN:{
  brief:'리월 평원의 도로변에 운송 상자가 버려져 있다. 봉인은 남아 있지만 바닥판이 깨졌다. 짐을 잃기 전에 회수하자.',
  reward:{mora:140,xp:100,items:{MAT_CHAR_EXP_ADVENTURER:1,MAT_CHAR_EXP_WANDERER:2}},bonus:{mora:30},
  steps:[
   {title:'길가의 상자',text:'상자에는 비운 상회의 붉은 인장이 찍혀 있다. 깨진 바닥판 틈으로 볏짚이 삐져나왔고, 도로 위의 바퀴 자국은 상자 앞에서 급하게 휘어져 있다.',paimon:'비운 상회 거라면 행추네 집안 상회잖아!',options:[
    {say:'깨진 틈으로 안을 좀 볼까?',hp:3,min:5,text:'틈에 손을 밀어 넣자 볏짚 사이의 깨진 도자기 조각에 손가락을 베인다. 상회 물건에 함부로 손을 댄 것 같아 찜찜하기만 하다.'},
    {say:'인장이랑 바퀴 자국부터 확인하자. 도둑맞은 건지 알아야 해.',ok:true,min:5,text:'바퀴 자국은 상자 앞에서 급하게 방향을 틀었다가 다시 도로로 돌아간다. 떨어뜨린 줄 모르고 떠난 것이다. 인장도 훼손되지 않았다. 누가 손댄 흔적은 없다.'},
    {say:'빨리 상자째 들어서 옮기자.',pass:true,mora:20,min:5,text:'상자를 번쩍 들자 깨진 바닥판이 벌어지며 안에 든 도자기 몇 점이 떨어져 깨진다.',paimon:'으아, 비싼 거면 어떡해…'}
   ]},
   {title:'옮기기',text:'깨진 바닥을 그대로 두면 옮기는 도중에 짐이 쏟아질 것이다. 길가에는 부서진 울타리 판자가 굴러다닌다.',options:[
    {say:'끈으로 칭칭 감으면 버틸 거야.',pass:true,mora:15,min:5,text:'끈으로 감아 옮기던 도중 판이 결국 벌어져 짐 하나가 도로에 떨어진다.'},
    {say:'바닥을 판자로 받치고 짐을 나눠서 옮기자.',ok:true,min:15,text:'울타리 판자로 바닥을 받치고, 무거운 짐은 따로 꺼내 보자기에 싼다. 두 번에 나눠 옮기니 흠집 하나 없다.'}
   ]}
  ],
  finale:'상자는 무사하다. 리월항의 캐서린에게 가져가면 비운 상회로 돌려보내 줄 것이다.'
 },
 Q_LIYUE_EXP_MOUNTAIN_CACHE:{
  brief:'리월 산지의 좁은 절벽 선반에 오래된 물자함이 놓여 있다. 선반까지 내려가는 밧줄은 닳을 대로 닳았다.',
  reward:{mora:170,xp:120,items:{MAT_CHAR_EXP_ADVENTURER:2,MAT_CHAR_EXP_WANDERER:1}},bonus:{mora:30},
  steps:[
   {title:'절벽 아래',text:'절벽 위에서 내려다보니 선반까지는 사람 키 세 배쯤이다. 기존 밧줄은 군데군데 올이 풀려 있고, 옆 암벽에는 튀어나온 돌들이 계단처럼 이어져 있다.',paimon:'저 밧줄, 금방이라도 끊어질 것 같아…',options:[
    {say:'밧줄 잡고 한 번에 내려가자.',hp:10,min:5,text:'밧줄에 몸을 싣는 순간 올이 풀리며 밧줄이 쭉 늘어난다. 다급하게 바위를 붙잡아 추락은 면했지만, 절벽에 무릎과 팔꿈치를 세게 긁힌다.',paimon:'으아악! 심장 떨어지는 줄 알았어!'},
    {say:'튀어나온 돌을 하나씩 밟아 보면서 내려가자.',ok:true,min:15,text:'돌을 딛기 전마다 발끝으로 두드려 흔들리는지 확인한다. 헐거운 돌 하나는 건너뛰고, 나머지를 딛고 천천히 선반까지 내려선다.'},
    {say:'위에서 갈고리로 끌어올리자.',min:15,text:'갈고리를 던져 보지만 물자함 손잡이에 걸리지 않는다. 몇 번을 던져도 헛수고다.'}
   ]},
   {title:'천암군의 물자함',text:'물자함에는 천암군 표식이 찍혀 있다. 뚜껑 안쪽에는 산길 순찰대가 남긴 쪽지가 붙어 있다. 「비상용. 사용 시 천암군에 알릴 것.」',options:[
    {say:'쪽지대로 기록을 남기자. 천암군이 알아야 하니까.',ok:true,min:5,text:'쪽지 뒷면에 발견한 날짜와 가져간 물자를 적어 뚜껑 안쪽에 다시 붙인다. 순찰대가 들르면 바로 확인할 수 있을 것이다.',paimon:'이러면 나중에 곤란할 일도 없겠지!'},
    {say:'오래된 거니까 그냥 가져가도 되겠지.',pass:true,mora:25,min:5,text:'기록 없이 물자를 챙겨 올라온다. 천암군 물자를 알리지 않고 가져온 탓에, 길드가 천암군에 대신 배상하느라 그만큼 정산이 줄어들 것이다.'}
   ]}
  ],
  finale:'물자함을 등에 메고 조심스럽게 절벽을 올라온다. 리월항의 캐서린에게 보고하자.'
 },
 Q_LIYUE_EXP_CHASM_SURFACE_DEPOT:{
  brief:'층암거연 폐광 입구의 지지대가 기울었다. 무너지기 전에 안쪽 보급소의 물자를 꺼내야 한다.',
  reward:{mora:250,xp:200,items:{MAT_CHAR_EXP_ADVENTURER:3}},bonus:{mora:40},
  steps:[
   {title:'기울어진 지지대',text:'폐광 입구의 나무 지지대가 삐걱이며 흙가루를 흘린다. 보급소 문은 입구 바로 안쪽에 있다. 입구 옆에는 광부들이 쓰던 보조 기둥 몇 개가 쌓여 있다.',paimon:'저기 들어갔다가 무너지면… 생각도 하기 싫어.',options:[
    {say:'빨리 들어갔다 나오면 괜찮아.',pass:true,hp:10,min:5,text:'뛰어드는 순간 지지대가 크게 흔들리며 흙더미가 쏟아진다. 머리를 감싸고 버틴 뒤에야 먼지가 가라앉는다. 문 앞까지는 왔지만 온몸이 욱신거린다.'},
    {say:'보조 기둥부터 받치자.',ok:true,min:15,text:'쌓여 있던 보조 기둥을 기울어진 지지대 옆에 세우고 쐐기를 박는다. 삐걱거리던 소리가 멎는다.'},
    {say:'지지대를 밀어서 바로 세우자.',hp:5,min:10,text:'지지대를 밀자 더 큰 흙더미가 떨어진다. 황급히 입구 밖으로 물러난다.',paimon:'으악, 더 무너지잖아!'}
   ]},
   {title:'뒤틀린 문',text:'보급소 문은 뒤틀려 반쯤만 열린다. 안에는 곡괭이와 등불, 식량 자루가 보인다.',options:[
    {say:'틈으로 물자를 한꺼번에 끌어내자.',pass:true,mora:30,min:5,text:'좁은 틈으로 자루를 끌어내다 자루가 찢어져 곡식이 쏟아진다.'},
    {say:'경첩을 빼서 문을 통째로 떼어 내자.',ok:true,min:10,text:'뒤틀린 문을 억지로 여는 대신 경첩 핀을 뽑아 문을 통째로 떼어 낸다. 물자를 꺼낼 길이 넓게 열린다.'}
   ]}
  ],
  finale:'보급소의 물자를 모두 밖으로 옮겼다. 리월항의 캐서린에게 보고하자.'
 },
 Q_LIYUE_EXP_CHASM_DEEP_CACHE:{
  brief:'층암거연 지하 심층, 탐사대가 남긴 비상 저장고 입구를 낙석이 막고 있다. 어둠 속에서 길을 뚫어야 한다.',
  reward:{mora:360,xp:280,items:{MAT_CHAR_EXP_HERO:1,MAT_CHAR_EXP_ADVENTURER:1}},bonus:{mora:50},
  steps:[
   {title:'심층의 어둠',text:'지하 심층에는 빛이 거의 들지 않는다. 바위 틈의 형광석 몇 개가 희미하게 빛날 뿐, 낙석 너머 저장고 입구는 그림자에 잠겨 있다. 어딘가에서 물방울 떨어지는 소리가 울린다.',paimon:'어두워서 아무것도 안 보여… 무섭잖아!',options:[
    {say:'손으로 더듬어 가면 돼.',hp:8,min:10,text:'더듬거리며 나아가다 날카로운 바위 모서리에 팔을 베인다.'},
    {say:'형광석을 모아서 길을 밝히자.',ok:true,min:15,text:'바위 틈의 형광석을 조심스럽게 떼어 발밑에 늘어놓는다. 푸른 빛이 낙석 더미의 윤곽을 드러낸다. 위쪽의 큰 바위가 작은 돌들에 기대어 겨우 버티고 있다.'}
   ]},
   {title:'낙석 더미',text:'낙석 더미 위쪽의 큰 바위를 작은 돌들이 받치고 있다. 옆에는 사람 하나 겨우 지날 좁은 통풍구가 있다.',options:[
    {say:'큰 바위를 굴려 버리자.',hp:10,min:10,text:'큰 바위를 밀자 받치던 돌이 무너지며 낙석이 더 쏟아진다. 튄 돌에 맞고, 입구는 더 막혔다.',paimon:'으윽, 더 막혔잖아…'},
    {say:'통풍구로 들어가서 안에서 빗장을 열자.',pass:true,hp:8,min:10,text:'통풍구 안은 생각보다 좁고 날카롭다. 여기저기 긁히며 겨우 안으로 들어가 빗장을 연다.'},
    {say:'큰 바위를 받치는 돌은 두고, 옆쪽 돌부터 치워서 길을 내자.',ok:true,min:20,text:'큰 바위를 받친 돌은 그대로 두고 옆쪽의 자잘한 돌만 하나씩 옮긴다. 몸 하나 빠져나갈 틈이 생긴다.'}
   ]},
   {title:'탐사대의 일지',text:'저장고 안에는 탐사대가 남긴 비상식량과 약품, 그리고 두툼한 탐사 일지가 있다. 일지 마지막 장에는 「귀환 성공. 남은 물자는 다음 사람에게.」라고 적혀 있다.',options:[
    {say:'일지는 천암군에 전해 줘야겠어. 물자는 필요한 만큼만 챙기자.',ok:true,min:5,text:'일지를 따로 챙겨 캐서린을 통해 천암군에 전하기로 한다. 물자는 필요한 만큼만 자루에 담고 나머지는 선반에 가지런히 둔다.',paimon:'다음 사람도 쓸 수 있게 남겨 두는 거구나.'},
    {say:'일지까지 챙기면 짐이 무거워. 두고 가자.',pass:true,mora:40,min:5,text:'일지를 선반에 둔 채 물자만 챙긴다. 캐서린은 탐사 일지가 빠졌다는 말에 아쉬워할 것이고, 천암군이 주는 수고비는 받지 못한다.'}
   ]}
  ],
  finale:'무거운 자루를 메고 형광석 불빛을 따라 지상으로 돌아간다. 리월항의 캐서린에게 보고하자.'
 },
 Q_CRPG_LIYUE_EXP_HARBOR_LEDGER:{
  brief:'리월항 부두의 같은 화물이 두 창고의 장부에 두 번 적혔다. 실제 수량이 얼마인지 밝혀야 한다.',
  reward:{mora:180,xp:110,items:{MAT_CHAR_EXP_WANDERER:2}},bonus:{mora:30},
  steps:[
   {title:'두 장부',text:'두 장부 모두 「비단 스무 필」이 들어왔다고 적혀 있다. 한 장부는 오전, 다른 장부는 오후 기록이고 서명은 서로 다르다.',paimon:'스무 필이 두 번이면 마흔 필? 그럴 리가 없잖아.',options:[
    {say:'수량이 적은 쪽이 진짜겠지.',min:10,text:'두 장부의 수량은 똑같이 스무 필이다. 기준으로 삼을 수가 없다.'},
    {say:'글씨가 더 깔끔한 장부를 믿자.',min:10,text:'깔끔한 글씨가 정확한 기록이라는 보장은 없다. 옆에서 듣던 창고지기가 콧방귀를 뀐다.',paimon:'으… 좀 창피하다.'},
    {say:'서명한 사람이랑 도착 시각을 같이 맞춰 보자.',ok:true,min:15,text:'오전 서명은 부두 하역 담당, 오후 서명은 창고 관리인의 것이다. 도착 시각은 둘 다 같은 배다. 하역 담당이 먼저 적고, 창고 관리인이 창고에 넣으며 다시 적은 것이다. 같은 화물이다.'}
   ]},
   {title:'증명',text:'같은 화물이라는 결론이 나왔지만, 두 창고가 모두 납득하려면 증거가 필요하다.',options:[
    {say:'창고에 가서 실제로 세어 보자.',ok:true,min:15,text:'창고 선반의 비단 꾸러미를 하나하나 센다. 정확히 스무 필이다. 장부에 「중복 기록, 실제 수량 스무 필」이라 적고 양쪽 담당자의 서명을 받는다.'},
    {say:'두 담당자를 불러서 따져 보자.',pass:true,mora:20,min:20,text:'하역 담당과 창고 관리인이 서로 네 탓이라며 언성을 높인다. 결국 창고를 직접 세어 해결하지만, 소동을 들은 상회가 수고비를 깎는다.'}
   ]}
  ],
  finale:'장부가 바로잡혔다. 리월항의 캐서린에게 보고하자.'
 },
 Q_CRPG_LIYUE_EXP_TREASURE_PROOF:{
  brief:'천암군이 보물 사냥단의 활동 범위를 파악하려 한다. 보물찾기 까마귀 휘장 5개를 모아 가져가자.',
  reward:{mora:290,xp:140,items:{ORE_WHITE_IRON:2,MAT_CHAR_EXP_WANDERER:1}},bonus:{mora:30},
  steps:[
   {title:'휘장 분류',text:'모아 온 휘장을 탁자에 늘어놓는다. 같은 모양이지만 묻은 흙과 닳은 정도가 제각각이다.',paimon:'다 똑같아 보이는데… 뭘로 구분하지?',options:[
    {say:'깨끗한 것만 골라서 내자.',pass:true,mora:20,min:5,text:'깨끗한 휘장만으로는 어디서 나온 것인지 알 수 없다. 천암군은 추가 조사가 필요하다며 수고비를 일부만 줄 것이다.'},
    {say:'묻은 흙이랑 닳은 정도로 나눠 보자.',ok:true,min:10,text:'붉은 흙이 묻은 휘장은 평원 야영지에서, 회색 돌가루가 낀 휘장은 산지 야영지에서 나온 것이다. 휘장은 두 무리로 나뉜다. 보물 사냥단이 적어도 두 곳에 진을 치고 있다는 뜻이다.',paimon:'오오, 흙 색깔로 그런 걸 알 수 있구나!'}
   ]},
   {title:'보고서',text:'분류는 끝났다. 천암군에 넘길 기록을 정리해야 한다.',options:[
    {say:'야영지 위치를 지도에 표시해서 같이 넘기자.',ok:true,min:10,text:'휘장이 나온 곳을 지도에 점으로 찍고, 무리별로 색을 달리해 표시한다. 두 무리의 이동 경로가 한눈에 보인다.'},
    {say:'휘장만 넘기면 되겠지.',pass:true,mora:15,min:5,text:'휘장만 봉투에 담는다. 천암군은 위치 기록이 없어 다시 조사해야 한다며 수고비를 깎을 것이다.'}
   ]}
  ],
  finale:'휘장과 정리한 기록을 캐서린에게 넘기면 천암군에 전달될 것이다.'
 },
 Q_CRPG_LIYUE_EXP_QINGCE_PROVISIONS:{
  brief:'경책 산장 사람들이 산길이 막히는 날을 대비해 공동 창고를 채우려 한다. 생선 살코기 4개와 쌀 4개를 가져가 상하지 않게 넣어 두자.',
  reward:{mora:330,xp:170,items:{MAT_CHAR_EXP_ADVENTURER:2}},bonus:{mora:30},
  steps:[
   {title:'공동 창고',text:'공동 창고는 계단식 논 옆의 흙벽 창고다. 안쪽은 서늘하지만 바닥이 조금 축축하고, 입구 쪽으로는 햇볕이 든다.',paimon:'생선이랑 쌀은 같이 두면 안 될 것 같은데?',options:[
    {say:'전부 입구 쪽에 쌓자. 꺼내기 편하잖아.',pass:true,mora:20,min:5,text:'햇볕이 드는 입구에 둔 생선이 금세 비린내를 풍긴다. 산장 사람들이 결국 생선 일부를 버리고, 사례도 그만큼 줄어든다.'},
    {say:'쌀은 높은 선반에, 생선은 소금에 절여서 안쪽에 두자.',ok:true,min:15,text:'쌀 포대는 습기가 닿지 않게 높은 선반에 올리고, 생선은 소금을 뿌려 항아리에 담아 서늘한 안쪽에 둔다. 먼저 먹을 것은 앞쪽에 둔다.',paimon:'이러면 오래 가겠다!'},
    {say:'한 상자에 꽉꽉 눌러 담자.',pass:true,mora:15,min:5,text:'눌러 담은 쌀에 생선 물기가 스며 쌀 일부가 눅눅해진다.'}
   ]},
   {title:'창고 열쇠',text:'창고 정리를 마치자 산장 할머니가 다가와 묻는다. 「젊은이, 창고 열쇠는 누구한테 맡길 텐가?」',options:[
    {say:'캐서린한테 맡길게요. 길드라면 안전하니까요.',pass:true,mora:20,min:10,text:'할머니는 산장 창고 열쇠를 항구에 맡기면 막상 필요할 때 쓸 수가 없다며 고개를 젓는다. 결국 열쇠를 돌려드리느라 시간이 걸리고, 사례도 줄어든다.'},
    {say:'할머니가 맡아 주세요. 산장 분들이 제일 잘 아시잖아요.',ok:true,min:10,text:'할머니는 흡족한 얼굴로 열쇠를 받는다. 산장 아이들이 몰려와 따뜻한 차를 권한다.',paimon:'헤헤, 차 맛있다!'}
   ]}
  ],
  finale:'공동 창고가 든든하게 채워졌다. 리월항의 캐서린에게 보고하자.'
 },
 Q_CRPG_LIYUE_EXP_MOUNTAIN_BLOCKADE:{
  brief:'돌방패를 든 츄츄족 무리가 고갯길을 막아 운송대가 지나가지 못하고 있다. 수레가 지나갈 틈을 만들자.',
  reward:{mora:350,xp:190,items:{MAT_CHAR_EXP_ADVENTURER:2}},bonus:{mora:40},
  steps:[
   {title:'멈춘 운송대',text:'고갯길 한가운데에 츄츄족들이 돌방패를 세워 벽을 쌓았다. 운송대의 수레 세 대가 비탈에 멈춰 서 있고, 짐꾼들은 수레바퀴에 돌을 괴어 두었다.',paimon:'비탈에서 싸우다가 수레가 굴러가면 큰일이야!',options:[
    {say:'수레를 평평한 곳까지 뒤로 물리자.',ok:true,min:10,text:'짐꾼들과 함께 수레를 한 대씩 비탈 아래 평지로 물린다. 바퀴에 돌을 다시 괴고 나서야 츄츄족에게 눈을 돌린다.'},
    {say:'수레는 그대로 두고 빨리 싸우자.',battle:true,mora:30,text:'싸움이 시작되자마자 괴어 둔 돌이 빠져 수레 한 대가 비탈을 굴러 내려간다. 짐이 사방으로 흩어지는 소리를 들으며 싸워야 한다.',paimon:'수레가 굴러간다!'}
   ]},
   {title:'방패벽',text:'돌방패는 정면에서 부수기 어렵다. 방패벽 옆으로는 좁은 바위 비탈이 나 있다.',options:[
    {say:'정면으로 방패를 부수자!',battle:true,hp:5,text:'방패를 내리치지만 손만 저릴 뿐이다. 방패 뒤에서 튀어나온 몽둥이에 한 대 맞으며 싸움이 시작된다.'},
    {say:'옆 비탈로 돌아가서 뒤를 치자.',ok:true,battle:true,text:'바위 비탈을 타고 방패벽 뒤로 돌아간다. 츄츄족들이 당황해 방패를 돌리는 사이 싸움이 시작된다.'}
   ]}
  ],
  finale:'고갯길이 다시 열렸다. 리월항의 캐서린에게 보고하자.'
 },
 Q_CRPG_LIYUE_EXP_JUEYUN_SURVEY:{
  brief:'절운간 안개 속의 이정표 세 개가 서로 다른 방향을 가리킨다. 누군가 옮겨 놓은 표식을 찾아 바로잡자.',
  reward:{mora:400,xp:210,items:{ORE_CRYSTAL:3}},bonus:{mora:40,items:{ORE_CRYSTAL:1}},
  steps:[
   {title:'어긋난 이정표',text:'첫 번째 이정표는 오르막을, 두 번째는 절벽 쪽을, 세 번째는 계곡 아래를 가리킨다. 안개가 짙어 이정표 너머는 보이지 않는다.',paimon:'선인들이 사는 곳이라 길이 이상하게 꼬여 있는 걸까?',options:[
    {say:'가장 많이 밟힌 길을 따라가 보자.',hp:5,min:20,text:'많이 밟힌 길은 절벽 끝 전망대에서 끊긴다. 안개 속에서 발을 헛디딜 뻔하다 겨우 돌아온다.'},
    {say:'선인들한테 도움을 청해 보자.',min:15,text:'허공에 대고 선인을 불러 보지만, 안개 속에서는 학 울음소리만 메아리친다.',paimon:'선인들이 우리 부탁을 들어줄 리가 없잖아…'},
    {say:'이정표 밑동부터 살펴보자. 옮긴 흔적이 남았을 거야.',ok:true,min:10,text:'세 번째 이정표 밑동의 흙만 새것이다. 주변 풀도 눌려 있다. 누군가 최근에 뽑아서 다시 박은 것이다.'}
   ]},
   {title:'원래 방향',text:'옮겨진 것은 세 번째 이정표다. 원래 어디를 가리켰는지 알아내야 한다.',options:[
    {say:'고도랑 바람 방향이 나머지 두 개랑 맞는지 보자.',ok:true,min:15,text:'나머지 두 이정표는 바람이 불어오는 오르막을 기준으로 세워져 있다. 세 번째 이정표를 같은 기준으로 돌리자 세 이정표가 한 길로 이어지고, 안개 너머로 돌계단이 모습을 드러낸다.',paimon:'길이 보인다!'},
    {say:'계곡 아래를 가리키게 두자. 내려가는 길이 편하니까.',pass:true,mora:30,min:20,text:'확인하러 내려간 계곡은 막다른 길이다. 되돌아오느라 한참 걸린 끝에 방향을 바로잡지만, 천암군에 넘길 측량 기록이 부실해진다.'}
   ]}
  ],
  finale:'이정표가 다시 한 길을 가리킨다. 리월항의 캐서린에게 측량 결과를 보고하자.'
 },
 Q_CRPG_LIYUE_EXP_RUIN_PARTS_ORDER:{
  brief:'리월항 수리공들이 가짜 유적 부품이 섞여 들어왔다고 의심한다. 혼돈의 장치 3개와 기계 고철 2개를 가져가 진짜와 비교해 보자.',
  reward:{mora:460,xp:260,items:{MAT_CHAR_EXP_ADVENTURER:2}},bonus:{mora:40},
  steps:[
   {title:'여섯 개의 부품',text:'수리공의 작업대 위에 부품 여섯 개가 놓여 있다. 겉보기엔 모두 비슷하게 녹슬었지만 무게가 조금씩 다르다.',paimon:'진짜랑 가짜를 어떻게 구별해?',options:[
    {say:'무거운 게 진짜겠지.',min:10,text:'무게로 고른 부품 하나를 수리공이 망치로 두드리자 속이 빈 소리가 난다. 가짜 속에 납을 채워 무게를 맞춘 것이다.'},
    {say:'맞물리는 면의 마모랑 기름때를 비교하자.',ok:true,min:15,text:'가져온 진짜 부품과 나란히 놓고 맞물리는 면을 비교한다. 진짜는 한 방향으로만 닳아 있지만, 가짜 두 개에는 줄로 갈아 만든 자국이 사방으로 나 있다.',paimon:'오, 확실히 달라!'},
    {say:'분해해 보면 알겠지.',pass:true,mora:30,min:15,text:'부품을 분해하자 진짜 하나가 원래대로 조립되지 않는다. 가짜는 가려냈지만, 수리공의 진짜 부품 하나를 망가뜨리고 말았다.'}
   ]},
   {title:'가짜의 출처',text:'가짜 부품 두 개에는 똑같은 긁힌 표식이 남아 있다.',options:[
    {say:'표식을 기록해서 천암군에 알리자.',ok:true,min:10,text:'표식을 종이에 옮겨 그리고, 부품을 들여온 상인의 이름을 수리공에게서 받아 적는다.'},
    {say:'가짜는 버리면 그만이야.',pass:true,mora:20,min:5,text:'가짜 부품을 버리자 수리공이 한숨을 쉰다. 누가 만들었는지 밝힐 증거가 사라졌다.'}
   ]}
  ],
  finale:'진짜와 가짜를 가려냈다. 리월항의 캐서린에게 보고하자.'
 },
 Q_CRPG_LIYUE_EXP_THREE_PATROLS:{
  brief:'천암군이 리월 외곽의 동선을 파악하려 한다. 리월 야외에서 조우 전투를 세 번 이기고 순찰 기록을 제출하자.',
  reward:{mora:520,xp:280,items:{MAT_CHAR_EXP_ADVENTURER:2,MAT_CHAR_EXP_WANDERER:2}},bonus:{mora:40},
  steps:[
   {title:'순찰 기록',text:'세 번의 순찰 기록이 손에 있다. 날짜와 장소, 마주친 적이 기록마다 제각각 적혀 있다.',paimon:'이걸 그대로 내면 되는 거 아니야?',options:[
    {say:'제일 싸움이 많았던 날 기록만 내자.',pass:true,mora:30,min:5,text:'하루치 기록만으로는 동선을 알 수 없다. 천암군은 기록이 부족하다며 수고비를 줄일 것이다.'},
    {say:'시간이랑 경로, 마주친 곳을 순서대로 맞춰 보자.',ok:true,min:15,text:'세 기록을 시간순으로 늘어놓고 지도에 경로를 그린다. 두 기록이 같은 길목을 지나고 있다. 겹치는 동선을 한 줄로 정리하자, 적이 자주 나타나는 길목이 또렷해진다.',paimon:'이러면 천암군도 한눈에 알겠다!'}
   ]}
  ],
  finale:'정리한 순찰 기록을 리월항의 캐서린에게 제출하자.'
 },
 Q_CRPG_LIYUE_EXP_RUIN_CLEARANCE:{
  brief:'층암거연 폐광 입구를 유적 기계가 배회하며 작업대를 위협한다. 작업자들을 물리고 기계를 멈추자.',
  reward:{mora:550,xp:300,items:{MAT_CHAR_EXP_ADVENTURER:3}},bonus:{mora:50},
  steps:[
   {title:'멈추지 않는 기계',text:'유적 가디언이 폐광 입구 앞을 일정한 경로로 오간다. 작업대에서는 광부들이 연장을 든 채 얼어붙어 있다.',paimon:'저 녀석, 똑같은 길만 계속 도는 것 같아!',options:[
    {say:'지금 바로 공격하자!',battle:true,mora:30,text:'달려드는 순간 광부들이 비명을 지르며 흩어지다 작업대를 넘어뜨린다. 부서진 작업 물자 사이로 가디언의 눈이 붉게 빛나며 싸움이 시작된다.'},
    {say:'기계가 등을 보일 때 광부들을 빼내자.',ok:true,min:10,text:'가디언이 반대편 끝에서 몸을 돌리는 순간, 손짓으로 광부들을 불러낸다. 광부들이 연장을 끌어안고 비탈 아래로 빠져나간다.'}
   ]},
   {title:'유인',text:'광부들이 안전한 곳으로 물러났다. 가디언의 눈이 붉게 빛난다.',options:[
    {say:'넓은 공터로 끌어내서 싸우자.',ok:true,battle:true,text:'돌을 던져 가디언의 주의를 끈 뒤 공터 한가운데로 물러선다. 육중한 몸체가 땅을 울리며 쫓아온다.'},
    {say:'폐광 안으로 유인해서 가둬 버리자.',battle:true,hp:8,text:'폐광 입구 쪽으로 유인하자 가디언의 돌진에 지지대가 흔들리며 흙더미가 쏟아진다. 흙먼지 속에서 싸움이 시작된다.'}
   ]}
  ],
  finale:'기계가 멈췄다. 리월항의 캐서린에게 보고하자.'
 },
 Q_CRPG_LIYUE_EXP_CHASM_SHIFT:{
  brief:'층암거연 교대조가 돌아올 길을 암흑의 빈 갑주 무리가 끊었다. 광부들이 빠져나올 때까지 통로를 지키자.',
  reward:{mora:660,xp:370,items:{MAT_CHAR_EXP_ADVENTURER:3,TRPG_MEDKIT:1}},bonus:{mora:60},
  steps:[
   {title:'갇힌 교대조',text:'갱도 안쪽에서 광부들의 등불이 흔들린다. 갱도와 바깥 사이의 좁은 통로에는 암흑의 빈 갑주 무리가 자리를 잡았다.',paimon:'광부들이 안에 갇혀 있어!',options:[
    {say:'광부들한테 신호를 보내서 기다리게 하자.',ok:true,min:10,text:'등불을 세 번 흔들어 신호를 보낸다. 안쪽 등불이 두 번 흔들리며 답한다. 길을 열 때까지 기다리겠다는 뜻이다.'},
    {say:'광부들한테 지금 뛰어나오라고 하자.',pass:true,hp:8,mora:20,min:5,text:'광부들이 뛰쳐나오자 갑주 무리가 그쪽으로 몰려간다. 몸으로 막아서며 광부들을 빼냈지만, 한 대 맞았고 광부들의 짐 일부도 잃었다.'}
   ]},
   {title:'통로 사수',text:'통로는 사람 둘이 겨우 지나갈 만큼 좁다. 갑주 무리가 이쪽을 향해 움직이기 시작한다.',options:[
    {say:'넓은 곳으로 끌어내자.',battle:true,hp:5,text:'넓은 곳으로 나서자 갑주 무리가 사방에서 에워싼다. 뒤에서 날아든 화살에 어깨를 스치며 싸움이 시작된다.'},
    {say:'좁은 곳에서 막으면 한꺼번에 덤비지 못해.',ok:true,battle:true,text:'통로 입구에 버티고 서서 갑주 무리를 맞는다. 좁은 통로 탓에 적들은 하나씩밖에 다가오지 못한다.'}
   ]}
  ],
  finale:'교대조가 무사히 빠져나왔다. 리월항의 캐서린에게 보고하자.'
 },
 Q_CRPG_LIYUE_EXP_DEEP_PATROL:{
  brief:'층암거연 심층 통로의 표식이 사라지고 흑 뱀 기사 선봉이 길목을 차지했다. 위험 구역을 비우고 귀환선을 다시 표시하자.',
  reward:{mora:880,xp:480,items:{MAT_CHAR_EXP_ADVENTURER:3,MAT_CHAR_EXP_HERO:1,ORE_CRYSTAL:3}},bonus:{mora:80},
  steps:[
   {title:'지워진 표식',text:'심층 통로 벽면에 탐사대가 긁어 둔 표식이 군데군데 지워져 있다. 멀리서 쇠 갑옷이 부딪치는 소리가 울린다.',paimon:'돌아갈 길을 잃으면 끝이야…',options:[
    {say:'소리 나는 쪽으로 먼저 가자.',pass:true,hp:10,min:10,text:'소리를 쫓아 깊이 들어가다 갈림길에서 방향을 잃는다. 어둠 속에 매복해 있던 적에게 기습을 받고서야 겨우 길을 되찾는다.'},
    {say:'지워진 표식부터 다시 긁어 두자. 돌아올 길이 먼저야.',ok:true,min:15,text:'지워진 자리마다 새로 표식을 긁어 두며 전진한다. 싸움이 길어져도 돌아갈 길은 확보됐다.'}
   ]},
   {title:'선봉',text:'통로 끝 넓은 동굴에 흑 뱀 기사가 검을 늘어뜨린 채 버티고 서 있다. 그 뒤로 갑주 궁수가 활을 겨눈다.',options:[
    {say:'표식을 등지고 싸우자. 물러설 길은 확보됐어.',ok:true,battle:true,text:'새로 긁은 표식을 등 뒤에 두고 무기를 고쳐 쥔다. 흑 뱀 기사가 천천히 검을 들어 올린다.'},
    {say:'궁수부터 치자. 기사는 나중이야.',battle:true,hp:8,text:'궁수를 향해 달려드는 순간 기사의 검이 옆구리를 스친다. 등을 보인 대가를 치르며 싸움이 시작된다.'}
   ]}
  ],
  finale:'심층의 귀환선이 다시 이어졌다. 리월항의 캐서린에게 보고하자.'
 }
};
// Commissions without a scene still get player-facing text, spoken choices and the reward update.
const PLAIN={
 Q_CRPG_MOND_FIRST_FIELD:{brief:'초원 길가에 바람 슬라임 한 마리가 떠 있다. 오가는 사람들이 놀라기 전에 정리해 두자.',reward:{mora:80,items:{MAT_CHAR_EXP_WANDERER:1}},labels:{careful:'저 슬라임부터 정리하자.',leave:'준비를 좀 더 하고 올게.'}},
 Q_MOND_XP_SUPPLY:{brief:'처음 몬드에 온 모험가를 위한 길드의 보급이다. 현장 활동을 하나 마치고 기록을 보여 주면 받을 수 있다.'},
 Q_MOND_FAVONIUS_SUPPLY:{brief:'기사단이 현장에서 힘을 보탠 모험가에게 무기 하나를 보급한다. 기사단 협력 의뢰를 하나 마치거나 몬드 야외에서 두 번 싸워 이기면 받을 수 있다.'},
 Q_LIYUE_XP_SUPPLY:{brief:'리월에서 활동을 시작한 모험가를 위한 길드의 보급이다. 리월 현장 활동을 하나 마치고 기록을 보여 주면 받을 수 있다.'},
 Q_CRPG_MOND_EXP_FIELD_STIPEND:{brief:'현장 사건을 해결한 모험가에게 길드가 다음 여정의 물자를 지급한다. 해결한 현장 기록을 캐서린에게 보여 주자.',labels:{careful:'현장 기록 확인 부탁할게.'}}
};
const SUPPLY_LABELS={submit:'현장 기록 가져왔어. 확인해 줄래?',requirements:'아직 뭐가 부족한지 알려 줄래?',leave:'기록을 더 모아서 다시 올게.'};

function applyReward(base,next){const out={...base,mora:next.mora??base.mora,items:{...(next.items||base.items||{})}};if(next.xp!==undefined)out.xp=next.xp;return out;}
P.installFieldScenes=function(){
 if(this._fieldScenesInstalled)return;
 const rows=this.db['22_QUEST_DB'].map(r=>Array.isArray(r)?r.slice():r);
 for(const r of rows.slice(1)){
  if(!Array.isArray(r))continue;const spec=SCENES[r[0]]||PLAIN[r[0]];const d=json(r[10]);
  if(d.kind==='supply')for(const c of d.choices||[])if(SUPPLY_LABELS[c.id])c.label=SUPPLY_LABELS[c.id];
  if(spec){
   if(spec.brief){r[5]=spec.brief;d.text=spec.brief;}
   for(const c of d.choices||[])if(spec.labels?.[c.id])c.label=spec.labels[c.id];
   if(spec.reward)r[11]=JSON.stringify(applyReward(json(r[11]),spec.reward));
  }
  if(d.kind)r[10]=JSON.stringify(d);
 }
 this.db={...this.db,'22_QUEST_DB':rows};this.tables['22_QUEST_DB']=new Map(rows.slice(1).filter(r=>r&&r[0]).map(r=>[r[0],r]));
 this._fieldScenesInstalled=true;
};
P.installExplorationContent=function(){old.installExplorationContent.call(this);this.installFieldScenes();};

const fresh=()=>({v:1,step:0,tried:{},log:[],mistakes:0,penalty:0,minutes:0,hpLost:0});
P.fieldScene=function(id){return SCENES[id]||null;};
P.fieldSceneState=function(id){const q=this.s.quests[id];return q?.scene||fresh();};
P.fieldSceneReason=function(id,a={}){
 const scene=SCENES[id];if(!scene)return '현장 장면이 없는 의뢰입니다.';
 if(this.s.runtime)return '전투를 먼저 마쳐 주세요.';
 if(this.playPhase?.()!=='FREE')return '현재 이야기와 진행 중인 행동을 먼저 마쳐 주세요.';
 const row=this.tables['22_QUEST_DB'].get(id),q=this.s.quests[id];
 if(!row||!this.isCommission?.(id)||!this.commissionAccepted?.(id)||q?.claimed)return '현재 조사할 수 있는 의뢰가 아닙니다.';
 const d=json(row[10]);if(this.s.global.CURRENT_MAP_ID!==d.map_id||this.s.placeVisit)return '의뢰 현장의 메인 화면에서 진행해 주세요.';
 if(q?.node==='READY_TO_CLAIM')return '현장 일은 끝났습니다. 캐서린에게 보고해 주세요.';
 if(q?.node==='AWAIT_VICTORY')return '진행 중인 전투를 마쳐 주세요.';
 const cond=this.questConditions(id);if(cond)return cond;
 if(this.s.global.PLAYER_HP_CURRENT<=0)return '먼저 숙박·회복으로 전투불능에서 벗어나 주세요.';
 const st=this.fieldSceneState(id),step=scene.steps[st.step];
 if(!step)return '현장 일은 끝났습니다.';
 if(a.step!==undefined&&a.step!==null&&Number(a.step)!==st.step)return '장면이 이미 넘어갔습니다. 화면에서 지금 단계를 다시 확인해 주세요.';
 if(!Number.isInteger(a.answer)||a.answer<0||a.answer>=step.options.length)return '어떻게 할지 하나를 골라 주세요.';
 if(st.tried?.[st.step]?.includes(a.answer))return '이미 해 본 방법입니다. 다른 방법을 골라 주세요.';
 return '';
};
P.fieldSceneComplete=function(id){
 const row=this.row('22_QUEST_DB',id),d=json(row[10]),q=this.questState(id),g=this.s.global;
 if(d.authorship==='CRPG_LOCAL_LIYUE_V1'&&!q.localLiyueRequirementPaid){const cost=d.conditions?.items_cost||{};if(Object.keys(cost).length)this.pay({items:cost});q.localLiyueRequirementPaid=true;}
 q.state='진행중';q.acceptedTurn=q.acceptedTurn||g.TURN;q.attempts=(q.attempts||0)+1;q.node=d.claim_node||'READY_TO_CLAIM';
};
P.fieldSceneChoose=function(id,answer,stepGuard){
 const reason=this.fieldSceneReason(id,{answer,step:stepGuard});if(reason)fail('FIELD_SCENE',reason);
 const scene=SCENES[id],q=this.questState(id),st=q.scene||(q.scene=fresh()),index=st.step,step=scene.steps[index],o=step.options[answer],g=this.s.global;
 const traveler=g.STORY_ROUTE_ID==='ROUTE_TRAVELER',mistake=!o.ok,minutes=Number(o.min||0);
 if(minutes)this.advanceTime(minutes);
 let hp=0;if(o.hp&&g.PLAYER_HP_CURRENT>1){hp=Math.min(g.PLAYER_HP_CURRENT-1,Math.max(1,Math.round(g.PLAYER_HP_MAX*o.hp/100)));g.PLAYER_HP_CURRENT-=hp;}
 const mora=Number(o.mora||0);
 st.minutes+=minutes;st.hpLost+=hp;st.penalty+=mora;if(mistake)st.mistakes++;
 st.log.push({step:index,option:answer,ok:!mistake,minutes,hp,mora});
 const advanced=!!(o.ok||o.pass||o.battle);
 // A mistake that did not move the scene on (or a reckless fight) cannot be picked again at this step.
 if(mistake&&(!advanced||o.battle))(st.tried[index]||=[]).push(answer);
 let battle=false,done=false;
 if(o.battle){
  const choice=(json(this.row('22_QUEST_DB',id)[10]).choices||[]).find(c=>c.combat_group);
  if(!choice)fail('FIELD_SCENE','이 의뢰에는 연결된 전투가 없습니다.');
  this.questChoice(id,choice.id);battle=true;
 }else if(advanced){st.step++;if(st.step>=scene.steps.length){this.fieldSceneComplete(id);done=true;}}
 if(o.battle)st.step=index; // a lost fight resumes at the same decision; a won fight completes the commission
 const perfect=st.mistakes===0;
 return {quest:id,scene:true,puzzle:true,correct:!mistake,ok:!mistake,pass:!!o.pass,step:index,steps:scene.steps.length,title:step.title,say:o.say,text:o.text,paimon:traveler?o.paimon||null:null,
  advanced,done,battle,minutes,hpLoss:hp,hpPct:hp?o.hp:0,moraPenalty:mora,next:!battle&&!done&&advanced?scene.steps[st.step]?.title||null:null,
  finale:done?scene.finale:null,summary:{minutes:st.minutes,hpLost:st.hpLost,penalty:st.penalty,mistakes:st.mistakes,perfect,bonus:perfect?copy(scene.bonus||{}):null}};
};
P.fieldSceneView=function(id){
 const scene=SCENES[id];if(!scene)return null;
 const st=this.fieldSceneState(id),traveler=this.s.global.STORY_ROUTE_ID==='ROUTE_TRAVELER',step=scene.steps[st.step];
 return {id,index:st.step,total:scene.steps.length,mistakes:st.mistakes,penalty:st.penalty,minutes:st.minutes,hpLost:st.hpLost,bonus:copy(scene.bonus||{}),perfect:st.mistakes===0,
  titles:scene.steps.map(s=>s.title),
  step:step?{title:step.title,text:step.text,paimon:traveler?step.paimon||null:null,options:step.options.map((o,i)=>({index:i,say:o.say,battle:!!o.battle,tried:!!st.tried?.[st.step]?.includes(i)}))}:null,
  log:st.log.map(e=>{const s=scene.steps[e.step],o=s?.options[e.option];return {title:s?.title||'',say:o?.say||'',text:o?.text||'',ok:e.ok,minutes:e.minutes,hp:e.hp,mora:e.mora};})};
};
P.commissionFieldEntries=function(){return old.commissionFieldEntries.call(this).map(q=>{const view=this.fieldSceneView(q.row[0]);return view?{...q,puzzle:null,scene:view}:q;});};
P.commissionPuzzle=function(id,answer){return SCENES[id]?this.fieldSceneChoose(id,answer):old.commissionPuzzle.call(this,id,answer);};
P.actionReason=function(type,a={}){if(type==='COMMISSION_PUZZLE'&&SCENES[a.quest])return this.fieldSceneReason(a.quest,a);return old.actionReason.call(this,type,a);};
P.apply=function(a){if(a.type==='COMMISSION_PUZZLE'&&SCENES[a.quest])return this.fieldSceneChoose(a.quest,a.answer,a.step);return old.apply.call(this,a);};
P.claimQuest=function(id,equipment){
 const scene=SCENES[id],st=this.s.quests[id]?.scene,baseMora=Number(json(this.tables['22_QUEST_DB'].get(id)?.[11]).mora||0);
 const out=old.claimQuest.call(this,id,equipment);
 if(!scene||!st)return out;
 const g=this.s.global,penalty=Math.min(Number(st.penalty||0),baseMora),perfect=st.mistakes===0,bonus=perfect?scene.bonus||{}:{};
 g.MORA=Math.max(0,g.MORA-penalty)+Number(bonus.mora||0);for(const [item,n]of Object.entries(bonus.items||{}))this.giveItem(item,n);
 return {...out,scene:{perfect,mistakes:st.mistakes,penalty,bonus:perfect?copy(bonus):null,minutes:st.minutes,hpLost:st.hpLost}};
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s);
 for(const [id,q]of Object.entries(s.quests||{})){
  const st=q?.scene;if(st===undefined)continue;const scene=SCENES[id];
  const ints=['step','mistakes','penalty','minutes','hpLost'].every(k=>Number.isInteger(st?.[k])&&st[k]>=0);
  if(!scene||!plain(st)||st.v!==1||!ints||st.step>scene.steps.length||!plain(st.tried)||!Array.isArray(st.log)||st.log.length>60||st.log.some(e=>!plain(e)||!Number.isInteger(e.step)||!scene.steps[e.step]||!Number.isInteger(e.option)||!scene.steps[e.step].options[e.option])||Object.entries(st.tried).some(([k,v])=>!scene.steps[k]||!Array.isArray(v)||v.some(i=>!Number.isInteger(i)||!scene.steps[k].options[i])))fail('FIELD_SCENE_SAVE','현장 의뢰 기록을 확인해 주세요.');
 }
 return out;
};
P.fieldScenesVersion=1;api.fieldScenesVersion=1;
api.fieldScenes=Object.fromEntries(Object.entries(SCENES).map(([id,s])=>[id,{steps:s.steps.map(x=>({title:x.title,options:x.options.map(o=>({say:o.say,ok:!!o.ok,pass:!!o.pass,battle:!!o.battle,min:o.min||0,hp:o.hp||0,mora:o.mora||0}))})),bonus:copy(s.bonus||{}),reward:copy(s.reward)}]));
})(globalThis);
